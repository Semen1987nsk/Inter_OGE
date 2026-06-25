import { describe, it, expect } from 'vitest';
import { resumeTarget } from '../resume';
import { KITS } from '../../data/kits';

describe('resumeTarget', () => {
  it('нет прогресса → Комплект 1, isFresh', () => {
    const r = resumeTarget(KITS, {});
    expect(r.kitNum).toBe(1);
    expect(r.isFresh).toBe(true);
  });
  it('начат кит 2 (2 из 7) → продолжить кит 2, осталось 5', () => {
    const r = resumeTarget(KITS, { 2: 2 });
    expect(r.kitNum).toBe(2);
    expect(r.remaining).toBe(5);
    expect(r.isFresh).toBe(false);
  });
});
