/**
 * IvCurveExperiment — оркестратор опыта 3.4 «ВАХ резистора и лампочки».
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (стр.18), п.4 + КОДИФ §1.29:
 * «исследование зависимости силы тока в проводнике (резисторы, лампочка)
 *  от напряжения» — метод амперметра-вольтметра.
 *
 * Методичка ЛАБОСФЕРА §2.2.8 (стр.24):
 * «Резистор: ВАХ линейна (I=U/R=const). Лампочка: ВАХ вогнута (R растёт
 *  с нагревом нити). Наложение двух серий на один график.»
 *
 * Workflow:
 *   1. Drag 5 приборов → гнёзда lab-circuit-board (резистор ИЛИ лампа в «Элемент»).
 *   2. Замкнуть ключ → вольтметр + амперметр оживают; для лампы — свечение.
 *   3. Записать N точек (U, I) на элемент → точка идёт в серию серии элемента.
 *   4. reset() (цепь) → сменить элемент → записать N точек на другой элемент.
 *   5. Обе серии накладываются на lab-graph. clear-data-btn → полная очистка.
 *
 * Ключевые различия от MeasurementsExperiment:
 *   - EqKind += 'lamp'; EquipmentId += 'lamp'.
 *   - SLOTS_IV: resistor-слот принимает ['resistor','lamp'] (гнездо «Элемент»).
 *   - Ток: lamp → lampCurrent(U), resistor → current(U, 4.7).
 *   - measurement.element: 'Резистор' | 'Лампа'.
 *   - Graf #iv-graph: две серии overlaid; resistor fit:'line', lamp fit:'curve'.
 *   - reset(clearData=false): сохраняет измерения/серии; reset(true) — полная очистка.
 *   - Нет task-switcher, нет time-control, нет stopwatch.
 *
 * §21 — журнал v2 (renderJournalTable + IV_CURVE_SPEC + record-mode 'kit-3').
 */

import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import type { LabGraph } from '@ui/components/lab-graph';
import type { LabLamp } from '@ui/components/lab-lamp';
import { Store } from '@controller/Store';
import { CircuitTopology, CircuitAssembly } from '@controller/CircuitAssembly';
import { CircuitDragController } from '@controller/CircuitDragController';
import {
  current as circuitCurrent,
  lampCurrent,
} from '@physics/circuit/CircuitModel';

// §21 — единый журнал v2
import {
  getRecordMode,
  injectRecordModeToggleStyles,
  renderRecordModeToggle,
  type RecordMode,
} from '@labosfera/shared-spa/lib/record-mode';
import { renderJournalTable } from '@labosfera/shared-spa/lib/journal/render';
import { verifyRow } from '@labosfera/shared-spa/lib/journal/verify';
import { IV_CURVE_SPEC } from '@labosfera/shared-spa/lib/journal/specs';
import type { JournalRow, JournalVerdict } from '@labosfera/shared-spa/lib/journal/types';
import type { GraphPoint } from '@ui/components/lab-graph';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** ID оборудования в комплекте (опыт 3.4) */
export type EquipmentId =
  | 'power-source' | 'voltmeter' | 'ammeter'
  | 'resistor-r1' | 'lamp' | 'key';

/** ID слотов на монтажной плате */
export type SlotId = 'source' | 'key' | 'ammeter' | 'resistor' | 'voltmeter';

/** Тип прибора для drag-kind и slot.accepts */
export type EqKind = 'power-source' | 'voltmeter' | 'ammeter' | 'resistor' | 'lamp' | 'key';

interface PlacedInstrument {
  equipmentId: EquipmentId;
  kind: EqKind;
}

interface IvState {
  /** Размещённые приборы в слотах */
  placed: Partial<Record<SlotId, PlacedInstrument>>;
  /** Ключ замкнут */
  keyClosed: boolean;
  /** Напряжение источника (В) */
  voltage: number;
  /** Список всех записанных измерений (оба элемента накапливаются) */
  measurements: IvMeasurement[];
  /** Что сейчас тащат */
  dragging: EquipmentId | null;
}

