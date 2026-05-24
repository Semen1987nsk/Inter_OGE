/**
 * FrictionExperiment — оркестратор опытов 2.2 «Трение скольжения» и 2.3 «Работа силы трения».
 *
 * Workflow:
 *   1. Drag брусок → поверхность направляющей (snap-zone TRACK).
 *   2. Drag грузы → верх бруска (snap-zone TOP_OF_BLOCK).
 *   3. Drag динамометр → крючок бруска слева (snap-zone BLOCK_HOOK).
 *   4. Тяга динамометра вправо (pointer-drag по корпусу прицепленного дин.) →
 *      brick остаётся в покое пока F < μ_static·N → переход в скольжение →
 *      f = μ_kin·N → запись в журнал.
 *
 * 4 задачи переключаются в stepper'е:
 *   A — измерение μ
 *   B — измерение работы силы трения
 *   C — F_тр(N)
 *   D — F_тр(поверхность)
 *
 * См. REFERENCE.md (соседняя папка 2-1-spring) — каноническая архитектура.
 */

import type { LabFrictionTrack } from '@/ui/components/lab-friction-track';
import type { LabBlock } from '@/ui/components/lab-block';
import type { LabDynamometerH } from '@/ui/components/lab-dynamometer-h';
import type { LabEquipmentCard } from '@/ui/components/lab-equipment-card';
import type { LabGraph } from '@/ui/components/lab-graph';
import { DragController, type SnapZone } from './controller/DragController';
import { HintEngine } from './controller/HintEngine';
import { Store } from '@controller/Store';
import {
  coefficientFromForces,
  massToForce,
  normalForce,
  roundTo,
  staticToKineticTransition,
  totalMass,
  workOfFriction,
} from '@physics/friction/FrictionModel';
import {
  type FrictionMeasurement,
  SURFACE_CONFIG,
  type SurfaceId,
  type TaskId,
} from '@/types/friction';
import {
  type AttachKind,
  DYNAMOMETER_CONFIG,
  type EquipmentId,
  type FrictionSetupState,
  INITIAL_SETUP_STATE,
  type StackedWeight,
  WEIGHT_CONFIG,
} from '@/types/friction/setup';

// §20.4 + §21 — единый журнал v2 + record-mode toggle (зеркаль spring-stiffness).
import {
  getRecordMode,
  injectRecordModeToggleStyles,
  renderRecordModeToggle,
  type RecordMode,
} from '@labosfera/shared-spa/lib/record-mode';
import { renderJournalTable } from '@labosfera/shared-spa/lib/journal/render';
import { verifyRow } from '@labosfera/shared-spa/lib/journal/verify';
import { parseRu } from '@labosfera/shared-spa/lib/journal/format';
import {
  FRICTION_SPEC,
  FRICTION_WORK_SPEC,
} from '@labosfera/shared-spa/lib/journal/specs';
import type {
  JournalRow,
  JournalSpec,
  JournalVerdict,
} from '@labosfera/shared-spa/lib/journal/types';

/** Тот же ключ record-mode, что использует spring-stiffness в kit-2. */
const RECORD_MODE_KIT = 'kit-2';

export interface ExperimentRefs {
  stage: HTMLElement;
  trackContainer: HTMLElement;
  track: LabFrictionTrack;
  dragOverlay: HTMLElement;
  dropZoneTrack: HTMLElement; // зона приёма для бруска
  dropZoneBlockTop: HTMLElement; // зона приёма для грузов на брусок
  dropZoneBlockHook: HTMLElement; // зона приёма для динамометра
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
  measurementPanel: HTMLElement;
  measurementToggle: HTMLButtonElement;
  measurementCount: HTMLElement;
  steps: HTMLElement; // task switcher (A/B/C/D)
  surfaceToggle: HTMLElement; // переключатель поверхности A/B
  weighBtn: HTMLButtonElement; // кнопка «Взвесить брусок»
  /** Живой readout пройденного пути s (виден только в Task B). */
  pathReadout: HTMLElement;
  pathReadoutValue: HTMLElement;
  /** §20.4 — slot для record-mode toggle. */
  recordModeSlot?: HTMLElement | undefined;
  /** §21 — контейнер для shared `renderJournalTable`. */
  journalHost?: HTMLElement | undefined;
  /** §21.10 — pending-плашка «Записать в журнал» (semi-auto). */
  recordPendingSlot?: HTMLElement | undefined;
  recordPendingBtn?: HTMLButtonElement | undefined;
  recordPendingSummary?: HTMLElement | undefined;
}

export class FrictionExperiment {
  #refs: ExperimentRefs;
  #store: Store<FrictionSetupState>;
  #drag: DragController;
  #hints: HintEngine;
  #blockMount: HTMLDivElement;
  #stackedMount: HTMLDivElement; // контейнер для грузов сверху бруска
  #pullString: HTMLDivElement; // визуальная нитка дин → крючок бруска
  #attachedBlockEl: LabBlock | null = null;
  #attachedDynoEl: LabDynamometerH | null = null;
  #attachedWeightEls: HTMLElement[] = [];
  #cardByEquipmentId = new Map<EquipmentId, LabEquipmentCard>();
  #pullActive = false; // активна ли тяга мышью
  #pullPointerId: number | null = null;
  #pullStartX = 0;
  #pullStartForce = 0;
  #slidingRafId: number | null = null;
  #slidingStartTime = 0;
  #slidingStartPosMm = 0;
  /** Пройденный за текущее скольжение путь (мм) = block.positionMm − slidingStartPosMm. */
  #slidDistanceMm = 0;
  /** id таймера авто-перехода в ready-to-record (250ms). Чистится в #stopSliding/destroy. */
  #readyTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // §21 — журнал v2: drafts (черновики input'ов) и verdicts (результаты ✓-проверки).
  // ключ = timestamp измерения (sentinel -1 = empty manual row).
  #journalDrafts = new Map<number, Record<string, number>>();
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #detachRecordModeToggle: (() => void) | null = null;
  /** Сигнатура последней записанной строки — для дедупликации pending-плашки. */
  #lastRecordedSignature = '';

