# Стартовая страница «Постер-стена» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить stub `experiments/home/` на рабочую стартовую страницу — постер-стена 7 комплектов с drawer выбора опыта, поиском, фильтрами и ребрендингом, мирового уровня и доступную.

**Architecture:** Vanilla Web Components (Shadow DOM open) + чистые TS-модули логики (grid-навигация, фильтры, поиск, запуск), собираемые в `main.ts` в app-shell. Данные — из `src/data/kits.ts`. Тесты: Vitest (happy-dom) для логики/компонентов + Playwright для e2e/visual/a11y.

**Tech Stack:** TypeScript 5.6 strict, Vite 6, Web Components, Vitest 2.1 + happy-dom 15, Playwright 1.59 + @axe-core/playwright, токены `@labosfera/shared-spa`.

**Спека:** `docs/superpowers/specs/2026-06-23-start-page-poster-wall-rebrand-design.md` (читать перед началом).

## Global Constraints

- TypeScript strict; vanilla Web Components, Shadow DOM `{mode:'open'}`; префикс кастом-тегов `kit-`/`role-`; **без React/Vue**.
- Палитра: графит `#06101e` ~90% полотна; янтарь `#ffbe0b` — только кольцо/focus-ring; brand-blue `#3a86ff` — только главный CTA/активный фильтр. Постеры НЕ раскрашивать.
- Шрифты **self-host woff2** (Inter, JetBrains Mono, Space Grotesk), `@font-face` относительными путями, **ни одного запроса к Google Fonts/CDN**. Space Grotesk кириллицу покрывает не полностью → для кириллических заголовков fallback на Inter; `font-display: swap` + системный кириллический fallback.
- Анимировать только `transform`/`opacity`; тень/`glow` — отдельным слоем (`::after`/`::before`, opacity). `will-change` точечно (mouseenter→cleanup). `@media (prefers-reduced-motion: no-preference)` оборачивает усиленную анимацию; база — fade.
- **Кастомный курсор НЕ внедрять** (273-ФЗ/доступность).
- Доступность WCAG 2.2 AA: `role=grid` + roving tabindex; drawer = нативный `<dialog>.showModal()`; focus-ring ≥3:1; контраст текста ≥4.5:1 в светлейшей точке фото; zoom 200% / reflow 320px; target ≥24/44px.
- Разделы остаются **«Комплект №N · Тема»**; продукт = «Комплект виртуального оборудования для ОГЭ по физике».
- Запуск опыта ≤2 клика. Дизайн-токены через `@labosfera/shared-spa/styles`.
- Dev-сервер запускать с `--host 127.0.0.1` (Vite на этой машине биндится на IPv6, Chrome/Playwright не достучатся — см. reality-check).
- Каждый найденный баг → regression-тест. `typecheck`/`lint`/`test`/`build` зелёные перед «готово».

## File Structure

```
experiments/home/
├── index.html                      # MODIFY: ребренд title/meta + app-shell разметка
├── vite.config.ts                  # MODIFY: добавить test(happy-dom) блок
├── playwright.config.ts            # CREATE: e2e для home (порт 5181)
├── src/
│   ├── main.ts                     # MODIFY: bootstrap app-shell вместо stub
│   ├── data/
│   │   ├── kits.ts                 # MODIFY: + category, accent, resultVerb, fipiTask?
│   │   └── brand.ts                # CREATE: строки нейминга (одно место правды)
│   ├── components/
│   │   ├── progress-ring.ts        # CREATE: <progress-ring> SVG
│   │   ├── kit-poster.ts           # CREATE: <kit-poster>
│   │   ├── kit-drawer.ts           # CREATE: <kit-drawer> (нативный <dialog>)
│   │   ├── role-switch.ts          # CREATE: <role-switch> tablist
│   │   ├── kit-icons.ts            # MODIFY: исправить маппинг тем под kits.ts
│   │   ├── tilt-on-hover.ts        # REUSE
│   │   └── cursor-follower.ts      # DELETE (курсор запрещён)
│   ├── lib/
│   │   ├── launch.ts               # CREATE: диспетчер запуска опыта (web)
│   │   ├── grid-keyboard.ts        # CREATE: GridKeyboardController
│   │   ├── filters.ts              # CREATE: live-фильтр состояние+маска
│   │   ├── search.ts               # CREATE: индекс+поиск опытов
│   │   ├── resume.ts               # CREATE: выбор resume-таргета
│   │   ├── urls.ts                 # REUSE (база для launch.ts)
│   │   └── reduced-motion.ts       # REUSE
│   ├── styles/
│   │   ├── home.css                # REWRITE: layout app-shell, постер-стена
│   │   ├── fonts.css               # CREATE: @font-face self-host
│   │   ├── tokens.css              # REUSE (реэкспорт shared)
│   │   └── reset.css               # REUSE
│   └── assets/fonts/               # CREATE: woff2 (inter, jetbrains-mono, space-grotesk)
└── e2e/
    ├── home.spec.ts                # CREATE: keyboard/drawer/search/launch/reflow
    ├── visual-regression.spec.ts   # CREATE: baseline скрины
    └── a11y.spec.ts                # CREATE: axe-core
```

