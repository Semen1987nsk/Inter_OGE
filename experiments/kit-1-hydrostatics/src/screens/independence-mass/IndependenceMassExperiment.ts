/**
 * IndependenceMassExperiment — оркестратор опыта 1.5 «Независимость
 * выталкивающей силы от массы тела».
 *
 * ФИПИ-2026, Спецификация КИМ, Приложение 2, стр. 16, Комплект №1:
 * «исследование … независимости выталкивающей силы от массы тела
 *  (цилиндры №1 и 2)».
 *
 * КОДИФ §1.29 (стр. 14) — практическая работа из канонического перечня.
 *
 * Физика: цилиндры №1 (сталь, m=195 г) и №2 (алюминий, m=70 г) имеют
 * одинаковый объём V=25 см³. F_арх = ρ_воды·g·V ≈ 0,245 Н для обоих.
 * Ученик измеряет P_возд и P_жид для каждого и убеждается F_A_1 ≈ F_A_2.
 *
 * Layout — REFERENCE §31: 2-колоночный grid (workbench | equipment-panel),
 * Степпер 1→2→3→4, Floating measurement-panel с журналом.
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
import { INDEPENDENCE_MASS_SPEC } from '@shared/lib/journal/specs';
import type { JournalRow } from '@shared/lib/journal/types';
import {
  DragDropController,
  type EquipmentDropDetail,
} from '../density-solid/controller/DragDropController';
import {
  buoyantForceForCylinder,
  forcesAreEqual,
} from '../../physics/independence-mass/IndependenceCalc';
import { G } from '../../physics/archimedes/ArchimedesCalc';

const RECORD_MODE_KIT = 'kit-1';

/** Данные цилиндров по ФИПИ паспорту, Комплект №1. */
const CYLINDERS = [
  { idx: 1, cylinder: 'Цилиндр №1 (сталь)', m_g: 195, V_cm3: 25 },
  { idx: 2, cylinder: 'Цилиндр №2 (алюминий)', m_g: 70, V_cm3: 25 },
] as const;

type CylIdx = 1 | 2;

/** Состояние одного измерения цилиндра. */
interface CylMeasure {
  /** P_возд — вес в воздухе (Н), зафиксирован при dip. */
  P_air_N: number;
  /** P_жид — вес в жидкости (Н). */
  P_liq_N: number;
  /** Цилиндр сейчас в воде (dip активен). */
  dipped: boolean;
  /** Измерение записано в журнал. */
  recorded: boolean;
}

interface IMState {
  readonly recordMode: RecordMode;
  readonly rows: ReadonlyArray<JournalRow>;
  readonly staged: {
    readonly dyno: boolean;
    readonly beaker: boolean;
  };
  readonly cyl1: CylMeasure | null;
  readonly cyl2: CylMeasure | null;
}

const INITIAL_STATE: IMState = {
  recordMode: DEFAULT_RECORD_MODE,
  rows: [],
  staged: { dyno: false, beaker: false },
  cyl1: null,
  cyl2: null,
};

type StepId = 1 | 2 | 3 | 4;
type StepState = 'pending' | 'active' | 'done';

const STEP_HINTS: Record<StepId, string> = {
  1: 'Перетащите динамометр 5 Н на штатив.',
  2: 'Поставьте стакан с водой под динамометр.',
  3: 'Погрузите поочерёдно цилиндр №1 и №2 в воду, записывая P возд и P жид для каждого.',
  4: 'Сравните F_A = P возд − P жид для обоих цилиндров. Вывод: F_A не зависит от массы!',
};

