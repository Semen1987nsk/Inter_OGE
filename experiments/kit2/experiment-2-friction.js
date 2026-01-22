/**
 * Experiment 2: Измерение силы трения скольжения
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
            
            // Dynamometer state
            dynamometerAttached: true, // Always attached for this experiment
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
            
            // Drag state
            isDragging: false,
            currentWeight: null,
            usedWeightIds: new Set()
        };
        
        // Inventory
        this.weightsInventory = [...WEIGHTS_INVENTORY];
        
        // Animation
        this.animationId = null;
        this.lastTime = 0;
        
        // Particles
        this.particles = null;
        
        // Magnifier
        this.magnifier = null;
        
        // Chart
        this.chart = null;
        
        // Drag ghost element
        this.dragGhost = null;
    }
    
    async init() {
        console.log('🔬 Initializing Friction Experiment v2.0...');
        
        try {
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
            
            // Initialize magnifier
            const container = document.getElementById('canvas-container');
            if (container && this.canvases.dynamic) {
                this.magnifier = new Magnifier(container, this.canvases.dynamic);
            }
            
            // Setup event listeners (buttons, selects)
            this.setupEventListeners();
            
            // Setup drag & drop with interact.js
            this.setupDragAndDrop();
            
            // Setup pull interaction on canvas
            this.setupPullInteraction();
            
            // Render inventory
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
        console.log('[DRAG] Setting up interact.js for weights...');
        
        // Configure interact.js
        interact.pointerMoveTolerance(5);
        interact.dynamicDrop(true);
        
        // Make weight items draggable
        interact('.weight-item').draggable({
            inertia: false,
            autoScroll: false,
            manualStart: false,
            hold: 0,
            listeners: {
                start: (event) => this.onDragStart(event),
                move: (event) => this.onDragMove(event),
                end: (event) => this.onDragEnd(event)
            }
        });
        
        // Setup drop zone on canvas
        const overlay = document.getElementById('drag-drop-overlay');
        if (overlay) {
            interact('#drag-drop-overlay').dropzone({
                accept: '.weight-item',
                overlap: 0.1,
                ondrop: (event) => this.handleCanvasDrop(event),
                ondragenter: (event) => {
                    overlay.classList.add('drag-over');
                    if (event.relatedTarget) {
                        event.relatedTarget.dataset.wasDropped = 'true';
                    }
                },
                ondragleave: () => {
                    overlay.classList.remove('drag-over');
                }
            });
        }
        
        console.log('[DRAG] Drag & drop setup complete');
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
        event.target.classList.add('dragging');
        event.target.style.opacity = '0.5';
        
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
        
        const mass = parseInt(event.target.dataset.mass, 10);
        this.state.currentWeight = mass;
    }
    
    onDragMove(event) {
        if (!this.dragGhost) return;
        
        const ghost = this.dragGhost;
        const currentLeft = parseFloat(ghost.style.left) || 0;
        const currentTop = parseFloat(ghost.style.top) || 0;
        
        ghost.style.left = (currentLeft + event.dx) + 'px';
        ghost.style.top = (currentTop + event.dy) + 'px';
    }
    
    onDragEnd(event) {
        console.log('[DRAG-END]', event.target.dataset.weightId);
        
        this.state.isDragging = false;
        event.target.classList.remove('dragging');
        event.target.style.opacity = '';
        
        // Remove ghost
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
        
        // Check if dropped on canvas
        const wasDropped = event.target.dataset.wasDropped === 'true';
        if (!wasDropped) {
            console.log('[DRAG] Not dropped on canvas');
        }
        
        event.target.dataset.wasDropped = 'false';
    }
    
    handleCanvasDrop(event) {
        const weightId = event.relatedTarget?.dataset?.weightId;
        const mass = parseInt(event.relatedTarget?.dataset?.mass, 10);
        
        console.log('[DROP] Weight dropped:', weightId, mass, 'g');
        
        if (!weightId || !mass) return;
        
        // Add weight to block
        this.addWeightToBlock(weightId, mass);
        
        // Mark as used
        this.state.usedWeightIds.add(weightId);
        
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
        
        // Mouse down on container
        container.addEventListener('mousedown', (e) => this.handlePullStart(e));
        container.addEventListener('touchstart', (e) => this.handlePullStart(e), { passive: false });
        
        // Cursor change on hover
        container.addEventListener('mousemove', (e) => {
            if (this.state.isPulling) return;
            const pos = this.getCanvasPosition(e);
            const handleArea = this.getDynamometerHandleArea();
            container.style.cursor = this.isPointInRect(pos, handleArea) ? 'grab' : 'default';
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
        const scaleX = 900 / rect.width;
        const scaleY = 600 / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    handlePullStart(e) {
        const pos = this.getCanvasPosition(e);
        const handleArea = this.getDynamometerHandleArea();
        
        if (this.isPointInRect(pos, handleArea)) {
            e.preventDefault();
            e.stopPropagation();
            
            this.state.isPulling = true;
            this.state.pullStartMouseX = pos.x;
            // Запоминаем текущую позицию ручки (может быть уже смещена если брусок сдвинут)
            this.state.pullStartHandleX = this.state.handleX || this.getHandleRestX();
            
            console.log('[PULL] ✅ Started pulling!');
            
            document.body.style.cursor = 'grabbing';
            
            window.addEventListener('mousemove', this.boundHandlePullMove);
            window.addEventListener('mouseup', this.boundHandlePullEnd);
            window.addEventListener('touchmove', this.boundHandlePullMove, { passive: false });
            window.addEventListener('touchend', this.boundHandlePullEnd);
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
        const SPRING_K = 0.015;         // Жёсткость пружины: Н на пиксель (сделаем мягче для точности)
        const MAX_FORCE = 5.0;          // Максимум шкалы динамометра
        
        // === ФИЗИКА ТРЕНИЯ ===
        const frictionCoeff = PHYSICS_CONFIG.frictionCoefficients[this.state.currentSurface];
        const normalForce = (this.state.blockMass / 1000) * PHYSICS_CONFIG.gravity;
        
        // Максимальная сила трения покоя
        const maxStaticFriction = frictionCoeff.static * normalForce;
        // Сила трения скольжения
        const kineticFriction = frictionCoeff.kinetic * normalForce;
        
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
        this.state.blockMass = this.calculateTotalMass();
        
        // Обновляем отображение и перерисовываем
        this.renderWeightsInventory();
        this.updateMeasurementDisplay();
        this.drawDynamic();
        
        this.showStatus(`Добавлен груз ${mass} г`, 'success');
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
        
        this.showStatus(`Груз ${weight.mass} г снят`, 'info');
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
        
        this.weightsInventory.forEach(weight => {
            const isUsed = this.state.usedWeightIds.has(weight.id);
            
            const item = document.createElement('div');
            item.className = `weight-item ${isUsed ? 'used' : ''}`;
            item.dataset.weightId = weight.id;
            item.dataset.mass = weight.mass;
            item.draggable = !isUsed;
            
            // Create weight visual (like spring experiment)
            const figure = document.createElement('div');
            figure.className = 'weight-figure';
            
            const canvas = document.createElement('canvas');
            canvas.width = 60;
            canvas.height = 50;
            canvas.className = 'weight-preview';
            
            const ctx = canvas.getContext('2d');
            this.drawWeightPreview(ctx, weight.mass, weight.color);
            
            figure.appendChild(canvas);
            
            const label = document.createElement('div');
            label.className = 'weight-label';
            label.innerHTML = `<span class="weight-mass">${weight.mass} г</span>`;
            
            if (isUsed) {
                label.innerHTML += '<span class="weight-status">На бруске</span>';
                item.addEventListener('click', () => this.removeWeightFromBlock(weight.id));
            }
            
            item.appendChild(figure);
            item.appendChild(label);
            container.appendChild(item);
        });
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
        
        // Mass text
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 14px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 2;
        ctx.fillText(`${mass}`, w / 2, h / 2 + 3);
        ctx.shadowBlur = 0;
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
        
        // Record measurement
        document.getElementById('btn-record')?.addEventListener('click', () => {
            this.recordMeasurement();
        });
        
        // Clear table
        document.getElementById('btn-clear-table')?.addEventListener('click', () => {
            this.clearMeasurements();
        });
        
        // Calculate
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
        
        // Draw table/surface
        this.drawSurface(ctx);
        
        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('Измерение силы трения скольжения', w / 2, 50);
        ctx.shadowBlur = 0;
        
        // Surface info
        const surfaceInfo = PHYSICS_CONFIG.frictionCoefficients[this.state.currentSurface];
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillStyle = surfaceInfo.color;
        ctx.fillText(`Поверхность: ${surfaceInfo.name} (μ ≈ ${surfaceInfo.kinetic})`, w / 2, 80);
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
        
        // Draw ruler
        this.drawRuler(ctx);
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
        
        const w = VISUAL_CONFIG.canvasWidth;
        const h = VISUAL_CONFIG.canvasHeight;
        
        ctx.clearRect(0, 0, w, h);
        
        // Draw block
        this.drawBlock(ctx);
        
        // Draw weights on block
        this.drawWeightsOnBlock(ctx);
        
        // Draw dynamometer
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
        ctx.stroke();
        
        // Top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x + 5, y + 5, blockW - 10, 10);
        
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
        
        // Mass label on block
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.fillText(`${this.state.blockMass} г`, x + blockW / 2, y + blockH / 2);
        ctx.shadowBlur = 0;
    }
    
    drawWeightsOnBlock(ctx) {
        const blockW = this.layout.block.width;
        const blockCenterX = this.state.blockX + blockW / 2;
        let currentY = this.state.blockY;
        
        const weightW = 70;
        const weightH = 25;
        
        this.state.weightsOnBlock.forEach((weightData, index) => {
            currentY -= weightH + 3;
            const weightX = blockCenterX - weightW / 2;
            
            // Weight shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.roundRect(weightX + 3, currentY + 3, weightW, weightH, 5);
            ctx.fill();
            
            // Weight body
            const gradient = ctx.createLinearGradient(weightX, currentY, weightX + weightW, currentY + weightH);
            gradient.addColorStop(0, '#CD853F');
            gradient.addColorStop(0.5, '#DEB887');
            gradient.addColorStop(1, '#A0522D');
            ctx.fillStyle = gradient;
            
            ctx.beginPath();
            ctx.roundRect(weightX, currentY, weightW, weightH, 5);
            ctx.fill();
            
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(weightX + 5, currentY + 3, weightW - 10, 6);
            
            // Border
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Mass label
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 12px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 2;
            ctx.fillText(`${weightData.mass}г`, blockCenterX, currentY + weightH / 2);
            ctx.shadowBlur = 0;
        });
    }
    
    drawDynamometer(ctx) {
        const blockRight = this.state.blockX + this.layout.block.width;
        const y = this.state.blockY + this.layout.block.height / 2;
        
        // === КОНСТАНТЫ (должны совпадать с handlePullMove!) ===
        const BODY_LENGTH = 130;
        const HANDLE_WIDTH = 55;
        const SPRING_K = 0.03;
        
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
        
        // Деления шкалы (0-5 Н)
        ctx.strokeStyle = '#333';
        ctx.fillStyle = '#333';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        
        const scaleStep = scaleW / 5; // пикселей на 1 Н
        for (let n = 0; n <= 5; n++) {
            const markX = scaleX + n * scaleStep;
            
            ctx.beginPath();
            ctx.moveTo(markX, y - scaleH/2 + 2);
            ctx.lineTo(markX, y - scaleH/2 + 7);
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            ctx.fillText(n.toString(), markX, y + scaleH/2 - 3);
        }
        
        // 5. УКАЗАТЕЛЬ СИЛЫ (красная линия)
        // Положение: сила * (пикселей на Н)
        const pointerX = scaleX + (this.state.pullingForce * scaleStep);
        
        // Треугольник сверху
        ctx.fillStyle = '#E53E3E';
        ctx.beginPath();
        ctx.moveTo(pointerX, y - scaleH/2 - 3);
        ctx.lineTo(pointerX - 4, y - scaleH/2 + 5);
        ctx.lineTo(pointerX + 4, y - scaleH/2 + 5);
        ctx.closePath();
        ctx.fill();
        
        // Вертикальная линия
        ctx.strokeStyle = '#E53E3E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pointerX, y - scaleH/2 + 5);
        ctx.lineTo(pointerX, y + scaleH/2 - 5);
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
        
        // Надпись "5 Н" на корпусе
        ctx.fillStyle = '#555';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('5 Н', bodyEndX - 10, y - bodyH/2 + 11);
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
            
            // Redraw dynamic elements
            this.drawDynamic();
            
            // Update particles
            if (this.particles) {
                this.particles.update();
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
        
        this.state.measurements.forEach(m => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${m.id}</td>
                <td>${m.mass}</td>
                <td>${m.normalForce.toFixed(2)}</td>
                <td>${m.frictionForce.toFixed(2)}</td>
                <td>${m.mu.toFixed(3)}</td>
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
        this.state.blockMass = EQUIPMENT_CONFIG.block.mass;
        this.state.pullingForce = 0;
        this.state.isPulling = false;
        this.state.isSliding = false;
        this.state.currentFrictionForce = 0;
        
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
