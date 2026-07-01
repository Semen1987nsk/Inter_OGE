/**
 * RefractionExperiment — оркестратор опыта 4.3/4.6 «Преломление света».
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№4 (стр.19) + КОДИФ §1.29:
 * Сноска (4) дословно:
 * «... показателя преломления стекла; ... зависимости угла преломления от угла
 *  падения на границе воздух – стекло.»
 *
 * Workflow (опыт 4.3 — задача A-index):
 *   1. Перетащить полуцилиндр и осветитель на транспортир.
 *   2. Менять угол падения хэндлом.
 *   3. Снять i и r с транспортира.
 *   4. Вычислить n = sin i / sin r.
 *
 * Workflow (опыт 4.6 — задача B-angle):
 *   1. Перетащить приборы на транспортир.
 *   2. Менять угол падения и записывать r — строить график r(i).
 *
 * Паттерн: ОДИН оркестратор + Store + локальный HintEngine + OpticalDragController.
 * §21 — журнал v2 (renderJournalTable + REFRACTION_*_SPEC + record-mode 'kit-4').
 */

import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { Store } from '@controller/Store';
import { OpticalDragController } from '@controller/OpticalDragController';
import type { LabGraph } from '@ui/components/lab-graph';

// §21 — единый журнал v2
import {
  getRecordMode,
  injectRecordModeToggleStyles,
  renderRecordModeToggle,
  type RecordMode,
} from '@labosfera/shared-spa/lib/record-mode';
import { renderJournalTable } from '@labosfera/shared-spa/lib/journal/render';
import { verifyRow } from '@labosfera/shared-spa/lib/journal/verify';
import { REFRACTION_INDEX_SPEC, REFRACTION_ANGLE_SPEC } from '@labosfera/shared-spa/lib/journal/specs';
import type { JournalRow, JournalVerdict, JournalSpec } from '@labosfera/shared-spa/lib/journal/types';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** ID активной задачи экрана refraction. */
export type RefractionTaskId = 'A-index' | 'B-angle';

/** Режим отображения графика: r(i) или sin r – sin i. */
export type GraphMode = 'ri' | 'sin';

/** ID/Kind оборудования комплекта преломления. */
export type RefractionEquipmentId = 'semicylinder' | 'emitter';
export type RefractionKind = 'semicylinder' | 'emitter';

/** Одна запись измерения. */
export interface RefractionMeasurement {
  readonly task: RefractionTaskId;
  readonly iDeg: number;
  readonly rDeg: number;
  /** Метка времени — handle для drafts/verdicts журнала. */
  readonly timestamp: number;
}

/** DOM-ссылки оркестратора. Все обязательны кроме журнальных `?`. */
export interface RefractionRefs {
  stage: HTMLElement;
  disc: HTMLElement & {
    getSlotRect(id: string): DOMRect;
    setSlotHover(id: string, on: boolean): void;
    setPlaced(kind: string, on: boolean): void;
    setDragging(on: boolean): void;
    setIncidenceAngle(i: number): void;
    readonly incidenceAngleDeg: number;
    readonly refractionAngleDeg: number;
  };
  dragOverlay: HTMLElement;
  hintBar: HTMLElement;
  liveRegion: HTMLElement;
  resetBtn: HTMLButtonElement;
  steps: HTMLElement;
  resultPanel: HTMLElement;
  cards: NodeListOf<LabEquipmentCard>;
  graphHost?: HTMLElement | undefined;
  graphToggleBtn?: HTMLButtonElement | undefined;
  recordModeSlot?: HTMLElement | undefined;
  journalHost?: HTMLElement | undefined;
  recordPendingSlot?: HTMLElement | undefined;
  recordPendingBtn?: HTMLButtonElement | undefined;
  recordPendingSummary?: HTMLElement | undefined;
}

// ─── Состояние ────────────────────────────────────────────────────────────────

