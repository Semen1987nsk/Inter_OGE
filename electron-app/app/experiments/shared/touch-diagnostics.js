/**
 * Touch Diagnostics Module
 * Диагностика проблем с touch events на интерактивных панелях
 */

class TouchDiagnostics {
    constructor() {
        this.events = [];
        this.maxEvents = 50;
        this.enabled = false;
        this.overlay = null;
        this.touchPoints = new Map(); // Отслеживание активных касаний
        
        console.log('[TOUCH-DIAG] Модуль диагностики touch events загружен');
    }
    
    /**
     * Включить диагностику
     */
    enable() {
        this.enabled = true;
        this.createOverlay();
        this.attachListeners();
        console.log('[TOUCH-DIAG] ✅ Диагностика ВКЛЮЧЕНА');
    }
    
    /**
     * Выключить диагностику
     */
    disable() {
        this.enabled = false;
        this.removeOverlay();
        this.detachListeners();
        console.log('[TOUCH-DIAG] ❌ Диагностика ВЫКЛЮЧЕНА');
    }
    
    /**
     * Переключить режим диагностики
     */
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
    
    /**
     * Создать оверлей для визуализации
     */
    createOverlay() {
        if (this.overlay) return;
        
        this.overlay = document.createElement('div');
        this.overlay.id = 'touch-diagnostics-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 350px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.95);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            padding: 10px;
            border: 2px solid #0f0;
            border-radius: 8px;
            z-index: 99999;
            overflow-y: auto;
            pointer-events: none;
        `;
        
        this.overlay.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #0ff;">
                🔍 TOUCH DIAGNOSTICS
            </div>
            <div id="touch-diag-content"></div>
        `;
        
        document.body.appendChild(this.overlay);
    }
    
    /**
     * Удалить оверлей
     */
    removeOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
    
