# Inter_OGE — виртуальная лаборатория ЛАБОСФЕРА

Цифровой двойник реального лабораторного оборудования **Labosfera**
([labosfera.ru](https://www.labosfera.ru)) для подготовки к ОГЭ-2026 по физике
по спецификации ФИПИ.

> **Стек.** TypeScript 5.6 strict + Vite 6 + vanilla Web Components.
> Никаких React/Vue. Каждый комплект — независимый SPA в
> `experiments/<id>/`. Общая инфраструктура (журнал, drag-controller,
> record-mode toggle) — в `experiments/_shared-spa/`.
>
> **Распространение.** Веб (Vite-сборка), Electron NSIS для Windows,
> .deb для Astra Linux (план v0.3, см. `launcher/`).

---

## Структура монорепо

```
inter_oge/
├── experiments/
│   ├── _shared-spa/          # общая библиотека: журнал v2, DragController, KitShell
│   ├── home/                 # каталог-главная (hero + bento-grid 7 комплектов)
│   ├── kit-1-hydrostatics/   # Комплект №1 — Плотность + Архимед (2/5 опытов готовы)
│   ├── kit-2-forces/         # Комплект №2 — Силы и движение (4/4 опытов готовы) — flagship
│   ├── 2-1-spring/           # Legacy standalone «Жёсткость пружины» (эталонный канон, REFERENCE.md)
│   ├── 2-2-friction/         # Legacy standalone «Трение»
│   └── chemistry/            # Гибридный модуль виртуальной химии (отдельный workflow)
├── launcher/                  # Прототип main для Electron v0.3 (postcards-стена)
├── _archive/                  # Legacy Canvas-эпоха (FIPI-2025), сохранено с git-историей
├── .business/                 # Бизнес-документы компании (не код)
└── docs/                      # Документация (architectural decisions, design system)
```

Каждый активный пакет — `npm workspace`. Root-команды проходят по всем
пакетам сразу.

---

## Быстрый старт

```bash
# Установить зависимости всех пакетов (workspace)
npm install

# Запустить главную (home — каталог комплектов)
npm run dev:home          # http://localhost:5181

# Запустить конкретный кит
npm run dev:kit-2         # Комплект №2 «Силы» (flagship)
npm run dev:kit-1         # Комплект №1 «Гидростатика»
npm run dev:spring        # Legacy «Жёсткость пружины»
npm run dev:friction      # Legacy «Трение»
```

---

## Workspace-команды (из корня)

| Команда | Что делает |
|---|---|
| `npm run build` | Собирает все 5 SPA в `dist/` каждого пакета |
| `npm run typecheck` | `tsc -b --noEmit` во всех пакетах |
| `npm run test` | Vitest по всем пакетам — ≈1240 unit-тестов |
| `npm run test:e2e` | Playwright e2e (kit-2 + legacy 2-1/2-2) |
| `npm run lint` | ESLint flat config v9, shared base из `_shared-spa/eslint.config.shared.js` |
| `npm run lint:fix` | Авто-fix линт-проблем |
| `npm run format` | Prettier write для всех пакетов |

---

## Эталоны и канон

Перед нетривиальной правкой читай **дословно**:

| Документ | Что |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Главный фронтис: правила работы, чек-лист готовности, как добавить опыт |
| [`experiments/2-1-spring/REFERENCE.md`](experiments/2-1-spring/REFERENCE.md) | Канонический справочник: §1 архитектура, §16 SPA-комплект, §18 дизайн-система, §20 record-mode, §21 unified journal v2 |
| [`experiments/README.md`](experiments/README.md) | Индекс опытов с маппингом ФИПИ-2026 |

---

## Главные принципы

1. **Полная имитация реального мира.** Любой предмет на сцене — физический
   объект. Можно взять с любой точки и положить в любую другую валидную.
   Reversibly, без блокировок «только через крестик». Drag — главный жест.

2. **Единый стиль и функционал.** Один layout сцены (workbench + equipment
   panel + measurement panel), идентичные подсказки, идентичный drag&drop UX,
   общий журнал измерений (§21 — `renderJournalTable` + SPEC + record-mode
   toggle), общая reset-кнопка.

3. **Тестирование 4 уровня + visual.**
   - Unit (Vitest) — физика, форматирование
   - Property-based (fast-check) — фаззинг инвариантов
   - State-machine (DOM) — циклы mount/unmount, регрессии
   - Comprehensive — большие смоки на цепочки действий
   - Visual (Playwright) — multi-state скрины + REST-state assertion

---

## Каталог комплектов

| # | Комплект | Статус | Опыты | Папка |
|---|---|---|---|---|
| 1 | Гидростатика (плотность, Архимед) | 2/5 готовы | 1.1, 1.2 → ✅; 1.3–1.5 → planned | `experiments/kit-1-hydrostatics/` |
| 2 | Силы и движение | 4/4 готовы (flagship) | 2.1, 2.2, 2.4, 2.6 | `experiments/kit-2-forces/` |
| 3 | Электрические цепи | planned (2026 Q4) | 3.1–3.9 (9 опытов) | — |
| 4 | Оптика | planned (2027 Q1) | 4.1–4.6 (6 опытов) | — |
| 5 | Колебания и волны | planned (2027 Q2) | 5.1–5.4 (4 опыта) | — |
| 6 | Рычаги и блоки | planned (2027 Q2) | 6.1–6.4 (4 опыта) | — |
| 7 | Тепловые явления | planned (2027 Q3) | 7.1–7.3 (3 опыта) | — |

**Источник истины** для маркетинговых чисел — [`experiments/home/src/data/kits.ts`](experiments/home/src/data/kits.ts).
Hero на главной получает количество комплектов и опытов через
`totalExperiments(KITS)` — никаких hardcoded цифр в HTML.

---

## Партнёрство с Labosfera

[Labosfera](https://www.labosfera.ru) — производитель цифрового лабораторного
оборудования для школ России. Это виртуальное приложение — цифровой двойник
их реального оборудования для дистанционной подготовки к ОГЭ.

---

## Лицензия

UNLICENSED. Все права принадлежат ООО ЛАБОСФЕРА.
