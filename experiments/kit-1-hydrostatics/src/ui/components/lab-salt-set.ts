/**
 * <lab-salt-set>
 *
 * Поваренная соль + палочка для перемешивания (по комплекту №1 ФИПИ).
 * Используется в опыте 1.2 «Плотность раствора» для приготовления солёной воды.
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-block;
    width: 70px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3));
  }
  :host(:hover) { filter: drop-shadow(0 7px 10px rgb(0 0 0 / 0.45)); }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }
  .frame { width: 100%; height: auto; display: block; pointer-events: none; }
  .label-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 5.5px;
    font-weight: 800;
    fill: #2a2d36;
    text-anchor: middle;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
  }
</style>
<svg class="frame" viewBox="0 0 70 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="saltJar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.7)" />
      <stop offset="50%" stop-color="rgba(255,255,255,0.95)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.7)" />
    </linearGradient>
    <linearGradient id="saltCap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3da17a" />
      <stop offset="100%" stop-color="#287353" />
    </linearGradient>
    <linearGradient id="stickWood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a07840" />
      <stop offset="50%" stop-color="#d6a360" />
      <stop offset="100%" stop-color="#7a5c30" />
    </linearGradient>
  </defs>

  <!-- Палочка (слева, наклонена) -->
  <g transform="translate(8, 12) rotate(-12)">
    <rect x="0" y="0" width="3.5" height="60" rx="1.5" fill="url(#stickWood)" />
    <rect x="0" y="0" width="3.5" height="60" rx="1.5" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.4" />
  </g>

  <!-- Баночка соли -->
  <g transform="translate(22, 14)">
    <!-- Крышка -->
    <rect x="0" y="0" width="36" height="10" rx="2" fill="url(#saltCap)" stroke="#1a4f38" stroke-width="0.6" />
    <line x1="2" y1="3" x2="34" y2="3" stroke="rgba(255,255,255,0.4)" stroke-width="0.5" />
    <!-- Корпус (стеклянный) -->
    <rect x="2" y="9" width="32" height="58" rx="2" fill="url(#saltJar)" stroke="#9aa0a8" stroke-width="0.7" />
    <!-- Соль внутри (мелкие точки) -->
    <g fill="#f5f5f5" opacity="0.85">
      <rect x="4" y="35" width="28" height="30" />
    </g>
    <!-- Текстура соли -->
    <g fill="#cdd1d6" opacity="0.6">
      <circle cx="8" cy="42" r="0.6" />
      <circle cx="14" cy="48" r="0.5" />
      <circle cx="22" cy="40" r="0.7" />
      <circle cx="28" cy="46" r="0.5" />
      <circle cx="11" cy="55" r="0.6" />
      <circle cx="20" cy="58" r="0.5" />
      <circle cx="26" cy="52" r="0.6" />
      <circle cx="6" cy="50" r="0.4" />
      <circle cx="30" cy="60" r="0.5" />
      <circle cx="16" cy="62" r="0.5" />
    </g>
    <!-- Этикетка -->
    <rect x="5" y="22" width="26" height="11" rx="1" fill="white" stroke="#9aa0a8" stroke-width="0.4" />
    <text class="label-text" x="18" y="28">NaCl</text>
    <text class="label-text" x="18" y="32" style="font-size:3.5px">соль</text>
    <!-- Highlight стекла -->
    <rect x="5" y="38" width="2" height="22" rx="1" fill="rgba(255,255,255,0.5)" />
  </g>

  <!-- Тень -->
  <ellipse cx="35" cy="84" rx="22" ry="2.5" fill="rgba(0,0,0,0.3)" />

  <rect class="focus-ring" x="2" y="6" width="66" height="80" rx="3" />
</svg>
`;

export class LabSaltSet extends HTMLElement {
  #shadow: ShadowRoot;
  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.tabIndex = 0;
    this.setAttribute('role', 'button');
    this.setAttribute('aria-label', 'Поваренная соль и палочка для перемешивания.');
  }
}

customElements.define('lab-salt-set', LabSaltSet);
