/**
 * Experiment 2: Измерение коэффициента трения скольжения
 * Interactive Friction Force Measurement
 * 
 * Physics: F_тр = μ × N = μ × mg
 * Method: Pull wooden block with dynamometer until sliding
 * 
 * REFACTORED: v2.0 - Using interact.js for proper drag&drop (like spring experiment)
 */

import { ParticleSystem } from '../shared/particle-effects.js?v=1445';
import { Magnifier } from '../shared/magnifier.js?v=FIX_MAGNIFIER';
import { 
    PHYSICS_CONFIG, 
    VISUAL_CONFIG, 
    LAYOUT_CONFIG, 
    EQUIPMENT_CONFIG, 
    WEIGHTS_INVENTORY,
    SURFACE_TEXTURES 
} from './friction-config.js';

class FrictionExperiment {
    constructor() {
        // Canvas layers
        this.canvases = {
            background: document.getElementById('canvas-background'),
            equipment: document.getElementById('canvas-equipment'),
            dynamic: document.getElementById('canvas-dynamic'),
            particles: document.getElementById('canvas-particles'),
            ui: document.getElementById('canvas-ui')
        };
        
        this.contexts = {};
        for (const [name, canvas] of Object.entries(this.canvases)) {
            if (canvas) {
                this.contexts[name] = canvas.getContext('2d');
            }
        }
        
        // Layout configuration
        this.layout = {
            surface: { ...LAYOUT_CONFIG.surface },
            block: { ...LAYOUT_CONFIG.block }
        };
        
        // State
        this.state = {
            // Block position and physics
            blockX: LAYOUT_CONFIG.block.startX,
            blockY: LAYOUT_CONFIG.block.startY,
            blockMass: EQUIPMENT_CONFIG.block.mass, // grams
            weightsOnBlock: [], // Array of weight objects on the block
            
            // Equipment placement state (start with empty canvas)
            surfacePlaced: false,    // Поверхность ещё не размещена
            blockPlaced: false,      // Брусок ещё не размещён
            dynamometerPlaced: false, // Динамометр ещё не размещён
            activeDynamometer: null,  // 'dynamometer1' или 'dynamometer5'
            dynamometerMode: null,    // 'vertical' (взвешивание) или 'horizontal' (трение)
            dynamometerX: 150,        // Позиция вертикального динамометра
            dynamometerY: 100,
            
            // Weighing state (for vertical dynamometer)
            weighingItems: [],        // Array of items on hook: [{type: 'weight', id, mass}, {type: 'block'}]
            weighingTotalMass: 0,     // Total mass on hook in grams
            
            // Dynamometer state (for horizontal mode)
            dynamometerAttached: false, // Прицеплен к бруску
            pullingForce: 0, // Current applied force in N
            isPulling: false,
            pullStartX: 0,
            
            // Motion state
            isSliding: false,
            velocity: 0,
            
            // Surface
            currentSurface: 'wood',
            
            // Measurements
            measurements: [],
            currentFrictionForce: 0,
            
            // New measurement system (like spring)
            recordedNormal: 0,          // Записанная сила N в Н
            recordedFriction: undefined, // Записанная сила трения в Н
            
            // Drag state
            isDragging: false,
            currentWeight: null,
            usedWeightIds: new Set(),
            
            // 🆕 Свободные грузы на canvas (не прикреплённые к оборудованию)
            freeWeights: [], // Array of {id, weightId, mass, x, y, width, height, isDragging, stackedWeights?}
            
            // Drag position for snap zone visualization
            dragPosition: null,        // {x, y} - текущая позиция перетаскивания
            draggingItemType: null,    // 'weight' или 'block' или 'dynamometer'
            draggingItemId: null,      // id перетаскиваемого груза
            draggingItemMass: null,    // масса перетаскиваемого предмета
            
            // Dynamometer dragging on canvas
            isDraggingDynamometer: false, // Перетаскивание динамометра на canvas
            dynamometerDragOffset: { x: 0, y: 0 } // Смещение при начале драга
        };
        
        // Weighing canvas
        // Record button area (for canvas click detection)
        this.recordButtonArea = null;
        this.attachButtonArea = null;
        
        // Inventory
        this.weightsInventory = [...WEIGHTS_INVENTORY];
        
        // Animation
        this.animationId = null;
        this.lastTime = 0;
        
        // 🚀 ОПТИМИЗАЦИЯ: Флаг dirty для избежания лишних перерисовок
        this._needsRedraw = true;
        this._frameSkip = 0;
        
        // 🚀 ОПТИМИЗАЦИЯ: Offscreen canvas для кеширования бруска
        this.blockCache = {
            canvas: document.createElement('canvas'),
            ctx: null,
            needsUpdate: true,
            lastMass: null
        };
        this.blockCache.canvas.width = 200;
        this.blockCache.canvas.height = 150;
        this.blockCache.ctx = this.blockCache.canvas.getContext('2d');
        
        // Bind requestRedraw для удобства
        this.requestRedraw = this.requestRedraw.bind(this);
        
        // Particles
        this.particles = null;
        
        // Magnifier
        this.magnifier = null;
        
        // Chart
        this.chart = null;
        
        // Drag ghost element
        this.dragGhost = null;
        
        // Загруженные изображения грузов
        this.weightImages = {};
    }
    
    // 🚀 ОПТИМИЗАЦИЯ: Метод для запроса перерисовки (вместо прямого вызова drawDynamic)
    requestRedraw() {
        this._needsRedraw = true;
        this.blockCache.needsUpdate = true;
    }
    
    async init() {
        console.log('🔬 Initializing Friction Experiment v2.0...');
        
        try {
            // Preload weight images
            await this.preloadWeightImages();
            
            // Check interact.js
            if (typeof interact === 'undefined') {
                console.error('❌ interact.js not loaded!');
                throw new Error('interact.js required');
            }
            console.log('✅ Interact.js version:', interact.version || 'loaded');
            
            // Initialize particles
            if (this.canvases.particles) {
                this.particles = new ParticleSystem(this.canvases.particles);
            }
            
            // Initialize magnifier - pass all visual layers + UI canvas for drawing
            // 🔧 FIX: Pass all visual layers to magnifier so it sees everything (like in spring experiment)
            this.magnifier = new Magnifier(
                [this.canvases.background, this.canvases.equipment, this.canvases.dynamic, this.canvases.particles],
                this.canvases.ui
            );
            
            // Setup event listeners (buttons, selects)
            this.setupEventListeners();
            
            // Setup drag & drop with interact.js
            this.setupDragAndDrop();
            
            // Setup pull interaction on canvas
            this.setupPullInteraction();
            
            // Render inventory
            this.renderEquipmentInventory();
            this.renderWeightsInventory();
            
            // Initialize chart
            this.initChart();
            
            // Initial render
            this.drawBackground();
            this.drawEquipment();
            this.drawDynamic();
            this.updateMeasurementDisplay();
            
            // Hide loading
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            // Start animation loop
            this.startAnimationLoop();
            
            console.log('✅ Friction Experiment initialized successfully!');
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            alert('Ошибка инициализации: ' + error.message);
            throw error;
        }
    }
    
    // ==================== DRAG & DROP (interact.js) ====================
    
    setupDragAndDrop() {
        console.log('[DRAG] Setting up interact.js for weights and equipment...');
        
        // Check interact.js
        if (typeof interact === 'undefined') {
            console.error('[DRAG] ❌ interact.js not loaded!');
            return;
        }
        console.log('[DRAG] ✅ interact.js loaded');
        
        // Configure interact.js
        interact.pointerMoveTolerance(5);
        interact.dynamicDrop(true);
        
        // Make weight items draggable
        interact('.weight-item').draggable({
            inertia: false, // 🚀 ОПТИМИЗАЦИЯ: отключаем инерцию для быстрого drag
            autoScroll: false,
            manualStart: false,
            hold: 0,
            listeners: {
                start: (event) => this.onDragStart(event),
                move: (event) => this.onDragMove(event),
                end: (event) => this.onDragEnd(event)
            }
        });
        
        // Make equipment items draggable (surface, block, dynamometer)
        interact('.equipment-item').draggable({
            inertia: false, // 🚀 ОПТИМИЗАЦИЯ: отключаем инерцию для быстрого drag
            autoScroll: false,
            manualStart: false,
            hold: 0,
            listeners: {
                start: (event) => this.onEquipmentDragStart(event),
                move: (event) => this.onDragMove(event),
                end: (event) => this.onEquipmentDragEnd(event)
            }
        });
        
        console.log('[DRAG] ✅ Draggables configured');
        
        // Setup drop zone on canvas container (not overlay)
        const container = document.getElementById('canvas-container');
        if (!container) {
            console.error('[DRAG] ❌ canvas-container not found!');
            return;
        }
        
        interact('#canvas-container').dropzone({
            accept: '.weight-item, .equipment-item',
            overlap: 0.1,
            ondrop: (event) => {
                console.log('[DROPZONE] ondrop!');
                this.handleCanvasDrop(event);
            },
            ondropactivate: (event) => {
                console.log('[DROPZONE] activated');
                container.classList.add('drag-over');
            },
            ondragenter: (event) => {
                console.log('[DROPZONE] dragenter');
                if (event.relatedTarget) {
                    event.relatedTarget.dataset.wasDropped = 'true';
                }
            },
            ondragleave: () => {
                console.log('[DROPZONE] dragleave');
            },
            ondropdeactivate: () => {
                console.log('[DROPZONE] deactivated');
                container.classList.remove('drag-over');
            }
        });
        
        console.log('[DRAG] ✅ Dropzone configured');
        console.log('[DRAG] ✅ Drag & drop setup complete');
    }
    
    onEquipmentDragStart(event) {
        const equipmentType = event.target.dataset.equipment;
        console.log('[EQUIPMENT-DRAG-START]', equipmentType);
        
        // Check if already placed
        if (equipmentType === 'surface' && this.state.surfacePlaced) {
            console.log('[EQUIPMENT] Surface already placed');
            event.interaction?.stop();
            return false;
        }
        if (equipmentType === 'block' && this.state.blockPlaced) {
            console.log('[EQUIPMENT] Block already placed');
            event.interaction?.stop();
            return false;
        }
        if ((equipmentType === 'dynamometer1' || equipmentType === 'dynamometer5') && this.state.dynamometerPlaced) {
            console.log('[EQUIPMENT] Dynamometer already placed');
            event.interaction?.stop();
            return false;
        }
        
        this.state.isDragging = true;
        document.body.classList.add('is-dragging'); // Активируем overlay
        event.target.classList.add('dragging');
        
        // 🆕 СРАЗУ устанавливаем dragPosition чтобы защитный механизм не сбросил isDragging!
        const canvas = document.getElementById('canvas-dynamic');
        if (canvas) {
            const canvasRect = canvas.getBoundingClientRect();
            const targetRect = event.target.getBoundingClientRect();
            const centerX = targetRect.left + targetRect.width / 2;
            const centerY = targetRect.top + targetRect.height / 2;
            const scaleX = canvas.width / canvasRect.width;
            const scaleY = canvas.height / canvasRect.height;
            this.state.dragPosition = {
                x: (centerX - canvasRect.left) * scaleX,
                y: (centerY - canvasRect.top) * scaleY
            };
        }
        
        // 🚀 КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: Отключаем CSS transition для мгновенного отклика!
        event.target.style.transition = 'none';
        event.target.style.opacity = '0.5';
        
        // Сохраняем информацию о перетаскиваемом предмете для зелёной зоны
        if (equipmentType === 'block') {
            this.state.draggingItemType = 'block';
            this.state.draggingItemId = 'block';
            this.state.draggingItemMass = EQUIPMENT_CONFIG.block.mass;
        } else if (equipmentType === 'dynamometer1' || equipmentType === 'dynamometer5') {
            // Динамометр - отдельный тип для отображения snap zones
            this.state.draggingItemType = 'dynamometer';
            this.state.draggingItemId = equipmentType;
        } else if (equipmentType === 'surface') {
            // Направляющая - отдельный тип для отображения snap zone
            this.state.draggingItemType = 'surface';
            this.state.draggingItemId = 'surface';
        } else {
            this.state.draggingItemType = 'equipment';
            this.state.draggingItemId = equipmentType;
        }
        
        // Create ghost
        const clone = event.target.cloneNode(true);
        clone.id = 'drag-ghost';
        clone.style.position = 'fixed';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '10000';
        clone.style.opacity = '0.9';
        clone.style.transform = 'scale(1.1)';
        clone.style.boxShadow = '0 10px 30px rgba(0, 168, 107, 0.6)';
        clone.style.border = '3px solid #00A86B';
        clone.style.borderRadius = '12px';
        
        const rect = event.target.getBoundingClientRect();
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        
        document.body.appendChild(clone);
        this.dragGhost = clone;
        
        event.target.dataset.wasDropped = 'false';
    }
    
    onEquipmentDragEnd(event) {
        const equipmentType = event.target.dataset.equipment;
        console.log('[EQUIPMENT-DRAG-END]', equipmentType);
        
        this.state.isDragging = false;
        document.body.classList.remove('is-dragging'); // Деактивируем overlay
        event.target.classList.remove('dragging');
        
        // 🚀 Восстанавливаем CSS transition
        event.target.style.transition = '';
        event.target.style.opacity = '';
        
        // СОХРАНЯЕМ последнюю позицию перед сбросом для использования в placeEquipment
        const lastDragPosition = this.state.dragPosition ? { ...this.state.dragPosition } : null;
        
        // Очищаем состояние перетаскивания
        this.state.dragPosition = null;
        this.state.draggingItemType = null;
        this.state.draggingItemId = null;
        this.state.draggingItemMass = null;
        
        // Сбрасываем transform и data атрибуты
        event.target.style.transform = '';
        event.target.setAttribute('data-x', 0);
        event.target.setAttribute('data-y', 0);
        
        // Remove ghost
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
        
        // Check if dropped on canvas
        const wasDropped = event.target.dataset.wasDropped === 'true';
        if (wasDropped) {
            // Place equipment on canvas - передаём сохранённую позицию
            this.placeEquipment(equipmentType, event.target, lastDragPosition);
        }
        
        event.target.dataset.wasDropped = 'false';
    }
    
    placeEquipment(equipmentType, element, dropPosition) {
        console.log('[PLACE-EQUIPMENT]', equipmentType);
        
        if (equipmentType === 'surface' && !this.state.surfacePlaced) {
            this.state.surfacePlaced = true;
            
            this.showStatus('Направляющая размещена!', 'success');
            this.drawBackground();
            this.drawEquipment();
            this.drawDynamic();
            this.updateEquipmentStatus();
            return;
        }
        
        if (equipmentType === 'block' && !this.state.blockPlaced) {
            // 🔧 FIX: Разрешаем свободное размещение бруска в любом месте canvas
            // Устанавливаем позицию бруска по месту drop
            if (dropPosition) {
                // Центрируем брусок относительно точки drop
                this.state.blockX = Math.max(50, Math.min(dropPosition.x - this.layout.block.width / 2, 1000));
                // Если направляющая размещена - привязываем к ней по Y, иначе - свободно
                if (this.state.surfacePlaced) {
                    this.state.blockY = this.layout.surface.y - this.layout.block.height;
                } else {
                    this.state.blockY = Math.max(100, Math.min(dropPosition.y - this.layout.block.height / 2, 600));
                }
            }
            
            this.state.blockPlaced = true;
            
            this.showStatus('Брусок размещён!', 'success');
            
            // Создаём эффект частиц
            if (this.particles) {
                this.particles.createSuccessSparkles(
                    this.state.blockX + this.layout.block.width / 2,
                    this.state.blockY,
                    15
                );
            }
            
            this.drawDynamic();
            this.updateEquipmentStatus();
            return;
        }
        
        // Динамометр - определяем режим по позиции drop
        if ((equipmentType === 'dynamometer1' || equipmentType === 'dynamometer5') && 
            !this.state.dynamometerPlaced) {
            
            this.state.dynamometerPlaced = true;
            this.state.activeDynamometer = equipmentType;
            
            // Используем переданную позицию drop (уже в координатах canvas)
            const dropX = dropPosition?.x || 0;
            const dropY = dropPosition?.y || 0;
            
            console.log('[DYNAMOMETER DROP] dropX:', dropX, 'dropY:', dropY);
            console.log('[DYNAMOMETER DROP] blockX:', this.state.blockX, 'blockY:', this.state.blockY);
            console.log('[DYNAMOMETER DROP] blockPlaced:', this.state.blockPlaced);
            
            // Проверяем: если брусок размещён И drop рядом с правой стороной бруска → горизонтальный режим
            const blockRight = this.state.blockX + this.layout.block.width;
            const blockCenterY = this.state.blockY + this.layout.block.height / 2;
            
            // Snap zone для горизонтального режима
            const snapX = blockRight + 60;
            const snapY = blockCenterY;
            const distanceToBlock = Math.hypot(dropX - snapX, dropY - snapY);
            
            console.log('[DYNAMOMETER DROP] snapX:', snapX, 'snapY:', snapY, 'distance:', distanceToBlock);
            
            // Радиус 150 пикселей для срабатывания
            const isNearBlock = this.state.blockPlaced && distanceToBlock < 150;
            
            if (isNearBlock) {
                // Горизонтальный режим - для измерения трения
                this.state.dynamometerMode = 'horizontal';
                this.state.dynamometerAttached = true;
                
                const maxForce = equipmentType === 'dynamometer1' ? 1 : 5;
                this.showStatus(`Динамометр ${maxForce}Н прицеплен к бруску. Тяните вправо!`, 'success');
            } else {
                // Вертикальный режим - для взвешивания
                this.state.dynamometerMode = 'vertical';
                this.state.dynamometerAttached = false;
                this.state.dynamometerX = Math.max(80, Math.min(dropX, 250));
                this.state.dynamometerY = Math.max(50, Math.min(dropY, 150));
                this.state.weighingItems = [];
                this.state.weighingTotalMass = 0;
                
                const maxForce = equipmentType === 'dynamometer1' ? 1 : 5;
                this.showStatus(`Динамометр ${maxForce}Н готов для взвешивания. Повесьте грузы или брусок!`, 'info');
            }
            
            if (this.particles) {
                this.particles.createSuccessSparkles(
                    this.state.dynamometerMode === 'horizontal' ? 
                        this.state.blockX + this.layout.block.width + 100 : 
                        this.state.dynamometerX,
                    this.state.dynamometerMode === 'horizontal' ? 
                        this.state.blockY : 
                        this.state.dynamometerY + 50,
                    15
                );
            }
            
            this.drawDynamic();
            this.updateEquipmentStatus();
            return;
        } else if ((equipmentType === 'dynamometer1' || equipmentType === 'dynamometer5') && this.state.dynamometerPlaced) {
            this.showStatus('Динамометр уже установлен! Сначала верните его.', 'warning');
        }
    }
    
    returnEquipment(equipmentType, element) {
        console.log('[RETURN-EQUIPMENT]', equipmentType);
        
        if (equipmentType === 'surface') {
            // Возвращаем всё оборудование
            this.state.weightsOnBlock.forEach(w => {
                this.state.usedWeightIds.delete(w.id);
            });
            this.state.weightsOnBlock = [];
            this.state.blockMass = EQUIPMENT_CONFIG.block.mass;
            
            this.state.dynamometerPlaced = false;
            this.state.blockPlaced = false;
            this.state.surfacePlaced = false;
            
            this.renderWeightsInventory();
            this.drawBackground();
            this.drawEquipment();
            this.drawDynamic();
            this.updateEquipmentStatus();
            this.showStatus('Направляющая возвращена в комплект', 'info');
            return;
        }
        
        if (equipmentType === 'dynamometer1' || equipmentType === 'dynamometer5') {
            // Возвращаем грузы с динамометра в инвентарь (если были)
            if (this.state.weighingItems) {
                this.state.weighingItems.forEach(item => {
                    if (item.type === 'weight') {
                        this.state.usedWeightIds.delete(item.id);
                    }
                });
            }
            
            this.state.dynamometerPlaced = false;
            this.state.activeDynamometer = null;
            this.state.dynamometerMode = null;
            this.state.dynamometerAttached = false;
            this.state.weighingItems = [];
            this.state.weighingTotalMass = 0;
            this.state.pullingForce = 0;
            
            this.renderWeightsInventory();
            this.drawDynamic();
            this.updateEquipmentStatus();
            this.showStatus('Динамометр возвращён в комплект', 'info');
            return;
        }
        
        if (equipmentType === 'block') {
            // Возвращаем грузы на брусок в инвентарь
            this.state.weightsOnBlock.forEach(w => {
                this.state.usedWeightIds.delete(w.id);
            });
            this.state.weightsOnBlock = [];
            this.state.blockMass = EQUIPMENT_CONFIG.block.mass;
            
            // Возвращаем динамометр тоже
            this.state.dynamometerPlaced = false;
            this.state.blockPlaced = false;
            
            this.renderWeightsInventory();
            this.drawDynamic();
            this.updateEquipmentStatus();
            this.showStatus('Брусок возвращён в комплект', 'info');
            return;
        }
    }
    
