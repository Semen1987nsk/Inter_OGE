import { describe, it, expect, beforeAll, vi } from 'vitest';
import { KITS, kitFipiProgress } from '../../data/kits';
import { renderKitDrawerHTML } from '../kit-drawer';

describe('<kit-drawer>', () => {
  beforeAll(async () => { await import('../kit-drawer'); });

  it('open рендерит все опыты кита с кнопками запуска', () => {
    const el: any = document.createElement('kit-drawer');
    document.body.append(el);
    if (!el.querySelector('dialog')?.showModal) (HTMLDialogElement.prototype as any).showModal = vi.fn();
    const kit2 = KITS.find(k => k.num === 2)!;
    el.open(kit2, 'student');
    const items = el.shadowRoot!.querySelectorAll('[data-experiment]');
    expect(items.length).toBe(kit2.experiments.length);
    expect(el.shadowRoot!.textContent).toContain(kit2.experiments[0]!.resultVerb);
  });

  it('возвращает фокус на триггер при close', () => {
    const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
    const el: any = document.createElement('kit-drawer'); document.body.append(el);
    if (!(HTMLDialogElement.prototype as any).showModal) (HTMLDialogElement.prototype as any).showModal = vi.fn();
    if (!(HTMLDialogElement.prototype as any).close) (HTMLDialogElement.prototype as any).close = vi.fn();
    el.open(KITS[0]!, 'student', trigger);
    el.close();
    expect(document.activeElement).toBe(trigger);
  });

  it('open: каждый элемент опыта содержит resultVerb', () => {
    const el: any = document.createElement('kit-drawer');
    document.body.append(el);
    const kit1 = KITS.find(k => k.num === 1)!;
    el.open(kit1, 'student');
    const items = el.shadowRoot!.querySelectorAll('[data-experiment]');
    kit1.experiments.forEach((exp, i) => {
      expect(items[i]!.textContent).toContain(exp.resultVerb);
    });
  });

  it('open: каждый элемент [data-experiment] имеет верный id', () => {
    const el: any = document.createElement('kit-drawer');
    document.body.append(el);
    const kit2 = KITS.find(k => k.num === 2)!;
    el.open(kit2, 'student');
    const items = el.shadowRoot!.querySelectorAll('[data-experiment]');
    kit2.experiments.forEach((exp, i) => {
      expect((items[i] as HTMLElement).dataset['experiment']).toBe(exp.id);
    });
  });

  it('open: каждая кнопка запуска — ссылка с href', () => {
    const el: any = document.createElement('kit-drawer');
    document.body.append(el);
    const kit2 = KITS.find(k => k.num === 2)!;
    el.open(kit2, 'teacher');
    const links = el.shadowRoot!.querySelectorAll('a[href]');
    expect(links.length).toBeGreaterThan(0);
  });

  it('planned kit: нет кнопок запуска, есть eta', () => {
    const el: any = document.createElement('kit-drawer');
    document.body.append(el);
    const planned = KITS.find(k => k.status === 'planned')!;
    el.open(planned, 'student');
    const links = el.shadowRoot!.querySelectorAll('a[href]');
    expect(links.length).toBe(0);
    expect(el.shadowRoot!.textContent).toContain(planned.eta);
  });

  it('close: вызывает dialog.close()', () => {
    const el: any = document.createElement('kit-drawer');
    document.body.append(el);
    const kit2 = KITS.find(k => k.num === 2)!;
    el.open(kit2, 'student');
    const dialog = el.shadowRoot!.querySelector('dialog')!;
    const spy = vi.spyOn(dialog, 'close').mockImplementation(() => {});
    el.close();
    expect(spy).toHaveBeenCalled();
  });
});

describe('kit-drawer бонус-бейдж', () => {
  it('опыт isFipi:false получает класс bonus-badge', () => {
    const kit2 = KITS.find(k => k.num === 2)!;
    const html = renderKitDrawerHTML(kit2, 'student');
    expect(html).toContain('bonus-badge');           // бейдж присутствует
    // ровно 1 элемент <span class="bonus-badge"> — только для spring-work
    expect((html.match(/class="bonus-badge"/g) ?? []).length).toBe(1);
  });
  it('kit-2 прогресс ФИПИ = 7/7 после Волны 0', () => {
    const kit2 = KITS.find(k => k.num === 2)!;
    expect(kitFipiProgress(kit2)).toEqual({ done: 7, total: 7 });
  });
});
