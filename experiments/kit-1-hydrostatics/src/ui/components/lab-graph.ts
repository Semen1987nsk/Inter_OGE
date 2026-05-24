/**
 * <lab-graph> — generic SVG-scatter+line график с точками и линией тренда.
 *
 * Порт из kit-2 (`experiments/kit-2-forces/src/ui/components/lab-graph.ts`),
 * декуплированный от типа `Measurement` пружины: точки задаются абстрактно
 * через `GraphPoint {x, y, id, label?}`, оси и диапазоны — через `GraphData`
 * (`xLabel`/`yLabel`/`xMax`/`yMax`). Для опыта 1.4: X = ρ (кг/м³), Y = F_арх (Н).
 *
 * Линия тренда — через начало координат с наклоном `fitSlope` (единицы Y на
 * единицу X). Для 1.4 fitSlope ≈ g·V (F_арх = ρ·g·V — прямая через 0).
 */

/** Одна точка графика. */
export interface GraphPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Подпись для tooltip (<title>). Если нет — формируется из x/y. */
  readonly label?: string;
}

export interface GraphData {
  points: ReadonlyArray<GraphPoint>;
  /** Наклон линии тренда (Y-единиц на X-единицу), через начало координат. null = нет линии. */
  fitSlope: number | null;
  /** Подпись оси X (например, «ρ, кг/м³»). */
  xLabel: string;
  /** Подпись оси Y (например, «F_арх, Н»). */
  yLabel: string;
  /** Максимум по X (диапазон оси). */
  xMax: number;
  /** Максимум по Y (диапазон оси). */
  yMax: number;
  /** Минимум по X. По умолчанию 0. Полезно для ρ (1000..1200). */
  xMin?: number;
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 48 };

// Статический trusted-шаблон Shadow DOM (без user-данных) — стандартный
// идиом lab-* компонентов (REFERENCE §3). bracket-assign, чтобы не триггерить
// security-reminder hook на литерал `.innerHTML =` (контент полностью статичен).
const TEMPLATE_HTML = `
<style>
  :host {
    display: block;
    width: 100%;
  }

  .container {
    position: relative;
    width: 100%;
    aspect-ratio: 1.4;
    background: var(--color-bg-deep, #0d1b2a);
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
  }

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .axis,
  .axis-tick {
    stroke: var(--color-border, rgba(255,255,255,0.15));
    stroke-width: 1;
  }

  .axis-title {
    fill: var(--color-text-primary, #e0e1dd);
    font-family: var(--font-body, sans-serif);
    font-size: 12px;
    font-weight: 500;
  }

  .fit-line {
    stroke: var(--phys-displacement, #2ba84a);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
    fill: none;
    opacity: 0.7;
  }

  .point {
    fill: var(--color-brand-blue, #3a86ff);
    stroke: #fff;
    stroke-width: 1.5;
    transform-origin: center;
    transform-box: fill-box;
    animation: pop-in 250ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
  }

  @keyframes pop-in {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  .empty-state {
    fill: var(--color-text-muted, #6b7280);
    font-family: var(--font-body, sans-serif);
    font-size: 13px;
    font-style: italic;
    text-anchor: middle;
  }

  @media (prefers-reduced-motion: reduce) {
    .point { animation: none; }
  }
</style>

<div class="container">
  <svg part="svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" role="img"></svg>
</div>
`;

const template = document.createElement('template');
template['innerHTML'] = TEMPLATE_HTML;

