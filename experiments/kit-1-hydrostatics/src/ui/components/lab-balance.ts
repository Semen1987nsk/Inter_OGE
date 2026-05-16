/**
 * <lab-balance mass-g="0">
 *
 * Электронные весы — реалистичная отрисовка по образцу настоящего комплекта №1
 * ФИПИ ОГЭ-2026: тёмно-серый ABS-корпус с скруглёнными углами, серебристая
 * платформа на стойках, чёрный LCD-экран с янтарными цифрами (Vernier/PASCO стиль),
 * кнопки TARE и ON/OFF на лицевой панели, индикатор питания, ножки.
 *
 * Атрибуты:
 *   mass-g="..." — текущая масса (г). 0 = пусто. Точность 0.1 г.
 *   active — подсветка для drop-зоны.
 *
 * События:
 *   balance-tap — клик по корпусу.
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --case-top: #3a4150;
    --case-mid: #2a2f3a;
    --case-low: #1a1d24;
    --case-edge: #0d1015;
    --case-light: #4f5666;
    --platform-light: #f0f2f5;
    --platform-mid: #c0c5cc;
    --platform-dark: #8a8f96;
    --platform-edge: #555a62;
    --lcd-bg: #0a0604;
    --lcd-frame: #1d1612;
    --lcd-glow: rgba(255, 200, 60, 0.35);
    --lcd-text: #ffc220;
    --lcd-dim: rgba(255, 200, 60, 0.18);
    --button-color: #4d5260;
    --button-edge: #2a2d36;
    --led-on: #3dd97d;

    display: inline-block;
    width: 220px;
    cursor: pointer;
  }
  :host([hidden]) { display: none; }
  :host {
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 8px 14px rgb(0 0 0 / 0.45));
    transition: filter 200ms ease-out, transform 200ms ease-out;
  }
  :host(:hover) {
    filter: drop-shadow(0 14px 20px rgb(0 0 0 / 0.55));
    transform: translateY(-2px);
  }
  :host([active]) {
    filter: drop-shadow(0 0 0 2.5px var(--color-brand-orange, #ffbe0b))
            drop-shadow(0 10px 16px rgb(0 0 0 / 0.55));
  }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }

  .frame { width: 100%; height: auto; display: block; pointer-events: none; }

  /* LCD цифры (имитация семисегментника, но в очень читаемом моно-шрифте) */
  .lcd-text {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 24px;
    font-weight: 700;
    fill: var(--lcd-text);
    text-anchor: end;
    dominant-baseline: middle;
    letter-spacing: 0.06em;
    paint-order: stroke;
    stroke: rgba(255, 200, 60, 0.18);
    stroke-width: 0.5;
  }
  .lcd-shadow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 24px;
    font-weight: 700;
    fill: var(--lcd-dim);
    text-anchor: end;
    dominant-baseline: middle;
    letter-spacing: 0.06em;
  }
  .lcd-unit {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    fill: var(--lcd-text);
    opacity: 0.9;
    text-anchor: start;
    dominant-baseline: middle;
  }
  .label-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 7.5px;
    font-weight: 800;
    fill: #6a6f78;
    text-anchor: middle;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .button-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 6px;
    font-weight: 700;
    fill: #aab0bb;
    text-anchor: middle;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity 150ms;
  }
</style>

