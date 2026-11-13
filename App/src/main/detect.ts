import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { dedupeKey, distroIcon, expandEnv, guessIcon, splitCommandline } from '../shared/profiles';
import { normalizeScheme } from '../shared/schemes';
import { ColorScheme, DetectResult, Profile } from '../shared/types';

const env = process.env as Record<string, string | undefined>;
const SYS = env['SystemRoot'] || 'C:\\Windows';
const PF = env['ProgramFiles'] || 'C:\\Program Files';
const PF86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
const LOCAL = env['LOCALAPPDATA'] || join(homedir(), 'AppData', 'Local');
const q = (p: string) => (/\s/.test(p) ? `"${p}"` : p);

function run(file: string, args: string[], encoding: BufferEncoding = 'utf8'): Promise<string> {
  return new Promise(resolve => {
    execFile(file, args, { windowsHide: true, timeout: 8000, encoding: 'buffer', maxBuffer: 4 << 20 }, (err, stdout) => resolve(err && !stdout?.length ? '' : Buffer.from(stdout).toString(encoding)));
  });
}

export function parseLxss(output: string): string[] {
  const names: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const m = /^\s+DistributionName\s+REG_SZ\s+(.+?)\s*$/.exec(line);
    if (m && !/^docker-desktop(-data)?$/i.test(m[1]) && !names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

export function parseSshConfig(text: string): string[] {
  const hosts: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*Host\s+(.+?)\s*$/i.exec(line);
    if (!m) continue;
    for (const h of m[1].split(/\s+/)) if (h && !/[*?!]/.test(h) && !hosts.includes(h)) hosts.push(h);
  }
  return hosts;
}

export function parseJsonc(text: string): any {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inString) { out += c; if (c === '\\') { out += n ?? ''; i++; } else if (c === '"') inString = false; continue; }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1').replace(/^\uFEFF/, ''));
}

const iconPath = (icon: unknown): string | undefined => {
  if (typeof icon !== 'string' || !icon.trim()) return undefined;
  const value = expandEnv(icon.trim(), env);
  if (/^ms-appx:|^https?:/i.test(value)) return undefined;
  if ([...value].length <= 2 && !/[\\/.]/.test(value)) return value;
  return existsSync(value) ? value : undefined;
};

export function parseWindowsTerminal(json: any): { profiles: Profile[]; schemes: ColorScheme[]; schemeByName: Record<string, string> } {
  const list: any[] = Array.isArray(json?.profiles) ? json.profiles : Array.isArray(json?.profiles?.list) ? json.profiles.list : [];
  const profiles: Profile[] = [];
  const schemeByName: Record<string, string> = {};
  for (const p of list) {
    if (!p || typeof p.name !== 'string') continue;
    const name = p.name.trim();
    if (typeof p.colorScheme === 'string' && p.hidden !== true) schemeByName[name.toLowerCase()] ??= p.colorScheme;
    if (typeof p.commandline !== 'string' || !p.commandline.trim() || p.hidden === true) continue;
    profiles.push({ id: 'wt:' + String(p.guid ?? name).replace(/[{}]/g, '').toLowerCase(), name, commandline: p.commandline.trim(), startingDirectory: typeof p.startingDirectory === 'string' ? p.startingDirectory : undefined, icon: iconPath(p.icon), colorScheme: typeof p.colorScheme === 'string' ? p.colorScheme : undefined, tabColor: typeof p.tabColor === 'string' ? p.tabColor : undefined, source: 'windows-terminal' });
  }
  const schemes = (Array.isArray(json?.schemes) ? json.schemes : []).map(normalizeScheme).filter(Boolean) as ColorScheme[];
  return { profiles, schemes, schemeByName };
}

