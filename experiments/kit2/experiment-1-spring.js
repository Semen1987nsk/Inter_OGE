/**
 * Experiment 1: Определение жёсткости пружины
 * Interactive Spring Stiffness Measurement
 */

import { FreeformManager } from '../shared/freeform-manager.js';

class SpringExperiment {
    constructor() {
        // Canvas layers (IDs must match HTML)
        this.canvases = {
            background: document.getElementById('canvas-background'),
            equipment: document.getElementById('canvas-equipment'),
            dynamic: document.getElementById('canvas-dynamic'),
            particles: document.getElementById('canvas-particles'),
            ui: document.getElementById('canvas-ui')
        };
        
        this.contexts = {};
        Object.keys(this.canvases).forEach(key => {
            const canvas = this.canvases[key];
            if (!canvas) {
                console.error(`Canvas element missing: ${key}`);
            } else {
                this.contexts[key] = canvas.getContext('2d');
            }
        });

        // State
        this.state = {
            currentStep: 1,
            experimentMode: 'spring', // Теперь по умолчанию работаем с пружиной
            isAnimating: false,
            isDragging: false,
            draggingSpring: false,
            springAttached: false,
            attachedSpringId: null,
            dynamometerAttached: false, // Опциональный инструмент для проверки
            attachedDynamometerId: null,
            dynamometerPosition: { x: 450, y: 200 },
            weightAttached: false,
            currentWeight: null,
            currentWeightId: null,
            springPosition: { x: 200, y: 150 },
            springLength: 140,
            springNaturalLength: 140,
            springElongation: 0,
            measurements: [], // Единая таблица измерений
            attachedWeights: [],
            selectedWeights: new Set(),
            experimentComplete: false,
            // Опциональная проверка на динамометре
            dynamometerCheckMode: false, // Режим проверки силы на динамометре
            lastDynamometerReading: null, // Последнее показание динамометра
            // 🆕 Свободные грузы на столе
            freeWeights: [], // Грузы, размещённые на canvas, но не подвешенные
            // 🆕 Учёт использованных грузов
            usedWeightIds: new Set() // ID грузов, которые уже использованы (подвешены или на canvas)
        };

        this.springDragged = false;
        this.pendingWeightIds = new Set();

        // Конфигурация планшета с пружиной (используем фото реального оборудования)
        this.layout = {
            springRig: {
                position: { x: 260, y: 80 },
                width: 260,
                height: 420,
                anchorRatio: { x: 0.48, y: 0.18 }, // относительное положение верхнего крючка на фото
                anchorOffset: { x: 0, y: 0 }
            }
        };

        this.updateRigGeometry();

        // Physics constants
        this.physics = {
            springConstant: 50, // N/m (будет рассчитана из экспериментов)
            gravity: 9.8, // m/s²
            pixelsPerCm: 40, // масштаб: 40px = 1cm
            oscillationAmplitude: 0,
            oscillationTime: 0,
            isDamping: false
        };

        // Images
        this.images = {
            springBoard: null,
            weights: {}
        };

        // Systems
        this.particleSystem = new ParticleSystem(this.canvases.particles);
        this.realisticRenderer = new RealisticRenderer(this.contexts.dynamic);
        
        // Pointer tracking for dynamic highlight
        this.pointer = { x: 0, y: 0, over: false };
        
        // Kinematics for motion blur
        this.prevSpringLength = null;
        this.springVelocity = 0;
        this.currentAnimation = null;
        this.attachmentManager = new AttachmentManager(this);
        
        // Spring offset for dragging
        this.springOffset = { x: 0, y: 0 };
        this.reinitDragSources = null;
        this.dragGhost = null; // Призрачная копия элемента при перетаскивании

        // Visual scaling to keep soft пружины в кадре
        this.visual = {
            scale: 1,
            minScale: 0.2,
            marginTop: 120,
            marginBottom: 140
        };

        // UI references
        this.ui = {
            equipmentContainer: document.getElementById('equipment-container'),
            weightsContainer: document.getElementById('weights-container')
        };

        // Visual configuration toggles
        this.visualSettings = {
            measurementParticles: false,
            completionConfetti: true
        };

        // Inventory metadata
        this.equipment = {
            dynamometer1: {
                id: 'dynamometer1',
                name: 'Динамометр 1Н',
                maxForce: 1,
                icon: '⚖️',
                type: 'dynamometer',
                description: 'Для измерения малых сил',
                scale: 0.1 // Цена деления 0.1 Н
            },
            dynamometer5: {
                id: 'dynamometer5',
                name: 'Динамометр 5Н',
                maxForce: 5,
                icon: '⚖️',
                type: 'dynamometer',
                description: 'Для измерения больших сил',
                scale: 0.5 // Цена деления 0.5 Н
            },
            spring50: {
                id: 'spring50',
                name: 'Пружина №1',
                stiffness: '50 Н/м',
                stiffnessValue: 50,
                icon: '🌀',
                type: 'spring',
                naturalLength: 140
            },
            spring10: {
                id: 'spring10',
                name: 'Пружина №2',
                stiffness: '10 Н/м',
                stiffnessValue: 10,
                icon: '🧷',
                type: 'spring',
                naturalLength: 140
            }
        };

        // Набор грузов комплекта №2 (ФИПИ ОГЭ 2025)
        this.weightsInventory = [
            {
                id: 'weight100_double_1',
                mass: 100,
                name: 'Груз 100 г №1',
                description: 'Двойной крюк для стыковки',
                icon: '../../assets/equipment/weight-100g-double-hook.svg',
                hooksTop: true,
                hooksBottom: true,
                targetSize: 88,
                hookGap: 28
            },
            {
                id: 'weight100_double_2',
                mass: 100,
                name: 'Груз 100 г №2',
                description: 'Двойной крюк для стыковки',
                icon: '../../assets/equipment/weight-100g-double-hook.svg',
                hooksTop: true,
                hooksBottom: true,
                targetSize: 88,
                hookGap: 28
            },
            {
                id: 'weight100_double_3',
                mass: 100,
                name: 'Груз 100 г №3',
                description: 'Двойной крюк для стыковки',
                icon: '../../assets/equipment/weight-100g-double-hook.svg',
                hooksTop: true,
                hooksBottom: true,
                targetSize: 88,
                hookGap: 28
            },
            // Дополнительные грузы отключены по запросу заказчика
        ];

        // Cache for tracking last pointer position during canvas drag
        this.lastPointer = { x: 0, y: 0 };

        this.defaults = {
            springNaturalLength: this.state.springNaturalLength,
            springConstant: this.physics.springConstant
        };
        
        // Init (setupInteractions moved to init to ensure DOM ready)
        this.init();
    }

    get springPosition() {
        return this.state.springPosition;
    }

    async init() {
        try {
            // Resize canvases
            this.resizeCanvases();
            window.addEventListener('resize', () => this.resizeCanvases());

            // Load images
            await this.loadAssets();

            // Render side panel inventory
            this.renderEquipmentInventory();
            this.renderWeightsInventory();

            // Draw static elements
            this.drawBackground();
            this.drawEquipment();

            // Setup UI
            this.setupEventListeners();

            // Setup interactions AFTER DOM elements exist
            this.setupInteractions();
            console.log('✅ Interactions setup complete');

            // Добавляем управление оборудованием (перемещение верхнего конца пружины)
            this.setupEquipmentDragListeners();
            
            // 🆕 Настройка перетаскивания свободных грузов
            this.setupFreeWeightsDrag();
            
            this.handleStepChange();

            // Инициализация UI для таблицы измерений
            this.renderMeasurementsTable();
            this.updateRecordButton();
            this.updateCalculateButton();

            // Hide loading overlay
            this.hideLoading();

            // Start render loop
            this.lastTime = performance.now();
            this.animate();

            console.log('✅ Experiment initialized successfully');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки эксперимента: ' + error.message);
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }
    }

    updateRigGeometry() {
        const rig = this.layout.springRig;
        rig.anchorOffset = {
            x: rig.width * rig.anchorRatio.x,
            y: rig.height * rig.anchorRatio.y
        };
    }

    async loadAssets() {
        console.log('📦 Preparing virtual spring rig...');

        const rig = this.layout.springRig;

        if (!rig.height) {
            rig.height = Math.round(rig.width * 1.62);
        }

        this.updateRigGeometry();

        if (!this.springDragged) {
            this.state.springPosition = {
                x: rig.position.x + rig.anchorOffset.x,
                y: rig.position.y + rig.anchorOffset.y
            };
        } else {
            this.updateRigPositionFromSpring();
        }

        console.log('✅ Virtual board prepared:', rig.width, 'x', rig.height);

        await this.loadWeightAssets();
    }

    updateRigPositionFromSpring() {
        this.clampSpringPosition();
        const rig = this.layout.springRig;
        rig.position.x = this.state.springPosition.x - rig.anchorOffset.x;
        rig.position.y = this.state.springPosition.y - rig.anchorOffset.y;
    }

    getSpringAnchor() {
        return {
            x: this.state.springPosition.x,
            y: this.state.springPosition.y
        };
    }

    getEquipmentById(id) {
        if (!id) return null;
        return Object.values(this.equipment).find(item => item.id === id) || null;
    }

    getAttachedSpring() {
        return this.getEquipmentById(this.state.attachedSpringId);
    }

    getWeightById(id) {
        if (!id || !Array.isArray(this.weightsInventory)) {
            return null;
        }

        return this.weightsInventory.find(weight => weight.id === id) || null;
    }

    canAttachWeight(weight) {
        if (!weight) {
            return false;
        }

        if (!this.state.attachedWeights?.length) {
            return !!weight.hooksTop;
        }

        const last = this.state.attachedWeights[this.state.attachedWeights.length - 1];
        const lastDef = this.getWeightById(last.id);

        return !!(lastDef?.hooksBottom && weight.hooksTop);
    }

    async loadWeightAssets() {
        if (!Array.isArray(this.weightsInventory)) {
            return;
        }

        const tasks = this.weightsInventory.map(async (weight) => {
            if (!weight?.icon || this.images.weights[weight.id]) {
                return;
            }

            try {
                const img = await this.loadImage(weight.icon);
                this.images.weights[weight.id] = img;
            } catch (err) {
                console.warn(`⚠️ Не удалось загрузить изображение груза ${weight.name}:`, err.message);
            }
        });

        await Promise.all(tasks);
    }

    clampSpringPosition() {
        const rig = this.layout.springRig;
        const canvas = this.canvases.equipment;
        if (!canvas) return;

        const padding = 40;
        const minX = rig.anchorOffset.x + padding;
        const maxX = canvas.width - (rig.width - rig.anchorOffset.x) - padding;
        const minY = rig.anchorOffset.y + padding;
        const maxY = canvas.height - padding - (rig.height - rig.anchorOffset.y);

        this.state.springPosition.x = Math.min(Math.max(this.state.springPosition.x, minX), Math.max(minX, maxX));
        this.state.springPosition.y = Math.min(Math.max(this.state.springPosition.y, minY), Math.max(minY, maxY));
    }
    
