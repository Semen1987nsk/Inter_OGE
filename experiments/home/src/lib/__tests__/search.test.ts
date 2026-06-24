import { describe, it, expect } from 'vitest';
import { searchExperiments } from '../search';
import { KITS } from '../../data/kits';

describe('searchExperiments', () => {
  it('находит «пружин» в опыте 2.1', () => {
    const hits = searchExperiments(KITS, 'пружин');
    expect(hits.some(h => h.experimentId === '2.1')).toBe(true);
  });
  it('пустой запрос → []', () => {
    expect(searchExperiments(KITS, '   ')).toEqual([]);
  });
  it('находит по id «1.2»', () => {
    expect(searchExperiments(KITS, '1.2').some(h => h.experimentId === '1.2')).toBe(true);
  });
});
