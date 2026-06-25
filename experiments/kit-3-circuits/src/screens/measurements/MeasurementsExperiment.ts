/**
 * MeasurementsExperiment — оркестратор опыта 3.1 «Сопротивление резистора».
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (стр.18) + КОДИФ §1.29:
 * измерение сопротивления резистора методом амперметра-вольтметра.
 * R = U / I.
 *
 * Методичка ЛАБОСФЕРА §2.2.7 (стр.22):
 * «Амперметр включается последовательно, вольтметр — параллельно резистору.
 *  Допустимое сопротивление резистора R1 = 4,2–5,2 Ом (паспорт ФИПИ).»
 *
 * Workflow:
 *   1. Drag 5 приборов (источник, ключ, амперметр, резистор, вольтметр)
 *      → гнёзда lab-circuit-board.
 *   2. Замкнуть ключ → CircuitModel.current(U, R) → вольтметр + амперметр оживают.
 *   3. Записать строку журнала (U, I) → ученик считает R = U/I → ✓ проверка.
 *   4. Reset — всё возвращается в комплект.
 *
 * §21 — журнал v2 (renderJournalTable + RESISTANCE_SPEC + record-mode ключ 'kit-3').
 */

import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { Store } from '@controller/Store';
import { CircuitTopology, CircuitAssembly } from '@controller/CircuitAssembly';
import { current as circuitCurrent } from '@physics/circuit/CircuitModel';

// §21 — единый журнал v2
import {
  getRecordMode,
  injectRecordModeToggleStyles,
  renderRecordModeToggle,
  type RecordMode,
} from '@labosfera/shared-spa/lib/record-mode';
import { renderJournalTable } from '@labosfera/shared-spa/lib/journal/render';
import { verifyRow } from '@labosfera/shared-spa/lib/journal/verify';
import { RESISTANCE_SPEC } from '@labosfera/shared-spa/lib/journal/specs';
import type { JournalRow, JournalVerdict } from '@labosfera/shared-spa/lib/journal/types';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** ID оборудования в комплекте */
export type EquipmentId = 'power-source' | 'voltmeter' | 'ammeter' | 'resistor-r1' | 'resistor-r2' | 'key';

/** ID слотов на монтажной плате */
export type SlotId = 'source' | 'key' | 'ammeter' | 'resistor' | 'voltmeter';

/** Тип прибора для drag-kind и slot.accepts */
export type EqKind = 'power-source' | 'voltmeter' | 'ammeter' | 'resistor' | 'key';

interface PlacedInstrument {
  equipmentId: EquipmentId;
  kind: EqKind;
}

interface CircuitState {
  /** Размещённые приборы в слотах */
  placed: Partial<Record<SlotId, PlacedInstrument>>;
  /** Ключ замкнут */
  keyClosed: boolean;
  /** Напряжение источника (В) */
  voltage: number;
  /** Список записанных измерений */
  measurements: CircuitMeasurement[];
  /** Что сейчас тащат */
  dragging: EquipmentId | null;
}

export interface CircuitMeasurement {
  readonly id: string;
  readonly timestamp: number;
  readonly resistorVariant: string;
  readonly resistanceOhm: number;
  readonly voltageV: number;
  readonly currentA: number;
}

const INITIAL_STATE: CircuitState = {
  placed: {},
  keyClosed: false,
  voltage: 4.5,
  measurements: [],
  dragging: null,
};

/** Топология опыта 3.1 */
const SLOTS_3_1 = [
  { id: 'source',    role: 'source' as const,   accepts: ['power-source'] },
  { id: 'key',       role: 'key' as const,       accepts: ['key'] },
  { id: 'ammeter',   role: 'series' as const,    accepts: ['ammeter'] },
  { id: 'resistor',  role: 'series' as const,    accepts: ['resistor'] },
  { id: 'voltmeter', role: 'parallel' as const,  accepts: ['voltmeter'] },
] as const;

/** Сопротивления резисторов по варианту (Ом, ФИПИ-паспорт) */
const RESISTANCE_BY_VARIANT: Record<string, number> = {
  R1: 4.7,
  R2: 5.7,
  R3: 8.2,
};

const RECORD_MODE_KIT = 'kit-3';

// ─── DragController (простая реализация для circuit) ─────────────────────────