    // Утилита для загрузки изображений
    async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    // Temporary placeholders (будут заменены на реальные PNG)
    async createPlaceholderSpring() {
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        
        // Рисуем спираль пружины
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 3;
        const coils = 15;
        const coilHeight = canvas.height / coils;
        
        for (let i = 0; i < coils; i++) {
            const y = i * coilHeight;
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, y + coilHeight / 2, 25, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        const img = new Image();
        img.src = canvas.toDataURL();
        return new Promise(resolve => {
            img.onload = () => resolve(img);
        });
    }

    async createPlaceholderStand() {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        // Штатив
        ctx.fillStyle = '#555';
        ctx.fillRect(80, 0, 40, 250); // вертикальная стойка
        ctx.fillRect(0, 240, 200, 20); // основание
        ctx.fillRect(80, 20, 100, 10); // перекладина
        
        const img = new Image();
        img.src = canvas.toDataURL();
        return new Promise(resolve => {
            img.onload = () => resolve(img);
        });
    }

    async createPlaceholderWeight(mass) {
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        
        // Градиент металла
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#9E9E9E');
        gradient.addColorStop(0.5, '#616161');
        gradient.addColorStop(1, '#424242');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(10, 10, 60, 40);
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 60, 40);
        
        // Текст массы
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${mass}г`, 40, 35);
        
        const img = new Image();
        img.src = canvas.toDataURL();
        return new Promise(resolve => {
            img.onload = () => resolve(img);
        });
    }

    renderEquipmentInventory() {
        const container = this.ui?.equipmentContainer;
        if (!container) {
            console.warn('⚠️ Equipment container not found');
            return;
        }

        container.innerHTML = '';

        Object.values(this.equipment).forEach((equipment) => {
            // Определяем тип оборудования и его состояние
            const isDynamometer = equipment.type === 'dynamometer';
            const isSpring = equipment.type === 'spring';
            
            let isAttached = false;
            if (isDynamometer) {
                isAttached = this.state.attachedDynamometerId === equipment.id;
            } else if (isSpring) {
                isAttached = this.state.attachedSpringId === equipment.id;
            }

            const item = document.createElement('div');
            item.className = 'equipment-item';
            item.dataset.type = 'equipment';
            item.dataset.equipmentId = equipment.id;
            item.dataset.status = isAttached ? 'installed' : 'available';
            
            if (isDynamometer) {
                item.dataset.maxForce = equipment.maxForce;
            } else {
                item.dataset.stiffness = equipment.stiffnessValue;
            }

            if (isAttached) {
                item.classList.add('equipment-item--installed');
            }

            const icon = document.createElement('div');
            icon.className = 'equipment-icon';
            icon.textContent = equipment.icon;

            const title = document.createElement('div');
            title.className = 'equipment-title';
            title.textContent = equipment.name;

            const meta = document.createElement('div');
            meta.className = 'equipment-meta';
            if (isDynamometer) {
                meta.textContent = `Жёсткость определите в ходе опыта
В комплекте`;
            } else {
                meta.textContent = 'Жёсткость определите в ходе опыта';
            }

            const status = document.createElement('div');
            status.className = 'equipment-status';
            status.textContent = isAttached ? 'На установке' : 'В комплекте';

            item.append(icon, title, meta, status);

            if (isAttached) {
                const action = document.createElement('button');
                action.type = 'button';
                action.className = 'equipment-action';
                action.textContent = 'Вернуть в комплект';
                action.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    if (isDynamometer) {
                        this.detachDynamometerToInventory();
                    } else {
                        this.detachSpringToInventory();
                    }
                });
                item.appendChild(action);
            } else {
                const hint = document.createElement('div');
                hint.className = 'equipment-hint';
                hint.textContent = 'Перетащите на установку';
                item.appendChild(hint);
            }

            container.appendChild(item);
        });

        this.reinitDragSources?.();
    }

    renderWeightsInventory() {
        const container = this.ui?.weightsContainer;
        if (!container) {
            console.warn('⚠️ Weights container not found');
            return;
        }

        // Логирование только при наличии подвешенных грузов
        if (this.state.attachedWeights?.length > 0) {
            console.log('[RENDER-WEIGHTS] Подвешено грузов:', this.state.attachedWeights.length, 
                        '| Последний:', this.state.attachedWeights[this.state.attachedWeights.length - 1]?.id,
                        '| selectedWeights:', Array.from(this.state.selectedWeights));
        }

        container.innerHTML = '';

        console.log('[RENDER-WEIGHTS] 📋 Состояние всех грузов:');

        this.weightsInventory.forEach((weight) => {
            const isPending = this.pendingWeightIds.has(weight.id);
            const isAttached = this.state.selectedWeights.has(weight.id);
            // 🆕 Груз "использован" = в usedWeightIds НО не подвешен (свободный на canvas)
            const isUsedButNotAttached = this.state.usedWeightIds.has(weight.id) && !isAttached;
            // ✅ Проверяем, является ли груз ПОСЛЕДНИМ в цепочке (только его можно снять)
            const attachedArray = this.state.attachedWeights;
            const lastIndex = attachedArray?.length > 0 ? attachedArray.length - 1 : -1;
            const lastWeightInChain = lastIndex >= 0 ? attachedArray[lastIndex] : null;
            const isLastInChain = lastWeightInChain?.id === weight.id;
            

            
            // 🆕 Находим позицию груза в цепочке (1, 2, 3...)
            const positionInChain = isAttached ? 
                this.state.attachedWeights.findIndex(w => w.id === weight.id) + 1 : 
                null;

            // 🔍 Логируем состояние каждого груза
            console.log(`  • ${weight.id}: isAttached=${isAttached}, isLastInChain=${isLastInChain}, pos=${positionInChain}`);

            // 🔍 DEBUG - только для проблемных случаев
            if (isAttached && !isLastInChain && positionInChain === null) {
                console.warn(`[RENDER-WEIGHT] ⚠️ Груз подвешен но не найден в цепочке:`, {
                    weight_id: weight.id,
                    attachedWeights: this.state.attachedWeights.map(w => w.id)
                });
            }

            const item = document.createElement('div');
            item.className = 'weight-item';
            item.dataset.type = 'weight';
            item.dataset.mass = weight.mass;
            item.dataset.weightId = weight.id;
            item.dataset.hooksTop = weight.hooksTop ? 'true' : 'false';
            item.dataset.hooksBottom = weight.hooksBottom ? 'true' : 'false';
            item.dataset.status = isAttached ? 'attached' : isPending ? 'pending' : isUsedButNotAttached ? 'used' : 'available';

            if (isAttached || isPending || isUsedButNotAttached) {
                item.classList.add('used');
                item.classList.add('weight-item--attached');
            }

            const figure = document.createElement('div');

                    this.reinitDragSources?.();
            figure.className = 'weight-figure';

            if (weight.icon) {
                const img = document.createElement('img');
                img.src = weight.icon;
                img.alt = weight.name;
                figure.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'weight-placeholder';
                placeholder.textContent = `${weight.mass} г`;
                figure.appendChild(placeholder);
            }

            const label = document.createElement('div');
            label.className = 'weight-label';
            label.textContent = weight.name;

            const meta = document.createElement('div');
            meta.className = 'weight-meta';
            meta.textContent = weight.description ?? '';

            const status = document.createElement('div');
            status.className = 'weight-status';
            
            let statusText = 'В комплекте';
            if (isAttached) {
                const chainInfo = positionInChain ? ` (${positionInChain}-й в цепочке)` : '';
                if (this.state.dynamometerAttached) {
                    statusText = `На динамометре${chainInfo}`;
                } else {
                    statusText = `На пружине${chainInfo}`;
                }
            } else if (isPending) {
                statusText = 'Подвешивается…';
            } else if (isUsedButNotAttached) {
                statusText = 'На столе'; // 🆕 Груз свободный на canvas
            }
            status.textContent = statusText;

            item.append(figure, label, meta, status);

            // ✅ Кнопка "Снять" - ТОЛЬКО для последнего груза в цепочке!
            if (isAttached && isLastInChain) {
                const action = document.createElement('button');
                action.type = 'button';
                action.className = 'weight-action';
                action.textContent = 'Снять';
                action.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    console.log('[UI] 🔴 Кнопка "Снять" нажата:', {
                        weightId: weight.id,
                        isLastInChain,
                        attachedWeights: this.state.attachedWeights.map(w => w.id)
                    });
                    this.detachWeight(weight.id);
                });
                item.appendChild(action);
                console.log('[UI] ✅ Кнопка "Снять" добавлена для:', weight.id, '(последний в цепочке)');
            } else if (isAttached && !isLastInChain) {
                // 🆕 Груз подвешен, но НЕ последний - показываем массу
                const massInfo = document.createElement('div');
                massInfo.className = 'weight-mass-info';
                massInfo.textContent = `${weight.mass} г`;
                item.appendChild(massInfo);
                console.log('[UI] 📊 Груз подвешен (НЕ последний):', weight.id);
            } else if (isAttached) {
                // 🔍 DEBUG: груз подвешен но ни то ни другое условие не сработало
                console.error('[UI] ❌ Груз подвешен но кнопка НЕ создана!', {
                    weightId: weight.id,
                    isAttached,
                    isLastInChain,
                    lastWeightInChain,
                    attachedWeights: this.state.attachedWeights
                });
            } else if (isUsedButNotAttached) {
                // 🆕 Груз на canvas (свободный) - можно убрать
                const action = document.createElement('button');
                action.type = 'button';
                action.className = 'weight-action';
                action.textContent = 'Убрать';
                action.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    console.log('[UI] 🔴 Кнопка "Убрать" нажата для груза:', weight.id);
                    console.log('[UI] Вызов removeFreeWeight...');
                    this.removeFreeWeight(weight.id);
                });
                item.appendChild(action);
                console.log('[UI] ✅ Добавлена кнопка "Убрать" для груза:', weight.id);
            } else if (!isPending) {
                const hint = document.createElement('div');
                hint.className = 'weight-hint';
                hint.textContent = 'Перетащите на установку';
                item.appendChild(hint);
            }

            container.appendChild(item);
        });

        this.reinitDragSources?.();
    }

    resetDraggablePosition(element, clearDroppedFlag = true) {
        if (!element) return;
        
        // Принудительно удаляем призрак, если он есть
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
        
        // Сбрасываем transform с анимацией
        element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        element.style.transform = '';
        element.style.opacity = '';
        
        // Очищаем data атрибуты
        element.setAttribute('data-x', 0);
        element.setAttribute('data-y', 0);
        
        // Удаляем флаг wasDropped только если разрешено
        if (clearDroppedFlag && element.dataset) {
            delete element.dataset.wasDropped;
        }
        
        // Убираем transition после анимации
        setTimeout(() => {
            if (element && element.style) {
                element.style.transition = '';
            }
        }, 300);
    }

    setSpringAnchor(x, y) {
        const canvas = this.canvases.dynamic;
        if (!canvas) return;

        const paddingX = 80;
        const paddingY = 60;
        const maxY = canvas.height - paddingY - (this.state.springLength || 140);

        const clampedX = Math.min(Math.max(x, paddingX), canvas.width - paddingX);
        const clampedY = Math.min(Math.max(y, paddingY), Math.max(paddingY, maxY));

        this.state.springPosition = { x: clampedX, y: clampedY };
        this.springOffset = {
            x: clampedX - canvas.width * 0.5,
            y: clampedY - canvas.height * 0.15
        };

        this.updateRigPositionFromSpring();
    }

    handleEquipmentAttach(event) {
        const element = event.relatedTarget;
        const equipmentId = element?.dataset?.equipmentId;
        const equipment = this.getEquipmentById(equipmentId);

        if (!equipment) {
            console.warn('⚠️ Unknown equipment id:', equipmentId);
            this.resetDraggablePosition(element);
            return;
        }

        // Проверяем тип оборудования
        if (equipment.type === 'dynamometer') {
            this.handleDynamometerAttach(event, equipment, element);
        } else if (equipment.type === 'spring') {
            this.handleSpringAttach(event, equipment, element);
        }
    }

    handleDynamometerAttach(event, dynamometer, element) {
        console.log('[DYNAMOMETER] Attaching:', dynamometer.name);
        
        // Если уже есть пружина - убираем её
        if (this.state.springAttached) {
            this.showHint('Сначала уберите пружину. Динамометр - это отдельный прибор!');
            this.resetDraggablePosition(element);
            return;
        }

        // Если уже установлен другой динамометр
        if (this.state.dynamometerAttached && this.state.attachedDynamometerId !== dynamometer.id) {
            this.showHint(`Заменяем ${this.getEquipmentById(this.state.attachedDynamometerId).name} на ${dynamometer.name}`);
        }

        // Получаем координаты drop для позиционирования
        const canvas = this.canvases.dynamic;
        const rect = canvas.getBoundingClientRect();
        const dropX = (event.dragEvent?.clientX ?? rect.left + rect.width / 2) - rect.left;
        const dropY = (event.dragEvent?.clientY ?? rect.top + rect.height * 0.4) - rect.top;

        // Устанавливаем динамометр
        this.state.dynamometerAttached = true;
        this.state.attachedDynamometerId = dynamometer.id;
        this.state.experimentMode = 'dynamometer';
        this.state.dynamometerPosition = { x: dropX, y: dropY };
        
        // Сбрасываем грузы
        this.state.attachedWeights = [];
        this.state.selectedWeights.clear();
        
        this.renderEquipmentInventory();
        this.drawDynamic();
        this.showHint(`${dynamometer.name} установлен. Подвесьте груз для измерения силы.`);
        
        this.resetDraggablePosition(element);
    }

    handleSpringAttach(event, spring, element) {
        console.log('[SPRING] Attaching:', spring.name);
        
        // Если есть динамометр - убираем его
        if (this.state.dynamometerAttached) {
            this.showHint('Сначала уберите динамометр.');
            this.resetDraggablePosition(element);
            return;
        }

        const canvas = this.canvases.dynamic;
        const rect = canvas.getBoundingClientRect();
        const dropX = (event.dragEvent?.clientX ?? rect.left + rect.width / 2) - rect.left;
        const dropY = (event.dragEvent?.clientY ?? rect.top + rect.height * 0.2) - rect.top;

        const previouslyAttachedId = this.state.attachedSpringId;
        const isSameSpring = previouslyAttachedId === spring.id && this.state.springAttached;

        if (isSameSpring) {
            this.showHint(`${spring.name} уже закреплена. Перетащите её за крючок, чтобы поменять положение.`);
            this.resetDraggablePosition(element);
            return;
        }

        this.setSpringAnchor(dropX, dropY);

        this.state.attachedSpringId = spring.id;
        this.state.springAttached = true;
        this.state.experimentMode = 'spring';
        this.springDragged = false;
        this.physics.springConstant = spring.stiffnessValue ?? this.defaults.springConstant;
        this.state.springNaturalLength = spring.naturalLength ?? this.defaults.springNaturalLength;
        this.state.springLength = this.state.springNaturalLength;
        this.state.springElongation = 0;
        this.state.weightAttached = false;
        this.state.currentWeight = null;

        if (!previouslyAttachedId || previouslyAttachedId !== spring.id) {
            this.reset();
            this.state.springAttached = true;
            this.state.attachedSpringId = spring.id;
            this.physics.springConstant = spring.stiffnessValue ?? this.defaults.springConstant;
            this.state.springNaturalLength = spring.naturalLength ?? this.defaults.springNaturalLength;
            this.state.springLength = this.state.springNaturalLength;
            this.state.springElongation = 0;
            this.state.weightAttached = false;
            this.state.currentWeight = null;
        }

        this.renderEquipmentInventory();
        this.drawDynamic();
        this.showHint(`${spring.name} закреплена. Теперь подвесьте груз.`);

        if (this.state.currentStep < 2) {
            this.state.currentStep = 2;
            this.updateProgress();
            this.handleStepChange();
        }

        this.resetDraggablePosition(element);
    }

    detachSpringToInventory() {
        if (!this.state.springAttached) return;

        this.reset();

        this.state.springAttached = false;
        this.state.attachedSpringId = null;
        this.state.weightAttached = false;
        this.state.currentWeight = null;
        this.state.springNaturalLength = this.defaults.springNaturalLength;
        this.state.springLength = this.state.springNaturalLength;
        this.state.springElongation = 0;
        this.physics.springConstant = this.defaults.springConstant;
        this.springOffset = { x: 0, y: 0 };
        this.springDragged = false;
        if (this.canvases.dynamic) {
            const canvas = this.canvases.dynamic;
            this.state.springPosition = {
                x: canvas.width * 0.5,
                y: canvas.height * 0.15
            };
        }
        
        // 🆕 Очищаем свободные грузы и возвращаем их в инвентарь
        if (this.state.freeWeights && this.state.freeWeights.length > 0) {
            console.log('[DETACH-SPRING] Возврат', this.state.freeWeights.length, 'свободных грузов');
            this.state.freeWeights.forEach(fw => {
                this.state.usedWeightIds.delete(fw.weightId);
            });
            this.state.freeWeights = [];
        }

        this.renderEquipmentInventory();
        this.renderWeightsInventory(); // 🆕 Обновляем инвентарь грузов
        this.drawDynamic();
        this.showHint('Пружина возвращена в комплект. Грузы возвращены в инвентарь.');
    }

    detachDynamometerToInventory() {
        if (!this.state.dynamometerAttached) return;

        console.log('[DYNAMOMETER] Detaching to inventory');

        // Сбрасываем все грузы
        this.state.attachedWeights.forEach(weight => {
            this.state.selectedWeights.delete(weight.id);
            this.state.usedWeightIds.delete(weight.id); // 🆕 Возвращаем в доступные
        });
        this.state.attachedWeights = [];

        // 🆕 Очищаем свободные грузы и возвращаем их в инвентарь
        if (this.state.freeWeights && this.state.freeWeights.length > 0) {
            console.log('[DETACH-DYN] Возврат', this.state.freeWeights.length, 'свободных грузов');
            this.state.freeWeights.forEach(fw => {
                this.state.usedWeightIds.delete(fw.weightId);
            });
            this.state.freeWeights = [];
        }

        // Сбрасываем состояние динамометра
        this.state.dynamometerAttached = false;
        this.state.attachedDynamometerId = null;
        
        // Возвращаем позицию в центр
        if (this.canvases.dynamic) {
            const canvas = this.canvases.dynamic;
            this.state.dynamometerPosition = {
                x: canvas.width * 0.5,
                y: canvas.height * 0.4
            };
        }

        this.renderEquipmentInventory();
        this.renderWeightsInventory(); // 🆕 Обновляем инвентарь грузов
        this.drawDynamic();
        this.showHint('Динамометр возвращён в комплект. Грузы возвращены в инвентарь.');
    }

    detachWeight(weightId) {
        console.log('[DETACH-WEIGHT] Запрос снять груз', weightId);
        
        // Проверяем что есть ЛЮБОЕ оборудование (динамометр или пружина)
        if (!this.state.springAttached && !this.state.dynamometerAttached) {
            console.warn('[DETACH-WEIGHT] Нет оборудования');
            this.showHint('Сначала установите динамометр или пружину.');
            return;
        }

        if (this.state.isAnimating) {
            console.warn('[DETACH-WEIGHT] Нельзя снять во время анимации');
            this.showHint('Дождитесь завершения измерения, затем снимите груз.');
            return;
        }

        if (!this.state.attachedWeights?.length) {
            console.warn('[DETACH-WEIGHT] Нет подвешенных грузов');
            this.showHint('Нет подвешенных грузов.');
            return;
        }

        const lastWeight = this.state.attachedWeights[this.state.attachedWeights.length - 1];
        if (!lastWeight || lastWeight.id !== weightId) {
            console.warn('[DETACH-WEIGHT] Пытаемся снять не последний груз', {
                requested: weightId,
                lastWeight: lastWeight?.id,
                chain: this.state.attachedWeights.map(item => item.id)
            });
            this.showHint('Сначала снимите нижний (последний) груз в цепочке.');
            return;
        }

        console.log('[DETACH-WEIGHT] ✅ Снимаем груз:', weightId);
        this.state.attachedWeights.pop();
        this.state.selectedWeights.delete(weightId);
        this.pendingWeightIds.delete(weightId);
        this.state.usedWeightIds.delete(weightId); // 🆕 Возвращаем груз в доступные
        
        console.log('[DETACH-WEIGHT] 🔄 State после снятия:', {
            attachedWeights: this.state.attachedWeights.map(w => w.id),
            selectedWeights: Array.from(this.state.selectedWeights),
            usedWeightIds: Array.from(this.state.usedWeightIds)
        });
        
        this.renderWeightsInventory(); // 🆕 Обновляем инвентарь
        console.log('[DETACH-WEIGHT] Груз снят, цепочка теперь:', this.state.attachedWeights.map(item => item.id));

        if (!this.state.attachedWeights.length) {
            this.state.weightAttached = false;
            this.state.currentWeight = null;
            this.state.currentWeightId = null;
            
            // Для пружины сбрасываем удлинение
            if (this.state.springAttached) {
                this.state.springLength = this.state.springNaturalLength;
                this.state.springElongation = 0;
                this.updateVisualScale(this.state.springLength);
            }
            
            this.resetMeasurementDisplay();
            this.showHint('Груз возвращён в комплект.');
        } else {
            console.log('[DETACH-WEIGHT] После снятия остались грузы, перерасчёт параметров');
            const totalMass = this.state.attachedWeights.reduce((sum, item) => {
                const def = this.getWeightById(item.id);
                return sum + (def?.mass ?? 0);
            }, 0);

            this.state.weightAttached = true;
            this.state.currentWeight = totalMass;
            const currentWeight = this.state.attachedWeights[this.state.attachedWeights.length - 1];
            this.state.currentWeightId = currentWeight?.id ?? null;

            const massKg = totalMass / 1000;
            const force = massKg * this.physics.gravity;
            
            // Только для ПРУЖИНЫ пересчитываем удлинение
            if (this.state.springAttached) {
                const elongationM = force / this.physics.springConstant;
                const elongationPx = elongationM * 100 * this.physics.pixelsPerCm;
                const targetLength = this.state.springNaturalLength + elongationPx;

                this.state.springLength = targetLength;
                this.state.springElongation = targetLength - this.state.springNaturalLength;
                this.updateVisualScale(this.state.springLength);

                const elongationCm = this.state.springElongation / this.physics.pixelsPerCm;
                this.updateCurrentMeasurementDisplay(totalMass, force, elongationCm);
                this.showHint(`Груз снят. Текущая масса на пружине: ${totalMass.toFixed(0)} г.`);
            } else {
                // Для ДИНАМОМЕТРА просто обновляем отображение
                this.updateCurrentMeasurementDisplay(totalMass, force, 0);
                this.showHint(`Груз снят. Текущая масса на динамометре: ${totalMass.toFixed(0)} г.`);
            }
        }

        this.drawDynamic();
        this.renderWeightsInventory();
        this.updateResultDisplay();
    }

    setupInteractions() {
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        if (typeof interact === 'undefined') {
            console.error('[DRAG] interact.js недоступен');
            return;
        }

        interact.dynamicDrop(true);

        const initDraggables = () => {
            interact('.weight-item').unset?.();
            interact('.equipment-item').unset?.();

            interact('.weight-item').draggable({
                inertia: false,
                autoScroll: true,
                listeners: {
                    start: (event) => this.onDragStart(event),
                    move: (event) => this.onDragMove(event),
                    end: (event) => this.onDragEnd(event)
                }
            });

            interact('.equipment-item').draggable({
                inertia: true,
                autoScroll: true,
                listeners: {
                    start: (event) => this.onDragStart(event),
                    move: (event) => this.onDragMove(event),
                    end: (event) => this.onDragEnd(event)
                }
            });
        };

        initDraggables();
        this.reinitDragSources = initDraggables;

        const overlay = document.getElementById('drag-drop-overlay');
        if (!overlay) {
            console.error('❌ drag-drop-overlay не найден');
            return;
        }

        interact('#drag-drop-overlay').unset?.();

        interact('#drag-drop-overlay').dropzone({
            accept: '.weight-item, .equipment-item',
            overlap: 0.1,
            ondrop: (event) => {
                console.log('[DROPZONE] ondrop вызван!');
                this.handleCanvasDrop(event);
            },
            ondropactivate: (event) => {
                const weightId = event.relatedTarget?.dataset?.weightId || 'unknown';
                console.log('[DROPZONE] Drop активирован для', weightId);
            },
            ondragenter: (event) => {
                // Устанавливаем флаг когда элемент входит в dropzone
                if (event.relatedTarget?.dataset) {
                    event.relatedTarget.dataset.wasDropped = 'true';
                    console.log('[DROPZONE] Установлен wasDropped=true в ondragenter');
                }
            },
            ondropdeactivate: (event) => {
                console.log('[DROPZONE] Drop деактивирован');
            }
        });
    }

    onDragStart(event) {
        const type = event.target.dataset.type || 'weight';
        
        // 🆕 Проверяем: груз уже использован?
        if (type === 'weight') {
            const weightId = event.target.dataset.weightId;
            if (this.state.usedWeightIds.has(weightId)) {
                console.log('[DRAG] ⛔ Груз уже использован:', weightId);
                event.preventDefault?.();
                event.stopPropagation?.();
                return false;
            }
        }
        
        this.state.isDragging = true;
        event.target.classList.add('dragging');
        
        // Визуальная обратная связь - делаем элемент более заметным
        event.target.style.transition = 'none';
        event.target.style.opacity = '0.6';
        event.target.style.zIndex = '1000';
        
        // Создаём призрачную копию для визуального перетаскивания
        const clone = event.target.cloneNode(true);
        clone.id = 'drag-ghost';
        clone.style.position = 'fixed';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '10000';
        clone.style.opacity = '0.9';
        clone.style.transform = 'scale(1.2)';
        clone.style.boxShadow = '0 10px 30px rgba(0, 168, 107, 0.6)';
        clone.style.border = '3px solid #00A86B';
        
        const rect = event.target.getBoundingClientRect();
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        
        document.body.appendChild(clone);
        this.dragGhost = clone;
        
        if (event.target.dataset) {
            event.target.dataset.wasDropped = 'false';
        }

        if (type === 'weight') {
            const mass = parseInt(event.target.dataset.mass, 10);
            this.state.currentWeight = mass;
            console.log('🎯 Drag started: груз', mass, 'г');
        } else if (type === 'equipment') {
            console.log('🔧 Dragging equipment item:', event.target.dataset.equipmentId);
        }
        
        // Инициализируем trail для визуального следа
        if (this.visualSettings?.dragTrail) {
            const trailColor = type === 'equipment' ? '#0066CC' : '#00A86B';
            this.particleSystem.createTrail(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                trailColor
            );
        }
        
        // Создаём эффект частиц при начале перетаскивания
        if (this.visualSettings?.dragParticles) {
            const canvasRect = this.canvases.particles.getBoundingClientRect();
            this.particleSystem.createDustParticles(
                rect.left - canvasRect.left + rect.width / 2,
                rect.top - canvasRect.top + rect.height / 2,
                8
            );
        }
    }

    onDragMove(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        // Двигаем призрачную копию вместе с курсором
        if (this.dragGhost) {
            const rect = target.getBoundingClientRect();
            this.dragGhost.style.left = rect.left + 'px';
            this.dragGhost.style.top = rect.top + 'px';
        }

        // Добавляем визуальный след при перемещении
        if (this.visualSettings?.dragTrail && this.dragGhost) {
            const rect = this.dragGhost.getBoundingClientRect();
            const canvasRect = this.canvases.particles.getBoundingClientRect();
            
            this.particleSystem.updateTrail(
                rect.left - canvasRect.left + rect.width / 2,
                rect.top - canvasRect.top + rect.height / 2
            );
        }
    }

    onDragEnd(event) {
        this.state.isDragging = false;
        event.target.classList.remove('dragging');
        
        const wasDropped = event.target.dataset.wasDropped === 'true';
        
        console.log('[DRAG-END] Start cleanup', {
            type: event.target.dataset.type,
            weightId: event.target.dataset.weightId,
            hasGhost: !!this.dragGhost,
            wasDropped: wasDropped
        });
        
        // ВАЖНО: Удаляем призрака ПЕРВЫМ делом
        if (this.dragGhost) {
            console.log('[DRAG-END] Removing ghost');
            this.dragGhost.remove();
            this.dragGhost = null;
        }
        
        // Проверяем все возможные призраки в DOM
        const existingGhosts = document.querySelectorAll('#drag-ghost');
        existingGhosts.forEach(ghost => {
            console.log('[DRAG-END] Removing orphaned ghost');
            ghost.remove();
        });
        
        // Возвращаем плавные переходы
        event.target.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        event.target.style.opacity = '1';
        event.target.style.zIndex = '';
        
        // Очищаем trail
        if (this.visualSettings?.dragTrail) {
            this.particleSystem.clearTrail();
        }
        
        console.log('[DRAG-END]', {
            type: event.target.dataset.type,
            weightId: event.target.dataset.weightId,
            wasDropped: wasDropped
        });
        
        // ТОЛЬКО если НЕ был успешный drop - возвращаем элемент на место
        const type = event.target.dataset.type || 'weight';
        if (!wasDropped && (type === 'equipment' || type === 'weight')) {
            console.log('[DRAG-END] Resetting position (not dropped)');
            this.resetDraggablePosition(event.target);
        } else if (wasDropped) {
            console.log('[DRAG-END] Successful drop - not resetting position');
        }
    }

    handleCanvasDrop(event) {
        const itemType = event.relatedTarget?.dataset?.type || 'weight';

        console.log('[DROPZONE] Срабатывание drop:', {
            itemType,
            isAnimating: this.state.isAnimating,
            springAttached: this.state.springAttached,
            targetId: event.target?.id,
            relatedId: event.relatedTarget?.dataset?.weightId || event.relatedTarget?.dataset?.equipmentId || 'unknown',
            overlap: event.interaction?.dropState?.rect ? 'rect-mode' : 'default'
        });

        if (itemType === 'equipment') {
            this.handleEquipmentAttach(event);
            return;
        }

        if (itemType === 'weight') {
            return this.handleWeightDrop(event);
        }

        console.warn('Unhandled drop type:', itemType);
    }

    async handleWeightDrop(event) {
        const element = event.relatedTarget;

        console.log('[ATTACH-WEIGHT] handleWeightDrop start', {
            springAttached: this.state.springAttached,
            dynamometerAttached: this.state.dynamometerAttached,
            isAnimating: this.state.isAnimating,
            selectedWeights: Array.from(this.state.selectedWeights)
        });

        const weightId = element?.dataset?.weightId;
        const weight = this.getWeightById(weightId);

        if (!weight) {
            console.warn('[ATTACH-WEIGHT] Не найден вес по id', weightId);
            this.showHint('Не удалось распознать груз. Попробуйте снова.');
            this.resetDraggablePosition(element);
            return;
        }

        // � УМНАЯ ЛОГИКА: проверяем куда упал груз
        const canvasRect = this.canvases.dynamic.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        const canvasX = elementRect.left + elementRect.width/2 - canvasRect.left;
        const canvasY = elementRect.top + elementRect.height/2 - canvasRect.top;
        
        // Проверяем попадание на пружину
        let shouldAttachDirectly = false;
        let attachmentTarget = null;
        
        if (this.state.springAttached) {
            const springPos = this.state.springPosition;
            const springLength = this.state.springLength || this.state.springNaturalLength;
            const hookX = springPos.x;
            const hookY = springPos.y + springLength;
            
            const distanceToSpring = Math.hypot(canvasX - hookX, canvasY - hookY);
            
            console.log('[ATTACH-WEIGHT] Check spring drop:', {
                canvasPos: [canvasX.toFixed(1), canvasY.toFixed(1)],
                springHook: [hookX.toFixed(1), hookY.toFixed(1)],
                distance: distanceToSpring.toFixed(1),
                threshold: 80
            });
            
            if (distanceToSpring < 80) {
                shouldAttachDirectly = true;
                attachmentTarget = 'spring';
            }
        }
        
        // Проверяем попадание на динамометр
        if (!shouldAttachDirectly && this.state.dynamometerAttached) {
            const dynPos = this.state.dynamometerPosition;
            const hookX = dynPos.x;
            // Высота корпуса (300) + нижний крючок (23)
            const hookY = dynPos.y + 300 + 23;
            
            const distanceToDynamometer = Math.hypot(canvasX - hookX, canvasY - hookY);
            
            console.log('[ATTACH-WEIGHT] Check dynamometer drop:', {
                canvasPos: [canvasX.toFixed(1), canvasY.toFixed(1)],
                dynHook: [hookX.toFixed(1), hookY.toFixed(1)],
                distance: distanceToDynamometer.toFixed(1),
                threshold: 80
            });
            
            if (distanceToDynamometer < 80) {
                shouldAttachDirectly = true;
                attachmentTarget = 'dynamometer';
            }
        }
        
        if (shouldAttachDirectly) {
            // 🎯 СЦЕНАРИЙ 1: Упал на пружину/динамометр → подвешиваем сразу
            console.log(`[ATTACH-WEIGHT] Direct drop on ${attachmentTarget}`);
            element.classList.add('used');
            this.resetDraggablePosition(element, false);
            this.attachWeight(weight);
            this.renderWeightsInventory(); // 🆕 Обновляем инвентарь
            return;
        }
        
        // 🎨 СЦЕНАРИЙ 2: Упал в свободное место → размещаем как свободный объект
        if (!this.state.freeWeights) {
            this.state.freeWeights = [];
        }
        
        // 🆕 Помечаем груз как использованный
        this.state.usedWeightIds.add(weightId);
        
        const freeWeight = {
            id: `free-${Date.now()}`,
            weightId: weightId,
            mass: weight.mass,
            x: canvasX,
            y: canvasY,
            width: weight.targetSize || 88,
            height: weight.targetSize || 88,
            isDragging: false,
            isAttached: false
        };
        
        this.state.freeWeights.push(freeWeight);
        // ❌ НЕ добавляем в selectedWeights! Это только для подвешенных грузов!
        // this.state.selectedWeights.add(weightId);
        element.classList.add('used');
        
        this.resetDraggablePosition(element, false);
        this.drawDynamic();
        this.renderWeightsInventory(); // 🆕 Обновляем инвентарь
        
        console.log('[FREE-WEIGHT] Груз размещён свободно:', {
            weightId,
            usedWeightIds: Array.from(this.state.usedWeightIds),
            selectedWeights: Array.from(this.state.selectedWeights),
            freeWeights: this.state.freeWeights.length
        });
        
        this.showToast(`✓ Груз ${weight.mass}г размещён на столе. Перетащите к пружине для подвешивания!`);
        
        console.log('[FREE-WEIGHT] Weight placed freely:', freeWeight);
    }

    /**
     * 🏗️ ЦЕНТРАЛЬНАЯ ФУНКЦИЯ: Добавление груза в цепочку
     * Используется ВЕЗДЕ для гарантии консистентности state
     * 
     * ЛОГИКА СОСТОЯНИЙ:
     * - Груз подвешен → в attachedWeights + selectedWeights (usedWeightIds удаляется!)
     * - Груз на canvas → в freeWeights + usedWeightIds (но НЕ в selectedWeights)
     * - Груз в инвентаре → НИ в чём
     */
    addWeightToChain(weightId) {
        console.log('[ADD-TO-CHAIN] ➕ Добавление груза в цепочку:', weightId);
        
        if (!Array.isArray(this.state.attachedWeights)) {
            this.state.attachedWeights = [];
        }
        
        // ✅ ЕДИНАЯ ТОЧКА добавления
        this.state.attachedWeights.push({ id: weightId });
        this.state.selectedWeights.add(weightId);
        
        // ❌ УДАЛЯЕМ из usedWeightIds - груз теперь "подвешен", а не "использован на canvas"
        // usedWeightIds используется ТОЛЬКО для свободных грузов на canvas!
        this.state.usedWeightIds.delete(weightId);
        
        console.log('[ADD-TO-CHAIN] ✅ Груз добавлен:', {
            chain: this.state.attachedWeights.map(w => w.id),
            selectedWeights: Array.from(this.state.selectedWeights),
            usedWeightIds: Array.from(this.state.usedWeightIds)
        });
    }

    async attachWeight(weight) {
        console.log('[ATTACH-WEIGHT] attachWeight вызван', weight?.id);
        this.state.isAnimating = true;
        console.log('[ATTACH-WEIGHT] Флаг isAnimating → true');
        this.state.weightAttached = true;

        // Очистка любых ранее запущенных эффектов, чтобы не оставалось свечения
        this.particleSystem.clear();

        // ✅ Используем центральную функцию
        this.addWeightToChain(weight.id);
        this.state.currentWeightId = weight.id;
        
        console.log('[ATTACH-WEIGHT] 🔍 ПРОВЕРКА после addWeightToChain:', {
            weightId: weight.id,
            inSelectedWeights: this.state.selectedWeights.has(weight.id),
            selectedWeights: Array.from(this.state.selectedWeights),
            inAttachedWeights: this.state.attachedWeights.some(w => w.id === weight.id),
            attachedWeights: this.state.attachedWeights.map(w => w.id)
        });

        const totalMass = this.state.attachedWeights.reduce((sum, item) => {
            const def = this.getWeightById(item.id);
            return sum + (def?.mass ?? 0);
        }, 0);

        console.log('[ATTACH-WEIGHT] Текущая суммарная масса (г):', totalMass);

        this.state.currentWeight = totalMass;

        const massKg = totalMass / 1000;
        const force = massKg * this.physics.gravity; // F = mg (автоматически!)

        // === РЕЖИМ ПРУЖИНЫ (основной) ===
        if (this.state.springAttached) {
            const elongationM = force / this.physics.springConstant;
            const elongationPx = elongationM * 100 * this.physics.pixelsPerCm;

            console.log('[SPRING MODE] Расчёт удлинения', {
                massKg,
                force,
                elongationM,
                elongationPx
            });

            const targetLength = this.state.springNaturalLength + elongationPx;

            console.log('[ATTACH-WEIGHT] Целевая длина пружины (px):', targetLength);

            this.updateVisualScale(targetLength);

            // Показываем подсказку во время анимации
            this.showHint(`Груз ${weight.name} подвешен. Масса: ${totalMass} г. Наблюдайте колебания...`);

            // ИЗМЕРЕНИЕ В РЕАЛЬНОМ ВРЕМЕНИ - обновляем показания сразу
            const elongationCm = elongationPx / this.physics.pixelsPerCm;
            this.updateCurrentMeasurementDisplay(totalMass, force, elongationCm);

            console.log('[ATTACH-WEIGHT] Запуск анимации растяжения');
            this.currentAnimation = this.animateSpringStretch(targetLength, massKg);
            try {
                await this.currentAnimation;
            } finally {
                this.currentAnimation = null;
            }
            console.log('[ATTACH-WEIGHT] Анимация растяжения завершена');

            // Финальное измерение после затухания колебаний
            const finalElongationCm = this.state.springElongation / this.physics.pixelsPerCm;
            
            // Успешное завершение - подсказываем записать измерение
            this.showHint(`Измерение готово! Удлинение: ${finalElongationCm.toFixed(2)} см. Нажмите "Записать измерение" для добавления в таблицу.`);
        }

        // === РЕЖИМ ДИНАМОМЕТРА (опциональная проверка) ===
        if (this.state.dynamometerAttached) {
            console.log('[DYNAMOMETER MODE - OPTIONAL CHECK] Вес подвешен к динамометру', {
                totalMass,
                theoreticalForce: force.toFixed(3) + ' Н'
            });

            this.showHint(`✓ Проверка: Груз ${weight.name} (${totalMass} г). Теоретическая сила: ${force.toFixed(2)} Н. Сравните с показанием динамометра!`);
            
            // Сохраняем показание для сравнения
            this.state.lastDynamometerReading = force;
            
            // Перерисовываем динамометр с новым показанием
            this.drawDynamic();
            
            // Обновляем отображение текущих измерений
            this.updateCurrentMeasurementDisplay(totalMass, force, 0);
        }

        this.state.isAnimating = false;
        console.log('[ATTACH-WEIGHT] Флаг isAnimating → false');
        this.renderWeightsInventory(); // ✅ Обновляем инвентарь после подвешивания
        this.updateRecordButton();
    }

    async animateSpringStretch(targetLength, mass) {
        return new Promise(resolve => {
            const startLength = this.state.springLength;
            const startTime = performance.now();
            const duration = 2500; // 2.5 секунды для более плавной анимации

            console.log('[ANIMATION] Запуск animateSpringStretch', {
                startLength,
                targetLength,
                mass,
                currentTime: startTime
            });

            const animateFrame = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Используем физику осцилляции из physics-engine
                const oscillation = springOscillation(
                    this.physics.springConstant,
                    mass,
                    (targetLength - startLength) / (this.physics.pixelsPerCm * 100), // м
                    elapsed / 1000 // сек
                );

                this.state.springLength = startLength + oscillation * this.physics.pixelsPerCm * 100;
                this.state.springElongation = this.state.springLength - this.state.springNaturalLength;

                this.updateVisualScale(this.state.springLength);

                // ОБНОВЛЯЕМ ПОКАЗАНИЯ В РЕАЛЬНОМ ВРЕМЕНИ во время колебаний
                const totalMass = this.state.attachedWeights.reduce((sum, item) => {
                    const def = this.getWeightById(item.id);
                    return sum + (def?.mass ?? 0);
                }, 0);
                const force = (totalMass / 1000) * this.physics.gravity;
                const currentElongationCm = this.state.springElongation / this.physics.pixelsPerCm;
                this.updateCurrentMeasurementDisplay(totalMass, force, currentElongationCm);

                if (progress < 1) {
                    requestAnimationFrame(animateFrame);
                } else {
                    // Фиксируем финальную длину
                    this.state.springLength = targetLength;
                    this.state.springElongation = targetLength - this.state.springNaturalLength;
                    this.updateVisualScale(this.state.springLength);
                    
                    // Финальное обновление показаний
                    const finalElongationCm = this.state.springElongation / this.physics.pixelsPerCm;
                    this.updateCurrentMeasurementDisplay(totalMass, force, finalElongationCm);
                    
                    console.log('[ANIMATION] Пройдено 100% времени, завершаем');
                    resolve();
                }
            };

            requestAnimationFrame(animateFrame);
        });
    }

    takeMeasurement(mass, elongationCm) {
        // Теперь только обновляем текущее отображение измерения
        // Реальная запись происходит по нажатию кнопки "Записать измерение"
        const force = (mass / 1000) * this.physics.gravity;
        
        console.log('[MEASURE] Измерение готово к записи', { mass, force, elongationCm });
        
        // Показатели уже обновлены в реальном времени, просто фиксируем финальное значение
        this.updateCurrentMeasurementDisplay(mass, force, elongationCm);

        // Активируем кнопку записи
        this.updateRecordButton();

        if (this.visualSettings.measurementParticles) {
            this.particleSystem.createSuccess(
                this.state.springPosition.x,
                this.state.springPosition.y + this.state.springLength
            );
        }

        // Звук (если есть)
        this.playSound('measurement');

        console.log('📊 Measurement ready to record:', { mass, force, elongationCm });
        
        // Обновляем прогресс шагов
        if (this.state.currentStep < 2) {
            this.state.currentStep = 2;
            this.updateProgress();
            this.handleStepChange();
        }

        if (this.state.measurements.length >= 3) {
            this.showHint(`✅ Отлично! ${this.state.measurements.length} измерения — результат вычислен автоматически.`);
        }
    }

    updateCurrentMeasurementDisplay(mass, force, elongationCm) {
        const massEl = document.getElementById('current-mass');
        const elongationEl = document.getElementById('current-elongation');

        if (massEl) {
            massEl.textContent = Number.isFinite(mass) ? mass.toFixed(0) : '—';
        }

        // Силу НЕ показываем автоматически - ученик должен снять с динамометра

        if (elongationEl) {
            elongationEl.textContent = Number.isFinite(elongationCm) ? elongationCm.toFixed(2) : '—';
        }
    }

    resetMeasurementDisplay() {
        this.updateCurrentMeasurementDisplay(NaN, NaN, NaN);
    }

    // Старый метод updateMeasurementsTable удалён - используется renderMeasurementsTable

    calculateSpringConstant() {
        const count = this.state.measurements.length;
        if (count === 0) {
            return null;
        }

        // Для одного измерения используем прямое отношение F/Δl (предварительный результат)
        if (count === 1) {
            const measurement = this.state.measurements[0];
            const elongationM = measurement.elongationM || (measurement.elongationCm / 100);
            if (elongationM <= 0) {
                return null;
            }

            const k = measurement.force / elongationM;
            return {
                k,
                r2: null,
                points: count,
                equation: `F = ${k.toFixed(1)} × Δl`,
                quality: 'Предварительно'
            };
        }

        // Подготовка данных для линейной регрессии (2 и более точек)
        const points = this.state.measurements.map(m => ({
            x: m.elongationM || (m.elongationCm / 100),
            y: m.force
        }));

        const regression = linearRegression(points);
        const springConstant = regression.slope;
        const r2 = regression.r2;

        return {
            k: springConstant,
            r2,
            points: count,
            equation: `F = ${springConstant.toFixed(1)} × Δl`,
            quality: r2 >= 0.98 ? 'Превосходно' : r2 >= 0.95 ? 'Отлично' : r2 >= 0.90 ? 'Хорошо' : 'Требует уточнения'
        };
    }

    updateResultDisplay() {
        const valueElement = document.getElementById('calculated-k');
        const accuracyContainer = document.getElementById('accuracy-indicator');
        const accuracyFill = accuracyContainer?.querySelector('.accuracy-fill');
        const accuracyLabel = accuracyContainer?.querySelector('.accuracy-label');

        if (!valueElement || !accuracyContainer || !accuracyFill || !accuracyLabel) {
            return;
        }

        const result = this.calculateSpringConstant();

        if (!result || !Number.isFinite(result.k)) {
            valueElement.textContent = '—';
            accuracyFill.style.width = '0%';
            accuracyLabel.textContent = 'Точность: требуется минимум одно измерение';
            this.updateCompletionState(false);
            return;
        }

        valueElement.textContent = result.k.toFixed(1);

        if (result.points === 1 || result.r2 === null) {
            accuracyFill.style.width = '35%';
            accuracyFill.style.background = 'rgba(255, 193, 7, 0.8)';
            accuracyLabel.textContent = 'Точность: предварительный результат (добавьте ещё измерения)';
            this.updateCompletionState(false);
        } else {
            const accuracyPercent = Math.min(100, Math.max(0, Math.round(result.r2 * 100)));
            accuracyFill.style.width = `${accuracyPercent}%`;
            accuracyFill.style.background = accuracyPercent > 90 ? 'rgba(0, 168, 107, 0.85)' : accuracyPercent > 75 ? 'rgba(255, 193, 7, 0.85)' : 'rgba(244, 67, 54, 0.85)';
            accuracyLabel.textContent = `Точность: R² = ${result.r2.toFixed(3)} (${result.quality})`;
            this.updateCompletionState(result.points >= 3 && result.r2 >= 0.9);
        }
    }

    resetResultDisplay() {
        const valueElement = document.getElementById('calculated-k');
        const accuracyContainer = document.getElementById('accuracy-indicator');
        const accuracyFill = accuracyContainer?.querySelector('.accuracy-fill');
        const accuracyLabel = accuracyContainer?.querySelector('.accuracy-label');

        if (!valueElement || !accuracyFill || !accuracyLabel) {
            return;
        }

        valueElement.textContent = '—';
        accuracyFill.style.width = '0%';
        accuracyFill.style.background = 'rgba(255,255,255,0.2)';
        accuracyLabel.textContent = 'Точность: пока нет данных';
        this.updateCompletionState(false);
    }

    updateCompletionState(ready) {
        const completeBtn = document.getElementById('btn-complete');
        if (!completeBtn) return;

        completeBtn.disabled = !ready;
        completeBtn.classList.toggle('pulse', ready);
    }

    showAchievement(result) {
        const popup = document.getElementById('achievement-popup');
        const title = popup.querySelector('h3');
        const desc = popup.querySelector('p');

        let stars = 3;
        if (result.r2 > 0.98) stars = 3;
        else if (result.r2 > 0.95) stars = 2;
        else stars = 1;

        title.textContent = `🎉 ${stars === 3 ? 'Превосходно' : stars === 2 ? 'Отлично' : 'Хорошо'}!`;
        desc.innerHTML = `
            Жёсткость пружины: <strong>${result.k.toFixed(1)} Н/м</strong><br>
            Точность: <strong>${result.quality}</strong><br>
            ${'⭐'.repeat(stars)}
        `;

        popup.classList.add('show');

        setTimeout(() => {
            popup.classList.remove('show');
        }, 5000);
    }

    setupEventListeners() {
        const helpButton = document.getElementById('btn-help');
        const resetButton = document.getElementById('btn-reset');
        const completeButton = document.getElementById('btn-complete');
        const settingsButton = document.getElementById('btn-settings');
        const recordButton = document.getElementById('btn-record-measurement');
        const calculateButton = document.getElementById('btn-calculate');
        const switchModeButton = document.getElementById('btn-switch-mode');

        helpButton?.addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'block';
        });

        resetButton?.addEventListener('click', () => {
            this.reset();
            this.showHint('Измерения сброшены. Начните заново с выбора пружины.');
        });

        completeButton?.addEventListener('click', () => {
            this.finishExperiment();
        });

        settingsButton?.addEventListener('click', () => {
            this.showHint('Настройки появятся позже. Пока продолжайте эксперимент!');
        });

        recordButton?.addEventListener('click', () => {
            console.log('[BUTTON-CLICK] Кнопка "Записать" нажата');
            this.recordMeasurementDirect();
        });

        calculateButton?.addEventListener('click', () => {
            this.calculateAndDisplayResult();
        });

        // УДАЛЕНО: switchModeButton - больше нет переключения этапов

        // Force input modal handlers
        document.getElementById('close-force-modal')?.addEventListener('click', () => {
            this.closeForceInputModal();
        });
        
        document.getElementById('cancel-force-input')?.addEventListener('click', () => {
            this.closeForceInputModal();
        });
        
        document.getElementById('confirm-force-input')?.addEventListener('click', () => {
            this.confirmForceInput();
        });
        
        document.querySelector('#help-modal .modal-close')?.addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'none';
        });
    }

    handleStepChange() {
        switch (this.state.currentStep) {
            case 1:
                this.showHint('📌 Шаг 1: Перетащите пружину из секции «Оборудование», затем подвесьте первый груз.');
                break;
            case 2:
                if (!this.state.springAttached) {
                    this.showHint('🔧 Установите пружину на штатив, затем подвесьте груз.');
                } else {
                    this.showHint('📊 Запишите измерение, затем добавьте ещё грузы для большей точности.');
                }
                break;
            case 3:
                this.showHint('📈 Расчёт жёсткости выполняется автоматически. Добавьте 3-5 измерений для высокой точности.');
                break;
            case 4:
                this.showHint('✅ Эксперимент завершён! Вы можете вернуться к комплекту или повторить измерения.');
                this.state.experimentComplete = true;
                break;
        }
    }

    updateProgress() {
        // Progress bar removed - method kept for compatibility
    }

    showHint(message) {
        const hintContainer = document.getElementById('hint-box');
        const hintText = document.getElementById('hint-text');
        if (!hintContainer || !hintText) return;

        hintContainer.style.display = 'flex';
        hintText.textContent = message;
        hintContainer.classList.add('pulse');
        setTimeout(() => {
            hintContainer.classList.remove('pulse');
        }, 2000);
    }

    showError(message) {
        alert(message); // TODO: красивый error popup
    }

    playSound(type) {
        // TODO: добавить звуковые эффекты
        // const audio = new Audio(`/assets/sounds/${type}.mp3`);
        // audio.play().catch(() => {});
    }

    // ═══════════════════════════════════════════════════════════
    //  НОВАЯ УПРОЩЁННАЯ ЛОГИКА ЗАПИСИ (БЕЗ МОДАЛОК!)
    // ═══════════════════════════════════════════════════════════

    /**
     * Прямая запись измерения - УПРОЩЁННАЯ ВЕРСИЯ
     */
    recordMeasurementDirect() {
        if (this.state.attachedWeights.length === 0) {
            this.showHint('Сначала подвесьте груз на пружину!');
            return;
        }

        const weightCount = this.state.attachedWeights.length;
        const totalMass = this.state.attachedWeights.reduce((sum, w) => {
            const weightDef = this.getWeightById(w.id);
            return sum + (weightDef?.mass || 0);
        }, 0);

        // АВТОМАТИЧЕСКИЙ расчёт силы F = mg
        const force = (totalMass / 1000) * this.physics.gravity;
        
        // Удлинение
        const elongationCm = this.state.springElongation / this.physics.pixelsPerCm;

        if (!elongationCm || elongationCm <= 0) {
            this.showHint('Ошибка: пружина не растянута!');
            return;
        }

        // Проверка дубликатов
        const isDuplicate = this.state.measurements.some(m => 
            m.weightCount === weightCount
        );

        if (isDuplicate) {
            this.showHint(`Измерение для ${weightCount} груза(ов) уже записано!`);
            return;
        }

        // ЗАПИСЬ ИЗМЕРЕНИЯ
        const measurement = {
            id: Date.now(),
            number: this.state.measurements.length + 1,
            weightCount: weightCount,
            mass: totalMass,
            force: force, // F = mg (автоматически!)
            elongationCm: elongationCm,
            elongationM: elongationCm / 100,
            stiffness: force / (elongationCm / 100), // k = F / Δl
            // Дополнительно: если есть показание динамометра
            dynamometerReading: this.state.lastDynamometerReading,
            dynamometerDiff: this.state.lastDynamometerReading ? 
                Math.abs(this.state.lastDynamometerReading - force) : null
        };

        this.state.measurements.push(measurement);
        
        console.log('[RECORD] Измерение записано:', measurement);

        // Обновляем UI
        this.renderMeasurementsTable();
        this.updateRecordButton();
        this.calculateAndDisplayFinalResult();
        this.updateProgress();
        
        // Показываем уведомление
        const diffText = measurement.dynamometerDiff !== null ? 
            ` (отклонение от динамометра: ${(measurement.dynamometerDiff * 100 / force).toFixed(1)}%)` : '';
        this.showToast(`✓ Записано: k = ${measurement.stiffness.toFixed(1)} Н/м${diffText}`);

        // Эффекты
        if (this.visualSettings?.measurementParticles) {
            this.particleSystem.createSuccess(
                this.state.springPosition.x,
                this.state.springPosition.y + this.state.springLength
            );
        }
        
        // Сбрасываем показание динамометра
        this.state.lastDynamometerReading = null;
    }

    /**
     * ЭТАП 1: Записать измерение силы
     */
    /**
     * @deprecated СТАРЫЙ МЕТОД: Используется только для обратной совместимости
     * Теперь используется recordMeasurementDirect() - упрощённая версия
     */
    recordForceMeasurement() {
        console.warn('[DEPRECATED] recordForceMeasurement() устарел, используйте recordMeasurementDirect()');
        // Перенаправляем на новый метод
        this.recordMeasurementDirect();
    }

    /**
     * @deprecated СТАРЫЙ МЕТОД: Используется только для обратной совместимости
     * Теперь используется recordMeasurementDirect() - упрощённая версия
     */
    recordStiffnessMeasurement() {
        console.warn('[DEPRECATED] recordStiffnessMeasurement() устарел, используйте recordMeasurementDirect()');
        // Перенаправляем на новый метод
        this.recordMeasurementDirect();
    }

    /**
     * Показать toast-уведомление
     */
    showToast(message) {
        // Удаляем старый toast если есть
        const oldToast = document.querySelector('.toast-notification');
        if (oldToast) {
            oldToast.remove();
        }

        // Создаём новый
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <span class="toast-icon">✓</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        // Автоматически удаляем через 3 секунды
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /**
     * Обновить прогресс-бар
     */
    updateProgress() {
        const progressIndicator = document.getElementById('progress-indicator');
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');

        if (!progressIndicator) return;

        if (this.state.experimentMode === 'dynamometer') {
            // ЭТАП 1
            const count = this.state.forces.length;
            const total = 3; // Минимум 3 измерения
            const percent = Math.min((count / total) * 100, 100);

            progressIndicator.style.display = 'block';
            progressText.textContent = `Измерено: ${count}/${total}`;
            progressFill.style.width = `${percent}%`;

        } else if (this.state.experimentMode === 'spring') {
            // ЭТАП 2
            const count = this.state.measurements.length;
            const total = 3; // Минимум 3 измерения
            const percent = Math.min((count / total) * 100, 100);
            progressIndicator.style.display = 'block';
            progressText.textContent = `Измерено: ${count}/${total}`;
            progressFill.style.width = `${percent}%`;
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  ОТРИСОВКА ТАБЛИЦЫ ИЗМЕРЕНИЙ
    // ═══════════════════════════════════════════════════════════

    /**
     * Отрисовка таблицы измерений
     */
    renderMeasurementsTable() {
        const tbody = document.getElementById('measurements-tbody');
        const tableTitle = document.getElementById('table-title');
        const tableCount = document.getElementById('table-count');
        const tableHeader = document.getElementById('table-header');
        const emptyMessage = document.getElementById('empty-message');
        
        if (!tbody) return;

        const measurements = this.state.measurements;

        // УПРОЩЁННЫЙ заголовок таблицы - без этапов!
        if (tableTitle) {
            tableTitle.innerHTML = `📊 Таблица измерений`;
        }

        // Обновляем счётчик
        if (tableCount) {
            const count = measurements.length;
            const word = count === 1 ? 'измерение' : (count >= 2 && count <= 4) ? 'измерения' : 'измерений';
            tableCount.textContent = `${count} ${word}`;
        }

        // ЕДИНАЯ структура таблицы
        if (tableHeader) {
            tableHeader.innerHTML = `
                <tr>
                    <th>№</th>
                    <th>m, г</th>
                    <th title="Сила упругости F = mg">F, Н</th>
                    <th title="Удлинение пружины">Δl, см</th>
                    <th title="Жёсткость k = F / Δl">k, Н/м</th>
                    <th></th>
                </tr>
            `;
        }

        // Если нет измерений
        if (measurements.length === 0) {
            if (emptyMessage) {
                emptyMessage.textContent = 'Подвесьте груз на пружину и нажмите "Записать"';
            }
            tbody.innerHTML = `<tr class="empty-state"><td colspan="6">Пока нет измерений</td></tr>`;
            return;
        }

        // Рендерим строки с ВСЕМИ данными
        tbody.innerHTML = measurements.map((m, index) => {
            // Показываем динамометр, если был
            const dynamometerHint = m.dynamometerReading ? 
                ` title="Проверка динамометром: ${m.dynamometerReading.toFixed(2)} Н (отклонение ${(m.dynamometerDiff * 100 / m.force).toFixed(1)}%)"` : '';
            
            return `
                <tr data-measurement-id="${m.id}" class="just-added">
                    <td>${index + 1}</td>
                    <td>${m.mass}</td>
                    <td${dynamometerHint}>${m.force.toFixed(2)}${m.dynamometerReading ? ' ✓' : ''}</td>
                    <td>${m.elongationCm.toFixed(2)}</td>
                    <td><strong>${m.stiffness.toFixed(1)}</strong></td>
                    <td>
                        <button class="btn-delete" onclick="experiment.deleteMeasurement(${m.id})">
                            ✕
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Убираем подсветку после 2 секунд
        setTimeout(() => {
            const rows = tbody.querySelectorAll('.just-added');
            rows.forEach(row => row.classList.remove('just-added'));
        }, 2000);
    }

