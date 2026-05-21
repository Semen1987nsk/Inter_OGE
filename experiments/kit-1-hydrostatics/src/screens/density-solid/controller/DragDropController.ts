/**
 * DragDropController — pointer-based drag&drop оборудования из правой панели на сцену.
 *
 * Использует PointerEvent API (а не HTML5 Drag&Drop): работает на touch без отдельной
 * реализации, нет проблем с drag-image и полный контроль над hit-detection.
 *
 * Контракт:
 *   - Любой источник имеет атрибут `data-draggable="<eqId>"`.
 *   - Любая drop-зона имеет `data-dropzone="<accepts:csv>"` и `data-dropzone-id="<zone>"`,
 *     где accepts — список eqId или префиксов с `*` (например, `cyl-*`).
 *   - При успешном drop вызывается onDrop({ eqId, dropzoneId }).
 *
 * Click-to-attach сохраняется параллельно: если pointer не сдвинулся за threshold,
 * controller не активирует drag и нативный click event срабатывает обычным образом.
 */

const DRAG_THRESHOLD_PX = 6;
/** Чувствительность наклона ghost'а к скорости курсора (deg на px мгновенного смещения). */
const GHOST_TILT_SENSITIVITY = 0.5;
/** Максимальный наклон ghost'а (°). Cap держит микро-дрожание незаметным. */
const GHOST_TILT_MAX_DEG = 4;
/** Подъём ghost'а при перетаскивании (scale). */
const GHOST_LIFT_SCALE = 1.04;

interface ActiveDrag {
  pointerId: number;
  startX: number;
  startY: number;
  /** Смещение от центра source-bbox до точки клика, чтобы ghost-цилиндр
   *  «жил» под пальцем там же, где его схватили — а не телепортировался
   *  центром в позицию курсора. */
  grabOffsetX: number;
  grabOffsetY: number;
  source: HTMLElement;
  eqId: string;
  ghost: HTMLElement | null;
  candidateZone: HTMLElement | null;
  /** Предыдущий clientX — для мгновенного направления наклона ghost'а. */
  lastX: number;
  /** prefers-reduced-motion: при true ghost не наклоняем и не увеличиваем. */
  reduceMotion: boolean;
}

export interface EquipmentDropDetail {
  readonly eqId: string;
  readonly dropzoneId: string;
}

export class DragDropController {
  #host: HTMLElement;
  #overlay: HTMLElement;
  #active: ActiveDrag | null = null;
  #onDrop: (detail: EquipmentDropDetail) => void;

