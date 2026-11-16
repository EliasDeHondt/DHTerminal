/**
    * @author Group DH Team
    * @see https://group-dh.com
    * @since 16/11/2026
**/

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SHELL_ICONS, UI_ICONS } from './icons';
import { StateService } from './state.service';

const cache = new Map<string, SafeHtml>();

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-icon', 'aria-hidden': 'true' },
  template: `<svg viewBox="0 0 24 24" [innerHTML]="svg()"></svg>`,
  styles: [`:host { display: inline-flex; width: var(--icon-size, 16px); height: var(--icon-size, 16px); flex: none; } svg { width: 100%; height: 100%; display: block; }`],
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);
  name = input.required<string>();
  svg = computed(() => {
    const key = 'ui:' + this.name();
    if (!cache.has(key)) cache.set(key, this.sanitizer.bypassSecurityTrustHtml(UI_ICONS[this.name()] ?? ''));
    return cache.get(key)!;
  });
}

@Component({
  selector: 'app-profile-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @switch (kind()) {
      @case ('builtin') { <svg viewBox="0 0 24 24" [innerHTML]="svg()"></svg> }
      @case ('image') { <img [src]="image()" alt=""> }
      @default { <span class="emoji">{{ icon() }}</span> }
    }`,
  styles: [`:host { display: inline-flex; align-items: center; justify-content: center; width: var(--icon-size, 16px); height: var(--icon-size, 16px); flex: none; } svg, img { width: 100%; height: 100%; display: block; object-fit: contain; } .emoji { font-size: calc(var(--icon-size, 16px) * 0.9); line-height: 1; }`],
})
export class ProfileIconComponent {
  private sanitizer = inject(DomSanitizer);
  private state = inject(StateService);
  icon = input<string | undefined>('builtin:terminal');
  fallback = input<string>('builtin:terminal');
  private resolved = computed(() => {
    const icon = this.icon() || this.fallback();
    if (icon.startsWith('builtin:')) return { kind: 'builtin', value: icon.slice(8) };
    if (/[\\/]/.test(icon) || /\.(png|ico|svg|jpe?g|gif|webp|bmp)$/i.test(icon)) {
      const url = this.state.iconUrl(icon);
      if (url) return { kind: 'image', value: url };
      const fb = this.fallback();
      return { kind: 'builtin', value: fb.startsWith('builtin:') ? fb.slice(8) : 'terminal' };
    }
    return { kind: 'emoji', value: icon };
  });
  kind = computed(() => this.resolved().kind);
  image = computed(() => this.resolved().value);
  svg = computed(() => {
    const name = SHELL_ICONS[this.resolved().value] ? this.resolved().value : 'terminal';
    const key = 'shell:' + name;
    if (!cache.has(key)) cache.set(key, this.sanitizer.bypassSecurityTrustHtml(SHELL_ICONS[name]));
    return cache.get(key)!;
  });
}