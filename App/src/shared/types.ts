
export type ProfileSource = 'builtin' | 'wsl' | 'git' | 'vs' | 'msys' | 'ssh' | 'fragment' | 'windows-terminal' | 'custom';
export type CursorStyle = 'bar' | 'block' | 'underline';
export type AppTheme = 'system' | 'dark' | 'light';
export type Language = 'nl' | 'en';

export interface Profile {
  id: string;
  name: string;
  commandline: string;
  startingDirectory?: string;
  icon?: string;
  colorScheme?: string;
  hidden?: boolean;
  source: ProfileSource;
  wslDistro?: string;
  env?: Record<string, string>;
  tabColor?: string;
}

export interface ColorScheme {
  name: string;
  background: string; foreground: string; cursorColor: string; selectionBackground: string;
  black: string; red: string; green: string; yellow: string; blue: string; purple: string; cyan: string; white: string;
  brightBlack: string; brightRed: string; brightGreen: string; brightYellow: string; brightBlue: string; brightPurple: string; brightCyan: string; brightWhite: string;
}

export interface Settings {
  defaultProfile: string;
  theme: AppTheme;
  language: Language;
  mica: boolean;
  colorScheme: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  scrollback: number;
  copyOnSelect: boolean;
  rightClickPaste: boolean;
  confirmCloseTabs: boolean;
  closeOnExit: 'graceful' | 'always' | 'never';
  bell: 'flash' | 'none';
  profileOverrides: Record<string, Partial<Profile>>;
  customProfiles: Profile[];
  profileOrder: string[];
  customSchemes: ColorScheme[];
  importWindowsTerminal: boolean;
  autoLockMinutes: number;
}

export interface LockStatus { hasPin: boolean; length: number | null; retryAfter: number; unlocked: boolean; }
export interface UnlockResult { ok: boolean; retryAfter: number; }

export interface DetectResult {
  profiles: Profile[];
  schemes: ColorScheme[];
}

export interface SpawnRequest {
  commandline: string;
  cwd?: string;
  wslDistro?: string;
  env?: Record<string, string>;
  cols: number;
  rows: number;
}

export interface AppInfo {
  version: string;
  platform: string;
  osBuild: number;
  initialCwd: string | null;
  initialProfile: string | null;
  settingsPath: string;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultProfile: '',
  theme: 'system',
  language: 'en',
  mica: false,
  colorScheme: 'DHTerminal',
  fontFamily: "'Cascadia Mono', 'Cascadia Code', Consolas, 'Courier New', monospace",
  fontSize: 14,
  lineHeight: 1.15,
  cursorStyle: 'bar',
  cursorBlink: true,
  scrollback: 10000,
  copyOnSelect: false,
  rightClickPaste: false,
  confirmCloseTabs: true,
  closeOnExit: 'graceful',
  bell: 'flash',
  profileOverrides: {},
  customProfiles: [],
  profileOrder: [],
  customSchemes: [],
  importWindowsTerminal: true,
  autoLockMinutes: 30,
};
