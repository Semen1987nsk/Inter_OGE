# PLAYBOOK — Как собрать новый опыт в Inter_OGE за день

> **Назначение.** Краткий entry-point для разработчика (или AI-агента),
> которому нужно собрать новый опыт виртуальной лаборатории. Каждый шаг
> ссылается на конкретный § в [`2-1-spring/REFERENCE.md`](2-1-spring/REFERENCE.md)
> — главном каноне.
>
> **Цель.** За 6–8 часов работы получить spec-compliant новый screen
> (для существующего кита) или 2–3 дня — целый новый кит.
>
> **Перед началом:** прочитай [`CLAUDE.md`](../CLAUDE.md) Inter_OGE и
> [`README.md`](../README.md). Они объясняют монорепо-структуру.

---

## 8 шагов

### Шаг 0 — 🛑 ФИПИ-якорь (15 мин, обязательно — без этого опыт не делаем)

**Корневое правило:** «всё строго по ФИПИ». Опыт должен иметь дословную
цитату из Приложения 2 ФИПИ или КОДИФ §1.29. Если опыта там нет — это
**бонус ЛАБОСФЕРЫ**, и решение «делать ли» принимается отдельно.

**Команда для извлечения нужной страницы:**

```powershell
# Приложение 2 СПЕЦ — двухстолбцовый лист, индексы 0-based:
#   pages[10] → стр. 16–17 (Комплект №1 + №2)
#   pages[11] → стр. 18–19 (Комплект №3 + №4)
#   pages[12] → стр. 20–21 (Комплект №5 + №6)
#   pages[13] → стр. 22–23 (Комплект №7 + Прил.3)
python -c "import pdfplumber; print(pdfplumber.open(r'C:\Users\Administrator\ООО ЛАБОСФЕРА\.business\Исходники\ФИ-9 ОГЭ 2026_СПЕЦ.pdf').pages[10].extract_text(use_text_flow=True, x_tolerance=2, y_tolerance=3))"

# КОДИФ §1.29 «Практические работы» — полный канонический список (стр. 14):
python -c "import pdfplumber; print(pdfplumber.open(r'C:\Users\Administrator\ООО ЛАБОСФЕРА\.business\Исходники\ФИ-9 ОГЭ 2026_КОДИФ.pdf').pages[6].extract_text(use_text_flow=True, x_tolerance=2, y_tolerance=3))"
```

**Чек-лист:**

- [ ] Нашёл дословную фразу-описание опыта в Приложении 2 ФИПИ.
- [ ] Сверился с КОДИФ §1.29 — опыт есть в перечне практических работ.
- [ ] Записал цитату с указанием страницы/комплекта в docstring
      будущего `<Id>Experiment.ts` (по форме из REFERENCE §13 «ФИПИ-якорь»).
- [ ] Открыл REFERENCE §30 — добавил/обновил строку в таблице покрытия.
- [ ] Если опыта в ФИПИ НЕТ — пометил `isFipi: false` в `kits.ts` и
      получил отдельное согласование на «бонус ЛАБОСФЕРЫ».

> Этот шаг **появился 2026-05-16** после промаха: kit-2 имел 4 «готовых»
> опыта, из них 1 (`spring-work`) — не по ФИПИ, 1 (`friction` Task B) —
> заявлен в UI, но `work=null`. См. REFERENCE §30 «Покрытие ФИПИ».

### Шаг 1 — Подготовка контекста (15 мин)

| # | Что | Где | Зачем |
|---|---|---|---|
| 1 | Прочитай **методичку** | `.business/Продукты/Програмное обеспечение/ГИА-лаборатория Физика/методичка/src/0X-*.md` | Оборудование, допуски, формулы, правила измерения |
| 2 | Посмотри **продакт-фото комплекта** | `.business/Маркетинг/Сборка-КП/photos/kit-N.png` + `experiments/home/public/photos/kit-N.png` | Цвет, форма, материалы. Отдельной папки «фото оборудования» в репо нет |
| 3 | Проверь **каталог KITS** | [`home/src/data/kits.ts`](home/src/data/kits.ts) | Есть ли опыт в `experiments[]`? `isFipi: true` или нужен бонус? |

> См. **§29** и **§30** REFERENCE.md — источники знаний и текущее
> ФИПИ-покрытие.

### Шаг 2 — Спецификация (1ч)

Создай `.business/спеки/<YYYY-MM-DD>-<опыт-id>.md` по структуре из
REFERENCE §29.4. Эталоны (читай как образец):

- `2026-05-06-кит-1-опыт-1-1-плотность.md` — спека опыта 1.1 ✅
- `2026-05-07-кит-1-опыт-1-2-архимедова-сила.md` — спека опыта 1.2 ✅
- `2026-05-05-опыт-2-4-работа-силы-упругости.md` — ⚠️ образец БЕЗ
  ФИПИ-якоря (исторически — корневая причина, почему 2.4 не по ФИПИ).
  Новые спеки обязаны начинать с §«ФИПИ-якорь».

