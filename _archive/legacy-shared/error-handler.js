/**
 * ErrorHandler - Централизованная обработка ошибок
 * 
 * @module ErrorHandler
 * @description Единый паттерн обработки ошибок для всех экспериментов.
 * Логирует ошибки, показывает уведомления пользователю,
 * отслеживает частоту ошибок для мониторинга.
 * 
 * @example
 * import { errorHandler, safeCall } from './shared/error-handler.js';
 * 
 * // Использование напрямую
 * try {
 *     riskyOperation();
 * } catch (err) {
 *     errorHandler.handle(err, 'RiskyOperation', 'critical');
 * }
 * 
 * // Использование обёртки
 * const result = safeCall(() => riskyOperation(), 'RiskyOperation', defaultValue);
 */

/**
 * @typedef {'info'|'warning'|'error'|'critical'} ErrorLevel
 */

/**
 * @typedef {Object} ErrorRecord
 * @property {Date} timestamp - Время ошибки
 * @property {string} context - Контекст/модуль
 * @property {string} message - Сообщение ошибки
 * @property {ErrorLevel} level - Уровень ошибки
 * @property {string} [stack] - Stack trace
 */

/**
 * Класс централизованной обработки ошибок
 */
class ErrorHandler {
    constructor() {
        /** @type {ErrorRecord[]} История ошибок */
        this.errorLog = [];
        
        /** @type {number} Максимальный размер лога */
        this.maxLogSize = 100;
        
        /** @type {boolean} Показывать ли UI уведомления */
        this.showNotifications = true;
        
        /** @type {boolean} Режим разработки (больше информации) */
        this.devMode = typeof process !== 'undefined' 
            ? process.env?.NODE_ENV === 'development'
            : window?.location?.hostname === 'localhost';
        
        // Привязываем глобальные обработчики
        this.setupGlobalHandlers();
    }

    /**
     * Настройка глобальных обработчиков ошибок
     * @private
     */
    setupGlobalHandlers() {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handle(event.error || new Error(event.message), 'Global', 'error');
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                const error = event.reason instanceof Error 
                    ? event.reason 
                    : new Error(String(event.reason));
                this.handle(error, 'UnhandledPromise', 'error');
            });
        }
    }

    /**
     * Обработать ошибку
     * @param {Error|string} error - Ошибка или сообщение
     * @param {string} [context='Unknown'] - Контекст/модуль где произошла ошибка
     * @param {ErrorLevel} [level='error'] - Уровень серьёзности
     * @returns {void}
     */
    handle(error, context = 'Unknown', level = 'error') {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        /** @type {ErrorRecord} */
        const record = {
            timestamp: new Date(),
            context,
            message: errorObj.message,
            level,
            stack: this.devMode ? errorObj.stack : undefined
        };
        
        // Добавляем в лог с ротацией
        this.errorLog.push(record);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
        
        // Логируем в консоль
        this.logToConsole(record);
        
        // Показываем уведомление для critical и error
        if (this.showNotifications && (level === 'critical' || level === 'error')) {
            this.showNotification(record);
        }
    }

    /**
     * Логирование в консоль с форматированием
     * @private
     * @param {ErrorRecord} record - Запись об ошибке
     */
    logToConsole(record) {
        const prefix = `[${record.context}]`;
        const timestamp = record.timestamp.toISOString();
        
        switch (record.level) {
            case 'critical':
                console.error(`🔴 ${prefix} CRITICAL:`, record.message);
                if (record.stack) console.error(record.stack);
                break;
            case 'error':
                console.error(`❌ ${prefix}`, record.message);
                if (record.stack && this.devMode) console.error(record.stack);
                break;
            case 'warning':
                console.warn(`⚠️ ${prefix}`, record.message);
                break;
            case 'info':
                console.info(`ℹ️ ${prefix}`, record.message);
                break;
        }
    }

    /**
     * Показать UI уведомление пользователю
     * @private
     * @param {ErrorRecord} record - Запись об ошибке
     */
    showNotification(record) {
        // Проверяем наличие toast контейнера или создаём его
        let container = document.getElementById('error-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'error-toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `error-toast error-toast-${record.level}`;
        toast.style.cssText = `
            padding: 12px 16px;
            border-radius: 8px;
            background: ${record.level === 'critical' ? '#dc2626' : '#ef4444'};
            color: white;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
        `;
        
        const icon = record.level === 'critical' ? '🔴' : '❌';
        toast.innerHTML = `
            <strong>${icon} ${record.context}</strong><br>
            <span>${record.message}</span>
        `;
        
        toast.onclick = () => toast.remove();
        container.appendChild(toast);
        
        // Автоудаление через 5 секунд
        setTimeout(() => toast.remove(), 5000);
    }

    /**
     * Получить последние N ошибок
     * @param {number} [count=10] - Количество записей
     * @returns {ErrorRecord[]} Массив последних ошибок
     */
    getRecentErrors(count = 10) {
        return this.errorLog.slice(-count);
    }

    /**
     * Получить статистику ошибок
     * @returns {{total: number, byLevel: Object<ErrorLevel, number>, byContext: Object<string, number>}}
     */
    getStats() {
        const byLevel = { info: 0, warning: 0, error: 0, critical: 0 };
        const byContext = {};
        
        this.errorLog.forEach(record => {
            byLevel[record.level]++;
            byContext[record.context] = (byContext[record.context] || 0) + 1;
        });
        
        return {
            total: this.errorLog.length,
            byLevel,
            byContext
        };
    }

    /**
     * Очистить лог ошибок
     * @returns {void}
     */
    clearLog() {
        this.errorLog = [];
    }
}

