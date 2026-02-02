/**
 * 🧪 Виртуальная химическая лаборатория ОГЭ
 * Задание 23 — Качественный анализ веществ
 * 
 * Главный модуль эксперимента
 */

import { SUBSTANCES, REACTIONS, INDICATORS, REAGENT_KITS, findReaction, getIndicatorColor, getReactionDescription } from './chemistry-data.js';
import { ChemistryEngine, TestTube, ReactionEffects } from './chemistry-engine.js';
import { LabRenderer, TubeInteractionManager } from './lab-renderer.js';

/**
 * Главный класс виртуальной химической лаборатории
 */
class ChemistryLab {
    constructor() {
        // Состояние приложения
        this.state = {
            currentKitId: null,
            currentKit: null,
            experiments: [],
            selectedReagent: null,
            selectedBottle: null,
            selectedTube: null,
            experimentResults: {
                bottle1: { exp1: null, exp2: null, conclusion: null },
                bottle2: { exp1: null, exp2: null, conclusion: null }
            },
            equations: [],
            isVerified: false,
            score: 0
        };

        // Компоненты
        this.engine = new ChemistryEngine();
        this.renderer = null;
        this.interactionManager = null;
        this.effects = null;

        // DOM элементы
        this.elements = {};

        // Привязка методов
        this.init = this.init.bind(this);
        this.onKitChange = this.onKitChange.bind(this);
        this.onReagentDragStart = this.onReagentDragStart.bind(this);
        this.onDrop = this.onDrop.bind(this);
        this.verifyResults = this.verifyResults.bind(this);
        this.resetExperiment = this.resetExperiment.bind(this);
    }

    /**
     * Инициализация приложения
     */
    init() {
        console.log('🧪 Инициализация химической лаборатории...');
        
        this._cacheElements();
        this._setupEventListeners();
        this._initRenderer();
        this._loadDefaultKit();
        
        console.log('✅ Лаборатория готова к работе!');
    }

    /**
     * Кеширование DOM элементов
     */
    _cacheElements() {
        this.elements = {
            // Селектор набора
            kitSelector: document.getElementById('kit-selector'),
            
            // Панели
            reagentsPanel: document.querySelector('.reagents-panel'),
            reagentsShelf: document.getElementById('reagents-shelf'),
            indicatorsShelf: document.getElementById('indicators-shelf'),
            
            // Canvas
            canvasContainer: document.querySelector('.canvas-container'),
            
            // Пробирки
            testTubeRack: document.getElementById('test-tube-rack'),
            tubes: document.querySelectorAll('.test-tube'),
            
            // Неизвестные флаконы
            bottle1: document.getElementById('bottle-1'),
            bottle2: document.getElementById('bottle-2'),
            
            // Таблица результатов
            resultsTable: document.querySelector('.results-table tbody'),
            
            // Уравнения
            equationsContainer: document.getElementById('equations-container'),
            
            // Кнопки
            btnVerify: document.getElementById('btn-verify'),
            btnReset: document.getElementById('btn-reset'),
            btnHint: document.getElementById('btn-hint'),
            btnReference: document.getElementById('btn-reference'),
            
            // Отображение баллов
            scoreDisplay: document.getElementById('score-display'),
            
            // Модальные окна
            referencePanel: document.getElementById('reference-panel'),
            resultModal: document.getElementById('result-modal')
        };
    }

    /**
     * Настройка обработчиков событий
     */
    _setupEventListeners() {
        // Смена набора реактивов
        if (this.elements.kitSelector) {
            this.elements.kitSelector.addEventListener('change', this.onKitChange);
        }

        // Drag & Drop для реагентов
        this._setupDragAndDrop();

        // Клики по пробиркам
        this.elements.tubes?.forEach(tube => {
            tube.addEventListener('click', (e) => this.onTubeClick(e, tube));
        });

        // Кнопки управления
        this.elements.btnVerify?.addEventListener('click', this.verifyResults);
        this.elements.btnReset?.addEventListener('click', this.resetExperiment);
        this.elements.btnHint?.addEventListener('click', () => this.showHint());
        this.elements.btnReference?.addEventListener('click', () => this.toggleReference());

        // Закрытие справочника
        document.querySelector('.btn-close')?.addEventListener('click', () => {
            this.elements.referencePanel?.classList.remove('open');
        });

        // Закрытие модального окна
        document.querySelector('.btn-close-modal')?.addEventListener('click', () => {
            this.elements.resultModal?.style.display = 'none';
        });

        // Обновление уравнений при изменении
        document.querySelectorAll('.equation-input').forEach(input => {
            input.addEventListener('input', (e) => this.onEquationInput(e));
        });

        // Выбор реагента и наблюдения
        this._setupTableEvents();
    }

