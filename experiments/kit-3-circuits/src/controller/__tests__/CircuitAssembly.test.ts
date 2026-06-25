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
});
