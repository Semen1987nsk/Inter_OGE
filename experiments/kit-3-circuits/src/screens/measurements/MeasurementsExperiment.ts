/**
 * MeasurementsExperiment — оркестратор опыта 3.1/3.2/3.3 «Электрические цепи».
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (стр.18) + КОДИФ §1.29:
 *   3.1 — измерение сопротивления R = U/I;
 *   3.2 — измерение мощности P = U·I;
 *   3.3 — измерение работы тока A = U·I·t (базовые поля; секундомер добавит Task 3).
 *
 * Методичка ЛАБОСФЕРА §2.2.7 (стр.22):
 * «Амперметр включается последовательно, вольтметр — параллельно резистору.»
 *
 * Workflow (мульти-таск A/B/C):
 *   1. Выбрать задачу (вкладка A/B/C) → меняется SPEC/формула журнала.
 *   2. Drag 5 приборов → гнёзда lab-circuit-board.
 *   3. Замкнуть ключ → CircuitModel.current(U, R) → вольтметр + амперметр оживают.
 *   4. Записать строку журнала (U, I, [P]) → ученик считает → ✓ проверка.
 *   5. Reset — сохраняет выбранную задачу, возвращает приборы.
 *
 * §21 — журнал v2 (renderJournalTable + RESISTANCE_SPEC/POWER_SPEC/WORK_CURRENT_SPEC + record-mode 'kit-3').
 */

import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { Store } from '@controller/Store';
import { CircuitTopology, CircuitAssembly } from '@controller/CircuitAssembly';
import { CircuitDragController } from '@controller/CircuitDragController';
import { current as circuitCurrent, power as circuitPower, workOfCurrent as circuitWork } from '@physics/circuit/CircuitModel';

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
  RESISTANCE_SPEC, POWER_SPEC, WORK_CURRENT_SPEC,
} from '@labosfera/shared-spa/lib/journal/specs';
import type { JournalRow, JournalVerdict } from '@labosfera/shared-spa/lib/journal/types';
import type { JournalSpec } from '@labosfera/shared-spa/lib/journal/types';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** Активная задача опыта (A=R, B=P, C=A=U·I·t). */
export type CircuitTaskId = 'A-resistance' | 'B-power' | 'C-work';

/** ID оборудования в комплекте */
export type EquipmentId =
  | 'power-source' | 'voltmeter' | 'ammeter'
  | 'resistor-r1' | 'resistor-r2' | 'resistor-r3' | 'key';

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
  /** Активная задача опыта (A=R, B=P, C=A=U·I·t). */
  activeTask: CircuitTaskId;
  /** Список записанных измерений */
  measurements: CircuitMeasurement[];
  /** Что сейчас тащат */
  dragging: EquipmentId | null;
  /** Выбранное время для опыта 3.3 (с) */
  timeS: number;
}

export interface CircuitMeasurement {
  readonly id: string;
  readonly timestamp: number;
  readonly task: CircuitTaskId;
  readonly resistorVariant: string;
  readonly resistanceOhm: number;
  readonly voltageV: number;
  readonly currentA: number;
  readonly powerW: number;
  readonly timeS: number | null;  // только задача C
  readonly workJ: number | null;  // только задача C
}

const INITIAL_STATE: CircuitState = {
  placed: {},
  keyClosed: false,
  voltage: 4.5,
  activeTask: 'A-resistance',
  measurements: [],
  dragging: null,
  timeS: 60,
};