interface SnapZone {
  id: string;
  accepts: ReadonlyArray<string>;
  getRect(): DOMRect;
  onHover?(active: boolean): void;
  onDrop(payload: { equipmentId: string }): boolean;
}

interface DragState {
  el: HTMLElement;
  kind: EqKind;
  equipmentId: EquipmentId;
  startX: number;
  startY: number;
  pointerId: number;
  ghost: HTMLElement | null;
  grabOffsetX: number;
  grabOffsetY: number;
}

class CircuitDragController {
  #overlay: HTMLElement;
  #zones: Map<string, SnapZone> = new Map();
  #active: DragState | null = null;
  #lastHoveredZoneId: string | null = null;

  constructor(overlay: HTMLElement) {
    this.#overlay = overlay;
  }

  attach(
    el: HTMLElement,
    opts: {
      equipmentId: EquipmentId;
      kind: EqKind;
      onDragStart(): void;
      onDragEnd(): void;
    },
  ): void {
    el.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();

      const rect = el.getBoundingClientRect();
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.style.cssText = [
        'position:fixed',
        'pointer-events:none',
        'z-index:9999',
        'opacity:0.85',
        `width:${rect.width}px`,
        `height:${rect.height}px`,
        `left:${ev.clientX - rect.width / 2}px`,
        `top:${ev.clientY - rect.height / 2}px`,
        'transition:none',
      ].join(';');
      this.#overlay.appendChild(ghost);

      el.dataset['dragging'] = 'true';
      this.#active = {
        el,
        kind: opts.kind,
        equipmentId: opts.equipmentId,
        startX: ev.clientX,
        startY: ev.clientY,
        pointerId: ev.pointerId,
        ghost,
        grabOffsetX: ev.clientX - rect.left,
        grabOffsetY: ev.clientY - rect.top,
      };

