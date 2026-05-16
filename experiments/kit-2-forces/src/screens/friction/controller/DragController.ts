/**
 * DragController — универсальный drag&drop через PointerEvents.
 *
 * Поддерживает мышь / touch (интерактивные школьные панели) / стилус.
 * Работает с произвольным числом snap-зон, регистрируемых через `addSnapZone()`.
 * При промахе — плавный возврат через Web Animations API.
 *
 * Архитектура:
 *  - draggable элемент через `attach(el, options)` получает обработчик pointerdown
 *  - на pointerdown элемент перемещается в overlay-контейнер (position: fixed)
 *  - на pointermove обновляется позиция + проверяются snap-зоны (подсветка)
 *  - на pointerup:
 *      - если над snap-зоной — вызываем onDrop зоны (даём ей переместить элемент)
 *      - иначе — анимированный возврат к homeRect и в исходный slot
 */

/** Виды перетаскиваемого оборудования. Список расширяется по мере добавления опытов
 *  (унифицирован для всей лаборатории, чтобы DragController был доменно-нейтральным). */
export type AttachKind = 'spring' | 'dynamometer' | 'weight' | 'block';

export interface SnapZone {
  /** Уникальный идентификатор зоны (для отладки). */
  id: string;
  /** Какие виды оборудования принимаем. */
  accepts: ReadonlyArray<AttachKind>;
  /** Текущий прямоугольник зоны в координатах viewport (pointer events). */
  getRect(): DOMRect;
  /** Радиус активации (px) от центра зоны. По умолчанию 80. */
  snapRadius?: number;
  /** Колл-бек подсветки: вызывается при появлении/уходе указателя в зону. */
  onHover?(active: boolean): void;
  /**
   * Колл-бек drop. Получает элемент, его kind/id и центр pointer.
   * Должен вернуть `true` если приняли (тогда контроллер не делает return-анимацию).
   * Если `false` — контроллер вернёт элемент на homeRect.
   */
  onDrop(payload: {
    element: HTMLElement;
    kind: AttachKind;
    equipmentId: string;
    pointerX: number;
    pointerY: number;
  }): boolean;
}

export interface DraggableOptions {
  /** Уникальный идентификатор оборудования (передаётся в onDrop snap-зоны). */
  equipmentId: string;
  /** Тип элемента — для фильтрации совместимых snap-зон. */
  kind: AttachKind;
  /** Колл-бек начала drag (для смены статуса карточки и т.п.). */
  onDragStart?: () => void;
  /**
   * Колл-бек окончания drag.
   * @param accepted - был ли drop принят какой-то snap-зоной
   */
  onDragEnd?: (accepted: boolean) => void;
}

interface ActiveDrag {
  element: HTMLElement;
  options: DraggableOptions;
  pointerId: number;
  homeRect: DOMRect;
  homeParent: ParentNode;
  homeNextSibling: Node | null;
  /** Смещение pointer относительно левого-верхнего угла элемента (px). */
  offsetX: number;
  offsetY: number;
  /** Сохранённые оригинальные inline-стили — для восстановления при отмене. */
  savedStyles: { position: string; left: string; top: string; zIndex: string; transform: string };
  /** Текущая зона под указателем (для debounced подсветки). */
  hoverZoneId: string | null;
}

const DEFAULT_SNAP_RADIUS = 80;
const RETURN_ANIM_MS = 320;
const RETURN_EASING = 'cubic-bezier(0.34, 1.4, 0.64, 1)';

export class DragController {
  #zones = new Map<string, SnapZone>();
  #active: ActiveDrag | null = null;
  #overlay: HTMLElement;
  #reducedMotion: boolean;
  /** Pending finishReturn-функции по элементам — вызываются принудительно
   *  при следующем startDrag или cancel(), чтобы overlay не накапливал «висящие»
   *  элементы во время WAAPI return-анимации. */
  #pendingReturns = new Map<HTMLElement, () => void>();