function windowsShells(): Profile[] {
  const out: Profile[] = [
    { id: 'windows-powershell', name: 'Windows PowerShell', commandline: join(SYS, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), icon: 'builtin:powershell', colorScheme: 'DHTerminal PowerShell', startingDirectory: '~', source: 'builtin' },
    { id: 'cmd', name: 'Command Prompt', commandline: join(SYS, 'System32', 'cmd.exe'), icon: 'builtin:cmd', colorScheme: 'Campbell', startingDirectory: '~', source: 'builtin' },
  ];
  const pwsh: string[] = [];
  for (const root of [join(PF, 'PowerShell'), join(PF86, 'PowerShell')]) {
    try { for (const v of readdirSync(root).sort().reverse()) { const exe = join(root, v, 'pwsh.exe'); if (existsSync(exe)) pwsh.push(exe); } } catch {}
  }
  const store = join(LOCAL, 'Microsoft', 'WindowsApps', 'pwsh.exe');
  if (!pwsh.length && existsSync(store)) pwsh.push(store);
  pwsh.forEach((exe, i) => out.splice(1 + i, 0, { id: i ? `pwsh-${i}` : 'pwsh', name: /preview/i.test(exe) ? 'PowerShell Preview' : 'PowerShell', commandline: q(exe), icon: 'builtin:pwsh', colorScheme: 'DHTerminal PowerShell', startingDirectory: '~', source: 'builtin' }));
  return out;
}

