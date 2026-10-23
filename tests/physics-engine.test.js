/**
 * Unit Tests for PhysicsEngine
 * 
 * Tests the physics calculations the spring experiment calls:
 * - elongation Δl = m·g/k
 * - spring oscillations with damping
 * - overload check and measurement noise
 * - linear regression for stiffness calculation
 */

// Import PhysicsEngine - ESM import for Jest with --experimental-vm-modules
import { PhysicsEngine } from '../experiments/shared/physics-engine-v2.js';

describe('PhysicsEngine', () => {
    let physics;

    beforeEach(() => {
        physics = new PhysicsEngine();
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
    });

    describe('springOscillation', () => {
        it('should start at maximum amplitude at t=0', () => {
            const result = physics.springOscillation(40, 0.1, 0.05, 0);
            // At t=0: cos(0) = 1, exp(0) = 1 → position = x0
            expect(result.position).toBeCloseTo(0.05, 5);
        });

        // x(t) = x0·e^(-βt)·cos(ωt), β = 0,15 1/с, ω = √(k/m) = 20 рад/с.
        // При k = 40, m = 0,1, x0 = 0,05, t = 0,3:
        // v(t) = x0·e^(-βt)·(−β·cos(ωt) − ω·sin(ωt)) ≈ 0,26024 м/с.
        // Движок применяет затухание дважды и теряет член −β·cos(ωt):
        // отдаёт ≈ 0,25537 м/с, на 1,9 % меньше. Грубую ошибку знака, фазы
        // или поля этот допуск ловит, известный дефект — нет.
        it('velocity at t>0 is within 5% of the analytic derivative', () => {
            const result = physics.springOscillation(40, 0.1, 0.05, 0.3);
            expect(Math.abs(result.velocity - 0.26024) / 0.26024).toBeLessThan(0.05);
        });

        // Двойное затухание в springOscillation не чинится чисткой тестов
        // (НЕ-цель спеки 2026-10-23-тесты-без-ci). Тест зелёный, пока дефект
        // есть, и покраснеет после починки — тогда снять failing.
        test.failing('velocity at t>0 equals the analytic derivative', () => {
            const result = physics.springOscillation(40, 0.1, 0.05, 0.3);
            expect(result.velocity).toBeCloseTo(0.26024, 4);
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
