/**
 * attachDetachButton — единый «×» для возврата прибора в палитру.
 *
 * См. §20.3 REFERENCE.md (`experiments/2-1-spring/REFERENCE.md`).
 *
 * Контракт:
 *   - 28×28 px, абсолютно позиционирован в правом-верхнем углу
 *     `top: -10px; right: -10px` (host обязан иметь `position: relative`).
 *   - Visual: серый круг rgba(0,0,0,0.55) → hover красный #dc2626.
 *   - Внутри Unicode `×`, font-size 18px, line-height 1.
 *   - Focusable + keyboard activate (Enter/Space на самой кнопке,
 *     Delete/Backspace на родителе).
 *   - aria-label из `opts.prettyName` («Убрать <prettyName> в комплект»).
 *
 * Возвращает функцию-detach, которая удаляет кнопку и снимает listener'ы.
 *
 * Используется во всех опытах Inter_OGE — единственная точка отрисовки
 * крестика. Любая кастомизация (offset, размер) — через CSS-переменные на
 * host'е, а не дополнительные параметры.
 */

export interface DetachButtonOptions {
  /** Идентификатор прибора (передаётся в onDetach). */
  readonly equipmentId: string;
  /** Человекочитаемое имя для aria-label («Динамометр 1 Н»). */
  readonly prettyName: string;
  /**
   * Колл-бек на click/Enter/Delete.
   * Должен каскадно убрать прибор + зависимые (см. §19.11.15 REFERENCE).
   */
  onDetach(equipmentId: string): void;
  /**
   * Слушать ли Delete/Backspace на host'е (а не только клик по кнопке).
   * Default true. Если host сам обрабатывает эти клавиши (например,
   * принимает их для собственной логики) — выключить.
   */
  readonly listenHostKeys?: boolean;
  /**
   * Кастомное позиционирование (если стандартное `top: -10; right: -10`
   * не подходит). Применяется как inline style. Например, для архимеда
   * detach-крестика, который рендерится sibling'ом в stage и
   * позиционируется JS'ом — всегда указывают `position: 'absolute'` +
   * own `top/left`.
   */
  readonly style?: Partial<CSSStyleDeclaration>;
  /**
   * Куда добавлять кнопку. По умолчанию — внутрь host'а как последний child.
   * Для архимед-кейса (host сам role="button" → axe ругается на nested
   * focusable) — указать sibling-контейнер в stage.
   */
  readonly mountTo?: 'host' | 'parent' | HTMLElement;
}

const BUTTON_CLASS = 'lab-detach-btn';

/**
 * Создаёт «×» на host'е и возвращает функцию-detach (убирает кнопку и
 * снимает все listener'ы).
 *
 * Идемпотентно: повторный вызов на том же host'е сначала удаляет старую
 * кнопку. Это полезно при re-render — не нужно вручную чистить.
 */
export function attachDetachButton(
  host: HTMLElement,
  opts: DetachButtonOptions,
): () => void {
  // Идемпотентность: убираем существующую кнопку, если есть.
  const existing = (host as HTMLElement & { __labDetachBtn?: HTMLButtonElement }).__labDetachBtn;
  if (existing && existing.isConnected) existing.remove();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = BUTTON_CLASS;
  btn.textContent = '×';
  btn.setAttribute('aria-label', `Убрать ${opts.prettyName} в комплект`);
  btn.setAttribute('data-equipment', opts.equipmentId);
  btn.tabIndex = 0;

  if (opts.style) {
    for (const [k, v] of Object.entries(opts.style)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (btn.style as any)[k] = v;
    }
  }

  const onClick = (ev: Event): void => {
    ev.stopPropagation();
    opts.onDetach(opts.equipmentId);
  };
  btn.addEventListener('click', onClick);

  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      opts.onDetach(opts.equipmentId);
    }
  };
  btn.addEventListener('keydown', onKey);

  // Delete/Backspace на host'е → detach (если разрешено).
  const listenHostKeys = opts.listenHostKeys ?? true;
  let onHostKey: ((ev: KeyboardEvent) => void) | null = null;
  if (listenHostKeys) {
    onHostKey = (ev: KeyboardEvent): void => {
      if (ev.key !== 'Delete' && ev.key !== 'Backspace') return;
      // Не перехватываем, если фокус во вложенном INPUT/TEXTAREA.
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      ev.preventDefault();
      opts.onDetach(opts.equipmentId);
    };
    host.addEventListener('keydown', onHostKey);
  }

  // Mount.
  const mountTo = opts.mountTo ?? 'host';
  if (mountTo === 'host') host.appendChild(btn);
  else if (mountTo === 'parent') host.parentElement?.appendChild(btn);
  else mountTo.appendChild(btn);

  (host as HTMLElement & { __labDetachBtn?: HTMLButtonElement }).__labDetachBtn = btn;

  return (): void => {
    btn.removeEventListener('click', onClick);
    btn.removeEventListener('keydown', onKey);
    if (onHostKey) host.removeEventListener('keydown', onHostKey);
    btn.remove();
    delete (host as HTMLElement & { __labDetachBtn?: HTMLButtonElement }).__labDetachBtn;
  };
}

/**
 * CSS-стили кнопки. Импортируется опытом один раз (в главный CSS) или
 * инжектируется через `injectDetachButtonStyles()` ниже. Класс
 * `.lab-detach-btn` применяется ко всем созданным attachDetachButton'ам.
 */
export const DETACH_BUTTON_CSS = `
.lab-detach-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  font-size: 18px;
  line-height: 1;
  font-family: system-ui, -apple-system, sans-serif;
  cursor: pointer;
  z-index: 50;
  user-select: none;
  -webkit-user-select: none;
  transition: background-color 140ms ease-out, transform 140ms ease-out;
}
.lab-detach-btn:hover,
.lab-detach-btn:focus-visible {
  background: #dc2626;
  transform: scale(1.08);
  outline: none;
}
.lab-detach-btn:focus-visible {
  box-shadow: 0 0 0 3px rgb(255 190 11 / 0.65);
}
.lab-detach-btn:active {
  transform: scale(0.96);
}
@media (prefers-reduced-motion: reduce) {
  .lab-detach-btn { transition: none; }
}
`;

/** Инжектирует стили в `<head>` один раз (idempotent через id). */
export function injectDetachButtonStyles(doc: Document = document): void {
  const id = 'lab-detach-btn-styles';
  if (doc.getElementById(id)) return;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = DETACH_BUTTON_CSS;
  doc.head.appendChild(style);
}
