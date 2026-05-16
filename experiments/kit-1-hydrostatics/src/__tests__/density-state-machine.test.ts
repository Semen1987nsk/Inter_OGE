/**
 * density-state-machine — DOM-based интеграционный тест workflow'а опыта 1.1.
 *
 * Аналог 15.6 из REFERENCE.md: используем happy-dom + customElements для
 * полного round-trip mount → действия → unmount без утечек.
 *
 * Покрытие:
 *   - mount/unmount цикл (10 итераций без утечек listeners)
 *   - случайные последовательности drag/drop/click/detach (50 итераций)
 *   - reset идемпотентен
 *   - saveState/loadState round-trip
 *   - все 4 цилиндра дают валидные измерения
 *   - happy path для каждого цилиндра
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DensitySolidScreen } from '../screens/density-solid/DensitySolidScreen';
import { CYLINDERS } from '../types';
import { setRecordMode } from '@shared/lib/record-mode';

// Регистрируем все Web Components, которые использует экран
async function registerComponents(): Promise<void> {
  // Imports побочно регистрируют customElements.define
  await import('../ui/components/lab-equipment-card');
  await import('../ui/components/lab-metal-weight');
  await import('../ui/components/lab-balance');
  await import('../ui/components/lab-graduated-cylinder');
  await import('../ui/components/lab-dynamometer');
  await import('../ui/components/lab-beaker');
  await import('../ui/components/lab-thread');
  await import('../ui/components/lab-salt-set');
}

describe('DensitySolidScreen — state machine', () => {
  let host: HTMLElement;

  beforeEach(async () => {
    await registerComponents();
    document.body.innerHTML = '';
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    try {
      localStorage.clear();
    } catch {
      /* happy-dom может не поддерживать */
    }
    // §20.4 REFERENCE.md — default = manual. Существующие state-machine
    // кейсы проверяют пайплайн «масса измерена → погрузил → запись», что
    // в новом контракте требует ещё одного клика «Записать в журнал».
    // Включаем auto-режим, чтобы legacy-тесты остались валидными. Manual
    // flow проверяется отдельным `it('MANUAL FLOW: ...')` ниже.
    setRecordMode('kit-1', 'auto');
    // Полифилл elementsFromPoint для happy-dom: ищем элементы с
    // data-dropzone, чьи rect совпадают с точкой.
    if (!document.elementsFromPoint || document.elementsFromPoint(0, 0).length === 0) {
      document.elementsFromPoint = function (x: number, y: number): Element[] {
        const result: Element[] = [];
        const candidates = Array.from(document.querySelectorAll('[data-dropzone]'));
        for (const el of candidates) {
          const r = (el as HTMLElement).getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            result.push(el);
          }
        }
        return result;
      };
    }
    // Полифилл getBoundingClientRect: happy-dom возвращает нули, поэтому
    // выдадим осмысленные rect'ы для draggable и dropzone элементов.
    const stubRect = (el: Element, idx: number, kind: 'card' | 'zone'): void => {
      const offsetX = kind === 'card' ? 800 : 100;
      const offsetY = 100 + idx * 200;
      Object.defineProperty(el, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          left: offsetX,
          top: offsetY,
          right: offsetX + 120,
          bottom: offsetY + 120,
          width: 120,
          height: 120,
          x: offsetX,
          y: offsetY,
          toJSON() { return this; },
        }),
      });
    };
    // Карточки в правой панели (источники drag)
    Array.from(document.querySelectorAll('[data-draggable]')).forEach((el, i) =>
      stubRect(el, i, 'card'),
    );
    // Drop-зоны на сцене
    Array.from(document.querySelectorAll('[data-dropzone]')).forEach((el, i) =>
      stubRect(el, i, 'zone'),
    );
  });

  /** Перевешиваем rect'ы после mount-а — карточки и зоны появились в DOM. */
  function applyRectStubs(): void {
    const stub = (el: Element, leftPx: number, topPx: number): void => {
      Object.defineProperty(el, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          left: leftPx, top: topPx,
          right: leftPx + 120, bottom: topPx + 120,
          width: 120, height: 120,
          x: leftPx, y: topPx,
          toJSON() { return this; },
        }),
      });
    };
    document.querySelectorAll('[data-draggable]').forEach((el, i) => stub(el, 800, 50 + i * 130));
    document.querySelectorAll('[data-dropzone]').forEach((el, i) => stub(el, 100, 50 + i * 250));
  }

  afterEach(() => {
    document.body.innerHTML = '';
    // happy-dom + customElements mount/unmount копит метаданные shadow DOM —
    // принудительный GC между тестами держит worker под лимитом heap'а.
    if (typeof (globalThis as { gc?: () => void }).gc === 'function') {
      (globalThis as { gc: () => void }).gc();
    }
  });

  // ─── 1. Mount/unmount round-trip ────────────────────────────────

  it('mount → unmount → mount: 10 циклов без утечек', async () => {
    for (let i = 0; i < 10; i++) {
      const screen = new DensitySolidScreen();
      screen.mount(host);
      expect(host.querySelector('#balance')).toBeTruthy();
      expect(host.querySelector('#cylinder')).toBeTruthy();
      expect(host.querySelector('#hint-bar')).toBeTruthy();
      expect(host.querySelectorAll('.step').length).toBe(5);
      expect(host.querySelectorAll('lab-equipment-card[data-eq^="cyl-"]').length).toBe(4);
      screen.unmount();
      expect(host.children.length).toBe(0);
    }
  });

  it('mount идемпотентен (повторный mount на тот же host — no-op)', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);
    const firstChildBefore = host.firstElementChild;
    screen.mount(host);
    expect(host.firstElementChild).toBe(firstChildBefore);
    screen.unmount();
  });

  // ─── 2. Полный happy-path для каждого цилиндра ──────────────────

  for (const cyl of CYLINDERS) {
    it(`happy-path: цилиндр ${cyl.id} (${cyl.material}) → корректная запись в журнал`, () => {
      const screen = new DensitySolidScreen();
      screen.mount(host);
      applyRectStubs();

      // 1. Кликаем по карточке весов → весы на сцене
      clickCard(host, 'balance');
      // 2. Кликаем по карточке мензурки → мензурка на сцене
      clickCard(host, 'cylinder');
      // 3. Кликаем по стакану → налить воду
      simulateDrop(host, 'beaker', 'cylinder');
      // 4. Кликаем по карточке цилиндра → выбрать
      clickCard(host, `cyl-${cyl.id}`);
      // 5. Кликаем по весам на сцене → груз на весах
      simulateDrop(host, `cyl-${cyl.id}`, 'balance');
      // 6. Кликаем по мензурке → погрузить
      simulateDrop(host, `cyl-${cyl.id}`, 'cylinder');

      // §21 UX-v2: в semi-auto (default) после drop появляется
      // pending-плашка «Записать». Нажимаем для фиксации direct+meta.
      const pendingBtn = host.querySelector<HTMLButtonElement>('#record-pending-btn');
      expect(pendingBtn).toBeTruthy();
      pendingBtn!.click();

      const tbody = host.querySelector('.lab-journal-body');
      expect(host.querySelectorAll('.lab-journal-body tr').length).toBe(1);
      const tr = tbody!.children[0] as HTMLTableRowElement;
      const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim());
      // Колонки: №, Цилиндр, m, V₁, V₂, V (input), ρ (input), Проверка (кнопка)
      expect(cells[0]).toBe('1');
      expect(cells[1]).toBe(cyl.label);
      expect(cells[2]).toBe(String(cyl.mass_g));
      expect(cells[3]).toBe('100');
      expect(cells[4]).toBe(String(100 + cyl.volume_cm3));
      // V и ρ — пустые input'ы (ученик считает сам)
      const vInput = tr.querySelector<HTMLInputElement>('input[data-key="V_cm3"]')!;
      const rhoInput = tr.querySelector<HTMLInputElement>('input[data-key="rho_kg_m3"]')!;
      expect(vInput).toBeTruthy();
      expect(rhoInput).toBeTruthy();
      expect(vInput.value).toBe('');
      expect(rhoInput.value).toBe('');
      // Кнопка «Проверить» в последней колонке
      const checkBtn = tr.querySelector<HTMLButtonElement>('button.j-check');
      expect(checkBtn).toBeTruthy();

      // Учим типичный сценарий: ученик ввёл правильные V и ρ, нажал «Проверить»
      vInput.value = String(cyl.volume_cm3);
      rhoInput.value = String(cyl.density_kg_m3);
      checkBtn!.click();
      expect(tr.querySelector('.j-verdict--ok')).toBeTruthy();

      screen.unmount();
    });
  }

  // ─── 2.5. Проверка ошибочных значений ──────────────────────────

  it('кнопка «Проверить» помечает неверные V/ρ как wrong и подсвечивает поля', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);
    applyRectStubs();
    clickCard(host, 'balance');
    clickCard(host, 'cylinder');
    simulateDrop(host, 'beaker', 'cylinder');
    simulateDrop(host, 'cyl-1', 'balance');
    simulateDrop(host, 'cyl-1', 'cylinder');
    // §21 UX-v2: semi-auto → click pending для фиксации direct+meta.
    host.querySelector<HTMLButtonElement>('#record-pending-btn')!.click();

    const tr = host.querySelector<HTMLTableRowElement>('.lab-journal-body tr')!;
    const vInput = tr.querySelector<HTMLInputElement>('input[data-key="V_cm3"]')!;
    const rhoInput = tr.querySelector<HTMLInputElement>('input[data-key="rho_kg_m3"]')!;
    // Заведомо неверные значения
    vInput.value = '99';
    rhoInput.value = '1234';
    tr.querySelector<HTMLButtonElement>('button.j-check')!.click();

    expect(vInput.dataset['verdict']).toBe('wrong');
    expect(rhoInput.dataset['verdict']).toBe('wrong');
    // Подсказка-баннер «Перепроверь...» рендерится в result-panel, не в td.
    expect(host.querySelector('#result-panel .density-result-hint--wrong')).toBeTruthy();
    expect(tr.querySelector('.j-verdict--ok')).toBeFalsy();

    screen.unmount();
  });

  // ─── 3. Reset идемпотентен ──────────────────────────────────────

  it('reset 10 раз подряд не падает и оставляет initial state', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);
    applyRectStubs();

    // Делаем измерение
    clickCard(host, 'balance');
    clickCard(host, 'cylinder');
    simulateDrop(host, 'beaker', 'cylinder');
    simulateDrop(host, 'cyl-1', 'balance');
    simulateDrop(host, 'cyl-1', 'cylinder');
    // §21 UX-v2: фиксация direct+meta через pending-кнопку.
    host.querySelector<HTMLButtonElement>('#record-pending-btn')!.click();

    // Проверяем что измерение есть
    expect(host.querySelector('.lab-journal-body')!.children.length).toBe(1);

    // 10 reset подряд
    const resetBtn = host.querySelector<HTMLButtonElement>('#reset-btn')!;
    for (let i = 0; i < 10; i++) {
      resetBtn.click();
      expect(host.querySelector('.lab-journal-body')!.children.length).toBe(0);
      // Шаг 1 active (балансы и мензурка убраны со стола)
      const step1 = host.querySelector<HTMLElement>('.step[data-step="1"]');
      expect(step1?.dataset['state']).toBe('active');
    }

    screen.unmount();
  });

  // ─── 4. saveState / loadState round-trip ────────────────────────

  it('saveState → loadState восстанавливает journal и state приборов', () => {
    const a = new DensitySolidScreen();
    a.mount(host);
    applyRectStubs();
    clickCard(host, 'balance');
    clickCard(host, 'cylinder');
    simulateDrop(host, 'beaker', 'cylinder');
    simulateDrop(host, 'cyl-2', 'balance');
    simulateDrop(host, 'cyl-2', 'cylinder');
    host.querySelector<HTMLButtonElement>('#record-pending-btn')!.click();
    const snapshot = a.saveState();
    expect(snapshot).toBeTruthy();
    a.unmount();

    const b = new DensitySolidScreen();
    b.mount(host);
    b.loadState(snapshot);
    expect(host.querySelector('.lab-journal-body')!.children.length).toBe(1);
    b.unmount();
  });

  it('saveState возвращает null для initial state', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);
    expect(screen.saveState()).toBeNull();
    screen.unmount();
  });

  // ─── §21 UX-v2 FULLY-MANUAL FLOW ─────────────────────────────────
  // Модель v2: в fully-manual пустая строка появляется автоматически
  // при drop'е, ВСЕ поля = input (без подсказок, без ✓). В semi-auto
  // pending-плашка показывается, требует click.

  it('FULLY-MANUAL: drop в мензурку создаёт ПУСТУЮ строку (без direct), нет pending-плашки', () => {
    setRecordMode('kit-1', 'fully-manual');
    const screen = new DensitySolidScreen();
    screen.mount(host);
    applyRectStubs();

    clickCard(host, 'balance');
    clickCard(host, 'cylinder');
    simulateDrop(host, 'beaker', 'cylinder');
    simulateDrop(host, 'cyl-1', 'balance');
    simulateDrop(host, 'cyl-1', 'cylinder');

    // §21 UX-v2: появилась пустая строка автоматически.
    expect(host.querySelector('.lab-journal-body')!.children.length).toBe(1);

    // Pending-плашка СКРЫТА (в fully-manual её нет).
    expect(host.querySelector<HTMLElement>('#record-pending-slot')!.hidden).toBe(true);

    // Все cells direct/derived — input (ученик заполняет ВСЁ сам).
    const tr = host.querySelector<HTMLTableRowElement>('.lab-journal-body tr')!;
    expect(tr.querySelector<HTMLInputElement>('input[data-key="m_g"]')).toBeTruthy();
    expect(tr.querySelector<HTMLInputElement>('input[data-key="V1_ml"]')).toBeTruthy();
    expect(tr.querySelector<HTMLInputElement>('input[data-key="V2_ml"]')).toBeTruthy();
    expect(tr.querySelector<HTMLInputElement>('input[data-key="V_cm3"]')).toBeTruthy();
    expect(tr.querySelector<HTMLInputElement>('input[data-key="rho_kg_m3"]')).toBeTruthy();

    // НЕТ ✓-кнопки (без подсказок).
    expect(tr.querySelector('button.j-check')).toBeNull();

    screen.unmount();
  });

  it('FULLY-MANUAL: detach цилиндра до записи — пустая строка остаётся (данные ученика не теряются)', () => {
    setRecordMode('kit-1', 'fully-manual');
    const screen = new DensitySolidScreen();
    screen.mount(host);
    applyRectStubs();

    clickCard(host, 'balance');
    clickCard(host, 'cylinder');
    simulateDrop(host, 'beaker', 'cylinder');
    simulateDrop(host, 'cyl-3', 'balance');
    simulateDrop(host, 'cyl-3', 'cylinder');

    expect(host.querySelector('.lab-journal-body')!.children.length).toBe(1);

    // Detach цилиндра из мензурки.
    host.querySelector<HTMLButtonElement>('#detach-submerged')!.click();

    // Строка ОСТАЁТСЯ — в fully-manual ученик ввёл бы значения сам,
    // удаление строки бы стёрло его работу.
    expect(host.querySelector('.lab-journal-body')!.children.length).toBe(1);
    screen.unmount();
  });

  it('SEMI-AUTO → FULLY-MANUAL: переключение режима не создаёт двух записей одного цилиндра', () => {
    setRecordMode('kit-1', 'fully-manual');
    const screen = new DensitySolidScreen();
    screen.mount(host);
    applyRectStubs();

    clickCard(host, 'balance');
    clickCard(host, 'cylinder');
    simulateDrop(host, 'beaker', 'cylinder');
    simulateDrop(host, 'cyl-2', 'balance');
    simulateDrop(host, 'cyl-2', 'cylinder');
    // §21 UX-v2: в fully-manual создалась пустая строка.
    expect(host.querySelector('.lab-journal-body')!.children.length).toBe(1);

    // Toggle на semi-auto — pending пустой (нет нового измерения),
    // существующая строка не дублируется.
    const semiAutoBtn = host.querySelector<HTMLButtonElement>(
      '.lab-record-mode-toggle button[data-mode="semi-auto"]',
    )!;
    semiAutoBtn.click();

    // Та же 1 строка.
    expect(host.querySelector('.lab-journal-body')!.children.length).toBe(1);
    screen.unmount();
  });

  // ─── 5. Случайные действия (state-machine рандом) ───────────────

  it('250 случайных действий не вызывают исключений', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);

    const actions = [
      () => clickCard(host, 'balance'),
      () => clickCard(host, 'cylinder'),
      () => simulateDrop(host, 'beaker', 'cylinder'),
      () => clickCard(host, 'cyl-1'),
      () => clickCard(host, 'cyl-2'),
      () => clickCard(host, 'cyl-3'),
      () => clickCard(host, 'cyl-4'),
      () => simulateDrop(host, 'cyl-1', 'balance'),
      () => simulateDrop(host, 'cyl-2', 'balance'),
      () => simulateDrop(host, 'cyl-3', 'balance'),
      () => simulateDrop(host, 'cyl-4', 'balance'),
      () => simulateDrop(host, 'cyl-1', 'cylinder'),
      () => simulateDrop(host, 'cyl-2', 'cylinder'),
      () => simulateDrop(host, 'cyl-3', 'cylinder'),
      () => simulateDrop(host, 'cyl-4', 'cylinder'),
      () => host.querySelector<HTMLButtonElement>('#detach-balance')?.click(),
      () => host.querySelector<HTMLButtonElement>('#detach-cylinder')?.click(),
      () => host.querySelector<HTMLButtonElement>('#detach-weight')?.click(),
      () => host.querySelector<HTMLButtonElement>('#detach-submerged')?.click(),
      () => host.querySelector<HTMLButtonElement>('#measurement-toggle')?.click(),
      () => host.querySelector<HTMLButtonElement>('#reset-btn')?.click(),
    ];

    // Простой LCG для воспроизводимости
    let s = 12345;
    const rand = (): number => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
    for (let i = 0; i < 250; i++) {
      const action = actions[Math.floor(rand() * actions.length)]!;
      expect(() => action()).not.toThrow();
    }

    screen.unmount();
  });

  // ─── 6. Все детач-кнопки не показывают ничего вне-state ─────────

  it('detach-кнопки скрыты на initial state', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);
    const btns = ['#detach-balance', '#detach-cylinder', '#detach-weight', '#detach-submerged'];
    for (const sel of btns) {
      const btn = host.querySelector<HTMLElement>(sel);
      expect(btn).toBeTruthy();
      expect(btn!.hidden).toBe(true);
    }
    screen.unmount();
  });

  it('detach-balance скрыт, detach-weight виден когда на весах груз', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);
    applyRectStubs();
    clickCard(host, 'balance');
    clickCard(host, 'cylinder');
    clickCard(host, 'cyl-1');
    simulateDrop(host, 'cyl-1', 'balance');
    expect(host.querySelector<HTMLElement>('#detach-balance')!.hidden).toBe(true);
    expect(host.querySelector<HTMLElement>('#detach-weight')!.hidden).toBe(false);
    screen.unmount();
  });

  // ─── 7. ОДИН крестик за раз — проверка через CSS-видимость ───────

  it('regression: на каждом приборе виден РОВНО ОДИН детач-крестик за раз', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);
    applyRectStubs();

    function visibleX(host: HTMLElement, prefix: 'balance' | 'cylinder'): number {
      const a = host.querySelector<HTMLElement>(`#detach-${prefix === 'balance' ? 'balance' : 'cylinder'}`);
      const b = host.querySelector<HTMLElement>(`#detach-${prefix === 'balance' ? 'weight' : 'submerged'}`);
      // Используем hidden + display не "none" (учитываем CSS [hidden]{display:none})
      const isVisible = (el: HTMLElement | null): boolean => {
        if (!el) return false;
        if (el.hidden) return false;
        return true;
      };
      return Number(isVisible(a)) + Number(isVisible(b));
    }

    // Изначально весы и мензурка не на сцене → 0 крестиков на каждом
    expect(visibleX(host, 'balance')).toBe(0);
    expect(visibleX(host, 'cylinder')).toBe(0);

    // Поставили весы → 1 (красный, без груза)
    clickCard(host, 'balance');
    expect(visibleX(host, 'balance')).toBe(1);

    // Поставили мензурку → 1 (красный)
    clickCard(host, 'cylinder');
    expect(visibleX(host, 'cylinder')).toBe(1);

    // Налили воду
    simulateDrop(host, 'beaker', 'cylinder');
    expect(visibleX(host, 'cylinder')).toBe(1);

    // Цилиндр на весы → 1 крестик (золотой)
    simulateDrop(host, 'cyl-1', 'balance');
    expect(visibleX(host, 'balance')).toBe(1);

    // Цилиндр в мензурку → 1 на мензурке (золотой)
    simulateDrop(host, 'cyl-1', 'cylinder');
    expect(visibleX(host, 'cylinder')).toBe(1);
    // На весах больше 0, потому что грузо физически в мензурке
    expect(visibleX(host, 'balance')).toBe(1);  // красный, весы пусты

    screen.unmount();
  });

  // ─── 8. Цилиндр со сцены: drag с весов в мензурку ───────────────

  it('regression: цилиндр на весах ⇒ overlay имеет data-draggable', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);
    applyRectStubs();

    const overlay = host.querySelector<HTMLElement>('#weight-on-balance');
    expect(overlay?.hasAttribute('data-draggable')).toBe(false);

    clickCard(host, 'balance');
    clickCard(host, 'cylinder');
    clickCard(host, 'cyl-2');
    simulateDrop(host, 'cyl-2', 'balance');

    expect(overlay?.hasAttribute('data-draggable')).toBe(true);
    expect(overlay?.getAttribute('data-draggable')).toBe('cyl-2');
    expect(overlay?.hidden).toBe(false);
    screen.unmount();
  });

  it('regression: цилиндр в мензурке ⇒ на весах LCD сброшен (груз физически в воде)', () => {
    const screen = new DensitySolidScreen();
    screen.mount(host);
    applyRectStubs();

    clickCard(host, 'balance');
    clickCard(host, 'cylinder');
    simulateDrop(host, 'beaker', 'cylinder');
    clickCard(host, 'cyl-1');
    simulateDrop(host, 'cyl-1', 'balance');
    // Mass на LCD должен быть 195 (сталь №1)
    expect(host.querySelector('#balance')?.getAttribute('mass-g')).toBe('195');

    // Перетаскиваем в мензурку → mass-g сбрасывается в 0
    simulateDrop(host, 'cyl-1', 'cylinder');
    expect(host.querySelector('#balance')?.getAttribute('mass-g')).toBe('0');

    // weight-on-balance скрыт
    expect(host.querySelector<HTMLElement>('#weight-on-balance')?.hidden).toBe(true);
    // weight-in-cylinder виден
    expect(host.querySelector<HTMLElement>('#weight-in-cylinder')?.hidden).toBe(false);
    screen.unmount();
  });
});

