/**
 * MeasurementService Module
 * Handles measurement recording, calculations, and history
 * Extracted from experiment-1-spring.js
 */

export class MeasurementService {
    constructor(options = {}) {
        // State
        this.recordedForce = null;
        this.recordedElongation = null;
        this.measurements = [];
        
        // Configuration
        this.config = {
            gravity: options.gravity || 9.8,
            pixelsPerCm: options.pixelsPerCm || 40,
            noisePercentage: options.noisePercentage || 0.02
        };
        
        // Callbacks
        this.onForceRecorded = options.onForceRecorded || (() => {});
        this.onElongationRecorded = options.onElongationRecorded || (() => {});
        this.onCalculationComplete = options.onCalculationComplete || (() => {});
        this.onMeasurementAdded = options.onMeasurementAdded || (() => {});
        this.onReset = options.onReset || (() => {});
    }

    /**
     * Calculate force from mass
     * @param {number} massGrams - Mass in grams
     * @returns {number} Force in Newtons
     */
    calculateForce(massGrams) {
        const massKg = massGrams / 1000;
        return massKg * this.config.gravity;
    }

    /**
     * Calculate elongation from spring physics
     * @param {number} force - Force in Newtons
     * @param {number} stiffness - Spring constant in N/m
     * @returns {number} Elongation in meters
     */
    calculateElongation(force, stiffness) {
        if (stiffness <= 0) return 0;
        return force / stiffness;
    }

    /**
     * Convert pixels to meters
     * @param {number} pixels - Distance in pixels
     * @returns {number} Distance in meters
     */
    pixelsToMeters(pixels) {
        const cm = pixels / this.config.pixelsPerCm;
        return cm / 100;
    }

    /**
     * Convert meters to pixels
     * @param {number} meters - Distance in meters
     * @returns {number} Distance in pixels
     */
    metersToPixels(meters) {
        const cm = meters * 100;
        return cm * this.config.pixelsPerCm;
    }

    /**
     * Add measurement noise (for realism)
     * @param {number} value - Base value
     * @returns {number} Value with noise
     */
    addNoise(value) {
        const noise = value * this.config.noisePercentage * (Math.random() * 2 - 1);
        return value + noise;
    }

    /**
     * Record force value
     * @param {number} force - Force in Newtons
     * @param {string} source - 'auto' | 'manual'
     */
    recordForce(force, source = 'auto') {
        if (!Number.isFinite(force) || force <= 0) {
            throw new Error('Invalid force value');
        }
        
        this.recordedForce = force;
        this.onForceRecorded(force, source);
        
        console.log(`[MEASUREMENT] Force recorded: ${force.toFixed(3)} N (${source})`);
    }

    /**
     * Record elongation value
     * @param {number} elongation - Elongation in meters
     * @param {string} source - 'auto' | 'manual'
     */
    recordElongation(elongation, source = 'auto') {
        if (!Number.isFinite(elongation) || elongation <= 0) {
            throw new Error('Invalid elongation value');
        }
        
        this.recordedElongation = elongation;
        this.onElongationRecorded(elongation, source);
        
        console.log(`[MEASUREMENT] Elongation recorded: ${elongation.toFixed(4)} m (${source})`);
    }

    /**
     * Get recorded force
     */
    getRecordedForce() {
        return this.recordedForce;
    }

    /**
     * Get recorded elongation
     */
    getRecordedElongation() {
        return this.recordedElongation;
    }

    /**
     * Check if both values are recorded
     */
    canCalculate() {
        return this.recordedForce !== null && this.recordedElongation !== null;
    }

    /**
     * Calculate stiffness from recorded values
     * @returns {object} { stiffness, force, elongation, formula }
     */
    calculateStiffness() {
        if (!this.canCalculate()) {
            throw new Error('Both force and elongation must be recorded');
        }
        
        const force = this.recordedForce;
        const elongation = this.recordedElongation;
        const stiffness = force / elongation;
        
        const result = {
            stiffness,
            force,
            elongation,
            formula: `k = ${force.toFixed(2)} / ${elongation.toFixed(3)} = ${stiffness.toFixed(1)} Н/м`
        };
        
        this.onCalculationComplete(result);
        
        console.log(`[MEASUREMENT] Stiffness calculated: ${stiffness.toFixed(1)} N/m`);
        
        return result;
    }

    /**
     * Add measurement to history
     * @param {object} measurement - { force, elongation, mass, stiffness }
     */
    addMeasurement(measurement) {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            force: measurement.force,
            elongation: measurement.elongation,
            mass: measurement.mass || null,
            stiffness: measurement.stiffness || null,
            ...measurement
        };
        
        this.measurements.push(entry);
        this.onMeasurementAdded(entry, this.measurements.length);
        
        return entry;
    }

    /**
     * Remove measurement from history
     * @param {number} id - Measurement ID
     */
    removeMeasurement(id) {
        const index = this.measurements.findIndex(m => m.id === id);
        if (index !== -1) {
            this.measurements.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get all measurements
     */
    getMeasurements() {
        return [...this.measurements];
    }

    /**
     * Calculate linear regression for measurements
     * @returns {object} { slope, intercept, r2, avgStiffness }
     */
    calculateRegression() {
        if (this.measurements.length < 2) {
            return null;
        }
        
        const points = this.measurements.map(m => ({
            x: m.elongation,
            y: m.force
        }));
        
        const n = points.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        
        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
            sumY2 += p.y * p.y;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // R-squared
        const yMean = sumY / n;
        let ssTot = 0, ssRes = 0;
        points.forEach(p => {
            const yPred = slope * p.x + intercept;
            ssTot += (p.y - yMean) ** 2;
            ssRes += (p.y - yPred) ** 2;
        });
        const r2 = 1 - (ssRes / ssTot);
        
        // Average stiffness from individual measurements
        const avgStiffness = this.measurements.reduce((sum, m) => {
            if (m.stiffness) return sum + m.stiffness;
            if (m.force && m.elongation) return sum + (m.force / m.elongation);
            return sum;
        }, 0) / this.measurements.length;
        
        return {
            slope, // This is k (stiffness) from F = k × Δl
            intercept,
            r2,
            avgStiffness,
            pointCount: n
        };
    }

    /**
     * Reset recorded values
     */
    resetRecorded() {
        this.recordedForce = null;
        this.recordedElongation = null;
        this.onReset();
    }

    /**
     * Clear all measurements
     */
    clearAll() {
        this.recordedForce = null;
        this.recordedElongation = null;
        this.measurements = [];
        this.onReset();
    }

    /**
     * Export measurements to JSON
     */
    exportToJSON() {
        return JSON.stringify({
            measurements: this.measurements,
            regression: this.calculateRegression(),
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Import measurements from JSON
     */
    importFromJSON(json) {
        try {
            const data = JSON.parse(json);
            if (data.measurements && Array.isArray(data.measurements)) {
                this.measurements = data.measurements;
                return true;
            }
        } catch (e) {
            console.error('[MEASUREMENT] Import failed:', e);
        }
        return false;
    }
}
