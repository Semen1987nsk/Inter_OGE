/**
 * <lab-graph> — SVG-график с поддержкой нескольких серий (I(U) или другой зависимости).
 *
 * Принимает данные через свойство `data` (мульти-серийный API).
 * Каждая серия: {id, color, fit:'line'|'curve'|null, points[]}.
 *   fit:'line'  — линейный МНК через 0 (slope = Σxy/Σx²), линия цветом серии
 *   fit:'curve' — polyline через точки, отсортированные по x, цветом серии
 *   fit:null    — только точки, без линии
 * Hover на точке → событие `delete-point` с id.
 */

export interface GraphPoint {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export interface GraphSeries {
  id: string;
  color: string;
  fit: 'line' | 'curve' | null;
  points: ReadonlyArray<GraphPoint>;
}

export interface GraphData {
  series: ReadonlyArray<GraphSeries>;
  xLabel: string;
  yLabel: string;
  xMax: number;
  yMax: number;
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 40 };

const template = document.createElement('template');
template.innerHTML = `
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

  .axis-label {
    fill: var(--color-text-secondary, #9ca3af);
    font-family: var(--font-body, sans-serif);
    font-size: 11px;
  }

  .axis-title {
    fill: var(--color-text-primary, #e0e1dd);
    font-family: var(--font-body, sans-serif);
    font-size: 12px;
    font-weight: 500;
  }

  .grid-line {
    stroke: rgba(255,255,255,0.04);
    stroke-width: 1;
  }

  .fit-line {
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
    fill: none;
    opacity: 0.7;
  }

  .fit-curve {
    stroke-width: 1.5;
    fill: none;
    opacity: 0.7;
  }

  .point {
    stroke: #fff;
    stroke-width: 1.5;
    cursor: pointer;
    transition: r 150ms var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
    transform-origin: center;
    transform-box: fill-box;
    animation: pop-in 250ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
  }

  .point:hover {
    r: 7;
    filter: brightness(1.3);
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

  svg[hidden] { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .point { animation: none; }
  }
</style>

<div class="container">
  <svg part="svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"></svg>
</div>
`;

export class LabGraph extends HTMLElement {
  #svg: SVGSVGElement;
  #data: GraphData = { series: [], xLabel: 'x', yLabel: 'y', xMax: 10, yMax: 10 };
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
    this.#svg.innerHTML = '';

    const innerW = w - PADDING.left - PADDING.right;
    const innerH = h - PADDING.top - PADDING.bottom;
    const x0 = PADDING.left;
    const y0 = PADDING.top + innerH;

    const xMax = this.#data.xMax;
    const yMax = this.#data.yMax;
    const xToPx = (xV: number) => x0 + (xV / xMax) * innerW;
    const yToPx = (yV: number) => y0 - (yV / yMax) * innerH;

    this.#drawGrid(x0, innerW, innerH, xToPx, yToPx);
    this.#drawAxes(x0, y0, innerW, innerH);
    this.#drawAxisTicks(x0, y0, xToPx, yToPx);
    this.#drawAxisTitles(h, x0, y0, innerW, innerH);

    const allEmpty = this.#data.series.every((s) => s.points.length === 0);
    if (allEmpty) {
      this.#drawEmptyState(w, h);
      return;
    }

    for (const series of this.#data.series) {
      if (series.points.length === 0) continue;

      if (series.fit === 'line' && series.points.length >= 2) {
        const slope = this.#leastSquaresSlope(series.points);
        this.#drawFitLine(slope, series.color, xToPx, yToPx);
      } else if (series.fit === 'curve' && series.points.length >= 2) {
        this.#drawCurve(series.points, series.color, xToPx, yToPx);
      }

      for (const p of series.points) {
        this.#drawPoint(p, series.color, xToPx, yToPx);
      }
    }
  }