  constructor(host: HTMLElement, onDrop: (detail: EquipmentDropDetail) => void) {
    this.#host = host;
    this.#onDrop = onDrop;
    this.#overlay = document.createElement('div');
    this.#overlay.className = 'density-drag-overlay';
    this.#overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.#overlay);

    // Listener на host — сначала ловит pointerdown, чтобы не конкурировать с
    // shadow-DOM pointer events (Web Components) на низком уровне.
    this.#host.addEventListener('pointerdown', this.#handlePointerDown);
    // pointermove / pointerup всегда на window — если bus покинет element/host,
    // мы всё ещё получаем события (важно при быстром drag).
    window.addEventListener('pointermove', this.#handlePointerMove, { passive: false });
    window.addEventListener('pointerup', this.#handlePointerUp);
    window.addEventListener('pointercancel', this.#handlePointerCancel);
  }

  destroy(): void {
    this.#cleanupActive();
    this.#host.removeEventListener('pointerdown', this.#handlePointerDown);
    window.removeEventListener('pointermove', this.#handlePointerMove);
    window.removeEventListener('pointerup', this.#handlePointerUp);
    window.removeEventListener('pointercancel', this.#handlePointerCancel);
    this.#overlay.remove();
  }

  #handlePointerDown = (ev: PointerEvent): void => {
    if (ev.button !== 0) return;
    const target = ev.target as HTMLElement;
    const draggable = target.closest<HTMLElement>('[data-draggable]');
    if (!draggable) return;
    const eqId = draggable.getAttribute('data-draggable');
    if (!eqId) return;
    // Запоминаем, в какую точку bbox пришёлся клик. Если ученик тапнул по
    // верху цилиндра, ghost тоже должен «висеть» так, чтобы его верх был
    // под пальцем — иначе при создании цилиндр прыгал центром на курсор.
    const r = draggable.getBoundingClientRect();
    const sCx = r.left + r.width / 2;
    const sCy = r.top + r.height / 2;
    this.#active = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      grabOffsetX: ev.clientX - sCx,
      grabOffsetY: ev.clientY - sCy,
      source: draggable,
      eqId,
      ghost: null,
      candidateZone: null,
      lastX: ev.clientX,
      reduceMotion:
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  };

  #handlePointerMove = (ev: PointerEvent): void => {
    const a = this.#active;
    if (!a || ev.pointerId !== a.pointerId) return;
    const dx = ev.clientX - a.startX;
    const dy = ev.clientY - a.startY;
    if (!a.ghost && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      // Создаём ghost так, чтобы его центр оказался ровно там, где был
      // центр source — без визуального скачка. Дальше двигаем по
      // курсору с учётом grabOffset (точка хвата).
      const ghostCx = ev.clientX - a.grabOffsetX;
      const ghostCy = ev.clientY - a.grabOffsetY;
      a.ghost = this.#createGhost(a.source, ghostCx, ghostCy);
      a.source.dataset['dragging'] = 'true';
      this.#highlightDropzonesFor(a.eqId, true);
    }
    if (a.ghost) {
      ev.preventDefault();
      // Глобальный hint-флаг: пока тянем, drop-targets могут реагировать на
      // body.has-drag-active в CSS (выводить outline-подсказку без лишних
      // прокидываний state). Снимается в #cleanupActive.
      document.body.classList.add('has-drag-active');
      const ghostCx = ev.clientX - a.grabOffsetX;
      const ghostCy = ev.clientY - a.grabOffsetY;
      let extra = '';
      if (!a.reduceMotion) {
        const instantDx = ev.clientX - a.lastX;
        const tilt = Math.max(-GHOST_TILT_MAX_DEG, Math.min(GHOST_TILT_MAX_DEG, instantDx * GHOST_TILT_SENSITIVITY));
        extra = ` scale(${GHOST_LIFT_SCALE}) rotate(${tilt.toFixed(2)}deg)`;
      }
      a.lastX = ev.clientX;
      a.ghost.style.transform = `translate(${ghostCx}px, ${ghostCy}px) translate(-50%, -50%)${extra}`;
      const zone = this.#findDropzoneAt(ev.clientX, ev.clientY, a.eqId);
      if (zone !== a.candidateZone) {
        if (a.candidateZone) a.candidateZone.dataset['dropHover'] = 'false';
        if (zone) zone.dataset['dropHover'] = 'true';
        a.candidateZone = zone;
      }
    }
  };

  #handlePointerUp = (ev: PointerEvent): void => {
    const a = this.#active;
    if (!a || ev.pointerId !== a.pointerId) return;
    // Не блокируем event propagation — drag это «дополнительный» слой,
    // если ghost не создавался, click event должен доехать как обычно.
    if (a.ghost) {
      const zone = a.candidateZone;
      if (zone) {
        const dropzoneId = zone.getAttribute('data-dropzone-id') ?? '';
        try {
          this.#onDrop({ eqId: a.eqId, dropzoneId });
        } catch (err) {
          console.error('DragDropController.onDrop threw', err);
        }
      }
      // Отвязываем ghost от active-стейта, чтобы #cleanupActive не удалил его
      // мгновенно — даём догаснуть (crossfade с entrance реального объекта).
      this.#fadeOutGhost(a.ghost);
      a.ghost = null;
    }
    this.#cleanupActive();
  };

  #fadeOutGhost(ghost: HTMLElement): void {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      ghost.remove();
      return;
    }
    const done = (): void => ghost.remove();
    ghost.addEventListener('transitionend', done, { once: true });
    // opacity transition задан в CSS (.density-drag-ghost). Триггерим на следующем кадре.
    requestAnimationFrame(() => {
      ghost.style.opacity = '0';
    });
    // Fallback на случай, если transitionend не сработает.
    setTimeout(done, 400);
  }

  #handlePointerCancel = (): void => {
    this.#cleanupActive();
  };

