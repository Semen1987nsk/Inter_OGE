/**
 * <lab-composite-weight kind="rod|disc|composite" mass="10" discs="50,20">
 *
 * Компонент наборного груза по ФИПИ комплекта №2:
 *  - kind="rod"       — штанга-основа 10 г (отдельная единица). Чистый металлический
 *                       стержень с eyelet'ом сверху, без подписей массы (ученик
 *                       взвешивает на динамометре сам).
 *  - kind="disc"      — диск 10/20/50 г (отдельная единица в tray). Размер по массе.
 *                       Без подписей массы; ученик различает по размеру.
 *  - kind="composite" — собранный узел = штанга + надетые диски как ЕДИНОЕ ЦЕЛОЕ.
 *                       Атрибут `discs` — массы через запятую. Авто-сортировка
 *                       50→20→10 снизу вверх; диски стопкой на нижней части стержня,
 *                       опираясь на end-cap.
 *
 * Спека: .business/спеки/2026-05-14-наборный-груз-сборочный-верстак.md
 */

/**
 * Геометрия дисков в SVG-юнитах viewBox 60×130.
 *  rx     — горизонтальный радиус
 *  ry     — вертикальный радиус верхнего эллипса (flatness)
 *  height — высота боковой поверхности
 *
 * Подобрано так, чтобы ratio диаметр/высота ≈ 4–5:1 — это «правдоподобный»
 * металлический диск (плоская монета, не цилиндр). Раньше было 3:1, и
 * из-за чрезмерного верхнего эллипса + протрудящего нижнего диска глаз
 * читал ОДИН диск как «два» — светлая верхняя часть + тёмная нижняя.
 */
/**
 * Iter 3: диски почти одинакового диаметра (rx 22/24/26), отличаются
 * по ТОЛЩИНЕ (height 6/8/12). Это правдоподобнее реального ФИПИ-комплекта
 * (там диски ⌀30/35/40 мм — диаметры близкие, но толщина растёт с массой).
 *
 * Раньше rx=15/20/26 → лесенка «уступов» 5/6 SVG-юнитов с каждой стороны,
 * глаз читал это как 4-5 отдельных дисков. Сейчас уступы 2 SVG-юнита —
 * читается как ЕДИНЫЙ цилиндр с тремя слоями разной толщины.
 */
const DISC_GEOM: Record<number, { rx: number; ry: number; height: number }> = {
  10: { rx: 22, ry: 3.2, height: 6 },
  20: { rx: 24, ry: 3.4, height: 8 },
  50: { rx: 26, ry: 3.6, height: 12 },
};

/** Авто-сортировка дисков: большие массы внизу стержня (физически корректно). */
function sortDiscsBottomUp(masses: number[]): number[] {
  return [...masses].sort((a, b) => b - a);
}

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --piece-size: 64px;
    --metal: var(--equip-metal, #a8afb8);
    --metal-light: var(--equip-metal-light, #d5dbe3);
    --metal-shadow: var(--equip-metal-shadow, #4a5260);
    --disc-body: var(--equip-weight-dark, #6e7682);
    --disc-edge: var(--equip-weight-edge, #4a5260);

    display: inline-flex;
    align-items: flex-end;
    justify-content: center;
    width: var(--piece-size);
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    transition: transform var(--dur-fast, 150ms) var(--ease-out, ease-out);
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.35));
  }

  :host([kind="rod"]),
  :host([kind="composite"]) {
    height: 130px;
  }

  /* Размер диска (standalone в tray) — больше для лучшей кликабельности. */
  :host([kind="disc"][mass="10"]) { height: 30px; }
  :host([kind="disc"][mass="20"]) { height: 36px; }
  :host([kind="disc"][mass="50"]) { height: 44px; }

  :host(:hover:not([attached])) {
    transform: translateY(-2px);
    filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.5));
  }

  :host([dragging]) {
    cursor: grabbing;
    transform: scale(1.06);
    z-index: 100;
  }

  :host([kind="composite"][attached]:hover) {
    transform: none;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  /* На SVG-элементах HTML-атрибут [hidden] браузерами не всегда уважается
     (намного надёжнее display:none напрямую). Иначе все 3 режимных SVG
     рисуются разом → "две штанги" в композите. */
  svg[hidden] { display: none; }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 4 3;
    opacity: 0;
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:focus-visible) .focus-ring {
    opacity: 1;
  }

  /* Анимация «диск приземлился» */
  .disc-stacked {
    transform-origin: center 100%;
    animation: disc-land 320ms cubic-bezier(.34, 1.56, .64, 1);
  }

  @keyframes disc-land {
    0% { transform: translateY(-18px) scale(1.08); opacity: 0.4; }
    60% { transform: translateY(2px) scale(0.98); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .disc-stacked { animation: none; }
  }

  /* Slot-marker (snap-zone) — gold-glow контур куда встанет следующий диск. */
  .slot-marker {
    fill: rgb(242 201 76 / 0.18);
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 1.4;
    stroke-dasharray: 3 2;
    opacity: 0;
    pointer-events: none;
  }

  :host([data-slot-target]) .slot-marker {
    opacity: 1;
    animation: slot-pulse 1.2s ease-in-out infinite;
  }

  @keyframes slot-pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    :host([data-slot-target]) .slot-marker { animation: none; opacity: 1; }
  }
