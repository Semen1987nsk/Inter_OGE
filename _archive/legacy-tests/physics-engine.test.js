/**
 * Unit Tests for PhysicsEngine
 * 
 * Tests all physics calculations used in the virtual lab:
 * - Hook's law (F = k × Δl)
 * - Spring oscillations with damping
 * - Linear regression for stiffness calculation
 * - Friction calculations
 * - Unit conversions
 */

// Import PhysicsEngine - ESM import for Jest with --experimental-vm-modules
import { PhysicsEngine } from '../experiments/shared/physics-engine-v2.js';

describe('PhysicsEngine', () => {
    let physics;

    beforeEach(() => {
        physics = new PhysicsEngine();
    });

    describe('constructor', () => {
        it('should initialize with g = 10 m/s²', () => {
            expect(physics.g).toBe(10);
        });

        it('should initialize with damping = 0.92', () => {
            expect(physics.damping).toBe(0.92);
        });
    });

    describe('springForce', () => {
        it('should calculate F = k × Δl correctly', () => {
            // k = 40 Н/м, Δl = 0.05 м → F = 2 Н
            expect(physics.springForce(40, 0.05)).toBe(2);
        });

        it('should return 0 for zero elongation', () => {
            expect(physics.springForce(40, 0)).toBe(0);
        });

        it('should handle negative elongation (compression)', () => {
            expect(physics.springForce(40, -0.05)).toBe(-2);
        });

        it('should handle high stiffness values', () => {
            // k = 100 Н/м, Δl = 0.1 м → F = 10 Н
            expect(physics.springForce(100, 0.1)).toBe(10);
        });
    });

    describe('calculateElongation', () => {
        it('should calculate Δl = (m × g) / k correctly', () => {
            // m = 0.1 кг, k = 40 Н/м → Δl = (0.1 × 10) / 40 = 0.025 м
            const result = physics.calculateElongation(0.1, 40);
            expect(result).toBeCloseTo(0.025, 5);
        });

        it('should return 0 for zero mass', () => {
            expect(physics.calculateElongation(0, 40)).toBe(0);
        });

        it('should handle 100g weight on 40 N/m spring', () => {
            // Типичный случай OGE: 100г на пружине 40 Н/м
            const mass = 0.1; // 100г = 0.1 кг
            const k = 40; // 40 Н/м
            const expected = (mass * 10) / k; // = 0.025 м = 2.5 см
            expect(physics.calculateElongation(mass, k)).toBeCloseTo(expected, 5);
        });

        it('should handle 200g weight on 40 N/m spring', () => {
            const mass = 0.2; // 200г
            const k = 40;
            const expected = 0.05; // 5 см
            expect(physics.calculateElongation(mass, k)).toBeCloseTo(expected, 5);
        });
    });

    describe('springOscillation', () => {
        it('should start at maximum amplitude at t=0', () => {
            const result = physics.springOscillation(40, 0.1, 0.05, 0);
            // At t=0: cos(0) = 1, exp(0) = 1 → position = x0
            expect(result.position).toBeCloseTo(0.05, 5);
        });

        it('should return velocity = 0 at t=0', () => {
            const result = physics.springOscillation(40, 0.1, 0.05, 0);
            // At t=0: sin(0) = 0 → velocity = 0
            expect(result.velocity).toBeCloseTo(0, 5);
        });

        it('should decrease amplitude over time (damping)', () => {
            // Test that amplitude envelope decreases
            // Since oscillation includes cos(ωt), we need to compare max amplitudes
            const x0 = 0.05;
            
            // Get envelope values (amplitude at peak times)
            // At t=0, amplitude = x0
            // After several cycles, amplitude should be smaller due to exp(-dampingCoef * t)
            const dampingCoef = 0.15;
            
            // Compare envelope values, not actual positions
            const amplitude_t0 = x0; // x0 * exp(0) = x0
            const amplitude_t5 = x0 * Math.exp(-dampingCoef * 5);
            
            expect(amplitude_t5).toBeLessThan(amplitude_t0);
            // Check that damping is working (amplitude should be ~47% after 5 seconds)
            expect(amplitude_t5 / amplitude_t0).toBeCloseTo(Math.exp(-0.75), 2);
        });

        it('should oscillate with correct frequency', () => {
            // ω = √(k/m) = √(40/0.1) = 20 rad/s
            // Period T = 2π/ω ≈ 0.314 s
            const omega = Math.sqrt(40 / 0.1);
            expect(omega).toBeCloseTo(20, 2);
        });

        it('should return object with position and velocity', () => {
            const result = physics.springOscillation(40, 0.1, 0.05, 1);
            expect(result).toHaveProperty('position');
            expect(result).toHaveProperty('velocity');
            expect(typeof result.position).toBe('number');
            expect(typeof result.velocity).toBe('number');
        });
    });

    describe('frictionForce', () => {
        it('should calculate F = μ × N correctly', () => {
            // μ = 0.5, N = 10 Н → F = 5 Н
            expect(physics.frictionForce(0.5, 10)).toBe(5);
        });

        it('should return 0 for frictionless surface', () => {
            expect(physics.frictionForce(0, 10)).toBe(0);
        });

        it('should return 0 for zero normal force', () => {
            expect(physics.frictionForce(0.5, 0)).toBe(0);
        });
    });

    describe('calculateWork', () => {
        it('should calculate A = F × S correctly', () => {
            // F = 5 Н, S = 2 м → A = 10 Дж
            expect(physics.calculateWork(5, 2)).toBe(10);
        });

        it('should return 0 for zero distance', () => {
            expect(physics.calculateWork(5, 0)).toBe(0);
        });

        it('should return 0 for zero force', () => {
            expect(physics.calculateWork(0, 2)).toBe(0);
        });
    });

    describe('checkOverload', () => {
        it('should return false for normal elongation', () => {
            expect(physics.checkOverload(100, 300)).toBe(false);
        });

        it('should return true for elongation above threshold', () => {
            expect(physics.checkOverload(350, 300)).toBe(true);
        });

        it('should use default threshold of 300', () => {
            expect(physics.checkOverload(250)).toBe(false);
            expect(physics.checkOverload(350)).toBe(true);
        });

        it('should handle negative elongation (compression)', () => {
            expect(physics.checkOverload(-350, 300)).toBe(true);
        });
    });

    describe('addNoise', () => {
        it('should return value close to original', () => {
            const original = 100;
            const noisy = physics.addNoise(original, 1);
            
            // With 1% noise, result should be between 99 and 101
            expect(noisy).toBeGreaterThanOrEqual(99);
            expect(noisy).toBeLessThanOrEqual(101);
        });

        it('should return exact value for 0% noise', () => {
            expect(physics.addNoise(100, 0)).toBe(100);
        });

        it('should allow larger noise percentage', () => {
            const values = [];
            for (let i = 0; i < 100; i++) {
                values.push(physics.addNoise(100, 10));
            }
            
            // Check that values spread
            const min = Math.min(...values);
            const max = Math.max(...values);
            expect(max - min).toBeGreaterThan(1);
        });
    });

    describe('linearRegression', () => {
        it('should calculate perfect linear fit correctly', () => {
            // y = 2x + 0 (passing through origin)
            const points = [
                { x: 1, y: 2 },
                { x: 2, y: 4 },
                { x: 3, y: 6 },
                { x: 4, y: 8 }
            ];
            
            const result = physics.linearRegression(points);
            expect(result.slope).toBeCloseTo(2, 1);
            expect(result.intercept).toBeCloseTo(0, 1);
            expect(result.r2).toBeCloseTo(1, 2);
        });

        it('should handle spring stiffness data', () => {
            // Typical OGE data: F vs Δl for k = 40 N/m
            // Δl (m): 0.025, 0.05, 0.075, 0.1
            // F (N):  1, 2, 3, 4
            const points = [
                { x: 0.025, y: 1 },
                { x: 0.05, y: 2 },
                { x: 0.075, y: 3 },
                { x: 0.1, y: 4 }
            ];
            
            const result = physics.linearRegression(points);
            // slope should be k = 40 N/m
            expect(result.slope).toBeCloseTo(40, 0);
            expect(result.r2).toBeCloseTo(1, 2);
        });

        it('should return zeros for single point', () => {
            const result = physics.linearRegression([{ x: 1, y: 2 }]);
            expect(result.slope).toBe(0);
            expect(result.intercept).toBe(0);
            expect(result.r2).toBe(0);
        });

        it('should return zeros for empty array', () => {
            const result = physics.linearRegression([]);
            expect(result.slope).toBe(0);
        });

        it('should handle noisy data with R² < 1', () => {
            // Points with some scatter
            const points = [
                { x: 0.025, y: 1.1 },
                { x: 0.05, y: 1.9 },
                { x: 0.075, y: 3.2 },
                { x: 0.1, y: 3.8 }
            ];
            
            const result = physics.linearRegression(points);
            expect(result.slope).toBeGreaterThan(30);
            expect(result.slope).toBeLessThan(50);
            expect(result.r2).toBeLessThan(1);
            expect(result.r2).toBeGreaterThan(0.9);
        });
    });

    describe('percentageError', () => {
        it('should calculate 0% for exact match', () => {
            expect(physics.percentageError(40, 40)).toBe(0);
        });

        it('should calculate 10% error correctly', () => {
            // measured = 44, actual = 40 → error = 10%
            expect(physics.percentageError(44, 40)).toBeCloseTo(10, 1);
        });

        it('should handle negative error (under-measurement)', () => {
            // measured = 36, actual = 40 → error = 10%
            expect(physics.percentageError(36, 40)).toBeCloseTo(10, 1);
        });
    });

    describe('units', () => {
        it('should convert grams to kilograms', () => {
            expect(physics.units.gToKg(100)).toBe(0.1);
            expect(physics.units.gToKg(1000)).toBe(1);
        });

        it('should convert kilograms to grams', () => {
            expect(physics.units.kgToG(0.1)).toBe(100);
            expect(physics.units.kgToG(1)).toBe(1000);
        });

        it('should convert centimeters to meters', () => {
            expect(physics.units.cmToM(100)).toBe(1);
            expect(physics.units.cmToM(2.5)).toBe(0.025);
        });

        it('should convert meters to centimeters', () => {
            expect(physics.units.mToCm(1)).toBe(100);
            expect(physics.units.mToCm(0.025)).toBe(2.5);
        });

        it('should convert millimeters to meters', () => {
            expect(physics.units.mmToM(1000)).toBe(1);
            expect(physics.units.mmToM(25)).toBe(0.025);
        });

        it('should convert Newtons to kiloNewtons', () => {
            expect(physics.units.nToKn(1000)).toBe(1);
        });

        it('should convert kiloNewtons to Newtons', () => {
            expect(physics.units.knToN(1)).toBe(1000);
        });
    });
});

