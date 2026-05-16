/**
 * DensitySolidScreen — экран опыта 1.1 «Плотность твёрдого тела».
 * Implements IScreen из @shared.
 */

import type { IScreen, ScreenMeta } from '../../shell/IScreen';
import { DensityExperiment } from './DensityExperiment';
import templateHtml from './template.html?raw';

export class DensitySolidScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'density-solid',
    label: 'Плотность тела',
    kicker: 'Опыт 1.1',
    icon: 'density',
    tooltip: 'Измерение плотности твёрдого тела по массе и вытесненному объёму',
  };

  #host: HTMLElement | null = null;
  #experiment: DensityExperiment | null = null;

  mount(host: HTMLElement): void {
    if (this.#host === host) return;
    this.#host = host;
    host.innerHTML = templateHtml;

    const slotBalance = host.querySelector<HTMLElement>('#slot-balance')!;
    const slotCylinder = host.querySelector<HTMLElement>('#slot-cylinder')!;

    const refs = {
      rootHost: host,
      steps: host.querySelector<HTMLElement>('#steps')!,
      hintBar: host.querySelector<HTMLElement>('#hint-bar')!,
      resetBtn: host.querySelector<HTMLButtonElement>('#reset-btn')!,
      equipmentCards: Array.from(host.querySelectorAll<HTMLElement>('lab-equipment-card[data-eq]')),
      cylinderCards: Array.from(host.querySelectorAll<HTMLElement>('lab-equipment-card[data-eq^="cyl-"]')),
      weightsInCards: Array.from(host.querySelectorAll<HTMLElement>('lab-equipment-card[data-eq^="cyl-"] lab-metal-weight')),
      slotBalance,
      slotBalanceEmpty: host.querySelector<HTMLElement>('#slot-balance-empty')!,
      slotBalanceCaption: host.querySelector<HTMLElement>('#slot-balance-caption')!,
      stageBalance: host.querySelector<HTMLElement>('#balance')!,
      detachBalance: host.querySelector<HTMLButtonElement>('#detach-balance')!,
      detachWeight: host.querySelector<HTMLButtonElement>('#detach-weight')!,
      weightOnBalance: host.querySelector<HTMLElement>('#weight-on-balance')!,
      slotCylinder,
      slotCylinderEmpty: host.querySelector<HTMLElement>('#slot-cylinder-empty')!,
      slotCylinderCaption: host.querySelector<HTMLElement>('#slot-cylinder-caption')!,
      stageCylinder: host.querySelector<HTMLElement>('#cylinder')!,
      detachCylinder: host.querySelector<HTMLButtonElement>('#detach-cylinder')!,
      detachSubmerged: host.querySelector<HTMLButtonElement>('#detach-submerged')!,
      weightInCylinder: host.querySelector<HTMLElement>('#weight-in-cylinder')!,
      measurementPanel: host.querySelector<HTMLElement>('#measurement-panel')!,
      measurementToggle: host.querySelector<HTMLButtonElement>('#measurement-toggle')!,
      measurementBody: host.querySelector<HTMLElement>('#measurement-body')!,
      measurementCount: host.querySelector<HTMLElement>('#measurement-count')!,
      journalEmpty: host.querySelector<HTMLElement>('#journal-empty')!,
      journalHost: host.querySelector<HTMLElement>('#journal-host')!,
      formulaDisplay: host.querySelector<HTMLElement>('#formula-display')!,
      resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
      liveRegion: host.querySelector<HTMLElement>('#live-region')!,
      // §20.4 REFERENCE.md
      recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot')!,
      recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot')!,
      recordPendingBtn: host.querySelector<HTMLButtonElement>('#record-pending-btn')!,
      recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary')!,
    };

    this.#experiment = new DensityExperiment(refs);
  }

  unmount(): void {
    this.#experiment?.destroy();
    this.#experiment = null;
    if (this.#host) {
      this.#host.replaceChildren();
      this.#host = null;
    }
  }

  saveState(): unknown {
    return this.#experiment?.saveState();
  }

  loadState(snapshot: unknown): void {
    this.#experiment?.loadState(snapshot);
  }

  reset(): void {
    this.#experiment?.reset();
  }
}
