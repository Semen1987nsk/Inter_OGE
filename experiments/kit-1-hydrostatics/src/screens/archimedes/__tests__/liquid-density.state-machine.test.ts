/**
 * Опыт 1.4 «F_арх(ρ жидкости)» — state-machine (happy-dom).
 *
 * Проверяем: переключение режима жидкости; salt-portions → ρ ступенями;
 * F_арх растёт с ρ; #currentSpec переключается на ARCHIMEDES_LIQUID_SPEC;
 * журнал в 'solution' рендерит колонки ρ/F_теор; график получает ≥2 точки.
 * Режим 'water' (опыт 1.2) не сломан.
 *
 * Стек: happy-dom + Vitest + customElements (через side-effect импорты).
 * Управляем через программный API оркестратора (не эмулируем PointerEvent —
 * drag проверяется в e2e). gc() в afterEach против OOM (см. CLAUDE.md).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArchimedesScreen } from '../ArchimedesScreen';
import type { ArchimedesExperiment } from '../ArchimedesExperiment';
import {
  WATER_RHO_KG_M3,
  liquidRhoFromSaltPortions,
} from '../../../physics/archimedes/tables';

async function registerComponents(): Promise<void> {
  await import('../../../ui/components/lab-equipment-card');
  await import('../../../ui/components/lab-metal-weight');
  await import('../../../ui/components/lab-dynamometer');
  await import('../../../ui/components/lab-beaker');
  await import('../../../ui/components/lab-thread');
  await import('../../../ui/components/lab-journal');
  await import('../../../ui/components/lab-salt-set');
  await import('../../../ui/components/lab-graph');
}

/** Доступ к публичным методам 1.4, отсутствующим в типе через узкий интерфейс. */
type ExpInternals = ArchimedesExperiment & {
  setLiquidMode(mode: 'water' | 'solution'): void;
  addSaltPortion(): void;
};

/** Узкий снимок state для ассертов (getFullState возвращает полный Readonly<State>). */
function fs(exp: ExpInternals): {
  liquidMode: 'water' | 'solution';
  saltPortions: number;
  liquidRhoKgM3: number;
  forceTargetN: number;
  inWater: boolean;
} {
  return (exp as ArchimedesExperiment).getFullState() as unknown as {
    liquidMode: 'water' | 'solution';
    saltPortions: number;
    liquidRhoKgM3: number;
    forceTargetN: number;
    inWater: boolean;
  };
}

/** Налить воду + погрузить цилиндр + записать P_возд и P_жид → полная строка. */
function fullCycle(exp: ExpInternals, cylId: 2 | 3 | 4): void {
  exp.attachCylinderById(cylId);
  exp.recordCurrentReading(); // P_возд
  exp.dipCylinderInWater();
  exp.recordCurrentReading(); // P_жид → F_A
  exp.liftCylinderFromWater();
  exp.detachCylinder();
}