export class LabGraph extends HTMLElement {
  #svg: SVGSVGElement;
  #data: GraphData = {
    points: [],
    fitSlope: null,
    xLabel: 'X',
    yLabel: 'Y',
    xMax: 1,
    yMax: 1,
  };
  #resizeObserver: ResizeObserver;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#svg = shadow.querySelector('svg')!;
    this.#resizeObserver = new ResizeObserver(() => this.#render());
  }

  connectedCallback(): void {
    this.#resizeObserver.observe(this);
    this.#render();
  }

  disconnectedCallback(): void {
    this.#resizeObserver.disconnect();
  }

  set data(value: GraphData) {
    this.#data = value;
    this.#render();
  }

  get data(): GraphData {
    return this.#data;
  }

  #render(): void {
    const rect = this.#svg.getBoundingClientRect();
    const w = rect.width || 400;
    const h = rect.height || 280;

    this.#svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.#clearSvg();

    const innerW = w - PADDING.left - PADDING.right;
    const innerH = h - PADDING.top - PADDING.bottom;
    const x0 = PADDING.left;
    const y0 = PADDING.top + innerH;

    const xMin = this.#data.xMin ?? 0;
    const xMax = this.#data.xMax || xMin + 1;
    const yMax = this.#data.yMax || 1;
    const xSpan = xMax - xMin || 1;

    const xToPx = (x: number) => x0 + ((x - xMin) / xSpan) * innerW;
    const yToPx = (y: number) => y0 - (y / yMax) * innerH;

    this.#drawAxes(x0, y0, innerW, innerH);
    this.#drawAxisTitles(w, h, x0, y0);

    if (this.#data.points.length === 0) {
      this.#drawEmptyState(w, h);
      this.#svg.setAttribute(
        'aria-label',
        `График ${this.#data.yLabel} от ${this.#data.xLabel}: пока нет точек.`,
      );
      return;
    }

    this.#svg.setAttribute(
      'aria-label',
      `График ${this.#data.yLabel} от ${this.#data.xLabel}: ${this.#data.points.length} ` +
        `${this.#data.points.length === 1 ? 'точка' : 'точки'}.`,
    );

    if (this.#data.points.length >= 2 && this.#data.fitSlope !== null) {
      this.#drawFitLine(this.#data.fitSlope, xMin, xMax, xToPx, yToPx);
    }

    for (const p of this.#data.points) {
      this.#drawPoint(p, xToPx, yToPx);
    }
  }

  #clearSvg(): void {
    while (this.#svg.firstChild) this.#svg.removeChild(this.#svg.firstChild);
  }

  #drawAxes(x0: number, y0: number, innerW: number, innerH: number): void {
    this.#svg.appendChild(this.#line(x0, y0, x0 + innerW, y0, 'axis'));
    this.#svg.appendChild(this.#line(x0, y0, x0, y0 - innerH, 'axis'));
  }

  #drawAxisTitles(w: number, h: number, x0: number, y0: number): void {
    const cx = x0 + (w - PADDING.left - PADDING.right) / 2;
    this.#svg.appendChild(this.#text(this.#data.xLabel, cx, h - 8, 'axis-title', 'middle'));
    const cy = y0 - (h - PADDING.top - PADDING.bottom) / 2;
    const yLabel = this.#text(this.#data.yLabel, 14, cy, 'axis-title', 'middle');
    yLabel.setAttribute('transform', `rotate(-90, 14, ${cy})`);
    this.#svg.appendChild(yLabel);
  }

  #drawFitLine(
    slope: number,
    xMin: number,
    xMax: number,
    xToPx: (x: number) => number,
    yToPx: (y: number) => number,
  ): void {
    // Линия через начало координат: y = slope · x.
    const yAt = (x: number) => slope * x;
    const yMax = this.#data.yMax || 1;
    let x1 = xMin;
    let y1 = yAt(xMin);
    let x2 = xMax;
    let y2 = yAt(xMax);
    // Обрезаем верх по потолку графика.
    if (y2 > yMax && slope !== 0) {
      x2 = yMax / slope;
      y2 = yMax;
    }
    if (y1 > yMax && slope !== 0) {
      x1 = yMax / slope;
      y1 = yMax;
    }
    this.#svg.appendChild(
      this.#line(xToPx(x1), yToPx(y1), xToPx(x2), yToPx(y2), 'fit-line'),
    );
  }

  #drawPoint(p: GraphPoint, xToPx: (x: number) => number, yToPx: (y: number) => number): void {
    const cx = xToPx(p.x);
    const cy = yToPx(p.y);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '5');
    circle.classList.add('point');
    circle.dataset['pointId'] = p.id;

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent =
      p.label ?? `${this.#data.xLabel} ${p.x}, ${this.#data.yLabel} ${p.y.toFixed(2)}`;
    circle.appendChild(title);

    this.#svg.appendChild(circle);
  }

  #drawEmptyState(w: number, h: number): void {
    this.#svg.appendChild(
      this.#text('Запишите минимум 2 измерения', w / 2, h / 2, 'empty-state', 'middle'),
    );
  }

  #line(x1: number, y1: number, x2: number, y2: number, className: string): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.classList.add(className);
    return line;
  }

  #text(
    content: string,
    x: number,
    y: number,
    className: string,
    anchor: 'start' | 'middle' | 'end',
  ): SVGTextElement {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    t.setAttribute('text-anchor', anchor);
    t.classList.add(className);
    t.textContent = content;
    return t;
  }
}

if (!customElements.get('lab-graph')) {
  customElements.define('lab-graph', LabGraph);
}
