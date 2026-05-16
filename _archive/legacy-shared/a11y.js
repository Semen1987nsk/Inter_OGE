/**
 * Accessibility (a11y) - Утилиты доступности
 * 
 * @module a11y
 * @description Набор утилит для улучшения доступности приложения.
 * Включает управление ARIA-атрибутами, навигацию с клавиатуры,
 * screen reader объявления и focus management.
 * 
 * @example
 * import { a11y, announce, trapFocus } from './shared/a11y.js';
 * 
 * // Объявление для screen reader
 * announce('Груз подвешен на пружину');
 * 
 * // Ловушка фокуса в модальном окне
 * const release = trapFocus(modalElement);
 * // ... когда модалка закрыта
 * release();
 */

/**
 * Класс управления доступностью
 */
class A11yManager {
  constructor() {
    /** @type {HTMLElement|null} Элемент для live announcements */
    this.liveRegion = null;
    
    /** @type {HTMLElement|null} Последний сфокусированный элемент */
    this.lastFocusedElement = null;
    
    /** @type {boolean} Инициализирован ли */
    this.initialized = false;
  }

  /**
   * Инициализация a11y утилит
   */
  init() {
    if (this.initialized || typeof document === 'undefined') return;
    
    this.createLiveRegion();
    this.setupKeyboardNavigation();
    this.initialized = true;
    
    console.log('♿ A11y utilities initialized');
  }

