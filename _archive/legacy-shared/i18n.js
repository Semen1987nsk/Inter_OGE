/**
 * i18n - Система локализации
 * 
 * @module i18n
 * @description Лёгкая система интернационализации для приложения.
 * Поддерживает русский и английский языки, автоопределение языка браузера,
 * интерполяцию переменных и pluralization.
 * 
 * @example
 * import { i18n, t } from './shared/i18n.js';
 * 
 * // Инициализация
 * i18n.init({ defaultLocale: 'ru' });
 * 
 * // Перевод
 * t('experiment.title'); // "Определение жёсткости пружины"
 * t('weights.count', { count: 3 }); // "3 груза"
 * 
 * // Смена языка
 * i18n.setLocale('en');
 */

/**
 * @typedef {Object} TranslationDict
 * @property {Object} ru - Русские переводы
 * @property {Object} en - Английские переводы
 */

/**
 * Русские переводы
 */
const ru = {
  // Общие
  common: {
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    cancel: 'Отмена',
    ok: 'ОК',
    save: 'Сохранить',
    reset: 'Сбросить',
    close: 'Закрыть',
    back: 'Назад',
    next: 'Далее',
    yes: 'Да',
    no: 'Нет'
  },

  // Эксперимент 1: Пружина
  experiment1: {
    title: 'Определение жёсткости пружины',
    subtitle: 'Комплект №2 • ФИПИ ОГЭ 2025',
    
    // Панели
    panels: {
      weights: 'Грузы',
      measurements: 'Измерения',
      results: 'Результаты',
      equipment: 'Оборудование'
    },

    // Грузы
    weights: {
      mass: 'Масса',
      gram: 'г',
      attach: 'Подвесить',
      remove: 'Снять',
      available: 'Доступные грузы',
      attached: 'Подвешенные грузы',
      count_one: '{{count}} груз',
      count_few: '{{count}} груза',
      count_many: '{{count}} грузов'
    },

    // Измерения
    measurements: {
      force: 'Сила',
      elongation: 'Удлинение',
      stiffness: 'Жёсткость',
      currentValues: 'Текущие значения',
      record: 'Записать',
      recorded: 'Записано',
      measurement: 'Измерение',
      number: '№',
      noData: 'Нет данных'
    },

    // Расчёты
    calculations: {
      calculate: 'Рассчитать k',
      average: 'Среднее',
      regression: 'МНК',
      accuracy: 'Точность',
      result: 'Результат',
      stiffnessValue: 'k = {{value}} Н/м'
    },

    // Ошибки и предупреждения
    errors: {
      noWeight: 'Сначала подвесьте груз на пружину!',
      duplicate: 'Измерение для {{count}} груза(ов) уже записано!',
      overload: 'Пружина перегружена!',
      noElongation: 'Пружина не растянута!'
    },

    // Подсказки
    hints: {
      dragWeight: 'Перетащите груз на крючок пружины',
      readRuler: 'Считайте удлинение по линейке',
      recordMeasurement: 'Нажмите "Записать" для сохранения',
      collectData: 'Соберите 3-5 измерений для расчёта'
    },

    // Онбординг
    tour: {
      welcome: 'Добро пожаловать!',
      welcomeText: 'В этом опыте вы определите жёсткость пружины',
      spring: 'Пружина',
      springText: 'Пружина закреплена на штативе. При подвешивании груза она растягивается',
      weights: 'Грузы',
      weightsText: 'Выберите груз и перетащите его на крючок пружины',
      ruler: 'Линейка',
      rulerText: 'Измеряйте удлинение пружины с помощью линейки',
      finish: 'Готово!',
      finishText: 'Теперь вы можете начать эксперимент'
    }
  },

  // Эксперимент 2: Трение
  experiment2: {
    title: 'Определение коэффициента трения',
    subtitle: 'Комплект №2 • ФИПИ ОГЭ 2025'
  },

  // Физические единицы
  units: {
    newton: 'Н',
    meter: 'м',
    centimeter: 'см',
    millimeter: 'мм',
    kilogram: 'кг',
    gram: 'г',
    newtonPerMeter: 'Н/м',
    second: 'с'
  },

  // Accessibility
  a11y: {
    canvas: 'Рабочая область эксперимента',
    dragHandle: 'Перетаскиваемый элемент',
    measurementTable: 'Таблица измерений',
    resultPanel: 'Панель результатов'
  }
};

