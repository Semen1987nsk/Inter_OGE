/**
 * lab-toast — render-тесты + поведение undo-таймера + a11y.
 *
 * Покрытие:
 *   1. Render с message + action-label.
 *   2. Без action-label — нет кнопки.
 *   3. show() → data-shown.
 *   4. Auto-dismiss через duration → событие 'dismissed' { reason: 'timeout' }.
 *   5. ESC → 'dismissed' { reason: 'esc' }.
 *   6. Action-button click → 'action-clicked', тост НЕ закрывается сам.
 *   7. mouseenter/leave → pause/resume timer.
 *   8. Severity: border-left color меняется.
 *   9. ARIA role/live для info/success/warning/error.
 *  10. prefers-reduced-motion → нет slide-анимации.
 *
 * Использует vi.useFakeTimers() для контроля setTimeout/RAF.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(async () => {
  await import('../ui/components/lab-toast');
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // Снимаем все тосты и таймеры между тестами.
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function mount(attrs: Record<string, string | number> = {}): HTMLElement {
  const el = document.createElement('lab-toast');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  document.body.appendChild(el);
  return el;
}

describe('lab-toast — render', () => {
  it('рендерит message и action-button с правильным aria-label', () => {
    const el = mount({
      message: 'Запись добавлена',
      'action-label': 'Отменить',
    });
    const root = el.shadowRoot!;
    const msg = root.querySelector('.message')!;
    expect(msg.textContent).toBe('Запись добавлена');
    const actionBtn = root.querySelector('.action-btn') as HTMLButtonElement;
    expect(actionBtn).not.toBeNull();
    expect(actionBtn.textContent).toBe('Отменить');
    expect(actionBtn.getAttribute('aria-label')).toBe('Отменить');
    // close-кнопка тоже есть.
    const closeBtn = root.querySelector('.close-btn');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn!.getAttribute('aria-label')).toBe('Закрыть');
  });

  it('без action-label → action-кнопки нет (только close)', () => {
    const el = mount({ message: 'Сохранено' });
    const root = el.shadowRoot!;
    expect(root.querySelector('.action-btn')).toBeNull();
    expect(root.querySelector('.close-btn')).not.toBeNull();
  });

  it('escapes HTML/quotes в message и action-label (защита от XSS)', () => {
    const el = mount({
      message: '<script>alert(1)</script>',
      'action-label': 'O"K',
    });
    const root = el.shadowRoot!;
    const msg = root.querySelector('.message')!;
    // textContent — это сам текст с угловыми скобками; сущности раскодируются.
    expect(msg.textContent).toBe('<script>alert(1)</script>');
    // <script> в Shadow-DOM как тег НЕ должен возникнуть.
    expect(root.querySelector('script')).toBeNull();
    const actionBtn = root.querySelector('.action-btn')!;
    expect(actionBtn.textContent).toBe('O"K');
  });
});

describe('lab-toast — show() / data-shown', () => {
  it('по умолчанию (без show) элемент в DOM, но без data-shown', () => {
    const el = mount({ message: 'Hi' });
    expect(el.hasAttribute('data-shown')).toBe(false);
  });

  it('show() добавляет data-shown', () => {
    const el = mount({ message: 'Hi' }) as { show(): void } & HTMLElement;
    el.show();
    expect(el.hasAttribute('data-shown')).toBe(true);
  });
});

describe('lab-toast — auto-dismiss', () => {
  it('через duration мс эмитит dismissed { reason: "timeout" }', () => {
    const el = mount({ message: 'Hi', duration: 5000 }) as { show(): void } & HTMLElement;
    const dismissed = vi.fn();
    el.addEventListener('dismissed', dismissed as EventListener);

    el.show();
    expect(dismissed).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4999);
    expect(dismissed).not.toHaveBeenCalled();

    // 5000мс — timeout сработал, но dismiss ещё в slide-out фазе (150мс).
    vi.advanceTimersByTime(1 + 200);
    expect(dismissed).toHaveBeenCalledTimes(1);
    const ev = dismissed.mock.calls[0]![0] as CustomEvent<{ reason: string }>;
    expect(ev.detail.reason).toBe('timeout');
  });

  it('duration=0 → авто-дismiss НЕ происходит', () => {
    const el = mount({ message: 'Hi', duration: 0 }) as { show(): void } & HTMLElement;
    const dismissed = vi.fn();
    el.addEventListener('dismissed', dismissed as EventListener);

    el.show();
    vi.advanceTimersByTime(60_000);
    expect(dismissed).not.toHaveBeenCalled();
    expect(el.hasAttribute('data-shown')).toBe(true);
    // У duration=0 нет прогресс-полоски (атрибут на host).
    expect(el.hasAttribute('data-no-progress')).toBe(true);
  });
});

describe('lab-toast — ESC', () => {
  it('Escape → dismiss с reason="esc"', () => {
    const el = mount({ message: 'Hi', duration: 5000 }) as { show(): void } & HTMLElement;
    const dismissed = vi.fn();
    el.addEventListener('dismissed', dismissed as EventListener);

    el.show();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    // dismiss использует setTimeout(SLIDE_OUT_MS) для finalize → проматываем.
    vi.advanceTimersByTime(200);
    expect(dismissed).toHaveBeenCalledTimes(1);
    const ev = dismissed.mock.calls[0]![0] as CustomEvent<{ reason: string }>;
    expect(ev.detail.reason).toBe('esc');
  });

  it('Escape ДО show() → ничего не происходит', () => {
    const el = mount({ message: 'Hi' });
    const dismissed = vi.fn();
    el.addEventListener('dismissed', dismissed as EventListener);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(dismissed).not.toHaveBeenCalled();
  });
});

describe('lab-toast — action-button', () => {
  it('клик → событие action-clicked, тост НЕ закрывается автоматически', () => {
    const el = mount({
      message: 'Запись добавлена',
      'action-label': 'Отменить',
      duration: 5000,
    }) as { show(): void } & HTMLElement;
    const actionClicked = vi.fn();
    const dismissed = vi.fn();
    el.addEventListener('action-clicked', actionClicked as EventListener);
    el.addEventListener('dismissed', dismissed as EventListener);

    el.show();
    const actionBtn = el.shadowRoot!.querySelector('.action-btn') as HTMLButtonElement;
    actionBtn.click();

    expect(actionClicked).toHaveBeenCalledTimes(1);
    // Тост ещё открыт.
    expect(el.hasAttribute('data-shown')).toBe(true);
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('action-clicked событие — composed: true (пробивает Shadow DOM)', () => {
    const el = mount({
      message: 'Hi',
      'action-label': 'OK',
    }) as { show(): void } & HTMLElement;
    const onWindow = vi.fn();
    document.addEventListener('action-clicked', onWindow as EventListener);

    el.show();
    (el.shadowRoot!.querySelector('.action-btn') as HTMLButtonElement).click();

    expect(onWindow).toHaveBeenCalledTimes(1);
    document.removeEventListener('action-clicked', onWindow as EventListener);
  });
});

describe('lab-toast — pause/resume timer', () => {
  it('pauseTimer() предотвращает auto-dismiss', () => {
    const el = mount({ message: 'Hi', duration: 5000 }) as {
      show(): void;
      pauseTimer(): void;
    } & HTMLElement;
    const dismissed = vi.fn();
    el.addEventListener('dismissed', dismissed as EventListener);

    el.show();
    vi.advanceTimersByTime(2000);
    el.pauseTimer();
    // Через ещё 5с тост НЕ должен закрыться, т.к. таймер на паузе.
    vi.advanceTimersByTime(5000);
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('resumeTimer() продолжает с того же остатка (не сначала)', () => {
    const el = mount({ message: 'Hi', duration: 5000 }) as {
      show(): void;
      pauseTimer(): void;
      resumeTimer(): void;
    } & HTMLElement;
    const dismissed = vi.fn();
    el.addEventListener('dismissed', dismissed as EventListener);

    el.show();
    vi.advanceTimersByTime(2000); // прошло 2с, осталось 3с.
    el.pauseTimer();
    vi.advanceTimersByTime(10_000); // во время паузы.
    el.resumeTimer();
    // Должно остаться ~3с до auto-dismiss.
    vi.advanceTimersByTime(2999);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    // Слайд-out finalize ещё ~150мс.
    vi.advanceTimersByTime(200);
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('mouseenter → pause, mouseleave → resume', () => {
    const el = mount({ message: 'Hi', duration: 3000 }) as { show(): void } & HTMLElement;
    const dismissed = vi.fn();
    el.addEventListener('dismissed', dismissed as EventListener);

    el.show();
    vi.advanceTimersByTime(1000); // прошло 1с, осталось 2с.
    el.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(10_000); // на паузе.
    expect(dismissed).not.toHaveBeenCalled();

    el.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(1999);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 + 200);
    expect(dismissed).toHaveBeenCalledTimes(1);
  });
});

describe('lab-toast — severity', () => {
  it('info (default) → border-left teal, role=status, aria-live=polite', () => {
    const el = mount({ message: 'Hi' });
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
    const style = el.shadowRoot!.querySelector('style')!.textContent!;
    expect(style).toContain('#38bdaf'); // teal
  });

  it('success → border-left green', () => {
    const el = mount({ message: 'Hi', severity: 'success' });
    const style = el.shadowRoot!.querySelector('style')!.textContent!;
    expect(style).toContain('#10b981'); // green
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });

  it('warning → border-left gold', () => {
    const el = mount({ message: 'Hi', severity: 'warning' });
    const style = el.shadowRoot!.querySelector('style')!.textContent!;
    expect(style).toContain('#f59e0b'); // gold
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });

  it('error → border-left red, role=alert, aria-live=assertive', () => {
    const el = mount({ message: 'Hi', severity: 'error' });
    const style = el.shadowRoot!.querySelector('style')!.textContent!;
    expect(style).toContain('#ef4444'); // red
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.getAttribute('aria-live')).toBe('assertive');
  });

  it('неизвестное severity → fallback на info', () => {
    const el = mount({ message: 'Hi', severity: 'banana' });
    expect(el.getAttribute('role')).toBe('status');
    const style = el.shadowRoot!.querySelector('style')!.textContent!;
    expect(style).toContain('#38bdaf');
  });
});

describe('lab-toast — prefers-reduced-motion', () => {
  it('reduced-motion: slide-in без transition (мгновенно)', () => {
    // Подменяем matchMedia.
    const original = window.matchMedia;
    (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = ((
      query: string,
    ) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    })) as typeof window.matchMedia;

    try {
      const el = mount({ message: 'Hi', duration: 5000 }) as { show(): void } & HTMLElement;
      el.show();
      const container = el.shadowRoot!.querySelector('.toast') as HTMLElement;
      // Inline-стиль transition — 'none' для reduced-motion.
      expect(container.style.transition).toBe('none');
    } finally {
      (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = original;
    }
  });
});

describe('lab-toast — stack management', () => {
  it('4-й тост вытесняет первый (max stack = 3)', () => {
    const ts: HTMLElement[] = [];
    for (let i = 0; i < 4; i++) {
      const el = mount({ message: `T${i}`, duration: 0 }) as { show(): void } & HTMLElement;
      el.show();
      ts.push(el);
    }
    // Прокручиваем slide-out (150мс).
    vi.advanceTimersByTime(200);
    // Первый — должен быть удалён из DOM (т.к. dismiss('manual') → remove()).
    expect(ts[0]!.isConnected).toBe(false);
    // Остальные три — на месте.
    expect(ts[1]!.isConnected).toBe(true);
    expect(ts[2]!.isConnected).toBe(true);
    expect(ts[3]!.isConnected).toBe(true);
  });
});

describe('lab-toast — манипуляция через атрибуты', () => {
  it('смена severity на лету обновляет ARIA-роль', () => {
    const el = mount({ message: 'Hi', severity: 'info' });
    expect(el.getAttribute('role')).toBe('status');
    el.setAttribute('severity', 'error');
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.getAttribute('aria-live')).toBe('assertive');
  });
});