    /**
     * Удалить измерение - УПРОЩЁННАЯ ВЕРСИЯ
     */
    deleteMeasurement(id) {
        this.state.measurements = this.state.measurements.filter(m => m.id !== id);
        this.renderMeasurementsTable();
        this.calculateAndDisplayFinalResult(); // Пересчитываем результат
        this.updateRecordButton();
        this.updateProgress();
        console.log('[DELETE] Измерение удалено:', id);
        this.showToast('Измерение удалено');
    }

    // ═══════════════════════════════════════════════════════════
    //  ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПОК И ЭЛЕМЕНТОВ UI
    // ═══════════════════════════════════════════════════════════

    /**
     * Обновить состояние кнопки "Записать"
     */
    updateRecordButton() {
        const btn = document.getElementById('btn-record-measurement');
        if (!btn) {
            console.warn('[UPDATE-BTN] Кнопка btn-record-measurement не найдена!');
            return;
        }

        const canRecord = this.state.attachedWeights.length > 0 && !this.state.isAnimating;
        btn.disabled = !canRecord;
        
        console.log('[UPDATE-BTN] Кнопка "Записать":', {
            attachedWeights: this.state.attachedWeights.length,
            isAnimating: this.state.isAnimating,
            canRecord,
            disabled: btn.disabled
        });
    }

