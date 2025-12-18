/**
 * Magnifying Glass Tool
 * Creates a floating magnifying glass effect on canvas
 */

export class Magnifier {
    constructor(sourceCanvases, targetCanvas, radius = 75, zoom = 2.5) {
        this.sourceCanvases = Array.isArray(sourceCanvases) ? sourceCanvases : [sourceCanvases];
        this.targetCanvas = targetCanvas; // Usually UI canvas
        this.ctx = targetCanvas.getContext('2d');
        this.radius = radius;
        this.zoom = zoom;
        this.visible = false;
        this.x = 0;
        this.y = 0;
    }

    updatePosition(x, y) {
        this.x = x;
        this.y = y;
    }

    show() {
        this.visible = true;
    }

    hide() {
        this.visible = false;
    }

    draw() {
        if (!this.visible) return;

        const ctx = this.ctx;
        const d = this.radius * 2;

        ctx.save();
        
        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fill();

        // Draw magnified content
        // Source rectangle
        const sx = this.x - this.radius / this.zoom;
        const sy = this.y - this.radius / this.zoom;
        const sWidth = d / this.zoom;
        const sHeight = d / this.zoom;

        // Destination rectangle (the circle bounds)
        const dx = this.x - this.radius;
        const dy = this.y - this.radius;

        // Draw from all source canvases
        this.sourceCanvases.forEach(canvas => {
            if (canvas) {
                ctx.drawImage(canvas, sx, sy, sWidth, sHeight, dx, dy, d, d);
            }
        });

        // Draw border/rim
        ctx.restore(); // Remove clip
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#333';
        ctx.stroke();
        
        // Glass reflection effect
        const grad = ctx.createLinearGradient(this.x - this.radius, this.y - this.radius, this.x + this.radius, this.y + this.radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        
        ctx.fillStyle = grad;
        ctx.fill();
    }
}