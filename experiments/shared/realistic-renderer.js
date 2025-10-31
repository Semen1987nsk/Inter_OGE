/**
 * Realistic Equipment Renderer
 * Гибридный рендеринг: фото + canvas-трансформации для интерактивности
 */

class RealisticRenderer {
    constructor(context) {
        this.ctx = context;
        this.cache = new Map(); // кеш предобработанных изображений
    }

    /**
     * Рисует растягиваемую пружину из фото
     * @param {Image} img - Фото пружины в естественном состоянии
     * @param {number} x - X координата верха (центр)
     * @param {number} y - Y координата верха
     * @param {number} naturalLength - Исходная длина пружины (px) - целевой размер
     * @param {number} currentLength - Текущая длина (растянутая) (px)
     * @param {number} segments - На сколько сегментов разбить (для плавности)
     */
    drawStretchableSpring(img, x, y, naturalLength, currentLength, segments = 20) {
        if (!img || !img.complete) {
            console.warn('⚠️ Spring image not loaded yet');
            return;
        }

        const stretchFactor = currentLength / naturalLength;
        
        // Масштабируем огромное фото пружины (1200px) под целевой размер (150px)
        // Вычисляем ширину пропорционально
        const targetWidth = (img.width / img.height) * naturalLength;
        
        const segmentHeight = naturalLength / segments;
        const stretchedSegmentHeight = segmentHeight * stretchFactor;

        this.ctx.save();

        // Рисуем пружину по сегментам с растяжением
        for (let i = 0; i < segments; i++) {
            const sy = (i / segments) * img.height; // source Y (пропорционально оригиналу)
            const sh = img.height / segments; // source height
            const dy = y + i * stretchedSegmentHeight; // destination Y
            
            // Небольшое сжатие по ширине при растяжении (эффект Пуассона)
            const widthFactor = 1 - (stretchFactor - 1) * 0.15;
            const segmentWidth = targetWidth * widthFactor;

            this.ctx.drawImage(
                img,
                0, sy, img.width, sh, // source (весь оригинал)
                x - segmentWidth / 2, dy, segmentWidth, stretchedSegmentHeight // destination (масштабированный)
            );
        }

        // Добавляем блики при растяжении
        if (stretchFactor > 1.05) {
            this.addSpringHighlights(x, y, currentLength, stretchFactor);
        }

        this.ctx.restore();
    }

