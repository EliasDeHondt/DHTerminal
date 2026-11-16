/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/


const badge = (fill: string, letter: string, round = false) =>
  `${round ? `<circle cx="12" cy="12" r="10.5" fill="${fill}"/>` : `<rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="${fill}"/>`}<text x="12" y="16.6" text-anchor="middle" font-size="${letter.length > 1 ? 10 : 13}" font-weight="700" fill="#fff" font-family="Segoe UI Variable Display, Segoe UI, sans-serif">${letter}</text>`;

const prompt = (stroke: string) => `<path d="M6.6 8.2l4.4 3.6-5.2 3.9" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.6 16h4.6" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round"/>`;

const tux = `<ellipse cx="12" cy="14.2" rx="6.2" ry="7.6" fill="#1c1c1e"/><circle cx="12" cy="6.6" r="4.3" fill="#1c1c1e"/><ellipse cx="12" cy="15.2" rx="4" ry="5.6" fill="#f4f4f4"/><circle cx="10.5" cy="6" r="1.15" fill="#fff"/><circle cx="13.5" cy="6" r="1.15" fill="#fff"/><circle cx="10.7" cy="6.2" r=".55" fill="#111"/><circle cx="13.3" cy="6.2" r=".55" fill="#111"/><path d="M10.3 8.1l1.7 1.5 1.7-1.5z" fill="#f2b10e"/><ellipse cx="8.6" cy="21.4" rx="2.8" ry="1.3" fill="#f2b10e"/><ellipse cx="15.4" cy="21.4" rx="2.8" ry="1.3" fill="#f2b10e"/>`;

