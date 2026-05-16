/**
 * IScreen для kit-1-hydrostatics — шим над @shared/shell/IScreen.
 *
 * Локальные union'ы ScreenId/IconId — кит-специфика; реализация — generic из shared.
 */

import type {
  IScreen as SharedIScreen,
  ScreenMeta as SharedScreenMeta,
} from '@shared/shell/IScreen';

export type ScreenId =
  | 'density-solid'
  | 'density-liquid'
  | 'archimedes'
  | 'floating'
  | 'hydrometer';

export type IconId =
  | 'density'      // плотность твёрдого тела (1.1)
  | 'liquid'       // плотность жидкости (1.2)
  | 'archimedes'   // архимедова сила (1.3 + 1.4)
  | 'float'        // плавание тел
  | 'hydrometer';  // ареометр (1.5)

export type IScreen = SharedIScreen<ScreenId, IconId>;
export type ScreenMeta = SharedScreenMeta<ScreenId, IconId>;
