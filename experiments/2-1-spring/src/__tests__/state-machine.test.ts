/**
 * STATE MACHINE TESTS — опыт 2.1, интеграционная цепочка через программный API.
 *
 * Эти тесты проверяют именно ОРКЕСТРАТОР (SpringExperiment), не чистую физику.
 * Цель: ловить классы багов, которые не видны в физических фуззерах:
 *   - «пружина не возвращается к нулю при detach»
 *   - «масса груза не убрана из state после detach»
 *   - «card.status застрял в 'in-use' после reset»
 *   - «detach пружины не сбрасывает дин и грузы»
 *   - «dyno-на-stand принимает грузы без пружины» (или наоборот)
 *
 * SET-UP: импортируем компоненты единожды, в каждом тесте создаём свежий DOM
 * и свежий experiment.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Импорты компонентов — раз для всех тестов (customElements.define идемпотентен)
import '../ui/components/lab-button';
import '../ui/components/lab-checkbox-preview';
import '../ui/components/lab-weight';
import '../ui/components/lab-graph';
import '../ui/components/lab-stand';
import '../ui/components/lab-spring-board';
import '../ui/components/lab-dynamometer';
import '../ui/components/lab-tray';
import '../ui/components/lab-equipment-card';
import '../ui/components/lab-composite-weight';

import { SpringExperiment, type ExperimentRefs } from '../SpringExperiment';
import type { LabStand } from '../ui/components/lab-stand';
import type { LabGraph } from '../ui/components/lab-graph';
import type { LabEquipmentCard } from '../ui/components/lab-equipment-card';

let exp: SpringExperiment;

// Кешируем тело index.html — оно одно для всех тестов
let cachedHtml: string | null = null;

function loadHtml(): string {
  if (cachedHtml) return cachedHtml;
  const htmlPath = resolve(__dirname, '../../index.html');
  const full = readFileSync(htmlPath, 'utf-8');
  const m = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  // Удаляем <script> теги ДО парсинга, чтобы happy-dom не пытался их загружать
  cachedHtml = (m ? m[1]! : full).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  return cachedHtml;
}

function createExperiment(): SpringExperiment {
  document.body.innerHTML = loadHtml();

  const refs: ExperimentRefs = {
    stage: document.getElementById('stage')!,
    standContainer: document.getElementById('stand-container')!,
    stand: document.getElementById('stand') as LabStand,
    dragOverlay: document.getElementById('drag-overlay')!,
    dropZoneSpring: document.getElementById('drop-zone-spring')!,
    dropZoneBottom: document.getElementById('drop-zone-bottom')!,
    hintBar: document.getElementById('hint-bar')!,
    journalEmpty: document.getElementById('journal-empty')!,
    journalTable: document.getElementById('journal-table') as HTMLTableElement,
    journalBody: document.getElementById('journal-body')!,
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
    overloadBanner: document.getElementById('overload-banner')!,
    recordForm: document.getElementById('record-form') as HTMLFormElement,
    rfL0: document.getElementById('rf-l0') as HTMLInputElement,
    rfL1: document.getElementById('rf-l1') as HTMLInputElement,
    rfMass: document.getElementById('rf-mass') as HTMLOutputElement,
    rfCancel: document.getElementById('rf-cancel') as HTMLButtonElement,
    rfSubmit: document.getElementById('rf-submit') as HTMLButtonElement,
  };
  return new SpringExperiment(refs);
}

beforeAll(() => {
  // Прогрев — единожды загружаем HTML, создаём один experiment чтобы прогнать
  // первое определение custom elements.
  loadHtml();
});

beforeEach(() => {
  exp = createExperiment();
});

afterEach(() => {
  if (exp) exp.reset();
});

// Утилита: текущее состояние через DOM (не лазим в private fields)
function snapshot(): {
  attachedCount: number;
  spring: string | null;
  dyno: string | null;
  weights: string[];
  cardStatuses: Record<string, string>;
} {
  const wrappers = Array.from(document.querySelectorAll<HTMLElement>('.attached-eq'));
  const cards = Array.from(document.querySelectorAll<HTMLElement>('lab-equipment-card[data-eq]'));
  const cardStatuses: Record<string, string> = {};
  for (const c of cards) {
    cardStatuses[c.dataset['eq']!] = c.getAttribute('status') ?? 'unknown';
  }
  let spring: string | null = null;
  let dyno: string | null = null;
  const weights: string[] = [];
  for (const w of wrappers) {
    const id = w.dataset['equipmentId'];
    if (!id) continue;
    if (id.startsWith('spring-')) spring = id;
    else if (id.startsWith('dyno-')) dyno = id;
    else weights.push(id);
  }
  return { attachedCount: wrappers.length, spring, dyno, weights, cardStatuses };
}

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ A: ATTACH / DETACH ПРУЖИНЫ
// ═══════════════════════════════════════════════════════════════════

describe('SM-Spring-A: цепочка пружина', () => {
  it('SM-A1: после attachSpring появляется wrapper, статус карты = in-use', () => {
    expect(exp.attachSpringById('spring-k50')).toBe(true);
    const s = snapshot();
    expect(s.spring).toBe('spring-k50');
    expect(s.cardStatuses['spring-k50']).toBe('in-use');
  });

  it('SM-A2: повторный attach той же пружины → false', () => {
    exp.attachSpringById('spring-k50');
    expect(exp.attachSpringById('spring-k50')).toBe(false);
  });

  it('SM-A3: attach k10 после k50 → false (одна пружина)', () => {
    exp.attachSpringById('spring-k50');
    expect(exp.attachSpringById('spring-k10')).toBe(false);
  });

  it('SM-A4: reset после attach → wrappers=0, status=available', () => {
    exp.attachSpringById('spring-k50');
    exp.reset();
    const s = snapshot();
    expect(s.attachedCount).toBe(0);
    expect(s.cardStatuses['spring-k50']).toBe('available');
  });

  it('SM-A5: смена пружины через reset+attach', () => {
    exp.attachSpringById('spring-k50');
    exp.reset();
    expect(exp.attachSpringById('spring-k10')).toBe(true);
    expect(snapshot().spring).toBe('spring-k10');
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ B: ATTACH ГРУЗОВ
// ═══════════════════════════════════════════════════════════════════

describe('SM-Spring-B: цепочка грузов', () => {
  it('SM-B1: attachWeight без пружины → false', () => {
    expect(exp.attachWeightById('w-100-1')).toBe(false);
  });

  it('SM-B2: пружина + 1 груз → wrappers=2', () => {
    exp.attachSpringById('spring-k50');
    expect(exp.attachWeightById('w-100-1')).toBe(true);
    const s = snapshot();
    expect(s.attachedCount).toBe(2);
    expect(s.weights).toContain('w-100-1');
  });

  it('SM-B3: 3 груза цепочкой → wrappers=4', () => {
    exp.attachSpringById('spring-k50');
    expect(exp.attachWeightById('w-100-1')).toBe(true);
    expect(exp.attachWeightById('w-100-2')).toBe(true);
    expect(exp.attachWeightById('w-100-3')).toBe(true);
    expect(snapshot().attachedCount).toBe(4);
  });

  it('SM-B4: повторный груз → false', () => {
    exp.attachSpringById('spring-k50');
    expect(exp.attachWeightById('w-100-1')).toBe(true);
    expect(exp.attachWeightById('w-100-1')).toBe(false);
  });

  it('SM-B5: дин-на-штативе + грузы (схема взвешивания)', () => {
    expect(exp.attachDynamometerById('dyno-1', 'stand')).toBe(true);
    expect(exp.attachWeightById('w-100-1')).toBe(true);
    expect(snapshot().attachedCount).toBe(2);
  });

  it('SM-B6: после reset все 3 груза статус=available', () => {
    exp.attachSpringById('spring-k50');
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
//   СЦЕНАРИЙ C: ATTACH ДИНАМОМЕТРА
// ═══════════════════════════════════════════════════════════════════

describe('SM-Spring-C: цепочка динамометра', () => {
  it('SM-C1: attachDyno без пружины → false', () => {
    expect(exp.attachDynamometerById('dyno-1')).toBe(false);
  });

  it('SM-C2: пружина + дин на пружину', () => {
    exp.attachSpringById('spring-k50');
    expect(exp.attachDynamometerById('dyno-1')).toBe(true);
    expect(snapshot().attachedCount).toBe(2);
  });

  it('SM-C3: дин ПОСЛЕ грузов → false', () => {
    exp.attachSpringById('spring-k50');
    exp.attachWeightById('w-100-1');
    expect(exp.attachDynamometerById('dyno-1')).toBe(false);
  });

  it('SM-C4: дин-на-stand + пружина → false', () => {
    expect(exp.attachDynamometerById('dyno-1', 'stand')).toBe(true);
    expect(exp.attachSpringById('spring-k50')).toBe(false);
  });

  it('SM-C5: 2 динамометра одновременно → false', () => {
    exp.attachSpringById('spring-k50');
    expect(exp.attachDynamometerById('dyno-1')).toBe(true);
    expect(exp.attachDynamometerById('dyno-5')).toBe(false);
  });

  it('SM-C6: дин-на-stand reset → status=available', () => {
    exp.attachDynamometerById('dyno-1', 'stand');
    exp.reset();
    expect(snapshot().cardStatuses['dyno-1']).toBe('available');
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ D: DETACH через X-кнопки
// ═══════════════════════════════════════════════════════════════════

describe('SM-Spring-D: detach отдельных элементов через X', () => {
  it('SM-D1: detach пружины → reset всей сцены', () => {
    exp.attachSpringById('spring-k50');
    exp.attachWeightById('w-100-1');
    exp.attachWeightById('w-100-2');
    expect(snapshot().attachedCount).toBe(3);
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="spring-k50"] > .lab-detach-btn')
      ?.click();
    expect(snapshot().attachedCount).toBe(0);
  });

  it('SM-D2: detach среднего груза → снимается + всё ниже', () => {
    exp.attachSpringById('spring-k50');
    exp.attachWeightById('w-100-1');
    exp.attachWeightById('w-100-2');
    expect(snapshot().attachedCount).toBe(3);
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="w-100-1"] > .lab-detach-btn')
      ?.click();
    const s = snapshot();
    expect(s.spring).toBe('spring-k50');
    expect(s.weights.length).toBe(0);
  });

  it('SM-D3: detach нижнего груза → верхние остаются', () => {
    exp.attachSpringById('spring-k50');
    exp.attachWeightById('w-100-1');
    exp.attachWeightById('w-100-2');
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="w-100-2"] > .lab-detach-btn')
      ?.click();
    const s = snapshot();
    expect(s.spring).toBe('spring-k50');
    expect(s.weights).toEqual(['w-100-1']);
  });

  it('SM-D4: detach дина (на пружине) → пружина остаётся, status дина=available', () => {
    exp.attachSpringById('spring-k50');
    exp.attachDynamometerById('dyno-1');
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="dyno-1"] > .lab-detach-btn')
      ?.click();
    const s = snapshot();
    expect(s.spring).toBe('spring-k50');
    expect(s.dyno).toBeNull();
    expect(s.cardStatuses['dyno-1']).toBe('available');
  });

  it('SM-D5: detach дина-на-стенде → reset (нет на чём держать грузы)', () => {
    exp.attachDynamometerById('dyno-1', 'stand');
    exp.attachWeightById('w-100-1');
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="dyno-1"] > .lab-detach-btn')
      ?.click();
    expect(snapshot().attachedCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ E: ROUND-TRIP
// ═══════════════════════════════════════════════════════════════════

describe('SM-Spring-E: round-trip', () => {
  it('SM-E1: attach + reset → все карты available', () => {
    exp.attachSpringById('spring-k50');
    exp.attachDynamometerById('dyno-1');
    exp.attachWeightById('w-100-1');
    exp.reset();
    const s = snapshot();
    expect(s.attachedCount).toBe(0);
    for (const id of ['spring-k50', 'spring-k10', 'dyno-1', 'dyno-5', 'w-100-1', 'w-100-2', 'w-100-3']) {
      expect(s.cardStatuses[id]).toBe('available');
    }
  });

  it('SM-E2: 10 циклов attach+reset — state не дрейфует', () => {
    for (let i = 0; i < 10; i++) {
      exp.attachSpringById('spring-k50');
      exp.attachWeightById('w-100-1');
      exp.attachWeightById('w-100-2');
      exp.reset();
      expect(snapshot().attachedCount).toBe(0);
    }
  });

  it('SM-E3: attach + detach все вручную == initial', () => {
    exp.attachSpringById('spring-k50');
    exp.attachWeightById('w-100-1');
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="w-100-1"] > .lab-detach-btn')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="spring-k50"] > .lab-detach-btn')
      ?.click();
    const s = snapshot();
    expect(s.attachedCount).toBe(0);
    expect(s.cardStatuses['w-100-1']).toBe('available');
    expect(s.cardStatuses['spring-k50']).toBe('available');
  });

  it('SM-E4: смена пружины через reset', () => {
    exp.attachSpringById('spring-k50');
    exp.attachWeightById('w-100-1');
    exp.reset();
    exp.attachSpringById('spring-k10');
    const s = snapshot();
    expect(s.spring).toBe('spring-k10');
    expect(s.cardStatuses['spring-k50']).toBe('available');
    expect(s.cardStatuses['spring-k10']).toBe('in-use');
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ F: ВОЗВРАТ ПОКАЗАНИЙ ПРИБОРОВ
// ═══════════════════════════════════════════════════════════════════

describe('SM-Spring-F: показания приборов возвращаются к нулю', () => {
  it('SM-F1: дин-на-stand + груз → force>0; убрали дин → force=0 в карте', () => {
    exp.attachDynamometerById('dyno-1', 'stand');
    exp.attachWeightById('w-100-1');
    const dynoOnScene = document.querySelector<Element>(
      '.attached-eq[data-equipment-id="dyno-1"] lab-dynamometer',
    );
    const beforeForce = Number(dynoOnScene?.getAttribute('force') ?? 0);
    expect(beforeForce).toBeGreaterThan(0.5);
    document
      .querySelector<HTMLButtonElement>('.attached-eq[data-equipment-id="dyno-1"] > .lab-detach-btn')
      ?.click();
    const dynoInCard = document.querySelector<Element>(
      'lab-equipment-card[data-eq="dyno-1"] lab-dynamometer',
    );
    expect(Number(dynoInCard?.getAttribute('force') ?? 0)).toBe(0);
  });

  it('SM-F2: пружина после reset extension=0', () => {
    exp.attachSpringById('spring-k50');
    exp.attachWeightById('w-100-1');
    exp.reset();
    const cardSpring = document.querySelector<Element>(
      'lab-equipment-card[data-eq="spring-k50"] lab-spring-board',
    );
    expect(Number(cardSpring?.getAttribute('extension') ?? 0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ G: ИДЕМПОТЕНТНОСТЬ RESET
// ═══════════════════════════════════════════════════════════════════

describe('SM-Spring-G: reset идемпотентен', () => {
  it('SM-G1: reset на пустой сцене не падает', () => {
    expect(() => exp.reset()).not.toThrow();
  });

  it('SM-G2: 5 reset подряд → state=initial', () => {
    for (let i = 0; i < 5; i++) exp.reset();
    expect(snapshot().attachedCount).toBe(0);
  });

  it('SM-G3: reset во время колебаний → не падает', () => {
    exp.attachSpringById('spring-k50');
    exp.attachWeightById('w-100-1');
    expect(() => exp.reset()).not.toThrow();
    expect(snapshot().attachedCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//   СЦЕНАРИЙ H: КОМБИНАТОРИКА
// ═══════════════════════════════════════════════════════════════════

describe('SM-Spring-H: комбинаторика валидных последовательностей', () => {
  for (const springId of ['spring-k50', 'spring-k10'] as const) {
    for (const weightCount of [1, 2, 3] as const) {
      it(`SM-H[${springId}, ${weightCount}w]: пружина + ${weightCount} груз(а)`, () => {
        exp.attachSpringById(springId);
        const ws = ['w-100-1', 'w-100-2', 'w-100-3'].slice(0, weightCount);
        for (const w of ws) {
          expect(exp.attachWeightById(w as 'w-100-1')).toBe(true);
        }
        const s = snapshot();
        expect(s.spring).toBe(springId);
        expect(s.weights.length).toBe(weightCount);
      });
    }
  }

  for (const dynoId of ['dyno-1', 'dyno-5'] as const) {
    for (const weightCount of [0, 1, 2, 3] as const) {
      it(`SM-H[stand-${dynoId}, ${weightCount}w]: дин-на-стенде + ${weightCount} груз(а)`, () => {
        expect(exp.attachDynamometerById(dynoId, 'stand')).toBe(true);
        for (const w of ['w-100-1', 'w-100-2', 'w-100-3'].slice(0, weightCount)) {
          expect(exp.attachWeightById(w as 'w-100-1')).toBe(true);
        }
        const s = snapshot();
        expect(s.dyno).toBe(dynoId);
        expect(s.weights.length).toBe(weightCount);
      });
    }
  }
});
