/**
 * undo.ts — тесты LIFO-стека обратимых действий.
 *
 * Контракт (spec §11 этап 5 + research §3 «Just Undo It»):
 *   - push добавляет, undo() снимает последнее и вызывает action.undo().
 *   - При превышении maxDepth старейшее выпадает (без вызова его undo()).
 *   - peek() возвращает top без снятия. peek(id) — только если id совпадает.
 *   - clear() стирает всё без вызова undo().
 *   - undo() на пустом стеке возвращает null, не бросает.
 */

import { describe, expect, it, vi } from 'vitest';
import { UndoStack, type UndoableAction } from '../lib/undo';

function makeAction(overrides: Partial<UndoableAction> = {}): UndoableAction {
  return {
    do: vi.fn(),
    undo: vi.fn(),
    ...overrides,
  };
}

describe('UndoStack — base contract', () => {
  it('push + undo round-trip: undo() снимает последнее и вызывает action.undo', () => {
    const stack = new UndoStack();
    const a = makeAction({ label: 'A' });
    stack.push(a);

    expect(stack.size()).toBe(1);
    const popped = stack.undo();
    expect(popped).toBe(a);
    expect(a.undo).toHaveBeenCalledTimes(1);
    expect(stack.size()).toBe(0);
  });

  it('LIFO: undo() возвращает в обратном порядке push (newest first)', () => {
    const stack = new UndoStack();
    const a = makeAction({ label: 'A' });
    const b = makeAction({ label: 'B' });
    const c = makeAction({ label: 'C' });
    stack.push(a);
    stack.push(b);
    stack.push(c);

    expect(stack.undo()).toBe(c);
    expect(stack.undo()).toBe(b);
    expect(stack.undo()).toBe(a);
    expect(stack.size()).toBe(0);
  });

  it('do() стек не вызывает (действие к моменту push уже выполнено)', () => {
    const stack = new UndoStack();
    const a = makeAction();
    stack.push(a);
    stack.undo();
    // do — никогда. undo — один раз (на undo()).
    expect(a.do).not.toHaveBeenCalled();
    expect(a.undo).toHaveBeenCalledTimes(1);
  });
});

