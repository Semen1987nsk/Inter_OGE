/**
 * Router — простой URL-роутер для SPA-кита, формат `?screen=<id>`.
 *
 * Generic по `TId` — кит определяет свой union ScreenId.
 *
 * Почему query, а не hash: PhET использует query (`?screens=1,2`) — это лучше
 * работает с аналитикой и share-ссылками. На popstate перечитывает URL.
 *
 * `replaceState` (не push) — back-кнопка возвращает в каталог комплектов,
 * а не на предыдущий экран.
 */

const QUERY_KEY = 'screen';

export class Router<TId extends string = string> {
  #onChange: (id: TId | null) => void;
  #valid: ReadonlySet<TId>;

  constructor(validIds: ReadonlyArray<TId>, onChange: (id: TId | null) => void) {
    this.#valid = new Set(validIds);
    this.#onChange = onChange;
    window.addEventListener('popstate', this.#handlePopstate);
  }

  start(): void {
    this.#fire(this.read());
  }

  destroy(): void {
    window.removeEventListener('popstate', this.#handlePopstate);
  }

  /** Прочитать текущий screenId из URL (или null если не указан/невалиден). */
  read(): TId | null {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(QUERY_KEY);
    if (raw && this.#valid.has(raw as TId)) return raw as TId;
    return null;
  }

  /** Изменить screenId в URL без push в history. */
  navigate(id: TId): void {
    if (!this.#valid.has(id)) {
      throw new RangeError(`Router.navigate: неизвестный screenId «${id}»`);
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get(QUERY_KEY) === id) return;
    params.set(QUERY_KEY, id);
    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState({ screen: id }, '', newUrl);
    this.#fire(id);
  }

  #fire(id: TId | null): void {
    this.#onChange(id);
  }

  #handlePopstate = (): void => {
    this.#fire(this.read());
  };
}
