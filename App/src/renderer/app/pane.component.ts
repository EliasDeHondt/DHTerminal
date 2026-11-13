import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { Session } from './session';
import { PaneNode, StateService, Tab } from './state.service';

/** One terminal. Its xterm element is moved in here, so splitting never restarts the shell. */
@Component({
  selector: 'app-leaf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  host: { class: 'leaf', '[class.leaf--active]': 'active()', '[class.leaf--multi]': 'multi()', '[class.leaf--bell]': 'flash()', '[style.background]': 'background()' },
  template: `
    <div class="leaf-term" #host></div>
    @if (session().searchOpen()) {
      <div class="search" (keydown)="searchKey($event)">
        <app-icon name="search" class="search-icon"></app-icon>
        <input #q class="search-input" placeholder="Find" [ngModel]="query()" (ngModelChange)="query.set($event); find(1, true)" spellcheck="false" aria-label="Find in terminal">
        <span class="search-count">{{ count() }}</span>
        <button class="search-btn" [class.search-btn--on]="caseSensitive()" (click)="caseSensitive.set(!caseSensitive()); find(1, true)" title="Match case" aria-label="Match case">Aa</button>
        <button class="search-btn" (click)="find(-1)" title="Previous (Shift+Enter)" aria-label="Previous match"><app-icon name="up"></app-icon></button>
        <button class="search-btn" (click)="find(1)" title="Next (Enter)" aria-label="Next match"><app-icon name="down"></app-icon></button>
        <button class="search-btn" (click)="closeSearch()" title="Close (Esc)" aria-label="Close find"><app-icon name="close"></app-icon></button>
      </div>
    }`,
})
export class LeafComponent implements AfterViewInit, OnDestroy {
  state = inject(StateService);
  session = input.required<Session>();
  active = input(false);
  multi = input(false);
  host = viewChild.required<ElementRef<HTMLElement>>('host');
  input = viewChild<ElementRef<HTMLInputElement>>('q');
  query = signal('');
  caseSensitive = signal(false);
  count = signal('');
  flash = signal(false);
  private observer?: ResizeObserver;
  private raf = 0;
  private lastBell = 0;
  private resultsSub?: { dispose(): void };

  background = () => this.state.scheme(this.session().profile).background;

  constructor() {
    effect(() => { if (this.session().searchOpen()) queueMicrotask(() => { this.input()?.nativeElement.focus(); this.input()?.nativeElement.select(); }); });
    effect(() => {
      const n = this.session().bell();
      if (n !== this.lastBell && this.state.settings().bell === 'flash') { this.flash.set(true); setTimeout(() => this.flash.set(false), 160); }
      this.lastBell = n;
    });
  }

  ngAfterViewInit() {
    const host = this.host().nativeElement;
    this.session().attach(host);
    if (this.active() && this.state.activeTab()?.kind === 'terminal' && !this.state.overlay()) this.session().focus();
    this.resultsSub = this.session().search.onDidChangeResults(r => this.count.set(r.resultCount ? `${r.resultIndex + 1}/${r.resultCount}` : this.query() ? 'No results' : ''));
    this.observer = new ResizeObserver(() => { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => this.session().fit()); });
    this.observer.observe(host);
  }

  ngOnDestroy() { this.observer?.disconnect(); this.resultsSub?.dispose(); cancelAnimationFrame(this.raf); }

  find(dir: 1 | -1, incremental = false) {
    const q = this.query();
    const s = this.session().search;
    if (!q) { s.clearDecorations(); this.count.set(''); return; }
    const scheme = this.state.scheme(this.session().profile);
    const opts = { caseSensitive: this.caseSensitive(), incremental, decorations: { matchBackground: scheme.brightYellow + '66', activeMatchBackground: scheme.yellow, matchOverviewRuler: scheme.brightYellow, activeMatchColorOverviewRuler: scheme.yellow } };
    if (dir === 1) s.findNext(q, opts); else s.findPrevious(q, opts);
  }

  searchKey(ev: KeyboardEvent) {
    if (ev.key === 'Enter') { ev.preventDefault(); this.find(ev.shiftKey ? -1 : 1); }
    else if (ev.key === 'Escape') { ev.preventDefault(); this.closeSearch(); }
  }

  closeSearch() {
    this.session().search.clearDecorations();
    this.session().searchOpen.set(false);
    this.session().focus();
  }
}

/** A tab's pane tree: leaves, or two children with a draggable divider. */
@Component({
  selector: 'app-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LeafComponent],
  host: { class: 'pane' },
  template: `
    @let n = node();
    @if (n.kind === 'leaf') {
      <app-leaf [session]="n.session" [active]="n.id === tab().activePane()" [multi]="multi()"></app-leaf>
    } @else {
      <div class="split" [class.split--row]="n.dir === 'row'" [class.split--column]="n.dir === 'column'" #box>
        <div class="split-part" [style.flex-basis.%]="n.ratio * 100"><app-pane [node]="n.a" [tab]="tab()" [multi]="true"></app-pane></div>
        <div class="splitter" role="separator" [attr.aria-orientation]="n.dir === 'row' ? 'vertical' : 'horizontal'" (pointerdown)="drag($event, n.id, n.dir, box)"></div>
        <div class="split-part" [style.flex-basis.%]="(1 - n.ratio) * 100"><app-pane [node]="n.b" [tab]="tab()" [multi]="true"></app-pane></div>
      </div>
    }`,
})
export class PaneComponent {
  private state = inject(StateService);
  node = input.required<PaneNode>();
  tab = input.required<Tab>();
  multi = input(false);

  drag(ev: PointerEvent, id: number, dir: 'row' | 'column', box: HTMLElement) {
    ev.preventDefault();
    const target = ev.target as HTMLElement;
    target.setPointerCapture(ev.pointerId);
    const rect = box.getBoundingClientRect();
    const move = (e: PointerEvent) => {
      const ratio = dir === 'row' ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height;
      this.state.setRatio(this.tab(), id, ratio);
    };
    const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  }
}
