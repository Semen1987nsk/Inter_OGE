/**
 * SpringExperiment — главный оркестратор опыта 2.1 (v3).
 *
 * Управляет полным workflow:
 *  1. Сборка установки (drag&drop пружины из карточки на штатив, динамометра/груза на пружину).
 *  2. Анимация колебаний пружины при изменении нагрузки (физика — SpringModel).
 *  3. Цепочка грузов с правильным позиционированием.
 *  4. Измерения: клик по шкале планшета → запись l₀/l₁ → кнопка «Записать в журнал».
 *  5. Расчёт результата (среднее k, проверка интервала по ФИПИ).
 *  6. Граф F(Δl) и reset.
 *
 * Архитектурно:
 *  - Store держит SpringSetupState, остальное — производные.
 *  - DragController управляет drag&drop через snap-зоны.
 *  - HintEngine генерирует подсказки по текущему состоянию.
 */

import type { LabSpringBoard } from '@/ui/components/lab-spring-board';
import type { LabDynamometer } from '@/ui/components/lab-dynamometer';
import type { LabStand } from '@/ui/components/lab-stand';
import type { LabEquipmentCard } from '@/ui/components/lab-equipment-card';
import type { LabGraph } from '@/ui/components/lab-graph';
import type { LabCompositeTray } from '@/ui/components/lab-composite-tray';
import type { LabCompositeWeight } from '@/ui/components/lab-composite-weight';

import { Store } from '@controller/Store';
import { DragController, type AttachKind, type SnapZone } from './controller/DragController';
import { HintEngine } from './controller/HintEngine';
import {
  DYNAMOMETER_CONFIG,
  INITIAL_SETUP_STATE,
  SPRING_CONFIG,
  WEIGHT_CONFIG,
  type AttachedSpring,
  type AttachedWeight,
  type EquipmentId,
  type SpringSetupState,
} from '@/types/spring/setup';
import {
  dampedOscillation,
  forceToExtension,
  massToForce,
  oscillationDuration,
  totalMass,
} from '@physics/spring/SpringModel';
import { computeResults, createMeasurement } from '@physics/spring/Measurement';
import { VALID_K_RANGE } from '@/types/spring';

// §20.4 + §21 — единый журнал v2 + record-mode toggle (порт из legacy 2-1-spring).
import {
  getRecordMode,
  injectRecordModeToggleStyles,
  renderRecordModeToggle,
  type RecordMode,
} from '@labosfera/shared-spa/lib/record-mode';
import { renderJournalTable } from '@labosfera/shared-spa/lib/journal/render';
import { SPRING_SPEC } from '@labosfera/shared-spa/lib/journal/specs';
import { verifyRow } from '@labosfera/shared-spa/lib/journal/verify';
import { parseRu } from '@labosfera/shared-spa/lib/journal/format';
import type { JournalVerdict, JournalRow, JournalSpec } from '@labosfera/shared-spa/lib/journal/types';

const RECORD_MODE_KIT = 'kit-2';

export interface ExperimentRefs {
  stage: HTMLElement;
  standContainer: HTMLElement;
  stand: LabStand;
  dragOverlay: HTMLElement;
  dropZoneSpring: HTMLElement;
  dropZoneBottom: HTMLElement;
  hintBar: HTMLElement;
  journalEmpty: HTMLElement;
  journalTable: HTMLTableElement;
  journalBody: HTMLElement;
  liveRegion: HTMLElement;
  resultPanel: HTMLElement;
  graph: LabGraph;
  recordBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  cards: NodeListOf<LabEquipmentCard>;
  /** Сборочный верстак для наборного груза (заменяет 4 отдельные карточки). */
  compositeTray: LabCompositeTray | null;
  /** Floating-панель с журналом и графиком, появляющаяся при первом измерении. */
  measurementPanel: HTMLElement;
  /** Кнопка-тогглер свёртывания measurement-panel. */
  measurementToggle: HTMLButtonElement;
  /** Счётчик измерений в шапке панели (badge). */
  measurementCount: HTMLElement;
  /** Stepper-список шагов в шапке workbench. */
  steps: HTMLElement;
  /** Баннер «указатель за шкалой» — мягкое предупреждение при перерастяжении. */
  overloadBanner: HTMLElement;
  /** Форма ручного ввода в журнал (l₀, l₁, m). LEGACY fallback. */
  recordForm: HTMLFormElement;
  rfL0: HTMLInputElement;
  rfL1: HTMLInputElement;
  rfMass: HTMLOutputElement;
  rfCancel: HTMLButtonElement;
  rfSubmit: HTMLButtonElement;
  /** §20.4 — slot для record-mode toggle (3-сегментный switch). */
  recordModeSlot?: HTMLElement | undefined;
  /** §21 — контейнер для shared `renderJournalTable` (SPRING_SPEC). */
  journalHost?: HTMLElement | undefined;
  /** §21.10 — pending-плашка «Записать в журнал» (semi-auto). */
  recordPendingSlot?: HTMLElement | undefined;
  recordPendingBtn?: HTMLButtonElement | undefined;
  recordPendingSummary?: HTMLElement | undefined;
}


/**
 * Опциональные кастомные рендереры — используются «дочерними» экранами
 * (например spring-work) которые переиспользуют физику и UI базового
 * опыта 2.1, но показывают другие колонки в журнале и другую формулу
 * результата. Если рендерер не задан — работает дефолтное поведение 2.1.
 *
 * Для миграции v1→v2 (spring-work): использовать `journalSpec`+`buildRows`
 * вместо `journal` (legacy). Это даёт v2-таблицу с нужным SPEC без ручного innerHTML.
 */
export interface SpringRenderers {
  /**
   * @deprecated v1 legacy — рисует в #journal-table через innerHTML.
   * Мигрировать на `journalSpec`+`buildRows` (v2).
   */
  journal?: (state: SpringSetupState, refs: {
    journalEmpty: HTMLElement;
    journalTable: HTMLTableElement;
    journalBody: HTMLElement;
  }) => void;
  /** v2: другой SPEC журнала (вместо SPRING_SPEC по умолчанию). */
  journalSpec?: JournalSpec;
  /** v2: кастомный построитель строк журнала (вместо дефолтного для 2.1). */
  buildRows?: (
    state: SpringSetupState,
    drafts: Map<number, Record<string, number>>,
    mode: RecordMode,
  ) => JournalRow[];
  result?: (state: SpringSetupState, refs: { resultPanel: HTMLElement }) => void;
}

export class SpringExperiment {
  #refs: ExperimentRefs;
  #renderers: SpringRenderers;
  #store: Store<SpringSetupState>;
  #drag: DragController;
  #hints: HintEngine;
  #springMount: HTMLDivElement;
  #hungStack: HTMLDivElement;
  #attachedSpringEl: LabSpringBoard | null = null;
  #attachedDynoEl: LabDynamometer | null = null;
  #attachedWeightEls: HTMLElement[] = [];
  #cardByEquipmentId = new Map<EquipmentId, LabEquipmentCard>();
  #oscillationRafId: number | null = null;

  // §21 — журнал v2: drafts (черновики input'ов) и verdicts (результаты ✓-проверки)
  // ключ = timestamp измерения (sentinel -1 = empty manual row).
  #journalDrafts = new Map<number, Record<string, number>>();
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #detachRecordModeToggle: (() => void) | null = null;
  /** Сигнатура последней записанной строки — для дедупликации pending-плашки. */
  #lastRecordedSignature = '';