/**
 * Английские переводы
 */
const en = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    ok: 'OK',
    save: 'Save',
    reset: 'Reset',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    yes: 'Yes',
    no: 'No'
  },

  experiment1: {
    title: 'Determining Spring Stiffness',
    subtitle: 'Kit #2 • FIPI OGE 2025',
    
    panels: {
      weights: 'Weights',
      measurements: 'Measurements',
      results: 'Results',
      equipment: 'Equipment'
    },

    weights: {
      mass: 'Mass',
      gram: 'g',
      attach: 'Attach',
      remove: 'Remove',
      available: 'Available weights',
      attached: 'Attached weights',
      count_one: '{{count}} weight',
      count_other: '{{count}} weights'
    },

    measurements: {
      force: 'Force',
      elongation: 'Elongation',
      stiffness: 'Stiffness',
      currentValues: 'Current values',
      record: 'Record',
      recorded: 'Recorded',
      measurement: 'Measurement',
      number: '#',
      noData: 'No data'
    },

    calculations: {
      calculate: 'Calculate k',
      average: 'Average',
      regression: 'Linear Regression',
      accuracy: 'Accuracy',
      result: 'Result',
      stiffnessValue: 'k = {{value}} N/m'
    },

    errors: {
      noWeight: 'First, attach a weight to the spring!',
      duplicate: 'Measurement for {{count}} weight(s) already recorded!',
      overload: 'Spring is overloaded!',
      noElongation: 'Spring is not stretched!'
    },

    hints: {
      dragWeight: 'Drag a weight to the spring hook',
      readRuler: 'Read the elongation from the ruler',
      recordMeasurement: 'Click "Record" to save',
      collectData: 'Collect 3-5 measurements for calculation'
    },

    tour: {
      welcome: 'Welcome!',
      welcomeText: 'In this experiment you will determine spring stiffness',
      spring: 'Spring',
      springText: 'The spring is attached to a stand. It stretches when weight is attached',
      weights: 'Weights',
      weightsText: 'Select a weight and drag it to the spring hook',
      ruler: 'Ruler',
      rulerText: 'Measure the spring elongation using the ruler',
      finish: 'Done!',
      finishText: 'Now you can start the experiment'
    }
  },

  experiment2: {
    title: 'Determining Friction Coefficient',
    subtitle: 'Kit #2 • FIPI OGE 2025'
  },

  units: {
    newton: 'N',
    meter: 'm',
    centimeter: 'cm',
    millimeter: 'mm',
    kilogram: 'kg',
    gram: 'g',
    newtonPerMeter: 'N/m',
    second: 's'
  },

  a11y: {
    canvas: 'Experiment workspace',
    dragHandle: 'Draggable element',
    measurementTable: 'Measurements table',
    resultPanel: 'Results panel'
  }
};

/**
 * Все переводы
 * @type {TranslationDict}
 */
const translations = { ru, en };

/**
 * Класс интернационализации
 */
class I18n {
  constructor() {
    /** @type {string} Текущая локаль */
    this.locale = 'ru';
    
    /** @type {string} Локаль по умолчанию */
    this.fallbackLocale = 'ru';
    
    /** @type {TranslationDict} */
    this.translations = translations;
    
    /** @type {Set<Function>} Слушатели смены языка */
    this.listeners = new Set();
  }

  /**
   * Инициализация системы локализации
   * @param {Object} options - Опции
   * @param {string} [options.defaultLocale] - Локаль по умолчанию
   * @param {boolean} [options.detectBrowser=true] - Автоопределение языка браузера
   */
  init(options = {}) {
    const { defaultLocale = 'ru', detectBrowser = true } = options;
    
    this.fallbackLocale = defaultLocale;
    
    // Пробуем загрузить сохранённый язык
    const savedLocale = this.getSavedLocale();
    
    if (savedLocale && this.translations[savedLocale]) {
      this.locale = savedLocale;
    } else if (detectBrowser) {
      this.locale = this.detectBrowserLocale();
    } else {
      this.locale = defaultLocale;
    }
    
    console.log(`🌐 i18n initialized: ${this.locale}`);
  }

