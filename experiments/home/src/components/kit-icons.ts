/**
 * kit-icons.ts — animated SVG-иконки физики для kit-cards.
 *
 * Заменяет тяжёлый Rive runtime (+100 кБ) для иконок:
 * каждая иконка ~2-4 кБ inline SVG с CSS-анимациями. Тот же AHA-эффект
 * без дополнительного runtime, без .riv assets.
 *
 * Соглашение: 80×80 viewBox, currentColor для контура, gold/teal акценты.
 * Анимации запускаются при .kit-card[data-icon-animate="true"] (hover) или
 * на flagship — постоянно.
 */

const COMMON_DEFS = `
  <defs>
    <linearGradient id="grad-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffbe0b" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0.7"/>
    </linearGradient>
    <linearGradient id="grad-teal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#0e7490" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
`;

/** Kit-1 — Гидростатика: мензурка с цилиндром, погружающимся (gentle dip). */
const ICON_HYDROSTATICS = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" class="kit-icon-svg" aria-hidden="true">
  ${COMMON_DEFS}
  <!-- Мензурка (стекло) -->
  <path d="M22 20 L22 60 Q22 66 28 66 L52 66 Q58 66 58 60 L58 20 Z"
        fill="rgba(20, 184, 166, 0.12)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  <!-- Метки шкалы -->
  <line x1="22" y1="30" x2="28" y2="30" stroke="currentColor" stroke-width="1" opacity="0.5"/>
  <line x1="22" y1="40" x2="26" y2="40" stroke="currentColor" stroke-width="1" opacity="0.35"/>
  <line x1="22" y1="50" x2="28" y2="50" stroke="currentColor" stroke-width="1" opacity="0.5"/>
  <!-- Вода (waterline) -->
  <path class="kit-icon-water" d="M22 42 L58 42 L58 60 Q58 66 52 66 L28 66 Q22 66 22 60 Z"
        fill="url(#grad-teal)" opacity="0.55"/>
  <!-- Цилиндр-груз (анимируется dip-up-down) -->
  <g class="kit-icon-cylinder">
    <rect x="36" y="6" width="8" height="22" rx="1.5" fill="url(#grad-gold)" stroke="#ffbe0b" stroke-width="1"/>
    <!-- Крепёжная нить -->
    <line x1="40" y1="0" x2="40" y2="6" stroke="currentColor" stroke-width="0.8" opacity="0.6"/>
  </g>
</svg>
`;

/** Kit-2 (FLAGSHIP) — Силы: пружина с грузом, колеблющаяся. */
const ICON_FORCES = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" class="kit-icon-svg" aria-hidden="true">
  ${COMMON_DEFS}
  <!-- Штатив (вертикальная стойка) -->
  <line x1="14" y1="6" x2="14" y2="74" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="10" y1="74" x2="34" y2="74" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <!-- Горизонтальный кронштейн -->
  <line x1="14" y1="14" x2="46" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Пружина (zigzag, анимируется stretch) -->
  <g class="kit-icon-spring">
    <path d="M46 14 L42 18 L50 22 L42 26 L50 30 L42 34 L50 38 L42 42 L50 46 L46 50"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <!-- Груз (анимируется bounce) -->
  <g class="kit-icon-weight">
    <rect x="38" y="50" width="16" height="14" rx="2" fill="url(#grad-gold)" stroke="#ffbe0b" stroke-width="1.2"/>
    <text x="46" y="61" font-family="JetBrains Mono, monospace" font-size="6" fill="#06101e" text-anchor="middle" font-weight="700">100г</text>
  </g>
</svg>
`;

/** Kit-3 — Оптика: луч света через линзу с фокусом. */
const ICON_OPTICS = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" class="kit-icon-svg" aria-hidden="true">
  ${COMMON_DEFS}
  <!-- Линза (двояковыпуклая) -->
  <ellipse cx="40" cy="40" rx="6" ry="20" fill="url(#grad-teal)" stroke="currentColor" stroke-width="1.4" opacity="0.55"/>
  <!-- Луч слева -->
  <line x1="6" y1="40" x2="34" y2="40" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
  <!-- 3 преломлённых луча справа сходятся в фокус -->
  <line x1="46" y1="32" x2="74" y2="40" stroke="#ffbe0b" stroke-width="1.4" opacity="0.85"/>
  <line x1="46" y1="40" x2="74" y2="40" stroke="#ffbe0b" stroke-width="1.4" opacity="0.85"/>
  <line x1="46" y1="48" x2="74" y2="40" stroke="#ffbe0b" stroke-width="1.4" opacity="0.85"/>
  <!-- Точка фокуса -->
  <circle cx="74" cy="40" r="2.4" fill="#ffbe0b"/>