  constructor(refs: ExperimentRefs, renderers: SpringRenderers = {}) {
    this.#refs = refs;
    this.#renderers = renderers;
    this.#store = new Store<SpringSetupState>({ ...INITIAL_SETUP_STATE });
    this.#drag = new DragController(refs.dragOverlay);
    this.#hints = new HintEngine(refs.hintBar, refs.liveRegion);

    // Mount-контейнер: куда монтируется вся подвешенная конструкция.
    this.#springMount = document.createElement('div');
    this.#springMount.className = 'hung-mount';
    this.#hungStack = document.createElement('div');
    this.#hungStack.className = 'hung-stack';
    this.#springMount.appendChild(this.#hungStack);
    refs.standContainer.appendChild(this.#springMount);

    this.#wireUp();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
  }

  // ─── Public API ─────────────────────────────────────────────

  /** Программный API: подцепить пружину по equipmentId. Используется E2E тестами. */
  attachSpringById(equipmentId: 'spring-k50' | 'spring-k10'): boolean {
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (!card) return false;
    const el = card.querySelector<LabSpringBoard>('lab-spring-board');
    if (!el) return false;
    return this.#attachSpring(el, equipmentId);
  }

  /**
   * Программный API: подцепить динамометр.
   * @param target — куда подвесить: на пружину (по умолчанию, классический сценарий)
   *                 или сразу на штатив (для взвешивания грузов).
   */
  attachDynamometerById(
    equipmentId: 'dyno-1' | 'dyno-5',
    target: 'spring' | 'stand' = 'spring',
  ): boolean {
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (!card) return false;
    const el = card.querySelector<LabDynamometer>('lab-dynamometer');
    if (!el) return false;
    return target === 'stand'
      ? this.#attachDynamometerToStand(el, equipmentId)
      : this.#attachDynamometerToSpring(el, equipmentId);
  }

  /** Программный API: подвесить груз. */
  attachWeightById(equipmentId: EquipmentId): boolean {
    // composite-load — лежит в lab-composite-tray, не в обычной карточке.
    if (equipmentId === 'composite-load') {
      const tray = this.#refs.compositeTray;
      const el = tray?.getCompositeEl();
      if (!el) return false;
      return this.#attachWeight(el, equipmentId);
    }
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (!card) return false;
    const el = card.querySelector<HTMLElement>('lab-weight, lab-composite-weight');
    if (!el) return false;
    return this.#attachWeight(el, equipmentId);
  }

  /** Программный API: записать клик по шкале. */
  recordScaleClick(valueMm: number): void {
    this.#handleScaleClick(valueMm);
  }

  /** Программный API: подтвердить запись текущего измерения в журнал. */
  recordMeasurement(): void {
    this.#recordMeasurement();
  }

  /** Cleanup: отключить record-mode toggle disposer (вызывается в SpringStiffnessScreen.unmount). */
  destroy(): void {
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
  }

  /** Сбросить все измерения и снять оборудование с установки. */
  reset(): void {
    // Если в момент reset() ученик ещё держит элемент мышью (drag активен) —
    // отменяем его принудительно. Иначе элемент завис бы в overlay вне DOM-tree
    // эксперимента, и следующий attach мог бы провалиться.
    this.#drag.cancel();

    if (this.#attachedSpringEl) {
      const id = this.#store.get().spring?.equipmentId;
      if (id) this.#returnElementToCard(id, this.#attachedSpringEl);
    }
    if (this.#attachedDynoEl) {
      const id = this.#store.get().dynamometer?.equipmentId;
      if (id) this.#returnElementToCard(id, this.#attachedDynoEl);
    }
    for (const w of [...this.#attachedWeightEls]) {
      const id = w.dataset['equipmentId'] as EquipmentId | undefined;
      if (id) this.#returnElementToCard(id, w);
    }
    this.#attachedSpringEl = null;
    this.#attachedDynoEl = null;
    this.#attachedWeightEls = [];

    this.#stopOscillation();
    this.#store.set({ ...INITIAL_SETUP_STATE });
    this.#drag.removeSnapZone('bottom-hook');
    // §21 — журнал v2: drafts (черновики ввода) и verdicts (вердикты ✓) сбрасываем.
    this.#journalDrafts.clear();
    this.#journalVerdicts.clear();
    this.#lastRecordedSignature = '';
    // Сборочный верстак: вернуть узел в карточку и разобрать диски.
    this.#refs.compositeTray?.reset();
    // Сбрасываем длину штатива и скрываем баннер
    this.#refs.stand.rodExtra = 0;
    if (this.#refs.overloadBanner) this.#refs.overloadBanner.hidden = true;
    // После сброса rodExtra mount-позиция могла измениться
    requestAnimationFrame(() => this.#updateMountPosition());
    this.#refreshUi();
    this.#announce('Установка сброшена. Все приборы вернулись в комплект.');
  }

  // ─── Wiring ─────────────────────────────────────────────────

  #wireUp(): void {
    this.#refs.cards.forEach((card) => {
      const equipmentId = card.dataset['eq'] as EquipmentId | undefined;
      if (!equipmentId) return;
      this.#cardByEquipmentId.set(equipmentId, card);

      const draggable = card.querySelector<HTMLElement>(
        'lab-spring-board, lab-dynamometer, lab-weight, lab-composite-weight',
      );
      if (!draggable) return;
      draggable.dataset['equipmentId'] = equipmentId;

      const kind = this.#kindForEquipment(equipmentId);
      this.#drag.attach(draggable, {
        equipmentId,
        kind,
        onDragStart: () => {
          this.#store.set({ dragging: equipmentId });
          this.#refreshDropZoneVisibility();
        },
        onDragEnd: (accepted) => {
          this.#store.set({ dragging: null });
          if (!accepted) this.#hints.flash('Поднесите ближе к точке крепления.');
          this.#refreshDropZoneVisibility();
          // Defensive: убрать «прилипшие» gold-rings (.snap-target).
          this.#clearAllSnapTargets();
        },
      });

      // Карточка перекидывает событие equipment-pick (от кнопки) на drag через keyboard
      card.addEventListener('equipment-pick', () => {
        // Программный путь: эквивалентен «успешному drag в первую совместимую зону»
        if (kind === 'spring') {
          this.#attachSpring(draggable as LabSpringBoard, equipmentId);
        } else if (kind === 'dynamometer') {
          // Если штатив свободен — на штатив (для взвешивания); иначе — на пружину.
          if (!this.#attachedSpringEl && !this.#attachedDynoEl) {
            this.#attachDynamometerToStand(draggable as LabDynamometer, equipmentId);
          } else {
            this.#attachDynamometerToSpring(draggable as LabDynamometer, equipmentId);
          }
        } else {
          this.#attachWeight(draggable, equipmentId);
        }
      });
    });

    this.#drag.addSnapZone(this.#makeSpringHookZone());

    // ─── Сборочный верстак: композитный груз + диски ─────────────────────
    this.#wireCompositeTray();

