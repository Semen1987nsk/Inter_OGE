/**
 * role-switch.ts — переключатель «Ученик / Учитель».
 *
 * Attrs:  role (student|teacher) — начальная роль, отражается
 * Events: role-change {bubbles, composed, detail:{role}} — при смене роли
 * Side effect: document.body.dataset.role = 'student'|'teacher'
 * A11y: WAI-ARIA tablist, roving tabindex, ArrowLeft/Right
 */

type Role = 'student' | 'teacher';

const TAG = 'role-switch';

const ROLES: Role[] = ['student', 'teacher'];
const LABELS: Record<Role, string> = {
  student: 'Ученик',
  teacher: 'Учитель',
};

function buildShadow(selected: Role): string {
  const tabs = ROLES.map((r) => {
    const isSelected = r === selected;
    return `
      <button
        role="tab"
        data-role="${r}"
        aria-selected="${isSelected}"
        tabindex="${isSelected ? 0 : -1}"
      >${LABELS[r]}</button>
    `;
  }).join('');

  return `
    <style>
      :host {
        display: inline-flex;
        --_bg: var(--rs-bg, rgba(255,255,255,0.08));
        --_active: var(--rs-active, #ffbe0b);
        --_text: var(--rs-text, #fff);
        --_radius: 999px;
      }

      [role="tablist"] {
        display: inline-flex;
        gap: 2px;
        background: var(--_bg);
        border-radius: var(--_radius);
        padding: 3px;
      }

      button[role="tab"] {
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--_text);
        background: transparent;
        border: none;
        border-radius: calc(var(--_radius) - 2px);
        padding: 6px 16px;
        cursor: pointer;
        transition: background 150ms ease, color 150ms ease;
        white-space: nowrap;
        outline: none;
      }

      button[role="tab"][aria-selected="true"] {
        background: var(--_active);
        color: #06101e;
        font-weight: 700;
      }

      button[role="tab"]:focus-visible {
        outline: 2px solid var(--_active);
        outline-offset: 2px;
      }

      button[role="tab"]:not([aria-selected="true"]):hover {
        background: rgba(255,255,255,0.12);
      }
    </style>
    <div role="tablist" aria-label="Режим работы">
      ${tabs}
    </div>
  `;
}

class RoleSwitch extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['role'];
  }

  private _root: ShadowRoot;
  private _current: Role = 'student';

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    const attr = this.getAttribute('role');
    if (attr === 'teacher') {
      this._current = 'teacher';
    } else {
      this._current = 'student';
    }
    this._render();
    this._bindEvents();
    document.body.dataset['role'] = this._current;
  }

  attributeChangedCallback(_name: string, _old: string | null, next: string | null): void {
    if (!this._root.innerHTML) return;
    const role: Role = next === 'teacher' ? 'teacher' : 'student';
    if (role !== this._current) {
      this._current = role;
      this._updateTabs();
      document.body.dataset['role'] = this._current;
    }
  }

  /** Public getter: текущая роль */
  get role(): Role {
    return this._current;
  }

  private _render(): void {
    this._root.innerHTML = buildShadow(this._current);
    const list = this._root.querySelector('[role="tablist"]')!;
    list.addEventListener('keydown', this._onKeydown);
  }

  private _bindEvents(): void {
    this._root.querySelectorAll('[role="tab"]').forEach((tab) => {
      tab.addEventListener('click', this._onTabClick);
    });
  }

  private _onTabClick = (e: Event): void => {
    const tab = e.currentTarget as HTMLElement;
    const role = tab.dataset['role'] as Role | undefined;
    if (!role || role === this._current) return;
    this._select(role);
  };

  private _onKeydown = (e: Event): void => {
    if (!(e instanceof KeyboardEvent)) return;
    const idx = ROLES.indexOf(this._current);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = ROLES[(idx + 1) % ROLES.length] as Role;
      this._select(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = ROLES[(idx - 1 + ROLES.length) % ROLES.length] as Role;
      this._select(prev);
    } else if (e.key === 'Enter' || e.key === ' ') {
      const focused = this._root.activeElement as HTMLElement | null;
      const role = focused?.dataset['role'] as Role | undefined;
      if (role && role !== this._current) {
        e.preventDefault();
        this._select(role);
      }
    }
  };

  private _select(role: Role): void {
    this._current = role;
    this._updateTabs();
    document.body.dataset['role'] = role;
    this.dispatchEvent(new CustomEvent('role-change', {
      bubbles: true,
      composed: true,
      detail: { role },
    }));
  }

  private _updateTabs(): void {
    this._root.querySelectorAll('[role="tab"]').forEach((tab) => {
      const t = tab as HTMLElement;
      const isSelected = t.dataset['role'] === this._current;
      t.setAttribute('aria-selected', String(isSelected));
      t.setAttribute('tabindex', isSelected ? '0' : '-1');
    });
  }
}

if (!customElements.get(TAG)) {
  customElements.define(TAG, RoleSwitch);
}
