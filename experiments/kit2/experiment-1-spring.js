/**
 * Experiment 1: Определение жёсткости пружины
 * Interactive Spring Stiffness Measurement
 */

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
            isAnimating: false,
            isDragging: false,
            draggingSpring: false,
            springAttached: false,
            attachedSpringId: null,
            weightAttached: false,
            currentWeight: null,
            currentWeightId: null,
            // springPosition — координаты ВЕРХНЕГО конца пружины (крючка)
            springPosition: { x: 200, y: 150 },
            springLength: 140, // 3.5 см * 40 px/см = 140px (компактная реалистичная пружина)
            springNaturalLength: 140, // натуральная длина без нагрузки
            springElongation: 0,
            measurements: [],
            attachedWeights: [],
            selectedWeights: new Set(),
            showGraph: false,
            experimentComplete: false
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

        // Chart
        this.chart = null;

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
            spring50: {
                id: 'spring50',
                name: 'Пружина №1',
                stiffness: '50 Н/м',
                stiffnessValue: 50,
                icon: '🌀',
                naturalLength: 140
            },
            spring10: {
                id: 'spring10',
                name: 'Пружина №2',
                stiffness: '10 Н/м',
                stiffnessValue: 10,
                icon: '🧷',
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

        Object.values(this.equipment).forEach((spring) => {
            const isAttached = this.state.attachedSpringId === spring.id;

            const item = document.createElement('div');
            item.className = 'equipment-item';
            item.dataset.type = 'equipment';
            item.dataset.equipmentId = spring.id;
            item.dataset.status = isAttached ? 'installed' : 'available';
            item.dataset.stiffness = spring.stiffnessValue;

            if (isAttached) {
                item.classList.add('equipment-item--installed');
            }

            const icon = document.createElement('div');
            icon.className = 'equipment-icon';
            icon.textContent = spring.icon;

            const title = document.createElement('div');
            title.className = 'equipment-title';
            title.textContent = spring.name;

            const meta = document.createElement('div');
            meta.className = 'equipment-meta';
            meta.textContent = 'Жёсткость определите в ходе опыта';

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
                    this.detachSpringToInventory();
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

        container.innerHTML = '';

        this.weightsInventory.forEach((weight) => {
            const isPending = this.pendingWeightIds.has(weight.id);
            const isAttached = this.state.selectedWeights.has(weight.id);

            const item = document.createElement('div');
            item.className = 'weight-item';
            item.dataset.type = 'weight';
            item.dataset.mass = weight.mass;
            item.dataset.weightId = weight.id;
            item.dataset.hooksTop = weight.hooksTop ? 'true' : 'false';
            item.dataset.hooksBottom = weight.hooksBottom ? 'true' : 'false';
            item.dataset.status = isAttached ? 'attached' : isPending ? 'pending' : 'available';

            if (isAttached || isPending) {
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
            status.textContent = isAttached ? 'На пружине' : isPending ? 'Подвешивается…' : 'В комплекте';

            item.append(figure, label, meta, status);

            if (isAttached) {
                const action = document.createElement('button');
                action.type = 'button';
                action.className = 'weight-action';
                action.textContent = 'Вернуть в комплект';
                action.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.detachWeight(weight.id);
                });
                item.appendChild(action);
            } else if (!isPending) {
                const hint = document.createElement('div');
                hint.className = 'weight-hint';
                hint.textContent = 'Перетащите на пружину';
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
        const spring = this.getEquipmentById(equipmentId);

        if (!spring) {
            console.warn('⚠️ Unknown equipment id:', equipmentId);
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

        this.renderEquipmentInventory();
        this.drawDynamic();
        this.showHint('Пружина возвращена в комплект.');
    }

    detachWeight(weightId) {
        console.log('[DETACH-WEIGHT] Запрос снять груз', weightId);
        if (!this.state.springAttached) {
            console.warn('[DETACH-WEIGHT] Нет пружины, операция невозможна');
            this.showHint('Сначала установите пружину на установку.');
            return;
        }

        if (this.state.isAnimating) {
            console.warn('[DETACH-WEIGHT] Нельзя снять во время анимации');
            this.showHint('Дождитесь завершения измерения, затем снимите груз.');
            return;
        }

        if (!this.state.attachedWeights?.length) {
            console.warn('[DETACH-WEIGHT] На пружине нет грузов');
            this.showHint('На пружине нет подвешенных грузов.');
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

        this.state.attachedWeights.pop();
        this.state.selectedWeights.delete(weightId);
        this.pendingWeightIds.delete(weightId);
        console.log('[DETACH-WEIGHT] Груз снят, цепочка теперь:', this.state.attachedWeights.map(item => item.id));

        if (!this.state.attachedWeights.length) {
            this.state.weightAttached = false;
            this.state.currentWeight = null;
            this.state.currentWeightId = null;
            this.state.springLength = this.state.springNaturalLength;
            this.state.springElongation = 0;
            this.updateVisualScale(this.state.springLength);
            this.resetMeasurementDisplay();
            this.showHint('Груз возвращён в комплект. Пружина свободна.');
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
            const elongationM = force / this.physics.springConstant;
            const elongationPx = elongationM * 100 * this.physics.pixelsPerCm;
            const targetLength = this.state.springNaturalLength + elongationPx;

            this.state.springLength = targetLength;
            this.state.springElongation = targetLength - this.state.springNaturalLength;
            this.updateVisualScale(this.state.springLength);

            const elongationCm = this.state.springElongation / this.physics.pixelsPerCm;
            this.updateCurrentMeasurementDisplay(totalMass, force, elongationCm);
            this.showHint(`Груз снят. Текущая масса на пружине: ${totalMass.toFixed(0)} г.`);
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
                // Убираем restrictRect - он мешает drop на canvas
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
            isAnimating: this.state.isAnimating,
            selectedWeights: Array.from(this.state.selectedWeights)
        });

        if (!this.state.springAttached) {
            console.warn('[ATTACH-WEIGHT] Пружина не установлена, drop отклонён');
            this.showHint('Сначала установите пружину на установку.');
            return;
        }

        if (this.state.currentStep < 2) {
            this.state.currentStep = 2;
            this.updateProgress();
            this.handleStepChange();
        }

        const weightId = element?.dataset?.weightId;
        console.log('[ATTACH-WEIGHT] Получили weightId из элемента', weightId, element?.dataset);
        const weight = this.getWeightById(weightId);

        if (!weight) {
            console.warn('[ATTACH-WEIGHT] Не найден вес по id', weightId);
            this.showHint('Не удалось распознать груз. Попробуйте снова.');
            this.resetDraggablePosition(element);
            return;
        }

        if (this.state.selectedWeights.has(weightId)) {
            console.warn('[ATTACH-WEIGHT] Груз уже в selectedWeights', weightId);
            this.showHint('Этот груз уже находится на установке.');
            this.resetDraggablePosition(element);
            return;
        }

        const canAttach = this.canAttachWeight(weight);
        console.log('[ATTACH-WEIGHT] Проверка возможности подвесить', {
            weightId,
            canAttach,
            attachedChain: this.state.attachedWeights.map(item => item.id)
        });

        if (!canAttach) {
            this.showHint('Нет свободного крючка для этого груза. Сначала снимите нижний груз.');
            this.resetDraggablePosition(element);
            return;
        }

        console.log('[ATTACH-WEIGHT] Старт подвешивания (постановка в очередь)', weightId);
        
        // Сбрасываем позицию элемента (но НЕ удаляем флаг wasDropped)
        this.resetDraggablePosition(element, false);

        this.pendingWeightIds.add(weightId);
        this.renderWeightsInventory();

        const wasProcessing = this.attachmentManager.isBusy();
        const attachmentPromise = this.attachmentManager.enqueue({ weight, weightId });
        if (wasProcessing) {
            this.showHint('Предыдущее измерение завершается. Груз добавлен в очередь.');
        }

        try {
            await attachmentPromise;

            this.pendingWeightIds.delete(weightId);
            this.state.selectedWeights.add(weightId);
            element.classList.add('used');

            console.log('[ATTACH-WEIGHT] Подвешивание завершено', {
                weightId,
                totalAttached: this.state.attachedWeights.length
            });

            this.renderWeightsInventory();
            this.updateRecordButton();
        } catch (err) {
            console.error('[ATTACH-WEIGHT] Ошибка при подвешивании', err);
            this.pendingWeightIds.delete(weightId);
            this.renderWeightsInventory();
            this.showHint('Не удалось подвесить груз. Попробуйте снова.');
        }
    }

    async attachWeight(weight) {
        console.log('[ATTACH-WEIGHT] attachWeight вызван', weight?.id);
        this.state.isAnimating = true;
        console.log('[ATTACH-WEIGHT] Флаг isAnimating → true');
        this.state.weightAttached = true;

        // Очистка любых ранее запущенных эффектов, чтобы не оставалось свечения
        this.particleSystem.clear();

        if (!Array.isArray(this.state.attachedWeights)) {
            this.state.attachedWeights = [];
        }

        this.state.attachedWeights.push({ id: weight.id });
        console.log('[ATTACH-WEIGHT] Цепочка грузов:', this.state.attachedWeights.map(item => item.id));
        this.state.currentWeightId = weight.id;

        const totalMass = this.state.attachedWeights.reduce((sum, item) => {
            const def = this.getWeightById(item.id);
            return sum + (def?.mass ?? 0);
        }, 0);

        console.log('[ATTACH-WEIGHT] Текущая суммарная масса (г):', totalMass);

        this.state.currentWeight = totalMass;

        const massKg = totalMass / 1000;
        const force = massKg * this.physics.gravity;
        const elongationM = force / this.physics.springConstant;
        const elongationPx = elongationM * 100 * this.physics.pixelsPerCm;

        console.log('[ATTACH-WEIGHT] Расчёт удлинения', {
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
        this.takeMeasurement(totalMass, finalElongationCm);

        // Успешное завершение - подсказываем записать измерение
        this.showHint(`Измерение готово! Удлинение: ${finalElongationCm.toFixed(2)} см. Нажмите "Записать измерение" для добавления в таблицу.`);

        this.state.isAnimating = false;
        console.log('[ATTACH-WEIGHT] Флаг isAnimating → false');
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
        const forceEl = document.getElementById('current-force');
        const elongationEl = document.getElementById('current-elongation');

        if (massEl) {
            massEl.textContent = Number.isFinite(mass) ? mass.toFixed(0) : '—';
        }

        if (forceEl) {
            forceEl.textContent = Number.isFinite(force) ? force.toFixed(3) : '—';
        }

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

    showGraph() {
        this.state.showGraph = true;
        document.getElementById('graph-section').style.display = 'block';

        const result = this.calculateSpringConstant();
        if (!result) return;

        // Обновляем информацию о графике
        const pointsCount = document.getElementById('points-count');
        const rSquared = document.getElementById('r-squared');
        const equation = document.getElementById('equation');
        
        if (pointsCount) pointsCount.textContent = result.points;
        if (rSquared) rSquared.textContent = result.r2 ? result.r2.toFixed(3) : '—';
        if (equation) equation.textContent = result.equation;

        // Строим график
        this.drawChart();

        // Конфетти!
        if (this.visualSettings.completionConfetti) {
            this.particleSystem.createConfetti(
                this.canvases.particles.width / 2,
                this.canvases.particles.height / 2
            );
        }

        // Показываем достижение
        this.showAchievement(result);
    }

    drawChart() {
        const chartCanvas = document.getElementById('chart');
        if (!chartCanvas) {
            console.error('Chart canvas with id="chart" not found');
            return;
        }
        const ctx = chartCanvas.getContext('2d');
        
        // Destroy previous chart
        if (this.chart) {
            this.chart.destroy();
        }

        const data = this.state.measurements.map(m => ({
            x: m.elongationCm || (m.elongationM * 100), // см для читаемости
            y: m.force
        }));

        // Линия регрессии
        const regression = this.calculateSpringConstant();
        const regressionLine = [
            { x: 0, y: 0 },
            { x: Math.max(...data.map(d => d.x)) * 1.1, y: regression.k * Math.max(...data.map(d => d.x)) * 1.1 / 100 }
        ];

        this.chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Измерения',
                        data: data,
                        backgroundColor: '#0066CC',
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Линия регрессии',
                        data: regressionLine,
                        type: 'line',
                        borderColor: '#00A86B',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Удлинение (см)',
                            color: '#FFF'
                        },
                        ticks: { color: '#FFF' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Сила (Н)',
                            color: '#FFF'
                        },
                        ticks: { color: '#FFF' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#FFF' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `F = ${context.parsed.y.toFixed(3)} Н, Δl = ${context.parsed.x.toFixed(2)} см`;
                            }
                        }
                    }
                }
            }
        });
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
            this.recordCurrentMeasurement();
        });

        calculateButton?.addEventListener('click', () => {
            this.calculateAndDisplayResult();
        });

        document.querySelector('#help-modal .modal-close')?.addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'none';
        });
    }

    handleStepChange() {
        switch (this.state.currentStep) {
            case 1:
                this.showHint('Перетащите пружину из секции «Оборудование», затем подвесьте первый груз.');
                break;
            case 2:
                if (!this.state.springAttached) {
                    this.showHint('Установите пружину на установку, затем подвесьте груз.');
                } else {
                    this.showHint('Продолжайте добавлять грузы, чтобы получить больше измерений.');
                }
                break;
            case 3:
                this.showHint('Расчёт жёсткости выполняется автоматически. Добавьте ещё одно измерение для высокой точности.');
                break;
            case 4:
                this.showHint('Эксперимент завершён! Вы можете вернуться к комплекту или повторить измерения.');
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

    // Записать текущее измерение в таблицу
    recordCurrentMeasurement() {
        if (this.state.attachedWeights.length === 0) {
            this.showHint('Сначала подвесьте груз на пружину!');
            return;
        }

        // Получаем текущие значения
        const totalMass = this.state.attachedWeights.reduce((sum, w) => {
            const weightDef = this.getWeightById(w.id);
            return sum + (weightDef?.mass || 0);
        }, 0);
        const force = (totalMass / 1000) * this.physics.gravity; // Н
        const elongationCm = this.state.springElongation / this.physics.pixelsPerCm;
        
        console.log('[RECORD] Recording measurement:', { totalMass, force, elongationCm });

        // Проверка валидности данных
        if (!totalMass || totalMass <= 0 || !Number.isFinite(totalMass)) {
            this.showHint('Ошибка: некорректная масса груза!');
            console.error('[RECORD] Invalid mass:', totalMass);
            return;
        }

        if (!elongationCm || elongationCm <= 0 || !Number.isFinite(elongationCm)) {
            this.showHint('Ошибка: некорректное удлинение пружины!');
            console.error('[RECORD] Invalid elongation:', elongationCm);
            return;
        }

        // Проверяем, нет ли уже такого измерения
        const isDuplicate = this.state.measurements.some(m => 
            Math.abs(m.mass - totalMass) < 1 && Math.abs(m.elongationCm - elongationCm) < 0.01
        );

        if (isDuplicate) {
            this.showHint('Такое измерение уже записано!');
            return;
        }

        // Добавляем измерение
        const measurement = {
            id: Date.now(),
            mass: totalMass,
            force: force,
            elongationCm: elongationCm,
            elongationM: elongationCm / 100
        };

        this.state.measurements.push(measurement);
        this.renderMeasurementsTable();
        this.updateRecordButton();
        this.updateCalculateButton();

        // Эффект успешной записи
        if (this.visualSettings?.measurementParticles) {
            this.particleSystem.createSuccess(
                this.state.springPosition.x,
                this.state.springPosition.y + this.state.springLength
            );
        }

        this.showHint(`✓ Измерение №${this.state.measurements.length} записано в таблицу!`);
    }

    // Отрисовка таблицы измерений
    renderMeasurementsTable() {
        const tbody = document.getElementById('measurements-tbody');
        if (!tbody) return;

        if (this.state.measurements.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="5">Пока нет измерений</td></tr>';
            return;
        }

        tbody.innerHTML = this.state.measurements.map((m, index) => `
            <tr data-measurement-id="${m.id}">
                <td>${index + 1}</td>
                <td>${m.mass.toFixed(0)}</td>
                <td>${m.force.toFixed(3)}</td>
                <td>${m.elongationCm.toFixed(2)}</td>
                <td>
                    <button class="btn-delete" onclick="experiment.deleteMeasurement(${m.id})">
                        ✕
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Удалить измерение из таблицы
    deleteMeasurement(id) {
        const index = this.state.measurements.findIndex(m => m.id === id);
        if (index === -1) return;

        this.state.measurements.splice(index, 1);
        this.renderMeasurementsTable();
        this.updateCalculateButton();
        this.showHint('Измерение удалено из таблицы');
    }

    // Обновить состояние кнопки "Записать измерение"
    updateRecordButton() {
        const btn = document.getElementById('btn-record-measurement');
        if (!btn) return;

        const canRecord = this.state.attachedWeights.length > 0 && !this.state.isAnimating;
        btn.disabled = !canRecord;
    }

    // Обновить состояние кнопки "Рассчитать"
    updateCalculateButton() {
        const btn = document.getElementById('btn-calculate');
        if (!btn) return;

        btn.disabled = this.state.measurements.length === 0;
    }

    // Рассчитать и отобразить результат
    calculateAndDisplayResult() {
        if (this.state.measurements.length === 0) {
            this.showHint('Сначала запишите хотя бы одно измерение!');
            return;
        }

        // Вычисляем жёсткость и обновляем отображение
        this.updateResultDisplay();

        // Показываем график
        if (this.state.measurements.length >= 2) {
            this.showGraph();
        }

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
        this.state.showGraph = false;
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

        document.getElementById('graph-section').style.display = 'none';
        
        this.updateProgress();
        this.renderMeasurementsTable();
        this.updateRecordButton();
        this.updateCalculateButton();
        this.resetResultDisplay();
        
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

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
        
        const handlePointerMove = (e) => {
            if (!isDragging) return;

            const rect = interactionSurface.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.lastPointer = { x: e.clientX, y: e.clientY };

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

            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);

            if (equipmentContainer) {
                const containerRect = equipmentContainer.getBoundingClientRect();
                if (
                    e.clientX >= containerRect.left &&
                    e.clientX <= containerRect.right &&
                    e.clientY >= containerRect.top &&
                    e.clientY <= containerRect.bottom
                ) {
                    this.detachSpringToInventory();
                    isDragging = false;
                    dynamicCanvas.style.cursor = 'default';
                    return;
                }
            }

            this.clampSpringPosition();
            this.drawDynamic();

            isDragging = false;
            interactionSurface.style.cursor = 'default';
        };

        interactionSurface.addEventListener('mousedown', (e) => {
            const rect = interactionSurface.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (isClickOnSpring(x, y)) {
                isDragging = true;
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
            interactionSurface.style.cursor = isClickOnSpring(x, y) ? 'grab' : 'default';
        });
        
        console.log('✅ Spring drag enabled');
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
