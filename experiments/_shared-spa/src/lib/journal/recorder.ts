/**
 * recorder — фабрика-coordinator для единой UI-механики журнала и
 * pending-плашки во всех опытах Inter_OGE.
 * §21.B.3 REFERENCE.md (UX-v2).
 *
 * Тонкая прослойка между Experiment-классом и shared render/pending:
 *   - НЕ хранит state журнала (rows живут в Experiment'е).
 *   - НЕ решает «когда записать» — это вызывает Experiment.
 *   - Рендерит таблицу и pending-плашку, обрабатывает события UI.
 *
 * Использование:
 *
 * ```ts
 * const recorder = createRecorder({
 *   spec: DENSITY_SPEC,
 *   journalHost: this.#refs.journalHost,
 *   pendingHost: findPendingHost(),
 *   getMode: () => getRecordMode('kit-1'),
 *   getRows: () => this.#mapMeasurementsToRows(this.#state),
 *   isReady: () => isReadyToRecord(this.#state),
 *   buildSignature: () => `${cyl.id}|${V1_ml}`,
 *   buildSummary: () => `${cyl.label}: m=${m} г, V₁=${V1} мл`,
 *   onPendingClick: () => this.#commitMeasurement(),
 *   onCellInput: (idx, key, v) => this.#handleCellInput(idx, key, v),
 *   onVerify: (idx) => this.#handleVerify(idx),
 * });
 *
 * // в #render(state):
 * recorder.render();
 *
 * // после успешного commit'а:
 * recorder.markRecorded(signature);
 * ```
 */

import { renderJournalTable, type RenderJournalOptions } from './render';
import { renderPending, attachPendingClick, type PendingHost } from './pending';
import type { JournalMode, JournalRow, JournalSpec } from './types';

export interface RecorderRefs {
  /** Spec колонок (DENSITY_SPEC, ARCHIMEDES_SPEC, и т.д.). */
  readonly spec: JournalSpec;
  /** `<div id="journal-host">` — куда рендерим таблицу. */
  readonly journalHost: HTMLElement;
  /** Pending-плашка (опционально — может не быть в legacy опытах). */
  readonly pendingHost?: PendingHost | null;
  /** Текущий режим записи. Recorder перечитывает на каждом render(). */
  getMode(): JournalMode;
  /** Текущий список строк журнала (Experiment управляет ими). */
  getRows(): ReadonlyArray<JournalRow>;
  /** Опыт готов к записи (все приборы установлены, измерение получено). */
  isReady(): boolean;
  /**
   * Уникальный хэш текущего измерения. Если пустая строка — измерение
   * ещё не «состоялось» (не показываем плашку даже при ready).
   */
  buildSignature(): string;
  /** Краткое описание для pending-плашки. */
  buildSummary(): string;
  /** Клик на «Записать в журнал» (semi-auto). */
  onPendingClick(): void;
  /** Изменение значения в input ячейки. */
  onCellInput(rowIdx: number, key: string, value: number | null): void;
  /** Клик на ✓ в строке (semi-auto only). */
  onVerify(rowIdx: number): void;
  /** Опционально: двойной клик по строке → правка. */
  onEdit?(rowIdx: number): void;
  /** Опционально: удалить строку. */
  onDelete?(rowIdx: number): void;
  /**
   * S5: Выбор категории в choice-колонке.
   * Без этого поля категориальные киты (4.4 и будущие) молча не получают выбор через recorder.
   */
  onChoiceInput?(rowIdx: number, key: string, value: string | null): void;
  /** Текущая редактируемая строка (для editing-mode). */
  editingRowIdx?(): number | null;
}

export interface Recorder {
  /** Перерисовать журнал и pending-плашку. Идемпотентно. */
  render(): void;
  /**
   * Зафиксировать сигнатуру последнего записанного измерения, чтобы
   * pending-плашка не показывалась повторно для того же измерения.
   */
  markRecorded(signature: string): void;
  /** Сброс recorder'а при reset() опыта. */
  reset(): void;
  /** Cleanup в destroy() Experiment'а. */
  destroy(): void;
}

export function createRecorder(refs: RecorderRefs): Recorder {
  let lastRecordedSignature: string | null = null;

  const detachClick = refs.pendingHost
    ? attachPendingClick(refs.pendingHost, () => refs.onPendingClick())
    : (): void => {};

  function render(): void {
    const mode = refs.getMode();
    const rows = refs.getRows();

    const opts: RenderJournalOptions = {
      mode,
      editingRowIdx: refs.editingRowIdx?.() ?? null,
      onCellInput: refs.onCellInput,
      onVerify: refs.onVerify,
      ...(refs.onEdit ? { onEdit: refs.onEdit } : {}),
      ...(refs.onDelete ? { onDelete: refs.onDelete } : {}),
      // S5: пробрасываем onChoiceInput если передан — иначе choice-колонки молча немы.
      ...(refs.onChoiceInput ? { onChoiceInput: refs.onChoiceInput } : {}),
    };
    renderJournalTable(refs.journalHost, refs.spec, rows, opts);

    if (refs.pendingHost) {
      renderPending(refs.pendingHost, {
        mode,
        ready: refs.isReady(),
        signature: refs.buildSignature(),
        lastRecordedSignature,
        summary: refs.buildSummary(),
      });
    }
  }

  function markRecorded(signature: string): void {
    lastRecordedSignature = signature;
  }

  function reset(): void {
    lastRecordedSignature = null;
  }

  function destroy(): void {
    detachClick();
  }

  return { render, markRecorded, reset, destroy };
}
