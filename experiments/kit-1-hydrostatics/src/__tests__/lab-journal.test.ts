/**
 * lab-journal — render-тесты + публичный API.
 *
 * Этап 4 спеки 2026-05-07: тетрадь-журнал опыта 1.2 «Архимед».
 * Покрывает: render empty/with rows, RU-форматирование чисел, 3-цветную
 * tolerance, formula-card fade-in, updateRow / removeRow / clear,
 * экспорт CSV (header, разделитель `;`, имя файла), exportPDF (класс
 * `printing-journal`), teacher-mode (extra-колонка + общая оценка),
 * ARIA roles, prefers-reduced-motion.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(async () => {
  await import('../ui/components/lab-journal');
});

afterEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
});

type LabJournalEl = HTMLElement & {
  getRows: () => ReadonlyArray<{
    cylinder: 'No2' | 'No3' | 'No4';
    V_cm3: number;
    P_air_N: number | null;
    P_liquid_N: number | null;
    F_A_meas_N: number | null;
    F_A_theor_N: number;
    delta_pct: number | null;
    context: { cylinder_id: string; liquid: 'water'; V_water_ml: number };
    timestamp: number;
  }>;
  addRow: (row: {
    cylinder: 'No2' | 'No3' | 'No4';
    V_cm3: number;
    P_air_N: number | null;
    P_liquid_N: number | null;
    F_A_meas_N: number | null;
    F_A_theor_N: number;
    delta_pct: number | null;
    context: { cylinder_id: string; liquid: 'water'; V_water_ml: number };
  }) => number;
  updateRow: (ts: number, patch: Record<string, unknown>) => void;
  removeRow: (ts: number) => void;
  clear: () => void;
  exportCSV: (filename?: string) => void;
  exportPDF: (filename?: string) => void;
};

function mount(attrs: Record<string, string> = {}): LabJournalEl {
  const el = document.createElement('lab-journal') as LabJournalEl;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

const baseRow = (over: Partial<{ cylinder: 'No2' | 'No3' | 'No4'; V_cm3: number; P_air_N: number | null; P_liquid_N: number | null; V_water_ml: number }> = {}) => {
  const cylinder = over.cylinder ?? 'No2';
  return {
    cylinder,
    V_cm3: over.V_cm3 ?? 25,
    P_air_N: over.P_air_N === undefined ? 0.69 : over.P_air_N,
    P_liquid_N: over.P_liquid_N === undefined ? 0.445 : over.P_liquid_N,
    // эти три перезатрутся recomputeRow внутри addRow:
    F_A_meas_N: 0,
    F_A_theor_N: 0,
    delta_pct: 0,
    context: { cylinder_id: cylinder, liquid: 'water' as const, V_water_ml: over.V_water_ml ?? 200 },
  };
};

describe('lab-journal — render empty', () => {
  it('пустой журнал → empty-state, нет таблицы, formula-card скрыт, кнопки экспорта disabled', () => {
    const el = mount();
    const root = el.shadowRoot!;
    expect(root.querySelector('.empty')).not.toBeNull();
    expect(root.querySelector('table')).toBeNull();

    const formula = root.querySelector('.formula-card');
    expect(formula).not.toBeNull();
    // hidden или data-visible="false"
    expect(formula!.hasAttribute('hidden')).toBe(true);

    const csvBtn = root.querySelector<HTMLButtonElement>('[data-action="csv"]')!;
    const pdfBtn = root.querySelector<HTMLButtonElement>('[data-action="pdf"]')!;
    expect(csvBtn.disabled).toBe(true);
    expect(pdfBtn.disabled).toBe(true);
  });

  it('таблица имеет ARIA roles role="table" и колонки role="columnheader"', () => {
    const el = mount();
    el.addRow(baseRow());
    const root = el.shadowRoot!;
    const table = root.querySelector('table[role="table"]');
    expect(table).not.toBeNull();
    const heads = root.querySelectorAll('[role="columnheader"]');
    // в student-режиме 9 колонок
    expect(heads.length).toBe(9);
  });
});

describe('lab-journal — addRow и числовое форматирование', () => {
  it('addRow с P_air=0.69, P_liquid=0.445, V=25 → строка с RU-форматом (0,69 не 0.69), F_A_meas=0,245', () => {
    const el = mount();
    const ts = el.addRow(baseRow({ V_cm3: 25, P_air_N: 0.69, P_liquid_N: 0.445 }));
    expect(typeof ts).toBe('number');

    const root = el.shadowRoot!;
    // Берём содержимое таблицы, не всей shadow (style+font-family содержат «e-», «.»)
    const tbodyText = root.querySelector('tbody')!.textContent ?? '';
    // Запятая, не точка
    expect(tbodyText).toContain('0,69');
    // 0.445 → toFixed(2) → "0.45" → "0,45"
    expect(tbodyText).toContain('0,45');
    // F_A_meas (3 знака после запятой)
    expect(tbodyText).toContain('0,245');
    // V с одним знаком
    expect(tbodyText).toContain('25,0');
    // не должно быть «0.69»
    expect(tbodyText).not.toContain('0.69');
  });

  it('после addRow getRows() возвращает строку с правильно вычисленным F_A_theor (~0,245 для V=25см³ в воде)', () => {
    const el = mount();
    el.addRow(baseRow({ V_cm3: 25 }));
    const rows = el.getRows();
    expect(rows.length).toBe(1);
    const r = rows[0]!;
    // F_A_theor = 1000 · 9.8 · 25e-6 = 0.245
    expect(r.F_A_theor_N).toBeCloseTo(0.245, 5);
    // F_A_meas = 0.69 - 0.445 = 0.245
    expect(r.F_A_meas_N).toBeCloseTo(0.245, 5);
    // delta ≈ 0
    expect(Math.abs(r.delta_pct ?? 99)).toBeLessThan(0.5);
  });

  it('row-added событие — bubbles+composed, detail.row корректен', () => {
    const el = mount();
    const captured: unknown[] = [];
    document.addEventListener('row-added', (e) => captured.push((e as CustomEvent).detail));
    el.addRow(baseRow());
    expect(captured.length).toBe(1);
    const detail = captured[0] as { row: { F_A_meas_N: number } };
    expect(detail.row.F_A_meas_N).toBeCloseTo(0.245, 5);
  });

  it('null в P_air → F_A_meas=null, delta_pct=null, status-ячейка пуста (verdict=pending)', () => {
    const el = mount();
    el.addRow(baseRow({ P_air_N: null }));
    const rows = el.getRows();
    expect(rows[0]!.F_A_meas_N).toBeNull();
    expect(rows[0]!.delta_pct).toBeNull();
    const root = el.shadowRoot!;
    const status = root.querySelector('.status-cell');
    expect(status).not.toBeNull();
    expect(status!.getAttribute('data-verdict')).toBeNull();
    expect(status!.textContent?.trim()).toBe('');
  });
});

describe('lab-journal — tolerance 3 цвета', () => {
  it('|Δ|≈1% → ✓ (verdict="ok"), tooltip «Отличный результат»', () => {
    const el = mount();
    // V=25 cm³ → F_theor=0.245. F_meas=0.2475 → delta = +1.02%
    el.addRow(baseRow({ V_cm3: 25, P_air_N: 0.69, P_liquid_N: 0.4425 }));
    const status = el.shadowRoot!.querySelector('.status-cell')!;
    expect(status.getAttribute('data-verdict')).toBe('ok');
    expect(status.getAttribute('title')).toMatch(/Отличный/);
    expect(status.textContent?.trim()).toBe('✓');
  });

  it('|Δ|≈3% → ≈ (verdict="close"), жёлтый, tooltip «Близко»', () => {
    const el = mount();
    // F_theor=0.245, нужно F_meas ~ 0.2524 → delta ~ +3%
    el.addRow(baseRow({ V_cm3: 25, P_air_N: 0.69, P_liquid_N: 0.4376 }));
    const status = el.shadowRoot!.querySelector('.status-cell')!;
    expect(status.getAttribute('data-verdict')).toBe('close');
    expect(status.getAttribute('title')).toMatch(/Близко/);
    expect(status.textContent?.trim()).toBe('≈');
  });

  it('|Δ|≈8% → ✗ (verdict="wrong"), красный, tooltip «Проверьте»', () => {
    const el = mount();
    // F_theor=0.245, F_meas=0.2646 → delta = +8%
    el.addRow(baseRow({ V_cm3: 25, P_air_N: 0.69, P_liquid_N: 0.4254 }));
    const status = el.shadowRoot!.querySelector('.status-cell')!;
    expect(status.getAttribute('data-verdict')).toBe('wrong');
    expect(status.getAttribute('title')).toMatch(/Проверьте/);
    expect(status.textContent?.trim()).toBe('✗');
  });

  it('отрицательный delta — знак «−» (минус юникод), форматируется ровно так же', () => {
    const el = mount();
    // F_meas меньше теоретического → отрицательный delta
    el.addRow(baseRow({ V_cm3: 25, P_air_N: 0.69, P_liquid_N: 0.46 })); // F_meas=0.23, delta≈−6.1%
    const root = el.shadowRoot!;
    const text = root.textContent ?? '';
    expect(text).toMatch(/−6,1|−6,12|−6/); // округление до 1 знака
    const status = root.querySelector('.status-cell')!;
    expect(status.getAttribute('data-verdict')).toBe('wrong');
  });
});

describe('lab-journal — formula-card implicit scaffolding', () => {
  it('formula-card hidden пока нет полной строки (только P_air без P_liquid)', () => {
    const el = mount();
    el.addRow(baseRow({ P_air_N: 0.69, P_liquid_N: null }));
    const card = el.shadowRoot!.querySelector('.formula-card')!;
    expect(card.hasAttribute('hidden')).toBe(true);
  });

  it('formula-card visible после первой полной строки (оба P не null)', () => {
    const el = mount();
    el.addRow(baseRow({ P_air_N: 0.69, P_liquid_N: 0.445 }));
    const card = el.shadowRoot!.querySelector('.formula-card')!;
    expect(card.hasAttribute('hidden')).toBe(false);
    expect(card.getAttribute('data-visible')).toBe('true');
    expect(card.textContent).toMatch(/F_A.*=.*P_возд.*−.*P_жид/);
  });

  it('formula-card имеет CSS-transition для fade-in 200ms', () => {
    const el = mount();
    el.addRow(baseRow());
    const styleText = el.shadowRoot!.querySelector('style')!.textContent ?? '';
    expect(styleText).toMatch(/--fade-dur:\s*200ms/);
    expect(styleText).toMatch(/transition:\s*opacity var\(--fade-dur\)/);
  });
});

describe('lab-journal — updateRow', () => {
  it('updateRow с patch.P_liquid_N → пересчитывает F_A_meas и delta_pct', () => {
    const el = mount();
    const ts = el.addRow(baseRow({ V_cm3: 25, P_air_N: 0.69, P_liquid_N: null }));
    expect(el.getRows()[0]!.F_A_meas_N).toBeNull();
    el.updateRow(ts, { P_liquid_N: 0.445 });
    const r = el.getRows()[0]!;
    expect(r.F_A_meas_N).toBeCloseTo(0.245, 5);
    expect(r.delta_pct).not.toBeNull();
  });

  it('updateRow с несуществующим ts → no-op + console.warn в DEV', () => {
    const el = mount();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    el.addRow(baseRow());
    el.updateRow(99999999, { P_liquid_N: 0.5 });
    // если DEV — warn вызван хотя бы 1 раз; если PROD — 0 раз. В тестах режим DEV.
    if (import.meta.env?.DEV) expect(warn).toHaveBeenCalled();
    expect(el.getRows().length).toBe(1);
    warn.mockRestore();
  });

  it('updateRow не меняет timestamp', () => {
    const el = mount();
    const ts = el.addRow(baseRow());
    el.updateRow(ts, { P_liquid_N: 0.4 });
    expect(el.getRows()[0]!.timestamp).toBe(ts);
  });
});

describe('lab-journal — removeRow и clear', () => {
  it('removeRow удаляет строку, эмитит row-removed', () => {
    const el = mount();
    const captured: unknown[] = [];
    document.addEventListener('row-removed', (e) => captured.push((e as CustomEvent).detail));
    const ts = el.addRow(baseRow());
    el.addRow(baseRow({ cylinder: 'No3', V_cm3: 56 }));
    expect(el.getRows().length).toBe(2);
    el.removeRow(ts);
    expect(el.getRows().length).toBe(1);
    expect(el.getRows()[0]!.cylinder).toBe('No3');
    expect(captured).toEqual([{ ts }]);
  });

  it('clear → пустой журнал, событие cleared', () => {
    const el = mount();
    let cleared = 0;
    document.addEventListener('cleared', () => cleared++);
    el.addRow(baseRow());
    el.addRow(baseRow({ cylinder: 'No4', V_cm3: 34 }));
    el.clear();
    expect(el.getRows().length).toBe(0);
    expect(cleared).toBe(1);
    expect(el.shadowRoot!.querySelector('.empty')).not.toBeNull();
  });

  it('clear на пустом журнале — no-op (cleared не эмитится)', () => {
    const el = mount();
    let cleared = 0;
    document.addEventListener('cleared', () => cleared++);
    el.clear();
    expect(cleared).toBe(0);
  });
});

describe('lab-journal — exportCSV', () => {
  it('exportCSV вызывает Blob + a.click() с правильным расширением и role в имени', () => {
    const el = mount({ 'experiment-id': '1.2', role: 'student' });
    el.addRow(baseRow());

    const clicks: Array<{ download: string; href: string }> = [];
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const node = origCreate(tag) as HTMLElement;
      if (tag === 'a') {
        const a = node as HTMLAnchorElement;
        const origClick = a.click.bind(a);
        a.click = (): void => {
          clicks.push({ download: a.download, href: a.href });
          origClick();
        };
      }
      return node;
    });

    el.exportCSV();
    expect(clicks.length).toBe(1);
    expect(clicks[0]!.download).toMatch(/^Кит1_Опыт1\.2_student_\d{4}-\d{2}-\d{2}\.csv$/);
    vi.restoreAllMocks();
  });

  it('exportCSV в teacher-режиме с student-name → имя файла включает имя ученика', () => {
    const el = mount({
      'experiment-id': '1.2',
      role: 'teacher',
      'student-name': 'Иванов',
    });
    el.addRow(baseRow());

    const clicks: string[] = [];
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const node = origCreate(tag) as HTMLElement;
      if (tag === 'a') {
        (node as HTMLAnchorElement).click = function (this: HTMLAnchorElement) {
          clicks.push(this.download);
        };
      }
      return node;
    });

    el.exportCSV();
    expect(clicks[0]).toMatch(/Кит1_Опыт1\.2_teacher_Иванов_\d{4}-\d{2}-\d{2}\.csv/);
    vi.restoreAllMocks();
  });

  it('exportCSV эмитит "exported" event с detail.format="csv"', () => {
    const el = mount();
    el.addRow(baseRow());
    let captured: { format: string; filename?: string } | null = null;
    document.addEventListener('exported', (e) => {
      captured = (e as CustomEvent).detail as { format: string };
    });
    // подменяем createElement, чтобы не качать файл
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const node = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      if (tag === 'a') (node as HTMLAnchorElement).click = (): void => undefined;
      return node;
    });

    el.exportCSV();
    expect(captured).not.toBeNull();
    expect(captured!.format).toBe('csv');
    vi.restoreAllMocks();
  });
});

describe('lab-journal — exportPDF', () => {
  it('exportPDF ставит body.printing-journal и зовёт window.print()', () => {
    const el = mount();
    el.addRow(baseRow());
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    let classDuringPrint = '';
    printSpy.mockImplementation(() => {
      classDuringPrint = document.body.className;
    });
    el.exportPDF();
    expect(printSpy).toHaveBeenCalled();
    expect(classDuringPrint).toContain('printing-journal');
    printSpy.mockRestore();
  });

  it('exportPDF эмитит "exported" event с detail.format="pdf"', () => {
    const el = mount();
    el.addRow(baseRow());
    let captured: { format: string } | null = null;
    document.addEventListener('exported', (e) => {
      captured = (e as CustomEvent).detail as { format: string };
    });
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
    el.exportPDF();
    expect(captured).not.toBeNull();
    expect(captured!.format).toBe('pdf');
    vi.restoreAllMocks();
  });
});

describe('lab-journal — teacher-mode', () => {
  it('role="teacher" → 10 columnheader (на 1 больше student) с extra-колонкой F_A табл.', () => {
    const el = mount({ role: 'teacher' });
    el.addRow(baseRow());
    const heads = el.shadowRoot!.querySelectorAll('[role="columnheader"]');
    expect(heads.length).toBe(10);
    const lastHeader = heads[heads.length - 1]!;
    expect(lastHeader.textContent).toMatch(/F_A табл/);
  });

  it('role="teacher" → summary-блок с общей оценкой 0–100% (доля строк с ✓)', () => {
    const el = mount({ role: 'teacher' });
    // 2 строки: одна ok (delta≈0), одна wrong (delta≈+8%)
    el.addRow(baseRow({ V_cm3: 25, P_air_N: 0.69, P_liquid_N: 0.445 })); // ok
    el.addRow(baseRow({ V_cm3: 25, P_air_N: 0.69, P_liquid_N: 0.4254 })); // wrong (+8%)
    const summary = el.shadowRoot!.querySelector('.summary')!;
    expect(summary).not.toBeNull();
    // 1 из 2 → 50%
    expect(summary.textContent).toMatch(/50%/);
  });

  it('student mode → нет summary-блока, нет extra-колонки', () => {
    const el = mount({ role: 'student' });
    el.addRow(baseRow());
    expect(el.shadowRoot!.querySelector('.summary')).toBeNull();
    expect(el.shadowRoot!.querySelectorAll('[role="columnheader"]').length).toBe(9);
  });
});

describe('lab-journal — numeric edge cases', () => {
  it('очень маленькое V (0.5 см³) → F_A_theor ≈ 0,005, форматируется без потери точности', () => {
    const el = mount();
    el.addRow(baseRow({ V_cm3: 0.5, P_air_N: 0.01, P_liquid_N: 0.005 }));
    const r = el.getRows()[0]!;
    expect(r.F_A_theor_N).toBeCloseTo(0.0049, 4);
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('0,005'); // 3 знака после запятой
  });

  it('очень большое V (1000 см³) → F_A_theor=9.8 Н, формат без научной нотации', () => {
    const el = mount();
    el.addRow(baseRow({ V_cm3: 1000, P_air_N: 12, P_liquid_N: 2.2 }));
    const tbodyText = el.shadowRoot!.querySelector('tbody')!.textContent ?? '';
    expect(tbodyText).toContain('9,800');
    expect(tbodyText).not.toMatch(/e[+-]/i);
  });

  it('reduced motion: --fade-dur уважается через @media (prefers-reduced-motion: reduce)', () => {
    const el = mount();
    el.addRow(baseRow());
    const styleText = el.shadowRoot!.querySelector('style')!.textContent ?? '';
    expect(styleText).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(styleText).toMatch(/--fade-dur:\s*0ms/);
  });
});
