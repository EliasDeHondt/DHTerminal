
let current: { menu: HTMLElement; select: HTMLSelectElement; cleanup: () => void } | null = null;
const CHECK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

function close(focusSelect = false) {
  if (!current) return;
  const { menu, select, cleanup } = current;
  current = null; cleanup(); menu.remove(); select.classList.remove('cselect-open');
  if (focusSelect) select.focus();
}

function choose(select: HTMLSelectElement, index: number) {
  if (select.selectedIndex !== index) {
    select.selectedIndex = index;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  close(true);
}

function open(select: HTMLSelectElement) {
  close();
  const options = Array.from(select.options);
  if (!options.length) return;
  const menu = document.createElement('div');
  menu.className = 'menu cselect';
  menu.setAttribute('role', 'listbox');
  const items: HTMLButtonElement[] = [];
  options.forEach((opt, i) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-item cselect-item' + (i === select.selectedIndex ? ' menu-item--active' : '');
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(i === select.selectedIndex));
    item.disabled = opt.disabled;
    item.innerHTML = `<span class="menu-label"></span><span class="cselect-check">${i === select.selectedIndex ? CHECK : ''}</span>`;
    (item.firstElementChild as HTMLElement).textContent = opt.textContent ?? '';
    item.addEventListener('mousedown', e => e.preventDefault());
    item.addEventListener('click', () => choose(select, i));
    menu.appendChild(item); items.push(item);
  });
  document.body.appendChild(menu);
  select.classList.add('cselect-open');

  const r = select.getBoundingClientRect();
  menu.style.minWidth = `${Math.max(r.width, 160)}px`;
  const height = Math.min(menu.scrollHeight, 320);
  const below = window.innerHeight - r.bottom - 8, above = r.top - 8;
  const top = below >= height || below >= above ? r.bottom + 4 : Math.max(8, r.top - 4 - height);
  menu.style.maxHeight = `${Math.max(120, Math.min(320, below >= height || below >= above ? below - 4 : above - 4))}px`;
  menu.style.top = `${top}px`;
  menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;

  let active = Math.max(0, select.selectedIndex);
  const focusItem = (i: number) => { active = (i + items.length) % items.length; for (let k = 0; k < items.length && items[active].disabled; k++) active = (active + 1) % items.length; items.forEach((it, k) => it.classList.toggle('menu-item--open', k === active)); items[active].scrollIntoView({ block: 'nearest' }); };
  focusItem(active);
  let typed = '', typedAt = 0;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); close(e.key === 'Escape'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
    else if (e.key === 'End') { e.preventDefault(); focusItem(items.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!items[active].disabled) choose(select, active); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) { const now = Date.now(); typed = now - typedAt > 700 ? e.key.toLowerCase() : typed + e.key.toLowerCase(); typedAt = now; const hit = options.findIndex(o => (o.textContent ?? '').trim().toLowerCase().startsWith(typed)); if (hit >= 0) focusItem(hit); }
    else return;
    e.stopPropagation();
  };
  const onDown = (e: Event) => { if (!menu.contains(e.target as Node) && e.target !== select) close(); };
  const onScroll = (e: Event) => { if (!menu.contains(e.target as Node)) close(); };
  const onResize = () => close();
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('mousedown', onDown, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize);
  window.addEventListener('blur', onResize);
  current = { menu, select, cleanup: () => { document.removeEventListener('keydown', onKey, true); document.removeEventListener('mousedown', onDown, true); document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onResize); window.removeEventListener('blur', onResize); } };
}

export function enableCustomSelects() {
  document.addEventListener('mousedown', e => {
    const select = (e.target as HTMLElement | null)?.closest?.('select') as HTMLSelectElement | null;
    if (!select || select.multiple || select.disabled || e.button !== 0) return;
    e.preventDefault();
    if (current?.select === select) { close(true); return; }
    select.focus();
    open(select);
  }, true);
  document.addEventListener('keydown', e => {
    const select = e.target as HTMLSelectElement;
    if (select?.tagName !== 'SELECT' || select.multiple || select.disabled || current) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'F4' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))) { e.preventDefault(); open(select); }
  }, true);
}