      opts.onDragStart();
      el.setPointerCapture(ev.pointerId);
    });

    el.addEventListener('pointermove', (ev) => {
      if (!this.#active || this.#active.el !== el) return;
      if (this.#active.ghost) {
        this.#active.ghost.style.left = `${ev.clientX - this.#active.grabOffsetX}px`;
        this.#active.ghost.style.top = `${ev.clientY - this.#active.grabOffsetY}px`;
      }

      // Hover over zones
      const newHover = this.#findZone(ev.clientX, ev.clientY, this.#active.kind);
      if (newHover !== this.#lastHoveredZoneId) {
        if (this.#lastHoveredZoneId) {
          this.#zones.get(this.#lastHoveredZoneId)?.onHover?.(false);
        }
        if (newHover) {
          this.#zones.get(newHover)?.onHover?.(true);
        }
        this.#lastHoveredZoneId = newHover;
      }
    });

    el.addEventListener('pointerup', (ev) => {
      if (!this.#active || this.#active.el !== el) return;
      const st = this.#active;
      this.#active = null;

      // Clear hover
      if (this.#lastHoveredZoneId) {
        this.#zones.get(this.#lastHoveredZoneId)?.onHover?.(false);
        this.#lastHoveredZoneId = null;
      }

      // Remove ghost
      if (st.ghost) {
        st.ghost.remove();
      }
      delete el.dataset['dragging'];

      // Try drop
      const zone = this.#findZone(ev.clientX, ev.clientY, st.kind);
      if (zone) {
        this.#zones.get(zone)?.onDrop({ equipmentId: st.equipmentId });
      }

      opts.onDragEnd();
    });

    el.addEventListener('pointercancel', () => {
      if (!this.#active || this.#active.el !== el) return;
      if (this.#lastHoveredZoneId) {
        this.#zones.get(this.#lastHoveredZoneId)?.onHover?.(false);
        this.#lastHoveredZoneId = null;
      }
      if (this.#active.ghost) this.#active.ghost.remove();
      delete el.dataset['dragging'];
      this.#active = null;
      opts.onDragEnd();
    });
  }

  addSnapZone(zone: SnapZone): void {
    this.#zones.set(zone.id, zone);
  }

  removeSnapZone(id: string): void {
    this.#zones.delete(id);
  }

  cancel(): void {
    if (this.#active) {
      if (this.#active.ghost) this.#active.ghost.remove();
      delete this.#active.el.dataset['dragging'];
      this.#active = null;
    }
    if (this.#lastHoveredZoneId) {
      this.#zones.get(this.#lastHoveredZoneId)?.onHover?.(false);
      this.#lastHoveredZoneId = null;
    }
  }

  #findZone(cx: number, cy: number, kind: EqKind): string | null {
    for (const [id, zone] of this.#zones) {
      if (!zone.accepts.includes(kind)) continue;
      const r = zone.getRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        return id;
      }
    }
    return null;
  }
}

// ─── ExperimentRefs ───────────────────────────────────────────────────────────

export interface ExperimentRefs {
  stage: HTMLElement;
  circuitBoard: HTMLElement & {
    getSlotRect(id: string): DOMRect;
    setCurrentAnimating(on: boolean): void;
  };
  dragOverlay: HTMLElement;
  hintBar: HTMLElement;
  liveRegion: HTMLElement;
  resetBtn: HTMLButtonElement;
  keyControl: HTMLElement;
  keyBtn: HTMLButtonElement;
  keyBtnLabel: HTMLElement;
  voltageControl: HTMLElement;
  voltageInput: HTMLInputElement;
  voltageReadout: HTMLElement;
  journalEmpty: HTMLElement;
  formulaDisplay: HTMLElement;
  measurementPanel: HTMLElement;
  measurementToggle: HTMLButtonElement;
  measurementCount: HTMLElement;
  steps: HTMLElement;
  resultPanel: HTMLElement;
  cards: NodeListOf<LabEquipmentCard>;
  // §21 — журнал v2
  recordModeSlot?: HTMLElement | undefined;
  journalHost?: HTMLElement | undefined;
  recordPendingSlot?: HTMLElement | undefined;
  recordPendingBtn?: HTMLButtonElement | undefined;
  recordPendingSummary?: HTMLElement | undefined;
}

// ─── HintEngine (tiny) ───────────────────────────────────────────────────────

class HintEngine {
  #bar: HTMLElement;
  #live: HTMLElement;

  constructor(bar: HTMLElement, live: HTMLElement) {
    this.#bar = bar;
    this.#live = live;
  }

  update(st: CircuitState): void {
    const placed = st.placed;
    const slotIds: SlotId[] = ['source', 'key', 'ammeter', 'resistor', 'voltmeter'];
    const missing = slotIds.filter((id) => !placed[id]);

    if (missing.length === slotIds.length) {
      this.#set('Перетащите приборы с правой панели в гнёзда монтажной платы.');
      return;
    }
    if (missing.length > 0) {
      const labels: Record<SlotId, string> = {
        source:    'источник питания',
        key:       'ключ',
        ammeter:   'амперметр',
        resistor:  'резистор',
        voltmeter: 'вольтметр',
      };
      const missingLabels = missing.map((id) => labels[id]).join(', ');
      this.#set(`Добавьте в цепь: ${missingLabels}.`);
      return;
    }
    if (!st.keyClosed) {
      this.#set('Цепь собрана. Нажмите кнопку «Замкнуть ключ», чтобы включить ток.');
      return;
    }
    this.#set('Ток течёт. Считайте показания вольтметра и амперметра, затем запишите в журнал.');
  }

  flash(msg: string): void {
    this.#set(msg);
  }

  announce(msg: string): void {
    this.#live.textContent = '';
    requestAnimationFrame(() => {
      this.#live.textContent = msg;
    });
  }

  #set(msg: string): void {
    this.#bar.textContent = msg;
  }
}

// ─── MeasurementsExperiment ───────────────────────────────────────────────────

export class MeasurementsExperiment {
  #refs: ExperimentRefs;
  #store: Store<CircuitState>;
  #drag: CircuitDragController;
  #hints: HintEngine;
  #topology: CircuitTopology;
  #assembly: CircuitAssembly;
  #cardByEquipmentId = new Map<EquipmentId, LabEquipmentCard>();

  /** §21 — drafts (черновики derived-input) и verdicts (вердикты ✓) */
  #journalDrafts = new Map<number, Record<string, number>>();
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #detachRecordModeToggle: (() => void) | null = null;
  #lastRecordedSignature = '';

  constructor(refs: ExperimentRefs) {
    this.#refs = refs;
    this.#store = new Store<CircuitState>({ ...INITIAL_STATE });
    this.#drag = new CircuitDragController(refs.dragOverlay);
    this.#hints = new HintEngine(refs.hintBar, refs.liveRegion);

    // Topology + Assembly
    this.#topology = new CircuitTopology(SLOTS_3_1);
    this.#assembly = new CircuitAssembly(refs.circuitBoard, this.#topology, this.#drag);

    this.#wireUp();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
  }

