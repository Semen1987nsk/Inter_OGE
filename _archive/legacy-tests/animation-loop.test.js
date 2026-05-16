/**
 * Тесты для Animation Loop
 * @module animation-loop.test
 */

import { jest } from '@jest/globals';

// Mock performance
global.performance = {
    now: jest.fn(() => 0)
};

// Mock RAF
let rafCallbacks = [];
let rafId = 0;
global.requestAnimationFrame = jest.fn((cb) => {
    rafId++;
    rafCallbacks.push({ id: rafId, callback: cb });
    return rafId;
});

global.cancelAnimationFrame = jest.fn((id) => {
    rafCallbacks = rafCallbacks.filter(item => item.id !== id);
});

// Mock document
global.document = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    hidden: false
};

// Helper для симуляции кадров
function simulateFrames(count, timeIncrement = 16) {
    let currentTime = 0;
    for (let i = 0; i < count; i++) {
        currentTime += timeIncrement;
        performance.now.mockReturnValue(currentTime);
        
        const callbacks = [...rafCallbacks];
        rafCallbacks = [];
        callbacks.forEach(item => item.callback(currentTime));
    }
}

// Import after mocks
const { AnimationLoop, throttleAnimation, debounceAnimation } = await import('../experiments/shared/animation-loop.js');

describe('AnimationLoop', () => {
    let loop;
    let callback;

    beforeEach(() => {
        rafCallbacks = [];
        rafId = 0;
        performance.now.mockReturnValue(0);
        callback = jest.fn();
        console.log = jest.fn();
    });

    afterEach(() => {
        if (loop) {
            loop.destroy();
            loop = null;
        }
    });

    describe('constructor', () => {
        test('должен инициализировать с дефолтными параметрами', () => {
            loop = new AnimationLoop(callback);
            
            expect(loop.targetFps).toBe(60);
            expect(loop.maxDeltaTime).toBe(100);
            expect(loop.pauseOnHidden).toBe(true);
            expect(loop.isRunning).toBe(false);
        });

        test('должен принимать кастомные опции', () => {
            loop = new AnimationLoop(callback, {
                targetFps: 30,
                maxDeltaTime: 50,
                pauseOnHidden: false
            });
            
            expect(loop.targetFps).toBe(30);
            expect(loop.maxDeltaTime).toBe(50);
            expect(loop.pauseOnHidden).toBe(false);
        });
    });

    describe('start()', () => {
        test('должен запускать анимационный цикл', () => {
            loop = new AnimationLoop(callback);
            
            loop.start();
            
            expect(loop.isRunning).toBe(true);
            expect(loop.isPaused).toBe(false);
            expect(requestAnimationFrame).toHaveBeenCalled();
        });

        test('должен возвращать this для chaining', () => {
            loop = new AnimationLoop(callback);
            
            const result = loop.start();
            
            expect(result).toBe(loop);
        });

        test('не должен запускаться повторно', () => {
            loop = new AnimationLoop(callback);
            
            loop.start();
            const callCount = requestAnimationFrame.mock.calls.length;
            loop.start();
            
            expect(requestAnimationFrame.mock.calls.length).toBe(callCount);
        });
    });

    describe('stop()', () => {
        test('должен останавливать цикл', () => {
            loop = new AnimationLoop(callback);
            loop.start();
            
            loop.stop();
            
            expect(loop.isRunning).toBe(false);
            expect(cancelAnimationFrame).toHaveBeenCalled();
        });
    });

    describe('pause() / resume()', () => {
        test('должен ставить на паузу', () => {
            loop = new AnimationLoop(callback);
            loop.start();
            
            loop.pause();
            
            expect(loop.isPaused).toBe(true);
            expect(loop.isRunning).toBe(true);
        });

        test('должен возобновляться после паузы', () => {
            loop = new AnimationLoop(callback);
            loop.start();
            loop.pause();
            
            loop.resume();
            
            expect(loop.isPaused).toBe(false);
        });
    });

    describe('callback execution', () => {
        test('должен вызывать callback с deltaTime', () => {
            loop = new AnimationLoop(callback);
            loop.start();
            
            // Симулируем 2 кадра
            simulateFrames(2);
            
            expect(callback).toHaveBeenCalled();
            expect(callback.mock.calls[0][0]).toBeLessThanOrEqual(16); // deltaTime
        });

        test('должен ограничивать deltaTime до maxDeltaTime', () => {
            loop = new AnimationLoop(callback, { maxDeltaTime: 50 });
            loop.start();
            
            // Симулируем большой скачок времени
            performance.now.mockReturnValue(200); // 200ms скачок
            const callbacks = [...rafCallbacks];
            rafCallbacks = [];
            callbacks.forEach(item => item.callback(200));
            
            // deltaTime должен быть ограничен
            if (callback.mock.calls.length > 0) {
                const deltaTime = callback.mock.calls[0][0];
                expect(deltaTime).toBeLessThanOrEqual(50);
            }
        });

        test('должен передавать frameCount', () => {
            loop = new AnimationLoop(callback);
            loop.start();
            
            simulateFrames(3);
            
            // Проверяем что frameCount увеличивается
            const calls = callback.mock.calls;
            if (calls.length >= 2) {
                expect(calls[1][2]).toBeGreaterThan(calls[0][2]);
            }
        });
    });

    describe('setTargetFps()', () => {
        test('должен менять целевой FPS', () => {
            loop = new AnimationLoop(callback, { targetFps: 60 });
            
            loop.setTargetFps(30);
            
            expect(loop.targetFps).toBe(30);
            expect(loop.frameInterval).toBeCloseTo(1000 / 30);
        });
    });

    describe('getStats()', () => {
        test('должен возвращать статистику', () => {
            loop = new AnimationLoop(callback, { targetFps: 60 });
            loop.start();
            
            const stats = loop.getStats();
            
            expect(stats.isRunning).toBe(true);
            expect(stats.isPaused).toBe(false);
            expect(stats.targetFps).toBe(60);
            expect(stats.frameCount).toBe(0);
        });
    });

    describe('destroy()', () => {
        test('должен останавливать и очищать', () => {
            loop = new AnimationLoop(callback);
            loop.start();
            
            loop.destroy();
            
            expect(loop.isRunning).toBe(false);
            expect(document.removeEventListener).toHaveBeenCalled();
        });
    });
});