Обязательные разделы:

- **🛑 ФИПИ-якорь** — дословная цитата Приложения 2 + страница (см. Шаг 0).
- **Цель опыта** (педагогическая, по ФИПИ).
- **Drop-matrix** (50+ комбинаций source × target × pre-condition).
- **Инварианты PI-1..PI-N** — 5 свойств которые ВСЕГДА держатся
  (например «k всегда > 0», «после reset в Store пусто»).
- **Anti-patterns** — что НЕ делать (см. «Грабли» внизу).
- **Risk-register** — таблица рисков с mitigation.
- **DoD-чеклист** копия из §13 REFERENCE.md.

> Без спеки **не начинай кодить**. Спека = ТЗ для тебя самого.

### Шаг 3 — SPEC журнала в shared-spa (15 мин)

Добавь в [`_shared-spa/src/lib/journal/specs.ts`](_shared-spa/src/lib/journal/specs.ts):

```ts
export const <EXPERIMENT>_SPEC: JournalSpec = {
  experimentId: '<X.Y>',
  kitId: 'kit-<N>',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    // direct (пишет программа или ученик):
    { key: 'm_g', label: 'm, г', source: 'direct', unit: 'г', format: 'int' },
    // derived (ученик вводит + ✓ проверка):
    {
      key: 'F_N',
      label: 'F, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => ((row.m_g ?? 0) * 9.8) / 1000,
    },
  ],
};
```

**Эталоны** (читай как образец):

- `SPRING_SPEC` (specs.ts:105-146) — m, l₀, l₁, ΔL, F, k
- `DENSITY_SPEC` (specs.ts:27-58) — m, V₁, V₂, V, ρ
- `ARCHIMEDES_SPEC` (specs.ts:61-102) — P_возд, P_жид, F_A_изм, F_A_теор
- `FRICTION_SPEC` (specs.ts:148-184) — m, F_тр, N, μ

> См. **§21** REFERENCE.md — полный стандарт unified journal v2.

### Шаг 4 — Скелет опыта (1ч)

Скопируй `experiments/kit-1-hydrostatics/src/screens/density-solid/` →
`experiments/<kit>/src/screens/<новый-id>/`. Структура:

```
<новый-id>/
├── <NewExperiment>Screen.ts    # фасад IScreen (mount/unmount/saveState)
├── <NewExperiment>Experiment.ts # оркестратор (Store + DragController + Journal)
├── template.html               # HTML-структура сцены
└── controller/                  # доп. контроллеры (snap-zones, drag)
```

**Обязательные слоты в `template.html`:**

```html
<div id="stand-container"></div>              <!-- сцена со штативом -->
<div id="hint-bar"></div>                     <!-- §8 подсказки -->
<div id="drag-overlay"></div>                 <!-- §5 drag fixed-overlay -->
<div id="record-mode-slot"></div>             <!-- §21 toggle 3 режима -->
<div id="journal-host"></div>                 <!-- §21 renderJournalTable -->
<div id="record-pending-slot" hidden>         <!-- §21 pending-плашка -->
  <button id="record-pending-btn">Записать в журнал
    <span id="record-pending-summary"></span></button>
</div>
<div id="live-region" aria-live="polite"></div>  <!-- §10 a11y -->
```

**Дополнительно:**

- `types/<id>/setup.ts` — Store state shape (`State`, `INITIAL_STATE`).
- `physics/<id>/*.ts` — pure-функции с Vitest 100%.
- `__tests__/<id>-state-machine.test.ts` — DOM lifecycle тест.

> См. **§14** REFERENCE.md — детальный bootstrap.

### Шаг 5 — SVG-приборы Web Components (2ч)

Если нужны новые `lab-*` компоненты:

- Префикс **`lab-*`**, `attachShadow({ mode: 'open' })`.
- **ViewBox конвенции:** наборный груз 60×130, пружина-доска 130×360.
- **Геометрический API:** `getTopHookY()`, `getWeightHookY()`,
  `getHookPosition(slot)` — возвращают пиксели для chain-расчётов.
- **Контракт атрибутов:** `kind`, `mass`, `data-equipment-id`, `data-eq`.

**ОБЯЗАТЕЛЬНО в shadow CSS:**

```css
svg[hidden] { display: none; }
```

Без этого браузер игнорирует HTML-атрибут `[hidden]` на SVG → все
режимы (rod/disc/composite) рисуются разом.

**Грабли SVG (см. §27 + §28):**

