/**
 * DragController — единый pointer-based drag&drop для всех опытов Inter_OGE.
 *
 * См. §20 REFERENCE.md (`experiments/2-1-spring/REFERENCE.md`).
 *
 * Поддерживает:
 *   - Декларативный data-API: `data-draggable="<eqId>"` + `data-dropzone="<csv>"`
 *     (с глобальным `host` listener'ом — удобно для оркестратора, который
 *     не хочет регистрировать каждый прибор вручную).
 *   - Императивный API: `attach(el, opts)` + `addSnapZone(zone)` (для зон с
 *     динамической геометрией: крюк динамометра, штативная snap-зона).
 *   - Free re-drag: блок `attached=""` НЕ применяется. Если оркестратор хочет
 *     программно «приколоть» прибор на время анимации — ставит `data-pin="true"`,
 *     контроллер этот атрибут уважает.
 *   - Ghost-clone режим (`{ ghost: true }` в attach или
 *     `data-drag-ghost="true"` на источнике) — для случаев, когда источник —
 *     это карточка-палитра, а на сцене должен появиться **другой** экземпляр
 *     (kit-1 density-solid pattern). Без флага — single-instance: сам элемент
 *     переезжает в overlay.
 *   - Bounce-back через WAAPI (320ms cubic-bezier(0.34, 1.4, 0.64, 1)).
 *   - Keyboard fallback: Enter/Space → первая совместимая snap-зона.
 *   - prefers-reduced-motion: возврат без анимации.
 *
 * Контракт snap-зоны:
 *   - `accepts: string[]` — список eqId или префиксов с `*` (`cyl-*`).
 *   - `getRect(): DOMRect` — viewport-координаты (читается на каждый
 *     pointermove; зона может «дышать»).
 *   - `snapRadius?: number` — px от центра зоны для активации (default 80).
 *   - `onHover?(active)` — подсветка зоны при approach.
 *   - `onDrop(payload): boolean` — true → принято, false → bounce-back.
 *
 * @see experiments/2-1-spring/REFERENCE.md §20
 */

export interface DragPayload {
  readonly element: HTMLElement;
  readonly equipmentId: string;
  readonly kind: string;
  readonly pointerX: number;
  readonly pointerY: number;
}

export interface SnapZone {
  /** Уникальный идентификатор зоны (для отладки и declarative-API). */
  readonly id: string;
  /** Список eqId или префиксов `*` («cyl-*»). */
  readonly accepts: ReadonlyArray<string>;
  /** Текущий прямоугольник зоны (viewport-координаты). */
  getRect(): DOMRect;
  /** Радиус активации (px) от центра. По умолчанию 80. */
  readonly snapRadius?: number;
  /** Колл-бек подсветки. */
  onHover?(active: boolean): void;
  /**
   * Колл-бек drop. Возвращает true если приняли (тогда контроллер не делает
   * return-анимацию). False → bounce-back.
   */
  onDrop(payload: DragPayload): boolean;
}

export interface DraggableOptions {
  readonly equipmentId: string;
  /**
   * Тип элемента (произвольная строка) — для фильтрации совместимых snap-зон.
   * Существующие kit-2 опыты используют «spring» | «dynamometer» | «weight»,
   * kit-1 — «cyl-1..4» | «dynamometer-1..2» | «beaker» и т.п. Контроллер
   * не знает заранее всех типов, проверяет только `accepts.includes(kind)`.
   */
  readonly kind: string;
  /** Колл-бек начала drag. */
  onDragStart?(): void;
  /** Колл-бек конца drag. accepted=true если попали в snap-зону. */
  onDragEnd?(accepted: boolean): void;
  /**
   * Если true — на overlay едет **клон** элемента (ghost), а оригинал
   * остаётся в палитре с `data-dragging="true"`. Используется в density-solid
   * (kit-1), где карточка-палитра показывает иконку, а сцена — другой
   * экземпляр компонента. По умолчанию false (single-instance).
   */
  readonly ghost?: boolean;
}

