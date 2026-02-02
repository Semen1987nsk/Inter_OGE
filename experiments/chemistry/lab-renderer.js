/**
 * 🧫 Рендерер пробирок и лабораторного оборудования
 * Реалистичная визуализация химических экспериментов
 */

/**
 * Класс рендерера лаборатории
 */
export class LabRenderer {
    constructor(canvasContainer) {
        this.container = canvasContainer;
        this.layers = {};
        this.scale = window.devicePixelRatio || 1;
        this.width = 0;
        this.height = 0;
        this.animationId = null;
        this.objects = new Map();
        this.effects = [];
        
        this._initCanvases();
        this._setupResizeHandler();
    }

    /**
     * Инициализация слоёв canvas
     */
    _initCanvases() {
        const canvasIds = ['background', 'equipment', 'liquids', 'effects', 'ui'];
        
        for (const id of canvasIds) {
            const canvas = document.getElementById(`canvas-${id}`);
            if (canvas) {
                this.layers[id] = {
                    canvas: canvas,
                    ctx: canvas.getContext('2d')
                };
            }
        }

        this._updateCanvasSize();
    }

    /**
     * Обновить размеры canvas
     */
    _updateCanvasSize() {
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        for (const layer of Object.values(this.layers)) {
            layer.canvas.width = this.width * this.scale;
            layer.canvas.height = this.height * this.scale;
            layer.canvas.style.width = `${this.width}px`;
            layer.canvas.style.height = `${this.height}px`;
            layer.ctx.scale(this.scale, this.scale);
        }
    }

    /**
     * Обработчик изменения размера
     */
    _setupResizeHandler() {
        const resizeObserver = new ResizeObserver(() => {
            this._updateCanvasSize();
            this.render();
        });
        resizeObserver.observe(this.container);
    }

    /**
     * Отрисовать фон лаборатории
     */
    renderBackground() {
        const ctx = this.layers.background?.ctx;
        if (!ctx) return;

        // Градиентный фон
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#E3F2FD');
        gradient.addColorStop(1, '#BBDEFB');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Рабочая поверхность (стол)
        const tableY = this.height * 0.7;
        const tableGradient = ctx.createLinearGradient(0, tableY, 0, this.height);
        tableGradient.addColorStop(0, '#8D6E63');
        tableGradient.addColorStop(0.1, '#6D4C41');
        tableGradient.addColorStop(1, '#5D4037');
        
        ctx.fillStyle = tableGradient;
        ctx.fillRect(0, tableY, this.width, this.height - tableY);

        // Текстура дерева
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let y = tableY + 10; y < this.height; y += 15) {
            ctx.beginPath();
            ctx.moveTo(0, y + Math.random() * 3);
            ctx.lineTo(this.width, y + Math.random() * 3);
            ctx.stroke();
        }

