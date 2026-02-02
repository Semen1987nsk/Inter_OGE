/**
 * 🧪 Движок химических реакций для ОГЭ
 * Обрабатывает логику смешивания веществ и визуальные эффекты
 */

import { SUBSTANCES, REACTIONS, INDICATORS, findReaction, getIndicatorColor, getReactionDescription } from './chemistry-data.js';

/**
 * Класс для представления пробирки с содержимым
 */
export class TestTube {
    constructor(id, maxVolume = 100) {
        this.id = id;
        this.maxVolume = maxVolume;
        this.contents = []; // Массив добавленных веществ
        this.liquidLevel = 0;
        this.precipitateLevel = 0;
        this.liquidColor = 'rgba(200, 220, 255, 0.6)';
        this.precipitateColor = null;
        this.isGasReleasing = false;
        this.temperature = 20; // °C
        this.pH = 7;
        this.reactionHistory = [];
    }

    /**
     * Добавить вещество в пробирку
     */
    addSubstance(substanceId, volume = 10) {
        const substance = SUBSTANCES[substanceId];
        if (!substance) {
            console.warn(`Вещество не найдено: ${substanceId}`);
            return { success: false, error: 'Вещество не найдено' };
        }

        if (this.liquidLevel + volume > this.maxVolume) {
            return { success: false, error: 'Пробирка переполнена' };
        }

        // Проверяем реакции со всеми веществами в пробирке
        const reactions = [];
        for (const content of this.contents) {
            const reaction = findReaction(content.id, substanceId);
            if (reaction) {
                reactions.push(reaction);
            }
        }

        // Добавляем вещество
        this.contents.push({
            id: substanceId,
            name: substance.name,
            formula: substance.formula,
            volume: volume,
            addedAt: Date.now()
        });

        this.liquidLevel += volume;

        // Обновляем цвет жидкости
        this._updateLiquidColor();

        // Применяем все реакции
        const reactionResults = [];
        for (const reaction of reactions) {
            const result = this._applyReaction(reaction);
            reactionResults.push(result);
        }

        return {
            success: true,
            substance: substance,
            reactions: reactionResults
        };
    }

    /**
     * Добавить индикатор
     */
    addIndicator(indicatorId) {
        const indicator = INDICATORS[indicatorId];
        if (!indicator) {
            return { success: false, error: 'Индикатор не найден' };
        }

        // Определяем среду по содержимому
        let environment = 'neutral';
        for (const content of this.contents) {
            const substance = SUBSTANCES[content.id];
            if (substance) {
                if (substance.type === 'acid' || substance.category === 'acid') {
                    environment = 'acidic';
                    break;
                }
                if (substance.type === 'base' || substance.category === 'base' || substance.isBase) {
                    environment = 'alkaline';
                    break;
                }
            }
        }

        const colorInfo = getIndicatorColor(indicatorId, environment);
        if (colorInfo) {
            this.liquidColor = colorInfo.color;
        }

        this.contents.push({
            id: indicatorId,
            name: indicator.name,
            type: 'indicator',
            volume: 1,
            addedAt: Date.now()
        });

        return {
            success: true,
            indicator: indicator,
            environment: environment,
            color: colorInfo
        };
    }