interface ActiveDrag {
  element: HTMLElement;
  /** Реально движущийся элемент (сам element или ghost-clone). */
  visual: HTMLElement;
  options: DraggableOptions;
  pointerId: number;
  homeRect: DOMRect;
  homeParent: ParentNode;
  homeNextSibling: Node | null;
  offsetX: number;
  offsetY: number;
  savedStyles: SavedStyles;
  hoverZoneId: string | null;
  /** Был ли pointer перемещён за threshold? Если нет — это «click без drag». */
  didMove: boolean;
  startX: number;
  startY: number;
}

interface SavedStyles {
  position: string;
  left: string;
  top: string;
  zIndex: string;
  transform: string;
}

const DEFAULT_SNAP_RADIUS = 80;
const RETURN_ANIM_MS = 320;
const RETURN_EASING = 'cubic-bezier(0.34, 1.4, 0.64, 1)';
/** Threshold (px) — ниже считается click, не drag. Click event пускаем дальше. */
const DRAG_THRESHOLD_PX = 6;

export class DragController {
  #zones = new Map<string, SnapZone>();
  #active: ActiveDrag | null = null;
  #overlay: HTMLElement;
  #reducedMotion: boolean;
  #pendingReturns = new Map<HTMLElement, () => void>();
  /** Для декларативного data-API — элементы, прикреплённые через attachAuto(). */
  #autoAttachedEls = new WeakMap<HTMLElement, () => void>();
  /** Глобальный onDrop для декларативных дропзон, без императивного addSnapZone. */
  #declarativeOnDrop:
    | ((detail: { eqId: string; dropzoneId: string; pointerX: number; pointerY: number }) => void)
    | null = null;

  constructor(overlay: HTMLElement) {
    this.#overlay = overlay;
    this.#reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
  }

  // ─── Императивный API ────────────────────────────────────────────────

  /** Регистрирует snap-зону. */
  addSnapZone(zone: SnapZone): void {
    this.#zones.set(zone.id, zone);
  }

  /** Удаляет snap-зону. */
  removeSnapZone(id: string): void {
    this.#zones.delete(id);
  }

  /** Регистрирует draggable-элемент. Возвращает функцию-detach. */
  attach(element: HTMLElement, options: DraggableOptions): () => void {
    const onPointerDown = (ev: PointerEvent): void => this.#startDrag(element, options, ev);
    element.addEventListener('pointerdown', onPointerDown);

    const onKeyDown = (ev: KeyboardEvent): void => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      this.#keyboardActivate(element, options);
    };
    element.addEventListener('keydown', onKeyDown);