  /**
   * Создать live region для screen reader объявлений
   * @private
   */
  createLiveRegion() {
    // Проверяем, не существует ли уже
    let existing = document.getElementById('a11y-live-region');
    if (existing) {
      this.liveRegion = existing;
      return;
    }

    this.liveRegion = document.createElement('div');
    this.liveRegion.id = 'a11y-live-region';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('role', 'status');
    
    // Визуально скрыт, но доступен для screen readers
    this.liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Объявить сообщение для screen reader
   * @param {string} message - Сообщение
   * @param {'polite'|'assertive'} [priority='polite'] - Приоритет
   */
  announce(message, priority = 'polite') {
    if (!this.liveRegion) {
      this.createLiveRegion();
    }
    
    this.liveRegion.setAttribute('aria-live', priority);
    
    // Очищаем и устанавливаем с задержкой для гарантии объявления
    this.liveRegion.textContent = '';
    
    setTimeout(() => {
      this.liveRegion.textContent = message;
    }, 100);
  }

  /**
   * Настроить навигацию с клавиатуры
   * @private
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Escape закрывает модальные окна и dropdown
      if (e.key === 'Escape') {
        this.handleEscape();
      }
      
      // Tab с Shift для обратной навигации (обработка в trapFocus)
    });

    // Показать outline только при использовании клавиатуры
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });

    // Добавляем стили
    this.injectA11yStyles();
  }

  /**
   * Обработчик Escape
   * @private
   */
  handleEscape() {
    // Закрываем открытые модальные окна
    const modals = document.querySelectorAll('[role="dialog"][aria-hidden="false"], .modal.active, .modal:not(.hidden)');
    modals.forEach(modal => {
      const closeBtn = modal.querySelector('[data-close], .close-btn, [aria-label="Close"]');
      if (closeBtn instanceof HTMLElement) {
        closeBtn.click();
      }
    });

    // Закрываем dropdown меню
    const dropdowns = document.querySelectorAll('.dropdown.open, [aria-expanded="true"]');
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('open');
      dropdown.setAttribute('aria-expanded', 'false');
    });
  }

  /**
   * Добавить ARIA-стили
   * @private
   */
  injectA11yStyles() {
    const styleId = 'a11y-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Показывать outline только при keyboard navigation */
      body:not(.keyboard-navigation) *:focus {
        outline: none;
      }
      
      body.keyboard-navigation *:focus {
        outline: 3px solid #4A90D9;
        outline-offset: 2px;
      }
      
      /* Skip link */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: #000;
        color: #fff;
        padding: 8px 16px;
        z-index: 100000;
        text-decoration: none;
        font-weight: bold;
      }
      
      .skip-link:focus {
        top: 0;
      }
      
      /* Визуально скрытый, но доступный для screen readers */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      /* Focus visible polyfill */
      .focus-visible {
        outline: 3px solid #4A90D9;
        outline-offset: 2px;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Создать ловушку фокуса (для модальных окон)
   * @param {HTMLElement} container - Контейнер для ловушки
   * @returns {Function} Функция для освобождения ловушки
   */
  trapFocus(container) {
    // Сохраняем текущий фокус
    this.lastFocusedElement = document.activeElement;

    // Находим все фокусируемые элементы
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = container.querySelectorAll(focusableSelector);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Фокусируемся на первом элементе
    if (firstFocusable instanceof HTMLElement) {
      firstFocusable.focus();
    }

    // Обработчик Tab
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          if (lastFocusable instanceof HTMLElement) {
            lastFocusable.focus();
          }
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          if (firstFocusable instanceof HTMLElement) {
            firstFocusable.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTab);

    // Возвращаем функцию освобождения
    return () => {
      container.removeEventListener('keydown', handleTab);
      
      // Восстанавливаем фокус
      if (this.lastFocusedElement instanceof HTMLElement) {
        this.lastFocusedElement.focus();
      }
    };
  }

  /**
   * Добавить skip link для навигации
   * @param {string} targetId - ID целевого элемента
   * @param {string} [text='Перейти к содержимому'] - Текст ссылки
   */
  addSkipLink(targetId, text = 'Перейти к содержимому') {
    if (document.querySelector('.skip-link')) return;

    const link = document.createElement('a');
    link.href = `#${targetId}`;
    link.className = 'skip-link';
    link.textContent = text;
    
    document.body.insertBefore(link, document.body.firstChild);
  }

  /**
   * Сделать canvas доступным
   * @param {HTMLCanvasElement} canvas - Canvas элемент
   * @param {Object} options - Опции
   * @param {string} options.label - Описание canvas
   * @param {string} [options.role='img'] - Роль элемента
   */
  makeCanvasAccessible(canvas, options) {
    const { label, role = 'img' } = options;
    
    canvas.setAttribute('role', role);
    canvas.setAttribute('aria-label', label);
    
    // Делаем canvas фокусируемым для keyboard пользователей
    if (!canvas.hasAttribute('tabindex')) {
      canvas.setAttribute('tabindex', '0');
    }
  }

  /**
   * Добавить ARIA-атрибуты для drag & drop
   * @param {HTMLElement} draggable - Перетаскиваемый элемент
   * @param {Object} options - Опции
   * @param {string} options.label - Описание элемента
   * @param {string} [options.grabbed='false'] - Состояние захвата
   */
  setupDraggable(draggable, options) {
    const { label, grabbed = 'false' } = options;
    
    draggable.setAttribute('role', 'button');
    draggable.setAttribute('aria-label', label);
    draggable.setAttribute('aria-grabbed', grabbed);
    draggable.setAttribute('tabindex', '0');
    
    // Обработка Enter/Space для активации
    draggable.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        draggable.click();
      }
    });
  }

  /**
   * Добавить ARIA-атрибуты для dropzone
   * @param {HTMLElement} dropzone - Зона сброса
   * @param {Object} options - Опции
   * @param {string} options.label - Описание зоны
   */
  setupDropzone(dropzone, options) {
    const { label } = options;
    
    dropzone.setAttribute('role', 'region');
    dropzone.setAttribute('aria-label', label);
    dropzone.setAttribute('aria-dropeffect', 'move');
  }

  /**
   * Обновить live region для результатов
   * @param {Object} result - Результат измерения
   * @param {number} result.force - Сила
   * @param {number} result.elongation - Удлинение
   */
  announceResult(result) {
    const message = `Измерение записано. Сила: ${result.force.toFixed(2)} Ньютон. Удлинение: ${result.elongation.toFixed(2)} сантиметров.`;
    this.announce(message, 'assertive');
  }

  /**
   * Проверить базовую доступность страницы
   * @returns {{passed: boolean, issues: string[]}}
   */
  audit() {
    const issues = [];

    // Проверка: все изображения имеют alt
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length} изображений без атрибута alt`);
    }

    // Проверка: кнопки имеют текст или aria-label
    const buttonsWithoutLabel = document.querySelectorAll('button:not([aria-label]):empty');
    if (buttonsWithoutLabel.length > 0) {
      issues.push(`${buttonsWithoutLabel.length} кнопок без текста или aria-label`);
    }

    // Проверка: формы имеют labels
    const inputsWithoutLabel = document.querySelectorAll('input:not([aria-label]):not([id])');
    if (inputsWithoutLabel.length > 0) {
      issues.push(`${inputsWithoutLabel.length} полей ввода без label`);
    }

    // Проверка: есть основной контент landmark
    const mainLandmark = document.querySelector('main, [role="main"]');
    if (!mainLandmark) {
      issues.push('Отсутствует main landmark');
    }

    // Проверка: есть заголовок h1
    const h1 = document.querySelector('h1');
    if (!h1) {
      issues.push('Отсутствует заголовок h1');
    }

    // Проверка: lang атрибут на html
    const htmlLang = document.documentElement.getAttribute('lang');
    if (!htmlLang) {
      issues.push('Отсутствует атрибут lang на html');
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }
}

// Singleton
const a11y = new A11yManager();

/**
 * Короткая функция объявления
 * @param {string} message
 * @param {'polite'|'assertive'} [priority]
 */
function announce(message, priority) {
  a11y.announce(message, priority);
}

/**
 * Короткая функция trap focus
 * @param {HTMLElement} container
 * @returns {Function}
 */
function trapFocus(container) {
  return a11y.trapFocus(container);
}

// Автоинициализация при загрузке
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => a11y.init());
  } else {
    a11y.init();
  }
}

// Экспорты
export { a11y, announce, trapFocus, A11yManager };

// Глобальный доступ
if (typeof window !== 'undefined') {
  window.a11y = a11y;
  window.announce = announce;
}
