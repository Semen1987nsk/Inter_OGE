/**
 * OpticalBenchAssembly — слот-модель оптической скамьи + валидатор топологии.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№4 (стр.19):
 * измерение оптической силы собирающей линзы, опыт 4.1.
 *
 * Экспортирует:
 *   BenchTopology    — pure-класс (Map слотов), без DOM.
 *   OpticalBenchAssembly — DOM-glue: связывает DragController snap-zones
 *     с BenchTopology. Zone-id prefix: bench-slot-${slotId} (единственная точка регистрации).
 *   BENCH_TOPOLOGY_4_1 — определение слотов опыта 4.1.
 */

// ─── Типы ────────────────────────────────────────────────────────────────────

export type SlotRole = 'object' | 'lens' | 'screen';

export interface SlotDef {
  readonly id: string;
  readonly role: SlotRole;
  readonly accepts: ReadonlyArray<string>;
  /** Максимум приборов в гнезде (стопка линз = 2). По умолчанию 1. */
  readonly capacity?: number;
}

interface SlotState {
  readonly role: SlotRole;
  readonly accepts: ReadonlyArray<string>;
  readonly capacity: number;
  filledBy: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

// ─── Топология опыта 4.1 ─────────────────────────────────────────────────────

/** Слоты оптической скамьи для опыта 4.1 (измерение оптической силы линзы). */
export const BENCH_TOPOLOGY_4_1: ReadonlyArray<SlotDef> = [
  { id: 'object', role: 'object', accepts: ['light-object'] },
  { id: 'lens', role: 'lens', accepts: ['lens'] },
  { id: 'screen', role: 'screen', accepts: ['screen'] },
] as const;

// ─── BenchTopology (pure) ─────────────────────────────────────────────────────

/**
 * Чистая модель топологии оптической скамьи — без DOM, без Store.
 * Можно тестировать полностью в Vitest без happy-dom.
 */
export class BenchTopology {
  #slots: Map<string, SlotState>;

  constructor(defs: ReadonlyArray<SlotDef>) {
    this.#slots = new Map(
      defs.map((d) => [d.id, { role: d.role, accepts: d.accepts, capacity: d.capacity ?? 1, filledBy: [] }]),
    );
  }

  /**
   * Попытаться разместить прибор eqKind в слот slotId.
   * Возвращает false если: слот не существует, прибор не в accepts, или слот заполнен до capacity.
   */
  place(slotId: string, eqKind: string): boolean {
    const slot = this.#slots.get(slotId);
    if (!slot) return false;
    if (!slot.accepts.includes(eqKind)) return false;
    if (slot.filledBy.length >= slot.capacity) return false;
    slot.filledBy.push(eqKind);
    return true;
  }

  /** Освободить слот. Нет-оп если слот не существует или уже пуст. */
  remove(slotId: string): void {
    const slot = this.#slots.get(slotId);
    if (slot) slot.filledBy = [];
  }

  /** Первый занявший слот прибор (обратная совместимость). null если пуст или слот не существует. */
  slotFilledBy(slotId: string): string | null {
    return this.#slots.get(slotId)?.filledBy[0] ?? null;
  }

  /** Все kind'ы в слоте (стопка). Пустой массив если слот пуст/не существует. */
  slotStack(slotId: string): readonly string[] {
    return this.#slots.get(slotId)?.filledBy ?? [];
  }

  /** Валидация топологии — полнота скамьи. */
  validate(): ValidationResult {
    const errors: string[] = [];

    const roleLabel: Record<SlotRole, string> = {
      object: 'осветитель-предмет',
      lens: 'линза',
      screen: 'экран',
    };

    for (const [id, slot] of this.#slots) {
      if (slot.filledBy.length === 0) {
        errors.push(`Слот '${id}' (${roleLabel[slot.role]}) пуст`);
      }
    }

    return { ok: errors.length === 0, errors };
  }

  /** Очистить все слоты (сброс скамьи). */
  reset(): void {
    for (const slot of this.#slots.values()) {
      slot.filledBy = [];
    }
  }

  /** Все слоты заняты (хотя бы по одному прибору в каждом)? */
  isComplete(): boolean {
    for (const slot of this.#slots.values()) {
      if (slot.filledBy.length === 0) return false;
    }
    return true;
  }

  /** Итератор всех слотов (только для чтения). */
  get slots(): ReadonlyMap<string, Readonly<SlotState>> {
    return this.#slots;
  }
}

// ─── OpticalBenchAssembly (DOM-glue) ─────────────────────────────────────────

interface BenchBoard {
  /** slot id может быть сырым ('object') или с префиксом ('bench-slot-object') — нормализуется внутри. */
  getSlotRect(id: string): DOMRect;
  /** slot id может быть сырым ('object') или с префиксом ('bench-slot-object') — нормализуется внутри. */
  setSlotHover(slotId: string, active: boolean): void;
}

interface BenchDragController {
  addSnapZone(zone: {
    id: string;
    accepts: ReadonlyArray<string>;
    getRect(): DOMRect;
    onHover?(active: boolean): void;
    onDrop(payload: { equipmentId: string; kind: string }): boolean;
  }): void;
  removeSnapZone(id: string): void;
}

export interface OpticalBenchAssemblyOptions {
  /** Колбэк успешного размещения прибора в слот — эксперимент узнаёт о дропе без перерегистрации зон. */
  onPlaced?(slotId: string, equipmentId: string): void;
}

export class OpticalBenchAssembly {
  #topology: BenchTopology;
  #board: BenchBoard;
  #dragController: BenchDragController;
  #onPlaced: ((slotId: string, equipmentId: string) => void) | undefined;
  #registeredZoneIds: string[] = [];

  constructor(
    board: BenchBoard,
    topology: BenchTopology,
    dragController: BenchDragController,
    opts: OpticalBenchAssemblyOptions = {},
  ) {
    this.#board = board;
    this.#topology = topology;
    this.#dragController = dragController;
    this.#onPlaced = opts.onPlaced;

    // Регистрируем snap-зоны для каждого слота топологии.
    // ЕДИНСТВЕННАЯ точка регистрации: bench-slot-${slotId}.
    // getRect/setSlotHover получают СЫРОЙ slotId — нормализацию префикса делает сам bench.
    for (const [slotId, slot] of topology.slots) {
      const zoneId = `bench-slot-${slotId}`;

      dragController.addSnapZone({
        id: zoneId,
        accepts: Array.from(slot.accepts),
        getRect: () => this.#board.getSlotRect(slotId),
        onHover: (active) => {
          this.#board.setSlotHover(slotId, active);
        },
        onDrop: ({ equipmentId, kind }) => {
          const ok = this.#topology.place(slotId, kind);
          if (ok) this.#onPlaced?.(slotId, equipmentId);
          return ok;
        },
      });

      this.#registeredZoneIds.push(zoneId);
    }
  }

  /**
   * Удаляет все snap-зоны, зарегистрированные этим экземпляром.
   * Вызывать при размонтировании — иначе зоны накапливаются.
   */
  destroy(): void {
    for (const id of this.#registeredZoneIds) {
      this.#dragController.removeSnapZone(id);
    }
    this.#registeredZoneIds = [];
  }

  /** Программно убрать прибор из слота (например, при drag-back). */
  removeFromSlot(slotId: string): void {
    this.#topology.remove(slotId);
  }
}
