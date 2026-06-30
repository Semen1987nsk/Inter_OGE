/**
 * LensBenchExperiment — оркестратор опыта 4.1 «Оптическая сила собирающей линзы».
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№4 (стр.19) + КОДИФ §1.29:
 * Сноска (4) дословно:
 * «− измерение оптической силы собирающей линзы, фокусного расстояния собирающей линзы
 * (по свойству равенства размеров предмета и изображения, когда предмет расположен в двойном
 * фокусе), показателя преломления стекла;
 * − исследование свойства изображения, полученного с помощью собирающей линзы, изменения
 * фокусного расстояния двух сложенных линз; зависимости угла преломления от угла падения
 * на границе воздух – стекло.»
 *
 * Workflow (опыт 4.1):
 *   1. Перетащить осветитель, линзу, экран на оптическую скамью.
 *   2. Двигать экран вдоль скамьи до резкого изображения.
 *   3. Снять d (предмет→линза) и f (линза→экран) по шкале скамьи.
 *   4. Ученик вычисляет F = d·f/(d+f) и D = 1/F [дптр].
 *   5. Записать строку журнала → проверка.
 *
 * §21 — журнал v2 (renderJournalTable + LENS_POWER_SPEC + record-mode 'kit-4').
 */

import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { Store } from '@controller/Store';
import { BenchTopology, OpticalBenchAssembly } from '@controller/OpticalBenchAssembly';
import { OpticalDragController } from '@controller/OpticalDragController';
import { focalFromDistances, opticalPower, imageDistance } from '@physics/optics/LensModel';

// §21 — единый журнал v2
import {
  getRecordMode,
  injectRecordModeToggleStyles,
  renderRecordModeToggle,
  type RecordMode,
} from '@labosfera/shared-spa/lib/record-mode';
import { renderJournalTable } from '@labosfera/shared-spa/lib/journal/render';
import { verifyRow } from '@labosfera/shared-spa/lib/journal/verify';
import { LENS_POWER_SPEC } from '@labosfera/shared-spa/lib/journal/specs';
import type { JournalRow, JournalVerdict, JournalSpec } from '@labosfera/shared-spa/lib/journal/types';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** ID слотов на оптической скамье */
export type BenchSlotId = 'object' | 'lens' | 'screen';

/** ID оборудования комплекта */
export type OpticsEquipmentId = 'light-object' | 'lens' | 'screen';

/** Тип прибора для drag-kind */
export type OpticsKind = 'light-object' | 'lens' | 'screen';

interface PlacedInstrument {
  equipmentId: OpticsEquipmentId;
  kind: OpticsKind;
}

interface BenchState {
  placed: Partial<Record<BenchSlotId, PlacedInstrument>>;
  /** Расстояние предмет→линза (мм) */
  objectDistanceMm: number;
  /** Расстояние линза→экран (мм, двигается студентом) */
  screenDistanceMm: number;
  /** Фокусное расстояние установленной линзы (мм) */
  lensF_mm: number;
  measurements: BenchMeasurement[];
  dragging: OpticsEquipmentId | null;
  rayOverlayOn: boolean;
}

export interface BenchMeasurement {
  readonly id: string;
  readonly timestamp: number;
  readonly d_mm: number;
  readonly f_mm: number;
  readonly F_mm: number;
  readonly D_dptr: number;
}

const DEFAULT_OBJECT_DISTANCE_MM = 200;
const DEFAULT_SCREEN_DISTANCE_MM = 200;
const DEFAULT_LENS_F_MM = 100;
/** Полоса фокуса (мм): |screenDistanceMm − imageDistance| ≤ FOCUS_BAND_MM → изображение «резкое». */
const FOCUS_BAND_MM = 5;

const INITIAL_STATE: BenchState = {
  placed: {},
  objectDistanceMm: DEFAULT_OBJECT_DISTANCE_MM,
  screenDistanceMm: DEFAULT_SCREEN_DISTANCE_MM,
  lensF_mm: DEFAULT_LENS_F_MM,
  measurements: [],
  dragging: null,
  rayOverlayOn: false,
};

