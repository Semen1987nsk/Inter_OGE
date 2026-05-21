/**
 * motion.test.ts — entrance-анимация приборов опыта 1.3.
 *
 * Проверяет, что после mountInStage соответствующий DOM-элемент
 * получает CSS-класс, запускающий анимацию.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArchimedesVolumeScreen } from '../ArchimedesVolumeScreen';
import type { ArchimedesVolumeExperiment } from '../ArchimedesVolumeExperiment';

async function registerComponents(): Promise<void> {
  await import('../../../ui/components/lab-equipment-card');
  await import('../../../ui/components/lab-metal-weight');
  await import('../../../ui/components/lab-dynamometer');
  await import('../../../ui/components/lab-beaker');
  await import('../../../ui/components/lab-thread');
}

describe('Опыт 1.3 — entrance-анимация', () => {
  let host: HTMLElement;
  let screen: ArchimedesVolumeScreen;
  let exp: ArchimedesVolumeExperiment;
  let root: HTMLElement;

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
    expect(exp).toBeTruthy();
    root = host;
  });

  afterEach(() => {
    screen.unmount();
    document.body.replaceChildren();
    globalThis.gc?.();
  });

  it('beaker-mount получает entrance-класс при placeBeaker', () => {
    exp.placeDynamometer();
    exp.attachCylinder();
    exp.placeBeaker();
    const mount = root.querySelector('#av-beaker-mount')!;
    expect(mount.classList.contains('av-beaker-mount--entering')).toBe(true);
  });

  it('entrance-класс beaker-mount снимается после animationend', () => {
    exp.placeDynamometer();
    exp.attachCylinder();
    exp.placeBeaker();
    const mount = root.querySelector('#av-beaker-mount')!;
    expect(mount.classList.contains('av-beaker-mount--entering')).toBe(true);
    mount.dispatchEvent(new Event('animationend'));
    expect(mount.classList.contains('av-beaker-mount--entering')).toBe(false);
  });

  it('cylinder-rig получает opacity-entrance-класс при attachCylinder', () => {
    exp.placeDynamometer();
    exp.attachCylinder();
    const rig = root.querySelector('#av-cylinder-rig')!;
    expect(rig.classList.contains('av-cylinder-rig--entering')).toBe(true);
  });

  it('dyno-mount получает entrance-класс при placeDynamometer', () => {
    exp.placeDynamometer();
    const mount = root.querySelector('#av-dyno-mount')!;
    expect(mount.classList.contains('av-dyno-mount--entering')).toBe(true);
  });
});

describe('Опыт 1.3 — чистка clutter', () => {
  let host: HTMLElement;
  let screen: ArchimedesVolumeScreen;
  let exp: ArchimedesVolumeExperiment;
  let root: HTMLElement;

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
    expect(exp).toBeTruthy();
    root = host;
  });

  afterEach(() => {
    screen.unmount();
    document.body.replaceChildren();
    globalThis.gc?.();
  });

  it('depth-label виден и left — валидное число (позиционирование слева)', () => {
    exp.placeDynamometer();
    exp.attachCylinder();
    exp.placeBeaker();
    exp.fixateBaseline();
    exp.submergeTo(20);
    const label = root.querySelector('#av-depth-label') as HTMLElement;
    expect(label.hidden).toBe(false);
    expect(label.style.left).toMatch(/^\d+px$/);
    expect(label.style.left).not.toBe('0px'); // clamp Math.max(4,...) => минимум 4px
  });
});

describe('lab-beaker — реализм воды', () => {
  it('playFill() навешивает класс налива на группу жидкости', () => {
    const beaker = document.createElement('lab-beaker') as any;
    beaker.setAttribute('level', '200');
    document.body.appendChild(beaker);
    beaker.playFill();
    const liquid = beaker.shadowRoot.querySelector('.bk-liquid');
    expect(liquid.classList.contains('bk-liquid--filling')).toBe(true);
    beaker.remove();
  });

  it('контактная тень присутствует в SVG', () => {
    const beaker = document.createElement('lab-beaker') as any;
    document.body.appendChild(beaker);
    expect(beaker.shadowRoot.querySelector('.bk-contact-shadow')).not.toBeNull();
    beaker.remove();
  });

  it('playFill() идемпотентен при повторном вызове', () => {
    const beaker = document.createElement('lab-beaker') as any;
    document.body.appendChild(beaker);
    beaker.playFill();
    beaker.playFill();
    const liquid = beaker.shadowRoot.querySelector('.bk-liquid');
    expect(liquid.classList.contains('bk-liquid--filling')).toBe(true);
    beaker.remove();
  });

  it('playFill() под reduce не оставляет класс налива', () => {
    const orig = window.matchMedia;
    (window.matchMedia as any) = (q: string) => ({ matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } });
    try {
      const beaker = document.createElement('lab-beaker') as any;
      document.body.appendChild(beaker);
      beaker.playFill();
      const liquid = beaker.shadowRoot.querySelector('.bk-liquid');
      expect(liquid.classList.contains('bk-liquid--filling')).toBe(false);
      beaker.remove();
    } finally {
      window.matchMedia = orig;
    }
  });
});
