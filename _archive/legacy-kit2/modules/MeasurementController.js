/**
 * MeasurementController - Управление измерениями для лабораторной работы
 * 
 * @module MeasurementController
 * @description Модуль записи измерений, расчёта жёсткости пружины,
 * отображения таблицы результатов и обновления UI.
 * Реализует методику определения жёсткости по ФИПИ ОГЭ 2025.
 * 
 * @example
 * const controller = new MeasurementController(experiment);
 * const result = controller.recordDirect(state, physics, getTotalMass);
 * if (result.success) {
 *     controller.renderTable(state.measurements);
 * }
 */

/**
 * @typedef {Object} Measurement
 * @property {number} id - Уникальный ID (timestamp)
 * @property {number} number - Номер измерения (1-based)
 * @property {number} weightCount - Количество грузов
 * @property {number} mass - Масса в граммах
 * @property {number} force - Сила в Н
 * @property {number} elongationCm - Удлинение в см
 * @property {number} elongationM - Удлинение в м
 * @property {number} stiffness - Жёсткость в Н/м
 * @property {number|null} dynamometerReading - Показание динамометра
 * @property {number|null} dynamometerDiff - Разница с динамометром
 */

/**
 * @typedef {Object} RecordResult
 * @property {boolean} success - Успешно ли записано
 * @property {string} [message] - Сообщение об ошибке
 * @property {Measurement} [measurement] - Записанное измерение
 */

/**
 * @typedef {Object} StiffnessResult
 * @property {number} average - Среднее значение k (Н/м)
 * @property {number} regression - k по МНК (Н/м)
 * @property {number} r2 - Коэффициент детерминации R²
 */

export class MeasurementController {
    /**
     * Создаёт контроллер измерений
     * @param {Object} experiment - Ссылка на главный эксперимент
     */
    constructor(experiment) {
        /** @type {Object} Ссылка на эксперимент */
        this.experiment = experiment;
        
        /** 
         * Сохранённые значения для отображения
         * @type {{force: number|null, elongationCm: number|null}}
         */
        this.lastDisplayed = {
            force: null,
            elongationCm: null
        };
        
        /** @type {number|null} Записанное значение силы */
        this.recordedForce = null;
        
        /** @type {number|null} Записанное значение удлинения */
        this.recordedElongation = null;
    }

    /**
     * Прямая запись измерения с текущими значениями
     * @param {Object} state - Текущее состояние эксперимента
     * @param {Object} physics - Физические параметры (gravity, pixelsPerCm)
     * @param {Function} getTotalMass - Функция получения суммарной массы
     * @returns {RecordResult} Результат записи
     */
    recordDirect(state, physics, getTotalMass) {
        if (state.attachedWeights.length === 0) {
            return { success: false, message: 'Сначала подвесьте груз на пружину!' };
        }

        const weightCount = state.attachedWeights.length;
        const totalMass = getTotalMass();
        
        // Автоматический расчёт силы F = mg
        let force = (totalMass / 1000) * physics.gravity;
        if (this.lastDisplayed.force !== null) {
            force = this.lastDisplayed.force;
        }
        
        // Удлинение
        let elongationCm = state.springElongation / physics.pixelsPerCm;
        if (this.lastDisplayed.elongationCm !== null) {
            elongationCm = this.lastDisplayed.elongationCm;
        }

        if (!elongationCm || elongationCm <= 0) {
            return { success: false, message: 'Ошибка: пружина не растянута!' };
        }

        // Проверка дубликатов
        const isDuplicate = state.measurements.some(m => m.weightCount === weightCount);
        if (isDuplicate) {
            return { success: false, message: `Измерение для ${weightCount} груза(ов) уже записано!` };
        }

        // ЗАПИСЬ ИЗМЕРЕНИЯ
        const measurement = {
            id: Date.now(),
            number: state.measurements.length + 1,
            weightCount: weightCount,
            mass: totalMass,
            force: force,
            elongationCm: elongationCm,
            elongationM: elongationCm / 100,
            stiffness: force / (elongationCm / 100),
            dynamometerReading: state.lastDynamometerReading,
            dynamometerDiff: state.lastDynamometerReading ? 
                Math.abs(state.lastDynamometerReading - force) : null
        };

        state.measurements.push(measurement);
        
        console.log('[RECORD] Измерение записано:', measurement);

        return { success: true, measurement };
    }

