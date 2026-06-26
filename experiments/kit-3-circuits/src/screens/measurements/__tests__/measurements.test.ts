/**
 * measurements.test.ts — state-machine тест экрана «Измерения» опыт 3.1.
 *
 * Тестирует MeasurementsExperiment через публичный программный API:
 *   placeInSlot, setKeyClosed, setVoltage, recordMeasurement
 * НЕ эмулирует pointer-events — для них selfcheck-3-1.mjs (Playwright).
 *
 * Паттерн: happy-dom + customElements (как FrictionExperiment тест в kit-2).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Регистрируем все custom elements
import '../../../ui/components/lab-power-source';
import '../../../ui/components/lab-voltmeter';
import '../../../ui/components/lab-ammeter';
import '../../../ui/components/lab-resistor';
import '../../../ui/components/lab-key';
import '../../../ui/components/lab-circuit-board';
import '../../../ui/components/lab-equipment-card';

import { MeasurementsExperiment, type ExperimentRefs } from '../MeasurementsExperiment';
import { MeasurementsScreen } from '../MeasurementsScreen';
import { current as circuitCurrent } from '../../../physics/circuit/CircuitModel';

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function buildRefs(host: HTMLElement): ExperimentRefs {
  // Inject template HTML structure into host
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
            <input id="voltage-input" type="range" min="1.5" max="7.5" step="0.5" value="4.5"/>
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
      <li class="step" data-step="1"><span class="step-num">1</span><span class="step-label">Соберите цепь</span></li>
      <li class="step" data-step="2"><span class="step-num">2</span><span class="step-label">Замкните ключ</span></li>
      <li class="step" data-step="3"><span class="step-num">3</span><span class="step-label">Снимите показания</span></li>
      <li class="step" data-step="4"><span class="step-num">4</span><span class="step-label">Запишите R</span></li>
    </ol>
    <!-- Equipment cards -->
    <lab-equipment-card data-eq="power-source" data-draggable="power-source" data-dropzone="power-source" data-dropzone-id="card-power-source" status="available">
      <lab-power-source voltage="4.5"></lab-power-source>
    </lab-equipment-card>
    <lab-equipment-card data-eq="voltmeter" data-draggable="voltmeter" data-dropzone="voltmeter" data-dropzone-id="card-voltmeter" status="available">
      <lab-voltmeter range="3" value="0"></lab-voltmeter>
    </lab-equipment-card>
    <lab-equipment-card data-eq="ammeter" data-draggable="ammeter" data-dropzone="ammeter" data-dropzone-id="card-ammeter" status="available">
      <lab-ammeter range="3" value="0"></lab-ammeter>
    </lab-equipment-card>
    <lab-equipment-card data-eq="resistor-r1" data-draggable="resistor" data-dropzone="resistor" data-dropzone-id="card-resistor-r1" status="available">
      <lab-resistor variant="R1"></lab-resistor>
    </lab-equipment-card>
    <lab-equipment-card data-eq="key" data-draggable="key" data-dropzone="key" data-dropzone-id="card-key" status="available">
      <lab-key></lab-key>
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
    ...(host.querySelector<HTMLElement>('#record-mode-slot') ? { recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot')! } : {}),
    ...(host.querySelector<HTMLElement>('#journal-host') ? { journalHost: host.querySelector<HTMLElement>('#journal-host')! } : {}),
    ...(host.querySelector<HTMLElement>('#record-pending-slot') ? { recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot')! } : {}),
    ...(host.querySelector('#record-pending-btn') ? { recordPendingBtn: host.querySelector('#record-pending-btn') as HTMLButtonElement } : {}),
    ...(host.querySelector<HTMLElement>('#record-pending-summary') ? { recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary')! } : {}),
  };
}

// ─── Тесты ───────────────────────────────────────────────────────────────────

describe('MeasurementsExperiment — state machine', () => {
  let host: HTMLElement;
  let experiment: MeasurementsExperiment;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const refs = buildRefs(host);
    experiment = new MeasurementsExperiment(refs);
  });

  afterEach(() => {
    experiment.destroy();
    host.remove();
    globalThis.gc?.();
  });

  // ─── Слоты журнала v2 присутствуют ───────────────────────────────────────

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

  it('начальное состояние: нет измерений, ключ разомкнут', () => {
    expect(experiment.measurements.length).toBe(0);
    expect(experiment.voltage).toBeCloseTo(4.5, 2);
  });

  it('key-control скрыт до размещения ключа', () => {
    const kc = host.querySelector<HTMLElement>('#key-control');
    expect(kc?.hidden).toBe(true);
  });

  it('voltage-control скрыт до размещения источника', () => {
    const vc = host.querySelector<HTMLElement>('#voltage-control');
    expect(vc?.hidden).toBe(true);
  });

  // ─── Размещение приборов ──────────────────────────────────────────────────

  it('placeInSlot: корректный прибор → true', () => {
    expect(experiment.placeInSlot('source', 'power-source')).toBe(true);
  });

  it('placeInSlot: неподходящий прибор → false', () => {
    // ammeter не подходит в voltmeter-слот
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

  // ─── Полная сборка цепи + запись измерения ────────────────────────────────

  function assembleCircuit(exp: MeasurementsExperiment): void {
    exp.placeInSlot('source', 'power-source');
    exp.placeInSlot('key', 'key');
    exp.placeInSlot('ammeter', 'ammeter');
    exp.placeInSlot('resistor', 'resistor-r1');
    exp.placeInSlot('voltmeter', 'voltmeter');
  }

  it('после сборки всех 5 приборов + замыкания ключа: recordMeasurement создаёт строку', () => {
    assembleCircuit(experiment);
    experiment.setVoltage(3.0);
    experiment.setKeyClosed(true);
    experiment.recordMeasurement();

    expect(experiment.measurements.length).toBe(1);
    const m = experiment.measurements[0]!;
    expect(m.voltageV).toBeCloseTo(3.0, 2);
    // R1 = 4.7 Ом; I = U/R = 3.0/4.7
    const expectedI = circuitCurrent(3.0, 4.7);
    expect(m.currentA).toBeCloseTo(expectedI, 4);
    expect(m.resistorVariant).toBe('R1');
  });

  it('запись без замкнутого ключа — игнорируется', () => {
    assembleCircuit(experiment);
    experiment.setVoltage(3.0);
    // keyClosed = false (default)
    experiment.recordMeasurement();
    expect(experiment.measurements.length).toBe(0);
  });

  it('запись без полной цепи — игнорируется', () => {
    experiment.placeInSlot('source', 'power-source');
    experiment.placeInSlot('key', 'key');
    experiment.setKeyClosed(true);
    experiment.recordMeasurement(); // нет ammeter/resistor/voltmeter
    expect(experiment.measurements.length).toBe(0);
  });

  it('R1: U=1.5, I≈0.319 → R = U/I ≈ 4.7 Ом (в пределах ФИПИ 4.2–5.2)', () => {
    assembleCircuit(experiment);
    experiment.setVoltage(1.5);
    experiment.setKeyClosed(true);
    experiment.recordMeasurement();

    const m = experiment.measurements[0]!;
    const R_computed = m.voltageV / m.currentA;
    expect(R_computed).toBeGreaterThanOrEqual(4.2);
    expect(R_computed).toBeLessThanOrEqual(5.2);
  });

  it('несколько измерений при разных напряжениях накапливаются в массив', () => {
    assembleCircuit(experiment);
    experiment.setKeyClosed(true);

    for (const U of [1.5, 3.0, 4.5]) {
      experiment.setVoltage(U);
      experiment.recordMeasurement();
    }

    expect(experiment.measurements.length).toBe(3);
    for (let i = 0; i < 3; i++) {
      const m = experiment.measurements[i]!;
      expect(m.currentA).toBeCloseTo(m.voltageV / 4.7, 3);
    }
  });

  // ─── Journal v2: host получает рендер ─────────────────────────────────────

  it('после записи #journal-host перестаёт быть hidden', () => {
    assembleCircuit(experiment);
    experiment.setVoltage(4.5);
    experiment.setKeyClosed(true);
    experiment.recordMeasurement();

    const jh = host.querySelector<HTMLElement>('#journal-host');
    expect(jh?.hidden).toBe(false);
  });

  it('счётчик измерений отображает количество строк', () => {
    assembleCircuit(experiment);
    experiment.setKeyClosed(true);
    experiment.setVoltage(3.0);
    experiment.recordMeasurement();

    const cnt = host.querySelector<HTMLElement>('#measurement-count');
    expect(cnt?.hidden).toBe(false);
    expect(cnt?.textContent).toBe('1');
  });

  // ─── Reset ────────────────────────────────────────────────────────────────

  it('reset: очищает измерения и возвращает к исходному состоянию', () => {
    assembleCircuit(experiment);
    experiment.setKeyClosed(true);
    experiment.setVoltage(4.5);
    experiment.recordMeasurement();
    expect(experiment.measurements.length).toBe(1);

    experiment.reset();
    expect(experiment.measurements.length).toBe(0);

    const kc = host.querySelector<HTMLElement>('#key-control');
    expect(kc?.hidden).toBe(true); // ключ убран из слота
  });

  it('после reset: повторная сборка и запись работают корректно', () => {
    assembleCircuit(experiment);
    experiment.setKeyClosed(true);
    experiment.setVoltage(3.0);
    experiment.recordMeasurement();
    experiment.reset();

    assembleCircuit(experiment);
    experiment.setKeyClosed(true);
    experiment.setVoltage(6.0);
    experiment.recordMeasurement();

    expect(experiment.measurements.length).toBe(1);
    expect(experiment.measurements[0]!.voltageV).toBeCloseTo(6.0, 2);
  });

  // ─── Remount guard (FIX 3: snap-zone cleanup) ────────────────────────────

  it('mount → destroy → remount → placeInSlot succeeds on 2nd mount (exercises rewire cleanup)', () => {
    // First mount already happened in beforeEach; destroy it
    experiment.destroy();
    host.innerHTML = '';

    // Second mount — snap-zones must be properly re-registered
    const refs2 = buildRefs(host);
    const experiment2 = new MeasurementsExperiment(refs2);

    expect(experiment2.placeInSlot('source', 'power-source')).toBe(true);
    expect(experiment2.placeInSlot('key', 'key')).toBe(true);
    expect(experiment2.placeInSlot('ammeter', 'ammeter')).toBe(true);
    expect(experiment2.placeInSlot('resistor', 'resistor-r1')).toBe(true);
    expect(experiment2.placeInSlot('voltmeter', 'voltmeter')).toBe(true);

    experiment2.setKeyClosed(true);
    experiment2.setVoltage(3.0);
    experiment2.recordMeasurement();
    expect(experiment2.measurements.length).toBe(1);

    // Hand off to afterEach for cleanup (reassign so afterEach destroys experiment2)
    experiment = experiment2;
  });

  // ─── ФИПИ-инвариант R ─────────────────────────────────────────────────────

  it('ФИПИ: R1 — R всегда в диапазоне 4.2–5.2 для любого U ∈ [1.5, 7.5]', () => {
    const voltages = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5];
    for (const U of voltages) {
      const I = circuitCurrent(U, 4.7);
      const R = U / I;
      expect(R).toBeGreaterThanOrEqual(4.2);
      expect(R).toBeLessThanOrEqual(5.2);
    }
  });
});

describe('measurements — мульти-таск (Фаза B)', () => {
  function mountScreen() {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const screen = new MeasurementsScreen();
    screen.mount(host);
    const exp = (window as unknown as { measurementsExperiment: any }).measurementsExperiment;
    return { host, screen, exp };
  }

  it('по умолчанию активна задача A-resistance', () => {
    const { exp, screen } = mountScreen();
    expect(exp.activeTask).toBe('A-resistance');
    screen.unmount();
  });

  it('setActiveTask переключает вкладку + aria-current', () => {
    const { host, exp, screen } = mountScreen();
    exp.setActiveTask('B-power');
    expect(exp.activeTask).toBe('B-power');
    const activeTab = host.querySelector('[data-task="B-power"]')!;
    expect(activeTab.getAttribute('data-state')).toBe('active');
    expect(activeTab.getAttribute('aria-current')).toBe('true');
    screen.unmount();
  });

  it('опыт 3.2: сборка R3 → замыкание → запись → P=U·I в журнале', () => {
    const { host, exp, screen } = mountScreen();
    exp.setActiveTask('B-power');
    exp.placeInSlot('source', 'power-source');
    exp.placeInSlot('key', 'key');
    exp.placeInSlot('ammeter', 'ammeter');
    exp.placeInSlot('resistor', 'resistor-r3');
    exp.placeInSlot('voltmeter', 'voltmeter');
    exp.setVoltage(5.7);
    exp.setKeyClosed(true);
    exp.recordMeasurement();
    const recorded = exp.measurements.filter((m: any) => m.task === 'B-power');
    expect(recorded.length).toBe(1);
    // I = 5.7/8.2 ≈ 0.695; P = 5.7*0.695 ≈ 3.96 ∈ [3.5,4.5]
    expect(recorded[0].powerW).toBeGreaterThan(3.5);
    expect(recorded[0].powerW).toBeLessThan(4.5);
    expect(host.querySelector('#journal-host')).not.toBeNull();
    screen.unmount();
  });

  it('журнал фильтруется по активной задаче (записи A не видны в B)', () => {
    const { exp, screen } = mountScreen();
    // запись в A
    exp.placeInSlot('source', 'power-source'); exp.placeInSlot('key', 'key');
    exp.placeInSlot('ammeter', 'ammeter'); exp.placeInSlot('resistor', 'resistor-r1');
    exp.placeInSlot('voltmeter', 'voltmeter'); exp.setKeyClosed(true);
    exp.recordMeasurement();
    expect(exp.measurements.filter((m: any) => m.task === 'A-resistance').length).toBe(1);
    // переключаемся в B — записей B пока нет
    exp.setActiveTask('B-power');
    expect(exp.measurements.filter((m: any) => m.task === 'B-power').length).toBe(0);
    screen.unmount();
  });
});
