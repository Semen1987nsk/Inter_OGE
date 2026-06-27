/**
 * Каталог 7 комплектов лаборатории ЛАБОСФЕРА.
 *
 * Источник истины — соответствие ФИПИ ОГЭ-2026 (раздел «Лабораторные работы»).
 * Каждому комплекту соответствует:
 *   - папка с опытами в experiments/<kit-folder>/
 *   - приборная SVG-иллюстрация в /public/photos/kit-N.svg (свой вектор, графит+акцент, без лицензий)
 *   - набор опытов с указанием задачи ОГЭ
 */

export type KitStatus = 'ready' | 'planned';
export type KitPriority = 'flagship' | 'medium' | 'compact';
export type KitCategory = 'mechanics' | 'electricity' | 'optics' | 'thermal';

export interface KitExperiment {
  /** Слаг зарегистрированного экрана (для запуска ?screen=<id>); для planned — будущий слаг. */
  readonly id: string;
  readonly title: string;
  readonly resultVerb: string;
  /** Дотированный номер по ФИПИ (например, '2.1') — для бейджа. */
  readonly fipiTask?: string;
  /** true — опыт входит в перечень ФИПИ; false — бонус ЛАБОСФЕРЫ. */
  readonly isFipi: boolean;
  /** true — опыт реализован и DoD-ready. */
  readonly done: boolean;
  /** Обязателен, если isFipi===false: причина-обоснование бонуса. */
  readonly bonusReason?: string;
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
  /** Приборная SVG-иллюстрация — public/photos/<photo>.svg */
  readonly photo: string;
  /** Только для planned — приблизительный квартал релиза. */
  readonly eta?: string;
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
      { id: 'spring-stiffness', title: 'Жёсткость пружины',                resultVerb: 'Измерь жёсткость пружины',             fipiTask: '2.1', isFipi: true, done: true },
      { id: 'friction',         title: 'Коэффициент трения скольжения',    resultVerb: 'Определи коэффициент трения',           fipiTask: '2.2', isFipi: true, done: true },
      { id: 'friction',         title: 'Работа силы трения',               resultVerb: 'Найди работу силы трения',             fipiTask: '2.3', isFipi: true, done: true },
      { id: 'elastic-force',    title: 'Измерение силы упругости',         resultVerb: 'Измерь силу упругости',                fipiTask: '2.4', isFipi: true, done: true },
      { id: 'friction',         title: 'F_тр от силы нормального давления', resultVerb: 'Исследуй F_тр от нормального давления', fipiTask: '2.5', isFipi: true, done: true },
      { id: 'friction',         title: 'F_тр от рода поверхности',         resultVerb: 'Исследуй F_тр от рода поверхности',     fipiTask: '2.6', isFipi: true, done: true },
      { id: 'spring-elastic',   title: 'Сила упругости от деформации (Гука)', resultVerb: 'Построй график силы упругости',     fipiTask: '2.7', isFipi: true, done: true },
      { id: 'spring-work',      title: 'Работа силы упругости',            resultVerb: 'Найди работу силы упругости',          isFipi: false, done: true,
        bonusReason: 'Демонстрирует закон сохранения энергии; в ФИПИ работа упругости только для kit-6 (с блоками). КОДИФ §1.29.' },
    ],
    photo: 'kit-2.svg',
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
      { id: 'density-solid',     title: 'Плотность вещества',                 resultVerb: 'Измерь плотность тела',                  fipiTask: '1.1', isFipi: true, done: true },
      { id: 'archimedes',        title: 'Архимедова сила (цилиндры №2–4)',    resultVerb: 'Измерь архимедову силу',                 fipiTask: '1.2', isFipi: true, done: true },
      { id: 'archimedes-volume', title: 'F_A от объёма погружения',           resultVerb: 'Исследуй F_арх от объёма',               fipiTask: '1.3', isFipi: true, done: true },
      { id: 'archimedes',        title: 'F_A от плотности жидкости',          resultVerb: 'Исследуй F_арх от плотности жидкости',   fipiTask: '1.4', isFipi: true, done: true },
      { id: 'independence-mass', title: 'Независимость F_A от массы тела',    resultVerb: 'Проверь независимость F_арх от массы',   fipiTask: '1.5', isFipi: true, done: true },
    ],
    photo: 'kit-1.svg',
    category: 'mechanics',
    accent: '#14b8a6',
  },

  // КИТ-3 — электричество, ready (опыт 3.1 реализован, Фаза A)
  // ФИПИ ОГЭ-2026, Приложение 2, Комплект №3: 9 опытов.
  {
    num: 3,
    status: 'ready',
    priority: 'medium',
    slug: 'kit-3-circuits',
    path: '../kit-3-circuits/',
    title: 'Электрические цепи',
    summary: 'Закон Ома, мощность, сопротивление, последовательное и параллельное соединения.',
    experiments: [
      { id: 'measurements',         title: 'Измерение сопротивления',              resultVerb: 'Измерь электрическое сопротивление резистора',         fipiTask: '3.1', isFipi: true, done: true },
      { id: 'measurements',         title: 'Измерение мощности тока',              resultVerb: 'Измерь мощность электрического тока',                  fipiTask: '3.2', isFipi: true, done: true },
      { id: 'measurements',         title: 'Измерение работы тока',                resultVerb: 'Измерь работу электрического тока',                    fipiTask: '3.3', isFipi: true, done: true },
      { id: 'iv-curve',             title: 'ВАХ резистора и лампочки',             resultVerb: 'Исследуй зависимость тока от напряжения',              fipiTask: '3.4', isFipi: true, done: true },
      { id: 'wire-resistance',      title: 'Зависимость R от длины',               resultVerb: 'Исследуй зависимость R от длины проводника',            fipiTask: '3.5', isFipi: true, done: true },
      { id: 'wire-resistance',      title: 'Зависимость R от сечения',             resultVerb: 'Исследуй зависимость R от площади поперечного сечения', fipiTask: '3.6', isFipi: true, done: true },
      { id: 'wire-resistance',      title: 'Зависимость R от удельного R',         resultVerb: 'Исследуй зависимость R от удельного сопротивления',     fipiTask: '3.7', isFipi: true, done: true },
      { id: 'connections',          title: 'Правило напряжений (последоват.)',      resultVerb: 'Проверь правило напряжений при последовательном соединении', fipiTask: '3.8', isFipi: true, done: true },
      { id: 'connections',          title: 'Правило токов (параллельное)',          resultVerb: 'Проверь правило токов при параллельном соединении',     fipiTask: '3.9', isFipi: true, done: true },
    ],
    photo: 'kit-3.svg',
    category: 'electricity',
    accent: '#f59e0b',
  },

  // КИТ-4 — оптика, planned
  // ФИПИ ОГЭ-2026, Приложение 2, Комплект №4: 6 опытов.
  {
    num: 4,
    status: 'planned',
    priority: 'compact',
    slug: 'kit-4-optics',
    path: '../kit-4-optics/',
    title: 'Оптика',
    summary: 'Линзы, фокусное расстояние, преломление света, построение изображений.',
    experiments: [
      { id: 'lens-power',          title: 'Оптическая сила линзы',               resultVerb: 'Измерь оптическую силу собирающей линзы',                 fipiTask: '4.1', isFipi: true, done: false },
      { id: 'focal-length',        title: 'Фокусное расстояние линзы',            resultVerb: 'Измерь фокусное расстояние собирающей линзы',             fipiTask: '4.2', isFipi: true, done: false },
      { id: 'refraction-index',    title: 'Показатель преломления стекла',        resultVerb: 'Измерь показатель преломления стекла',                   fipiTask: '4.3', isFipi: true, done: false },
      { id: 'lens-image',          title: 'Изображение в собирающей линзе',       resultVerb: 'Исследуй свойства изображения в собирающей линзе',        fipiTask: '4.4', isFipi: true, done: false },
      { id: 'lens-combo',          title: 'Фокусное расстояние двух линз',        resultVerb: 'Исследуй изменение фокусного расстояния двух сложенных линз', fipiTask: '4.5', isFipi: true, done: false },
      { id: 'refraction-angle',    title: 'Угол преломления от угла падения',     resultVerb: 'Исследуй зависимость угла преломления от угла падения',   fipiTask: '4.6', isFipi: true, done: false },
    ],
    photo: 'kit-4.svg',
    eta: '2027 Q1',
    category: 'optics',
    accent: '#a855f7',
  },

  // КИТ-5 — кинематика и колебания, planned
  // ФИПИ ОГЭ-2026, Приложение 2, Комплект №5: 9 опытов (резерв).
  {
    num: 5,
    status: 'planned',
    priority: 'compact',
    slug: 'kit-5-oscillations',
    path: '../kit-5-oscillations/',
    title: 'Колебания и волны',
    summary: 'Период математического и пружинного маятников, кинематика наклонной плоскости.',
    experiments: [
      { id: 'incline-speed',       title: 'Средняя скорость на наклонной',        resultVerb: 'Измерь среднюю скорость бруска по наклонной плоскости',  fipiTask: '5.1', isFipi: true, done: false },
      { id: 'incline-accel',       title: 'Ускорение на наклонной',               resultVerb: 'Измерь ускорение бруска на наклонной плоскости',         fipiTask: '5.2', isFipi: true, done: false },
      { id: 'pendulum-period',     title: 'Период нитяного маятника',             resultVerb: 'Измерь частоту и период нитяного маятника',              fipiTask: '5.3', isFipi: true, done: false },
      { id: 'spring-period',       title: 'Период пружинного маятника',           resultVerb: 'Измерь частоту и период пружинного маятника',            fipiTask: '5.4', isFipi: true, done: false },
      { id: 'incline-accel-angle', title: 'Ускорение от угла наклона',            resultVerb: 'Исследуй зависимость ускорения от угла наклона направляющей', fipiTask: '5.5', isFipi: true, done: false },
      { id: 'pendulum-length',     title: 'Период от длины нити',                 resultVerb: 'Исследуй зависимость периода нитяного маятника от длины нити', fipiTask: '5.6', isFipi: true, done: false },
      { id: 'spring-mass',         title: 'Период пружинного от массы',           resultVerb: 'Исследуй зависимость периода пружинного маятника от массы груза', fipiTask: '5.7', isFipi: true, done: false },
      { id: 'spring-stiffness-osc', title: 'Период пружинного от жёсткости',     resultVerb: 'Исследуй зависимость периода пружинного маятника от жёсткости', fipiTask: '5.8', isFipi: true, done: false },
      { id: 'pendulum-mass',       title: 'Независимость периода от массы',       resultVerb: 'Исследуй независимость периода нитяного маятника от массы груза', fipiTask: '5.9', isFipi: true, done: false },
    ],
    photo: 'kit-5.svg',
    eta: '2027 Q2',
    category: 'mechanics',
    accent: '#22d3ee',
  },

  // КИТ-6 — рычаги и блоки, planned
  // ФИПИ ОГЭ-2026, Приложение 2, Комплект №6: 4 опыта.
  {
    num: 6,
    status: 'planned',
    priority: 'compact',
    slug: 'kit-6-lever',
    path: '../kit-6-lever/',
    title: 'Рычаги и блоки',
    summary: 'Момент силы рычага, работа силы упругости при подъёме груза блоками, равновесие.',
    experiments: [
      { id: 'lever-moment',        title: 'Момент силы рычага',                  resultVerb: 'Измерь момент силы, действующей на рычаг',              fipiTask: '6.1', isFipi: true, done: false },
      { id: 'fixed-block-work',    title: 'Работа силы (неподвижный блок)',       resultVerb: 'Измерь работу силы упругости при подъёме грузом неподвижным блоком', fipiTask: '6.2', isFipi: true, done: false },
      { id: 'moving-block-work',   title: 'Работа силы (подвижный блок)',         resultVerb: 'Измерь работу силы упругости при подъёме груза подвижным блоком', fipiTask: '6.3', isFipi: true, done: false },
      { id: 'lever-balance',       title: 'Равновесие рычага',                   resultVerb: 'Проверь условие равновесия рычага',                     fipiTask: '6.4', isFipi: true, done: false },
    ],
    photo: 'kit-6.svg',
    eta: '2027 Q2',
    category: 'mechanics',
    accent: '#84cc16',
  },

  // КИТ-7 — тепловые явления, planned
  // ФИПИ ОГЭ-2026, Приложение 2, Комплект №7: 4 опыта (резерв).
  {
    num: 7,
    status: 'planned',
    priority: 'medium',
    slug: 'kit-7-thermal',
    path: '../kit-7-thermal/',
    title: 'Тепловые явления',
    summary: 'Удельная теплоёмкость, теплота плавления, измерение температуры калориметром.',
    experiments: [
      { id: 'heat-capacity',       title: 'Удельная теплоёмкость цилиндра',      resultVerb: 'Измерь удельную теплоёмкость металлического цилиндра',  fipiTask: '7.1', isFipi: true, done: false },
      { id: 'heat-received',       title: 'Теплота, полученная водой',            resultVerb: 'Измерь количество теплоты, полученного водой',           fipiTask: '7.2', isFipi: true, done: false },
      { id: 'heat-given',          title: 'Теплота, отданная цилиндром',          resultVerb: 'Измерь количество теплоты, отданного нагретым цилиндром', fipiTask: '7.3', isFipi: true, done: false },
      { id: 'temp-conditions',     title: 'Температура при разных условиях',      resultVerb: 'Исследуй изменение температуры воды при различных условиях', fipiTask: '7.4', isFipi: true, done: false },
    ],
    photo: 'kit-7.svg',
    eta: '2027 Q3',
    category: 'thermal',
    accent: '#ef4444',
  },
];

/** Прогресс кита по опытам ФИПИ (бонусы не считаются). */
export function kitFipiProgress(kit: Kit): { done: number; total: number } {
  const fipi = kit.experiments.filter(e => e.isFipi);
  return { done: fipi.filter(e => e.done).length, total: fipi.length };
}

/** Сумма ФИПИ-опытов по всем китам. */
export function totalExperiments(kits: ReadonlyArray<Kit> = KITS): { done: number; total: number } {
  return kits.reduce((acc, k) => {
    const p = kitFipiProgress(k);
    return { done: acc.done + p.done, total: acc.total + p.total };
  }, { done: 0, total: 0 });
}

/** Кол-во бонус-опытов кита (isFipi:false). */
export function kitBonusCount(kit: Kit): number {
  return kit.experiments.filter(e => !e.isFipi).length;
}

/** Вернуть все киты указанной физической категории. */
export function kitsByCategory(cat: KitCategory, kits: ReadonlyArray<Kit> = KITS): ReadonlyArray<Kit> {
  return kits.filter(k => k.category === cat);
}
