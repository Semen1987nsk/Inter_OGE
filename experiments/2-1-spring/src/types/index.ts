/**
 * Общие типы опыта 2.1.
 *
 * Типы — единственная истина (vs JavaScript): зеркало физических величин,
 * чтобы IDE и TypeScript ловили ошибки на этапе компиляции.
 */

/** Жёсткость доступных пружин (Н/м). */
export type SpringK = 50 | 10;

/** Какая пружина выбрана. `'k50'` — пружина №1 (известная), `'k10'` — №2 (mystery). */
export type SpringId = 'k50' | 'k10';

/** Тип груза. */
export type WeightType = 'standard' | 'fine' | 'mystery';

/** Точка в декартовых координатах (px относительно canvas). */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Прямоугольник (px). */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Груз — отдельная сущность, может быть на полке, в руке или подвешен. */
export interface Weight {
  /** Уникальный идентификатор экземпляра. */
  readonly id: string;
  /** Масса в граммах. */
  readonly mass: number;
  /** Категория груза. */
  readonly type: WeightType;
  /** Текущее положение (центр) — px. */
  position: Point;
  /**
   * К чему прикреплён груз:
   *  - `null` — на полке или в свободном перемещении;
   *  - `'spring'` — висит на пружине напрямую;
   *  - `id другого груза` — стыкован цепочкой через нижний крючок.
   */
  attachedTo: string | null;
  /** Цвет для mystery-грузов (CSS-цвет). Для остальных не задан. */
  color?: string;
  /** Лейбл, отображаемый на грузе (например, `100 г` или `?`). */
  label: string;
  /** Перетаскивается ли сейчас. */
  isDragging: boolean;
}

/** Записанное измерение (одна точка в таблице и на графике). */
export interface Measurement {
  /** Уникальный идентификатор. */
  readonly id: string;
  /** Время записи (UNIX ms). */
  readonly timestamp: number;
  /** Суммарная масса всех подвешенных грузов (г). */
  readonly totalMass: number;
  /** Сила F = mg (Н). */
  readonly force: number;
  /** Удлинение Δl (см). */
  readonly extension: number;
  /** Жёсткость k = F / Δl·100 (Н/м). Кешируется для скорости. */
  readonly k: number;
}

/** Агрегированные результаты по записанным измерениям. */
export interface ComputedResults {
  /** Среднее арифметическое k_i. */
  readonly mean: number;
  /** Стандартное отклонение. */
  readonly stdDev: number;
  /** Жёсткость по методу наименьших квадратов через начало координат. */
  readonly byLeastSquares: number;
  /** Попадает ли средняя в интервал [VALID_K_RANGE] для пружины k=50 (по ФИПИ). */
  readonly isInValidRange: boolean | null;
}

/** Глобальное состояние опыта. */
export interface SpringExperimentState {
  /** Какая пружина выбрана. */
  selectedSpring: SpringId;
  /** Истинная жёсткость пружины (для расчётов симуляции). */
  springConstant: SpringK;
  /** Естественная длина пружины (см). */
  unstretchedLength: number;

  /** Грузы, подвешенные на пружине (в порядке стыковки сверху-вниз). */
  attachedWeights: Weight[];
  /** Грузы в полке и перетаскиваемые. */
  freeWeights: Weight[];
  /** Сейчас перетаскиваемый груз (id) или null. */
  draggingWeightId: string | null;

  /** Текущая сила F (Н), подсчитывается из суммарной массы attachedWeights. */
  currentForce: number;
  /** Текущее удлинение Δl (см), подсчитывается из F и springConstant. */
  currentExtension: number;
  /** Колеблется ли пружина в данный момент. */
  isOscillating: boolean;
  /** Время начала текущих колебаний (ms). */
  oscillationStartTime: number | null;

  /** Записанные точки измерений. */
  measurements: Measurement[];
  /** Кешированные агрегаты по measurements. */
  computedResults: ComputedResults | null;

  /** Опции отображения. */
  showForceVector: boolean;
  showExtensionScale: boolean;
  showRuler: boolean;
  rulerPosition: Point;

  /** Системные. */
  reducedMotion: boolean;
}

/**
 * Допустимый интервал жёсткости пружины №1 по спецификации ФИПИ ОГЭ 2026
 * (комплект №2): паспортное значение (50 ± 2) Н/м.
 * Источник: `.business/.../ФИ-9 ОГЭ 2026_СПЕЦ.pdf`, стр. 17 (приложение 2, комплект 2).
 */
export const VALID_K_RANGE = { min: 48, max: 52 } as const;

/** Ускорение свободного падения по российскому школьному стандарту. */
export const G = 9.8 as const;

/** Масштаб симуляции: сколько пикселей в 1 сантиметре. */
export const PIXELS_PER_CM = 20 as const;
