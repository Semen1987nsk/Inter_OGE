/**
 * <lab-friction-track>
 *
 * Горизонтальная направляющая для опыта 2.2 «Трение скольжения».
 * Две поверхности по ФИПИ ОГЭ комплект №2:
 *   - А: твёрдая деревянная направляющая (μ = 0.2)
 *   - Б: гибкая полоса (тканевая накладка), крепится канцелярским зажимом (μ = 0.6)
 *
 * Длина направляющей по ФИПИ — не менее 500 мм.
 * Ширина по эскизу — ~60 мм (даёт устойчивость для бруска).
 *
 * Атрибуты:
 *   surface="A" | "B"   — текущая поверхность (визуально и физически)
 *   length-mm="500"     — длина в миллиметрах (информационно, для расчёта работы)
 *
 * События:
 *   surface-change {detail: { surfaceId: 'A' | 'B' }} — при переключении
 */

import type { SurfaceId } from '@/types/friction';

const SVG_WIDTH = 720;
const SVG_HEIGHT = 120;

// Координаты направляющей в SVG
const TRACK_X = 30;
const TRACK_W = 660;
const TRACK_TOP_Y = 50;
const TRACK_HEIGHT = 28;
const TRACK_BOTTOM_Y = TRACK_TOP_Y + TRACK_HEIGHT;

// Ножки опоры (показывают что направляющая лежит на столе)
const FOOT_W = 22;
const FOOT_H = 18;
const FOOT_LEFT_X = TRACK_X + 20;
const FOOT_RIGHT_X = TRACK_X + TRACK_W - 20 - FOOT_W;

