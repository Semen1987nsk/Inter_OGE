/**
 * SpringWorkScreen — экран «Работа силы упругости».
 *
 * ⚠️ БОНУС ЛАБОСФЕРА — НЕ ВХОДИТ В ФИПИ.
 * Причина: работа упругости в ФИПИ только для kit-6 (блоки). КОДИФ §1.29.
 *
 * Установка ИДЕНТИЧНА опыту 2.1 (пружина+штатив+грузы+динамометр).
 * Различие — финальный расчёт и подача:
 *   2.1: ученик считает k = F/Δl (искомая величина — жёсткость).
 *   бонус: ученик строит таблицу W(Δl) и убеждается в **квадратичной**
 *          зависимости работы упругой от удлинения, а также проверяет
 *          баланс энергии: A_грав = 2 · W_упр.
 *
 * Журнал v2 — renderJournalTable(SPRING_WORK_SPEC):
 *   №   m, г   Δl, см   k, Н/м   F, Н   W = k·Δl²/2, Дж   W = F·Δl/2, Дж   A_грав, Дж
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
import { SPRING_WORK_SPEC } from '@labosfera/shared-spa/lib/journal/specs';
import type { JournalRow } from '@labosfera/shared-spa/lib/journal/types';
import type { SpringSetupState } from '@/types/spring/setup';
import type { RecordMode } from '@labosfera/shared-spa/lib/record-mode';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class SpringWorkScreen implements IScreen {
  // ⚠️ БОНУС ЛАБОСФЕРА — НЕ ВХОДИТ В ФИПИ. Причина: работа упругости в ФИПИ только для kit-6 (блоки). КОДИФ §1.29.
  readonly meta: ScreenMeta = {
    id: 'spring-work',
    label: 'Работа упругости',
    kicker: 'Бонус',
    icon: 'work',
    tooltip: 'Бонус ЛАБОСФЕРЫ: работа силы упругости — W = k·Δl²/2, баланс энергии A_грав = 2·W',
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
    if (eyebrow) eyebrow.textContent = 'Бонус';
    const title = host.querySelector('.experiment-title');
    if (title) title.textContent = 'Работа силы упругости';
    const initialHint = host.querySelector('#hint-bar');
    if (initialHint) {
      initialHint.textContent =
        'Подвесьте пружину и динамометр. Затем повесьте груз и запишите Δl — система посчитает работу W = k·Δl²/2 и проверит баланс энергии.';
    }

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
      // §21 v2 — передаём journal-host и record-mode-slot
      recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
      journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
      recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
      recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement) ?? undefined,
      recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
    };

    const renderers: SpringRenderers = {
      // §21 v2 — SPRING_WORK_SPEC вместо SPRING_SPEC; buildRows вместо journal (v1)
      journalSpec: SPRING_WORK_SPEC,
      buildRows: (
        state: SpringSetupState,
        drafts: Map<number, Record<string, number>>,
        mode: RecordMode,
      ): JournalRow[] => {
        return state.measurements.map((m, i) => {
          const draft = drafts.get(m.timestamp) ?? {};
          // dl_cm: в fully-auto берём из физики; иначе из черновика ученика (или null)
          const dlCm = mode === 'fully-auto' ? m.extension : (draft['dl_cm'] ?? null);
          // F_N, W_k_J, W_F_J, A_grav_J: в fully-auto программа считает; иначе ученик вводит
          const F_N = mode === 'fully-auto' ? m.force : (draft['F_N'] ?? null);
          const W_k_J = mode === 'fully-auto'
            ? workFromStiffness(m.k, m.extension)
            : (draft['W_k_J'] ?? null);
          const W_F_J = mode === 'fully-auto'
            ? workFromForce(m.force, m.extension)
            : (draft['W_F_J'] ?? null);
          const A_grav_J = mode === 'fully-auto'
            ? workOfGravity(m.totalMass, m.extension)
            : (draft['A_grav_J'] ?? null);
          return {
            idx: i + 1,
            timestamp: m.timestamp,
            values: {
              idx: i + 1,
              m_g: m.totalMass,
              dl_cm: dlCm,
              k_N_m: m.k,
              F_N,
              W_k_J,
              W_F_J,
              A_grav_J,
            },
          };
        });
      },
      result: (state, { resultPanel }) => {
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

        let quadHtml = '';
        if (state.measurements.length >= 2) {
          const m1 = state.measurements[0]!;
          const m2 = last;
          const dlRatio = m2.extension / m1.extension;
          const W1 = workFromStiffness(m1.k, m1.extension);
          const W2 = workFromStiffness(m2.k, m2.extension);
          const wRatio = W1 > 0 ? W2 / W1 : 0;
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
            A<sub>грав</sub> ровно в 2 раза больше W<sub>упр</sub>.
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