    /**
     * Применить реакцию
     */
    _applyReaction(reaction) {
        const result = {
            reaction: reaction,
            effects: []
        };

        // Газовыделение
        if (reaction.effects.gas) {
            this.isGasReleasing = true;
            result.effects.push({
                type: 'gas',
                gas: reaction.effects.gas,
                description: this._getGasDescription(reaction.effects.gas)
            });
            setTimeout(() => { this.isGasReleasing = false; }, 3000);
        }

        // Осадок
        if (reaction.effects.precipitate) {
            this.precipitateColor = reaction.effects.precipitate;
            this.precipitateLevel = Math.min(30, this.precipitateLevel + 15);
            result.effects.push({
                type: 'precipitate',
                color: reaction.effects.precipitate,
                description: this._getPrecipitateDescription(reaction.effects.precipitate)
            });
        }

        // Изменение цвета раствора
        if (reaction.effects.color) {
            this.liquidColor = this._colorNameToRgba(reaction.effects.color);
            result.effects.push({
                type: 'colorChange',
                color: reaction.effects.color
            });
        }

        // Выделение тепла
        if (reaction.effects.heat) {
            this.temperature += reaction.effects.heat === 'strong' ? 30 : 10;
            result.effects.push({
                type: 'heat',
                intensity: reaction.effects.heat
            });
        }

        // Растворение осадка
        if (reaction.effects.dissolve) {
            this.precipitateLevel = 0;
            this.precipitateColor = null;
            result.effects.push({
                type: 'dissolve'
            });
        }

        // Сохраняем в историю
        this.reactionHistory.push({
            reaction: reaction,
            timestamp: Date.now(),
            effects: result.effects
        });

        return result;
    }

    /**
     * Обновить цвет жидкости на основе содержимого
     */
    _updateLiquidColor() {
        // Берём цвет последнего добавленного вещества с цветом
        for (let i = this.contents.length - 1; i >= 0; i--) {
            const content = this.contents[i];
            if (content.type === 'indicator') continue;
            
            const substance = SUBSTANCES[content.id];
            if (substance && substance.color !== 'colorless' && substance.color !== 'white') {
                this.liquidColor = this._colorNameToRgba(substance.color);
                return;
            }
        }
        // По умолчанию - бесцветный
        this.liquidColor = 'rgba(200, 220, 255, 0.6)';
    }

    /**
     * Конвертировать название цвета в RGBA
     */
    _colorNameToRgba(colorName) {
        const colors = {
            'colorless': 'rgba(200, 220, 255, 0.5)',
            'transparent': 'rgba(200, 220, 255, 0.3)',
            'blue': 'rgba(65, 105, 225, 0.7)',
            'light-blue': 'rgba(135, 206, 235, 0.7)',
            'green': 'rgba(34, 139, 34, 0.7)',
            'pale-green': 'rgba(152, 251, 152, 0.7)',
            'yellow': 'rgba(255, 215, 0, 0.7)',
            'orange': 'rgba(255, 140, 0, 0.7)',
            'red': 'rgba(220, 20, 60, 0.7)',
            'pink': 'rgba(255, 105, 180, 0.7)',
            'crimson': 'rgba(220, 20, 60, 0.8)',
            'purple': 'rgba(128, 0, 128, 0.7)',
            'brown': 'rgba(139, 69, 19, 0.7)',
            'yellow-brown': 'rgba(184, 134, 11, 0.7)',
            'white': 'rgba(255, 255, 255, 0.9)',
            'black': 'rgba(30, 30, 30, 0.9)',
            'gray': 'rgba(128, 128, 128, 0.7)',
            'silver': 'rgba(192, 192, 192, 0.8)'
        };
        return colors[colorName] || colors['colorless'];
    }

    /**
     * Получить описание выделяющегося газа
     */
    _getGasDescription(gasName) {
        const gases = {
            'H2': 'Выделяется бесцветный газ водород (H₂)',
            'CO2': 'Выделяется бесцветный газ углекислый газ (CO₂) с характерным шипением',
            'H2S': 'Выделяется газ сероводород (H₂S) с запахом тухлых яиц',
            'NH3': 'Выделяется аммиак (NH₃) с резким запахом',
            'SO2': 'Выделяется сернистый газ (SO₂) с резким запахом',
            'Cl2': 'Выделяется хлор (Cl₂) - жёлто-зелёный газ с резким запахом',
            'NO2': 'Выделяется бурый газ - оксид азота (IV) (NO₂)'
        };
        return gases[gasName] || `Выделяется газ ${gasName}`;
    }

    /**
     * Получить описание осадка
     */
    _getPrecipitateDescription(color) {
        const descriptions = {
            'white': 'белый осадок',
            'blue': 'синий (голубой) осадок гидроксида',
            'green': 'зелёный осадок гидроксида',
            'yellow': 'жёлтый осадок',
            'orange': 'оранжевый осадок',
            'red': 'красный осадок',
            'brown': 'бурый осадок гидроксида',
            'black': 'чёрный осадок сульфида',
            'gray': 'серый осадок'
        };
        return `Выпадает ${descriptions[color] || `${color} осадок`}`;
    }

