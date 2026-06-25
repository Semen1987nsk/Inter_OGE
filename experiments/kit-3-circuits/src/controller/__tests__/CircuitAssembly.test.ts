import { describe, expect, it } from 'vitest';
import { CircuitTopology } from '../CircuitAssembly';

// Топология опыта 3.1: source, key, ammeter(series), resistor(series), voltmeter(parallel∥resistor)
const SLOTS_3_1 = [
  { id: 'source', role: 'source', accepts: ['power-source'] },
  { id: 'key', role: 'key', accepts: ['key'] },
  { id: 'ammeter', role: 'series', accepts: ['ammeter'] },
  { id: 'resistor', role: 'series', accepts: ['resistor'] },
  { id: 'voltmeter', role: 'parallel', accepts: ['voltmeter'] },
] as const;

describe('CircuitTopology', () => {
  it('пустая → не complete, не ok', () => {
    const t = new CircuitTopology(SLOTS_3_1);
    expect(t.isComplete()).toBe(false);
    expect(t.validate().ok).toBe(false);
  });
  it('правильная схема → ok', () => {
    const t = new CircuitTopology(SLOTS_3_1);
    t.place('source', 'power-source'); t.place('key', 'key');
    t.place('ammeter', 'ammeter'); t.place('resistor', 'resistor'); t.place('voltmeter', 'voltmeter');
    expect(t.isComplete()).toBe(true);
    expect(t.validate().ok).toBe(true);
  });
  it('амперметр в parallel-слот не принимается (accepts)', () => {
    const t = new CircuitTopology(SLOTS_3_1);
    expect(t.place('voltmeter', 'ammeter')).toBe(false); // accepts mismatch
  });
  it('remove освобождает слот', () => {
    const t = new CircuitTopology(SLOTS_3_1);
    t.place('resistor', 'resistor'); t.remove('resistor');
    expect(t.slotFilledBy('resistor')).toBeNull();
  });

  // validate() — тест на частичную сборку (FIX 1)
  it('частично собранная (нет вольтметра) → не ok, есть error с упоминанием voltmeter', () => {
    const t = new CircuitTopology(SLOTS_3_1);
    t.place('source', 'power-source'); t.place('key', 'key');
    t.place('ammeter', 'ammeter'); t.place('resistor', 'resistor');
    const v = t.validate();
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBeGreaterThan(0);
    expect(v.errors.join(' ')).toContain('voltmeter');
  });

  it('validate() при пустой схеме содержит error для каждого слота', () => {
    const t = new CircuitTopology(SLOTS_3_1);
    const v = t.validate();
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBe(5); // все 5 слотов незаполнены
  });

  // reset() — FIX 2
  it('reset() очищает все заполненные слоты', () => {
    const t = new CircuitTopology(SLOTS_3_1);
    t.place('source', 'power-source'); t.place('key', 'key');
    t.place('ammeter', 'ammeter'); t.place('resistor', 'resistor'); t.place('voltmeter', 'voltmeter');
    expect(t.isComplete()).toBe(true);
    t.reset();
    expect(t.isComplete()).toBe(false);
    expect(t.slotFilledBy('source')).toBeNull();
    expect(t.slotFilledBy('voltmeter')).toBeNull();
    expect(t.validate().ok).toBe(false);
  });
});
