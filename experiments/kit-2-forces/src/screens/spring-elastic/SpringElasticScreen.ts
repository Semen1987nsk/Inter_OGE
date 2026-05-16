/**
 * SpringElasticScreen — экран «Сила упругости / F(Δl)» (опыт 2.2 по ФИПИ).
 *
 * По спецификации ФИПИ-2026 (комплект №2):
 *   — Измерение силы упругости (одиночные точки).
 *   — Исследование зависимости силы упругости от деформации пружины (график).
 *
 * Установка ИДЕНТИЧНА опыту 2.1 (пружина+штатив+грузы+динамометр), различие
 * только в фокусе задачи и подаче результатов:
 *   2.1: ученик считает k = F/Δl (искомая величина — жёсткость).
 *   2.2: ученик строит график F(Δl) и убеждается в его линейности (закон Гука).
 *
 * MVP-имплементация: используем тот же SpringExperiment с теми же refs
 * (template совпадает с 2.1), но в навигации это самостоятельный экран
 * с другим kicker'ом и иконкой «force». Через атрибут `data-mode="elastic"`
 * на корневом элементе экрана можем в будущем переключить hint-копи и
 * акцент на графике (отдельная задача — feature flag для итерации).
 */

import templateHtml from '../spring-stiffness/template.html?raw';
import type { LabStand } from '@/ui/components/lab-stand';
import type { LabGraph } from '@/ui/components/lab-graph';
import type { LabEquipmentCard } from '@/ui/components/lab-equipment-card';
import { SpringExperiment, type ExperimentRefs } from '../spring-stiffness/SpringExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class SpringElasticScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'spring-elastic',
    label: 'Сила упругости',
    // По ФИПИ ОГЭ-2026 «исследование F_упр(Δl)» = опыт 2.6 (не 2.2)
    // См. .business/Продукты/Програмное обеспечение/ВЛ ОГЭ/прогресс.md
    kicker: 'Опыт 2.6',
    icon: 'force',
    tooltip: 'Исследование зависимости F_упр от Δl (закон Гука как график)',
  };

  #experiment: SpringExperiment | null = null;
  #host: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    if (this.#experiment) return;
    this.#host = host;
    host.innerHTML = templateHtml;
    host.dataset['mode'] = 'elastic';

    // Меняем заголовок и подсказку под фокус «сила упругости» — в существующих
    // элементах header/eyebrow внутри template (если есть) — пере-рендер через
    // запрос текстов. Иначе оставляем как есть; визуальная дифференциация
    // достигается через kit-header (kicker «Опыт 2.2»).
    const eyebrow = host.querySelector('.experiment-eyebrow');
    if (eyebrow) eyebrow.textContent = 'Опыт 2.6';
    const title = host.querySelector('.experiment-title');
    if (title) title.textContent = 'Сила упругости пружины';
    const initialHint = host.querySelector('#hint-bar');
    if (initialHint) {
      initialHint.textContent =
        'Подвесьте пружину и динамометр, добавляйте грузы по одному и фиксируйте F и Δl — должна получиться прямая линия F = k·Δl.';
    }

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
      // §20.4 + §21 — journal v2 slots.
      recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
      journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
      recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
      recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
      recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
    };

    this.#experiment = new SpringExperiment(refs);
    (window as unknown as { springElasticExperiment?: SpringExperiment }).springElasticExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.destroy();
    this.#experiment.reset();
    delete (window as unknown as { springElasticExperiment?: SpringExperiment })
      .springElasticExperiment;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  reset(): void {
    this.#experiment?.reset();
  }
}
