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
