import { describe, expect, it, vi } from 'vitest';
import { BenchTopology, BENCH_TOPOLOGY_4_1 } from '../OpticalBenchAssembly';

describe('BenchTopology (опыт 4.1)', () => {
  it('пустая → не complete, не ok', () => {
    const t = new BenchTopology(BENCH_TOPOLOGY_4_1);
    expect(t.isComplete()).toBe(false);
    expect(t.validate().ok).toBe(false);
  });

  it('полная сборка 4.1 → ok', () => {
    const t = new BenchTopology(BENCH_TOPOLOGY_4_1);
    t.place('object', 'light-object');
    t.place('lens', 'lens');
    t.place('screen', 'screen');
    expect(t.isComplete()).toBe(true);
    expect(t.validate().ok).toBe(true);
  });

  it('accepts mismatch → place возвращает false', () => {
    const t = new BenchTopology(BENCH_TOPOLOGY_4_1);
    // экран не принимает линзу
    expect(t.place('screen', 'lens')).toBe(false);
    expect(t.slotFilledBy('screen')).toBeNull();
  });

  it('повторный place в занятый слот → false', () => {
    const t = new BenchTopology(BENCH_TOPOLOGY_4_1);
    t.place('lens', 'lens');
    expect(t.place('lens', 'lens')).toBe(false);
  });

  it('remove освобождает слот', () => {
    const t = new BenchTopology(BENCH_TOPOLOGY_4_1);
    t.place('object', 'light-object');
    t.remove('object');
    expect(t.slotFilledBy('object')).toBeNull();
  });

  it('частичная сборка (нет screen) → не ok, errors содержат "screen"', () => {
    const t = new BenchTopology(BENCH_TOPOLOGY_4_1);
    t.place('object', 'light-object');
    t.place('lens', 'lens');
    const v = t.validate();
    expect(v.ok).toBe(false);
    expect(v.errors.join(' ')).toContain('screen');
  });

  it('validate при пустой → errors для всех 3 слотов', () => {
    const t = new BenchTopology(BENCH_TOPOLOGY_4_1);
    const v = t.validate();
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBe(3);
  });

  it('reset() очищает все заполненные слоты', () => {
    const t = new BenchTopology(BENCH_TOPOLOGY_4_1);
    t.place('object', 'light-object');
    t.place('lens', 'lens');
    t.place('screen', 'screen');
    expect(t.isComplete()).toBe(true);
    t.reset();
    expect(t.isComplete()).toBe(false);
    expect(t.slotFilledBy('object')).toBeNull();
    expect(t.slotFilledBy('lens')).toBeNull();
    expect(t.slotFilledBy('screen')).toBeNull();
    expect(t.validate().ok).toBe(false);
  });
});

// ─── OpticalBenchAssembly (DOM-glue) ─────────────────────────────────────────

import { OpticalBenchAssembly } from '../OpticalBenchAssembly';
import type { SnapZone } from '../OpticalDragController';

function makeBoard() {
  const slots: Record<string, DOMRect> = {
    object: new DOMRect(50, 100, 60, 60),
    lens: new DOMRect(250, 100, 60, 60),
    screen: new DOMRect(450, 100, 60, 60),
  };
  return {
    getSlotRect(id: string): DOMRect {
      // bench нормализует префикс; здесь принимаем сырой slotId
      return slots[id] ?? new DOMRect(0, 0, 0, 0);
    },
    // shadow-DOM-safe подсветка гнезда (вместо прямого classList сквозь shadow root)
    setSlotHover: vi.fn(),
    // no setCurrentAnimating — optics bench uses setSlotHover + setImageSharpness instead
    setImageSharpness: vi.fn(),
  } as unknown as HTMLElement & {
    getSlotRect(id: string): DOMRect;
    setSlotHover(slotId: string, active: boolean): void;
  };
}

function makeDragController() {
  const zones = new Map<string, SnapZone>();
  return {
    addSnapZone: vi.fn((zone: SnapZone) => zones.set(zone.id, zone)),
    removeSnapZone: vi.fn((id: string) => zones.delete(id)),
    _zones: zones,
  };
}