---

### Task 1: Фундамент — vitest-конфиг, нейминг, ребренд-оболочка

**Files:**
- Modify: `experiments/home/vite.config.ts`
- Create: `experiments/home/src/data/brand.ts`
- Test: `experiments/home/src/data/__tests__/brand.test.ts`
- Modify: `experiments/home/index.html`

**Interfaces:**
- Produces: `BRAND` объект `{ company: string; productFull: string; productShort: string; description: string }`.

- [ ] **Step 1: vitest happy-dom в vite.config.ts** — добавить в `defineConfig` блок:

```ts
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    css: false,
  },
```

- [ ] **Step 2: Написать падающий тест brand.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { BRAND } from '../brand';

describe('BRAND', () => {
  it('содержит новое продуктовое имя без «виртуальная лаборатория»', () => {
    expect(BRAND.productFull).toBe('Комплект виртуального оборудования для ОГЭ по физике');
    expect(BRAND.company).toBe('ЛАБОСФЕРА');
    expect(BRAND.productShort).toBe('Виртуальное оборудование · ОГЭ Физика');
    expect(BRAND.productFull.toLowerCase()).not.toContain('виртуальная лаборатория');
  });
});
```

- [ ] **Step 3: Запустить — убедиться, что падает**

Run: `npm --workspace=labosfera-home run test -- brand`
Expected: FAIL — `Cannot find module '../brand'`.

- [ ] **Step 4: Создать brand.ts**

```ts
/** Единственное место правды для нейминга продукта (ребрендинг 2026-06-23). */
export const BRAND = {
  company: 'ЛАБОСФЕРА',
  productFull: 'Комплект виртуального оборудования для ОГЭ по физике',
  productShort: 'Виртуальное оборудование · ОГЭ Физика',
  description:
    'ЛАБОСФЕРА — комплект виртуального оборудования для подготовки к ОГЭ по физике: интерактивные опыты по спецификации ФИПИ-2026.',
} as const;
```

- [ ] **Step 5: Запустить — PASS**

Run: `npm --workspace=labosfera-home run test -- brand`
Expected: PASS.

- [ ] **Step 6: Ребренд index.html** — заменить `<title>`, `<meta description>` и stub-`<main>` на app-shell-каркас:

```html
  <title>ЛАБОСФЕРА — Комплект виртуального оборудования для ОГЭ по физике</title>
  <meta name="description" content="ЛАБОСФЕРА — комплект виртуального оборудования для подготовки к ОГЭ по физике: интерактивные опыты по спецификации ФИПИ-2026." />
```
```html
<body>
  <div class="atmosphere" aria-hidden="true"></div>
  <header class="topbar" data-shell="topbar"></header>
  <div class="app">
    <aside class="sidebar" data-shell="sidebar" aria-label="Фильтры каталога"></aside>
    <main class="main" data-shell="main"></main>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
