/**
 * IndependenceMassScreen — экран опыта 1.5 «Независимость выталкивающей
 * силы от массы тела».
 *
 * ФИПИ-2026, Приложение 2, стр. 16, Комплект №1. См. REFERENCE §30.
 * Layout по канону §31 (2 колонки + floating journal-panel).
 */

import type { IScreen } from '../../shell/IScreen';
import { IndependenceMassExperiment } from './IndependenceMassExperiment';
import { independenceMassMeta } from './meta';
import templateHtml from './template.html?raw';

export class IndependenceMassScreen implements IScreen {
  readonly meta = independenceMassMeta;

  #host: HTMLElement | null = null;
  #experiment: IndependenceMassExperiment | null = null;

  mount(host: HTMLElement): void {
    if (this.#host === host) return;
    this.#host = host;
    host.innerHTML = templateHtml;

    const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
      host.querySelector<T>(sel)!;

    const refs = {
      rootHost: host,
      steps: $('#im-steps'),
      hint: $('#im-hint'),
      resetBtn: $<HTMLButtonElement>('#im-reset-btn'),
      dynoMount: $('#im-dyno-mount'),
      dropzoneDyno: $('#im-dropzone-dyno'),
      detachDynoBtn: $<HTMLButtonElement>('#im-detach-dyno'),
      beakerMount: $('#im-beaker-mount'),
      dropzoneBeaker: $('#im-dropzone-beaker'),
      detachBeakerBtn: $<HTMLButtonElement>('#im-detach-beaker'),
      dyno: $('#im-dyno'),
      beaker: $('#im-beaker'),
      cardDyno: $('#im-card-dyno'),
      cardBeaker: $('#im-card-beaker'),
      measurePanel: $('#im-measure-panel'),
      btnDip1: $<HTMLButtonElement>('#im-btn-dip1'),
      btnLift1: $<HTMLButtonElement>('#im-btn-lift1'),
      btnRecord1: $<HTMLButtonElement>('#im-btn-record1'),
      cyl1Status: $('#im-cyl1-status'),
      btnDip2: $<HTMLButtonElement>('#im-btn-dip2'),
      btnLift2: $<HTMLButtonElement>('#im-btn-lift2'),
      btnRecord2: $<HTMLButtonElement>('#im-btn-record2'),
      cyl2Status: $('#im-cyl2-status'),
      verdictEl: $('#im-verdict'),
      verdictText: $('#im-verdict-text'),
      journalHost: $('#im-journal-host'),
      journalEmpty: $('#im-journal-empty'),
      formulaDisplay: $('#im-formula-display'),
      measurementCount: $('#im-measurement-count'),
      recordModeSlot: $('#im-record-mode-slot'),
      recordPendingSlot: $('#im-record-pending-slot'),
      recordPendingBtn: $<HTMLButtonElement>('#im-record-pending-btn'),
      recordPendingSummary: $('#im-record-pending-summary'),
      liveRegion: $('#im-live-region'),
    };

    this.#experiment = new IndependenceMassExperiment(refs);

    (window as unknown as {
      independenceMassExperiment?: IndependenceMassExperiment;
    }).independenceMassExperiment = this.#experiment;
  }

  unmount(): void {
    this.#experiment?.destroy();
    this.#experiment = null;
    if (this.#host) {
      this.#host.replaceChildren();
      this.#host = null;
    }
    delete (window as unknown as { independenceMassExperiment?: IndependenceMassExperiment })
      .independenceMassExperiment;
  }

  saveState(): unknown {
    return null;
  }

  loadState(_state: unknown): void {}
}
