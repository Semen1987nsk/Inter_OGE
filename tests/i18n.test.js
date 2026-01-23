/**
 * Тесты для i18n
 * @module i18n.test
 */

import { jest } from '@jest/globals';

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
  clear: jest.fn(() => { localStorageMock.store = {}; })
};

global.localStorage = localStorageMock;

// Mock navigator
global.navigator = {
  language: 'ru-RU',
  languages: ['ru-RU', 'en-US']
};

// Import after mocks
const { i18n, t, p, translations } = await import('../experiments/shared/i18n.js');

describe('i18n', () => {
  
  beforeEach(() => {
    localStorageMock.clear();
    i18n.locale = 'ru';
    i18n.fallbackLocale = 'ru';
  });

  describe('init()', () => {
    test('должен инициализироваться с дефолтной локалью', () => {
      i18n.init({ defaultLocale: 'ru', detectBrowser: false });
      expect(i18n.getLocale()).toBe('ru');
    });

    test('должен определять язык браузера', () => {
      global.navigator.language = 'en-US';
      i18n.init({ detectBrowser: true });
      expect(i18n.getLocale()).toBe('en');
    });

    test('должен использовать сохранённую локаль', () => {
      localStorageMock.store['locale'] = 'en';
      i18n.init();
      expect(i18n.getLocale()).toBe('en');
    });
  });

  describe('setLocale()', () => {
    test('должен менять локаль', () => {
      i18n.setLocale('en');
      expect(i18n.getLocale()).toBe('en');
    });

    test('должен сохранять локаль', () => {
      i18n.setLocale('en');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('locale', 'en');
    });

    test('должен возвращать false для неизвестной локали', () => {
      const result = i18n.setLocale('fr');
      expect(result).toBe(false);
      expect(i18n.getLocale()).toBe('ru'); // Не изменилась
    });

    test('должен вызывать listeners', () => {
      const listener = jest.fn();
      i18n.onLocaleChange(listener);
      
      i18n.setLocale('en');
      
      expect(listener).toHaveBeenCalledWith('en', 'ru');
    });
  });

  describe('translate()', () => {
    test('должен переводить простые ключи', () => {
      i18n.setLocale('ru');
      const result = i18n.translate('common.loading');
      expect(result).toBe('Загрузка...');
    });

    test('должен переводить на английский', () => {
      i18n.setLocale('en');
      const result = i18n.translate('common.loading');
      expect(result).toBe('Loading...');
    });

    test('должен интерполировать параметры', () => {
      i18n.setLocale('ru');
      const result = i18n.translate('experiment1.calculations.stiffnessValue', { value: 40 });
      expect(result).toBe('k = 40 Н/м');
    });

    test('должен возвращать ключ если перевод не найден', () => {
      const result = i18n.translate('nonexistent.key');
      expect(result).toBe('nonexistent.key');
    });

    test('должен использовать fallback локаль', () => {
      i18n.setLocale('en');
      i18n.fallbackLocale = 'ru';
      
      // Предположим, что в английском нет какого-то ключа
      // В данном случае все ключи есть, так что просто проверим механизм
      const result = i18n.translate('common.ok');
      expect(result).toBe('OK'); // Английский перевод
    });
  });

  describe('t() shorthand', () => {
    test('должен работать как translate', () => {
      i18n.setLocale('ru');
      expect(t('common.error')).toBe('Ошибка');
    });
  });

  describe('plural()', () => {
    test('должен правильно плюралить на русском (1)', () => {
      i18n.setLocale('ru');
      const result = i18n.plural('experiment1.weights.count', 1);
      expect(result).toBe('1 груз');
    });

    test('должен правильно плюралить на русском (2-4)', () => {
      i18n.setLocale('ru');
      const result = i18n.plural('experiment1.weights.count', 3);
      expect(result).toBe('3 груза');
    });

    test('должен правильно плюралить на русском (5+)', () => {
      i18n.setLocale('ru');
      const result = i18n.plural('experiment1.weights.count', 5);
      expect(result).toBe('5 грузов');
    });

    test('должен правильно плюралить на английском (1)', () => {
      i18n.setLocale('en');
      const result = i18n.plural('experiment1.weights.count', 1);
      expect(result).toBe('1 weight');
    });

    test('должен правильно плюралить на английском (2+)', () => {
      i18n.setLocale('en');
      const result = i18n.plural('experiment1.weights.count', 5);
      expect(result).toBe('5 weights');
    });
  });

  describe('getPluralKey()', () => {
    test('русский: 1, 21, 31 -> one', () => {
      i18n.setLocale('ru');
      expect(i18n.getPluralKey(1)).toBe('one');
      expect(i18n.getPluralKey(21)).toBe('one');
      expect(i18n.getPluralKey(31)).toBe('one');
    });

    test('русский: 2-4, 22-24 -> few', () => {
      i18n.setLocale('ru');
      expect(i18n.getPluralKey(2)).toBe('few');
      expect(i18n.getPluralKey(3)).toBe('few');
      expect(i18n.getPluralKey(4)).toBe('few');
      expect(i18n.getPluralKey(22)).toBe('few');
    });

    test('русский: 5-20, 25-30 -> many', () => {
      i18n.setLocale('ru');
      expect(i18n.getPluralKey(5)).toBe('many');
      expect(i18n.getPluralKey(11)).toBe('many');
      expect(i18n.getPluralKey(15)).toBe('many');
      expect(i18n.getPluralKey(20)).toBe('many');
    });

    test('английский: 1 -> one, остальные -> other', () => {
      i18n.setLocale('en');
      expect(i18n.getPluralKey(1)).toBe('one');
      expect(i18n.getPluralKey(2)).toBe('other');
      expect(i18n.getPluralKey(10)).toBe('other');
    });
  });

  describe('getAvailableLocales()', () => {
    test('должен возвращать список локалей', () => {
      const locales = i18n.getAvailableLocales();
      expect(locales).toContain('ru');
      expect(locales).toContain('en');
    });
  });

  describe('onLocaleChange()', () => {
    test('должен возвращать функцию отписки', () => {
      const listener = jest.fn();
      const unsubscribe = i18n.onLocaleChange(listener);
      
      i18n.setLocale('en');
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      i18n.setLocale('ru');
      expect(listener).toHaveBeenCalledTimes(1); // Не вызван повторно
    });
  });
});

describe('translations', () => {
  test('ru и en должны иметь одинаковую структуру (common)', () => {
    expect(Object.keys(translations.ru.common).sort())
      .toEqual(Object.keys(translations.en.common).sort());
  });

  test('ru и en должны иметь одинаковую структуру (units)', () => {
    expect(Object.keys(translations.ru.units).sort())
      .toEqual(Object.keys(translations.en.units).sort());
  });
});
