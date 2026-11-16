/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

import { Injectable, NgZone, inject, signal } from '@angular/core';
import { UnlockResult } from '../../shared/types';
import { bridge } from './bridge';

export type LockMode = 'checking' | 'setup' | 'locked' | 'change' | 'unlocked';
const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel'];

@Injectable({ providedIn: 'root' })
export class LockService {
  private zone = inject(NgZone);
  readonly mode = signal<LockMode>('checking');
  readonly pinLength = signal<number | null>(null);
  readonly retryUntil = signal(0);
  private started = false;

  async start() {
    if (this.started) return;
    this.started = true;
    bridge.on('lock:changed', (open: boolean) => this.zone.run(() => {
      if (open && (this.mode() === 'locked' || this.mode() === 'setup')) this.mode.set('unlocked');
      else if (!open && this.mode() !== 'setup') this.close();
    }));
    const s = await bridge.lockStatus();
    this.pinLength.set(s.length);
    this.retryUntil.set(s.retryAfter ? Date.now() + s.retryAfter : 0);
    this.mode.set(!s.hasPin ? 'setup' : s.unlocked ? 'unlocked' : 'locked');
    this.watchActivity();
  }

  async unlock(pin: string): Promise<UnlockResult> { return this.result(await bridge.unlock(pin)); }
  async verify(pin: string): Promise<UnlockResult> { return this.result(await bridge.verifyPin(pin)); }
  async setup(pin: string) { await bridge.setupPin(pin); this.pinLength.set(pin.length); this.mode.set('unlocked'); }
  async change(current: string, next: string): Promise<UnlockResult> {
    const r = this.result(await bridge.changePin(current, next));
    if (r.ok) { this.pinLength.set(next.length); this.mode.set('unlocked'); }
    return r;
  }

  lock() { if (this.mode() === 'unlocked' || this.mode() === 'change') { this.close(); bridge.lock(); } }
  beginChange() { if (this.mode() === 'unlocked') this.mode.set('change'); }
  cancelChange() { if (this.mode() === 'change') this.mode.set('unlocked'); }

  private close() { (document.activeElement as HTMLElement | null)?.blur?.(); this.mode.set('locked'); }
  private result(r: UnlockResult) { this.retryUntil.set(r.retryAfter ? Date.now() + r.retryAfter : 0); return r; }

  private watchActivity() {
    this.zone.runOutsideAngular(() => {
      let sent = 0;
      const mark = () => { const now = Date.now(); if (now - sent > 10_000 && this.mode() === 'unlocked') { sent = now; bridge.activity(); } };
      for (const ev of ACTIVITY) window.addEventListener(ev, mark, { capture: true, passive: true });
    });
  }
}