    const detach = (): void => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('keydown', onKeyDown);
    };
    this.#autoAttachedEls.set(element, detach);
    return detach;
  }

  /** Активен ли drag. */
  isDragging(): boolean {
    return this.#active !== null;
  }

  /** Программно отменить drag и завершить pending-возвраты. */
  cancel(): void {
    if (this.#active) {
      this.#endDrag(false);
    }
    for (const finish of this.#pendingReturns.values()) finish();
    this.#pendingReturns.clear();
  }

  // ─── Декларативный data-API ──────────────────────────────────────────

  /**
   * Включает декларативный режим: контроллер сам слушает pointerdown на host'е
   * и обрабатывает любой `[data-draggable]`. Drop-зоны должны иметь
   * `data-dropzone="<accepts:csv>"` + `data-dropzone-id="<id>"`.
   *
   * Используется в kit-1 (density / archimedes), где правая панель
   * генерирует много карточек, и регистрировать каждую вручную нерационально.
   *
   * @param host корневой элемент, на котором ловим pointerdown.
   * @param onDrop callback при успешном drop в декларативную зону.
   */
  enableDeclarativeMode(
    host: HTMLElement,
    onDrop: (detail: {
      eqId: string;
      dropzoneId: string;
      pointerX: number;
      pointerY: number;
    }) => void,
  ): () => void {
    this.#declarativeOnDrop = onDrop;
    const onPointerDown = (ev: PointerEvent): void => {
      if (ev.button !== 0) return;
      const target = ev.target as HTMLElement;
      const draggable = target.closest<HTMLElement>('[data-draggable]');
      if (!draggable) return;
      const eqId = draggable.getAttribute('data-draggable');
      if (!eqId) return;
      // Уважение data-pin: programmatic блокировка drag (анимация и т.п.).
      if (draggable.hasAttribute('data-pin')) return;
      const kind = draggable.getAttribute('data-drag-kind') ?? eqId;
      const ghost = draggable.getAttribute('data-drag-ghost') === 'true';
      this.#startDrag(draggable, { equipmentId: eqId, kind, ghost }, ev);
    };
    host.addEventListener('pointerdown', onPointerDown);
    return (): void => {
      host.removeEventListener('pointerdown', onPointerDown);
      this.#declarativeOnDrop = null;
    };
  }

  // ─── Internals ───────────────────────────────────────────────────────

  #startDrag(element: HTMLElement, options: DraggableOptions, ev: PointerEvent): void {
    if (this.#active !== null) return;
    if (ev.button !== undefined && ev.button !== 0) return;
    if (element.hasAttribute('data-pin')) return;

    // Защита от browser text-selection: pointerdown в drag-режиме НЕ должен
    // выделять текст рядом со сценой. Без этого после drop'а у пользователя
    // остаётся синяя «как-двойной-клик» подсветка вокруг прибора.
    ev.preventDefault();
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) sel.removeAllRanges();
    } catch {
      /* ignore */
    }

    // Если для этого элемента уже идёт return-анимация — принудительно завершаем.
    const pending = this.#pendingReturns.get(element);
    if (pending) {
      pending();
      this.#pendingReturns.delete(element);
    }

    const homeRect = element.getBoundingClientRect();
    const offsetX = ev.clientX - homeRect.left;
    const offsetY = ev.clientY - homeRect.top;

    const savedStyles: SavedStyles = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      zIndex: element.style.zIndex,
      transform: element.style.transform,
    };

    let visual: HTMLElement;
    let homeParent: ParentNode;
    let homeNextSibling: Node | null;

    if (options.ghost) {
      // Ghost-clone режим: оригинал остаётся в палитре, на overlay едет копия.
      visual = element.cloneNode(true) as HTMLElement;
      visual.removeAttribute('id');
      visual.removeAttribute('attached');
      visual.removeAttribute('selected');
      visual.removeAttribute('hidden');
      visual.style.position = 'fixed';
      visual.style.left = `${homeRect.left}px`;
      visual.style.top = `${homeRect.top}px`;
      visual.style.zIndex = '1000';
      visual.style.transform = '';
      visual.setAttribute('data-drag-ghost', 'true');
      this.#overlay.appendChild(visual);
      // Источник помечаем как «в процессе drag» (для CSS).
      element.dataset['dragging'] = 'true';
      homeParent = element.parentNode!;
      homeNextSibling = element.nextSibling;
    } else {
      // Single-instance: сам элемент переезжает в overlay.
      homeParent = element.parentNode!;
      homeNextSibling = element.nextSibling;
      this.#overlay.appendChild(element);
      element.style.position = 'fixed';
      element.style.left = `${homeRect.left}px`;
      element.style.top = `${homeRect.top}px`;
      element.style.zIndex = '1000';
      element.style.transform = '';
      element.setAttribute('dragging', '');
      visual = element;
    }

    try {
      visual.setPointerCapture(ev.pointerId);
    } catch {
      // ignore — pointer events будут на window
    }

    this.#active = {
      element,
      visual,
      options,
      pointerId: ev.pointerId,
      homeRect,
      homeParent,
      homeNextSibling,
      offsetX,
      offsetY,
      savedStyles,
      hoverZoneId: null,
      didMove: false,
      startX: ev.clientX,
      startY: ev.clientY,
    };

    options.onDragStart?.();
    if (typeof document !== 'undefined') {
      document.body.classList.add('has-drag-active');
    }

    const onPointerMove = (e: PointerEvent): void => this.#onMove(e);
    const onPointerUp = (e: PointerEvent): void => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      this.#onUp(e);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  #onMove(ev: PointerEvent): void {
    const a = this.#active;
    if (!a || ev.pointerId !== a.pointerId) return;
    if (!a.didMove) {
      const dx = ev.clientX - a.startX;
      const dy = ev.clientY - a.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      a.didMove = true;
    }
    ev.preventDefault();
    a.visual.style.left = `${ev.clientX - a.offsetX}px`;
    a.visual.style.top = `${ev.clientY - a.offsetY}px`;
    this.#updateHover(ev.clientX, ev.clientY);
  }

  #onUp(ev: PointerEvent): void {
    const a = this.#active;
    if (!a || ev.pointerId !== a.pointerId) return;

    if (!a.didMove) {
      // Это был click — drag не состоялся. Восстанавливаем DOM-state без анимации.
      this.#restoreSilently();
      return;
    }

    const accepted = this.#tryDrop(ev.clientX, ev.clientY);
    this.#endDrag(accepted);
  }

  #updateHover(clientX: number, clientY: number): void {
    const a = this.#active!;
    let zone: SnapZone | null = null;
    // Сначала пытаемся найти декларативную зону через elementsFromPoint
    // (она может быть глубже в DOM, не зарегистрирована императивно).
    if (this.#declarativeOnDrop) {
      const els = document.elementsFromPoint(clientX, clientY);
      for (const el of els) {
        if (!(el instanceof HTMLElement)) continue;
        const z = el.closest<HTMLElement>('[data-dropzone]');
        if (z && this.#zoneAcceptsDeclarative(z, a.options.equipmentId)) {
          const id = z.getAttribute('data-dropzone-id') ?? z.id ?? '';
          if (id !== a.hoverZoneId) {
            this.#clearDeclarativeHover();
            z.dataset['dropHover'] = 'true';
            a.hoverZoneId = id;
          }
          return;
        }
      }
      this.#clearDeclarativeHover();
    }
    // Императивные зоны.
    for (const z of this.#zones.values()) {
      if (!this.#kindAccepted(z.accepts, a.options.kind)) continue;
      const r = z.getRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      const radius = z.snapRadius ?? DEFAULT_SNAP_RADIUS;
      if (dist <= radius) {
        zone = z;
        break;
      }
    }
    const newId = zone?.id ?? null;
    if (newId !== a.hoverZoneId) {
      if (a.hoverZoneId) this.#zones.get(a.hoverZoneId)?.onHover?.(false);
      if (newId) this.#zones.get(newId)?.onHover?.(true);
      a.hoverZoneId = newId;
    }
  }

  #clearDeclarativeHover(): void {
    const a = this.#active;
    if (!a || !a.hoverZoneId) return;
    const z = document.querySelector<HTMLElement>(
      `[data-dropzone-id="${CSS.escape(a.hoverZoneId)}"]`,
    );
    if (z) z.dataset['dropHover'] = 'false';
    a.hoverZoneId = null;
  }

  #zoneAcceptsDeclarative(zone: HTMLElement, eqId: string): boolean {
    const accepts = (zone.getAttribute('data-dropzone') ?? '').split(',').map((s) => s.trim());
    return this.#kindAccepted(accepts, eqId);
  }

  #kindAccepted(accepts: ReadonlyArray<string>, kind: string): boolean {
    for (const a of accepts) {
      if (!a) continue;
      if (a.endsWith('*') && kind.startsWith(a.slice(0, -1))) return true;
      if (a === kind) return true;
    }
    return false;
  }

  #tryDrop(clientX: number, clientY: number): boolean {
    const a = this.#active!;
    if (!a.hoverZoneId) return false;
    // Декларативная зона?
    const declZone = document.querySelector<HTMLElement>(
      `[data-dropzone-id="${CSS.escape(a.hoverZoneId)}"]`,
    );
    if (declZone && this.#declarativeOnDrop) {
      this.#declarativeOnDrop({
        eqId: a.options.equipmentId,
        dropzoneId: a.hoverZoneId,
        pointerX: clientX,
        pointerY: clientY,
      });
      return true;
    }
    const zone = this.#zones.get(a.hoverZoneId);
    if (!zone) return false;
    return zone.onDrop({
      element: a.visual,
      kind: a.options.kind,
      equipmentId: a.options.equipmentId,
      pointerX: clientX,
      pointerY: clientY,
    });
  }

  /** Восстанавливает DOM сразу, без анимации (для случая click-без-drag). */
  #restoreSilently(): void {
    const a = this.#active;
    if (!a) return;
    this.#active = null;
    if (typeof document !== 'undefined') {
      document.body.classList.remove('has-drag-active');
    }
    try {
      a.visual.releasePointerCapture(a.pointerId);
    } catch {
      /* noop */
    }
    if (a.options.ghost) {
      a.visual.remove();
      delete a.element.dataset['dragging'];
    } else {
      a.element.removeAttribute('dragging');
      // Возвращаем в исходный родитель.
      if (a.homeNextSibling && a.homeNextSibling.parentNode === a.homeParent) {
        a.homeParent.insertBefore(a.element, a.homeNextSibling);
      } else {
        a.homeParent.appendChild(a.element);
      }
      const s = a.savedStyles;
      a.element.style.position = s.position;
      a.element.style.left = s.left;
      a.element.style.top = s.top;
      a.element.style.zIndex = s.zIndex;
      a.element.style.transform = s.transform;
    }
  }

  #endDrag(accepted: boolean): void {
    const a = this.#active;
    if (!a) return;
    this.#active = null;
    if (typeof document !== 'undefined') {
      document.body.classList.remove('has-drag-active');
    }

    // Снимаем подсветки.
    if (a.hoverZoneId) {
      this.#zones.get(a.hoverZoneId)?.onHover?.(false);
      const declZone = document.querySelector<HTMLElement>(
        `[data-dropzone-id="${CSS.escape(a.hoverZoneId)}"]`,
      );
      if (declZone) declZone.dataset['dropHover'] = 'false';
    }

    try {
      a.visual.releasePointerCapture(a.pointerId);
    } catch {
      /* noop */
    }

    if (a.options.ghost) {
      a.visual.remove();
      delete a.element.dataset['dragging'];
      a.options.onDragEnd?.(accepted);
      return;
    }

    a.element.removeAttribute('dragging');
    a.options.onDragEnd?.(accepted);

    if (accepted) {
      // Snap-зона переместила элемент сама и применила свои стили.
      return;
    }

    // Bounce-back в исходный slot.
    const targetLeft = a.homeRect.left;
    const targetTop = a.homeRect.top;
    const duration = this.#reducedMotion ? 0 : RETURN_ANIM_MS;

    let restored = false;
    const finishReturn = (): void => {
      if (restored) return;
      restored = true;
      this.#pendingReturns.delete(a.element);
      if (a.homeNextSibling && a.homeNextSibling.parentNode === a.homeParent) {
        a.homeParent.insertBefore(a.element, a.homeNextSibling);
      } else {
        a.homeParent.appendChild(a.element);
      }
      const s = a.savedStyles;
      a.element.style.position = s.position;
      a.element.style.left = s.left;
      a.element.style.top = s.top;
      a.element.style.zIndex = s.zIndex;
      a.element.style.transform = s.transform;
    };

    if (duration === 0) {
      finishReturn();
      return;
    }

    // Web Animations API недоступен (happy-dom в тестах) → instant restore.
    if (typeof a.element.animate !== 'function') {
      finishReturn();
      return;
    }

    this.#pendingReturns.set(a.element, finishReturn);

    const anim = a.element.animate(
      [
        { left: a.element.style.left, top: a.element.style.top },
        { left: `${targetLeft}px`, top: `${targetTop}px` },
      ],
      { duration, easing: RETURN_EASING, fill: 'forwards' },
    );
    const onDone = (): void => {
      try {
        anim.cancel();
      } catch {
        /* noop */
      }
      finishReturn();
    };
    anim.addEventListener('finish', onDone, { once: true });
    anim.addEventListener('cancel', onDone, { once: true });
    setTimeout(() => {
      if (!restored) {
        try {
          anim.cancel();
        } catch {
          /* noop */
        }
        finishReturn();
      }
    }, duration + 100);
  }

  #keyboardActivate(element: HTMLElement, options: DraggableOptions): void {
    if (element.hasAttribute('data-pin')) return;
    const compatible = Array.from(this.#zones.values()).find((z) =>
      this.#kindAccepted(z.accepts, options.kind),
    );
    if (!compatible) return;
    const r = compatible.getRect();
    compatible.onDrop({
      element,
      kind: options.kind,
      equipmentId: options.equipmentId,
      pointerX: r.left + r.width / 2,
      pointerY: r.top + r.height / 2,
    });
  }
}
