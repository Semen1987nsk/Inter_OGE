/**
 * KitShell integration tests — mount/unmount, persist, screen switching.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KitShell } from '../KitShell';
import type { IScreen, ScreenId, ScreenMeta } from '../IScreen';

class FakeScreen implements IScreen {
  readonly meta: ScreenMeta;
  mountCalls = 0;
  unmountCalls = 0;
  saveCalls = 0;
  loadCalls = 0;
  state = 0;
  loadedSnapshot: unknown = null;

  constructor(id: ScreenId, label = `Fake ${id}`) {
    this.meta = {
      id,
      label,
      kicker: id,
      icon: 'spring',
      tooltip: label,
    };
  }

  mount(host: HTMLElement): void {
    this.mountCalls++;
    host.innerHTML = `<div class="fake-${this.meta.id}">${this.meta.label}</div>`;
  }

  unmount(): void {
    this.unmountCalls++;
  }

  saveState(): unknown {
    this.saveCalls++;
    return { state: this.state };
  }

  loadState(snapshot: unknown): void {
    this.loadCalls++;
    this.loadedSnapshot = snapshot;
  }
}

describe('KitShell', () => {
  let host: HTMLElement;
  let s1: FakeScreen, s2: FakeScreen, s3: FakeScreen;
  let shell: KitShell;

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    host = document.createElement('div');
    document.body.appendChild(host);
    s1 = new FakeScreen('spring-stiffness');
    s2 = new FakeScreen('spring-elastic');
    s3 = new FakeScreen('friction');
    shell = new KitShell(host, [s1, s2, s3], 'spring-stiffness');
  });

  afterEach(() => {
    shell.destroy();
    host.remove();
  });

  it('KS-1: start() монтирует default screen', async () => {
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(s1.mountCalls).toBe(1);
    expect(s2.mountCalls).toBe(0);
    expect(s3.mountCalls).toBe(0);
    expect(host.querySelector('.fake-spring-stiffness')).toBeTruthy();
  });

  it('KS-2: start() с URL ?screen=friction монтирует friction', async () => {
    window.history.replaceState({}, '', '/?screen=friction');
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(s3.mountCalls).toBe(1);
    expect(s1.mountCalls).toBe(0);
  });

  it('KS-3: navigate переключает screens (unmount old + mount new)', async () => {
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    shell.navigate('friction');
    await new Promise((r) => setTimeout(r, 0));
    expect(s1.unmountCalls).toBe(1);
    expect(s3.mountCalls).toBe(1);
    expect(host.querySelector('.fake-friction')).toBeTruthy();
    expect(host.querySelector('.fake-spring-stiffness')).toBeFalsy();
  });

  it('KS-4: повторный navigate тем же id не делает unmount/mount', async () => {
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    shell.navigate('spring-stiffness');
    await new Promise((r) => setTimeout(r, 0));
    expect(s1.mountCalls).toBe(1);
    expect(s1.unmountCalls).toBe(0);
  });

  it('KS-5: persist — saveState вызывается при unmount', async () => {
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    s1.state = 42;
    shell.navigate('friction');
    await new Promise((r) => setTimeout(r, 0));
    expect(s1.saveCalls).toBe(1);
    const stored = localStorage.getItem('kit-2-forces:screen:spring-stiffness');
    expect(stored).toContain('42');
  });

  it('KS-6: persist — loadState вызывается после mount если есть snapshot', async () => {
    localStorage.setItem(
      'kit-2-forces:screen:spring-stiffness',
      JSON.stringify({ state: 100 }),
    );
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(s1.loadCalls).toBe(1);
    expect(s1.loadedSnapshot).toEqual({ state: 100 });
  });

  it('KS-7: loadState НЕ вызывается если snapshot отсутствует', async () => {
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(s1.loadCalls).toBe(0);
  });

  it('KS-8: невалидный id в URL → fallback на default', async () => {
    window.history.replaceState({}, '', '/?screen=nonexistent');
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(s1.mountCalls).toBe(1);
  });

  it('KS-9: 5 переключений подряд — mount/unmount счёт сбалансирован', async () => {
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    const targets: ScreenId[] = ['friction', 'spring-elastic', 'friction', 'spring-stiffness', 'friction'];
    for (const id of targets) {
      shell.navigate(id);
      await new Promise((r) => setTimeout(r, 0));
    }
    // Каждый screen, который активирован, должен в итоге unmount'нуться кроме последнего.
    // S3 (friction) активен последним → mountCalls = 3, unmountCalls = 2.
    expect(s3.mountCalls).toBe(3);
    expect(s3.unmountCalls).toBe(2);
    expect(s1.mountCalls).toBe(2); // initial + spring-stiffness
    expect(s2.mountCalls).toBe(1);
  });

  it('KS-10: destroy() unmount-ит активный screen и снимает listeners', async () => {
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    shell.destroy();
    expect(s1.unmountCalls).toBeGreaterThanOrEqual(1);
  });

  it('KS-11: onScreenChanged вызывается при каждой смене', async () => {
    const cb = vi.fn();
    shell.onScreenChanged(cb);
    shell.start();
    await new Promise((r) => setTimeout(r, 0));
    shell.navigate('friction');
    await new Promise((r) => setTimeout(r, 0));
    shell.navigate('spring-elastic');
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).toHaveBeenCalledWith('spring-stiffness');
    expect(cb).toHaveBeenCalledWith('friction');
    expect(cb).toHaveBeenCalledWith('spring-elastic');
  });

  it('KS-12: defaultId вне реестра → constructor бросает RangeError', () => {
    expect(
      () => new KitShell(host, [s1, s2], 'friction' as ScreenId),
    ).toThrow(RangeError);
  });
});
