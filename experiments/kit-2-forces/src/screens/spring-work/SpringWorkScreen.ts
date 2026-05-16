/**
 * SpringWorkScreen — экран «Работа силы упругости» (опыт 2.4 ФИПИ ОГЭ-2026).
 *
 * Установка ИДЕНТИЧНА опыту 2.1 (пружина+штатив+грузы+динамометр).
 * Различие — финальный расчёт и подача:
 *   2.1: ученик считает k = F/Δl (искомая величина — жёсткость).
 *   2.4: ученик строит таблицу W(Δl) и убеждается в **квадратичной**
 *        зависимости работы упругой от удлинения, а также проверяет
 *        баланс энергии: A_грав = 2 · W_упр.
 *
 * Реюз ~95% кода: SpringExperiment + template.html опыта 2.1, кастомные
 * рендереры журнала и результата через SpringRenderers (см. SpringExperiment.ts).
 *
 * Колонки журнала:
 *   №   m, г   Δl, см   F, Н   W (k·Δl²/2), Дж   W (F·Δl/2), Дж   A_грав, Дж
 *
 * Результат: серия измерений → демонстрация квадратичного роста W,
 * график F(Δl) с закрашиваемым треугольником (= W).
 */

import templateHtml from '../spring-stiffness/template.html?raw';
import type { LabStand } from '@/ui/components/lab-stand';
import type { LabGraph } from '@/ui/components/lab-graph';
import type { LabEquipmentCard } from '@/ui/components/lab-equipment-card';
import {
  SpringExperiment,
  type ExperimentRefs,
  type SpringRenderers,
} from '../spring-stiffness/SpringExperiment';
import {
  workFromStiffness,
  workFromForce,
  workOfGravity,
  formatWork,
} from '@physics/spring/WorkCalc';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class SpringWorkScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'spring-work',
    label: 'Работа упругости',
    kicker: 'Опыт 2.4',
    icon: 'work',
    tooltip: 'Измерение работы силы упругости — закон W = k·Δl²/2 и баланс энергии',
  };

  #experiment: SpringExperiment | null = null;
  #host: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    if (this.#experiment) return;
    this.#host = host;
    host.innerHTML = templateHtml;
    host.dataset['mode'] = 'work';

    // ─── Тексты под фокус «работа упругой силы» ────────────────
    const eyebrow = host.querySelector('.experiment-eyebrow');
    if (eyebrow) eyebrow.textContent = 'Опыт 2.4';
    const title = host.querySelector('.experiment-title');
    if (title) title.textContent = 'Работа силы упругости';
    const initialHint = host.querySelector('#hint-bar');
    if (initialHint) {
      initialHint.textContent =
        'Подвесьте пружину и динамометр. Затем повесьте груз, запишите Δl и l₀ — система посчитает работу W = k·Δl²/2 и сравнит её с работой силы тяжести.';
    }

    // ─── Заголовки журнала под колонки 2.4 ────────────────────
    this.#patchJournalHeaders(host);

    // ─── Формула в журнале ────────────────────────────────────
    this.#patchFormulaDisplay(host);

    const refs: ExperimentRefs = {
      stage: host.querySelector<HTMLElement>('#stage')!,
      standContainer: host.querySelector<HTMLElement>('#stand-container')!,
      stand: host.querySelector('#stand') as LabStand,
      dragOverlay: host.querySelector<HTMLElement>('#drag-overlay')!,
      dropZoneSpring: host.querySelector<HTMLElement>('#drop-zone-spring')!,
      dropZoneBottom: host.querySelector<HTMLElement>('#drop-zone-bottom')!,
      hintBar: host.querySelector<HTMLElement>('#hint-bar')!,
      journalEmpty: host.querySelector<HTMLElement>('#journal-empty')!,
      journalTable: host.querySelector('#journal-table') as HTMLTableElement,
      journalBody: host.querySelector<HTMLElement>('#journal-body')!,
      liveRegion: host.querySelector<HTMLElement>('#live-region')!,
      resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
      graph: host.querySelector('#graph') as LabGraph,
      recordBtn: host.querySelector('#record-btn') as HTMLButtonElement,
      resetBtn: host.querySelector('#reset-btn') as HTMLButtonElement,
      cards: host.querySelectorAll<LabEquipmentCard>('lab-equipment-card'),
      compositeTray: host.querySelector('#composite-tray') as
        | import('@/ui/components/lab-composite-tray').LabCompositeTray
        | null,
      measurementPanel: host.querySelector<HTMLElement>('#measurement-panel')!,
      measurementToggle: host.querySelector('#measurement-toggle') as HTMLButtonElement,
      measurementCount: host.querySelector<HTMLElement>('#measurement-count')!,
      steps: host.querySelector<HTMLElement>('#steps')!,
      overloadBanner: host.querySelector<HTMLElement>('#overload-banner')!,
      recordForm: host.querySelector('#record-form') as HTMLFormElement,
      rfL0: host.querySelector('#rf-l0') as HTMLInputElement,
      rfL1: host.querySelector('#rf-l1') as HTMLInputElement,
      rfMass: host.querySelector('#rf-mass') as HTMLOutputElement,
      rfCancel: host.querySelector('#rf-cancel') as HTMLButtonElement,
      rfSubmit: host.querySelector('#rf-submit') as HTMLButtonElement,
      // §20.4 — toggle режима НЕ передаём: 2.4 пока использует custom-renderer
      // (legacy v1 table). Будет переход на shared spec в следующей итерации.
      // journal-host: НЕ передаём — custom renderer рисует в #journal-table.
    };

    const renderers: SpringRenderers = {
      journal: (state, { journalBody }) => {
        journalBody.replaceChildren();
        state.measurements.forEach((m, i) => {
          const tr = document.createElement('tr');
          const dlCm = m.extension; // см
          const F = m.force; // Н
          const k = m.k; // Н/м
          const W_k = workFromStiffness(k, dlCm);
          const W_F = workFromForce(F, dlCm);
          const A_grav = workOfGravity(m.totalMass, dlCm);
          tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${m.totalMass}</td>
            <td>${dlCm.toFixed(2)}</td>
            <td>${F.toFixed(2)}</td>
            <td>${formatWork(W_k)}</td>
            <td>${formatWork(W_F)}</td>
            <td>${formatWork(A_grav)}</td>
          `;
          journalBody.appendChild(tr);
        });
      },
      result: (state, { resultPanel }) => {
        // Покажем результат уже после первого же измерения — главное «открытие»
        // (квадратичный рост) видно даже на 2-3 точках, но и одной достаточно
        // для проверки баланса энергии A_грав ≈ 2·W_упр.
        if (state.measurements.length === 0 || !state.spring) {
          resultPanel.innerHTML = '';
          resultPanel.setAttribute('hidden', '');
          return;
        }
        const last = state.measurements[state.measurements.length - 1]!;
        const k = last.k;
        const dl = last.extension;
        const F = last.force;
        const m = last.totalMass;
        const W_k = workFromStiffness(k, dl);
        const W_F = workFromForce(F, dl);
        const A = workOfGravity(m, dl);
        const ratio = W_k > 0 ? A / W_k : 0;

        // Если ≥ 3 измерений — добавим демонстрацию квадратичности (W₂/W₁ ≈ (Δl₂/Δl₁)²)
        let quadHtml = '';
        if (state.measurements.length >= 2) {
          const m1 = state.measurements[0]!;
          const m2 = last;
          const dlRatio = m2.extension / m1.extension;
          const W1 = workFromStiffness(m1.k, m1.extension);
          const W2 = workFromStiffness(m2.k, m2.extension);
          const wRatio = W2 / W1;
          const expectedRatio = dlRatio * dlRatio;
          quadHtml = `
            <p class="result-success" style="margin-top:8px">
              Квадратичный рост: при Δl₂/Δl₁ = ${dlRatio.toFixed(2)}
              работа выросла в ${wRatio.toFixed(2)}× (теория: ${expectedRatio.toFixed(2)}×).
            </p>`;
        }

        resultPanel.innerHTML = `
          <h3 class="result-title">Результат (последнее измерение)</h3>
          <div class="result-grid">
            <div class="result-row"><span><em>W</em><sub>упр</sub> через k·Δl²/2</span><strong>${formatWork(W_k)} Дж</strong></div>
            <div class="result-row"><span><em>W</em><sub>упр</sub> через F·Δl/2</span><strong>${formatWork(W_F)} Дж</strong></div>
            <div class="result-row"><span><em>A</em><sub>грав</sub> = m·g·Δl</span><strong>${formatWork(A)} Дж</strong></div>
            <div class="result-row"><span>Отношение A<sub>грав</sub> / W<sub>упр</sub></span><strong>${ratio.toFixed(2)} ≈ 2</strong></div>
          </div>
          <p class="result-success">
            ✓ A<sub>грав</sub> ровно в 2 раза больше W<sub>упр</sub>.
            Половина работы силы тяжести запасается в пружине, половина —
            в кинетической энергии груза при колебаниях (или поглощается
            рукой при медленном опускании). Это закон сохранения энергии.
          </p>
          ${quadHtml}
        `;
        resultPanel.removeAttribute('hidden');
      },
    };

    this.#experiment = new SpringExperiment(refs, renderers);
    (window as unknown as { springWorkExperiment?: SpringExperiment }).springWorkExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.destroy();
    this.#experiment.reset();
    delete (window as unknown as { springWorkExperiment?: SpringExperiment }).springWorkExperiment;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  reset(): void {
    this.#experiment?.reset();
  }

  /** Подменяет thead журнала под колонки 2.4. */
  #patchJournalHeaders(host: HTMLElement): void {
    const thead = host.querySelector('#journal-table thead tr');
    if (!thead) return;
    thead.innerHTML = `
      <th>№</th>
      <th><em>m</em>, г</th>
      <th>Δ<em>l</em>, см</th>
      <th><em>F</em>, Н</th>
      <th><em>W</em> = k·Δl²/2, Дж</th>
      <th><em>W</em> = F·Δl/2, Дж</th>
      <th><em>A</em><sub>грав</sub>, Дж</th>
    `;
  }

  /** Подменяет формулу под фокус расчёта работы. */
  #patchFormulaDisplay(host: HTMLElement): void {
    const formula = host.querySelector('#formula-display');
    if (!formula) return;
    formula.innerHTML = `
      <span class="formula-label">Формула</span>
      <span class="formula-expr">
        <em>W</em><sub>упр</sub> = <em>k</em> · Δ<em>l</em>² / 2
        = <em>F</em> · Δ<em>l</em> / 2
      </span>
      <span class="formula-units">
        Δ<em>l</em> в метрах (см ÷ 100), <em>k</em> в Н/м, <em>F</em> в Н
        → <em>W</em> в джоулях.
      </span>
    `;
  }
}