```
(Удалить `<link>` на Google Fonts — шрифты подключит `fonts.css` в Task 2.)

- [ ] **Step 7: Commit**

```bash
git add experiments/home/vite.config.ts experiments/home/src/data/brand.ts experiments/home/src/data/__tests__/brand.test.ts experiments/home/index.html
git commit -m "feat(home): vitest happy-dom + brand.ts + ребренд-оболочка index.html"
```

---

### Task 2: Self-host шрифтов + проверка кириллицы Space Grotesk

**Files:**
- Create: `experiments/home/src/assets/fonts/*.woff2`
- Create: `experiments/home/src/styles/fonts.css`
- Modify: `experiments/home/src/main.ts` (импорт fonts.css)
- Test: ручная проверка кириллицы + e2e в Task 13 (offline).

- [ ] **Step 1: Скачать woff2 из @fontsource** (Inter, JetBrains Mono, Space Grotesk; latin + cyrillic subsets):

```bash
cd experiments/home
mkdir -p src/assets/fonts
# из node_modules @fontsource если есть, иначе скачать релизы fontsource:
#   inter-cyrillic-400/500/600/700.woff2, jetbrains-mono-cyrillic-500.woff2,
#   space-grotesk-latin-500/600/700.woff2 (cyrillic отдельно если доступен)
```

- [ ] **Step 2: Проверить кириллицу Space Grotesk**

Run: проверить наличие кириллического subset у Space Grotesk (fontsource `space-grotesk-cyrillic-*`). Если отсутствует — зафиксировать в `fonts.css` правило: заголовки на кириллице используют Inter.
Expected: вывод «cyrillic есть / нет».

- [ ] **Step 3: Создать fonts.css** (относительные пути, без CDN):

```css
@font-face { font-family: 'Inter'; font-weight: 400 700; font-display: swap;
  src: url('../assets/fonts/inter-cyrillic.woff2') format('woff2'); unicode-range: U+0400-04FF; }
@font-face { font-family: 'Inter'; font-weight: 400 700; font-display: swap;
  src: url('../assets/fonts/inter-latin.woff2') format('woff2'); unicode-range: U+0000-00FF; }
@font-face { font-family: 'JetBrains Mono'; font-weight: 500; font-display: swap;
  src: url('../assets/fonts/jetbrains-mono-cyrillic.woff2') format('woff2'); unicode-range: U+0400-04FF; }
@font-face { font-family: 'JetBrains Mono'; font-weight: 500; font-display: swap;
  src: url('../assets/fonts/jetbrains-mono-latin.woff2') format('woff2'); unicode-range: U+0000-00FF; }
@font-face { font-family: 'Space Grotesk'; font-weight: 500 700; font-display: swap;
  src: url('../assets/fonts/space-grotesk-latin.woff2') format('woff2'); unicode-range: U+0000-00FF; }
/* fallback-стек объявить в home.css: заголовки --font-display: 'Space Grotesk','Inter',system-ui */
```

- [ ] **Step 4: Импортировать в main.ts** первой строкой: `import './styles/fonts.css';`

- [ ] **Step 5: Commit**

```bash
git add experiments/home/src/assets/fonts experiments/home/src/styles/fonts.css experiments/home/src/main.ts
git commit -m "feat(home): self-host шрифтов (офлайн Astra, без Google CDN) + кириллица-fallback"
```

---

### Task 3: Расширение модели данных kits.ts

**Files:**
- Modify: `experiments/home/src/data/kits.ts`
- Test: `experiments/home/src/data/__tests__/kits.test.ts`

**Interfaces:**
- Produces: `Kit.category: KitCategory`, `Kit.accent: string`; `KitExperiment.resultVerb: string`, `KitExperiment.fipiTask?: string`; функции `kitsByCategory(cat)`, `findExperiment(query)`.
- `type KitCategory = 'mechanics' | 'electricity' | 'optics' | 'thermal'`.

- [ ] **Step 1: Падающий тест kits.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { KITS, totalExperiments, kitsByCategory } from '../kits';

describe('KITS data integrity', () => {
  it('у всех китов уникальные num и slug', () => {
    expect(new Set(KITS.map(k => k.num)).size).toBe(KITS.length);
    expect(new Set(KITS.map(k => k.slug)).size).toBe(KITS.length);
  });
  it('progress.done не превышает total', () => {
    for (const k of KITS) expect(k.progress.done).toBeLessThanOrEqual(k.progress.total);
  });
  it('каждый кит имеет category и accent', () => {
    for (const k of KITS) {
      expect(['mechanics','electricity','optics','thermal']).toContain(k.category);
      expect(k.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
  it('каждый опыт имеет resultVerb', () => {
    for (const k of KITS) for (const e of k.experiments) expect(e.resultVerb.length).toBeGreaterThan(0);
  });
  it('totalExperiments = 8/35', () => {
    expect(totalExperiments()).toEqual({ done: 8, total: 35 });
  });
  it('kitsByCategory(mechanics) включает киты 1,2,5,6', () => {
    expect(kitsByCategory('mechanics').map(k => k.num).sort()).toEqual([1,2,5,6]);
  });
});
```

- [ ] **Step 2: Запустить — FAIL** (`kitsByCategory` нет, `category`/`accent`/`resultVerb` нет).
Run: `npm --workspace=labosfera-home run test -- kits`

- [ ] **Step 3: Расширить kits.ts** — добавить тип, поля каждому киту/опыту, функцию:

```ts
export type KitCategory = 'mechanics' | 'electricity' | 'optics' | 'thermal';
// в interface Kit: readonly category: KitCategory; readonly accent: string;
// в interface KitExperiment: readonly resultVerb: string; readonly fipiTask?: string;

export function kitsByCategory(cat: KitCategory, kits: ReadonlyArray<Kit> = KITS) {
  return kits.filter(k => k.category === cat);
}
```
Заполнить данные: kit-1/2/5/6 → `mechanics`; kit-3 → `electricity`; kit-4 → `optics`; kit-7 → `thermal`. `accent` — прекомпьютенный доминирующий цвет фото (взять из фото; временно: kit-2 `#3a86ff`, kit-1 `#14b8a6`, остальные — нейтральный графит-вариант, уточнить в Task реального glow). `resultVerb` для каждого опыта (примеры: 1.1 «Измерь плотность тела», 1.2 «Найди архимедову силу», 2.1 «Измерь жёсткость пружины», 2.2 «Определи коэффициент трения»). `fipiTask` — только если известно из ФИ-9 ОГЭ 2026_СПЕЦ, иначе НЕ добавлять (не выдумывать).

