// Конфигурация оборудования Labosfera
const LabosfераEquipment = {
    // Цифровые датчики
    sensors: {
        temperature: {
            name: 'Датчик температуры Labosfera',
            model: 'LS-T100',
            range: [-40, 180],
            unit: '°C',
            accuracy: 0.1,
            color: '#FF5722',
            icon: '🌡️'
        },
        current: {
            name: 'Датчик тока Labosfera',
            model: 'LS-I3',
            range: [-3, 3],
            unit: 'A',
            accuracy: 0.01,
            color: '#2196F3',
            icon: '⚡'
        },
        voltage: {
            name: 'Датчик напряжения Labosfera',
            model: 'LS-V15',
            range: [-15, 15],
            unit: 'V',
            accuracy: 0.01,
            color: '#4CAF50',
            icon: '🔌'
        },
        force: {
            name: 'Датчик силы Labosfera',
            model: 'LS-F50',
            range: [-50, 50],
            unit: 'Н',
            accuracy: 0.1,
            color: '#9C27B0',
            icon: '💪'
        },
        pressure: {
            name: 'Датчик давления Labosfera',
            model: 'LS-P200',
            range: [10, 200],
            unit: 'кПа',
            accuracy: 0.5,
            color: '#FF9800',
            icon: '💨'
        },
        distance: {
            name: 'Датчик расстояния Labosfera',
            model: 'LS-D600',
            range: [0.15, 6],
            unit: 'м',
            accuracy: 0.01,
            color: '#00BCD4',
            icon: '📏'
        },
        light: {
            name: 'Датчик освещенности Labosfera',
            model: 'LS-L180',
            range: [0, 180000],
            unit: 'лк',
            accuracy: 10,
            color: '#FFEB3B',
            icon: '💡'
        }
    },

    // Традиционное оборудование
    traditional: {
        dynamometer: {
            name: 'Динамометр Labosfera',
            model: 'LS-DYN5',
            maxForce: 5,
            divisions: 0.1,
            color: '#607D8B'
        },
        ammeter: {
            name: 'Амперметр лабораторный',
            model: 'LS-A-LAB',
            range: [0, 2],
            color: '#2196F3'
        },
        voltmeter: {
            name: 'Вольтметр лабораторный',
            model: 'LS-V-LAB',
            range: [0, 6],
            color: '#4CAF50'
        },
        calorimeter: {
            name: 'Калориметр Labosfera',
            model: 'LS-CAL-200',
            capacity: 200,
            color: '#9E9E9E'
        },
        scale: {
            name: 'Весы электронные Labosfera',
            model: 'LS-SCALE-200',
            maxWeight: 200,
            accuracy: 0.1,
            color: '#757575'
        }
    },

    // Цветовая схема бренда
    brand: {
        primary: '#0066CC',    // Синий Labosfera
        secondary: '#00A86B',  // Зеленый Labosfera
        accent: '#FF6B35',     // Оранжевый акцент
        background: '#F5F7FA',
        text: '#2C3E50'
    },

    // Библиотека экспериментов по спецификации ФИПИ
    experiments: {
        mechanics: [
            {
                id: 'density',
                title: 'Измерение плотности вещества',
                equipment: ['scale', 'cylinder', 'specimens'],
                description: 'Определение плотности твердого тела',
                duration: 30
            },
            {
                id: 'friction',
                title: 'Измерение силы трения',
                equipment: ['dynamometer', 'block', 'weights'],
                description: 'Исследование силы трения скольжения',
                duration: 25
            },
            {
                id: 'spring',
                title: 'Исследование упругих свойств пружины',
                equipment: ['stand', 'spring', 'weights', 'ruler'],
                description: 'Проверка закона Гука',
                duration: 25
            },
            {
                id: 'lever',
                title: 'Изучение равновесия рычага',
                equipment: ['lever', 'weights', 'dynamometer'],
                description: 'Проверка условия равновесия рычага',
                duration: 30
            }
        ],
        thermal: [
            {
                id: 'mixing',
                title: 'Сравнение количества теплоты при смешивании',
                equipment: ['calorimeter', 'thermometer', 'cylinder', 'scale'],
                description: 'Измерение количества теплоты',
                duration: 30
            },
            {
                id: 'specific_heat',
                title: 'Определение удельной теплоемкости',
                equipment: ['calorimeter', 'thermometer', 'heater', 'scale'],
                description: 'Расчет удельной теплоемкости вещества',
                duration: 35
            }
        ],
        electricity: [
            {
                id: 'current_measurement',
                title: 'Сборка цепи и измерение силы тока',
                equipment: ['power_source', 'ammeter', 'resistor', 'switch', 'wires'],
                description: 'Измерение силы тока в цепи',
                duration: 25
            },
            {
                id: 'ohm_law',
                title: 'Исследование зависимости I от U',
                equipment: ['power_source', 'ammeter', 'voltmeter', 'resistor', 'rheostat'],
                description: 'Проверка закона Ома',
                duration: 30
            },
            {
                id: 'resistance',
                title: 'Определение электрического сопротивления',
                equipment: ['ammeter', 'voltmeter', 'resistor', 'power_source'],
                description: 'Косвенное измерение сопротивления',
                duration: 25
            },
            {
                id: 'series_circuit',
                title: 'Последовательное соединение проводников',
                equipment: ['power_source', 'ammeter', 'voltmeter', 'resistors'],
                description: 'Проверка правил для последовательного соединения',
                duration: 30
            },
            {
                id: 'parallel_circuit',
                title: 'Параллельное соединение проводников',
                equipment: ['power_source', 'ammeter', 'voltmeter', 'resistors'],
                description: 'Проверка правил для параллельного соединения',
                duration: 30
            },
            {
                id: 'power',
                title: 'Определение работы и мощности тока',
                equipment: ['power_source', 'ammeter', 'voltmeter', 'bulb'],
                description: 'Расчет мощности электрического тока',
                duration: 25
            }
        ],
        optics: [
            {
                id: 'refraction',
                title: 'Исследование преломления света',
                equipment: ['glass_plate', 'protractor', 'pins', 'paper'],
                description: 'Определение показателя преломления',
                duration: 30
            },
            {
                id: 'focal_length',
                title: 'Определение фокусного расстояния линзы',
                equipment: ['lens', 'screen', 'light_source', 'ruler'],
                description: 'Измерение фокусного расстояния собирающей линзы',
                duration: 25
            },
            {
                id: 'lens_image',
                title: 'Получение изображения с помощью линзы',
                equipment: ['lens', 'screen', 'light_source', 'ruler'],
                description: 'Построение изображения в собирающей линзе',
                duration: 30
            }
        ]
    }
};

