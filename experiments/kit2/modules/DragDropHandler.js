/**
 * DragDropHandler - Обработка Drag & Drop для лабораторной работы
 * 
 * @module DragDropHandler
 * @description Модуль для обработки перетаскивания грузов и оборудования
 * с использованием interact.js. Поддерживает touch-устройства.
 * 
 * @example
 * const handler = new DragDropHandler(experiment);
 * handler.init();
 * // Грузы и оборудование теперь можно перетаскивать
 */

/**
 * @typedef {Object} DragEvent
 * @property {HTMLElement} target - Перетаскиваемый элемент
 * @property {string} type - Тип события
 * @property {number} clientX - X координата
 * @property {number} clientY - Y координата
 */

export class DragDropHandler {
    /**
     * Создаёт обработчик Drag & Drop
     * @param {Object} experiment - Ссылка на главный эксперимент
     */
    constructor(experiment) {
        /** @type {Object} Ссылка на эксперимент */
        this.experiment = experiment;
        
        /** @type {Function|null} Функция для переинициализации drag sources */
        this.reinitDragSources = null;
        
        /** @type {HTMLElement|null} Ghost-элемент при перетаскивании */
        this.dragGhost = null;
        
        /** @type {boolean} Идёт ли перетаскивание */
        this.isDragging = false;
    }

    /**
     * Инициализация drag & drop с interact.js
     * Настраивает touch-поддержку и tolerance
     * @returns {void}
     * @throws {Error} Если interact.js недоступен
     */
    init() {
        if (typeof interact === 'undefined') {
            console.error('[DRAG] interact.js недоступен');
            return;
        }

        console.log('[DRAG] Настройка touch поддержки для Interact.js');
        console.log('[DRAG] Touch support:', 'ontouchstart' in window);
        
        interact.pointerMoveTolerance(5);
        interact.dynamicDrop(true);

        this.setupDraggables();
        this.setupDropzone();
    }

    /**
     * Настройка draggable элементов (.weight-item и .equipment-item)
     * @private
     * @returns {void}
     */
    setupDraggables() {
        const initDraggables = () => {
            interact('.weight-item').unset?.();
            interact('.equipment-item').unset?.();

            interact('.weight-item').draggable({
                inertia: false,
                autoScroll: true,
                manualStart: false,
                hold: 0,
                allowFrom: null,
                ignoreFrom: null,
                cursorChecker: null,
                listeners: {
                    start: (event) => this.onDragStart(event),
                    move: (event) => this.onDragMove(event),
                    end: (event) => this.onDragEnd(event)
                }
            });

            interact('.equipment-item').draggable({
                inertia: true,
                autoScroll: true,
                manualStart: false,
                hold: 0,
                allowFrom: null,
                ignoreFrom: null,
                cursorChecker: null,
                listeners: {
                    start: (event) => this.onDragStart(event),
                    move: (event) => this.onDragMove(event),
                    end: (event) => this.onDragEnd(event)
                }
            });
        };

        initDraggables();
        this.reinitDragSources = initDraggables;
    }

    /**
     * Настройка dropzone
     */
    setupDropzone() {
        const overlay = document.getElementById('drag-drop-overlay');
        if (!overlay) {
            console.error('❌ drag-drop-overlay не найден');
            return;
        }

        interact('#drag-drop-overlay').unset?.();

        interact('#drag-drop-overlay').dropzone({
            accept: '.weight-item, .equipment-item',
            overlap: 0.1,
            checker: null,
            ondrop: (event) => {
                console.log('[DROPZONE] ondrop вызван!');
                this.experiment.handleCanvasDrop(event);
            },
            ondropactivate: (event) => {
                const weightId = event.relatedTarget?.dataset?.weightId || 'unknown';
                console.log('[DROPZONE] Drop активирован для', weightId);
            },
            ondragenter: (event) => {
                if (event.relatedTarget?.dataset) {
                    event.relatedTarget.dataset.wasDropped = 'true';
                }
            },
            ondropdeactivate: () => {}
        });
    }

    /**
     * Обработчик начала перетаскивания
     */
    onDragStart(event) {
        console.log('[DRAG-START] Event type:', event.type, 
                    'Target:', event.target.dataset.weightId || event.target.dataset.equipmentId);
        
        const type = event.target.dataset.type || 'weight';
        const state = this.experiment.state;
        
        // Проверка: груз уже использован?
        if (type === 'weight') {
            const weightId = event.target.dataset.weightId;
            if (state.usedWeightIds.has(weightId) || state.selectedWeights.has(weightId)) {
                console.log('[DRAG] ⛔ Груз уже использован:', weightId);
                event.interaction?.stop();
                return false;
            }
        }
        
        this.isDragging = true;
        event.target.classList.add('dragging');
        event.target.style.transition = 'none';
        event.target.style.opacity = '0.6';
        event.target.style.zIndex = '1000';
        
        // Создаём призрак
        this.createGhost(event.target);
        
        if (event.target.dataset) {
            event.target.dataset.wasDropped = 'false';
        }

        if (type === 'weight') {
            const mass = parseInt(event.target.dataset.mass, 10);
            state.currentWeight = mass;
            console.log('🎯 Drag started: груз', mass, 'г');
        } else if (type === 'equipment') {
            console.log('🔧 Dragging equipment item:', event.target.dataset.equipmentId);
        }
    }