- [ ] **Step 4: Запустить — PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat(home): расширить kits.ts (category/accent/resultVerb) + kitsByCategory"`

---

### Task 4: lib/launch.ts — диспетчер запуска опыта

**Files:**
- Create: `experiments/home/src/lib/launch.ts`
- Test: `experiments/home/src/lib/__tests__/launch.test.ts`

**Interfaces:**
- Consumes: `Kit`, `KitExperiment` из kits.ts; `kitUrl()` из urls.ts.
- Produces: `experimentUrl(kit: Kit, experimentId: string, role: 'student'|'teacher'): string`.

- [ ] **Step 1: Падающий тест**

```ts
import { describe, it, expect } from 'vitest';
import { experimentUrl } from '../launch';
import { KITS } from '../../data/kits';

const kit2 = KITS.find(k => k.num === 2)!;

describe('experimentUrl', () => {
  it('строит относительный URL с screen и role', () => {
    const url = experimentUrl(kit2, '2.1', 'student');
    expect(url).toContain(kit2.path);          // ../kit-2-forces/
    expect(url).toContain('screen=');
    expect(url).toContain('role=student');
  });
  it('teacher роль прокидывается', () => {
    expect(experimentUrl(kit2, '2.1', 'teacher')).toContain('role=teacher');
  });
});
```

- [ ] **Step 2: FAIL.** Run: `npm --workspace=labosfera-home run test -- launch`
- [ ] **Step 3: Реализовать launch.ts** — маппинг `experimentId → screen-slug` кита (для kit-2: 2.1→spring-stiffness, 2.6→spring-elastic, 2.4→spring-work, 2.2→friction; для kit-1: 1.1→density-solid, 1.2/1.4→archimedes, 1.3→archimedes-volume). Собрать `${kit.path}?screen=${slug}&role=${role}` (web). Electron-ветка — задел (комментарий, Фаза 2).
- [ ] **Step 4: PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat(home): lib/launch.ts — URL запуска опыта (web)"`

---

### Task 5: lib/grid-keyboard.ts — GridKeyboardController

**Files:**
- Create: `experiments/home/src/lib/grid-keyboard.ts`
- Test: `experiments/home/src/lib/__tests__/grid-keyboard.test.ts`

**Interfaces:**
- Produces: `nextIndex(current: number, key: string, count: number, cols: number): number` (чистая функция раскладки) + класс `GridKeyboardController` (DOM-обвязка roving tabindex).

- [ ] **Step 1: Падающий тест на чистую функцию**

```ts
import { describe, it, expect } from 'vitest';
import { nextIndex } from '../grid-keyboard';

// 7 элементов, 3 колонки: ряды [0,1,2][3,4,5][6]
describe('nextIndex (7 элементов, 3 колонки)', () => {
  it('ArrowRight с переносом по рядам', () => {
    expect(nextIndex(2, 'ArrowRight', 7, 3)).toBe(3);
    expect(nextIndex(6, 'ArrowRight', 7, 3)).toBe(0); // wrap с конца на начало
  });
  it('ArrowLeft', () => {
    expect(nextIndex(3, 'ArrowLeft', 7, 3)).toBe(2);
    expect(nextIndex(0, 'ArrowLeft', 7, 3)).toBe(6);
  });
  it('ArrowDown по колонке', () => {
    expect(nextIndex(1, 'ArrowDown', 7, 3)).toBe(4);
    expect(nextIndex(6, 'ArrowDown', 7, 3)).toBe(6); // некуда — остаёмся
  });
  it('ArrowUp по колонке', () => {
    expect(nextIndex(4, 'ArrowUp', 7, 3)).toBe(1);
  });
  it('Home/End ряда, Ctrl+Home/End стены', () => {
    expect(nextIndex(4, 'Home', 7, 3)).toBe(3);
    expect(nextIndex(4, 'End', 7, 3)).toBe(5);
    expect(nextIndex(4, 'CtrlHome', 7, 3)).toBe(0);
    expect(nextIndex(4, 'CtrlEnd', 7, 3)).toBe(6);
  });
  it('1 колонка — Down/Up как линейный список', () => {
    expect(nextIndex(0, 'ArrowDown', 7, 1)).toBe(1);
    expect(nextIndex(6, 'ArrowDown', 7, 1)).toBe(6);
  });
});
```

