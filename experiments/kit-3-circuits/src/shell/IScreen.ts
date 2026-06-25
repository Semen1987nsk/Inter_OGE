/**
 * IScreen для kit-3-circuits — тонкий шим над @shared/shell/IScreen.
 *
 * Локально определяем кит-специфичные union'ы ScreenId/IconId, реализация
 * IScreen/ScreenMeta — generic из shared. Существующие импорты в kit-3
 * (`@shell/IScreen`) продолжают работать без изменений.
 */

import type {
  IScreen as SharedIScreen,
  ScreenMeta as SharedScreenMeta,
} from '@shared/shell/IScreen';

export type ScreenId = 'measurements' | 'iv-curve' | 'wire-resistance' | 'connections';
export type IconId = 'gauge' | 'iv' | 'wire' | 'link';

export type IScreen = SharedIScreen<ScreenId, IconId>;
export type ScreenMeta = SharedScreenMeta<ScreenId, IconId>;