async function wslDistros(): Promise<Profile[]> {
  const wsl = join(SYS, 'System32', 'wsl.exe');
  if (!existsSync(wsl)) return [];
  const names = parseLxss(await run(join(SYS, 'System32', 'reg.exe'), ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Lxss', '/s', '/v', 'DistributionName']));
  return names.map(d => ({ id: 'wsl:' + d.toLowerCase(), name: d, commandline: `${wsl} -d ${q(d)}`, wslDistro: d, startingDirectory: '~', icon: 'builtin:' + distroIcon(d), source: 'wsl' as const }));
}

function gitBash(): Profile[] {
  for (const root of [join(PF, 'Git'), join(PF86, 'Git'), join(LOCAL, 'Programs', 'Git'), join(homedir(), 'scoop', 'apps', 'git', 'current')]) {
    const bash = join(root, 'bin', 'bash.exe');
    if (existsSync(bash)) return [{ id: 'git-bash', name: 'Git Bash', commandline: `${q(bash)} -i -l`, icon: 'builtin:git', startingDirectory: '~', source: 'git' }];
  }
  return [];
}

function unixLayers(): Profile[] {
  const out: Profile[] = [];
  const msys = ['C:\\msys64', join(homedir(), 'scoop', 'apps', 'msys2', 'current')].find(r => existsSync(join(r, 'usr', 'bin', 'bash.exe')));
  if (msys) {
    const bash = q(join(msys, 'usr', 'bin', 'bash.exe'));
    for (const [system, label] of [['UCRT64', 'MSYS2 UCRT64'], ['MINGW64', 'MSYS2 MINGW64'], ['MSYS', 'MSYS2']]) out.push({ id: 'msys2:' + system.toLowerCase(), name: label, commandline: `${bash} --login -i`, env: { MSYSTEM: system, CHERE_INVOKING: '1' }, icon: 'builtin:msys', startingDirectory: '~', source: 'msys', hidden: system !== 'UCRT64' });
  }
  const cyg = ['C:\\cygwin64', 'C:\\cygwin'].find(r => existsSync(join(r, 'bin', 'bash.exe')));
  if (cyg) out.push({ id: 'cygwin', name: 'Cygwin', commandline: `${q(join(cyg, 'bin', 'bash.exe'))} --login -i`, env: { CHERE_INVOKING: '1' }, icon: 'builtin:cygwin', startingDirectory: '~', source: 'msys' });
  return out;
}

async function visualStudio(): Promise<Profile[]> {
  const vswhere = join(PF86, 'Microsoft Visual Studio', 'Installer', 'vswhere.exe');
  if (!existsSync(vswhere)) return [];
  let list: any[] = [];
  try { list = JSON.parse(await run(vswhere, ['-all', '-prerelease', '-format', 'json', '-utf8'])); } catch { return []; }
  const out: Profile[] = [];
  const many = list.length > 1;
  for (const vs of list) {
    const root: string = vs.installationPath, id: string = vs.instanceId;
    const year = vs.catalog?.productLineVersion ?? '';
    const edition = many ? ` (${String(vs.displayName ?? '').replace(/^Visual Studio\s*/i, '').replace(/\s*\d{4}$/, '') || id})` : '';
    const devCmd = join(root, 'Common7', 'Tools', 'VsDevCmd.bat');
    const devShell = join(root, 'Common7', 'Tools', 'Microsoft.VisualStudio.DevShell.dll');
    if (existsSync(devCmd)) out.push({ id: `vs-cmd:${id}`, name: `Developer Command Prompt for VS ${year}${edition}`, commandline: `${join(SYS, 'System32', 'cmd.exe')} /k "${devCmd}"`, icon: 'builtin:vs', startingDirectory: '~', source: 'vs' });
    if (existsSync(devShell)) out.push({ id: `vs-ps:${id}`, name: `Developer PowerShell for VS ${year}${edition}`, commandline: `${join(SYS, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')} -NoExit -Command "&{Import-Module """${devShell}"""; Enter-VsDevShell ${id} -SkipAutomaticLocation -SetDefaultWindowTitle}"`, icon: 'builtin:vs', startingDirectory: '~', source: 'vs' });
  }
  return out;
}

function sshHosts(): Profile[] {
  const ssh = join(SYS, 'System32', 'OpenSSH', 'ssh.exe');
  let text = '';
  try { text = readFileSync(join(homedir(), '.ssh', 'config'), 'utf8'); } catch { return []; }
  return parseSshConfig(text).map(h => ({ id: 'ssh:' + h.toLowerCase(), name: `SSH: ${h}`, commandline: `${existsSync(ssh) ? q(ssh) : 'ssh.exe'} ${h}`, icon: 'builtin:ssh', source: 'ssh' as const }));
}

function fragments(): Profile[] {
  const out: Profile[] = [];
  for (const root of [join(env['ProgramData'] || 'C:\\ProgramData', 'Microsoft', 'Windows Terminal', 'Fragments'), join(LOCAL, 'Microsoft', 'Windows Terminal', 'Fragments')]) {
    let apps: string[] = [];
    try { apps = readdirSync(root); } catch { continue; }
    for (const appName of apps) {
      let files: string[] = [];
      try { files = readdirSync(join(root, appName)).filter(f => f.toLowerCase().endsWith('.json')); } catch { continue; }
      for (const f of files) {
        try {
          const parsed = parseWindowsTerminal(parseJsonc(readFileSync(join(root, appName, f), 'utf8')));
          for (const p of parsed.profiles) out.push({ ...p, id: p.id.replace(/^wt:/, 'fragment:'), source: 'fragment' });
        } catch {}
      }
    }
  }
  return out;
}

function windowsTerminal() {
  for (const file of [
    join(LOCAL, 'Packages', 'Microsoft.WindowsTerminal_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
    join(LOCAL, 'Packages', 'Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
    join(LOCAL, 'Microsoft', 'Windows Terminal', 'settings.json'),
  ]) {
    try { return parseWindowsTerminal(parseJsonc(readFileSync(file, 'utf8'))); } catch {}
  }
  return { profiles: [], schemes: [], schemeByName: {} as Record<string, string> };
}

let cached: Promise<DetectResult> | null = null;

export function detect(force = false, importWt = true): Promise<DetectResult> {
  if (!cached || force) cached = (async () => {
    const [wsl, vs] = await Promise.all([wslDistros(), visualStudio()]);
    const wt = importWt ? windowsTerminal() : { profiles: [], schemes: [], schemeByName: {} as Record<string, string> };
    const all = [...windowsShells(), ...wsl, ...gitBash(), ...unixLayers(), ...vs, ...fragments(), ...wt.profiles, ...sshHosts()];
    const keys = new Set<string>();
    const profiles: Profile[] = [];
    for (const p of all) {
      const key = dedupeKey(p);
      if (keys.has(key) || !splitCommandline(p.commandline).file) continue;
      keys.add(key);
      const found = wt.schemeByName[p.name.toLowerCase()];
      const wtScheme = p.colorScheme === 'DHTerminal PowerShell' && /^campbell powershell$/i.test(found ?? '') ? undefined : found;
      profiles.push({ ...p, colorScheme: wtScheme ?? p.colorScheme, icon: p.icon ?? guessIcon(p) });
    }
    return { profiles, schemes: wt.schemes };
  })();
  return cached;
}
