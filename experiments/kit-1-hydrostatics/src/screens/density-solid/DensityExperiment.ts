/**
 * DensityExperiment — оркестратор опыта 1.1 «Плотность твёрдого тела».
 *
 * Реалистичный workflow (повторяет kit-2 паттерн):
 *   1. На старте сцена ПУСТА — у пользователя видны 11 предметов комплекта №1
 *      ФИПИ в правой панели (карточки приборов): весы, мензурка, 2 динамометра,
 *      4 цилиндра, стакан, нить, соль с палочкой.
 *   2. Клик по карточке «весы» → весы появляются в левом слоте сцены.
 *   3. Клик по карточке «мензурка» → мензурка появляется в правом слоте.
 *   4. Клик по карточке цилиндра → выбран (orange highlight).
 *   5. Клик по весам → груз на весах, LCD = m.
 *   6. Клик по мензурке (без груза на весах) → налить 100 мл (V₁).
 *   7. Клик по мензурке (с грузом на весах + есть V₁) → погрузить → запись в журнал.
 *
 * Динамометры/стакан/нить/соль — для опытов 1.2-1.5; в 1.1 не нужны, лежат
 * в комплекте как полный набор ФИПИ.
 */

import { Store } from '@shared/controller/Store';
import { CYLINDER_BY_ID, type CylinderSpec } from '../../types';
import { calculateDensity, type DensityResult } from '../../physics/density/DensityCalc';
import { DragDropController, type EquipmentDropDetail } from './controller/DragDropController';
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
import { DENSITY_SPEC } from '@shared/lib/journal/specs';
import { rowVerdictAggregate, verifyRow } from '@shared/lib/journal/verify';
import { parseRu } from '@shared/lib/journal/format';
import type { JournalRow } from '@shared/lib/journal/types';

const RECORD_MODE_KIT = 'kit-1';

interface Refs {
  rootHost: HTMLElement;             // host экрана — для DragDropController
  steps: HTMLElement;
  hintBar: HTMLElement;
  resetBtn: HTMLButtonElement;
  equipmentCards: HTMLElement[];     // все карточки equipment-panel
  cylinderCards: HTMLElement[];      // только cyl-N
  weightsInCards: HTMLElement[];     // lab-metal-weight внутри карточек
  // Слоты на сцене
  slotBalance: HTMLElement;
  slotBalanceEmpty: HTMLElement;
  slotBalanceCaption: HTMLElement;
  stageBalance: HTMLElement;         // <lab-balance> на сцене
  detachBalance: HTMLButtonElement;  // X — убрать весы
  detachWeight: HTMLButtonElement;   // X — снять цилиндр с весов
  weightOnBalance: HTMLElement;      // <lab-metal-weight> overlay на платформе весов
  slotCylinder: HTMLElement;
  slotCylinderEmpty: HTMLElement;
  slotCylinderCaption: HTMLElement;
  stageCylinder: HTMLElement;        // <lab-graduated-cylinder> на сцене
  detachCylinder: HTMLButtonElement; // X — убрать мензурку
  detachSubmerged: HTMLButtonElement; // X — вынуть груз из мензурки
  weightInCylinder: HTMLElement;     // <lab-metal-weight> overlay в мензурке
  // Журнал
  measurementPanel: HTMLElement;
  measurementToggle: HTMLButtonElement;
  measurementBody: HTMLElement;
  measurementCount: HTMLElement;
  journalEmpty: HTMLElement;
  /**
   * §21: контейнер для shared `renderJournalTable` — заменяет старые
   * `journalTable` + `journalBody`. Внутри на каждый render заново
   * создаётся полная `<table.lab-journal-table>` с thead + tbody.
   */
  journalHost: HTMLElement;
  formulaDisplay: HTMLElement;
  resultPanel: HTMLElement;
  liveRegion: HTMLElement;
  /** §20.4 — слот для toggle «manual / auto» (инжектируется JS'ом). */
  recordModeSlot: HTMLElement;
  /** §20.4 — контейнер кнопки «Записать в журнал» (manual). */
  recordPendingSlot: HTMLElement;
  recordPendingBtn: HTMLButtonElement;
  recordPendingSummary: HTMLElement;
}

interface Measurement {
  readonly idx: number;
  readonly cylinderId: string;
  readonly cylinderLabel: string;
  readonly m_g: number;
  readonly V1_ml: number;
  readonly V2_ml: number;
  readonly density: DensityResult;
  /** §21: timestamp создания строки (handle для shared journal). */
  readonly timestamp?: number;
}

interface State {
  balanceOnStage: boolean;
  cylinderOnStage: boolean;
  selectedCylId: string | null;
  onBalanceId: string | null;
  inCylinderId: string | null;
  level_ml: number;
  submerged_ml: number;
  measurements: ReadonlyArray<Measurement>;
  panelExpanded: boolean;
  /**
   * §20.4 REFERENCE.md — «готовое к записи» измерение в manual-режиме.
   * Заполняется когда цилиндр положен в мензурку И масса уже измерена,
   * но строка в журнале ещё не создана. Нажатие кнопки «Записать в журнал»
   * (или auto-mode) — переводит в `measurements`. Если ученик откладывает
   * запись и убирает цилиндр / меняет уровень воды — pending обновляется.
   */
  pendingMeasurement: { cylId: string; V1_ml: number } | null;
}

const INITIAL_STATE: State = {
  balanceOnStage: false,
  cylinderOnStage: false,
  selectedCylId: null,
  onBalanceId: null,
  inCylinderId: null,
  level_ml: 0,
  submerged_ml: 0,
  measurements: [],
  panelExpanded: true,
  pendingMeasurement: null,
};

type StepIdx = 1 | 2 | 3 | 4 | 5;

function activeStep(state: State): StepIdx {
  // 1: Собрать установку — весы и мензурка должны быть на сцене
  if (!state.balanceOnStage || !state.cylinderOnStage) return 1;
  // 2: Налить воду — пока level_ml=0, шаг 2 «Налейте воду»
  if (state.level_ml === 0) return 2;
  // 3: Измерить массу — пока ничего не на весах
  if (!state.onBalanceId) return 3;
  // 4: Опустить в мензурку
  if (!state.inCylinderId) return 4;
  // 5: Запись готова
  return 5;
}

const HINTS: Record<StepIdx, string> = {
  1: 'Перетащите весы и мензурку с правой панели на стол.',
  2: 'Перетащите стакан с водой на мензурку — налейте воду (V₁).',
  3: 'Перетащите цилиндр на весы — измерьте массу m.',
  4: 'Перетащите цилиндр в мензурку — определите V₂ по подъёму уровня.',
  5: 'Запись добавлена в журнал. Возьмите другой цилиндр или сбросьте опыт.',
};