describe('Опыт 1.4 — режим раствора, salt-flow, F_арх(ρ), журнал, график', () => {
  let host: HTMLElement;
  let screen: ArchimedesScreen;
  let exp: ExpInternals;

  beforeEach(async () => {
    await registerComponents();
    if (typeof localStorage !== 'undefined') localStorage.clear();
    document.body.replaceChildren();
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    screen = new ArchimedesScreen();
    screen.mount(host);
    exp = (window as unknown as { archimedesExperiment: ExpInternals }).archimedesExperiment;
  });

  afterEach(() => {
    screen.unmount();
    document.body.replaceChildren();
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof globalThis.gc === 'function') globalThis.gc();
  });

  // ─── Регресс 1.2: режим 'water' по умолчанию ──────────────────────────

  it('по умолчанию режим = water (опыт 1.2), группа реактивов скрыта, график скрыт', () => {
    expect(fs(exp).liquidMode).toBe('water');
    expect(fs(exp).liquidRhoKgM3).toBe(WATER_RHO_KG_M3);
    expect(host.querySelector<HTMLElement>('#ar-reagents-group')!.hidden).toBe(true);
    expect(host.querySelector<HTMLElement>('#ar-graph-wrap')!.hidden).toBe(true);
  });

  it('режим water: соль недоступна (addSaltPortion = no-op, ρ остаётся водой)', () => {
    exp.placeDynamometer(1);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.addSaltPortion();
    expect(fs(exp).saltPortions).toBe(0);
    expect(fs(exp).liquidRhoKgM3).toBe(WATER_RHO_KG_M3);
  });

  it('режим water: полный happy-path 1.2 пишет строку с колонкой «Цилиндр»', () => {
    exp.placeDynamometer(1);
    exp.placeBeaker();
    exp.pourWater(200);
    fullCycle(exp, 3);
    const rows = exp.getJournalRows();
    expect(rows.length).toBe(1);
    expect(rows[0]!.context.liquid).toBe('water');
    // Журнал-таблица содержит заголовок «Цилиндр», нет «ρ».
    const headers = Array.from(
      host.querySelectorAll('#ar-journal-host thead th'),
    ).map((th) => th.textContent ?? '');
    expect(headers.some((h) => h.includes('Цилиндр'))).toBe(true);
    expect(headers.some((h) => h.includes('ρ'))).toBe(false);
  });

  // ─── Переключение режима ──────────────────────────────────────────────

  it('switch water → solution: режим, группа реактивов видна, журнал очищен', () => {
    exp.placeDynamometer(1);
    exp.placeBeaker();
    exp.pourWater(200);
    fullCycle(exp, 3);
    expect(exp.getJournalRows().length).toBe(1);

    exp.setLiquidMode('solution');
    expect(fs(exp).liquidMode).toBe('solution');
    expect(host.querySelector<HTMLElement>('#ar-reagents-group')!.hidden).toBe(false);
    // Журнал 1.2 несовместим по колонкам с 1.4 → очищается.
    expect(exp.getJournalRows().length).toBe(0);
  });

  it('switch обратно solution → water сбрасывает соль и ρ', () => {
    exp.setLiquidMode('solution');
    exp.placeDynamometer(1);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.addSaltPortion();
    expect(fs(exp).liquidRhoKgM3).toBe(1070);
    exp.setLiquidMode('water');
    expect(fs(exp).saltPortions).toBe(0);
    expect(fs(exp).liquidRhoKgM3).toBe(WATER_RHO_KG_M3);
  });

  // ─── Salt-flow → ρ ступенями ──────────────────────────────────────────

  it('solution: соль → ρ растёт ступенями 1000→1070→1140→1200 (cap)', () => {
    exp.setLiquidMode('solution');
    exp.placeBeaker();
    exp.pourWater(200);
    expect(fs(exp).liquidRhoKgM3).toBe(1000);
    exp.addSaltPortion();
    expect(fs(exp).liquidRhoKgM3).toBe(1070);
    exp.addSaltPortion();
    expect(fs(exp).liquidRhoKgM3).toBe(1140);
    exp.addSaltPortion();
    expect(fs(exp).liquidRhoKgM3).toBe(1200);
    // Насыщение — соль больше не растворяется, ρ держится.
    exp.addSaltPortion();
    expect(fs(exp).liquidRhoKgM3).toBe(1200);
    expect(fs(exp).saltPortions).toBe(3);
  });

  it('solution: соль без воды = no-op + банер «налейте воду»', () => {
    exp.setLiquidMode('solution');
    exp.placeBeaker();
    exp.addSaltPortion();
    expect(fs(exp).saltPortions).toBe(0);
    expect(exp.getBannerText()).toMatch(/воду/i);
  });

  // ─── F_арх растёт с ρ ─────────────────────────────────────────────────

  it('solution: при погружении F_арх растёт с ρ (больше соли → меньше P_жид)', () => {
    exp.setLiquidMode('solution');
    exp.placeDynamometer(5);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.attachCylinderById(3);
    const P_air = fs(exp).forceTargetN;

    // Погружение в чистую воду (ρ=1000).
    exp.dipCylinderInWater();
    const P_water = fs(exp).forceTargetN;
    const F_A_water = P_air - P_water;

    // Добавляем соль (ρ растёт) — F_арх пересчитывается сразу.
    exp.addSaltPortion(); // 1070
    const P_s1 = fs(exp).forceTargetN;
    const F_A_s1 = P_air - P_s1;

    exp.addSaltPortion(); // 1140
    const P_s2 = fs(exp).forceTargetN;
    const F_A_s2 = P_air - P_s2;

    expect(F_A_s1).toBeGreaterThan(F_A_water);
    expect(F_A_s2).toBeGreaterThan(F_A_s1);
    // P_жид падает по мере роста ρ.
    expect(P_s1).toBeLessThan(P_water);
    expect(P_s2).toBeLessThan(P_s1);
  });

  it('solution: F_арх ≈ ρ·g·V — пропорция выдержана (цилиндр №2, V=25 см³)', () => {
    exp.setLiquidMode('solution');
    exp.placeDynamometer(5);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.attachCylinderById(2);
    const P_air = fs(exp).forceTargetN;
    exp.dipCylinderInWater();
    const F_A_1000 = P_air - fs(exp).forceTargetN;
    // Эталон: F_арх = 1000·9.8·25e-6 = 0.245 Н (с учётом округления шкалы 0.1).
    expect(F_A_1000).toBeGreaterThan(0.15);
    expect(F_A_1000).toBeLessThan(0.35);
  });

  // ─── Журнал per-task SPEC ─────────────────────────────────────────────

  it('solution: журнал рендерит колонки «ρ» и «F_A теор», без «Цилиндр»', () => {
    exp.setLiquidMode('solution');
    exp.placeDynamometer(5);
    exp.placeBeaker();
    exp.pourWater(200);
    fullCycle(exp, 3);

    const rows = exp.getJournalRows();
    expect(rows.length).toBe(1);
    expect(rows[0]!.context.liquid).toBe('solution');
    expect(rows[0]!.context.rho_kg_m3).toBe(1000);

    const headers = Array.from(
      host.querySelectorAll('#ar-journal-host thead th'),
    ).map((th) => th.textContent ?? '');
    expect(headers.some((h) => h.includes('ρ'))).toBe(true);
    expect(headers.some((h) => h.includes('теор'))).toBe(true);
    expect(headers.some((h) => h.includes('Цилиндр'))).toBe(false);
  });

  it('solution: несколько ρ → несколько строк (2 точки)', () => {
    exp.setLiquidMode('solution');
    exp.placeDynamometer(5);
    exp.placeBeaker();
    exp.pourWater(200);

    // Точка 1: чистая вода (ρ=1000).
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.liftCylinderFromWater();

    // Соль → ρ=1070, новая точка.
    exp.addSaltPortion();
    exp.detachCylinder();
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();

    const solutionRows = exp
      .getJournalRows()
      .filter((r) => r.context.liquid === 'solution' && r.P_air_N !== null && r.P_liquid_N !== null);
    expect(solutionRows.length).toBeGreaterThanOrEqual(2);
    const rhos = solutionRows.map((r) => r.context.rho_kg_m3);
    expect(rhos).toContain(1000);
    expect(rhos).toContain(1070);
  });

  // ─── График ───────────────────────────────────────────────────────────

  it('solution: график получает ≥2 точки и становится видимым', () => {
    exp.setLiquidMode('solution');
    exp.placeDynamometer(5);
    exp.placeBeaker();
    exp.pourWater(200);

    // Точка 1.
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.liftCylinderFromWater();

    // График ещё скрыт (1 точка).
    expect(host.querySelector<HTMLElement>('#ar-graph-wrap')!.hidden).toBe(true);

    // Соль → точка 2.
    exp.addSaltPortion();
    exp.detachCylinder();
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();

    const graph = host.querySelector<HTMLElement & { data: { points: unknown[] } }>('#ar-graph')!;
    expect(graph.data.points.length).toBeGreaterThanOrEqual(2);
    expect(host.querySelector<HTMLElement>('#ar-graph-wrap')!.hidden).toBe(false);
  });

  it('solution: точки разными цилиндрами (разный V) → линия тренда не строится (fitSlope null)', () => {
    exp.setLiquidMode('solution');
    exp.placeDynamometer(5);
    exp.placeBeaker();
    exp.pourWater(200);
    // Точка 1 — цилиндр №2 (V=25 см³).
    exp.attachCylinderById(2);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.liftCylinderFromWater();
    // Соль → ρ=1070; точка 2 — ДРУГОЙ цилиндр №3 (V=56 см³).
    exp.addSaltPortion();
    exp.detachCylinder();
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();

    const graph = host.querySelector<
      HTMLElement & { data: { points: unknown[]; fitSlope: number | null } }
    >('#ar-graph')!;
    expect(graph.data.points.length).toBeGreaterThanOrEqual(2);
    // Разные V → единый наклон g·V физически некорректен → линию не рисуем.
    expect(graph.data.fitSlope).toBeNull();
  });

  it('solution: всплывший цилиндр (P_жид ≤ 0) не попадает в точки графика', () => {
    exp.setLiquidMode('solution');
    exp.placeDynamometer(1); // мелкая шкала: лёгкий пластик всплывает в насыщенном растворе
    exp.placeBeaker();
    exp.pourWater(200);
    // Чистая вода — валидная точка.
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.liftCylinderFromWater();
    // Насыщаем (ρ=1200) и снова меряем тем же №3 — может всплыть (P_жид→0).
    exp.addSaltPortion();
    exp.addSaltPortion();
    exp.addSaltPortion();
    exp.detachCylinder();
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();

    const graph = host.querySelector<
      HTMLElement & { data: { points: { x: number }[] } }
    >('#ar-graph')!;
    // Инвариант: каждая точка графика соответствует строке с P_жид > 0 (не всплывшей).
    const floatingRhos = exp
      .getJournalRows()
      .filter((r) => r.context.liquid === 'solution' && r.P_liquid_N !== null && r.P_liquid_N <= 0)
      .map((r) => r.context.rho_kg_m3);
    for (const rho of floatingRhos) {
      expect(graph.data.points.some((p) => p.x === rho)).toBe(false);
    }
  });

  // ─── Reset ─────────────────────────────────────────────────────────────

  it('solution: reset чистит журнал/соль, но оставляет режим solution', () => {
    exp.setLiquidMode('solution');
    exp.placeDynamometer(5);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.addSaltPortion();
    fullCycle(exp, 3);
    expect(exp.getJournalRows().length).toBe(1);

    exp.reset();
    expect(exp.getJournalRows().length).toBe(0);
    expect(fs(exp).liquidMode).toBe('solution');
    expect(fs(exp).saltPortions).toBe(0);
    expect(fs(exp).liquidRhoKgM3).toBe(WATER_RHO_KG_M3);
  });

  // ─── Cross-check c физикой ────────────────────────────────────────────

  it('liquidRhoFromSaltPortions согласован со state после порций', () => {
    exp.setLiquidMode('solution');
    exp.placeBeaker();
    exp.pourWater(200);
    for (let n = 1; n <= 4; n++) {
      exp.addSaltPortion();
      const expected = liquidRhoFromSaltPortions(Math.min(n, 3));
      expect(fs(exp).liquidRhoKgM3).toBe(expected);
    }
  });
});