</svg>
`;

/** Kit-4 — Тепло: термометр с поднимающимся столбиком. */
const ICON_THERMAL = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" class="kit-icon-svg" aria-hidden="true">
  ${COMMON_DEFS}
  <!-- Корпус термометра -->
  <rect x="34" y="8" width="12" height="50" rx="6" fill="rgba(20,184,166,0.08)" stroke="currentColor" stroke-width="1.6"/>
  <!-- Резервуар -->
  <circle cx="40" cy="64" r="9" fill="url(#grad-gold)" stroke="#ffbe0b" stroke-width="1.4"/>
  <!-- Столбик (анимируется rise) -->
  <rect class="kit-icon-mercury" x="38" y="20" width="4" height="42" fill="#ffbe0b" opacity="0.9"/>
  <!-- Шкала -->
  <line x1="48" y1="16" x2="52" y2="16" stroke="currentColor" stroke-width="1" opacity="0.6"/>
  <line x1="48" y1="28" x2="50" y2="28" stroke="currentColor" stroke-width="1" opacity="0.4"/>
  <line x1="48" y1="40" x2="52" y2="40" stroke="currentColor" stroke-width="1" opacity="0.6"/>
  <line x1="48" y1="52" x2="50" y2="52" stroke="currentColor" stroke-width="1" opacity="0.4"/>
</svg>
`;

/** Kit-5 — Электричество: батарея с замкнутой цепью, ток течёт. */
const ICON_ELECTRIC = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" class="kit-icon-svg" aria-hidden="true">
  ${COMMON_DEFS}
  <!-- Контур цепи -->
  <rect x="14" y="20" width="52" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
  <!-- Батарея (плюс-минус) -->
  <line x1="22" y1="20" x2="22" y2="16" stroke="#ffbe0b" stroke-width="3"/>
  <line x1="30" y1="20" x2="30" y2="13" stroke="#ffbe0b" stroke-width="3"/>
  <!-- Резистор -->
  <path d="M50 60 L52 56 L56 60 L60 56 L64 60 L66 56" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  <!-- Точки тока (анимируется flow) -->
  <circle class="kit-icon-current kit-icon-current--1" cx="14" cy="40" r="2" fill="url(#grad-gold)"/>
  <circle class="kit-icon-current kit-icon-current--2" cx="40" cy="20" r="2" fill="url(#grad-gold)"/>
  <circle class="kit-icon-current kit-icon-current--3" cx="66" cy="40" r="2" fill="url(#grad-gold)"/>
  <circle class="kit-icon-current kit-icon-current--4" cx="40" cy="60" r="2" fill="url(#grad-gold)"/>
</svg>
`;

/** Kit-6 — Магнетизм: магнит с силовыми линиями. */
const ICON_MAGNETIC = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" class="kit-icon-svg" aria-hidden="true">
  ${COMMON_DEFS}
  <!-- U-магнит -->
  <path d="M22 16 L22 56 Q22 64 30 64 L34 64 L34 16 Z"
        fill="url(#grad-gold)" stroke="#ffbe0b" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M46 16 L46 64 L50 64 Q58 64 58 56 L58 16 Z"
        fill="rgba(20,184,166,0.6)" stroke="#14b8a6" stroke-width="1.6" stroke-linejoin="round"/>
  <!-- Силовые линии (анимируются flux) -->
  <g class="kit-icon-flux" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6">
    <path d="M30 14 Q40 4 50 14"/>
    <path d="M28 24 Q40 12 52 24"/>
    <path d="M28 66 Q40 78 52 66"/>
    <path d="M30 56 Q40 70 50 56"/>
  </g>
</svg>
`;

/** Kit-7 — Колебания: маятник на нити, размах туда-сюда. */
const ICON_OSCILLATION = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" class="kit-icon-svg" aria-hidden="true">
  ${COMMON_DEFS}
  <!-- Подвес -->
  <line x1="10" y1="10" x2="70" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="40" cy="10" r="2" fill="currentColor"/>
  <!-- Нить + груз (анимируется swing) -->
  <g class="kit-icon-pendulum" style="transform-origin: 40px 10px;">
    <line x1="40" y1="10" x2="40" y2="56" stroke="currentColor" stroke-width="1.2"/>
    <circle cx="40" cy="62" r="8" fill="url(#grad-gold)" stroke="#ffbe0b" stroke-width="1.4"/>
  </g>
  <!-- Траектория (dashed arc) -->
  <path d="M22 50 Q40 78 58 50" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 3" opacity="0.4"/>
</svg>
`;

// Mapping fixed to match kits.ts categories:
// Kit 1 = Гидростатика (mechanics), Kit 2 = Силы (mechanics, flagship),
// Kit 3 = Электрические цепи (electricity), Kit 4 = Оптика (optics),
// Kit 5 = Колебания и волны (mechanics), Kit 6 = Рычаги и блоки (mechanics),
// Kit 7 = Тепловые явления (thermal)
const ICONS_BY_KIT: Readonly<Record<number, string>> = {
  1: ICON_HYDROSTATICS,
  2: ICON_FORCES,
  3: ICON_ELECTRIC,
  4: ICON_OPTICS,
  5: ICON_OSCILLATION,
  6: ICON_MAGNETIC,
  7: ICON_THERMAL,
};

/** Получить inline SVG-строку для иконки конкретного kit'а. */
export function getKitIconSvg(kitNum: number): string {
  return ICONS_BY_KIT[kitNum] ?? '';
}
