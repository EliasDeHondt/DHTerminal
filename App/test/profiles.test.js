/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

const test = require('node:test');
const assert = require('node:assert');
const { splitCommandline, expandEnv, guessIcon, mergeProfiles, dedupeKey, distroIcon } = require('../dist/main/shared/profiles.js');
const { parseLxss, parseSshConfig, parseJsonc, parseWindowsTerminal } = require('../dist/main/main/detect.js');
const { normalizeScheme, isLightColor, BUILTIN_SCHEMES } = require('../dist/main/shared/schemes.js');
const { buildLaunch } = require('../dist/main/main/pty.js');

test('command lines split like Windows does', () => {
  assert.deepStrictEqual(splitCommandline('"C:\\Program Files\\Git\\bin\\bash.exe" -i -l'), { file: 'C:\\Program Files\\Git\\bin\\bash.exe', args: '-i -l' });
  assert.deepStrictEqual(splitCommandline('cmd.exe'), { file: 'cmd.exe', args: '' });
  assert.deepStrictEqual(splitCommandline('  wsl.exe -d Ubuntu  '), { file: 'wsl.exe', args: '-d Ubuntu' });
  assert.deepStrictEqual(splitCommandline(''), { file: '', args: '' });
});

test('%VARIABLES% expand case-insensitively, unknown ones stay', () => {
  assert.strictEqual(expandEnv('%USERPROFILE%\\code', { UserProfile: 'C:\\Users\\me' }), 'C:\\Users\\me\\code');
  assert.strictEqual(expandEnv('%NOPE%\\x', {}), '%NOPE%\\x');
});

test('icons are picked from what a profile runs', () => {
  assert.strictEqual(guessIcon({ name: 'Ubuntu', commandline: 'wsl.exe -d Ubuntu-22.04' }), 'builtin:ubuntu');
  assert.strictEqual(guessIcon({ name: 'x', commandline: 'C:\\WINDOWS\\system32\\wsl.exe -d Debian' }), 'builtin:debian');
  assert.strictEqual(guessIcon({ name: '[PSQL] pgAdmin', commandline: '"C:\\Program Files\\PostgreSQL\\15\\scripts\\runpsql.bat"' }), 'builtin:postgres');
  assert.strictEqual(guessIcon({ name: 'Git Bash', commandline: '"C:/Program Files/Git/bin/bash.exe" -i -l' }), 'builtin:git');
  assert.strictEqual(guessIcon({ name: 'PowerShell', commandline: 'pwsh.exe' }), 'builtin:pwsh');
  assert.strictEqual(guessIcon({ name: 'Something', commandline: 'C:\\Windows\\System32\\cmd.exe /k foo.bat' }), 'builtin:cmd');
  assert.strictEqual(distroIcon('kali-linux'), 'kali');
  assert.strictEqual(distroIcon('openSUSE-Tumbleweed'), 'opensuse');
  assert.strictEqual(distroIcon('MyOwnDistro'), 'linux');
});

test('the same shell listed twice counts once', () => {
  assert.strictEqual(dedupeKey({ name: 'Debian', commandline: 'C:\\WINDOWS\\system32\\wsl.exe -d Debian' }), dedupeKey({ name: 'Debian', commandline: 'x', wslDistro: 'Debian' }));
  assert.strictEqual(dedupeKey({ name: 'a', commandline: '"C:/Program Files/Git/bin/bash.exe" -i -l' }), dedupeKey({ name: 'b', commandline: '"C:\\Program Files\\Git\\bin\\bash.exe" -i -l' }));
  assert.notStrictEqual(dedupeKey({ name: 'a', commandline: 'bash.exe --login -i', env: { MSYSTEM: 'UCRT64' } }), dedupeKey({ name: 'b', commandline: 'bash.exe --login -i', env: { MSYSTEM: 'MSYS' } }));
});

test('your edits, custom profiles and order are applied', () => {
  const detected = [{ id: 'cmd', name: 'Command Prompt', commandline: 'cmd.exe', source: 'builtin' }, { id: 'wsl:ubuntu', name: 'Ubuntu', commandline: 'wsl.exe -d Ubuntu', wslDistro: 'Ubuntu', source: 'wsl' }];
  const merged = mergeProfiles(detected, { profileOverrides: { cmd: { name: 'CMD', hidden: true, source: 'custom' } }, customProfiles: [{ id: 'custom:1', name: 'Mine', commandline: 'python.exe', source: 'custom' }], profileOrder: ['custom:1', 'wsl:ubuntu'] });
  assert.deepStrictEqual(merged.map(p => p.id), ['custom:1', 'wsl:ubuntu', 'cmd']);
  const cmd = merged.find(p => p.id === 'cmd');
  assert.strictEqual(cmd.name, 'CMD');
  assert.strictEqual(cmd.hidden, true);
  assert.strictEqual(cmd.source, 'builtin', 'an override cannot change where a profile came from');
  assert.strictEqual(merged[0].icon, 'builtin:python');
});

