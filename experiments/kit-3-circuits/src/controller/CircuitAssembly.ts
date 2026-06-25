/**
 * CircuitAssembly — слот-модель цепи + валидатор топологии + ток-анимация.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (стр.18) + КОДИФ §1.29:
 * сборка цепи методом амперметра-вольтметра, опыт 3.1.
 *
 * Экспортирует:
 *   CircuitTopology — pure-класс (Map слотов), без DOM.
 *   CircuitAssembly — DOM-glue: связывает DragController snap-zones
 *     с CircuitTopology и управляет анимацией тока на lab-circuit-board.
 */

// ─── Типы ────────────────────────────────────────────────────────────────────

export type SlotRole = 'source' | 'key' | 'series' | 'parallel';

export interface SlotDef {
  readonly id: string;
  readonly role: SlotRole;
  readonly accepts: ReadonlyArray<string>;
}

interface SlotState {
  readonly role: SlotRole;
  readonly accepts: ReadonlyArray<string>;
  filledBy: string | null;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

// ─── CircuitTopology (pure) ───────────────────────────────────────────────────

/**
 * Чистая модель топологии цепи — без DOM, без Store.
 * Можно тестировать полностью в Vitest без happy-dom.
 */
export class CircuitTopology {
  #slots: Map<string, SlotState>;

  constructor(defs: ReadonlyArray<SlotDef>) {
    this.#slots = new Map(
      defs.map((d) => [
        d.id,
        { role: d.role, accepts: d.accepts, filledBy: null },
      ]),
    );
  }

  /**
   * Попытаться разместить прибор eqKind в слот slotId.
   * Возвращает false если: слот не существует, прибор не в accepts, или слот уже занят.
   */
  place(slotId: string, eqKind: string): boolean {
    const slot = this.#slots.get(slotId);
    if (!slot) return false;
    if (!slot.accepts.includes(eqKind)) return false;
    if (slot.filledBy !== null) return false;
    slot.filledBy = eqKind;
    return true;
  }

  /** Освободить слот. Нет-оп если слот не существует или уже пуст. */
  remove(slotId: string): void {
    const slot = this.#slots.get(slotId);
    if (slot) slot.filledBy = null;
  }

  /** Что сейчас занимает слот. null если пуст или слот не существует. */
  slotFilledBy(slotId: string): string | null {
    return this.#slots.get(slotId)?.filledBy ?? null;
  }

  /**
   * Валидация топологии — ПОЛНОТА цепи.
   *
   * Разделение ответственности:
   *   place()    — enforces instrument-kind per slot (accepts); отказывает при несовместимом типе.
   *   validate() — enforces completeness of required slots; возвращает ok:false
   *                с human-readable errors[] для каждого незаполненного обязательного слота.
   *
   * Все слоты (source, key, series, parallel) обязательны для топологии 3.1.
   * Возвращает ok:true только когда ВСЕ слоты заполнены.
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    const roleLabel: Record<SlotRole, string> = {
      source: 'источник питания',
      key: 'ключ',
      series: 'последовательный прибор',
      parallel: 'параллельный прибор (вольтметр)',
    };

    for (const [id, slot] of this.#slots) {
      if (slot.filledBy === null) {
        errors.push(`Слот '${id}' (${roleLabel[slot.role]}) пуст`);
      }
    }

    // defensive: place() уже гарантирует accepts, но если тип всё же несовместим — фиксируем
    for (const [id, slot] of this.#slots) {
      if (slot.filledBy !== null && !slot.accepts.includes(slot.filledBy)) {
        errors.push(`Слот '${id}': прибор '${slot.filledBy}' недопустим (defensive)`); // defensive
      }
    }

    return { ok: errors.length === 0, errors };
  }

  /** Очистить все слоты (сброс цепи на экране). */
  reset(): void {
    for (const slot of this.#slots.values()) {
      slot.filledBy = null;
    }
  }

  /** Все слоты заняты? */
  isComplete(): boolean {
    for (const slot of this.#slots.values()) {
      if (slot.filledBy === null) return false;
    }
    return true;
  }

  /** Итератор всех слотов (только для чтения). */
  get slots(): ReadonlyMap<string, Readonly<SlotState>> {
    return this.#slots;
  }
}

// ─── CircuitAssembly (DOM-glue) ───────────────────────────────────────────────

/**
 * DOM-glue: связывает DragController snap-zones (из lab-circuit-board)
 * с CircuitTopology и управляет анимацией тока.
 *
 * Использование:
 *   const assembly = new CircuitAssembly(board, topology, dragController, overlay);
 *   // затем при каждом изменении ключа:
 *   assembly.setKeyClosed(true);
 */
export class CircuitAssembly {
  #topology: CircuitTopology;
  #board: HTMLElement & { setCurrentAnimating(on: boolean): void; getSlotRect(id: string): DOMRect };
  #keyClosed = false;
  #registeredZoneIds: string[] = [];
  #dragController: {
    addSnapZone(zone: {
      id: string;
      accepts: ReadonlyArray<string>;
      getRect(): DOMRect;
      onHover?(active: boolean): void;
      onDrop(payload: { equipmentId: string }): boolean;
    }): void;
    removeSnapZone(id: string): void;
  };

  constructor(
    board: HTMLElement & { setCurrentAnimating(on: boolean): void; getSlotRect(id: string): DOMRect },
    topology: CircuitTopology,
    dragController: {
      addSnapZone(zone: {
        id: string;
        accepts: ReadonlyArray<string>;
        getRect(): DOMRect;
        onHover?(active: boolean): void;
        onDrop(payload: { equipmentId: string }): boolean;
      }): void;
      removeSnapZone(id: string): void;
    },
  ) {
    this.#board = board;
    this.#topology = topology;
    this.#dragController = dragController;

    // Регистрируем snap-зоны для каждого слота топологии
    // place() enforces instrument-kind per slot (accepts); validate() enforces completeness.
    for (const [slotId, slot] of topology.slots) {
      const slotEl = board.querySelector<HTMLElement>(`[data-slot="${slotId}"]`);
      const zoneId = `circuit-slot-${slotId}`;

      dragController.addSnapZone({
        id: zoneId,
        accepts: Array.from(slot.accepts),
        getRect: () => this.#board.getSlotRect(slotId),
        onHover: (active) => {
          if (slotEl) {
            slotEl.classList.toggle('drop-zone--active', active);
          }
        },
        onDrop: ({ equipmentId }) => {
          const accepted = this.#topology.place(slotId, equipmentId);
          if (accepted) this.#refreshAnimation();
          return accepted;
        },
      });

      this.#registeredZoneIds.push(zoneId);
    }
  }

  /**
   * Удаляет все snap-зоны, зарегистрированные этим экземпляром.
   * Вызывать при размонтировании (Task 6 mount/unmount) — иначе зоны накапливаются.
   */
  destroy(): void {
    for (const id of this.#registeredZoneIds) {
      this.#dragController.removeSnapZone(id);
    }
    this.#registeredZoneIds = [];
  }

  /** Обновить состояние ключа и анимацию тока. */
  setKeyClosed(closed: boolean): void {
    this.#keyClosed = closed;
    this.#refreshAnimation();
  }

  /** Программно убрать прибор из слота (например, при drag-back). */
  removeFromSlot(slotId: string): void {
    this.#topology.remove(slotId);
    this.#refreshAnimation();
  }

  #refreshAnimation(): void {
    const { ok } = this.#topology.validate();
    this.#board.setCurrentAnimating(ok && this.#keyClosed);
  }
}
