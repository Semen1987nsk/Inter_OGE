# Волна 0: каталог + добить киты 1 и 2 до 100% ФИПИ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести комплекты №1 и №2 к 100% покрытию ФИПИ и пересобрать каталог `kits.ts` (поле `isFipi`, счёт по опытам ФИПИ, бонус-бейдж) как фундамент остального эпика.

**Architecture:** Монорепо `C:\dev\Inter_OGE` (npm workspaces). Каждый опыт — экран `IScreen` в пакете кита (`experiments/kit-N-*`), журнал v2 из `experiments/_shared-spa`. Каталог-главная — `experiments/home`. Два новых экрана (1.5 независимость F_арх от массы; F_упр одной точкой) собираются копированием эталона `density-solid`/`spring-stiffness` + точечные адаптации; миграция бонуса `spring-work` с самодельной HTML-таблицы на `renderJournalTable`.

**Tech Stack:** TypeScript 5.6 strict, Vite 6, vanilla Web Components (Shadow DOM, `lab-*`), Vitest (happy-dom), Playwright, npm workspaces.

**Спека:** [docs/superpowers/specs/2026-06-24-wave-0-finish-kits-1-2.md](../specs/2026-06-24-wave-0-finish-kits-1-2.md).
**Эпик:** [docs/superpowers/specs/2026-06-24-fipi-full-coverage-epic.md](../specs/2026-06-24-fipi-full-coverage-epic.md).

## Global Constraints

Действуют на КАЖДУЮ задачу (копия из эпика §5; верботим-значения):
- **ФИПИ-якорь.** Каждый новый `*Experiment.ts`/`*Screen.ts` начинается docstring с дословной цитатой Приложения 2 / КОДИФ §1.29 + страница. Бонус → docstring `// ⚠️ БОНУС ЛАБОСФЕРА — НЕ ВХОДИТ В ФИПИ. Причина: …` и `isFipi: false` в каталоге.
- **Journal v2 (§21).** Новый/мигрируемый журнал — только `renderJournalTable(host, SPEC, rows, {mode, onCellInput, onVerify})` + `JournalSpec` в `_shared-spa/src/lib/journal/specs.ts` + `verifyRow` + `parseRu` + 3 режима записи через `record-mode` с ключом `kit-1`/`kit-2`.
- **Чистая физика.** Pure-функции в `src/physics/<id>/`, Vitest ≥95% + бросают `RangeError` на невалидных входах (паттерн `DensityCalc`).
- **D&D через mouse** в self-check (`page.mouse.move/down/up`); REST-state: drop-zones/pulse скрыты в покое.
- **A11y:** axe 0 нарушений; `aria-live`; клавиатура; `svg[hidden]{display:none}` в shadow CSS.
- **Алиасы импортов:** kit-1 → `@shared/*` (= `../_shared-spa/src/*`), `@screens/*`, `@shell/*`, `@physics/*`. kit-2 → `@labosfera/shared-spa/*` (пакет), `@screens/*`, `@shell/*`. НЕ путать.
- **Гейты (из корня репо):** `npm run typecheck` · `npm run test` · `npm run lint` (0 err) · `npm run build` — все `--workspaces`. Плюс `selfcheck-<id>.mjs` PASS + ручной reality-check скрином.
- **Каждый коммит оставляет каталог консистентным:** `kits.test.ts` зелёный после каждой задачи.
- **Платформа:** работать только из `C:\dev\Inter_OGE` (не из `.business` — MAX_PATH). Дев-сервер home: порт 5181, `--host 127.0.0.1`.

## Справочник API (verbatim, для всех задач)

**Журнал v2** (`@shared/lib/journal/...` или `@labosfera/shared-spa/lib/journal/...`):
```ts
// render.ts
export function renderJournalTable(
  host: HTMLElement, spec: JournalSpec, rows: ReadonlyArray<JournalRow>, opts: RenderJournalOptions,
): void
export interface RenderJournalOptions {
  readonly mode: JournalMode;            // 'semi-auto' | 'fully-manual' | 'fully-auto'
  readonly editingRowIdx?: number | null;
  onCellInput(rowIdx: number, key: string, value: number | null): void;
  onVerify(rowIdx: number): void;
  onEdit?(rowIdx: number): void;
  onCancelEdit?(): void;
  onDelete?(rowIdx: number): void;
}
// verify.ts
export function verifyRow(columns: ReadonlyArray<ColumnSpec>, row: JournalRow): Record<string, JournalVerdict>
// format.ts
export function parseRu(input: string | null | undefined): number | null
export function formatRu(value: number | string | null, format?: ColumnFormat): string
```
**Типы** (`journal/types.ts`): `ColumnSpec {key,label,source:'meta'|'direct'|'derived',unit?,format?,tolerance?,expectedFromRow?}`; `JournalSpec {experimentId, kitId:'kit-1'|'kit-2', columns}`; `JournalRow {idx, timestamp, values:Record<string,number|string|null>, verdicts?}`; `JournalVerdict='ok'|'close'|'wrong'|'empty'`.
**`experimentId` — union-литерал** `'1.1'|'1.2'|'1.3'|'1.4'|'1.5'|'2.1'|'2.2'|'2.3'|'2.4'|'2.6'` (расширяется в Задаче 4).

**Физика гидростатики** (`kit-1/src/physics/archimedes/ArchimedesCalc.ts`):
```ts
export const G = 9.8 as const;  export const RHO_WATER = 1000 as const;
export function archimedesForceN(rho_kg_m3: number, V_m3: number): number   // ρ·g·V
export function measuredArchimedesForceN(P_air_N: number, P_liquid_N: number): number  // P_возд−P_жид
export function cm3ToM3(V_cm3: number): number   // ×1e-6
export function gToKg(m_g: number): number       // ×1e-3
export function weightInAirN(m_kg: number): number  // m·g
```
Цилиндры (`tables.ts`): №1 сталь V=25.0 см³ m=195 г; №2 алюминий V=25.0 см³ m=70 г.

**Физика пружины** (`kit-2/src/physics/spring/SpringModel.ts`):
```ts
export function massToForce(massGrams: number): number       // (m_g/1000)·G  [Н]
export function forceToExtension(force: number, k: number): number  // (F/k)·100 [см]
export function calculateStiffness(force: number, extensionCm: number): number | null  // F/(Δl/100)
```

