# _archive — legacy-эпоха (Canvas/vanilla JS)

Этот каталог содержит **отключенный** legacy-код. Перемещён сюда 2026-05-15
для устранения дублей с современным TypeScript-стеком в `experiments/`.

## Содержимое

| Папка/файл | Что | Заменено на |
|---|---|---|
| `legacy-kit2/` | Старая Canvas-реализация Кит-2 (spring+friction), 936K, 16k строк JS | `experiments/kit-2-forces/` (TS + Web Components) |
| `legacy-shared/` | Старая shared-инфраструктура (a11y.js, physics-engine.js, particle-effects.js …) | `experiments/_shared-spa/src/` |
| `legacy-styles/` | `experiment-common.css` старой эпохи | TS-токены в каждом активном пакете |
| `legacy-vendor/` | anime.min.js / chart.umd.js / interact.min.js — runtime для Canvas | Vite-импорты в TS-пакетах |
| `electron-app/` | Старая Electron-обёртка над Canvas-кодом, 3.4M | Современная сборка через `launcher/` (по плану v0.3) |
| `electricity.js`, `mechanics.js`, `mechanics-kit2.js`, `optics.js`, `thermal.js` | Старые physics-движки в корне experiments/ | per-experiment физика в TS (`src/physics/`) |
| `EXPERIMENT_1_COMPLETE.md` | Статус-документ старой эпохи | `experiments/2-1-spring/REFERENCE.md` |

## Когда удалять полностью

Можно безопасно удалить через `git rm -r _archive/` если:

- Все активные опыты в `experiments/{kit-2-forces, kit-1-hydrostatics, 2-1-spring,
  2-2-friction, home}/` собираются и проходят тесты (проверено 2026-05-15).
- В git-истории сохранены commit'ы archive-move (rename detection работает).
- Никто из команды не нуждается в legacy-референсе.

Рекомендация: держать ≥ 1 квартала, потом `git rm -r _archive/`.

## Что НЕ архивировано

Эти папки остались в корне как активные:

- `experiments/{kit-2-forces, kit-1-hydrostatics, 2-1-spring, 2-2-friction, home, _shared-spa, chemistry}/` — текущий код
- `launcher/` — прототип main-страницы для v0.3 Electron NSIS
- `tests/`, `docs/`, `assets/`, `utils/` — корневая инфраструктура

## Проверка изоляции

При архивировании проверено grep'ом — ни один файл в активных пакетах не
импортирует из `_archive/`. Дату проверки см. git log этого README.
