import { describe, expect, it } from 'vitest';
import '@/ui/components/lab-composite-weight';
import { LabCompositeTray } from '@/ui/components/lab-composite-tray';

describe('LabCompositeTray', () => {
  it('returns a dropped disc element from overlay into its used slot', () => {
    const tray = document.createElement('lab-composite-tray') as LabCompositeTray;
    const overlay = document.createElement('div');
    document.body.append(tray, overlay);

    const disc = tray.querySelector<HTMLElement>(
      'lab-composite-weight[kind="disc"][mass="10"]',
    );
    expect(disc).toBeTruthy();
    if (!disc) return;

    overlay.appendChild(disc);
    disc.style.position = 'fixed';
    disc.style.left = '120px';
    disc.style.top = '80px';
    disc.style.zIndex = '1000';
    disc.style.transform = 'translateX(10px)';
    disc.style.marginTop = '12px';
    disc.setAttribute('dragging', '');

    expect(tray.addDisc(10, disc)).toBe(true);

    const slot = tray.querySelector<HTMLElement>('.ct-disc-slot[data-disc-mass="10"]');
    expect(slot).toBeTruthy();
    expect(slot?.dataset['state']).toBe('used');
    expect(disc.parentElement).toBe(slot);
    expect(overlay.children.length).toBe(0);
    expect(disc.hasAttribute('dragging')).toBe(false);
    expect(disc.style.position).toBe('');
    expect(disc.style.left).toBe('');
    expect(disc.style.top).toBe('');
    expect(disc.style.zIndex).toBe('');
    expect(disc.style.transform).toBe('');
    expect(disc.style.marginTop).toBe('');
    expect(tray.getMass()).toBe(20);

    document.body.replaceChildren();
  });
});
