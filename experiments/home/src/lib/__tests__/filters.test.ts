import { describe, it, expect } from 'vitest';
import { visibleKitNums } from '../filters';
import { KITS } from '../../data/kits';

describe('visibleKitNums', () => {
  it('all + не-readyOnly = все 7', () => {
    expect(visibleKitNums(KITS, { category: 'all', readyOnly: false }).length).toBe(7);
  });
  it('readyOnly оставляет только ready (киты 1,2,3)', () => {
    expect(visibleKitNums(KITS, { category: 'all', readyOnly: true }).sort()).toEqual([1,2,3]);
  });
  it('category=optics оставляет кит 4', () => {
    expect(visibleKitNums(KITS, { category: 'optics', readyOnly: false })).toEqual([4]);
  });
});
