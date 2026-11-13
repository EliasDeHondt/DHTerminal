// Everything the main process and the window share. Kept free of Node and DOM imports.

export type ProfileSource = 'builtin' | 'wsl' | 'git' | 'vs' | 'msys' | 'ssh' | 'fragment' | 'windows-terminal' | 'custom';
export type CursorStyle = 'bar' | 'block' | 'underline';
export type AppTheme = 'system' | 'dark' | 'light';

export interface Profile {
  id: string;
  name: string;
  /** Windows style command line, e.g. `"C:\Program Files\Git\bin\bash.exe" -i -l`. */
  commandline: string;
  /** Folder to start in. `~` means your home folder, `%VARS%` are expanded. Empty = home. */
  startingDirectory?: string;
  /** `builtin:<name>`, an emoji, or a path to an .ico/.png/.svg file. */
  icon?: string;
  colorScheme?: string;
  hidden?: boolean;
  source: ProfileSource;
  /** WSL distro name; the folder is passed to wsl.exe instead of the Windows process. */
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
  /** Changes made in the window on top of a detected profile (name, icon, hidden, ...). */
  profileOverrides: Record<string, Partial<Profile>>;
  customProfiles: Profile[];
  profileOrder: string[];
  customSchemes: ColorScheme[];
  /** Pull in the profiles and colour schemes you made in Windows Terminal. */
  importWindowsTerminal: boolean;
}

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
  mica: true,
  colorScheme: 'One Half Dark',
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
};
