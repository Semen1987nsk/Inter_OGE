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
            // springPosition — координаты ВЕРХНЕГО конца пружины (крючка)
            springPosition: { x: 200, y: 150 },
            springLength: 140, // 3.5 см * 40 px/см = 140px (компактная реалистичная пружина)
            springNaturalLength: 140, // натуральная длина без нагрузки
            springElongation: 0,
            measurements: [],
            selectedWeights: new Set(),
            showGraph: false,
            experimentComplete: false
        };

        this.springDragged = false;

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
        
        // Spring offset for dragging
        this.springOffset = { x: 0, y: 0 };

        // UI references
        this.ui = {
            equipmentContainer: document.getElementById('equipment-container'),
            weightsContainer: document.getElementById('weights-container')
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
                // Pointer tracking for highlight
                this.setupPointerTracking();
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
    }

    resetDraggablePosition(element) {
        if (!element) return;
        element.style.transform = '';
        element.setAttribute('data-x', 0);
        element.setAttribute('data-y', 0);
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

    setupInteractions() {
        document.querySelectorAll('.weight-item').forEach(item => {
            if (!item.dataset.type) {
                item.dataset.type = 'weight';
            }
        });

        // Drag & Drop: грузы
        interact('.weight-item').draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: {
                start: (event) => this.onDragStart(event),
                move: (event) => this.onDragMove(event),
                end: (event) => this.onDragEnd(event)
            }
        });

        // Drag & Drop: оборудование (пружина)
        interact('.equipment-item').draggable({
            inertia: true,
            autoScroll: true,
            listeners: {
                start: (event) => this.onDragStart(event),
                move: (event) => this.onDragMove(event),
                end: (event) => this.onDragEnd(event)
            }
        });

        // Drop zone на пружине (match HTML id 'canvas-dynamic')
        const dropzone = document.getElementById('canvas-dynamic');
        if (!dropzone) {
            console.error('❌ Dropzone canvas #canvas-dynamic not found!');
            return;
        }
        
        console.log('✅ Dropzone canvas found, setting up drop handler');
        
        interact('#canvas-dynamic')
            .dropzone({
                accept: '.weight-item, .equipment-item',
                overlap: 0.4,
                ondrop: (event) => this.handleCanvasDrop(event)
            });
    }

    onDragStart(event) {
        const type = event.target.dataset.type || 'weight';
        this.state.isDragging = true;
        event.target.classList.add('dragging');

        if (type === 'weight') {
            const mass = parseInt(event.target.dataset.mass, 10);
            this.state.currentWeight = mass;
            console.log('🎯 Drag started: груз', mass, 'г');
        } else if (type === 'equipment') {
            console.log('🔧 Dragging equipment item:', event.target.dataset.equipmentId);
        }
    }

    onDragMove(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        // Update trail
    // Trail effect disabled per latest UX update
    }

    onDragEnd(event) {
        this.state.isDragging = false;
        event.target.classList.remove('dragging');
        // Trail effect disabled per latest UX update

        if ((event.target.dataset.type || 'weight') === 'equipment') {
            this.resetDraggablePosition(event.target);
        }
    }

    handleCanvasDrop(event) {
        const itemType = event.relatedTarget?.dataset?.type || 'weight';

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
        if (this.state.currentStep !== 2) {
            this.showHint('Сначала закрепите пружину на штативе!');
            return;
        }

        if (!this.state.springAttached) {
            this.showHint('Сначала установите пружину на установку.');
            return;
        }

        const mass = parseInt(event.relatedTarget.dataset.mass);
        
        if (this.state.selectedWeights.has(mass)) {
            this.showHint('Этот груз уже использован!');
            return;
        }

        // Анимация прикрепления груза
        await this.attachWeight(mass);
        
        // Particle effect
        this.particleSystem.createImpact(
            this.state.springPosition.x,
            this.state.springPosition.y + this.state.springLength,
            20
        );

        // Обновляем UI
        event.relatedTarget.classList.add('used');
        this.state.selectedWeights.add(mass);

        // Проверяем прогресс
        if (this.state.selectedWeights.size >= 3) {
            this.enableNextStep();
        }
    }

    async attachWeight(mass) {
        this.state.isAnimating = true;
        this.state.weightAttached = true;
        this.state.currentWeight = mass;

        // Рассчитываем удлинение пружины
        const massKg = mass / 1000; // г -> кг
        const force = massKg * this.physics.gravity; // F = mg
        const elongationM = force / this.physics.springConstant; // Δl = F/k
        const elongationPx = elongationM * 100 * this.physics.pixelsPerCm; // м -> см -> px

        const targetLength = this.state.springNaturalLength + elongationPx;

        // Анимация растяжения с осцилляцией
        await this.animateSpringStretch(targetLength, massKg);

        // Измерение
        this.takeMeasurement(mass, elongationPx / this.physics.pixelsPerCm);

        this.state.isAnimating = false;
    }

    async animateSpringStretch(targetLength, mass) {
        return new Promise(resolve => {
            const startLength = this.state.springLength;
            const startTime = performance.now();
            const duration = 2000; // 2 секунды

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

                // Particle effects во время колебаний
                if (Math.random() < 0.1) {
                    this.particleSystem.createSpringGlow(
                        this.state.springPosition.x,
                        this.state.springPosition.y + this.state.springLength / 2,
                        2
                    );
                }

                if (progress < 1) {
                    requestAnimationFrame(animateFrame);
                } else {
                    this.state.springLength = targetLength;
                    resolve();
                }
            };

            requestAnimationFrame(animateFrame);
        });
    }

    takeMeasurement(mass, elongationCm) {
        const measurement = {
            mass: mass,
            massKg: mass / 1000,
            force: (mass / 1000) * this.physics.gravity,
            elongation: elongationCm,
            elongationM: elongationCm / 100
        };

        this.state.measurements.push(measurement);
        
        // Обновляем таблицу измерений
        this.updateMeasurementsTable();

        // Успех эффект
        this.particleSystem.createSuccess(
            this.state.springPosition.x,
            this.state.springPosition.y + this.state.springLength
        );

        // Звук (если есть)
        this.playSound('measurement');

        console.log('📊 Measurement:', measurement);
    }

    updateMeasurementsTable() {
        const container = document.querySelector('.measurement-value');
        if (!container) return;

        container.innerHTML = `
            <table class="measurements-table">
                <thead>
                    <tr>
                        <th>Масса (г)</th>
                        <th>Сила (Н)</th>
                        <th>Удлинение (см)</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.state.measurements.map(m => `
                        <tr>
                            <td>${m.mass}</td>
                            <td>${m.force.toFixed(3)}</td>
                            <td>${m.elongation.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    calculateSpringConstant() {
        if (this.state.measurements.length < 3) {
            this.showHint('Нужно минимум 3 измерения!');
            return null;
        }

        // Подготовка данных для линейной регрессии
        const points = this.state.measurements.map(m => ({
            x: m.elongationM,
            y: m.force
        }));

        // Линейная регрессия: F = k * Δl
        const regression = linearRegression(points);
        
        // k = slope (наклон)
        const springConstant = regression.slope;
        const r2 = regression.r2;

        return {
            k: springConstant,
            r2: r2,
            equation: `F = ${springConstant.toFixed(1)} × Δl`,
            quality: r2 > 0.95 ? 'Отлично!' : r2 > 0.90 ? 'Хорошо' : 'Удовлетворительно'
        };
    }

    showGraph() {
        this.state.showGraph = true;
        document.getElementById('graph-section').style.display = 'block';

        const result = this.calculateSpringConstant();
        if (!result) return;

        // Обновляем результаты
        document.getElementById('spring-constant').textContent = 
            `k = ${result.k.toFixed(1)} Н/м`;
        document.getElementById('accuracy').textContent = 
            `R² = ${result.r2.toFixed(3)} (${result.quality})`;

        // Строим график
        this.drawChart();

        // Конфетти!
        this.particleSystem.createConfetti(
            this.canvases.particles.width / 2,
            this.canvases.particles.height / 2
        );

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
            x: m.elongationM * 100, // см для читаемости
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
        // Next step button
        document.getElementById('next-step')?.addEventListener('click', () => {
            this.nextStep();
        });

        // Build graph button
        document.getElementById('build-graph')?.addEventListener('click', () => {
            this.showGraph();
        });

        // Reset button
        document.getElementById('reset-experiment')?.addEventListener('click', () => {
            this.reset();
        });

        // Help button
        document.getElementById('help-btn')?.addEventListener('click', () => {
            document.getElementById('help-modal').classList.add('show');
        });

        // Close modal
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            document.getElementById('help-modal').classList.remove('show');
        });
    }

    nextStep() {
        if (this.state.currentStep < 4) {
            this.state.currentStep++;
            this.updateProgress();
            this.handleStepChange();
        }
    }

    handleStepChange() {
        switch (this.state.currentStep) {
            case 2:
                if (!this.state.springAttached) {
                    this.showHint('Сначала установите «Пружина №1» на установку, затем подвесьте груз.');
                } else {
                    this.showHint('Перетащите грузы на пружину для измерения удлинения');
                }
                break;
            case 3:
                this.showHint('Постройте график зависимости F(Δl) и определите жёсткость');
                break;
            case 4:
                this.showHint('Эксперимент завершён! Проверьте результаты.');
                this.state.experimentComplete = true;
                break;
        }
    }

    updateProgress() {
        const steps = document.querySelectorAll('.progress-step');
        steps.forEach((step, index) => {
            if (index < this.state.currentStep) {
                step.classList.add('completed');
            }
            if (index === this.state.currentStep - 1) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        document.getElementById('progress-fill').style.width = 
            `${(this.state.currentStep / 4) * 100}%`;
    }

    enableNextStep() {
        const btn = document.getElementById('next-step');
        if (btn) {
            btn.disabled = false;
            btn.classList.add('pulse');
        }
    }

    showHint(message) {
        const hintBox = document.querySelector('.hint-box p');
        if (hintBox) {
            hintBox.textContent = message;
            hintBox.parentElement.classList.add('pulse');
            setTimeout(() => {
                hintBox.parentElement.classList.remove('pulse');
            }, 2000);
        }
    }

    showError(message) {
        alert(message); // TODO: красивый error popup
    }

    playSound(type) {
        // TODO: добавить звуковые эффекты
        // const audio = new Audio(`/assets/sounds/${type}.mp3`);
        // audio.play().catch(() => {});
    }

    reset() {
        this.state.currentStep = 1;
        this.state.measurements = [];
        this.state.selectedWeights.clear();
        this.state.springLength = this.state.springNaturalLength;
        this.state.showGraph = false;
        this.state.experimentComplete = false;

        document.querySelectorAll('.weight-item').forEach(item => {
            item.classList.remove('used');
            item.style.transform = '';
            item.setAttribute('data-x', 0);
            item.setAttribute('data-y', 0);
        });

        document.getElementById('graph-section').style.display = 'none';
        
        this.updateProgress();
        this.updateMeasurementsTable();
        
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

        // Redraw static elements
        this.drawBackground();
        this.drawEquipment();
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
        canvasUtils.clear(ctx);

        const canvas = ctx.canvas;
        if (!this.state.springAttached) {
            this.drawSpringPlaceholder(ctx);
            return;
        }

        const anchor = this.getSpringAnchor();

        // Используем реальную длину из состояния (по умолчанию 3.5 см = 140px)
        const length = this.state.springLength || 140;
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
        
        // Измерительная линейка
        this.drawRuler(ctx, anchor.x + 80, anchor.y, length);
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

    drawRuler(ctx, x, y, height) {
        const rulerWidth = 50;
        const cmToPx = this.physics.pixelsPerCm; // 40px = 1cm
        
        // Линейка на 12 см — достаточно для экспериментов
        const maxCm = 12;
        const rulerHeight = maxCm * cmToPx; // 12 см * 40 px/см = 480px
        
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
        if (height <= rulerHeight) {
            const indicatorY = y + height;
            
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

    // ===== Подготовка оборудования: перетаскивание пружины =====
    setupEquipmentDragListeners() {
        const dynamicCanvas = document.getElementById('canvas-dynamic');
        
        if (!dynamicCanvas) {
            console.error('Dynamic canvas not found');
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
            const length = this.state.springLength || 140;
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

            const rect = dynamicCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.lastPointer = { x: e.clientX, y: e.clientY };

            const newAnchorX = x - dragOffset.x;
            const newAnchorY = y - dragOffset.y;

            this.state.springPosition = { x: newAnchorX, y: newAnchorY };
            this.clampSpringPosition();

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
            dynamicCanvas.style.cursor = 'default';
        };

        dynamicCanvas.addEventListener('mousedown', (e) => {
            const rect = dynamicCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (isClickOnSpring(x, y)) {
                isDragging = true;
                const anchor = getAnchor();
                dragOffset.x = x - anchor.x;
                dragOffset.y = y - anchor.y;
                dynamicCanvas.style.cursor = 'grabbing';
                window.addEventListener('mousemove', handlePointerMove);
                window.addEventListener('mouseup', handlePointerUp);
            }
        });
        
        dynamicCanvas.addEventListener('mousemove', (e) => {
            if (isDragging) return;
            const rect = dynamicCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            dynamicCanvas.style.cursor = isClickOnSpring(x, y) ? 'grab' : 'default';
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
