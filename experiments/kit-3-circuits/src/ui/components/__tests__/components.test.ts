import { describe, expect, it } from 'vitest';
import '../lab-power-source';
import '../lab-voltmeter';
import '../lab-ammeter';
import '../lab-resistor';
import '../lab-key';

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
