/**
 * undo.ts — простой LIFO-стек обратимых действий для timed-undo через тосты.
 *
 * Контракт по research §3 «Just Undo It» (CHI 2024):
 *   1. Деструктивное действие выполняется НЕМЕДЛЕННО (без confirm-modal).
 *   2. Параллельно появляется тост «Действие выполнено. Отменить (5с)».
 *   3. Если в течение 5с пользователь нажал «Отменить» — вызываем action.undo().
 *   4. Иначе — тост уходит, действие остаётся.
 *
 * Этот модуль — pure (без DOM, без таймеров, без событий). Он только хранит
 * последовательность действий и умеет откатывать последнее. UI-связку
 * (создание тоста, таймер, привязку «Отменить» → undo()) делает оркестратор
 * или связующий хелпер из самого опыта.
 *
 * Дизайн:
 *   - LIFO: undo() всегда снимает top (последнее push).
 *   - maxDepth: при переполнении — drop старейшего (FIFO с конца).
 *   - peek(id?): для запросов вида «отменить только если top == этот id».
 *   - clear(): полная очистка (например, при reset опыта).
 */

export interface UndoableAction {
  /**
   * `do` — что было выполнено. Стек НЕ вызывает его — действие уже сделано
   * к моменту push(). Поле существует, чтобы:
   *   - оркестратор мог reuse для redo (в будущем),
   *   - тесты могли видеть «парную» функцию,
   *   - семантика была явной.
   */
  readonly do: () => void;
  /** Что вызвать при откате. Стек вызывает это в undo(). */
  readonly undo: () => void;
  /** Опциональный лейбл для UI (например, текст тоста). */
  readonly label?: string;
  /**
   * Опциональный id для group-undo / селективного отката.
   * Пример: 'journal-row-add', 'reset-experiment'. peek('journal-row-add')
   * вернёт top, только если он этого типа.
   */
  readonly id?: string;
}

const DEFAULT_MAX_DEPTH = 10;

export class UndoStack {
  #stack: UndoableAction[] = [];
  readonly #maxDepth: number;

  constructor(maxDepth: number = DEFAULT_MAX_DEPTH) {
    if (!Number.isFinite(maxDepth) || maxDepth < 1) {
      throw new RangeError(`maxDepth must be a finite positive integer, got ${maxDepth}`);
    }
    this.#maxDepth = Math.floor(maxDepth);
  }

  /**
   * Положить действие в стек. Если глубина превышает maxDepth — старейшее
   * (нижнее) действие выпадает безвозвратно, без вызова его undo() — оно
   * считается «уже принятым» (5-секундное окно для него истекло до этого).
   */
  push(action: UndoableAction): void {
    this.#stack.push(action);
    while (this.#stack.length > this.#maxDepth) {
      this.#stack.shift();
    }
  }

  /**
   * Снять и откатить последнее действие. Возвращает снятый action для того,
   * чтобы оркестратор мог, например, дополнительно показать toast «Отменено».
   * Если стек пуст — возвращает null, не бросает.
   */
  undo(): UndoableAction | null {
    const action = this.#stack.pop();
    if (!action) return null;
    action.undo();
    return action;
  }

  /** Размер стека. */
  size(): number {
    return this.#stack.length;
  }

  /** Полная очистка без вызова undo(). Используется при reset опыта. */
  clear(): void {
    this.#stack.length = 0;
  }

  /**
   * Посмотреть top без снятия.
   *   - peek() — последний (top) action или null.
   *   - peek(id) — top, если он того id; иначе null.
   *
   * Полезно для timed-undo: «отменить только если последнее действие — это
   * именно то, что я ожидаю» (защита от race с другими действиями).
   */
  peek(id?: string): UndoableAction | null {
    const top = this.#stack[this.#stack.length - 1];
    if (!top) return null;
    if (id !== undefined && top.id !== id) return null;
    return top;
  }
}
