/**
 * FrictionScreen — экран «Трение скольжения» (опыт 2.2) в комплекте.
 * Содержит 4 подзадачи A/B/C/D, переключаемые через горизонтальный stepper.
 */

import templateHtml from './template.html?raw';
import type { LabFrictionTrack } from '@/ui/components/lab-friction-track';
import type { LabGraph } from '@/ui/components/lab-graph';
import type { LabEquipmentCard } from '@/ui/components/lab-equipment-card';
import { FrictionExperiment, type ExperimentRefs } from './FrictionExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class FrictionScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'friction',
    label: 'Трение скольжения',
    kicker: 'Опыт 2.2–2.5',
    icon: 'friction',
    tooltip: 'μ, работа силы трения, F_тр(N), F_тр(поверхность) — 4 задачи',
  };

  #experiment: FrictionExperiment | null = null;
  #host: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    if (this.#experiment) return;
    this.#host = host;
    host.innerHTML = templateHtml;

    const refs: ExperimentRefs = {
      stage: host.querySelector<HTMLElement>('#stage')!,
      trackContainer: host.querySelector<HTMLElement>('#track-container')!,
      track: host.querySelector('#track') as LabFrictionTrack,
      dragOverlay: host.querySelector<HTMLElement>('#drag-overlay')!,
      dropZoneTrack: host.querySelector<HTMLElement>('#drop-zone-track')!,
      dropZoneBlockTop: host.querySelector<HTMLElement>('#drop-zone-block-top')!,
      dropZoneBlockHook: host.querySelector<HTMLElement>('#drop-zone-block-hook')!,
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
      measurementPanel: host.querySelector<HTMLElement>('#measurement-panel')!,
      measurementToggle: host.querySelector('#measurement-toggle') as HTMLButtonElement,
      measurementCount: host.querySelector<HTMLElement>('#measurement-count')!,
      steps: host.querySelector<HTMLElement>('#steps')!,
      surfaceToggle: host.querySelector<HTMLElement>('#surface-toggle')!,
      weighBtn: host.querySelector('#weigh-btn') as HTMLButtonElement,
      recordForm: host.querySelector('#record-form') as HTMLFormElement,
      rfMblock: host.querySelector('#rf-mblock') as HTMLInputElement,
      rfMweights: host.querySelector('#rf-mweights') as HTMLOutputElement,
      rfFriction: host.querySelector('#rf-friction') as HTMLInputElement,
      rfCancel: host.querySelector('#rf-cancel') as HTMLButtonElement,
      rfSubmit: host.querySelector('#rf-submit') as HTMLButtonElement,
    };

    this.#experiment = new FrictionExperiment(refs);
    (window as unknown as { frictionExperiment?: FrictionExperiment }).frictionExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.reset();
    delete (window as unknown as { frictionExperiment?: FrictionExperiment }).frictionExperiment;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  reset(): void {
    this.#experiment?.reset();
  }
}