    /**
     * Очистить пробирку
     */
    clear() {
        this.contents = [];
        this.liquidLevel = 0;
        this.precipitateLevel = 0;
        this.liquidColor = 'rgba(200, 220, 255, 0.6)';
        this.precipitateColor = null;
        this.isGasReleasing = false;
        this.temperature = 20;
        this.pH = 7;
    }

    /**
     * Получить текущее состояние для рендеринга
     */
    getState() {
        return {
            id: this.id,
            liquidLevel: this.liquidLevel,
            liquidColor: this.liquidColor,
            precipitateLevel: this.precipitateLevel,
            precipitateColor: this.precipitateColor ? this._colorNameToRgba(this.precipitateColor) : null,
            isGasReleasing: this.isGasReleasing,
            temperature: this.temperature,
            contents: [...this.contents]
        };
    }

    /**
     * Получить наблюдаемый результат для записи
     */
    getObservation() {
        const observations = [];
        
        if (this.reactionHistory.length === 0) {
            return 'Видимых изменений не наблюдается';
        }

        const lastReaction = this.reactionHistory[this.reactionHistory.length - 1];
        
        for (const effect of lastReaction.effects) {
            switch (effect.type) {
                case 'precipitate':
                    observations.push(effect.description);
                    break;
                case 'gas':
                    observations.push(effect.description);
                    break;
                case 'colorChange':
                    observations.push(`Раствор приобретает ${effect.color} окраску`);
                    break;
                case 'heat':
                    observations.push('Наблюдается разогревание раствора');
                    break;
                case 'dissolve':
                    observations.push('Осадок растворяется');
                    break;
            }
        }

        return observations.length > 0 ? observations.join('; ') : 'Видимых изменений не наблюдается';
    }
}

/**
 * Класс движка химических реакций
 */
export class ChemistryEngine {
    constructor() {
        this.testTubes = new Map();
        this.experiments = [];
        this.currentKit = null;
        this.unknownSubstances = {
            bottle1: null,
            bottle2: null
        };
        this.selectedReagents = [];
    }

    /**
     * Инициализировать набор реактивов
     */
    setKit(kitData) {
        this.currentKit = kitData;
        this.unknownSubstances.bottle1 = kitData.unknowns[0];
        this.unknownSubstances.bottle2 = kitData.unknowns[1];
        this.selectedReagents = [];
        this.experiments = [];
        this.testTubes.clear();
        
        // Создаём 4 пробирки для экспериментов
        for (let i = 1; i <= 4; i++) {
            this.testTubes.set(`tube${i}`, new TestTube(`tube${i}`));
        }
    }

    /**
     * Получить пробирку по ID
     */
    getTestTube(id) {
        return this.testTubes.get(id);
    }

    /**
     * Создать новую пробирку
     */
    createTestTube(id) {
        const tube = new TestTube(id);
        this.testTubes.set(id, tube);
        return tube;
    }

    /**
     * Провести эксперимент
     */
    performExperiment(experimentNumber, bottleNumber, reagentId) {
        // Определяем какую пробирку использовать
        const tubeId = `tube${experimentNumber}`;
        let tube = this.testTubes.get(tubeId);
        
        if (!tube) {
            tube = this.createTestTube(tubeId);
        }

        // Очищаем пробирку перед новым экспериментом
        tube.clear();

        // Определяем неизвестное вещество
        const unknownId = bottleNumber === 1 ? 
            this.unknownSubstances.bottle1 : 
            this.unknownSubstances.bottle2;

        // Добавляем неизвестное вещество
        tube.addSubstance(unknownId, 20);

        // Добавляем реагент (или индикатор)
        let result;
        if (INDICATORS[reagentId]) {
            result = tube.addIndicator(reagentId);
        } else {
            result = tube.addSubstance(reagentId, 10);
        }

        // Записываем эксперимент
        const experiment = {
            number: experimentNumber,
            bottleNumber: bottleNumber,
            unknownSubstance: unknownId,
            reagent: reagentId,
            tubeId: tubeId,
            result: result,
            observation: tube.getObservation(),
            timestamp: Date.now()
        };

        this.experiments.push(experiment);

        return {
            experiment: experiment,
            tubeState: tube.getState()
        };
    }