    /**
     * Обновить состояние кнопки "Рассчитать"
     */
    updateCalculateButton() {
        const btn = document.getElementById('btn-calculate');
        if (!btn) return;

        btn.disabled = this.state.measurements.length === 0;
    }

    /**
     * Обновить видимость кнопки переключения на ЭТАП 2
     */
    // УДАЛЕНО: updateSwitchButton() - больше нет кнопки переключения этапов

    /**
     * Переключиться на ЭТАП 2 (измерение жёсткости)
     */
    // УДАЛЕНО: switchToStage2() - больше не нужен двухэтапный процесс

    // Рассчитать и отобразить результат
    /**
     * Автоматический расчёт и отображение результата (после каждой записи)
     */
    calculateAndDisplayFinalResult() {
        if (this.state.measurements.length === 0) {
            this.resetResultDisplay();
            return;
        }

        // Вычисляем жёсткость и обновляем отображение
        this.updateResultDisplay();

        // Проверяем возможность завершения
        const result = this.calculateSpringConstant();
        if (result && result.points >= 3 && result.r2 >= 0.9) {
            this.updateCompletionState(true);
            this.showHint('Отличная работа! Вы можете завершить эксперимент.');
        } else if (this.state.measurements.length < 3) {
            this.showHint('Добавьте ещё измерения для более точного результата (рекомендуется 3-5 точек).');
        } else {
            this.showHint('Результат рассчитан. Для повышения точности добавьте ещё измерения.');
        }
    }
    
