/**
 * renderJournalTable — единый рендерер журнала измерений.
 * §21.B.1 REFERENCE.md.
 *
 * Принимает host (любой `<table>` или `<div>` куда рендерим thead+tbody),
 * spec колонок и rows. Сам управляет:
 *   - Заголовками (thead) — на основе ColumnSpec.label.
 *   - Cells (tbody) — readonly текст для meta/direct, input для derived
 *     в semi-auto/fully-manual; readonly для derived в fully-auto.
 *   - Verdict-классами на cells (`.j-verdict--ok|close|wrong|empty`).
 *   - Проверочной кнопкой ✓ в конце строки.
 *   - Editing-state: при `editingRowIdx === row.idx` ВСЕ direct/derived
 *     становятся input'ами (в любом режиме).
 *
 * Колбеки:
 *   - `onCellInput` — input value в derived/direct, value: number|null.
 *   - `onVerify(rowIdx)` — клик по ✓; пересчитать verdicts, render заново.
 *   - `onEdit(rowIdx)` — двойной клик по строке; ставит editingRowIdx.
 *   - `onCancelEdit()` — Esc или клик «Отмена».
 *   - `onDelete(rowIdx)` — удалить строку (опционально).
 */

import { formatRu, parseRu } from './format';
import type { ColumnSpec, JournalMode, JournalRow, JournalSpec } from './types';

export interface RenderJournalOptions {
  /** Текущий режим записи. Управляет тем, какие cells — input. */
  readonly mode: JournalMode;
  /** Если задан — все cells этой строки становятся input'ами. */
  readonly editingRowIdx?: number | null;
  onCellInput(rowIdx: number, key: string, value: number | null): void;
  onVerify(rowIdx: number): void;
  onEdit?(rowIdx: number): void;
  onCancelEdit?(): void;
  onDelete?(rowIdx: number): void;
}

/**
 * Рендерит `<thead>` и `<tbody>` внутри host'а. Идемпотентно — повторный
 * вызов чистит host и рендерит заново.
 *
 * Sохраняет фокус на cell, который был сфокусирован до re-render
 * (по data-row + data-key), чтобы ученик не терял позицию ввода.
 */
export function renderJournalTable(
  host: HTMLElement,
  spec: JournalSpec,
  rows: ReadonlyArray<JournalRow>,
  opts: RenderJournalOptions,
): void {
  // Запоминаем focused cell, чтобы восстановить после re-render.
  // Защитный try/catch: некоторые runtime'ы (happy-dom) могут бросать
  // на selectionStart у не-text input'ов или иметь stale activeElement.
  let focused: { row: string | undefined; key: string | undefined; selStart: number | null; selEnd: number | null } | null = null;
  try {
    const ae = document.activeElement;
    if (
      ae instanceof HTMLInputElement &&
      typeof host.contains === 'function' &&
      host.contains(ae) &&
      ae.dataset['row']
    ) {
      focused = {
        row: ae.dataset['row'],
        key: ae.dataset['key'],
        selStart: ae.selectionStart,
        selEnd: ae.selectionEnd,
      };
    }
  } catch {
    /* happy-dom selectionStart bug → ignore focus restore */
  }

  host.replaceChildren();

  const table = document.createElement('table');
  table.className = 'lab-journal-table';
  table.setAttribute('data-experiment', spec.experimentId);
  table.setAttribute('data-mode', opts.mode);

  // Header.
  const thead = document.createElement('thead');
  const headerTr = document.createElement('tr');
  for (const col of spec.columns) {
    const th = document.createElement('th');
    th.textContent = col.label;
    th.setAttribute('data-key', col.key);
    th.setAttribute('data-source', col.source);
    headerTr.appendChild(th);
  }
  // Колонка ✓ — ТОЛЬКО в semi-auto (§21.A.1 UX-v2). В fully-manual нет
  // верификации, в fully-auto она бессмысленна.
  const hasDerived = spec.columns.some((c) => c.source === 'derived');
  if (hasDerived && opts.mode === 'semi-auto') {
    const thV = document.createElement('th');
    thV.textContent = '✓';
    thV.setAttribute('aria-label', 'Проверить');
    headerTr.appendChild(thV);
  }
  thead.appendChild(headerTr);
  table.appendChild(thead);

  // Body.
  const tbody = document.createElement('tbody');
  tbody.className = 'lab-journal-body';
  for (const row of rows) {
    const tr = renderRow(spec, row, opts);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  host.appendChild(table);

  // Восстанавливаем focus только в реальном браузере (не jsdom/happy-dom).
  // В тестовой среде focus-events могут триггерить re-render → infinite loop.
  if (focused?.row && focused?.key) {
    try {
      const target = host.querySelector<HTMLInputElement>(
        `input[data-row="${focused.row}"][data-key="${focused.key}"]`,
      );
      if (target && typeof target.focus === 'function') {
        target.focus();
        if (focused.selStart !== null && focused.selEnd !== null) {
          target.setSelectionRange(focused.selStart, focused.selEnd);
        }
      }
    } catch {
      /* defensive — focus/setSelectionRange может бросить в SSR/jsdom */
    }
  }
}

function renderRow(
  spec: JournalSpec,
  row: JournalRow,
  opts: RenderJournalOptions,
): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.dataset['rowIdx'] = String(row.idx);
  tr.dataset['ts'] = String(row.timestamp);
  if (opts.editingRowIdx === row.idx) tr.dataset['editing'] = 'true';

  // Двойной клик по строке → onEdit.
  if (opts.onEdit) {
    tr.addEventListener('dblclick', (ev) => {
      const target = ev.target as HTMLElement;
      // Не реагируем если клик в самом input'е (это не «двойной клик
      // по строке», а правка).
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') return;
      opts.onEdit?.(row.idx);
    });
  }

  for (const col of spec.columns) {
    const td = renderCell(col, row, opts);
    tr.appendChild(td);
  }

  // ✓-кнопка — ТОЛЬКО в semi-auto. В fully-manual ученик считает сам без
  // подсказок (§21.A.1 UX-v2); в fully-auto программа сама всё считает.
  const hasDerived = spec.columns.some((c) => c.source === 'derived');
  if (hasDerived && opts.mode === 'semi-auto') {
    const tdV = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'j-check';
    btn.textContent = '✓';
    btn.setAttribute('aria-label', `Проверить значения в строке ${row.idx}`);
    btn.dataset['row'] = String(row.idx);
    btn.addEventListener('click', () => opts.onVerify(row.idx));
    tdV.appendChild(btn);
    tr.appendChild(tdV);
  }

  return tr;
}

