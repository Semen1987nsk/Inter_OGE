/**
 * RulerRenderer Module
 * Renders a visual measurement ruler on canvas
 * Supports both vertical and horizontal orientations
 */

export class RulerRenderer {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        
        // Configuration
        this.config = {
            orientation: options.orientation || 'vertical', // 'vertical' | 'horizontal'
            position: options.position || { x: 0, y: 0 },
            length: options.length || 400, // Total length in pixels
            width: options.width || 40, // Width of the ruler
            
            // Scale settings
            pixelsPerCm: options.pixelsPerCm || 40,
            majorDivision: options.majorDivision || 1, // cm per major tick
            minorDivisions: options.minorDivisions || 10, // minor ticks per major
            
            // Visual settings
            backgroundColor: options.backgroundColor || '#F5F5DC', // Beige/cream
            borderColor: options.borderColor || '#8B4513', // Brown border
            majorTickColor: options.majorTickColor || '#000000',
            minorTickColor: options.minorTickColor || '#666666',
            textColor: options.textColor || '#000000',
            highlightColor: options.highlightColor || 'rgba(0, 168, 107, 0.3)',
            
            // Tick sizes
            majorTickLength: options.majorTickLength || 15,
            mediumTickLength: options.mediumTickLength || 10,
            minorTickLength: options.minorTickLength || 5,
            
            // Font
            fontSize: options.fontSize || 10,
            fontFamily: options.fontFamily || 'Arial, sans-serif',
            
            // Visibility
            visible: options.visible !== false,
            showZeroMark: options.showZeroMark !== false,
            startValue: options.startValue || 0, // Starting cm value
            
            // Highlight
            highlightStart: null,
            highlightEnd: null
        };
    }

    /**
     * Update ruler position
     */
    setPosition(x, y) {
        this.config.position = { x, y };
    }

    /**
     * Update ruler length
     */
    setLength(length) {
        this.config.length = length;
    }

    /**
     * Set highlighted range (for showing elongation)
     * @param {number} startCm - Start position in cm
     * @param {number} endCm - End position in cm
     */
    setHighlight(startCm, endCm) {
        this.config.highlightStart = startCm;
        this.config.highlightEnd = endCm;
    }

    /**
     * Clear highlight
     */
    clearHighlight() {
        this.config.highlightStart = null;
        this.config.highlightEnd = null;
    }

    /**
     * Show/hide ruler
     */
    setVisible(visible) {
        this.config.visible = visible;
    }

    /**
     * Convert cm to pixels
     */
    cmToPixels(cm) {
        return cm * this.config.pixelsPerCm;
    }

    /**
     * Convert pixels to cm
     */
    pixelsToCm(pixels) {
        return pixels / this.config.pixelsPerCm;
    }

    /**
     * Draw the ruler
     */
    draw() {
        if (!this.config.visible) return;

        const ctx = this.ctx;
        const cfg = this.config;
        const isVertical = cfg.orientation === 'vertical';
        
        ctx.save();
        
        // Translate to ruler position
        ctx.translate(cfg.position.x, cfg.position.y);
        
        // Draw ruler body (wooden/plastic look)
        this.drawRulerBody(isVertical);
        
        // Draw highlight if set
        if (cfg.highlightStart !== null && cfg.highlightEnd !== null) {
            this.drawHighlight(isVertical);
        }
        
        // Draw scale markings
        this.drawScale(isVertical);
        
        // Draw border
        this.drawBorder(isVertical);
        
        ctx.restore();
    }

    /**
     * Draw the ruler body with gradient
     */
    drawRulerBody(isVertical) {
        const ctx = this.ctx;
        const cfg = this.config;
        
        const width = isVertical ? cfg.width : cfg.length;
        const height = isVertical ? cfg.length : cfg.width;
        
        // Create wood-like gradient
        let gradient;
        if (isVertical) {
            gradient = ctx.createLinearGradient(0, 0, cfg.width, 0);
        } else {
            gradient = ctx.createLinearGradient(0, 0, 0, cfg.width);
        }
        
        gradient.addColorStop(0, '#D4C4A8');
        gradient.addColorStop(0.3, '#F5F5DC');
        gradient.addColorStop(0.5, '#FFF8DC');
        gradient.addColorStop(0.7, '#F5F5DC');
        gradient.addColorStop(1, '#D4C4A8');
        
        ctx.fillStyle = gradient;
        
        // Draw rounded rectangle
        const radius = 3;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, radius);
        ctx.fill();
        
        // Add subtle wood grain texture
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
        ctx.lineWidth = 0.5;
        
        if (isVertical) {
            for (let y = 5; y < height; y += 15) {
                const offset = Math.sin(y * 0.1) * 2;
                ctx.beginPath();
                ctx.moveTo(5 + offset, y);
                ctx.lineTo(cfg.width - 5 + offset, y);
                ctx.stroke();
            }
        } else {
            for (let x = 5; x < width; x += 15) {
                const offset = Math.sin(x * 0.1) * 2;
                ctx.beginPath();
                ctx.moveTo(x, 5 + offset);
                ctx.lineTo(x, cfg.width - 5 + offset);
                ctx.stroke();
            }
        }
    }

    /**
     * Draw highlight region
     */
    drawHighlight(isVertical) {
        const ctx = this.ctx;
        const cfg = this.config;
        
        const startPx = this.cmToPixels(cfg.highlightStart - cfg.startValue);
        const endPx = this.cmToPixels(cfg.highlightEnd - cfg.startValue);
        
        ctx.fillStyle = cfg.highlightColor;
        
        if (isVertical) {
            ctx.fillRect(0, startPx, cfg.width, endPx - startPx);
        } else {
            ctx.fillRect(startPx, 0, endPx - startPx, cfg.width);
        }
        
        // Draw highlight value
        const deltaCm = cfg.highlightEnd - cfg.highlightStart;
        const midPx = (startPx + endPx) / 2;
        
        ctx.fillStyle = '#00A86B';
        ctx.font = `bold ${cfg.fontSize + 2}px ${cfg.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const label = `Δl = ${deltaCm.toFixed(1)} см`;
        
        if (isVertical) {
            ctx.save();
            ctx.translate(cfg.width / 2 + 5, midPx);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        } else {
            ctx.fillText(label, midPx, cfg.width / 2);
        }
    }

    /**
     * Draw scale markings and numbers
     */
    drawScale(isVertical) {
        const ctx = this.ctx;
        const cfg = this.config;
        
        const totalCm = this.pixelsToCm(cfg.length);
        const pxPerMinor = cfg.pixelsPerCm / cfg.minorDivisions;
        const totalMinorTicks = Math.floor(cfg.length / pxPerMinor);
        
        ctx.lineWidth = 1;
        ctx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;
        
        for (let i = 0; i <= totalMinorTicks; i++) {
            const pos = i * pxPerMinor;
            const cmValue = cfg.startValue + (i / cfg.minorDivisions) * cfg.majorDivision;
            
            // Determine tick type
            const isMajor = i % cfg.minorDivisions === 0;
            const isMedium = i % (cfg.minorDivisions / 2) === 0;
            
            let tickLength;
            if (isMajor) {
                tickLength = cfg.majorTickLength;
                ctx.strokeStyle = cfg.majorTickColor;
                ctx.lineWidth = 1.5;
            } else if (isMedium) {
                tickLength = cfg.mediumTickLength;
                ctx.strokeStyle = cfg.majorTickColor;
                ctx.lineWidth = 1;
            } else {
                tickLength = cfg.minorTickLength;
                ctx.strokeStyle = cfg.minorTickColor;
                ctx.lineWidth = 0.5;
            }
            
            // Draw tick
            ctx.beginPath();
            if (isVertical) {
                ctx.moveTo(0, pos);
                ctx.lineTo(tickLength, pos);
            } else {
                ctx.moveTo(pos, 0);
                ctx.lineTo(pos, tickLength);
            }
            ctx.stroke();
            
            // Draw number for major ticks
            if (isMajor) {
                const numValue = Math.round(cmValue);
                
                // Skip zero if configured
                if (numValue === 0 && !cfg.showZeroMark) continue;
                
                ctx.fillStyle = cfg.textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                if (isVertical) {
                    ctx.fillText(numValue.toString(), cfg.majorTickLength + 8, pos);
                } else {
                    ctx.fillText(numValue.toString(), pos, cfg.majorTickLength + 8);
                }
            }
        }
    }

    /**
     * Draw border around ruler
     */
    drawBorder(isVertical) {
        const ctx = this.ctx;
        const cfg = this.config;
        
        const width = isVertical ? cfg.width : cfg.length;
        const height = isVertical ? cfg.length : cfg.width;
        
        ctx.strokeStyle = cfg.borderColor;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 3);
        ctx.stroke();
    }

    /**
     * Get value at a given pixel position
     * @param {number} pixel - Position in pixels from ruler start
     * @returns {number} Value in cm
     */
    getValueAtPixel(pixel) {
        return this.config.startValue + this.pixelsToCm(pixel);
    }

    /**
     * Get pixel position for a given cm value
     * @param {number} cm - Value in cm
     * @returns {number} Position in pixels from ruler start
     */
    getPixelForValue(cm) {
        return this.cmToPixels(cm - this.config.startValue);
    }
}

/**
 * Factory function to create a pre-configured ruler for spring experiment
 */
export function createSpringRuler(ctx, springPosition, options = {}) {
    const defaultOptions = {
        orientation: 'vertical',
        position: {
            x: springPosition.x + 30,
            y: springPosition.y
        },
        length: 400,
        width: 35,
        pixelsPerCm: 40,
        majorDivision: 1,
        minorDivisions: 10,
        startValue: 0,
        showZeroMark: true,
        ...options
    };
    
    return new RulerRenderer(ctx, defaultOptions);
}
