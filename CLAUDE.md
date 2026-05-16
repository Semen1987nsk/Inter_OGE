# Inter_OGE — фронтис репозитория

> **Что это.** Виртуальная лаборатория ЛАБОСФЕРА для подготовки к ОГЭ
> по физике (ФИПИ-2026). 7 комплектов оборудования (киты),
> каждый — независимый SPA в `experiments/<id>/`. 100% client-side.
> Stack: TypeScript 5.6 strict + Vite 6 + Web Components + Vitest +
> Playwright. Целевая аудитория — ученик 9 класса РФ.

> **Этот файл читает Claude Code автоматически в начале сессии.**
> Если правка нетривиальная — здесь указатель, что прочитать дальше.

---

## ⭐ Перед любой нетривиальной правкой — обязательное чтение

| Когда                                | Что читать                                              |
|--------------------------------------|---------------------------------------------------------|
| **Сборка НОВОГО опыта**              | [`experiments/PLAYBOOK.md`](experiments/PLAYBOOK.md) ← entry-point, 7 шагов |
| **Любая работа с опытом**            | `experiments/2-1-spring/REFERENCE.md` ← главный канон   |
| **Drag&drop / UX перетаскиваний**    | `.business/спеки/2026-05-06-drag-matrix-kit-1.md`       |
| **Тестирование (что покрывать)**     | `.business/спеки/2026-05-06-blind-spots-testing.md`     |
| **Главная страница / каталог**       | `.business/спеки/2026-05-06-каталог-главная-страница.md`|
| **Параметры приборов ФИПИ**          | `.business/Исходники/ФИ-9 ОГЭ 2026_СПЕЦ.pdf`            |
| **Состав комплектов, допуски**       | `.business/Продукты/.../методичка/src/01-kits.md`       |

Читать не обзорно — **дословно цитировать** перед тем как писать
код. Это главный приём против галлюцинаций.

---

## ⭐ Главный принцип — «полная имитация реального мира»

Программа должна вести себя как настоящая физическая лаборатория.
Это сильнее любого UX-ярлыка.

- **Любой предмет на сцене — физический объект.** Можно взять с
  любой точки (карточка / весы / мензурка / штатив) и положить
  в любую другую валидную (включая обратно в комплект).
- **Реверсивно**: туда-сюда сколько хочешь, без блокировок «только
  через крестик». Drag — главный жест, крестик — дублирующий.
- **Если в реальной лаборатории это можно — программа разрешает.**
  Даже «странные» сценарии (цилиндр в сухую мензурку): физика
  разрешает → программа разрешает. Может быть announce-подсказка,
  но не отказ.
- **Карточка в комплекте после взятия = пустая ячейка** с dashed
  контуром и подсказкой «← на столе». Drag-back в эту же ячейку
  возвращает прибор в комплект.

Из этого принципа вытекает почти весь drag-state-machine. Все
комбинации источник × цель × предусловие зафиксированы матрицей в
[2026-05-06-drag-matrix-kit-1.md](../.business/спеки/2026-05-06-drag-matrix-kit-1.md)
(применимо ко всем китам, не только №1).

---

## ⭐ Образец-эталон — Комплект №2 (опыт 2.1 «Жёсткость пружины»)

`experiments/2-1-spring/` — **референс**, по которому делаются все
остальные опыты. Любое отклонение — обоснованно и зафиксировано в
самом `REFERENCE.md`. Что брать с него:

- **Дизайн-систему** (палитры, типографика, токены) — `src/styles/tokens.css`.
- **Расположение окон** — workbench-stage слева, equipment-panel
  справа, floating measurement-panel внутри сцены (PhET-стиль).
- **Логику** — Store + DragController + HintEngine + один большой
  оркестратор `XxxExperiment.ts`.
- **Подсказки** — Stepper сверху, hint-bar справа от него, live-region
  для скринридеров. Текст пишется в `i18n/ru.ts`.
- **Web Components** — префикс `lab-*`, Shadow DOM `open`, geometry API.
- **Тесты** — 4 уровня (см. ниже).
- **Definition of Done** — REFERENCE.md §13.

**Если делаешь новый опыт** — копировать `2-1-spring/` целиком как
заготовку, переименовать types/state, заменить физику и компоненты.
Не изобретать структуру с нуля.

---

## ⭐ Дизайн оборудования — где брать вдохновение

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

Когда рисуешь SVG прибора — `paint-order: stroke` + контурная
обводка для контраста на любом фоне. Шкала: белая заливка + тёмный
stroke 0.6-0.9px. Ticks с `vector-effect: non-scaling-stroke`.

---