interface IMRefs {
  readonly rootHost: HTMLElement;
  readonly steps: HTMLElement;
  readonly hint: HTMLElement;
  readonly resetBtn: HTMLButtonElement;
  readonly dynoMount: HTMLElement;
  readonly dropzoneDyno: HTMLElement;
  readonly detachDynoBtn: HTMLButtonElement;
  readonly beakerMount: HTMLElement;
  readonly dropzoneBeaker: HTMLElement;
  readonly detachBeakerBtn: HTMLButtonElement;
  readonly dyno: HTMLElement;
  readonly beaker: HTMLElement;
  readonly cardDyno: HTMLElement;
  readonly cardBeaker: HTMLElement;
  readonly measurePanel: HTMLElement;
  readonly btnDip1: HTMLButtonElement;
  readonly btnLift1: HTMLButtonElement;
  readonly btnRecord1: HTMLButtonElement;
  readonly cyl1Status: HTMLElement;
  readonly btnDip2: HTMLButtonElement;
  readonly btnLift2: HTMLButtonElement;
  readonly btnRecord2: HTMLButtonElement;
  readonly cyl2Status: HTMLElement;
  readonly verdictEl: HTMLElement;
  readonly verdictText: HTMLElement;
  readonly journalHost: HTMLElement;
  readonly journalEmpty: HTMLElement;
  readonly formulaDisplay: HTMLElement;
  readonly measurementCount: HTMLElement;
  readonly recordModeSlot: HTMLElement;
  readonly recordPendingSlot: HTMLElement;
  readonly recordPendingBtn: HTMLButtonElement;
  readonly recordPendingSummary: HTMLElement;
  readonly liveRegion: HTMLElement;
}

/** Симуляция шума динамометра (как в других опытах). */
const DYNO_NOISE_N = 0.005;

export class IndependenceMassExperiment {
  readonly #refs: IMRefs;
  readonly #store: Store<IMState>;
  #detachRecordModeToggle: (() => void) | null = null;
  #unsubscribe: (() => void) | null = null;
  #dragController: DragDropController | null = null;

