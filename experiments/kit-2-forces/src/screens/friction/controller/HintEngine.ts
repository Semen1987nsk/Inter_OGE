/**
 * HintEngine — пошаговые подсказки в hint-bar по текущему состоянию опыта 2.2 «Трение».
 *
 * Подсказки зависят и от стадии сборки, и от выбранной задачи (A/B/C/D).
 * Вызывается оркестратором при каждом изменении state:
 *   hintEngine.update(state)
 * А также для коротких флеш-сообщений:
 *   hintEngine.flash('Поднесите ближе к крюку.')
 *
 * Дублирует подсказки через aria-live region.
 */

import type { FrictionSetupState } from '@/types/friction/setup';

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

  update(state: Readonly<FrictionSetupState>): void {
    if (this.#flashing) return;
    const text = this.#hintForState(state);
    if (text === this.#hintEl.textContent) return;
    this.#hintEl.textContent = text;
  }

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

  #hintForState(s: FrictionSetupState): string {
    if (s.block === null) {
      return 'Возьмите деревянный брусок из правой панели и поставьте на направляющую.';
    }
    if (s.dynamometer === null) {
      // Брусок есть, динамометра нет
      switch (s.activeTask) {
        case 'A-coefficient':
        case 'B-work':
          return 'Прицепите динамометр (5Н) к крючку бруска слева — будем измерять силу трения.';
        case 'C-force-vs-N':
          return 'Положите 1-й груз на брусок, затем прицепите динамометр.';
        case 'D-force-vs-surface':
          return 'Прицепите динамометр и проведите измерение для текущей поверхности.';
      }
    }
    // Динамометр прицеплен — фаза измерения
    switch (s.measurementStep) {
      case 'awaiting-pull':
        return 'Тяните за корпус динамометра вправо — равномерно, до начала скольжения.';
      case 'pulling-static':
        return 'Брусок ещё держит покой — увеличивайте силу плавно.';
      case 'sliding':
        return 'Скольжение пошло! Удерживайте равномерное движение и зафиксируйте показание.';
      case 'ready-to-record':
        return 'Хорошо. Нажмите «Записать в журнал» для фиксации измерения.';
      case 'recorded': {
        if (s.activeTask === 'C-force-vs-N') {
          return 'Запись сохранена. Добавьте ещё груз — снимите следующую точку для графика.';
        }
        if (s.activeTask === 'D-force-vs-surface') {
          return 'Запись сохранена. Переключите поверхность (А/Б) и повторите измерение.';
        }
        return 'Запись сохранена. Можно добавить груз и повторить, либо «Сбросить».';
      }
    }
    return 'Соберите установку и начните измерение.';
  }
}
