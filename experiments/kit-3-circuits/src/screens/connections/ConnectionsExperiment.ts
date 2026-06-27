/**
 * ConnectionsExperiment — оркестратор опытов 3.8/3.9
 * «Правило напряжений (последовательное)» и «Правило токов (параллельное)».
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) п.8 и п.9; КОДИФ §1.29:
 *   3.8 — последовательное соединение: U = U1 + U2.
 *         Вольтметр переставляется в 3 позиции (across R1, R2, total).
 *         Амперметр — фиксирован в главной линии.
 *   3.9 — параллельное соединение: I = I1 + I2.
 *         Амперметр переставляется в 3 позиции (ветвь R1, ветвь R2, главная).
 *         Вольтметр — фиксирован на узлах.
 *
 * R1 = 4,7 Ом, R2 = 5,7 Ом (ФИПИ-паспорт, разные номиналы).
 *
 * §21 — журнал v2 (renderJournalTable + SERIES_VOLTAGE_SPEC / PARALLEL_CURRENT_SPEC
 *        + record-mode 'kit-3').
 *
 * Примечание: CircuitAssembly НЕ используется напрямую — его #refreshAnimation()
 * требует validate() (все слоты заполнены), что неприменимо для опытов 3.8/3.9
 * где position-слоты заполняются по одному. Анимация управляется вручную.
 */

import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { Store } from '@controller/Store';
import { CircuitTopology } from '@controller/CircuitAssembly';
import { CircuitDragController } from '@controller/CircuitDragController';
import {
  seriesResistance,
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
  SERIES_VOLTAGE_SPEC,
  PARALLEL_CURRENT_SPEC,
} from '@labosfera/shared-spa/lib/journal/specs';
import type { JournalRow, JournalVerdict, JournalSpec } from '@labosfera/shared-spa/lib/journal/types';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** Активная задача (A=последовательное, B=параллельное). */
export type ConnectionTaskId = 'A-series' | 'B-parallel';

/** Все слоты на board (серия + параллель объединены). */
export type ConnectionSlotId =
  | 'source' | 'key' | 'r1' | 'r2'
  | 'ammeter'                                     // fixed для series; position для parallel
  | 'voltmeter'                                   // fixed для parallel; position для series
  | 'v-pos-r1' | 'v-pos-r2' | 'v-pos-total'      // position-слоты вольтметра (series)
  | 'a-pos-r1' | 'a-pos-r2' | 'a-pos-main';      // position-слоты амперметра (parallel)

export type ConnectionEquipmentId =
  | 'power-source' | 'voltmeter' | 'ammeter' | 'key' | 'r1' | 'r2';

export type EqKind = 'power-source' | 'voltmeter' | 'ammeter' | 'resistor' | 'key';

export interface ConnectionMeasurement {
  readonly id: string;
  readonly timestamp: number;
  readonly task: ConnectionTaskId;
  readonly point: 'R1' | 'R2' | 'total';  // позиция подвижного прибора
  readonly value: number;                   // U_V для series, I_A для parallel
}

interface PlacedInstrument {
  equipmentId: ConnectionEquipmentId;
  kind: EqKind;
}

interface ConnectionState {
  placed: Partial<Record<ConnectionSlotId, PlacedInstrument>>;
  keyClosed: boolean;
  voltage: number;
  activeTask: ConnectionTaskId;
  measurements: ConnectionMeasurement[];
  dragging: ConnectionEquipmentId | null;
}

// ─── Физические константы ─────────────────────────────────────────────────────

const R1_OHM = 4.7;
const R2_OHM = 5.7;

// ─── Топологии слотов ────────────────────────────────────────────────────────

const SLOTS_SERIES = [
  { id: 'source',      role: 'source' as const,   accepts: ['power-source'] as const },
  { id: 'key',         role: 'key' as const,       accepts: ['key'] as const },
  { id: 'ammeter',     role: 'series' as const,    accepts: ['ammeter'] as const },
  { id: 'r1',          role: 'series' as const,    accepts: ['resistor'] as const },
  { id: 'r2',          role: 'series' as const,    accepts: ['resistor'] as const },
  { id: 'v-pos-r1',    role: 'parallel' as const,  accepts: ['voltmeter'] as const },
  { id: 'v-pos-r2',    role: 'parallel' as const,  accepts: ['voltmeter'] as const },
  { id: 'v-pos-total', role: 'parallel' as const,  accepts: ['voltmeter'] as const },
] as const;

