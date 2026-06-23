import { describe, it, expect, beforeAll } from 'vitest';

describe('<kit-poster>', () => {
  beforeAll(async () => { await import('../kit-poster'); });

  function make(attrs: Record<string, string>) {
    const el = document.createElement('kit-poster');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.append(el);
    return el;
  }

  // ── из brief ────────────────────────────────────────────────────────────────

  it('рендерит номер и название', () => {
    const el = make({ num: '2', status: 'ready', title: 'Силы и движение', done: '4', total: '4', photo: 'x.png' });
    expect(el.shadowRoot!.textContent).toContain('Силы и движение');
    expect(el.shadowRoot!.textContent).toContain('2');
  });

  it('ready: клик эмитит poster-activate с num', () => {
    const el = make({ num: '2', status: 'ready', title: 'Силы', done: '4', total: '4', photo: 'x.png' });
    let got = -1;
    el.addEventListener('poster-activate', (e: any) => got = e.detail.num);
    (el.shadowRoot!.querySelector('[part=card],button') as HTMLElement).click();
    expect(got).toBe(2);
  });

  it('planned: имеет aria-label про недоступность', () => {
    const el = make({ num: '3', status: 'planned', title: 'Электр', done: '0', total: '9', photo: 'x.png' });
    expect(el.getAttribute('aria-label')!.toLowerCase()).toContain('недоступ');
  });

  // ── дополнительный тест из задания ──────────────────────────────────────────

  it('planned: клик эмитит poster-info, НЕ poster-activate', () => {
    const el = make({ num: '3', status: 'planned', title: 'Электр', done: '0', total: '9', photo: 'x.png' });
    let activateFired = false;
    let infoFired = false;
    el.addEventListener('poster-activate', () => { activateFired = true; });
    el.addEventListener('poster-info', () => { infoFired = true; });
    (el.shadowRoot!.querySelector('[part=card],button') as HTMLElement).click();
    expect(activateFired).toBe(false);
    expect(infoFired).toBe(true);
  });

  // ── дополнительные тесты покрытия ───────────────────────────────────────────

  it('poster-activate содержит числовой num', () => {
    const el = make({ num: '5', status: 'ready', title: 'Колебания', done: '2', total: '4', photo: 'x.png' });
    let detail: any = null;
    el.addEventListener('poster-activate', (e: any) => { detail = e.detail; });
    (el.shadowRoot!.querySelector('[part=card],button') as HTMLElement).click();
    expect(detail).not.toBeNull();
    expect(typeof detail.num).toBe('number');
    expect(detail.num).toBe(5);
  });

  it('ready: card часть существует в shadow DOM', () => {
    const el = make({ num: '1', status: 'ready', title: 'Гидростатика', done: '4', total: '5', photo: 'x.png' });
    const card = el.shadowRoot!.querySelector('[part=card]') ?? el.shadowRoot!.querySelector('button');
    expect(card).not.toBeNull();
  });

  it('содержит слот name=preview', () => {
    const el = make({ num: '1', status: 'ready', title: 'Гидростатика', done: '4', total: '5', photo: 'x.png' });
    const slot = el.shadowRoot!.querySelector('slot[name=preview]');
    expect(slot).not.toBeNull();
  });

  it('planned: содержит текст «Скоро» или «скоро»', () => {
    const el = make({ num: '4', status: 'planned', title: 'Оптика', done: '0', total: '6', photo: 'x.png' });
    expect(el.shadowRoot!.textContent!.toLowerCase()).toContain('скоро');
  });

  it('содержит progress-ring в shadow DOM', () => {
    const el = make({ num: '2', status: 'ready', title: 'Силы', done: '4', total: '4', photo: 'x.png' });
    const ring = el.shadowRoot!.querySelector('progress-ring');
    expect(ring).not.toBeNull();
  });

  it('progress-ring получает правильные value/max атрибуты', () => {
    const el = make({ num: '1', status: 'ready', title: 'Гидростатика', done: '3', total: '5', photo: 'x.png' });
    const ring = el.shadowRoot!.querySelector('progress-ring')!;
    expect(ring.getAttribute('value')).toBe('3');
    expect(ring.getAttribute('max')).toBe('5');
  });

  it('ready: poster-activate всплывает (bubbles=true)', () => {
    const el = make({ num: '2', status: 'ready', title: 'Силы', done: '4', total: '4', photo: 'x.png' });
    let caught = false;
    document.addEventListener('poster-activate', () => { caught = true; }, { once: true });
    (el.shadowRoot!.querySelector('[part=card],button') as HTMLElement).click();
    expect(caught).toBe(true);
  });

  it('Enter на карточке эмитит poster-activate', () => {
    const el = make({ num: '2', status: 'ready', title: 'Силы', done: '4', total: '4', photo: 'x.png' });
    let got = -1;
    el.addEventListener('poster-activate', (e: any) => { got = e.detail.num; });
    const card = el.shadowRoot!.querySelector('[part=card],button') as HTMLElement;
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(got).toBe(2);
  });

  it('Space на карточке эмитит poster-activate', () => {
    const el = make({ num: '2', status: 'ready', title: 'Силы', done: '4', total: '4', photo: 'x.png' });
    let got = -1;
    el.addEventListener('poster-activate', (e: any) => { got = e.detail.num; });
    const card = el.shadowRoot!.querySelector('[part=card],button') as HTMLElement;
    card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(got).toBe(2);
  });
});