## ⭐ Единый стиль и функционал всех опытов

Один опыт = один SPA в `experiments/<id>/`. Между ними:

- **Общий шелл** (header «Кит-N · Опыт N.M», back-button «К комплектам»)
  — один на весь kit, экспы — модули внутри. См. `_shared-spa/` и
  `kit-2-forces/`, `kit-1-hydrostatics/`.
- **Один и тот же layout сцены**: workbench слева + equipment-panel
  справа + measurement-panel floating.
- **Идентичные подсказки**: Stepper «1→2→3→4→5», hint-bar справа,
  live-region для a11y.
- **Идентичный drag&drop UX**: ghost у курсора, source-карточка как
  «пустая ячейка» с dashed border, drop-hover подсветка зоны.
- **Журнал измерений** одинаковый: формула наверху, табличка с
  inputs для пользовательских вычислений + кнопка «✓ Проверить»
  с tolerance ±5%.
- **Reset-кнопка** в правом-верху hint-bar — общая на все опыты.

### 🚨 Обязательный стандарт журнала (§21) — для НОВЫХ опытов

**Никогда не писать собственный рендер журнала.** Любой новый опыт
ОБЯЗАН использовать unified v2 из `_shared-spa/`:

```ts
import { renderJournalTable } from '@labosfera/shared-spa/lib/journal/render';
// или '@shared/lib/journal/render' (оба alias валидны)
import { verifyRow } from '@labosfera/shared-spa/lib/journal/verify';
import { parseRu } from '@labosfera/shared-spa/lib/journal/format';
import {
  getRecordMode, renderRecordModeToggle, injectRecordModeToggleStyles,
} from '@labosfera/shared-spa/lib/record-mode';
import { /* SPEC новой задачи */ } from '@labosfera/shared-spa/lib/journal/specs';
```

Перед написанием опыта:

1. **Создать SPEC** в `_shared-spa/src/lib/journal/specs.ts` с колонками
   (meta/direct/derived), tolerance, expectedFromRow для derived.
   Эталоны: `SPRING_SPEC`, `DENSITY_SPEC`, `ARCHIMEDES_SPEC`, `FRICTION_SPEC`.
2. **HTML-слоты** в template: `#record-mode-slot`, `#journal-host`,
   `#record-pending-slot` с кнопкой `#record-pending-btn` + summary span.
3. **CSS** — импорт `@labosfera/shared-spa/lib/journal/journal.css` в `main.ts`.
4. **State**: `#journalDrafts: Map<number, Record<string, number>>` +
   `#journalVerdicts: Map<number, Record<string, JournalVerdict>>`.
5. **3 режима**: `semi-auto` (default), `fully-manual`, `fully-auto` —
   ученик/учитель переключают через toggle, URL `?mode=...` фиксирует.
6. **Reset** очищает drafts + verdicts + lastRecordedSignature.

Эталоны для копирования:

- `experiments/2-1-spring/src/SpringExperiment.ts` — legacy reference (полная v2).
- `experiments/kit-2-forces/src/screens/spring-stiffness/SpringExperiment.ts` — consolidated reference (2026-05-15 миграция).
- `experiments/kit-1-hydrostatics/src/screens/density-solid/DensityExperiment.ts` — для kit-1 паттерна.

Запрещено для новых опытов:

- Простой `tr.innerHTML = ...` для рендера строк.
- Свой `record-form` с input'ами вне shared `renderJournalTable`.
- Жёстко закодированные `tolerance` в проверке (только через SPEC.columns).
- Игнорирование `body[data-record-mode]` — это глобальный селектор для
  hint-копи и формулы (скрывается в fully-manual).

Ученик не должен видеть разницы между опытами кроме оборудования
и физики. Это и записано в спеке Кит-1: «такой же интерфейс как
Кит-2». Все будущие киты — по тому же образцу.

---

## ⭐ Стандарт тестирования — 4 уровня + visual

Опираемся на методологию опыта 2.2 (162 теста, ~55k ситуаций, 0
багов в проде) и Кит-1 (151 тест, 5 уровней). Минимум для нового опыта:

1. **Unit (`physics/__tests__/`)** — pure-функции физики, ≥95%
   coverage. Vitest, никакого DOM.
2. **Property-fuzzer (`__tests__/comprehensive-fuzzer.test.ts`)** —
   12+ категорий property invariants × 300-2000 итераций ≈ 25k+
   проверок. Использовать `fast-check` или ручной LCG для
   воспроизводимости.
3. **Integration / state-machine (`__tests__/state-machine.test.ts`,
   `__tests__/drop-combinations.test.ts`)** — happy-dom + customElements,
   полная матрица drag&drop A-H, mount/unmount/reset round-trip.