const SLOTS_PARALLEL = [
  { id: 'source',     role: 'source' as const,   accepts: ['power-source'] as const },
  { id: 'key',        role: 'key' as const,       accepts: ['key'] as const },
  { id: 'voltmeter',  role: 'parallel' as const,  accepts: ['voltmeter'] as const },
  { id: 'r1',         role: 'series' as const,    accepts: ['resistor'] as const },
  { id: 'r2',         role: 'series' as const,    accepts: ['resistor'] as const },
  { id: 'a-pos-r1',   role: 'series' as const,    accepts: ['ammeter'] as const },
  { id: 'a-pos-r2',   role: 'series' as const,    accepts: ['ammeter'] as const },
  { id: 'a-pos-main', role: 'series' as const,    accepts: ['ammeter'] as const },
] as const;

const RECORD_MODE_KIT = 'kit-3';

const INITIAL_STATE: ConnectionState = {
  placed: {},
  keyClosed: false,
  voltage: 4.5,
  activeTask: 'A-series',
  measurements: [],
  dragging: null,
};

const SPEC_BY_TASK: Record<ConnectionTaskId, JournalSpec> = {
  'A-series':   SERIES_VOLTAGE_SPEC,
  'B-parallel': PARALLEL_CURRENT_SPEC,
};

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

// ─── HintEngine ──────────────────────────────────────────────────────────────

class HintEngine {
  #bar: HTMLElement;
  #live: HTMLElement;

  constructor(bar: HTMLElement, live: HTMLElement) {
    this.#bar = bar;
    this.#live = live;
  }

  update(st: ConnectionState): void {
    const task = st.activeTask;
    const placed = st.placed;
    const required: ConnectionSlotId[] =
      task === 'A-series'
        ? ['source', 'key', 'ammeter', 'r1', 'r2']
        : ['source', 'key', 'voltmeter', 'r1', 'r2'];
    const missing = required.filter((id) => !placed[id]);

    if (missing.length === required.length) {
      this.#set('Перетащите приборы с правой панели в гнёзда монтажной платы.');
      return;
    }
    if (missing.length > 0) {
      const labels: Partial<Record<ConnectionSlotId, string>> = {
        source:    'источник питания',
        key:       'ключ',
        ammeter:   'амперметр',
        voltmeter: 'вольтметр',
        r1:        'резистор R1',
        r2:        'резистор R2',
      };
      const missingLabels = missing.map((id) => labels[id] ?? id).join(', ');
      this.#set(`Добавьте в цепь: ${missingLabels}.`);
      return;
    }
    const movPos = this.#movableDesc(st);
    if (!movPos) {
      const movName = task === 'A-series' ? 'вольтметр' : 'амперметр';
      this.#set(`Переместите ${movName} в одну из позиций измерения на схеме.`);
      return;
    }
    if (!st.keyClosed) {
      this.#set('Цепь собрана. Нажмите «Замкнуть ключ», чтобы включить ток.');
      return;
    }
    this.#set('Ток течёт. Считайте показания приборов, затем запишите в журнал.');
  }

