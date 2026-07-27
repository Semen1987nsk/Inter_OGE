---
paths:
  - "experiments/**/__tests__/**/*.ts"
  - "experiments/**/*.test.ts"
  - "experiments/**/e2e/**/*.ts"
---

# Стандарт тестирования — 4 уровня + visual

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
методичка в `.business/спеки/2026-05-06-blind-spots-testing.md`.

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

Анти-паттерн: тесты «после фикса» — пиши одновременно.
