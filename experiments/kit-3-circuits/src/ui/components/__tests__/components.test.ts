import { describe, expect, it } from 'vitest';
import '../lab-power-source';
import '../lab-voltmeter';
import '../lab-ammeter';
import '../lab-resistor';
import '../lab-key';
import '../lab-lamp';
import '../lab-graph';
import '../lab-circuit-board';
import '../lab-wire-resistor';

describe('circuit lab-* components register & render', () => {
  for (const tag of ['lab-power-source', 'lab-voltmeter', 'lab-ammeter', 'lab-resistor', 'lab-key']) {
    it(`${tag} монтируется и имеет shadowRoot с svg`, () => {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      expect(el.shadowRoot).not.toBeNull();
      expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
      el.remove();
    });
  }
  it('lab-resistor variant=R1 → resistance≈4.7', () => {
    const el = document.createElement('lab-resistor') as any;
    el.setAttribute('variant', 'R1');
    document.body.appendChild(el);
    expect(el.resistance).toBeCloseTo(4.7, 1);
    el.remove();
  });
  it('lab-resistor aria-label не палит сопротивление', () => {
    const el = document.createElement('lab-resistor') as HTMLElement;
    el.setAttribute('variant', 'R1');
    document.body.appendChild(el);
    const aria = el.getAttribute('aria-label') ?? '';
    expect(aria).not.toContain('4.7');
    expect(aria).not.toContain('Ом');
    el.remove();
  });
  it('lab-key click → toggle event', () => {
    const el = document.createElement('lab-key') as any;
    document.body.appendChild(el);
    let fired = false;
    el.addEventListener('toggle', () => { fired = true; });
    el.shadowRoot.querySelector('svg').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fired).toBe(true);
    el.remove();
  });
});

describe('lab-lamp', () => {
  it('монтируется, shadow svg, current не в aria-label', () => {
    const el = document.createElement('lab-lamp') as any;
    el.setAttribute('current', '0.5');
    document.body.appendChild(el);
    expect(el.shadowRoot.querySelector('svg')).not.toBeNull();
    expect(el.getAttribute('aria-label') ?? '').not.toContain('0.5');
    el.remove();
  });
});

describe('lab-graph — мульти-серия', () => {
  it('рендерит 2 серии (line + curve) без ошибок', () => {
    const el = document.createElement('lab-graph') as any;
    document.body.appendChild(el);
    el.data = {
      xLabel: 'U', yLabel: 'I', xMax: 6, yMax: 1,
      series: [
        { id: 'resistor', color: '#38bdaf', fit: 'line', points: [ {id:'a',x:1,y:0.21}, {id:'b',x:3,y:0.64} ] },
        { id: 'lamp', color: '#f59e0b', fit: 'curve', points: [ {id:'c',x:1,y:0.19}, {id:'d',x:4.8,y:0.5} ] },
      ],
    };
    expect(el.shadowRoot.querySelectorAll('circle.point').length).toBe(4);
    el.remove();
  });
});

describe('lab-wire-resistor', () => {
  function make(attrs: Record<string, string>) {
    const el = document.createElement('lab-wire-resistor');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el as any;
  }

  it('паспорт в подписи: материал, l, S — без R/Ом', () => {
    const el = make({ material: 'нихром', length: '1.0', area: '0.25' });
    const txt = el.shadowRoot.textContent;
    expect(txt).toContain('нихром');
    expect(txt).toContain('1,0');
    expect(txt).toContain('0,25');
    expect(txt).not.toMatch(/Ом/);
    el.remove();
  });

  it('геттеры material/length/area', () => {
    const el = make({ material: 'константан', length: '2.0', area: '0.5' });
    expect(el.material).toBe('константан');
    expect(el.length).toBeCloseTo(2.0);
    expect(el.area).toBeCloseTo(0.5);
    el.remove();
  });

  it('aria-label = паспорт без R/Ом', () => {
    const el = make({ material: 'никелин', length: '2.0', area: '0.25' });
    const label =
      el.getAttribute('aria-label') ??
      el.shadowRoot.querySelector('svg')?.getAttribute('aria-label') ??
      '';
    expect(label).toMatch(/никелин/);
    expect(label).not.toMatch(/Ом/);
    el.remove();
  });

  it('getTerminalPositions возвращает plus/minus', () => {
    const el = make({ material: 'нихром', length: '1.0', area: '0.25' });
    const t = el.getTerminalPositions();
    expect(t.plus).toBeDefined();
    expect(t.minus).toBeDefined();
    el.remove();
  });

  it('монтируется с svg и shadowRoot', () => {
    const el = make({ material: 'нихром', length: '1.0', area: '0.25' });
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.querySelector('svg')).not.toBeNull();
    el.remove();
  });

  it('цвет витка меняется по материалу: нихром тёмно-серый, константан медный', () => {
    const ni = make({ material: 'нихром', length: '1.0', area: '0.25' });
    const ko = make({ material: 'константан', length: '1.0', area: '0.25' });
    // Проверяем что coil-group содержит path с заполнением (цвет не совпадает)
    const niCoilPath = ni.shadowRoot.querySelector('.coil-wire');
    const koCoilPath = ko.shadowRoot.querySelector('.coil-wire');
    expect(niCoilPath).not.toBeNull();
    expect(koCoilPath).not.toBeNull();
    const niColor = niCoilPath?.getAttribute('stroke') ?? '';
    const koColor = koCoilPath?.getAttribute('stroke') ?? '';
    expect(niColor).not.toBe(koColor);
    ni.remove();
    ko.remove();
  });

  it('подпись форматирует l через запятую (1,0 а не 1.0)', () => {
    const el = make({ material: 'нихром', length: '1.0', area: '0.25' });
    const txt = el.shadowRoot.textContent ?? '';
    expect(txt).toContain('1,0');
    expect(txt).not.toContain('1.0');
    el.remove();
  });
});

describe('lab-circuit-board — element-label', () => {
  it('по умолчанию «Резистор», атрибут меняет подпись гнезда', () => {
    const b = document.createElement('lab-circuit-board') as any;
    document.body.appendChild(b);
    b.setAttribute('element-label', 'Элемент');
    const lbl = b.shadowRoot.querySelector('[data-slot="resistor"] .slot-label-top');
    expect(lbl?.textContent).toBe('Элемент');
    b.remove();
  });
});
