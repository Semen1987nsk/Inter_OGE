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
    resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
    cards: host.querySelectorAll<any>('lab-equipment-card'),
    recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
    journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
    recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
    recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
    recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
  };
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

  it('get imageOrientation: inverted при d>F (реальное перевёрнутое)', () => {
    assembleBench(experiment);
    experiment.setObjectDistanceMm(300); // d=300 > F=100
    expect(experiment.imageOrientation).toBe('inverted');
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
});
