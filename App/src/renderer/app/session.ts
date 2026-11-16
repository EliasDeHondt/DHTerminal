/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

import { signal } from '@angular/core';
import { ITheme, Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { ColorScheme, Profile, Settings } from '../../shared/types';
import { bridge } from './bridge';
import { t } from './i18n';

let nextId = 1;
let webglCount = 0;

export function schemeToTheme(s: ColorScheme): ITheme {
  const sel = /^#[0-9a-f]{6}$/i.test(s.selectionBackground) ? s.selectionBackground + '55' : s.selectionBackground;
  return {
    background: s.background, foreground: s.foreground, cursor: s.cursorColor, cursorAccent: s.background, selectionBackground: sel,
    black: s.black, red: s.red, green: s.green, yellow: s.yellow, blue: s.blue, magenta: s.purple, cyan: s.cyan, white: s.white,
    brightBlack: s.brightBlack, brightRed: s.brightRed, brightGreen: s.brightGreen, brightYellow: s.brightYellow, brightBlue: s.brightBlue, brightMagenta: s.brightPurple, brightCyan: s.brightCyan, brightWhite: s.brightWhite,
  };
}

export interface SessionHooks {
  onKey(ev: KeyboardEvent, session: Session): boolean;
  onExit(session: Session, code: number): void;
  onFocus(session: Session): void;
  onContextMenu(session: Session, ev: MouseEvent): void;
  settings(): Settings;
  scheme(session: Session): ColorScheme;
  osBuild: number;
}

export class Session {
  readonly id = nextId++;
  readonly title = signal('');
  readonly exited = signal<number | null>(null);
  readonly bell = signal(0);
  readonly searchOpen = signal(false);
  readonly error = signal<string | null>(null);
  readonly element = document.createElement('div');
  term!: Terminal;
  private fitAddon = new FitAddon();
  search = new SearchAddon();
  private webgl: WebglAddon | null = null;
  ptyId: number | null = null;
  private opened = false;
  private zoom = 0;
  private disposed = false;
  private pending: string[] = [];
  private wantFocus = false;

  constructor(public profile: Profile, private hooks: SessionHooks, public cwd?: string) {
    this.element.className = 'term-host';
    this.title.set(profile.name);
  }

  private options() {
    const s = this.hooks.settings();
    return {
      fontFamily: s.fontFamily, fontSize: s.fontSize + this.zoom, lineHeight: s.lineHeight,
      cursorStyle: s.cursorStyle, cursorBlink: s.cursorBlink, cursorInactiveStyle: 'outline' as const,
      scrollback: s.scrollback, theme: schemeToTheme(this.hooks.scheme(this)),
    };
  }

  attach(host: HTMLElement) {
    if (this.element.parentElement !== host) {
      const hadFocus = this.element.contains(document.activeElement);
      host.appendChild(this.element);
      if (hadFocus) this.wantFocus = true;
    }
    if (this.opened) { this.fit(); if (this.wantFocus) this.focus(); return; }
    this.opened = true;
    this.term = new Terminal({ ...this.options(), allowProposedApi: true, allowTransparency: false, drawBoldTextInBrightColors: true, minimumContrastRatio: 1, rightClickSelectsWord: false, macOptionIsMeta: false, windowsPty: { backend: 'conpty', buildNumber: this.hooks.osBuild } });
    this.term.loadAddon(this.fitAddon);
    this.term.loadAddon(this.search);
    this.term.loadAddon(new Unicode11Addon());
    this.term.unicode.activeVersion = '11';
    this.term.loadAddon(new WebLinksAddon((ev, uri) => { if (ev.ctrlKey || ev.metaKey) bridge.openLink(uri); }));
    this.term.open(this.element);
    this.loadWebgl();
    this.term.attachCustomKeyEventHandler(ev => this.handleKey(ev));
    this.term.onData(data => {
      if (this.exited() !== null) { this.afterExitInput(data); return; }
      if (this.ptyId !== null) bridge.write(this.ptyId, data);
    });
    this.term.onBinary(data => { if (this.ptyId !== null) bridge.write(this.ptyId, data); });
    this.term.onResize(({ cols, rows }) => { if (this.ptyId !== null) bridge.resize(this.ptyId, cols, rows); });
    this.term.onTitleChange(t => this.title.set(t.trim() || this.profile.name));
    this.term.onBell(() => this.bell.update(n => n + 1));
    this.term.onSelectionChange(() => { if (this.hooks.settings().copyOnSelect && this.term.hasSelection()) bridge.writeClipboard(this.term.getSelection()); });
    this.term.textarea?.addEventListener('focus', () => this.hooks.onFocus(this));
    this.element.addEventListener('mousedown', () => this.hooks.onFocus(this));
    this.element.addEventListener('contextmenu', ev => { ev.preventDefault(); this.hooks.onContextMenu(this, ev); });
    this.element.addEventListener('wheel', ev => { if (ev.ctrlKey) { ev.preventDefault(); this.setZoom(this.zoom + (ev.deltaY < 0 ? 1 : -1)); } }, { passive: false, capture: true });
    this.fit();
    if (this.wantFocus) this.focus();
    this.start();
  }

  private loadWebgl() {
    if (webglCount >= 12) return;
    try {
      const gl = new WebglAddon();
      gl.onContextLoss(() => { gl.dispose(); if (this.webgl === gl) { this.webgl = null; webglCount--; } });
      this.term.loadAddon(gl);
      this.webgl = gl;
      webglCount++;
    } catch {}
  }

  async start() {
    this.exited.set(null);
    this.error.set(null);
    const res = await bridge.spawn({ commandline: this.profile.commandline, cwd: this.cwd ?? this.profile.startingDirectory, wslDistro: this.profile.wslDistro, env: this.profile.env, cols: this.term.cols, rows: this.term.rows });
    if (this.disposed) { if (res.ok) bridge.kill(res.id); return; }
    if (!res.ok) {
      this.error.set(res.error);
      this.term.write(`\x1b[0m[error] ${t('term.startFailed', { name: this.profile.name })}\r\n${res.error.replace(/^Error invoking remote method[^:]*: /, '').replace(/^Error: /, '')}\r\n`);
      this.markExited(-1);
      this.showExitMessage(-1);
      return;
    }
    this.ptyId = res.id;
    for (const chunk of this.pending) this.term.write(chunk);
    this.pending = [];
  }

  output(data: string) { this.term ? this.term.write(data) : this.pending.push(data); }

  markExited(code: number) {
    this.ptyId = null;
    this.exited.set(code);
  }

  showExitMessage(code: number) {
    const hex = code < 0 ? (code >>> 0).toString(16).toUpperCase() : code.toString(16).toUpperCase();
    this.term.write(`\r\n\x1b[0m[${t('term.exited', { code })} (0x${hex.padStart(8, '0')})]\r\n${t('term.exitHint')}\r\n`);
  }

  private afterExitInput(data: string) {
    if (data === '\r') { this.term.write('\r\n'); this.start(); }
    else if (data === '\x04') this.hooks.onExit(this, Number.NaN);
  }

  private handleKey(ev: KeyboardEvent): boolean {
    if (ev.type !== 'keydown') return true;
    if (this.hooks.onKey(ev, this)) { ev.preventDefault(); ev.stopPropagation(); return false; }
    const ctrl = ev.ctrlKey && !ev.altKey && !ev.metaKey;
    if (ctrl && !ev.shiftKey && ev.key.toLowerCase() === 'c' && this.term.hasSelection()) { this.copy(); ev.preventDefault(); return false; }
    if (ctrl && !ev.shiftKey && ev.key.toLowerCase() === 'v') { this.paste(); ev.preventDefault(); return false; }
    return true;
  }

  copy() {
    if (!this.term?.hasSelection()) return false;
    bridge.writeClipboard(this.term.getSelection());
    this.term.clearSelection();
    return true;
  }

  async paste() {
    const text = await bridge.readClipboard();
    if (text) this.term.paste(text.replace(/\r?\n/g, '\r'));
  }

  fit() {
    if (!this.term || !this.element.isConnected || !this.element.clientWidth || !this.element.clientHeight) return;
    try { this.fitAddon.fit(); } catch {}
  }

  focus() {
    if (!this.term || !this.element.isConnected) { this.wantFocus = true; return; }
    this.wantFocus = false;
    this.term.focus();
  }

  setZoom(z: number) {
    this.zoom = Math.max(-this.hooks.settings().fontSize + 6, Math.min(36, z));
    if (this.term) { this.term.options.fontSize = this.hooks.settings().fontSize + this.zoom; this.fit(); }
  }
  zoomBy(d: number) { this.setZoom(d === 0 ? 0 : this.zoom + d); }

  refresh() {
    if (!this.term) return;
    const o = this.options();
    for (const [k, v] of Object.entries(o)) (this.term.options as any)[k] = v;
    this.fit();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.ptyId !== null) bridge.kill(this.ptyId);
    this.ptyId = null;
    if (this.webgl) { webglCount--; this.webgl = null; }
    this.term?.dispose();
    this.element.remove();
  }
}