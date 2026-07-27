---
paths:
  - "experiments/_shared-spa/src/lib/journal/**/*.ts"
  - "experiments/**/*Experiment.ts"
---

# 🚨 Обязательный стандарт журнала (§21) — для НОВЫХ опытов

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

**Журнал измерений одинаковый во всех опытах**: формула наверху, табличка с
inputs для пользовательских вычислений + кнопка «✓ Проверить» с tolerance ±5%.
