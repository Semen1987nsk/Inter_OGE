/**
 * Минимальный реактивный Store для опыта.
 *
 * - immutable state
 * - subscribe/unsubscribe для слушателей
 * - patch через `set(partial)`
 */

export class Store<T extends object> {
  #state: T;
  #listeners = new Set<(state: Readonly<T>) => void>();

  constructor(initialState: T) {
    this.#state = initialState;
  }

  get(): Readonly<T> {
    return this.#state;
  }

  set(patch: Partial<T>): void {
    this.#state = { ...this.#state, ...patch };
    this.#notify();
  }

  /** Аналог set, но с функцией-апдейтером. */
  update(fn: (state: Readonly<T>) => Partial<T>): void {
    const patch = fn(this.#state);
    this.set(patch);
  }

  subscribe(fn: (state: Readonly<T>) => void): () => void {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  #notify(): void {
    for (const fn of this.#listeners) fn(this.#state);
  }
}
