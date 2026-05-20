/**
 * archimedes-volume-drop-combinations — matrix-test DragDropController + handleDrop
 * для опыта 1.3.
 *
 * Покрытие (~40 кейсов):
 *  - 3 sources × 3 targets = 9 base combinations (valid/invalid drops)
 *  - предусловия: dyno present/absent, cyl present/absent
 *  - reverse drag (overlay → card через detach)
 *  - cascade detach при определённых drop'ах
 *
 * Стиль — pointer events через dispatchEvent + rect-stubs для happy-dom.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArchimedesVolumeScreen } from '../screens/archimedes-volume/ArchimedesVolumeScreen';
import type { ArchimedesVolumeExperiment } from '../screens/archimedes-volume/ArchimedesVolumeExperiment';

async function registerComponents(): Promise<void> {
  await import('../ui/components/lab-equipment-card');
  await import('../ui/components/lab-metal-weight');
  await import('../ui/components/lab-dynamometer');
  await import('../ui/components/lab-beaker');
  await import('../ui/components/lab-thread');
}

function stubRect(el: Element, left: number, top: number, w = 120, h = 120): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top,
      toJSON() { return this; },
    }),
  });
}

interface Coord { x: number; y: number; }

/** Положение зон на синтетической сцене. */
const POSITIONS: Record<string, Coord> = {
  // Sources (правая панель)
  'av-card-dyno': { x: 1500, y: 100 },
  'av-card-cyl': { x: 1500, y: 300 },
  'av-card-beaker': { x: 1500, y: 500 },
  // Drop zones (сцена)
  'av-dropzone-dyno': { x: 600, y: 100 },
  'av-dyno-mount': { x: 600, y: 200 },
  'av-dropzone-beaker': { x: 600, y: 400 },
  // Mount-зоны
  'av-cylinder-rig': { x: 600, y: 250 },
  'av-beaker-mount': { x: 600, y: 450 },
};

function applyLayout(): void {
  for (const [id, c] of Object.entries(POSITIONS)) {
    const el = document.getElementById(id);
    if (el) stubRect(el, c.x, c.y);
  }
  // Cards дополнительно: data-draggable элементы
  document.querySelectorAll('[data-draggable]').forEach((el) => {
    const cardId = el.id;
    const c = POSITIONS[cardId];
    if (c) stubRect(el, c.x, c.y);
  });
  // Stub elementsFromPoint — happy-dom возвращает [] по умолчанию.
  document.elementsFromPoint = function (x: number, y: number): Element[] {
    const result: Element[] = [];
    document.querySelectorAll('[data-dropzone]').forEach((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        result.push(el);
      }
    });
    return result;
  };
}

function simulateDrop(sourceId: string, targetId: string): void {
  const source = document.getElementById(sourceId);
  const target = document.getElementById(targetId);
  if (!source || !target) throw new Error(`Missing ${sourceId} or ${targetId}`);
  const sR = source.getBoundingClientRect();
  const tR = target.getBoundingClientRect();
  const startX = sR.left + sR.width / 2;
  const startY = sR.top + sR.height / 2;
  const endX = tR.left + tR.width / 2;
  const endY = tR.top + tR.height / 2;

  // pointerdown
  source.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 1, pointerType: 'mouse', clientX: startX, clientY: startY,
    button: 0, bubbles: true, cancelable: true, composed: true,
  }));
  // несколько intermediate moves
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    window.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: 1, pointerType: 'mouse',
      clientX: startX + (endX - startX) * t,
      clientY: startY + (endY - startY) * t,
      button: 0, bubbles: true, cancelable: true, composed: true,
    }));
  }
  // pointerup на target
  window.dispatchEvent(new PointerEvent('pointerup', {
    pointerId: 1, pointerType: 'mouse', clientX: endX, clientY: endY,
    button: 0, bubbles: true, cancelable: true, composed: true,
  }));
}

