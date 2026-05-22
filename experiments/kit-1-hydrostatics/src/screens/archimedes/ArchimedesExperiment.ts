/**
 * ArchimedesExperiment — оркестратор опыта 1.2 «Архимедова сила».
 *
 * Этап 6b (расширение happy-path):
 *   - все 4 цилиндра с полным циклом (включая №1 как soft-warning case);
 *   - reverse drag по всей матрице §4 спеки;
 *   - 10 edge cases из §5 (перегрузка, частичное погружение, перелив, …);
 *   - точная геометрия нити в scene-space + ResizeObserver;
 *   - 600мс анимация погружения / подъёма + 1500мс шумовая стабилизация;
 *   - один большой оркестратор + Store + DragController; HintEngine, Stepper
 *     интерактивный, undo-toast, auto-save — этап 6c.
 *
 * Программный API оркестратора (для тестов и debug):
 *   placeDynamometer(rangeN), attachCylinderById(id),
 *   detachCylinder(), placeBeaker(), pourWater(volumeMl),
 *   dipCylinderInWater(), liftCylinderFromWater(),
 *   recordCurrentReading(),
 *   returnDynamometerToKit(), returnBeakerToKit(), returnCylinderToKit(id),
 *   reset(), getState(), getJournalRows(), getFullState(),
 *   getBannerText(), getOverloaded(), getPartialDip().
 *
 * Архитектура — повторяет DensityExperiment 1-в-1: один большой оркестратор,
 * Store, drag-handler как чистая обёртка над программным API. См. CLAUDE.md
 * + REFERENCE.md §15. Граница рефакторинга — ~2000 строк.
 */

import { Store } from '@shared/controller/Store';
import { DragDropController, type EquipmentDropDetail } from '../density-solid/controller/DragDropController';
// §20.4 REFERENCE.md — единый стандарт «manual default + auto toggle».
import {
  getRecordMode,
  injectRecordModeToggleStyles,
  renderRecordModeToggle,
  type RecordMode,
} from '@shared/lib/record-mode';
// §20.3 — единый shared CSS для `.lab-detach-btn` крестиков.
import { injectDetachButtonStyles } from '@shared/ui/detach-button';
// §21 — единый журнал измерений.
import { renderJournalTable } from '@shared/lib/journal/render';
import { ARCHIMEDES_SPEC } from '@shared/lib/journal/specs';
import { verifyRow } from '@shared/lib/journal/verify';
import { parseRu } from '@shared/lib/journal/format';
import type { JournalVerdict } from '@shared/lib/journal/types';

const RECORD_MODE_KIT = 'kit-1';
import {
  G,
  RHO_WATER,
  archimedesForceN,
  cm3ToM3,
  gToKg,
  weightInAirN,
  weightInLiquidPartialN,
} from '../../physics/archimedes/ArchimedesCalc';
import {
  ARCHIMEDES_CYLINDER_BY_ID,
  type ArchimedesCylinderId,
  type ArchimedesCylinderSpec,
} from '../../physics/archimedes/tables';
import type { LabJournal, JournalRow, CylinderId as JournalCylinderId } from '../../ui/components/lab-journal';
import { UndoStack } from '../../lib/undo';
import { HintEngine, type HintPayload } from './controller/HintEngine';
import { StateStore } from './controller/StateStore';
import type { LabToast } from '../../ui/components/lab-toast';

// ─── Константы ───────────────────────────────────────────────────────────

/** ёмкость стакана (мл). По ФИПИ ≥ 250 мл, у нас стакан 250. */
const BEAKER_CAPACITY_ML = 250;
/** При уровне ≤ этого порога цилиндр не покрыт водой (в мл) — soft-warning. */
const LOW_WATER_THRESHOLD_ML = 50;
/** Окно шумовой стабилизации после attach/dip (мс). */
const NOISE_SETTLE_MS = 1500;
/**
 * Fallback / максимальный «амбициозный» Y-offset для dip (px на сцене).
 *
 * Раньше (до §19.11.14) был жёсткой константой 312, и работал только на
 * 1440×900 — на 1366×768 цилиндр пробивал дно стакана (margin_above_bottom
 * становился отрицательным). Теперь актуальный offset вычисляется
 * **динамически** через `#computeDipOffset()` из реальных DOM-координат
 * (см. §19.11.14 REFERENCE). Эта константа осталась только как:
 *   1) `startOffset` fallback в drag-by-thread, когда state.dipOffsetPx ещё 0,
 *   2) верхняя граница clamp в drag-preview (0…DIP_Y_OFFSET_MAX_PX),
 *   3) запасное значение, если getBoundingClientRect не отрабатывает (SSR / тест).
 */
const DIP_Y_OFFSET_MAX_PX = 220;

/**
 * Гистерезис для дискретного флага `inWater` при continuous drag-by-thread.
 * Источник истины — submersionFraction, физическая величина (0..1).
 *
 * - При frac ≥ HYSTERESIS_ENTER (0.95) и текущем inWater=false → inWater=true.
 * - При frac ≤ HYSTERESIS_EXIT (0.85) и текущем inWater=true → inWater=false.
 * - В диапазоне (0.85..0.95) — inWater сохраняется (защита от дрожания).
 *
 * submersionFraction обновляется непрерывно для физики (force через
 * weightInLiquidPartialN), а inWater переключается дискретно для UI/Stepper.
 * См. §19.13 REFERENCE.
 */
const HYSTERESIS_ENTER = 0.95;
const HYSTERESIS_EXIT = 0.85;

/**
 * Геометрические запасы для адаптивного dip (см. `#computeDipOffset`).
 * Подбирались на 4 viewport'ах (1920×1080, 1440×900, 1366×768, 1280×720) —
 * минимально допустимые значения, при которых:
 *   inv1: cyl_top > water_top + DIP_SAFETY_TOP_PX  (цилиндр под водой)
 *   inv2: cyl_bot < beaker_bot − DIP_SAFETY_BOT_PX (зазор до дна)
 * проходят на всех viewport'ах. Если в более узком viewport'е стакан настолько
 * мелкий, что обе инварианты невыполнимы вместе — `partialDip=true`, цилиндр
 * приподнят над дном, верхняя кромка может слегка торчать. Это лучше «не врать
 * ученику», чем рендерить пробитый стакан.
 */
const DIP_SAFETY_TOP_PX = 8;
const DIP_SAFETY_BOT_PX = 12;

// ─── Типы ────────────────────────────────────────────────────────────────

/**
 * Этапы happy-path. Каждый шаг — атомарный переход вперёд.
 * В 6b добавлен явный «idle» возврат при detach + reverse-drag.
 */
export type ScenarioPhase =
  | 'idle'             // начало; на сцене нет ничего
  | 'dyno-on-scene'    // динамометр висит, force=0
  | 'cyl-attached'     // цилиндр подвешен на динамометре в воздухе
  | 'air-recorded'     // P_возд записан в журнал
  | 'beaker-on-scene'  // стакан поставлен (вода ≥ 0)
  | 'water-poured'     // в стакане ≥ 100 мл воды
  | 'cyl-in-water'     // динамометр опущен в стакан, цилиндр под водой
  | 'liquid-recorded'; // P_жид записан, F_A_изм авто-вычислено

export type DynamometerRange = 1 | 5;

interface State {
  phase: ScenarioPhase;
  /** Какой динамометр на сцене (range, 1 или 5). null если нет. */
  dynoRange: DynamometerRange | null;
  /** Какой цилиндр привязан к крюку. null если нет. */
  cylinderId: ArchimedesCylinderId | null;
  /** Стакан на сцене? */
  beakerOnScene: boolean;
  /** Сколько воды в стакане (мл). 0 если нет. */
  waterMl: number;
  /** Цилиндр в воде? */
  inWater: boolean;
  /** Текущее показание динамометра (Н). Авто-вычисляется по физике + noise. */
  forceN: number;
  /** Истинное (равновесное) показание — без noise. */
  forceTargetN: number;
  /** Перегрузка прибора (force > range). */
  overloaded: boolean;
  /** Цилиндр частично выглядывает (V_water < V_cyl) — F_A искажена. */
  partialDip: boolean;
  /** Цилиндр стоит на дне стакана (мало воды, не подвешен правильно). */
  bottomTouch: boolean;
  /** Стабилизировалось ли показание (можно записать). */
  stable: boolean;
  /** Timestamp текущей строки журнала (для пары P_возд + P_жид). */
  currentRowTs: number | null;
  /** Pending dose-picker (виден ли)? */
  dosePickerOpen: boolean;
  /** Текст soft-warning баннера; null = баннер скрыт. */
  bannerText: string | null;
  /** Список цилиндров, по которым полный цикл уже закрыт (P_возд + P_жид). */
  completedCylinders: ReadonlyArray<ArchimedesCylinderId>;
  /**
   * Адаптивное Y-смещение dyno+цилиндра при погружении (px). Вычисляется
   * через `#computeDipOffset()` из реальных DOM-координат на текущем viewport
   * перед началом dip-анимации, чтобы цилиндр был под водой и не пробивал дно
   * на любом размере экрана. 0 — цилиндр в воздухе. См. §19.11.14 REFERENCE.
   */
  dipOffsetPx: number;
  /**
   * Доля объёма цилиндра под водой ∈ [0..1]. 0 — в воздухе, 1 — полностью
   * под водой. Источник истины для `forceTargetN` через
   * `weightInLiquidPartialN(P_air, F_A_full, submersionFraction)`. При
   * плавном drag-by-thread обновляется непрерывно, отражая физику Архимеда:
   * F_A пропорциональна V_displaced = V_cyl · fraction. См. §19.13.
   *
   * inWater (boolean) — отдельный «дискретный» флаг с гистерезисом 0.95/0.85
   * для финализации фаз сценария. submersionFraction — непрерывный физический
   * параметр.
   */
  submersionFraction: number;
}

const INITIAL_STATE: State = {
  phase: 'idle',
  dynoRange: null,
  cylinderId: null,
  beakerOnScene: false,
  waterMl: 0,
  inWater: false,
  forceN: 0,
  forceTargetN: 0,
  overloaded: false,
  partialDip: false,
  bottomTouch: false,
  stable: true,
  currentRowTs: null,
  dosePickerOpen: false,
  bannerText: null,
  completedCylinders: [],
  dipOffsetPx: 0,
  submersionFraction: 0,
};

interface Refs {
  rootHost: HTMLElement;
  steps: HTMLElement;
  hint: HTMLElement;
  resetBtn: HTMLButtonElement;
  stage: HTMLElement;
  clamp: HTMLElement;
  dropzoneStage: HTMLElement;
  dropzoneBeaker: HTMLElement;
  dynoHost: HTMLElement;
  cylinderHost: HTMLElement;
  /** SVG-overlay для нити/линии-зажима/danger-bottom. */
  sceneOverlay: SVGSVGElement;
  clampLine: SVGLineElement;
  threadPath: SVGPathElement;
  bottomDanger: SVGLineElement;
  beakerHost: HTMLElement;
  banner: HTMLElement;
  bannerText: HTMLElement;
  dosePicker: HTMLElement;
  recordBtn: HTMLButtonElement;
  recordLabel: HTMLElement;
  journal: LabJournal;
  /** §21: контейнер для shared `renderJournalTable` (с ARCHIMEDES_SPEC). */
  journalHost: HTMLElement;
  liveRegion: HTMLElement;
  equipmentCards: HTMLElement[];
  /** X-кнопки detach (REFERENCE §15.4) — discoverable, видны всегда. */
  detachDynoBtn: HTMLButtonElement;
  detachCylBtn: HTMLButtonElement;
  detachBeakerBtn: HTMLButtonElement;
  /** §20.4 REFERENCE.md — слот для toggle «manual / auto». */
  recordModeSlot: HTMLElement;
}

const HINTS: Record<ScenarioPhase, string> = {
  idle: 'Перетащите динамометр на сцену.',
  'dyno-on-scene': 'Подвесьте цилиндр (рекомендуем №3) на крючок динамометра.',
  'cyl-attached':
    'Цилиндр висит в воздухе. Нажмите большую жёлтую кнопку «Записать P возд» в журнал.',
  'air-recorded': 'Возьмите стакан со стола и поставьте на сцену.',
  'beaker-on-scene':
    'Налейте воду в стакан — рекомендуем 200 мл, этого хватит для полного погружения цилиндра №3.',
  'water-poured':
    'Тяните цилиндр вниз по нити ↓ или нажмите на него — он опустится в воду.',
  'cyl-in-water':
    'Цилиндр под водой. Нажмите «Записать P жид» — F_A появится автоматически.',
  'liquid-recorded': 'Готово! Можно повторить с другим цилиндром или сбросить опыт.',
};

/** §21 UX-v2: в fully-manual подсказки без отсылок к кнопке «Записать» — её нет. */
const HINTS_MANUAL: Record<ScenarioPhase, string> = {
  idle: 'Перетащите динамометр на сцену.',
  'dyno-on-scene': 'Подвесьте цилиндр (рекомендуем №3) на крючок динамометра.',
  'cyl-attached': 'Цилиндр висит в воздухе. Снимите показание динамометра и запишите P возд в журнал.',
  'air-recorded': 'Возьмите стакан со стола и поставьте на сцену.',
  'beaker-on-scene':
    'Налейте воду в стакан — рекомендуем 200 мл, этого хватит для полного погружения цилиндра №3.',
  'water-poured':
    'Тяните цилиндр вниз по нити ↓ или нажмите на него — он опустится в воду.',
  'cyl-in-water': 'Цилиндр под водой. Снимите показание динамометра и запишите P жид в журнал.',
  'liquid-recorded': 'Готово! Можно повторить с другим цилиндром или сбросить опыт.',
};

const STEP_BY_PHASE: Record<ScenarioPhase, number> = {
  idle: 1,
  'dyno-on-scene': 2,
  'cyl-attached': 3,
  'air-recorded': 4,
  'beaker-on-scene': 4,
  'water-poured': 5,
  'cyl-in-water': 6,
  'liquid-recorded': 6,
};

const RECORD_LABELS: Partial<Record<ScenarioPhase, string>> = {
  'cyl-attached': 'Записать P возд',
  'beaker-on-scene': 'Записать P возд',
  'water-poured': 'Записать P возд',
  'cyl-in-water': 'Записать P жид',
};

/**
 * Persistence payload — сериализуемая часть состояния. ВНУТРИ — только
 * чистые value-типы (без RAF id, без timeout-ов, без функций).
 *
 * journalRows храним без timestamp-handle полностью, чтобы при restore их
 * можно было перевбросить в lab-journal.
 */
interface PersistedPayload {
  phase: ScenarioPhase;
  dynoRange: DynamometerRange | null;
  cylinderId: ArchimedesCylinderId | null;
  beakerOnScene: boolean;
  waterMl: number;
  inWater: boolean;
  /**
   * Доля погружения ∈ [0..1]. Для restore:
   *   - inWater=false → frac=0
   *   - inWater=true  → frac=1 (или, если ученик оставил в промежутке —
   *     restore'd значение). Для совместимости со старыми snapshots
   *     отсутствие поля → frac = inWater ? 1 : 0.
   */
  submersionFraction: number;
  forceTargetN: number;
  overloaded: boolean;
  partialDip: boolean;
  bottomTouch: boolean;
  bannerText: string | null;
  completedCylinders: ReadonlyArray<ArchimedesCylinderId>;
  journalRows: ReadonlyArray<Omit<JournalRow, 'timestamp'>>;
}

// ─── Класс ───────────────────────────────────────────────────────────────

export class ArchimedesExperiment {
  #refs: Refs;
  #store: Store<State>;
  #unsub: (() => void) | null = null;
  /** §20.4 — disposer для record-mode toggle. */
  #detachRecordModeToggle: (() => void) | null = null;
  /** §20.4 — какие фазы уже зафиксированы auto-режимом (защита от повтора). */
  #autoRecordedPhases = new Set<ScenarioPhase>();
  /** §21: «черновик» введённых учеником derived-значений по timestamp строки. */
  #journalDrafts = new Map<number, Record<string, number>>();
  /** §21: verdicts по timestamp после клика ✓. */
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #dragDrop: DragDropController;
  /** Live-инстанс динамометра в DOM. */
  #dynoEl: HTMLElement | null = null;
  /** Live-инстанс цилиндра. */
  #cylinderEl: HTMLElement | null = null;
  /** Live-инстанс стакана. */
  #beakerEl: HTMLElement | null = null;

  /** RAF-id для текущей анимации (dip / lift / noise). null если нет. */
  #animRafId: number | null = null;
  /** setTimeout-id для отмены noise-стабилизации. */
  #stableTid: number | null = null;
  /** ResizeObserver на сцене — чтобы пересчитывать координаты overlay. */
  #ro: ResizeObserver | null = null;