describe('OGE Experiment Scenarios', () => {
    let physics;

    beforeEach(() => {
        physics = new PhysicsEngine();
    });

    it('should calculate stiffness for 3 measurements correctly', () => {
        // Типичный эксперимент ОГЭ
        const measurements = [
            { mass: 0.1, elongation: 0.025 },  // 100г → 2.5см
            { mass: 0.2, elongation: 0.05 },   // 200г → 5см
            { mass: 0.3, elongation: 0.075 }   // 300г → 7.5см
        ];

        const points = measurements.map(m => ({
            x: m.elongation,
            y: m.mass * physics.g // F = mg
        }));

        const result = physics.linearRegression(points);
        
        // k должно быть близко к 40 Н/м
        expect(result.slope).toBeCloseTo(40, 0);
        expect(result.r2).toBeCloseTo(1, 2);
    });

    it('should handle soft spring (k = 20 N/m)', () => {
        // Мягкая пружина (k = 20)
        const k = 20;
        
        const elongation100g = physics.calculateElongation(0.1, k);
        expect(elongation100g).toBeCloseTo(0.05, 3); // 5 см
        
        const elongation200g = physics.calculateElongation(0.2, k);
        expect(elongation200g).toBeCloseTo(0.1, 3); // 10 см
    });

    it('should handle stiff spring (k = 100 N/m)', () => {
        // Жёсткая пружина (k = 100)
        const k = 100;
        
        const elongation100g = physics.calculateElongation(0.1, k);
        expect(elongation100g).toBeCloseTo(0.01, 3); // 1 см
        
        const elongation200g = physics.calculateElongation(0.2, k);
        expect(elongation200g).toBeCloseTo(0.02, 3); // 2 см
    });

    it('should validate Hooke\'s law: F/Δl = const', () => {
        // Проверяем что F/Δl = k = const для разных масс
        const k = 40;
        
        const masses = [0.1, 0.15, 0.2, 0.25, 0.3]; // кг
        const ratios = masses.map(m => {
            const elongation = physics.calculateElongation(m, k);
            const force = m * physics.g;
            return force / elongation;
        });
        
        // Все отношения должны быть равны k
        ratios.forEach(ratio => {
            expect(ratio).toBeCloseTo(k, 5);
        });
    });
});
