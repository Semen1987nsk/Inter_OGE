/**
 * FrictionExperiment — оркестратор опыта 2.2 «Трение скольжения».
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
  recordForm: HTMLFormElement; // форма ручного ввода в журнал
  rfMblock: HTMLInputElement;
  rfMweights: HTMLOutputElement;
  rfFriction: HTMLInputElement;
  rfCancel: HTMLButtonElement;
  rfSubmit: HTMLButtonElement;
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

  /** Программно приложить силу к динамометру (для автотестов и для pointer-pull). */
  applyForce(force: number): void {
    if (!this.#attachedDynoEl) return;
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
      // После 250ms скольжения — авто-переход в ready-to-record (показания стабильны)
      setTimeout(() => {
        if (this.#store.get().measurementStep === 'sliding') {
          this.#store.set({ measurementStep: 'ready-to-record' });
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
      if (clampedPos >= MAX_TRAVEL_MM) {
        // Дошли до конца — останавливаемся
        this.#slidingRafId = null;
        return;
      }
      this.#slidingRafId = requestAnimationFrame(tick);
    };
    this.#slidingRafId = requestAnimationFrame(tick);
  }

  #stopSliding(): void {
    if (this.#slidingRafId !== null) {
      cancelAnimationFrame(this.#slidingRafId);
      this.#slidingRafId = null;
    }
  }

  /** Переключить активную задачу (A/B/C/D). */
  setActiveTask(task: TaskId): void {
    this.#store.set({ activeTask: task });
    this.#refreshUi();
  }

  /** Переключить поверхность (A/B). */
  setSurface(surfaceId: SurfaceId): void {
    this.#refs.track.surfaceId = surfaceId;
    this.#store.set({ surfaceId });
    this.#refreshUi();
  }

  /**
   * Программный API для тестов: записывает в журнал значения, заданные параметрами,
   * как если бы их ввёл ученик в форму. Реальные пользователи — через #openRecordForm().
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

    const measurement: FrictionMeasurement = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      surfaceId: s.surfaceId,
      totalMassGrams: totalM,
      normalForce: roundTo(N, 3),
      frictionForce: roundTo(frictionN, 3),
      mu: roundTo(mu, 3),
      distanceMm: null,
      work: null,
    };
    this.#store.update((st) => ({
      measurements: [...st.measurements, measurement],
      measurementStep: 'recorded',
    }));
    this.#refreshUi();
    this.#announce(
      `Записано: μ = ${measurement.mu.toFixed(2)}, F тр = ${measurement.frictionForce.toFixed(2)} Н.`,
    );
  }

  /** Открывает форму ручного ввода значений в журнал. */
  #openRecordForm(): void {
    const s = this.#store.get();
    if (s.measurementStep !== 'ready-to-record') return;
    // Префилл: масса грузов автоматически (наклейки видны), F пустое (ученик списывает с дин)
    const mWeights = totalMass(s.weightsOnBlock);
    this.#refs.rfMweights.value = String(mWeights);
    // Если масса бруска уже введена в прошлый раз — сохраняем, иначе пусто
    // (храним последнее введённое значение в localStorage для удобства)
    const stored = localStorage.getItem('friction-mblock');
    if (stored) this.#refs.rfMblock.value = stored;
    this.#refs.rfFriction.value = '';
    this.#refs.recordForm.hidden = false;
    this.#refs.rfMblock.focus();
  }

  #closeRecordForm(): void {
    this.#refs.recordForm.hidden = true;
  }

  #submitRecordForm(): void {
    const mBlockG = parseFloat(this.#refs.rfMblock.value);
    const frictionN = parseFloat(this.#refs.rfFriction.value);
    if (!Number.isFinite(mBlockG) || mBlockG <= 0) {
      this.#hints.flash('Введите массу бруска (положительное число в граммах).');
      this.#refs.rfMblock.focus();
      return;
    }
    if (!Number.isFinite(frictionN) || frictionN <= 0) {
      this.#hints.flash('Введите показание динамометра (положительное число в Н).');
      this.#refs.rfFriction.focus();
      return;
    }
    // Сохраняем mBlock на следующий раз
    localStorage.setItem('friction-mblock', String(mBlockG));
    this.recordMeasurement({ mBlockG, frictionN });
    this.#closeRecordForm();
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
    this.#store.set({ ...INITIAL_SETUP_STATE });
    this.#drag.removeSnapZone('block-top');
    this.#drag.removeSnapZone('block-hook');
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

    // Кнопка «Записать в журнал» — ОТКРЫВАЕТ форму ручного ввода (не записывает сразу)
    this.#refs.recordBtn.addEventListener('click', () => this.#openRecordForm());

    // Кнопка «Взвесить брусок» — flash-подсказка с показанием дин (упрощённый режим взвешивания)
    this.#refs.weighBtn.addEventListener('click', () => this.#weighBlock());

    // Форма ввода
    this.#refs.rfCancel.addEventListener('click', () => this.#closeRecordForm());
    this.#refs.recordForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      this.#submitRecordForm();
    });

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

    window.addEventListener('resize', () => this.#updateMountPosition());
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

    // Формула: показываем когда есть журнал
    const formulaEl = document.getElementById('formula-display');
    if (formulaEl) formulaEl.hidden = !hasData;

    // Table
    if (hasData) {
      this.#refs.journalEmpty.hidden = true;
      this.#refs.journalTable.hidden = false;
      this.#refs.journalBody.innerHTML = s.measurements
        .map(
          (m, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${m.surfaceId}</td>
          <td>${m.totalMassGrams}</td>
          <td>${m.normalForce.toFixed(2)}</td>
          <td>${m.frictionForce.toFixed(2)}</td>
          <td>${m.mu.toFixed(2)}</td>
        </tr>
      `,
        )
        .join('');
    } else {
      this.#refs.journalEmpty.hidden = false;
      this.#refs.journalTable.hidden = true;
      this.#refs.journalBody.innerHTML = '';
    }

    // Result panel: средний μ для текущей поверхности (если ≥ 2 измерений)
    const sId = s.surfaceId;
    const subset = s.measurements.filter((m) => m.surfaceId === sId);
    if (subset.length >= 1) {
      const meanMu = subset.reduce((a, m) => a + m.mu, 0) / subset.length;
      const surfaceLabel = SURFACE_CONFIG[sId].label;
      this.#refs.resultPanel.hidden = false;
      this.#refs.resultPanel.innerHTML = `
        <h4 class="result-title">Текущий результат — ${surfaceLabel}</h4>
        <div class="result-grid">
          <div class="result-row"><span>Измерений:</span> <strong>${subset.length}</strong></div>
          <div class="result-row"><span>μ̄ (среднее):</span> <strong>${meanMu.toFixed(2)}</strong></div>
        </div>
      `;
    } else {
      this.#refs.resultPanel.hidden = true;
      this.#refs.resultPanel.innerHTML = '';
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
