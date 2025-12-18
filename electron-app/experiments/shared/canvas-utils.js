/**
 * Canvas Utilities
 * Helper functions for canvas rendering and image manipulation
 */

class CanvasUtils {
    constructor() {
        this.imageCache = new Map();
    }

    /**
     * Load and cache an image
     * @param {string} path - путь к изображению
     * @returns {Promise<HTMLImageElement>}
     */
    async loadImage(path) {
        if (this.imageCache.has(path)) {
            return this.imageCache.get(path);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(path, img);
                resolve(img);
            };
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${path}`));
            };
            img.src = path;
        });
    }

    /**
     * Preload multiple images
     * @param {Array<string>} paths - массив путей
     * @returns {Promise<Array<HTMLImageElement>>}
     */
    async preloadImages(paths) {
        return Promise.all(paths.map(path => this.loadImage(path)));
    }

    /**
     * Draw rotated image
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLImageElement} image
     * @param {number} x - центр X
     * @param {number} y - центр Y
     * @param {number} angle - угол в градусах
     * @param {number} scale - масштаб
     */
    drawRotated(ctx, image, x, y, angle = 0, scale = 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle * Math.PI / 180);
        ctx.scale(scale, scale);
        ctx.drawImage(
            image,
            -image.width / 2,
            -image.height / 2,
            image.width,
            image.height
        );
        ctx.restore();
    }

    /**
     * Draw stretched image (for spring animation)
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLImageElement} image
     * @param {number} x
     * @param {number} y
     * @param {number} stretchFactor - коэффициент растяжения
     * @param {number} segments - количество сегментов
     */
    drawStretched(ctx, image, x, y, stretchFactor = 1, segments = 10) {
        const segmentHeight = image.height / segments;
        const newSegmentHeight = segmentHeight * stretchFactor;

        ctx.save();
        
        for (let i = 0; i < segments; i++) {
            ctx.drawImage(
                image,
                0, i * segmentHeight,           // source x, y
                image.width, segmentHeight,      // source w, h
                x, y + i * newSegmentHeight,    // dest x, y
                image.width, newSegmentHeight   // dest w, h (stretched!)
            );
        }
        
        ctx.restore();
    }

    /**
     * Draw with glow effect
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} drawFunc - функция рисования
     * @param {string} color - цвет свечения
     * @param {number} blur - размытие
     */
    drawWithGlow(ctx, drawFunc, color = '#0066CC', blur = 10) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        drawFunc();
        ctx.restore();
    }

    /**
     * Draw text with outline
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {object} options
     */
    drawTextWithOutline(ctx, text, x, y, options = {}) {
        const {
            font = '16px Arial',
            fillColor = '#FFFFFF',
            outlineColor = '#000000',
            outlineWidth = 2,
            align = 'left',
            baseline = 'top'
        } = options;

        ctx.save();
        ctx.font = font;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;

        // Outline
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.strokeText(text, x, y);

        // Fill
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);

        ctx.restore();
    }

    /**
     * Draw dashed line
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {Array<number>} dashPattern
     */
    drawDashedLine(ctx, x1, y1, x2, y2, dashPattern = [5, 5]) {
        ctx.save();
        ctx.setLineDash(dashPattern);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    /**
     * Draw arrow
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} fromX
     * @param {number} fromY
     * @param {number} toX
     * @param {number} toY
     * @param {number} headSize
     */
    drawArrow(ctx, fromX, fromY, toX, toY, headSize = 10) {
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headSize * Math.cos(angle - Math.PI / 6),
            toY - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headSize * Math.cos(angle + Math.PI / 6),
            toY - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /**
     * Clear canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    clear(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    /**
     * Draw gradient background
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array<string>} colors
     */
    drawGradientBackground(ctx, colors = ['#1a1f3a', '#0f1429']) {
        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    /**
     * Draw ruler/scale
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} height
     * @param {number} pixelsPerCm
     */
    drawRuler(ctx, x, y, height, pixelsPerCm = 40) {
        ctx.save();
        
        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, 40, height);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 40, height);
        
        // Scale marks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        
        const numMarks = Math.floor(height / pixelsPerCm);
        
        for (let i = 0; i <= numMarks; i++) {
            const markY = y + i * pixelsPerCm;
            
            // Major mark (cm)
            ctx.beginPath();
            ctx.moveTo(x, markY);
            ctx.lineTo(x + 15, markY);
            ctx.stroke();
            
            // Label
            if (i % 1 === 0) {
                ctx.fillText(i.toString(), x + 25, markY + 4);
            }
            
            // Minor marks (mm)
            if (i < numMarks) {
                for (let j = 1; j < 10; j++) {
                    const minorY = markY + (j * pixelsPerCm / 10);
                    const markLength = (j === 5) ? 10 : 5;
                    
                    ctx.beginPath();
                    ctx.moveTo(x, minorY);
                    ctx.lineTo(x + markLength, minorY);
                    ctx.stroke();
                }
            }
        }
        
        ctx.restore();
    }

    /**
     * Animate value with easing
     * @param {number} current
     * @param {number} target
     * @param {number} speed
     * @returns {number}
     */
    lerp(current, target, speed = 0.1) {
        return current + (target - current) * speed;
    }

    /**
     * Easing functions
     */
    easing = {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    }

    /**
     * Get canvas as data URL
     * @param {HTMLCanvasElement} canvas
     * @returns {string}
     */
    toDataURL(canvas) {
        return canvas.toDataURL('image/png');
    }

    /**
     * Download canvas as image
     * @param {HTMLCanvasElement} canvas
     * @param {string} filename
     */
    downloadCanvas(canvas, filename = 'experiment.png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.toDataURL(canvas);
        link.click();
    }
}

// Singleton instance
const canvasUtils = new CanvasUtils();

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.CanvasUtils = CanvasUtils;
    window.canvasUtils = canvasUtils;
}

// Export for use in other scripts (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasUtils;
}
