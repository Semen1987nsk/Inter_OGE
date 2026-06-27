/**
 * ConnectionsScreen — экран «Соединения проводников» (мульти-таск, опыты 3.8–3.9).
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) пп.8/9 + КОДИФ §1.29:
 * 3.8 — последовательное соединение (правило напряжений U = U1 + U2).
 * 3.9 — параллельное соединение (правило токов I = I1 + I2).
 *
 * Фасад IScreen по образцу WireResistanceScreen:
 *   mount   → inject template.html → создать ConnectionsExperiment
 *   unmount → reset(true) + destroy + replaceChildren
 *   reset   → experiment.reset(false)
 */

import templateHtml from './template.html?raw';
import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { ConnectionsExperiment, type ExperimentRefs } from './ConnectionsExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class ConnectionsScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'connections',
    label: 'Соединения проводников',
    kicker: 'Опыт 3.8–3.9',
    icon: 'link',
    tooltip: 'Правило напряжений (последовательное) и правило токов (параллельное)',
  };

  #experiment: ConnectionsExperiment | null = null;
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

    this.#experiment = new ConnectionsExperiment(refs);
    // Дебаг-доступ для Playwright selfcheck и инспекции
    (window as unknown as { connectionsExperiment?: ConnectionsExperiment }).connectionsExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.reset(true);
    this.#experiment.destroy();
    delete (window as unknown as { connectionsExperiment?: ConnectionsExperiment }).connectionsExperiment;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  reset(): void {
    this.#experiment?.reset(false);
  }
}