</style>

<!-- ─── Общие defs (gradients) — переиспользуем во всех режимах ─────────────
     ID'ы уникальные с префиксом lcw- чтобы не конфликтовать с другими SVG. -->
<svg width="0" height="0" style="position:absolute;" aria-hidden="true">
  <defs>
    <linearGradient id="lcw-stem" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--metal-shadow)" />
      <stop offset="22%" stop-color="var(--metal)" />
      <stop offset="50%" stop-color="var(--metal-light)" />
      <stop offset="78%" stop-color="var(--metal)" />
      <stop offset="100%" stop-color="var(--metal-shadow)" />
    </linearGradient>
    <linearGradient id="lcw-eyelet" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7a828e" />
      <stop offset="50%" stop-color="#dde2e8" />
      <stop offset="100%" stop-color="#7a828e" />
    </linearGradient>
    <linearGradient id="lcw-disc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="color-mix(in srgb, var(--disc-body) 60%, white 40%)" />
      <stop offset="45%" stop-color="var(--disc-body)" />
      <stop offset="100%" stop-color="var(--disc-edge)" />
    </linearGradient>
    <radialGradient id="lcw-disc-top" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="color-mix(in srgb, var(--disc-body) 50%, white 50%)" />
      <stop offset="70%" stop-color="var(--disc-body)" />
      <stop offset="100%" stop-color="var(--disc-edge)" />
    </radialGradient>
  </defs>
</svg>

<!-- ─── ROD (standalone в tray) — чистый стержень без подписей ───────────── -->
<svg class="rod" viewBox="0 0 60 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden>
  <!-- Eyelet (петля для крепления к крюку пружины/динамометра) -->
  <ellipse cx="30" cy="9" rx="6.4" ry="6.4" fill="none"
           stroke="url(#lcw-eyelet)" stroke-width="2.8" />
  <ellipse cx="30" cy="9" rx="3.2" ry="3.2" fill="rgb(0 0 0 / 0.55)" />

  <!-- Переход от eyelet к стержню (узкая шейка) -->
  <rect x="28.6" y="14.5" width="2.8" height="3.5" fill="url(#lcw-eyelet)" />

  <!-- Основной стержень -->
  <rect x="26" y="18" width="8" height="98" fill="url(#lcw-stem)" rx="1.2" />
  <!-- Тонкий блик -->
  <rect x="28.5" y="18" width="0.9" height="98" fill="rgb(255 255 255 / 0.55)" />

  <rect class="focus-ring" x="2" y="2" width="56" height="126" rx="8" />
</svg>

<!-- ─── DISC (standalone в tray) — чистый металлический диск без подписей.
     Только side + top + hole. БЕЗ нижнего эллипса (он создавал визуальный
     эффект «дополнительной грани» под диском). -->
<svg class="disc" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden>
  <!-- Боковая поверхность (rect) -->
  <rect class="disc-side" fill="url(#lcw-disc)" stroke="var(--disc-edge)" stroke-width="0.5" />
  <!-- Верхняя плоскость -->
  <ellipse class="disc-top" fill="url(#lcw-disc-top)"
           stroke="var(--disc-edge)" stroke-width="0.5" />
  <!-- Центральное отверстие — стержень виден сквозь него -->
  <ellipse class="disc-hole" fill="rgb(0 0 0 / 0.55)" />

  <rect class="focus-ring" x="2" y="2" width="56" height="26" rx="4" />
