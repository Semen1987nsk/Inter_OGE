/**
 * density-drop-combinations — exhaustive матрица drag&drop.
 *
 * Источник истины: .business/спеки/2026-05-06-drag-matrix-kit-1.md
 *
 * Покрытие:
 *   A. Размещение приборов     (6 кейсов)
 *   B. Налив воды              (5 кейсов)
 *   C. Цилиндр на весы         (4×2 + 1)
 *   D. Цилиндр в мензурку      (4×4 + 2)
 *   E. Drag overlay со сцены   (3 кейса)
 *   F. Detach (X-кнопки)       (5 кейсов)
 *   G. Нон-draggable клики     (4 кейса)
 *
 * Стратегия памяти: 1 screen на describe, screen.reset() в afterEach.
 * happy-dom + customElements тяжёлые — mount/unmount на каждый тест
 * упирается в OOM при 50+ тестах в одном файле. Reset вместо ремаунта
 * сохраняет тот же DOM-tree, только обнуляет state внутри store.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setRecordMode } from '@shared/lib/record-mode';
import { DensitySolidScreen } from '../screens/density-solid/DensitySolidScreen';
import { CYLINDERS } from '../types';

async function registerComponents(): Promise<void> {
  await import('../ui/components/lab-equipment-card');
  await import('../ui/components/lab-metal-weight');
  await import('../ui/components/lab-balance');
  await import('../ui/components/lab-graduated-cylinder');
  await import('../ui/components/lab-dynamometer');
  await import('../ui/components/lab-beaker');
  await import('../ui/components/lab-thread');
  await import('../ui/components/lab-salt-set');
}

let _host: HTMLElement;
let _screen: DensitySolidScreen;

function setupOnce(): void {
  document.body.innerHTML = '';
  _host = document.createElement('main');
  _host.id = 'screen-content';
  document.body.appendChild(_host);
  // Polyfill elementsFromPoint
  if (!document.elementsFromPoint || document.elementsFromPoint(0, 0).length === 0) {
    document.elementsFromPoint = function (x: number, y: number): Element[] {
      const result: Element[] = [];
      for (const el of Array.from(document.querySelectorAll('[data-dropzone]'))) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) result.push(el);
      }
      return result;
    };
  }
  _screen = new DensitySolidScreen();
  _screen.mount(_host);
  stubRects();
}

function teardownOnce(): void {
  _screen.unmount();
  document.body.innerHTML = '';
}

function stubRects(): void {
  const stub = (el: Element, l: number, t: number, w = 120, h = 120): void => {
    Object.defineProperty(el, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: l, top: t, right: l + w, bottom: t + h, width: w, height: h, x: l, y: t,
        toJSON() { return this; },
      }),
    });
  };
  let i = 0;
  for (const el of Array.from(document.querySelectorAll('[data-draggable]'))) {
    if (el.id === 'weight-on-balance') stub(el, 200, 600, 80, 110);
    else if (el.id === 'weight-in-cylinder') stub(el, 380, 600, 80, 110);
    else stub(el, 1000, 50 + i++ * 130);
  }
  i = 0;
  for (const el of Array.from(document.querySelectorAll('[data-dropzone]'))) {
    stub(el, 100 + i++ * 250, 500, 220, 240);
  }
}

function drag(srcSel: string, dropzoneId: string): void {
  const src = document.querySelector<HTMLElement>(srcSel);
  const dst = document.querySelector<HTMLElement>(`[data-dropzone-id="${dropzoneId}"]`);
  if (!src) throw new Error(`drag source not found: ${srcSel}`);
  if (!dst) throw new Error(`drag target not found: ${dropzoneId}`);
  // Re-stub overlay rects: они меняются в зависимости от state
  stubRects();
  const sR = src.getBoundingClientRect();
  const dR = dst.getBoundingClientRect();
  const opts = (x: number, y: number): PointerEventInit => ({
    pointerId: 1, button: 0, clientX: x, clientY: y, bubbles: true, cancelable: true,
  });
  const sx = sR.left + sR.width / 2, sy = sR.top + sR.height / 2;
  const dx = dR.left + dR.width / 2, dy = dR.top + dR.height / 2;
  src.dispatchEvent(new PointerEvent('pointerdown', opts(sx, sy)));
  window.dispatchEvent(new PointerEvent('pointermove', opts(sx + 20, sy + 20)));
  window.dispatchEvent(new PointerEvent('pointermove', opts(dx, dy)));
  window.dispatchEvent(new PointerEvent('pointerup', opts(dx, dy)));
}

function dragCard(eqId: string, dropzoneId: string): void {
  drag(`lab-equipment-card[data-eq="${eqId}"]`, dropzoneId);
}

function getState(): Record<string, unknown> {
  // saveState() возвращает null для initial state — для удобства тестов
  // подставляем дефолтные нули и null'ы, чтобы expect не натыкался на
  // undefined и можно было писать s['level_ml'] === 0.
  return (
    (_screen.saveState() as Record<string, unknown> | null) ?? {
      balanceOnStage: false,
      cylinderOnStage: false,
      selectedCylId: null,
      onBalanceId: null,
      inCylinderId: null,
      level_ml: 0,
      submerged_ml: 0,
      measurements: [],
    }
  );
}

function journalRows(): number {
  return _host.querySelectorAll('.lab-journal-body tr').length ?? 0;
}

function getJournalCells(): string[] {
  const tr = _host.querySelector('.lab-journal-body tr');
  if (!tr) return [];
  return Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '');
}

beforeAll(async () => {
  await registerComponents();
  setupOnce();
});

afterAll(() => {
  teardownOnce();
});

// Между тестами НЕ ремаунтим — тяжело по памяти. Используем reset() —
// store пушит initial state, render очищает overlay/journal/etc.
beforeEach(() => {
  // §21 UX-v2: legacy-кейсы предполагают авто-запись после drop.
  // Используем fully-auto (программа сама пишет всё, без клика).
  setRecordMode('kit-1', 'fully-auto');
  _screen.reset();
  // reset не чистит journal-input.value напрямую (input живёт в DOM до
  // следующего render); но measurements=[] значит journalEmpty показан
  // и table скрыта → новые тесты не видят прошлых данных.
});

// ════════════════════════════════════════════════════════════════
// A. Размещение приборов
// ════════════════════════════════════════════════════════════════

describe('A. Mount equipment', () => {
  it('A1: balance → slot-balance ставит весы', () => {
    dragCard('balance', 'balance');
    expect(getState()['balanceOnStage']).toBe(true);
  });

  it('A2: balance → slot-balance уже стоит = no-op', () => {
    dragCard('balance', 'balance');
    const before = JSON.stringify(getState());
    dragCard('balance', 'balance');
    expect(JSON.stringify(getState())).toBe(before);
  });

  it('A3: balance → slot-cylinder отвергается', () => {
    dragCard('balance', 'cylinder');
    expect(getState()['balanceOnStage']).toBeFalsy();
  });

  it('A4: cylinder → slot-cylinder ставит мензурку', () => {
    dragCard('cylinder', 'cylinder');
    expect(getState()['cylinderOnStage']).toBe(true);
  });

  it('A5: cylinder → slot-cylinder повторно = no-op', () => {
    dragCard('cylinder', 'cylinder');
    dragCard('cylinder', 'cylinder');
    expect(getState()['cylinderOnStage']).toBe(true);
  });

  it('A6: cylinder → slot-balance отвергается', () => {
    dragCard('cylinder', 'balance');
    expect(getState()['cylinderOnStage']).toBeFalsy();
  });
});

// ════════════════════════════════════════════════════════════════
// B. Налив воды
// ════════════════════════════════════════════════════════════════

describe('B. Pour water (beaker)', () => {
  it('B1: beaker → cylinder без мензурки = reject', () => {
    dragCard('beaker', 'cylinder');
    expect(getState()['level_ml'] ?? 0).toBe(0);
  });

  it('B2: beaker × 1 → +100мл', () => {
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    expect(getState()['level_ml']).toBe(100);
  });

  it('B3: beaker × 2 = 200мл', () => {
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('beaker', 'cylinder');
    expect(getState()['level_ml']).toBe(200);
  });

  it('B4: beaker × 3 кламп ≤ 250мл', () => {
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('beaker', 'cylinder');
    const lvl = getState()['level_ml'] as number;
    expect(lvl).toBeLessThanOrEqual(250);
    expect(lvl).toBeGreaterThanOrEqual(200);
  });

  it('B6: beaker → slot-balance отвергается', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'balance');
    expect(getState()['level_ml'] ?? 0).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// C. Цилиндр на весы
// ════════════════════════════════════════════════════════════════

describe('C. Cylinder onto balance', () => {
  for (const cyl of CYLINDERS) {
    it(`C-${cyl.id}: cyl-${cyl.id} → balance без весов = reject`, () => {
      dragCard(`cyl-${cyl.id}`, 'balance');
      expect(getState()['onBalanceId'] ?? null).toBeNull();
    });

    it(`C-${cyl.id}+: cyl-${cyl.id} → balance, mass=${cyl.mass_g}`, () => {
      dragCard('balance', 'balance');
      dragCard('cylinder', 'cylinder');
      dragCard(`cyl-${cyl.id}`, 'balance');
      expect(getState()['onBalanceId']).toBe(cyl.id);
      expect(_host.querySelector('#balance')?.getAttribute('mass-g')).toBe(String(cyl.mass_g));
    });
  }

  it('C4: второй цилиндр на занятые весы = reject', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('cyl-1', 'balance');
    dragCard('cyl-2', 'balance');
    expect(getState()['onBalanceId']).toBe('1');
  });
});

// ════════════════════════════════════════════════════════════════
// D. Цилиндр в мензурку
// ════════════════════════════════════════════════════════════════

describe('D. Cylinder into мензурка', () => {
  it('D1: без мензурки = reject', () => {
    dragCard('balance', 'balance');
    dragCard('cyl-1', 'cylinder');
    expect(getState()['inCylinderId'] ?? null).toBeNull();
  });

  for (const cyl of CYLINDERS) {
    it(`D2-${cyl.id}: пустая мензурка без массы → виз на дне, БЕЗ записи, БЕЗ воды`, () => {
      dragCard('cylinder', 'cylinder');
      dragCard(`cyl-${cyl.id}`, 'cylinder');
      expect(getState()['inCylinderId']).toBe(cyl.id);
      expect(getState()['submerged_ml']).toBe(cyl.volume_cm3);
      expect(journalRows()).toBe(0);
      // REGRESSION (visual): при level=0 в SVG-rect воды быть не должно.
      // Это поймало бы баг «цилиндр в пустую мензурку → 25 мл воды из ниоткуда».
      const cylEl = _host.querySelector('#cylinder');
      const waterRect = cylEl?.shadowRoot?.getElementById('cyl-water') as SVGRectElement | null;
      expect(parseFloat(waterRect?.getAttribute('height') ?? '0')).toBe(0);
    });

    it(`D3-${cyl.id}: с водой без массы → виз, БЕЗ записи`, () => {
      dragCard('cylinder', 'cylinder');
      dragCard('beaker', 'cylinder');
      dragCard(`cyl-${cyl.id}`, 'cylinder');
      expect(getState()['inCylinderId']).toBe(cyl.id);
      expect(journalRows()).toBe(0);
    });

    it(`D4-${cyl.id}: масса+пустая мензурка → V₁=0 V₂=${cyl.volume_cm3}`, () => {
      // После drag на весы карточка placed (пустая ячейка) → второй шаг
      // делаем через overlay-balance (так и в реальной UX).
      dragCard('balance', 'balance');
      dragCard('cylinder', 'cylinder');
      dragCard(`cyl-${cyl.id}`, 'balance');
      drag('#weight-on-balance', 'cylinder');
      expect(journalRows()).toBe(1);
      const c = getJournalCells();
      expect(c[2]).toBe(String(cyl.mass_g));
      expect(c[3]).toBe('0');
      expect(c[4]).toBe(String(cyl.volume_cm3));
    });

    it(`D5-${cyl.id}: масса+вода → V₁=100 V₂=${100 + cyl.volume_cm3}`, () => {
      dragCard('balance', 'balance');
      dragCard('cylinder', 'cylinder');
      dragCard('beaker', 'cylinder');
      dragCard(`cyl-${cyl.id}`, 'balance');
      drag('#weight-on-balance', 'cylinder');
      expect(journalRows()).toBe(1);
      const c = getJournalCells();
      expect(c[3]).toBe('100');
      expect(c[4]).toBe(String(100 + cyl.volume_cm3));
    });
  }

  it('D7: второй цилиндр в занятую мензурку = no-change', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('cyl-1', 'balance');
    drag('#weight-on-balance', 'cylinder');
    const before = getState()['inCylinderId'];
    dragCard('cyl-2', 'cylinder');
    expect(getState()['inCylinderId']).toBe(before);
  });
});

// ════════════════════════════════════════════════════════════════
// E. Overlay drag со сцены
// ════════════════════════════════════════════════════════════════

describe('E. Overlay drag from stage (биrec)', () => {
  it('E1: overlay-баланс → пустая мензурка = запись V₁=0', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('cyl-1', 'balance');
    drag('#weight-on-balance', 'cylinder');
    expect(journalRows()).toBe(1);
    const c = getJournalCells();
    expect(c[3]).toBe('0');
    expect(c[4]).toBe('25');
  });

  it('E2: overlay-баланс → вода = запись V₁=100', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('cyl-2', 'balance');
    drag('#weight-on-balance', 'cylinder');
    expect(journalRows()).toBe(1);
    const c = getJournalCells();
    expect(c[3]).toBe('100');
    expect(c[4]).toBe(String(100 + 25));
  });

  it('E3: overlay → slot-balance (тот же) = no-change', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('cyl-1', 'balance');
    drag('#weight-on-balance', 'balance');
    expect(getState()['onBalanceId']).toBe('1');
    expect(journalRows()).toBe(0);
  });

  // ─── Реверсивный путь: цилиндр в мензурке должен ВСЁ РАВНО таскаться ───
  // Эти тесты ловят пропущенный баг «застрял в воде, drag не работает».

  it('E5: overlay-cylinder ИМЕЕТ data-draggable когда цилиндр в воде', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('cyl-1', 'balance');
    drag('#weight-on-balance', 'cylinder');
    const overlay = _host.querySelector<HTMLElement>('#weight-in-cylinder')!;
    expect(overlay.hidden).toBe(false);
    expect(overlay.hasAttribute('data-draggable')).toBe(true);
    expect(overlay.getAttribute('data-draggable')).toBe('cyl-1');
  });

  it('E5+: overlay-cylinder → balance вынимает из воды и кладёт на весы', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('cyl-1', 'balance');
    drag('#weight-on-balance', 'cylinder');
    expect(getState()['inCylinderId']).toBe('1');
    expect(getState()['onBalanceId']).toBe('1');  // state ещё помнит для журнала

    // НЕ через крестик — настоящим drag'ом
    drag('#weight-in-cylinder', 'balance');
    expect(getState()['inCylinderId']).toBeNull();
    expect(getState()['submerged_ml']).toBe(0);
    expect(getState()['onBalanceId']).toBe('1');
  });

  it('E6: overlay-cylinder → balance, на весах ДРУГОЙ цилиндр = reject', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    // Кладём cyl-2 в мензурку без массы
    dragCard('cyl-2', 'cylinder');
    // Кладём cyl-1 на весы
    dragCard('cyl-1', 'balance');
    expect(getState()['onBalanceId']).toBe('1');
    expect(getState()['inCylinderId']).toBe('2');

    // Пытаемся cyl-2 из воды → весы (заняты cyl-1)
    drag('#weight-in-cylinder', 'balance');
    expect(getState()['onBalanceId']).toBe('1');  // не сменилось
    expect(getState()['inCylinderId']).toBe('2'); // остался в воде
  });

  it('E7: overlay-cylinder → balance без весов на сцене = reject', () => {
    dragCard('cylinder', 'cylinder');
    dragCard('cyl-3', 'cylinder');
    expect(getState()['inCylinderId']).toBe('3');
    drag('#weight-in-cylinder', 'balance');
    expect(getState()['inCylinderId']).toBe('3');
    expect(getState()['onBalanceId']).toBeNull();
  });

  it('E10: реверсивный workflow — туда-сюда несколько раз без поломок', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('cyl-1', 'balance');

    // 1: на весы → в мензурку (запись 1)
    drag('#weight-on-balance', 'cylinder');
    expect(journalRows()).toBe(1);

    // 2: из мензурки обратно на весы
    drag('#weight-in-cylinder', 'balance');
    expect(getState()['onBalanceId']).toBe('1');
    expect(getState()['inCylinderId']).toBeNull();

    // 3: с весов снова в мензурку (новая запись?)
    drag('#weight-on-balance', 'cylinder');
    // Запись добавится — это другой замер
    expect(journalRows()).toBe(2);

    // 4: финал — из мензурки на весы
    drag('#weight-in-cylinder', 'balance');
    expect(getState()['onBalanceId']).toBe('1');
    expect(getState()['inCylinderId']).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// F. Detach
// ════════════════════════════════════════════════════════════════

describe('F. Detach buttons', () => {
  it('F1: detach-balance убирает весы', () => {
    dragCard('balance', 'balance');
    _host.querySelector<HTMLButtonElement>('#detach-balance')!.click();
    expect(getState()['balanceOnStage'] ?? false).toBe(false);
  });

  it('F2: detach-cylinder убирает мензурку и воду', () => {
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    _host.querySelector<HTMLButtonElement>('#detach-cylinder')!.click();
    const s = getState();
    expect(s['cylinderOnStage'] ?? false).toBe(false);
    expect(s['level_ml']).toBe(0);
  });

  it('F3: detach-weight снимает цилиндр с весов', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('cyl-1', 'balance');
    _host.querySelector<HTMLButtonElement>('#detach-weight')!.click();
    expect(getState()['onBalanceId'] ?? null).toBeNull();
  });

  it('F5: detach-submerged вынимает цилиндр из мензурки', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('cyl-1', 'balance');
    dragCard('cyl-1', 'cylinder');
    _host.querySelector<HTMLButtonElement>('#detach-submerged')!.click();
    expect(getState()['inCylinderId'] ?? null).toBeNull();
    expect(getState()['submerged_ml']).toBe(0);
  });

  it('F6: reset → initial', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('cyl-3', 'balance');
    dragCard('cyl-3', 'cylinder');
    _host.querySelector<HTMLButtonElement>('#reset-btn')!.click();
    expect(_screen.saveState()).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// G. Нон-draggable клики
// ════════════════════════════════════════════════════════════════

describe('G. Non-draggable equipment cards (info clicks)', () => {
  for (const eqId of ['dyno-1', 'dyno-5', 'thread', 'salt']) {
    it(`G-${eqId}: click не меняет state`, () => {
      const before = JSON.stringify(getState());
      _host.querySelector<HTMLElement>(`lab-equipment-card[data-eq="${eqId}"]`)!.click();
      expect(JSON.stringify(getState())).toBe(before);
    });
  }
});

// ════════════════════════════════════════════════════════════════
// H. Возврат прибора в комплект (drop на свою же карточку = «положить
// обратно в коробку»). Полная имитация реального мира.
// ════════════════════════════════════════════════════════════════

describe('H. Return equipment to kit slot', () => {
  it('H1: balance со сцены → card-balance: весы убраны', () => {
    dragCard('balance', 'balance');
    expect(getState()['balanceOnStage']).toBe(true);
    drag('#balance', 'card-balance');
    expect(getState()['balanceOnStage'] ?? false).toBe(false);
  });

  it('H1+: balance со сцены с грузом → card-balance: и груз снят', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('cyl-1', 'balance');
    expect(getState()['onBalanceId']).toBe('1');
    drag('#balance', 'card-balance');
    expect(getState()['balanceOnStage'] ?? false).toBe(false);
    expect(getState()['onBalanceId'] ?? null).toBeNull();
  });

  it('H2: cylinder со сцены → card-cylinder: вода вылита', () => {
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    expect(getState()['level_ml']).toBe(100);
    drag('#cylinder', 'card-cylinder');
    expect(getState()['cylinderOnStage'] ?? false).toBe(false);
    expect(getState()['level_ml']).toBe(0);
  });

  it('H3: cyl-N с весов через overlay → card-cyl-N', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('cyl-2', 'balance');
    expect(getState()['onBalanceId']).toBe('2');
    drag('#weight-on-balance', 'card-cyl-2');
    expect(getState()['onBalanceId'] ?? null).toBeNull();
  });

  it('H4: cyl-N из мензурки через overlay → card-cyl-N', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('cyl-3', 'balance');
    drag('#weight-on-balance', 'cylinder');  // в воду
    expect(getState()['inCylinderId']).toBe('3');
    drag('#weight-in-cylinder', 'card-cyl-3');
    expect(getState()['inCylinderId'] ?? null).toBeNull();
    expect(getState()['onBalanceId'] ?? null).toBeNull();
  });

  it('H5: cyl-1 → ЧУЖАЯ ячейка card-cyl-2 = reject', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('cyl-1', 'balance');
    drag('#weight-on-balance', 'card-cyl-2');
    expect(getState()['onBalanceId']).toBe('1');  // не сменилось
  });

  it('H6: после возврата карточка снова доступна для drag (повторное размещение)', () => {
    dragCard('balance', 'balance');
    drag('#balance', 'card-balance');
    expect(getState()['balanceOnStage'] ?? false).toBe(false);
    // Должна вернуться draggable
    const card = _host.querySelector<HTMLElement>('lab-equipment-card[data-eq="balance"]')!;
    expect(card.hasAttribute('data-draggable')).toBe(true);
    // И ставится снова
    dragCard('balance', 'balance');
    expect(getState()['balanceOnStage']).toBe(true);
  });

  it('H7: full reverse — собрал всё, потом drag-ом всё в комплект', () => {
    dragCard('balance', 'balance');
    dragCard('cylinder', 'cylinder');
    dragCard('beaker', 'cylinder');
    dragCard('cyl-1', 'balance');
    drag('#weight-on-balance', 'cylinder');
    expect(journalRows()).toBe(1);

    // Возвращаем всё через drag в комплект
    drag('#weight-in-cylinder', 'card-cyl-1');
    expect(getState()['inCylinderId'] ?? null).toBeNull();
    drag('#cylinder', 'card-cylinder');
    expect(getState()['cylinderOnStage'] ?? false).toBe(false);
    drag('#balance', 'card-balance');
    expect(getState()['balanceOnStage'] ?? false).toBe(false);
    // Журнал остаётся (это записи измерений, не state приборов)
    expect(journalRows()).toBe(1);
  });
});
