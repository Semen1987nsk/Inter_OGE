/**
 * Модель состояния workflow опыта 2.2 «Трение скольжения».
 *
 * Сборка установки:
 *   1. Брусок ставится на направляющую (поверхность А или Б).
 *   2. На брусок сверху можно положить грузы (нагружаем normal force).
 *   3. Динамометр прицепляется к крючку бруска (горизонтальный режим).
 *   4. Динамометр перетягивает брусок до начала скольжения.
 *
 * Задачи (переключаются stepper'ом):
 *   A. Измерение μ (одно измерение, один груз сверху).
 *   B. Работа силы трения (тащим на расстояние S, считаем A = F·S).
 *   C. Исследование F_тр от N (3-5 измерений с разной нагрузкой → график).
 *   D. Исследование F_тр от рода поверхности (сравнение А и Б).
 */

import type { FrictionMeasurement, SurfaceId, TaskId } from './index';

/** Все идентификаторы оборудования в комплекте опыта 2.2. */
export type EquipmentId =
  | 'dyno-1'
  | 'dyno-5'
  | 'block'
  | 'w-100-1'
  | 'w-100-2'
  | 'w-100-3'
  | 'rod'
  | 'disc-10'
  | 'disc-20'
  | 'disc-50';

/** Что можно подцепить (типы snap-зон). */
export type AttachKind =
  | 'block' // брусок → на направляющую
  | 'weight' // груз → на брусок (сверху)
  | 'dynamometer'; // динамометр → к крючку бруска (горизонтально)

/** Подвешенный (точнее «подцепленный к бруску») динамометр. */
export interface AttachedDynamometer {
  equipmentId: 'dyno-1' | 'dyno-5';
  range: 1 | 5; // Н
}

/** Положенный сверху на брусок груз. */
export interface StackedWeight {
  equipmentId: EquipmentId;
  mass: number; // г
  /** Порядок в стопке (0 — нижний, на бруске). */
  stackIndex: number;
}

/** Установленный на сцену брусок. */
export interface PlacedBlock {
  /** Текущее смещение бруска вдоль направляющей в мм (от исходной позиции). */
  positionMm: number;
}

/** Стадия установки. */
export type AssemblyStage =
  | 'empty' // на сцене ничего нет, только направляющая
  | 'block-placed' // брусок стоит, ждём остального
  | 'measuring'; // идёт работа с измерениями

/** Шаг текущего измерения. */
export type MeasurementStep =
  | 'idle' // нет активного измерения
  | 'awaiting-pull' // динамометр прицеплен, ждём что ученик начнёт тянуть
  | 'pulling-static' // тянем, но брусок ещё в покое (F < μ_static·N)
  | 'sliding' // брусок скользит (F = μ_kin·N в установившемся)
  | 'ready-to-record' // показание стабильно, можно записать
  | 'recorded'; // записано, переходим к следующему

/** Полная модель состояния опыта. */
export interface FrictionSetupState {
  /** Активная задача в опыте (переключатель в stepper'е). */
  activeTask: TaskId;

  /** Стадия сборки. */
  stage: AssemblyStage;

  /** Текущая поверхность под бруском. */
  surfaceId: SurfaceId;

  /** Брусок на сцене (или null до установки). */
  block: PlacedBlock | null;

  /** Грузы, положенные сверху на брусок (снизу-вверх). */
  weightsOnBlock: StackedWeight[];

  /** Прицепленный динамометр (или null). */
  dynamometer: AttachedDynamometer | null;

  /** Идентификатор сейчас перетаскиваемого предмета (null если нет drag). */
  dragging: EquipmentId | null;

  /** Шаг текущего измерения. */
  measurementStep: MeasurementStep;

  /** Текущая приложенная сила (Н), отображаемая динамометром в реальном времени. */
  appliedForce: number;

  /** Скорость скольжения бруска (мм/с). 0 — покой. */
  slidingVelocity: number;

  /** Записанные измерения. */
  measurements: FrictionMeasurement[];

  /** Включены ли подсказки HintEngine. */
  hintsEnabled: boolean;
}

/** Дефолт начального состояния. */
export const INITIAL_SETUP_STATE: FrictionSetupState = {
  activeTask: 'A-coefficient',
  stage: 'empty',
  surfaceId: 'A',
  block: null,
  weightsOnBlock: [],
  dynamometer: null,
  dragging: null,
  measurementStep: 'idle',
  appliedForce: 0,
  slidingVelocity: 0,
  measurements: [],
  hintsEnabled: true,
};

/** Конфигурация физических параметров грузов (та же что в комплекте 2.1). */
export const WEIGHT_CONFIG: Record<string, { mass: number; equipmentId: EquipmentId }> = {
  'w-100-1': { mass: 100, equipmentId: 'w-100-1' },
  'w-100-2': { mass: 100, equipmentId: 'w-100-2' },
  'w-100-3': { mass: 100, equipmentId: 'w-100-3' },
  rod: { mass: 10, equipmentId: 'rod' },
  'disc-10': { mass: 10, equipmentId: 'disc-10' },
  'disc-20': { mass: 20, equipmentId: 'disc-20' },
  'disc-50': { mass: 50, equipmentId: 'disc-50' },
};

/** Конфигурация динамометров (та же что в комплекте 2.1). */
export const DYNAMOMETER_CONFIG: Record<
  string,
  { range: 1 | 5; equipmentId: 'dyno-1' | 'dyno-5' }
> = {
  'dyno-1': { range: 1, equipmentId: 'dyno-1' },
  'dyno-5': { range: 5, equipmentId: 'dyno-5' },
};