/** Топология опыта 4.1 — три гнезда на скамье */
const SLOTS_4_1 = [
  { id: 'object', role: 'object' as const, accepts: ['light-object'] },
  { id: 'lens',   role: 'lens'   as const, accepts: ['lens'] },
  { id: 'screen', role: 'screen' as const, accepts: ['screen'] },
] as const;

const RECORD_MODE_KIT = 'kit-4';

// ─── ExperimentRefs ───────────────────────────────────────────────────────────

export interface ExperimentRefs {
  stage: HTMLElement;
  bench: HTMLElement & {
    getSlotRect(id: string): DOMRect;
    setSlotHover(slotId: string, active: boolean): void;
    setObjectDistanceMm(d: number): void;
    setLensFocalMm(F: number): void;
    setScreenDistanceMm(f: number): void;
    setRayOverlay(on: boolean): void;
    setImageSharpness(s: number): void;
  };
  dragOverlay: HTMLElement;
  hintBar: HTMLElement;
  liveRegion: HTMLElement;
  resetBtn: HTMLButtonElement;
  rayOverlayBtn: HTMLButtonElement;
  /** Слайдер положения экрана «двигать до резкости» (#screen-slider). */
  screenSlider: HTMLInputElement;
  screenSliderReadout?: HTMLElement | undefined;
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

