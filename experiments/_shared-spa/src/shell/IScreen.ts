/**
 * IScreen — единый контракт экрана комплекта (SPA-кит).
 *
 * Generic по `TId` — каждый кит определяет свой union ScreenId для type-safety.
 *
 * Каждый опыт имплементирует этот интерфейс. KitShell вызывает mount/unmount
 * по мере того, как ученик переключается между экранами через bottom navigation.
 *
 * Контракт:
 *   - id уникален и стабилен (используется в URL и localStorage).
 *   - label / icon / kicker идут в lab-kit-nav для рендера кнопки.
 *   - mount() возвращает promise, вставляет корень экрана в `host`. Идемпотентен.
 *   - unmount() очищает DOM, отменяет подписки/RAF/timer'ы. НЕ оставляет
 *     висящих listener'ов на window/document.
 *   - saveState() / loadState() — опциональны. KitShell persist'ит в localStorage.
 */

export interface ScreenMeta<TId extends string = string, TIcon extends string = string> {
  /** Стабильный id, попадает в URL: ?screen=<id>. */
  readonly id: TId;
  /** Полное название экрана (например, «Жёсткость пружины»). */
  readonly label: string;
  /** Короткий префикс — нумерация задачи в комплекте. */
  readonly kicker: string;
  /** Имя SVG-иконки для bottom nav (словарь иконок — у каждого кита свой). */
  readonly icon: TIcon;
  /** Краткое описание для tooltip кнопки nav. */
  readonly tooltip: string;
}

export interface IScreen<TId extends string = string, TIcon extends string = string> {
  readonly meta: ScreenMeta<TId, TIcon>;

  /** Смонтировать UI экрана в `host`. Идемпотентен. */
  mount(host: HTMLElement): Promise<void> | void;

  /** Размонтировать UI: очистить DOM, отменить RAF/timers/listeners. */
  unmount(): Promise<void> | void;

  /**
   * Опционально: вернуть JSON-сериализуемый snapshot для localStorage.
   * Возвращает null/undefined если состояние не нужно сохранять.
   */
  saveState?(): unknown;

  /**
   * Опционально: восстановить состояние из ранее сохранённого snapshot.
   * Вызывается ОДИН РАЗ после mount(), если в localStorage есть сохранение.
   */
  loadState?(snapshot: unknown): void;

  /** Опционально: сбросить экран к initial. */
  reset?(): void;
}
