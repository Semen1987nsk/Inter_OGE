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

  it('cylinder-rig получает opacity-entrance-класс при attachCylinder', () => {
    exp.placeDynamometer();
    exp.attachCylinder();
    const rig = root.querySelector('#av-cylinder-rig')!;
    expect(rig.classList.contains('av-cylinder-rig--entering')).toBe(true);
  });
});
