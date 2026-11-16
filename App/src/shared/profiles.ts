/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

import { Profile, Settings } from './types';

export function splitCommandline(commandline: string): { file: string; args: string } {
  const s = commandline.trim();
  if (!s) return { file: '', args: '' };
  if (s.startsWith('"')) {
    const end = s.indexOf('"', 1);
    if (end < 0) return { file: s.slice(1), args: '' };
    return { file: s.slice(1, end), args: s.slice(end + 1).trim() };
  }
  const m = /^(\S+)\s*(.*)$/s.exec(s)!;
  return { file: m[1], args: m[2] };
}

export function expandEnv(value: string, env: Record<string, string | undefined>): string {
  const lower: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) lower[k.toLowerCase()] = env[k];
  return value.replace(/%([^%\s]+)%/g, (all, name: string) => lower[name.toLowerCase()] ?? all);
}

export function guessIcon(p: Pick<Profile, 'name' | 'commandline' | 'wslDistro'>): string {
  const distro = p.wslDistro ?? /wsl(?:\.exe)?"?\s+(?:.*\s)?(?:-d|--distribution)\s+"?([^"\s]+)/i.exec(p.commandline)?.[1];
  if (distro) return 'builtin:' + distroIcon(distro);
  const c = (p.commandline + ' ' + p.name).toLowerCase();
  if (/vsdevcmd|devshell|visual studio/.test(c)) return 'builtin:vs';
  if (/pwsh(\.exe)?\b/.test(c)) return 'builtin:pwsh';
  if (/powershell/.test(c)) return 'builtin:powershell';
  if (/git[\\/]+(bin|usr)|git bash/.test(c)) return 'builtin:git';
  if (/msys|mingw|ucrt64|clang64/.test(c)) return 'builtin:msys';
  if (/cygwin/.test(c)) return 'builtin:cygwin';
  if (/psql|postgres|pgadmin/.test(c)) return 'builtin:postgres';
  if (/mysql|mariadb|sqlcmd|mongosh|redis-cli/.test(c)) return 'builtin:database';
  if (/\bssh(\.exe)?\b/.test(c)) return 'builtin:ssh';
  if (/\bpython|\bpy(\.exe)?\b/.test(c)) return 'builtin:python';
  if (/\bnode(\.exe)?\b/.test(c)) return 'builtin:node';
  if (/\bdocker\b/.test(c)) return 'builtin:docker';
  if (/\bwsl(\.exe)?\b|\bbash(\.exe)?\b/.test(c)) return 'builtin:linux';
  if (/\bcmd(\.exe)?\b/.test(c)) return 'builtin:cmd';
  return 'builtin:terminal';
}

export function distroIcon(distro: string): string {
  const d = distro.toLowerCase();
  const known = ['ubuntu', 'debian', 'kali', 'fedora', 'opensuse', 'suse', 'alpine', 'arch', 'oracle', 'alma', 'rocky', 'docker', 'centos', 'manjaro', 'mint', 'nixos', 'gentoo', 'void', 'pengwin', 'rhel', 'redhat'];
  const hit = known.find(k => d.includes(k));
  if (hit === 'suse') return 'opensuse';
  if (hit === 'rhel' || hit === 'redhat') return 'redhat';
  return hit ?? 'linux';
}

export function mergeProfiles(detected: Profile[], settings: Pick<Settings, 'profileOverrides' | 'customProfiles' | 'profileOrder'>): Profile[] {
  const seen = new Set<string>();
  const out: Profile[] = [];
  for (const p of [...detected, ...settings.customProfiles]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const merged: Profile = { ...p, ...(settings.profileOverrides[p.id] ?? {}), id: p.id, source: p.source };
    if (!merged.icon) merged.icon = guessIcon(merged);
    out.push(merged);
  }
  const order = settings.profileOrder;
  if (order.length) {
    const rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length + out.findIndex(p => p.id === id) : i; };
    out.sort((a, b) => rank(a.id) - rank(b.id));
  }
  return out;
}

export function dedupeKey(p: Pick<Profile, 'name' | 'commandline' | 'wslDistro' | 'env'>): string {
  if (p.wslDistro) return 'wsl:' + p.wslDistro.toLowerCase();
  const wsl = /wsl(?:\.exe)?"?\s+(?:-d|--distribution)\s+"?([^"\s]+)/i.exec(p.commandline);
  if (wsl) return 'wsl:' + wsl[1].toLowerCase();
  const msystem = p.env?.['MSYSTEM'] ? ' msystem=' + p.env['MSYSTEM'].toLowerCase() : '';
  return 'cmd:' + p.commandline.toLowerCase().replace(/["\s]+/g, ' ').replace(/\//g, '\\').trim() + msystem;
}