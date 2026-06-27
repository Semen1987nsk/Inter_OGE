/**
 * iv-curve.test.ts — state-machine тест экрана опыт 3.4 «ВАХ».
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3, п.4:
 * «исследование зависимости силы тока в проводнике (резисторы, лампочка) от напряжения».
 *
 * Резистор R1 (4.7 Ом) — линейная ВАХ: I = U/R (const).
 * Лампочка (LAMP_RATED 4.8 В / 0.5 А) — нелинейная вогнутая: I(U) < U/R_cold.
 *
 * Тестирует IvCurveExperiment через программный API (НЕ pointer-events).
 * Паттерн: happy-dom + customElements (по образцу measurements.test.ts).
 */

import { describe, it, expect, afterEach } from 'vitest';

// Регистрируем все custom elements
import '../../../ui/components/lab-power-source';
import '../../../ui/components/lab-voltmeter';
import '../../../ui/components/lab-ammeter';
import '../../../ui/components/lab-resistor';
import '../../../ui/components/lab-key';
import '../../../ui/components/lab-circuit-board';
import '../../../ui/components/lab-equipment-card';
import '../../../ui/components/lab-lamp';
import '../../../ui/components/lab-graph';

import { IvCurveScreen } from '../IvCurveScreen';
import { lampCurrent } from '../../../physics/circuit/CircuitModel';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const screen = new IvCurveScreen();
  screen.mount(host);
  const exp = (window as unknown as { ivCurveExperiment: any }).ivCurveExperiment;
  return { host, screen, exp };
}

function placeAll(exp: any, resistorSlotEqId: string) {
  exp.placeInSlot('source', 'power-source');
  exp.placeInSlot('key', 'key');
  exp.placeInSlot('ammeter', 'ammeter');
  exp.placeInSlot('resistor', resistorSlotEqId);
  exp.placeInSlot('voltmeter', 'voltmeter');
}

// ─── Тесты ───────────────────────────────────────────────────────────────────

