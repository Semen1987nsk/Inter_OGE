/**
 * lab-dynamometer — render + integration тесты для планшетного школьного
 * динамометра (опыт 1.2 «Архимед», этап 8 спеки 2026-05-07).
 *
 * Покрытие:
 *   - render с дефолтами (range=1, force=0) и range=5
 *   - геометрия указателя: середина / низ / clamp за границу
 *   - LCD-формат: 2 знака для range=1, 1 знак для range=5, запятая RU
 *   - ARIA-label
 *   - геометрический API: getTopHookY, getHookPosition,
 *     getWeightHookPosition, getWeightHookY
 *   - setReadingMark показ/скрытие и значение в бейдже
 *   - scale-click событие с округлением к шагу деления
 *   - hover/leave у scale-area
 *   - перерисовка пружины при изменении force
 *   - clipPath dyno-window-clip
 *
 * Используется happy-dom + customElements (vitest), как в lab-thread/
 * lab-metal-weight тестах.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

beforeAll(async () => {
  await import('../ui/components/lab-dynamometer');
});

afterEach(() => {
  document.body.innerHTML = '';
});

interface DynamometerLike extends HTMLElement {
  range: number;
  force: number;
  getTopHookY(): number;
  getHookPosition(): { x: number; y: number };
  getWeightHookPosition(): { x: number; y: number };
  getWeightHookY(): number;
  predictWeightHookY(forceN: number): number;
  setReadingMark(valueN: number | null): void;
}

/**
 * Мокаем getBoundingClientRect: happy-dom не выполняет реальный layout.
 * Дефолтный host-rect для динамометра — 76×220 (после §19.11.16: SVG сжата
 * с 90×250 до 76×220, BODY_H 200→165, шток ВСЕГДА выходит наружу — крюк
 * фиксирован на y=201 в SVG-юнитах. См. lab-dynamometer.ts).
 */
function mockRect(el: HTMLElement, width = 76, height = 220): void {
  el.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    }) as DOMRect;
}

function mount(attrs: Record<string, string | number> = {}): DynamometerLike {
  const el = document.createElement('lab-dynamometer') as DynamometerLike;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  document.body.appendChild(el);
  return el;
}

// Геометрия из lab-dynamometer.ts (синхронизация с SVG-константами после
// §19.11.16: SVG 76×220, BODY_H 165, WINDOW_H 130, шток всегда наружу,
// крюк фиксирован y=201 в SVG-юнитах).
const SVG_WIDTH = 76;
const SVG_HEIGHT = 220;
const WINDOW_Y = 42;
const WINDOW_H = 130;
const WINDOW_W = 48;

describe('lab-dynamometer — render с дефолтами', () => {
  it('рендерится: корпус, окно, scale-area, нижний крюк, LCD «0,00 Н»', () => {
    const el = mount();
    const root = el.shadowRoot!;

    // Корпус (rect с x=11 y=20 — BODY_X/BODY_Y)
    const body = root.querySelector('rect[x="11"][y="20"]');
    expect(body).not.toBeNull();

    // Прозрачное окно (x=14 y=42 — WINDOW_X/WINDOW_Y)
    const win = root.querySelector('rect[x="14"][y="42"]');
    expect(win).not.toBeNull();

    // scale-area для кликов
    expect(root.querySelector('.scale-area')).not.toBeNull();

    // Нижний крюк (group + ellipse)
    expect(root.querySelector('.bottom-hook')).not.toBeNull();
    expect(root.querySelector('.hook-loop')).not.toBeNull();

    // LCD-плашка с цифровым показанием
    const readout = root.querySelector('.readout-text')!;
    expect(readout).not.toBeNull();
    expect(readout.textContent).toBe('0,00 Н');
  });

  it('range=1: 11 major-tick подписей в одной колонке (0,0…1,0)', () => {
    const el = mount();
    const root = el.shadowRoot!;
    const leftTexts = root.querySelectorAll('.scale-left text');
    const rightTexts = root.querySelectorAll('.scale-right text');
    // 11 major (0..10) — по одной text на каждое деление в левой колонке.
    // После §19.11.16: SVG сжата до 76px ширины — двойная шкала перестала
    // помещаться (цифры слипались), оставили только левую колонку с цифрами.
    // Правая колонка теперь содержит только короткие риски (без цифр).
    expect(leftTexts.length).toBe(11);
    expect(rightTexts.length).toBe(0);

    // Первая подпись = "0,0", последняя = "1,0".
    expect(leftTexts[0]!.textContent).toBe('0,0');
    expect(leftTexts[leftTexts.length - 1]!.textContent).toBe('1,0');
  });
});