    // Алиас для обратной совместимости
    calculateAndDisplayResult() {
        this.calculateAndDisplayFinalResult();
    }

    reset() {
        this.state.currentStep = 1;
        this.state.measurements = [];
        this.state.selectedWeights.clear();
    this.pendingWeightIds.clear();
        this.state.attachedWeights = [];
        this.state.weightAttached = false;
        this.state.currentWeight = null;
        this.state.currentWeightId = null;
        this.state.springLength = this.state.springNaturalLength;
        this.state.springElongation = 0;
        this.state.experimentComplete = false;

        this.visual.scale = 1;
        this.updateVisualScale(this.state.springLength);

        this.attachmentManager?.clear();

        document.querySelectorAll('.weight-item').forEach(item => {
            item.classList.remove('used');
            item.style.transform = '';
            item.setAttribute('data-x', 0);
            item.setAttribute('data-y', 0);
        });

        this.renderWeightsInventory();

        this.resetMeasurementDisplay();
        
        this.updateProgress();
        this.renderMeasurementsTable();
        this.updateRecordButton();
        this.updateCalculateButton();
        this.resetResultDisplay();

        console.log('🔄 Experiment reset');
    }

    resizeCanvases() {
        const container = document.querySelector('.canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        Object.values(this.canvases).forEach(canvas => {
            canvas.width = width;
            canvas.height = height;
        });

        this.updateVisualScale(this.state.springLength || this.state.springNaturalLength);

