/**
 * Unit-тесты на shared infrastructure §21:
 *   - format.ts — formatRu / parseRu round-trip, edge cases
 *   - verify.ts — verifyDerivedValue (ok/close/wrong/empty) и verifyRow
 *   - specs.ts  — все 4 spec'а валидны + expected-функции в физических диапазонах
 *
 * Тесты живут в kit-1-hydrostatics, потому что _shared-spa не имеет
 * собственной vitest-конфигурации. Любой kit, импортирующий @shared/*,
 * прогоняет их.
 */

import { describe, expect, it } from 'vitest';
import { formatRu, parseRu } from '@shared/lib/journal/format';
import {
  rowVerdictAggregate,
  verifyDerivedValue,
  verifyRow,
} from '@shared/lib/journal/verify';
import {
  ALL_SPECS,
  ARCHIMEDES_SPEC,
  DENSITY_SPEC,
  FRICTION_SPEC,
  SPRING_SPEC,
  getSpecByExperimentId,
} from '@shared/lib/journal/specs';
import type {
  ColumnSource,
  JournalRow,
} from '@shared/lib/journal/types';

// ═══════════════════════════════════════════════════════════════════
// format.ts
// ═══════════════════════════════════════════════════════════════════

describe('format — formatRu', () => {
  it('null/undefined/NaN/Inf → "—"', () => {
    expect(formatRu(null)).toBe('—');
    expect(formatRu(undefined as unknown as null)).toBe('—');
    expect(formatRu(Number.NaN)).toBe('—');
    expect(formatRu(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('строка возвращается как есть (без замены точки на запятую)', () => {
    expect(formatRu('Цилиндр № 3')).toBe('Цилиндр № 3');
  });

  it('запятая вместо точки во всех числовых форматах', () => {
    expect(formatRu(1.5, 'fixed1')).toBe('1,5');
    expect(formatRu(0.65, 'fixed2')).toBe('0,65');
    expect(formatRu(0.123, 'fixed3')).toBe('0,123');
  });

  it('int округляет к ближайшему целому', () => {
    expect(formatRu(99.6, 'int')).toBe('100');
    expect(formatRu(99.4, 'int')).toBe('99');
    expect(formatRu(-0.4, 'int')).toBe('0');
  });

  it('percent добавляет знак %', () => {
    expect(formatRu(0.21, 'percent')).toBe('0,2%');
    expect(formatRu(-5.5, 'percent')).toBe('-5,5%');
  });
});

describe('format — parseRu', () => {
  it('null/undefined/пустая строка → null', () => {
    expect(parseRu(null)).toBe(null);
    expect(parseRu(undefined)).toBe(null);
    expect(parseRu('')).toBe(null);
    expect(parseRu('   ')).toBe(null);
    expect(parseRu('—')).toBe(null);
  });

  it('запятая → точка для парсинга', () => {
    expect(parseRu('1,5')).toBe(1.5);
    expect(parseRu('0,65')).toBe(0.65);
  });

  it('точка тоже работает (international)', () => {
    expect(parseRu('1.5')).toBe(1.5);
  });

  it('нечисловые → null', () => {
    expect(parseRu('abc')).toBe(null);
    expect(parseRu('1,2,3')).toBe(null);
  });

  it('пробелы внутри игнорируются', () => {
    expect(parseRu('1 234,5')).toBe(1234.5);
  });

  it('round-trip formatRu → parseRu сохраняет значение', () => {
    for (const v of [0, 1, -1, 0.5, -0.5, 100.123, -99.99]) {
      expect(parseRu(formatRu(v, 'fixed3'))).toBeCloseTo(v, 3);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// verify.ts
// ═══════════════════════════════════════════════════════════════════

describe('verify — verifyDerivedValue', () => {
  const VCol = DENSITY_SPEC.columns.find((c) => c.key === 'V_cm3')!; // tolerance 0.10
  const RhoCol = DENSITY_SPEC.columns.find((c) => c.key === 'rho_kg_m3')!;

  function row(values: Record<string, number>): JournalRow {
    return { idx: 1, timestamp: Date.now(), values: { ...values } };
  }

  it('null / NaN / Inf → empty', () => {
    expect(verifyDerivedValue(VCol, row({ V1_ml: 100, V2_ml: 125 }), null)).toBe('empty');
    expect(verifyDerivedValue(VCol, row({ V1_ml: 100, V2_ml: 125 }), Number.NaN)).toBe('empty');
  });

  it('точное значение → ok', () => {
    // V_expected = 25, ввели 25 → 0% ошибки
    expect(verifyDerivedValue(VCol, row({ V1_ml: 100, V2_ml: 125 }), 25)).toBe('ok');
  });

  it('лёгкое отклонение в пределах ok-радиуса (≤2% при tolerance 0.10 → ≤4%)', () => {
    // tolerance=0.10, ok = ≤0.04. expected=25, value=25.5 → 2% → ok
    expect(verifyDerivedValue(VCol, row({ V1_ml: 100, V2_ml: 125 }), 25.5)).toBe('ok');
  });

  it('умеренное отклонение → close', () => {
    // expected=25, value=27 → 8% (между 4% и 10%) → close
    expect(verifyDerivedValue(VCol, row({ V1_ml: 100, V2_ml: 125 }), 27)).toBe('close');
  });

  it('грубое отклонение → wrong', () => {
    // expected=25, value=50 → 100% → wrong
    expect(verifyDerivedValue(VCol, row({ V1_ml: 100, V2_ml: 125 }), 50)).toBe('wrong');
  });

  it('expected ≈ 0 (V₁=V₂) → проверка по абс. погрешности', () => {
    // V1=V2=100, expected=0; малое value считается ok
    expect(verifyDerivedValue(VCol, row({ V1_ml: 100, V2_ml: 100 }), 0)).toBe('ok');
    expect(verifyDerivedValue(VCol, row({ V1_ml: 100, V2_ml: 100 }), 1)).toBe('wrong');
  });

  it('source=meta → wrong (нельзя проверять meta-колонку как derived)', () => {
    const idxCol = DENSITY_SPEC.columns.find((c) => c.key === 'idx')!;
    expect(verifyDerivedValue(idxCol, row({}), 1)).toBe('wrong');
  });

  it('rho для стали (m=195, V=25) → 7800 кг/м³, ввод 7800 → ok', () => {
    expect(
      verifyDerivedValue(
        RhoCol,
        row({ m_g: 195, V1_ml: 100, V2_ml: 125 }),
        7800,
      ),
    ).toBe('ok');
  });
});

describe('verify — verifyRow + rowVerdictAggregate', () => {
  it('пустой row → все verdicts empty + aggregate empty', () => {
    const row: JournalRow = {
      idx: 1,
      timestamp: 1,
      values: { m_g: 195, V1_ml: 100, V2_ml: 125 },
    };
    const v = verifyRow(DENSITY_SPEC.columns, row);
    expect(v).toEqual({ V_cm3: 'empty', rho_kg_m3: 'empty' });
    expect(rowVerdictAggregate(v)).toBe('empty');
  });

  it('все derived ok → aggregate ok', () => {
    const row: JournalRow = {
      idx: 1,
      timestamp: 1,
      values: { m_g: 195, V1_ml: 100, V2_ml: 125, V_cm3: 25, rho_kg_m3: 7800 },
    };
    const v = verifyRow(DENSITY_SPEC.columns, row);
    expect(rowVerdictAggregate(v)).toBe('ok');
  });

  it('хотя бы один wrong → aggregate wrong', () => {
    const row: JournalRow = {
      idx: 1,
      timestamp: 1,
      values: { m_g: 195, V1_ml: 100, V2_ml: 125, V_cm3: 25, rho_kg_m3: 1000 },
    };
    const v = verifyRow(DENSITY_SPEC.columns, row);
    expect(rowVerdictAggregate(v)).toBe('wrong');
  });
});

// ═══════════════════════════════════════════════════════════════════
// specs.ts
// ═══════════════════════════════════════════════════════════════════

describe('specs — структурная валидация', () => {
  it.each(ALL_SPECS)('$experimentId: ключи колонок уникальны', (spec) => {
    const keys = spec.columns.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(ALL_SPECS)('$experimentId: derived-колонки имеют expectedFromRow', (spec) => {
    for (const c of spec.columns) {
      if (c.source === 'derived') {
        expect(typeof c.expectedFromRow).toBe('function');
      }
    }
  });

  it.each(ALL_SPECS)('$experimentId: первая колонка — idx (meta)', (spec) => {
    expect(spec.columns[0]?.key).toBe('idx');
    expect(spec.columns[0]?.source).toBe<ColumnSource>('meta');
  });

  it('getSpecByExperimentId возвращает корректный spec', () => {
    expect(getSpecByExperimentId('1.1')).toBe(DENSITY_SPEC);
    expect(getSpecByExperimentId('1.2')).toBe(ARCHIMEDES_SPEC);
    expect(getSpecByExperimentId('2.1')).toBe(SPRING_SPEC);
    expect(getSpecByExperimentId('2.2')).toBe(FRICTION_SPEC);
    expect(getSpecByExperimentId('9.9')).toBe(null);
  });
});

describe('specs — физическая корректность expectedFromRow', () => {
  it('1.1 Density: сталь №1 (m=195, V=25 см³) → ρ=7800 кг/м³', () => {
    const rho = DENSITY_SPEC.columns
      .find((c) => c.key === 'rho_kg_m3')!
      .expectedFromRow!({ m_g: 195, V1_ml: 100, V2_ml: 125 });
    expect(rho).toBeCloseTo(7800, 0);
  });

  it('1.2 Архимед: цилиндр №3 (V=56 см³) → F_A_теор=0.549 Н', () => {
    const F = ARCHIMEDES_SPEC.columns
      .find((c) => c.key === 'F_A_theor_N')!
      .expectedFromRow!({ V_cm3: 56 });
    expect(F).toBeCloseTo(0.5488, 3);
  });

  it('1.2 Архимед: F_A_изм = P_возд − P_жид', () => {
    const F = ARCHIMEDES_SPEC.columns
      .find((c) => c.key === 'F_A_meas_N')!
      .expectedFromRow!({ P_air_N: 0.65, P_liq_N: 0.10 });
    expect(F).toBeCloseTo(0.55, 2);
  });

  it('2.1 Spring: m=100 г, ΔL=20 мм → k = 49 Н/м', () => {
    const k = SPRING_SPEC.columns
      .find((c) => c.key === 'k_N_m')!
      .expectedFromRow!({ m_g: 100, l0_mm: 50, l1_mm: 70 });
    expect(k).toBeCloseTo(49, 1);
  });

  it('2.2 Friction: m=200 г, F_тр=0.5 Н → μ ≈ 0.255', () => {
    const mu = FRICTION_SPEC.columns
      .find((c) => c.key === 'mu')!
      .expectedFromRow!({ m_g: 200, F_friction_N: 0.5 });
    expect(mu).toBeCloseTo(0.255, 2);
  });

  it('division by zero: V=0 в Density → ρ = 0', () => {
    const rho = DENSITY_SPEC.columns
      .find((c) => c.key === 'rho_kg_m3')!
      .expectedFromRow!({ m_g: 195, V1_ml: 100, V2_ml: 100 });
    expect(rho).toBe(0);
  });

  it('division by zero: ΔL=0 в Spring → k = 0', () => {
    const k = SPRING_SPEC.columns
      .find((c) => c.key === 'k_N_m')!
      .expectedFromRow!({ m_g: 100, l0_mm: 50, l1_mm: 50 });
    expect(k).toBe(0);
  });
});
