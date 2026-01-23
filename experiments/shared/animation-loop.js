/**
 * AnimationLoop - Оптимизированный анимационный цикл
 * 
 * @module AnimationLoop
 * @description Обёртка над requestAnimationFrame с:
 * - Автоматической остановкой при неактивной вкладке
 * - Фиксированным временем кадра (deltaTime capping)
 * - Интеграцией с Performance Monitor
 * - Throttling для экономии ресурсов
 * - Поддержкой паузы/возобновления
 * 
 * @example
 * import { AnimationLoop } from './shared/animation-loop.js';
 * 
 * const loop = new AnimationLoop((deltaTime, time) => {
 *     updatePhysics(deltaTime);
 *     render();
 * }, { targetFps: 60 });
 * 
 * loop.start();
 * // ...
 * loop.stop();
 */

/**
 * @typedef {Object} AnimationLoopOptions
 * @property {number} [targetFps=60] - Целевой FPS
 * @property {number} [maxDeltaTime=100] - Максимальный deltaTime (мс)
 * @property {boolean} [pauseOnHidden=true] - Пауза при скрытии вкладки
 * @property {boolean} [usePerformanceMonitor=false] - Использовать perfMonitor
 */

/**
 * @callback FrameCallback
 * @param {number} deltaTime - Время с прошлого кадра (мс)
 * @param {number} time - Текущее время анимации (мс)
 * @param {number} frameCount - Номер кадра
 */

/**
 * Оптимизированный анимационный цикл
 */
export class AnimationLoop {
    /**
     * Создаёт анимационный цикл
     * @param {FrameCallback} callback - Функция, вызываемая каждый кадр
     * @param {AnimationLoopOptions} [options] - Опции
     */
    constructor(callback, options = {}) {
        const {
            targetFps = 60,
            maxDeltaTime = 100,
            pauseOnHidden = true,
            usePerformanceMonitor = false
        } = options;

        /** @type {FrameCallback} */
        this.callback = callback;
        
        /** @type {number} Целевой FPS */
        this.targetFps = targetFps;
        
        /** @type {number} Минимальное время между кадрами (мс) */
        this.frameInterval = 1000 / targetFps;
        
        /** @type {number} Максимальный deltaTime для предотвращения скачков */
        this.maxDeltaTime = maxDeltaTime;
        
        /** @type {boolean} Пауза при скрытой вкладке */
        this.pauseOnHidden = pauseOnHidden;
        
        /** @type {boolean} Использовать Performance Monitor */
        this.usePerformanceMonitor = usePerformanceMonitor;
        
        /** @type {boolean} Запущен ли цикл */
        this.isRunning = false;
        
        /** @type {boolean} На паузе ли цикл */
        this.isPaused = false;
        
        /** @type {number|null} ID requestAnimationFrame */
        this.rafId = null;
        
        /** @type {number} Время последнего кадра */
        this.lastFrameTime = 0;
        
        /** @type {number} Счётчик кадров */
        this.frameCount = 0;
        
        /** @type {number} Накопленное время для throttling */
        this.accumulator = 0;
        
        // Привязываем методы
        this._tick = this._tick.bind(this);
        this._onVisibilityChange = this._onVisibilityChange.bind(this);
        
        // Слушатель видимости вкладки
        if (pauseOnHidden && typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this._onVisibilityChange);
        }
    }

    /**
     * Запустить анимационный цикл
     * @returns {this}
     */
    start() {
        if (this.isRunning) return this;
        
        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.accumulator = 0;
        
        this.rafId = requestAnimationFrame(this._tick);
        
        console.log('🎬 AnimationLoop started');
        return this;
    }

    /**
     * Остановить анимационный цикл
     * @returns {this}
     */
    stop() {
        if (!this.isRunning) return this;
        
        this.isRunning = false;
        
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        console.log('⏹️ AnimationLoop stopped');
        return this;
    }

    /**
     * Поставить на паузу
     * @returns {this}
     */
    pause() {
        if (!this.isRunning || this.isPaused) return this;
        
        this.isPaused = true;
        
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        console.log('⏸️ AnimationLoop paused');
        return this;
    }

    /**
     * Возобновить после паузы
     * @returns {this}
     */
    resume() {
        if (!this.isRunning || !this.isPaused) return this;
        
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        
        this.rafId = requestAnimationFrame(this._tick);
        
        console.log('▶️ AnimationLoop resumed');
        return this;
    }

    /**
     * Внутренний tick цикла
     * @private
     * @param {number} currentTime - Текущее время
     */
    _tick(currentTime) {
        if (!this.isRunning || this.isPaused) return;
        
        // Вычисляем deltaTime
        let deltaTime = currentTime - this.lastFrameTime;
        
        // Ограничиваем максимальный deltaTime
        // Это предотвращает "телепортацию" после долгой паузы
        if (deltaTime > this.maxDeltaTime) {
            deltaTime = this.maxDeltaTime;
        }
        
        // Throttling: пропускаем кадры если слишком быстро
        this.accumulator += deltaTime;
        
        if (this.accumulator >= this.frameInterval) {
            // Отслеживаем производительность
            if (this.usePerformanceMonitor && typeof window !== 'undefined' && window.perfMonitor) {
                window.perfMonitor.startMeasure('frame');
            }
            
            // Вызываем callback
            try {
                this.callback(deltaTime, currentTime, this.frameCount);
            } catch (err) {
                console.error('AnimationLoop callback error:', err);
                // Продолжаем работу, не останавливаем цикл
            }
            
            // Завершаем замер
            if (this.usePerformanceMonitor && typeof window !== 'undefined' && window.perfMonitor) {
                window.perfMonitor.endMeasure('frame');
            }
            
            this.frameCount++;
            this.accumulator -= this.frameInterval;
            
            // Сбрасываем accumulator если накопилось слишком много
            if (this.accumulator > this.frameInterval * 2) {
                this.accumulator = 0;
            }
        }
        
        this.lastFrameTime = currentTime;
        
        // Планируем следующий кадр
        this.rafId = requestAnimationFrame(this._tick);
    }

    /**
     * Обработчик изменения видимости вкладки
     * @private
     */
    _onVisibilityChange() {
        if (!this.pauseOnHidden) return;
        
        if (document.hidden) {
            if (this.isRunning && !this.isPaused) {
                this._wasRunningBeforeHidden = true;
                this.pause();
                console.log('🔇 Tab hidden, animation paused');
            }
        } else {
            if (this._wasRunningBeforeHidden) {
                this._wasRunningBeforeHidden = false;
                this.resume();
                console.log('🔈 Tab visible, animation resumed');
            }
        }
    }

    /**
     * Установить целевой FPS
     * @param {number} fps - Новый целевой FPS
     * @returns {this}
     */
    setTargetFps(fps) {
        this.targetFps = fps;
        this.frameInterval = 1000 / fps;
        return this;
    }

    /**
     * Получить текущую статистику
     * @returns {{isRunning: boolean, isPaused: boolean, frameCount: number, fps: number}}
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            frameCount: this.frameCount,
            targetFps: this.targetFps
        };
    }

    /**
     * Очистка при уничтожении
     */
    destroy() {
        this.stop();
        
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this._onVisibilityChange);
        }
    }
}

