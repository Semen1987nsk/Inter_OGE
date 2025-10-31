// ============================================
// УТИЛИТЫ ДЛЯ ОПТИМИЗАЦИИ ПРОИЗВОДИТЕЛЬНОСТИ
// ============================================

/**
 * Throttle - ограничивает частоту вызова функции
 * Используется для событий, которые происходят очень часто (scroll, resize)
 * 
 * @param {Function} func - Функция для throttle
 * @param {number} delay - Минимальный интервал между вызовами (мс)
 * @returns {Function} - Throttled функция
 * 
 * @example
 * const handleScroll = throttle(() => {
 *     console.log('Scroll!');
 * }, 100);
 * window.addEventListener('scroll', handleScroll);
 */
export function throttle(func, delay = 100) {
    let lastCall = 0;
    let timeoutId = null;
    
    return function throttled(...args) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;
        
        // Если прошло достаточно времени - вызываем сразу
        if (timeSinceLastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        } else {
            // Иначе планируем вызов на оставшееся время
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                func.apply(this, args);
            }, delay - timeSinceLastCall);
        }
    };
}

/**
 * Debounce - откладывает вызов функции до завершения события
 * Используется когда нужен только последний результат (поиск, автосохранение)
 * 
 * @param {Function} func - Функция для debounce
 * @param {number} delay - Задержка после последнего события (мс)
 * @returns {Function} - Debounced функция
 * 
 * @example
 * const saveData = debounce(() => {
 *     console.log('Saving...');
 * }, 300);
 * input.addEventListener('input', saveData);
 */
export function debounce(func, delay = 300) {
    let timeoutId = null;
    
    return function debounced(...args) {
        // Отменяем предыдущий запланированный вызов
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        // Планируем новый вызов
        timeoutId = setTimeout(() => {
            func.apply(this, args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * RequestAnimationFrame throttle - синхронизирует с частотой обновления экрана
 * Идеален для анимаций и визуальных обновлений
 * 
 * @param {Function} func - Функция для RAF throttle
 * @returns {Function} - RAF throttled функция
 * 
 * @example
 * const updateAnimation = rafThrottle(() => {
 *     element.style.transform = `translateX(${x}px)`;
 * });
 * window.addEventListener('mousemove', updateAnimation);
 */
export function rafThrottle(func) {
    let rafId = null;
    let lastArgs = null;
    
    return function rafThrottled(...args) {
        lastArgs = args;
        
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                func.apply(this, lastArgs);
                rafId = null;
            });
        }
    };
}

/**
 * Passive event listener helper
 * Улучшает производительность scroll/touch событий
 * 
 * @param {Element} element - DOM элемент
 * @param {string} event - Название события
 * @param {Function} handler - Обработчик события
 * @param {Object} options - Дополнительные опции
 */
export function addPassiveListener(element, event, handler, options = {}) {
    // Проверка поддержки passive
    let supportsPassive = false;
    try {
        const opts = Object.defineProperty({}, 'passive', {
            get() {
                supportsPassive = true;
            }
        });
        window.addEventListener('test', null, opts);
        window.removeEventListener('test', null, opts);
    } catch (e) {
        supportsPassive = false;
    }
    
    // Добавляем passive: true для лучшей производительности
    const listenerOptions = supportsPassive 
        ? { passive: true, ...options }
        : false;
    
    element.addEventListener(event, handler, listenerOptions);
}

/**
 * Измеритель производительности (для дебага)
 * 
 * @param {string} label - Метка измерения
 * @returns {Function} - Функция для завершения измерения
 * 
 * @example
 * const endMeasure = measurePerformance('Heavy calculation');
 * // ... тяжёлые вычисления ...
 * endMeasure(); // Выведет время в консоль
 */
export function measurePerformance(label) {
    const startTime = performance.now();
    
    return function endMeasure() {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`⏱️ [${label}] ${duration.toFixed(2)}ms`);
        return duration;
    };
}

// ============================================
// ЭКСПОРТ ДЛЯ СОВМЕСТИМОСТИ
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        throttle,
        debounce,
        rafThrottle,
        addPassiveListener,
        measurePerformance
    };
}
