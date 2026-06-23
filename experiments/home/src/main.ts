/**
 * main.ts — точка входа лаунчера ЛАБОСФЕРА (Виртуальная лаборатория ОГЭ).
 *
 * v0.3 «постер-стена» — стартер.
 * Реализация PosterWallSection / AppShellSection и Web Components
 * <kit-poster>, <kit-drawer>, <role-switch>, <progress-ring> — в E1.
 *
 * Канон концепции: ~/.claude/plans/floating-sparking-lecun.md §2.
 * Прототип-эталон: ../../../launcher/mockup.{html,css,js}.
 * Источник данных: ./data/kits.ts (актуальный на 2026-05-15).
 */

import './styles/fonts.css';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/home.css';

import { KITS, totalExperiments } from './data/kits';

// ─── Stub: показываем счётчик прогресса, пока постер-стена в разработке ──
{
  const totals = totalExperiments(KITS);
  const slot = document.querySelector<HTMLElement>('[data-progress-slot]');
  if (slot) {
    slot.textContent = `${totals.done} / ${totals.total} опытов готово · ${KITS.length} комплектов`;
  }
}

// ─── Подсказка в консоли для разработчиков ─────────────────────────────
// eslint-disable-next-line no-console
console.info(
  '%cЛАБОСФЕРА %cлаунчер v0.3 · stub (постер-стена в работе)',
  'background:#ffbe0b;color:#06101e;font-weight:bold;padding:4px 8px;border-radius:4px',
  'color:#14b8a6;font-weight:600;padding:0 8px',
);
