/**
 * RefractionScreen — экран «Показатель преломления / Угол преломления» (опыты 4.3, 4.6).
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№4 (стр.19):
 * Опыт 4.3 — показатель преломления стекла (n = sin i / sin r).
 * Опыт 4.6 — зависимость угла преломления от угла падения (r(i)).
 *
 * Фасад IScreen по образцу LensBenchScreen:
 *   mount  → inject template.html → собрать RefractionRefs → создать RefractionExperiment
 *   unmount → reset + destroy + replaceChildren
 *   reset  → experiment.reset()
 */

import templateHtml from './template.html?raw';
import type { LabEquipmentCard } from '@ui/components/lab-equipment-card';
import { RefractionExperiment, type RefractionRefs } from './RefractionExperiment';
import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class RefractionScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'refraction',
    label: 'Показатель преломления',
    kicker: 'Опыт 4.3 · Преломление',
    icon: 'prism',
    tooltip: 'Измерение показателя преломления стекла и зависимости угла преломления от угла падения (n = sin i / sin r)',
  };

  #experiment: RefractionExperiment | null = null;
  #host: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    if (this.#experiment) return;
    this.#host = host;
    host.innerHTML = templateHtml;

    const disc = host.querySelector<HTMLElement & {
      getSlotRect(id: string): DOMRect;
      setSlotHover(id: string, on: boolean): void;
      setPlaced(kind: string, on: boolean): void;
      setDragging(on: boolean): void;
      setIncidenceAngle(i: number): void;
      setRevealIndex(on: boolean): void;
      readonly incidenceAngleDeg: number;
      readonly refractionAngleDeg: number;
    }>('#protractor-disc')!;

    const refs: RefractionRefs = {
      stage: host.querySelector<HTMLElement>('#stage')!,
      disc,
      dragOverlay: host.querySelector<HTMLElement>('#drag-overlay')!,
      hintBar: host.querySelector<HTMLElement>('#hint-bar')!,
      liveRegion: host.querySelector<HTMLElement>('#live-region')!,
      resetBtn: host.querySelector('#reset-btn') as HTMLButtonElement,
      steps: host.querySelector<HTMLElement>('#steps')!,
      resultPanel: host.querySelector<HTMLElement>('#result-panel')!,
      cards: host.querySelectorAll<LabEquipmentCard>('lab-equipment-card'),
      graphHost: host.querySelector<HTMLElement>('#graph-block') ?? undefined,
      graphToggleBtn: (host.querySelector('#graph-toggle-btn') as HTMLButtonElement | null) ?? undefined,
      // §21 — журнал v2 slots
      recordModeSlot: host.querySelector<HTMLElement>('#record-mode-slot') ?? undefined,
      journalHost: host.querySelector<HTMLElement>('#journal-host') ?? undefined,
      recordPendingSlot: host.querySelector<HTMLElement>('#record-pending-slot') ?? undefined,
      recordPendingBtn: (host.querySelector('#record-pending-btn') as HTMLButtonElement | null) ?? undefined,
      recordPendingSummary: host.querySelector<HTMLElement>('#record-pending-summary') ?? undefined,
    };

    this.#experiment = new RefractionExperiment(refs);
    // Дебаг-доступ для Playwright selfcheck и инспекции в DevTools
    (window as unknown as { refractionExperiment?: RefractionExperiment }).refractionExperiment =
      this.#experiment;
  }

  unmount(): void {
    if (!this.#experiment) return;
    this.#experiment.reset();
    this.#experiment.destroy();
    delete (window as unknown as { refractionExperiment?: RefractionExperiment }).refractionExperiment;
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