// Канцелярский зажим (для крепления гибкой полосы Б, видим только при surface=B)
const CLAMP_W = 30;
const CLAMP_H = 14;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --track-w: ${SVG_WIDTH}px;
    --track-h: ${SVG_HEIGHT}px;
    display: inline-block;
    width: var(--track-w);
    height: var(--track-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .surface-A,
  .surface-B {
    transition: opacity 250ms ease-out;
  }

  :host([surface='A']) .surface-B,
  :host([surface='B']) .surface-A,
  :host(:not([surface])) .surface-B {
    opacity: 0;
    pointer-events: none;
  }

  :host([surface='B']) .clamps {
    opacity: 1;
  }

  .clamps {
    opacity: 0;
    transition: opacity 250ms ease-out;
  }
</style>
<svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Поверхность А: светлое дерево с мелкими волокнами -->
    <linearGradient id="surface-a-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e2c094" />
      <stop offset="50%" stop-color="#d2a87a" />
      <stop offset="100%" stop-color="#a07c50" />
    </linearGradient>
    <pattern id="surface-a-pattern" width="60" height="6" patternUnits="userSpaceOnUse">
      <line x1="0" y1="2" x2="60" y2="2" stroke="#8d6a40" stroke-width="0.4" opacity="0.4" />
      <line x1="0" y1="5" x2="60" y2="5" stroke="#8d6a40" stroke-width="0.25" opacity="0.25" />
    </pattern>

    <!-- Поверхность Б: тёмная ткань (диагональная штриховка) -->
    <linearGradient id="surface-b-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7a6450" />
      <stop offset="50%" stop-color="#5d4a3a" />
      <stop offset="100%" stop-color="#3d2f25" />
    </linearGradient>
    <pattern id="surface-b-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M -1 1 L 7 9 M -1 -5 L 7 3" stroke="#a09080" stroke-width="0.5" opacity="0.45" />
    </pattern>

    <!-- Ножки опоры — тёмный пластик/металл -->
    <linearGradient id="foot-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a3d44" />
      <stop offset="100%" stop-color="#1a1b1f" />
    </linearGradient>

    <!-- Канцелярский зажим — металлический серебристый -->
    <linearGradient id="clamp-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#dde2e8" />
      <stop offset="50%" stop-color="#a8afb8" />
      <stop offset="100%" stop-color="#6e7682" />
    </linearGradient>

    <filter id="track-shadow" x="-5%" y="-20%" width="110%" height="170%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- НОЖКИ-ОПОРЫ (рисуются ПЕРВЫМИ, под направляющей) -->
  <g class="feet">
    <rect x="${FOOT_LEFT_X}" y="${TRACK_BOTTOM_Y}" width="${FOOT_W}" height="${FOOT_H}"
          fill="url(#foot-grad)" rx="2" />
    <rect x="${FOOT_RIGHT_X}" y="${TRACK_BOTTOM_Y}" width="${FOOT_W}" height="${FOOT_H}"
          fill="url(#foot-grad)" rx="2" />
    <!-- Хром-канты ножек -->
    <rect x="${FOOT_LEFT_X}" y="${TRACK_BOTTOM_Y + FOOT_H - 1.5}" width="${FOOT_W}" height="1.5"
          fill="#6e7682" />
    <rect x="${FOOT_RIGHT_X}" y="${TRACK_BOTTOM_Y + FOOT_H - 1.5}" width="${FOOT_W}" height="1.5"
          fill="#6e7682" />
  </g>

  <!-- НАПРАВЛЯЮЩАЯ (всегда есть деревянная база — поверхность А) -->
  <g class="surface-A" filter="url(#track-shadow)">
    <rect x="${TRACK_X}" y="${TRACK_TOP_Y}" width="${TRACK_W}" height="${TRACK_HEIGHT}"
          fill="url(#surface-a-grad)" rx="1.5"
          stroke="#7a5a30" stroke-width="0.7" />
    <!-- Волокна -->
    <rect x="${TRACK_X}" y="${TRACK_TOP_Y}" width="${TRACK_W}" height="${TRACK_HEIGHT}"
          fill="url(#surface-a-pattern)" rx="1.5" pointer-events="none" />
    <!-- Боковая грань (немного темнее снизу — даёт глубину) -->
    <rect x="${TRACK_X}" y="${TRACK_BOTTOM_Y - 4}" width="${TRACK_W}" height="4"
          fill="rgb(0 0 0 / 0.18)" rx="1.5" />
  </g>

  <!-- ПОВЕРХНОСТЬ Б (гибкая полоса — рисуется поверх А, видна только при surface=B) -->
  <g class="surface-B">
    <rect x="${TRACK_X + 4}" y="${TRACK_TOP_Y - 3}"
          width="${TRACK_W - 8}" height="${TRACK_HEIGHT - 4}"
          fill="url(#surface-b-grad)" rx="1.5" />
    <rect x="${TRACK_X + 4}" y="${TRACK_TOP_Y - 3}"
          width="${TRACK_W - 8}" height="${TRACK_HEIGHT - 4}"
          fill="url(#surface-b-pattern)" rx="1.5" pointer-events="none" />
  </g>

  <!-- ЗАЖИМЫ канцелярские (видны только при surface=B) -->
  <g class="clamps">
    <!-- Левый зажим -->
    <rect x="${TRACK_X - 2}" y="${TRACK_TOP_Y - 6}"
          width="${CLAMP_W}" height="${CLAMP_H}" rx="2"
          fill="url(#clamp-grad)" stroke="#4a5260" stroke-width="0.6" />
    <!-- "Усики" зажима -->
    <line x1="${TRACK_X + 4}" y1="${TRACK_TOP_Y - 8}" x2="${TRACK_X + 4}" y2="${TRACK_TOP_Y - 14}"
          stroke="#6e7682" stroke-width="1.2" stroke-linecap="round" />
    <line x1="${TRACK_X + 18}" y1="${TRACK_TOP_Y - 8}" x2="${TRACK_X + 18}" y2="${TRACK_TOP_Y - 14}"
          stroke="#6e7682" stroke-width="1.2" stroke-linecap="round" />

    <!-- Правый зажим -->
    <rect x="${TRACK_X + TRACK_W - CLAMP_W + 2}" y="${TRACK_TOP_Y - 6}"
          width="${CLAMP_W}" height="${CLAMP_H}" rx="2"
          fill="url(#clamp-grad)" stroke="#4a5260" stroke-width="0.6" />
    <line x1="${TRACK_X + TRACK_W - CLAMP_W + 8}" y1="${TRACK_TOP_Y - 8}"
          x2="${TRACK_X + TRACK_W - CLAMP_W + 8}" y2="${TRACK_TOP_Y - 14}"
          stroke="#6e7682" stroke-width="1.2" stroke-linecap="round" />
    <line x1="${TRACK_X + TRACK_W - CLAMP_W + 22}" y1="${TRACK_TOP_Y - 8}"
          x2="${TRACK_X + TRACK_W - CLAMP_W + 22}" y2="${TRACK_TOP_Y - 14}"
          stroke="#6e7682" stroke-width="1.2" stroke-linecap="round" />
  </g>

  <!-- Шкала-линейка снизу направляющей (мм деления, для оценки расстояния) -->
  <g class="ruler" font-family="var(--font-mono, monospace)" font-size="6" fill="#5d6e8a">
    ${(() => {
      const out: string[] = [];
      const rulerY = TRACK_BOTTOM_Y + FOOT_H + 8;
      out.push(
        `<line x1="${TRACK_X}" y1="${rulerY}" x2="${TRACK_X + TRACK_W}" y2="${rulerY}" stroke="#5d6e8a" stroke-width="0.5" />`,
      );
      // 50 mm grid (visible spans entire 500mm track length proportionally to TRACK_W)
      for (let mm = 0; mm <= 500; mm += 50) {
        const x = TRACK_X + (mm / 500) * TRACK_W;
        const tickH = mm % 100 === 0 ? 5 : 3;
        out.push(
          `<line x1="${x}" y1="${rulerY}" x2="${x}" y2="${rulerY + tickH}" stroke="#5d6e8a" stroke-width="0.6" />`,
        );
        if (mm % 100 === 0) {
          out.push(
            `<text x="${x}" y="${rulerY + tickH + 6}" text-anchor="middle">${mm}</text>`,
          );
        }
      }
      return out.join('\n');
    })()}
  </g>
</svg>
`;

export class LabFrictionTrack extends HTMLElement {
  static observedAttributes = ['surface', 'length-mm'];

  #shadow: ShadowRoot;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    if (!this.hasAttribute('surface')) this.setAttribute('surface', 'A');
    this.#updateAria();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (name === 'surface' && oldVal !== newVal && newVal !== null) {
      this.#updateAria();
      this.dispatchEvent(
        new CustomEvent('surface-change', {
          detail: { surfaceId: newVal as SurfaceId },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  /** Текущий surfaceId. */
  get surfaceId(): SurfaceId {
    const s = this.getAttribute('surface');
    return s === 'B' ? 'B' : 'A';
  }

  set surfaceId(value: SurfaceId) {
    this.setAttribute('surface', value);
  }

  /** Y-координата ВЕРХА направляющей в host px (куда «приземляется» брусок). */
  getTopSurfaceY(): number {
    const rect = this.getBoundingClientRect();
    // При surface=B верх чуть выше (на 3 SVG-юнита: ткань поверх дерева)
    const svgY = this.surfaceId === 'B' ? TRACK_TOP_Y - 3 : TRACK_TOP_Y;
    return (svgY / SVG_HEIGHT) * rect.height;
  }

  /** Левая и правая границы рабочей зоны направляющей (host px). */
  getBounds(): { left: number; right: number } {
    const rect = this.getBoundingClientRect();
    return {
      left: (TRACK_X / SVG_WIDTH) * rect.width,
      right: ((TRACK_X + TRACK_W) / SVG_WIDTH) * rect.width,
    };
  }

  /**
   * Конвертирует пройденное в host-px смещение бруска в миллиметры
   * (по реальной шкале направляющей 0…500 мм).
   */
  hostPxToMm(deltaX: number): number {
    const rect = this.getBoundingClientRect();
    const trackPxWidth = (TRACK_W / SVG_WIDTH) * rect.width;
    return (deltaX / trackPxWidth) * 500;
  }

  #updateAria(): void {
    const s = this.surfaceId;
    this.setAttribute(
      'aria-label',
      s === 'A'
        ? 'Направляющая — деревянная поверхность А, длина 500 миллиметров.'
        : 'Направляющая с гибкой полосой — поверхность Б, тканевая накладка, длина 500 миллиметров.',
    );
  }
}

customElements.define('lab-friction-track', LabFrictionTrack);