  #cleanupActive(): void {
    const a = this.#active;
    if (!a) return;
    if (a.ghost) a.ghost.remove();
    if (a.candidateZone) a.candidateZone.dataset['dropHover'] = 'false';
    this.#highlightDropzonesFor(a.eqId, false);
    delete a.source.dataset['dragging'];
    document.body.classList.remove('has-drag-active');
    this.#active = null;
  }

  #createGhost(source: HTMLElement, x: number, y: number): HTMLElement {
    const ghost = document.createElement('div');
    ghost.className = 'density-drag-ghost';
    const COMPONENT_SEL =
      'lab-balance, lab-graduated-cylinder, lab-metal-weight, lab-dynamometer, lab-beaker, lab-thread, lab-salt-set';
    // Источник может быть И самой web-component'ой (overlay-цилиндр на весах
    // имеет data-draggable прямо на <lab-metal-weight>), и контейнером
    // (lab-equipment-card → внутри лежит компонент). Если matches — клонируем
    // самого source; иначе ищем внутри. Без этой проверки превью схлопывалось
    // в текст «cyl-1» вместо самого цилиндра.
    const inner: Element | null = source.matches(COMPONENT_SEL)
      ? source
      : source.querySelector(COMPONENT_SEL);
    if (inner) {
      const clone = inner.cloneNode(true) as HTMLElement;
      clone.removeAttribute('selected');
      clone.removeAttribute('attached');
      clone.removeAttribute('active');
      clone.removeAttribute('hidden');
      // Снимаем layout-классы overlay-источника: они дают
      // position:absolute + top:-78px + own transform → клон бы прыгал
      // внутри ghost'а вверх на ~80px. В drag-ghost клон должен жить
      // в обычном flow, центрированный самим ghost-контейнером.
      clone.classList.remove(
        'density-overlay-weight',
        'density-overlay-weight--balance',
        'density-overlay-weight--cylinder',
      );
      clone.removeAttribute('id');
      clone.removeAttribute('style');
      // В превью-ghost подпись ("Цилиндр № N") не нужна — пользователь уже
      // знает, что тащит, а текст забивает мелкую превьюшку и выглядит как
      // случайные «цифры» вместо самой формы цилиндра.
      if (clone.tagName === 'LAB-METAL-WEIGHT') {
        clone.setAttribute('no-legend', '');
        // Стабильный размер ghost-цилиндра: исходник на весах 70px,
        // в мензурке 78px, в карточке 84px — чтобы при перетаскивании
        // не было визуального «скачка размера», задаём один размер.
        clone.style.setProperty('--w-size', '76px');
      }
      ghost.appendChild(clone);
    } else {
      ghost.textContent = source.getAttribute('data-draggable') ?? '';
    }
    ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    this.#overlay.appendChild(ghost);
    return ghost;
  }

  #highlightDropzonesFor(eqId: string, on: boolean): void {
    const zones = document.querySelectorAll<HTMLElement>('[data-dropzone]');
    for (const z of zones) {
      if (on && this.#zoneAccepts(z, eqId)) {
        z.dataset['dropActive'] = 'true';
      } else {
        z.dataset['dropActive'] = 'false';
      }
    }
  }

  #zoneAccepts(zone: HTMLElement, eqId: string): boolean {
    const accepts = (zone.getAttribute('data-dropzone') ?? '').split(',').map((s) => s.trim());
    for (const a of accepts) {
      if (!a) continue;
      if (a.endsWith('*')) {
        const prefix = a.slice(0, -1);
        if (eqId.startsWith(prefix)) return true;
      } else if (a === eqId) {
        return true;
      }
    }
    return false;
  }

  #findDropzoneAt(x: number, y: number, eqId: string): HTMLElement | null {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      if (!(el instanceof HTMLElement)) continue;
      const zone = el.closest<HTMLElement>('[data-dropzone]');
      if (zone && this.#zoneAccepts(zone, eqId)) return zone;
    }
    return null;
  }
}
