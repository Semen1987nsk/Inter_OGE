/**
 * Experiment 1: Определение жёсткости пружины
 * Interactive Spring Stiffness Measurement
 */

import { FreeformManager } from '../shared/freeform-manager.js';
import { ParticleSystem } from '../shared/particle-effects.js';
import { RealisticRenderer } from '../shared/realistic-renderer.js';
import { PhysicsEngine } from '../shared/physics-engine.js';
import { CanvasUtils } from '../shared/canvas-utils.js';
import { TouchDiagnostics } from '../shared/touch-diagnostics.js';
import { Magnifier } from '../shared/magnifier.js';
import { PHYSICS_CONFIG, VISUAL_CONFIG, LAYOUT_CONFIG, EQUIPMENT_CONFIG, WEIGHTS_INVENTORY } from './experiment-config.js';

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

        // 🚀 ОПТИМИЗАЦИЯ: Offscreen canvas для кеширования пружины
        this.springCache = {
            canvas: document.createElement('canvas'),
            needsUpdate: true,
            lastLength: null,
            lastCoils: null
        };
        this.springCache.canvas.width = 200;
        this.springCache.canvas.height = 600;
        this.springCache.ctx = this.springCache.canvas.getContext('2d');

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
            attachedWeights: [], // ⛓️ Массив: сохраняет ПОРЯДОК цепочки грузов (LIFO)
            selectedWeights: new Set(), // 🔍 Set: быстрая O(1) проверка "груз подвешен?" (индекс для attachedWeights)
            experimentComplete: false,
            // Опциональная проверка на динамометре
            dynamometerCheckMode: false, // Режим проверки силы на динамометре
            lastDynamometerReading: null, // Последнее показание динамометра
            // 🆕 Свободные грузы на столе
            freeWeights: [], // Грузы, размещённые на canvas, но не подвешенные
            // 🆕 Учёт использованных грузов
            usedWeightIds: new Set(), // 🔧 ID грузов, размещённых СВОБОДНО на canvas (НЕ подвешенных!)
            // 🆕 Записанные значения для расчёта
            recordedForce: null, // Записанное значение силы F
            recordedElongation: null // Записанное значение удлинения Δl
        };

        this.springDragged = false;
        this.pendingWeightIds = new Set();

        // Конфигурация планшета с пружиной (используем фото реального оборудования)
        this.layout = JSON.parse(JSON.stringify(LAYOUT_CONFIG));

        this.updateRigGeometry();

        // Physics constants
        this.physics = { ...PHYSICS_CONFIG };

        // Images
        this.images = {
            springBoard: null,
            weights: {}
        };

        // Systems
        this.particleSystem = new ParticleSystem(this.canvases.particles);
        this.realisticRenderer = new RealisticRenderer(this.contexts.dynamic);
        this.physicsEngine = new PhysicsEngine(); // Instance for calculations
        this.magnifier = new Magnifier(this.canvases.dynamic, this.canvases.ui); // Magnifier tool
        
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
            scale: VISUAL_CONFIG.scale,
            minScale: VISUAL_CONFIG.minScale,
            marginTop: VISUAL_CONFIG.marginTop,
            marginBottom: VISUAL_CONFIG.marginBottom
        };

        // UI references
        this.ui = {
            equipmentContainer: document.getElementById('equipment-container'),
            weightsContainer: document.getElementById('weights-container')
        };

        // Visual configuration toggles
        this.visualSettings = {
            measurementParticles: VISUAL_CONFIG.measurementParticles,
            completionConfetti: VISUAL_CONFIG.completionConfetti
        };

        // Inventory metadata
        this.equipment = JSON.parse(JSON.stringify(EQUIPMENT_CONFIG));

        // Набор грузов комплекта №2 (ФИПИ ОГЭ 2025)
        this.weightsInventory = JSON.parse(JSON.stringify(WEIGHTS_INVENTORY));

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
            // 🔧 CRITICAL FIX: Настраиваем Interact.js для полной поддержки touch событий
            if (typeof interact !== 'undefined') {
                // Отключаем autoScroll чтобы избежать конфликтов с touch-action: none
                // interact.autoScroll API отличается в разных версиях;
                // попробуем безопасно отключить автоскролл если функция доступна,
                // иначе используем опцию autoScroll в draggable конфигурации.
                try {
                    if (typeof interact.autoScroll === 'function') {
                        interact.autoScroll(false);
                    } else if (typeof interact.settings === 'object') {
                        // Некоторые сборки expose settings
                        interact.settings.autoScroll = false;
                    } else {
                        console.log('[DRAG] autoScroll API not available - will rely on draggable.autoScroll option');
                    }
                } catch (err) {
                    console.warn('[DRAG] autoScroll disable failed:', err && err.message);
                }
                
                console.log('✅ Interact.js configured for touch support');
                console.log('   - autoScroll: disabled');
                console.log('   - Touch device:', ('ontouchstart' in window));
            } else {
                console.error('❌ Interact.js not loaded!');
            }
            
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

            // ✅ Инициализация состояния кнопок нового окна измерений
            this.updateRecordForceButton();
            this.updateRecordElongationButton();
            this.updateCalculateStiffnessButton();

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

    /**
     * 🔧 ИСПРАВЛЕНИЕ: Получить полную массу груза с учетом сборных дисков
     * @param {Object} weight - объект груза из attachedWeights
     * @returns {number} - полная масса в граммах
     */
    getTotalWeightMass(weight) {
        if (!weight) return 0;
        
        const weightDef = this.getWeightById(weight.id);
        let mass = weightDef?.mass || 0;
        
        // Добавляем массу дисков сборного груза
        if (weight.compositeDisks && Array.isArray(weight.compositeDisks)) {
            weight.compositeDisks.forEach(disk => {
                const diskDef = this.getWeightById(disk.weightId);
                if (diskDef) {
                    mass += diskDef.mass;
                }
            });
        }
        
        return mass;
    }

    /**
     * 🔧 ИСПРАВЛЕНИЕ: Получить суммарную массу всех прикрепленных грузов
     * @returns {number} - суммарная масса в граммах
     */
    getTotalAttachedMass() {
        return this.state.attachedWeights.reduce((sum, w) => {
            return sum + this.getTotalWeightMass(w);
        }, 0);
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

            // 🎨 Визуальное изображение оборудования
            const figure = document.createElement('div');
            figure.className = 'equipment-figure';
            
            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 120;
            canvas.className = 'equipment-preview';
            
            const ctx = canvas.getContext('2d');
            if (isDynamometer) {
                this.drawDynamometerPreview(ctx, equipment);
            } else if (isSpring) {
                this.drawSpringPreview(ctx, equipment);
            }
            
            figure.appendChild(canvas);
            item.appendChild(figure);

            const title = document.createElement('div');
            title.className = 'equipment-title';
            title.textContent = equipment.name;

            const status = document.createElement('div');
            status.className = 'equipment-status';
            status.textContent = isAttached ? 'На установке' : 'В комплекте';

            item.append(title, status);

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

    /**
     * 🎨 Отрисовка миниатюры динамометра для инвентаря
     */
    drawDynamometerPreview(ctx, dynamometer) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Размеры динамометра
        const bodyWidth = 30;
        const bodyHeight = 80;
        const centerX = width / 2;
        const centerY = height / 2;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        
        // Корпус
        const gradient = ctx.createLinearGradient(centerX - bodyWidth/2, centerY - bodyHeight/2, 
                                                   centerX + bodyWidth/2, centerY - bodyHeight/2);
        gradient.addColorStop(0, '#dcdcdc');
        gradient.addColorStop(0.5, '#f0f0f0');
        gradient.addColorStop(1, '#dcdcdc');
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - bodyWidth/2, centerY - bodyHeight/2, bodyWidth, bodyHeight);
        
        // Рамка корпуса
        ctx.strokeStyle = '#505050';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - bodyWidth/2, centerY - bodyHeight/2, bodyWidth, bodyHeight);
        
        // Верхний крючок
        ctx.strokeStyle = '#969696';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - bodyHeight/2);
        ctx.lineTo(centerX, centerY - bodyHeight/2 - 8);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY - bodyHeight/2 - 12, 4, 0, Math.PI * 2);
        ctx.stroke();
        
        // Шкала (упрощенная)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - bodyHeight/2 + 10);
        ctx.lineTo(centerX, centerY + bodyHeight/2 - 15);
        ctx.stroke();
        
        // Несколько делений
        for (let i = 0; i <= 4; i++) {
            const y = centerY - bodyHeight/2 + 10 + i * 13;
            ctx.beginPath();
            ctx.moveTo(centerX - 4, y);
            ctx.lineTo(centerX + 4, y);
            ctx.stroke();
        }
        
        // Название
        ctx.fillStyle = '#000';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dynamometer.maxForce + 'Н', centerX, centerY + bodyHeight/2 - 5);
        
        // Нижний крючок
        ctx.strokeStyle = '#969696';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + bodyHeight/2);
        ctx.lineTo(centerX, centerY + bodyHeight/2 + 8);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY + bodyHeight/2 + 12, 4, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * 🎨 Отрисовка миниатюры пружины для инвентаря
     */
    drawSpringPreview(ctx, spring) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        const centerX = width / 2;
        const topY = 15;
        const springHeight = 70;
        const coils = 8;
        const springRadius = 8;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        
        // Верхнее крепление
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#888';
        ctx.fillRect(centerX - 15, topY - 5, 30, 5);
        ctx.strokeRect(centerX - 15, topY - 5, 30, 5);
        
        // Витки пружины (металлический цвет)
        const gradient = ctx.createLinearGradient(centerX - springRadius, 0, centerX + springRadius, 0);
        gradient.addColorStop(0, '#A0A0A0');
        gradient.addColorStop(0.3, '#D0D0D0');
        gradient.addColorStop(0.5, '#E8E8E8');
        gradient.addColorStop(0.7, '#D0D0D0');
        gradient.addColorStop(1, '#A0A0A0');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const coilHeight = springHeight / coils;
        
        for (let i = 0; i < coils; i++) {
            const y1 = topY + i * coilHeight;
            const y2 = topY + (i + 0.5) * coilHeight;
            const y3 = topY + (i + 1) * coilHeight;
            
            ctx.beginPath();
            ctx.moveTo(centerX, y1);
            ctx.quadraticCurveTo(centerX + springRadius, y1 + coilHeight * 0.25, centerX + springRadius, y2);
            ctx.quadraticCurveTo(centerX + springRadius, y2 + coilHeight * 0.25, centerX, y3);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX, y1);
            ctx.quadraticCurveTo(centerX - springRadius, y1 + coilHeight * 0.25, centerX - springRadius, y2);
            ctx.quadraticCurveTo(centerX - springRadius, y2 + coilHeight * 0.25, centerX, y3);
            ctx.stroke();
        }
        
        // Нижний крючок
        const bottomY = topY + springHeight;
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(centerX, bottomY);
        ctx.lineTo(centerX, bottomY + 10);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, bottomY + 15, 4, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * � Генерировать текст статуса для груза
     */
    getWeightStatusText(weightState) {
        if (!weightState.found) return 'Неизвестно';
        
        const weight = weightState.weight;
        
        switch (weightState.state) {
            case 'pending':
                return 'Подвешивается…';
                
            case 'attached-last':
            case 'attached-middle':
                const equipmentName = this.state.dynamometerAttached ? 'динамометре' : 'пружине';
                const chainInfo = weightState.positionInChain ? ` (${weightState.positionInChain}-й в цепочке)` : '';
                return `На ${equipmentName}${chainInfo}`;
                
            case 'attached-composite-disk':
                const parentRod = this.getWeightById(weightState.parentRodId);
                const parentEquipmentName = this.state.dynamometerAttached ? 'динамометре' : 'пружине';
                return `На штанге (${parentEquipmentName})`;
                
            case 'free-on-canvas':
                if (weightState.freeWeight?.compositeDisks?.length > 0) {
                    const disksCount = weightState.freeWeight.compositeDisks.length;
                    const totalMass = weightState.freeWeight.mass;
                    const diskWord = disksCount === 1 ? 'диск' : (disksCount > 4 ? 'дисков' : 'диска');
                    return `На столе (${disksCount} ${diskWord}, ${totalMass}г)`;
                } else if (weightState.freeWeight?.stackedWeights?.length > 0) {
                    const stackCount = weightState.freeWeight.stackedWeights.length;
                    const gruzWord = stackCount === 1 ? 'грузом' : 'грузами';
                    return `На столе (сцеплен с ${stackCount} ${gruzWord})`;
                } else {
                    return 'На столе';
                }
                
            case 'free-composite-disk':
                const freeRod = this.getWeightById(weightState.freeRodId);
                return `На штанге (стол)`;
                
            case 'free-in-stack':
                return 'На столе (в стопке)';
                
            case 'available':
            default:
                return 'В комплекте';
        }
    }

    /**
     * �🔍 НОВАЯ ФУНКЦИЯ: Определить ТОЧНОЕ состояние груза
     * Возвращает объект с полной информацией о грузе
     */
    getWeightState(weightId) {
        const weight = this.getWeightById(weightId);
        if (!weight) {
            return { found: false };
        }

        // 1️⃣ ПРОВЕРЯЕМ: Груз подвешен напрямую?
        const isDirectlyAttached = this.state.selectedWeights.has(weightId);
        
        // 2️⃣ ПРОВЕРЯЕМ: Груз в цепочке attachedWeights?
        const attachedIndex = this.state.attachedWeights.findIndex(w => w.id === weightId);
        const isInChain = attachedIndex !== -1;
        const positionInChain = isInChain ? attachedIndex + 1 : null;
        const isLastInChain = isInChain && attachedIndex === this.state.attachedWeights.length - 1;
        
        // 3️⃣ ПРОВЕРЯЕМ: Груз - часть ПОДВЕШЕННОГО наборного груза (диск на подвешенной штанге)?
        let isPartOfAttachedComposite = false;
        let parentRodId = null;
        if (weight.isCompositeDisk && isInChain) {
            // Ищем штангу, которая содержит этот диск
            for (const attachedWeight of this.state.attachedWeights) {
                if (attachedWeight.compositeDisks?.some(d => d.weightId === weightId)) {
                    isPartOfAttachedComposite = true;
                    parentRodId = attachedWeight.id;
                    break;
                }
            }
        }
        
        // 4️⃣ ПРОВЕРЯЕМ: Груз свободен на canvas?
        const freeWeight = this.state.freeWeights?.find(fw => fw.weightId === weightId);
        const isFreeOnCanvas = !!freeWeight && !isDirectlyAttached;
        
        // 5️⃣ ПРОВЕРЯЕМ: Груз - часть СВОБОДНОГО наборного груза (диск на свободной штанге)?
        let isPartOfFreeComposite = false;
        let freeRodId = null;
        if (weight.isCompositeDisk && !isFreeOnCanvas) {
            for (const fw of this.state.freeWeights || []) {
                if (fw.compositeDisks?.some(d => d.weightId === weightId)) {
                    isPartOfFreeComposite = true;
                    freeRodId = fw.weightId;
                    break;
                }
            }
        }
        
        // 6️⃣ ПРОВЕРЯЕМ: Груз - часть стопки на canvas?
        let isPartOfFreeStack = false;
        let stackBottomWeightId = null;
        if (!isFreeOnCanvas && !isPartOfFreeComposite) {
            for (const fw of this.state.freeWeights || []) {
                if (fw.stackedWeights?.some(sw => sw.weightId === weightId)) {
                    isPartOfFreeStack = true;
                    stackBottomWeightId = fw.weightId;
                    break;
                }
            }
        }
        
        // 7️⃣ ПРОВЕРЯЕМ: Груз pending (в процессе подвешивания)?
        const isPending = this.pendingWeightIds.has(weightId);
        
        // 8️⃣ ОПРЕДЕЛЯЕМ ФИНАЛЬНОЕ СОСТОЯНИЕ
        let state = 'available'; // в комплекте
        let canRemove = false;
        let removeAction = null;
        let buttonText = null;
        
        if (isPending) {
            state = 'pending';
        } else if (isPartOfAttachedComposite) {
            state = 'attached-composite-disk';
            // Диск на подвешенной штанге - нельзя снять отдельно
            canRemove = false;
        } else if (isDirectlyAttached && isLastInChain) {
            state = 'attached-last';
            canRemove = true;
            removeAction = 'detach';
            buttonText = 'Снять';
        } else if (isDirectlyAttached && !isLastInChain) {
            state = 'attached-middle';
            canRemove = false;
        } else if (isPartOfFreeComposite) {
            state = 'free-composite-disk';
            canRemove = true;
            removeAction = 'remove-disk';
            buttonText = 'Убрать диск';
        } else if (isPartOfFreeStack) {
            state = 'free-in-stack';
            canRemove = true;
            removeAction = 'remove-from-stack';
            buttonText = 'Убрать';
        } else if (isFreeOnCanvas) {
            state = 'free-on-canvas';
            canRemove = true;
            removeAction = 'remove-free';
            buttonText = 'Убрать';
        }
        
        return {
            found: true,
            weight,
            state,
            isPending,
            isDirectlyAttached,
            isInChain,
            positionInChain,
            isLastInChain,
            isFreeOnCanvas,
            freeWeight,
            isPartOfAttachedComposite,
            parentRodId,
            isPartOfFreeComposite,
            freeRodId,
            isPartOfFreeStack,
            stackBottomWeightId,
            canRemove,
            removeAction,
            buttonText
        };
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

        // 🔧 FIX: Вместо пересоздания всех элементов, обновляем только классы существующих
        // Это сохраняет interact.js привязку и не ломает drag во время анимации
        const existingItems = container.querySelectorAll('.weight-item');
        
        // Если элементов нет, создаём с нуля (первый раз)
        if (existingItems.length === 0) {
            this.createWeightsInventoryFromScratch();
            return;
        }

        console.log('[RENDER-WEIGHTS] 📋 Обновление состояния грузов (без пересоздания DOM)');
        console.log('[RENDER-WEIGHTS] 🔍 DEBUG State:', {
            selectedWeights: Array.from(this.state.selectedWeights),
            usedWeightIds: Array.from(this.state.usedWeightIds),
            attachedWeights: this.state.attachedWeights.map(w => w.id),
            existingItemsCount: existingItems.length
        });

        // ✅ НОВАЯ ЛОГИКА: Используем getWeightState для точного определения состояния
        existingItems.forEach((item) => {
            const weightId = item.dataset.weightId;
            const weightState = this.getWeightState(weightId);
            
            if (!weightState.found) {
                console.warn('[RENDER-WEIGHTS] Груз не найден:', weightId);
                return;
            }

            const weight = weightState.weight;
            
            console.log(`[RENDER-WEIGHTS] ${weight.id}: state="${weightState.state}", canRemove=${weightState.canRemove}, action="${weightState.removeAction}"`);

            // Обновляем dataset и классы
            item.dataset.status = weightState.state;

            // Обновляем классы used/attached
            if (weightState.isDirectlyAttached || weightState.isPending || weightState.isFreeOnCanvas || 
                weightState.isPartOfFreeComposite || weightState.isPartOfFreeStack) {
                item.classList.add('used');
                item.classList.add('weight-item--attached');
            } else {
                item.classList.remove('used');
                item.classList.remove('weight-item--attached');
            }

            // 🔧 УПРАВЛЕНИЕ КНОПКАМИ ДЕЙСТВИЙ
            let actionBtn = item.querySelector('.weight-action');
            let hintDiv = item.querySelector('.weight-hint');
            
            // Удаляем старую подсказку если есть
            if (hintDiv) {
                hintDiv.remove();
                hintDiv = null;
            }
            
            if (weightState.canRemove && weightState.buttonText) {
                // ✅ ПОКАЗЫВАЕМ КНОПКУ
                if (!actionBtn) {
                    actionBtn = document.createElement('button');
                    actionBtn.type = 'button';
                    actionBtn.className = 'weight-action';
                    item.appendChild(actionBtn);
                } else {
                    // Клонируем для обновления обработчика
                    const newBtn = actionBtn.cloneNode(true);
                    actionBtn.parentNode.replaceChild(newBtn, actionBtn);
                    actionBtn = newBtn;
                }
                
                // Устанавливаем обработчик в зависимости от действия
                actionBtn.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    
                    switch (weightState.removeAction) {
                        case 'detach':
                            console.log('[UI] 🔴 Снять с оборудования:', weight.id);
                            this.detachWeight(weight.id);
                            break;
                        case 'remove-free':
                        case 'remove-disk':
                        case 'remove-from-stack':
                            console.log('[UI] 🗑️ Убрать с canvas:', weight.id, 'action:', weightState.removeAction);
                            this.removeFreeWeight(weight.id);
                            break;
                    }
                });
                
                actionBtn.textContent = weightState.buttonText;
                actionBtn.style.display = 'block';
                actionBtn.disabled = false;
                
            } else if (weightState.state === 'available') {
                // ✅ ПОДСКАЗКА для доступных грузов
                if (actionBtn) {
                    actionBtn.style.display = 'none';
                }
                
                hintDiv = document.createElement('div');
                hintDiv.className = 'weight-hint';
                hintDiv.textContent = 'Перетащите на установку';
                item.appendChild(hintDiv);
                
            } else {
                // ✅ СКРЫВАЕМ КНОПКУ (груз в середине цепочки, pending, или часть подвешенного композита)
                if (actionBtn) {
                    actionBtn.style.display = 'none';
                }
            }

            // Обновляем статус текст
            const status = item.querySelector('.weight-status');
            if (status) {
                status.textContent = this.getWeightStatusText(weightState);
            }
        });
        
        // После обновления классов, НЕ нужно вызывать reinitDragSources - элементы не пересоздавались!
    }

    createWeightsInventoryFromScratch() {
        const container = this.ui?.weightsContainer;
        if (!container) return;

        container.innerHTML = '';

        console.log('[RENDER-WEIGHTS] 📋 Создание инвентаря грузов с нуля');

        this.weightsInventory.forEach((weight) => {
            // ✅ ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ для определения состояния
            const weightState = this.getWeightState(weight.id);
            
            if (!weightState.found) {
                console.error('[RENDER-WEIGHTS] Груз не найден:', weight.id);
                return;
            }

            console.log(`[CREATE-INVENTORY] ${weight.id}: state="${weightState.state}", canRemove=${weightState.canRemove}`);

            const item = document.createElement('div');
            item.className = 'weight-item';
            item.dataset.type = 'weight';
            item.dataset.mass = weight.mass;
            item.dataset.weightId = weight.id;
            item.dataset.hooksTop = weight.hooksTop ? 'true' : 'false';
            item.dataset.hooksBottom = weight.hooksBottom ? 'true' : 'false';
            item.dataset.status = weightState.state;

            if (weightState.isDirectlyAttached || weightState.isPending || weightState.isFreeOnCanvas ||
                weightState.isPartOfFreeComposite || weightState.isPartOfFreeStack) {
                item.classList.add('used');
                item.classList.add('weight-item--attached');
            }

            const figure = document.createElement('div');
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
            label.textContent = `${weight.mass} г`;

            const status = document.createElement('div');
            status.className = 'weight-status';
            status.textContent = this.getWeightStatusText(weightState);

            item.append(figure, label, status);

            // ✅ КНОПКА или ПОДСКАЗКА в зависимости от состояния
            if (weightState.canRemove && weightState.buttonText) {
                const action = document.createElement('button');
                action.type = 'button';
                action.className = 'weight-action';
                action.textContent = weightState.buttonText;
                action.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    
                    switch (weightState.removeAction) {
                        case 'detach':
                            console.log('[UI] 🔴 Снять с оборудования:', weight.id);
                            this.detachWeight(weight.id);
                            break;
                        case 'remove-free':
                        case 'remove-disk':
                        case 'remove-from-stack':
                            console.log('[UI] �️ Убрать с canvas:', weight.id);
                            this.removeFreeWeight(weight.id);
                            break;
                    }
                });
                item.appendChild(action);
                console.log('[CREATE-INVENTORY] ✅ Кнопка добавлена:', weightState.buttonText, 'для', weight.id);
                
            } else if (weightState.state === 'attached-middle') {
                // Груз подвешен, но НЕ последний - показываем массу
                const massInfo = document.createElement('div');
                massInfo.className = 'weight-mass-info';
                massInfo.textContent = `${weight.mass} г`;
                item.appendChild(massInfo);
                console.log('[CREATE-INVENTORY] 📊 Груз в середине цепочки:', weight.id);
                
            } else if (weightState.state === 'available') {
                // Груз доступен - подсказка
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

        // Если меняем пружину - сбрасываем все измерения
        if (previouslyAttachedId && previouslyAttachedId !== spring.id) {
            this.reset();
        }

        this.setSpringAnchor(dropX, dropY);

        // Устанавливаем параметры пружины ОДИН РАЗ
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

        console.log('[DETACH-SPRING] Возврат пружины в инвентарь');

        // Очищаем все грузы (и подвешенные, и свободные)
        this.clearAllWeights();
        
        // Сбрасываем параметры пружины
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
        
        // Сбрасываем позицию пружины
        if (this.canvases.dynamic) {
            const canvas = this.canvases.dynamic;
            this.state.springPosition = {
                x: canvas.width * 0.5,
                y: canvas.height * 0.15
            };
        }
        
        // Очищаем измерения
        this.state.measurements = [];

        this.renderEquipmentInventory();
        this.renderWeightsInventory();
        this.renderMeasurementsTable();
        this.resetResultDisplay();
        this.drawDynamic();
        this.showHint('Пружина возвращена в комплект. Все грузы возвращены в инвентарь.');
    }

    detachDynamometerToInventory() {
        if (!this.state.dynamometerAttached) return;

        console.log('[DETACH-DYNAMOMETER] Возврат динамометра в инвентарь');

        // Очищаем все грузы (используем общий метод)
        this.clearAllWeights();

        // Сбрасываем параметры динамометра
        this.state.dynamometerAttached = false;
        this.state.attachedDynamometerId = null;
        this.state.lastDynamometerReading = null;
        
        // Возвращаем позицию в центр
        if (this.canvases.dynamic) {
            const canvas = this.canvases.dynamic;
            this.state.dynamometerPosition = {
                x: canvas.width * 0.5,
                y: canvas.height * 0.4
            };
        }
        
        // Очищаем измерения
        this.state.measurements = [];

        this.renderEquipmentInventory();
        this.renderWeightsInventory();
        this.renderMeasurementsTable();
        this.resetResultDisplay();
        this.drawDynamic();
        this.showHint('Динамометр возвращён в комплект. Все грузы возвращены в инвентарь.');
    }

    /**
     * 🆕 Вспомогательный метод: очистка ВСЕХ грузов
     * (подвешенных, свободных, pending)
     */
    clearAllWeights() {
        console.log('[CLEAR-WEIGHTS] Очистка всех грузов:', {
            attached: this.state.attachedWeights.length,
            free: this.state.freeWeights?.length || 0,
            selectedWeights: this.state.selectedWeights.size,
            usedWeightIds: this.state.usedWeightIds.size
        });

        // Очищаем подвешенные грузы
        this.state.attachedWeights.forEach(weight => {
            this.state.selectedWeights.delete(weight.id);
            
            // ✅ КРИТИЧНО: Очищаем диски на подвешенной штанге
            if (weight.compositeDisks && weight.compositeDisks.length > 0) {
                weight.compositeDisks.forEach(disk => {
                    this.state.selectedWeights.delete(disk.weightId);
                    console.log('[CLEAR-WEIGHTS] ✅ Диск удалён из selectedWeights:', disk.weightId);
                });
            }
        });
        this.state.attachedWeights = [];

        // Очищаем свободные грузы
        if (this.state.freeWeights && this.state.freeWeights.length > 0) {
            this.state.freeWeights.forEach(fw => {
                this.state.usedWeightIds.delete(fw.weightId);
                
                // ✅ КРИТИЧНО: Очищаем диски на свободной штанге
                if (fw.compositeDisks && fw.compositeDisks.length > 0) {
                    fw.compositeDisks.forEach(disk => {
                        this.state.usedWeightIds.delete(disk.weightId);
                        console.log('[CLEAR-WEIGHTS] ✅ Диск удалён из usedWeightIds:', disk.weightId);
                    });
                }
                
                // ✅ КРИТИЧНО: Очищаем стопку обычных грузов
                if (fw.stackedWeights && fw.stackedWeights.length > 0) {
                    fw.stackedWeights.forEach(sw => {
                        this.state.usedWeightIds.delete(sw.weightId);
                        console.log('[CLEAR-WEIGHTS] ✅ Груз из стопки удалён:', sw.weightId);
                    });
                }
            });
            this.state.freeWeights = [];
        }

        // Очищаем pending грузы
        this.pendingWeightIds.clear();

        // Сбрасываем текущий груз
        this.state.weightAttached = false;
        this.state.currentWeight = null;
        this.state.currentWeightId = null;

        console.log('[CLEAR-WEIGHTS] ✅ Все грузы очищены');
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
        const removedWeight = this.state.attachedWeights.pop();
        
        // 🔩 СПЕЦИАЛЬНАЯ ЛОГИКА: Если это штанга с дисками - возвращаем ВСЕ диски!
        if (removedWeight.compositeDisks && removedWeight.compositeDisks.length > 0) {
            console.log('[DETACH-WEIGHT] 🔩 Возврат наборного груза: штанга +', removedWeight.compositeDisks.length, 'дисков');
            removedWeight.compositeDisks.forEach(disk => {
                this.state.usedWeightIds.delete(disk.weightId);
                this.state.selectedWeights.delete(disk.weightId);
                console.log('[DETACH-WEIGHT]   └─ Возврат диска:', disk.weightId, `(${disk.mass}г, ${disk.diskSize})`);
            });
        }
        
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
                let itemMass = def?.mass ?? 0;
                
                // Если у элемента есть compositeDisks (штанга с дисками), добавляем массу дисков
                if (item.compositeDisks && item.compositeDisks.length > 0) {
                    const disksMass = item.compositeDisks.reduce((dsum, disk) => dsum + disk.mass, 0);
                    itemMass += disksMass;
                }
                
                return sum + itemMass;
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

        // 🔧 КРИТИЧНО: Глобальная настройка Interact.js для touch поддержки
        console.log('[DRAG] Настройка touch поддержки для Interact.js');
        console.log('[DRAG] Interact.js версия:', interact.version || 'unknown');
        console.log('[DRAG] Touch support:', 'ontouchstart' in window);
        console.log('[DRAG] Max touch points:', navigator.maxTouchPoints);
        console.log('[DRAG] Pointer events:', 'onpointerdown' in window);
        
        interact.pointerMoveTolerance(5); // Небольшой порог для начала drag (5px)
        
        interact.dynamicDrop(true);

        const initDraggables = () => {
            interact('.weight-item').unset?.();
            interact('.equipment-item').unset?.();

            interact('.weight-item').draggable({
                inertia: false,
                autoScroll: true,
                // 🔧 КРИТИЧНО: Включаем все типы событий (mouse, touch, pen)
                manualStart: false,
                hold: 0, // Немедленное начало drag без задержки
                // Разрешаем drag от любого элемента
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
                // 🔧 КРИТИЧНО: Включаем все типы событий (mouse, touch, pen)
                manualStart: false,
                hold: 0, // Немедленное начало drag без задержки
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

        const overlay = document.getElementById('drag-drop-overlay');
        if (!overlay) {
            console.error('❌ drag-drop-overlay не найден');
            return;
        }

        interact('#drag-drop-overlay').unset?.();

        interact('#drag-drop-overlay').dropzone({
            accept: '.weight-item, .equipment-item',
            overlap: 0.1,
            // 🔧 FIX: Добавляем проверку на touch events
            checker: null, // Отключаем кастомную проверку для совместимости с touch
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
        // 🔧 ДИАГНОСТИКА: Логируем тип события для отладки touch
        console.log('[DRAG-START] Event type:', event.type, 
                    'Interaction type:', event.interaction?.pointerType,
                    'Target:', event.target.dataset.weightId || event.target.dataset.equipmentId);
        
        const type = event.target.dataset.type || 'weight';
        
        // 🆕 Проверяем: груз уже использован (на холсте ИЛИ прикреплён к оборудованию)?
        if (type === 'weight') {
            const weightId = event.target.dataset.weightId;
            if (this.state.usedWeightIds.has(weightId) || this.state.selectedWeights.has(weightId)) {
                console.log('[DRAG] ⛔ Груз уже использован:', weightId,
                    '| usedWeightIds:', this.state.usedWeightIds.has(weightId),
                    '| selectedWeights:', this.state.selectedWeights.has(weightId));
                // 🔧 FIX: Для Interact.js используем interaction.stop() вместо preventDefault
                event.interaction?.stop();
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

        // ОПТИМИЗАЦИЯ: используем transform для плавного движения
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        // ОПТИМИЗАЦИЯ: кешируем rect и обновляем ghost только раз
        if (this.dragGhost) {
            const rect = target.getBoundingClientRect();
            this.dragGhost.style.left = rect.left + 'px';
            this.dragGhost.style.top = rect.top + 'px';
            
            // ОПТИМИЗАЦИЯ: обновляем trail только каждые 2 кадра (30 FPS вместо 60)
            if (this.visualSettings?.dragTrail) {
                if (!this._trailSkipFrame) {
                    this._trailSkipFrame = true;
                    return;
                }
                this._trailSkipFrame = false;
                
                const canvasRect = this.canvases.particles.getBoundingClientRect();
                this.particleSystem.updateTrail(
                    rect.left - canvasRect.left + rect.width / 2,
                    rect.top - canvasRect.top + rect.height / 2
                );
            }
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
            selectedWeights: Array.from(this.state.selectedWeights),
            hasDragGhost: !!this.dragGhost
        });

        const weightId = element?.dataset?.weightId;
        const weight = this.getWeightById(weightId);

        if (!weight) {
            console.warn('[ATTACH-WEIGHT] Не найден вес по id', weightId);
            this.showHint('Не удалось распознать груз. Попробуйте снова.');
            this.resetDraggablePosition(element);
            return;
        }

        const canvasRect = this.canvases.dynamic.getBoundingClientRect();
        
        // 🔧 CRITICAL FIX: Используем координаты dragGhost (где РЕАЛЬНО находится груз), 
        // а не element (который всё ещё в правой панели инвентаря)!
        let elementRect;
        if (this.dragGhost) {
            elementRect = this.dragGhost.getBoundingClientRect();
            console.log('[ATTACH-WEIGHT] ✅ Используем координаты dragGhost');
        } else {
            elementRect = element.getBoundingClientRect();
            console.log('[ATTACH-WEIGHT] ⚠️ dragGhost не найден, используем element');
        }
        
        // 🔧 FIX: Крючок груза находится в ЦЕНТРЕ верхней трети изображения
        // dragGhost имеет scale(1.2) и border, но это уже учтено в getBoundingClientRect()
        const canvasX = elementRect.left + elementRect.width/2 - canvasRect.left;
        const canvasY = elementRect.top + elementRect.height * 0.25 - canvasRect.top; // Верхняя четверть = примерно где крючок
        
        console.log('[ATTACH-WEIGHT] 📍 Calculated drop position:', {
            elementRect: {
                left: elementRect.left.toFixed(1),
                top: elementRect.top.toFixed(1),
                width: elementRect.width.toFixed(1),
                height: elementRect.height.toFixed(1)
            },
            canvasRect: {
                left: canvasRect.left.toFixed(1),
                top: canvasRect.top.toFixed(1)
            },
            finalPos: {
                canvasX: canvasX.toFixed(1),
                canvasY: canvasY.toFixed(1),
                hookOffsetFromTop: (elementRect.height * 0.25).toFixed(1)
            }
        });
        
        // Проверяем попадание на пружину
        let shouldAttachDirectly = false;
        let attachmentTarget = null;
        
        console.log('[ATTACH-WEIGHT] 🔍 Checking equipment:', {
            springAttached: this.state.springAttached,
            dynamometerAttached: this.state.dynamometerAttached
        });
        
        if (this.state.springAttached) {
            const springPos = this.state.springPosition;
            const physicalLength = this.state.springLength || this.state.springNaturalLength;
            // 🔧 CRITICAL FIX: Используем ВИЗУАЛЬНУЮ длину, как при рисовании!
            const visualLength = this.getVisualLength(physicalLength);
            const hookX = springPos.x;
            const hookY = springPos.y + visualLength; // Визуальная координата крючка
            
            const distanceToSpring = Math.hypot(canvasX - hookX, canvasY - hookY);
            
            console.log('[ATTACH-WEIGHT] Check spring drop:', {
                canvasPos: [canvasX.toFixed(1), canvasY.toFixed(1)],
                springHook: [hookX.toFixed(1), hookY.toFixed(1)],
                elementRect: {
                    top: elementRect.top.toFixed(1),
                    height: elementRect.height.toFixed(1),
                    hookOffset: (elementRect.height * 0.25).toFixed(1)
                },
                physicalLength: physicalLength.toFixed(1),
                visualLength: visualLength.toFixed(1),
                visualScale: this.visual.scale.toFixed(2),
                distance: distanceToSpring.toFixed(1),
                threshold: 100
            });
            
            // 🔧 FIX: Увеличен радиус с 80 до 100 для лучшего захвата
            if (distanceToSpring < 100) {
                // 🚫 ЗАПРЕТ: Нельзя подвешивать диски!
                if (weight.isCompositeDisk) {
                    console.log('[ATTACH-WEIGHT] ❌ ЗАПРЕЩЕНО: Диски нельзя подвешивать!');
                    this.showToast('⚠️ Диски нельзя подвешивать отдельно! Надевайте диски на штангу.');
                    element.classList.remove('used');
                    this.resetDraggablePosition(element, false);
                    return;
                }
                
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
                threshold: 100
            });
            
            // 🔧 FIX: Увеличен радиус с 80 до 100 для лучшего захвата
            if (distanceToDynamometer < 100) {
                // 🚫 ЗАПРЕТ: Нельзя подвешивать диски!
                if (weight.isCompositeDisk) {
                    console.log('[ATTACH-WEIGHT] ❌ ЗАПРЕЩЕНО: Диски нельзя подвешивать!');
                    this.showToast('⚠️ Диски нельзя подвешивать отдельно! Надевайте диски на штангу.');
                    element.classList.remove('used');
                    this.resetDraggablePosition(element, false);
                    return;
                }
                
                shouldAttachDirectly = true;
                attachmentTarget = 'dynamometer';
            }
        }
        
        if (shouldAttachDirectly) {
            // 🎯 СЦЕНАРИЙ 1: Упал на пружину/динамометр → подвешиваем сразу
            console.log(`[ATTACH-WEIGHT] Direct drop on ${attachmentTarget}`);
            
            // ✅ КРИТИЧНО: Если это штанга, инициализируем пустой массив дисков
            // Без этого диски на штанге не будут распознаваться!
            if (weight.id === 'rod' && !weight.compositeDisks) {
                weight.compositeDisks = [];
                console.log('[ATTACH-WEIGHT] ✅ Инициализирован compositeDisks для штанги');
            }
            
            element.classList.add('used');
            this.resetDraggablePosition(element, false);
            // 🔧 FIX: Убираем await чтобы не блокировать drag других грузов во время анимации
            this.attachWeight(weight); // Запускаем асинхронно, не ждём завершения
            // 🔧 FIX: НЕ вызываем renderWeightsInventory здесь! Это убьёт interact.js!
            // renderWeightsInventory вызовется в конце attachWeight()
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
        
        // ✅ КРИТИЧНО: Если это штанга, инициализируем пустой массив дисков
        if (weight.id === 'rod') {
            freeWeight.compositeDisks = [];
            console.log('[ATTACH-WEIGHT] ✅ Инициализирован compositeDisks для свободной штанги');
        }
        
        this.state.freeWeights.push(freeWeight);
        // ❌ НЕ добавляем в selectedWeights! Это только для подвешенных грузов!
        // this.state.selectedWeights.add(weightId);
        element.classList.add('used');
        
        this.resetDraggablePosition(element, false);
        this.drawDynamic();
        
        // 🔧 FIX: Вызываем renderWeightsInventory ОТЛОЖЕННО (после завершения drag events)
        // Это обновит UI и покажет кнопку "Убрать" для свободного груза
        setTimeout(() => {
            this.renderWeightsInventory();
        }, 100); // Небольшая задержка чтобы interact.js успел обработать drop event
        
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
        
        // Получаем полный объект груза для проверки compositeDisks
        const weightDef = this.getWeightById(weightId);
        
        // ✅ ЕДИНАЯ ТОЧКА добавления
        const chainEntry = { id: weightId };
        
        // ✅ КРИТИЧНО: Копируем compositeDisks если это штанга
        if (weightDef && weightDef.compositeDisks && weightDef.compositeDisks.length > 0) {
            chainEntry.compositeDisks = [...weightDef.compositeDisks];
            console.log('[ADD-TO-CHAIN] ✅ Скопированы диски в цепочку:', chainEntry.compositeDisks.map(d => d.weightId));
            
            // ✅ КРИТИЧНО: Добавляем каждый диск в selectedWeights
            weightDef.compositeDisks.forEach(disk => {
                this.state.selectedWeights.add(disk.weightId);
                this.state.usedWeightIds.delete(disk.weightId);
                console.log('[ADD-TO-CHAIN] ✅ Диск добавлен в selectedWeights:', disk.weightId);
            });
        }
        
        this.state.attachedWeights.push(chainEntry);
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
        
        // � ЗАПРЕТ: Нельзя подвешивать отдельные диски!
        if (weight.isCompositeDisk) {
            console.log('[ATTACH-WEIGHT] ❌ ЗАПРЕЩЕНО: Диски нельзя подвешивать отдельно!');
            this.showToast('⚠️ Диски нельзя подвешивать отдельно! Надевайте диски на штангу.');
            return;
        }
        
        // �🔧 FIX: Если анимация уже идёт, добавляем в очередь
        if (this.state.isAnimating) {
            console.log('[ATTACH-WEIGHT] ⏳ Анимация уже идёт, груз будет подвешен после завершения текущей анимации');
            // Ждём завершения текущей анимации
            if (this.currentAnimation) {
                await this.currentAnimation;
            }
        }
        
        this.state.isAnimating = true;
        console.log('[ATTACH-WEIGHT] Флаг isAnimating → true');
        this.state.weightAttached = true;

        // Очистка любых ранее запущенных эффектов, чтобы не оставалось свечения
        this.particleSystem.clear();

        // ✅ Используем центральную функцию
        this.addWeightToChain(weight.id);
        this.state.currentWeightId = weight.id;
        
        // ✅ КРИТИЧНО: Обновляем UI СРАЗУ после добавления в цепочку
        // Это нужно чтобы при быстром клике на несколько грузов они не дублировались
        this.renderWeightsInventory();
        
        // ✅ ДОПОЛНИТЕЛЬНО: Повторное обновление через минимальную задержку
        // Это гарантирует что DOM успел обновиться
        setTimeout(() => {
            console.log('[ATTACH-WEIGHT] 🔄 Повторное обновление UI через 50ms');
            this.renderWeightsInventory();
        }, 50);
        
        console.log('[ATTACH-WEIGHT] 🔍 ПРОВЕРКА после addWeightToChain:', {
            weightId: weight.id,
            inSelectedWeights: this.state.selectedWeights.has(weight.id),
            selectedWeights: Array.from(this.state.selectedWeights),
            inAttachedWeights: this.state.attachedWeights.some(w => w.id === weight.id),
            attachedWeights: this.state.attachedWeights.map(w => w.id)
        });

        const totalMass = this.getTotalAttachedMass();

        console.log('[ATTACH-WEIGHT] Текущая суммарная масса (г):', totalMass);

        this.state.currentWeight = totalMass;

        const massKg = totalMass / 1000;
        const force = massKg * this.physics.gravity; // F = mg (автоматически!)

        // === РЕЖИМ ПРУЖИНЫ (основной) ===
        if (this.state.springAttached) {
            const elongationM = force / this.physics.springConstant;
            const elongationPx = elongationM * 100 * this.physics.pixelsPerCm;

            console.log('[SPRING MODE] 📏 Расчёт удлинения:', {
                totalMass: totalMass + 'г',
                massKg: massKg.toFixed(3) + 'кг',
                force: force.toFixed(3) + 'Н',
                springConstant: this.physics.springConstant + 'Н/м',
                elongationM: elongationM.toFixed(4) + 'м',
                elongationPx: elongationPx.toFixed(1) + 'px',
                springNaturalLength: this.state.springNaturalLength + 'px'
            });

            const targetLength = this.state.springNaturalLength + elongationPx;

            console.log('[ATTACH-WEIGHT] 🎯 Целевая длина пружины:', {
                natural: this.state.springNaturalLength + 'px',
                elongation: elongationPx.toFixed(1) + 'px',
                target: targetLength.toFixed(1) + 'px',
                shouldBeGreater: targetLength > this.state.springNaturalLength ? '✅ Растяжение' : '❌ Сжатие!'
            });

            this.updateVisualScale(targetLength);

            // Показываем подсказку во время анимации
            this.showHint(`Груз ${weight.name} подвешен. Масса: ${totalMass} г. Наблюдайте колебания...`);

            // ИЗМЕРЕНИЕ В РЕАЛЬНОМ ВРЕМЕНИ - обновляем показания сразу
            const elongationCm = elongationM * 100; // Перевод из метров в сантиметры
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

                // FIX: Используем плавный переход от start к target с колебаниями ВОКРУГ target
                // Вместо колебаний от startLength, делаем интерполяцию + затухающие колебания вокруг target
                const baseLength = startLength + (targetLength - startLength) * progress;
                
                // Колебания вокруг целевой длины (только после достижения базового растяжения)
                if (progress > 0.3) { // Начинаем колебания после 30% прогресса
                    const oscillationTime = (elapsed - duration * 0.3) / 1000; // время колебаний в секундах
                    const oscillationAmplitude = (targetLength - startLength) * 0.15; // 15% от изменения
                    
                    const oscillation = springOscillation(
                        this.physics.springConstant,
                        mass,
                        oscillationAmplitude / (this.physics.pixelsPerCm * 100), // м
                        oscillationTime // сек
                    );
                    
                    // Колебания ДОБАВЛЯЮТСЯ к базовой длине, а не заменяют её
                    this.state.springLength = baseLength + oscillation.position * this.physics.pixelsPerCm * 100;
                } else {
                    // В первые 30% - только плавное растяжение без колебаний
                    this.state.springLength = baseLength;
                }
                
                this.state.springElongation = this.state.springLength - this.state.springNaturalLength;

                this.updateVisualScale(this.state.springLength);

                // ОБНОВЛЯЕМ ПОКАЗАНИЯ В РЕАЛЬНОМ ВРЕМЕНИ во время колебаний
                const totalMass = this.getTotalAttachedMass();
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
        // Старые элементы (удалены)
        const massEl = document.getElementById('current-mass');
        const oldElongationEl = document.getElementById('current-elongation');

        // ✅ НОВЫЕ элементы для окна измерений
        const currentForceEl = document.getElementById('current-force');
        const currentElongationEl = document.getElementById('current-elongation');

        // Apply physics noise for realism
        let displayForce = force;
        let displayElongationCm = elongationCm;

        if (this.physicsEngine && typeof this.physicsEngine.addNoise === 'function') {
            if (Number.isFinite(force)) {
                displayForce = this.physicsEngine.addNoise(force, 0.5); // 0.5% noise
            }
            if (Number.isFinite(elongationCm)) {
                displayElongationCm = this.physicsEngine.addNoise(elongationCm, 0.5);
            }
        }

        // Обновляем старые элементы если они есть
        if (massEl) {
            massEl.textContent = Number.isFinite(mass) ? mass.toFixed(0) : '—';
        }
        if (oldElongationEl) {
            oldElongationEl.textContent = Number.isFinite(displayElongationCm) ? displayElongationCm.toFixed(2) : '—';
        }

        // ✅ Обновляем НОВЫЕ элементы (текущие показания F и Δl)
        if (currentForceEl) {
            currentForceEl.textContent = Number.isFinite(displayForce) ? displayForce.toFixed(2) : '—';
        }

        if (currentElongationEl) {
            // Переводим см в метры для отображения
            const elongationM = Number.isFinite(displayElongationCm) ? displayElongationCm / 100 : NaN;
            currentElongationEl.textContent = Number.isFinite(elongationM) ? elongationM.toFixed(3) : '—';
        }

        // ✅ Обновляем состояние кнопок записи
        this.updateRecordForceButton();
        this.updateRecordElongationButton();
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

        // ✅ Элементы удалены из HTML - функция отключена
        if (!valueElement || !accuracyContainer || !accuracyFill || !accuracyLabel) {
            console.log('[updateResultDisplay] Элементы результата не найдены (удалены из HTML)');
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

        // ✅ Элементы удалены из HTML - функция отключена
        if (!valueElement || !accuracyFill || !accuracyLabel) {
            console.log('[resetResultDisplay] Элементы результата не найдены (удалены из HTML)');
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

        // 🆕 NEW MEASUREMENT WINDOW HANDLERS
        const btnRecordForce = document.getElementById('btn-record-force');
        const btnRecordElongation = document.getElementById('btn-record-elongation');
        const btnCalculateStiffness = document.getElementById('btn-calculate-stiffness');
        const btnResetMeasurement = document.getElementById('btn-reset-measurement');
        const manualForceInput = document.getElementById('manual-force-input');
        const manualElongationInput = document.getElementById('manual-elongation-input');

        btnRecordForce?.addEventListener('click', () => {
            this.recordForceValue();
        });

        btnRecordElongation?.addEventListener('click', () => {
            this.recordElongationValue();
        });

        btnCalculateStiffness?.addEventListener('click', () => {
            this.calculateStiffnessFromRecorded();
        });

        btnResetMeasurement?.addEventListener('click', () => {
            this.resetMeasurementWindow();
        });

        // Обновляем кнопку "Записать F" при вводе вручную
        manualForceInput?.addEventListener('input', () => {
            this.updateRecordForceButton();
        });

        // Обновляем кнопку "Записать Δl" при вводе вручную
        manualElongationInput?.addEventListener('input', () => {
            this.updateRecordElongationButton();
        });

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

        // 🆕 Magnifier Listeners
        const container = document.getElementById('canvas-container') || document.querySelector('.canvas-container');
        const btnMagnifier = document.getElementById('btn-magnifier');

        if (btnMagnifier) {
            btnMagnifier.addEventListener('click', () => {
                if (this.magnifier.visible) {
                    this.magnifier.hide();
                    btnMagnifier.classList.remove('active');
                } else {
                    this.magnifier.show();
                    btnMagnifier.classList.add('active');
                }
            });
        }

        if (container) {
            const updateMagnifierPos = (clientX, clientY) => {
                const rect = container.getBoundingClientRect();
                const x = clientX - rect.left;
                const y = clientY - rect.top;
                this.magnifier.updatePosition(x, y);
            };

            container.addEventListener('mousemove', (e) => {
                updateMagnifierPos(e.clientX, e.clientY);
            });

            // Touch support
            container.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0) {
                    // Prevent scrolling when using magnifier
                    if (this.magnifier.visible) {
                        e.preventDefault();
                    }
                    updateMagnifierPos(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: false });

            container.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) {
                    updateMagnifierPos(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: true });

            // Toggle with 'M' key or Shift
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Shift' || e.key === 'm' || e.key === 'M') {
                    this.magnifier.show();
                    btnMagnifier?.classList.add('active');
                }
            });

            window.addEventListener('keyup', (e) => {
                if (e.key === 'Shift' || e.key === 'm' || e.key === 'M') {
                    this.magnifier.hide();
                    btnMagnifier?.classList.remove('active');
                }
            });
        }
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
        // Подсказки отключены
        return;
    }

    showError(message) {
        alert(message); // TODO: красивый error popup
    }

    playSound(type) {
        // TODO: добавить звуковые эффекты
        // const audio = new Audio(`/assets/sounds/${type}.mp3`);
        // audio.play().catch(() => {});
    }

    /**
     * Завершить эксперимент и вернуться на главный экран
     */
    finishExperiment() {
        // Проверяем, что расчёт выполнен
        const resultContainer = document.getElementById('calculation-result');
        if (!resultContainer || resultContainer.style.display === 'none') {
            alert('❌ Сначала выполните расчёт жёсткости пружины!');
            return;
        }

        // Подтверждение
        const confirmed = confirm('✅ Эксперимент завершён!\n\nЖёсткость пружины определена.\nВернуться к списку комплектов?');
        
        if (confirmed) {
            // Возврат на главный экран
            window.location.href = '../../index.html';
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  НОВОЕ ОКНО ИЗМЕРЕНИЙ - ЗАПИСЬ ПЕРЕМЕННЫХ F и Δl
    // ═══════════════════════════════════════════════════════════

    /**
     * Записать значение силы F (из текущих показаний или ручного ввода)
     */
    recordForceValue() {
        const manualInput = document.getElementById('manual-force-input');
        const currentForceEl = document.getElementById('current-force');
        
        let forceValue = null;

        // Приоритет: ручной ввод > текущее значение
        if (manualInput && manualInput.value.trim() !== '') {
            // ✅ Поддержка запятой и точки
            const inputValue = manualInput.value.trim().replace(',', '.');
            forceValue = parseFloat(inputValue);
            if (!Number.isFinite(forceValue) || forceValue <= 0) {
                alert('❌ Введите корректное положительное значение силы!');
                return;
            }
        } else if (currentForceEl) {
            const currentText = currentForceEl.textContent;
            if (currentText !== '—') {
                forceValue = parseFloat(currentText);
            }
        }

        if (!forceValue || !Number.isFinite(forceValue)) {
            alert('❌ Нет значения силы для записи! Подвесьте груз или введите вручную.');
            return;
        }

        // Записываем значение
        this.state.recordedForce = forceValue;

        // Отображаем записанное значение
        const recordedForceDisplay = document.getElementById('recorded-force-display');
        const recordedForceValue = document.getElementById('recorded-force-value');
        if (recordedForceDisplay && recordedForceValue) {
            recordedForceDisplay.style.display = 'flex';
            recordedForceValue.textContent = forceValue.toFixed(2);
        }

        // Очищаем ручной ввод
        if (manualInput) {
            manualInput.value = '';
        }

        // Обновляем кнопку расчёта
        this.updateCalculateStiffnessButton();

        this.showHint(`✅ Сила F = ${forceValue.toFixed(2)} Н записана!`);
    }

    /**
     * Записать значение удлинения Δl (из текущих показаний или ручного ввода)
     */
    recordElongationValue() {
        const manualInput = document.getElementById('manual-elongation-input');
        const currentElongationEl = document.getElementById('current-elongation');
        
        let elongationValue = null;

        // Приоритет: ручной ввод > текущее значение
        if (manualInput && manualInput.value.trim() !== '') {
            // ✅ Поддержка запятой и точки
            const inputValue = manualInput.value.trim().replace(',', '.');
            elongationValue = parseFloat(inputValue);
            if (!Number.isFinite(elongationValue) || elongationValue <= 0) {
                alert('❌ Введите корректное положительное значение удлинения!');
                return;
            }
        } else if (currentElongationEl) {
            const currentText = currentElongationEl.textContent;
            if (currentText !== '—') {
                elongationValue = parseFloat(currentText);
            }
        }

        if (!elongationValue || !Number.isFinite(elongationValue)) {
            alert('❌ Нет значения удлинения для записи! Подвесьте груз или введите вручную.');
            return;
        }

        // Записываем значение
        this.state.recordedElongation = elongationValue;

        // Отображаем записанное значение
        const recordedElongationDisplay = document.getElementById('recorded-elongation-display');
        const recordedElongationValue = document.getElementById('recorded-elongation-value');
        if (recordedElongationDisplay && recordedElongationValue) {
            recordedElongationDisplay.style.display = 'flex';
            recordedElongationValue.textContent = elongationValue.toFixed(3);
        }

        // Очищаем ручной ввод
        if (manualInput) {
            manualInput.value = '';
        }

        // Обновляем кнопку расчёта
        this.updateCalculateStiffnessButton();

        this.showHint(`✅ Удлинение Δl = ${elongationValue.toFixed(3)} м записано!`);
    }

    /**
     * Рассчитать жёсткость из записанных значений F и Δl
     */
    calculateStiffnessFromRecorded() {
        const force = this.state.recordedForce;
        const elongation = this.state.recordedElongation;

        if (!force || !elongation) {
            this.showHint('❌ Запишите оба значения (F и Δl) перед расчётом!');
            return;
        }

        // Расчёт: k = F / Δl
        const stiffness = force / elongation;

        // Отображаем результат
        const resultContainer = document.getElementById('calculation-result');
        const resultCalculationText = document.getElementById('result-calculation-text');
        const resultStiffnessValue = document.getElementById('result-stiffness-value');

        if (resultContainer && resultCalculationText && resultStiffnessValue) {
            resultContainer.style.display = 'block';
            resultCalculationText.textContent = `k = ${force.toFixed(2)} / ${elongation.toFixed(3)} = ${stiffness.toFixed(1)} Н/м`;
            resultStiffnessValue.textContent = stiffness.toFixed(1);
        }

        // Показываем результат
        this.showHint(`🎉 Жёсткость пружины: k = ${stiffness.toFixed(1)} Н/м`);

        // Разблокируем кнопку завершения
        const completeBtn = document.getElementById('btn-complete');
        if (completeBtn) {
            completeBtn.disabled = false;
        }
    }

    /**
     * Обновить состояние кнопки "Записать F"
     */
    updateRecordForceButton() {
        const btn = document.getElementById('btn-record-force');
        const manualInput = document.getElementById('manual-force-input');
        const currentForceEl = document.getElementById('current-force');

        if (!btn) return;

        const hasManualValue = manualInput && manualInput.value.trim() !== '';
        const hasCurrentValue = currentForceEl && currentForceEl.textContent !== '—';

        btn.disabled = !hasManualValue && !hasCurrentValue;
    }

    /**
     * Обновить состояние кнопки "Записать Δl"
     */
    updateRecordElongationButton() {
        const btn = document.getElementById('btn-record-elongation');
        const manualInput = document.getElementById('manual-elongation-input');
        const currentElongationEl = document.getElementById('current-elongation');

        if (!btn) return;

        const hasManualValue = manualInput && manualInput.value.trim() !== '';
        const hasCurrentValue = currentElongationEl && currentElongationEl.textContent !== '—';

        btn.disabled = !hasManualValue && !hasCurrentValue;
    }

    /**
     * Обновить состояние кнопки "Рассчитать жёсткость"
     */
    updateCalculateStiffnessButton() {
        const btn = document.getElementById('btn-calculate-stiffness');
        if (!btn) return;

        const hasForce = this.state.recordedForce !== null;
        const hasElongation = this.state.recordedElongation !== null;

        btn.disabled = !hasForce || !hasElongation;
    }

    /**
     * Сбросить все данные в окне измерений
     */
    resetMeasurementWindow() {
        // Очищаем состояние
        this.state.recordedForce = null;
        this.state.recordedElongation = null;

        // Очищаем поля ручного ввода
        const manualForceInput = document.getElementById('manual-force-input');
        const manualElongationInput = document.getElementById('manual-elongation-input');
        if (manualForceInput) manualForceInput.value = '';
        if (manualElongationInput) manualElongationInput.value = '';

        // ✅ Очищаем текущие показания (верхняя часть окна)
        const currentForceEl = document.getElementById('current-force');
        const currentElongationEl = document.getElementById('current-elongation');
        if (currentForceEl) currentForceEl.textContent = '—';
        if (currentElongationEl) currentElongationEl.textContent = '—';

        // Скрываем записанные значения
        const recordedForceDisplay = document.getElementById('recorded-force-display');
        const recordedElongationDisplay = document.getElementById('recorded-elongation-display');
        if (recordedForceDisplay) recordedForceDisplay.style.display = 'none';
        if (recordedElongationDisplay) recordedElongationDisplay.style.display = 'none';

        // Скрываем результат
        const resultContainer = document.getElementById('calculation-result');
        if (resultContainer) resultContainer.style.display = 'none';

        // ✅ Блокируем кнопку "Завершить опыт"
        const completeBtn = document.getElementById('btn-complete');
        if (completeBtn) completeBtn.disabled = true;

        // Обновляем кнопки
        this.updateRecordForceButton();
        this.updateRecordElongationButton();
        this.updateCalculateStiffnessButton();

        this.showHint('🔄 Окно измерений очищено. Можете начать заново.');
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
        
        // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ РАСЧЕТА МАССЫ
        console.group('📊 [MEASUREMENT DEBUG]');
        console.log('🔧 Пружина ID:', this.state.attachedSpringId);
        console.log('🔧 Константа жесткости (k):', this.physics.springConstant, 'Н/м');
        
        console.log('\n⚖️  РАСЧЕТ МАССЫ:');
        console.log('Прикрепленные грузы:', this.state.attachedWeights.length);
        this.state.attachedWeights.forEach((w, index) => {
            const weightDef = this.equipment[w.id];
            const baseMass = weightDef?.mass || 0;
            let disksMass = 0;
            
            if (w.compositeDisks && w.compositeDisks.length > 0) {
                console.log(`  ${index + 1}. ${w.id} (${weightDef?.name}):`);
                console.log(`     Базовая масса: ${baseMass}г`);
                console.log(`     Диски (${w.compositeDisks.length}):`);
                w.compositeDisks.forEach(disk => {
                    const diskDef = this.equipment[disk.weightId];
                    if (diskDef) {
                        console.log(`       - ${disk.weightId}: ${diskDef.mass}г`);
                        disksMass += diskDef.mass;
                    }
                });
                console.log(`     Масса дисков: ${disksMass}г`);
                console.log(`     ИТОГО: ${baseMass + disksMass}г`);
            } else {
                console.log(`  ${index + 1}. ${w.id} (${weightDef?.name}): ${baseMass}г`);
            }
        });
        
        const totalMass = this.getTotalAttachedMass();
        console.log(`\n⚖️  ОБЩАЯ МАССА: ${totalMass} г = ${(totalMass/1000).toFixed(3)} кг`);

        // АВТОМАТИЧЕСКИЙ расчёт силы F = mg
        const force = (totalMass / 1000) * this.physics.gravity;
        console.log(`\n💪 СИЛА: F = mg = ${(totalMass/1000).toFixed(3)} × ${this.physics.gravity} = ${force.toFixed(4)} Н`);
        
        // Удлинение
        const elongationCm = this.state.springElongation / this.physics.pixelsPerCm;
        console.log(`\n📏 УДЛИНЕНИЕ: Δl = ${elongationCm.toFixed(4)} см = ${(elongationCm/100).toFixed(6)} м`);
        console.log(`   (springElongation = ${this.state.springElongation.toFixed(2)} px / ${this.physics.pixelsPerCm} px/см)`);

        if (!elongationCm || elongationCm <= 0) {
            console.warn('\n❌ ОШИБКА: пружина не растянута!');
            console.groupEnd();
            this.showHint('Ошибка: пружина не растянута!');
            return;
        }

        // Расчет жесткости
        const calculatedStiffness = force / (elongationCm / 100);
        console.log(`\n🎯 РАСЧЕТ ЖЕСТКОСТИ:`);
        console.log(`   k = F / Δl = ${force.toFixed(4)} / ${(elongationCm / 100).toFixed(6)} = ${calculatedStiffness.toFixed(4)} Н/м`);
        console.log(`   Ожидаемая k: ${this.physics.springConstant} Н/м`);
        const error = Math.abs(calculatedStiffness - this.physics.springConstant);
        console.log(`   Погрешность: ${error.toFixed(4)} Н/м`);
        const errorPercent = (error / this.physics.springConstant * 100).toFixed(2);
        console.log(`   Погрешность %: ${errorPercent}%`);
        
        if (error > 1.0) {
            console.error(`   ⚠️  БОЛЬШАЯ ПОГРЕШНОСТЬ! (> 1 Н/м)`);
        } else {
            console.log(`   ✅ Погрешность в норме`);
        }
        
        console.groupEnd();

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
        
        // ✅ Таблица удалена из HTML - функция отключена
        if (!tbody) {
            console.log('[renderMeasurementsTable] Таблица измерений не найдена (удалена из HTML)');
            return;
        }

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
            // ✅ Кнопка удалена из HTML - функция отключена
            console.log('[updateRecordButton] Кнопка btn-record-measurement не найдена (удалена из HTML)');
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
        if (!btn) {
            // ✅ Кнопка удалена из HTML - функция отключена
            console.log('[updateCalculateButton] Кнопка btn-calculate не найдена (удалена из HTML)');
            return;
        }

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
        // FIX: Remove stackHeight from calculation - it was causing spring compression!
        // Physical spring elongation is already calculated correctly in attachWeight(),
        // so stackHeight should NOT reduce available space for scaling
        const stackHeight = this.estimateWeightStackHeight(); // kept for logging only
        const available = canvas.height - anchorY - this.visual.marginBottom;

        console.log('[VISUAL-SCALE] 📐 Расчёт масштаба (FIXED - no stackHeight):', {
            requiredLength: requiredLengthPx.toFixed(1) + 'px',
            canvasHeight: canvas.height + 'px',
            anchorY: anchorY.toFixed(1) + 'px',
            stackHeight: stackHeight.toFixed(1) + 'px (not used in calculation)',
            marginBottom: this.visual.marginBottom + 'px',
            available: available.toFixed(1) + 'px',
            needsScaling: requiredLengthPx > available
        });

        if (available <= 0) {
            this.visual.scale = this.visual.minScale;
            console.log('[VISUAL-SCALE] ⚠️ No space available, using minScale:', this.visual.minScale);
            return;
        }

        if (requiredLengthPx > available) {
            const proposed = available / requiredLengthPx;
            this.visual.scale = Math.max(this.visual.minScale, Math.min(1, proposed));
            console.log('[VISUAL-SCALE] 📉 Scaling down:', {
                proposed: proposed.toFixed(3),
                finalScale: this.visual.scale.toFixed(3),
                visualLength: (requiredLengthPx * this.visual.scale).toFixed(1) + 'px'
            });
        } else {
            this.visual.scale = 1;
            console.log('[VISUAL-SCALE] ✅ No scaling needed, scale=1');
        }
    }

    drawBackground() {
        canvasUtils.clear(this.contexts.background);
    }

    drawEquipment() {
        const ctx = this.contexts.equipment;
        canvasUtils.clear(ctx);
    }

    drawDynamic(isOverloaded = false) {
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

        // 🚀 ОПТИМИЗАЦИЯ: Проверяем, нужно ли перерисовать кеш пружины
        if (this.springCache.needsUpdate || 
            this.springCache.lastLength !== length || 
            this.springCache.lastCoils !== coils ||
            this.springCache.lastOverloaded !== isOverloaded) {
            
            // Перерисовываем пружину в offscreen canvas
            const cacheCtx = this.springCache.ctx;
            cacheCtx.clearRect(0, 0, this.springCache.canvas.width, this.springCache.canvas.height);
            
            // Рисуем витки в кеш (центрируем в offscreen canvas)
            const cacheAnchor = { x: 100, y: 50 };
            this.drawSpringCoils(cacheCtx, cacheAnchor, length, coils, springRadius, wireRadius, isOverloaded);
            this.drawTopHook(cacheCtx, cacheAnchor.x, cacheAnchor.y, wireRadius, isOverloaded);
            this.drawBottomHook(cacheCtx, cacheAnchor.x, cacheAnchor.y + length, wireRadius, isOverloaded);
            
            // Обновляем метаданные кеша
            this.springCache.lastLength = length;
            this.springCache.lastCoils = coils;
            this.springCache.lastOverloaded = isOverloaded;
            this.springCache.needsUpdate = false;
        }
        
        // Рисуем закешированную пружину из offscreen canvas
        ctx.drawImage(
            this.springCache.canvas,
            0, 0, 200, length + 100, // Источник
            anchor.x - 100, anchor.y - 50, 200, length + 100 // Назначение
        );

        // Подвешенные грузы
        this.drawAttachedWeights(ctx, anchor.x, anchor.y + length);
        
        // Измерительная линейка
        this.drawRuler(ctx, anchor.x + 80, anchor.y, physicalLength);
        
        // 🆕 Рисуем свободные грузы
        this.drawFreeWeights(ctx);
        
        // 🎯 Зона прилипания: если тащим груз, показываем куда можно прикрепить
        const draggedWeight = this.state.freeWeights?.find(w => w.isDragging);
        if (draggedWeight) {
            const springBottomHookX = anchor.x;
            const springBottomHookY = anchor.y + length;
            
            // Calculate distance for snap feedback
            const weightDef = this.getWeightById(draggedWeight.weightId);
            const img = weightDef ? (this.images.weights[draggedWeight.weightId] || this.images.weights[weightDef.id]) : null;
            const targetSize = weightDef?.targetSize ?? 72;
            const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
            const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
            
            const weightTopHookX = draggedWeight.x;
            const weightTopHookY = draggedWeight.y - renderedHeight/2 - 12;
            
            const distance = Math.hypot(weightTopHookX - springBottomHookX, weightTopHookY - springBottomHookY);
            const isSnapped = distance < 100;

            ctx.save();
            
            if (isSnapped) {
                // Strong snap feedback
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 5;
                ctx.setLineDash([]); // Solid line
                ctx.fillStyle = 'rgba(50, 255, 50, 0.3)';
                
                // Draw anchor icon
                ctx.font = '40px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.fillText('⚓', springBottomHookX, springBottomHookY);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.3)'; // Restore fill style
            } else {
                // Weak feedback
                ctx.strokeStyle = 'rgba(0, 255, 100, 0.5)';
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 4]);
                ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
            }
            
            // Зелёный круг вокруг нижнего крючка пружины
            ctx.beginPath();
            ctx.arc(springBottomHookX, springBottomHookY, 100, 0, Math.PI * 2); // 🔧 Радиус увеличен до 100
            ctx.stroke();
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
            // ✅ Используем тот же масштаб что и для подвешенных грузов
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
                // weight.y is CENTER of the image; drawImage expects center when translated here
                ctx.translate(weight.x, weight.y);
                ctx.scale(scale, scale);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
            } else {
                // Fallback: плейсхолдер. Use weight.y as center
                this.drawWeightPlaceholder(ctx, weight.x, weight.y, targetSize, renderedHeight, 0);
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
            
            // � Рисуем ДИСКИ на ШТАНГЕ (наборный груз)
            // Render composite disks on rod
            if (weight.compositeDisks && weight.compositeDisks.length > 0) {
                ctx.save();
                
                // Support ring position in SVG: y=264 out of height=320 = 82.5% from top
                // weight.y is CENTER of rod, renderedHeight is FULL height
                // Support ring is at: top + height * 0.825 = (center - height/2) + height * 0.825
                // = center + height * (0.825 - 0.5) = center + height * 0.325
                const rodSupportRingY = weight.y + renderedHeight * 0.325;
                let diskStackHeight = 0;
                
                console.log('[COMPOSITE] Drawing', weight.compositeDisks.length, 'disks on rod');
                console.log('[COMPOSITE] Rod center Y:', weight.y.toFixed(0), 'height:', renderedHeight.toFixed(0), 'Support ring Y:', rodSupportRingY.toFixed(0));
                
                // Track where the BOTTOM of the next disk should be placed
                let currentBottomY = rodSupportRingY; // Start at support ring
                
                // Draw disks from bottom to top (already sorted large to small)
                weight.compositeDisks.forEach((disk, index) => {
                    const diskDef = this.getWeightById(disk.weightId);
                    if (!diskDef) return;
                    
                    const diskImg = this.images.weights[disk.weightId] || this.images.weights[diskDef.id];
                    // ✅ Используем тот же масштаб что и для подвешенных дисков
                    const diskTargetSize = diskDef.targetSize ?? 50;
                    const diskScale = diskTargetSize / (diskImg ? Math.max(diskImg.width, diskImg.height) : diskTargetSize);
                    
                    // КРИТИЧЕСКИ ВАЖНО: используем РЕАЛЬНУЮ толщину диска из SVG!
                    // В SVG дисков реальная толщина ~17% от высоты изображения
                    // (10г: 12/72=16.7%, 20г: 14/80=17.5%, 50г: 18/110=16.4%)
                    const diskHeight = diskImg ? diskImg.height * diskScale * 0.17 : diskTargetSize * 0.2;
                    
                    // Disk center is half-height above where its bottom should be
                    const diskY = currentBottomY - diskHeight / 2;
                    
                    console.log('[COMPOSITE] Disk', index, '('+diskDef.diskSize+'):', 
                        'Y='+diskY.toFixed(0), 'thickness='+diskHeight.toFixed(1), 'bottomY='+currentBottomY.toFixed(0));
                    
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                    ctx.shadowBlur = 8;
                    ctx.shadowOffsetX = 3;
                    ctx.shadowOffsetY = 4;
                    
                    if (diskImg) {
                        ctx.save();
                        ctx.translate(weight.x, diskY);
                        ctx.scale(diskScale, diskScale);
                        ctx.drawImage(diskImg, -diskImg.width / 2, -diskImg.height / 2);
                        ctx.restore();
                    } else {
                        // Disk placeholder
                        ctx.fillStyle = '#888';
                        ctx.fillRect(weight.x - diskTargetSize/2, diskY - diskHeight/2, diskTargetSize, diskHeight);
                    }
                    
                    // Next disk's bottom is at current disk's top (ПЛОТНОЕ ПРИЛЕГАНИЕ)
                    currentBottomY = diskY - diskHeight / 2;
                });
                
                ctx.restore();
            }
            
            // 🔗 Рисуем прикреплённые грузы (стопку)
            if (weight.stackedWeights && weight.stackedWeights.length > 0) {
                ctx.save();
                
                // Начинаем отрисовку снизу основного груза
                // weight.y - центр основного груза
                const hookGap = 22; // Зазор для "крючка" между грузами
                let currentTopY = weight.y + renderedHeight / 2 + hookGap;
                
                weight.stackedWeights.forEach((stackedWeight, stackIndex) => {
                    const stackedDef = this.getWeightById(stackedWeight.weightId || stackedWeight.id);
                    if (!stackedDef) return;
                    
                    const stackImg = this.images.weights[stackedWeight.weightId] || this.images.weights[stackedDef.id];
                    // ✅ Используем тот же масштаб что и для подвешенных грузов
                    const stackTargetSize = stackedDef.targetSize ?? 72;
                    const stackScale = stackTargetSize / (stackImg ? Math.max(stackImg.width, stackImg.height) : stackTargetSize);
                    const stackHeight = stackImg ? stackImg.height * stackScale : stackTargetSize * 0.9;
                    
                    // Рисуем соединительный крючок (как у подвешенных)
                    ctx.strokeStyle = 'rgba(180, 180, 180, 0.7)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(weight.x, currentTopY - hookGap);
                    ctx.lineTo(weight.x, currentTopY);
                    ctx.stroke();
                    
                    // Центр следующего груза
                    const stackCenterY = currentTopY + stackHeight / 2;
                    
                    // Рисуем груз
                    if (stackImg) {
                        ctx.save();
                        ctx.translate(weight.x, stackCenterY);
                        ctx.scale(stackScale, stackScale);
                        
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                        ctx.shadowBlur = 8;
                        ctx.shadowOffsetX = 3;
                        ctx.shadowOffsetY = 5;
                        
                        ctx.drawImage(stackImg, -stackImg.width / 2, -stackImg.height / 2);
                        ctx.restore();
                    } else {
                        // Fallback
                        ctx.fillStyle = '#888';
                        ctx.fillRect(weight.x - stackTargetSize/2, stackCenterY - stackHeight/2, stackTargetSize, stackHeight);
                    }
                    
                    console.log('[STACK] Груз', stackIndex, ':', 
                        'centerY='+stackCenterY.toFixed(0), 'height='+stackHeight.toFixed(0));
                    
                    // Следующий груз начинается ниже текущего + зазор для крючка
                    currentTopY = stackCenterY + stackHeight / 2 + hookGap;
                });
                
                ctx.restore();
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
        const totalMass = this.getTotalAttachedMass();
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
            ctx.arc(dynBottomHookX, dynBottomHookY, 100, 0, Math.PI * 2); // 🔧 Радиус увеличен до 100
            ctx.stroke();
            
            // Полупрозрачная заливка
            ctx.fillStyle = 'rgba(0, 255, 100, 0.1)';
            ctx.fill();
            
            ctx.restore();
        }
    }

    drawSpringCoils(ctx, anchor, length, coils, springRadius, wireRadius, isOverloaded = false) {
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
            
            if (isOverloaded) {
                // Red tint for overload
                coilGrad.addColorStop(0, '#d0b8b8');
                coilGrad.addColorStop(0.2, '#f2e8e8');
                coilGrad.addColorStop(0.5, '#fbf8f8');
                coilGrad.addColorStop(0.8, '#e6d4d4');
                coilGrad.addColorStop(1, '#b29a9a');
                // Add a red glow
                ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
                ctx.shadowBlur = 10;
            } else {
                coilGrad.addColorStop(0, '#b8c2d0');
                coilGrad.addColorStop(0.2, '#e8ecf2');
                coilGrad.addColorStop(0.5, '#f8f9fb');
                coilGrad.addColorStop(0.8, '#d4dce6');
                coilGrad.addColorStop(1, '#9aa4b2');
            }
            
            ctx.fillStyle = coilGrad;
            ctx.beginPath();
            ctx.ellipse(anchor.x, y, springRadius, wireRadius, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Обводка
            ctx.strokeStyle = isOverloaded ? 'rgba(150, 50, 50, 0.5)' : 'rgba(80, 90, 105, 0.3)';
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

    drawTopHook(ctx, x, y, wireRadius, isOverloaded = false) {
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
        if (isOverloaded) {
             hookGrad.addColorStop(0, '#fbf8f8');
             hookGrad.addColorStop(0.4, '#f2e8e8');
             hookGrad.addColorStop(1, '#b29a9a');
        } else {
             hookGrad.addColorStop(0, '#ffffff');
             hookGrad.addColorStop(0.4, '#e8ecf2');
             hookGrad.addColorStop(1, '#9aa4b2');
        }
        ctx.fillStyle = hookGrad;
        ctx.beginPath();
        ctx.arc(x, y, hookRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Обводка
        ctx.strokeStyle = isOverloaded ? 'rgba(150, 50, 50, 0.4)' : 'rgba(80, 90, 105, 0.4)';
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

    drawBottomHook(ctx, x, y, wireRadius, isOverloaded = false) {
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
        if (isOverloaded) {
            stemGrad.addColorStop(0, '#b29a9a');
            stemGrad.addColorStop(0.5, '#f2e8e8');
            stemGrad.addColorStop(1, '#d0b8b8');
        } else {
            stemGrad.addColorStop(0, '#9aa4b2');
            stemGrad.addColorStop(0.5, '#e8ecf2');
            stemGrad.addColorStop(1, '#b8c2d0');
        }
        ctx.fillStyle = stemGrad;
        ctx.fillRect(x - wireRadius, y, wireRadius * 2, stemLength);
        ctx.strokeStyle = isOverloaded ? 'rgba(150, 50, 50, 0.3)' : 'rgba(80, 90, 105, 0.3)';
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

            // 🔩 Если это штанга с дисками, рисуем диски на ней
            if (item.compositeDisks && item.compositeDisks.length > 0) {
                ctx.save();
                
                // Позиция опорного кольца на штанге (82.5% от верха = 32.5% от центра вниз)
                const rodSupportRingY = centerY + renderedHeight * 0.325;
                let currentBottomY = rodSupportRingY;
                
                // Рисуем диски снизу вверх (уже отсортированы)
                item.compositeDisks.forEach((disk, diskIndex) => {
                    const diskDef = this.getWeightById(disk.weightId);
                    if (!diskDef) return;
                    
                    const diskImg = this.images.weights[disk.weightId] || this.images.weights[diskDef.id];
                    // ✅ Используем базовый размер дисков без увеличения
                    const diskTargetSize = diskDef.targetSize ?? 50;
                    const diskScale = diskTargetSize / (diskImg ? Math.max(diskImg.width, diskImg.height) : diskTargetSize);
                    const diskHeight = diskImg ? diskImg.height * diskScale * 0.17 : diskTargetSize * 0.2;
                    
                    const diskY = currentBottomY - diskHeight / 2;
                    
                    if (diskImg) {
                        ctx.save();
                        ctx.translate(hookX, diskY);
                        ctx.rotate(rotation); // Диски качаются вместе со штангой
                        ctx.scale(diskScale, diskScale);
                        
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                        ctx.shadowBlur = 8;
                        ctx.shadowOffsetX = 3;
                        ctx.shadowOffsetY = 4;
                        
                        ctx.drawImage(diskImg, -diskImg.width / 2, -diskImg.height / 2);
                        ctx.restore();
                    }
                    
                    currentBottomY = diskY - diskHeight / 2;
                });
                
                ctx.restore();
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
        
        // 🔧 УНИВЕРСАЛЬНАЯ функция для получения координат из любого типа события
        const getEventCoords = (e) => {
            // Если это touch event
            if (e.touches && e.touches.length > 0) {
                return {
                    clientX: e.touches[0].clientX,
                    clientY: e.touches[0].clientY
                };
            }
            // Если это changedTouches (touchend)
            if (e.changedTouches && e.changedTouches.length > 0) {
                return {
                    clientX: e.changedTouches[0].clientX,
                    clientY: e.changedTouches[0].clientY
                };
            }
            // Обычные mouse events
            return {
                clientX: e.clientX,
                clientY: e.clientY
            };
        };
        
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
            
            // 🔧 FIX: Предотвращаем прокрутку и зум на тач-устройствах
            e.preventDefault();

            const coords = getEventCoords(e);
            const rect = interactionSurface.getBoundingClientRect();
            const x = coords.clientX - rect.left;
            const y = coords.clientY - rect.top;
            this.lastPointer = { x: coords.clientX, y: coords.clientY };

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
            
            // 🔧 FIX: Предотвращаем лишние события
            e.preventDefault();

            const coords = getEventCoords(e);
            const rect = interactionSurface.getBoundingClientRect();
            const x = coords.clientX - rect.left;
            const y = coords.clientY - rect.top;

            // 🔧 FIX: Удаляем ВСЕ слушатели (mouse + touch)
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove, { passive: false });
            window.removeEventListener('touchend', handlePointerUp);
            window.removeEventListener('touchcancel', handlePointerUp);

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
                    const physicalLength = this.state.springLength || this.state.springNaturalLength;
                    // 🔧 CRITICAL FIX: Используем ВИЗУАЛЬНУЮ длину, как при рисовании!
                    const visualLength = this.getVisualLength(physicalLength);
                    const springBottomHookX = anchor.x;
                    const springBottomHookY = anchor.y + visualLength; // Визуальная координата!
                    const distance = Math.hypot(weightTopHookX - springBottomHookX, weightTopHookY - springBottomHookY);
                    
                    console.log('[FREE-WEIGHTS] Check spring attach:', {
                        weightHook: [weightTopHookX.toFixed(1), weightTopHookY.toFixed(1)],
                        springHook: [springBottomHookX.toFixed(1), springBottomHookY.toFixed(1)],
                        physicalLength: physicalLength.toFixed(1),
                        visualLength: visualLength.toFixed(1),
                        distance: distance.toFixed(1),
                        threshold: 100
                    });
                    
                    // 🔧 FIX: Увеличен радиус с 60 до 100 для консистентности
                    if (distance < 100) {
                        // 🚫 ЗАПРЕТ: Нельзя подвешивать отдельные диски!
                        const draggedDef = this.getWeightById(draggedFreeWeight.weightId);
                        if (draggedDef?.isCompositeDisk) {
                            console.log('[FREE-WEIGHTS] ❌ ЗАПРЕЩЕНО: Диски нельзя подвешивать напрямую! Только на штанге.');
                            this.showToast('⚠️ Диски нельзя подвешивать отдельно! Надевайте диски на штангу.');
                            draggedFreeWeight = null;
                            isDragging = false;
                            interactionSurface.style.cursor = 'default';
                            return;
                        }
                        
                        // ✅ РАЗРЕШЕНО: Штангу с дисками можно подвешивать!
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
                        threshold: 100
                    });
                    
                    // 🔧 FIX: Увеличен радиус с 60 до 100 для консистентности
                    if (distance < 100) {
                        // 🚫 ЗАПРЕТ: Нельзя подвешивать отдельные диски!
                        const draggedDef = this.getWeightById(draggedFreeWeight.weightId);
                        if (draggedDef?.isCompositeDisk) {
                            console.log('[FREE-WEIGHTS] ❌ ЗАПРЕЩЕНО: Диски нельзя подвешивать напрямую! Только на штанге.');
                            this.showToast('⚠️ Диски нельзя подвешивать отдельно! Надевайте диски на штангу.');
                            draggedFreeWeight = null;
                            isDragging = false;
                            interactionSurface.style.cursor = 'default';
                            return;
                        }
                        
                        // ✅ РАЗРЕШЕНО: Штангу с дисками можно подвешивать!
                        console.log('[FREE-WEIGHTS] ✅ Attaching to dynamometer');
                        this.attachFreeWeightToSpring(draggedFreeWeight);
                        draggedFreeWeight = null;
                        isDragging = false;
                        interactionSurface.style.cursor = 'default';
                        return;
                    }
                }
                
                // Проверяем соединение с другими грузами
                console.log('[FREE-WEIGHTS] ========== STACKING CHECK START ==========');
                console.log('[FREE-WEIGHTS] Dragged weight:', {
                    id: draggedFreeWeight.id.substring(0, 20),
                    type: draggedFreeWeight.type,
                    x: draggedFreeWeight.x.toFixed(1),
                    y: draggedFreeWeight.y.toFixed(1),
                    mass: draggedFreeWeight.mass,
                    isCompositeRod: this.weightsInventory.find(w => w.id === draggedFreeWeight.type)?.isCompositeRod,
                    isCompositeDisk: this.weightsInventory.find(w => w.id === draggedFreeWeight.type)?.isCompositeDisk
                });
                console.log('[FREE-WEIGHTS] Checking stacking with', this.state.freeWeights.length, 'weights');
                for (let otherWeight of this.state.freeWeights) {
                    if (otherWeight === draggedFreeWeight) {
                        console.log('[FREE-WEIGHTS] Skipping self');
                        continue;
                    }
                    const otherDef = this.weightsInventory.find(w => w.id === otherWeight.type);
                    console.log('[FREE-WEIGHTS] Testing stack with:', {
                        id: otherWeight.id.substring(0, 20),
                        type: otherWeight.type,
                        x: otherWeight.x.toFixed(1),
                        y: otherWeight.y.toFixed(1),
                        mass: otherWeight.mass,
                        isCompositeRod: otherDef?.isCompositeRod,
                        isCompositeDisk: otherDef?.isCompositeDisk
                    });
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
                
                // 🚫 Проверяем, не пытается ли пользователь надеть диск на подвешенную штангу
                const draggedDef = this.weightsInventory.find(w => w.id === draggedFreeWeight.type);
                if (draggedDef?.isCompositeDisk) {
                    // Проверяем, есть ли рядом подвешенная штанга
                    for (let otherWeight of this.state.freeWeights) {
                        const otherDef = this.weightsInventory.find(w => w.id === otherWeight.type);
                        if (otherDef?.isCompositeRod && this.state.selectedWeights?.has(otherWeight.weightId)) {
                            // Проверяем близость
                            const distanceX = Math.abs(otherWeight.x - draggedFreeWeight.x);
                            const distanceY = Math.abs(otherWeight.y - draggedFreeWeight.y);
                            if (distanceX < 80 && distanceY < 150) {
                                this.showToast('⚠️ Нельзя надеть диск на подвешенную штангу! Сначала снимите штангу.');
                                break;
                            }
                        }
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
                const weightDef = this.getWeightById(w.weightId);
                if (!weightDef) continue;
                
                // Вычисляем РЕАЛЬНУЮ высоту груза (как в drawFreeWeights)
                const img = this.images.weights[w.weightId] || this.images.weights[weightDef.id];
                const targetSize = weightDef.targetSize ?? 72;
                const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
                const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
                
                const halfWidth = targetSize / 2;
                const halfHeight = renderedHeight / 2;
                
                // ✅ КРИТИЧНО: w.y это ЦЕНТР груза, а не верх!
                if (x >= w.x - halfWidth && x <= w.x + halfWidth &&
                    y >= w.y - halfHeight && y <= w.y + halfHeight) {
                    return w;
                }
            }
            return null;
        };

        // 🔧 УНИВЕРСАЛЬНЫЙ обработчик начала перетаскивания (mouse + touch)
        const handlePointerDown = (e) => {
            // 🔧 FIX: Для touch events предотвращаем двойные срабатывания
            if (e.type === 'touchstart') {
                e.preventDefault();
            }
            
            const coords = getEventCoords(e);
            const rect = interactionSurface.getBoundingClientRect();
            const x = coords.clientX - rect.left;
            const y = coords.clientY - rect.top;
            
            console.log(`[DRAG-START] Event: ${e.type}, Coords: (${x.toFixed(0)}, ${y.toFixed(0)})`);
            
            // 🆕 ПРИОРИТЕТ 1: Проверяем свободные грузы (они сверху)
            const freeWeight = findFreeWeightAt(x, y);
            if (freeWeight) {
                isDragging = 'freeweight';
                draggedFreeWeight = freeWeight; // 🔧 Сохраняем ссылку
                dragOffset.x = x - freeWeight.x;
                dragOffset.y = y - freeWeight.y;
                freeWeight.isDragging = true;
                interactionSurface.style.cursor = 'grabbing';
                
                // 🔧 FIX: Добавляем слушатели для ОБОИХ типов событий
                window.addEventListener('mousemove', handlePointerMove);
                window.addEventListener('mouseup', handlePointerUp);
                window.addEventListener('touchmove', handlePointerMove, { passive: false });
                window.addEventListener('touchend', handlePointerUp);
                window.addEventListener('touchcancel', handlePointerUp);
                
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
                window.addEventListener('touchmove', handlePointerMove, { passive: false });
                window.addEventListener('touchend', handlePointerUp);
                window.addEventListener('touchcancel', handlePointerUp);
                
                console.log('[DRAG] Started dragging dynamometer');
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
                window.addEventListener('touchmove', handlePointerMove, { passive: false });
                window.addEventListener('touchend', handlePointerUp);
                window.addEventListener('touchcancel', handlePointerUp);
                
                console.log('[DRAG] Started dragging spring');
            }
        };
        
        // 🔧 FIX: Добавляем слушатели для ОБОИХ типов событий
        interactionSurface.addEventListener('mousedown', handlePointerDown);
        interactionSurface.addEventListener('touchstart', handlePointerDown, { passive: false });
        
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
        
        console.log('✅ Spring drag enabled (with touch support)');
        console.log('✅ Touch diagnostics: Press Ctrl+Shift+D or call window.touchDiag.enable()');
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
        
        // 🆕 КРИТИЧНО: Если есть наборные диски, добавляем их ДО подвешивания!
        if (freeWeight.compositeDisks && freeWeight.compositeDisks.length > 0) {
            weight.compositeDisks = [...freeWeight.compositeDisks];
            console.log('[ATTACH-FREE] ✅ Диски добавлены ДО подвешивания:', weight.compositeDisks.length, 'шт');
        }

        console.log('[ATTACH-FREE] Вызов attachWeight для:', weight.id);
        this.attachWeight(weight);
        
        // 🆕 Если есть стопка (обычные 100г грузы) - подвешиваем все грузы из неё
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
        }

        // 🆕 Добавляем диски в selectedWeights (UI state)
        if (freeWeight.compositeDisks && freeWeight.compositeDisks.length > 0) {
            console.log('[ATTACH-FREE] Обновление UI state для дисков');

            // Находим штангу в attachedWeights и проверяем наличие дисков
            const rodInChain = this.state.attachedWeights.find(w => w.id === weight.id);
            if (rodInChain && rodInChain.compositeDisks) {
                console.log('[ATTACH-FREE] ✅ Диски уже в объекте штанги в цепочке:', rodInChain.compositeDisks.length);
                
                // ✅ КРИТИЧНО: Добавляем диски в selectedWeights и убираем из usedWeightIds
                // Без этого диски не определяются как "подвешенные"!
                freeWeight.compositeDisks.forEach(disk => {
                    this.state.selectedWeights.add(disk.weightId);
                    this.state.usedWeightIds.delete(disk.weightId);
                    console.log('[ATTACH-FREE] ✅ Диск добавлен в selectedWeights:', disk.weightId);
                });
            }
        }

        // Если были либо stackedWeights либо compositeDisks, пересчитываем массу (включая диски) и обновляем визуальную длину пружины
        if ((freeWeight.stackedWeights && freeWeight.stackedWeights.length > 0) || (freeWeight.compositeDisks && freeWeight.compositeDisks.length > 0)) {
            const totalMass = this.state.attachedWeights.reduce((sum, item) => {
                const def = this.getWeightById(item.id);
                let itemMass = def?.mass ?? 0;
                
                // Если у элемента есть compositeDisks (штанга с дисками), добавляем массу дисков
                if (item.compositeDisks && item.compositeDisks.length > 0) {
                    const disksMass = item.compositeDisks.reduce((dsum, disk) => dsum + disk.mass, 0);
                    itemMass += disksMass;
                    console.log('[ATTACH-FREE] Штанга', item.id, 'базовая масса:', def?.mass, 'г, диски:', disksMass, 'г');
                }
                
                return sum + itemMass;
            }, 0);

            console.log('[ATTACH-FREE] Общая масса после подвешивания:', totalMass, 'г');
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
        console.log('[REMOVE-FREE] Current freeWeights:', this.state.freeWeights.map(fw => ({
            id: fw.id,
            weightId: fw.weightId,
            hasStack: !!fw.stackedWeights,
            stackSize: fw.stackedWeights?.length || 0,
            hasCompositeDisks: !!fw.compositeDisks,
            disksCount: fw.compositeDisks?.length || 0
        })));
        
        // 🔍 СЦЕНАРИЙ 1: Ищем груз в freeWeights напрямую (нижний груз в стопке или одиночный)
        let freeWeightIndex = this.state.freeWeights.findIndex(fw => fw.weightId === weightId);
        
        if (freeWeightIndex !== -1) {
            console.log('[REMOVE-FREE] ✅ Найден как основной груз (индекс:', freeWeightIndex, ')');
            const removedWeight = this.state.freeWeights[freeWeightIndex];
            
            // Удаляем из массива свободных
            this.state.freeWeights.splice(freeWeightIndex, 1);
            
            // 🔩 СПЕЦИАЛЬНАЯ ЛОГИКА: Если это штанга с дисками - возвращаем ВСЕ диски!
            if (removedWeight.compositeDisks && removedWeight.compositeDisks.length > 0) {
                console.log('[REMOVE-FREE] 🔩 Возврат наборного груза: штанга +', removedWeight.compositeDisks.length, 'дисков');
                removedWeight.compositeDisks.forEach(disk => {
                    this.state.usedWeightIds.delete(disk.weightId);
                    console.log('[REMOVE-FREE]   └─ Возврат диска:', disk.weightId, `(${disk.mass}г, ${disk.diskSize})`);
                });
            }
            
            // Если у груза была стопка сверху (100г грузы), возвращаем ВСЕ грузы из стопки
            if (removedWeight.stackedWeights && removedWeight.stackedWeights.length > 0) {
                console.log('[REMOVE-FREE] 📚 Возврат стопки из', removedWeight.stackedWeights.length, 'грузов');
                removedWeight.stackedWeights.forEach(sw => {
                    this.state.usedWeightIds.delete(sw.weightId);
                    console.log('[REMOVE-FREE]   └─ Возврат груза из стопки:', sw.weightId);
                });
            }
            
            // Убираем сам груз из usedWeightIds
            this.state.usedWeightIds.delete(weightId);
            this.state.selectedWeights.delete(weightId);
            
            console.log('[REMOVE-FREE] ✅ Груз удалён, осталось свободных:', this.state.freeWeights.length);
            
            // Обновляем UI
            this.renderWeightsInventory();
            this.drawDynamic();
            this.showToast('✓ Груз возвращён в инвентарь');
            return;
        }
        
        // 🔍 СЦЕНАРИЙ 2: Ищем диск в compositeDisks (диск на штанге)
        console.log('[REMOVE-FREE] Груз не найден напрямую, ищем в compositeDisks (диски на штанге)...');
        for (let i = 0; i < this.state.freeWeights.length; i++) {
            const freeWeight = this.state.freeWeights[i];
            if (freeWeight.compositeDisks && freeWeight.compositeDisks.length > 0) {
                const diskIndex = freeWeight.compositeDisks.findIndex(d => d.weightId === weightId);
                if (diskIndex !== -1) {
                    console.log('[REMOVE-FREE] ✅ Найден диск на штанге', freeWeight.weightId, 'на позиции', diskIndex);
                    
                    // Удаляем диск из массива
                    const removedDisk = freeWeight.compositeDisks.splice(diskIndex, 1)[0];
                    
                    // Уменьшаем массу штанги
                    freeWeight.mass -= removedDisk.mass;
                    
                    // Возвращаем диск в инвентарь
                    this.state.usedWeightIds.delete(removedDisk.weightId);
                    this.state.selectedWeights.delete(removedDisk.weightId);
                    
                    console.log('[REMOVE-FREE] ✅ Диск удалён, осталось на штанге:', freeWeight.compositeDisks.length, 'дисков, масса штанги:', freeWeight.mass, 'г');
                    
                    // Обновляем UI
                    this.renderWeightsInventory();
                    this.drawDynamic();
                    this.showToast(`✓ Диск ${removedDisk.mass}г возвращён в инвентарь`);
                    return;
                }
            }
        }
        
        // 🔍 СЦЕНАРИЙ 3: Ищем груз в stackedWeights (верхний груз в стопке 100г)
        console.log('[REMOVE-FREE] Ищем в stackedWeights (обычные грузы в стопке)...');
        for (let i = 0; i < this.state.freeWeights.length; i++) {
            const freeWeight = this.state.freeWeights[i];
            if (freeWeight.stackedWeights && freeWeight.stackedWeights.length > 0) {
                const stackIndex = freeWeight.stackedWeights.findIndex(sw => sw.weightId === weightId);
                if (stackIndex !== -1) {
                    console.log('[REMOVE-FREE] ✅ Найден в стопке груза', freeWeight.weightId, 'на позиции', stackIndex);
                    
                    // Удаляем из стопки
                    const removedStackWeight = freeWeight.stackedWeights.splice(stackIndex, 1)[0];
                    
                    // Возвращаем этот груз в инвентарь
                    this.state.usedWeightIds.delete(removedStackWeight.weightId);
                    this.state.selectedWeights.delete(removedStackWeight.weightId);
                    
                    console.log('[REMOVE-FREE] ✅ Груз удалён из стопки, осталось в стопке:', freeWeight.stackedWeights.length);
                    
                    // Обновляем UI
                    this.renderWeightsInventory();
                    this.drawDynamic();
                    this.showToast('✓ Груз возвращён в инвентарь');
                    return;
                }
            }
        }
        
        // 🔍 СЦЕНАРИЙ 4: Груз вообще не найден
        console.warn('[REMOVE-FREE] ⚠️ Груз не найден ни в freeWeights, ни в compositeDisks, ни в stackedWeights!', weightId);
        console.warn('[REMOVE-FREE] Очищаем usedWeightIds на всякий случай...');
        this.state.usedWeightIds.delete(weightId);
        this.state.selectedWeights.delete(weightId);
        this.renderWeightsInventory();
        this.showToast('✓ Груз возвращён в инвентарь');
    }
    
    canStackWeights(weight1, weight2) {
        // Проверяем, можно ли соединить грузы
        // weight1 — нижний (на котором будет висеть weight2)
        // weight2 — верхний (который подвешиваем)
        
        const weightDef1 = this.getWeightById(weight1.weightId);
        const weightDef2 = this.getWeightById(weight2.weightId);
        
        if (!weightDef1 || !weightDef2) return false;
        
        // 🔩 СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ НАБОРНОГО ГРУЗА
        // Диски надеваются на штангу снизу, ложатся на опорное кольцо и друг на друга
        const isRod1 = weightDef1.isCompositeRod;
        const isRod2 = weightDef2.isCompositeRod;
        const isDisk1 = weightDef1.isCompositeDisk;
        const isDisk2 = weightDef2.isCompositeDisk;
        
        // Случай 1: Добавляем диск К ШТАНГЕ (диск надевается на штангу)
        if (isRod1 && isDisk2) {
            // 🚫 ЗАПРЕТ: Нельзя надевать диски на подвешенную штангу!
            // Проверяем, не висит ли штанга на пружине/динамометре
            const isRodAttached = this.state.selectedWeights?.has(weight1.weightId);
            if (isRodAttached) {
                console.log('[CAN-STACK] ❌ ЗАПРЕЩЕНО: Штанга уже подвешена! Нельзя надеть диск на висящую штангу.');
                return false;
            }
            
            // Вычисляем РЕАЛЬНУЮ высоту штанги с учетом текущего масштаба
            const imgRod = this.images.weights[weight1.weightId] || this.images.weights[weightDef1.id];
            // ✅ Используем базовый размер без увеличения
            const targetSizeRod = weightDef1.targetSize ?? 72;
            const renderScaleRod = targetSizeRod / (imgRod ? Math.max(imgRod.width, imgRod.height) : targetSizeRod);
            const renderedHeightRod = imgRod ? imgRod.height * renderScaleRod : targetSizeRod * 0.9;
            
            // Опорное кольцо на 82.5% высоты от верха (y=264/320 в SVG)
            // weight1.y - центр штанги
            // Support ring = top + height * 0.825 = (center - height/2) + height * 0.825
            // = center + height * 0.325
            const rodSupportRingY = weight1.y + renderedHeightRod * 0.325;
            const diskY = weight2.y;
            const distanceX = Math.abs(weight1.x - weight2.x);
            const distanceY = Math.abs(rodSupportRingY - diskY);
            
            console.log('[CAN-STACK] Rod+Disk check:', {
                rodCenter: weight1.y.toFixed(0),
                rodHeight: renderedHeightRod.toFixed(0),
                supportRingY: rodSupportRingY.toFixed(0),
                diskY: diskY.toFixed(0),
                dX: distanceX.toFixed(0),
                dY: distanceY.toFixed(0),
                canConnect: (distanceX < 60 && distanceY < 100)
            });
            
            return distanceX < 60 && distanceY < 100;
        }
        
        // Случай 2: Добавляем диск К УЖЕ НАДЕТЫМ ДИСКАМ (диск на диск)
        if (isDisk1 && isDisk2) {
            // 🚫 ЗАПРЕТ: Проверяем, не на подвешенной ли штанге эти диски
            // Ищем штангу, на которой находится disk1
            const rodWithDisk = this.state.freeWeights?.find(fw => {
                const def = this.getWeightById(fw.weightId);
                return def?.isCompositeRod && fw.compositeDisks?.some(d => d.weightId === weight1.weightId);
            });
            
            if (rodWithDisk) {
                const isRodAttached = this.state.selectedWeights?.has(rodWithDisk.weightId);
                if (isRodAttached) {
                    console.log('[CAN-STACK] ❌ ЗАПРЕЩЕНО: Диски на подвешенной штанге! Нельзя добавлять диски к висящей штанге.');
                    return false;
                }
            }
            
            // Диски должны быть близко по X (тот же стержень) и по Y (один на другом)
            const distanceX = Math.abs(weight1.x - weight2.x);
            const distanceY = Math.abs(weight1.y - weight2.y);
            
            console.log('[CAN-STACK] Disk+Disk check:', {
                disk1Y: weight1.y.toFixed(0),
                disk2Y: weight2.y.toFixed(0),
                dX: distanceX.toFixed(0),
                dY: distanceY.toFixed(0),
                canConnect: (distanceX < 60 && distanceY < 80)
            });
            
            // Диски накладываются друг на друга, допуск больше с учетом масштаба 1.8x
            return distanceX < 60 && distanceY < 80;
        }
        
        // Случай 3: Обычные грузы 100г (старая логика)
        
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
    
    stackWeights(baseWeight, addedWeight) {
        // Соединяем грузы в стопку
        // baseWeight - штанга или груз с дисками
        // addedWeight - диск или груз который добавляем
        
        const baseDef = this.getWeightById(baseWeight.weightId);
        const addedDef = this.getWeightById(addedWeight.weightId);
        
        // 🔩 СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ НАБОРНОГО ГРУЗА
        if (baseDef.isCompositeRod || baseDef.isCompositeDisk) {
            // Инициализируем массив дисков если нужно
            if (!baseWeight.compositeDisks) {
                baseWeight.compositeDisks = [];
            }
            
            // Удаляем добавляемый диск из freeWeights
            const index = this.state.freeWeights.indexOf(addedWeight);
            if (index !== -1) {
                this.state.freeWeights.splice(index, 1);
            }
            
            // Добавляем диск в массив
            baseWeight.compositeDisks.push({
                weightId: addedWeight.weightId,
                mass: addedWeight.mass,
                diskSize: addedDef.diskSize
            });
            
            // Увеличиваем общую массу
            baseWeight.mass += addedWeight.mass;
            
            // ✅ КРИТИЧНО: Помечаем диск как использованный (на canvas)
            // Без этого диск будет показываться как "В комплекте"!
            this.state.usedWeightIds.add(addedWeight.weightId);
            
            console.log('[COMPOSITE] ✅ Диск помечен как использованный:', addedWeight.weightId);
            
            // Сортируем диски от большого к малому (снизу вверх)
            baseWeight.compositeDisks.sort((a, b) => {
                const sizeOrder = { large: 3, medium: 2, small: 1 };
                return (sizeOrder[b.diskSize] || 0) - (sizeOrder[a.diskSize] || 0);
            });
            
            console.log('[COMPOSITE] Диск добавлен на штангу:', {
                totalMass: baseWeight.mass,
                disks: baseWeight.compositeDisks.length,
                diskSizes: baseWeight.compositeDisks.map(d => d.diskSize)
            });
            
            // ✅ Обновляем инвентарь чтобы кнопки обновились
            this.renderWeightsInventory();
            this.drawDynamic();
            return;
        }
        
        // 🔩 СТАНДАРТНАЯ ЛОГИКА ДЛЯ ОБЫЧНЫХ ГРУЗОВ 100г
        if (!baseWeight.stackedWeights) {
            baseWeight.stackedWeights = [];
        }
        
        // Удаляем нижний груз из freeWeights
        const index = this.state.freeWeights.indexOf(addedWeight);
        if (index !== -1) {
            this.state.freeWeights.splice(index, 1);
        }
        
        // Добавляем к стопке
        baseWeight.stackedWeights.push(addedWeight);
        baseWeight.mass += addedWeight.mass;
        
        // Рекурсивно добавляем вложенные грузы
        if (addedWeight.stackedWeights) {
            addedWeight.stackedWeights.forEach(w => {
                baseWeight.stackedWeights.push(w);
                baseWeight.mass += w.mass;
            });
        }
        
        console.log('[STACK] Weights stacked:', baseWeight.mass, 'г');
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

        // 🆕 Check Overload
        const isOverloaded = this.physicsEngine.checkOverload(this.state.springElongation);

        // Render dynamic layers
        this.drawDynamic(isOverloaded);
        this.particleSystem.render();

        // 🆕 Render Magnifier
        const uiCtx = this.contexts.ui;
        uiCtx.clearRect(0, 0, this.canvases.ui.width, this.canvases.ui.height);
        this.magnifier.draw();

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
    
    // 🔧 ДИАГНОСТИКА: Автоматическое включение ОТКЛЮЧЕНО
    // Для включения диагностики вручную используйте:
    // - Горячая клавиша: Ctrl+Shift+D
    // - Консоль: window.touchDiag.enable()
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    
    if (isTouchDevice) {
        console.log('📱 Touch device detected. Touch diagnostics available (Ctrl+Shift+D or window.touchDiag.enable())');
    } else {
        console.log('🖱️ Desktop device. Touch diagnostics: Ctrl+Shift+D or window.touchDiag.enable()');
    }
});
// Force reload: 1761043021