  /**
   * Определить язык браузера
   * @returns {string}
   */
  detectBrowserLocale() {
    if (typeof navigator === 'undefined') return this.fallbackLocale;
    
    const browserLang = navigator.language || navigator.languages?.[0] || '';
    const lang = browserLang.split('-')[0].toLowerCase();
    
    return this.translations[lang] ? lang : this.fallbackLocale;
  }

  /**
   * Получить сохранённую локаль
   * @returns {string|null}
   */
  getSavedLocale() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('locale');
  }

  /**
   * Сохранить локаль
   * @param {string} locale
   */
  saveLocale(locale) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', locale);
    }
  }

  /**
   * Установить локаль
   * @param {string} locale - Код языка (ru, en)
   * @returns {boolean} Успешно ли
   */
  setLocale(locale) {
    if (!this.translations[locale]) {
      console.warn(`Locale "${locale}" not found`);
      return false;
    }
    
    const oldLocale = this.locale;
    this.locale = locale;
    this.saveLocale(locale);
    
    // Уведомляем слушателей
    this.listeners.forEach(fn => fn(locale, oldLocale));
    
    console.log(`🌐 Locale changed: ${oldLocale} → ${locale}`);
    return true;
  }

  /**
   * Получить текущую локаль
   * @returns {string}
   */
  getLocale() {
    return this.locale;
  }

  /**
   * Получить список доступных локалей
   * @returns {string[]}
   */
  getAvailableLocales() {
    return Object.keys(this.translations);
  }

  /**
   * Подписаться на смену языка
   * @param {Function} callback - (newLocale, oldLocale) => void
   * @returns {Function} Функция отписки
   */
  onLocaleChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Получить перевод по ключу
   * @param {string} key - Ключ (например, "experiment1.title")
   * @param {Object} [params] - Параметры для интерполяции
   * @returns {string}
   */
  translate(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations[this.locale];
    
    // Пробуем найти в текущей локали
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        value = null;
        break;
      }
    }
    
    // Fallback на дефолтную локаль
    if (value === null && this.locale !== this.fallbackLocale) {
      value = this.translations[this.fallbackLocale];
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          value = null;
          break;
        }
      }
    }
    
    // Если не нашли - возвращаем ключ
    if (value === null || typeof value !== 'string') {
      console.warn(`Translation not found: ${key}`);
      return key;
    }
    
    // Интерполяция {{param}}
    return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return params[param] !== undefined ? String(params[param]) : match;
    });
  }

  /**
   * Pluralization (для русского и английского)
   * @param {string} key - Базовый ключ
   * @param {number} count - Количество
   * @param {Object} [params] - Дополнительные параметры
   * @returns {string}
   */
  plural(key, count, params = {}) {
    const pluralKey = this.getPluralKey(count);
    const fullKey = `${key}_${pluralKey}`;
    
    // Пробуем найти плюральную форму
    let result = this.translate(fullKey, { count, ...params });
    
    // Если не нашли - пробуем базовый ключ
    if (result === fullKey) {
      result = this.translate(key, { count, ...params });
    }
    
    return result;
  }

  /**
   * Получить ключ плюральной формы
   * @param {number} count
   * @returns {string}
   */
  getPluralKey(count) {
    if (this.locale === 'ru') {
      // Русская плюрализация
      const abs = Math.abs(count);
      const mod10 = abs % 10;
      const mod100 = abs % 100;
      
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'few';
      return 'many';
    } else {
      // Английская плюрализация
      return count === 1 ? 'one' : 'other';
    }
  }
}

// Singleton
const i18n = new I18n();

/**
 * Короткая функция перевода
 * @param {string} key - Ключ перевода
 * @param {Object} [params] - Параметры
 * @returns {string}
 */
function t(key, params) {
  return i18n.translate(key, params);
}

/**
 * Короткая функция плюрализации
 * @param {string} key - Ключ
 * @param {number} count - Количество
 * @param {Object} [params] - Параметры
 * @returns {string}
 */
function p(key, count, params) {
  return i18n.plural(key, count, params);
}

// Экспорты
export { i18n, t, p, translations };

// Глобальный доступ
if (typeof window !== 'undefined') {
  window.i18n = i18n;
  window.t = t;
  window.p = p;
}
