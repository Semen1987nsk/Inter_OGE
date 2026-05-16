/**
 * <lab-stand>
 *
 * Лабораторный штатив в стиле физического оборудования ЛАБОСФЕРА:
 * массивное чёрное основание-плита, хромированный вертикальный стержень,
 * муфта и горизонтальная перекладина с тремя точками крепления.
 *
 * Адаптивная высота:
 *   Атрибут `rod-extra` (в SVG-юнитах) удлиняет вертикальный стержень и сдвигает
 *   основание вниз. Используется оркестратором, когда подвешенная цепочка
 *   (пружина + дин + грузы) перерастает базовую высоту штатива — стержень
 *   физически растёт, как у настоящего лабораторного штатива.
 *
 * Интерактивность:
 *  - геттер `getHookPosition(index: 0|1|2)` возвращает позицию точки крепления
 *    в координатах host-элемента (px). Используется Workbench-ом для подвешивания
 *    планшетов пружин и динамометров.
 *  - css-custom: `--stand-width` (по умолчанию 240px). Высота host'а считается
 *    через aspect-ratio = 240 / (480 + rod-extra), чтобы шкалы приборов
 *    оставались постоянного pixel-размера и хорошо читались.
 */

const SVG_WIDTH = 240;
const BASE_SVG_HEIGHT = 480;

/** X-координаты трёх точек крепления вдоль перекладины (в координатах SVG). */
const HOOK_X = [120, 168, 210];
/** Y-координата перекладины (фикс — верх SVG не растёт). */
const HOOK_Y = 64;

/** Y-координата верха стержня. */
const ROD_TOP_Y = 60;
/** Дефолтная Y-координата основания (нижний край стержня при rod-extra=0). */
const ROD_BOTTOM_DEFAULT = 430;
/** Дефолтная высота стержня. */
const ROD_HEIGHT_DEFAULT = ROD_BOTTOM_DEFAULT - ROD_TOP_Y; // 370

const STYLE = `
  :host {
    --stand-width: 240px;

    display: inline-block;
    width: var(--stand-width);
    /* Aspect-ratio задаётся inline через style, потому что зависит от rod-extra.
       Width фиксируется контейнером (по умолчанию 240px), height = width * (480+extra)/240. */
    position: relative;
    pointer-events: none;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
`;