<svg class="frame" viewBox="0 0 220 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Корпус: верхний край (светлее) → низ (темнее) -->
    <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--case-light)" />
      <stop offset="22%" stop-color="var(--case-top)" />
      <stop offset="55%" stop-color="var(--case-mid)" />
      <stop offset="100%" stop-color="var(--case-low)" />
    </linearGradient>
    <!-- Платформа: серебристая, выпуклая по центру -->
    <radialGradient id="platformGrad" cx="0.5" cy="0.4" r="0.7">
      <stop offset="0%" stop-color="var(--platform-light)" />
      <stop offset="70%" stop-color="var(--platform-mid)" />
      <stop offset="100%" stop-color="var(--platform-dark)" />
    </radialGradient>
    <!-- Ободок платформы -->
    <linearGradient id="platformRim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d6dae0" />
      <stop offset="100%" stop-color="var(--platform-edge)" />
    </linearGradient>
    <!-- Стойки платформы -->
    <linearGradient id="standGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3a3f49" />
      <stop offset="50%" stop-color="#5a606e" />
      <stop offset="100%" stop-color="#3a3f49" />
    </linearGradient>
    <!-- LCD glow -->
    <radialGradient id="lcdGlow" cx="0.5" cy="0.5" r="0.55">
      <stop offset="0%" stop-color="var(--lcd-glow)" />
      <stop offset="100%" stop-color="rgba(255, 200, 60, 0)" />
    </radialGradient>
    <!-- Кнопки -->
    <linearGradient id="buttonGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5a606e" />
      <stop offset="100%" stop-color="#3a3f49" />
    </linearGradient>
    <!-- LED светодиод -->
    <radialGradient id="ledOn" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#88f7b3" />
      <stop offset="50%" stop-color="var(--led-on)" />
      <stop offset="100%" stop-color="#1d8c4d" />
    </radialGradient>
  </defs>

  <!-- Тень от корпуса (под основанием) -->
  <ellipse cx="110" cy="124" rx="92" ry="4" fill="rgba(0,0,0,0.4)" />

  <!-- Платформа: ободок -->
  <ellipse cx="110" cy="20" rx="68" ry="8" fill="url(#platformRim)" />
  <!-- Платформа: верхняя поверхность -->
  <ellipse cx="110" cy="16" rx="68" ry="7.5" fill="url(#platformGrad)"
           stroke="var(--platform-edge)" stroke-width="0.8" />
  <!-- Контур платформы (тонкая линия) -->
  <ellipse cx="110" cy="16" rx="66" ry="6.8" fill="none"
           stroke="rgba(255,255,255,0.18)" stroke-width="0.4" />

  <!-- Стойки платформы (две, симметрично) -->
  <rect x="68" y="22" width="6" height="14" rx="1.2" fill="url(#standGrad)" />
  <rect x="146" y="22" width="6" height="14" rx="1.2" fill="url(#standGrad)" />

  <!-- Корпус -->
  <rect x="20" y="32" width="180" height="78" rx="9"
        fill="url(#caseGrad)" stroke="var(--case-edge)" stroke-width="1.2" />

  <!-- Верхний highlight (плёнка) -->
  <rect x="22" y="34" width="176" height="3" rx="1.5" fill="rgba(255,255,255,0.10)" />
  <!-- Внутренний рисунок (тонкая линия по краю корпуса) -->
  <rect x="24" y="36" width="172" height="70" rx="6.5" fill="none"
        stroke="rgba(255,255,255,0.06)" stroke-width="0.6" />

  <!-- LCD-окно: рамка -->
  <rect x="40" y="46" width="140" height="38" rx="4"
        fill="var(--lcd-frame)" stroke="var(--case-edge)" stroke-width="0.6" />
  <!-- LCD: внутренняя поверхность -->
  <rect x="42" y="48" width="136" height="34" rx="3" fill="var(--lcd-bg)" />
  <!-- LCD: glow -->
  <ellipse cx="110" cy="65" rx="60" ry="16" fill="url(#lcdGlow)" />
  <!-- LCD: лёгкий vertical scan -->
  <rect x="42" y="48" width="136" height="34" rx="3" fill="url(#lcdGlow)" opacity="0.18" />

  <!-- LCD: «теневые» сегменты (как у настоящего LCD: видно «888.8») -->
  <text class="lcd-shadow" x="158" y="65">888.8</text>
  <!-- LCD: реальное значение -->
  <text id="lcd-mass" class="lcd-text" x="158" y="65">--.-</text>
  <text class="lcd-unit" x="161" y="65">g</text>

  <!-- Кнопки управления (TARE + ON/OFF + UNIT) -->
  <g>
    <!-- TARE -->
    <rect x="40" y="90" width="36" height="14" rx="3" fill="url(#buttonGrad)"
          stroke="var(--button-edge)" stroke-width="0.7" />
    <text class="button-text" x="58" y="100">TARE</text>
    <!-- ON/OFF -->
    <rect x="92" y="90" width="36" height="14" rx="3" fill="url(#buttonGrad)"
          stroke="var(--button-edge)" stroke-width="0.7" />
    <text class="button-text" x="110" y="100">ON / OFF</text>
    <!-- UNIT -->
    <rect x="144" y="90" width="36" height="14" rx="3" fill="url(#buttonGrad)"
          stroke="var(--button-edge)" stroke-width="0.7" />
    <text class="button-text" x="162" y="100">UNIT</text>
  </g>

  <!-- Бренд-плашка -->
  <text class="label-text" x="110" y="42">ЛАБОСФЕРА · 200 g · 0.1 g</text>

  <!-- LED питания -->
  <circle cx="194" cy="42" r="1.8" fill="url(#ledOn)" />
  <circle cx="194" cy="42" r="3.5" fill="var(--led-on)" opacity="0.18" />

  <!-- Ножки (4 шт под корпусом, видны на боковой проекции) -->
  <rect x="32" y="108" width="8" height="3" rx="0.8" fill="#0d1015" />
  <rect x="180" y="108" width="8" height="3" rx="0.8" fill="#0d1015" />
  <!-- центральная подсветка-тень -->
  <ellipse cx="110" cy="111" rx="60" ry="2" fill="rgba(0,0,0,0.4)" />

  <!-- Focus ring -->
  <rect class="focus-ring" x="14" y="6" width="192" height="116" rx="11" />
</svg>
`;

export class LabBalance extends HTMLElement {
  static observedAttributes = ['mass-g', 'active'];

  #shadow: ShadowRoot;
  #lcdMass: SVGTextElement;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#lcdMass = this.#shadow.getElementById('lcd-mass') as unknown as SVGTextElement;
    this.tabIndex = 0;
    this.setAttribute('role', 'button');
    this.setAttribute('aria-label', 'Электронные весы 200 г, цена деления 0.1 г.');
    this.addEventListener('click', this.#emitTap);
    this.addEventListener('keydown', this.#handleKey);
    this.#renderMass();
  }

  attributeChangedCallback(): void {
    this.#renderMass();
  }

  #renderMass(): void {
    const raw = this.getAttribute('mass-g');
    const m = raw ? parseFloat(raw) : 0;
    if (!Number.isFinite(m) || m <= 0) {
      this.#lcdMass.textContent = '   0.0';
      this.#lcdMass.style.opacity = '0.45';
    } else {
      this.#lcdMass.textContent = m.toFixed(1);
      this.#lcdMass.style.opacity = '1';
    }
  }

  #emitTap = (): void => {
    this.dispatchEvent(new CustomEvent('balance-tap', { bubbles: true, composed: true }));
  };

  #handleKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.#emitTap();
    }
  };
}

customElements.define('lab-balance', LabBalance);
