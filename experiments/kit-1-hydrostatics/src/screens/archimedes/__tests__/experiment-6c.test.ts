/**
 * ArchimedesExperiment — UX-тесты этапа 6c.
 *
 * Покрытие:
 *   - HintEngine: ambient-pulse на правильных карточках при смене фазы.
 *   - Stepper: динамика done/active/pending; шаг 7 «Сравните с теорией»
 *     появляется только после полной строки.
 *   - undo-toast: при reset(true) и при commit P_возд / P_жид.
 *   - Auto-save → restore round-trip; expired-state cleanup.
 *
 * Не дублируем 6b — фокус ТОЛЬКО на новых поведениях.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchimedesScreen } from '../ArchimedesScreen';
import type { ArchimedesExperiment } from '../ArchimedesExperiment';
import { ARCHIMEDES_STORAGE_KEY } from '../controller/StateStore';

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
  await import('../../../ui/components/lab-toast');
}

function getCard(host: HTMLElement, eqId: string): HTMLElement {
  const el = host.querySelector<HTMLElement>(`lab-equipment-card[data-eq="${eqId}"]`);
  if (!el) throw new Error(`No card ${eqId}`);
  return el;
}

describe('ArchimedesExperiment — 6c UX (HintEngine, stepper, undo-toast, auto-save)', () => {
  let host: HTMLElement;
  let screen: ArchimedesScreen;
  let exp: ArchimedesExperiment;

  beforeEach(async () => {
    await registerComponents();
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
    // Уберём все тосты, оставшиеся в body.
    document
      .querySelectorAll('lab-toast')
      .forEach((t) => t.parentNode?.removeChild(t));
    screen.unmount();
    document.body.innerHTML = '';
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof globalThis.gc === 'function') globalThis.gc();
  });

  // ─── HintEngine: ambient-pulse target ──────────────────────────────

  it('после mount фаза idle → pulse на dynamometer-1', () => {
    expect(getCard(host, 'dynamometer-1').classList.contains('pulse-recommended')).toBe(true);
    expect(getCard(host, 'cyl-3').classList.contains('pulse-recommended')).toBe(false);
  });

  it('after placeDynamometer → pulse переходит на cyl-3', () => {
    exp.placeDynamometer(1);
    expect(getCard(host, 'dynamometer-1').classList.contains('pulse-recommended')).toBe(false);
    expect(getCard(host, 'cyl-3').classList.contains('pulse-recommended')).toBe(true);
  });

  it('after attachCylinder → pulse выключается (ждём CTA)', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    // pulse-recommended должен быть снят со всех карточек
    for (const c of host.querySelectorAll<HTMLElement>('lab-equipment-card')) {
      expect(c.classList.contains('pulse-recommended')).toBe(false);
    }
  });

  it('after recordCurrentReading в air → pulse на beaker', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    expect(getCard(host, 'beaker').classList.contains('pulse-recommended')).toBe(true);
  });

  // ─── HintEngine: inactivity подсказка ──────────────────────────────

  it('inactivity ≥ 6с в фазе idle → текст подсказки в hint-bar', () => {
    vi.useFakeTimers();
    try {
      // mount уже произошёл в beforeEach без fake-timers — engine успел стартовать
      // первый таймер. Поднимем его заново перетаскиванием/сменой фазы.
      // Берём свежий engine + ставим idle, выгрузив hint-bar текст.
      const hint = host.querySelector<HTMLElement>('#ar-hint')!;
      const baseline = hint.textContent;
      // Симулируем activity → новый таймер
      exp.getHintEngine().setPhase('idle');
      exp.getHintEngine().trackActivity();
      vi.advanceTimersByTime(6500);
      // Текст подсказки должен прийти от HintEngine — мягкая подсказка.
      // Не проверяем точное содержание, только что обновился (и не = baseline).
      expect(hint.textContent).toBeTruthy();
      // Содержит "динамометр" (из INACTIVITY_HINTS.idle)
      expect(hint.textContent).toMatch(/динамометр/i);
      void baseline;
    } finally {
      vi.useRealTimers();
    }
  });

  // ─── Stepper динамика ──────────────────────────────────────────────

  it('step 1 active в idle, остальные — pending', () => {
    const steps = host.querySelectorAll<HTMLElement>('.step');
    expect(steps[0]!.dataset['state']).toBe('active');
    expect(steps[1]!.dataset['state']).toBeUndefined();
    // Шаг 7 (bonus) — скрыт
    const step7 = host.querySelector<HTMLElement>('.step[data-step="7"]');
    expect(step7!.hidden).toBe(true);
  });

  it('после full happy-path — step 1-6 done, step 7 active', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    expect(exp.getState()).toBe('liquid-recorded');

    const steps = host.querySelectorAll<HTMLElement>('.step');
    // Strict ФИПИ-gate (фикс UX 2026-05-07): шаги 1..6 — done строго по
    // фактическим данным (dynoRange/cylinderId/journalRows). После полного
    // цикла все шесть в done; «active» остаётся только bonus-шаг 7.
    for (let i = 0; i < 6; i++) {
      expect(steps[i]!.dataset['state']).toBe('done');
    }
    const step7 = host.querySelector<HTMLElement>('.step[data-step="7"]');
    expect(step7!.hidden).toBe(false);
    expect(step7!.dataset['state']).toBe('active');
  });

  it('step 3 переходит в done сразу после P_возд (даже до cur=4)', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    const steps = host.querySelectorAll<HTMLElement>('.step');
    // phase='air-recorded' → cur=4. Шаг 3 done.
    expect(steps[2]!.dataset['state']).toBe('done');
    expect(steps[3]!.dataset['state']).toBe('active');
  });

  // ─── Strict ФИПИ-gate шага 3 (UX-фикс 2026-05-07) ───────────────────

  it('strict gate: налили воду до записи P_возд → шаг 3 в warning, не done', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    // Пропускаем шаг 3 (запись P_возд) и сразу наливаем воду.
    exp.placeBeaker();
    exp.pourWater(150);
    const steps = host.querySelectorAll<HTMLElement>('.step');
    // Шаг 1 (поставил динамометр) — done.
    expect(steps[0]!.dataset['state']).toBe('done');
    // Шаг 2 (повесил цилиндр) — done.
    expect(steps[1]!.dataset['state']).toBe('done');
    // Шаг 3 (P_возд) — warning, мягкое напоминание «вы пропустили». Это
    // первый non-done шаг → он же claimed как «active», но override на
    // warning делает его более выделенным.
    expect(steps[2]!.dataset['state']).toBe('warning');
    // Шаг 4 (вода) — done (вода налита физически).
    expect(steps[3]!.dataset['state']).toBe('done');
    // Шаг 5 (погружение) — pending (gate: предыдущий 3 не done → не active).
    expect(steps[4]!.dataset['state']).toBeUndefined();
  });

  it('strict gate: погрузили цилиндр без записи P_возд → шаг 3 warning, шаг 5 done', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(150);
    // Перешли к погружению, всё ещё пропустив P_возд.
    exp.dipCylinderInWater();
    const steps = host.querySelectorAll<HTMLElement>('.step');
    // 3 — warning (первый non-done + warning override из-за пропуска).
    expect(steps[2]!.dataset['state']).toBe('warning');
    // 5 — done (погружение действительно произошло).
    expect(steps[4]!.dataset['state']).toBe('done');
    // 6 — pending (gate: 3 ещё не done, активный шаг — 3, не 6).
    expect(steps[5]!.dataset['state']).toBeUndefined();
  });

  it('strict gate: после записи P_возд warning со шага 3 уходит в done', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(150);
    let steps = host.querySelectorAll<HTMLElement>('.step');
    expect(steps[2]!.dataset['state']).toBe('warning');
    // Теперь записываем P_возд (CTA доступна, цилиндр в воздухе).
    exp.recordCurrentReading();
    steps = host.querySelectorAll<HTMLElement>('.step');
    expect(steps[2]!.dataset['state']).toBe('done');
  });

  // ─── Click-to-dip / drag-by-thread (programmatic surface) ─────────────

  it('click-to-dip: клик на cylinder-host в фазе water-poured → погружение', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(150);
    expect(exp.getFullState().inWater).toBe(false);
    // cylinderHost имеет click-handler оркестратора. data-can-dip — UX-affordance.
    const cylHost = host.querySelector<HTMLElement>('#ar-cylinder-host')!;
    expect(cylHost.getAttribute('data-can-dip')).toBe('true');
    cylHost.click();
    expect(exp.getFullState().inWater).toBe(true);
    expect(cylHost.getAttribute('data-can-dip')).toBeNull();
    expect(cylHost.getAttribute('data-can-lift')).toBe('true');
  });

  it('click-to-lift: клик на cylinder-host в фазе cyl-in-water → подъём', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    const cylHost = host.querySelector<HTMLElement>('#ar-cylinder-host')!;
    expect(cylHost.getAttribute('data-can-lift')).toBe('true');
    cylHost.click();
    expect(exp.getFullState().inWater).toBe(false);
  });

  it('keyboard: Enter на cylinder-host в water-poured → dip; ArrowUp в воде → lift', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(150);
    const cylHost = host.querySelector<HTMLElement>('#ar-cylinder-host')!;
    cylHost.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(exp.getFullState().inWater).toBe(true);
    cylHost.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(exp.getFullState().inWater).toBe(false);
  });

  it('a11y: cylinder-host получает tabindex/role=button когда жест доступен', () => {
    const cylHost = host.querySelector<HTMLElement>('#ar-cylinder-host')!;
    expect(cylHost.getAttribute('tabindex')).toBeNull();
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(150);
    expect(cylHost.getAttribute('tabindex')).toBe('0');
    expect(cylHost.getAttribute('role')).toBe('button');
    // ARIA-label не палит ответ (в нём не должно быть числа).
    const label = cylHost.getAttribute('aria-label') ?? '';
    expect(label).not.toMatch(/\d+[,.]\d/);
  });

  it('cylinder-host без воды (water=0) — clicks не дают dip', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    // Воду не наливаем.
    const cylHost = host.querySelector<HTMLElement>('#ar-cylinder-host')!;
    expect(cylHost.getAttribute('data-can-dip')).toBeNull();
    cylHost.click();
    expect(exp.getFullState().inWater).toBe(false);
  });

  // ─── Большая CTA с числом + anti-spoiler aria-label ───────────────────

  it('CTA: визуальный label содержит P возд = 0,65 Н, aria-label — без числа', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    const btn = host.querySelector<HTMLButtonElement>('#ar-record-btn')!;
    const lbl = host.querySelector<HTMLElement>('#ar-record-label')!;
    expect(btn.hidden).toBe(false);
    // Визуально число есть (RU-формат с запятой).
    expect(lbl.textContent).toMatch(/0,\d{2}\s*Н/);
    expect(lbl.textContent).toContain('Записать P возд');
    // aria-label НЕ содержит число (анти-спойлер).
    expect(btn.getAttribute('aria-label')).toBe('Записать P возд');
  });

  it('CTA: для P_жид тоже соблюдён anti-spoiler в aria-label', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    const btn = host.querySelector<HTMLButtonElement>('#ar-record-btn')!;
    const lbl = host.querySelector<HTMLElement>('#ar-record-label')!;
    expect(lbl.textContent).toContain('Записать P жид');
    // aria-label не содержит число.
    expect(btn.getAttribute('aria-label')).toBe('Записать P жид');
  });

  it('CTA: data-mode=air когда цилиндр в воздухе, liquid — в воде', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    const btn = host.querySelector<HTMLButtonElement>('#ar-record-btn')!;
    expect(btn.getAttribute('data-mode')).toBe('air');
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    expect(btn.getAttribute('data-mode')).toBe('liquid');
  });

  // ─── Reset → undo-toast ────────────────────────────────────────────

  it('reset(true) показывает toast «Опыт сброшен» с action «Отменить»', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.reset(true);
    // Сразу после — toast появился в body
    const toast = document.querySelector('lab-toast') as HTMLElement | null;
    expect(toast).not.toBeNull();
    expect(toast!.getAttribute('message')).toMatch(/сброшен/i);
    expect(toast!.getAttribute('action-label')).toBe('Отменить');
    expect(toast!.dataset['undoId']).toBe('reset');
    // State уже сброшен.
    expect(exp.getState()).toBe('idle');
  });

  it('reset(true) на пустом state НЕ показывает toast (нечего откатывать)', () => {
    exp.reset(true);
    expect(document.querySelector('lab-toast')).toBeNull();
  });

  it('action-clicked на reset-toast — восстанавливает state', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    expect(exp.getJournalRows()).toHaveLength(1);

    exp.reset(true);
    expect(exp.getJournalRows()).toHaveLength(0);

    // Симулируем клик «Отменить» через UndoStack.peek
    const top = exp.getUndoStack().peek('reset');
    expect(top).not.toBeNull();
    exp.getUndoStack().undo();

    // Состояние восстановлено
    expect(exp.getJournalRows()).toHaveLength(1);
    expect(exp.getFullState().cylinderId).toBe(3);
    expect(exp.getFullState().dynoRange).toBe(1);
  });

  // ─── Commit → CTA-toast «Записано» ─────────────────────────────────

  it('commit P_возд показывает success-toast с числом в RU-формате', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    const toast = document.querySelector('lab-toast');
    expect(toast).not.toBeNull();
    expect(toast!.getAttribute('severity')).toBe('success');
    // 0.65 Н в RU → "0,65"
    expect(toast!.getAttribute('message')).toMatch(/0,\d{2} Н/);
  });

  it('action-clicked на commit-toast — удаляет строку журнала', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    expect(exp.getJournalRows()).toHaveLength(1);
    // Откатываем через стек
    exp.getUndoStack().undo();
    expect(exp.getJournalRows()).toHaveLength(0);
    // Phase должна вернуться в cyl-attached
    expect(exp.getState()).toBe('cyl-attached');
  });

  it('commit P_жид показывает success-toast', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    // Удалим тост с air, чтобы не путать
    document.querySelectorAll('lab-toast').forEach((t) => t.parentNode?.removeChild(t));
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    const toast = document.querySelector('lab-toast');
    expect(toast).not.toBeNull();
    expect(toast!.getAttribute('message')).toMatch(/P жид/i);
  });

  // ─── Auto-save round-trip ──────────────────────────────────────────

  it('auto-save: после commit P_возд → snapshot в localStorage', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    // commit зовёт saveImmediate — нет throttle delay
    const raw = localStorage.getItem(ARCHIMEDES_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
    expect(parsed.payload.phase).toBe('air-recorded');
    expect(parsed.payload.cylinderId).toBe(3);
    expect(parsed.payload.journalRows).toHaveLength(1);
  });

  it('restore: при втором mount после full-cycle — state восстанавливается', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.flushAutoSave();

    // unmount + new mount — должен прочитать localStorage
    screen.unmount();
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    screen = new ArchimedesScreen();
    screen.mount(host);
    const exp2 = (window as unknown as { archimedesExperiment: ArchimedesExperiment }).archimedesExperiment;

    expect(exp2.getState()).toBe('liquid-recorded');
    expect(exp2.getJournalRows()).toHaveLength(1);
    expect(exp2.getFullState().cylinderId).toBe(3);
    expect(exp2.getFullState().beakerOnScene).toBe(true);
    expect(exp2.getFullState().waterMl).toBe(150);
    expect(exp2.getFullState().inWater).toBe(true);
    // А ещё показан restore-toast
    const restoreToast = document.querySelector('lab-toast[data-undo-id="restore"]');
    expect(restoreToast).not.toBeNull();
    expect(restoreToast!.getAttribute('message')).toMatch(/Восстановлено/i);
  });

  it('restore: пустой start-state НЕ показывает restore-toast', () => {
    // Не делаем ничего → snapshot пуст → restore пропускает.
    exp.flushAutoSave();
    screen.unmount();
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    screen = new ArchimedesScreen();
    screen.mount(host);
    const restoreToast = document.querySelector('lab-toast[data-undo-id="restore"]');
    expect(restoreToast).toBeNull();
  });

  it('action-clicked на restore-toast — сбрасывает state и очищает storage', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.flushAutoSave();
    screen.unmount();
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    screen = new ArchimedesScreen();
    screen.mount(host);
    const exp2 = (window as unknown as { archimedesExperiment: ArchimedesExperiment }).archimedesExperiment;
    expect(exp2.getJournalRows()).toHaveLength(1);

    // Имитируем «Сбросить» на restore-toast
    exp2.getUndoStack().undo();
    expect(exp2.getState()).toBe('idle');
    expect(exp2.getJournalRows()).toHaveLength(0);
    expect(localStorage.getItem(ARCHIMEDES_STORAGE_KEY)).toBeNull();
  });

  it('expired snapshot (старше 1ч) — не восстанавливается, очищается', () => {
    // Запишем «старый» snapshot вручную, на час старше now
    const stale = {
      version: 1,
      savedAt: Date.now() - 60 * 60 * 1000 - 5_000,
      payload: {
        phase: 'cyl-in-water',
        dynoRange: 1,
        cylinderId: 3,
        beakerOnScene: true,
        waterMl: 200,
        inWater: true,
        forceTargetN: 0.1,
        overloaded: false,
        partialDip: false,
        bottomTouch: false,
        bannerText: null,
        completedCylinders: [],
        journalRows: [],
      },
    };
    screen.unmount();
    localStorage.setItem(ARCHIMEDES_STORAGE_KEY, JSON.stringify(stale));
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    screen = new ArchimedesScreen();
    screen.mount(host);
    const exp2 = (window as unknown as { archimedesExperiment: ArchimedesExperiment }).archimedesExperiment;
    expect(exp2.getState()).toBe('idle');
    expect(localStorage.getItem(ARCHIMEDES_STORAGE_KEY)).toBeNull();
  });

  it('malformed snapshot — silently очищается, опыт стартует с idle', () => {
    screen.unmount();
    localStorage.setItem(ARCHIMEDES_STORAGE_KEY, 'НЕ JSON');
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    screen = new ArchimedesScreen();
    screen.mount(host);
    const exp2 = (window as unknown as { archimedesExperiment: ArchimedesExperiment }).archimedesExperiment;
    expect(exp2.getState()).toBe('idle');
    expect(localStorage.getItem(ARCHIMEDES_STORAGE_KEY)).toBeNull();
  });

  // ─── Toast — переиспользование одного id ────────────────────────────

  it('два commit подряд — только один shown-toast id=record (старый dismiss)', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(150);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    // Один LIVE (data-shown) тост — второй (P_жид) видимый, первый (P_возд)
    // при показе нового был dismiss'нут (slide-out может ещё идти).
    const liveToasts = document.querySelectorAll(
      'lab-toast[data-undo-id="record"][data-shown]',
    );
    expect(liveToasts.length).toBe(1);
  });

  // ─── HintEngine integration check ──────────────────────────────────

  it('getHintEngine() возвращает текущий engine с актуальной фазой', () => {
    const engine = exp.getHintEngine();
    expect(engine.getPhase()).toBe('idle');
    exp.placeDynamometer(1);
    expect(engine.getPhase()).toBe('dyno-on-scene');
  });
});
