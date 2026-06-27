import { describe, it, expect, afterEach } from 'vitest';

import '../../../ui/components/lab-power-source';
import '../../../ui/components/lab-voltmeter';
import '../../../ui/components/lab-ammeter';
import '../../../ui/components/lab-resistor';
import '../../../ui/components/lab-key';
import '../../../ui/components/lab-connection-board';
import '../../../ui/components/lab-equipment-card';

import { ConnectionsScreen } from '../ConnectionsScreen';
import { seriesResistance, current } from '../../../physics/circuit/CircuitModel';

const R1 = 4.7;
const R2 = 5.7;

function mountScreen() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const screen = new ConnectionsScreen();
  screen.mount(host);
  const exp = (window as unknown as { connectionsExperiment: any }).connectionsExperiment;
  return { host, screen, exp };
}

function assembleBase(exp: any, task: 'A-series' | 'B-parallel') {
  exp.setActiveTask(task);
  exp.placeInSlot('source', 'power-source');
  exp.placeInSlot('key', 'key');
  exp.placeInSlot('r1', 'r1');
  exp.placeInSlot('r2', 'r2');
  if (task === 'A-series') {
    exp.placeInSlot('ammeter', 'ammeter');
  } else {
    exp.placeInSlot('voltmeter', 'voltmeter');
  }
}

describe('ConnectionsScreen — формула по задаче (reality-check)', () => {
  let screen: ConnectionsScreen;
  afterEach(() => { screen?.unmount(); });

  it('A-series → формула «U = U1 + U2»; B-parallel → «I = I1 + I2»', () => {
    const { host, exp, screen: s } = mountScreen(); screen = s;
    exp.setVoltage(4.5);
    // Серия: записать точку, формула про напряжение
    assembleBase(exp, 'A-series');
    exp.setKeyClosed(true);
    exp.placeInSlot('v-pos-r1', 'voltmeter');
    exp.recordMeasurement();
    const expr = host.querySelector('#formula-expr') as HTMLElement;
    expect(expr.textContent?.replace(/\s/g, '')).toBe('U=U1+U2');
    // Параллель: формула про ток (не должна остаться про напряжение)
    exp.reset(true);
    assembleBase(exp, 'B-parallel');
    exp.setKeyClosed(true);
    exp.placeInSlot('a-pos-r1', 'ammeter');
    exp.recordMeasurement();
    expect(expr.textContent?.replace(/\s/g, '')).toBe('I=I1+I2');
  });
});

describe('ConnectionsScreen — опыт 3.8 серия', () => {
  let screen: ConnectionsScreen;

  afterEach(() => { screen?.unmount(); });

  it('A-series: 3 позиции вольтметра дают U1<U_общ, U2<U_общ, U1+U2≈U_общ', () => {
    const { exp, screen: s } = mountScreen(); screen = s;
    exp.setVoltage(4.5);
    assembleBase(exp, 'A-series');
    exp.setKeyClosed(true);

    const measure = (pos: string) => {
      exp.placeInSlot(pos, 'voltmeter');
      exp.recordMeasurement();
      const last = exp.measurements.at(-1);
      return last?.value as number;
    };

    const U1 = measure('v-pos-r1');
    const U2 = measure('v-pos-r2');
    const Utot = measure('v-pos-total');

    expect(U1).toBeLessThan(Utot);
    expect(U2).toBeLessThan(Utot);
    expect(U1 + U2).toBeCloseTo(Utot, 1);
  });

  it('A-series: значения U1, U2 соответствуют физике (I·R)', () => {
    const { exp, screen: s } = mountScreen(); screen = s;
    const U = 4.5;
    exp.setVoltage(U);
    assembleBase(exp, 'A-series');
    exp.setKeyClosed(true);
    exp.placeInSlot('v-pos-r1', 'voltmeter');
    exp.recordMeasurement();
    const m = exp.measurements.at(-1)!;
    const R_ser = seriesResistance(R1, R2);
    const I_ser = current(U, R_ser);
    expect(m.value).toBeCloseTo(I_ser * R1, 3);
  });

  it('A-series: слайдер ≤ 6,0 (урок Фазы C)', () => {
    const { exp, screen: s } = mountScreen(); screen = s;
    exp.setVoltage(7.5);
    expect(exp.voltage).toBeLessThanOrEqual(6.0);
  });

  it('reset(false) сохраняет measurements + сбрасывает цепь + сбрасывает #lastRecordedSignature', () => {
    const { exp, screen: s } = mountScreen(); screen = s;
    exp.setVoltage(4.5);
    assembleBase(exp, 'A-series');
    exp.setKeyClosed(true);
    exp.placeInSlot('v-pos-r1', 'voltmeter');
    exp.recordMeasurement();
    const countBefore = exp.measurements.length;

    exp.reset(false);
    expect(exp.measurements.length).toBe(countBefore);

    // После reset(false) можно снова записать ту же позицию
    assembleBase(exp, 'A-series');
    exp.setKeyClosed(true);
    exp.placeInSlot('v-pos-r1', 'voltmeter');
    exp.recordMeasurement();
    expect(exp.measurements.length).toBe(countBefore + 1);
  });
});

