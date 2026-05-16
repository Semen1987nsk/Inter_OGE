/**
 * Общие типы опыта 2.2 «Трение скольжения».
 *
 * Источник истины: `.business/.../ФИ-9 ОГЭ 2026_СПЕЦ.pdf`, стр. 17 (комплект №2).
 * См. REFERENCE.md (раздел 9 «Физика и ФИПИ») в этой же папке.
 */

/** Идентификатор поверхности (по ФИПИ — две поверхности «А» и «Б»). */
export type SurfaceId = 'A' | 'B';

/** Идентификатор задачи на сцене (см. README.md kit#2 + REFERENCE раздел "Сцена 2-2"). */
export type TaskId =
  | 'A-coefficient' // 2.2 — Измерение коэффициента трения скольжения
  | 'B-work' // 2.3 — Измерение работы силы трения
  | 'C-force-vs-N' // 2.5 — Исследование F_тр от нормальной силы
  | 'D-force-vs-surface'; // 2.6 — Исследование F_тр от рода поверхности

/** Точка в координатах сцены (px). */
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

/** Записанное измерение силы трения. */
export interface FrictionMeasurement {
  /** Уникальный id записи. */
  readonly id: string;
  /** Время записи (UNIX ms). */
  readonly timestamp: number;
  /** Поверхность, на которой проводилось измерение. */
  readonly surfaceId: SurfaceId;
  /** Суммарная масса (брусок + грузы сверху), г. */
  readonly totalMassGrams: number;
  /** Нормальная сила N = m·g (Н). */
  readonly normalForce: number;
  /** Сила трения скольжения, замеренная по динамометру (Н). */
  readonly frictionForce: number;
  /** Коэффициент трения μ = F_тр / N. */
  readonly mu: number;
  /** Пройденное расстояние (мм). Используется для задачи B (работа). null если не считаем. */
  readonly distanceMm: number | null;
  /** Работа силы трения A = F_тр · S (Дж). null если distanceMm не задано. */
  readonly work: number | null;
}

/**
 * Эталонные коэффициенты трения для поверхностей по ФИПИ ОГЭ 2026.
 * Источник: ФИПИ-2026_СПЕЦ.pdf, стр. 17 (комплект №2).
 */
export const SURFACE_CONFIG = {
  A: {
    /** Направляющая (твёрдое деревянное основание). */
    label: 'Направляющая (А)',
    description: 'Деревянная направляющая',
    muStatic: 0.22, // чуть выше кинетического (физически реалистично)
    muKinetic: 0.2, // эталон ФИПИ
    color: '#d2a87a', // светлое дерево
  },
  B: {
    /** Гибкая полоса (тканевая накладка), крепится канцелярским зажимом. */
    label: 'Гибкая полоса (Б)',
    description: 'Тканевая накладка',
    muStatic: 0.65,
    muKinetic: 0.6, // эталон ФИПИ
    color: '#5d4a3a', // тёмная ткань
  },
} as const satisfies Record<
  SurfaceId,
  {
    label: string;
    description: string;
    muStatic: number;
    muKinetic: number;
    color: string;
  }
>;

/**
 * Допустимый интервал μ при оценке ученика (центр ± 0.05).
 * ОГЭ обычно принимает ответ в пределах ±25%, мы строже для интерактива.
 */
export const VALID_MU_TOLERANCE = 0.05 as const;

/** Ускорение свободного падения по российскому школьному стандарту. */
export const G = 9.8 as const;

/** Масса бруска по ФИПИ-2026 (50±5) г. Берём центр диапазона. */
export const BLOCK_MASS_GRAMS = 50 as const;

/** Длина направляющей по ФИПИ-2026 (≥500 мм). */
export const TRACK_LENGTH_MM = 500 as const;

/** Pixels per cm — масштаб симуляции. */
export const PIXELS_PER_CM = 20 as const;