export class DensityExperiment {
  #refs: Refs;
  #store: Store<State>;
  #unsub: (() => void) | null = null;
  #dragDrop: DragDropController;

  constructor(refs: Refs) {
    this.#refs = refs;
    this.#store = new Store<State>({ ...INITIAL_STATE });

    for (const card of refs.equipmentCards) {
      card.addEventListener('click', this.#handleCardClick as EventListener);
    }
    refs.stageBalance.addEventListener('balance-tap', this.#handleBalanceTap);
    refs.stageCylinder.addEventListener('cylinder-tap', this.#handleCylinderTap);
    refs.resetBtn.addEventListener('click', this.#handleReset);
    refs.measurementToggle.addEventListener('click', this.#handleTogglePanel);
    refs.detachBalance.addEventListener('click', this.#handleDetachBalance);
    refs.detachCylinder.addEventListener('click', this.#handleDetachCylinder);
    refs.detachWeight.addEventListener('click', this.#handleDetachWeight);
    refs.detachSubmerged.addEventListener('click', this.#handleDetachSubmerged);

    // Drag & Drop controller — для перетаскивания приборов из правой панели на сцену
    this.#dragDrop = new DragDropController(refs.rootHost, this.#handleDrop);

    // §20.3, §20.4 REFERENCE.md — единый shared CSS для крестиков и toggle.
    injectDetachButtonStyles();
    injectRecordModeToggleStyles();
    this.#detachRecordModeToggle = renderRecordModeToggle(refs.recordModeSlot, {
      kitId: RECORD_MODE_KIT,
      onChange: (mode) => this.#handleRecordModeChange(mode),
    });
    refs.recordPendingBtn.addEventListener('click', this.#handleRecordPendingClick);

    this.#unsub = this.#store.subscribe((s) => this.#render(s));
    this.#render(this.#store.get());
  }

  /** Cleanup для toggle (см. constructor). */
  #detachRecordModeToggle: (() => void) | null = null;
  /**
   * §21: «черновик» введённых учеником derived-значений по rowIdx.
   * Хранит `Record<key, number>`. Сбрасывается при reset / detach mensurka.
   */
  #journalDrafts = new Map<number, Record<string, number>>();
  /** §21: verdicts по rowIdx после клика ✓. */
  #journalVerdicts = new Map<number, Record<string, import('@shared/lib/journal/types').JournalVerdict>>();

  /** §21 UX-v2: переключение режима обрабатывает накопленный pending. */
  #handleRecordModeChange = (mode: RecordMode): void => {
    const s = this.#store.get();
    if (mode === 'fully-auto' && s.pendingMeasurement) {
      // В fully-auto pending не имеет смысла — сразу полный commit.
      this.#commitPendingMeasurement();
    } else if (mode === 'fully-manual' && s.pendingMeasurement) {
      // В fully-manual pending не нужен; создаём пустую строку и сбрасываем pending.
      const cyl = CYLINDER_BY_ID.get(s.pendingMeasurement.cylId);
      if (cyl) this.#commitEmptyManualRow(cyl);
      this.#store.set({ pendingMeasurement: null });
    }
    // Re-render — кнопка/пустая строка появится/скроется.
    this.#render(this.#store.get());
  };

  /** Click по кнопке «Записать в журнал» (manual). */
  #handleRecordPendingClick = (): void => {
    this.#commitPendingMeasurement();
  };

  destroy(): void {
    this.#unsub?.();
    this.#unsub = null;
    this.#dragDrop.destroy();
    this.#detachRecordModeToggle?.();
    this.#detachRecordModeToggle = null;
    for (const card of this.#refs.equipmentCards) {
      card.removeEventListener('click', this.#handleCardClick as EventListener);
    }
    this.#refs.stageBalance.removeEventListener('balance-tap', this.#handleBalanceTap);
    this.#refs.stageCylinder.removeEventListener('cylinder-tap', this.#handleCylinderTap);
    this.#refs.resetBtn.removeEventListener('click', this.#handleReset);
    this.#refs.measurementToggle.removeEventListener('click', this.#handleTogglePanel);
    this.#refs.detachBalance.removeEventListener('click', this.#handleDetachBalance);
    this.#refs.detachCylinder.removeEventListener('click', this.#handleDetachCylinder);
    this.#refs.detachWeight.removeEventListener('click', this.#handleDetachWeight);
    this.#refs.detachSubmerged.removeEventListener('click', this.#handleDetachSubmerged);
    this.#refs.recordPendingBtn.removeEventListener('click', this.#handleRecordPendingClick);
  }

  // ─── Detach handlers ─────────────────────────────────────────

  #handleDetachBalance = (): void => {
    // Убираем весы со стола → автоматически снимаем груз (если был на них)
    this.#store.set({
      balanceOnStage: false,
      onBalanceId: null,
    });
    this.#announce('Весы убраны со стола.');
  };

  #handleDetachCylinder = (): void => {
    // Убираем мензурку → автоматически вода и погружённый груз тоже исчезают.
    // Pending тоже сбрасываем — без мензурки запись смысла не имеет.
    this.#store.set({
      cylinderOnStage: false,
      level_ml: 0,
      submerged_ml: 0,
      inCylinderId: null,
      pendingMeasurement: null,
    });
    this.#announce('Мензурка убрана со стола.');
  };

  #handleDetachWeight = (): void => {
    const s = this.#store.get();
    if (!s.onBalanceId) return;
    if (s.inCylinderId === s.onBalanceId) {
      this.#announce('Сначала выньте цилиндр из мензурки.');
      return;
    }
    this.#store.set({ onBalanceId: null });
    this.#announce('Цилиндр снят с весов.');
  };