describe('ConnectionsScreen — опыт 3.9 параллель', () => {
  let screen: ConnectionsScreen;

  afterEach(() => { screen?.unmount(); });

  it('B-parallel: 3 позиции амперметра дают I1+I2≈I_общ', () => {
    const { exp, screen: s } = mountScreen(); screen = s;
    exp.setVoltage(4.5);
    assembleBase(exp, 'B-parallel');
    exp.setKeyClosed(true);

    const measure = (pos: string) => {
      exp.placeInSlot(pos, 'ammeter');
      exp.recordMeasurement();
      return (exp.measurements.at(-1)?.value as number);
    };

    const I1 = measure('a-pos-r1');
    const I2 = measure('a-pos-r2');
    const Itot = measure('a-pos-main');

    expect(I1 + I2).toBeCloseTo(Itot, 2);
  });

  it('B-parallel: I1 = U/R1, I2 = U/R2 по физике', () => {
    const { exp, screen: s } = mountScreen(); screen = s;
    const U = 4.5;
    exp.setVoltage(U);
    assembleBase(exp, 'B-parallel');
    exp.setKeyClosed(true);
    exp.placeInSlot('a-pos-r1', 'ammeter');
    exp.recordMeasurement();
    const m = exp.measurements.at(-1)!;
    expect(m.value).toBeCloseTo(current(U, R1), 3);
  });

  it('вольтметр range=6 во всех секциях (урок Фазы C)', () => {
    const { host, screen: s } = mountScreen(); screen = s;
    const voltmeters = host.querySelectorAll('lab-voltmeter');
    expect(voltmeters.length).toBeGreaterThan(0);
    voltmeters.forEach((vm) => {
      expect(vm.getAttribute('range')).toBe('6');
    });
  });
});

describe('ConnectionsScreen — result-panel правило', () => {
  let screen: ConnectionsScreen;

  afterEach(() => { screen?.unmount(); });

  it('A-series: result-panel появляется после 3 точек и содержит правило', () => {
    const { host, exp, screen: s } = mountScreen(); screen = s;
    exp.setVoltage(4.5);
    assembleBase(exp, 'A-series');
    exp.setKeyClosed(true);
    exp.placeInSlot('v-pos-r1', 'voltmeter');
    exp.recordMeasurement();
    exp.placeInSlot('v-pos-r2', 'voltmeter');
    exp.recordMeasurement();
    exp.placeInSlot('v-pos-total', 'voltmeter');
    exp.recordMeasurement();

    const panel = host.querySelector('#result-panel') as HTMLElement;
    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute('aria-live')).toBe('polite');
    expect(panel.textContent).toMatch(/правило напряжений/);
    expect(panel.textContent).toMatch(/[✓✗]/);
  });

  it('B-parallel: result-panel содержит правило токов после 3 точек', () => {
    const { host, exp, screen: s } = mountScreen(); screen = s;
    exp.setVoltage(4.5);
    assembleBase(exp, 'B-parallel');
    exp.setKeyClosed(true);
    exp.placeInSlot('a-pos-r1', 'ammeter');
    exp.recordMeasurement();
    exp.placeInSlot('a-pos-r2', 'ammeter');
    exp.recordMeasurement();
    exp.placeInSlot('a-pos-main', 'ammeter');
    exp.recordMeasurement();

    const panel = host.querySelector('#result-panel') as HTMLElement;
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toMatch(/правило токов/);
  });

  it('result-panel не ре-триггерит aria-live при повторных refreshUi без изменений', () => {
    const { host, exp, screen: s } = mountScreen(); screen = s;
    exp.setVoltage(4.5);
    assembleBase(exp, 'A-series');
    exp.setKeyClosed(true);
    for (const pos of ['v-pos-r1', 'v-pos-r2', 'v-pos-total']) {
      exp.placeInSlot(pos, 'voltmeter');
      exp.recordMeasurement();
    }
    const panel = host.querySelector('#result-panel') as HTMLElement;
    const before = panel.textContent;
    exp.setKeyClosed(false);
    exp.setKeyClosed(true);
    expect(panel.textContent).toBe(before);
  });
});