    /**
     * Настройка Drag & Drop
     */
    _setupDragAndDrop() {
        // Делаем реагенты перетаскиваемыми
        document.querySelectorAll('.reagent-bottle').forEach(bottle => {
            bottle.setAttribute('draggable', 'true');
            bottle.addEventListener('dragstart', this.onReagentDragStart);
        });

        // Делаем индикаторы перетаскиваемыми
        document.querySelectorAll('.indicator-item').forEach(indicator => {
            indicator.setAttribute('draggable', 'true');
            indicator.addEventListener('dragstart', (e) => {
                const indicatorId = e.currentTarget.dataset.indicator;
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'indicator',
                    id: indicatorId
                }));
            });
        });

        // Зоны для drop (пробирки)
        this.elements.tubes?.forEach((tube, index) => {
            tube.addEventListener('dragover', (e) => {
                e.preventDefault();
                tube.classList.add('active');
            });
            
            tube.addEventListener('dragleave', () => {
                tube.classList.remove('active');
            });
            
            tube.addEventListener('drop', (e) => {
                e.preventDefault();
                tube.classList.remove('active');
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                this.onDropToTube(tube, data, index);
            });
        });

        // Неизвестные флаконы
        [this.elements.bottle1, this.elements.bottle2].forEach((bottle, index) => {
            if (bottle) {
                bottle.setAttribute('draggable', 'true');
                bottle.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'unknown',
                        bottleNumber: index + 1
                    }));
                });
            }
        });
    }

    /**
     * Настройка событий таблицы результатов
     */
    _setupTableEvents() {
        // Селекторы реагентов в таблице
        document.querySelectorAll('.reagent-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const row = e.target.closest('tr');
                const expNum = parseInt(row.dataset.experiment);
                const bottleNum = parseInt(row.dataset.bottle);
                this.onReagentSelect(expNum, bottleNum, e.target.value);
            });
        });

        // Поля наблюдений
        document.querySelectorAll('.observation-input').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const row = e.target.closest('tr');
                const expNum = parseInt(row.dataset.experiment);
                const bottleNum = parseInt(row.dataset.bottle);
                this.onObservationInput(expNum, bottleNum, e.target.value);
            });
        });

        // Селекторы выводов
        document.querySelectorAll('.conclusion-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const bottleNum = parseInt(e.target.dataset.bottle);
                this.onConclusionSelect(bottleNum, e.target.value);
            });
        });
    }

    /**
     * Инициализация рендерера
     */
    _initRenderer() {
        if (!this.elements.canvasContainer) return;

        this.renderer = new LabRenderer(this.elements.canvasContainer);
        this.renderer.render();
        
        // Инициализация эффектов
        const effectsCanvas = document.getElementById('canvas-effects');
        if (effectsCanvas) {
            this.effects = new ReactionEffects(effectsCanvas);
        }
    }

    /**
     * Загрузка набора по умолчанию
     */
    _loadDefaultKit() {
        const defaultKitId = 'kit1';
        this.state.currentKitId = defaultKitId;
        this.loadKit(defaultKitId);
    }

    /**
     * Обработчик смены набора
     */
    onKitChange(e) {
        const kitId = e.target.value;
        this.state.currentKitId = kitId;
        this.loadKit(kitId);
    }

    /**
     * Загрузка набора реактивов
     */
    loadKit(kitId) {
        const kit = REAGENT_KITS[kitId];
        if (!kit) {
            console.error(`Набор ${kitId} не найден`);
            return;
        }

        this.state.currentKit = kit;
        this.engine.setKit(kit);
        
        console.log(`📦 Загружен набор: ${kit.name}`);
        console.log(`   Неизвестные вещества: ${kit.unknowns.join(', ')}`);

        this._renderReagents(kit);
        this._renderUnknownBottles(kit);
        this._updateConclusionOptions(kit);
        this._resetResults();
        this.resetExperiment();
    }

    /**
     * Отрисовка доступных реагентов
     */
    _renderReagents(kit) {
        const shelf = this.elements.reagentsShelf;
        if (!shelf) return;

        shelf.innerHTML = '';

        // Отображаем реагенты из набора
        kit.reagents.forEach(reagentId => {
            const substance = SUBSTANCES[reagentId];
            if (!substance) return;

            const bottle = document.createElement('div');
            bottle.className = 'reagent-bottle';
            bottle.draggable = true;
            bottle.dataset.reagent = reagentId;

            bottle.innerHTML = `
                <div class="bottle-icon">
                    <div class="bottle-liquid ${this._getColorClass(substance.color)}"></div>
                </div>
                <div class="bottle-info">
                    <span class="bottle-formula">${substance.formula}</span>
                    <span class="bottle-name">${substance.name}</span>
                </div>
            `;

            bottle.addEventListener('dragstart', this.onReagentDragStart);
            shelf.appendChild(bottle);
        });
    }

    /**
     * Получить CSS класс для цвета
     */
    _getColorClass(color) {
        const colorMap = {
            'colorless': 'colorless',
            'blue': 'blue',
            'blue-green': 'blue-green',
            'yellow-brown': 'yellow-brown',
            'pale-green': 'pale-green',
            'black': 'black',
            'white': 'white',
            'green': 'pale-green'
        };
        return colorMap[color] || 'colorless';
    }

    /**
     * Отрисовка неизвестных веществ
     */
    _renderUnknownBottles(kit) {
        // Обновляем отображение - но не показываем что внутри!
        if (this.elements.bottle1) {
            this.elements.bottle1.querySelector('.bottle-content').style.background = 
                'rgba(200, 220, 255, 0.5)';
        }
        if (this.elements.bottle2) {
            this.elements.bottle2.querySelector('.bottle-content').style.background = 
                'rgba(200, 220, 255, 0.5)';
        }
    }

    /**
     * Обновить варианты для выводов
     */
    _updateConclusionOptions(kit) {
        const selects = document.querySelectorAll('.conclusion-select');
        
        selects.forEach(select => {
            // Сохраняем первый option
            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = '';
            select.appendChild(firstOption);

            // Добавляем все вещества из набора как варианты
            const allSubstances = [...kit.reagents, ...kit.unknowns];
            const uniqueSubstances = [...new Set(allSubstances)];

            uniqueSubstances.forEach(substanceId => {
                const substance = SUBSTANCES[substanceId];
                if (substance) {
                    const option = document.createElement('option');
                    option.value = substanceId;
                    option.textContent = `${substance.formula} — ${substance.name}`;
                    select.appendChild(option);
                }
            });
        });
    }

    /**
     * Сброс результатов
     */
    _resetResults() {
        this.state.experimentResults = {
            bottle1: { exp1: null, exp2: null, conclusion: null },
            bottle2: { exp1: null, exp2: null, conclusion: null }
        };
        this.state.experiments = [];
        this.state.isVerified = false;
        this.state.score = 0;

        // Очистка полей
        document.querySelectorAll('.observation-input').forEach(input => {
            input.value = '';
            input.classList.remove('correct', 'incorrect');
        });
        document.querySelectorAll('.reagent-select, .conclusion-select').forEach(select => {
            select.selectedIndex = 0;
        });
        document.querySelectorAll('.equation-input').forEach(input => {
            input.value = '';
        });

        // Скрываем результаты
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.style.display = 'none';
        }
    }

    /**
     * Drag start для реагента
     */
    onReagentDragStart(e) {
        const reagentId = e.currentTarget.dataset.reagent;
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: 'reagent',
            id: reagentId
        }));
        e.currentTarget.classList.add('selected');
    }

    /**
     * Обработка drop на пробирку
     */
    onDropToTube(tubeElement, data, tubeIndex) {
        console.log('Drop на пробирку:', tubeIndex, data);

        // Определяем номер эксперимента и флакона
        const expNumber = Math.floor(tubeIndex / 2) + 1;
        const bottleNumber = (tubeIndex % 2) + 1;

        if (data.type === 'reagent') {
            this._performExperiment(expNumber, bottleNumber, data.id, tubeElement);
        } else if (data.type === 'indicator') {
            this._addIndicator(expNumber, bottleNumber, data.id, tubeElement);
        } else if (data.type === 'unknown') {
            // Добавляем неизвестное вещество в пробирку
            this._addUnknownToTube(data.bottleNumber, tubeElement, tubeIndex);
        }
    }

    /**
     * Выполнение эксперимента
     */
    _performExperiment(expNumber, bottleNumber, reagentId, tubeElement) {
        // Проверяем, что неизвестное вещество уже в пробирке
        const tubeId = `tube${(expNumber - 1) * 2 + bottleNumber}`;
        const tube = this.engine.getTestTube(tubeId);
        
        if (!tube || tube.contents.length === 0) {
            // Сначала добавляем неизвестное вещество
            const unknownId = bottleNumber === 1 ? 
                this.state.currentKit.unknowns[0] : 
                this.state.currentKit.unknowns[1];
            
            tube?.addSubstance(unknownId, 20);
        }

        // Выполняем эксперимент
        const result = this.engine.performExperiment(expNumber, bottleNumber, reagentId);
        
        console.log('Результат эксперимента:', result);

        // Обновляем визуализацию пробирки
        this._updateTubeVisual(tubeElement, result.tubeState);

        // Запускаем эффекты
        if (result.experiment.result.reactions) {
            for (const reaction of result.experiment.result.reactions) {
                this._playReactionEffects(tubeElement, reaction);
            }
        }

        // Обновляем таблицу
        this._updateResultsTable(expNumber, bottleNumber, reagentId, result.experiment.observation);
    }

    /**
     * Добавление индикатора
     */
    _addIndicator(expNumber, bottleNumber, indicatorId, tubeElement) {
        const tubeId = `tube${(expNumber - 1) * 2 + bottleNumber}`;
        const tube = this.engine.getTestTube(tubeId);
        
        if (!tube) return;

        const result = tube.addIndicator(indicatorId);
        
        // Обновляем визуализацию
        this._updateTubeVisual(tubeElement, tube.getState());
    }

    /**
     * Добавление неизвестного вещества в пробирку
     */
    _addUnknownToTube(bottleNumber, tubeElement, tubeIndex) {
        const unknownId = this.state.currentKit.unknowns[bottleNumber - 1];
        const tubeId = `tube${tubeIndex + 1}`;
        
        let tube = this.engine.getTestTube(tubeId);
        if (!tube) {
            tube = this.engine.createTestTube(tubeId);
        }

        tube.clear();
        tube.addSubstance(unknownId, 20);

        // Обновляем визуализацию
        this._updateTubeVisual(tubeElement, tube.getState());
    }

    /**
     * Обновление визуализации пробирки
     */
    _updateTubeVisual(tubeElement, state) {
        const liquidEl = tubeElement.querySelector('.tube-liquid');
        const precipitateEl = tubeElement.querySelector('.tube-precipitate');

        if (liquidEl) {
            liquidEl.style.height = `${state.liquidLevel}%`;
            liquidEl.style.backgroundColor = state.liquidColor;
        }

        if (precipitateEl && state.precipitateLevel > 0) {
            precipitateEl.style.height = `${state.precipitateLevel}%`;
            precipitateEl.style.backgroundColor = state.precipitateColor;
        }

        // Эффект пузырьков
        if (state.isGasReleasing) {
            tubeElement.classList.add('bubbling');
            setTimeout(() => tubeElement.classList.remove('bubbling'), 3000);
        }
    }

    /**
     * Воспроизведение эффектов реакции
     */
    _playReactionEffects(tubeElement, reaction) {
        const rect = tubeElement.getBoundingClientRect();
        const containerRect = this.elements.canvasContainer.getBoundingClientRect();
        
        const x = rect.left - containerRect.left + rect.width / 2;
        const y = rect.top - containerRect.top + rect.height / 2;

        for (const effect of reaction.effects) {
            switch (effect.type) {
                case 'gas':
                    this.effects?.startBubbles(x, y, 3000);
                    break;
                case 'precipitate':
                    this.effects?.startPrecipitate(x, y, effect.color, 2000);
                    break;
            }
        }
    }

    /**
     * Обновление таблицы результатов
     */
    _updateResultsTable(expNumber, bottleNumber, reagentId, observation) {
        // Находим соответствующую строку
        const row = document.querySelector(`tr[data-experiment="${expNumber}"][data-bottle="${bottleNumber}"]`);
        if (!row) return;

        // Устанавливаем реагент
        const reagentSelect = row.querySelector('.reagent-select');
        if (reagentSelect) {
            reagentSelect.value = reagentId;
        }

        // Устанавливаем наблюдение
        const observationInput = row.querySelector('.observation-input');
        if (observationInput && !observationInput.value) {
            // Предлагаем автозаполнение только если поле пустое
            observationInput.placeholder = observation;
        }
    }

    /**
     * Обработка выбора реагента в таблице
     */
    onReagentSelect(expNumber, bottleNumber, reagentId) {
        if (!reagentId) return;
        
        // Находим соответствующую пробирку
        const tubeIndex = (expNumber - 1) * 2 + (bottleNumber - 1);
        const tubeElement = this.elements.tubes[tubeIndex];
        
        if (tubeElement) {
            this._performExperiment(expNumber, bottleNumber, reagentId, tubeElement);
        }
    }

    /**
     * Обработка ввода наблюдения
     */
    onObservationInput(expNumber, bottleNumber, value) {
        const key = bottleNumber === 1 ? 'bottle1' : 'bottle2';
        const expKey = expNumber === 1 || expNumber === 3 ? 'exp1' : 'exp2';
        
        if (!this.state.experimentResults[key]) {
            this.state.experimentResults[key] = {};
        }
        this.state.experimentResults[key][expKey] = value;
    }

    /**
     * Обработка выбора вывода
     */
    onConclusionSelect(bottleNumber, substanceId) {
        const key = bottleNumber === 1 ? 'bottle1' : 'bottle2';
        this.state.experimentResults[key].conclusion = substanceId;
    }

    /**
     * Обработка ввода уравнения
     */
    onEquationInput(e) {
        // Сохраняем уравнение
        const blockId = e.target.closest('.equation-block')?.dataset?.experiment;
        const type = e.target.dataset.type;
        
        if (blockId && type) {
            // Можно добавить валидацию уравнений
        }
    }

    /**
     * Клик по пробирке
     */
    onTubeClick(e, tube) {
        // Снимаем выделение со всех
        this.elements.tubes.forEach(t => t.classList.remove('active'));
        // Выделяем текущую
        tube.classList.add('active');
        this.state.selectedTube = tube;
    }

    /**
     * Проверка результатов
     */
    verifyResults() {
        const results = {
            observations: [],
            identifications: [],
            totalScore: 0
        };

        // Проверка идентификации веществ
        for (let bottle = 1; bottle <= 2; bottle++) {
            const key = bottle === 1 ? 'bottle1' : 'bottle2';
            const guessedId = this.state.experimentResults[key]?.conclusion;
            const check = this.engine.checkIdentification(bottle, guessedId);
            results.identifications.push(check);
            
            // Выделяем правильные/неправильные ответы
            const conclusionSelect = document.querySelector(`.conclusion-select[data-bottle="${bottle}"]`);
            if (conclusionSelect) {
                conclusionSelect.classList.add(check.correct ? 'correct' : 'incorrect');
            }

            if (check.correct) {
                results.totalScore += 2; // 2 балла за правильную идентификацию
            }
        }

        // Проверка наблюдений (упрощённо)
        document.querySelectorAll('.observation-input').forEach(input => {
            if (input.value.length > 20) {
                input.classList.add('correct');
                results.totalScore += 0.25;
            }
        });

        // Ограничиваем максимум 5 баллами
        results.totalScore = Math.min(5, Math.round(results.totalScore));
        this.state.score = results.totalScore;
        this.state.isVerified = true;

        // Показываем результаты
        this._showResults(results);
    }

    /**
     * Отображение результатов
     */
    _showResults(results) {
        // Показываем панель с баллами
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.style.display = 'block';
            
            const scoreValue = this.elements.scoreDisplay.querySelector('.score-value');
            if (scoreValue) {
                scoreValue.textContent = results.totalScore;
            }

            // Заполняем breakdown
            const breakdown = this.elements.scoreDisplay.querySelector('.score-breakdown');
            if (breakdown) {
                breakdown.innerHTML = `
                    <div class="score-item ${results.identifications[0]?.correct ? 'correct' : 'incorrect'}">
                        <span>Идентификация вещества №1</span>
                        <span>${results.identifications[0]?.correct ? '✓' : '✗'}</span>
                    </div>
                    <div class="score-item ${results.identifications[1]?.correct ? 'correct' : 'incorrect'}">
                        <span>Идентификация вещества №2</span>
                        <span>${results.identifications[1]?.correct ? '✓' : '✗'}</span>
                    </div>
                    <div class="score-item">
                        <span>Описание наблюдений</span>
                        <span>+${Math.min(1, results.observations.length * 0.25).toFixed(1)}</span>
                    </div>
                `;
            }
        }

        // Показываем модальное окно с результатом
        this._showResultModal(results);
    }

    /**
     * Показать модальное окно результата
     */
    _showResultModal(results) {
        if (!this.elements.resultModal) return;

        const modal = this.elements.resultModal;
        const icon = modal.querySelector('.modal-icon');
        const title = modal.querySelector('h2');
        const score = modal.querySelector('.score');
        
        if (results.totalScore >= 4) {
            icon.textContent = '🎉';
            title.textContent = 'Отлично!';
        } else if (results.totalScore >= 2) {
            icon.textContent = '👍';
            title.textContent = 'Хорошо!';
        } else {
            icon.textContent = '📚';
            title.textContent = 'Нужно повторить';
        }

        if (score) {
            score.textContent = `${results.totalScore} / 5`;
        }

        modal.style.display = 'flex';
    }

    /**
     * Сброс эксперимента
     */
    resetExperiment() {
        this.engine.reset();
        
        // Очистка пробирок
        this.elements.tubes?.forEach(tube => {
            const liquid = tube.querySelector('.tube-liquid');
            const precipitate = tube.querySelector('.tube-precipitate');
            
            if (liquid) {
                liquid.style.height = '0';
                liquid.style.backgroundColor = 'rgba(200, 220, 255, 0.6)';
            }
            if (precipitate) {
                precipitate.style.height = '0';
            }
            
            tube.classList.remove('active', 'bubbling');
        });

        this._resetResults();
        
        console.log('🔄 Эксперимент сброшен');
    }

    /**
     * Показать подсказку
     */
    showHint() {
        // Определяем текущий эксперимент и даём подсказку
        const activeExperiment = this.engine.experiments[this.engine.experiments.length - 1];
        
        if (activeExperiment) {
            const hint = this.engine.getHint(activeExperiment.number);
            if (hint) {
                alert(`💡 Подсказка:\n${hint.hint}\n\nОжидаемое наблюдение: ${hint.observation}`);
            }
        } else {
            alert('💡 Начните с добавления вещества из флакона №1 или №2 в пробирку, затем добавьте реагент.');
        }
    }

    /**
     * Переключение справочника
     */
    toggleReference() {
        this.elements.referencePanel?.classList.toggle('open');
    }
}

// Создание и инициализация приложения
const lab = new ChemistryLab();

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => lab.init());
} else {
    lab.init();
}

// Экспорт для доступа из консоли
window.chemistryLab = lab;

export default ChemistryLab;
