import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TPipe } from './i18n';

export const COLOR_PRESETS = ['#4f94f0', '#0f54ae', '#1baf7a', '#199e70', '#14b8a6', '#0ea5e9', '#8b5cf6', '#e87ba4', '#ec4899', '#e74c3c', '#eb6834', '#eda100', '#84cc16', '#6b7280', '#374151', '#000000'];

@Component({
  selector: 'app-color-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `<div class="grid" role="radiogroup" [attr.aria-label]="label()">@for (c of presets; track c) {<button type="button" class="swatch" role="radio" [class.swatch--on]="c === current()" [attr.aria-checked]="c === current()" [style.background]="c" (click)="pick(c)" [attr.aria-label]="c" [title]="c"></button>}<label class="custom" [class.swatch--on]="!!value() && !presets.includes(current())" [style.background]="value() && !presets.includes(current()) ? value() : null" [title]="'profile.otherColor' | t"><input type="color" [value]="value() || '#4f94f0'" (change)="pick($any($event.target).value)" [attr.aria-label]="'profile.otherColor' | t"/></label></div>`,
  styles: [`.grid { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; max-width: 300px; } .swatch, .custom { position: relative; width: 24px; height: 24px; padding: 0; border: 2px solid transparent; border-radius: 50%; transition: transform 0.12s; } .swatch:hover, .custom:hover { transform: scale(1.12); } .swatch--on { border-color: var(--text); box-shadow: 0 0 0 2px var(--page-solid) inset; } .custom { background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red); overflow: hidden; } .custom input { position: absolute; inset: -4px; width: 32px; height: 32px; opacity: 0; }`],
})
export class ColorPickerComponent {
  value = input<string | undefined>();
  label = input('Colour');
  valueChange = output<string>();
  presets = COLOR_PRESETS;
  current = () => (this.value() || '').toLowerCase();
  pick(c: string) { this.valueChange.emit(c.toLowerCase()); }
}