**Эталон экрана** (`kit-1/src/screens/density-solid/`): `DensitySolidScreen.ts` (фасад `IScreen` с `meta {id,label,kicker,icon,tooltip}` + `mount/unmount/saveState/loadState/reset`, `template.html?raw`, сбор `refs`, `new DensityExperiment(refs)`); `DensityExperiment.ts` (оркестратор: `Store`, `DragController`, `renderRecordModeToggle`, `renderJournalTable`, `reset()/destroy()`). Обязательные слоты `template.html`: `#record-mode-slot`, `#journal-host`, `#record-pending-slot`+`#record-pending-btn`+`#record-pending-summary`, `#live-region[aria-live]`, `#reset-btn`, drop-zones `data-dropzone`.

---

## File Structure

| Файл | Ответственность | Задача |
|---|---|---|
| `experiments/home/src/data/kits.ts` | модель `KitExperiment`(+`isFipi`,`done`,`bonusReason?`) + содержимое 7 китов по ФИПИ + `kitFipiProgress()`/`totalExperiments()` | 1 |
| `experiments/home/src/data/__tests__/kits.test.ts` | тесты целостности + новые счётчики ФИПИ | 1 |
| `experiments/home/src/components/kit-drawer.ts` | бонус-бейдж в списке опытов | 2 |
| `experiments/home/src/components/kit-poster.ts` + место создания постеров | done/total из `kitFipiProgress` | 2 |
| `experiments/_shared-spa/src/lib/journal/specs.ts` | `INDEPENDENCE_MASS_SPEC`, `ELASTIC_FORCE_SPEC`, `SPRING_WORK_SPEC` | 3,4,5 |
| `experiments/_shared-spa/src/lib/journal/types.ts` | расширить union `experimentId` на `'2.5'` | 4 |
| `experiments/kit-1-hydrostatics/src/screens/independence-mass/**` | новый экран опыта 1.5 | 3 |
| `experiments/kit-1-hydrostatics/src/physics/independence-mass/**` | pure-проверка равенства F_арх | 3 |
| `experiments/kit-1-hydrostatics/src/main.ts` | регистрация экрана 1.5 | 3 |
| `experiments/kit-1-hydrostatics/selfcheck-1-5.mjs` | self-check опыта 1.5 | 3 |
| `experiments/kit-1-hydrostatics/e2e/archimedes-series.spec.ts` | верификация серии 1.2 (№2/№3/№4) | 3 |
| `experiments/kit-2-forces/src/screens/elastic-force/**` | новый экран F_упр | 4 |
| `experiments/kit-2-forces/src/main.ts` | регистрация экрана F_упр | 4 |
| `experiments/kit-2-forces/selfcheck-elastic-force.mjs` | self-check F_упр | 4 |
| `experiments/kit-2-forces/src/screens/spring-work/SpringWorkScreen.ts` | миграция журнала v1→v2 | 5 |
| `experiments/2-1-spring/REFERENCE.md` §30 | обновить таблицы покрытия | 6 |

---

## Task 1: Каталог — модель данных + содержимое по ФИПИ

**Files:**
- Modify: `experiments/home/src/data/kits.ts`
- Test: `experiments/home/src/data/__tests__/kits.test.ts`

**Interfaces:**
- Produces: `KitExperiment` с `readonly isFipi: boolean`, `readonly done: boolean`, `readonly bonusReason?: string`; функция `kitFipiProgress(kit: Kit): { done: number; total: number }` (считает только `isFipi === true`); `totalExperiments()` суммирует `kitFipiProgress` по всем китам.

- [ ] **Step 1: Обновить тест целостности под новую модель и счёт ФИПИ**

