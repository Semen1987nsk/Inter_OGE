/**
 * urls.ts — env-aware URL для возврата на каталог-главную.
 *
 * Dev: home-страница работает на отдельном Vite-сервере (порт 5181).
 * Prod-сборка: оба приложения деплоятся в смежные папки → `../home/`.
 */

const HOME_DEV_PORT = '5181';

export function homeUrl(): string {
  return import.meta.env.DEV ? `http://localhost:${HOME_DEV_PORT}/` : '../home/';
}

export type Role = 'teacher' | 'student';

export function readRoleFromUrl(): Role | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('role');
  return raw === 'teacher' || raw === 'student' ? raw : null;
}

const STORAGE_KEY = 'kit-2-forces:role';

export function persistRole(role: Role): void {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
    /* private mode / quota — игнорируем */
  }
}

export function readPersistedRole(): Role | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'teacher' || raw === 'student' ? raw : null;
  } catch {
    return null;
  }
}
