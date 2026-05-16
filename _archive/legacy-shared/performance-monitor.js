/**
 * PerformanceMonitor - Мониторинг производительности для touch-интерактивов
 * 
 * @module PerformanceMonitor
 * @description Отслеживает FPS, латентность touch-событий, 
 * время рендеринга и использование памяти. 
 * Показывает overlay с метриками в режиме разработки.
 * 
 * @example
 * import { perfMonitor } from './shared/performance-monitor.js';
 * 
 * perfMonitor.enable();
 * 
 * // Измерение времени операции
 * perfMonitor.startMeasure('render');
 * doRender();
 * perfMonitor.endMeasure('render');
 * 
 * // В touchstart
 * perfMonitor.trackTouchStart();
 * // В обработке
 * perfMonitor.trackTouchEnd();
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} fps - Текущий FPS
 * @property {number} avgFps - Средний FPS за последние N кадров
 * @property {number} touchLatency - Латентность touch в мс
 * @property {number} avgTouchLatency - Средняя латентность touch
 * @property {number} memoryUsed - Использованная память (MB)
 * @property {number} memoryLimit - Лимит памяти (MB)
 * @property {Object<string, number>} customMeasures - Пользовательские замеры
 */

/**
 * Класс мониторинга производительности
 */
class PerformanceMonitor {
    constructor() {
        /** @type {boolean} Активен ли монитор */
        this.enabled = false;
        
        /** @type {HTMLElement|null} Overlay элемент */
        this.overlay = null;
        
        // FPS tracking
        /** @type {number} Последнее время кадра */
        this.lastFrameTime = 0;
        /** @type {number[]} История FPS (последние 60 значений) */
        this.fpsHistory = [];
        /** @type {number} Текущий FPS */
        this.currentFps = 0;
        
        // Touch latency tracking
        /** @type {number} Время начала touch */
        this.touchStartTime = 0;
        /** @type {number[]} История латентности */
        this.touchLatencyHistory = [];
        /** @type {number} Последняя латентность */
        this.lastTouchLatency = 0;
        
        // Custom measures
        /** @type {Object<string, number>} Время начала замеров */
        this.measureStarts = {};
        /** @type {Object<string, number[]>} История замеров */
        this.measureHistory = {};
        
        // RAF ID для отмены
        /** @type {number|null} */
        this.rafId = null;
        
        // Порог предупреждения FPS
        /** @type {number} */
        this.fpsWarningThreshold = 30;
        
        // Порог предупреждения латентности (мс)
        /** @type {number} */
        this.latencyWarningThreshold = 100;
    }

    /**
     * Включить мониторинг
     * @param {Object} [options] - Опции
     * @param {boolean} [options.showOverlay=true] - Показывать overlay
     * @param {string} [options.position='top-left'] - Позиция overlay
     * @returns {void}
     */
    enable(options = {}) {
        const { showOverlay = true, position = 'top-left' } = options;
        
        this.enabled = true;
        
        if (showOverlay && typeof document !== 'undefined') {
            this.createOverlay(position);
        }
        
        this.startTracking();
        console.log('📊 Performance Monitor enabled');
    }

    /**
     * Отключить мониторинг
     * @returns {void}
     */
    disable() {
        this.enabled = false;
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        console.log('📊 Performance Monitor disabled');
    }

    /**
     * Создать overlay для отображения метрик
     * @private
     * @param {string} position - Позиция (top-left, top-right, bottom-left, bottom-right)
     */
    createOverlay(position) {
        if (this.overlay) return;
        
        this.overlay = document.createElement('div');
        this.overlay.id = 'perf-monitor-overlay';
        
        const positions = {
            'top-left': 'top: 10px; left: 10px;',
            'top-right': 'top: 10px; right: 10px;',
            'bottom-left': 'bottom: 10px; left: 10px;',
            'bottom-right': 'bottom: 10px; right: 10px;'
        };
        
        this.overlay.style.cssText = `
            position: fixed;
            ${positions[position] || positions['top-left']}
            z-index: 99999;
            background: rgba(0, 0, 0, 0.85);
            color: #00ff00;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            padding: 10px 14px;
            border-radius: 6px;
            min-width: 180px;
            pointer-events: none;
            line-height: 1.5;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        `;
        
        document.body.appendChild(this.overlay);
    }

    /**
     * Начать отслеживание FPS
     * @private
     */
    startTracking() {
        const track = (timestamp) => {
            if (!this.enabled) return;
            
            // Вычисляем FPS
            if (this.lastFrameTime) {
                const delta = timestamp - this.lastFrameTime;
                this.currentFps = Math.round(1000 / delta);
                
                this.fpsHistory.push(this.currentFps);
                if (this.fpsHistory.length > 60) {
                    this.fpsHistory.shift();
                }
            }
            this.lastFrameTime = timestamp;
            
            // Обновляем overlay
            this.updateOverlay();
            
            this.rafId = requestAnimationFrame(track);
        };
        
        this.rafId = requestAnimationFrame(track);
    }

    /**
     * Отметить начало touch-события
     * @returns {void}
     */
    trackTouchStart() {
        this.touchStartTime = performance.now();
    }

    /**
     * Отметить окончание обработки touch
     * @returns {number} Латентность в мс
     */
    trackTouchEnd() {
        if (!this.touchStartTime) return 0;
        
        const latency = performance.now() - this.touchStartTime;
        this.lastTouchLatency = latency;
        
        this.touchLatencyHistory.push(latency);
        if (this.touchLatencyHistory.length > 30) {
            this.touchLatencyHistory.shift();
        }
        
        this.touchStartTime = 0;
        return latency;
    }

