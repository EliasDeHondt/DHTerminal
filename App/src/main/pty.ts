import { WebContents } from 'electron';
import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, extname, isAbsolute, join } from 'node:path';
import type { IPty } from 'node-pty';
import { expandEnv, splitCommandline } from '../shared/profiles';
import { SpawnRequest } from '../shared/types';

// node-pty starts a worker thread and loads conpty.dll from its own folder, and neither can be read
// from inside app.asar. Load it from the unpacked copy next to the archive so every path is a real file.
function loadNodePty(): typeof import('node-pty') {
  const resolved = require.resolve('node-pty');
  const unpacked = resolved.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
  return require(existsSync(unpacked) ? unpacked : resolved);
}
const nodePty = loadNodePty();

interface Session { proc: IPty; wc: WebContents; out: string; timer: NodeJS.Timeout | null; }
const sessions = new Map<number, Session>();
let nextId = 1;

/** Finds `cmd`, `wsl` or `pwsh.exe` on PATH the way the Windows shell does. */
export function resolveProgram(file: string, env: Record<string, string | undefined>): string {
  if (isAbsolute(file) || /[\\/]/.test(file)) return file;
  const exts = extname(file) ? [''] : (env['PATHEXT'] ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);
  const dirs = (env['PATH'] ?? env['Path'] ?? '').split(delimiter).filter(Boolean);
  for (const dir of dirs) for (const ext of exts) {
    const candidate = join(dir, file + ext);
    try { if (statSync(candidate).isFile()) return candidate; } catch { /* keep looking */ }
  }
  return file;
}

/** Turns a profile into what ConPTY runs: the program, its arguments and the folder. Exported for tests. */
export function buildLaunch(req: Pick<SpawnRequest, 'commandline' | 'cwd' | 'wslDistro'>, env: Record<string, string | undefined>) {
  const home = env['USERPROFILE'] || homedir();
  let commandline = expandEnv(req.commandline, env);
  let cwd = req.cwd ? expandEnv(req.cwd, env).trim() : '';
  if (cwd === '~' || cwd.startsWith('~/') || cwd.startsWith('~\\')) {
    // a WSL distro understands ~ itself; Windows shells get the home folder
    if (req.wslDistro && cwd === '~') { commandline += ' --cd ~'; cwd = ''; }
    else cwd = join(home, cwd.slice(2));
  } else if (req.wslDistro && cwd.startsWith('/')) { commandline += ` --cd "${cwd}"`; cwd = ''; }
  if (!cwd || !existsDir(cwd)) cwd = home;
  let { file, args } = splitCommandline(commandline);
  file = resolveProgram(file, env);
  if (isAbsolute(file) && !existsSync(file)) throw new Error(`The program ${file} does not exist. Check the command line of this profile in Settings.`);
  // batch files need cmd.exe around them
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
  // Electron's own variables must not leak into your shells
  for (const k of Object.keys(env)) if (/^(ELECTRON_|CHROME_|GOOGLE_API_KEY)/.test(k)) delete env[k];
  Object.assign(env, { TERM_PROGRAM: 'DHTerminal', COLORTERM: 'truecolor' }, req.env ?? {});
  // WSL only sees Windows variables that are listed in WSLENV
  if (req.wslDistro) env['WSLENV'] = [...(env['WSLENV'] ?? '').split(':').filter(Boolean), 'TERM_PROGRAM', 'COLORTERM'].join(':');
  const { file, args, cwd } = buildLaunch(req, env);
  const options = { name: 'xterm-256color', cols: Math.max(2, req.cols | 0), rows: Math.max(1, req.rows | 0), cwd, env };
  let proc: IPty;
  // the conpty.dll that ships with node-pty is newer than the one in Windows (same as Windows Terminal)
  try { proc = nodePty.spawn(file, args, { ...options, useConpty: true, useConptyDll: true } as any); }
  catch { proc = nodePty.spawn(file, args, { ...options, useConpty: true } as any); }
  const id = nextId++;
  const session: Session = { proc, wc, out: '', timer: null };
  sessions.set(id, session);
  // batch output: one IPC message per few milliseconds instead of one per chunk
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
  try { s.proc.resize(Math.floor(cols), Math.floor(rows)); } catch { /* the process just ended */ }
}

export function kill(id: number) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  if (s.timer) clearTimeout(s.timer);
  try { s.proc.kill(); } catch { /* already gone */ }
}

export function killAllFor(wc: WebContents) { for (const [id, s] of sessions) if (s.wc === wc) kill(id); }
export function killAll() { for (const id of [...sessions.keys()]) kill(id); }
export function processName(id: number): string | null { return sessions.get(id)?.proc.process ?? null; }
export function sessionCount(wc: WebContents) { let n = 0; for (const s of sessions.values()) if (s.wc === wc) n++; return n; }
