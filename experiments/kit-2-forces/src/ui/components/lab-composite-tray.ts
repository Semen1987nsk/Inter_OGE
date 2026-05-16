/**
 * <lab-composite-tray> — карточка-«сборочный верстак» для наборного груза.
 *
 * Заменяет 4 отдельные карточки (Штанга / Диск 10г / Диск 20г / Диск 50г) одной
 * композитной карточкой. PhET-канон: «один физический объект = один цифровой».
 *
 * Структура (light-DOM, видна outer-querySelector'у — это важно для DragController):
 *
 *   <lab-composite-tray>
 *     <div class="ct-title">Наборный груз</div>
 *     <div class="ct-hint">Соберите массу из штанги (10 г) и дисков.</div>
 *
 *     <div class="ct-workshop">
 *       <div class="ct-rod-area">
 *         <lab-composite-weight kind="composite" data-eq="composite-load"
 *                              discs="" ...></lab-composite-weight>
 *       </div>
 *       <div class="ct-disc-tray" aria-label="Лоток дисков">
 *         <div class="ct-disc-slot" data-disc-mass="50">
 *           <lab-composite-weight kind="disc" mass="50" data-eq="disc-50"></lab-composite-weight>
 *         </div>
 *         <div class="ct-disc-slot" data-disc-mass="20">
 *           <lab-composite-weight kind="disc" mass="20" data-eq="disc-20"></lab-composite-weight>
 *         </div>
 *         <div class="ct-disc-slot" data-disc-mass="10">
 *           <lab-composite-weight kind="disc" mass="10" data-eq="disc-10"></lab-composite-weight>
 *         </div>
 *       </div>
 *     </div>
 *
 *     <div class="ct-mass" role="status" aria-live="polite">
 *       <span class="ct-mass-label">Масса узла:</span>
 *       <span class="ct-mass-value">10 г</span>
 *     </div>
 *     <div class="ct-status">В комплекте</div>
 *   </lab-composite-tray>
 *
 * Публичный API (для SpringExperiment):
 *   - getCompositeEl(): HTMLElement — composite-weight для drag'а как единый узел.
 *   - getDiscEls(): HTMLElement[] — массив disc-weight для drag'а в composite.
 *   - getCompositeRect(): DOMRect — для snap-зоны «надеть диск на штангу».
 *   - addDisc(mass, sourceElement?): void — программно надеть диск; при drag'е вернуть
 *     исходный DOM-элемент в скрытый used-slot.
 *   - removeDisc(mass): void — программно снять диск.
 *   - reset(): void — вернуть в исходное состояние (узел в карточке, диски в лотке).
 *   - setStatus('available' | 'in-use'): void — узел на установке → tray скрывает composite.
 *
 * События (bubbled):
 *   - 'composite:disc-toggled' { detail: { mass, action: 'added'|'removed', total } }
 *
 * Спека: .business/спеки/2026-05-14-наборный-груз-сборочный-верстак.md
 */

import type { LabCompositeWeight } from './lab-composite-weight';

const ALLOWED_DISCS = [50, 20, 10] as const;

