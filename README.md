<img src="App/build/icon.png" width="96" alt="DHTerminal">

# 💙🤍README🤍💙

## 📘Table of Contents

1. [📘Table of Contents](#📘table-of-contents)
2. [🖖Introduction](#🖖introduction)
3. [✨Features](#✨features)
4. [⌨️Keyboard shortcuts](#⌨️keyboard-shortcuts)
5. [🛠️Development](#🛠️development)

---

## 🖖Introduction

DHTerminal is a modern tabbed terminal for Windows by Elias De Hondt, in the style of the new Windows Terminal. It finds every shell on your PC by itself and puts them in one dropdown: Windows PowerShell, PowerShell 7, Command Prompt, every WSL distro (Ubuntu, Debian, Kali, openSUSE, Alpine, Arch, Fedora, ...), Git Bash, MSYS2, Cygwin, the Visual Studio developer shells and your SSH hosts.

Please also see following documents:
- [LICENSE](LICENSE.md)
- [SECURITY](SECURITY.md)
- [CONTRIBUTING](CONTRIBUTING.md)
- [CODE OF CONDUCT](CODE-OF-CONDUCT.md)

## ✨Features

- **Every shell, found automatically**: Windows shells, all WSL distros (from the registry, with their own icon), Git for Windows, MSYS2/Cygwin, Visual Studio 2017+ developer prompts (via `vswhere`), hosts from `~/.ssh/config`, and profiles other apps install for Windows Terminal ("fragments").
- **Uses your Windows Terminal setup**: your own Windows Terminal profiles (e.g. a psql shortcut), color schemes and per-profile scheme choices are read in. You can turn this off in Settings.
- **Real ConPTY**: shells run through the same pseudo console as Windows Terminal (`node-pty` with the bundled `conpty.dll` + `OpenConsole.exe`), with the GPU-accelerated `xterm.js` renderer, 256 colours and true colour.
- **Tabs and panes**: drag tabs to reorder, rename with a double-click, split panes right/down, resize them by dragging or with the keyboard.
- **Find, command palette, zoom, copy on select, right-click paste, clickable links (Ctrl+click)**.
- **Settings page** like Windows Terminal: default profile, app theme (dark/light/system), Mica, font, cursor, color schemes, and per profile its name, command line, starting folder, icon, scheme, tab colour and visibility. Everything is stored in `%APPDATA%\DHTerminal\settings.json`, which you can also edit by hand (changes apply live).
- **Open in DHTerminal** in the Explorer right-click menu of every folder.

## ⌨️Keyboard shortcuts

| Action | Keys |
| --- | --- |
| New tab / new tab with profile 1–9 | `Ctrl+Shift+T` / `Ctrl+Shift+1…9` |
| Split pane (auto / right / down) | `Alt+Shift+D` / `Alt+Shift++` / `Alt+Shift+-` |
| Move between / resize panes | `Alt+Arrow` / `Alt+Shift+Arrow` |
| Close pane | `Ctrl+Shift+W` |
| Next / previous tab, go to tab 1–9 | `Ctrl+Tab` / `Ctrl+Shift+Tab`, `Ctrl+Alt+1…9` |
| Copy / paste | `Ctrl+C` (with a selection) / `Ctrl+V` |
| Find / command palette / profile menu | `Ctrl+Shift+F` / `Ctrl+Shift+P` / `Ctrl+Shift+Space` |
| Zoom | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` / `Ctrl+wheel` |
| New window / full screen / settings | `Ctrl+Shift+N` / `F11` / `Ctrl+,` |

## 🛠️Development

```powershell
cd App
npm install
npm start          # build and run
npm test           # unit tests
npm run dist       # installer in App/release/DHTerminal-Setup-v<version>.exe
```

Command line: `DHTerminal.exe --cwd <folder> --profile <name or id>`.

A release is built by GitHub Actions when a `v<version>` tag is pushed.