test('WSL distros come from the registry, Docker internals left out', () => {
  const out = [
    'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Lxss\\{0b8e1a0d}',
    '    DistributionName    REG_SZ    Ubuntu', '',
    'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Lxss\\{fe3cea7e}',
    '    DistributionName    REG_SZ    Debian', '',
    '    DistributionName    REG_SZ    docker-desktop', '',
    '    DistributionName    REG_SZ    kali-linux', '', 'End of search: 4 match(es) found.',
  ].join('\r\n');
  assert.deepStrictEqual(parseLxss(out), ['Ubuntu', 'Debian', 'kali-linux']);
});

test('SSH hosts without wildcards', () => {
  assert.deepStrictEqual(parseSshConfig('Host *\n  User me\nHost web db.example.com\n  HostName 1.2.3.4\nhost !bad gitlab\n'), ['web', 'db.example.com', 'gitlab']);
});

test('Windows Terminal settings (JSON with comments) are read', () => {
  const text = `{
    // a comment with "quotes"
    "profiles": { "list": [
      { "guid": "{1316B4AF}", "name": "[PSQL] pgAdmin ", "commandline": "\\"C:\\\\pg\\\\runpsql.bat\\"", "colorScheme": "Solarized Dark", "icon": "ms-appx:///x.png" },
      { "name": "Ubuntu", "source": "Windows.Terminal.Wsl", "colorScheme": "One Half Dark" },
      { "name": "Hidden", "commandline": "x.exe", "hidden": true, },
    ] },
    /* block */ "schemes": [ { "name": "Mine", "background": "#000000", "foreground": "#ffffff", "black": "#000000", "red": "#ff0000", "green": "#00ff00", "yellow": "#ffff00", "blue": "#0000ff", "purple": "#ff00ff", "cyan": "#00ffff", "white": "#ffffff", "brightBlack": "#111111", "brightRed": "#ff1111", "brightGreen": "#11ff11", "brightYellow": "#ffff11", "brightBlue": "#1111ff", "brightPurple": "#ff11ff", "brightCyan": "#11ffff", "brightWhite": "#fefefe" }, { "name": "Broken" } ],
  }`;
  const wt = parseWindowsTerminal(parseJsonc(text));
  assert.strictEqual(wt.profiles.length, 1);
  assert.strictEqual(wt.profiles[0].id, 'wt:1316b4af');
  assert.strictEqual(wt.profiles[0].name, '[PSQL] pgAdmin');
  assert.strictEqual(wt.profiles[0].commandline, '"C:\\pg\\runpsql.bat"');
  assert.strictEqual(wt.profiles[0].icon, undefined, 'packaged-app icons cannot be loaded');
  assert.strictEqual(wt.schemeByName['ubuntu'], 'One Half Dark');
  assert.deepStrictEqual(wt.schemes.map(s => s.name), ['Mine']);
  assert.strictEqual(wt.schemes[0].cursorColor, '#ffffff');
});

test('built-in schemes are complete', () => {
  for (const s of BUILTIN_SCHEMES) assert.ok(normalizeScheme(s), s.name);
  assert.strictEqual(isLightColor('#FAFAFA'), true);
  assert.strictEqual(isLightColor('#282C34'), false);
});

test('launching: ~, WSL folders and batch files', () => {
  const env = { USERPROFILE: 'C:\\Users\\me', PATH: 'C:\\Windows\\System32', PATHEXT: '.EXE;.BAT', SystemRoot: 'C:\\Windows' };
  const wsl = buildLaunch({ commandline: 'C:\\Windows\\System32\\wsl.exe -d Ubuntu', cwd: '~', wslDistro: 'Ubuntu' }, env);
  assert.strictEqual(wsl.args, '-d Ubuntu --cd ~');
  const wslPath = buildLaunch({ commandline: 'C:\\Windows\\System32\\wsl.exe -d Ubuntu', cwd: '/var/log', wslDistro: 'Ubuntu' }, env);
  assert.strictEqual(wslPath.args, '-d Ubuntu --cd "/var/log"');
  const bat = buildLaunch({ commandline: '"C:\\Windows\\System32\\cmd.exe" /k echo hi', cwd: '' }, env);
  assert.strictEqual(bat.file, 'C:\\Windows\\System32\\cmd.exe');
  assert.strictEqual(bat.args, '/k echo hi');
  assert.throws(() => buildLaunch({ commandline: '"C:\\nope\\missing.bat"' }, env), /does not exist/);
});