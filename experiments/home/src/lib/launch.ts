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
 * Возвращает URL запуска опыта для web-окружения.
 *
 * `experimentId` — это уже зарегистрированный screen-slug (см. kits.ts `exp.id`).
 * Для ready kit'ов он передаётся напрямую как `screen=` параметр.
 * Для planned kit'ов экраны ещё не существуют — возвращаем корень kit-SPA.
 */
export function experimentUrl(kit: Kit, experimentId: string, role: Role): string {
  if (kit.status === 'ready' && experimentId) {
    return `${kit.path}?screen=${experimentId}&role=${role}`;
  }
  // planned kit или пустой id → root kit-page без screen=
  return `${kit.path}?role=${role}`;
}