  constructor(overlay: HTMLElement) {
    this.#overlay = overlay;
    this.#reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Регистрирует snap-зону. */
  addSnapZone(zone: SnapZone): void {
    this.#zones.set(zone.id, zone);
  }

  /** Удаляет snap-зону по id. */
  removeSnapZone(id: string): void {
    this.#zones.delete(id);
  }

  /** Регистрирует draggable-элемент. Возвращает функцию-detach. */
  attach(element: HTMLElement, options: DraggableOptions): () => void {
    const onPointerDown = (ev: PointerEvent): void => this.#startDrag(element, options, ev);
    element.addEventListener('pointerdown', onPointerDown);

    // Keyboard fallback: Enter/Space → ищем первую совместимую snap-зону
    const onKeyDown = (ev: KeyboardEvent): void => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      this.#keyboardActivate(element, options);
    };
    element.addEventListener('keydown', onKeyDown);

    return (): void => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('keydown', onKeyDown);
    };
  }

  /** Текущий drag активен? */
  isDragging(): boolean {
    return this.#active !== null;
  }

  /** Программно отменить активный drag и завершить все pending return-анимации.
   *  Вызывается из reset() оркестратора и в начале нового startDrag(). */
  cancel(): void {
    if (this.#active) {
      this.#endDrag(false, this.#active.homeRect.left, this.#active.homeRect.top);
    }
    // Принудительно «доводим до конца» все ещё анимирующиеся возвраты.
    // Иначе при быстрых сериях drag-промахов overlay накапливает «висящие» элементы.
    for (const finish of this.#pendingReturns.values()) finish();
    this.#pendingReturns.clear();
  }

  // ─── Internals ─────────────────────────────────────────────

  #startDrag(element: HTMLElement, options: DraggableOptions, ev: PointerEvent): void {
    if (this.#active !== null) return;
    if (ev.button !== undefined && ev.button !== 0) return; // только левая кнопка
    // Если элемент уже подвешен на установке — drag не начинаем, чтобы pointerdown
    // / click дошёл до интерактивных элементов внутри (например scale-area пружины).
    // Атрибут «attached» ставит оркестратор в #mountInStack().
    if (element.hasAttribute('attached')) return;

    // Если для этого элемента уже идёт return-анимация (после прошлого drag-промаха) —
    // принудительно завершаем её, чтобы start был с чистого DOM-state.
    const pending = this.#pendingReturns.get(element);
    if (pending) {
      pending();
      this.#pendingReturns.delete(element);
    }

    ev.preventDefault();

    const homeRect = element.getBoundingClientRect();
    const offsetX = ev.clientX - homeRect.left;
    const offsetY = ev.clientY - homeRect.top;

    const savedStyles = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      zIndex: element.style.zIndex,
      transform: element.style.transform,
    };

    // Перемещаем элемент в overlay (с теми же экранными координатами).
    const homeParent = element.parentNode!;
    const homeNextSibling = element.nextSibling;
    this.#overlay.appendChild(element);

    element.style.position = 'fixed';
    element.style.left = `${homeRect.left}px`;
    element.style.top = `${homeRect.top}px`;
    element.style.zIndex = '1000';
    element.style.transform = '';
    element.setAttribute('dragging', '');

    try {
      element.setPointerCapture(ev.pointerId);
    } catch {
      // ignore — bubble pointer события
    }

    this.#active = {
      element,
      options,
      pointerId: ev.pointerId,
      homeRect,
      homeParent,
      homeNextSibling,
      offsetX,
      offsetY,
      savedStyles,
      hoverZoneId: null,
    };

    options.onDragStart?.();

    const onPointerMove = (e: PointerEvent): void => this.#onMove(e, onPointerMove, onPointerUp);
    const onPointerUp = (e: PointerEvent): void => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      this.#onUp(e);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  #onMove(
    ev: PointerEvent,
    _onMove: (e: PointerEvent) => void,
    _onUp: (e: PointerEvent) => void,
  ): void {
    const a = this.#active;
    if (!a || ev.pointerId !== a.pointerId) return;

    a.element.style.left = `${ev.clientX - a.offsetX}px`;
    a.element.style.top = `${ev.clientY - a.offsetY}px`;

    this.#updateHover(ev.clientX, ev.clientY);
  }

  #onUp(ev: PointerEvent): void {
    const a = this.#active;
    if (!a || ev.pointerId !== a.pointerId) return;

    const accepted = this.#tryDrop(ev.clientX, ev.clientY);
    if (!accepted) {
      this.#endDrag(false, a.homeRect.left, a.homeRect.top);
    } else {
      this.#endDrag(true, ev.clientX, ev.clientY);
    }
  }

  #updateHover(clientX: number, clientY: number): void {
    const a = this.#active!;
    let zone: SnapZone | null = null;
    for (const z of this.#zones.values()) {
      if (!z.accepts.includes(a.options.kind)) continue;
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

  #tryDrop(clientX: number, clientY: number): boolean {
    const a = this.#active!;
    if (!a.hoverZoneId) return false;
    const zone = this.#zones.get(a.hoverZoneId);
    if (!zone) return false;
    return zone.onDrop({
      element: a.element,
      kind: a.options.kind,
      equipmentId: a.options.equipmentId,
      pointerX: clientX,
      pointerY: clientY,
    });
  }

  /** Завершить drag. Если accepted=false — анимированный возврат, потом восстановление. */
  #endDrag(accepted: boolean, _endX: number, _endY: number): void {
    const a = this.#active;
    if (!a) return;

    // СРАЗУ освобождаем активный slot — иначе повторный cancel() (например из reset())
    // войдёт в #endDrag второй раз и запустит вторую анимацию на том же элементе.
    this.#active = null;

    // снимаем подсветку зоны
    if (a.hoverZoneId) this.#zones.get(a.hoverZoneId)?.onHover?.(false);

    // pointer capture снимаем безопасно
    try {
      a.element.releasePointerCapture(a.pointerId);
    } catch {
      // ignore
    }

    a.element.removeAttribute('dragging');
    a.options.onDragEnd?.(accepted);

    if (accepted) {
      // Snap-зона уже сама переместила элемент в нужное место и применила стили.
      return;
    }

    // Не принят — анимируем возврат и кладём обратно в исходный родитель.
    const targetLeft = a.homeRect.left;
    const targetTop = a.homeRect.top;
    const duration = this.#reducedMotion ? 0 : RETURN_ANIM_MS;

    let restored = false;
    const finishReturn = (): void => {
      if (restored) return; // защита от двойного вызова (finish + fallback + force)
      restored = true;
      this.#pendingReturns.delete(a.element);
      // Восстанавливаем DOM-структуру (обратно в карточку).
      if (a.homeNextSibling && a.homeNextSibling.parentNode === a.homeParent) {
        a.homeParent.insertBefore(a.element, a.homeNextSibling);
      } else {
        a.homeParent.appendChild(a.element);
      }
      // Восстанавливаем inline стили
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

    // Регистрируем pending-return, чтобы новый startDrag/cancel мог принудительно завершить.
    this.#pendingReturns.set(a.element, finishReturn);

    const anim = a.element.animate(
      [
        { left: a.element.style.left, top: a.element.style.top },
        { left: `${targetLeft}px`, top: `${targetTop}px` },
      ],
      { duration, easing: RETURN_EASING, fill: 'forwards' },
    );
    const onDone = (): void => {
      try { anim.cancel(); } catch { /* ignore */ }
      finishReturn();
    };
    anim.addEventListener('finish', onDone, { once: true });
    anim.addEventListener('cancel', onDone, { once: true });
    // Fallback на случай если ни finish, ни cancel не пришли (бывает с synthetic
    // pointer events или когда элемент detach'ится во время анимации).
    setTimeout(() => {
      if (!restored) {
        try { anim.cancel(); } catch { /* ignore */ }
        finishReturn();
      }
    }, duration + 100);
  }

  /**
   * Keyboard fallback: ищем первую совместимую snap-зону, "телепортируем" элемент туда
   * и сразу триггерим drop. Поведение для a11y и без drag-устройств.
   */
  #keyboardActivate(element: HTMLElement, options: DraggableOptions): void {
    const compatible = Array.from(this.#zones.values()).find((z) =>
      z.accepts.includes(options.kind),
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
