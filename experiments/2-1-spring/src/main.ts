/**
 * Точка входа опыта 2.1 «Жёсткость пружины» — v3.2.
 *
 * Полный workflow: drag&drop сборки установки, измерения по шкале планшета,
 * журнал, расчёт k, граф F(Δl), reset.
 */

import './styles/tokens.css';
import './styles/reset.css';
import './styles/components.css';
import './styles/experiment.css';
import '@labosfera/shared-spa/lib/journal/journal.css';

// Web Components
import './ui/components/lab-button';
import './ui/components/lab-checkbox-preview';
import './ui/components/lab-weight';
import './ui/components/lab-graph';
import './ui/components/lab-stand';
import './ui/components/lab-spring-board';
import './ui/components/lab-dynamometer';
import './ui/components/lab-tray';
import './ui/components/lab-equipment-card';
import './ui/components/lab-composite-weight';

import type { LabStand } from './ui/components/lab-stand';
import type { LabGraph } from './ui/components/lab-graph';
import type { LabEquipmentCard } from './ui/components/lab-equipment-card';
import { SpringExperiment, type ExperimentRefs } from './SpringExperiment';

const refs: ExperimentRefs = {
  stage: document.getElementById('stage')!,
  standContainer: document.getElementById('stand-container')!,
  stand: document.getElementById('stand') as LabStand,
  dragOverlay: document.getElementById('drag-overlay')!,
  dropZoneSpring: document.getElementById('drop-zone-spring')!,
  dropZoneBottom: document.getElementById('drop-zone-bottom')!,
  hintBar: document.getElementById('hint-bar')!,
  journalEmpty: document.getElementById('journal-empty')!,
  // §21: legacy refs — используются только для back-compat-stubs.
  journalTable: (document.getElementById('journal-table') ?? document.createElement('table')) as HTMLTableElement,
  journalBody: document.getElementById('journal-body') ?? document.createElement('tbody'),
  ...(document.getElementById('journal-host')
    ? { journalHost: document.getElementById('journal-host')! }
    : {}),
  liveRegion: document.getElementById('live-region')!,
  resultPanel: document.getElementById('result-panel')!,
  graph: document.getElementById('graph') as LabGraph,
  recordBtn: document.getElementById('record-btn') as HTMLButtonElement,
  resetBtn: document.getElementById('reset-btn') as HTMLButtonElement,
  cards: document.querySelectorAll<LabEquipmentCard>('lab-equipment-card'),
  measurementPanel: document.getElementById('measurement-panel')!,
  measurementToggle: document.getElementById('measurement-toggle') as HTMLButtonElement,
  measurementCount: document.getElementById('measurement-count')!,
  steps: document.getElementById('steps')!,
  overloadBanner: document.getElementById('overload-banner')!,
  recordForm: document.getElementById('record-form') as HTMLFormElement,
  rfL0: document.getElementById('rf-l0') as HTMLInputElement,
  rfL1: document.getElementById('rf-l1') as HTMLInputElement,
  rfMass: document.getElementById('rf-mass') as HTMLOutputElement,
  rfCancel: document.getElementById('rf-cancel') as HTMLButtonElement,
  rfSubmit: document.getElementById('rf-submit') as HTMLButtonElement,
  // §20.4 REFERENCE.md — слот для toggle «manual / auto».
  ...(document.getElementById('record-mode-slot')
    ? { recordModeSlot: document.getElementById('record-mode-slot')! }
    : {}),
};

const experiment = new SpringExperiment(refs);
// Программный API для отладки и автотестов
(window as unknown as { springExperiment?: SpringExperiment }).springExperiment = experiment;
