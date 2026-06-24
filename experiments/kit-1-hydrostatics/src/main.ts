/**
 * main.ts — точка входа SPA «Комплект №1 — Гидростатика».
 *
 * URL контракт:
 *   /                       → редиректит на ?screen=density-solid (default)
 *   /?screen=density-solid  → опыт 1.1 «Плотность твёрдого тела»
 *   /?screen=archimedes     → опыт 1.2 «Архимедова сила в воде»
 *
 * Опыты Кит-1 «Гидростатика» (ФИПИ ОГЭ-2026, Приложение 2):
 *   1.1 — Плотность вещества (density-solid) ✓ готов
 *   1.2 — Архимедова сила в воде (archimedes) ✓ готов
 *   1.3 — Зависимость F_A от объёма погружённой части (цилиндр №3 со шкалой) — TBD
 *   1.4 — Зависимость F_A от плотности жидкости (соль + раствор) — TBD
 *   1.5 — Независимость F_A от массы тела (цилиндры №1 и №2 равного V) — TBD
 *
 * Опытов «плотность жидкости», «плавание», «ареометр» в ФИПИ-Комплекте-1 НЕТ —
 * соль и палочка в комплекте только для приготовления солёного раствора в 1.4.
 *
 * Экраны регистрируются здесь по мере готовности; для зарегистрированных
 * — таб появляется в `lab-kit-nav` автоматически.
 */

import './styles/tokens.css';
import './styles/reset.css';
import './styles/components.css';
import './styles/kit-shell.css';
import './styles/screen-stub.css';
import './styles/density-experiment.css';
import './styles/archimedes-experiment.css';
import './styles/archimedes-volume-experiment.css';
import '@shared/lib/journal/journal.css';

// Web Components — приборы и шелл
import './ui/components/lab-equipment-card';
import './ui/components/lab-metal-weight';
import './ui/components/lab-balance';
import './ui/components/lab-graduated-cylinder';
import './ui/components/lab-dynamometer';
import './ui/components/lab-beaker';
import './ui/components/lab-thread';
import './ui/components/lab-salt-set';
import './ui/components/lab-graph';
import './ui/components/lab-journal';
import './ui/components/lab-toast';
import './ui/components/lab-kit-nav';
import './ui/components/lab-kit-header';

import { KitShell } from '@shell/KitShell';
import type { IScreen, ScreenId } from '@shell/IScreen';
import type { LabKitNav } from './ui/components/lab-kit-nav';
import type { LabKitHeader } from './ui/components/lab-kit-header';
import { DensitySolidScreen } from '@screens/density-solid/DensitySolidScreen';
import { ArchimedesScreen } from '@screens/archimedes/ArchimedesScreen';
import { ArchimedesVolumeScreen } from '@screens/archimedes-volume/ArchimedesVolumeScreen';
import { homeUrl, readRoleFromUrl, persistRole, readPersistedRole, type Role } from './lib/urls';

// ─── Role: ?role=teacher|student → body[data-role] + role-badge ───
const roleFromUrl = readRoleFromUrl();
if (roleFromUrl) persistRole(roleFromUrl);
const activeRole: Role | null = roleFromUrl ?? readPersistedRole();
if (activeRole) {
  document.body.dataset['role'] = activeRole;
  const badge = document.createElement('a');
  badge.className = 'role-badge';
  badge.href = homeUrl();
  badge.setAttribute(
    'aria-label',
    `Текущая роль: ${activeRole === 'teacher' ? 'Учитель' : 'Ученик'}. Вернуться на каталог`,
  );
  badge.innerHTML = `
    <span>${activeRole === 'teacher' ? 'Учитель' : 'Ученик'}</span>
    <span class="role-badge-arrow" aria-hidden="true">↗</span>
  `;
  document.body.appendChild(badge);
}

const host = document.getElementById('screen-content')!;
const navBar = document.getElementById('kit-nav') as LabKitNav;
const header = document.getElementById('kit-header') as LabKitHeader;

const screens: IScreen[] = [
  new DensitySolidScreen(),
  new ArchimedesScreen(),
  new ArchimedesVolumeScreen(),
];

navBar.setScreens(screens.map((s) => s.meta));
// Прогресс по комплекту: 5 опытов всего, в этап 6a добавлен опыт 1.2 (тоже
// «current»-кандидат). Реальный прогресс = доля done — пока 0.
navBar.setProgress(0);

const shell = new KitShell(host, screens, 'density-solid');

shell.onScreenChanged((id) => {
  navBar.setAttribute('active', id);
  // Active screen → current; остальные зарегистрированные → available.
  // (`done` пока не помечается автоматически — это часть прогресса в 6b.)
  const states: Record<string, 'current' | 'available'> = {};
  for (const s of screens) {
    states[s.meta.id] = s.meta.id === id ? 'current' : 'available';
  }
  navBar.setStates(states);
  const screen = screens.find((s) => s.meta.id === id);
  if (screen) {
    header.setAttribute('experiment-kicker', screen.meta.kicker);
    header.setAttribute('experiment', screen.meta.label);
  }
});

navBar.addEventListener('screen-select', (ev) => {
  const id = (ev as CustomEvent<{ id: ScreenId }>).detail.id;
  shell.navigate(id);
});

// Breadcrumb «← Все комплекты» теперь живёт в шапке (research §2 — не смешивать
// иерархию kit↔experiment в одной навигации).
header.setAttribute('home-href', homeUrl());
header.addEventListener('home-click', () => {
  window.location.href = homeUrl();
});

shell.start();

(window as unknown as { kitShell?: KitShell }).kitShell = shell;
