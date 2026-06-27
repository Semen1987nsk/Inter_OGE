/**
 * IvCurveScreen — экран «ВАХ резистора и лампочки» (опыт 3.4).
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (стр.18), п.4 + КОДИФ §1.29:
 * «исследование зависимости силы тока в проводнике (резисторы, лампочка)
 *  от напряжения» — I(U) для R1 (линейно) и лампочки (нелинейно, вогнуто).
 *
 * Фасад IScreen по образцу MeasurementsScreen:
 *   mount → inject template.html → создать IvCurveExperiment
 *   unmount → destroy + reset(true) + replaceChildren
 *   reset → experiment.reset(false)
 */

import templateHtml from './template.html?raw';
import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import type { LabGraph } from '@ui/components/lab-graph';
import { IvCurveExperiment, type ExperimentRefs } from './IvCurveExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class IvCurveScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'iv-curve',
    label: 'ВАХ резистора и лампочки',
    kicker: 'Опыт 3.4',
    icon: 'iv',
    tooltip: 'Вольт-амперная характеристика резистора и лампочки накаливания — I(U)',
  };

  #experiment: IvCurveExperiment | null = null;
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
      clearDataBtn: host.querySelector('#clear-data-btn') as HTMLButtonElement,
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
      resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
      graphSection: host.querySelector<HTMLElement>('#graph-section')!,
      ivGraph: host.querySelector<LabGraph>('#iv-graph')!,
      cards: host.querySelectorAll<LabEquipmentCard>('lab-equipment-card'),
      // §21 — журнал v2 slots
      recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
      journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
      recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
      recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
      recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
    };

    this.#experiment = new IvCurveExperiment(refs);
    // Дебаг-доступ для Playwright selfcheck и инспекции
    (window as unknown as { ivCurveExperiment?: IvCurveExperiment }).ivCurveExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.reset(true);
    this.#experiment.destroy();
    delete (window as unknown as { ivCurveExperiment?: IvCurveExperiment }).ivCurveExperiment;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  reset(): void {
    this.#experiment?.reset(false);
  }
}
