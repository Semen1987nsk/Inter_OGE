import { describe, it, expect } from 'vitest';
import { hslToHex, relativeLuminance, contrastRatio } from './contrast';

describe('hslToHex', () => {
  it('converts pure white', () => {
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
  });
  it('converts pure black', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
  });
  it('converts brand blue hsl(217, 100%, 62%) to ~#3a86ff', () => {
    // hsl(217, 100%, 62%) rounds to #3d87ff (135.49 → 0x87).
    // Note: 0.5 below would round to #3d86ff (134.985 → 0x87 still via Math.round).
    // The brand colour #3a86ff lives near hsl(217, 100%, 61%); 62% chosen by spec.
    expect(hslToHex(217, 100, 62)).toBe('#3d87ff');
  });
});

describe('contrastRatio', () => {
  it('white on black = 21:1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });
  it('black on white = 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('same colors = 1:1', () => {
    expect(contrastRatio('#888888', '#888888')).toBeCloseTo(1, 0);
  });
});

describe('relativeLuminance', () => {
  it('white = 1', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 3);
  });
  it('black = 0', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 3);
  });
});
