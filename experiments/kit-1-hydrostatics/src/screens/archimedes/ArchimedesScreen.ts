/**
 * ArchimedesScreen — экран опыта 1.2 «Архимедова сила».
 * Implements IScreen из @shared.
 *
 * Этап 6a: caркас + happy-path. Edge cases, undo-toast, auto-save и
 * остальные пункты §5/§6 спеки — этап 6b.
 */

import type { IScreen } from '../../shell/IScreen';
import { ArchimedesExperiment } from './ArchimedesExperiment';
import { archimedesMeta } from './meta';
import templateHtml from './template.html?raw';
import type { LabJournal } from '../../ui/components/lab-journal';
import type { LabGraph } from '../../ui/components/lab-graph';
// Side-effect import — регистрирует <lab-toast> в customElements (для
// undo-toast уведомлений из оркестратора). 6c.
import '../../ui/components/lab-toast';
// Опыт 1.4: регистрируем <lab-graph> (на случай если main.ts не подгружен — тесты).
import '../../ui/components/lab-graph';

export class ArchimedesScreen implements IScreen {
  readonly meta = archimedesMeta;

  #host: HTMLElement | null = null;
  #experiment: ArchimedesExperiment | null = null;

  mount(host: HTMLElement): void {
    if (this.#host === host) return;
    this.#host = host;
    host.innerHTML = templateHtml;

    const refs = {
      rootHost: host,
      steps: host.querySelector<HTMLElement>('#ar-steps')!,
      hint: host.querySelector<HTMLElement>('#ar-hint')!,
      resetBtn: host.querySelector<HTMLButtonElement>('#ar-reset-btn')!,
      stage: host.querySelector<HTMLElement>('#ar-stage')!,
      clamp: host.querySelector<HTMLElement>('#ar-clamp')!,
      dropzoneStage: host.querySelector<HTMLElement>('#ar-dropzone-stage')!,
      dropzoneBeaker: host.querySelector<HTMLElement>('#ar-dropzone-beaker')!,
      dynoHost: host.querySelector<HTMLElement>('#ar-dyno-host')!,
      cylinderHost: host.querySelector<HTMLElement>('#ar-cylinder-host')!,
      sceneOverlay: host.querySelector<SVGSVGElement>('#ar-scene-overlay')!,
      clampLine: host.querySelector<SVGLineElement>('#ar-clamp-line')!,
      threadPath: host.querySelector<SVGPathElement>('#ar-thread-path')!,
      bottomDanger: host.querySelector<SVGLineElement>('#ar-bottom-danger')!,
      beakerHost: host.querySelector<HTMLElement>('#ar-beaker-host')!,
      banner: host.querySelector<HTMLElement>('#ar-banner')!,
      bannerText: host.querySelector<HTMLElement>('#ar-banner-text')!,
      dosePicker: host.querySelector<HTMLElement>('#ar-dose-picker')!,
      recordBtn: host.querySelector<HTMLButtonElement>('#ar-record-btn')!,
      recordLabel: host.querySelector<HTMLElement>('#ar-record-label')!,
      journal: host.querySelector<LabJournal>('#ar-journal')!,
      // §21: shared journal-host (рядом с lab-journal data-store).
      journalHost: host.querySelector<HTMLElement>('#ar-journal-host')!,
      // Опыт 1.4: тумблер жидкости, группа реактивов, график.
      liquidToggle: host.querySelector<HTMLElement>('#ar-liquid-toggle')!,
      reagentsGroup: host.querySelector<HTMLElement>('#ar-reagents-group')!,
      graphWrap: host.querySelector<HTMLElement>('#ar-graph-wrap')!,
      graph: host.querySelector<LabGraph>('#ar-graph')!,
      liveRegion: host.querySelector<HTMLElement>('#ar-live-region')!,
      equipmentCards: Array.from(
        host.querySelectorAll<HTMLElement>('lab-equipment-card[data-eq]'),
      ),
      detachDynoBtn: host.querySelector<HTMLButtonElement>('#ar-detach-dyno')!,
      detachCylBtn: host.querySelector<HTMLButtonElement>('#ar-detach-cyl')!,
      detachBeakerBtn: host.querySelector<HTMLButtonElement>('#ar-detach-beaker')!,
      // §20.4 REFERENCE.md
      recordModeSlot: host.querySelector<HTMLElement>('#ar-record-mode-slot')!,
    };

    this.#experiment = new ArchimedesExperiment(refs);

    // Экспорт для отладки и Playwright
    (window as unknown as {
      archimedesExperiment?: ArchimedesExperiment;
    }).archimedesExperiment = this.#experiment;
  }

  unmount(): void {
    this.#experiment?.destroy();
    this.#experiment = null;
    if (this.#host) {
      this.#host.replaceChildren();
      this.#host = null;
    }
    delete (window as unknown as { archimedesExperiment?: ArchimedesExperiment })
      .archimedesExperiment;
  }

  reset(): void {
    this.#experiment?.reset();
  }
}
