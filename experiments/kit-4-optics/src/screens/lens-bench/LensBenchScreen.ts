/**
 * LensBenchScreen — экран «Оптическая сила линзы» (опыт 4.1).
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№4 (стр.19):
 * Метод наведения резкости (d, f → F, D).
 *
 * Фасад IScreen по образцу MeasurementsScreen (kit-3):
 *   mount → inject template.html → создать LensBenchExperiment
 *   unmount → destroy + reset + replaceChildren
 *   reset → experiment.reset()
 */

import templateHtml from './template.html?raw';
import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { LensBenchExperiment, type ExperimentRefs } from './LensBenchExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class LensBenchScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'lens-bench',
    label: 'Оптическая сила линзы',
    kicker: 'Опыт 4.1 · Линзы',
    icon: 'lens',
    tooltip: 'Измерение оптической силы и фокусного расстояния собирающей линзы (F = d·f/(d+f), D = 1/F)',
  };

  #experiment: LensBenchExperiment | null = null;
  #host: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    if (this.#experiment) return;
    this.#host = host;
    host.innerHTML = templateHtml;

    const bench = host.querySelector<HTMLElement & {
      getSlotRect(id: string): DOMRect;
      setSlotHover(slotId: string, active: boolean): void;
      setObjectDistanceMm(d: number): void;
      setLensFocalMm(F: number): void;
      setScreenDistanceMm(f: number): void;
      setRayOverlay(on: boolean): void;
      setImageSharpness(s: number): void;
    }>('#optical-bench')!;

    const refs: ExperimentRefs = {
      stage: host.querySelector<HTMLElement>('#stage')!,
      bench,
      dragOverlay: host.querySelector<HTMLElement>('#drag-overlay')!,
      hintBar: host.querySelector<HTMLElement>('#hint-bar')!,
      liveRegion: host.querySelector<HTMLElement>('#live-region')!,
      resetBtn: host.querySelector('#reset-btn') as HTMLButtonElement,
      rayOverlayBtn: host.querySelector('#ray-overlay-btn') as HTMLButtonElement,
      screenSlider: host.querySelector('#screen-slider') as HTMLInputElement,
      screenSliderReadout: host.querySelector<HTMLElement>('#screen-slider-readout') ?? undefined,
      resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
      cards: host.querySelectorAll<LabEquipmentCard>('lab-equipment-card'),
      // §21 — журнал v2 slots
      recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
      journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
      recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
      recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
      recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
    };

    this.#experiment = new LensBenchExperiment(refs);
    // Дебаг-доступ для Playwright selfcheck и инспекции в DevTools
    (window as unknown as { lensBenchExperiment?: LensBenchExperiment }).lensBenchExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.reset();
    this.#experiment.destroy();
    delete (window as unknown as { lensBenchExperiment?: LensBenchExperiment }).lensBenchExperiment;
    this.#experiment = null;
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  reset(): void {
    this.#experiment?.reset();
  }

  saveState(): Record<string, unknown> {
    return {};
  }
}
