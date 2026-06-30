/**
 * KitShell для kit-4-optics — тонкая обёртка над @shared/shell/KitShell.
 *
 * Захардкожен storagePrefix `kit-4-optics:screen`. Generic-реализация — в shared.
 */

import { KitShell as SharedKitShell } from '@shared/shell/KitShell';
import type { IScreen as SharedIScreen } from '@shared/shell/IScreen';
import type { IconId, IScreen, ScreenId } from './IScreen';

const STORAGE_PREFIX = 'kit-4-optics:screen';

export class KitShell extends SharedKitShell<ScreenId> {
  constructor(
    host: HTMLElement,
    screens: ReadonlyArray<IScreen>,
    defaultId: ScreenId,
  ) {
    super(host, screens as ReadonlyArray<SharedIScreen<ScreenId, IconId>>, defaultId, STORAGE_PREFIX);
  }
}
