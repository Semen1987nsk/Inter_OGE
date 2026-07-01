# REFERENCE — Опыт 2.1 «Жёсткость пружины»

> **Зачем этот документ.** Это эталонный опыт для всей виртуальной лаборатории ЛАБОСФЕРА.
> Все следующие опыты делаются по тем же конвенциям. Любое отклонение — обоснованно
> и зафиксировано здесь же. Перед стартом нового опыта прочти **полностью**: на каждой
> грабле, описанной в «Уроках» и «Анти-паттернах», уже наступили — повторять не надо.

**Стек:** TypeScript 5.6 strict, Vite 6, Web Components (Shadow DOM), Vitest, Playwright.
**Платформа:** браузер (десктоп / iPad / интерактивная панель), 100% client-side, без сервера.
**Целевой пользователь:** ученик 9 класса РФ, готовится к ОГЭ по физике (ФИПИ-2026).

---

## Содержание

1. [Архитектура](#1-архитектура)
2. [Дизайн-система](#2-дизайн-система)
3. [Web Components — конвенции](#3-web-components--конвенции)
4. [Store — управление состоянием](#4-store--управление-состоянием)
5. [Drag & Drop](#5-drag--drop)
6. [Адаптивная сцена](#6-адаптивная-сцена)
7. [Анимации](#7-анимации)
8. [HintEngine, Stepper, Measurement-panel](#8-hintengine-stepper-measurement-panel)
9. [Физика и ФИПИ](#9-физика-и-фипи)
10. [A11y](#10-a11y)
11. [Тестирование](#11-тестирование)
12. [Анти-паттерны](#12-анти-паттерны)
13. [Definition of Done](#13-definition-of-done)
14. [Как поднять новый опыт по этому шаблону](#14-как-поднять-новый-опыт-по-этому-шаблону)
15. [Уроки опыта 2.2 «Трение скольжения»](#15-уроки-опыта-22-трение-скольжения)
16. [Архитектура «комплект как SPA» (PhET-style)](#16-архитектура-комплект-как-spa-phet-style)

---

## 1. Архитектура

### Граф зависимостей

```
                                ┌──────────────┐
                                │  index.html  │
                                └──────┬───────┘
                                       │
                                ┌──────▼───────┐
                                │   main.ts    │  собирает refs из DOM,
                                │              │  создаёт SpringExperiment
                                └──────┬───────┘
                                       │
                          ┌────────────▼────────────┐
                          │   SpringExperiment.ts   │  оркестратор:
                          │   (ExperimentRefs)      │  - держит Store
                          │                         │  - вызывает Drag/Hint
                          │                         │  - дёргает UI компоненты
                          └─┬──────┬────────┬───────┘
                            │      │        │
              ┌─────────────┘      │        └─────────────┐
              ▼                    ▼                      ▼
        ┌──────────┐      ┌────────────────┐      ┌──────────────┐
        │ Store<T> │      │ DragController │      │ HintEngine   │
        │ (state)  │      │ (PointerEvents,│      │ (текст в     │
        │          │      │  SnapZone[])   │      │  hint-bar +  │
        │          │      │                │      │  aria-live)  │
        └──────────┘      └────────────────┘      └──────────────┘

                          ┌─────────────────────────┐
                          │     UI components       │  рендерят SVG
                          │   (Shadow DOM, lab-*)   │  + интерактив
                          ├─────────────────────────┤
                          │  lab-stand              │  штатив
                          │  lab-spring-board       │  планшет с пружиной
                          │  lab-dynamometer        │  динамометр
                          │  lab-weight             │  готовый груз
                          │  lab-composite-weight   │  наборный груз (штанга/диск)
                          │  lab-equipment-card     │  карточка в правой панели
                          │  lab-graph              │  F(Δl) график
                          │  lab-tray               │  поднос (опц.)
                          │  lab-button             │  кнопка
                          │  lab-checkbox-preview   │  превью галочки
                          └─────────────────────────┘

                          ┌─────────────────────────┐
                          │   physics/  (pure)      │  никакого DOM,
                          │   - SpringModel.ts      │  только формулы.
                          │   - Measurement.ts      │  Покрыто Vitest 100%.
                          └─────────────────────────┘

                          ┌─────────────────────────┐
                          │   types/                │  единая истина:
                          │   - index.ts (общие)    │  EquipmentId, State,
                          │   - setup.ts (workflow) │  CONFIG-константы.
                          └─────────────────────────┘
```

### Файловая структура

```
experiments/2-1-spring/
├── index.html                     # точка входа: разметка scene + equipment-panel
├── package.json                   # vite, vitest, playwright
├── vite.config.ts                 # alias '@/' → 'src/'
├── tsconfig.json                  # strict + bundler resolution
├── playwright.config.ts           # baseURL, проекты desktop/mobile
├── REFERENCE.md                   # ← вы здесь
│
├── public/                        # статика (favicon, иконки)
│
└── src/
    ├── main.ts                    # bootstrap: import-styles → собирает refs → new SpringExperiment(refs)
    ├── SpringExperiment.ts        # оркестратор (главный файл, ~1100 строк)
    ├── i18n/ru.ts                 # тексты (если будет EN — добавим en.ts)
    │
    ├── controller/                # доменные сервисы (без DOM-рендеринга)
    │   ├── Store.ts               # immutable Store<T> + subscribe
    │   ├── DragController.ts      # pointer drag + snap zones
    │   └── HintEngine.ts          # тексты подсказок
    │
    ├── physics/                   # pure-функции (тестируются в Vitest)
    │   ├── SpringModel.ts         # F=k·Δl, dampedOscillation, ...
    │   ├── Measurement.ts         # createMeasurement, leastSquaresThroughOrigin
    │   └── __tests__/
    │       ├── SpringModel.test.ts
    │       └── Measurement.test.ts
    │
    ├── types/
    │   ├── index.ts               # SpringId, Measurement, ComputedResults, VALID_K_RANGE, G
    │   └── setup.ts               # SpringSetupState, EquipmentId, AttachKind, INITIAL_SETUP_STATE
    │
    ├── ui/
    │   └── components/            # Shadow-DOM web-components с префиксом lab-*
    │       ├── lab-stand.ts
    │       ├── lab-spring-board.ts
    │       ├── lab-dynamometer.ts
    │       ├── lab-weight.ts
    │       ├── lab-composite-weight.ts
    │       ├── lab-equipment-card.ts
    │       ├── lab-graph.ts
    │       ├── lab-tray.ts
    │       ├── lab-button.ts
    │       └── lab-checkbox-preview.ts
    │
    ├── view/                      # вспомогательные view-helpers (если нужны)
    │   └── SpringStage.ts
    │
    └── styles/
        ├── tokens.css             # CSS-переменные (палитра, типографика, отступы)
        ├── reset.css              # минимальный normalize
        ├── components.css         # стили равно для нескольких компонентов
        └── experiment.css         # layout сцены, measurement-panel, оборудование

e2e/                              # Playwright
├── spring-experiment.spec.ts
└── a11y.spec.ts
```

### Data flow (упрощённо)

1. Пользователь начинает drag карточки → `DragController.startDrag` → элемент перемещается в `drag-overlay` (`position: fixed`).
2. Hover над snap-зоной → `SnapZone.onHover(true)` → CSS-подсветка drop-zone.
3. Drop → `SnapZone.onDrop(payload)` → `SpringExperiment.#attachX()` → меняет DOM (mounting в `#hungStack`) и Store (`#store.set({...})`).
4. Store уведомляет (через `subscribe`) → `#refreshUi()` → пересборка stepper / measurement-panel / overload-banner / shape пружины.
5. Если подвешен груз → `#startOscillation()` → RAF-цикл вызывает `#applyDisplayedExtension()` → выставляет атрибут `extension` пружине → Shadow DOM пружины перерисовывает витки.
6. После `#updateChainPositions()` → `#adaptStandToChain()` сравнивает низ цепочки с зоной висения штатива → меняет `rod-extra` → штатив физически удлиняет стержень.

### Один оркестратор vs много контроллеров

`SpringExperiment.ts` намеренно сделан большим (~1100 строк). **Не дробим** на 10 мелких классов — это привело бы к запутанному обмену состоянием через события. Один оркестратор + несколько pure-сервисов (`Store`, `DragController`, `HintEngine`) держит сценарий в голове целиком. Когда оркестратор подойдёт к 2000 строк — рефакторим, не раньше.

---

## 2. Дизайн-система

### 2.1. Палитра ([src/styles/tokens.css](src/styles/tokens.css))

**Бренд:** глубокий синий фон (`#0d1b2a` ← `#0a1530`), бирюзовый акцент (`#38bdaf`), оранжевый CTA (`#ffbe0b`), зелёный success (`#10b981`), янтарный warning (`#f59e0b`), красный error (`#ef4444`).

**Семантика физических величин (PhET-стандарт):**

| Токен | Цвет | Что значит |
|---|---|---|
| `--phys-force-applied` | `#f2811d` | приложенная сила, F=mg |
| `--phys-force-spring` | `#2e6fb8` | сила упругости |
| `--phys-displacement` | `#2ba84a` | удлинение Δl |
| `--phys-equilibrium` | `#4a7fb8` | пунктир «исходная длина» |
| `--phys-active` | `#f2c94c` | подсветка активного |

**Реальное оборудование** (палитра подобрана под фото комплекта №2 ФИПИ — `kit-02-forces.png`):
- `--equip-board` (#1e5ba8) — корпус планшета пружины (синий)
- `--equip-metal-shine/light/.../shadow` — хром штатива и пружин (5 оттенков)
- `--equip-stand-base` (#1a1b1f) — массивное чёрное основание
- `--equip-pointer` (#e63946) — красная риска-указатель
- `--equip-dyno-body` (#f5c842) — корпус динамометра (жёлтый)
- `--equip-snap-active` (#f2c94c) — золотое сцепление-подсветка

**Правило:** виртуальный прибор должен визуально совпадать с тем, что школьник держит в реальном комплекте на ОГЭ. Не выдумываем новые цвета — берём из фото.

### 2.2. Типографика

- `--font-display: 'Space Grotesk', 'Inter', system-ui` — заголовки, подписи, бейджи.
- `--font-body: 'Inter', system-ui` — по умолчанию.
- `--font-mono: 'JetBrains Mono', 'Consolas'` — числа в журнале и шкалах.

**Размеры (rem-based, 8px-grid):** display 56px / h1 36px / h2 24px / h3 20px / body 16px / sm 14px / xs 12px.

### 2.3. Отступы, радиусы, тени, анимация

8px-grid: `--space-1..--space-24`. Радиусы: `sm 4` / `md 8` / `lg 12` / `xl 16` / `pill 9999`. Тени: `sm/md/lg/xl` плюс `glow-blue/orange/green`. Easing: `--ease-out (0.2,0.8,0.2,1)`, `--ease-spring (0.34,1.56,0.64,1)`. Длительности: `fast 150ms / base 250ms / slow 400ms / spring 600ms`.

**`@media (prefers-reduced-motion: reduce)`** — все длительности в `tokens.css` обнуляются глобально + анимации в `experiment.css` отключаются по компонентам.

### 2.4. Layout сцены (PhET-стиль)

- Двухколоночный grid: **сцена** (1fr) + **equipment-panel** (280..420px).
- Сцена внутри себя содержит **штатив** (плотно слева на ≥1280px) + **floating measurement-panel** (правый нижний угол).
- На ≤1279px стэк: штатив сверху, panel снизу.
- На ≤1023px: equipment-panel переходит в горизонтальную ленту снизу.
- На ≤767px: header в три строки, всё в один столбец.

Журнал/график **не занимают постоянную колонку** — это важная PhET-конвенция: «сцена доминирует, измерения — opt-in оверлей».

### 2.5. «Угловые скобки» сцены

Декоративные `.stage-corner--tl/--tr/--bl/--br` — четыре уголка-«фреймера» в стиле технического чертежа. Психологически замыкают рабочее поле, отделяют сцену от фона. Стандарт для всех опытов.

### 2.6. Графика приборов

Все приборы рисуются **SVG в Shadow DOM**. Не Canvas. Причины:
1. Резкие линии и текст на любом DPI (учительская доска 4K).
2. CSS-переменные доступны изнутри SVG → одна палитра на всё.
3. ARIA-friendly: можно добавить `<title>`/`<desc>`.
4. Тестируется через DOM-запросы (Playwright/Vitest).

**Композиция типового прибора:**
- Корпус (rect с `stroke`).
- Прозрачное окно (с тонким бордером).
- Шкала: цифры моноширинным шрифтом, основные деления `stroke-width 0.9`, через 5 — `0.6`, обычные — `0.4`. Двойная шкала (слева+справа) для удобства считывания.
- Указатель: красная горизонтальная риска через всё окно + треугольные носики по бокам (стандарт реальных приборов).
- Hover-индикатор: пунктирная линия `stroke-dasharray 2 1.5` + бейдж с цифрой (оранжевый, `--color-brand-orange`).
- Reading-mark: толстая синяя риска (`#0d6efd`) с подписью `l₀`/`l₁` слева и значением справа.
- Метки крюков: эллипсы, тень снизу, блик сверху.

**Не использовать emoji в SVG.** В RU-школьных интерфейсах — только текст, никаких звёздочек/эмодзи.

---

## 3. Web Components — конвенции

### 3.1. Именование

- **Префикс `lab-`** — обязателен для всех. Защищает от коллизий со сторонними библиотеками и сразу видно «это наше».
- Имя файла = имя кастом-элемента (`lab-spring-board.ts` → `<lab-spring-board>`).

### 3.2. Контракт

```ts
class LabXxx extends HTMLElement {
  static observedAttributes = ['attr-1', 'attr-2'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });    // всегда open — для тестов и DevTools
    // shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void { /* первый mount */ }
  attributeChangedCallback(name: string): void { /* реакция на attr */ }

  // Геометрический контракт для drag-and-drop:
  getTopHookY?(): number;             // Y верхнего крюка в host-px
  getWeightHookY?(): number;          // Y нижнего крюка в host-px
  getTopHookPosition?(): { x; y };
  getWeightHookPosition?(): { x; y };

  // Custom events: ВСЕГДА с composed: true (иначе не пробьются через Shadow DOM)
  dispatchEvent(new CustomEvent('xxx', { detail, bubbles: true, composed: true }));
}

customElements.define('lab-xxx', LabXxx);
```

### 3.3. Атрибуты vs свойства

- **Атрибуты** — для значений из HTML и тестируемого state (`extension`, `force`, `spring-id`, `range`, `interactive`, `attached`, `dragging`).
- **Свойства** — для richer данных (`measurements: Measurement[]`, `data: { ... }`).
- Атрибут синхронизируется с свойством через `observedAttributes` + `attributeChangedCallback`.

### 3.4. Геометрический API (важно для drag-chain)

Каждый прибор, который висит на крюке, обязан реализовать:
- `getTopHookY(): number` — Y координата верхней петли (в host-px). Используется `#updateChainPositions` чтобы выровнять `top` wrapper'а так, чтобы крюк прибора совпал с нижней петлёй предыдущего звена.
- `getWeightHookY(): number` — Y координата нижней петли (где крепится следующее звено).

Эти значения **должны учитывать текущее состояние** (растянутая пружина → нижний крюк ниже).

### 3.5. Click-through и атрибут `attached`

`DragController` НЕ начинает drag, если на элементе стоит атрибут `attached` (его ставит оркестратор в `#mountInStack`). Это критично: иначе клик по шкале пружины перехватывается контроллером и не доходит до scale-area внутри Shadow DOM. **Все интерактивные приборы на сцене обязаны иметь `attached`.**

### 3.6. ARIA

- `aria-label` на host-элементе. **Ни в коем случае НЕ включать в него правильный ответ** (никакого «Пружина k=50 Н/м» — иначе скринридер прочтёт ученику). Только нейтральное описание: «Пружина №1, миллиметровая шкала 0–100 мм».
- Динамические сообщения через отдельный `<div role="status" aria-live="polite" class="sr-only">` (не через aria-label, который не всегда читается при изменении).
- Focus-ring: SVG-рамка, `opacity: 0` по умолчанию, `opacity: 1` на `:host(:focus-visible)`.

---

## 4. Store — управление состоянием

[src/controller/Store.ts](src/controller/Store.ts) — **40 строк**, без зависимостей.

```ts
const store = new Store<SpringSetupState>(INITIAL_SETUP_STATE);

store.get();                                  // Readonly<T>
store.set({ measurementStep: 'reading-l1' }); // частичный patch (immutable)
store.update(s => ({ weights: [...s.weights, w] }));
const unsub = store.subscribe(state => { ... });
```

**Принципы:**
- **Один Store на опыт.** Не дробим. Если очень хочется второй — это сигнал «надо разделить опыт на два».
- **State — immutable.** Каждый `set` делает `{...state, ...patch}`.
- **Не подписываемся внутри компонентов.** Только оркестратор подписан → он сам зовёт нужные `#refreshXxx()` для UI частей. Это держит компоненты «глупыми» (passive).
- **Единая истина состояния — Store.** DOM-узлы (`#attachedSpringEl` и т.п.) — кеш для производительности, обязаны быть синхронны со Store.

### Конвенция полей State

- `stage: AssemblyStage` — крупная фаза (empty / spring-attached / measuring).
- `measurementStep: MeasurementStep` — фаза текущего измерения (idle / reading-l0 / l0-recorded / reading-l1 / ready-to-record).
- Подвешенные сущности — отдельные поля (`spring`, `dynamometer`, `weights[]`), потому что у каждого свой жизненный цикл.
- `displayedExtensionMm` — анимируется через RAF, не отражает «равновесное» значение во время колебаний.
- Все дефолты — в одной константе `INITIAL_SETUP_STATE`. `reset()` использует её же.

---

## 5. Drag & Drop

[src/controller/DragController.ts](src/controller/DragController.ts) — универсальный pointer-drag, не привязан к опыту.

### 5.1. Концепты

- `DragController` — singleton на опыт, конструктор принимает `overlay: HTMLElement` (контейнер `position: fixed`, в который во время drag перемещается элемент).
- `SnapZone` — описывает «куда можно бросить»: `id`, `accepts: AttachKind[]`, `getRect()`, `snapRadius`, `onHover(active)`, `onDrop(payload) → boolean`.
- `Draggable` — элемент с `attach(el, options)`. Получает `pointerdown` слушатель + keyboard fallback (`Enter`/`Space` → телепорт в первую совместимую зону).

### 5.2. Жизненный цикл drag

1. `pointerdown` → если есть атрибут `attached` или активен другой drag → ignore.
2. Снимаем pending return-анимацию для этого элемента (если была).
3. `setPointerCapture` + перенос в overlay (`position: fixed`, координаты от `getBoundingClientRect`).
4. `pointermove` (window) → обновляем позицию + обходим `#zones` → подсветка под указателем.
5. `pointerup` (window) → если есть hoverZone → `onDrop()`. Если `true` — accepted. Иначе — анимированный возврат в homeRect.
6. Возврат через WAAPI 320ms `cubic-bezier(0.34, 1.4, 0.64, 1)`. Регистрируем `pendingReturn` — иначе при быстром повторе drag элемент остаётся в overlay (баг был, наказан).

### 5.3. Контракт snap-зоны

```ts
const zone: SnapZone = {
  id: 'spring-hook',
  accepts: ['spring'],
  getRect: () => this.#dropZoneSpring.getBoundingClientRect(),
  snapRadius: 100,
  onHover: (active) => {
    this.#dropZoneSpring.classList.toggle('drop-zone--active', active);
  },
  onDrop: ({ element, equipmentId }) => {
    return this.#attachSpring(element as LabSpringBoard, equipmentId);
  },
};
this.#drag.addSnapZone(zone);
```

### 5.4. UI consistency invariant (важный урок!)

Drop-zone **подсвечивается** = drop **должен** проходить. Если визуально показываем «можно сюда», а handler возвращает `false` — это баг (ученик психологически уверен что попал).

**Гарантия инварианта:**
- `accepts` массив + `dynoCanGoToBottom()`/etc helpers → используются и для подсветки drop-zone (`refreshBottomHookZone()`), и внутри `onDrop` handler. Один источник истины.
- В тестах (UI consistency category): для каждого drag-сценария проверяем `if drop-zone visible → drop OK`.

### 5.5. Драг-overlay

`<div id="drag-overlay">` — единственный fixed-контейнер, `inset: 0`, `pointer-events: none` (overlay сам), но `pointer-events: auto` для прямых детей. Это обязательно: иначе клики «провалятся» сквозь overlay, и нельзя будет перетащить.

---

## 6. Адаптивная сцена

Главный паттерн: **приборы фиксированного pixel-размера, штатив адаптивного**. Шкалы остаются читаемы при любом сценарии. История этого решения, варианты и tradeoffs см. в [TEST_PLAN.md](tests/TEST_PLAN.md) (обсуждение «зум камеры vs scrollable scene»).

### 6.1. Адаптивный штатив ([src/ui/components/lab-stand.ts](src/ui/components/lab-stand.ts))

- SVG строится функцией `buildSvg(rodExtra)` — viewBox растёт, базовые элементы (основание, цоколь крепления) сдвигаются на `rodExtra` единиц вниз, стержень удлиняется на ту же величину.
- Атрибут `rod-extra` (число SVG-юнитов). Property `stand.rodExtra` (geter/setter).
- Хост-CSS: `aspect-ratio: 240 / (480 + rod-extra)` выставляется inline через style — браузер сам считает height по width.
- Шкала px/SVG-юнит сохраняется константной (host width не меняется), поэтому `getHookPosition().y` возвращает то же значение независимо от `rodExtra`.

### 6.2. Скроллируемый контейнер сцены

`.stand-container { height: 100%; overflow-y: auto; scroll-behavior: smooth; }` + кастомный thin teal scrollbar (тонкий, бирюзовый). На WebKit — стилизация через `::-webkit-scrollbar`.

### 6.3. `#adaptStandToChain(chainBottomLocalPx)` ([SpringExperiment.ts](src/SpringExperiment.ts))

После каждого `#updateChainPositions`:
1. Считаем низ цепочки в SVG-координатах = `HOOK_SVG_Y + chainBottomLocalPx / pxPerSvgY`.
2. Желаемый `rod-extra` = `max(0, chainBottomSvgY + 30 − ROD_BOTTOM_DEFAULT)`.
3. **Гистерезис 8 SVG-юнитов** — иначе на каждом тике колебаний штатив будет дрожать.
4. Если изменилось — `stand.rodExtra = newValue` → SVG перерисовался → на след. кадре пересчитываем `mountPosition` и `dropZonePositions`.

### 6.4. Overload pattern (когда физика выходит за рамки UI)

Когда указатель пружины ушёл бы за нижний край шкалы (`restLengthMm + extension > 100`):
- **Визуал клампится:** `getWeightHookPosition` использует `min(SCALE_MM_TOTAL - restLengthMm, ext)`. Грузы прицепляются к визуальному концу пружины, не к «реальному» (иначе висят в пустоте).
- **Зигзаг-разрыв** между концом пружины и штоком — символ из инженерных чертежей «здесь сжато для масштаба» + лейбл «за шкалой».
- **Soft-warning баннер** в верхней части сцены: «Указатель ушёл за шкалу (положение ≈ X мм при шкале 0–100). Для пружины №2 используйте наборный груз 60–80 г.» Не блокируем — это педагогически правильно (пусть ученик сам убедится, что для k10 нужны лёгкие грузы).

**Принцип:** не врать ученику. Не делать auto-zoom (убивает читаемость), не запрещать комбинацию (ребёнок не понял почему). Всегда оставлять взрослый «выход»: показал предупреждение, разрешил действие, объяснил.

### 6.5. Авто-скролл — НЕ делаем

Сначала был добавлен авто-скролл к низу цепочки. Проверка показала, что он **прячет указатель пружины** (главное, что должно быть видно). Убран. Пользователь скроллит сам колесом мыши, если интересно посмотреть низ.

### 6.6. Адаптив по экранам

| Брейкпоинт | Ширина | Что меняется |
|---|---|---|
| ≥1600px | Smart Board, домашний 16″+ | две колонки, measurement-panel шире |
| 1280–1599 | учительский ноут, проектор | стандарт |
| 1024–1279 | iPad landscape | сцена + measurement-panel стэкируются вертикально |
| ≤1023 | iPad portrait | equipment-panel становится горизонтальной лентой снизу |
| ≤767 | телефон | header в три строки, всё в один столбец |

### 6.7. Drag-overlay не клипуется

`#drag-overlay` — глобальный `position: fixed` контейнер вне `.workbench-stage` (у которого `overflow: hidden`). Иначе drag-элемент исчезает на границах сцены.

---

## 7. Анимации

### 7.1. Затухающие колебания пружины

Формула ([physics/SpringModel.ts:dampedOscillation](src/physics/SpringModel.ts)):

```
x(t) = A · exp(−damping·t) · cos(ω·t)
ω = √(k/m)
duration_until_1pct = −ln(0.01) / damping ≈ 4.6 / damping
```

**Дефолт:** `damping = 0.15` (физическое ощущение «настоящей пружины»). В оркестраторе используем `damping = 1.6` (эстетика — не хочется ждать долго).

**Edge case:** при пустой пружине (`weights.length === 0`) `m = 0` → `ω = ∞` → `NaN`. Решение: подставляем `massForFreqKg = 0.1` как fallback. Физически: пустая пружина возвращается в покой почти мгновенно, такая «эталонная» масса даёт визуально естественную короткую анимацию.

### 7.2. RAF-цикл и cleanup

```ts
#startOscillation(): void {
  if (this.#oscillationRafId !== null) cancelAnimationFrame(this.#oscillationRafId);
  // ... setup ...
  const tick = (now: number): void => {
    if (elapsed > duration) { /* финал */ this.#oscillationRafId = null; return; }
    // ... compute, apply ...
    this.#oscillationRafId = requestAnimationFrame(tick);
  };
  this.#oscillationRafId = requestAnimationFrame(tick);
}

#stopOscillation(): void {
  if (this.#oscillationRafId !== null) {
    cancelAnimationFrame(this.#oscillationRafId);
    this.#oscillationRafId = null;
  }
  this.#store.set({ oscillationStartTime: null, displayedExtensionMm: 0 });
  this.#applyDisplayedExtension();
}
```

**Правила:**
- **Один RAF id на анимацию.** Перед стартом нового — отменить старый (иначе будет два цикла).
- **Reset обязан вызывать `cancelAnimationFrame`.** Иначе после reset() пружина продолжит «колебаться» ещё ~3 секунды на пустом DOM.
- **Прерывание оскилляции при detach.** При снятии груза снова стартуем колебание (новое равновесие или возврат в 0).

### 7.3. Симметричное тестирование (urok 2!)

```
attach(weight) → animate to equilibrium  ✓
detach(weight) → animate back to 0       ← забыли в первой версии, пружина оставалась растянутой
```

Первая версия `#startOscillation` имела `if (weights.length === 0) return;` — раннее завершение. Тестов на «после detach пружина возвращается в покой» не было. Урок зафиксирован в [TEST_PLAN.md](tests/TEST_PLAN.md), property-инвариант **PI-1**.

### 7.4. CSS-анимации для UI

- `record-pulse` — пульсация кнопки «Записать в журнал» когда оба значения сняты.
- `scale-attention` — золотое свечение планшета пружины, когда нужно кликнуть по шкале.
- `snap-target-pulse` — золотое кольцо вокруг нижнего крюка целевого элемента при drag совместимого предмета.
- `drop-zone-pulse` — пульсация drop-зоны (в idle).
- `overload-banner-in` — въезд баннера сверху.

Все обёрнуты в `@media (prefers-reduced-motion: reduce) { animation: none }`.

---

## 8. HintEngine, Stepper, Measurement-panel

Три универсальных UX-паттерна. Используем во всех опытах.

### 8.1. HintEngine ([src/controller/HintEngine.ts](src/controller/HintEngine.ts))

**Назначение:** одна короткая подсказка в `hint-bar`, обновляется в реакции на state.

```ts
const hints = new HintEngine(hintBarEl, liveRegionEl);
hints.update(state);                   // тихое обновление (если изменилось)
hints.flash('Сначала подвесьте...');   // временное (2.4s) сообщение, ярко-янтарное
```

- `update()` — детерминированная функция от state → строка. Если строка не изменилась — DOM не трогается (нет лишних reflow).
- `flash()` — переопределяет `update()` на 2.4 секунды. Дублируется в aria-live (для скринридеров).
- **Не ругаться.** Подсказки — позитивные («Закрепите пружину», «Можно подвесить ещё»). Никаких «Ошибка», «Запрещено».

### 8.2. Stepper

5 шагов в шапке `workbench-header`:
1. Закрепите пружину
2. Запишите l₀ (клик по шкале)
3. Подвесьте груз
4. Запишите l₁ (клик по шкале)
5. В журнал

Состояния шагов через `data-state="active|done"`: активный — бирюзовый scale 1.04 + лёгкая пульсация; завершённый — зелёный с галочкой; будущий — приглушённый серый.

`#refreshStepper()` пересчитывает состояния по текущему State. Один источник истины.

### 8.3. Measurement-panel (PhET-стиль floating)

Панель в правом нижнем углу сцены (на ≥1280px). Содержит:
- Заголовок-toggle «Журнал измерений» + бейдж счётчик + кнопка «Записать в журнал».
- Body: пустое состояние (placeholder) → таблица + результат + график.

`aria-collapsed="true|false"` управляет видимостью body. По умолчанию развёрнута. Ученик может свернуть, если мешает смотреть на установку.

На ≤1279px перестаёт floating'овать → стэк под штативом.

`data-state="empty|has-data"` — для разной background-плотности.

### 8.4. Overload-banner (наш новый UX-паттерн)

Один `<div id="overload-banner" role="status" aria-live="polite" hidden>` в верхней части сцены. Используем для **мягких педагогических предупреждений**: «вы вышли за рамки этого опыта/прибора, но мы вас не блокируем». Янтарный цвет, иконка треугольник-восклицание, `pointer-events: none`. Контент пишется через JS (`text.textContent = ...`).

**Когда использовать:**
- Указатель за шкалой.
- Превышен максимальный диапазон динамометра (стрелка упёрлась).
- Выбрана несовместимая пара оборудования (но мы всё равно даём попробовать).

**Когда НЕ использовать:**
- Жёсткие запреты (просто блокируем, без баннера, через `hints.flash()`).
- Мгновенные ошибки в одном клике (`hints.flash()`).

---

## 9. Физика и ФИПИ

### 9.1. Стандарты

- **`G = 9.8`** (РФ-школа). Не 9.81. Зафиксировано в [src/types/index.ts](src/types/index.ts) как `export const G = 9.8 as const`.
- **Единицы во всех формулах:** масса — граммы (на интерфейсе) и килограммы (в физике-функциях); сила — ньютоны; длина — миллиметры (шкалы) и метры (формулы).
- **Конверсии — на границе**: `massToForce(g) → N` сама делит на 1000, `forceToExtension → cm` сама умножает на 100. Все физические формулы внутри работают в СИ.

### 9.2. ФИПИ-2026 спецификация

Источник истины: [.business/Продукты/Програмное обеспечение/Виртуальная лаборатория по физике ОГЭ/ФИ-9 ОГЭ 2026_СПЕЦ.pdf](../../../../Users/Administrator/ООО ЛАБОСФЕРА/.business/Продукты/Програмное обеспечение/Виртуальная лаборатория по физике ОГЭ/ФИ-9 ОГЭ 2026_СПЕЦ.pdf).

- **Комплект №2:** пружина k=(50±2) Н/м (паспорт). Зафиксировано как `VALID_K_RANGE = { min: 48, max: 52 }`.
- **Грузы:** 3 × 100г готовых + наборный (штанга 10г + диски 10/20/50г). В нашем коде — точно эти id (`w-100-1..3`, `rod`, `disc-10/20/50`).
- **Динамометры:** 1Н (С=0.02 Н) и 5Н (С=0.1 Н).
- **Пружины:** в реальном комплекте одна (k50). Мы добавили вторую (k10) как «mystery» для дополнительного задания на сравнение жёсткостей.

### 9.3. Метод наименьших квадратов через начало координат

```
F = k · Δl  (закон Гука)
y = a · x   (через начало, поскольку F(0)=0)
a = Σ(x_i · y_i) / Σ(x_i²)
```

Реализация: [physics/Measurement.ts:leastSquaresThroughOrigin](src/physics/Measurement.ts).

В журнал записываются `{m, F, l, Δl, k}` для каждой точки. На графике — точки + аппроксимация-прямая через 0.

### 9.4. Куда складываем pure-физику

Всё в `src/physics/`. Никакого DOM, никакого Store. Только числа → числа. Покрытие Vitest близко к 100%. Это позволяет:
- Менять формулы без страха сломать UI.
- Использовать те же функции в фуззере (для проверки UI-инвариантов: «динамометр показывает m·g»).

---

## 10. A11y

WCAG 2.1 AA — обязательно. Проверяется автоматически (axe-core в Playwright) + ручная клавиатурная сессия перед релизом.

### 10.1. Семантика

- Заголовок страницы (`<title>` + h1 в .experiment-title).
- Header с `role="banner"`, main с `aria-label`, asides с `aria-label`.
- Stepper — `<ol>` с `aria-label="Этапы измерения"`.
- Кнопки — `<button type="button">`, ВСЕГДА с `aria-label` если только иконка.

### 10.2. Контраст

- Текст на тёмном фоне: основной `--color-text-primary` (#e0e1dd) на `--color-bg-deep` (#0d1b2a) ≈ 11:1 (AAA).
- `--color-text-muted` (#8a93a0) на `--color-bg-surface` (#1b263b) ≈ 4.9:1 (AA passes). **Не использовать `#6b7280` — он 3.13:1, fails.**
- Цвета успеха/ошибки/предупреждения — всегда дублированы текстом или иконкой (не только цветом).

### 10.3. Клавиатура

- Все интерактивные элементы достижимы Tab.
- Focus-ring видим (или `outline: 2px solid var(--color-brand-orange); outline-offset: 2px`).
- Drag-and-drop имеет keyboard fallback (`Enter`/`Space` на карточке → телепорт в первую совместимую snap-зону).
- Карточки оборудования — `tabindex="0"`, focus-ring через CSS.

### 10.4. Screen readers — НЕ палить ответ

**Никогда** не включать ожидаемое значение в ARIA-label или текст подсказки:
- ❌ `aria-label="Пружина k=50 Н/м"` — скринридер прочитает ученику k.
- ✅ `aria-label="Пружина №1, миллиметровая шкала 0–100 мм"`.
- ❌ Подсказка «Ожидаемая жёсткость 50 Н/м, проверьте свой результат».
- ✅ «Жёсткость рассчитывается. Проведите ещё одно измерение для проверки.»

Всё, что палит ответ — только в `result-panel` после нажатия «Записать в журнал».

### 10.5. aria-live

`<div id="live-region" role="status" aria-live="polite" aria-atomic="true" class="sr-only">` — глобальный sr-only. Оркестратор пишет в него короткими ёмкими фразами при ключевых событиях:
- «Пружина №1 закреплена на штативе.»
- «Записано начальное положение l₀ = 30 мм. Подвесьте груз.»
- «Подвешен груз 100 грамм. Дождитесь конца колебаний.»

Не злоупотреблять — иначе скринридер «не замолкает».

### 10.6. prefers-reduced-motion

- В `tokens.css` обнуляются длительности.
- В `experiment.css` все `animation: ...` дублируются `@media (prefers-reduced-motion: reduce) { animation: none }`.
- В `dampedOscillation` JS: если `matchMedia('(prefers-reduced-motion: reduce)').matches` — пропускаем колебания, ставим финальное значение сразу.
- В DragController: возврат при промахе — мгновенный (`duration = 0`).

---

## 11. Тестирование

**Принцип:** «Если ученик может это сделать — у нас должен быть тест.» Если тест пропустил баг — это **отсутствующий класс инвариантов**, а не «неудачный запуск». Урок добавляется в [tests/TEST_PLAN.md](tests/TEST_PLAN.md).

### 11.1. Шесть категорий

См. [tests/TEST_PLAN.md](tests/TEST_PLAN.md) — полный документ. Кратко:

1. **Unit-тесты физики** (Vitest, 100% покрытие `src/physics/`).
2. **API-фуззер** (random sequences of attach/detach/click → инварианты после каждой 11–17й итерации, 3000+ итераций).
3. **Deterministic state-machine** (минимум 70 случаев из спеки: «attach spring при дин-на-штативе → false», «detach среднего груза → снимает всё ниже», и т.п.).
4. **UI consistency** (drop-zone visible ⇔ drop accepted; для каждой пары kind/состояние).
5. **Real drag** (PointerEvents simulation, scale-area click-through).
6. **A11y / perf / memory** (axe-core, нет утечек wrapper'ов после reset, оскилляция не оставляет RAF).

### 11.2. Property invariants (PI)

Самое важное. Проверяются на КАЖДОМ шаге фуззера, а не на конкретных сценариях.

| ID | Инвариант | Что ловит |
|----|-----------|-----------|
| PI-1 | `displayedExtensionMm == equilibriumExtensionMm` после стабилизации | Spring не возвращается в покой при detach (наш баг) |
| PI-2 | `dynamometer.force == m·g` после стабилизации (если груз на дин) | Расхождение физики дин и реальности |
| PI-3 | `attach + detach == initial state` (round-trip) | Асимметрия операций (forward работает, reverse — нет) |
| PI-4 | `forall reachable state s: s.weights ⊆ available_weights` | Дубли / mystery items |

Добавить новый PI = 5 строк кода в фуззере. Каждый найденный баг → новый PI, чтобы не повторился.

**Расширенная методология после опыта 2.2** — см. [раздел 15.5](#155-property-fuzzing--методология-12-категорий-50-000-итераций) и [15.6](#156-state-machine-тесты-с-реальным-dom-happy-dom). Минимум для нового опыта:

- `__tests__/comprehensive-fuzzer.test.ts` — 12+ категорий PI (Phys, Mono, Edge, Round, Sum, Combo, Agg, RT, Noise, FIPI, ...) × 300-1500 итераций = **~25 000+ итераций** на опыт.
- `__tests__/state-machine.test.ts` — DOM-based round-trip + комбинаторика всех валидных последовательностей.
- `physics/__tests__/<Model>.test.ts` — детерминированные unit-тесты, 100% coverage `src/physics/`.

Опыт 2.2 закрыли 162 теста / ~55 000 ситуаций / 0 багов.

### 11.3. Уроки из найденных багов

(Полный список в TEST_PLAN.md, здесь — заглавия.)

- **Урок 1: UI/логика mismatch.** Drop-zone подсвечивалась, drop отказывал. Фуззер проверял только return value, не парность подсветки и результата.
- **Урок 2: Асимметричное тестирование.** `attach → check value` ≠ `attach → detach → check returned to initial`. Reverse-направление — самые коварные баги.
- **Урок 3: Куда смотреть.** Не только DOM-структура и API-результаты — но и **физическое состояние атрибутов** (`extension`, `force`).

### 11.4. E2E (Playwright)

`e2e/spring-experiment.spec.ts` — 6 базовых сценариев (smoke, single attach, three measurements, delete row, switch spring, mobile touch). Не дублируем с фуззером — только основные user journeys.

`e2e/a11y.spec.ts` — axe-core scan на всех ключевых state'ах.

### 11.5. Команды

```bash
npm run dev         # vite, обычно :5173..5176
npm run typecheck   # tsc -b --noEmit (нужен NODE_OPTIONS=--max-old-space-size=4096)
npm test            # vitest run
npm run test:watch
npm run test:coverage
npm run test:e2e    # playwright
npm run lint        # eslint
npm run format      # prettier
```

### 11.6. Программный API для тестов

В оркестраторе сделан публичный API — `attachSpringById`, `attachDynamometerById`, `attachWeightById`, `recordScaleClick`, `recordMeasurement`, `reset`. Главная инстанса экспортируется в `window.springExperiment` для отладки и Playwright. **Эти методы — единственная точка входа для автотестов**, не пытаться эмулировать DOM-events. Они:
- Возвращают `boolean` для операций attach (true=accepted, false=rejected).
- Не содержат UI-логики — только бизнес-операции.
- Совпадают с тем, что делают drag-handlers и keyboard fallback.

---

## 12. Анти-паттерны

Чего **НЕ делаем**, основано на пройденных ошибках:

### 12.1. Архитектурные

- **Не делать auto-zoom камеры сцены.** Цифры шкалы становятся нечитаемы. Используем фикс-pixel приборы + scrollable scene + adaptive stand.
- **Не делать «умные» drop-зоны, которые догадываются что бросили.** `accepts: AttachKind[]` — единая истина. Если зона приняла, она ВСЕГДА должна принять (UI consistency invariant).
- **Не дробить оркестратор на 10 контроллеров «для красоты».** Один большой `SpringExperiment.ts` лучше, чем 10 мелких с обменом через события. Граница — ~2000 строк.
- **Не использовать общий код из `experiments/shared/` или `experiments/kit2/`** — это легаси v1 (vanilla JS). Новые опыты не зависят от него.
- **Не выносить компоненты в отдельный пакет до 3-го опыта.** Преждевременная абстракция.

### 12.2. Тестовые

- **Не мокать DOM в integration-тестах.** Оркестратор должен реально работать с DOM (через happy-dom в Vitest или real браузер в Playwright). Иначе словишь баги, которые тесты пропускают.
- **Не верить, что forward = reverse.** Тестировать всегда обе стороны.
- **Не писать тесты «после фикса»** — писать одновременно с фиксом, и в первую очередь — property invariant, который класс багов накроет.
- **Не запускать тесты без анализа покрытия физики.** Vitest coverage должна стремиться к 100% в `src/physics/`.

### 12.3. UX

- **Не ругать ученика.** «Сначала подвесьте пружину» — нейтрально. Не «Ошибка: пружина не подвешена!».
- **Не блокировать без объяснения.** Если жёсткий запрет — `hints.flash()` объясняет почему. Если мягкий — overload-banner.
- **Не палить правильный ответ в ARIA-метках, hint-bar, графике-tooltip.** Только после нажатия «Записать в журнал».
- **Не ставить эмодзи в UI приборов.** Школьный стиль — иконки SVG / текст.
- **Не делать клик-через-double-click и прочее «удобное» — школьник запутается.** Один клик = один эффект.

### 12.4. Кодовые

- **Не использовать `--no-verify`, `--force`, `--no-gpg-sign`** для обхода. Если хук падает — чинить причину.
- **Не писать `try/catch` ради «чтобы не падало».** Валидация только на границах системы. Внутри — assume invariants.
- **Не добавлять docstring/comments к коду «который не трогал».** Минимализм.
- **Не делать backwards-compat шимы.** Удаляем старое, не оставляем хвостов с `// deprecated`.

### 12.5. Графические

- **Не использовать `<svg>` без `aria-hidden="true"`** для декоративных элементов (тени, блики). Иначе скринридер их «прочтёт».
- **Не строить шкалы только цветом.** Деления, цифры, толщина линий.
- **Не использовать `transform: scale()` на корне сцены** — поломает PointerEvents координаты для DragController.

---

## 13. Definition of Done

Опыт можно показывать ученику, только когда **все** пункты ✅.

### 🛑 Animation reality check (обязательный пункт №-2)

Каждое **микро-движение** в анимации обязано соответствовать реальному
миру и реальной геометрии. Анимация на «плюс-минус красивых ступенях» —
плохо: ученик не видит физику. См. §32 «Animation reality check».

- [ ] **Continuous drag вместо ступенчатых кнопок** там, где в реальном
      опыте ученик плавно опускает прибор (цилиндр в воду, груз на пружину,
      брусок по поверхности). Кнопки «20 / 40 / 60» — допустимы как
      shortcut, но НЕ как единственный способ.
- [ ] **Геометрия mm ↔ px зафиксирована в коде константой** (`MM_TO_PX`,
      `MAX_H_MM` и т.п.) с обоснованием в комментарии: «реальный диапазон
      X мм → Y пикселей по ФИПИ-паспорту, измерено через
      getBoundingClientRect».
- [ ] **Вторичная физика обновляется** при основном движении: уровень
      воды в стакане поднимается при погружении (вытеснение), показание
      динамометра меняется live (а не на pointerup), цвет/яркость
      индикатора меняется пропорционально.
- [ ] **Snap к ФИПИ-эталонам** при close-target — мягкий магнит (radius
      ±N мм), не блокирует промежуточные положения.
- [ ] **Запрет text-selection** при drag: `user-select: none` на сцене
      опыта + `body.has-drag-active` блок (без этого браузер выделяет
      случайный текст синим при перетаскивании).
- [ ] **CSS transition отключён** во время активного drag (`transition: none`)
      — пальцу нужен 1:1 отклик. Включается обратно для programmatic
      animations (snap / reset).
- [ ] **selfcheck с реальным mouse-drag** через `page.mouse.move/down/up`
      с многошаговой интерполяцией (`steps: 2-10`). НЕ programmatic
      API — оно обходит drag-pipeline и не ловит реальные баги.
- [ ] **Пропорции «совместимых» приборов проверены через
      getBoundingClientRect**. Если в опыте груз должен входить в стакан /
      брусок ехать по направляющей / шарик помещаться в воронку — после
      mount-в-stage **измерь все участвующие приборы** и убедись, что
      body_width(груз) < mouth_opening(стакан), что body_height(груз) <
      depth(стакан), что брусок_width < направляющая_width, и т.п.
      Соотношение должно быть близко к реальному комплекту (например,
      cyl_d/beaker_d ≈ 0.5..0.8). **Без этой проверки получится визуальный
      баг «груз шире стакана, физически не входит»** — фиксировано
      2026-05-16, опыт 1.3 (cyl-3 был 118 px при beaker mouth 89 px).
- [ ] **Геометрия drag-by-thread калибруется ДИНАМИЧЕСКИ** через
      `getBoundingClientRect` / `getBodyHeightPx()` / `getWaterSurfaceY()`
      ПОСЛЕ установки оборудования. Хардкод `MM_TO_PX = 1.4` плох тем,
      что при изменении `--w-size` или иного layout-параметра соответствие
      drag-distance ↔ h_mm ломается. Калибровка должна:
      (а) вычислить `mmToPx = bodyHeightPx / max_mm` из реального body
      компонента, (б) вычислить `startOffsetPx` такой, чтобы при h=0
      нижняя кромка действительно лежала на поверхности воды/стола, —
      иначе первые N мм drag «висят в воздухе». Очистить offset на
      reset/detach. **Тест на корректность**: после mount и калибровки
      `cyl.getBottomY() - beaker.getWaterSurfaceY() < 1 px`.
- [ ] **Reality-check визуал**: после selfcheck открыть screenshot и
      убедиться что «выглядит как реальный лабораторный опыт». Сверить
      с фото `.business/Маркетинг/Сборка-КП/photos/kit-N.png` или с
      описанием в методичке.

**Корневая причина создания (2026-05-16):** опыт 1.3 был сделан с тремя
кнопками «↓ 20 / 40 / 60 мм» вместо drag-погружения. Пользователь:
«давай будем погружать не по кнопке, а сами! ...опять ошибка выделения
как при двойном щелчке мыши при переносе динамометра. И не точно
оборудование погружается — не соответствует расстояниям. Короче анимацию
нужно проанализировать глубоко, переделать, устранить ошибки и всё
проверить согласно правилам 0 по каждому мини-движению и сверкой с
реальным миром».

### 🛑 UX-канон layout (обязательный пункт №-1 — параллельно с ФИПИ-якорем)

Все опыты в одном комплекте **обязаны** иметь идентичный layout / алгоритм
действий ученика. Опыт, выпадающий из канона, нарушает узнаваемость и
ломает мышечную память. См. §31 «Канонический layout опыта» с разметкой
и эталонами.

- [ ] **Layout по §31**: 2-колоночный grid `workbench (1fr) | equipment-panel (280–420px)`.
- [ ] **Заголовок-степпер** этапов сверху workbench (`<ol class="*-steps">`),
      БЕЗ отдельной колонки stepper.
- [ ] **Журнал — floating `<aside class="measurement-panel">` ВНУТРИ
      stage-area**, в нижнем-правом углу. НЕ отдельная третья колонка.
- [ ] **Equipment-panel справа** — карточки `<lab-equipment-card>` в
      `equipment-group` секциях («Измерительные», «Цилиндры»/специфика,
      «Расходные»).
- [ ] **Reset-кнопка** — иконка-крестик ↻ в правом углу header (свойства как
      в density-solid `#reset-btn`), НЕ внутри журнала.
- [ ] **Hint-bar** под/рядом со степпером для текущей подсказки.
- [ ] **Stage-corners** (4 декоративных уголка в stage) — обязательны.
- [ ] **Eqsoftware-card имена и data-eq/data-draggable/data-dropzone**
      следуют канону: `dyno-1` / `cyl-3` / `beaker` (не `dynamometer-1`
      / `beaker-water` и т.п.), см. §31.4.
- [ ] **Визуальная сверка** с density-solid (1.1) и archimedes (1.2)
      открытыми в соседних табах — выглядит как продолжение того же набора.

**Почему этот пункт «-1»** (то есть проверять раньше ФИПИ-якоря): нарушение
UX-канона — это не баг, который можно потерпеть. Это слом узнаваемости
комплекта; ученик каждый раз заново учит UI. **Зафиксировано 2026-05-16**
по результату промаха в опыте 1.3 (был сделан как 3-колоночный grid,
переписан под канон).

### 🛑 ФИПИ-якорь (обязательный пункт №0 — проверять ДО всех остальных)

Без явной ФИПИ-цитаты опыт **не считается готовым** даже если код работает.
Это правило защищает от ситуации «сделали красивый опыт, которого ФИПИ не
требует» (например, kit-2 `spring-work/` «Работа упругости» — корректная
физика, но **в ФИПИ-2026 для kit-2 такого опыта нет**, см. §30).

- [ ] **В шапке `<Id>Experiment.ts` есть docstring** вида:

  ```ts
  /**
   * ФИПИ-2026, Спецификация КИМ (Приложение 2, стр. 17), Комплект №2:
   * «измерение жёсткости пружины, коэффициента трения скольжения,
   *  работы силы трения, силы упругости»
   *
   * КОДИФ ОГЭ-2026 §1.29 (стр. 14) — практическая работа из канонического перечня.
   *
   * Cross-check: REFERENCE §30 «Покрытие ФИПИ» — статус ✅
   */
  ```

  Цитата должна быть **дословной**, с указанием страницы и приложения. Если
  опыт — расширение ЛАБОСФЕРЫ сверх ФИПИ, в docstring явно: `// ⚠️ БОНУС
  ЛАБОСФЕРА — НЕ ВХОДИТ В ФИПИ. Причина: …`.

- [ ] **§30 в REFERENCE обновлён**: новая строка в таблице «ФИПИ-опыт → файл
  → статус».

- [ ] **kits.ts**: запись опыта помечена `isFipi: true` (или `bonus: true`
  для расширений).

- [ ] **Selfcheck-скрипт** содержит assertion на ФИПИ-инвариант (например:
  «соляной раствор даёт F_арх больше, чем чистая вода» для опыта 1.4).

**Почему этот пункт первый:** при сверке 2026-05-16 выяснилось, что 2 из 4
опытов kit-2 имели расхождения с ФИПИ (`spring-work` — не в ФИПИ; `friction
Task B` — заявлен, но `work=null`). Корень проблемы — отсутствие
обязательной ФИПИ-сверки в DoD.

### Функционал

- [ ] Реализован полный workflow (сборка → измерение → журнал → результат).
- [ ] Все экспериментально-значимые комбинации оборудования (по спеке ФИПИ) работают.
- [ ] Reset возвращает в начальное состояние без артефактов.
- [ ] На странице нет console.error / pageerror.

### Физика

- [ ] Формулы соответствуют учебнику Перышкина 9 кл. + ФИПИ-2026 спеке.
- [ ] `G = 9.8`. Единицы во всех формулах согласованы.
- [ ] `VALID_K_RANGE` (или аналог) взят из паспорта прибора в спеке.
- [ ] Pure-физика покрыта Vitest ≥ 95%.

### UI

- [ ] Использованы только токены из `@labosfera/shared-spa/styles/tokens.css` (нет хардкоженных цветов; локальный `tokens.css` — только `@import` barrel).
- [ ] Палитра приборов соответствует фото реального комплекта.
- [ ] Адаптив проверен на брейкпоинтах ≥1600 / 1280 / 1024 / 768.
- [ ] Шкалы читаемы без зума на 1280×800.

### A11y

- [ ] axe-core scan на 5+ ключевых state'ах: 0 violations.
- [ ] Tab-навигация проходит весь интерфейс.
- [ ] Скринридер (NVDA или VoiceOver) не получает ответа.
- [ ] `prefers-reduced-motion` отключает все анимации.
- [ ] Контраст всех текстов ≥ 4.5:1 (AAA где возможно).

### Тестирование

- [ ] Vitest unit-тесты — зелёные.
- [ ] Property-фуззер 3000+ итераций — 0 нарушений PI-1..PI-N.
- [ ] Deterministic state-machine — все кейсы зелёные.
- [ ] UI consistency: drop-zone visible ⇔ accepted (для каждой kind/state пары).
- [ ] Playwright e2e + a11y — зелёные.
- [ ] Reset 100 раз → 0 утечек DOM (нет «висящих» wrapper'ов).

### Документация

- [ ] Реф-документ опыта обновлён (если были новые паттерны — описаны).
- [ ] [TEST_PLAN.md](tests/TEST_PLAN.md) актуален: новые баги превратились в PI или TestCase.
- [ ] В [experiments/README.md](../README.md) обновлена строка про этот опыт.

### Дизайн-токены (Phase 1 — 2026-05-19)

С 2026-05-19 токены живут в `@labosfera/shared-spa/styles/`. Локальный
`experiments/2-1-spring/src/styles/tokens.css` — только `@import` barrel.

```css
/* experiments/2-1-spring/src/styles/tokens.css */
@import "@labosfera/shared-spa/styles/tokens.css";
```

Что внутри `_shared-spa/src/styles/`:

- `tokens-colors.css` — 6 shade-палитр (gray/blue/orange/green/red/amber) × 10 ступеней (50…900) + semantic mapping (все существующие `--color-*` имена сохранены).
- `tokens-typography.css` — Tailwind-derived 10-ступенчатый modular scale (12 → 60px, ratio ≈1.25).
- `tokens-spacing.css` — линейный canonical scale 4/8/16/24/32/48/64 + 80/96 для home.
- `tokens-shadow.css` — two-part elevation shadows (tight crisp + larger atmospheric) + glow.
- `tokens-motion.css` — easings + durations + `prefers-reduced-motion` guard.
- `tokens-physics.css` — `--phys-*` PhET convention (domain-семантика).
- `tokens-equipment.css` — `--equip-*` под фото реальных комплектов.
- `tokens-layout.css` — z-index стек + layout-параметры сцены.

WCAG 4.5:1 для normal text и 3:1 для large text — проверяется vitest-тестом `_shared-spa/__tests__/tokens-contrast.test.ts` (16 критичных пар). Меняя HSL — обнови тест.

**Запрещено:** добавлять локальные определения `--color-*` / `--space-*` / `--shadow-*` / `--text-*` в этот опыт. Если нужен новый токен — добавляй в `_shared-spa/src/styles/`.

**Убранные spacing-токены** (Phase 1 migration): `--space-3` (12px), `--space-5` (20px), `--space-10` (40px) — мигрированы на ближайший canonical (`--space-4` / `--space-6` / `--space-8` / `--space-12`).

См. спеку `.business/спеки/2026-05-19-design-tokens-unification.md` и Plan A `.business/спеки/2026-05-19-design-tokens-unification-plan-A.md`.

### Журнал v2 (§21) — обязательно для нового опыта

- [ ] `EXPERIMENT_SPEC` создан в `experiments/_shared-spa/src/lib/journal/specs.ts` (meta + direct + derived колонки + tolerance + expectedFromRow).
- [ ] `renderJournalTable(host, SPEC, rows, opts)` подключён вместо ручного `tr.innerHTML`.
- [ ] Все три режима записи работают: `semi-auto` (pending-плашка), `fully-manual` (пустая строка с input'ами + ✓), `fully-auto` (auto-write по ready+stable).
- [ ] `renderRecordModeToggle(host, …)` подключён в шапке журнала.
- [ ] HTML-слоты есть: `#record-mode-slot`, `#journal-host`, `#record-pending-slot`.
- [ ] `body[data-record-mode]` корректно выставлен (через `applyRecordModeAttribute`) — CSS-селекторы `body[data-record-mode='fully-manual'] .formula-display { display: none }` работают.
- [ ] State: `#journalDrafts: Map<ts, Record<string, number>>` + `#journalVerdicts: Map<ts, Record<string, JournalVerdict>>`.
- [ ] `reset()` очищает drafts + verdicts + `#lastRecordedSignature`.
- [ ] URL-fix `?mode=semi-auto|fully-manual|fully-auto` → toggle disabled (teacher-override).

### Drag & Drop v2 — обязательно для опыта с draggable-приборами

- [ ] Все snap-zones возвращают элемент в исходный slot после успешного drop (`#parkDiscElement`-паттерн §26).
- [ ] После drop'а в DOM нет «зависших» элементов в overlay (`document.querySelectorAll('[draggable-type]:not(.slot *)').length === 0`).
- [ ] Drag блокируется только через `data-pin="true"` (короткоживущий), а не `attached=""`. См. §20.2.
- [ ] Mouse-drag selfcheck (через `page.mouse.move/down/up`, не `tray.addX()` API) проходит. См. §26.

### REST-state visibility (§25 + §26) — обязательно проверять перед «готово»

В idle-state (никто не drag'ает, не hover'ит) ВСЕ pulse/glow/snap-индикаторы скрыты. Playwright-assertion:

```js
const HIDE_AT_REST = ['.drop-zone', '.attached-eq.snap-target', '[class*="pulse"]', '[data-slot-target]'];
for (const sel of HIDE_AT_REST) {
  const visible = await page.evaluate((s) => [...document.querySelectorAll(s)]
    .filter(el => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
    }).length, sel);
  if (visible > 0) throw new Error(`REST-state нарушен: '${sel}' видимы (${visible})`);
}
```

### Workspace + tooling

- [ ] `npm run typecheck --workspace=@labosfera/<kit-id>` зелёный.
- [ ] `npm run lint --workspace=@labosfera/<kit-id>` 0 errors.
- [ ] `npm run build` из корня собирает все 5 пакетов.
- [ ] `npm run test` — общее число unit-тестов не уменьшилось.
- [ ] `selfcheck-<id>.mjs` (Playwright) — multi-state скрины + REST-state + 3-режимный тест.

### Производительность

- [ ] FPS ≥ 60 на iPad 9 (2021), Chromebook 2020+.
- [ ] Initial render < 500ms на средней машине.
- [ ] Stepper update < 16ms.
- [ ] Нет утечек памяти в цикле reset×1000 (ручная проверка через DevTools).

---

## 14. Как поднять новый опыт по этому шаблону

> **Краткий entry-point — [`experiments/PLAYBOOK.md`](../PLAYBOOK.md)** —
> 7 шагов сборки нового опыта за день со ссылками на конкретные §
> этого справочника. Читай его ПЕРЕД тем, как начинать новый опыт.
>
> Подробная версия — этот раздел (§14) — раскрывает каждый шаг с
> историческим контекстом и трейд-оффами.

### 14.1. Bootstrap (актуально на 2026-05-15)

**Шаблон-источник** теперь не legacy `2-1-spring/` (он standalone-эпохи),
а опыт внутри SPA-комплекта:

- **Для нового screen'а внутри существующего кита** (наиболее частый
  случай: добавляем опыт 1.3 в `kit-1-hydrostatics`):
  1. Скопировать `experiments/kit-1-hydrostatics/src/screens/density-solid/` →
     `experiments/kit-1-hydrostatics/src/screens/<новый-screen-id>/`.
  2. Переименовать `DensitySolidScreen.ts` → `<NewExperiment>Screen.ts`,
     `DensityExperiment.ts` → `<NewExperiment>Experiment.ts`.
  3. Поменять `meta.id`, `meta.label`, `meta.kicker` в Screen.
  4. Зарегистрировать в `src/main.ts` через `Router.register(new ...Screen())`.
  5. Добавить запись в `KITS data` ([`experiments/home/src/data/kits.ts`](../home/src/data/kits.ts))
     `experiments` массиве + увеличить `progress.total`.

- **Для целого нового кита** (новые приборы, отдельный SPA — кит 3+):
  1. Скопировать `experiments/kit-2-forces/` → `experiments/kit-<N>-<тема>/`.
  2. `npm install` (workspace подхватит автоматически после правки root
     `package.json` workspaces).
  3. Удалить старые screens, оставить пустой `SpringStiffnessScreen` как
     каркас.
  4. Добавить в root `package.json` workspaces массив + `dev:kit-<N>` скрипт.

> **Не копируйте legacy 2-1-spring как шаблон** — он отдельный пакет,
> v1-эпохи. kit-2 / kit-1 — современные.

### 14.2. Что переиспользуется (single-source-of-truth — `_shared-spa/`)

- **Полностью (через `@labosfera/shared-spa/`-импорты):**
  - `controller/Store.ts`, `controller/DragController.ts`
  - `shell/IScreen.ts`, `shell/KitShell.ts`, `shell/Router.ts`
  - `ui/detach-button.ts` (`attachDetachButton`)
  - `lib/record-mode.ts` (`getRecordMode`, `renderRecordModeToggle`,
    `applyRecordModeAttribute`)
  - `lib/journal/*` — render, specs, verify, format, pending, recorder
  - `lib/journal/journal.css` — стили таблицы и pending-плашки
- **Из своего кита:** `tokens.css`, `reset.css`, `components.css`,
  `kit-shell.css`, `lab-*` компоненты (общие для кита: lab-stand,
  lab-dynamometer, lab-equipment-card).
- **С нуля:** `<Опыт>Experiment.ts` оркестратор, физика (`physics/<тема>/`
  с Vitest 100%), типы state (`types/<тема>/setup.ts`), специфические
  `lab-*` компоненты (например `lab-spring-board` для пружины — есть
  только в kit-2).

### 14.3. Чек-лист первой недели

**День 0 — ФИПИ-якорь (обязательно, без него опыт даже не начинаем):**

- [ ] Открыть `.business/Исходники/ФИ-9 ОГЭ 2026_СПЕЦ.pdf` Приложение 2
      (стр. 16+ для kit-1, стр. 17+ для kit-2 и т.д.). Команда:

      ```powershell
      # pages[10] = стр.16-17 (kit-1+kit-2); pages[11] = стр.18-19 (kit-3+kit-4); pages[12] = kit-5+kit-6; pages[13] = kit-7
      python -c "import pdfplumber; print(pdfplumber.open(r'C:\Users\Administrator\ООО ЛАБОСФЕРА\.business\Исходники\ФИ-9 ОГЭ 2026_СПЕЦ.pdf').pages[10].extract_text(use_text_flow=True, x_tolerance=2, y_tolerance=3))"
      ```

- [ ] Найти **дословную фразу**, описывающую ваш опыт. Если в Приложении 2
      нет — открыть КОДИФ `.business/Исходники/ФИ-9 ОГЭ 2026_КОДИФ.pdf`
      стр. 14 (§1.29 «Практические работы»).
- [ ] Если опыта нет ни там, ни там — **это бонус ЛАБОСФЕРЫ**. Решение
      «делать ли» — только с согласования. Если делаем — пометить
      `isFipi: false` в `kits.ts` + docstring `// ⚠️ БОНУС ЛАБОСФЕРА`.
- [ ] Дополнить `REFERENCE §30 «Покрытие ФИПИ»` строкой с новым опытом
      и ФИПИ-статусом.

День 1 — Контекст:
- [ ] Прочитать соответствующий раздел методички
      (`.business/Продукты/.../методичка/src/0X-*.md`) — оборудование,
      допуски, формулы.
- [ ] Посмотреть фото реального комплекта
      (`C:\dev\Inter_OGE\фото оборудования\`). См. §29.
- [ ] Прочитать `PLAYBOOK.md` целиком + соответствующие § REFERENCE.
- [ ] Создать спеку опыта в `.business/спеки/<дата>-<опыт-id>.md`
      по шаблону `2026-05-06-drag-matrix-kit-1.md` (drop-matrix,
      инварианты, риск-реестр).

День 2-3 — SPEC + физика:
- [ ] Добавить `EXPERIMENT_SPEC` в `_shared-spa/lib/journal/specs.ts`.
- [ ] Написать `types/<id>/setup.ts` (State, EquipmentId, INITIAL_STATE).
- [ ] Написать `physics/<id>/*.ts` + Vitest 100%.

День 4-5 — Скелет UI:
- [ ] Сделать пустой `<Опыт>Screen.ts` + `template.html` с обязательными
      слотами (`#record-mode-slot`, `#journal-host`, `#record-pending-slot`,
      `#hint-bar`, `#drag-overlay`).
- [ ] Реализовать первый attach (pointer-drag → snap-zone → mount).

Неделя 2 — Оркестрация:
- [ ] `<Опыт>Experiment.ts` оркестратор: Store + DragController +
      `#journalDrafts`/`#journalVerdicts`/`#recordMode` поля.
- [ ] HintEngine + Stepper + Measurement-panel.
- [ ] Подключить `renderJournalTable(SPEC, …)` + 3 режима записи.
- [ ] Анимации (Web Animations API, prefers-reduced-motion guard).

Неделя 3 — DoD:
- [ ] Property-фуззер 3000+ итераций.
- [ ] State-machine тесты.
- [ ] `selfcheck-<id>.mjs` — multi-state + REST-state + mouse-drag.
- [ ] Definition of Done (§13) — пройти все галочки.

### 14.4. Когда делать `shared/`

После 3-го опыта (то есть когда соберём 2-1, 2-2, 2-3). Реальные общие компоненты будут видны. Сейчас — копируем и адаптируем. Преждевременная абстракция дороже, чем дублирование.

---

## 15. Уроки опыта 2.2 «Трение скольжения»

Этот раздел собран после полной отгрузки опыта 2.2. Каждый урок — обязательное правило для опытов 2.3+, чтобы не повторять найденные баги.

### 15.1. Цифровое окошко (LCD readout) на корпусе прибора

**Правило.** Каждый аналоговый прибор (динамометр, амперметр, термометр) обязан иметь встроенное LCD-окошко с цифровым показанием рядом со шкалой. Без него ученик читает «на глаз» с делений и сомневается.

**Стандарт реализации:**
- Чёрный фон `#0a0e16`, янтарные цифры `var(--color-brand-orange)`, моноширинный шрифт.
- Размещение: для горизонтального прибора — под корпусом со связующей «ножкой»; для вертикального — внутри корпуса под окном шкалы.
- Точность совпадает с **ценой деления**: 1Н динамометр → 2 знака (`0,30 Н`), 5Н → 1 знак (`1,5 Н`).
- Десятичный разделитель — **запятая** (русская локаль): `value.toFixed(decimals).replace('.', ',')`.
- Обновляется в `attributeChangedCallback` при изменении `force` И `range`, и в `constructor` (initial render).
- Эталонные реализации: [lab-dynamometer-h.ts](src/ui/components/lab-dynamometer-h.ts) (гориз.), [../2-1-spring/src/ui/components/lab-dynamometer.ts](src/ui/components/lab-dynamometer.ts) (вертик.).

**Источник:** Vernier/PASCO (производители реального лабораторного оборудования). PhET использует тот же приём для аналоговых приборов.

### 15.2. Шкала прибора — формат подписей

**Правило.** Никогда не использовать `Math.round(value)` для меток шкалы. Это критический баг для дробных пределов.

**Антипример (баг):**
```ts
// Шкала 1Н, 5 major-меток с интервалом 0.2: 0, 0.2, 0.4, 0.6, 0.8, 1
text.textContent = String(Math.round(value)); // "0", "0", "0", "1", "1", "1" — сломано!
```

**Стандарт:**
```ts
// Decimals привязан к диапазону (= цена деления подписи)
const labelText = range === 1
  ? (value === 0 ? '0' : value === 1 ? '1' : value.toFixed(1))
  : String(Math.round(value));
```

**Структура шкалы по ФИПИ-2026:**
- **Minor** (короткие риски без цифр): шаг = цена деления прибора (С).
- **Mid** (средние риски): каждая 5-я minor (только когда major редкие).
- **Major** (длинные риски с цифрой): каждая 5-я или 10-я minor — выбирается так, чтобы в окне была **читаемая частота меток** (не плотнее ~12 пикселей на интервал).

Проверка после рендера: грепнуть текстовое содержимое всех `<text>` в `.scale` и убедиться, что нет дублей и нулей в неположенных местах:
```js
const labels = Array.from(dyno.shadowRoot.querySelectorAll('.scale text')).map(t => t.textContent);
expect(labels).toEqual(['0', '0.1', ..., '1']);
```

### 15.3. Согласованность обозначений (форма ↔ журнал ↔ формула)

**Правило.** Один символ — одно значение во всём опыте. Если форма ввода различает `m_бр` и `m_гр` — журнал и формула обязаны различать тоже.

**Антипример (баг):**
- Форма: `m_бр, г` + `m_гр, г` (раздельно)
- Журнал: `m, г` (просто «m» — какое из двух?)
- Формула: `N = (m_бр + m_гр) · g` (без указания «масса в кг» → ученик подставит граммы)

**Стандарт:**
- Все обозначения в `<em>` для курсива и `<sub>` для подстрочного индекса. CSS-стили `.journal-table thead th em / sub` и `.formula-expr em / sub` обязательны.
- Если в форме разделены `m_бр`, `m_гр` — в журнале колонка называется `m_общ, г` с пояснением в формуле: `m_общ = m_бр + m_гр`.
- Формула обязана содержать **строку пересчёта единиц** через CSS-класс `.formula-units`:
  ```html
  <span class="formula-units">массу — в кг, <em>Δl</em> — в метрах, <em>g</em> = 9,8 м/с²</span>
  ```
- Чек-лист до релиза: открыть форму, журнал, формулу — символ `m`/`F`/`Δl` в каждом из них означает одно и то же. Если разное — переименовать.

### 15.4. Discoverability X-кнопок (detach)

**Правило.** Кнопка «удалить с установки» должна быть **видна всегда**, не только на hover.

**Антипример (баг):**
```css
.detach-btn { opacity: 0; }
.attached-eq:hover .detach-btn { opacity: 1; }
/* Пользователь думает «крестика нет», не догадывается навести курсор. */
```

**Стандарт (Notion/Figma/JetBrains):**
```css
.detach-btn {
  opacity: 0.75;          /* видна всегда, дискретно */
  z-index: 50;            /* защита от перекрытия драг-оверлеем */
  pointer-events: auto;
}
.attached-eq:hover .detach-btn,
.detach-btn:hover { opacity: 1; transform: scale(1.12); }
```

**Размещение:**
- Одиночные приборы (горизонтальный layout, грузы в ряд): `top: -8px; right: -8px` — уголок над прибором.
- Цепочечные установки (стэк пружина → груз → груз): `top: 14px; right: -22px` — крестик ВЫНЕСЕН правее wrapper'а, иначе перекрывается крюком соседа сверху.

**Тест.** В каждом state-machine тесте проверять: `getComputedStyle(btn).opacity > 0` и `document.elementFromPoint(centerX, centerY) === btn` (не перекрыта).

### 15.5. Property fuzzing — методология (12+ категорий, 50 000+ итераций)

Усиленная методология тестирования из секции 11. Минимум для нового опыта:

**Структура файла `__tests__/comprehensive-fuzzer.test.ts`:**
```ts
// 1. Воспроизводимый PRNG (LCG)
function makeRng(seed: number) { /* ... */ }
const rng = makeRng(0xCOFFEE_EE);

// 2. Реальные константы комплекта
const VALID_MASSES_G = [...] as const;
const ITERATIONS_HEAVY = 1500;  // критичные PI
const ITERATIONS_MID   = 800;
const ITERATIONS_LIGHT = 300;

// 3. 14+ категорий describe(), каждая 3-8 it()
describe('PI-Phys: ...', () => { /* физические законы */ });
describe('PI-Mono: ...', () => { /* монотонность */ });
describe('PI-Edge: ...', () => { /* граничные случаи */ });
describe('PI-Round: ...', () => { /* roundTo идемпотентен */ });
describe('PI-Sum: ...', () => { /* totalMass линейна */ });
describe('PI-Combo: ...', () => { /* все 2^N подмножеств */ });
describe('PI-Agg: ...', () => { /* mean, stdDev, MNK */ });
describe('PI-RT: ...', () => { /* round-trip симметрия */ });
describe('PI-Noise: ...', () => { /* устойчивость к ±5% шуму */ });
describe('PI-FIPI: ...', () => { /* спецификация */ });
// ...
```

**Минимум** для опыта 2.3+: 50+ test cases, каждый с 300-1500 итераций → ~25 000 ситуаций на опыт. Для опыта 2.2 закрыли **55 000** без багов.

### 15.6. State machine тесты с реальным DOM (happy-dom)

**Правило.** Pure-physics fuzzing **не заменяет** интеграционные тесты на оркестратор. Багги вида «дин не возвращается к 0», «detach среднего груза не убирает нижние», «10 раз reset → дрейф state» ловятся только через реальный DOM.

**Стандарт setup:**
```ts
import { afterEach, beforeAll, beforeEach } from 'vitest';
import '../ui/components/lab-...';      // регистрация custom elements один раз
import { Experiment, type ExperimentRefs } from '../Experiment';

let cachedHtml: string | null = null;
function loadHtml(): string {
  if (cachedHtml) return cachedHtml;
  const full = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');
  const m = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  // ВАЖНО: вырезать <script> ДО парсинга, иначе happy-dom попытается их загрузить
  cachedHtml = (m ? m[1]! : full).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  return cachedHtml;
}

beforeEach(() => {
  document.body.innerHTML = loadHtml();
  const refs: ExperimentRefs = { /* собираем как в main.ts */ };
  exp = new Experiment(refs);
});
afterEach(() => exp.reset());
```

**Минимальные проверки** (по REFERENCE 11.2 PI-3 round-trip):
1. `attach + reset == initial` (все card.status='available', wrappers=0).
2. `detach среднего элемента` ведёт к ожидаемому состоянию (зависит от опыта).
3. `10 циклов attach+reset → state не дрейфует`.
4. `reset во время колебаний/анимаций не падает`.
5. Прибор после detach показывает 0 (force, extension, position).
6. Журнал очищается после reset.
7. Комбинаторика всех валидных последовательностей (для опыта 2.2 — 96 case'ов).

Эталон: [src/__tests__/state-machine.test.ts](src/__tests__/state-machine.test.ts) (45 case'ов опыт 2.1, 51 case опыт 2.2).

### 15.7. Чек-лист перед стартом нового **опыта** (отдельный SPA)

> Этот чек-лист — для опытов как self-contained приложений (например, новые комплекты). Если опыт добавляется в существующий комплект, см. раздел 16 ниже.

Перед первым коммитом нового опыта обязательно:

- [ ] Прочитан этот раздел 15 целиком — все 6 уроков понятны.
- [ ] Каждый аналоговый прибор имеет LCD-окошко на корпусе (15.1).
- [ ] Шкала проверена в браузере: подписи без `Math.round` (15.2).
- [ ] Все символы (`m`, `F`, `Δl`) идентичны между формой/журналом/формулой (15.3).
- [ ] X-кнопки видны при `opacity:0.75` базово (15.4), `z-index ≥ 50`.
- [ ] `comprehensive-fuzzer.test.ts` имеет ≥ 12 категорий PI и ≥ 25 000 итераций (15.5).
- [ ] `state-machine.test.ts` покрывает round-trip + 10×reset + комбинаторику (15.6).
- [ ] Раздел [Definition of Done](#13-definition-of-done) пройден целиком.

---

## 16. Архитектура «комплект как SPA» (PhET-style)

С опыта 2-3 (расширение комплекта №2 силой упругости и интеграция с трением) **отдельные опыты в одном комплекте упаковываются в один SPA** с PhET-style bottom navigation bar. Это эталонное решение, перенесённое из опыта `experiments/kit-2-forces/`.

### 16.1. Когда применяется

Применяется когда:

- В одном комплекте ФИПИ — несколько связанных опытов (комплект №2 — 3 опыта, комплект №6 — 2 опыта на рычаг и блоки).
- Ученик в течение 30–60 минут проходит несколько опытов подряд, переключаясь между сценами.
- Установки опытов разные (пружина-штатив vs брусок-направляющая), но комплект — один.

НЕ применяется когда:

- Опыт self-contained, не относится к серии (например, изолированная демонстрация).
- Установка одна, опыты — это подзадачи на ней (это решается локальным stepper'ом A/B/C/D, см. опыт 2.2).

### 16.2. Изученные best practices

Главный аналог — **PhET Interactive Simulations** (Колорадо). Их `joist`-фреймворк держит **navigation bar внизу** окна с иконками-screen'ами. У каждой темы 1 URL, экраны — query-параметром `?screens=`.

Также важные паттерны: ChemCollective (workbench tabs внизу), Concord Consortium (page-stepper + sidebar). НЕ берём: Labster mission-lock (запрещает прыжки), Gizmos (только внешний каталог, нет внутри-темной навигации).

Ключевые параметры PhET:

- Bottom-fixed navigation (на iPad низ удобнее верха — большой палец).
- Один URL на тему (экраны — query-параметром).
- Состояние каждого screen независимо при переключении (не shared model).
- Кнопка «домой» возвращает на каталог.

### 16.3. Архитектурный контракт

Структура каталога:

```text
experiments/<kit-id>/
├── index.html              # shell: <lab-kit-header> + <main id="screen-content"> + <lab-kit-nav>
├── src/
│   ├── main.ts             # точка входа: создаёт KitShell, подключает lab-kit-nav и lab-kit-header
│   ├── shell/
│   │   ├── IScreen.ts      # контракт экрана: meta, mount, unmount, saveState, loadState
│   │   ├── KitShell.ts     # оркестратор: реестр экранов, mount/unmount, persist в localStorage
│   │   └── Router.ts       # ?screen=<id> в URL, popstate-listener
│   ├── ui/components/
│   │   ├── lab-kit-nav.ts      # bottom navigation bar (Web Component)
│   │   ├── lab-kit-header.ts   # верхний header с брендом и заголовком
│   │   └── lab-*.ts            # все приборы (общие между экранами)
│   ├── controller/
│   │   └── Store.ts        # generic Store<T> (общий для всех экранов)
│   ├── physics/
│   │   ├── spring/         # физика опытов про пружину
│   │   └── friction/       # физика опыта про трение
│   ├── types/
│   │   ├── index.ts        # общие константы (G, Point, Rect, PIXELS_PER_CM)
│   │   ├── spring/         # типы для экранов про пружину
│   │   └── friction/       # типы для экрана трения
│   └── screens/
│       ├── spring-stiffness/
│       │   ├── SpringStiffnessScreen.ts  # implements IScreen
│       │   ├── SpringExperiment.ts       # оркестратор экрана (старый код)
│       │   ├── controller/                # screen-specific HintEngine, DragController
│       │   └── template.html              # HTML экрана (импортится через ?raw)
│       ├── spring-elastic/
│       │   └── SpringElasticScreen.ts
│       └── friction/
│           ├── FrictionScreen.ts
│           ├── FrictionExperiment.ts
│           ├── controller/
│           └── template.html
└── tests/                   # unit + property + state-machine + router
```

### 16.4. IScreen контракт

```ts
export interface IScreen {
  readonly meta: ScreenMeta;            // id, label, kicker, icon, tooltip
  mount(host: HTMLElement): Promise<void> | void;   // вставить в host, инициализировать
  unmount(): Promise<void> | void;                  // убрать из DOM, очистить timers/listeners
  saveState?(): unknown;                            // опционально: snapshot для localStorage
  loadState?(snapshot: unknown): void;              // опционально: восстановить
  reset?(): void;                                   // опционально: сбросить экран
}
```

Жёсткие правила:

- `mount` идемпотентен (повторный вызов при уже смонтированном — no-op).
- `unmount` обязан НЕ оставлять висящих listener'ов на window/document (round-trip!).
- `saveState`/`loadState` — JSON-сериализуемые. Хранятся в `localStorage['<kit-id>:screen:<screen-id>']`.

### 16.5. KitShell — оркестратор

Один экземпляр на весь SPA. Держит реестр `IScreen[]`, текущий activeId, persist через localStorage, координирует Router:

```ts
const shell = new KitShell(host, [s1, s2, s3], 'spring-stiffness');
shell.onScreenChanged((id) => navBar.setAttribute('active', id));
shell.start();   // читает URL → mount initial screen
shell.navigate('friction');  // unmount old + mount new
```

Между экранами **никакой shared state** — это сознательно. Если двум экранам нужны общие данные (например, список измерений при сравнении опытов), — делать это через verge-level хранилище (отдельный сервис), а не через KitShell.

### 16.6. Router — простой URL-роутер

`?screen=<id>` в URL, без push в history (`replaceState` — back-кнопка возвращает в каталог комплектов, а не на предыдущий экран). На popstate перечитывает URL и переключает.

Невалидный screen в URL → fallback на defaultId (не падать).

### 16.7. Bottom navigation bar (`<lab-kit-nav>`)

Web Component, рендерит кнопки экранов + «домик» справа. Активная кнопка подсвечена бренд-цветом, `aria-current="true"`. Минимум 56×76 px на кнопку (Apple HIG для touch). На <720px ширине — labels скрыты, только иконки.

События:

- `screen-select { detail: { id } }` — клик по кнопке экрана.
- `home-click` — клик по «домику» → возврат в каталог комплектов.

### 16.8. Шаблоны экранов

Каждый screen имеет свой `template.html` (вырезанный из исходного `<main>` старого SPA), импортируется через Vite raw-import:

```ts
import templateHtml from './template.html?raw';

mount(host: HTMLElement): void {
  host.innerHTML = templateHtml;
  // собираем refs из host.querySelector(...)
  this.#experiment = new SpringExperiment(refs);
}
```

`live-region` (для aria-live анонсов) — внутри template каждого screen, не в shell. Это делает screen self-contained.

### 16.9. Тестирование SPA-комплекта

Дополнительно к 11.x и 15.5:

- **Router unit tests** (10+ кейсов): read URL, navigate, popstate, replaceState, невалидный id.
- **KitShell integration tests** (12+ кейсов): mount/unmount счёт, persist в localStorage, цикл переключений без утечек, fallback при невалидном URL.
- **Browser-verification**: 5+ переключений всех экранов подряд без console.error.

Эталон: `experiments/kit-2-forces/src/shell/__tests__/`.

### 16.10. Когда добавлять новый экран в существующий комплект

1. Создать `src/screens/<screen-id>/` с template.html и `<ScreenName>Screen.ts implements IScreen`.
2. Добавить ScreenId в `IScreen.ts` (тип `ScreenId`).
3. Зарегистрировать в `main.ts` в массиве `screens`.
4. Иконка — добавить в ICONS-словарь `lab-kit-nav.ts`.
5. Тесты: добавить FakeScreen-кейс в `KitShell.test.ts` + screen-specific physics + state-machine.
6. Vite manualChunks — добавить chunk на новый screen для code-splitting.

### 16.11. Чек-лист до релиза kit-SPA

- [ ] index.html содержит `<lab-kit-header>`, `<main id="screen-content">`, `<lab-kit-nav>`.
- [ ] Все экраны имплементят `IScreen` (mount + unmount минимум).
- [ ] Router URL-параметр работает в обе стороны (URL → mount, click → URL).
- [ ] Минимум 1 экран сохраняет состояние через `saveState`/`loadState`.
- [ ] `lab-kit-nav.setScreens(metas)` вызван до `shell.start()`.
- [ ] Browser-test: 5 переключений всех экранов подряд → 0 console errors.
- [ ] localStorage не растёт без границ при многократных переключениях.
- [ ] Тесты Router (10+) и KitShell (12+) — зелёные.
- [ ] У каждого screen есть свой `template.html` с `<div id="live-region">` внутри.

---

## 17. Уроки опыта 2.4 «Работа силы упругости»

Добавлено 2026-05-06 после отгрузки 4-го экрана `spring-work` в kit-2-forces (закрытие комплекта №2 на 6/6 опытов ФИПИ-2026).

Главное методическое наблюдение: 4 экрана покрывают 6 опытов ФИПИ потому что **friction-screen с 4 stepper-подзадачами покрывает сразу 2.2/2.3/2.5**. Это нормальный паттерн: один screen = одна установка, но stepper умеет переключать «фокус задачи» (что измеряем) без перестройки сцены. Экономит код и ученическую когнитивную нагрузку.

### 17.1. Паттерн Custom Renderers — реюз экранов внутри кита

**Проблема.** Spring-stiffness и spring-work используют **одну и ту же физическую установку** (штатив + пружина + динамометр + грузы), но различаются **финальной обработкой**: журнал и формула результата другие. Полный форк = дубль 1300 строк `SpringExperiment.ts` → дрейф через 3 месяца, баги расходятся.

**Решение.** Базовый оркестратор (`SpringExperiment`) принимает второй опциональный параметр `SpringRenderers`:

```ts
// src/screens/spring-stiffness/SpringExperiment.ts
export interface SpringRenderers {
  journal?: (state: SpringSetupState, refs: {
    journalEmpty: HTMLElement;
    journalTable: HTMLTableElement;
    journalBody: HTMLElement;
  }) => void;
  result?: (state: SpringSetupState, refs: { resultPanel: HTMLElement }) => void;
}

export class SpringExperiment {
  constructor(refs: ExperimentRefs, renderers: SpringRenderers = {}) { ... }

  #renderJournal(): void {
    if (this.#renderers.journal) {
      this.#renderers.journal(this.#store.get(), { ...refs });
      return; // дочерний экран сам решил что показывать
    }
    // ... дефолтный рендер 2.1
  }
}
```

Дочерний экран передаёт свои функции:

```ts
// src/screens/spring-work/SpringWorkScreen.ts
const renderers: SpringRenderers = {
  journal: (state, { journalBody }) => {
    // 7 колонок журнала вместо 6: добавлены W=k·Δl²/2, W=F·Δl/2, A_грав
  },
  result: (state, { resultPanel }) => {
    // Блок «баланс энергии: A_грав = 2·W_упр» вместо «среднее k»
  },
};
this.#experiment = new SpringExperiment(refs, renderers);
```

**Выгода.** Опыт 2.4 — **180 строк** screen-обёртки (заменили только thead, formula, journal-rows, result-panel). Полный форк был бы 1300 строк.

**Обратная совместимость.** Старые экраны (spring-stiffness, spring-elastic) передают `renderers={}` или вообще не передают — работает дефолтная логика. **Не сломалось ни одного теста (274/274 как было).**

### 17.2. Когда форкать целиком vs Custom Renderers — дерево решений

| Вопрос | Если ДА — Custom Renderers | Если НЕТ — отдельный screen-orchestrator |
|---|---|---|
| Установка та же (приборы, штатив, drag-логика)? | ✓ | форк |
| Различие только в журнале / результате / формуле? | ✓ | форк (если меняется state-machine) |
| Stepper-этапы те же? | ✓ | форк (если другие шаги) |
| Те же drop-зоны и snap-логика? | ✓ | форк |

**Эмпирическое правило:** если различие = **«что показывать ученику в конце»**, делай Custom Renderers. Если различие = **«как ученик собирает установку»**, форкай.

Пример другого направления: spring-elastic vs spring-stiffness — установка та же, акцент задачи разный, **stepper и журнал ОДИНАКОВЫЕ** → ему даже Renderers не нужны, он просто меняет тексты в template и работает с дефолтным SpringExperiment.

### 17.3. Дидактический паттерн «N эквивалентных формул + 1 контрастная»

**Контекст.** В физике часто одна величина выводится через несколько эквивалентных формул. Стандартная подача — выбрать одну, удобную. Но это упускает шанс показать ученику глубину и связи.

**Паттерн.** В журнале и результате опыта 2.4 показываются **3 значения работы**:

1. `W = k·Δl²/2` — через жёсткость (стандарт ФИПИ)
2. `W = F·Δl/2` — через среднюю силу = площадь треугольника на графике F(Δl)
3. `A_грав = m·g·Δl` — работа силы тяжести при опускании груза

Первые две **тождественно равны** (при F=k·Δl). Третья — **в 2 раза больше**. Это контрастирует со «здравым смыслом» («сила тяжести двигает груз → её работа = энергия пружины») и заставляет ученика подумать, **куда уходит остальная половина**. Ответ: либо в кинетическую энергию груза при колебаниях, либо в работу руки при медленном опускании. Это **закон сохранения энергии** в самой наглядной форме, доступный для 9-го класса.

**Где применять:**

- 2.4 «Работа силы упругости» — реализовано: A_грав vs W_упр
- (планируется) 1.2 «Архимедова сила» — F_арх через закон Архимеда vs через разность веса
- (планируется) 3.4 «Закон Ома для участка цепи» — R через U/I vs через паспортное значение
- (планируется) 4.1 «Фокус линзы» — F через формулу тонкой линзы vs через прямое измерение

**Чек-лист реализации:**

- [ ] В журнале — все эквивалентные значения **рядом**, не в отдельных вкладках. Ученик должен видеть совпадение глазом.
- [ ] Контрастная формула выводится с явной подписью отношения: «отношение X/Y = 2.00 ≈ 2».
- [ ] Под журналом — **дидактическое объяснение «куда ушла разница»**. 1-2 предложения, не лекция.
- [ ] При множественных измерениях — отображать ratio в каждой строке (помогает ученику увидеть, что закон работает не только в одном случае).

### 17.4. Иконка-«площадь под графиком» для нав-бара

Для опытов на работу/энергию хорошая иконка — **прямая F(x) с закрашенным треугольником под ней**. Это интуитивная визуальная связка: «работа = площадь = эта вот штрихованная зона».

```svg
<svg viewBox="0 0 32 32">
  <path d="M6 26 L6 6" />          <!-- ось F -->
  <path d="M6 26 L28 26" />        <!-- ось Δl -->
  <path d="M6 26 L24 8" />         <!-- прямая F = k·Δl -->
  <path d="M6 26 L24 26 L24 8 Z"   <!-- треугольник = площадь = работа -->
        fill="currentColor" fill-opacity="0.32" stroke="none" />
  <text x="13" y="22" font-size="9" font-weight="700">W</text>
</svg>
```

Реализована в [`lab-kit-nav.ts ICONS.work`](../kit-2-forces/src/ui/components/lab-kit-nav.ts).

Аналогичный паттерн для других «площадных» опытов: импульс (F-t-диаграмма), теплота (T-S-диаграмма), мощность (P-t-диаграмма).

### 17.5. Чек-лист «добавить новый экран в существующий кит-SPA»

После закрытия одного кита, **дополнения** делаются по этому списку (взято из работы по spring-work):

- [ ] **Спека-якорь** в `.business/спеки/<дата>-<задача>.md` (~5-7 разделов, можно по шаблону `2026-05-05-опыт-2-4-работа-силы-упругости.md`).
- [ ] **Pure-функции физики** в `src/physics/<topic>/<NewModule>.ts`. Никакого DOM. Все edge-cases throw RangeError, все формулы с docstring и примером.
- [ ] **Unit-тесты** ≥ 25 кейсов: базовые + edge + ошибки + ФИПИ-эталон с допуском 5%.
- [ ] **Property fuzzer** ≥ 5 PI на 5000+ итераций каждый. LCG seed для воспроизводимости.
- [ ] **Screen-обёртка** — определиться: Custom Renderers (если установка та же) или полный SpringExperiment-форк (если другая). См. 17.2.
- [ ] **Подмена thead и formula-display** в `mount()` если колонки журнала/формула отличаются (не клонировать template.html — менять DOM после inject).
- [ ] **Расширить `ScreenId` тип** в `IScreen.ts`.
- [ ] **Расширить `icon` тип** в `ScreenMeta` если нужна новая иконка.
- [ ] **Добавить SVG в `ICONS`** в `lab-kit-nav.ts`.
- [ ] **Зарегистрировать** в `main.ts` (в массиве `screens`).
- [ ] **Browser-verify** на 1920/1366/1024: пустой экран + полный сценарий с 2+ измерениями.
- [ ] **Все тесты зелёные** (старые не сломались, новые добавились).
- [ ] **Обновить** `experiments/README.md` (статус опыта) и `.business/.../прогресс.md`.
- [ ] **Если появился новый паттерн, не описанный в REFERENCE.md** — добавить новый под-раздел в раздел 17 (этот). Не делать молча.

**Время:** для опыта 2.4 (со включёнными research, спекой и тестами) ушло ~1 рабочая сессия. Без нового физического домена и при готовой архитектуре кита — 4-6 часов.

---

## 18. Каталог-главная (entry-page) — стандарт для всей лаборатории

Добавлено 2026-05-06 после отгрузки `experiments/home/` — каталога-главной уровня Apple Education / Tesla Configurator. Заменяет легаси-`index.html` в корне (1489 строк vanilla, accessibility=0).

### 18.1. Архитектура каталога

**Структура:** SPA в `experiments/home/`, тот же стек что у китов (TS 5.6 strict + Vite 6 + Web Components без фреймворков). Vite-config — `port: 5181`, alias `@/* → src/*`.

**5 секций по вертикали** (scroll-driven, без табов):

1. **Hero** — `100dvh`, full-bleed, dark cinematic. Multi-layer texture (radial-gradients + 23° scan-lines + noise) **поверх** видео-loop с slow-zoom 1→1.05 на 30s. Asymmetric headline («Виртуальная / лаборатория / физики / для ОГЭ-2026»). 2 CTA: gold primary («Войти как учитель») + teal-outline ghost («Войти как ученик»).
2. **Bento-каталог** — асимметричный grid 7 карточек: flagship × 1 (готовый кит-2, span 6, 2 ряда), medium × 2 (планируемые, span 3), compact × 4 (планируемые, span 2). Variable depth-shadow и border-treatment по статусу.
3. **How it works** — 3 шага с цифрами 01/02/03 в gold opacity-0.32, teal-tag снизу.
4. **Real vs Digital diptyque** — split-screen фото мастерской ↔ цифровой двойник. Тонкая золотая разделительная линия 1px. Подписи-пилюли «Производство · Москва, 2026» и «Цифровой двойник · v2.0».
5. **Footer** — JBM-mono метаданные (версия, ФИПИ, стек), copyright.

### 18.2. Дизайн-система — обязательные правила

**Шрифт-стек (правило 1):**
- Display (`hero, h2`): **Onest** Variable 800 — slight-quirky, distinctive, отличная кириллица
- Body: **Geist** Regular/Medium — Vercel-grade нейтральность как контрапункт
- Numerals/eyebrows: **JetBrains Mono** — engineering-feel для всего что считается

**НЕ использовать:** Manrope (становится новый Inter), Space Grotesk, Roboto, system-ui для main hero. Inter и Roboto допустимы только как fallback.

**Палитра — правило 50/30/20 (правило 9):**
- 85% площади — `--bg-deep: #06101e`
- Gold `#ffbe0b` — ТОЛЬКО CTA primary, нумерация bento, focus-ring, shimmer на locked
- Teal `#14b8a6` — ТОЛЬКО статус «готов», ghost-CTA, прогресс-чип

**Не накладывать tint на фотографии оборудования** — они уже cinematic в натуральном виде.

### 18.3. Структура карточки кита (kit-card)

```html
<article class="kit-card"
         data-priority="flagship|medium|compact"
         data-status="ready|planned"
         data-kit-num="2"
         style="--i:0">
  <div class="kit-card-bg"></div>
  <div class="kit-card-photo-wrap"><img src="/photos/kit-N.png" /></div>
  <div class="kit-card-corners"></div>          <!-- specimen-frame на hover -->
  <div class="kit-lock"><svg/></div>             <!-- только для planned -->
  <div class="kit-card-meta">                    <!-- max-width 52-60% -->
    <header><span>КОМПЛЕКТ № N</span><span class="kit-card-status">...</span></header>
    <h3 class="kit-card-title">...</h3>
    <p class="kit-card-subtitle">...</p>
    <ul class="kit-card-experiments"><li>2.1 · Жёсткость пружины</li>...</ul>
    <span class="kit-card-cta">Открыть комплект →</span>
  </div>
</article>
```

**КЛЮЧЕВЫЕ ПРАВИЛА позиционирования:**

- Фото-обёртка `position: absolute`, **БЕЗ negative right/left** — иначе вылезает за границы карточки. `right/top: 2-8%`, `width: 44-50%`, `height: 84-92%`.
- Meta-блок **обязательно `max-width: 52% / 60% / 56%`** для flagship/medium/compact. Иначе текст налегает на фото.
- На карточке `overflow: hidden` + `clip-path: inset(0 round var(--radius-lg))` — оба нужны: `transform: perspective(1200px) rotate*` на родителе ломает clipping без явного `clip-path`.
- **БЕЗ `transform-style: preserve-3d`** — он отключает clipping детей.
- **БЕЗ `translateZ`** в `kit-card-photo-wrap` — выводит фото из clipping plane.

### 18.4. Pressure-aware tilt — реализация без зависимостей

Файл: `experiments/home/src/components/tilt-on-hover.ts` (~100 строк). Алгоритм:

1. Слушает `pointermove`, считает `event.movementX/Y` как velocity.
2. Tilt = базовый позиционный (от cursor.x/y) × intensity (0.5..1, зависит от скорости).
3. Дополнительный `rotateZ` ≈ `vx * 0.06` — имитирует «инерцию массы».
4. Photo-parallax: внутри карточки фото движется на 60% наклона — даёт «глубину коробки».
5. Линейная интерполяция `lerp(current, target, 0.18)` через `requestAnimationFrame` для плавности.
6. Активируется ТОЛЬКО при `(hover: hover)` и НЕ при `(prefers-reduced-motion: reduce)`.

Применяется только к `data-status="ready"` карточкам:
```ts
bentoEl.querySelectorAll('.kit-card[data-status="ready"]').forEach(attachPressureTilt);
```

### 18.5a. Hero-видео — стоковое, не свой capture

**Решение принято 2026-05-06:** для hero используем **бесплатное стоковое видео с Pexels**, не screen-capture из наших опытов. Причины:

1. Screen-capture опыта (даже с CSS-cleanup UI) выглядит «как UI demo», а не как **физика**. Hero нужно атмосферное, не дидактическое.
2. Стоковое видео реальной физики (магнитное поле, плазменный шар, химия) даёт зрителю узнаваемый «WOW» с первого кадра.
3. Pexels-license — royalty-free, без attribution для коммерческого использования.

**Канонический выбор (2026-05-06, финальный):** [Stunning Milky Way Galaxy in 4K](https://www.pexels.com/video/stunning-milky-way-galaxy-in-4k-29857700/) — галактика Млечный путь, медитативное вращение спиральной галактики. Концептуально: «физика — от атомов до галактик», масштабность науки. Deep purple/blue/black палитра идеально совпадает с #06101e, медленное движение не конкурирует с текстом hero.

**Альтернативы пройдены ПМ за 2026-05-06:**
- Magnetism Display with Iron Filings (37438142) — слишком документально-учебно
- Mesmerizing Fluid Dynamics (33004293) — красиво, но не wow-достаточно
- Tesla Coil Demonstration (854411) — wow, но agressive, светлые силуэты дерева в фоне отвлекают
- Plasma Ball, Ferrofluid, Light Refraction — рассмотрены, не выбраны

**Урок:** для hero виртуальной лаборатории физики ОГЭ нужно **масштабное явление** с глубокой палитрой (космос > tesla > fluid > iron filings). Cinematic > educational. Млечный путь даёт «WOW» через масштаб, а не через интенсивность движения — лучший компромисс между wow и читаемостью текста.

**Pipeline обработки** (через `ffmpeg-static`, без отдельной установки ffmpeg):

```bash
# 1. Скачать оригинал (исходный в .tmp/, не в public/)
curl -L "https://www.pexels.com/download/video/<ID>/" -o .tmp/source.mp4

# 2. WebM (VP9, основной — все современные браузеры)
ffmpeg -ss <start> -i .tmp/source.mp4 -t 14 \
  -vf "scale=1280:720,fade=t=in:st=0:d=1,fade=t=out:st=13:d=1" \
  -c:v libvpx-vp9 -b:v 700k -an -y public/videos/hero-loop.webm

# 3. MP4 (H.264 baseline — Safari iOS fallback)
ffmpeg -ss <start> -i .tmp/source.mp4 -t 14 \
  -vf "scale=1280:720,fade=t=in:st=0:d=1,fade=t=out:st=13:d=1" \
  -c:v libx264 -preset medium -crf 28 -profile:v baseline -level 3.0 \
  -an -movflags +faststart -y public/videos/hero-loop.mp4

# 4. Poster (1 кадр для preload)
ffmpeg -ss <start> -i .tmp/source.mp4 -frames:v 1 -vf "scale=1920:1080" \
  -y public/videos/hero-poster.jpg
```

**Целевые размеры:** webm ≤ 1.5 MB, mp4 ≤ 4 MB, poster ≤ 200 KB.

**Атрибуция в HTML** — комментарий рядом с `<video>` с источником и license. Обязательно.

**`.tmp/`** в `.gitignore` — исходники не коммитим.

### 18.5. Magnetic CTA — для всех `[data-magnetic]`

Файл: `experiments/home/src/components/magnetic-cta.ts` (~50 строк). Кнопка тянется к курсору на `strength × distance` пикселей если курсор в радиусе `radius`. Использует `--cta-tx`/`--cta-ty` CSS-vars (никаких style.transform для perf).

```ts
document.querySelectorAll('[data-magnetic]').forEach((el) => {
  attachMagnetic(el, { strength: 0.18, radius: 80 });
});
```

### 18.6. Adaptive breakpoints

| Width | Layout |
|---|---|
| ≥1200px | Bento grid 6 колонок: flagship × 1 (span 6) + medium × 2 (span 3) + compact × 4 (span 2) |
| 768-1199px | Bento grid 4 колонки: flagship span 4, medium span 2, compact span 2 |
| ≤767px | Single-column stack: все карточки full-width 1 колонка |

Hero — `headline` переходит в одну колонку при `<1200px`, spec-list уезжает под title.

### 18.7. Accessibility (правило 8)

- **Skip-link** — `<a href="#catalog" class="sr-only-focusable">` видим только на focus
- **Focus-ring** — двойной (gold + bg-deep) через `box-shadow` для контраста на любом фоне
- **Locked-карточки** — `aria-disabled="true"` + verbose `aria-label` («в разработке, ожидается 2026 Q3»)
- **Видео hero** — `aria-hidden="true"` (decorative)
- **`prefers-reduced-motion: reduce`** — отключает: hero zoom, tilt, magnetic CTA, stagger, lock-shimmer, card-enter
- **`prefers-reduced-data: reduce`** — удаляет `<video>`, остаётся `poster`
- **WCAG AA** — контрасты white/#06101e=18.5:1, gold/#06101e=11.5:1, teal только для крупного текста (4.7:1)

### 18.8. Чек-лист до релиза каталога-главной

- [ ] `experiments/home/` собирается через Vite без ошибок (`npm run build`)
- [ ] Все 7 продакт-фото в `/public/photos/kit-N.png`
- [ ] Логотип в `/public/photos/logo.png`
- [ ] Шрифты Onest, Geist, JetBrains Mono подгружаются с Google Fonts / cdn.jsdelivr / fontsource
- [ ] **НЕТ** Manrope/Inter/system-ui в `--font-display`
- [ ] Hero-headline читается без посимвольных переносов (`word-break: keep-all`)
- [ ] Bento карточки: `meta` имеет `max-width 52-60%`, фото без negative right/left
- [ ] `clip-path: inset(0 round var(--radius-lg))` на `.kit-card`
- [ ] Pressure-tilt активен для `data-status="ready"` карточек
- [ ] Magnetic CTA на оба hero-button
- [ ] Diptyque в Real-vs-Digital секции рендерит обе картинки
- [ ] Browser-verify: 1920, 1366, 1024, 768 — нет горизонтального скролла
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 95
- [ ] Reduced-motion отключает все non-functional motion
- [ ] Старая `index.html` в корне `C:\dev\Inter_OGE\` оставлена как legacy (не удалять, ссылается из `lab_windows.zip` electron-сборки)

### 18.9. Эталонные файлы

- `experiments/home/index.html` — структура 5 секций
- `experiments/home/src/styles/{tokens,reset,home}.css` — дисциплина дизайн-системы
- `experiments/home/src/sections/CatalogSection.ts` — рендер bento с stagger
- `experiments/home/src/components/tilt-on-hover.ts` — pressure-aware tilt
- `experiments/home/src/components/magnetic-cta.ts` — magnetic кнопки
- `experiments/home/src/data/kits.ts` — типизированный список 7 китов с прогрессом

**Источник принципов:** `.business/спеки/2026-05-06-каталог-главная-страница.md` — спека-якорь со всеми решениями интервью + research best practices (Apple Education, Tesla Configurator, Linear, Stripe, PhET joist 2023). Skill `frontend-design` дал 11 экспертных правил, которые применены 1:1.

---

## Приложение A — Ключевые числовые константы

| Константа | Значение | Где |
|---|---|---|
| `G` (gravity, RU school) | `9.8` м/с² | [src/types/index.ts](src/types/index.ts) |
| `VALID_K_RANGE` (ФИПИ) | `{min: 48, max: 52}` Н/м | [src/types/index.ts](src/types/index.ts) |
| `SPRING_CONFIG.k50` | `{k:50, restLengthMm:30}` | [src/types/setup.ts](src/types/setup.ts) |
| `SPRING_CONFIG.k10` | `{k:10, restLengthMm:30}` | [src/types/setup.ts](src/types/setup.ts) |
| `SCALE_MM_TOTAL` | `100` мм | [src/ui/components/lab-spring-board.ts](src/ui/components/lab-spring-board.ts) |
| `PIXELS_PER_CM` (canvas) | `20` | [src/types/index.ts](src/types/index.ts) |
| `RETURN_ANIM_MS` (drag) | `320` ms | [src/controller/DragController.ts](src/controller/DragController.ts) |
| `DEFAULT_SNAP_RADIUS` | `80` px | [src/controller/DragController.ts](src/controller/DragController.ts) |
| `oscillationDuration(0.15)` | ≈ `30.7` сек | [src/physics/SpringModel.ts](src/physics/SpringModel.ts) |
| `damping` (UI) | `1.6` (быстрее физики) | [src/SpringExperiment.ts](src/SpringExperiment.ts) |
| Adaptive stand гистерезис | `8` SVG-юнитов | [src/SpringExperiment.ts](src/SpringExperiment.ts) |
| Overload threshold | `restLengthMm + ext > 100` | [src/SpringExperiment.ts](src/SpringExperiment.ts) |

---

## Приложение B — Глоссарий

- **Snap-zone** — невидимая зона приёма drag'а. Имеет `accepts`, `getRect`, `onHover`, `onDrop`.
- **Attach** — операция «подвесить элемент». Возвращает `boolean`.
- **Mount** — DOM-операция вставки wrapper'а в `#hungStack`.
- **Chain** — вертикальная цепочка подвешенных элементов (пружина → дин → грузы).
- **PI (Property Invariant)** — свойство, которое держится для ВСЕХ достижимых состояний. Главная единица тестирования.
- **Round-trip** — `attach → detach == initial`. Если не выполняется — баг асимметрии.
- **Overload** — физика ушла за рамки UI-шкалы. Показываем soft-warning, не блокируем.
- **Equilibrium** — целевое (асимптотическое) удлинение пружины при текущей нагрузке. Считается через `forceToExtension(massToForce(m), k)`.
- **Hung-stack / Hung-mount** — DOM-контейнеры подвешенной цепочки в координатах под крюком штатива.

---

## Приложение C — Где спросить / где история

- **Спеки ФИПИ:** `.business/Продукты/Програмное обеспечение/Виртуальная лаборатория по физике ОГЭ/ФИ-9 ОГЭ 2026_*.pdf`
- **Тест-план опыта 2.1 + lessons learned:** [tests/TEST_PLAN.md](tests/TEST_PLAN.md)
- **Состав комплекта №2:** `.business/.../Состав набора по физике.xlsx`
- **История разработки в .business:** `.business/история/`
- **CLAUDE.md компании:** `.business/CLAUDE.md` (правила работы Claude в проекте)

---

## 19. Уроки опыта 1.1 «Плотность твёрдого тела» (Кит-1 / Гидростатика)

> **Кит-1** — `experiments/kit-1-hydrostatics/`. Опыт 1.1 «Плотность
> твёрдого тела». На нём «зрело» большинство правил «полной имитации
> реального мира» в drag&drop. 151 тест, 5 уровней. Этот раздел
> обобщает, чтобы новые киты повторяли правильно с первого раза.

### 19.1. ⭐ Главный принцип — «полная имитация реального мира»

Программа имитирует физическую лабораторию. Любой предмет на сцене
— физический объект, с которым ученик может делать всё, что мог бы
руками в реальной лаборатории.

- **Бидиректность.** Если можно с весов в мензурку — значит можно
  и обратно. Никаких односторонних маршрутов.
- **Реверсивность.** Туда-сюда сколько хочешь. Цилиндр → весы →
  мензурка → весы → мензурка → ... — каждый шаг должен работать.
- **Возврат в комплект через drag.** Карточка-источник в правой
  панели, после того как прибор взят на сцену, превращается в
  «пустую ячейку» (dashed контур + «← на столе») и **становится
  drop-зоной для возврата**. Drag прибора со сцены на свою карточку
  убирает его обратно в комплект.
- **Никаких блокировок «через крестик».** Drag — главный жест;
  крестик — лишь дублирующий способ убрать прибор.
- **Если физика разрешает — программа разрешает.** «Странные»
  сценарии (цилиндр в сухую мензурку без воды) физически возможны
  → должны работать. Может быть announce-подсказка, но не отказ.

Реализация в Кит-1:
- На приборах сцены (`#balance`, `#cylinder`) — `data-draggable`.
- На overlay-цилиндрах (`#weight-on-balance`, `#weight-in-cylinder`) —
  динамический `data-draggable="cyl-${id}"`.
- На карточках комплекта — статически `data-dropzone="<eq>"
  data-dropzone-id="card-<eq>"`.
- В оркестраторе `setPlaced()` снимает `data-draggable` с placed-карточки
  (иначе pointerdown по «пустой ячейке» запускал бы drag «новых»
  весов) и восстанавливает при возврате.

### 19.2. Матрица drag&drop как стандарт

Полная матрица комбинаций (источник × цель × предусловие → expected) —
обязательный артефакт каждого опыта. Спека Кит-1:
[`.business/спеки/2026-05-06-drag-matrix-kit-1.md`](../../.business/спеки/2026-05-06-drag-matrix-kit-1.md).

Разделы (применимо ко всем китам):

| Раздел | Что покрывает                                        |
|--------|------------------------------------------------------|
| A      | Размещение приборов на сцене                         |
| B      | Расходники (вода, реагент)                           |
| C      | Образец на главный измеритель (цилиндр на весы)      |
| D      | Образец во вторичный измеритель (цилиндр в мензурку) |
| E      | **Overlay drag со сцены — БИДИРЕКЦИОНАЛЬНО**         |
| F      | Detach (X-кнопки)                                    |
| G      | Нон-draggable клики (info-сообщения)                 |
| H      | **Возврат в комплект (drop на свою карточку)**       |

В Кит-1: **63 комбинаторных теста + 7 property-fuzzer + 12 e2e**
покрывают всю матрицу. Минимум для каждого нового опыта — повторить
эту структуру.

### 19.3. Технические грабли drag-ghost

1. **Ghost клонирует source через `cloneNode(true)`.** Если source —
   уже web-component (overlay-цилиндр), а не lab-equipment-card,
   `source.querySelector(SELECTOR)` возвращает null → fallback в
   `textContent = "cyl-1"` → ученик видит «иероглифы» вместо
   цилиндра. Решение: `source.matches(COMPONENT_SEL) ? source :
   source.querySelector(...)`.

2. **Клон тащит CSS-классы overlay** (`density-overlay-weight--balance`
   с `position:absolute; top:-78px`), которые применяются к нему уже
   внутри ghost-обёртки → клон уезжает на 78px вверх. Решение:
   `clone.classList.remove('density-overlay-weight*')` +
   `clone.removeAttribute('style')` при клонировании.

3. **Размер клона прыгает** между card (84px) / on-balance (70px) /
   in-cylinder (78px) → визуальный «скачок». Решение: единый
   `--w-size: 76px` на ghost через `clone.style.setProperty()`.

4. **Подпись в legend клона дублирует исходник** («Цилиндр № 1»). В
   ghost подпись не нужна. Решение: `clone.setAttribute('no-legend',
   '')`.

5. **CSS keyframe-анимация на ghost** (`ghost-grab` с opacity 0→0.92
   и transform-keyframes) **затирает inline-стиль `transform`** с
   позицией курсора → ghost на 200ms «улетает» в (0,0) и плавно
   проявляется. Эффект «расслоения, прыжка». Решение: убрать
   `animation` полностью; ghost рисовать сразу с `opacity: 0.95` и
   обновлять inline-transform в `pointermove`.

6. **Ghost центрируется по курсору, не по точке хвата.** Если ученик
   кликает по верху цилиндра, ghost появляется центром на курсоре →
   цилиндр визуально проваливается на ~40px. Решение: запоминать
   `grabOffset = (cursor − sourceCenter)` на pointerdown, ставить
   ghost в `cursor − grabOffset`.

7. **Двойной цилиндр на сцене** (оригинал + ghost). Решение: на
   overlay при drag → `visibility: hidden`. Карточки в правой панели
   при drag оставлять полупрозрачными (opacity 0.35) — пусть видно,
   откуда тащим.

### 19.4. Физика и визуал — отдельные слои, тестируем оба

Главный пропущенный класс багов в Кит-1: 123 теста проверяли
**state** (store-данные, ячейки журнала), а компонент рисовал
неправильно. Конкретно: цилиндр в сухую мензурку (level=0,
submerged=25) → SVG рисовал 25 мл «воды из ниоткуда».

**Правило:** для каждого web-component'а — отдельный render-test,
который проверяет **реальный SVG-output** (`rect.height`, `style.opacity`,
`aria-label`), а не только атрибуты-входы. Файл
`__tests__/lab-<component>.test.ts`. См. эталон
[`kit-1-hydrostatics/src/__tests__/lab-graduated-cylinder.test.ts`](
../kit-1-hydrostatics/src/__tests__/lab-graduated-cylinder.test.ts).

И в property-fuzzer добавлять инварианты «state ↔ visual»:
```ts
if (level === 0) expect(cylWaterRect.height).toBe(0);
else expect(cylWaterRect.height).toBeGreaterThan(0);
```

### 19.5. Учебная UX журнала — НЕ считать за ученика

Правило ОГЭ: ученик должен **сам** считать V и ρ, не получать готовый
ответ. В Кит-1 журнал устроен так:
- m, V₁, V₂ — auto-fill из observation (это «считывания» с приборов,
  ученик их и так видит на LCD/мензурке).
- V (см³) и ρ (кг/м³) — **input.j-input**, по умолчанию пустые,
  ученик вводит сам.
- Кнопка ✓ (`button.j-check`) — валидирует с tolerance ±5%.
  - Корректно → green badge «✓ Верно».
  - Неверно → красная подсветка inputs + банер-подсказка
    (`density-result-hint--wrong`) ПОД таблицей с формулой-напоминанием.
- Авто-определения материала по плотности **нет** (это спойлер
  ответа). Ученик сам сравнивает с табличной плотностью в справочнике.

### 19.6. Стандарт расположения окон (PhET-style)

Совпадает с REFERENCE §16, но утверждён повторно для Кит-1:

```
┌─ workbench-stage (~70%) ──────────┬─ equipment-panel (~30%) ─┐
│  ┌─ Stepper «1→2→3→4→5» ────────┐ │  ИЗМЕРИТЕЛЬНЫЕ ПРИБОРЫ   │
│  │  + hint-bar + reset-btn       │ │  [весы] [мензурка]       │
│  └───────────────────────────────┘ │  [дин-1] [дин-5]         │
│                                    │                          │
│  Слот-1 (главный измеритель)       │  ЦИЛИНДРЫ                │
│  [overlay-предмет с X-кнопкой]     │  [№1] [№2] [№3] [№4]     │
│                                    │                          │
│  Слот-2 (вторичный)                │  РАСХОДНЫЕ               │
│  [overlay c X]                     │  [стакан] [нить] [соль]  │
│                                    │                          │
│  ┌─ measurement-panel (floating) ┐ │                          │
│  │  Журнал измерений + формула   │ │                          │
│  │  + result-hint                │ │                          │
│  └───────────────────────────────┘ │                          │
└────────────────────────────────────┴──────────────────────────┘
```

Identical layout для всех опытов всех китов. Различается только
содержимое слотов и набор карточек.

### 19.7. Стандарт тестирования — 5 уровней

Опыт 1.1 закрепил расширенный стандарт (опыт 2.1 был на 4 уровнях,
теперь 5):

| # | Файл                                          | Что проверяет                |
|---|-----------------------------------------------|------------------------------|
| 1 | `physics/__tests__/<Model>.test.ts`           | Pure physics, ≥95% coverage  |
| 2 | `__tests__/comprehensive-fuzzer.test.ts`      | Property invariants физики   |
| 3 | `__tests__/state-machine.test.ts`             | DOM round-trip + workflow    |
| 4 | `__tests__/drop-combinations.test.ts`         | Матрица A-H exhaustive       |
| 5 | `__tests__/property-fuzzer.test.ts` (fast-check) | DOM-state + visual инварианты |
| 6 | `__tests__/lab-<component>.test.ts`           | **SVG-render компонентов**   |
| 7 | `e2e/<id>.spec.ts`                            | Critical paths real Chromium |
| 8 | `e2e/visual-regression.spec.ts`               | Pixel-diff baseline          |

Кит-1 финальный счёт: **151 тест зелёный** (139 vitest + 12 playwright).

### 19.8. 10 категорий слепых зон тестирования

Методичка из Кит-1:
[`.business/спеки/2026-05-06-blind-spots-testing.md`](
../../.business/спеки/2026-05-06-blind-spots-testing.md).

1. **Render correctness** — компонент получил правильные данные, но
   нарисовал неверно. Лекарство: render-tests.
2. **State↔visual invariants** — store говорит «нет воды», SVG
   показывает 25 мл. Лекарство: инварианты в property-fuzzer.
3. **Physics realism** — технически работает, физически невозможно.
4. **Edge cases композиции состояний** — каждое поле валидно,
   комбинация — абсурд.
5. **Concurrency / race** — pointermove/up несинхронизированы, два
   pointerdown'а одновременно.
6. **Visual layout** — z-index, overflow, scale при разных viewport'ах.
   Лекарство: Playwright visual regression.
7. **Accessibility** — `aria-label` отражает «сумму всех переменных»,
   а не «что видит ученик».
8. **Persistence / serialization** — `saveState()` теряет поле,
   `loadState()` ставит дефолт.
9. **Reset / cleanup leaks** — DOM-listener'ы, localStorage, RAF id.
10. **Lifecycle компонентов** — `attributeChangedCallback` не
    срабатывает на первичной установке.

**Каждый найденный баг → новый regression-тест** (не «починил и забыл»).

### 19.9. Vitest OOM на heavy DOM-тестах

Happy-dom + customElements + множественные mount/unmount копят
shadow-DOM-метаданные между тестами и упираются в OOM на ~500 MB
worker'е. Решение в `vite.config.ts`:

```ts
test: {
  pool: 'forks',
  poolOptions: {
    forks: {
      execArgv: [
        '--max-old-space-size=8192',
        '--max-semi-space-size=512',
        '--expose-gc',
      ],
    },
  },
  isolate: true,
  fileParallelism: false,
}
```

И в test-файле — `globalThis.gc?.()` в `afterEach`. Для тяжёлых
файлов с 50+ тестами — один `screen.mount()` в `beforeAll`,
`screen.reset()` в `beforeEach` (а не mount/unmount каждый тест).

### 19.10. Эталонные файлы Кит-1

- `experiments/kit-1-hydrostatics/src/screens/density-solid/DensityExperiment.ts` —
  оркестратор с reverse drag-handler.
- `experiments/kit-1-hydrostatics/src/screens/density-solid/controller/DragDropController.ts` —
  pointer-based DnD с grab-offset, source-as-component support.
- `experiments/kit-1-hydrostatics/src/ui/components/lab-graduated-cylinder.ts` —
  «не рисуй воду из ниоткуда» (level=0 ⇒ height=0).
- `experiments/kit-1-hydrostatics/src/styles/density-experiment.css` —
  CSS «placed карточка как пустая ячейка», dropzone-hover, overlay
  hide-on-drag.
- `experiments/kit-1-hydrostatics/src/__tests__/density-drop-combinations.test.ts` —
  63 кейса полной матрицы A-H.
- `experiments/kit-1-hydrostatics/src/__tests__/density-property-fuzzer.test.ts` —
  fast-check с visual инвариантами.
- `experiments/kit-1-hydrostatics/e2e/drag-drop.spec.ts` —
  9 e2e сценариев (happy, reverse, return-to-kit, ghost-correctness…).
- `experiments/kit-1-hydrostatics/e2e/visual-regression.spec.ts` —
  3 baseline screenshots с `animations: 'disabled'`.

Все эти файлы — можно копировать структурно для новых опытов.

### 19.11. Уроки опыта 1.2 (Кит-1 / Архимед)

Опыт 1.2 «Архимедова сила в воде» закрыт 2026-05-07 — 498 vitest-тестов
зелёных (физика 91 + state-machine 22 + 6c-UX 22 + property fuzzer 7 +
component-render 80+ + остальные). Ниже — реальные грабли и решения,
актуальные для всех будущих опытов Кит-1 и шире.

#### 19.11.1. ФИПИ-нумерация Кит-1 — сверять до строчки кода

**Грабли:** в `main.ts` Кит-1 и в `experiments/home/src/data/kits.ts`
черновой план содержал опыты «1.2 Плотность жидкости», «1.3 Выталкивающая
сила», «1.4 Условия плавания», «1.5 Плотность раствора (ареометр)».
Этот план **не был сверен с ФИПИ-СПЕЦ-2026 Приложение 2 (стр. 16)**.
По факту в Комплекте №1 — **5 опытов и только они**, а «плотности жидкости»,
«плавания тел», «ареометра» в перечне ФИПИ нет вообще.

**Решение:** перед стартом любого опыта — **дословно процитировать**
Приложение 2 ФИПИ-СПЕЦ в спеке (см. §0 спеки 1.2). Соль и палочка из
Кит-1 предназначены **только** для приготовления солёного раствора в
опыте 1.4 «Зависимость F_A от плотности жидкости», а не для измерения
плотности раствора как такового.

Канонический список Кит-1 (он же — комментарий в `main.ts`):
```
1.1 — Плотность вещества (density-solid) ✓
1.2 — Архимедова сила в воде (archimedes) ✓
1.3 — Зависимость F_A от объёма погружённой части (цилиндр №3 со шкалой)
1.4 — Зависимость F_A от плотности жидкости (соль + раствор)
1.5 — Независимость F_A от массы тела (цилиндры №1 и №2 равного V)
```

**Применимо ко всем опытам:** прежде чем кодировать spinoff из
существующего опыта — открыть PDF ФИПИ, найти пункт, скопировать
формулировку дословно в спеку.

#### 19.11.2. Custom-element constructors не должны setAttribute / tabIndex

**Грабли:** в `lab-metal-weight` и `lab-beaker` constructor содержал
`this.tabIndex = 0` и `this.setAttribute('role', 'button')`. В опыте 1.1
все web-component'ы статически прописаны в HTML — конструктор там
вызывается до парса атрибутов, и Chrome это терпит. В опыте 1.2
оркестратор создаёт цилиндры и стакан **динамически** через
`document.createElement('lab-metal-weight')` — упало с
`NotSupportedError: The result must not have attributes` (DOM 4.13.6
spec § «create an element»).

**Решение:** все host-attributes (`tabIndex`, `setAttribute('role')`,
`setAttribute('aria-*')`, `setAttribute('aria-label')`) переносить в
`connectedCallback()`. Если нужно вызвать в `attributeChangedCallback` —
guard через `if (this.isConnected)`.

```ts
constructor() {
  super();
  this.attachShadow({ mode: 'open' });
  // НЕ this.tabIndex = 0; НЕ this.setAttribute(...)
}

connectedCallback() {
  if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
  if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
  // … render
}
```

**Это обязательный паттерн** для всех новых `lab-*` компонентов —
опыты следующих китов наверняка будут динамически создавать оборудование
оркестратором.

#### 19.11.3. Координация позиций приборов через CSS-переменную сцены

**Грабли:** на сцене 1.2 все приборы (динамометр, стакан, цилиндр)
жёстко позиционировались `left: 50%`. Когда добавили floating-журнал
справа (520px width), он перекрыл стакан в центре сцены и закрывал
шкалу динамометра при опускании в воду.

**Решение:** ввели CSS-переменную `--scene-center-x: 36%` на корне
`.archimedes-stage-area`, все mount-точки приборов используют
`left: var(--scene-center-x, 50%)`. Журнал справа уважается, центр
сцены смещается влево от 50% к 36%.

```css
.archimedes-stage-area {
  --scene-center-x: 36%; /* учёт floating-журнала справа */
}
.archimedes-stage-area .dynamometer-mount,
.archimedes-stage-area .beaker-mount,
.archimedes-stage-area .clamp-line {
  left: var(--scene-center-x, 50%);
}
```

**Применимо для будущих опытов** с floating-панелями (журнал, теория,
теорема): любой floating-блок справа = переменная `--scene-center-x` в
CSS, не магические числа в каждом mount'е.

#### 19.11.4. Implicit scaffolding (PhET-pattern) в журнале

**Принцип:** не показывать формулу до того, как ученик собрал данные.
В опыте 1.2 формула `F_A = P_возд − P_жид` появляется в журнале
**только после** первой полной строки (когда у ученика на руках уже
есть `P_возд` и `P_жид`). До этого — скрыта (`opacity: 0`,
`pointer-events: none`).

Аналогично — bonus-шаг stepper'а «Сравните с теорией ρgV» появляется
**после** первой ✓ в строке. Это уважает ритм познания «сначала факт,
потом обобщение», а не «сначала формула, потом подтверждение».

**Применимо ко всем теоретическим формулам** в любом опыте: формула
скрыта, пока нет первой подтверждающей строки. Уровень визуального
шума снижается, ученик не «гуглит ответ» в шапке журнала.

#### 19.11.5. HintEngine — ambient pulse + inactivity

**Принцип:** не модальные подсказки и не tutorial-туры.
Подсказки в 1.2 устроены три уровнями:
- **Ambient pulse** — gold-pulse класс на «правильной» карточке
  оборудования (auto-выбирается по фазе опыта). Без слов, glow 0.3 → 0.6 → 0.3,
  1500 мс, в фоне.
- **Inactivity** — 6 секунд бездействия в фазе → текстовая подсказка
  над hint-bar («Подвесь цилиндр на крючок»).
- **3 неудачных drop подряд** — warning-подсказка («Цилиндр должен
  висеть на крючке динамометра — попробуйте ещё раз»).

Эталон — `screens/archimedes/controller/HintEngine.ts`. Применимо ко
всем интерактивным опытам Кит-1+.

#### 19.11.6. Auto-save + restore-toast

**Принцип:** localStorage ключ `kit-1:archimedes:state`, throttle 5
секунд + immediate-save при commit/reset. TTL 1 час.

При повторном mount — если есть свежий snapshot < 1 ч → restore +
banner-toast «Восстановлено состояние от HH:MM» с action «Сбросить»
(8 секунд, lab-toast с typed action). Если snapshot старше TTL —
выкидывается.

Никаких confirm-modal'ок «вы уверены, что хотите восстановить?» —
автоматический restore + быстрый undo. Эталон —
`screens/archimedes/controller/StateStore.ts` + `lib/undo.ts`.

#### 19.11.7. Undo-toast вместо confirm-modal (CHI 2024 «Just Undo It»)

**Принцип:** при reset / commit / удалении — мгновенно сделать действие
+ создать `<lab-toast>` с action «Отменить» и duration 5000 мс. UndoStack
хранит snapshot предыдущего state, по `action-clicked` —
`undoStack.pop()` + `restoreState(snapshot)` + `dismiss('action')`.

Никаких `window.confirm()` / `alert()`: они блокируют поток обучения,
ломают touch-UX на iPad и не локализуются для скринридеров.

Эталон тестов — `src/__tests__/lab-toast.test.ts` (22 кейса) +
`screens/archimedes/__tests__/experiment-6c.test.ts` (commit-toast,
reset-toast, restore-toast — все 6 сценариев undo).

**Применимо ко всем опытам:** ни один деструктив без undo-toast.

#### 19.11.8. Геометрия погружения — опускать динамометр, не поднимать стакан

**Решение:** при dip — динамометр анимируется вниз на адаптивное
смещение `state.dipOffsetPx` (translateY), цилиндр оказывается внутри
стакана; стакан стоит на месте. Длительность 600 мс ease-out, после
этого — `force` пересчитывается на `P_жид`, RAF anime'тся за 800 мс.
Сам offset вычисляется через `#computeDipOffset()` из
`getBoundingClientRect()` сцены — см. §19.11.14 «Адаптивный DIP».

Это проще и реалистичнее, чем поднимать стакан вверх (стакан с водой
никто руками не поднимает на динамометр, наоборот). Вода в стакане
поднимается на ΔV = V_цилиндра — рассчитывается в `lab-beaker`
по `setSubmergedVolumeMl()`.

#### 19.11.9. «Невидимый зажим» вместо штатива (ФИПИ-Кит-1 без штатива)

**Принцип:** в Комплекте №1 ФИПИ штатива **нет**. Реально на ОГЭ
ученик держит динамометр в руке, второй рукой подсаживает стакан.
В UI этого нельзя нарисовать буквально (мультяшно), но и просто
«висящий в воздухе динамометр» выглядит сломанным.

Решение PhET-style: тонкая серая `<line>` opacity=0.3 (1px stroke) от
верхнего крюка динамометра до точки фиксации сверху сцены — как будто
его держит лаборант невидимой нитью. Так же сделано в PhET «Density»
и «Buoyancy».

Этот же приём — `experiments/kit-1-hydrostatics/src/styles/archimedes-experiment.css`,
класс `.clamp-line`. Применимо для всех опытов Кит-1 и Кит-7
(динамометр / термометр в руке без штатива).

#### 19.11.10. RU-форматирование чисел — единый `#formatN()`

**Принцип:** во всех числовых выводах (LCD динамометра, журнал,
hover-индикатор шкалы, ARIA-label) — **запятая** как десятичный
разделитель. По ОГЭ российская школа работает с запятой, не точкой.

**Один источник истины:** приватный метод `#formatN(value, digits)`
в `lab-dynamometer`. Не оставлять `value.toString()` /
`value.toFixed(2)` без последующего `.replace('.', ',')`.

```ts
#formatN(value: number, digits = 2): string {
  return value.toFixed(digits).replace('.', ',');
}
```

Тесты — `src/__tests__/lab-dynamometer.test.ts` проверяет наличие
запятой во всех numeric outputs. Применимо ко всем числовым
компонентам всех опытов.

#### 19.11.11. A11y — color contrast WCAG 2.2 AA

**Грабли:** axe-scan на пустой сцене 1.2 нашёл **5 contrast violations**
в `lab-equipment-card .action` / `.status` (3.05/2.99 ratio, нужно ≥4.5)
и `lab-journal .unit` (2.42 — teal-400 на белом). Все вторичные
текстовые цвета были перетянуты «дизайнерским» вниз.

**Решение:** все вторичные текстовые цвета подняты выше 4.5:1.
Конкретно — `#7adcd0` (teal-300 + light shift) для action/status
карточек, `#0d6e62` (teal-700) для unit в журнале.

**Применимо ко всем опытам:** перед сдачей прогнать axe-core scan на
4 ключевых state'ах (idle, in-progress, journal-with-rows, mobile).
Любой ratio < 4.5:1 для текста — баг, не «эстетика».

#### 19.11.12. Visual regression — `animations: 'disabled'` обязателен

**Принцип:** при baseline screenshot всегда передавать
`animations: 'disabled'` Playwright-у + ставить `maxDiffPixels: 200`.
Иначе — flaky тесты: spring-animation в момент снимка зафиксирует
любой кадр между [0, 1].

```ts
await expect(page).toHaveScreenshot('archimedes-empty.png', {
  animations: 'disabled',
  maxDiffPixels: 200,
});
```

Эталон — `e2e/archimedes-visual.spec.ts`. **Применимо ко всем visual-
regression тестам** во всех опытах.

#### 19.11.14. Адаптивный DIP — getBoundingClientRect, не хардкод

**Грабли:** в первой версии опыта 1.2 был зафиксирован
`const DIP_Y_OFFSET_PX = 312` (px на сцене), подобранный замером
**только на 1440×900**. На 1366×768 (распространённый viewport ноутбука)
сцена короче — `beaker_top` подъезжает вверх, а dyno+цилиндр едут
вниз на те же 312px. Результат: цилиндр пробивает дно стакана
(`margin_above_bottom = −12.4 px`).

**Решение:** Y-смещение dyno+цилиндра при погружении вычисляется
**адаптивно** перед каждым `dipCylinderInWater()` через реальные
DOM-координаты. Метод `#computeDipOffset()` (см.
`ArchimedesExperiment.ts`):

```ts
#computeDipOffset(): { offsetPx: number; partialDip: boolean } {
  const cylRect = cylinderHost.getBoundingClientRect();
  const beakerRect = beakerHost.getBoundingClientRect();
  const waterY = parseFloat(beakerEl.shadowRoot.getElementById('bk-water')
                  .getAttribute('y') ?? '0');
  const scaleY = beakerRect.height / 130;     // viewBox 96×130
  const waterTopDom = beakerRect.top + waterY * scaleY;
  const currentDy = this.#getCurrentCylDy(); // парс inline transform
  const baseCylTop = cylRect.top - currentDy;

  // Цель: cyl_top = water_top + DIP_SAFETY_TOP_PX (8 px).
  let offset = waterTopDom + 8 - baseCylTop;
  // Защита от пробития дна: cyl_bot < beaker_bot − 12.
  const maxAllowedBot = beakerRect.bottom - 12;
  let partialDip = false;
  if (baseCylTop + offset + cylRect.height > maxAllowedBot) {
    offset = maxAllowedBot - cylRect.height - baseCylTop;
    partialDip = true;
  }
  return { offsetPx: Math.max(0, offset), partialDip };
}
```

Сохраняется в `state.dipOffsetPx` (поле State), читается из
`#renderDynamometer` / `#renderCylinder`. Drag-by-thread тоже
вызывает `#computeDipOffset()` для верхней границы clamp'а
(не позволяет preview-drag пробить дно).

**Обязательно тестировать на 4 viewport'ах** перед merge:
1920×1080, 1440×900, 1366×768, 1280×720. Все четыре — инварианты
I1 (cyl под водой) + I2 (зазор до дна) + I3 (overlap ≥ 50px при
height ≥ 800 / ≥ 30px при height < 800) ДОЛЖНЫ проходить. См.
`e2e/archimedes-dip-geometry.spec.ts` — `test.describe.each(VIEWPORTS)`
с 4 кейсами GEO-1.

**ResizeObserver на сцене**: при ресайзе окна, если цилиндр в воде,
пересчитываем `dipOffsetPx` — иначе цилиндр уплыл бы относительно
стакана. См. `ArchimedesExperiment.ts` constructor.

**Применимо ко всем опытам**, где приборы анимируются на фиксированный
pixel-offset на абсолютно-позиционированной сцене: жёстко не
задавать, считать через `getBoundingClientRect()` или CSS-переменные
сцены, тестировать на всех брейкпоинтах.

#### 19.11.15. detach-btn ВСЕГДА видим — каскадный detach зависимостей

**Принцип:** крестик ⌫ — это **стандарт всех опытов** «убрать прибор
со сцены». Видимость определяется ТОЛЬКО размещением прибора, не
фазой и не наличием зависимых приборов:

- `#ar-detach-dyno` viewable ⇔ `state.dynoRange !== null`
- `#ar-detach-cyl` viewable ⇔ `state.cylinderId !== null`
- `#ar-detach-beaker` viewable ⇔ `state.beakerOnScene === true`

В первой версии 1.2 крестик скрывался по фазе (`detach-cyl` исчезал в
воде; `detach-dyno` исчезал когда на крюке цилиндр). Это нарушало
принцип «полная имитация реального мира» (CLAUDE.md): в реальной
лаборатории всё доступно для манипуляции в любой момент.

**Каскадная логика в handler'ах**:

- `returnBeakerToKit()` → если `inWater` → сначала `liftCylinderFromWater()`
  → затем убираем стакан. Цилиндр остаётся висеть на нити в воздухе.
- `returnDynamometerToKit()` → если `cylinderId !== null` → сначала
  `detachCylinder()` (он сам сделает lift, если был в воде) → затем
  убираем динамометр.
- `detachCylinder()` сам обрабатывает `inWater`: `cancelAnim()` +
  `inWater: false` + `dipOffsetPx: 0` в одном `store.set()`.

**Никаких confirm-modal'ок**. Каскад выполняется мгновенно. Если ученик
ошибся — undo через toast (см. §19.11.7).

**Анти-паттерн:** проверки «можно ли сейчас detach» в render. Render
только показывает/скрывает крестик по факту размещения; решение «что
делать при click» — в handler'е, не в render. Если render блокирует
видимость — ученик «не видит» способ убрать прибор и думает, что
интерфейс сломан.

**A11y-нюанс:** если mount-host ((`role="button"`)) сам интерактивный
(жест dip/lift на цилиндре), вложенная focusable detach-кнопка даёт
axe violation `no-focusable-content` (WCAG 4.1.2) и/или
`target-size` (WCAG 2.5.8). Решение для таких host'ов — **выносить
detach-кнопку из родителя**, рендерить как sibling в stage,
позиционировать через JS из `host.getBoundingClientRect()` и
`stage.getBoundingClientRect()`. Анимировать через `transform:
translateY(dy)` синхронно с host'ом (`transition: transform 600ms`).
Эталон — `#syncDetachCylPosition()` в `ArchimedesExperiment.ts`,
template — `#ar-detach-cyl` рендерится как direct child `#ar-stage`.

**Сопутствующее правило a11y:** если другой `role="button"` элемент
(например, `lab-beaker`) визуально перекрывается интерактивным host'ом
(цилиндр в воде), снять с него `role` и `tabindex` на время перекрытия
— иначе target-size violation о «слипшихся» targets.

#### 19.11.18. Drag/click race + z-index overlap (3 связанных бага сценария «опустить груз в воду»)

В feedback-сессии «не могу записать показания после погружения» обнаружено
**три каскадных бага**, каждый из которых превращает корректную физику в
сломанный UX. Все три воспроизводятся, только когда ученик пользуется
**мышью** (через MCP playwright или реальный ввод) — программный API через
`window.archimedesExperiment.dipCylinderInWater()` работал штатно, поэтому
unit-тесты пропускали проблему.

**Баг 1 — z-index overlap пешеходно перехватывает pointerdown.**
`.ar-mount--cylinder` и `.ar-mount--beaker` оба имели `z-index: 5`, и
DOM-order ставил стакан **поверх** цилиндра в зоне overlap (~56×49 px у
нижней кромки цилиндра при frac=0). `document.elementFromPoint(cyl_center,
cyl_bottom-10)` возвращал `LAB-BEAKER`. Drag-by-thread начинался только
если ученик ловил верх корпуса; нижняя половина «не реагировала».

> **Фикс:** `.ar-mount--cylinder { z-index: 7 }` (выше beaker:5 и
> thread-overlay:6). [archimedes-experiment.css L286-301](experiments/kit-1-hydrostatics/src/styles/archimedes-experiment.css)
> + e2e-инвариант `elementFromPoint(cyl_bottom)` обязан быть `LAB-METAL-WEIGHT`.

**Баг 2 — `liftCylinderFromWater` сбрасывает phase до `cyl-attached`.**
Ветка `s.phase === 'liquid-recorded' ? 'liquid-recorded' : 'cyl-attached'`
не учитывала, что **стакан с водой по-прежнему стоит на сцене**. После
auto-snap revert (drag не дотянул до 0.5) сценарий-stepper откатывался к
шагу «Налейте воду», CTA показывала «Записать P возд» вместо «Записать
P жид». Аналогичный баг в `#finalizeDrag` (та же копи-паста).

> **Фикс:** учесть реальное состояние сцены при выборе фазы:
> `liquid-recorded ? liquid-recorded : (beakerOnScene && waterMl>0 ?
> water-poured : beakerOnScene ? beaker-on-scene : cyl-attached)`. Один
> хелпер на оба места. [ArchimedesExperiment.ts L743-755 и L1500-L1517](experiments/kit-1-hydrostatics/src/screens/archimedes/ArchimedesExperiment.ts).

**Баг 3 — синтетический click после успешного drag → откат через lift.**
Браузер после `pointerup` на том же элементе синтезирует `click` event.
Существующий guard `if (this.#verticalDrag?.didTrigger)` не помогал —
к моменту click `#verticalDrag` уже `null` (успели вызвать
`#endVerticalDrag()`). Поток событий:
`pointerup → finalizeDrag(dip) → endVerticalDrag → click → handleCylinderClick → #canLift → lift!`
В итоге ученик **видел dip → через 50 мс revert** в air-state с CTA
«P возд», без объяснений.

> **Фикс:** timestamp suppression. Поле `#lastDragFinalizedAt`
> обновляется в upListener при `didTrigger=true`; click-handler гасит
> событие, если прошло меньше 250 ms. Это стандартный паттерн «click
> после drag в том же жесте — синтетический, не ученический». 250 мс —
> широкий запас (synthetic click обычно приходит ≤50 мс), отдельный
> click ученика придёт сильно позже. [ArchimedesExperiment.ts L341-349, L1593-L1604](experiments/kit-1-hydrostatics/src/screens/archimedes/ArchimedesExperiment.ts).

**Тестовая мораль (важно).** Все три бага не ловились существующим
покрытием, потому что **vitest и program-API e2e** идут через
`exp.dipCylinderInWater()` напрямую — не через мышь. Добавлен
[archimedes-student-flow.spec.ts](experiments/kit-1-hydrostatics/e2e/archimedes-student-flow.spec.ts):
**настоящий** `page.mouse.move/down/up` с реалистичным многоступенчатым
drag, проверяет инварианты (1) phase + inWater после drag (2) CTA visible
с правильным текстом (3) запись в журнал не откатывается через 700 ms.
Без таких тестов любой будущий drag/click баг останется невидим до
жалобы пользователя.

> **Правило для будущих опытов:** для каждого жеста, который ученик делает
> **мышью** (drag, double-click, hover-trigger), должен быть e2e-тест
> через реальный page.mouse, а не программный API. Иначе синтетические
> click/touch race-conditions проходят мимо CI.

#### 19.11.19. Эталонные файлы опыта 1.2

- `experiments/kit-1-hydrostatics/src/screens/archimedes/ArchimedesExperiment.ts` —
  оркестратор (~2000 строк) с программным API (`attachCylinderById`,
  `commitMeasurement`, `dipDynamometer`, `reset`).
- `experiments/kit-1-hydrostatics/src/screens/archimedes/controller/HintEngine.ts` —
  3-уровневая система подсказок (ambient pulse + inactivity + warning).
- `experiments/kit-1-hydrostatics/src/screens/archimedes/controller/StateStore.ts` —
  auto-save / restore с TTL.
- `experiments/kit-1-hydrostatics/src/lib/undo.ts` — UndoStack для тостов.
- `experiments/kit-1-hydrostatics/src/ui/components/lab-toast.ts` —
  undo-тост с typed action и duration.
- `experiments/kit-1-hydrostatics/src/ui/components/lab-journal.ts` —
  paper-aesthetic журнал с implicit scaffolding формулы.
- `experiments/kit-1-hydrostatics/src/screens/archimedes/__tests__/experiment-6c.test.ts` —
  22 кейса UX (HintEngine, stepper, undo-toast, auto-save).
- `experiments/kit-1-hydrostatics/e2e/archimedes-a11y.spec.ts` —
  axe-core на 4 ключевых state'ах с 0 violations.

## 20. UX-стандарт «Оборудование» — единый канон для всех опытов

Кросс-репозиторный стандарт: в Inter_OGE четыре опыта живут в трёх SPA
(`kit-1-hydrostatics`, `kit-2-forces`, отдельные `2-1-spring`/
`2-2-friction`). Чтобы ученик, сдав один опыт, в следующем не учил
интерфейс заново, **жесты, кнопки и текст обязаны совпадать**. Эта глава
— контракт, обязательный для каждого нового опыта и для миграции
существующих.

Принцип: **полная имитация реального мира** (CLAUDE.md §1). Если в
реальной лаборатории прибор можно взять и поставить куда угодно, его
цифровой двойник обязан позволять то же. Если в реальности есть полка
с оборудованием — у нас правая палитра. Если есть карандаш для записи
в журнал — это явная кнопка «Записать», а не молчаливая авто-запись.

### 20.1. Правило 1 — единый pointer-based DragController

**Один shared контроллер** в `experiments/_shared-spa/controller/
DragController.ts` (база — версия из `2-1-spring`, расширенная
декларативной API из density-solid). HTML5 native DnD **не используется**
ни в одном опыте: он не работает на сенсорных школьных панелях, ломает
hit-detection в shadow DOM Web Components, не даёт контроля над
ghost-image.

**API контроллера — двухуровневое:**

- **Декларативно** — ученик/разработчик не пишет JS:
  - `data-draggable="<eqId>"` на источнике (карточка палитры или прибор
    на сцене); опционально `data-drag-kind="<kind>"`.
  - `data-dropzone="<accepts:csv>"` + `data-dropzone-id="<zoneId>"` на
    зонах. `accepts` — список eqId или префиксов с `*` (`cyl-*`).
  - При drop: `controller.onDrop({ eqId, dropzoneId, pointerX, pointerY })`
    — единая точка-каскад, которую слушает оркестратор.

- **Императивно** — для специфики (геометрические зоны, snap-радиус):
  - `controller.attach(element, { equipmentId, kind, onDragStart?,
    onDragEnd? })` — JS-handle, возвращает detach-функцию.
  - `controller.addSnapZone({ id, accepts, getRect, snapRadius?,
    onHover?, onDrop })` — для зон, чьи координаты считаются
    динамически (например, крюк динамометра).

**Drag visuals — single instance, без ghost-clone'а.** Сам элемент
переезжает в overlay (`position: fixed`, `z-index: 1000`), на pointerup
либо «прилипает» к зоне (`onDrop` возвращает true), либо плавно
анимирует возврат на `homeRect` (Web Animations API, 320 мс,
`cubic-bezier(0.34, 1.4, 0.64, 1)` — мягкий bounce). Это семантически
честно: один реальный груз — один digital-узор, состояние не
дублируется.

> **Исключение для kit-1.** В density-solid и archimedes сейчас 7 цилиндров
> и 2 динамометра живут как **картинки в карточках палитры** — клон при
> drop. Их миграция на single-instance — отдельная фаза (§20.6, шаг 4),
> требующая переделки `lab-equipment-card`. До неё в этих опытах
> разрешён ghost-clone-режим контроллера через флаг
> `controller.attach(el, { ghost: true })`.

### 20.2. Правило 2 — свободное перемещение по сцене (variant B)

**Любой прибор, размещённый на сцене, может быть подобран pointer-down
и перенесён** — либо в другую совместимую snap-зону, либо обратно в свою
карточку палитры (drop на `[data-dropzone-id="card-<eqId>"]`), либо
brokes за пределы — bounce-back на текущую позицию.

**Запрещено:** блокировать pointerdown через атрибут `attached=""`
(сейчас так делают 2-1/2-2). Атрибут оставить **визуальным маркером**
для CSS, но drag через него должен проходить. Альтернатива для случаев,
когда программа реально хочет «приколоть» прибор (например, во время
RAF-анимации): `data-pin="true"` — короткоживущий, контроллер уважает,
ставится из оркестратора по необходимости.

**Snap-зоны magnetic.** Drop в радиусе `snapRadius` (default 80 px) от
центра зоны — прилипает; за радиусом — не считается «попаданием».
Снижает frustration «промахнулся на 5 px и всё откатилось».

**Архимед drag-by-thread остаётся специальным жестом.** Это **не
DragController** — это локальный `pointermove` listener, ограниченный
вертикалью, без переноса в overlay. Контроллер про него не знает; на
цилиндре включают drag-by-thread когда выполнено
`canDip || canLift`, иначе — обычный re-drag через DragController.

### 20.3. Правило 3 — крестик `×` на каждом приборе на сцене

**Утилита `attachDetachButton(el, opts)`** в `experiments/_shared-spa/
ui/detach-button.ts` создаёт стандартизованную кнопку:

- размер `28×28 px`, абсолютная позиция в правом-верхнем углу
  (`top: -10px; right: -10px`);
- visual: серый круг `rgba(0,0,0,0.55)`, на hover красный `#dc2626`,
  крест внутри `×` (Unicode `×`, font-size 18px, line-height 1);
- `aria-label="Убрать <prettyName> в комплект"`;
- focusable + keyboard activate (Enter/Space + клавиша Delete на
  родителе);
- click → callback `opts.onDetach(eqId)`, который оркестратор обязан
  обработать **каскадно** (если убираем стакан с цилиндром в нём —
  сначала lift цилиндра).

**`×` ВСЕГДА видим**, как только прибор на сцене. Запрещено скрывать по
state (например, «во время dip нельзя убрать» — это решает оркестратор
в handler'е, а не render). Урок §19.11.15 (Discoverability) ratifies
это правило.

**A11y-нюанс §19.11.15:** если родитель сам `role="button"` (цилиндр в
архимеде — interactive host для drag-by-thread), detach-кнопку рендерим
**sibling'ом** в stage и позиционируем через JS (см.
`#syncDetachCylPosition` в `ArchimedesExperiment.ts`). Иначе axe ругается
`no-focusable-content`.

### 20.4. Правило 4 — запись в журнал ручная по умолчанию + toggle

**Default = manual.** Кнопка «Записать `<имя_величины>` = `<значение>`
Н» появляется внизу сцены, когда:
- `state.stable === true` (показание устаканилось),
- `phase === '<measure>-ready'` (фаза готовности к данному измерению),
- значение валидно (нет overload, не NaN).

Текст кнопки **показывает само значение** (e.g. `«✏ Записать P жид =
0,10 Н»`) — это финальная проверка для ученика, что он смотрит на
правильное число прибора. Это тренирует ключевой навык ОГЭ:
**умение прочитать прибор** и **доверять собственному глазу**, а не
ждать пока программа автоматически зафиксирует.

**Toggle «Авто-режим»** — переключатель в шапке журнала. Сохраняется
в `localStorage["kit-X-record-mode"]`, default `manual`. В авто-режиме
запись происходит автоматически по тем же триггерам (stable + ready),
без кнопки. Используется для скоростной тренировки, когда ученик уже
владеет навыком чтения и не хочет нажимать кнопку каждый раз.

**Запрещено:** «авто-форма с правкой» (как сейчас в 2-1/2-2: после
кнопки открывается модальное окно с input'ами, куда ученик
**перенабирает** значения). Это анти-педагогично — снимает с ученика
ответственность за чтение прибора, превращает в «угадай, что программа
ожидает». В новом стандарте: кнопка пишет ровно то, что показывает
прибор, без промежуточной формы. Если нужна правка — отдельный editing
state в журнале (двойной клик по строке, как в density-solid).

### 20.5. Правило 5 — keyboard parity

Каждое pointer-действие имеет клавиатурный эквивалент:
- `Tab` → focus карточка/прибор → `Enter` или `Space` = pick & place
  (default snap-зона);
- `Tab` → focus прибор на сцене → `Delete` или `Backspace` = detach;
- `Tab` → focus record-кнопка → `Space` = записать в журнал.

**Цель:** ученики на школьных компьютерах с несовершенной мышью / тачем
должны проходить опыт без курсора. Это и a11y-требование (WCAG 2.1.1
Keyboard), и педагогически честно (некоторые ОГЭ-классы оборудованы
только клавиатурами).

### 20.6. Миграция существующих опытов — phased plan

Работа разбита на **5 коммитов**, после каждого vitest+e2e зелёные.

> **Статус (2026-05-08):** Phase 1, 2 завершены. Phase 3-4 объединены
> через семантическую унификацию (см. ниже). Phase 5 отложена.

**Фаза 1 — shared infrastructure** ✓ выполнена (никаких visible changes):
- `experiments/_shared-spa/controller/DragController.ts` — единый
  контроллер, расширение версии 2-1-spring с декларативным data-API.
- `experiments/_shared-spa/ui/detach-button.ts` — `attachDetachButton()`
  утилита.
- `experiments/_shared-spa/ui/record-mode-toggle.ts` — toggle компонент
  + `getRecordMode(kitId)` / `setRecordMode(kitId, mode)` хелперы для
  localStorage.

**Фаза 2 — kit-2 опыты на shared controller + free-drag со сцены:**
- 2-1-spring: import shared, снять `attached=""` блокировку drag,
  добавить ручной режим записи (toggle default manual вместо «всегда
  форма»).
- 2-2-friction: то же самое.

**Фаза 3 — Архимед на shared controller:**
- import shared, переписать `DragDropController` на тонкую обёртку.
- drag-by-thread оставить как отдельный handler.
- detach-кнопки переключить на `attachDetachButton()`.
- record-mode toggle уже работает (запись и так ручная).

**Фаза 3 — kit-1 (Архимед + Density) — семантическая унификация ✓:**
- DragController в density-solid (`DragDropController`) и shared
  следуют **одному data-attr контракту** (`data-draggable`,
  `data-dropzone="<csv>"`, `data-dropzone-id`, `accepts` с `*`-префиксом).
- Это даёт «одинаковую семантику для ученика и для разработчика», даже
  если physical implementations пока разные. Ghost-clone-режим в density
  необходим (палитра-карточка хранит preview, на сцене — другой
  экземпляр) — `DragDropController` это правильно решает,
  и переписывать его на shared прямо сейчас не нужно.
- detach-кнопки в обоих опытах унифицированы через
  `attachDetachButton()` (см. §20.3).

**Фаза 4 — record-mode toggle во всех 4 опытах ✓:**
- Все журналы импортируют `renderRecordModeToggle()` из shared.
- Default `manual` — кнопка «Записать ...» появляется при ready+stable.
- Auto-режим включается toggle'ом (сохраняется в
  `localStorage["inter-oge.record-mode.<kitId>"]`).
- В density-solid авто-запись (старое поведение) теперь **только** при
  включённом auto-режиме. Default = manual.

**Фаза 5 — physical dedup DragController (осознанно отложено):**
- Слияние `density-solid/DragDropController` в shared **семантически уже
  выполнено** через единый contract (data-draggable, data-dropzone="csv",
  `accepts` с `*`-префиксом, data-drop-active/data-drop-hover). Любой
  ученик / разработчик / тест видит **один** интерфейс drag-and-drop
  во всех опытах; различие только в внутренней реализации.
- **Physical dedup** (один JS-класс) требует расширения shared API:
  hook `createGhostElement?: (source, eqId) => HTMLElement` (для
  density-specific клонирования web-component'ов, с очисткой
  `density-overlay-*` классов и принудительным `--w-size: 76px`),
  hook `onGlobalDragStart/End?: (eqId) => void` (для подсветки всех
  совместимых зон сразу через data-drop-active). Эти hook'и — лишняя
  сложность для kit-2, который их не использует.
- Чище: внести их одновременно с **single-instance refactor**
  `lab-equipment-card` (карточка хранит сам компонент, при drag
  вынимает; устраняет ghost-clone семантически). После него
  density перейдёт на shared без hook'ов, потому что custom ghost
  больше не нужен.
- Большой PR, ~6-8 часов; делается отдельной итерацией. До этого
  момента density's `DragDropController` живёт как **специализированный
  ghost-renderer**, контракт-совместимый со shared. Тесты §20.7
  не различают реализации — проверяют только контракт.

### 20.7. Acceptance-инварианты — для каждого опыта

После миграции каждый опыт обязан проходить:

1. **Free re-drag со сцены:** прибор, размещённый на сцене,
   pointerdown→pointermove→pointerup в новую зону (или обратно в
   карточку) — переехал. e2e-тест на каждый прибор.
2. **× на каждом размещённом приборе:** `document.querySelectorAll(
   '.lab-detach-btn')` имеет элемент на каждый прибор на сцене.
3. **Click `×` каскадно убирает:** прибор-родитель → если есть
   зависимые → их сначала. e2e через `await detachBtn.click()`.
4. **Record default = manual:** при `localStorage[kit-X-record-mode] =
   undefined`, после ready+stable кнопка `[data-action="record"]`
   visible. Авто-запись **не** происходит.
5. **Toggle auto:** установка `localStorage[kit-X-record-mode] = "auto"`
   → перезагрузка → ready+stable триггерит auto-запись без кнопки.
6. **Keyboard parity:** все жесты воспроизводимы Tab+Enter/Space/Delete,
   axe-core 0 violations.

Эти 6 инвариантов вынесены в общий e2e-helper
`experiments/_shared-spa/e2e/equipment-ux-acceptance.ts` и
импортируются из spec'ов каждого опыта.

### 20.8. Эталонные файлы стандарта

- `experiments/_shared-spa/controller/DragController.ts` — реализация
  правила 1.
- `experiments/_shared-spa/ui/detach-button.ts` — правила 3.
- `experiments/_shared-spa/ui/record-mode-toggle.ts` — правила 4.
- `experiments/_shared-spa/e2e/equipment-ux-acceptance.ts` — правила
  20.7.
- Эта глава (§20 в `2-1-spring/REFERENCE.md`) — нормативный канон;
  расхождения между опытами обсуждаются и фиксируются здесь, не
  размножаются по локальным README.

## 21. «Журнал измерений» — единый стандарт записи

Кросс-репозиторный стандарт записи показаний приборов в журнал.
Применяется ко всем опытам Inter_OGE — текущим (1.1, 1.2, 2.1, 2.2)
и будущим. Дополняет §20 (где про оборудование) — теперь и про
**что/как ученик пишет**.

Принцип: тренировать у ученика **навык расчёта по формулам** (главная
часть 2-й части ОГЭ). Программа — «прибор-помощник», которая ловит
показания и подставляет их в журнал; **ученик считает производные
величины сам** (V, ρ, F_A, k, μ) и проверяет ✓.

### 21.1. Контракт колонок (типы)

Каждая колонка имеет `source ∈ {meta|direct|derived}`:

- **meta**    — контекст (№, цилиндр, поверхность); пишет программа.
- **direct**  — показание прибора (m, V₁, P_возд, l₀…); пишет программа
                в semi-auto/fully-auto, либо ученик сам — в fully-manual.
- **derived** — расчётная величина (V, ρ, F_A, k, μ); ученик вводит
                в semi-auto/fully-manual в input + ✓ проверка с tolerance,
                программа считает в fully-auto.

Контракт TypeScript — `_shared-spa/lib/journal/types.ts`:

```ts
type ColumnSource = 'meta' | 'direct' | 'derived';
interface ColumnSpec {
  key: string;
  label: string;
  source: ColumnSource;
  unit?: string;
  format?: 'int' | 'fixed1' | 'fixed2' | 'fixed3' | 'percent';
  expectedFromRow?: (row: Record<string, number>) => number; // для derived
  tolerance?: number; // default 0.05
}
```

### 21.2. Три режима (single source: `record-mode.ts`) — UX-v2

Toggle в шапке журнала, 3-сегментный switch [Полу-авто | Ручной | Авто]:

| Mode | DOM-сигнал готовности | Запись в журнал | Кнопка ✓ | Verdict-цвета | Подсказки |
|---|---|---|---|---|---|
| **`fully-auto`** | (нет UI) | новая строка автоматом при ready+stable; ВСЕ поля заполнены программой | — | — | — |
| **`semi-auto`** (default) | плашка «Записать в журнал» под журналом | по клику: программа пишет direct+meta; derived ученик вводит inline + ✓ | **есть** | **зелёный/жёлтый/красный** | placeholder = единица |
| **`fully-manual`** | пустая строка появляется в журнале автоматом при ready+stable | новая строка; **ВСЕ** поля (direct+derived) = input | **нет** | **нет** | **нет** (label = только единица) |

Педагогика UX-v2 — три уровня скаффолдинга:
- `fully-auto` — обзор / повторение / скорость. Программа делает всё.
- `semi-auto` — основной режим ОГЭ-2026. Программа фиксирует показания
  приборов, ученик считает производные величины (V, ρ, F_A, k, μ) и
  проверяет ✓. Подсветка ok/close/wrong даёт явный feedback.
- `fully-manual` — подготовка к практическому ОГЭ / ВПР. Ученик читает
  показания приборов руками, пишет ВСЁ сам. Программа не подсказывает
  ни единицы, ни эталоны, ни цвета verdict — как при реальной
  лабораторной без программы-помощника.

Storage key `inter-oge.record-mode.<kitId>`. Migration shim:
`'manual'` → `'semi-auto'`, `'auto'` → `'semi-auto'`. URL-override
`?mode=...` — см. §21.11.

### 21.3. Маппинг колонок по опытам (single source: `specs.ts`)

| Опыт | meta | direct (программа) | derived (input + ✓) |
|---|---|---|---|
| 1.1 Density | №, Цилиндр | m, V₁, V₂ | **V, ρ** |
| 1.2 Архимед | №, Цилиндр, V | P_возд, P_жид | **F_A_изм, F_A_теор, Δ%** |
| 2.1 Spring | № | m, l₀, l₁ | **ΔL, F, k** |
| 2.2 Friction | №, Поверхность | m, F_тр | **N, μ** |

`F_A_теор` в 1.2 — derived (вычисляется по таблице ρgV), но в semi-auto
программа подставляет (это эталон, не «расчёт ученика»). Tolerance per-key:
- V (Density) — 10% (погрешность V₁/V₂ при малых V).
- F_A_изм, k, ρ — 5%.
- Δ% — 20% (Δ малая, относительная ошибка великая).
- μ — 10%.

### 21.4. Verdict colors (visual feedback)

После клика ✓ ячейка получает класс:

- `j-verdict--ok`     зелёный — `|Δ_rel| ≤ tolerance × 0.4` (≤ 2% при default 5%)
- `j-verdict--close`  жёлтый  — между 0.4×tolerance и tolerance
- `j-verdict--wrong`  красный — больше tolerance
- `j-verdict--empty`  пустой  — value не введён

Verdict обновляется **inplace** в существующих cells (без full re-render),
чтобы сохранить позицию каретки в input и стабильные ссылки на DOM
для тестов.

### 21.5. Editing & immutability

- Каждая строка имеет `timestamp` (handle для update/remove).
- Ученик может править значения в input ДО клика ✓ — verdict сбрасывается.
- После ✓ — verdict закрепляется до повторного ввода.
- При reset / detach зависимого прибора — drafts (`#journalDrafts`) и
  verdicts (`#journalVerdicts`) очищаются.

### 21.6. Architecture: shared lib

Public API (single source): `_shared-spa/lib/journal/`

| Файл | Назначение |
|---|---|
| `types.ts` | `ColumnSpec`, `JournalSpec`, `JournalRow`, `JournalVerdict`, `JournalMode` |
| `format.ts` | `formatRu(num, format)` / `parseRu(str)` — RU-формат с запятой |
| `verify.ts` | `verifyDerivedValue(spec, row, value)` / `verifyRow(columns, row)` / `rowVerdictAggregate` |
| `specs.ts` | `DENSITY_SPEC` / `ARCHIMEDES_SPEC` / `SPRING_SPEC` / `FRICTION_SPEC` + `getSpecByExperimentId` |
| `render.ts` | `renderJournalTable(host, spec, rows, opts)` — единый рендерер всех журналов |

Опыт мигрирует на shared journal в 4 шага:
1. Импортировать `renderJournalTable` + spec + verify.
2. Заменить inline-table в template на `<div id="journal-host">`.
3. Заменить `#renderJournal` на shared с onCellInput/onVerify callbacks.
4. Хранить per-row drafts/verdicts в `Map<timestamp, ...>` в оркестраторе.

### 21.7. Acceptance-инварианты (e2e) — UX-v2

Для каждого опыта × режим × сценарий:

1. **semi-auto default**: после ready+stable появляется
   `#record-pending-slot` с кнопкой «Записать в журнал». По click —
   программа пишет direct+meta, derived ученик вводит inline.
2. **derived input + ✓**: ученик вводит число → click ✓ → verdict
   `ok|close|wrong` через CSS class. Tolerance per-key.
3. **fully-manual**: пустая строка появляется автоматически при
   ready+stable. ВСЕ поля = input. **НЕТ** ✓-кнопки, **НЕТ** verdict-классов,
   **НЕТ** placeholder с единицей.
4. **fully-auto**: запись без клика, как только stable+ready. Все поля
   заполнены сразу программой; derived рассчитаны.
5. **Persistence**: localStorage хранит rows + record-mode через 24h TTL.
   Reset чистит storage.
6. **URL-override**: при `?mode=...` toggle выдаёт `data-locked="true"`,
   все кнопки `disabled`. setRecordMode no-op (ученик не меняет фиксацию).

### 21.8. Эталонные файлы стандарта (UX-v2)

- `experiments/_shared-spa/src/lib/journal/types.ts`         — типы
- `experiments/_shared-spa/src/lib/journal/specs.ts`         — 4 spec'а
- `experiments/_shared-spa/src/lib/journal/render.ts`        — режим-сенситивный рендерер
- `experiments/_shared-spa/src/lib/journal/verify.ts`        — verdict
- `experiments/_shared-spa/src/lib/journal/format.ts`        — RU-числа
- `experiments/_shared-spa/src/lib/journal/pending.ts`       — pending-плашка (semi-auto)
- `experiments/_shared-spa/src/lib/journal/recorder.ts`      — фабрика UI-координатор
- `experiments/_shared-spa/src/lib/journal/journal.css`      — стили `.lab-journal-table` + pending + toggle
- `experiments/_shared-spa/src/lib/record-mode.ts`           — toggle 3-сегментный + teacher-override
- `experiments/kit-1-hydrostatics/src/__tests__/shared-journal.test.ts`        — 42 unit-теста (format/verify/specs)
- `experiments/kit-1-hydrostatics/src/__tests__/shared-journal-ux-v2.test.ts`  — 39 unit-тестов (render-modes/pending/recorder/teacher-override)
- Эта глава (§21) — нормативный канон. Расхождения между опытами обсуждаются
  и фиксируются здесь, не размножаются по локальным README.

### 21.9. Phase 5 — physical dedup `lab-journal` Web Component (отложено)

В опыте 1.2 Архимед остался `<lab-journal>` Web Component как **data-store**:
он хранит rows и предоставляет CSV/PDF экспорт + audit-trail. Но визуально
этот компонент **скрыт** (`hidden`), а параллельно рядом рендерится
shared journal в `<div id="ar-journal-host">`.

Это гибрид «один data-store + один рендерер». Полный dedup (выбросить
`lab-journal` целиком, перенести CSV/PDF в shared) — большой рефакторинг
(~4-6 ч), отложен на отдельную итерацию. Семантика стандарта уже едина.

### 21.10. Pending-плашка (semi-auto) — единый DOM-контракт

Каждый опыт включает в свой HTML-шаблон стандартный блок:

```html
<div id="record-pending-slot" class="record-pending-slot" hidden>
  <button id="record-pending-btn" class="record-pending-btn" type="button">
    <span class="record-icon" aria-hidden="true">▶</span>
    <span class="record-text">Записать в журнал</span>
    <span id="record-pending-summary" class="record-summary"></span>
  </button>
</div>
```

Видимость и текст управляются через
[`pending.ts`](../_shared-spa/src/lib/journal/pending.ts):

```ts
import { findPendingHost, renderPending } from '@shared/lib/journal/pending';
const host = findPendingHost();
renderPending(host, { mode, ready, signature, lastRecordedSignature, summary });
```

Алгоритм видимости:
- `mode === 'semi-auto'` И `ready === true` И
  `signature !== lastRecordedSignature` И `signature !== ''` → показан.
- Иначе → `hidden`.

Двойной клик (300ms debounce) защищает от случайного дубликата записи.

**ЕДИНОЕ ПРАВИЛО для всех опытов (закреплено 2026-05-14):** pending-плашка
существует ТОЛЬКО в `semi-auto`. В `fully-manual` и `fully-auto` любая
плашка/CTA/кнопка «Записать ...» должна быть `hidden = true`. Это касается
ВСЕХ опытных-специфичных CTA: Архимед `#ar-record-btn`, Spring/Friction
`#record-btn`, Density `#record-pending-slot`. Любой новый опыт обязан
следовать этому правилу.

**Empty manual row** (закреплено 2026-05-14): в `fully-manual` при достижении
`ready` (state.cylinderId !== null / spring !== null / block on track) журнал
ОБЯЗАН показать **одну пустую активную строку** с input'ами во всех
не-meta ячейках, чтобы ученику было куда вводить значения. Реализация:
- Density: `#commitEmptyManualRow(cyl)` создаёт `Measurement` с m_g=0 и
  пушит в state.
- Архимед: `#ensureManualEmptyRow(state)` добавляет row в `lab-journal`
  с `P_air_N=null, P_liquid_N=null, F_A_meas_N=null, F_A_theor_N=0`.
- Spring/Friction: UI-only sentinel-row с `timestamp = -1`, draft хранится
  в `#journalDrafts.get(-1)`. При первом непустом вводе (или клике auto-toggle)
  draft переносится в реальный `Measurement`.

Этот контракт обеспечивает педагогическое равенство: ученик в fully-manual
видит ТО ЖЕ САМОЕ что и в реальной лабораторной — лист бумаги с
размеченными колонками, готовый к записи.

**Тексты подсказок (`hint-bar` / inactivity-hints) в `fully-manual` НЕ
должны упоминать «нажмите кнопку Записать...» / «нажмите Записать P возд»
и т.п.** — потому что таких кнопок в fully-manual нет. Каждый опыт
определяет два набора hint-текстов:
- стандартный (для semi-auto / fully-auto),
- `*_MANUAL` (для fully-manual): «Снимите показание прибора и запишите
  ... в журнал».

Архимед: `HINTS_MANUAL` в `ArchimedesExperiment.ts` + `INACTIVITY_HINTS_MANUAL`
в `HintEngine.ts`. HintEngine получает `recordMode` через `setRecordMode()`
при `handleRecordModeChange`. Density, Spring, Friction используют тот же
паттерн при добавлении новых текстов hint.

### 21.11. Teacher-override через URL `?mode=...`

Учитель может зафиксировать режим записи через URL-параметр:
- `?mode=semi-auto` / `?mode=fully-manual` / `?mode=fully-auto` — допустимые.
- Legacy `?mode=manual` → `semi-auto`, `?mode=auto` → `fully-auto`.
- Невалидное значение → null (toggle работает как обычно).

При активном override:
- `getRecordMode(kitId)` возвращает значение из URL (приоритет над localStorage).
- `setRecordMode(kitId, ...)` no-op (ученик не может менять зафиксированный режим).
- `renderRecordModeToggle()` ставит `data-locked="true"` на wrap и `disabled` на все кнопки.
- Title кнопки: «Режим зафиксирован учителем (URL-параметр ?mode=…). Изменить нельзя.»

API: `getModeOverride(): RecordMode | null`, `isModeLocked(): boolean` в
[`record-mode.ts`](../_shared-spa/src/lib/record-mode.ts).

### 21.12. «Без подсказок» в fully-manual — глобальный CSS-контракт

Требование 2026-05-13: в `fully-manual` режиме ЛЮБЫЕ расчётные подсказки
во всех опытах (текущих и будущих) должны быть **скрыты**. Учебная цель —
имитация реальной лабораторной без программы-помощника (ВПР / практический ОГЭ).

**Реализация:** глобальный body-атрибут + CSS-правила в shared
[`journal.css`](../_shared-spa/src/lib/journal/journal.css).

```ts
// _shared-spa/src/lib/record-mode.ts
export function applyRecordModeAttribute(mode: RecordMode, doc = document): void;
```

Toggle (`renderRecordModeToggle`) автоматически пишет
`<body data-record-mode="...">` при init и обновляет при каждом click'е
сегмента. Будущие опыты получают это бесплатно — просто подключив toggle.

**Скрытые в fully-manual классы** (single source `journal.css`):

| Селектор | Что это |
|---|---|
| `.formula-display` | Формулы (`F=mg`, `μ=F/N`, `k=F/Δl`) |
| `.formula-units` | Пояснения единиц («в кг, м/с²») |
| `.density-result-hint` | Баннер «перепроверь V/ρ» под журналом 1.1 |
| `.journal-empty` | Текст «Подвесьте груз и кликните…» в пустом журнале |
| `.ar-record-hint` | Подсказки в шапке Архимед-журнала |

**Что НЕ скрывается** (это инструкции по этапу, а не расчётные подсказки):

- `.workbench-hint` / `#hint-bar` — «что делать сейчас» (drag-инструкция,
  аналог методички в реальной лабе).
- `.equipment-group-hint` — рекомендации по выбору оборудования.
- `.step-label` — название этапа.

**Добавление новой подсказки:** автор опыта должен использовать один из
стандартных классов выше; селекторы в `journal.css` подхватят правило
автоматически. Если требуется новый класс — добавить его в селекторный
блок `body[data-record-mode='fully-manual']` в `journal.css`.

### 21.13. Drag-back в палитру — стандарт §20.2 (single contract)

Каждая `<lab-equipment-card>` имеет атрибуты `data-dropzone="<eqId>"` и
`data-dropzone-id="card-<eqId>"`. При drag прибора со сцены drop на эту
карточку возвращает прибор в палитру.

Соответствие на 2026-05-12:
- 1.1 Density — ✓ работает (балансы, мензурка, цилиндры, стакан).
- 1.2 Архимед — атрибуты есть на 7 карточках (динамометры, цилиндры, стакан).
- 2.1 Spring — атрибуты есть на 11 карточках (динамометры, пружины, грузы, наборный груз).
- 2.2 Friction — атрибуты есть на 7 карточках (брусок, динамометры, грузы).

Поведение detach «главного» прибора (пружина / брусок):
**НЕ делать `reset()`** — только каскадно снять зависимые (грузы → пружина,
грузы+динамометр → брусок), сама направляющая / штатив остаются. См. §20.3.

---

## 22. Монорепо + архивация legacy (2026-05-15)

Inter_OGE — **npm workspace** монорепо. Структура корня:

```
inter_oge/
├── experiments/
│   ├── _shared-spa/          # общая инфраструктура (journal v2, DragController, KitShell)
│   ├── home/                 # каталог-главная
│   ├── kit-1-hydrostatics/   # 2/5 опытов готовы (1.1 + 1.2)
│   ├── kit-2-forces/         # 4/4 опыта готовы — flagship
│   ├── 2-1-spring/           # legacy эталон (этот REFERENCE.md живёт здесь)
│   ├── 2-2-friction/         # legacy
│   └── chemistry/            # отдельный workflow
├── launcher/                  # Electron-prototype v0.3
├── _archive/                  # legacy Canvas-эпоха (4.9 MB, git-история сохранена)
├── .business/                 # деловые документы (ФИПИ, спеки, методичка)
└── docs/
```

**Что в `_archive/`** (см. [`_archive/README.md`](../../_archive/README.md)):

- `legacy-kit2/` — Canvas-реализация Кит-2 (16k строк vanilla JS, замещена `kit-2-forces/`)
- `legacy-shared/` — старая физика-движок (anime.js / particle-effects / physics-engine.js)
- `legacy-vendor/` — anime.min.js / chart.umd.js / interact.min.js
- `electron-app/` — старая Electron-обёртка над Canvas
- `legacy-tests/`, `legacy-e2e/`, `app.js`, `playwright.config.js` (root, jest-эпохи)

**Правила:**

1. Архив **не импортируется** из активных пакетов (grep-cross-ref clean
   на момент архивации 2026-05-15).
2. Перемещение делалось через `git mv` — история renames сохранена.
3. Архив можно безопасно удалить через ≥ 1 квартал (`git rm -r _archive/`)
   когда команда перестанет ссылаться.
4. **НЕ ДОБАВЛЯТЬ нового legacy сюда** — для свежего кода используйте
   соответствующий пакет.

---

## 23. npm workspace orchestration

Корневой [`package.json`](../../package.json):

```json
{
  "name": "inter-oge-monorepo",
  "private": true,
  "workspaces": [
    "experiments/_shared-spa",
    "experiments/kit-1-hydrostatics",
    "experiments/kit-2-forces",
    "experiments/2-1-spring",
    "experiments/2-2-friction",
    "experiments/home"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "test:e2e": "npm run test:e2e --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "dev:kit-2": "npm --workspace=@labosfera/kit-2-forces run dev",
    "dev:kit-1": "npm --workspace=@labosfera/kit-1-hydrostatics run dev",
    "dev:home": "npm --workspace=labosfera-home run dev",
    "dev:spring": "npm --workspace=@labosfera/spring-experiment run dev",
    "dev:friction": "npm --workspace=@labosfera/friction-experiment run dev"
  }
}
```

**Запуск:**

```bash
npm install                       # из корня, инициализирует все пакеты
npm run build                     # build всех 5 SPA
npm run test                      # vitest всех (текущий total: 1240 unit-тестов)
npm run dev:kit-2                 # http://localhost:5176
npm run dev:home                  # http://localhost:5181
```

**Cross-package импорты** (`@labosfera/shared-spa/...`) резолвятся через
оба alias'а — `@shared/...` и `@labosfera/shared-spa/...` — в каждом
`vite.config.ts` и `tsconfig.json`. Оба валидны; legacy 2-1/2-2 и kit-2
исторически используют длинный, kit-1 — короткий.

**Heap fix для home** (Three.js типы тяжёлые): `cross-env
NODE_OPTIONS=--max-old-space-size=4096 tsc --noEmit` в [`home/package.json`](../home/package.json).

---

## 24. ESLint flat config v9 — shared base

Единый источник правды — [`_shared-spa/eslint.config.shared.js`](../_shared-spa/eslint.config.shared.js).

Это функция, принимающая `js` и `tseslint` как параметры — потому что
ESM-resolve `@eslint/js` работает только из пакета где он установлен.

**Локальный entry-point в каждом пакете** ([`<kit>/eslint.config.js`](../kit-2-forces/eslint.config.js)):

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { sharedConfig } from '../_shared-spa/eslint.config.shared.js';

export default sharedConfig({ js, tseslint });
```

**Что внутри shared:**

- Игнорируется: `dist/`, `node_modules/`, `coverage/`, `playwright-report/`,
  `*.config.{js,ts,mjs}`, `selfcheck-*.mjs`, `probe-*.mjs`, `e2e/**/*.spec.ts`.
- Расширяется `js.configs.recommended` + `tseslint.configs.recommended`.
- Web Components globals: `HTMLElement`, `SVGElement`, `customElements`, и т.д.
- Тесты (`**/*.test.ts`, `**/__tests__/**`) — мягче: `no-explicit-any: off`.
- `prefer-const: 'warn'`, `no-unused-vars: 'warn'` (с префиксом `_`),
  `no-non-null-assertion: 'off'`.

**Запуск:** `npm run lint` (`eslint src`) из любого пакета или из корня.

---

## 25. Mobile responsive паттерн

После аудита 2026-05-15 на iPhone 13 (390×844): `body.scrollWidth ===
viewport.width` (нет horizontal scroll). Mobile media queries в каждом
эксперимент-CSS уже срабатывают: workbench + equipment + measurement
стэкаются в одну колонку.

**Главные паттерны (см. [`kit-2/spring-experiment.css:1508`](../kit-2-forces/src/styles/spring-experiment.css)):**

```css
@media (max-width: 1023px) {
  .equipment-panel {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    /* Fade-edge справа — намёк ученику что есть продолжение за viewport. */
    mask-image: linear-gradient(to right, black calc(100% - 24px), transparent 100%);
    -webkit-mask-image: linear-gradient(to right, black calc(100% - 24px), transparent 100%);
  }
  .equipment-group {
    min-width: 280px;
    scroll-snap-align: start;
  }
}
```

**Для toggle'ов и pill-кнопок ≤767 px** ([`kit-2/friction-experiment.css:559`](../kit-2-forces/src/styles/friction-experiment.css)):

```css
@media (max-width: 767px) {
  .surface-toggle {
    max-width: calc(100% - var(--space-4) * 2);
    flex-wrap: wrap;
  }
}
```

**Правила нового опыта:**

1. **Не использовать fixed-pixel widths** для контейнеров на сцене.
   Используй `max-width: 100%` + `flex-wrap: wrap`.
2. **Equipment-panel** — `scroll-snap-type: x mandatory` + `mask-image`
   fade-edge на узких экранах.
3. **Сцена** ≤767px: `max-height: 50vh` (см. `.workbench-stage` в spring CSS).
4. **Header** ≤767px: `grid-template-columns: 1fr; grid-template-rows:
   auto auto auto` — три строки (back + title + spec) центрированы.
5. **prefers-reduced-motion** — гайд в §7. Скрывать smooth-scroll, lenis,
   gsap pin-секции.

---

## 26. Drag-overlay-dup правило — обязательное

**Грабля 2026-05-15:** DragController при успешном drop оставлял DOM-
элемент в overlay (`position: fixed`, drag-стили). Каждый drag — +1
«зависший» дубль. 3 диска на штангу → 6 видимых дисков (3 в composite +
3 в overlay).

**Решение** ([`kit-2/lab-composite-tray.ts:220`](../kit-2-forces/src/ui/components/lab-composite-tray.ts)):

```ts
#parkDiscElement(mass: number, element: HTMLElement): void {
  const slot = this.querySelector(`.ct-disc-slot[data-disc-mass="${mass}"]`);
  if (!slot) return;
  // Сбросить inline-стили drag'а
  element.style.position = '';
  element.style.left = '';
  element.style.top = '';
  element.style.zIndex = '';
  element.style.transform = '';
  element.style.marginTop = '';
  element.removeAttribute('dragging');
  element.removeAttribute('attached');
  element.removeAttribute('data-slot-target');
  // Вернуть в slot перед placeholder
  const placeholder = slot.querySelector('.ct-disc-slot-placeholder');
  slot.insertBefore(element, placeholder);
}
```

**Контракт onDrop:** при успешном drop оркестратор передаёт `element` в
`tray.addX(value, element)`; tray вызывает `#parkX` и возвращает элемент
в слот.

**Самопроверка:** в `selfcheck-*.mjs` после real mouse-drag проверять:

```js
const overlayDups = await page.evaluate(() => {
  const all = document.querySelectorAll('lab-composite-weight[kind="disc"]');
  return [...all].filter((d) => !d.closest('.ct-disc-slot')).length;
});
expect(overlayDups).toBe(0);
```

**ВАЖНО — тест через mouse events, НЕ через API:**

```js
// ПЛОХО — обходит drop-flow, не ловит overlay-dup:
await page.evaluate(() => window.tray.addDisc(10));

// ХОРОШО — реальный drag:
await page.mouse.move(srcX, srcY);
await page.mouse.down();
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(srcX + dx * (i/12), srcY + dy * (i/12));
  await page.waitForTimeout(20);
}
await page.mouse.up();
```

См. memory: `feedback_dragdrop_test_through_mouse.md`.

---

## 27. SVG-перцептивная двойственность

**Грабля 2026-05-15:** ученик докладывает «вижу 5-6 дисков» при реальных
3 на штанге. DOM-проверка: ровно 3 `<g class="disc-stacked">`. Реальная
причина — **перцептивная**:

1. **Eyelet (петля крепления)** с rx=6.4 (диаметр 12.8 SVG-юнита)
   читался как «верхний диск» пирамиды. Слишком похож на 10г диск (rx=15).
2. **Лестница уступов**: диски rx 15/20/26 на стержне — каждый «уступ»
   (горизонтальная кромка) глаз читает как отдельную полосу.
3. **Flange (основание стержня)** rx=28.5, fill=металл — выглядел как
   плоский 4-й диск под 50г.

**Правила (см. [`kit-2/lab-composite-weight.ts:28-42`](../kit-2-forces/src/ui/components/lab-composite-weight.ts)):**

1. **Минимальный визуальный вес функциональной детали ≥ 15% высоты
   viewBox.** Сумма height всех дисков ≥ 15% от 130 SVG-юнитов. Иначе
   глаз группирует.
2. **Eyelet/петля крепления** ≤ 5% диаметра — явно «крючок», не «диск».
   Сейчас rx=3, stroke-width=1.2.
3. **Уступы дисков ≤ 2 SVG-юнита по rx**. Реальный ФИПИ-комплект:
   диски ⌀30/35/40 мм — близкие диаметры, отличаются толщиной. Сейчас
   rx=22/24/26 (уступ 2 SVG-юнита).
4. **Flange — НЕ плоский эллипс с заливкой металла.** Если нужно
   основание — тонкая (ry≤1) тёмная (var(--disc-edge)) кромка как
   «нижняя штамповка диска». См. §28.

См. memory: `reference_svg_perceptual_doubling.md`.

---

## 28. Composite weight (наборный груз) — паттерны

Эталон — [`kit-2/lab-composite-weight.ts`](../kit-2-forces/src/ui/components/lab-composite-weight.ts).

**Геометрия (DISC_GEOM):**

```ts
const DISC_GEOM: Record<number, { rx: number; ry: number; height: number }> = {
  10: { rx: 22, ry: 3.2, height: 6 },
  20: { rx: 24, ry: 3.4, height: 8 },
  50: { rx: 26, ry: 3.6, height: 12 },
};
```

**Структура рендера (`#renderComposite`):**

1. **Top-ellipse у КАЖДОГО диска** (cy=topY, ry=geom.ry). Это даёт 3D-
   выпуклую плоскость каждой монеты. У нижних дисков top-ellipse виден
   ПО БОКАМ от меньшего диска сверху — это правильно («полка одной 3D-
   монеты», не «плоский уступ»).
2. **Side rect** (вертикальная боковая поверхность с градиентом).
3. **Bottom-ellipse у самого нижнего диска** (i=0, 50г) — ТОНКАЯ (ry=0.8)
   и ТЁМНАЯ (fill=`var(--disc-edge)`). Это «штампованная нижняя кромка»,
   не отдельный диск. Заменяет старый flange.
4. **Hole у топового диска** — центральное отверстие, через которое
   виден стержень.
5. **Тёмные грани между дисками** — не нужны (бортик-stroke на каждом
   side rect достаточно).

**Stem (стержень):**

- Заканчивается ВНУТРИ нижнего диска (y=110, не до самого дна y=116) —
  стержень визуально исчезает в 50г диске через центральное отверстие.

**Eyelet (петля):**

- rx=3, ry=3, stroke-width=1.2 — крошечная петля, явно «крючок».
- cy=6 (раньше было 9). `getTopHookY` для kind=composite пересчитан.

**ViewBox: 60×130.** Не менять — `getTopHookY()/getWeightHookY()`
завязаны на эти координаты.

**SVG hidden правило:** `svg[hidden] { display: none }` в shadow CSS.
HTML-атрибут `[hidden]` на SVG ненадёжен — браузеры иногда игнорируют,
все 3 режима SVG (rod/disc/composite) рисуются разом → «две штанги».

---

## 29. Источники знаний (внешние) — где брать материал для нового опыта

### 29.1. ФИПИ — главный регулятор содержания

**Папка:** `.business/Исходники/` (внутри `C:\Users\Administrator\ООО ЛАБОСФЕРА\`)

- `ФИ-9 ОГЭ 2026_СПЕЦ.pdf` — структура КИМ, типы заданий, шкалирование.
- `ФИ-9 ОГЭ 2026_КОДИФ.pdf` — кодификатор: перечень проверяемых элементов.
- `ФИ-9 ОГЭ 2026_ДЕМО.pdf` — демонстрационный вариант, 22 задания.

**Когда читать:** перед началом работы над новым опытом. Если опыт
не покрыт ФИПИ-спекой — он не входит в приоритет MVP.

### 29.2. Методичка — справочник по оборудованию

**Папка:** `.business/Продукты/Програмное обеспечение/ГИА-лаборатория Физика/методичка/src/`

- `00-intro.md`, `01-kits.md` — обзор и состав комплектов.
- `02-direct.md`, `03-indirect-1..5.md` — прямые и косвенные измерения.
- `04-research.md`, `05-virtual-lab.md`, `06-safety.md`, `07-appendix.md`.

**Собирается** в PDF (~52 стр, 8.8 МБ) через `build-methodology` skill
(Pandoc+Typst). Главный справочник по характеристикам оборудования,
допускам, формулам.

**Когда читать:** на этапе физики и параметров оборудования (День 1-2
по §14.3).

### 29.3. Фото реального оборудования

- **Комплекты:** `.business/Маркетинг/Сборка-КП/photos/kit-1.png` …
  `kit-7.png` — продакт-фото для каталога ([`experiments/home/public/photos/`](../home/public/photos/)).
- **Отдельные приборы:** в основном встроены в SVG напрямую как ссылки
  (см. кит-эталонные screens). Отдельная папка «фото оборудования» в
  `C:\dev\Inter_OGE\` была упомянута в более ранних редакциях, но **не
  существует** — игнорировать.

**Когда смотреть:** перед моделированием SVG-компонента. Симулятор
должен «выглядеть как реальный объект» — это main USP (см. §29.5).

### 29.4. Бизнес-спеки опытов — формат ТЗ

**Папка:** `.business/спеки/`

**Эталоны** (актуальные на 2026-05-16):
- `2026-05-06-кит-1-опыт-1-1-плотность.md` — спека опыта 1.1
- `2026-05-07-кит-1-опыт-1-2-архимедова-сила.md` — спека опыта 1.2
- `2026-05-05-опыт-2-4-работа-силы-упругости.md` — спека 2.4
  (⚠️ образец интервью БЕЗ ФИПИ-якоря — корневая причина бонус-несовпадения,
  см. §30)
- `2026-05-06-drag-matrix-kit-1.md` — матрица drag&drop kit-1
- `2026-05-06-каталог-главная-страница.md` — спека SPA-каталога
- `2026-05-06-blind-spots-testing.md` — анализ слепых зон тестирования
- `2026-05-14-наборный-груз-сборочный-верстак.md` — сборочный верстак Кит-2

**Минимальная структура новой спеки** (ОБЯЗАТЕЛЬНО на 2026-05-16+):

```markdown
# Спека: <id> «<название>»

## 🛑 ФИПИ-якорь (обязательный первый раздел)

**Источник:** ФИ-9 ОГЭ 2026_СПЕЦ.pdf, Приложение 2, стр. NN, Комплект №N.
**Дословная цитата:** «...»
**КОДИФ §1.29:** работа №NN из канонического перечня.
**Если опыт = бонус ЛАБОСФЕРЫ:** указать причину и согласование.

## Контекст
Откуда задача, что блокирует, deadline.

## Drop-matrix (приборы × состояния)
Таблица: что можно перетащить, куда, что произойдёт.

## Инварианты (PI-1..PI-N)
Физические/UI-свойства, которые ВСЕГДА выполняются.

## Anti-patterns
Что НЕ показывать (см. §25 + §26 + REFERENCE-канон).

## Риск-реестр
Топ-5 граблей с митигацией.

## DoD-checklist
Ссылка на §13 + специфичные пункты опыта.
```

**Когда создавать:** на день 1 нового опыта (см. §14.3). Без спеки
не начинать кодить. **Без §«ФИПИ-якорь» в спеке** — не считается готовой.

### 29.5. Конкуренты — для дизайн-решений (но НЕ для физики)

`.business/Продукты/Програмное обеспечение/Цифровые лаборатории/Физика/
.../digitalLab/COMPETITIVE_ANALYSIS.md`

**Конкуренты:**
- **Releon** (rl.ru) — мультидатчики, нет Web UI.
- **Научные Развлечения** (nau-ra.ru) — фокус на младших классов.
- **L-micro** — устаревший UI.
- **PhET** (Utah, США) — бесплатные симуляции, эталон UI/UX.
- **Crocodile Physics** — платные интерактивные симуляции.

**Наше USP:** премиум-дизайн каталога (Apple Education / Tesla
Configurator уровень), реальные фото оборудования, физика 100% по
ФИПИ-2026.

**Когда смотреть:** на этапе UI-решений и анимаций (для inspirations).
Физика и формулы — ТОЛЬКО из ФИПИ + методички.

### 29.6. KITS data — каталог-источник правды

**Файл:** [`experiments/home/src/data/kits.ts`](../home/src/data/kits.ts)

Содержит 7 объектов `Kit` с полями: `num`, `status`, `priority`,
`experiments[]`, `progress: { done, total }`, `eta`. Hero на главной
показывает `totalExperiments(KITS).done / .total` (computed).

**Когда обновлять:** после готовности нового опыта — увеличить
`progress.done` и добавить `experiments[]`-запись.

### 29.7. О компании / roadmap

- `.business/index.md` — корневая точка входа.
- `.business/О_компании.md` — карточка компании.
- `.business/Продукты/.../README.md`, `DEVELOPMENT_PLAN_v2.md` — статус,
  дорожная карта.

**Когда читать:** при долгосрочном планировании.

---

## 30. Покрытие ФИПИ ОГЭ-2026 (главный источник правды)

**Создано:** 2026-05-16 по требованию пользователя «всё строго по ФИПИ».
**Корневая причина создания:** на момент 2026-05-15 у kit-2 было 4 «готовых»
опыта, из которых **1 не входит в ФИПИ** (`spring-work` — работа упругости)
и **1 заявлен в UI, но не реализован** (`friction` Task B — работа трения,
`work=null`). Промах был возможен потому, что в §13 DoD не было обязательной
ФИПИ-сверки. Теперь она есть (см. §13 «ФИПИ-якорь»).

### 30.1. Источники канона (read-only — никогда не интерпретируем по памяти)

| Документ | Что в нём | Раздел/страница |
|---|---|---|
| `.business/Исходники/ФИ-9 ОГЭ 2026_СПЕЦ.pdf` | Перечень опытов по каждому комплекту | **Приложение 2, стр. 16–21** |
| `.business/Исходники/ФИ-9 ОГЭ 2026_КОДИФ.pdf` | Канонический перечень практических работ всего ОГЭ | **§1.29, стр. 14** |
| `.business/Исходники/ФИ-9 ОГЭ 2026_ДЕМО.pdf` | Образец задания №17 (3 балла) | стр. 8–9 |

**Как извлекать текст:** `Read tool` не работает (pdftoppm не в PATH).
Использовать:

```powershell
python -c "import pdfplumber; pdf = pdfplumber.open('путь.pdf'); print(pdf.pages[N-1].extract_text(use_text_flow=True, x_tolerance=2, y_tolerance=3))"
```

(см. в плане квит-свинггинг-саммит образец команды).

### 30.2. КОДИФ §1.29 — полный перечень практических работ ОГЭ-2026 (дословно)

**Измерения (13 работ):**

1. средней плотности вещества — **kit-1**
2. архимедовой силы — **kit-1**
3. жёсткости пружины — **kit-2**
4. коэффициента трения скольжения — **kit-2**
5. **работы силы трения** — **kit-2**
6. **силы упругости** (одной точкой через динамометр) — **kit-2**
7. средней скорости движения бруска по наклонной плоскости — kit-5
8. ускорения бруска при движении по наклонной плоскости — kit-5
9. частоты и периода колебаний математического маятника — kit-5
10. частоты и периода колебаний пружинного маятника — kit-5
11. момента силы, действующего на рычаг — kit-6
12. работы силы упругости при подъёме груза неподвижным блоком — **kit-6 (не kit-2!)**
13. работы силы упругости при подъёме груза подвижным блоком — **kit-6 (не kit-2!)**

**Исследования (11 работ):**

14. архимедовой силы от объёма погружённой части тела — **kit-1**
15. архимедовой силы от плотности жидкости — **kit-1**
16. независимости выталкивающей силы от массы тела — **kit-1**
17. силы трения скольжения от силы нормального давления — **kit-2**
18. силы трения скольжения от рода поверхности — **kit-2**
19. силы упругости от степени деформации пружины (Гука-график) — **kit-2**
20. ускорения бруска от угла наклона направляющей — kit-5
21. периода колебаний нитяного маятника от длины нити — kit-5
22. периода колебаний пружинного маятника от массы груза — kit-5
23. периода колебаний пружинного маятника от жёсткости пружины — kit-5
24. независимости периода колебаний нитяного маятника от массы груза — kit-5

**Проверка (1):**

25. Условие равновесия рычага — kit-6

### 30.3. Спецификация Прил. 2 — опыты по комплектам №1, №2 и №3

#### Комплект №1 (стр. 16, дословная цитата)

> «Рекомендуемые характеристики элементов оборудования комплекта №1 должны
> обеспечивать выполнение следующих опытов:
> — измерение средней плотности вещества (цилиндры №1–4), архимедовой силы
> (цилиндры №2–4);
> — исследование зависимости архимедовой силы от объёма погружённой части
> тела (цилиндр №3) и от плотности жидкости, независимости выталкивающей
> силы от массы тела (цилиндры №1 и 2).»

| Наш ID | Опыт ФИПИ | Файл | Статус | Замечания |
|---|---|---|---|---|
| 1.1 | Измерение средней плотности вещества (цилиндры №1–4) | `kit-1-hydrostatics/src/screens/density-solid/` | ✅ DoD-ready | 1178 строк, 4 цилиндра доступны |
| 1.2 | Измерение архимедовой силы (цилиндры №2–4) | `kit-1-hydrostatics/src/screens/archimedes/` | ✅ **DoD-ready** (серия №2/№3/№4 верифицирована) | Серия цилиндров №2/№3/№4 — все три верифицированы e2e (`archimedes-series.spec.ts`): F_арх для каждого снята в режиме «Вода», три строки журнала корректны. 1.4 (режим «Раствор») — в том же экране. |
| 1.3 | Исследование F_арх(V_погруж) (цилиндр №3 со шкалой) | `kit-1-hydrostatics/src/screens/archimedes-volume/` | ✅ DoD-ready + **полный D&D-UX** | 8 шагов PLAYBOOK + D&D-итерация завершены 2026-05-16. selfcheck-1-3.mjs: 5/5 PASS, selfcheck-1-3-dnd.mjs: 8/8 PASS (mouse-drag через `page.mouse.move/down/up`, drag-overlay-dup §26 = 0 дублей, parkElement §26 ✓, REST-state ✓). ФИПИ-инвариант V=14/28/42, F=0.137/0.274/0.412, линейность F∝V — все ✓. UX: 3 прибора в tray → mouse-drag в snap-zones → детач × возвращает в card. Stepper после полной сборки |
| 1.4 | Исследование F_арх(ρ_жидкости) (вода ↔ соляной раствор) | `kit-1-hydrostatics/src/screens/archimedes/` (режим «Раствор») | ✅ **DoD-ready** (2026-05-24) | Режим-тумблер «Вода»/«Раствор» в табе 1.2 (гибрид-правило). Соль drag в стакан → ρ ступенями `liquidRhoFromSaltPortions` (1000→1070→1140→1200 cap); per-task `ARCHIMEDES_LIQUID_SPEC` (F_теор=ρ·g·V, не хардкод воды); порт `lab-graph` → график F_арх(ρ). Browser self-check: исправлены 2 layout-бага журнала (клип F_теор при 7-8 колонках + верт. сжатие графиком). Для чистой прямой — 1Н динамометр + плотный цилиндр |
| 1.5 | Независимость F_арх(m) при равном V (цилиндры №1 и №2) | `kit-1-hydrostatics/src/screens/independence-mass/` | ✅ **DoD-ready** (Волна 0, 2026-06-25) | Экран `IndependenceMassScreen`. Цилиндры №1 (сталь, 195 г) и №2 (алюминий, 70 г), оба V=25 см³. Журнал v2 (`INDEPENDENCE_MASS_SPEC`): P_возд/P_жид direct → F_A derived. Вывод-вердикт: F_арх(№1) ≈ F_арх(№2) → не зависит от массы (`forcesAreEqual`). selfcheck-1-5.mjs: PASS. |

**Итого kit-1: 5 ✅ (1.1, 1.2, 1.3, 1.4, 1.5) = 5/5. Волна 0 закрыта 2026-06-25.**

#### Комплект №2 (стр. 17, дословная цитата)

> «Рекомендуемые характеристики элементов оборудования комплекта №2 должны
> обеспечивать выполнение следующих опытов:
> — измерение жёсткости пружины, коэффициента трения скольжения, работы
> силы трения, силы упругости;
> — исследование зависимости силы трения скольжения от силы нормального
> давления и от рода поверхности; силы упругости, возникающей в пружине,
> от степени деформации пружины.»

| ФИПИ-опыт | Файл | Статус | Замечания |
|---|---|---|---|
| Измерение жёсткости пружины (k = F/Δl) | `kit-2-forces/src/screens/spring-stiffness/` | ✅ DoD-ready | 1718 строк, SPRING_SPEC |
| Измерение коэффициента трения скольжения (μ) | `kit-2-forces/src/screens/friction/` Task A | ✅ DoD-ready | FRICTION_SPEC |
| **Измерение работы силы трения (A = F_тр · s)** | `kit-2-forces/src/screens/friction/` Task B | ✅ **DoD-ready** (2026-05-24) | Журнал мигрирован на §21 v2 + `FRICTION_WORK_SPEC` (колонки F_тр/s/A, A derived); путь захватывается из скольжения (`#currentSlidDistanceMm`), виден на сцене (readout «s = NN см»); per-task SPEC switch. 292 vitest + e2e desktop 3/3 |
| **Измерение силы упругости одной точкой** | `kit-2-forces/src/screens/elastic-force/` | ✅ **DoD-ready** (Волна 0, 2026-06-25) | Экран `ElasticForceScreen`. Один груз → пружина → динамометр; журнал v2 (`ELASTIC_FORCE_SPEC`, experimentId `'2.5'`): m_g direct → F_упр = m·g derived (tolerance 5%). selfcheck-elastic-force.mjs: PASS. |
| Исследование F_тр(N) — зависимость от нормальной силы | `kit-2-forces/src/screens/friction/` Task C | ✅ DoD-ready | Переключатель массы |
| Исследование F_тр(поверхность А/Б) | `kit-2-forces/src/screens/friction/` Task D | ✅ DoD-ready | Переключатель поверхности |
| Исследование F_упр(Δl) — закон Гука как график | `kit-2-forces/src/screens/spring-elastic/` | ✅ DoD-ready | Опыт 2.6 в каталоге |

**Итого kit-2: 7 ✅ ФИПИ + 1 бонус = 7/7 ФИПИ. Волна 0 закрыта 2026-06-25.**

> **Бонус (не ФИПИ):** «Работа силы упругости» (`kit-2-forces/src/screens/spring-work/`) — журнал мигрирован на v2 (`SPRING_WORK_SPEC`): m_g/Δl_cm direct → F_N и W_J derived (W = k·Δl²/2). Помечен `isFipi: false` в каталоге. Badge «бонус ЛАБОСФЕРА» в drawer.

#### Комплект №3 (стр. 18)

> ФИПИ-якоря собраны из docstring'ов опытов kit-3 (`СПЕЦ Прил.2 компл.№3, стр.18` + КОДИФ §1.29); единый PDF спецификации в репозитории не хранится. Дословный фрагмент по ВАХ: «исследование зависимости силы тока в проводнике (резисторы, лампочка) от напряжения». Опыты: измерение сопротивления резистора, мощности и работы тока (метод амперметра-вольтметра); исследование зависимости сопротивления проводника от длины, площади сечения и удельного сопротивления; проверка правил последовательного (U = U₁ + U₂) и параллельного (I = I₁ + I₂) соединений.

| Наш ID | Опыт ФИПИ | Файл | Статус | Замечания |
|---|---|---|---|---|
| 3.1 | Измерение электрического сопротивления резистора (R = U/I) | `kit-3-circuits/src/screens/measurements/` Task A | ✅ DoD-ready | Метод амперметра-вольтметра. `RESISTANCE_SPEC`, журнал v2; selfcheck PASS |
| 3.2 | Измерение мощности электрического тока (P = U·I) | `kit-3-circuits/src/screens/measurements/` Task B | ✅ DoD-ready | `POWER_SPEC`; та же сцена, переключатель задачи A/B/C |
| 3.3 | Измерение работы электрического тока (A = U·I·t) | `kit-3-circuits/src/screens/measurements/` Task C | ✅ DoD-ready | `WORK_CURRENT_SPEC`; секундомер |
| 3.4 | Исследование зависимости силы тока от напряжения (ВАХ резистора и лампочки) | `kit-3-circuits/src/screens/iv-curve/` | ✅ DoD-ready | Резистор (линейная ВАХ) + лампочка (нелинейная). Урок Фазы C: слайдер ≤ диапазон вольтметра (фикс «лгущего вольтметра») |
| 3.5 | Исследование зависимости R проводника от длины | `kit-3-circuits/src/screens/wire-resistance/` Task A | ✅ DoD-ready | R(l) ∝ l. Нихром S=0,25 мм², l=0,5/1,0/2,0 м → R=2,2/4,4/8,8 Ом; R_теор=ρl/S в result-panel |
| 3.6 | Исследование зависимости R проводника от площади сечения | `kit-3-circuits/src/screens/wire-resistance/` Task B | ✅ DoD-ready | R(S) ∝ 1/S. Нихром l=2,0, S=0,25/0,5/1,0 → R=8,8/4,4/2,2. Урок Фазы D: фильтр на секции, не на `card.hidden` |
| 3.7 | Исследование зависимости R проводника от удельного сопротивления | `kit-3-circuits/src/screens/wire-resistance/` Task C | ✅ DoD-ready | l=2,0 S=0,25: нихром/константан/никелин → R=8,8/4,0/3,2. selfcheck-3-5-3-7 PASS |
| 3.8 | Проверка правила напряжений (последовательное соединение, U = U₁ + U₂) | `kit-3-circuits/src/screens/connections/` Task A-series | ✅ DoD-ready | R1=4,7 R2=5,7 Ом; подвижный вольтметр в 3 позиции; правило ✓/✗ в result-panel; selfcheck-3-8-3-9 66/0/0 |
| 3.9 | Проверка правила токов (параллельное соединение, I = I₁ + I₂) | `kit-3-circuits/src/screens/connections/` Task B-parallel | ✅ DoD-ready | Подвижный амперметр в 3 позиции; переключение топологии series↔parallel; формула по задаче (фикс reality-check) |

**Итого kit-3: 9 ✅ ФИПИ = 9/9. Кит-3 закрыт 2026-06-28 (Фазы A–F).**

#### Комплект №4 (оптика; Фазы A–D, в работе)

| № | Формулировка ФИПИ | Файл / Screen / Task | Статус | Комментарий |
|---|---|---|---|---|
| 4.1 | Измерение оптической силы и фокусного расстояния собирающей линзы | `kit-4-optics/src/screens/lens-bench/` Task A-power | ✅ DoD-ready | D = 1/F Дптр; слайдер экрана «найти резкость»; selfcheck-4-1 (Фаза A, 62/0/0) |
| 4.2 | Фокусное расстояние при расположении предмета на 2F | `kit-4-optics/src/screens/lens-bench/` Task B-focal2f | ✅ DoD-ready | Метод «равенство размеров»: предмет≈изображение ⇒ d=2F ⇒ F=d/2; стрелка-предмет с инверсией; selfcheck-4-2 (Фаза B, 41/0/2 SKIP) |
| 4.4 | Исследование свойств изображения, даваемого собирающей линзой | `kit-4-optics/src/screens/lens-bench/` Task C-image | ✅ DoD-ready | 5 зон (gt2F/eq2F/F_2F/eqF/ltF); категориальный журнал (kind/orientation/size — select; gamma — derived); IMAGE_PROPERTIES_SPEC; selfcheck-4-4 PASS 62/0/0; axe 0 violations |
| 4.5 | Исследование изменения фокусного расстояния двух сложенных линз | `kit-4-optics/src/screens/lens-bench/` Task D-combo | ✅ DoD-ready | Стопка 2 линз в одно гнездо (capacity-2); D_комб=ΣD; F_комб=d·f/(d+f); 3 комбо (соб1+соб2, соб2+рассеив3, диверг. соб1+рассеив3); хинт «действительного изображения нет» при диверг.; TWO_LENS_SPEC (8 колонок); selfcheck-4-5 PASS 57/0/0; axe 0 violations |

**Итого kit-4 (in-progress): 4/~6 ✅ ФИПИ. Кит-4 Фазы A–D закрыты 2026-07-01.**

### 30.4. Расширения ЛАБОСФЕРЫ (бонусы сверх ФИПИ — **разрешены, но помечены**)

Опыты, которых нет в ФИПИ-перечне, но мы считаем полезными для обучения:

| Опыт | Файл | Что делает | Почему оставлен |
|---|---|---|---|
| **Работа силы упругости** (W = k·Δl²/2) | `kit-2-forces/src/screens/spring-work/` | Сравнивает W_упр с работой силы тяжести A_грав через сохранение энергии | Демонстрирует закон сохранения механической энергии. В ФИПИ только для kit-6 (с блоками), но физически полезно и для пружины. **Помечается в каталоге как «бонус ЛАБОСФЕРА»** (badge), `isFipi: false` в `kits.ts` |
| Плотность жидкости (методичка 2.2.1) | — | Расчёт ρ воды через m/V с использованием стакана и мензурки | В методичке ЛАБОСФЕРА есть как опыт ученика, но **не в ФИПИ для kit-1**. Решение по реализации — отдельно |

**Правило для будущих бонусов:** docstring `*Experiment.ts` обязан явно
говорить `// ⚠️ БОНУС ЛАБОСФЕРА — НЕ ВХОДИТ В ФИПИ. Причина: …`. В
`kits.ts` запись с `isFipi: false` (и UI-badge в карточке опыта).

### 30.5. Сводный «бюллетень» покрытия (для каталога-главной)

| Kit | ФИПИ требует | Полностью ✅ | Частично ⚠️ | Отсутствует ❌ | Бонус |
|---|---|---|---|---|---|
| 1 Гидростатика | 5 | **5** (плотность 1.1, архимед 1.2 серия №2–4, F_А от V 1.3, F_А от ρ 1.4, **независимость F_А от m 1.5**) | 0 | 0 | — |
| 2 Силы и пружины | 7 | **7** (жёсткость, μ, работа трения, **F_упр одной точкой**, F_тр(N), F_тр(пов), Гука-график) | 0 | 0 | 1 (работа упругости — журнал v2) |
| 3 Электр. цепи | 9 | **9** (R/P/A тока 3.1–3.3, ВАХ 3.4, R(l)/R(S)/R(ρ) 3.5–3.7, правила U/I 3.8–3.9) | 0 | 0 | — |
| 4 Оптика | ~6 | **3** (4.1 опт.сила, 4.2 фокус-2F, **4.4 свойства изображения**) | 0 | ~3 | — |
| 5 Колебания | планируется | 0 | — | — | — |
| 6 Рычаг | планируется | 0 | — | — | — |
| 7 Теплота | планируется | 0 | — | — | — |

**MVP v0.4 (kit-1 + kit-2 — 100% ФИПИ) — ЗАКРЫТ 2026-06-25 (Волна 0):**
- kit-1: ~~1.3, 1.4 + переключатель жидкости~~ ✅ (1.3 — 2026-05-16, 1.4 — 2026-05-24); ~~1.5 (независимость F_арх от массы)~~ ✅ Волна 0 2026-06-25. **kit-1 = 5/5 ✅**
- kit-2: ~~дореализовать `friction/` Task B (work = F_тр·s)~~ ✅ сделано 2026-05-24; ~~добавить «Измерение F_упр»~~ ✅ `elastic-force/` Волна 0 2026-06-25; ~~spring-work v1-журнал~~ → ✅ мигрирован на v2 (`SPRING_WORK_SPEC`). **kit-2 = 7/7 ФИПИ ✅ + 1 бонус**

### 30.6. Что меняем в правилах после промаха 2026-05-15

1. **§13 DoD** — добавлен пункт №0 «ФИПИ-якорь» (см. выше): без дословной
   цитаты ФИПИ в docstring опыт не считается готовым.
2. **§14 шаг 0** — добавляется в эту версию REFERENCE: «открой Приложение 2
   СПЕЦ ФИПИ → найди свою фразу → дословно процитируй».
3. **PLAYBOOK шаг 0** — то же, но с готовой `pdfplumber`-командой.
4. **`kits.ts` Kit-схема** — поле `isFipi: boolean` (true по умолчанию,
   false для бонусов); каталог-главная показывает badge.
5. **Selfcheck-скрипты** — обязательный assertion на ФИПИ-инвариант.

---

## 31. Канонический layout опыта — UX-консистентность (правило 2026-05-16)

**Корневая причина создания:** опыт 1.3 был сделан как 3-колоночный grid
(stage | journal | tray), что нарушило мышечную память ученика: в 1.1 и
1.2 layout 2-колоночный с floating journal-panel в углу stage. Пользователь
прервал работу с правилом: «всё в едином стиле — расположение элементов,
журнала, алгоритма действий!!!! Опыт сделан по-другому. Зафиксируй в
правилах и переделай».

### 31.1. Эталоны

| Опыт | Файл template | Файл CSS | Статус |
|---|---|---|---|
| 1.1 «Плотность» | `kit-1-hydrostatics/src/screens/density-solid/template.html` | `styles/density-experiment.css` | **главный эталон** |
| 1.2 «Архимед» | `kit-1-hydrostatics/src/screens/archimedes/template.html` | `styles/archimedes-experiment.css` | эталон с динамометром |
| 2.1 «Жёсткость» | `kit-2-forces/src/screens/spring-stiffness/template.html` | `styles/spring-experiment.css` | эталон kit-2 |
| 2.2 «Трение» | `kit-2-forces/src/screens/friction/template.html` | `styles/friction-experiment.css` | эталон kit-2 |

При новом опыте — открыть эталон того же кита и **скопировать структуру**.
Менять можно только специфику сцены (приборы, drop-zones), не layout.

### 31.2. Структура шаблона (HTML)

```html
<main class="{kit}-stage">                       <!-- главный grid 2 колонки -->
  <section class="{kit}-workbench">              <!-- левая колонка -->
    <header class="{kit}-header">
      <ol class="{kit}-steps" id="{prefix}-steps">    <!-- степпер этапов 1→2→…→N -->
        <li class="step" data-step="1">…</li>
        …
      </ol>
      <div class="{kit}-hint" id="{prefix}-hint">…</div> <!-- текущая подсказка -->
      <button id="{prefix}-reset-btn" class="reset-btn">↻</button>
    </header>
    <div class="{kit}-stage-area" id="{prefix}-stage">
      <span class="stage-corner stage-corner--tl"></span>     <!-- 4 декоративных угла -->
      <span class="stage-corner stage-corner--tr"></span>
      <span class="stage-corner stage-corner--bl"></span>
      <span class="stage-corner stage-corner--br"></span>

      <!-- 1) Слоты-приборы (drop-zones + mount) на полу/штативе -->
      <div class="{kit}-slot" id="…" data-dropzone="…" data-dropzone-id="…">…</div>
      …

      <!-- 2) Floating journal-panel В УГЛУ stage (НЕ отдельная колонка!) -->
      <aside class="measurement-panel" id="…-journal-panel">
        <header class="measurement-panel-header">
          <button class="measurement-toggle">Журнал измерений</button>
          <div id="{prefix}-record-mode-slot"></div>          <!-- §21 toggle режимов -->
        </header>
        <div class="measurement-body">
          <div class="journal-empty">…подсказка про сборку…</div>
          <div id="{prefix}-record-pending-slot" hidden>
            <button id="{prefix}-record-pending-btn">Записать в журнал</button>
          </div>
          <div class="formula-display" hidden>…</div>
          <div id="{prefix}-journal-host"></div>              <!-- §21 renderJournalTable -->
        </div>
      </aside>
    </div>
  </section>

  <aside class="equipment-panel">                <!-- правая колонка: tray -->
    <section class="equipment-group">
      <h3 class="equipment-group-title">Измерительные приборы</h3>
      <div class="equipment-grid equipment-grid-2">
        <lab-equipment-card data-eq="…" data-draggable="…">…</lab-equipment-card>
      </div>
    </section>
    <section class="equipment-group">
      <h3 class="equipment-group-title">Цилиндры / специфика опыта</h3>
      …
    </section>
    <section class="equipment-group">
      <h3 class="equipment-group-title">Расходные</h3>
      …
    </section>
  </aside>
</main>
<div id="{prefix}-live-region" role="status" aria-live="polite" class="sr-only"></div>
```

### 31.3. Grid (CSS)

```css
.{kit}-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: var(--space-4);
  padding: var(--space-4) var(--layout-padding);
  height: 100%;
  overflow: hidden;
}
@media (min-width: 1600px) {
  .{kit}-stage {
    grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
  }
}
.{kit}-workbench {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-3);
}
.measurement-panel {
  /* floating aside В УГЛУ stage-area: */
  position: absolute;
  right: var(--space-4);
  bottom: var(--space-4);
  width: min(380px, 36%);
  max-height: 60%;
}
```

### 31.4. Имена `data-eq` / `data-draggable` / `data-dropzone`

**Каноничные** (используются в 1.1, 1.2):

| Прибор | data-eq / data-draggable |
|---|---|
| Динамометр 1 Н | `dyno-1` |
| Динамометр 5 Н | `dyno-5` |
| Цилиндры | `cyl-1` / `cyl-2` / `cyl-3` / `cyl-4` |
| Весы | `balance` |
| Мензурка | `cylinder` |
| Стакан с водой | `beaker` |
| Нить | `thread` |
| Соль с палочкой | `salt` |

**Запрещено**: `dynamometer-1`, `beaker-water` и т.п. развёрнутые имена.
Их можно различать по конфигурации (например, `<lab-beaker liquid="water">`),
а `data-eq` — короткий и стабильный.

### 31.5. Алгоритм действий ученика (степпер)

Канон 1.1/1.2 — степпер из 5–7 этапов сверху workbench, каждый с
`data-state="pending|active|done"`. По прогрессу:

- `pending` — серый, ученик ещё не дошёл
- `active` — жёлто-оранжевый (`--color-brand-orange`), текущий шаг
- `done` — зелёный с галочкой ✓

**Запрещено**: stepper-кнопки рядом со сценой (как у меня было в 1.3).
Степпер — это **индикатор прогресса**, а действия — drag из tray или
встроенные кнопки рядом с приборами на сцене.

### 31.6. Чек-лист соответствия канону

При создании нового опыта пройти **до начала кода**:

- [ ] Открыт эталон в соседнем табе.
- [ ] Скопирована структура `<main class="{kit}-stage">`.
- [ ] 2 колонки grid (НЕ 3, НЕ 4).
- [ ] Заголовок-степпер сверху.
- [ ] Floating measurement-panel в углу stage (НЕ отдельная колонка).
- [ ] Equipment-panel справа с 2–3 группами карточек.
- [ ] `data-eq` имена — каноничные (§31.4).
- [ ] Reset-кнопка — иконка-крестик в header (не где-то ещё).
- [ ] Stage-corners (4 декоративных угла) присутствуют.

При нарушении любого пункта — **переписать**, не оставлять. UX-консистентность
важнее экономии времени.
