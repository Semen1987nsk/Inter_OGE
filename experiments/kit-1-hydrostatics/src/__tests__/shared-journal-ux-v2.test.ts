/**
 * Unit-тесты UX-v2 §21 shared journal:
 *   - render.ts — 3-режимный рендер (semi-auto/fully-manual/fully-auto)
 *   - pending.ts — renderPending видимость по режиму/ready/signature
 *   - recorder.ts — createRecorder фабрика
 *   - record-mode.ts — teacher-override через URL
 *
 * Эти тесты дополняют существующий shared-journal.test.ts, который
 * покрывает format/verify/specs (физика и форматирование).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderJournalTable } from '@shared/lib/journal/render';
import {
  attachPendingClick,
  findPendingHost,
  renderPending,
  type PendingHost,
} from '@shared/lib/journal/pending';
import { createRecorder } from '@shared/lib/journal/recorder';
import { DENSITY_SPEC } from '@shared/lib/journal/specs';
import type { JournalMode, JournalRow } from '@shared/lib/journal/types';
import {
  applyRecordModeAttribute,
  DEFAULT_RECORD_MODE,
  getModeOverride,
  getRecordMode,
  isModeLocked,
  renderRecordModeToggle,
  setRecordMode,
} from '@shared/lib/record-mode';

const SAMPLE_ROW: JournalRow = {
  idx: 1,
  timestamp: 1_700_000_000_000,
  values: {
    idx: 1,
    cylinder: 3,
    m_g: 71,
    V1_ml: 50,
    V2_ml: 65,
    V_cm3: null,
    rho_kg_m3: null,
  },
  verdicts: {},
};

function makeHost(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function cleanup(): void {
  document.body.innerHTML = '';
}

// ═══════════════════════════════════════════════════════════════════
// render.ts — 3-режимный рендер
// ═══════════════════════════════════════════════════════════════════

describe('render — semi-auto режим', () => {
  afterEach(cleanup);

  it('direct cells — read-only текст; derived cells — input + ✓-кнопка', () => {
    const host = makeHost();
    renderJournalTable(host, DENSITY_SPEC, [SAMPLE_ROW], {
      mode: 'semi-auto',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });

    const directCell = host.querySelector<HTMLElement>('td[data-key="m_g"]');
    const derivedCell = host.querySelector<HTMLElement>('td[data-key="V_cm3"]');
    expect(directCell?.querySelector('input')).toBeNull();
    expect(directCell?.textContent).toContain('71');
    expect(derivedCell?.querySelector('input.j-input--derived')).not.toBeNull();

    const checkBtn = host.querySelector('button.j-check');
    expect(checkBtn).not.toBeNull();
  });

  it('header содержит ✓ колонку', () => {
    const host = makeHost();
    renderJournalTable(host, DENSITY_SPEC, [SAMPLE_ROW], {
      mode: 'semi-auto',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    const ths = Array.from(host.querySelectorAll('th'));
    expect(ths.some((th) => th.textContent === '✓')).toBe(true);
  });

  it('table получает data-mode="semi-auto"', () => {
    const host = makeHost();
    renderJournalTable(host, DENSITY_SPEC, [], {
      mode: 'semi-auto',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    expect(host.querySelector('table')?.getAttribute('data-mode')).toBe('semi-auto');
  });

  it('verdict-классы добавляются на cell в semi-auto', () => {
    const host = makeHost();
    const rowWithVerdict: JournalRow = {
      ...SAMPLE_ROW,
      values: { ...SAMPLE_ROW.values, V_cm3: 15, rho_kg_m3: 4733 },
      verdicts: { V_cm3: 'ok', rho_kg_m3: 'wrong' },
    };
    renderJournalTable(host, DENSITY_SPEC, [rowWithVerdict], {
      mode: 'semi-auto',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    const vCell = host.querySelector<HTMLElement>('td[data-key="V_cm3"]');
    expect(vCell?.classList.contains('j-verdict--ok')).toBe(true);
    const rhoCell = host.querySelector<HTMLElement>('td[data-key="rho_kg_m3"]');
    expect(rhoCell?.classList.contains('j-verdict--wrong')).toBe(true);
  });

  it('placeholder в derived input = единица из spec', () => {
    const host = makeHost();
    renderJournalTable(host, DENSITY_SPEC, [SAMPLE_ROW], {
      mode: 'semi-auto',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    const input = host.querySelector<HTMLInputElement>(
      'td[data-key="V_cm3"] input',
    );
    expect(input?.placeholder).toBe('см³');
  });
});

describe('render — fully-manual режим', () => {
  afterEach(cleanup);

  it('ВСЕ direct и derived cells — input (кроме meta)', () => {
    const host = makeHost();
    renderJournalTable(host, DENSITY_SPEC, [SAMPLE_ROW], {
      mode: 'fully-manual',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    const directCell = host.querySelector<HTMLElement>('td[data-key="m_g"]');
    const derivedCell = host.querySelector<HTMLElement>('td[data-key="V_cm3"]');
    const metaCell = host.querySelector<HTMLElement>('td[data-key="cylinder"]');
    expect(directCell?.querySelector('input.j-input--direct')).not.toBeNull();
    expect(derivedCell?.querySelector('input.j-input--derived')).not.toBeNull();
    expect(metaCell?.querySelector('input')).toBeNull(); // meta всегда read-only
  });

  it('НЕТ ✓-кнопки в строке', () => {
    const host = makeHost();
    renderJournalTable(host, DENSITY_SPEC, [SAMPLE_ROW], {
      mode: 'fully-manual',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    expect(host.querySelector('button.j-check')).toBeNull();
  });

  it('НЕТ заголовка ✓ в thead', () => {
    const host = makeHost();
    renderJournalTable(host, DENSITY_SPEC, [SAMPLE_ROW], {
      mode: 'fully-manual',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    const ths = Array.from(host.querySelectorAll('th'));
    expect(ths.some((th) => th.textContent === '✓')).toBe(false);
  });

  it('verdict-классы НЕ добавляются на cell (педагогика без подсказок)', () => {
    const host = makeHost();
    const rowWithVerdict: JournalRow = {
      ...SAMPLE_ROW,
      values: { ...SAMPLE_ROW.values, V_cm3: 999 },
      verdicts: { V_cm3: 'wrong' },
    };
    renderJournalTable(host, DENSITY_SPEC, [rowWithVerdict], {
      mode: 'fully-manual',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    const vCell = host.querySelector<HTMLElement>('td[data-key="V_cm3"]');
    expect(vCell?.classList.contains('j-verdict--wrong')).toBe(false);
    // data-verdict-атрибут на td остаётся (для тестов/CSS), но без classList.
    expect(vCell?.dataset['verdict']).toBe('wrong');
  });

  it('placeholder в input — пустой (без подсказки единицы)', () => {
    const host = makeHost();
    renderJournalTable(host, DENSITY_SPEC, [SAMPLE_ROW], {
      mode: 'fully-manual',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    const input = host.querySelector<HTMLInputElement>(
      'td[data-key="m_g"] input',
    );
    expect(input?.placeholder).toBe('');
  });

  it('input НЕ получает data-verdict (нет подсветки)', () => {
    const host = makeHost();
    const rowWithVerdict: JournalRow = {
      ...SAMPLE_ROW,
      values: { ...SAMPLE_ROW.values, V_cm3: 15 },
      verdicts: { V_cm3: 'ok' },
    };
    renderJournalTable(host, DENSITY_SPEC, [rowWithVerdict], {
      mode: 'fully-manual',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    const input = host.querySelector<HTMLInputElement>(
      'td[data-key="V_cm3"] input',
    );
    expect(input?.dataset['verdict']).toBeUndefined();
  });
});

describe('render — fully-auto режим', () => {
  afterEach(cleanup);

  it('ВСЕ cells — read-only text (никаких input)', () => {
    const host = makeHost();
    const fullRow: JournalRow = {
      ...SAMPLE_ROW,
      values: { ...SAMPLE_ROW.values, V_cm3: 15, rho_kg_m3: 4733 },
    };
    renderJournalTable(host, DENSITY_SPEC, [fullRow], {
      mode: 'fully-auto',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    const inputs = host.querySelectorAll('input');
    expect(inputs.length).toBe(0);
  });

  it('НЕТ ✓-кнопки', () => {
    const host = makeHost();
    renderJournalTable(host, DENSITY_SPEC, [SAMPLE_ROW], {
      mode: 'fully-auto',
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
    });
    expect(host.querySelector('button.j-check')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// pending.ts
// ═══════════════════════════════════════════════════════════════════

function makePendingHost(): PendingHost {
  const slot = document.createElement('div');
  slot.id = 'record-pending-slot';
  const summary = document.createElement('div');
  summary.id = 'record-pending-summary';
  const button = document.createElement('button');
  button.id = 'record-pending-btn';
  slot.append(summary, button);
  document.body.appendChild(slot);
  return { slot, summary, button };
}

describe('pending — renderPending видимость', () => {
  afterEach(cleanup);

  it('semi-auto + ready + новая signature → плашка показана', () => {
    const host = makePendingHost();
    const shown = renderPending(host, {
      mode: 'semi-auto',
      ready: true,
      signature: 'sig-1',
      lastRecordedSignature: null,
      summary: 'm = 12 г, V₁ = 50 мл',
    });
    expect(shown).toBe(true);
    expect(host.slot.hidden).toBe(false);
    expect(host.summary.textContent).toBe('m = 12 г, V₁ = 50 мл');
  });

  it('fully-manual → плашка скрыта (запись через пустую строку)', () => {
    const host = makePendingHost();
    const shown = renderPending(host, {
      mode: 'fully-manual',
      ready: true,
      signature: 'sig-1',
      lastRecordedSignature: null,
      summary: 's',
    });
    expect(shown).toBe(false);
    expect(host.slot.hidden).toBe(true);
  });

  it('fully-auto → плашка скрыта (запись молча)', () => {
    const host = makePendingHost();
    const shown = renderPending(host, {
      mode: 'fully-auto',
      ready: true,
      signature: 'sig-1',
      lastRecordedSignature: null,
      summary: 's',
    });
    expect(shown).toBe(false);
  });

  it('not ready → плашка скрыта', () => {
    const host = makePendingHost();
    const shown = renderPending(host, {
      mode: 'semi-auto',
      ready: false,
      signature: 'sig-1',
      lastRecordedSignature: null,
      summary: 's',
    });
    expect(shown).toBe(false);
  });

  it('signature совпадает с last → плашка скрыта (защита от дублей)', () => {
    const host = makePendingHost();
    const shown = renderPending(host, {
      mode: 'semi-auto',
      ready: true,
      signature: 'sig-1',
      lastRecordedSignature: 'sig-1',
      summary: 's',
    });
    expect(shown).toBe(false);
  });

  it('пустая signature → плашка скрыта', () => {
    const host = makePendingHost();
    const shown = renderPending(host, {
      mode: 'semi-auto',
      ready: true,
      signature: '',
      lastRecordedSignature: null,
      summary: 's',
    });
    expect(shown).toBe(false);
  });
});

describe('pending — attachPendingClick', () => {
  afterEach(cleanup);

  it('click на кнопке → onCommit вызывается', () => {
    const host = makePendingHost();
    const onCommit = vi.fn();
    const detach = attachPendingClick(host, onCommit);
    host.button.click();
    expect(onCommit).toHaveBeenCalledTimes(1);
    detach();
  });

  it('двойной клик в течение 300ms → onCommit вызван только 1 раз', () => {
    const host = makePendingHost();
    const onCommit = vi.fn();
    const detach = attachPendingClick(host, onCommit);
    host.button.click();
    host.button.click();
    expect(onCommit).toHaveBeenCalledTimes(1);
    detach();
  });

  it('detach() убирает listener', () => {
    const host = makePendingHost();
    const onCommit = vi.fn();
    const detach = attachPendingClick(host, onCommit);
    detach();
    host.button.click();
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('pending — findPendingHost', () => {
  afterEach(cleanup);

  it('возвращает PendingHost когда все 3 элемента есть', () => {
    makePendingHost();
    const host = findPendingHost();
    expect(host).not.toBeNull();
    expect(host?.slot.id).toBe('record-pending-slot');
  });

  it('возвращает null если хоть один элемент отсутствует', () => {
    const slot = document.createElement('div');
    slot.id = 'record-pending-slot';
    document.body.appendChild(slot);
    const host = findPendingHost();
    expect(host).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// recorder.ts
// ═══════════════════════════════════════════════════════════════════

describe('recorder — createRecorder', () => {
  afterEach(cleanup);

  function makeRefs(overrides: Partial<Parameters<typeof createRecorder>[0]> = {}): Parameters<typeof createRecorder>[0] {
    const journalHost = makeHost();
    const pendingHost = makePendingHost();
    return {
      spec: DENSITY_SPEC,
      journalHost,
      pendingHost,
      getMode: vi.fn<() => JournalMode>(() => 'semi-auto'),
      getRows: vi.fn(() => [SAMPLE_ROW]),
      isReady: vi.fn(() => true),
      buildSignature: vi.fn(() => 'sig-1'),
      buildSummary: vi.fn(() => 'm = 71 г'),
      onPendingClick: vi.fn(),
      onCellInput: vi.fn(),
      onVerify: vi.fn(),
      ...overrides,
    };
  }

  it('render() рисует таблицу + pending-плашку (semi-auto + ready)', () => {
    const refs = makeRefs();
    const recorder = createRecorder(refs);
    recorder.render();
    const table = refs.journalHost.querySelector('table.lab-journal-table');
    expect(table).not.toBeNull();
    expect(refs.pendingHost?.slot.hidden).toBe(false);
    expect(refs.pendingHost?.summary.textContent).toBe('m = 71 г');
    recorder.destroy();
  });

  it('markRecorded(sig) → следующий render с тем же signature скрывает pending', () => {
    const refs = makeRefs();
    const recorder = createRecorder(refs);
    recorder.render();
    expect(refs.pendingHost?.slot.hidden).toBe(false);
    recorder.markRecorded('sig-1');
    recorder.render();
    expect(refs.pendingHost?.slot.hidden).toBe(true);
    recorder.destroy();
  });

  it('reset() очищает lastRecordedSignature', () => {
    const refs = makeRefs();
    const recorder = createRecorder(refs);
    recorder.markRecorded('sig-1');
    recorder.reset();
    recorder.render();
    expect(refs.pendingHost?.slot.hidden).toBe(false);
    recorder.destroy();
  });

  it('click на pending → onPendingClick вызывается', () => {
    const refs = makeRefs();
    const recorder = createRecorder(refs);
    recorder.render();
    refs.pendingHost?.button.click();
    expect(refs.onPendingClick).toHaveBeenCalledTimes(1);
    recorder.destroy();
  });

  it('destroy() убирает listener', () => {
    const refs = makeRefs();
    const recorder = createRecorder(refs);
    recorder.destroy();
    refs.pendingHost?.button.click();
    expect(refs.onPendingClick).not.toHaveBeenCalled();
  });

  it('режим fully-manual → pending скрыт, ✓ в таблице нет', () => {
    const refs = makeRefs({ getMode: vi.fn<() => JournalMode>(() => 'fully-manual') });
    const recorder = createRecorder(refs);
    recorder.render();
    expect(refs.pendingHost?.slot.hidden).toBe(true);
    expect(refs.journalHost.querySelector('button.j-check')).toBeNull();
    recorder.destroy();
  });
});

// ═══════════════════════════════════════════════════════════════════
// record-mode.ts — teacher-override
// ═══════════════════════════════════════════════════════════════════

describe('record-mode — teacher-override URL', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // happy-dom support: location может быть mutable. Если нет — fallback.
    try {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: { ...originalLocation, search: '' },
      });
    } catch {
      /* ignore — happy-dom legacy may not allow */
    }
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    try {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: originalLocation,
      });
    } catch {
      /* ignore */
    }
  });

  it('без URL ?mode → override = null, locked = false', () => {
    expect(getModeOverride()).toBeNull();
    expect(isModeLocked()).toBe(false);
  });

  it('?mode=fully-manual → override = fully-manual, locked = true', () => {
    window.location.search = '?mode=fully-manual';
    expect(getModeOverride()).toBe('fully-manual');
    expect(isModeLocked()).toBe(true);
  });

  it('?mode=semi-auto → override = semi-auto', () => {
    window.location.search = '?mode=semi-auto';
    expect(getModeOverride()).toBe('semi-auto');
  });

  it('?mode=fully-auto → override = fully-auto', () => {
    window.location.search = '?mode=fully-auto';
    expect(getModeOverride()).toBe('fully-auto');
  });

  it('legacy ?mode=manual → нормализуется в semi-auto', () => {
    window.location.search = '?mode=manual';
    expect(getModeOverride()).toBe('semi-auto');
  });

  it('legacy ?mode=auto → нормализуется в fully-auto', () => {
    window.location.search = '?mode=auto';
    expect(getModeOverride()).toBe('fully-auto');
  });

  it('?mode=garbage → null (toggle работает как обычно)', () => {
    window.location.search = '?mode=invalid';
    expect(getModeOverride()).toBeNull();
    expect(isModeLocked()).toBe(false);
  });

  it('override побеждает localStorage', () => {
    setRecordMode('test-kit', 'fully-manual');
    window.location.search = '?mode=fully-auto';
    expect(getRecordMode('test-kit')).toBe('fully-auto');
  });

  it('setRecordMode no-op при активном override', () => {
    window.location.search = '?mode=fully-manual';
    setRecordMode('test-kit', 'semi-auto');
    window.location.search = '';
    // После снятия override должен остаться DEFAULT (не "semi-auto" от ученика)
    expect(getRecordMode('test-kit')).toBe(DEFAULT_RECORD_MODE);
  });
});

