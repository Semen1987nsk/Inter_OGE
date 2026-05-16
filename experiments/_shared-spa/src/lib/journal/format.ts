/**
 * Форматирование чисел для журнала — RU-стандарт (запятая как разделитель).
 *
 * Используется shared `renderJournalTable` для всех опытов Inter_OGE.
 * Один источник правды — никакого `.toFixed(2)` в оркестраторах.
 */

import type { ColumnFormat } from './types';

/** Форматирует число под формат колонки. `null` → '—'. */
export function formatRu(value: number | string | null, format: ColumnFormat = 'fixed2'): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '—';
  let s: string;
  switch (format) {
    case 'int':
      s = Math.round(value).toString();
      break;
    case 'fixed1':
      s = value.toFixed(1);
      break;
    case 'fixed2':
      s = value.toFixed(2);
      break;
    case 'fixed3':
      s = value.toFixed(3);
      break;
    case 'percent':
      // Уже считаем что value ∈ [-100..100] (процент), отображаем с 1 знаком.
      s = value.toFixed(1) + '%';
      break;
  }
  return s.replace('.', ',');
}

/** Парсит RU-число из ввода (запятая или точка). Возвращает `null` если не число. */
export function parseRu(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim();
  if (trimmed === '' || trimmed === '—') return null;
  const normalized = trimmed.replace(',', '.').replace(/\s+/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
