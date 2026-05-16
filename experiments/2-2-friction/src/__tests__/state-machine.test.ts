/**
 * STATE MACHINE TESTS — опыт 2.2 «Трение скольжения», интеграционная цепочка.
 *
 * Тесты проверяют именно ОРКЕСТРАТОР (FrictionExperiment), не чистую физику.
 * Цель: ловить классы багов:
 *   - «брусок не возвращается на старт после reset»
 *   - «грузы дублируются на бруске»
 *   - «динамометр после detach показывает старую силу»
 *   - «detach груза не убирает из state.weightsOnBlock»
 *   - «detach бруска не очищает дин и грузы»
 *   - «applyForce(0) после скольжения не возвращает в покой»
 *   - «setSurface не пересчитывает μ»
 *
 * SET-UP: импортируем компоненты единожды, в каждом тесте — свежий DOM
 * и свежий experiment.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../ui/components/lab-button';
import '../ui/components/lab-checkbox-preview';
import '../ui/components/lab-weight';
import '../ui/components/lab-graph';
import '../ui/components/lab-tray';
import '../ui/components/lab-equipment-card';
import '../ui/components/lab-block';
import '../ui/components/lab-friction-track';
import '../ui/components/lab-dynamometer-h';
import '../ui/components/lab-flat-weight';

import { FrictionExperiment, type ExperimentRefs } from '../FrictionExperiment';
import type { LabFrictionTrack } from '../ui/components/lab-friction-track';
import type { LabGraph } from '../ui/components/lab-graph';
import type { LabEquipmentCard } from '../ui/components/lab-equipment-card';

let exp: FrictionExperiment;
let cachedHtml: string | null = null;

function loadHtml(): string {
  if (cachedHtml) return cachedHtml;
  const htmlPath = resolve(__dirname, '../../index.html');
  const full = readFileSync(htmlPath, 'utf-8');
  const m = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  cachedHtml = (m ? m[1]! : full).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  return cachedHtml;
}

function createExperiment(): FrictionExperiment {
  document.body.innerHTML = loadHtml();

  const refs: ExperimentRefs = {
    stage: document.getElementById('stage')!,
    trackContainer: document.getElementById('track-container')!,
    track: document.getElementById('track') as LabFrictionTrack,
    dragOverlay: document.getElementById('drag-overlay')!,
    dropZoneTrack: document.getElementById('drop-zone-track')!,
    dropZoneBlockTop: document.getElementById('drop-zone-block-top')!,
    dropZoneBlockHook: document.getElementById('drop-zone-block-hook')!,
    hintBar: document.getElementById('hint-bar')!,
    journalEmpty: document.getElementById('journal-empty')!,
    // §21: legacy stubs.
    journalTable: (document.getElementById('journal-table') ?? document.createElement('table')) as HTMLTableElement,
    journalBody: document.getElementById('journal-body') ?? document.createElement('tbody'),
    ...(document.getElementById('journal-host')
      ? { journalHost: document.getElementById('journal-host')! }
      : {}),
    liveRegion: document.getElementById('live-region')!,
    resultPanel: document.getElementById('result-panel')!,
    graph: document.getElementById('graph') as LabGraph,
    recordBtn: document.getElementById('record-btn') as HTMLButtonElement,
    resetBtn: document.getElementById('reset-btn') as HTMLButtonElement,
    cards: document.querySelectorAll<LabEquipmentCard>('lab-equipment-card'),
    measurementPanel: document.getElementById('measurement-panel')!,
    measurementToggle: document.getElementById('measurement-toggle') as HTMLButtonElement,
    measurementCount: document.getElementById('measurement-count')!,
    steps: document.getElementById('steps')!,
    surfaceToggle: document.getElementById('surface-toggle')!,
    weighBtn: document.getElementById('weigh-btn') as HTMLButtonElement,
    recordForm: document.getElementById('record-form') as HTMLFormElement,
    rfMblock: document.getElementById('rf-mblock') as HTMLInputElement,
    rfMweights: document.getElementById('rf-mweights') as HTMLOutputElement,
    rfFriction: document.getElementById('rf-friction') as HTMLInputElement,
    rfCancel: document.getElementById('rf-cancel') as HTMLButtonElement,
    rfSubmit: document.getElementById('rf-submit') as HTMLButtonElement,
  };
  return new FrictionExperiment(refs);
}

beforeAll(() => loadHtml());
beforeEach(() => {
  exp = createExperiment();
});
afterEach(() => {
  if (exp) exp.reset();
});

function snapshot(): {
  attachedCount: number;
  block: string | null;
  dyno: string | null;
  weights: string[];
  cardStatuses: Record<string, string>;
  journalRows: number;
} {
  const wrappers = Array.from(document.querySelectorAll<HTMLElement>('.attached-eq'));
  const cards = Array.from(document.querySelectorAll<HTMLElement>('lab-equipment-card[data-eq]'));
  const cardStatuses: Record<string, string> = {};
  for (const c of cards) {
    cardStatuses[c.dataset['eq']!] = c.getAttribute('status') ?? 'unknown';
  }
  let block: string | null = null;
  let dyno: string | null = null;
  const weights: string[] = [];
  for (const w of wrappers) {
    const id = w.dataset['equipmentId'];
    if (!id) continue;
    if (id === 'block') block = id;
    else if (id.startsWith('dyno-')) dyno = id;
    else weights.push(id);
  }
  const journalRows = document.querySelectorAll('.lab-journal-body tr').length;
  return { attachedCount: wrappers.length, block, dyno, weights, cardStatuses, journalRows };
}

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ A: ATTACH БРУСКА
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-A: брусок', () => {
  it('SM-A1: attachBlock первый раз → wrappers=1, статус карты=in-use', () => {
    expect(exp.attachBlock()).toBe(true);
    const s = snapshot();
    expect(s.block).toBe('block');
    expect(s.cardStatuses['block']).toBe('in-use');
  });

  it('SM-A2: повторный attachBlock → false', () => {
    exp.attachBlock();
    expect(exp.attachBlock()).toBe(false);
  });

  it('SM-A3: reset → status=available и wrappers=0', () => {
    exp.attachBlock();
    exp.reset();
    const s = snapshot();
    expect(s.attachedCount).toBe(0);
    expect(s.cardStatuses['block']).toBe('available');
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ B: ГРУЗЫ НА БРУСКЕ
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-B: грузы на бруске', () => {
  it('SM-B1: attachWeight без бруска → false', () => {
    expect(exp.attachWeightById('w-100-1')).toBe(false);
  });

  it('SM-B2: брусок + 1 груз → wrappers=2', () => {
    exp.attachBlock();
    expect(exp.attachWeightById('w-100-1')).toBe(true);
    expect(snapshot().attachedCount).toBe(2);
  });

  it('SM-B3: брусок + 3 груза → wrappers=4', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachWeightById('w-100-2');
    exp.attachWeightById('w-100-3');
    const s = snapshot();
    expect(s.attachedCount).toBe(4);
    expect(s.weights.length).toBe(3);
  });

  it('SM-B4: тот же груз дважды → false', () => {
    exp.attachBlock();
    expect(exp.attachWeightById('w-100-1')).toBe(true);
    expect(exp.attachWeightById('w-100-1')).toBe(false);
  });

  it('SM-B5: после reset все 3 груза status=available', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachWeightById('w-100-2');
    exp.attachWeightById('w-100-3');
    exp.reset();
    const s = snapshot();
    expect(s.cardStatuses['w-100-1']).toBe('available');
    expect(s.cardStatuses['w-100-2']).toBe('available');
    expect(s.cardStatuses['w-100-3']).toBe('available');
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ C: ДИНАМОМЕТР НА КРЮЧКЕ БРУСКА
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-C: динамометр', () => {
  it('SM-C1: attachDyno без бруска → false', () => {
    expect(exp.attachDynamometerById('dyno-1')).toBe(false);
  });

  it('SM-C2: брусок + дин → wrappers=2', () => {
    exp.attachBlock();
    expect(exp.attachDynamometerById('dyno-1')).toBe(true);
    expect(snapshot().attachedCount).toBe(2);
  });

  it('SM-C3: 2 дина одновременно → false', () => {
    exp.attachBlock();
    expect(exp.attachDynamometerById('dyno-1')).toBe(true);
    expect(exp.attachDynamometerById('dyno-5')).toBe(false);
  });

  it('SM-C4: дин может быть прицеплен и со грузами на бруске', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    expect(exp.attachDynamometerById('dyno-1')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ D: DETACH через X-кнопки
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-D: detach через X', () => {
  it('SM-D1: detach бруска → reset всей сцены', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachDynamometerById('dyno-1');
    expect(snapshot().attachedCount).toBe(3);
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="block"] > .lab-detach-btn')
      ?.click();
    expect(snapshot().attachedCount).toBe(0);
  });

  it('SM-D2: detach дина → брусок и грузы остаются', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachDynamometerById('dyno-1');
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="dyno-1"] > .lab-detach-btn')
      ?.click();
    const s = snapshot();
    expect(s.block).toBe('block');
    expect(s.weights).toContain('w-100-1');
    expect(s.dyno).toBeNull();
    expect(s.cardStatuses['dyno-1']).toBe('available');
  });

  it('SM-D3: detach груза → этот груз убран, остальные остаются', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachWeightById('w-100-2');
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="w-100-1"] > .lab-detach-btn')
      ?.click();
    const s = snapshot();
    expect(s.weights).not.toContain('w-100-1');
    expect(s.weights).toContain('w-100-2');
    expect(s.cardStatuses['w-100-1']).toBe('available');
    expect(s.cardStatuses['w-100-2']).toBe('in-use');
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ E: ROUND-TRIP
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-E: round-trip', () => {
  it('SM-E1: attach + reset → все карты available', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachWeightById('w-100-2');
    exp.attachDynamometerById('dyno-1');
    exp.reset();
    const s = snapshot();
    expect(s.attachedCount).toBe(0);
    for (const id of ['block', 'dyno-1', 'dyno-5', 'w-100-1', 'w-100-2', 'w-100-3']) {
      expect(s.cardStatuses[id]).toBe('available');
    }
  });

  it('SM-E2: 10 циклов attach+reset — state стабилен', () => {
    for (let i = 0; i < 10; i++) {
      exp.attachBlock();
      exp.attachWeightById('w-100-1');
      exp.attachDynamometerById('dyno-1');
      exp.reset();
      expect(snapshot().attachedCount).toBe(0);
    }
  });

  it('SM-E3: вручную detach всех через X == initial', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachDynamometerById('dyno-1');
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="dyno-1"] > .lab-detach-btn')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="w-100-1"] > .lab-detach-btn')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="block"] > .lab-detach-btn')
      ?.click();
    const s = snapshot();
    expect(s.attachedCount).toBe(0);
    expect(s.cardStatuses['block']).toBe('available');
    expect(s.cardStatuses['dyno-1']).toBe('available');
    expect(s.cardStatuses['w-100-1']).toBe('available');
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ F: ВОЗВРАТ ПРИБОРОВ К НУЛЮ
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-F: показания приборов после detach', () => {
  it('SM-F1: applyForce → дин показывает >0; detach → в карте показывает 0', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachDynamometerById('dyno-1');
    exp.applyForce(0.3);
    const dynoOnScene = document.querySelector<Element>(
      '.attached-eq[data-equipment-id="dyno-1"] lab-dynamometer-h',
    );
    expect(Number(dynoOnScene?.getAttribute('force') ?? 0)).toBeGreaterThan(0);
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="dyno-1"] > .lab-detach-btn')
      ?.click();
    const dynoInCard = document.querySelector<Element>(
      'lab-equipment-card[data-eq="dyno-1"] lab-dynamometer-h',
    );
    expect(Number(dynoInCard?.getAttribute('force') ?? 0)).toBe(0);
  });

  it('SM-F2: applyForce(0) после applyForce(>0) → дин на 0', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachDynamometerById('dyno-1');
    exp.applyForce(0.5);
    const dyno = document.querySelector<Element>(
      '.attached-eq[data-equipment-id="dyno-1"] lab-dynamometer-h',
    );
    expect(Number(dyno?.getAttribute('force') ?? 0)).toBeGreaterThan(0);
    exp.applyForce(0);
    expect(Number(dyno?.getAttribute('force') ?? 0)).toBe(0);
  });

  it('SM-F3: после reset дин в карте показывает 0', () => {
    exp.attachBlock();
    exp.attachDynamometerById('dyno-1');
    exp.applyForce(0.4);
    exp.reset();
    const dynoInCard = document.querySelector<Element>(
      'lab-equipment-card[data-eq="dyno-1"] lab-dynamometer-h',
    );
    expect(Number(dynoInCard?.getAttribute('force') ?? 0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ G: ИДЕМПОТЕНТНОСТЬ RESET
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-G: reset идемпотентен', () => {
  it('SM-G1: reset на пустой сцене не падает', () => {
    expect(() => exp.reset()).not.toThrow();
  });

  it('SM-G2: 5 reset подряд → state=initial', () => {
    for (let i = 0; i < 5; i++) exp.reset();
    expect(snapshot().attachedCount).toBe(0);
  });

  it('SM-G3: reset во время скольжения не падает', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachDynamometerById('dyno-1');
    exp.applyForce(2.0); // достаточно для срыва
    expect(() => exp.reset()).not.toThrow();
    expect(snapshot().attachedCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ H: ПОВЕРХНОСТИ
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-H: переключение поверхности', () => {
  it('SM-H1: setSurface(B) → атрибут трека обновлён', () => {
    exp.setSurface('B');
    const track = document.getElementById('track');
    expect(track?.getAttribute('surface')).toBe('B');
  });

  it('SM-H2: setSurface работает до и после прикрепления бруска', () => {
    exp.setSurface('B');
    exp.attachBlock();
    expect(document.getElementById('track')?.getAttribute('surface')).toBe('B');
    exp.setSurface('A');
    expect(document.getElementById('track')?.getAttribute('surface')).toBe('A');
  });

  it('SM-H3: surface-toggle aria-pressed соответствует state', () => {
    exp.setSurface('B');
    const btnA = document.querySelector('[data-surface="A"]');
    const btnB = document.querySelector('[data-surface="B"]');
    expect(btnA?.getAttribute('aria-pressed')).toBe('false');
    expect(btnB?.getAttribute('aria-pressed')).toBe('true');
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ I: ЖУРНАЛ ИЗМЕРЕНИЙ
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-I: журнал измерений', () => {
  it('SM-I1: recordMeasurement без бруска → ничего не записывается', () => {
    exp.recordMeasurement({ mBlockG: 50, frictionN: 0.1 });
    expect(snapshot().journalRows).toBe(0);
  });

  it('SM-I2: recordMeasurement с бруском+грузом → строка добавлена', () => {
    exp.attachBlock();
    exp.attachWeightById('w-100-1');
    exp.attachDynamometerById('dyno-1');
    exp.applyForce(0.3);
    exp.recordMeasurement({ mBlockG: 50, frictionN: 0.3 });
    expect(snapshot().journalRows).toBe(1);
  });

  it('SM-I3: после reset журнал очищается', () => {
    exp.attachBlock();
    exp.attachDynamometerById('dyno-1');
    exp.applyForce(0.2);
    exp.recordMeasurement({ mBlockG: 50, frictionN: 0.2 });
    expect(snapshot().journalRows).toBe(1);
    exp.reset();
    expect(snapshot().journalRows).toBe(0);
  });

  it('SM-I4: 3 измерения → 3 строки журнала', () => {
    exp.attachBlock();
    exp.attachDynamometerById('dyno-1');
    exp.applyForce(0.3);
    exp.recordMeasurement({ mBlockG: 50, frictionN: 0.1 });
    exp.recordMeasurement({ mBlockG: 50, frictionN: 0.15 });
    exp.recordMeasurement({ mBlockG: 50, frictionN: 0.2 });
    expect(snapshot().journalRows).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ J: КОМБИНАТОРИКА
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-J: комбинаторика', () => {
  for (const surface of ['A', 'B'] as const) {
    for (const dynoId of ['dyno-1', 'dyno-5'] as const) {
      for (const weightCount of [0, 1, 2, 3] as const) {
        it(`SM-J[${surface}, ${dynoId}, ${weightCount}w]: брусок+${weightCount}гр+${dynoId}+${surface}`, () => {
          exp.setSurface(surface);
          expect(exp.attachBlock()).toBe(true);
          for (const w of ['w-100-1', 'w-100-2', 'w-100-3'].slice(0, weightCount)) {
            expect(exp.attachWeightById(w as 'w-100-1')).toBe(true);
          }
          expect(exp.attachDynamometerById(dynoId)).toBe(true);
          const s = snapshot();
          expect(s.block).toBe('block');
          expect(s.dyno).toBe(dynoId);
          expect(s.weights.length).toBe(weightCount);
        });
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ K: ЗАДАЧИ A/B/C/D
// ═══════════════════════════════════════════════════════════════════

describe('SM-Friction-K: переключение задач A/B/C/D', () => {
  for (const task of ['A-coefficient', 'B-work', 'C-force-vs-N', 'D-force-vs-surface'] as const) {
    it(`SM-K[${task}]: setActiveTask(${task}) → шаг подсвечен`, () => {
      exp.setActiveTask(task);
      const step = document.querySelector(`[data-task="${task}"]`);
      expect(step?.getAttribute('data-state')).toBe('active');
      expect(step?.getAttribute('aria-current')).toBe('true');
    });
  }
});
