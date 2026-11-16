/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

import { Injectable, Injector, NgZone, afterNextRender, computed, inject, signal } from '@angular/core';
import { mergeProfiles } from '../../shared/profiles';
import { BUILTIN_SCHEMES, isLightColor } from '../../shared/schemes';
import { AppInfo, ColorScheme, DEFAULT_SETTINGS, Profile, Settings } from '../../shared/types';
import { bridge } from './bridge';
import { t } from './i18n';
import { LockService } from './lock.service';
import { Session } from './session';

export type PaneNode = { kind: 'leaf'; id: number; session: Session } | { kind: 'split'; id: number; dir: 'row' | 'column'; ratio: number; a: PaneNode; b: PaneNode };

export interface Tab {
  id: number;
  kind: 'terminal' | 'settings';
  root: ReturnType<typeof signal<PaneNode | null>>;
  activePane: ReturnType<typeof signal<number>>;
  customTitle: ReturnType<typeof signal<string | null>>;
}

export interface Command { id: string; label: string; group: string; icon?: string; profileIcon?: string; run: () => void; }

export type Overlay = null | 'palette' | 'about' | { confirmClose: number } | { contextMenu: { x: number; y: number; session: Session } };

let nextNodeId = 1;

@Injectable({ providedIn: 'root' })
export class StateService {
  private zone = inject(NgZone);
  private injector = inject(Injector);
  private lock = inject(LockService);
  info = signal<AppInfo | null>(null);
  settings = signal<Settings>(DEFAULT_SETTINGS);
  detected = signal<Profile[]>([]);
  wtSchemes = signal<ColorScheme[]>([]);
  systemDark = signal(window.matchMedia('(prefers-color-scheme: dark)').matches);
  tabs = signal<Tab[]>([]);
  activeTabId = signal<number>(0);
  overlay = signal<Overlay>(null);
  menuOpen = signal(false);
  fullscreen = signal(false);
  settingsSection = signal<string>('startup');
  settingsProfile = signal<string | null>(null);
  private icons = signal<Record<string, string | null>>({});
  private sessions = new Map<number, Session>();
  private ready = false;
  loaded = signal(false);
  private firstTabOpened = false;

  profiles = computed(() => mergeProfiles(this.detected(), this.settings()));
  visibleProfiles = computed(() => this.profiles().filter(p => !p.hidden));
  schemes = computed(() => {
    const out: ColorScheme[] = [];
    for (const s of [...BUILTIN_SCHEMES, ...this.wtSchemes(), ...this.settings().customSchemes]) {
      const i = out.findIndex(o => o.name === s.name);
      if (i >= 0) out[i] = s; else out.push(s);
    }
    return out;
  });
  defaultProfile = computed(() => this.profiles().find(p => p.id === this.settings().defaultProfile) ?? this.visibleProfiles()[0] ?? this.profiles()[0]);
  dark = computed(() => { const t = this.settings().theme; return t === 'dark' || (t === 'system' && this.systemDark()); });
  mica = computed(() => this.settings().mica && (this.info()?.osBuild ?? 0) >= 22000);
  activeTab = computed(() => this.tabs().find(t => t.id === this.activeTabId()) ?? null);
  activeSession = computed(() => { const t = this.activeTab(); return t?.kind === 'terminal' ? this.findLeaf(t.root(), t.activePane())?.session ?? null : null; });
  activeBackground = computed(() => { const s = this.activeSession(); return s ? this.scheme(s.profile).background : null; });
  activeIsLight = computed(() => { const bg = this.activeBackground(); return bg ? isLightColor(bg) : !this.dark(); });

  async init() {
    this.listen();
    const [info, settings] = await Promise.all([bridge.info(), bridge.getSettings()]);
    this.info.set(info);
    this.settings.set(settings);
    await this.reloadProfiles(false);
    this.ready = true;
    this.loaded.set(true);
  }

  openFirstTab() {
    if (this.firstTabOpened || !this.loaded()) return;
    this.firstTabOpened = true;
    const info = this.info()!;
    const wanted = info.initialProfile ? this.profiles().find(p => p.id === info.initialProfile || p.name.toLowerCase() === info.initialProfile!.toLowerCase()) : null;
    if (!this.tabs().length) this.newTab(wanted ?? this.defaultProfile(), info.initialCwd ?? undefined);
  }