4. **E2E (`e2e/<id>.spec.ts`)** — Playwright real Chromium,
   критические пути: happy-path для каждого ключевого варианта,
   reset, return-to-kit, reverse drag.
5. **Visual regression (`e2e/visual-regression.spec.ts`)** —
   `toHaveScreenshot` с `animations: 'disabled'`, baseline в
   `e2e/<spec>.spec.ts-snapshots/`. Ловит баги «state ОК, рендер
   неверный».

**Каждый найденный баг → новый regression-тест.** Не «починил и
забыл», а «починил + добавил тест который ловит этот класс».

10 категорий слепых зон тестирования (rendering, state↔visual
invariants, physics realism, edge cases композиции, concurrency,
visual layout, accessibility, persistence, cleanup, lifecycle) —
методичка в [.business/спеки/2026-05-06-blind-spots-testing.md](../.business/спеки/2026-05-06-blind-spots-testing.md).

---

## Жёсткие конвенции (быстрая выжимка из REFERENCE)

### Web Components
- Префикс `lab-*` обязателен.
- `attachShadow({ mode: 'open' })` всегда.
- `CustomEvent` всегда `composed: true`.
- ARIA-label НИКОГДА не палит ответ ученику.

### Store
- Один на опыт, immutable, без зависимостей. Подписан только оркестратор.

### Drag & Drop
- Источник истины — `accepts: AttachKind[]`. Drop-zone подсветилась
  ⇔ drop ДОЛЖЕН пройти.
- Реверсивность: cyl на весах ↔ cyl в мензурке ↔ cyl в комплекте.
- Карточка `[status='placed']` = drop-zone для возврата + dashed
  контур + «← на столе»; data-draggable динамически снимается.
- Visual `[data-dragging='true']` overlay → `visibility: hidden`
  (нет «задвоения» оригинал + ghost).
- Ghost positioning: учитывать `grabOffset = (cursor - sourceCenter)`
  при pointerdown, иначе цилиндр прыгает.

### Адаптивная сцена
- Приборы фиксированного pixel-размера, штатив адаптивного.
- Не делать auto-zoom. Брейкпоинты ≥1600 / 1280 / 1024 / 768.

### Физика
- `G = 9.8` (РФ-школа). Параметры из ФИПИ-спеки, не из головы.
- Pure-физика в `src/physics/`, без DOM/Store.

### Анти-паттерны
- ❌ Auto-zoom камеры, scale() на корне сцены.
- ❌ «Умные» drop-зоны угадывающие что бросили.
- ❌ Дробление оркестратора на 10 контроллеров.
- ❌ `--no-verify`, `--force` ради «прошло».
- ❌ Тесты «после фикса» — пиши одновременно.
- ❌ Эмодзи в UI приборов (только SVG-иконки и текст).

---

## Команды (из `experiments/<id>/`)

```bash
npm run dev          # vite dev (5174 для kit-1, 5181 для kit-2 forces)
npm run typecheck    # NODE_OPTIONS=--max-old-space-size=4096 tsc -b --noEmit
npm test             # vitest run
npm run test:e2e     # playwright (real Chromium)
npm run test:all     # vitest + playwright
npm run lint         # eslint
```

Vitest config для тяжёлых DOM-тестов (см. `vite.config.ts` Кит-1):
```ts
test: {
  pool: 'forks',
  poolOptions: {
    forks: {
      execArgv: ['--max-old-space-size=8192', '--max-semi-space-size=512', '--expose-gc'],
    },
  },
  isolate: true,
  fileParallelism: false,
}
```
И `globalThis.gc?.()` в `afterEach` — иначе happy-dom + customElements
копят shadow-DOM-метаданные между тестами и упираются в OOM.

---

## Memory & spec директории

- **`.business/спеки/`** — продуктовые спеки и матрицы (drag, blind-spots,
  каталог, новые опыты). Создаются по интервью перед кодом.
- **`.business/история/`** — рефлексии по сессиям, контекст между днями.
- **`~/.claude/memory/`** — auto-memory: пользователь, feedback, project,
  reference. Кросс-сессионная.

При ответе на «почему мы так делаем» — сначала проверить эти три
источника, потом в коде, потом в git log. Только потом — догадываться.

---

## Не уверен — спрашивай

Не выдумывай параметры приборов и формулы. Открой ФИПИ-спеку, открой
Перышкина 9 кл., открой `REFERENCE.md`. Цитируй дословно перед тем
как писать код. Это — главный приём против галлюцинаций.
