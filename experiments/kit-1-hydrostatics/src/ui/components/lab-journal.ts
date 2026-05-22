/**
 * <lab-journal role="student|teacher" experiment-id="1.2" student-name="Иванов">
 *
 * Научная тетрадь-журнал опыта 1.2 «Архимедова сила». На экране — тёмная
 * стеклянная плашка под общую палитру Кит-1 (rgb(6 13 20 / 0.78), backdrop
 * blur, teal-accent). На печати (@media print) — светлая paper-aesthetic
 * с голубой тетрадной линейкой 1px #d4dde8. Колонки фиксированной семантики:
 *   №, Цилиндр, V (см³), P_возд (Н), P_жид (Н), F_A_изм (Н), F_A_теор (Н), Δ%, ✓/≈/✗
 *
 * Числа — `JetBrains Mono` + `tabular-nums`, выравнивание по правому краю
 * (десятичная запятая RU). Tolerance — три цвета:
 *   |Δ| ≤ 2%   → ✓ зелёный  (отлично)
 *   |Δ| ≤ 5%   → ≈ жёлтый   (близко)
 *   |Δ| > 5%   → ✗ красный  (проверьте)
 *
 * Формула «F_A = P_возд − P_жид» появляется fade-in 200ms над таблицей
 * после первой строки, в которой ОБА P_air и P_liquid не null
 * (implicit scaffolding по PhET-research §1).
 *
 * Источники истины: спека 2026-05-07 §7, research §1 (10 правил
 * лабораторного журнала). НЕ интегрируется в оркестратор на этом
 * этапе — это задача этапа 6.
 */

import {
  G,
  RHO_WATER,
  cm3ToM3,
  measuredArchimedesForceN,
} from '../../physics/archimedes/ArchimedesCalc';

// ─── Public API ────────────────────────────────────────────────────────

export type CylinderId = 'No2' | 'No3' | 'No4';
export type JournalRole = 'student' | 'teacher';

export interface JournalRow {
  cylinder: CylinderId;
  V_cm3: number;
  P_air_N: number | null;
  P_liquid_N: number | null;
  /** Авто-вычисляется из P_air − P_liquid; null если хоть одна часть пуста. */
  F_A_meas_N: number | null;
  /** Авто-вычисляется из ρ_воды · g · V (см³ → м³). */
  F_A_theor_N: number;
  /** (F_meas − F_theor) / F_theor × 100, %. null если F_meas null. */
  delta_pct: number | null;
  context: { cylinder_id: string; liquid: 'water'; V_water_ml: number };
  timestamp: number;
}

// ─── Tolerance ─────────────────────────────────────────────────────────

export type ToleranceVerdict = 'ok' | 'close' | 'wrong' | 'pending';

export function classifyDelta(delta_pct: number | null): ToleranceVerdict {
  if (delta_pct === null || !Number.isFinite(delta_pct)) return 'pending';
  const abs = Math.abs(delta_pct);
  if (abs <= 2) return 'ok';
  if (abs <= 5) return 'close';
  return 'wrong';
}

const TOOLTIPS: Record<ToleranceVerdict, string> = {
  ok: 'Отличный результат',
  close: 'Близко, попробуйте точнее',
  wrong: 'Проверьте: цилиндр полностью под водой?',
  pending: '',
};

const ICONS: Record<ToleranceVerdict, string> = {
  ok: '✓',
  close: '≈',
  wrong: '✗',
  pending: '',
};

// ─── Числовое форматирование (RU) ──────────────────────────────────────

/** Форматирует число с фиксированной точностью и десятичной запятой. */
function formatRu(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) return '—';
  // toFixed → "0.69" → replace "." на ","
  const rounded = value.toFixed(fractionDigits);
  return rounded.replace('.', ',');
}

/** Форматирует Δ% со знаком (`+0,2` / `−3,1`). */
function formatDelta(delta_pct: number | null): string {
  if (delta_pct === null || !Number.isFinite(delta_pct)) return '—';
  const sign = delta_pct >= 0 ? '+' : '−';
  return `${sign}${formatRu(Math.abs(delta_pct), 1)}`;
}

// ─── Авто-расчёт строки ────────────────────────────────────────────────

/**
 * Пересчитывает производные поля строки (F_A_meas, delta_pct, F_A_theor)
 * на основе входных P_air, P_liquid, V_cm3. Чистая функция.
 */