/**
 * Создать throttled версию функции для анимации
 * Выполняется не чаще чем раз в указанный интервал
 * 
 * @param {Function} fn - Функция для throttle
 * @param {number} [interval=16] - Минимальный интервал (мс), по умолчанию ~60fps
 * @returns {Function} Throttled функция
 */
export function throttleAnimation(fn, interval = 16) {
    let lastCall = 0;
    let rafId = null;
    
    return function(...args) {
        const now = performance.now();
        const timeSinceLastCall = now - lastCall;
        
        if (timeSinceLastCall >= interval) {
            lastCall = now;
            fn.apply(this, args);
        } else if (!rafId) {
            // Отложенный вызов
            rafId = requestAnimationFrame(() => {
                lastCall = performance.now();
                rafId = null;
                fn.apply(this, args);
            });
        }
    };
}

/**
 * Debounce для анимации - вызывает функцию после паузы
 * 
 * @param {Function} fn - Функция
 * @param {number} [wait=16] - Время ожидания (мс)
 * @returns {Function} Debounced функция
 */
export function debounceAnimation(fn, wait = 16) {
    let rafId = null;
    let timeoutId = null;
    
    return function(...args) {
        if (rafId) cancelAnimationFrame(rafId);
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            rafId = requestAnimationFrame(() => {
                fn.apply(this, args);
            });
        }, wait);
    };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.AnimationLoop = AnimationLoop;
    window.throttleAnimation = throttleAnimation;
    window.debounceAnimation = debounceAnimation;
}