- [ ] **Step 2: FAIL.** Run: `npm --workspace=labosfera-home run test -- grid-keyboard`
- [ ] **Step 3: Реализовать `nextIndex`** (чистая) + `GridKeyboardController` (хранит cols из `ResizeObserver`, на `keydown` зовёт `nextIndex`, ставит `tabindex` 0/-1, `el.focus()`, `el.scrollIntoView({block:'nearest'})`).
- [ ] **Step 4: PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat(home): GridKeyboardController (roving tabindex, раскладка стрелок)"`

---

### Task 6: lib/filters.ts — live-фильтр

**Files:** Create `src/lib/filters.ts`; Test `src/lib/__tests__/filters.test.ts`

**Interfaces:**
- Produces: `type FilterState = { category: KitCategory | 'all'; readyOnly: boolean }`; `visibleKitNums(kits, state): number[]`.

- [ ] **Step 1: Падающий тест**

```ts
import { describe, it, expect } from 'vitest';
import { visibleKitNums } from '../filters';
import { KITS } from '../../data/kits';

describe('visibleKitNums', () => {
  it('all + не-readyOnly = все 7', () => {
    expect(visibleKitNums(KITS, { category: 'all', readyOnly: false }).length).toBe(7);
  });
  it('readyOnly оставляет только ready (киты 1,2)', () => {
    expect(visibleKitNums(KITS, { category: 'all', readyOnly: true }).sort()).toEqual([1,2]);
  });
  it('category=optics оставляет кит 4', () => {
    expect(visibleKitNums(KITS, { category: 'optics', readyOnly: false })).toEqual([4]);
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: реализовать** (фильтр по category + status==='ready') → **Step 4: PASS** → **Step 5: Commit** `git commit -m "feat(home): filters.ts live-фильтр постеров"`

---

### Task 7: lib/search.ts — поиск по опытам и заданиям ОГЭ

**Files:** Create `src/lib/search.ts`; Test `src/lib/__tests__/search.test.ts`

**Interfaces:**
- Produces: `type Hit = { kitNum: number; experimentId: string; title: string }`; `searchExperiments(kits, query): Hit[]` (по `title`, `resultVerb`, `id`, `fipiTask`; регистронезависимо, RU).

- [ ] **Step 1: Падающий тест**

```ts
import { describe, it, expect } from 'vitest';
import { searchExperiments } from '../search';
import { KITS } from '../../data/kits';