  constructor(refs: ExperimentRefs) {
    this.#refs = refs;
    this.#store = new Store<FrictionSetupState>({ ...INITIAL_SETUP_STATE });
    this.#drag = new DragController(refs.dragOverlay);
    this.#hints = new HintEngine(refs.hintBar, refs.liveRegion);

    this.#blockMount = document.createElement('div');
    this.#blockMount.className = 'block-mount';
    refs.trackContainer.appendChild(this.#blockMount);

    this.#stackedMount = document.createElement('div');
    this.#stackedMount.className = 'stacked-mount';
    this.#blockMount.appendChild(this.#stackedMount);

    // Нитка-трос: добавляется в trackContainer (НЕ в blockMount, чтобы не перемещаться вместе с бруском).
    // Один и тот же conn-string обслуживает любой текущий dyno.
    this.#pullString = document.createElement('div');
    this.#pullString.className = 'pull-string';
    this.#pullString.hidden = true;
    refs.trackContainer.appendChild(this.#pullString);

    this.#wireUp();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
  }

  // ─── Public API (для тестов и отладки) ─────────────────────

  /** Записанные измерения (read-only snapshot для тестов и отладки). */
  get measurements(): ReadonlyArray<FrictionMeasurement> {
    return this.#store.get().measurements;
  }

  /** Поставить брусок на направляющую. */
  attachBlock(): boolean {
    const card = this.#cardByEquipmentId.get('block');
    if (!card) return false;
    const el = card.querySelector<LabBlock>('lab-block');
    if (!el) return false;
    return this.#attachBlock(el);
  }

  /** Прицепить динамометр к крючку бруска. */
  attachDynamometerById(equipmentId: 'dyno-1' | 'dyno-5'): boolean {
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (!card) return false;
    const el = card.querySelector<LabDynamometerH>('lab-dynamometer-h');
    if (!el) return false;
    return this.#attachDynamometer(el, equipmentId);
  }

  /** Положить груз сверху бруска. */
  attachWeightById(equipmentId: EquipmentId): boolean {
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (!card) return false;
    const el = card.querySelector<HTMLElement>('lab-flat-weight');
    if (!el) return false;
    return this.#stackWeight(el, equipmentId);
  }

  /**
   * Программный API для тестов: детерминированно «прокатить» брусок на заданную
   * позицию (мм) от начала направляющей. Эквивалентно тому, что делает RAF-цикл
   * #startSliding, но без зависимости от тайминга. Обновляет readout пути.
   */
  slideBlockTo(positionMm: number): void {
    if (!this.#attachedBlockEl) return;
    const clamped = Math.max(0, Math.min(350, positionMm));
    this.#store.update((st) => ({
      block: st.block ? { ...st.block, positionMm: clamped } : { positionMm: clamped },
    }));
    this.#slidDistanceMm = Math.max(0, clamped - this.#slidingStartPosMm);
    this.#updatePathReadout();
  }

