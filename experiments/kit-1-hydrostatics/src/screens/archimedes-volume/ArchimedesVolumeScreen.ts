/**
 * ArchimedesVolumeScreen — экран опыта 1.3 «Исследование зависимости F_А
 * от объёма погружённой части тела».
 *
 * ФИПИ-2026, Приложение 2, стр. 16, Комплект №1. См. REFERENCE §30.
 * Layout по канону §31 (2 колонки + floating journal-panel).
 */

import type { IScreen } from '../../shell/IScreen';
import { ArchimedesVolumeExperiment } from './ArchimedesVolumeExperiment';
import { archimedesVolumeMeta } from './meta';
import templateHtml from './template.html?raw';

export class ArchimedesVolumeScreen implements IScreen {
  readonly meta = archimedesVolumeMeta;

  #host: HTMLElement | null = null;
  #experiment: ArchimedesVolumeExperiment | null = null;

  mount(host: HTMLElement): void {
    if (this.#host === host) return;
    this.#host = host;
    host.innerHTML = templateHtml;

    const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
      host.querySelector<T>(sel)!;

    const refs = {
      rootHost: host,
      stageArea: $('#av-stage-area'),
      steps: $('#av-steps'),
      hint: $('#av-hint'),
      cylinderRig: $('#av-cylinder-rig'),
      threadOverlay: host.querySelector<SVGSVGElement>('#av-thread-overlay')!,
      threadLine: host.querySelector<SVGLineElement>('#av-thread-line')!,
      depthLabel: $('#av-depth-label'),
      depthLabelValue: $('#av-depth-label-value'),
      dynoMount: $('#av-dyno-mount'),
      beakerMount: $('#av-beaker-mount'),
      dropzoneDyno: $('#av-dropzone-dyno'),
      dropzoneBeaker: $('#av-dropzone-beaker'),
      detachDynoBtn: $<HTMLButtonElement>('#av-detach-dyno'),
      detachCylBtn: $<HTMLButtonElement>('#av-detach-cyl'),
      detachBeakerBtn: $<HTMLButtonElement>('#av-detach-beaker'),
      cardDyno: $('#av-card-dyno'),
      cardCyl: $('#av-card-cyl'),
      cardBeaker: $('#av-card-beaker'),
      dyno: $('#av-dyno'),
      cyl: $('#av-cyl'),
      beaker: $('#av-beaker'),
      submergeControls: $('#av-submerge-controls'),
      btnBaseline: $<HTMLButtonElement>('#av-btn-baseline'),
      btnLift: $<HTMLButtonElement>('#av-btn-lift'),
      dragTip: $('#av-drag-tip'),
      journalHost: $('#av-journal-host'),
      journalEmpty: $('#av-journal-empty'),
      formulaDisplay: $('#av-formula-display'),
      measurementCount: $('#av-measurement-count'),
      recordModeSlot: $('#av-record-mode-slot'),
      recordPendingSlot: $('#av-record-pending-slot'),
      recordPendingBtn: $<HTMLButtonElement>('#av-record-pending-btn'),
      recordPendingSummary: $('#av-record-pending-summary'),
      resetBtn: $<HTMLButtonElement>('#av-reset-btn'),
      liveRegion: $('#av-live-region'),
    };

    this.#experiment = new ArchimedesVolumeExperiment(refs);

    (window as unknown as {
      archimedesVolumeExperiment?: ArchimedesVolumeExperiment;
    }).archimedesVolumeExperiment = this.#experiment;
  }

  unmount(): void {
    this.#experiment?.destroy();
    this.#experiment = null;
    if (this.#host) {
      this.#host.replaceChildren();
      this.#host = null;
    }
    delete (window as unknown as { archimedesVolumeExperiment?: ArchimedesVolumeExperiment })
      .archimedesVolumeExperiment;
  }

  saveState(): unknown {
    return null;
  }

  loadState(_state: unknown): void {}
}
