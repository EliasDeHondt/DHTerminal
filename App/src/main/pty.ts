import { WebContents } from 'electron';
import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, extname, isAbsolute, join } from 'node:path';
import type { IPty } from 'node-pty';
import { expandEnv, splitCommandline } from '../shared/profiles';
import { SpawnRequest } from '../shared/types';

function loadNodePty(): typeof import('node-pty') {
  const resolved = require.resolve('node-pty');
  const unpacked = resolved.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
  return require(existsSync(unpacked) ? unpacked : resolved);
}
const nodePty = loadNodePty();

interface Session { proc: IPty; wc: WebContents; out: string; timer: NodeJS.Timeout | null; }
const sessions = new Map<number, Session>();
let nextId = 1;

export function resolveProgram(file: string, env: Record<string, string | undefined>): string {
  if (isAbsolute(file) || /[\\/]/.test(file)) return file;
  const exts = extname(file) ? [''] : (env['PATHEXT'] ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);
  const dirs = (env['PATH'] ?? env['Path'] ?? '').split(delimiter).filter(Boolean);
  for (const dir of dirs) for (const ext of exts) {
    const candidate = join(dir, file + ext);
    try { if (statSync(candidate).isFile()) return candidate; } catch {}
  }
  return file;
}

export function buildLaunch(req: Pick<SpawnRequest, 'commandline' | 'cwd' | 'wslDistro'>, env: Record<string, string | undefined>) {
  const home = env['USERPROFILE'] || homedir();
  let commandline = expandEnv(req.commandline, env);
  let cwd = req.cwd ? expandEnv(req.cwd, env).trim() : '';
  if (cwd === '~' || cwd.startsWith('~/') || cwd.startsWith('~\\')) {
    if (req.wslDistro && cwd === '~') { commandline += ' --cd ~'; cwd = ''; }
    else cwd = join(home, cwd.slice(2));
  } else if (req.wslDistro && cwd.startsWith('/')) { commandline += ` --cd "${cwd}"`; cwd = ''; }
  if (!cwd || !existsDir(cwd)) cwd = home;
  let { file, args } = splitCommandline(commandline);
  file = resolveProgram(file, env);
  if (isAbsolute(file) && !existsSync(file)) throw new Error(`The program ${file} does not exist. Check the command line of this profile in Settings.`);
  if (/\.(bat|cmd)$/i.test(file)) {
    args = `/d /c ""${file}"${args ? ' ' + args : ''}"`;
    file = resolveProgram('cmd.exe', env);
  }
  return { file, args, cwd };
}

function existsDir(p: string) { try { return statSync(p).isDirectory(); } catch { return false; } }

export function spawn(wc: WebContents, req: SpawnRequest): { id: number; pid: number } {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  for (const k of Object.keys(env)) if (/^(ELECTRON_|CHROME_|GOOGLE_API_KEY)/.test(k)) delete env[k];
  Object.assign(env, { TERM_PROGRAM: 'DHTerminal', COLORTERM: 'truecolor' }, req.env ?? {});
  if (req.wslDistro) env['WSLENV'] = [...(env['WSLENV'] ?? '').split(':').filter(Boolean), 'TERM_PROGRAM', 'COLORTERM'].join(':');
  const { file, args, cwd } = buildLaunch(req, env);
  const options = { name: 'xterm-256color', cols: Math.max(2, req.cols | 0), rows: Math.max(1, req.rows | 0), cwd, env };
  let proc: IPty;
  try { proc = nodePty.spawn(file, args, { ...options, useConpty: true, useConptyDll: true } as any); }
  catch { proc = nodePty.spawn(file, args, { ...options, useConpty: true } as any); }
  const id = nextId++;
  const session: Session = { proc, wc, out: '', timer: null };
  sessions.set(id, session);
  proc.onData(data => {
    session.out += data;
    if (!session.timer) session.timer = setTimeout(() => flush(id), 4);
  });
  proc.onExit(({ exitCode }) => {
    flush(id);
    sessions.delete(id);
    if (!wc.isDestroyed()) wc.send('pty:exit', { id, code: exitCode });
  });
  return { id, pid: proc.pid };
}

function flush(id: number) {
  const s = sessions.get(id);
  if (!s) return;
  s.timer = null;
  if (!s.out) return;
  const data = s.out;
  s.out = '';
  if (!s.wc.isDestroyed()) s.wc.send('pty:data', { id, data });
}

export function write(id: number, data: string) { sessions.get(id)?.proc.write(data); }

export function resize(id: number, cols: number, rows: number) {
  const s = sessions.get(id);
  if (!s || cols < 2 || rows < 1) return;
  try { s.proc.resize(Math.floor(cols), Math.floor(rows)); } catch {}
}

export function kill(id: number) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  if (s.timer) clearTimeout(s.timer);
  try { s.proc.kill(); } catch {}
}

export function killAllFor(wc: WebContents) { for (const [id, s] of sessions) if (s.wc === wc) kill(id); }
export function killAll() { for (const id of [...sessions.keys()]) kill(id); }
export function processName(id: number): string | null { return sessions.get(id)?.proc.process ?? null; }
export function sessionCount(wc: WebContents) { let n = 0; for (const s of sessions.values()) if (s.wc === wc) n++; return n; }