    /**
     * Добавить событие в лог
     */
    logEvent(type, data) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toLocaleTimeString('ru-RU', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3
        });
        
        const event = {
            timestamp,
            type,
            ...data
        };
        
        this.events.unshift(event);
        if (this.events.length > this.maxEvents) {
            this.events.pop();
        }
        
        this.updateDisplay();
    }
    
    /**
     * Обновить отображение
     */
    updateDisplay() {
        if (!this.overlay) return;
        
        const content = document.getElementById('touch-diag-content');
        if (!content) return;
        
        let html = '';
        
        // Активные касания
        if (this.touchPoints.size > 0) {
            html += `<div style="color: #ff0; margin-bottom: 8px;">
                <strong>⚡ Активные касания: ${this.touchPoints.size}</strong>
            </div>`;
            
            this.touchPoints.forEach((point, id) => {
                html += `<div style="color: #ff0; margin-left: 10px; font-size: 10px;">
                    Touch #${id}: (${point.x.toFixed(0)}, ${point.y.toFixed(0)})
                </div>`;
            });
            
            html += '<div style="border-bottom: 1px solid #0f0; margin: 8px 0;"></div>';
        }
        
        // История событий
        html += this.events.map((e, i) => {
            let color = '#0f0';
            let icon = '●';
            
            if (e.type.includes('touchstart')) {
                color = '#0ff';
                icon = '▶';
            } else if (e.type.includes('touchend') || e.type.includes('touchcancel')) {
                color = '#f80';
                icon = '■';
            } else if (e.type.includes('touchmove')) {
                color = '#ff0';
                icon = '→';
            } else if (e.type.includes('mouse')) {
                color = '#f0f';
                icon = '◆';
            } else if (e.type.includes('pointer')) {
                color = '#0af';
                icon = '◉';
            }
            
            let details = '';
            if (e.x !== undefined && e.y !== undefined) {
                details = ` @ (${e.x.toFixed(0)}, ${e.y.toFixed(0)})`;
            }
            if (e.touches !== undefined) {
                details += ` [${e.touches} касаний]`;
            }
            if (e.target) {
                details += ` → ${e.target}`;
            }
            if (e.preventDefault) {
                details += ` <span style="color: #f00;">PREVENTED</span>`;
            }
            if (e.message) {
                details += ` | ${e.message}`;
            }
            
            return `<div style="color: ${color}; margin: 2px 0; opacity: ${1 - i * 0.015};">
                <span style="color: ${color};">${icon}</span> 
                <span style="color: #888;">${e.timestamp}</span> 
                <strong>${e.type}</strong>${details}
            </div>`;
        }).join('');
        
        content.innerHTML = html;
    }
    
    /**
     * Подключить слушатели событий
     */
    attachListeners() {
        // Touch events
        document.addEventListener('touchstart', this.handleTouchStart, { passive: false, capture: true });
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false, capture: true });
        document.addEventListener('touchend', this.handleTouchEnd, { passive: false, capture: true });
        document.addEventListener('touchcancel', this.handleTouchCancel, { passive: false, capture: true });
        
        // Mouse events (для сравнения)
        document.addEventListener('mousedown', this.handleMouseDown, { capture: true });
        document.addEventListener('mousemove', this.handleMouseMove, { capture: true });
        document.addEventListener('mouseup', this.handleMouseUp, { capture: true });
        
        // Pointer events
        document.addEventListener('pointerdown', this.handlePointerDown, { capture: true });
        document.addEventListener('pointermove', this.handlePointerMove, { capture: true });
        document.addEventListener('pointerup', this.handlePointerUp, { capture: true });
        document.addEventListener('pointercancel', this.handlePointerCancel, { capture: true });
        
        console.log('[TOUCH-DIAG] ✅ Слушатели событий подключены');
    }
    
    /**
     * Отключить слушатели событий
     */
    detachListeners() {
        document.removeEventListener('touchstart', this.handleTouchStart, { capture: true });
        document.removeEventListener('touchmove', this.handleTouchMove, { capture: true });
        document.removeEventListener('touchend', this.handleTouchEnd, { capture: true });
        document.removeEventListener('touchcancel', this.handleTouchCancel, { capture: true });
        
        document.removeEventListener('mousedown', this.handleMouseDown, { capture: true });
        document.removeEventListener('mousemove', this.handleMouseMove, { capture: true });
        document.removeEventListener('mouseup', this.handleMouseUp, { capture: true });
        
        document.removeEventListener('pointerdown', this.handlePointerDown, { capture: true });
        document.removeEventListener('pointermove', this.handlePointerMove, { capture: true });
        document.removeEventListener('pointerup', this.handlePointerUp, { capture: true });
        document.removeEventListener('pointercancel', this.handlePointerCancel, { capture: true });
        
        console.log('[TOUCH-DIAG] ❌ Слушатели событий отключены');
    }
    
    // === Touch Event Handlers ===
    
    handleTouchStart = (e) => {
        const touch = e.touches[0];
        const target = e.target.className || e.target.tagName;
        
        // Отслеживаем все касания
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            this.touchPoints.set(t.identifier, {
                x: t.clientX,
                y: t.clientY,
                startTime: Date.now()
            });
        }
        
        this.logEvent('touchstart', {
            x: touch.clientX,
            y: touch.clientY,
            touches: e.touches.length,
            target: target,
            preventDefault: e.defaultPrevented
        });
    }
    
    handleTouchMove = (e) => {
        const touch = e.touches[0];
        const target = e.target.className || e.target.tagName;
        
        // Обновляем позиции
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            if (this.touchPoints.has(t.identifier)) {
                this.touchPoints.set(t.identifier, {
                    x: t.clientX,
                    y: t.clientY,
                    startTime: this.touchPoints.get(t.identifier).startTime
                });
            }
        }
        
        this.logEvent('touchmove', {
            x: touch.clientX,
            y: touch.clientY,
            touches: e.touches.length,
            target: target,
            preventDefault: e.defaultPrevented
        });
    }
    
    handleTouchEnd = (e) => {
        const touch = e.changedTouches[0];
        const target = e.target.className || e.target.tagName;
        
        // Удаляем завершённые касания
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const point = this.touchPoints.get(t.identifier);
            const duration = point ? Date.now() - point.startTime : 0;
            
            this.logEvent('touchend', {
                x: t.clientX,
                y: t.clientY,
                touches: e.touches.length,
                target: target,
                preventDefault: e.defaultPrevented,
                message: `Duration: ${duration}ms`
            });
            
            this.touchPoints.delete(t.identifier);
        }
    }
    
    handleTouchCancel = (e) => {
        const touch = e.changedTouches[0];
        const target = e.target.className || e.target.tagName;
        
        // Удаляем отменённые касания
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            this.touchPoints.delete(t.identifier);
        }
        
        this.logEvent('touchcancel ⚠️', {
            x: touch.clientX,
            y: touch.clientY,
            touches: e.touches.length,
            target: target,
            preventDefault: e.defaultPrevented,
            message: 'КАСАНИЕ ОТМЕНЕНО!'
        });
    }
    
    // === Mouse Event Handlers ===
    
    handleMouseDown = (e) => {
        const target = e.target.className || e.target.tagName;
        this.logEvent('mousedown', {
            x: e.clientX,
            y: e.clientY,
            target: target,
            button: e.button
        });
    }
    
    handleMouseMove = (e) => {
        // Логируем только если кнопка нажата
        if (e.buttons > 0) {
            const target = e.target.className || e.target.tagName;
            this.logEvent('mousemove', {
                x: e.clientX,
                y: e.clientY,
                target: target
            });
        }
    }
    
    handleMouseUp = (e) => {
        const target = e.target.className || e.target.tagName;
        this.logEvent('mouseup', {
            x: e.clientX,
            y: e.clientY,
            target: target,
            button: e.button
        });
    }
    
    // === Pointer Event Handlers ===
    
    handlePointerDown = (e) => {
        const target = e.target.className || e.target.tagName;
        this.logEvent('pointerdown', {
            x: e.clientX,
            y: e.clientY,
            target: target,
            pointerType: e.pointerType,
            message: `Type: ${e.pointerType}`
        });
    }
    
    handlePointerMove = (e) => {
        // Логируем только активные движения
        if (e.buttons > 0) {
            const target = e.target.className || e.target.tagName;
            this.logEvent('pointermove', {
                x: e.clientX,
                y: e.clientY,
                target: target,
                pointerType: e.pointerType
            });
        }
    }
    
    handlePointerUp = (e) => {
        const target = e.target.className || e.target.tagName;
        this.logEvent('pointerup', {
            x: e.clientX,
            y: e.clientY,
            target: target,
            pointerType: e.pointerType
        });
    }
    
    handlePointerCancel = (e) => {
        const target = e.target.className || e.target.tagName;
        this.logEvent('pointercancel ⚠️', {
            x: e.clientX,
            y: e.clientY,
            target: target,
            pointerType: e.pointerType,
            message: 'POINTER ОТМЕНЁН!'
        });
    }
}

// Создаём глобальный экземпляр
window.touchDiag = new TouchDiagnostics();

// Добавляем горячую клавишу для включения/выключения (Ctrl+Shift+D)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        window.touchDiag.toggle();
    }
});

console.log('[TOUCH-DIAG] ✅ Модуль загружен. Нажмите Ctrl+Shift+D для включения диагностики');
console.log('[TOUCH-DIAG] Или используйте: window.touchDiag.enable()');