export const SHELL_ICONS: Record<string, string> = {
  terminal: `<rect x="1.5" y="3" width="21" height="18" rx="4" fill="#3a4150"/>${prompt('#ffffff')}`,
  powershell: `<path d="M5.1 4h16.2c.75 0 1.3.7 1.12 1.42l-3.1 12.4A1.6 1.6 0 0 1 17.8 19H1.6c-.75 0-1.3-.7-1.12-1.42l3.1-12.4A1.6 1.6 0 0 1 5.1 4z" fill="#2671be"/>${prompt('#ffffff')}`,
  pwsh: `<path d="M5.1 4h16.2c.75 0 1.3.7 1.12 1.42l-3.1 12.4A1.6 1.6 0 0 1 17.8 19H1.6c-.75 0-1.3-.7-1.12-1.42l3.1-12.4A1.6 1.6 0 0 1 5.1 4z" fill="#22303f"/>${prompt('#7cc4ff')}`,
  cmd: `<rect x="1.5" y="3" width="21" height="18" rx="3" fill="#0c0c0c" stroke="#8a8a8a" stroke-width="1"/><rect x="2" y="3.5" width="20" height="3.2" rx="2.6" fill="#c8c8c8"/><path d="M6 10.5l3.4 2.6L6 15.7" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 16h5" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>`,
  linux: tux,
  ubuntu: `<circle cx="12" cy="12" r="11" fill="#e95420"/><circle cx="12" cy="12" r="5.4" fill="none" stroke="#fff" stroke-width="1.9"/><g fill="#fff" stroke="#e95420" stroke-width="1.3"><circle cx="18.9" cy="12" r="2.3"/><circle cx="8.55" cy="18" r="2.3"/><circle cx="8.55" cy="6" r="2.3"/></g>`,
  debian: `<path d="M14.6 3.8C9.9 2.4 4.9 5.6 4.3 10.6c-.5 4.3 2.6 8.3 7 8.6 3.6.2 6.5-2.6 6.4-6-.1-2.8-2.4-4.9-5.1-4.6-2.1.2-3.6 2.2-3.2 4.3.3 1.5 1.8 2.5 3.3 2.1" fill="none" stroke="#d70a53" stroke-width="2.3" stroke-linecap="round"/>`,
  kali: badge('#2f6fe4', 'K'),
  fedora: `<circle cx="12" cy="12" r="10.5" fill="#51a2da"/><path d="M14.8 6.6c-2.3-.4-4.4 1.2-4.4 3.6v2.1H8.6m1.8 0v5.2m0-5.2h3.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
  opensuse: badge('#73ba25', 'S', true),
  alpine: `<circle cx="12" cy="12" r="10.5" fill="#0d597f"/><path d="M4.8 16.2l4.6-6.2 3 4 2.1-2.6 4.7 4.8z" fill="#fff"/>`,
  arch: `<path d="M12 2.5c-.9 2.2-1.4 3.6-2.4 5.7.6.6 1.4 1.3 2.6 2.1-1.3-.5-2.2-1.1-2.9-1.7C7.9 11.5 6 15.6 3 21c2.4-1.4 4.2-2.2 5.9-2.5-.1-.3-.1-.7-.1-1 0-2.4 1.5-4.2 3.3-4.2s3.3 2 3.2 4.4l-.1.8c1.7.3 3.5 1.1 5.8 2.5l-1.3-2.4c-.7-.5-1.3-1.2-2.6-1.8.9.2 1.5.5 2 .8C16.6 12.3 15.2 8.4 12 2.5z" fill="#1793d1"/>`,
  oracle: `<rect x="2" y="7" width="20" height="10" rx="5" fill="none" stroke="#c74634" stroke-width="2.8"/>`,
  alma: badge('#0f4266', 'A', true),
  rocky: badge('#10b981', 'R', true),
  centos: badge('#932279', 'C'),
  redhat: badge('#ee0000', 'RH'),
  manjaro: badge('#35bf5c', 'M'),
  mint: badge('#87cf3e', 'LM', true),
  nixos: badge('#5277c3', 'N', true),
  gentoo: badge('#54487a', 'G', true),
  void: badge('#478061', 'V', true),
  pengwin: badge('#3b82f6', 'P', true),
  docker: badge('#1d63ed', 'D'),
  git: `<rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" transform="rotate(45 12 12)" fill="#f05133"/><path d="M10 8.3v7.4M10.2 9.6l4.3 2.3" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><circle cx="10" cy="8.3" r="1.5" fill="#fff"/><circle cx="10" cy="15.7" r="1.5" fill="#fff"/><circle cx="14.6" cy="12" r="1.5" fill="#fff"/>`,
  vs: `<path d="M17 2.5l4.5 2.2v14.6L17 21.5l-8.5-7.8L4 17.2l-1.5-.8V7.6L4 6.8l4.5 3.5L17 2.5zM17 8l-5 4 5 4V8zM4 9.5v5l2.4-2.5L4 9.5z" fill="#865fc5"/>`,
  msys: badge('#8a4fd1', 'M2'),
  cygwin: badge('#2e7d32', 'C', true),
  ssh: `<rect x="3" y="3.5" width="18" height="7.5" rx="1.8" fill="#5e6b80"/><rect x="3" y="13" width="18" height="7.5" rx="1.8" fill="#5e6b80"/><circle cx="7" cy="7.25" r="1.1" fill="#6ee7a0"/><circle cx="7" cy="16.75" r="1.1" fill="#6ee7a0"/><path d="M11 7.25h6.5M11 16.75h6.5" stroke="#c9d1dd" stroke-width="1.3" stroke-linecap="round"/>`,
  postgres: `<path d="M5 6v12c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9V6" fill="#336791"/><ellipse cx="12" cy="6" rx="7" ry="2.9" fill="#5b8fc4"/><path d="M5 12c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9" fill="none" stroke="#a9c7e6" stroke-width="1.1"/>`,
  database: `<path d="M5 6v12c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9V6" fill="#56657a"/><ellipse cx="12" cy="6" rx="7" ry="2.9" fill="#8796ab"/><path d="M5 12c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9" fill="none" stroke="#c4cfdc" stroke-width="1.1"/>`,
  python: `<path d="M11.8 2.5c-4.6 0-4.3 2-4.3 2v2.1h4.4v.6H5.7S2.5 6.9 2.5 11.8s2.8 4.7 2.8 4.7h1.7v-2.3s-.1-2.8 2.8-2.8h4.3s2.7 0 2.7-2.6V4.9s.4-2.4-5-2.4z" fill="#3776ab"/><path d="M12.2 21.5c4.6 0 4.3-2 4.3-2v-2.1h-4.4v-.6h6.2s3.2.3 3.2-4.6-2.8-4.7-2.8-4.7H17v2.3s.1 2.8-2.8 2.8H9.9s-2.7 0-2.7 2.6v3.9s-.4 2.4 5 2.4z" fill="#ffd43b"/>`,
  node: `<path d="M12 1.8l8.8 5.1v10.2L12 22.2l-8.8-5.1V6.9z" fill="#5fa04e"/><text x="12" y="15.6" text-anchor="middle" font-size="8.5" font-weight="700" fill="#fff" font-family="Segoe UI, sans-serif">JS</text>`,
  azure: badge('#0078d4', 'Az'),
};

