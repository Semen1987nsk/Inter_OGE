/**
 * WireResistanceExperiment — оркестратор опытов 3.5/3.6/3.7
 * «Зависимость сопротивления проводника от длины / сечения / материала».
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) пп.5/6/7; КОДИФ §1.29:
 *   3.5 — R = ρl/S: варьируем длину l (нихром, S=0,25 мм²).
 *   3.6 — R = ρl/S: варьируем сечение S (нихром, l=2,0 м).
 *   3.7 — R = ρl/S: варьируем материал ρ (l=2,0 м, S=0,25 мм²).
 * Метод амперметра-вольтметра; R = U/I из journal.
 *
 * Набор проволок (WIRE_VARIANTS):
 *   A длина (3.5): нихром S=0,25 мм²  l=0,5/1,0/2,0 м → R=2,2/4,4/8,8 Ом
 *   B сечение (3.6): нихром l=2,0 м   S=0,25/0,5/1,0 мм² → R=8,8/4,4/2,2 Ом
 *   C материал (3.7): l=2,0 м S=0,25  нихром/константан/никелин → R=8,8/4,0/3,2 Ом
 * R∈[2,2;8,8] Ом → при Umax=6 В I≤2,7 А ≤ амперметр 0–3 А.
 *
 * Workflow (мульти-таск A/B/C):
 *   1. Выбрать задачу (вкладка A/B/C) → меняется SPEC/формула журнала.
 *   2. Drag 5 приборов → гнёзда lab-circuit-board (проволока — в «Проволока»).
 *   3. Замкнуть ключ → CircuitModel.current(U, R) → вольтметр + амперметр.
 *   4. Записать строку журнала (U, I) → ученик считает R → ✓ проверка.
 *   5. reset(false) — сохраняет данные, возвращает приборы (смена проволоки).
 *      reset(true) — полная очистка.
 *
 * Result-panel: после ≥2 точек активной задачи — R_теор + вывод о пропорциональности.
 *
 * §21 — журнал v2 (renderJournalTable + R_LENGTH_SPEC/R_AREA_SPEC/R_RHO_SPEC
 *        + record-mode 'kit-3').
 */

