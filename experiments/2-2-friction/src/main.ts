/**
 * Точка входа опыта 2.2 «Трение скольжения» — v1.0.
 *
 * Workflow: drag брусок на направляющую, грузы сверху, динамометр на крючок,
 * тяга → измерение коэффициента трения / работы силы трения / зависимостей.
 *
 * Архитектура: см. ../2-1-spring/REFERENCE.md (общий канон Inter_OGE).
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
import './ui/components/lab-tray';
import './ui/components/lab-equipment-card';
// Новые компоненты опыта 2.2
import './ui/components/lab-block';
import './ui/components/lab-friction-track';
import './ui/components/lab-dynamometer-h';
import './ui/components/lab-flat-weight';

import type { LabFrictionTrack } from './ui/components/lab-friction-track';
import type { LabGraph } from './ui/components/lab-graph';
import type { LabEquipmentCard } from './ui/components/lab-equipment-card';
import { FrictionExperiment, type ExperimentRefs } from './FrictionExperiment';

const refs: ExperimentRefs = {
  stage: document.getElementById('stage')!,
  trackContainer: document.getElementById('track-container')!,
  track: document.getElementById('track') as LabFrictionTrack,
  dragOverlay: document.getElementById('drag-overlay')!,
  dropZoneTrack: document.getElementById('drop-zone-track')!,
  dropZoneBlockTop: document.getElementById('drop-zone-block-top')!,
  dropZoneBlockHook: document.getElementById('drop-zone-block-hook')!,
  hintBar: document.getElementById('hint-bar')!,
  journalEmpty: document.getElementById('journal-empty')!,
  // §21: legacy stubs — не используются в production.
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
  surfaceToggle: document.getElementById('surface-toggle')!,
  weighBtn: document.getElementById('weigh-btn') as HTMLButtonElement,
  recordForm: document.getElementById('record-form') as HTMLFormElement,
  rfMblock: document.getElementById('rf-mblock') as HTMLInputElement,
  rfMweights: document.getElementById('rf-mweights') as HTMLOutputElement,
  rfFriction: document.getElementById('rf-friction') as HTMLInputElement,
  rfCancel: document.getElementById('rf-cancel') as HTMLButtonElement,
  rfSubmit: document.getElementById('rf-submit') as HTMLButtonElement,
  // §20.4 REFERENCE.md — слот для toggle «manual / auto».
  ...(document.getElementById('record-mode-slot')
    ? { recordModeSlot: document.getElementById('record-mode-slot')! }
    : {}),
};

const experiment = new FrictionExperiment(refs);
// Программный API для отладки и автотестов
(window as unknown as { frictionExperiment?: FrictionExperiment }).frictionExperiment = experiment;
