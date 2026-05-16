/**
 * <lab-graph> — SVG-график F(Δl) с точками и аппроксимацией.
 *
 * Принимает массив measurements + fitLine (slope) через свойство `data`.
 * При добавлении новой точки — pop-scale-анимация.
 * Hover на точке — кнопка удаления → событие `delete-point` с id.
 */

import type { Measurement } from '@/types';

interface GraphData {
  measurements: ReadonlyArray<Measurement>;
  fitSlope: number | null; // Н/м, k по МНК, или null если меньше 2 точек
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 40 };
const MAX_FORCE = 4; // Н — диапазон Y
const MAX_EXTENSION = 8; // см — диапазон X

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
    cursor: pointer;
    transition: r 150ms var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
    transform-origin: center;
    transform-box: fill-box;
    animation: pop-in 250ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
  }

  .point:hover {
    r: 7;
    fill: var(--color-brand-orange, #ffbe0b);
  }

  @keyframes pop-in {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  .point-tooltip-bg {
    fill: rgba(6, 13, 20, 0.95);
    stroke: var(--color-border-strong, rgba(255,255,255,0.2));
    stroke-width: 1;
  }

  .point-tooltip-text {
    fill: var(--color-text-primary, #e0e1dd);
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    pointer-events: none;
  }

  .delete-btn {
    fill: var(--color-error, #ef4444);
    cursor: pointer;
    opacity: 0;
    transition: opacity 150ms;
  }

  .point:hover ~ .delete-btn,
  .delete-btn:hover {
    opacity: 1;
  }

  .empty-state {
    fill: var(--color-text-muted, #6b7280);
    font-family: var(--font-body, sans-serif);
    font-size: 13px;
    font-style: italic;
    text-anchor: middle;
  }

  .fit-label {
    fill: var(--phys-displacement, #2ba84a);
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 600;
  }

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
  #data: GraphData = { measurements: [], fitSlope: null };
  #resizeObserver: ResizeObserver;
  #lastWidth = 0;
  #lastHeight = 0;

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
    if (w === this.#lastWidth && h === this.#lastHeight && this.#svg.childElementCount > 0) {
      // Только данные изменились — перерисуем точки/линию, оси оставим
    }
    this.#lastWidth = w;
    this.#lastHeight = h;

    this.#svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.#svg.innerHTML = '';

    const innerW = w - PADDING.left - PADDING.right;
    const innerH = h - PADDING.top - PADDING.bottom;
    const x0 = PADDING.left;
    const y0 = PADDING.top + innerH;

    const xToPx = (xCm: number) => x0 + (xCm / MAX_EXTENSION) * innerW;
    const yToPx = (fN: number) => y0 - (fN / MAX_FORCE) * innerH;

    this.#drawGrid(x0, y0, innerW, innerH, xToPx, yToPx);
    this.#drawAxes(x0, y0, innerW, innerH);
    this.#drawAxisTicks(x0, y0, innerW, innerH, xToPx, yToPx);
    this.#drawAxisTitles(w, h, x0, y0);

    if (this.#data.measurements.length === 0) {
      this.#drawEmptyState(w, h);
      return;
    }

    if (this.#data.measurements.length >= 2 && this.#data.fitSlope !== null) {
      this.#drawFitLine(this.#data.fitSlope, xToPx, yToPx);
      this.#drawFitLabel(this.#data.fitSlope, x0 + 8, PADDING.top + 14);
    }

    for (const m of this.#data.measurements) {
      this.#drawPoint(m, xToPx, yToPx);
    }
  }

  #drawGrid(x0: number, _y0: number, innerW: number, innerH: number, xToPx: (x: number) => number, yToPx: (f: number) => number): void {
    for (let i = 1; i <= MAX_EXTENSION; i++) {
      const x = xToPx(i);
      this.#svg.appendChild(this.#line(x, PADDING.top, x, PADDING.top + innerH, 'grid-line'));
    }
    for (let f = 1; f <= MAX_FORCE; f++) {
      const y = yToPx(f);
      this.#svg.appendChild(this.#line(x0, y, x0 + innerW, y, 'grid-line'));
    }
  }

  #drawAxes(x0: number, y0: number, innerW: number, innerH: number): void {
    this.#svg.appendChild(this.#line(x0, y0, x0 + innerW, y0, 'axis'));
    this.#svg.appendChild(this.#line(x0, y0, x0, y0 - innerH, 'axis'));
  }

  #drawAxisTicks(x0: number, y0: number, _innerW: number, _innerH: number, xToPx: (x: number) => number, yToPx: (f: number) => number): void {
    for (let i = 0; i <= MAX_EXTENSION; i += 2) {
      const x = xToPx(i);
      this.#svg.appendChild(this.#line(x, y0, x, y0 + 4, 'axis-tick'));
      this.#svg.appendChild(this.#text(String(i), x, y0 + 16, 'axis-label', 'middle'));
    }
    for (let f = 0; f <= MAX_FORCE; f++) {
      const y = yToPx(f);
      this.#svg.appendChild(this.#line(x0 - 4, y, x0, y, 'axis-tick'));
      this.#svg.appendChild(this.#text(String(f), x0 - 8, y + 4, 'axis-label', 'end'));
    }
  }

  #drawAxisTitles(w: number, h: number, x0: number, y0: number): void {
    this.#svg.appendChild(this.#text('Δl, см', x0 + (w - PADDING.left - PADDING.right) / 2, h - 8, 'axis-title', 'middle'));
    const yLabel = this.#text('F, Н', 12, y0 - (h - PADDING.top - PADDING.bottom) / 2, 'axis-title', 'middle');
    yLabel.setAttribute('transform', `rotate(-90, 12, ${y0 - (h - PADDING.top - PADDING.bottom) / 2})`);
    this.#svg.appendChild(yLabel);
  }

  #drawFitLine(slopeNm: number, xToPx: (x: number) => number, yToPx: (f: number) => number): void {
    // y = (k * x в м) = k * (xCm/100) Н
    const x1 = 0;
    const f1 = 0;
    const xMaxCm = MAX_EXTENSION;
    const fMax = (slopeNm * xMaxCm) / 100;
    if (fMax > MAX_FORCE) {
      // обрезать линию у потолка графика
      const xCutCm = (MAX_FORCE * 100) / slopeNm;
      const line = this.#line(xToPx(x1), yToPx(f1), xToPx(xCutCm), yToPx(MAX_FORCE), 'fit-line');
      this.#svg.appendChild(line);
    } else {
      const line = this.#line(xToPx(x1), yToPx(f1), xToPx(xMaxCm), yToPx(fMax), 'fit-line');
      this.#svg.appendChild(line);
    }
  }

  #drawFitLabel(slope: number, x: number, y: number): void {
    const label = this.#text(`k ≈ ${slope.toFixed(0)} Н/м`, x, y, 'fit-label', 'start');
    this.#svg.appendChild(label);
  }

  #drawPoint(m: Measurement, xToPx: (x: number) => number, yToPx: (f: number) => number): void {
    const cx = xToPx(m.extension);
    const cy = yToPx(m.force);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '5');
    circle.classList.add('point');
    circle.dataset.measurementId = m.id;

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `m=${m.totalMass} г, F=${m.force.toFixed(2)} Н, Δl=${m.extension.toFixed(1)} см`;
    circle.appendChild(title);

    circle.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('delete-point', { detail: { id: m.id }, bubbles: true }),
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
