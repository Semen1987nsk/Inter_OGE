/**
 * friction-state-machine — DOM-based интеграционный тест friction-экрана (§21 v2).
 *
 * Покрывает миграцию журнала на единый v2 и захват пути/работы в Task B:
 *   - Task B запись заполняет distanceMm + work; A/C/D оставляют null (не регресс).
 *   - #currentSpec() переключается по активной задаче (через колонки журнала).
 *   - В Task B журнал рендерит колонки work (s, см / A, Дж); в A/C/D — колонки μ.
 *   - Путь s виден на сцене (path-readout) только в Task B.
 *   - reset чистит журнал, drafts/verdicts (через отсутствие строк).
 *   - mount/unmount round-trip без падений.
 *
 * Драйвится через программный API оркестратора (attachBlock / attachDynamometerById /
 * applyForce / slideBlockTo / setActiveTask / recordMeasurement) — не через DOM-события.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FrictionScreen } from '../screens/friction/FrictionScreen';
import type { FrictionExperiment } from '../screens/friction/FrictionExperiment';
import { setRecordMode } from '@shared/lib/record-mode';

async function registerComponents(): Promise<void> {
  await import('../ui/components/lab-equipment-card');
  await import('../ui/components/lab-block');
  await import('../ui/components/lab-dynamometer-h');
  await import('../ui/components/lab-flat-weight');
  await import('../ui/components/lab-friction-track');
  await import('../ui/components/lab-graph');
}

function getExperiment(): FrictionExperiment {
  return (window as unknown as { frictionExperiment: FrictionExperiment }).frictionExperiment;
}

/** Поднимает экран и собирает установку до состояния «ready-to-record» для заданной задачи. */
function setupReady(
  exp: FrictionExperiment,
  task: 'A-coefficient' | 'B-work' | 'C-force-vs-N' | 'D-force-vs-surface',
  slideMm = 0,
): void {
  exp.setActiveTask(task);
  expect(exp.attachBlock()).toBe(true);
  expect(exp.attachDynamometerById('dyno-5')).toBe(true);
  if (slideMm > 0) exp.slideBlockTo(slideMm);
  // Сила выше порога срыва (μ_static_A·N ≈ 0.22·0.49 ≈ 0.108 Н) → скольжение.
  exp.applyForce(0.3);
}

