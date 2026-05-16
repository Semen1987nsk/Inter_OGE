/**
 * Record-mode toggle — единый стандарт «как ученик пишет в журнал».
 *
 * См. §20.4 (legacy 2-режимный) и §21 (3-режимный) REFERENCE.md.
 *
 * Стандарт §21:
 *   - `semi-auto` (default) — клик «Записать» → программа пишет direct/meta;
 *      ученик вводит derived в input + ✓ проверка.
 *   - `fully-manual`        — клик «Записать» → пустая строка; ученик вводит ВСЁ
 *      (включая показания приборов direct).
 *   - `fully-auto`          — программа пишет всё автоматически после
 *      stable+ready, без участия ученика.
 *
 * Migration shim: legacy значения 'manual' / 'auto' нормализуются:
 *   - 'manual' → 'semi-auto' (default)
 *   - 'auto'   → 'fully-auto'
 *
 * Toggle сохраняется в localStorage по ключу `inter-oge.record-mode.<kitId>`.
 * Хелперы `getRecordMode(kitId)` / `setRecordMode(kitId, mode)` — единственный API.
 */

/**
 * Расширенный тип. Legacy 'manual'/'auto' оставлены для типобезопасной
 * миграции — `getRecordMode` всегда возвращает один из 3 «новых» режимов.
 */
export type RecordMode = 'semi-auto' | 'fully-manual' | 'fully-auto';
/** Legacy-совместимый тип для перехода (можно передавать в setRecordMode). */
export type RecordModeAny =
  | RecordMode
  | 'manual' /* legacy → semi-auto */
  | 'auto'; /* legacy → fully-auto */

export const DEFAULT_RECORD_MODE: RecordMode = 'semi-auto';

/**
 * Нормализует legacy/любое значение в актуальный RecordMode.
 *
 * Migration shim:
 * - 'manual' (legacy) → 'semi-auto' (default §21).
 * - 'auto' (legacy)   → 'semi-auto' тоже. Семантически legacy `auto` означал
 *   «программа сразу пишет direct-показания при drop, ученик считает derived
 *   в input + ✓». Это **семантический эквивалент** нового `semi-auto`
 *   (плюс auto-trigger). Полностью автоматический режим §21 (`fully-auto`)
 *   — это новая функция, выбирается только явным указанием.
 */
function normalize(v: unknown): RecordMode {
  if (v === 'semi-auto' || v === 'fully-manual' || v === 'fully-auto') return v;
  if (v === 'manual' || v === 'auto') return 'semi-auto';
  return DEFAULT_RECORD_MODE;
}

/**
 * Teacher-override: учитель может зафиксировать режим через URL-параметр
 * `?mode=semi-auto|fully-manual|fully-auto`. Если параметр валиден —
 * возвращает нормализованный режим; иначе `null` (используется localStorage).
 *
 * §21.A.4 REFERENCE.md. При override активен — toggle disabled
 * (ученик не может менять режим, выбранный преподавателем).
 */
export function getModeOverride(): RecordMode | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const loc = (globalThis as unknown as { location?: { search?: string } }).location;
    if (!loc?.search) return null;
    const params = new URLSearchParams(loc.search);
    const raw = params.get('mode');
    if (raw === null) return null;
    if (raw === 'semi-auto' || raw === 'fully-manual' || raw === 'fully-auto') return raw;
    if (raw === 'manual') return 'semi-auto';
    if (raw === 'auto') return 'fully-auto';
    return null;
  } catch {
    return null;
  }
}

/** Активен ли teacher-override (для UI индикации, disabled toggle и т.п.). */
export function isModeLocked(): boolean {
  return getModeOverride() !== null;
}

/**
 * §21 UX-v2 — глобальный body-атрибут `data-record-mode="<mode>"`.
 *
 * Позволяет CSS-селекторам типа `body[data-record-mode='fully-manual']
 * .formula-display { display: none; }` глобально скрывать формулы и
 * подсказки в fully-manual режиме (чистая «без подсказок» педагогика).
 *
 * Атрибут ставится при инициализации toggle и обновляется на каждом
 * переключении. Если опыт не использует toggle (legacy) — атрибут
 * можно поставить вручную через эту функцию.
 */
export function applyRecordModeAttribute(mode: RecordMode, doc: Document = document): void {
  try {
    if (doc.body) doc.body.dataset['recordMode'] = mode;
  } catch {
    /* defensive: некоторые runtime'ы могут не иметь body на ранней стадии */
  }
}

const KEY_PREFIX = 'inter-oge.record-mode.';

function safeStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    if (!ls) return null;
    // smoke-test: некоторые браузеры в private mode бросают на setItem
    const testKey = '__inter-oge-record-mode-probe__';
    ls.setItem(testKey, '1');
    ls.removeItem(testKey);
    return ls;
  } catch {
    return null;
  }
}

/**
 * Прочитать режим записи для kit'а.
 *
 * Приоритет: URL `?mode=...` (teacher-override) > localStorage > DEFAULT.
 * Legacy-значения нормализуются. См. §21.A.4 REFERENCE.md.
 */
export function getRecordMode(kitId: string): RecordMode {
  const override = getModeOverride();
  if (override !== null) return override;
  const ls = safeStorage();
  if (!ls) return DEFAULT_RECORD_MODE;
  const v = ls.getItem(KEY_PREFIX + kitId);
  return normalize(v);
}

