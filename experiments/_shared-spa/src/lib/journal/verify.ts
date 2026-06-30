/**
 * Проверка введённого учеником значения relative to expected.
 * Tolerance per-column (default 5%). См. §21.A.1 правило 2.
 */

import type { ColumnSpec, JournalRow, JournalVerdict } from './types';

const DEFAULT_TOLERANCE = 0.05;
const OK_TOLERANCE_RATIO = 0.4; // ok ≤ tolerance × 0.4

/**
 * Сравнить введённое value с эталоном. Возвращает verdict:
 *   - `empty`  — value === null
 *   - `ok`     — |Δ_rel| ≤ tolerance × 0.4 (≤ 2% при default 5%)
 *   - `close`  — tolerance × 0.4 < |Δ_rel| ≤ tolerance
 *   - `wrong`  — |Δ_rel| > tolerance, либо expected не определён
 *
 * Если expected ≈ 0 (по модулю меньше 1e-9) — сравниваем по абсолютной
 * погрешности с tolerance × 0.001 (защита от деления на ~0).
 */
export function verifyDerivedValue(
  spec: ColumnSpec,
  row: JournalRow,
  value: number | null,
): JournalVerdict {
  if (value === null) return 'empty';
  if (!Number.isFinite(value)) return 'empty';
  if (spec.source !== 'derived') return 'wrong';
  if (typeof spec.expectedFromRow !== 'function') return 'wrong';

  // Собираем числовой контекст из row.values (только числа).
  const context: Record<string, number> = {};
  for (const [k, v] of Object.entries(row.values)) {
    if (typeof v === 'number' && Number.isFinite(v)) context[k] = v;
  }

  let expected: number;
  try {
    expected = spec.expectedFromRow(context);
  } catch {
    return 'wrong';
  }
  if (!Number.isFinite(expected)) return 'wrong';

  const tolerance = spec.tolerance ?? DEFAULT_TOLERANCE;
  if (Math.abs(expected) < 1e-9) {
    // Защита от деления на 0: проверка по абсолютной погрешности.
    const absTol = tolerance * 0.001;
    return Math.abs(value) <= absTol ? 'ok' : 'wrong';
  }
  const relError = Math.abs(value - expected) / Math.abs(expected);
  if (relError <= tolerance * OK_TOLERANCE_RATIO) return 'ok';
  if (relError <= tolerance) return 'close';
  return 'wrong';
}

/**
 * Грейд категориального (choice) значения: точное совпадение с эталоном.
 *   - `empty`  — value === null или ''
 *   - `ok`     — value === expectedChoiceFromRow(context)
 *   - `wrong`  — иначе, либо expected не определён
 */
export function verifyChoiceValue(
  spec: ColumnSpec,
  row: JournalRow,
  value: string | null,
): JournalVerdict {
  if (value === null || value === '') return 'empty';
  if (spec.source !== 'choice') return 'wrong';
  if (typeof spec.expectedChoiceFromRow !== 'function') return 'wrong';

  const context: Record<string, number> = {};
  for (const [k, v] of Object.entries(row.values)) {
    if (typeof v === 'number' && Number.isFinite(v)) context[k] = v;
  }
  let expected: string;
  try {
    expected = spec.expectedChoiceFromRow(context);
  } catch {
    return 'wrong';
  }
  return value === expected ? 'ok' : 'wrong';
}

/**
 * Полная проверка строки — возвращает verdicts по всем derived/choice-колонкам.
 * Если value не введено — `'empty'`.
 */
export function verifyRow(
  columns: ReadonlyArray<ColumnSpec>,
  row: JournalRow,
): Record<string, JournalVerdict> {
  const verdicts: Record<string, JournalVerdict> = {};
  for (const col of columns) {
    if (col.source === 'derived') {
      const v = row.values[col.key];
      const num = typeof v === 'number' ? v : null;
      verdicts[col.key] = verifyDerivedValue(col, row, num);
    } else if (col.source === 'choice') {
      const v = row.values[col.key];
      const str = typeof v === 'string' ? v : null;
      verdicts[col.key] = verifyChoiceValue(col, row, str);
    }
  }
  return verdicts;
}

/** Все ли derived-проверки в ok? Используется для финального verdict строки. */
export function rowVerdictAggregate(verdicts: Record<string, JournalVerdict>): JournalVerdict {
  const values = Object.values(verdicts);
  if (values.length === 0) return 'empty';
  if (values.every((v) => v === 'ok')) return 'ok';
  if (values.some((v) => v === 'wrong')) return 'wrong';
  if (values.some((v) => v === 'empty')) return 'empty';
  return 'close';
}
