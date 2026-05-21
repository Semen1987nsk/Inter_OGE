/**
 * ArchimedesVolumeExperiment — оркестратор опыта 1.3 «Исследование
 * зависимости F_А от объёма погружённой части тела».
 *
 * ФИПИ-2026, Спецификация КИМ, Приложение 2, стр. 16, Комплект №1:
 * «исследование зависимости архимедовой силы от объёма погружённой части
 *  тела (цилиндр № 3)».
 *
 * КОДИФ §1.29 (стр. 14) — практическая работа из канонического перечня.
 *
 * Cross-check: REFERENCE §30 «Покрытие ФИПИ». Layout — REFERENCE §31.
 *
 * Layout (канон §31):
 *   - 2-колоночный grid (workbench | equipment-panel)
 *   - Заголовок-степпер 1→2→3→4→5 с data-state="pending|active|done"
 *     (5 шагов: dyno → cyl → beaker → drag → запись)
 *   - Hint-bar для текущей подсказки
 *   - Floating measurement-panel в углу stage с журналом + record-mode
 *   - 3 карточки в equipment-panel: dyno-1, cyl-3, beaker
 *   - Inline-кнопки погружения под стендом (после сборки)
 */

import { Store } from '@shared/controller/Store';
import {
  applyRecordModeAttribute,
  DEFAULT_RECORD_MODE,
  getRecordMode,
  injectRecordModeToggleStyles,
  renderRecordModeToggle,
  type RecordMode,
} from '@shared/lib/record-mode';
import { renderJournalTable } from '@shared/lib/journal/render';
import { ARCHIMEDES_VOLUME_SPEC } from '@shared/lib/journal/specs';
import type { JournalRow } from '@shared/lib/journal/types';
import {
  DragDropController,
  type EquipmentDropDetail,
} from '../density-solid/controller/DragDropController';
import {
  REFERENCE_LEVELS_MM,
  measuredBuoyancyN,
  submergedVolumeCm3,
  theoreticalBuoyancyN,
  weightInAirN,
} from '../../physics/archimedes-volume/ArchimedesVolumeCalc';

const RECORD_MODE_KIT = 'kit-1';
const DYNO_NOISE_N = 0.005;

/**
 * Геометрия сцены 1.3 — масштаб мм ↔ px для drag-by-thread.
 *
 * Цилиндр №3: длина body 80 мм (ФИПИ паспорт). В SVG `lab-metal-weight`
 * viewBox 64×110, body 22..100 → высота body = 78 SVG-юнитов. С `--w-size: 105px`
 * host = 105×173, body ≈ 123 px ⇒ MM_TO_PX = 123/80 ≈ 1.54.
 *
 * Однако точная высота body зависит от итогового layout (gap-ы, line-height
 * в shadow-DOM компонента). Поэтому MM_TO_PX и START_OFFSET вычисляются
 * **динамически** через `lab-metal-weight.getBodyHeightPx()` и
 * `lab-beaker.getWaterSurfaceY()` ПОСЛЕ установки оборудования и стабилизации
 * layout. До вычисления — fallback-константа.
 *
 * START_OFFSET (px) — сдвиг translateY у cylinder-rig на h_mm=0, такой что
 * нижняя кромка цилиндра ЛЕЖИТ ровно на поверхности воды. Это критично для
 * педагогики: ученик тянет вниз на 20 мм — цилиндр погрузился на 20 мм
 * относительно поверхности, как в реальном опыте. Без offset цилиндр сначала
 * «висит в воздухе», и h_mm = 20 не означает 20 мм под водой.
 */
const FALLBACK_MM_TO_PX = 1.33;
const MAX_H_MM = 80;
/**
 * Визуальный воздушный зазор (мм) между нижней кромкой цилиндра и поверхностью
 * воды при h_mm=0. Без него цилиндр после placeBeaker мгновенно лежит на воде
 * и ученик не видит шага «висит в воздухе». 30 мм — методически корректно для
 * ФИПИ-опыта 1.3, ученик тянет вниз → шкала 0..30 проходит ВОЗДУХ, затем
 * шкала 30..90 = реальное погружение в воде. Семантика state.hMm остаётся
 * "глубина в воде" (0..60), а зазор — отдельный сдвиг #startOffsetPx ↓.
 *
 * 2026-05-19: повышен с 20 до 30 (на 58px цилиндре 20мм = ~26px было слабо
 * заметно, ученик видел цилиндр «уже почти в стакане» сразу после установки).
 */
const AIR_GAP_MM = 30;

/** Точки snap для журнала (по методичке §2.3.3 / эталонам ФИПИ). */
const SNAP_TARGETS_MM = [20, 40, 60] as const;
const SNAP_RADIUS_MM = 4;

/** Этапы степпера (соответствуют <li data-step="N"> в template.html). */
type StepId = 1 | 2 | 3 | 4 | 5;
type StepState = 'pending' | 'active' | 'done';

interface AVStaged {
  readonly dyno: boolean;
  readonly cyl: boolean;
  readonly beaker: boolean;
}

interface AVState {
  readonly rows: ReadonlyArray<JournalRow>;
  readonly recordMode: RecordMode;
  readonly staged: AVStaged;
  readonly pAirN: number | null;
  readonly hMm: number;
  readonly pNowN: number;
}

const INITIAL_STAGED: AVStaged = { dyno: false, cyl: false, beaker: false };

const INITIAL_STATE: AVState = {
  rows: [],
  recordMode: DEFAULT_RECORD_MODE,
  staged: INITIAL_STAGED,
  pAirN: null,
  hMm: 0,
  pNowN: 0,
};