/**
 * Записать режим. Принимает RecordMode или legacy-значения; на лету
 * нормализует их в новый формат (на диске всегда хранятся новые имена).
 * Silent no-op если localStorage недоступен ИЛИ активен teacher-override
 * (учитель зафиксировал режим через URL — ученик не может его менять).
 */
export function setRecordMode(kitId: string, mode: RecordModeAny): void {
  if (isModeLocked()) return;
  const ls = safeStorage();
  if (!ls) return;
  ls.setItem(KEY_PREFIX + kitId, normalize(mode));
}

/**
 * Создаёт визуальный toggle: `<label><input type="checkbox">Авто-запись</label>`.
 * Возвращает функцию-detach (удаляет элемент и снимает listener).
 *
 * Поведение:
 *   - Стартовый state читается из localStorage.
 *   - На change: setRecordMode + onChange callback.
 *   - Class `.lab-record-mode-toggle` для стилизации.
 */
export interface RecordModeToggleOptions {
  readonly kitId: string;
  onChange?(mode: RecordMode): void;
  /**
   * Текст label'а. Default «Авто-запись» (когда checked → auto).
   */
  readonly label?: string;
}

/**
 * §21 — 3-сегментный switch [Полу-авто | Ручной | Авто].
 * Возвращает функцию-detach.
 *
 * radiogroup-семантика для скринридеров; выбор сохраняется в localStorage.
 * `onChange` получает уже нормализованное новое значение.
 */
export function renderRecordModeToggle(
  host: HTMLElement,
  opts: RecordModeToggleOptions,
): () => void {
  const wrap = document.createElement('div');
  wrap.className = 'lab-record-mode-toggle';
  wrap.setAttribute('role', 'radiogroup');
  wrap.setAttribute('aria-label', 'Режим записи в журнал');
  const locked = isModeLocked();
  if (locked) {
    wrap.dataset['locked'] = 'true';
    wrap.setAttribute('aria-disabled', 'true');
    wrap.title = 'Режим зафиксирован учителем (URL-параметр ?mode=…). Изменить нельзя.';
  } else {
    wrap.title =
      'Полу-авто (по умолчанию): клик «Записать» → программа пишет показания приборов; ученик вводит расчётные. Ручной: ученик вводит ВСЁ. Авто: программа пишет автоматически.';
  }

  const current = getRecordMode(opts.kitId);
  // §21 UX-v2 — синхронизируем body-атрибут при init, чтобы CSS-правила
  // (formula-display hidden в fully-manual и т.п.) применялись сразу.
  applyRecordModeAttribute(current);
  const segments: { mode: RecordMode; label: string; hint: string }[] = [
    { mode: 'semi-auto', label: 'Полу-авто', hint: 'Программа пишет показания, ученик — расчётные' },
    { mode: 'fully-manual', label: 'Ручной', hint: 'Ученик вводит все значения сам' },
    { mode: 'fully-auto', label: 'Авто', hint: 'Программа пишет всё автоматически' },
  ];

  const buttons: HTMLButtonElement[] = [];
  for (const s of segments) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lab-record-mode-toggle__segment';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', s.mode === current ? 'true' : 'false');
    if (s.mode === current) btn.dataset['active'] = 'true';
    btn.dataset['mode'] = s.mode;
    btn.textContent = s.label;
    btn.title = s.hint;
    if (locked) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }
    btn.addEventListener('click', () => {
      if (locked) return;
      if (btn.dataset['active'] === 'true') return;
      for (const b of buttons) {
        delete b.dataset['active'];
        b.setAttribute('aria-checked', 'false');
      }
      btn.dataset['active'] = 'true';
      btn.setAttribute('aria-checked', 'true');
      setRecordMode(opts.kitId, s.mode);
      applyRecordModeAttribute(s.mode);
      opts.onChange?.(s.mode);
    });
    btn.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
        ev.preventDefault();
        const idx = buttons.indexOf(btn);
        const next = ev.key === 'ArrowLeft'
          ? (idx - 1 + buttons.length) % buttons.length
          : (idx + 1) % buttons.length;
        buttons[next]?.focus();
        buttons[next]?.click();
      }
    });
    buttons.push(btn);
    wrap.appendChild(btn);
  }
  host.appendChild(wrap);

  return (): void => {
    wrap.remove();
  };
}

/** CSS-стили 3-сегментного toggle'а. */
export const RECORD_MODE_TOGGLE_CSS = `
.lab-record-mode-toggle {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-family: var(--font-display, system-ui, sans-serif);
  user-select: none;
  -webkit-user-select: none;
}
.lab-record-mode-toggle__segment {
  appearance: none;
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: background-color 140ms ease-out, color 140ms ease-out;
}
.lab-record-mode-toggle__segment:hover:not([data-active='true']) {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
}
.lab-record-mode-toggle__segment[data-active='true'] {
  background: #ffbe0b;
  color: #1a1a1a;
  font-weight: 600;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
}
.lab-record-mode-toggle__segment:focus-visible {
  outline: 2px solid #ffbe0b;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .lab-record-mode-toggle__segment {
    transition: none;
  }
}
`;

export function injectRecordModeToggleStyles(doc: Document = document): void {
  const id = 'lab-record-mode-toggle-styles';
  if (doc.getElementById(id)) return;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = RECORD_MODE_TOGGLE_CSS;
  doc.head.appendChild(style);
}