    /**
     * Проверить идентификацию вещества
     */
    checkIdentification(bottleNumber, guessedSubstanceId) {
        const actualId = bottleNumber === 1 ? 
            this.unknownSubstances.bottle1 : 
            this.unknownSubstances.bottle2;
        
        return {
            correct: actualId === guessedSubstanceId,
            actual: actualId,
            guessed: guessedSubstanceId,
            actualName: SUBSTANCES[actualId]?.name,
            guessedName: SUBSTANCES[guessedSubstanceId]?.name
        };
    }

    /**
     * Получить уравнение реакции для эксперимента
     */
    getReactionEquation(experimentNumber) {
        const experiment = this.experiments.find(e => e.number === experimentNumber);
        if (!experiment) return null;

        const reaction = findReaction(experiment.unknownSubstance, experiment.reagent);
        if (!reaction) return null;

        return {
            molecular: reaction.equation,
            fullIonic: reaction.ionicFull || this._generateFullIonic(reaction),
            shortIonic: reaction.ionicShort || this._generateShortIonic(reaction)
        };
    }

    /**
     * Генерация полного ионного уравнения (упрощённо)
     */
    _generateFullIonic(reaction) {
        // Это упрощённая версия - в реальности нужна более сложная логика
        return reaction.ionicFull || reaction.equation + ' (ионное)';
    }

    /**
     * Генерация сокращённого ионного уравнения
     */
    _generateShortIonic(reaction) {
        return reaction.ionicShort || 'См. справочник';
    }

    /**
     * Оценить работу
     */
    evaluateWork(answers) {
        const results = {
            experiments: [],
            identification: [],
            equations: [],
            totalScore: 0,
            maxScore: 5
        };

        // Проверка экспериментов (наблюдения)
        for (let i = 0; i < 4; i++) {
            const exp = this.experiments[i];
            if (exp && answers.observations[i]) {
                // Упрощённая проверка - в реальности нужно NLP
                const isCorrect = this._checkObservation(exp.observation, answers.observations[i]);
                results.experiments.push({
                    experimentNumber: i + 1,
                    correct: isCorrect,
                    expected: exp.observation,
                    given: answers.observations[i]
                });
                if (isCorrect) results.totalScore += 0.5;
            }
        }

        // Проверка идентификации
        for (let bottle of [1, 2]) {
            const check = this.checkIdentification(bottle, answers.identifications[bottle - 1]);
            results.identification.push(check);
            if (check.correct) results.totalScore += 1;
        }

        // Проверка уравнений (упрощённо)
        if (answers.equations) {
            // Добавляем баллы за уравнения
            results.totalScore += answers.equations.length * 0.25;
        }

        // Округляем до целого
        results.totalScore = Math.min(Math.round(results.totalScore), 5);

        return results;
    }

    /**
     * Проверить наблюдение (упрощённо)
     */
    _checkObservation(expected, given) {
        if (!expected || !given) return false;
        
        const expectedLower = expected.toLowerCase();
        const givenLower = given.toLowerCase();
        
        // Проверяем ключевые слова
        const keywords = ['осадок', 'газ', 'пузыр', 'цвет', 'окраск', 'белый', 'синий', 
                         'голубой', 'зелёный', 'жёлтый', 'бурый', 'чёрный', 'растворяется'];
        
        for (const keyword of keywords) {
            if (expectedLower.includes(keyword) && givenLower.includes(keyword)) {
                return true;
            }
        }
        
        return givenLower.length > 10 && expectedLower.includes(givenLower.slice(0, 20));
    }

