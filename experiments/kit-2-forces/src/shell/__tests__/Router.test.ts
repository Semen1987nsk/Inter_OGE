/**
 * Router unit tests — проверка URL-парсинга, навигации, popstate.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Router } from '../Router';
import type { ScreenId } from '../IScreen';

const VALID_IDS: ScreenId[] = ['spring-stiffness', 'spring-elastic', 'friction'];

describe('Router', () => {
  let onChange: ReturnType<typeof vi.fn>;
  let router: Router<ScreenId>;

  beforeEach(() => {
    // Сброс URL перед каждым тестом
    window.history.replaceState({}, '', '/');
    onChange = vi.fn();
    router = new Router<ScreenId>(VALID_IDS, onChange);
  });

  afterEach(() => {
    router.destroy();
  });

  it('R-1: read() возвращает null когда ?screen= не задан', () => {
    expect(router.read()).toBeNull();
  });

  it('R-2: read() возвращает screenId из ?screen=spring-stiffness', () => {
    window.history.replaceState({}, '', '/?screen=spring-stiffness');
    expect(router.read()).toBe('spring-stiffness');
  });

  it('R-3: read() возвращает null для невалидного screen=blah', () => {
    window.history.replaceState({}, '', '/?screen=invalid-screen');
    expect(router.read()).toBeNull();
  });

  it('R-4: navigate(id) обновляет URL и вызывает onChange', () => {
    router.navigate('friction');
    expect(window.location.search).toContain('screen=friction');
    expect(onChange).toHaveBeenCalledWith('friction');
  });

  it('R-5: navigate тем же screenId не вызывает onChange повторно', () => {
    router.navigate('friction');
    onChange.mockClear();
    router.navigate('friction');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('R-6: navigate невалидным id бросает RangeError', () => {
    expect(() => router.navigate('xyz' as ScreenId)).toThrow(RangeError);
  });

  it('R-7: start() сразу вызывает onChange с текущим URL', () => {
    window.history.replaceState({}, '', '/?screen=spring-elastic');
    onChange.mockClear();
    router.start();
    expect(onChange).toHaveBeenCalledWith('spring-elastic');
  });

  it('R-8: start() с пустым URL вызывает onChange(null)', () => {
    onChange.mockClear();
    router.start();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('R-9: popstate-event перезапускает onChange с новым URL', () => {
    onChange.mockClear();
    window.history.replaceState({}, '', '/?screen=friction');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onChange).toHaveBeenCalledWith('friction');
  });

  it('R-10: destroy() убирает popstate listener', () => {
    router.destroy();
    onChange.mockClear();
    window.history.replaceState({}, '', '/?screen=friction');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('R-11: navigate использует replaceState (не плодит history)', () => {
    const before = window.history.length;
    router.navigate('friction');
    router.navigate('spring-elastic');
    router.navigate('spring-stiffness');
    expect(window.history.length).toBe(before);
  });
});