Заменить файл `experiments/home/src/data/__tests__/kits.test.ts` на:
```ts
import { describe, it, expect } from 'vitest';
import { KITS, totalExperiments, kitsByCategory, kitFipiProgress } from '../kits';

describe('KITS data integrity', () => {
  it('у всех китов уникальные num и slug', () => {
    expect(new Set(KITS.map(k => k.num)).size).toBe(KITS.length);
    expect(new Set(KITS.map(k => k.slug)).size).toBe(KITS.length);
  });
  it('каждый кит имеет category и accent', () => {
    for (const k of KITS) {
      expect(['mechanics','electricity','optics','thermal']).toContain(k.category);
      expect(k.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
  it('каждый опыт имеет resultVerb и булев isFipi/done', () => {
    for (const k of KITS) for (const e of k.experiments) {
      expect(e.resultVerb.length).toBeGreaterThan(0);
      expect(typeof e.isFipi).toBe('boolean');
      expect(typeof e.done).toBe('boolean');
    }
  });
  it('бонус (isFipi:false) обязан иметь bonusReason', () => {
    for (const k of KITS) for (const e of k.experiments) {
      if (!e.isFipi) expect((e.bonusReason ?? '').length).toBeGreaterThan(0);
    }
  });
  it('kitFipiProgress считает только ФИПИ-опыты, done ≤ total', () => {
    for (const k of KITS) {
      const p = kitFipiProgress(k);
      const fipi = k.experiments.filter(e => e.isFipi);
      expect(p.total).toBe(fipi.length);
      expect(p.done).toBe(fipi.filter(e => e.done).length);
      expect(p.done).toBeLessThanOrEqual(p.total);
    }
  });
  it('ФИПИ-перечень по китам = 5/7/9/6/9/4/4 (всего 44)', () => {
    const byNum = (n: number) => KITS.find(k => k.num === n)!;
    expect(kitFipiProgress(byNum(1)).total).toBe(5);
    expect(kitFipiProgress(byNum(2)).total).toBe(7);
    expect(kitFipiProgress(byNum(3)).total).toBe(9);
    expect(kitFipiProgress(byNum(4)).total).toBe(6);
    expect(kitFipiProgress(byNum(5)).total).toBe(9);
    expect(kitFipiProgress(byNum(6)).total).toBe(4);
    expect(kitFipiProgress(byNum(7)).total).toBe(4);
    expect(totalExperiments().total).toBe(44);
  });
  it('Волна 0: kit-1 готов 4/5 (1.5 ещё нет), kit-2 готов 6/7 (F_упр ещё нет)', () => {
    const byNum = (n: number) => KITS.find(k => k.num === n)!;
    expect(kitFipiProgress(byNum(1)).done).toBe(4);
    expect(kitFipiProgress(byNum(2)).done).toBe(6);
  });
  it('kitsByCategory(mechanics) включает киты 1,2,5,6', () => {
    expect(kitsByCategory('mechanics').map(k => k.num).sort()).toEqual([1,2,5,6]);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

Run: `npm run test -w experiments/home -- kits.test`
Expected: FAIL (нет `kitFipiProgress`, `isFipi`/`done` отсутствуют, счётчики не сходятся).

- [ ] **Step 3: Обновить модель и содержимое `kits.ts`**

В `experiments/home/src/data/kits.ts`:
1. Расширить `KitExperiment`:
```ts
export interface KitExperiment {
  /** Слаг зарегистрированного экрана (для запуска ?screen=<id>); для planned — будущий слаг. */
  readonly id: string;
  readonly title: string;
  readonly resultVerb: string;
  /** Дотированный номер по ФИПИ (например, '2.1') — для бейджа. */
  readonly fipiTask?: string;
  /** true — опыт входит в перечень ФИПИ; false — бонус ЛАБОСФЕРЫ. */
  readonly isFipi: boolean;
  /** true — опыт реализован и DoD-ready. */
  readonly done: boolean;
  /** Обязателен, если isFipi===false: причина-обоснование бонуса. */
  readonly bonusReason?: string;
}
```
2. Переписать `experiments[]` всех 7 китов по перечню эпика §3 (дословные ФИПИ-опыты). Для **kit-1** и **kit-2** — точные значения ниже; для **kit-3..7** — каждый ФИПИ-опыт из эпика §3 как `{ id: '<kebab-slug>', title, resultVerb, fipiTask: '<N.M>', isFipi: true, done: false }` (экраны ещё не существуют — `status:'planned'`).

**kit-1 `experiments` (id = слаг зарегистрированного экрана):**
```ts
experiments: [
  { id: 'density-solid',     title: 'Плотность вещества',                 resultVerb: 'Измерь плотность тела',                  fipiTask: '1.1', isFipi: true, done: true },
  { id: 'archimedes',        title: 'Архимедова сила (цилиндры №2–4)',    resultVerb: 'Измерь архимедову силу',                 fipiTask: '1.2', isFipi: true, done: true },
  { id: 'archimedes-volume', title: 'F_A от объёма погружения',           resultVerb: 'Исследуй F_арх от объёма',               fipiTask: '1.3', isFipi: true, done: true },
  { id: 'archimedes',        title: 'F_A от плотности жидкости',           resultVerb: 'Исследуй F_арх от плотности жидкости',   fipiTask: '1.4', isFipi: true, done: true },
  { id: 'independence-mass', title: 'Независимость F_A от массы тела',     resultVerb: 'Проверь независимость F_арх от массы',   fipiTask: '1.5', isFipi: true, done: false },
],
```
**kit-2 `experiments`:**
```ts
experiments: [
  { id: 'spring-stiffness', title: 'Жёсткость пружины',                resultVerb: 'Измерь жёсткость пружины',            fipiTask: '2.1', isFipi: true, done: true },
  { id: 'friction',         title: 'Коэффициент трения скольжения',    resultVerb: 'Определи коэффициент трения',          fipiTask: '2.2', isFipi: true, done: true },
  { id: 'friction',         title: 'Работа силы трения',               resultVerb: 'Найди работу силы трения',            fipiTask: '2.3', isFipi: true, done: true },
  { id: 'elastic-force',    title: 'Измерение силы упругости',         resultVerb: 'Измерь силу упругости',               fipiTask: '2.4', isFipi: true, done: false },
  { id: 'friction',         title: 'F_тр от силы нормального давления',resultVerb: 'Исследуй F_тр от нормального давления',fipiTask: '2.5', isFipi: true, done: true },
  { id: 'friction',         title: 'F_тр от рода поверхности',         resultVerb: 'Исследуй F_тр от рода поверхности',    fipiTask: '2.6', isFipi: true, done: true },
  { id: 'spring-elastic',   title: 'Сила упругости от деформации (Гука)',resultVerb: 'Построй график силы упругости',      fipiTask: '2.7', isFipi: true, done: true },
  { id: 'spring-work',      title: 'Работа силы упругости',            resultVerb: 'Найди работу силы упругости',         isFipi: false, done: true,
    bonusReason: 'Демонстрирует закон сохранения энергии; в ФИПИ работа упругости только для kit-6 (с блоками). КОДИФ §1.29.' },
],
```
> Примечание по `fipiTask`: это лейбл-бейдж, не ключ. Для kit-2 ФИПИ не нумерует опыты — используем сквозные 2.1–2.7 как читаемые метки (порядок = перечень эпика §3). `id` повторяется (`friction` ×4) намеренно: 4 ФИПИ-опыта живут в одном экране с переключателем задач.

3. Удалить старое поле `progress: {done,total}` из объектов китов (оно становится производным). Если `Kit.progress` где-то типизировано/читается — заменить чтения на `kitFipiProgress(kit)` (см. Задачу 2 для UI-потребителей).
4. Добавить функции:
```ts
/** Прогресс кита по опытам ФИПИ (бонусы не считаются). */
export function kitFipiProgress(kit: Kit): { done: number; total: number } {
  const fipi = kit.experiments.filter(e => e.isFipi);
  return { done: fipi.filter(e => e.done).length, total: fipi.length };
}

/** Сумма ФИПИ-опытов по всем китам. */
export function totalExperiments(kits: ReadonlyArray<Kit> = KITS): { done: number; total: number } {
  return kits.reduce((acc, k) => {
    const p = kitFipiProgress(k);
    return { done: acc.done + p.done, total: acc.total + p.total };
  }, { done: 0, total: 0 });
}