describe('FrictionScreen — state machine + журнал v2', () => {
  let host: HTMLElement;
  let screen: FrictionScreen;

  beforeEach(async () => {
    await registerComponents();
    document.body.replaceChildren();
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    try {
      localStorage.clear();
    } catch {
      /* happy-dom */
    }
    // fully-auto: программа сама пишет measurement при ready — детерминированно для тестов.
    setRecordMode('kit-2', 'fully-auto');
    screen = new FrictionScreen();
    screen.mount(host);
  });

  afterEach(() => {
    screen.unmount();
    document.body.replaceChildren();
    globalThis.gc?.();
  });

  it('Task B: запись заполняет distanceMm + work (A = F·s)', () => {
    const exp = getExperiment();
    setupReady(exp, 'B-work', 200); // 200 мм = 20 см
    exp.recordMeasurement();

    const m = exp.measurements.at(-1)!;
    expect(m.distanceMm).not.toBeNull();
    expect(m.distanceMm).toBeCloseTo(200, 1);
    expect(m.work).not.toBeNull();
    // F тр = μ_kin_A·N = 0.2 · (50/1000·9.8) = 0.2·0.49 = 0.098 Н; s = 0.20 м → A ≈ 0.0196 Дж.
    expect(m.work!).toBeCloseTo(m.frictionForce * 0.2, 4);
  });

  it('Task A: запись оставляет distanceMm + work = null (не регресс)', () => {
    const exp = getExperiment();
    setupReady(exp, 'A-coefficient', 200);
    exp.recordMeasurement();
    const m = exp.measurements.at(-1)!;
    expect(m.distanceMm).toBeNull();
    expect(m.work).toBeNull();
    expect(m.mu).toBeGreaterThan(0);
  });

  it('Task C и D: запись оставляет distanceMm + work = null', () => {
    for (const task of ['C-force-vs-N', 'D-force-vs-surface'] as const) {
      const exp = getExperiment();
      exp.reset();
      setupReady(exp, task, 150);
      exp.recordMeasurement();
      const m = exp.measurements.at(-1)!;
      expect(m.distanceMm, `task ${task}`).toBeNull();
      expect(m.work, `task ${task}`).toBeNull();
    }
  });

  it('#currentSpec переключается: B → work-колонки, A → μ-колонки', () => {
    const exp = getExperiment();
    const journalHost = host.querySelector<HTMLElement>('#journal-host')!;

    // Task B → work-колонки (s, см / A, Дж).
    setupReady(exp, 'B-work', 100);
    exp.recordMeasurement();
    let headers = Array.from(journalHost.querySelectorAll('th')).map((th) =>
      th.getAttribute('data-key'),
    );
    expect(headers).toContain('s_cm');
    expect(headers).toContain('work_J');
    expect(headers).not.toContain('mu');

    // Переключаем на Task A → μ-колонки (m, N, μ).
    exp.reset();
    setupReady(exp, 'A-coefficient', 0);
    exp.recordMeasurement();
    headers = Array.from(journalHost.querySelectorAll('th')).map((th) => th.getAttribute('data-key'));
    expect(headers).toContain('mu');
    expect(headers).toContain('N_N');
    expect(headers).not.toContain('work_J');
  });

  it('Task B: журнал в fully-auto заполняет derived work_J числом', () => {
    const exp = getExperiment();
    const journalHost = host.querySelector<HTMLElement>('#journal-host')!;
    setupReady(exp, 'B-work', 250);
    exp.recordMeasurement();

    const workCell = journalHost.querySelector<HTMLTableCellElement>('td[data-key="work_J"]');
    expect(workCell).toBeTruthy();
    // fully-auto — derived без input, текстом. Должно быть число с запятой (RU-формат).
    expect(workCell!.textContent?.trim()).toMatch(/^\d+,\d{3}$/);
  });

  it('path-readout виден только в Task B и показывает s в см', () => {
    const exp = getExperiment();
    const readout = host.querySelector<HTMLElement>('#path-readout')!;
    const value = host.querySelector<HTMLElement>('#path-readout-value')!;

    // До установки бруска — скрыт.
    exp.setActiveTask('B-work');
    expect(readout.hidden).toBe(true);

    exp.attachBlock();
    expect(readout.hidden).toBe(false);
    exp.slideBlockTo(123); // 12,3 см
    expect(value.textContent).toBe('s = 12,3 см');

    // Переключаем на Task A — readout скрыт.
    exp.setActiveTask('A-coefficient');
    expect(readout.hidden).toBe(true);
  });

  it('reset очищает журнал и путь', () => {
    const exp = getExperiment();
    setupReady(exp, 'B-work', 200);
    exp.recordMeasurement();
    expect(exp.measurements.length).toBeGreaterThan(0);

    exp.reset();
    expect(exp.measurements.length).toBe(0);
    const readout = host.querySelector<HTMLElement>('#path-readout')!;
    expect(readout.hidden).toBe(true);
    const journalHost = host.querySelector<HTMLElement>('#journal-host')!;
    expect(journalHost.querySelectorAll('tbody tr').length).toBe(0);
  });

  it('semi-auto Task B: pending-плашка → запись → ввод s/work → ✓ ok', () => {
    vi.useFakeTimers();
    setRecordMode('kit-2', 'semi-auto');
    // Перемонтируем, чтобы toggle прочитал semi-auto.
    screen.unmount();
    screen.mount(host);
    const exp = getExperiment();

    setupReady(exp, 'B-work', 200); // 20 см
    // applyForce → sliding; через 250ms авто-переход в ready-to-record.
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    // semi-auto: запись НЕ авто — pending-плашка видна.
    const pendingSlot = host.querySelector<HTMLElement>('#record-pending-slot')!;
    expect(pendingSlot.hidden).toBe(false);
    expect(exp.measurements.length).toBe(0);

    // Клик по pending-кнопке = записать direct (F, s); derived (work) ученик считает сам.
    host.querySelector<HTMLButtonElement>('#record-pending-btn')!.click();
    expect(exp.measurements.length).toBe(1);

    const journalHost = host.querySelector<HTMLElement>('#journal-host')!;
    // s_cm — direct, заполнен программой текстом (не input в semi-auto).
    const sCell = journalHost.querySelector<HTMLTableCellElement>('td[data-key="s_cm"]')!;
    expect(sCell.textContent?.trim()).toMatch(/20[.,]0/);

    // work_J — derived, в semi-auto это input. Ученик вводит правильный ответ.
    const m = exp.measurements[0]!;
    const expectedWork = m.frictionForce * 0.2; // s=0.20 м
    const workInput = journalHost.querySelector<HTMLInputElement>('input[data-key="work_J"]')!;
    expect(workInput).toBeTruthy();
    workInput.value = expectedWork.toFixed(3).replace('.', ',');
    workInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Жмём ✓.
    journalHost.querySelector<HTMLButtonElement>('button.j-check')!.click();
    const workCell = journalHost.querySelector<HTMLTableCellElement>('td[data-key="work_J"]')!;
    expect(workCell.dataset['verdict']).toBe('ok');
  });

  it('mount/unmount round-trip 5× без падений', () => {
    for (let i = 0; i < 5; i++) {
      screen.unmount();
      screen.mount(host);
      const exp = getExperiment();
      setupReady(exp, 'B-work', 100);
      exp.recordMeasurement();
      expect(exp.measurements.length).toBe(1);
    }
  });

  it('Task B: два измерения подряд без reset — каждое со своим путём (не накапливает)', () => {
    const exp = getExperiment();
    exp.setActiveTask('B-work');
    expect(exp.attachBlock()).toBe(true);
    expect(exp.attachDynamometerById('dyno-5')).toBe(true);

    // 1-е измерение: брусок проехал 300 мм = 30 см.
    exp.applyForce(0.3); // старт скольжения, slidingStartPosMm = 0
    exp.slideBlockTo(300);
    exp.recordMeasurement();
    expect(exp.measurements.at(-1)!.distanceMm).toBeCloseTo(300, 1);

    // 2-е измерение БЕЗ reset: после record шаг='recorded' → applyForce заново стартует
    // скольжение и переякоривает slidingStartPosMm на текущую позицию (300).
    exp.applyForce(0.3);
    exp.slideBlockTo(330); // ещё +30 мм = +3 см
    exp.recordMeasurement();
    // Путь 2-го = смещение ЭТОГО скольжения (30 мм), а не накопленные 330.
    expect(exp.measurements.at(-1)!.distanceMm).toBeCloseTo(30, 1);
  });

  it('unmount во время sliding-окна: нет dangling-записи и краша (таймер снят в destroy)', () => {
    vi.useFakeTimers();
    const exp = getExperiment(); // beforeEach смонтировал в fully-auto
    exp.setActiveTask('B-work');
    exp.attachBlock();
    exp.attachDynamometerById('dyno-5');
    exp.applyForce(0.3); // ставит 250ms таймер авто-записи (fully-auto)
    expect(exp.measurements.length).toBe(0);

    screen.unmount(); // destroy() обязан снять таймер
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    // Если бы таймер не сняли — он бы вызвал recordMeasurement на размонтированном экране.
    expect(exp.measurements.length).toBe(0);

    vi.useRealTimers();
    screen.mount(host); // вернуть смонтированное состояние для afterEach.unmount()
  });
});
