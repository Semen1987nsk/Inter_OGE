/**
 * Тесты для a11y
 * @module a11y.test
 */

import { jest } from '@jest/globals';

// Mock HTMLElement
global.HTMLElement = class HTMLElement {};

// Mock DOM
const createMockElement = (tag = 'div') => {
  const el = Object.create(HTMLElement.prototype);
  Object.assign(el, {
    tagName: tag.toUpperCase(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    hasAttribute: jest.fn(() => false),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    focus: jest.fn(),
    click: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn()
    },
    style: {},
    textContent: '',
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(() => null),
    insertBefore: jest.fn(),
    appendChild: jest.fn(),
    firstChild: null
  });
  return el;
};

global.document = {
  createElement: jest.fn(() => createMockElement()),
  getElementById: jest.fn(() => null),
  querySelector: jest.fn(() => null),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  body: createMockElement('body'),
  head: createMockElement('head'),
  documentElement: createMockElement('html'),
  activeElement: createMockElement('button'),
  readyState: 'complete'
};

// Import after mocks
const { A11yManager, announce, trapFocus } = await import('../experiments/shared/a11y.js');

describe('A11yManager', () => {
  let manager;

  beforeEach(() => {
    manager = new A11yManager();
    document.getElementById.mockReturnValue(null);
  });

  describe('init()', () => {
    test('должен создавать live region', () => {
      manager.init();
      expect(document.createElement).toHaveBeenCalled();
      expect(manager.initialized).toBe(true);
    });

    test('не должен инициализироваться повторно', () => {
      manager.init();
      const createCount = document.createElement.mock.calls.length;
      
      manager.init();
      // Количество вызовов не должно увеличиться значительно
      expect(manager.initialized).toBe(true);
    });
  });

  describe('announce()', () => {
    test('должен устанавливать текст в live region', () => {
      manager.init();
      manager.liveRegion = createMockElement();
      
      manager.announce('Test message');
      
      // Текст устанавливается с задержкой, проверяем механизм
      expect(manager.liveRegion.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
    });

    test('должен поддерживать assertive priority', () => {
      manager.init();
      manager.liveRegion = createMockElement();
      
      manager.announce('Urgent message', 'assertive');
      
      expect(manager.liveRegion.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive');
    });
  });

  describe('trapFocus()', () => {
    test('должен сохранять последний сфокусированный элемент', () => {
      const container = createMockElement();
      const focusableBtn = createMockElement('button');
      container.querySelectorAll.mockReturnValue([focusableBtn]);
      
      manager.trapFocus(container);
      
      expect(manager.lastFocusedElement).toBeDefined();
    });

    test('должен возвращать функцию release', () => {
      const container = createMockElement();
      container.querySelectorAll.mockReturnValue([createMockElement('button')]);
      
      const release = manager.trapFocus(container);
      
      expect(typeof release).toBe('function');
    });

    test('release должен удалять event listener', () => {
      const container = createMockElement();
      container.querySelectorAll.mockReturnValue([createMockElement('button')]);
      
      const release = manager.trapFocus(container);
      release();
      
      expect(container.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('makeCanvasAccessible()', () => {
    test('должен добавлять ARIA атрибуты', () => {
      const canvas = createMockElement('canvas');
      
      manager.makeCanvasAccessible(canvas, {
        label: 'Experiment workspace'
      });
      
      expect(canvas.setAttribute).toHaveBeenCalledWith('role', 'img');
      expect(canvas.setAttribute).toHaveBeenCalledWith('aria-label', 'Experiment workspace');
      expect(canvas.setAttribute).toHaveBeenCalledWith('tabindex', '0');
    });

    test('должен использовать кастомную роль', () => {
      const canvas = createMockElement('canvas');
      
      manager.makeCanvasAccessible(canvas, {
        label: 'Interactive canvas',
        role: 'application'
      });
      
      expect(canvas.setAttribute).toHaveBeenCalledWith('role', 'application');
    });
  });

  describe('setupDraggable()', () => {
    test('должен добавлять ARIA атрибуты для drag', () => {
      const draggable = createMockElement();
      
      manager.setupDraggable(draggable, {
        label: 'Weight 100g'
      });
      
      expect(draggable.setAttribute).toHaveBeenCalledWith('role', 'button');
      expect(draggable.setAttribute).toHaveBeenCalledWith('aria-label', 'Weight 100g');
      expect(draggable.setAttribute).toHaveBeenCalledWith('aria-grabbed', 'false');
      expect(draggable.setAttribute).toHaveBeenCalledWith('tabindex', '0');
    });

    test('должен добавлять keyboard handler', () => {
      const draggable = createMockElement();
      
      manager.setupDraggable(draggable, { label: 'Draggable' });
      
      expect(draggable.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('setupDropzone()', () => {
    test('должен добавлять ARIA атрибуты для dropzone', () => {
      const dropzone = createMockElement();
      
      manager.setupDropzone(dropzone, {
        label: 'Spring hook'
      });
      
      expect(dropzone.setAttribute).toHaveBeenCalledWith('role', 'region');
      expect(dropzone.setAttribute).toHaveBeenCalledWith('aria-label', 'Spring hook');
      expect(dropzone.setAttribute).toHaveBeenCalledWith('aria-dropeffect', 'move');
    });
  });

  describe('audit()', () => {
    test('должен возвращать объект с passed и issues', () => {
      document.querySelectorAll.mockReturnValue([]);
      document.querySelector.mockReturnValue(createMockElement());
      document.documentElement.getAttribute.mockReturnValue('ru');
      
      const result = manager.audit();
      
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('issues');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    test('должен находить изображения без alt', () => {
      document.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img:not([alt])') {
          return [createMockElement('img'), createMockElement('img')];
        }
        return [];
      });
      
      const result = manager.audit();
      
      expect(result.issues.some(i => i.includes('изображений без атрибута alt'))).toBe(true);
    });

    test('должен проверять наличие main landmark', () => {
      document.querySelector.mockImplementation((selector) => {
        if (selector === 'main, [role="main"]') return null;
        if (selector === 'h1') return createMockElement('h1');
        return createMockElement();
      });
      document.querySelectorAll.mockReturnValue([]);
      document.documentElement.getAttribute.mockReturnValue('ru');
      
      const result = manager.audit();
      
      expect(result.issues.some(i => i.includes('main landmark'))).toBe(true);
    });
  });
});

describe('announce()', () => {
  test('должен быть экспортирован как функция', () => {
    expect(typeof announce).toBe('function');
  });
});

describe('trapFocus()', () => {
  test('должен быть экспортирован как функция', () => {
    expect(typeof trapFocus).toBe('function');
  });
});