  private listen() {
    bridge.on('pty:data', ({ id, data }) => { for (const s of this.sessions.values()) if (s.ptyId === id) { s.output(data); break; } });
    bridge.on('pty:exit', ({ id, code }) => this.zone.run(() => { for (const s of this.sessions.values()) if (s.ptyId === id) { this.handleExit(s, code); break; } }));
    bridge.on('settings:changed', (s: Settings) => this.zone.run(() => { this.settings.set(s); this.refreshSessions(); }));
    bridge.on('profiles:changed', () => this.zone.run(() => this.reloadProfiles(false)));
    bridge.on('theme:system', (dark: boolean) => this.zone.run(() => this.systemDark.set(dark)));
    bridge.on('window:fullscreen', (on: boolean) => this.zone.run(() => this.fullscreen.set(on)));
    bridge.on('window:close-request', () => this.zone.run(() => this.requestCloseWindow()));
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => this.systemDark.set(e.matches));
  }

  async reloadProfiles(force: boolean) {
    const r = await bridge.detect(force);
    this.detected.set(r.profiles);
    this.wtSchemes.set(r.schemes);
    for (const p of this.profiles()) if (p.icon && /[\\/]/.test(p.icon)) this.loadIcon(p.icon);
    this.refreshSessions();
  }

  iconUrl(path: string): string | null {
    const known = this.icons()[path];
    if (known === undefined) this.loadIcon(path);
    return known ?? null;
  }
  private loadIcon(path: string) {
    if (path in this.icons()) return;
    this.icons.update(m => ({ ...m, [path]: null }));
    bridge.loadIcon(path).then(url => this.icons.update(m => ({ ...m, [path]: url })));
  }

  scheme(profile: Profile): ColorScheme {
    const all = this.schemes();
    return all.find(s => s.name === profile.colorScheme) ?? all.find(s => s.name === this.settings().colorScheme) ?? all.find(s => s.name === 'DHTerminal')!;
  }

  async saveSettings(patch: Partial<Settings>) {
    const next = { ...this.settings(), ...patch };
    this.settings.set(next);
    this.refreshSessions();
    this.settings.set(await bridge.setSettings(next));
  }

  updateProfile(id: string, patch: Partial<Profile>) {
    const s = this.settings();
    const custom = s.customProfiles.find(p => p.id === id);
    if (custom) this.saveSettings({ customProfiles: s.customProfiles.map(p => p.id === id ? { ...p, ...patch } : p) });
    else this.saveSettings({ profileOverrides: { ...s.profileOverrides, [id]: { ...(s.profileOverrides[id] ?? {}), ...patch } } });
  }

  private refreshSessions() {
    if (!this.ready) return;
    const byId = new Map(this.profiles().map(p => [p.id, p]));
    for (const s of this.sessions.values()) {
      const p = byId.get(s.profile.id);
      if (p) s.profile = p;
      s.refresh();
    }
  }


  private createSession(profile: Profile, cwd?: string): Session {
    const session = new Session(profile, {
      onKey: (ev, s) => this.zone.run(() => this.handleShortcut(ev, s)),
      onExit: s => this.zone.run(() => this.closePane(s)),
      onFocus: s => this.zone.run(() => this.focusSession(s, false)),
      onContextMenu: (s, ev) => this.zone.run(() => this.contextMenu(s, ev)),
      settings: () => this.settings(),
      scheme: s => this.scheme(s.profile),
      osBuild: this.info()?.osBuild ?? 0,
    }, cwd);
    this.sessions.set(session.id, session);
    return session;
  }

  private leaf(session: Session): Extract<PaneNode, { kind: 'leaf' }> { return { kind: 'leaf', id: nextNodeId++, session }; }

  newTab(profile: Profile | undefined = this.defaultProfile(), cwd?: string) {
    if (!profile) return;
    const node = this.leaf(this.createSession(profile, cwd));
    const tab: Tab = { id: nextNodeId++, kind: 'terminal', root: signal<PaneNode | null>(node), activePane: signal(node.id), customTitle: signal<string | null>(null) };
    this.tabs.update(t => [...t, tab]);
    this.activateTab(tab.id);
  }

  openSettings(section?: string) {
    if (section) this.settingsSection.set(section);
    const existing = this.tabs().find(t => t.kind === 'settings');
    if (existing) { this.activateTab(existing.id); return; }
    const tab: Tab = { id: nextNodeId++, kind: 'settings', root: signal<PaneNode | null>(null), activePane: signal(0), customTitle: signal<string | null>(null) };
    this.tabs.update(t => [...t, tab]);
    this.activateTab(tab.id);
  }

  activateTab(id: number) {
    this.activeTabId.set(id);
    this.menuOpen.set(false);
    this.afterRender(() => { const s = this.activeSession(); if (s) { s.fit(); s.focus(); } });
  }

  private afterRender(fn: () => void) { this.zone.run(() => afterNextRender(fn, { injector: this.injector })); }

  focusSession(s: Session, focusTerm = true) {
    for (const tab of this.tabs()) {
      const leaf = this.leaves(tab.root()).find(l => l.session === s);
      if (leaf) { tab.activePane.set(leaf.id); if (this.activeTabId() !== tab.id) this.activeTabId.set(tab.id); break; }
    }
    if (focusTerm) s.focus();
  }

  split(dir: 'row' | 'column' | 'auto', profile?: Profile) {
    const tab = this.activeTab();
    if (!tab || tab.kind !== 'terminal') { this.newTab(profile); return; }
    const current = this.findLeaf(tab.root(), tab.activePane());
    if (!current) return;
    if (dir === 'auto') {
      const el = current.session.element;
      dir = el.clientWidth >= el.clientHeight * 1.6 ? 'row' : 'column';
    }
    const fresh = this.leaf(this.createSession(profile ?? current.session.profile));
    const replaced: PaneNode = { kind: 'split', id: nextNodeId++, dir, ratio: 0.5, a: current, b: fresh };
    tab.root.set(this.replaceNode(tab.root()!, current.id, replaced));
    tab.activePane.set(fresh.id);
    this.afterRender(() => fresh.session.focus());
  }

  duplicateTab() {
    const s = this.activeSession();
    this.newTab(s?.profile ?? this.defaultProfile());
  }

  closePane(s: Session) {
    for (const tab of this.tabs()) {
      const leaf = this.leaves(tab.root()).find(l => l.session === s);
      if (!leaf) continue;
      const rest = this.removeNode(tab.root()!, leaf.id);
      this.disposeSession(s);
      if (!rest) { this.removeTab(tab.id); return; }
      tab.root.set(rest);
      if (tab.activePane() === leaf.id) tab.activePane.set(this.leaves(rest)[0].id);
      if (this.activeTabId() === tab.id) this.afterRender(() => this.activeSession()?.focus());
      return;
    }
  }

  closeTab(id: number) {
    const tab = this.tabs().find(t => t.id === id);
    if (!tab) return;
    for (const l of this.leaves(tab.root())) this.disposeSession(l.session);
    this.removeTab(id);
  }

  closeOtherTabs(id: number) { for (const t of this.tabs()) if (t.id !== id) this.closeTab(t.id); }

  private removeTab(id: number) {
    const list = this.tabs();
    const i = list.findIndex(t => t.id === id);
    const next = list.filter(t => t.id !== id);
    this.tabs.set(next);
    if (!next.length) { bridge.closeWindow(); return; }
    if (this.activeTabId() === id) this.activateTab(next[Math.min(i, next.length - 1)].id);
  }

  private disposeSession(s: Session) { s.dispose(); this.sessions.delete(s.id); }

  moveTab(id: number, toIndex: number) {
    const list = [...this.tabs()];
    const from = list.findIndex(t => t.id === id);
    if (from < 0) return;
    const [tab] = list.splice(from, 1);
    list.splice(Math.max(0, Math.min(list.length, toIndex)), 0, tab);
    this.tabs.set(list);
  }

  cycleTab(delta: number) {
    const list = this.tabs();
    const i = list.findIndex(t => t.id === this.activeTabId());
    if (list.length) this.activateTab(list[(i + delta + list.length) % list.length].id);
  }

  moveFocus(dir: 'left' | 'right' | 'up' | 'down') {
    const tab = this.activeTab();
    const cur = this.activeSession();
    if (!tab || !cur) return;
    const r = cur.element.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best: Session | null = null, bestDist = Infinity;
    for (const l of this.leaves(tab.root())) {
      if (l.session === cur) continue;
      const o = l.session.element.getBoundingClientRect();
      const ox = o.left + o.width / 2, oy = o.top + o.height / 2;
      const ok = dir === 'left' ? o.right <= r.left + 2 : dir === 'right' ? o.left >= r.right - 2 : dir === 'up' ? o.bottom <= r.top + 2 : o.top >= r.bottom - 2;
      const d = Math.hypot(ox - cx, oy - cy);
      if (ok && d < bestDist) { best = l.session; bestDist = d; }
    }
    if (best) this.focusSession(best);
  }

  resizePane(dir: 'left' | 'right' | 'up' | 'down') {
    const tab = this.activeTab();
    if (!tab?.root()) return;
    const want = dir === 'left' || dir === 'right' ? 'row' : 'column';
    const path = this.pathTo(tab.root()!, tab.activePane());
    for (let i = path.length - 2; i >= 0; i--) {
      const n = path[i];
      if (n.kind === 'split' && n.dir === want) {
        const delta = dir === 'left' || dir === 'up' ? -0.05 : 0.05;
        this.setRatio(tab, n.id, n.ratio + delta);
        return;
      }
    }
  }

  setRatio(tab: Tab, splitId: number, ratio: number) {
    const clamp = Math.max(0.1, Math.min(0.9, ratio));
    const update = (n: PaneNode): PaneNode => n.kind === 'leaf' ? n : n.id === splitId ? { ...n, ratio: clamp } : { ...n, a: update(n.a), b: update(n.b) };
    tab.root.set(update(tab.root()!));
  }

  leaves(n: PaneNode | null): Extract<PaneNode, { kind: 'leaf' }>[] {
    if (!n) return [];
    return n.kind === 'leaf' ? [n] : [...this.leaves(n.a), ...this.leaves(n.b)];
  }
  private findLeaf(n: PaneNode | null, id: number) { return this.leaves(n).find(l => l.id === id) ?? this.leaves(n)[0]; }
  private replaceNode(n: PaneNode, id: number, by: PaneNode): PaneNode {
    if (n.id === id) return by;
    return n.kind === 'leaf' ? n : { ...n, a: this.replaceNode(n.a, id, by), b: this.replaceNode(n.b, id, by) };
  }
  private removeNode(n: PaneNode, id: number): PaneNode | null {
    if (n.id === id) return null;
    if (n.kind === 'leaf') return n;
    if (n.a.id === id) return n.b;
    if (n.b.id === id) return n.a;
    return { ...n, a: this.removeNode(n.a, id)!, b: this.removeNode(n.b, id)! };
  }
  private pathTo(n: PaneNode, id: number): PaneNode[] {
    if (n.id === id) return [n];
    if (n.kind === 'leaf') return [];
    const sub = this.pathTo(n.a, id);
    if (sub.length) return [n, ...sub];
    const sub2 = this.pathTo(n.b, id);
    return sub2.length ? [n, ...sub2] : [];
  }

  tabTitle(tab: Tab): string {
    if (tab.kind === 'settings') return t('common.settings');
    const custom = tab.customTitle();
    if (custom) return custom;
    const leaf = this.findLeaf(tab.root(), tab.activePane());
    return leaf?.session.title() || leaf?.session.profile.name || t('common.terminal');
  }
  tabProfile(tab: Tab): Profile | null { return tab.kind === 'terminal' ? this.findLeaf(tab.root(), tab.activePane())?.session.profile ?? null : null; }
  tabPaneCount(tab: Tab) { return this.leaves(tab.root()).length; }

  private handleExit(s: Session, code: number) {
    s.markExited(code);
    const mode = this.settings().closeOnExit;
    if (mode === 'always' || (mode === 'graceful' && (code === 0 || code === -1073741510))) { this.closePane(s); return; }
    s.showExitMessage(code);
  }

  requestCloseWindow() {
    const panes = this.tabs().reduce((n, t) => n + this.tabPaneCount(t), 0);
    if (this.settings().confirmCloseTabs && this.tabs().length > 1) this.overlay.set({ confirmClose: this.tabs().length });
    else if (this.settings().confirmCloseTabs && panes > 1) this.overlay.set({ confirmClose: panes });
    else bridge.closeWindow();
  }

  private contextMenu(s: Session, ev: MouseEvent) {
    this.focusSession(s);
    if (this.settings().rightClickPaste) { if (!s.copy()) s.paste(); return; }
    this.overlay.set({ contextMenu: { x: ev.clientX, y: ev.clientY, session: s } });
  }

  find() { const s = this.activeSession(); if (s) s.searchOpen.set(true); }


  handleShortcut(ev: KeyboardEvent, s?: Session): boolean {
    if (ev.getModifierState?.('AltGraph')) return false;
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    const code = ev.code;
    const c = ev.ctrlKey, sh = ev.shiftKey, a = ev.altKey;
    const digit = /^Digit([1-9])$/.exec(code)?.[1];
    const session = s ?? this.activeSession() ?? undefined;
    const run = (fn: () => void) => { fn(); return true; };

    if (c && sh && !a) {
      if (digit) { const p = this.visibleProfiles()[+digit - 1]; return run(() => p && this.newTab(p)); }
      switch (key) {
        case 't': return run(() => this.newTab());
        case 'w': return run(() => session ? this.closePane(session) : this.activeTab() && this.closeTab(this.activeTabId()));
        case 'n': return run(() => bridge.newWindow());
        case 'd': return run(() => this.duplicateTab());
        case 'f': return run(() => this.find());
        case 'p': return run(() => this.toggleOverlay('palette'));
        case 'l': return run(() => this.lock.lock());
        case 'c': return run(() => session?.copy());
        case 'v': return run(() => session?.paste());
        case ' ': return run(() => this.menuOpen.update(v => !v));
        case 'Tab': return run(() => this.cycleTab(-1));
      }
      if (code === 'Space') return run(() => this.menuOpen.update(v => !v));
      if (code === 'Comma') return run(() => this.openSettings());
    }
    if (c && !sh && !a) {
      if (key === 'Tab') return run(() => this.cycleTab(1));
      if (key === ',' || code === 'Comma') return run(() => this.openSettings());
      if (key === '=' || key === '+' || code === 'NumpadAdd') return run(() => session?.zoomBy(1));
      if (key === '-' || code === 'NumpadSubtract') return run(() => session?.zoomBy(-1));
      if (code === 'Digit0' || code === 'Numpad0') return run(() => session?.zoomBy(0));
      if (key === 'Insert') return run(() => session?.copy());
    }
    if (c && a && !sh && digit) { const t = this.tabs()[+digit - 1]; return run(() => t && this.activateTab(t.id)); }
    if (a && sh && !c) {
      if (key === 'd') return run(() => this.split('auto'));
      if (key === '+' || key === '=' || code === 'Equal' || code === 'NumpadAdd') return run(() => this.split('row'));
      if (key === '-' || key === '_' || code === 'Minus' || code === 'NumpadSubtract') return run(() => this.split('column'));
      const arrow = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' } as const)[ev.key as 'ArrowLeft'];
      if (arrow) return run(() => this.resizePane(arrow));
    }
    if (a && !sh && !c) {
      const arrow = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' } as const)[ev.key as 'ArrowLeft'];
      if (arrow) return run(() => this.moveFocus(arrow));
      if (key === 'Enter') return run(() => bridge.toggleFullscreen());
    }
    if (!c && !a && !sh && key === 'F11') return run(() => bridge.toggleFullscreen());
    if (!c && !a && sh && key === 'Insert') return run(() => session?.paste());
    return false;
  }

  toggleTheme() { this.saveSettings({ theme: this.dark() ? 'light' : 'dark' }); }

  toggleOverlay(kind: 'palette' | 'about') { this.menuOpen.set(false); this.overlay.set(this.overlay() === kind ? null : kind); }

  closeOverlay() {
    this.overlay.set(null);
    this.afterRender(() => this.activeSession()?.focus());
  }


  commands(): Command[] {
    const list: Command[] = [];
    this.visibleProfiles().forEach(p => list.push({ id: 'new:' + p.id, group: 'New tab', label: t('cmd.newTab', { name: p.name }), profileIcon: p.icon, run: () => this.newTab(p) }));
    this.visibleProfiles().forEach(p => list.push({ id: 'split:' + p.id, group: 'Split', label: t('cmd.splitWith', { name: p.name }), profileIcon: p.icon, run: () => this.split('auto', p) }));
    list.push(
      { id: 'split-auto', group: 'Pane', label: t('cmd.splitAuto'), icon: 'splitRight', run: () => this.split('auto') },
      { id: 'split-right', group: 'Pane', label: t('cmd.splitRight'), icon: 'splitRight', run: () => this.split('row') },
      { id: 'split-down', group: 'Pane', label: t('cmd.splitDown'), icon: 'splitDown', run: () => this.split('column') },
      { id: 'close-pane', group: 'Pane', label: t('cmd.closePane'), icon: 'close', run: () => { const s = this.activeSession(); if (s) this.closePane(s); } },
      { id: 'close-tab', group: 'Tab', label: t('cmd.closeTab'), icon: 'close', run: () => this.closeTab(this.activeTabId()) },
      { id: 'close-others', group: 'Tab', label: t('cmd.closeOthers'), icon: 'close', run: () => this.closeOtherTabs(this.activeTabId()) },
      { id: 'dup-tab', group: 'Tab', label: t('cmd.duplicate'), icon: 'copy', run: () => this.duplicateTab() },
      { id: 'next-tab', group: 'Tab', label: t('cmd.nextTab'), run: () => this.cycleTab(1) },
      { id: 'prev-tab', group: 'Tab', label: t('cmd.prevTab'), run: () => this.cycleTab(-1) },
      { id: 'find', group: 'Terminal', label: t('cmd.find'), icon: 'search', run: () => this.find() },
      { id: 'clear', group: 'Terminal', label: t('cmd.clear'), icon: 'trash', run: () => this.activeSession()?.term.clear() },
      { id: 'zoom-in', group: 'Terminal', label: t('cmd.zoomIn'), run: () => this.activeSession()?.zoomBy(1) },
      { id: 'zoom-out', group: 'Terminal', label: t('cmd.zoomOut'), run: () => this.activeSession()?.zoomBy(-1) },
      { id: 'zoom-reset', group: 'Terminal', label: t('cmd.zoomReset'), run: () => this.activeSession()?.zoomBy(0) },
      { id: 'new-window', group: 'Window', label: t('cmd.newWindow'), icon: 'window', run: () => bridge.newWindow() },
      { id: 'fullscreen', group: 'Window', label: t('cmd.fullscreen'), icon: 'window', run: () => bridge.toggleFullscreen() },
      { id: 'settings', group: 'App', label: t('cmd.settings'), icon: 'gear', run: () => this.openSettings() },
      { id: 'settings-json', group: 'App', label: t('cmd.settingsJson'), icon: 'external', run: () => bridge.openSettingsFile() },
      { id: 'redetect', group: 'App', label: t('cmd.redetect'), icon: 'refresh', run: () => this.reloadProfiles(true) },
      { id: 'lock', group: 'App', label: t('cmd.lock'), icon: 'lock', run: () => this.lock.lock() },
      { id: 'change-pin', group: 'App', label: t('cmd.changePin'), icon: 'key', run: () => this.lock.beginChange() },
      { id: 'theme', group: 'App', label: t('cmd.theme'), icon: this.dark() ? 'sun' : 'moon', run: () => this.toggleTheme() },
      { id: 'language', group: 'App', label: t('cmd.language'), icon: 'globe', run: () => this.saveSettings({ language: this.settings().language === 'nl' ? 'en' : 'nl' }) },
      { id: 'about', group: 'App', label: t('cmd.about'), icon: 'help', run: () => this.toggleOverlay('about') },
    );
    for (const sc of this.schemes()) list.push({ id: 'scheme:' + sc.name, group: 'Color scheme', label: t('cmd.scheme', { name: sc.name }), icon: 'swatch', run: () => this.saveSettings({ colorScheme: sc.name }) });
    return list;
  }
}