- Eyelet/петля крепления ≤ 5% диаметра, иначе читается как «верхний диск».
- Уступы дисков (разница rx) ≤ 2 SVG-юнита, иначе лестница уступов.
- Flange — не плоский эллипс с заливкой металла. Тонкая (ry≤1) тёмная кромка.
- Сумма функциональных деталей ≥ 15% высоты viewBox — иначе мозг группирует.

> См. **§3** (Web Components), **§27** (perceptual doubling),
> **§28** (composite weight).

### Шаг 6 — Drag&Drop + Journal v2 wiring (1.5ч)

**Импорты из shared-spa:**

```ts
import { DragController, type SnapZone } from '@labosfera/shared-spa/controller/DragController';
import {
  getRecordMode, renderRecordModeToggle, applyRecordModeAttribute,
} from '@labosfera/shared-spa/lib/record-mode';
import { renderJournalTable } from '@labosfera/shared-spa/lib/journal/render';
import { <EXPERIMENT>_SPEC } from '@labosfera/shared-spa/lib/journal/specs';
import { verifyRow } from '@labosfera/shared-spa/lib/journal/verify';
import { parseRu } from '@labosfera/shared-spa/lib/journal/format';
import type { JournalVerdict, JournalRow } from '@labosfera/shared-spa/lib/journal/types';

const RECORD_MODE_KIT = 'kit-<N>';
```

**State в классе Experiment:**

```ts
#journalDrafts = new Map<number, Record<string, number>>();
#journalVerdicts = new Map<number, Record<string, JournalVerdict>>();
#lastRecordedSignature = '';
#detachRecordModeToggle: (() => void) | null = null;
```

**Constructor:**

```ts
this.#detachRecordModeToggle = renderRecordModeToggle(
  this.#refs.recordModeSlot,
  { kitId: RECORD_MODE_KIT, onChange: () => this.#refreshUi() },
);
applyRecordModeAttribute(getRecordMode(RECORD_MODE_KIT));
```

**Snap-zone onDrop** — ОБЯЗАТЕЛЬНО возвращай элемент в slot:

```ts
this.#drag.addSnapZone({
  id: 'target-zone',
  accepts: ['<kind>'],
  getRect: () => target.getBoundingClientRect(),
  onDrop: ({ element, equipmentId }) => {
    const ok = this.#addToScene(equipmentId);
    if (ok && this.#refs.tray) {
      this.#refs.tray.parkElement(equipmentId, element);  // §26
    }
    return ok;
  },
});
```

**`reset()` ОБЯЗАН очистить state:**

```ts
reset(): void {
  // ... обычный reset
  this.#journalDrafts.clear();
  this.#journalVerdicts.clear();
  this.#lastRecordedSignature = '';
}

destroy(): void {
  this.#detachRecordModeToggle?.();
}
```

**Render journal (см. эталон `kit-2/SpringExperiment.ts:1467`):**

```ts
renderJournalTable(this.#refs.journalHost, <EXPERIMENT>_SPEC, rows, {
  mode: this.#recordMode(),
  onCellInput: (rowIdx, key, value) => { /* save в drafts */ },
  onVerify: (rowIdx) => {
    const verdicts = verifyRow(SPEC.columns, tempRow);
    this.#journalVerdicts.set(ts, verdicts);
    // применить .j-verdict--* CSS-классы на ячейки
  },
});
```

**CSS импорт** в `main.ts` пакета:

```ts
import '@labosfera/shared-spa/lib/journal/journal.css';
```

> См. **§5** (DragController), **§21** (Journal v2), **§26** (parkDiscElement).

### Шаг 7 — Самопроверка (1ч) — Definition of Done

Создай `selfcheck-<id>.mjs` в корне пакета. Минимальный шаблон:

```js
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newContext({ viewport: { width: 1600, height: 900 } }).newPage();

// Multi-state скрины
await page.goto('http://localhost:<port>/?screen=<id>');
await page.screenshot({ path: 'state-0-empty.png' });
// ... drag оборудования через mouse.move/down/up ...
await page.screenshot({ path: 'state-2-equipped.png' });

// REST-state assertion (§25 + §26)
const HIDE_AT_REST = ['.drop-zone', '.attached-eq.snap-target',
  '[class*="pulse"]', '[data-slot-target]'];
for (const sel of HIDE_AT_REST) {
  const visible = await page.evaluate((s) =>
    [...document.querySelectorAll(s)].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
    }).length, sel);
  if (visible > 0) throw new Error(`REST FAIL: '${sel}' visible (${visible})`);
}

// 3-режимный тест
for (const mode of ['semi-auto', 'fully-manual', 'fully-auto']) {
  await page.evaluate((m) => localStorage.setItem('inter-oge.record-mode.kit-<N>', m), mode);
  await page.reload();
  // assert body.dataset.recordMode === mode
  // assert UI отличается по режимам
}

// Overlay-dup assertion (§26)
const overlayDups = await page.evaluate(() =>
  [...document.querySelectorAll('lab-*[kind]')].filter(d => !d.closest('.tray-slot')).length);
if (overlayDups !== 0) throw new Error(`Overlay-dup: ${overlayDups}`);
```