interface RefractionState {
  activeTask: RefractionTaskId;
  /** Угол падения [°], целое, [0..85]. Синхронен с disc.incidenceAngleDeg. */
  iDeg: number;
  /** Размещённые приборы (semicylinder и/или emitter). */
  placed: Set<RefractionEquipmentId>;
  measurements: RefractionMeasurement[];
}

/** Дефолтный угол падения (45° → r≈28° при n=1.5 — эталонная точка Снелла). */
const DEFAULT_I_DEG = 45;

/** Кит для record-mode toggle (localStorage `inter-oge.record-mode.kit-4`). */
const RECORD_MODE_KIT = 'kit-4';

/** °→рад для расчёта n = sin i / sin r (единый источник с REFRACTION_INDEX_SPEC). */
const DEG_TO_RAD = Math.PI / 180;

/** Журнал-спека по задаче. A-index=4.3 (n derived), B-angle=4.6 (только i,r). */
const SPEC_BY_TASK: Record<RefractionTaskId, JournalSpec> = {
  'A-index': REFRACTION_INDEX_SPEC,
  'B-angle': REFRACTION_ANGLE_SPEC,
};

/**
 * Показатель преломления n = sin i / sin r по измеренным целым углам.
 * Единый источник истины с `REFRACTION_INDEX_SPEC.expectedFromRow` —
 * derived-ячейка (fully-auto) и число в result-panel обязаны совпадать.
 */
function refractiveIndexFrom(iDeg: number, rDeg: number): number {
  const sr = Math.sin(rDeg * DEG_TO_RAD);
  return sr > 1e-9 ? Math.sin(iDeg * DEG_TO_RAD) / sr : 0;
}

const INITIAL_STATE: RefractionState = {
  activeTask: 'A-index',
  iDeg: DEFAULT_I_DEG,
  placed: new Set<RefractionEquipmentId>(),
  measurements: [],
};

// Текст подсказок — вынесен в константы чтобы избежать повторений
const HINTS = {
  noEquipA: 'Опыт 4.3: поставьте полуцилиндр и осветитель на транспортир, затем снимите i и r.',
  noEquipB: 'Опыт 4.6: поставьте полуцилиндр и осветитель на транспортир, затем записывайте r(i).',
  needCyl: 'Поставьте полуцилиндр в центр транспортира.',
  needEmit: 'Поставьте осветитель рядом с транспортиром.',
  taskA: 'Наведите луч на полуцилиндр, снимите i и r, посчитайте n = sin i / sin r.',
  taskB: 'Меняйте угол падения и записывайте r — постройте график r(i).',
  taskBNeedTwo: 'Снимите не менее двух углов, чтобы построить график r(i).',
  reset: 'Установка сброшена. Все приборы возвращены в комплект.',
  placedCyl: 'Полуцилиндр установлен на транспортире.',
  placedEmit: 'Осветитель установлен.',
} as const;

// ─── HintEngine (локальная копия — НЕ импортировать из lens-bench) ───────────

class HintEngine {
  #bar: HTMLElement;
  #live: HTMLElement;

  constructor(bar: HTMLElement, live: HTMLElement) {
    this.#bar = bar;
    this.#live = live;
  }