    // §20.4 — toggle режима записи (semi-auto / fully-manual / fully-auto).
    if (this.#refs.recordModeSlot) {
      injectRecordModeToggleStyles();
      this.#detachRecordModeToggle = renderRecordModeToggle(this.#refs.recordModeSlot, {
        kitId: RECORD_MODE_KIT,
        onChange: () => this.#handleRecordModeChange(),
      });
    }

    // §21.10 — pending-плашка для semi-auto: click → recordMeasurement.
    if (this.#refs.recordPendingBtn) {
      this.#refs.recordPendingBtn.addEventListener('click', () => {
        this.#recordMeasurement();
      });
    }

    // Кнопка «Записать в журнал»: в fully-auto — сразу запись, иначе — форма ручного ввода.
    this.#refs.recordBtn.addEventListener('click', () => {
      if (this.#recordMode() === 'fully-auto') {
        this.#recordMeasurement();
      } else {
        this.#openRecordForm();
      }
    });
    // Форма ручного ввода
    this.#refs.rfCancel.addEventListener('click', () => this.#closeRecordForm());
    this.#refs.recordForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      this.#submitRecordForm();
    });
    this.#refs.resetBtn.addEventListener('click', () => {
      if (this.#store.get().measurements.length === 0 && !this.#store.get().spring) {
        this.reset();
        return;
      }
      if (confirm('Сбросить все измерения и вернуть оборудование в комплект?')) {
        this.reset();
      }
    });

    // Тогглер measurement-panel: ученик может свернуть панель, если она мешает
    // смотреть на установку. По умолчанию развёрнута.
    this.#refs.measurementToggle.addEventListener('click', () => {
      const collapsed = this.#refs.measurementPanel.getAttribute('aria-collapsed') === 'true';
      this.#refs.measurementPanel.setAttribute('aria-collapsed', collapsed ? 'false' : 'true');
      this.#refs.measurementToggle.setAttribute('aria-expanded', collapsed ? 'true' : 'false');
    });

    window.addEventListener('resize', () => {
      this.#updateMountPosition();
      this.#updateDropZonePositions();
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.#updateMountPosition();
        this.#updateDropZonePositions();
      }),
    );
  }

  #kindForEquipment(id: EquipmentId): AttachKind {
    if (id === 'spring-k50' || id === 'spring-k10') return 'spring';
    if (id === 'dyno-1' || id === 'dyno-5') return 'dynamometer';
    // Диски комплектного груза — отдельный kind, чтобы их нельзя было повесить
    // на пружину/динамометр напрямую (только на штангу через snap-зону composite-rod).
    if (id === 'disc-10' || id === 'disc-20' || id === 'disc-50') return 'disc';
    return 'weight'; // включая composite-load
  }

  // ─── Snap-зоны ──────────────────────────────────────────────

  /**
   * Подключение «сборочного верстака» наборного груза.
   * Регистрирует:
   *   - composite-weight (узел) — draggable с equipmentId='composite-load', kind='weight'.
   *   - 3 disc-weight (50/20/10 г) — draggable kind='disc'.
   *   - snap-зону 'composite-rod' на узле — accepts 'disc' → tray.addDisc(mass).
   *
   * Спека: .business/спеки/2026-05-14-наборный-груз-сборочный-верстак.md
   */
  #wireCompositeTray(): void {
    const tray = this.#refs.compositeTray;
    if (!tray) return;

    const composite = tray.getCompositeEl();
    if (!composite) return;
    composite.dataset['equipmentId'] = 'composite-load';
    this.#drag.attach(composite, {
      equipmentId: 'composite-load',
      kind: 'weight',
      onDragStart: () => {
        this.#store.set({ dragging: 'composite-load' });
        this.#refreshDropZoneVisibility();
      },
      onDragEnd: (accepted) => {
        this.#store.set({ dragging: null });
        if (!accepted) this.#hints.flash('Поднесите ближе к нижнему крюку.');
        this.#refreshDropZoneVisibility();
        // Defensive: убрать «прилипшие» gold-rings (.snap-target).
        this.#clearAllSnapTargets();
      },
    });

    // 3 диска. Drag => только на штангу (snap-zone composite-rod).
    for (const discEl of tray.getDiscEls()) {
      const eqId = discEl.dataset['eq'] as EquipmentId | undefined;
      if (!eqId) continue;
      discEl.dataset['equipmentId'] = eqId;
      this.#drag.attach(discEl, {
        equipmentId: eqId,
        kind: 'disc',
        onDragStart: () => {
          this.#store.set({ dragging: eqId });
        },
        onDragEnd: (accepted) => {
          this.#store.set({ dragging: null });
          if (!accepted) this.#hints.flash('Перетащите диск на штангу — на стержень узла.');
          // Регрессия Iter 1: drop-zone-bottom не пересчитывал видимость
          // после disc-drop'а → пульсировал в idle-state. Теперь явно вызываем.
          this.#refreshDropZoneVisibility();
          // Defensive: убрать «прилипшие» gold-rings (.snap-target).
          this.#clearAllSnapTargets();
        },
      });
    }

    // Snap-zone «надеть диск на штангу». Принимает только kind='disc'.
    // Геометрия — bounding-rect composite-weight (он же в карточке, он же в hung-stack
    // если узел висит на пружине), радиус 90 px.
    this.#drag.addSnapZone({
      id: 'composite-rod',
      accepts: ['disc'],
      snapRadius: 110,
      getRect: () => composite.getBoundingClientRect(),
      onHover: (active) => {
        if (active) composite.setAttribute('data-slot-target', '');
        else composite.removeAttribute('data-slot-target');
      },
      onDrop: ({ element, equipmentId }) => {
        const mass = equipmentId === 'disc-10' ? 10 : equipmentId === 'disc-20' ? 20 : 50;
        const added = tray.addDisc(mass, element);
        if (!added) {
          this.#hints.flash(`Диск ${mass} г уже надет.`);
          return false;
        }
        composite.removeAttribute('data-slot-target');
        // Если узел висит на пружине → пересчитать оba: цепочку (геометрия штанги
        // не изменилась, но getMass() стал больше) И колебания.
        if (this.#attachedWeightEls.includes(composite)) {
          // Обновить mass в store: ищем по equipmentId и пересчитываем
          this.#syncCompositeMassInStore();
          this.#updateChainPositions();
          if (this.#attachedSpringEl) this.#startOscillation();
          else if (this.#attachedDynoEl) this.#updateDynamometerStandReading();
        }
        this.#announce(`Диск ${mass} г надет на штангу. Масса узла ${tray.getMass()} г.`);
        return true;
      },
    });

    // Когда ученик кликает по диску В ЛОТКЕ и тот уже надет — обработаем как «снять».
    // Если диск НЕ надет, equipment-pick fallback использует addDisc.
    tray.addEventListener('keydown', (ev) => {
      // Клавиатурный fallback обрабатывается внутри tray, здесь только announce.
      const target = ev.target as HTMLElement;
      if (target?.dataset?.['discMass']) {
        // tray handles its own state
      }
    });
  }

  /** Пересинхронизировать массу узла composite-load в store (после disc add/remove). */
  #syncCompositeMassInStore(): void {
    const tray = this.#refs.compositeTray;
    if (!tray) return;
    const composite = tray.getCompositeEl() as LabCompositeWeight | null;
    if (!composite) return;
    const newMass = composite.getMass();
    this.#store.update((s) => ({
      weights: s.weights.map((w) =>
        w.equipmentId === 'composite-load' ? { ...w, mass: newMass } : w,
      ),
    }));
  }

  #makeSpringHookZone(): SnapZone {
    return {
      id: 'spring-hook',
      // Крюк штатива принимает либо пружину (для классической сборки),
      // либо динамометр напрямую (для отдельного взвешивания грузов).
      accepts: ['spring', 'dynamometer'],
      snapRadius: 110,
      getRect: () => this.#refs.dropZoneSpring.getBoundingClientRect(),
      onHover: (active) =>
        this.#refs.dropZoneSpring.classList.toggle('drop-zone--active', active),
      onDrop: ({ element, kind, equipmentId }) => {
        if (kind === 'spring') {
          return this.#attachSpring(element as LabSpringBoard, equipmentId as EquipmentId);
        }
        if (kind === 'dynamometer') {
          return this.#attachDynamometerToStand(
            element as LabDynamometer,
            equipmentId as EquipmentId,
          );
        }
        return false;
      },
    };
  }

  #refreshBottomHookZone(): void {
    this.#drag.removeSnapZone('bottom-hook');
    // Несущий — пружина или динамометр-на-штативе. Иначе нечего «продолжать».
    if (!this.#attachedSpringEl && !this.#attachedDynoEl) return;

    // Что принимаем:
    //  - грузы — всегда (вешаются на любой нижний крюк цепочки)
    //  - динамометр — только если несущий — пружина, динамометр ещё не подвешен,
    //    И грузы ещё не висят (по ФИПИ дин крепится МЕЖДУ пружиной и грузами).
    //    Иначе UI противоречит логике: drop-zone подсвечена, а #attachDynamometerToSpring отказывает.
    const accepts: Array<'spring' | 'dynamometer' | 'weight'> = ['weight'];
    if (
      this.#attachedSpringEl &&
      !this.#attachedDynoEl &&
      this.#attachedWeightEls.length === 0
    ) {
      accepts.push('dynamometer');
    }

    this.#drag.addSnapZone({
      id: 'bottom-hook',
      accepts,
      snapRadius: 120,
      getRect: () => this.#refs.dropZoneBottom.getBoundingClientRect(),
      onHover: (active) => {
        this.#refs.dropZoneBottom.classList.toggle('drop-zone--active', active);
        // Подсветка сцепления: золотое кольцо вокруг нижней петли
        // последнего висящего элемента (куда приземлится новый груз).
        this.#highlightSnapTarget(active);
      },
      onDrop: ({ element, kind, equipmentId }) => {
        if (kind === 'dynamometer' && this.#store.get().dynamometer === null) {
          return this.#attachDynamometerToSpring(
            element as LabDynamometer,
            equipmentId as EquipmentId,
          );
        }
        if (kind === 'weight') {
          return this.#attachWeight(element, equipmentId as EquipmentId);
        }
        return false;
      },
    });
  }

  /** Подсветить нижний крюк последнего подвешенного элемента (целевая точка сцепления). */
  #highlightSnapTarget(active: boolean): void {
    // Перед добавлением — снять с ВСЕХ ранее подсвеченных wrapper'ов.
    // Иначе при последовательном drag'е накапливаются пульсирующие gold-кольца
    // (по одному за каждый положенный груз — onHover(false) от DragController
    // не всегда приходит при resigning drop'а).
    this.#clearAllSnapTargets();
    if (!active) return;
    const target = this.#lastAttachedElement();
    const wrapper = target?.parentElement;
    if (!wrapper?.classList.contains('attached-eq')) return;
    wrapper.classList.add('snap-target');
  }

  /** Сбросить все .snap-target подсветки. Защитный вызов на drag-end. */
  #clearAllSnapTargets(): void {
    const root = this.#refs.standContainer ?? document;
    root.querySelectorAll('.attached-eq.snap-target').forEach((el) => {
      el.classList.remove('snap-target');
    });
  }

  #lastAttachedElement(): HTMLElement | null {
    if (this.#attachedWeightEls.length > 0) {
      return this.#attachedWeightEls[this.#attachedWeightEls.length - 1] ?? null;
    }
    if (this.#attachedDynoEl) return this.#attachedDynoEl;
    return this.#attachedSpringEl;
  }

  // ─── Attachment handlers ────────────────────────────────────

  #attachSpring(element: LabSpringBoard, equipmentId: EquipmentId): boolean {
    if (this.#attachedSpringEl) return false;
    // Штатив занят, если на нём уже висит динамометр (сценарий «дин-на-штативе»).
    // На один крюк штатива можно повесить только один «несущий» элемент.
    if (this.#attachedDynoEl) return false;
    if (equipmentId !== 'spring-k50' && equipmentId !== 'spring-k10') return false;

    const cfg = SPRING_CONFIG[equipmentId === 'spring-k50' ? 'k50' : 'k10'];
    const spring: AttachedSpring = {
      equipmentId,
      springId: equipmentId === 'spring-k50' ? 'k50' : 'k10',
      k: cfg.k,
      restLengthMm: cfg.restLengthMm,
    };

    this.#mountInStack(element);
    element.setAttribute('interactive', '');
    element.setAttribute('extension', '0');
    element.restLengthMm = cfg.restLengthMm;

    if (!element.dataset['scaleBound']) {
      element.dataset['scaleBound'] = 'true';
      element.addEventListener('scale-click', (ev: Event) => {
        const detail = (ev as CustomEvent<{ valueMm: number }>).detail;
        this.#handleScaleClick(detail.valueMm);
      });
    }

    this.#attachedSpringEl = element;
    this.#store.set({
      spring,
      stage: 'spring-attached',
      measurementStep: 'reading-l0',
    });
    this.#updateCardStatus(equipmentId, 'in-use');
    this.#refreshBottomHookZone();
    this.#refreshUi();
    this.#announce(`Пружина №${spring.springId === 'k50' ? '1' : '2'} закреплена на штативе.`);
    return true;
  }

  /** Подцепить динамометр между пружиной и грузами (классическая сборка ОГЭ). */
  #attachDynamometerToSpring(element: LabDynamometer, equipmentId: EquipmentId): boolean {
    if (this.#attachedDynoEl) return false;
    if (!this.#attachedSpringEl) return false;
    if (this.#attachedWeightEls.length > 0) {
      this.#hints.flash('Динамометр крепится между пружиной и грузом, до подвеса грузов.');
      return false;
    }
    if (equipmentId !== 'dyno-1' && equipmentId !== 'dyno-5') return false;
    const cfg = DYNAMOMETER_CONFIG[equipmentId];
    if (!cfg) return false;

    this.#mountDynamometer(element, cfg.range);
    this.#attachedDynoEl = element;
    this.#store.set({
      dynamometer: { equipmentId, range: cfg.range, attachedTo: 'spring' },
    });
    this.#updateCardStatus(equipmentId, 'in-use');
    this.#refreshBottomHookZone();
    this.#refreshUi();
    this.#announce(`Динамометр ${cfg.range} Н подвешен на пружину.`);
    return true;
  }

  /** Подцепить динамометр прямо на штатив (отдельный сценарий: взвешивание грузов). */
  #attachDynamometerToStand(element: LabDynamometer, equipmentId: EquipmentId): boolean {
    if (this.#attachedSpringEl || this.#attachedDynoEl) return false;
    if (equipmentId !== 'dyno-1' && equipmentId !== 'dyno-5') return false;
    const cfg = DYNAMOMETER_CONFIG[equipmentId];
    if (!cfg) return false;

    this.#mountDynamometer(element, cfg.range);
    this.#attachedDynoEl = element;
    this.#store.set({
      dynamometer: { equipmentId, range: cfg.range, attachedTo: 'stand' },
      stage: 'spring-attached', // используем существующую стадию: «несущий установлен»
      measurementStep: 'idle',
    });
    this.#updateCardStatus(equipmentId, 'in-use');
    this.#refreshBottomHookZone();
    this.#refreshUi();
    this.#announce(
      `Динамометр ${cfg.range} Н подвешен на штатив. Подвесьте груз для измерения силы тяжести.`,
    );
    return true;
  }

  /** Общая часть монтажа динамометра в стек: размер, атрибуты, обработчик клика по шкале. */
  #mountDynamometer(element: LabDynamometer, range: 1 | 5): void {
    this.#mountInStack(element);
    element.setAttribute('range', String(range));
    element.setAttribute('force', '0');
    element.setAttribute('interactive', '');
    if (!element.dataset['scaleBound']) {
      element.dataset['scaleBound'] = 'true';
      element.addEventListener('scale-click', (ev: Event) => {
        const detail = (ev as CustomEvent<{ valueN: number }>).detail;
        this.#handleDynoScaleClick(detail.valueN);
      });
    }
  }

  #attachWeight(element: HTMLElement, equipmentId: EquipmentId): boolean {
    const cfg = WEIGHT_CONFIG[equipmentId];
    if (!cfg) return false;
    const dynState = this.#store.get().dynamometer;
    const dynoOnStand = dynState?.attachedTo === 'stand';
    if (!this.#attachedSpringEl && !dynoOnStand) {
      this.#hints.flash('Сначала подвесьте пружину или динамометр на штатив.');
      return false;
    }

    // Для composite-load масса вычисляется динамически по надетым дискам.
    let resolvedMass = cfg.mass;
    if (equipmentId === 'composite-load') {
      const composite = element as unknown as { getMass?: () => number };
      if (typeof composite.getMass === 'function') resolvedMass = composite.getMass();
      // Пометить узел как «на установке» в tray (статус-индикатор).
      this.#refs.compositeTray?.setStatus('in-use');
    }

    this.#mountInStack(element);

    const weight: AttachedWeight = {
      equipmentId,
      mass: resolvedMass,
      chainIndex: this.#attachedWeightEls.length,
    };
    this.#attachedWeightEls.push(element);
    this.#store.update((s) => ({
      weights: [...s.weights, weight],
      measurementStep:
        s.spring && s.scaleClickL0 !== null ? 'reading-l1' : s.measurementStep,
    }));
    this.#updateCardStatus(equipmentId, 'in-use');
    this.#refreshBottomHookZone();

    // Если несущий — пружина, запускаем колебания.
    // Если динамометр на штативе — мгновенно обновляем его показание (реальный
    // пружинный динамометр стабилизируется за доли секунды, ученику важно увидеть силу).
    if (this.#attachedSpringEl) {
      this.#startOscillation();
      this.#announce(`Подвешен груз ${cfg.mass} грамм. Дождитесь конца колебаний.`);
    } else {
      this.#updateDynamometerStandReading();
      const F = massToForce(totalMass(this.#store.get().weights));
      this.#announce(
        `Подвешен груз ${cfg.mass} грамм. Динамометр показывает ${F.toFixed(2)} Н.`,
      );
    }
    this.#refreshUi();
    return true;
  }

  /** Обновить показание динамометра-на-штативе по текущей подвешенной массе (без колебаний). */
  #updateDynamometerStandReading(): void {
    if (!this.#attachedDynoEl) return;
    const m = totalMass(this.#store.get().weights);
    const F = massToForce(m);
    this.#attachedDynoEl.setAttribute('force', F.toFixed(2));
    this.#updateChainPositions();
    this.#updateDropZonePositions();
  }

  #mountInStack(element: HTMLElement): void {
    // Сбрасываем drag-стили на host элементе
    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.zIndex = '';
    element.style.transform = '';
    element.style.marginTop = '';

    // Маркер «уже на установке» — DragController увидит и не начнёт drag,
    // тогда click на scale-area внутри shadow-root доходит до handler-а.
    element.setAttribute('attached', '');

    // Оборачиваем в wrapper (X-кнопка как sibling, не Light DOM child)
    const wrapper = document.createElement('div');
    wrapper.className = 'attached-eq';
    wrapper.dataset['equipmentId'] = element.dataset['equipmentId'] ?? '';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '50%';
    wrapper.style.top = '0px';
    wrapper.style.transform = 'translateX(-50%)';

    wrapper.appendChild(element);

    const btn = document.createElement('button');
    btn.className = 'detach-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Снять с установки');
    btn.title = 'Снять с установки';
    btn.textContent = '×';
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.#detachElement(element);
    });
    wrapper.appendChild(btn);

    this.#hungStack.appendChild(wrapper);
    requestAnimationFrame(() => this.#updateChainPositions());
  }

  #returnElementToCard(equipmentId: EquipmentId, element: HTMLElement): void {
    // Composite-load — особый случай: возвращается в lab-composite-tray, не в обычную карточку.
    if (equipmentId === 'composite-load') {
      const tray = this.#refs.compositeTray;
      if (!tray) return;
      const wrapper = element.parentElement?.classList.contains('attached-eq')
        ? element.parentElement
        : null;
      element.style.position = '';
      element.style.left = '';
      element.style.top = '';
      element.style.zIndex = '';
      element.style.transform = '';
      element.style.marginTop = '';
      element.removeAttribute('interactive');
      element.removeAttribute('attached');
      element.removeAttribute('data-slot-target');
      const rodArea = tray.querySelector('.ct-rod-area');
      if (rodArea) rodArea.appendChild(element);
      wrapper?.remove();
      tray.setStatus('available');
      return;
    }

    const card = this.#cardByEquipmentId.get(equipmentId);
    if (!card) return;
    // Если элемент в wrapper'е (на сцене) — извлекаем
    const wrapper = element.parentElement?.classList.contains('attached-eq')
      ? element.parentElement
      : null;
    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.zIndex = '';
    element.style.transform = '';
    element.style.marginTop = '';
    element.removeAttribute('interactive');
    element.removeAttribute('attached');
    element.setAttribute('extension', '0');
    element.setAttribute('force', '0');
    if ('setReadingMark' in element) {
      (element as LabSpringBoard).setReadingMark(null);
    }
    card.appendChild(element);
    wrapper?.remove();
    this.#updateCardStatus(equipmentId, 'available');
  }

  /**
   * Снять конкретный элемент с установки и вернуть его в карточку.
   * Если это пружина — снимается вся цепочка под ней.
   * Если динамометр или груз посередине — снимается всё что висит ниже.
   */
  #detachElement(element: HTMLElement): void {
    const equipmentId = element.dataset['equipmentId'] as EquipmentId | undefined;
    if (!equipmentId) return;

    if (element === this.#attachedSpringEl) {
      // Снимаем пружину → снимаем всё
      this.reset();
      return;
    }

    if (element === this.#attachedDynoEl) {
      // Если динамометр был на штативе сам (без пружины) — снимая его, нечего держать
      // грузы → полный сброс (как с пружиной).
      if (!this.#attachedSpringEl) {
        this.reset();
        return;
      }
      // Иначе — классическая сборка: снимаем динамометр и грузы под ним, пружина остаётся.
      const dynoId = this.#store.get().dynamometer?.equipmentId;
      for (const w of [...this.#attachedWeightEls].reverse()) {
        const id = w.dataset['equipmentId'] as EquipmentId | undefined;
        if (id) this.#returnElementToCard(id, w);
      }
      if (dynoId) this.#returnElementToCard(dynoId, this.#attachedDynoEl);
      this.#attachedDynoEl = null;
      this.#attachedWeightEls = [];
      this.#store.set({ dynamometer: null, weights: [], scaleClickF: null });
      this.#stopOscillation();
      this.#refreshBottomHookZone();
      this.#refreshUi();
      return;
    }

    // Это груз — снимаем его и все грузы НИЖЕ него по цепочке.
    const idx = this.#attachedWeightEls.indexOf(element);
    if (idx === -1) return;
    const removed = this.#attachedWeightEls.slice(idx);
    for (const w of removed.reverse()) {
      const id = w.dataset['equipmentId'] as EquipmentId | undefined;
      if (id) this.#returnElementToCard(id, w);
    }
    this.#attachedWeightEls = this.#attachedWeightEls.slice(0, idx);
    this.#store.update((s) => ({ weights: s.weights.slice(0, idx) }));
    this.#refreshBottomHookZone();
    // Несущий — пружина: пересчёт колебаний. Динамометр на штативе: мгновенный пересчёт силы.
    if (this.#attachedSpringEl) {
      this.#startOscillation();
    } else {
      this.#updateDynamometerStandReading();
    }
    this.#refreshUi();
    this.#announce('Груз снят с установки.');
  }

  /**
   * Пересчитать абсолютные позиции всех подвешенных wrapper'ов в стеке.
   * Каждый последующий элемент позиционируется так, чтобы его верхний крюк
   * совпал с нижней петлёй предыдущего.
   *
   * После расчёта вызывает #adaptStandToChain() — штатив физически удлиняет
   * стержень, если цепочка вышла за его базовую высоту.
   */
  #updateChainPositions(): void {
    const chain: HTMLElement[] = [];
    if (this.#attachedSpringEl) chain.push(this.#attachedSpringEl);
    if (this.#attachedDynoEl) chain.push(this.#attachedDynoEl);
    chain.push(...this.#attachedWeightEls);

    let cursorY = 0;
    for (let i = 0; i < chain.length; i++) {
      const el = chain[i]!;
      const wrapper = el.parentElement;
      if (!wrapper?.classList.contains('attached-eq')) continue;

      const elAny = el as unknown as { getTopHookY?: () => number; getWeightHookY?: () => number };
      const topY = typeof elAny.getTopHookY === 'function' ? elAny.getTopHookY() : 0;
      const bottomY =
        typeof elAny.getWeightHookY === 'function'
          ? elAny.getWeightHookY()
          : el.getBoundingClientRect().height;

      const elTop = cursorY - topY;
      wrapper.style.top = `${elTop}px`;
      cursorY = elTop + bottomY;
    }

    this.#adaptStandToChain(cursorY);
  }

  /**
   * Адаптация штатива под длину цепочки.
   *
   * Базовый штатив имеет фиксированную высоту (480 SVG-юнитов). Если подвешенная
   * цепочка (пружина + дин + грузы) вылезает за основание штатива, удлиняем
   * стержень через атрибут rod-extra. Это:
   *   1. Выглядит как реальный лабораторный штатив с длинным запасом стержня.
   *   2. Не уменьшает шкалы приборов (они фиксированы в pixel-размере).
   *   3. Контейнер скроллится, ученик может прокрутить и увидеть низ цепочки.
   *
   * Базовая высота 480 SVG = 75% «зона висения» (от верха к основанию).
   * При большом перерастяжении пружины k10 (например, 200г → ~196 мм) штатив
   * вырастает на нужное число SVG-юнитов.
   *
   * @param chainBottomLocalPx — Y нижней петли последнего элемента в координатах
   *                              #springMount (т.е. от точки крюка штатива вниз).
   */
  #adaptStandToChain(chainBottomLocalPx: number): void {
    const stand = this.#refs.stand;
    if (!stand) return;

    const standRect = stand.getBoundingClientRect();
    if (standRect.height === 0) return; // компонент ещё не отрисован

    // Базовая высота штатива (без удлинения) в SVG-юнитах
    const BASE_SVG_HEIGHT = 480;
    // Y «крюка» в SVG-координатах (там, где висит цепочка)
    const HOOK_SVG_Y = 64 + 8; // = 72
    // Текущая шкала px/SVG-юнит
    const currentExtra = stand.rodExtra;
    const pxPerSvgY = standRect.height / (BASE_SVG_HEIGHT + currentExtra);
    if (pxPerSvgY <= 0) return;

    // Низ цепочки в SVG-координатах: hook_y + chain_bottom_local_px / pxPerSvgY
    const chainBottomSvgY = HOOK_SVG_Y + chainBottomLocalPx / pxPerSvgY;
    // Должно помещаться в зоне «над основанием»: y < ROD_BOTTOM_DEFAULT(=430) + extra
    // Берём небольшой буфер 30 SVG-юнитов, чтобы цепочка не упиралась в основание
    const REQUIRED_BOTTOM = chainBottomSvgY + 30;
    const ROD_BOTTOM_DEFAULT = 430;
    const desiredExtra = Math.max(0, Math.ceil(REQUIRED_BOTTOM - ROD_BOTTOM_DEFAULT));

    // Гистерезис: меняем только если разница ≥ 8 SVG-юнитов, чтобы не дёргать
    // на каждом тике колебаний.
    if (Math.abs(desiredExtra - currentExtra) < 8) return;

    stand.rodExtra = desiredExtra;
    // После изменения rod-extra перерисовался SVG → mount-позиция могла сместиться,
    // надо пересчитать. Делаем это на след. кадре, чтобы layout успел.
    // Авто-скролл НЕ делаем — приоритет за видимостью указателя пружины (вверх стека).
    // Если ученик хочет посмотреть низ цепочки, скроллит сам колесом мыши.
    requestAnimationFrame(() => {
      this.#updateMountPosition();
      this.#updateDropZonePositions();
    });
  }

  #updateCardStatus(equipmentId: EquipmentId, status: 'available' | 'in-use'): void {
    this.#cardByEquipmentId.get(equipmentId)?.setAttribute('status', status);
  }

  // ─── Анимация колебаний ────────────────────────────────────

  /**
   * Запускает анимацию колебаний пружины к новому равновесию.
   * Вызывается:
   *   - при подвесе груза (растяжение от L0 к L0+Δl)
   *   - при снятии груза (сжатие назад к L0+Δl_new, или к L0 если последний)
   *   - при подвесе/снятии динамометра между пружиной и грузами
   *
   * Раньше был баг: `if (weights.length === 0) return;` — пружина оставалась
   * растянутой после снятия последнего груза. Теперь анимирует возврат к 0.
   */
  #startOscillation(): void {
    const state = this.#store.get();
    if (!state.spring) return;

    if (this.#oscillationRafId !== null) cancelAnimationFrame(this.#oscillationRafId);

    const targetMm = this.#equilibriumExtensionMm();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Если пружина уже на этой длине — нечего анимировать.
    const startMm = state.displayedExtensionMm;
    if (Math.abs(startMm - targetMm) < 0.01) {
      this.#store.set({ displayedExtensionMm: targetMm, oscillationStartTime: null });
      this.#applyDisplayedExtension();
      return;
    }

    if (reduceMotion) {
      this.#store.set({ displayedExtensionMm: targetMm, oscillationStartTime: null });
      this.#applyDisplayedExtension();
      return;
    }

    const damping = 1.6;
    const duration = oscillationDuration(damping);
    const startTime = performance.now();
    this.#store.set({ oscillationStartTime: startTime });

    // Эффективная масса для частоты колебаний:
    //   - если есть грузы → масса грузов (стандартная физика).
    //   - если грузов нет → используем «эталонную» массу для частоты (100 г),
    //     иначе ω = √(k/0) → ∞ и формула колебаний даст NaN.
    //     Физически: пустая пружина возвращается в покой почти мгновенно,
    //     поэтому короткая анимация со «средней» частотой выглядит естественно.
    const massForFreqKg = state.weights.length > 0
      ? totalMass(state.weights) / 1000
      : 0.1;

    const tick = (now: number): void => {
      const elapsed = (now - startTime) / 1000;
      if (elapsed > duration) {
        this.#store.set({ displayedExtensionMm: targetMm, oscillationStartTime: null });
        this.#applyDisplayedExtension();
        this.#oscillationRafId = null;
        return;
      }
      const k = state.spring!.k;
      const amplitude = startMm - targetMm;
      const offset = dampedOscillation(amplitude, k, massForFreqKg, elapsed, damping);
      this.#store.set({ displayedExtensionMm: Math.max(0, targetMm + offset) });
      this.#applyDisplayedExtension();
      this.#oscillationRafId = requestAnimationFrame(tick);
    };
    this.#oscillationRafId = requestAnimationFrame(tick);
  }

  #stopOscillation(): void {
    if (this.#oscillationRafId !== null) {
      cancelAnimationFrame(this.#oscillationRafId);
      this.#oscillationRafId = null;
    }
    this.#store.set({ oscillationStartTime: null, displayedExtensionMm: 0 });
    this.#applyDisplayedExtension();
  }

  #equilibriumExtensionMm(): number {
    const s = this.#store.get();
    if (!s.spring) return 0;
    const m = totalMass(s.weights);
    if (m === 0) return 0;
    const F = massToForce(m);
    return forceToExtension(F, s.spring.k) * 10;
  }

  #applyDisplayedExtension(): void {
    const s = this.#store.get();
    const mm = Math.round(s.displayedExtensionMm * 10) / 10;
    if (this.#attachedSpringEl) {
      this.#attachedSpringEl.setAttribute('extension', String(mm));
    }
    if (this.#attachedDynoEl && s.spring) {
      const F = massToForce(totalMass(s.weights));
      this.#attachedDynoEl.setAttribute('force', F.toFixed(2));
    }
    // Пересчёт цепочки: пружина растянулась → петля сместилась → грузы тоже
    this.#updateChainPositions();
    // Нижняя drop-зона (если видна) тоже двигается за петлёй
    this.#updateDropZonePositions();
    // Баннер «указатель за шкалой» — по равновесному (целевому) растяжению,
    // а не по displayedExtensionMm, иначе он бы мерцал при колебаниях вокруг 100 мм.
    this.#refreshOverloadBanner();
  }

  /**
   * Показывает мягкий баннер «указатель за шкалой» при перерастяжении пружины.
   * Подсказывает ученику взять более лёгкий комплект груза (актуально для k10).
   *
   * Триггер: пружина растянулась так, что указатель (rest + extension) вышел за
   * нижний край шкалы (100 мм). Для пружин с rest=30 мм это значит ext > 70 мм:
   *   k50: > 357 г → за шкалой (390 г слегка задевает)
   *   k10: > 71 г → за шкалой (80 г уже за шкалой, потому что рест=30 + ext≈80 = 110 мм)
   */
  #refreshOverloadBanner(): void {
    const banner = this.#refs.overloadBanner;
    if (!banner) return;
    const s = this.#store.get();
    if (!s.spring) {
      banner.hidden = true;
      return;
    }
    const SCALE_MAX_MM = 100;
    const restMm = s.spring.restLengthMm;
    const equilibriumExt = this.#equilibriumExtensionMm();
    const pointerPosMm = restMm + equilibriumExt;
    if (pointerPosMm <= SCALE_MAX_MM) {
      banner.hidden = true;
      return;
    }
    const isK10 = s.spring.k < 30;
    const text = banner.querySelector('.overload-banner-text');
    if (text) {
      text.textContent = isK10
        ? `Указатель ушёл за шкалу (положение ≈ ${Math.round(pointerPosMm)} мм при шкале 0–100). Для пружины №2 используйте наборный груз 60–80 г.`
        : `Указатель ушёл за шкалу (положение ≈ ${Math.round(pointerPosMm)} мм при шкале 0–100). Снимите часть груза, чтобы измерение поместилось в шкалу.`;
    }
    banner.hidden = false;
  }

  // ─── Измерения и журнал ────────────────────────────────────

  #handleScaleClick(valueMm: number): void {
    const s = this.#store.get();
    if (!s.spring) return;

    if (s.weights.length === 0) {
      this.#store.set({ scaleClickL0: valueMm, measurementStep: 'l0-recorded' });
      this.#attachedSpringEl?.setReadingMark(valueMm, 'l₀');
      this.#announce(`Записано начальное положение l₀ = ${valueMm} мм. Подвесьте груз.`);
    } else {
      if (s.scaleClickL0 === null) {
        this.#hints.flash('Сначала запишите положение пружины без нагрузки.');
        return;
      }
      this.#store.set({ scaleClickL1: valueMm, measurementStep: 'ready-to-record' });
      this.#attachedSpringEl?.setReadingMark(valueMm, 'l₁');
      this.#announce(
        `Записано положение под нагрузкой l₁ = ${valueMm} мм. Нажмите «Записать в журнал».`,
      );
    }
    this.#refreshUi();
  }

  #handleDynoScaleClick(valueN: number): void {
    const s = this.#store.get();
    if (!s.dynamometer) return;
    this.#store.set({ scaleClickF: valueN });
    this.#attachedDynoEl?.setReadingMark(valueN);
    const fmt = s.dynamometer.range === 1 ? valueN.toFixed(2) : valueN.toFixed(1);
    this.#announce(`Записана сила по динамометру: F = ${fmt} Н.`);
  }

  /**
   * Записывает измерение. Принимает значения от формы ручного ввода (опционально).
   * Если значения не заданы — берёт из state (старое поведение для совместимости с тестами).
   */
  #recordMeasurement(opts?: { l0Mm?: number; l1Mm?: number }): void {
    const s = this.#store.get();
    if (s.spring === null || s.weights.length === 0) return;

    const l0 = opts?.l0Mm ?? s.scaleClickL0;
    const l1 = opts?.l1Mm ?? s.scaleClickL1;
    if (l0 === null || l1 === null) return;

    const dlMm = l1 - l0;
    if (dlMm <= 0) {
      this.#hints.flash('Δl должно быть положительным. Перепроверьте l₁.');
      return;
    }

    const m = totalMass(s.weights);
    const measurement = s.scaleClickF !== null
      ? createMeasurement(m, dlMm / 10, s.scaleClickF)
      : createMeasurement(m, dlMm / 10);
    if (!measurement) return;

    this.#store.update((st) => ({
      measurements: [...st.measurements, measurement],
      scaleClickL1: null,
      scaleClickF: null,
      measurementStep: 'l0-recorded',
    }));
    // §21.10 — обновляем сигнатуру для дедупликации pending-плашки.
    this.#lastRecordedSignature = `${m}|${l0}|${l1}`;
    this.#attachedSpringEl?.setReadingMark(l0, 'l₀');
    this.#attachedDynoEl?.setReadingMark(null);
    this.#announce(
      `Измерение записано: F = ${measurement.force.toFixed(2)} Н, Δl = ${dlMm} мм, k = ${measurement.k.toFixed(0)} Н/м.`,
    );
    this.#refreshUi();
  }

  /** Открывает форму ручного ввода с префиллом значений из state. */
  #openRecordForm(): void {
    const s = this.#store.get();
    if (s.measurementStep !== 'ready-to-record') return;
    // Префилл из кликов по шкале и масс грузов (всё что ученик уже видит на сцене)
    if (s.scaleClickL0 !== null) this.#refs.rfL0.value = String(s.scaleClickL0);
    if (s.scaleClickL1 !== null) this.#refs.rfL1.value = String(s.scaleClickL1);
    this.#refs.rfMass.value = String(totalMass(s.weights));
    this.#refs.recordForm.hidden = false;
    this.#refs.rfL1.focus();
  }

  #closeRecordForm(): void {
    this.#refs.recordForm.hidden = true;
  }

  #submitRecordForm(): void {
    const l0 = parseFloat(this.#refs.rfL0.value);
    const l1 = parseFloat(this.#refs.rfL1.value);
    if (!Number.isFinite(l0) || l0 < 0 || l0 > 100) {
      this.#hints.flash('Введите l₀ — положительное число от 0 до 100 мм.');
      this.#refs.rfL0.focus();
      return;
    }
    if (!Number.isFinite(l1) || l1 <= l0 || l1 > 100) {
      this.#hints.flash('l₁ должно быть больше l₀ и не больше 100 мм.');
      this.#refs.rfL1.focus();
      return;
    }
    this.#recordMeasurement({ l0Mm: l0, l1Mm: l1 });
    this.#closeRecordForm();
  }

  // ─── UI rendering ──────────────────────────────────────────

  #refreshUi(): void {
    const s = this.#store.get();
    this.#refreshDropZoneVisibility();
    this.#refreshRecordButton();
    this.#refreshMeasurementPanel();
    this.#refreshStepper();
    this.#refreshAttention();
    this.#renderJournal();
    this.#renderResult();
    this.#renderGraph();
    this.#hints.update(s);
    this.#updateMountPosition();
  }

  /**
   * Какой шаг сейчас активный — для stepper.
   *  1 — закрепить пружину (нет пружины)
   *  2 — записать l₀ (пружина есть, нет l₀)
   *  3 — подвесить груз (l₀ записан, нет груза)
   *  4 — записать l₁ (груз есть, нет l₁)
   *  5 — нажать «В журнал» (оба значения сняты)
   * Возвращает 0..5; 0 — все шаги завершены (после записи в журнал).
   */
  #activeStep(): number {
    const s = this.#store.get();
    if (s.spring === null) return 1;
    if (s.scaleClickL0 === null) return 2;
    if (s.weights.length === 0) return 3;
    if (s.scaleClickL1 === null) return 4;
    if (s.measurementStep === 'ready-to-record') return 5;
    return 0;
  }

  #refreshStepper(): void {
    const active = this.#activeStep();
    const steps = this.#refs.steps.querySelectorAll<HTMLElement>('.step');
    steps.forEach((el) => {
      const num = Number(el.dataset['step']);
      if (active === 0 || num < active) el.dataset['state'] = 'done';
      else if (num === active) el.dataset['state'] = 'active';
      else el.removeAttribute('data-state');
    });
  }

  /** Подсветка-«внимание» на планшете пружины и pulse кнопки записи —
   *  когда нужно действие ученика. Сразу понятно, куда смотреть. */
  #refreshAttention(): void {
    const s = this.#store.get();
    const needSpringClick =
      this.#attachedSpringEl !== null &&
      (s.measurementStep === 'reading-l0' || s.measurementStep === 'reading-l1');
    if (this.#attachedSpringEl) {
      if (needSpringClick) {
        this.#attachedSpringEl.dataset['attention'] = 'true';
      } else {
        delete this.#attachedSpringEl.dataset['attention'];
      }
    }

    if (s.measurementStep === 'ready-to-record') {
      this.#refs.recordBtn.classList.add('ready-pulse');
    } else {
      this.#refs.recordBtn.classList.remove('ready-pulse');
    }
  }

  /** Обновить состояние floating-панели измерений: state, счётчик, auto-раскрытие. */
  #refreshMeasurementPanel(): void {
    const s = this.#store.get();
    const count = s.measurements.length;
    const hasData = count > 0;
    const prevState = this.#refs.measurementPanel.getAttribute('data-state');
    const becameNonEmpty = hasData && prevState !== 'has-data';

    this.#refs.measurementPanel.setAttribute('data-state', hasData ? 'has-data' : 'empty');

    // Формула: показываем когда есть журнал
    const formulaEl = document.getElementById('formula-display');
    if (formulaEl) formulaEl.hidden = !hasData;

    if (hasData) {
      this.#refs.measurementCount.removeAttribute('hidden');
      this.#refs.measurementCount.textContent = String(count);
    } else {
      this.#refs.measurementCount.setAttribute('hidden', '');
      // Чистим textContent при сбросе — иначе после reset он сохранит старое число,
      // что ложно «прочтётся» при автотестах и a11y-снимках.
      this.#refs.measurementCount.textContent = '';
    }

    // PhET-паттерн «attention flash»: при первом измерении принудительно разворачиваем
    // панель, даже если ученик ранее её свернул. И прокручиваем тело наверх, чтобы
    // первая запись в таблице была видна сразу.
    if (becameNonEmpty) {
      this.#refs.measurementPanel.setAttribute('aria-collapsed', 'false');
      this.#refs.measurementToggle.setAttribute('aria-expanded', 'true');
      const body = this.#refs.measurementPanel.querySelector('.measurement-body');
      if (body) body.scrollTop = 0;
    }
  }

  #refreshDropZoneVisibility(): void {
    const s = this.#store.get();
    const draggingId = s.dragging;
    const draggingKind = draggingId !== null ? this.#kindForEquipment(draggingId) : null;

    // Зона у крюка штатива: показываем когда штатив свободен и тащат пружину или динамометр
    // (оба они могут быть «несущим» элементом на штативе).
    const standFree = this.#attachedSpringEl === null && this.#attachedDynoEl === null;
    const showSpringDrop =
      standFree && (draggingKind === 'spring' || draggingKind === 'dynamometer');
    if (showSpringDrop) this.#refs.dropZoneSpring.removeAttribute('hidden');
    else {
      this.#refs.dropZoneSpring.setAttribute('hidden', '');
      this.#refs.dropZoneSpring.classList.remove('drop-zone--active');
    }

    // Нижняя зона: показываем когда несущий уже на штативе.
    // Грузы — всегда. Динамометр — только если несущий пружина, дин ещё не подвешен,
    // И грузы ещё не висят (классический сценарий «пружина → дин → груз», по ФИПИ).
    // Условие синхронизировано с #refreshBottomHookZone.accepts.
    const carrierAttached =
      this.#attachedSpringEl !== null || this.#attachedDynoEl !== null;
    const dynoCanGoToBottom =
      this.#attachedSpringEl !== null &&
      this.#attachedDynoEl === null &&
      this.#attachedWeightEls.length === 0;
    const showBottomDrop =
      carrierAttached &&
      (draggingKind === 'weight' ||
        (draggingKind === 'dynamometer' && dynoCanGoToBottom));
    if (showBottomDrop) this.#refs.dropZoneBottom.removeAttribute('hidden');
    else {
      this.#refs.dropZoneBottom.setAttribute('hidden', '');
      this.#refs.dropZoneBottom.classList.remove('drop-zone--active');
    }

    this.#updateDropZonePositions();
  }

  /** Позиционирует обе drop-зоны: верхнюю — на крюке штатива, нижнюю — на петле последнего элемента цепочки. */
  #updateDropZonePositions(): void {
    if (!this.#refs.stand || !this.#refs.standContainer) return;
    const containerRect = this.#refs.standContainer.getBoundingClientRect();

    // Верхняя зона — крюк штатива (slot 1, средний)
    if (!this.#refs.dropZoneSpring.hasAttribute('hidden')) {
      const standRect = this.#refs.stand.getBoundingClientRect();
      const hookPos = this.#refs.stand.getHookPosition(1);
      const x = standRect.left - containerRect.left + hookPos.x;
      const y = standRect.top - containerRect.top + hookPos.y;
      const w = this.#refs.dropZoneSpring.offsetWidth || 130;
      this.#refs.dropZoneSpring.style.left = `${x - w / 2}px`;
      this.#refs.dropZoneSpring.style.top = `${y + 10}px`;
    }

    // Нижняя зона — визуально ПОД последним подвешенным элементом
    // (snap-зона использует bounding rect drop-zone, поэтому где её разместим — туда и снап).
    if (!this.#refs.dropZoneBottom.hasAttribute('hidden')) {
      const lastEl = this.#lastAttachedElement();
      if (lastEl) {
        const elRect = lastEl.getBoundingClientRect();
        const cx = elRect.left + elRect.width / 2;
        // Позиционируем drop-zone ниже элемента с небольшим перекрытием,
        // чтобы был визуальный «магнит» сразу под крюком.
        const cy = elRect.bottom - 12;
        const w = this.#refs.dropZoneBottom.offsetWidth || 130;
        this.#refs.dropZoneBottom.style.left = `${cx - containerRect.left - w / 2}px`;
        this.#refs.dropZoneBottom.style.top = `${cy - containerRect.top}px`;
      }
    }
  }

  #refreshRecordButton(): void {
    const s = this.#store.get();
    this.#refs.recordBtn.disabled = s.measurementStep !== 'ready-to-record';
    if (s.spring === null) this.#refs.recordBtn.setAttribute('hidden', '');
    else this.#refs.recordBtn.removeAttribute('hidden');
  }

  /** §20.4 — текущий режим записи (читается с localStorage + URL). */
  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  /** §20.4 — обработчик смены режима через toggle. */
  #handleRecordModeChange(): void {
    // В fully-auto: если уже ready — автоматически записать сразу при переключении.
    if (this.#recordMode() === 'fully-auto'
        && this.#store.get().measurementStep === 'ready-to-record') {
      this.#recordMeasurement();
    }
    this.#refreshUi();
  }

  /**
   * §21 — рендер журнала через shared `renderJournalTable` со SPRING_SPEC.
   * direct (m, l₀, l₁) пишется программой; ученик в semi-auto/fully-manual
   * вводит derived (ΔL, F, k) в input + ✓ проверка.
   * Старая v1-таблица (#journal-table) остаётся скрытой как fallback.
   */
  #renderJournal(): void {
    const s = this.#store.get();
    const mode = this.#recordMode();

    // §21 UX-v2: в fully-manual журнал РАСКРЫТ с пустой строкой даже без записанных
    // измерений — ученик пишет ВСЁ руками. sentinel-timestamp = -1.
    const showEmptyManual =
      mode === 'fully-manual' && s.measurements.length === 0 && s.spring !== null;
    const hasData = s.measurements.length > 0 || showEmptyManual;

    if (hasData) this.#refs.journalEmpty.setAttribute('hidden', '');
    else this.#refs.journalEmpty.removeAttribute('hidden');

    // Custom renderer (для дочерних экранов вроде spring-work, использующих свою схему).
    // Они пишут в legacy v1 journal-table — показываем её если есть данные.
    if (this.#renderers.journal) {
      if (hasData) this.#refs.journalTable.removeAttribute('hidden');
      else this.#refs.journalTable.setAttribute('hidden', '');
      this.#renderers.journal(s, {
        journalEmpty: this.#refs.journalEmpty,
        journalTable: this.#refs.journalTable,
        journalBody: this.#refs.journalBody,
      });
      return;
    }

    // v1 fallback таблица — всегда скрыта когда есть journal-host (v2).
    this.#refs.journalTable.setAttribute('hidden', '');
    if (!this.#refs.journalHost) {
      // Если в шаблоне нет journal-host — используем старый v1 рендер.
      this.#renderJournalLegacy();
      return;
    }

    if (hasData) this.#refs.journalHost.removeAttribute('hidden');
    else this.#refs.journalHost.setAttribute('hidden', '');

    // Выбираем SPEC (дефолт — SPRING_SPEC; дочерние экраны могут передать свой).
    const activeSpec = this.#renderers.journalSpec ?? SPRING_SPEC;

    const l0 = s.scaleClickL0;
    // Если дочерний экран передал buildRows — используем его, иначе — дефолтный.
    const rows: JournalRow[] = this.#renderers.buildRows
      ? this.#renderers.buildRows(s, this.#journalDrafts, mode)
      : s.measurements.map((m, i) => {
      const dlMm = Math.round(m.extension * 10);
      const lAtLoad = l0 !== null ? l0 + dlMm : 0;
      const draft = this.#journalDrafts.get(m.timestamp) ?? {};
      return {
        idx: i + 1,
        timestamp: m.timestamp,
        values: {
          idx: i + 1,
          m_g: m.totalMass,
          l0_mm: l0 ?? 0,
          l1_mm: lAtLoad,
          dL_mm: mode === 'fully-auto' ? dlMm : (draft['dL_mm'] ?? null),
          F_N: mode === 'fully-auto' ? m.force : (draft['F_N'] ?? null),
          k_N_m: mode === 'fully-auto' ? m.k : (draft['k_N_m'] ?? null),
        },
        verdicts: this.#journalVerdicts.get(m.timestamp) ?? {},
      };
    });

    // Для дефолтного построителя (2.1): добавить sentinel-строку в fully-manual.
    // Для кастомного buildRows — пропускаем, т.к. buildRows сам управляет строками.
    if (showEmptyManual && !this.#renderers.buildRows) {
      const draft = this.#journalDrafts.get(-1) ?? {};
      rows.push({
        idx: 1,
        timestamp: -1,
        values: {
          idx: 1,
          m_g: draft['m_g'] ?? null,
          l0_mm: draft['l0_mm'] ?? null,
          l1_mm: draft['l1_mm'] ?? null,
          dL_mm: draft['dL_mm'] ?? null,
          F_N: draft['F_N'] ?? null,
          k_N_m: draft['k_N_m'] ?? null,
        },
        verdicts: {},
      });
    }

    renderJournalTable(this.#refs.journalHost, activeSpec, rows, {
      mode,
      onCellInput: (rowIdx, key, value) => {
        const m = s.measurements[rowIdx - 1];
        const ts = m ? m.timestamp : -1;
        const draft = this.#journalDrafts.get(ts) ?? {};
        if (value === null) delete draft[key];
        else draft[key] = value;
        this.#journalDrafts.set(ts, draft);
      },
      onVerify: (rowIdx) => {
        const m = s.measurements[rowIdx - 1];
        if (!m) return;
        const ts = m.timestamp;
        const draft = { ...(this.#journalDrafts.get(ts) ?? {}) };
        const tr = this.#refs.journalHost?.querySelector<HTMLTableRowElement>(
          `tr[data-row-idx="${rowIdx}"]`,
        );
        if (tr) {
          tr.querySelectorAll<HTMLInputElement>('input[data-key]').forEach((input) => {
            const key = input.dataset['key'];
            if (!key) return;
            const parsed = parseRu(input.value);
            if (parsed !== null) draft[key] = parsed;
          });
        }
        this.#journalDrafts.set(ts, draft);
        // Дефолтный verifyRow: строить tempRow под SPRING_SPEC.
        // Кастомный buildRows должен сам вложить verdicts в строки.
        const dlMm = Math.round(m.extension * 10);
        const lAtLoad = l0 !== null ? l0 + dlMm : 0;
        const tempRow: JournalRow = {
          idx: rowIdx,
          timestamp: ts,
          values: this.#renderers.buildRows
            ? { ...(this.#renderers.buildRows(s, this.#journalDrafts, mode).find(r => r.idx === rowIdx)?.values ?? {}) }
            : {
                m_g: m.totalMass,
                l0_mm: l0 ?? 0,
                l1_mm: lAtLoad,
                dL_mm: draft['dL_mm'] ?? null,
                F_N: draft['F_N'] ?? null,
                k_N_m: draft['k_N_m'] ?? null,
              },
        };
        const verdicts = verifyRow(activeSpec.columns, tempRow);
        this.#journalVerdicts.set(ts, verdicts);
        if (tr) {
          for (const [key, verdict] of Object.entries(verdicts)) {
            const td = tr.querySelector<HTMLTableCellElement>(`td[data-key="${key}"]`);
            if (!td) continue;
            td.classList.remove(
              'j-verdict', 'j-verdict--ok', 'j-verdict--close', 'j-verdict--wrong', 'j-verdict--empty',
            );
            td.dataset['verdict'] = verdict;
            if (verdict !== 'empty') td.classList.add('j-verdict', `j-verdict--${verdict}`);
            const input = td.querySelector<HTMLInputElement>('input[data-key]');
            if (input) input.dataset['verdict'] = verdict;
          }
        }
      },
    });

    // §21.10 — pending-плашка только для semi-auto при ready && новой подписи.
    this.#updateRecordPending();
  }

  /** v1 fallback (если #journal-host не подключён в шаблоне). */
  #renderJournalLegacy(): void {
    const s = this.#store.get();
    if (s.measurements.length > 0) this.#refs.journalTable.removeAttribute('hidden');
    else this.#refs.journalTable.setAttribute('hidden', '');
    this.#refs.journalBody.replaceChildren();
    const l0 = s.scaleClickL0;
    s.measurements.forEach((m, i) => {
      const tr = document.createElement('tr');
      const dlMm = Math.round(m.extension * 10);
      const lAtLoad = l0 !== null ? l0 + dlMm : '—';
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${m.totalMass}</td>
        <td>${m.force.toFixed(2)}</td>
        <td>${lAtLoad}</td>
        <td>${dlMm}</td>
        <td>${m.k.toFixed(0)}</td>
      `;
      this.#refs.journalBody.appendChild(tr);
    });
  }

  /** §21.10 — управление видимостью pending-плашки «Записать в журнал». */
  #updateRecordPending(): void {
    if (!this.#refs.recordPendingSlot) return;
    const slot = this.#refs.recordPendingSlot;
    const mode = this.#recordMode();
    const s = this.#store.get();
    const ready = s.measurementStep === 'ready-to-record';
    const m = totalMass(s.weights);
    const l0 = s.scaleClickL0;
    const l1 = s.scaleClickL1;
    const signature = `${m}|${l0}|${l1}`;
    const visible = mode === 'semi-auto' && ready && signature !== this.#lastRecordedSignature;
    if (visible) {
      slot.removeAttribute('hidden');
      if (this.#refs.recordPendingSummary) {
        this.#refs.recordPendingSummary.textContent =
          ` (m=${m} г, l₀=${l0 ?? '—'} мм, l₁=${l1 ?? '—'} мм)`;
      }
    } else {
      slot.setAttribute('hidden', '');
    }
  }

  #renderResult(): void {
    const s = this.#store.get();
    if (this.#renderers.result) {
      this.#renderers.result(s, { resultPanel: this.#refs.resultPanel });
      return;
    }
    if (s.measurements.length < 2 || !s.spring) {
      this.#refs.resultPanel.innerHTML = '';
      this.#refs.resultPanel.setAttribute('hidden', '');
      return;
    }
    const expected = s.spring.springId === 'k50' ? 50 : null;
    const r = computeResults(s.measurements, expected);
    if (!r) return;

    const range = `${VALID_K_RANGE.min}…${VALID_K_RANGE.max}`;
    const inRangeMsg =
      r.isInValidRange === true
        ? `<p class="result-success">✓ Жёсткость попадает в допустимый интервал ${range} Н/м (паспорт пружины 50 ± 2 Н/м по ФИПИ)</p>`
        : r.isInValidRange === false
          ? `<p class="result-warning">⚠ Среднее не в интервале ${range} Н/м, проверьте измерения</p>`
          : '';

    this.#refs.resultPanel.innerHTML = `
      <h3 class="result-title">Результат</h3>
      <div class="result-grid">
        <div class="result-row"><span>Среднее k̄</span><strong>${r.mean.toFixed(1)} Н/м</strong></div>
        <div class="result-row"><span>Стандартное отклонение σ</span><strong>±${r.stdDev.toFixed(2)}</strong></div>
        <div class="result-row"><span>МНК через 0</span><strong>${r.byLeastSquares.toFixed(1)} Н/м</strong></div>
      </div>
      ${inRangeMsg}
    `;
    this.#refs.resultPanel.removeAttribute('hidden');
  }

  #renderGraph(): void {
    const s = this.#store.get();
    if (!this.#refs.graph) return;
    const wrap = document.getElementById('graph-wrap');
    if (s.measurements.length === 0) {
      wrap?.setAttribute('hidden', '');
      this.#refs.graph.data = { measurements: [], fitSlope: null };
      return;
    }
    wrap?.removeAttribute('hidden');
    const fitSlope =
      s.measurements.length >= 2
        ? computeResults(s.measurements)?.byLeastSquares ?? null
        : null;
    this.#refs.graph.data = { measurements: s.measurements, fitSlope };
  }

  #updateMountPosition(): void {
    if (!this.#refs.stand || !this.#refs.standContainer) return;
    const hookPos = this.#refs.stand.getHookPosition(1);
    const standRect = this.#refs.stand.getBoundingClientRect();
    const containerRect = this.#refs.standContainer.getBoundingClientRect();
    const x = standRect.left - containerRect.left + hookPos.x;
    const y = standRect.top - containerRect.top + hookPos.y;
    this.#springMount.style.left = `${x}px`;
    this.#springMount.style.top = `${y}px`;
  }

  #announce(message: string): void {
    this.#refs.liveRegion.textContent = message;
  }
}