**Запуск:** `node selfcheck-<id>.mjs` после `npm run dev`.

**DoD чеклист (§13 REFERENCE.md):**

- [ ] `npm run typecheck` зелёный
- [ ] `npm run test` — все unit-тесты pass
- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — пакет собирается
- [ ] `selfcheck-<id>.mjs` — PASS (multi-state + REST + 3-режима + overlay-dup)
- [ ] Я лично прошёл сценарий ученика в браузере на http://localhost:<port>
- [ ] KITS data обновлён (`done`/`total`)

> См. **§13** REFERENCE.md — полный DoD-чеклист.

---

## Грабли — быстрый справочник

Топ-7 ошибок которые уже ловили в прошлых сессиях:

| # | Грабля | Решение | § |
|---|---|---|---|
| 1 | DOM-дубль в overlay после drop | `parkElement` возврат в slot | §26 |
| 2 | Self-check через programmatic API не ловит overlay-dup | Только `page.mouse.move/down/up` | §26 |
| 3 | SVG-режимы рисуются разом (HTML-атрибут `[hidden]` ненадёжен) | `svg[hidden]{display:none}` в shadow CSS | §27 |
| 4 | Eyelet/петля читается как 4-й диск | rx≤5% диаметра viewBox | §27 |
| 5 | Лестница уступов диаметров читается как N+1 дисков | Уступ ≤ 2 SVG-юнита | §27 |
| 6 | Плоский flange читается как ещё один диск | Тонкая тёмная нижняя кромка вместо flange | §28 |
| 7 | CSS дубликат `.hung-stack lab-*` в spring vs friction (last-wins) | Один источник в одном CSS-файле | §28 |

---

## Шпаргалка путей

```
ФИПИ PDFs            .business/Исходники/ФИ-9 ОГЭ 2026_*.pdf
Методичка            .business/Продукты/.../методичка/src/0X-*.md
Фото оборудования    .business/Маркетинг/Сборка-КП/photos/kit-N.png
                     experiments/home/public/photos/kit-N.png (web)
Спеки опытов         .business/спеки/YYYY-MM-DD-<id>.md
                     эталоны: 2026-05-06-кит-1-опыт-1-1-плотность.md
                              2026-05-07-кит-1-опыт-1-2-архимедова-сила.md
                     новые ОБЯЗАНЫ начинаться с §«ФИПИ-якорь»
ФИПИ-покрытие        REFERENCE.md §30 — какие опыты ✅/⚠️/❌
Конкуренты           .business/Продукты/.../digitalLab/COMPETITIVE_ANALYSIS.md
SPEC журнала         experiments/_shared-spa/src/lib/journal/specs.ts
Render               experiments/_shared-spa/src/lib/journal/render.ts
Record-mode toggle   experiments/_shared-spa/src/lib/record-mode.ts
DragController       experiments/_shared-spa/src/controller/DragController.ts
KITS каталог         experiments/home/src/data/kits.ts
Канон                experiments/2-1-spring/REFERENCE.md
```

---

## Эталоны для копирования

Лучшие screens для копирования как образец (status на 2026-05-15):

| Эталон | Файл | Особенность |
|---|---|---|
| **Density (1.1)** | `experiments/kit-1-hydrostatics/src/screens/density-solid/` | Полный spec-compliant journal v2, отличный bootstrap |
| **Spring stiffness (2.1)** | `experiments/kit-2-forces/src/screens/spring-stiffness/` | Composite weight + drag-overlay-dup fix |
| **Archimedes (1.2)** | `experiments/kit-1-hydrostatics/src/screens/archimedes/` | Drag-by-thread, нестандартная физика |
| **Legacy spring (2-1-spring)** | `experiments/2-1-spring/src/SpringExperiment.ts` | Подробные комментарии (для understanding) |

---

## Verification (финальный чек)

После того как пройдёшь все 7 шагов:

```bash
# Из корня монорепо
npm run typecheck   # все 5 пакетов
npm run test        # 1240+ unit-тестов
npm run lint        # 0 errors
npm run build       # все 5 SPA собираются
npm run dev:<kit>   # запусти и пройди сценарий руками
node experiments/<kit>/selfcheck-<id>.mjs  # автопроверка
```

После всего — обнови `KITS data` (`progress.done++`) и добавь рефлексию
в `.business/история/<дата>-<опыт-id>-готов.md`.

---

> **Дальнейшее чтение:** [`REFERENCE.md`](2-1-spring/REFERENCE.md) — канон,
> [`CLAUDE.md`](../CLAUDE.md) — правила работы, [`README.md`](../README.md) —
> структура монорепо.
