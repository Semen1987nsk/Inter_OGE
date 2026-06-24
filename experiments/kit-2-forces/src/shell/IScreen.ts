/**
 * IScreen для kit-2-forces — тонкий шим над @shared/shell/IScreen.
 *
 * Локально определяем кит-специфичные union'ы ScreenId/IconId, реализация
 * IScreen/ScreenMeta — generic из shared. Существующие импорты в kit-2
 * (`@shell/IScreen`) продолжают работать без изменений.
 */

import type {
  IScreen as SharedIScreen,
  ScreenMeta as SharedScreenMeta,
} from '@shared/shell/IScreen';

export type ScreenId = 'spring-stiffness' | 'spring-elastic' | 'spring-work' | 'friction' | 'elastic-force';
export type IconId = 'spring' | 'force' | 'work' | 'friction';

export type IScreen = SharedIScreen<ScreenId, IconId>;
export type ScreenMeta = SharedScreenMeta<ScreenId, IconId>;