  update(st: RefractionState, taskBCount = 0): void {
    const semicylinderPlaced = st.placed.has('semicylinder');
    const emitterPlaced = st.placed.has('emitter');
    const isTaskA = st.activeTask === 'A-index';

    if (!semicylinderPlaced && !emitterPlaced) {
      // Контекст задачи включён даже без оборудования — смена задачи ДОЛЖНА менять хинт.
      this.#set(isTaskA ? HINTS.noEquipA : HINTS.noEquipB);
      return;
    }
    if (!semicylinderPlaced) {
      this.#set(HINTS.needCyl);
      return;
    }
    if (!emitterPlaced) {
      this.#set(HINTS.needEmit);
      return;
    }
    // Оба размещены — контекстная подсказка по задаче
    if (!isTaskA) {
      // B-angle (4.6): пока меньше 2 записей — напоминаем про минимум точек для графика
      this.#set(taskBCount < 2 ? HINTS.taskBNeedTwo : HINTS.taskB);
      return;
    }
    this.#set(HINTS.taskA);
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

// ─── RefractionExperiment ─────────────────────────────────────────────────────

export class RefractionExperiment {
  #refs: RefractionRefs;
  #store: Store<RefractionState>;
  #drag: OpticalDragController<RefractionKind, RefractionEquipmentId>;
  #hints: HintEngine;
  #cardByEquipmentId = new Map<RefractionEquipmentId, LabEquipmentCard>();

  // §21 — журнал v2
  #journalDrafts = new Map<number, Record<string, number | string>>();
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #detachRecordModeToggle: (() => void) | null = null;
  #lastRecordedSignature = '';
  #lastResultHtml = '';

  // График r(i) / sin r–sin i (только в B-angle)
  #graphMode: GraphMode = 'ri';

  constructor(refs: RefractionRefs) {
    this.#refs = refs;
    // Клонируем INITIAL_STATE: Set мутируется, нельзя делить между экземплярами
    this.#store = new Store<RefractionState>({
      ...INITIAL_STATE,
      placed: new Set<RefractionEquipmentId>(),
      measurements: [],
    });
    this.#drag = new OpticalDragController<RefractionKind, RefractionEquipmentId>(refs.dragOverlay);
    this.#hints = new HintEngine(refs.hintBar, refs.liveRegion);

    this.#wireUp();
    // Дефолтный угол инициализируем на диске
    refs.disc.setIncidenceAngle(DEFAULT_I_DEG);
    this.#refreshTaskStepper();
    this.#refreshUi(); // вызывает #hints.update внутри
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  get activeTask(): RefractionTaskId {
    return this.#store.get().activeTask;
  }

  get incidenceAngleDeg(): number {
    return this.#store.get().iDeg;
  }

  get refractionAngleDeg(): number {
    return this.#refs.disc.refractionAngleDeg;
  }

  get measurements(): ReadonlyArray<RefractionMeasurement> {
    return this.#store.get().measurements;
  }

  get bothPlaced(): boolean {
    const p = this.#store.get().placed;
    return p.has('semicylinder') && p.has('emitter');
  }

  /** Переключить задачу (A-index / B-angle). Измерения сохраняются. */
  setActiveTask(task: RefractionTaskId): void {
    this.#store.update(() => ({ activeTask: task }));
    this.#refreshTaskStepper();
    this.#refreshUi(); // вызывает #hints.update внутри
  }

  /**
   * Задать угол падения программно (проксирует в disc + обновляет Store).
   * Используется при подписке на angle-change или из тестов/selfcheck.
   */
  setIncidenceAngle(i: number): void {
    if (!Number.isFinite(i)) return;
    this.#refs.disc.setIncidenceAngle(i);
    // disc.setIncidenceAngle клампит и округляет → читаем обратно чтобы Store был синхронен
    this.#store.update(() => ({ iDeg: this.#refs.disc.incidenceAngleDeg }));
    this.#afterAngleChange();
  }

  /**
   * Записать измерение в журнал.
   * Условие: оба прибора размещены И i>0 (при i=0 преломления нет).
   * Анти-дубль по сигнатуре `${task}-${iDeg}`.
   */
  recordMeasurement(): void {
    if (!this.#canRecordNow()) return;
    if (this.#pendingSignature() === this.#lastRecordedSignature) return;

    const st = this.#store.get();
    const rDeg = this.#refs.disc.refractionAngleDeg;
    const measurement: RefractionMeasurement = {
      task: st.activeTask,
      iDeg: st.iDeg,
      rDeg,
      timestamp: Date.now(),
    };
    this.#store.update((s) => ({ measurements: [...s.measurements, measurement] }));
    this.#lastRecordedSignature = this.#pendingSignature();
    this.#refreshUi();

    // a11y no-leak: озвучиваем ТОЛЬКО измеренные i,r — n (число) не в live-region.
    this.#hints.announce(`Записано: угол падения ${st.iDeg}°, угол преломления ${rDeg}°.`);
  }

  /**
   * Сброс установки. Сохраняет activeTask, сбрасывает placed/measurements/угол.
   */
  reset(): void {
    this.#drag.cancel();
    const keepTask = this.#store.get().activeTask;
    this.#store.set({
      activeTask: keepTask,
      iDeg: DEFAULT_I_DEG,
      placed: new Set<RefractionEquipmentId>(),
      measurements: [],
    });
    this.#journalDrafts.clear();
    this.#journalVerdicts.clear();
    this.#lastRecordedSignature = '';
    this.#lastResultHtml = '';
    this.#graphMode = 'ri';
    if (this.#refs.graphToggleBtn) {
      this.#refs.graphToggleBtn.setAttribute('aria-pressed', 'false');
    }
    // Сбросить карточки в available
    for (const card of this.#cardByEquipmentId.values()) {
      card.setAttribute('status', 'available');
    }
    // Сбросить диск
    this.#refs.disc.setPlaced('semicylinder', false);
    this.#refs.disc.setPlaced('emitter', false);
    this.#refs.disc.setIncidenceAngle(DEFAULT_I_DEG);
    this.#refs.disc.setDragging(false);
    this.#refreshTaskStepper();
    this.#refreshUi(); // вызывает #hints.update внутри
    this.#hints.announce(HINTS.reset);
  }

  /** Cleanup при unmount. */
  destroy(): void {
    this.#drag.cancel();
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
  }

  /**
   * Программно разместить прибор в слот (для тестов и selfcheck).
   * Самостоятельный, БЕЗ topology (в отличие от lens-bench): добавляет в state.placed,
   * вызывает disc.setPlaced, и когда оба placed → disc.setIncidenceAngle(iDeg).
   */
  placeInSlot(kind: RefractionKind, equipmentId: RefractionEquipmentId): void {
    this.#recordPlacement(kind, equipmentId);
  }

  // ─── Wiring ──────────────────────────────────────────────────────────────

  #wireUp(): void {
    // ── Карточки оборудования ────────────────────────────────────────────
    this.#refs.cards.forEach((card) => {
      const equipmentId = card.dataset['eq'] as RefractionEquipmentId | undefined;
      if (!equipmentId || (equipmentId !== 'semicylinder' && equipmentId !== 'emitter')) return;
      this.#cardByEquipmentId.set(equipmentId, card);

      const kind = equipmentId as RefractionKind;

      // Бриф M2: селектор на .eq-glyph (НЕ тег-компонент lab-*)
      const draggable = card.querySelector<HTMLElement>('.eq-glyph');
      if (!draggable) return;

      this.#drag.attach(draggable, {
        equipmentId,
        kind,
        canDrag: () => {
          const c = this.#cardByEquipmentId.get(equipmentId);
          return !!c && c.getAttribute('status') !== 'placed';
        },
        onDragStart: () => {
          this.#refs.disc.setDragging(true);
          this.#refs.stage.classList.add('dragging-active');
        },
        onDragEnd: () => {
          this.#refs.disc.setDragging(false);
          this.#refs.stage.classList.remove('dragging-active');
        },
      });

      // Карточка как зона возврата (onDrop → false = не принимает, только подсветка)
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

    // ── Snap-зоны диска ──────────────────────────────────────────────────
    // semicylinder-slot: принимает 'semicylinder'
    this.#drag.addSnapZone({
      id: 'disc-slot-semicylinder',
      accepts: ['semicylinder'],
      getRect: () => this.#refs.disc.getSlotRect('semicylinder'),
      onHover: (active) => this.#refs.disc.setSlotHover('semicylinder', active),
      onDrop: ({ equipmentId, kind }) => {
        this.#recordPlacement(kind as RefractionKind, equipmentId as RefractionEquipmentId);
        return true;
      },
    });

    // emitter-slot: принимает 'emitter'
    this.#drag.addSnapZone({
      id: 'disc-slot-emitter',
      accepts: ['emitter'],
      getRect: () => this.#refs.disc.getSlotRect('emitter'),
      onHover: (active) => this.#refs.disc.setSlotHover('emitter', active),
      onDrop: ({ equipmentId, kind }) => {
        this.#recordPlacement(kind as RefractionKind, equipmentId as RefractionEquipmentId);
        return true;
      },
    });

    // ── Подписка на angle-change (disc эмитит при движении хэндла) ────────
    this.#refs.disc.addEventListener('angle-change', (ev: Event) => {
      const detail = (ev as CustomEvent<{ i: number; r: number }>).detail;
      if (!detail || !Number.isFinite(detail.i)) return;
      // Не реагируем, если Store уже синхронен (setIncidenceAngle сам эмитит event
      // и уже вызвал #afterAngleChange — избегаем двойной пересборки/автозаписи).
      if (this.#store.get().iDeg === detail.i) return;
      this.#store.update(() => ({ iDeg: detail.i }));
      this.#afterAngleChange();
    });

    // ── Кнопка сброса ────────────────────────────────────────────────────
    this.#refs.resetBtn.addEventListener('click', () => this.reset());

    // ── Task-switcher (WAI-ARIA Tabs) ─────────────────────────────────────
    this.#refs.steps.addEventListener('click', (ev) => {
      const t = (ev.target as HTMLElement).closest('[data-task]');
      if (!t) return;
      const tid = (t as HTMLElement).dataset['task'] as RefractionTaskId | undefined;
      if (tid === 'A-index' || tid === 'B-angle') this.setActiveTask(tid);
    });

    this.#refs.steps.addEventListener('keydown', (ev) => {
      const items = [...this.#refs.steps.querySelectorAll<HTMLElement>('[data-task]')];
      if (items.length === 0) return;
      const currentIdx = items.findIndex(
        (el) => el === document.activeElement || el.tabIndex === 0,
      );
      let nextIdx = currentIdx;
      if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        nextIdx = (currentIdx + 1) % items.length;
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        nextIdx = (currentIdx - 1 + items.length) % items.length;
      } else if (ev.key === 'Home') {
        ev.preventDefault();
        nextIdx = 0;
      } else if (ev.key === 'End') {
        ev.preventDefault();
        nextIdx = items.length - 1;
      } else if (ev.key === 'Enter' || ev.key === ' ') {
        const t = (ev.target as HTMLElement).closest('[data-task]');
        if (!t) return;
        ev.preventDefault();
        const tid = (t as HTMLElement).dataset['task'] as RefractionTaskId | undefined;
        if (tid === 'A-index' || tid === 'B-angle') this.setActiveTask(tid);
        return;
      } else {
        return;
      }
      const nextItem = items[nextIdx];
      if (nextItem) {
        const tid = nextItem.dataset['task'] as RefractionTaskId | undefined;
        if (tid === 'A-index' || tid === 'B-angle') {
          this.setActiveTask(tid);
          nextItem.focus();
        }
      }
    });

    // ── §21.4 — record-mode toggle ───────────────────────────────────────
    if (this.#refs.recordModeSlot) {
      injectRecordModeToggleStyles();
      this.#detachRecordModeToggle = renderRecordModeToggle(this.#refs.recordModeSlot, {
        kitId: RECORD_MODE_KIT,
        onChange: () => this.#handleRecordModeChange(),
      });
    }

    // ── §21.10 — pending-плашка (кнопка «Записать в журнал») ─────────────
    if (this.#refs.recordPendingBtn) {
      this.#refs.recordPendingBtn.addEventListener('click', () => {
        this.recordMeasurement();
      });
    }

    // ── График toggle (r(i) ↔ sin r–sin i) ───────────────────────────────
    if (this.#refs.graphToggleBtn) {
      this.#refs.graphToggleBtn.addEventListener('click', () => {
        this.#graphMode = this.#graphMode === 'ri' ? 'sin' : 'ri';
        const btn = this.#refs.graphToggleBtn!;
        btn.setAttribute('aria-pressed', this.#graphMode === 'sin' ? 'true' : 'false');
        this.#refreshGraph();
      });
    }
  }

  // ─── Внутренняя логика ────────────────────────────────────────────────────

  /**
   * Записать размещение: обновить Set placed, вызвать disc.setPlaced.
   * Когда оба placed → disc.setIncidenceAngle(iDeg) (лучи появляются).
   * Самостоятельный — не требует topology (в отличие от lens-bench).
   */
  #recordPlacement(kind: RefractionKind, equipmentId: RefractionEquipmentId): void {
    const st = this.#store.get();
    // Клонируем Set (immutable style — Store.update требует новое значение)
    const newPlaced = new Set(st.placed);
    newPlaced.add(equipmentId);
    this.#store.update(() => ({ placed: newPlaced }));

    this.#refs.disc.setPlaced(kind, true);

    // Пометить карточку как placed
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (card) {
      card.setAttribute('status', 'placed');
    }

    // Когда оба placed → включить лучи через setIncidenceAngle
    if (newPlaced.has('semicylinder') && newPlaced.has('emitter')) {
      this.#refs.disc.setIncidenceAngle(this.#store.get().iDeg);
    }

    this.#hints.announce(kind === 'semicylinder' ? HINTS.placedCyl : HINTS.placedEmit);
    this.#afterAngleChange(); // вызывает #refreshUi → #hints.update внутри
  }

  // ─── Журнал v2 (§21) ───────────────────────────────────────────────────────

  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  /** Запись доступна: оба прибора на транспортире И i>0 (при i=0 нет преломления). */
  #canRecordNow(): boolean {
    return this.bothPlaced && this.#store.get().iDeg > 0;
  }

  /** Число записей задачи B-angle (для хинта ≥2 углов). */
  #taskBCount(): number {
    return this.#store.get().measurements.filter((m) => m.task === 'B-angle').length;
  }

  /** Сигнатура анти-дубля: одна строка на каждый угол падения в задаче. */
  #pendingSignature(): string {
    if (!this.#canRecordNow()) return '';
    const st = this.#store.get();
    return `${st.activeTask}-${st.iDeg}`;
  }

  /**
   * Реакция на смену угла падения: fully-auto авто-запись + пересборка UI.
   * Вызывается из setIncidenceAngle, angle-change и #recordPlacement.
   */
  #afterAngleChange(): void {
    if (
      this.#recordMode() === 'fully-auto' &&
      this.#canRecordNow() &&
      this.#pendingSignature() !== this.#lastRecordedSignature
    ) {
      this.recordMeasurement();
      return; // recordMeasurement уже вызвал #refreshUi
    }
    this.#refreshUi();
  }

  /** Смена режима записи: fully-auto → авто-запись готового замера, затем пересборка. */
  #handleRecordModeChange(): void {
    if (
      this.#recordMode() === 'fully-auto' &&
      this.#canRecordNow() &&
      this.#pendingSignature() !== this.#lastRecordedSignature
    ) {
      this.recordMeasurement();
      return;
    }
    this.#refreshUi();
  }

  #refreshUi(): void {
    const st = this.#store.get();
    const spec = SPEC_BY_TASK[st.activeTask];
    const mode = this.#recordMode();
    const taskMeasurements = st.measurements.filter((m) => m.task === st.activeTask);
    const hasMeasurements = taskMeasurements.length > 0;

    // ── Pending-плашка (только semi-auto, §21.10) ──────────────────────────
    const isPending =
      this.#canRecordNow() && this.#pendingSignature() !== this.#lastRecordedSignature;
    if (this.#refs.recordPendingSlot) {
      this.#refs.recordPendingSlot.hidden = !(isPending && mode === 'semi-auto');
    }
    if (this.#refs.recordPendingSummary && isPending) {
      // i,r — измерения, показывать можно (n — НЕ показываем).
      this.#refs.recordPendingSummary.textContent =
        `i = ${st.iDeg}°, r = ${this.#refs.disc.refractionAngleDeg}°`;
    }

    // ── Таблица журнала ────────────────────────────────────────────────────
    if (hasMeasurements && this.#refs.journalHost) {
      this.#refs.journalHost.hidden = false;
      const rows = this.#buildJournalRows(taskMeasurements);
      renderJournalTable(this.#refs.journalHost, spec, rows, {
        mode: mode as 'semi-auto' | 'fully-manual' | 'fully-auto',
        onCellInput: (rowIdx, key, value) => {
          const m = taskMeasurements[rowIdx - 1];
          if (!m) return;
          const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
          if (value !== null) drafts[key] = value;
          else delete drafts[key];
          this.#journalDrafts.set(m.timestamp, drafts);
        },
        onVerify: (rowIdx) => {
          const m = taskMeasurements[rowIdx - 1];
          if (!m) return;
          const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
          const journalRow = this.#buildJournalRow(m, rowIdx);
          for (const [k, v] of Object.entries(drafts)) journalRow.values[k] = v;
          const verdicts = verifyRow(spec.columns, journalRow);
          this.#journalVerdicts.set(m.timestamp, verdicts);
          this.#refreshUi();
        },
      });
    } else if (this.#refs.journalHost) {
      this.#refs.journalHost.hidden = true;
      this.#refs.journalHost.replaceChildren();
    }

    // ── Result-panel (a11y no-leak: n только в fully-auto) ─────────────────
    this.#renderResultPanel(taskMeasurements, mode);

    // ── График r(i) / sin r–sin i (только B-angle) ─────────────────────────
    this.#refreshGraph();

    this.#refreshTaskStepper();

    // ── Хинт (актуализируем после каждого изменения UI, включая запись) ─────
    this.#hints.update(st, this.#taskBCount());
  }

  #buildJournalRows(list: ReadonlyArray<RefractionMeasurement>): JournalRow[] {
    return list.map((m, i) => {
      const row = this.#buildJournalRow(m, i + 1);
      const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
      for (const [k, v] of Object.entries(drafts)) row.values[k] = v;
      const verdicts = this.#journalVerdicts.get(m.timestamp);
      if (verdicts) row.verdicts = verdicts;
      return row;
    });
  }

  /**
   * Строка журнала. i_deg,r_deg — direct (всегда из измеренных углов).
   * n — derived: заполняется программой ТОЛЬКО в fully-auto, иначе null
   * (ученик вводит сам; пустой input в semi-auto/fully-manual — no-leak).
   */
  #buildJournalRow(m: RefractionMeasurement, idx: number): JournalRow {
    const isFullyAuto = this.#recordMode() === 'fully-auto';
    const values: Record<string, number | string | null> = {
      idx,
      i_deg: m.iDeg,
      r_deg: m.rDeg,
    };
    if (m.task === 'A-index') {
      values['n'] = isFullyAuto ? refractiveIndexFrom(m.iDeg, m.rDeg) : null;
    }
    return { idx, timestamp: m.timestamp, values };
  }

  /**
   * Обновить лаб-граф r(i) или sin r–sin i.
   * Вызывается из #refreshUi() и из переключателя.
   * Блок #graph-block показывается только в B-angle.
   */
  #refreshGraph(): void {
    const graphBlock = this.#refs.graphHost;
    const st = this.#store.get();

    if (!graphBlock) return;

    // Показываем блок только в B-angle
    const isTaskB = st.activeTask === 'B-angle';
    graphBlock.hidden = !isTaskB;

    if (!isTaskB) return;

    const graph = graphBlock.querySelector<LabGraph & HTMLElement>('#refraction-graph');
    if (!graph) return;

    const taskMeasurements = st.measurements.filter((m) => m.task === 'B-angle');

    if (this.#graphMode === 'ri') {
      graph.data = {
        series: [
          {
            id: 'ri',
            color: '#a855f7',
            fit: 'curve',
            points: taskMeasurements.map((m, k) => ({
              id: String(k),
              x: m.iDeg,
              y: m.rDeg,
              label: `i=${m.iDeg}°, r=${m.rDeg}°`,
            })),
          },
        ],
        xLabel: 'i, °',
        yLabel: 'r, °',
        xMax: 90,
        yMax: 45,
        gridXStep: 10,
        gridYStep: 5,
      };
    } else {
      graph.data = {
        series: [
          {
            id: 'ri-sin',
            color: '#a855f7',
            fit: 'line',
            points: taskMeasurements.map((m, k) => ({
              id: String(k),
              x: Math.sin(m.iDeg * DEG_TO_RAD),
              y: Math.sin(m.rDeg * DEG_TO_RAD),
              label: `sin i=${Math.sin(m.iDeg * DEG_TO_RAD).toFixed(3)}, sin r=${Math.sin(m.rDeg * DEG_TO_RAD).toFixed(3)}`,
            })),
          },
        ],
        xLabel: 'sin i',
        yLabel: 'sin r',
        xMax: 1,
        yMax: 1,
        gridXStep: 0.2,
        gridYStep: 0.2,
      };
    }
  }

  /**
   * Result-panel. Для 4.3 (A-index):
   *   - fully-auto → показываем среднее n (можно палить ответ после записи).
   *   - semi-auto/fully-manual → качественный текст БЕЗ числа n.
   * Для 4.6 (B-angle) — про зависимость r(i), без числа n.
   */
  #renderResultPanel(list: ReadonlyArray<RefractionMeasurement>, mode: RecordMode): void {
    const panel = this.#refs.resultPanel;
    if (list.length === 0) {
      panel.hidden = true;
      panel.innerHTML = '';
      this.#lastResultHtml = '';
      return;
    }

    const isFullyAuto = mode === 'fully-auto';
    const task = list[0]!.task;
    let html: string;

    if (task === 'A-index') {
      if (isFullyAuto) {
        const avg =
          list.reduce((s, m) => s + refractiveIndexFrom(m.iDeg, m.rDeg), 0) / list.length;
        const avgStr = avg.toFixed(2).replace('.', ',');
        html =
          `<p class="result-line"><strong>n</strong> = ${avgStr} ≈ 1,5 (постоянно для стекла)</p>` +
          `<p class="result-note">Показатель преломления не зависит от угла падения: n = sin i / sin r.</p>`;
      } else {
        // a11y no-leak: НИ «≈1,5», НИ иного значения n — только качественный текст.
        html =
          `<p class="result-line">Показатель преломления стекла постоянен и не зависит ` +
          `от угла падения — вычислите n = sin i / sin r по своим измерениям.</p>`;
      }
    } else {
      // B-angle (4.6): качественный вывод без числа n (a11y no-leak).
      html =
        `<p class="result-line">Угол преломления растёт с углом падения, но всё медленнее (нелинейно).</p>` +
        `<p class="result-note">В осях sin r–sin i зависимость линейна (закон Снелла).</p>`;
    }

    panel.hidden = false;
    if (html !== this.#lastResultHtml) {
      panel.innerHTML = html;
      this.#lastResultHtml = html;
    }
  }

  /** Обновить aria-selected и tabIndex на [data-task] кнопках. */
  #refreshTaskStepper(): void {
    const active = this.#store.get().activeTask;
    const items = this.#refs.steps.querySelectorAll<HTMLElement>('[data-task]');
    items.forEach((item) => {
      const isActive = item.dataset['task'] === active;
      item.setAttribute('data-state', isActive ? 'active' : '');
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
      item.setAttribute('aria-current', isActive ? 'true' : 'false');
      item.tabIndex = isActive ? 0 : -1;
    });
  }
}
