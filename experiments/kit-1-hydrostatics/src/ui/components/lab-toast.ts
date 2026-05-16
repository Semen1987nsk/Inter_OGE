/**
 * <lab-toast message="..." action-label="Отменить" duration="5000" severity="info">
 *
 * Undo-toast для timed-undo (CHI 2024 «Just Undo It», research §3).
 * Альтернатива confirm-modal для деструктивных действий: операция выполняется
 * сразу, а пользователю даётся 5с-окно отменить через кнопку в тосте.
 *
 * Атрибуты (observed):
 *   message       — текст уведомления (обязательно).
 *   action-label  — текст action-кнопки. Если пустой/отсутствует — кнопки нет.
 *   duration      — мс до auto-dismiss. Default 5000. 0 = не закрывается сам.
 *   severity      — 'info' | 'success' | 'warning' | 'error'. Default 'info'.
 *
 * События (composed: true, bubbles: true):
 *   action-clicked — клик по action-кнопке. Тост НЕ закрывается сам;
 *                    оркестратор решает через dismiss().
 *   dismissed { reason: 'timeout' | 'esc' | 'action' | 'manual' } — закрылся.
 *
 * Публичный API: show(), dismiss(reason?), pauseTimer(), resumeTimer().
 *
 * Поведение:
 *   - Auto-dismiss через duration мс (если ≠ 0).
 *   - Прогресс-полоска снизу 2px от 100% → 0%, цвет = severity.
 *   - Pause on hover/focus (timer + полоска замирают, продолжают с того же
 *     прогресса при mouseleave/blur).
 *   - ESC (на компоненте) → dismiss('esc').
 *   - Slide-in справа 200мс ease-out, slide-out 150мс ease-in.
 *     prefers-reduced-motion → мгновенно.
 *   - Stack: до 3 одновременно. 4-й вытесняет первый (dismiss('manual')).
 *   - position: fixed; bottom: 24px; right: 24px; z-index: var(--z-toast).
 *     Несколько активных тостов — сдвигаются вверх (gap 8px) через перерасчёт
 *     bottom по индексу среди `lab-toast[data-shown]`.
 *
 * A11y:
 *   - role='alert' + aria-live='assertive' для severity='error', иначе
 *     role='status' + aria-live='polite'.
 *   - Кнопка action и close — нативные <button> с aria-label.
 *   - Touch-target ≥ 44×44 px.
 */

const MAX_STACK = 3;
const TOAST_GAP_PX = 8;
const TOAST_BOTTOM_PX = 24;
const TOAST_RIGHT_PX = 24;
const SLIDE_IN_MS = 200;
const SLIDE_OUT_MS = 150;
const DEFAULT_DURATION_MS = 5000;

type Severity = 'info' | 'success' | 'warning' | 'error';
type DismissReason = 'timeout' | 'esc' | 'action' | 'manual';

const SEVERITY_COLORS: Record<Severity, string> = {
  info: '#38bdaf', // teal — нейтральные сообщения
  success: '#10b981', // green — успешные действия
  warning: '#f59e0b', // gold — предупреждения
  error: '#ef4444', // red — ошибки
};

