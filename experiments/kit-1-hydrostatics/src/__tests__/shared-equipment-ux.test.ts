/**
 * Unit-тесты на shared infrastructure §20 REFERENCE.md:
 *   - DragController (shared)        — императивный + декларативный API
 *   - attachDetachButton             — единый «×» крестик
 *   - record-mode (manual/auto)      — localStorage helpers
 *
 * Тесты живут в kit-1-hydrostatics, потому что _shared-spa не имеет
 * собственной vitest-конфигурации (это thin-library без node_modules).
 * Любой kit, импортирующий @shared/*, может прогонять эти тесты.
 *
 * Стек: happy-dom + vitest. Ставим элементы вручную в DOM, имитируем
 * pointer events через `dispatchEvent(new PointerEvent(...))`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DragController, type SnapZone } from '@shared/controller/DragController';
import {
  attachDetachButton,
  injectDetachButtonStyles,
} from '@shared/ui/detach-button';
import {
  DEFAULT_RECORD_MODE,
  getRecordMode,
  setRecordMode,
} from '@shared/lib/record-mode';

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function makeOverlay(): HTMLElement {
  const o = document.createElement('div');
  o.style.position = 'fixed';
  o.style.inset = '0';
  o.style.pointerEvents = 'none';
  document.body.appendChild(o);
  return o;
}

function makeDraggable(opts: { eqId: string; kind?: string; ghost?: boolean }): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-draggable', opts.eqId);
  if (opts.kind) el.setAttribute('data-drag-kind', opts.kind);
  if (opts.ghost) el.setAttribute('data-drag-ghost', 'true');
  el.style.width = '60px';
  el.style.height = '60px';
  el.style.position = 'absolute';
  el.style.left = '100px';
  el.style.top = '100px';
  document.body.appendChild(el);
  return el;
}

function makeDropzone(opts: { id: string; accepts: string }): HTMLElement {
  const z = document.createElement('div');
  z.setAttribute('data-dropzone', opts.accepts);
  z.setAttribute('data-dropzone-id', opts.id);
  z.style.width = '120px';
  z.style.height = '120px';
  z.style.position = 'absolute';
  z.style.left = '400px';
  z.style.top = '300px';
  document.body.appendChild(z);
  return z;
}

function pointerEvent(type: string, x: number, y: number, opts: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: opts.pointerId ?? 1,
    pointerType: 'mouse',
    button: 0,
    clientX: x,
    clientY: y,
    ...opts,
  });
}

// ═══════════════════════════════════════════════════════════════════
// DragController — императивный API
// ═══════════════════════════════════════════════════════════════════

describe('DragController — императивный API (attach + addSnapZone)', () => {
  let overlay: HTMLElement;
  let controller: DragController;

  beforeEach(() => {
    document.body.innerHTML = '';
    overlay = makeOverlay();
    controller = new DragController(overlay);
  });

  afterEach(() => {
    controller.cancel();
    document.body.innerHTML = '';
  });

  it('attach + addSnapZone: drop в зону вызывает onDrop', () => {
    const el = makeDraggable({ eqId: 'cyl-3', kind: 'cyl' });
    let dropped: { eqId: string; kind: string } | null = null;
    const zone: SnapZone = {
      id: 'zone-1',
      accepts: ['cyl', 'cyl-*'],
      getRect: () => new DOMRect(400, 300, 120, 120),
      onDrop: (p) => {
        dropped = { eqId: p.equipmentId, kind: p.kind };
        return true;
      },
    };
    controller.addSnapZone(zone);
    controller.attach(el, { equipmentId: 'cyl-3', kind: 'cyl' });

    el.dispatchEvent(pointerEvent('pointerdown', 110, 110));
    window.dispatchEvent(pointerEvent('pointermove', 460, 360));
    window.dispatchEvent(pointerEvent('pointerup', 460, 360));

    expect(dropped).toEqual({ eqId: 'cyl-3', kind: 'cyl' });
  });

  it('drop вне snap-зоны → onDrop НЕ вызывается, accepted=false', () => {
    const el = makeDraggable({ eqId: 'cyl-3', kind: 'cyl' });
    let drops = 0;
    let endedAccepted: boolean | null = null;
    const zone: SnapZone = {
      id: 'zone-far',
      accepts: ['cyl'],
      getRect: () => new DOMRect(400, 300, 120, 120),
      snapRadius: 40,
      onDrop: () => {
        drops += 1;
        return true;
      },
    };
    controller.addSnapZone(zone);
    controller.attach(el, {
      equipmentId: 'cyl-3',
      kind: 'cyl',
      onDragEnd: (a) => {
        endedAccepted = a;
      },
    });

    el.dispatchEvent(pointerEvent('pointerdown', 110, 110));
    window.dispatchEvent(pointerEvent('pointermove', 200, 200)); // далеко от зоны
    window.dispatchEvent(pointerEvent('pointerup', 200, 200));

    expect(drops).toBe(0);
    expect(endedAccepted).toBe(false);
  });

  it('zone.accepts фильтрует по kind: incompatible kind → не сматчится', () => {
    const el = makeDraggable({ eqId: 'beaker', kind: 'beaker' });
    let drops = 0;
    controller.addSnapZone({
      id: 'cyl-only-zone',
      accepts: ['cyl'],
      getRect: () => new DOMRect(400, 300, 120, 120),
      onDrop: () => {
        drops += 1;
        return true;
      },
    });
    controller.attach(el, { equipmentId: 'beaker', kind: 'beaker' });

    el.dispatchEvent(pointerEvent('pointerdown', 110, 110));
    window.dispatchEvent(pointerEvent('pointermove', 460, 360));
    window.dispatchEvent(pointerEvent('pointerup', 460, 360));
    expect(drops).toBe(0);
  });

  it('keyboard activate (Enter): телепортирует в первую совместимую зону', () => {
    const el = makeDraggable({ eqId: 'cyl-3', kind: 'cyl' });
    let dropped = false;
    controller.addSnapZone({
      id: 'zone-1',
      accepts: ['cyl'],
      getRect: () => new DOMRect(400, 300, 120, 120),
      onDrop: () => {
        dropped = true;
        return true;
      },
    });
    controller.attach(el, { equipmentId: 'cyl-3', kind: 'cyl' });

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(dropped).toBe(true);
  });

  it('data-pin="true" блокирует drag (programmatic pin)', () => {
    const el = makeDraggable({ eqId: 'cyl-3', kind: 'cyl' });
    el.setAttribute('data-pin', 'true');
    let drops = 0;
    controller.addSnapZone({
      id: 'z',
      accepts: ['cyl'],
      getRect: () => new DOMRect(400, 300, 120, 120),
      onDrop: () => {
        drops += 1;
        return true;
      },
    });
    controller.attach(el, { equipmentId: 'cyl-3', kind: 'cyl' });
    el.dispatchEvent(pointerEvent('pointerdown', 110, 110));
    window.dispatchEvent(pointerEvent('pointermove', 460, 360));
    window.dispatchEvent(pointerEvent('pointerup', 460, 360));
    expect(drops).toBe(0);
  });

  it('snap-зона не блокирует attached="" (free re-drag со сцены)', () => {
    const el = makeDraggable({ eqId: 'cyl-3', kind: 'cyl' });
    el.setAttribute('attached', '');
    let drops = 0;
    controller.addSnapZone({
      id: 'z',
      accepts: ['cyl'],
      getRect: () => new DOMRect(400, 300, 120, 120),
      onDrop: () => {
        drops += 1;
        return true;
      },
    });
    controller.attach(el, { equipmentId: 'cyl-3', kind: 'cyl' });
    el.dispatchEvent(pointerEvent('pointerdown', 110, 110));
    window.dispatchEvent(pointerEvent('pointermove', 460, 360));
    window.dispatchEvent(pointerEvent('pointerup', 460, 360));
    expect(drops).toBe(1);
  });

  it('click без drag (≤ threshold) → onDrop НЕ вызывается, click event не блокируется', () => {
    const el = makeDraggable({ eqId: 'cyl-3', kind: 'cyl' });
    let drops = 0;
    controller.addSnapZone({
      id: 'z',
      accepts: ['cyl'],
      getRect: () => new DOMRect(400, 300, 120, 120),
      onDrop: () => {
        drops += 1;
        return true;
      },
    });
    controller.attach(el, { equipmentId: 'cyl-3', kind: 'cyl' });
    el.dispatchEvent(pointerEvent('pointerdown', 110, 110));
    window.dispatchEvent(pointerEvent('pointermove', 112, 111)); // < threshold
    window.dispatchEvent(pointerEvent('pointerup', 112, 111));
    expect(drops).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// DragController — декларативный data-API
// ═══════════════════════════════════════════════════════════════════

describe('DragController — декларативный data-API', () => {
  let overlay: HTMLElement;
  let host: HTMLElement;
  let controller: DragController;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.style.position = 'relative';
    document.body.appendChild(host);
    overlay = makeOverlay();
    controller = new DragController(overlay);
  });

  afterEach(() => {
    controller.cancel();
    document.body.innerHTML = '';
  });

  it('enableDeclarativeMode: data-draggable + data-dropzone вызывают onDrop', () => {
    const el = makeDraggable({ eqId: 'cyl-3' });
    host.appendChild(el);
    const zone = makeDropzone({ id: 'beaker-zone', accepts: 'cyl-*,beaker' });
    let dropped: { eqId: string; dropzoneId: string } | null = null;
    controller.enableDeclarativeMode(host, (d) => {
      dropped = { eqId: d.eqId, dropzoneId: d.dropzoneId };
    });

    // happy-dom не делает elementsFromPoint на абсолютно позиционированных
    // элементах "из коробки" — патчим, чтобы вернуть наш zone.
    const origElsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = (x: number, y: number): Element[] => {
      const insideZone = x >= 400 && x <= 520 && y >= 300 && y <= 420;
      return insideZone ? [zone] : [];
    };

    try {
      el.dispatchEvent(pointerEvent('pointerdown', 110, 110));
      window.dispatchEvent(pointerEvent('pointermove', 460, 360));
      window.dispatchEvent(pointerEvent('pointerup', 460, 360));
    } finally {
      document.elementsFromPoint = origElsFromPoint;
    }

    expect(dropped).toEqual({ eqId: 'cyl-3', dropzoneId: 'beaker-zone' });
  });

  it('accepts=cyl-* матчит cyl-1, cyl-2, cyl-3, cyl-4', () => {
    const ids = ['cyl-1', 'cyl-2', 'cyl-3', 'cyl-4'];
    for (const id of ids) {
      const el = makeDraggable({ eqId: id });
      host.appendChild(el);
      const zone = makeDropzone({ id: `z-${id}`, accepts: 'cyl-*' });

      let dropped = false;
      const detach = controller.enableDeclarativeMode(host, () => {
        dropped = true;
      });
      const orig = document.elementsFromPoint;
      document.elementsFromPoint = (x: number, y: number): Element[] => {
        const inside = x >= 400 && x <= 520 && y >= 300 && y <= 420;
        return inside ? [zone] : [];
      };
      try {
        el.dispatchEvent(pointerEvent('pointerdown', 110, 110, { pointerId: 7 }));
        window.dispatchEvent(pointerEvent('pointermove', 460, 360, { pointerId: 7 }));
        window.dispatchEvent(pointerEvent('pointerup', 460, 360, { pointerId: 7 }));
      } finally {
        document.elementsFromPoint = orig;
      }
      detach();
      expect(dropped).toBe(true);
      el.remove();
      zone.remove();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// attachDetachButton
// ═══════════════════════════════════════════════════════════════════

describe('attachDetachButton — единый «×» крестик', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('создаёт button с classList.lab-detach-btn + aria-label', () => {
    const host = document.createElement('div');
    host.style.position = 'relative';
    document.body.appendChild(host);
    attachDetachButton(host, {
      equipmentId: 'cyl-3',
      prettyName: 'Цилиндр № 3',
      onDetach: () => {},
    });
    const btn = host.querySelector('button.lab-detach-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toBe('Убрать Цилиндр № 3 в комплект');
    expect(btn.textContent).toBe('×');
    expect(btn.tabIndex).toBe(0);
  });

  it('click → onDetach(equipmentId)', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let called: string | null = null;
    attachDetachButton(host, {
      equipmentId: 'beaker',
      prettyName: 'Стакан 250 мл',
      onDetach: (id) => {
        called = id;
      },
    });
    const btn = host.querySelector('button.lab-detach-btn') as HTMLButtonElement;
    btn.click();
    expect(called).toBe('beaker');
  });

  it('Enter / Space на кнопке → onDetach', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let calls = 0;
    attachDetachButton(host, {
      equipmentId: 'd1',
      prettyName: 'Динамометр',
      onDetach: () => {
        calls += 1;
      },
    });
    const btn = host.querySelector('button.lab-detach-btn') as HTMLButtonElement;
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(calls).toBe(2);
  });

  it('Delete / Backspace на host (listenHostKeys=default true) → onDetach', () => {
    const host = document.createElement('div');
    host.tabIndex = 0;
    document.body.appendChild(host);
    let calls = 0;
    attachDetachButton(host, {
      equipmentId: 'd1',
      prettyName: 'Динамометр',
      onDetach: () => {
        calls += 1;
      },
    });
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    expect(calls).toBe(2);
  });

  it('listenHostKeys=false выключает Delete/Backspace на host', () => {
    const host = document.createElement('div');
    host.tabIndex = 0;
    document.body.appendChild(host);
    let calls = 0;
    attachDetachButton(host, {
      equipmentId: 'd1',
      prettyName: 'X',
      listenHostKeys: false,
      onDetach: () => {
        calls += 1;
      },
    });
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(calls).toBe(0);
  });

  it('идемпотентно: повторный вызов на том же host → одна кнопка', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    attachDetachButton(host, {
      equipmentId: 'a',
      prettyName: 'A',
      onDetach: () => {},
    });
    attachDetachButton(host, {
      equipmentId: 'b',
      prettyName: 'B',
      onDetach: () => {},
    });
    const all = host.querySelectorAll('button.lab-detach-btn');
    expect(all.length).toBe(1);
    expect((all[0] as HTMLButtonElement).getAttribute('aria-label')).toContain('B');
  });

  it('detach-функция убирает кнопку и снимает listener-ы', () => {
    const host = document.createElement('div');
    host.tabIndex = 0;
    document.body.appendChild(host);
    let calls = 0;
    const dispose = attachDetachButton(host, {
      equipmentId: 'a',
      prettyName: 'A',
      onDetach: () => {
        calls += 1;
      },
    });
    dispose();
    expect(host.querySelector('button.lab-detach-btn')).toBe(null);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(calls).toBe(0);
  });

  it('injectDetachButtonStyles: idempotent (один <style> на document)', () => {
    injectDetachButtonStyles();
    injectDetachButtonStyles();
    const styles = document.head.querySelectorAll('style#lab-detach-btn-styles');
    expect(styles.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// record-mode (manual / auto)
// ═══════════════════════════════════════════════════════════════════

describe('record-mode — единый стандарт записи в журнал', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('§21: default = "semi-auto" во всех опытах', () => {
    expect(DEFAULT_RECORD_MODE).toBe('semi-auto');
    expect(getRecordMode('kit-1')).toBe('semi-auto');
    expect(getRecordMode('kit-2')).toBe('semi-auto');
    expect(getRecordMode('any-future-kit')).toBe('semi-auto');
  });

  it('§21: setRecordMode(kit, "fully-auto") → getRecordMode возвращает "fully-auto"', () => {
    setRecordMode('kit-1', 'fully-auto');
    expect(getRecordMode('kit-1')).toBe('fully-auto');
    expect(getRecordMode('kit-2')).toBe('semi-auto'); // независимо
  });

  it('§21: setRecordMode(kit, "fully-manual") сохраняется', () => {
    setRecordMode('kit-1', 'fully-auto');
    setRecordMode('kit-1', 'fully-manual');
    expect(getRecordMode('kit-1')).toBe('fully-manual');
  });

  it('некорректное значение в localStorage → getRecordMode возвращает default', () => {
    localStorage.setItem('inter-oge.record-mode.kit-1', 'whatever');
    expect(getRecordMode('kit-1')).toBe('semi-auto');
  });

  it('режимы изолированы по kitId', () => {
    setRecordMode('kit-1', 'fully-auto');
    setRecordMode('kit-2', 'fully-manual');
    setRecordMode('kit-3', 'semi-auto');
    expect(getRecordMode('kit-1')).toBe('fully-auto');
    expect(getRecordMode('kit-2')).toBe('fully-manual');
    expect(getRecordMode('kit-3')).toBe('semi-auto');
  });

  it('§21 migration shim: legacy "manual" → "semi-auto"', () => {
    setRecordMode('kit-1', 'manual');
    expect(getRecordMode('kit-1')).toBe('semi-auto');
  });

  it('§21 migration shim: legacy "auto" → "semi-auto"', () => {
    setRecordMode('kit-1', 'auto');
    expect(getRecordMode('kit-1')).toBe('semi-auto');
  });
});
