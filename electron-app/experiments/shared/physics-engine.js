/**
 * Physics Engine for Lab Experiments
 * Handles all physics calculations and simulations
 */

class PhysicsEngine {
    constructor() {
        this.g = 10; // m/s² (simplified)
        this.damping = 0.92; // затухание колебаний
    }

    /**
     * Calculate spring force: F = k × Δl
     * @param {number} k - жёсткость (Н/м)
     * @param {number} deltaL - удлинение (м)
     * @returns {number} сила (Н)
     */
    springForce(k, deltaL) {
        return k * deltaL;
    }

    /**
     * Calculate elongation from mass: Δl = (m × g) / k
     * @param {number} mass - масса (кг)
     * @param {number} k - жёсткость (Н/м)
     * @returns {number} удлинение (м)
     */
    calculateElongation(mass, k) {
        const F = mass * this.g;
        return F / k;
    }

    /**
     * Spring oscillation with damping
     * @param {number} k - жёсткость (Н/м)
     * @param {number} m - масса (кг)
     * @param {number} x0 - начальное смещение (м)
     * @param {number} t - время (с)
     * @returns {object} {position, velocity}
     */
    springOscillation(k, m, x0, t) {
        const omega = Math.sqrt(k / m); // угловая частота
        const dampingCoef = 0.15; // коэффициент затухания
        
        const amplitude = x0 * Math.exp(-dampingCoef * t);
        const position = amplitude * Math.cos(omega * t);
        const velocity = -amplitude * omega * Math.sin(omega * t) * Math.exp(-dampingCoef * t);
        
        return { position, velocity };
    }

    /**
     * Calculate friction force: F_fr = μ × N
     * @param {number} mu - коэффициент трения
     * @param {number} N - сила нормального давления (Н)
     * @returns {number} сила трения (Н)
     */
    frictionForce(mu, N) {
        return mu * N;
    }

    /**
     * Calculate work: A = F × S
     * @param {number} force - сила (Н)
     * @param {number} distance - расстояние (м)
     * @returns {number} работа (Дж)
     */
    calculateWork(force, distance) {
        return force * distance;
    }

    /**
     * Linear regression for data points
     * @param {Array} points - [{x, y}, ...]
     * @returns {object} {slope, intercept, r2}
     */
    linearRegression(points) {
        const n = points.length;
        if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        points.forEach(point => {
            sumX += point.x;
            sumY += point.y;
            sumXY += point.x * point.y;
            sumX2 += point.x * point.x;
            sumY2 += point.y * point.y;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R²
        const yMean = sumY / n;
        let ssTotal = 0, ssResidual = 0;

        points.forEach(point => {
            const yPred = slope * point.x + intercept;
            ssTotal += Math.pow(point.y - yMean, 2);
            ssResidual += Math.pow(point.y - yPred, 2);
        });

        const r2 = 1 - (ssResidual / ssTotal);

        return { 
            slope: Number(slope.toFixed(2)), 
            intercept: Number(intercept.toFixed(2)), 
            r2: Number(r2.toFixed(4))
        };
    }

    /**
     * Calculate percentage error
     * @param {number} measured - измеренное значение
     * @param {number} actual - фактическое значение
     * @returns {number} погрешность (%)
     */
    percentageError(measured, actual) {
        return Math.abs((measured - actual) / actual) * 100;
    }

    /**
     * Convert units
     */
    units = {
        // Mass
        gToKg: (g) => g / 1000,
        kgToG: (kg) => kg * 1000,
        
        // Length
        cmToM: (cm) => cm / 100,
        mToCm: (m) => m * 100,
        mmToM: (mm) => mm / 1000,
        
        // Force
        nToKn: (n) => n / 1000,
        knToN: (kn) => kn * 1000
    }
}

// Singleton instance
const physics = new PhysicsEngine();

// Export individual functions globally for easy access
const springForce = (k, deltaL) => physics.springForce(k, deltaL);
const calculateElongation = (mass, k) => physics.calculateElongation(mass, k);
const springOscillation = (k, m, x0, t) => physics.springOscillation(k, m, x0, t);
const frictionForce = (mu, N) => physics.frictionForce(mu, N);
const calculateWork = (force, distance) => physics.calculateWork(force, distance);
const linearRegression = (points) => physics.linearRegression(points);
const percentageError = (measured, actual) => physics.percentageError(measured, actual);

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.PhysicsEngine = PhysicsEngine;
    window.physics = physics;
    window.springForce = springForce;
    window.calculateElongation = calculateElongation;
    window.springOscillation = springOscillation;
    window.frictionForce = frictionForce;
    window.calculateWork = calculateWork;
    window.linearRegression = linearRegression;
    window.percentageError = percentageError;
}

// Export for use in other scripts (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhysicsEngine;
}