  flash(msg: string): void { this.#set(msg); }

  announce(msg: string): void {
    this.#live.textContent = '';
    requestAnimationFrame(() => { this.#live.textContent = msg; });
  }

  #set(msg: string): void { this.#bar.textContent = msg; }

  #movableDesc(st: ConnectionState): string | null {
    const task = st.activeTask;
    if (task === 'A-series') {
      if (st.placed['v-pos-r1'])    return 'R1';
      if (st.placed['v-pos-r2'])    return 'R2';
      if (st.placed['v-pos-total']) return 'total';
    } else {
      if (st.placed['a-pos-r1'])   return 'R1';
      if (st.placed['a-pos-r2'])   return 'R2';
      if (st.placed['a-pos-main']) return 'total';
    }
    return null;
  }
}

// ─── ConnectionsExperiment ────────────────────────────────────────────────────

export class ConnectionsExperiment {
  #refs: ExperimentRefs;
  #store: Store<ConnectionState>;
  #drag: CircuitDragController<EqKind, ConnectionEquipmentId>;
  #hints: HintEngine;
  #topology: CircuitTopology;
  /**
   * Multimap: один equipmentId (voltmeter/ammeter) присутствует в ОБЕИХ секциях
   * (задача A и B) шаблона. Все карточки прибора держим вместе, чтобы status/
   * data-placed синхронно проставлялись и в видимой, и в скрытой секции.
   */
  #cardsByEquipmentId = new Map<ConnectionEquipmentId, LabEquipmentCard[]>();

  /** §21 — drafts + verdicts */
  #journalDrafts = new Map<number, Record<string, number>>();
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #detachRecordModeToggle: (() => void) | null = null;
  #lastRecordedSignature = '';
  #lastAnnouncedConclusion = '';
  #rewiredSlotIds: string[] = [];

  constructor(refs: ExperimentRefs) {
    this.#refs = refs;
    this.#store = new Store<ConnectionState>({ ...INITIAL_STATE });
    this.#drag = new CircuitDragController(refs.dragOverlay);
    this.#hints = new HintEngine(refs.hintBar, refs.liveRegion);

    // Начальная топология — серия
    this.#topology = new CircuitTopology(SLOTS_SERIES);

    this.#wireUp();
    this.#refreshEquipmentFilter();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  get measurements(): ReadonlyArray<ConnectionMeasurement> {
    return this.#store.get().measurements;
  }

  get voltage(): number {
    return this.#store.get().voltage;
  }

  get activeTask(): ConnectionTaskId {
    return this.#store.get().activeTask;
  }

  /** Переключить задачу (A-series / B-parallel). */
  setActiveTask(task: ConnectionTaskId): void {
    this.#drag.cancel();
    this.#topology.reset();

    this.#resetAllCards();

    const keepMeasurements = [...this.#store.get().measurements];
    this.#store.set({
      ...INITIAL_STATE,
      activeTask: task,
      voltage: this.#store.get().voltage,
      measurements: keepMeasurements,
    });
    this.#lastRecordedSignature = '';
    // Сброс guard result-panel: иначе A→B→A с теми же показаниями не перерисует панель.
    this.#lastAnnouncedConclusion = '';

    const slotDefs = task === 'A-series' ? SLOTS_SERIES : SLOTS_PARALLEL;
    this.#topology = new CircuitTopology(slotDefs);

    this.#refs.circuitBoard.setAttribute('topology', task === 'A-series' ? 'series' : 'parallel');

    this.#rewireAssemblySlots();
    this.#refreshEquipmentFilter();
    this.#refreshTaskStepper();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
  }

  /**
   * Программно разместить прибор в слот (тест-API).
   * Полностью зеркалит эффект onDrop: eviction position-слотов + card[data-placed]/status.
   */
  placeInSlot(slotId: ConnectionSlotId, equipmentId: ConnectionEquipmentId): boolean {
    const kind = this.#kindForEquipment(equipmentId);
    if (!kind) return false;

    const posSlots = this.#positionSlots();
    if ((posSlots as readonly string[]).includes(slotId)) {
      this.#evictPositionSlots(slotId);
    }

    const ok = this.#topology.place(slotId, kind);
    if (!ok) return false;

    this.#store.update((st) => ({
      placed: {
        ...st.placed,
        [slotId]: { equipmentId, kind },
      } as Partial<Record<ConnectionSlotId, PlacedInstrument>>,
    }));

    // Зеркало onDrop: карточка прибора → placed (для подвижного прибора это ТА ЖЕ
    // карточка, что была убрана при eviction — итог: data-placed = новая позиция).
    this.#markCardsPlaced(equipmentId, slotId);

    this.#afterCircuitChange();
    return true;
  }

  /** Программно замкнуть/разомкнуть ключ. */
  setKeyClosed(closed: boolean): void {
    this.#store.set({ keyClosed: closed });
    this.#afterCircuitChange();
  }

  /**
   * Программно установить напряжение.
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
   * Записать измерение в журнал.
   * Вычисляет U или I по физике согласно позиции подвижного прибора.
   */
  recordMeasurement(): void {
    const st = this.#store.get();
    if (!this.#isCircuitReady()) return;
    if (!st.keyClosed) return;

    const pos = this.#movablePosition();
    if (!pos) return;

    const U = st.voltage;
    let value: number;

    if (st.activeTask === 'A-series') {
      const R_ser = seriesResistance(R1_OHM, R2_OHM);
      const I_ser = circuitCurrent(U, R_ser);
      if (pos === 'R1')       value = I_ser * R1_OHM;
      else if (pos === 'R2')  value = I_ser * R2_OHM;
      else                    value = U;
    } else {
      if (pos === 'R1')       value = circuitCurrent(U, R1_OHM);
      else if (pos === 'R2')  value = circuitCurrent(U, R2_OHM);
      else                    value = circuitCurrent(U, R1_OHM) + circuitCurrent(U, R2_OHM);
    }

    const measurement: ConnectionMeasurement = {
      id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      task: st.activeTask,
      point: pos,
      value,
    };

    this.#store.update((s) => ({
      measurements: [...s.measurements, measurement],
    }));
    this.#lastRecordedSignature = this.#pendingSignature();
    this.#refreshUi();
    const unitLabel = st.activeTask === 'A-series' ? 'В' : 'А';
    this.#hints.announce(
      `Записано: позиция ${pos === 'total' ? 'вся цепь' : pos}, значение = ${value.toFixed(2).replace('.', ',')} ${unitLabel}.`,
    );
  }

  /**
   * Сброс установки.
   * clearData=false — сохраняет measurements (смена позиции прибора).
   * clearData=true  — полная очистка (кнопка Reset).
   */
  reset(clearData = true): void {
    this.#drag.cancel();
    this.#topology.reset();
    const keepTask = this.#store.get().activeTask;
    const keepMeasurements = clearData ? [] : [...this.#store.get().measurements];
    const keepVoltage = this.#store.get().voltage;
    this.#store.set({
      ...INITIAL_STATE,
      activeTask: keepTask,
      voltage: keepVoltage,
      measurements: keepMeasurements,
    });
    if (clearData) {
      this.#journalDrafts.clear();
      this.#journalVerdicts.clear();
    }
    this.#lastRecordedSignature = '';
    this.#lastAnnouncedConclusion = '';

    this.#resetAllCards();
    this.#refs.voltageInput.value = String(keepVoltage);
    this.#refs.voltageReadout.textContent = `${keepVoltage.toFixed(1).replace('.', ',')} В`;

    this.#refs.circuitBoard.setCurrentAnimating(false);
    this.#refreshEquipmentFilter();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
    this.#hints.announce('Установка сброшена. Все приборы вернулись в комплект.');
  }

  /** Позиция подвижного прибора (для тест-API). */
  movableInstrumentPosition(): string | null {
    return this.#movablePosition();
  }

  /** Cleanup при unmount. */
  destroy(): void {
    this.#drag.cancel();
    for (const id of this.#rewiredSlotIds) {
      this.#drag.removeSnapZone(id);
    }
    this.#rewiredSlotIds = [];
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
  }

  // ─── Wiring ──────────────────────────────────────────────────────────────

  #wireUp(): void {
    this.#refs.cards.forEach((card, cardIdx) => {
      const equipmentId = card.dataset['eq'] as ConnectionEquipmentId | undefined;
      if (!equipmentId) return;
      // voltmeter/ammeter присутствуют в обеих секциях — храним все карточки прибора.
      const list = this.#cardsByEquipmentId.get(equipmentId) ?? [];
      list.push(card);
      this.#cardsByEquipmentId.set(equipmentId, list);

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

      // Уникальный id зоны на КАРТОЧКУ (data-dropzone-id дублируется между секциями).
      const baseZoneId = card.dataset['dropzoneId'] ?? `card-${equipmentId}`;
      const cardDropZoneId = `${baseZoneId}-${cardIdx}`;
      this.#drag.addSnapZone({
        id: cardDropZoneId,
        accepts: [kind],
        getRect: () => card.getBoundingClientRect(),
        onHover: (active) => { card.toggleAttribute('data-drop-hover', active); },
        onDrop: () => false,
      });
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

    // Переключатель задач A/B
    this.#refs.steps.addEventListener('click', (ev) => {
      const target = (ev.target as HTMLElement).closest('[data-task]');
      if (!target) return;
      const tid = (target as HTMLElement).dataset['task'] as ConnectionTaskId | undefined;
      if (tid) this.setActiveTask(tid);
    });
    this.#refs.steps.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const target = (ev.target as HTMLElement).closest('[data-task]');
      if (!target) return;
      ev.preventDefault();
      const tid = (target as HTMLElement).dataset['task'] as ConnectionTaskId | undefined;
      if (tid) this.setActiveTask(tid);
    });
  }

  #rewireAssemblySlots(): void {
    for (const id of this.#rewiredSlotIds) {
      this.#drag.removeSnapZone(id);
    }
    this.#rewiredSlotIds = [];

    const slotDefs = this.#store.get().activeTask === 'A-series' ? SLOTS_SERIES : SLOTS_PARALLEL;

    for (const slotDef of slotDefs) {
      const slotId = slotDef.id as ConnectionSlotId;
      // Префикс circuit-slot-* — обязателен (урок Фаз C/D: НЕ кастомный префикс).
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
          const kind = this.#kindForEquipment(equipmentId as ConnectionEquipmentId);
          if (!kind) return false;
          if (!(slotDef.accepts as ReadonlyArray<string>).includes(kind)) return false;
          if (this.#topology.slotFilledBy(slotId) !== null) return false;

          const posSlots = this.#positionSlots();
          if ((posSlots as readonly string[]).includes(slotId)) {
            this.#evictPositionSlots(slotId);
          }

          const ok = this.#topology.place(slotId, kind);
          if (!ok) return false;

          this.#store.update((st) => ({
            placed: {
              ...st.placed,
              [slotId]: { equipmentId: equipmentId as ConnectionEquipmentId, kind },
            } as Partial<Record<ConnectionSlotId, PlacedInstrument>>,
          }));

          this.#markCardsPlaced(equipmentId as ConnectionEquipmentId, slotId);

          this.#afterCircuitChange();
          return true;
        },
      });
      this.#rewiredSlotIds.push(zoneId);
    }
  }

  /** Убрать подвижный прибор из всех position-слотов кроме excludeSlotId. */
  #evictPositionSlots(excludeSlotId: string): void {
    for (const pid of this.#positionSlots()) {
      if (pid === excludeSlotId) continue;
      if (this.#topology.slotFilledBy(pid) === null) continue;
      const prev = this.#store.get().placed[pid as ConnectionSlotId];
      this.#topology.remove(pid);
      this.#store.update((st) => {
        const placed = { ...st.placed };
        delete placed[pid as ConnectionSlotId];
        return { placed };
      });
      if (prev) this.#markCardsAvailable(prev.equipmentId);
    }
  }

  /** Все карточки прибора → placed (видимая + скрытая секция). */
  #markCardsPlaced(equipmentId: ConnectionEquipmentId, slotId: string): void {
    for (const card of this.#cardsByEquipmentId.get(equipmentId) ?? []) {
      card.setAttribute('status', 'placed');
      card.dataset['placed'] = slotId;
    }
  }

  /** Все карточки прибора → available. */
  #markCardsAvailable(equipmentId: ConnectionEquipmentId): void {
    for (const card of this.#cardsByEquipmentId.get(equipmentId) ?? []) {
      card.setAttribute('status', 'available');
      card.removeAttribute('data-placed');
    }
  }

  /** Сброс всех карточек всех приборов. */
  #resetAllCards(): void {
    for (const cards of this.#cardsByEquipmentId.values()) {
      for (const card of cards) {
        card.setAttribute('status', 'available');
        card.removeAttribute('data-placed');
      }
    }
  }

  #afterCircuitChange(): void {
    const st = this.#store.get();
    const ready = this.#isCircuitReady();
    const isLive = ready && st.keyClosed;

    // Анимация тока управляется напрямую (CircuitAssembly не используется).
    this.#refs.circuitBoard.setCurrentAnimating(isLive);

    if (isLive) {
      this.#updateMeterDisplays(st);

      if (this.#recordMode() === 'fully-auto' && this.#pendingSignature() !== this.#lastRecordedSignature) {
        this.recordMeasurement();
      }
    }

    this.#refreshUi();
    this.#hints.update(st);
  }

  #updateMeterDisplays(st: ConnectionState): void {
    const U = st.voltage;

    if (st.activeTask === 'A-series') {
      const R_ser = seriesResistance(R1_OHM, R2_OHM);
      const I_ser = circuitCurrent(U, R_ser);
      const ammPlaced = st.placed['ammeter'];
      if (ammPlaced) {
        const am = this.#visibleCardFor(ammPlaced.equipmentId)?.querySelector('lab-ammeter');
        am?.setAttribute('value', I_ser.toFixed(2));
      }

      const pos = this.#movablePosition();
      const vmKey = pos === 'R1' ? 'v-pos-r1' : pos === 'R2' ? 'v-pos-r2' : pos === 'total' ? 'v-pos-total' : null;
      if (vmKey) {
        const vmPlaced = st.placed[vmKey as ConnectionSlotId];
        if (vmPlaced) {
          const vm = this.#visibleCardFor(vmPlaced.equipmentId)?.querySelector('lab-voltmeter');
          const vmVal = pos === 'R1' ? I_ser * R1_OHM : pos === 'R2' ? I_ser * R2_OHM : U;
          vm?.setAttribute('value', vmVal.toFixed(2));
        }
      }
    } else {
      const vmPlaced = st.placed['voltmeter'];
      if (vmPlaced) {
        const vm = this.#visibleCardFor(vmPlaced.equipmentId)?.querySelector('lab-voltmeter');
        vm?.setAttribute('value', U.toFixed(2));
      }

      const pos = this.#movablePosition();
      const ammKey = pos === 'R1' ? 'a-pos-r1' : pos === 'R2' ? 'a-pos-r2' : pos === 'total' ? 'a-pos-main' : null;
      if (ammKey) {
        const ammPlaced = st.placed[ammKey as ConnectionSlotId];
        if (ammPlaced) {
          const am = this.#visibleCardFor(ammPlaced.equipmentId)?.querySelector('lab-ammeter');
          const ammVal = pos === 'R1' ? circuitCurrent(U, R1_OHM)
            : pos === 'R2' ? circuitCurrent(U, R2_OHM)
            : circuitCurrent(U, R1_OHM) + circuitCurrent(U, R2_OHM);
          am?.setAttribute('value', ammVal.toFixed(2));
        }
      }
    }
  }

  /**
   * Видимая карточка прибора — та, чья секция совпадает с активной задачей.
   * Прибор (voltmeter/ammeter) дублируется в обеих секциях; показания пишем
   * в карточку видимой секции. Fallback — первая карточка.
   */
  #visibleCardFor(equipmentId: ConnectionEquipmentId): LabEquipmentCard | undefined {
    const cards = this.#cardsByEquipmentId.get(equipmentId);
    if (!cards || cards.length === 0) return undefined;
    const active = this.#store.get().activeTask;
    return cards.find((c) => {
      const section = c.closest<HTMLElement>('section[data-task-instrument]');
      return !section || section.dataset['taskInstrument'] === active;
    }) ?? cards[0];
  }

  #handleRecordModeChange(): void {
    const st = this.#store.get();
    const ready = this.#isCircuitReady();
    if (this.#recordMode() === 'fully-auto' && ready && st.keyClosed) {
      if (this.#pendingSignature() !== this.#lastRecordedSignature) {
        this.recordMeasurement();
      }
    }
    this.#refreshUi();
  }

  // ─── UI refresh ──────────────────────────────────────────────────────────

  #refreshUi(): void {
    const st = this.#store.get();
    const ready = this.#isCircuitReady();
    const isLive = ready && st.keyClosed;

    // Key control
    const keyPlaced = !!st.placed['key'];
    this.#refs.keyControl.hidden = !keyPlaced;
    if (keyPlaced) {
      const closed = st.keyClosed;
      this.#refs.keyBtn.setAttribute('aria-pressed', closed ? 'true' : 'false');
      this.#refs.keyBtn.setAttribute('aria-label', closed ? 'Разомкнуть ключ' : 'Замкнуть ключ');
      this.#refs.keyBtn.className = `key-btn key-btn--${closed ? 'closed' : 'open'}`;
      this.#refs.keyBtnLabel.textContent = closed ? 'Разомкнуть ключ' : 'Замкнуть ключ';
    }

    // Voltage control
    this.#refs.voltageControl.hidden = !st.placed['source'];

    const taskMeasurements = this.#measurementsForTask();
    const hasMeasurements = taskMeasurements.length > 0;

    this.#refs.measurementPanel.dataset['state'] = isLive ? 'live' : hasMeasurements ? 'recorded' : 'empty';

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

    const isPending = isLive && this.#pendingSignature() !== this.#lastRecordedSignature;
    const mode = this.#recordMode();
    if (this.#refs.recordPendingSlot) {
      this.#refs.recordPendingSlot.hidden = !(isPending && mode === 'semi-auto');
    }
    if (this.#refs.recordPendingSummary && isPending) {
      const U = st.voltage;
      const pos = this.#movablePosition();
      const unitLabel = st.activeTask === 'A-series' ? 'В' : 'А';
      if (pos) {
        let val: number;
        if (st.activeTask === 'A-series') {
          const R_ser = seriesResistance(R1_OHM, R2_OHM);
          const I_ser = circuitCurrent(U, R_ser);
          val = pos === 'R1' ? I_ser * R1_OHM : pos === 'R2' ? I_ser * R2_OHM : U;
        } else {
          val = pos === 'R1' ? circuitCurrent(U, R1_OHM)
            : pos === 'R2' ? circuitCurrent(U, R2_OHM)
            : circuitCurrent(U, R1_OHM) + circuitCurrent(U, R2_OHM);
        }
        this.#refs.recordPendingSummary.textContent = `${pos}, ${val.toFixed(2).replace('.', ',')} ${unitLabel}`;
      }
    }

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

    this.#refreshResultPanel(taskMeasurements);
    this.#refreshTaskStepper();
  }

  #buildJournalRows(list: ConnectionMeasurement[]): JournalRow[] {
    return list.map((m, i) => {
      const row = this.#buildJournalRow(m, i + 1);
      const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
      for (const [k, v] of Object.entries(drafts)) row.values[k] = v;
      const verdicts = this.#journalVerdicts.get(m.timestamp);
      if (verdicts) row.verdicts = verdicts;
      return row;
    });
  }

  #buildJournalRow(m: ConnectionMeasurement, idx: number): JournalRow {
    const pointLabel = m.point === 'R1' ? 'R1' : m.point === 'R2' ? 'R2' : 'вся цепь';
    const valueKey = m.task === 'A-series' ? 'U_V' : 'I_A';
    return {
      idx,
      timestamp: m.timestamp,
      values: {
        idx,
        point: pointLabel,
        [valueKey]: m.value,
      },
    };
  }

  /**
   * Result-panel: правило U1+U2≈U_общ / I1+I2≈I_общ.
   * Активируется когда все три точки измерены.
   * Допуск ~2%. Guard: не перезаписывать #lastAnnouncedConclusion без изменений.
   */
  #refreshResultPanel(taskMeasurements: ConnectionMeasurement[]): void {
    const panel = this.#refs.resultPanel;
    const task = this.#store.get().activeTask;

    const byPoint = new Map<string, number>();
    for (const m of taskMeasurements) {
      if (!byPoint.has(m.point)) byPoint.set(m.point, m.value);
    }

    if (!byPoint.has('R1') || !byPoint.has('R2') || !byPoint.has('total')) {
      panel.hidden = true;
      return;
    }

    const v1 = byPoint.get('R1')!;
    const v2 = byPoint.get('R2')!;
    const vTotal = byPoint.get('total')!;
    const sum = v1 + v2;
    const rel = Math.abs(sum - vTotal) / (Math.abs(vTotal) || 1);
    const ok = rel <= 0.02;
    const checkmark = ok ? '✓' : '✗';

    let text: string;
    if (task === 'A-series') {
      text = `U1 + U2 = ${v1.toFixed(2).replace('.', ',')} + ${v2.toFixed(2).replace('.', ',')} = ${sum.toFixed(2).replace('.', ',')} В ≈ U(общ) = ${vTotal.toFixed(2).replace('.', ',')} В → правило напряжений выполняется ${checkmark}`;
    } else {
      text = `I1 + I2 = ${v1.toFixed(2).replace('.', ',')} + ${v2.toFixed(2).replace('.', ',')} = ${sum.toFixed(2).replace('.', ',')} А ≈ I(общ) = ${vTotal.toFixed(2).replace('.', ',')} А → правило токов выполняется ${checkmark}`;
    }

    panel.hidden = false;
    if (text !== this.#lastAnnouncedConclusion) {
      this.#lastAnnouncedConclusion = text;
      panel.textContent = text;
    }
  }

  #refreshEquipmentFilter(): void {
    const active = this.#store.get().activeTask;
    const seenSections = new Set<HTMLElement>();
    this.#refs.cards.forEach((card) => {
      const section = card.closest<HTMLElement>('section[data-task-instrument]');
      if (section && !seenSections.has(section)) {
        seenSections.add(section);
        const taskInstrument = section.dataset['taskInstrument'];
        section.hidden = taskInstrument !== active;
      }
    });
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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Проверяет готовность цепи для текущей задачи.
   * Не вызывает topology.validate() — тот требует ВСЕ слоты.
   * Нужны только обязательные слоты + хотя бы одна position-позиция.
   */
  #isCircuitReady(): boolean {
    const st = this.#store.get();
    const required: ConnectionSlotId[] =
      st.activeTask === 'A-series'
        ? ['source', 'key', 'ammeter', 'r1', 'r2']
        : ['source', 'key', 'voltmeter', 'r1', 'r2'];
    for (const id of required) {
      if (!st.placed[id]) return false;
    }
    return this.#movablePosition() !== null;
  }

  #movablePosition(): 'R1' | 'R2' | 'total' | null {
    const st = this.#store.get();
    if (st.activeTask === 'A-series') {
      if (st.placed['v-pos-r1'])    return 'R1';
      if (st.placed['v-pos-r2'])    return 'R2';
      if (st.placed['v-pos-total']) return 'total';
    } else {
      if (st.placed['a-pos-r1'])   return 'R1';
      if (st.placed['a-pos-r2'])   return 'R2';
      if (st.placed['a-pos-main']) return 'total';
    }
    return null;
  }

  #positionSlots(): readonly string[] {
    return this.#store.get().activeTask === 'A-series'
      ? ['v-pos-r1', 'v-pos-r2', 'v-pos-total']
      : ['a-pos-r1', 'a-pos-r2', 'a-pos-main'];
  }

  #kindForEquipment(id: ConnectionEquipmentId): EqKind | null {
    if (id === 'power-source') return 'power-source';
    if (id === 'voltmeter')    return 'voltmeter';
    if (id === 'ammeter')      return 'ammeter';
    if (id === 'key')          return 'key';
    if (id === 'r1' || id === 'r2') return 'resistor';
    return null;
  }

  #pendingSignature(): string {
    const st = this.#store.get();
    if (!this.#isCircuitReady() || !st.keyClosed) return '';
    return `${st.activeTask}-${st.voltage.toFixed(2)}-${this.#movablePosition() ?? ''}`;
  }

  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  #currentSpec(): JournalSpec {
    return SPEC_BY_TASK[this.#store.get().activeTask];
  }

  #measurementsForTask(): ConnectionMeasurement[] {
    const t = this.#store.get().activeTask;
    return this.#store.get().measurements.filter((m) => m.task === t);
  }
}