    /**
     * Получить подсказку для эксперимента
     */
    getHint(experimentNumber) {
        const experiment = this.experiments.find(e => e.number === experimentNumber);
        if (!experiment) return null;

        const unknownSubstance = SUBSTANCES[experiment.unknownSubstance];
        const reagent = SUBSTANCES[experiment.reagent] || INDICATORS[experiment.reagent];

        return {
            hint: `При взаимодействии ${unknownSubstance?.name || 'вещества'} с ${reagent?.name || 'реагентом'}...`,
            observation: experiment.observation
        };
    }

    /**
     * Сбросить все эксперименты
     */
    reset() {
        this.experiments = [];
        for (const tube of this.testTubes.values()) {
            tube.clear();
        }
    }

    /**
     * Получить состояние для сохранения
     */
    getState() {
        return {
            currentKit: this.currentKit,
            unknownSubstances: this.unknownSubstances,
            experiments: this.experiments,
            testTubes: Array.from(this.testTubes.entries()).map(([id, tube]) => ({
                id,
                state: tube.getState()
            }))
        };
    }
}

/**
 * Класс эффектов реакций для визуализации
 */
export class ReactionEffects {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.bubbles = [];
        this.animationId = null;
    }

    /**
     * Запустить эффект пузырьков газа
     */
    startBubbles(x, y, duration = 3000) {
        const startTime = Date.now();
        const endTime = startTime + duration;

        const createBubble = () => {
            if (Date.now() > endTime) return;

            this.bubbles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                radius: 2 + Math.random() * 4,
                speed: 1 + Math.random() * 2,
                opacity: 0.8
            });

            setTimeout(createBubble, 100 + Math.random() * 200);
        };

        createBubble();
    }

    /**
     * Запустить эффект выпадения осадка
     */
    startPrecipitate(x, y, color, duration = 2000) {
        const startTime = Date.now();
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.particles.push({
                    x: x + (Math.random() - 0.5) * 30,
                    y: y - 20 + Math.random() * 40,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: 0.5 + Math.random() * 1,
                    radius: 1 + Math.random() * 2,
                    color: color,
                    opacity: 0.9
                });
            }, i * (duration / 50));
        }
    }

    /**
     * Запустить эффект изменения цвета
     */
    colorTransition(element, fromColor, toColor, duration = 500) {
        const start = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            
            // Интерполяция цвета
            const currentColor = this._interpolateColor(fromColor, toColor, progress);
            element.style.backgroundColor = currentColor;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    /**
     * Интерполяция цветов
     */
    _interpolateColor(color1, color2, factor) {
        // Упрощённая интерполяция для RGBA цветов
        const parseRgba = (str) => {
            const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseFloat(match[4] || 1)];
            }
            return [200, 220, 255, 0.6];
        };

        const c1 = parseRgba(color1);
        const c2 = parseRgba(color2);

        const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor);
        const a = c1[3] + (c2[3] - c1[3]) * factor;

        return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    }

    /**
     * Обновить и отрисовать все эффекты
     */
    update() {
        // Обновляем пузырьки
        this.bubbles = this.bubbles.filter(bubble => {
            bubble.y -= bubble.speed;
            bubble.opacity -= 0.01;
            return bubble.opacity > 0;
        });

        // Обновляем частицы осадка
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.05; // гравитация
            particle.opacity -= 0.005;
            return particle.opacity > 0;
        });
    }

    /**
     * Отрисовать эффекты на canvas
     */
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем пузырьки
        for (const bubble of this.bubbles) {
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity})`;
            this.ctx.fill();
            this.ctx.strokeStyle = `rgba(200, 200, 255, ${bubble.opacity})`;
            this.ctx.stroke();
        }

        // Рисуем частицы осадка
        for (const particle of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${particle.opacity})`);
            this.ctx.fill();
        }
    }

    /**
     * Запустить анимационный цикл
     */
    startAnimation() {
        const loop = () => {
            this.update();
            this.render();
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    /**
     * Остановить анимацию
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// Экспорт по умолчанию
export default ChemistryEngine;