    onDragStart(event) {
        const weightId = event.target.dataset.weightId;
        console.log('[DRAG-START]', weightId);
        
        // Check if already used
        if (this.state.usedWeightIds.has(weightId)) {
            console.log('[DRAG] Weight already used:', weightId);
            event.interaction?.stop();
            return false;
        }
        
        this.state.isDragging = true;
        document.body.classList.add('is-dragging'); // Активируем overlay
        event.target.classList.add('dragging');
        
        // 🆕 СРАЗУ устанавливаем dragPosition чтобы защитный механизм не сбросил isDragging!
        const canvas = document.getElementById('canvas-dynamic');
        if (canvas) {
            const canvasRect = canvas.getBoundingClientRect();
            const targetRect = event.target.getBoundingClientRect();
            const centerX = targetRect.left + targetRect.width / 2;
            const centerY = targetRect.top + targetRect.height / 2;
            const scaleX = canvas.width / canvasRect.width;
            const scaleY = canvas.height / canvasRect.height;
            this.state.dragPosition = {
                x: (centerX - canvasRect.left) * scaleX,
                y: (centerY - canvasRect.top) * scaleY
            };
        }
        
        // 🚀 КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: Отключаем CSS transition для мгновенного отклика!
        event.target.style.transition = 'none';
        event.target.style.opacity = '0.5';
        
        // Сохраняем информацию о перетаскиваемом предмете для зелёной зоны
        const mass = parseInt(event.target.dataset.mass, 10);
        this.state.currentWeight = mass;
        this.state.draggingItemType = 'weight';
        this.state.draggingItemId = weightId;
        this.state.draggingItemMass = mass;
        
        // Create ghost
        const clone = event.target.cloneNode(true);
        clone.id = 'drag-ghost';
        clone.style.position = 'fixed';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '10000';
        clone.style.opacity = '0.9';
        clone.style.transform = 'scale(1.1)';
        clone.style.boxShadow = '0 10px 30px rgba(0, 168, 107, 0.6)';
        clone.style.border = '3px solid #00A86B';
        clone.style.borderRadius = '12px';
        
        const rect = event.target.getBoundingClientRect();
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        
        document.body.appendChild(clone);
        this.dragGhost = clone;
        
        event.target.dataset.wasDropped = 'false';
    }
    
    onDragMove(event) {
        const target = event.target;
        
        // � DEBUG
        // console.log('[DRAG-MOVE] isDragging:', this.state.isDragging, 'type:', this.state.draggingItemType);
        
        // �🚀 КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: ТОЛЬКО transform, НИКАКИХ вычислений!
        // Как в experiment-1-spring.js - минимум операций
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
        
        // Ghost следует за элементом
        if (this.dragGhost) {
            const rect = target.getBoundingClientRect();
            this.dragGhost.style.left = rect.left + 'px';
            this.dragGhost.style.top = rect.top + 'px';
        }
        
        // 🆕 Обновляем dragPosition для отображения зелёных snap zones
        // Используем простой и быстрый расчёт через getBoundingClientRect
        const canvas = document.getElementById('canvas-dynamic');
        if (canvas && this.state.isDragging) {
            const canvasRect = canvas.getBoundingClientRect();
            const targetRect = event.target.getBoundingClientRect();
            const centerX = targetRect.left + targetRect.width / 2;
            const centerY = targetRect.top + targetRect.height / 2;
            
            // Переводим в canvas координаты
            const scaleX = canvas.width / canvasRect.width;
            const scaleY = canvas.height / canvasRect.height;
            
            this.state.dragPosition = {
                x: (centerX - canvasRect.left) * scaleX,
                y: (centerY - canvasRect.top) * scaleY
            };
        }
    }
    
    onDragEnd(event) {
        console.log('[DRAG-END]', event.target.dataset.weightId);
        
        this.state.isDragging = false;
        document.body.classList.remove('is-dragging'); // Деактивируем overlay
        event.target.classList.remove('dragging');
        
        // 🚀 Восстанавливаем CSS transition и стили
        event.target.style.transition = '';
        event.target.style.opacity = '';
        
        // Очищаем состояние перетаскивания
        this.state.dragPosition = null;
        this.state.draggingItemType = null;
        this.state.draggingItemId = null;
        this.state.draggingItemMass = null;
        
        // Сбрасываем transform и data атрибуты
        event.target.style.transform = '';
        event.target.setAttribute('data-x', 0);
        event.target.setAttribute('data-y', 0);
        
        // Remove ghost
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
        
        // Перерисовываем без зелёной зоны
        this.drawDynamic();
        
        // Check if dropped on canvas
        const wasDropped = event.target.dataset.wasDropped === 'true';
        if (!wasDropped) {
            console.log('[DRAG] Not dropped on canvas');
        }
        
        event.target.dataset.wasDropped = 'false';
    }
    
    handleCanvasDrop(event) {
        // Проверяем тип перетаскиваемого элемента
        const equipmentType = event.relatedTarget?.dataset?.equipment;
        const weightId = event.relatedTarget?.dataset?.weightId;
        const mass = parseInt(event.relatedTarget?.dataset?.mass, 10);
        
        // Получаем позицию drop (с учётом нового размера canvas)
        const canvasRect = this.canvases.dynamic.getBoundingClientRect();
        const scaleX = 1200 / canvasRect.width;
        const scaleY = 700 / canvasRect.height;
        const dropX = ((event.dragEvent?.clientX || 0) - canvasRect.left) * scaleX;
        const dropY = ((event.dragEvent?.clientY || 0) - canvasRect.top) * scaleY;
        
        // === БРУСОК НА ДИНАМОМЕТР ===
        // Если тащим брусок И динамометр в вертикальном режиме И drop рядом с крючком
        if (equipmentType === 'block' && this.state.dynamometerPlaced && this.state.dynamometerMode === 'vertical') {
            const hookZone = this.weighingDropZone || { x: 50, y: 350, width: 100, height: 200 };
            const hookCenterX = hookZone.x + hookZone.width / 2;
            const hookCenterY = hookZone.y + 26;
            const distance = Math.hypot(dropX - hookCenterX, dropY - hookCenterY);
            
            if (distance < 150) {
                // Вешаем брусок на динамометр
                console.log('[DROP] ✅ Dropping BLOCK on dynamometer hook!');
                this.addBlockToDynamometer();
                // НЕ размещаем брусок на поверхности
                event.relatedTarget.dataset.wasDropped = 'false';
                
                // 🆕 Сбрасываем состояние перетаскивания
                this.state.isDragging = false;
                this.state.dragPosition = null;
                this.state.draggingItemType = null;
                
                return;
            }
        }
        
        // Если это оборудование (брусок или динамометр) - стандартная обработка
        if (equipmentType) {
            console.log('[DROP] Equipment dropped:', equipmentType);
            // Обработка уже происходит в onEquipmentDragEnd
            return;
        }
        
        console.log('[DROP] Weight dropped:', weightId, mass, 'g');
        
        if (!weightId || !mass) return;
        
        console.log('[DROP] Canvas position:', dropX, dropY);
        
        // Проверяем: бросили ли на вертикальный динамометр?
        if (this.state.dynamometerPlaced && this.state.dynamometerMode === 'vertical') {
            // Зона крючка динамометра (фиксированная позиция слева)
            const hookZone = this.weighingDropZone || {
                x: 50,    // centerX (100) - 50
                y: 350,   // Примерная позиция нижнего крючка
                width: 100,
                height: 200
            };
            
            // Проверяем расстояние до центра крючка
            const hookCenterX = hookZone.x + hookZone.width / 2;
            const hookCenterY = hookZone.y + 26;
            const distance = Math.hypot(dropX - hookCenterX, dropY - hookCenterY);
            
            console.log('[DROP] Hook zone:', hookZone, '| Drop pos:', dropX, dropY, '| Distance:', distance);
            
            if (distance < 150) {
                // Вешаем груз на динамометр
                console.log('[DROP] ✅ Dropping on dynamometer hook!');
                this.addWeightToDynamometer(weightId, mass);
                return;
            }
        }
        
        // Иначе пробуем положить на брусок
        if (!this.state.blockPlaced) {
            // 🆕 Если брусок не размещён - кладём груз свободно на canvas
            this.placeFreeWeight(weightId, mass, dropX, dropY);
            return;
        }
        
        // Проверяем, бросили ли рядом с бруском
        const blockCenterX = this.state.blockX + this.layout.block.width / 2;
        const blockCenterY = this.state.blockY + this.layout.block.height / 2;
        const distanceToBlock = Math.hypot(dropX - blockCenterX, dropY - blockCenterY);
        
        // Если далеко от бруска - кладём как свободный груз
        if (distanceToBlock > 200) {
            this.placeFreeWeight(weightId, mass, dropX, dropY);
            return;
        }
        
        // Add weight to block (usedWeightIds добавляется внутри addWeightToBlock)
        this.addWeightToBlock(weightId, mass);
        
        // Update inventory display
        this.renderWeightsInventory();
        
        // Particle effect
        if (this.particles) {
            const blockCenterX = this.state.blockX + this.layout.block.width / 2;
            this.particles.createSuccessSparkles(blockCenterX, this.state.blockY, 8);
        }
        
        // Redraw
        this.drawEquipment();
        this.drawDynamic();
        this.updateMeasurementDisplay();
        
        document.getElementById('drag-drop-overlay')?.classList.remove('drag-over');
    }
    
    // ==================== PULL INTERACTION ====================
    
    setupPullInteraction() {
        // Используем container как surface для взаимодействия (как в пружине)
        const container = document.getElementById('canvas-container');
        if (!container) {
            console.error('[PULL] ❌ canvas-container not found!');
            return;
        }
        
        console.log('[PULL] Setting up pull interaction on container');
        
        // Bound handlers for cleanup
        this.boundHandlePullMove = (e) => this.handlePullMove(e);
        this.boundHandlePullEnd = () => this.handlePullEnd();
        this.boundDynamometerDragMove = (e) => this.handleDynamometerDragMove(e);
        this.boundDynamometerDragEnd = () => this.handleDynamometerDragEnd();
        
        // 🆕 Handlers for block dragging on canvas
        this.boundBlockDragMove = (e) => this.handleBlockDragMove(e);
        this.boundBlockDragEnd = () => this.handleBlockDragEnd();
        
        // Mouse down on container
        container.addEventListener('mousedown', (e) => this.handlePullStart(e));
        container.addEventListener('touchstart', (e) => this.handlePullStart(e), { passive: false });
        
        // 🆕 Right-click context menu for returning equipment
        container.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        
        // 🆕 Double-click для разъединения стопки грузов
        container.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // Cursor change on hover
        container.addEventListener('mousemove', (e) => {
            if (this.state.isPulling) return;
            const pos = this.getCanvasPosition(e);
            
            // Проверяем кнопку "Записать N" для вертикального динамометра
            if (this.recordButtonArea && this.state.dynamometerMode === 'vertical') {
                if (this.isPointInRect(pos, this.recordButtonArea)) {
                    container.style.cursor = 'pointer';
                    return;
                }
            }
            
            // Проверяем кнопку "К бруску"
            if (this.attachButtonArea && this.state.dynamometerMode === 'vertical') {
                if (this.isPointInRect(pos, this.attachButtonArea)) {
                    container.style.cursor = 'pointer';
                    return;
                }
            }
            
            // 🆕 Проверяем наведение на брусок (для перетаскивания)
            if (this.state.blockPlaced && !this.state.dynamometerAttached) {
                const blockArea = this.getBlockArea();
                if (blockArea && this.isPointInRect(pos, blockArea)) {
                    container.style.cursor = 'grab';
                    return;
                }
            }
            
            // Проверяем ручку горизонтального динамометра
            if (this.state.dynamometerMode === 'horizontal') {
                const handleArea = this.getDynamometerHandleArea();
                container.style.cursor = this.isPointInRect(pos, handleArea) ? 'grab' : 'default';
            } else if (this.state.dynamometerMode === 'vertical') {
                // Проверяем корпус вертикального динамометра (для перетаскивания)
                const dynArea = this.getDynamometerBodyArea();
                if (dynArea && this.isPointInRect(pos, dynArea)) {
                    container.style.cursor = 'grab';
                } else {
                    container.style.cursor = 'default';
                }
            } else {
                container.style.cursor = 'default';
            }
            
            // 🆕 Проверяем наведение на свободный груз
            const freeWeight = this.findFreeWeightAtPosition(pos.x, pos.y);
            if (freeWeight) {
                container.style.cursor = 'grab';
                return;
            }
        });
    }
    
    getCanvasPosition(e) {
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        // Scale to canvas coordinates
        const scaleX = 1200 / rect.width;
        const scaleY = 700 / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    handlePullStart(e) {
        const pos = this.getCanvasPosition(e);
        
        // 🆕 Проверяем клик на свободный груз для перетаскивания
        const clickedFreeWeight = this.findFreeWeightAtPosition(pos.x, pos.y);
        if (clickedFreeWeight) {
            e.preventDefault();
            e.stopPropagation();
            this.startFreeWeightDrag(clickedFreeWeight, pos);
            return;
        }
        
        // 🆕 Проверяем клик на брусок для перетаскивания (если динамометр НЕ прицеплен)
        if (this.state.blockPlaced && !this.state.dynamometerAttached) {
            const blockArea = this.getBlockArea();
            if (blockArea && this.isPointInRect(pos, blockArea)) {
                e.preventDefault();
                e.stopPropagation();
                this.startBlockDrag(pos);
                return;
            }
        }
        
        // Проверяем клик на кнопку "Записать N" (для вертикального динамометра)
        if (this.recordButtonArea && this.state.dynamometerMode === 'vertical') {
            if (this.isPointInRect(pos, this.recordButtonArea)) {
                e.preventDefault();
                e.stopPropagation();
                this.recordWeighingAsNormal();
                return;
            }
        }
        
        // Проверяем клик на кнопку "К бруску"
        if (this.attachButtonArea && this.state.dynamometerMode === 'vertical' && 
            this.state.weighingItems.length === 0) {
            if (this.isPointInRect(pos, this.attachButtonArea)) {
                e.preventDefault();
                e.stopPropagation();
                this.switchToHorizontalMode();
                return;
            }
        }
        
        // Проверяем клик на груз на динамометре (снятие последнего груза)
        if (this.state.dynamometerMode === 'vertical' && 
            this.weighingItemAreas && this.weighingItemAreas.length > 0) {
            
            // Находим кликнутый груз (снимаем только ПОСЛЕДНИЙ - LIFO)
            const lastItemArea = this.weighingItemAreas[this.weighingItemAreas.length - 1];
            
            if (this.isPointInRect(pos, lastItemArea)) {
                e.preventDefault();
                e.stopPropagation();
                this.removeLastWeighingItem();
                return;
            }
            
            // Показываем подсказку если кликнули не на последний
            for (let i = 0; i < this.weighingItemAreas.length - 1; i++) {
                if (this.isPointInRect(pos, this.weighingItemAreas[i])) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showStatus('Сначала снимите нижний груз!', 'warning');
                    return;
                }
            }
        }
        
        // === ПЕРЕТАСКИВАНИЕ ДИНАМОМЕТРА НА CANVAS ===
        // Если динамометр размещён и в вертикальном режиме, можно его перетаскивать
        if (this.state.dynamometerPlaced && this.state.dynamometerMode === 'vertical') {
            const dynArea = this.getDynamometerBodyArea();
            if (dynArea && this.isPointInRect(pos, dynArea)) {
                e.preventDefault();
                e.stopPropagation();
                
                this.state.isDraggingDynamometer = true;
                this.state.dynamometerDragOffset = {
                    x: pos.x - this.state.dynamometerX,
                    y: pos.y - this.state.dynamometerY
                };
                
                // Сохраняем тип перетаскивания для snap zone
                this.state.draggingItemType = 'dynamometer';
                this.state.dragPosition = { x: pos.x, y: pos.y };
                
                document.body.style.cursor = 'grabbing';
                
                window.addEventListener('mousemove', this.boundDynamometerDragMove);
                window.addEventListener('mouseup', this.boundDynamometerDragEnd);
                window.addEventListener('touchmove', this.boundDynamometerDragMove, { passive: false });
                window.addEventListener('touchend', this.boundDynamometerDragEnd);
                
                console.log('[DYNAMOMETER] Started dragging');
                return;
            }
        }
        
        // Не обрабатываем pull пока оборудование не размещено
        if (!this.state.blockPlaced || !this.state.dynamometerPlaced) {
            console.log('[PULL] ❌ Block or dynamometer not placed');
            return;
        }
        
        // Pull работает только в горизонтальном режиме
        if (this.state.dynamometerMode !== 'horizontal') {
            console.log('[PULL] ❌ Dynamometer not in horizontal mode, mode=', this.state.dynamometerMode);
            return;
        }
        
        const handleArea = this.getDynamometerHandleArea();
        console.log('[PULL] Checking handleArea:', handleArea, 'pos:', pos);
        
        if (this.isPointInRect(pos, handleArea)) {
            e.preventDefault();
            e.stopPropagation();
            
            this.state.isPulling = true;
            this.state.pullStartMouseX = pos.x;
            // Запоминаем текущую позицию ручки (может быть уже смещена если брусок сдвинут)
            this.state.pullStartHandleX = this.state.handleX || this.getHandleRestX();
            
            // Сбрасываем флаг debug для нового вывода
            this._debugLogged = false;
            
            console.log('[PULL] ✅ Started pulling!');
            
            document.body.style.cursor = 'grabbing';
            
            window.addEventListener('mousemove', this.boundHandlePullMove);
            window.addEventListener('mouseup', this.boundHandlePullEnd);
            window.addEventListener('touchmove', this.boundHandlePullMove, { passive: false });
            window.addEventListener('touchend', this.boundHandlePullEnd);
        }
    }
    
    /**
     * Снять последний груз с вертикального динамометра (LIFO)
     * Как в spring эксперименте - снимаем грузы по очереди снизу вверх
     */
    removeLastWeighingItem() {
        if (this.state.weighingItems.length === 0) return;
        
        const lastItem = this.state.weighingItems.pop();
        console.log('[WEIGHING] Снятие последнего груза:', lastItem);
        
        // Уменьшаем общую массу
        this.state.weighingTotalMass -= lastItem.mass;
        
        // Если это груз - возвращаем в инвентарь
        if (lastItem.type === 'weight') {
            this.state.usedWeightIds.delete(lastItem.id);
            this.renderWeightsInventory();
            this.showStatus(`Груз ${lastItem.mass}г снят с динамометра`, 'info');
        } else if (lastItem.type === 'block') {
            // Брусок возвращается на поверхность - ничего особенного не делаем
            this.showStatus('Брусок снят с динамометра', 'info');
        }
        
        // Эффект частиц
        if (this.particles) {
            this.particles.createSuccessSparkles(100, 450, 8);
        }
        
        // Перерисовываем
        this.drawDynamic();
    }
    
    // === ОБЛАСТЬ КОРПУСА ДИНАМОМЕТРА (для перетаскивания) ===
    getDynamometerBodyArea() {
        if (!this.state.dynamometerPlaced || this.state.dynamometerMode !== 'vertical') {
            return null;
        }
        
        const centerX = this.state.dynamometerX || 100;
        const anchorY = this.state.dynamometerY || 60;
        const width = 80;
        const height = 300;
        const bodyY = anchorY + 40; // После крючка сверху
        
        return {
            x: centerX - width/2,
            y: bodyY,
            width: width,
            height: height
        };
    }
    
    // === ПЕРЕТАСКИВАНИЕ ДИНАМОМЕТРА ===
    handleDynamometerDragMove(e) {
        if (!this.state.isDraggingDynamometer) return;
        e.preventDefault();
        
        const pos = this.getCanvasPosition(e);
        
        // Обновляем позицию динамометра
        this.state.dynamometerX = pos.x - this.state.dynamometerDragOffset.x;
        this.state.dynamometerY = pos.y - this.state.dynamometerDragOffset.y;
        
        // Ограничения по canvas (расширены чтобы динамометр мог доезжать до бруска)
        this.state.dynamometerX = Math.max(50, Math.min(this.state.dynamometerX, 800));
        this.state.dynamometerY = Math.max(50, Math.min(this.state.dynamometerY, 300));
        
        // Обновляем позицию для snap zone
        this.state.dragPosition = { x: pos.x, y: pos.y };
        
        // 🚀 ОПТИМИЗАЦИЯ: Используем flag вместо прямого drawDynamic
        this._needsRedraw = true;
    }
    
    handleDynamometerDragEnd() {
        if (!this.state.isDraggingDynamometer) return;
        
        console.log('[DYNAMOMETER] Drag ended');
        
        // Проверяем snap к бруску
        if (this.state.blockPlaced && this.state.surfacePlaced) {
            const blockRight = this.state.blockX + this.layout.block.width;
            const blockCenterY = this.state.blockY + this.layout.block.height / 2;
            
            // Расстояние от центра динамометра до snap точки
            const dynCenterX = this.state.dynamometerX;
            const dynCenterY = this.state.dynamometerY + 200;
            const snapX = blockRight + 30;
            const snapY = blockCenterY;
            
            const distance = Math.hypot(dynCenterX - snapX, dynCenterY - snapY);
            
            if (distance < 200) {
                // Сцепляем динамометр с бруском - переключаемся в горизонтальный режим
                console.log('[DYNAMOMETER] Snapping to block!');
                this.switchToHorizontalMode();
                
                if (this.particles) {
                    this.particles.createSuccessSparkles(blockRight + 50, blockCenterY, 15);
                }
            }
        }
        
        // Очищаем состояние
        this.state.isDraggingDynamometer = false;
        this.state.draggingItemType = null;
        this.state.dragPosition = null;
        document.body.style.cursor = 'default';
        
        window.removeEventListener('mousemove', this.boundDynamometerDragMove);
        window.removeEventListener('mouseup', this.boundDynamometerDragEnd);
        window.removeEventListener('touchmove', this.boundDynamometerDragMove);
        window.removeEventListener('touchend', this.boundDynamometerDragEnd);
        
        this.drawDynamic();
    }
    
