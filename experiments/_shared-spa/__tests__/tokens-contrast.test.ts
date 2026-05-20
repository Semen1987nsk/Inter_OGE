import { describe, it, expect } from 'vitest';
import { hslToHex, contrastRatio } from './utils/contrast';

// HSL values mirror tokens-colors.css. If they drift — update both together.
const GRAY_100 = hslToHex(213, 27, 88);
const GRAY_200 = hslToHex(213, 23, 76);
const GRAY_300 = hslToHex(213, 19, 60);
const GRAY_600 = hslToHex(213, 21, 24);
const GRAY_700 = hslToHex(213, 27, 19);
const GRAY_800 = hslToHex(213, 39, 11);
const GRAY_900 = hslToHex(213, 47, 6);

const BLUE_300 = hslToHex(217, 100, 70);
const BLUE_500 = hslToHex(217, 100, 62);

const ORANGE_200 = hslToHex(44, 100, 76);
const ORANGE_500 = hslToHex(44, 100, 53);

const GREEN_500 = hslToHex(160, 84, 39);
const RED_500 = hslToHex(0, 84, 60);
const AMBER_500 = hslToHex(38, 92, 50);

describe('WCAG AA contrast — critical token pairs', () => {
  it.each([
    // Normal text — 4.5:1 minimum (WCAG AA)
    ['text-primary on bg-deep',         GRAY_100,   GRAY_800, 4.5],
    ['text-primary on bg-surface',      GRAY_100,   GRAY_700, 4.5],
    ['text-primary on bg-surface-hover',GRAY_100,   GRAY_600, 4.5],
    ['text-secondary on bg-deep',       GRAY_200,   GRAY_800, 4.5],
    ['text-secondary on bg-surface',    GRAY_200,   GRAY_700, 4.5],
    ['text-muted on bg-deep',           GRAY_300,   GRAY_800, 4.5],
    ['text-muted on bg-surface',        GRAY_300,   GRAY_700, 4.5],
    // Large text — 3:1 minimum (WCAG AA)
    ['brand-blue-500 on bg-deep',       BLUE_500,   GRAY_800, 3.0],
    ['brand-blue-500 on bg-surface',    BLUE_500,   GRAY_700, 3.0],
    ['brand-blue-300 on bg-deep',       BLUE_300,   GRAY_800, 3.0],
    ['orange-500 on bg-deep',           ORANGE_500, GRAY_800, 3.0],
    ['orange-200 on bg-deep',           ORANGE_200, GRAY_800, 3.0],
    ['green-500 on bg-deep',            GREEN_500,  GRAY_800, 3.0],
    ['red-500 on bg-deep',              RED_500,    GRAY_800, 3.0],
    ['amber-500 on bg-deep',            AMBER_500,  GRAY_800, 3.0],
  ])('%s — contrast >= %s', (_label, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

// Silence "unused" tooling for constants declared above but reserved for
// future pairs (GRAY_900). Keeping them documents the full scale.
void GRAY_900;
