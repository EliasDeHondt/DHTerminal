/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

import { ColorScheme } from './types';

const tango = { black: '#000000', red: '#CC0000', green: '#4E9A06', yellow: '#C4A000', blue: '#3465A4', purple: '#75507B', cyan: '#06989A', white: '#D3D7CF', brightBlack: '#555753', brightRed: '#EF2929', brightGreen: '#8AE234', brightYellow: '#FCE94F', brightBlue: '#729FCF', brightPurple: '#AD7FA8', brightCyan: '#34E2E2', brightWhite: '#EEEEEC' };
const solarized = { black: '#002B36', red: '#DC322F', green: '#859900', yellow: '#B58900', blue: '#268BD2', purple: '#D33682', cyan: '#2AA198', white: '#EEE8D5', brightBlack: '#073642', brightRed: '#CB4B16', brightGreen: '#586E75', brightYellow: '#657B83', brightBlue: '#839496', brightPurple: '#6C71C4', brightCyan: '#93A1A1', brightWhite: '#FDF6E3' };
const campbell = { black: '#0C0C0C', red: '#C50F1F', green: '#13A10E', yellow: '#C19C00', blue: '#0037DA', purple: '#881798', cyan: '#3A96DD', white: '#CCCCCC', brightBlack: '#767676', brightRed: '#E74856', brightGreen: '#16C60C', brightYellow: '#F9F1A5', brightBlue: '#3B78FF', brightPurple: '#B4009E', brightCyan: '#61D6D6', brightWhite: '#F2F2F2' };

