/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

import { app } from 'electron';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LockStatus, UnlockResult } from '../shared/types';

const VALID = /^\d{4,8}$/;
let unlocked = false;
let failures = 0;
let blockedUntil = 0;
let lastActivity = Date.now();

const file = () => join(app.getPath('userData'), 'lock.json');
const hash = (pin: string, salt: Buffer) => scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 });
function stored(): { salt: Buffer; hash: Buffer; length: number } | null {
  try {
    const raw = JSON.parse(readFileSync(file(), 'utf8'));
    return typeof raw?.salt === 'string' && typeof raw?.hash === 'string' ? { length: Number(raw.length) || 0, salt: Buffer.from(raw.salt, 'hex'), hash: Buffer.from(raw.hash, 'hex') } : null;
  } catch { return null; }
}
function save(pin: string) {
  const salt = randomBytes(16);
  const path = file();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path + '.tmp', JSON.stringify({ length: pin.length, salt: salt.toString('hex'), hash: hash(pin, salt).toString('hex') }), 'utf8');
  renameSync(path + '.tmp', path);
}
function matches(pin: string) { const s = stored(); if (!s || !VALID.test(pin)) return false; const h = hash(pin, s.salt); return h.length === s.hash.length && timingSafeEqual(h, s.hash); }
const retryAfter = () => Math.max(0, blockedUntil - Date.now());

export const isUnlocked = () => unlocked;
export function lockStatus(): LockStatus { const s = stored(); return { hasPin: !!s, length: s?.length ?? null, retryAfter: retryAfter(), unlocked }; }
export function lockApp() { unlocked = false; }
export function markActivity() { lastActivity = Date.now(); }
export const idleFor = () => Date.now() - lastActivity;

export function setupPin(pin: string): UnlockResult {
  if (stored()) throw new Error('A PIN is already set');
  if (!VALID.test(pin)) throw new Error('The PIN must be 4 to 8 digits');
  save(pin); unlocked = true; failures = 0; markActivity();
  return { ok: true, retryAfter: 0 };
}
export function unlock(pin: string): UnlockResult {
  if (retryAfter() > 0) return { ok: false, retryAfter: retryAfter() };
  if (matches(String(pin ?? ''))) { unlocked = true; failures = 0; markActivity(); return { ok: true, retryAfter: 0 }; }
  failures++;
  if (failures >= 5) blockedUntil = Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** (failures - 5));
  return { ok: false, retryAfter: retryAfter() };
}
export function verify(pin: string): UnlockResult {
  if (!unlocked) return { ok: false, retryAfter: retryAfter() };
  return unlock(pin);
}
export function changePin(current: string, next: string): UnlockResult {
  if (!unlocked) return { ok: false, retryAfter: retryAfter() };
  const check = unlock(current);
  if (!check.ok) return check;
  if (!VALID.test(next)) throw new Error('The PIN must be 4 to 8 digits');
  save(next);
  return { ok: true, retryAfter: 0 };
}