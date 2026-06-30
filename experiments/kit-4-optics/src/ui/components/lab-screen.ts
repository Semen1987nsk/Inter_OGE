/**
 * <lab-screen>
 *
 * Экран-приёмник изображения для оптической скамьи. Имитирует матовый экран
 * из набора ФИПИ КД №4 на магнитном держателе. Вертикальная белая поверхность
 * на подставке.
 *
 * Атрибуты: нет (перетаскивается через D&D; equipmentId='screen').
 *
 * A11y:
 *   aria-label = «Экран» (без числовых данных — §10.4)
 *   role="img" на svg + <title id="sc-title">
 *   svg[hidden]{display:none}
 */

const SVG_W = 52;
const SVG_H = 100;

// Поверхность экрана (вертикальный прямоугольник)
const SURF_X = 12;
const SURF_Y = 8;
const SURF_W = 28;
const SURF_H = 72;
const SURF_RX = 2;

// Подставка (ножка + основание)
const LEG_X = SVG_W / 2 - 2;
const LEG_Y_TOP = SURF_Y + SURF_H;
const LEG_Y_BOT = SVG_H - 10;
const BASE_Y = LEG_Y_BOT;
const BASE_X = SVG_W / 2 - 14;
const BASE_W = 28;
const BASE_H = 8;

// Магнитные крепления (два диска)
const MAG_Y1 = SURF_Y + 18;
const MAG_Y2 = SURF_Y + SURF_H - 18;

// Строки горизонтальной текстуры матовости
const TEXTURE_LINES: string[] = [];
for (let i = 0; i < 8; i++) {
  const y = SURF_Y + 6 + i * 9;
  TEXTURE_LINES.push(
    `<line x1="${SURF_X + 2}" y1="${y}" x2="${SURF_X + SURF_W - 2}" y2="${y}" stroke="rgb(0 0 0 / 0.04)" stroke-width="1"/>`,
  );
}

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-block;
    width: ${SVG_W}px;
    height: ${SVG_H}px;
  }
  svg { display: block; width: 100%; height: 100%; overflow: visible; }
  svg[hidden] { display: none; }
  .focus-ring {
    opacity: 0; fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 2; stroke-dasharray: 4 3;
  }
  :host(:focus-visible) .focus-ring { opacity: 1; }
</style>
<svg viewBox="0 0 ${SVG_W} ${SVG_H}"
     xmlns="http://www.w3.org/2000/svg"
     role="img"
     aria-labelledby="sc-title">
  <title id="sc-title">Экран для проецирования изображения</title>
  <defs>
    <linearGradient id="sc-surface" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#c8c8c8"/>
      <stop offset="15%"  stop-color="#f0f0f0"/>
      <stop offset="50%"  stop-color="#ffffff"/>
      <stop offset="85%"  stop-color="#e8e8e8"/>
      <stop offset="100%" stop-color="#b0b0b0"/>
    </linearGradient>
    <linearGradient id="sc-frame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#5a6a7a"/>
      <stop offset="100%" stop-color="#2d3748"/>
    </linearGradient>
    <filter id="sc-shadow" x="-10%" y="-5%" width="120%" height="110%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Ножка подставки -->
  <rect x="${LEG_X}" y="${LEG_Y_TOP}" width="4" height="${LEG_Y_BOT - LEG_Y_TOP}"
        fill="#4a5568" rx="1"/>

  <!-- Основание подставки -->
  <rect x="${BASE_X}" y="${BASE_Y}" width="${BASE_W}" height="${BASE_H}" rx="3"
        fill="#4a5568" stroke="#2d3748" stroke-width="0.5"
        filter="url(#sc-shadow)"/>
  <rect x="${BASE_X + 4}" y="${BASE_Y + 1}" width="${BASE_W - 8}" height="2"
        fill="rgb(255 255 255 / 0.15)" rx="1"/>

  <!-- Рамка экрана (frame) -->
  <rect x="${SURF_X - 3}" y="${SURF_Y - 3}"
        width="${SURF_W + 6}" height="${SURF_H + 6}" rx="3"
        fill="url(#sc-frame)" stroke="#718096" stroke-width="0.5"
        filter="url(#sc-shadow)"/>

  <!-- Поверхность экрана (матовая, белая) -->
  <rect class="screen-surface"
        x="${SURF_X}" y="${SURF_Y}"
        width="${SURF_W}" height="${SURF_H}" rx="${SURF_RX}"
        fill="url(#sc-surface)" stroke="none"/>

  <!-- Горизонтальная текстура матовости -->
  ${TEXTURE_LINES.join('\n  ')}

  <!-- Магнитные крепления (2 диска) -->
  <circle cx="${SURF_X - 1}" cy="${MAG_Y1}" r="4"
          fill="#e53e3e" stroke="#c53030" stroke-width="0.6" opacity="0.85"/>
  <circle cx="${SURF_X - 1}" cy="${MAG_Y1}" r="1.5" fill="#fff" opacity="0.5"/>
  <circle cx="${SURF_X - 1}" cy="${MAG_Y2}" r="4"
          fill="#e53e3e" stroke="#c53030" stroke-width="0.6" opacity="0.85"/>
  <circle cx="${SURF_X - 1}" cy="${MAG_Y2}" r="1.5" fill="#fff" opacity="0.5"/>

  <!-- Focus ring -->
  <rect class="focus-ring" x="1" y="1" width="${SVG_W - 2}" height="${SVG_H - 2}" rx="4"/>
</svg>
`;

export class LabScreen extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.setAttribute('aria-label', 'Экран');
  }
}

customElements.define('lab-screen', LabScreen);
