/**
 * pending — общий хелпер для pending-плашки «Записать в журнал».
 * §21.B.2 REFERENCE.md (UX-v2).
 *
 * Плашка показывается ТОЛЬКО в режиме `semi-auto`, когда:
 *   - `ready === true` (опыт готов к записи) И
 *   - `signature !== lastRecordedSignature` (защита от повторных записей
 *     одного измерения)
 *
 * В `fully-manual` запись идёт через автоматическое появление пустой
 * строки в журнале при ready+stable — плашка не нужна.
 * В `fully-auto` запись срабатывает молча.
 *
 * Использование:
 *
 * ```ts
 * import { renderPending, attachPendingClick } from '@labosfera/shared-spa/lib/journal/pending';
 *
 * const detach = attachPendingClick(host, () => recorder.commit());
 * // …
 * renderPending(host, { mode, ready, signature, lastRecordedSignature, summary });
 * // при destroy:
 * detach();
 * ```
 */

import type { JournalMode } from './types';

export interface PendingHost {
  /** Контейнер с pending-плашкой. Имеет атрибут `hidden` для скрытия. */
  readonly slot: HTMLElement;
  /** Текстовый узел с описанием измерения («m = 12.5 г, V₁ = 50 мл, …»). */
  readonly summary: HTMLElement;
  /** Кнопка «Записать в журнал». */
  readonly button: HTMLButtonElement;
}

export interface PendingRenderState {
  /** Текущий режим записи. */
  readonly mode: JournalMode;
  /** Опыт готов к записи (все приборы установлены, измерение получено). */
  readonly ready: boolean;
  /** Уникальный хэш текущего измерения. Используется для дедупликации. */
  readonly signature: string;
  /** Хэш последнего записанного измерения. */
  readonly lastRecordedSignature: string | null;
  /** Краткое описание измерения для показа в кнопке. */
  readonly summary: string;
}

/**
 * Обновляет видимость и текст pending-плашки. Идемпотентно.
 *
 * Возвращает `true` если плашка показана, `false` если скрыта.
 */
export function renderPending(host: PendingHost, state: PendingRenderState): boolean {
  const shouldShow =
    state.mode === 'semi-auto' &&
    state.ready &&
    state.signature !== '' &&
    state.signature !== state.lastRecordedSignature;

  host.slot.hidden = !shouldShow;
  if (!shouldShow) return false;

  if (host.summary.textContent !== state.summary) {
    host.summary.textContent = state.summary;
  }
  const ariaLabel = `Записать в журнал: ${state.summary}`;
  if (host.button.getAttribute('aria-label') !== ariaLabel) {
    host.button.setAttribute('aria-label', ariaLabel);
  }
  return true;
}

/**
 * Подключает обработчик клика на кнопке pending-плашки. Возвращает
 * функцию-detach для cleanup в destroy().
 *
 * Игнорирует двойные клики (300ms debounce) — защита от случайного
 * двойного нажатия → две записи одного измерения.
 */
export function attachPendingClick(
  host: PendingHost,
  onCommit: () => void,
): () => void {
  let lastClickTs = 0;
  const handler = (ev: MouseEvent): void => {
    ev.preventDefault();
    const now = Date.now();
    if (now - lastClickTs < 300) return;
    lastClickTs = now;
    onCommit();
  };
  host.button.addEventListener('click', handler);
  return () => {
    host.button.removeEventListener('click', handler);
  };
}

/**
 * Хелпер для получения PendingHost из DOM по стандартным ID
 * (`#record-pending-slot`, `#record-pending-summary`, `#record-pending-btn`).
 *
 * Возвращает `null` если структура неполная (например, опыт ещё не
 * мигрирован под §21.A.3).
 */
export function findPendingHost(root: Document | HTMLElement = document): PendingHost | null {
  const slot = root.querySelector<HTMLElement>('#record-pending-slot');
  const summary = root.querySelector<HTMLElement>('#record-pending-summary');
  const button = root.querySelector<HTMLButtonElement>('#record-pending-btn');
  if (!slot || !summary || !button) return null;
  return { slot, summary, button };
}
