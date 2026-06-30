/**
 * IScreen для kit-4-optics — тонкий шим над @shared/shell/IScreen.
 *
 * Локально определяем кит-специфичные union'ы ScreenId/IconId, реализация
 * IScreen/ScreenMeta — generic из shared. Существующие импорты в kit-4
 * (`@shell/IScreen`) продолжают работать без изменений.
 */

import type {
  IScreen as SharedIScreen,
  ScreenMeta as SharedScreenMeta,
} from '@shared/shell/IScreen';

export type ScreenId = 'lens-bench';
export type IconId = 'lens' | 'prism';

export type IScreen = SharedIScreen<ScreenId, IconId>;
export type ScreenMeta = SharedScreenMeta<ScreenId, IconId>;