import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { Store } from '@controller/Store';
import { CircuitTopology, CircuitAssembly } from '@controller/CircuitAssembly';
import { CircuitDragController } from '@controller/CircuitDragController';
import {
  wireResistance,
  RESISTIVITY,
  current as circuitCurrent,
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
import {
  R_LENGTH_SPEC,
  R_AREA_SPEC,
  R_RHO_SPEC,
} from '@labosfera/shared-spa/lib/journal/specs';
import type { JournalRow, JournalVerdict } from '@labosfera/shared-spa/lib/journal/types';
import type { JournalSpec } from '@labosfera/shared-spa/lib/journal/types';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** Активная задача (A=длина, B=сечение, C=материал). */
export type WireTaskId = 'A-length' | 'B-section' | 'C-rho';

/** ID оборудования в комплекте */
export type EquipmentId =
  | 'power-source' | 'voltmeter' | 'ammeter' | 'key'
  | 'wire-len-05' | 'wire-len-10' | 'wire-len-20'
  | 'wire-sec-025' | 'wire-sec-05' | 'wire-sec-10'
  | 'wire-mat-ni' | 'wire-mat-ko' | 'wire-mat-nk';

/** ID слотов на монтажной плате */
export type SlotId = 'source' | 'key' | 'ammeter' | 'resistor' | 'voltmeter';

/** Тип прибора для drag-kind и slot.accepts */
export type EqKind = 'power-source' | 'voltmeter' | 'ammeter' | 'resistor' | 'key';

interface PlacedInstrument {
  equipmentId: EquipmentId;
  kind: EqKind;
}

interface WireState {
  placed: Partial<Record<SlotId, PlacedInstrument>>;
  keyClosed: boolean;
  voltage: number;
  activeTask: WireTaskId;
  measurements: WireMeasurement[];
  dragging: EquipmentId | null;
}

export interface WireMeasurement {
  readonly id: string;
  readonly timestamp: number;
  readonly task: WireTaskId;
  readonly wireId: EquipmentId;
  readonly material: string;
  readonly length_m: number;
  readonly area_mm2: number;
  readonly U_V: number;
  readonly I_A: number;
}

// ─── Данные вариантов проволок ────────────────────────────────────────────────

interface WireVariant {
  id: EquipmentId;
  task: WireTaskId;
  material: keyof typeof RESISTIVITY;
  length_m: number;
  area_mm2: number;
}

const WIRE_VARIANTS: WireVariant[] = [
  { id: 'wire-len-05', task: 'A-length',  material: 'нихром',    length_m: 0.5, area_mm2: 0.25 },
  { id: 'wire-len-10', task: 'A-length',  material: 'нихром',    length_m: 1.0, area_mm2: 0.25 },
  { id: 'wire-len-20', task: 'A-length',  material: 'нихром',    length_m: 2.0, area_mm2: 0.25 },
  { id: 'wire-sec-025', task: 'B-section', material: 'нихром',   length_m: 2.0, area_mm2: 0.25 },
  { id: 'wire-sec-05',  task: 'B-section', material: 'нихром',   length_m: 2.0, area_mm2: 0.5  },
  { id: 'wire-sec-10',  task: 'B-section', material: 'нихром',   length_m: 2.0, area_mm2: 1.0  },
  { id: 'wire-mat-ni',  task: 'C-rho',    material: 'нихром',    length_m: 2.0, area_mm2: 0.25 },
  { id: 'wire-mat-ko',  task: 'C-rho',    material: 'константан', length_m: 2.0, area_mm2: 0.25 },
  { id: 'wire-mat-nk',  task: 'C-rho',    material: 'никелин',   length_m: 2.0, area_mm2: 0.25 },
];

const WIRE_MAP = new Map<EquipmentId, WireVariant>(
  WIRE_VARIANTS.map((v) => [v.id, v]),
);

const SPEC_BY_TASK: Record<WireTaskId, JournalSpec> = {
  'A-length':  R_LENGTH_SPEC,
  'B-section': R_AREA_SPEC,
  'C-rho':     R_RHO_SPEC,
};

const RECORD_MODE_KIT = 'kit-3';

const INITIAL_STATE: WireState = {
  placed: {},
  keyClosed: false,
  voltage: 4.5,
  activeTask: 'A-length',
  measurements: [],
  dragging: null,
};

/** Топология цепи — та же, что 3.1 (source→key→ammeter→resistor/voltmeter-parallel). */
const SLOTS_WIRE = [
  { id: 'source',    role: 'source' as const,   accepts: ['power-source'] },
  { id: 'key',       role: 'key' as const,       accepts: ['key'] },
  { id: 'ammeter',   role: 'series' as const,    accepts: ['ammeter'] },
  { id: 'resistor',  role: 'series' as const,    accepts: ['resistor'] },
  { id: 'voltmeter', role: 'parallel' as const,  accepts: ['voltmeter'] },
] as const;

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
  // динамическая формула
  formulaExpr?: HTMLElement | undefined;
  formulaUnits?: HTMLElement | undefined;
}

// ─── HintEngine ──────────────────────────────────────────────────────────────

class HintEngine {
  #bar: HTMLElement;
  #live: HTMLElement;

  constructor(bar: HTMLElement, live: HTMLElement) {
    this.#bar = bar;
    this.#live = live;
  }