/** Кол-во бонус-опытов кита (isFipi:false). */
export function kitBonusCount(kit: Kit): number {
  return kit.experiments.filter(e => !e.isFipi).length;
}
```
5. Убрать из `Kit` интерфейса поле `progress` (и его инициализацию во всех 7 объектах).

- [ ] **Step 4: Запустить тест — убедиться что зелёный**

Run: `npm run test -w experiments/home -- kits.test`
Expected: PASS (все кейсы, включая 5/7/9/6/9/4/4=44 и done 4/6).

- [ ] **Step 5: typecheck home (ловит сломанные чтения `progress`)**

Run: `npm run typecheck -w experiments/home`
Expected: PASS. Если ошибки о `progress` — это потребители из Задачи 2; временно допустимо чинить чтения на `kitFipiProgress(kit)` здесь же, если они в `data/`. UI-компоненты — в Задаче 2.

- [ ] **Step 6: Commit**

```bash
git add experiments/home/src/data/kits.ts experiments/home/src/data/__tests__/kits.test.ts
git commit -m "feat(home): каталог по ФИПИ — isFipi/done на опыт + kitFipiProgress (44 опыта)"
```

---

## Task 2: Каталог UI — бонус-бейдж + счёт прогресса по ФИПИ

**Files:**
- Modify: `experiments/home/src/components/kit-drawer.ts`
- Modify: место создания `<kit-poster>` (где выставляются атрибуты `done`/`total` из данных кита) + при необходимости `kit-poster.ts`
- Test: `experiments/home/src/**/__tests__` (drawer/shell тест на бейдж)

**Interfaces:**
- Consumes: `KitExperiment.isFipi`, `kitFipiProgress(kit)`, `kitBonusCount(kit)` из Задачи 1.

- [ ] **Step 1: Найти, где постеру задаются done/total**

Run: `cd /c/dev/Inter_OGE && grep -rn "kitFipiProgress\|\.progress\b\|setAttribute('done'\|done=\"\|total=\"" experiments/home/src --include=*.ts | grep -v __tests__`
Прочитать найденный модуль (вероятно `app-shell`/рендер постер-стены) — это потребитель Задачи 1.

- [ ] **Step 2: Тест — бонус помечается в drawer, прогресс по ФИПИ**

Добавить в существующий drawer/shell-тест (или создать `experiments/home/src/components/__tests__/kit-drawer.test.ts`) кейс:
```ts
import { describe, it, expect } from 'vitest';
import { KITS, kitFipiProgress } from '../../data/kits';
// renderKitDrawerHTML — экспортируй чистую функцию рендера списка опытов из kit-drawer.ts,
// если её нет — извлеки её (DRY) и покрой тестом.
import { renderKitDrawerHTML } from '../kit-drawer';

describe('kit-drawer бонус-бейдж', () => {
  it('опыт isFipi:false получает класс bonus-badge', () => {
    const kit2 = KITS.find(k => k.num === 2)!;
    const html = renderKitDrawerHTML(kit2, 'student');
    expect(html).toContain('bonus-badge');           // бейдж присутствует
    expect((html.match(/bonus-badge/g) ?? []).length).toBe(1); // ровно для spring-work
  });
  it('kit-2 прогресс ФИПИ = 6/7 на старте Волны 0', () => {
    const kit2 = KITS.find(k => k.num === 2)!;
    expect(kitFipiProgress(kit2)).toEqual({ done: 6, total: 7 });
  });
});
```

- [ ] **Step 3: Запустить — убедиться падает**

Run: `npm run test -w experiments/home -- kit-drawer`
Expected: FAIL (нет `bonus-badge` / нет экспорта `renderKitDrawerHTML`).

- [ ] **Step 4: Реализовать бонус-бейдж в `kit-drawer.ts`**

В цикле рендера опытов (рядом с `fipiHTML`) добавить:
```ts
const bonusHTML = exp.isFipi
  ? ''
  : `<span class="bonus-badge" title="${esc(exp.bonusReason ?? '')}" aria-label="Бонус ЛАБОСФЕРЫ (не входит в ФИПИ)">бонус</span>`;
```
Вставить `${bonusHTML}` в `<li>` сразу после `${fipiHTML}`. Добавить стиль рядом с `.fipi-badge`:
```ts
.bonus-badge {
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #f4b54a;
  flex-shrink: 0;
}
```
Если рендер списка не выделен в чистую функцию — выделить `export function renderKitDrawerHTML(kit, role): string` (тело = текущая сборка `experimentItems`+обёртка) и вызвать её из веб-компонента. Это и есть единица под тест.

- [ ] **Step 5: Переключить источник done/total постера на `kitFipiProgress`**

В модуле из Step 1 заменить выдачу прогресса на `const { done, total } = kitFipiProgress(kit);` (вместо `kit.progress`). Аналогично для агрегата на главной (если есть «N из M опытов») — на `totalExperiments()`.

- [ ] **Step 6: Запустить тесты + typecheck**

Run: `npm run test -w experiments/home -- kit-drawer` → PASS.
Run: `npm run typecheck -w experiments/home` → PASS (ошибок про `kit.progress` не осталось).

- [ ] **Step 7: Commit**

```bash
git add experiments/home/src/components/kit-drawer.ts experiments/home/src/components/__tests__/ experiments/home/src
git commit -m "feat(home): бонус-бейдж в drawer + прогресс постеров по опытам ФИПИ"
```

---

## Task 3: kit-1 — опыт 1.5 (независимость F_арх от массы) + верификация серии 1.2

**ФИПИ-якорь:** Прил. 2, компл. №1: «исследование … независимости выталкивающей силы от массы тела (цилиндры №1 и 2)».

**Files:**
- Create: `experiments/_shared-spa/src/lib/journal/specs.ts` → `INDEPENDENCE_MASS_SPEC` (append)
- Create: `experiments/kit-1-hydrostatics/src/physics/independence-mass/IndependenceCalc.ts` (+ `__tests__/IndependenceCalc.test.ts`)
- Create: `experiments/kit-1-hydrostatics/src/screens/independence-mass/{IndependenceMassScreen.ts, IndependenceMassExperiment.ts, template.html}` (копия эталона + адаптации)
- Modify: `experiments/kit-1-hydrostatics/src/main.ts` (регистрация)
- Create: `experiments/kit-1-hydrostatics/selfcheck-1-5.mjs`
- Create: `experiments/kit-1-hydrostatics/e2e/archimedes-series.spec.ts` (верификация 1.2)

**Interfaces:**
- Consumes: `archimedesForceN`, `measuredArchimedesForceN`, `cm3ToM3`, `gToKg`, `weightInAirN`, `G`, `RHO_WATER` из `@physics/archimedes/ArchimedesCalc`; цилиндры №1/№2 из `@physics/archimedes/tables` (или константы ниже).
- Produces: `INDEPENDENCE_MASS_SPEC: JournalSpec` (experimentId `'1.5'`); экран `IndependenceMassScreen` (meta.id `'independence-mass'`).

- [ ] **Step 1: Тест физики — равенство F_арх при равном V, разной массе**

Create `experiments/kit-1-hydrostatics/src/physics/independence-mass/__tests__/IndependenceCalc.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buoyantForceForCylinder, forcesAreEqual } from '../IndependenceCalc';