    // 🆕 Получить область бруска для hit-testing
    getBlockArea() {
        if (!this.state.blockPlaced) return null;
        return {
            x: this.state.blockX,
            y: this.state.blockY,
            width: this.layout.block.width,
            height: this.layout.block.height
        };
    }
    
    // 🆕 Начать перетаскивание бруска на canvas
    startBlockDrag(pos) {
        console.log('[BLOCK] Started dragging on canvas');
        
        this.state.isDraggingBlock = true;
        this.state.blockDragOffset = {
            x: pos.x - this.state.blockX,
            y: pos.y - this.state.blockY
        };
        
        this.state.draggingItemType = 'block';
        this.state.dragPosition = { x: pos.x, y: pos.y };
        
        document.body.style.cursor = 'grabbing';
        
        window.addEventListener('mousemove', this.boundBlockDragMove);
        window.addEventListener('mouseup', this.boundBlockDragEnd);
        window.addEventListener('touchmove', this.boundBlockDragMove, { passive: false });
        window.addEventListener('touchend', this.boundBlockDragEnd);
    }
    
    // 🆕 Обработка перемещения бруска
    handleBlockDragMove(e) {
        if (!this.state.isDraggingBlock) return;
        e.preventDefault?.();
        
        const pos = this.getCanvasPosition(e);
        
        // Обновляем позицию бруска
        let newX = pos.x - this.state.blockDragOffset.x;
        let newY = pos.y - this.state.blockDragOffset.y;
        
        // Ограничиваем в пределах canvas
        newX = Math.max(50, Math.min(newX, 1050));
        newY = Math.max(100, Math.min(newY, 600));
        
        // Если направляющая размещена - snap к ней по Y
        if (this.state.surfacePlaced) {
            const surfaceY = this.layout.surface.y;
            const blockBottom = newY + this.layout.block.height;
            
            // Snap если близко к поверхности
            if (Math.abs(blockBottom - surfaceY) < 40) {
                newY = surfaceY - this.layout.block.height;
            }
        }
        
        this.state.blockX = newX;
        this.state.blockY = newY;
        this.state.dragPosition = { x: pos.x, y: pos.y };
        
        // 🚀 ОПТИМИЗАЦИЯ: Используем flag вместо прямого drawDynamic
        this._needsRedraw = true;
        this.blockCache.needsUpdate = true;
    }
    
    // 🆕 Завершение перетаскивания бруска
    handleBlockDragEnd() {
        if (!this.state.isDraggingBlock) return;
        
        console.log('[BLOCK] Drag ended');
        
        // Если направляющая размещена, привязываем к ней
        if (this.state.surfacePlaced) {
            this.state.blockY = this.layout.surface.y - this.layout.block.height;
        }
        
        // Очищаем состояние
        this.state.isDraggingBlock = false;
        this.state.draggingItemType = null;
        this.state.dragPosition = null;
        document.body.style.cursor = 'default';
        
        window.removeEventListener('mousemove', this.boundBlockDragMove);
        window.removeEventListener('mouseup', this.boundBlockDragEnd);
        window.removeEventListener('touchmove', this.boundBlockDragMove);
        window.removeEventListener('touchend', this.boundBlockDragEnd);
        
        this.drawDynamic();
    }
    
    // 🆕 Контекстное меню для возврата оборудования
    handleContextMenu(e) {
        e.preventDefault();
        const pos = this.getCanvasPosition(e);
        
        // Проверяем клик на брусок
        if (this.state.blockPlaced) {
            const blockArea = this.getBlockArea();
            if (blockArea && this.isPointInRect(pos, blockArea)) {
                this.returnEquipment('block', null);
                return;
            }
        }
        
        // Проверяем клик на динамометр
        if (this.state.dynamometerPlaced) {
            const dynArea = this.state.dynamometerMode === 'vertical' 
                ? this.getDynamometerBodyArea() 
                : this.getDynamometerHandleArea();
            if (dynArea && this.isPointInRect(pos, dynArea)) {
                this.returnEquipment(this.state.activeDynamometer, null);
                return;
            }
        }
        
        // Проверяем клик на свободный груз
        const freeWeight = this.findFreeWeightAtPosition(pos.x, pos.y);
        if (freeWeight) {
            this.removeFreeWeight(freeWeight.id);
            return;
        }
    }

    // Позиция ручки когда пружина НЕ растянута (динамометр в покое)
    getHandleRestX() {
        // Ручка начинается сразу после корпуса динамометра
        // Крюк у бруска + корпус динамометра
        const hookX = this.state.blockX + this.layout.block.width + 15;
        const bodyLength = 130; // Длина корпуса динамометра
        return hookX + bodyLength;
    }
    
    // ==================== ГЛАВНАЯ ЛОГИКА ФИЗИКИ ====================
    handlePullMove(e) {
        if (!this.state.isPulling) return;
        e.preventDefault();
        
        const pos = this.getCanvasPosition(e);
        
        // === КОНСТАНТЫ ===
        const BODY_LENGTH = 130;        // Длина корпуса динамометра (фиксированная)
        const SPRING_K = 0.025;         // Жёсткость пружины: Н на пиксель (более чувствительная)
        const MAX_FORCE = 5.0;          // Максимум шкалы динамометра
        
        // === ФИЗИКА ТРЕНИЯ ===
        const frictionCoeff = PHYSICS_CONFIG.frictionCoefficients[this.state.currentSurface];
        const massKg = this.state.blockMass / 1000; // Перевод г в кг
        const g = PHYSICS_CONFIG.gravity; // 10 м/с²
        const normalForce = massKg * g; // N = mg
        
        // Максимальная сила трения покоя (F_тр.макс = μ_ст × N)
        const maxStaticFriction = frictionCoeff.static * normalForce;
        // Сила трения скольжения (F_тр.скольж = μ_кин × N)
        const kineticFriction = frictionCoeff.kinetic * normalForce;
        
        // DEBUG: Выводим при первом движении
        if (!this._debugLogged) {
            console.log('=== FRICTION PHYSICS DEBUG ===');
            console.log('Block mass:', this.state.blockMass, 'g =', massKg, 'kg');
            console.log('Weights on block:', this.state.weightsOnBlock.length);
            console.log('g =', g, 'm/s²');
            console.log('Normal force N = mg =', normalForce.toFixed(2), 'Н');
            console.log('Surface:', this.state.currentSurface, '| μ_ст =', frictionCoeff.static, '| μ_кин =', frictionCoeff.kinetic);
            console.log('Max static friction F_тр.покоя =', maxStaticFriction.toFixed(2), 'Н');
            console.log('Kinetic friction F_тр.скольж =', kineticFriction.toFixed(2), 'Н');
            console.log('==============================');
            this._debugLogged = true;
        }
        
        // === ПОЗИЦИИ ===
        // Куда пользователь тянет мышью
        const mouseDelta = pos.x - this.state.pullStartMouseX;
        const targetHandleX = Math.max(this.state.pullStartHandleX, this.state.pullStartHandleX + mouseDelta);
        
        // Крюк динамометра прикреплён к бруску
        const hookX = this.state.blockX + this.layout.block.width + 15;
        
        // Растяжение пружины (если брусок стоит на месте)
        const potentialSpringExtension = Math.max(0, targetHandleX - BODY_LENGTH - hookX);
        const potentialForce = potentialSpringExtension * SPRING_K;
        
        // === АВТОМАТ ИЗМЕРЕНИЙ ===
        
        // Режим 1: Брусок ещё не скользит (сила меньше порога)
        if (!this.state.isSliding) {
            this.state.pullingForce = potentialForce;
            this.state.currentFrictionForce = potentialForce;
            
            // Если сила превысила порог трения покоя -> СРЫВ в скольжение
            if (potentialForce >= maxStaticFriction) {
                this.state.isSliding = true;
                // При срыве сила падает до трения скольжения (физический факт)
                // Озвучим это визуально - брусок "подпрыгнет" вперёд
            }
        }
        
        // Режим 2: Брусок скользит (кинетика)
        if (this.state.isSliding) {
            this.state.currentFrictionForce = kineticFriction;
            // ВАЖНО: При скольжении динамометр показывает силу трения скольжения!
            this.state.pullingForce = kineticFriction;
            
            // Мы должны найти такое положение бруска, чтобы пружина "тянула" ровно на kineticFriction
            // F = k * x  =>  x = F / k
            const requiredExtension = kineticFriction / SPRING_K;
            
            // Где должен быть крюк для такого растяжения?
            // targetHandleX - BODY_LENGTH - targetHookX = requiredExtension
            const targetHookX = targetHandleX - BODY_LENGTH - requiredExtension;
            
            // Где должен быть брусок?
            const targetBlockX = targetHookX - 15 - this.layout.block.width;
            
            // Брусок МГНОВЕННО перемещается (мы моделируем жесткую связь при равномерном движении)
            if (targetBlockX > this.state.blockX) {
                this.state.blockX = targetBlockX;
            }
            
            // Не вылезаем за край
            const maxX = this.layout.surface.x + this.layout.surface.width - this.layout.block.width - 100;
            this.state.blockX = Math.min(this.state.blockX, maxX);
            
            // СТАБИЛЬНЫЕ ПОКАЗАНИЯ (как в идеальном опыте)
            // При равномерном скольжении сила тяги равна силе трения
            this.state.pullingForce = kineticFriction;
            
            // Если мы перестали тянуть (ослабили пружину ниже трения скольжения) -> ОСТАНОВКА
            // Проверяем реальное растяжение
            const currentTotalExtension = targetHandleX - BODY_LENGTH - (this.state.blockX + this.layout.block.width + 15);
            const currentTotalForce = currentTotalExtension * SPRING_K;
            
            // Гистерезис для остановки
            if (currentTotalForce < kineticFriction * 0.9) {
                this.state.isSliding = false;
            }
            
            // Эффекты
            if (this.particles && Math.random() < 0.3) {
                const blockBottom = this.state.blockY + this.layout.block.height;
                this.particles.createDustParticles(
                    this.state.blockX + Math.random() * this.layout.block.width,
                    blockBottom, 
                    1
                );
            }
        }
        
        // Ограничиваем силу шкалой прибора (визуально)
        this.state.pullingForce = Math.min(this.state.pullingForce, MAX_FORCE);
        
        // DEBUG: Периодически выводим текущие значения
        if (Math.random() < 0.02) {
            console.log(`[FORCE] isSliding=${this.state.isSliding} | pullingForce=${this.state.pullingForce.toFixed(2)}Н | kineticFriction=${kineticFriction.toFixed(2)}Н`);
        }
        
        // Сохраняем позицию ручки
        this.state.handleX = targetHandleX;
        
        this.updateMeasurementDisplay();
    }
    
    handlePullEnd() {
        if (!this.state.isPulling) return;
        
        console.log('[PULL] Ended, force was:', this.state.pullingForce.toFixed(2), 'N');
        
        this.state.isPulling = false;
        this.state.pullingForce = 0;
        this.state.handleX = null;
        this.state.isSliding = false;
        this.state.currentFrictionForce = 0;
        
        document.body.style.cursor = 'default';
        
        window.removeEventListener('mousemove', this.boundHandlePullMove);
        window.removeEventListener('mouseup', this.boundHandlePullEnd);
        window.removeEventListener('touchmove', this.boundHandlePullMove);
        window.removeEventListener('touchend', this.boundHandlePullEnd);
        
        // Animate block return
        this.animateBlockReturn();
        
        this.updateMeasurementDisplay();
    }
    
    getDynamometerHandleArea() {
        const handleX = this.state.handleX || this.getHandleRestX();
        
        return {
            x: handleX,
            y: this.state.blockY + this.layout.block.height / 2 - 25,
            width: 55,
            height: 50
        };
    }
    
    isPointInRect(point, rect) {
        return point.x >= rect.x && 
               point.x <= rect.x + rect.width &&
               point.y >= rect.y && 
               point.y <= rect.y + rect.height;
    }
    
