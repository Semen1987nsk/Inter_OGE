/**
 * Particle Effects System
 * Creates visual effects like sparks, dust, energy particles
 */

class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 4;
        this.vy = options.vy || (Math.random() - 0.5) * 4;
        this.life = options.life || 1.0;
        this.maxLife = options.maxLife || 1.0;
        this.size = options.size || 3;
        this.color = options.color || '#FFD700';
        this.gravity = options.gravity || 0.1;
        this.friction = options.friction || 0.98;
        this.alpha = 1;
    }

    update(deltaTime = 1) {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        this.life -= deltaTime * 0.016; // ~60fps
        this.alpha = Math.max(0, this.life / this.maxLife);
        
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.maxParticles = 500;
        // Optional trail effect support
        this.trail = null;
    }

    /**
     * Create success sparkles (золотые звёздочки)
     */
    createSuccessSparkles(x, y, count = 30) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 3;
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.5,
                maxLife: 1.5,
                size: 2 + Math.random() * 3,
                color: ['#FFD700', '#FFA500', '#FF6B35'][Math.floor(Math.random() * 3)],
                gravity: 0.05,
                friction: 0.96
            }));
        }
    }

    /**
     * Create energy flow particles (энергетические частицы)
     */
    createEnergyFlow(fromX, fromY, toX, toY, count = 15) {
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            
            this.particles.push(new Particle(x, y, {
                vx: (toX - fromX) / 30,
                vy: (toY - fromY) / 30,
                life: 2.0,
                maxLife: 2.0,
                size: 4,
                color: `hsl(${200 + t * 60}, 70%, 60%)`,
                gravity: 0,
                friction: 1.0
            }));
        }
    }

    /**
     * Create impact particles (частицы при ударе)
     */
    createImpactParticles(x, y, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8,
                maxLife: 0.8,
                size: 2 + Math.random() * 2,
                color: '#FFFFFF',
                gravity: 0.2,
                friction: 0.95
            }));
        }
    }

    /**
     * Create dust particles (пыль при трении)
     */
    createDustParticles(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 2,
                life: 1.2,
                maxLife: 1.2,
                size: 1 + Math.random() * 2,
                color: '#D4A574',
                gravity: 0.05,
                friction: 0.97
            }));
        }
    }

    /**
     * Create confetti (конфетти для празднования)
     */
    createConfetti(x, y, count = 50) {
        const colors = ['#FF6B35', '#0066CC', '#00A86B', '#FFD700', '#9C27B0'];
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 5,
                life: 2.0,
                maxLife: 2.0,
                size: 3 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.3,
                friction: 0.98
            }));
        }
    }

    /**
     * Create spring glow particles (свечение пружины)
     */
    createSpringGlow(x, y, intensity = 1.0) {
        for (let i = 0; i < 5 * intensity; i++) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: 1.0,
                maxLife: 1.0,
                size: 2 + Math.random() * 3,
                color: `hsla(210, 100%, ${50 + Math.random() * 30}%, 0.8)`,
                gravity: 0,
                friction: 0.99
            }));
        }
    }

    /**
     * Update all particles
     */
    update(deltaTime = 1) {
        this.particles = this.particles.filter(particle => particle.update(deltaTime));
        
        // Limit max particles for performance
        if (this.particles.length > this.maxParticles) {
            this.particles = this.particles.slice(-this.maxParticles);
        }
    }

    /**
     * Draw all particles
     */
    draw() {
        // Draw trail if exists
        if (this.trail && this.trail.points && this.trail.points.length > 1) {
            const ctx = this.ctx;
            ctx.save();
            ctx.strokeStyle = this.trail.color || 'rgba(255,215,0,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < this.trail.points.length; i++) {
                const p = this.trail.points[i];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.restore();
        }

        this.particles.forEach(particle => particle.draw(this.ctx));
    }

    // Backward-compat: allow experiment code that calls render()
    render() {
        this.draw();
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    // Backward-compat name aliases
    createImpact(x, y, count = 20) {
        return this.createImpactParticles(x, y, count);
    }

    createSuccess(x, y, count = 30) {
        return this.createSuccessSparkles(x, y, count);
    }

    // Simple trail API used by experiment code
    createTrail(x, y, color = '#FFD700') {
        this.trail = { color, points: [{ x, y }] };
    }

    updateTrail(x, y) {
        if (!this.trail) return;
        this.trail.points.push({ x, y });
        if (this.trail.points.length > 20) {
            this.trail.points.shift();
        }
    }

    clearTrail() {
        this.trail = null;
    }

    /**
     * Get particle count
     */
    getCount() {
        return this.particles.length;
    }
}

// Trail effect for moving objects
class TrailEffect {
    constructor() {
        this.points = [];
        this.maxPoints = 20;
    }

    addPoint(x, y) {
        this.points.push({ x, y, alpha: 1.0 });
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    update() {
        this.points.forEach((point, index) => {
            point.alpha = (index / this.points.length) * 0.5;
        });
    }

    draw(ctx, color = '#0066CC') {
        if (this.points.length < 2) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < this.points.length - 1; i++) {
            const point = this.points[i];
            const nextPoint = this.points[i + 1];
            
            ctx.globalAlpha = point.alpha;
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(nextPoint.x, nextPoint.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    clear() {
        this.points = [];
    }
}

// Glow effect for objects
class GlowEffect {
    constructor() {
        this.intensity = 0;
        this.targetIntensity = 0;
        this.speed = 0.1;
    }

    setIntensity(value) {
        this.targetIntensity = Math.max(0, Math.min(1, value));
    }

    update() {
        this.intensity += (this.targetIntensity - this.intensity) * this.speed;
    }

    apply(ctx, x, y, radius, color = '#0066CC') {
        if (this.intensity <= 0.01) return;

        ctx.save();
        ctx.globalAlpha = this.intensity * 0.5;
        
        const gradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.Particle = Particle;
    window.ParticleSystem = ParticleSystem;
    window.TrailEffect = TrailEffect;
    window.GlowEffect = GlowEffect;
}

// Export for use in other scripts (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Particle, ParticleSystem, TrailEffect, GlowEffect };
}
