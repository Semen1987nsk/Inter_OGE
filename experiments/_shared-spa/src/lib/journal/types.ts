/**
 * Типы единого «Журнала измерений» — §21 REFERENCE.md.
 *
 * Используется во всех опытах Inter_OGE (1.1, 1.2, 2.1, 2.2, и далее).
 * Контракт колонок: каждая имеет тип `source ∈ {meta|direct|derived}`,
 * где:
 *   - `meta`    — контекст (№, цилиндр, поверхность); пишет программа.
 *   - `direct`  — показание прибора (m, V₁, P_возд...); пишет программа
 *                 в semi-auto/fully-auto, либо ученик сам — в fully-manual.
 *   - `derived` — расчётная величина (V, ρ, F_A, k, μ); ученик вводит
 *                 в semi-auto/fully-manual + ✓ проверка с tolerance,
 *                 программа считает в fully-auto.
 *
 * См. §21.A.3 — контракт колонок.
 */

export type ColumnSource = 'meta' | 'direct' | 'derived';

export type ColumnFormat = 'int' | 'fixed1' | 'fixed2' | 'fixed3' | 'percent';

/**
 * Спецификация одной колонки журнала.
 */
export interface ColumnSpec {
  /** Уникальный ключ внутри spec'а (используется в `JournalRow.values`). */
  readonly key: string;
  /** Заголовок колонки (HTML без тегов, можно с Unicode подстрочными). */
  readonly label: string;
  /** Тип источника значения. */
  readonly source: ColumnSource;
  /** Единица измерения для подсказки (опционально). */
  readonly unit?: string;
  /** Форматирование при выводе в таблицу. По умолчанию `fixed2`. */
  readonly format?: ColumnFormat;
  /**
   * Только для `derived`: функция вычисления эталонного значения по уже
   * заполненным полям строки. Tolerance применяется к результату.
   */
  readonly expectedFromRow?: (row: Readonly<Record<string, number>>) => number;
  /**
   * Только для `derived`: tolerance ratio (default 0.05 = 5%).
   * Если указано — verdict считается так:
   *   |Δ| ≤ tolerance/2.5 → 'ok' (зелёный)
   *   |Δ| ≤ tolerance     → 'close' (жёлтый)
   *   иначе              → 'wrong' (красный)
   */
  readonly tolerance?: number;
  /** Aria-label для cell (если стандартный label не подходит). */
  readonly ariaLabel?: string;
}

/** Спецификация журнала одного опыта. */
export interface JournalSpec {
  /** ID опыта по ФИПИ-нумерации. */
  readonly experimentId: '1.1' | '1.2' | '2.1' | '2.2';
  /** Кит, в котором живёт опыт. */
  readonly kitId: 'kit-1' | 'kit-2';
  /** Колонки журнала в порядке отображения слева направо. */
  readonly columns: ReadonlyArray<ColumnSpec>;
}

/**
 * Одна строка журнала. Хранит сырые значения по `key` колонки;
 * `null` означает «пусто» (ещё не заполнено учеником).
 */
export interface JournalRow {
  /** Идентификатор строки — порядковый номер с 1. */
  readonly idx: number;
  /** Метка времени создания. Используется для update/remove handle. */
  readonly timestamp: number;
  /**
   * Значения колонок. Для meta/direct заполняется программой;
   * для derived в semi-auto/fully-manual может быть `null` до ввода.
   */
  values: Record<string, number | string | null>;
  /**
   * Verdict-state по каждому derived-ключу. `undefined` = ещё не проверено.
   * Заполняется при `verifyDerivedValue`.
   */
  verdicts?: Record<string, JournalVerdict>;
}

/** Результат проверки введённого значения relative to expected. */
export type JournalVerdict = 'ok' | 'close' | 'wrong' | 'empty';

/**
 * Режимы записи в журнал — расширенная версия `RecordMode` из record-mode.ts.
 * См. §21.A.2.
 */
export type JournalMode = 'semi-auto' | 'fully-manual' | 'fully-auto';