  update(st: WireState): void {
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
        resistor:  'проволоку',
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

// ─── WireResistanceExperiment ─────────────────────────────────────────────────

export class WireResistanceExperiment {
  #refs: ExperimentRefs;
  #store: Store<WireState>;
  #drag: CircuitDragController<EqKind, EquipmentId>;
  #hints: HintEngine;
  #topology: CircuitTopology;
  #assembly: CircuitAssembly;
  #cardByEquipmentId = new Map<EquipmentId, LabEquipmentCard>();

  /** §21 — drafts (черновики derived-input) и verdicts (вердикты ✓) */
  #journalDrafts = new Map<number, Record<string, number>>();
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #detachRecordModeToggle: (() => void) | null = null;
  #lastRecordedSignature = '';
  #rewiredSlotIds: string[] = [];

  constructor(refs: ExperimentRefs) {
    this.#refs = refs;
    this.#store = new Store<WireState>({ ...INITIAL_STATE });
    this.#drag = new CircuitDragController(refs.dragOverlay);
    this.#hints = new HintEngine(refs.hintBar, refs.liveRegion);

    this.#topology = new CircuitTopology(SLOTS_WIRE);
    this.#assembly = new CircuitAssembly(refs.circuitBoard, this.#topology, this.#drag);

    this.#wireUp();
    this.#refreshEquipmentFilter();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Записанные измерения (read-only snapshot). */
  get measurements(): ReadonlyArray<WireMeasurement> {
    return this.#store.get().measurements;
  }

  /** Текущее напряжение источника (В). */
  get voltage(): number {
    return this.#store.get().voltage;
  }

  /** Активная задача. */
  get activeTask(): WireTaskId {
    return this.#store.get().activeTask;
  }

  /** Переключить задачу (A/B/C). */
  setActiveTask(task: WireTaskId): void {
    this.#store.set({ activeTask: task });
    this.#refreshTaskStepper();
    this.#refreshEquipmentFilter();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
  }

  /** Программно разместить прибор в слот (для тестов). */
  placeInSlot(slotId: SlotId, equipmentId: EquipmentId): boolean {
    const kind = this.#kindForEquipment(equipmentId);
    if (!kind) return false;
    const ok = this.#topology.place(slotId, kind);
    if (!ok) return false;
    this.#store.update((st: Readonly<WireState>) => ({
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

  /** Программно установить напряжение (для тестов).
   * Clamp [1.0, 6.0] В — вольтметр range=6 (урок Фазы C).
   */
  setVoltage(v: number): void {
    const clamped = Math.max(1.0, Math.min(6.0, v));
    this.#store.set({ voltage: clamped });
    this.#refs.voltageInput.value = String(clamped);
    this.#refs.voltageReadout.textContent = `${clamped.toFixed(1).replace('.', ',')} В`;
    this.#afterCircuitChange();
  }

  /**
   * Записать измерение в журнал (§21 semi-auto / fully-auto trigger).
   */
  recordMeasurement(): void {
    const st = this.#store.get();
    if (!this.#topology.validate().ok) return;
    if (!st.keyClosed) return;

    const resistorSlot = st.placed['resistor'];
    if (!resistorSlot) return;

    const variant = WIRE_MAP.get(resistorSlot.equipmentId);
    if (!variant) return;

    const R = wireResistance(RESISTIVITY[variant.material], variant.length_m, variant.area_mm2 * 1e-6);
    const U = st.voltage;
    const I = circuitCurrent(U, R);

    const measurement: WireMeasurement = {
      id: `wm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      task: st.activeTask,
      wireId: resistorSlot.equipmentId,
      material: variant.material,
      length_m: variant.length_m,
      area_mm2: variant.area_mm2,
      U_V: U,
      I_A: I,
    };

    this.#store.update((s: Readonly<WireState>) => ({
      measurements: [...s.measurements, measurement],
    }));
    this.#lastRecordedSignature = this.#pendingSignature();
    this.#refreshUi();
    this.#hints.announce(
      `Записано: U = ${U.toFixed(2).replace('.', ',')} В, I = ${I.toFixed(2).replace('.', ',')} А.`,
    );
  }

  /**
   * Сброс установки.
   * clearData=false — сохраняет measurements (смена проволоки);
   * clearData=true  — полная очистка (кнопка Reset).
   * Всегда сохраняет activeTask.
   */
  reset(clearData = true): void {
    this.#drag.cancel();
    this.#topology.reset();
    this.#assembly.setKeyClosed(false);
    const keepTask = this.#store.get().activeTask;
    const keepMeasurements = clearData ? [] : [...this.#store.get().measurements];
    this.#store.set({ ...INITIAL_STATE, activeTask: keepTask, measurements: keepMeasurements });
    // §21 — сбросить drafts + verdicts + сигнатуру (обязательно, урок Фаз B/C)
    if (clearData) {
      this.#journalDrafts.clear();
      this.#journalVerdicts.clear();
    }
    this.#lastRecordedSignature = '';
    // Вернуть карточки в «available»
    for (const card of this.#cardByEquipmentId.values()) {
      card.setAttribute('status', 'available');
      card.removeAttribute('data-placed');
    }
    this.#refs.voltageInput.value = '4.5';
    this.#refs.voltageReadout.textContent = '4,5 В';
    // Переприменить фильтр панели к сохранённой задаче (секции wire-group).
    this.#refreshEquipmentFilter();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
    this.#hints.announce('Установка сброшена. Все приборы вернулись в комплект.');
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
    this.#refs.cards.forEach((card) => {
      const equipmentId = card.dataset['eq'] as EquipmentId | undefined;
      if (!equipmentId) return;
      this.#cardByEquipmentId.set(equipmentId, card);

      const kind = this.#kindForEquipment(equipmentId);
      if (!kind) return;

      const draggable = card.querySelector<HTMLElement>(
        'lab-power-source, lab-voltmeter, lab-ammeter, lab-wire-resistor, lab-key',
      );
      if (!draggable) return;

      this.#drag.attach(draggable, {
        equipmentId,
        kind,
        onDragStart: () => this.#store.set({ dragging: equipmentId }),
        onDragEnd: () => this.#store.set({ dragging: null }),
      });

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

    this.#refs.resetBtn.addEventListener('click', () => this.reset(true));

    this.#refs.keyBtn.addEventListener('click', () => {
      const st = this.#store.get();
      if (!st.placed['key']) return;
      this.setKeyClosed(!st.keyClosed);
    });

    this.#refs.voltageInput.addEventListener('input', () => {
      const v = parseFloat(this.#refs.voltageInput.value);
      if (Number.isFinite(v)) this.setVoltage(v);
    });

    this.#refs.measurementToggle.addEventListener('click', () => {
      const expanded = this.#refs.measurementToggle.getAttribute('aria-expanded') === 'true';
      this.#refs.measurementToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const body = this.#refs.measurementPanel.querySelector<HTMLElement>('#measurement-body');
      if (body) body.hidden = expanded;
    });

    // §21 — record-mode toggle
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

    // Переключатель задач A/B/C
    this.#refs.steps.addEventListener('click', (ev) => {
      const target = (ev.target as HTMLElement).closest('[data-task]');
      if (!target) return;
      const tid = (target as HTMLElement).dataset['task'] as WireTaskId | undefined;
      if (tid) this.setActiveTask(tid);
    });
    this.#refs.steps.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const target = (ev.target as HTMLElement).closest('[data-task]');
      if (!target) return;
      ev.preventDefault();
      const tid = (target as HTMLElement).dataset['task'] as WireTaskId | undefined;
      if (tid) this.setActiveTask(tid);
    });
  }

  #rewireAssemblySlots(): void {
    this.#rewiredSlotIds = [];
    for (const slotDef of SLOTS_WIRE) {
      const slotId = slotDef.id as SlotId;
      // Используем тот же ID, что и CircuitAssembly ('circuit-slot-*'),
      // чтобы ЗАМЕНИТЬ зону в Map и не дублировать её (иначе circuit-slot-*
      // находится первым и onDrop не обновляет card.dataset['placed']).
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

          this.#store.update((st: Readonly<WireState>) => ({
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

    if (ok && st.keyClosed) {
      const resistorSlot = st.placed['resistor'];
      if (resistorSlot) {
        const variant = WIRE_MAP.get(resistorSlot.equipmentId);
        if (variant) {
          const R = wireResistance(RESISTIVITY[variant.material], variant.length_m, variant.area_mm2 * 1e-6);
          const U = st.voltage;
          const I = circuitCurrent(U, R);

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

    // Key control
    const keyPlaced = !!st.placed['key'];
    this.#refs.keyControl.hidden = !keyPlaced;
    if (keyPlaced) {
      const closed = st.keyClosed;
      this.#refs.keyBtn.setAttribute('aria-pressed', closed ? 'true' : 'false');
      // динамический aria-label (урок Фаз B/C)
      this.#refs.keyBtn.setAttribute('aria-label', closed ? 'Разомкнуть ключ' : 'Замкнуть ключ');
      this.#refs.keyBtn.className = `key-btn key-btn--${closed ? 'closed' : 'open'}`;
      this.#refs.keyBtnLabel.textContent = closed ? 'Разомкнуть ключ' : 'Замкнуть ключ';
    }

    // Voltage control
    this.#refs.voltageControl.hidden = !st.placed['source'];

    // Per-task measurements
    const taskMeasurements = this.#measurementsForTask();
    const hasMeasurements = taskMeasurements.length > 0;

    // Measurement panel state
    this.#refs.measurementPanel.dataset['state'] = isLive ? 'live' : hasMeasurements ? 'recorded' : 'empty';

    // Measurement count badge (per-task)
    if (hasMeasurements) {
      this.#refs.measurementCount.hidden = false;
      this.#refs.measurementCount.textContent = String(taskMeasurements.length);
    } else {
      this.#refs.measurementCount.hidden = true;
    }

    this.#refs.journalEmpty.hidden = hasMeasurements || isLive;
    if (this.#refs.formulaDisplay) {
      this.#refs.formulaDisplay.hidden = !hasMeasurements;
    }

    // Pending-плашка (semi-auto mode)
    const isPending = isLive && this.#pendingSignature() !== this.#lastRecordedSignature;
    const mode = this.#recordMode();
    if (this.#refs.recordPendingSlot) {
      this.#refs.recordPendingSlot.hidden = !(isPending && mode === 'semi-auto');
    }
    if (this.#refs.recordPendingSummary && isPending) {
      const U = st.voltage;
      const resistorSlot = st.placed['resistor'];
      if (resistorSlot) {
        const variant = WIRE_MAP.get(resistorSlot.equipmentId);
        if (variant) {
          const R = wireResistance(RESISTIVITY[variant.material], variant.length_m, variant.area_mm2 * 1e-6);
          const I = circuitCurrent(U, R);
          this.#refs.recordPendingSummary.textContent =
            `U=${U.toFixed(1).replace('.', ',')} В, I=${I.toFixed(2).replace('.', ',')} А`;
        }
      }
    }

    // Render journal table (§21)
    if (hasMeasurements && this.#refs.journalHost) {
      this.#refs.journalHost.hidden = false;
      const spec = this.#currentSpec();
      const rows = this.#buildJournalRows(taskMeasurements);
      renderJournalTable(this.#refs.journalHost, spec, rows, {
        mode: mode as 'semi-auto' | 'fully-manual' | 'fully-auto',
        onCellInput: (rowIdx, key, value) => {
          const row = taskMeasurements[rowIdx - 1];
          if (!row) return;
          const drafts = this.#journalDrafts.get(row.timestamp) ?? {};
          if (value !== null) drafts[key] = value; else delete drafts[key];
          this.#journalDrafts.set(row.timestamp, drafts);
        },
        onVerify: (rowIdx) => {
          const row = taskMeasurements[rowIdx - 1];
          if (!row) return;
          const drafts = this.#journalDrafts.get(row.timestamp) ?? {};
          const journalRow = this.#buildJournalRow(row, rowIdx);
          for (const [k, v] of Object.entries(drafts)) journalRow.values[k] = v;
          const verdicts = verifyRow(spec.columns, journalRow);
          this.#journalVerdicts.set(row.timestamp, verdicts);
          this.#refreshUi();
        },
      });
    } else if (this.#refs.journalHost) {
      this.#refs.journalHost.hidden = true;
    }

    // Result-panel: R_теор + вывод о пропорциональности (≥2 точек)
    this.#refreshResultPanel(taskMeasurements);

    // Formula + Task stepper
    this.#refreshFormula();
    this.#refreshTaskStepper();
  }

  #buildJournalRows(list: WireMeasurement[]): JournalRow[] {
    return list.map((m, i) => {
      const row = this.#buildJournalRow(m, i + 1);
      const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
      for (const [k, v] of Object.entries(drafts)) row.values[k] = v;
      const verdicts = this.#journalVerdicts.get(m.timestamp);
      if (verdicts) row.verdicts = verdicts;
      return row;
    });
  }

  #buildJournalRow(m: WireMeasurement, idx: number): JournalRow {
    const isFullyAuto = this.#recordMode() === 'fully-auto';
    const R_meas = m.U_V / m.I_A;
    return {
      idx, timestamp: m.timestamp,
      values: {
        idx,
        material: m.material,
        l_m: m.length_m,
        S_mm2: m.area_mm2,
        U_V: m.U_V,
        I_A: m.I_A,
        R_Ohm: isFullyAuto ? R_meas : null,
      },
    };
  }

  #pendingSignature(): string {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    if (!ok || !st.keyClosed) return '';
    return `${st.activeTask}-${st.voltage.toFixed(2)}-${st.placed['resistor']?.equipmentId ?? ''}`;
  }

  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  #currentSpec(): JournalSpec {
    return SPEC_BY_TASK[this.#store.get().activeTask];
  }

  #measurementsForTask(): WireMeasurement[] {
    const t = this.#store.get().activeTask;
    return this.#store.get().measurements.filter((m) => m.task === t);
  }

  #refreshTaskStepper(): void {
    const active = this.#store.get().activeTask;
    const items = this.#refs.steps.querySelectorAll<HTMLElement>('[data-task]');
    items.forEach((item) => {
      const isActive = item.dataset['task'] === active;
      item.setAttribute('data-state', isActive ? 'active' : '');
      item.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  /**
   * Фильтр панели по активной задаче: видна только секция проволок текущей задачи.
   *
   * В template.html wire-карточки лежат внутри `<section class="… wire-group--<task>">`,
   * которая стартово может быть `hidden`. Переключать только `card.hidden`
   * НЕДОСТАТОЧНО — родительская секция остаётся hidden и проволоки B/C не видны
   * в браузере (баг ревью Task 4). Поэтому переключаем `hidden` на САМОЙ секции,
   * и дублируем на карточке (на случай плоской разметки без секций-обёрток).
   */
  #refreshEquipmentFilter(): void {
    const active = this.#store.get().activeTask;
    const seenSections = new Set<HTMLElement>();
    this.#refs.cards.forEach((card) => {
      const group = card.dataset['taskGroup'];
      if (!group) return; // не wire-карточка (источник, вольтметр и т.д. всегда видны)
      const visible = group === active;
      card.hidden = !visible;
      const section = card.closest<HTMLElement>('section[class*="wire-group"]');
      if (section && !seenSections.has(section)) {
        seenSections.add(section);
        section.hidden = !visible;
      }
    });
  }

  #refreshFormula(): void {
    const expr = this.#refs.formulaExpr;
    const units = this.#refs.formulaUnits;
    if (expr) {
      expr.innerHTML = '<em>R</em> = <em>U</em> / <em>I</em>';
    }
    if (units) {
      units.innerHTML = '<em>U</em> — в В, <em>I</em> — в А, <em>R</em> — в Ом';
    }
  }

  /**
   * Result-panel: после ≥2 точек активной задачи —
   * теоретические R=ρl/S и вывод о пропорциональности.
   * НЕ грейдируется — это аналитика, а не журнал.
   */
  #refreshResultPanel(taskMeasurements: WireMeasurement[]): void {
    const panel = this.#refs.resultPanel;
    if (taskMeasurements.length < 2) {
      panel.hidden = true;
      return;
    }

    const task = this.#store.get().activeTask;
    let conclusions = '';

    if (task === 'A-length') {
      // R∝l: берём min/max по l_m
      const sorted = [...taskMeasurements].sort((a, b) => a.length_m - b.length_m);
      const first = sorted[0]!;
      const last = sorted[sorted.length - 1]!;
      const R1 = first.U_V / first.I_A;
      const R2 = last.U_V / last.I_A;
      const lRatio = last.length_m / first.length_m;
      const rRatio = R2 / R1;
      conclusions = `R ∝ l: при увеличении длины в ${lRatio.toFixed(1)} раза R вырос в ~${rRatio.toFixed(1)} раза.`;
    } else if (task === 'B-section') {
      // R∝1/S: берём min/max по area_mm2
      const sorted = [...taskMeasurements].sort((a, b) => a.area_mm2 - b.area_mm2);
      const first = sorted[0]!;
      const last = sorted[sorted.length - 1]!;
      const R1 = first.U_V / first.I_A;
      const R2 = last.U_V / last.I_A;
      const sRatio = last.area_mm2 / first.area_mm2;
      const rRatio = R1 / R2;
      conclusions = `R ∝ 1/S: при увеличении сечения в ${sRatio.toFixed(1)} раза R уменьшился в ~${rRatio.toFixed(1)} раза.`;
    } else if (task === 'C-rho') {
      // R∝ρ: перечислить материалы
      const pairs = taskMeasurements.map((m) => {
        const R = wireResistance(RESISTIVITY[m.material as keyof typeof RESISTIVITY], m.length_m, m.area_mm2 * 1e-6);
        return `${m.material}: R_теор=${R.toFixed(1)} Ом, R_изм=${(m.U_V / m.I_A).toFixed(1)} Ом`;
      });
      conclusions = `R ∝ ρ: чем выше удельное сопротивление материала, тем больше R. ` + pairs.join('; ') + '.';
    }

    panel.hidden = false;
    panel.textContent = conclusions;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  #kindForEquipment(id: EquipmentId): EqKind | null {
    if (id === 'power-source') return 'power-source';
    if (id === 'voltmeter')    return 'voltmeter';
    if (id === 'ammeter')      return 'ammeter';
    if (id === 'key')          return 'key';
    if (WIRE_MAP.has(id))      return 'resistor';
    return null;
  }
}
