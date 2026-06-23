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
export type KitCategory = 'mechanics' | 'electricity' | 'optics' | 'thermal';

export interface KitExperiment {
  /** Номер задачи в ФИПИ (например, '2.1'). */
  readonly id: string;
  /** Название опыта. */
  readonly title: string;
  /** Краткий глагол-результат (императив): что именно измеряет/находит ученик. */
  readonly resultVerb: string;
  /** Номер задачи по ФИПИ ОГЭ-2026 — только если точно известен из официального документа. */
  readonly fipiTask?: string;
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
  /** Физическая категория раздела. */
  readonly category: KitCategory;
  /** Доминирующий цвет акцента (hex #rrggbb) — для постер-карточки. */
  readonly accent: string;
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
      { id: '2.1', title: 'Жёсткость пружины', resultVerb: 'Измерь жёсткость пружины' },
      { id: '2.6', title: 'Сила упругости (закон Гука)', resultVerb: 'Построй график силы упругости' },
      { id: '2.4', title: 'Работа силы упругости', resultVerb: 'Найди работу силы упругости' },
      { id: '2.2', title: 'Трение скольжения', resultVerb: 'Определи коэффициент трения' },
    ],
    photo: 'kit-2.png',
    progress: { done: 4, total: 4 },
    category: 'mechanics',
    accent: '#3a86ff',
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
      { id: '1.1', title: 'Плотность вещества', resultVerb: 'Измерь плотность тела' },
      { id: '1.2', title: 'Архимедова сила в воде', resultVerb: 'Найди архимедову силу' },
      { id: '1.3', title: 'F_A от объёма погружённой части', resultVerb: 'Исследуй F_арх от объёма' },
      { id: '1.4', title: 'F_A от плотности жидкости', resultVerb: 'Исследуй F_арх от плотности жидкости' },
      { id: '1.5', title: 'Независимость F_A от массы тела', resultVerb: 'Проверь независимость F_арх от массы' },
    ],
    photo: 'kit-1.png',
    progress: { done: 4, total: 5 },
    category: 'mechanics',
    accent: '#14b8a6',
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
      { id: '3.1', title: 'Закон Ома для участка', resultVerb: 'Проверь закон Ома для участка цепи' },
      { id: '3.2', title: 'Сопротивление проводника', resultVerb: 'Определи сопротивление проводника' },
      { id: '3.3', title: 'Последовательное соединение', resultVerb: 'Исследуй последовательное соединение резисторов' },
      { id: '3.4', title: 'Параллельное соединение', resultVerb: 'Исследуй параллельное соединение резисторов' },
      { id: '3.5', title: 'Реостат / делитель напряжения', resultVerb: 'Собери делитель напряжения на реостате' },
      { id: '3.6', title: 'Работа и мощность тока', resultVerb: 'Вычисли мощность электрического тока' },
      { id: '3.7', title: 'Закон Джоуля—Ленца', resultVerb: 'Проверь закон Джоуля–Ленца' },
      { id: '3.8', title: 'Зависимость R от длины', resultVerb: 'Измерь зависимость сопротивления от длины проводника' },
      { id: '3.9', title: 'Зависимость R от сечения', resultVerb: 'Измерь зависимость сопротивления от сечения проводника' },
    ],
    photo: 'kit-3.png',
    eta: '2026 Q4',
    progress: { done: 0, total: 9 },
    category: 'electricity',
    accent: '#f59e0b',
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
      { id: '4.1', title: 'Фокусное расстояние линзы', resultVerb: 'Определи фокусное расстояние линзы' },
      { id: '4.2', title: 'Изображение в собирающей линзе', resultVerb: 'Получи изображение в собирающей линзе' },
      { id: '4.3', title: 'Преломление света', resultVerb: 'Измерь угол преломления света' },
      { id: '4.4', title: 'Дисперсия', resultVerb: 'Наблюдай дисперсию белого света' },
      { id: '4.5', title: 'Полное внутреннее отражение', resultVerb: 'Найди угол полного внутреннего отражения' },
      { id: '4.6', title: 'Угол отражения', resultVerb: 'Проверь закон отражения света' },
    ],
    photo: 'kit-4.png',
    eta: '2027 Q1',
    progress: { done: 0, total: 6 },
    category: 'optics',
    accent: '#a855f7',
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
      { id: '5.1', title: 'Период математического маятника', resultVerb: 'Измерь период математического маятника' },
      { id: '5.2', title: 'Период пружинного маятника', resultVerb: 'Измерь период пружинного маятника' },
      { id: '5.3', title: 'Зависимость T от длины', resultVerb: 'Исследуй зависимость периода от длины нити' },
      { id: '5.4', title: 'Резонанс', resultVerb: 'Наблюдай резонанс механических колебаний' },
    ],
    photo: 'kit-5.png',
    eta: '2027 Q2',
    progress: { done: 0, total: 4 },
    category: 'mechanics',
    accent: '#22d3ee',
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
      { id: '6.1', title: 'Равновесие рычага', resultVerb: 'Проверь условие равновесия рычага' },
      { id: '6.2', title: 'КПД наклонной плоскости', resultVerb: 'Вычисли КПД наклонной плоскости' },
      { id: '6.3', title: 'Неподвижный блок', resultVerb: 'Исследуй неподвижный блок' },
      { id: '6.4', title: 'Подвижный блок (выигрыш в силе)', resultVerb: 'Измерь выигрыш в силе подвижного блока' },
    ],
    photo: 'kit-6.png',
    eta: '2027 Q2',
    progress: { done: 0, total: 4 },
    category: 'mechanics',
    accent: '#84cc16',
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
      { id: '7.1', title: 'Удельная теплоёмкость', resultVerb: 'Определи удельную теплоёмкость вещества' },
      { id: '7.2', title: 'Теплота плавления льда', resultVerb: 'Измерь удельную теплоту плавления льда' },
      { id: '7.3', title: 'Тепловой баланс смешивания', resultVerb: 'Проверь уравнение теплового баланса' },
    ],
    photo: 'kit-7.png',
    eta: '2027 Q3',
    progress: { done: 0, total: 3 },
    category: 'thermal',
    accent: '#ef4444',
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

/** Вернуть все киты указанной физической категории. */
export function kitsByCategory(cat: KitCategory, kits: ReadonlyArray<Kit> = KITS): ReadonlyArray<Kit> {
  return kits.filter(k => k.category === cat);
}
