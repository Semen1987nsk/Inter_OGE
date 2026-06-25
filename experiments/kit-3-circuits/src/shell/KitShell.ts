/**
 * KitShell для kit-3-circuits — тонкая обёртка над @shared/shell/KitShell.
 *
 * Захардкожен storagePrefix `kit-3-circuits:screen`. Generic-реализация — в shared.
 *
 * Сигнатура конструктора и поведение идентичны kit-2 KitShell — никаких изменений
 * в main.ts и тестах не требуется.
 */

import { KitShell as SharedKitShell } from '@shared/shell/KitShell';
import type { IScreen as SharedIScreen } from '@shared/shell/IScreen';
import type { IconId, IScreen, ScreenId } from './IScreen';

const STORAGE_PREFIX = 'kit-3-circuits:screen';

export class KitShell extends SharedKitShell<ScreenId> {
  constructor(
    host: HTMLElement,
    screens: ReadonlyArray<IScreen>,
    defaultId: ScreenId,
  ) {
    super(host, screens as ReadonlyArray<SharedIScreen<ScreenId, IconId>>, defaultId, STORAGE_PREFIX);
  }
}
