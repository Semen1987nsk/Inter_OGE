/**
 * SpringRenderer - модуль отрисовки пружины, грузов и динамометра
 * 
 * @module SpringRenderer
 * @description Canvas-рендеринг для лабораторной работы по определению
 * жёсткости пружины. Использует многослойную архитектуру canvas
 * и кэширование для оптимизации производительности.
 * 
 * Отвечает за:
 * - Отрисовку пружины с витками и крючками
 * - Отрисовку подвешенных грузов и свободных грузов
 * - Отрисовку динамометра и его шкалы
 * - Отрисовку измерительной линейки
 * - Кеширование отрендеренных элементов
 * 
 * @example
 * const renderer = new SpringRenderer(experiment);
 * renderer.drawDynamic(ctx, isOverloaded);
 * renderer.drawRuler(ctx, config);
 */

/**
 * @typedef {Object} SpringCache
 * @property {HTMLCanvasElement|null} canvas - Offscreen canvas для кэша
 * @property {CanvasRenderingContext2D|null} ctx - Контекст кэша
 * @property {number} lastLength - Последняя отрисованная длина
 * @property {number} lastCoils - Последнее количество витков
 * @property {boolean} lastOverloaded - Состояние перегрузки
 * @property {boolean} needsUpdate - Требуется ли перерисовка
 */

/**
 * @typedef {Object} RulerConfig
 * @property {number} x - X координата линейки
 * @property {number} y - Y координата верха линейки
 * @property {number} height - Высота линейки в px
 * @property {number} pixelsPerCm - Пикселей на сантиметр
 */

export class SpringRenderer {
    /**
     * Создаёт рендерер пружины
     * @param {Object} experiment - Ссылка на главный класс SpringExperiment
     */
    constructor(experiment) {
        /** @type {Object} Ссылка на эксперимент */
        this.experiment = experiment;
        
        /** @type {SpringCache} Кеш для пружины (offscreen canvas) */
        this.springCache = {
            canvas: null,
            ctx: null,
            lastLength: 0,
            lastCoils: 0,
            lastOverloaded: false,
            needsUpdate: true
        };
        
        this.initSpringCache();
    }
    
    /**
     * Инициализация offscreen canvas для кеширования пружины
     * @private
     * @returns {void}
     */
    initSpringCache() {
        this.springCache.canvas = document.createElement('canvas');
        this.springCache.canvas.width = 200;
        this.springCache.canvas.height = 600;
        this.springCache.ctx = this.springCache.canvas.getContext('2d');
    }
    
    /**
     * Инвалидация кеша (вызывается при изменении параметров пружины)
     */
    invalidateCache() {
        this.springCache.needsUpdate = true;
    }
    
    /**
     * Отрисовка фона (очистка слоя)
     * @param {CanvasRenderingContext2D} ctx - Контекст фонового слоя
     */
    drawBackground(ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }
    
    /**
     * Отрисовка слоя оборудования
     * @param {CanvasRenderingContext2D} ctx - Контекст слоя оборудования
     */
    drawEquipment(ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }
    
    /**
     * Основной метод отрисовки динамического слоя
     * @param {CanvasRenderingContext2D} ctx - Контекст динамического слоя
     * @param {boolean} isOverloaded - Флаг перегрузки пружины
     */
    drawDynamic(ctx, isOverloaded = false) {
        // Полная очистка с сохранением контекста
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
        
        const exp = this.experiment;
        
        // Если установлен ДИНАМОМЕТР - рисуем только его
        if (exp.state.dynamometerAttached) {
            this.drawDynamometerSetup(ctx);
            return;
        }
        
        // Если ПРУЖИНА не установлена - показываем плейсхолдер
        if (!exp.state.springAttached) {
            this.drawSpringPlaceholder(ctx);
            return;
        }
        
        // Рисуем полную установку с пружиной
        this.drawSpringSetup(ctx, isOverloaded);
    }
    
