import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const INVOKE = ['app:info', 'profiles:detect', 'settings:get', 'settings:set', 'settings:open-file', 'icon:load', 'icon:pick', 'folder:pick', 'pty:spawn', 'clipboard:read', 'lock:status', 'lock:setup', 'lock:unlock', 'lock:verify', 'lock:change'];
const SEND = ['pty:write', 'pty:resize', 'pty:kill', 'clipboard:write', 'link:open', 'window:new', 'window:close', 'window:fullscreen', 'window:chrome', 'lock:lock', 'lock:activity'];
const EVENTS = ['pty:data', 'pty:exit', 'settings:changed', 'profiles:changed', 'theme:system', 'window:close-request', 'window:fullscreen', 'lock:changed'];

contextBridge.exposeInMainWorld('dhterminal', {
  invoke: (channel: string, ...args: unknown[]) => INVOKE.includes(channel) ? ipcRenderer.invoke(channel, ...args) : Promise.reject(new Error('blocked channel ' + channel)),
  send: (channel: string, ...args: unknown[]) => { if (SEND.includes(channel)) ipcRenderer.send(channel, ...args); },
  on: (channel: string, listener: (payload: any) => void) => {
    if (!EVENTS.includes(channel)) return () => {};
    const fn = (_e: IpcRendererEvent, payload: unknown) => listener(payload);
    ipcRenderer.on(channel, fn);
    return () => ipcRenderer.removeListener(channel, fn);
  },
});