describe('lab-dynamometer — range=5', () => {
  it('LCD-формат: 1 знак после запятой («0,0 Н»)', () => {
    const el = mount({ range: 5 });
    const lcd = el.shadowRoot!.querySelector('.readout-text')!;
    expect(lcd.textContent).toBe('0,0 Н');
  });

  it('шкала: 11 меток с лейблами 0/0.5/1/1.5/.../5', () => {
    const el = mount({ range: 5 });
    const leftTexts = el.shadowRoot!.querySelectorAll('.scale-left text');
    expect(leftTexts.length).toBe(11);
    // 0 → "0", 0.5 → "0.5" (range=5: целые числа без запятой; 0.5 формируется
    // через value.toString(), запятая там не вставляется — оставляем как есть
    // согласно spec, поскольку эта шкала "Н" с шагом 0.5 — мелкий нюанс).
    expect(leftTexts[0]!.textContent).toBe('0');
    expect(leftTexts[1]!.textContent).toBe('0.5');
    expect(leftTexts[2]!.textContent).toBe('1');
    expect(leftTexts[10]!.textContent).toBe('5');
  });

  it('маркировка диапазона сверху корпуса = «5Н»', () => {
    const el = mount({ range: 5 });
    const brand = el.shadowRoot!.querySelector('.brand-range-top')!;
    expect(brand.textContent).toBe('5Н');
  });
});

describe('lab-dynamometer — указатель и пружина', () => {
  it('force=0: указатель в верхней точке окна (y = WINDOW_Y)', () => {
    const el = mount();
    const pointer = el.shadowRoot!.querySelector('.dyno-pointer')!;
    expect(pointer.getAttribute('transform')).toBe(`translate(0 ${WINDOW_Y})`);
  });

  it('force=0.5 при range=1: указатель в середине окна', () => {
    const el = mount({ range: 1, force: 0.5 });
    const pointer = el.shadowRoot!.querySelector('.dyno-pointer')!;
    const expectedY = WINDOW_Y + 0.5 * WINDOW_H;
    expect(pointer.getAttribute('transform')).toBe(`translate(0 ${expectedY})`);
  });

  it('force=1.0 при range=1: указатель в самом низу окна', () => {
    const el = mount({ range: 1, force: 1 });
    const pointer = el.shadowRoot!.querySelector('.dyno-pointer')!;
    const expectedY = WINDOW_Y + WINDOW_H;
    expect(pointer.getAttribute('transform')).toBe(`translate(0 ${expectedY})`);
  });

  it('force=1.5 при range=1: clamped к низу шкалы', () => {
    const el = mount({ range: 1, force: 1.5 });
    const pointer = el.shadowRoot!.querySelector('.dyno-pointer')!;
    const clampedY = WINDOW_Y + WINDOW_H;
    expect(pointer.getAttribute('transform')).toBe(`translate(0 ${clampedY})`);
  });

  it('пружина: смена force перерисовывает d-атрибут и удлиняет траекторию', () => {
    const el = mount({ range: 1, force: 0 });
    const pathEl = el.shadowRoot!.querySelector('.dyno-coil')!;
    const dAtZero = pathEl.getAttribute('d')!;
    expect(dAtZero).toMatch(/^M\s/);

    el.setAttribute('force', '1');
    const dAtOne = pathEl.getAttribute('d')!;
    expect(dAtOne).not.toBe(dAtZero);

    // Извлекаем все Y-координаты, последняя в force=1 должна быть БОЛЬШЕ
    // последней в force=0 (пружина растянулась вниз).
    const lastYInPath = (d: string): number => {
      const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      return nums[nums.length - 1] as number;
    };
    expect(lastYInPath(dAtOne)).toBeGreaterThan(lastYInPath(dAtZero));
  });

  it('clipPath dyno-window-clip существует для обрезки пружины за окном', () => {
    const el = mount();
    const clip = el.shadowRoot!.querySelector('clipPath#dyno-window-clip');
    expect(clip).not.toBeNull();
    const rect = clip!.querySelector('rect');
    expect(rect).not.toBeNull();
    expect(rect!.getAttribute('width')).toBe(String(WINDOW_W)); // WINDOW_W
    // Сама пружина ссылается на clipPath
    const coil = el.shadowRoot!.querySelector('.dyno-coil')!;
    expect(coil.getAttribute('clip-path')).toBe('url(#dyno-window-clip)');
  });
});