describe('searchExperiments', () => {
  it('находит «пружин» в опыте 2.1', () => {
    const hits = searchExperiments(KITS, 'пружин');
    expect(hits.some(h => h.experimentId === '2.1')).toBe(true);
  });
  it('пустой запрос → []', () => {
    expect(searchExperiments(KITS, '   ')).toEqual([]);
  });
  it('находит по id «1.2»', () => {
    expect(searchExperiments(KITS, '1.2').some(h => h.experimentId === '1.2')).toBe(true);
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: реализовать** (`query.trim().toLowerCase()`, матч по полям) → **Step 4: PASS** → **Step 5: Commit** `git commit -m "feat(home): search.ts поиск опытов по названию/заданию"`

---

### Task 8: lib/resume.ts — выбор resume-таргета

**Files:** Create `src/lib/resume.ts`; Test `src/lib/__tests__/resume.test.ts`

**Interfaces:**
- Produces: `resumeTarget(kits, progressByKit: Record<number, number>): { kitNum: number; remaining: number; isFresh: boolean }` — последний начатый ready-кит с незавершёнными опытами; если прогресса нет → kit-1 (`isFresh: true`).

- [ ] **Step 1: Падающий тест**

```ts
import { describe, it, expect } from 'vitest';
import { resumeTarget } from '../resume';
import { KITS } from '../../data/kits';

describe('resumeTarget', () => {
  it('нет прогресса → Комплект 1, isFresh', () => {
    const r = resumeTarget(KITS, {});
    expect(r.kitNum).toBe(1);
    expect(r.isFresh).toBe(true);
  });
  it('начат кит 2 (2 из 4) → продолжить кит 2, осталось 2', () => {
    const r = resumeTarget(KITS, { 2: 2 });
    expect(r.kitNum).toBe(2);
    expect(r.remaining).toBe(2);
    expect(r.isFresh).toBe(false);
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: реализовать** → **Step 4: PASS** → **Step 5: Commit** `git commit -m "feat(home): resume.ts выбор продолжения"`

---

### Task 9: `<progress-ring>` компонент

**Files:** Create `src/components/progress-ring.ts`; Test `src/components/__tests__/progress-ring.test.ts`

**Interfaces:**
- Produces: чистая `ringGeometry(value, max, radius, stroke): { circumference: number; offset: number }`; кастом-элемент `<progress-ring value max>`.

- [ ] **Step 1: Падающий тест на геометрию + рендер**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { ringGeometry } from '../progress-ring';

describe('ringGeometry', () => {
  it('offset = circumference при value 0', () => {
    const g = ringGeometry(0, 4, 52, 8);
    expect(g.offset).toBeCloseTo(g.circumference);
  });
  it('offset = 0 при value=max', () => {
    expect(ringGeometry(4, 4, 52, 8).offset).toBeCloseTo(0);
  });
  it('половина прогресса → половина окружности', () => {
    const g = ringGeometry(2, 4, 52, 8);
    expect(g.offset).toBeCloseTo(g.circumference / 2);
  });
});

describe('<progress-ring>', () => {
  beforeAll(async () => { await import('../progress-ring'); });
  it('рендерит SVG и aria-label с прогрессом', () => {
    const el = document.createElement('progress-ring');
    el.setAttribute('value', '3'); el.setAttribute('max', '8');
    document.body.append(el);
    expect(el.shadowRoot!.querySelector('svg')).toBeTruthy();
    expect(el.getAttribute('aria-label')).toContain('3');
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: реализовать** `ringGeometry` + компонент (SVG circle, `stroke-dasharray=circumference`, `stroke-dashoffset=offset`, `stroke-linecap=round`, обод 8% диаметра, `--ring-color` янтарь/нейтрал; `role=img` + `aria-label='Прогресс: V из M опытов'`; анимация offset 700мс через CSS transition при первом маунте) → **Step 4: PASS** → **Step 5: Commit**

---

### Task 10: `<kit-poster>` компонент

**Files:** Create `src/components/kit-poster.ts`; Test `src/components/__tests__/kit-poster.test.ts`

**Interfaces:**
- Consumes: `<progress-ring>`, `Kit`.
- Produces: `<kit-poster>` с атрибутами `num,status,title,meta,photo,done,total` и CSS-var `--kit-glow`; CustomEvent `poster-activate` (`{composed:true, bubbles:true, detail:{num}}`) по click/Enter/Space (кроме status=planned → событие `poster-info`).

- [ ] **Step 1: Падающий тест**

```ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('<kit-poster>', () => {
  beforeAll(async () => { await import('../kit-poster'); });
  function make(attrs: Record<string,string>) {
    const el = document.createElement('kit-poster');
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.append(el); return el;
  }
  it('рендерит номер и название', () => {
    const el = make({ num:'2', status:'ready', title:'Силы и движение', done:'4', total:'4', photo:'x.png' });
    expect(el.shadowRoot!.textContent).toContain('Силы и движение');
    expect(el.shadowRoot!.textContent).toContain('2');
  });
  it('ready: клик эмитит poster-activate с num', () => {
    const el = make({ num:'2', status:'ready', title:'Силы', done:'4', total:'4', photo:'x.png' });
    let got = -1;
    el.addEventListener('poster-activate', (e:any) => got = e.detail.num);
    (el.shadowRoot!.querySelector('[part=card],button') as HTMLElement).click();
    expect(got).toBe(2);
  });
  it('planned: имеет aria-label про недоступность', () => {
    const el = make({ num:'3', status:'planned', title:'Электр', done:'0', total:'9', photo:'x.png' });
    expect(el.getAttribute('aria-label')!.toLowerCase()).toContain('недоступ');
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: реализовать** компонент (Shadow DOM: кнопка-карта, фон-фото + скрим-градиент, `<progress-ring>`, номер JetBrains Mono, название, meta-строка, корешок-цвет; 6 состояний через CSS; planned → grayscale+бейдж «Скоро»+`aria-label`; hover/focus scale+tilt+glow в `@media (prefers-reduced-motion: no-preference)`; слот для микропревью; `will-change` на mouseenter/cleanup) → **Step 4: PASS** → **Step 5: Commit**

---

### Task 11: `<kit-drawer>` компонент (нативный `<dialog>`)

**Files:** Create `src/components/kit-drawer.ts`; Test `src/components/__tests__/kit-drawer.test.ts`

**Interfaces:**
- Consumes: `experimentUrl` (launch.ts), `Kit`.
- Produces: `<kit-drawer>` с методами `open(kit: Kit, role): void`, `close(): void`; рендерит список опытов (resultVerb + fipiTask-бейдж + статус-точка + кнопка «Запустить» с href из `experimentUrl`). Возврат фокуса на триггер.

- [ ] **Step 1: Падающий тест (happy-dom поддерживает HTMLDialogElement частично — тестируем рендер списка и возврат фокуса через мок)**

```ts
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { KITS } from '../../data/kits';

describe('<kit-drawer>', () => {
  beforeAll(async () => { await import('../kit-drawer'); });
  it('open рендерит все опыты кита с кнопками запуска', () => {
    const el: any = document.createElement('kit-drawer');
    document.body.append(el);
    if (!el.querySelector('dialog')?.showModal) (HTMLDialogElement.prototype as any).showModal = vi.fn();
    const kit2 = KITS.find(k => k.num === 2)!;
    el.open(kit2, 'student');
    const items = el.shadowRoot!.querySelectorAll('[data-experiment]');
    expect(items.length).toBe(kit2.experiments.length);
    expect(el.shadowRoot!.textContent).toContain(kit2.experiments[0].resultVerb);
  });
  it('возвращает фокус на триггер при close', () => {
    const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
    const el: any = document.createElement('kit-drawer'); document.body.append(el);
    if (!(HTMLDialogElement.prototype as any).showModal) (HTMLDialogElement.prototype as any).showModal = vi.fn();
    if (!(HTMLDialogElement.prototype as any).close) (HTMLDialogElement.prototype as any).close = vi.fn();
    el.open(KITS[0], 'student', trigger);
    el.close();
    expect(document.activeElement).toBe(trigger);
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: реализовать** (`<dialog>` в Shadow DOM, `showModal()`, `aria-labelledby` на h2, `<ul>` опытов, кнопки-ссылки `experimentUrl`, `Esc`/backdrop close, сохранение/возврат `triggerEl`, stagger список; reduced-motion → fade) → **Step 4: PASS** → **Step 5: Commit**

---

### Task 12: `<role-switch>` компонент

**Files:** Create `src/components/role-switch.ts`; Test `src/components/__tests__/role-switch.test.ts`

**Interfaces:**
- Produces: `<role-switch>` tablist (Ученик/Учитель), CustomEvent `role-change` (`detail:{role}`), `body[data-role]`; стрелочная навигация.

- [ ] **Step 1: Падающий тест** (рендерит 2 таба `role=tab`, клик «Учитель» эмитит role-change=teacher, ставит aria-selected) → **Step 2: FAIL** → **Step 3: реализовать** → **Step 4: PASS** → **Step 5: Commit**

---

### Task 13: Сборка app-shell + чистка dead-code

**Files:**
- Modify: `src/main.ts` (bootstrap), `src/styles/home.css` (rewrite layout/постер-стена/sidebar/topbar/resume/motion), `src/components/kit-icons.ts` (исправить маппинг)
- Delete: `src/components/cursor-follower.ts`
- Test: `src/__tests__/shell.test.ts` (integration)

**Interfaces:**
- Consumes: всё из Task 1-12.

- [ ] **Step 1: Падающий integration-тест**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { renderApp } from '../main';   // экспортировать renderApp(root) из main.ts

describe('app-shell', () => {
  beforeAll(async () => { await import('../main'); });
  it('рендерит 7 постеров и wordmark с новым именем', () => {
    const root = document.createElement('div');
    renderApp(root);
    expect(root.querySelectorAll('kit-poster').length).toBe(7);
    expect(root.textContent).toContain('ЛАБОСФЕРА');
    expect(root.querySelector('[role=grid]')).toBeTruthy();
  });
  it('применяет live-фильтр readyOnly (видны 2 постера)', () => {
    const root = document.createElement('div'); renderApp(root);
    (root.querySelector('[data-filter=ready-only]') as HTMLInputElement).click();
    const visible = [...root.querySelectorAll('kit-poster')].filter(p => !p.hasAttribute('data-hidden'));
    expect(visible.length).toBe(2);
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: реализовать** `main.ts` (`renderApp(root)`: topbar c wordmark из BRAND + поиск + `<role-switch>` + Журнал/⚙; sidebar фильтры `<fieldset>` + прогресс; resume-полоса; `role=grid` стена из `<kit-poster>` по KITS; `<kit-drawer>`; подключить GridKeyboardController, filters, search, resume, launch). Удалить `cursor-follower.ts` и его импорты. Исправить `kit-icons.ts` маппинг под `kits.ts`. Переписать `home.css` (layout, постер-стена 3:4 grid 3-кол/24px/padding 32px, брейкпоинты, motion-токены, `@media prefers-reduced-motion`, focus-ring `--focus-ring: 0 0 0 3px #ffbe0b`). → **Step 4: PASS** → **Step 5: Commit**

---

### Task 14: E2E Playwright (клавиатура / drawer / поиск / запуск / reflow)

**Files:** Create `experiments/home/playwright.config.ts`, `experiments/home/e2e/home.spec.ts`

- [ ] **Step 1: playwright.config.ts** — `testDir:'./e2e'`, `testMatch:'**/*.spec.ts'`, chromium 1440×900, `webServer: { command: 'npx vite --host 127.0.0.1 --port 5181 --strictPort', url:'http://127.0.0.1:5181', reuseExistingServer: !process.env.CI }`, `baseURL:'http://127.0.0.1:5181'`.

- [ ] **Step 2: home.spec.ts** — реальные сценарии:

```ts
import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('заголовок ребрендирован', async ({ page }) => {
  await expect(page).toHaveTitle(/Комплект виртуального оборудования для ОГЭ по физике/);
});
test('клавиатура: Tab в сетку, стрелка двигает фокус, Enter открывает drawer', async ({ page }) => {
  await page.locator('[role=grid] kit-poster').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog[open]')).toBeVisible();
});
test('Esc закрывает drawer и возвращает фокус на постер', async ({ page }) => {
  const poster = page.locator('kit-poster').first();
  await poster.click(); await expect(page.locator('dialog[open]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(poster).toBeFocused();
});
test('поиск «пружин» открывает drawer кита 2', async ({ page }) => {
  await page.getByRole('searchbox').fill('пружин');
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog[open]')).toContainText('жёсткость пружины', { ignoreCase: true });
});
test('кнопка запуска ведёт на kit-2 с screen и role', async ({ page }) => {
  await page.locator('kit-poster').first().click();
  const href = await page.locator('dialog[open] a[data-experiment]').first().getAttribute('href');
  expect(href).toContain('kit-2-forces'); expect(href).toContain('screen=');
});
test('reflow 320px без горизонтального скролла', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(320 + 1);
});
```

- [ ] **Step 3: Запустить** `npm --workspace=labosfera-home run test:e2e` — добиться PASS (добавить `test:e2e` скрипт в home/package.json: `playwright test`). → **Step 4: Commit**

---

### Task 15: Visual baseline + a11y (axe)

**Files:** Create `experiments/home/e2e/visual-regression.spec.ts`, `experiments/home/e2e/a11y.spec.ts`

- [ ] **Step 1: visual-regression.spec.ts** — `animations:'disabled'`, скрины: стена default (1440×900), drawer открыт, мобайл 1 колонка (390×844). `await expect(page).toHaveScreenshot('wall.png')`.
- [ ] **Step 2: Сгенерировать baseline** `npm --workspace=labosfera-home run test:e2e -- --update-snapshots` (win32-снапшоты; CI-linux — known caveat).
- [ ] **Step 3: a11y.spec.ts** — `@axe-core/playwright` на главной и при открытом drawer, `expect(results.violations).toEqual([])`.
- [ ] **Step 4: Запустить оба — PASS.** → **Step 5: Commit**

---

### Task 16: Reality-check + финальная проверка

- [ ] **Step 1: typecheck/lint/test/build**

Run: `npm --workspace=labosfera-home run typecheck && npm --workspace=labosfera-home run test && npm --workspace=labosfera-home run build`
Expected: всё зелёное.

- [ ] **Step 2: Живой запуск + скриншоты** (правило проекта [[feedback_reality_check_visual]]):

Run: `npx vite --host 127.0.0.1 --port 5181 --strictPort` (в `experiments/home`), затем Playwright-скрины на 1920×1080 и 1366×768. Сверить глазами: ребренд, 7 постеров, кольца, hover-glow, drawer, поиск, фильтры, контраст текста на фото, focus-ring клавиатурой.

- [ ] **Step 3: Bug-sweep** — если найден баг (контраст/перенос фокуса/обрезка текста на zoom), добавить regression-тест и починить причину.

- [ ] **Step 4: Финальный commit** `git commit -m "test(home): reality-check скрины + фиксы"`

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** ребренд (T1), self-host шрифтов+кириллица (T2), данные+категории (T3), запуск (T4), grid-клавиатура (T5), фильтры (T6), поиск (T7), resume (T8), кольцо (T9), постер 6 состояний+glow+микропревью (T10), drawer на `<dialog>`+focus (T11), role-switch (T12), сборка+чистка dead-code+motion+focus-ring (T13), e2e клавиатура/drawer/поиск/запуск/reflow (T14), visual+axe (T15), reality-check+zoom200 (T16). Все разделы §1-13 спеки имеют задачу.
- **Плейсхолдеры:** нет «TODO/позже»; `fipiTask` — явное правило «не выдумывать», не заглушка.
- **Согласованность типов:** `nextIndex`/`GridKeyboardController`, `experimentUrl`, `visibleKitNums`, `searchExperiments`, `resumeTarget`, `ringGeometry`, `poster-activate`, `renderApp` — имена едины между задачами и тестами.

## Открытые мелочи для исполнителя
- `accent`-цвета постеров (Task 3) уточнить на этапе Task 10 (вытащить доминирующий цвет из `kit-N.png` инструментом на этапе сборки, не в рантайме).
- SVG-микропревью приборов (Task 10) — начать с 2 готовых китов (пружина kit-2, цилиндр kit-1), остальным — статичный кадр.
- Реальные `fipiTask` — заполнять из `.business/Исходники/ФИ-9 ОГЭ 2026_СПЕЦ.pdf` (если доступно); иначе бейдж не показывать.