        // Тень от края стола
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, tableY, this.width, 5);
    }

    /**
     * Отрисовать штатив с пробирками
     */
    renderTestTubeRack(x, y, tubes) {
        const ctx = this.layers.equipment?.ctx;
        if (!ctx) return;

        const tubeWidth = 28;
        const tubeHeight = 90;
        const tubeSpacing = 10;
        const numTubes = tubes.length;
        const rackWidth = numTubes * (tubeWidth + tubeSpacing) + 20;
        const rackHeight = 30;

        // Основание штатива
        const rackY = y + tubeHeight - 10;
        
        // Верхняя перекладина
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.roundRect(x, rackY, rackWidth, 12, 4);
        ctx.fill();
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Отверстия для пробирок
        ctx.fillStyle = '#5D4037';
        for (let i = 0; i < numTubes; i++) {
            const tubeX = x + 10 + i * (tubeWidth + tubeSpacing) + tubeWidth / 2;
            ctx.beginPath();
            ctx.ellipse(tubeX, rackY + 6, tubeWidth / 2 + 2, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Отрисовка каждой пробирки
        tubes.forEach((tube, i) => {
            const tubeX = x + 10 + i * (tubeWidth + tubeSpacing);
            this.renderTestTube(tubeX, y, tubeWidth, tubeHeight, tube);
        });
    }

    /**
     * Отрисовать пробирку
     */
    renderTestTube(x, y, width, height, tubeState) {
        const ctx = this.layers.equipment?.ctx;
        const liquidCtx = this.layers.liquids?.ctx;
        if (!ctx || !liquidCtx) return;

        const centerX = x + width / 2;
        const bottomRadius = width / 2;

        // Стеклянная пробирка (корпус)
        ctx.save();
        
        // Основная форма пробирки
        ctx.beginPath();
        ctx.moveTo(x + 2, y);
        ctx.lineTo(x + 2, y + height - bottomRadius);
        ctx.arc(centerX, y + height - bottomRadius, bottomRadius - 2, Math.PI, 0, true);
        ctx.lineTo(x + width - 2, y);
        ctx.closePath();

        // Градиент стекла
        const glassGradient = ctx.createLinearGradient(x, 0, x + width, 0);
        glassGradient.addColorStop(0, 'rgba(200, 200, 200, 0.4)');
        glassGradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.7)');
        glassGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        glassGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.7)');
        glassGradient.addColorStop(1, 'rgba(180, 180, 180, 0.5)');
        
        ctx.fillStyle = glassGradient;
        ctx.fill();
        
        // Контур
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Блик на стекле
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 5);
        ctx.lineTo(x + 6, y + height * 0.6);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // Жидкость (на отдельном слое)
        if (tubeState && tubeState.liquidLevel > 0) {
            liquidCtx.save();
            
            const liquidHeight = (tubeState.liquidLevel / 100) * (height - bottomRadius);
            const liquidY = y + height - bottomRadius - liquidHeight;

            liquidCtx.beginPath();
            liquidCtx.moveTo(x + 4, liquidY);
            liquidCtx.lineTo(x + 4, y + height - bottomRadius);
            liquidCtx.arc(centerX, y + height - bottomRadius, bottomRadius - 4, Math.PI, 0, true);
            liquidCtx.lineTo(x + width - 4, liquidY);
            liquidCtx.closePath();

            liquidCtx.fillStyle = tubeState.liquidColor;
            liquidCtx.fill();

            // Поверхность жидкости
            liquidCtx.beginPath();
            liquidCtx.ellipse(centerX, liquidY, (width - 8) / 2, 3, 0, 0, Math.PI * 2);
            liquidCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            liquidCtx.fill();

            liquidCtx.restore();
        }

        // Осадок
        if (tubeState && tubeState.precipitateLevel > 0 && tubeState.precipitateColor) {
            liquidCtx.save();
            
            const precipHeight = (tubeState.precipitateLevel / 100) * (height - bottomRadius) * 0.5;
            const precipY = y + height - bottomRadius - precipHeight;

            liquidCtx.beginPath();
            liquidCtx.moveTo(x + 4, precipY);
            liquidCtx.lineTo(x + 4, y + height - bottomRadius);
            liquidCtx.arc(centerX, y + height - bottomRadius, bottomRadius - 4, Math.PI, 0, true);
            liquidCtx.lineTo(x + width - 4, precipY);
            liquidCtx.closePath();

            liquidCtx.fillStyle = tubeState.precipitateColor;
            liquidCtx.fill();

            // Неровный верхний край осадка
            liquidCtx.beginPath();
            for (let px = x + 4; px <= x + width - 4; px += 3) {
                const py = precipY + (Math.random() - 0.5) * 4;
                if (px === x + 4) {
                    liquidCtx.moveTo(px, py);
                } else {
                    liquidCtx.lineTo(px, py);
                }
            }
            liquidCtx.strokeStyle = tubeState.precipitateColor;
            liquidCtx.lineWidth = 3;
            liquidCtx.stroke();

            liquidCtx.restore();
        }
    }

    /**
     * Отрисовать флакон с веществом
     */
    renderBottle(x, y, width, height, label, contentColor, isSelected = false) {
        const ctx = this.layers.equipment?.ctx;
        const liquidCtx = this.layers.liquids?.ctx;
        if (!ctx) return;

        const centerX = x + width / 2;

        // Пробка
        const corkWidth = width * 0.4;
        const corkHeight = 10;
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.roundRect(centerX - corkWidth / 2, y - corkHeight, corkWidth, corkHeight, [4, 4, 0, 0]);
        ctx.fill();

        // Горлышко
        const neckWidth = width * 0.35;
        const neckHeight = height * 0.15;
        ctx.fillStyle = 'rgba(220, 220, 220, 0.8)';
        ctx.fillRect(centerX - neckWidth / 2, y, neckWidth, neckHeight);
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - neckWidth / 2, y, neckWidth, neckHeight);

        // Корпус флакона
        const bodyY = y + neckHeight;
        const bodyHeight = height - neckHeight;
        
        ctx.save();
        
        // Форма флакона
        ctx.beginPath();
        ctx.moveTo(centerX - neckWidth / 2, bodyY);
        // Расширение к корпусу
        ctx.quadraticCurveTo(x, bodyY, x, bodyY + bodyHeight * 0.2);
        ctx.lineTo(x, y + height - 15);
        ctx.quadraticCurveTo(x, y + height, x + 15, y + height);
        ctx.lineTo(x + width - 15, y + height);
        ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - 15);
        ctx.lineTo(x + width, bodyY + bodyHeight * 0.2);
        ctx.quadraticCurveTo(x + width, bodyY, centerX + neckWidth / 2, bodyY);
        ctx.closePath();

        // Стекло
        const bottleGradient = ctx.createLinearGradient(x, 0, x + width, 0);
        bottleGradient.addColorStop(0, 'rgba(200, 200, 200, 0.6)');
        bottleGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        bottleGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
        bottleGradient.addColorStop(1, 'rgba(180, 180, 180, 0.6)');
        
        ctx.fillStyle = bottleGradient;
        ctx.fill();
        
        // Выделение при выборе
        if (isSelected) {
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.lineWidth = 2;
        }
        ctx.stroke();

        ctx.restore();

        // Содержимое флакона
        if (liquidCtx && contentColor) {
            liquidCtx.save();
            
            const fillHeight = bodyHeight * 0.6;
            const fillY = y + height - 15 - fillHeight;

            liquidCtx.beginPath();
            liquidCtx.moveTo(x + 5, fillY);
            liquidCtx.lineTo(x + 5, y + height - 15);
            liquidCtx.quadraticCurveTo(x + 5, y + height - 5, x + 15, y + height - 5);
            liquidCtx.lineTo(x + width - 15, y + height - 5);
            liquidCtx.quadraticCurveTo(x + width - 5, y + height - 5, x + width - 5, y + height - 15);
            liquidCtx.lineTo(x + width - 5, fillY);
            liquidCtx.closePath();

            liquidCtx.fillStyle = contentColor;
            liquidCtx.fill();

            liquidCtx.restore();
        }

        // Этикетка
        if (label) {
            ctx.save();
            
            const labelWidth = width - 10;
            const labelHeight = 25;
            const labelX = x + 5;
            const labelY = bodyY + bodyHeight * 0.35;

            ctx.fillStyle = 'white';
            ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 1;
            ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);

            ctx.fillStyle = '#1B5E20';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, centerX, labelY + labelHeight / 2);

            ctx.restore();
        }
    }

    /**
     * Отрисовать пузырьки газа
     */
    renderBubbles(x, y, width, height) {
        const ctx = this.layers.effects?.ctx;
        if (!ctx) return;

        const time = Date.now() / 1000;
        const numBubbles = 8;

        for (let i = 0; i < numBubbles; i++) {
            const offset = i * (Math.PI * 2 / numBubbles);
            const bubbleX = x + width / 2 + Math.sin(time * 3 + offset) * (width / 4);
            const bubbleY = y + height - ((time * 30 + i * 20) % height);
            const radius = 2 + Math.sin(time * 2 + i) * 1;

            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(200, 220, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    /**
     * Анимация наливания жидкости
     */
    animatePour(fromX, fromY, toX, toY, color, duration = 1000) {
        const startTime = Date.now();
        const ctx = this.layers.effects?.ctx;
        if (!ctx) return Promise.resolve();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Очищаем слой эффектов
                ctx.clearRect(0, 0, this.width, this.height);

                if (progress < 1) {
                    // Рисуем струю
                    const midX = fromX + (toX - fromX) * progress;
                    const midY = fromY + (toY - fromY) * progress + Math.sin(progress * Math.PI) * 20;

                    ctx.beginPath();
                    ctx.moveTo(fromX, fromY);
                    ctx.quadraticCurveTo(
                        fromX + (midX - fromX) * 0.5,
                        fromY + (midY - fromY) * 0.3,
                        midX, midY
                    );
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 4;
                    ctx.lineCap = 'round';
                    ctx.stroke();

                    // Капли
                    for (let i = 0; i < 3; i++) {
                        const dropProgress = (progress * 3 + i * 0.3) % 1;
                        const dropX = fromX + (toX - fromX) * dropProgress + (Math.random() - 0.5) * 5;
                        const dropY = fromY + (toY - fromY) * dropProgress * dropProgress;
                        
                        ctx.beginPath();
                        ctx.ellipse(dropX, dropY, 3, 4, 0, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.fill();
                    }

                    requestAnimationFrame(animate);
                } else {
                    ctx.clearRect(0, 0, this.width, this.height);
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Анимация выпадения осадка
     */
    animatePrecipitate(x, y, width, height, color, duration = 2000) {
        const startTime = Date.now();
        const particles = [];
        const ctx = this.layers.effects?.ctx;
        if (!ctx) return Promise.resolve();

        // Создаём частицы
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: x + Math.random() * width,
                y: y + Math.random() * height * 0.5,
                vy: 0.5 + Math.random() * 1.5,
                radius: 1 + Math.random() * 2,
                opacity: 0.8 + Math.random() * 0.2
            });
        }

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;

                ctx.clearRect(0, 0, this.width, this.height);

                if (elapsed < duration) {
                    for (const p of particles) {
                        p.y += p.vy;
                        p.vy += 0.02; // гравитация

                        // Ограничиваем дно
                        if (p.y > y + height - 10) {
                            p.y = y + height - 10;
                            p.vy = 0;
                        }

                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                        ctx.fillStyle = color.replace(/[\d.]+\)$/, `${p.opacity})`);
                        ctx.fill();
                    }

                    requestAnimationFrame(animate);
                } else {
                    ctx.clearRect(0, 0, this.width, this.height);
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Очистить все слои
     */
    clear() {
        for (const layer of Object.values(this.layers)) {
            layer.ctx.clearRect(0, 0, this.width, this.height);
        }
    }

    /**
     * Очистить конкретный слой
     */
    clearLayer(layerName) {
        const layer = this.layers[layerName];
        if (layer) {
            layer.ctx.clearRect(0, 0, this.width, this.height);
        }
    }

    /**
     * Полная отрисовка сцены
     */
    render() {
        this.clear();
        this.renderBackground();
    }

    /**
     * Запустить анимационный цикл
     */
    startAnimation() {
        let lastTime = 0;
        
        const loop = (timestamp) => {
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;

            // Обновляем эффекты
            this.updateEffects(deltaTime);
            
            this.animationId = requestAnimationFrame(loop);
        };

        this.animationId = requestAnimationFrame(loop);
    }

    /**
     * Остановить анимацию
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Обновить эффекты
     */
    updateEffects(deltaTime) {
        const ctx = this.layers.effects?.ctx;
        if (!ctx) return;

        // Здесь можно добавить постоянные эффекты
    }
}

/**
 * Класс интерактивного управления пробирками
 */
export class TubeInteractionManager {
    constructor(renderer, onDrop) {
        this.renderer = renderer;
        this.onDrop = onDrop;
        this.draggedItem = null;
        this.dropZones = [];
        
        this._setupEventListeners();
    }

    /**
     * Настройка обработчиков событий
     */
    _setupEventListeners() {
        const container = this.renderer.container;

        // Drag events
        container.addEventListener('dragover', (e) => this._handleDragOver(e));
        container.addEventListener('drop', (e) => this._handleDrop(e));
        container.addEventListener('dragleave', (e) => this._handleDragLeave(e));
    }

    /**
     * Зарегистрировать зону для drop
     */
    registerDropZone(id, x, y, width, height, type = 'tube') {
        this.dropZones.push({ id, x, y, width, height, type });
    }

    /**
     * Проверить попадание в зону
     */
    getDropZone(clientX, clientY) {
        const rect = this.renderer.container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        for (const zone of this.dropZones) {
            if (x >= zone.x && x <= zone.x + zone.width &&
                y >= zone.y && y <= zone.y + zone.height) {
                return zone;
            }
        }
        return null;
    }

    /**
     * Обработка dragover
     */
    _handleDragOver(e) {
        e.preventDefault();
        const zone = this.getDropZone(e.clientX, e.clientY);
        
        // Подсветка зоны
        const ctx = this.renderer.layers.ui?.ctx;
        if (ctx && zone) {
            ctx.clearRect(0, 0, this.renderer.width, this.renderer.height);
            ctx.fillStyle = 'rgba(46, 125, 50, 0.2)';
            ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
            ctx.setLineDash([]);
        }
    }

    /**
     * Обработка drop
     */
    _handleDrop(e) {
        e.preventDefault();
        const zone = this.getDropZone(e.clientX, e.clientY);
        
        // Очистка UI слоя
        const ctx = this.renderer.layers.ui?.ctx;
        if (ctx) {
            ctx.clearRect(0, 0, this.renderer.width, this.renderer.height);
        }

        if (zone && this.onDrop) {
            const data = e.dataTransfer.getData('text/plain');
            this.onDrop(zone, JSON.parse(data));
        }
    }

    /**
     * Обработка dragleave
     */
    _handleDragLeave(e) {
        const ctx = this.renderer.layers.ui?.ctx;
        if (ctx) {
            ctx.clearRect(0, 0, this.renderer.width, this.renderer.height);
        }
    }
}

export default LabRenderer;