    /**
     * Записать значение силы F
     */
    recordForce() {
        const manualInput = document.getElementById('manual-force-input');
        const currentForceEl = document.getElementById('current-force');
        
        let forceValue = null;

        if (manualInput && manualInput.value.trim() !== '') {
            const inputValue = manualInput.value.trim().replace(',', '.');
            forceValue = parseFloat(inputValue);
            if (!Number.isFinite(forceValue) || forceValue <= 0) {
                return { success: false, message: 'Введите корректное положительное значение силы!' };
            }
        } else if (currentForceEl && currentForceEl.textContent !== '—') {
            forceValue = parseFloat(currentForceEl.textContent);
        }

        if (!forceValue || !Number.isFinite(forceValue)) {
            return { success: false, message: 'Нет значения силы для записи!' };
        }

        this.recordedForce = forceValue;

        // Отображаем записанное значение
        const recordedDisplay = document.getElementById('recorded-force-display');
        const recordedValue = document.getElementById('recorded-force-value');
        if (recordedDisplay && recordedValue) {
            recordedDisplay.style.display = 'flex';
            recordedValue.textContent = forceValue.toFixed(2);
        }

        if (manualInput) manualInput.value = '';

        return { success: true, value: forceValue };
    }

    /**
     * Записать значение удлинения Δl
     */
    recordElongation() {
        const manualInput = document.getElementById('manual-elongation-input');
        const currentEl = document.getElementById('current-elongation');
        
        let elongationValue = null;

        if (manualInput && manualInput.value.trim() !== '') {
            const inputValue = manualInput.value.trim().replace(',', '.');
            elongationValue = parseFloat(inputValue);
            if (!Number.isFinite(elongationValue) || elongationValue <= 0) {
                return { success: false, message: 'Введите корректное положительное значение удлинения!' };
            }
        } else if (currentEl && currentEl.textContent !== '—') {
            elongationValue = parseFloat(currentEl.textContent);
        }

        if (!elongationValue || !Number.isFinite(elongationValue)) {
            return { success: false, message: 'Нет значения удлинения для записи!' };
        }

        this.recordedElongation = elongationValue;

        const recordedDisplay = document.getElementById('recorded-elongation-display');
        const recordedValue = document.getElementById('recorded-elongation-value');
        if (recordedDisplay && recordedValue) {
            recordedDisplay.style.display = 'flex';
            recordedValue.textContent = elongationValue.toFixed(3);
        }

        if (manualInput) manualInput.value = '';

        return { success: true, value: elongationValue };
    }

    /**
     * Рассчитать жёсткость из записанных значений
     */
    calculateFromRecorded() {
        if (!this.recordedForce || !this.recordedElongation) {
            return { success: false, message: 'Запишите оба значения (F и Δl) перед расчётом!' };
        }

        const stiffness = this.recordedForce / this.recordedElongation;

        return { 
            success: true, 
            stiffness,
            force: this.recordedForce,
            elongation: this.recordedElongation
        };
    }

    /**
     * Рассчитать жёсткость пружины (линейная регрессия)
     */
    calculateStiffness(measurements, physicsEngine) {
        const count = measurements.length;
        if (count === 0) return null;

        // Для одного измерения - прямое отношение
        if (count === 1) {
            const m = measurements[0];
            const elongationM = m.elongationM || (m.elongationCm / 100);
            if (elongationM <= 0) return null;

            const k = m.force / elongationM;
            return {
                k,
                r2: null,
                points: count,
                equation: `F = ${k.toFixed(1)} × Δl`,
                quality: 'Предварительно'
            };
        }

        // Линейная регрессия для 2+ точек
        const points = measurements.map(m => ({
            x: m.elongationM || (m.elongationCm / 100),
            y: m.force
        }));

        const regression = physicsEngine.linearRegression(points);
        const springConstant = regression.slope;
        const r2 = regression.r2;

        return {
            k: springConstant,
            r2,
            points: count,
            equation: `F = ${springConstant.toFixed(1)} × Δl`,
            quality: r2 >= 0.98 ? 'Превосходно' : r2 >= 0.95 ? 'Отлично' : r2 >= 0.90 ? 'Хорошо' : 'Требует уточнения'
        };
    }

    /**
     * Обновить отображение текущих измерений
     */
    updateDisplay(mass, force, elongationCm, physicsEngine) {
        const currentForceEl = document.getElementById('current-force');
        const currentElongationEl = document.getElementById('current-elongation');

        let displayForce = force;
        let displayElongationCm = elongationCm;

        if (physicsEngine?.addNoise) {
            if (Number.isFinite(force)) {
                displayForce = physicsEngine.addNoise(force, 0.5);
            }
            if (Number.isFinite(elongationCm)) {
                displayElongationCm = physicsEngine.addNoise(elongationCm, 0.5);
            }
        }

        this.lastDisplayed = {
            force: displayForce,
            elongationCm: displayElongationCm
        };

        if (currentForceEl) {
            currentForceEl.textContent = Number.isFinite(displayForce) ? displayForce.toFixed(2) : '—';
        }

        if (currentElongationEl) {
            const elongationM = Number.isFinite(displayElongationCm) ? displayElongationCm / 100 : NaN;
            currentElongationEl.textContent = Number.isFinite(elongationM) ? elongationM.toFixed(3) : '—';
        }
    }

