---
paths:
  - "experiments/**/components/**/*.ts"
  - "experiments/**/*.svg"
---

# Web Components и рисование приборов

## Жёсткие конвенции

- Префикс `lab-*` обязателен.
- `attachShadow({ mode: 'open' })` всегда.
- `CustomEvent` всегда `composed: true`.
- ARIA-label НИКОГДА не палит ответ ученику.

## Где брать вдохновение

- **PhET Interactive Simulations** (Колорадо) — золотой стандарт
  школьной интерактивной физики. Шкалы, жесты, drag, читаемость.
  Особенно: PhET joist 2023 design.
- **Apple Education** — типографика, иерархия, ритм, белые/тёмные
  темы для дашбордов.
- **Tesla Configurator** — конфигуратор-сцена, hover/select состояния.
- **Linear / Stripe** — UI токены, motion, dark theme дисциплина.
- **Реальные приборы из паспорта ФИПИ** — фотографии в
  `.business/Продукты/.../`. Геометрия, пропорции, шкалы — копируем
  с физики, не выдумываем.

## SVG

Когда рисуешь SVG прибора — `paint-order: stroke` + контурная
обводка для контраста на любом фоне. Шкала: белая заливка + тёмный
stroke 0.6-0.9px. Ticks с `vector-effect: non-scaling-stroke`.

Эмодзи в UI приборов запрещены — только SVG-иконки и текст.

Дизайн-систему (палитры, типографика, токены) брать из
`experiments/2-1-spring/src/styles/tokens.css`.
