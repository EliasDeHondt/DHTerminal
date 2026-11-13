import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, watch, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DEFAULT_SETTINGS, Settings } from '../shared/types';

let cache: Settings | null = null;
let lastWritten = '';

export function settingsPath() { return join(app.getPath('userData'), 'settings.json'); }

/** Unknown or broken values fall back to the defaults instead of breaking the window. */
export function sanitize(raw: any): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const def = DEFAULT_SETTINGS[key];
    const val = raw[key];
    if (val === undefined || val === null) continue;
    if (Array.isArray(def) ? Array.isArray(val) : typeof val === typeof def) (s as any)[key] = val;
  }
  s.fontSize = Math.min(48, Math.max(6, Number(s.fontSize) || DEFAULT_SETTINGS.fontSize));
  s.lineHeight = Math.min(2, Math.max(1, Number(s.lineHeight) || DEFAULT_SETTINGS.lineHeight));
  s.scrollback = Math.min(200000, Math.max(0, Math.round(Number(s.scrollback) || 0)));
  if (!['bar', 'block', 'underline'].includes(s.cursorStyle)) s.cursorStyle = DEFAULT_SETTINGS.cursorStyle;
  if (!['system', 'dark', 'light'].includes(s.theme)) s.theme = DEFAULT_SETTINGS.theme;
  if (!['graceful', 'always', 'never'].includes(s.closeOnExit)) s.closeOnExit = DEFAULT_SETTINGS.closeOnExit;
  if (typeof s.profileOverrides !== 'object' || Array.isArray(s.profileOverrides)) s.profileOverrides = {};
  s.customProfiles = s.customProfiles.filter(p => p && typeof p.id === 'string' && typeof p.commandline === 'string').map(p => ({ ...p, source: 'custom' as const }));
  s.profileOrder = s.profileOrder.filter(id => typeof id === 'string');
  return s;
}

export function getSettings(): Settings {
  if (cache) return cache;
  try { cache = sanitize(JSON.parse(readFileSync(settingsPath(), 'utf8'))); }
  catch { cache = sanitize({}); }
  return cache;
}

export function saveSettings(next: Settings): Settings {
  cache = sanitize(next);
  const file = settingsPath();
  mkdirSync(dirname(file), { recursive: true });
  lastWritten = JSON.stringify(cache, null, 2);
  // write next to it first, so a crash never leaves half a file
  writeFileSync(file + '.tmp', lastWritten, 'utf8');
  renameSync(file + '.tmp', file);
  return cache;
}

/** Hand-edits to settings.json are picked up live, like Windows Terminal. */
export function watchSettings(onChange: (s: Settings) => void) {
  const file = settingsPath();
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) saveSettings(getSettings());
  let timer: NodeJS.Timeout | null = null;
  try {
    watch(dirname(file), (_e, name) => {
      if (name !== 'settings.json') return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const text = readFileSync(file, 'utf8');
          if (text === lastWritten) return;
          cache = sanitize(JSON.parse(text));
          lastWritten = text;
          onChange(cache);
        } catch { /* half-saved or invalid JSON: wait for the next save */ }
      }, 150);
    });
  } catch { /* watching is a nice-to-have */ }
}