export interface IvMeasurement {
  readonly id: string;
  readonly timestamp: number;
  readonly element: 'Резистор' | 'Лампа';
  readonly voltageV: number;
  readonly currentA: number;
}

const INITIAL_STATE: IvState = {
  placed: {},
  keyClosed: false,
  voltage: 4.5,
  measurements: [],
  dragging: null,
};

/** Топология опыта 3.4: гнездо 'resistor' принимает и резистор, и лампу («Элемент»). */
const SLOTS_IV = [
  { id: 'source',    role: 'source' as const,   accepts: ['power-source'] as const },
  { id: 'key',       role: 'key' as const,       accepts: ['key'] as const },
  { id: 'ammeter',   role: 'series' as const,    accepts: ['ammeter'] as const },
  { id: 'resistor',  role: 'series' as const,    accepts: ['resistor', 'lamp'] as const },
  { id: 'voltmeter', role: 'parallel' as const,  accepts: ['voltmeter'] as const },
] as const;

/** Сопротивление R1 (Ом, ФИПИ-паспорт). */
const R_R1 = 4.7;
const RECORD_MODE_KIT = 'kit-3';

// ─── HintEngine (tiny) ───────────────────────────────────────────────────────

class HintEngine {
  #bar: HTMLElement;
  #live: HTMLElement;

  constructor(bar: HTMLElement, live: HTMLElement) {
    this.#bar = bar;
    this.#live = live;
  }

  update(st: IvState): void {
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
        resistor:  'элемент (резистор или лампочку)',
        voltmeter: 'вольтметр',
      };
      const missingLabels = missing.map((id) => labels[id]).join(', ');
      this.#set(`Добавьте в цепь: ${missingLabels}.`);
      return;
    }
    if (!st.keyClosed) {
      this.#set('Цепь собрана. Нажмите «Замкнуть ключ», чтобы включить ток и снять точку ВАХ.');
      return;
    }

    const el = placed['resistor'];
    const elName = el?.kind === 'lamp' ? 'лампочки' : 'резистора';
    this.#set(`Ток течёт через ${elName}. Измените напряжение и записывайте точки I(U).`);
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
  clearDataBtn: HTMLButtonElement;
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
  resultPanel: HTMLElement;
  graphSection: HTMLElement;
  ivGraph: LabGraph;
  cards: NodeListOf<LabEquipmentCard>;
  // §21 — журнал v2
  recordModeSlot?: HTMLElement | undefined;
  journalHost?: HTMLElement | undefined;
  recordPendingSlot?: HTMLElement | undefined;
  recordPendingBtn?: HTMLButtonElement | undefined;
  recordPendingSummary?: HTMLElement | undefined;
}

// ─── IvCurveExperiment ───────────────────────────────────────────────────────

export class IvCurveExperiment {
  #refs: ExperimentRefs;
  #store: Store<IvState>;
  #drag: CircuitDragController<EqKind, EquipmentId>;
  #hints: HintEngine;
  #topology: CircuitTopology;
  #assembly: CircuitAssembly;
  #cardByEquipmentId = new Map<EquipmentId, LabEquipmentCard>();

  /** Точки серии резистора для графика */
  #resistorPoints: GraphPoint[] = [];
  /** Точки серии лампы для графика */
  #lampPoints: GraphPoint[] = [];

  /** §21 — drafts (черновики derived-input) и verdicts */
  #journalDrafts = new Map<number, Record<string, number>>();
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #detachRecordModeToggle: (() => void) | null = null;
  #lastRecordedSignature = '';
  #rewiredSlotIds: string[] = [];