    /**
     * Обработчик движения
     */
    onDragMove(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        if (this.dragGhost) {
            const rect = target.getBoundingClientRect();
            this.dragGhost.style.left = rect.left + 'px';
            this.dragGhost.style.top = rect.top + 'px';
        }
    }

    /**
     * Обработчик окончания перетаскивания
     */
    onDragEnd(event) {
        this.isDragging = false;
        event.target.classList.remove('dragging');
        
        const wasDropped = event.target.dataset.wasDropped === 'true';
        
        // Удаляем призрак
        this.removeGhost();
        
        // Очищаем все призраки в DOM
        document.querySelectorAll('#drag-ghost').forEach(ghost => ghost.remove());
        
        event.target.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        event.target.style.opacity = '1';
        event.target.style.zIndex = '';
        
        const type = event.target.dataset.type || 'weight';
        if (!wasDropped && (type === 'equipment' || type === 'weight')) {
            this.resetPosition(event.target);
        }
    }

    /**
     * Создать призрачную копию элемента
     */
    createGhost(element) {
        const clone = element.cloneNode(true);
        clone.id = 'drag-ghost';
        clone.style.position = 'fixed';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '10000';
        clone.style.opacity = '0.9';
        clone.style.transform = 'scale(1.2)';
        clone.style.boxShadow = '0 10px 30px rgba(0, 168, 107, 0.6)';
        clone.style.border = '3px solid #00A86B';
        
        const rect = element.getBoundingClientRect();
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        
        document.body.appendChild(clone);
        this.dragGhost = clone;
    }

    /**
     * Удалить призрак
     */
    removeGhost() {
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
    }

    /**
     * Сбросить позицию элемента
     */
    resetPosition(element, clearDroppedFlag = true) {
        if (!element) return;
        
        this.removeGhost();
        
        element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        element.style.transform = '';
        element.style.opacity = '';
        
        element.setAttribute('data-x', 0);
        element.setAttribute('data-y', 0);
        
        if (clearDroppedFlag && element.dataset) {
            delete element.dataset.wasDropped;
        }
        
        setTimeout(() => {
            if (element?.style) {
                element.style.transition = '';
            }
        }, 300);
    }

    /**
     * Получить координаты из события (mouse/touch)
     */
    getEventCoords(e) {
        if (e.touches?.length > 0) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        if (e.changedTouches?.length > 0) {
            return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
        }
        return { clientX: e.clientX, clientY: e.clientY };
    }

    /**
     * Проверить попадание в область пружины
     */
    isNearSpringHook(x, y, springPos, springLength, threshold = 100) {
        const hookX = springPos.x;
        const hookY = springPos.y + springLength;
        const distance = Math.hypot(x - hookX, y - hookY);
        return distance < threshold;
    }

    /**
     * Проверить попадание в область динамометра
     */
    isNearDynamometerHook(x, y, dynPos, threshold = 100) {
        const hookX = dynPos.x;
        const hookY = dynPos.y + 300 + 23; // Высота корпуса + крючок
        const distance = Math.hypot(x - hookX, y - hookY);
        return distance < threshold;
    }

    /**
     * Проверить клик на пружину
     */
    isClickOnSpring(x, y, springPos, springLength) {
        const springRadius = 30;
        return (
            x >= springPos.x - springRadius &&
            x <= springPos.x + springRadius &&
            y >= springPos.y - 20 &&
            y <= springPos.y + springLength + 40
        );
    }

    /**
     * Проверить клик на динамометр
     */
    isClickOnDynamometer(x, y, dynPos) {
        const width = 80;
        const height = 300;
        return (
            x >= dynPos.x - width / 2 &&
            x <= dynPos.x + width / 2 &&
            y >= dynPos.y - height / 2 &&
            y <= dynPos.y + height / 2
        );
    }

    /**
     * Найти свободный груз в точке
     */
    findFreeWeightAt(x, y, freeWeights, weightManager) {
        if (!freeWeights?.length) return null;
        
        for (let i = freeWeights.length - 1; i >= 0; i--) {
            const w = freeWeights[i];
            const weightDef = weightManager.getById(w.weightId);
            if (!weightDef) continue;
            
            const img = weightManager.getImage(w.weightId);
            const targetSize = weightDef.targetSize ?? 72;
            const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
            const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
            
            const halfWidth = targetSize / 2;
            const halfHeight = renderedHeight / 2;
            
            if (x >= w.x - halfWidth && x <= w.x + halfWidth &&
                y >= w.y - halfHeight && y <= w.y + halfHeight) {
                return w;
            }
        }
        return null;
    }
}