export const BUILTIN_SCHEMES: ColorScheme[] = [
  { name: 'DHTerminal', background: '#0D1016', foreground: '#EDEFF2', cursorColor: '#4F94F0', selectionBackground: '#3D587B', black: '#141924', red: '#F87171', green: '#1BAF7A', yellow: '#EDA100', blue: '#4F94F0', purple: '#C084FC', cyan: '#56B6C2', white: '#C9CED6', brightBlack: '#5A6374', brightRed: '#FCA5A5', brightGreen: '#34D399', brightYellow: '#FCD34D', brightBlue: '#86B6FF', brightPurple: '#D8B4FE', brightCyan: '#7DD3FC', brightWhite: '#FFFFFF' },
  { name: 'DHTerminal Light', background: '#F6F7F9', foreground: '#0C0E11', cursorColor: '#0F54AE', selectionBackground: '#BFD6F6', black: '#0C0E11', red: '#C0392B', green: '#118A5E', yellow: '#A16207', blue: '#0F54AE', purple: '#7C3AED', cyan: '#0E7490', white: '#6C757D', brightBlack: '#5A6374', brightRed: '#E74C3C', brightGreen: '#1BAF7A', brightYellow: '#CA8A04', brightBlue: '#4F94F0', brightPurple: '#A855F7', brightCyan: '#0891B2', brightWhite: '#FFFFFF' },
  { name: 'DHTerminal PowerShell', background: '#0F54AE', foreground: '#FFFFFF', cursorColor: '#FFFFFF', selectionBackground: '#86B6FF', black: '#0C0E11', red: '#FF8A8A', green: '#6EF0AE', yellow: '#FFD84D', blue: '#BFD8FF', purple: '#E9B8FF', cyan: '#8BE9F5', white: '#EDEFF2', brightBlack: '#9DBBE6', brightRed: '#FFB0B0', brightGreen: '#A3F7CB', brightYellow: '#FFE88F', brightBlue: '#DCEAFF', brightPurple: '#F3D6FF', brightCyan: '#BDF3FA', brightWhite: '#FFFFFF' },
  { name: 'Campbell', background: '#0C0C0C', foreground: '#CCCCCC', cursorColor: '#FFFFFF', selectionBackground: '#FFFFFF', ...campbell },
  { name: 'Campbell Powershell', background: '#012456', foreground: '#CCCCCC', cursorColor: '#FFFFFF', selectionBackground: '#FFFFFF', ...campbell },
  { name: 'One Half Dark', background: '#282C34', foreground: '#DCDFE4', cursorColor: '#FFFFFF', selectionBackground: '#FFFFFF', black: '#282C34', red: '#E06C75', green: '#98C379', yellow: '#E5C07B', blue: '#61AFEF', purple: '#C678DD', cyan: '#56B6C2', white: '#DCDFE4', brightBlack: '#5A6374', brightRed: '#E06C75', brightGreen: '#98C379', brightYellow: '#E5C07B', brightBlue: '#61AFEF', brightPurple: '#C678DD', brightCyan: '#56B6C2', brightWhite: '#DCDFE4' },
  { name: 'One Half Light', background: '#FAFAFA', foreground: '#383A42', cursorColor: '#4F525D', selectionBackground: '#4F525D', black: '#383A42', red: '#E45649', green: '#50A14F', yellow: '#C18301', blue: '#0184BC', purple: '#A626A4', cyan: '#0997B3', white: '#FAFAFA', brightBlack: '#4F525D', brightRed: '#DF6C75', brightGreen: '#98C379', brightYellow: '#E4C07A', brightBlue: '#61AFEF', brightPurple: '#C577DD', brightCyan: '#56B5C1', brightWhite: '#FFFFFF' },
  { name: 'Solarized Dark', background: '#002B36', foreground: '#839496', cursorColor: '#FFFFFF', selectionBackground: '#FFFFFF', ...solarized },
  { name: 'Solarized Light', background: '#FDF6E3', foreground: '#657B83', cursorColor: '#002B36', selectionBackground: '#073642', ...solarized },
  { name: 'Tango Dark', background: '#000000', foreground: '#D3D7CF', cursorColor: '#FFFFFF', selectionBackground: '#FFFFFF', ...tango },
  { name: 'Tango Light', background: '#FFFFFF', foreground: '#555753', cursorColor: '#000000', selectionBackground: '#555753', ...tango },
  { name: 'Ubuntu', background: '#300A24', foreground: '#FFFFFF', cursorColor: '#FFFFFF', selectionBackground: '#FFFFFF', black: '#171421', red: '#C21A23', green: '#26A269', yellow: '#A2734C', blue: '#0037DA', purple: '#881798', cyan: '#3A96DD', white: '#CCCCCC', brightBlack: '#767676', brightRed: '#C01C28', brightGreen: '#26A269', brightYellow: '#A2734C', brightBlue: '#08458F', brightPurple: '#A347BA', brightCyan: '#2C9FB3', brightWhite: '#F2F2F2' },
  { name: 'Vintage', background: '#000000', foreground: '#C0C0C0', cursorColor: '#FFFFFF', selectionBackground: '#FFFFFF', black: '#000000', red: '#800000', green: '#008000', yellow: '#808000', blue: '#000080', purple: '#800080', cyan: '#008080', white: '#C0C0C0', brightBlack: '#808080', brightRed: '#FF0000', brightGreen: '#00FF00', brightYellow: '#FFFF00', brightBlue: '#0000FF', brightPurple: '#FF00FF', brightCyan: '#00FFFF', brightWhite: '#FFFFFF' },
];

const KEYS: (keyof ColorScheme)[] = ['background', 'foreground', 'black', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightPurple', 'brightCyan', 'brightWhite'];

export function normalizeScheme(raw: any): ColorScheme | null {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  for (const k of KEYS) if (typeof raw[k] !== 'string' || !hex.test(raw[k])) return null;
  const out: any = { name: raw.name.trim() };
  for (const k of KEYS) out[k] = raw[k];
  out.cursorColor = typeof raw.cursorColor === 'string' && hex.test(raw.cursorColor) ? raw.cursorColor : raw.foreground;
  out.selectionBackground = typeof raw.selectionBackground === 'string' && hex.test(raw.selectionBackground) ? raw.selectionBackground : raw.foreground;
  return out as ColorScheme;
}

export function isLightColor(hex: string): boolean {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
}