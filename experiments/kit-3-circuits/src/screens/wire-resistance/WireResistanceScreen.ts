/**
 * WireResistanceScreen — экран «Сопротивление проводника» (мульти-таск, опыты 3.5–3.7).
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) пп.5/6/7 + КОДИФ §1.29:
 * 3.5 R(l) зависимость от длины, 3.6 R(S) зависимость от сечения,
 * 3.7 R(ρ) зависимость от удельного сопротивления материала.
 * Метод амперметра-вольтметра (R = U/I). Переключатель задач A/B/C.
 * Шапка экрана generic: «Опыт 3.5–3.7 · Сопротивление проводника».
 *
 * Фасад IScreen по образцу MeasurementsScreen / IvCurveScreen:
 *   mount   → inject template.html → создать WireResistanceExperiment
 *   unmount → reset(true) + destroy + replaceChildren
 *   reset   → experiment.reset(false)
 */

import templateHtml from './template.html?raw';
import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { WireResistanceExperiment, type ExperimentRefs } from './WireResistanceExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class WireResistanceScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'wire-resistance',
    label: 'Сопротивление проводника',
    kicker: 'Опыт 3.5–3.7',
    icon: 'wire',
    tooltip: 'Зависимость сопротивления проводника от длины, сечения и материала (R = ρl/S)',
  };

  #experiment: WireResistanceExperiment | null = null;
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
      // динамическая формула
      formulaExpr: host.querySelector<HTMLElement>('#formula-expr') ?? undefined,
      formulaUnits: host.querySelector<HTMLElement>('#formula-units') ?? undefined,
    };

    this.#experiment = new WireResistanceExperiment(refs);
    // Дебаг-доступ для Playwright selfcheck и инспекции
    (window as unknown as { wireResistanceExperiment?: WireResistanceExperiment }).wireResistanceExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.reset(true);
    this.#experiment.destroy();
    delete (window as unknown as { wireResistanceExperiment?: WireResistanceExperiment }).wireResistanceExperiment;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  reset(): void {
    this.#experiment?.reset(false);
  }
}
