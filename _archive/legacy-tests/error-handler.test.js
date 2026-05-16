/**
 * Тесты для Error Handler
 * @module error-handler.test
 */

import { jest } from '@jest/globals';

// Mock DOM для Node.js
global.document = {
    getElementById: jest.fn(() => null),
    createElement: jest.fn(() => ({
        style: {},
        innerHTML: '',
        id: '',
        remove: jest.fn(),
        onclick: null,
        appendChild: jest.fn()
    })),
    body: {
        appendChild: jest.fn()
    },
    head: {
        appendChild: jest.fn()
    },
    addEventListener: jest.fn()
};

global.window = {
    addEventListener: jest.fn()
};

// Import after mocks
const { ErrorHandler, safeCall, safeAsync } = await import('../experiments/shared/error-handler.js');

describe('ErrorHandler', () => {
    let handler;

    beforeEach(() => {
        handler = new ErrorHandler();
        handler.showNotifications = false; // Отключаем UI уведомления в тестах
        console.error = jest.fn();
        console.warn = jest.fn();
        console.info = jest.fn();
    });

    describe('handle()', () => {
        test('должен записывать ошибку в лог', () => {
            handler.handle(new Error('Test error'), 'TestModule', 'error');
            
            expect(handler.errorLog).toHaveLength(1);
            expect(handler.errorLog[0].message).toBe('Test error');
            expect(handler.errorLog[0].context).toBe('TestModule');
            expect(handler.errorLog[0].level).toBe('error');
        });

        test('должен обрабатывать строковые ошибки', () => {
            handler.handle('String error message', 'TestModule');
            
            expect(handler.errorLog).toHaveLength(1);
            expect(handler.errorLog[0].message).toBe('String error message');
        });

        test('должен использовать значения по умолчанию', () => {
            handler.handle('Error');
            
            expect(handler.errorLog[0].context).toBe('Unknown');
            expect(handler.errorLog[0].level).toBe('error');
        });

        test('должен ротировать лог при превышении maxLogSize', () => {
            handler.maxLogSize = 3;
            
            handler.handle('Error 1', 'Test');
            handler.handle('Error 2', 'Test');
            handler.handle('Error 3', 'Test');
            handler.handle('Error 4', 'Test');
            
            expect(handler.errorLog).toHaveLength(3);
            expect(handler.errorLog[0].message).toBe('Error 2');
            expect(handler.errorLog[2].message).toBe('Error 4');
        });

        test('должен логировать в консоль для разных уровней', () => {
            handler.handle('Critical!', 'Test', 'critical');
            expect(console.error).toHaveBeenCalled();

            handler.handle('Error!', 'Test', 'error');
            expect(console.error).toHaveBeenCalled();

            handler.handle('Warning!', 'Test', 'warning');
            expect(console.warn).toHaveBeenCalled();

            handler.handle('Info', 'Test', 'info');
            expect(console.info).toHaveBeenCalled();
        });
    });

    describe('getRecentErrors()', () => {
        test('должен возвращать последние N ошибок', () => {
            handler.handle('Error 1', 'Test');
            handler.handle('Error 2', 'Test');
            handler.handle('Error 3', 'Test');
            
            const recent = handler.getRecentErrors(2);
            
            expect(recent).toHaveLength(2);
            expect(recent[0].message).toBe('Error 2');
            expect(recent[1].message).toBe('Error 3');
        });

        test('должен возвращать все если меньше N', () => {
            handler.handle('Error 1', 'Test');
            
            const recent = handler.getRecentErrors(10);
            
            expect(recent).toHaveLength(1);
        });
    });

    describe('getStats()', () => {
        test('должен возвращать статистику по уровням', () => {
            handler.handle('E1', 'Test', 'error');
            handler.handle('E2', 'Test', 'error');
            handler.handle('W1', 'Test', 'warning');
            handler.handle('C1', 'Test', 'critical');
            
            const stats = handler.getStats();
            
            expect(stats.total).toBe(4);
            expect(stats.byLevel.error).toBe(2);
            expect(stats.byLevel.warning).toBe(1);
            expect(stats.byLevel.critical).toBe(1);
            expect(stats.byLevel.info).toBe(0);
        });

        test('должен возвращать статистику по контексту', () => {
            handler.handle('E1', 'ModuleA', 'error');
            handler.handle('E2', 'ModuleA', 'error');
            handler.handle('E3', 'ModuleB', 'error');
            
            const stats = handler.getStats();
            
            expect(stats.byContext.ModuleA).toBe(2);
            expect(stats.byContext.ModuleB).toBe(1);
        });
    });

    describe('clearLog()', () => {
        test('должен очищать лог', () => {
            handler.handle('Error 1', 'Test');
            handler.handle('Error 2', 'Test');
            
            handler.clearLog();
            
            expect(handler.errorLog).toHaveLength(0);
        });
    });
});

describe('safeCall()', () => {
    beforeEach(() => {
        console.error = jest.fn();
    });

    test('должен возвращать результат при успехе', () => {
        const result = safeCall(() => 42, 'Test');
        expect(result).toBe(42);
    });

    test('должен возвращать defaultValue при ошибке', () => {
        const result = safeCall(() => {
            throw new Error('Fail');
        }, 'Test', 'default');
        
        expect(result).toBe('default');
    });

    test('должен возвращать undefined при ошибке без defaultValue', () => {
        const result = safeCall(() => {
            throw new Error('Fail');
        }, 'Test');
        
        expect(result).toBeUndefined();
    });
});

describe('safeAsync()', () => {
    beforeEach(() => {
        console.error = jest.fn();
    });

    test('должен возвращать результат async функции', async () => {
        const result = await safeAsync(async () => {
            return Promise.resolve(42);
        }, 'Test');
        
        expect(result).toBe(42);
    });

    test('должен возвращать defaultValue при rejected promise', async () => {
        const result = await safeAsync(async () => {
            throw new Error('Async fail');
        }, 'Test', 'fallback');
        
        expect(result).toBe('fallback');
    });
});