  /** Наклон линии через 0 методом МНК: slope = Σ(x·y) / Σ(x²) */
  #leastSquaresSlope(points: ReadonlyArray<GraphPoint>): number {
    let sumXY = 0;
    let sumX2 = 0;
    for (const p of points) {
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }
    return sumX2 === 0 ? 0 : sumXY / sumX2;
  }

  #drawGrid(x0: number, innerW: number, innerH: number, xToPx: (x: number) => number, yToPx: (y: number) => number): void {
    const xMax = this.#data.xMax;
    const yMax = this.#data.yMax;
    for (let i = 1; i <= xMax; i++) {
      const x = xToPx(i);
      this.#svg.appendChild(this.#line(x, PADDING.top, x, PADDING.top + innerH, 'grid-line'));
    }
    for (let f = 1; f <= yMax; f++) {
      const y = yToPx(f);
      this.#svg.appendChild(this.#line(x0, y, x0 + innerW, y, 'grid-line'));
    }
  }

  #drawAxes(x0: number, y0: number, innerW: number, innerH: number): void {
    this.#svg.appendChild(this.#line(x0, y0, x0 + innerW, y0, 'axis'));
    this.#svg.appendChild(this.#line(x0, y0, x0, y0 - innerH, 'axis'));
  }

  #drawAxisTicks(x0: number, y0: number, xToPx: (x: number) => number, yToPx: (y: number) => number): void {
    const xMax = this.#data.xMax;
    const yMax = this.#data.yMax;
    const xStep = Math.max(1, Math.floor(xMax / 5));
    const yStep = Math.max(1, Math.floor(yMax / 4));
    for (let i = 0; i <= xMax; i += xStep) {
      const x = xToPx(i);
      this.#svg.appendChild(this.#line(x, y0, x, y0 + 4, 'axis-tick'));
      this.#svg.appendChild(this.#text(String(i), x, y0 + 16, 'axis-label', 'middle'));
    }
    for (let f = 0; f <= yMax; f += yStep) {
      const y = yToPx(f);
      this.#svg.appendChild(this.#line(x0 - 4, y, x0, y, 'axis-tick'));
      this.#svg.appendChild(this.#text(String(f), x0 - 8, y + 4, 'axis-label', 'end'));
    }
  }

  #drawAxisTitles(h: number, x0: number, y0: number, innerW: number, innerH: number): void {
    this.#svg.appendChild(this.#text(this.#data.xLabel, x0 + innerW / 2, h - 8, 'axis-title', 'middle'));
    const yLabel = this.#text(this.#data.yLabel, 12, y0 - innerH / 2, 'axis-title', 'middle');
    yLabel.setAttribute('transform', `rotate(-90, 12, ${y0 - innerH / 2})`);
    this.#svg.appendChild(yLabel);
  }

  #drawFitLine(slope: number, color: string, xToPx: (x: number) => number, yToPx: (y: number) => number): void {
    const x2 = this.#data.xMax;
    const y2 = Math.min(slope * x2, this.#data.yMax);
    const line = this.#line(xToPx(0), yToPx(0), xToPx(x2), yToPx(y2), 'fit-line');
    line.setAttribute('stroke', color);
    this.#svg.appendChild(line);
  }

  #drawCurve(points: ReadonlyArray<GraphPoint>, color: string, xToPx: (x: number) => number, yToPx: (y: number) => number): void {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    const pts = sorted.map((p) => `${xToPx(p.x)},${yToPx(p.y)}`).join(' ');
    polyline.setAttribute('points', pts);
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', color);
    polyline.classList.add('fit-curve');
    this.#svg.appendChild(polyline);
  }

  #drawPoint(p: GraphPoint, color: string, xToPx: (x: number) => number, yToPx: (y: number) => number): void {
    const cx = xToPx(p.x);
    const cy = yToPx(p.y);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', color);
    circle.classList.add('point');
    circle.dataset['pointId'] = p.id;

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = p.label ?? `x=${p.x}, y=${p.y}`;
    circle.appendChild(title);

    circle.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('delete-point', { detail: { id: p.id }, bubbles: true, composed: true }),
      );
    });

    this.#svg.appendChild(circle);
  }

  #drawEmptyState(w: number, h: number): void {
    this.#svg.appendChild(this.#text('Запишите хотя бы одно измерение', w / 2, h / 2, 'empty-state', 'middle'));
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

  #text(content: string, x: number, y: number, className: string, anchor: 'start' | 'middle' | 'end'): SVGTextElement {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    t.setAttribute('text-anchor', anchor);
    t.classList.add(className);
    t.textContent = content;
    return t;
  }
}

customElements.define('lab-graph', LabGraph);
