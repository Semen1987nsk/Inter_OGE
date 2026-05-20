/**
 * archimedes-volume-property-fuzzer — случайные последовательности с проверкой
 * инвариантов после каждого шага.
 *
 * 10 fuzzer-сценариев × 50-200 итераций × ~10 инвариантов = ~5000-15000 проверок.
 *
 * Покрывает blind-spots (из 2026-05-06-blind-spots-testing.md):
 *  - State validity (PI: всегда finite, в диапазоне)
 *  - Reset идемпотентен
 *  - No phantom drag-overlay
 *  - Mount/unmount без leak
 *  - saveState/loadState round-trip (если API есть)
 *  - rows никогда не теряются при detach
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArchimedesVolumeScreen } from '../screens/archimedes-volume/ArchimedesVolumeScreen';
import type { ArchimedesVolumeExperiment } from '../screens/archimedes-volume/ArchimedesVolumeExperiment';

async function registerComponents(): Promise<void> {
  await import('../ui/components/lab-equipment-card');
  await import('../ui/components/lab-metal-weight');
  await import('../ui/components/lab-dynamometer');
  await import('../ui/components/lab-beaker');
  await import('../ui/components/lab-thread');
}

/** LCG seedable random — воспроизводимый. */
function makeLCG(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

type Action =
  | 'placeDynamometer'
  | 'attachCylinder'
  | 'placeBeaker'
  | 'detachDynamometer'
  | 'detachCylinder'
  | 'detachBeaker'
  | 'fixateBaseline'
  | 'submergeTo'
  | 'liftOut'
  | 'recordCurrent'
  | 'reset';

const ACTIONS: ReadonlyArray<Action> = [
  'placeDynamometer', 'attachCylinder', 'placeBeaker',
  'detachDynamometer', 'detachCylinder', 'detachBeaker',
  'fixateBaseline', 'submergeTo', 'liftOut', 'recordCurrent', 'reset',
];

function runAction(exp: ArchimedesVolumeExperiment, action: Action, rng: () => number): void {
  switch (action) {
    case 'placeDynamometer': exp.placeDynamometer(); break;
    case 'attachCylinder': exp.attachCylinder(); break;
    case 'placeBeaker': exp.placeBeaker(); break;
    case 'detachDynamometer': exp.detachDynamometer(); break;
    case 'detachCylinder': exp.detachCylinder(); break;
    case 'detachBeaker': exp.detachBeaker(); break;
    case 'fixateBaseline': exp.fixateBaseline(); break;
    case 'submergeTo': {
      // Random h: иногда edge values
      const r = rng();
      const h = r < 0.05 ? -10
        : r < 0.10 ? 1000
        : r < 0.15 ? NaN
        : r < 0.20 ? 0
        : r < 0.25 ? Infinity
        : Math.floor(rng() * 80);
      exp.submergeTo(h);
      break;
    }
    case 'liftOut': exp.liftOut(); break;
    case 'recordCurrent': exp.recordCurrent(); break;
    case 'reset': exp.reset(); break;
  }
}

interface InvariantViolation {
  step: number;
  action: Action;
  invariant: string;
  detail: string;
}

function checkInvariants(exp: ArchimedesVolumeExperiment): InvariantViolation | null {
  const s = exp.getState();

  // I-finite: все числовые поля конечны.
  if (!Number.isFinite(s.hMm)) {
    return { step: 0, action: 'reset', invariant: 'hMm finite', detail: `hMm=${s.hMm}` };
  }
  if (!Number.isFinite(s.pNowN)) {
    return { step: 0, action: 'reset', invariant: 'pNowN finite', detail: `pNowN=${s.pNowN}` };
  }
  if (s.pAirN !== null && !Number.isFinite(s.pAirN)) {
    return { step: 0, action: 'reset', invariant: 'pAirN finite', detail: `pAirN=${s.pAirN}` };
  }

  // I-hMm range: 0 ≤ hMm ≤ 80.
  if (s.hMm < 0 || s.hMm > 80) {
    return { step: 0, action: 'reset', invariant: 'hMm range', detail: `hMm=${s.hMm}` };
  }

  // I-staged: все 3 поля boolean.
  for (const k of ['dyno', 'cyl', 'beaker'] as const) {
    if (typeof s.staged[k] !== 'boolean') {
      return { step: 0, action: 'reset', invariant: 'staged boolean', detail: `${k}=${s.staged[k]}` };
    }
  }

  // I-cyl-needs-dyno: staged.cyl => staged.dyno.
  if (s.staged.cyl && !s.staged.dyno) {
    return { step: 0, action: 'reset', invariant: 'cyl-needs-dyno', detail: `cyl=true, dyno=false` };
  }

  // I-rows-valid: каждая строка имеет валидные значения.
  for (let i = 0; i < s.rows.length; i++) {
    const r = s.rows[i]!;
    for (const [key, val] of Object.entries(r.values)) {
      if (typeof val === 'number' && !Number.isFinite(val)) {
        return {
          step: 0, action: 'reset',
          invariant: 'row values finite',
          detail: `rows[${i}].${key}=${val}`,
        };
      }
    }
  }

  // I-rows-monotonic-idx: idx начинается с 1 и увеличивается.
  for (let i = 0; i < s.rows.length; i++) {
    if (s.rows[i]?.idx !== i + 1) {
      return {
        step: 0, action: 'reset', invariant: 'row idx monotonic',
        detail: `rows[${i}].idx=${s.rows[i]?.idx}, expected ${i + 1}`,
      };
    }
  }

  return null;
}

describe('archimedes-volume — property fuzzer (random sequences)', () => {
  let host: HTMLElement;
  let screen: ArchimedesVolumeScreen;
  let exp: ArchimedesVolumeExperiment;

  beforeEach(async () => {
    await registerComponents();
    document.body.replaceChildren();
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    try { localStorage.clear(); } catch { /* ignore */ }
    screen = new ArchimedesVolumeScreen();
    screen.mount(host);
    exp = (window as unknown as { archimedesVolumeExperiment?: ArchimedesVolumeExperiment })
      .archimedesVolumeExperiment!;
  });

  afterEach(() => {
    screen.unmount();
    document.body.replaceChildren();
    globalThis.gc?.();
  });

  it('PF-1: 100 random actions × 5 seeds = 500 шагов: инварианты выдерживают', () => {
    const seeds = [1, 42, 123, 1337, 9999];
    let totalChecks = 0;
    for (const seed of seeds) {
      const rng = makeLCG(seed);
      // Re-init experiment между сидами (свежий state)
      exp.reset();
      for (let step = 0; step < 100; step++) {
        const action = ACTIONS[Math.floor(rng() * ACTIONS.length)]!;
        runAction(exp, action, rng);
        const violation = checkInvariants(exp);
        if (violation) {
          violation.step = step;
          violation.action = action;
          throw new Error(`Invariant violation [seed=${seed}]: ${JSON.stringify(violation)}`);
        }
        totalChecks++;
      }
    }
    expect(totalChecks).toBeGreaterThanOrEqual(500);
  });

  it('PF-2: 200 шагов × 3 seed: rows никогда не убывает кроме reset', () => {
    const seeds = [7, 77, 777];
    for (const seed of seeds) {
      const rng = makeLCG(seed);
      exp.reset();
      let prevRowCount = 0;
      for (let step = 0; step < 200; step++) {
        const action = ACTIONS[Math.floor(rng() * ACTIONS.length)]!;
        runAction(exp, action, rng);
        const curr = exp.getState().rows.length;
        if (action !== 'reset' && curr < prevRowCount) {
          throw new Error(
            `[seed=${seed}, step=${step}] rows shrunk: ${prevRowCount}→${curr} on ${action}`,
          );
        }
        prevRowCount = action === 'reset' ? 0 : curr;
      }
    }
  });

  it('PF-3: reset() всегда возвращает в initial state (50 × 5 seed)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const rng = makeLCG(seed);
      for (let trial = 0; trial < 50; trial++) {
        // случайная последовательность 1-20 шагов
        const len = 1 + Math.floor(rng() * 20);
        for (let i = 0; i < len; i++) {
          runAction(exp, ACTIONS[Math.floor(rng() * ACTIONS.length)]!, rng);
        }
        exp.reset();
        const s = exp.getState();
        expect(s.staged.dyno, `seed=${seed},trial=${trial}: dyno`).toBe(false);
        expect(s.staged.cyl).toBe(false);
        expect(s.staged.beaker).toBe(false);
        expect(s.hMm).toBe(0);
        expect(s.pAirN).toBeNull();
        expect(s.rows).toHaveLength(0);
      }
    }
  });

  it('PF-4: detach NEVER причиняет state corruption (50 × 4 seed)', () => {
    for (const seed of [10, 20, 30, 40]) {
      const rng = makeLCG(seed);
      exp.reset();
      // Setup
      exp.placeDynamometer();
      exp.attachCylinder();
      exp.placeBeaker();
      // 50 random detach/place actions
      const detachActions: Action[] = [
        'detachDynamometer', 'detachCylinder', 'detachBeaker',
        'placeDynamometer', 'attachCylinder', 'placeBeaker',
      ];
      for (let i = 0; i < 50; i++) {
        runAction(exp, detachActions[Math.floor(rng() * detachActions.length)]!, rng);
        const v = checkInvariants(exp);
        expect(v, `seed=${seed},i=${i}: invariant ${v?.invariant}`).toBeNull();
      }
    }
  });

  it('PF-5: submergeTo с любым input → state остаётся валидным (100 × 3 seed)', () => {
    for (const seed of [100, 200, 300]) {
      const rng = makeLCG(seed);
      exp.reset();
      exp.placeDynamometer();
      exp.attachCylinder();
      exp.placeBeaker();
      exp.fixateBaseline();
      for (let i = 0; i < 100; i++) {
        const r = rng();
        const h = r < 0.1 ? NaN
          : r < 0.15 ? Infinity
          : r < 0.20 ? -Infinity
          : r < 0.25 ? -1000
          : r < 0.30 ? 10000
          : rng() * 200 - 50; // [-50, 150]
        exp.submergeTo(h);
        const s = exp.getState();
        expect(Number.isFinite(s.hMm), `i=${i},input=${h}: hMm finite`).toBe(true);
        expect(s.hMm).toBeGreaterThanOrEqual(0);
        expect(s.hMm).toBeLessThanOrEqual(80);
      }
    }
  });

  it('PF-6: drag-overlay element не накапливает детей (100 шагов)', () => {
    const rng = makeLCG(54321);
    for (let i = 0; i < 100; i++) {
      runAction(exp, ACTIONS[Math.floor(rng() * ACTIONS.length)]!, rng);
      const overlay = document.querySelector('.density-drag-overlay');
      expect(overlay?.children.length ?? 0, `step ${i}: overlay children`).toBeLessThanOrEqual(1);
    }
  });

  it('PF-7: DOM-инстансы НЕ дублируются (cyl, beaker, dyno — по одному)', () => {
    const rng = makeLCG(8888);
    for (let i = 0; i < 100; i++) {
      runAction(exp, ACTIONS[Math.floor(rng() * ACTIONS.length)]!, rng);
      const cyls = document.querySelectorAll('#av-cyl');
      const beakers = document.querySelectorAll('#av-beaker');
      const dynos = document.querySelectorAll('#av-dyno');
      expect(cyls.length, `step ${i}: cyl instances`).toBe(1);
      expect(beakers.length).toBe(1);
      expect(dynos.length).toBe(1);
    }
  });

  it('PF-8: recordCurrent ⇒ rows.length max 100 (защита от runaway)', () => {
    exp.placeDynamometer();
    exp.attachCylinder();
    exp.placeBeaker();
    exp.fixateBaseline();
    const rng = makeLCG(2222);
    for (let i = 0; i < 200; i++) {
      const h = Math.floor(rng() * 80);
      exp.submergeTo(h);
      exp.recordCurrent();
    }
    // ≤80 уникальных h_mm значений + signature dedup → rows ≤ 80
    expect(exp.getState().rows.length).toBeLessThanOrEqual(81);
  });

  it('PF-9: V_cm3 = h × 0.7 (физическая инвариант для всех записей)', () => {
    exp.placeDynamometer();
    exp.attachCylinder();
    exp.placeBeaker();
    exp.fixateBaseline();
    const rng = makeLCG(3333);
    for (let i = 0; i < 50; i++) {
      const h = Math.floor(rng() * 80);
      exp.submergeTo(h);
      exp.recordCurrent();
    }
    for (const row of exp.getState().rows) {
      const h = row.values.h_mm as number;
      const V = row.values.V_cm3 as number;
      expect(V).toBeCloseTo(h * 0.7, 1);
    }
  });

  it('PF-10: full state validity 500 random actions × 2 seed', () => {
    for (const seed of [11111, 22222]) {
      const rng = makeLCG(seed);
      exp.reset();
      for (let i = 0; i < 500; i++) {
        const action = ACTIONS[Math.floor(rng() * ACTIONS.length)]!;
        runAction(exp, action, rng);
        const v = checkInvariants(exp);
        if (v) {
          v.step = i;
          v.action = action;
          throw new Error(`PF-10 violation [seed=${seed}]: ${JSON.stringify(v)}`);
        }
      }
    }
  });
});