    /**
     * Добавляет блики на растянутую пружину
     */
    addSpringHighlights(x, y, length, stretchFactor) {
        const intensity = Math.min((stretchFactor - 1) * 2, 0.3);
        
        const gradient = this.ctx.createLinearGradient(x - 20, y, x + 20, y);
        gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x - 20, y, 40, length);
    }

    /**
     * Рисует штатив с регулируемой муфтой
     * @param {Image} standImg - Фото стойки
     * @param {Image} clampImg - Фото муфты (или вырезаем из стойки)
     * @param {number} x - X позиция
     * @param {number} y - Y позиция основания
     * @param {number} clampHeight - Высота муфты над основанием
     */
    drawAdjustableStand(standImg, clampImg, x, y, clampHeight) {
        if (!standImg || !standImg.complete) return;

        this.ctx.save();

        // Рисуем основание и стойку
        this.ctx.drawImage(standImg, x, y);

        // Если есть отдельное фото муфты, рисуем её на нужной высоте
        if (clampImg && clampImg.complete) {
            const clampY = y - standImg.height + clampHeight;
            this.ctx.drawImage(clampImg, x + 50, clampY);
            
            // Тень от муфты
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 5;
            this.ctx.shadowOffsetY = 5;
        }

        this.ctx.restore();
    }

    /**
     * Рисует груз с физической реалистичностью
     * @param {Image} img - Фото груза
     * @param {number} x - X центра
     * @param {number} y - Y центра
     * @param {number} rotation - Угол поворота (рад)
     * @param {number} scale - Масштаб (1.0 = 100%)
     * @param {boolean} swinging - Качается ли груз
     * @param {number} targetSize - Целевой размер груза в px (по умолчанию 60)
     */
    drawWeight(img, x, y, rotation = 0, scale = 1, swinging = false, targetSize = 60) {
        if (!img || !img.complete) return;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        
        // Масштабируем огромное фото груза под целевой размер
        const imgScale = (targetSize / Math.max(img.width, img.height)) * scale;
        this.ctx.scale(imgScale, imgScale);

        // Тень груза (динамическая)
        const shadowIntensity = 0.4 + Math.abs(Math.sin(rotation)) * 0.2;
        this.ctx.shadowColor = `rgba(0, 0, 0, ${shadowIntensity})`;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = Math.sin(rotation) * 10;
        this.ctx.shadowOffsetY = 10;

        // Рисуем груз
        this.ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Блик при качании
        if (swinging && Math.abs(rotation) > 0.05) {
            const highlight = this.ctx.createRadialGradient(
                -img.width * 0.2, -img.height * 0.2, 0,
                0, 0, img.width * 0.6
            );
            highlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.fillStyle = highlight;
            this.ctx.fillRect(-img.width / 2, -img.height / 2, img.width, img.height);
        }

        this.ctx.restore();
    }

    /**
     * Рисует нить/крючок между двумя точками
     * @param {number} x1 - Начальная X
     * @param {number} y1 - Начальная Y
     * @param {number} x2 - Конечная X
     * @param {number} y2 - Конечная Y
     * @param {number} tension - Натяжение (0-1)
     */
    drawHook(x1, y1, x2, y2, tension = 0.5) {
        this.ctx.save();
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.hypot(dx, dy);
        
        // Цвет зависит от натяжения
        const color = tension > 0.8 ? '#FFA500' : '#888888';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2 + tension * 2;
        
        // Лёгкий прогиб нити при низком натяжении
        if (tension < 0.5) {
            const sag = (1 - tension) * distance * 0.1;
            const cpX = (x1 + x2) / 2 + dy * 0.1;
            const cpY = (y1 + y2) / 2 + sag;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.quadraticCurveTo(cpX, cpY, x2, y2);
            this.ctx.stroke();
        } else {
            // Прямая линия при высоком натяжении
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
        
        // Блики на металлическом крючке
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Рисует линейку рядом с пружиной
     * @param {number} x - X позиция
     * @param {number} y - Y начала
     * @param {number} length - Длина линейки (px)
     * @param {number} pixelsPerCm - Масштаб
     * @param {number} highlightStart - Начало выделенного участка (см)
     * @param {number} highlightEnd - Конец выделенного участка (см)
     */
    drawRulerWithHighlight(x, y, length, pixelsPerCm, highlightStart = null, highlightEnd = null) {
        this.ctx.save();

        // Фон линейки
        const gradient = this.ctx.createLinearGradient(x, y, x + 30, y);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(200, 200, 200, 0.9)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, 30, length);

        // Деления
        const cmCount = length / pixelsPerCm;
        for (let cm = 0; cm <= cmCount; cm++) {
            const yPos = y + cm * pixelsPerCm;
            const isMajor = cm % 5 === 0;
            
            this.ctx.strokeStyle = isMajor ? '#000' : '#666';
            this.ctx.lineWidth = isMajor ? 2 : 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, yPos);
            this.ctx.lineTo(x + (isMajor ? 20 : 10), yPos);
            this.ctx.stroke();

            // Цифры
            if (isMajor) {
                this.ctx.fillStyle = '#000';
                this.ctx.font = 'bold 11px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(cm, x + 22, yPos + 4);
            }
        }

        // Подсветка измеряемого участка
        if (highlightStart !== null && highlightEnd !== null) {
            const yStart = y + highlightStart * pixelsPerCm;
            const yEnd = y + highlightEnd * pixelsPerCm;
            
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            this.ctx.fillRect(x - 5, yStart, 40, yEnd - yStart);
            
            // Стрелки
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 3]);
            this.ctx.beginPath();
            this.ctx.moveTo(x - 10, yStart);
            this.ctx.lineTo(x - 10, yEnd);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Значение удлинения
            const elongation = highlightEnd - highlightStart;
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `Δl = ${elongation.toFixed(1)} см`,
                x + 15,
                (yStart + yEnd) / 2
            );
        }

        this.ctx.restore();
    }

    /**
     * Добавляет реалистичную тень под объект
     * @param {number} x - X центра
     * @param {number} y - Y низа объекта
     * @param {number} width - Ширина объекта
     * @param {number} height - Высота над землёй
     */
    drawRealisticShadow(x, y, width, height) {
        this.ctx.save();

        // Эллиптическая тень
        const shadowOpacity = Math.max(0.1, 0.5 - height / 500);
        const shadowWidth = width * (1 + height / 300);
        
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, shadowWidth / 2);
        gradient.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.ellipse(x, y, shadowWidth / 2, shadowWidth / 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * Предварительная обработка изображения (кеширование с эффектами)
     * @param {string} key - Ключ кеша
     * @param {Image} img - Исходное изображение
     * @param {function} processor - Функция обработки
     */
    cacheProcessedImage(key, img, processor) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        if (processor) processor(ctx, img);

        const processed = new Image();
        processed.src = canvas.toDataURL();
        this.cache.set(key, processed);
        
        return processed;
    }

    /**
     * Очищает кеш
     */
    clearCache() {
        this.cache.clear();
    }
}

// Экспорт для browser и Node.js
if (typeof window !== 'undefined') {
    window.RealisticRenderer = RealisticRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RealisticRenderer };
}