    /**
     * Отрисовка установки с пружиной
     * @param {CanvasRenderingContext2D} ctx - Контекст
     * @param {boolean} isOverloaded - Флаг перегрузки
     */
    drawSpringSetup(ctx, isOverloaded) {
        const exp = this.experiment;
        const anchor = exp.getSpringAnchor();
        
        const physicalLength = exp.state.springLength || exp.state.springNaturalLength;
        const length = exp.getVisualLength(physicalLength);
        const coils = 14;
        const wireRadius = 5;
        const springRadius = 22;
        
        // Название оборудования
        this.drawEquipmentLabel(ctx, anchor.x, anchor.y - 35);
        
        // Проверяем, нужно ли перерисовать кеш пружины
        if (this.springCache.needsUpdate || 
            this.springCache.lastLength !== length || 
            this.springCache.lastCoils !== coils ||
            this.springCache.lastOverloaded !== isOverloaded) {
            
            this.renderSpringToCache(anchor, length, coils, springRadius, wireRadius, isOverloaded);
        }
        
        // Рисуем закешированную пружину из offscreen canvas
        ctx.drawImage(
            this.springCache.canvas,
            0, 0, 200, length + 100,
            anchor.x - 100, anchor.y - 50, 200, length + 100
        );
        
        // Подвешенные грузы
        this.drawAttachedWeights(ctx, anchor.x, anchor.y + length);
        
        // Измерительная линейка
        this.drawRuler(ctx, anchor.x + 80, anchor.y, physicalLength);
        
        // Свободные грузы
        this.drawFreeWeights(ctx);
        
        // Зона прилипания для перетаскиваемого груза
        this.drawSnapZone(ctx, anchor.x, anchor.y + length);
    }
    
