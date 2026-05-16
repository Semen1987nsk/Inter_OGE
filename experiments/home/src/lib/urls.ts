/**
 * urls.ts — env-aware URL-резолвер для cross-app навигации.
 *
 * В dev-режиме home-страница и kit-приложения работают на разных Vite-серверах:
 *   - home: localhost:5181 (этот проект)
 *   - kit-2-forces: localhost:5173 (соседний Vite-проект)
 *
 * В prod-сборке оба приложения деплоятся в смежные папки:
 *   experiments/home/ + experiments/kit-2-forces/ → ссылка `../kit-2-forces/`.
 *
 * Используется в hero-CTA и kit-card[ready] для корректной навигации в обоих режимах.
 */

const KIT_DEV_PORTS: Readonly<Record<string, string>> = {
  'kit-2-forces': '5173',
  'kit-1-hydrostatics': '5174',
};

export function kitUrl(slug: string, params: Record<string, string> = {}): string {
  const isDev = import.meta.env.DEV;
  const devPort = KIT_DEV_PORTS[slug];
  const base = isDev && devPort ? `http://localhost:${devPort}/` : `../${slug}/`;
  const qs = new URLSearchParams(params).toString();
  return base + (qs ? `?${qs}` : '');
}

/**
 * Парсит исходный href вида `../kit-2-forces/?role=teacher` и
 * возвращает env-aware версию через kitUrl().
 */
export function rewriteKitHref(href: string): string {
  const match = href.match(/(?:^|\/)([\w-]+)\/?(?:\?(.*))?$/);
  if (!match) return href;
  const slug = match[1]!;
  if (!(slug in KIT_DEV_PORTS)) return href;
  const params: Record<string, string> = {};
  if (match[2]) {
    new URLSearchParams(match[2]).forEach((v, k) => {
      params[k] = v;
    });
  }
  return kitUrl(slug, params);
}