  /** Программно приложить силу к динамометру (для автотестов и для pointer-pull). */
  applyForce(force: number): void {
    if (!this.#attachedDynoEl) return;
    // Граница системы: публичный метод — защита от NaN/Infinity (Math.max молча пропускает NaN).
    if (!Number.isFinite(force)) return;
    const s = this.#store.get();
    const totalM = (this.#attachedBlockEl?.mass ?? 0) + totalMass(s.weightsOnBlock);
    if (totalM <= 0) return;
    const N = normalForce(totalM);
    const surface = SURFACE_CONFIG[s.surfaceId];
    const transition = staticToKineticTransition(
      force,
      N,
      surface.muStatic,
      surface.muKinetic,
    );
    const wasSliding = s.measurementStep === 'sliding' || s.measurementStep === 'ready-to-record';
    const newStep: typeof s.measurementStep = transition.isSliding
      ? 'sliding'
      : force > 0
        ? 'pulling-static'
        : 'awaiting-pull';
    this.#store.set({
      appliedForce: force,
      slidingVelocity: transition.isSliding ? Math.max(50, transition.excessForce * 200) : 0,
      measurementStep: newStep,
    });
    this.#attachedDynoEl.setAttribute('force', transition.actualFrictionN.toFixed(2));

    // Запускаем/останавливаем анимацию скольжения по необходимости
    if (transition.isSliding && !wasSliding) {
      this.#startSliding();
    } else if (!transition.isSliding && wasSliding) {
      this.#stopSliding();
    }

    if (transition.isSliding) {
      // После 250ms скольжения — авто-переход в ready-to-record (показания стабильны).
      // applyForce во время тяги вызывается на каждый pointermove → пересоздаём таймер,
      // а не плодим их; id храним, чтобы очистить при #stopSliding/reset/destroy (без утечки).
      if (this.#readyTimeoutId !== null) clearTimeout(this.#readyTimeoutId);
      this.#readyTimeoutId = setTimeout(() => {
        this.#readyTimeoutId = null;
        if (this.#store.get().measurementStep === 'sliding') {
          this.#store.set({ measurementStep: 'ready-to-record' });
          // fully-auto: программа сама пишет измерение, как только стабилизировалось.
          if (this.#recordMode() === 'fully-auto') {
            this.recordMeasurement();
          }
          this.#refreshUi();
        }
      }, 250);
    }
    this.#refreshUi();
  }

  /** Стартует RAF-цикл, двигающий брусок вправо вдоль направляющей. */
  #startSliding(): void {
    if (this.#slidingRafId !== null) cancelAnimationFrame(this.#slidingRafId);
    this.#slidingStartTime = performance.now();
    this.#slidingStartPosMm = this.#store.get().block?.positionMm ?? 0;
    const tick = (now: number): void => {
      const s = this.#store.get();
      if (s.measurementStep !== 'sliding' && s.measurementStep !== 'ready-to-record') {
        this.#slidingRafId = null;
        return;
      }
      // velocity у нас в "мм / сек" (приблизительно — для визуализации)
      const dtSec = (now - this.#slidingStartTime) / 1000;
      const velocity = s.slidingVelocity; // мм/сек
      const newPosMm = this.#slidingStartPosMm + velocity * dtSec;
      // Ограничение: брусок не выезжает за конец направляющей (макс ~350 мм от старта)
      const MAX_TRAVEL_MM = 350;
      const clampedPos = Math.min(MAX_TRAVEL_MM, newPosMm);
      if (clampedPos !== s.block?.positionMm) {
        this.#store.update((st) => ({
          block: st.block ? { ...st.block, positionMm: clampedPos } : st.block,
        }));
        this.#updateMountPosition();
      }
      // Путь скольжения = смещение бруска от точки срыва. Обновляем readout «s = NN,N см».
      this.#slidDistanceMm = Math.max(0, clampedPos - this.#slidingStartPosMm);
      this.#updatePathReadout();
      if (clampedPos >= MAX_TRAVEL_MM) {
        // Дошли до конца — останавливаемся
        this.#slidingRafId = null;
        return;
      }
      this.#slidingRafId = requestAnimationFrame(tick);
    };
    this.#slidingRafId = requestAnimationFrame(tick);
  }

  /**
   * Текущий путь, пройденный бруском за скольжение (мм).
   * Берётся из state (block.positionMm − slidingStartPosMm), чтобы быть корректным
   * даже если RAF не успел обновить #slidDistanceMm (happy-dom тесты без rAF-цикла).
   */
  #currentSlidDistanceMm(): number {
    const posMm = this.#store.get().block?.positionMm ?? 0;
    const fromState = Math.max(0, posMm - this.#slidingStartPosMm);
    return Math.max(fromState, this.#slidDistanceMm);
  }

  /** Обновляет живой readout пути «s = NN,N см» (виден только в Task B). */
  #updatePathReadout(): void {
    const s = this.#store.get();
    const visible = s.activeTask === 'B-work' && this.#attachedBlockEl !== null;
    if (!visible) {
      this.#refs.pathReadout.hidden = true;
      return;
    }
    this.#refs.pathReadout.hidden = false;
    const cm = this.#currentSlidDistanceMm() / 10;
    // RU-формат: запятая как десятичный разделитель (ученик списывает как с линейки).
    this.#refs.pathReadoutValue.textContent = `s = ${cm.toFixed(1).replace('.', ',')} см`;
  }

  #stopSliding(): void {
    if (this.#slidingRafId !== null) {
      cancelAnimationFrame(this.#slidingRafId);
      this.#slidingRafId = null;
    }
    if (this.#readyTimeoutId !== null) {
      clearTimeout(this.#readyTimeoutId);
      this.#readyTimeoutId = null;
    }
  }

  /** Переключить активную задачу (A/B/C/D). */
  setActiveTask(task: TaskId): void {
    this.#store.set({ activeTask: task });
    this.#updatePathReadout();
    this.#refreshUi();
  }

  /** §21 — SPEC журнала по активной задаче: B → work, иначе → μ. */
  #currentSpec(): JournalSpec {
    return this.#store.get().activeTask === 'B-work' ? FRICTION_WORK_SPEC : FRICTION_SPEC;
  }

  /**
   * Короткая метка поверхности для ячейки журнала («А»/«Б»). Полная
   * («Направляющая (А)») распирала колонку до 213px и схлопывала derived-колонку
   * (μ / A,Дж) в 0 — заголовок «Поверхность» и так понятен, плюс свотчи на сцене.
   */
  #surfaceShort(id: SurfaceId): string {
    return id === 'A' ? 'А' : 'Б';
  }

  /** Переключить поверхность (A/B). */
  setSurface(surfaceId: SurfaceId): void {
    this.#refs.track.surfaceId = surfaceId;
    this.#store.set({ surfaceId });
    this.#refreshUi();
  }

  /**
   * Записывает измерение в журнал. Реальные пользователи запускают это через
   * pending-плашку «Записать в журнал» (semi-auto) или авто (fully-auto);
   * опц. параметры — для программного ввода в автотестах.
   */
  recordMeasurement(opts?: { mBlockG?: number; frictionN?: number }): void {
    const s = this.#store.get();
    if (!this.#attachedBlockEl) return;
    const trueMassBlock = this.#attachedBlockEl.mass;
    const massBlockG = opts?.mBlockG ?? trueMassBlock;
    const dynoF = this.#attachedDynoEl
      ? Number(this.#attachedDynoEl.getAttribute('force') ?? 0)
      : 0;
    const frictionN = opts?.frictionN ?? dynoF;
    const totalM = massBlockG + totalMass(s.weightsOnBlock);
    const N = normalForce(totalM);
    const mu = coefficientFromForces(frictionN, N);
    if (mu === null) return;

    // Task B «Работа силы трения»: фиксируем пройденный путь и работу A = F·s.
    // Для остальных задач (A/C/D) путь и работа не нужны — null (без регресса).
    // s округляем до 0,1 см (как видит ученик в журнале/линейке), distanceMm выводим ИЗ s —
    // тогда сохранённая work тождественна тому, что проверит SPEC (F·s_см/100), без рассинхрона.
    const isWorkTask = s.activeTask === 'B-work';
    const sCm = isWorkTask ? roundTo(this.#currentSlidDistanceMm() / 10, 1) : null;
    const distanceMm = sCm !== null ? roundTo(sCm * 10, 1) : null;
    const work =
      isWorkTask && distanceMm !== null ? roundTo(workOfFriction(frictionN, distanceMm), 4) : null;

    const measurement: FrictionMeasurement = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      surfaceId: s.surfaceId,
      totalMassGrams: totalM,
      normalForce: roundTo(N, 3),
      frictionForce: roundTo(frictionN, 3),
      mu: roundTo(mu, 3),
      distanceMm,
      work,
    };
    this.#store.update((st) => ({
      measurements: [...st.measurements, measurement],
      measurementStep: 'recorded',
    }));
    // §21.10 — сигнатура для дедупликации pending-плашки.
    this.#lastRecordedSignature = this.#pendingSignature();
    this.#refreshUi();
    if (isWorkTask && distanceMm !== null && work !== null) {
      this.#announce(
        `Записано: F тр = ${measurement.frictionForce.toFixed(2)} Н, s = ${(distanceMm / 10)
          .toFixed(1)
          .replace('.', ',')} см, A = ${work.toFixed(3).replace('.', ',')} Дж.`,
      );
    } else {
      this.#announce(
        `Записано: μ = ${measurement.mu.toFixed(2)}, F тр = ${measurement.frictionForce.toFixed(2)} Н.`,
      );
    }
  }

  /** §20.4 — текущий режим записи (читается с localStorage + URL). */
  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  /** §20.4 — обработчик смены режима через toggle. */
  #handleRecordModeChange(): void {
    // В fully-auto: если уже ready — автоматически записать сразу при переключении.
    if (
      this.#recordMode() === 'fully-auto' &&
      this.#store.get().measurementStep === 'ready-to-record'
    ) {
      this.recordMeasurement();
    }
    this.#refreshUi();
  }

  /** Cleanup при unmount (FrictionScreen.unmount): снять все window-листенеры и таймеры/RAF. */
  destroy(): void {
    this.#stopSliding(); // чистит RAF + #readyTimeoutId (иначе таймер сработает на размонтированном экране)
    window.removeEventListener('resize', this.#onResize);
    // На случай unmount во время активной тяги — снять pull-листенеры (no-op если их нет).
    window.removeEventListener('pointermove', this.#onPullMove);
    window.removeEventListener('pointerup', this.#onPullEnd);
    window.removeEventListener('pointercancel', this.#onPullEnd);
    this.#pullActive = false;
    this.#pullPointerId = null;
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
  }

  /**
   * «Взвесить брусок» — упрощённый режим: показывает реальную силу веса бруска
   * через flash-подсказку. Ученик списывает значение и считает m = F·1000/g сам.
   */
  #weighBlock(): void {
    if (!this.#attachedBlockEl) {
      this.#hints.flash('Сначала возьмите брусок из правой панели.');
      return;
    }
    const trueMassG = this.#attachedBlockEl.mass;
    const F = roundTo(massToForce(trueMassG), 2);
    this.#hints.flash(
      `Динамометр показал F = ${F.toFixed(2)} Н. Посчитайте массу: m = F · 1000 / 9.8.`,
    );
  }

  /** Сбросить установку. */
  reset(): void {
    this.#drag.cancel();
    this.#stopSliding();
    this.#pullString.hidden = true;
    if (this.#attachedBlockEl) {
      this.#returnElementToCard('block', this.#attachedBlockEl);
    }
    if (this.#attachedDynoEl) {
      const id = this.#store.get().dynamometer?.equipmentId;
      if (id) this.#returnElementToCard(id, this.#attachedDynoEl);
    }
    for (const w of [...this.#attachedWeightEls]) {
      const id = w.dataset['equipmentId'] as EquipmentId | undefined;
      if (id) this.#returnElementToCard(id, w);
    }
    this.#attachedBlockEl = null;
    this.#attachedDynoEl = null;
    this.#attachedWeightEls = [];
    this.#slidDistanceMm = 0;
    this.#slidingStartPosMm = 0;
    this.#store.set({ ...INITIAL_SETUP_STATE });
    this.#drag.removeSnapZone('block-top');
    this.#drag.removeSnapZone('block-hook');
    // §21 — журнал v2: drafts (черновики ввода) и verdicts (вердикты ✓) сбрасываем.
    this.#journalDrafts.clear();
    this.#journalVerdicts.clear();
    this.#lastRecordedSignature = '';
    this.#refs.pathReadout.hidden = true;
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
        'lab-block, lab-dynamometer-h, lab-flat-weight',
      );
      if (!draggable) return;
      draggable.dataset['equipmentId'] = equipmentId;

      const kind = this.#kindForEquipment(equipmentId);
      this.#drag.attach(draggable, {
        equipmentId,
        kind,
        onDragStart: () => {
          this.#store.set({ dragging: equipmentId });
          this.#updateDropZonePositions();
        },
        onDragEnd: () => {
          this.#store.set({ dragging: null });
          this.#updateDropZonePositions();
        },
      });
    });

    // Track snap-zone (всегда активна — для бруска)
    this.#drag.addSnapZone(this.#makeTrackZone());

    // Reset
    this.#refs.resetBtn.addEventListener('click', () => this.reset());

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
        this.recordMeasurement();
      });
    }

    // Кнопка «Записать в журнал» в шапке: запись текущего готового измерения.
    this.#refs.recordBtn.addEventListener('click', () => this.recordMeasurement());

    // Кнопка «Взвесить брусок» — flash-подсказка с показанием дин (упрощённый режим взвешивания)
    this.#refs.weighBtn.addEventListener('click', () => this.#weighBlock());

    // Surface toggle (A/B)
    this.#refs.surfaceToggle.addEventListener('click', (ev) => {
      const target = (ev.target as HTMLElement).closest('[data-surface]');
      if (!target) return;
      const sid = (target as HTMLElement).dataset['surface'] as SurfaceId | undefined;
      if (sid && (sid === 'A' || sid === 'B')) this.setSurface(sid);
    });

    // Task switcher (stepper)
    this.#refs.steps.addEventListener('click', (ev) => {
      const target = (ev.target as HTMLElement).closest('[data-task]');
      if (!target) return;
      const tid = (target as HTMLElement).dataset['task'] as TaskId | undefined;
      if (tid) this.setActiveTask(tid);
    });

    // Measurement panel toggle
    this.#refs.measurementToggle.addEventListener('click', () => {
      const collapsed = this.#refs.measurementPanel.getAttribute('aria-collapsed') === 'true';
      this.#refs.measurementPanel.setAttribute('aria-collapsed', collapsed ? 'false' : 'true');
      this.#refs.measurementToggle.setAttribute('aria-expanded', collapsed ? 'true' : 'false');
    });

    window.addEventListener('resize', this.#onResize);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => this.#updateMountPosition()),
    );
  }

  #kindForEquipment(id: EquipmentId): AttachKind {
    if (id === 'block') return 'block';
    if (id === 'dyno-1' || id === 'dyno-5') return 'dynamometer';
    return 'weight';
  }

  // ─── Snap-зоны ──────────────────────────────────────────────

  #makeTrackZone(): SnapZone {
    return {
      id: 'track',
      accepts: ['block'],
      getRect: () => this.#refs.dropZoneTrack.getBoundingClientRect(),
      snapRadius: 120,
      onHover: (active) => {
        this.#refs.dropZoneTrack.classList.toggle('drop-zone--active', active);
      },
      onDrop: ({ element, equipmentId }) => {
        if (equipmentId !== 'block') return false;
        return this.#attachBlock(element as LabBlock);
      },
    };
  }

  #makeBlockTopZone(): SnapZone {
    return {
      id: 'block-top',
      accepts: ['weight'],
      getRect: () => this.#refs.dropZoneBlockTop.getBoundingClientRect(),
      snapRadius: 90,
      onHover: (active) => {
        this.#refs.dropZoneBlockTop.classList.toggle('drop-zone--active', active);
      },
      onDrop: ({ element, equipmentId }) => {
        return this.#stackWeight(element, equipmentId as EquipmentId);
      },
    };
  }

  #makeBlockHookZone(): SnapZone {
    return {
      id: 'block-hook',
      accepts: ['dynamometer'],
      getRect: () => this.#refs.dropZoneBlockHook.getBoundingClientRect(),
      snapRadius: 90,
      onHover: (active) => {
        this.#refs.dropZoneBlockHook.classList.toggle('drop-zone--active', active);
      },
      onDrop: ({ element, equipmentId }) => {
        if (equipmentId !== 'dyno-1' && equipmentId !== 'dyno-5') return false;
        return this.#attachDynamometer(element as LabDynamometerH, equipmentId);
      },
    };
  }

  // ─── Attachment handlers ────────────────────────────────────

  #attachBlock(element: LabBlock): boolean {
    if (this.#attachedBlockEl) return false;

    this.#mountBlock(element);
    element.setAttribute('on-surface', '');
    element.setAttribute('attached', '');

    this.#attachedBlockEl = element;
    this.#store.set({
      block: { positionMm: 0 },
      stage: 'block-placed',
    });
    this.#updateCardStatus('block', 'in-use');

    // Открываем зоны для грузов и динамометра
    this.#drag.addSnapZone(this.#makeBlockTopZone());
    this.#drag.addSnapZone(this.#makeBlockHookZone());

    this.#updateDropZonePositions();
    this.#updatePathReadout();
    this.#refreshUi();
    this.#announce('Брусок установлен на направляющую.');
    return true;
  }

  #stackWeight(element: HTMLElement, equipmentId: EquipmentId): boolean {
    const cfg = WEIGHT_CONFIG[equipmentId];
    if (!cfg) return false;
    if (!this.#attachedBlockEl) {
      this.#hints.flash('Сначала поставьте брусок на направляющую.');
      return false;
    }
    if (this.#attachedWeightEls.includes(element)) return false;

    this.#mountStackedWeight(element, equipmentId);
    element.setAttribute('attached', '');

    const stacked: StackedWeight = {
      equipmentId,
      mass: cfg.mass,
      stackIndex: this.#attachedWeightEls.length,
    };
    this.#attachedWeightEls.push(element);
    this.#store.update((s) => ({
      weightsOnBlock: [...s.weightsOnBlock, stacked],
    }));
    this.#updateCardStatus(equipmentId, 'in-use');
    this.#updateStackedPositions();
    this.#updateDropZonePositions();
    this.#refreshUi();
    this.#announce(`Положен груз ${cfg.mass} г на брусок.`);
    return true;
  }

  #attachDynamometer(element: LabDynamometerH, equipmentId: 'dyno-1' | 'dyno-5'): boolean {
    if (this.#attachedDynoEl) return false;
    if (!this.#attachedBlockEl) {
      this.#hints.flash('Сначала поставьте брусок на направляющую.');
      return false;
    }
    const cfg = DYNAMOMETER_CONFIG[equipmentId];
    if (!cfg) return false;

    this.#mountDynamometerHorizontal(element, cfg.range, equipmentId);
    element.setAttribute('attached', '');

    this.#attachedDynoEl = element;
    this.#store.set({
      dynamometer: { equipmentId, range: cfg.range },
      measurementStep: 'awaiting-pull',
    });
    this.#updateCardStatus(equipmentId, 'in-use');
    // Ждём кадра, чтобы дин был layouted, потом пересчитываем mount + pull-string
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.#updateMountPosition();
        this.#updateDropZonePositions();
      }),
    );
    this.#refreshUi();
    this.#announce(`Динамометр ${cfg.range} Н прицеплен к крючку бруска. Можно тянуть.`);
    return true;
  }

  // ─── Mount helpers ──────────────────────────────────────────

  /** Оборачивает элемент в .attached-eq + добавляет detach (X) кнопку (стандарт REFERENCE.md). */
  #wrapWithDetach(element: HTMLElement, equipmentId: EquipmentId): HTMLDivElement {
    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.transform = '';
    element.style.zIndex = '';
    element.style.marginTop = '';
    element.setAttribute('attached', '');

    const wrapper = document.createElement('div');
    wrapper.className = 'attached-eq';
    wrapper.dataset['equipmentId'] = equipmentId;
    wrapper.style.position = 'absolute';

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
    return wrapper;
  }

  #mountBlock(element: LabBlock): void {
    const wrapper = this.#wrapWithDetach(element, 'block');
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    this.#blockMount.appendChild(wrapper);
    requestAnimationFrame(() => requestAnimationFrame(() => this.#updateMountPosition()));
  }

  #mountStackedWeight(element: HTMLElement, equipmentId: EquipmentId): void {
    const wrapper = this.#wrapWithDetach(element, equipmentId);
    this.#stackedMount.appendChild(wrapper);
  }

  #mountDynamometerHorizontal(element: LabDynamometerH, range: 1 | 5, equipmentId: 'dyno-1' | 'dyno-5'): void {
    element.setAttribute('range', String(range));
    element.setAttribute('force', '0');
    element.setAttribute('interactive', '');
    const wrapper = this.#wrapWithDetach(element, equipmentId);
    if (this.#attachedBlockEl) {
      this.#blockMount.appendChild(wrapper);
    }
    // Pointer-pull на корпусе дин: тянем ручку вправо → сила растёт.
    if (!element.dataset['pullBound']) {
      element.dataset['pullBound'] = 'true';
      element.addEventListener('pointerdown', this.#onPullStart);
    }
  }

  #onPullStart = (ev: PointerEvent): void => {
    if (ev.button !== undefined && ev.button !== 0) return;
    if (!this.#attachedDynoEl) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.#pullActive = true;
    this.#pullPointerId = ev.pointerId;
    this.#pullStartX = ev.clientX;
    this.#pullStartForce = Number(this.#attachedDynoEl.getAttribute('force') ?? 0);
    try {
      this.#attachedDynoEl.setPointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
    window.addEventListener('pointermove', this.#onPullMove);
    window.addEventListener('pointerup', this.#onPullEnd);
    window.addEventListener('pointercancel', this.#onPullEnd);
  };

  /** Стабильная ссылка на resize-хендлер — чтобы снять в destroy() (без утечки при re-mount). */
  #onResize = (): void => this.#updateMountPosition();

  #onPullMove = (ev: PointerEvent): void => {
    if (!this.#pullActive || ev.pointerId !== this.#pullPointerId) return;
    if (!this.#attachedDynoEl || !this.#attachedBlockEl) return;
    // Калибровка: 1 px смещения = 0.01 Н (реалистично для масштаба сцены)
    const PX_PER_N = 100;
    const dx = ev.clientX - this.#pullStartX;
    const dynoRange = Number(this.#attachedDynoEl.getAttribute('range') ?? 5);
    const force = Math.max(0, Math.min(dynoRange, this.#pullStartForce + dx / PX_PER_N));
    this.applyForce(force);
  };

  #onPullEnd = (ev: PointerEvent): void => {
    if (ev.pointerId !== this.#pullPointerId) return;
    this.#pullActive = false;
    this.#pullPointerId = null;
    window.removeEventListener('pointermove', this.#onPullMove);
    window.removeEventListener('pointerup', this.#onPullEnd);
    window.removeEventListener('pointercancel', this.#onPullEnd);
    // Не сбрасываем приложенную силу — оставляем последнее значение, чтобы ученик
    // мог посмотреть показание динамометра и записать его кнопкой.
    if (this.#attachedDynoEl) {
      try {
        this.#attachedDynoEl.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // ─── Layout / positions ─────────────────────────────────────

  #updateMountPosition(): void {
    if (!this.#refs.track || !this.#refs.trackContainer) return;
    if (!this.#attachedBlockEl) {
      // Без бруска — оставляем mount там, где он есть. Не трогаем стиль.
      return;
    }
    const trackRect = this.#refs.track.getBoundingClientRect();
    const containerRect = this.#refs.trackContainer.getBoundingClientRect();
    const trackTopSurfaceY = this.#refs.track.getTopSurfaceY();
    const blockHostRect = this.#attachedBlockEl.getBoundingClientRect();

    // Стартовая позиция бруска — слева на 60 мм от начала направляющей.
    // Дин стоит справа от бруска (right: -160px от блок-маунта).
    // При скольжении блок едет ВПРАВО (positionMm растёт) к динамометру.
    const trackLeftX = trackRect.left - containerRect.left;
    const blockOffsetMm = this.#store.get().block?.positionMm ?? 0;
    const trackPxPerMm = trackRect.width / 500; // 500 мм по ФИПИ
    const blockCenterX = trackLeftX + (60 + blockOffsetMm) * trackPxPerMm;
    const blockLeft = blockCenterX - blockHostRect.width / 2;

    // Y: визуальный низ бруска должен совпасть с верхней гранью направляющей
    const trackSurfaceContainerY = trackRect.top - containerRect.top + trackTopSurfaceY;
    const visualBottomFromHostTop = this.#attachedBlockEl.getVisualBottomY();
    const blockTop = trackSurfaceContainerY - visualBottomFromHostTop;

    this.#blockMount.style.left = `${blockLeft}px`;
    this.#blockMount.style.top = `${blockTop}px`;

    this.#updateStackedPositions();
    this.#updatePullString();
  }

  /**
   * Натягивает «нитку» от нижнего крюка динамометра к крючку бруска (слева).
   * Если динамометра нет — прячет нитку.
   */
  #updatePullString(): void {
    if (!this.#attachedDynoEl || !this.#attachedBlockEl) {
      this.#pullString.hidden = true;
      return;
    }
    const containerRect = this.#refs.trackContainer.getBoundingClientRect();
    // Крюк горизонтального динамометра — слева (ближе к бруску, см. lab-dynamometer-h.getHookPosition)
    const dynoRect = this.#attachedDynoEl.getBoundingClientRect();
    const dynoHookHost = this.#attachedDynoEl.getHookPosition();
    const dynoHookViewportX = dynoRect.left + dynoHookHost.x;
    const dynoHookViewportY = dynoRect.top + dynoHookHost.y;

    // Крюк бруска (справа)
    const blockHookHost = this.#attachedBlockEl.getHookPosition();
    const blockRect = this.#attachedBlockEl.getBoundingClientRect();
    const blockHookViewportX = blockRect.left + blockHookHost.x;
    const blockHookViewportY = blockRect.top + blockHookHost.y;

    // В координатах trackContainer
    const x1 = dynoHookViewportX - containerRect.left;
    const y1 = dynoHookViewportY - containerRect.top;
    const x2 = blockHookViewportX - containerRect.left;
    const y2 = blockHookViewportY - containerRect.top;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    this.#pullString.style.left = `${x1}px`;
    this.#pullString.style.top = `${y1}px`;
    this.#pullString.style.width = `${len}px`;
    this.#pullString.style.transform = `rotate(${angle}deg)`;
    this.#pullString.hidden = false;
  }

  #updateStackedPositions(): void {
    // Грузы лежат ПЛОСКО НА БРУСКЕ:
    //   - Один груз — по центру бруска.
    //   - Два-три груза — в ряд горизонтально (по ширине бруска).
    //   - Если в ряду не помещается — следующая «полка» сверху.
    if (!this.#attachedBlockEl) return;
    const blockRect = this.#attachedBlockEl.getBoundingClientRect();
    const blockMountRect = this.#blockMount.getBoundingClientRect();
    const blockVisualTopFromMount =
      blockRect.top - blockMountRect.top + this.#attachedBlockEl.getVisualTopY();
    const blockLeftFromMount = blockRect.left - blockMountRect.left;
    const blockWidth = blockRect.width;

    // Ширина типового груза: 64px (lab-flat-weight). Берём с реального элемента.
    const firstW = this.#attachedWeightEls[0];
    const wWidth = firstW ? firstW.getBoundingClientRect().width : 64;
    const wHeight = firstW ? firstW.getBoundingClientRect().height : 28;

    const GAP = 4;
    const itemWidthPlusGap = wWidth + GAP;
    // Сколько грузов влезет в один ряд по ширине бруска
    const perRow = Math.max(1, Math.floor((blockWidth + GAP) / itemWidthPlusGap));

    for (let i = 0; i < this.#attachedWeightEls.length; i++) {
      const w = this.#attachedWeightEls[i]!;
      const wrapper = w.parentElement?.classList.contains('attached-eq')
        ? (w.parentElement as HTMLElement)
        : w; // fallback — позиционируем сам элемент
      const row = Math.floor(i / perRow);
      const colInRow = i % perRow;
      const itemsInThisRow = Math.min(perRow, this.#attachedWeightEls.length - row * perRow);
      const rowWidth = itemsInThisRow * wWidth + (itemsInThisRow - 1) * GAP;
      const rowLeftOffset = (blockWidth - rowWidth) / 2;
      const left = blockLeftFromMount + rowLeftOffset + colInRow * itemWidthPlusGap;
      const top = blockVisualTopFromMount - (row + 1) * wHeight + 2;
      wrapper.style.left = `${left}px`;
      wrapper.style.top = `${top}px`;
    }
  }

  #updateDropZonePositions(): void {
    const s = this.#store.get();
    const trackRect = this.#refs.track.getBoundingClientRect();
    const containerRect = this.#refs.trackContainer.getBoundingClientRect();
    const dragging = s.dragging;
    const draggingKind = dragging ? this.#kindForEquipment(dragging) : null;

    // Track zone: видна пока нет бруска и сейчас тащат брусок
    const trackZone = this.#refs.dropZoneTrack;
    const showTrackZone = !this.#attachedBlockEl && draggingKind === 'block';
    trackZone.hidden = !showTrackZone;
    if (showTrackZone) {
      trackZone.style.left = `${trackRect.left - containerRect.left + 60}px`;
      trackZone.style.top = `${trackRect.top - containerRect.top - 20}px`;
      trackZone.style.width = `${trackRect.width - 120}px`;
      trackZone.style.height = `${trackRect.height + 20}px`;
    }

    // Block top zone: над бруском, видна пока тащат груз (не показываем «всегда»,
    // чтобы не загромождать сцену когда измерение в процессе)
    const topZone = this.#refs.dropZoneBlockTop;
    const showTopZone = !!this.#attachedBlockEl && draggingKind === 'weight';
    topZone.hidden = !showTopZone;
    if (showTopZone && this.#attachedBlockEl) {
      const blockRect = this.#attachedBlockEl.getBoundingClientRect();
      // Над верхней стопкой (или над бруском, если стопки нет)
      let topY = blockRect.top - containerRect.top - 70;
      if (this.#attachedWeightEls.length > 0) {
        const topMost = this.#attachedWeightEls[this.#attachedWeightEls.length - 1]!;
        const tmRect = topMost.getBoundingClientRect();
        topY = tmRect.top - containerRect.top - 70;
      }
      topZone.style.left = `${blockRect.left - containerRect.left}px`;
      topZone.style.top = `${topY}px`;
      topZone.style.width = `${blockRect.width}px`;
      topZone.style.height = '60px';
    }

    // Block hook zone: СПРАВА от бруска (там крючок бруска), видна пока тащат динамометр
    const hookZone = this.#refs.dropZoneBlockHook;
    const showHookZone =
      !!this.#attachedBlockEl && !this.#attachedDynoEl && draggingKind === 'dynamometer';
    hookZone.hidden = !showHookZone;
    if (showHookZone && this.#attachedBlockEl) {
      const blockRect = this.#attachedBlockEl.getBoundingClientRect();
      hookZone.style.left = `${blockRect.right - containerRect.left + 10}px`;
      hookZone.style.top = `${blockRect.top - containerRect.top - 10}px`;
      hookZone.style.width = '90px';
      hookZone.style.height = `${blockRect.height + 20}px`;
    }
  }

  // ─── Detach / return ─────────────────────────────────────────

  #returnElementToCard(equipmentId: EquipmentId, element: HTMLElement): void {
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (!card) return;
    // Если элемент в wrapper'е (.attached-eq) — сначала извлекаем
    const wrapper = element.parentElement?.classList.contains('attached-eq')
      ? (element.parentElement as HTMLElement)
      : null;
    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.transform = '';
    element.style.zIndex = '';
    element.removeAttribute('attached');
    element.removeAttribute('on-surface');
    // Сбрасываем показания динамометра — реалистично, как в настоящем приборе
    // (когда снимаешь нагрузку, стрелка возвращается к 0).
    if (element.tagName.toLowerCase() === 'lab-dynamometer-h') {
      element.setAttribute('force', '0');
    }
    card.appendChild(element);
    if (wrapper && wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
    this.#updateCardStatus(equipmentId, 'available');
  }

  /**
   * Снимает с установки конкретный элемент через X-кнопку.
   * Поведение по типу:
   *   - брусок → полный reset (нет смысла что-то держать без бруска);
   *   - груз → снимаем только этот груз, остальные остаются;
   *   - динамометр → снимаем дин, брусок и грузы остаются.
   */
  #detachElement(element: HTMLElement): void {
    if (element === this.#attachedBlockEl) {
      this.reset();
      return;
    }
    if (element === this.#attachedDynoEl) {
      const dynoId = this.#store.get().dynamometer?.equipmentId;
      if (dynoId) this.#returnElementToCard(dynoId, this.#attachedDynoEl);
      this.#attachedDynoEl = null;
      this.#store.set({
        dynamometer: null,
        appliedForce: 0,
        slidingVelocity: 0,
        measurementStep: 'idle',
      });
      this.#stopSliding();
      this.#pullString.hidden = true;
      this.#updateDropZonePositions();
      this.#refreshUi();
      this.#announce('Динамометр снят с установки.');
      return;
    }
    // Груз
    const idx = this.#attachedWeightEls.indexOf(element);
    if (idx === -1) return;
    const wId = element.dataset['equipmentId'] as EquipmentId | undefined;
    if (wId) this.#returnElementToCard(wId, element);
    this.#attachedWeightEls = this.#attachedWeightEls.filter((_, i) => i !== idx);
    this.#store.update((st) => ({
      weightsOnBlock: st.weightsOnBlock.filter((_, i) => i !== idx),
    }));
    this.#updateStackedPositions();
    this.#updateDropZonePositions();
    this.#refreshUi();
    this.#announce('Груз снят с бруска.');
  }

  #updateCardStatus(equipmentId: EquipmentId, status: 'available' | 'in-use'): void {
    this.#cardByEquipmentId.get(equipmentId)?.setAttribute('status', status);
  }

  // ─── UI refresh ─────────────────────────────────────────────

  #refreshUi(): void {
    const s = this.#store.get();
    this.#hints.update(s);
    this.#refreshSurfaceToggle();
    this.#refreshTaskStepper();
    this.#refreshMeasurementPanel();
    this.#refreshRecordButton();
    this.#refreshGraph();
    this.#updatePathReadout();
  }

  #refreshSurfaceToggle(): void {
    const s = this.#store.get();
    const buttons = this.#refs.surfaceToggle.querySelectorAll<HTMLElement>('[data-surface]');
    buttons.forEach((btn) => {
      const isActive = btn.dataset['surface'] === s.surfaceId;
      btn.setAttribute('data-state', isActive ? 'active' : 'inactive');
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  #refreshTaskStepper(): void {
    const s = this.#store.get();
    const items = this.#refs.steps.querySelectorAll<HTMLElement>('[data-task]');
    items.forEach((item) => {
      const isActive = item.dataset['task'] === s.activeTask;
      item.setAttribute('data-state', isActive ? 'active' : 'inactive');
      item.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  #refreshRecordButton(): void {
    const s = this.#store.get();
    const ready = s.measurementStep === 'ready-to-record';
    this.#refs.recordBtn.disabled = !ready;
    this.#refs.recordBtn.hidden = !this.#attachedDynoEl;
    this.#refs.recordBtn.classList.toggle('ready-pulse', ready);
  }

  #refreshMeasurementPanel(): void {
    const s = this.#store.get();
    const hasData = s.measurements.length > 0;
    this.#refs.measurementPanel.setAttribute('data-state', hasData ? 'has-data' : 'empty');

    // Counter badge
    if (hasData) {
      this.#refs.measurementCount.textContent = String(s.measurements.length);
      this.#refs.measurementCount.hidden = false;
    } else {
      this.#refs.measurementCount.textContent = '';
      this.#refs.measurementCount.hidden = true;
    }

    // Формула: показываем когда есть журнал; текст зависит от задачи.
    this.#refreshFormula(hasData);

    // §21 — журнал v2 (renderJournalTable). v1 fallback скрыт.
    this.#renderJournal();

    // Result panel.
    this.#refreshResultPanel();
  }

  /** Переключает текст формулы по активной задаче (μ для A/C/D, A=F·s для B). */
  #refreshFormula(hasData: boolean): void {
    const formulaEl = document.getElementById('formula-display');
    if (formulaEl) formulaEl.hidden = !hasData;
    const expr = document.getElementById('formula-expr');
    const units = document.getElementById('formula-units');
    if (!expr || !units) return;
    if (this.#store.get().activeTask === 'B-work') {
      this.#setFormulaText(
        expr,
        units,
        '<em>A</em> = <em>F</em><sub>тр</sub> · <em>s</em>',
        'путь <em>s</em> — в метрах, работа <em>A</em> — в джоулях',
      );
    } else {
      this.#setFormulaText(
        expr,
        units,
        '<em>m</em><sub>общ</sub> = <em>m</em><sub>бр</sub> + <em>m</em><sub>гр</sub>, ' +
          '<em>N</em> = <em>m</em><sub>общ</sub> · <em>g</em>, ' +
          '<em>μ</em> = <em>F</em><sub>тр</sub> / <em>N</em>',
        'массу — в кг, <em>g</em> = 9,8 м/с²',
      );
    }
  }

  /** Статические формулы (без пользовательского ввода) — раскладываем в DOM. */
  #setFormulaText(expr: HTMLElement, units: HTMLElement, exprHtml: string, unitsHtml: string): void {
    expr.innerHTML = exprHtml;
    units.innerHTML = unitsHtml;
  }

  #refreshResultPanel(): void {
    const s = this.#store.get();
    const sId = s.surfaceId;
    // В Task B показываем среднюю работу; иначе — средний μ.
    if (s.activeTask === 'B-work') {
      const subset = s.measurements.filter((m) => m.surfaceId === sId && m.work !== null);
      if (subset.length >= 1) {
        const meanA = subset.reduce((a, m) => a + (m.work ?? 0), 0) / subset.length;
        this.#renderResultPanel(
          SURFACE_CONFIG[sId].label,
          subset.length,
          'Ā (средняя работа)',
          `${meanA.toFixed(3).replace('.', ',')} Дж`,
        );
      } else {
        this.#refs.resultPanel.hidden = true;
        this.#refs.resultPanel.innerHTML = '';
      }
      return;
    }
    const subset = s.measurements.filter((m) => m.surfaceId === sId);
    if (subset.length >= 1) {
      const meanMu = subset.reduce((a, m) => a + m.mu, 0) / subset.length;
      this.#renderResultPanel(
        SURFACE_CONFIG[sId].label,
        subset.length,
        'μ̄ (среднее)',
        meanMu.toFixed(2),
      );
    } else {
      this.#refs.resultPanel.hidden = true;
      this.#refs.resultPanel.innerHTML = '';
    }
  }

  /** Рендерит result-panel из доверенных частей (label + числовые значения). */
  #renderResultPanel(
    surfaceLabel: string,
    count: number,
    metricLabel: string,
    metricValue: string,
  ): void {
    this.#refs.resultPanel.replaceChildren();
    const title = document.createElement('h4');
    title.className = 'result-title';
    title.textContent = `Текущий результат — ${surfaceLabel}`;
    const grid = document.createElement('div');
    grid.className = 'result-grid';
    const mkRow = (label: string, value: string): HTMLElement => {
      const row = document.createElement('div');
      row.className = 'result-row';
      const sp = document.createElement('span');
      sp.textContent = label;
      const strong = document.createElement('strong');
      strong.textContent = value;
      row.append(sp, ' ', strong);
      return row;
    };
    grid.append(mkRow('Измерений:', String(count)), mkRow(`${metricLabel}:`, metricValue));
    this.#refs.resultPanel.append(title, grid);
    this.#refs.resultPanel.hidden = false;
  }

  /**
   * §21 — рендер журнала через shared `renderJournalTable`.
   * SPEC выбирается по активной задаче: B → FRICTION_WORK_SPEC, иначе → FRICTION_SPEC.
   * direct (m / F_тр / s) пишет программа; ученик в semi-auto/fully-manual вводит
   * derived (N, μ или A) в input + ✓ проверка. Старая v1-таблица — скрытый fallback.
   */
  #renderJournal(): void {
    const s = this.#store.get();
    const mode = this.#recordMode();
    const spec = this.#currentSpec();
    const isWork = spec === FRICTION_WORK_SPEC;

    // §21 UX-v2: в fully-manual журнал РАСКРЫТ с пустой строкой даже без записей.
    const showEmptyManual =
      mode === 'fully-manual' && s.measurements.length === 0 && this.#attachedBlockEl !== null;
    const hasData = s.measurements.length > 0 || showEmptyManual;

    // v1 fallback таблица — всегда скрыта когда есть journal-host (v2).
    this.#refs.journalTable.hidden = true;
    this.#refs.journalBody.innerHTML = '';

    if (!this.#refs.journalHost) {
      // Шаблон без journal-host — деградируем (не должно случаться в проде).
      this.#refs.journalEmpty.hidden = hasData;
      return;
    }

    this.#refs.journalEmpty.hidden = hasData;
    this.#refs.journalHost.hidden = !hasData;

    const rows: JournalRow[] = s.measurements.map((m, i) =>
      this.#measurementToRow(m, i, mode, isWork),
    );

    if (showEmptyManual) {
      const draft = this.#journalDrafts.get(-1) ?? {};
      rows.push({
        idx: 1,
        timestamp: -1,
        values: isWork
          ? {
              idx: 1,
              surface: this.#surfaceShort(s.surfaceId),
              F_friction_N: draft['F_friction_N'] ?? null,
              s_cm: draft['s_cm'] ?? null,
              work_J: draft['work_J'] ?? null,
            }
          : {
              idx: 1,
              surface: this.#surfaceShort(s.surfaceId),
              m_g: draft['m_g'] ?? null,
              F_friction_N: draft['F_friction_N'] ?? null,
              N_N: draft['N_N'] ?? null,
              mu: draft['mu'] ?? null,
            },
        verdicts: {},
      });
    }

    renderJournalTable(this.#refs.journalHost, spec, rows, {
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
        const baseRow = this.#measurementToRow(m, rowIdx - 1, mode, isWork);
        const tempRow: JournalRow = {
          idx: rowIdx,
          timestamp: ts,
          values: { ...baseRow.values },
        };
        // Перекрываем derived значениями из черновика (то, что ввёл ученик).
        for (const col of spec.columns) {
          if (col.source === 'derived') {
            tempRow.values[col.key] = draft[col.key] ?? null;
          }
        }
        const verdicts = verifyRow(spec.columns, tempRow);
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

  /** Строит JournalRow из measurement по SPEC (work или μ). */
  #measurementToRow(
    m: FrictionMeasurement,
    i: number,
    mode: RecordMode,
    isWork: boolean,
  ): JournalRow {
    const draft = this.#journalDrafts.get(m.timestamp) ?? {};
    const surfaceLabel = this.#surfaceShort(m.surfaceId);
    if (isWork) {
      const sCm = m.distanceMm !== null ? roundTo(m.distanceMm / 10, 1) : 0;
      return {
        idx: i + 1,
        timestamp: m.timestamp,
        values: {
          idx: i + 1,
          surface: surfaceLabel,
          F_friction_N: m.frictionForce,
          s_cm: sCm,
          work_J: mode === 'fully-auto' ? (m.work ?? 0) : (draft['work_J'] ?? null),
        },
        verdicts: this.#journalVerdicts.get(m.timestamp) ?? {},
      };
    }
    return {
      idx: i + 1,
      timestamp: m.timestamp,
      values: {
        idx: i + 1,
        surface: surfaceLabel,
        m_g: m.totalMassGrams,
        F_friction_N: m.frictionForce,
        N_N: mode === 'fully-auto' ? m.normalForce : (draft['N_N'] ?? null),
        mu: mode === 'fully-auto' ? m.mu : (draft['mu'] ?? null),
      },
      verdicts: this.#journalVerdicts.get(m.timestamp) ?? {},
    };
  }

  /**
   * Сигнатура текущего готового измерения — для дедупликации pending-плашки.
   * В Task B включает путь s (иначе повторное скольжение с тем же F не показало бы плашку).
   */
  #pendingSignature(): string {
    const s = this.#store.get();
    const m = (this.#attachedBlockEl?.mass ?? 0) + totalMass(s.weightsOnBlock);
    const F = this.#attachedDynoEl
      ? Number(this.#attachedDynoEl.getAttribute('force') ?? 0)
      : 0;
    if (s.activeTask === 'B-work') {
      const sCm = roundTo(this.#currentSlidDistanceMm() / 10, 1);
      return `B|${m}|${F.toFixed(2)}|${sCm}`;
    }
    return `${s.activeTask}|${m}|${F.toFixed(2)}`;
  }

  /** §21.10 — управление видимостью pending-плашки «Записать в журнал». */
  #updateRecordPending(): void {
    if (!this.#refs.recordPendingSlot) return;
    const slot = this.#refs.recordPendingSlot;
    const mode = this.#recordMode();
    const s = this.#store.get();
    const ready = s.measurementStep === 'ready-to-record';
    const signature = this.#pendingSignature();
    const visible = mode === 'semi-auto' && ready && signature !== this.#lastRecordedSignature;
    if (visible) {
      slot.hidden = false;
      if (this.#refs.recordPendingSummary) {
        const F = this.#attachedDynoEl
          ? Number(this.#attachedDynoEl.getAttribute('force') ?? 0)
          : 0;
        if (s.activeTask === 'B-work') {
          const sCm = roundTo(this.#currentSlidDistanceMm() / 10, 1);
          this.#refs.recordPendingSummary.textContent =
            ` (F тр=${F.toFixed(2)} Н, s=${sCm.toFixed(1).replace('.', ',')} см)`;
        } else {
          const m = (this.#attachedBlockEl?.mass ?? 0) + totalMass(s.weightsOnBlock);
          this.#refs.recordPendingSummary.textContent = ` (m=${m} г, F тр=${F.toFixed(2)} Н)`;
        }
      }
    } else {
      slot.hidden = true;
    }
  }

  #refreshGraph(): void {
    const s = this.#store.get();
    if (s.activeTask !== 'C-force-vs-N' && s.activeTask !== 'D-force-vs-surface') {
      // Графики только в исследовательских задачах
      return;
    }
    // Здесь оставляем заглушку, пока lab-graph не адаптирован под F(N) — графика подкрутим в фазе UI
  }

  #announce(message: string): void {
    this.#refs.liveRegion.textContent = message;
  }
}
