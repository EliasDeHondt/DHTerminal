import { AppInfo, DetectResult, LockStatus, Settings, SpawnRequest, UnlockResult } from '../../shared/types';

interface Api {
  invoke(channel: string, ...args: unknown[]): Promise<any>;
  send(channel: string, ...args: unknown[]): void;
  on(channel: string, listener: (payload: any) => void): () => void;
}

const api: Api = (window as any).dhterminal;

export const bridge = {
  info: (): Promise<AppInfo> => api.invoke('app:info'),
  detect: (force = false): Promise<DetectResult> => api.invoke('profiles:detect', force),
  getSettings: (): Promise<Settings> => api.invoke('settings:get'),
  setSettings: (s: Settings): Promise<Settings> => api.invoke('settings:set', s),
  openSettingsFile: (): Promise<string> => api.invoke('settings:open-file'),
  loadIcon: (path: string): Promise<string | null> => api.invoke('icon:load', path),
  pickIcon: (): Promise<string | null> => api.invoke('icon:pick'),
  pickFolder: (): Promise<string | null> => api.invoke('folder:pick'),
  spawn: (req: SpawnRequest): Promise<{ ok: true; id: number; pid: number } | { ok: false; error: string }> => api.invoke('pty:spawn', req),
  write: (id: number, data: string) => api.send('pty:write', id, data),
  resize: (id: number, cols: number, rows: number) => api.send('pty:resize', id, cols, rows),
  kill: (id: number) => api.send('pty:kill', id),
  readClipboard: (): Promise<string> => api.invoke('clipboard:read'),
  writeClipboard: (text: string) => api.send('clipboard:write', text),
  openLink: (url: string) => api.send('link:open', url),
  newWindow: (profileId?: string) => api.send('window:new', profileId),
  closeWindow: () => api.send('window:close'),
  toggleFullscreen: () => api.send('window:fullscreen'),
  setChrome: (dark: boolean, mica: boolean) => api.send('window:chrome', dark, mica),
  lockStatus: (): Promise<LockStatus> => api.invoke('lock:status'),
  setupPin: (pin: string): Promise<UnlockResult> => api.invoke('lock:setup', pin),
  unlock: (pin: string): Promise<UnlockResult> => api.invoke('lock:unlock', pin),
  verifyPin: (pin: string): Promise<UnlockResult> => api.invoke('lock:verify', pin),
  changePin: (current: string, next: string): Promise<UnlockResult> => api.invoke('lock:change', current, next),
  lock: () => api.send('lock:lock'),
  activity: () => api.send('lock:activity'),
  on: (channel: string, listener: (payload: any) => void) => api.on(channel, listener),
};
