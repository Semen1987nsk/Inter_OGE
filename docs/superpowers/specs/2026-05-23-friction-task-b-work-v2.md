# Task B «Работа силы трения» — миграция friction на §21 v2

**Дата:** 2026-05-23 · **Ветка:** `feat/kit2-friction-work` · **Кит:** kit-2-forces, экран `friction`

## Цель (одно предложение)
Сделать опыт 2.3 «Измерение работы силы трения» (A = F_тр · s) реально работающим,
мигрировав журнал friction-экрана на единый §21 v2 с per-task SPEC.

## ФИПИ-якорь
Спецификация КИМ ОГЭ-2026, Прил. 2, стр. 17, Комплект №2 (дословно):
«…измерение … **работы силы трения** …». TaskId `B-work`, experimentId `2.3`.

## Почему сейчас «ложно-готов»
- `recordMeasurement` всегда пишет `distanceMm: null, work: null`
  (`FrictionExperiment.ts:286-287`).
- Журнал — статическая μ-таблица (№/Пов./m/N/F/μ) для ВСЕХ задач
  (`template.html:150-155`) → в Task B неверные колонки (нет s, нет A).
- Путь `s` ученику негде прочитать → измерение «магическое».

## Что уже готово (переиспользуем)
- Физика: `workOfFriction(frictionN, distanceMm) → A (Дж)` (`FrictionModel.ts:87`). Корректна.
- Скольжение: `block.positionMm` растёт по RAF, клампится на 350 мм (`startSliding` 207-237).
- Слоты `distanceMm/work` в `FrictionMeasurement`; таб `B-work` в степпере.
- Эталон v2: `kit-2-forces/.../spring-stiffness/SpringExperiment.ts` (#renderJournal 1488-1604).

## Решение

### 1. FRICTION_WORK_SPEC (shared `specs.ts`)
| key | label | source | format | прим. |
|---|---|---|---|---|
| idx | № | meta | int | |
| surface | Поверхность | meta | | A/Б |
| F_friction_N | F тр, Н | direct | fixed2 | показание динамометра |
| s_cm | s, см | direct | fixed1 | путь (ученик читает с линейки) |
| work_J | A, Дж | derived | fixed3 | `F · (s_cm/100)`, tolerance 0.10 |

`FRICTION_SPEC` (μ) остаётся для A/C/D. SPEC выбирается по `activeTask`.

### 2. Захват пути + наблюдаемость
- Линейка/шкала на `lab-friction-track` ИЛИ живой индикатор «s = NN см» — путь ВИДЕН.
- При записи в Task B: `distanceMm` = смещение бруска за скольжение
  (`positionMm − slidingStartPosMm`), `work = workOfFriction(F, distanceMm)`.

### 3. Миграция журнала на v2 (как spring-stiffness)
- template: `#record-mode-slot`, `#journal-host`, `#record-pending-slot` +
  `#record-pending-btn` + summary; легаси `record-form` и статическую таблицу — убрать
  (оставить скрытый v1-fallback `journal-table` для совместимости рендера).
- orchestrator: `#journalDrafts`/`#journalVerdicts`/`#lastRecordedSignature`,
  `#currentSpec()` (A/C/D→FRICTION_SPEC, B→FRICTION_WORK_SPEC),
  `renderJournalTable` + `verifyRow` + `renderRecordModeToggle` + `getRecordMode`.
- 3 режима: semi-auto (default) / fully-manual / fully-auto. Reset чистит drafts+verdicts+signature.

## Definition of Done
1. Task B: запись заполняет `distanceMm` + `work`; A/C/D — `null` (не регресс).
2. Журнал в Task B = колонки №/Поверхность/F_тр/s/A; A derived проверяется ✓ ±tolerance.
3. Путь `s` виден на сцене.
4. Журналы A/C/D не сломаны; 162 существующих теста зелёные.
5. Тесты: unit (work + сборка measurement) · state-machine (SPEC-switch, B vs A/C/D) ·
   e2e Task B happy-path (реальная mouse-тяга → скольжение → запись → проверка A) · visual baseline.
6. typecheck 0, lint 0; self-check в браузере на :5181 со скрином.

## Файлы
- `_shared-spa/src/lib/journal/specs.ts` — +FRICTION_WORK_SPEC, +ALL_SPECS.
- `kit-2-forces/src/screens/friction/FrictionExperiment.ts` — v2-журнал, capture, SPEC-switch.
- `kit-2-forces/src/screens/friction/template.html` — v2-слоты.
- `kit-2-forces/src/ui/components/lab-friction-track.ts` — линейка пути (если нет).
- `kit-2-forces/src/screens/friction/FrictionScreen.ts` — новые refs.
- тесты: `physics/friction/__tests__/`, `screens/friction/__tests__/`, `e2e/`.
- доки: REFERENCE §30, KNOWN_ISSUES, `home/src/data/kits.ts`.