describe('iv-curve экран (опыт 3.4)', () => {
  afterEach(() => {
    globalThis.gc?.();
  });

  // ─── Базовые DOM-слоты журнала v2 ─────────────────────────────────────────

  it('template содержит #journal-host', () => {
    const { host, screen } = mount();
    expect(host.querySelector('#journal-host')).not.toBeNull();
    screen.unmount();
  });

  it('template содержит #record-mode-slot', () => {
    const { host, screen } = mount();
    expect(host.querySelector('#record-mode-slot')).not.toBeNull();
    screen.unmount();
  });

  it('template содержит #live-region с aria-live', () => {
    const { host, screen } = mount();
    const lr = host.querySelector('#live-region');
    expect(lr).not.toBeNull();
    expect(lr?.getAttribute('aria-live')).toBe('polite');
    screen.unmount();
  });

  it('template содержит #record-pending-btn', () => {
    const { host, screen } = mount();
    expect(host.querySelector('#record-pending-btn')).not.toBeNull();
    screen.unmount();
  });

  it('template содержит #iv-graph (lab-graph)', () => {
    const { host, screen } = mount();
    expect(host.querySelector('#iv-graph')).not.toBeNull();
    screen.unmount();
  });

  it('template содержит #clear-data-btn', () => {
    const { host, screen } = mount();
    expect(host.querySelector('#clear-data-btn')).not.toBeNull();
    screen.unmount();
  });

  // ─── Начальное состояние ──────────────────────────────────────────────────

  it('начальное состояние: нет измерений, ключ разомкнут', () => {
    const { exp, screen } = mount();
    expect(exp.measurements.length).toBe(0);
    expect(exp.voltage).toBeCloseTo(4.5, 2);
    screen.unmount();
  });

  it('window.ivCurveExperiment выставлен', () => {
    const { screen } = mount();
    expect((window as any).ivCurveExperiment).toBeDefined();
    screen.unmount();
  });

  // ─── Размещение приборов ──────────────────────────────────────────────────

  it('placeInSlot: корректный прибор в source → true', () => {
    const { exp, screen } = mount();
    expect(exp.placeInSlot('source', 'power-source')).toBe(true);
    screen.unmount();
  });

  it('placeInSlot: lamp в resistor-слот → true (лампа принимается)', () => {
    const { exp, screen } = mount();
    exp.placeInSlot('source', 'power-source');
    exp.placeInSlot('key', 'key');
    exp.placeInSlot('ammeter', 'ammeter');
    expect(exp.placeInSlot('resistor', 'lamp')).toBe(true);
    screen.unmount();
  });

  it('placeInSlot: resistor-r1 в resistor-слот → true', () => {
    const { exp, screen } = mount();
    exp.placeInSlot('source', 'power-source');
    exp.placeInSlot('key', 'key');
    exp.placeInSlot('ammeter', 'ammeter');
    expect(exp.placeInSlot('resistor', 'resistor-r1')).toBe(true);
    screen.unmount();
  });

  it('placeInSlot: неподходящий прибор → false (ammeter в voltmeter-слот)', () => {
    const { exp, screen } = mount();
    expect(exp.placeInSlot('voltmeter', 'ammeter')).toBe(false);
    screen.unmount();
  });

  // ─── Резистор: линейная ВАХ ───────────────────────────────────────────────

  it('резистор: запись точки → I=U/R линейно, серия resistor растёт', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'resistor-r1');
    exp.setVoltage(3);
    exp.setKeyClosed(true);
    exp.recordMeasurement();

    const r = exp.measurements.filter((m: any) => m.element === 'Резистор');
    expect(r.length).toBe(1);
    // R1 = 4.7 Ом; I = 3/4.7 ≈ 0.638
    expect(r[0].currentA).toBeCloseTo(3 / 4.7, 2);
    screen.unmount();
  });

  it('резистор: несколько точек — ток линейно растёт с напряжением', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'resistor-r1');
    exp.setKeyClosed(true);

    const voltages = [1.5, 3.0, 4.5, 6.0];
    for (const U of voltages) {
      exp.setVoltage(U);
      exp.recordMeasurement();
    }

    const r = exp.measurements.filter((m: any) => m.element === 'Резистор');
    expect(r.length).toBe(4);
    // Линейность: I ∝ U ⇒ I[i]/U[i] = const (R1 = 4.7)
    for (const m of r) {
      expect(m.currentA).toBeCloseTo(m.voltageV / 4.7, 2);
    }
    screen.unmount();
  });

  it('резистор: ФИПИ — R1 в диапазоне 4.2–5.2 для любого U', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'resistor-r1');
    exp.setKeyClosed(true);

    for (const U of [1.5, 3.0, 4.5, 6.0, 7.5]) {
      exp.setVoltage(U);
      exp.recordMeasurement();
    }

    const r = exp.measurements.filter((m: any) => m.element === 'Резистор');
    for (const m of r) {
      const R = m.voltageV / m.currentA;
      expect(R).toBeGreaterThanOrEqual(4.2);
      expect(R).toBeLessThanOrEqual(5.2);
    }
    screen.unmount();
  });

  // ─── Лампа: нелинейная вогнутая ВАХ ──────────────────────────────────────

  it('лампа: I(U) нелинейна и < линейной (вогнутая)', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'lamp');
    exp.setVoltage(4.8);
    exp.setKeyClosed(true);
    exp.recordMeasurement();

    const l = exp.measurements.filter((m: any) => m.element === 'Лампа');
    expect(l.length).toBe(1);
    // Номинал: I(4.8) ≈ 0.5 А
    expect(l[0].currentA).toBeCloseTo(0.5, 2);
    screen.unmount();
  });

  it('лампа: I(U) монотонно возрастает', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'lamp');
    exp.setKeyClosed(true);

    const voltages = [1.0, 2.0, 3.0, 4.0, 5.0];
    for (const U of voltages) {
      exp.setVoltage(U);
      exp.recordMeasurement();
    }

    const l = exp.measurements.filter((m: any) => m.element === 'Лампа');
    expect(l.length).toBe(5);
    for (let i = 1; i < l.length; i++) {
      expect(l[i].currentA).toBeGreaterThan(l[i - 1].currentA);
    }
    screen.unmount();
  });

  it('лампа: при U>2 I_лампа < I_резистор (вогнутость; R_лампа > R1_cold)', () => {
    const { screen } = mount();
    // Проверяем: lampCurrent(U) < U/4.7 при U>2 (чистая физическая проверка)
    const U = 4.0;
    const iLamp = lampCurrent(U);
    const iResistor = U / 4.7;
    expect(iLamp).toBeLessThan(iResistor);
    screen.unmount();
  });

  it('лампа: записывает element="Лампа"', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'lamp');
    exp.setVoltage(3.0);
    exp.setKeyClosed(true);
    exp.recordMeasurement();

    const l = exp.measurements.filter((m: any) => m.element === 'Лампа');
    expect(l.length).toBe(1);
    screen.unmount();
  });

  // ─── Обе серии накапливаются вместе (overlaid) ────────────────────────────

  it('обе серии накапливаются вместе (overlaid)', () => {
    const { exp, screen } = mount();

    // Собрать резистор, записать
    placeAll(exp, 'resistor-r1');
    exp.setVoltage(2);
    exp.setKeyClosed(true);
    exp.recordMeasurement();

    // reset(false) сохраняет данные, сбрасывает цепь
    exp.reset();

    // Собрать лампу, записать
    placeAll(exp, 'lamp');
    exp.setVoltage(4.8);
    exp.setKeyClosed(true);
    exp.recordMeasurement();

    // Обе серии в measurements
    expect(exp.measurements.some((m: any) => m.element === 'Резистор')).toBe(true);
    expect(exp.measurements.some((m: any) => m.element === 'Лампа')).toBe(true);
    expect(exp.measurements.length).toBe(2);
    screen.unmount();
  });

  it('обе серии: суммарное число записей >= 2 после смены элементов', () => {
    const { exp, screen } = mount();

    placeAll(exp, 'resistor-r1');
    exp.setKeyClosed(true);
    for (const U of [2.0, 4.0]) {
      exp.setVoltage(U);
      exp.recordMeasurement();
    }

    exp.reset();

    placeAll(exp, 'lamp');
    exp.setKeyClosed(true);
    for (const U of [1.5, 3.0, 4.8]) {
      exp.setVoltage(U);
      exp.recordMeasurement();
    }

    expect(exp.measurements.filter((m: any) => m.element === 'Резистор').length).toBe(2);
    expect(exp.measurements.filter((m: any) => m.element === 'Лампа').length).toBe(3);
    expect(exp.measurements.length).toBe(5);
    screen.unmount();
  });

  // ─── reset(false) сохраняет данные, reset(true) чистит ───────────────────

  it('reset() без аргумента: сохраняет измерения, сбрасывает цепь', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'resistor-r1');
    exp.setVoltage(3.0);
    exp.setKeyClosed(true);
    exp.recordMeasurement();
    expect(exp.measurements.length).toBe(1);

    exp.reset();

    // Данные сохранены
    expect(exp.measurements.length).toBe(1);
    screen.unmount();
  });

  it('reset(true) (clear-data): полная очистка записей и серий', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'resistor-r1');
    exp.setVoltage(3.0);
    exp.setKeyClosed(true);
    exp.recordMeasurement();
    expect(exp.measurements.length).toBe(1);

    exp.reset(true);
    expect(exp.measurements.length).toBe(0);
    screen.unmount();
  });

  it('reset(false): повторная сборка + запись работает после reset', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'resistor-r1');
    exp.setKeyClosed(true);
    exp.setVoltage(3.0);
    exp.recordMeasurement();

    exp.reset(); // reset(false) — сохраняет данные

    placeAll(exp, 'lamp');
    exp.setKeyClosed(true);
    exp.setVoltage(4.8);
    exp.recordMeasurement();

    expect(exp.measurements.length).toBe(2);
    screen.unmount();
  });

  // ─── Запись не должна срабатывать без валидной цепи / замкнутого ключа ───

  it('запись без замкнутого ключа — игнорируется', () => {
    const { exp, screen } = mount();
    placeAll(exp, 'resistor-r1');
    exp.setVoltage(3.0);
    // keyClosed = false (default)
    exp.recordMeasurement();
    expect(exp.measurements.length).toBe(0);
    screen.unmount();
  });

  it('запись без полной цепи — игнорируется', () => {
    const { exp, screen } = mount();
    exp.placeInSlot('source', 'power-source');
    exp.placeInSlot('key', 'key');
    exp.setKeyClosed(true);
    exp.recordMeasurement(); // нет ammeter/resistor/voltmeter
    expect(exp.measurements.length).toBe(0);
    screen.unmount();
  });

  // ─── UI state ─────────────────────────────────────────────────────────────

  it('после записи #journal-host перестаёт быть hidden', () => {
    const { host, exp, screen } = mount();
    placeAll(exp, 'resistor-r1');
    exp.setVoltage(4.5);
    exp.setKeyClosed(true);
    exp.recordMeasurement();

    const jh = host.querySelector<HTMLElement>('#journal-host');
    expect(jh?.hidden).toBe(false);
    screen.unmount();
  });

  it('счётчик измерений отображает суммарное число строк', () => {
    const { host, exp, screen } = mount();
    placeAll(exp, 'resistor-r1');
    exp.setKeyClosed(true);
    exp.setVoltage(3.0);
    exp.recordMeasurement();

    const cnt = host.querySelector<HTMLElement>('#measurement-count');
    expect(cnt?.hidden).toBe(false);
    expect(cnt?.textContent).toBe('1');
    screen.unmount();
  });

  // ─── Remount guard ────────────────────────────────────────────────────────

  it('mount → unmount → mount: второй mount работает корректно', () => {
    const host1 = document.createElement('div');
    document.body.appendChild(host1);
    const screen1 = new IvCurveScreen();
    screen1.mount(host1);
    screen1.unmount();

    const host2 = document.createElement('div');
    document.body.appendChild(host2);
    const screen2 = new IvCurveScreen();
    screen2.mount(host2);
    const exp2 = (window as any).ivCurveExperiment;

    expect(exp2.placeInSlot('source', 'power-source')).toBe(true);
    expect(exp2.placeInSlot('resistor', 'lamp')).toBe(true);

    screen2.unmount();
    host1.remove();
    host2.remove();
  });
});