    animateBlockReturn() {
        const startX = this.state.blockX;
        const targetX = LAYOUT_CONFIG.block.startX;
        const duration = 400;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.state.blockX = startX + (targetX - startX) * eased;
            
            // 🆕 Запрашиваем перерисовку для анимации
            this._needsRedraw = true;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // ==================== WEIGHTS MANAGEMENT ====================
    
    addWeightToBlock(weightId, mass) {
        if (this.state.weightsOnBlock.length >= 4) {
            this.showStatus('Максимум 4 груза на бруске!', 'warning');
            return;
        }
        
        this.state.weightsOnBlock.push({ id: weightId, mass: mass });
        this.state.usedWeightIds.add(weightId); // Помечаем как использованный
        this.state.blockMass = this.calculateTotalMass();
        
        // Обновляем отображение и перерисовываем
        this.renderWeightsInventory();
        this.updateMeasurementDisplay();
        this.drawDynamic();
        
        this.showStatus(`Добавлен груз ${mass} г`, 'success');
    }
    
    // ==================== FREE WEIGHTS (СВОБОДНЫЕ ГРУЗЫ НА CANVAS) ====================
    
    /**
     * 🆕 Разместить груз свободно на canvas (не прикреплённый к оборудованию)
     */
    placeFreeWeight(weightId, mass, canvasX, canvasY) {
        console.log('[FREE-WEIGHT] Размещение свободного груза:', weightId, 'at', canvasX, canvasY);
        
        // Найти определение груза
        const weightDef = this.weightsInventory.find(w => w.id === weightId);
        const targetSize = weightDef?.targetSize || 80;
        
        // Проверяем, можно ли соединить с существующим свободным грузом
        const nearbyWeight = this.findNearbyFreeWeight(canvasX, canvasY, 100);
        if (nearbyWeight) {
            // Соединяем грузы в стопку
            this.stackFreeWeights(nearbyWeight, weightId, mass);
            return;
        }
        
        const freeWeight = {
            id: `free-${Date.now()}`,
            weightId: weightId,
            mass: mass,
            x: canvasX,
            y: canvasY,
            width: targetSize,
            height: targetSize,
            isDragging: false,
            stackedWeights: [] // Грузы сверху этого груза
        };
        
        this.state.freeWeights.push(freeWeight);
        this.state.usedWeightIds.add(weightId);
        
        this.renderWeightsInventory();
        this.drawDynamic();
        
        this.showStatus(`Груз ${mass} г размещён на столе`, 'info');
        console.log('[FREE-WEIGHT] Создан:', freeWeight);
    }
    
    /**
     * 🔍 Найти свободный груз рядом с указанной позицией
     */
    findNearbyFreeWeight(x, y, radius = 100) {
        for (const fw of this.state.freeWeights) {
            const distance = Math.hypot(fw.x - x, fw.y - y);
            if (distance < radius) {
                return fw;
            }
        }
        return null;
    }
    
    /**
     * 🔗 Соединить грузы в стопку (новый груз кладётся сверху существующего)
     */
    stackFreeWeights(baseWeight, newWeightId, newMass) {
        console.log('[STACK] Соединение грузов:', baseWeight.weightId, '+', newWeightId);
        
        // Добавляем новый груз в стопку базового
        baseWeight.stackedWeights.push({
            weightId: newWeightId,
            mass: newMass
        });
        
        // Пересчитываем общую массу стопки
        baseWeight.totalMass = baseWeight.mass + baseWeight.stackedWeights.reduce((sum, w) => sum + w.mass, 0);
        
        this.state.usedWeightIds.add(newWeightId);
        
        this.renderWeightsInventory();
        this.drawDynamic();
        
        this.showStatus(`Грузы соединены! Общая масса: ${baseWeight.totalMass} г`, 'success');
    }
    
    /**
     * 🔓 Разъединить верхний груз из стопки
     */
    unstackTopWeight(baseWeight) {
        if (!baseWeight.stackedWeights || baseWeight.stackedWeights.length === 0) {
            console.log('[UNSTACK] Нет грузов для разъединения');
            return null;
        }
        
        const topWeight = baseWeight.stackedWeights.pop();
        console.log('[UNSTACK] Снят верхний груз:', topWeight.weightId);
        
        // Создаём новый свободный груз рядом
        const newFreeWeight = {
            id: `free-${Date.now()}`,
            weightId: topWeight.weightId,
            mass: topWeight.mass,
            x: baseWeight.x + 100, // Немного сбоку
            y: baseWeight.y,
            width: 80,
            height: 80,
            isDragging: false,
            stackedWeights: []
        };
        
        this.state.freeWeights.push(newFreeWeight);
        
        // Пересчитываем массу базового
        baseWeight.totalMass = baseWeight.mass + baseWeight.stackedWeights.reduce((sum, w) => sum + w.mass, 0);
        
        this.drawDynamic();
        this.showStatus(`Груз отсоединён`, 'info');
        
        return newFreeWeight;
    }
    
    /**
     * 🗑️ Удалить свободный груз с canvas и вернуть в инвентарь
     */
    removeFreeWeight(freeWeightId) {
        const index = this.state.freeWeights.findIndex(fw => fw.id === freeWeightId);
        if (index === -1) return;
        
        const removed = this.state.freeWeights[index];
        console.log('[FREE-WEIGHT] Удаление:', removed);
        
        // Возвращаем основной груз в инвентарь
        this.state.usedWeightIds.delete(removed.weightId);
        
        // Возвращаем все грузы из стопки
        if (removed.stackedWeights) {
            removed.stackedWeights.forEach(sw => {
                this.state.usedWeightIds.delete(sw.weightId);
            });
        }
        
        this.state.freeWeights.splice(index, 1);
        
        this.renderWeightsInventory();
        this.drawDynamic();
        
        this.showStatus('Груз возвращён в инвентарь', 'info');
    }
    
    /**
     * 🗑️ Удалить груз из стопки другого свободного груза
     */
    removeFreeWeightFromStack(weightId) {
        for (const fw of this.state.freeWeights) {
            if (!fw.stackedWeights) continue;
            
            const idx = fw.stackedWeights.findIndex(sw => sw.weightId === weightId);
            if (idx !== -1) {
                console.log('[FREE-WEIGHT] Удаление из стопки:', weightId, 'из', fw.weightId);
                fw.stackedWeights.splice(idx, 1);
                this.state.usedWeightIds.delete(weightId);
                
                // Пересчитываем массу
                fw.totalMass = fw.mass + fw.stackedWeights.reduce((sum, w) => sum + w.mass, 0);
                
                this.renderWeightsInventory();
                this.drawDynamic();
                this.showStatus('Груз возвращён в инвентарь', 'info');
                return;
            }
        }
    }
    
    /**
     * 🎯 Переместить свободный груз на брусок
     */
    moveFreeWeightToBlock(freeWeight) {
        if (!this.state.blockPlaced) {
            this.showStatus('Сначала разместите брусок!', 'warning');
            return;
        }
        
        console.log('[MOVE-TO-BLOCK] Перемещение на брусок:', freeWeight.weightId);
        
        // Добавляем основной груз на брусок
        this.addWeightToBlock(freeWeight.weightId, freeWeight.mass);
        
        // Добавляем все грузы из стопки
        if (freeWeight.stackedWeights) {
            freeWeight.stackedWeights.forEach(sw => {
                this.addWeightToBlock(sw.weightId, sw.mass);
            });
        }
        
        // Удаляем из свободных
        const index = this.state.freeWeights.findIndex(fw => fw.id === freeWeight.id);
        if (index !== -1) {
            this.state.freeWeights.splice(index, 1);
        }
        
        this.drawDynamic();
    }
    
    /**
     * 🎯 Переместить свободный груз на динамометр
     */
    moveFreeWeightToDynamometer(freeWeight) {
        if (!this.state.dynamometerPlaced || this.state.dynamometerMode !== 'vertical') {
            this.showStatus('Динамометр не готов для взвешивания!', 'warning');
            return;
        }
        
        console.log('[MOVE-TO-DYNAMOMETER] Перемещение на динамометр:', freeWeight.weightId);
        
        // Добавляем основной груз на динамометр
        this.addWeightToDynamometer(freeWeight.weightId, freeWeight.mass);
        
        // Добавляем все грузы из стопки
        if (freeWeight.stackedWeights) {
            freeWeight.stackedWeights.forEach(sw => {
                this.addWeightToDynamometer(sw.weightId, sw.mass);
            });
        }
        
        // Удаляем из свободных
        const index = this.state.freeWeights.findIndex(fw => fw.id === freeWeight.id);
        if (index !== -1) {
            this.state.freeWeights.splice(index, 1);
        }
        
        this.drawDynamic();
    }
    
    // ==================== FREE WEIGHT DRAGGING ====================
    
    /**
     * 🔍 Найти свободный груз в указанной позиции
     */
    findFreeWeightAtPosition(x, y) {
        if (!this.state.freeWeights || this.state.freeWeights.length === 0) return null;
        
        // Проверяем в обратном порядке (последний добавленный сверху)
        for (let i = this.state.freeWeights.length - 1; i >= 0; i--) {
            const fw = this.state.freeWeights[i];
            const halfSize = (fw.width || 80) / 2;
            
            // Проверяем попадание в базовый груз
            if (x >= fw.x - halfSize && x <= fw.x + halfSize &&
                y >= fw.y - halfSize && y <= fw.y + halfSize) {
                return fw;
            }
            
            // Проверяем попадание в стопку сверху
            if (fw.stackedWeights && fw.stackedWeights.length > 0) {
                let offsetY = -halfSize * 1.6;
                for (const sw of fw.stackedWeights) {
                    const stackHalfSize = 35;
                    if (x >= fw.x - stackHalfSize && x <= fw.x + stackHalfSize &&
                        y >= fw.y + offsetY - stackHalfSize && y <= fw.y + offsetY + stackHalfSize) {
                        return fw; // Возвращаем базовый груз (всю стопку)
                    }
                    offsetY -= 60;
                }
            }
        }
        return null;
    }
    
    /**
     * 🎬 Начать перетаскивание свободного груза
     */
    startFreeWeightDrag(freeWeight, pos) {
        console.log('[FREE-DRAG] Начало перетаскивания:', freeWeight.weightId);
        
        freeWeight.isDragging = true;
        freeWeight.dragOffsetX = pos.x - freeWeight.x;
        freeWeight.dragOffsetY = pos.y - freeWeight.y;
        
        this.state.draggingFreeWeight = freeWeight;
        document.body.style.cursor = 'grabbing';
        
        // Bind events
        this.boundFreeWeightMove = (e) => this.handleFreeWeightMove(e);
        this.boundFreeWeightEnd = () => this.handleFreeWeightEnd();
        
        window.addEventListener('mousemove', this.boundFreeWeightMove);
        window.addEventListener('mouseup', this.boundFreeWeightEnd);
        window.addEventListener('touchmove', this.boundFreeWeightMove, { passive: false });
        window.addEventListener('touchend', this.boundFreeWeightEnd);
        
        this.drawDynamic();
    }
    
    /**
     * 🔄 Обработка движения при перетаскивании свободного груза
     */
    handleFreeWeightMove(e) {
        e.preventDefault();
        const pos = this.getCanvasPosition(e);
        const fw = this.state.draggingFreeWeight;
        if (!fw) return;
        
        fw.x = pos.x - (fw.dragOffsetX || 0);
        fw.y = pos.y - (fw.dragOffsetY || 0);
        
        // 🚀 ОПТИМИЗАЦИЯ: Используем flag вместо прямого drawDynamic
        this._needsRedraw = true;
    }
    
    /**
     * 🏁 Окончание перетаскивания свободного груза
     */
    handleFreeWeightEnd() {
        const fw = this.state.draggingFreeWeight;
        if (!fw) return;
        
        console.log('[FREE-DRAG] Окончание перетаскивания:', fw.weightId, 'at', fw.x, fw.y);
        
        fw.isDragging = false;
        this.state.draggingFreeWeight = null;
        document.body.style.cursor = 'default';
        
        // Remove events
        window.removeEventListener('mousemove', this.boundFreeWeightMove);
        window.removeEventListener('mouseup', this.boundFreeWeightEnd);
        window.removeEventListener('touchmove', this.boundFreeWeightMove);
        window.removeEventListener('touchend', this.boundFreeWeightEnd);
        
        // Проверяем, куда бросили груз
        
        // 1. На брусок?
        if (this.state.blockPlaced) {
            const blockCenterX = this.state.blockX + this.layout.block.width / 2;
            const blockCenterY = this.state.blockY + this.layout.block.height / 2;
            const distanceToBlock = Math.hypot(fw.x - blockCenterX, fw.y - blockCenterY);
            
            if (distanceToBlock < 150) {
                this.moveFreeWeightToBlock(fw);
                return;
            }
        }
        
        // 2. На вертикальный динамометр?
        if (this.state.dynamometerPlaced && this.state.dynamometerMode === 'vertical') {
            const hookX = 100;
            const hookY = 350;
            const distanceToHook = Math.hypot(fw.x - hookX, fw.y - hookY);
            
            if (distanceToHook < 150) {
                this.moveFreeWeightToDynamometer(fw);
                return;
            }
        }
        
        // 3. Соединение с другим свободным грузом?
        const nearbyWeight = this.findNearbyFreeWeightExcept(fw.x, fw.y, 100, fw);
        if (nearbyWeight) {
            // Соединяем: перемещаем текущий груз в стопку другого
            this.mergeFreeWeights(nearbyWeight, fw);
            return;
        }
        
        // 4. Двойной клик = разъединение стопки
        // (это обрабатывается отдельно через dblclick)
        
        this.drawDynamic();
    }
    
    /**
     * 🔍 Найти свободный груз рядом (исключая указанный)
     */
    findNearbyFreeWeightExcept(x, y, radius, excludeWeight) {
        for (const fw of this.state.freeWeights) {
            if (fw === excludeWeight) continue;
            const distance = Math.hypot(fw.x - x, fw.y - y);
            if (distance < radius) {
                return fw;
            }
        }
        return null;
    }
    
    /**
     * 🔗 Объединить два свободных груза (перемещённый добавляется в стопку базового)
     */
    mergeFreeWeights(baseWeight, movedWeight) {
        console.log('[MERGE] Объединение:', baseWeight.weightId, '+', movedWeight.weightId);
        
        // Добавляем основной груз movedWeight в стопку base
        baseWeight.stackedWeights.push({
            weightId: movedWeight.weightId,
            mass: movedWeight.mass
        });
        
        // Добавляем все грузы из стопки movedWeight
        if (movedWeight.stackedWeights) {
            movedWeight.stackedWeights.forEach(sw => {
                baseWeight.stackedWeights.push(sw);
            });
        }
        
        // Пересчитываем массу
        baseWeight.totalMass = baseWeight.mass + baseWeight.stackedWeights.reduce((sum, w) => sum + w.mass, 0);
        
        // Удаляем перемещённый груз из списка свободных
        const index = this.state.freeWeights.findIndex(fw => fw.id === movedWeight.id);
        if (index !== -1) {
            this.state.freeWeights.splice(index, 1);
        }
        
        this.drawDynamic();
        this.showStatus(`Грузы соединены! Σ ${baseWeight.totalMass} г`, 'success');
    }
    
    /**
     * 🖱️ Обработка двойного клика - разъединение стопки грузов
     */
    handleDoubleClick(e) {
        const pos = this.getCanvasPosition(e);
        
        // Ищем свободный груз со стопкой
        const clickedWeight = this.findFreeWeightAtPosition(pos.x, pos.y);
        if (clickedWeight && clickedWeight.stackedWeights && clickedWeight.stackedWeights.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('[DBLCLICK] Разъединение стопки:', clickedWeight.weightId);
            this.unstackTopWeight(clickedWeight);
            return;
        }
    }
    
    removeWeightFromBlock(weightId) {
        const index = this.state.weightsOnBlock.findIndex(w => w.id === weightId);
        if (index === -1) return;
        
        const weight = this.state.weightsOnBlock[index];
        this.state.weightsOnBlock.splice(index, 1);
        this.state.usedWeightIds.delete(weightId);
        this.state.blockMass = this.calculateTotalMass();
        
        this.renderWeightsInventory();
        this.drawEquipment();
        this.drawDynamic();
        this.updateMeasurementDisplay();
        
        this.showStatus(`Груз снят`, 'info');
    }
    
    /**
     * Снять груз с динамометра по ID (для кнопки "Вернуть")
     */
    removeWeightFromDynamometer(weightId) {
        const index = this.state.weighingItems.findIndex(item => 
            item.type === 'weight' && item.id === weightId
        );
        if (index === -1) return;
        
        const item = this.state.weighingItems[index];
        this.state.weighingItems.splice(index, 1);
        this.state.weighingTotalMass -= item.mass;
        this.state.usedWeightIds.delete(weightId);
        
        this.renderWeightsInventory();
        this.drawDynamic();
        
        this.showStatus(`Груз снят с динамометра`, 'info');
    }
    
    /**
     * Снять брусок с динамометра (для кнопки "Вернуть")
     */
    removeBlockFromDynamometer() {
        const index = this.state.weighingItems.findIndex(item => item.type === 'block');
        if (index === -1) return;
        
        const item = this.state.weighingItems[index];
        
        // Также снимаем все грузы с динамометра, которые были на бруске
        this.state.weighingItems.forEach(wi => {
            if (wi.type === 'weight') {
                this.state.usedWeightIds.delete(wi.id);
            }
        });
        this.state.weighingItems = [];
        this.state.weighingTotalMass = 0;
        
        this.renderWeightsInventory();
        this.renderEquipmentInventory();
        this.drawDynamic();
        
        this.showStatus('Брусок снят с динамометра', 'info');
    }
    
    // ==================== WEIGHING ON DYNAMOMETER ====================
    
    switchToHorizontalMode() {
        // Переключаем динамометр в горизонтальный режим (прикрепляем к бруску)
        if (!this.state.blockPlaced) {
            this.showStatus('Сначала разместите брусок!', 'warning');
            return;
        }
        
        // 🆕 Если на динамометре есть грузы - автоматически переносим их на брусок!
        if (this.state.weighingItems.length > 0) {
            console.log('[DYNAMOMETER] Transferring weights to block:', this.state.weighingItems);
            
            // Проверяем лимит грузов на бруске
            const availableSlots = 4 - this.state.weightsOnBlock.length;
            const weightsToTransfer = this.state.weighingItems.filter(item => item.type === 'weight');
            
            if (weightsToTransfer.length > availableSlots) {
                this.showStatus(`На бруске места только для ${availableSlots} грузов!`, 'warning');
                return;
            }
            
            // Переносим все грузы с динамометра на брусок
            for (const item of this.state.weighingItems) {
                if (item.type === 'weight') {
                    // Добавляем на брусок через weightsOnBlock
                    this.state.weightsOnBlock.push({ id: item.id, mass: item.mass });
                    console.log(`[DYNAMOMETER] Moved weight ${item.id} (${item.mass}g) to block`);
                }
            }
            
            // Пересчитываем массу бруска
            this.state.blockMass = this.calculateTotalMass();
            
            // Очищаем динамометр
            this.state.weighingItems = [];
            this.state.weighingTotalMass = 0;
            
            this.renderWeightsInventory();
            this.updateMeasurementDisplay();
            this.showStatus('Грузы перенесены на брусок!', 'info');
        }
        
        this.state.dynamometerMode = 'horizontal';
        this.state.dynamometerAttached = true;
        this.attachButtonArea = null;
        this.recordButtonArea = null;
        
        const maxForce = this.state.activeDynamometer === 'dynamometer1' ? 1 : 5;
        this.showStatus(`Динамометр ${maxForce}Н прикреплён к бруску. Тяните вправо!`, 'success');
        
        if (this.particles) {
            this.particles.createSuccessSparkles(
                this.state.blockX + this.layout.block.width + 100,
                this.state.blockY,
                15
            );
        }
        
        this.drawDynamic();
    }
    
    switchToVerticalMode() {
        // Переключаем динамометр в вертикальный режим (для взвешивания)
        this.state.dynamometerMode = 'vertical';
        this.state.dynamometerAttached = false;
        this.state.dynamometerX = 150;
        this.state.dynamometerY = 100;
        this.state.weighingItems = [];
        this.state.weighingTotalMass = 0;
        this.state.pullingForce = 0;
        
        const maxForce = this.state.activeDynamometer === 'dynamometer1' ? 1 : 5;
        this.showStatus(`Динамометр ${maxForce}Н готов для взвешивания`, 'info');
        
        this.drawDynamic();
    }
    
    addWeightToDynamometer(weightId, mass) {
        // Проверяем что динамометр в вертикальном режиме
        if (this.state.dynamometerMode !== 'vertical') {
            this.showStatus('Динамометр не в режиме взвешивания!', 'warning');
            return;
        }
        
        // Добавляем груз
        this.state.weighingItems.push({ type: 'weight', id: weightId, mass: mass });
        this.state.weighingTotalMass += mass;
        this.state.usedWeightIds.add(weightId);
        
        this.renderWeightsInventory();
        this.drawDynamic();
        
        const weightN = (this.state.weighingTotalMass / 1000) * PHYSICS_CONFIG.g;
        this.showStatus(`Груз на динамометре. Вес: ${weightN.toFixed(1)} Н`, 'info');
    }
    
    addBlockToDynamometer() {
        // Проверяем что динамометр в вертикальном режиме
        if (this.state.dynamometerMode !== 'vertical') {
            return;
        }
        
        // Проверяем что брусок ещё не на динамометре
        const hasBlock = this.state.weighingItems.some(item => item.type === 'block');
        if (hasBlock) {
            this.showStatus('Брусок уже на динамометре!', 'warning');
            return;
        }
        
        // Добавляем брусок с грузами которые на нём
        const blockMass = EQUIPMENT_CONFIG.block.mass;
        const weightsMass = this.state.weightsOnBlock.reduce((sum, w) => sum + w.mass, 0);
        const totalMass = blockMass + weightsMass;
        
        this.state.weighingItems.push({ type: 'block', mass: totalMass });
        this.state.weighingTotalMass += totalMass;
        
        // Обновляем инвентарь оборудования (чтобы показать статус и кнопку Вернуть)
        this.renderEquipmentInventory();
        this.drawDynamic();
        
        const weightN = (this.state.weighingTotalMass / 1000) * PHYSICS_CONFIG.g;
        this.showStatus(`Брусок на динамометре. Вес: ${weightN.toFixed(1)} Н`, 'info');
    }
    
    removeFromDynamometer(itemType, itemId = null) {
        if (itemType === 'all') {
            // Снимаем всё
            this.state.weighingItems.forEach(item => {
                if (item.type === 'weight') {
                    this.state.usedWeightIds.delete(item.id);
                }
            });
            this.state.weighingItems = [];
            this.state.weighingTotalMass = 0;
        } else if (itemType === 'weight' && itemId) {
            const idx = this.state.weighingItems.findIndex(i => i.type === 'weight' && i.id === itemId);
            if (idx !== -1) {
                const item = this.state.weighingItems[idx];
                this.state.weighingTotalMass -= item.mass;
                this.state.usedWeightIds.delete(item.id);
                this.state.weighingItems.splice(idx, 1);
            }
        } else if (itemType === 'block') {
            const idx = this.state.weighingItems.findIndex(i => i.type === 'block');
            if (idx !== -1) {
                const item = this.state.weighingItems[idx];
                this.state.weighingTotalMass -= item.mass;
                this.state.weighingItems.splice(idx, 1);
            }
        }
        
        this.renderWeightsInventory();
        this.drawDynamic();
    }
    
    recordWeighingAsNormal() {
        if (this.state.weighingTotalMass <= 0) {
            this.showStatus('Нечего записывать! Повесьте грузы.', 'warning');
            return;
        }
        
        const weight = (this.state.weighingTotalMass / 1000) * PHYSICS_CONFIG.g;
        
        // Записываем как N
        this.state.recordedNormal = weight;
        
        // Обновляем UI
        const normalDisplay = document.getElementById('recorded-normal-display');
        const normalValue = document.getElementById('recorded-normal-value');
        const currentNormal = document.getElementById('current-normal');
        
        if (normalDisplay) normalDisplay.style.display = 'flex';
        if (normalValue) normalValue.textContent = weight.toFixed(1);
        if (currentNormal) {
            currentNormal.textContent = `${weight.toFixed(1)} Н`;
            currentNormal.style.display = 'inline';
        }
        
        this.updateCalculateButton();
        this.showStatus(`Записано N = ${weight.toFixed(1)} Н`, 'success');
        
        if (this.particles) {
            this.particles.createSuccessSparkles(this.state.dynamometerX, this.state.dynamometerY + 100, 10);
        }
    }
    
    /**
     * 🖼️ Предзагрузка изображений грузов
     */
    async preloadWeightImages() {
        console.log('📦 Preloading weight images...');
        
        const loadImage = (src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => {
                    console.warn(`⚠️ Failed to load image: ${src}`);
                    resolve(null);
                };
                img.src = src;
            });
        };
        
        const promises = this.weightsInventory.map(async (weight) => {
            if (weight.icon) {
                const img = await loadImage(weight.icon);
                if (img) {
                    this.weightImages[weight.id] = img;
                    console.log(`✅ Loaded image for ${weight.id}`);
                }
            }
        });
        
