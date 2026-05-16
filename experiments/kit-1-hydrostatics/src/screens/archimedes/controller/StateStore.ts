/**
 * StateStore — persistence-слой для опыта 1.2 (auto-save в localStorage).
 *
 * Спека §4 + research §3 (auto-save 5с throttle, expire 1ч, restore-toast).
 *
 * Формат хранилища:
 *   key: 'kit-1:archimedes:state'
 *   value: JSON { version, savedAt, payload }
 *
 * Logic:
 *   - save(payload) — throttle 5с (по умолчанию). Через requestIdleCallback,
 *     если доступен; иначе через setTimeout. saveImmediate(payload) пишет
 *     сразу, без throttle (для commit/reset).
 *   - load() возвращает payload, если timestamp ≤ ttlMs; иначе null + clear().
 *   - clear() — выкидывает запись.
 *
 * Обработка ошибок:
 *   - JSON.parse ошибся / структура битая / version другой — silent clear,
 *     возвращаем null (не падаем UI).
 *   - localStorage недоступен (SSR, Safari private mode) — все операции no-op,
 *     возвращают null.
 *
 * Pure-модуль: без DOM, без Store-зависимостей. Его API — read/write JSON.
 */

const STORAGE_KEY = 'kit-1:archimedes:state';
const STORAGE_VERSION = 1;
const DEFAULT_THROTTLE_MS = 5000;
/** Stale если старше 1 часа — в спеке §4 «не интересно — очистить». */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

export interface PersistedRecord<T> {
  version: number;
  savedAt: number;
  payload: T;
}

export interface StateStoreConfig {
  throttleMs: number;
  ttlMs: number;
  /** Override storage для тестов. По умолчанию globalThis.localStorage. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  /** Override now() для тестов. */
  now?: () => number;
}

const DEFAULTS: Omit<StateStoreConfig, 'storage' | 'now'> = {
  throttleMs: DEFAULT_THROTTLE_MS,
  ttlMs: DEFAULT_TTL_MS,
};

type Schedule = (cb: () => void, delayMs: number) => () => void;

function defaultSchedule(): Schedule {
  return (cb, delayMs) => {
    const tid = setTimeout(cb, delayMs);
    return () => clearTimeout(tid);
  };
}

function getDefaultStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    if (!ls) return null;
    return ls;
  } catch {
    return null;
  }
}

export class StateStore<T> {
  readonly #throttleMs: number;
  readonly #ttlMs: number;
  readonly #storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  readonly #now: () => number;
  readonly #schedule: Schedule;

  /** Cancel-функция для отложенной save-задачи (если запланирована). */
  #pendingCancel: (() => void) | null = null;
  /** Последний payload, который должен быть записан при flush. */
  #pendingPayload: T | null = null;
  /** Когда ВПЕРВЫЕ был запланирован текущий throttle-цикл. */
  #pendingScheduledAt = 0;

  constructor(config: Partial<StateStoreConfig> = {}) {
    this.#throttleMs =
      typeof config.throttleMs === 'number' && config.throttleMs >= 0
        ? config.throttleMs
        : DEFAULTS.throttleMs;
    this.#ttlMs =
      typeof config.ttlMs === 'number' && config.ttlMs >= 0
        ? config.ttlMs
        : DEFAULTS.ttlMs;
    this.#storage = config.storage ?? getDefaultStorage();
    this.#now = config.now ?? (() => Date.now());
    this.#schedule = defaultSchedule();
  }

  // ─── Public API ─────────────────────────────────────────────────────

  /**
   * Записать payload через throttle. Если в течение throttleMs придёт ещё
   * один save — он перепишет pendingPayload, но flush останется на старое
   * время (классический throttle-leading: первая запись задаёт окно).
   */
  save(payload: T): void {
    if (!this.#storage) return;
    this.#pendingPayload = payload;
    if (this.#pendingCancel) {
      // Уже запланировано — payload обновлён, время flush не двигаем.
      return;
    }
    this.#pendingScheduledAt = this.#now();
    const delay = this.#throttleMs;
    this.#pendingCancel = this.#schedule(() => {
      this.#pendingCancel = null;
      const p = this.#pendingPayload;
      this.#pendingPayload = null;
      if (p === null) return;
      this.#writeNow(p);
    }, delay);
  }

  /**
   * Сразу записать payload, отменив pending throttle-таску. Используется при
   * commit в журнал и при reset (по research §3 — критичные точки сохраняем
   * без задержки).
   */
  saveImmediate(payload: T): void {
    if (!this.#storage) return;
    if (this.#pendingCancel) {
      this.#pendingCancel();
      this.#pendingCancel = null;
    }
    this.#pendingPayload = null;
    this.#writeNow(payload);
  }

  /**
   * Прочитать сохранённый payload. Возвращает:
   *   - { payload, ageMs } — если запись свежая (≤ ttlMs).
   *   - null — если записи нет / она битая / просрочена.
   *
   * Просроченные записи очищаются автоматически.
   */
  load(): { payload: T; ageMs: number; savedAt: number } | null {
    if (!this.#storage) return null;
    let raw: string | null;
    try {
      raw = this.#storage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.clear();
      return null;
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as PersistedRecord<unknown>).version !== 'number' ||
      typeof (parsed as PersistedRecord<unknown>).savedAt !== 'number' ||
      !('payload' in parsed)
    ) {
      this.clear();
      return null;
    }
    const rec = parsed as PersistedRecord<T>;
    if (rec.version !== STORAGE_VERSION) {
      this.clear();
      return null;
    }
    const age = this.#now() - rec.savedAt;
    if (age < 0 || age > this.#ttlMs) {
      this.clear();
      return null;
    }
    return { payload: rec.payload, ageMs: age, savedAt: rec.savedAt };
  }

  /** Очистить хранилище и отменить любые pending-сохранения. */
  clear(): void {
    if (this.#pendingCancel) {
      this.#pendingCancel();
      this.#pendingCancel = null;
    }
    this.#pendingPayload = null;
    if (!this.#storage) return;
    try {
      this.#storage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  /** Принудительно вытолкнуть pending-payload (если есть). Тесты + unmount. */
  flush(): void {
    if (!this.#pendingCancel || this.#pendingPayload === null) return;
    this.#pendingCancel();
    this.#pendingCancel = null;
    const p = this.#pendingPayload;
    this.#pendingPayload = null;
    this.#writeNow(p);
  }

  /** Признак есть ли pending-задача. Полезно для тестов. */
  hasPendingSave(): boolean {
    return this.#pendingCancel !== null;
  }

  /** Когда запланирован текущий flush (для отладки). */
  getPendingScheduledAt(): number {
    return this.#pendingScheduledAt;
  }

  // ─── Внутреннее ──────────────────────────────────────────────────────

  #writeNow(payload: T): void {
    if (!this.#storage) return;
    const record: PersistedRecord<T> = {
      version: STORAGE_VERSION,
      savedAt: this.#now(),
      payload,
    };
    let json: string;
    try {
      json = JSON.stringify(record);
    } catch {
      return;
    }
    try {
      this.#storage.setItem(STORAGE_KEY, json);
    } catch {
      // QuotaExceeded / disabled storage — silently ignore.
    }
  }
}

export { STORAGE_KEY as ARCHIMEDES_STORAGE_KEY };
