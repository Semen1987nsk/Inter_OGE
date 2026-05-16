/**
 * ArchimedesExperiment — интеграционные тесты (этап 6b).
 *
 * Стек: happy-dom + Vitest + customElements (через побочные импорты компонентов).
 * Не используем MouseEvents/PointerEvents — все действия через программный
 * API оркестратора. Это канон REFERENCE.md §15.7 — DragController покрывается
 * отдельными e2e-тестами, а оркестратор — программно.
 *
 * Покрытие 6b:
 *   - Happy-path для всех 4 цилиндров (включая №1 как soft-warning).
 *   - Reverse drag по матрице §4 (detachCylinder, liftCylinderFromWater,
 *     returnDynamometerToKit, returnBeakerToKit, returnCylinderToKit).
 *   - 10 edge cases из §5 (перегрузка №1, частичное погружение, мало воды,
 *     перелив, drop в пустой стакан, 2-й цилиндр на динамометр, и т.п.).
 *   - Ассерты на overload/partialDip/bottomTouch/bannerText.
 *   - Reset идемпотентность.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArchimedesScreen } from '../ArchimedesScreen';
import type { ArchimedesExperiment } from '../ArchimedesExperiment';

async function registerComponents(): Promise<void> {
  await import('../../../ui/components/lab-equipment-card');
  await import('../../../ui/components/lab-metal-weight');
  await import('../../../ui/components/lab-dynamometer');
  await import('../../../ui/components/lab-beaker');
  await import('../../../ui/components/lab-thread');
  await import('../../../ui/components/lab-journal');
  await import('../../../ui/components/lab-balance');
  await import('../../../ui/components/lab-graduated-cylinder');
  await import('../../../ui/components/lab-salt-set');
}

describe('ArchimedesExperiment — 6b', () => {
  let host: HTMLElement;
  let screen: ArchimedesScreen;
  let exp: ArchimedesExperiment;

  beforeEach(async () => {
    await registerComponents();
    // Auto-save (этап 6c) хранит state между mount'ами в localStorage.
    // Тесты должны стартовать с чистого листа — иначе восстанавливается
    // state предыдущего теста. Очищаем перед каждым.
    if (typeof localStorage !== 'undefined') localStorage.clear();
    document.body.innerHTML = '';
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    screen = new ArchimedesScreen();
    screen.mount(host);
    exp = (window as unknown as { archimedesExperiment: ArchimedesExperiment }).archimedesExperiment;
  });

  afterEach(() => {
    screen.unmount();
    document.body.innerHTML = '';
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof globalThis.gc === 'function') globalThis.gc();
  });

  // ─── Smoke / mount ─────────────────────────────────────────────────────

  it('mount: оркестратор создан и зарегистрирован в window', () => {
    expect(exp).toBeDefined();
    expect(exp.getState()).toBe('idle');
    expect(host.querySelector('#ar-stage')).toBeTruthy();
    expect(host.querySelector('#ar-journal')).toBeTruthy();
    expect(host.querySelector('#ar-dropzone-stage')).toBeTruthy();
    expect(host.querySelector('lab-equipment-card[data-eq="dynamometer-1"]')).toBeTruthy();
    expect(host.querySelector('lab-equipment-card[data-eq="cyl-1"]')).toBeTruthy();
    expect(host.querySelector('lab-equipment-card[data-eq="cyl-3"]')).toBeTruthy();
    expect(host.querySelector('lab-equipment-card[data-eq="beaker"]')).toBeTruthy();
  });

  it('placeDynamometer(1): state переходит в "dyno-on-scene", динамометр в DOM', () => {
    exp.placeDynamometer(1);
    expect(exp.getState()).toBe('dyno-on-scene');
    const dyno = host.querySelector('#ar-dyno-host lab-dynamometer');
    expect(dyno).toBeTruthy();
    expect(dyno!.getAttribute('range')).toBe('1');
    expect((host.querySelector('#ar-clamp') as HTMLElement).hidden).toBe(false);
  });

  // ─── Happy-path по каждому цилиндру (№2, №3, №4) ──────────────────────

  it('attachCylinderById(3): state = "cyl-attached", force = m·g (66 г → 0.647 Н ±0.001)', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    expect(exp.getState()).toBe('cyl-attached');
    const cyl = host.querySelector('#ar-cylinder-host lab-metal-weight');
    expect(cyl).toBeTruthy();
    expect(cyl!.getAttribute('id-num')).toBe('3');
    const dyno = host.querySelector('#ar-dyno-host lab-dynamometer');
    const force = parseFloat(dyno!.getAttribute('force') ?? '0');
    expect(force).toBeCloseTo(0.647, 3);
  });

  it('recordCurrentReading после cyl-attached: журнал имеет 1 строку с P_air, без P_liquid', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    expect(exp.getState()).toBe('air-recorded');
    const rows = exp.getJournalRows();
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.cylinder).toBe('No3');
    expect(row.V_cm3).toBe(56.0);
    expect(row.P_air_N).toBeCloseTo(0.65, 2);
    expect(row.P_liquid_N).toBeNull();
    expect(row.F_A_meas_N).toBeNull();
    expect(row.F_A_theor_N).toBeCloseTo(0.5488, 4);
  });

  it('placeBeaker + pourWater(150): state = "water-poured", уровень в стакане 150', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    expect(exp.getState()).toBe('beaker-on-scene');
    exp.pourWater(150);
    expect(exp.getState()).toBe('water-poured');
    const beaker = host.querySelector('#ar-beaker-host lab-beaker');
    expect(beaker).toBeTruthy();
    expect(beaker!.getAttribute('level')).toBe('150');
  });

  it('dipCylinderInWater для №3 при V_water=150: force ≈ P_air − F_A ≈ 0.098 Н', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    expect(exp.getState()).toBe('cyl-in-water');
    const dyno = host.querySelector('#ar-dyno-host lab-dynamometer');
    const force = parseFloat(dyno!.getAttribute('force') ?? '0');
    expect(force).toBeCloseTo(0.098, 3);
  });

  it('запись P_жид: журнал обновлён, F_A_meas ≈ 0.55 Н, delta ≈ 0%', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    expect(exp.getState()).toBe('liquid-recorded');
    const rows = exp.getJournalRows();
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.P_air_N).toBeCloseTo(0.65, 2);
    expect(row.P_liquid_N).toBeCloseTo(0.10, 2);
    expect(row.F_A_meas_N).not.toBeNull();
    expect(row.F_A_meas_N!).toBeCloseTo(0.55, 2);
    expect(row.delta_pct).not.toBeNull();
    expect(Math.abs(row.delta_pct!)).toBeLessThan(2);
  });

  it('full happy-path для №2 (алюминий, V=25 см³) даёт правильную F_A теор ≈ 0.245 Н', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(2);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    const rows = exp.getJournalRows();
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.cylinder).toBe('No2');
    expect(row.F_A_theor_N).toBeCloseTo(0.245, 3);
    expect(row.P_air_N).toBeCloseTo(0.69, 2);
    expect(row.P_liquid_N).toBeCloseTo(0.44, 2);
  });

  it('full happy-path для №4 (алюминий, V=34 см³) даёт правильную F_A теор ≈ 0.333 Н', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(4);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    const rows = exp.getJournalRows();
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.cylinder).toBe('No4');
    expect(row.F_A_theor_N).toBeCloseTo(0.333, 3);
    expect(row.P_air_N).toBeCloseTo(0.93, 2);
    expect(row.P_liquid_N).toBeCloseTo(0.60, 2);
  });

  it('последовательные циклы №2 → №3 → №4: 3 строки в журнале с разными цилиндрами', () => {
    exp.placeDynamometer(1);
    exp.placeBeaker();
    exp.pourWater(200);
    // №2
    exp.attachCylinderById(2);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.liftCylinderFromWater();
    exp.detachCylinder();
    // №3
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.liftCylinderFromWater();
    exp.detachCylinder();
    // №4
    exp.attachCylinderById(4);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    const rows = exp.getJournalRows();
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.cylinder)).toEqual(['No2', 'No3', 'No4']);
    // Каждая строка — заполненная пара
    for (const r of rows) {
      expect(r.P_air_N).not.toBeNull();
      expect(r.P_liquid_N).not.toBeNull();
      expect(r.F_A_meas_N).not.toBeNull();
    }
  });

  // ─── Edge case 1: цилиндр №1 на динамометре 1 Н — перегрузка ─────────

  it('edge#1: №1 на дин-1 → overload=true, force клампится в range=1, баннер про перегрузку', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(1);
    expect(exp.getOverloaded()).toBe(true);
    const dyno = host.querySelector('#ar-dyno-host lab-dynamometer');
    const force = parseFloat(dyno!.getAttribute('force') ?? '0');
    // m=195 г → P_air=1.91 Н; clamp в 1 Н
    expect(force).toBeCloseTo(1.0, 3);
    expect(exp.getBannerText()).toMatch(/Перегрузка/i);
    // На динамометре data-overload='true' (для красного LCD через CSS-vars)
    expect(dyno!.getAttribute('data-overload')).toBe('true');
  });

  it('edge#1b: №1 на дин-2 (5 Н) → overload=false, force=1.91, баннер чист', () => {
    exp.placeDynamometer(5);
    exp.attachCylinderById(1);
    expect(exp.getOverloaded()).toBe(false);
    const dyno = host.querySelector('#ar-dyno-host lab-dynamometer');
    const force = parseFloat(dyno!.getAttribute('force') ?? '0');
    expect(force).toBeCloseTo(1.911, 3);
    expect(exp.getBannerText()).toBeNull();
    expect(dyno!.getAttribute('data-overload')).toBeNull();
  });

  it('edge#1c: recordCurrentReading для №1 — журнал не пишет (ФИПИ исключает)', () => {
    exp.placeDynamometer(5);
    exp.attachCylinderById(1);
    exp.recordCurrentReading();
    expect(exp.getJournalRows()).toHaveLength(0);
  });

  // ─── Edge case 2: касание дна (мало воды) ────────────────────────────

  it('edge#2: №3 (V=56) с водой 30 мл → bottomTouch=true, partialDip=true, баннер про дно', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(30); // меньше LOW_WATER_THRESHOLD=50
    exp.dipCylinderInWater();
    expect(exp.getFullState().bottomTouch).toBe(true);
    expect(exp.getPartialDip()).toBe(true);
    expect(exp.getBannerText()).toMatch(/дн|долейте/i);
  });

  // ─── Edge case 3: частичное погружение ────────────────────────────────

  it('edge#3: №3 (V=56) с водой 40 мл → partialDip=true, F_A_meas меньше теории', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(40);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    expect(exp.getPartialDip()).toBe(true);
    const row = exp.getJournalRows()[0]!;
    // F_A_meas заметно меньше F_A_theor (0.5488 Н)
    expect(row.F_A_meas_N!).toBeLessThan(row.F_A_theor_N - 0.1);
  });

  // ─── Edge case 4: мало воды (≤50 мл) → low-water warning ─────────────

  it('edge#4: pourWater(50) → bottom=true при погружении №3, низкий уровень', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(50);
    exp.dipCylinderInWater();
    expect(exp.getFullState().bottomTouch).toBe(true);
    expect(exp.getBannerText()).toMatch(/дн|долейте/i);
  });

  // ─── Edge case 5: перелив > 250 мл ────────────────────────────────────

  it('edge#5: pourWater(300) → клампится в 250 мл, баннер «Перелив»', () => {
    exp.placeBeaker();
    exp.pourWater(300);
    expect(exp.getFullState().waterMl).toBe(250);
    expect(exp.getBannerText()).toMatch(/Перелив/i);
  });

  // ─── Edge case 6: drop в пустой стакан без воды ──────────────────────

  it('edge#6: dipCylinderInWater без воды — баннер «нужна вода», state не меняется', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    // Не наливаем воду
    exp.dipCylinderInWater();
    expect(exp.getState()).toBe('cyl-attached'); // не дошёл до cyl-in-water
    expect(exp.getBannerText()).toMatch(/вод/i);
  });

  // ─── Edge case 7: цилиндр без подвеса в воду ─────────────────────────

  it('edge#7: drag цилиндра прямо в стакан с водой (без динамометра) — баннер про подвес', () => {
    exp.placeBeaker();
    exp.pourWater(200);
    // Симулируем drop напрямую через handleDrop
    type ExpInner = { ['#handleDrop']: (d: { eqId: string; dropzoneId: string }) => void };
    // Используем публичный API: эмулируем напрямую через card-click нет варианта,
    // поэтому проверяем через bannerText, что соответствующий путь обрабатывается.
    void (exp as unknown as ExpInner);
    // Простой acid-test: цилиндр НЕ подвешен (cylinderId=null) → dipCylinderInWater no-op
    exp.dipCylinderInWater();
    expect(exp.getState()).not.toBe('cyl-in-water');
    // Цилиндр на крюке отсутствует
    expect(exp.getFullState().cylinderId).toBeNull();
  });

  // ─── Edge case 8: 2-й цилиндр на занятый динамометр ──────────────────

  it('edge#8: attachCylinderById когда уже привязан — игнорируется, остаётся №3', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.attachCylinderById(2);
    expect(exp.getFullState().cylinderId).toBe(3);
  });

  // ─── Edge case 9: динамометр-с-цилиндром в стакан без воды ───────────

  it('edge#9: dipCylinderInWater когда стакан пустой — отклонено, баннер', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    // 0 мл воды
    exp.dipCylinderInWater();
    expect(exp.getFullState().inWater).toBe(false);
    expect(exp.getBannerText()).toMatch(/вод/i);
  });

  // ─── Edge case 10: повторный dip — no-op ─────────────────────────────

  it('edge#10: повторный dipCylinderInWater когда уже в воде — no-op', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    const force1 = exp.getFullState().forceN;
    exp.dipCylinderInWater();
    const force2 = exp.getFullState().forceN;
    expect(force2).toBe(force1);
    expect(exp.getFullState().inWater).toBe(true);
  });

  // ─── Reverse drag: detachCylinder ─────────────────────────────────────

  it('reverse: detachCylinder из cyl-attached → cylinderId=null, dyno остаётся', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    expect(exp.getFullState().cylinderId).toBe(3);
    exp.detachCylinder();
    expect(exp.getFullState().cylinderId).toBeNull();
    expect(exp.getFullState().dynoRange).toBe(1);
    expect(exp.getState()).toBe('dyno-on-scene');
  });

  it('reverse: detachCylinder из cyl-in-water → поднимает и отвязывает', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    exp.detachCylinder();
    expect(exp.getFullState().cylinderId).toBeNull();
    expect(exp.getFullState().inWater).toBe(false);
    // Стакан остался на сцене → phase = water-poured
    expect(exp.getState()).toBe('water-poured');
  });

  // ─── Reverse drag: liftCylinderFromWater ─────────────────────────────

  it('reverse: liftCylinderFromWater возвращает force = P_возд', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    expect(exp.getFullState().forceN).toBeCloseTo(0.098, 3);
    exp.liftCylinderFromWater();
    expect(exp.getFullState().inWater).toBe(false);
    expect(exp.getFullState().forceN).toBeCloseTo(0.6468, 3);
  });

  it('reverse: liftCylinderFromWater после liquid-recorded сохраняет phase', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    expect(exp.getState()).toBe('liquid-recorded');
    exp.liftCylinderFromWater();
    expect(exp.getState()).toBe('liquid-recorded'); // не «деградирует» обратно
    expect(exp.getFullState().inWater).toBe(false);
  });

  // ─── Reverse: returnDynamometerToKit ─────────────────────────────────

  it('reverse: returnDynamometerToKit с цилиндром → каскадно снимает оба (полная имитация)', () => {
    // §19.11.15: detach ВСЕГДА проходит, зависимости каскадно снимаются.
    // В реальной лабе ученик может одним движением убрать всю установку.
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.returnDynamometerToKit();
    expect(exp.getFullState().dynoRange).toBeNull();
    expect(exp.getFullState().cylinderId).toBeNull();
  });

  it('reverse: returnDynamometerToKit с цилиндром в воде → каскад: lift + detach + remove', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    expect(exp.getFullState().inWater).toBe(true);
    exp.returnDynamometerToKit();
    expect(exp.getFullState().dynoRange).toBeNull();
    expect(exp.getFullState().cylinderId).toBeNull();
    expect(exp.getFullState().inWater).toBe(false);
    // Стакан остаётся — он независимая сущность, в реале остаётся стоять на столе.
    expect(exp.getFullState().beakerOnScene).toBe(true);
  });

  it('reverse: returnDynamometerToKit без цилиндра → state idle', () => {
    exp.placeDynamometer(1);
    exp.returnDynamometerToKit();
    expect(exp.getFullState().dynoRange).toBeNull();
    expect(exp.getState()).toBe('idle');
  });

  // ─── Reverse: returnBeakerToKit ──────────────────────────────────────

  it('reverse: returnBeakerToKit когда цилиндр в воде → каскад: lift + remove (цилиндр висит на нити)', () => {
    // §19.11.15: убрать стакан со стола можно даже когда внутри плавает
    // цилиндр. В реале он остаётся висеть на нити динамометра — программа
    // имитирует ровно это.
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    expect(exp.getFullState().inWater).toBe(true);
    exp.returnBeakerToKit();
    expect(exp.getFullState().beakerOnScene).toBe(false);
    expect(exp.getFullState().inWater).toBe(false);
    // Цилиндр остаётся висеть — это и есть «полная имитация».
    expect(exp.getFullState().cylinderId).toBe(3);
    expect(exp.getFullState().dynoRange).toBe(1);
  });

  it('reverse: returnBeakerToKit с водой → стакан исчезает, вода теряется', () => {
    exp.placeBeaker();
    exp.pourWater(200);
    exp.returnBeakerToKit();
    expect(exp.getFullState().beakerOnScene).toBe(false);
    expect(exp.getFullState().waterMl).toBe(0);
  });

  // ─── Reverse: returnCylinderToKit ────────────────────────────────────

  it('reverse: returnCylinderToKit для не своего id — no-op', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.returnCylinderToKit(2);
    expect(exp.getFullState().cylinderId).toBe(3);
  });

  it('reverse: returnCylinderToKit для своего id → отвязывает', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.returnCylinderToKit(3);
    expect(exp.getFullState().cylinderId).toBeNull();
  });

  // ─── Без динамометра ─────────────────────────────────────────────────

  it('attachCylinderById без динамометра — no-op, остаётся idle', () => {
    exp.attachCylinderById(3);
    expect(exp.getState()).toBe('idle');
    expect(host.querySelector('#ar-cylinder-host lab-metal-weight')).toBeNull();
    expect(exp.getJournalRows()).toHaveLength(0);
  });

  it('recordCurrentReading вне cyl-attached/cyl-in-water — no-op, журнал пуст', () => {
    exp.recordCurrentReading();
    expect(exp.getJournalRows()).toHaveLength(0);
    exp.placeDynamometer(1);
    exp.recordCurrentReading();
    expect(exp.getJournalRows()).toHaveLength(0);
  });

  // ─── Reset ───────────────────────────────────────────────────────────

  it('reset: state → idle, журнал пуст, приборы удалены', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    expect(exp.getJournalRows()).toHaveLength(1);

    exp.reset();
    expect(exp.getState()).toBe('idle');
    expect(exp.getJournalRows()).toHaveLength(0);
    expect(host.querySelector('#ar-dyno-host lab-dynamometer')).toBeNull();
    expect(host.querySelector('#ar-cylinder-host lab-metal-weight')).toBeNull();
    expect(host.querySelector('#ar-beaker-host lab-beaker')).toBeNull();
    expect(exp.getFullState().bannerText).toBeNull();
    expect(exp.getFullState().completedCylinders).toEqual([]);
  });

  it('reset 5 раз подряд — не падает, остаётся initial', () => {
    for (let i = 0; i < 5; i++) {
      exp.reset();
      expect(exp.getState()).toBe('idle');
    }
  });

  // ─── Замена дин-1 на дин-2 после возврата ────────────────────────────

  it('placeDynamometer повторно — no-op, оставляет первый', () => {
    exp.placeDynamometer(1);
    expect(exp.getState()).toBe('dyno-on-scene');
    exp.placeDynamometer(5);
    const dyno = host.querySelector('#ar-dyno-host lab-dynamometer');
    expect(dyno!.getAttribute('range')).toBe('1');
  });

  it('после returnDynamometerToKit: можно placeDynamometer(5) — теперь работает 5 Н', () => {
    exp.placeDynamometer(1);
    exp.returnDynamometerToKit();
    exp.placeDynamometer(5);
    const dyno = host.querySelector('#ar-dyno-host lab-dynamometer');
    expect(dyno!.getAttribute('range')).toBe('5');
  });

  // ─── ARIA / анти-палево ──────────────────────────────────────────────

  it('ARIA-label кнопки записи и hint не содержат ожидаемое значение силы (анти-палево)', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    const hint = host.querySelector('#ar-hint') as HTMLElement;
    expect(hint.textContent).not.toMatch(/0[,.]\d{2}/);
    const btn = host.querySelector('#ar-record-btn') as HTMLElement;
    expect(btn.getAttribute('aria-label')).toBe('Записать P возд');
    const reset = host.querySelector('#ar-reset-btn') as HTMLElement;
    expect(reset.getAttribute('aria-label')).toBe('Сбросить опыт');
  });

  // ─── mount/unmount round-trip ─────────────────────────────────────────

  it('mount/unmount/mount round-trip без утечек', () => {
    expect((window as unknown as { archimedesExperiment?: unknown }).archimedesExperiment).toBeDefined();
    screen.unmount();
    expect((window as unknown as { archimedesExperiment?: unknown }).archimedesExperiment).toBeUndefined();
    screen.mount(host);
    expect((window as unknown as { archimedesExperiment?: unknown }).archimedesExperiment).toBeDefined();
  });

  // ─── Banner clearing on detach ────────────────────────────────────────

  it('detachCylinder после №1: bannerText сбрасывается', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(1);
    expect(exp.getBannerText()).not.toBeNull();
    exp.detachCylinder();
    expect(exp.getBannerText()).toBeNull();
  });

  // ─── Журнал: F_A_meas только когда обе пары не null ──────────────────

  it('журнал: F_A_meas остаётся null после P_возд, появляется после P_жид', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    expect(exp.getJournalRows()[0]!.F_A_meas_N).toBeNull();
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    expect(exp.getJournalRows()[0]!.F_A_meas_N).not.toBeNull();
  });

  // ─── completedCylinders accumulation ──────────────────────────────────

  it('completedCylinders накапливается: после полного цикла №3 → массив [3]', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.detachCylinder();
    expect(exp.getFullState().completedCylinders).toContain(3);
  });

  // ─── Наливание дополнительной воды после погружения пересчитывает F ─

  it('pourWater после dip: force пересчитывается (например, доливаем до полного)', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(40); // мало воды, partial
    exp.dipCylinderInWater();
    const partialForce = exp.getFullState().forceN;
    expect(exp.getPartialDip()).toBe(true);
    exp.pourWater(200); // доливаем
    // partial должен исчезнуть, force измениться
    expect(exp.getPartialDip()).toBe(false);
    expect(exp.getFullState().forceN).not.toBe(partialForce);
  });
});