describe('ConnectionsScreen — guard recordMeasurement', () => {
  let screen: ConnectionsScreen;

  afterEach(() => { screen?.unmount(); });

  it('запись без замкнутого ключа — игнорируется', () => {
    const { exp, screen: s } = mountScreen(); screen = s;
    assembleBase(exp, 'A-series');
    exp.setVoltage(4.5);
    exp.placeInSlot('v-pos-r1', 'voltmeter');
    // keyClosed остаётся false (default)
    exp.recordMeasurement();
    expect(exp.measurements.length).toBe(0);
  });

  it('запись без position-позиции (неполная цепь) — игнорируется', () => {
    const { exp, screen: s } = mountScreen(); screen = s;
    exp.placeInSlot('source', 'power-source');
    exp.placeInSlot('key', 'key');
    exp.placeInSlot('r1', 'r1');
    exp.placeInSlot('r2', 'r2');
    exp.placeInSlot('ammeter', 'ammeter');
    // нет ни одной v-pos-* → #isCircuitReady() == false (нет position)
    exp.setKeyClosed(true);
    exp.recordMeasurement();
    expect(exp.measurements.length).toBe(0);
  });
});

describe('ConnectionsScreen — подвижный прибор: один в позиции', () => {
  let screen: ConnectionsScreen;

  afterEach(() => { screen?.unmount(); });

  it('A-series: перемещение вольтметра в v-pos-r2 убирает его из v-pos-r1', () => {
    const { exp, screen: s } = mountScreen(); screen = s;
    assembleBase(exp, 'A-series');
    exp.placeInSlot('v-pos-r1', 'voltmeter');
    expect(exp.movableInstrumentPosition()).toBe('R1');

    exp.placeInSlot('v-pos-r2', 'voltmeter');
    expect(exp.movableInstrumentPosition()).toBe('R2');
  });

  it('placeInSlot ставит card[data-placed]/status — зеркало onDrop', () => {
    const { host, exp, screen: s } = mountScreen(); screen = s;
    assembleBase(exp, 'A-series');
    const ammeterCard = host.querySelector('lab-equipment-card[data-eq="ammeter"]');
    expect(ammeterCard?.getAttribute('status')).toBe('placed');
    expect(ammeterCard?.getAttribute('data-placed')).toBe('ammeter');
  });

  it('eviction подвижного прибора: data-placed = новая позиция', () => {
    const { host, exp, screen: s } = mountScreen(); screen = s;
    assembleBase(exp, 'A-series');
    exp.placeInSlot('v-pos-r1', 'voltmeter');
    const vmCard = host.querySelector('lab-equipment-card[data-eq="voltmeter"]');
    expect(vmCard?.getAttribute('data-placed')).toBe('v-pos-r1');

    exp.placeInSlot('v-pos-total', 'voltmeter');
    // Та же карточка: data-placed переписан на новую позицию, прибор не «потерян».
    expect(vmCard?.getAttribute('data-placed')).toBe('v-pos-total');
    expect(vmCard?.getAttribute('status')).toBe('placed');
    // Старая позиция v-pos-r1 должна быть освобождена В ТОПОЛОГИИ:
    // если #evictPositionSlots забыл вызвать topology.remove, placeInSlot вернёт false.
    expect(exp.placeInSlot('v-pos-r1', 'voltmeter')).toBe(true);
  });
});