function isReducedMotion(): boolean {
  // Гард для happy-dom: matchMedia может отсутствовать.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export class LabToast extends HTMLElement {
  static observedAttributes = ['message', 'action-label', 'duration', 'severity'] as const;

  #shadow: ShadowRoot;
  /** Ссылки на ключевые ноды — кешируются после первого render(). */
  #actionBtn: HTMLButtonElement | null = null;
  #closeBtn: HTMLButtonElement | null = null;
  #progressEl: HTMLElement | null = null;
  #containerEl: HTMLElement | null = null;

  #timerId: number | null = null;
  /** ms до auto-dismiss. Уменьшается с каждым тиком pause/resume. */
  #remainingMs = 0;
  /** Время последнего старта таймера (performance.now() или Date.now()). */
  #timerStartedAt = 0;
  /** Зарегистрирован ли тост в стеке (data-shown). */
  #shown = false;
  /** Слушатель ESC, добавленный на сам элемент. */
  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#shown) {
      e.stopPropagation();
      this.dismiss('esc');
    }
  };

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#render();
  }

  connectedCallback(): void {
    // ESC обрабатываем на самом элементе (не на window) — не мешаем другим
    // компонентам обработать ESC по своим правилам, но компонент должен
    // быть focusable, иначе keydown на нём не словится.
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
    this.addEventListener('keydown', this.#onKeyDown);
    this.#applyAria();
  }

  disconnectedCallback(): void {
    this.#stopTimer();
    this.removeEventListener('keydown', this.#onKeyDown);
  }

  attributeChangedCallback(): void {
    this.#render();
    this.#applyAria();
    // duration изменился во время жизни тоста — пересчёт remaining невозможен
    // без явного контракта; не делаем, фикс в API show().
  }

  // ──── Публичный API ─────────────────────────────────────────────────────

  /** Показать тост: добавить data-shown, запустить slide-in + таймер. */
  show(): void {
    if (this.#shown) return;
    // Стек-policy: если уже 3 активных — самый старый dismiss('manual').
    LabToast.#enforceStackLimit();

    this.#shown = true;
    this.dataset['shown'] = '';
    this.#applyAria();
    LabToast.#repositionStack();

    // Slide-in анимация.
    if (this.#containerEl) {
      const reduced = isReducedMotion();
      this.#containerEl.style.transition = reduced ? 'none' : `transform ${SLIDE_IN_MS}ms ease-out, opacity ${SLIDE_IN_MS}ms ease-out`;
      // Стартовое состояние — за правым краем.
      this.#containerEl.style.transform = 'translateX(120%)';
      this.#containerEl.style.opacity = '0';
      // Запускаем переход в следующий тик (иначе браузер схлопывает оба state'а).
      requestAnimationFrame(() => {
        if (!this.#containerEl) return;
        this.#containerEl.style.transform = 'translateX(0)';
        this.#containerEl.style.opacity = '1';
      });
    }

    // Таймер на auto-dismiss.
    const duration = this.#duration();
    if (duration > 0) {
      this.#remainingMs = duration;
      this.#startTimer();
    }
  }

  /** Закрыть тост вручную. По умолчанию reason = 'manual'. */
  dismiss(reason: DismissReason = 'manual'): void {
    if (!this.#shown) return;
    this.#shown = false;
    delete this.dataset['shown'];
    this.#stopTimer();

    const reduced = isReducedMotion();
    const finalize = (): void => {
      LabToast.#repositionStack();
      this.dispatchEvent(
        new CustomEvent('dismissed', {
          detail: { reason },
          bubbles: true,
          composed: true,
        }),
      );
      // Авто-удаление из DOM — пусть оркестратор решает; remove() здесь
      // удобен для default-сценария (тост одноразовый), но безопасен и без него.
      this.remove();
    };

    if (this.#containerEl && !reduced) {
      this.#containerEl.style.transition = `transform ${SLIDE_OUT_MS}ms ease-in, opacity ${SLIDE_OUT_MS}ms ease-in`;
      this.#containerEl.style.transform = 'translateX(120%)';
      this.#containerEl.style.opacity = '0';
      window.setTimeout(finalize, SLIDE_OUT_MS);
    } else {
      finalize();
    }
  }

  /** Поставить таймер на паузу (hover/focus). Полоска тоже замирает. */
  pauseTimer(): void {
    if (this.#timerId === null) return;
    // Сохраняем сколько осталось.
    const elapsed = this.#now() - this.#timerStartedAt;
    this.#remainingMs = Math.max(0, this.#remainingMs - elapsed);
    window.clearTimeout(this.#timerId);
    this.#timerId = null;
    // Полоска — фиксируем текущее значение через computed transform.
    if (this.#progressEl) {
      const computed = window.getComputedStyle(this.#progressEl).transform;
      this.#progressEl.style.transition = 'none';
      this.#progressEl.style.transform = computed && computed !== 'none' ? computed : this.#progressEl.style.transform;
    }
  }

  /** Возобновить таймер (mouseleave/blur). */
  resumeTimer(): void {
    if (this.#timerId !== null) return; // уже идёт
    if (this.#remainingMs <= 0) return; // уже истёк, дёргать show() заново
    if (!this.#shown) return;
    this.#startTimer();
  }

  // ──── Приватные методы ──────────────────────────────────────────────────

  #now(): number {
    // Используем Date.now() — он гарантированно фейкается vitest.useFakeTimers(),
    // тогда как performance.now() в happy-dom может уйти из-под fake-control.
    return Date.now();
  }

  #duration(): number {
    const raw = this.getAttribute('duration');
    if (raw === null) return DEFAULT_DURATION_MS;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_DURATION_MS;
    return parsed;
  }

  #severity(): Severity {
    const raw = this.getAttribute('severity');
    if (raw === 'success' || raw === 'warning' || raw === 'error') return raw;
    return 'info';
  }

  #message(): string {
    return this.getAttribute('message') ?? '';
  }

  #actionLabel(): string {
    return this.getAttribute('action-label') ?? '';
  }

  #startTimer(): void {
    if (this.#remainingMs <= 0) return;
    this.#timerStartedAt = this.#now();
    this.#timerId = window.setTimeout(() => {
      this.#timerId = null;
      this.#remainingMs = 0;
      this.dismiss('timeout');
    }, this.#remainingMs);
    // Прогресс-полоска: с текущего % до 0 за оставшийся interval.
    if (this.#progressEl && !isReducedMotion()) {
      // Сначала зафиксируем текущее (или 100%, если первый старт), потом
      // в RAF запустим переход в 0.
      const totalMs = this.#duration();
      const fraction = totalMs > 0 ? this.#remainingMs / totalMs : 0;
      this.#progressEl.style.transition = 'none';
      this.#progressEl.style.transform = `scaleX(${fraction})`;
      requestAnimationFrame(() => {
        if (!this.#progressEl) return;
        this.#progressEl.style.transition = `transform ${this.#remainingMs}ms linear`;
        this.#progressEl.style.transform = 'scaleX(0)';
      });
    } else if (this.#progressEl) {
      // reduced-motion: без анимации, просто схлопываем сразу в ноль.
      this.#progressEl.style.transition = 'none';
      this.#progressEl.style.transform = 'scaleX(0)';
    }
  }

  #stopTimer(): void {
    if (this.#timerId !== null) {
      window.clearTimeout(this.#timerId);
      this.#timerId = null;
    }
  }

  #applyAria(): void {
    if (!this.isConnected) return;  // host-attrs запрещены до DOM-attach (DOM-spec)
    const sev = this.#severity();
    if (sev === 'error') {
      this.setAttribute('role', 'alert');
      this.setAttribute('aria-live', 'assertive');
    } else {
      this.setAttribute('role', 'status');
      this.setAttribute('aria-live', 'polite');
    }
    this.setAttribute('aria-atomic', 'true');
  }

  #render(): void {
    const severity = this.#severity();
    const color = SEVERITY_COLORS[severity];
    const message = this.#message();
    const actionLabel = this.#actionLabel();

    this.#shadow.innerHTML = `
<style>
  :host {
    position: fixed;
    right: ${TOAST_RIGHT_PX}px;
    bottom: ${TOAST_BOTTOM_PX}px;
    z-index: var(--z-toast, 600);
    display: block;
    /* Когда не показан — невидим, но в DOM (чтобы успеть навесить show()). */
    visibility: hidden;
    pointer-events: none;
  }
  :host([data-shown]) {
    visibility: visible;
    pointer-events: auto;
  }
  .toast {
    box-sizing: border-box;
    min-width: 280px;
    max-width: 360px;
    padding: 12px 16px;
    background: var(--color-surface-elevated, #1a1f2e);
    border-left: 4px solid ${color};
    border-radius: var(--radius-md, 8px);
    box-shadow: var(--shadow-lg, 0 10px 30px rgb(0 0 0 / 0.5));
    color: var(--color-text-primary, #e8eef9);
    font-family: var(--font-display, system-ui, -apple-system, sans-serif);
    font-size: 14px;
    line-height: 1.45;
    display: grid;
    grid-template-columns: 1fr auto auto;
    grid-template-rows: 1fr auto;
    column-gap: 12px;
    align-items: center;
    position: relative;
    overflow: hidden;
    will-change: transform, opacity;
  }
  .message {
    grid-row: 1;
    grid-column: 1;
    word-break: break-word;
  }
  .action-btn {
    grid-row: 1;
    grid-column: 2;
    appearance: none;
    background: transparent;
    border: 1px solid transparent;
    color: ${color};
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 8px 12px;
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius-sm, 4px);
    cursor: pointer;
    transition: background var(--dur-fast, 150ms) var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
  }
  .action-btn:hover { background: rgb(255 255 255 / 0.08); }
  .action-btn:focus-visible {
    outline: 2px solid ${color};
    outline-offset: 2px;
  }
  .close-btn {
    grid-row: 1;
    grid-column: 3;
    appearance: none;
    background: transparent;
    border: none;
    color: var(--color-text-secondary, #b8c0cc);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm, 4px);
    transition: background var(--dur-fast, 150ms) var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1)),
                color var(--dur-fast, 150ms) var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
  }
  .close-btn:hover { background: rgb(255 255 255 / 0.08); color: var(--color-text-primary, #e8eef9); }
  .close-btn:focus-visible {
    outline: 2px solid var(--color-text-secondary, #b8c0cc);
    outline-offset: 2px;
  }
  .progress {
    grid-row: 2;
    grid-column: 1 / -1;
    height: 2px;
    background: ${color};
    transform-origin: left center;
    transform: scaleX(1);
    margin-top: 10px;
    margin-left: -16px;
    margin-right: -16px;
    margin-bottom: -12px;
    /* width устанавливается контейнером; transform управляет прогрессом. */
  }
  /* Скрываем полоску для duration=0 (не закрывается сам). */
  :host([data-no-progress]) .progress { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .toast { transition: none !important; }
    .progress { transition: none !important; }
  }
</style>
<div class="toast" part="toast">
  <span class="message" part="message">${escapeHtml(message)}</span>
  ${
    actionLabel
      ? `<button type="button" class="action-btn" part="action-btn" aria-label="${escapeAttr(actionLabel)}">${escapeHtml(actionLabel)}</button>`
      : ''
  }
  <button type="button" class="close-btn" part="close-btn" aria-label="Закрыть">×</button>
  <div class="progress" part="progress" aria-hidden="true"></div>
</div>
`;

    // Кешируем ссылки.
    this.#containerEl = this.#shadow.querySelector('.toast');
    this.#actionBtn = this.#shadow.querySelector('.action-btn');
    this.#closeBtn = this.#shadow.querySelector('.close-btn');
    this.#progressEl = this.#shadow.querySelector('.progress');

    // duration=0 — отключаем полоску (атрибут на host для CSS).
    if (this.#duration() === 0) {
      this.setAttribute('data-no-progress', '');
    } else {
      this.removeAttribute('data-no-progress');
    }

    // Привязываем listeners.
    this.#actionBtn?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('action-clicked', {
          bubbles: true,
          composed: true,
        }),
      );
      // Не закрываем автоматически — оркестратор сам решит через dismiss().
    });
    this.#closeBtn?.addEventListener('click', () => this.dismiss('manual'));

    // Pause on hover/focus.
    this.addEventListener('mouseenter', () => this.pauseTimer());
    this.addEventListener('mouseleave', () => this.resumeTimer());
    this.addEventListener('focusin', () => this.pauseTimer());
    this.addEventListener('focusout', () => {
      // focusout срабатывает при переходе фокуса между внутренними кнопками;
      // resume только если фокус вышел за пределы тоста полностью.
      // setTimeout даёт document.activeElement обновиться.
      window.setTimeout(() => {
        if (!this.contains(document.activeElement)) this.resumeTimer();
      }, 0);
    });
  }

  // ──── Static stack management ───────────────────────────────────────────

  /**
   * При появлении 4-го тоста — самый старый (первый по DOM-порядку среди
   * data-shown) закрываем с reason='manual'. Решение — не очередь с задержкой,
   * а немедленное вытеснение, чтобы не пропустить важное недавнее.
   */
  static #enforceStackLimit(): void {
    const shown = Array.from(document.querySelectorAll('lab-toast[data-shown]')) as LabToast[];
    while (shown.length >= MAX_STACK) {
      const oldest = shown.shift();
      oldest?.dismiss('manual');
    }
  }

  /**
   * Перепозиционирование: каждому видимому тосту даём bottom = 24 + i*(h+gap),
   * где i — индекс снизу вверх (0 = самый нижний = последний show()).
   * Простейший способ — пересчитать у всех data-shown.
   */
  static #repositionStack(): void {
    const shown = Array.from(document.querySelectorAll('lab-toast[data-shown]')) as LabToast[];
    // Сортируем: новые внизу. У нас порядок DOM = порядок добавления, поэтому
    // последний appendChild — новейший — оказывается в конце массива.
    // Хотим, чтобы новейший был самым нижним (b = 24).
    for (let i = 0; i < shown.length; i++) {
      const el = shown[shown.length - 1 - i];
      if (!el) continue;
      const container = el.shadowRoot?.querySelector('.toast') as HTMLElement | null;
      const height = container?.offsetHeight ?? 64;
      el.style.bottom = `${TOAST_BOTTOM_PX + i * (height + TOAST_GAP_PX)}px`;
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

if (!customElements.get('lab-toast')) {
  customElements.define('lab-toast', LabToast);
}
