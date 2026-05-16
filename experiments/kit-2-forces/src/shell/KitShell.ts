/**
 * KitShell для kit-2-forces — тонкая обёртка над @shared/shell/KitShell.
 *
 * Захардкожен storagePrefix `kit-2-forces:screen` (бинарно совместимо со старым кодом
 * и существующими persisted-сессиями в localStorage). Generic-реализация — в shared.
 *
 * Сигнатура конструктора и поведение идентичны старому KitShell — никаких изменений
 * в main.ts и тестах не требуется.
 */

import { KitShell as SharedKitShell } from '@shared/shell/KitShell';
import type { IScreen as SharedIScreen } from '@shared/shell/IScreen';
import type { IconId, IScreen, ScreenId } from './IScreen';

const STORAGE_PREFIX = 'kit-2-forces:screen';

export class KitShell extends SharedKitShell<ScreenId> {
  constructor(
    host: HTMLElement,
    screens: ReadonlyArray<IScreen>,
    defaultId: ScreenId,
  ) {
    super(host, screens as ReadonlyArray<SharedIScreen<ScreenId, IconId>>, defaultId, STORAGE_PREFIX);
  }
}