function buildSvg(rodExtra: number): string {
  const svgH = BASE_SVG_HEIGHT + rodExtra;
  const rodH = ROD_HEIGHT_DEFAULT + rodExtra;
  // Сдвиг основания и цоколя крепления вниз
  const baseShift = rodExtra;

  return `
<svg viewBox="0 0 ${SVG_WIDTH} ${svgH}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Хромированный стержень (вертикальный) -->
    <linearGradient id="rod-vertical" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--equip-metal-shadow, #4a5260)" />
      <stop offset="20%" stop-color="var(--equip-metal-dark, #6e7682)" />
      <stop offset="45%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="55%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="75%" stop-color="var(--equip-metal, #a8afb8)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </linearGradient>

    <!-- Хромированный стержень (горизонтальный) -->
    <linearGradient id="rod-horizontal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-metal-shadow, #4a5260)" />
      <stop offset="20%" stop-color="var(--equip-metal-dark, #6e7682)" />
      <stop offset="45%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="55%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="75%" stop-color="var(--equip-metal, #a8afb8)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </linearGradient>

    <linearGradient id="base-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-stand-base-shine, #3a3d44)" />
      <stop offset="15%" stop-color="var(--equip-stand-base-edge, #2d2f33)" />
      <stop offset="60%" stop-color="var(--equip-stand-base, #1a1b1f)" />
      <stop offset="100%" stop-color="#0d0e10" />
    </linearGradient>

    <radialGradient id="clamp-grad" cx="0.4" cy="0.3" r="0.7">
      <stop offset="0%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="50%" stop-color="var(--equip-metal, #a8afb8)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </radialGradient>

    <filter id="base-shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- ОСНОВАНИЕ (массивная чёрная трапециевидная плита) — сдвинуто вниз на rod-extra -->
  <g transform="translate(0 ${baseShift})" filter="url(#base-shadow)">
    <path
      d="M 50 426 L 190 426 L 220 458 L 20 458 Z"
      fill="var(--equip-stand-base-edge, #2d2f33)"
    />
    <rect x="20" y="454" width="200" height="26" fill="url(#base-grad)" rx="2.5" />
    <rect x="20" y="478" width="200" height="2.5" fill="var(--equip-metal-dark, #6e7682)" rx="1" />
    <rect x="22" y="455" width="196" height="1" fill="rgb(255 255 255 / 0.18)" />
  </g>

  <!-- Цоколь крепления стержня — сдвинут на rod-extra -->
  <g transform="translate(0 ${baseShift})">
    <ellipse cx="120" cy="430" rx="28" ry="9" fill="var(--equip-stand-base-shine, #3a3d44)" />
    <ellipse cx="120" cy="427" rx="25" ry="6" fill="var(--equip-metal-dark, #6e7682)" />
    <ellipse cx="120" cy="425" rx="22" ry="4" fill="var(--equip-metal, #a8afb8)" />
    <ellipse cx="120" cy="424" rx="20" ry="2.5" fill="var(--equip-metal-shine, #f0f2f5)" />
    <circle cx="148" cy="424" r="4" fill="var(--equip-metal-dark, #6e7682)" />
    <circle cx="148" cy="423" r="2.8" fill="var(--equip-metal-shine, #f0f2f5)" />
    <line x1="145.5" y1="423" x2="150.5" y2="423" stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="0.6" />
  </g>

  <!-- ВЕРТИКАЛЬНЫЙ СТЕРЖЕНЬ (растягивается на rod-extra) -->
  <rect
    x="113" y="${ROD_TOP_Y}" width="14" height="${rodH}"
    fill="url(#rod-vertical)"
    rx="1.5"
  />
  <rect x="117" y="${ROD_TOP_Y}" width="1.6" height="${rodH}" fill="rgb(255 255 255 / 0.55)" />
  <rect x="123.5" y="${ROD_TOP_Y}" width="0.8" height="${rodH}" fill="rgb(255 255 255 / 0.25)" />

  <!-- МУФТА (зажим между стержнем и перекладиной) -->
  <g>
    <rect x="103" y="54" width="34" height="22" rx="3" fill="url(#clamp-grad)" />
    <circle cx="100" cy="65" r="5" fill="var(--equip-metal-dark, #6e7682)" />
    <circle cx="100" cy="65" r="3.2" fill="var(--equip-metal-shine, #f0f2f5)" />
    <line x1="96.5" y1="65" x2="103.5" y2="65" stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="0.7" />
    <line x1="100" y1="61.5" x2="100" y2="68.5" stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="0.7" />
  </g>

  <!-- ГОРИЗОНТАЛЬНАЯ ПЕРЕКЛАДИНА -->
  <rect
    x="120" y="${HOOK_Y - 6}" width="115" height="12"
    fill="url(#rod-horizontal)"
    rx="1.5"
  />
  <rect x="120" y="${HOOK_Y - 5.5}" width="115" height="1.5" fill="rgb(255 255 255 / 0.55)" />

  <rect x="231" y="${HOOK_Y - 7}" width="7" height="14" rx="2" fill="var(--equip-metal-dark, #6e7682)" />
  <rect x="232" y="${HOOK_Y - 6.5}" width="0.8" height="13" fill="rgb(255 255 255 / 0.4)" />

  <!-- ТРИ ТОЧКИ КРЕПЛЕНИЯ (хромированные петли) -->
  ${HOOK_X.map(
    (x) => `
    <ellipse cx="${x}" cy="${HOOK_Y + 11}" rx="5" ry="1.5" fill="rgb(0 0 0 / 0.3)" />
    <ellipse cx="${x}" cy="${HOOK_Y + 9}" rx="4.5" ry="3.8" fill="none"
      stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="2" />
    <path d="M ${x - 4} ${HOOK_Y + 9} A 4 3.4 0 0 1 ${x + 4} ${HOOK_Y + 9}"
          stroke="var(--equip-metal-shine, #f0f2f5)" stroke-width="1" fill="none" />
  `,
  ).join('')}
</svg>
  `;
}

export class LabStand extends HTMLElement {
  static observedAttributes = ['rod-extra'];

  #shadow: ShadowRoot;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#render();
  }

  attributeChangedCallback(name: string): void {
    if (name === 'rod-extra') this.#render();
  }

  /** Текущее удлинение стержня в SVG-юнитах. */
  get rodExtra(): number {
    return Math.max(0, Number(this.getAttribute('rod-extra') ?? 0));
  }

  set rodExtra(value: number) {
    const v = Math.max(0, Math.round(value));
    if (v === this.rodExtra) return;
    this.setAttribute('rod-extra', String(v));
  }

  #render(): void {
    const extra = this.rodExtra;
    this.#shadow.innerHTML = `<style>${STYLE}</style>${buildSvg(extra)}`;
    // Aspect-ratio задаётся inline — подсказывает браузеру вычислять height по width
    // пропорционально текущему viewBox (240 × (480 + rod-extra)).
    const totalH = BASE_SVG_HEIGHT + extra;
    this.style.aspectRatio = `${SVG_WIDTH} / ${totalH}`;
  }

  /**
   * Позиция i-й точки крепления (0..2) в координатах host-элемента в пикселях.
   * Учитывает текущий размер компонента.
   */
  getHookPosition(index: 0 | 1 | 2): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    const totalH = BASE_SVG_HEIGHT + this.rodExtra;
    const scaleX = rect.width / SVG_WIDTH;
    const scaleY = rect.height / totalH;
    return {
      x: HOOK_X[index]! * scaleX,
      y: (HOOK_Y + 8) * scaleY,
    };
  }

  /** Количество точек крепления (для итерации). */
  get hookCount(): number {
    return HOOK_X.length;
  }
}

customElements.define('lab-stand', LabStand);
