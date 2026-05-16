/**
 * KitShell — оркестратор комплекта (SPA-кит).
 *
 * Generic по `TId` — кит передаёт свой union ScreenId для type-safety.
 *
 * Держит реестр экранов, mount/unmount при смене активного, persist через
 * localStorage. Между экранами никакой shared state — это сознательно
 * (PhET так и делает: каждый screen = независимая модель).
 *
 * Жизненный цикл:
 *   1. constructor: получает список экранов, host-контейнер, defaultId, storagePrefix.
 *   2. start(): читает URL → определяет initial screenId → mount.
 *   3. при клике на bottom-nav → navigate(id) → unmount old + mount new.
 *   4. window.beforeunload → save state текущего экрана.
 *
 * Persist: ключ = `<storagePrefix>:<id>`. Snapshot — то что вернул
 * `screen.saveState()`. Восстанавливается ОДИН раз после mount.
 */

import type { IScreen } from './IScreen';
import { Router } from './Router';

export class KitShell<TId extends string = string> {
  #host: HTMLElement;
  #screens: Map<TId, IScreen<TId>>;
  #router: Router<TId>;
  #activeId: TId | null = null;
  #defaultId: TId;
  #storagePrefix: string;
  #onScreenChanged: ((id: TId) => void) | null = null;

  constructor(
    host: HTMLElement,
    screens: ReadonlyArray<IScreen<TId>>,
    defaultId: TId,
    storagePrefix: string,
  ) {
    this.#host = host;
    this.#storagePrefix = storagePrefix;
    this.#screens = new Map();
    for (const s of screens) this.#screens.set(s.meta.id, s);
    if (!this.#screens.has(defaultId)) {
      throw new RangeError(`KitShell: defaultId «${defaultId}» не найден в реестре экранов`);
    }
    this.#defaultId = defaultId;
    const ids = screens.map((s) => s.meta.id);
    this.#router = new Router<TId>(ids, (id) => {
      const target = id ?? this.#defaultId;
      void this.#switchTo(target);
    });
  }

  /** Подписка на смену экрана — для подсветки кнопки в lab-kit-nav. */
  onScreenChanged(cb: (id: TId) => void): void {
    this.#onScreenChanged = cb;
  }

  /** Текущий активный экран (после start). */
  get activeId(): TId | null {
    return this.#activeId;
  }

  /** Список всех экранов в порядке регистрации. */
  get screens(): ReadonlyArray<IScreen<TId>> {
    return [...this.#screens.values()];
  }

  /** Стартует shell: читает URL, монтирует initial screen. */
  start(): void {
    window.addEventListener('beforeunload', this.#handleBeforeUnload);
    this.#router.start();
  }

  /** Программно переключиться на экран. */
  navigate(id: TId): void {
    this.#router.navigate(id);
  }

  /** Размонтировать shell, очистить listeners. */
  destroy(): void {
    window.removeEventListener('beforeunload', this.#handleBeforeUnload);
    this.#router.destroy();
    if (this.#activeId) {
      const screen = this.#screens.get(this.#activeId);
      if (screen) {
        this.#saveScreenState(screen);
        void screen.unmount();
      }
    }
    this.#activeId = null;
  }

  async #switchTo(id: TId): Promise<void> {
    if (this.#activeId === id) return;
    const next = this.#screens.get(id);
    if (!next) {
      void this.#switchTo(this.#defaultId);
      return;
    }

    if (this.#activeId) {
      const prev = this.#screens.get(this.#activeId);
      if (prev) {
        this.#saveScreenState(prev);
        try {
          await prev.unmount();
        } catch (e) {
          console.error('KitShell: unmount failed', e);
        }
      }
    }

    this.#host.replaceChildren();
    try {
      await next.mount(this.#host);
    } catch (e) {
      console.error('KitShell: mount failed', e);
      return;
    }

    this.#loadScreenState(next);

    this.#activeId = id;
    this.#onScreenChanged?.(id);
  }

  #saveScreenState(screen: IScreen<TId>): void {
    if (typeof screen.saveState !== 'function') return;
    try {
      const snapshot = screen.saveState();
      const key = `${this.#storagePrefix}:${screen.meta.id}`;
      if (snapshot === undefined || snapshot === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(snapshot));
      }
    } catch (e) {
      console.warn('KitShell: saveState failed', e);
    }
  }

  #loadScreenState(screen: IScreen<TId>): void {
    if (typeof screen.loadState !== 'function') return;
    try {
      const raw = localStorage.getItem(`${this.#storagePrefix}:${screen.meta.id}`);
      if (!raw) return;
      const snapshot = JSON.parse(raw);
      screen.loadState(snapshot);
    } catch (e) {
      console.warn('KitShell: loadState failed', e);
    }
  }

  #handleBeforeUnload = (): void => {
    if (!this.#activeId) return;
    const screen = this.#screens.get(this.#activeId);
    if (screen) this.#saveScreenState(screen);
  };
}
