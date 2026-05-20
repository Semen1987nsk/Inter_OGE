# Known Issues — 2-1-spring

Файл-трекер технических долгов, специфичных для опыта 2.1. Не блокирует Definition of Done, но требует внимания.

## Playwright e2e — pre-existing 21 functional failures (2026-05-19)

**Симптомы:**

При прогоне `npm run test:e2e --workspace=@labosfera/spring-experiment` падают 21 теста (7 уникальных × 3 viewports: desktop / tablet-touch / mobile-touch).

**Failing tests:**

- `a11y.spec.ts`: Главная страница — 0 violations (×3)
- `a11y.spec.ts`: После 3 измерений — 0 violations (×3)
- `spring-experiment.spec.ts`: 1. Smoke — `locator('.logo').toContainText('ЛАБОСФЕРА')` — `.logo` element не найден (×3)
- `spring-experiment.spec.ts`: 2. Подвес 100 г — `toContainText` failure (×3)
- `spring-experiment.spec.ts`: 3. Три измерения — `#measurements-body tr` count 0/expected 3 (×3)
- `spring-experiment.spec.ts`: 4. Удаление через × — `#measurements-body tr` count 0/expected 2 (×3)
- `spring-experiment.spec.ts`: 5. Переключение пружины — `#measurements-body tr` count 0/expected 1 (×3)

**Корневая причина:**

Тесты используют **устаревшие селекторы**, не отражающие текущую разметку:

- `.logo` элемент удалён из header'а в каком-то предыдущем рефакторинге.
- `#measurements-body tr` — журнал измерений мигрировал на shared-spa `renderJournalTable` (см. §21 REFERENCE), теперь живёт в другой структуре, возможно в Shadow DOM.

**Подтверждение pre-existing:**

Verified 2026-05-19 при работе над Phase 1 design-tokens migration: revert source к `HEAD~3` (commit `72db9a1`, до spacing-токен рефакторинга) — те же 21 failure воспроизводятся. Failure'ы НЕ связаны с design-tokens работой.

**Vitest unit tests:** 141/141 passed на том же commit, регрессии нет.

**Visual regression suite:**

В `experiments/2-1-spring/e2e/` отсутствуют `toHaveScreenshot` / `toMatchSnapshot` тесты. Visual regression baseline'ов нет. Это влияет на стратегию миграции дизайн-токенов: невозможно объективно сравнить «до/после» через автоматику; полагаемся на manual reality check через Playwright MCP + сверку с фото реального оборудования.

**Action items:**

- [ ] Обновить `spring-experiment.spec.ts` под текущую разметку (новые селекторы журнала через shared-spa journal renderer).
- [ ] Решить нужны ли actually `.logo` тесты — если header упрощён, удалить.
- [ ] Рассмотреть добавление `toHaveScreenshot` baseline'ов для main scene + journal — это даст automatic visual regression для будущих refactor'ов.

**Не блокирует:** Definition of Done — функциональная корректность подтверждена vitest unit + property fuzzer + state-machine тестами (141 passed). Manual reality check через Playwright MCP (Phase 1 Task 21) показал визуальную корректность.

---