// ═══════════════════════════════════════════════════════════════════
// applyRecordModeAttribute — глобальный body-атрибут для CSS-правил
// «без подсказок» в fully-manual.
// ═══════════════════════════════════════════════════════════════════

describe('record-mode — applyRecordModeAttribute (no-hints в fully-manual)', () => {
  afterEach(() => {
    delete document.body.dataset['recordMode'];
  });

  it('пишет data-record-mode на body', () => {
    applyRecordModeAttribute('fully-manual');
    expect(document.body.dataset['recordMode']).toBe('fully-manual');
  });

  it('перезаписывает при смене режима', () => {
    applyRecordModeAttribute('semi-auto');
    expect(document.body.dataset['recordMode']).toBe('semi-auto');
    applyRecordModeAttribute('fully-auto');
    expect(document.body.dataset['recordMode']).toBe('fully-auto');
  });

  it('renderRecordModeToggle ставит body-атрибут при init', () => {
    try {
      localStorage.setItem('inter-oge.record-mode.test-kit', 'fully-manual');
    } catch {
      /* ignore */
    }
    const host = makeHost();
    // dynamic import to keep dependencies minimal
    const detach = renderRecordModeToggle(host, { kitId: 'test-kit' });
    expect(document.body.dataset['recordMode']).toBe('fully-manual');
    detach();
  });

  it('click на сегмент toggle обновляет body-атрибут', () => {
    const host = makeHost();
    const detach = renderRecordModeToggle(host, { kitId: 'test-kit-2' });
    const fullyManualBtn = host.querySelector<HTMLButtonElement>(
      'button[data-mode="fully-manual"]',
    );
    fullyManualBtn?.click();
    expect(document.body.dataset['recordMode']).toBe('fully-manual');
    const fullyAutoBtn = host.querySelector<HTMLButtonElement>(
      'button[data-mode="fully-auto"]',
    );
    fullyAutoBtn?.click();
    expect(document.body.dataset['recordMode']).toBe('fully-auto');
    detach();
  });
});
