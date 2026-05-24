/**
 * Каталог 7 комплектов лаборатории ЛАБОСФЕРА.
 *
 * Источник истины — соответствие ФИПИ ОГЭ-2026 (раздел «Лабораторные работы»).
 * Каждому комплекту соответствует:
 *   - папка с опытами в experiments/<kit-folder>/
 *   - продакт-фото в /public/photos/kit-N.png
 *   - набор опытов с указанием задачи ОГЭ
 */

export type KitStatus = 'ready' | 'planned';
export type KitPriority = 'flagship' | 'medium' | 'compact';

export interface KitExperiment {
  /** Номер задачи в ФИПИ (например, '2.1'). */
  readonly id: string;
  /** Название опыта. */
  readonly title: string;
}

export interface Kit {
  readonly num: number;
  readonly status: KitStatus;
  readonly priority: KitPriority;
  /** Слаг для grid-area и URL. */
  readonly slug: string;
  /** Папка с реализацией (relative to /experiments/). */
  readonly path: string;
  readonly title: string;
  readonly summary: string;
  readonly experiments: ReadonlyArray<KitExperiment>;
  /** Фото — public/photos/<photo>.png */
  readonly photo: string;
  /** Только для planned — приблизительный квартал релиза. */
  readonly eta?: string;
  /** Сколько готовых опытов / всего */
  readonly progress: { done: number; total: number };
}

