/**
 * main.ts — точка входа SPA «Комплект №2 — Силы».
 *
 * Архитектура (PhET-style):
 *   index.html       → header (lab-kit-header) + main (#screen-content) + bottom nav (lab-kit-nav)
 *   KitShell         → реестр экранов, mount/unmount, persist в localStorage
 *   Router           → ?screen=<id> в URL, popstate-listener
 *   SpringStiffnessScreen / SpringElasticScreen / FrictionScreen → IScreen
 *
 * URL контракт:
 *   /                → редиректит на ?screen=spring-stiffness (default)
 *   /?screen=spring-stiffness
 *   /?screen=spring-elastic
 *   /?screen=friction
 *
 * State:
 *   localStorage['kit-2-forces:screen:<id>'] — snapshot экрана между сессиями.
 */

import './styles/tokens.css';
import './styles/reset.css';
import './styles/components.css';
import './styles/kit-shell.css';
import './styles/spring-experiment.css';
import './styles/elastic-force-experiment.css';
import './styles/friction-experiment.css';
// §21 — shared journal v2 styles (.lab-journal-table, .j-verdict--*, .record-pending-btn).
import '@labosfera/shared-spa/lib/journal/journal.css';

// Web Components — все приборы зарегистрированы один раз
import './ui/components/lab-button';
import './ui/components/lab-checkbox-preview';
import './ui/components/lab-weight';
import './ui/components/lab-graph';
import './ui/components/lab-stand';
import './ui/components/lab-spring-board';
import './ui/components/lab-dynamometer';
import './ui/components/lab-tray';
import './ui/components/lab-equipment-card';
import './ui/components/lab-composite-weight';
import './ui/components/lab-composite-tray';
import './ui/components/lab-block';
import './ui/components/lab-friction-track';
import './ui/components/lab-dynamometer-h';
import './ui/components/lab-flat-weight';

// Shell components
import './ui/components/lab-kit-nav';
import './ui/components/lab-kit-header';

import { KitShell } from '@shell/KitShell';
import type { IScreen, ScreenId } from '@shell/IScreen';
import type { LabKitNav } from './ui/components/lab-kit-nav';
import type { LabKitHeader } from './ui/components/lab-kit-header';
import { SpringStiffnessScreen } from '@screens/spring-stiffness/SpringStiffnessScreen';
import { SpringElasticScreen } from '@screens/spring-elastic/SpringElasticScreen';
import { SpringWorkScreen } from '@screens/spring-work/SpringWorkScreen';
import { FrictionScreen } from '@screens/friction/FrictionScreen';
import { ElasticForceScreen } from '@screens/elastic-force/ElasticForceScreen';
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
  badge.setAttribute('aria-label',
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
  new SpringStiffnessScreen(),
  new SpringElasticScreen(),
  new ElasticForceScreen(),
  new SpringWorkScreen(),
  new FrictionScreen(),
];

navBar.setScreens(screens.map((s) => s.meta));

const shell = new KitShell(host, screens, 'spring-stiffness');

shell.onScreenChanged((id) => {
  navBar.setAttribute('active', id);
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

navBar.addEventListener('home-click', () => {
  // Возврат на каталог комплектов (env-aware: dev:5181 / prod ../home/)
  window.location.href = homeUrl();
});

shell.start();

// Дебаг-доступ для тестов
(window as unknown as { kitShell?: KitShell }).kitShell = shell;
