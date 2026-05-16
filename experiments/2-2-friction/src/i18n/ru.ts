/**
 * Все строки опыта на русском.
 * Tone of voice — гибрид (по согласованию):
 *  - в инструкциях на «вы» (как сайт Лабосферы);
 *  - в мотивационных микро-сообщениях на «ты» (теплее для 14-16 лет).
 */

export const ru = {
  app: {
    title: 'Опыт 2.1: Измерение жёсткости пружины',
    backToList: 'К списку опытов',
    settings: 'Настройки',
    info: 'О опыте',
  },
  shelf: {
    title: 'Полка грузов',
    standardWeights: 'Стандартные грузы',
    fineWeights: 'Наборные грузы',
    mysteryWeights: 'Без массы',
    massGram: '{{value}} г',
    pickHint: 'Перетащите груз на крючок пружины',
  },
  stage: {
    initialHint: 'Возьмите груз и подвесьте его на пружину',
    waitingForRelease: 'Дождитесь, пока пружина перестанет колебаться',
    measureReady: 'Готово к измерению',
  },
  readings: {
    title: 'Текущие показания',
    force: 'Сила F',
    extension: 'Удлинение Δl',
    stiffness: 'Жёсткость k',
    forceUnit: 'Н',
    extensionUnit: 'см',
    stiffnessUnit: 'Н/м',
    notMeasured: '—',
  },
  measurements: {
    title: 'Записанные измерения',
    record: 'Записать измерение',
    columnNumber: '№',
    columnMass: 'm, г',
    columnForce: 'F, Н',
    columnExtension: 'Δl, см',
    columnStiffness: 'k, Н/м',
    delete: 'Удалить точку',
    empty: 'Записанных измерений пока нет',
    average: 'Среднее значение k̄',
    stdDev: 'Стандартное отклонение σ',
    leastSquares: 'k по графику (МНК)',
  },
  graph: {
    title: 'График F(Δl)',
    axisX: 'Δl, см',
    axisY: 'F, Н',
    noData: 'Запишите хотя бы одно измерение',
    fitLine: 'Аппроксимация',
  },
  options: {
    showForce: 'Показать вектор силы',
    showExtension: 'Показать шкалу удлинения',
    showRuler: 'Показать линейку',
    reset: 'Сбросить опыт',
    resetConfirm: 'Сбросить все измерения?',
  },
  spring: {
    selectSpring: 'Выберите пружину',
    spring1: 'Пружина №1 (k = 50 Н/м)',
    spring2: 'Пружина №2 (k неизвестна)',
    mysteryHint: 'Жёсткость этой пружины не указана — определи её сам',
  },
  feedback: {
    weightAttached: 'Груз закреплён. Дождись, пока пружина успокоится.',
    measurementRecorded: 'Измерение записано — точка появилась на графике',
    threePoints: 'Отлично, у тебя 3 измерения! Ты можешь точно вычислить k.',
    completed: 'Опыт пройден. Жёсткость пружины определена.',
    outOfRange: 'Внимание: значение k вышло за допустимый интервал ({{min}}…{{max}} Н/м)',
    inRange: 'Значение k в допустимом интервале — точное измерение!',
  },
  a11y: {
    weightOnShelf: 'Груз {{mass}} грамм, нажмите Enter чтобы взять',
    weightInHand: 'Груз {{mass}} грамм в руке. Используйте стрелки чтобы переместить, Enter — повесить.',
    weightAttached: 'Груз {{mass}} грамм подвешен. Текущая сила {{force}} ньютон, удлинение {{extension}} сантиметров.',
    measurementAdded: 'Измерение записано: сила {{force}} ньютон, удлинение {{extension}} сантиметров.',
  },
} as const;

export type Translations = typeof ru;

/**
 * Простая замена плейсхолдеров {{key}} в строке.
 */
export function t(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}