  #handleDetachSubmerged = (): void => {
    const s = this.#store.get();
    if (!s.inCylinderId) return;
    // Если pending был для этого же цилиндра и записи в журнале ещё нет —
    // ученик «передумал»; pending сбрасываем (нечего записывать без
    // погружённого цилиндра).
    const cancelPending =
      s.pendingMeasurement && s.pendingMeasurement.cylId === s.inCylinderId;
    this.#store.set({
      inCylinderId: null,
      submerged_ml: 0,
      ...(cancelPending ? { pendingMeasurement: null } : {}),
    });
    this.#announce('Цилиндр вынут из мензурки.');
  };

  saveState(): unknown {
    const s = this.#store.get();
    // Не сохраняем "пустое" состояние — KitShell тогда удалит ключ из localStorage,
    // что чище для сценариев reset/первого захода.
    const isInitial =
      !s.balanceOnStage &&
      !s.cylinderOnStage &&
      !s.selectedCylId &&
      !s.onBalanceId &&
      !s.inCylinderId &&
      s.level_ml === 0 &&
      s.submerged_ml === 0 &&
      s.measurements.length === 0;
    if (isInitial) return null;
    return s;
  }

  loadState(snapshot: unknown): void {
    if (!snapshot || typeof snapshot !== 'object') return;
    const s = snapshot as Partial<State>;
    const pending =
      s.pendingMeasurement &&
      typeof s.pendingMeasurement === 'object' &&
      typeof (s.pendingMeasurement as { cylId?: unknown }).cylId === 'string' &&
      typeof (s.pendingMeasurement as { V1_ml?: unknown }).V1_ml === 'number'
        ? (s.pendingMeasurement as { cylId: string; V1_ml: number })
        : null;
    this.#store.set({
      balanceOnStage: typeof s.balanceOnStage === 'boolean' ? s.balanceOnStage : false,
      cylinderOnStage: typeof s.cylinderOnStage === 'boolean' ? s.cylinderOnStage : false,
      selectedCylId: typeof s.selectedCylId === 'string' ? s.selectedCylId : null,
      onBalanceId: typeof s.onBalanceId === 'string' ? s.onBalanceId : null,
      inCylinderId: typeof s.inCylinderId === 'string' ? s.inCylinderId : null,
      level_ml: typeof s.level_ml === 'number' ? s.level_ml : 0,
      submerged_ml: typeof s.submerged_ml === 'number' ? s.submerged_ml : 0,
      measurements: Array.isArray(s.measurements) ? (s.measurements as Measurement[]) : [],
      panelExpanded: typeof s.panelExpanded === 'boolean' ? s.panelExpanded : true,
      pendingMeasurement: pending,
    });
  }

  reset(): void {
    this.#store.set({ ...INITIAL_STATE });
    // §21: drafts/verdicts journal'а — сбрасываем вместе со state.
    this.#journalDrafts.clear();
    this.#journalVerdicts.clear();
    this.#announce('Опыт сброшен. Возьмите весы и мензурку.');
  }

  // ─── Handlers ────────────────────────────────────────────────

  /**
   * Обработчик клика по lab-equipment-card в правой панели.
   * Карточки определяются по data-eq:
   *   - "balance" → размещает весы на сцене
   *   - "cylinder" → размещает мензурку на сцене
   *   - "cyl-N" → выбирает цилиндр (обработка в #handleWeightTap, дубль)
   *   - "dyno-1|dyno-5|beaker|thread|salt" → информационный announce (для 1.1 не нужны)
   */
  #handleCardClick = (ev: Event): void => {
    const card = ev.currentTarget as HTMLElement;
    const eqId = card.getAttribute('data-eq') ?? '';
    const s = this.#store.get();

    if (eqId === 'balance') {
      if (!s.balanceOnStage) {
        this.#store.set({ balanceOnStage: true });
        this.#announce('Электронные весы поставлены на стол.');
      }
      return;
    }
    if (eqId === 'cylinder') {
      if (!s.cylinderOnStage) {
        this.#store.set({ cylinderOnStage: true });
        this.#announce('Мензурка поставлена на стол.');
      }
      return;
    }
    // Cyl-N — клик по самой карточке также выбирает цилиндр (не только клик по самому SVG-грузу).
    const cylMatch = /^cyl-(\d+)$/.exec(eqId);
    if (cylMatch) {
      const idNum = cylMatch[1]!;
      if (s.onBalanceId === idNum || s.inCylinderId === idNum) return;
      if (!s.balanceOnStage || !s.cylinderOnStage) {
        this.#announce('Сначала поставьте весы и мензурку.');
        return;
      }
      const newSelected = s.selectedCylId === idNum ? null : idNum;
      this.#store.set({ selectedCylId: newSelected });
      if (newSelected) {
        const cyl = CYLINDER_BY_ID.get(newSelected);
        this.#announce(`Выбран ${cyl?.label ?? `цилиндр № ${newSelected}`}.`);
      }
      return;
    }

    // Прочие приборы — для других опытов; не нужны для 1.1, но входят в комплект ФИПИ
    const messages: Record<string, string> = {
      'dyno-1': 'Динамометр 1 Н — для опыта 1.3 «Архимедова сила»: измерять вес тела в воздухе и в воде.',
      'dyno-5': 'Динамометр 5 Н — для опыта 1.3 «Архимедова сила» с тяжёлыми цилиндрами.',
      'beaker': 'Стакан с водой — перетащите на мензурку, чтобы налить ≈100 мл (V₁).',
      'thread': 'Нить (1 м) — пригодится в опыте 1.3 «Архимедова сила»: подвешивать цилиндр на крючок динамометра, опускать в воду.',
      'salt': 'Соль и палочка — для опыта 1.5 «Плавание тел в жидкостях разной плотности»: размешивать соль в воде, чтобы поменять плотность.',
    };
    const m = messages[eqId];
    if (m) this.#announce(m);
  };

  #handleBalanceTap = (): void => {
    const s = this.#store.get();
    if (s.onBalanceId) {
      if (s.inCylinderId !== s.onBalanceId) {
        this.#store.set({ onBalanceId: null });
        this.#announce('Цилиндр снят с весов.');
      }
      return;
    }
    if (!s.selectedCylId) {
      this.#announce('Сначала выберите цилиндр в правой панели.');
      return;
    }
    this.#store.set({ onBalanceId: s.selectedCylId, selectedCylId: null });
    const cyl = CYLINDER_BY_ID.get(s.selectedCylId);
    if (cyl) this.#announce(`${cyl.label} на весах. Масса ${cyl.mass_g} г.`);
  };

  #handleCylinderTap = (): void => {
    // Click по мензурке теперь не наливает воду (вода — только через стакан).
    // Кликом можно прочитать текущий уровень в aria-label / live-region.
    const s = this.#store.get();
    if (s.level_ml === 0) {
      this.#announce('Перетащите стакан с водой на мензурку, чтобы налить.');
      return;
    }
    const total = s.level_ml + s.submerged_ml;
    this.#announce(`Уровень в мензурке ${total.toFixed(0)} мл.`);
  };

  #handleReset = (): void => {
    this.reset();
  };

  #handleTogglePanel = (): void => {
    this.#store.set({ panelExpanded: !this.#store.get().panelExpanded });
  };

  /**
   * Drop-handler от DragDropController.
   * Карточка приземлилась в drop-zone — обрабатываем как соответствующее действие:
   *   - balance → balance slot: ставим весы на стол
   *   - cylinder → cylinder slot: ставим мензурку на стол
   *   - cyl-N → balance slot: цилиндр на весы (если на столе) → m
   *   - cyl-N → cylinder slot: цилиндр в мензурку (если есть V₁ + был на весах) → V₂ + журнал
   */
  #handleDrop = (detail: EquipmentDropDetail): void => {
    const { eqId, dropzoneId } = detail;
    const s = this.#store.get();

    if (eqId === 'balance' && dropzoneId === 'balance') {
      if (!s.balanceOnStage) {
        this.#store.set({ balanceOnStage: true });
        this.#announce('Весы поставлены на стол.');
      }
      return;
    }
    if (eqId === 'cylinder' && dropzoneId === 'cylinder') {
      if (!s.cylinderOnStage) {
        this.#store.set({ cylinderOnStage: true });
        this.#announce('Мензурка поставлена на стол.');
      }
      return;
    }

    // ─── Возврат прибора в комплект (drop на свою же карточку) ────────
    // Прибор взят со сцены и притащен в правую панель = убираем со сцены.
    // Полная имитация реального мира: ставим обратно в коробку.
    if (dropzoneId === 'card-balance' && eqId === 'balance') {
      if (s.balanceOnStage) {
        this.#store.set({ balanceOnStage: false, onBalanceId: null });
        this.#announce('Весы возвращены в комплект.');
      }
      return;
    }
    if (dropzoneId === 'card-cylinder' && eqId === 'cylinder') {
      if (s.cylinderOnStage) {
        this.#store.set({
          cylinderOnStage: false,
          inCylinderId: null,
          level_ml: 0,
          submerged_ml: 0,
        });
        this.#announce('Мензурка возвращена в комплект — вода вылита.');
      }
      return;
    }
    const cardCylMatch = /^card-cyl-(\d+)$/.exec(dropzoneId);
    if (cardCylMatch) {
      const cardId = cardCylMatch[1]!;
      const cylEqMatch = /^cyl-(\d+)$/.exec(eqId);
      if (!cylEqMatch || cylEqMatch[1] !== cardId) {
        // Чужая карточка — отвергаем (нельзя положить cyl-1 в ячейку cyl-2).
        this.#announce('Положи цилиндр в его собственную ячейку комплекта.');
        return;
      }
      // Возврат своего цилиндра: снимаем со сцены, очищаем relevant state.
      const updates: Partial<State> = {};
      if (s.onBalanceId === cardId) updates.onBalanceId = null;
      if (s.inCylinderId === cardId) {
        updates.inCylinderId = null;
        updates.submerged_ml = 0;
      }
      if (s.selectedCylId === cardId) updates.selectedCylId = null;
      if (Object.keys(updates).length > 0) {
        this.#store.set(updates);
        this.#announce(`Цилиндр № ${cardId} возвращён в комплект.`);
      }
      return;
    }

    // Стакан → мензурка: налить воду (100 мл за раз, не больше 250)
    if (eqId === 'beaker' && dropzoneId === 'cylinder') {
      if (!s.cylinderOnStage) {
        this.#announce('Сначала поставьте мензурку на стол.');
        return;
      }
      const POUR_AMOUNT = 100;
      const MAX_LEVEL = 250;
      const currentTotal = s.level_ml + s.submerged_ml;
      const free = MAX_LEVEL - currentTotal;
      if (free <= 0) {
        this.#announce('Мензурка заполнена — нельзя долить.');
        return;
      }
      const toPour = Math.min(POUR_AMOUNT, free);
      this.#store.set({ level_ml: s.level_ml + toPour });
      this.#announce(`В мензурку долито ${toPour} мл воды. V₁ = ${(s.level_ml + toPour).toFixed(0)} мл.`);
      return;
    }

    const cylMatch = /^cyl-(\d+)$/.exec(eqId);
    if (cylMatch) {
      const idNum = cylMatch[1]!;

      // Цилиндр на весы — работает И из карточки, И из overlay-мензурки.
      // Это полная имитация реального мира: ученик может в любой момент
      // вытащить цилиндр из воды и переложить на весы.
      if (dropzoneId === 'balance') {
        if (!s.balanceOnStage) {
          this.#announce('Сначала поставьте весы на стол.');
          return;
        }
        const cyl = CYLINDER_BY_ID.get(idNum);
        const cameFromCylinder = s.inCylinderId === idNum;
        // Цилиндр уже логически на весах:
        //   - если ещё и в мензурке — drag из мензурки на весы значит «вынуть»;
        //   - если только на весах — это no-op.
        if (s.onBalanceId === idNum) {
          if (cameFromCylinder) {
            this.#store.set({ inCylinderId: null, submerged_ml: 0 });
            if (cyl) this.#announce(`${cyl.label} вынут из мензурки. На весах.`);
          }
          return;
        }
        if (s.onBalanceId) {
          this.#announce('Снимите предыдущий цилиндр с весов.');
          return;
        }
        this.#store.set({
          onBalanceId: idNum,
          selectedCylId: null,
          ...(cameFromCylinder ? { inCylinderId: null, submerged_ml: 0 } : {}),
        });
        if (cyl) {
          this.#announce(
            cameFromCylinder
              ? `${cyl.label} вынут из мензурки и поставлен на весы. Масса ${cyl.mass_g} г.`
              : `${cyl.label} на весах. Масса ${cyl.mass_g} г.`,
          );
        }
        return;
      }
      // Drop тот же цилиндр обратно в мензурку, в которой он уже стоит — no-op.
      if (s.inCylinderId === idNum) return;
      // Цилиндр в мензурку: физически класть можно ВСЕГДА, если мензурка
      // на столе. Без воды цилиндр просто стоит на дне (V₁=0). Запись в
      // журнал делаем только когда масса уже измерена (был на весах);
      // иначе просто визуально кладём — пусть ученик идёт измерять.
      if (dropzoneId === 'cylinder') {
        if (!s.cylinderOnStage) {
          this.#announce('Сначала поставьте мензурку на стол.');
          return;
        }
        // Если мензурка уже занята другим цилиндром — не пускаем.
        if (s.inCylinderId && s.inCylinderId !== idNum) {
          this.#announce('Сначала выньте предыдущий цилиндр из мензурки.');
          return;
        }
        const cyl = CYLINDER_BY_ID.get(idNum);
        if (!cyl) return;
        if (s.onBalanceId === idNum) {
          // §21 REFERENCE.md (UX-v2) — режимы записи:
          //   - `semi-auto` (default): создаётся pending-плашка «Записать»;
          //     при click ученика → commit direct+meta. Derived ученик
          //     вводит inline в строке + ✓ проверка.
          //   - `fully-manual`: создаётся ПУСТАЯ строка журнала (только
          //     meta — №, цилиндр); ученик руками вводит ВСЁ (включая m,
          //     V₁, V₂). Без подсказок, без verdict-цветов.
          //   - `fully-auto`: программа сразу пишет ПОЛНУЮ строку
          //     (direct+meta+derived).
          const mode = this.#recordMode();
          if (mode === 'fully-manual') {
            // Пустая строка появляется сразу — без direct, ученик заполняет всё.
            this.#store.set({ inCylinderId: idNum, submerged_ml: cyl.volume_cm3 });
            this.#commitEmptyManualRow(cyl);
          } else if (mode === 'semi-auto') {
            // Pending-плашка появляется; commit отложен до click.
            this.#store.set({
              inCylinderId: idNum,
              submerged_ml: cyl.volume_cm3,
              pendingMeasurement: { cylId: cyl.id, V1_ml: s.level_ml },
            });
          } else {
            // fully-auto — пишем полную строку сразу.
            this.#store.set({ inCylinderId: idNum, submerged_ml: cyl.volume_cm3 });
            this.#commitMeasurement(cyl, s.level_ml);
          }
          if (s.level_ml === 0) {
            this.#announce(
              `Цилиндр на дне сухой мензурки. V₁ = 0, V₂ = ${cyl.volume_cm3} мл. ` +
              this.#recordHintForMode(),
            );
          } else {
            this.#announce(
              `Цилиндр погружён. V₂ = ${(s.level_ml + cyl.volume_cm3).toFixed(0)} мл. ` +
              this.#recordHintForMode(),
            );
          }
          return;
        }
        // Масса ещё не измерена — кладём в мензурку «вхолостую», без записи.
        // Цилиндр стоит на дне; если есть вода, она поднимется.
        this.#store.set({ inCylinderId: idNum, submerged_ml: cyl.volume_cm3 });
        this.#announce(
          'Цилиндр в мензурке. Чтобы получить запись в журнал, ' +
          'сначала измерь массу на весах: вынь и поставь на весы.',
        );
        return;
      }
    }
  };

  // ─── Запись в журнал ─────────────────────────────────────────

  #commitMeasurement(cyl: CylinderSpec, V1_ml: number): void {
    const s = this.#store.get();
    const V2_ml = V1_ml + cyl.volume_cm3;
    const result = calculateDensity(cyl.mass_g, V1_ml, V2_ml);
    const m: Measurement = {
      idx: s.measurements.length + 1,
      cylinderId: cyl.id,
      cylinderLabel: cyl.label,
      m_g: cyl.mass_g,
      V1_ml,
      V2_ml,
      density: result,
      timestamp: Date.now(),
    };
    this.#store.set({
      measurements: [...s.measurements, m],
      pendingMeasurement: null,
    });
  }

  /**
   * §21 UX-v2: пустая строка журнала для fully-manual режима.
   * Содержит только meta (idx + cylinderLabel); все direct/derived = null.
   * Ученик заполняет m, V₁, V₂, V, ρ руками без подсказок.
   *
   * Дедупликация: если уже есть пустая или заполненная строка для этого
   * цилиндра — пропускаем (повторный drop того же цилиндра).
   */
  #commitEmptyManualRow(cyl: CylinderSpec): void {
    const s = this.#store.get();
    const dup = s.measurements.some(
      (m) => m.cylinderId === cyl.id && m.m_g === 0,
    );
    if (dup) return;
    const m: Measurement = {
      idx: s.measurements.length + 1,
      cylinderId: cyl.id,
      cylinderLabel: cyl.label,
      m_g: 0,
      V1_ml: 0,
      V2_ml: 0,
      density: { V_cm3: 0, rho_g_cm3: 0, rho_kg_m3: 0, identified: null },
      timestamp: Date.now(),
    };
    this.#store.set({
      measurements: [...s.measurements, m],
      pendingMeasurement: null,
    });
  }

  /**
   * §20.4 REFERENCE.md — записать «pending»-измерение в журнал.
   * Используется кнопкой «Записать в журнал» (manual) и при включении
   * auto-toggle если pending уже накоплен.
   */
  #commitPendingMeasurement(): void {
    const s = this.#store.get();
    if (!s.pendingMeasurement) return;
    const cyl = CYLINDER_BY_ID.get(s.pendingMeasurement.cylId);
    if (!cyl) {
      this.#store.set({ pendingMeasurement: null });
      return;
    }
    this.#commitMeasurement(cyl, s.pendingMeasurement.V1_ml);
    this.#announce(
      `Запись добавлена в журнал. Заполни V и ρ в строке и нажми ✓ ` +
      `чтобы проверить сам.`,
    );
  }

  /** Текущий режим записи (manual/auto). Читается из localStorage. */
  #recordMode(): RecordMode {
    return getRecordMode(RECORD_MODE_KIT);
  }

  /** Подсказка ученику в зависимости от режима §21. */
  #recordHintForMode(): string {
    const mode = this.#recordMode();
    if (mode === 'fully-manual') {
      return 'Нажми «Записать в журнал» и заполни все поля сам.';
    }
    if (mode === 'fully-auto') {
      return 'Запись в журнале — V и ρ посчитаны автоматически.';
    }
    // semi-auto: показания записаны, ученик считает V и ρ.
    return 'Запись в журнале — заполни V и ρ и нажми ✓.';
  }

  // ─── Render ──────────────────────────────────────────────────

  #render(state: State): void {
    this.#renderSlots(state);
    this.#renderEquipmentCards(state);
    this.#renderInstruments(state);
    this.#renderSteps(state);
    this.#renderHint(state);
    this.#renderPanel(state);
    this.#renderRecordPending(state);
    this.#renderJournal(state);
    this.#renderResult(state);
  }

  /**
   * §21 UX-v2 — кнопка «Записать в журнал» (semi-auto mode).
   * Показывается только когда:
   *   - режим = semi-auto И
   *   - pendingMeasurement не null (цилиндр в мензурке + масса измерена) И
   *   - в журнале ещё нет записи для этого цилиндра+V₁ (защита от дублей).
   *
   * В fully-manual пустая строка создаётся автоматически при drop'е
   * (см. #commitEmptyManualRow); в fully-auto — полная строка.
   */
  #renderRecordPending(state: State): void {
    const { recordPendingSlot, recordPendingBtn, recordPendingSummary } = this.#refs;
    const mode = this.#recordMode();
    const pending = state.pendingMeasurement;
    // §21 UX-v2: pending-кнопка ТОЛЬКО в semi-auto.
    if (mode !== 'semi-auto' || !pending) {
      recordPendingSlot.hidden = true;
      return;
    }
    const cyl = CYLINDER_BY_ID.get(pending.cylId);
    if (!cyl) {
      recordPendingSlot.hidden = true;
      return;
    }
    // Защита от дублирования: если для этого cylId+V1 уже есть запись —
    // не предлагаем повторно.
    const dup = state.measurements.some(
      (m) => m.cylinderId === cyl.id && Math.abs(m.V1_ml - pending.V1_ml) < 0.001,
    );
    if (dup) {
      recordPendingSlot.hidden = true;
      return;
    }
    recordPendingSlot.hidden = false;
    const V2 = pending.V1_ml + cyl.volume_cm3;
    recordPendingSummary.textContent =
      `${cyl.label}: m = ${cyl.mass_g.toFixed(0)} г, ` +
      `V₁ = ${pending.V1_ml.toFixed(0)} мл, V₂ = ${V2.toFixed(0)} мл`;
    recordPendingBtn.setAttribute(
      'aria-label',
      `Записать в журнал: ${recordPendingSummary.textContent}`,
    );
  }

  #renderSlots(state: State): void {
    // Balance slot. Один X показываем за раз:
    //   - если на весах груз → золотой (снять груз)
    //   - иначе → красный (убрать весы со стола)
    if (state.balanceOnStage) {
      this.#refs.slotBalance.dataset['filled'] = 'true';
      this.#refs.slotBalance.dataset['active'] = 'false';
      this.#refs.slotBalanceEmpty.hidden = true;
      this.#refs.stageBalance.hidden = false;
      this.#refs.slotBalanceCaption.hidden = false;
      // Цилиндр визуально на весах, только если он не в мензурке.
      const hasWeight = !!state.onBalanceId && !state.inCylinderId;
      this.#refs.detachBalance.hidden = hasWeight;       // красный X прячется когда груз
      this.#refs.detachWeight.hidden = !hasWeight;        // золотой X виден когда груз
      this.#refs.weightOnBalance.hidden = !hasWeight;
      if (hasWeight) {
        const cyl = CYLINDER_BY_ID.get(state.onBalanceId!);
        if (cyl) {
          this.#refs.weightOnBalance.setAttribute('material', cyl.material);
          this.#refs.weightOnBalance.setAttribute('id-num', cyl.id);
          // Делаем overlay draggable: можно взять груз с весов и перетащить
          // в мензурку напрямую, не возвращаясь к карточке.
          this.#refs.weightOnBalance.setAttribute('data-draggable', `cyl-${cyl.id}`);
        }
      } else {
        this.#refs.weightOnBalance.removeAttribute('data-draggable');
      }
    } else {
      delete this.#refs.slotBalance.dataset['filled'];
      this.#refs.slotBalance.dataset['active'] = 'true';
      this.#refs.slotBalanceEmpty.hidden = false;
      this.#refs.stageBalance.hidden = true;
      this.#refs.slotBalanceCaption.hidden = true;
      this.#refs.detachBalance.hidden = true;
      this.#refs.detachWeight.hidden = true;
      this.#refs.weightOnBalance.hidden = true;
    }
    // Cylinder slot — аналогично
    if (state.cylinderOnStage) {
      this.#refs.slotCylinder.dataset['filled'] = 'true';
      this.#refs.slotCylinder.dataset['active'] = 'false';
      this.#refs.slotCylinderEmpty.hidden = true;
      this.#refs.stageCylinder.hidden = false;
      this.#refs.slotCylinderCaption.hidden = false;
      const hasSubmerged = !!state.inCylinderId;
      this.#refs.detachCylinder.hidden = hasSubmerged;
      this.#refs.detachSubmerged.hidden = !hasSubmerged;
      this.#refs.weightInCylinder.hidden = !hasSubmerged;
      if (hasSubmerged) {
        const cyl = CYLINDER_BY_ID.get(state.inCylinderId!);
        if (cyl) {
          this.#refs.weightInCylinder.setAttribute('material', cyl.material);
          this.#refs.weightInCylinder.setAttribute('id-num', cyl.id);
          // Полная имитация реального мира: цилиндр в мензурке тоже можно
          // взять и переложить — на весы или обратно (drop в свой же слот).
          this.#refs.weightInCylinder.setAttribute('data-draggable', `cyl-${cyl.id}`);
        }
      } else {
        this.#refs.weightInCylinder.removeAttribute('data-draggable');
      }
    } else {
      delete this.#refs.slotCylinder.dataset['filled'];
      this.#refs.slotCylinder.dataset['active'] = state.balanceOnStage ? 'true' : 'false';
      this.#refs.slotCylinderEmpty.hidden = false;
      this.#refs.stageCylinder.hidden = true;
      this.#refs.slotCylinderCaption.hidden = true;
      this.#refs.detachCylinder.hidden = true;
      this.#refs.detachSubmerged.hidden = true;
      this.#refs.weightInCylinder.hidden = true;
    }
  }

  #renderEquipmentCards(state: State): void {
    // Карточка может быть И источником drag (когда прибор в комплекте),
    // И drop-зоной для возврата (когда прибор на сцене). Чтобы pointerdown
    // на placed-карточку не запускал drag «новых» весов, на placed
    // снимаем data-draggable; на available — восстанавливаем.
    const setPlaced = (card: HTMLElement, placed: boolean): void => {
      card.setAttribute('status', placed ? 'placed' : 'available');
      const eqId = card.getAttribute('data-eq') ?? '';
      if (placed) {
        card.removeAttribute('data-draggable');
      } else {
        card.setAttribute('data-draggable', eqId);
      }
    };

    for (const card of this.#refs.equipmentCards) {
      const eqId = card.getAttribute('data-eq') ?? '';
      // Карточки приборов на сцене показываются как «placed» (пустое окошко)
      if (eqId === 'balance') {
        setPlaced(card, state.balanceOnStage);
        continue;
      }
      if (eqId === 'cylinder') {
        setPlaced(card, state.cylinderOnStage);
        continue;
      }
      const cylMatch = /^cyl-(\d+)$/.exec(eqId);
      if (cylMatch) {
        const idNum = cylMatch[1]!;
        const isAttached = state.onBalanceId === idNum || state.inCylinderId === idNum;
        const isSelected = state.selectedCylId === idNum;
        setPlaced(card, isAttached);
        card.toggleAttribute('selected', isSelected);
        continue;
      }
      // Прочие — всегда available для 1.1
      card.setAttribute('status', 'available');
    }
    for (const w of this.#refs.weightsInCards) {
      const id = w.getAttribute('id-num') ?? '';
      w.toggleAttribute('selected', state.selectedCylId === id);
      w.toggleAttribute('attached', state.onBalanceId === id || state.inCylinderId === id);
    }
  }

  #renderInstruments(state: State): void {
    // Если цилиндр уже в мензурке — он физически НЕ на весах. LCD должен
    // показывать 0 (хотя в state.onBalanceId он остался для consistency
    // commitMeasurement). Так пользователь чётко видит, что груз в воде.
    const massVisible = state.onBalanceId && !state.inCylinderId;
    if (massVisible) {
      const cyl = CYLINDER_BY_ID.get(state.onBalanceId!);
      this.#refs.stageBalance.setAttribute('mass-g', cyl ? String(cyl.mass_g) : '0');
    } else {
      this.#refs.stageBalance.setAttribute('mass-g', '0');
    }
    this.#refs.stageBalance.toggleAttribute(
      'active',
      state.balanceOnStage && !!state.selectedCylId && !state.onBalanceId,
    );
    this.#refs.stageCylinder.setAttribute('level', String(state.level_ml));
    this.#refs.stageCylinder.setAttribute('submerged', String(state.submerged_ml));
    const cylActionable =
      state.cylinderOnStage &&
      ((state.level_ml === 0 && !state.onBalanceId) ||
        (!!state.onBalanceId && state.level_ml > 0 && !state.inCylinderId));
    this.#refs.stageCylinder.toggleAttribute('active', cylActionable);
  }

  #renderSteps(state: State): void {
    const cur = activeStep(state);
    const lis = this.#refs.steps.querySelectorAll<HTMLElement>('.step');
    lis.forEach((li) => {
      const n = parseInt(li.dataset['step'] ?? '0', 10);
      if (n < cur) li.dataset['state'] = 'done';
      else if (n === cur) li.dataset['state'] = 'active';
      else delete li.dataset['state'];
    });
  }

  #renderHint(state: State): void {
    this.#refs.hintBar.textContent = HINTS[activeStep(state)];
  }

  #renderPanel(state: State): void {
    const panel = this.#refs.measurementPanel;
    const expanded = state.panelExpanded;
    panel.setAttribute('aria-collapsed', expanded ? 'false' : 'true');
    this.#refs.measurementToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    this.#refs.measurementBody.hidden = !expanded;
    if (state.measurements.length > 0) {
      panel.dataset['state'] = 'has-data';
      this.#refs.measurementCount.textContent = String(state.measurements.length);
      this.#refs.measurementCount.hidden = false;
    } else {
      panel.dataset['state'] = 'empty';
      this.#refs.measurementCount.hidden = true;
    }
  }

  /**
   * §21 — рендер журнала через shared `renderJournalTable`.
   * Учительская логика проверки V/ρ — теперь внутри shared `verifyRow`.
   *
   * Шаблон: журнал-host ВСЕГДА содержит `<table><tbody.lab-journal-body>`
   * (даже пустой) — это контракт для тестов и acceptance-инвариантов §21.
   * `journalEmpty` (placeholder) — отдельный элемент, скрывается при наличии
   * хоть одной строки.
   */
  #renderJournal(state: State): void {
    const { journalEmpty, journalHost, formulaDisplay } = this.#refs;
    const rows = this.#measurementsToRows(state.measurements);
    const mode = this.#recordMode();
    // §21 UX-v2: в fully-manual журнал должен быть РАСКРЫТ с пустой строкой
    // как только ученик начал собирать установку (хоть что-то на сцене),
    // чтобы он понимал «здесь я буду писать руками». Используем sentinel
    // ts=-1 для UI-only empty row.
    // Density не имеет beakerOnStage в state — beaker (мензурка) живёт в level_ml/cylinderOnStage.
    const setupStarted =
      state.balanceOnStage || state.cylinderOnStage || state.level_ml > 0;
    const showEmptyManual = mode === 'fully-manual' && rows.length === 0 && setupStarted;
    if (showEmptyManual) {
      const draft = this.#journalDrafts.get(-1) ?? {};
      rows.push({
        idx: 1,
        timestamp: -1,
        values: {
          idx: 1,
          cylinder: (draft['cylinder'] as string | undefined) ?? '',
          m_g: draft.m_g ?? null,
          V1_ml: draft.V1_ml ?? null,
          V2_ml: draft.V2_ml ?? null,
          V_cm3: draft.V_cm3 ?? null,
          rho_kg_m3: draft.rho_kg_m3 ?? null,
        },
        verdicts: {},
      });
    }
    const empty = rows.length === 0;
    journalEmpty.hidden = !empty;
    journalHost.hidden = empty;
    formulaDisplay.hidden = empty;
    // Всегда рендерим (даже пустую) таблицу — для стабильности селекторов.
    renderJournalTable(journalHost, DENSITY_SPEC, rows, {
      mode,
      onCellInput: (rowIdx, key, value) => this.#handleJournalCellInput(rowIdx, key, value),
      onVerify: (rowIdx) => this.#handleJournalVerify(rowIdx),
    });
  }

  /**
   * Превращает state.measurements (внутреннее представление) в JournalRow[]
   * для shared-рендерера. Сохраняет введённые учеником V/ρ из uncommitted
   * draft (чтобы re-render не стирал input).
   */
  #measurementsToRows(measurements: ReadonlyArray<Measurement>): JournalRow[] {
    return measurements.map((m) => {
      const draft = this.#journalDrafts.get(m.idx) ?? {};
      return {
        idx: m.idx,
        timestamp: m.timestamp ?? m.idx,
        values: {
          idx: m.idx,
          cylinder: m.cylinderLabel,
          m_g: m.m_g,
          V1_ml: m.V1_ml,
          V2_ml: m.V2_ml,
          // В fully-auto программа сама вычисляет V и ρ → подставляем эталон.
          // В semi-auto / fully-manual — берём из draft (что ввёл ученик).
          V_cm3: this.#recordMode() === 'fully-auto'
            ? m.V2_ml - m.V1_ml
            : (draft.V_cm3 ?? null),
          rho_kg_m3: this.#recordMode() === 'fully-auto'
            ? m.density.rho_kg_m3
            : (draft.rho_kg_m3 ?? null),
        },
        verdicts: this.#journalVerdicts.get(m.idx) ?? {},
      };
    });
  }

  /** Запись input'а ученика → draft (verifyRow посчитает при ✓). */
  #handleJournalCellInput(rowIdx: number, key: string, value: number | null): void {
    // §21 UX-v2: если в state.measurements нет measurement с этим idx —
    // это empty manual sentinel row, draft хранится под ключом -1.
    const measurements = this.#store.get().measurements;
    const hasMeasurement = measurements.some((m) => m.idx === rowIdx);
    const draftKey = hasMeasurement ? rowIdx : -1;
    const draft = this.#journalDrafts.get(draftKey) ?? {};
    if (value === null) delete draft[key];
    else draft[key] = value;
    this.#journalDrafts.set(draftKey, draft);
    // verdict сбрасываем — ученик правит, цвет должен исчезнуть.
    const verdicts = this.#journalVerdicts.get(draftKey);
    if (verdicts && key in verdicts) {
      const next = { ...verdicts };
      delete next[key];
      this.#journalVerdicts.set(draftKey, next);
      // Re-render не нужен — input сам показывает текущий ввод; verdict
      // обновится после следующего ✓ или после изменения других ячеек.
    }
  }

  /** Клик по ✓ — проверяем все derived в строке и применяем verdicts. */
  #handleJournalVerify(rowIdx: number): void {
    const m = this.#store.get().measurements.find((x) => x.idx === rowIdx);
    if (!m) return;
    const draft = { ...(this.#journalDrafts.get(rowIdx) ?? {}) };
    // §21: читаем актуальные values из input'ов в DOM. Это покрывает случай,
    // когда tests/programmatic clients устанавливают `input.value` без
    // диспатча `input` event, и draft не обновлён через `onCellInput`.
    const tr = this.#refs.journalHost.querySelector<HTMLTableRowElement>(
      `tr[data-row-idx="${rowIdx}"]`,
    );
    if (tr) {
      const inputs = tr.querySelectorAll<HTMLInputElement>('input[data-key]');
      inputs.forEach((input) => {
        const key = input.dataset['key'];
        if (!key) return;
        const parsed = parseRu(input.value);
        if (parsed !== null) draft[key] = parsed;
      });
    }
    this.#journalDrafts.set(rowIdx, draft);
    const tempRow: JournalRow = {
      idx: m.idx,
      timestamp: m.timestamp ?? m.idx,
      values: {
        m_g: m.m_g,
        V1_ml: m.V1_ml,
        V2_ml: m.V2_ml,
        V_cm3: draft.V_cm3 ?? null,
        rho_kg_m3: draft.rho_kg_m3 ?? null,
      },
    };
    const verdicts = verifyRow(DENSITY_SPEC.columns, tempRow);
    this.#journalVerdicts.set(rowIdx, verdicts);
    // §21: обновляем classes inplace без full re-render — иначе старая
    // ссылка `tr` в тестах указывает на детач'нутый элемент. Inplace-update
    // также сохраняет ввод ученика без потери позиции каретки.
    if (tr) {
      for (const [key, verdict] of Object.entries(verdicts)) {
        const td = tr.querySelector<HTMLTableCellElement>(
          `td[data-key="${key}"]`,
        );
        if (!td) continue;
        td.classList.remove(
          'j-verdict',
          'j-verdict--ok',
          'j-verdict--close',
          'j-verdict--wrong',
          'j-verdict--empty',
        );
        td.dataset['verdict'] = verdict;
        if (verdict !== 'empty') {
          td.classList.add('j-verdict', `j-verdict--${verdict}`);
        }
        const input = td.querySelector<HTMLInputElement>('input[data-key]');
        if (input) input.dataset['verdict'] = verdict;
      }
    }
    const aggregate = rowVerdictAggregate(verdicts);
    if (aggregate === 'ok') {
      this.#refs.resultPanel.dataset['hint'] = 'ok';
      this.#refs.resultPanel.querySelector<HTMLElement>('.density-result-hint')?.remove();
      this.#announce(`${m.cylinderLabel}: V и ρ верны.`);
    } else if (aggregate === 'empty') {
      this.#announce('Заполни V и ρ перед проверкой.');
    } else {
      const wrongKeys = Object.entries(verdicts)
        .filter(([, v]) => v === 'wrong' || v === 'close')
        .map(([k]) => (k === 'V_cm3' ? 'V' : 'ρ'));
      const what = wrongKeys.join(' и ') || 'V и ρ';
      this.#refs.resultPanel.dataset['hint'] = 'wrong';
      const oldHint = this.#refs.resultPanel.querySelector<HTMLElement>('.density-result-hint');
      oldHint?.remove();
      const hint = document.createElement('div');
      hint.className = 'density-result-hint density-result-hint--wrong';
      hint.innerHTML =
        `Перепроверь <strong>${what}</strong>. Подсказка: ` +
        `<em>V</em> = <em>V</em><sub>2</sub> − <em>V</em><sub>1</sub>; ` +
        `<em>ρ</em> = <em>m</em>/<em>V</em>; ` +
        `<em>ρ</em> в кг/м³ = (<em>ρ</em> в г/см³)·1000.`;
      this.#refs.resultPanel.appendChild(hint);
    }
    // §21: re-render не делаем — verdict-classes уже применены inplace выше.
  }

  #renderResult(state: State): void {
    const { resultPanel } = this.#refs;
    if (state.measurements.length === 0) {
      resultPanel.hidden = true;
      resultPanel.replaceChildren();
      return;
    }
    // Никаких авто-выводов о материале и автоподстановки V/ρ — ученик
    // считает сам, проверяет кнопкой «Проверить» и сравнивает с табличными
    // плотностями (бумажный справочник в задании ОГЭ).
    resultPanel.hidden = false;
    resultPanel.innerHTML = `
      <div class="density-result-conclusion">
        Запиши в журнал собственные значения <em>V</em> = <em>V</em><sub>2</sub> − <em>V</em><sub>1</sub>
        и <em>ρ</em> = <em>m</em>/<em>V</em>.
        Затем сравни <em>ρ</em> со справочником плотностей и сделай вывод о материале цилиндра.
        Кнопка <span class="accent">«Проверить»</span> подскажет, верно ли посчитано.
      </div>
    `;
  }

  #announce(msg: string): void {
    if (this.#refs.liveRegion) this.#refs.liveRegion.textContent = msg;
  }
}