    /**
     * Сбросить отображение
     */
    resetDisplay() {
        this.updateDisplay(NaN, NaN, NaN, null);
    }

    /**
     * Сбросить окно измерений
     */
    resetWindow() {
        this.recordedForce = null;
        this.recordedElongation = null;

        const inputs = ['manual-force-input', 'manual-elongation-input'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const currentEls = ['current-force', 'current-elongation'];
        currentEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
        });

        const displays = ['recorded-force-display', 'recorded-elongation-display', 'calculation-result'];
        displays.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    /**
     * Отрисовка таблицы измерений
     */
    renderTable(measurements) {
        const tbody = document.getElementById('measurements-tbody');
        if (!tbody) return;

        const tableCount = document.getElementById('table-count');
        if (tableCount) {
            const count = measurements.length;
            const word = count === 1 ? 'измерение' : (count >= 2 && count <= 4) ? 'измерения' : 'измерений';
            tableCount.textContent = `${count} ${word}`;
        }

        if (measurements.length === 0) {
            tbody.innerHTML = `<tr class="empty-state"><td colspan="6">Пока нет измерений</td></tr>`;
            return;
        }

        tbody.innerHTML = measurements.map((m, index) => {
            const dynamometerHint = m.dynamometerReading ? 
                ` title="Проверка динамометром: ${m.dynamometerReading.toFixed(2)} Н"` : '';
            
            return `
                <tr data-measurement-id="${m.id}" class="just-added">
                    <td>${index + 1}</td>
                    <td>${m.mass}</td>
                    <td${dynamometerHint}>${m.force.toFixed(2)}${m.dynamometerReading ? ' ✓' : ''}</td>
                    <td>${m.elongationCm.toFixed(2)}</td>
                    <td><strong>${m.stiffness.toFixed(1)}</strong></td>
                    <td>
                        <button class="btn-delete" onclick="experiment.deleteMeasurement(${m.id})">✕</button>
                    </td>
                </tr>
            `;
        }).join('');

        setTimeout(() => {
            tbody.querySelectorAll('.just-added').forEach(row => row.classList.remove('just-added'));
        }, 2000);
    }

    /**
     * Удалить измерение
     */
    delete(id, measurements) {
        const index = measurements.findIndex(m => m.id === id);
        if (index !== -1) {
            measurements.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Обновить состояние кнопки записи силы
     */
    updateRecordForceButton() {
        const btn = document.getElementById('btn-record-force');
        const manualInput = document.getElementById('manual-force-input');
        const currentEl = document.getElementById('current-force');

        if (!btn) return;

        const hasManual = manualInput && manualInput.value.trim() !== '';
        const hasCurrent = currentEl && currentEl.textContent !== '—';

        btn.disabled = !hasManual && !hasCurrent;
    }

    /**
     * Обновить состояние кнопки записи удлинения
     */
    updateRecordElongationButton() {
        const btn = document.getElementById('btn-record-elongation');
        const manualInput = document.getElementById('manual-elongation-input');
        const currentEl = document.getElementById('current-elongation');

        if (!btn) return;

        const hasManual = manualInput && manualInput.value.trim() !== '';
        const hasCurrent = currentEl && currentEl.textContent !== '—';

        btn.disabled = !hasManual && !hasCurrent;
    }

    /**
     * Обновить состояние кнопки расчёта жёсткости
     */
    updateCalculateButton() {
        const btn = document.getElementById('btn-calculate-stiffness');
        if (!btn) return;

        btn.disabled = !this.recordedForce || !this.recordedElongation;
    }

    /**
     * Показать результат расчёта
     */
    showResult(stiffness, force, elongation) {
        const resultContainer = document.getElementById('calculation-result');
        const resultText = document.getElementById('result-calculation-text');
        const resultValue = document.getElementById('result-stiffness-value');

        if (resultContainer && resultText && resultValue) {
            resultContainer.style.display = 'block';
            resultText.textContent = `k = ${force.toFixed(2)} / ${elongation.toFixed(3)} = ${stiffness.toFixed(1)} Н/м`;
            resultValue.textContent = stiffness.toFixed(1);
        }

        // Разблокируем кнопку завершения
        const completeBtn = document.getElementById('btn-complete');
        if (completeBtn) {
            completeBtn.disabled = false;
        }
    }
}