    /**
     * Рендеринг пружины в offscreen canvas (кеш)
     */
    renderSpringToCache(anchor, length, coils, springRadius, wireRadius, isOverloaded) {
        const cacheCtx = this.springCache.ctx;
        
        // Увеличиваем canvas если нужно
        const requiredHeight = length + 150;
        if (this.springCache.canvas.height < requiredHeight) {
            this.springCache.canvas.height = requiredHeight;
        }
        
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
    
    /**
     * Отрисовка витков пружины
     */
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
            
            // Тело витка
            ctx.save();
            const coilGrad = ctx.createLinearGradient(
                anchor.x - springRadius, y,
                anchor.x + springRadius, y
            );
            
            if (isOverloaded) {
                // Красный оттенок при перегрузке
                coilGrad.addColorStop(0, '#d0b8b8');
                coilGrad.addColorStop(0.2, '#f2e8e8');
                coilGrad.addColorStop(0.5, '#fbf8f8');
                coilGrad.addColorStop(0.8, '#e6d4d4');
                coilGrad.addColorStop(1, '#b29a9a');
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
    
    /**
     * Отрисовка верхнего крючка пружины
     */
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
    
    /**
     * Отрисовка нижнего крючка пружины (U-образный)
     */
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
    
    /**
     * Отрисовка измерительной линейки
     */
    drawRuler(ctx, x, y, physicalHeightPx) {
        const exp = this.experiment;
        const rulerWidth = 50;
        const cmToPx = exp.getVisualPixelsPerCm();
        const canvas = ctx.canvas;
        
        // Поддерживаем пружины до 30 см
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
        
        // Индикатор текущей длины пружины
        const visualHeight = physicalHeightPx * exp.visual.scale;
        
        if (visualHeight <= rulerHeight) {
            const indicatorY = y + visualHeight;
            
            // Стрелка-указатель
            ctx.save();
            ctx.fillStyle = 'rgba(255, 179, 0, 0.9)';
            ctx.beginPath();
            ctx.moveTo(x, indicatorY);
            ctx.lineTo(x - 8, indicatorY - 6);
            ctx.lineTo(x - 8, indicatorY + 6);
            ctx.closePath();
            ctx.fill();
            
            // Пунктирная линия до пружины
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
            // Подсветка низа линейки если пружина длиннее
            ctx.save();
            ctx.fillStyle = 'rgba(255, 179, 0, 0.8)';
            ctx.fillRect(x - 6, y + rulerHeight - 8, 12, 8);
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    /**
     * Отрисовка названия оборудования
     */
    drawEquipmentLabel(ctx, x, y) {
        const exp = this.experiment;
        
        ctx.save();
        
        const attachedSpring = exp.getAttachedSpring();
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
        
        ctx.fillStyle = '#E8EAF6';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        
        ctx.restore();
    }
    
    /**
     * Отрисовка плейсхолдера для пружины (когда не установлена)
     */
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
        
        // Рисуем свободные грузы даже без пружины
        this.drawFreeWeights(ctx);
    }
    
    /**
     * Отрисовка подвешенных на пружину грузов
     */
    drawAttachedWeights(ctx, hookX, hookY) {
        const exp = this.experiment;
        
        if (!exp.state.weightAttached || !exp.state.attachedWeights?.length) {
            return;
        }
        
        let currentY = hookY;
        const now = performance.now() / 1000;
        
        exp.state.attachedWeights.forEach((item, index) => {
            const def = exp.getWeightById(item.id);
            if (!def) return;
            
            const img = exp.images.weights[item.id] || exp.images.weights[def.id];
            const targetSize = def.targetSize ?? 72;
            const hookGap = def.hookGap ?? 22;
            const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
            const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
            
            // Мягкое покачивание
            const rotationAmplitude = exp.state.isAnimating ? 0.12 : 0.02;
            const rotation = Math.sin(now * 1.5 + index * 0.4) * rotationAmplitude;
            
            // Соединительный крючок
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
            
            // Диски на штанге (наборный груз)
            if (item.compositeDisks && item.compositeDisks.length > 0) {
                this.drawCompositeDisks(ctx, hookX, centerY, renderedHeight, item.compositeDisks);
            }
            
            currentY = centerY + renderedHeight / 2;
        });
    }
    
    /**
     * Отрисовка дисков на штанге наборного груза
     */
    drawCompositeDisks(ctx, x, centerY, rodHeight, disks) {
        const exp = this.experiment;
        
        ctx.save();
        
        // Позиция опорного кольца (82.5% от верха)
        const rodSupportRingY = centerY + rodHeight * 0.325;
        let currentBottomY = rodSupportRingY;
        
        disks.forEach((disk, index) => {
            const diskDef = exp.getWeightById(disk.weightId);
            if (!diskDef) return;
            
            const diskImg = exp.images.weights[disk.weightId] || exp.images.weights[diskDef.id];
            const diskTargetSize = diskDef.targetSize ?? 50;
            const diskScale = diskTargetSize / (diskImg ? Math.max(diskImg.width, diskImg.height) : diskTargetSize);
            
            // Реальная толщина диска (~17% от высоты изображения)
            const diskHeight = diskImg ? diskImg.height * diskScale * 0.17 : diskTargetSize * 0.2;
            const diskY = currentBottomY - diskHeight / 2;
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 4;
            
            if (diskImg) {
                ctx.save();
                ctx.translate(x, diskY);
                ctx.scale(diskScale, diskScale);
                ctx.drawImage(diskImg, -diskImg.width / 2, -diskImg.height / 2);
                ctx.restore();
            } else {
                ctx.fillStyle = '#888';
                ctx.fillRect(x - diskTargetSize/2, diskY - diskHeight/2, diskTargetSize, diskHeight);
            }
            
            currentBottomY = diskY - diskHeight / 2;
        });
        
        ctx.restore();
    }
    
    /**
     * Отрисовка свободных грузов (не прикреплённых к пружине)
     */
    drawFreeWeights(ctx) {
        const exp = this.experiment;
        
        if (!exp.state.freeWeights || exp.state.freeWeights.length === 0) return;
        
        exp.state.freeWeights.forEach(weight => {
            const weightDef = exp.getWeightById(weight.weightId);
            if (!weightDef) return;
            
            const img = exp.images.weights[weight.weightId] || exp.images.weights[weightDef.id];
            const targetSize = weightDef.targetSize ?? 72;
            const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
            const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
            
            ctx.save();
            
            // Проверка близости к другим грузам
            let nearOtherWeight = false;
            if (weight.isDragging) {
                for (let other of exp.state.freeWeights) {
                    if (other === weight) continue;
                    if (exp.canStackWeights && exp.canStackWeights(other, weight)) {
                        nearOtherWeight = true;
                        break;
                    }
                }
            }
            
            // Подсветка при перетаскивании
            if (weight.isDragging) {
                if (nearOtherWeight) {
                    ctx.shadowColor = 'rgba(0, 255, 100, 0.9)';
                    ctx.shadowBlur = 30;
                } else {
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
            
            // Рисуем груз
            if (img) {
                const scale = targetSize / Math.max(img.width, img.height);
                ctx.translate(weight.x, weight.y);
                ctx.scale(scale, scale);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
            } else {
                this.drawWeightPlaceholder(ctx, weight.x, weight.y, targetSize, renderedHeight, 0);
            }
            
            ctx.restore();
            
            // Крючки при перетаскивании
            if (weight.isDragging) {
                this.drawDragHookIndicators(ctx, weight, renderedHeight);
            }
            
            // Зона прилипания для стационарного груза
            if (!weight.isDragging) {
                this.drawWeightSnapZone(ctx, weight, renderedHeight);
            }
            
            // Диски на штанге
            if (weight.compositeDisks && weight.compositeDisks.length > 0) {
                this.drawFreeWeightDisks(ctx, weight, renderedHeight);
            }
            
            // Стопка прикреплённых грузов
            if (weight.stackedWeights && weight.stackedWeights.length > 0) {
                this.drawStackedWeights(ctx, weight, renderedHeight);
            }
        });
    }
    
    /**
     * Отрисовка индикаторов крючков при перетаскивании груза
     */
    drawDragHookIndicators(ctx, weight, renderedHeight) {
        ctx.save();
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Верхний крючок
        const topHookY = weight.y - renderedHeight/2 - 12;
        ctx.beginPath();
        ctx.arc(weight.x, topHookY, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // Нижний крючок
        const bottomHookY = weight.y + renderedHeight/2 + 8;
        ctx.beginPath();
        ctx.arc(weight.x, bottomHookY, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Отрисовка зоны прилипания для стационарного груза
     */
    drawWeightSnapZone(ctx, weight, renderedHeight) {
        const exp = this.experiment;
        
        let showSnapZone = false;
        for (let other of exp.state.freeWeights) {
            if (!other.isDragging) continue;
            if (exp.canStackWeights && exp.canStackWeights(weight, other)) {
                showSnapZone = true;
                break;
            }
        }
        
        if (showSnapZone) {
            ctx.save();
            
            const bottomHookY = weight.y + renderedHeight/2 + 8;
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(weight.x, bottomHookY, 30, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(0, 255, 100, 0.15)';
            ctx.fill();
            
            ctx.restore();
        }
    }
    
    /**
     * Отрисовка дисков на свободной штанге
     */
    drawFreeWeightDisks(ctx, weight, rodHeight) {
        const exp = this.experiment;
        
        ctx.save();
        
        const rodSupportRingY = weight.y + rodHeight * 0.325;
        let currentBottomY = rodSupportRingY;
        
        weight.compositeDisks.forEach((disk, index) => {
            const diskDef = exp.getWeightById(disk.weightId);
            if (!diskDef) return;
            
            const diskImg = exp.images.weights[disk.weightId] || exp.images.weights[diskDef.id];
            const diskTargetSize = diskDef.targetSize ?? 50;
            const diskScale = diskTargetSize / (diskImg ? Math.max(diskImg.width, diskImg.height) : diskTargetSize);
            const diskHeight = diskImg ? diskImg.height * diskScale * 0.17 : diskTargetSize * 0.2;
            const diskY = currentBottomY - diskHeight / 2;
            
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
                ctx.fillStyle = '#888';
                ctx.fillRect(weight.x - diskTargetSize/2, diskY - diskHeight/2, diskTargetSize, diskHeight);
            }
            
            currentBottomY = diskY - diskHeight / 2;
        });
        
        ctx.restore();
    }
    
    /**
     * Отрисовка стопки грузов на свободном грузе
     */
    drawStackedWeights(ctx, weight, baseHeight) {
        const exp = this.experiment;
        const hookGap = 22;
        
        ctx.save();
        
        let currentTopY = weight.y + baseHeight / 2 + hookGap;
        
        weight.stackedWeights.forEach((stackedWeight, stackIndex) => {
            const stackedDef = exp.getWeightById(stackedWeight.weightId || stackedWeight.id);
            if (!stackedDef) return;
            
            const stackImg = exp.images.weights[stackedWeight.weightId] || exp.images.weights[stackedDef.id];
            const stackTargetSize = stackedDef.targetSize ?? 72;
            const stackScale = stackTargetSize / (stackImg ? Math.max(stackImg.width, stackImg.height) : stackTargetSize);
            const stackHeight = stackImg ? stackImg.height * stackScale : stackTargetSize * 0.9;
            
            // Соединительный крючок
            ctx.strokeStyle = 'rgba(180, 180, 180, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(weight.x, currentTopY - hookGap);
            ctx.lineTo(weight.x, currentTopY);
            ctx.stroke();
            
            const stackCenterY = currentTopY + stackHeight / 2;
            
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
                ctx.fillStyle = '#888';
                ctx.fillRect(weight.x - stackTargetSize/2, stackCenterY - stackHeight/2, stackTargetSize, stackHeight);
            }
            
            currentTopY = stackCenterY + stackHeight / 2 + hookGap;
        });
        
        ctx.restore();
    }
    
    /**
     * Отрисовка зоны прилипания к крючку пружины
     */
    drawSnapZone(ctx, springBottomHookX, springBottomHookY) {
        const exp = this.experiment;
        const draggedWeight = exp.state.freeWeights?.find(w => w.isDragging);
        
        if (!draggedWeight) return;
        
        const weightDef = exp.getWeightById(draggedWeight.weightId);
        const img = weightDef ? (exp.images.weights[draggedWeight.weightId] || exp.images.weights[weightDef.id]) : null;
        const targetSize = weightDef?.targetSize ?? 72;
        const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
        const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
        
        const weightTopHookX = draggedWeight.x;
        const weightTopHookY = draggedWeight.y - renderedHeight/2 - 12;
        
        const distance = Math.hypot(weightTopHookX - springBottomHookX, weightTopHookY - springBottomHookY);
        const isSnapped = distance < 100;
        
        ctx.save();
        
        if (isSnapped) {
            ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
            ctx.lineWidth = 5;
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(50, 255, 50, 0.3)';
            
            // Иконка якоря
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillText('⚓', springBottomHookX, springBottomHookY);
            ctx.fillStyle = 'rgba(50, 255, 50, 0.3)';
        } else {
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.5)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
        }
        
        ctx.beginPath();
        ctx.arc(springBottomHookX, springBottomHookY, 100, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Отрисовка плейсхолдера груза (когда нет изображения)
     */
    drawWeightPlaceholder(ctx, x, y, size, height, rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        ctx.fillStyle = '#666';
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(-size/2, -height/2, size, height, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Отрисовка установки с динамометром
     */
    drawDynamometerSetup(ctx) {
        const exp = this.experiment;
        const canvas = ctx.canvas;
        const centerX = exp.state.dynamometerPosition.x;
        const centerY = exp.state.dynamometerPosition.y;
        
        const dynamometer = exp.getEquipmentById(exp.state.attachedDynamometerId);
        if (!dynamometer) return;
        
        const maxForce = dynamometer.maxForce;
        const scale = dynamometer.scale;
        
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
        
        ctx.beginPath();
        ctx.arc(centerX, topHookY - 8, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // === НАЗВАНИЕ ===
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
        
        ctx.beginPath();
        ctx.moveTo(scaleX, scaleTop);
        ctx.lineTo(scaleX, scaleTop + scaleHeight);
        ctx.stroke();
        
        const numDivisions = maxForce / scale;
        for (let i = 0; i <= numDivisions; i++) {
            const markForce = i * scale;
            const markY = scaleTop + scaleHeight - (markForce / maxForce) * scaleHeight;
            
            ctx.beginPath();
            ctx.moveTo(scaleX - 12, markY);
            ctx.lineTo(scaleX + 12, markY);
            ctx.stroke();
            
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(markForce.toFixed(1), scaleX - 16, markY + 3);
        }
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Н', scaleX + 30, scaleTop - 5);
        
        // === УКАЗАТЕЛЬ ===
        const totalMass = exp.getTotalAttachedMass();
        const force = (totalMass / 1000) * exp.physics.gravity;
        const indicatorY = scaleTop + scaleHeight - (Math.min(force, maxForce) / maxForce) * scaleHeight;
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.moveTo(scaleX + 15, indicatorY);
        ctx.lineTo(scaleX + 25, indicatorY - 5);
        ctx.lineTo(scaleX + 25, indicatorY + 5);
        ctx.closePath();
        ctx.fill();
        
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
        
        // === НИЖНИЙ КРЮЧОК ===
        const bottomHookY = centerY + height;
        
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(centerX, bottomHookY);
        ctx.lineTo(centerX, bottomHookY + 15);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, bottomHookY + 23, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // === ПОДВЕШЕННЫЕ ГРУЗЫ ===
        const gruzHookY = bottomHookY + 31;
        this.drawAttachedWeights(ctx, centerX, gruzHookY);
        
        // Свободные грузы
        this.drawFreeWeights(ctx);
        
        // Зона прилипания динамометра
        const draggedWeight = exp.state.freeWeights?.find(w => w.isDragging);
        if (draggedWeight) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            
            ctx.beginPath();
            ctx.arc(centerX, bottomHookY + 23, 100, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(0, 255, 100, 0.1)';
            ctx.fill();
            
            ctx.restore();
        }
    }
}

export default SpringRenderer;