describe('OpticalBenchAssembly', () => {
  it('конструктор регистрирует 3 snap-зоны с префиксом bench-slot-', () => {
    const board = makeBoard();
    const dc = makeDragController();
    const topo = new BenchTopology(BENCH_TOPOLOGY_4_1);
    new OpticalBenchAssembly(board, topo, dc);
    expect(dc.addSnapZone).toHaveBeenCalledTimes(3);
    const ids = [...dc._zones.keys()];
    expect(ids).toContain('bench-slot-object');
    expect(ids).toContain('bench-slot-lens');
    expect(ids).toContain('bench-slot-screen');
  });

  it('drop в корректную зону вызывает place → isComplete после всех трёх', () => {
    const board = makeBoard();
    const dc = makeDragController();
    const topo = new BenchTopology(BENCH_TOPOLOGY_4_1);
    new OpticalBenchAssembly(board, topo, dc);

    dc._zones.get('bench-slot-object')!.onDrop({ equipmentId: 'light-object' });
    dc._zones.get('bench-slot-lens')!.onDrop({ equipmentId: 'lens' });
    dc._zones.get('bench-slot-screen')!.onDrop({ equipmentId: 'screen' });
    expect(topo.isComplete()).toBe(true);
  });

  it('drop с неправильным kind → place возвращает false, слот остаётся пустым', () => {
    const board = makeBoard();
    const dc = makeDragController();
    const topo = new BenchTopology(BENCH_TOPOLOGY_4_1);
    new OpticalBenchAssembly(board, topo, dc);

    const accepted = dc._zones.get('bench-slot-screen')!.onDrop({ equipmentId: 'lens' });
    expect(accepted).toBe(false);
    expect(topo.slotFilledBy('screen')).toBeNull();
  });

  it('destroy() убирает все зарегистрированные зоны', () => {
    const board = makeBoard();
    const dc = makeDragController();
    const topo = new BenchTopology(BENCH_TOPOLOGY_4_1);
    const asm = new OpticalBenchAssembly(board, topo, dc);
    asm.destroy();
    expect(dc.removeSnapZone).toHaveBeenCalledTimes(3);
    expect(dc.removeSnapZone).toHaveBeenCalledWith('bench-slot-object');
    expect(dc.removeSnapZone).toHaveBeenCalledWith('bench-slot-lens');
    expect(dc.removeSnapZone).toHaveBeenCalledWith('bench-slot-screen');
  });

  it('removeFromSlot очищает слот в топологии', () => {
    const board = makeBoard();
    const dc = makeDragController();
    const topo = new BenchTopology(BENCH_TOPOLOGY_4_1);
    const asm = new OpticalBenchAssembly(board, topo, dc);
    dc._zones.get('bench-slot-lens')!.onDrop({ equipmentId: 'lens' });
    expect(topo.slotFilledBy('lens')).toBe('lens');
    asm.removeFromSlot('lens');
    expect(topo.slotFilledBy('lens')).toBeNull();
  });

  it('onDrop вызывает инжектированный onPlaced(slotId, equipmentId) при успехе', () => {
    const board = makeBoard();
    const dc = makeDragController();
    const topo = new BenchTopology(BENCH_TOPOLOGY_4_1);
    const onPlaced = vi.fn();
    new OpticalBenchAssembly(board, topo, dc, { onPlaced });

    dc._zones.get('bench-slot-lens')!.onDrop({ equipmentId: 'lens' });
    expect(onPlaced).toHaveBeenCalledWith('lens', 'lens');

    // неуспешный drop не дёргает onPlaced
    dc._zones.get('bench-slot-screen')!.onDrop({ equipmentId: 'lens' });
    expect(onPlaced).toHaveBeenCalledTimes(1);
  });

  it('onHover зоны вызывает board.setSlotHover(slotId, active) (сырой slotId, shadow-safe)', () => {
    const board = makeBoard();
    const dc = makeDragController();
    const topo = new BenchTopology(BENCH_TOPOLOGY_4_1);
    new OpticalBenchAssembly(board, topo, dc);

    dc._zones.get('bench-slot-object')!.onHover?.(true);
    expect(board.setSlotHover).toHaveBeenCalledWith('object', true);
    dc._zones.get('bench-slot-object')!.onHover?.(false);
    expect(board.setSlotHover).toHaveBeenCalledWith('object', false);
  });
});