interface AVRefs {
  readonly rootHost: HTMLElement;
  readonly stageArea: HTMLElement;
  readonly steps: HTMLElement;
  readonly hint: HTMLElement;
  readonly cylinderRig: HTMLElement;
  /** SVG `<line>` нити между dyno hook и cyl thread hook. */
  readonly threadLine: SVGLineElement;
  /** SVG overlay контейнер — нужен для координатной системы нити. */
  readonly threadOverlay: SVGSVGElement;
  /** Live h-индикатор «h=X мм» рядом с цилиндром при drag. */
  readonly depthLabel: HTMLElement;
  readonly depthLabelValue: HTMLElement;
  readonly dynoMount: HTMLElement;
  readonly beakerMount: HTMLElement;
  readonly dropzoneDyno: HTMLElement;
  readonly dropzoneBeaker: HTMLElement;
  readonly detachDynoBtn: HTMLButtonElement;
  readonly detachCylBtn: HTMLButtonElement;
  readonly detachBeakerBtn: HTMLButtonElement;
  readonly cardDyno: HTMLElement;
  readonly cardCyl: HTMLElement;
  readonly cardBeaker: HTMLElement;
  readonly dyno: HTMLElement;
  readonly cyl: HTMLElement;
  readonly beaker: HTMLElement;
  readonly submergeControls: HTMLElement;
  readonly btnBaseline: HTMLButtonElement;
  readonly btnLift: HTMLButtonElement;
  readonly dragTip: HTMLElement;
  readonly journalHost: HTMLElement;
  readonly journalEmpty: HTMLElement;
  readonly formulaDisplay: HTMLElement;
  readonly measurementCount: HTMLElement;
  readonly recordModeSlot: HTMLElement;
  readonly recordPendingSlot: HTMLElement;
  readonly recordPendingBtn: HTMLButtonElement;
  readonly recordPendingSummary: HTMLElement;
  readonly resetBtn: HTMLButtonElement;
  readonly liveRegion: HTMLElement;
}

/** Активный drag-by-thread на цилиндре. */
interface CylinderDrag {
  pointerId: number;
  startClientY: number;
  startHMm: number;
  /**
   * Снапшот air-gap (в px) на момент НАЧАЛА drag. Drag-formula использует
   * фиксированный gap, чтобы переход «воздух → вода» (deactivation) не вызывал
   * прыжка hMm при последующих moveListener-tick'ах.
   */
  initialAirGapPx: number;
  didTrigger: boolean;
  moveListener(ev: PointerEvent): void;
  upListener(ev: PointerEvent): void;
}

const STEP_HINTS: Record<StepId, string> = {
  1: 'Перетащите динамометр на штатив, затем цилиндр на крюк, затем стакан под цилиндр.',
  2: 'Перетащите цилиндр №3 на крюк динамометра.',
  3: 'Поставьте стакан с водой под цилиндр.',
  4: '🖐 Потяните цилиндр вниз в воду на 20 / 40 / 60 мм и наблюдайте уменьшение веса.',
  5: 'Сделайте 3 записи в журнал. Должна получиться линейная зависимость F_А от V_погр.',
};

export class ArchimedesVolumeExperiment {
  readonly #refs: AVRefs;
  readonly #store: Store<AVState>;
  #detachRecordModeToggle: (() => void) | null = null;
  #unsubscribe: (() => void) | null = null;
  #dragController: DragDropController | null = null;
  #cylinderDrag: CylinderDrag | null = null;
  #lastRecordedSignature = '';

  /**
   * Динамический масштаб мм↔px для drag-by-thread. Пересчитывается каждый раз
   * при стабилизации layout (когда установлены ЦИЛИНДР+СТАКАН) по реальной
   * height тела цилиндра. Иначе теряется соответствие drag-distance ↔ h_mm
   * при ресайзе окна или при ином `--w-size`.
   */
  #mmToPx: number = FALLBACK_MM_TO_PX;
  /**
   * Начальный сдвиг translateY (px), при котором НИЖНЯЯ кромка цилиндра ЛЕЖИТ
   * ровно на поверхности воды. Делает drag-distance ≡ submergence-depth.
   * Пересчитывается вместе с #mmToPx.
   */
  #startOffsetPx: number = 0;
  /**
   * Максимально допустимая глубина погружения с учётом ГЕОМЕТРИИ стакана:
   * cyl_bottom не должен пробивать дно стакана. Вычисляется в
   * #calibrateGeometry как `(getWaterBottomY - getWaterSurfaceY - SAFETY) / mmToPx`,
   * но не больше MAX_H_MM (длина цилиндра). По умолчанию = MAX_H_MM до калибровки.
   *
   * Регрессия от 2026-05-17: при коротком столбе воды (level=180, viewport 1366)
   * цилиндр визуально проваливался через дно стакана — clamp по MAX_H_MM=80
   * был недостаточен.
   */
  #effectiveMaxHMm: number = MAX_H_MM;
  /**
   * Базовый уровень воды (мл), задаётся при mount beaker. Используется в
   * #applyBeakerLevel: фактический уровень = baseLevel + V_displaced.
   * Поднят с 180 → 220 мл для запаса столба воды при погружении до 80 мм
   * (см. фидбек 2026-05-17 «груз проваливается через дно»).
   */
  #baseLevelMl = 200;
  /**
   * Air-gap: при первом placeBeaker цилиндр «висит в воздухе» на AIR_GAP_MM
   * выше воды. Снимается при ПЕРВОМ погружении (drag или submergeTo с h>0) —
   * CSS-transition 220 ms плавно опускает цилиндр на воду. После этого
   * семантика hMm — глубина в воде (0..60). На reset / detachBeaker сбрасываем.
   * Без этого ученик не видит этапа «висит в воздухе» — баг 2026-05-18.
   */
  #airGapActive: boolean = false;
  /**
   * Последнее отображённое на динамометре значение (с шумом, как в реальном
   * приборе). Используется для F_A_meas = pAir - lastDisplayedForce, чтобы
   * F_A_meas ≠ F_A_theor (delta_pct отражает реальную «погрешность измерения»).
   * Без этого журнал записывал чистую теорию и delta_pct всегда = 0.
   */
  #lastDisplayedForceN: number = 0;
  /**
   * ResizeObserver для авто-перекалибровки при изменении окна. mmToPx и
   * startOffsetPx зависят от DOM-размеров (через getBoundingClientRect); без
   * пересчёта при ресайзе drag-distance↔h_mm уезжает.
   */
  #resizeObserver: ResizeObserver | null = null;
  #resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(refs: AVRefs) {
    this.#refs = refs;
    const persistedMode = getRecordMode(RECORD_MODE_KIT);
    this.#store = new Store<AVState>({ ...INITIAL_STATE, recordMode: persistedMode });
    applyRecordModeAttribute(persistedMode);
    injectRecordModeToggleStyles(document);