        // Redraw static elements
        this.drawBackground();
        this.drawEquipment();
    }

    getVisualPixelsPerCm() {
        return this.physics.pixelsPerCm * this.visual.scale;
    }

    getVisualLength(lengthPx = null) {
        const physicalLength = lengthPx ?? (this.state.springLength || this.state.springNaturalLength);
        return physicalLength * this.visual.scale;
    }

    estimateWeightStackHeight() {
        if (!this.state.attachedWeights?.length) {
            return 140;
        }

    const baseClearance = 60;
        return this.state.attachedWeights.reduce((total, item) => {
            const def = this.getWeightById(item.id);
            const hookGap = def?.hookGap ?? 28;
            const targetSize = def?.targetSize ?? 88;
            return total + hookGap + targetSize;
        }, baseClearance);
    }

    updateVisualScale(requiredLengthPx) {
        if (!Number.isFinite(requiredLengthPx)) {
            requiredLengthPx = this.state.springNaturalLength;
        }

        const canvas = this.canvases.dynamic;
        if (!canvas) {
            this.visual.scale = 1;
            return;
        }

        const anchorY = this.state.springPosition?.y ?? canvas.height * 0.25;
        const stackHeight = this.estimateWeightStackHeight();
        const available = canvas.height - anchorY - stackHeight - this.visual.marginBottom;

        if (available <= 0) {
            this.visual.scale = this.visual.minScale;
            return;
        }

        if (requiredLengthPx > available) {
            const proposed = available / requiredLengthPx;
            this.visual.scale = Math.max(this.visual.minScale, Math.min(1, proposed));
        } else {
            this.visual.scale = 1;
        }
    }

    drawBackground() {
        canvasUtils.clear(this.contexts.background);
    }

    drawEquipment() {
        const ctx = this.contexts.equipment;
        canvasUtils.clear(ctx);
    }

    drawDynamic() {
        const ctx = this.contexts.dynamic;
        
        // Полная очистка с сохранением контекста
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();

        const canvas = ctx.canvas;

        // Если установлен ДИНАМОМЕТР - рисуем только его
        if (this.state.dynamometerAttached) {
            this.drawDynamometerSetup(ctx);
            return;
        }

        // Если установлена ПРУЖИНА - рисуем установку с пружиной
        if (!this.state.springAttached) {
            this.drawSpringPlaceholder(ctx);
            return;
        }

        const anchor = this.getSpringAnchor();

        const physicalLength = this.state.springLength || this.state.springNaturalLength;
        const length = this.getVisualLength(physicalLength);
        const coils = 14;
        const wireRadius = 5;
        const springRadius = 22;

        // Название оборудования
        this.drawEquipmentLabel(ctx, anchor.x, anchor.y - 35);

        // Рисуем витки пружины как эллипсы
        this.drawSpringCoils(ctx, anchor, length, coils, springRadius, wireRadius);
        
        // Верхний крючок
        this.drawTopHook(ctx, anchor.x, anchor.y, wireRadius);
        
        // Нижний крючок
        this.drawBottomHook(ctx, anchor.x, anchor.y + length, wireRadius);

        // Подвешенные грузы
        this.drawAttachedWeights(ctx, anchor.x, anchor.y + length);
        
        // Измерительная линейка
        this.drawRuler(ctx, anchor.x + 80, anchor.y, physicalLength);
        
        // 🆕 Рисуем свободные грузы
        this.drawFreeWeights(ctx);
        
        // 🎯 Зона прилипания: если тащим груз, показываем куда можно прикрепить
        const draggedWeight = this.state.freeWeights?.find(w => w.isDragging);
        if (draggedWeight) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            
            // Зелёный круг вокруг нижнего крючка пружины
            const springBottomHookX = anchor.x;
            const springBottomHookY = anchor.y + length;
            ctx.beginPath();
            ctx.arc(springBottomHookX, springBottomHookY, 60, 0, Math.PI * 2);
            ctx.stroke();
            
            // Полупрозрачная заливка
            ctx.fillStyle = 'rgba(0, 255, 100, 0.1)';
            ctx.fill();
            
            ctx.restore();
        }
    }
    
    drawFreeWeights(ctx) {
        if (!this.state.freeWeights || this.state.freeWeights.length === 0) return;
        
        this.state.freeWeights.forEach(weight => {
            const weightDef = this.getWeightById(weight.weightId);
            if (!weightDef) return;
            
            const img = this.images.weights[weight.weightId] || this.images.weights[weightDef.id];
            const targetSize = weightDef.targetSize ?? 72;
            const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
            const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
            
            ctx.save();
            
            // 🎯 Проверяем близость к другим грузам (для соединения)
            let nearOtherWeight = false;
            if (weight.isDragging) {
                for (let other of this.state.freeWeights) {
                    if (other === weight) continue;
                    if (this.canStackWeights(other, weight)) {
                        nearOtherWeight = true;
                        break;
                    }
                }
            }
            
            // Подсветка при перетаскивании
            if (weight.isDragging) {
                if (nearOtherWeight) {
                    // Зелёное свечение = можно соединить!
                    ctx.shadowColor = 'rgba(0, 255, 100, 0.9)';
                    ctx.shadowBlur = 30;
                } else {
                    // Синее свечение = просто перетаскивание
                    ctx.shadowColor = 'rgba(0, 150, 255, 0.8)';
                    ctx.shadowBlur = 25;
                }
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            } else {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 5;
            }
            
            // Рисуем груз (используем ТОТ ЖЕ метод что и для подвешенных)
            if (img) {
                const scale = targetSize / Math.max(img.width, img.height);
                ctx.translate(weight.x, weight.y + renderedHeight / 2);
                ctx.scale(scale, scale);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
            } else {
                // Fallback: плейсхолдер
                this.drawWeightPlaceholder(ctx, weight.x, weight.y + renderedHeight / 2, targetSize, renderedHeight, 0);
            }
            
            ctx.restore();
            
            // 🔍 Рисуем крючки и зоны прилипания
            if (weight.isDragging) {
                ctx.save();
                ctx.strokeStyle = 'lime';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                
                // Верхний крючок (над грузом)
                const topHookY = weight.y - renderedHeight/2 - 12;
                ctx.beginPath();
                ctx.arc(weight.x, topHookY, 8, 0, Math.PI * 2);
                ctx.stroke();
                
                // Нижний крючок (под грузом)
                const bottomHookY = weight.y + renderedHeight/2 + 8;
                ctx.beginPath();
                ctx.arc(weight.x, bottomHookY, 8, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.restore();
            }
            
            // 🎯 Рисуем зоны прилипания других грузов
            if (!weight.isDragging) {
                ctx.save();
                
                // Проверяем есть ли перетаскиваемый груз рядом
                let showSnapZone = false;
                for (let other of this.state.freeWeights) {
                    if (!other.isDragging) continue;
                    if (this.canStackWeights(weight, other)) {
                        showSnapZone = true;
                        break;
                    }
                }
                
                if (showSnapZone) {
                    // Зелёный круг вокруг нижнего крючка = "можно прикрепить сюда"
                    const bottomHookY = weight.y + renderedHeight/2 + 8;
                    ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.arc(weight.x, bottomHookY, 30, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Заполнение
                    ctx.fillStyle = 'rgba(0, 255, 100, 0.15)';
                    ctx.fill();
                }
                
                ctx.restore();
            }
            
            // 🔗 Рисуем прикреплённые грузы (стопку)
            if (weight.stackedWeights && weight.stackedWeights.length > 0) {
                let offsetY = renderedHeight;
                
                weight.stackedWeights.forEach(stackedWeight => {
                    const stackedDef = this.getWeightById(stackedWeight.weightId || stackedWeight.id);
                    if (!stackedDef) return;
                    
                    const stackImg = this.images.weights[stackedWeight.weightId] || this.images.weights[stackedDef.id];
                    const stackTargetSize = stackedDef.targetSize ?? 72;
                    const stackScale = stackTargetSize / (stackImg ? Math.max(stackImg.width, stackImg.height) : stackTargetSize);
                    const stackHeight = stackImg ? stackImg.height * stackScale : stackTargetSize * 0.9;
                    
                    ctx.save();
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                    ctx.shadowBlur = 8;
                    ctx.shadowOffsetX = 3;
                    ctx.shadowOffsetY = 5;
                    
                    if (stackImg) {
                        ctx.translate(weight.x, weight.y + offsetY + stackHeight / 2);
                        ctx.scale(stackScale, stackScale);
                        ctx.drawImage(stackImg, -stackImg.width / 2, -stackImg.height / 2);
                    } else {
                        this.drawWeightPlaceholder(ctx, weight.x, weight.y + offsetY + stackHeight / 2, stackTargetSize, stackHeight, 0);
                    }
                    
                    ctx.restore();
                    
                    offsetY += stackHeight;
                });
            }
        });
    }

    drawSpringPlaceholder(ctx) {
        const canvas = ctx.canvas;
        const width = 240;
        const height = 320;
        const centerX = canvas.width * 0.5;
        const centerY = canvas.height * 0.35;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 168, 107, 0.45)';
        ctx.fillStyle = 'rgba(0, 168, 107, 0.08)';
        ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    ctx.fillRect(left, top, width, height);
    ctx.strokeRect(left, top, width, height);

        ctx.setLineDash([]);
        ctx.restore();
        
        // 🆕 Рисуем свободные грузы (даже когда нет пружины)
        this.drawFreeWeights(ctx);
    }

    drawEquipmentLabel(ctx, x, y) {
        ctx.save();
        
        // Подложка
        const attachedSpring = this.getAttachedSpring();
        const text = attachedSpring ? attachedSpring.name : 'Пружина';
        ctx.font = '14px "Fira Sans", Arial, sans-serif';
        const metrics = ctx.measureText(text);
        const padding = 12;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = 28;
        
        ctx.fillStyle = 'rgba(15, 20, 41, 0.85)';
        ctx.fillRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);
        
        ctx.strokeStyle = 'rgba(0, 168, 107, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);
        
        // Текст
        ctx.fillStyle = '#E8EAF6';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        
        ctx.restore();
    }

    drawRuler(ctx, x, y, physicalHeightPx) {
        const rulerWidth = 50;
        const cmToPx = this.getVisualPixelsPerCm();
        const canvas = ctx.canvas;

        // Поддерживаем растянутые пружины до 30 см, но ограничиваемся размерами канваса
        const maxCmByCanvas = Math.max(5, Math.floor((canvas.height - y - 20) / cmToPx));
        const maxCm = Math.min(30, maxCmByCanvas);
        const rulerHeight = maxCm * cmToPx;
        
        ctx.save();
        
        // Фон линейки
        const rulerBg = ctx.createLinearGradient(x, y, x + rulerWidth, y);
        rulerBg.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        rulerBg.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
        ctx.fillStyle = rulerBg;
        ctx.fillRect(x, y, rulerWidth, rulerHeight);
        
        // Рамка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, rulerWidth, rulerHeight);
        
        // Метки и цифры
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '11px "Fira Sans", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 1.5;
        
    for (let cm = 0; cm <= maxCm; cm++) {
            const markY = y + cm * cmToPx;
            
            // Главная метка (1 см)
            ctx.beginPath();
            ctx.moveTo(x, markY);
            ctx.lineTo(x + 20, markY);
            ctx.stroke();
            
            // Цифра
            if (cm % 1 === 0) {
                ctx.fillText(cm.toString(), x + 24, markY);
            }
            
            // Малые метки (0.5 см)
            if (cm < maxCm) {
                const halfMarkY = markY + cmToPx / 2;
                ctx.beginPath();
                ctx.moveTo(x, halfMarkY);
                ctx.lineTo(x + 12, halfMarkY);
                ctx.stroke();
            }
        }
        
        // Единица измерения
        ctx.save();
        ctx.font = 'bold 12px "Fira Sans", Arial, sans-serif';
        ctx.fillStyle = 'rgba(0, 168, 107, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('см', x + rulerWidth / 2, y - 12);
        ctx.restore();
        
        // Индикатор текущей длины пружины (только если в пределах линейки)
        const visualHeight = physicalHeightPx * this.visual.scale;

        if (visualHeight <= rulerHeight) {
            const indicatorY = y + visualHeight;
            
            // Стрелка-указатель на текущую длину
            ctx.save();
            ctx.fillStyle = 'rgba(255, 179, 0, 0.9)';
            ctx.beginPath();
            ctx.moveTo(x, indicatorY);
            ctx.lineTo(x - 8, indicatorY - 6);
            ctx.lineTo(x - 8, indicatorY + 6);
            ctx.closePath();
            ctx.fill();
            
            // Линия до пружины
            ctx.strokeStyle = 'rgba(255, 179, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x - 8, indicatorY);
            ctx.lineTo(x - 60, indicatorY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        } else {
            // Если пружина длиннее линейки, подсвечиваем низ линейки
            ctx.save();
            ctx.fillStyle = 'rgba(255, 179, 0, 0.8)';
            ctx.fillRect(x - 6, y + rulerHeight - 8, 12, 8);
            ctx.restore();
        }
        
        ctx.restore();
    }

    drawDynamometerSetup(ctx) {
        // Рисуем ТОЛЬКО динамометр (без установки) - это отдельный прибор!
        const canvas = ctx.canvas;
        const centerX = this.state.dynamometerPosition.x;
        const centerY = this.state.dynamometerPosition.y;
        
        const dynamometer = this.getEquipmentById(this.state.attachedDynamometerId);
        if (!dynamometer) return;
        
        const maxForce = dynamometer.maxForce; // 1Н или 5Н
        const scale = dynamometer.scale; // Цена деления
        
        // Размеры динамометра
        const width = 80;
        const height = 300;
        const scaleHeight = 200;
        
        ctx.save();
        
        // === КОРПУС ДИНАМОМЕТРА ===
        const gradient = ctx.createLinearGradient(centerX - width/2, centerY, centerX + width/2, centerY);
        gradient.addColorStop(0, 'rgba(220, 220, 220, 0.98)');
        gradient.addColorStop(0.5, 'rgba(240, 240, 240, 0.98)');
        gradient.addColorStop(1, 'rgba(220, 220, 220, 0.98)');
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - width/2, centerY, width, height);
        
        // Рамка корпуса
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - width/2, centerY, width, height);
        
        // === КРЮЧОК СВЕРХУ ===
        const topHookY = centerY - 15;
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, topHookY);
        ctx.stroke();
        
        // Кольцо крючка
        ctx.beginPath();
        ctx.arc(centerX, topHookY - 8, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // === НАЗВАНИЕ ПРИБОРА ===
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dynamometer.name, centerX, centerY + 25);
        
        // === ШКАЛА ===
        const scaleTop = centerY + 50;
        const scaleX = centerX;
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 1.5;
        
        // Вертикальная линия шкалы
        ctx.beginPath();
        ctx.moveTo(scaleX, scaleTop);
        ctx.lineTo(scaleX, scaleTop + scaleHeight);
        ctx.stroke();
        
        // Деления шкалы
        const numDivisions = maxForce / scale; // Количество делений
        for (let i = 0; i <= numDivisions; i++) {
            const markForce = i * scale;
            const markY = scaleTop + scaleHeight - (markForce / maxForce) * scaleHeight;
            
            // Главные деления (каждое)
            ctx.beginPath();
            ctx.moveTo(scaleX - 12, markY);
            ctx.lineTo(scaleX + 12, markY);
            ctx.stroke();
            
            // Цифры
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(markForce.toFixed(1), scaleX - 16, markY + 3);
        }
        
        // Единица измерения
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Н', scaleX + 30, scaleTop - 5);
        
        // === УКАЗАТЕЛЬ (СТРЕЛКА) ===
        // Рассчитываем текущую силу от подвешенных грузов
        const totalMass = this.state.attachedWeights.reduce((sum, w) => {
            const weightDef = this.getWeightById(w.id);
            return sum + (weightDef?.mass || 0);
        }, 0);
        const force = (totalMass / 1000) * this.physics.gravity;
        
        const indicatorY = scaleTop + scaleHeight - (Math.min(force, maxForce) / maxForce) * scaleHeight;
        
        // Красная стрелка
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.moveTo(scaleX + 15, indicatorY);
        ctx.lineTo(scaleX + 25, indicatorY - 5);
        ctx.lineTo(scaleX + 25, indicatorY + 5);
        ctx.closePath();
        ctx.fill();
        
        // Линия от шкалы до стрелки
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(scaleX + 12, indicatorY);
        ctx.lineTo(scaleX + 25, indicatorY);
        ctx.stroke();
        
        // === ЦИФРОВОЕ ТАБЛО ===
        ctx.fillStyle = 'rgba(255, 0, 0, 1)';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.textAlign = 'center';
        const displayText = force > maxForce ? `>${maxForce.toFixed(1)}` : force.toFixed(2);
        ctx.fillText(`${displayText} Н`, centerX, centerY + height - 20);
        
        // === НИЖНИЙ КРЮЧОК ДЛЯ ГРУЗОВ ===
        const bottomHookY = centerY + height;
        
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // Вертикальная часть
        ctx.beginPath();
        ctx.moveTo(centerX, bottomHookY);
        ctx.lineTo(centerX, bottomHookY + 15);
        ctx.stroke();
        
        // Кольцо для подвешивания груза
        ctx.beginPath();
        ctx.arc(centerX, bottomHookY + 23, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // === ПОДВЕШЕННЫЕ ГРУЗЫ ===
        const hookX = centerX;
        const gruzHookY = bottomHookY + 31; // Под кольцом крючка
        this.drawAttachedWeights(ctx, hookX, gruzHookY);
        
        // 🆕 Рисуем свободные грузы
        this.drawFreeWeights(ctx);
        
        // 🎯 Зона прилипания: если тащим груз, показываем куда можно прикрепить
        const draggedWeight = this.state.freeWeights?.find(w => w.isDragging);
        if (draggedWeight) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            
            // Зелёный круг вокруг нижнего крючка динамометра
            const dynBottomHookX = centerX;
            const dynBottomHookY = bottomHookY + 23;
            ctx.beginPath();
            ctx.arc(dynBottomHookX, dynBottomHookY, 60, 0, Math.PI * 2);
            ctx.stroke();
            
            // Полупрозрачная заливка
            ctx.fillStyle = 'rgba(0, 255, 100, 0.1)';
            ctx.fill();
            
            ctx.restore();
        }
    }

    drawSpringCoils(ctx, anchor, length, coils, springRadius, wireRadius) {
        const coilHeight = length / coils;
        
        // Контактная тень
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#0a0e18';
        ctx.filter = 'blur(8px)';
        for (let i = 0; i < coils; i++) {
            const y = anchor.y + i * coilHeight + coilHeight / 2;
            ctx.beginPath();
            ctx.ellipse(anchor.x + 2, y + 3, springRadius + 1, wireRadius + 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.filter = 'none';
        ctx.restore();

        // Витки пружины
        for (let i = 0; i < coils; i++) {
            const y = anchor.y + i * coilHeight + coilHeight / 2;
            const t = i / (coils - 1);
            
            // Тело витка
            ctx.save();
            const coilGrad = ctx.createLinearGradient(
                anchor.x - springRadius, y,
                anchor.x + springRadius, y
            );
            coilGrad.addColorStop(0, '#b8c2d0');
            coilGrad.addColorStop(0.2, '#e8ecf2');
            coilGrad.addColorStop(0.5, '#f8f9fb');
            coilGrad.addColorStop(0.8, '#d4dce6');
            coilGrad.addColorStop(1, '#9aa4b2');
            
            ctx.fillStyle = coilGrad;
            ctx.beginPath();
            ctx.ellipse(anchor.x, y, springRadius, wireRadius, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Обводка
            ctx.strokeStyle = 'rgba(80, 90, 105, 0.3)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.restore();
            
            // Блик на витке
            ctx.save();
            const hlGrad = ctx.createRadialGradient(
                anchor.x - springRadius * 0.3, y - wireRadius * 0.3, 0,
                anchor.x, y, springRadius * 0.6
            );
            hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            hlGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
            hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = hlGrad;
            ctx.beginPath();
            ctx.ellipse(anchor.x - springRadius * 0.2, y - wireRadius * 0.2, springRadius * 0.5, wireRadius * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawTopHook(ctx, x, y, wireRadius) {
        const hookRadius = wireRadius * 2;
        
        // Тень
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#0a0e18';
        ctx.filter = 'blur(4px)';
        ctx.beginPath();
        ctx.arc(x + 1, y + 2, hookRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
        
        // Тело крючка
        ctx.save();
        const hookGrad = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, hookRadius * 1.2);
        hookGrad.addColorStop(0, '#ffffff');
        hookGrad.addColorStop(0.4, '#e8ecf2');
        hookGrad.addColorStop(1, '#9aa4b2');
        ctx.fillStyle = hookGrad;
        ctx.beginPath();
        ctx.arc(x, y, hookRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Обводка
        ctx.strokeStyle = 'rgba(80, 90, 105, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        
        // Блик
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, hookRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawBottomHook(ctx, x, y, wireRadius) {
        const stemLength = 20;
        const hookWidth = 18;
        const hookHeight = 24;
        
        // Тень
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#0a0e18';
        ctx.filter = 'blur(6px)';
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 2);
        ctx.lineTo(x + 1, y + stemLength + 2);
        ctx.arc(x + 1, y + stemLength + hookHeight / 2 + 2, hookWidth / 2, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(x + 1, y + stemLength + 2);
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
        
        // Стержень
        ctx.save();
        const stemGrad = ctx.createLinearGradient(x - wireRadius, y, x + wireRadius, y);
        stemGrad.addColorStop(0, '#9aa4b2');
        stemGrad.addColorStop(0.5, '#e8ecf2');
        stemGrad.addColorStop(1, '#b8c2d0');
        ctx.fillStyle = stemGrad;
        ctx.fillRect(x - wireRadius, y, wireRadius * 2, stemLength);
        ctx.strokeStyle = 'rgba(80, 90, 105, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - wireRadius, y, wireRadius * 2, stemLength);
        ctx.restore();
        
        // Крючок (U-образный)
        ctx.save();
        ctx.lineWidth = wireRadius * 2;
        ctx.lineCap = 'round';
        const hookGrad = ctx.createLinearGradient(
            x - hookWidth / 2, y + stemLength,
            x + hookWidth / 2, y + stemLength + hookHeight
        );
        hookGrad.addColorStop(0, '#b8c2d0');
        hookGrad.addColorStop(0.3, '#e8ecf2');
        hookGrad.addColorStop(0.7, '#d4dce6');
        hookGrad.addColorStop(1, '#9aa4b2');
        ctx.strokeStyle = hookGrad;
        
        ctx.beginPath();
        ctx.arc(x, y + stemLength + hookHeight / 2, hookWidth / 2, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        
        // Обводка крючка
        ctx.strokeStyle = 'rgba(80, 90, 105, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y + stemLength + hookHeight / 2, hookWidth / 2, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.restore();
        
        // Блик на крючке
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x - 1, y + stemLength + hookHeight / 2 - 1, hookWidth / 2 - 2, Math.PI * 0.7, Math.PI * 1.3);
        ctx.stroke();
        ctx.restore();
    }

    drawAttachedWeights(ctx, hookX, hookY) {
        if (!this.state.weightAttached || !this.state.attachedWeights?.length) {
            return;
        }

        let currentY = hookY;
        const now = performance.now() / 1000;
        const baseTension = Math.min(1, 0.4 + (this.state.springElongation || 0) / 220);

        this.state.attachedWeights.forEach((item, index) => {
            const def = this.getWeightById(item.id);
            if (!def) {
                return;
            }

            const img = this.images.weights[item.id] || this.images.weights[def.id];
            const targetSize = def.targetSize ?? 72;
            const hookGap = def.hookGap ?? 22;
            const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
            const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
            
            // Более мягкое покачивание только во время анимации
            const rotationAmplitude = this.state.isAnimating ? 0.12 : 0.02;
            const rotation = Math.sin(now * 1.5 + index * 0.4) * rotationAmplitude;

            // Соединительный крючок (нить между грузом и пружиной)
            ctx.save();
            ctx.strokeStyle = 'rgba(180, 180, 180, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hookX, currentY);
            ctx.lineTo(hookX, currentY + hookGap);
            ctx.stroke();
            ctx.restore();

            const centerY = currentY + hookGap + renderedHeight / 2;

            if (img) {
                // Рисуем груз через реалистичный рендерер
                ctx.save();
                ctx.translate(hookX, centerY);
                ctx.rotate(rotation);
                
                const scale = targetSize / Math.max(img.width, img.height);
                ctx.scale(scale, scale);
                
                // Тень груза
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 5;
                
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                ctx.restore();
            } else {
                this.drawWeightPlaceholder(ctx, hookX, centerY, targetSize, renderedHeight, rotation);
            }

            currentY = centerY + renderedHeight / 2;
        });
    }

    drawWeightPlaceholder(ctx, x, y, width, height, rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        const w = width * 0.6;
        const h = height * 0.7;

        const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        gradient.addColorStop(0, '#8d99ae');
        gradient.addColorStop(0.5, '#edf2f4');
        gradient.addColorStop(1, '#8d99ae');

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#2b2d42';
        ctx.lineWidth = 2;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.restore();
    }

    // ===== Подготовка оборудования: перетаскивание пружины =====
    setupEquipmentDragListeners() {
        const dynamicCanvas = document.getElementById('canvas-dynamic');
        const interactionSurface = document.getElementById('drag-drop-overlay') || dynamicCanvas;

        if (!dynamicCanvas || !interactionSurface) {
            console.error('Interactive surface for spring drag not found');
            return;
        }
        
        const equipmentContainer = this.ui?.equipmentContainer;
        
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        let draggedFreeWeight = null; // 🆕 Ссылка на перетаскиваемый свободный груз
        
        // Проверка клика на пружину (проверяем область вокруг центра пружины)
        const getAnchor = () => ({
            x: this.state.springPosition?.x ?? dynamicCanvas.width * 0.5,
            y: this.state.springPosition?.y ?? dynamicCanvas.height * 0.15
        });

        const isClickOnSpring = (mouseX, mouseY) => {
            if (!this.state.springAttached) return false;
            const anchor = getAnchor();
            const length = this.getVisualLength();
            const springRadius = 30;

            return (
                mouseX >= anchor.x - springRadius &&
                mouseX <= anchor.x + springRadius &&
                mouseY >= anchor.y - 20 &&
                mouseY <= anchor.y + length + 40
            );
        };

        // Проверка клика на динамометр
        const isClickOnDynamometer = (mouseX, mouseY) => {
            if (!this.state.dynamometerAttached) return false;
            const pos = this.state.dynamometerPosition;
            const width = 80;
            const height = 300;

            return (
                mouseX >= pos.x - width / 2 &&
                mouseX <= pos.x + width / 2 &&
                mouseY >= pos.y - height / 2 &&
                mouseY <= pos.y + height / 2
            );
        };
        
        const handlePointerMove = (e) => {
            if (!isDragging) return;

            const rect = interactionSurface.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.lastPointer = { x: e.clientX, y: e.clientY };

            // 🆕 Перемещаем свободный груз
            if (isDragging === 'freeweight' && draggedFreeWeight) {
                draggedFreeWeight.x = x - dragOffset.x;
                draggedFreeWeight.y = y - dragOffset.y;
                this.drawDynamic();
                return;
            }

            // Перемещаем динамометр
            if (this.state.dynamometerAttached && isDragging === 'dynamometer') {
                const newX = x - dragOffset.x;
                const newY = y - dragOffset.y;
                this.state.dynamometerPosition = { x: newX, y: newY };
                this.drawDynamic();
                return;
            }

            // Пружина
            const newAnchorX = x - dragOffset.x;
            const newAnchorY = y - dragOffset.y;

            this.state.springPosition = { x: newAnchorX, y: newAnchorY };
            this.clampSpringPosition();

            this.updateVisualScale(this.state.springLength || this.state.springNaturalLength);

            const anchor = this.getSpringAnchor();
            this.springOffset = {
                x: anchor.x - dynamicCanvas.width * 0.5,
                y: anchor.y - dynamicCanvas.height * 0.15
            };

            this.drawDynamic();
        };

        const handlePointerUp = (e) => {
            if (!isDragging) return;

            const rect = interactionSurface.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);

            // 🆕 Обработка отпускания свободного груза
            if (isDragging === 'freeweight' && draggedFreeWeight) {
                draggedFreeWeight.isDragging = false;
                
                // Вычисляем позицию ВЕРХНЕГО КРЮЧКА груза
                const weightDef = this.getWeightById(draggedFreeWeight.weightId);
                const img = weightDef ? (this.images.weights[draggedFreeWeight.weightId] || this.images.weights[weightDef.id]) : null;
                const targetSize = weightDef?.targetSize ?? 72;
                const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
                const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
                
                // Верхний крючок груза (над грузом)
                const weightTopHookX = draggedFreeWeight.x;
                const weightTopHookY = draggedFreeWeight.y - renderedHeight/2 - 12;
                
                // Проверяем попадание на пружину
                if (this.state.springAttached) {
                    const anchor = getAnchor();
                    const springLength = this.state.springLength || this.state.springNaturalLength;
                    const springBottomHookX = anchor.x;
                    const springBottomHookY = anchor.y + springLength;
                    const distance = Math.hypot(weightTopHookX - springBottomHookX, weightTopHookY - springBottomHookY);
                    
                    console.log('[FREE-WEIGHTS] Check spring attach:', {
                        weightHook: [weightTopHookX.toFixed(1), weightTopHookY.toFixed(1)],
                        springHook: [springBottomHookX.toFixed(1), springBottomHookY.toFixed(1)],
                        distance: distance.toFixed(1),
                        threshold: 60
                    });
                    
                    if (distance < 60) {
                        console.log('[FREE-WEIGHTS] ✅ Attaching to spring');
                        this.attachFreeWeightToSpring(draggedFreeWeight);
                        draggedFreeWeight = null;
                        isDragging = false;
                        interactionSurface.style.cursor = 'default';
                        return;
                    }
                }
                
                // Проверяем попадание на динамометр
                if (this.state.dynamometerAttached) {
                    const dynPos = this.state.dynamometerPosition;
                    const dynBottomHookX = dynPos.x;
                    // Высота корпуса (300) + нижний крючок (23)
                    const dynBottomHookY = dynPos.y + 300 + 23;
                    const distance = Math.hypot(weightTopHookX - dynBottomHookX, weightTopHookY - dynBottomHookY);
                    
                    console.log('[FREE-WEIGHTS] Check dynamometer attach:', {
                        weightHook: [weightTopHookX.toFixed(1), weightTopHookY.toFixed(1)],
                        dynHook: [dynBottomHookX.toFixed(1), dynBottomHookY.toFixed(1)],
                        distance: distance.toFixed(1),
                        threshold: 60
                    });
                    
                    if (distance < 60) {
                        console.log('[FREE-WEIGHTS] ✅ Attaching to dynamometer');
                        this.attachFreeWeightToSpring(draggedFreeWeight);
                        draggedFreeWeight = null;
                        isDragging = false;
                        interactionSurface.style.cursor = 'default';
                        return;
                    }
                }
                
                // Проверяем соединение с другими грузами
                console.log('[FREE-WEIGHTS] Checking stacking with', this.state.freeWeights.length, 'weights');
                for (let otherWeight of this.state.freeWeights) {
                    if (otherWeight === draggedFreeWeight) {
                        console.log('[FREE-WEIGHTS] Skipping self');
                        continue;
                    }
                    console.log('[FREE-WEIGHTS] Testing stack with weight:', otherWeight.id.substring(0, 12));
                    if (this.canStackWeights(otherWeight, draggedFreeWeight)) {
                        console.log('[FREE-WEIGHTS] ✅ STACKING WEIGHTS!');
                        this.stackWeights(otherWeight, draggedFreeWeight);
                        this.showToast(`✓ Грузы объединены! Общая масса: ${otherWeight.mass}г`);
                        draggedFreeWeight = null;
                        isDragging = false;
                        interactionSurface.style.cursor = 'default';
                        this.drawDynamic();
                        return;
                    }
                }
                console.log('[FREE-WEIGHTS] No stacking possible');
                
                draggedFreeWeight = null;
                isDragging = false;
                interactionSurface.style.cursor = 'default';
                this.drawDynamic();
                return;
            }

            // Проверяем возврат в инвентарь (для обоих типов оборудования)
            if (equipmentContainer) {
                const containerRect = equipmentContainer.getBoundingClientRect();
                if (
                    e.clientX >= containerRect.left &&
                    e.clientX <= containerRect.right &&
                    e.clientY >= containerRect.top &&
                    e.clientY <= containerRect.bottom
                ) {
                    if (isDragging === 'dynamometer') {
                        this.detachDynamometerToInventory();
                    } else {
                        this.detachSpringToInventory();
                    }
                    isDragging = false;
                    interactionSurface.style.cursor = 'default';
                    return;
                }
            }

            if (isDragging === 'spring') {
                this.clampSpringPosition();
            }
            this.drawDynamic();

            isDragging = false;
            interactionSurface.style.cursor = 'default';
        };

        // Проверка клика на свободные грузы
        const findFreeWeightAt = (x, y) => {
            if (!this.state.freeWeights || this.state.freeWeights.length === 0) return null;
            for (let i = this.state.freeWeights.length - 1; i >= 0; i--) {
                const w = this.state.freeWeights[i];
                const halfWidth = w.width / 2;
                if (x >= w.x - halfWidth && x <= w.x + halfWidth &&
                    y >= w.y && y <= w.y + w.height) {
                    return w;
                }
            }
            return null;
        };

        interactionSurface.addEventListener('mousedown', (e) => {
            const rect = interactionSurface.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 🆕 ПРИОРИТЕТ 1: Проверяем свободные грузы (они сверху)
            const freeWeight = findFreeWeightAt(x, y);
            if (freeWeight) {
                isDragging = 'freeweight';
                draggedFreeWeight = freeWeight; // 🔧 Сохраняем ссылку
                dragOffset.x = x - freeWeight.x;
                dragOffset.y = y - freeWeight.y;
                freeWeight.isDragging = true;
                interactionSurface.style.cursor = 'grabbing';
                window.addEventListener('mousemove', handlePointerMove);
                window.addEventListener('mouseup', handlePointerUp);
                console.log('[FREE-WEIGHTS] Started dragging:', freeWeight.id);
                return;
            }
            
            // ПРИОРИТЕТ 2: Проверяем динамометр
            if (isClickOnDynamometer(x, y)) {
                isDragging = 'dynamometer';
                const pos = this.state.dynamometerPosition;
                dragOffset.x = x - pos.x;
                dragOffset.y = y - pos.y;
                interactionSurface.style.cursor = 'grabbing';
                window.addEventListener('mousemove', handlePointerMove);
                window.addEventListener('mouseup', handlePointerUp);
                return;
            }

            // ПРИОРИТЕТ 3: Затем пружину
            if (isClickOnSpring(x, y)) {
                isDragging = 'spring';
                const anchor = getAnchor();
                dragOffset.x = x - anchor.x;
                dragOffset.y = y - anchor.y;
                interactionSurface.style.cursor = 'grabbing';
                window.addEventListener('mousemove', handlePointerMove);
                window.addEventListener('mouseup', handlePointerUp);
            }
        });
        
        interactionSurface.addEventListener('mousemove', (e) => {
            if (isDragging) return;
            const rect = interactionSurface.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 🆕 Проверяем свободные грузы первыми
            const onFreeWeight = findFreeWeightAt(x, y);
            if (onFreeWeight) {
                interactionSurface.style.cursor = 'grab';
                return;
            }
            
            const onDynamometer = isClickOnDynamometer(x, y);
            const onSpring = isClickOnSpring(x, y);
            
            interactionSurface.style.cursor = (onDynamometer || onSpring) ? 'grab' : 'default';
        });
        
        console.log('✅ Spring drag enabled');
    }
    
    setupFreeWeightsDrag() {
        // 🆕 Логика перетаскивания свободных грузов интегрирована в setupEquipmentDragListeners()
        // Это сделано для избежания конфликтов обработчиков событий на canvas-ui
        console.log('✅ Free weights drag enabled (integrated with equipment drag)');
    }
    
    attachFreeWeightToSpring(freeWeight) {
        console.log('[ATTACH-FREE] 🎯 Подвешивание свободного груза:', {
            freeWeightId: freeWeight.id,
            weightId: freeWeight.weightId,
            mass: freeWeight.mass,
            hasStack: freeWeight.stackedWeights?.length > 0,
            stackSize: freeWeight.stackedWeights?.length || 0,
            currentFreeWeights: this.state.freeWeights.length
        });
        
        // Удаляем из свободных грузов
        const index = this.state.freeWeights.indexOf(freeWeight);
        if (index !== -1) {
            this.state.freeWeights.splice(index, 1);
            console.log('[ATTACH-FREE] ✅ Удалён из freeWeights, осталось:', this.state.freeWeights.length);
        } else {
            console.warn('[ATTACH-FREE] ⚠️ Груз не найден в freeWeights!');
        }
        
        console.log('[ATTACH-FREE] 📊 State перед подвешиванием:', {
            usedWeightIds: Array.from(this.state.usedWeightIds),
            selectedWeights: Array.from(this.state.selectedWeights)
        });
        
        // Подвешиваем ВЕРХНИЙ груз
        const weight = this.getWeightById(freeWeight.weightId);
        if (!weight) {
            console.error('[ATTACH-FREE] ❌ Груз не найден в инвентаре:', freeWeight.weightId);
            return;
        }
        
        console.log('[ATTACH-FREE] Вызов attachWeight для:', weight.id);
        this.attachWeight(weight);
        
        // 🆕 Если есть стопка - подвешиваем все грузы из неё
        if (freeWeight.stackedWeights && freeWeight.stackedWeights.length > 0) {
            console.log('[ATTACH-FREE] Подвешивание стопки из', freeWeight.stackedWeights.length, 'грузов');
            
            freeWeight.stackedWeights.forEach(stackedWeight => {
                const stackedDef = this.getWeightById(stackedWeight.weightId);
                if (stackedDef) {
                    console.log('[ATTACH-FREE] Добавление груза из стопки:', stackedDef.id);
                    this.addWeightToChain(stackedDef.id); // ✅ Используем центральную функцию
                } else {
                    console.warn('[ATTACH-FREE] ⚠️ Груз из стопки не найден:', stackedWeight.weightId);
                }
            });
            
            // Пересчитываем массу и обновляем пружину
            const totalMass = this.state.attachedWeights.reduce((sum, item) => {
                const def = this.getWeightById(item.id);
                return sum + (def?.mass ?? 0);
            }, 0);
            
            console.log('[ATTACH-FREE] Общая масса стопки:', totalMass, 'г');
            this.state.currentWeight = totalMass;
            
            const massKg = totalMass / 1000;
            const force = massKg * this.physics.gravity;
            const elongationM = force / this.physics.springConstant;
            const elongationPx = elongationM * 100 * this.physics.pixelsPerCm;
            const targetLength = this.state.springNaturalLength + elongationPx;
            
            this.updateVisualScale(targetLength);
            this.drawDynamic();
        }
        
        this.showToast(`✓ Груз ${freeWeight.mass}г подвешен!`);
    }
    
    removeFreeWeight(weightId) {
        // Убираем свободный груз с canvas и возвращаем в инвентарь
        console.log('[REMOVE-FREE] Удаление свободного груза:', weightId);
        
        // Ищем груз в freeWeights
        const freeWeightIndex = this.state.freeWeights.findIndex(fw => fw.weightId === weightId);
        
        if (freeWeightIndex !== -1) {
            const removedWeight = this.state.freeWeights[freeWeightIndex];
            
            // Удаляем из массива свободных
            this.state.freeWeights.splice(freeWeightIndex, 1);
            
            // Если груз был в стопке, тоже возвращаем все грузы
            if (removedWeight.stackedWeights && removedWeight.stackedWeights.length > 0) {
                removedWeight.stackedWeights.forEach(sw => {
                    this.state.usedWeightIds.delete(sw.weightId);
                    console.log('[REMOVE-FREE] Возврат груза из стопки:', sw.weightId);
                });
            }
            
            console.log('[REMOVE-FREE] Груз удалён, осталось свободных:', this.state.freeWeights.length);
        }
        
        // Убираем из usedWeightIds
        this.state.usedWeightIds.delete(weightId);
        this.state.selectedWeights.delete(weightId);
        
        // Обновляем UI
        this.renderWeightsInventory();
        this.drawDynamic();
        this.showToast('✓ Груз возвращён в инвентарь');
    }
    
    canStackWeights(weight1, weight2) {
        // Проверяем, можно ли соединить грузы
        // weight1 — нижний (на котором будет висеть weight2)
        // weight2 — верхний (который подвешиваем)
        
        const weightDef1 = this.getWeightById(weight1.weightId);
        const weightDef2 = this.getWeightById(weight2.weightId);
        
        if (!weightDef1 || !weightDef2) return false;
        
        // Рассчитываем РЕАЛЬНУЮ высоту рендеринга (как в drawFreeWeights)
        const img1 = this.images.weights[weight1.weightId] || this.images.weights[weightDef1.id];
        const img2 = this.images.weights[weight2.weightId] || this.images.weights[weightDef2.id];
        
        const targetSize1 = weightDef1.targetSize ?? 72;
        const targetSize2 = weightDef2.targetSize ?? 72;
        
        const renderScale1 = targetSize1 / (img1 ? Math.max(img1.width, img1.height) : targetSize1);
        const renderScale2 = targetSize2 / (img2 ? Math.max(img2.width, img2.height) : targetSize2);
        
        const renderedHeight1 = img1 ? img1.height * renderScale1 : targetSize1 * 0.9;
        const renderedHeight2 = img2 ? img2.height * renderScale2 : targetSize2 * 0.9;
        
        // weight.y — это ЦЕНТР груза
        // Нижний крючок weight1 находится на расстоянии renderedHeight1/2 + 8px ниже центра
        const hook1Y = weight1.y + renderedHeight1/2 + 8;
        // Верхний крючок weight2 находится на расстоянии renderedHeight2/2 + 12px выше центра
        const hook2Y = weight2.y - renderedHeight2/2 - 12;
        
        const distanceX = Math.abs(weight1.x - weight2.x);
        const distanceY = Math.abs(hook1Y - hook2Y);
        
        // Строгое условие: крючки должны быть ОЧЕНЬ близко
        const canStack = distanceX < 30 && distanceY < 30;
        
        if (weight2.isDragging) {
            console.log('[STACK-CHECK]', {
                w1: weight1.id.substring(0, 12),
                w2: weight2.id.substring(0, 12),
                'w1.y': weight1.y.toFixed(1),
                'w2.y': weight2.y.toFixed(1),
                'h1': renderedHeight1.toFixed(1),
                'h2': renderedHeight2.toFixed(1),
                'hook1Y': hook1Y.toFixed(1),
                'hook2Y': hook2Y.toFixed(1),
                'dX': distanceX.toFixed(1),
                'dY': distanceY.toFixed(1),
                '✅': canStack ? 'CAN STACK!' : 'too far'
            });
        }
        
        return canStack;
    }
    
    stackWeights(topWeight, bottomWeight) {
        // Соединяем грузы в стопку
        if (!topWeight.stackedWeights) {
            topWeight.stackedWeights = [];
        }
        
        // Удаляем нижний груз из freeWeights
        const index = this.state.freeWeights.indexOf(bottomWeight);
        if (index !== -1) {
            this.state.freeWeights.splice(index, 1);
        }
        
        // Добавляем к стопке
        topWeight.stackedWeights.push(bottomWeight);
        topWeight.mass += bottomWeight.mass;
        
        // Рекурсивно добавляем вложенные грузы
        if (bottomWeight.stackedWeights) {
            bottomWeight.stackedWeights.forEach(w => {
                topWeight.stackedWeights.push(w);
                topWeight.mass += w.mass;
            });
        }
        
        console.log('[STACK] Weights stacked:', topWeight.mass, 'г');
        this.drawDynamic();
    }

    attachSpringToClamp() {
        // Временно отключено
        console.log('🔧 attachSpringToClamp - disabled for clean slate');
    }

    animate(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update particles
        this.particleSystem.update(deltaTime);

        // Compute spring velocity for motion blur
        const currentLength = this.state.springLength || 140; // компактная реалистичная длина
        if (this.prevSpringLength !== null && deltaTime > 0) {
            this.springVelocity = (currentLength - this.prevSpringLength) / deltaTime; // px/s
        }
        this.prevSpringLength = currentLength;

        // Render dynamic layers
        this.drawDynamic();
        this.particleSystem.render();

        // Continue loop
        requestAnimationFrame((time) => this.animate(time));
    }
}

class AttachmentManager {
    constructor(experiment) {
        this.experiment = experiment;
        this.queue = [];
        this.processing = false;
    }

    enqueue(job) {
        return new Promise((resolve, reject) => {
            this.queue.push({ ...job, resolve, reject });
            console.log('[QUEUE] Добавлена задача подвешивания', {
                weightId: job.weightId ?? job.weight?.id,
                pending: this.queue.length,
                processing: this.processing
            });
            this.processQueue();
        });
    }

    clear() {
        this.queue.length = 0;
    }

    isBusy() {
        return this.processing;
    }

    async processQueue() {
        if (this.processing) {
            return;
        }

        const nextJob = this.queue.shift();
        if (!nextJob) {
            return;
        }

        this.processing = true;

        console.log('[QUEUE] Начало обработки задачи', {
            weightId: nextJob.weightId ?? nextJob.weight?.id
        });

        try {
            await this.experiment.attachWeight(nextJob.weight);
            nextJob.resolve();
        } catch (error) {
            nextJob.reject(error);
        } finally {
            console.log('[QUEUE] Завершение обработки задачи');
            this.processing = false;
            this.processQueue();
        }
    }
}

// Initialize experiment when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if all required libraries are loaded
    if (typeof ParticleSystem === 'undefined') {
        console.error('❌ ParticleSystem not loaded! Check particle-effects.js');
        alert('Ошибка загрузки: ParticleSystem не найден');
        return;
        const container = document.getElementById('canvas-container') || document.querySelector('.canvas-container');
        if (!container) return;
        const update = (e) => {
            const rect = container.getBoundingClientRect();
            this.pointer.x = e.clientX - rect.left;
            this.pointer.y = e.clientY - rect.top;
        };
        container.addEventListener('mousemove', (e) => { this.pointer.over = true; update(e); });
        container.addEventListener('mouseenter', (e) => { this.pointer.over = true; update(e); });
        container.addEventListener('mouseleave', () => { this.pointer.over = false; });
    }
    
    if (typeof canvasUtils === 'undefined') {
        console.error('❌ canvasUtils not loaded! Check canvas-utils.js');
        alert('Ошибка загрузки: canvasUtils не найден');
        return;
    }
    
    if (typeof springOscillation === 'undefined') {
        console.error('❌ Physics engine not loaded! Check physics-engine.js');
        alert('Ошибка загрузки: physics-engine не найден');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js not loaded!');
        alert('Ошибка загрузки: Chart.js не найден');
        return;
    }
    
    if (typeof interact === 'undefined') {
        console.error('❌ interact.js not loaded!');
        alert('Ошибка загрузки: interact.js не найден');
        return;
    }
    
    // All libraries loaded, initialize experiment
    console.log('✅ All libraries loaded successfully');
    window.experiment = new SpringExperiment();
    console.log('🚀 Spring Experiment loaded!');
});
