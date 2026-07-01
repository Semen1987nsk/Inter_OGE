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
 * Журнал/график — T7/T8, здесь минимальная заглушка recordMeasurement.
 */

import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { Store } from '@controller/Store';
import { OpticalDragController } from '@controller/OpticalDragController';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** ID активной задачи экрана refraction. */
export type RefractionTaskId = 'A-index' | 'B-angle';

/** ID/Kind оборудования комплекта преломления. */
export type RefractionEquipmentId = 'semicylinder' | 'emitter';
export type RefractionKind = 'semicylinder' | 'emitter';

/** Одна запись измерения. */
export interface RefractionMeasurement {
  readonly task: RefractionTaskId;
  readonly iDeg: number;
  readonly rDeg: number;
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

  update(st: RefractionState): void {
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
    this.#set(isTaskA ? HINTS.taskA : HINTS.taskB);
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
    this.#hints.update(this.#store.get());
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
    this.#hints.update(this.#store.get());
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
  }

  /**
   * Записать измерение (минимальная заглушка T5 — журнал подключается в T7).
   * Условие: bothPlaced = true.
   */
  recordMeasurement(): void {
    if (!this.bothPlaced) return;
    const st = this.#store.get();
    const measurement: RefractionMeasurement = {
      task: st.activeTask,
      iDeg: st.iDeg,
      rDeg: this.#refs.disc.refractionAngleDeg,
    };
    this.#store.update((s) => ({ measurements: [...s.measurements, measurement] }));
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
    this.#hints.update(this.#store.get());
    this.#hints.announce(HINTS.reset);
  }

  /** Cleanup при unmount. */
  destroy(): void {
    this.#drag.cancel();
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
      this.#store.update(() => ({ iDeg: detail.i }));
      // T7: здесь будет #afterAngleChange() (pending)
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

    // ── Кнопка «Записать» (pending-плашка, T7 подключит полный журнал) ───
    if (this.#refs.recordPendingBtn) {
      this.#refs.recordPendingBtn.addEventListener('click', () => {
        this.recordMeasurement();
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
    this.#hints.update(this.#store.get());
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
