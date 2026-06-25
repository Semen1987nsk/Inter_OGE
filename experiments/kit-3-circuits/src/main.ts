/**
 * main.ts — точка входа SPA «Комплект №3 — Электрические цепи».
 *
 * Архитектура (PhET-style):
 *   index.html       → header (lab-kit-header) + main (#screen-content) + bottom nav (lab-kit-nav)
 *   KitShell         → реестр экранов, mount/unmount, persist в localStorage
 *   Router           → ?screen=<id> в URL, popstate-listener
 *   MeasurementsScreen → IScreen (Опыт 3.1 — stub в Task 1, реальный в Task 6)
 *
 * URL контракт:
 *   /                → редиректит на ?screen=measurements (default)
 *   /?screen=measurements
 *   /?screen=iv-curve
 *   /?screen=wire-resistance
 *   /?screen=connections
 *
 * State:
 *   localStorage['kit-3-circuits:screen:<id>'] — snapshot экрана между сессиями.
 */

import './styles/tokens.css';
import './styles/reset.css';
import './styles/components.css';
import './styles/kit-shell.css';
import './styles/circuit-experiment.css';
// §21 — shared journal v2 styles (.lab-journal-table, .j-verdict--*, .record-pending-btn).
import '@labosfera/shared-spa/lib/journal/journal.css';

// Shell components
import './ui/components/lab-kit-nav';
import './ui/components/lab-kit-header';
import './ui/components/lab-equipment-card';
import './ui/components/lab-graph';

// Circuit instrument components (lab-* custom elements for опыт 3.1)
import './ui/components/lab-power-source';
import './ui/components/lab-voltmeter';
import './ui/components/lab-ammeter';
import './ui/components/lab-resistor';
import './ui/components/lab-key';
import './ui/components/lab-circuit-board';

import { KitShell } from '@shell/KitShell';
import type { IScreen, ScreenId } from '@shell/IScreen';
import type { LabKitNav } from './ui/components/lab-kit-nav';
import type { LabKitHeader } from './ui/components/lab-kit-header';
import { MeasurementsScreen } from '@screens/measurements/MeasurementsScreen';
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
  const roleSpan = document.createElement('span');
  roleSpan.textContent = activeRole === 'teacher' ? 'Учитель' : 'Ученик';
  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'role-badge-arrow';
  arrowSpan.setAttribute('aria-hidden', 'true');
  arrowSpan.textContent = '↗';
  badge.appendChild(roleSpan);
  badge.appendChild(arrowSpan);
  document.body.appendChild(badge);
}

const host = document.getElementById('screen-content')!;
const navBar = document.getElementById('kit-nav') as LabKitNav;
const header = document.getElementById('kit-header') as LabKitHeader;

const screens: IScreen[] = [
  new MeasurementsScreen(),
];

navBar.setScreens(screens.map((s) => s.meta));

const shell = new KitShell(host, screens, 'measurements');

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
  window.location.href = homeUrl();
});

shell.start();

// Дебаг-доступ для тестов
(window as unknown as { kitShell?: KitShell }).kitShell = shell;
