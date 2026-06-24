/**
 * Meta-описание опыта 1.5 «Независимость выталкивающей силы от массы тела».
 *
 * ФИПИ-2026, Приложение 2, стр. 16, Комплект №1 — см. REFERENCE §30.
 */

import type { ScreenMeta } from '../../shell/IScreen';

export const independenceMassMeta: ScreenMeta = {
  id: 'independence-mass',
  label: 'Независимость F_A от массы',
  kicker: 'Опыт 1.5',
  icon: 'archimedes',
  tooltip:
    'F_арх не зависит от массы тела при равном объёме (цилиндры №1 сталь и №2 алюминий)',
};
