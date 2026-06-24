/**
 * IScreen для kit-1-hydrostatics — шим над @shared/shell/IScreen.
 *
 * Локальные union'ы ScreenId/IconId — кит-специфика; реализация — generic из shared.
 *
 * 5 опытов комплекта №1 по ФИПИ-2026 (СПЕЦ Прил. 2, стр. 16, см. REFERENCE §30):
 *   1.1 — Плотность вещества (density-solid) ✓ готов
 *   1.2 — Архимедова сила в воде (archimedes) ✓ готов (только вода)
 *   1.3 — F_А от объёма погружения (archimedes-volume) ← добавлен 2026-05-16
 *   1.4 — F_А от плотности жидкости (archimedes-density) — TBD
 *   1.5 — Независимость F_А от массы (archimedes-mass) — TBD
 *
 * Имена `density-liquid` / `floating` / `hydrometer` оставлены в union только
 * для обратной совместимости с черновыми планами 2026-05; этих опытов в
 * ФИПИ-2026 для Комплекта №1 НЕТ (см. REFERENCE §30 разбор расхождений с
 * методичкой). Будут вычищены отдельным проходом.
 */

import type {
  IScreen as SharedIScreen,
  ScreenMeta as SharedScreenMeta,
} from '@shared/shell/IScreen';

export type ScreenId =
  | 'density-solid'      // 1.1 ✓
  | 'archimedes'         // 1.2 ✓
  | 'archimedes-volume'  // 1.3 ← новый
  | 'archimedes-density' // 1.4 TBD
  | 'archimedes-mass'    // 1.5 TBD (legacy alias)
  | 'independence-mass'  // 1.5 ✓ — независимость F_А от массы
  // Legacy/черновое (НЕ по ФИПИ-2026 для Комплекта №1):
  | 'density-liquid'
  | 'floating'
  | 'hydrometer';

export type IconId =
  | 'density'      // плотность твёрдого тела (1.1)
  | 'archimedes'   // архимедова сила и зависимости (1.2 / 1.3 / 1.4 / 1.5)
  // Legacy:
  | 'liquid'
  | 'float'
  | 'hydrometer';

export type IScreen = SharedIScreen<ScreenId, IconId>;
export type ScreenMeta = SharedScreenMeta<ScreenId, IconId>;