  update(st: BenchState): void {
    const placed = st.placed;
    const slotIds: BenchSlotId[] = ['object', 'lens', 'screen'];
    const missing = slotIds.filter((id) => !placed[id]);

    if (missing.length === slotIds.length) {
      this.#set('Перетащите осветитель, линзу и экран на оптическую скамью.');
      return;
    }
    if (missing.length > 0) {
      const labels: Record<BenchSlotId, string> = {
        object: 'осветитель',
        lens: 'линзу',
        screen: 'экран',
      };
      const missingLabels = missing.map((id) => labels[id]).join(', ');
      this.#set(`Добавьте на скамью: ${missingLabels}.`);
      return;
    }
    const d = st.objectDistanceMm;
    const F = st.lensF_mm;
    const imagePlaneMm = Number.isFinite(d) && d !== F ? imageDistance(F, d) : NaN;
    const delta = Number.isFinite(imagePlaneMm)
      ? Math.abs(st.screenDistanceMm - imagePlaneMm)
      : Infinity;
    if (delta < 5) {
      this.#set('Изображение резкое! Запишите d и f в журнал, вычислите F и D.');
    } else {
      this.#set('Двигайте экран вдоль скамьи, пока изображение не станет резким.');
    }
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

// ─── LensBenchExperiment ─────────────────────────────────────────────────────

export class LensBenchExperiment {
  #refs: ExperimentRefs;
  #store: Store<BenchState>;
  #drag: OpticalDragController<OpticsKind, OpticsEquipmentId>;
  #hints: HintEngine;
  #topology: BenchTopology;
  #assembly: OpticalBenchAssembly;
  #cardByEquipmentId = new Map<OpticsEquipmentId, LabEquipmentCard>();

  #journalDrafts = new Map<number, Record<string, number>>();
  #journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
  #detachRecordModeToggle: (() => void) | null = null;
  #lastRecordedSignature = '';
  #lastAnnouncedResult = '';

  constructor(refs: ExperimentRefs) {
    this.#refs = refs;
    this.#store = new Store<BenchState>({ ...INITIAL_STATE });
    this.#drag = new OpticalDragController(refs.dragOverlay);
    this.#hints = new HintEngine(refs.hintBar, refs.liveRegion);

    this.#topology = new BenchTopology(SLOTS_4_1);
    // ЕДИНСТВЕННЫЙ регистратор snap-зон bench-slot-*. О размещениях узнаём через onPlaced —
    // НЕ перерегистрируем зоны (никакого #rewireAssemblySlots).
    this.#assembly = new OpticalBenchAssembly(refs.bench, this.#topology, this.#drag, {
      onPlaced: (slotId, equipmentId) => this.#handlePlaced(slotId, equipmentId),
    });

    this.#wireUp();
    this.#refreshUi();
    this.#hints.update(this.#store.get());
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  get measurements(): ReadonlyArray<BenchMeasurement> {
    return this.#store.get().measurements;
  }

  get objectDistanceMm(): number {
    return this.#store.get().objectDistanceMm;
  }

  get screenDistanceMm(): number {
    return this.#store.get().screenDistanceMm;
  }

  /** Резкость: экран в плоскости изображения (|screenDistanceMm − imageDistance(F,d)| ≤ полоса фокуса). */
  get isSharp(): boolean {
    const st = this.#store.get();
    const plane = imageDistance(st.lensF_mm, st.objectDistanceMm);
    if (!Number.isFinite(plane) || plane <= 0) return false;
    return Math.abs(st.screenDistanceMm - plane) <= FOCUS_BAND_MM;
  }

  /** Ориентация изображения: при d>F реальное перевёрнутое, при d<F мнимое прямое. */
  get imageOrientation(): 'inverted' | 'upright' {
    const st = this.#store.get();
    return st.objectDistanceMm > st.lensF_mm ? 'inverted' : 'upright';
  }

  /** Программно разместить прибор в слот (для тестов). */
  placeInSlot(slotId: BenchSlotId, equipmentId: OpticsEquipmentId): boolean {
    const kind = this.#kindForEquipment(equipmentId);
    if (!kind) return false;
    const slotDef = SLOTS_4_1.find((s) => s.id === slotId);
    if (!slotDef || !(slotDef.accepts as ReadonlyArray<string>).includes(kind)) return false;
    const ok = this.#topology.place(slotId, kind);
    if (!ok) return false;
    this.#recordPlacement(slotId, equipmentId, kind);
    this.#afterBenchChange();
    return true;
  }

  /** Установить расстояние предмет→линза (мм). */
  setObjectDistanceMm(d: number): void {
    if (!Number.isFinite(d) || d <= 0) return;
    this.#store.update(() => ({ objectDistanceMm: d }));
    this.#refs.bench.setObjectDistanceMm(d);
    this.#afterBenchChange();
  }

  /** Установить расстояние линза→экран (мм) — ключевое взаимодействие студента. */
  setScreenDistanceMm(f: number): void {
    if (!Number.isFinite(f) || f <= 0) return;
    this.#store.update(() => ({ screenDistanceMm: f }));
    this.#refs.bench.setScreenDistanceMm(f);
    this.#syncScreenSlider(f);
    this.#afterBenchChange();
  }

  /** Записать измерение в журнал. */
  recordMeasurement(): void {
    const st = this.#store.get();
    if (!this.#topology.validate().ok) return;

    const d = st.objectDistanceMm;
    const f = st.screenDistanceMm;
    const F = focalFromDistances(d, f);
    const D = opticalPower(F / 1000);

    const measurement: BenchMeasurement = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      d_mm: d,
      f_mm: f,
      F_mm: F,
      D_dptr: D,
    };

    this.#store.update((s: Readonly<BenchState>) => ({
      measurements: [...s.measurements, measurement],
    }));
    this.#lastRecordedSignature = this.#pendingSignature();
    this.#refreshUi();
    this.#hints.announce(
      `Записано: d = ${d.toFixed(0)} мм, f = ${f.toFixed(0)} мм, F ≈ ${F.toFixed(0)} мм.`,
    );
  }

  /** Переключить opt-in оверлей лучей. */
  toggleRayOverlay(): void {
    const on = !this.#store.get().rayOverlayOn;
    this.#store.update(() => ({ rayOverlayOn: on }));
    this.#refs.bench.setRayOverlay(on);
    this.#refs.rayOverlayBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  /** Сброс установки. reset() — единственное место с полной заменой состояния. */
  reset(): void {
    this.#drag.cancel();
    this.#topology.reset();
    this.#store.set({ ...INITIAL_STATE });
    this.#lastAnnouncedResult = '';
    this.#journalDrafts.clear();
    this.#journalVerdicts.clear();
    this.#lastRecordedSignature = '';
    for (const card of this.#cardByEquipmentId.values()) {
      card.setAttribute('status', 'available');
      card.removeAttribute('data-placed');
    }
    this.#refs.bench.setObjectDistanceMm(DEFAULT_OBJECT_DISTANCE_MM);
    this.#refs.bench.setLensFocalMm(DEFAULT_LENS_F_MM);
    this.#refs.bench.setScreenDistanceMm(DEFAULT_SCREEN_DISTANCE_MM);
    this.#refs.bench.setRayOverlay(false);
    this.#refs.rayOverlayBtn.setAttribute('aria-pressed', 'false');
    this.#syncScreenSlider(DEFAULT_SCREEN_DISTANCE_MM);
    this.#refreshUi();
    this.#hints.update(this.#store.get());
    this.#hints.announce('Установка сброшена. Все приборы вернулись в комплект.');
  }

  /** Cleanup при unmount. Зоны bench-slot-* снимает ассамблея (единственный регистратор). */
  destroy(): void {
    this.#drag.cancel();
    this.#assembly.destroy();
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
  }

  // ─── Wiring ──────────────────────────────────────────────────────────────

  #wireUp(): void {
    this.#refs.cards.forEach((card) => {
      const equipmentId = card.dataset['eq'] as OpticsEquipmentId | undefined;
      if (!equipmentId) return;
      this.#cardByEquipmentId.set(equipmentId, card);

      const kind = this.#kindForEquipment(equipmentId);
      if (!kind) return;

      const draggable = card.querySelector<HTMLElement>(
        'lab-light-object, lab-lens, lab-screen',
      );
      if (!draggable) return;

      this.#drag.attach(draggable, {
        equipmentId,
        kind,
        onDragStart: () => {
          this.#store.update(() => ({ dragging: equipmentId }));
          // REST-state: подсветки гнёзд скамьи проявляются только в drag-режиме.
          this.#refs.bench.classList.add('dragging-active');
        },
        onDragEnd: () => {
          this.#store.update(() => ({ dragging: null }));
          this.#refs.bench.classList.remove('dragging-active');
        },
      });

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

    // bench-slot-* зоны регистрирует ТОЛЬКО OpticalBenchAssembly (см. конструктор) —
    // здесь НЕ перерегистрируем; размещения приходят через onPlaced → #handlePlaced.

    this.#refs.resetBtn.addEventListener('click', () => this.reset());

    this.#refs.rayOverlayBtn.addEventListener('click', () => this.toggleRayOverlay());

    // Слайдер положения экрана — «двигать экран до резкости».
    this.#refs.screenSlider.addEventListener('input', () => {
      const f = Number(this.#refs.screenSlider.value);
      if (Number.isFinite(f)) this.setScreenDistanceMm(f);
    });

    // §20.4 — record-mode toggle
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

    // Measurement panel toggle
    const toggle = this.#refs.stage.querySelector<HTMLButtonElement>('#measurement-toggle');
    toggle?.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const body = this.#refs.stage.querySelector<HTMLElement>('#measurement-body');
      if (body) body.hidden = expanded;
    });
  }

  /**
   * Колбэк успешного размещения прибора в слот (инжектируется в OpticalBenchAssembly через onPlaced).
   * Topology.place уже выполнен ассамблеей; здесь обновляем стейт/карточку и пересчитываем UI.
   * Зоны bench-slot-* регистрирует ТОЛЬКО ассамблея — здесь их НЕ трогаем.
   */
  #handlePlaced(slotId: string, equipmentId: string): void {
    const kind = this.#kindForEquipment(equipmentId as OpticsEquipmentId);
    if (!kind) return;
    this.#recordPlacement(slotId as BenchSlotId, equipmentId as OpticsEquipmentId, kind);
    this.#afterBenchChange();
  }

  /** Записать размещение в стейт (частичный update) и пометить карточку как placed. */
  #recordPlacement(slotId: BenchSlotId, equipmentId: OpticsEquipmentId, kind: OpticsKind): void {
    this.#store.update((st: Readonly<BenchState>) => ({
      placed: {
        ...st.placed,
        [slotId]: { equipmentId, kind },
      } as Partial<Record<BenchSlotId, PlacedInstrument>>,
    }));
    const card = this.#cardByEquipmentId.get(equipmentId);
    if (card) {
      card.setAttribute('status', 'placed');
      card.dataset['placed'] = slotId;
    }
  }

  /** Синхронизировать значение слайдера и mm-readout с текущим положением экрана. */
  #syncScreenSlider(f: number): void {
    if (this.#refs.screenSlider.value !== String(Math.round(f))) {
      this.#refs.screenSlider.value = String(Math.round(f));
    }
    if (this.#refs.screenSliderReadout) {
      this.#refs.screenSliderReadout.textContent = `${Math.round(f)} мм`;
    }
  }

  #afterBenchChange(): void {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();

    if (ok) {
      // Обновить скамью: объект, линза установлены — передать позиции
      this.#refs.bench.setObjectDistanceMm(st.objectDistanceMm);
      this.#refs.bench.setLensFocalMm(st.lensF_mm);
      this.#refs.bench.setScreenDistanceMm(st.screenDistanceMm);

      // Slide-to-focus: пересчитать плоскость изображения и передать резкость на скамью.
      const plane = imageDistance(st.lensF_mm, st.objectDistanceMm);
      const sharpness =
        Number.isFinite(plane) && plane > 0
          ? 1 / (1 + Math.abs(st.screenDistanceMm - plane) / 30)
          : 0;
      this.#refs.bench.setImageSharpness(sharpness);

      // fully-auto: авто-запись при движении экрана в плоскость изображения
      if (this.#recordMode() === 'fully-auto' && this.#pendingSignature() !== this.#lastRecordedSignature) {
        this.recordMeasurement();
      }
    }

    this.#refreshUi();
    this.#hints.update(st);
  }

  #handleRecordModeChange(): void {
    const { ok } = this.#topology.validate();
    if (this.#recordMode() === 'fully-auto' && ok) {
      if (this.#pendingSignature() !== this.#lastRecordedSignature) {
        this.recordMeasurement();
      }
    }
    this.#refreshUi();
  }

  // ─── UI refresh ──────────────────────────────────────────────────────────

  #refreshUi(): void {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    const hasMeasurements = st.measurements.length > 0;

    // Measurement panel state
    const panel = this.#refs.stage.querySelector<HTMLElement>('#measurement-panel');
    if (panel) {
      panel.dataset['state'] = hasMeasurements ? 'recorded' : 'empty';
    }

    // Measurement count badge
    const cnt = this.#refs.stage.querySelector<HTMLElement>('#measurement-count');
    if (cnt) {
      cnt.hidden = !hasMeasurements;
      if (hasMeasurements) cnt.textContent = String(st.measurements.length);
    }

    // Journal empty visibility
    const je = this.#refs.stage.querySelector<HTMLElement>('#journal-empty');
    if (je) je.hidden = hasMeasurements;

    // Pending-плашка (semi-auto)
    const isPending = ok && this.#pendingSignature() !== this.#lastRecordedSignature;
    const mode = this.#recordMode();
    if (this.#refs.recordPendingSlot) {
      this.#refs.recordPendingSlot.hidden = !(isPending && mode === 'semi-auto');
    }
    if (this.#refs.recordPendingSummary && isPending) {
      this.#refs.recordPendingSummary.textContent =
        `d=${st.objectDistanceMm.toFixed(0)} мм, f=${st.screenDistanceMm.toFixed(0)} мм`;
    }

    // Render journal table
    if (hasMeasurements && this.#refs.journalHost) {
      this.#refs.journalHost.hidden = false;
      const spec: JournalSpec = LENS_POWER_SPEC;
      const rows = this.#buildJournalRows(st.measurements);
      renderJournalTable(this.#refs.journalHost, spec, rows, {
        mode: mode as 'semi-auto' | 'fully-manual' | 'fully-auto',
        onCellInput: (rowIdx, key, value) => {
          const m = st.measurements[rowIdx - 1];
          if (!m) return;
          const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
          if (value !== null) drafts[key] = value; else delete drafts[key];
          this.#journalDrafts.set(m.timestamp, drafts);
        },
        onVerify: (rowIdx) => {
          const m = st.measurements[rowIdx - 1];
          if (!m) return;
          const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
          const journalRow = this.#buildJournalRow(m, rowIdx);
          for (const [k, v] of Object.entries(drafts)) journalRow.values[k] = v;
          const verdicts = verifyRow(LENS_POWER_SPEC.columns, journalRow);
          this.#journalVerdicts.set(m.timestamp, verdicts);
          this.#refreshUi();
        },
      });
    } else if (this.#refs.journalHost) {
      this.#refs.journalHost.hidden = true;
    }

    // Result panel: показываем F и D после записи. aria-live="polite" → guard re-announce:
    // перерисовываем innerHTML ТОЛЬКО при реальной смене контента (урок kit-3 Фаза D/E —
    // иначе скрин-ридер дублирует объявление на каждый refreshUi).
    if (hasMeasurements) {
      const last = st.measurements[st.measurements.length - 1]!;
      const Fstr = last.F_mm.toFixed(0);
      const Dstr = last.D_dptr.toFixed(1).replace('.', ',');
      const html =
        `<p class="result-line">` +
        `<strong>F</strong> = ${Fstr} мм` +
        `<span class="result-sep">, </span>` +
        `<strong>D</strong> = ${Dstr} дптр</p>` +
        `<p class="result-note">Вычислите F и D по формулам, сравните с таблицей.</p>`;
      this.#refs.resultPanel.hidden = false;
      if (html !== this.#lastAnnouncedResult) {
        this.#refs.resultPanel.innerHTML = html;
        this.#lastAnnouncedResult = html;
      }
    } else {
      this.#refs.resultPanel.hidden = true;
      this.#refs.resultPanel.innerHTML = '';
      this.#lastAnnouncedResult = '';
    }
  }

  #buildJournalRows(list: ReadonlyArray<BenchMeasurement>): JournalRow[] {
    return list.map((m, i) => {
      const row = this.#buildJournalRow(m, i + 1);
      const drafts = this.#journalDrafts.get(m.timestamp) ?? {};
      for (const [k, v] of Object.entries(drafts)) row.values[k] = v;
      const verdicts = this.#journalVerdicts.get(m.timestamp);
      if (verdicts) row.verdicts = verdicts;
      return row;
    });
  }

  #buildJournalRow(m: BenchMeasurement, idx: number): JournalRow {
    const isFullyAuto = this.#recordMode() === 'fully-auto';
    return {
      idx,
      timestamp: m.timestamp,
      values: {
        d_mm: m.d_mm,
        f_mm: m.f_mm,
        F_mm: isFullyAuto ? m.F_mm : null,
        D_dptr: isFullyAuto ? m.D_dptr : null,
      },
    };
  }

  #pendingSignature(): string {
    const st = this.#store.get();
    const { ok } = this.#topology.validate();
    if (!ok) return '';
    return `${st.objectDistanceMm.toFixed(0)}-${st.screenDistanceMm.toFixed(0)}`;
  }

  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  #kindForEquipment(id: OpticsEquipmentId): OpticsKind | null {
    const map: Record<OpticsEquipmentId, OpticsKind> = {
      'light-object': 'light-object',
      'lens': 'lens',
      'screen': 'screen',
    };
    return map[id] ?? null;
  }
}