// Singleton экземпляр
const errorHandler = new ErrorHandler();

/**
 * Безопасный вызов функции с обработкой ошибок
 * @template T
 * @param {() => T} fn - Функция для вызова
 * @param {string} [context='SafeCall'] - Контекст для логирования
 * @param {T} [defaultValue] - Значение по умолчанию при ошибке
 * @returns {T} Результат функции или defaultValue
 */
function safeCall(fn, context = 'SafeCall', defaultValue = undefined) {
    try {
        return fn();
    } catch (err) {
        errorHandler.handle(err, context, 'error');
        return defaultValue;
    }
}

/**
 * Безопасный асинхронный вызов
 * @template T
 * @param {() => Promise<T>} fn - Асинхронная функция
 * @param {string} [context='SafeAsync'] - Контекст
 * @param {T} [defaultValue] - Значение по умолчанию
 * @returns {Promise<T>}
 */
async function safeAsync(fn, context = 'SafeAsync', defaultValue = undefined) {
    try {
        return await fn();
    } catch (err) {
        errorHandler.handle(err, context, 'error');
        return defaultValue;
    }
}

/**
 * Декоратор для методов класса - оборачивает в try-catch
 * @param {string} [context] - Контекст для ошибок
 * @returns {MethodDecorator}
 */
function handleErrors(context) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const methodContext = context || `${target.constructor.name}.${propertyKey}`;
        
        descriptor.value = function(...args) {
            try {
                const result = originalMethod.apply(this, args);
                if (result instanceof Promise) {
                    return result.catch(err => {
                        errorHandler.handle(err, methodContext, 'error');
                        return undefined;
                    });
                }
                return result;
            } catch (err) {
                errorHandler.handle(err, methodContext, 'error');
                return undefined;
            }
        };
        
        return descriptor;
    };
}

// CSS для анимации toast
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// Экспорты
export { errorHandler, safeCall, safeAsync, handleErrors, ErrorHandler };

// Глобальный доступ для браузера
if (typeof window !== 'undefined') {
    window.errorHandler = errorHandler;
    window.safeCall = safeCall;
    window.safeAsync = safeAsync;
}
