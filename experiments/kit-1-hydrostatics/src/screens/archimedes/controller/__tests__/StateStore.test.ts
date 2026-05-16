/**
 * StateStore — unit tests (этап 6c).
 *
 * Проверяем:
 *   - save+load round-trip;
 *   - throttle 5с (default) — flush через нужное время, не раньше;
 *   - saveImmediate сразу пишет, отменяет pending;
 *   - expired записи (старше ttlMs) удаляются при load;
 *   - malformed JSON удаляется silently;
 *   - clear() очищает + отменяет pending;
 *   - неподходящая структура (без version) → load возвращает null + clear.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StateStore, ARCHIMEDES_STORAGE_KEY } from '../StateStore';

interface SamplePayload {
  phase: string;
  rows: number[];
}

class InMemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
  removeItem(k: string): void {
    this.data.delete(k);
  }
}

describe('StateStore — auto-save persistence', () => {
  let storage: InMemoryStorage;
  let nowMs: number;
  beforeEach(() => {
    storage = new InMemoryStorage();
    nowMs = 1_700_000_000_000;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeStore(opts: Partial<{ throttleMs: number; ttlMs: number }> = {}): StateStore<SamplePayload> {
    return new StateStore<SamplePayload>({
      storage,
      now: () => nowMs,
      throttleMs: opts.throttleMs ?? 5000,
      ttlMs: opts.ttlMs ?? 60 * 60 * 1000,
    });
  }

  it('saveImmediate + load: round-trip', () => {
    const store = makeStore();
    store.saveImmediate({ phase: 'water-poured', rows: [1, 2, 3] });
    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.payload).toEqual({ phase: 'water-poured', rows: [1, 2, 3] });
    expect(loaded!.savedAt).toBe(nowMs);
    expect(loaded!.ageMs).toBe(0);
  });

  it('save (throttled) — не пишет сразу, пишет через throttleMs', () => {
    const store = makeStore({ throttleMs: 5000 });
    store.save({ phase: 'idle', rows: [] });
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
    expect(store.hasPendingSave()).toBe(true);
    vi.advanceTimersByTime(4900);
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
    vi.advanceTimersByTime(200);
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(true);
    expect(store.hasPendingSave()).toBe(false);
    const loaded = store.load();
    expect(loaded!.payload.phase).toBe('idle');
  });

  it('повторные save в throttle-окне — payload обновляется, время flush НЕ двигается', () => {
    const store = makeStore({ throttleMs: 5000 });
    store.save({ phase: 'idle', rows: [] });
    vi.advanceTimersByTime(2000);
    store.save({ phase: 'cyl-attached', rows: [1] });
    vi.advanceTimersByTime(2000);
    store.save({ phase: 'water-poured', rows: [1, 2] });
    vi.advanceTimersByTime(1500);
    // Прошло 5500мс с момента первого save — flush должен был случиться
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(true);
    const loaded = store.load();
    expect(loaded!.payload).toEqual({ phase: 'water-poured', rows: [1, 2] });
  });

  it('saveImmediate отменяет pending throttle', () => {
    const store = makeStore({ throttleMs: 5000 });
    store.save({ phase: 'A', rows: [] });
    expect(store.hasPendingSave()).toBe(true);
    store.saveImmediate({ phase: 'B', rows: [9] });
    expect(store.hasPendingSave()).toBe(false);
    const loaded = store.load();
    expect(loaded!.payload.phase).toBe('B');
    // Прошло 5+ секунд — никаких новых записей не должно появиться
    vi.advanceTimersByTime(10_000);
    const loaded2 = store.load();
    expect(loaded2!.payload.phase).toBe('B');
  });

  it('expired запись (старше ttlMs) → load возвращает null + удалена', () => {
    const store = makeStore({ ttlMs: 60_000 });
    store.saveImmediate({ phase: 'old', rows: [] });
    // Прошёл 1 час
    nowMs += 60_001;
    const loaded = store.load();
    expect(loaded).toBeNull();
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
  });

  it('clear() удаляет данные + отменяет pending', () => {
    const store = makeStore();
    store.save({ phase: 'pending', rows: [] });
    expect(store.hasPendingSave()).toBe(true);
    store.clear();
    expect(store.hasPendingSave()).toBe(false);
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
    // Через 5с pending не должен прорваться
    vi.advanceTimersByTime(10_000);
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
  });

  it('malformed JSON в storage → load returns null + удалён', () => {
    storage.setItem(ARCHIMEDES_STORAGE_KEY, '{ битый JSON');
    const store = makeStore();
    const loaded = store.load();
    expect(loaded).toBeNull();
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
  });

  it('JSON без version → load returns null + clear', () => {
    storage.setItem(
      ARCHIMEDES_STORAGE_KEY,
      JSON.stringify({ savedAt: nowMs, payload: { phase: 'X' } }),
    );
    const store = makeStore();
    const loaded = store.load();
    expect(loaded).toBeNull();
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
  });

  it('JSON с другой version (2) — отвергаем (миграция не поддерживается на 6c)', () => {
    storage.setItem(
      ARCHIMEDES_STORAGE_KEY,
      JSON.stringify({ version: 2, savedAt: nowMs, payload: { phase: 'X' } }),
    );
    const store = makeStore();
    const loaded = store.load();
    expect(loaded).toBeNull();
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
  });

  it('load() из пустого storage → null', () => {
    const store = makeStore();
    expect(store.load()).toBeNull();
  });

  it('flush() pending — записывает сразу', () => {
    const store = makeStore({ throttleMs: 5000 });
    store.save({ phase: 'p', rows: [42] });
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
    store.flush();
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(true);
    expect(store.hasPendingSave()).toBe(false);
  });

  it('flush() без pending — no-op (не пишет junk)', () => {
    const store = makeStore();
    store.flush();
    expect(storage.data.has(ARCHIMEDES_STORAGE_KEY)).toBe(false);
  });

  it('storage с throwing setItem (QuotaExceeded) — saveImmediate silently no-op', () => {
    // Симулируем localStorage с throwing setItem (например, private mode Safari).
    const throwing: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {},
    };
    const store = new StateStore<SamplePayload>({
      storage: throwing,
      now: () => nowMs,
    });
    // Не должен бросать — обработка ошибки внутри.
    expect(() => store.saveImmediate({ phase: 'a', rows: [] })).not.toThrow();
    // load возвращает null — ничего не записалось
    expect(store.load()).toBeNull();
  });
});