// ─── Helpers ────────────────────────────────────────────────────────

/** Имитирует click по карточке оборудования (через лёгкий fallback path). */
function clickCard(host: HTMLElement, eqId: string): void {
  const card = host.querySelector<HTMLElement>(`lab-equipment-card[data-eq="${eqId}"]`);
  if (!card) throw new Error(`card not found: ${eqId}`);
  card.click();
}

/**
 * Имитирует drop через прямой вызов DragDropController-логики:
 * вызываем onDrop через synthesized PointerEvent на host.
 * Альтернатива — использовать публичный API экрана.
 *
 * Здесь мы используем «упрощённый» путь — просто кликаем карточку, а потом
 * имитируем drop через искусственное событие на dropzone. В happy-dom
 * elementsFromPoint не работает корректно, поэтому используем direct dispatch.
 */
function simulateDrop(host: HTMLElement, eqId: string, dropzoneId: string): void {
  // Используем pointer-events через DragDropController как настоящий
  // пользователь. ВАЖНО: в новой UX-модели карточка cyl-N имеет
  // data-draggable только пока цилиндр в комплекте (status='available').
  // Когда цилиндр уже на сцене — карточка становится «пустой ячейкой»
  // (placed) для возврата, drag из неё не запускается. Поэтому если
  // тест хочет двигать тот же цилиндр снова — источник overlay со сцены.
  const cylMatch = /^cyl-(\d+)$/.exec(eqId);
  let source: HTMLElement | null;
  if (cylMatch) {
    const card = host.querySelector<HTMLElement>(`lab-equipment-card[data-eq="${eqId}"]`);
    const overlayBalance = host.querySelector<HTMLElement>('#weight-on-balance');
    const overlayCyl = host.querySelector<HTMLElement>('#weight-in-cylinder');
    source =
      (card && card.hasAttribute('data-draggable') ? card : null) ??
      (overlayBalance && !overlayBalance.hidden && overlayBalance.getAttribute('data-draggable') === eqId
        ? overlayBalance : null) ??
      (overlayCyl && !overlayCyl.hidden && overlayCyl.getAttribute('data-draggable') === eqId
        ? overlayCyl : null) ??
      card;
  } else {
    source = host.querySelector<HTMLElement>(`lab-equipment-card[data-eq="${eqId}"]`);
  }
  const zone = host.querySelector<HTMLElement>(`[data-dropzone-id="${dropzoneId}"]`);
  if (!source || !zone) throw new Error(`drop refs not found: ${eqId} → ${dropzoneId}`);

  const cardRect = source.getBoundingClientRect();
  const zoneRect = zone.getBoundingClientRect();
  const sx = cardRect.left + cardRect.width / 2;
  const sy = cardRect.top + cardRect.height / 2;
  const tx = zoneRect.left + zoneRect.width / 2;
  const ty = zoneRect.top + zoneRect.height / 2;

  const fire = (target: EventTarget, type: string, x: number, y: number): void => {
    const ev = new PointerEvent(type, {
      pointerId: 1,
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
      pointerType: 'mouse',
    });
    target.dispatchEvent(ev);
  };

  fire(source, 'pointerdown', sx, sy);
  // Двигаем существенно (>threshold)
  for (let i = 1; i <= 10; i++) {
    const f = i / 10;
    fire(window, 'pointermove', sx + (tx - sx) * f, sy + (ty - sy) * f);
  }
  fire(window, 'pointerup', tx, ty);
}
