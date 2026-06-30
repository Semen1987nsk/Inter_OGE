/**
 * lens-bench.test.ts — state-machine тест экрана «Оптическая сила линзы» (опыт 4.1).
 *
 * Тестирует LensBenchExperiment через публичный программный API:
 *   placeInSlot, setScreenDistanceMm, recordMeasurement
 * НЕ эмулирует pointer-events — для них selfcheck-4-1.mjs (Playwright).
 *
 * Паттерн: happy-dom + customElements (зеркало MeasurementsExperiment тест в kit-3).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Регистрируем все custom elements
import '../../../ui/components/lab-optical-bench';
import '../../../ui/components/lab-light-object';
import '../../../ui/components/lab-lens';
import '../../../ui/components/lab-screen';
import '../../../ui/components/lab-equipment-card';

import { LensBenchExperiment, type ExperimentRefs } from '../LensBenchExperiment';
import { LensBenchScreen } from '../LensBenchScreen';
import { focalFromDistances, opticalPower } from '../../../physics/optics/LensModel';

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function buildRefs(host: HTMLElement): ExperimentRefs {
  host.innerHTML = `
    <div id="stage">
      <lab-optical-bench id="optical-bench"
        aria-label="Оптическая скамья"></lab-optical-bench>
      <div id="hint-bar">Подсказка</div>
      <div id="drag-overlay" aria-hidden="true"></div>
      <aside id="result-panel" aria-live="polite" hidden></aside>
      <button id="reset-btn" type="button" aria-label="Сбросить опыт"></button>
      <button id="ray-overlay-btn" type="button" aria-pressed="false">Показать лучи</button>
      <input type="range" id="screen-slider" min="110" max="600" step="1" value="200"
        aria-label="Положение экрана, мм" />
      <output id="screen-slider-readout" for="screen-slider">200 мм</output>
      <ol id="steps" aria-label="Опыт">
        <li data-task="A-power" data-state="active" tabindex="0" role="button" aria-current="true">A</li>
        <li data-task="B-focal2f" tabindex="0" role="button" aria-current="false">B</li>
        <li data-task="C-image" tabindex="0" role="button" aria-current="false">C</li>
      </ol>
      <div id="object-slider-row" hidden>
        <input type="range" id="object-slider" min="110" max="290" step="1" value="200"
          aria-label="Положение предмета, мм" />
        <output id="object-slider-readout" for="object-slider">200 мм</output>
      </div>
      <output id="object-zone-readout"></output>
      <div id="record-mode-slot"></div>
      <div id="journal-host" hidden></div>
      <div id="record-pending-slot" hidden>
        <button id="record-pending-btn" type="button">
          <span id="record-pending-summary"></span>
        </button>
      </div>
      <div id="live-region" role="status" aria-live="polite" class="sr-only"></div>
    </div>
    <!-- Equipment cards -->
    <lab-equipment-card data-eq="light-object" data-draggable="light-object"
      data-dropzone="light-object" data-dropzone-id="card-light-object" status="available">
      <lab-light-object></lab-light-object>
    </lab-equipment-card>
    <lab-equipment-card data-eq="lens" data-draggable="lens"
      data-dropzone="lens" data-dropzone-id="card-lens" status="available">
      <lab-lens focal-mm="100"></lab-lens>
    </lab-equipment-card>
    <lab-equipment-card data-eq="screen" data-draggable="screen"
      data-dropzone="screen" data-dropzone-id="card-screen" status="available">
      <lab-screen></lab-screen>
    </lab-equipment-card>
  `;

  const bench = host.querySelector<HTMLElement>('#optical-bench')! as HTMLElement & {
    getSlotRect(id: string): DOMRect;
    setSlotHover(slotId: string, active: boolean): void;
    setObjectDistanceMm(d: number): void;
    setLensFocalMm(F: number): void;
    setScreenDistanceMm(f: number): void;
    setRayOverlay(on: boolean): void;
    setImageSharpness(s: number): void;
    setSizeMatch(on: boolean): void;
  };

  return {
    stage: host.querySelector<HTMLElement>('#stage')!,
    bench,
    dragOverlay: host.querySelector<HTMLElement>('#drag-overlay')!,
    hintBar: host.querySelector<HTMLElement>('#hint-bar')!,
    liveRegion: host.querySelector<HTMLElement>('#live-region')!,
    resetBtn: host.querySelector('#reset-btn') as HTMLButtonElement,
    rayOverlayBtn: host.querySelector('#ray-overlay-btn') as HTMLButtonElement,
    screenSlider: host.querySelector('#screen-slider') as HTMLInputElement,
    screenSliderReadout: host.querySelector<HTMLElement>('#screen-slider-readout') ?? undefined,
    steps: host.querySelector<HTMLElement>('#steps')!,
    objectSlider: host.querySelector('#object-slider') as HTMLInputElement,
    objectSliderRow: host.querySelector<HTMLElement>('#object-slider-row') ?? undefined,
    objectSliderReadout: host.querySelector<HTMLElement>('#object-slider-readout') ?? undefined,
    objectZoneReadout: host.querySelector<HTMLElement>('#object-zone-readout') ?? undefined,
    resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
    cards: host.querySelectorAll<any>('lab-equipment-card'),
    recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
    journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
    recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
    recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
    recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
  };
}

function makeExperiment(): { exp: LensBenchExperiment; refs: ExperimentRefs; host: HTMLElement } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const refs = buildRefs(host);
  const exp = new LensBenchExperiment(refs);
  return { exp, refs, host };
}

// ─── Тесты ───────────────────────────────────────────────────────────────────

describe('LensBenchExperiment — state machine', () => {
  let host: HTMLElement;
  let experiment: LensBenchExperiment;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const refs = buildRefs(host);
    experiment = new LensBenchExperiment(refs);
  });

  afterEach(() => {
    experiment.destroy();
    host.remove();
    globalThis.gc?.();
  });

  // ─── Обязательные слоты журнала v2 ───────────────────────────────────────

  it('template содержит #journal-host', () => {
    expect(host.querySelector('#journal-host')).not.toBeNull();
  });

  it('template содержит #record-mode-slot', () => {
    expect(host.querySelector('#record-mode-slot')).not.toBeNull();
  });

  it('template содержит #live-region с aria-live="polite"', () => {
    const lr = host.querySelector('#live-region');
    expect(lr).not.toBeNull();
    expect(lr?.getAttribute('aria-live')).toBe('polite');
  });

  it('template содержит #record-pending-btn', () => {
    expect(host.querySelector('#record-pending-btn')).not.toBeNull();
  });

  it('#result-panel имеет aria-live="polite"', () => {
    const rp = host.querySelector('#result-panel');
    expect(rp?.getAttribute('aria-live')).toBe('polite');
  });

  // ─── Начальное состояние ──────────────────────────────────────────────────

  it('начальное состояние: нет измерений', () => {
    expect(experiment.measurements.length).toBe(0);
  });

  it('начальное objectDistanceMm = 200 (дефолт 2F для F=100мм)', () => {
    expect(experiment.objectDistanceMm).toBe(200);
  });

  it('начальное screenDistanceMm = 200 (симметрично d=2F)', () => {
    expect(experiment.screenDistanceMm).toBe(200);
  });

  // ─── Размещение приборов ──────────────────────────────────────────────────

  it('placeInSlot: light-object в object → true', () => {
    expect(experiment.placeInSlot('object', 'light-object')).toBe(true);
  });

  it('placeInSlot: lens в lens → true', () => {
    expect(experiment.placeInSlot('lens', 'lens')).toBe(true);
  });

  it('placeInSlot: screen в screen → true', () => {
    expect(experiment.placeInSlot('screen', 'screen')).toBe(true);
  });

  it('placeInSlot: неподходящий прибор → false', () => {
    // screen не может в object-слот
    expect(experiment.placeInSlot('object', 'screen')).toBe(false);
  });

  it('placeInSlot: повторное размещение в занятый слот → false', () => {
    experiment.placeInSlot('lens', 'lens');
    expect(experiment.placeInSlot('lens', 'lens')).toBe(false);
  });

  // ─── Полная сборка + запись измерения ─────────────────────────────────────

  function assembleBench(exp: LensBenchExperiment): void {
    exp.placeInSlot('object', 'light-object');
    exp.placeInSlot('lens', 'lens');
    exp.placeInSlot('screen', 'screen');
  }

  it('запись без полной сборки — игнорируется', () => {
    experiment.placeInSlot('object', 'light-object');
    experiment.placeInSlot('lens', 'lens');
    // screen не установлен
    experiment.recordMeasurement();
    expect(experiment.measurements.length).toBe(0);
  });

  it('после полной сборки + setScreenDistanceMm: recordMeasurement создаёт строку', () => {
    assembleBench(experiment);
    // d=200мм, F=100мм → f_теор=200мм; ставим экран в f=200мм (резко)
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();

    expect(experiment.measurements.length).toBe(1);
    const m = experiment.measurements[0]!;
    expect(m.d_mm).toBeCloseTo(200, 0);
    expect(m.f_mm).toBeCloseTo(200, 0);
    // F = d*f/(d+f) = 200*200/400 = 100мм
    expect(m.F_mm).toBeCloseTo(100, 1);
    // D = 1/F[м] = 1/0.1 = 10 дптр
    expect(m.D_dptr).toBeCloseTo(10, 1);
  });

  it('F = focalFromDistances(d, f) совпадает с LensModel', () => {
    assembleBench(experiment);
    const f = 150;
    experiment.setScreenDistanceMm(f);
    // Хак: set object distance only if API существует; иначе принимаем дефолт 200
    experiment.recordMeasurement();
    // Если d дефолт=200 и f=150 → F = 200*150/350 ≈ 85.7мм
    const m = experiment.measurements[0]!;
    const expected_F = focalFromDistances(m.d_mm, m.f_mm);
    expect(m.F_mm).toBeCloseTo(expected_F, 3);
  });

  it('D = opticalPower(F_mm/1000) совпадает с LensModel', () => {
    assembleBench(experiment);
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();
    const m = experiment.measurements[0]!;
    const expected_D = opticalPower(m.F_mm / 1000);
    expect(m.D_dptr).toBeCloseTo(expected_D, 3);
  });

  it('несколько измерений при разных f накапливаются в массив', () => {
    assembleBench(experiment);
    for (const f of [180, 200, 220]) {
      experiment.setScreenDistanceMm(f);
      experiment.recordMeasurement();
    }
    expect(experiment.measurements.length).toBe(3);
    for (const m of experiment.measurements) {
      // F всегда > 0 при d > F
      expect(m.F_mm).toBeGreaterThan(0);
      expect(m.D_dptr).toBeGreaterThan(0);
    }
  });

  // ─── Публичный API: расстояние предмета, резкость, ориентация ─────────────

  it('setObjectDistanceMm(d>0) меняет objectDistanceMm; невалидное игнорируется', () => {
    experiment.setObjectDistanceMm(300);
    expect(experiment.objectDistanceMm).toBe(300);
    experiment.setObjectDistanceMm(0);
    expect(experiment.objectDistanceMm).toBe(300);
    experiment.setObjectDistanceMm(Number.NaN);
    expect(experiment.objectDistanceMm).toBe(300);
  });

  it('get isSharp: true когда экран в плоскости изображения (F=100,d=300→f=150)', () => {
    assembleBench(experiment);
    experiment.setObjectDistanceMm(300);
    experiment.setScreenDistanceMm(150); // imageDistance(100,300)=150
    expect(experiment.isSharp).toBe(true);
    experiment.setScreenDistanceMm(400); // далеко от плоскости
    expect(experiment.isSharp).toBe(false);
  });

  // ─── isSharp: граница FOCUS_BAND_MM=5 (контракт полосы фокуса) ─────────────
  // Закрепляют ширину полосы: смена 5→50 (или любая другая) ОБЯЗАНА уронить эти тесты.

  it('get isSharp: d=F (imageDistance=Infinity) → false', () => {
    assembleBench(experiment);
    experiment.setObjectDistanceMm(100); // d=F=100 → imageDistance=Infinity
    experiment.setScreenDistanceMm(200);
    expect(experiment.isSharp).toBe(false);
  });

  it('get isSharp: d<F (plane≤0, мнимое) → false', () => {
    assembleBench(experiment);
    experiment.setObjectDistanceMm(50); // d=50 < F=100 → imageDistance(100,50)=-100 ≤ 0
    experiment.setScreenDistanceMm(100);
    expect(experiment.isSharp).toBe(false);
  });

  it('get isSharp: |screen − plane| ровно 5 → true; 5.001 → false (полоса FOCUS_BAND_MM=5)', () => {
    assembleBench(experiment);
    experiment.setObjectDistanceMm(300); // imageDistance(100,300)=150
    experiment.setScreenDistanceMm(155); // delta=5 → на границе → true
    expect(experiment.isSharp).toBe(true);
    experiment.setScreenDistanceMm(155.001); // delta=5.001 → за границей → false
    expect(experiment.isSharp).toBe(false);
  });

  it('get imageOrientation: inverted при d>F (реальное перевёрнутое)', () => {
    assembleBench(experiment);
    experiment.setObjectDistanceMm(300); // d=300 > F=100
    expect(experiment.imageOrientation).toBe('inverted');
  });

  it('get imageOrientation: upright при d<F (мнимое прямое)', () => {
    assembleBench(experiment);
    experiment.setObjectDistanceMm(50); // d=50 < F=100 → мнимое прямое
    expect(experiment.imageOrientation).toBe('upright');
  });

  it('get imageOrientation: d===F → upright (граница: d не > F)', () => {
    assembleBench(experiment);
    experiment.setObjectDistanceMm(100); // d===F=100 → НЕ > F → ветка upright
    expect(experiment.imageOrientation).toBe('upright');
  });

  it('слайдер #screen-slider (input) двигает экран → setScreenDistanceMm', () => {
    assembleBench(experiment);
    const slider = host.querySelector<HTMLInputElement>('#screen-slider')!;
    slider.value = '150';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(experiment.screenDistanceMm).toBe(150);
  });

  // ─── journal-host получает рендер ─────────────────────────────────────────

  it('после записи #journal-host перестаёт быть hidden', () => {
    assembleBench(experiment);
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();

    const jh = host.querySelector<HTMLElement>('#journal-host');
    expect(jh?.hidden).toBe(false);
  });

  // ─── result-panel обновляется ─────────────────────────────────────────────

  it('result-panel не hidden после полной сборки', () => {
    assembleBench(experiment);
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();
    const rp = host.querySelector<HTMLElement>('#result-panel');
    // После записи result-panel показывает F и D
    expect(rp?.hidden).toBe(false);
  });

  // ─── Ray overlay toggle ───────────────────────────────────────────────────

  it('toggleRayOverlay: не бросает исключений', () => {
    expect(() => experiment.toggleRayOverlay()).not.toThrow();
    expect(() => experiment.toggleRayOverlay()).not.toThrow();
  });

  // ─── Reset ────────────────────────────────────────────────────────────────

  it('reset: очищает измерения и возвращает к исходному состоянию', () => {
    assembleBench(experiment);
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();
    expect(experiment.measurements.length).toBe(1);

    experiment.reset();
    expect(experiment.measurements.length).toBe(0);
    expect(experiment.screenDistanceMm).toBe(200);
  });

  it('после reset: повторная сборка и запись работают корректно', () => {
    assembleBench(experiment);
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();
    experiment.reset();

    assembleBench(experiment);
    experiment.setScreenDistanceMm(150);
    experiment.recordMeasurement();

    expect(experiment.measurements.length).toBe(1);
    expect(experiment.measurements[0]!.f_mm).toBeCloseTo(150, 0);
  });

  // ─── Remount guard (bench-slot- одна точка регистрации) ──────────────────

  it('mount → destroy → remount → placeInSlot succeeds on 2nd mount', () => {
    experiment.destroy();
    host.innerHTML = '';

    const refs2 = buildRefs(host);
    const experiment2 = new LensBenchExperiment(refs2);

    expect(experiment2.placeInSlot('object', 'light-object')).toBe(true);
    expect(experiment2.placeInSlot('lens', 'lens')).toBe(true);
    expect(experiment2.placeInSlot('screen', 'screen')).toBe(true);

    experiment2.setScreenDistanceMm(200);
    experiment2.recordMeasurement();
    expect(experiment2.measurements.length).toBe(1);

    experiment = experiment2;
  });

  // ─── ФИПИ-инвариант F1=100мм ─────────────────────────────────────────────

  it('ФИПИ: F1=100мм, d=200мм (2F) → f=200мм, F≈100мм, D=10дптр', () => {
    assembleBench(experiment);
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();
    const m = experiment.measurements[0]!;
    // d дефолт=200, f=200 → F=100
    expect(m.F_mm).toBeCloseTo(100, 1);
    expect(m.D_dptr).toBeCloseTo(10, 1);
  });
});

// ─── Regression: record-mode gating (M2 flood + M3 a11y leak) ────────────────

describe('LensBenchExperiment — record-mode gating (regression M2/M3)', () => {
  let host: HTMLElement;
  let experiment: LensBenchExperiment;
  const KEY = 'inter-oge.record-mode.kit-4';

  function setMode(mode: 'semi-auto' | 'fully-manual' | 'fully-auto'): void {
    globalThis.localStorage.setItem(KEY, mode);
  }

  function build(): void {
    host = document.createElement('div');
    document.body.appendChild(host);
    experiment = new LensBenchExperiment(buildRefs(host));
  }

  function assemble(exp: LensBenchExperiment): void {
    exp.placeInSlot('object', 'light-object');
    exp.placeInSlot('lens', 'lens');
    exp.placeInSlot('screen', 'screen');
  }

  afterEach(() => {
    experiment?.destroy();
    host?.remove();
    globalThis.localStorage.removeItem(KEY);
    globalThis.gc?.();
  });

  // M2: fully-auto НЕ должен писать строку на каждый сдвиг экрана — только когда резко.
  it('M2: fully-auto авто-запись только в фокусе — нерезкие сдвиги не флудят журнал', () => {
    setMode('fully-auto');
    build();
    assemble(experiment);
    // Дефолт d=200, f=200 → плоскость=200 → резко: сборка в fully-auto уже даёт 1 авто-строку.
    experiment.setObjectDistanceMm(300); // imageDistance(100,300)=150 — экран (200) теперь НЕ в фокусе
    const baseline = experiment.measurements.length; // 1 (стартовая резкая точка d=200,f=200)

    // Сдвигаем экран по всему диапазону мимо плоскости изображения (110..140 при плоскости 150)
    // — НИ ОДНОЙ новой строки (раньше без gate-а на isSharp было бы ~30 строк).
    for (let f = 110; f <= 140; f++) experiment.setScreenDistanceMm(f);
    expect(experiment.measurements.length).toBe(baseline);

    // Доводим до резкости (плоскость=150) — ровно одна новая авто-запись.
    experiment.setScreenDistanceMm(150);
    expect(experiment.isSharp).toBe(true);
    expect(experiment.measurements.length).toBe(baseline + 1);

    // Микро-дрожание на ту же округлённую сигнатуру (150) не плодит строки.
    const after = experiment.measurements.length;
    experiment.setScreenDistanceMm(150);
    expect(experiment.measurements.length).toBe(after);
  });

  // M3: result-panel НЕ показывает F/D в не-авто режимах (SR-leak ответа).
  it('M3: result-panel скрывает F и D в semi-auto/fully-manual, показывает в fully-auto', () => {
    // semi-auto: записываем вручную, F/D НЕ должны попасть в result-panel.
    setMode('semi-auto');
    build();
    assemble(experiment);
    experiment.setObjectDistanceMm(300);
    experiment.setScreenDistanceMm(150);
    experiment.recordMeasurement();
    const rp = host.querySelector<HTMLElement>('#result-panel')!;
    expect(rp.hidden).toBe(false);
    expect(rp.textContent).toContain('Строка записана');
    expect(rp.textContent).not.toContain('дптр');
    expect(rp.innerHTML).not.toContain('<strong>F</strong>');
  });

  it('M3: fully-auto result-panel показывает F и D (легитимно для авто-режима)', () => {
    setMode('fully-auto');
    build();
    assemble(experiment);
    experiment.setObjectDistanceMm(300);
    experiment.setScreenDistanceMm(150);
    const rp = host.querySelector<HTMLElement>('#result-panel')!;
    expect(rp.hidden).toBe(false);
    expect(rp.textContent).toContain('дптр');
    expect(rp.innerHTML).toContain('<strong>F</strong>');
  });

  // Should-fix: размещение прибора объявляется в live-region.
  it('placeInSlot объявляет размещение в #live-region', async () => {
    setMode('semi-auto');
    build();
    const live = host.querySelector<HTMLElement>('#live-region')!;
    experiment.placeInSlot('lens', 'lens');
    // announce использует requestAnimationFrame — ждём кадр.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(live.textContent).toContain('линза');
  });
});

describe('LensBenchExperiment — задача B (опыт 4.2, равенство размеров)', () => {
  let host: HTMLElement;
  let experiment: LensBenchExperiment;
  function build(): void {
    host = document.createElement('div');
    document.body.appendChild(host);
    experiment = new LensBenchExperiment(buildRefs(host));
  }
  function assemble(exp: LensBenchExperiment): void {
    exp.placeInSlot('object', 'light-object');
    exp.placeInSlot('lens', 'lens');
    exp.placeInSlot('screen', 'screen');
  }
  afterEach(() => {
    experiment?.destroy();
    host?.remove();
    globalThis.localStorage.removeItem('inter-oge.record-mode.kit-4'); // не протекать режимом между тестами
    globalThis.gc?.();
  });

  it('default activeTask = A-power', () => {
    build();
    expect(experiment.activeTask).toBe('A-power');
  });

  it('setActiveTask(B) переключает задачу и применяет дефолты B (d=150,screen=250)', () => {
    build();
    experiment.setActiveTask('B-focal2f');
    expect(experiment.activeTask).toBe('B-focal2f');
    expect(experiment.objectDistanceMm).toBe(150);
    expect(experiment.screenDistanceMm).toBe(250);
  });

  it('isSizesEqual: true при d=2F (200, F=100), false иначе', () => {
    build();
    experiment.setActiveTask('B-focal2f');
    assemble(experiment);
    experiment.setObjectDistanceMm(200); // |Γ|=1
    expect(experiment.isSizesEqual).toBe(true);
    experiment.setObjectDistanceMm(150); // |Γ|=2
    expect(experiment.isSizesEqual).toBe(false);
  });

  it('task B: запись игнорируется пока не резко И равно', () => {
    build();
    experiment.setActiveTask('B-focal2f');
    assemble(experiment);
    // d=150 (не равно), экран=250 (не резко)
    experiment.recordMeasurement();
    expect(experiment.measurements.length).toBe(0);
    // выставляем d=200 (равно) + экран=200 (резко)
    experiment.setObjectDistanceMm(200);
    experiment.setScreenDistanceMm(200);
    expect(experiment.isSharp).toBe(true);
    expect(experiment.isSizesEqual).toBe(true);
    experiment.recordMeasurement();
    expect(experiment.measurements.length).toBe(1);
    const m = experiment.measurements[0]!;
    expect(m.task).toBe('B-focal2f');
    expect(m.twoF_mm).toBeCloseTo(200, 0);
    expect(m.F_mm).toBeCloseTo(100, 0); // F=2F/2
  });

  it('журнал задачи B изолирован от задачи A (фильтр по task)', () => {
    build();
    // запись в A
    assemble(experiment);
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();
    expect(experiment.measurements.filter((m) => m.task === 'A-power').length).toBe(1);
    // переключаемся в B, пишем
    experiment.setActiveTask('B-focal2f');
    assemble(experiment);
    experiment.setObjectDistanceMm(200);
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();
    expect(experiment.measurements.filter((m) => m.task === 'B-focal2f').length).toBe(1);
    // возврат в A не теряет данные A
    experiment.setActiveTask('A-power');
    expect(experiment.measurements.filter((m) => m.task === 'A-power').length).toBe(1);
  });

  it('слайдер предмета виден в task B, скрыт в task A', () => {
    build();
    const row = host.querySelector<HTMLElement>('#object-slider-row')!;
    expect(row.hidden).toBe(true); // task A
    experiment.setActiveTask('B-focal2f');
    expect(row.hidden).toBe(false);
    experiment.setActiveTask('A-power');
    expect(row.hidden).toBe(true);
  });

  it('клик по [data-task=B] в #steps переключает задачу', () => {
    build();
    const stepB = host.querySelector<HTMLElement>('[data-task="B-focal2f"]')!;
    stepB.click();
    expect(experiment.activeTask).toBe('B-focal2f');
  });

  it('A11y: result-panel task B НЕ палит F в semi-auto, палит в fully-auto', async () => {
    const KEY = 'inter-oge.record-mode.kit-4';
    globalThis.localStorage.setItem(KEY, 'semi-auto');
    build();
    experiment.setActiveTask('B-focal2f');
    assemble(experiment);
    experiment.setObjectDistanceMm(200);
    experiment.setScreenDistanceMm(200);
    experiment.recordMeasurement();
    const rp = host.querySelector<HTMLElement>('#result-panel')!;
    expect(rp.textContent).toContain('2F'); // фраза «F = 2F / 2» допустима
    expect(rp.innerHTML).not.toContain('<strong>F</strong>'); // но не готовое F
    expect(rp.textContent).not.toMatch(/2F\s*=\s*\d/); // и не численное 2F (деление /2 тривиально палит F)
    // F1 fix: live-region тоже не должен палить численное 2F в semi-auto
    const lr = host.querySelector<HTMLElement>('#live-region')!;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(lr.textContent).not.toMatch(/2F\s*=\s*\d/);
    globalThis.localStorage.removeItem(KEY);
  });
});

describe('LensBenchScreen — IScreen lifecycle', () => {
  function mountScreen() {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const screen = new LensBenchScreen();
    screen.mount(host);
    const exp = (window as unknown as { lensBenchExperiment?: LensBenchExperiment }).lensBenchExperiment;
    return { host, screen, exp };
  }

  it('meta.id = "lens-bench"', () => {
    const screen = new LensBenchScreen();
    expect(screen.meta.id).toBe('lens-bench');
  });

  it('meta.label и meta.kicker заданы', () => {
    const screen = new LensBenchScreen();
    expect(screen.meta.label).toBe('Оптическая сила линзы');
    expect(screen.meta.kicker).toBe('Опыт 4.1 · Линзы');
  });

  it('mount инжектирует template и регистрирует эксперимент', () => {
    const { host, exp, screen } = mountScreen();
    expect(host.querySelector('#optical-bench')).not.toBeNull();
    expect(exp).toBeDefined();
    screen.unmount();
    host.remove();
  });

  it('двойной mount — no-op (не падает)', () => {
    const { host, screen } = mountScreen();
    expect(() => screen.mount(host)).not.toThrow();
    screen.unmount();
    host.remove();
  });

  it('unmount очищает DOM и эксперимент', () => {
    const { host, screen } = mountScreen();
    screen.unmount();
    expect(host.children.length).toBe(0);
    const exp2 = (window as unknown as { lensBenchExperiment?: LensBenchExperiment }).lensBenchExperiment;
    expect(exp2).toBeUndefined();
    host.remove();
  });

  it('reset() не падает после mount', () => {
    const { host, screen } = mountScreen();
    expect(() => screen.reset()).not.toThrow();
    screen.unmount();
    host.remove();
  });

  it('template содержит task-switcher #steps с задачами A/B (4.1/4.2)', () => {
    const { host, screen } = mountScreen();
    const steps = host.querySelector('#steps');
    expect(steps).not.toBeNull();
    const tasks = host.querySelectorAll('#steps [data-task]');
    expect(tasks.length).toBe(2);
    const ids = Array.from(tasks).map((t) => (t as HTMLElement).dataset['task']);
    expect(ids).toEqual(['A-power', 'B-focal2f']);
    screen.unmount();
    host.remove();
  });

  it('template содержит #object-slider (положение предмета)', () => {
    const { host, screen } = mountScreen();
    expect(host.querySelector('#object-slider')).not.toBeNull();
    expect(host.querySelector('#object-slider-row')).not.toBeNull();
    screen.unmount();
    host.remove();
  });
});

describe('LensBenchExperiment — задача C (опыт 4.4 свойства изображения)', () => {
  const created: Array<{ exp: LensBenchExperiment; host: HTMLElement }> = [];

  function make(): { exp: LensBenchExperiment; refs: ExperimentRefs; host: HTMLElement } {
    const result = makeExperiment();
    created.push({ exp: result.exp, host: result.host });
    return result;
  }

  afterEach(() => {
    while (created.length > 0) {
      const item = created.pop()!;
      item.exp.destroy();
      item.host.remove();
    }
    localStorage.removeItem('inter-oge.record-mode.kit-4');
    globalThis.gc?.();
  });

  it('setActiveTask("C-image") активирует задачу C и показывает слайдер предмета', () => {
    const { exp, refs } = make();
    exp.setActiveTask('C-image');
    expect(exp.activeTask).toBe('C-image');
    expect(refs.objectSliderRow!.hidden).toBe(false);
  });

  it('диапазон слайдера предмета в C достаёт зоны <F и >2F (min≤60, max≥300)', () => {
    const { exp, refs } = make();
    exp.setActiveTask('C-image');
    expect(Number(refs.objectSlider.min)).toBeLessThanOrEqual(60);
    expect(Number(refs.objectSlider.max)).toBeGreaterThanOrEqual(300);
  });

  it('зона-ридаут обновляется из imageProperties при движении предмета (F=100)', () => {
    const { exp, refs } = make();
    exp.setActiveTask('C-image');
    exp.placeInSlot('object', 'light-object');
    exp.placeInSlot('lens', 'lens');
    exp.placeInSlot('screen', 'screen');
    exp.setObjectDistanceMm(300);
    expect(refs.objectZoneReadout!.textContent).toContain('d > 2F');
    exp.setObjectDistanceMm(60);
    expect(refs.objectZoneReadout!.textContent).toContain('d < F');
  });

  it('запись строки C: журнал-строка несёт zone(label) + скрытые d_mm,F_mm; gamma/kind пустые в semi-auto', () => {
    const { exp, refs } = make();
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
    exp.setActiveTask('C-image');
    exp.placeInSlot('object', 'light-object');
    exp.placeInSlot('lens', 'lens');
    exp.placeInSlot('screen', 'screen');
    exp.setObjectDistanceMm(300);
    exp.recordMeasurement();
    const sel = refs.journalHost!.querySelector('select[data-key="kind"]');
    expect(sel).not.toBeNull();
    expect(exp.measurements.filter((m) => m.task === 'C-image').length).toBe(1);
  });

  it('fully-auto: запись авто-заполняет категории (kind=действительное при d>2F)', () => {
    const { exp, refs } = make();
    localStorage.setItem('inter-oge.record-mode.kit-4', 'fully-auto');
    exp.setActiveTask('C-image');
    exp.placeInSlot('object', 'light-object');
    exp.placeInSlot('lens', 'lens');
    exp.placeInSlot('screen', 'screen');
    exp.setObjectDistanceMm(300);
    exp.recordMeasurement();
    const td = refs.journalHost!.querySelector('td[data-key="kind"]')!;
    expect(td.textContent).toContain('действительное');
  });

  it('a11y: в semi-auto live-region и result-panel НЕ содержат правильную категорию', () => {
    const { exp, refs } = make();
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
    exp.setActiveTask('C-image');
    exp.placeInSlot('object', 'light-object');
    exp.placeInSlot('lens', 'lens');
    exp.placeInSlot('screen', 'screen');
    exp.setObjectDistanceMm(300);
    exp.recordMeasurement();
    for (const node of [refs.liveRegion, refs.resultPanel]) {
      const t = node.textContent ?? '';
      expect(t).not.toContain('уменьшенное');
      expect(t).not.toContain('перевёрнутое');
      expect(t).not.toContain('действительное');
    }
  });

  it('изоляция задач: измерения C не видны в журнале A', () => {
    const { exp } = make();
    localStorage.setItem('inter-oge.record-mode.kit-4', 'fully-auto');
    exp.setActiveTask('C-image');
    exp.placeInSlot('object', 'light-object');
    exp.placeInSlot('lens', 'lens');
    exp.placeInSlot('screen', 'screen');
    exp.setObjectDistanceMm(300);
    exp.recordMeasurement();
    exp.setActiveTask('A-power');
    expect(exp.measurements.filter((m) => m.task === 'A-power').length).toBe(0);
  });

  it('fully-auto: смена режима при задаче C НЕ авто-записывает (антифлуд)', () => {
    const { exp, host } = make();
    exp.setActiveTask('C-image');
    exp.placeInSlot('object', 'light-object');
    exp.placeInSlot('lens', 'lens');
    exp.placeInSlot('screen', 'screen');
    exp.setObjectDistanceMm(300);
    // Кликаем кнопку «Авто» в record-mode-slot, которую renderRecordModeToggle отрендерил.
    const autoBtn = host.querySelector<HTMLButtonElement>('.lab-record-mode-toggle__segment[data-mode="fully-auto"]');
    autoBtn?.click();
    expect(exp.measurements.filter((m) => m.task === 'C-image').length).toBe(0);
  });
});