    /**
     * Начать пользовательский замер
     * @param {string} name - Имя замера
     */
    startMeasure(name) {
        this.measureStarts[name] = performance.now();
    }

    /**
     * Завершить пользовательский замер
     * @param {string} name - Имя замера
     * @returns {number} Время выполнения в мс
     */
    endMeasure(name) {
        const start = this.measureStarts[name];
        if (!start) return 0;
        
        const duration = performance.now() - start;
        delete this.measureStarts[name];
        
        if (!this.measureHistory[name]) {
            this.measureHistory[name] = [];
        }
        this.measureHistory[name].push(duration);
        if (this.measureHistory[name].length > 30) {
            this.measureHistory[name].shift();
        }
        
        return duration;
    }

    /**
     * Обновить overlay с метриками
     * @private
     */
    updateOverlay() {
        if (!this.overlay) return;
        
        const avgFps = this.getAverageFps();
        const avgLatency = this.getAverageTouchLatency();
        const memory = this.getMemoryUsage();
        
        // Определяем цвета по порогам
        const fpsColor = avgFps >= 55 ? '#00ff00' : (avgFps >= this.fpsWarningThreshold ? '#ffff00' : '#ff4444');
        const latencyColor = avgLatency <= 16 ? '#00ff00' : (avgLatency <= this.latencyWarningThreshold ? '#ffff00' : '#ff4444');
        
        let html = `
            <div style="color: ${fpsColor}">FPS: ${this.currentFps} (avg: ${avgFps})</div>
        `;
        
        if (this.touchLatencyHistory.length > 0) {
            html += `<div style="color: ${latencyColor}">Touch: ${this.lastTouchLatency.toFixed(1)}ms (avg: ${avgLatency.toFixed(1)}ms)</div>`;
        }
        
        if (memory) {
            const memPercent = ((memory.used / memory.limit) * 100).toFixed(0);
            const memColor = memPercent < 50 ? '#00ff00' : (memPercent < 80 ? '#ffff00' : '#ff4444');
            html += `<div style="color: ${memColor}">Memory: ${memory.used.toFixed(1)}MB / ${memory.limit.toFixed(0)}MB (${memPercent}%)</div>`;
        }
        
        // Пользовательские замеры
        for (const [name, history] of Object.entries(this.measureHistory)) {
            if (history.length > 0) {
                const avg = history.reduce((a, b) => a + b, 0) / history.length;
                html += `<div style="color: #88aaff">${name}: ${avg.toFixed(2)}ms</div>`;
            }
        }
        
        this.overlay.innerHTML = html;
    }

    /**
     * Получить средний FPS
     * @returns {number}
     */
    getAverageFps() {
        if (this.fpsHistory.length === 0) return 0;
        return Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
    }

    /**
     * Получить среднюю латентность touch
     * @returns {number}
     */
    getAverageTouchLatency() {
        if (this.touchLatencyHistory.length === 0) return 0;
        return this.touchLatencyHistory.reduce((a, b) => a + b, 0) / this.touchLatencyHistory.length;
    }

    /**
     * Получить использование памяти (если доступно)
     * @returns {{used: number, limit: number}|null}
     */
    getMemoryUsage() {
        // @ts-ignore - performance.memory нестандартный API
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                // @ts-ignore
                used: performance.memory.usedJSHeapSize / 1048576,
                // @ts-ignore
                limit: performance.memory.jsHeapSizeLimit / 1048576
            };
        }
        return null;
    }

    /**
     * Получить все текущие метрики
     * @returns {PerformanceMetrics}
     */
    getMetrics() {
        const memory = this.getMemoryUsage();
        const customMeasures = {};
        
        for (const [name, history] of Object.entries(this.measureHistory)) {
            if (history.length > 0) {
                customMeasures[name] = history.reduce((a, b) => a + b, 0) / history.length;
            }
        }
        
        return {
            fps: this.currentFps,
            avgFps: this.getAverageFps(),
            touchLatency: this.lastTouchLatency,
            avgTouchLatency: this.getAverageTouchLatency(),
            memoryUsed: memory?.used || 0,
            memoryLimit: memory?.limit || 0,
            customMeasures
        };
    }

    /**
     * Сбросить все метрики
     * @returns {void}
     */
    reset() {
        this.fpsHistory = [];
        this.touchLatencyHistory = [];
        this.measureHistory = {};
        this.measureStarts = {};
        this.lastTouchLatency = 0;
        this.currentFps = 0;
    }

    /**
     * Проверить, есть ли проблемы с производительностью
     * @returns {{hasIssues: boolean, issues: string[]}}
     */
    checkPerformance() {
        const issues = [];
        
        const avgFps = this.getAverageFps();
        if (avgFps > 0 && avgFps < this.fpsWarningThreshold) {
            issues.push(`Low FPS: ${avgFps} (threshold: ${this.fpsWarningThreshold})`);
        }
        
        const avgLatency = this.getAverageTouchLatency();
        if (avgLatency > this.latencyWarningThreshold) {
            issues.push(`High touch latency: ${avgLatency.toFixed(1)}ms (threshold: ${this.latencyWarningThreshold}ms)`);
        }
        
        const memory = this.getMemoryUsage();
        if (memory && (memory.used / memory.limit) > 0.8) {
            issues.push(`High memory usage: ${(memory.used / memory.limit * 100).toFixed(0)}%`);
        }
        
        return { hasIssues: issues.length > 0, issues };
    }
}

// Singleton экземпляр
const perfMonitor = new PerformanceMonitor();

// Экспорты
export { perfMonitor, PerformanceMonitor };

// Глобальный доступ для браузера
if (typeof window !== 'undefined') {
    window.perfMonitor = perfMonitor;
}
