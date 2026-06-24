/**
 * ElasticForceExperiment — оркестратор опыта 2.4 «Измерение силы упругости одной точкой».
 *
 * ФИПИ-2026, КОДИФ §1.29 п.6: «…силы упругости…» (измерение через динамометр).
 * Прил. 2 компл. №2: «измерение … силы упругости».
 *
 * Модель «одной точкой»: повесить груз → динамометр показывает F_упр = m·g.
 * Одна строка в журнале per замер. Без серии/LSQ-графика (в отличие от 2.6 Гука).
 * Параметры приборов из ФИПИ-спеки (паспорт комплекта №2).
 */

import type { LabSpringBoard } from '@/ui/components/lab-spring-board';
import type { LabDynamometer } from '@/ui/components/lab-dynamometer';
import type { LabStand } from '@/ui/components/lab-stand';
import type { LabEquipmentCard } from '@/ui/components/lab-equipment-card';
import type { LabCompositeTray } from '@/ui/components/lab-composite-tray';
import type { LabCompositeWeight } from '@/ui/components/lab-composite-weight';

import { Store } from '@controller/Store';
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

import {
  getRecordMode,
  injectRecordModeToggleStyles,
  renderRecordModeToggle,
  type RecordMode,
} from '@labosfera/shared-spa/lib/record-mode';
import { renderJournalTable } from '@labosfera/shared-spa/lib/journal/render';
import { ELASTIC_FORCE_SPEC } from '@labosfera/shared-spa/lib/journal/specs';
import { verifyRow } from '@labosfera/shared-spa/lib/journal/verify';
import { parseRu } from '@labosfera/shared-spa/lib/journal/format';
import type { JournalVerdict, JournalRow } from '@labosfera/shared-spa/lib/journal/types';

import { DragController, type AttachKind, type SnapZone } from '../spring-stiffness/controller/DragController';
import { HintEngine } from '../spring-stiffness/controller/HintEngine';

const RECORD_MODE_KIT = 'kit-2';

export interface ElasticForceRefs {
  stage: HTMLElement;
  standContainer: HTMLElement;
  stand: LabStand;
  dragOverlay: HTMLElement;
  dropZoneSpring: HTMLElement;
  dropZoneBottom: HTMLElement;
  hintBar: HTMLElement;
  liveRegion: HTMLElement;
  resetBtn: HTMLButtonElement;
  cards: NodeListOf<LabEquipmentCard>;
  compositeTray: LabCompositeTray | null;
  steps: HTMLElement;
  // Journal v2
  recordModeSlot?: HTMLElement | undefined;
  journalHost?: HTMLElement | undefined;
  recordPendingSlot?: HTMLElement | undefined;
  recordPendingBtn?: HTMLButtonElement | undefined;
  recordPendingSummary?: HTMLElement | undefined;
  journalEmpty: HTMLElement;
  measurementPanel: HTMLElement;
  measurementToggle: HTMLButtonElement;
  measurementCount: HTMLElement;
  recordBtn: HTMLButtonElement;
}

/** Одна запись журнала: масса груза + сила упругости. */
interface ElasticMeasurement {
  readonly timestamp: number;
  readonly massGrams: number;
  readonly forceN: number;
}

export class ElasticForceExperiment {
  #refs: ElasticForceRefs;
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

  // Журнал — список записей (только одна точка на запись)
  #measurements: ElasticMeasurement[] = [];
  // Journal v2 state
  #journalDrafts = new Map<number, Record<string, number>>();
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #detachRecordModeToggle: (() => void) | null = null;
  #lastRecordedSignature = '';

  constructor(refs: ElasticForceRefs) {
    this.#refs = refs;
    this.#store = new Store<SpringSetupState>({ ...INITIAL_SETUP_STATE });
    this.#drag = new DragController(refs.dragOverlay);
    this.#hints = new HintEngine(refs.hintBar, refs.liveRegion);

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

  /** Подцепить пружину по equipmentId (для тестов и E2E). */
  attachSpringById(equipmentId: 'spring-k50' | 'spring-k10'): boolean {
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (!card) return false;
    const el = card.querySelector<LabSpringBoard>('lab-spring-board');
    if (!el) return false;
    return this.#attachSpring(el, equipmentId);
  }

  /** Подцепить динамометр (для тестов и E2E). */
  attachDynamometerById(equipmentId: 'dyno-1' | 'dyno-5'): boolean {
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (!card) return false;
    const el = card.querySelector<LabDynamometer>('lab-dynamometer');
    if (!el) return false;
    return this.#attachDynamometerToSpring(el, equipmentId);
  }

  /** Подвесить груз (для тестов и E2E). */
  attachWeightById(equipmentId: EquipmentId): boolean {
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

  /** Записать измерение в журнал (для тестов и E2E). */
  recordMeasurement(): void {
    this.#doRecord();
  }

  destroy(): void {
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
  }

  reset(): void {
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
    // Журнал
    this.#measurements = [];
    this.#journalDrafts.clear();
    this.#journalVerdicts.clear();
    this.#lastRecordedSignature = '';

    this.#refs.compositeTray?.reset();
    this.#refs.stand.rodExtra = 0;
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
          this.#clearAllSnapTargets();
        },
      });

