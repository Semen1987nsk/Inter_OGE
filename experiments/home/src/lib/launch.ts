/**
 * launch.ts — диспетчер URL запуска опыта.
 *
 * Строит relative URL для перехода в нужный экран kit-SPA.
 * Web: `${kit.path}?screen=${slug}&role=${role}`
 *
 * Electron (Фаза 2): будет использовать протокол labosfera-app:// или
 * file:// с абсолютным путём к скомпилированному kit-dist. Пока не реализован.
 */

import type { Kit } from '../data/kits';

export type Role = 'student' | 'teacher';

/**
 * Маппинг experimentId → screen-slug для реализованных kit'ов.
 *
 * Для planned kit'ов (3–7) маппинг отсутствует — экраны ещё не существуют.
 * В этом случае `experimentUrl` возвращает `kit.path?role=${role}` без `screen=`.
 */
const SCREEN_SLUGS: Readonly<Record<string, string>> = {
  // kit-2 — Силы и движение
  '2.1': 'spring-stiffness',
  '2.6': 'spring-elastic',
  '2.4': 'spring-work',
  '2.2': 'friction',

  // kit-1 — Гидростатика
  '1.1': 'density-solid',
  '1.2': 'archimedes',
  '1.3': 'archimedes-volume',
  '1.4': 'archimedes',
  // 1.5 не реализован — fallback к kit root
};

/**
 * Возвращает URL запуска опыта для web-окружения.
 *
 * Если `experimentId` не имеет маппинга (неизвестный id или planned kit),
 * возвращает `kit.path?role=${role}` — переход на корень kit-SPA.
 */
export function experimentUrl(kit: Kit, experimentId: string, role: Role): string {
  const slug = SCREEN_SLUGS[experimentId];
  if (slug) {
    return `${kit.path}?screen=${slug}&role=${role}`;
  }
  // Нет маппинга: planned kit или нереализованный опыт → root kit-page
  return `${kit.path}?role=${role}`;
}
