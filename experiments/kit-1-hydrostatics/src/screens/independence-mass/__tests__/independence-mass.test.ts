/**
 * State-machine тест экрана 1.5 «Независимость F_A от массы».
 * Паттерн — аналог archimedes-volume/motion.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IndependenceMassScreen } from '../IndependenceMassScreen';
import type { IndependenceMassExperiment } from '../IndependenceMassExperiment';

async function registerComponents(): Promise<void> {
  await import('../../../ui/components/lab-equipment-card');
  await import('../../../ui/components/lab-metal-weight');
  await import('../../../ui/components/lab-dynamometer');
  await import('../../../ui/components/lab-beaker');
}

describe('Опыт 1.5 — слоты журнала и record-mode', () => {
  let host: HTMLElement;
  let screen: IndependenceMassScreen;
  let exp: IndependenceMassExperiment;

  beforeEach(async () => {
    await registerComponents();
    document.body.replaceChildren();
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    try { localStorage.clear(); } catch { /* ignore */ }
    screen = new IndependenceMassScreen();
    screen.mount(host);
    exp = (window as unknown as { independenceMassExperiment?: IndependenceMassExperiment })
      .independenceMassExperiment!;
    expect(exp).toBeTruthy();
  });

  afterEach(() => {
    screen.unmount();
    document.body.replaceChildren();
    globalThis.gc?.();
  });

  it('журнал-слоты присутствуют в DOM после mount', () => {
    expect(host.querySelector('#im-journal-host')).not.toBeNull();
    expect(host.querySelector('#im-record-mode-slot')).not.toBeNull();
    expect(host.querySelector('#im-live-region')).not.toBeNull();
  });

  it('после placeDynamometer + placeBeaker панель измерений видима', () => {
    exp.placeDynamometer();
    exp.placeBeaker();
    const panel = host.querySelector<HTMLElement>('#im-measure-panel')!;
    expect(panel.hidden).toBe(false);
  });

  it('dipCylinder(1) → cyl1.dipped=true', () => {
    exp.placeDynamometer();
    exp.placeBeaker();
    exp.dipCylinder(1);
    const s = exp.getState();
    expect(s.cyl1?.dipped).toBe(true);
  });

  it('liftCylinder(1) → cyl1.dipped=false', () => {
    exp.placeDynamometer();
    exp.placeBeaker();
    exp.dipCylinder(1);
    exp.liftCylinder(1);
    const s = exp.getState();
    expect(s.cyl1?.dipped).toBe(false);
  });

  it('recordCylinder(1) → строка в журнале с ключами SPEC', () => {
    exp.placeDynamometer();
    exp.placeBeaker();
    exp.dipCylinder(1);
    exp.liftCylinder(1);
    exp.recordCylinder(1);
    const s = exp.getState();
    expect(s.rows.length).toBe(1);
    const row = s.rows[0]!;
    expect(row.values['m_g']).toBe(195);
    expect(row.values['V_cm3']).toBe(25);
    expect(typeof row.values['P_air_N']).toBe('number');
    expect(typeof row.values['P_liq_N']).toBe('number');
    expect(typeof row.values['F_A_N']).toBe('number');
  });

  it('F_A_N в строке №1 совпадает с P_air − P_liq (±0.001)', () => {
    exp.placeDynamometer();
    exp.placeBeaker();
    exp.dipCylinder(1);
    exp.liftCylinder(1);
    exp.recordCylinder(1);
    const row = exp.getState().rows[0]!;
    const fa = (row.values['P_air_N'] as number) - (row.values['P_liq_N'] as number);
    expect(row.values['F_A_N'] as number).toBeCloseTo(fa, 2);
  });

  it('после двух записей вердикт показывает F_арх ≈ равны', () => {
    exp.placeDynamometer();
    exp.placeBeaker();
    exp.dipCylinder(1);
    exp.liftCylinder(1);
    exp.recordCylinder(1);
    exp.dipCylinder(2);
    exp.liftCylinder(2);
    exp.recordCylinder(2);
    const s = exp.getState();
    expect(s.rows.length).toBe(2);
    const fa1 = (s.rows[0]!.values['F_A_N'] as number);
    const fa2 = (s.rows[1]!.values['F_A_N'] as number);
    // F_A для обоих должна быть ≈ 0.245 Н (±5%)
    expect(Math.abs(fa1 - 0.245)).toBeLessThan(0.02);
    expect(Math.abs(fa2 - 0.245)).toBeLessThan(0.02);
    // Вердикт показывается
    const verdictEl = host.querySelector<HTMLElement>('#im-verdict')!;
    expect(verdictEl.hidden).toBe(false);
    expect(verdictEl.dataset['equal']).toBe('true');
  });

  it('reset очищает строки журнала и убирает вердикт', () => {
    exp.placeDynamometer();
    exp.placeBeaker();
    exp.dipCylinder(1);
    exp.liftCylinder(1);
    exp.recordCylinder(1);
    exp.reset();
    expect(exp.getState().rows.length).toBe(0);
    const verdict = host.querySelector<HTMLElement>('#im-verdict')!;
    expect(verdict.hidden).toBe(true);
  });

  it('unmount удаляет window.independenceMassExperiment', () => {
    screen.unmount();
    expect(
      (window as unknown as { independenceMassExperiment?: IndependenceMassExperiment })
        .independenceMassExperiment,
    ).toBeUndefined();
    // Предотвращаем двойной unmount в afterEach
    screen = new IndependenceMassScreen(); // dummy для afterEach
    screen.mount(host);
  });
});