      card.addEventListener('equipment-pick', () => {
        if (kind === 'spring') {
          this.#attachSpring(draggable as LabSpringBoard, equipmentId);
        } else if (kind === 'dynamometer') {
          this.#attachDynamometerToSpring(draggable as LabDynamometer, equipmentId);
        } else {
          this.#attachWeight(draggable, equipmentId);
        }
      });
    });

    this.#drag.addSnapZone(this.#makeSpringHookZone());
    this.#wireCompositeTray();

    // Record-mode toggle
    if (this.#refs.recordModeSlot) {
      injectRecordModeToggleStyles();
      this.#detachRecordModeToggle = renderRecordModeToggle(this.#refs.recordModeSlot, {
        kitId: RECORD_MODE_KIT,
        onChange: () => this.#refreshUi(),
      });
    }

    // Pending-кнопка «Записать в журнал»
    if (this.#refs.recordPendingBtn) {
      this.#refs.recordPendingBtn.addEventListener('click', () => this.#doRecord());
    }

    // Кнопка «Записать в журнал» (в панели)
    this.#refs.recordBtn.addEventListener('click', () => this.#doRecord());

    this.#refs.resetBtn.addEventListener('click', () => {
      const s = this.#store.get();
      if (this.#measurements.length === 0 && !s.spring) {
        this.reset();
        return;
      }
      if (confirm('Сбросить все измерения и вернуть оборудование в комплект?')) {
        this.reset();
      }
    });

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
    if (id === 'disc-10' || id === 'disc-20' || id === 'disc-50') return 'disc';
    return 'weight';
  }

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
        this.#clearAllSnapTargets();
      },
    });

    for (const discEl of tray.getDiscEls()) {
      const eqId = discEl.dataset['eq'] as EquipmentId | undefined;
      if (!eqId) continue;
      discEl.dataset['equipmentId'] = eqId;
      this.#drag.attach(discEl, {
        equipmentId: eqId,
        kind: 'disc',
        onDragStart: () => { this.#store.set({ dragging: eqId }); },
        onDragEnd: (accepted) => {
          this.#store.set({ dragging: null });
          if (!accepted) this.#hints.flash('Перетащите диск на штангу — на стержень узла.');
          this.#refreshDropZoneVisibility();
          this.#clearAllSnapTargets();
        },
      });
    }

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
        if (this.#attachedWeightEls.includes(composite)) {
          this.#syncCompositeMassInStore();
          this.#updateChainPositions();
          if (this.#attachedSpringEl) this.#startOscillation();
          else if (this.#attachedDynoEl) this.#updateDynamometerStandReading();
        }
        this.#announce(`Диск ${mass} г надет. Масса узла ${tray.getMass()} г.`);
        return true;
      },
    });
  }

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
          return this.#attachDynamometerToSpring(
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
    if (!this.#attachedSpringEl && !this.#attachedDynoEl) return;

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

  #highlightSnapTarget(active: boolean): void {
    this.#clearAllSnapTargets();
    if (!active) return;
    const target = this.#lastAttachedElement();
    const wrapper = target?.parentElement;
    if (!wrapper?.classList.contains('attached-eq')) return;
    wrapper.classList.add('snap-target');
  }

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

    this.#attachedSpringEl = element;
    this.#store.set({
      spring,
      stage: 'spring-attached',
      measurementStep: 'idle',
    });
    this.#updateCardStatus(equipmentId, 'in-use');
    this.#refreshBottomHookZone();
    this.#refreshUi();
    this.#announce(`Пружина закреплена. Подвесьте динамометр, затем груз.`);
    return true;
  }

  #attachDynamometerToSpring(element: LabDynamometer, equipmentId: EquipmentId): boolean {
    if (this.#attachedDynoEl) return false;
    if (!this.#attachedSpringEl) {
      this.#hints.flash('Сначала закрепите пружину на штативе.');
      return false;
    }
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
    this.#announce(`Динамометр ${cfg.range} Н подвешен. Подвесьте груз.`);
    return true;
  }

  #mountDynamometer(element: LabDynamometer, range: 1 | 5): void {
    this.#mountInStack(element);
    element.setAttribute('range', String(range));
    element.setAttribute('force', '0');
    element.setAttribute('interactive', '');
  }

  #attachWeight(element: HTMLElement, equipmentId: EquipmentId): boolean {
    const cfg = WEIGHT_CONFIG[equipmentId];
    if (!cfg) return false;

    // Для этого опыта: груз висит на пружине (через динамометр или напрямую)
    if (!this.#attachedSpringEl) {
      this.#hints.flash('Сначала закрепите пружину на штативе.');
      return false;
    }

    let resolvedMass = cfg.mass;
    if (equipmentId === 'composite-load') {
      const composite = element as unknown as { getMass?: () => number };
      if (typeof composite.getMass === 'function') resolvedMass = composite.getMass();
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
      measurementStep: 'ready-to-record',
    }));
    this.#updateCardStatus(equipmentId, 'in-use');
    this.#refreshBottomHookZone();

    if (this.#attachedSpringEl) {
      this.#startOscillation();
    }
    const F = massToForce(resolvedMass);
    this.#announce(`Подвешен груз ${resolvedMass} г. F_упр ≈ ${F.toFixed(2)} Н.`);
    this.#refreshUi();
    return true;
  }

  #updateDynamometerStandReading(): void {
    if (!this.#attachedDynoEl) return;
    const m = totalMass(this.#store.get().weights);
    const F = massToForce(m);
    this.#attachedDynoEl.setAttribute('force', F.toFixed(2));
    this.#updateChainPositions();
    this.#updateDropZonePositions();
  }

  #mountInStack(element: HTMLElement): void {
    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.zIndex = '';
    element.style.transform = '';
    element.style.marginTop = '';
    element.setAttribute('attached', '');

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

  #detachElement(element: HTMLElement): void {
    const equipmentId = element.dataset['equipmentId'] as EquipmentId | undefined;
    if (!equipmentId) return;

    if (element === this.#attachedSpringEl) {
      this.reset();
      return;
    }

    if (element === this.#attachedDynoEl) {
      if (!this.#attachedSpringEl) {
        this.reset();
        return;
      }
      const dynoId = this.#store.get().dynamometer?.equipmentId;
      for (const w of [...this.#attachedWeightEls].reverse()) {
        const id = w.dataset['equipmentId'] as EquipmentId | undefined;
        if (id) this.#returnElementToCard(id, w);
      }
      if (dynoId) this.#returnElementToCard(dynoId, this.#attachedDynoEl);
      this.#attachedDynoEl = null;
      this.#attachedWeightEls = [];
      this.#store.set({ dynamometer: null, weights: [], measurementStep: 'idle' });
      this.#stopOscillation();
      this.#refreshBottomHookZone();
      this.#refreshUi();
      return;
    }

    const idx = this.#attachedWeightEls.indexOf(element);
    if (idx === -1) return;
    const removed = this.#attachedWeightEls.slice(idx);
    for (const w of removed.reverse()) {
      const id = w.dataset['equipmentId'] as EquipmentId | undefined;
      if (id) this.#returnElementToCard(id, w);
    }
    this.#attachedWeightEls = this.#attachedWeightEls.slice(0, idx);
    this.#store.update((s) => ({
      weights: s.weights.slice(0, idx),
      measurementStep: idx === 0 ? 'idle' : 'ready-to-record',
    }));
    this.#refreshBottomHookZone();
    if (this.#attachedSpringEl) {
      this.#startOscillation();
    } else {
      this.#updateDynamometerStandReading();
    }
    this.#refreshUi();
    this.#announce('Груз снят с установки.');
  }

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

  #adaptStandToChain(chainBottomLocalPx: number): void {
    const stand = this.#refs.stand;
    if (!stand) return;
    const standRect = stand.getBoundingClientRect();
    if (standRect.height === 0) return;

    const BASE_SVG_HEIGHT = 480;
    const HOOK_SVG_Y = 72;
    const currentExtra = stand.rodExtra;
    const pxPerSvgY = standRect.height / (BASE_SVG_HEIGHT + currentExtra);
    if (pxPerSvgY <= 0) return;

    const chainBottomSvgY = HOOK_SVG_Y + chainBottomLocalPx / pxPerSvgY;
    const REQUIRED_BOTTOM = chainBottomSvgY + 30;
    const ROD_BOTTOM_DEFAULT = 430;
    const desiredExtra = Math.max(0, Math.ceil(REQUIRED_BOTTOM - ROD_BOTTOM_DEFAULT));

    if (Math.abs(desiredExtra - currentExtra) < 8) return;
    stand.rodExtra = desiredExtra;
    requestAnimationFrame(() => {
      this.#updateMountPosition();
      this.#updateDropZonePositions();
    });
  }

  #updateCardStatus(equipmentId: EquipmentId, status: 'available' | 'in-use'): void {
    this.#cardByEquipmentId.get(equipmentId)?.setAttribute('status', status);
  }

  // ─── Анимация колебаний ────────────────────────────────────

  #startOscillation(): void {
    const state = this.#store.get();
    if (!state.spring) return;

    if (this.#oscillationRafId !== null) cancelAnimationFrame(this.#oscillationRafId);

    const targetMm = this.#equilibriumExtensionMm();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startMm = state.displayedExtensionMm;

    if (Math.abs(startMm - targetMm) < 0.01 || reduceMotion) {
      this.#store.set({ displayedExtensionMm: targetMm, oscillationStartTime: null });
      this.#applyDisplayedExtension();
      return;
    }

    const damping = 1.6;
    const duration = oscillationDuration(damping);
    const startTime = performance.now();
    this.#store.set({ oscillationStartTime: startTime });

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
    this.#updateChainPositions();
    this.#updateDropZonePositions();
  }

  // ─── Измерения и журнал ────────────────────────────────────

  /** Записать текущее измерение в журнал. */
  #doRecord(): void {
    const s = this.#store.get();
    if (s.weights.length === 0) {
      this.#hints.flash('Подвесьте груз перед записью измерения.');
      return;
    }

    const m = totalMass(s.weights);
    const F = massToForce(m);
    const signature = `${m}`;

    // Не дублировать запись с той же конфигурацией грузов
    if (signature === this.#lastRecordedSignature) {
      this.#hints.flash('Это измерение уже записано. Смените груз для новой записи.');
      return;
    }

    const measurement: ElasticMeasurement = {
      timestamp: Date.now(),
      massGrams: m,
      forceN: F,
    };
    this.#measurements.push(measurement);
    this.#lastRecordedSignature = signature;
    this.#announce(`Записано: m = ${m} г, F_упр = ${F.toFixed(2)} Н.`);
    this.#refreshUi();
  }

  // ─── UI rendering ──────────────────────────────────────────

  #refreshUi(): void {
    this.#refreshDropZoneVisibility();
    this.#refreshRecordButton();
    this.#refreshMeasurementPanel();
    this.#refreshStepper();
    this.#renderJournal();
    this.#hints.update(this.#store.get());
    this.#updateMountPosition();
  }

  #refreshStepper(): void {
    const s = this.#store.get();
    let active = 1;
    if (s.spring) active = 2;
    if (s.dynamometer) active = 3;
    if (s.weights.length > 0) active = 4;
    if (this.#measurements.length > 0) active = 0;

    const steps = this.#refs.steps.querySelectorAll<HTMLElement>('.step');
    steps.forEach((el) => {
      const num = Number(el.dataset['step']);
      if (active === 0 || num < active) el.dataset['state'] = 'done';
      else if (num === active) el.dataset['state'] = 'active';
      else el.removeAttribute('data-state');
    });
  }

  #refreshRecordButton(): void {
    const s = this.#store.get();
    const hasWeight = s.weights.length > 0;
    this.#refs.recordBtn.disabled = !hasWeight;
    if (!s.spring) this.#refs.recordBtn.setAttribute('hidden', '');
    else this.#refs.recordBtn.removeAttribute('hidden');
  }

  #refreshMeasurementPanel(): void {
    const count = this.#measurements.length;
    const hasData = count > 0;
    const prevState = this.#refs.measurementPanel.getAttribute('data-state');
    const becameNonEmpty = hasData && prevState !== 'has-data';

    this.#refs.measurementPanel.setAttribute('data-state', hasData ? 'has-data' : 'empty');

    if (hasData) {
      this.#refs.measurementCount.removeAttribute('hidden');
      this.#refs.measurementCount.textContent = String(count);
    } else {
      this.#refs.measurementCount.setAttribute('hidden', '');
      this.#refs.measurementCount.textContent = '';
    }

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

    const standFree = this.#attachedSpringEl === null && this.#attachedDynoEl === null;
    const showSpringDrop = standFree && (draggingKind === 'spring' || draggingKind === 'dynamometer');
    if (showSpringDrop) this.#refs.dropZoneSpring.removeAttribute('hidden');
    else {
      this.#refs.dropZoneSpring.setAttribute('hidden', '');
      this.#refs.dropZoneSpring.classList.remove('drop-zone--active');
    }

    const carrierAttached = this.#attachedSpringEl !== null || this.#attachedDynoEl !== null;
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

  #updateDropZonePositions(): void {
    if (!this.#refs.stand || !this.#refs.standContainer) return;
    const containerRect = this.#refs.standContainer.getBoundingClientRect();

    if (!this.#refs.dropZoneSpring.hasAttribute('hidden')) {
      const standRect = this.#refs.stand.getBoundingClientRect();
      const hookPos = this.#refs.stand.getHookPosition(1);
      const x = standRect.left - containerRect.left + hookPos.x;
      const y = standRect.top - containerRect.top + hookPos.y;
      const w = this.#refs.dropZoneSpring.offsetWidth || 130;
      this.#refs.dropZoneSpring.style.left = `${x - w / 2}px`;
      this.#refs.dropZoneSpring.style.top = `${y + 10}px`;
    }

    if (!this.#refs.dropZoneBottom.hasAttribute('hidden')) {
      const lastEl = this.#lastAttachedElement();
      if (lastEl) {
        const elRect = lastEl.getBoundingClientRect();
        const cx = elRect.left + elRect.width / 2;
        const cy = elRect.bottom - 12;
        const w = this.#refs.dropZoneBottom.offsetWidth || 130;
        this.#refs.dropZoneBottom.style.left = `${cx - containerRect.left - w / 2}px`;
        this.#refs.dropZoneBottom.style.top = `${cy - containerRect.top}px`;
      }
    }
  }

  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  #renderJournal(): void {
    const mode = this.#recordMode();
    const hasData = this.#measurements.length > 0;

    if (hasData) this.#refs.journalEmpty.setAttribute('hidden', '');
    else this.#refs.journalEmpty.removeAttribute('hidden');

    if (!this.#refs.journalHost) return;

    if (hasData) this.#refs.journalHost.removeAttribute('hidden');
    else this.#refs.journalHost.setAttribute('hidden', '');

    const rows: JournalRow[] = this.#measurements.map((m, i) => {
      const draft = this.#journalDrafts.get(m.timestamp) ?? {};
      return {
        idx: i + 1,
        timestamp: m.timestamp,
        values: {
          idx: i + 1,
          m_g: m.massGrams,
          F_N: mode === 'fully-auto' ? m.forceN : (draft['F_N'] ?? null),
        },
        verdicts: this.#journalVerdicts.get(m.timestamp) ?? {},
      };
    });

    renderJournalTable(this.#refs.journalHost, ELASTIC_FORCE_SPEC, rows, {
      mode,
      onCellInput: (rowIdx, key, value) => {
        const m = this.#measurements[rowIdx - 1];
        if (!m) return;
        const ts = m.timestamp;
        const draft = this.#journalDrafts.get(ts) ?? {};
        if (value === null) delete draft[key];
        else draft[key] = value;
        this.#journalDrafts.set(ts, draft);
      },
      onVerify: (rowIdx) => {
        const m = this.#measurements[rowIdx - 1];
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
        const tempRow: JournalRow = {
          idx: rowIdx,
          timestamp: ts,
          values: {
            m_g: m.massGrams,
            F_N: draft['F_N'] ?? null,
          },
        };
        const verdicts = verifyRow(ELASTIC_FORCE_SPEC.columns, tempRow);
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

    // Pending-плашка (semi-auto)
    this.#updateRecordPending();
  }

  #updateRecordPending(): void {
    if (!this.#refs.recordPendingSlot) return;
    const slot = this.#refs.recordPendingSlot;
    const mode = this.#recordMode();
    const s = this.#store.get();
    const hasWeight = s.weights.length > 0;
    const m = totalMass(s.weights);
    const signature = `${m}`;
    const visible = mode === 'semi-auto' && hasWeight && signature !== this.#lastRecordedSignature;
    if (visible) {
      slot.removeAttribute('hidden');
      if (this.#refs.recordPendingSummary) {
        this.#refs.recordPendingSummary.textContent = ` (m = ${m} г)`;
      }
    } else {
      slot.setAttribute('hidden', '');
    }
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