describe('lab-dynamometer — LCD-плашка', () => {
  it('range=1, force=0.69 → «0,69 Н» (2 знака, RU-запятая)', () => {
    const el = mount({ range: 1, force: 0.69 });
    const lcd = el.shadowRoot!.querySelector('.readout-text')!;
    expect(lcd.textContent).toBe('0,69 Н');
  });

  it('range=5, force=2.4 → «2,4 Н» (1 знак, RU-запятая)', () => {
    const el = mount({ range: 5, force: 2.4 });
    const lcd = el.shadowRoot!.querySelector('.readout-text')!;
    expect(lcd.textContent).toBe('2,4 Н');
  });

  it('force выше range — на LCD клампится к «range,XX Н»', () => {
    const el = mount({ range: 1, force: 1.5 });
    const lcd = el.shadowRoot!.querySelector('.readout-text')!;
    expect(lcd.textContent).toBe('1,00 Н');
  });
});

describe('lab-dynamometer — ARIA', () => {
  it('после connectedCallback: aria-label содержит диапазон и текущее показание', () => {
    const el = mount({ range: 1, force: 0.69 });
    const label = el.getAttribute('aria-label');
    expect(label).toContain('Динамометр 0…1 Н');
    // Этап 10 fix (a): ru-RU запятая в ARIA, как в LCD.
    expect(label).toContain('текущее показание 0,69 Н');
  });

  it('aria-label обновляется при смене force', () => {
    const el = mount({ range: 1, force: 0 });
    expect(el.getAttribute('aria-label')).toContain('0,00 Н');
    el.setAttribute('force', '0.5');
    expect(el.getAttribute('aria-label')).toContain('0,50 Н');
  });

  it('aria-label НЕ содержит ожидаемого «правильного» ответа — только текущее показание', () => {
    // Регрессия канона: ARIA не палит ответ.
    const el = mount({ range: 1, force: 0.245 });
    const label = el.getAttribute('aria-label')!;
    expect(label).not.toMatch(/правильно|верно|ожидаем|должно/i);
  });
});

