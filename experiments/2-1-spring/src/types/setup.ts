/**
 * Модель состояния workflow опыта 2.1 (v3): сборка установки + измерения.
 *
 * Сборка:
 *   - Пружина подвешена на крюк штатива
 *   - Опционально: динамометр между пружиной и грузами
 *   - Цепочка грузов снизу
 *
 * Измерения:
 *   - Ученик кликает по делению шкалы планшета пружины (l₀ или l₁)
 *   - При наличии l₀ и l₁ → запись в журнал кнопкой
 */

import type { Measurement } from './index';

/** Все идентификаторы оборудования в комплекте опыта 2.1. */
export type EquipmentId =
  | 'dyno-1'
  | 'dyno-5'
  | 'spring-k50'
  | 'spring-k10'
  | 'w-100-1'
  | 'w-100-2'
  | 'w-100-3'
  | 'rod'
  | 'disc-10'
  | 'disc-20'
  | 'disc-50';

/** Что можно подцепить за крюк (типы snap-зон). */
export type AttachKind = 'spring' | 'dynamometer' | 'weight';

/** Подвешенная пружина. */
export interface AttachedSpring {
  equipmentId: 'spring-k50' | 'spring-k10';
  springId: 'k50' | 'k10';
  k: number; // Н/м
  restLengthMm: number; // длина без нагрузки
}

/** Подвешенный динамометр. */
export interface AttachedDynamometer {
  equipmentId: 'dyno-1' | 'dyno-5';
  range: 1 | 5; // Н
  /**
   * Куда подвешен динамометр:
   *  - 'spring' — между пружиной и грузами (классическая сборка ОГЭ)
   *  - 'stand'  — прямо на штатив, для взвешивания грузов (динамометр как самостоятельный измеритель)
   */
  attachedTo: 'spring' | 'stand';
}

/** Подвешенный груз (с информацией о позиции в цепочке). */
export interface AttachedWeight {
  equipmentId: EquipmentId;
  mass: number; // граммы
  chainIndex: number; // 0 — первый под несущим элементом
}

/** Стадия сборки установки. */
export type AssemblyStage =
  | 'empty' // на сцене ничего нет, только штатив
  | 'spring-attached' // пружина закреплена, ждём грузы
  | 'measuring'; // идёт работа с измерениями

/** Шаг текущего измерения. */
export type MeasurementStep =
  | 'idle' // нет активного измерения
  | 'reading-l0' // ждём клика по шкале для l₀ (без нагрузки)
  | 'l0-recorded' // l₀ записан, ждём подвеса груза
  | 'reading-l1' // груз подвешен, ждём клика по l₁
  | 'ready-to-record'; // оба значения есть, можно записать в журнал

/** Полная модель состояния опыта. */
export interface SpringSetupState {
  /** Стадия сборки. */
  stage: AssemblyStage;

  /** Подвешенная пружина (или null до сборки). */
  spring: AttachedSpring | null;
  /** Подвешенный динамометр (опционально, между пружиной и грузом). */
  dynamometer: AttachedDynamometer | null;
  /** Цепочка грузов от верха к низу. */
  weights: AttachedWeight[];

  /** Идентификатор сейчас перетаскиваемого предмета (null если нет drag). */
  dragging: EquipmentId | null;

  /** Колебания: запущены и время начала (мс) или null. */
  oscillationStartTime: number | null;
  /** Расчётное удлинение пружины в текущий момент кадра (мм). */
  displayedExtensionMm: number;

  /** Шаг измерения. */
  measurementStep: MeasurementStep;
  /** Записанное l₀ ученика (мм). */
  scaleClickL0: number | null;
  /** Записанное l₁ ученика (мм). */
  scaleClickL1: number | null;
  /** Записанное F ученика по динамометру (Н), если кликал по шкале. null = используем авто-расчёт m·g. */
  scaleClickF: number | null;

  /** Записанные измерения. */
  measurements: Measurement[];

  /** Включены ли подсказки HintEngine. */
  hintsEnabled: boolean;
}

/** Дефолт начального состояния. */
export const INITIAL_SETUP_STATE: SpringSetupState = {
  stage: 'empty',
  spring: null,
  dynamometer: null,
  weights: [],
  dragging: null,
  oscillationStartTime: null,
  displayedExtensionMm: 0,
  measurementStep: 'idle',
  scaleClickL0: null,
  scaleClickL1: null,
  scaleClickF: null,
  measurements: [],
  hintsEnabled: true,
};

/** Конфигурация физических параметров пружин. */
export const SPRING_CONFIG = {
  k50: { k: 50, restLengthMm: 30 },
  k10: { k: 10, restLengthMm: 30 },
} as const;

/** Конфигурация физических параметров грузов. */
export const WEIGHT_CONFIG: Record<string, { mass: number; equipmentId: EquipmentId }> = {
  'w-100-1': { mass: 100, equipmentId: 'w-100-1' },
  'w-100-2': { mass: 100, equipmentId: 'w-100-2' },
  'w-100-3': { mass: 100, equipmentId: 'w-100-3' },
  rod: { mass: 10, equipmentId: 'rod' },
  'disc-10': { mass: 10, equipmentId: 'disc-10' },
  'disc-20': { mass: 20, equipmentId: 'disc-20' },
  'disc-50': { mass: 50, equipmentId: 'disc-50' },
};

/** Конфигурация динамометров. */
export const DYNAMOMETER_CONFIG: Record<
  string,
  { range: 1 | 5; equipmentId: 'dyno-1' | 'dyno-5' }
> = {
  'dyno-1': { range: 1, equipmentId: 'dyno-1' },
  'dyno-5': { range: 5, equipmentId: 'dyno-5' },
};