describe('UndoStack — maxDepth', () => {
  it('default maxDepth = 10: 11-й push выкидывает 1-й, его undo() НЕ вызывается', () => {
    const stack = new UndoStack();
    const actions: UndoableAction[] = [];
    for (let i = 0; i < 11; i++) {
      const a = makeAction({ label: `${i}` });
      actions.push(a);
      stack.push(a);
    }
    expect(stack.size()).toBe(10);
    // Самый первый (index 0) — выпал. Его undo НЕ должен быть вызван.
    expect(actions[0]!.undo).not.toHaveBeenCalled();
    // Остальные 10 (indices 1..10) — внутри стека, ни один ещё не undo'нут.
    for (let i = 1; i <= 10; i++) {
      expect(actions[i]!.undo).not.toHaveBeenCalled();
    }
  });

  it('кастомный maxDepth=3: при 5 push-ах внутри только последние 3', () => {
    const stack = new UndoStack(3);
    const actions: UndoableAction[] = [];
    for (let i = 0; i < 5; i++) {
      const a = makeAction({ label: `${i}` });
      actions.push(a);
      stack.push(a);
    }
    expect(stack.size()).toBe(3);
    // top = action 4
    expect(stack.peek()).toBe(actions[4]);
    expect(stack.undo()).toBe(actions[4]);
    expect(stack.undo()).toBe(actions[3]);
    expect(stack.undo()).toBe(actions[2]);
    // Стек пуст — actions 0 и 1 уже выпали без undo.
    expect(actions[0]!.undo).not.toHaveBeenCalled();
    expect(actions[1]!.undo).not.toHaveBeenCalled();
  });

  it('maxDepth ≤ 0 или NaN или Infinity → throws RangeError', () => {
    expect(() => new UndoStack(0)).toThrow(RangeError);
    expect(() => new UndoStack(-1)).toThrow(RangeError);
    expect(() => new UndoStack(Number.NaN)).toThrow(RangeError);
    expect(() => new UndoStack(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('UndoStack — size & clear', () => {
  it('size() корректна после серии push/undo', () => {
    const stack = new UndoStack();
    expect(stack.size()).toBe(0);
    stack.push(makeAction());
    stack.push(makeAction());
    stack.push(makeAction());
    expect(stack.size()).toBe(3);
    stack.undo();
    expect(stack.size()).toBe(2);
  });

  it('clear() обнуляет стек и НЕ вызывает undo() ни у одного из элементов', () => {
    const stack = new UndoStack();
    const a = makeAction();
    const b = makeAction();
    stack.push(a);
    stack.push(b);
    stack.clear();
    expect(stack.size()).toBe(0);
    expect(a.undo).not.toHaveBeenCalled();
    expect(b.undo).not.toHaveBeenCalled();
    // После clear undo() возвращает null.
    expect(stack.undo()).toBeNull();
  });
});

describe('UndoStack — peek', () => {
  it('peek() без id → последний (top), без снятия', () => {
    const stack = new UndoStack();
    const a = makeAction({ label: 'A' });
    const b = makeAction({ label: 'B' });
    stack.push(a);
    stack.push(b);

    expect(stack.peek()).toBe(b);
    // Размер не изменился.
    expect(stack.size()).toBe(2);
    expect(b.undo).not.toHaveBeenCalled();
  });

  it('peek(id) → top, если id совпадает', () => {
    const stack = new UndoStack();
    stack.push(makeAction({ id: 'foo', label: 'A' }));
    const b = makeAction({ id: 'bar', label: 'B' });
    stack.push(b);
    expect(stack.peek('bar')).toBe(b);
  });

  it('peek(id) → null, если top имеет другой id', () => {
    const stack = new UndoStack();
    stack.push(makeAction({ id: 'foo' }));
    stack.push(makeAction({ id: 'bar' }));
    expect(stack.peek('foo')).toBeNull(); // top.id === 'bar'
  });

  it('peek(id) → null, если у top нет id', () => {
    const stack = new UndoStack();
    stack.push(makeAction()); // no id
    expect(stack.peek('anything')).toBeNull();
  });

  it('peek() на пустом стеке → null, не throw', () => {
    const stack = new UndoStack();
    expect(stack.peek()).toBeNull();
    expect(stack.peek('foo')).toBeNull();
  });
});

describe('UndoStack — undo() пустой', () => {
  it('undo() на пустом стеке → null, не throw', () => {
    const stack = new UndoStack();
    expect(stack.undo()).toBeNull();
    // Повторный вызов тоже null.
    expect(stack.undo()).toBeNull();
  });

  it('undo() после полного очищения через многократный undo → null', () => {
    const stack = new UndoStack();
    stack.push(makeAction());
    stack.push(makeAction());
    expect(stack.undo()).not.toBeNull();
    expect(stack.undo()).not.toBeNull();
    expect(stack.undo()).toBeNull();
  });
});

describe('UndoStack — сценарий: push push undo push undo', () => {
  it('push(A) → push(B) → undo() → push(C) → undo() возвращает C, не B', () => {
    const stack = new UndoStack();
    const a = makeAction({ label: 'A' });
    const b = makeAction({ label: 'B' });
    const c = makeAction({ label: 'C' });

    stack.push(a);
    stack.push(b);

    const first = stack.undo();
    expect(first).toBe(b);
    expect(b.undo).toHaveBeenCalledTimes(1);

    stack.push(c);
    const second = stack.undo();
    expect(second).toBe(c);
    expect(c.undo).toHaveBeenCalledTimes(1);

    // A всё ещё в стеке, его undo() не вызывался.
    expect(stack.size()).toBe(1);
    expect(stack.peek()).toBe(a);
    expect(a.undo).not.toHaveBeenCalled();
  });
});
