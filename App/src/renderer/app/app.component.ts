import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Profile } from '../../shared/types';
import { bridge } from './bridge';
import { enableCustomSelects } from './custom-select';
import { language, TPipe } from './i18n';
import { IconComponent, ProfileIconComponent } from './icon.component';
import { LockScreenComponent } from './lock-screen.component';
import { LockService } from './lock.service';
import { PaneComponent } from './pane.component';
import { SettingsComponent } from './settings.component';
import { Command, StateService, Tab } from './state.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, ProfileIconComponent, PaneComponent, SettingsComponent, LockScreenComponent, TPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  host: { '[class.dark]': 'state.dark()', '[class.light]': '!state.dark()', '[class.mica]': 'state.mica()', '[class.fullscreen]': 'state.fullscreen()', '[style.--active-bg]': 'state.activeBackground()' },
})
export class AppComponent {
  state = inject(StateService);
  lock = inject(LockService);
  paletteInput = viewChild<ElementRef<HTMLInputElement>>('paletteInput');
  renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');
  query = signal('');
  selected = signal(0);
  renaming = signal<number | null>(null);
  dragTab = signal<number | null>(null);
  dropIndex = signal<number | null>(null);
  tabMenu = signal<{ x: number; y: number; tab: Tab } | null>(null);

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.state.overlay() === 'palette' ? this.state.commands() : [];
    if (!q) return all.filter(c => c.group !== 'Split' && c.group !== 'Color scheme');
    const words = q.split(/\s+/);
    return all.filter(c => words.every(w => c.label.toLowerCase().includes(w))).slice(0, 80);
  });
  confirmCount = computed(() => { const o = this.state.overlay(); return o && typeof o === 'object' && 'confirmClose' in o ? o.confirmClose : 0; });
  contextMenu = computed(() => { const o = this.state.overlay(); return o && typeof o === 'object' && 'contextMenu' in o ? o.contextMenu : null; });
  clampX = (x: number) => Math.max(4, Math.min(x, window.innerWidth - 270));
  clampY = (y: number, items: number) => Math.max(4, Math.min(y, window.innerHeight - items * 35 - 24));
  shortcut = (i: number) => i < 9 ? `Ctrl+Shift+${this.state.digitLabels()[i]}` : '';

  constructor() {
    this.state.init();
    this.lock.start();
    enableCustomSelects();
    effect(() => bridge.setChrome(this.state.dark(), this.state.mica()));
    effect(() => { const lang = this.state.settings().language; language.set(lang); document.documentElement.lang = lang; });
    effect(() => { const root = document.documentElement; root.dataset['theme'] = this.state.dark() ? 'dark' : 'light'; root.classList.toggle('mica', this.state.mica()); });
    effect(() => {
      const mode = this.lock.mode();
      if (mode === 'unlocked' && this.state.loaded()) untracked(() => { this.state.openFirstTab(); queueMicrotask(() => this.state.activeSession()?.focus()); });
      if (mode === 'locked') untracked(() => { this.state.menuOpen.set(false); this.tabMenu.set(null); this.renaming.set(null); if (this.state.overlay()) this.state.overlay.set(null); });
    });
    effect(() => {
      if (this.state.overlay() === 'palette') { this.query.set(''); this.selected.set(0); queueMicrotask(() => this.paletteInput()?.nativeElement.focus()); }
    });
    effect(() => { if (this.state.menuOpen()) queueMicrotask(() => document.querySelector<HTMLElement>('.menu--profiles .menu-item')?.focus()); });
    effect(() => { if (this.renaming() !== null) queueMicrotask(() => { const el = this.renameInput()?.nativeElement; el?.focus(); el?.select(); }); });
  }


  tabMouseDown(ev: MouseEvent, tab: Tab) {
    if (ev.button === 1) { ev.preventDefault(); this.state.closeTab(tab.id); }
    else if (ev.button === 0) this.state.activateTab(tab.id);
  }

  tabContext(ev: MouseEvent, tab: Tab) {
    ev.preventDefault();
    this.state.activateTab(tab.id);
    this.tabMenu.set({ x: ev.clientX, y: ev.clientY, tab });
  }

  startRename(tab: Tab) { if (tab.kind === 'terminal') { this.tabMenu.set(null); this.renaming.set(tab.id); } }
  finishRename(tab: Tab, value: string) {
    if (this.renaming() !== tab.id) return;
    tab.customTitle.set(value.trim() || null);
    this.renaming.set(null);
    this.state.activeSession()?.focus();
  }
  renameKey(ev: KeyboardEvent, tab: Tab) {
    if (ev.key === 'Enter') this.finishRename(tab, (ev.target as HTMLInputElement).value);
    else if (ev.key === 'Escape') { this.renaming.set(null); this.state.activeSession()?.focus(); }
  }

  dragStart(ev: DragEvent, tab: Tab) { this.dragTab.set(tab.id); ev.dataTransfer?.setData('text/plain', String(tab.id)); if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'; }
  dragOver(ev: DragEvent, index: number) {
    if (this.dragTab() === null) return;
    ev.preventDefault();
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropIndex.set(ev.clientX < r.left + r.width / 2 ? index : index + 1);
  }
  drop(ev: DragEvent) {
    ev.preventDefault();
    const id = this.dragTab(), to = this.dropIndex();
    if (id !== null && to !== null) {
      const from = this.state.tabs().findIndex(t => t.id === id);
      this.state.moveTab(id, to > from ? to - 1 : to);
    }
    this.dragEnd();
  }
  dragEnd() { this.dragTab.set(null); this.dropIndex.set(null); }


  toggleMenu(ev?: MouseEvent) { ev?.stopPropagation(); this.state.menuOpen.update(v => !v); }

  openProfile(ev: MouseEvent | KeyboardEvent, p: Profile) {
    this.state.menuOpen.set(false);
    if (ev.altKey) this.state.split('auto', p);
    else if (ev.shiftKey) bridge.newWindow(p.id);
    else this.state.newTab(p);
  }

  menuKey(ev: KeyboardEvent) {
    const items = Array.from((ev.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.menu-item'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); this.state.menuOpen.set(false); this.state.activeSession()?.focus(); }
  }


  paletteKey(ev: KeyboardEvent) {
    const list = this.filtered();
    if (ev.key === 'ArrowDown') { ev.preventDefault(); this.selected.set((this.selected() + 1) % Math.max(1, list.length)); this.scrollSelected(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); this.selected.set((this.selected() - 1 + list.length) % Math.max(1, list.length)); this.scrollSelected(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); const c = list[this.selected()]; if (c) this.runCommand(c); }
    else if (ev.key === 'Escape') { ev.preventDefault(); this.state.closeOverlay(); }
  }
  private scrollSelected() { queueMicrotask(() => document.querySelector('.palette-item--sel')?.scrollIntoView({ block: 'nearest' })); }
  runCommand(c: Command) { this.state.closeOverlay(); c.run(); }


  ctx(action: 'copy' | 'paste' | 'splitRight' | 'splitDown' | 'find' | 'close' | 'selectAll') {
    const m = this.contextMenu();
    this.state.closeOverlay();
    if (!m) return;
    const s = m.session;
    switch (action) {
      case 'copy': s.copy(); break;
      case 'paste': s.paste(); break;
      case 'selectAll': s.term.selectAll(); break;
      case 'splitRight': this.state.focusSession(s); this.state.split('row'); break;
      case 'splitDown': this.state.focusSession(s); this.state.split('column'); break;
      case 'find': this.state.focusSession(s); this.state.find(); break;
      case 'close': this.state.closePane(s); break;
    }
  }

  confirmClose() { this.state.overlay.set(null); bridge.closeWindow(); }
  openLink(url: string) { bridge.openLink(url); }

  @HostListener('window:keydown', ['$event'])
  windowKey(ev: KeyboardEvent) {
    if (ev.defaultPrevented || (ev.target as HTMLElement)?.classList?.contains('xterm-helper-textarea')) return;
    if (ev.key === 'Escape' && (this.state.overlay() || this.state.menuOpen() || this.tabMenu())) { this.state.menuOpen.set(false); this.tabMenu.set(null); this.state.closeOverlay(); return; }
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target as HTMLElement)?.tagName ?? '');
    if (editing && !(ev.ctrlKey && ev.shiftKey)) return;
    if (this.state.handleShortcut(ev)) ev.preventDefault();
  }

  @HostListener('window:mousedown', ['$event'])
  outside(ev: MouseEvent) {
    const t = ev.target as HTMLElement;
    if (this.state.menuOpen() && !t.closest('.menu, .new-tab')) this.state.menuOpen.set(false);
    if (this.tabMenu() && !t.closest('.menu')) this.tabMenu.set(null);
  }

  @HostListener('window:focus') windowFocus() {
    if (document.activeElement === document.body && !this.state.overlay() && !this.state.menuOpen()) this.state.activeSession()?.focus();
  }

  @HostListener('window:blur') blur() { this.state.menuOpen.set(false); this.tabMenu.set(null); }
}
