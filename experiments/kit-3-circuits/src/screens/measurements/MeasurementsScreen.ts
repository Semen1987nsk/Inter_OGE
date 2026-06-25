/**
 * MeasurementsScreen — экран «Измерения» (Опыт 3.1 Сопротивление резистора).
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (стр.18) + КОДИФ §1.29:
 * измерение сопротивления резистора методом амперметра-вольтметра. R = U / I.
 *
 * Фасад IScreen по образцу FrictionScreen (kit-2):
 *   mount → inject template.html → создать MeasurementsExperiment
 *   unmount → destroy + reset + replaceChildren
 *   reset → experiment.reset()
 */

import templateHtml from './template.html?raw';
import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { MeasurementsExperiment, type ExperimentRefs } from './MeasurementsExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class MeasurementsScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'measurements',
    label: 'Сопротивление резистора',
    kicker: 'Опыт 3.1',
    icon: 'gauge',
    tooltip: 'Измерение сопротивления резистора методом амперметра-вольтметра (R = U / I)',
  };

  #experiment: MeasurementsExperiment | null = null;
  #host: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    if (this.#experiment) return;
    this.#host = host;
    host.innerHTML = templateHtml;

    const refs: ExperimentRefs = {
      stage: host.querySelector<HTMLElement>('#stage')!,
      circuitBoard: host.querySelector<HTMLElement & {
        getSlotRect(id: string): DOMRect;
        setCurrentAnimating(on: boolean): void;
      }>('#circuit-board')!,
      dragOverlay: host.querySelector<HTMLElement>('#drag-overlay')!,
      hintBar: host.querySelector<HTMLElement>('#hint-bar')!,
      liveRegion: host.querySelector<HTMLElement>('#live-region')!,
      resetBtn: host.querySelector('#reset-btn') as HTMLButtonElement,
      keyControl: host.querySelector<HTMLElement>('#key-control')!,
      keyBtn: host.querySelector('#key-btn') as HTMLButtonElement,
      keyBtnLabel: host.querySelector<HTMLElement>('#key-btn-label')!,
      voltageControl: host.querySelector<HTMLElement>('#voltage-control')!,
      voltageInput: host.querySelector('#voltage-input') as HTMLInputElement,
      voltageReadout: host.querySelector<HTMLElement>('#voltage-readout')!,
      journalEmpty: host.querySelector<HTMLElement>('#journal-empty')!,
      formulaDisplay: host.querySelector<HTMLElement>('#formula-display')!,
      measurementPanel: host.querySelector<HTMLElement>('#measurement-panel')!,
      measurementToggle: host.querySelector('#measurement-toggle') as HTMLButtonElement,
      measurementCount: host.querySelector<HTMLElement>('#measurement-count')!,
      steps: host.querySelector<HTMLElement>('#steps')!,
      resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
      cards: host.querySelectorAll<LabEquipmentCard>('lab-equipment-card'),
      // §21 — журнал v2 slots
      recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
      journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
      recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
      recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
      recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
    };

    this.#experiment = new MeasurementsExperiment(refs);
    // Дебаг-доступ для Playwright selfcheck и инспекции
    (window as unknown as { measurementsExperiment?: MeasurementsExperiment }).measurementsExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    // FIX 1: reset() first (state-restoration while DOM/listeners still live),
    // then destroy() tears down listeners, then replaceChildren() clears DOM.
    this.#experiment.reset();
    this.#experiment.destroy();
    delete (window as unknown as { measurementsExperiment?: MeasurementsExperiment }).measurementsExperiment;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  reset(): void {
    this.#experiment?.reset();
  }
}