// Утилиты для работы с оборудованием
const LabUtils = {
    // Получить информацию о датчике
    getSensorInfo(sensorType) {
        return LabosfераEquipment.sensors[sensorType] || null;
    },

    // Проверка значения в допустимом диапазоне
    validateReading(sensorType, value) {
        const sensor = this.getSensorInfo(sensorType);
        if (!sensor) return false;
        return value >= sensor.range[0] && value <= sensor.range[1];
    },

    // Добавление погрешности к измерению (реалистичность)
    addAccuracy(value, sensorType) {
        const sensor = this.getSensorInfo(sensorType);
        if (!sensor) return value;
        
        const error = (Math.random() - 0.5) * sensor.accuracy;
        return parseFloat((value + error).toFixed(2));
    },

    // Форматирование значения с единицами измерения
    formatValue(value, sensorType) {
        const sensor = this.getSensorInfo(sensorType);
        if (!sensor) return value;
        
        return `${value.toFixed(2)} ${sensor.unit}`;
    },

    // Получить список экспериментов по категории
    getExperimentsByCategory(category) {
        return LabosfераEquipment.experiments[category] || [];
    },

    // Получить полный список оборудования для эксперимента
    getEquipmentForExperiment(experimentId) {
        for (const category in LabosfераEquipment.experiments) {
            const exp = LabosfераEquipment.experiments[category].find(e => e.id === experimentId);
            if (exp) return exp.equipment;
        }
        return [];
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LabosfераEquipment, LabUtils };
}
