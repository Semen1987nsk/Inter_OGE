/**
 * ElasticForceScreen — экран «Измерение силы упругости одной точкой» (опыт 2.4).
 *
 * Имплементит IScreen контракт. mount(host) вставляет HTML-шаблон опыта,
 * собирает ExperimentRefs из DOM, создаёт ElasticForceExperiment.
 *
 * unmount() вызывает experiment.destroy() + reset() и очищает host.
 */

import templateHtml from './elastic-force-template.html?raw';
import type { LabStand } from '@/ui/components/lab-stand';
import type { LabEquipmentCard } from '@/ui/components/lab-equipment-card';
import type { LabCompositeTray } from '@/ui/components/lab-composite-tray';
import { ElasticForceExperiment, type ElasticForceRefs } from './ElasticForceExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class ElasticForceScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'elastic-force',
    label: 'Сила упругости',
    kicker: 'Опыт 2.4',
    icon: 'spring',
    tooltip: 'Измерение силы упругости пружины одной точкой (динамометр)',
  };

  #experiment: ElasticForceExperiment | null = null;
  #host: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    if (this.#experiment) return;
    this.#host = host;
    host.innerHTML = templateHtml;

    const refs: ElasticForceRefs = {
      stage: host.querySelector<HTMLElement>('#ef-stage')!,
      standContainer: host.querySelector<HTMLElement>('#ef-stand-container')!,
      stand: host.querySelector('#ef-stand') as LabStand,
      dragOverlay: host.querySelector<HTMLElement>('#ef-drag-overlay')!,
      dropZoneSpring: host.querySelector<HTMLElement>('#ef-drop-zone-spring')!,
      dropZoneBottom: host.querySelector<HTMLElement>('#ef-drop-zone-bottom')!,
      hintBar: host.querySelector<HTMLElement>('#ef-hint-bar')!,
      liveRegion: host.querySelector<HTMLElement>('#ef-live-region')!,
      resetBtn: host.querySelector('#ef-reset-btn') as HTMLButtonElement,
      cards: host.querySelectorAll<LabEquipmentCard>('lab-equipment-card'),
      compositeTray: host.querySelector('#ef-composite-tray') as LabCompositeTray | null,
      steps: host.querySelector<HTMLElement>('#ef-steps')!,
      // Journal v2 slots
      recordModeSlot: host.querySelector<HTMLElement>('#ef-record-mode-slot') ?? undefined,
      journalHost: host.querySelector<HTMLElement>('#ef-journal-host') ?? undefined,
      recordPendingSlot: host.querySelector<HTMLElement>('#ef-record-pending-slot') ?? undefined,
      recordPendingBtn: (host.querySelector('#ef-record-pending-btn') as HTMLButtonElement | null) ?? undefined,
      recordPendingSummary: host.querySelector<HTMLElement>('#ef-record-pending-summary') ?? undefined,
      journalEmpty: host.querySelector<HTMLElement>('#ef-journal-empty')!,
      measurementPanel: host.querySelector<HTMLElement>('#ef-measurement-panel')!,
      measurementToggle: host.querySelector('#ef-measurement-toggle') as HTMLButtonElement,
      measurementCount: host.querySelector<HTMLElement>('#ef-measurement-count')!,
      recordBtn: host.querySelector('#ef-record-btn') as HTMLButtonElement,
    };

    this.#experiment = new ElasticForceExperiment(refs);
    (window as unknown as { elasticForceExperiment?: ElasticForceExperiment }).elasticForceExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.destroy();
    this.#experiment.reset();
    delete (window as unknown as { elasticForceExperiment?: ElasticForceExperiment }).elasticForceExperiment;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  saveState(): unknown {
    return null;
  }

  reset(): void {
    this.#experiment?.reset();
  }
}