  constructor(refs: ExperimentRefs) {
    this.#refs = refs;
    this.#store = new Store<IvState>({ ...INITIAL_STATE });
    this.#drag = new CircuitDragController<EqKind, EquipmentId>(refs.dragOverlay);
    this.#hints = new HintEngine(refs.hintBar, refs.liveRegion);

    this.#topology = new CircuitTopology(SLOTS_IV);
    this.#assembly = new CircuitAssembly(refs.circuitBoard, this.#topology, this.#drag);

    this.#wireUp();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
  }

  // ─── Public API (для тестов, Playwright selfcheck и отладки) ─────────────

  /** Все записанные измерения (оба элемента). */
  get measurements(): ReadonlyArray<IvMeasurement> {
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

    // Проверить accepts для этого слота
    const slotDef = SLOTS_IV.find((s) => s.id === slotId);
    if (!slotDef) return false;
    if (!(slotDef.accepts as ReadonlyArray<string>).includes(kind)) return false;

    const ok = this.#topology.place(slotId, kind);
    if (!ok) return false;
    this.#store.update((st: Readonly<IvState>) => ({
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
    const clamped = Math.max(1.0, Math.min(7.5, v));
    this.#store.set({ voltage: clamped });
    this.#refs.voltageInput.value = String(clamped);
    this.#refs.voltageReadout.textContent = `${clamped.toFixed(1).replace('.', ',')} В`;
    this.#afterCircuitChange();
  }