export const SHELL_ICON_NAMES = Object.keys(SHELL_ICONS);

const s = (d: string) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;

export const UI_ICONS: Record<string, string> = {
  plus: s('M12 5v14M5 12h14'),
  chevron: s('M6 9.5l6 6 6-6'),
  close: s('M6.5 6.5l11 11M17.5 6.5l-11 11'),
  gear: `<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/>${s('M12 2.8l1.6 2.3 2.7-.7.6 2.7 2.6 1-.9 2.6 1.9 2.1-2 1.9.7 2.7-2.7.5-1 2.6-2.6-.9L12 21.2l-1.9-2-2.6.8-.8-2.7-2.7-.8.8-2.6-2-1.9 2-2-.9-2.6 2.7-.9.6-2.6 2.7.7z')}`,
  bolt: s('M13 2.5L5 13.5h6l-1 8 8-11h-6l1-8z'),
  help: `<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.6"/>${s('M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4')}<circle cx="12" cy="16.8" r="1" fill="currentColor"/>`,
  search: `<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>${s('M15 15l5.5 5.5')}`,
  up: s('M6 14.5l6-6 6 6'),
  down: s('M6 9.5l6 6 6-6'),
  splitRight: `<rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/>${s('M12 4v16')}`,
  splitDown: `<rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/>${s('M3 12h18')}`,
  copy: `<rect x="8" y="8" width="12" height="12" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/>${s('M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2')}`,
  paste: `<rect x="5" y="4.5" width="14" height="16.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/>${s('M9 4.5h6v3H9z')}`,
  folder: s('M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
  trash: s('M4.5 7h15M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7'),
  check: s('M5 12.5l4.5 4.5L19 7.5'),
  reset: s('M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4.5H9'),
  window: `<rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/>${s('M3 8.5h18')}`,
  rocket: s('M12 15l-3-3c1.5-4.5 4.5-7.5 10-8-.5 5.5-3.5 8.5-8 10zM9 12l-3.5-.5L8 8.5h3.5M12 15l.5 3.5 3-2.5v-3.5M6 18.5c.5-1.5 1.5-2.5 3-2.5'),
  brush: s('M17.5 3.5l3 3-9 9-3-3zM8.5 12.5c-2.5 0-4 1.5-4 4 0 1.5-1 2.5-2 3 3.5 1 7.5 0 8.5-3'),
  pointer: s('M5 3.5l13 7-6 1.5-2.5 6z'),
  layers: s('M12 3l9 5-9 5-9-5zM3 13l9 5 9-5'),
  swatch: `<circle cx="7.5" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><circle cx="16.5" cy="10" r="1.3" fill="currentColor"/>${s('M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-1 1.3-2-.6-1.2.2-2.5 1.5-2.5H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9z')}`,
  edit: s('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'),
  external: s('M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4'),
  refresh: s('M20 11a8 8 0 0 0-14.5-4.5M4 4.5V9h4.5M4 13a8 8 0 0 0 14.5 4.5M20 19.5V15h-4.5'),
  eye: `<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/>${s('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z')}`,
  eyeOff: s('M3 3l18 18M10.6 6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-2.7 3.4M6.4 6.9A16.5 16.5 0 0 0 2.5 12S6 18.5 12 18.5c1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2'),
  star: s('M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z'),
  sun: s('M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4'),
  moon: s('M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z'),
  globe: s('M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19zM2.5 12h19M12 2.5c2.5 2.6 3.8 5.8 3.8 9.5s-1.3 6.9-3.8 9.5c-2.5-2.6-3.8-5.8-3.8-9.5S9.5 5.1 12 2.5z'),
  lock: s('M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5zM8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2'),
  key: s('M14.5 4a5.5 5.5 0 1 1-4.9 8L4 17.6V20h2.4v-1.6H8V16.8h1.6l2.2-2.2A5.5 5.5 0 0 1 14.5 4zM16 7.5h.01'),
  backspace: s('M9 5.5h10a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3.5 12zM11.5 9.5l5 5M16.5 9.5l-5 5'),
};