/** Топология опыта 3.1/3.2/3.3 */
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
  // Опыт 3.3 — секундомер
  timeControl?: HTMLElement | undefined;
  timePresets?: HTMLElement | undefined;
  stopwatchReadout?: HTMLElement | undefined;
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
  // FIX 3: track zone IDs rewired in #rewireAssemblySlots() so destroy() can remove them
  #rewiredSlotIds: string[] = [];
  // Секундомер (RAF) — опыт 3.3
  #stopwatchRaf: number | null = null;
  #stopwatchStart = 0;

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

  /** Активная задача (для тестов/отладки). */
  get activeTask(): CircuitTaskId {
    return this.#store.get().activeTask;
  }

  /** Выбранное время опыта 3.3 (с). */
  get timeS(): number {
    return this.#store.get().timeS;
  }

  /** Выбрать длительность опыта (с) — только пресеты 30/60/120. */
  setTimeS(t: number): void {
    const allowed = [30, 60, 120];
    const v = allowed.includes(t) ? t : 60;
    this.#store.set({ timeS: v });
    this.#refreshUi();
  }

  /** Переключить задачу опыта (A/B/C). Снимает секундомер (Task 3). */
  setActiveTask(task: CircuitTaskId): void {
    this.#stopStopwatch();
    this.#store.set({ activeTask: task });
    this.#refreshUi();
    this.#hints.update(this.#store.get());
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
    const clamped = Math.max(1.5, Math.min(6.0, v));
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
    const P = circuitPower(U, I);

    const isWork = st.activeTask === 'C-work';
    const tS = isWork ? st.timeS : null;
    const workJ = isWork ? circuitWork(U, I, st.timeS) : null;

    const measurement: CircuitMeasurement = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      task: st.activeTask,
      resistorVariant: variant,
      resistanceOhm: R,
      voltageV: U,
      currentA: I,
      powerW: P,
      timeS: tS,
      workJ,
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

  /** Сброс установки. Сохраняет выбранную задачу. */
  reset(): void {
    this.#stopStopwatch();
    this.#drag.cancel();
    this.#topology.reset();
    this.#assembly.setKeyClosed(false);
    const keepTask = this.#store.get().activeTask;
    this.#store.set({ ...INITIAL_STATE, activeTask: keepTask });
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
    this.#stopStopwatch();
    this.#drag.cancel();
    // FIX 3: explicitly remove the rewired slot zones before CircuitAssembly.destroy()
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

    // Пресеты времени (опыт 3.3)
    if (this.#refs.timePresets) {
      this.#refs.timePresets.addEventListener('click', (ev) => {
        const btn = (ev.target as HTMLElement).closest('[data-time]');
        if (!btn) return;
        const t = Number((btn as HTMLElement).dataset['time']);
        if (Number.isFinite(t)) this.setTimeS(t);
      });
    }

    // Переключатель задач A/B/C
    this.#refs.steps.addEventListener('click', (ev) => {
      const target = (ev.target as HTMLElement).closest('[data-task]');
      if (!target) return;
      const tid = (target as HTMLElement).dataset['task'] as CircuitTaskId | undefined;
      if (tid) this.setActiveTask(tid);
    });
    this.#refs.steps.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const target = (ev.target as HTMLElement).closest('[data-task]');
      if (!target) return;
      ev.preventDefault();
      const tid = (target as HTMLElement).dataset['task'] as CircuitTaskId | undefined;
      if (tid) this.setActiveTask(tid);
    });
  }

  /**
   * CircuitAssembly регистрирует snap-зоны через DragController, но наш
   * store не знает о дропах. Перегружаем board-зоны дополнительным слоем:
   * после успешного drop в CircuitAssembly обновляем state.placed.
   */
  #rewireAssemblySlots(): void {
    // FIX 3: reset tracked list on each call (handles remount path)
    this.#rewiredSlotIds = [];
    for (const slotDef of SLOTS_3_1) {
      const slotId = slotDef.id as SlotId;
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
      // FIX 3: track this rewired zone ID so destroy() can clean it up
      this.#rewiredSlotIds.push(zoneId);
    }
  }

  #afterCircuitChange(): void {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    this.#assembly.setKeyClosed(ok && st.keyClosed);

    if (!(ok && st.keyClosed)) {
      this.#stopStopwatch();
    }

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

        // Запустить секундомер в задаче C — но НЕ перезапускать уже идущую анимацию
        // при изменении живой цепи (setVoltage/смена резистора при замкнутом ключе).
        if (st.activeTask === 'C-work' && this.#stopwatchRaf === null) this.#startStopwatch();

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
      this.#refs.keyBtn.setAttribute('aria-label', closed ? 'Разомкнуть ключ' : 'Замкнуть ключ');
      this.#refs.keyBtn.className = `key-btn key-btn--${closed ? 'closed' : 'open'}`;
      this.#refs.keyBtnLabel.textContent = closed ? 'Разомкнуть ключ' : 'Замкнуть ключ';
    }

    // Voltage control visibility
    this.#refs.voltageControl.hidden = !st.placed['source'];

    // Time-control виден только в задаче C
    if (this.#refs.timeControl) {
      this.#refs.timeControl.hidden = st.activeTask !== 'C-work';
    }
    if (this.#refs.timePresets) {
      const btns = this.#refs.timePresets.querySelectorAll<HTMLButtonElement>('[data-time]');
      btns.forEach((b) => {
        const on = Number(b.dataset['time']) === st.timeS;
        b.setAttribute('data-state', on ? 'active' : '');
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    // Секундомер readout (если не идёт анимация — показать выбранное t)
    if (this.#refs.stopwatchReadout && !this.#stopwatchRaf) {
      this.#refs.stopwatchReadout.textContent = `t = ${st.timeS} с`;
    }

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
        if (st.activeTask === 'C-work') {
          this.#refs.recordPendingSummary.textContent += `, t=${st.timeS} с`;
        }
      }
    }

    // Render journal table (§21) — per-task spec + rows
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

    // Формула по активной задаче
    this.#refreshFormula();

    // Task-switcher highlight
    this.#refreshTaskStepper();
  }

  #buildJournalRows(list: CircuitMeasurement[]): JournalRow[] {
    return list.map((m, i) => {
      const row = this.#buildJournalRow(m, i + 1);
      const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
      for (const [k, v] of Object.entries(drafts)) row.values[k] = v;
      const verdicts = this.#journalVerdicts.get(m.timestamp);
      if (verdicts) row.verdicts = verdicts;
      return row;
    });
  }

  #buildJournalRow(m: CircuitMeasurement, idx: number): JournalRow {
    const isFullyAuto = this.#recordMode() === 'fully-auto';
    const base = { idx, resistor: m.resistorVariant, U_V: m.voltageV, I_A: m.currentA };
    if (m.task === 'B-power') {
      return {
        idx, timestamp: m.timestamp,
        values: { ...base, P_W: isFullyAuto ? m.powerW : null },
      };
    }
    if (m.task === 'C-work') {
      return {
        idx, timestamp: m.timestamp,
        values: { ...base, t_s: m.timeS, A_J: isFullyAuto ? m.workJ : null },
      };
    }
    return {
      idx, timestamp: m.timestamp,
      values: { ...base, R_Ohm: isFullyAuto ? m.resistanceOhm : null },
    };
  }

  #pendingSignature(): string {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    if (!ok || !st.keyClosed) return '';
    // timeS включён в подпись: в задаче C смена пресета времени → новая pending-плашка (semi-auto).
    return `${st.activeTask}-${st.voltage.toFixed(2)}-${st.placed['resistor']?.equipmentId ?? ''}-${st.timeS}`;
  }

  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  /** SPEC журнала по активной задаче. */
  #currentSpec(): JournalSpec {
    const t = this.#store.get().activeTask;
    if (t === 'B-power') return POWER_SPEC;
    if (t === 'C-work') return WORK_CURRENT_SPEC;
    return RESISTANCE_SPEC;
  }

  /** Записи текущей задачи (журнал/счётчик/результат фильтруются по задаче). */
  #measurementsForTask(): CircuitMeasurement[] {
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

  #refreshFormula(): void {
    const expr = this.#refs.formulaExpr;
    const units = this.#refs.formulaUnits;
    if (!expr || !units) return;
    const t = this.#store.get().activeTask;
    if (t === 'B-power') {
      expr.innerHTML = '<em>P</em> = <em>U</em> · <em>I</em>';
      units.innerHTML = '<em>U</em> — в В, <em>I</em> — в А, <em>P</em> — в Вт';
    } else if (t === 'C-work') {
      expr.innerHTML = '<em>A</em> = <em>U</em> · <em>I</em> · <em>t</em>';
      units.innerHTML = '<em>U</em> — в В, <em>I</em> — в А, <em>t</em> — в с, <em>A</em> — в Дж';
    } else {
      expr.innerHTML = '<em>R</em> = <em>U</em> / <em>I</em>';
      units.innerHTML = '<em>U</em> — в В, <em>I</em> — в А, <em>R</em> — в Ом';
    }
  }

  // ─── Stopwatch (RAF) — опыт 3.3 ─────────────────────────────────────────

  #startStopwatch(): void {
    if (!this.#refs.stopwatchReadout) return;
    this.#stopStopwatch();
    const target = this.#store.get().timeS;
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof requestAnimationFrame !== 'function') {
      this.#refs.stopwatchReadout.textContent = `t = ${target} с`;
      return;
    }
    const ACCEL = 20; // 60 c → 3 c реального времени
    this.#stopwatchStart = performance.now();
    const tick = (now: number) => {
      const simElapsed = ((now - this.#stopwatchStart) / 1000) * ACCEL;
      const shown = Math.min(target, Math.round(simElapsed));
      if (this.#refs.stopwatchReadout) this.#refs.stopwatchReadout.textContent = `t = ${shown} с`;
      if (shown >= target) { this.#stopwatchRaf = null; return; }
      this.#stopwatchRaf = requestAnimationFrame(tick);
    };
    this.#stopwatchRaf = requestAnimationFrame(tick);
  }

  #stopStopwatch(): void {
    if (this.#stopwatchRaf !== null) {
      cancelAnimationFrame(this.#stopwatchRaf);
      this.#stopwatchRaf = null;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  #kindForEquipment(id: EquipmentId): EqKind | null {
    const map: Record<EquipmentId, EqKind> = {
      'power-source':  'power-source',
      'voltmeter':     'voltmeter',
      'ammeter':       'ammeter',
      'resistor-r1':   'resistor',
      'resistor-r2':   'resistor',
      'resistor-r3':   'resistor',
      'key':           'key',
    };
    return map[id] ?? null;
  }

  #variantForEquipment(id: EquipmentId): string {
    if (id === 'resistor-r1') return 'R1';
    if (id === 'resistor-r2') return 'R2';
    if (id === 'resistor-r3') return 'R3';
    return 'R1';
  }
}