describe('lab-dynamometer — geometric API', () => {
  it('getTopHookY: число > 0 (точка верхнего крюка в host-space)', () => {
    const el = mount();
    mockRect(el);
    const y = el.getTopHookY();
    expect(y).toBeGreaterThan(0);
    // viewBox y=6, host=SVG_HEIGHT (1:1) → y_host = 6.
    expect(y).toBeCloseTo((6 / SVG_HEIGHT) * SVG_HEIGHT, 4);
  });

  it('getHookPosition: {x, y} оба числа, x — центр host (38/76 = 0.5)', () => {
    const el = mount();
    mockRect(el, SVG_WIDTH, SVG_HEIGHT);
    const pos = el.getHookPosition();
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
    expect(pos.x).toBeCloseTo((38 / SVG_WIDTH) * SVG_WIDTH, 4);
    expect(pos.y).toBeCloseTo((6 / SVG_HEIGHT) * SVG_HEIGHT, 4);
  });

  it('getWeightHookPosition: y фиксирована при изменении force (§19.11.16 крюк всегда наружу)', () => {
    // §19.11.16: шток теперь max(BODY_BOTTOM+8, pointerY+ROD_LEN_BASE).
    // При force ≤ range pointerY всегда ≤ WINDOW_Y+WINDOW_H = 172, поэтому
    // BODY_BOTTOM+8=193 побеждает clamp → крюк фиксирован y_svg=201.
    // Это упрощает позиционирование цилиндра и убирает нужду в force-компенсации.
    const el = mount({ range: 1, force: 0 });
    mockRect(el);
    const yAtZero = el.getWeightHookPosition().y;

    el.setAttribute('force', '1');
    const yAtOne = el.getWeightHookPosition().y;
    expect(yAtOne).toBe(yAtZero);
  });

  it('getWeightHookY === getWeightHookPosition().y', () => {
    const el = mount({ range: 1, force: 0.5 });
    mockRect(el);
    expect(el.getWeightHookY()).toBe(el.getWeightHookPosition().y);
  });

  it('масштабирование: при удвоении host-rect координаты удваиваются', () => {
    const small = mount({ range: 1, force: 0.5 });
    mockRect(small, SVG_WIDTH, SVG_HEIGHT);
    const big = mount({ range: 1, force: 0.5 });
    mockRect(big, SVG_WIDTH * 2, SVG_HEIGHT * 2);
    const ps = small.getWeightHookPosition();
    const pb = big.getWeightHookPosition();
    expect(pb.x).toBeCloseTo(ps.x * 2, 4);
    expect(pb.y).toBeCloseTo(ps.y * 2, 4);
  });

  it('predictWeightHookY(F=0) === getWeightHookY() при текущей force=0', () => {
    // Контракт §19.11.14: predictWeightHookY — чистая функция от F (без
    // мутации текущего force атрибута), которая совпадает с getWeightHookY,
    // если F равно текущему. Используется в #computeDipOffset для
    // компенсации «поднятия крюка» при падении силы во время погружения.
    const el = mount({ range: 1, force: 0 });
    mockRect(el);
    expect(el.predictWeightHookY(0)).toBeCloseTo(el.getWeightHookY(), 4);
  });

  it('predictWeightHookY(F=1) === predictWeightHookY(F=0): крюк фиксирован (§19.11.16)', () => {
    // После §19.11.16 шток выходит наружу всегда: rodEnd = max(BODY_BOTTOM+8, ...).
    // При типичных силах clamp побеждает, и крюк фиксирован — это **нужно**
    // оркестратору, чтобы цилиндр не «всплывал» при падении силы (compensation
    // больше не требуется).
    const el = mount({ range: 1, force: 0 });
    mockRect(el);
    const yAt0 = el.predictWeightHookY(0);
    const yAt1 = el.predictWeightHookY(1);
    expect(yAt1).toBe(yAt0);
  });

  it('predictWeightHookY НЕ меняет атрибут force и не дёргает текущий рендер', () => {
    // Главный контракт «pure-prediction»: вызов predictWeightHookY с любым
    // значением F не должен синхронно менять force-атрибут компонента.
    const el = mount({ range: 1, force: 0.3 });
    mockRect(el);
    el.predictWeightHookY(0.9);
    expect(el.getAttribute('force')).toBe('0.3');
    expect(el.force).toBe(0.3);
  });

  it('predictWeightHookY клампит F к [0..range]: F=2 при range=1 ≡ F=1', () => {
    const el = mount({ range: 1, force: 0 });
    mockRect(el);
    expect(el.predictWeightHookY(2)).toBeCloseTo(el.predictWeightHookY(1), 4);
  });
});