    this.#detachRecordModeToggle = renderRecordModeToggle(this.#refs.recordModeSlot, {
      kitId: RECORD_MODE_KIT,
      onChange: (mode) => this.#setRecordMode(mode),
    });

    this.#wireButtons();
    this.#wireDragDrop();
    this.#wireCylinderDrag();
    this.#wireResizeObserver();
    this.#unsubscribe = this.#store.subscribe(() => this.#render());
    this.#applyDynoForce(0);
    this.#render();
  }

  reset(): void {
    this.#lastRecordedSignature = '';
    this.#startOffsetPx = 0;
    this.#mmToPx = FALLBACK_MM_TO_PX;
    this.#effectiveMaxHMm = MAX_H_MM;
    this.#lastDisplayedForceN = 0;
    this.#airGapActive = false;
    // Сбрасываем X-guard offset (см. #calibrateGeometry).
    this.#refs.cylinderRig.style.marginLeft = '';
    this.#parkInCard('dyno');
    this.#parkInCard('cyl');
    this.#parkInCard('beaker');
    // Возврат уровня воды к базовому (после reset стакан снова в карточке,
    // но при следующем placeBeaker level уже на нужном значении).
    this.#refs.beaker.setAttribute('level', String(this.#baseLevelMl));
    this.#store.set({ ...INITIAL_STATE, recordMode: this.#store.get().recordMode });
    this.#applyDynoForce(0);
    this.#announce('Опыт сброшен, приборы возвращены в комплект');
  }

  destroy(): void {
    this.#endCylinderDrag();
    this.#resizeObserver?.disconnect();
    if (this.#resizeDebounceTimer !== null) {
      clearTimeout(this.#resizeDebounceTimer);
      this.#resizeDebounceTimer = null;
    }
    this.#detachRecordModeToggle?.();
    this.#unsubscribe?.();
    this.#dragController?.destroy();
    this.#resizeObserver = null;
    this.#detachRecordModeToggle = null;
    this.#unsubscribe = null;
    this.#dragController = null;
  }

  // ─── Программный API ────────────────────────────────────────────────

  placeDynamometer(): void {
    const s = this.#store.get();
    if (s.staged.dyno) return;
    this.#mountInStage('dyno');
    this.#store.set({ ...s, staged: { ...s.staged, dyno: true } });
    this.#announce('Динамометр на штативе');
  }

  attachCylinder(): void {
    const s = this.#store.get();
    if (!s.staged.dyno || s.staged.cyl) return;
    this.#mountInStage('cyl');
    this.#store.set({ ...s, staged: { ...s.staged, cyl: true } });
    this.#announce('Цилиндр №3 подвешен на динамометр');
  }

  placeBeaker(): void {
    const s = this.#store.get();
    if (s.staged.beaker) return;
    // Гарантируем базовый уровень воды на момент mount (важно если стакан
    // был сброшен в карточку — атрибут level сохранился, но мог быть изменён
    // через #applyBeakerLevel перед detach/reset).
    this.#refs.beaker.setAttribute('level', String(this.#baseLevelMl));
    this.#mountInStage('beaker');
    this.#store.set({ ...s, staged: { ...s.staged, beaker: true } });
    this.#announce('Стакан с водой на месте');
    (this.#refs.beaker as HTMLElement & { playFill?: () => void }).playFill?.();
    // Stages всё установлено — калибруем геометрию (mm↔px + offset «дно ⊨ вода»).
    // Откладываем на 2 кадра: layout + lab-beaker meniscus transition завершатся.
    // Активируем air-gap ДО calibration, чтобы первый рендер сразу подвесил
    // цилиндр над водой (нет «прыжка» от воды вверх через AIR_GAP_MM).
    // Сбрасывается при первом drag / submergeTo (см. #applySubmergence).
    if (this.#store.get().hMm === 0) {
      this.#airGapActive = true;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.#calibrateGeometry();
      // АВТО-фиксация P возд: устраняем «невидимый шаг» (кнопка baseline была
      // за нижним краем viewport-а при компактном экране, ученик не видел её
      // → drag блокировался без явной причины). Динамометр УЖЕ показывает
      // вес в воздухе, явная кнопка избыточна. См. §13 DoD пункт «-3» и
      // фидбек 2026-05-17: «не опускается цилиндр в стакан».
      // Берём актуальное состояние из store, а не из захваченной переменной s
      // (между placeBeaker и срабатыванием RAF пользователь мог отстегнуть dyno).
      const current = this.#store.get();
      if (current.pAirN === null && current.staged.dyno) {
        this.fixateBaseline();
      }
    }));
  }

  /**
   * Калибровка drag-by-thread под реальный layout. ВЫЗЫВАТЬ когда установлены
   * И цилиндр И стакан — иначе getBoundingClientRect возвращает 0×0.
   *
   * 1) #mmToPx — пикселей на 1 мм body цилиндра. Соответствие drag-distance ↔ h_mm.
   * 2) #startOffsetPx — translateY у cylinder-rig на h=0, такой что **нижняя кромка
   *    цилиндра ЛЕЖИТ на поверхности воды**. Без этого drag 0..80 мм визуально
   *    проходит через зону «над водой», и h_mm не соответствует submergence depth.
   *
   * После калибровки переотрисуем — transform пересчитается с новым offset.
   */
  #calibrateGeometry(): void {
    const cyl = this.#refs.cyl as HTMLElement & {
      getBodyHeightPx?: () => number;
      getBottomY?: () => number;
    };
    const beaker = this.#refs.beaker as HTMLElement & {
      getWaterSurfaceY?: () => number;
      getWaterBottomY?: () => number;
    };
    if (typeof cyl.getBodyHeightPx !== 'function' || typeof beaker.getWaterSurfaceY !== 'function') {
      return;
    }
    // ВАЖНО: CSS-transition `transform 220ms` на .av-cylinder-rig может быть
    // активной в момент calibration (например после ResizeObserver fire во
    // время snap-анимации). Тогда getBoundingClientRect вернёт ПРОМЕЖУТОЧНУЮ
    // DOM-позицию, и формула `baselineBottom = cylBottom - currentTransform`
    // выдаст не reliable значение → startOffsetPx накапливает ошибку.
    // Решение: временно отключаем transition + flush, измеряем «голую» позицию,
    // потом восстанавливаем. Класс `av-cylinder-dragging` уже делает transition:none.
    const wasDragging = document.body.classList.contains('av-cylinder-dragging');
    if (!wasDragging) document.body.classList.add('av-cylinder-dragging');
    void this.#refs.cylinderRig.offsetHeight; // force reflow

    const bodyH = cyl.getBodyHeightPx();
    if (bodyH > 20) {
      this.#mmToPx = bodyH / 80;
    }
    const waterY = beaker.getWaterSurfaceY();
    // Чистый baseline: временно убираем transform → измеряем cyl.bottom без
    // искажений. Раньше пытались вычитать predicted transform по формуле,
    // но при первой calibration cyl ещё не получил applied transform → формула
    // давала смещённое значение, startOffsetPx «съезжал» на airGapPx.
    const rig = this.#refs.cylinderRig;
    const savedInlineTransform = rig.style.transform;
    rig.style.transform = '';
    void rig.offsetHeight; // force reflow для honest rect
    const baselineBottom = cyl.getBottomY?.();
    rig.style.transform = savedInlineTransform;
    if (typeof baselineBottom === 'number' && Number.isFinite(waterY)) {
      // startOffsetPx — позиция при hMm=0 БЕЗ air-gap: нижняя кромка ровно
      // на поверхности воды. Air-gap применяется отдельно в #render через
      // вычитание AIR_GAP_MM × mmToPx, и снимается при первом drag / submerge.
      this.#startOffsetPx = Math.max(0, waterY - baselineBottom);
    }
    // ── X-Guard: проверяем что цилиндр выровнен над горлышком стакана ────
    // Без guard на узких viewport'ах center_x цилиндра может оказаться за
    // пределами mouth — визуально «груз проходит через стенку». В таком случае
    // подгоняем margin-left на av-cylinder-rig чтобы выровнять цилиндр над
    // центром горлышка. Пользователь сказал 2026-05-19: «через нос стакана груз
    // не должен проходить».
    const beakerWithMouth = beaker as HTMLElement & {
      getMouthBounds?: () => { left: number; right: number; center: number };
    };
    if (typeof beakerWithMouth.getMouthBounds === 'function') {
      const mouth = beakerWithMouth.getMouthBounds();
      const cylRect = cyl.getBoundingClientRect();
      const cylCenter = (cylRect.left + cylRect.right) / 2;
      const dx = mouth.center - cylCenter;
      // Только корректировка > 1px (избегаем jitter от round-trip floats).
      if (Math.abs(dx) > 1) {
        const rig = this.#refs.cylinderRig;
        const currentML = parseFloat(rig.style.marginLeft || '0');
        rig.style.marginLeft = `${(currentML + dx).toFixed(0)}px`;
      }
    }

    // ── Адаптивный clamp по дну стакана ──────────────────────────────────
    // Без этого clamp цилиндр пробивает дно стакана при коротком столбе воды
    // (например, level=180 + viewport 1366×768 ⇒ ~80px глубины ≪ ~128px body).
    // Образец — ArchimedesExperiment.#computeDipOffset с DIP_SAFETY_BOT_PX=8.
    //
    // SAFETY 14 px — empirically через e2e dip-geometry test: учитывает
    // (1) DOM-rendering точность ±1 px, (2) подвижку waterTop при
    // #applyBeakerLevel (capped 250), (3) реальный визуальный зазор.
    const SAFETY_BOTTOM_PX = 14;
    const bottomY = beaker.getWaterBottomY?.();
    if (typeof bottomY === 'number' && Number.isFinite(bottomY) && Number.isFinite(waterY)) {
      const availablePx = bottomY - waterY - SAFETY_BOTTOM_PX;
      if (this.#mmToPx > 0 && availablePx > 0) {
        const maxFromGeom = availablePx / this.#mmToPx;
        this.#effectiveMaxHMm = Math.max(0, Math.min(MAX_H_MM, maxFromGeom));
      } else {
        this.#effectiveMaxHMm = 0;
      }
    } else {
      this.#effectiveMaxHMm = MAX_H_MM;
    }
    // Если текущая hMm стала больше нового лимита (бывает после ресайза) —
    // подтянуть состояние, чтобы цилиндр не висел в зоне «пробитого дна».
    const s = this.#store.get();
    if (s.hMm > this.#effectiveMaxHMm) {
      this.#applySubmergence(this.#effectiveMaxHMm, false);
    } else {
      this.#applyBeakerLevel(s.hMm);
    }
    this.#render();
    // Восстанавливаем CSS-transition (см. начало метода). Если class висел
    // изначально (active drag), оставляем как было.
    if (!wasDragging) {
      // Восстанавливаем на следующий кадр, чтобы #render успел применить новый
      // transform БЕЗ анимации к calibrated startOffsetPx (иначе цилиндр
      // визуально «прыгнет» от старой позиции к новой, если они различаются).
      requestAnimationFrame(() => {
        document.body.classList.remove('av-cylinder-dragging');
      });
    }
  }

  detachDynamometer(): void {
    const s = this.#store.get();
    if (!s.staged.dyno) return;
    if (s.staged.cyl) this.detachCylinder();
    this.#parkInCard('dyno');
    this.#store.set({
      ...this.#store.get(),
      staged: { ...this.#store.get().staged, dyno: false },
      pAirN: null,
      hMm: 0,
      pNowN: 0,
    });
    this.#applyDynoForce(0);
  }

  detachCylinder(): void {
    const s = this.#store.get();
    if (!s.staged.cyl) return;
    this.#startOffsetPx = 0;
    this.#airGapActive = false;
    this.#parkInCard('cyl');
    this.#store.set({
      ...s,
      staged: { ...s.staged, cyl: false },
      pAirN: null,
      hMm: 0,
      pNowN: 0,
    });
    this.#applyDynoForce(0);
  }

  detachBeaker(): void {
    const s = this.#store.get();
    if (!s.staged.beaker) return;
    this.#startOffsetPx = 0;
    this.#effectiveMaxHMm = MAX_H_MM;
    this.#airGapActive = false;
    // Возвращаем стакан к базовому уровню (мог быть поднят #applyBeakerLevel).
    this.#refs.beaker.setAttribute('level', String(this.#baseLevelMl));
    this.#parkInCard('beaker');
    this.#store.set({
      ...s,
      staged: { ...s.staged, beaker: false },
      hMm: 0,
      pNowN: s.pAirN ?? 0,
    });
    if (s.pAirN !== null) this.#applyDynoForce(s.pAirN);
  }

  fixateBaseline(): void {
    const s = this.#store.get();
    if (!s.staged.dyno || !s.staged.cyl) return;
    if (s.pAirN !== null) return;
    const pAir = weightInAirN();
    this.#applyDynoForce(pAir);
    this.#store.set({ ...s, pAirN: pAir, hMm: 0, pNowN: pAir });
    this.#announce(`Вес в воздухе зафиксирован: ${pAir.toFixed(2)} Н`);
  }

  submergeTo(hMm: number): void {
    const s = this.#store.get();
    if (!s.staged.beaker || !s.staged.cyl || !s.staged.dyno) return;
    // Sync-calibration если RAF-цепочка из placeBeaker не отработала ещё
    // (типично в e2e/headless: setTimeout не гарантирует paint→RAF).
    if (this.#startOffsetPx === 0 && this.#mmToPx === FALLBACK_MM_TO_PX) {
      this.#calibrateGeometry();
    }
    // Авто-фиксация P возд если ещё не зафиксирован: устраняет race-condition.
    if (s.pAirN === null) {
      this.fixateBaseline();
    }
    this.#applySubmergence(hMm, /*announce*/ true);
    this.#maybeAutoRecord();
  }

  liftOut(): void {
    const s = this.#store.get();
    if (s.pAirN === null) return;
    this.#applyBeakerLevel(0);
    this.#applyDynoForce(s.pAirN);
    this.#store.set({ ...s, hMm: 0, pNowN: s.pAirN });
    this.#announce('Цилиндр поднят из воды');
  }

  recordCurrent(): void {
    const s = this.#store.get();
    if (s.pAirN === null || s.hMm === 0) return;
    const signature = `h=${s.hMm}`;
    if (this.#lastRecordedSignature === signature) return;
    this.#lastRecordedSignature = signature;
    // P_liq берём из «реального» показания динамометра (с шумом), а не из
    // s.pNowN (чистая теория pAir − Fa). Иначе F_A_meas ≡ F_A_theor и
    // ученик не видит погрешности измерения (delta_pct всегда = 0).
    this.#recordMeasurement({
      h_mm: s.hMm,
      P_air_N: s.pAirN,
      P_liq_N: this.#lastDisplayedForceN,
    });
  }

  getState(): AVState {
    return this.#store.get();
  }

  // ─── D&D и parkElement-паттерн (§26) ─────────────────────────────

  #wireDragDrop(): void {
    this.#dragController = new DragDropController(this.#refs.rootHost, (detail) =>
      this.#handleDrop(detail),
    );
  }

  #handleDrop(detail: EquipmentDropDetail): void {
    // Каноничные имена data-eq (§31.4): dyno-1, cyl-3, beaker.
    switch (detail.eqId) {
      case 'dyno-1':
        if (detail.dropzoneId === 'av-dyno-zone') this.placeDynamometer();
        break;
      case 'cyl-3':
        if (detail.dropzoneId === 'av-dyno-hook') this.attachCylinder();
        break;
      case 'beaker':
        if (detail.dropzoneId === 'av-beaker-zone') this.placeBeaker();
        break;
    }
  }

  #mountInStage(which: 'dyno' | 'cyl' | 'beaker'): void {
    const { card, comp, mount } = this.#getTriple(which);
    if (comp.parentElement === mount) return;
    mount.appendChild(comp);
    mount.hidden = false;
    card.dataset['attached'] = 'true';
    this.#playEntrance(which, mount);
  }

  #playEntrance(which: 'dyno' | 'cyl' | 'beaker', mount: HTMLElement): void {
    const cls =
      which === 'beaker' ? 'av-beaker-mount--entering'
      : which === 'dyno' ? 'av-dyno-mount--entering'
      : 'av-cylinder-rig--entering';
    mount.classList.remove(cls);
    void mount.offsetWidth; // force reflow so re-adding restarts the animation
    mount.classList.add(cls);
    mount.addEventListener('animationend', () => mount.classList.remove(cls), { once: true });
  }

  #parkInCard(which: 'dyno' | 'cyl' | 'beaker'): void {
    const { card, comp, mount } = this.#getTriple(which);
    if (comp.parentElement === card) return;
    card.appendChild(comp);
    delete card.dataset['attached'];
    mount.hidden = true;
    if (which === 'cyl') {
      this.#refs.cylinderRig.dataset['submergedMm'] = '0';
    }
  }

  #getTriple(which: 'dyno' | 'cyl' | 'beaker'): {
    card: HTMLElement;
    comp: HTMLElement;
    mount: HTMLElement;
  } {
    switch (which) {
      case 'dyno':
        return { card: this.#refs.cardDyno, comp: this.#refs.dyno, mount: this.#refs.dynoMount };
      case 'cyl':
        return { card: this.#refs.cardCyl, comp: this.#refs.cyl, mount: this.#refs.cylinderRig };
      case 'beaker':
        return {
          card: this.#refs.cardBeaker,
          comp: this.#refs.beaker,
          mount: this.#refs.beakerMount,
        };
    }
  }

  // ─── Общая логика ──────────────────────────────────────────────

  #wireButtons(): void {
    this.#refs.btnBaseline.addEventListener('click', () => this.fixateBaseline());
    this.#refs.btnLift.addEventListener('click', () => this.liftOut());
    this.#refs.resetBtn.addEventListener('click', () => this.reset());
    this.#refs.recordPendingBtn.addEventListener('click', () => this.recordCurrent());
    this.#refs.detachDynoBtn.addEventListener('click', () => this.detachDynamometer());
    this.#refs.detachCylBtn.addEventListener('click', () => this.detachCylinder());
    this.#refs.detachBeakerBtn.addEventListener('click', () => this.detachBeaker());
  }

  // ─── Drag-by-thread цилиндра (continuous h_mm от позиции мыши) ──────

  #wireCylinderDrag(): void {
    this.#refs.cylinderRig.addEventListener('pointerdown', this.#handleCylinderPointerDown);
  }

  /**
   * Подписка на ResizeObserver: при изменении окна (responsive) DOM-размеры
   * стакана и цилиндра меняются → mmToPx и startOffsetPx устаревают →
   * drag-distance↔h_mm уезжает. Перекалибровка только если установлены
   * И ЦИЛИНДР И СТАКАН (иначе getBoundingClientRect возвращает 0×0).
   * Debounce 120 ms — иначе при плавном ресайзе перерасчёт идёт 60 раз/сек.
   */
  #wireResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.#resizeObserver = new ResizeObserver(() => {
      if (this.#resizeDebounceTimer !== null) {
        clearTimeout(this.#resizeDebounceTimer);
      }
      this.#resizeDebounceTimer = setTimeout(() => {
        this.#resizeDebounceTimer = null;
        const s = this.#store.get();
        if (s.staged.cyl && s.staged.beaker) {
          this.#calibrateGeometry();
        }
      }, 120);
    });
    this.#resizeObserver.observe(this.#refs.rootHost);
  }

  #handleCylinderPointerDown = (ev: PointerEvent): void => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    const s = this.#store.get();
    // Drag доступен только если установка собрана и baseline зафиксирован.
    if (s.pAirN === null || !s.staged.beaker) return;
    ev.preventDefault();
    ev.stopPropagation();

    this.#endCylinderDrag();

    const startHMm = s.hMm;
    const startClientY = ev.clientY;

    const moveListener = (mv: PointerEvent): void => {
      const drag = this.#cylinderDrag;
      if (!drag || mv.pointerId !== drag.pointerId) return;
      mv.preventDefault();
      const dy = mv.clientY - drag.startClientY;
      // Первые drag.initialAirGapPx px = «закрытие воздушного зазора»
      // (цилиндр опускается с воздуха к воде, hMm остаётся 0). После этого
      // начинается реальное погружение в воду. Используем СНАПШОТ air-gap
      // из drag-state, а не текущий #airGapActive — иначе после deactivation
      // h_mm прыгает на airGapPx/mmToPx.
      const adjustedDy = dy - drag.initialAirGapPx;
      const rawH = drag.startHMm + adjustedDy / this.#mmToPx;
      const clamped = Math.max(0, Math.min(this.#effectiveMaxHMm, rawH));
      if (Math.abs(dy) >= 3) drag.didTrigger = true;
      this.#applySubmergence(clamped, /*announce*/ false);
      // Дополнительно перерисовываем нить — во время drag цилиндр едет вниз
      // через transform translateY, но crank-точка верхнего крюка тоже едет
      // → нить должна тянуться. #render() уже вызвался через store-subscribe,
      // но getBoundingClientRect для transform-ed элемента возвращает текущую
      // позицию, поэтому line обновится автоматически. Но если #render() будет
      // оптимизирован skip-render'ом — оставляем explicit вызов на всякий случай.
    };

    const upListener = (up: PointerEvent): void => {
      const drag = this.#cylinderDrag;
      if (!drag || up.pointerId !== drag.pointerId) return;
      const finalH = this.#store.get().hMm;
      // Магнитный snap к ближайшему эталону ФИПИ (20/40/60), если рядом.
      // Но эталон должен быть ≤ #effectiveMaxHMm (не предлагать недостижимый).
      let snapped = finalH;
      for (const target of SNAP_TARGETS_MM) {
        if (target > this.#effectiveMaxHMm) continue;
        if (Math.abs(finalH - target) <= SNAP_RADIUS_MM) {
          snapped = target;
          break;
        }
      }
      // Порядок важен: СНАЧАЛА снимаем класс `av-cylinder-dragging` (он
      // отключает CSS-transition), ПОТОМ применяем snap — тогда CSS-анимация
      // 220ms cubic-bezier «плавно дотянет» цилиндр к эталонной точке.
      // Раньше snap скакал мгновенно, потому что класс ещё висел при render.
      this.#endCylinderDrag();
      if (snapped !== finalH) {
        this.#applySubmergence(snapped, /*announce*/ true);
      } else if (drag.didTrigger) {
        // Округление до целого мм без снэпа.
        const rounded = Math.round(finalH);
        if (rounded !== finalH) this.#applySubmergence(rounded, /*announce*/ true);
      }
      // fully-auto: auto-record при попадании на эталонный уровень.
      this.#maybeAutoRecord();
    };

    this.#cylinderDrag = {
      pointerId: ev.pointerId,
      startClientY,
      startHMm,
      initialAirGapPx: this.#airGapActive ? AIR_GAP_MM * this.#mmToPx : 0,
      didTrigger: false,
      moveListener,
      upListener,
    };
    document.body.classList.add('av-cylinder-dragging');
    window.addEventListener('pointermove', moveListener, { passive: false });
    window.addEventListener('pointerup', upListener);
    window.addEventListener('pointercancel', upListener);
    try {
      this.#refs.cylinderRig.setPointerCapture(ev.pointerId);
    } catch {
      /* noop для тестов */
    }
  };

  #endCylinderDrag(): void {
    const drag = this.#cylinderDrag;
    if (!drag) return;
    window.removeEventListener('pointermove', drag.moveListener);
    window.removeEventListener('pointerup', drag.upListener);
    window.removeEventListener('pointercancel', drag.upListener);
    document.body.classList.remove('av-cylinder-dragging');
    try {
      this.#refs.cylinderRig.releasePointerCapture(drag.pointerId);
    } catch {
      /* noop */
    }
    this.#cylinderDrag = null;
  }

  /**
   * Применить заданную глубину погружения: обновить h_mm, force динамометра,
   * уровень воды в стакане (вытеснение).
   *
   * Централизованный clamp по [0, #effectiveMaxHMm] гарантирует, что ВСЕ
   * пути — drag-by-thread, программный API `submergeTo`, авто-перекалибровка
   * — не могут пробить дно стакана. Иначе при `submergeTo(80)` без clamp
   * цилиндр уходил ниже дна (фидбек 2026-05-17 «груз проваливается»).
   */
  #applySubmergence(hMm: number, announce: boolean): void {
    const s = this.#store.get();
    if (s.pAirN === null) return;
    // NaN/Infinity safe: Math.min/max не отбрасывают NaN. Явно нормализуем.
    const safe = Number.isFinite(hMm) ? hMm : 0;
    const clampedH = Math.max(0, Math.min(this.#effectiveMaxHMm, safe));
    // Первое реальное погружение (h>0) → снимаем air-gap. CSS-transition 220 ms
    // плавно опустит цилиндр от air-position до water-position + h_mm.
    if (clampedH > 0 && this.#airGapActive) {
      this.#airGapActive = false;
    }
    const Fa = theoreticalBuoyancyN(clampedH);
    const pLiq = s.pAirN - Fa;
    this.#applyDynoForce(pLiq);
    this.#applyBeakerLevel(clampedH);
    this.#store.set({ ...s, hMm: clampedH, pNowN: pLiq });
    if (announce) {
      this.#announce(
        `h=${clampedH.toFixed(0)} мм, P изм=${pLiq.toFixed(2)} Н, F_А=${Fa.toFixed(2)} Н`,
      );
    }
  }

  /**
   * Декоративный подъём воды в стакане при погружении (visual cue).
   *
   * Физическая правда: V_вытесн = h × 0.7 см³/мм. При h=60: 42 мл (5% от
   * 200 мл) — visually rise ~6 px при наших пропорциях. Но если применять
   * как буквальный rise, calibrated startOffsetPx становится неверным: вода
   * поднимается выше calibrated waterY → цилиндр визуально кажется лишь
   * касающимся воды, а не погружённым.
   *
   * Решение: коэффициент 0.2 — water rises чуть-чуть (visual hint that water
   * is being displaced), но calibration остаётся валидной (cyl.bottom при
   * h=60 явно НИЖЕ современной поверхности воды).
   */
  #applyBeakerLevel(hMm: number): void {
    const V_displaced_cm3 = submergedVolumeCm3(hMm);
    const VISUAL_RISE_FACTOR = 0.2;
    const newLevelMl = Math.min(
      250,
      this.#baseLevelMl + V_displaced_cm3 * VISUAL_RISE_FACTOR,
    );
    this.#refs.beaker.setAttribute('level', newLevelMl.toFixed(1));
  }

  #setRecordMode(mode: RecordMode): void {
    applyRecordModeAttribute(mode);
    this.#store.set({ ...this.#store.get(), recordMode: mode });
  }

  #maybeAutoRecord(): void {
    if (this.#store.get().recordMode === 'fully-auto') {
      const s = this.#store.get();
      if (REFERENCE_LEVELS_MM.includes(s.hMm as 20 | 40 | 60)) {
        this.recordCurrent();
      }
    }
  }

  #recordMeasurement(payload: { h_mm: number; P_air_N: number; P_liq_N: number }): void {
    const timestamp = Date.now() + Math.random();
    const idx = this.#store.get().rows.length + 1;
    const V_cm3 = submergedVolumeCm3(payload.h_mm);
    const F_A_meas_N = measuredBuoyancyN(payload.P_air_N, payload.P_liq_N);
    const F_A_theor_N = theoreticalBuoyancyN(payload.h_mm);
    const delta_pct =
      Math.abs(F_A_theor_N) < 1e-9
        ? 0
        : ((F_A_meas_N - F_A_theor_N) / F_A_theor_N) * 100;

    const row: JournalRow = {
      idx,
      timestamp,
      values: {
        h_mm: payload.h_mm,
        V_cm3,
        P_air_N: payload.P_air_N,
        P_liq_N: payload.P_liq_N,
        F_A_meas_N,
        F_A_theor_N,
        delta_pct,
      },
    };
    this.#store.set({ ...this.#store.get(), rows: [...this.#store.get().rows, row] });
    this.#announce(
      `Записано измерение №${idx}: h=${payload.h_mm} мм, F_А=${F_A_meas_N.toFixed(2)} Н`,
    );
  }

  #applyDynoForce(forceN: number): void {
    const noisy = forceN + (Math.random() - 0.5) * 2 * DYNO_NOISE_N;
    // Сохраняем последнее ПОКАЗАННОЕ значение (с шумом — как реальный
    // прибор). Используется в #recordMeasurement как P_изм, чтобы
    // F_A_meas = pAir − P_изм не совпадало с теорией → delta_pct ≠ 0.
    this.#lastDisplayedForceN = noisy;
    this.#refs.dyno.setAttribute('force', noisy.toFixed(3));
  }

  /** Текущий «активный» шаг для степпера. */
  #computeActiveStep(s: AVState): StepId {
    if (!s.staged.dyno) return 1;
    if (!s.staged.cyl) return 2;
    if (!s.staged.beaker) return 3;
    // pAirN авто-фиксируется при placeBeaker, поэтому отдельного шага нет.
    if (s.rows.length === 0) return 4;
    return 5;
  }

  #render(): void {
    const s = this.#store.get();
    const active = this.#computeActiveStep(s);

    // ─── Степпер ──
    this.#refs.steps.querySelectorAll<HTMLElement>('.step').forEach((stepEl) => {
      const n = Number(stepEl.dataset['step']) as StepId;
      let state: StepState;
      if (n < active) state = 'done';
      else if (n === active) state = 'active';
      else state = 'pending';
      stepEl.dataset['state'] = state;
    });

    // ─── Hint-bar ──
    this.#refs.hint.textContent = STEP_HINTS[active];

    // ─── Сцена: показ/скрытие mount-zones + detach-кнопок ──
    this.#refs.dynoMount.hidden = !s.staged.dyno;
    this.#refs.dropzoneDyno.hidden = s.staged.dyno;
    this.#refs.detachDynoBtn.hidden = !s.staged.dyno;

    this.#refs.cylinderRig.hidden = !s.staged.cyl;
    this.#refs.detachCylBtn.hidden = !s.staged.cyl;

    this.#refs.beakerMount.hidden = !s.staged.beaker;
    this.#refs.dropzoneBeaker.hidden = s.staged.beaker;
    this.#refs.detachBeakerBtn.hidden = !s.staged.beaker;

    // Цилиндр едет через CSS translateY с #startOffsetPx (поднимаем dno на воду
    // при h=0) + h_mm × #mmToPx (continuous drag-by-thread).
    // Air-gap (если активен) — visual-offset: цилиндр на AIR_GAP_MM ВЫШЕ воды,
    // снимется при первом погружении → CSS-transition плавно опустит.
    const airGapPx = this.#airGapActive ? AIR_GAP_MM * this.#mmToPx : 0;
    const ty = this.#startOffsetPx + s.hMm * this.#mmToPx - airGapPx;
    this.#refs.cylinderRig.style.transform = `translateY(${ty.toFixed(1)}px)`;
    // data-атрибут оставлен для CSS-классов состояний (cursor, outline).
    this.#refs.cylinderRig.dataset['submergedMm'] = String(s.hMm.toFixed(0));

    // ─── Нить SVG line dyno-hook ↔ cyl-thread-hook ──
    // Обновляется на каждом #render() + дополнительно в drag move (через
    // #updateThreadLine из moveListener). Layer absolute поверх stage-area.
    this.#updateThreadLine(s.staged.dyno && s.staged.cyl);

    // ─── Depth-label «h=X мм» рядом с цилиндром ──
    // Видим только когда установка собрана и baseline зафиксирован. Обновляется
    // тут (render) + во время active drag (там оптимизирован inline-update).
    this.#updateDepthLabel(s);

    // ─── Submerge-controls (видны только после dyno+cyl) ──
    const ready = s.staged.dyno && s.staged.cyl;
    const readyDeep = ready && s.staged.beaker;
    const canDrag = readyDeep && s.pAirN !== null;
    const needBaseline = readyDeep && s.pAirN === null;
    this.#refs.submergeControls.hidden = !ready;
    this.#refs.btnBaseline.disabled = !ready || s.pAirN !== null;
    this.#refs.btnLift.disabled = s.pAirN === null || s.hMm === 0;
    this.#refs.dragTip.hidden = !canDrag || s.hMm > 0;
    // Cursor + draggable-state на rig: для CSS .av-cylinder-rig[data-can-drag] и data-need-baseline.
    this.#refs.cylinderRig.dataset['canDrag'] = canDrag ? 'true' : 'false';
    this.#refs.cylinderRig.dataset['needBaseline'] = needBaseline ? 'true' : 'false';
    this.#refs.cylinderRig.title = canDrag
      ? 'Потяните вниз — погружение'
      : needBaseline
        ? 'Сначала нажмите «Зафиксировать P возд»'
        : '';

    // ─── Журнал ──
    const hasRows = s.rows.length > 0;
    this.#refs.journalEmpty.hidden = hasRows;
    this.#refs.formulaDisplay.hidden = !hasRows;
    this.#refs.journalHost.hidden = !hasRows;
    this.#refs.measurementCount.hidden = !hasRows;
    if (hasRows) this.#refs.measurementCount.textContent = String(s.rows.length);
    // Empty-state — контекстный текст по состоянию сборки. Без этого журнал
    // всегда писал «Соберите установку…», даже когда установка уже стоит на
    // столе и ученик удивлялся — что ещё собирать.
    if (!hasRows) {
      const allStaged = s.staged.dyno && s.staged.cyl && s.staged.beaker;
      let emptyText: string;
      if (!allStaged) {
        emptyText =
          'Соберите установку: динамометр → цилиндр №3 → стакан с водой.';
      } else if (s.pAirN === null) {
        emptyText =
          'Установка собрана. Динамометр сейчас показывает вес в воздухе — он зафиксируется автоматически.';
      } else {
        emptyText =
          'Потяните цилиндр вниз по нити на 20 / 40 / 60 мм и записывайте F_А = P возд − P изм.';
      }
      this.#refs.journalEmpty.textContent = emptyText;
    }

    renderJournalTable(this.#refs.journalHost, ARCHIMEDES_VOLUME_SPEC, s.rows, {
      mode: s.recordMode,
      onCellInput: () => {},
      onVerify: () => {},
    });

    // ─── Pending плашка (semi-auto) ──
    const showPending =
      s.recordMode === 'semi-auto' &&
      s.pAirN !== null &&
      s.hMm > 0 &&
      this.#lastRecordedSignature !== `h=${s.hMm}`;
    this.#refs.recordPendingSlot.hidden = !showPending;
    if (showPending) {
      // F_A в summary считаем из зашумлённого показания, чтобы preview
      // совпадал с тем, что попадёт в журнал (см. recordCurrent).
      // Компактный формат «h=20, F=0,13» — вместил единицы кнопкой узкой
      // floating-panel'и (320 px) на 1366×768.
      const fA = s.pAirN! - this.#lastDisplayedForceN;
      const hStr = Math.round(s.hMm);
      this.#refs.recordPendingSummary.textContent = `· h=${hStr}, F=${fA.toFixed(2)}`;
    }
  }

  #announce(message: string): void {
    this.#refs.liveRegion.textContent = message;
  }

  /**
   * Обновить SVG-нить между нижним крюком динамометра и верхним крюком цилиндра.
   * Координаты hook-точек считаются через API компонентов:
   *   - lab-dynamometer.getWeightHookPosition() — нижний крюк (viewport-space через rect)
   *   - lab-metal-weight.getThreadHookPosition() — верхний крюк (тоже viewport)
   * Переводим в stage-area-relative для SVG overlay.
   *
   * Без этого нить была DIV 1.5px×36px фикс. высоты — не привязана к крючкам,
   * не реагировала на drag. Пользователь жаловался «как отдельная линия, не
   * похожа на реальность» (2026-05-19 рефлексия).
   */
  #updateThreadLine(visible: boolean): void {
    const line = this.#refs.threadLine;
    if (!visible) {
      line.setAttribute('visibility', 'hidden');
      return;
    }
    const dyno = this.#refs.dyno as HTMLElement & {
      getWeightHookPosition?: () => { x: number; y: number };
    };
    const cyl = this.#refs.cyl as HTMLElement & {
      getThreadHookPosition?: () => { x: number; y: number };
    };
    if (typeof dyno.getWeightHookPosition !== 'function' || typeof cyl.getThreadHookPosition !== 'function') {
      line.setAttribute('visibility', 'hidden');
      return;
    }
    // Координаты в host-space компонентов: rect.left/top + offset_inside.
    // getWeightHookPosition возвращает offset_inside (без top-left хоста), поэтому
    // прибавляем boundingRect компонента.
    const dynoRect = dyno.getBoundingClientRect();
    const cylRect = cyl.getBoundingClientRect();
    const dynoHook = dyno.getWeightHookPosition();
    const cylHook = cyl.getThreadHookPosition();
    // Stage-area — origin для SVG overlay (он position:absolute inset:0).
    const stageRect = this.#refs.stageArea.getBoundingClientRect();

    const x1 = dynoRect.left + dynoHook.x - stageRect.left;
    const y1 = dynoRect.top + dynoHook.y - stageRect.top;
    const x2 = cylRect.left + cylHook.x - stageRect.left;
    const y2 = cylRect.top + cylHook.y - stageRect.top;

    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
      line.setAttribute('visibility', 'hidden');
      return;
    }
    line.setAttribute('x1', x1.toFixed(1));
    line.setAttribute('y1', y1.toFixed(1));
    line.setAttribute('x2', x2.toFixed(1));
    line.setAttribute('y2', y2.toFixed(1));
    line.setAttribute('visibility', 'visible');
  }

  /**
   * Обновить live-индикатор «h = X мм» рядом с цилиндром. Виден когда
   * установка собрана + baseline зафиксирован. Позиция — рядом с верхней
   * кромкой цилиндра справа, чтобы не перекрывать шкалу на нём самом.
   */
  #updateDepthLabel(s: AVState): void {
    const label = this.#refs.depthLabel;
    const visible = s.staged.dyno && s.staged.cyl && s.staged.beaker && s.pAirN !== null;
    if (!visible) {
      label.hidden = true;
      return;
    }
    label.hidden = false;
    this.#refs.depthLabelValue.textContent = Math.round(s.hMm).toString();
    // Active state для подсветки при h>0.
    if (s.hMm > 0) {
      label.dataset['state'] = 'active';
    } else {
      delete label.dataset['state'];
    }
    // Position: рядом с верхней кромкой цилиндра.
    const cyl = this.#refs.cyl as HTMLElement & { getBodyTopY?: () => number };
    if (typeof cyl.getBodyTopY !== 'function') return;
    const stageRect = this.#refs.stageArea.getBoundingClientRect();
    const cylRect = cyl.getBoundingClientRect();
    const topY = cyl.getBodyTopY() - stageRect.top;
    // СЛЕВА от цилиндра: detach-× цилиндра и стакана живут справа, поэтому
    // метку уводим влево, чтобы ничего не перекрывалось (clutter-fix).
    const labelW = label.getBoundingClientRect().width || 56;
    const xLeft = cylRect.left - stageRect.left - labelW - 8;
    label.style.top = `${topY.toFixed(0)}px`;
    label.style.left = `${Math.max(4, xLeft).toFixed(0)}px`;
  }
}