        await Promise.all(promises);
        console.log('✅ Weight images preloaded:', Object.keys(this.weightImages).length);
    }
    
    calculateTotalMass() {
        let total = EQUIPMENT_CONFIG.block.mass;
        for (const w of this.state.weightsOnBlock) {
            total += w.mass;
        }
        return total;
    }
    
    renderWeightsInventory() {
        const container = document.getElementById('weights-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.weightsInventory.forEach((weight, index) => {
            const isUsed = this.state.usedWeightIds.has(weight.id);
            
            const item = document.createElement('div');
            item.className = `weight-item ${isUsed ? 'used' : ''}`;
            item.dataset.weightId = weight.id;
            item.dataset.id = weight.id;
            item.dataset.mass = weight.mass;
            item.dataset.type = 'weight';
            item.draggable = !isUsed;
            
            // 🎨 Визуальное изображение груза (как в spring эксперименте)
            const figure = document.createElement('div');
            figure.className = 'weight-figure';
            
            if (weight.icon) {
                // Используем SVG иконку как в spring эксперименте
                const img = document.createElement('img');
                img.src = weight.icon;
                img.alt = weight.name;
                img.className = 'weight-icon-img';
                figure.appendChild(img);
            } else {
                // Fallback на placeholder без массы
                const placeholder = document.createElement('div');
                placeholder.className = 'weight-placeholder';
                placeholder.textContent = '⚪';
                figure.appendChild(placeholder);
            }
            
            item.appendChild(figure);
            
            // Название груза без массы
            const label = document.createElement('div');
            label.className = 'weight-label';
            label.textContent = `Груз ${index + 1}`;
            item.appendChild(label);
            
            // Кнопка "Вернуть в комплект" для использованных грузов
            if (isUsed) {
                // Определяем где находится груз: на бруске, динамометре или свободно на canvas
                const isOnBlock = this.state.weightsOnBlock.some(w => w.id === weight.id);
                const isOnDynamometer = this.state.weighingItems.some(item => item.type === 'weight' && item.id === weight.id);
                
                // 🆕 Проверяем, является ли груз свободным на canvas
                const freeWeight = this.state.freeWeights?.find(fw => fw.weightId === weight.id);
                const isInStack = this.state.freeWeights?.some(fw => 
                    fw.stackedWeights?.some(sw => sw.weightId === weight.id)
                );
                const isFree = freeWeight || isInStack;
                
                const status = document.createElement('div');
                status.className = 'weight-status';
                if (isOnDynamometer) {
                    status.textContent = 'На динамометре';
                } else if (isOnBlock) {
                    status.textContent = 'На бруске';
                } else if (isFree) {
                    status.textContent = 'На столе';
                } else {
                    status.textContent = 'Использован';
                }
                item.appendChild(status);
                
                const action = document.createElement('button');
                action.type = 'button';
                action.className = 'weight-action';
                
                // Проверяем: если это база стопки с грузами сверху - нельзя вернуть
                const hasStackedWeights = freeWeight && freeWeight.stackedWeights && freeWeight.stackedWeights.length > 0;
                
                if (hasStackedWeights) {
                    action.textContent = 'Снимите грузы сверху';
                    action.disabled = true;
                    action.style.fontSize = '10px';
                    action.style.opacity = '0.6';
                    action.style.cursor = 'not-allowed';
                } else {
                    action.textContent = 'ВЕРНУТЬ';
                    action.addEventListener('click', (evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (isOnDynamometer) {
                            this.removeWeightFromDynamometer(weight.id);
                        } else if (isOnBlock) {
                            this.removeWeightFromBlock(weight.id);
                        } else if (freeWeight) {
                            // Удаляем свободный груз с canvas (только если нет стопки)
                            this.removeFreeWeight(freeWeight.id);
                        } else if (isInStack) {
                            // Груз в стопке - нужно найти и удалить из стопки
                            this.removeFreeWeightFromStack(weight.id);
                        }
                    });
                }
                item.appendChild(action);
            } else {
                const hint = document.createElement('div');
                hint.className = 'weight-hint';
                hint.textContent = 'На брусок или весы';
                item.appendChild(hint);
            }
            
            container.appendChild(item);
        });
        
        // Обновляем состояние оборудования
        this.updateEquipmentStatus();
    }
    
    /**
     * 🎨 Рендеринг инвентаря оборудования (как в spring эксперименте)
     */
    renderEquipmentInventory() {
        const container = document.getElementById('equipment-container');
        if (!container) {
            console.warn('⚠️ Equipment container not found');
            return;
        }
        
        container.innerHTML = '';
        
        // Определяем оборудование для эксперимента трения
        const equipmentList = [
            { id: 'surface', name: 'Направляющая', type: 'surface' },
            { id: 'block', name: 'Брусок', type: 'block' },
            { id: 'dynamometer1', name: 'Динамометр 1Н', type: 'dynamometer', maxForce: 1 },
            { id: 'dynamometer5', name: 'Динамометр 5Н', type: 'dynamometer', maxForce: 5 }
        ];
        
        equipmentList.forEach((equipment) => {
            let isPlaced = false;
            let isOnDynamometer = false; // Брусок на динамометре
            
            if (equipment.type === 'surface') {
                isPlaced = this.state.surfacePlaced;
            } else if (equipment.type === 'block') {
                // Проверяем, на динамометре ли брусок
                isOnDynamometer = this.state.weighingItems.some(item => item.type === 'block');
                // Брусок размещён если на поверхности ИЛИ на динамометре
                isPlaced = this.state.blockPlaced || isOnDynamometer;
            } else if (equipment.type === 'dynamometer') {
                // Динамометр считается установленным, если это тот, который выбран
                isPlaced = this.state.dynamometerPlaced && this.state.activeDynamometer === equipment.id;
            }
            
            const item = document.createElement('div');
            item.className = 'equipment-item';
            item.dataset.equipment = equipment.id;
            item.dataset.type = 'equipment';
            item.dataset.status = isPlaced ? 'installed' : 'available';
            item.draggable = !isPlaced;
            
            if (isPlaced) {
                item.classList.add('used');
                item.classList.add('equipment-item--installed');
            }
            
            // 🎨 Визуальное изображение оборудования на canvas
            const figure = document.createElement('div');
            figure.className = 'equipment-figure';
            
            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 70;
            canvas.className = 'equipment-preview';
            
            const ctx = canvas.getContext('2d');
            if (equipment.type === 'surface') {
                this.drawSurfacePreview(ctx);
            } else if (equipment.type === 'block') {
                this.drawBlockPreview(ctx);
            } else if (equipment.type === 'dynamometer') {
                this.drawDynamometerPreview(ctx, equipment);
            }
            
            figure.appendChild(canvas);
            item.appendChild(figure);
            
            const title = document.createElement('div');
            title.className = 'equipment-title';
            title.textContent = equipment.name;
            
            const status = document.createElement('div');
            status.className = 'equipment-status';
            // Статус учитывает брусок на динамометре
            if (equipment.type === 'block' && isOnDynamometer) {
                status.textContent = 'На динамометре';
            } else {
                status.textContent = isPlaced ? 'На установке' : 'В комплекте';
            }
            
            item.append(title, status);
            
            if (isPlaced) {
                // Кнопка "Вернуть" (с учетом зависимостей)
                let canReturn = false;
                if (equipment.type === 'dynamometer') {
                    canReturn = true;
                } else if (equipment.type === 'block') {
                    // Брусок можно вернуть если: на динамометре ИЛИ нет прикреплённого динамометра
                    canReturn = isOnDynamometer || !this.state.dynamometerPlaced;
                } else if (equipment.type === 'surface' && !this.state.blockPlaced) {
                    canReturn = true;
                }
                
                if (canReturn) {
                    const action = document.createElement('button');
                    action.type = 'button';
                    action.className = 'equipment-action';
                    action.textContent = 'Вернуть';
                    action.addEventListener('click', (evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (equipment.type === 'block' && isOnDynamometer) {
                            this.removeBlockFromDynamometer();
                        } else {
                            this.returnEquipment(equipment.id, item);
                        }
                    });
                    item.appendChild(action);
                }
            } else {
                const hint = document.createElement('div');
                hint.className = 'equipment-hint';
                hint.textContent = 'Перетащите на установку';
                item.appendChild(hint);
            }
            
            container.appendChild(item);
        });
        
        // Переинициализируем drag sources для нового оборудования
        this.reinitDragSources?.();
    }
    
    /**
     * 🎨 Отрисовка миниатюры направляющей
     */
    drawSurfacePreview(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        
        // Доска/направляющая - горизонтальная планка
        const boardHeight = 15;
        const boardY = h / 2 - boardHeight / 2 + 10;
        
        // Градиент дерева
        const gradient = ctx.createLinearGradient(0, boardY, 0, boardY + boardHeight);
        gradient.addColorStop(0, '#DEB887');
        gradient.addColorStop(0.3, '#D2B48C');
        gradient.addColorStop(0.7, '#C4A67A');
        gradient.addColorStop(1, '#A08060');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(5, boardY, w - 10, boardHeight);
        
        // Текстура дерева (линии)
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = boardY + 3 + i * 3;
            ctx.beginPath();
            ctx.moveTo(8, y);
            ctx.lineTo(w - 8, y);
            ctx.stroke();
        }
        
        // Рамка
        ctx.strokeStyle = '#8B5A2B';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(5, boardY, w - 10, boardHeight);
        
        // Ножки/опоры
        ctx.fillStyle = '#888';
        ctx.fillRect(12, boardY + boardHeight, 8, 10);
        ctx.fillRect(w - 20, boardY + boardHeight, 8, 10);
        
        ctx.restore();
    }
    
    /**
     * 🎨 Отрисовка миниатюры бруска
     */
    drawBlockPreview(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        
        const blockWidth = 55;
        const blockHeight = 28;
        const x = (w - blockWidth) / 2 - 3;
        const y = (h - blockHeight) / 2 + 5;
        
        // 3D эффект - боковая грань
        ctx.fillStyle = '#B8860B';
        ctx.beginPath();
        ctx.moveTo(x + blockWidth, y);
        ctx.lineTo(x + blockWidth + 6, y - 4);
        ctx.lineTo(x + blockWidth + 6, y + blockHeight - 4);
        ctx.lineTo(x + blockWidth, y + blockHeight);
        ctx.closePath();
        ctx.fill();
        
        // 3D эффект - верхняя грань
        ctx.fillStyle = '#DAA520';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 6, y - 4);
        ctx.lineTo(x + blockWidth + 6, y - 4);
        ctx.lineTo(x + blockWidth, y);
        ctx.closePath();
        ctx.fill();
        
        // Передняя грань (основная)
        const gradient = ctx.createLinearGradient(x, y, x, y + blockHeight);
        gradient.addColorStop(0, '#DEB887');
        gradient.addColorStop(0.5, '#D2B48C');
        gradient.addColorStop(1, '#C4A67A');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, blockWidth, blockHeight);
        
        // Текстура дерева
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const ly = y + 5 + i * 6;
            ctx.beginPath();
            ctx.moveTo(x + 3, ly);
            ctx.lineTo(x + blockWidth - 3, ly);
            ctx.stroke();
        }
        
        // Рамка
        ctx.strokeStyle = '#8B5A2B';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, blockWidth, blockHeight);
        
        // === 3 ОТВЕРСТИЯ ДЛЯ ГРУЗОВ (СВЕРХУ) ===
        const holeSpacing = blockWidth / 4;
        const holeRadius = 5;
        
        for (let i = 0; i < 3; i++) {
            const holeX = x + holeSpacing * (i + 1);
            const holeY = y; // На верхней грани
            
            // Тёмная дыра (полукруг сверху)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(holeX, holeY, holeRadius, 0, Math.PI); // Только нижняя половина
            ctx.fill();
            
            // Обводка
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(holeX, holeY, holeRadius, 0, Math.PI);
            ctx.stroke();
        }
        
        // Крючок для динамометра
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + blockWidth, y + blockHeight / 2);
        ctx.lineTo(x + blockWidth + 12, y + blockHeight / 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x + blockWidth + 15, y + blockHeight / 2, 3, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * 🎨 Отрисовка миниатюры динамометра
     */
    drawDynamometerPreview(ctx, equipment) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        
        const bodyWidth = 25;
        const bodyHeight = 55;
        const centerX = w / 2;
        const centerY = h / 2 + 5;
        
        // Корпус - металлический градиент
        const gradient = ctx.createLinearGradient(centerX - bodyWidth/2, 0, centerX + bodyWidth/2, 0);
        gradient.addColorStop(0, '#dcdcdc');
        gradient.addColorStop(0.5, '#f0f0f0');
        gradient.addColorStop(1, '#dcdcdc');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - bodyWidth/2, centerY - bodyHeight/2, bodyWidth, bodyHeight);
        
        // Рамка корпуса
        ctx.strokeStyle = '#505050';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(centerX - bodyWidth/2, centerY - bodyHeight/2, bodyWidth, bodyHeight);
        
        // Левый крючок (для крепления к бруску)
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - bodyWidth/2, centerY);
        ctx.lineTo(centerX - bodyWidth/2 - 8, centerY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX - bodyWidth/2 - 11, centerY, 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Шкала (вертикальная линия)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - bodyHeight/2 + 8);
        ctx.lineTo(centerX, centerY + bodyHeight/2 - 10);
        ctx.stroke();
        
        // Деления
        for (let i = 0; i <= 4; i++) {
            const y = centerY - bodyHeight/2 + 8 + i * 10;
            ctx.beginPath();
            ctx.moveTo(centerX - 3, y);
            ctx.lineTo(centerX + 3, y);
            ctx.stroke();
        }
        
        // Надпись "5Н"
        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(equipment.maxForce + 'Н', centerX, centerY + bodyHeight/2 - 3);
        
        // Правая ручка (для тяги)
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX + bodyWidth/2, centerY);
        ctx.lineTo(centerX + bodyWidth/2 + 10, centerY);
        ctx.stroke();
        
        // Петля на ручке
        ctx.beginPath();
        ctx.arc(centerX + bodyWidth/2 + 13, centerY, 3, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    updateEquipmentStatus() {
        // Перерисовываем весь инвентарь оборудования с новым состоянием
        this.renderEquipmentInventory();
    }
    
    drawWeightPreview(ctx, mass, color) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        // Gradient for metallic look
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, color || '#CD853F');
        gradient.addColorStop(0.5, '#DEB887');
        gradient.addColorStop(1, color || '#8B4513');
        
        // Weight body
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(5, 10, w - 10, h - 15, 6);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(8, 13, w - 16, 8);
        
        // Border
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Не показываем массу на грузике - ученик должен определить сам
    }
    
    // ==================== EVENT LISTENERS ====================
    
    setupEventListeners() {
        // Surface selector
        const surfaceSelect = document.getElementById('surface-select');
        if (surfaceSelect) {
            surfaceSelect.addEventListener('change', (e) => {
                this.state.currentSurface = e.target.value;
                this.drawBackground();
                this.updateMeasurementDisplay();
                this.showStatus(`Поверхность: ${PHYSICS_CONFIG.frictionCoefficients[e.target.value].name}`, 'info');
            });
        }
        
        // === НОВЫЕ ОБРАБОТЧИКИ ДЛЯ РАСЧЁТА μ ===
        
        // Record Normal Force (N)
        document.getElementById('btn-record-normal')?.addEventListener('click', () => {
            this.recordNormalForce();
        });
        
        // Record Friction Force
        document.getElementById('btn-record-friction')?.addEventListener('click', () => {
            this.recordFrictionForce();
        });
        
        // Reset measurement
        document.getElementById('btn-reset-measurement')?.addEventListener('click', () => {
            this.resetMeasurement();
        });
        
        // Calculate coefficient
        document.getElementById('btn-calculate-coefficient')?.addEventListener('click', () => {
            this.calculateCoefficient();
        });
        
        // Complete experiment
        document.getElementById('btn-complete')?.addEventListener('click', () => {
            this.completeExperiment();
        });
        
        // === СТАРЫЕ ОБРАБОТЧИКИ (оставляем для совместимости) ===
        
        // Record measurement (старый)
        document.getElementById('btn-record')?.addEventListener('click', () => {
            this.recordMeasurement();
        });
        
        // Clear table
        document.getElementById('btn-clear-table')?.addEventListener('click', () => {
            this.clearMeasurements();
        });
        
        // Calculate (старый)
        document.getElementById('btn-calculate')?.addEventListener('click', () => {
            this.calculateFrictionCoefficient();
        });
        
        // Reset
        document.getElementById('btn-reset')?.addEventListener('click', () => {
            this.resetExperiment();
        });
        
        // Help
        document.getElementById('btn-help')?.addEventListener('click', () => {
            const modal = document.getElementById('help-modal');
            if (modal) modal.style.display = 'flex';
        });
        
        document.querySelector('#help-modal .modal-close')?.addEventListener('click', () => {
            const modal = document.getElementById('help-modal');
            if (modal) modal.style.display = 'none';
        });
        
        // Fullscreen
        document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Magnifier
        const container = document.getElementById('canvas-container') || document.querySelector('.canvas-container');
        const btnMagnifier = document.getElementById('btn-magnifier');
        
        if (btnMagnifier && this.magnifier) {
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
        
        // 🔧 FIX: Add mouse/touch move handlers for magnifier position (like in spring experiment)
        if (container && this.magnifier) {
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
        }
        
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M' || e.key === 'Shift') {
                this.magnifier?.show();
                document.getElementById('btn-magnifier')?.classList.add('active');
            }
            if (e.key === 'r' || e.key === 'R') {
                this.resetExperiment();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.key === 'm' || e.key === 'M' || e.key === 'Shift') {
                this.magnifier?.hide();
                document.getElementById('btn-magnifier')?.classList.remove('active');
            }
        });
    }
    
    // ==================== НОВЫЕ МЕТОДЫ ДЛЯ РАСЧЁТА μ ====================
    
    recordNormalForce() {
        const input = document.getElementById('manual-normal-input');
        if (!input) return;
        
        // Парсим значение (поддержка запятой и точки)
        let value = input.value.replace(',', '.').trim();
        const normalForce = parseFloat(value);
        
        if (isNaN(normalForce) || normalForce <= 0) {
            this.showStatus('Введите корректное значение силы N!', 'error');
            return;
        }
        
        // Сохраняем
        this.state.recordedNormal = normalForce;
        
        // Показываем записанное значение
        const display = document.getElementById('recorded-normal-display');
        const valueEl = document.getElementById('recorded-normal-value');
        if (display && valueEl) {
            valueEl.textContent = normalForce.toFixed(2);
            display.style.display = 'flex';
        }
        
        input.value = '';
        this.showStatus(`Сила давления записана: N = ${normalForce.toFixed(2)} Н`, 'success');
        this.updateCalculateButton();
    }
    
    recordFrictionForce() {
        const input = document.getElementById('manual-friction-input');
        if (!input) return;
        
        // Парсим значение
        let value = input.value.replace(',', '.').trim();
        const force = parseFloat(value);
        
        if (isNaN(force) || force < 0) {
            this.showStatus('Введите корректное значение силы трения!', 'error');
            return;
        }
        
        // Сохраняем
        this.state.recordedFriction = force;
        
        // Показываем записанное значение
        const display = document.getElementById('recorded-friction-display');
        const valueEl = document.getElementById('recorded-friction-value');
        if (display && valueEl) {
            valueEl.textContent = force.toFixed(2);
            display.style.display = 'flex';
        }
        
        input.value = '';
        this.showStatus(`Сила трения записана: F_тр = ${force.toFixed(2)} Н`, 'success');
        this.updateCalculateButton();
    }
    
    updateCalculateButton() {
        const btn = document.getElementById('btn-calculate-coefficient');
        if (!btn) return;
        
        const hasNormal = this.state.recordedNormal > 0;
        const hasFriction = this.state.recordedFriction !== undefined && this.state.recordedFriction >= 0;
        
        btn.disabled = !(hasNormal && hasFriction);
    }
    
    resetMeasurement() {
        this.state.recordedNormal = 0;
        this.state.recordedFriction = undefined;
        
        // Скрываем записанные значения
        const normalDisplay = document.getElementById('recorded-normal-display');
        const frictionDisplay = document.getElementById('recorded-friction-display');
        const resultDisplay = document.getElementById('calculation-result');
        
        if (normalDisplay) normalDisplay.style.display = 'none';
        if (frictionDisplay) frictionDisplay.style.display = 'none';
        if (resultDisplay) resultDisplay.style.display = 'none';
        
        // Очищаем поля ввода
        const normalInput = document.getElementById('manual-normal-input');
        const frictionInput = document.getElementById('manual-friction-input');
        if (normalInput) normalInput.value = '';
        if (frictionInput) frictionInput.value = '';
        
        // Блокируем кнопку расчёта
        const calcBtn = document.getElementById('btn-calculate-coefficient');
        if (calcBtn) calcBtn.disabled = true;
        
        // Блокируем кнопку завершения
        const completeBtn = document.getElementById('btn-complete');
        if (completeBtn) completeBtn.disabled = true;
        
        this.showStatus('Измерения сброшены', 'info');
    }
    
    calculateCoefficient() {
        const normalForce = this.state.recordedNormal;
        const friction = this.state.recordedFriction;
        
        if (!normalForce || normalForce <= 0 || friction === undefined) {
            this.showStatus('Сначала введите N и F_тр!', 'error');
            return;
        }
        
        // μ = F_тр / N
        const mu = friction / normalForce;
        
        // Показываем результат
        const resultDiv = document.getElementById('calculation-result');
        const calcText = document.getElementById('result-calculation-text');
        const resultValue = document.getElementById('result-coefficient-value');
        
        if (resultDiv && calcText && resultValue) {
            calcText.textContent = `μ = ${friction.toFixed(2)} / ${normalForce.toFixed(2)}`;
            resultValue.textContent = mu.toFixed(2);
            resultDiv.style.display = 'block';
        }
        
        // Разблокируем кнопку завершения
        const completeBtn = document.getElementById('btn-complete');
        if (completeBtn) completeBtn.disabled = false;
        
        this.showStatus(`Коэффициент трения: μ = ${mu.toFixed(2)}`, 'success');
        
        // Эффект частиц
        if (this.particles) {
            this.particles.createSuccessSparkles(450, 300, 20);
        }
    }
    
    completeExperiment() {
        this.showStatus('🎉 Опыт успешно завершён!', 'success');
        
        if (this.particles) {
            // Фейерверк
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.particles.createSuccessSparkles(
                        200 + Math.random() * 500,
                        150 + Math.random() * 300,
                        25
                    );
                }, i * 200);
            }
        }
    }
    
    // ==================== DRAWING ====================
    
    drawBackground() {
        const ctx = this.contexts.background;
        if (!ctx) return;
        
        const w = VISUAL_CONFIG.canvasWidth;
        const h = VISUAL_CONFIG.canvasHeight;
        
        // Clear
        ctx.clearRect(0, 0, w, h);
        
        // Background gradient (lab style like spring experiment)
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#1a1f2e');
        gradient.addColorStop(0.5, '#2a3142');
        gradient.addColorStop(1, '#1a1f2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        
        // Grid pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        
        // Draw table/surface только если размещена
        if (this.state.surfacePlaced) {
            this.drawSurface(ctx);
        }
    }
    
    drawSurface(ctx) {
        const surface = this.layout.surface;
        const surfaceType = this.state.currentSurface;
        const texture = SURFACE_TEXTURES[surfaceType];
        
        // Table shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(surface.x + 8, surface.y + 8, surface.width, surface.height + 80);
        
        // Table legs
        ctx.fillStyle = '#3d2817';
        const legWidth = 25;
        const legHeight = 80;
        ctx.fillRect(surface.x + 40, surface.y + surface.height, legWidth, legHeight);
        ctx.fillRect(surface.x + surface.width - 65, surface.y + surface.height, legWidth, legHeight);
        
        // Table surface gradient
        const tableGradient = ctx.createLinearGradient(surface.x, surface.y, surface.x, surface.y + surface.height);
        tableGradient.addColorStop(0, texture.baseColor);
        tableGradient.addColorStop(1, texture.lineColor);
        ctx.fillStyle = tableGradient;
        ctx.fillRect(surface.x, surface.y, surface.width, surface.height);
        
        // Surface pattern
        ctx.strokeStyle = texture.lineColor;
        ctx.lineWidth = 1;
        
        if (texture.pattern === 'grain') {
            // Wood grain
            for (let i = 0; i < surface.width; i += 20) {
                ctx.beginPath();
                ctx.moveTo(surface.x + i, surface.y);
                ctx.bezierCurveTo(
                    surface.x + i + 5, surface.y + surface.height / 3,
                    surface.x + i - 5, surface.y + surface.height * 2 / 3,
                    surface.x + i, surface.y + surface.height
                );
                ctx.stroke();
            }
        } else if (texture.pattern === 'dots') {
            // Rubber texture
            ctx.fillStyle = texture.lineColor;
            for (let i = 5; i < surface.width; i += 12) {
                for (let j = 5; j < surface.height; j += 12) {
                    ctx.beginPath();
                    ctx.arc(surface.x + i, surface.y + j, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Table edge highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(surface.x, surface.y);
        ctx.lineTo(surface.x + surface.width, surface.y);
        ctx.stroke();
        
        // Table border
        ctx.strokeStyle = '#2a1f14';
        ctx.lineWidth = 3;
        ctx.strokeRect(surface.x, surface.y, surface.width, surface.height);
    }
    
    drawEquipment() {
        const ctx = this.contexts.equipment;
        if (!ctx) return;
        
        const w = VISUAL_CONFIG.canvasWidth;
        const h = VISUAL_CONFIG.canvasHeight;
        
        ctx.clearRect(0, 0, w, h);
        
        // Рисуем линейку только когда поверхность размещена
        if (this.state.surfacePlaced) {
            this.drawRuler(ctx);
        }
    }
    
    drawRuler(ctx) {
        const rulerX = this.layout.surface.x + 20;
        const rulerY = this.layout.surface.y - 50;
        const rulerWidth = this.layout.surface.width - 40;
        const rulerHeight = 35;
        
        // Ruler body (wood texture like spring experiment)
        const gradient = ctx.createLinearGradient(rulerX, rulerY, rulerX, rulerY + rulerHeight);
        gradient.addColorStop(0, '#FFF8DC');
        gradient.addColorStop(0.5, '#FAEBD7');
        gradient.addColorStop(1, '#DEB887');
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.roundRect(rulerX, rulerY, rulerWidth, rulerHeight, 3);
        ctx.fill();
        
        // Wood grain lines
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < rulerWidth; i += 25) {
            ctx.beginPath();
            ctx.moveTo(rulerX + i, rulerY);
            ctx.lineTo(rulerX + i + 5, rulerY + rulerHeight);
            ctx.stroke();
        }
        
        // Border
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Scale markings
        ctx.fillStyle = '#333';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        
        const pixelsPerCm = 20;
        for (let cm = 0; cm <= 30; cm++) {
            const x = rulerX + 20 + cm * pixelsPerCm;
            if (x > rulerX + rulerWidth - 10) break;
            
            // Major tick (cm)
            ctx.beginPath();
            ctx.moveTo(x, rulerY + rulerHeight);
            ctx.lineTo(x, rulerY + rulerHeight - (cm % 5 === 0 ? 15 : 10));
            ctx.strokeStyle = '#333';
            ctx.lineWidth = cm % 5 === 0 ? 2 : 1;
            ctx.stroke();
            
            // Labels every 5 cm
            if (cm % 5 === 0) {
                ctx.fillText(cm.toString(), x, rulerY + rulerHeight - 18);
            }
        }
    }
    
    drawDynamic() {
        const ctx = this.contexts.dynamic;
        if (!ctx) return;
        
        // 🆕 ЗАЩИТНЫЙ МЕХАНИЗМ: Сбрасываем ТОЛЬКО если dragPosition=null
        // (это означает что drag закончился, но флаг не сбросился)
        if (this.state.isDragging && !this.state.dragPosition) {
            console.log('[SNAP-ZONES] ⚠️ Resetting stale isDragging (no dragPosition)');
            this.state.isDragging = false;
            this.state.draggingItemType = null;
        }
        
        const w = VISUAL_CONFIG.canvasWidth;
        const h = VISUAL_CONFIG.canvasHeight;
        
        // 🚀 ОПТИМИЗАЦИЯ: Полная очистка с сохранением контекста
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.restore();
        
        // Если динамометр в вертикальном режиме - рисуем его первым (слева)
        if (this.state.dynamometerPlaced && this.state.dynamometerMode === 'vertical') {
            this.drawVerticalDynamometer(ctx);
        }
        
        // 🔧 FIX: Рисуем брусок даже без направляющей (свободное размещение)
        // Рисуем брусок если он размещён
        if (this.state.blockPlaced) {
            this.drawBlockOptimized(ctx);
            this.drawWeightsOnBlock(ctx);
        }
        
        // Показываем подсказки и snap zones в зависимости от состояния
        if (!this.state.surfacePlaced && !this.state.blockPlaced) {
            // Ничего не размещено - показываем hint
            // === ЗЕЛЁНАЯ SNAP ZONE ПРИ ПЕРЕТАСКИВАНИИ НАПРАВЛЯЮЩЕЙ ===
            if (this.state.isDragging && this.state.draggingItemType === 'surface' && this.state.dragPosition) {
                this.drawSurfaceSnapZone(ctx);
            }
            
            // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ БРУСКА ===
            if (this.state.isDragging && this.state.draggingItemType === 'block' && this.state.dragPosition) {
                this.drawBlockSnapZones(ctx);
            }
            
            // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ ДИНАМОМЕТРА ===
            if (this.state.isDragging && this.state.draggingItemType === 'dynamometer' && this.state.dragPosition) {
                this.drawDynamometerSnapZones(ctx);
            }
            
            // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ ГРУЗА ===
            if (this.state.isDragging && this.state.draggingItemType === 'weight' && this.state.dragPosition) {
                this.drawWeightSnapZones(ctx);
            }
            
            // Рисуем свободные грузы
            this.drawFreeWeights(ctx);
            
            // Показываем подсказку
            this.drawPlacementHint(ctx, 'Перетащите оборудование на рабочую область', 'Направляющая или Брусок → из панели справа');
            return;
        }
        
        if (!this.state.surfacePlaced) {
            // === ЗЕЛЁНАЯ SNAP ZONE ПРИ ПЕРЕТАСКИВАНИИ НАПРАВЛЯЮЩЕЙ ===
            if (this.state.isDragging && this.state.draggingItemType === 'surface' && this.state.dragPosition) {
                this.drawSurfaceSnapZone(ctx);
            }
            
            // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ ДИНАМОМЕТРА ===
            if (this.state.isDragging && this.state.draggingItemType === 'dynamometer' && this.state.dragPosition) {
                this.drawDynamometerSnapZones(ctx);
            }
            
            // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ ГРУЗА ===
            if (this.state.isDragging && this.state.draggingItemType === 'weight' && this.state.dragPosition) {
                this.drawWeightSnapZones(ctx);
            }
            
            // Рисуем свободные грузы
            this.drawFreeWeights(ctx);
            
            // Динамометр в горизонтальном режиме
            if (this.state.dynamometerPlaced && this.state.dynamometerMode === 'horizontal') {
                this.drawDynamometer(ctx);
                if (this.state.isPulling && this.state.pullingForce > 0.1) {
                    this.drawForceVectors(ctx);
                }
                if (!this.state.isPulling) {
                    this.drawPullHint(ctx);
                }
            }
            return;
        }
        
        if (!this.state.blockPlaced) {
            // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ БРУСКА ===
            if (this.state.isDragging && this.state.draggingItemType === 'block' && this.state.dragPosition) {
                this.drawBlockSnapZones(ctx);
            }
            
            // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ ДИНАМОМЕТРА ===
            if (this.state.isDragging && this.state.draggingItemType === 'dynamometer' && this.state.dragPosition) {
                this.drawDynamometerSnapZones(ctx);
            }
            
            // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ ГРУЗА ===
            if (this.state.isDragging && this.state.draggingItemType === 'weight' && this.state.dragPosition) {
                this.drawWeightSnapZones(ctx);
            }
            
            // Рисуем свободные грузы
            this.drawFreeWeights(ctx);
            
            // Показываем подсказку о перетаскивании бруска
            this.drawPlacementHint(ctx, 'Перетащите брусок на направляющую', 'Брусок → из панели "Оборудование" справа');
            return;
        }
        
        // === ВСЁ РАЗМЕЩЕНО: рисуем оставшиеся элементы ===
        // (Блок и грузы на нём уже нарисованы выше)
        
        // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ ГРУЗА ===
        if (this.state.isDragging && this.state.draggingItemType === 'weight' && this.state.dragPosition) {
            this.drawWeightSnapZones(ctx);
        }
        
        // === ЗЕЛЁНЫЕ SNAP ZONES ПРИ ПЕРЕТАСКИВАНИИ ДИНАМОМЕТРА ===
        if (this.state.isDragging && this.state.draggingItemType === 'dynamometer' && this.state.dragPosition) {
            this.drawDynamometerSnapZones(ctx);
        }
        
        // Draw dynamometer (горизонтальный режим - прикреплён к бруску)
        if (this.state.dynamometerPlaced && this.state.dynamometerMode === 'horizontal') {
            this.drawDynamometer(ctx);
            
            // Draw force vectors when pulling
            if (this.state.isPulling && this.state.pullingForce > 0.1) {
                this.drawForceVectors(ctx);
            }
            
            // Draw pull hint
            if (!this.state.isPulling) {
                this.drawPullHint(ctx);
            }
        }
        
        // 🆕 Draw free weights (свободные грузы на canvas)
        this.drawFreeWeights(ctx);
    }
    
    /**
     * Рисует зелёную snap zone при перетаскивании направляющей
     */
    drawSurfaceSnapZone(ctx) {
        const dragX = this.state.dragPosition.x;
        const dragY = this.state.dragPosition.y;
        
        // Центр canvas - место для размещения направляющей
        const snapX = 450;
        const snapY = 480;
        
        const distance = Math.hypot(dragX - snapX, dragY - snapY);
        const snapRadius = 300;
        const isNear = distance < snapRadius;
        
        ctx.save();
        
        if (isNear) {
            ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
            ctx.lineWidth = 4;
            ctx.fillStyle = 'rgba(50, 255, 50, 0.15)';
        } else {
            ctx.strokeStyle = 'rgba(50, 255, 50, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 8]);
            ctx.fillStyle = 'rgba(50, 255, 50, 0.05)';
        }
        
        // Рисуем прямоугольную область для направляющей
        const rectW = 700;
        const rectH = 120;
        ctx.beginPath();
        ctx.roundRect(snapX - rectW/2, snapY - rectH/2, rectW, rectH, 15);
        ctx.fill();
        ctx.stroke();
        
        // Убираем эмодзи - оставляем только зелёную зону
        
        ctx.restore();
    }
    
    /**
     * 🆕 Рисует свободные грузы на canvas (не прикреплённые к оборудованию)
     */
    drawFreeWeights(ctx) {
        if (!this.state.freeWeights || this.state.freeWeights.length === 0) return;
        
        this.state.freeWeights.forEach(weight => {
            const weightDef = this.weightsInventory.find(w => w.id === weight.weightId);
            if (!weightDef) return;
            
            const img = this.weightImages ? this.weightImages[weight.weightId] : null;
            const targetSize = weightDef.targetSize || 80;
            
            ctx.save();
            
            // Подсветка при перетаскивании
            if (weight.isDragging) {
                ctx.shadowColor = 'rgba(0, 150, 255, 0.8)';
                ctx.shadowBlur = 25;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            } else {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 5;
            }
            
            // Рисуем груз
            if (img && img.complete) {
                const scale = targetSize / Math.max(img.width, img.height);
                ctx.translate(weight.x, weight.y);
                ctx.scale(scale, scale);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
            } else {
                // Fallback: плейсхолдер
                ctx.fillStyle = weightDef.color || '#CD853F';
                ctx.fillRect(weight.x - targetSize/2, weight.y - targetSize/2, targetSize, targetSize * 0.9);
                
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${weight.mass}г`, weight.x, weight.y);
            }
            
            ctx.restore();
            
            // Рисуем стопку грузов сверху
            if (weight.stackedWeights && weight.stackedWeights.length > 0) {
                let offsetY = -targetSize * 0.8;
                
                weight.stackedWeights.forEach(stackedWeight => {
                    ctx.save();
                    
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                    ctx.shadowBlur = 5;
                    
                    const stackImg = this.weightImages ? this.weightImages[stackedWeight.weightId] : null;
                    const stackDef = this.weightsInventory.find(w => w.id === stackedWeight.weightId);
                    const stackSize = stackDef?.targetSize || 70;
                    
                    if (stackImg && stackImg.complete) {
                        const scale = stackSize / Math.max(stackImg.width, stackImg.height);
                        ctx.translate(weight.x, weight.y + offsetY);
                        ctx.scale(scale, scale);
                        ctx.drawImage(stackImg, -stackImg.width / 2, -stackImg.height / 2);
                    } else {
                        ctx.fillStyle = stackDef?.color || '#CD853F';
                        ctx.fillRect(weight.x - stackSize/2, weight.y + offsetY - stackSize/2, stackSize, stackSize * 0.9);
                        
                        ctx.fillStyle = '#FFF';
                        ctx.font = 'bold 14px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(`${stackedWeight.mass}г`, weight.x, weight.y + offsetY);
                    }
                    
                    ctx.restore();
                    
                    offsetY -= stackSize * 0.75;
                });
            }
            
            // Индикатор общей массы стопки - УБРАН по запросу пользователя
            // if (weight.stackedWeights && weight.stackedWeights.length > 0) {
            //     const totalMass = weight.mass + weight.stackedWeights.reduce((sum, w) => sum + w.mass, 0);
            //     ctx.save();
            //     ctx.fillStyle = 'rgba(0, 100, 200, 0.9)';
            //     ctx.font = 'bold 12px Arial';
            //     ctx.textAlign = 'center';
            //     ctx.fillText(`Σ ${totalMass}г`, weight.x, weight.y + targetSize/2 + 15);
            //     ctx.restore();
            // }
            
            // 🆕 Рисуем snap zones при перетаскивании этого груза
            if (weight.isDragging) {
                this.drawFreeWeightSnapZones(ctx, weight);
            }
        });
    }
    
    /**
     * 🆕 Рисует snap zones для свободного груза при перетаскивании
     */
    drawFreeWeightSnapZones(ctx, draggedWeight) {
        // 1. Snap zone на брусок (если размещён)
        if (this.state.blockPlaced) {
            const blockCenterX = this.state.blockX + this.layout.block.width / 2;
            const blockCenterY = this.state.blockY + this.layout.block.height / 2;
            const distanceToBlock = Math.hypot(draggedWeight.x - blockCenterX, draggedWeight.y - blockCenterY);
            const isNearBlock = distanceToBlock < 150;
            
            ctx.save();
            if (isNearBlock) {
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(50, 255, 50, 0.3)';
            } else {
                ctx.strokeStyle = 'rgba(50, 255, 50, 0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.1)';
            }
            
            ctx.beginPath();
            ctx.arc(blockCenterX, blockCenterY - 40, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
        
        // 2. Snap zone на вертикальный динамометр (если в режиме взвешивания)
        if (this.state.dynamometerPlaced && this.state.dynamometerMode === 'vertical') {
            const hookX = 100;
            const hookY = 350;
            const distanceToHook = Math.hypot(draggedWeight.x - hookX, draggedWeight.y - hookY);
            const isNearHook = distanceToHook < 150;
            
            ctx.save();
            if (isNearHook) {
                ctx.strokeStyle = 'rgba(50, 200, 255, 1.0)';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(50, 200, 255, 0.3)';
            } else {
                ctx.strokeStyle = 'rgba(50, 200, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.fillStyle = 'rgba(50, 200, 255, 0.1)';
            }
            
            ctx.beginPath();
            ctx.arc(hookX, hookY, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
        
        // 3. Snap zones на другие свободные грузы (для соединения)
        for (const otherWeight of this.state.freeWeights) {
            if (otherWeight === draggedWeight) continue;
            
            const distance = Math.hypot(draggedWeight.x - otherWeight.x, draggedWeight.y - otherWeight.y);
            const isNear = distance < 100;
            
            ctx.save();
            if (isNear) {
                ctx.strokeStyle = 'rgba(255, 200, 50, 1.0)';
                ctx.lineWidth = 3;
                ctx.fillStyle = 'rgba(255, 200, 50, 0.3)';
            } else {
                ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.fillStyle = 'rgba(255, 200, 50, 0.05)';
            }
            
            ctx.beginPath();
            ctx.arc(otherWeight.x, otherWeight.y, 60, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    /**
     * Рисует зелёные snap zones при перетаскивании бруска:
     * 1. На направляющую (для размещения)
     * 2. На динамометр (для взвешивания)
     */
    drawBlockSnapZones(ctx) {
        const dragX = this.state.dragPosition.x;
        const dragY = this.state.dragPosition.y;
        
        // === SNAP ZONE НА НАПРАВЛЯЮЩУЮ ===
        if (this.state.surfacePlaced) {
            const surface = this.layout.surface;
            const snapX = surface.x + surface.width / 3;
            const snapY = surface.y - 30;
            
            const distance = Math.hypot(dragX - snapX, dragY - snapY);
            const snapRadius = 200;
            const isNear = distance < snapRadius;
            
            ctx.save();
            
            if (isNear) {
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(50, 255, 50, 0.25)';
            } else {
                ctx.strokeStyle = 'rgba(50, 255, 50, 0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.08)';
            }
            
            ctx.beginPath();
            ctx.arc(snapX, snapY, 45, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
        
        // === SNAP ZONE НА ДИНАМОМЕТР (если размещён в вертикальном режиме И крючок пустой) ===
        if (this.state.dynamometerPlaced && this.state.dynamometerMode === 'vertical' &&
            this.state.weighingItems.length === 0) {
            const centerX = this.state.dynamometerX || 100;
            const anchorY = this.state.dynamometerY || 60;
            const bodyY = anchorY + 40;
            const height = 300;
            const bottomHookY = bodyY + height;
            const hookCenterY = bottomHookY + 26;
            
            const distance = Math.hypot(dragX - centerX, dragY - hookCenterY);
            const snapRadius = 120;
            const isNear = distance < snapRadius;
            
            ctx.save();
            
            if (isNear) {
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(50, 255, 50, 0.25)';
            } else {
                ctx.strokeStyle = 'rgba(50, 255, 50, 0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.08)';
            }
            
            ctx.beginPath();
            ctx.arc(centerX, hookCenterY, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    /**
     * Рисует зелёные snap zones при перетаскивании груза из инвентаря:
     * 1. На брусок (для добавления груза)
     * 2. На динамометр (для взвешивания)
     * 3. На свободные грузы на canvas (для соединения)
     * 4. На пустую область canvas (для свободного размещения)
     */
    drawWeightSnapZones(ctx) {
        const dragX = this.state.dragPosition.x;
        const dragY = this.state.dragPosition.y;
        
        // === SNAP ZONE НА БРУСОК ===
        if (this.state.blockPlaced) {
            const blockX = this.state.blockX;
            const blockY = this.state.blockY;
            const blockW = this.layout.block.width;
            const blockH = this.layout.block.height;
            const snapX = blockX + blockW / 2;
            const snapY = blockY - 20; // Над бруском
            
            const distance = Math.hypot(dragX - snapX, dragY - snapY);
            const snapRadius = 150;
            const isNear = distance < snapRadius;
            
            ctx.save();
            
            if (isNear) {
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(50, 255, 50, 0.25)';
            } else {
                ctx.strokeStyle = 'rgba(50, 255, 50, 0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.08)';
            }
            
            ctx.beginPath();
            ctx.arc(snapX, snapY, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
        
        // === SNAP ZONE НА ДИНАМОМЕТР (если в вертикальном режиме) ===
        // Разрешаем добавление нескольких грузов на динамометр
        if (this.state.dynamometerPlaced && this.state.dynamometerMode === 'vertical') {
            const centerX = this.state.dynamometerX || 100;
            const anchorY = this.state.dynamometerY || 60;
            const bodyY = anchorY + 40;
            const height = 300;
            const bottomHookY = bodyY + height;
            const hookCenterY = bottomHookY + 26;
            
            const distance = Math.hypot(dragX - centerX, dragY - hookCenterY);
            const snapRadius = 120;
            const isNear = distance < snapRadius;
            
            ctx.save();
            
            if (isNear) {
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(50, 255, 50, 0.25)';
            } else {
                ctx.strokeStyle = 'rgba(50, 255, 50, 0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.08)';
            }
            
            ctx.beginPath();
            ctx.arc(centerX, hookCenterY, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
        
        // === 🆕 SNAP ZONES НА СВОБОДНЫЕ ГРУЗЫ (для соединения в стопку) ===
        if (this.state.freeWeights && this.state.freeWeights.length > 0) {
            for (const freeWeight of this.state.freeWeights) {
                const distance = Math.hypot(dragX - freeWeight.x, dragY - freeWeight.y);
                const isNear = distance < 100;
                
                ctx.save();
                if (isNear) {
                    ctx.strokeStyle = 'rgba(255, 200, 50, 1.0)';
                    ctx.lineWidth = 3;
                    ctx.fillStyle = 'rgba(255, 200, 50, 0.3)';
                } else {
                    ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                    ctx.fillStyle = 'rgba(255, 200, 50, 0.05)';
                }
                
                ctx.beginPath();
                ctx.arc(freeWeight.x, freeWeight.y, 60, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                ctx.restore();
            }
        }
        
        // === 🆕 SNAP ZONE ДЛЯ СВОБОДНОГО РАЗМЕЩЕНИЯ НА CANVAS ===
        // Показываем зону для размещения груза на пустую область справа
        const freeZoneX = 800;
        const freeZoneY = 450;
        const distanceToFreeZone = Math.hypot(dragX - freeZoneX, dragY - freeZoneY);
        const isNearFreeZone = distanceToFreeZone < 200;
        
        // Не показываем если рядом с бруском, динамометром или свободными грузами
        const nearOtherTarget = (this.state.blockPlaced && Math.hypot(dragX - (this.state.blockX + 100), dragY - this.state.blockY) < 150) ||
            (this.state.dynamometerPlaced && this.state.dynamometerMode === 'vertical') ||
            (this.state.freeWeights?.some(fw => Math.hypot(dragX - fw.x, dragY - fw.y) < 100));
        
        if (!nearOtherTarget) {
            ctx.save();
            if (isNearFreeZone) {
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.fillStyle = 'rgba(100, 200, 255, 0.15)';
            } else {
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([10, 8]);
                ctx.fillStyle = 'rgba(100, 200, 255, 0.03)';
            }
            
            ctx.beginPath();
            ctx.arc(freeZoneX, freeZoneY, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Подпись
            ctx.fillStyle = isNearFreeZone ? 'rgba(100, 200, 255, 0.9)' : 'rgba(100, 200, 255, 0.4)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('На стол', freeZoneX, freeZoneY + 100);
            
            ctx.restore();
        }
    }
    
    /**
     * Рисует зелёные snap zones при перетаскивании динамометра:
     * 1. На брусок (горизонтальный режим - для измерения трения)
     * 2. Свободная область (вертикальный режим - для взвешивания)
     */
    drawDynamometerSnapZones(ctx) {
        const dragX = this.state.dragPosition.x;
        const dragY = this.state.dragPosition.y;
        
        // === SNAP ZONE НА БРУСОК (для горизонтального режима) ===
        if (this.state.blockPlaced && this.state.surfacePlaced) {
            const blockRight = this.state.blockX + this.layout.block.width;
            const blockCenterY = this.state.blockY + this.layout.block.height / 2;
            const snapX = blockRight + 60;
            const snapY = blockCenterY;
            
            const distance = Math.hypot(dragX - snapX, dragY - snapY);
            const snapRadius = 150;
            const isNear = distance < snapRadius;
            
            ctx.save();
            
            if (isNear) {
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(50, 255, 50, 0.25)';
            } else {
                ctx.strokeStyle = 'rgba(50, 255, 50, 0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.08)';
            }
            
            ctx.beginPath();
            ctx.arc(snapX, snapY, 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
        
        // === SNAP ZONE ДЛЯ ВЕРТИКАЛЬНОГО РЕЖИМА (взвешивание) ===
        // Показываем зону слева для вертикального динамометра - доступна всегда
        {
            const snapX = 120;
            const snapY = 200;
            
            const distance = Math.hypot(dragX - snapX, dragY - snapY);
            const snapRadius = 180;
            const isNear = distance < snapRadius && dragX < 280; // Только если слева
            
            ctx.save();
            
            if (isNear) {
                ctx.strokeStyle = 'rgba(100, 200, 255, 1.0)';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(100, 200, 255, 0.25)';
            } else {
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.fillStyle = 'rgba(100, 200, 255, 0.08)';
            }
            
            ctx.beginPath();
            ctx.arc(snapX, snapY, 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    drawPlacementHint(ctx, title, subtitle) {
        const w = VISUAL_CONFIG.canvasWidth;
        const h = VISUAL_CONFIG.canvasHeight;
        
        // Анимированная пульсация
        const time = Date.now() / 1000;
        const pulse = 0.8 + 0.2 * Math.sin(time * 2);
        
        // Текст подсказки
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#666';
        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, w / 2, h / 2 - 20);
        
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText(subtitle, w / 2, h / 2 + 20);
        ctx.restore();
        
        // Стрелка указывающая направо
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#00A86B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w / 2 + 200, h / 2);
        ctx.lineTo(w / 2 + 250, h / 2);
        ctx.lineTo(w / 2 + 240, h / 2 - 10);
        ctx.moveTo(w / 2 + 250, h / 2);
        ctx.lineTo(w / 2 + 240, h / 2 + 10);
        ctx.stroke();
        ctx.restore();
    }
    
    drawBlock(ctx) {
        const x = this.state.blockX;
        const y = this.state.blockY;
        const blockW = this.layout.block.width;
        const blockH = this.layout.block.height;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(x + 6, y + 6, blockW, blockH, 4);
        ctx.fill();
        
        // Block body gradient
        const gradient = ctx.createLinearGradient(x, y, x + blockW, y + blockH);
        gradient.addColorStop(0, '#DEB887');
        gradient.addColorStop(0.3, '#D2B48C');
        gradient.addColorStop(0.7, '#C4A574');
        gradient.addColorStop(1, '#8B7355');
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.roundRect(x, y, blockW, blockH, 4);
        ctx.fill();
        
        // Wood grain texture
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < blockW; i += 15) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.bezierCurveTo(
                x + i + 3, y + blockH / 3,
                x + i - 3, y + blockH * 2 / 3,
                x + i, y + blockH
            );
            ctx.stroke();
        }
        
        // Block border
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x, y, blockW, blockH, 4);
        ctx.stroke();
        
        // Top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x + 5, y + 5, blockW - 10, 8);
        
        // === 3 ОТВЕРСТИЯ ДЛЯ ГРУЗОВ (СВЕРХУ) ===
        const holeSpacing = blockW / 4;
        const holeRadius = 12;
        
        for (let i = 0; i < 3; i++) {
            const holeX = x + holeSpacing * (i + 1);
            const holeY = y; // На верхней грани бруска
            
            // Тёмная дыра (глубина) - полукруг сверху
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(holeX, holeY, holeRadius, 0, Math.PI); // Только нижняя половина
            ctx.fill();
            
            // Обводка отверстия
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(holeX, holeY, holeRadius, 0, Math.PI);
            ctx.stroke();
        }
        
        // Hook on right side
        const hookX = x + blockW + 5;
        const hookY = y + blockH / 2;
        
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(hookX, hookY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner hook circle
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(hookX, hookY, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Оптимизированный метод отрисовки бруска с кешированием
    drawBlockOptimized(ctx) {
        const blockW = this.layout.block.width;
        const blockH = this.layout.block.height;
        const padding = 20; // Для тени и крючка
        
        // Проверяем, нужно ли обновить кеш
        if (this.blockCache.needsUpdate || this.blockCache.lastMass !== this.state.blockMass) {
            // Настраиваем offscreen canvas
            this.blockCache.canvas.width = blockW + padding * 2;
            this.blockCache.canvas.height = blockH + padding * 2;
            
            const offCtx = this.blockCache.ctx;
            offCtx.clearRect(0, 0, this.blockCache.canvas.width, this.blockCache.canvas.height);
            
            // Сохраняем оригинальные позиции
            const origX = this.state.blockX;
            const origY = this.state.blockY;
            
            // Временно устанавливаем позицию для рисования в кеш
            this.state.blockX = padding - 10; // Смещение для тени
            this.state.blockY = padding;
            
            // Рисуем брусок в offscreen canvas
            this.drawBlock(offCtx);
            
            // Восстанавливаем позиции
            this.state.blockX = origX;
            this.state.blockY = origY;
            
            this.blockCache.needsUpdate = false;
            this.blockCache.lastMass = this.state.blockMass;
        }
        
        // Рисуем из кеша
        ctx.drawImage(
            this.blockCache.canvas, 
            this.state.blockX - (padding - 10), 
            this.state.blockY - padding
        );
    }
    
    drawWeightsOnBlock(ctx) {
        const x = this.state.blockX;
        const y = this.state.blockY;
        const blockW = this.layout.block.width;
        const blockH = this.layout.block.height;
        const holeSpacing = blockW / 4;
        const holeRadius = 12;
        
        // Рисуем грузы - ПОЛОВИНА ТОРЧИТ СВЕРХУ
        this.state.weightsOnBlock.forEach((weightData, index) => {
            if (index >= 3) return; // Максимум 3 груза
            
            // Центр отверстия (сверху бруска)
            const holeX = x + holeSpacing * (index + 1);
            const holeY = y; // На верхней грани
            
            // Размер груза
            const weightRadius = holeRadius + 2; // Чуть больше отверстия
            const weightHeight = 35; // Высота груза
            
            ctx.save();
            
            // === НИЖНЯЯ ЧАСТЬ (в бруске - скрыта) ===
            // Не рисуем - она внутри бруска
            
            // === ВЕРХНЯЯ ЧАСТЬ (торчит наружу - половина) ===
            // Тень от груза
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(holeX + 3, holeY - weightHeight/2 + 5, weightRadius, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Цилиндр груза (верхняя половина)
            const cylinderGradient = ctx.createLinearGradient(holeX - weightRadius, 0, holeX + weightRadius, 0);
            cylinderGradient.addColorStop(0, '#8B7355');
            cylinderGradient.addColorStop(0.2, '#C4A86C');
            cylinderGradient.addColorStop(0.5, '#D4C4A8');
            cylinderGradient.addColorStop(0.8, '#C4A86C');
            cylinderGradient.addColorStop(1, '#8B7355');
            
            ctx.fillStyle = cylinderGradient;
            ctx.beginPath();
            // Прямоугольник тела
            ctx.rect(holeX - weightRadius, holeY - weightHeight/2, weightRadius * 2, weightHeight/2);
            ctx.fill();
            
            // Верхняя крышка (эллипс)
            const topGradient = ctx.createRadialGradient(holeX - 3, holeY - weightHeight/2 - 2, 0, holeX, holeY - weightHeight/2, weightRadius);
            topGradient.addColorStop(0, '#E8E0D0');
            topGradient.addColorStop(0.5, '#D4C4A8');
            topGradient.addColorStop(1, '#A08060');
            
            ctx.fillStyle = topGradient;
            ctx.beginPath();
            ctx.ellipse(holeX, holeY - weightHeight/2, weightRadius, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Обводка верхней крышки
            ctx.strokeStyle = '#6B5344';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Нижний эллипс (на уровне бруска)
            ctx.fillStyle = cylinderGradient;
            ctx.beginPath();
            ctx.ellipse(holeX, holeY, weightRadius, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#6B5344';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Блик на цилиндре
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(holeX - weightRadius + 3, holeY - weightHeight/2 + 3, 4, weightHeight/2 - 6);
            
            // Крючок сверху
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(holeX, holeY - weightHeight/2);
            ctx.lineTo(holeX, holeY - weightHeight/2 - 8);
            ctx.stroke();
            
            // Петля крючка
            ctx.beginPath();
            ctx.arc(holeX, holeY - weightHeight/2 - 11, 3, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
        });
    }
    
    drawVerticalDynamometer(ctx) {
        // Позиция динамометра - динамическая (можно перетаскивать)
        const centerX = this.state.dynamometerX || 100;
        const anchorY = this.state.dynamometerY || 60;
        
        const dynamometer = this.state.activeDynamometer;
        const maxForce = dynamometer === 'dynamometer1' ? 1 : 5;
        const scale = dynamometer === 'dynamometer1' ? 0.1 : 0.1;
        
        // Размеры динамометра (как в spring эксперименте)
        const width = 80;
        const height = 300;
        const scaleHeight = 200;
        
        // Вычисляем силу от подвешенных предметов
        const totalMass = this.state.weighingTotalMass;
        const force = (totalMass / 1000) * PHYSICS_CONFIG.gravity;
        
        ctx.save();
        
        // === ЗЕЛЁНАЯ SNAP ZONE К БРУСКУ (при перетаскивании динамометра) ===
        if (this.state.isDraggingDynamometer && this.state.blockPlaced && this.state.surfacePlaced) {
            const blockRight = this.state.blockX + this.layout.block.width;
            const blockCenterY = this.state.blockY + this.layout.block.height / 2;
            const snapX = blockRight + 30; // Рядом с правым краем бруска
            const snapY = blockCenterY;
            
            // Расстояние от центра динамометра до snap точки
            const distance = Math.hypot(centerX - snapX, anchorY + 200 - snapY);
            
            const snapRadius = 200; // Увеличенный радиус срабатывания
            const isNear = distance < snapRadius;
            
            ctx.save();
            
            if (isNear) {
                // Близко - яркая зелёная зона
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(50, 255, 50, 0.25)';
            } else {
                // Далеко - пунктирная зелёная зона
                ctx.strokeStyle = 'rgba(50, 255, 50, 0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.08)';
            }
            
            // Рисуем зону у бруска
            ctx.beginPath();
            ctx.arc(snapX, snapY, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
        
        // === ШТАТИВ (верхнее крепление) ===
        // Горизонтальная перекладина
        ctx.fillStyle = '#505050';
        ctx.fillRect(centerX - 60, anchorY - 15, 120, 12);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 60, anchorY - 15, 120, 12);
        
        // Вертикальная стойка слева
        ctx.fillStyle = '#606060';
        ctx.fillRect(centerX - 60, anchorY - 15, 12, 550);
        ctx.strokeRect(centerX - 60, anchorY - 15, 12, 550);
        
        // === КРЮЧОК СВЕРХУ ===
        const topHookY = anchorY + 5;
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(centerX, anchorY);
        ctx.lineTo(centerX, topHookY + 10);
        ctx.stroke();
        
        // Кольцо крючка
        ctx.beginPath();
        ctx.arc(centerX, topHookY + 18, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // === КОРПУС ДИНАМОМЕТРА ===
        const bodyY = topHookY + 35;
        const gradient = ctx.createLinearGradient(centerX - width/2, bodyY, centerX + width/2, bodyY);
        gradient.addColorStop(0, 'rgba(220, 220, 220, 0.98)');
        gradient.addColorStop(0.5, 'rgba(245, 245, 245, 0.98)');
        gradient.addColorStop(1, 'rgba(220, 220, 220, 0.98)');
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - width/2, bodyY, width, height);
        
        // Рамка корпуса
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - width/2, bodyY, width, height);
        
        // === НАЗВАНИЕ ПРИБОРА ===
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dynamometer === 'dynamometer1' ? 'Динамометр 1Н' : 'Динамометр 5Н', centerX, bodyY + 20);
        
        // === ШКАЛА ===
        const scaleTop = bodyY + 40;
        const scaleX = centerX;
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 1.5;
        
        // Фон шкалы
        ctx.fillStyle = '#FFFEF0';
        ctx.fillRect(centerX - 25, scaleTop, 50, scaleHeight);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - 25, scaleTop, 50, scaleHeight);
        
        // Вертикальная линия шкалы
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.moveTo(scaleX, scaleTop + 5);
        ctx.lineTo(scaleX, scaleTop + scaleHeight - 5);
        ctx.stroke();
        
        // Деления шкалы
        const numDivisions = maxForce === 1 ? 10 : 5; // 0.1Н или 1Н деления
        const labelDivisions = maxForce === 1 ? 2 : 1; // Подписи каждые 0.2Н или 1Н
        
        for (let i = 0; i <= numDivisions; i++) {
            const markForce = (i / numDivisions) * maxForce;
            const markY = scaleTop + 5 + ((numDivisions - i) / numDivisions) * (scaleHeight - 10);
            const isMajor = (i % labelDivisions === 0);
            
            // Деления
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(scaleX - (isMajor ? 15 : 8), markY);
            ctx.lineTo(scaleX + (isMajor ? 15 : 8), markY);
            ctx.lineWidth = isMajor ? 1.5 : 1;
            ctx.stroke();
            
            // Цифры
            if (isMajor) {
                ctx.fillStyle = '#333';
                ctx.font = '10px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(markForce.toFixed(maxForce === 1 ? 1 : 0), scaleX - 18, markY + 3);
            }
        }
        
        // Единица измерения
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Н', scaleX + 30, scaleTop);
        
        // === УКАЗАТЕЛЬ (СТРЕЛКА) ===
        const clampedForce = Math.min(force, maxForce);
        const indicatorY = scaleTop + 5 + ((maxForce - clampedForce) / maxForce) * (scaleHeight - 10);
        
        // Красная стрелка
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.moveTo(scaleX + 18, indicatorY);
        ctx.lineTo(scaleX + 28, indicatorY - 6);
        ctx.lineTo(scaleX + 28, indicatorY + 6);
        ctx.closePath();
        ctx.fill();
        
        // Линия от шкалы до стрелки
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(scaleX + 15, indicatorY);
        ctx.lineTo(scaleX + 28, indicatorY);
        ctx.stroke();
        
        // === ЦИФРОВОЕ ТАБЛО ===
        ctx.fillStyle = 'rgba(255, 0, 0, 1)';
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.textAlign = 'center';
        const displayText = force > maxForce ? `>${maxForce.toFixed(1)}` : force.toFixed(2);
        ctx.fillText(`${displayText} Н`, centerX, bodyY + height - 15);
        
        // === НИЖНИЙ КРЮЧОК ДЛЯ ГРУЗОВ ===
        const bottomHookY = bodyY + height;
        
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // Вертикальная часть
        ctx.beginPath();
        ctx.moveTo(centerX, bottomHookY);
        ctx.lineTo(centerX, bottomHookY + 18);
        ctx.stroke();
        
        // Кольцо для подвешивания груза
        ctx.beginPath();
        ctx.arc(centerX, bottomHookY + 26, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // === ПОДВЕШЕННЫЕ ГРУЗЫ ===
        const hookX = centerX;
        const gruzHookY = bottomHookY + 38;
        
        if (this.state.weighingItems.length > 0) {
            this.drawWeighingItems(ctx, hookX, gruzHookY);
            // Кнопки "Записать N" и подсказки убраны - взвешивание интуитивно понятно
        }
        
        // Зона для drop грузов (невидимая, для подсветки)
        // Сохраняем область для проверки в handleCanvasDrop
        this.weighingDropZone = {
            x: centerX - 50,
            y: bottomHookY,
            width: 100,
            height: 150
        };
        
        // === ЗЕЛЁНАЯ ЗОНА СЦЕПЛЕНИЯ (при перетаскивании груза или бруска) ===
        // 🆕 Показываем зелёную зону ТОЛЬКО если:
        // 1. Идёт перетаскивание (isDragging)
        // 2. Есть позиция (dragPosition) 
        // 3. Тащим груз или брусок
        // 4. На крючке ещё ничего нет (weighingItems пуст)
        const canShowSnapZone = this.state.isDragging && 
                                 this.state.dragPosition && 
                                 this.state.weighingItems.length === 0 &&
                                 (this.state.draggingItemType === 'weight' || this.state.draggingItemType === 'block');
        
        if (canShowSnapZone) {
            
            const hookCenterX = centerX;
            const hookCenterY = bottomHookY + 26; // Центр кольца крючка
            
            // Вычисляем расстояние от перетаскиваемого предмета до крючка
            const dragX = this.state.dragPosition.x;
            const dragY = this.state.dragPosition.y;
            const distance = Math.hypot(dragX - hookCenterX, dragY - hookCenterY);
            
            const snapRadius = 120; // Радиус зоны сцепления
            const isNearHook = distance < snapRadius;
            
            ctx.save();
            
            if (isNearHook) {
                // Близко - яркая зелёная зона (snap feedback)
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 5;
                ctx.setLineDash([]); // Сплошная линия
                ctx.fillStyle = 'rgba(50, 255, 50, 0.25)';
                
                // Иконка якоря
                ctx.font = '36px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.fillText('⚓', hookCenterX, hookCenterY);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.25)';
            } else {
                // Далеко - пунктирная слабая зона
                ctx.strokeStyle = 'rgba(0, 255, 100, 0.6)';
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 4]);
                ctx.fillStyle = 'rgba(0, 255, 100, 0.08)';
            }
            
            // Зелёный круг вокруг крючка
            ctx.beginPath();
            ctx.arc(hookCenterX, hookCenterY, snapRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
            
            // Подпись что можно повесить
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(0, 255, 100, 0.9)';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            const itemName = this.state.draggingItemType === 'block' ? 'брусок' : 'груз';
            ctx.fillText(`Повесить ${itemName}`, hookCenterX, hookCenterY + snapRadius + 20);
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    drawAttachButton(ctx, x, y) {
        const btnW = 80;
        const btnH = 26;
        
        // Сохраняем область для клика
        this.attachButtonArea = {
            x: x - btnW/2,
            y: y,
            width: btnW,
            height: btnH
        };
        
        // Кнопка
        ctx.fillStyle = 'rgba(66, 153, 225, 0.9)';
        ctx.beginPath();
        ctx.roundRect(x - btnW/2, y, btnW, btnH, 6);
        ctx.fill();
        
        ctx.strokeStyle = '#63B3ED';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Текст
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('→ К бруску', x, y + btnH/2);
    }
    
    drawWeighingItems(ctx, centerX, top) {
        let y = top;
        const now = performance.now() / 1000;
        
        // Сохраняем области грузов для клика (снятие с динамометра)
        this.weighingItemAreas = [];
        
        this.state.weighingItems.forEach((item, idx) => {
            // Лёгкое покачивание
            const rotation = Math.sin(now * 1.2 + idx * 0.5) * 0.03;
            
            // Соединительный крючок (нить между грузами)
            if (idx > 0) {
                ctx.strokeStyle = 'rgba(150, 150, 150, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX, y - 8);
                ctx.lineTo(centerX, y);
                ctx.stroke();
            }
            
            if (item.type === 'block') {
                // Брусок (миниатюра)
                const blockW = 70;
                const blockH = 40;
                
                ctx.save();
                ctx.translate(centerX, y + blockH/2);
                ctx.rotate(rotation);
                
                // Тень
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 5;
                
                const gradient = ctx.createLinearGradient(-blockW/2, -blockH/2, blockW/2, blockH/2);
                gradient.addColorStop(0, '#DEB887');
                gradient.addColorStop(0.5, '#D2B48C');
                gradient.addColorStop(1, '#8B7355');
                ctx.fillStyle = gradient;
                
                ctx.beginPath();
                ctx.roundRect(-blockW/2, -blockH/2, blockW, blockH, 4);
                ctx.fill();
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Текстура дерева
                ctx.strokeStyle = 'rgba(139, 69, 19, 0.2)';
                ctx.lineWidth = 1;
                for (let i = -blockW/2 + 5; i < blockW/2; i += 10) {
                    ctx.beginPath();
                    ctx.moveTo(i, -blockH/2);
                    ctx.lineTo(i + 2, blockH/2);
                    ctx.stroke();
                }
                
                ctx.restore();
                
                // Сохраняем область для клика (снятие груза)
                this.weighingItemAreas.push({
                    type: 'block',
                    x: centerX - blockW/2,
                    y: y,
                    width: blockW,
                    height: blockH,
                    index: idx
                });
                
                y += blockH + 10;
                
            } else if (item.type === 'weight') {
                // Груз (реалистичный цилиндр как в spring)
                const weightW = 40;
                const weightH = 35;
                
                ctx.save();
                ctx.translate(centerX, y + weightH/2);
                ctx.rotate(rotation);
                
                // Тень
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 5;
                
                // Используем изображение если есть
                const img = this.weightImages[item.id];
                if (img) {
                    const scale = weightW / Math.max(img.width, img.height);
                    ctx.scale(scale, scale);
                    ctx.drawImage(img, -img.width/2, -img.height/2);
                } else {
                    // Fallback - нарисованный груз
                    const grd = ctx.createLinearGradient(-weightW/2, 0, weightW/2, 0);
                    grd.addColorStop(0, '#8B7355');
                    grd.addColorStop(0.2, '#C4A86C');
                    grd.addColorStop(0.5, '#D4C4A8');
                    grd.addColorStop(0.8, '#C4A86C');
                    grd.addColorStop(1, '#8B7355');
                    ctx.fillStyle = grd;
                    
                    // Цилиндр
                    ctx.beginPath();
                    ctx.roundRect(-weightW/2, -weightH/2, weightW, weightH, 5);
                    ctx.fill();
                    ctx.strokeStyle = '#5D4037';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Верхний эллипс
                    const topGrad = ctx.createRadialGradient(0, -weightH/2, 0, 0, -weightH/2, weightW/2);
                    topGrad.addColorStop(0, '#E8E0D0');
                    topGrad.addColorStop(1, '#A08060');
                    ctx.fillStyle = topGrad;
                    ctx.beginPath();
                    ctx.ellipse(0, -weightH/2, weightW/2, 8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    // Блик
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(-weightW/2 + 5, -weightH/2 + 5, 5, weightH - 10);
                }
                
                ctx.restore();
                
                // Сохраняем область для клика (снятие груза)
                this.weighingItemAreas.push({
                    type: 'weight',
                    id: item.id,
                    x: centerX - weightW/2,
                    y: y,
                    width: weightW,
                    height: weightH,
                    index: idx
                });
                
                y += weightH + 8;
            }
        });
        
        // Надписи массы убраны - показание на шкале динамометра достаточно
    }
    
    drawRecordButton(ctx, x, y) {
        const btnW = 90;
        const btnH = 28;
        
        // Сохраняем область для клика
        this.recordButtonArea = {
            x: x - btnW/2,
            y: y,
            width: btnW,
            height: btnH
        };
        
        // Кнопка
        ctx.fillStyle = 'rgba(0, 168, 107, 0.9)';
        ctx.beginPath();
        ctx.roundRect(x - btnW/2, y, btnW, btnH, 6);
        ctx.fill();
        
        ctx.strokeStyle = '#00cc7a';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Текст
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Записать N', x, y + btnH/2);
    }
    
    drawDynamometer(ctx) {
        const blockRight = this.state.blockX + this.layout.block.width;
        const y = this.state.blockY + this.layout.block.height / 2;
        
        // === Определяем maxForce в зависимости от активного динамометра ===
        const maxForce = this.state.activeDynamometer === 'dynamometer1' ? 1 : 5;
        
        // === КОНСТАНТЫ (должны совпадать с handlePullMove!) ===
        const BODY_LENGTH = 130;
        const HANDLE_WIDTH = 55;
        const SPRING_K = 0.025; // Должно совпадать с handlePullMove!
        
        // Крюк прикреплён к бруску
        const hookX = blockRight + 15;
        
        // Позиция ручки
        const handleX = this.state.handleX || this.getHandleRestX();
        
        // Корпус заканчивается у ручки
        const bodyEndX = handleX;
        const bodyStartX = bodyEndX - BODY_LENGTH;
        
        // Растяжение пружины
        const springExtension = Math.max(0, bodyStartX - hookX);
        
        // 1. КРЮК (прикреплён к бруску)
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(blockRight, y);
        ctx.lineTo(hookX, y);
        ctx.stroke();
        
        // Петля крюка
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hookX, y + 6, 6, -Math.PI/2, Math.PI/2, false);
        ctx.stroke();
        
        // 2. ПРУЖИНА (между крюком и корпусом)
        const springStartX = hookX + 6;
        const springEndX = bodyStartX - 3;
        const springW = springEndX - springStartX;
        
        if (springW > 10) {
            ctx.strokeStyle = '#777';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const coils = 12;
            const amplitude = 5 + springExtension * 0.03;
            
            ctx.moveTo(springStartX, y);
            for (let i = 0; i <= coils; i++) {
                const cx = springStartX + (springW * i / coils);
                const cy = y + (i % 2 === 0 ? amplitude : -amplitude);
                if (i === 0 || i === coils) {
                    ctx.lineTo(cx, y);
                } else {
                    ctx.lineTo(cx, cy);
                }
            }
            ctx.stroke();
        }
        
        // 3. КОРПУС ДИНАМОМЕТРА
        const bodyH = 36;
        
        // Корпус - градиент
        const bodyGradient = ctx.createLinearGradient(bodyStartX, y - bodyH/2, bodyStartX, y + bodyH/2);
        bodyGradient.addColorStop(0, '#F0F0F0');
        bodyGradient.addColorStop(0.3, '#FFFFFF');
        bodyGradient.addColorStop(0.7, '#E8E8E8');
        bodyGradient.addColorStop(1, '#D0D0D0');
        ctx.fillStyle = bodyGradient;
        
        ctx.beginPath();
        ctx.roundRect(bodyStartX, y - bodyH/2, BODY_LENGTH, bodyH, 6);
        ctx.fill();
        
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 4. ШКАЛА (на корпусе, 0-5 Н)
        const scaleX = bodyStartX + 20;
        const scaleW = 85;
        const scaleH = 22;
        
        // Белый фон шкалы
        ctx.fillStyle = '#FFFEF0';
        ctx.fillRect(scaleX, y - scaleH/2, scaleW, scaleH);
        ctx.strokeStyle = '#AAA';
        ctx.lineWidth = 1;
        ctx.strokeRect(scaleX, y - scaleH/2, scaleW, scaleH);
        
        // Деления шкалы (0-maxForce Н)
        ctx.strokeStyle = '#333';
        ctx.fillStyle = '#333';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        
        const scaleStep = scaleW / maxForce; // пикселей на 1 Н
        
        // Для 1Н динамометра - рисуем деления 0, 0.2, 0.4, 0.6, 0.8, 1
        // Для 5Н динамометра - рисуем деления 0, 1, 2, 3, 4, 5
        const divisions = maxForce === 1 ? 10 : 5;
        const labelStep = maxForce === 1 ? 2 : 1; // Подписывать каждое n-ое деление
        
        for (let n = 0; n <= divisions; n++) {
            const markX = scaleX + n * (scaleW / divisions);
            const value = (n / divisions) * maxForce;
            
            // Высота деления: большие для целых/основных значений, маленькие для промежуточных
            const isMajor = (n % labelStep === 0);
            const markHeight = isMajor ? 7 : 4;
            
            ctx.beginPath();
            ctx.moveTo(markX, y - scaleH/2 + 2);
            ctx.lineTo(markX, y - scaleH/2 + 2 + markHeight);
            ctx.lineWidth = isMajor ? 1.5 : 1;
            ctx.stroke();
            
            // Подписи только для основных делений
            if (isMajor) {
                const label = maxForce === 1 ? value.toFixed(1) : value.toFixed(0);
                ctx.fillText(label, markX, y + scaleH/2 - 3);
            }
        }
        
        // 5. УКАЗАТЕЛЬ СИЛЫ (красная линия)
        // Положение: сила * (пикселей на Н) / maxForce
        const pointerX = scaleX + (this.state.pullingForce / maxForce) * scaleW;
        
        // Ограничение указателя в пределах шкалы
        const clampedPointerX = Math.max(scaleX, Math.min(scaleX + scaleW, pointerX));
        
        // Треугольник сверху
        ctx.fillStyle = '#E53E3E';
        ctx.beginPath();
        ctx.moveTo(clampedPointerX, y - scaleH/2 - 3);
        ctx.lineTo(clampedPointerX - 4, y - scaleH/2 + 5);
        ctx.lineTo(clampedPointerX + 4, y - scaleH/2 + 5);
        ctx.closePath();
        ctx.fill();
        
        // Вертикальная линия
        ctx.strokeStyle = '#E53E3E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(clampedPointerX, y - scaleH/2 + 5);
        ctx.lineTo(clampedPointerX, y + scaleH/2 - 5);
        ctx.stroke();
        
        // 6. РУЧКА (за которую тянем)
        const handleH = 46;
        
        const handleColor = this.state.isPulling ? '#2B6CB0' : '#4299E1';
        const handleGradient = ctx.createLinearGradient(handleX, y - handleH/2, handleX + HANDLE_WIDTH, y);
        handleGradient.addColorStop(0, handleColor);
        handleGradient.addColorStop(0.5, this.state.isPulling ? '#3182CE' : '#63B3ED');
        handleGradient.addColorStop(1, '#2C5282');
        ctx.fillStyle = handleGradient;
        
        ctx.beginPath();
        ctx.roundRect(handleX, y - handleH/2, HANDLE_WIDTH, handleH, 8);
        ctx.fill();
        
        ctx.strokeStyle = '#1A365D';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Рифление на ручке
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(handleX + 10 + i * 12, y - 14);
            ctx.lineTo(handleX + 10 + i * 12, y + 14);
            ctx.stroke();
        }
        
        // Надпись "N Н" на корпусе (N = 1 или 5)
        ctx.fillStyle = '#555';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${maxForce} Н`, bodyEndX - 10, y - bodyH/2 + 11);
    }
    
    drawPullHint(ctx) {
        const handleArea = this.getDynamometerHandleArea();
        const centerX = handleArea.x + handleArea.width / 2;
        const centerY = handleArea.y - 30;
        
        // Animated hint
        const time = Date.now() / 500;
        const offset = Math.sin(time) * 8;
        
        // Фон для текста
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(centerX - 50 + offset, centerY - 12, 100, 24, 5);
        ctx.fill();
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 13px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('→ Тяни сюда →', centerX + offset, centerY + 4);
    }
    
    drawForceVectors(ctx) {
        const blockCenterX = this.state.blockX + this.layout.block.width / 2;
        const blockCenterY = this.state.blockY + this.layout.block.height / 2;
        const blockRight = this.state.blockX + this.layout.block.width;
        const blockLeft = this.state.blockX;
        const blockTop = this.state.blockY - 10;
        
        // Applied force (right, blue) - только если тянем
        if (this.state.pullingForce > 0.1) {
            const forceLen = Math.min(this.state.pullingForce * 20, 80);
            this.drawArrow(ctx, blockRight + 5, blockTop, blockRight + 5 + forceLen, blockTop, '#3182CE', 'F');
        }
        
        // Friction force (left, red) - противодействие
        if (this.state.currentFrictionForce > 0.1) {
            const frictionLen = Math.min(this.state.currentFrictionForce * 20, 80);
            this.drawArrow(ctx, blockLeft, blockTop, blockLeft - frictionLen, blockTop, '#E53E3E', 'Fтр');
        }
    }
    
    drawArrow(ctx, fromX, fromY, toX, toY, color, label) {
        const headLen = 12;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // Line
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX - headLen * Math.cos(angle), toY - headLen * Math.sin(angle));
        ctx.stroke();
        
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        
        // Label
        if (label) {
            ctx.font = 'bold 14px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, (fromX + toX) / 2, fromY - 15);
        }
    }
    
    // ==================== ANIMATION LOOP ====================
    
    startAnimationLoop() {
        const animate = (timestamp) => {
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;
            
            // 🚀 ОПТИМИЗАЦИЯ: Перерисовываем только при реальных изменениях
            // 🆕 isDragging нужен для отображения зелёных snap zones!
            const needsAnimation = this._needsRedraw || 
                                   this.state.isPulling || 
                                   this.state.isSliding ||
                                   this.state.isDraggingBlock ||
                                   this.state.isDraggingDynamometer ||
                                   this.state.draggingFreeWeight ||
                                   this.state.isDragging; // ✅ Для snap zones при drag из панели
            
            if (needsAnimation) {
                this.drawDynamic();
                this._needsRedraw = false;
            }
            
            // Update particles
            if (this.particles) {
                this.particles.update();
            }
            
            // 🔧 FIX: Draw magnifier on UI canvas
            if (this.magnifier && this.contexts.ui) {
                // Clear UI canvas
                this.contexts.ui.clearRect(0, 0, this.canvases.ui.width, this.canvases.ui.height);
                // Draw magnifier
                this.magnifier.draw();
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    // ==================== MEASUREMENTS ====================
    
    updateMeasurementDisplay() {
        const massG = this.state.blockMass;
        const massKg = massG / 1000;
        const normalForce = massKg * PHYSICS_CONFIG.gravity;
        
        const totalMassEl = document.getElementById('total-mass');
        const normalForceEl = document.getElementById('normal-force');
        const frictionForceEl = document.getElementById('friction-force');
        const motionStateEl = document.getElementById('motion-state');
        
        if (totalMassEl) totalMassEl.textContent = `${massG} г`;
        if (normalForceEl) normalForceEl.textContent = `${normalForce.toFixed(2)} Н`;
        
        if (this.state.isPulling) {
            // Показываем ту же силу что и на динамометре (pullingForce уже имеет шум если надо)
            const displayForce = this.state.pullingForce;
            
            if (frictionForceEl) frictionForceEl.textContent = `${displayForce.toFixed(2)} Н`;
            if (motionStateEl) {
                motionStateEl.innerHTML = this.state.isSliding 
                    ? '<span style="color: #FC8181;">● Скольжение</span>' 
                    : '<span style="color: #68D391;">● Покой</span>';
            }
        } else {
            if (frictionForceEl) frictionForceEl.textContent = '— Н';
            if (motionStateEl) motionStateEl.textContent = 'Покой';
        }
    }
    
    recordMeasurement() {
        if (!this.state.isPulling || !this.state.isSliding) {
            this.showStatus('Потяните брусок до скольжения!', 'warning');
            return;
        }
        
        const massG = this.state.blockMass;
        const massKg = massG / 1000;
        const normalForce = massKg * PHYSICS_CONFIG.gravity;
        const frictionForce = this.state.currentFrictionForce;
        const mu = frictionForce / normalForce;
        
        const measurement = {
            id: this.state.measurements.length + 1,
            mass: massG,
            normalForce: normalForce,
            frictionForce: frictionForce,
            mu: mu
        };
        
        this.state.measurements.push(measurement);
        this.updateMeasurementsTable();
        this.updateChart();
        
        if (this.particles) {
            this.particles.createSuccessSparkles(450, 300, 15);
        }
        
        this.showStatus(`Измерение №${measurement.id} записано!`, 'success');
    }
    
    updateMeasurementsTable() {
        const tbody = document.getElementById('measurements-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Показываем только номер и силу трения - остальное ученик должен определить сам
        this.state.measurements.forEach(m => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${m.id}</td>
                <td>${m.frictionForce.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    clearMeasurements() {
        this.state.measurements = [];
        this.updateMeasurementsTable();
        this.updateChart();
        
        const coeffEl = document.getElementById('friction-coefficient');
        const errorEl = document.getElementById('result-error');
        if (coeffEl) coeffEl.textContent = '—';
        if (errorEl) errorEl.textContent = '—';
        
        this.showStatus('Таблица очищена', 'info');
    }
    
    calculateFrictionCoefficient() {
        if (this.state.measurements.length < 2) {
            this.showStatus('Нужно минимум 2 измерения!', 'warning');
            return;
        }
        
        const muValues = this.state.measurements.map(m => m.mu);
        const avgMu = muValues.reduce((a, b) => a + b, 0) / muValues.length;
        
        const variance = muValues.reduce((sum, mu) => sum + Math.pow(mu - avgMu, 2), 0) / muValues.length;
        const stdDev = Math.sqrt(variance);
        
        const coeffEl = document.getElementById('friction-coefficient');
        const errorEl = document.getElementById('result-error');
        if (coeffEl) coeffEl.textContent = avgMu.toFixed(3);
        if (errorEl) errorEl.textContent = `±${stdDev.toFixed(3)}`;
        
        const theoretical = PHYSICS_CONFIG.frictionCoefficients[this.state.currentSurface].kinetic;
        const deviation = Math.abs(avgMu - theoretical) / theoretical * 100;
        
        if (deviation < 15) {
            this.showStatus(`Отлично! μ = ${avgMu.toFixed(3)} (отклонение ${deviation.toFixed(1)}%)`, 'success');
        } else {
            this.showStatus(`μ = ${avgMu.toFixed(3)} (отклонение ${deviation.toFixed(1)}%)`, 'info');
        }
        
        // Celebration particles
        if (this.particles) {
            for (let i = 0; i < 25; i++) {
                setTimeout(() => {
                    this.particles.createSuccessSparkles(
                        150 + Math.random() * 600,
                        100 + Math.random() * 400,
                        3
                    );
                }, i * 40);
            }
        }
    }
    
    // ==================== CHART ====================
    
    initChart() {
        const canvas = document.getElementById('friction-chart');
        if (!canvas || typeof Chart === 'undefined') {
            console.warn('Chart.js not available');
            return;
        }
        
        this.chart = new Chart(canvas, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Fтр(N)',
                    data: [],
                    backgroundColor: '#E53E3E',
                    borderColor: '#C53030',
                    pointRadius: 8,
                    pointHoverRadius: 12
                }, {
                    label: 'Линия тренда',
                    data: [],
                    type: 'line',
                    borderColor: '#3182CE',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        labels: { color: '#666' }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'N (Н)', color: '#666' },
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    },
                    y: {
                        title: { display: true, text: 'Fтр (Н)', color: '#666' },
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    }
                }
            }
        });
    }
    
    updateChart() {
        if (!this.chart) return;
        
        const points = this.state.measurements.map(m => ({
            x: m.normalForce,
            y: m.frictionForce
        }));
        
        this.chart.data.datasets[0].data = points;
        
        // Trend line
        if (points.length >= 2) {
            const n = points.length;
            const sumX = points.reduce((s, p) => s + p.x, 0);
            const sumY = points.reduce((s, p) => s + p.y, 0);
            const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
            const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            const maxX = Math.max(...points.map(p => p.x));
            
            this.chart.data.datasets[1].data = [
                { x: 0, y: intercept },
                { x: maxX * 1.2, y: intercept + slope * maxX * 1.2 }
            ];
        } else {
            this.chart.data.datasets[1].data = [];
        }
        
        this.chart.update();
    }
    
    // ==================== UTILITIES ====================
    
    resetExperiment() {
        this.state.blockX = LAYOUT_CONFIG.block.startX;
        this.state.weightsOnBlock = [];
        this.state.usedWeightIds.clear();
        this.state.freeWeights = []; // 🆕 Сброс свободных грузов
        this.state.blockMass = EQUIPMENT_CONFIG.block.mass;
        this.state.pullingForce = 0;
        this.state.isPulling = false;
        this.state.isSliding = false;
        this.state.currentFrictionForce = 0;
        
        // Сбрасываем размещение оборудования (начинаем с пустого canvas)
        this.state.surfacePlaced = false;
        this.state.blockPlaced = false;
        this.state.dynamometerPlaced = false;
        
        // Возвращаем оборудование в панель
        const surfaceEl = document.querySelector('[data-equipment="surface"]');
        const blockEl = document.querySelector('[data-equipment="block"]');
        const dynamometerEl = document.querySelector('[data-equipment="dynamometer5"]');
        if (surfaceEl) {
            surfaceEl.classList.remove('used');
            surfaceEl.draggable = true;
        }
        if (blockEl) {
            blockEl.classList.remove('used');
            blockEl.draggable = true;
        }
        if (dynamometerEl) {
            dynamometerEl.classList.remove('used');
            dynamometerEl.draggable = true;
        }
        
        this.clearMeasurements();
        this.renderWeightsInventory();
        this.drawBackground();
        this.drawEquipment();
        this.drawDynamic();
        this.updateMeasurementDisplay();
        
        this.showStatus('Эксперимент сброшен', 'info');
    }
    
    toggleFullscreen() {
        const container = document.querySelector('.experiment-container');
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (container) {
            container.requestFullscreen();
        }
    }
    
    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status-text');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `experiment-status status-${type}`;
            
            setTimeout(() => {
                statusEl.textContent = 'Готов к работе';
                statusEl.className = 'experiment-status';
            }, 3000);
        }
        
        console.log(`[STATUS] ${type}: ${message}`);
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔬 DOM ready, starting Friction Experiment...');
    
    const experiment = new FrictionExperiment();
    experiment.init().catch(err => {
        console.error('Failed to init experiment:', err);
    });
    
    // Expose for debugging
    window.frictionExperiment = experiment;
});