  // ─── Public API (для тестов и отладки) ───────────────────────────────────

  /** Записанные измерения (read-only snapshot). */
  get measurements(): ReadonlyArray<CircuitMeasurement> {
    return this.#store.get().measurements;
  }

  /** Текущее напряжение источника (В). */
  get voltage(): number {
    return this.#store.get().voltage;
  }

  /** Программно разместить прибор в слот (для тестов). */
  placeInSlot(slotId: SlotId, equipmentId: EquipmentId): boolean {
    const kind = this.#kindForEquipment(equipmentId);
    if (!kind) return false;
    const ok = this.#topology.place(slotId, kind);
    if (!ok) return false;
    this.#store.update((st: Readonly<CircuitState>) => ({
      placed: { ...st.placed, [slotId]: { equipmentId, kind } } as Partial<Record<SlotId, PlacedInstrument>>,
    }));
    this.#afterCircuitChange();
    return true;
  }

  /** Программно замкнуть/разомкнуть ключ (для тестов). */
  setKeyClosed(closed: boolean): void {
    this.#store.set({ keyClosed: closed });
    this.#assembly.setKeyClosed(closed);
    this.#afterCircuitChange();
  }

  /** Программно установить напряжение (для тестов). */
  setVoltage(v: number): void {
    const clamped = Math.max(1.5, Math.min(7.5, v));
    this.#store.set({ voltage: clamped });
    this.#refs.voltageInput.value = String(clamped);
    this.#refs.voltageReadout.textContent = `${clamped.toFixed(1).replace('.', ',')} В`;
    this.#afterCircuitChange();
  }

  /**
   * Записать измерение в журнал (§21 semi-auto / fully-auto trigger).
   * Вызывается через pending-плашку либо программно (автотесты).
   */
  recordMeasurement(): void {
    const st = this.#store.get();
    if (!this.#topology.validate().ok) return;
    if (!st.keyClosed) return;

    const resistorSlot = st.placed['resistor'];
    if (!resistorSlot) return;

    const variant = this.#variantForEquipment(resistorSlot.equipmentId);
    const R = RESISTANCE_BY_VARIANT[variant] ?? 4.7;
    const U = st.voltage;
    const I = circuitCurrent(U, R);

    const measurement: CircuitMeasurement = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      resistorVariant: variant,
      resistanceOhm: R,
      voltageV: U,
      currentA: I,
    };

    this.#store.update((s: Readonly<CircuitState>) => ({
      measurements: [...s.measurements, measurement],
    }));
    this.#lastRecordedSignature = this.#pendingSignature();
    this.#refreshUi();
    this.#hints.announce(
      `Записано: U = ${U.toFixed(2).replace('.', ',')} В, I = ${I.toFixed(2).replace('.', ',')} А.`,
    );
  }

  /** Сброс установки. */
  reset(): void {
    this.#drag.cancel();
    this.#topology.reset();
    this.#assembly.setKeyClosed(false);
    this.#store.set({ ...INITIAL_STATE });
    // §21 — очистить drafts + verdicts + сигнатуру
    this.#journalDrafts.clear();
    this.#journalVerdicts.clear();
    this.#lastRecordedSignature = '';
    // Вернуть карточки в «available»
    for (const card of this.#cardByEquipmentId.values()) {
      card.setAttribute('status', 'available');
      card.removeAttribute('data-placed');
    }
    this.#refs.voltageInput.value = '4.5';
    this.#refs.voltageReadout.textContent = '4,5 В';
    this.#refreshUi();
    this.#hints.update(this.#store.get());
    this.#hints.announce('Установка сброшена. Все приборы вернулись в комплект.');
  }

  /** Cleanup при unmount. */
  destroy(): void {
    this.#drag.cancel();
    this.#assembly.destroy();
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
    window.removeEventListener('resize', this.#onResize);
  }

  // ─── Wiring ──────────────────────────────────────────────────────────────

  #wireUp(): void {
    // Карточки оборудования → drag
    this.#refs.cards.forEach((card) => {
      const equipmentId = card.dataset['eq'] as EquipmentId | undefined;
      if (!equipmentId) return;
      this.#cardByEquipmentId.set(equipmentId, card);

      const kind = this.#kindForEquipment(equipmentId);
      if (!kind) return;

      const draggable = card.querySelector<HTMLElement>(
        'lab-power-source, lab-voltmeter, lab-ammeter, lab-resistor, lab-key',
      );
      if (!draggable) return;

      this.#drag.attach(draggable, {
        equipmentId,
        kind,
        onDragStart: () => this.#store.set({ dragging: equipmentId }),
        onDragEnd: () => this.#store.set({ dragging: null }),
      });

      // Card drop-zone: возврат прибора из слота → карточка
      const cardDropZoneId = card.dataset['dropzoneId'];
      if (cardDropZoneId) {
        this.#drag.addSnapZone({
          id: cardDropZoneId,
          accepts: [kind],
          getRect: () => card.getBoundingClientRect(),
          onHover: (active) => {
            card.toggleAttribute('data-drop-hover', active);
          },
          onDrop: () => {
            // Drop on own card = no-op (already in card)
            return false;
          },
        });
      }
    });

    // Board slots already wired by CircuitAssembly
    // We need to intercept CircuitAssembly onDrop to update our store
    this.#rewireAssemblySlots();

    // Reset
    this.#refs.resetBtn.addEventListener('click', () => this.reset());

    // Key button
    this.#refs.keyBtn.addEventListener('click', () => {
      const st = this.#store.get();
      if (!st.placed['key']) return;
      this.setKeyClosed(!st.keyClosed);
    });

    // Voltage slider
    this.#refs.voltageInput.addEventListener('input', () => {
      const v = parseFloat(this.#refs.voltageInput.value);
      if (Number.isFinite(v)) this.setVoltage(v);
    });

    // Measurement panel toggle
    this.#refs.measurementToggle.addEventListener('click', () => {
      const expanded = this.#refs.measurementToggle.getAttribute('aria-expanded') === 'true';
      this.#refs.measurementToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const body = this.#refs.measurementPanel.querySelector<HTMLElement>('#measurement-body');
      if (body) body.hidden = expanded;
    });

    // §20.4 — record-mode toggle
    if (this.#refs.recordModeSlot) {
      injectRecordModeToggleStyles();
      this.#detachRecordModeToggle = renderRecordModeToggle(this.#refs.recordModeSlot, {
        kitId: RECORD_MODE_KIT,
        onChange: () => this.#handleRecordModeChange(),
      });
    }

    // §21.10 — pending-плашка
    if (this.#refs.recordPendingBtn) {
      this.#refs.recordPendingBtn.addEventListener('click', () => {
        this.recordMeasurement();
      });
    }

    window.addEventListener('resize', this.#onResize);
  }

  /**
   * CircuitAssembly регистрирует snap-зоны через DragController, но наш
   * store не знает о дропах. Перегружаем board-зоны дополнительным слоем:
   * после успешного drop в CircuitAssembly обновляем state.placed.
   */
  #rewireAssemblySlots(): void {
    // CircuitAssembly уже зарегистрировал зоны с id 'circuit-slot-<slotId>'.
    // Добавляем observing через кастомные события на board.
    // Вместо этого добавим свои зоны-обёртки поверх assembly (overwrite).
    for (const slotDef of SLOTS_3_1) {
      const slotId = slotDef.id as SlotId;
      const zoneId = `circuit-slot-${slotId}`;

      // Re-register to intercept drop (assembly already registered,
      // we need to also track in our store).
      // We do this by removing and re-adding with wrapper onDrop.
      this.#drag.removeSnapZone(zoneId);

      const slotEl = this.#refs.circuitBoard.querySelector<HTMLElement>(`[data-slot="${slotId}"]`);

      this.#drag.addSnapZone({
        id: zoneId,
        accepts: Array.from(slotDef.accepts),
        getRect: () => this.#refs.circuitBoard.getSlotRect(slotId),
        onHover: (active) => {
          slotEl?.classList.toggle('drop-zone--active', active);
        },
        onDrop: ({ equipmentId }) => {
          const kind = this.#kindForEquipment(equipmentId as EquipmentId);
          if (!kind) return false;

          // First check accepts
          if (!(slotDef.accepts as ReadonlyArray<string>).includes(kind)) return false;

          // Check slot not already filled
          if (this.#topology.slotFilledBy(slotId) !== null) return false;

          const ok = this.#topology.place(slotId, kind);
          if (!ok) return false;

          // Update store
          this.#store.update((st: Readonly<CircuitState>) => ({
            placed: {
              ...st.placed,
              [slotId]: { equipmentId: equipmentId as EquipmentId, kind },
            } as Partial<Record<SlotId, PlacedInstrument>>,
          }));

          // Mark card as placed
          const card = this.#cardByEquipmentId.get(equipmentId as EquipmentId);
          if (card) {
            card.setAttribute('status', 'placed');
            card.dataset['placed'] = slotId;
          }

          this.#assembly.setKeyClosed(this.#store.get().keyClosed);
          this.#afterCircuitChange();
          return true;
        },
      });
    }
  }

  #afterCircuitChange(): void {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    this.#assembly.setKeyClosed(ok && st.keyClosed);

    // Update instrument displays when circuit is live
    if (ok && st.keyClosed) {
      const resistorSlot = st.placed['resistor'];
      if (resistorSlot) {
        const variant = this.#variantForEquipment(resistorSlot.equipmentId);
        const R = RESISTANCE_BY_VARIANT[variant] ?? 4.7;
        const U = st.voltage;
        const I = circuitCurrent(U, R);

        // Update voltmeter and ammeter visuals
        const voltmeterCard = this.#cardByEquipmentId.get(
          st.placed['voltmeter']?.equipmentId as EquipmentId,
        );
        const ammeterCard = this.#cardByEquipmentId.get(
          st.placed['ammeter']?.equipmentId as EquipmentId,
        );

        if (voltmeterCard) {
          const vm = voltmeterCard.querySelector('lab-voltmeter');
          vm?.setAttribute('value', U.toFixed(2));
        }
        if (ammeterCard) {
          const am = ammeterCard.querySelector('lab-ammeter');
          am?.setAttribute('value', I.toFixed(2));
        }

        // fully-auto: auto-record on circuit closure
        if (this.#recordMode() === 'fully-auto' && this.#pendingSignature() !== this.#lastRecordedSignature) {
          this.recordMeasurement();
        }
      }
    }

    this.#refreshUi();
    this.#hints.update(st);
  }

  #handleRecordModeChange(): void {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    if (this.#recordMode() === 'fully-auto' && ok && st.keyClosed) {
      if (this.#pendingSignature() !== this.#lastRecordedSignature) {
        this.recordMeasurement();
      }
    }
    this.#refreshUi();
  }

  // ─── UI refresh ──────────────────────────────────────────────────────────

  #refreshUi(): void {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    const isLive = ok && st.keyClosed;

    // Key control visibility
    const keyPlaced = !!st.placed['key'];
    this.#refs.keyControl.hidden = !keyPlaced;
    if (keyPlaced) {
      const closed = st.keyClosed;
      this.#refs.keyBtn.setAttribute('aria-pressed', closed ? 'true' : 'false');
      this.#refs.keyBtn.className = `key-btn key-btn--${closed ? 'closed' : 'open'}`;
      this.#refs.keyBtnLabel.textContent = closed ? 'Разомкнуть ключ' : 'Замкнуть ключ';
    }

    // Voltage control visibility
    this.#refs.voltageControl.hidden = !st.placed['source'];

    // Measurement panel state
    const hasMeasurements = st.measurements.length > 0;
    this.#refs.measurementPanel.dataset['state'] = isLive ? 'live' : hasMeasurements ? 'recorded' : 'empty';

    // Measurement count badge
    if (hasMeasurements) {
      this.#refs.measurementCount.hidden = false;
      this.#refs.measurementCount.textContent = String(st.measurements.length);
    } else {
      this.#refs.measurementCount.hidden = true;
    }

    // Journal empty / host visibility
    this.#refs.journalEmpty.hidden = hasMeasurements || isLive;
    if (this.#refs.formulaDisplay) {
      this.#refs.formulaDisplay.hidden = !hasMeasurements;
    }

    // Pending-плашка visibility (semi-auto mode)
    const isPending = isLive && this.#pendingSignature() !== this.#lastRecordedSignature;
    const mode = this.#recordMode();
    if (this.#refs.recordPendingSlot) {
      this.#refs.recordPendingSlot.hidden = !(isPending && mode === 'semi-auto');
    }
    if (this.#refs.recordPendingSummary && isPending) {
      const U = st.voltage;
      const resistorSlot = st.placed['resistor'];
      if (resistorSlot) {
        const variant = this.#variantForEquipment(resistorSlot.equipmentId);
        const R = RESISTANCE_BY_VARIANT[variant] ?? 4.7;
        const I = circuitCurrent(U, R);
        this.#refs.recordPendingSummary.textContent =
          `U=${U.toFixed(1).replace('.', ',')} В, I=${I.toFixed(2).replace('.', ',')} А`;
      }
    }

    // Render journal table (§21)
    if (hasMeasurements && this.#refs.journalHost) {
      this.#refs.journalHost.hidden = false;
      const rows = this.#buildJournalRows(st);
      renderJournalTable(this.#refs.journalHost, RESISTANCE_SPEC, rows, {
        mode: mode as 'semi-auto' | 'fully-manual' | 'fully-auto',
        onCellInput: (rowIdx, key, value) => {
          const row = st.measurements[rowIdx - 1];
          if (!row) return;
          const drafts = this.#journalDrafts.get(row.timestamp) ?? {};
          if (value !== null) {
            drafts[key] = value;
          } else {
            delete drafts[key];
          }
          this.#journalDrafts.set(row.timestamp, drafts);
        },
        onVerify: (rowIdx) => {
          const row = st.measurements[rowIdx - 1];
          if (!row) return;
          const drafts = this.#journalDrafts.get(row.timestamp) ?? {};
          const journalRow = this.#buildJournalRow(row, rowIdx);
          // Merge drafts into values
          for (const [k, v] of Object.entries(drafts)) {
            journalRow.values[k] = v;
          }
          const verdicts = verifyRow(RESISTANCE_SPEC.columns, journalRow);
          this.#journalVerdicts.set(row.timestamp, verdicts);
          this.#refreshUi();
        },
      });
    } else if (this.#refs.journalHost) {
      this.#refs.journalHost.hidden = true;
    }

    // Steps highlight
    this.#updateSteps(st);
  }

  #buildJournalRows(st: CircuitState): JournalRow[] {
    return st.measurements.map((m, i) => {
      const row = this.#buildJournalRow(m, i + 1);
      // Apply drafts
      const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
      for (const [k, v] of Object.entries(drafts)) {
        row.values[k] = v;
      }
      // Apply verdicts
      const verdicts = this.#journalVerdicts.get(m.timestamp);
      if (verdicts) row.verdicts = verdicts;
      return row;
    });
  }

  #buildJournalRow(m: CircuitMeasurement, idx: number): JournalRow {
    const mode = this.#recordMode();
    const isFullyAuto = mode === 'fully-auto';
    return {
      idx,
      timestamp: m.timestamp,
      values: {
        idx,
        resistor: m.resistorVariant,
        U_V: m.voltageV,
        I_A: m.currentA,
        R_Ohm: isFullyAuto ? m.resistanceOhm : null,
      },
    };
  }

  #pendingSignature(): string {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    if (!ok || !st.keyClosed) return '';
    return `${st.voltage.toFixed(2)}-${st.placed['resistor']?.equipmentId ?? ''}`;
  }

  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  #updateSteps(st: CircuitState): void {
    const { ok } = this.#topology.validate();
    const allPlaced = ok;
    const steps = this.#refs.steps.querySelectorAll<HTMLElement>('.step');
    steps.forEach((s, i) => {
      let active = false;
      if (i === 0) active = !allPlaced;
      if (i === 1) active = allPlaced && !st.keyClosed;
      if (i === 2) active = allPlaced && st.keyClosed;
      if (i === 3) active = st.measurements.length > 0;
      s.dataset['state'] = active ? 'active' : '';
      s.setAttribute('aria-current', active ? 'step' : 'false');
    });
  }

  #onResize = (): void => {
    // No-op — board slots adapt via getBoundingClientRect at drop time
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

  #kindForEquipment(id: EquipmentId): EqKind | null {
    const map: Record<EquipmentId, EqKind> = {
      'power-source':  'power-source',
      'voltmeter':     'voltmeter',
      'ammeter':       'ammeter',
      'resistor-r1':   'resistor',
      'resistor-r2':   'resistor',
      'key':           'key',
    };
    return map[id] ?? null;
  }

  #variantForEquipment(id: EquipmentId): string {
    if (id === 'resistor-r1') return 'R1';
    if (id === 'resistor-r2') return 'R2';
    return 'R1';
  }
}
