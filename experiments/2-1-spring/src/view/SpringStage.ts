/**
 * SpringStage — canvas-сцена опыта.
 *
 * Рендерит:
 *  - штатив (стационарный)
 *  - пружину (динамическая длина по удлинению)
 *  - стопку подвешенных грузов
 *  - вектор силы тяжести (опционально)
 *  - шкалу удлинения (опционально)
 *  - линейку (drag, опционально)
 *
 * Архитектура: 2 canvas-слоя (background + dynamic). Background перерисовывается
 * только при resize, dynamic — на каждый кадр или при изменении state.
 */

import type { SpringExperimentState, Weight } from '@/types';
import { PIXELS_PER_CM } from '@/types';
import { totalMass } from '@physics/SpringModel';

interface SceneGeometry {
  width: number;
  height: number;
  /** Точка крепления пружины (верх). */
  springAnchor: { x: number; y: number };
  /** Естественная длина пружины (px). */
  unstretchedLengthPx: number;
}

/**
 * Состояние анимации пружины.
 *
 * Физика: затухающие гармонические колебания вокруг нового равновесия:
 *   x(t) = target + (initial - target) · exp(-damping·t) · cos(ω·t)
 *
 * При t=0 даёт `initial`, при t→∞ → `target`. Реалистичная физика без вмешательства.
 */
interface SpringAnimation {
  startTime: number;
  initialExtension: number; // см
  targetExtension: number; // см
  omega: number; // рад/с
  damping: number; // коэффициент затухания
  /** Грубая длительность анимации (сек), после неё пружина считается остановленной. */
  duration: number;
}

export class SpringStage {
  #container: HTMLElement;
  #bgCanvas: HTMLCanvasElement;
  #fgCanvas: HTMLCanvasElement;
  #bgCtx: CanvasRenderingContext2D;
  #fgCtx: CanvasRenderingContext2D;
  #geometry: SceneGeometry;
  #state: SpringExperimentState | null = null;
  #dpr = window.devicePixelRatio || 1;
  #resizeObserver: ResizeObserver;
  /** Текущее анимируемое удлинение (см), может отличаться от state.currentExtension. */
  #displayedExtension = 0;
  #animation: SpringAnimation | null = null;
  #rafId: number | null = null;

  constructor(container: HTMLElement) {
    this.#container = container;
    // Контейнер должен быть position: relative (.stage уже такой);
    // canvas-слои внутри — position: absolute. Класс на сам контейнер не вешаем.

    this.#bgCanvas = this.#createCanvas('bg');
    this.#fgCanvas = this.#createCanvas('fg');
    container.appendChild(this.#bgCanvas);
    container.appendChild(this.#fgCanvas);

    this.#bgCtx = this.#bgCanvas.getContext('2d')!;
    this.#fgCtx = this.#fgCanvas.getContext('2d')!;

    this.#geometry = this.#computeGeometry();

    this.#resizeObserver = new ResizeObserver(() => this.#handleResize());
    this.#resizeObserver.observe(container);
    this.#handleResize();
  }

  setState(state: SpringExperimentState): void {
    const previous = this.#state;
    this.#state = state;

    const previousMass = previous ? totalMass(previous.attachedWeights) : 0;
    const newMass = totalMass(state.attachedWeights);
    const massChanged = previousMass !== newMass;

    if (massChanged && !state.reducedMotion && newMass > 0) {
      // Запускаем колебания. initial = текущее displayed (там где пружина была до изменения).
      this.#startAnimation(this.#displayedExtension, state.currentExtension, newMass / 1000);
    } else {
      // Сразу к target (reduced motion или опции изменились без массы)
      this.#displayedExtension = state.currentExtension;
      this.#stopAnimation();
      this.#renderForeground();
    }
  }

  destroy(): void {
    this.#stopAnimation();
    this.#resizeObserver.disconnect();
  }

  #startAnimation(initialExtension: number, targetExtension: number, totalMassKg: number): void {
    if (!this.#state) return;
    const k = this.#state.springConstant;
    const omega = Math.sqrt(k / totalMassKg);
    const damping = 1.8;
    // Грубо: до затухания 1% амплитуды
    const duration = -Math.log(0.01) / damping;

    this.#animation = {
      startTime: performance.now(),
      initialExtension,
      targetExtension,
      omega,
      damping,
      duration,
    };

    if (this.#rafId !== null) cancelAnimationFrame(this.#rafId);
    this.#rafId = requestAnimationFrame((t) => this.#animationFrame(t));
  }

  #stopAnimation(): void {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    this.#animation = null;
  }

  #animationFrame(_now: number): void {
    if (!this.#animation || !this.#state) return;
    const a = this.#animation;
    const elapsed = (performance.now() - a.startTime) / 1000;

    if (elapsed >= a.duration) {
      this.#displayedExtension = a.targetExtension;
      this.#animation = null;
      this.#rafId = null;
      this.#renderForeground();
      return;
    }

    const offset = (a.initialExtension - a.targetExtension) * Math.exp(-a.damping * elapsed) * Math.cos(a.omega * elapsed);
    this.#displayedExtension = a.targetExtension + offset;
    this.#renderForeground();
    this.#rafId = requestAnimationFrame((t) => this.#animationFrame(t));
  }

  #createCanvas(layer: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.classList.add('stage-canvas');
    c.dataset.layer = layer;
    return c;
  }