export class LabCompositeTray extends HTMLElement {
  #composite: LabCompositeWeight | null = null;
  #discEls = new Map<number, HTMLElement>();
  #statusEl: HTMLElement | null = null;
  #status: 'available' | 'in-use' = 'available';

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
    this.setAttribute('aria-label', 'Сборочный верстак наборного груза');
    if (this.children.length === 0) this.#renderShell();
    this.#bindDiscClicks();
  }

  #renderShell(): void {
    this.innerHTML = `
      <div class="ct-title">Наборный груз</div>
      <div class="ct-hint">Перетащите диски на штангу. Массу узла взвесите на динамометре.</div>
      <div class="ct-workshop">
        <div class="ct-rod-area">
          <lab-composite-weight kind="composite" data-eq="composite-load" discs=""></lab-composite-weight>
        </div>
        <div class="ct-disc-tray" aria-label="Лоток дисков">
          ${ALLOWED_DISCS.map(
            (m) => `
            <div class="ct-disc-slot" data-disc-mass="${m}" data-state="available">
              <lab-composite-weight kind="disc" mass="${m}" data-eq="disc-${m}"></lab-composite-weight>
              <span class="ct-disc-slot-placeholder" aria-hidden="true">Надет</span>
            </div>`,
          ).join('')}
        </div>
      </div>
      <div class="ct-status" role="status" aria-live="polite">В комплекте</div>
    `;

    this.#composite = this.querySelector<LabCompositeWeight>(
      'lab-composite-weight[kind="composite"]',
    );
    this.#statusEl = this.querySelector('.ct-status');

    for (const m of ALLOWED_DISCS) {
      const el = this.querySelector<HTMLElement>(
        `lab-composite-weight[kind="disc"][mass="${m}"]`,
      );
      if (el) this.#discEls.set(m, el);
    }
  }

  /** Биндинг кликов и клавиатуры на disc-слоты. */
  #bindDiscClicks(): void {
    for (const [mass, slot] of this.#discEls) {
      const wrapper = slot.parentElement;
      if (!wrapper) continue;
      // Делаем slot-обёртку фокусируемой когда disc в «used»-состоянии
      // (диск отрисован как placeholder «Надет», клик/Enter → снять).
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'button');
      wrapper.setAttribute(
        'aria-label',
        `Слот диска ${mass} г. Enter — переключить.`,
      );

      // Click работает только в used-режиме (для available — drag через DragController).
      wrapper.addEventListener('click', (ev) => {
        const target = ev.target as HTMLElement;
        // Игнорируем клики на самом диске (drag-источник): если диск виден
        // и кликнули по нему — пользователь хотел drag-start, не toggle.
        if (target.closest('lab-composite-weight') && wrapper.dataset['state'] !== 'used') {
          return;
        }
        if (wrapper.dataset['state'] === 'used') {
          this.removeDisc(mass);
        }
      });

      wrapper.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        if (this.#status === 'in-use') return;
        ev.preventDefault();
        if (this.hasDisc(mass)) this.removeDisc(mass);
        else this.addDisc(mass);
      });
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────

  getCompositeEl(): HTMLElement | null {
    return this.#composite;
  }

  getDiscEls(): HTMLElement[] {
    return Array.from(this.#discEls.values());
  }

  getCompositeRect(): DOMRect | null {
    return this.#composite?.getBoundingClientRect() ?? null;
  }

  getMass(): number {
    return this.#composite?.getMass() ?? 10;
  }

  hasDisc(mass: number): boolean {
    return this.#composite?.discs.includes(mass) ?? false;
  }

  addDisc(mass: number, sourceElement?: HTMLElement): boolean {
    if (!this.#composite) return false;
    if (this.hasDisc(mass)) return false;
    const next = [...this.#composite.discs, mass];
    this.#composite.setDiscs(next);
    this.#markSlotState(mass, 'used');
    if (sourceElement) this.#parkDiscElement(mass, sourceElement);
    this.dispatchEvent(
      new CustomEvent('composite:disc-toggled', {
        bubbles: true,
        composed: true,
        detail: { mass, action: 'added', total: this.#composite.getMass() },
      }),
    );
    return true;
  }

  removeDisc(mass: number): boolean {
    if (!this.#composite) return false;
    if (!this.hasDisc(mass)) return false;
    const next = this.#composite.discs.filter((m) => m !== mass);
    this.#composite.setDiscs(next);
    this.#markSlotState(mass, 'available');
    this.dispatchEvent(
      new CustomEvent('composite:disc-toggled', {
        bubbles: true,
        composed: true,
        detail: { mass, action: 'removed', total: this.#composite.getMass() },
      }),
    );
    return true;
  }

  /** Сбросить узел: вернуть в карточку, разобрать диски. */
  reset(): void {
    if (!this.#composite) return;
    this.#composite.setDiscs([]);
    for (const m of ALLOWED_DISCS) this.#markSlotState(m, 'available');
    this.setStatus('available');
  }

  setStatus(status: 'available' | 'in-use'): void {
    this.#status = status;
    this.dataset['status'] = status;
    if (this.#statusEl) {
      this.#statusEl.textContent = status === 'in-use' ? 'На установке' : 'В комплекте';
    }
  }

  // ─── Internals ───────────────────────────────────────────────────────

  #markSlotState(mass: number, state: 'available' | 'used'): void {
    const slot = this.querySelector<HTMLElement>(`.ct-disc-slot[data-disc-mass="${mass}"]`);
    if (slot) slot.dataset['state'] = state;
  }

  #parkDiscElement(mass: number, element: HTMLElement): void {
    const slot = this.querySelector<HTMLElement>(`.ct-disc-slot[data-disc-mass="${mass}"]`);
    if (!slot) return;

    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.zIndex = '';
    element.style.transform = '';
    element.style.marginTop = '';
    element.removeAttribute('dragging');
    element.removeAttribute('attached');
    element.removeAttribute('data-slot-target');

    const placeholder = slot.querySelector('.ct-disc-slot-placeholder');
    slot.insertBefore(element, placeholder);
  }
}

customElements.define('lab-composite-tray', LabCompositeTray);
