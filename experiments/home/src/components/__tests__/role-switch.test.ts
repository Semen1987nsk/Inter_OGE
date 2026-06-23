import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

describe('<role-switch>', () => {
  beforeAll(async () => {
    await import('../role-switch');
  });

  beforeEach(() => {
    // reset body.dataset.role between tests
    delete document.body.dataset['role'];
  });

  function make(attrs: Record<string, string> = {}): Element {
    const el = document.createElement('role-switch');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.append(el);
    return el;
  }

  function tabs(el: Element): NodeListOf<Element> {
    return el.shadowRoot!.querySelectorAll('[role="tab"]');
  }

  // ── Структура ────────────────────────────────────────────────────────────────

  it('рендерит ровно 2 кнопки role=tab', () => {
    const el = make();
    expect(tabs(el).length).toBe(2);
  });

  it('tablist имеет role=tablist и aria-label', () => {
    const el = make();
    const list = el.shadowRoot!.querySelector('[role="tablist"]');
    expect(list).not.toBeNull();
    expect(list!.getAttribute('aria-label')).toBeTruthy();
  });

  it('первый таб — «Ученик» (data-role=student)', () => {
    const el = make();
    const t = tabs(el)[0]!;
    expect((t as HTMLElement).dataset['role']).toBe('student');
  });

  it('второй таб — «Учитель» (data-role=teacher)', () => {
    const el = make();
    const t = tabs(el)[1]!;
    expect((t as HTMLElement).dataset['role']).toBe('teacher');
  });

  // ── Дефолтное состояние (student) ───────────────────────────────────────────

  it('по умолчанию student aria-selected=true, tabindex=0', () => {
    const el = make();
    const student = tabs(el)[0]!;
    expect(student.getAttribute('aria-selected')).toBe('true');
    expect(student.getAttribute('tabindex')).toBe('0');
  });

  it('по умолчанию teacher aria-selected=false, tabindex=-1', () => {
    const el = make();
    const teacher = tabs(el)[1]!;
    expect(teacher.getAttribute('aria-selected')).toBe('false');
    expect(teacher.getAttribute('tabindex')).toBe('-1');
  });

  // ── Клик «Учитель» ──────────────────────────────────────────────────────────

  it('клик «Учитель» → emits role-change с detail.role==="teacher"', () => {
    const el = make();
    let detail: { role: string } | null = null;
    el.addEventListener('role-change', (e: Event) => {
      detail = (e as CustomEvent<{ role: string }>).detail;
    });
    (tabs(el)[1] as HTMLElement).click();
    expect(detail).not.toBeNull();
    expect(detail!.role).toBe('teacher');
  });

  it('клик «Учитель» → teacher aria-selected=true, student aria-selected=false', () => {
    const el = make();
    (tabs(el)[1] as HTMLElement).click();
    expect(tabs(el)[1]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs(el)[0]!.getAttribute('aria-selected')).toBe('false');
  });

  it('клик «Учитель» → body.dataset.role === "teacher"', () => {
    make();
    const el2 = make();
    (tabs(el2)[1] as HTMLElement).click();
    expect(document.body.dataset['role']).toBe('teacher');
  });

  it('role-change — composed:true (всплывает через shadow DOM)', () => {
    const el = make();
    let caught = false;
    document.addEventListener('role-change', () => { caught = true; }, { once: true });
    (tabs(el)[1] as HTMLElement).click();
    expect(caught).toBe(true);
  });

  // ── Клик «Ученик» после переключения ────────────────────────────────────────

  it('клик «Ученик» после «Учитель» → emits role-change с detail.role==="student"', () => {
    const el = make();
    (tabs(el)[1] as HTMLElement).click();
    let detail: { role: string } | null = null;
    el.addEventListener('role-change', (e: Event) => {
      detail = (e as CustomEvent<{ role: string }>).detail;
    });
    (tabs(el)[0] as HTMLElement).click();
    expect(detail!.role).toBe('student');
  });

  // ── Клавиатурная навигация (roving tabindex) ─────────────────────────────────

  it('ArrowRight переключает выделение на teacher', () => {
    const el = make();
    const list = el.shadowRoot!.querySelector('[role="tablist"]')!;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabs(el)[1]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs(el)[0]!.getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowLeft с позиции teacher переключает на student', () => {
    const el = make();
    // сначала переключаем на teacher
    (tabs(el)[1] as HTMLElement).click();
    const list = el.shadowRoot!.querySelector('[role="tablist"]')!;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(tabs(el)[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs(el)[1]!.getAttribute('aria-selected')).toBe('false');
  });

  // ── Атрибут role (initial) ───────────────────────────────────────────────────

  it('атрибут role=teacher → teacher выбран по умолчанию', () => {
    const el = make({ role: 'teacher' });
    expect(tabs(el)[1]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs(el)[0]!.getAttribute('aria-selected')).toBe('false');
  });

  // ── Getter role() ────────────────────────────────────────────────────────────

  it('getter role() возвращает текущую роль (student по умолчанию)', () => {
    const el = make();
    expect((el as any).role).toBe('student');
  });

  it('getter role() возвращает teacher после клика', () => {
    const el = make();
    (tabs(el)[1] as HTMLElement).click();
    expect((el as any).role).toBe('teacher');
  });

  // ── Enter/Space активация (keyboard) ────────────────────────────────────────

  it('Enter на кнопке «Учитель» → teacher выбран и role-change fired', () => {
    const el = make();
    const teacherBtn = tabs(el)[1] as HTMLElement;
    let detail: { role: string } | null = null;
    el.addEventListener('role-change', (e: Event) => {
      detail = (e as CustomEvent<{ role: string }>).detail;
    });
    teacherBtn.focus();
    teacherBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(tabs(el)[1]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs(el)[0]!.getAttribute('aria-selected')).toBe('false');
    expect(detail).not.toBeNull();
    expect(detail!.role).toBe('teacher');
  });

  it('Space на кнопке «Учитель» → teacher выбран и role-change fired', () => {
    const el = make();
    const teacherBtn = tabs(el)[1] as HTMLElement;
    let detail: { role: string } | null = null;
    el.addEventListener('role-change', (e: Event) => {
      detail = (e as CustomEvent<{ role: string }>).detail;
    });
    teacherBtn.focus();
    teacherBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(tabs(el)[1]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs(el)[0]!.getAttribute('aria-selected')).toBe('false');
    expect(detail).not.toBeNull();
    expect(detail!.role).toBe('teacher');
  });
});