</svg>

<!-- ─── COMPOSITE (rod + надетые диски как единое целое) ───────────────────
     Та же геометрия host'а (60×130), что и у rod — getTopHookY/getWeightHookY
     возвращают те же значения, поэтому chain-algorithm DragController'а
     работает прозрачно. -->
<svg class="composite" viewBox="0 0 60 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden>
  <!-- Eyelet — крошечная петля. Iter 3 сделал её предельно маленькой (rx=3):
       любой кружок наверху стержня глаз учеников считал «верхним диском»
       пирамиды. См. memory/reference_svg_perceptual_doubling.md -->
  <ellipse cx="30" cy="6" rx="3" ry="3" fill="none"
           stroke="url(#lcw-eyelet)" stroke-width="1.2" />
  <ellipse cx="30" cy="6" rx="1.2" ry="1.2" fill="rgb(0 0 0 / 0.5)" />
  <rect x="29" y="9" width="2" height="4" fill="url(#lcw-eyelet)" />

  <!-- Стержень — заканчивается ВНУТРИ нижнего 50г диска (y=110), не торчит
       снизу. 50г диск (height=12) занимает y=104..116, стержень y=13..110
       исчезает в нём через центральное отверстие. -->
  <rect x="26" y="13" width="8" height="97" fill="url(#lcw-stem)" rx="1.2" />
  <rect x="28.5" y="13" width="0.9" height="97" fill="rgb(255 255 255 / 0.55)" />

  <!-- Slot-marker (gold-glow контур ожидаемой позиции следующего диска).
       Геометрия задаётся в JS. -->
  <ellipse class="slot-marker" cx="30" />

  <!-- Iter 3: flange удалён ПОЛНОСТЬЮ. Он был плоским эллипсом и глаз
       читал его как 4-й диск. Его роль «основания» теперь играет
       bottom-ellipse у нижнего 50г диска (рисуется в #renderComposite). -->

  <!-- Группа надетых дисков (JS добавляет <g class="disc-stacked"> сюда). -->
  <g class="discs-stack"></g>

  <rect class="focus-ring" x="2" y="2" width="56" height="126" rx="8" />
</svg>
`;

export class LabCompositeWeight extends HTMLElement {
  static observedAttributes = ['kind', 'mass', 'discs'];

  #rodSvg: SVGSVGElement;
  #discSvg: SVGSVGElement;
  #compositeSvg: SVGSVGElement;
  #discSide: SVGRectElement;
  #discTop: SVGEllipseElement;
  #discHole: SVGEllipseElement;
  #compositeDiscsStack: SVGGElement;
  #compositeSlotMarker: SVGEllipseElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#rodSvg = shadow.querySelector('svg.rod')!;
    this.#discSvg = shadow.querySelector('svg.disc')!;
    this.#compositeSvg = shadow.querySelector('svg.composite')!;
    this.#discSide = this.#discSvg.querySelector('.disc-side')!;
    this.#discTop = this.#discSvg.querySelector('.disc-top')!;
    this.#discHole = this.#discSvg.querySelector('.disc-hole')!;
    this.#compositeDiscsStack = this.#compositeSvg.querySelector('.discs-stack')!;
    this.#compositeSlotMarker = this.#compositeSvg.querySelector('.slot-marker')!;
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    if (this.tabIndex < 0) this.tabIndex = 0;
    this.#render();
  }

  attributeChangedCallback(): void {
    this.#render();
  }

  get kind(): 'rod' | 'disc' | 'composite' {
    return (this.getAttribute('kind') as 'rod' | 'disc' | 'composite') ?? 'rod';
  }

  get mass(): number {
    if (this.kind === 'composite') return this.getMass();
    return Number(this.getAttribute('mass') ?? 10);
  }

  /** Диски на штанге (только kind=composite), отсортированы 50→20→10. */
  get discs(): number[] {
    if (this.kind !== 'composite') return [];
    const raw = this.getAttribute('discs') ?? '';
    if (!raw) return [];
    return sortDiscsBottomUp(
      raw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => n === 10 || n === 20 || n === 50),
    );
  }

  /** Общая масса узла = штанга (10 г) + сумма всех дисков. */
  getMass(): number {
    if (this.kind !== 'composite') return Number(this.getAttribute('mass') ?? 10);
    return 10 + this.discs.reduce((a, b) => a + b, 0);
  }

  setDiscs(masses: number[]): void {
    const validated = masses.filter((m) => m === 10 || m === 20 || m === 50);
    this.setAttribute('discs', validated.join(','));
  }

  /** Y верхнего eyelet'а. У rod eyelet на cy=9, у composite — на cy=6 (меньше). */
  getTopHookY(): number {
    const rect = this.getBoundingClientRect();
    if (this.kind === 'rod') return (9 / 130) * rect.height;
    if (this.kind === 'composite') return (6 / 130) * rect.height;
    // disc — отверстие около верхней плоскости
    return (8 / 30) * rect.height;
  }

  /** Y нижней точки (end-cap rod/composite или низ диска). */
  getWeightHookY(): number {
    const rect = this.getBoundingClientRect();
    if (this.kind === 'rod' || this.kind === 'composite') {
      // end-cap нижняя кромка в (30, 118.5) на viewBox 130
      return (118.5 / 130) * rect.height;
    }
    return rect.height;
  }

  #render(): void {
    if (this.kind === 'rod') {
      this.#rodSvg.removeAttribute('hidden');
      this.#discSvg.setAttribute('hidden', '');
      this.#compositeSvg.setAttribute('hidden', '');
      this.setAttribute(
        'aria-label',
        'Штанга-основа наборного груза. Нажмите Enter чтобы взять.',
      );
    } else if (this.kind === 'disc') {
      this.#rodSvg.setAttribute('hidden', '');
      this.#discSvg.removeAttribute('hidden');
      this.#compositeSvg.setAttribute('hidden', '');
      this.#renderDisc();
      this.setAttribute(
        'aria-label',
        `Диск ${this.mass} г для наборного груза. Нажмите Enter чтобы взять.`,
      );
    } else {
      this.#rodSvg.setAttribute('hidden', '');
      this.#discSvg.setAttribute('hidden', '');
      this.#compositeSvg.removeAttribute('hidden');
      this.#renderComposite();
      const ds = this.discs;
      const label =
        ds.length === 0
          ? 'Штанга-узел без дисков.'
          : `Штанга-узел с дисками ${ds.join(' г, ')} г.`;
      this.setAttribute('aria-label', `${label} Нажмите Enter чтобы взять.`);
    }
  }

  #renderDisc(): void {
    const geom = DISC_GEOM[this.mass] ?? DISC_GEOM[10]!;
    const cx = 30;
    const sideTop = 12; // больше пространства сверху для top-эллипса

    this.#discTop.setAttribute('cx', String(cx));
    this.#discTop.setAttribute('cy', String(sideTop));
    this.#discTop.setAttribute('rx', String(geom.rx));
    this.#discTop.setAttribute('ry', String(geom.ry));

    this.#discSide.setAttribute('x', String(cx - geom.rx));
    this.#discSide.setAttribute('y', String(sideTop));
    this.#discSide.setAttribute('width', String(geom.rx * 2));
    this.#discSide.setAttribute('height', String(geom.height));

    // Центральное отверстие — больше у больших дисков (для визуальной правдоподобности).
    const holeRx = this.mass === 50 ? 3.2 : this.mass === 20 ? 2.6 : 2.0;
    this.#discHole.setAttribute('cx', String(cx));
    this.#discHole.setAttribute('cy', String(sideTop));
    this.#discHole.setAttribute('rx', String(holeRx));
    this.#discHole.setAttribute('ry', '0.8');
  }

  /**
   * Iter 3: рендер каждого диска как полноценной 3D-монеты:
   *  - bottom-ellipse у НИЖНЕГО диска (i=0) — заменяет старый flange,
   *    даёт ощущение массивного основания.
   *  - side rect — боковая поверхность каждого диска.
   *  - top-ellipse у КАЖДОГО диска. Это критично для устранения «лесенки»:
   *    выпуклая верхняя плоскость нижнего диска видна ПО БОКАМ от меньшего
   *    верхнего диска, читается как «полка одной 3D-монеты», а не как
   *    «ещё один плоский диск-уступ».
   *  - hole только у топового диска (центральное отверстие).
   */
  #renderComposite(): void {
    this.#compositeDiscsStack.replaceChildren();

    const STEM_BOTTOM_Y = 116; // нижний край композита (стержень уходит внутрь нижнего диска)
    const cx = 30;
    const ds = this.discs; // отсортированы 50→20→10 (большие массы первыми = внизу)

    let cursor = STEM_BOTTOM_Y;
    for (let i = 0; i < ds.length; i++) {
      const mass = ds[i]!;
      const isBottom = i === 0;
      const isTop = i === ds.length - 1;
      const geom = DISC_GEOM[mass]!;
      const topY = cursor - geom.height;
      const bottomY = cursor;

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.classList.add('disc-stacked');
      group.dataset['mass'] = String(mass);

      // (1) Bottom-ellipse — только у нижнего диска. ТОНКАЯ и ТЁМНАЯ —
      //     должна читаться как «нижняя металлическая кромка диска»,
      //     НЕ как отдельный 4-й плоский диск. Iter 2 ошибка: я сделал
      //     её светлой и с ry=2.7, и она читалась как ещё одна полка.
      //     Iter 3 fix: ry=0.8 (3.5× тоньше), fill = disc-edge (тёмная).
      if (isBottom) {
        const bottom = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        bottom.setAttribute('cx', String(cx));
        bottom.setAttribute('cy', String(bottomY));
        bottom.setAttribute('rx', String(geom.rx));
        bottom.setAttribute('ry', '0.8');
        bottom.setAttribute('fill', 'var(--disc-edge)');
        group.appendChild(bottom);
      }

      // (2) Side rect — основная боковая поверхность диска
      const side = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      side.setAttribute('x', String(cx - geom.rx));
      side.setAttribute('y', String(topY));
      side.setAttribute('width', String(geom.rx * 2));
      side.setAttribute('height', String(geom.height));
      side.setAttribute('fill', 'url(#lcw-disc)');
      side.setAttribute('stroke', 'var(--disc-edge)');
      side.setAttribute('stroke-width', '0.5');
      group.appendChild(side);

      // (3) Top-ellipse у КАЖДОГО диска — выпуклая верхняя плоскость.
      //     У нижних дисков центральная часть будет закрыта side-rect
      //     следующего диска сверху, но БОКОВЫЕ КРЫЛЬЯ останутся видимы —
      //     это и есть «3D-полка», читается как часть одной монеты,
      //     а не как отдельный плоский уступ.
      const top = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      top.setAttribute('cx', String(cx));
      top.setAttribute('cy', String(topY));
      top.setAttribute('rx', String(geom.rx));
      top.setAttribute('ry', String(geom.ry));
      top.setAttribute('fill', 'url(#lcw-disc-top)');
      top.setAttribute('stroke', 'var(--disc-edge)');
      top.setAttribute('stroke-width', '0.5');
      group.appendChild(top);

      // (4) Hole — только у топового диска (стержень виден сквозь)
      if (isTop) {
        const holeRx = mass === 50 ? 3.2 : mass === 20 ? 2.6 : 2.0;
        const hole = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        hole.setAttribute('cx', String(cx));
        hole.setAttribute('cy', String(topY));
        hole.setAttribute('rx', String(holeRx));
        hole.setAttribute('ry', '0.8');
        hole.setAttribute('fill', 'rgb(0 0 0 / 0.55)');
        group.appendChild(hole);
      }

      this.#compositeDiscsStack.appendChild(group);
      cursor = topY;
    }

    // Slot-marker — позиция следующего слота. Показывается, только когда
    // host имеет атрибут data-slot-target (drag активен в snap-радиусе).
    const nextMass = this.#predictNextSlotMass();
    if (nextMass !== null) {
      const nextGeom = DISC_GEOM[nextMass]!;
      const markerY = cursor - nextGeom.height / 2;
      this.#compositeSlotMarker.setAttribute('cy', String(markerY));
      this.#compositeSlotMarker.setAttribute('rx', String(nextGeom.rx));
      this.#compositeSlotMarker.setAttribute('ry', String(nextGeom.ry + 1.2));
    } else {
      // Все 3 надеты — маркер скрыт
      this.#compositeSlotMarker.setAttribute('rx', '0');
      this.#compositeSlotMarker.setAttribute('ry', '0');
    }
  }

  /** Какой диск встанет следующим (по правилу 50→20→10). */
  #predictNextSlotMass(): number | null {
    const have = new Set(this.discs);
    const allMasses = [50, 20, 10];
    for (const m of allMasses) {
      if (!have.has(m)) return m;
    }
    return null;
  }
}

customElements.define('lab-composite-weight', LabCompositeWeight);