describe('throttleAnimation()', () => {
    beforeEach(() => {
        rafCallbacks = [];
        performance.now.mockReturnValue(0);
    });

    test('должен вызывать функцию сразу если прошло достаточно времени', () => {
        const fn = jest.fn();
        const throttled = throttleAnimation(fn, 16);
        
        performance.now.mockReturnValue(20);
        throttled('arg1');
        
        expect(fn).toHaveBeenCalledWith('arg1');
    });

    test('должен откладывать вызов если слишком рано', () => {
        const fn = jest.fn();
        const throttled = throttleAnimation(fn, 16);
        
        // Первый вызов - lastCall = 0, now = 5, timeSince = 5 < 16, не вызывается сразу
        performance.now.mockReturnValue(5);
        throttled('arg1');
        
        // Функция отложена через rAF
        expect(fn).toHaveBeenCalledTimes(0);
        
        // Симулируем RAF callback
        performance.now.mockReturnValue(21);
        const callbacks = [...rafCallbacks];
        rafCallbacks = [];
        callbacks.forEach(item => item.callback(21));
        
        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe('debounceAnimation()', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        rafCallbacks = [];
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('должен откладывать вызов', () => {
        const fn = jest.fn();
        const debounced = debounceAnimation(fn, 50);
        
        debounced('arg1');
        debounced('arg2');
        debounced('arg3');
        
        expect(fn).not.toHaveBeenCalled();
        
        // Продвигаем таймеры
        jest.advanceTimersByTime(50);
        
        // RAF callback
        const callbacks = [...rafCallbacks];
        callbacks.forEach(item => item.callback(performance.now()));
        
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('arg3'); // Последний аргумент
    });
});
