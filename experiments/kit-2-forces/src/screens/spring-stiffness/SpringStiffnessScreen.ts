/**
 * SpringStiffnessScreen — экран «Жёсткость пружины» (опыт 2.1) в комплекте.
 *
 * Имплементит IScreen контракт. mount(host) вставляет HTML-шаблон опыта,
 * собирает ExperimentRefs из DOM, создаёт SpringExperiment.
 *
 * unmount() вызывает experiment.reset() и очищает host. Listeners на window
 * (resize) снимаются автоматически через signal в DragController.
 */

import templateHtml from './template.html?raw';
import type { LabStand } from '@/ui/components/lab-stand';
import type { LabGraph } from '@/ui/components/lab-graph';
import type { LabEquipmentCard } from '@/ui/components/lab-equipment-card';
import type { LabCompositeTray } from '@/ui/components/lab-composite-tray';
import { SpringExperiment, type ExperimentRefs } from './SpringExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class SpringStiffnessScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'spring-stiffness',
    label: 'Жёсткость пружины',
    kicker: 'Опыт 2.1',
    icon: 'spring',
    tooltip: 'Измерение жёсткости пружины k = F / Δl',
  };

  #experiment: SpringExperiment | null = null;
  #host: HTMLElement | null = null;
  #abortController: AbortController | null = null;

  mount(host: HTMLElement): void {
    if (this.#experiment) return; // идемпотентен
    this.#host = host;
    this.#abortController = new AbortController();
    host.innerHTML = templateHtml;

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
      compositeTray: host.querySelector('#composite-tray') as LabCompositeTray | null,
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
      // §20.4 + §21 — journal v2 slots (могут отсутствовать в legacy шаблонах).
      recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
      journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
      recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
      recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
      recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
    };

    this.#experiment = new SpringExperiment(refs);
    // Дебаг-доступ для тестов
    (window as unknown as { springExperiment?: SpringExperiment }).springExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.destroy();
    this.#experiment.reset();
    delete (window as unknown as { springExperiment?: SpringExperiment }).springExperiment;
    this.#abortController?.abort();
    this.#abortController = null;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  saveState(): unknown {
    if (!this.#experiment) return null;
    // Минимальный snapshot — только записи журнала.
    const e = this.#experiment as unknown as {
      readonly state?: { measurements: unknown[] };
    };
    if (!e.state) return null;
    return { measurements: e.state.measurements };
  }

  reset(): void {
    this.#experiment?.reset();
  }
}
