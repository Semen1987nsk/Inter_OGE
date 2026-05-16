/**
 * HintEngine — пошаговые подсказки в hint-bar по текущему состоянию опыта.
 *
 * Вызывается оркестратором при каждом изменении state:
 *   hintEngine.update(state)
 * А также для коротких флеш-сообщений:
 *   hintEngine.flash('Поднесите ближе к крюку.')
 *
 * Для a11y дублирует подсказки через aria-live region.
 */

import type { SpringSetupState } from '@/types/setup';

const FLASH_TIMEOUT_MS = 2400;

export class HintEngine {
  #hintEl: HTMLElement;
  #liveRegion: HTMLElement;
  #flashTimeout: ReturnType<typeof setTimeout> | null = null;
  #flashing = false;

  constructor(hintEl: HTMLElement, liveRegion: HTMLElement) {
    this.#hintEl = hintEl;
    this.#liveRegion = liveRegion;
  }

  /** Обновляет hint в зависимости от текущего state. */
  update(state: Readonly<SpringSetupState>): void {
    if (this.#flashing) return;
    const text = this.#hintForState(state);
    if (text === this.#hintEl.textContent) return;
    this.#hintEl.textContent = text;
  }

  /**
   * Показывает временную «вспышку» подсказки (например, при ошибке drag).
   * После таймаута возвращает обычную подсказку (нужно вызвать update снаружи).
   */
  flash(message: string): void {
    this.#flashing = true;
    this.#hintEl.textContent = message;
    this.#hintEl.setAttribute('data-flash', 'true');
    this.#liveRegion.textContent = message;
    if (this.#flashTimeout) clearTimeout(this.#flashTimeout);
    this.#flashTimeout = setTimeout(() => {
      this.#flashing = false;
      this.#hintEl.removeAttribute('data-flash');
    }, FLASH_TIMEOUT_MS);
  }

  #hintForState(s: SpringSetupState): string {
    // Сценарий «динамометр на штативе» — отдельная ветка: ученик взвешивает грузы,
    // без пружины и без расчёта жёсткости.
    if (s.spring === null && s.dynamometer?.attachedTo === 'stand') {
      if (s.weights.length === 0) {
        return 'Подвесьте груз на крюк динамометра — он покажет силу тяжести (вес).';
      }
      return 'Можно подвесить ещё груз или снять текущий, нажав ×.';
    }

    if (s.spring === null && s.dynamometer === null) {
      return 'Возьмите пружину или динамометр из правой панели и подвесьте на штатив.';
    }
    if (s.measurementStep === 'reading-l0') {
      return 'Кликните по делению шкалы напротив указателя пружины — это l₀ (без нагрузки).';
    }
    if (s.measurementStep === 'l0-recorded' && s.weights.length === 0) {
      return 'Положение l₀ записано. Подвесьте груз на крюк пружины.';
    }
    if (s.measurementStep === 'reading-l1') {
      return 'Дождитесь окончания колебаний и кликните по новому положению указателя.';
    }
    if (s.measurementStep === 'ready-to-record') {
      return 'Нажмите «Записать в журнал» для фиксации измерения.';
    }
    if (s.measurements.length === 1) {
      return 'Подвесьте ещё один груз для следующего измерения.';
    }
    if (s.measurements.length >= 2) {
      return 'Можно подвешивать дополнительные грузы или нажмите «Сбросить».';
    }
    return 'Соберите установку и проведите измерения.';
  }
}