export const KITS: ReadonlyArray<Kit> = [
  // КИТ-2 — flagship, готов
  {
    num: 2,
    status: 'ready',
    priority: 'flagship',
    slug: 'kit-2-forces',
    path: '../kit-2-forces/',
    title: 'Силы и движение',
    summary:
      'Жёсткость пружины, закон Гука как график, работа упругой силы и трение скольжения. ' +
      'Включает четыре подзадачи по трению — измерение μ, работа F_тр, F_тр(N) и F_тр от поверхности.',
    experiments: [
      { id: '2.1', title: 'Жёсткость пружины' },
      { id: '2.6', title: 'Сила упругости (закон Гука)' },
      { id: '2.4', title: 'Работа силы упругости' },
      { id: '2.2', title: 'Трение скольжения' },
    ],
    photo: 'kit-2.png',
    progress: { done: 4, total: 4 },
  },

  // КИТ-1 — гидростатика, ready (опыты 1.1 + 1.2 готовы)
  // ФИПИ ОГЭ-2026, Приложение 2 (стр. 16) — Комплект №1 покрывает ровно 5 опытов.
  // «Плотность жидкости», «плавание», «ареометр» в перечне ФИПИ ОТСУТСТВУЮТ.
  {
    num: 1,
    status: 'ready',
    priority: 'medium',
    slug: 'kit-1-hydrostatics',
    path: '../kit-1-hydrostatics/',
    title: 'Гидростатика',
    summary:
      'Плотность твёрдого тела и архимедова сила: четыре опыта по выталкивающей силе ' +
      'на разных цилиндрах и в жидкостях разной плотности. Реальный комплект ФИПИ: ' +
      'цилиндры №1–4 (сталь, алюминий, пластик), динамометры 1 Н и 5 Н, мензурка 250 мл, ' +
      'стакан, электронные весы, соль для приготовления раствора.',
    experiments: [
      { id: '1.1', title: 'Плотность вещества' },
      { id: '1.2', title: 'Архимедова сила в воде' },
      { id: '1.3', title: 'F_A от объёма погружённой части' },
      { id: '1.4', title: 'F_A от плотности жидкости' },
      { id: '1.5', title: 'Независимость F_A от массы тела' },
    ],
    photo: 'kit-1.png',
    progress: { done: 4, total: 5 },
  },

  // КИТ-3 — электричество, planned
  {
    num: 3,
    status: 'planned',
    priority: 'medium',
    slug: 'kit-3-circuits',
    path: '../kit-3-circuits/',
    title: 'Электрические цепи',
    summary: 'Закон Ома, мощность, последовательное и параллельное соединения, реостат.',
    experiments: [
      { id: '3.1', title: 'Закон Ома для участка' },
      { id: '3.2', title: 'Сопротивление проводника' },
      { id: '3.3', title: 'Последовательное соединение' },
      { id: '3.4', title: 'Параллельное соединение' },
      { id: '3.5', title: 'Реостат / делитель напряжения' },
      { id: '3.6', title: 'Работа и мощность тока' },
      { id: '3.7', title: 'Закон Джоуля—Ленца' },
      { id: '3.8', title: 'Зависимость R от длины' },
      { id: '3.9', title: 'Зависимость R от сечения' },
    ],
    photo: 'kit-3.png',
    eta: '2026 Q4',
    progress: { done: 0, total: 9 },
  },

  // КИТ-4 — оптика, planned
  {
    num: 4,
    status: 'planned',
    priority: 'compact',
    slug: 'kit-4-optics',
    path: '../kit-4-optics/',
    title: 'Оптика',
    summary: 'Линзы, фокусное расстояние, преломление света, построение изображений.',
    experiments: [
      { id: '4.1', title: 'Фокусное расстояние линзы' },
      { id: '4.2', title: 'Изображение в собирающей линзе' },
      { id: '4.3', title: 'Преломление света' },
      { id: '4.4', title: 'Дисперсия' },
      { id: '4.5', title: 'Полное внутреннее отражение' },
      { id: '4.6', title: 'Угол отражения' },
    ],
    photo: 'kit-4.png',
    eta: '2027 Q1',
    progress: { done: 0, total: 6 },
  },

  // КИТ-5 — колебания, planned
  {
    num: 5,
    status: 'planned',
    priority: 'compact',
    slug: 'kit-5-oscillations',
    path: '../kit-5-oscillations/',
    title: 'Колебания и волны',
    summary: 'Период математического и пружинного маятников, звук и резонанс.',
    experiments: [
      { id: '5.1', title: 'Период математического маятника' },
      { id: '5.2', title: 'Период пружинного маятника' },
      { id: '5.3', title: 'Зависимость T от длины' },
      { id: '5.4', title: 'Резонанс' },
    ],
    photo: 'kit-5.png',
    eta: '2027 Q2',
    progress: { done: 0, total: 4 },
  },

  // КИТ-6 — рычаги/блоки, planned
  {
    num: 6,
    status: 'planned',
    priority: 'compact',
    slug: 'kit-6-lever',
    path: '../kit-6-lever/',
    title: 'Рычаги и блоки',
    summary: 'Условие равновесия рычага, КПД, неподвижный и подвижный блоки.',
    experiments: [
      { id: '6.1', title: 'Равновесие рычага' },
      { id: '6.2', title: 'КПД наклонной плоскости' },
      { id: '6.3', title: 'Неподвижный блок' },
      { id: '6.4', title: 'Подвижный блок (выигрыш в силе)' },
    ],
    photo: 'kit-6.png',
    eta: '2027 Q2',
    progress: { done: 0, total: 4 },
  },

  // КИТ-7 — теплота, planned
  {
    num: 7,
    status: 'planned',
    priority: 'medium',
    slug: 'kit-7-thermal',
    path: '../kit-7-thermal/',
    title: 'Тепловые явления',
    summary: 'Удельная теплоёмкость, теплота плавления, измерение температуры калориметром.',
    experiments: [
      { id: '7.1', title: 'Удельная теплоёмкость' },
      { id: '7.2', title: 'Теплота плавления льда' },
      { id: '7.3', title: 'Тепловой баланс смешивания' },
    ],
    photo: 'kit-7.png',
    eta: '2027 Q3',
    progress: { done: 0, total: 3 },
  },
];

/** Сколько всего опытов в продакшен и в плане. */
export function totalExperiments(kits: ReadonlyArray<Kit> = KITS): {
  done: number;
  total: number;
} {
  return kits.reduce(
    (acc, k) => ({ done: acc.done + k.progress.done, total: acc.total + k.progress.total }),
    { done: 0, total: 0 },
  );
}
