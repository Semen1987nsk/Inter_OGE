/**
 * refraction.test.ts — state-machine тест RefractionExperiment (каркас T5).
 *
 * TDD: сначала написаны тесты, потом реализация.
 * Паттерн: happy-dom + customElements (зеркало lens-bench.test.ts).
 *
 * Тестирует RefractionExperiment через публичный API:
 *   placeInSlot, setIncidenceAngle, setActiveTask, recordMeasurement, reset, destroy
 * НЕ эмулирует pointer-events — для D&D-путей используется Playwright (selfcheck).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Регистрируем компоненты (реальные, не мок)
import '../../../ui/components/lab-protractor-disc';
import '../../../ui/components/lab-equipment-card';
import '../../../ui/components/lab-graph';

import { RefractionExperiment, type RefractionRefs } from '../RefractionExperiment';

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function buildRefs(): { refs: RefractionRefs; host: HTMLElement } {
  const host = document.createElement('div');
  document.body.appendChild(host);

  host.innerHTML = `
    <div id="stage">
      <lab-protractor-disc id="protractor-disc"
        aria-label="Круговой транспортир с полуцилиндром"></lab-protractor-disc>
      <div id="hint-bar">Подсказка</div>
      <div id="drag-overlay" aria-hidden="true"></div>
      <aside id="result-panel" aria-live="polite" hidden></aside>
      <button id="reset-btn" type="button" aria-label="Сбросить опыт"></button>
      <ol id="steps" role="tablist" aria-label="Задача">
        <li data-task="A-index" role="tab" tabindex="0"
            aria-selected="true" data-state="active">A</li>
        <li data-task="B-angle" role="tab" tabindex="-1"
            aria-selected="false">B</li>
      </ol>
      <div id="live-region" role="status" aria-live="polite" class="sr-only"></div>
      <div id="record-mode-slot"></div>
      <div id="journal-host" hidden></div>
      <div id="record-pending-slot" hidden>
        <button id="record-pending-btn" type="button">
          <span id="record-pending-summary"></span>
        </button>
      </div>
      <!-- Блок графика (опыт 4.6) -->
      <div id="graph-block" hidden>
        <lab-graph id="refraction-graph"
          aria-label="График зависимости угла преломления от угла падения"
        ></lab-graph>
        <button id="graph-toggle-btn" type="button" aria-pressed="false"></button>
      </div>
    </div>
    <lab-equipment-card data-eq="semicylinder" status="available">
      <div class="eq-glyph" aria-label="Полуцилиндр"></div>
    </lab-equipment-card>
    <lab-equipment-card data-eq="emitter" status="available">
      <div class="eq-glyph" aria-label="Осветитель"></div>
    </lab-equipment-card>
  `;

  // Ждём, чтобы connectedCallback у lab-protractor-disc отработал
  const disc = host.querySelector<HTMLElement>('#protractor-disc')! as HTMLElement & {
    getSlotRect(id: string): DOMRect;
    setSlotHover(id: string, on: boolean): void;
    setPlaced(kind: string, on: boolean): void;
    setDragging(on: boolean): void;
    setIncidenceAngle(i: number): void;
    readonly incidenceAngleDeg: number;
    readonly refractionAngleDeg: number;
  };

  const refs: RefractionRefs = {
    stage: host.querySelector<HTMLElement>('#stage')!,
    disc,
    dragOverlay: host.querySelector<HTMLElement>('#drag-overlay')!,
    hintBar: host.querySelector<HTMLElement>('#hint-bar')!,
    liveRegion: host.querySelector<HTMLElement>('#live-region')!,
    resetBtn: host.querySelector('#reset-btn') as HTMLButtonElement,
    steps: host.querySelector<HTMLElement>('#steps')!,
    resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
    cards: host.querySelectorAll<any>('lab-equipment-card'),
    graphHost: host.querySelector<HTMLElement>('#graph-block') ?? undefined,
    graphToggleBtn: (host.querySelector('#graph-toggle-btn') as HTMLButtonElement | null) ?? undefined,
    recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
    journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
    recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
    recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
    recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
  };

  return { refs, host };
}

// ─── Тесты ───────────────────────────────────────────────────────────────────

describe('RefractionExperiment — каркас (T5)', () => {
  let exp: RefractionExperiment;
  let host: HTMLElement;

  beforeEach(() => {
    const built = buildRefs();
    host = built.host;
    exp = new RefractionExperiment(built.refs);
  });

  afterEach(() => {
    exp.destroy();
    host.remove();
    globalThis.gc?.();
  });

  // ─── Дефолтное состояние ──────────────────────────────────────────────────

  it('дефолтная задача A-index', () => {
    // Обязан давать красный если default поменяют на B-angle
    expect(exp.activeTask).toBe('A-index');
  });

  it('дефолтный угол падения 45° (консистентно с disc.incidenceAngleDeg)', () => {
    // Обязан давать красный если дефолт поменяют на 0 или 90
    expect(exp.incidenceAngleDeg).toBe(45);
  });

  it('дефолтный угол преломления 28° при n=1.5 (Снелл: asin(sin45°/1.5)≈28)', () => {
    // Проверяет, что refractionAngleDeg проксируется с disc без искажений
    // Обязан давать красный если disc.refractionAngleDeg не 28 при i=45
    expect(exp.refractionAngleDeg).toBe(28);
  });

  it('bothPlaced=false до размещения приборов', () => {
    // Обязан давать красный если реализация ставит bothPlaced=true без размещения
    expect(exp.bothPlaced).toBe(false);
  });

  it('measurements пустой в начале', () => {
    expect(exp.measurements.length).toBe(0);
  });

  // ─── setActiveTask ────────────────────────────────────────────────────────

  it('setActiveTask(B-angle) переключает активную задачу', () => {
    exp.setActiveTask('B-angle');
    // Обязан давать красный если setActiveTask игнорируется
    expect(exp.activeTask).toBe('B-angle');
  });

  it('setActiveTask(A-index) возвращает обратно в A', () => {
    exp.setActiveTask('B-angle');
    exp.setActiveTask('A-index');
    // Обязан давать красный если возврат в A не работает
    expect(exp.activeTask).toBe('A-index');
  });

  it('[data-task] в #steps обновляет aria-selected после setActiveTask', () => {
    exp.setActiveTask('B-angle');
    const itemA = host.querySelector<HTMLElement>('[data-task="A-index"]')!;
    const itemB = host.querySelector<HTMLElement>('[data-task="B-angle"]')!;
    // Обязан давать красный если #refreshTaskStepper не вызывается
    expect(itemA).not.toBeNull();
    expect(itemB).not.toBeNull();
    expect(itemB.getAttribute('aria-selected')).toBe('true');
    expect(itemA.getAttribute('aria-selected')).toBe('false');
  });

  it('клик по [data-task=B-angle] в #steps переключает задачу', () => {
    const stepB = host.querySelector<HTMLElement>('[data-task="B-angle"]')!;
    expect(stepB).not.toBeNull(); // guard: тест падает если B нет в steps
    stepB.click();
    // Обязан давать красный если click-handler не подключён
    expect(exp.activeTask).toBe('B-angle');
  });

  // ─── setIncidenceAngle ────────────────────────────────────────────────────

  it('setIncidenceAngle(45) → incidenceAngleDeg=45, refractionAngleDeg=28', () => {
    exp.setIncidenceAngle(45);
    // Обязан давать красный если setIncidenceAngle не проксирует в disc
    expect(exp.incidenceAngleDeg).toBe(45);
    expect(exp.refractionAngleDeg).toBe(28);
  });

  it('setIncidenceAngle(30) → incidenceAngleDeg=30 (синхронен со Store)', () => {
    exp.setIncidenceAngle(30);
    // Обязан давать красный если Store не обновляется
    expect(exp.incidenceAngleDeg).toBe(30);
  });

  it('setIncidenceAngle(60) → refractionAngleDeg корректен по Снеллу', () => {
    exp.setIncidenceAngle(60);
    // asin(sin60°/1.5) = asin(0.5774) ≈ 35° (Math.round)
    const r = exp.refractionAngleDeg;
    // Обязан давать красный если формула Снелла не применяется
    expect(r).toBeGreaterThan(30);
    expect(r).toBeLessThan(45);
  });

  // ─── placeInSlot ─────────────────────────────────────────────────────────

  it('placeInSlot("semicylinder", "semicylinder") → bothPlaced остаётся false (emitter не добавлен)', () => {
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    // Обязан давать красный если bothPlaced=true при одном приборе
    expect(exp.bothPlaced).toBe(false);
  });

  it('placeInSlot оба прибора → bothPlaced=true', () => {
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    // Обязан давать красный если bothPlaced не обновляется после двух размещений
    expect(exp.bothPlaced).toBe(true);
  });

  it('placeInSlot обоих → disc.setPlaced показал стекло и осветитель', () => {
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    const disc = document.querySelector('lab-protractor-disc') as HTMLElement;
    const sr = disc.shadowRoot!;
    // Прямая фальсифицируемая проверка: до placeInSlot .glass-body/.emitter-group скрыты (hidden);
    // если #recordPlacement НЕ зовёт disc.setPlaced(kind,true) — они останутся hidden → тест красный.
    expect(sr.querySelector('.glass-body')!.hasAttribute('hidden')).toBe(false);
    expect(sr.querySelector('.emitter-group')!.hasAttribute('hidden')).toBe(false);
  });

  // ─── recordMeasurement (заглушка T5) ─────────────────────────────────────

  it('recordMeasurement до размещения приборов — игнорируется', () => {
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    // Обязан давать красный если запись идёт без bothPlaced
    expect(exp.measurements.length).toBe(0);
  });

  it('recordMeasurement (заглушка) добавляет {task,i,r} после размещения обоих', () => {
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    // Обязан давать красный если recordMeasurement не пишет в measurements
    expect(exp.measurements.length).toBe(1);
    const m = exp.measurements.at(-1)!;
    expect(m).toMatchObject({ iDeg: 45, rDeg: 28 });
  });

  it('recordMeasurement несёт task из activeTask', () => {
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setActiveTask('B-angle');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    // Обязан давать красный если task не берётся из activeTask
    expect(exp.measurements.at(-1)!.task).toBe('B-angle');
  });

  it('несколько recordMeasurement накапливаются', () => {
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    for (const i of [30, 45, 60]) {
      exp.setIncidenceAngle(i);
      exp.recordMeasurement();
    }
    // Обязан давать красный если measurements не накапливаются
    expect(exp.measurements.length).toBe(3);
  });

  // ─── reset ────────────────────────────────────────────────────────────────

  it('reset: возвращает угол к дефолту (45°)', () => {
    exp.setIncidenceAngle(70);
    exp.reset();
    // Обязан давать красный если reset не восстанавливает дефолтный угол
    expect(exp.incidenceAngleDeg).toBe(45);
  });

  it('reset: очищает measurements', () => {
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    expect(exp.measurements.length).toBe(1);
    exp.reset();
    // Обязан давать красный если reset не очищает measurements
    expect(exp.measurements.length).toBe(0);
  });

  it('reset: bothPlaced сбрасывается в false', () => {
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    expect(exp.bothPlaced).toBe(true);
    exp.reset();
    // Обязан давать красный если reset не очищает placed
    expect(exp.bothPlaced).toBe(false);
  });

  it('reset сохраняет activeTask (brief §3 п. reset)', () => {
    exp.setActiveTask('B-angle');
    exp.setIncidenceAngle(70);
    exp.reset();
    // Обязан давать красный если reset сбрасывает activeTask (это не нужно по брифу)
    expect(exp.activeTask).toBe('B-angle');
  });

  // ─── destroy ─────────────────────────────────────────────────────────────

  it('destroy не бросает исключений', () => {
    expect(() => exp.destroy()).not.toThrow();
  });

  it('двойной destroy не бросает', () => {
    exp.destroy();
    // Обязан давать красный если destroy падает при повторном вызове
    expect(() => exp.destroy()).not.toThrow();
  });

  // ─── Кнопка reset ─────────────────────────────────────────────────────────

  it('клик по #reset-btn вызывает reset (угол возвращается к 45)', () => {
    exp.setIncidenceAngle(70);
    const btn = host.querySelector<HTMLButtonElement>('#reset-btn')!;
    btn.click();
    // Обязан давать красный если #reset-btn не подключён
    expect(exp.incidenceAngleDeg).toBe(45);
  });

  // ─── ФИПИ-инвариант: n=1.5 даёт r≈28° при i=45° ─────────────────────────

  it('ФИПИ-инвариант: i=45°, n=1.5 → r=28° (контрольная точка Снелла)', () => {
    exp.setIncidenceAngle(45);
    // Эталонное значение: asin(sin(45°)/1.5) = asin(0.4714) ≈ 28.125° → round → 28
    // Обязан давать красный если физика изменится или n изменится
    expect(exp.refractionAngleDeg).toBe(28);
  });

  // ─── Hint engine ──────────────────────────────────────────────────────────

  it('hintBar содержит текст подсказки после инициализации', () => {
    const bar = host.querySelector<HTMLElement>('#hint-bar')!;
    // Обязан давать красный если HintEngine не инициализирован / не пишет
    expect(bar.textContent!.length).toBeGreaterThan(5);
  });

  it('hintBar обновляется при смене задачи на B-angle', () => {
    const bar = host.querySelector<HTMLElement>('#hint-bar')!;
    const textBefore = bar.textContent ?? '';
    exp.setActiveTask('B-angle');
    const textAfter = bar.textContent ?? '';
    // Обязан давать красный если подсказка не меняется при смене задачи
    // (тексты задач A и B разные по брифу)
    expect(textAfter).not.toBe(textBefore);
  });
});

// ─── RefractionScreen: монтирование IScreen-фасада ───────────────────────────

describe('RefractionScreen — mount / unmount', () => {
  it('#protractor-disc присутствует после mount', async () => {
    const { RefractionScreen } = await import('../RefractionScreen');
    const screen = new RefractionScreen();
    const host = document.createElement('div');
    document.body.appendChild(host);
    screen.mount(host);
    // Обязан давать красный если template.html не содержит #protractor-disc
    expect(host.querySelector('#protractor-disc')).not.toBeNull();
    screen.unmount();
    host.remove();
  });

  it('обе [data-task]-кнопки присутствуют после mount', async () => {
    const { RefractionScreen } = await import('../RefractionScreen');
    const screen = new RefractionScreen();
    const host = document.createElement('div');
    document.body.appendChild(host);
    screen.mount(host);
    // Обязан давать красный если один из табов A-index/B-angle отсутствует в template.html
    expect(host.querySelector('[data-task="A-index"]')).not.toBeNull();
    expect(host.querySelector('[data-task="B-angle"]')).not.toBeNull();
    screen.unmount();
    host.remove();
  });

  it('window.refractionExperiment установлен после mount', async () => {
    const { RefractionScreen } = await import('../RefractionScreen');
    const screen = new RefractionScreen();
    const host = document.createElement('div');
    document.body.appendChild(host);
    screen.mount(host);
    // Обязан давать красный если RefractionScreen не вешает window.refractionExperiment
    expect(
      (window as unknown as { refractionExperiment?: unknown }).refractionExperiment,
    ).toBeDefined();
    screen.unmount();
    host.remove();
  });

  it('unmount очищает host и удаляет window.refractionExperiment', async () => {
    const { RefractionScreen } = await import('../RefractionScreen');
    const screen = new RefractionScreen();
    const host = document.createElement('div');
    document.body.appendChild(host);
    screen.mount(host);
    screen.unmount();
    // Обязан давать красный если unmount не зовёт replaceChildren / не чистит window
    expect(host.children.length).toBe(0);
    expect(
      (window as unknown as { refractionExperiment?: unknown }).refractionExperiment,
    ).toBeUndefined();
    host.remove();
  });

  it('повторный mount на тот же host — idempotent (не дублирует эксперимент)', async () => {
    const { RefractionScreen } = await import('../RefractionScreen');
    const screen = new RefractionScreen();
    const host = document.createElement('div');
    document.body.appendChild(host);
    screen.mount(host);
    const expFirst = (window as unknown as { refractionExperiment?: unknown }).refractionExperiment;
    screen.mount(host); // второй вызов должен быть no-op
    // Обязан давать красный если mount не проверяет this.#experiment (создаёт дубликат)
    expect(
      (window as unknown as { refractionExperiment?: unknown }).refractionExperiment,
    ).toBe(expFirst);
    screen.unmount();
    host.remove();
    globalThis.gc?.();
  });

  it('meta.id === refraction', async () => {
    const { RefractionScreen } = await import('../RefractionScreen');
    const screen = new RefractionScreen();
    // Обязан давать красный если id опечатан или не задан
    expect(screen.meta.id).toBe('refraction');
  });

  it('meta.icon === prism', async () => {
    const { RefractionScreen } = await import('../RefractionScreen');
    const screen = new RefractionScreen();
    // Обязан давать красный если icon не prism (IScreen-контракт)
    expect(screen.meta.icon).toBe('prism');
  });

  it('saveState возвращает пустой объект', async () => {
    const { RefractionScreen } = await import('../RefractionScreen');
    const screen = new RefractionScreen();
    const host = document.createElement('div');
    document.body.appendChild(host);
    screen.mount(host);
    // Обязан давать красный если saveState возвращает undefined или бросает
    expect(screen.saveState()).toEqual({});
    screen.unmount();
    host.remove();
    globalThis.gc?.();
  });
});

// ─── Lifecycle: mount → destroy → remount ─────────────────────────────────────

describe('RefractionExperiment — lifecycle', () => {
  it('mount → destroy → remount: placeInSlot работает на 2-м монтировании', () => {
    const { refs: refs1, host: host1 } = buildRefs();
    const exp1 = new RefractionExperiment(refs1);
    exp1.destroy();
    host1.remove();

    const { refs: refs2, host: host2 } = buildRefs();
    const exp2 = new RefractionExperiment(refs2);
    (exp2 as any).placeInSlot('semicylinder', 'semicylinder');
    (exp2 as any).placeInSlot('emitter', 'emitter');
    // Обязан давать красный если двойной mount ломает состояние
    expect(exp2.bothPlaced).toBe(true);
    exp2.destroy();
    host2.remove();
    globalThis.gc?.();
  });
});

// ─── Журнал v2 (T7): опыт 4.3 n = sin i / sin r + no-leak ─────────────────────

describe('RefractionExperiment — журнал 4.3', () => {
  let currentHost: HTMLElement | null = null;

  afterEach(() => {
    currentHost?.remove();
    currentHost = null;
    localStorage.removeItem('inter-oge.record-mode.kit-4');
    globalThis.gc?.();
  });

  it('запись строки 4.3 рендерит журнал с i_deg,r_deg', () => {
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    const journalHost = refs.journalHost!;
    // Обязан давать красный если renderJournalTable не вызвался при записи
    expect(journalHost.querySelectorAll('.lab-journal-body tr').length).toBeGreaterThan(0);
    expect(journalHost.querySelector('[data-key="i_deg"]')).not.toBeNull();
    expect(journalHost.querySelector('[data-key="r_deg"]')).not.toBeNull();
    exp.destroy();
  });

  it('ЛГУЩИЙ-ТЕСТ guard: в fully-manual n — редактируемый input, проверяем input.value (НЕ textContent td)', () => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'fully-manual');
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    const input = refs.journalHost!.querySelector('input[data-key="n"]') as HTMLInputElement | null;
    // Обязан давать красный если derived n рендерится как readonly td (а не input) в fully-manual
    expect(input).not.toBeNull();
    // Пусто в fully-manual — ученик вводит сам; ассерт умеет краснеть если программа подставит значение
    expect(input!.value).toBe('');
    exp.destroy();
  });

  it('a11y no-leak: semi-auto — n не в result-panel, не в live-region; input[n] пуст (S5/S6)', async () => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    // result-panel: n≈1,5 не утекает (паттерн «1,5»/«1.5»)
    expect(/1[.,]5\d?/.test(refs.resultPanel.textContent ?? '')).toBe(false);
    // guard: панель не пуста — иначе ассерт выше проходит тавтологически
    expect((refs.resultPanel.textContent ?? '').length).toBeGreaterThan(10);
    // S6: n derived НЕ подставлен программой — поле ввода пусто (ассерт умеет краснеть)
    const nInput = refs.journalHost!.querySelector('input[data-key="n"]') as HTMLInputElement | null;
    expect(nInput).not.toBeNull();
    expect(nInput!.value).toBe('');
    // S5: live-region читаем ПОСЛЕ двойного rAF (announce откладывает запись); i/r озвучены, n — нет
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))));
    const live = refs.liveRegion.textContent ?? '';
    expect(live.length).toBeGreaterThan(0); // пустой live = провал (ассерт умеет краснеть)
    expect(/1[.,]5\d?/.test(live)).toBe(false); // n не озвучен
    exp.destroy();
  });

  it('fully-auto: derived n readonly ≈1,5', () => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'fully-auto');
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    const td = refs.journalHost!.querySelector('td[data-key="n"]')!;
    // Обязан давать красный если n рендерится input'ом в fully-auto (должен быть readonly текст)
    expect(td.querySelector('input')).toBeNull();
    expect(/1[.,]5/.test(td.textContent ?? '')).toBe(true);
    // fully-auto МОЖЕТ показать n в result-panel — проверяем что показывает (ассерт умеет краснеть)
    expect(/1[.,]5/.test(refs.resultPanel.textContent ?? '')).toBe(true);
    exp.destroy();
  });

  it('B-angle (4.6): нет derived-колонки n, result-panel без числа n', () => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'fully-auto');
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    exp.setActiveTask('B-angle');
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    // REFRACTION_ANGLE_SPEC не содержит колонку n
    expect(refs.journalHost!.querySelector('[data-key="n"]')).toBeNull();
    expect(refs.journalHost!.querySelector('[data-key="i_deg"]')).not.toBeNull();
    // Обязан давать красный если result-panel B-angle протащит число n стекла
    expect(/1[.,]5\d?/.test(refs.resultPanel.textContent ?? '')).toBe(false);
    exp.destroy();
  });

  it('pending-плашка (semi-auto) видна при bothPlaced && i>0, скрыта при i=0', () => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    // Обязан давать красный если pending не показывается в semi-auto при готовности
    expect(refs.recordPendingSlot!.hidden).toBe(false);
    exp.setIncidenceAngle(0);
    // i=0 → нет преломления → запись недоступна → pending скрыт
    expect(refs.recordPendingSlot!.hidden).toBe(true);
    exp.destroy();
  });

  it('анти-дубль: повторная запись того же i не добавляет строку', () => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    exp.recordMeasurement();
    // Обязан давать красный если сигнатура анти-дубля не работает
    expect(exp.measurements.length).toBe(1);
    exp.setIncidenceAngle(60);
    exp.recordMeasurement();
    expect(exp.measurements.length).toBe(2);
    exp.destroy();
  });
});

// ─── RefractionExperiment — график 4.6 ────────────────────────────────────────

describe('RefractionExperiment — график 4.6', () => {
  let currentHost: HTMLElement | null = null;

  afterEach(() => {
    currentHost?.remove();
    currentHost = null;
    localStorage.removeItem('inter-oge.record-mode.kit-4');
    globalThis.gc?.();
  });

  it('B-angle: после 3 записей lab-graph.data.series[0].points.length === 3, режим ri', () => {
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    exp.setActiveTask('B-angle');
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    for (const i of [30, 45, 60]) {
      exp.setIncidenceAngle(i);
      exp.recordMeasurement();
    }
    // graphHost обязан быть видимым в B-angle — обязан давать красный если hidden
    expect(refs.graphHost!.hidden).toBe(false);
    const graph = refs.graphHost!.querySelector('#refraction-graph') as any;
    // Обязан давать красный если #refreshGraph не передал данные в lab-graph
    expect(graph).not.toBeNull();
    expect(graph.data.series[0].points.length).toBe(3);
    expect(graph.data.xLabel).toBe('i, °');
    expect(graph.data.series[0].fit).toBe('curve');
    exp.destroy();
  });

  it('переключатель на sin: xLabel sin i, fit line, точка x≈sin(i°)', () => {
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    exp.setActiveTask('B-angle');
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    // Обязан давать красный если toggle не подключён к graphToggleBtn
    refs.graphToggleBtn!.click();
    const graph = refs.graphHost!.querySelector('#refraction-graph') as any;
    expect(graph.data.xLabel).toBe('sin i');
    expect(graph.data.series[0].fit).toBe('line');
    // Обязан давать красный если x не Math.sin(i°) (а просто iDeg)
    expect(
      Math.abs(graph.data.series[0].points[0].x - Math.sin(45 * Math.PI / 180)),
    ).toBeLessThan(1e-6);
    exp.destroy();
  });

  it('graph-toggle-btn: aria-pressed=true после переключения в sin', () => {
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    exp.setActiveTask('B-angle');
    // aria-pressed=false по умолчанию (ri-режим)
    expect(refs.graphToggleBtn!.getAttribute('aria-pressed')).toBe('false');
    refs.graphToggleBtn!.click();
    // Обязан давать красный если aria-pressed не обновляется при клике
    expect(refs.graphToggleBtn!.getAttribute('aria-pressed')).toBe('true');
    refs.graphToggleBtn!.click();
    // Обратный переключатель: ri → aria-pressed=false
    expect(refs.graphToggleBtn!.getAttribute('aria-pressed')).toBe('false');
    exp.destroy();
  });

  it('график скрыт в A-index', () => {
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    // Дефолтная задача A-index → блок скрыт
    // Обязан давать красный если #graph-block показывается при A-index
    expect(refs.graphHost!.hidden).toBe(true);
    exp.destroy();
  });

  it('график скрыт после переключения с B-angle обратно в A-index', () => {
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    exp.setActiveTask('B-angle');
    expect(refs.graphHost!.hidden).toBe(false); // guard: было видно
    exp.setActiveTask('A-index');
    // Обязан давать красный если блок остаётся видимым после смены задачи
    expect(refs.graphHost!.hidden).toBe(true);
    exp.destroy();
  });

  it('result-panel B-angle: содержит текст о нелинейности и законе Снелла (без числа n)', () => {
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    exp.setActiveTask('B-angle');
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    const text = refs.resultPanel.textContent ?? '';
    // Обязан давать красный если result-panel пуст или не содержит ключевых слов
    expect(text.length).toBeGreaterThan(10);
    // Проверяем слова-маркеры по брифу
    expect(/нелинейно/i.test(text)).toBe(true);
    expect(/Снелл/i.test(text)).toBe(true);
    // a11y no-leak: число n (1,5 / 1.5) не утекает
    expect(/1[.,]5\d?/.test(text)).toBe(false);
    exp.destroy();
  });

  it('sin-режим: gridXStep=0.2, gridYStep=0.2 переданы в lab-graph.data', () => {
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    exp.setActiveTask('B-angle');
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(30);
    exp.recordMeasurement();
    exp.setIncidenceAngle(60);
    exp.recordMeasurement();
    refs.graphToggleBtn!.click(); // → sin-режим
    const graph = refs.graphHost!.querySelector('#refraction-graph') as any;
    // Обязан давать красный если gridXStep не передаётся (сетка окажется по default=1)
    expect(graph.data.gridXStep).toBeCloseTo(0.2, 9);
    expect(graph.data.gridYStep).toBeCloseTo(0.2, 9);
    exp.destroy();
  });

  it('ri-режим: gridXStep=10, gridYStep=5 переданы в lab-graph.data', () => {
    const { refs, host } = buildRefs();
    currentHost = host;
    const exp = new RefractionExperiment(refs);
    exp.setActiveTask('B-angle');
    (exp as any).placeInSlot('semicylinder', 'semicylinder');
    (exp as any).placeInSlot('emitter', 'emitter');
    exp.setIncidenceAngle(45);
    exp.recordMeasurement();
    const graph = refs.graphHost!.querySelector('#refraction-graph') as any;
    // Обязан давать красный если gridXStep не 10 в ri-режиме
    expect(graph.data.gridXStep).toBe(10);
    expect(graph.data.gridYStep).toBe(5);
    exp.destroy();
  });
});

// ─── lab-graph: обратная совместимость gridXStep/gridYStep ───────────────────

describe('lab-graph — обратная совместимость gridXStep/gridYStep', () => {
  it('вызов без gridXStep/gridYStep: компонент создаётся и data.xMax сохраняется (обратная совместимость)', () => {
    const el = document.createElement('lab-graph') as any;
    document.body.appendChild(el);
    el.data = {
      series: [{ id: 'test', color: '#fff', fit: null, points: [] }],
      xLabel: 'U, В',
      yLabel: 'I, А',
      xMax: 10,
      yMax: 5,
      // gridXStep и gridYStep НЕ переданы → default 1
    };
    // Обязан давать красный если интерфейс сломан (TypeScript-уровень проверяется typecheck)
    expect(el.data.xMax).toBe(10);
    // Поля не переданы → undefined (обратная совместимость)
    expect(el.data.gridXStep).toBeUndefined();
    expect(el.data.gridYStep).toBeUndefined();
    el.remove();
  });

  it('вызов С gridXStep=10: поле сохраняется в data', () => {
    const el = document.createElement('lab-graph') as any;
    document.body.appendChild(el);
    el.data = {
      series: [],
      xLabel: 'i, °',
      yLabel: 'r, °',
      xMax: 90,
      yMax: 45,
      gridXStep: 10,
      gridYStep: 5,
    };
    // Обязан давать красный если setter не сохраняет переданные поля
    expect(el.data.gridXStep).toBe(10);
    expect(el.data.gridYStep).toBe(5);
    el.remove();
  });
});