  /**
   * Drag-by-thread: вертикальный жест на цилиндре (или нити). Ученик в реале
   * тянет цилиндр вниз по нити — программа имитирует это: при достижении
   * порога DRAG_DIP_THRESHOLD_PX вызывается dipCylinderInWater, при движении
   * вверх в воде ниже порога — liftCylinderFromWater. См. §4 спеки 1-2.
   *
   * `null`, когда жеста нет; объект, когда pointerdown прошёл и мы тянем.
   */
  #verticalDrag: {
    pointerId: number;
    startY: number;
    /** Начальное значение DIP-смещения (0 для air, DIP_Y_OFFSET_PX для water). */
    startOffset: number;
    /** Текущее смещение цилиндра вниз от air-позиции в px (clamped). */
    offset: number;
    /**
     * Зашло ли движение в drag-mode (≥6px по Y)? Если false на pointerup —
     * это был «click без drag», управление перейдёт в click-handler (path B).
     * Если true — это полноценный drag, click дублироваться не должен и
     * финализация идёт по последнему submersionFraction.
     */
    didTrigger: boolean;
    /** Текущая доля погружения цилиндра ∈ [0..1] — обновляется в moveListener. */
    submersionFraction: number;
    /** Текущее displayed-показание динамометра (для финализации). */
    liveForce: number;
    /** Обработчик зарегистрирован — для cleanup. */
    moveListener: (e: PointerEvent) => void;
    upListener: (e: PointerEvent) => void;
  } | null = null;

  /**
   * Timestamp последнего успешного drag-финализации (didTrigger=true). Браузер
   * после pointerup на том же элементе синтезирует `click` — без этого guard'а
   * click-handler ловил бы его и вызывал dip/lift поверх свежего drag-finalize,
   * мгновенно откатывая результат (см. §19.11.18). 250 ms — стандартный gap
   * для распознавания «это синтетический click от только что завершённого
   * drag», а не отдельный новый клик пользователя.
   */
  #lastDragFinalizedAt = 0;

  /** Engine подсказок (этап 6c — implicit scaffolding). */
  #hintEngine: HintEngine;
  /** Auto-save в localStorage. null если запрещено / SSR. */
  #stateStore: StateStore<PersistedPayload>;
  /** LIFO стек обратимых действий (для undo-toast). */
  #undoStack: UndoStack = new UndoStack(8);
  /** Текущий live-инстанс undo-toast (один за раз — последняя команда «выше»). */
  #activeToasts: Map<string, LabToast> = new Map();
  /** Защита от записи в storage пока идёт restore (внутренний flag). */
  #isRestoring = false;

  constructor(refs: Refs) {
    this.#refs = refs;
    this.#store = new Store<State>({ ...INITIAL_STATE });

    refs.resetBtn.addEventListener('click', this.#handleResetClick);
    refs.recordBtn.addEventListener('click', this.#handleRecordClick);
    refs.detachDynoBtn.addEventListener('click', this.#handleDetachDynoClick);
    refs.detachCylBtn.addEventListener('click', this.#handleDetachCylClick);
    refs.detachBeakerBtn.addEventListener('click', this.#handleDetachBeakerClick);

    // §20.3, §20.4 REFERENCE.md — единый shared CSS для крестиков и toggle.
    injectDetachButtonStyles();
    injectRecordModeToggleStyles();
    this.#detachRecordModeToggle = renderRecordModeToggle(refs.recordModeSlot, {
      kitId: RECORD_MODE_KIT,
      onChange: (mode) => this.#handleRecordModeChange(mode),
    });
    for (const card of refs.equipmentCards) {
      card.addEventListener('click', this.#handleCardClick as EventListener);
    }
    for (const btn of Array.from(refs.dosePicker.querySelectorAll<HTMLButtonElement>('.dose-btn'))) {
      btn.addEventListener('click', this.#handleDoseClick);
    }

    this.#dragDrop = new DragDropController(refs.rootHost, this.#handleDrop);

    refs.rootHost.addEventListener('beaker-tap', this.#handleBeakerTap);

    // ─── Direct-manipulation на цилиндре: click-to-dip + drag-by-thread ──
    // Жест «тянуть цилиндр вниз в воду» (path A) и «кликнуть для погружения»
    // (path B) — оба живут на cylinderHost. См. §4 спеки 1-2.
    refs.cylinderHost.addEventListener('pointerdown', this.#handleCylinderPointerDown);
    refs.cylinderHost.addEventListener('click', this.#handleCylinderClick);
    refs.cylinderHost.addEventListener('keydown', this.#handleCylinderKey);

    // §19.11.16: re-render scene overlay (нить, clamp-line) после завершения
    // CSS transition cyl-host/dyno-host. Без этого после dip/lift нить
    // застывает в mid-transition позиции, потому что store.set + render
    // происходят ДО завершения 600ms transition, а ResizeObserver на stage
    // не fires (размер не меняется).
    const onTransitionEnd = (ev: Event): void => {
      if ((ev as TransitionEvent).propertyName !== 'transform') return;
      this.#renderSceneOverlay(this.#store.get());
      this.#syncDetachCylPosition();
    };
    refs.cylinderHost.addEventListener('transitionend', onTransitionEnd);
    refs.dynoHost.addEventListener('transitionend', onTransitionEnd);

    // Keyboard-shortcut Space/Enter для CTA — на уровне screen host'a, чтобы
    // ловить ввод даже когда фокус «вне» кнопки. CTA сама принимает фокус,
    // но ученик может работать клавиатурой по сцене и ждать Space.
    refs.rootHost.addEventListener('keydown', this.#handleGlobalKey);

    // ResizeObserver на сцене — на любое изменение её размера пересчитываем
    // overlay-координаты (нить, зажим). Также — если цилиндр сейчас в воде,
    // пересчитываем dipOffsetPx (адаптивный, зависит от высоты сцены), иначе
    // при resize окна цилиндр уплыл бы относительно стакана. См. §19.11.14.
    if (typeof ResizeObserver !== 'undefined') {
      this.#ro = new ResizeObserver(() => {
        // §19.11.16: фикс stale-snapshot бага. Раньше `cur` фиксировался
        // на L390 и передавался в `#renderCylinder` ПОСЛЕ возможного
        // `store.set({dipOffsetPx})` — render использовал старое значение,
        // визуал/state расходились.
        const cur = this.#store.get();
        this.#renderSceneOverlay(cur);
        if (cur.inWater) {
          const { offsetPx } = this.#computeDipOffset();
          if (offsetPx > 0 && offsetPx !== cur.dipOffsetPx) {
            // store.set сам триггерит subscribe → render. НЕ вызываем
            // renderCylinder локально, чтобы избежать race с stale `cur`.
            this.#store.set({ dipOffsetPx: offsetPx });
            this.#syncDetachCylPosition();
            return;
          }
        }
        // Если состояние не менялось (нет dip или offset не сдвинулся) —
        // просто пересчитаем cyl-host через свежий snapshot.
        if (cur.cylinderId !== null && !this.#verticalDrag) {
          this.#renderCylinder(this.#store.get());
        }
        this.#syncDetachCylPosition();
      });
      this.#ro.observe(refs.stage);
    }

    // ─── HintEngine ────────────────────────────────────────────────
    this.#hintEngine = new HintEngine({ recordMode: getRecordMode(RECORD_MODE_KIT) });
    this.#hintEngine.onHint(this.#handleEngineHint);
    this.#hintEngine.onAmbientPulse(this.#handleAmbientPulse);

    // ─── StateStore ────────────────────────────────────────────────
    this.#stateStore = new StateStore<PersistedPayload>();

    let lastPhase: ScenarioPhase = INITIAL_STATE.phase;
    this.#unsub = this.#store.subscribe((s) => {
      this.#render(s);
      // Любая мутация state — это activity (сбрасывает inactivity-таймер).
      this.#hintEngine.trackActivity();
      if (s.phase !== lastPhase) {
        lastPhase = s.phase;
        this.#hintEngine.setPhase(s.phase);
      }
      // §20.4 REFERENCE.md — auto-режим: если включён toggle И state стал
      // ready+stable И запись ещё не сделана для этой фазы — фиксируем
      // автоматически. Это эквивалентно нажатию ученика на recordBtn.
      if (this.#recordMode() === 'fully-auto') {
        this.#maybeAutoRecord(s);
      }
      // Throttled auto-save при каждом изменении state. Skip если внутри
      // restore — иначе перезатрём только что прочитанные данные.
      if (!this.#isRestoring) this.#stateStore.save(this.#snapshotPayload());
    });
    this.#render(this.#store.get());
    this.#hintEngine.setPhase(this.#store.get().phase);

    // ─── Restore из localStorage ──────────────────────────────────
    this.#tryRestoreFromStorage();
  }

  destroy(): void {
    this.#cancelAnim();
    this.#cancelStableTimer();
    this.#ro?.disconnect();
    this.#ro = null;
    this.#unsub?.();
    this.#unsub = null;
    this.#dragDrop.destroy();
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
    this.#hintEngine.dispose();
    this.#stateStore.flush();
    // Уберём все живые тосты, чтобы они не остались висеть в DOM body.
    for (const t of this.#activeToasts.values()) {
      try {
        t.dismiss('manual');
      } catch {
        /* defensive */
      }
    }
    this.#activeToasts.clear();
    this.#refs.resetBtn.removeEventListener('click', this.#handleResetClick);
    this.#refs.recordBtn.removeEventListener('click', this.#handleRecordClick);
    this.#refs.detachDynoBtn.removeEventListener('click', this.#handleDetachDynoClick);
    this.#refs.detachCylBtn.removeEventListener('click', this.#handleDetachCylClick);
    this.#refs.detachBeakerBtn.removeEventListener('click', this.#handleDetachBeakerClick);
    for (const card of this.#refs.equipmentCards) {
      card.removeEventListener('click', this.#handleCardClick as EventListener);
    }
    for (const btn of Array.from(this.#refs.dosePicker.querySelectorAll<HTMLButtonElement>('.dose-btn'))) {
      btn.removeEventListener('click', this.#handleDoseClick);
    }
    this.#refs.rootHost.removeEventListener('beaker-tap', this.#handleBeakerTap);
    this.#refs.cylinderHost.removeEventListener('pointerdown', this.#handleCylinderPointerDown);
    this.#refs.cylinderHost.removeEventListener('click', this.#handleCylinderClick);
    this.#refs.cylinderHost.removeEventListener('keydown', this.#handleCylinderKey);
    this.#refs.rootHost.removeEventListener('keydown', this.#handleGlobalKey);
    this.#endVerticalDrag();
  }

  // ─── Public API (программное управление, тесты, debug) ────────────────

  /** Поставить динамометр на сцену. По умолчанию range=1 (точнее для F_A < 1 Н). */
  placeDynamometer(rangeN: DynamometerRange = 1): void {
    const s = this.#store.get();
    if (s.dynoRange !== null) return; // уже стоит — no-op
    this.#store.set({
      dynoRange: rangeN,
      forceN: 0,
      forceTargetN: 0,
      overloaded: false,
      stable: true,
      phase: 'dyno-on-scene',
    });
    this.#announce(`Динамометр ${rangeN} Н поставлен на сцену.`);
  }

  /** Подвесить цилиндр на крючок динамометра. */
  attachCylinderById(id: ArchimedesCylinderId): void {
    const s = this.#store.get();
    if (s.dynoRange === null) {
      this.#announce('Сначала поставьте динамометр.');
      return;
    }
    if (s.cylinderId !== null) {
      this.#announce('Снимите предыдущий цилиндр перед подвешиванием нового.');
      return;
    }
    const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(id);
    if (!cyl) return;
    const target = weightInAirN(gToKg(cyl.m_g));
    const range = s.dynoRange;
    const overloaded = target > range;
    // При перегрузке: показание клампим в range, баннер «Перегрузка».
    const displayed = overloaded ? range : target;
    const banner = overloaded
      ? `Перегрузка! Возьмите динамометр ${range === 1 ? '5' : '1'} Н или другой цилиндр.`
      : null;

    this.#cancelAnim();
    this.#cancelStableTimer();
    this.#store.set({
      cylinderId: id,
      forceTargetN: target,
      forceN: displayed,
      overloaded,
      stable: false,
      phase: 'cyl-attached',
      bannerText: banner,
    });
    this.#startNoiseSettle(displayed);
    this.#announce(
      overloaded
        ? `Цилиндр №${id} подвешен. Перегрузка: вес ${target.toFixed(2)} Н превышает предел ${range} Н.`
        : `Цилиндр №${id} подвешен. Динамометр показывает вес в воздухе.`,
    );
  }

  /** Снять цилиндр с динамометра (вернуть в воздух — фактически отвязать). */
  detachCylinder(): void {
    const s = this.#store.get();
    if (s.cylinderId === null) return;
    this.#cancelAnim();
    this.#cancelStableTimer();
    // Если опыт уже завершён по этому цилиндру (liquid-recorded), не сбрасываем
    // currentRowTs — журнал уже зафиксирован. Иначе — обнуляем строку, чтобы
    // следующее P_возд создало новую.
    const completed = s.phase === 'liquid-recorded';
    const newCompleted: ReadonlyArray<ArchimedesCylinderId> =
      completed && !s.completedCylinders.includes(s.cylinderId)
        ? [...s.completedCylinders, s.cylinderId]
        : s.completedCylinders;
    // Если был частично-погружён или в воде — поднимаем динамометр.
    const newPhase: ScenarioPhase = s.beakerOnScene
      ? s.waterMl >= 100
        ? 'water-poured'
        : 'beaker-on-scene'
      : s.dynoRange !== null
        ? 'dyno-on-scene'
        : 'idle';
    this.#store.set({
      cylinderId: null,
      forceTargetN: 0,
      forceN: 0,
      overloaded: false,
      partialDip: false,
      bottomTouch: false,
      inWater: false,
      stable: true,
      currentRowTs: completed ? null : s.currentRowTs,
      bannerText: null,
      completedCylinders: newCompleted,
      phase: newPhase,
      dipOffsetPx: 0,
      submersionFraction: 0,
    });
    this.#announce('Цилиндр снят с динамометра.');
  }

  /** Поставить стакан на сцену. */
  placeBeaker(): void {
    const s = this.#store.get();
    if (s.beakerOnScene) return;
    if (s.phase === 'idle' || s.phase === 'dyno-on-scene' || s.phase === 'cyl-attached') {
      // Допускаем поставить стакан и до записи P_возд (полная имитация
      // реального мира): ученик может сначала всё разложить, потом мерить.
      this.#store.set({ beakerOnScene: true });
      this.#announce('Стакан поставлен на стол.');
      return;
    }
    this.#store.set({ beakerOnScene: true, phase: 'beaker-on-scene' });
    this.#announce('Стакан поставлен на стол.');
  }

  /** Налить воду в стакан. 100/150/200/300 — последнее = перелив. */
  pourWater(volumeMl: number): void {
    const s = this.#store.get();
    if (!s.beakerOnScene) {
      this.#announce('Сначала поставьте стакан.');
      return;
    }
    let actual = Math.max(0, Math.floor(volumeMl));
    let banner: string | null = s.bannerText;
    if (actual > BEAKER_CAPACITY_ML) {
      banner = `Перелив! Налили больше, чем вмещает стакан (${BEAKER_CAPACITY_ML} мл). Лишнее ушло на стол.`;
      actual = BEAKER_CAPACITY_ML;
    } else if (actual > 0 && actual < 150 && s.cylinderId !== null) {
      // Soft-warning «мало воды для полного погружения». Не блокирует, но
      // указывает на проблему. См. §19.13 REFERENCE.
      banner = 'Воды мало, цилиндр будет выглядывать из воды. Долейте до 200 мл.';
    } else if (actual >= 150) {
      // Прежний low-water warning сбрасываем, если он был. perelid-banner
      // оставляем нетронутым (был задан в первой ветке).
      if (s.bannerText && /Воды мало/.test(s.bannerText)) banner = null;
    }
    const newPhase: ScenarioPhase =
      s.phase === 'cyl-in-water' || s.phase === 'liquid-recorded'
        ? s.phase
        : actual >= 100
          ? 'water-poured'
          : 'beaker-on-scene';
    this.#store.set({
      waterMl: actual,
      dosePickerOpen: false,
      phase: newPhase,
      bannerText: banner,
    });
    this.#announce(`Налито ${actual} мл воды${actual !== volumeMl ? ' (часть пролилась)' : ''}.`);
    // Если цилиндр уже в воде — пересчитать F_A (изменился V_погружения).
    if (s.inWater && s.cylinderId !== null) {
      this.#recomputeForceForState(this.#store.get());
    }
  }

  /** Опустить динамометр с цилиндром в воду — анимированно (600мс). */
  dipCylinderInWater(): void {
    const s = this.#store.get();
    if (s.cylinderId === null) {
      this.#announce('Подвесьте цилиндр перед погружением.');
      return;
    }
    if (!s.beakerOnScene) {
      this.#announce('Поставьте стакан на стол.');
      return;
    }
    if (s.waterMl <= 0) {
      this.#announce('В стакане нет воды — нельзя погружать цилиндр.');
      // Drop отклонён, soft-warning для UI:
      this.#store.set({
        bannerText: 'В стакан нужна вода — налейте, прежде чем погружать.',
      });
      return;
    }
    if (s.inWater) return;
    const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(s.cylinderId);
    if (!cyl) return;

    // Расчёт частичного / полного погружения.
    // dipCylinderInWater = «полное погружение по умолчанию», submersionFraction=1.
    // Если воды мало — partial=true, реальная frac будет < 1 (limit by water column).
    const { F_A_full, partial, bottom, low } = this.#calcDipPhysics(cyl, s.waterMl);
    const P_air = weightInAirN(gToKg(cyl.m_g));
    const target = weightInLiquidPartialN(P_air, F_A_full, 1);
    const range = s.dynoRange ?? 1;
    const overloaded = target > range;
    const displayed = overloaded ? range : target;

    // Адаптивно вычисляем dip-offset из реальных DOM-координат ДО изменения
    // state — иначе render отработает с устаревшим значением и анимация
    // дёрнется. Если стакан слишком мелкий (partialDipGeo) — банер про
    // геометрию имеет приоритет над физикой (видим ситуацию глазами).
    // `target` передаём в #computeDipOffset, чтобы оно учло «поднятие крюка
    // дин-ра» при падении силы с P_возд до P_жид (компенсация baseTop).
    // См. §19.11.14.
    const { offsetPx, partialDip: partialDipGeo } =
      this.#computeDipOffset(displayed);

    let banner: string | null = null;
    if (partialDipGeo) {
      banner = 'Стакан мелкий — цилиндр не помещается полностью. F_A искажена.';
    } else if (low) banner = 'Цилиндр касается дна — F_A искажена. Долейте воды.';
    else if (partial) banner = 'Цилиндр не полностью под водой — F_A < теоретической.';
    else if (overloaded) banner = `Перегрузка! Возьмите динамометр ${range === 1 ? '5' : '1'} Н.`;

    this.#cancelAnim();
    this.#cancelStableTimer();
    // §19.11.16: state.forceN сразу = displayed. Раньше state.forceN=s.forceN
    // (старое значение) с анимацией через RAF; если RAF прерывался (cancelAnim
    // от ResizeObserver, drag, autosave race) — state.forceN застревал на
    // P_возд → дин-р показывал 0,65 в воде. Теперь truth — в state, плавность
    // обеспечивает CSS-transition компонента lab-dynamometer.
    this.#store.set({
      inWater: true,
      forceTargetN: target,
      forceN: displayed,
      overloaded,
      partialDip: partial || partialDipGeo,
      bottomTouch: bottom,
      stable: true,
      phase: 'cyl-in-water',
      bannerText: banner,
      dipOffsetPx: offsetPx,
      submersionFraction: 1,
    });
    this.#announce(
      partial
        ? `Цилиндр №${cyl.id} частично погружён. F_A меньше теоретической.`
        : bottom
          ? `Цилиндр №${cyl.id} касается дна стакана.`
          : `Цилиндр №${cyl.id} полностью погружён. Динамометр показывает вес в воде.`,
    );
  }

  /**
   * Поднять цилиндр из воды обратно в воздух (reverse dip). Динамометр едет
   * вверх 600мс, force возвращается к P_возд.
   */
  liftCylinderFromWater(): void {
    const s = this.#store.get();
    if (!s.inWater || s.cylinderId === null) return;
    const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(s.cylinderId);
    if (!cyl) return;
    const target = weightInAirN(gToKg(cyl.m_g));
    const range = s.dynoRange ?? 1;
    const overloaded = target > range;
    const displayed = overloaded ? range : target;
    // Если P_жид уже записан — цикл закрыт; phase остаётся 'liquid-recorded'.
    // Иначе — фаза определяется по реальному состоянию сцены (стакан/вода
    // никуда не делись), чтобы CTA после повторного погружения корректно
    // показывал «Записать P жид», а не «Записать P возд».
    const newPhase: ScenarioPhase =
      s.phase === 'liquid-recorded'
        ? 'liquid-recorded'
        : s.beakerOnScene && s.waterMl > 0
          ? 'water-poured'
          : s.beakerOnScene
            ? 'beaker-on-scene'
            : 'cyl-attached';
    this.#cancelAnim();
    this.#cancelStableTimer();
    // §19.11.16: state.forceN сразу = displayed (был s.forceN, см. dipCyl).
    this.#store.set({
      inWater: false,
      forceTargetN: target,
      forceN: displayed,
      overloaded,
      partialDip: false,
      bottomTouch: false,
      stable: true,
      phase: newPhase,
      bannerText: overloaded
        ? `Перегрузка! Возьмите динамометр ${range === 1 ? '5' : '1'} Н.`
        : null,
      dipOffsetPx: 0,
      submersionFraction: 0,
    });
    this.#announce(`Цилиндр №${cyl.id} поднят в воздух.`);
  }

  /** §20.4 REFERENCE.md — текущий режим записи (читается из localStorage). */
  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  /**
   * Обработчик переключения toggle: при включении auto и наличии готового
   * измерения — фиксируем сразу. Re-render для актуального CTA.
   */
  #handleRecordModeChange = (mode: RecordMode): void => {
    // HintEngine — переключаем тексты подсказок (нет «нажмите Записать» в fully-manual).
    this.#hintEngine.setRecordMode(mode);
    if (mode === 'fully-auto') {
      this.#maybeAutoRecord(this.#store.get());
    }
    // Если выключили auto после некоторых записей — список «уже-сделанных»
    // фаз сохраняем; ученику в manual просто не предложат повторно.
    this.#render(this.#store.get());
  };

  /**
   * §20.4 — auto-fire записи когда state в stable+ready и эта фаза ещё
   * не зафиксирована auto-логикой в текущей сессии. Защищает от повтора:
   * один state stable=true может приходить несколько раз подряд (RAF).
   */
  #maybeAutoRecord(s: Readonly<State>): void {
    if (!s.stable) return;
    // P_возд: цилиндр в воздухе, НЕ overload, фаза подходит для записи P_возд.
    const isAirReady =
      !s.inWater &&
      !s.overloaded &&
      s.cylinderId !== null &&
      (s.phase === 'cyl-attached' ||
        s.phase === 'beaker-on-scene' ||
        s.phase === 'water-poured');
    // P_жид: цилиндр в воде, фаза cyl-in-water.
    const isLiquidReady =
      s.inWater &&
      !s.overloaded &&
      s.cylinderId !== null &&
      s.phase === 'cyl-in-water';
    if (!isAirReady && !isLiquidReady) return;
    if (this.#autoRecordedPhases.has(s.phase)) return;
    this.#autoRecordedPhases.add(s.phase);
    // Сбрасываем «liquid-recorded» из набора при возврате — но это
    // обработается в reset() / ниже. Сейчас просто фиксируем.
    this.recordCurrentReading();
  }

  /**
   * Записать текущее показание (P_возд или P_жид — в зависимости от фазы)
   * в журнал. Это команда «commit», единая для обоих этапов.
   */
  recordCurrentReading(): void {
    const s = this.#store.get();
    if (s.cylinderId === null) {
      this.#announce('Цилиндр не подвешен.');
      return;
    }
    const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(s.cylinderId);
    if (!cyl) return;

    // P_возд можно записать когда цилиндр в воздухе (не в воде) — независимо от
    // того, налили ли воду уже. Это «полная имитация реального мира»: ученик
    // может расположить всё на сцене заранее, потом мерить.
    const isAirReading =
      !s.inWater &&
      (s.phase === 'cyl-attached' ||
        s.phase === 'beaker-on-scene' ||
        s.phase === 'water-poured');
    if (isAirReading) {
      const P_air_rounded = roundForRange(s.forceTargetN, s.dynoRange ?? 1);
      // Если P_возд уже записан в текущей строке — не дублируем, а обновляем
      // (на случай если ученик снял и снова повесил цилиндр).
      if (s.currentRowTs !== null) {
        const journalCyl = this.#cylJournalId(cyl.id);
        if (journalCyl === null) return;
        const prevRow = this.#refs.journal
          .getRows()
          .find((r) => r.timestamp === s.currentRowTs);
        const tsToUpdate = s.currentRowTs;
        this.#refs.journal.updateRow(tsToUpdate, {
          cylinder: journalCyl,
          V_cm3: cyl.V_cm3,
          P_air_N: P_air_rounded,
        });
        this.#announce(`P возд обновлено: ${P_air_rounded.toFixed(2)} Н.`);
        // Undo на update — возврат к предыдущим значениям.
        if (prevRow) {
          this.#undoStack.push({
            id: 'record',
            do: () => {
              /* noop */
            },
            undo: () => {
              this.#refs.journal.updateRow(tsToUpdate, {
                cylinder: prevRow.cylinder,
                V_cm3: prevRow.V_cm3,
                P_air_N: prevRow.P_air_N,
              });
            },
            label: 'Запись обновлена',
          });
          this.#showUndoToast({
            message: `Записано: P возд = ${formatRu(P_air_rounded, 2)} Н`,
            actionLabel: 'Отменить',
            severity: 'success',
            undoId: 'record',
          });
        }
        return;
      }
      const journalCyl = this.#cylJournalId(cyl.id);
      if (journalCyl === null) {
        this.#announce(
          'Цилиндр №1 исключён из этого опыта — попробуйте №2, №3 или №4.',
        );
        return;
      }
      const ts = this.#refs.journal.addRow({
        cylinder: journalCyl,
        V_cm3: cyl.V_cm3,
        P_air_N: P_air_rounded,
        P_liquid_N: null,
        F_A_meas_N: null,
        F_A_theor_N: 0, // recompute внутри журнала
        delta_pct: null,
        context: {
          cylinder_id: String(cyl.id),
          liquid: 'water',
          V_water_ml: s.waterMl,
        },
      });
      // Phase двигаем только если он был cyl-attached (точка перед записью);
      // если ученик уже в water-poured/beaker-on-scene — оставляем,
      // чтобы шаг «Налейте воду» не возникал заново.
      const newPhase: ScenarioPhase =
        s.phase === 'cyl-attached' ? 'air-recorded' : s.phase;
      this.#store.set({ currentRowTs: ts, phase: newPhase });
      this.#announce(
        `P возд = ${P_air_rounded.toFixed(2)} Н записано в журнал.`,
      );
      // Auto-save сразу после commit — не ждём 5с throttle.
      this.#stateStore.saveImmediate(this.#snapshotPayload());
      // Undo: удалить только что добавленную строку, обнулить currentRowTs.
      this.#undoStack.push({
        id: 'record',
        do: () => {
          /* noop */
        },
        undo: () => {
          this.#refs.journal.removeRow(ts);
          // Возвращаем phase назад только если она именно из-за нас сместилась.
          if (this.#store.get().phase === 'air-recorded') {
            this.#store.set({ currentRowTs: null, phase: 'cyl-attached' });
          } else {
            this.#store.set({ currentRowTs: null });
          }
        },
        label: 'Запись добавлена',
      });
      this.#showUndoToast({
        message: `Записано: P возд = ${formatRu(P_air_rounded, 2)} Н`,
        actionLabel: 'Отменить',
        severity: 'success',
        undoId: 'record',
      });
      return;
    }

    if (s.phase === 'cyl-in-water') {
      const journalCyl = this.#cylJournalId(cyl.id);
      if (journalCyl === null) {
        this.#announce('Цилиндр №1 не учитывается в журнале опыта 1.2.');
        return;
      }
      const P_liquid_rounded = roundForRange(s.forceTargetN, s.dynoRange ?? 1);
      let undoTsForRow: number;
      const prevPhase: ScenarioPhase = s.phase;
      let prevP_liquid: number | null = null;
      if (s.currentRowTs === null) {
        // Защита: P_возд не был записан — пишем строку целиком.
        const P_air = weightInAirN(gToKg(cyl.m_g));
        const ts = this.#refs.journal.addRow({
          cylinder: journalCyl,
          V_cm3: cyl.V_cm3,
          P_air_N: roundForRange(P_air, s.dynoRange ?? 1),
          P_liquid_N: P_liquid_rounded,
          F_A_meas_N: null,
          F_A_theor_N: 0,
          delta_pct: null,
          context: {
            cylinder_id: String(cyl.id),
            liquid: 'water',
            V_water_ml: s.waterMl,
          },
        });
        this.#store.set({ currentRowTs: ts, phase: 'liquid-recorded' });
        undoTsForRow = ts;
        // undo сценарий: убрать строку целиком.
        this.#undoStack.push({
          id: 'record',
          do: () => {
            /* noop */
          },
          undo: () => {
            this.#refs.journal.removeRow(undoTsForRow);
            this.#store.set({ currentRowTs: null, phase: prevPhase });
          },
          label: 'Запись добавлена',
        });
      } else {
        const tsToUpdate = s.currentRowTs;
        const prevRow = this.#refs.journal
          .getRows()
          .find((r) => r.timestamp === tsToUpdate);
        prevP_liquid = prevRow?.P_liquid_N ?? null;
        this.#refs.journal.updateRow(tsToUpdate, {
          P_liquid_N: P_liquid_rounded,
          context: {
            cylinder_id: String(cyl.id),
            liquid: 'water',
            V_water_ml: s.waterMl,
          },
        });
        this.#store.set({ phase: 'liquid-recorded' });
        undoTsForRow = tsToUpdate;
        const phaseBeforeCommit = prevPhase;
        const prevPL = prevP_liquid;
        this.#undoStack.push({
          id: 'record',
          do: () => {
            /* noop */
          },
          undo: () => {
            this.#refs.journal.updateRow(undoTsForRow, {
              P_liquid_N: prevPL,
            });
            this.#store.set({ phase: phaseBeforeCommit });
          },
          label: 'Запись P жид обновлена',
        });
      }
      this.#announce(
        `P жид = ${P_liquid_rounded.toFixed(2)} Н записано. ` +
          `F_A = P возд − P жид появилась в журнале автоматически.`,
      );
      this.#stateStore.saveImmediate(this.#snapshotPayload());
      this.#showUndoToast({
        message: `Записано: P жид = ${formatRu(P_liquid_rounded, 2)} Н`,
        actionLabel: 'Отменить',
        severity: 'success',
        undoId: 'record',
      });
      return;
    }

    this.#announce('Сейчас нечего записывать. Дождитесь стабилизации показания.');
  }

  /**
   * Вернуть динамометр в комплект (drop на свою же карточку или X-крестик).
   *
   * Каскадно: если на крюке висит цилиндр — сначала detachCylinder() (и тот
   * сам поднимет цилиндр из воды, если он там был). Это соответствует
   * принципу «полная имитация реального мира»: ученик может свернуть всю
   * установку одним жестом. См. §19.11.15 REFERENCE.
   */
  returnDynamometerToKit(): void {
    const s = this.#store.get();
    if (s.dynoRange === null) return;
    if (s.cylinderId !== null) {
      // Cascade: сначала detach цилиндра (внутри он сам сделает lift, если
      // был в воде), потом убираем сам динамометр.
      this.detachCylinder();
    }
    this.#cancelAnim();
    this.#cancelStableTimer();
    const after = this.#store.get();
    this.#store.set({
      dynoRange: null,
      forceN: 0,
      forceTargetN: 0,
      overloaded: false,
      stable: true,
      phase: after.beakerOnScene
        ? (after.waterMl >= 100 ? 'water-poured' : 'beaker-on-scene')
        : 'idle',
      bannerText: null,
      dipOffsetPx: 0,
    });
    this.#announce('Динамометр возвращён в комплект.');
  }

  /**
   * Вернуть стакан в комплект — вода теряется. Каскадно: если внутри
   * плавает цилиндр — сначала поднимаем его (liftCylinderFromWater).
   * Цилиндр остаётся висеть в воздухе на нити динамометра. См. §19.11.15.
   */
  returnBeakerToKit(): void {
    const s = this.#store.get();
    if (!s.beakerOnScene) return;
    if (s.inWater) {
      // Cascade: сначала поднимаем цилиндр из воды (анимация скипается через
      // последующий store.set с beakerOnScene=false — render всё равно перерисует).
      this.liftCylinderFromWater();
    }
    const after = this.#store.get();
    this.#store.set({
      beakerOnScene: false,
      waterMl: 0,
      dosePickerOpen: false,
      partialDip: false,
      bottomTouch: false,
      bannerText: null,
      phase: after.cylinderId !== null
        ? 'cyl-attached'
        : after.dynoRange !== null
          ? 'dyno-on-scene'
          : 'idle',
    });
    this.#announce('Стакан возвращён в комплект — вода вылита.');
  }

  /** Вернуть цилиндр в его карточку (если в воздухе). */
  returnCylinderToKit(id: ArchimedesCylinderId): void {
    const s = this.#store.get();
    if (s.cylinderId !== id) return; // не его карточка
    this.detachCylinder();
  }

  /**
   * Сбросить опыт. Если showUndoToast=true (UI-сценарий) — показывает toast
   * «Опыт сброшен» с action «Отменить» 5с. Если false — программный сброс
   * без UI-побочных эффектов (для тестов 6b, для programmatic API).
   */
  reset(showUndoToast = false): void {
    const previousSnapshot = this.#snapshotPayload();
    const hadAnything =
      previousSnapshot.dynoRange !== null ||
      previousSnapshot.cylinderId !== null ||
      previousSnapshot.beakerOnScene ||
      previousSnapshot.journalRows.length > 0;

    this.#cancelAnim();
    this.#cancelStableTimer();
    this.#store.set({ ...INITIAL_STATE });
    this.#refs.journal.clear();
    // §20.4 — позволить auto-режиму снова фиксировать измерения после reset.
    this.#autoRecordedPhases.clear();
    // §21: drafts/verdicts journal'а — сбрасываем вместе со state.
    this.#journalDrafts.clear();
    this.#journalVerdicts.clear();
    this.#announce('Опыт 1.2 сброшен.');

    // UI-undo: если был не-пустой state и UI-сценарий — даём 5с откатить.
    if (showUndoToast && hadAnything) {
      this.#undoStack.push({
        id: 'reset',
        do: () => {
          /* reset уже выполнен */
        },
        undo: () => {
          this.#applyPayload(previousSnapshot);
        },
        label: 'Опыт сброшен',
      });
      this.#showUndoToast({
        message: 'Опыт сброшен',
        actionLabel: 'Отменить',
        severity: 'info',
        undoId: 'reset',
      });
    }
  }

  getState(): ScenarioPhase {
    return this.#store.get().phase;
  }

  getJournalRows(): ReadonlyArray<JournalRow> {
    return this.#refs.journal.getRows();
  }

  /** Полное состояние оркестратора — для тестов и save/load в 6c. */
  getFullState(): Readonly<State> {
    return this.#store.get();
  }

  getBannerText(): string | null {
    return this.#store.get().bannerText;
  }

  getOverloaded(): boolean {
    return this.#store.get().overloaded;
  }

  getPartialDip(): boolean {
    return this.#store.get().partialDip;
  }

  // ─── Drag handler ─────────────────────────────────────────────────────

  #handleDrop = (detail: EquipmentDropDetail): void => {
    const { eqId, dropzoneId } = detail;
    const s = this.#store.get();

    // ── Динамометр на сцену ──────────────────────────────────────────
    if (eqId === 'dynamometer-1' && dropzoneId === 'ar-stage-dyno') {
      this.placeDynamometer(1);
      return;
    }
    if (eqId === 'dynamometer-2' && dropzoneId === 'ar-stage-dyno') {
      this.placeDynamometer(5);
      return;
    }

    // ── Reverse: динамометр в свою карточку ──────────────────────────
    if ((eqId === 'dynamometer-1' || eqId === 'dynamometer-2') && /^card-dynamometer-/.test(dropzoneId)) {
      const expected = `card-${eqId}`;
      if (dropzoneId !== expected) {
        this.#announce('Положи динамометр в его собственную ячейку комплекта.');
        return;
      }
      this.returnDynamometerToKit();
      return;
    }

    // ── Reverse: стакан в свою карточку ──────────────────────────────
    if (eqId === 'beaker' && dropzoneId === 'card-beaker') {
      this.returnBeakerToKit();
      return;
    }

    // ── Цилиндр на крюк динамометра ──────────────────────────────────
    const cylMatch = /^cyl-(\d+)$/.exec(eqId);
    if (cylMatch) {
      const idNum = Number(cylMatch[1]) as ArchimedesCylinderId;
      // Reverse: цилиндр в свою карточку.
      const cardCyl = /^card-cyl-(\d+)$/.exec(dropzoneId);
      if (cardCyl) {
        if (Number(cardCyl[1]) !== idNum) {
          this.#announce('Положи цилиндр в его собственную ячейку комплекта.');
          return;
        }
        this.returnCylinderToKit(idNum);
        return;
      }
      // На крюк динамометра.
      if (dropzoneId === 'ar-dyno-hook') {
        if (idNum === 1 || idNum === 2 || idNum === 3 || idNum === 4) {
          this.attachCylinderById(idNum);
        }
        return;
      }
      // Цилиндр прямо в стакан — без подвеса. Цилиндр тонет (все плотнее воды),
      // F_A не измерить. Полная имитация реального мира — не блокируем, soft-warning.
      if (dropzoneId === 'ar-beaker') {
        if (s.cylinderId === idNum) {
          // источник = цилиндр на крюке → drop в стакан = погружение
          this.dipCylinderInWater();
          return;
        }
        this.#store.set({
          bannerText:
            'Без динамометра не получится измерить F_A. Подвесьте цилиндр на крюк.',
        });
        this.#announce(
          'Цилиндр упал в стакан без подвеса. F_A не измерить — поднимите его и подвесьте.',
        );
        return;
      }
    }

    // ── Стакан на сцену ─────────────────────────────────────────────
    if (eqId === 'beaker' && dropzoneId === 'ar-stage-beaker') {
      this.placeBeaker();
      return;
    }

    // ── Динамометр-с-цилиндром в стакан → погружение ─────────────────
    if (dropzoneId === 'ar-beaker') {
      if (eqId === 'dynamometer-1' || eqId === 'dynamometer-2') {
        if (s.cylinderId === null) {
          this.#announce('На динамометре нет цилиндра — нечего погружать.');
          return;
        }
        this.dipCylinderInWater();
        return;
      }
    }
  };

  // ─── Card-click ───────────────────────────────────────────────────────

  /** Click по карточке в правой панели — короткий сценарий «click-to-place». */
  #handleCardClick = (ev: Event): void => {
    const card = ev.currentTarget as HTMLElement;
    const eqId = card.getAttribute('data-eq') ?? '';

    if (eqId === 'dynamometer-1') {
      this.placeDynamometer(1);
      return;
    }
    if (eqId === 'dynamometer-2') {
      this.placeDynamometer(5);
      return;
    }
    const cylMatch = /^cyl-(\d+)$/.exec(eqId);
    if (cylMatch) {
      const idNum = Number(cylMatch[1]) as ArchimedesCylinderId;
      if (idNum === 1 || idNum === 2 || idNum === 3 || idNum === 4) {
        this.attachCylinderById(idNum);
      }
      return;
    }
    if (eqId === 'beaker') {
      this.placeBeaker();
      return;
    }
  };

  #handleResetClick = (): void => {
    // UI-кнопка «сбросить» — без confirm-modal, сразу сброс + 5с toast undo.
    // research §3 «Just Undo It» (CHI 2024).
    this.reset(true);
  };

  #handleRecordClick = (): void => {
    this.recordCurrentReading();
  };

  /**
   * Click по X-крестику динамометра — убрать со сцены. Каскадно:
   * если на крюке висит цилиндр (в воздухе или в воде) — `returnDynamometerToKit`
   * сам сделает detachCylinder() (который, в свою очередь, сделает lift).
   * Журнал НЕ очищается. Auto-save сразу.
   */
  #handleDetachDynoClick = (ev: Event): void => {
    ev.stopPropagation();
    this.returnDynamometerToKit();
  };

  /**
   * Click по X-крестику цилиндра — снять с динамометра. Каскадно:
   * если цилиндр сейчас в воде, detachCylinder сначала отменит anim (cancelAnim)
   * и установит inWater=false, чтобы render корректно вернул его в воздух.
   */
  #handleDetachCylClick = (ev: Event): void => {
    ev.stopPropagation();
    this.detachCylinder();
  };

  /**
   * Click по X-крестику стакана — убрать со сцены (вода вылита). Каскадно:
   * если внутри плавает цилиндр — returnBeakerToKit сначала поднимет его
   * через liftCylinderFromWater. Цилиндр остаётся на нити, висеть в воздухе —
   * именно так и происходит в реальной лабораторной работе. Журнал НЕ чистится.
   */
  #handleDetachBeakerClick = (ev: Event): void => {
    ev.stopPropagation();
    this.returnBeakerToKit();
  };

  #handleBeakerTap = (ev: Event): void => {
    const s = this.#store.get();
    if (!s.beakerOnScene) return;
    if (s.inWater) return; // пока цилиндр в воде — объём фиксирован
    ev.stopPropagation();
    this.#store.set({ dosePickerOpen: !s.dosePickerOpen });
  };

  // ─── Direct manipulation цилиндра (click-to-dip + drag-by-thread) ────

  /**
   * Можно ли «опустить» цилиндр сейчас? — нужен подвешенный цилиндр + стакан +
   * вода ≥ 50 мл (иначе физически нечего погружать). Используется и для cursor,
   * и для click-handler.
   */
  #canDip(state: Readonly<State>): boolean {
    return (
      state.cylinderId !== null &&
      state.cylinderId !== 1 && // №1 — overload, не имеет смысла погружать
      state.beakerOnScene &&
      state.waterMl > 0 &&
      !state.inWater
    );
  }

  /** Можно ли «поднять» цилиндр обратно в воздух? — он сейчас в воде. */
  #canLift(state: Readonly<State>): boolean {
    return state.cylinderId !== null && state.inWater;
  }

  /**
   * pointerdown на цилиндре — стартует **continuous** drag-by-thread по Y.
   *
   * Поведение (полная имитация реальности):
   * - В drag.moveListener: каждое движение пересчитывает submersionFraction
   *   из реальной DOM-геометрии (cyl_bottom vs water_surface) и live-обновляет
   *   показание динамометра через `weightInLiquidPartialN`. Цилиндр едет
   *   плавно за пальцем, сила меняется плавно. Никаких скачков.
   * - На pointerup финализируется состояние:
   *   - frac ≥ HYSTERESIS_ENTER (0.95) → inWater=true, phase='cyl-in-water'.
   *   - frac ≤ (1 - HYSTERESIS_ENTER) (0.05) → inWater=false, phase назад.
   *   - В промежуточном диапазоне — оставляем текущий inWater (физически —
   *     цилиндр висит на нити в воде наполовину; ученик может это сделать
   *     и должен видеть честную F_A).
   * - При drag без движения (path B = click) — `drag.didTrigger=false` →
   *   click-handler делает dip/lift как раньше (программный API,
   *   мгновенный full dip).
   *
   * Гистерезис 0.95/0.85 защищает от дрожания флага inWater, когда ученик
   * замер около границы.
   */
  #handleCylinderPointerDown = (ev: PointerEvent): void => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    const s = this.#store.get();
    // Жест активен только когда что-то можно сделать (dip ИЛИ lift).
    if (!this.#canDip(s) && !this.#canLift(s)) return;

    // Отбираем primary-pointer; дальнейшие move/up слушаем на window.
    this.#endVerticalDrag(); // на случай race
    // Адаптивный «целевой» offset для drag — если уже в воде, берём из state;
    // если в воздухе, превентивно считаем сколько должен быть будущий dip
    // (для верхней границы clamp), чтобы цилиндр не уходил ниже beaker_bottom
    // даже во время preview-drag.
    const targetOffsetPx = s.inWater
      ? s.dipOffsetPx || DIP_Y_OFFSET_MAX_PX
      : (() => {
          const { offsetPx } = this.#computeDipOffset();
          return offsetPx > 0 ? offsetPx : DIP_Y_OFFSET_MAX_PX;
        })();
    const startOffset = s.inWater ? s.dipOffsetPx || DIP_Y_OFFSET_MAX_PX : 0;

    // Подготавливаем pure-расчёт силы по frac (живёт всё время drag).
    const cyl = s.cylinderId !== null ? ARCHIMEDES_CYLINDER_BY_ID.get(s.cylinderId) : null;
    const dynoRange: DynamometerRange = s.dynoRange ?? 1;
    const computeForceForFrac = (frac: number): number => {
      if (!cyl) return s.forceN;
      const { F_A_full } = this.#calcDipPhysics(cyl, s.waterMl);
      const P_air = weightInAirN(gToKg(cyl.m_g));
      const target = weightInLiquidPartialN(P_air, F_A_full, frac);
      // Перегрузку клампим в range — точно так же, как в attachCylinderById/dipCyl.
      return target > dynoRange ? dynoRange : target;
    };

    const moveListener = (mv: PointerEvent): void => {
      const drag = this.#verticalDrag;
      if (!drag || mv.pointerId !== drag.pointerId) return;
      mv.preventDefault();
      const dy = mv.clientY - drag.startY;
      // raw = startOffset + dy (тянем вниз → больше offset). Верхняя граница
      // clamp — целевой адаптивный offset, чтобы preview не пробивал дно.
      const next = Math.max(0, Math.min(targetOffsetPx, drag.startOffset + dy));
      drag.offset = next;
      // Помечаем drag активным, как только пересекли порог DRAG_THRESHOLD
      // (чтобы pointerup не вызвал click-fallback). Порог 6px — стандарт.
      if (Math.abs(dy) >= 6) drag.didTrigger = true;
      // Визуальный live-update: ставим preview-transform на dyno и cyl-host
      // напрямую (минуя Store), чтобы не ретриггерить весь render и анимации.
      this.#applyDragPreviewTransform(next);
      // ── CONTINUOUS физика: считаем submersionFraction по реальной геометрии
      //    и обновляем показание динамометра прямо здесь (без Store, чтобы
      //    не плодить save/render каскады). На pointerup финализируем в Store.
      const frac = this.#computeSubmersionFractionFromOffset(next);
      drag.submersionFraction = frac;
      const liveForce = computeForceForFrac(frac);
      drag.liveForce = liveForce;
      this.#applyDragPreviewForce(liveForce);
    };

    const upListener = (up: PointerEvent): void => {
      const drag = this.#verticalDrag;
      if (!drag || up.pointerId !== drag.pointerId) return;
      // Если порог не пересекли — это «click», path B. click-handler сам
      // вызовет dip/lift. Финализацию НЕ делаем (offset вернётся в render
      // через #clearDragPreviewTransform → render с актуальным state).
      if (!drag.didTrigger) {
        this.#clearDragPreviewTransform();
        this.#endVerticalDrag();
        return;
      }
      // Финализация по последнему measured frac.
      this.#finalizeDrag(drag.submersionFraction, drag.offset, drag.liveForce);
      // §19.11.18: помечаем момент завершения drag, чтобы синтетический
      // click от browser'а после pointerup не «откатил» dip/lift через
      // #handleCylinderClick. Guard в click-handler смотрит на этот штамп.
      this.#lastDragFinalizedAt =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.#clearDragPreviewTransform();
      this.#endVerticalDrag();
    };

    this.#verticalDrag = {
      pointerId: ev.pointerId,
      startY: ev.clientY,
      startOffset,
      offset: startOffset,
      didTrigger: false,
      submersionFraction: s.submersionFraction,
      liveForce: s.forceN,
      moveListener,
      upListener,
    };
    window.addEventListener('pointermove', moveListener, { passive: false });
    window.addEventListener('pointerup', upListener);
    window.addEventListener('pointercancel', upListener);
    // Захватываем pointer на cyl-host, чтобы не потерять move во время быстрого drag.
    try {
      this.#refs.cylinderHost.setPointerCapture(ev.pointerId);
    } catch {
      /* happy-dom может не поддерживать */
    }
  };

  /**
   * Финализирует drag-by-thread: применяет последний `frac`/`offset`/`force`
   * к Store с дискретным пересчётом `inWater` через гистерезис 0.95/0.85.
   *
   * - frac ≥ 0.95 + был не в воде → переход в воду (запись `cyl-in-water`).
   * - frac ≤ 0.05 + был в воде → подъём (возврат в `cyl-attached`/`water-poured`).
   * - В промежутке — оставляем текущий inWater, но сохраняем submersionFraction
   *   и dipOffsetPx как «застывшее» состояние. Это «полная имитация реального
   *   мира»: ученик может удерживать цилиндр частично погружённым и видеть
   *   физику на этом уровне.
   *
   * Этот метод НЕ запускает 600ms dip-anim (она для click-finalisation,
   * чтобы дать визуальный шар). Drag уже двигал цилиндр пальцем — анимация
   * избыточна и создавала бы скачок.
   */
  #finalizeDrag(frac: number, offsetPx: number, liveForce: number): void {
    const s = this.#store.get();
    if (s.cylinderId === null) return;
    const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(s.cylinderId);
    if (!cyl) return;
    // §19.11.16 UX-snap: drag bo проблема UX'а — пользователь оставляет
    // цилиндр в frac=0.85 (визуально в воде, но < HYSTERESIS_ENTER=0.95) →
    // inWater=false → phase=water-poured → label «Записать P возд» вместо
    // «P жид» → ученик «не может записать». Решение: явное намерение —
    //   frac ≥ 0.50 → довести до полного dip (как будто click)
    //   frac < 0.50 → вернуть в air (как будто отпустил)
    // Это убирает «застрявшие» промежуточные состояния.
    void offsetPx;
    void liveForce;
    if (!s.inWater && frac >= 0.5) {
      this.dipCylinderInWater();
      return;
    }
    if (s.inWater && frac < 0.5) {
      this.liftCylinderFromWater();
      return;
    }
    if (!s.inWater && frac < 0.5) {
      // air → air, сбросить только preview-transform
      this.#store.set({
        submersionFraction: 0,
        dipOffsetPx: 0,
        forceN: weightInAirN(gToKg(cyl.m_g)),
        forceTargetN: weightInAirN(gToKg(cyl.m_g)),
        stable: true,
        partialDip: false,
      });
      return;
    }
    // Иначе (in-water → in-water near full) — оставляем как есть, full dip
    if (s.inWater && frac >= 0.5) {
      this.dipCylinderInWater();
      return;
    }

    const { F_A_full, partial, bottom } = this.#calcDipPhysics(cyl, s.waterMl);
    const P_air = weightInAirN(gToKg(cyl.m_g));
    const target = weightInLiquidPartialN(P_air, F_A_full, frac);
    const range = s.dynoRange ?? 1;
    const overloaded = target > range;
    const displayed = overloaded ? range : target;

    // Гистерезис 0.95/0.85: переход в воду при frac ≥ 0.95, выход при ≤ 0.85.
    // В промежуточном диапазоне (0.85..0.95) inWater сохраняется — защита
    // от дрожания флага около границы (см. §19.13 REFERENCE).
    let inWater = s.inWater;
    if (!s.inWater && frac >= HYSTERESIS_ENTER) inWater = true;
    else if (s.inWater && frac <= HYSTERESIS_EXIT) inWater = false;

    // phase: финализируем по новому inWater.
    let newPhase: ScenarioPhase = s.phase;
    if (inWater && !s.inWater) newPhase = 'cyl-in-water';
    else if (!inWater && s.inWater) {
      // Та же логика, что и в liftCylinderFromWater: при выходе из воды
      // фаза должна отражать реальное состояние сцены (стакан/вода).
      newPhase =
        s.phase === 'liquid-recorded'
          ? 'liquid-recorded'
          : s.beakerOnScene && s.waterMl > 0
            ? 'water-poured'
            : s.beakerOnScene
              ? 'beaker-on-scene'
              : 'cyl-attached';
    }

    // Banner — приоритет геометрии стакана > физики.
    const partialDipFlag = partial || (frac > 0 && frac < HYSTERESIS_ENTER);
    let banner: string | null = null;
    if (partial && inWater) {
      banner = 'Воды слишком мало — цилиндр не погружён полностью. F_A искажена.';
    } else if (partialDipFlag && frac > 0 && frac < HYSTERESIS_ENTER && inWater === false) {
      // Цилиндр в промежутке — подсказка не критична, но честная:
      banner = 'Цилиндр погружён частично — F_A пропорциональна объёму под водой.';
    } else if (overloaded) {
      banner = `Перегрузка! Возьмите динамометр ${range === 1 ? '5' : '1'} Н.`;
    }

    this.#cancelAnim();
    this.#cancelStableTimer();
    this.#store.set({
      inWater,
      submersionFraction: frac,
      forceTargetN: target,
      forceN: displayed,
      overloaded,
      partialDip: partialDipFlag && inWater,
      bottomTouch: bottom && inWater,
      stable: true, // drag завершён, шум стабилизации не нужен
      phase: newPhase,
      bannerText: banner,
      dipOffsetPx: inWater || frac > 0 ? offsetPx : 0,
    });
    // На «приземление» в воду — короткий announce.
    if (inWater && !s.inWater) {
      this.#announce(
        partial
          ? `Цилиндр №${cyl.id} погружён частично (мало воды). F_A < теоретической.`
          : `Цилиндр №${cyl.id} погружён в воду. Динамометр показывает вес в воде.`,
      );
    } else if (!inWater && s.inWater) {
      this.#announce(`Цилиндр №${cyl.id} поднят в воздух.`);
    }
    // Для liveForce подавляем подсказку линтера: значение уже учтено в `displayed`,
    // но передаём наружу как явный signal что drag фактически закончился на нём.
    void liveForce;
  }

  /**
   * Live-обновление показания динамометра во время drag — без Store.
   * Напрямую меняет `force` атрибут на live-инстансе lab-dynamometer (компонент
   * сам переотобразит шкалу). Это нужно, чтобы:
   *   1) шкала и LCD двигались синхронно с пальцем (60 fps),
   *   2) не дёргался autosave/subscribe-каскад на каждом move-событии.
   * После pointerup — render с актуальным Store перепишет force штатно.
   */
  #applyDragPreviewForce(forceN: number): void {
    const dyno = this.#dynoEl;
    if (!dyno) return;
    dyno.setAttribute('force', forceN.toFixed(3));
  }

  /**
   * click на цилиндре — fallback path B (без drag). Если можем dip — dip,
   * можем lift — lift. Используется и для тач-тапа без движения, и для
   * keyboard.
   */
  #handleCylinderClick = (ev: Event): void => {
    // Если только что был полноценный drag — не дублируем dip/lift.
    if (this.#verticalDrag?.didTrigger) {
      ev.stopPropagation();
      return;
    }
    // §19.11.18: к моменту click-event drag уже завершён (this.#verticalDrag
    // = null после endVerticalDrag в upListener). Browser синтезирует click
    // после pointerup на том же элементе. Без guard'а ниже dip-from-drag
    // моментально откатывался lift'ом из click-handler. 250 ms — типичный
    // запас между pointerup и synthetic click; настоящий «отдельный» клик
    // ученика придёт сильно позже.
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.#lastDragFinalizedAt < 250) {
      ev.stopPropagation();
      return;
    }
    const s = this.#store.get();
    if (this.#canDip(s)) {
      this.dipCylinderInWater();
    } else if (this.#canLift(s)) {
      this.liftCylinderFromWater();
    }
  };

  /**
   * Keyboard-альтернатива: Enter / Space на сфокусированном цилиндре —
   * dip/lift. ↓ — dip, ↑ — lift (для пользователей со screen-reader'ами и
   * клавиатурным доступом).
   */
  #handleCylinderKey = (ev: KeyboardEvent): void => {
    const s = this.#store.get();
    if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
      if (this.#canDip(s)) {
        ev.preventDefault();
        this.dipCylinderInWater();
      }
    } else if (ev.key === 'ArrowUp') {
      if (this.#canLift(s)) {
        ev.preventDefault();
        this.liftCylinderFromWater();
      }
    }
  };

  /**
   * Глобальный keyboard-shortcut Space/Enter для большого CTA «Записать».
   * Срабатывает только когда CTA видна, не disabled, и фокус НЕ внутри
   * редактируемого input/textarea (журнал имеет inputs для пользовательских
   * вычислений).
   */
  #handleGlobalKey = (ev: KeyboardEvent): void => {
    if (ev.key !== ' ' && ev.key !== 'Enter') return;
    if (ev.repeat) return;
    const target = ev.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (target.isContentEditable) return;
    }
    const btn = this.#refs.recordBtn;
    if (btn.hidden || btn.disabled) return;
    ev.preventDefault();
    btn.click();
  };

  #endVerticalDrag(): void {
    const drag = this.#verticalDrag;
    if (!drag) return;
    window.removeEventListener('pointermove', drag.moveListener);
    window.removeEventListener('pointerup', drag.upListener);
    window.removeEventListener('pointercancel', drag.upListener);
    try {
      this.#refs.cylinderHost.releasePointerCapture(drag.pointerId);
    } catch {
      /* noop */
    }
    this.#verticalDrag = null;
  }

  /** Live preview во время drag — двигаем dyno-host и cylinder-host transform'ом. */
  #applyDragPreviewTransform(offsetPx: number): void {
    // dyno-host: `translate(-50%, ${offset}px)` (X-центрирование сохраняем).
    this.#refs.dynoHost.style.transform = `translate(-50%, ${offsetPx}px)`;
    // cylinder-host: `top` сейчас — base; добавим transform Y, оставим X-центр.
    this.#refs.cylinderHost.style.transform = `translate(-50%, ${offsetPx}px)`;
    // Отключаем transition на время drag, чтобы движение «прилипало» к пальцу.
    this.#refs.dynoHost.style.transition = 'none';
    this.#refs.cylinderHost.style.transition = 'none';
    // Floating detach-cyl — синхронно за цилиндром, тоже без transition.
    const btn = this.#refs.detachCylBtn;
    if (!btn.hidden) {
      btn.style.transition = 'none';
      const t = `translateY(${offsetPx}px)`;
      btn.style.setProperty('--cyl-detach-transform', t);
      btn.style.transform = t;
    }
    // Перерисуем нить overlay, чтобы она тянулась за цилиндром.
    this.#renderSceneOverlay(this.#store.get());
  }

  /** Сброс preview-transform после drag — render восстановит штатные значения. */
  #clearDragPreviewTransform(): void {
    // Не сбрасываем transform напрямую — следующий render() заберёт корректные
    // значения по состоянию (inWater → state.dipOffsetPx или 0). Но восстановим
    // transition, отключённый на время drag.
    this.#refs.dynoHost.style.transition = '';
    this.#refs.cylinderHost.style.transition = '';
    this.#refs.detachCylBtn.style.transition = '';
    // Вызываем render для актуализации.
    this.#render(this.#store.get());
  }

  #handleDoseClick = (ev: Event): void => {
    const btn = ev.currentTarget as HTMLButtonElement;
    const dose = Number(btn.getAttribute('data-dose'));
    if (Number.isFinite(dose) && dose > 0) {
      this.pourWater(dose);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Переводит ArchimedesCylinderId → CylinderId журнала ('No2'|'No3'|'No4').
   * Для №1 возвращает null — он не учитывается в журнале (перегрузка по ФИПИ).
   */
  #cylJournalId(id: ArchimedesCylinderId): JournalCylinderId | null {
    if (id === 2) return 'No2';
    if (id === 3) return 'No3';
    if (id === 4) return 'No4';
    return null;
  }

  /**
   * Расчёт физики при ПОЛНОМ погружении (submersionFraction=1).
   * Возвращает F_A_full (Архимедова сила при V_displaced=V_cyl), а также флаги
   * partial/bottom/low для случая «воды слишком мало для полного погружения».
   *
   * `partial=true` ↔ воды меньше, чем нужно, чтобы цилиндр оказался под водой
   * целиком даже при максимальном dip. Для непрерывного drag используется
   * `weightInLiquidPartialN(P_air, F_A_full, frac)` где frac < 1 — частичное
   * погружение по геометрии (drag не довёл цилиндр до конца). См. §19.13.
   *
   * «Касание дна» — упрощённая модель: если воды меньше 50 мл, считаем что
   * цилиндр стоит на дне (нить провисает), F_A искажена.
   */
  #calcDipPhysics(
    cyl: ArchimedesCylinderSpec,
    waterMl: number,
  ): { F_A_full: number; partial: boolean; bottom: boolean; low: boolean } {
    const V_cyl = cyl.V_cm3;
    const V_water = waterMl;
    const low = V_water > 0 && V_water <= LOW_WATER_THRESHOLD_ML;
    // bottom = цилиндр стоит на дне (упрощённо: воды слишком мало). В реальном
    // оборудовании это происходит когда V_water мал и нить недостаточно длинна.
    // У нас нет физики нити — используем эвристику: V_water < V_cyl → дно.
    const bottom = low || (V_water > 0 && V_water < V_cyl);
    // Частичное погружение из-за нехватки воды: вытесненный объём ограничен
    // V_water. Это отдельно от частичного погружения по геометрии (drag).
    const partial = V_water > 0 && V_water < V_cyl;
    const V_displaced_cm3 = Math.min(V_water, V_cyl);
    const F_A_full = archimedesForceN(RHO_WATER, cm3ToM3(V_displaced_cm3));
    return { F_A_full, partial, bottom, low };
  }

  /**
   * Вычисляет долю объёма цилиндра под водой (∈ [0..1]) по реальным
   * DOM-координатам — учитывая текущий offsetPx (transform) цилиндра.
   *
   * Алгоритм (вариант (a) из ТЗ — полностью честная геометрия через
   * getBoundingClientRect):
   *
   *   cyl_bottom_y = lab-metal-weight.getBottomY() + offsetPx
   *   water_top_y  = lab-beaker.getWaterSurfaceY()
   *   depth_below_water = max(0, cyl_bottom_y − water_top_y)
   *   effective_depth   = min(depth_below_water, water_column_height_px)
   *   submersionFraction = clamp(0..1, effective_depth / cyl_height_px)
   *
   * `effective_depth` ограничивается высотой столба воды — это даёт
   * правильное поведение для цилиндра №3 (длинного) в стакане с малым
   * столбом воды: даже когда цилиндр касается дна, frac = water_column/cyl_h
   * < 1, F_A < теоретической. Это и есть edge case «Стакан мелкий —
   * F_A искажена» (см. §19.13).
   *
   * Если DOM ещё не готов (тесты, SSR, прибор не на сцене) — возвращает 0.
   */
  #computeSubmersionFractionFromOffset(offsetPx: number): number {
    if (typeof window === 'undefined') return 0;
    const cyl = this.#cylinderEl as
      | (HTMLElement & {
          getBottomY?: () => number;
          getBodyHeightPx?: () => number;
        })
      | null;
    const beaker = this.#beakerEl as
      | (HTMLElement & {
          getWaterSurfaceY?: () => number;
          getWaterColumnHeightPx?: () => number;
        })
      | null;
    if (!cyl || !beaker) return 0;
    if (
      typeof cyl.getBottomY !== 'function' ||
      typeof cyl.getBodyHeightPx !== 'function' ||
      typeof beaker.getWaterSurfaceY !== 'function' ||
      typeof beaker.getWaterColumnHeightPx !== 'function'
    ) {
      return 0;
    }
    // §19.11.16: двойной учёт offsetPx убран. `getBoundingClientRect` (через
    // `getBottomY`) уже включает CSS transform родителя cyl-host (которому
    // только что применили `applyDragPreviewTransform(offsetPx)`). Старая
    // формула `cyl.getBottomY() + offsetPx` давала frac в 2× больше реального
    // → ENTER hysteresis срабатывал слишком рано / клампился к 1.
    void offsetPx; // параметр сохранён для backward-compat сигнатуры
    const cylBottomY = cyl.getBottomY();
    const waterTopY = beaker.getWaterSurfaceY();
    const cylHeightPx = cyl.getBodyHeightPx();
    if (cylHeightPx <= 0) return 0;
    const depthBelowWater = Math.max(0, cylBottomY - waterTopY);
    const waterColumnPx = beaker.getWaterColumnHeightPx();
    const effectiveDepth = Math.min(depthBelowWater, waterColumnPx);
    const frac = effectiveDepth / cylHeightPx;
    return Math.max(0, Math.min(1, frac));
  }

  /**
   * Адаптивно вычисляет Y-смещение dyno+цилиндра при погружении из реальных
   * DOM-координат на текущем viewport. Гарантирует:
   *   inv1: cyl_top > water_top + DIP_SAFETY_TOP_PX  — цилиндр под водой;
   *   inv2: cyl_bot < beaker_bot − DIP_SAFETY_BOT_PX — не касается дна.
   *
   * Если стакан настолько мелкий или воды настолько мало, что обе инварианты
   * одновременно невыполнимы — возвращаем максимально допустимый offset (зазор
   * до дна важнее: лучше торчащий из воды цилиндр, чем «пробитое дно») и
   * `partialDip=true`, чтобы render показал банер «не помещается».
   *
   * **Компенсация force-aware baseTop**: cylinderHost.top зависит от
   * `dyno.getWeightHookY()` (живая позиция нижнего крюка дин-ра). При
   * погружении force упадёт с P_возд до P_жид → крюк поднимется на
   * Δ = hook(P_возд) - hook(P_жид) → baseTop уменьшится на Δ. Если не
   * компенсировать — цилиндр окажется выше воды на ту же Δ. Параметр
   * `targetForceN` позволяет это предсказать через `predictWeightHookY`
   * и добавить Δ к offset. Если параметр не передан — компенсация = 0
   * (используется в ResizeObserver, где dyno и cyl уже находятся в
   * погружённом состоянии и пересчёт Δ не нужен). См. §19.11.14.
   *
   * При недоступном DOM (jsdom без layout, SSR, до первого render) — возвращает
   * 0 (партиально=false): значит цилиндр останется в воздухе, что безопаснее
   * рассинхронизированной анимации.
   *
   * См. §19.11.14 REFERENCE «Адаптивный DIP — getBoundingClientRect, не
   * хардкод».
   */
  #computeDipOffset(targetForceN?: number): { offsetPx: number; partialDip: boolean } {
    if (typeof window === 'undefined') return { offsetPx: 0, partialDip: false };
    const cylHost = this.#refs.cylinderHost;
    const beakerHost = this.#refs.beakerHost;
    const beakerEl = this.#beakerEl;
    if (!cylHost || !beakerHost || !beakerEl) {
      return { offsetPx: 0, partialDip: false };
    }
    const cylRect = cylHost.getBoundingClientRect();
    const beakerRect = beakerHost.getBoundingClientRect();
    if (cylRect.height === 0 || beakerRect.height === 0) {
      // Layout ещё не готов (тесты, SSR) — fallback на безопасное значение.
      return { offsetPx: 0, partialDip: false };
    }

    // Берём координаты воды НАПРЯМУЮ из beaker SVG: viewBox 96×130, y задан
    // в SVG-юнитах как атрибут #bk-water 'y'. Перевод в DOM через scaleY.
    let waterTopDom = beakerRect.top + beakerRect.height; // дефолт: уровень воды = дно
    const sr = (beakerEl as HTMLElement).shadowRoot;
    const waterRect = sr?.getElementById('bk-water') as SVGRectElement | null;
    if (waterRect) {
      const yAttr = parseFloat(waterRect.getAttribute('y') ?? '116');
      const scaleY = beakerRect.height / 130; // viewBox высота
      waterTopDom = beakerRect.top + yAttr * scaleY;
    }

    // Текущий applied translateY у cylinderHost — нужно учесть, чтобы
    // baseline cyl_top без offset был стабилен независимо от того, в каком
    // состоянии вызвали функцию (air → 0, in-water → currentDipOffsetPx).
    const currentDy = this.#getCurrentCylDy();
    const baseCylTop = cylRect.top - currentDy;
    // §19.11.16: clamp по **body height** (без тени и крюка сверху). Тень
    // снизу выходит за тело и не должна ограничивать погружение, иначе
    // partialDip срабатывает ложно (тело уже под водой, но host больше
    // beaker_bottom-12). cylRect.height = host_h (включая тень+крюк),
    // body_h = host_h × (78/110) ≈ 0.71 × host_h (см. lab-metal-weight
    // viewBox 64×110, body 22..100 → body_h_svg=78).
    const bodyHeight = cylRect.height * (78 / 110);
    const bodyTopOffset = cylRect.height * (22 / 110); // тело начинается на 22 SVG-юнитов от host top

    // §19.11.16: dyHookCompensation удалена. После предыдущей правки
    // `lab-dynamometer.#hookCy()` всегда клампится к BODY_BOTTOM+8 → крюк
    // фиксирован y_svg=201 для любой forceN ∈ [0, range]. То есть
    // `predictWeightHookY(F1) ≡ predictWeightHookY(F2)` ⇒ `dyHookCompensation ≡ 0`.
    // Параметр `targetForceN` сохранён в сигнатуре для backward-compat,
    // но больше не используется. См. план §19.11.16 Section C.
    void targetForceN;

    // Желаемый cyl_top (host) — body_top на DIP_SAFETY_TOP_PX ниже воды.
    const desiredBodyTop = waterTopDom + DIP_SAFETY_TOP_PX;
    const desiredCylTop = desiredBodyTop - bodyTopOffset;
    let offset = desiredCylTop - baseCylTop;

    // Clamp по body bottom: body не пробьёт ли дно (с зазором).
    const bodyBottomOffset = bodyTopOffset + bodyHeight;
    const finalCylTop = baseCylTop + offset;
    const finalBodyBottom = finalCylTop + bodyBottomOffset;
    const maxAllowedBot = beakerRect.bottom - DIP_SAFETY_BOT_PX;
    let partialDip = false;
    if (finalBodyBottom > maxAllowedBot) {
      offset = maxAllowedBot - bodyBottomOffset - baseCylTop;
      partialDip = true;
    }

    // Нижняя граница — не «отрицательный» offset (дёргать цилиндр вверх
    // во время dip — нонсенс). Верхней границы нет: уже есть клампинг к
    // beakerRect.bottom − DIP_SAFETY_BOT_PX выше, который физически
    // защищает от пробития дна. На больших viewport'ах (1920×1080)
    // правильный offset может быть >> DIP_Y_OFFSET_MAX_PX (для 1440 это
    // было 312, для 1920 — около 500+). Если ограничивать сверху —
    // цилиндр зависнет над водой как в ранней версии.
    offset = Math.max(0, offset);
    return { offsetPx: offset, partialDip };
  }

  /**
   * Базовая Y-координата cylinderHost в координатах stage'а (px) — **синхронно
   * с актуальным положением нижнего крюка дин-ра**: top = dyno_top_air +
   * dyno.getWeightHookY() + THREAD_LEN_PX. Когда пружина дин-ра растягивается
   * под нагрузкой — крюк опускается → baseTop тоже опускается → цилиндр едет
   * вместе с крюком (как и в реальности — нить фиксированной длины).
   *
   * Тонкость с погружением: при `dipCylinderInWater` force падает (P → P-F_A),
   * крюк визуально поднимется → baseTop уменьшится. Чтобы цилиндр всё-таки
   * остался под водой, `#computeDipOffset` использует `predictWeightHookY(target)`
   * и **компенсирует** ожидаемое поднятие крюка прямо в dipOffsetPx (см. там).
   *
   * THREAD_LEN_PX (22) — визуальный зазор между нижним крюком динамометра
   * и верхним крюком цилиндра, занятый нитью lab-thread (см. эталон
   * slide08_img23.png — ~½ высоты груза). Сама нить рисуется в SVG-overlay
   * по **реальным** точкам hooks, не из THREAD_LEN, но геометрический отступ
   * обязателен — иначе цилиндр касается крюка вплотную.
   *
   * Fallback (нет dyno на сцене, тест без layout, SSR) считается **аналитически**
   * из CSS-констант: `.ar-mount--dyno { top: 12px }` + resting hookY ≈ 72 SVG-юнита
   * × hostHeight/SVG_HEIGHT (250) → 72 px при 1:1 + THREAD_LEN_PX = 12 + 72 + 22 = 106 px.
   * См. §19.11.14 REFERENCE «Адаптивный DIP — getBoundingClientRect».
   */
  #computeCylinderBaseTop(): number {
    /** dyno-host CSS top: 12 + resting hook svgY 201 (host=220) + thread 18.
     *  При новой геометрии 76×220, BODY_H=165: hookCy_svg = 201 → host_y = 201
     *  (host_h=220 совпадает с SVG_HEIGHT). См. §19.11.16 REFERENCE. */
    const FALLBACK = 231;
    const THREAD_LEN_PX = 18;
    if (typeof window === 'undefined') return FALLBACK;
    const dynoHost = this.#refs.dynoHost;
    const dyno = this.#dynoEl as
      | (HTMLElement & { getWeightHookY?: () => number })
      | null;
    const stage = this.#refs.stage;
    if (!dynoHost || !dyno || !stage) return FALLBACK;
    const dynoRect = dynoHost.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    if (dynoRect.height === 0 || stageRect.height === 0) return FALLBACK;
    const hookYInDyno =
      typeof dyno.getWeightHookY === 'function' ? dyno.getWeightHookY() : 201;
    // §19.11.16: dynoTopAir теперь читается через `offsetTop` (CSS top
    // относительно позиционированного предка = stage). offsetTop НЕ включает
    // transform → стабилен и не подвержен race с только что выставленным
    // `style.transform`. Раньше `dynoRect.top - stage.top - dynoDy` мог
    // дать −87 px, если getBoundingClientRect возвращала позицию **до**
    // commitedного transform, а парсинг `dynoDy` уже видел новое значение.
    const dynoTopAir = (dynoHost as HTMLElement).offsetTop;
    return dynoTopAir + hookYInDyno + THREAD_LEN_PX;
  }

  /**
   * Читает текущий applied translateY у cylinderHost. Парсит inline style,
   * чтобы не зависеть от getComputedStyle (jsdom может вернуть 'none').
   */
  #getCurrentCylDy(): number {
    const t = this.#refs.cylinderHost.style.transform;
    if (!t) return 0;
    // Формат: "translate(-50%, NNN.NNpx)" либо "translate(-50%, 0px)".
    const m = /translate\([^,]*,\s*(-?\d+(?:\.\d+)?)px\)/.exec(t);
    return m ? parseFloat(m[1]!) : 0;
  }

  /**
   * Пересчитать force на основе текущего state — если что-то изменилось пока
   * цилиндр уже под водой (например, налили ещё воды).
   *
   * Force считаем через `weightInLiquidPartialN(P_air, F_A_full, frac)`,
   * где frac = state.submersionFraction. F_A_full уже учитывает «мало воды»
   * (V_displaced = min(V_water, V_cyl) внутри #calcDipPhysics).
   */
  #recomputeForceForState(s: Readonly<State>): void {
    if (s.cylinderId === null || !s.inWater) return;
    const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(s.cylinderId);
    if (!cyl) return;
    const { F_A_full, partial, bottom } = this.#calcDipPhysics(cyl, s.waterMl);
    const P_air = weightInAirN(gToKg(cyl.m_g));
    const target = weightInLiquidPartialN(P_air, F_A_full, s.submersionFraction);
    const range = s.dynoRange ?? 1;
    const overloaded = target > range;
    const displayed = overloaded ? range : target;
    this.#store.set({
      forceTargetN: target,
      forceN: displayed,
      overloaded,
      partialDip: partial,
      bottomTouch: bottom,
      stable: true,
    });
  }

  // ─── HintEngine handlers ─────────────────────────────────────────────

  /** Текстовая подсказка при inactivity / failed-drops → выводим в hint-bar. */
  #handleEngineHint = (hint: HintPayload): void => {
    // Не перетираем фазовую подсказку — добавляем в тот же элемент. Текст
    // мягкий, контекстный. Severity влияет только на цвет (CSS-класс).
    const el = this.#refs.hint;
    el.textContent = hint.text;
    el.classList.toggle('hint--warning', hint.severity === 'warning');
  };

  /** Подсветка карточки золотым pulse — рекомендуемый next-step. */
  #handleAmbientPulse = (cardId: string | null): void => {
    for (const card of this.#refs.equipmentCards) {
      const eqId = card.getAttribute('data-eq') ?? '';
      card.classList.toggle('pulse-recommended', eqId === cardId);
    }
  };

  // ─── Undo-toast ──────────────────────────────────────────────────────

  /**
   * Создаёт `<lab-toast>` в document.body, привязывает action-clicked → undo
   * через UndoStack. Один tost-id даёт ровно один live-инстанс — если уже
   * есть — старый dismiss('manual'), чтобы не накапливать.
   *
   * NB: lab-toast использует document.body как root — `position: fixed` от
   * любой сцены не зависит. Контракт от 6b.
   */
  #showUndoToast(opts: {
    message: string;
    actionLabel: string;
    severity: 'info' | 'success' | 'warning' | 'error';
    undoId: string;
    durationMs?: number;
  }): LabToast | null {
    if (typeof document === 'undefined') return null;
    // Один тост на id одновременно.
    const prev = this.#activeToasts.get(opts.undoId);
    if (prev) {
      try {
        prev.dismiss('manual');
      } catch {
        /* noop */
      }
      this.#activeToasts.delete(opts.undoId);
    }

    const toast = document.createElement('lab-toast') as LabToast;
    toast.setAttribute('message', opts.message);
    toast.setAttribute('action-label', opts.actionLabel);
    toast.setAttribute('severity', opts.severity);
    toast.setAttribute('duration', String(opts.durationMs ?? 5000));
    toast.dataset['undoId'] = opts.undoId;

    const onAction = (): void => {
      // Откатываем только если top — наш id (защита от race).
      const top = this.#undoStack.peek(opts.undoId);
      if (top) this.#undoStack.undo();
      // Контракт 6b: оркестратор сам зовёт dismiss('action') после undo.
      try {
        toast.dismiss('action');
      } catch {
        /* noop */
      }
    };
    const onDismissed = (): void => {
      this.#activeToasts.delete(opts.undoId);
      toast.removeEventListener('action-clicked', onAction);
      toast.removeEventListener('dismissed', onDismissed);
    };
    toast.addEventListener('action-clicked', onAction);
    toast.addEventListener('dismissed', onDismissed);

    document.body.appendChild(toast);
    // show() работает только когда тост уже в DOM (constructor может выкинуть
    // в attributeChangedCallback до connectedCallback из-за happy-dom).
    toast.show();
    this.#activeToasts.set(opts.undoId, toast);
    return toast;
  }

  // ─── Snapshot / restore (auto-save) ─────────────────────────────────

  #snapshotPayload(): PersistedPayload {
    const s = this.#store.get();
    const journalRows = this.#refs.journal.getRows().map((r) => {
      const { timestamp: _ts, ...rest } = r;
      void _ts;
      return rest;
    });
    return {
      phase: s.phase,
      dynoRange: s.dynoRange,
      cylinderId: s.cylinderId,
      beakerOnScene: s.beakerOnScene,
      waterMl: s.waterMl,
      inWater: s.inWater,
      submersionFraction: s.submersionFraction,
      forceTargetN: s.forceTargetN,
      overloaded: s.overloaded,
      partialDip: s.partialDip,
      bottomTouch: s.bottomTouch,
      bannerText: s.bannerText,
      completedCylinders: s.completedCylinders,
      journalRows,
    };
  }

  /** Полное восстановление UI из payload — без повторного сохранения. */
  #applyPayload(p: PersistedPayload): void {
    this.#isRestoring = true;
    try {
      this.#cancelAnim();
      this.#cancelStableTimer();
      this.#refs.journal.clear();
      let lastTs: number | null = null;
      for (const row of p.journalRows) {
        lastTs = this.#refs.journal.addRow(row);
      }
      // Совместимость со старыми snapshot-ами без submersionFraction:
      // при отсутствии поля считаем 1 если inWater=true, иначе 0.
      const submersionFraction =
        typeof p.submersionFraction === 'number'
          ? p.submersionFraction
          : p.inWater
            ? 1
            : 0;
      this.#store.set({
        phase: p.phase,
        dynoRange: p.dynoRange,
        cylinderId: p.cylinderId,
        beakerOnScene: p.beakerOnScene,
        waterMl: p.waterMl,
        inWater: p.inWater,
        submersionFraction,
        forceN: p.forceTargetN,
        forceTargetN: p.forceTargetN,
        overloaded: p.overloaded,
        partialDip: p.partialDip,
        bottomTouch: p.bottomTouch,
        bannerText: p.bannerText,
        completedCylinders: p.completedCylinders,
        currentRowTs: lastTs,
        stable: true,
        dosePickerOpen: false,
        // dipOffsetPx из payload не восстанавливаем — он зависит от viewport,
        // на котором ученик открыл сейчас (не от того, на котором сохранил).
        // Если inWater=true — на следующем кадре (когда DOM готов) пересчитаем.
        dipOffsetPx: 0,
      });
      if (p.inWater) {
        // RAF гарантирует, что render успел поставить cylinderHost / beakerHost
        // и getBoundingClientRect отработает корректно. Если RAF недоступен
        // (тест-среда happy-dom без RAF) — вызовем синхронно, тоже работает.
        const reflow = (): void => {
          const { offsetPx } = this.#computeDipOffset();
          if (offsetPx > 0) this.#store.set({ dipOffsetPx: offsetPx });
        };
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(reflow);
        } else {
          reflow();
        }
      }
    } finally {
      this.#isRestoring = false;
    }
    // После restore — один immediate save, чтобы новый snapshot ушёл.
    this.#stateStore.saveImmediate(this.#snapshotPayload());
  }

  /** Чтение state из localStorage при mount. Если есть — показываем restore-toast. */
  #tryRestoreFromStorage(): void {
    const loaded = this.#stateStore.load();
    if (!loaded) return;
    // Пустые / стартовые snapshot'ы не реставрируем — нечего восстанавливать.
    const isEmpty =
      loaded.payload.phase === 'idle' &&
      loaded.payload.dynoRange === null &&
      loaded.payload.cylinderId === null &&
      !loaded.payload.beakerOnScene &&
      loaded.payload.journalRows.length === 0;
    if (isEmpty) return;
    this.#applyPayload(loaded.payload);
    const t = new Date(loaded.savedAt);
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    this.#showUndoToast({
      message: `Восстановлено состояние от ${hh}:${mm}`,
      actionLabel: 'Сбросить',
      severity: 'info',
      undoId: 'restore',
      durationMs: 8000,
    });
    // restore: action = «сбросить», т.е. polled clear (без сохранения нового
    // snapshot'a в цикл — поэтому используем reset() без UI-toast).
    this.#undoStack.push({
      id: 'restore',
      do: () => {
        /* noop */
      },
      undo: () => {
        this.reset(false);
        this.#stateStore.clear();
      },
      label: 'Восстановлено',
    });
  }

  /** Программный API для тестов — прочитать snapshot не дожидаясь throttle. */
  flushAutoSave(): void {
    this.#stateStore.flush();
  }
  /** Экспорт engine'а — для тестов и dev-debug. */
  getHintEngine(): HintEngine {
    return this.#hintEngine;
  }
  getStateStore(): StateStore<PersistedPayload> {
    return this.#stateStore;
  }
  getUndoStack(): UndoStack {
    return this.#undoStack;
  }

  // ─── Анимации ─────────────────────────────────────────────────────────

  #cancelAnim(): void {
    if (this.#animRafId !== null) {
      cancelAnimationFrame(this.#animRafId);
      this.#animRafId = null;
    }
  }
  #cancelStableTimer(): void {
    if (this.#stableTid !== null) {
      clearTimeout(this.#stableTid);
      this.#stableTid = null;
    }
  }

  /**
   * Стартует шумовую стабилизацию: текущая force начинает с целевого ± 0.04Н
   * шума, затухает за NOISE_SETTLE_MS (1500мс). После — stable=true.
   * Если prefers-reduced-motion ИЛИ test-env (happy-dom) — мгновенно stable.
   */
  #startNoiseSettle(targetN: number): void {
    if (shouldSkipAnimation()) {
      this.#store.set({ forceN: targetN, stable: true });
      return;
    }
    const start = Date.now();
    const animate = (): void => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / NOISE_SETTLE_MS);
      // Затухающая косинусоида + случайный jitter
      const amp = (1 - t) * 0.04;
      const jitter = (Math.random() * 2 - 1) * amp;
      const value = targetN + jitter;
      this.#store.set({ forceN: value });
      if (t < 1) {
        this.#animRafId = requestAnimationFrame(animate);
      } else {
        this.#animRafId = null;
        this.#store.set({ forceN: targetN, stable: true });
      }
    };
    this.#animRafId = requestAnimationFrame(animate);
  }


  // ─── Render ───────────────────────────────────────────────────────────

  #render(state: State): void {
    this.#renderDynamometer(state);
    this.#renderCylinder(state);
    this.#renderBeaker(state);
    this.#renderClamp(state);
    this.#renderRecordBtn(state);
    this.#renderDosePicker(state);
    this.#renderHint(state);
    this.#renderSteps(state);
    this.#renderEquipmentCards(state);
    this.#renderBanner(state);
    this.#renderSceneOverlay(state);
    this.#renderSharedJournal();
  }

  /**
   * §21 — рендерит shared journal-table с ARCHIMEDES_SPEC рядом с
   * lab-journal (data-store). lab-journal продолжает хранить rows и
   * экспортировать CSV/PDF, но визуально скрыт. Ученик в semi-auto
   * вводит F_A_изм и Δ% в input'ы и проверяет ✓.
   */
  #renderSharedJournal(): void {
    const labRows = this.#refs.journal.getRows();
    const mode = this.#recordMode();
    const rows: import('@shared/lib/journal/types').JournalRow[] = labRows.map((r, i) => {
      const draft = this.#journalDrafts.get(r.timestamp) ?? {};
      const cylLabel = r.cylinder.replace('No', 'Цилиндр № ');
      return {
        idx: i + 1,
        timestamp: r.timestamp,
        values: {
          idx: i + 1,
          cylinder: cylLabel,
          V_cm3: r.V_cm3 ?? null,
          P_air_N: r.P_air_N ?? null,
          P_liq_N: r.P_liquid_N ?? null,
          // §21: в semi-auto/fully-manual ученик вводит сам, поэтому
          // подставляем только в fully-auto. F_A_theor пишется всегда
          // (это таблично-эталонная величина, не рассчитываемая учеником).
          F_A_meas_N: mode === 'fully-auto'
            ? (r.F_A_meas_N ?? null)
            : (draft.F_A_meas_N ?? null),
          F_A_theor_N: r.F_A_theor_N ?? null,
          delta_pct: mode === 'fully-auto'
            ? (r.delta_pct ?? null)
            : (draft.delta_pct ?? null),
        },
        verdicts: this.#journalVerdicts.get(r.timestamp) ?? {},
      };
    });
    renderJournalTable(this.#refs.journalHost, ARCHIMEDES_SPEC, rows, {
      mode,
      onCellInput: (rowIdx, key, value) => {
        const ts = labRows[rowIdx - 1]?.timestamp;
        if (ts === undefined) return;
        const draft = this.#journalDrafts.get(ts) ?? {};
        if (value === null) delete draft[key];
        else draft[key] = value;
        this.#journalDrafts.set(ts, draft);
      },
      onVerify: (rowIdx) => {
        const labRow = labRows[rowIdx - 1];
        if (!labRow) return;
        // Прочитать актуальные values из DOM input'ов (на случай прямого
        // assign .value без диспатча input event — например, в тестах).
        const draft = { ...(this.#journalDrafts.get(labRow.timestamp) ?? {}) };
        const tr = this.#refs.journalHost.querySelector<HTMLTableRowElement>(
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
        this.#journalDrafts.set(labRow.timestamp, draft);
        const tempRow: import('@shared/lib/journal/types').JournalRow = {
          idx: rowIdx,
          timestamp: labRow.timestamp,
          values: {
            V_cm3: labRow.V_cm3,
            P_air_N: labRow.P_air_N ?? 0,
            P_liq_N: labRow.P_liquid_N ?? 0,
            F_A_meas_N: draft.F_A_meas_N ?? null,
            F_A_theor_N: labRow.F_A_theor_N ?? 0,
            delta_pct: draft.delta_pct ?? null,
          },
        };
        const verdicts = verifyRow(ARCHIMEDES_SPEC.columns, tempRow);
        this.#journalVerdicts.set(labRow.timestamp, verdicts);
        // Inplace обновление verdict-классов (без full re-render).
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
  }

  #renderDynamometer(state: State): void {
    if (state.dynoRange === null) {
      this.#refs.dynoHost.hidden = true;
      this.#refs.dropzoneStage.hidden = false;
      this.#refs.detachDynoBtn.hidden = true;
      if (this.#dynoEl) {
        this.#dynoEl.remove();
        this.#dynoEl = null;
      }
      return;
    }
    this.#refs.dropzoneStage.hidden = true;
    this.#refs.dynoHost.hidden = false;
    // Detach-кнопка ВСЕГДА видна, пока динамометр на сцене (стандарт всех
    // опытов: «крестик — это X на размещённом приборе»). Каскадная логика
    // в #handleDetachDynoClick: если на крюке цилиндр или цилиндр в воде —
    // сначала автоматически снимаем зависимости, потом убираем сам прибор.
    // См. §19.11.15 REFERENCE «detach-btn всегда видим».
    this.#refs.detachDynoBtn.hidden = false;
    if (!this.#dynoEl) {
      const d = document.createElement('lab-dynamometer');
      d.setAttribute('range', String(state.dynoRange));
      d.setAttribute('force', '0');
      d.setAttribute('attached', '');
      this.#refs.dynoHost.appendChild(d);
      this.#dynoEl = d;
    }
    this.#dynoEl.setAttribute('range', String(state.dynoRange));
    this.#dynoEl.setAttribute('force', state.forceN.toFixed(3));
    if (state.overloaded) {
      this.#dynoEl.setAttribute('data-overload', 'true');
    } else {
      this.#dynoEl.removeAttribute('data-overload');
    }
    if (!this.#verticalDrag) {
      const dy =
        state.inWater || state.submersionFraction > 0 ? state.dipOffsetPx : 0;
      this.#refs.dynoHost.style.transform = `translate(-50%, ${dy}px)`;
      this.#refs.dynoHost.style.transition = 'transform 600ms cubic-bezier(0.42, 0, 0.58, 1)';
    }
  }

  #renderCylinder(state: State): void {
    if (state.cylinderId === null) {
      this.#refs.cylinderHost.hidden = true;
      this.#refs.cylinderHost.removeAttribute('data-can-dip');
      this.#refs.cylinderHost.removeAttribute('data-can-lift');
      this.#refs.cylinderHost.removeAttribute('tabindex');
      this.#refs.cylinderHost.removeAttribute('role');
      this.#refs.cylinderHost.removeAttribute('aria-label');
      this.#refs.detachCylBtn.hidden = true;
      // Сброс позиционных стилей floating-кнопки (она в stage-системе,
      // следующий show может быть в другом месте — пусть syncPosition посчитает).
      this.#refs.detachCylBtn.style.transform = '';
      this.#refs.detachCylBtn.style.removeProperty('--cyl-detach-transform');
      if (this.#cylinderEl) {
        this.#cylinderEl.remove();
        this.#cylinderEl = null;
      }
      return;
    }
    const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(state.cylinderId);
    if (!cyl) return;
    this.#refs.cylinderHost.hidden = false;
    // Кнопка снять цилиндр ВСЕГДА видна, пока цилиндр на сцене (не зависит от
    // фазы погружения). Каскадная логика: если цилиндр в воде, click сначала
    // вызовет liftCylinderFromWater, потом detachCylinder. См. §19.11.15.
    this.#refs.detachCylBtn.hidden = false;
    if (!this.#cylinderEl) {
      const w = document.createElement('lab-metal-weight');
      w.setAttribute('material', cyl.material);
      w.setAttribute('id-num', String(cyl.id));
      w.setAttribute('attached', '');
      w.setAttribute('no-legend', '');
      this.#refs.cylinderHost.appendChild(w);
      this.#cylinderEl = w;
    } else {
      this.#cylinderEl.setAttribute('material', cyl.material);
      this.#cylinderEl.setAttribute('id-num', String(cyl.id));
    }
    // Позиционируем цилиндр под нижним крюком динамометра.
    // Базовая высота вычисляется ДИНАМИЧЕСКИ: top = (dynoHost.top - stage.top)
    // + getRestingWeightHookY() + THREAD_LEN. Это согласует геометрию с реальным
    // расположением крюка дин-ра на текущем viewport'е и не зависит от
    // захардкоженных pixel-констант — после уменьшения корпуса дин-ра с 320
    // до 250 пред. baseTop=170 ставил цилиндр поверх окна шкалы. Resting (а не
    // current) — чтобы при погружении (force ↓) цилиндр не «всплывал» поверх
    // dipOffset'а. См. §19.11.14. При погружении — +state.dipOffsetPx.
    // ВАЖНО: top ставится только тогда, когда нет активного drag — иначе
    // прыжок при отпускании пальца. Drag сам управляет transform, render не
    // мешает. См. #handleCylinderPointerDown.
    if (!this.#verticalDrag) {
      const baseTop = this.#computeCylinderBaseTop();
      this.#refs.cylinderHost.style.top = `${baseTop}px`;
      this.#refs.cylinderHost.style.left = 'var(--scene-center-x, 50%)';
      const dy =
        state.inWater || state.submersionFraction > 0 ? state.dipOffsetPx : 0;
      this.#refs.cylinderHost.style.transform = `translate(-50%, ${dy}px)`;
      this.#refs.cylinderHost.style.transition =
        'transform 600ms cubic-bezier(0.42, 0, 0.58, 1)';
    }

    // Affordance-атрибуты для CSS-курсора, стрелки-подсказки и a11y.
    const canDip = this.#canDip(state);
    const canLift = this.#canLift(state);
    if (canDip) this.#refs.cylinderHost.setAttribute('data-can-dip', 'true');
    else this.#refs.cylinderHost.removeAttribute('data-can-dip');
    if (canLift) this.#refs.cylinderHost.setAttribute('data-can-lift', 'true');
    else this.#refs.cylinderHost.removeAttribute('data-can-lift');

    if (canDip || canLift) {
      this.#refs.cylinderHost.setAttribute('tabindex', '0');
      this.#refs.cylinderHost.setAttribute('role', 'button');
      // ARIA-label НЕ палит ответ (силу) — даёт только инструкцию жеста.
      this.#refs.cylinderHost.setAttribute(
        'aria-label',
        canLift
          ? 'Цилиндр в воде. Нажмите Enter или потяните вверх, чтобы поднять.'
          : 'Цилиндр в воздухе. Нажмите Enter или потяните вниз, чтобы погрузить в воду.',
      );
    } else {
      // Не убираем tabindex/role полностью, но снимаем aria-label чтобы не
      // вводить в заблуждение, когда жест недоступен.
      this.#refs.cylinderHost.removeAttribute('tabindex');
      this.#refs.cylinderHost.removeAttribute('role');
      this.#refs.cylinderHost.removeAttribute('aria-label');
    }

    this.#syncDetachCylPosition();
  }

  /**
   * Синхронизирует позицию `#ar-detach-cyl` (вынесен из cylinderHost для a11y
   * §19.11.15: «role=button + вложенная focusable» провоцирует axe). Считаем
   * координаты в системе stage'а — detach-cyl сидит в stage как sibling
   * cylinderHost. Вызывается после #renderCylinder и при ResizeObserver.
   *
   * Реализация: базовая top/left ставится по «air»-позиции цилиндра (без dip),
   * а вертикальный сдвиг при погружении делается через `transform: translateY()`
   * с той же transition как у cylinderHost — кнопка едет синхронно с цилиндром.
   * Это избегает пересчёта top/left на каждом кадре анимации.
   */
  #syncDetachCylPosition(): void {
    const btn = this.#refs.detachCylBtn;
    if (btn.hidden) return;
    const cyl = this.#refs.cylinderHost;
    const stage = this.#refs.stage;
    if (cyl.hidden || !stage) return;

    // §19.11.16: используем offsetTop/offsetLeft (CSS positioning, без
    // transform), чтобы избежать race с только что выставленным style.transform.
    // Раньше cylRect.top - currentDy давал stale-result, если getBoundingClientRect
    // ещё не отразил новый transform → detach-X застывал в позиции воды
    // после lift. offsetTop = CSS top относительно позиционированного предка
    // (= stage). Стабильно, не подвержено transform race.
    const cylOffsetTop = (cyl as HTMLElement).offsetTop;
    const cylOffsetLeft = (cyl as HTMLElement).offsetLeft;
    const cylRect = cyl.getBoundingClientRect();
    if (cylRect.width === 0) return;
    const currentDy = this.#getCurrentCylDy();
    const BTN_SIZE = 24;
    const cylWidth = cylRect.width;
    // airTop: позиция в stage'е без учёта transform → потом transform добавит dy.
    // Детач-кнопка чуть выше цилиндра (BTN_SIZE+6 px зазор).
    const airTop = cylOffsetTop - BTN_SIZE - 6;
    // airLeft: cyl-host имеет CSS `left: var(--scene-center-x); transform: translateX(-50%)`,
    // т.е. offsetLeft + cyl_width/2 = центр цилиндра. Кнопку центрируем тоже.
    const airLeft = cylOffsetLeft + (cylWidth - BTN_SIZE) / 2;
    btn.style.position = 'absolute';
    btn.style.top = `${airTop}px`;
    btn.style.left = `${airLeft}px`;
    btn.style.right = 'auto';
    // Вертикальный сдвиг через CSS-переменную — её используют и базовое
    // правило, и hover-правило (см. CSS). Hover не теряет translateY.
    const t = `translateY(${currentDy}px)`;
    btn.style.setProperty('--cyl-detach-transform', t);
    btn.style.transform = t;
  }

  #renderBeaker(state: State): void {
    if (!state.beakerOnScene) {
      this.#refs.beakerHost.hidden = true;
      this.#refs.dropzoneBeaker.hidden = false;
      this.#refs.detachBeakerBtn.hidden = true;
      if (this.#beakerEl) {
        this.#beakerEl.remove();
        this.#beakerEl = null;
      }
      return;
    }
    this.#refs.dropzoneBeaker.hidden = true;
    this.#refs.beakerHost.hidden = false;
    // Detach-кнопка стакана ВСЕГДА видна, пока стакан на сцене. Каскадная
    // логика: если внутри плавает цилиндр, сначала liftCylinderFromWater,
    // потом returnBeakerToKit. В реальном мире можно убрать стакан со стола —
    // цилиндр останется висеть на нити динамометра. См. §19.11.15 REFERENCE.
    this.#refs.detachBeakerBtn.hidden = false;
    if (!this.#beakerEl) {
      const b = document.createElement('lab-beaker');
      b.setAttribute('level', '0');
      this.#refs.beakerHost.appendChild(b);
      this.#beakerEl = b;
    }
    this.#beakerEl.setAttribute('level', String(state.waterMl));
    // Когда цилиндр в воде, цилиндр-host (role=button) визуально перекрывает
    // стакан. WCAG 2.5.8 (target size) требует, чтобы соседние кликабельные
    // зоны не сливались — снимаем role/tabindex со стакана, пока в нём
    // плавает цилиндр (стакан в это время не нуждается в клике — все жесты
    // делаются через цилиндр).
    if (state.inWater) {
      this.#beakerEl.removeAttribute('tabindex');
      this.#beakerEl.removeAttribute('role');
    } else {
      // Восстанавливаем дефолтные lab-beaker host-атрибуты (см. connectedCallback).
      if (!this.#beakerEl.hasAttribute('tabindex')) {
        this.#beakerEl.setAttribute('tabindex', '0');
      }
      if (!this.#beakerEl.hasAttribute('role')) {
        this.#beakerEl.setAttribute('role', 'button');
      }
    }
  }

  #renderClamp(state: State): void {
    this.#refs.clamp.hidden = state.dynoRange === null;
  }

  /**
   * §21 UX-v2: в fully-manual журнал должен показывать «активную пустую
   * строку» для текущего цилиндра — у неё все поля = null/0, ученик
   * заполняет руками через input'ы. Аналог `#commitEmptyManualRow` Density.
   *
   * Idempotent: повторно ничего не создаёт, если строка для этого цилиндра
   * (в этой session) уже есть.
   */
  #ensureManualEmptyRow(state: State): void {
    if (state.cylinderId === null) return;
    const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(state.cylinderId);
    if (!cyl) return;
    const journalCyl = this.#cylJournalId(cyl.id);
    if (journalCyl === null) return; // №1 исключён
    // Уже есть строка для этого цилиндра в текущей session?
    const exists = this.#refs.journal.getRows().some((r) => r.cylinder === journalCyl);
    if (exists) return;
    this.#refs.journal.addRow({
      cylinder: journalCyl,
      V_cm3: cyl.V_cm3,
      P_air_N: null,
      P_liquid_N: null,
      F_A_meas_N: null,
      F_A_theor_N: 0,
      delta_pct: null,
      context: {
        cylinder_id: String(cyl.id),
        liquid: 'water',
        V_water_ml: state.waterMl,
      },
    });
  }

  #renderRecordBtn(state: State): void {
    // §21 UX-v2: pending-плашка «Записать ...» — это семантика semi-auto.
    // В fully-manual ученик пишет ВСЁ руками (никаких подсказок-формул-CTA).
    // В fully-auto программа пишет автоматом без UI-триггера.
    const mode = getRecordMode(RECORD_MODE_KIT);
    if (mode !== 'semi-auto') {
      this.#refs.recordBtn.hidden = true;
      this.#refs.recordBtn.removeAttribute('data-pending');
      this.#refs.recordBtn.removeAttribute('data-mode');
      // В fully-manual — гарантируем что есть «активная пустая строка» в журнале
      // для ввода рукой (вместо плашки «Записать»).
      if (mode === 'fully-manual') this.#ensureManualEmptyRow(state);
      return;
    }

    const baseLabel = RECORD_LABELS[state.phase];
    // Кнопка нужна только если на крюке цилиндр (нечего иначе записывать) и
    // он входит в журнал (не №1).
    if (!baseLabel || state.cylinderId === null || state.cylinderId === 1) {
      this.#refs.recordBtn.hidden = true;
      this.#refs.recordBtn.removeAttribute('data-pending');
      this.#refs.recordBtn.removeAttribute('data-mode');
      return;
    }
    // Журнальная строка уже содержит P_возд для текущего цилиндра в воздухе?
    // Тогда CTA дублирующая — скрываем.
    const journalRows = this.#refs.journal.getRows();
    const hasAirRowForCurrent = journalRows.some(
      (r) => r.P_air_N !== null && state.currentRowTs === r.timestamp,
    );
    if (!state.inWater && hasAirRowForCurrent && state.phase !== 'cyl-in-water') {
      this.#refs.recordBtn.hidden = true;
      this.#refs.recordBtn.removeAttribute('data-pending');
      this.#refs.recordBtn.removeAttribute('data-mode');
      return;
    }

    this.#refs.recordBtn.hidden = false;
    // Большой CTA с числом: «✏  Записать P возд = 0,65 Н».
    // Пока не стабилизировалось — серый плейсхолдер «Подождите, прибор
    // стабилизируется…», кнопка disabled. Это даёт ученику сразу понять,
    // ЧТО будет записано (числовая обратная связь).
    //
    // ВАЖНО: в визуальном label число — есть. В aria-label числа нет
    // (анти-спойлер: скринридер не озвучит ответ ученику до записи).
    // Это требование из канона CLAUDE.md «ARIA-label НИКОГДА не палит ответ».
    const isAir = !state.inWater;
    const valueN = roundForRange(state.forceTargetN, state.dynoRange ?? 1);
    if (state.stable) {
      const valueRu = formatRu(valueN, state.dynoRange === 1 ? 2 : 1);
      const visualLabel = `✏  ${baseLabel} = ${valueRu} Н`;
      this.#refs.recordLabel.textContent = visualLabel;
      // aria-label — без значения. «Записать P возд» / «Записать P жид».
      this.#refs.recordBtn.setAttribute('aria-label', baseLabel);
      this.#refs.recordBtn.removeAttribute('data-pending');
      this.#refs.recordBtn.disabled = false;
      this.#refs.recordBtn.setAttribute('data-mode', isAir ? 'air' : 'liquid');
    } else {
      const visualLabel = 'Подождите, прибор стабилизируется…';
      this.#refs.recordLabel.textContent = visualLabel;
      this.#refs.recordBtn.setAttribute('aria-label', baseLabel);
      this.#refs.recordBtn.setAttribute('data-pending', 'true');
      this.#refs.recordBtn.disabled = true;
      this.#refs.recordBtn.setAttribute('data-mode', isAir ? 'air' : 'liquid');
    }
  }

  #renderDosePicker(state: State): void {
    this.#refs.dosePicker.hidden = !state.dosePickerOpen;
    if (state.dosePickerOpen) {
      this.#refs.dosePicker.style.bottom = '100px';
      this.#refs.dosePicker.style.left = 'var(--scene-center-x, 50%)';
      this.#refs.dosePicker.style.transform = 'translateX(-50%)';
    }
  }

  #renderHint(state: State): void {
    const mode = getRecordMode(RECORD_MODE_KIT);
    const map = mode === 'fully-manual' ? HINTS_MANUAL : HINTS;
    this.#refs.hint.textContent = map[state.phase];
  }

  #renderSteps(state: State): void {
    void STEP_BY_PHASE; // legacy — оставлено для совместимости импорта в тестах.
    const journalRows = this.#refs.journal.getRows();
    const hasFullRow = journalRows.some(
      (r) =>
        r.P_air_N !== null &&
        r.P_liquid_N !== null &&
        r.delta_pct !== null &&
        Math.abs(r.delta_pct) <= 5,
    );

    // ── Strict ФИПИ-gate: шаги done — строго по фактическим данным,
    // а не по фазе. Шаг становится active только когда все предыдущие
    // обязательные done. Это блокирует «прыжки» через P возд при наливе
    // воды и опускании в воду — соответствует алгоритму ОГЭ.
    const hasAir = journalRows.some((r) => r.P_air_N !== null);
    const hasLiq = journalRows.some(
      (r) => r.P_air_N !== null && r.P_liquid_N !== null,
    );

    // Done-флаги по 6 базовым шагам.
    const done: Record<number, boolean> = {
      1: state.dynoRange !== null,
      2: state.cylinderId !== null,
      3: hasAir, // P возд записан
      4: state.beakerOnScene && state.waterMl >= 100,
      5: state.inWater || hasLiq, // погружение либо в текущий момент, либо уже было
      6: hasLiq, // P жид записан
    };

    // Active = первый non-done шаг в порядке 1..6, при условии что этот шаг
    // ученик «может» сейчас сделать (не блокируется отсутствием предусловия).
    // Реализация — линейный поиск, без хитрых таблиц.
    let active: number | null = null;
    for (let n = 1; n <= 6; n++) {
      if (!done[n]) {
        active = n;
        break;
      }
    }

    // Шаг 3 «Запишите P возд» получает `warning`-выделение, если ученик
    // продолжил действовать (налил воду / погрузил цилиндр) до записи P возд.
    // Это soft-scaffolding: не блокируем, но привлекаем внимание.
    const step3Warning =
      !hasAir && (state.beakerOnScene || state.inWater || state.waterMl > 0);

    const lis = this.#refs.steps.querySelectorAll<HTMLElement>('.step');
    lis.forEach((li) => {
      const n = parseInt(li.dataset['step'] ?? '0', 10);
      const isBonus = li.classList.contains('step-bonus');

      if (isBonus) {
        // Шаг 7 «Сравните с теорией» появляется только после первой полной
        // строки журнала (research §1 implicit scaffolding) и активен, когда
        // ученик в фазе liquid-recorded. До того — скрыт.
        if (!hasFullRow) {
          li.hidden = true;
          delete li.dataset['state'];
          return;
        }
        li.hidden = false;
        li.dataset['state'] =
          state.phase === 'liquid-recorded' ? 'active' : 'pending';
        return;
      }

      let computedState: 'done' | 'active' | 'warning' | 'pending' = 'pending';
      if (done[n]) computedState = 'done';
      else if (n === active) computedState = 'active';

      // Soft-warning override для шага 3: «вы пропустили запись P возд».
      if (n === 3 && step3Warning && !done[3]) computedState = 'warning';

      if (computedState === 'pending') delete li.dataset['state'];
      else li.dataset['state'] = computedState;
    });
  }

  #renderEquipmentCards(state: State): void {
    for (const card of this.#refs.equipmentCards) {
      const eqId = card.getAttribute('data-eq') ?? '';
      let placed = false;
      if (eqId === 'dynamometer-1') placed = state.dynoRange === 1;
      else if (eqId === 'dynamometer-2') placed = state.dynoRange === 5;
      else if (eqId === 'beaker') placed = state.beakerOnScene;
      else {
        const cylMatch = /^cyl-(\d+)$/.exec(eqId);
        if (cylMatch) {
          const idNum = Number(cylMatch[1]);
          placed = state.cylinderId === idNum;
        }
      }
      card.setAttribute('status', placed ? 'in-use' : 'available');
      // Карточка всегда остаётся drop-зоной (для return-to-kit), а draggable
      // снимаем когда прибор на сцене (источник теперь на сцене, а не в карточке).
      if (placed) {
        card.removeAttribute('data-draggable');
      } else {
        card.setAttribute('data-draggable', eqId);
      }
    }
  }

  #renderBanner(state: State): void {
    if (state.bannerText) {
      this.#refs.banner.hidden = false;
      this.#refs.bannerText.textContent = state.bannerText;
    } else {
      this.#refs.banner.hidden = true;
      this.#refs.bannerText.textContent = '';
    }
  }

  /**
   * Пересчёт scene-space координат для overlay-нити, линии-зажима и
   * red danger-bottom (когда цилиндр на дне).
   *
   * Все координаты считаются ОТНОСИТЕЛЬНО ar-stage (sceneEl). Используется
   * helper getElementPointInScene: переводит позицию точки внутри host-а
   * в координаты сцены через getBoundingClientRect.
   */
  #renderSceneOverlay(state: State): void {
    const stage = this.#refs.stage;
    const overlay = this.#refs.sceneOverlay;
    // svg overlay — растягиваем на размер stage'а; при ResizeObserver
    // пересчитываем viewBox.
    const stageRect = stage.getBoundingClientRect();
    overlay.setAttribute('viewBox', `0 0 ${Math.max(1, stageRect.width)} ${Math.max(1, stageRect.height)}`);

    // ─ clamp-line: от центра ar-clamp до верхнего крюка динамометра
    if (state.dynoRange !== null && this.#dynoEl) {
      const clampPt = getElementPointInScene(this.#refs.clamp, 0.5, 0.5, stage);
      const dynoTop = this.#getDynamometerTopHookScenePoint(stage);
      svgShow(this.#refs.clampLine);
      this.#refs.clampLine.setAttribute('x1', String(clampPt.x));
      this.#refs.clampLine.setAttribute('y1', String(clampPt.y));
      this.#refs.clampLine.setAttribute('x2', String(dynoTop.x));
      this.#refs.clampLine.setAttribute('y2', String(dynoTop.y));
    } else {
      svgHide(this.#refs.clampLine);
    }

    // ─ нить: от нижнего крюка динамометра до верхнего крюка цилиндра
    if (state.cylinderId !== null && this.#dynoEl && this.#cylinderEl) {
      const dynoHook = this.#getDynamometerWeightHookScenePoint(stage);
      const cylHook = this.#getCylinderHookScenePoint(stage);
      svgShow(this.#refs.threadPath);
      this.#refs.threadPath.setAttribute(
        'd',
        sceneTautPath(dynoHook.x, dynoHook.y, cylHook.x, cylHook.y),
      );
    } else {
      svgHide(this.#refs.threadPath);
    }

    // ─ danger-bottom: красная пунктирная линия по дну стакана
    if (state.bottomTouch && state.beakerOnScene) {
      const beakerRect = this.#refs.beakerHost.getBoundingClientRect();
      const yBottom = beakerRect.bottom - stageRect.top - 12; // дно ~12px выше нижнего края bbox
      const xL = beakerRect.left - stageRect.left + 8;
      const xR = beakerRect.right - stageRect.left - 8;
      svgShow(this.#refs.bottomDanger);
      this.#refs.bottomDanger.setAttribute('x1', String(xL));
      this.#refs.bottomDanger.setAttribute('y1', String(yBottom));
      this.#refs.bottomDanger.setAttribute('x2', String(xR));
      this.#refs.bottomDanger.setAttribute('y2', String(yBottom));
    } else {
      svgHide(this.#refs.bottomDanger);
    }
  }

  #getDynamometerTopHookScenePoint(stage: HTMLElement): { x: number; y: number } {
    if (!this.#dynoEl) return { x: 0, y: 0 };
    type DynoEl = HTMLElement & { getHookPosition?: () => { x: number; y: number } };
    const d = this.#dynoEl as DynoEl;
    const local =
      typeof d.getHookPosition === 'function'
        ? d.getHookPosition()
        : { x: 45, y: 8 };
    return getElementPointInScene(
      this.#dynoEl,
      this.#dynoEl.clientWidth ? local.x / this.#dynoEl.clientWidth : 0.5,
      this.#dynoEl.clientHeight ? local.y / this.#dynoEl.clientHeight : 0,
      stage,
    );
  }

  #getDynamometerWeightHookScenePoint(stage: HTMLElement): { x: number; y: number } {
    if (!this.#dynoEl) return { x: 0, y: 0 };
    type DynoEl = HTMLElement & {
      getWeightHookPosition?: () => { x: number; y: number };
    };
    const d = this.#dynoEl as DynoEl;
    const local =
      typeof d.getWeightHookPosition === 'function'
        ? d.getWeightHookPosition()
        : { x: 45, y: 290 };
    const w = this.#dynoEl.clientWidth || 1;
    const h = this.#dynoEl.clientHeight || 1;
    return getElementPointInScene(this.#dynoEl, local.x / w, local.y / h, stage);
  }

  #getCylinderHookScenePoint(stage: HTMLElement): { x: number; y: number } {
    if (!this.#cylinderEl) return { x: 0, y: 0 };
    type CylEl = HTMLElement & {
      getThreadHookPosition?: () => { x: number; y: number };
    };
    const c = this.#cylinderEl as CylEl;
    const local =
      typeof c.getThreadHookPosition === 'function'
        ? c.getThreadHookPosition()
        : { x: 32, y: 8 };
    const w = this.#cylinderEl.clientWidth || 1;
    const h = this.#cylinderEl.clientHeight || 1;
    return getElementPointInScene(this.#cylinderEl, local.x / w, local.y / h, stage);
  }

  #announce(msg: string): void {
    if (this.#refs.liveRegion) this.#refs.liveRegion.textContent = msg;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────

/**
 * Анимации отключаем когда:
 *   - пользователь выставил prefers-reduced-motion
 *   - мы внутри happy-dom (тесты): RAF и Date.now не «крутят» время как в
 *     браузере, и анимация никогда не завершилась бы. Тогда мы не запускаем
 *     её вовсе и сразу применяем target — это и есть synchronous unit-test
 *     режим, который ждут programmatic-API тесты 6a.
 */
function shouldSkipAnimation(): boolean {
  if (typeof window === 'undefined') return true;
  // happy-dom оставляет себя в window.happyDOM — это надёжный детектор.
  if ('happyDOM' in window) return true;
  if (typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/** SVGElement не имеет .hidden; используем атрибут display. */
function svgShow(el: SVGElement): void {
  el.removeAttribute('display');
  el.removeAttribute('hidden');
}
function svgHide(el: SVGElement): void {
  el.setAttribute('display', 'none');
  el.setAttribute('hidden', 'hidden');
}

/**
 * Округляет силу до цены деления соответствующего динамометра.
 *   range=1 → шаг 0.01 Н (LCD «0,30» — 2 знака)
 *   range=5 → шаг 0.1 Н
 * Это имитация реального чтения шкалы — учитель приучает писать P_возд
 * с точностью прибора, а не «компьютерным» float.
 */
function roundForRange(forceN: number, range: DynamometerRange): number {
  const step = range === 1 ? 0.01 : 0.1;
  return Math.round(forceN / step) * step;
}

/** Форматирует число в RU-формате: `0.69` → `0,69`. */
function formatRu(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(fractionDigits).replace('.', ',');
}

/**
 * Перевод точки внутри `el` (через нормализованные координаты [0..1] относительно
 * его bbox) в scene-space координаты сцены `sceneEl` (px относительно bbox сцены).
 *
 * Это и есть «getElementPointInScene» из спеки. Используется для нити, линии-
 * зажима и любых других overlay-элементов, чьи координаты должны жить в системе
 * координат сцены (а не приборов).
 *
 * Если getBoundingClientRect недоступен (тестовая среда без layout) —
 * возвращаем (0, 0) как safe fallback, чтобы не падать.
 */
function getElementPointInScene(
  el: Element,
  fracX: number,
  fracY: number,
  sceneEl: Element,
): { x: number; y: number } {
  // §19.11.16: force layout flush через void offsetHeight, чтобы getBoundingClientRect
  // отразил только что выставленный style.transform. Без флэша браузер мог
  // вернуть stale-position → нить overlay застывала в позиции воды после lift.
  void (el as HTMLElement).offsetHeight;
  const r = el.getBoundingClientRect();
  const s = sceneEl.getBoundingClientRect();
  return {
    x: r.left + r.width * fracX - s.left,
    y: r.top + r.height * fracY - s.top,
  };
}

/**
 * SVG path для нити с лёгким провисанием. Аналог tautPath из lab-thread, но
 * рисует прямо в scene-overlay svg (без вложенного web-component).
 */
function sceneTautPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) {
    return `M${fromX} ${fromY} L${toX} ${toY}`;
  }
  const sag = Math.max(1.5, Math.min(6, length * 0.025));
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 + sag;
  return `M${fromX} ${fromY} Q${midX} ${midY} ${toX} ${toY}`;
}

// ─── Re-exports для тестов ───────────────────────────────────────────────
export { G, RHO_WATER };
