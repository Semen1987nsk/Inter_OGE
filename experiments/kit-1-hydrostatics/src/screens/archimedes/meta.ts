/**
 * Meta-описание опыта 1.2 «Архимедова сила». Выделено отдельным модулем,
 * чтобы main.ts мог импортировать только метаданные без подтягивания
 * оркестратора и тяжёлых компонентов (для lazy-mount в будущем).
 */

import type { ScreenMeta } from '../../shell/IScreen';

export const archimedesMeta: ScreenMeta = {
  id: 'archimedes',
  label: 'Архимедова сила',
  kicker: 'Опыт 1.2',
  icon: 'archimedes',
  tooltip:
    'Измерение архимедовой силы по разности веса цилиндра в воздухе и в воде',
};
