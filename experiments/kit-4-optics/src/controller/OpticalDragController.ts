/**
 * OpticalDragController — drag-and-drop контроллер для оптической скамьи.
 *
 * Используется в опытах 4.1–4.5 (LensBenchExperiment).
 * Pointer-events + ghost-оверлей + snap-зоны.
 *
 * Renamed copy of CircuitDragController (kit-3 Task 4 idiom).
 */

export interface SnapZone {
  id: string;
  accepts: ReadonlyArray<string>;
  getRect(): DOMRect;
  onHover?(active: boolean): void;
  onDrop(payload: { equipmentId: string }): boolean;
}

export interface DragState<TKind extends string, TId extends string> {
  el: HTMLElement;
  kind: TKind;
  equipmentId: TId;
  startX: number;
  startY: number;
  pointerId: number;
  ghost: HTMLElement | null;
  grabOffsetX: number;
  grabOffsetY: number;
}

export class OpticalDragController<TKind extends string, TId extends string> {
  #overlay: HTMLElement;
  #zones: Map<string, SnapZone> = new Map();
  #active: DragState<TKind, TId> | null = null;
  #lastHoveredZoneId: string | null = null;

  constructor(overlay: HTMLElement) {
    this.#overlay = overlay;
  }

  attach(
    el: HTMLElement,
    opts: {
      equipmentId: TId;
      kind: TKind;
      onDragStart(): void;
      onDragEnd(): void;
    },
  ): void {
    el.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();

      const rect = el.getBoundingClientRect();
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.style.cssText = [
        'position:fixed',
        'pointer-events:none',
        'z-index:9999',
        'opacity:0.85',
        `width:${rect.width}px`,
        `height:${rect.height}px`,
        `left:${ev.clientX - rect.width / 2}px`,
        `top:${ev.clientY - rect.height / 2}px`,
        'transition:none',
      ].join(';');
      this.#overlay.appendChild(ghost);

      el.dataset['dragging'] = 'true';
      this.#active = {
        el,
        kind: opts.kind,
        equipmentId: opts.equipmentId,
        startX: ev.clientX,
        startY: ev.clientY,
        pointerId: ev.pointerId,
        ghost,
        grabOffsetX: ev.clientX - rect.left,
        grabOffsetY: ev.clientY - rect.top,
      };

      opts.onDragStart();
      el.setPointerCapture(ev.pointerId);
    });

    el.addEventListener('pointermove', (ev) => {
      if (!this.#active || this.#active.el !== el) return;
      if (this.#active.ghost) {
        this.#active.ghost.style.left = `${ev.clientX - this.#active.grabOffsetX}px`;
        this.#active.ghost.style.top = `${ev.clientY - this.#active.grabOffsetY}px`;
      }

      const newHover = this.#findZone(ev.clientX, ev.clientY, this.#active.kind);
      if (newHover !== this.#lastHoveredZoneId) {
        if (this.#lastHoveredZoneId) {
          this.#zones.get(this.#lastHoveredZoneId)?.onHover?.(false);
        }
        if (newHover) {
          this.#zones.get(newHover)?.onHover?.(true);
        }
        this.#lastHoveredZoneId = newHover;
      }
    });

    el.addEventListener('pointerup', (ev) => {
      if (!this.#active || this.#active.el !== el) return;
      const st = this.#active;
      this.#active = null;

      if (this.#lastHoveredZoneId) {
        this.#zones.get(this.#lastHoveredZoneId)?.onHover?.(false);
        this.#lastHoveredZoneId = null;
      }

      if (st.ghost) {
        st.ghost.remove();
      }
      delete el.dataset['dragging'];

      const zone = this.#findZone(ev.clientX, ev.clientY, st.kind);
      if (zone) {
        this.#zones.get(zone)?.onDrop({ equipmentId: st.equipmentId });
      }

      opts.onDragEnd();
    });

    el.addEventListener('pointercancel', () => {
      if (!this.#active || this.#active.el !== el) return;
      if (this.#lastHoveredZoneId) {
        this.#zones.get(this.#lastHoveredZoneId)?.onHover?.(false);
        this.#lastHoveredZoneId = null;
      }
      if (this.#active.ghost) this.#active.ghost.remove();
      delete el.dataset['dragging'];
      this.#active = null;
      opts.onDragEnd();
    });
  }

  addSnapZone(zone: SnapZone): void {
    this.#zones.set(zone.id, zone);
  }

  removeSnapZone(id: string): void {
    this.#zones.delete(id);
  }

  cancel(): void {
    if (this.#active) {
      if (this.#active.ghost) this.#active.ghost.remove();
      delete this.#active.el.dataset['dragging'];
      this.#active = null;
    }
    if (this.#lastHoveredZoneId) {
      this.#zones.get(this.#lastHoveredZoneId)?.onHover?.(false);
      this.#lastHoveredZoneId = null;
    }
  }

  #findZone(cx: number, cy: number, kind: TKind): string | null {
    for (const [id, zone] of this.#zones) {
      if (!zone.accepts.includes(kind)) continue;
      const r = zone.getRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        return id;
      }
    }
    return null;
  }
}