describe('lab-dynamometer — setReadingMark', () => {
  it('setReadingMark(0.55): синяя риска появляется, бейдж содержит число и Н', () => {
    const el = mount({ range: 1, force: 0.55 });
    el.setReadingMark(0.55);
    const mark = el.shadowRoot!.querySelector<SVGGElement>('.reading-mark')!;
    expect(mark.style.display).toBe('');
    const value = el.shadowRoot!.querySelector('.reading-value')!;
    // Этап 10 fix (a): #formatN теперь возвращает запятую — единый формат
    // во всех визуальных подписях (LCD/hover/reading-mark/ARIA).
    expect(value.textContent).toBe('0,55 Н');
    // transform содержит правильную Y (середина окна)
    const expectedY = WINDOW_Y + 0.55 * WINDOW_H;
    expect(mark.getAttribute('transform')).toBe(`translate(0 ${expectedY})`);
  });

  it('setReadingMark(null): риска скрыта (display:none)', () => {
    const el = mount();
    el.setReadingMark(0.5);
    const mark = el.shadowRoot!.querySelector<SVGGElement>('.reading-mark')!;
    expect(mark.style.display).toBe('');
    el.setReadingMark(null);
    expect(mark.style.display).toBe('none');
  });

  it('setReadingMark клампится к [0..range]: 1.5 при range=1 → визуально на низ', () => {
    const el = mount({ range: 1 });
    el.setReadingMark(1.5);
    const mark = el.shadowRoot!.querySelector<SVGGElement>('.reading-mark')!;
    const expectedY = WINDOW_Y + 1 * WINDOW_H;
    expect(mark.getAttribute('transform')).toBe(`translate(0 ${expectedY})`);
  });
});

