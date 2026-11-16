/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColorScheme, Profile, Settings } from '../../shared/types';
import { bridge } from './bridge';
import { ColorPickerComponent } from './color-picker.component';
import { t, TextKey, TPipe } from './i18n';
import { IconComponent, ProfileIconComponent } from './icon.component';
import { LockService } from './lock.service';
import { SHELL_ICON_NAMES } from './icons';
import { StateService } from './state.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, ProfileIconComponent, ColorPickerComponent, TPipe],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  state = inject(StateService);
  lock = inject(LockService);
  lockTimes = [5, 10, 15, 30, 60, 120, 240, 480].map(value => ({ value, n: value < 60 ? value : value / 60, label: (value < 60 ? 'common.minutes' : value === 60 ? 'common.hour' : 'common.hours') as TextKey }));
  s = this.state.settings;
  section = this.state.settingsSection;
  iconNames = SHELL_ICON_NAMES;
  fonts = ['Cascadia Mono', 'Cascadia Code', 'Consolas', 'Lucida Console', 'Courier New', 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Hack', 'MesloLGS NF', 'CaskaydiaCove Nerd Font'];
  sourceLabel = (p: Profile) => `source.${p.source}` as TextKey;

  editing = computed(() => { const id = this.state.settingsProfile(); return id ? this.state.profiles().find(p => p.id === id) ?? null : null; });
  fontName = computed(() => (this.s().fontFamily.split(',')[0] ?? '').replace(/['"]/g, '').trim());

  go(section: string) { this.section.set(section); this.state.settingsProfile.set(null); }
  openProfile(p: Profile) { this.section.set('profiles'); this.state.settingsProfile.set(p.id); }

  set<K extends keyof Settings>(key: K, value: Settings[K]) { this.state.saveSettings({ [key]: value } as Partial<Settings>); }
  num(key: 'fontSize' | 'lineHeight' | 'scrollback' | 'autoLockMinutes', value: string) { const n = Number(value); if (Number.isFinite(n)) this.set(key, n); }
  setFont(name: string) {
    const clean = name.replace(/['"]/g, '').trim();
    if (clean) this.set('fontFamily', `'${clean}', 'Cascadia Mono', Consolas, 'Courier New', monospace`);
  }


  update(p: Profile, patch: Partial<Profile>) { this.state.updateProfile(p.id, patch); }
  isOverridden(p: Profile) { return p.source !== 'custom' && !!this.s().profileOverrides[p.id] && Object.keys(this.s().profileOverrides[p.id]).length > 0; }
  resetProfile(p: Profile) {
    const o = { ...this.s().profileOverrides };
    delete o[p.id];
    this.set('profileOverrides', o);
  }

  addProfile() {
    const id = 'custom:' + Math.random().toString(36).slice(2, 10);
    const base = this.state.defaultProfile();
    const p: Profile = { id, name: t('profile.newName'), commandline: base?.commandline ?? 'cmd.exe', startingDirectory: '~', icon: 'builtin:terminal', source: 'custom' };
    this.state.saveSettings({ customProfiles: [...this.s().customProfiles, p] });
    this.openProfile(p);
  }

  duplicate(p: Profile) {
    const id = 'custom:' + Math.random().toString(36).slice(2, 10);
    const copy: Profile = { ...p, id, name: p.name + t('profile.copySuffix'), source: 'custom', hidden: false };
    this.state.saveSettings({ customProfiles: [...this.s().customProfiles, copy] });
    this.openProfile(copy);
  }

  deleteProfile(p: Profile) {
    const s = this.s();
    this.state.saveSettings({ customProfiles: s.customProfiles.filter(x => x.id !== p.id), defaultProfile: s.defaultProfile === p.id ? '' : s.defaultProfile, profileOrder: s.profileOrder.filter(id => id !== p.id) });
    this.state.settingsProfile.set(null);
  }

  move(p: Profile, delta: number) {
    const ids = this.state.profiles().map(x => x.id);
    const i = ids.indexOf(p.id), j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    this.set('profileOrder', ids);
  }

  async pickIcon(p: Profile) { const path = await bridge.pickIcon(); if (path) this.update(p, { icon: path }); }
  async pickFolder(p: Profile) { const path = await bridge.pickFolder(); if (path) this.update(p, { startingDirectory: path }); }


  swatches(sc: ColorScheme) { return [sc.red, sc.green, sc.yellow, sc.blue, sc.purple, sc.cyan, sc.white, sc.brightBlack]; }
  openJson() { bridge.openSettingsFile(); }
  openSite() { bridge.openLink('https://group-dh.com'); }
  redetect() { this.state.reloadProfiles(true); }
}