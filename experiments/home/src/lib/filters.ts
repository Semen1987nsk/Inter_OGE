import type { Kit, KitCategory } from '../data/kits';

export type FilterState = {
  category: KitCategory | 'all';
  readyOnly: boolean;
};

export function visibleKitNums(kits: ReadonlyArray<Kit>, state: FilterState): number[] {
  return kits
    .filter(kit => {
      // Filter by category
      if (state.category !== 'all' && kit.category !== state.category) {
        return false;
      }
      // Filter by status
      if (state.readyOnly && kit.status !== 'ready') {
        return false;
      }
      return true;
    })
    .map(kit => kit.num);
}
