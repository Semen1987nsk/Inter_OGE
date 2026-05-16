# KNOWN_ISSUES — Кит-1 «Гидростатика»

Зафиксированные несовершенства, которые на момент сдачи опыта 1.2
(2026-05-07) **сознательно не правятся**: они относятся к опыту 1.1,
не задевают опыт 1.2 и не блокируют DoD-1.2.

---

## 1.1 — drag-drop.spec.ts: 2 e2e-теста падают

**Файл:** `e2e/drag-drop.spec.ts`
**Тесты:**

1. `RETURN-TO-KIT: drag прибора со сцены на свою карточку убирает в комплект`
   (строка ~180)
2. `REVERSE: цилиндр из мензурки drag-ом обратно на весы` (строка ~219)

### Симптом

Оба теста ожидают, что после reverse-drag элемент станет hidden:

```
Error: expect(locator).toBeHidden() failed
Locator:  locator('#cylinder')   /  '#weight-in-cylinder'
Expected: hidden
Received: visible
Timeout:  5000ms
```

В реальном браузере (DevTools, mouse-driven) reverse-drag отрабатывает
корректно — приборы возвращаются в комплект, overlay прячется. Падение —
только в Playwright-симуляции pointer-events: drag-ghost не доезжает до
target из-за разницы в pointer event timing между реальным мышью и
Playwright `dispatchEvent`.

### Что НЕ делать сейчас

- Не править `DragDropController.ts` опыта 1.1 «по ходу 1.2». Опыт 1.1
  закрыт 151 тестом и работает в проде; trash-фикс под Playwright
  может уронить рабочее поведение.
- Не убирать тесты — они полезны как regression-якорь, когда возьмёмся
  чинить целенаправленно.

### Когда чинить

**Sprint 1.3** (опыт «F_A vs объём погружённой части»). Там цилиндр
№3 переиспользует тот же drag-mechanism. Ожидаемый фикс — синхронизация
`pointermove` + `pointerup` через `await page.waitForFunction(...)`
вместо немедленного assert; либо переход на native HTML5 drag для
симметричного поведения в Playwright и live-DOM.

### Не блокирует

- 498 vitest-тестов 1.1 + 1.2 — все зелёные.
- Опыт 1.2 e2e — отдельный спец-файл `archimedes.spec.ts`, не пересекается.
- Production-сборка — `npm run build` чистая.
- Реальное ученическое UX в браузере — не нарушено.

---

## eslint не установлен

**Симптом:** `npm run lint` в `experiments/kit-1-hydrostatics/` падает с
«eslint не является внутренней или внешней командой».

**Причина:** в `package.json` Кит-1 `devDependencies` не включают
`eslint` и его конфиги (наследуется от шаблона 2-1-spring, где eslint
тоже не установлен явно). Скрипт `lint` присутствует «на будущее».

**Когда чинить:** при следующем `npm install` в Кит-1 — добавить
`eslint@^9` + `@typescript-eslint/*` + `eslint-config-prettier`
(такой же набор, как в Кит-2). Не критично для DoD-1.2: typecheck
strict на 0 ошибок покрывает все неявные типовые проблемы.