function renderCell(
  col: ColumnSpec,
  row: JournalRow,
  opts: RenderJournalOptions,
): HTMLTableCellElement {
  const td = document.createElement('td');
  td.dataset['key'] = col.key;
  td.dataset['source'] = col.source;
  const verdict = row.verdicts?.[col.key];
  // Verdict-data ставим всегда (для тестов), но CSS-классы — ТОЛЬКО в semi-auto.
  // В fully-manual ученик не должен видеть «правильно ли» (§21.A.1 UX-v2).
  if (verdict) {
    td.dataset['verdict'] = verdict;
    if (opts.mode === 'semi-auto' && verdict !== 'empty') {
      td.classList.add('j-verdict', `j-verdict--${verdict}`);
    }
  }

  const value = row.values[col.key] ?? null;
  const isEditing = opts.editingRowIdx === row.idx;

  // Решаем: input или readonly text?
  let writable = false;
  if (col.source === 'meta') {
    writable = false;
  } else if (col.source === 'derived') {
    // В fully-auto — программа считает, ученик не вводит.
    // В semi-auto и fully-manual — input.
    writable = opts.mode !== 'fully-auto';
  } else {
    // direct: только в fully-manual (или editing любого режима).
    writable = opts.mode === 'fully-manual' || isEditing;
  }

  if (writable) {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = `j-input j-input--${col.source}`;
    input.dataset['row'] = String(row.idx);
    input.dataset['key'] = col.key;
    // verdict-data ставим только в semi-auto, чтобы CSS-подсветка не
    // активировалась в fully-manual.
    if (verdict && opts.mode === 'semi-auto') input.dataset['verdict'] = verdict;
    input.value = value !== null ? formatRu(value, col.format) : '';
    // В semi-auto placeholder = единица (подсказка); в fully-manual — пусто
    // (никаких подсказок, §21.A.1 UX-v2).
    input.placeholder = opts.mode === 'fully-manual' ? '' : (col.unit ?? '');
    input.setAttribute(
      'aria-label',
      col.ariaLabel ?? `${col.label}${col.unit ? ' (' + col.unit + ')' : ''}`,
    );
    input.addEventListener('input', () => {
      const parsed = parseRu(input.value);
      opts.onCellInput(row.idx, col.key, parsed);
    });
    td.appendChild(input);
  } else {
    td.textContent = formatRu(value, col.format);
  }

  return td;
}
