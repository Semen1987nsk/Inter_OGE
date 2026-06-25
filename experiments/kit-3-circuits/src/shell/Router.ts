/**
 * Router для kit-3-circuits — re-export generic Router из @shared.
 *
 * При необходимости type-safe использования: `new Router<ScreenId>(validIds, onChange)`.
 * Дефолтный TId=string совместим с существующими тестами.
 */

export { Router } from '@shared/shell/Router';