describe('lab-dynamometer — scale-click событие', () => {
  it('interactive: клик по scale-area эмитит «scale-click» с округлённым valueN', () => {
    const el = mount({ range: 1, interactive: '' });
    mockRect(el);
    const scaleArea = el.shadowRoot!.querySelector<SVGRectElement>('.scale-area')!;
    // scale-area унаследует тот же rect (mock на host); но getBoundingClientRect
    // вызывается у scale-area, не у host — мокируем и его.
    scaleArea.getBoundingClientRect = () =>
      ({
        x: 0,
        y: WINDOW_Y,
        left: 0,
        top: WINDOW_Y,
        right: 90,
        bottom: WINDOW_Y + WINDOW_H,
        width: 90,
        height: WINDOW_H,
        toJSON: () => ({}),
      }) as DOMRect;

    let captured: { valueN: number } | null = null;
    el.addEventListener('scale-click', (e) => {
      captured = (e as CustomEvent).detail;
    });

    // Клик в середине scale-area: yLocal=110/220=0.5 → raw=0.5 → step=0.02 → 0.5
    const ev = new MouseEvent('click', {
      clientX: 45,
      clientY: WINDOW_Y + WINDOW_H / 2,
      bubbles: true,
    });
    scaleArea.dispatchEvent(ev);

    expect(captured).not.toBeNull();
    expect(captured!.valueN).toBeCloseTo(0.5, 5);
  });

  it('range=1: valueN округляется к шагу 0.02', () => {
    const el = mount({ range: 1, interactive: '' });
    const scaleArea = el.shadowRoot!.querySelector<SVGRectElement>('.scale-area')!;
    scaleArea.getBoundingClientRect = () =>
      ({
        x: 0,
        y: WINDOW_Y,
        left: 0,
        top: WINDOW_Y,
        right: 90,
        bottom: WINDOW_Y + WINDOW_H,
        width: 90,
        height: WINDOW_H,
        toJSON: () => ({}),
      }) as DOMRect;
    let captured: { valueN: number } | null = null;
    el.addEventListener('scale-click', (e) => {
      captured = (e as CustomEvent).detail;
    });
    // ratio 0.247 → raw=0.247 → 0.247/0.02=12.35 → 12*0.02=0.24
    const yClient = WINDOW_Y + 0.247 * WINDOW_H;
    scaleArea.dispatchEvent(
      new MouseEvent('click', { clientX: 45, clientY: yClient, bubbles: true }),
    );
    expect(captured).not.toBeNull();
    // Ровно кратно 0.02
    const remainder = (captured!.valueN * 100) % 2;
    expect(Math.abs(remainder) < 1e-9 || Math.abs(remainder - 2) < 1e-9).toBe(true);
  });

  it('range=5: valueN округляется к шагу 0.1', () => {
    const el = mount({ range: 5, interactive: '' });
    const scaleArea = el.shadowRoot!.querySelector<SVGRectElement>('.scale-area')!;
    scaleArea.getBoundingClientRect = () =>
      ({
        x: 0,
        y: WINDOW_Y,
        left: 0,
        top: WINDOW_Y,
        right: 90,
        bottom: WINDOW_Y + WINDOW_H,
        width: 90,
        height: WINDOW_H,
        toJSON: () => ({}),
      }) as DOMRect;
    let captured: { valueN: number } | null = null;
    el.addEventListener('scale-click', (e) => {
      captured = (e as CustomEvent).detail;
    });
    // ratio 0.28 → raw = 0.28*5 = 1.4 → ровно кратно шагу 0.1 (избегаем
    // floating-point round-off, как у 0.27 → 1.35: банкерский round может
    // дать 1.3 или 1.4 в зависимости от 1.349999.../1.350000...).
    const yClient = WINDOW_Y + 0.28 * WINDOW_H;
    scaleArea.dispatchEvent(
      new MouseEvent('click', { clientX: 45, clientY: yClient, bubbles: true }),
    );
    expect(captured).not.toBeNull();
    expect(captured!.valueN).toBeCloseTo(1.4, 5);
  });

  it('БЕЗ interactive: клик по scale-area не эмитит scale-click', () => {
    const el = mount({ range: 1 }); // без атрибута interactive
    const scaleArea = el.shadowRoot!.querySelector<SVGRectElement>('.scale-area')!;
    scaleArea.getBoundingClientRect = () =>
      ({
        x: 0,
        y: WINDOW_Y,
        left: 0,
        top: WINDOW_Y,
        right: 90,
        bottom: WINDOW_Y + WINDOW_H,
        width: 90,
        height: WINDOW_H,
        toJSON: () => ({}),
      }) as DOMRect;
    let fired = 0;
    el.addEventListener('scale-click', () => fired++);
    scaleArea.dispatchEvent(
      new MouseEvent('click', { clientX: 45, clientY: 100, bubbles: true }),
    );
    expect(fired).toBe(0);
  });

  it('clientY за пределами rect (выше) → событие НЕ эмитится', () => {
    const el = mount({ range: 1, interactive: '' });
    const scaleArea = el.shadowRoot!.querySelector<SVGRectElement>('.scale-area')!;
    scaleArea.getBoundingClientRect = () =>
      ({
        x: 0,
        y: WINDOW_Y,
        left: 0,
        top: WINDOW_Y,
        right: 90,
        bottom: WINDOW_Y + WINDOW_H,
        width: 90,
        height: WINDOW_H,
        toJSON: () => ({}),
      }) as DOMRect;
    let fired = 0;
    el.addEventListener('scale-click', () => fired++);
    // clientY=10 — это yLocal = 10 - WINDOW_Y = -40 → ratio < 0 → null
    scaleArea.dispatchEvent(
      new MouseEvent('click', { clientX: 45, clientY: 10, bubbles: true }),
    );
    expect(fired).toBe(0);
  });

  it('event.composed = true (пробивает Shadow DOM)', () => {
    const el = mount({ range: 1, interactive: '' });
    const scaleArea = el.shadowRoot!.querySelector<SVGRectElement>('.scale-area')!;
    scaleArea.getBoundingClientRect = () =>
      ({
        x: 0,
        y: WINDOW_Y,
        left: 0,
        top: WINDOW_Y,
        right: 90,
        bottom: WINDOW_Y + WINDOW_H,
        width: 90,
        height: WINDOW_H,
        toJSON: () => ({}),
      }) as DOMRect;
    let composed = false;
    el.addEventListener('scale-click', (e) => {
      composed = e.composed;
    });
    scaleArea.dispatchEvent(
      new MouseEvent('click', {
        clientX: 45,
        clientY: WINDOW_Y + WINDOW_H / 2,
        bubbles: true,
      }),
    );
    expect(composed).toBe(true);
  });
});