  /**
   * Записать точку ВАХ в журнал.
   * Вызывается через pending-плашку либо программно (автотесты).
   */
  recordMeasurement(): void {
    const st = this.#store.get();
    if (!this.#topology.validate().ok) return;
    if (!st.keyClosed) return;

    const elementSlot = st.placed['resistor'];
    if (!elementSlot) return;

    const U = st.voltage;
    const isLamp = elementSlot.kind === 'lamp';
    const I = isLamp ? lampCurrent(U) : circuitCurrent(U, R_R1);

    const measurement: IvMeasurement = {
      id: `iv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      element: isLamp ? 'Лампа' : 'Резистор',
      voltageV: U,
      currentA: I,
    };

    this.#store.update((s: Readonly<IvState>) => ({
      measurements: [...s.measurements, measurement],
    }));

    // Добавить точку в соответствующую серию графика
    const pt: GraphPoint = {
      id: measurement.id,
      x: U,
      y: I,
      label: `${measurement.element}: U=${U.toFixed(1)} В, I=${I.toFixed(3)} А`,
    };
    if (isLamp) {
      this.#lampPoints = [...this.#lampPoints, pt];
    } else {
      this.#resistorPoints = [...this.#resistorPoints, pt];
    }

    this.#lastRecordedSignature = this.#pendingSignature();
    this.#refreshUi();
    this.#hints.announce(
      `Записано: ${measurement.element}, U = ${U.toFixed(2).replace('.', ',')} В, I = ${I.toFixed(3).replace('.', ',')} А.`,
    );
  }

  /**
   * Сброс состояния.
   * reset(clearData=false) — сбрасывает ТОЛЬКО цепь (для смены элемента),
   * СОХРАНЯЕТ измерения и серии графика (наложение резистор+лампа).
   * reset(clearData=true) — полная очистка (кнопка «Очистить график»).
   */
  reset(clearData = false): void {
    this.#drag.cancel();
    this.#topology.reset();
    this.#assembly.setKeyClosed(false);

    if (clearData) {
      this.#store.set({ ...INITIAL_STATE });
      this.#resistorPoints = [];
      this.#lampPoints = [];
      this.#journalDrafts.clear();
      this.#journalVerdicts.clear();
      this.#lastRecordedSignature = '';
    } else {
      // Сохраняем измерения, сбрасываем только цепь/ключ/слоты
      const measurements = this.#store.get().measurements;
      this.#store.set({ ...INITIAL_STATE, measurements });
    }

    // Вернуть карточки в «available»
    for (const card of this.#cardByEquipmentId.values()) {
      card.setAttribute('status', 'available');
      card.removeAttribute('data-placed');
    }
    this.#refs.voltageInput.value = '4.5';
    this.#refs.voltageReadout.textContent = '4,5 В';
    this.#refreshUi();
    this.#hints.update(this.#store.get());
    if (clearData) {
      this.#hints.announce('График и журнал очищены. Все приборы вернулись в комплект.');
    } else {
      this.#hints.announce('Цепь сброшена. Данные сохранены — смените элемент и продолжайте.');
    }
  }

  /** Cleanup при unmount. */
  destroy(): void {
    this.#drag.cancel();
    for (const id of this.#rewiredSlotIds) {
      this.#drag.removeSnapZone(id);
    }
    this.#rewiredSlotIds = [];
    this.#assembly.destroy();
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
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
        'lab-power-source, lab-voltmeter, lab-ammeter, lab-resistor, lab-lamp, lab-key',
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
          onDrop: () => false,
        });
      }
    });

    this.#rewireAssemblySlots();

    // Reset (цепь, НЕ данные)
    this.#refs.resetBtn.addEventListener('click', () => this.reset(false));

    // Clear data (полная очистка)
    this.#refs.clearDataBtn.addEventListener('click', () => this.reset(true));

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
  }

  /**
   * Перегружаем board-зоны дополнительным слоем:
   * после успешного drop в CircuitAssembly обновляем state.placed.
   */
  #rewireAssemblySlots(): void {
    this.#rewiredSlotIds = [];
    for (const slotDef of SLOTS_IV) {
      const slotId = slotDef.id as SlotId;
      // Use the same zone-ID prefix as CircuitAssembly so we REPLACE its handler
      // (CircuitAssembly registers 'circuit-slot-<id>'; using a different prefix
      //  would leave the Assembly's handler first in the Map and our onDrop
      //  would never be called — because #findZone returns the first match).
      const zoneId = `circuit-slot-${slotId}`;

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

          if (!(slotDef.accepts as ReadonlyArray<string>).includes(kind)) return false;
          if (this.#topology.slotFilledBy(slotId) !== null) return false;

          const ok = this.#topology.place(slotId, kind);
          if (!ok) return false;

          this.#store.update((st: Readonly<IvState>) => ({
            placed: {
              ...st.placed,
              [slotId]: { equipmentId: equipmentId as EquipmentId, kind },
            } as Partial<Record<SlotId, PlacedInstrument>>,
          }));

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
      this.#rewiredSlotIds.push(zoneId);
    }
  }

  #afterCircuitChange(): void {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    this.#assembly.setKeyClosed(ok && st.keyClosed);

    // Update instrument displays when circuit is live
    if (ok && st.keyClosed) {
      const elementSlot = st.placed['resistor'];
      if (elementSlot) {
        const U = st.voltage;
        const isLamp = elementSlot.kind === 'lamp';
        const I = isLamp ? lampCurrent(U) : circuitCurrent(U, R_R1);

        // Voltmeter
        const voltmeterCard = this.#cardByEquipmentId.get(
          st.placed['voltmeter']?.equipmentId as EquipmentId,
        );
        if (voltmeterCard) {
          const vm = voltmeterCard.querySelector('lab-voltmeter');
          vm?.setAttribute('value', U.toFixed(2));
        }

        // Ammeter
        const ammeterCard = this.#cardByEquipmentId.get(
          st.placed['ammeter']?.equipmentId as EquipmentId,
        );
        if (ammeterCard) {
          const am = ammeterCard.querySelector('lab-ammeter');
          am?.setAttribute('value', I.toFixed(3));
        }

        // Lamp glow
        if (isLamp) {
          const lampCard = this.#cardByEquipmentId.get('lamp');
          if (lampCard) {
            const lamp = lampCard.querySelector<LabLamp>('lab-lamp');
            lamp?.setAttribute('current', String(I));
          }
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
    const hasMeasurements = st.measurements.length > 0;

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

    // Graph section
    this.#refs.graphSection.hidden = !hasMeasurements;

    // Measurement panel state
    this.#refs.measurementPanel.dataset['state'] = isLive ? 'live' : hasMeasurements ? 'recorded' : 'empty';

    // Count badge (all measurements)
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
      const elementSlot = st.placed['resistor'];
      if (elementSlot) {
        const U = st.voltage;
        const isLamp = elementSlot.kind === 'lamp';
        const I = isLamp ? lampCurrent(U) : circuitCurrent(U, R_R1);
        const elName = isLamp ? 'Лампа' : 'Резистор';
        this.#refs.recordPendingSummary.textContent =
          `${elName}: U=${U.toFixed(1).replace('.', ',')} В, I=${I.toFixed(3).replace('.', ',')} А`;
      }
    }

    // Render graph
    this.#renderGraph();

    // Render journal table (§21)
    if (hasMeasurements && this.#refs.journalHost) {
      this.#refs.journalHost.hidden = false;
      const rows = this.#buildJournalRows(st.measurements);
      renderJournalTable(this.#refs.journalHost, IV_CURVE_SPEC, rows, {
        mode: mode as 'semi-auto' | 'fully-manual' | 'fully-auto',
        onCellInput: (rowIdx, key, value) => {
          const m = st.measurements[rowIdx - 1];
          if (!m) return;
          const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
          if (value !== null) drafts[key] = value; else delete drafts[key];
          this.#journalDrafts.set(m.timestamp, drafts);
        },
        onVerify: (rowIdx) => {
          const m = st.measurements[rowIdx - 1];
          if (!m) return;
          const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
          const journalRow = this.#buildJournalRow(m, rowIdx);
          for (const [k, v] of Object.entries(drafts)) journalRow.values[k] = v;
          const verdicts = verifyRow(IV_CURVE_SPEC.columns, journalRow);
          this.#journalVerdicts.set(m.timestamp, verdicts);
          this.#refreshUi();
        },
      });
    } else if (this.#refs.journalHost) {
      this.#refs.journalHost.hidden = true;
    }
  }

  #renderGraph(): void {
    this.#refs.ivGraph.data = {
      xLabel: 'U, В',
      yLabel: 'I, А',
      xMax: 8,
      yMax: 1,
      series: [
        {
          id: 'resistor',
          color: '#38bdaf',
          fit: 'line',
          points: this.#resistorPoints,
        },
        {
          id: 'lamp',
          color: '#f59e0b',
          fit: 'curve',
          points: this.#lampPoints,
        },
      ],
    };
  }

  #buildJournalRows(list: ReadonlyArray<IvMeasurement>): JournalRow[] {
    return list.map((m, i) => {
      const row = this.#buildJournalRow(m, i + 1);
      const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
      for (const [k, v] of Object.entries(drafts)) row.values[k] = v;
      const verdicts = this.#journalVerdicts.get(m.timestamp);
      if (verdicts) row.verdicts = verdicts;
      return row;
    });
  }

  #buildJournalRow(m: IvMeasurement, idx: number): JournalRow {
    const isFullyAuto = this.#recordMode() === 'fully-auto';
    return {
      idx,
      timestamp: m.timestamp,
      values: {
        idx,
        element: m.element,
        U_V: m.voltageV,
        I_A: m.currentA,
        R_Ohm: isFullyAuto ? (m.currentA > 0 ? m.voltageV / m.currentA : 0) : null,
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

  // ─── Helpers ─────────────────────────────────────────────────────────────

  #kindForEquipment(id: EquipmentId): EqKind | null {
    const map: Record<EquipmentId, EqKind> = {
      'power-source': 'power-source',
      'voltmeter':    'voltmeter',
      'ammeter':      'ammeter',
      'resistor-r1':  'resistor',
      'lamp':         'lamp',
      'key':          'key',
    };
    return map[id] ?? null;
  }
}
