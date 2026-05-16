/**
 * HintEngine — unit tests (этап 6c).
 *
 * Проверяем:
 *   - inactivity таймер вызывает onHint после установленного таймаута;
 *   - failedDropsThreshold даёт warning-hint после 3 фейлов;
 *   - setPhase меняет ambient-pulse target и сбрасывает inactivity;
 *   - dispose останавливает таймеры (callback не приходит после dispose);
 *   - trackActivity сбрасывает таймер;
 *   - smena phase сбрасывает счётчик failed-drops.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HintEngine, type HintPayload } from '../HintEngine';

describe('HintEngine — implicit scaffolding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('config defaults — 6с inactivity, 3 failed drops, 1500мс pulse', () => {
    const engine = new HintEngine();
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.setPhase('idle');
    // Не сработало через 5с
    vi.advanceTimersByTime(5000);
    expect(hints).toHaveLength(0);
    // Сработало через 6с (точнее 6001 — лимит ровно на default 6000)
    vi.advanceTimersByTime(1500);
    expect(hints).toHaveLength(1);
    expect(hints[0]!.text).toMatch(/динамометр/i);
    engine.dispose();
  });

  it('setPhase("dyno-on-scene") → ambient pulse идёт на cyl-3', () => {
    const engine = new HintEngine();
    const pulses: (string | null)[] = [];
    engine.onAmbientPulse((id) => pulses.push(id));
    engine.setPhase('dyno-on-scene');
    expect(pulses[pulses.length - 1]).toBe('cyl-3');
    expect(engine.getCurrentPulseTarget()).toBe('cyl-3');
    engine.dispose();
  });

  it('setPhase("idle") → ambient pulse на dynamometer-1', () => {
    const engine = new HintEngine();
    const pulses: (string | null)[] = [];
    engine.onAmbientPulse((id) => pulses.push(id));
    engine.setPhase('idle');
    expect(pulses[pulses.length - 1]).toBe('dynamometer-1');
    engine.dispose();
  });

  it('setPhase("cyl-attached") → pulse выключается (null) — ждём CTA', () => {
    const engine = new HintEngine();
    engine.setPhase('idle');
    const pulses: (string | null)[] = [];
    engine.onAmbientPulse((id) => pulses.push(id));
    engine.setPhase('cyl-attached');
    expect(pulses[pulses.length - 1]).toBeNull();
    engine.dispose();
  });

  it('trackActivity сбрасывает inactivity-таймер', () => {
    const engine = new HintEngine({ inactivityTimeoutMs: 6000 });
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.setPhase('idle');
    vi.advanceTimersByTime(4000);
    engine.trackActivity();
    vi.advanceTimersByTime(4000);
    expect(hints).toHaveLength(0); // не дошёл до 6с с момента последнего activity
    vi.advanceTimersByTime(2500);
    expect(hints).toHaveLength(1);
    engine.dispose();
  });

  it('trackFailedDrop ×3 → warning hint', () => {
    const engine = new HintEngine();
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.setPhase('idle');
    engine.trackFailedDrop();
    engine.trackFailedDrop();
    expect(hints).toHaveLength(0);
    engine.trackFailedDrop();
    expect(hints).toHaveLength(1);
    expect(hints[0]!.severity).toBe('warning');
    expect(hints[0]!.text).toMatch(/жёлт|пунктир|совместим/i);
    engine.dispose();
  });

  it('после warning счётчик failed-drops сбрасывается', () => {
    const engine = new HintEngine({ failedDropsThreshold: 2 });
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.setPhase('idle');
    engine.trackFailedDrop();
    engine.trackFailedDrop(); // 1-й warning
    expect(hints).toHaveLength(1);
    engine.trackFailedDrop(); // НЕ должен сразу — счётчик обнулён
    expect(hints).toHaveLength(1);
    engine.trackFailedDrop(); // вот теперь
    expect(hints).toHaveLength(2);
    engine.dispose();
  });

  it('смена фазы обнуляет failed-drops', () => {
    const engine = new HintEngine({ failedDropsThreshold: 3 });
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.setPhase('idle');
    engine.trackFailedDrop();
    engine.trackFailedDrop();
    expect(engine.getFailedDropCount()).toBe(2);
    engine.setPhase('dyno-on-scene');
    expect(engine.getFailedDropCount()).toBe(0);
    engine.trackFailedDrop();
    expect(hints).toHaveLength(0);
    engine.dispose();
  });

  it('dispose() останавливает inactivity-callback', () => {
    const engine = new HintEngine({ inactivityTimeoutMs: 1000 });
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.setPhase('idle');
    vi.advanceTimersByTime(500);
    engine.dispose();
    vi.advanceTimersByTime(2000);
    expect(hints).toHaveLength(0);
  });

  it('после dispose trackActivity и trackFailedDrop — no-op', () => {
    const engine = new HintEngine();
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.dispose();
    engine.trackActivity();
    engine.trackFailedDrop();
    engine.trackFailedDrop();
    engine.trackFailedDrop();
    vi.advanceTimersByTime(10000);
    expect(hints).toHaveLength(0);
  });

  it('повторный setPhase той же фазы — не вызывает onAmbientPulse повторно', () => {
    const engine = new HintEngine();
    engine.setPhase('idle');
    const pulses: (string | null)[] = [];
    engine.onAmbientPulse((id) => pulses.push(id));
    // onAmbientPulse сразу зовёт callback с текущим target — это контракт
    expect(pulses).toHaveLength(1);
    engine.setPhase('idle');
    engine.setPhase('idle');
    // Второй setPhase той же фазы — нет нового вызова
    expect(pulses).toHaveLength(1);
    engine.dispose();
  });

  it('inactivity hint содержит корректный targetCardId для фазы', () => {
    const engine = new HintEngine({ inactivityTimeoutMs: 100 });
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.setPhase('air-recorded');
    vi.advanceTimersByTime(150);
    expect(hints).toHaveLength(1);
    expect(hints[0]!.targetCardId).toBe('beaker');
    engine.dispose();
  });

  it('config-overrides уважаются: inactivityTimeoutMs=200', () => {
    const engine = new HintEngine({ inactivityTimeoutMs: 200 });
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.setPhase('idle');
    vi.advanceTimersByTime(150);
    expect(hints).toHaveLength(0);
    vi.advanceTimersByTime(80);
    expect(hints).toHaveLength(1);
    engine.dispose();
  });

  it('inactivityTimeoutMs=0 — таймер не запускается (нулевой таймаут == off)', () => {
    const engine = new HintEngine({ inactivityTimeoutMs: 0 });
    const hints: HintPayload[] = [];
    engine.onHint((h) => hints.push(h));
    engine.setPhase('idle');
    vi.advanceTimersByTime(60_000);
    expect(hints).toHaveLength(0);
    engine.dispose();
  });

  it('getPhase возвращает текущую фазу', () => {
    const engine = new HintEngine();
    expect(engine.getPhase()).toBe('idle');
    engine.setPhase('cyl-in-water');
    expect(engine.getPhase()).toBe('cyl-in-water');
    engine.dispose();
  });
});
