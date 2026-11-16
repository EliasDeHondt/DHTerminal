/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeTheme, net, protocol, shell } from 'electron';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { release } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { detect } from './detect';
import * as pty from './pty';
import { changePin, idleFor, isUnlocked, lockApp, lockStatus, markActivity, setupPin, unlock, verify } from './lock';
import { getSettings, saveSettings, settingsPath, watchSettings } from './settings';
import { AppInfo, Settings, SpawnRequest } from '../shared/types';

protocol.registerSchemesAsPrivileged([{ scheme: 'dhterminal', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
if (process.env['DHTERMINAL_USER_DATA']) app.setPath('userData', process.env['DHTERMINAL_USER_DATA']);
app.setAppUserModelId('com.eliasdehondt.dhterminal');

const RENDERER = join(__dirname, '..', '..', 'renderer', 'browser');
const ICON = join(__dirname, '..', '..', '..', 'build', 'icon.png');
const launch = new Map<number, { cwd: string | null; profile: string | null }>();
const allowClose = new Set<number>();

function parseArgs(argv: string[], workingDirectory: string) {
  let cwd: string | null = null, profile: string | null = null;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--cwd' || a === '-d' || a === '--startingDirectory') && argv[i + 1]) cwd = argv[++i];
    else if (a.startsWith('--cwd=')) cwd = a.slice(6);
    else if ((a === '--profile' || a === '-p') && argv[i + 1]) profile = argv[++i];
  }
  if (cwd) { cwd = resolve(workingDirectory, cwd.replace(/"+$/, '')); try { if (!statSync(cwd).isDirectory()) cwd = null; } catch { cwd = null; } }
  return { cwd, profile };
}

const isDark = (s: Settings) => s.theme === 'dark' || (s.theme === 'system' && nativeTheme.shouldUseDarkColors);
const chrome = (dark: boolean, mica: boolean) => ({ color: mica ? '#00000000' : dark ? '#060709' : '#eef1f5', symbolColor: dark ? '#edeff2' : '#0c0e11', height: 40 });

function createWindow(args: { cwd: string | null; profile: string | null }) {
  const s = getSettings();
  const dark = isDark(s);
  const mica = s.mica && process.platform === 'win32' && Number(release().split('.')[2]) >= 22000;
  const win = new BrowserWindow({
    width: 1100, height: 680, minWidth: 460, minHeight: 280, show: false,
    backgroundColor: mica ? '#00000000' : dark ? '#060709' : '#eef1f5',
    ...(mica ? { backgroundMaterial: 'mica' as const } : {}),
    titleBarStyle: 'hidden', titleBarOverlay: chrome(dark, mica), icon: ICON,
    webPreferences: { preload: join(__dirname, '..', 'preload', 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  const wc = win.webContents;
  const wcId = wc.id;
  launch.set(wcId, args);
  win.setMenuBarVisibility(false);
  win.loadURL('dhterminal://app/index.html');
  win.once('ready-to-show', () => win.show());
  win.on('enter-full-screen', () => wc.send('window:fullscreen', true));
  win.on('leave-full-screen', () => wc.send('window:fullscreen', false));
  win.on('close', e => {
    if (allowClose.has(wcId) || wc.isCrashed() || pty.sessionCount(wc) <= 1) return;
    e.preventDefault();
    wc.send('window:close-request');
  });
  win.on('closed', () => { pty.killAllFor(wc); launch.delete(wcId); allowClose.delete(wcId); });
  wc.on('render-process-gone', () => pty.killAllFor(wc));
  wc.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  wc.on('will-navigate', (e, url) => { if (!url.startsWith('dhterminal://')) e.preventDefault(); });
  return win;
}

function serveRenderer() {
  protocol.handle('dhterminal', request => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (!pathname || pathname === '/') pathname = '/index.html';
    let file = normalize(join(RENDERER, pathname));
    if (!file.startsWith(RENDERER) || !existsSync(file)) file = join(RENDERER, 'index.html');
    return net.fetch(pathToFileURL(file).toString());
  });
}

const broadcast = (channel: string, payload?: unknown) => { for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload); };
const winOf = (e: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) => BrowserWindow.fromWebContents(e.sender);
const ICON_TYPES: Record<string, string> = { '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp' };

function registerIpc() {
  ipcMain.handle('app:info', e => {
    const args = launch.get(e.sender.id) ?? { cwd: null, profile: null };
    const info: AppInfo = { version: app.getVersion(), platform: process.platform, osBuild: Number(release().split('.')[2]) || 0, initialCwd: args.cwd, initialProfile: args.profile, settingsPath: settingsPath() };
    return info;
  });
  ipcMain.handle('profiles:detect', (_e, force?: boolean) => detect(!!force, getSettings().importWindowsTerminal));
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:set', (_e, next: Settings) => {
    const before = getSettings();
    const saved = saveSettings(next);
    broadcast('settings:changed', saved);
    if (before.theme !== saved.theme) applyTheme(saved);
    if (before.importWindowsTerminal !== saved.importWindowsTerminal) detect(true, saved.importWindowsTerminal).then(() => broadcast('profiles:changed'));
    return saved;
  });
  ipcMain.handle('settings:open-file', () => shell.openPath(settingsPath()));
  ipcMain.handle('icon:load', (_e, path: string) => {
    try {
      const type = ICON_TYPES[extname(path).toLowerCase()];
      if (!type || statSync(path).size > 2 << 20) return null;
      return `data:${type};base64,${readFileSync(path).toString('base64')}`;
    } catch { return null; }
  });
  ipcMain.handle('icon:pick', async e => {
    const w = winOf(e);
    const r = await (w ? dialog.showOpenDialog(w, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'ico', 'svg', 'jpg', 'jpeg', 'gif', 'webp'] }] }) : dialog.showOpenDialog({ properties: ['openFile'] }));
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('folder:pick', async e => {
    const w = winOf(e);
    const r = await (w ? dialog.showOpenDialog(w, { properties: ['openDirectory'] }) : dialog.showOpenDialog({ properties: ['openDirectory'] }));
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('pty:spawn', (e, req: SpawnRequest) => {
    if (!isUnlocked()) return { ok: false, error: 'DHTerminal is locked' };
    try { return { ok: true, ...pty.spawn(e.sender, req) }; }
    catch (err: any) { return { ok: false, error: String(err?.message ?? err) }; }
  });
  ipcMain.on('pty:write', (_e, id: number, data: string) => { if (isUnlocked()) pty.write(id, data); });
  ipcMain.on('pty:resize', (_e, id: number, cols: number, rows: number) => pty.resize(id, cols, rows));
  ipcMain.on('pty:kill', (_e, id: number) => pty.kill(id));
  ipcMain.handle('clipboard:read', () => isUnlocked() ? clipboard.readText() : '');
  ipcMain.on('clipboard:write', (_e, text: string) => clipboard.writeText(String(text)));
  ipcMain.on('link:open', (_e, url: string) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); });
  ipcMain.on('window:new', (_e, profile?: string) => createWindow({ cwd: null, profile: typeof profile === 'string' ? profile : null }));
  ipcMain.on('window:close', e => { allowClose.add(e.sender.id); winOf(e)?.close(); });
  ipcMain.on('window:fullscreen', e => { const w = winOf(e); if (w) w.setFullScreen(!w.isFullScreen()); });
  const lockChanged = () => broadcast('lock:changed', isUnlocked());
  const opening = (r: { ok: boolean }) => { if (r.ok) lockChanged(); return r; };
  ipcMain.handle('lock:status', () => lockStatus());
  ipcMain.handle('lock:setup', (_e, pin: string) => opening(setupPin(String(pin ?? ''))));
  ipcMain.handle('lock:unlock', (_e, pin: string) => opening(unlock(String(pin ?? ''))));
  ipcMain.handle('lock:verify', (_e, pin: string) => verify(String(pin ?? '')));
  ipcMain.handle('lock:change', (_e, current: string, next: string) => changePin(String(current ?? ''), String(next ?? '')));
  ipcMain.on('lock:lock', () => { if (isUnlocked()) { lockApp(); lockChanged(); } });
  ipcMain.on('lock:activity', () => markActivity());
  setInterval(() => {
    if (isUnlocked() && idleFor() >= getSettings().autoLockMinutes * 60_000) { lockApp(); lockChanged(); }
  }, 15_000).unref();
  ipcMain.on('window:chrome', (e, dark: boolean, mica: boolean) => { try { winOf(e)?.setTitleBarOverlay(chrome(dark, mica)); } catch {} });
}

function applyTheme(s: Settings) { nativeTheme.themeSource = s.theme; }

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_e, argv, workingDirectory) => createWindow(parseArgs(argv, workingDirectory)));
  app.whenReady().then(() => {
    serveRenderer();
    registerIpc();
    applyTheme(getSettings());
    watchSettings(s => { applyTheme(s); broadcast('settings:changed', s); });
    nativeTheme.on('updated', () => broadcast('theme:system', nativeTheme.shouldUseDarkColors));
    detect(false, getSettings().importWindowsTerminal).catch(() => {});
    createWindow(parseArgs(process.argv, process.cwd()));
  });
  app.on('window-all-closed', () => { pty.killAll(); app.quit(); });
}