describe('buoyantForceForCylinder', () => {
  it('F_арх одинакова для стали(№1) и алюминия(№2) при V=25 см³', () => {
    const f1 = buoyantForceForCylinder(25.0); // см³
    const f2 = buoyantForceForCylinder(25.0);
    expect(f1).toBeCloseTo(0.245, 3);          // 1000·9.8·25e-6
    expect(f2).toBeCloseTo(0.245, 3);
  });
  it('бросает RangeError при V ≤ 0 / NaN', () => {
    expect(() => buoyantForceForCylinder(0)).toThrow(RangeError);
    expect(() => buoyantForceForCylinder(-5)).toThrow(RangeError);
    expect(() => buoyantForceForCylinder(NaN)).toThrow(RangeError);
  });
});
describe('forcesAreEqual', () => {
  it('равны в пределах допуска несмотря на разную массу', () => {
    expect(forcesAreEqual(0.245, 0.246)).toBe(true);   // |Δ| мал
    expect(forcesAreEqual(0.245, 0.30)).toBe(false);
  });
  it('NaN → false', () => {
    expect(forcesAreEqual(NaN, 0.245)).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — убедиться падает**

Run: `npm run test -w experiments/kit-1-hydrostatics -- IndependenceCalc`
Expected: FAIL (модуль не существует).

- [ ] **Step 3: Реализовать физику**

Create `experiments/kit-1-hydrostatics/src/physics/independence-mass/IndependenceCalc.ts`:
```ts
/**
 * Опыт 1.5 «Независимость выталкивающей силы от массы тела».
 * ФИПИ Прил. 2, компл. №1: «исследование … независимости выталкивающей силы
 * от массы тела (цилиндры №1 и 2)».
 * При равном объёме F_арх = ρ_воды·g·V не зависит от массы тела.
 */
import { archimedesForceN, cm3ToM3, RHO_WATER } from '../archimedes/ArchimedesCalc';

/** Полная архимедова сила [Н] при полном погружении цилиндра объёмом V [см³]. */
export function buoyantForceForCylinder(V_cm3: number): number {
  if (!Number.isFinite(V_cm3) || V_cm3 <= 0) {
    throw new RangeError(`V_cm3 must be > 0, got ${V_cm3}`);
  }
  return archimedesForceN(RHO_WATER, cm3ToM3(V_cm3));
}

/** Равны ли две силы в пределах относительного допуска (default 5%). */
export function forcesAreEqual(fa: number, fb: number, tolerance = 0.05): boolean {
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return false;
  if (Math.abs(fa) < 1e-9) return Math.abs(fb) < 1e-9;
  return Math.abs(fa - fb) / Math.abs(fa) <= tolerance;
}
```

- [ ] **Step 4: Тест зелёный**

Run: `npm run test -w experiments/kit-1-hydrostatics -- IndependenceCalc`
Expected: PASS.

- [ ] **Step 5: Журнальный SPEC**

В `experiments/_shared-spa/src/lib/journal/specs.ts` добавить (после `ARCHIMEDES_LIQUID_SPEC`), и включить в `ALL_SPECS`:
```ts
export const INDEPENDENCE_MASS_SPEC: JournalSpec = {
  experimentId: '1.5',
  kitId: 'kit-1',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'cylinder', label: 'Цилиндр', source: 'meta' },
    { key: 'm_g', label: 'm, г', source: 'meta', unit: 'г', format: 'int' },
    { key: 'V_cm3', label: 'V, см³', source: 'meta', unit: 'см³', format: 'int' },
    { key: 'P_air_N', label: 'P возд, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    { key: 'P_liq_N', label: 'P жид, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    {
      key: 'F_A_N', label: 'F_A, Н', source: 'derived', unit: 'Н', format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => (row.P_air_N ?? 0) - (row.P_liq_N ?? 0),
    },
  ],
};
```
Run: `npm run typecheck -w experiments/_shared-spa` → PASS (`'1.5'` уже в union).

- [ ] **Step 6: Скелет экрана — копия эталона + адаптации**

Скопировать папку-эталон:
```bash
cp -r experiments/kit-1-hydrostatics/src/screens/archimedes-volume experiments/kit-1-hydrostatics/src/screens/independence-mass
```
(archimedes-volume — ближайший по физике: динамометр + погружение + журнал v2). Затем переименовать классы/файлы → `IndependenceMassScreen` / `IndependenceMassExperiment`, и применить адаптации:
1. `IndependenceMassScreen.ts` — `meta`:
```ts
readonly meta: ScreenMeta = {
  id: 'independence-mass',
  label: 'Независимость F_A от массы',
  kicker: 'Опыт 1.5',
  icon: 'archimedes',
  tooltip: 'F_арх не зависит от массы тела при равном объёме (цилиндры №1 и №2)',
};
```
2. Docstring оркестратора — ФИПИ-якорь (цитата из Step «ФИПИ-якорь»).
3. Журнал: импортировать и использовать `INDEPENDENCE_MASS_SPEC` вместо volume-спеки; строки журнала — две фиксированные (цилиндр №1 сталь m=195 г V=25; №2 алюминий m=70 г V=25), `meta`-поля проставляет программа, `P_air_N`/`P_liq_N` — direct, `F_A_N` — derived. Вызов рендера — паттерн эталона:
```ts
renderJournalTable(this.#refs.journalHost, INDEPENDENCE_MASS_SPEC, rows, {
  mode: this.#recordMode(),
  onCellInput: (rowIdx, key, value) => this.#handleJournalCellInput(rowIdx, key, value),
  onVerify: (rowIdx) => this.#handleJournalVerify(rowIdx),
});
```
4. Сцена: две карточки-цилиндра (№1 сталь, №2 алюминий), динамометр 1 Н, мензурка/стакан. Вывод-вердикт: после двух строк показать «F_арх(№1) ≈ F_арх(№2) → не зависит от массы» через `forcesAreEqual`.
5. `reset()` чистит `#journalDrafts/#journalVerdicts`; `destroy()` снимает `renderRecordModeToggle`.
6. `RECORD_MODE_KIT = 'kit-1'`.

- [ ] **Step 7: State-machine тест экрана (happy-dom)**

Create `experiments/kit-1-hydrostatics/src/screens/independence-mass/__tests__/independence-mass.test.ts` по эталону `archimedes-volume` теста: mount в `document.body`, проверить наличие слотов `#journal-host`, `#record-mode-slot`, `#live-region`; после программного заполнения P_возд/P_жид для обоих цилиндров — `F_A_N` совпадает (вердикт ok) и появляется вывод о независимости. (Скопировать структуру существующего теста archimedes-volume и адаптировать ключи.)

Run: `npm run test -w experiments/kit-1-hydrostatics -- independence-mass`
Expected: сначала FAIL, после доводки экрана — PASS.

- [ ] **Step 8: Зарегистрировать экран в `main.ts`**

В `experiments/kit-1-hydrostatics/src/main.ts`:
```ts
import { IndependenceMassScreen } from '@screens/independence-mass/IndependenceMassScreen';
```
и в массив `screens`:
```ts
const screens: IScreen[] = [
  new DensitySolidScreen(),
  new ArchimedesScreen(),
  new ArchimedesVolumeScreen(),
  new IndependenceMassScreen(),
];
```
Подключить CSS, если завёл отдельный файл стилей (по образцу `archimedes-volume-experiment.css`).

- [ ] **Step 9: Self-check в браузере (mouse-drag + REST + 3 режима)**

Create `experiments/kit-1-hydrostatics/selfcheck-1-5.mjs` по шаблону PLAYBOOK Шаг 7: запустить dev, `?screen=independence-mass`, через `page.mouse.move/down/up` собрать установку для №1 и №2, снять multi-state скрины, проверить REST-state (drop-zones скрыты), overlay-dup=0, прогон 3 режимов записи; assert ФИПИ-инвариант: значения F_A в журнале для №1 и №2 совпадают (≈0,24–0,25 Н).
Run: `node experiments/kit-1-hydrostatics/selfcheck-1-5.mjs` (после `npm run dev -w experiments/kit-1-hydrostatics`) → PASS.

- [ ] **Step 10: e2e-верификация серии опыта 1.2 (№2/№3/№4)**

Create `experiments/kit-1-hydrostatics/e2e/archimedes-series.spec.ts`: открыть `?screen=archimedes` (режим «Вода»), последовательно выбрать цилиндры №2, №3, №4, для каждого снять P_возд+P_жид → проверить, что в журнале появляются 3 строки с корректной F_A_изм; axe — 0 нарушений. Это подтверждает статус 1.2 ✅ (см. аудит: серия уже поддержана).
Run: `npm run test:e2e -w experiments/kit-1-hydrostatics -- archimedes-series` → PASS.

- [ ] **Step 11: Каталог — пометить 1.5 готовым**

В `experiments/home/src/data/kits.ts` у kit-1 опыта `independence-mass` поставить `done: true`. Обновить ожидание в `kits.test.ts`: `kitFipiProgress(byNum(1)).done` → `5`.
Run: `npm run test -w experiments/home -- kits.test` → PASS.

- [ ] **Step 12: Гейты + commit**

Run: `npm run typecheck && npm run test && npm run lint` (из корня) → всё зелёное.
```bash
git add experiments/_shared-spa/src/lib/journal/specs.ts experiments/kit-1-hydrostatics/src experiments/kit-1-hydrostatics/selfcheck-1-5.mjs experiments/kit-1-hydrostatics/e2e/archimedes-series.spec.ts experiments/home/src/data
git commit -m "feat(kit-1): опыт 1.5 независимость F_арх от массы + верификация серии 1.2 → kit-1 5/5 ФИПИ"
```

---

## Task 4: kit-2 — опыт «измерение силы упругости одной точкой»

**ФИПИ-якорь:** КОДИФ §1.29 п.6: «…силы упругости…» (измерение, одной точкой через динамометр). Прил. 2 компл. №2: «измерение … силы упругости».

**Files:**
- Modify: `experiments/_shared-spa/src/lib/journal/types.ts` (union `experimentId` + `'2.5'`)
- Create: `experiments/_shared-spa/src/lib/journal/specs.ts` → `ELASTIC_FORCE_SPEC`
- Create: `experiments/kit-2-forces/src/screens/elastic-force/{ElasticForceScreen.ts, ElasticForceExperiment.ts, template.html}` (копия `spring-stiffness` + адаптации)
- Modify: `experiments/kit-2-forces/src/main.ts`
- Create: `experiments/kit-2-forces/selfcheck-elastic-force.mjs`

**Interfaces:**
- Consumes: `massToForce` из `spring/SpringModel`; `renderJournalTable`/`verifyRow`/`parseRu` из `@labosfera/shared-spa/...`.
- Produces: `ELASTIC_FORCE_SPEC` (experimentId `'2.5'`); экран `ElasticForceScreen` (meta.id `'elastic-force'`).

- [ ] **Step 1: Расширить union `experimentId`**

В `experiments/_shared-spa/src/lib/journal/types.ts`:
```ts
readonly experimentId: '1.1' | '1.2' | '1.3' | '1.4' | '1.5' | '2.1' | '2.2' | '2.3' | '2.4' | '2.5' | '2.6';
```

- [ ] **Step 2: Тест SPEC — derived F_упр = m·g**

Create `experiments/_shared-spa/src/lib/journal/__tests__/elastic-force-spec.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ELASTIC_FORCE_SPEC } from '../specs';
import { verifyRow } from '../verify';

describe('ELASTIC_FORCE_SPEC', () => {
  it('F_упр derived = m·g/1000 (100 г → 0,98 Н)', () => {
    const col = ELASTIC_FORCE_SPEC.columns.find(c => c.key === 'F_N')!;
    expect(col.expectedFromRow!({ m_g: 100 })).toBeCloseTo(0.98, 2);
  });
  it('verifyRow: введённое 0,98 при 100 г → ok', () => {
    const v = verifyRow(ELASTIC_FORCE_SPEC.columns, {
      idx: 1, timestamp: 1, values: { m_g: 100, F_N: 0.98 },
    });
    expect(v.F_N).toBe('ok');
  });
});
```
Run: `npm run test -w experiments/_shared-spa -- elastic-force-spec` → FAIL (нет спеки).

- [ ] **Step 3: Реализовать SPEC**

В `experiments/_shared-spa/src/lib/journal/specs.ts` (G уже определён в файле — используется в ARCHIMEDES_LIQUID_SPEC):
```ts
export const ELASTIC_FORCE_SPEC: JournalSpec = {
  experimentId: '2.5',
  kitId: 'kit-2',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'm_g', label: 'm, г', source: 'direct', unit: 'г', format: 'int' },
    {
      key: 'F_N', label: 'F_упр, Н', source: 'derived', unit: 'Н', format: 'fixed2',
      tolerance: 0.05,
      // При равновесии F_упр = m·g.
      expectedFromRow: (row) => ((row.m_g ?? 0) / 1000) * G,
    },
  ],
};
```
Добавить в `ALL_SPECS`. Run: `npm run test -w experiments/_shared-spa -- elastic-force-spec` → PASS.

- [ ] **Step 4: Скелет экрана — копия spring-stiffness + адаптации**

```bash
cp -r experiments/kit-2-forces/src/screens/spring-stiffness experiments/kit-2-forces/src/screens/elastic-force
```
Переименовать классы/файлы → `ElasticForceScreen`/`ElasticForceExperiment`. Адаптации:
1. `meta`:
```ts
readonly meta: ScreenMeta = {
  id: 'elastic-force',
  label: 'Сила упругости',
  kicker: 'Опыт 2.4',
  icon: 'spring',
  tooltip: 'Измерение силы упругости пружины одной точкой (динамометр)',
};
```
2. Docstring — ФИПИ-якорь (КОДИФ §1.29 п.6).
3. Журнал → `ELASTIC_FORCE_SPEC`; модель «одной точкой»: один груз (например 100 г) на пружину → одна строка `{ m_g, F_N }`. F_упр = `massToForce(m_g)`. Без серии/графика (в отличие от Гука 2.6).
4. Упростить сцену: убрать многоточечный сбор/LSQ-график — оставить штатив + пружина + динамометр + один груз. `RECORD_MODE_KIT = 'kit-2'`.
5. `reset()`/`destroy()` — как в эталоне.

- [ ] **Step 5: State-machine тест экрана**

Create `experiments/kit-2-forces/src/screens/elastic-force/__tests__/elastic-force.test.ts` по образцу теста spring-stiffness: mount, проверить слоты журнала/record-mode/live-region; после подвешивания груза 100 г → строка с F_N, вердикт ok при вводе 0,98.
Run: `npm run test -w experiments/kit-2-forces -- elastic-force` → после доводки PASS.

- [ ] **Step 6: Регистрация в `main.ts`**

В `experiments/kit-2-forces/src/main.ts`:
```ts
import { ElasticForceScreen } from '@screens/elastic-force/ElasticForceScreen';
```
В массив `screens` добавить `new ElasticForceScreen()` (после `SpringElasticScreen`, перед `FrictionScreen`). Подключить CSS при необходимости.

- [ ] **Step 7: Self-check**

Create `experiments/kit-2-forces/selfcheck-elastic-force.mjs` (шаблон PLAYBOOK Шаг 7): `?screen=elastic-force`, mouse-drag груза на пружину, multi-state скрины, REST-state, overlay-dup=0, 3 режима; assert F_упр≈0,98 Н для 100 г.
Run: `node experiments/kit-2-forces/selfcheck-elastic-force.mjs` (после dev) → PASS.

- [ ] **Step 8: Каталог — пометить F_упр готовым**

В `kits.ts` у kit-2 опыта `elastic-force` → `done: true`. В `kits.test.ts` обновить `kitFipiProgress(byNum(2)).done` → `7`. И кейс «Волна 0 … kit-2 6/7» заменить на финальный 7/7 (или удалить, если станет неактуален).
Run: `npm run test -w experiments/home -- kits.test` → PASS.

- [ ] **Step 9: Гейты + commit**

Run (из корня): `npm run typecheck && npm run test && npm run lint` → зелёное.
```bash
git add experiments/_shared-spa/src/lib/journal experiments/kit-2-forces/src experiments/kit-2-forces/selfcheck-elastic-force.mjs experiments/home/src/data
git commit -m "feat(kit-2): опыт «измерение силы упругости одной точкой» → kit-2 7/7 ФИПИ"
```

---

## Task 5: kit-2 — миграция бонуса spring-work с журнала v1 на v2

**Контекст (аудит):** `SpringWorkScreen` рендерит самодельную `<table>` без `renderJournalTable` (комментарий в коде: «legacy v1 table. Будет переход на shared spec»). Мигрируем на v2; опыт остаётся бонусом (`isFipi:false`).

**Files:**
- Create: `experiments/_shared-spa/src/lib/journal/specs.ts` → `SPRING_WORK_SPEC`
- Modify: `experiments/kit-2-forces/src/screens/spring-work/SpringWorkScreen.ts` (рендер журнала → `renderJournalTable`)
- Test: `experiments/_shared-spa/src/lib/journal/__tests__/spring-work-spec.test.ts`

**Interfaces:**
- Produces: `SPRING_WORK_SPEC` (experimentId `'2.4'` — литерал есть в union).

- [ ] **Step 1: Тест SPEC работы упругости**

Create `experiments/_shared-spa/src/lib/journal/__tests__/spring-work-spec.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { SPRING_WORK_SPEC } from '../specs';

describe('SPRING_WORK_SPEC', () => {
  it('W_упр derived = k·Δl²/2 (k=50 Н/м, Δl=4 см → 0,04 Дж)', () => {
    const col = SPRING_WORK_SPEC.columns.find(c => c.key === 'W_J')!;
    // Δl в см → метры внутри expectedFromRow
    expect(col.expectedFromRow!({ k_N_m: 50, dl_cm: 4 })).toBeCloseTo(0.04, 3);
  });
  it('содержит колонки m, Δl, F, W', () => {
    const keys = SPRING_WORK_SPEC.columns.map(c => c.key);
    expect(keys).toEqual(expect.arrayContaining(['m_g', 'dl_cm', 'F_N', 'W_J']));
  });
});
```
Run: `npm run test -w experiments/_shared-spa -- spring-work-spec` → FAIL.

- [ ] **Step 2: Реализовать SPEC**

В `specs.ts` (сверить точные формулы/колонки с `spring-work/WorkCalc.ts` перед финализацией; ниже — каноническая форма W=k·Δl²/2):
```ts
export const SPRING_WORK_SPEC: JournalSpec = {
  experimentId: '2.4',
  kitId: 'kit-2',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'm_g', label: 'm, г', source: 'direct', unit: 'г', format: 'int' },
    { key: 'dl_cm', label: 'Δl, см', source: 'direct', unit: 'см', format: 'fixed1' },
    { key: 'k_N_m', label: 'k, Н/м', source: 'meta', unit: 'Н/м', format: 'int' },
    {
      key: 'F_N', label: 'F, Н', source: 'derived', unit: 'Н', format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => (row.k_N_m ?? 0) * ((row.dl_cm ?? 0) / 100),
    },
    {
      key: 'W_J', label: 'A_упр, Дж', source: 'derived', unit: 'Дж', format: 'fixed3',
      tolerance: 0.05,
      expectedFromRow: (row) => 0.5 * (row.k_N_m ?? 0) * Math.pow((row.dl_cm ?? 0) / 100, 2),
    },
  ],
};
```
Добавить в `ALL_SPECS`. Run: `npm run test -w experiments/_shared-spa -- spring-work-spec` → PASS.
> Перед Step 3 прочитать `experiments/kit-2-forces/src/screens/spring-work/WorkCalc.ts` и согласовать колонки SPEC с реальными вычисляемыми величинами (если в экране сравниваются W_k/W_F/A_grav — добавить соответствующие derived-колонки, сохранив формулы из WorkCalc).

- [ ] **Step 3: Заменить самодельный рендер на `renderJournalTable`**

В `SpringWorkScreen.ts` (и связанном Experiment/renderers): удалить кастомный `renderers.journal` с ручной сборкой `<tr>/<td>`; вместо него — вызвать `renderJournalTable(journalHost, SPRING_WORK_SPEC, rows, {mode, onCellInput, onVerify})` по паттерну density/spring-stiffness; завести `#journalDrafts/#journalVerdicts`; подключить `renderRecordModeToggle` (ключ `kit-2`), `verifyRow`, `parseRu`; убедиться что слоты `#journal-host`/`#record-mode-slot`/`#record-pending-*` есть в template (добавить по эталону, если нет). Сохранить ФИПИ-якорь-docstring как БОНУС (`// ⚠️ БОНУС ЛАБОСФЕРА — НЕ ВХОДИТ В ФИПИ. Причина: работа упругости в ФИПИ только для kit-6 (блоки). КОДИФ §1.29.`).

- [ ] **Step 4: Прогон существующих тестов spring-work + новый state-machine**

Run: `npm run test -w experiments/kit-2-forces -- spring-work`
Expected: PASS (адаптировать существующие тесты под v2-таблицу: селекторы `.lab-journal-body`/`data-key`, кнопка `#record-pending-btn` — стандарт журнала v2).

- [ ] **Step 5: Self-check (если есть selfcheck для spring-work — обновить; иначе e2e smoke)**

Прогнать существующий self-check/e2e опыта 2.4; убедиться, что журнал — v2 (`.lab-journal-table`), 3 режима работают, REST-state ок.

- [ ] **Step 6: Гейты + commit**

Run (из корня): `npm run typecheck && npm run test && npm run lint && npm run build` → зелёное.
```bash
git add experiments/_shared-spa/src/lib/journal experiments/kit-2-forces/src/screens/spring-work
git commit -m "refactor(kit-2): миграция бонуса spring-work на журнал v2 (SPRING_WORK_SPEC)"
```

---

## Task 6: REFERENCE §30 + финальная верификация Волны 0

**Files:**
- Modify: `experiments/2-1-spring/REFERENCE.md` (§30.3, §30.5)

- [ ] **Step 1: Обновить таблицы покрытия §30**

В `experiments/2-1-spring/REFERENCE.md`:
- §30.3 kit-1: 1.2 → ✅ (серия №2–4 верифицирована e2e); 1.5 → ✅; итог «kit-1: 5/5».
- §30.3 kit-2: добавить строку «Измерение силы упругости одной точкой → `elastic-force/` ✅»; `spring-work` → журнал v2; итог «kit-2: 7/7 ФИПИ + 1 бонус».
- §30.5 бюллетень: kit-1 5/0/0, kit-2 7/0/0, бонусов kit-2 = 1.

- [ ] **Step 2: Полный прогон гейтов монорепо**

Run (из корня `C:\dev\Inter_OGE`):
```
npm run typecheck
npm run test
npm run lint
npm run build
```
Expected: всё зелёное; vitest без падений; lint 0 errors; сборка всех SPA.

- [ ] **Step 3: Reality-check скринами**

`npm run dev -w experiments/home` → 127.0.0.1:5181: постер-стена — kit-1 «5/5», kit-2 «7/7», бонус-бейдж у spring-work в drawer. `npm run dev` для kit-1/kit-2 → пройти 1.5 и F_упр руками, снять скрины. Сверить с реальным опытом ОГЭ.

- [ ] **Step 4: Commit**

```bash
git add experiments/2-1-spring/REFERENCE.md
git commit -m "docs(reference): §30 покрытие — kit-1 5/5, kit-2 7/7 ФИПИ + бонус на v2"
```

---

## Self-Review (выполнено автором плана)

**1. Покрытие спеки:** каталог-модель+контент (Task 1) ✔; бонус-бейдж+счёт (Task 2) ✔; опыт 1.5 (Task 3) ✔; укрепление/верификация 1.2 (Task 3 Step 10 — по аудиту это верификация серии, не доработка) ✔; опыт F_упр (Task 4) ✔; аудит spring-work → миграция v2 (Task 5, аудит дал вердикт «migrate») ✔; REFERENCE §30 (Task 6) ✔.

**2. Плейсхолдеры:** код приведён для всей новой логики (SPECs, физика, тесты, бейдж, регистрация). Боилерплейт-оркестраторы — через «копировать эталон + точные адаптации» (канон PLAYBOOK Шаг 4), не «similar to Task N».

**3. Согласованность типов:** `kitFipiProgress`/`totalExperiments`/`isFipi`/`done`/`bonusReason` — единые во всех задачах. `experimentId` union расширяется в Task 4 (Step 1) ДО использования `'2.5'` в `ELASTIC_FORCE_SPEC`. `SPRING_WORK_SPEC` использует `'2.4'` (уже в union). Слаги экранов (`independence-mass`, `elastic-force`) совпадают между `kits.ts`, `meta.id` и регистрацией в `main.ts`.

**Разрешённые развилки спеки:** (1) опыт 1.2 — аудит: уже серия → верифицировать e2e + ✅ (не доработка). (2) spring-work — аудит: v1-legacy → мигрировать на v2. (3) нумерация: F_упр = бейдж «2.4», spring-work = бонус без ФИПИ-зачёта; внутренние ключи SPEC: F_упр `'2.5'`, spring-work `'2.4'`.
