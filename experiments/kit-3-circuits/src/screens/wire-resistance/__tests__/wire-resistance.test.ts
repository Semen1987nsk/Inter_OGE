/**
 * wire-resistance.test.ts — state-machine тест экрана «Сопротивление проводника»
 * опыты 3.5/3.6/3.7.
 *
 * Тестирует WireResistanceExperiment через публичный программный API:
 *   placeInSlot, setKeyClosed, setVoltage, setActiveTask, recordMeasurement
 * НЕ эмулирует pointer-events — для них selfcheck-3-5-3-7.mjs (Playwright).
 *
 * Паттерн: happy-dom + customElements (зеркало measurements.test.ts).
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) пп.5/6/7; КОДИФ §1.29.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Регистрируем все custom elements
import '../../../ui/components/lab-power-source';
import '../../../ui/components/lab-voltmeter';
import '../../../ui/components/lab-ammeter';
import '../../../ui/components/lab-wire-resistor';
import '../../../ui/components/lab-key';
import '../../../ui/components/lab-circuit-board';
import '../../../ui/components/lab-equipment-card';

import { WireResistanceExperiment, type ExperimentRefs, type EquipmentId } from '../WireResistanceExperiment';
import { WireResistanceScreen } from '../WireResistanceScreen';
import { wireResistance, RESISTIVITY } from '../../../physics/circuit/CircuitModel';

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function buildRefs(host: HTMLElement): ExperimentRefs {
  host.innerHTML = `
    <div id="stage">
      <lab-circuit-board id="circuit-board"></lab-circuit-board>
      <div id="key-control" hidden>
        <button id="key-btn" aria-pressed="false">
          <span id="key-btn-label">Замкнуть ключ</span>
        </button>
      </div>
      <aside id="measurement-panel" data-state="empty">
        <header class="measurement-panel-header">
          <button id="measurement-toggle" aria-expanded="true" aria-controls="measurement-body">
            <span class="measurement-title">Журнал</span>
            <span id="measurement-count" hidden>0</span>
          </button>
          <div id="record-mode-slot"></div>
        </header>
        <div id="measurement-body">
          <div id="voltage-control" hidden>
            <input id="voltage-input" type="range" min="1.0" max="6.0" step="0.5" value="4.5"/>
            <span id="voltage-readout">4,5 В</span>
          </div>
          <div id="journal-empty">Соберите цепь.</div>
          <div id="formula-display" hidden></div>
          <div id="journal-host" hidden></div>
          <div id="record-pending-slot" hidden>
            <button id="record-pending-btn">
              <span id="record-pending-summary"></span>
            </button>
          </div>
          <div id="result-panel" hidden></div>
        </div>
      </aside>
      <div id="drag-overlay"></div>
    </div>
    <div id="hint-bar"></div>
    <div id="live-region" role="status" aria-live="polite"></div>
    <button id="reset-btn"></button>
    <ol id="steps">
      <li class="step" data-task="A-length" data-state="active" tabindex="0" role="button" aria-current="true">
        <span class="step-num">A</span>
        <span class="step-label">Длина</span>
      </li>
      <li class="step" data-task="B-section" tabindex="0" role="button" aria-current="false">
        <span class="step-num">B</span>
        <span class="step-label">Сечение</span>
      </li>
      <li class="step" data-task="C-rho" tabindex="0" role="button" aria-current="false">
        <span class="step-num">C</span>
        <span class="step-label">Материал</span>
      </li>
    </ol>
    <!-- Equipment cards: источник + приборы -->
    <lab-equipment-card data-eq="power-source" data-draggable="power-source" data-dropzone="power-source" data-dropzone-id="card-power-source" status="available">
      <lab-power-source voltage="4.5"></lab-power-source>
    </lab-equipment-card>
    <lab-equipment-card data-eq="voltmeter" data-draggable="voltmeter" data-dropzone="voltmeter" data-dropzone-id="card-voltmeter" status="available">
      <lab-voltmeter range="6" value="0"></lab-voltmeter>
    </lab-equipment-card>
    <lab-equipment-card data-eq="ammeter" data-draggable="ammeter" data-dropzone="ammeter" data-dropzone-id="card-ammeter" status="available">
      <lab-ammeter range="3" value="0"></lab-ammeter>
    </lab-equipment-card>
    <lab-equipment-card data-eq="key" data-draggable="key" data-dropzone="key" data-dropzone-id="card-key" status="available">
      <lab-key></lab-key>
    </lab-equipment-card>
    <!-- Задача A: нихром l=0.5/1.0/2.0 м, S=0.25 мм² -->
    <lab-equipment-card data-eq="wire-len-05" data-task-group="A-length" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-wire-len-05" status="available">
      <lab-wire-resistor material="нихром" length="0.5" area="0.25"></lab-wire-resistor>
    </lab-equipment-card>
    <lab-equipment-card data-eq="wire-len-10" data-task-group="A-length" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-wire-len-10" status="available">
      <lab-wire-resistor material="нихром" length="1.0" area="0.25"></lab-wire-resistor>
    </lab-equipment-card>
    <lab-equipment-card data-eq="wire-len-20" data-task-group="A-length" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-wire-len-20" status="available">
      <lab-wire-resistor material="нихром" length="2.0" area="0.25"></lab-wire-resistor>
    </lab-equipment-card>
    <!-- Задача B: нихром l=2.0 м, S=0.25/0.5/1.0 мм² -->
    <lab-equipment-card data-eq="wire-sec-025" data-task-group="B-section" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-wire-sec-025" status="available">
      <lab-wire-resistor material="нихром" length="2.0" area="0.25"></lab-wire-resistor>
    </lab-equipment-card>
    <lab-equipment-card data-eq="wire-sec-05" data-task-group="B-section" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-wire-sec-05" status="available">
      <lab-wire-resistor material="нихром" length="2.0" area="0.5"></lab-wire-resistor>
    </lab-equipment-card>
    <lab-equipment-card data-eq="wire-sec-10" data-task-group="B-section" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-wire-sec-10" status="available">
      <lab-wire-resistor material="нихром" length="2.0" area="1.0"></lab-wire-resistor>
    </lab-equipment-card>
    <!-- Задача C: нихром/константан/никелин l=2.0 м, S=0.25 мм² -->
    <lab-equipment-card data-eq="wire-mat-ni" data-task-group="C-rho" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-wire-mat-ni" status="available">
      <lab-wire-resistor material="нихром" length="2.0" area="0.25"></lab-wire-resistor>
    </lab-equipment-card>
    <lab-equipment-card data-eq="wire-mat-ko" data-task-group="C-rho" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-wire-mat-ko" status="available">
      <lab-wire-resistor material="константан" length="2.0" area="0.25"></lab-wire-resistor>
    </lab-equipment-card>
    <lab-equipment-card data-eq="wire-mat-nk" data-task-group="C-rho" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-wire-mat-nk" status="available">
      <lab-wire-resistor material="никелин" length="2.0" area="0.25"></lab-wire-resistor>
    </lab-equipment-card>
  `;

  const board = host.querySelector<HTMLElement>('#circuit-board')! as HTMLElement & {
    getSlotRect(id: string): DOMRect;
    setCurrentAnimating(on: boolean): void;
  };

  return {
    stage: host.querySelector<HTMLElement>('#stage')!,
    circuitBoard: board,
    dragOverlay: host.querySelector<HTMLElement>('#drag-overlay')!,
    hintBar: host.querySelector<HTMLElement>('#hint-bar')!,
    liveRegion: host.querySelector<HTMLElement>('#live-region')!,
    resetBtn: host.querySelector('#reset-btn') as HTMLButtonElement,
    keyControl: host.querySelector<HTMLElement>('#key-control')!,
    keyBtn: host.querySelector('#key-btn') as HTMLButtonElement,
    keyBtnLabel: host.querySelector<HTMLElement>('#key-btn-label')!,
    voltageControl: host.querySelector<HTMLElement>('#voltage-control')!,
    voltageInput: host.querySelector('#voltage-input') as HTMLInputElement,
    voltageReadout: host.querySelector<HTMLElement>('#voltage-readout')!,
    journalEmpty: host.querySelector<HTMLElement>('#journal-empty')!,
    formulaDisplay: host.querySelector<HTMLElement>('#formula-display')!,
    measurementPanel: host.querySelector<HTMLElement>('#measurement-panel')!,
    measurementToggle: host.querySelector('#measurement-toggle') as HTMLButtonElement,
    measurementCount: host.querySelector<HTMLElement>('#measurement-count')!,
    steps: host.querySelector<HTMLElement>('#steps')!,
    resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
    cards: host.querySelectorAll('lab-equipment-card'),
    recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
    journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
    recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
    recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
    recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
    formulaExpr: host.querySelector<HTMLElement>('#formula-expr') ?? undefined,
    formulaUnits: host.querySelector<HTMLElement>('#formula-units') ?? undefined,
  };
}

// ─── Тесты ───────────────────────────────────────────────────────────────────

describe('WireResistanceExperiment — state machine', () => {
  let host: HTMLElement;
  let experiment: WireResistanceExperiment;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const refs = buildRefs(host);
    experiment = new WireResistanceExperiment(refs);
  });

  afterEach(() => {
    experiment.destroy();
    host.remove();
    globalThis.gc?.();
  });

  // ─── Журнал v2 слоты присутствуют ─────────────────────────────────────────

  it('template содержит #journal-host', () => {
    expect(host.querySelector('#journal-host')).not.toBeNull();
  });

  it('template содержит #record-mode-slot', () => {
    expect(host.querySelector('#record-mode-slot')).not.toBeNull();
  });

  it('template содержит #live-region с aria-live', () => {
    const lr = host.querySelector('#live-region');
    expect(lr).not.toBeNull();
    expect(lr?.getAttribute('aria-live')).toBe('polite');
  });

  it('template содержит #record-pending-btn', () => {
    expect(host.querySelector('#record-pending-btn')).not.toBeNull();
  });

  // ─── Начальное состояние ──────────────────────────────────────────────────

  it('начальное состояние: нет измерений, ключ разомкнут, задача A-length', () => {
    expect(experiment.measurements.length).toBe(0);
    expect(experiment.voltage).toBeCloseTo(4.5, 2);
    expect(experiment.activeTask).toBe('A-length');
  });

  it('key-control скрыт до размещения ключа', () => {
    const kc = host.querySelector<HTMLElement>('#key-control');
    expect(kc?.hidden).toBe(true);
  });

  it('voltage-control скрыт до размещения источника', () => {
    const vc = host.querySelector<HTMLElement>('#voltage-control');
    expect(vc?.hidden).toBe(true);
  });

  // ─── setVoltage: clamp [1.0, 6.0] (урок Фазы C) ─────────────────────────

  it('слайдер ограничен 6,0 (урок Фазы C)', () => {
    experiment.setVoltage(7.5);
    expect(experiment.voltage).toBeLessThanOrEqual(6.0);
  });

  it('setVoltage clamp снизу: < 1.0 → 1.0', () => {
    experiment.setVoltage(0.5);
    expect(experiment.voltage).toBeGreaterThanOrEqual(1.0);
  });

  it('setVoltage(4.5) — корректное значение', () => {
    experiment.setVoltage(4.5);
    expect(experiment.voltage).toBeCloseTo(4.5, 2);
  });

  // ─── Размещение приборов ──────────────────────────────────────────────────

  it('placeInSlot: источник питания → true', () => {
    expect(experiment.placeInSlot('source', 'power-source')).toBe(true);
  });

  it('placeInSlot: проволока в resistor-слот → true', () => {
    expect(experiment.placeInSlot('resistor', 'wire-len-10')).toBe(true);
  });

  it('placeInSlot: неподходящий прибор → false', () => {
    expect(experiment.placeInSlot('voltmeter', 'ammeter')).toBe(false);
  });

  it('placeInSlot: повторное размещение в занятый слот → false', () => {
    experiment.placeInSlot('source', 'power-source');
    expect(experiment.placeInSlot('source', 'power-source')).toBe(false);
  });

  it('после размещения source: voltage-control появляется', () => {
    experiment.placeInSlot('source', 'power-source');
    const vc = host.querySelector<HTMLElement>('#voltage-control');
    expect(vc?.hidden).toBe(false);
  });

  it('после размещения key: key-control появляется', () => {
    experiment.placeInSlot('key', 'key');
    const kc = host.querySelector<HTMLElement>('#key-control');
    expect(kc?.hidden).toBe(false);
  });

  // ─── key-btn: динамический aria-label (урок Фаз B/C) ─────────────────────

  it('key-btn aria-label = "Замкнуть ключ" при разомкнутом', () => {
    experiment.placeInSlot('key', 'key');
    const btn = host.querySelector<HTMLButtonElement>('#key-btn');
    expect(btn?.getAttribute('aria-label')).toBe('Замкнуть ключ');
  });

  it('key-btn aria-label = "Разомкнуть ключ" при замкнутом', () => {
    assembleCircuit(experiment, 'wire-len-10');
    experiment.setKeyClosed(true);
    const btn = host.querySelector<HTMLButtonElement>('#key-btn');
    expect(btn?.getAttribute('aria-label')).toBe('Разомкнуть ключ');
  });

  // ─── Полная сборка цепи + запись измерения ────────────────────────────────

  function assembleCircuit(exp: WireResistanceExperiment, wireId: EquipmentId): void {
    exp.placeInSlot('source', 'power-source');
    exp.placeInSlot('key', 'key');
    exp.placeInSlot('ammeter', 'ammeter');
    exp.placeInSlot('resistor', wireId);
    exp.placeInSlot('voltmeter', 'voltmeter');
  }

  it('запись после полной сборки + замыкания ключа создаёт строку', () => {
    assembleCircuit(experiment, 'wire-len-10');
    experiment.setVoltage(4.5);
    experiment.setKeyClosed(true);
    experiment.recordMeasurement();

    expect(experiment.measurements.length).toBe(1);
    const m = experiment.measurements[0]!;
    // нихром l=1.0 м S=0.25 мм² → R=ρl/S=1.1e-6*1.0/0.25e-6=4.4 Ом
    const R_theory = wireResistance(RESISTIVITY['нихром'], 1.0, 0.25e-6);
    expect(m['U_V']).toBeCloseTo(4.5, 2);
    // I = U/R
    const I_expected = 4.5 / R_theory;
    expect(m['I_A']).toBeCloseTo(I_expected, 3);
    expect(m['task']).toBe('A-length');
  });

  it('запись без замкнутого ключа — игнорируется', () => {
    assembleCircuit(experiment, 'wire-len-10');
    experiment.setVoltage(4.5);
    experiment.recordMeasurement();
    expect(experiment.measurements.length).toBe(0);
  });

  it('запись без полной цепи — игнорируется', () => {
    experiment.placeInSlot('source', 'power-source');
    experiment.placeInSlot('key', 'key');
    experiment.setKeyClosed(true);
    experiment.recordMeasurement();
    expect(experiment.measurements.length).toBe(0);
  });

  // ─── Физические инварианты задачи A (R ∝ l) ──────────────────────────────

  it('A-length: R(l=2.0) > R(l=1.0) > R(l=0.5) — монотонный рост', () => {
    const measure = (wireId: EquipmentId): number => {
      experiment.reset(false);
      assembleCircuit(experiment, wireId);
      experiment.setVoltage(4.5);
      experiment.setKeyClosed(true);
      experiment.recordMeasurement();
      const m = experiment.measurements.at(-1)!;
      return (m['U_V'] as number) / (m['I_A'] as number);
    };

    const r05 = measure('wire-len-05');
    const r10 = measure('wire-len-10');
    const r20 = measure('wire-len-20');
    expect(r10).toBeGreaterThan(r05);
    expect(r20).toBeGreaterThan(r10);
  });

  it('A-length: R(l=2.0)/R(l=0.5) ≈ 4 (R∝l)', () => {
    const measure = (wireId: EquipmentId): number => {
      experiment.reset(false);
      assembleCircuit(experiment, wireId);
      experiment.setVoltage(4.5);
      experiment.setKeyClosed(true);
      experiment.recordMeasurement();
      const m = experiment.measurements.at(-1)!;
      return (m['U_V'] as number) / (m['I_A'] as number);
    };

    const r05 = measure('wire-len-05');
    const r20 = measure('wire-len-20');
    expect(r20 / r05).toBeCloseTo(4, 1); // l 0.5→2.0 = ×4
  });

  // ─── Физические инварианты задачи B (R ∝ 1/S) ───────────────────────────

  it('B-section: R(S=0.25) > R(S=0.5) > R(S=1.0) — обратная монотонность', () => {
    experiment.setActiveTask('B-section');

    const measure = (wireId: EquipmentId): number => {
      experiment.reset(false);
      experiment.setActiveTask('B-section');
      assembleCircuit(experiment, wireId);
      experiment.setVoltage(4.5);
      experiment.setKeyClosed(true);
      experiment.recordMeasurement();
      const m = experiment.measurements.at(-1)!;
      return (m['U_V'] as number) / (m['I_A'] as number);
    };

    const r025 = measure('wire-sec-025');
    const r05 = measure('wire-sec-05');
    const r10 = measure('wire-sec-10');
    expect(r025).toBeGreaterThan(r05);
    expect(r05).toBeGreaterThan(r10);
  });

  it('B-section: R(S=0.25)/R(S=1.0) ≈ 4 (R∝1/S)', () => {
    experiment.setActiveTask('B-section');

    const measure = (wireId: EquipmentId): number => {
      experiment.reset(false);
      experiment.setActiveTask('B-section');
      assembleCircuit(experiment, wireId);
      experiment.setVoltage(4.5);
      experiment.setKeyClosed(true);
      experiment.recordMeasurement();
      const m = experiment.measurements.at(-1)!;
      return (m['U_V'] as number) / (m['I_A'] as number);
    };

    const r025 = measure('wire-sec-025');
    const r10 = measure('wire-sec-10');
    expect(r025 / r10).toBeCloseTo(4, 1); // S 0.25→1.0 ×4 → R ÷4
  });

  // ─── Физические инварианты задачи C (R ∝ ρ) ─────────────────────────────

  it('C-rho: R(нихром) > R(константан) > R(никелин)', () => {
    experiment.setActiveTask('C-rho');

    const measure = (wireId: EquipmentId): number => {
      experiment.reset(false);
      experiment.setActiveTask('C-rho');
      assembleCircuit(experiment, wireId);
      experiment.setVoltage(4.5);
      experiment.setKeyClosed(true);
      experiment.recordMeasurement();
      const m = experiment.measurements.at(-1)!;
      return (m['U_V'] as number) / (m['I_A'] as number);
    };

    const rNi = measure('wire-mat-ni');
    const rKo = measure('wire-mat-ko');
    const rNk = measure('wire-mat-nk');
    expect(rNi).toBeGreaterThan(rKo);
    expect(rKo).toBeGreaterThan(rNk);
  });

  // ─── Журнал v2: host получает рендер ─────────────────────────────────────

  it('после записи #journal-host перестаёт быть hidden', () => {
    assembleCircuit(experiment, 'wire-len-10');
    experiment.setVoltage(4.5);
    experiment.setKeyClosed(true);
    experiment.recordMeasurement();

    const jh = host.querySelector<HTMLElement>('#journal-host');
    expect(jh?.hidden).toBe(false);
  });

  it('счётчик измерений отображает количество строк', () => {
    assembleCircuit(experiment, 'wire-len-10');
    experiment.setKeyClosed(true);
    experiment.setVoltage(3.0);
    experiment.recordMeasurement();

    const cnt = host.querySelector<HTMLElement>('#measurement-count');
    expect(cnt?.hidden).toBe(false);
    expect(cnt?.textContent).toBe('1');
  });

  // ─── Task-switcher ────────────────────────────────────────────────────────

  it('по умолчанию активна задача A-length', () => {
    expect(experiment.activeTask).toBe('A-length');
  });

  it('setActiveTask переключает задачу', () => {
    experiment.setActiveTask('B-section');
    expect(experiment.activeTask).toBe('B-section');
  });

  it('setActiveTask переключает aria-current в DOM', () => {
    experiment.setActiveTask('B-section');
    const bTab = host.querySelector<HTMLElement>('[data-task="B-section"]');
    expect(bTab?.getAttribute('aria-current')).toBe('true');
    const aTab = host.querySelector<HTMLElement>('[data-task="A-length"]');
    expect(aTab?.getAttribute('aria-current')).toBe('false');
  });

  // ─── Журнал фильтруется по задаче ────────────────────────────────────────

  it('журнал фильтруется по активной задаче (записи A не видны в B)', () => {
    // Запись в A
    assembleCircuit(experiment, 'wire-len-10');
    experiment.setKeyClosed(true);
    experiment.recordMeasurement();
    expect(experiment.measurements.filter((m: any) => m.task === 'A-length').length).toBe(1);

    // Переключиться в B — записей B пока нет
    experiment.setActiveTask('B-section');
    expect(experiment.measurements.filter((m: any) => m.task === 'B-section').length).toBe(0);
  });

  // ─── Reset ────────────────────────────────────────────────────────────────

  it('reset(true): очищает измерения и возвращает к исходному состоянию', () => {
    assembleCircuit(experiment, 'wire-len-10');
    experiment.setKeyClosed(true);
    experiment.setVoltage(4.5);
    experiment.recordMeasurement();
    expect(experiment.measurements.length).toBe(1);

    experiment.reset(true);
    expect(experiment.measurements.length).toBe(0);

    const kc = host.querySelector<HTMLElement>('#key-control');
    expect(kc?.hidden).toBe(true); // ключ убран из слота
  });

  it('reset(false): сохраняет measurements, сбрасывает цепь и #lastRecordedSignature', () => {
    assembleCircuit(experiment, 'wire-len-10');
    experiment.setKeyClosed(true);
    experiment.setVoltage(4.5);
    experiment.recordMeasurement();
    const countBefore = experiment.measurements.length;

    experiment.reset(false);
    expect(experiment.measurements.length).toBe(countBefore);

    // Цепь должна быть сброшена (ключ скрыт)
    const kc = host.querySelector<HTMLElement>('#key-control');
    expect(kc?.hidden).toBe(true);
  });

  it('reset(false) сохраняет activeTask', () => {
    experiment.setActiveTask('C-rho');
    assembleCircuit(experiment, 'wire-mat-ni');
    experiment.setKeyClosed(true);
    experiment.recordMeasurement();
    experiment.reset(false);
    expect(experiment.activeTask).toBe('C-rho');
  });

  it('reset(true) сохраняет activeTask', () => {
    experiment.setActiveTask('B-section');
    experiment.reset(true);
    expect(experiment.activeTask).toBe('B-section');
  });

  // ─── Remount guard ────────────────────────────────────────────────────────

  it('mount → destroy → remount: placeInSlot работает на 2-м маунте', () => {
    experiment.destroy();
    host.innerHTML = '';

    const refs2 = buildRefs(host);
    const experiment2 = new WireResistanceExperiment(refs2);

    expect(experiment2.placeInSlot('source', 'power-source')).toBe(true);
    expect(experiment2.placeInSlot('key', 'key')).toBe(true);
    expect(experiment2.placeInSlot('ammeter', 'ammeter')).toBe(true);
    expect(experiment2.placeInSlot('resistor', 'wire-len-10')).toBe(true);
    expect(experiment2.placeInSlot('voltmeter', 'voltmeter')).toBe(true);

    experiment2.setKeyClosed(true);
    experiment2.setVoltage(3.0);
    experiment2.recordMeasurement();
    expect(experiment2.measurements.length).toBe(1);

    experiment = experiment2;
  });
});

// ─── WireResistanceScreen (full mount) ───────────────────────────────────────

describe('WireResistanceScreen — мульти-таск (Фаза D)', () => {
  function mountScreen() {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const screen = new WireResistanceScreen();
    screen.mount(host);
    const exp = (window as unknown as { wireResistanceExperiment: any }).wireResistanceExperiment;
    return { host, screen, exp };
  }

  it('по умолчанию активна задача A-length', () => {
    const { exp, screen } = mountScreen();
    expect(exp.activeTask).toBe('A-length');
    screen.unmount();
  });

  it('setActiveTask переключает вкладку + aria-current', () => {
    const { host, exp, screen } = mountScreen();
    exp.setActiveTask('B-section');
    expect(exp.activeTask).toBe('B-section');
    const activeTab = host.querySelector('[data-task="B-section"]')!;
    expect(activeTab.getAttribute('data-state')).toBe('active');
    expect(activeTab.getAttribute('aria-current')).toBe('true');
    screen.unmount();
  });

  it('wire-resistance: voltage clamp ≤ 6.0 (урок Фазы C)', () => {
    const { exp, screen } = mountScreen();
    exp.setVoltage(7.5);
    expect(exp.voltage).toBeLessThanOrEqual(6.0);
    screen.unmount();
  });

  it('reset() сохраняет activeTask', () => {
    const { exp, screen } = mountScreen();
    exp.setActiveTask('C-rho');
    exp.reset(true);
    expect(exp.activeTask).toBe('C-rho');
    screen.unmount();
  });
});
