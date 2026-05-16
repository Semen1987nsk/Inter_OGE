/**
 * Pressure-aware tilt (правило 4): карточка реагирует не просто на позицию
 * мыши (это generic), а на её СКОРОСТЬ. Быстро двигаешь → больше наклон.
 * Это даёт ощущение «массы». Photo внутри получает parallax-смещение.
 *
 * Используется CSS-vars вместо style.transform — никаких re-render layouts.
 */

interface TiltOptions {
  /** Максимальный наклон в градусах при максимальной скорости. */
  maxTilt?: number;
  /** Множитель смещения photo (px) на 1 deg наклона. */
  parallaxFactor?: number;
}

const DEFAULTS: Required<TiltOptions> = {
  maxTilt: 5,
  parallaxFactor: 4,
};

export function attachPressureTilt(card: HTMLElement, options: TiltOptions = {}): void {
  // Reduced-motion — не активируем (правило 8)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Только для устройств с реальным hover (не touch)
  if (!window.matchMedia('(hover: hover)').matches) return;

  const opts = { ...DEFAULTS, ...options };

  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let rafId = 0;
  let targetTiltX = 0;
  let targetTiltY = 0;
  let targetTiltZ = 0;
  let targetPhotoX = 0;
  let targetPhotoY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;
  let currentTiltZ = 0;
  let currentPhotoX = 0;
  let currentPhotoY = 0;

  const handleMove = (ev: PointerEvent): void => {
    const rect = card.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    // Позиционная составляющая (нормализованная -1..1)
    const px = (x / rect.width) * 2 - 1;
    const py = (y / rect.height) * 2 - 1;

    // Скорость движения мыши
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    const vx = (ev.clientX - lastX) / dt;
    const vy = (ev.clientY - lastY) / dt;
    const speed = Math.min(1, Math.hypot(vx, vy) / 2.5);

    lastX = ev.clientX;
    lastY = ev.clientY;
    lastT = now;

    // Tilt = базовый позиционный + усиление от скорости
    const intensity = 0.5 + speed * 0.5; // 0.5..1
    targetTiltY = -px * opts.maxTilt * intensity;
    targetTiltX = py * opts.maxTilt * intensity;
    // Z-rotation от скорости (имитирует «инерцию» массы)
    targetTiltZ = vx * 0.06;

    // Photo parallax — внутри карточки фото движется чуть медленнее
    targetPhotoX = -px * opts.parallaxFactor * opts.maxTilt * 0.6;
    targetPhotoY = -py * opts.parallaxFactor * opts.maxTilt * 0.6;

    if (!rafId) rafId = requestAnimationFrame(animate);
  };

  const handleLeave = (): void => {
    targetTiltX = 0;
    targetTiltY = 0;
    targetTiltZ = 0;
    targetPhotoX = 0;
    targetPhotoY = 0;
    if (!rafId) rafId = requestAnimationFrame(animate);
  };

  const animate = (): void => {
    // Линейная интерполяция для плавного движения
    const lerp = (a: number, b: number, t = 0.18): number => a + (b - a) * t;

    currentTiltX = lerp(currentTiltX, targetTiltX);
    currentTiltY = lerp(currentTiltY, targetTiltY);
    currentTiltZ = lerp(currentTiltZ, targetTiltZ);
    currentPhotoX = lerp(currentPhotoX, targetPhotoX);
    currentPhotoY = lerp(currentPhotoY, targetPhotoY);

    card.style.setProperty('--tilt-x', `${currentTiltX.toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${currentTiltY.toFixed(2)}deg`);
    card.style.setProperty('--tilt-z', `${currentTiltZ.toFixed(3)}deg`);
    card.style.setProperty('--photo-x', `${currentPhotoX.toFixed(1)}px`);
    card.style.setProperty('--photo-y', `${currentPhotoY.toFixed(1)}px`);
    // 3-layer parallax (AWWWARDS-стандарт 2026):
    // depth 0 — photo (slowest), depth ~0.5 — icon (medium), depth ~1 — meta (fastest).
    // Усиление меньше чем у фото — текст не должен «прыгать».
    card.style.setProperty('--icon-x', `${(currentPhotoX * 0.4).toFixed(1)}px`);
    card.style.setProperty('--icon-y', `${(currentPhotoY * 0.4).toFixed(1)}px`);
    card.style.setProperty('--meta-x', `${(currentPhotoX * 0.18).toFixed(1)}px`);
    card.style.setProperty('--meta-y', `${(currentPhotoY * 0.18).toFixed(1)}px`);
    // Glare: позиция света на карточке — нормализованная мышью.
    const glareX = ((currentTiltY / opts.maxTilt) * 50 + 50).toFixed(1);
    const glareY = ((-currentTiltX / opts.maxTilt) * 50 + 50).toFixed(1);
    card.style.setProperty('--glare-x', `${glareX}%`);
    card.style.setProperty('--glare-y', `${glareY}%`);
    const glareIntensity = Math.min(0.18, Math.hypot(currentTiltX, currentTiltY) * 0.025);
    card.style.setProperty('--glare-alpha', glareIntensity.toFixed(3));

    // Останавливаемся когда близко к target
    const stillMoving =
      Math.abs(currentTiltX - targetTiltX) > 0.05 ||
      Math.abs(currentTiltY - targetTiltY) > 0.05 ||
      Math.abs(currentTiltZ - targetTiltZ) > 0.005 ||
      Math.abs(currentPhotoX - targetPhotoX) > 0.5 ||
      Math.abs(currentPhotoY - targetPhotoY) > 0.5;

    if (stillMoving) {
      rafId = requestAnimationFrame(animate);
    } else {
      rafId = 0;
    }
  };

  card.addEventListener('pointermove', handleMove);
  card.addEventListener('pointerleave', handleLeave);
}