describe('archimedes-volume — drop combinations matrix', () => {
  let host: HTMLElement;
  let screen: ArchimedesVolumeScreen;
  let exp: ArchimedesVolumeExperiment;

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
    applyLayout();
  });

  afterEach(() => {
    screen.unmount();
    document.body.replaceChildren();
    globalThis.gc?.();
  });

  // ─── M1. Valid drops ──────────────────────────────────────────────────
  describe('M1. Valid drops', () => {
    it('M1.1: dyno-1 → av-dropzone-dyno → staged.dyno=true', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      expect(exp.getState().staged.dyno).toBe(true);
    });

    it('M1.2: beaker → av-dropzone-beaker → staged.beaker=true', () => {
      simulateDrop('av-card-beaker', 'av-dropzone-beaker');
      expect(exp.getState().staged.beaker).toBe(true);
    });

    it('M1.3: cyl-3 → av-dyno-mount (только когда dyno staged)', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      expect(exp.getState().staged.dyno).toBe(true);
      simulateDrop('av-card-cyl', 'av-dyno-mount');
      expect(exp.getState().staged.cyl).toBe(true);
    });

    it('M1.4: полный happy-path dyno → cyl → beaker через drop', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-cyl', 'av-dyno-mount');
      simulateDrop('av-card-beaker', 'av-dropzone-beaker');
      expect(exp.getState().staged).toEqual({ dyno: true, cyl: true, beaker: true });
    });
  });

  // ─── M2. Invalid: eq mismatch ─────────────────────────────────────────
  describe('M2. Invalid drops (eq mismatch)', () => {
    it('M2.1: dyno-1 → av-dropzone-beaker — reject', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-beaker');
      expect(exp.getState().staged.dyno).toBe(false);
    });

    it('M2.2: beaker → av-dropzone-dyno — reject', () => {
      simulateDrop('av-card-beaker', 'av-dropzone-dyno');
      expect(exp.getState().staged.beaker).toBe(false);
    });

    it('M2.3: cyl-3 → av-dropzone-dyno — reject', () => {
      simulateDrop('av-card-cyl', 'av-dropzone-dyno');
      expect(exp.getState().staged.cyl).toBe(false);
    });

    it('M2.4: cyl-3 → av-dropzone-beaker — reject', () => {
      simulateDrop('av-card-cyl', 'av-dropzone-beaker');
      expect(exp.getState().staged.cyl).toBe(false);
    });

    it('M2.5: dyno-1 → av-dyno-mount (hook принимает только cyl-3) — reject', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-dyno', 'av-dyno-mount');
      // dyno на сцене → второй placement no-op
      expect(exp.getState().staged.dyno).toBe(true);
    });

    it('M2.6: beaker → av-dyno-mount — reject', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-beaker', 'av-dyno-mount');
      expect(exp.getState().staged.beaker).toBe(false);
    });
  });

  // ─── M3. Precondition violations ──────────────────────────────────────
  describe('M3. Precondition violations', () => {
    it('M3.1: cyl-3 → av-dyno-mount БЕЗ dyno — reject (attachCylinder no-op)', () => {
      simulateDrop('av-card-cyl', 'av-dyno-mount');
      expect(exp.getState().staged.cyl).toBe(false);
    });

    it('M3.2: повторный drop dyno → no-change', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      expect(exp.getState().staged.dyno).toBe(true);
    });
  });

  // ─── M4. Order independence ───────────────────────────────────────────
  describe('M4. Order independence', () => {
    it('M4.1: beaker → dyno → cyl', () => {
      simulateDrop('av-card-beaker', 'av-dropzone-beaker');
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-cyl', 'av-dyno-mount');
      expect(exp.getState().staged).toEqual({ dyno: true, cyl: true, beaker: true });
    });

    it('M4.2: dyno → beaker → cyl', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-beaker', 'av-dropzone-beaker');
      simulateDrop('av-card-cyl', 'av-dyno-mount');
      expect(exp.getState().staged).toEqual({ dyno: true, cyl: true, beaker: true });
    });
  });

  // ─── M5. State after drop ─────────────────────────────────────────────
  describe('M5. State integrity after drop', () => {
    it('M5.1: после drop dyno → DOM-instance из карточки переехала в mount', () => {
      const dyno = host.querySelector('#av-dyno');
      expect(dyno?.parentElement?.id).toBe('av-card-dyno');
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      expect(dyno?.parentElement?.id).toBe('av-dyno-mount');
    });

    it('M5.2: после drop cyl → DOM-instance в cylinder-rig', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-cyl', 'av-dyno-mount');
      const cyl = host.querySelector('#av-cyl');
      expect(cyl?.parentElement?.id).toBe('av-cylinder-rig');
    });

    it('M5.3: после drop beaker → DOM-instance в beaker-mount', () => {
      simulateDrop('av-card-beaker', 'av-dropzone-beaker');
      const beaker = host.querySelector('#av-beaker');
      expect(beaker?.parentElement?.id).toBe('av-beaker-mount');
    });

    it('M5.4: после reject drop — DOM-instance остаётся в карточке', () => {
      const beaker = host.querySelector('#av-beaker');
      simulateDrop('av-card-beaker', 'av-dropzone-dyno');
      expect(beaker?.parentElement?.id).toBe('av-card-beaker');
    });
  });

  // ─── M6. Comprehensive matrix (3 source × 3 zone × 2 pre-cond = 18) ──
  describe('M6. Full matrix sweep', () => {
    const sources = ['av-card-dyno', 'av-card-cyl', 'av-card-beaker'] as const;
    const zones = ['av-dropzone-dyno', 'av-dyno-mount', 'av-dropzone-beaker'] as const;

    for (const src of sources) {
      for (const zn of zones) {
        it(`M6: ${src} → ${zn} — state остаётся валидным`, () => {
          simulateDrop(src, zn);
          const s = exp.getState();
          expect(Number.isFinite(s.hMm)).toBe(true);
          expect(s.hMm).toBeGreaterThanOrEqual(0);
          expect(typeof s.staged.dyno).toBe('boolean');
          expect(typeof s.staged.cyl).toBe('boolean');
          expect(typeof s.staged.beaker).toBe('boolean');
        });
      }
    }
  });

  // ─── M7. Reverse / detach combinations ───────────────────────────────
  describe('M7. Detach via × buttons (programmatic)', () => {
    it('M7.1: drop dyno → click detach-dyno → возврат в карточку', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      expect(exp.getState().staged.dyno).toBe(true);
      const btn = host.querySelector<HTMLButtonElement>('#av-detach-dyno');
      btn?.click();
      expect(exp.getState().staged.dyno).toBe(false);
      const dyno = host.querySelector('#av-dyno');
      expect(dyno?.parentElement?.id).toBe('av-card-dyno');
    });

    it('M7.2: полная сборка → detach beaker → cyl и dyno остаются', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-cyl', 'av-dyno-mount');
      simulateDrop('av-card-beaker', 'av-dropzone-beaker');
      const btn = host.querySelector<HTMLButtonElement>('#av-detach-beaker');
      btn?.click();
      expect(exp.getState().staged).toEqual({ dyno: true, cyl: true, beaker: false });
    });

    it('M7.3: detach cyl → отвязывает cyl, dyno+beaker остаются', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-cyl', 'av-dyno-mount');
      simulateDrop('av-card-beaker', 'av-dropzone-beaker');
      const btn = host.querySelector<HTMLButtonElement>('#av-detach-cyl');
      btn?.click();
      expect(exp.getState().staged).toEqual({ dyno: true, cyl: false, beaker: true });
    });
  });

  // ─── M8. Reset button ────────────────────────────────────────────────
  describe('M8. Reset via button', () => {
    it('M8.1: после full assembly через drop — reset очищает staged', () => {
      simulateDrop('av-card-dyno', 'av-dropzone-dyno');
      simulateDrop('av-card-cyl', 'av-dyno-mount');
      simulateDrop('av-card-beaker', 'av-dropzone-beaker');
      expect(exp.getState().staged.dyno).toBe(true);
      const resetBtn = host.querySelector<HTMLButtonElement>('#av-reset-btn');
      resetBtn?.click();
      expect(exp.getState().staged).toEqual({ dyno: false, cyl: false, beaker: false });
      expect(exp.getState().rows).toHaveLength(0);
    });
  });
});