  #handleResize(): void {
    const rect = this.#container.getBoundingClientRect();
    for (const c of [this.#bgCanvas, this.#fgCanvas]) {
      c.width = rect.width * this.#dpr;
      c.height = rect.height * this.#dpr;
      c.style.width = `${rect.width}px`;
      c.style.height = `${rect.height}px`;
    }
    this.#bgCtx.scale(this.#dpr, this.#dpr);
    this.#fgCtx.scale(this.#dpr, this.#dpr);
    this.#geometry = this.#computeGeometry();
    this.#renderBackground();
    this.#renderForeground();
  }

  #computeGeometry(): SceneGeometry {
    const rect = this.#container.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      springAnchor: { x: rect.width / 2, y: rect.height * 0.18 },
      unstretchedLengthPx: 14 * PIXELS_PER_CM, // l₀ = 14 см
    };
  }

  /** Background: штатив + сетка. Перерисовывается только при resize. */
  #renderBackground(): void {
    const ctx = this.#bgCtx;
    const { width, height, springAnchor } = this.#geometry;
    ctx.clearRect(0, 0, width, height);

    // Сетка-фон (миллиметровка слегка)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridStep = PIXELS_PER_CM;
    for (let x = 0; x <= width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    this.#drawStand(ctx, springAnchor);
  }

  #drawStand(ctx: CanvasRenderingContext2D, anchor: { x: number; y: number }): void {
    const { height } = this.#geometry;
    const baseY = height - 60;
    const baseWidth = 200;
    const baseHeight = 12;
    const baseX = anchor.x - baseWidth / 2;

    // Вертикальный стержень (от основания до верха)
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(anchor.x - 4, 40, 8, baseY - 40);

    // Поперечная балка-кронштейн (откуда свисает пружина)
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(anchor.x - 60, 40, 120, 8);
    ctx.fillRect(anchor.x - 4, 40, 8, anchor.y - 40);

    // Основание
    const grad = ctx.createLinearGradient(0, baseY, 0, baseY + baseHeight);
    grad.addColorStop(0, '#3a3a3a');
    grad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(baseX, baseY, baseWidth, baseHeight, 4);
    ctx.fill();

    // Тень основания
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(anchor.x, baseY + baseHeight + 6, baseWidth / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Foreground: пружина + грузы + векторы. */
  #renderForeground(): void {
    const ctx = this.#fgCtx;
    const { width, height, springAnchor, unstretchedLengthPx } = this.#geometry;
    ctx.clearRect(0, 0, width, height);
    if (!this.#state) return;

    // Используем displayed (анимируемое), а не state.currentExtension (target)
    const extensionPx = this.#displayedExtension * PIXELS_PER_CM;
    const totalLengthPx = unstretchedLengthPx + extensionPx;

    // Пунктир «исходная длина» (всегда виден в режиме showExtensionScale)
    if (this.#state.showExtensionScale) {
      ctx.save();
      ctx.strokeStyle = 'rgba(74,127,184,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(springAnchor.x - 80, springAnchor.y + unstretchedLengthPx);
      ctx.lineTo(springAnchor.x + 80, springAnchor.y + unstretchedLengthPx);
      ctx.stroke();
      ctx.restore();
    }

    // Пружина (зигзаг)
    this.#drawSpring(ctx, springAnchor, totalLengthPx);

    // Грузы (стопкой ниже пружины)
    const stackTopY = springAnchor.y + totalLengthPx + 8;
    if (this.#state.attachedWeights.length > 0) {
      this.#drawWeightStack(ctx, springAnchor.x, stackTopY, this.#state.attachedWeights);
    }

    // Snap-to-hook подсветка (поверх грузов)
    const hookY = springAnchor.y + unstretchedLengthPx + extensionPx;
    this.#drawHookHighlight(ctx, springAnchor.x, hookY);

    // Вектор силы (опционально)
    if (this.#state.showForceVector && this.#state.attachedWeights.length > 0) {
      const lastWeight = this.#state.attachedWeights[this.#state.attachedWeights.length - 1]!;
      const arrowStartY = stackTopY + this.#state.attachedWeights.length * 80;
      this.#drawForceVector(
        ctx,
        springAnchor.x,
        arrowStartY,
        this.#state.currentForce,
        lastWeight.mass,
      );
    }
  }

  #drawSpring(
    ctx: CanvasRenderingContext2D,
    anchor: { x: number; y: number },
    lengthPx: number,
  ): void {
    const coils = 12;
    const coilWidth = 32; // ширина зигзага
    const coilHeight = lengthPx / coils;
    const cx = anchor.x;

    ctx.save();
    ctx.strokeStyle = 'rgb(91,103,112)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(cx, anchor.y);
    for (let i = 0; i < coils; i++) {
      const y = anchor.y + (i + 0.5) * coilHeight;
      const dir = i % 2 === 0 ? 1 : -1;
      ctx.lineTo(cx + (coilWidth / 2) * dir, y);
    }
    ctx.lineTo(cx, anchor.y + lengthPx);
    ctx.stroke();

    // Лёгкая тень
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.stroke();
    ctx.restore();
  }

  #drawWeightStack(
    ctx: CanvasRenderingContext2D,
    cx: number,
    topY: number,
    weights: ReadonlyArray<Weight>,
  ): void {
    const weightHeight = 64;
    const weightWidth = 56;
    let currentY = topY;

    for (const w of weights) {
      const x = cx - weightWidth / 2;
      const color = w.color ?? 'rgb(140,155,170)';
      const edge = 'rgb(107,119,133)';

      // Верхний крючок
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, currentY);
      ctx.bezierCurveTo(cx - 4, currentY + 2, cx - 4, currentY + 8, cx, currentY + 12);
      ctx.stroke();

      // Тело
      ctx.fillStyle = color;
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, currentY + 12, weightWidth, weightHeight - 12, 4);
      ctx.fill();
      ctx.stroke();

      // Лейбл массы
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(w.label, cx, currentY + weightHeight / 2 + 4);

      currentY += weightHeight - 4; // легко перекрытие крючков
    }
  }

  #drawForceVector(
    ctx: CanvasRenderingContext2D,
    cx: number,
    startY: number,
    force: number,
    _lastWeightMass: number,
  ): void {
    const arrowLength = Math.min(60 + force * 15, 120);
    const endY = startY + arrowLength;

    ctx.save();
    ctx.strokeStyle = 'rgb(242,129,29)';
    ctx.fillStyle = 'rgb(242,129,29)';
    ctx.lineWidth = 3;

    // Стрелка
    ctx.beginPath();
    ctx.moveTo(cx, startY);
    ctx.lineTo(cx, endY);
    ctx.stroke();

    // Наконечник
    ctx.beginPath();
    ctx.moveTo(cx, endY + 8);
    ctx.lineTo(cx - 6, endY - 4);
    ctx.lineTo(cx + 6, endY - 4);
    ctx.closePath();
    ctx.fill();

    // Подпись F
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`F = ${force.toFixed(2)} Н`, cx + 16, startY + arrowLength / 2);
    ctx.restore();
  }

  /** Возвращает координаты крюка пружины в client-coordinates (для drag&drop). */
  getSpringHookPosition(): { x: number; y: number } {
    const rect = this.#container.getBoundingClientRect();
    const { springAnchor, unstretchedLengthPx } = this.#geometry;
    const extensionPx = this.#displayedExtension * PIXELS_PER_CM;
    return {
      x: rect.left + springAnchor.x,
      y: rect.top + springAnchor.y + unstretchedLengthPx + extensionPx,
    };
  }

  /** Является ли точка над крюком (для snap drop). client-coordinates. */
  isOverHook(point: { x: number; y: number }, threshold = 60): boolean {
    const hook = this.getSpringHookPosition();
    const dx = point.x - hook.x;
    const dy = point.y - hook.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  }

  /** Включает/выключает золотую подсветку крюка (snap-to-hook visual feedback). */
  setHookHighlight(active: boolean): void {
    if (this.#hookHighlightActive === active) return;
    this.#hookHighlightActive = active;
    this.#renderForeground();
  }

  #hookHighlightActive = false;

  #drawHookHighlight(ctx: CanvasRenderingContext2D, hookX: number, hookY: number): void {
    if (!this.#hookHighlightActive) return;
    const time = (performance.now() % 1500) / 1500;
    const pulseRadius = 28 + Math.sin(time * Math.PI * 2) * 4;

    ctx.save();
    ctx.strokeStyle = 'rgb(242,201,76)';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(hookX, hookY, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = 'rgba(242,201,76,0.6)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // Пульсация → запросить следующий кадр пока активна подсветка
    if (this.#rafId === null) {
      this.#rafId = requestAnimationFrame(() => {
        this.#rafId = null;
        if (this.#hookHighlightActive) this.#renderForeground();
      });
    }
  }
}