describe('lab-dynamometer — hover на scale', () => {
  it('pointermove над scale-area (interactive): hover-group видим, текст с N', () => {
    const el = mount({ range: 1, interactive: '' });
    const scaleArea = el.shadowRoot!.querySelector<SVGRectElement>('.scale-area')!;
    scaleArea.getBoundingClientRect = () =>
      ({
        x: 0,
        y: WINDOW_Y,
        left: 0,
        top: WINDOW_Y,
        right: 90,
        bottom: WINDOW_Y + WINDOW_H,
        width: 90,
        height: WINDOW_H,
        toJSON: () => ({}),
      }) as DOMRect;
    const hover = el.shadowRoot!.querySelector<SVGGElement>('.hover-group')!;
    const hoverText = el.shadowRoot!.querySelector('.hover-text')!;
    expect(hover.style.opacity).toBe('0');

    scaleArea.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 45,
        clientY: WINDOW_Y + WINDOW_H / 2,
        bubbles: true,
      }),
    );

    expect(hover.style.opacity).toBe('1');
    // ratio=0.5 → 0,50 N. Этап 10 fix (a): hover-text использует #formatN
    // и единый ru-RU формат (запятая) — как в LCD/ARIA/reading-mark.
    expect(hoverText.textContent).toBe('0,50');
    // transform содержит Y по центру окна
    const expectedY = WINDOW_Y + 0.5 * WINDOW_H;
    expect(hover.getAttribute('transform')).toBe(`translate(0 ${expectedY})`);
  });

  it('pointerleave: hover-group скрывается (opacity=0)', () => {
    const el = mount({ range: 1, interactive: '' });
    const scaleArea = el.shadowRoot!.querySelector<SVGRectElement>('.scale-area')!;
    scaleArea.getBoundingClientRect = () =>
      ({
        x: 0,
        y: WINDOW_Y,
        left: 0,
        top: WINDOW_Y,
        right: 90,
        bottom: WINDOW_Y + WINDOW_H,
        width: 90,
        height: WINDOW_H,
        toJSON: () => ({}),
      }) as DOMRect;
    const hover = el.shadowRoot!.querySelector<SVGGElement>('.hover-group')!;
    scaleArea.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 45,
        clientY: WINDOW_Y + WINDOW_H / 2,
        bubbles: true,
      }),
    );
    expect(hover.style.opacity).toBe('1');

    scaleArea.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(hover.style.opacity).toBe('0');
  });

  it('БЕЗ interactive: pointermove не активирует hover-group', () => {
    const el = mount({ range: 1 });
    const scaleArea = el.shadowRoot!.querySelector<SVGRectElement>('.scale-area')!;
    scaleArea.getBoundingClientRect = () =>
      ({
        x: 0,
        y: WINDOW_Y,
        left: 0,
        top: WINDOW_Y,
        right: 90,
        bottom: WINDOW_Y + WINDOW_H,
        width: 90,
        height: WINDOW_H,
        toJSON: () => ({}),
      }) as DOMRect;
    const hover = el.shadowRoot!.querySelector<SVGGElement>('.hover-group')!;
    scaleArea.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 45,
        clientY: WINDOW_Y + WINDOW_H / 2,
        bubbles: true,
      }),
    );
    // hover-group остался невидим (style.opacity не менялся, по дефолту 0)
    expect(hover.style.opacity).not.toBe('1');
  });
});

describe('lab-dynamometer — interactive tabIndex', () => {
  it('БЕЗ interactive: tabIndex по умолчанию (-1 от happy-dom)', () => {
    const el = mount();
    expect(el.tabIndex).toBeLessThan(0);
  });

  it('С interactive: tabIndex=0 после connectedCallback', () => {
    const el = mount({ interactive: '' });
    expect(el.tabIndex).toBe(0);
  });
});