  constructor(refs: IMRefs) {
    this.#refs = refs;
    const persistedMode = getRecordMode(RECORD_MODE_KIT);
    this.#store = new Store<IMState>({ ...INITIAL_STATE, recordMode: persistedMode });
    applyRecordModeAttribute(persistedMode);
    injectRecordModeToggleStyles(document);

    this.#detachRecordModeToggle = renderRecordModeToggle(this.#refs.recordModeSlot, {
      kitId: RECORD_MODE_KIT,
      onChange: (mode) => {
        applyRecordModeAttribute(mode);
        this.#store.set({ ...this.#store.get(), recordMode: mode });
      },
    });

    this.#wireButtons();
    this.#wireDragDrop();
    this.#unsubscribe = this.#store.subscribe(() => this.#render());
    this.#applyDynoForce(0);
    this.#render();
  }

  reset(): void {
    this.#parkInCard('dyno');
    this.#parkInCard('beaker');
    this.#applyDynoForce(0);
    this.#store.set({ ...INITIAL_STATE, recordMode: this.#store.get().recordMode });
    this.#announce('Опыт сброшен, приборы возвращены в комплект');
  }

  destroy(): void {
    this.#detachRecordModeToggle?.();
    this.#unsubscribe?.();
    this.#dragController?.destroy();
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
    this.#announce('Динамометр 5 Н на штативе');
  }

  placeBeaker(): void {
    const s = this.#store.get();
    if (s.staged.beaker) return;
    this.#mountInStage('beaker');
    this.#store.set({ ...s, staged: { ...s.staged, beaker: true } });
    this.#announce('Стакан с водой на месте');
  }

  dipCylinder(cylIdx: CylIdx): void {
    const s = this.#store.get();
    if (!s.staged.dyno || !s.staged.beaker) return;
    const cylData = CYLINDERS.find(c => c.idx === cylIdx)!;
    const P_air_N = (cylData.m_g / 1000) * G + (Math.random() - 0.5) * 2 * DYNO_NOISE_N;
    const F_A_theor = buoyantForceForCylinder(cylData.V_cm3);
    const P_liq_N = Math.max(0, P_air_N - F_A_theor + (Math.random() - 0.5) * 2 * DYNO_NOISE_N);
    const measure: CylMeasure = { P_air_N, P_liq_N, dipped: true, recorded: false };
    this.#applyDynoForce(P_liq_N);
    if (cylIdx === 1) {
      this.#store.set({ ...s, cyl1: measure });
    } else {
      this.#store.set({ ...s, cyl2: measure });
    }
    this.#announce(
      `Цилиндр №${cylIdx} погружён: P возд=${P_air_N.toFixed(2)} Н, P жид=${P_liq_N.toFixed(2)} Н`,
    );
  }

  liftCylinder(cylIdx: CylIdx): void {
    const s = this.#store.get();
    const measure = cylIdx === 1 ? s.cyl1 : s.cyl2;
    if (!measure?.dipped) return;
    const updated: CylMeasure = { ...measure, dipped: false };
    this.#applyDynoForce(0);
    if (cylIdx === 1) {
      this.#store.set({ ...s, cyl1: updated });
    } else {
      this.#store.set({ ...s, cyl2: updated });
    }
    this.#announce(`Цилиндр №${cylIdx} поднят из воды`);
  }

  recordCylinder(cylIdx: CylIdx): void {
    const s = this.#store.get();
    const measure = cylIdx === 1 ? s.cyl1 : s.cyl2;
    if (!measure || measure.recorded) return;
    const cylData = CYLINDERS.find(c => c.idx === cylIdx)!;
    const row: JournalRow = {
      idx: s.rows.length + 1,
      timestamp: Date.now() + Math.random(),
      values: {
        idx: cylData.idx,
        cylinder: cylData.cylinder,
        m_g: cylData.m_g,
        V_cm3: cylData.V_cm3,
        P_air_N: parseFloat(measure.P_air_N.toFixed(3)),
        P_liq_N: parseFloat(measure.P_liq_N.toFixed(3)),
        F_A_N: parseFloat((measure.P_air_N - measure.P_liq_N).toFixed(3)),
      },
    };
    const updated: CylMeasure = { ...measure, recorded: true };
    const newRows = [...s.rows, row];
    if (cylIdx === 1) {
      this.#store.set({ ...s, rows: newRows, cyl1: updated });
    } else {
      this.#store.set({ ...s, rows: newRows, cyl2: updated });
    }
    this.#announce(
      `Записано: цилиндр №${cylIdx}, F_A=${(measure.P_air_N - measure.P_liq_N).toFixed(2)} Н`,
    );
  }

  getState(): IMState {
    return this.#store.get();
  }

  detachDynamometer(): void {
    const s = this.#store.get();
    if (!s.staged.dyno) return;
    this.#parkInCard('dyno');
    this.#applyDynoForce(0);
    this.#store.set({
      ...s,
      staged: { ...s.staged, dyno: false },
      cyl1: s.cyl1 ? { ...s.cyl1, dipped: false } : null,
      cyl2: s.cyl2 ? { ...s.cyl2, dipped: false } : null,
    });
  }

  detachBeaker(): void {
    const s = this.#store.get();
    if (!s.staged.beaker) return;
    this.#parkInCard('beaker');
    this.#store.set({
      ...s,
      staged: { ...s.staged, beaker: false },
      cyl1: s.cyl1 ? { ...s.cyl1, dipped: false } : null,
      cyl2: s.cyl2 ? { ...s.cyl2, dipped: false } : null,
    });
  }

  // ─── D&D ────────────────────────────────────────────────────────────

  #wireDragDrop(): void {
    this.#dragController = new DragDropController(this.#refs.rootHost, (detail) =>
      this.#handleDrop(detail),
    );
  }

  #handleDrop(detail: EquipmentDropDetail): void {
    switch (detail.eqId) {
      case 'dyno-5':
        if (detail.dropzoneId === 'im-dyno-zone') this.placeDynamometer();
        break;
      case 'beaker':
        if (detail.dropzoneId === 'im-beaker-zone') this.placeBeaker();
        break;
    }
  }

  #mountInStage(which: 'dyno' | 'beaker'): void {
    const { card, comp, mount } = this.#getTriple(which);
    if (comp.parentElement === mount) return;
    mount.appendChild(comp);
    mount.hidden = false;
    card.dataset['attached'] = 'true';
  }

  #parkInCard(which: 'dyno' | 'beaker'): void {
    const { card, comp, mount } = this.#getTriple(which);
    if (comp.parentElement === card) return;
    card.appendChild(comp);
    delete card.dataset['attached'];
    mount.hidden = true;
  }

  #getTriple(which: 'dyno' | 'beaker'): {
    card: HTMLElement;
    comp: HTMLElement;
    mount: HTMLElement;
  } {
    if (which === 'dyno') {
      return {
        card: this.#refs.cardDyno,
        comp: this.#refs.dyno,
        mount: this.#refs.dynoMount,
      };
    }
    return {
      card: this.#refs.cardBeaker,
      comp: this.#refs.beaker,
      mount: this.#refs.beakerMount,
    };
  }

  // ─── Кнопки ─────────────────────────────────────────────────────────

  #wireButtons(): void {
    this.#refs.resetBtn.addEventListener('click', () => this.reset());
    this.#refs.detachDynoBtn.addEventListener('click', () => this.detachDynamometer());
    this.#refs.detachBeakerBtn.addEventListener('click', () => this.detachBeaker());
    this.#refs.btnDip1.addEventListener('click', () => this.dipCylinder(1));
    this.#refs.btnLift1.addEventListener('click', () => this.liftCylinder(1));
    this.#refs.btnRecord1.addEventListener('click', () => this.recordCylinder(1));
    this.#refs.btnDip2.addEventListener('click', () => this.dipCylinder(2));
    this.#refs.btnLift2.addEventListener('click', () => this.liftCylinder(2));
    this.#refs.btnRecord2.addEventListener('click', () => this.recordCylinder(2));
    this.#refs.recordPendingBtn.addEventListener('click', () => {
      // В режиме semi-auto recordPendingBtn записывает текущее незаписанное измерение.
      const s = this.#store.get();
      if (s.cyl1 && !s.cyl1.recorded) { this.recordCylinder(1); return; }
      if (s.cyl2 && !s.cyl2.recorded) { this.recordCylinder(2); return; }
    });
  }

  // ─── Рендер ─────────────────────────────────────────────────────────

  #computeActiveStep(s: IMState): StepId {
    if (!s.staged.dyno) return 1;
    if (!s.staged.beaker) return 2;
    if (s.rows.length < 2) return 3;
    return 4;
  }

  #render(): void {
    const s = this.#store.get();
    const active = this.#computeActiveStep(s);

    // Степпер
    this.#refs.steps.querySelectorAll<HTMLElement>('.step').forEach((stepEl) => {
      const n = Number(stepEl.dataset['step']) as StepId;
      let state: StepState;
      if (n < active) state = 'done';
      else if (n === active) state = 'active';
      else state = 'pending';
      stepEl.dataset['state'] = state;
    });

    this.#refs.hint.textContent = STEP_HINTS[active];

    // Монтаж/демонтаж элементов
    this.#refs.dynoMount.hidden = !s.staged.dyno;
    this.#refs.dropzoneDyno.hidden = s.staged.dyno;
    this.#refs.detachDynoBtn.hidden = !s.staged.dyno;

    this.#refs.beakerMount.hidden = !s.staged.beaker;
    this.#refs.dropzoneBeaker.hidden = s.staged.beaker;
    this.#refs.detachBeakerBtn.hidden = !s.staged.beaker;

    // Панель измерений
    const ready = s.staged.dyno && s.staged.beaker;
    this.#refs.measurePanel.hidden = !ready;

    if (ready) {
      // Цилиндр №1
      const c1 = s.cyl1;
      this.#refs.btnDip1.disabled = !!(c1?.dipped || c1?.recorded);
      this.#refs.btnLift1.disabled = !c1?.dipped;
      this.#refs.btnRecord1.disabled = !c1 || c1.recorded || c1.dipped;
      if (c1?.recorded) {
        this.#refs.cyl1Status.textContent =
          `F_A = ${(c1.P_air_N - c1.P_liq_N).toFixed(2)} Н — записано`;
      } else if (c1?.dipped) {
        this.#refs.cyl1Status.textContent =
          `P жид = ${c1.P_liq_N.toFixed(2)} Н (в воде)`;
      } else if (c1) {
        this.#refs.cyl1Status.textContent =
          `F_A = ${(c1.P_air_N - c1.P_liq_N).toFixed(2)} Н — нажмите «Записать»`;
      } else {
        this.#refs.cyl1Status.textContent = '';
      }

      // Цилиндр №2 — доступен после записи №1
      const c1done = !!(c1?.recorded);
      const c2 = s.cyl2;
      this.#refs.btnDip2.disabled = !c1done || !!(c2?.dipped || c2?.recorded);
      this.#refs.btnLift2.disabled = !c2?.dipped;
      this.#refs.btnRecord2.disabled = !c2 || c2.recorded || c2.dipped;
      if (c2?.recorded) {
        this.#refs.cyl2Status.textContent =
          `F_A = ${(c2.P_air_N - c2.P_liq_N).toFixed(2)} Н — записано`;
      } else if (c2?.dipped) {
        this.#refs.cyl2Status.textContent =
          `P жид = ${c2.P_liq_N.toFixed(2)} Н (в воде)`;
      } else if (c2) {
        this.#refs.cyl2Status.textContent =
          `F_A = ${(c2.P_air_N - c2.P_liq_N).toFixed(2)} Н — нажмите «Записать»`;
      } else {
        this.#refs.cyl2Status.textContent = '';
      }
    }

    // Вердикт
    if (s.cyl1?.recorded && s.cyl2?.recorded) {
      const fa1 = s.cyl1.P_air_N - s.cyl1.P_liq_N;
      const fa2 = s.cyl2.P_air_N - s.cyl2.P_liq_N;
      const equal = forcesAreEqual(fa1, fa2);
      this.#refs.verdictEl.hidden = false;
      this.#refs.verdictEl.dataset['equal'] = String(equal);
      this.#refs.verdictText.textContent = equal
        ? `F_арх(№1) ≈ F_арх(№2) → выталкивающая сила не зависит от массы тела!`
        : `F_арх(№1) = ${fa1.toFixed(2)} Н, F_арх(№2) = ${fa2.toFixed(2)} Н — проверьте измерения.`;
    } else {
      this.#refs.verdictEl.hidden = true;
    }

    // Журнал
    const hasRows = s.rows.length > 0;
    this.#refs.journalEmpty.hidden = hasRows;
    this.#refs.formulaDisplay.hidden = !hasRows;
    this.#refs.journalHost.hidden = !hasRows;
    this.#refs.measurementCount.hidden = !hasRows;
    if (hasRows) this.#refs.measurementCount.textContent = String(s.rows.length);

    if (!hasRows) {
      const allStaged = s.staged.dyno && s.staged.beaker;
      this.#refs.journalEmpty.textContent = allStaged
        ? 'Погрузите цилиндр №1 в воду и запишите F_A = P возд − P жид. Затем повторите для №2.'
        : 'Соберите установку: динамометр 5 Н → стакан с водой.';
    }

    renderJournalTable(this.#refs.journalHost, INDEPENDENCE_MASS_SPEC, s.rows, {
      mode: s.recordMode,
      onCellInput: () => {},
      onVerify: () => {},
    });

    // Pending-плашка: показываем если есть незаписанное измерение
    const pendingCyl = !s.cyl1?.recorded && s.cyl1 && !s.cyl1.dipped
      ? 1
      : (!s.cyl2?.recorded && s.cyl2 && !s.cyl2.dipped ? 2 : null);
    const showPending = s.recordMode === 'semi-auto' && pendingCyl !== null;
    this.#refs.recordPendingSlot.hidden = !showPending;
    if (showPending && pendingCyl !== null) {
      const m = pendingCyl === 1 ? s.cyl1! : s.cyl2!;
      const fa = m.P_air_N - m.P_liq_N;
      this.#refs.recordPendingSummary.textContent = `· №${pendingCyl}, F_A=${fa.toFixed(2)}`;
    }
  }

  #applyDynoForce(forceN: number): void {
    const noisy = forceN + (Math.random() - 0.5) * 2 * DYNO_NOISE_N;
    this.#refs.dyno.setAttribute('force', noisy.toFixed(3));
  }

  #announce(message: string): void {
    this.#refs.liveRegion.textContent = message;
  }
}