export function recomputeRow(
  partial: Pick<JournalRow, 'V_cm3' | 'P_air_N' | 'P_liquid_N'>,
): {
  F_A_meas_N: number | null;
  F_A_theor_N: number;
  delta_pct: number | null;
} {
  const V_m3 = cm3ToM3(partial.V_cm3);
  const F_A_theor_N = RHO_WATER * G * V_m3;
  let F_A_meas_N: number | null = null;
  let delta_pct: number | null = null;
  if (partial.P_air_N !== null && partial.P_liquid_N !== null) {
    F_A_meas_N = measuredArchimedesForceN(partial.P_air_N, partial.P_liquid_N);
    if (F_A_theor_N > 0) {
      delta_pct = ((F_A_meas_N - F_A_theor_N) / F_A_theor_N) * 100;
    }
  }
  return { F_A_meas_N, F_A_theor_N, delta_pct };
}

// ─── Подписи цилиндров ─────────────────────────────────────────────────

const CYLINDER_LABEL: Record<CylinderId, string> = {
  No2: '№2',
  No3: '№3',
  No4: '№4',
};

// ─── Имя файла экспорта ────────────────────────────────────────────────

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildFilename(
  experimentId: string,
  role: JournalRole,
  studentName: string | null,
  ext: 'pdf' | 'csv',
): string {
  const dateIso = todayIso();
  const safeName =
    studentName && studentName.trim()
      ? studentName.trim().replace(/[\\/:*?"<>|]+/g, '_')
      : null;
  const parts = ['Кит1', `Опыт${experimentId || '1.2'}`, role];
  if (safeName) parts.push(safeName);
  parts.push(dateIso);
  return `${parts.join('_')}.${ext}`;
}

// ─── Стили (one source of truth) ───────────────────────────────────────

/**
 * Палитра — тёмная стеклянная плашка в стиле measurement-panel опыта 1.1.
 * Использует те же CSS-токены, что и Кит-1 в целом, чтобы журнал не
 * диссонировал на тёмной сцене. На печати (@media print) переключается
 * в светлую paper-aesthetic — там уже бумага, не экран.
 */
const PANEL_BG = 'rgb(6 13 20 / 0.78)';
const PANEL_BORDER = 'rgb(255 255 255 / 0.08)';
const PANEL_RULE = 'rgb(255 255 255 / 0.05)';
const COLOR_OK = '#3ddc97';     // brighter green for dark bg
const COLOR_CLOSE = '#f5b94a';  // amber
const COLOR_WRONG = '#ff6b6b';  // soft red

const STYLES = `
  :host {
    display: block;
    --panel-bg: ${PANEL_BG};
    --panel-border: ${PANEL_BORDER};
    --panel-rule: ${PANEL_RULE};
    --color-brand-teal: var(--color-brand-teal-override, #38bdaf);
    --color-ok: ${COLOR_OK};
    --color-close: ${COLOR_CLOSE};
    --color-wrong: ${COLOR_WRONG};
    --panel-text: var(--color-text-primary, #e8eef9);
    --panel-text-muted: var(--color-text-secondary, #a8b3c7);
    --panel-radius: var(--radius-lg, 12px);
    --rule-step: 28px;
    --fade-dur: 200ms;
    color: var(--panel-text);
    font-family: var(--font-display, 'Inter', system-ui, sans-serif);
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: var(--panel-radius);
    box-shadow:
      0 8px 24px rgb(0 0 0 / 0.4),
      inset 0 1px 0 rgb(255 255 255 / 0.04);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    overflow: hidden;
  }
  @media (prefers-reduced-motion: reduce) {
    :host { --fade-dur: 0ms; }
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--panel-border);
    background: rgb(56 189 175 / 0.06);
  }
  .title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--panel-text);
  }
  .actions {
    display: inline-flex;
    gap: 6px;
  }
  .btn {
    appearance: none;
    border: 1px solid var(--panel-border);
    background: rgb(255 255 255 / 0.04);
    color: var(--panel-text);
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
  }
  .btn:hover {
    background: rgb(56 189 175 / 0.12);
    border-color: rgb(56 189 175 / 0.4);
    color: #38bdaf;
  }
  .btn:focus-visible {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 2px;
  }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .formula-card {
    margin: 10px 14px 0;
    padding: 8px 12px;
    background: rgb(56 189 175 / 0.06);
    border: 1px dashed rgb(56 189 175 / 0.3);
    border-radius: 6px;
    font-size: 13px;
    color: var(--panel-text-muted);
    opacity: 0;
    transition: opacity var(--fade-dur) ease-out;
  }
  .formula-card[data-visible="true"] {
    opacity: 1;
  }
  .formula-card[hidden] {
    display: none !important;
  }
  .formula-card .formula {
    font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);
    color: var(--panel-text);
    font-weight: 600;
    margin-left: 4px;
  }

  .table-wrap {
    padding: 10px 14px 14px;
  }
  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .table thead th {
    text-align: left;
    font-size: 10px;
    font-weight: 600;
    color: var(--panel-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 6px 8px;
    border-bottom: 1px solid var(--panel-border);
    background: transparent;
  }
  .table tbody tr {
    border-bottom: 1px solid var(--panel-rule);
  }
  .table tbody tr:last-child {
    border-bottom: none;
  }
  .table tbody td {
    padding: 6px 8px;
    height: var(--rule-step);
    vertical-align: middle;
    color: var(--panel-text);
  }
  .num {
    font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }
  .unit {
    /* На тёмном фоне teal #38bdaf даёт контраст ≥ 4.5 — WCAG AA. */
    color: #38bdaf;
    margin-left: 3px;
    font-size: 11px;
    font-variant-numeric: normal;
  }
  .col-num    { width: 36px;  text-align: center; color: var(--panel-text-muted); }
  .col-cyl    { width: 60px; }
  .col-V      { width: 92px; }
  .col-pair   { width: 100px; }
  .col-pliq   { width: 100px; }
  .col-Fmeas  { width: 110px; }
  .col-Ftheor { width: 110px; }
  .col-delta  { width: 78px; }
  .col-status { width: 36px; text-align: center; }
  .col-teach  { width: 110px; }

  .status-cell {
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    cursor: help;
  }
  .status-cell[data-verdict="ok"]    { color: var(--color-ok);    background: rgba(61,220,151,0.10); }
  .status-cell[data-verdict="close"] { color: var(--color-close); background: rgba(245,185,74,0.10); }
  .status-cell[data-verdict="wrong"] { color: var(--color-wrong); background: rgba(255,107,107,0.10); }

  .empty {
    padding: 24px 16px;
    text-align: center;
    color: var(--panel-text-muted);
    font-size: 13px;
    font-style: italic;
  }
  .col-num    { color: var(--panel-text-muted); }

  .summary {
    margin-top: 10px;
    padding: 8px 10px;
    background: rgb(56 189 175 / 0.06);
    border: 1px solid rgb(56 189 175 / 0.25);
    border-radius: 6px;
    font-size: 12px;
    color: var(--panel-text-muted);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .summary strong {
    color: var(--panel-text);
    font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);
    font-variant-numeric: tabular-nums;
  }

  /* Печать: переключаемся на светлую paper-aesthetic — на бумаге
     тёмный glass читается плохо, нужен высокий контраст для учителя.
     Тонкая голубая линейка имитирует тетрадный лист. */
  @media print {
    :host {
      background: #fdfcf7 !important;
      color: #1f2933 !important;
      border-color: #000 !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
    }
    .header { background: transparent !important; border-color: #d4dde8 !important; }
    .title { color: #1f2933 !important; }
    .table thead th { color: #5b6b7c !important; border-color: #d4dde8 !important; }
    .table tbody td { color: #1f2933 !important; }
    .table tbody tr { border-color: #d4dde8 !important; }
    .unit { color: #0d6e62 !important; }
    .formula-card { background: #fff !important; border-color: #c8d2dc !important; color: #5b6b7c !important; }
    .formula-card .formula { color: #1f2933 !important; }
    .summary { background: #f6f8fb !important; border-color: #d4dde8 !important; color: #5b6b7c !important; }
    .summary strong { color: #1f2933 !important; }
    .actions { display: none !important; }
  }
`;

// ─── CSV ───────────────────────────────────────────────────────────────

const CSV_DELIM = ';';
const CSV_HEADER_BASE = [
  '№',
  'Цилиндр',
  'V (см³)',
  'P_возд (Н)',
  'P_жид (Н)',
  'F_A_изм (Н)',
  'F_A_теор (Н)',
  'Δ (%)',
  'Статус',
  'V_воды (мл)',
  'Жидкость',
  'Время',
];
const CSV_HEADER_TEACHER_EXTRA = ['F_A_теор_учитель (Н)', 'Оценка (%)'];

function csvEscape(value: string): string {
  if (value.includes(CSV_DELIM) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  return csvEscape(typeof value === 'number' ? formatRu(value, 4) : String(value));
}

// ─── Component ────────────────────────────────────────────────────────

export class LabJournal extends HTMLElement {
  static readonly observedAttributes = ['role', 'data-role', 'experiment-id', 'student-name'];

  #rows: JournalRow[] = [];
  #shadow: ShadowRoot;
  /** Монотонный счётчик для гарантированной уникальности timestamp. */
  #lastTs = 0;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.#render();
  }

  attributeChangedCallback(): void {
    if (this.#shadow.childNodes.length) this.#render();
  }

  // ─── Public API ─────────────────────────────────────────────────────

  /** Возвращает read-only копию массива строк. */
  getRows(): ReadonlyArray<JournalRow> {
    return this.#rows.slice();
  }

  /**
   * Добавляет строку в журнал. Возвращает её timestamp как handle для
   * последующих updateRow / removeRow. Эмитит `row-added`.
   */
  addRow(row: Omit<JournalRow, 'timestamp'>): number {
    const recomputed = recomputeRow(row);
    const now = Date.now();
    const ts = now > this.#lastTs ? now : this.#lastTs + 1;
    this.#lastTs = ts;
    const full: JournalRow = {
      ...row,
      F_A_meas_N: recomputed.F_A_meas_N,
      F_A_theor_N: recomputed.F_A_theor_N,
      delta_pct: recomputed.delta_pct,
      timestamp: ts,
    };
    this.#rows.push(full);
    this.#render();
    this.dispatchEvent(
      new CustomEvent<{ row: JournalRow }>('row-added', {
        detail: { row: full },
        bubbles: true,
        composed: true,
      }),
    );
    return ts;
  }

  /**
   * Обновляет существующую строку. Производные поля (F_A_meas, delta_pct,
   * F_A_theor) пересчитываются ВСЕГДА, даже если patch их явно содержит —
   * физика сильнее ввода. Если `ts` не найден — no-op + console.warn в DEV.
   */
  updateRow(ts: number, patch: Partial<JournalRow>): void {
    const idx = this.#rows.findIndex((r) => r.timestamp === ts);
    if (idx < 0) {
      if (import.meta.env?.DEV) {
        console.warn(`[lab-journal] updateRow: ts=${ts} не найден`);
      }
      return;
    }
    const prev = this.#rows[idx]!;
    const merged: JournalRow = {
      ...prev,
      ...patch,
      // ts менять нельзя — это handle
      timestamp: prev.timestamp,
      // context подмёрживаем глубоко, чтобы patch.context частично работал
      context: patch.context ? { ...prev.context, ...patch.context } : prev.context,
    };
    const recomputed = recomputeRow({
      V_cm3: merged.V_cm3,
      P_air_N: merged.P_air_N,
      P_liquid_N: merged.P_liquid_N,
    });
    merged.F_A_meas_N = recomputed.F_A_meas_N;
    merged.F_A_theor_N = recomputed.F_A_theor_N;
    merged.delta_pct = recomputed.delta_pct;
    this.#rows[idx] = merged;
    this.#render();
  }

  /** Удаляет строку по timestamp. Эмитит `row-removed`. No-op если нет. */
  removeRow(ts: number): void {
    const idx = this.#rows.findIndex((r) => r.timestamp === ts);
    if (idx < 0) return;
    this.#rows.splice(idx, 1);
    this.#render();
    this.dispatchEvent(
      new CustomEvent<{ ts: number }>('row-removed', {
        detail: { ts },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Очищает весь журнал. Эмитит `cleared`. */
  clear(): void {
    if (this.#rows.length === 0) return;
    this.#rows = [];
    this.#render();
    this.dispatchEvent(
      new CustomEvent('cleared', { bubbles: true, composed: true }),
    );
  }

  /**
   * Печать через `window.print()` + класс `printing-journal` на body.
   * После события `afterprint` (или, если оно не пришло — синхронно после
   * вызова `window.print()` в тестах) — класс снимается.
   */
  exportPDF(_filename?: string): void {
    void _filename; // имя файла задаёт пользователь в системном диалоге печати
    const body = document.body;
    body.classList.add('printing-journal');
    const cleanup = (): void => {
      body.classList.remove('printing-journal');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    try {
      window.print();
    } finally {
      // happy-dom не эмитит afterprint — снимаем класс синхронно как fallback
      // через rAF, чтобы реальный браузер успел захватить состояние перед уборкой
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => cleanup());
      } else {
        cleanup();
      }
    }
    this.dispatchEvent(
      new CustomEvent<{ format: 'pdf' }>('exported', {
        detail: { format: 'pdf' },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Сохраняет CSV (разделитель `;`, BOM для Excel-RU). Имя файла
   * формируется из `experiment-id` + `role` + `student-name` + сегодняшней
   * даты, если параметр `filename` не передан.
   */
  exportCSV(filename?: string): void {
    const role = this.#getRole();
    const expId = this.getAttribute('experiment-id') ?? '1.2';
    const studentName = this.getAttribute('student-name');
    const fname = filename ?? buildFilename(expId, role, studentName, 'csv');
    const csv = this.#buildCsv(role);
    // BOM + UTF-8 — чтобы Excel-RU не ломал кириллицу
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // happy-dom может не иметь revokeObjectURL — защищаемся
    if (typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }
    this.dispatchEvent(
      new CustomEvent<{ format: 'csv'; filename: string }>('exported', {
        detail: { format: 'csv', filename: fname },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ─── Internals ──────────────────────────────────────────────────────

  #getRole(): JournalRole {
    // Этап 10 a11y: HTML-атрибут `role` коллизирует с ARIA-ролями (axe ругается
    // «Role must be one of the valid ARIA roles»). Главный источник теперь —
    // `data-role`. Старый `role` оставлен как fallback для обратной совместимости
    // (тесты + старые шаблоны), но в новом коде использовать data-role.
    const v =
      this.getAttribute('data-role') ?? this.getAttribute('role') ?? 'student';
    return v === 'teacher' ? 'teacher' : 'student';
  }

  /** Полная ли первая строка (оба P_air и P_liquid не null) — критерий показа formula-card. */
  #hasCompleteRow(): boolean {
    return this.#rows.some(
      (r) => r.P_air_N !== null && r.P_liquid_N !== null,
    );
  }

  #okRatioPct(): number {
    if (this.#rows.length === 0) return 0;
    const ok = this.#rows.filter(
      (r) => r.delta_pct !== null && classifyDelta(r.delta_pct) === 'ok',
    ).length;
    return Math.round((ok / this.#rows.length) * 100);
  }

  #buildCsv(role: JournalRole): string {
    const header =
      role === 'teacher'
        ? [...CSV_HEADER_BASE, ...CSV_HEADER_TEACHER_EXTRA]
        : CSV_HEADER_BASE;
    const lines: string[] = [header.map(csvEscape).join(CSV_DELIM)];
    for (let i = 0; i < this.#rows.length; i++) {
      const r = this.#rows[i]!;
      const verdict = classifyDelta(r.delta_pct);
      const cells: (string | number | null)[] = [
        i + 1,
        CYLINDER_LABEL[r.cylinder],
        r.V_cm3,
        r.P_air_N,
        r.P_liquid_N,
        r.F_A_meas_N,
        r.F_A_theor_N,
        r.delta_pct,
        verdict === 'pending' ? '' : ICONS[verdict],
        r.context.V_water_ml,
        r.context.liquid,
        new Date(r.timestamp).toISOString(),
      ];
      if (role === 'teacher') {
        cells.push(r.F_A_theor_N);
        cells.push(this.#okRatioPct());
      }
      lines.push(cells.map(csvCell).join(CSV_DELIM));
    }
    return lines.join('\r\n');
  }

  #render(): void {
    const role = this.#getRole();
    const isTeacher = role === 'teacher';
    const hasRows = this.#rows.length > 0;
    const showFormula = this.#hasCompleteRow();

    const headerCols = [
      `<th class="col-num" role="columnheader" scope="col">№</th>`,
      `<th class="col-cyl" role="columnheader" scope="col">Цилиндр</th>`,
      `<th class="col-V" role="columnheader" scope="col">V <span class="unit">см³</span></th>`,
      `<th class="col-pair" role="columnheader" scope="col">P_возд <span class="unit">Н</span></th>`,
      `<th class="col-pliq" role="columnheader" scope="col">P_жид <span class="unit">Н</span></th>`,
      `<th class="col-Fmeas" role="columnheader" scope="col">F_A_изм <span class="unit">Н</span></th>`,
      `<th class="col-Ftheor" role="columnheader" scope="col">F_A_теор <span class="unit">Н</span></th>`,
      `<th class="col-delta" role="columnheader" scope="col">Δ <span class="unit">%</span></th>`,
      `<th class="col-status" role="columnheader" scope="col" aria-label="Статус">·</th>`,
    ];
    if (isTeacher) {
      headerCols.push(
        `<th class="col-teach" role="columnheader" scope="col">F_A табл. <span class="unit">Н</span></th>`,
      );
    }

    const rowsHtml = this.#rows
      .map((r, i) => {
        const verdict = classifyDelta(r.delta_pct);
        const cells: string[] = [
          `<td class="col-num num">${i + 1}</td>`,
          `<td class="col-cyl">${CYLINDER_LABEL[r.cylinder]}</td>`,
          `<td class="col-V num">${formatRu(r.V_cm3, 1)}</td>`,
          `<td class="col-pair num">${r.P_air_N === null ? '—' : formatRu(r.P_air_N, 2)}</td>`,
          `<td class="col-pliq num">${r.P_liquid_N === null ? '—' : formatRu(r.P_liquid_N, 2)}</td>`,
          `<td class="col-Fmeas num">${r.F_A_meas_N === null ? '—' : formatRu(r.F_A_meas_N, 3)}</td>`,
          `<td class="col-Ftheor num">${formatRu(r.F_A_theor_N, 3)}</td>`,
          `<td class="col-delta num">${formatDelta(r.delta_pct)}</td>`,
          verdict === 'pending'
            ? `<td class="col-status status-cell" aria-label="Нет данных"></td>`
            : `<td class="col-status status-cell" data-verdict="${verdict}" title="${TOOLTIPS[verdict]}" aria-label="${TOOLTIPS[verdict]}">${ICONS[verdict]}</td>`,
        ];
        if (isTeacher) {
          cells.push(`<td class="col-teach num">${formatRu(r.F_A_theor_N, 3)}</td>`);
        }
        return `<tr role="row" data-ts="${r.timestamp}">${cells.join('')}</tr>`;
      })
      .join('');

    const tableHtml = `
      <table class="table" role="table" aria-label="Журнал измерений архимедовой силы">
        <thead role="rowgroup">
          <tr role="row">
            ${headerCols.join('\n            ')}
          </tr>
        </thead>
        <tbody role="rowgroup">
          ${rowsHtml}
        </tbody>
      </table>
    `;

    const teacherSummary = isTeacher
      ? `<div class="summary" role="status">
           <span>Оценка по доле ✓</span>
           <strong>${this.#okRatioPct()}%</strong>
         </div>`
      : '';

    this.#shadow.innerHTML = `
      <style>${STYLES}</style>
      <header class="header">
        <h3 class="title" id="journal-title">Журнал · опыт ${this.getAttribute('experiment-id') ?? '1.2'} «Архимед»</h3>
        <div class="actions">
          <button class="btn" type="button" data-action="csv" aria-label="Экспорт CSV">CSV</button>
          <button class="btn" type="button" data-action="pdf" aria-label="Экспорт PDF (печать)">PDF</button>
        </div>
      </header>
      <div class="formula-card" data-visible="${showFormula}" ${showFormula ? '' : 'hidden'}>
        У вас есть P_возд и P_жид —
        <span class="formula">F_A = P_возд − P_жид</span>
      </div>
      <div class="table-wrap">
        ${
          hasRows
            ? tableHtml
            : `<div class="empty">Записей пока нет. Подвесьте цилиндр, снимите P_возд и P_жид.</div>`
        }
        ${teacherSummary}
      </div>
    `;

    // Bindings (после innerHTML — старые узлы выкинуты)
    const csvBtn = this.#shadow.querySelector<HTMLButtonElement>('[data-action="csv"]');
    const pdfBtn = this.#shadow.querySelector<HTMLButtonElement>('[data-action="pdf"]');
    if (csvBtn) {
      csvBtn.disabled = !hasRows;
      csvBtn.addEventListener('click', () => this.exportCSV());
    }
    if (pdfBtn) {
      pdfBtn.disabled = !hasRows;
      pdfBtn.addEventListener('click', () => this.exportPDF());
    }
  }
}

// Защищаемся от повторной регистрации в DEV/HMR
if (!customElements.get('lab-journal')) {
  customElements.define('lab-journal', LabJournal);
}

declare global {
  interface HTMLElementTagNameMap {
    'lab-journal': LabJournal;
  }
}
