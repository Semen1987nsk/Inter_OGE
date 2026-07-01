# Task 9 Report (Phase E, Kit-4 Optics): Каталог ремап 4.3/4.6 + selfcheck-4-3/4-6

## Status: DONE

## Что сделано

**Step 1 — ремап каталога** (`experiments/home/src/data/kits.ts`):
- Опыт 4.3: `id: 'refraction-index'` → `'refraction'`, `done: false` → `true`
- Опыт 4.6: `id: 'refraction-angle'` → `'refraction'`, `done: false` → `true`
- Статус кита-4 остался `'planned'` (переключение на `'ready'` — Фаза F)

**Step 2 — `selfcheck-4-3.mjs`** (создан):
- `SCREEN='?screen=refraction'`, порт 5192
- 10 пунктов: навигация, таб A-index aria-selected, REST-state, D&D мышью, setIncidenceAngle(45)+лучи, semi-auto журнал+verdict ok/wrong, a11y no-leak, fully-auto readonly td[n], 3 режима, axe 0
- Ключевая находка: refraction использует `status="placed"` (не `data-placed` как lens-bench)
- Ключевая находка: в fully-auto `setIncidenceAngle` вызывает авто-запись через `#afterAngleChange` — фиксировать `measuresBefore` ДО вызова

**Step 3 — `selfcheck-4-6.mjs`** (создан):
- Таб `[data-task="B-angle"]`, свип [15,30,45,60,75]°, монотонность r(i), граф (#graph-block, N точек, xLabel i,°→sin i), result-panel нелинейность, 3 режима, axe 0

## Результаты selfcheck

```
selfcheck-4-3: PASS=38  FAIL=0  SKIP=0  STATUS: PASS
selfcheck-4-6: PASS=37  FAIL=0  SKIP=0  STATUS: PASS
```

## Коммит

`53108b8` — `feat(kit-4): каталог 4.3/4.6 → экран refraction (done) + selfcheck-4-3/4-6`

3 файла: `experiments/home/src/data/kits.ts` (ремап), `selfcheck-4-3.mjs`, `selfcheck-4-6.mjs` (+1622 строки)

## Concerns

Нет. Все 75 проверок (38+37) прошли без FAIL и SKIP.

---

# Fix-цикл 1 (Task 9, post-review)

## Что менял

**Fix 1 — маскирующий fallback в semi-auto свипе (selfcheck-4-6.mjs, ~282-303)**

В `checkAngleSweepAndMonotonicity`: убран programmatic `recordMeasurement()` как fallback при скрытой `#record-pending-btn`. Заменён на явный `fail(...)` с диагностикой (`bothPlaced`, `iDeg`, `activeTask`, `slotHidden`, `bodyMode`). Запись ОБЯЗАНА идти через реальный клик видимой кнопки.

Реальный баг pending B-angle? **НЕТ.** При тестировании (bothPlaced=true, iDeg=30, activeTask='B-angle', semi-auto) `#record-pending-btn` оказалась видима — все 5 углов в свипе записались через реальный клик. Код `#refreshUi()` корректно показывает кнопку для обеих задач: `isPending && mode === 'semi-auto'`.

**Fix 2 — body[data-record-mode] skip→fail (оба selfcheck)**

Верификация через запущенное приложение: `renderRecordModeToggle` вызывает `applyRecordModeAttribute(current)` при инициализации и `applyRecordModeAttribute(s.mode)` при каждой смене — атрибут ставится. Подтверждено в headless браузере: после reload(mode=fully-manual) `body.dataset.recordMode === 'fully-manual'`.

Решение: `skip` → `fail` в обоих selfcheck. Проверка теперь УМЕЕТ дать красный если приложение перестанет ставить атрибут.

**Fix 3 — no-leak regex, selfcheck-4-3 (checkA11yNoLeak, #result-panel)**

Расширен паттерн с `n[\s]*[=≈][\s]*1[,.]5` до `/[=≈]\s*1[,.]5/i`. Добавлена проверка `innerHTML` (aria-label атрибуты не видны в textContent). Инструкционный текст «n = sin i / sin r» не совпадает (после «=» нет «1,5»).

**Fix 4 — n-value regex, selfcheck-4-3 (fully-auto readonly check)**

Заменено: `/1[,.]4[0-9]|1[,.]5[0-9]/.test(...)` → `Math.abs(parseFloat(text.replace(',','.')) - 1.5) < 0.1`. Числовая проверка точнее и не может «пройти» на пустой строке или случайном тексте.

## Итоги selfcheck

```
selfcheck-4-3: PASS=38  FAIL=0  SKIP=0  STATUS: PASS
selfcheck-4-6: PASS=37  FAIL=0  SKIP=0  STATUS: PASS
```

RefractionExperiment.ts не менялся — баг pending B-angle отсутствовал. Unit-тесты не требовали перезапуска.

---

# Task 9 Report: `<progress-ring>` Web Component

## Status: DONE ✓

## TDD Cycle
- **RED**: Test file written first → `Failed to resolve import "../progress-ring"` (file didn't exist) ✓
- **GREEN**: Implementation written → 13/13 tests pass ✓
- **Typecheck**: `tsc --noEmit` clean (fixed unused `_svg` field) ✓
- **Full suite**: 49/49 tests pass (8 test files) ✓

## Commit
`bbbb091` — `feat(home): <progress-ring> SVG-кольцо прогресса`

## Files
- `experiments/home/src/components/progress-ring.ts` — pure `ringGeometry` + `ProgressRing` custom element
- `experiments/home/src/components/__tests__/progress-ring.test.ts` — 13 tests (7 geometry + 6 render)

## Test Summary
13 passed: geometry (circumference=2πr, offset at 0/max/half, clamp <0 and >max, max=0 guard) + render (SVG exists, aria-label with value/max, 2 circles, stroke-linecap=round, svg[role=img], attribute change reactivity).

## Implementation Notes
- `ringGeometry`: pure, exported, no side effects
- Shadow DOM open; SVG via `createElementNS` (no innerHTML for SVG)
- `innerHTML = ''` only to clear shadow root (no untrusted content)
- Stroke width = 8% of diameter (Math.round(44*2*0.08) = 7px)
- Rotation -90° so ring starts at 12 o'clock
- `role=img` on SVG; `aria-label` on host element
- Animation: double-rAF pattern for first mount (none if `prefers-reduced-motion`)
- `data-neutral` attribute → neutral grey; default → amber `#f59e0b`
- `customElements.define` guarded by `!customElements.get(TAG)`

## Concerns
- happy-dom doesn't process CSS transitions → animation path tested implicitly only (attribute reactivity verified directly)
- `void stroke` suppresses TS unused-param warning — stroke is in signature per brief but unused in geometry math

---

# Consolidated fix финала (Phase E, Kit-4 Optics)

Финальный whole-branch review + reality-check контролёра нашли merge-блокер (утечка ответа n)
плюс виз-полировку. Все 6 пунктов + T4-honesty исправлены одним заходом.

## Что сделано по каждому пункту

**MUST-FIX 1 — заголовок карточки палил n (Global Constraint 6).**
`template.html`: `title="Полуцилиндр (стекло, n≈1,5)"` → `title="Полуцилиндр (стекло)"`.
Прогон grep по всему template: остальные вхождения `1.5` — это `stroke-width="1.5"` (легитимные
SVG-обводки), `n≈` вне fully-auto нигде нет.

**MUST-FIX 2 — подпись .n-label на диске гейтирована по режиму.**
`lab-protractor-disc.ts`: добавлены поля `#placedCyl`, `#revealIndex` (по умолчанию `false`),
метод `setRevealIndex(on)` и единый источник видимости `#syncNLabel()` — n-label видна ⇔
(полуцилиндр размещён И reveal включён). `setPlaced('semicylinder', true)` больше НЕ раскрывает n
безусловно. Метке `<text>` добавлен `aria-hidden="true"` (SR не озвучивает ответ).
`RefractionExperiment.ts`: добавлен `#syncRevealIndex()` = `disc.setRevealIndex(mode === 'fully-auto')`,
вызывается в конструкторе, в `#handleRecordModeChange`, после размещения (`#recordPlacement`) и в `reset`.
Вне fully-auto n-label скрыта.

**MUST-FIX 3 — selfcheck-4-3 no-leak расширен (регресс-гард).**
`checkA11yNoLeak`: добавлен скан ВСЕЙ видимой сцены в semi-auto — shadowRoot `#protractor-disc`
(видимая, не hidden, `.n-label`) И `.equipment-panel` (атрибуты `title` карточек `lab-equipment-card`
+ текст). Паттерны `/[=≈]?\s*1[,.]5/` и `/\bn\b[^0-9]{0,8}1[,.]5/i`. Найдено «1,5» → FAIL.

**SHOULD-FIX 4 — глиф осветителя.**
`emitter-group` перерисован из голого rect в узнаваемый источник света: корпус (rx, тёплый металлик,
paint-order stroke) + продольный блик + трапеция-рефлектор (горловина) + светящаяся линза-апертура
(ellipse) + расширяющийся пучок (path, α 0.28) + осевой яркий луч к краю диска. Корпус 72px ≥15% viewBox.
Всё через `createElementNS`. Утечки n нет.

**SHOULD-FIX 5 — тинт стекла.**
`.glass-body` fill `rgba(100,180,240,0.22)` → `rgba(120,195,245,0.34)`, stroke `#5ab0e0`→`#74c4ee` 1.2→1.6.
`.flat-face` stroke `#7ecef0`→`#aee3f7` 2→2.6. Нижний полукруг чётко читается как стекло на тёмном фоне.
Гео-тест sweep-flag 0 не тронут (менялся только CSS, не `d`).

**SHOULD-FIX 6 — анонс смены таба.**
`RefractionExperiment.setActiveTask` анонсирует в `#live-region`: A → «Опыт 4.3, показатель преломления.»,
B → «Опыт 4.6, зависимость угла преломления.» (новые литералы `HINTS.taskSwitchA/B`).

**T4 Minor (honesty).**
Добавлен ассерт: отражённый луч в ВЕРХНЕЙ половине — `expect(Number(refl.getAttribute('y2'))).toBeLessThan(210)`
(единственный непокрытый гео-инвариант).

## Доказательство красноты расширенного no-leak selfcheck (честность)

Обе ветви скана доказаны фальсифицируемыми:

1. **Ветвь карточек** — временно вернул `title="Полуцилиндр (стекло, n≈1,5)"`:
   ```
   FAIL  4.3 a11y: СЦЕНА палит числовой ответ n в semi-auto: утечки: card.title="Полуцилиндр (стекло, n≈1,5)"
   selfcheck-4-3: PASS=38  FAIL=1  SKIP=0  STATUS: FAIL  (exit 1)
   ```
   Откатил → снова зелено.

2. **Ветвь диска** — временно заставил `#syncRevealIndex` всегда `setRevealIndex(true)`:
   ```
   FAIL  4.3 a11y: СЦЕНА палит числовой ответ n в semi-auto: утечки: disc.n-label(visible)="n ≈1,5"
   selfcheck-4-3: PASS=38  FAIL=1  SKIP=0  STATUS: FAIL  (exit 1)
   ```
   Откатил → снова зелено (PASS=39 FAIL=0).

## Reality-check (визуал + no-leak в semi-auto по умолчанию)

Скриншот `selfcheck-screenshots/rc-disc-assembled.png` + инспекция shadowRoot после сборки:
```
nLabelHidden: true, nLabelAria: "true", emitterHidden: false, emitterChildren: 6,
glassFill: "rgba(120, 195, 245, 0.34)"
```
Нижний полукруг читается как стекло, осветитель — узнаваемый источник света, n-label скрыта.

## Итоги всех гейтов

```
vitest (@labosfera/kit-4-optics):  8 files, 367 passed  (FAIL=0)
  — lab-protractor-disc.test.ts: 60, refraction.test.ts: 60
tsc -p kit-4-optics --noEmit:      EXIT 0
build (@labosfera/kit-4-optics):   OK (vite built, 40 modules)
eslint src:                        EXIT 0
selfcheck-4-3.mjs:                 PASS=39  FAIL=0  SKIP=0
selfcheck-4-6.mjs:                 PASS=37  FAIL=0  SKIP=0
```

## Затронутые файлы
- `experiments/kit-4-optics/src/screens/refraction/template.html` (MUST-1)
- `experiments/kit-4-optics/src/ui/components/lab-protractor-disc.ts` (MUST-2, SHOULD-4, SHOULD-5)
- `experiments/kit-4-optics/src/ui/components/__tests__/lab-protractor-disc.test.ts` (MUST-2 тесты, T4-honesty)
- `experiments/kit-4-optics/src/screens/refraction/RefractionExperiment.ts` (MUST-2, SHOULD-6)
- `experiments/kit-4-optics/src/screens/refraction/RefractionScreen.ts` (тип disc: +setRevealIndex — иначе tsc красный)
- `experiments/kit-4-optics/src/screens/refraction/__tests__/refraction.test.ts` (SHOULD-6 тест, тип disc)
- `experiments/kit-4-optics/selfcheck-4-3.mjs` (MUST-3)

## Коммит
`3037a88` — `fix(kit-4): убери утечку n + гейт n-label + полировка осветителя/стекла — финал Фазы E`
(8 файлов, +342 −24; RefractionScreen.ts вошёл как обязательный тип-фикс для tsc EXIT 0)
