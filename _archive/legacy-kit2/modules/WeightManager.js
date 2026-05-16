/**
 * WeightManager - Управление грузами для лабораторной работы
 * 
 * @module WeightManager
 * @description Модуль управления инвентарём грузов, подвешиванием/снятием,
 * свободными грузами на canvas и состоянием каждого груза.
 * Реализует логику комплекта №2 ФИПИ ОГЭ 2025.
 * 
 * @example
 * const manager = new WeightManager(experiment);
 * manager.init(weightsConfig);
 * await manager.loadAssets();
 * const weight = manager.getById('weight-100g');
 */

/**
 * @typedef {Object} WeightDefinition
 * @property {string} id - Уникальный идентификатор груза
 * @property {string} name - Название груза для UI
 * @property {number} mass - Масса в граммах
 * @property {string} [icon] - Путь к изображению
 * @property {boolean} [hooksTop] - Есть крюк сверху
 * @property {boolean} [hooksBottom] - Есть крюк снизу
 * @property {boolean} [isCompositeRod] - Это штырь для сборного груза
 * @property {boolean} [isCompositeDisk] - Это диск сборного груза
 */

/**
 * @typedef {Object} AttachedWeight
 * @property {string} id - ID груза из inventory
 * @property {Array<{weightId: string}>} [compositeDisks] - Диски на сборном грузе
 */

/**
 * @typedef {Object} WeightState
 * @property {boolean} found - Найден ли груз
 * @property {boolean} [isDirectlyAttached] - Подвешен напрямую
 * @property {boolean} [isInChain] - В цепочке грузов
 * @property {number|null} [positionInChain] - Позиция в цепочке (1-based)
 * @property {boolean} [isLastInChain] - Последний в цепочке
 * @property {boolean} [isFree] - Свободен на canvas
 * @property {boolean} [isUsed] - Используется где-либо
 * @property {boolean} [canBeGrabbed] - Можно взять
 */

export class WeightManager {
    /**
     * Создаёт менеджер грузов
     * @param {Object} experiment - Ссылка на главный эксперимент
     */
    constructor(experiment) {
        /** @type {Object} Ссылка на эксперимент */
        this.experiment = experiment;
        
        /** @type {WeightDefinition[]} Набор грузов комплекта №2 (ФИПИ ОГЭ 2025) */
        this.inventory = [];
        
        /** @type {Object<string, HTMLImageElement>} Кэш изображений грузов */
        this.images = {};
    }

    /**
     * Инициализация менеджера с конфигурацией грузов
     * @param {WeightDefinition[]} weightsConfig - Массив определений грузов
     * @returns {void}
     */
    init(weightsConfig) {
        this.inventory = JSON.parse(JSON.stringify(weightsConfig));
    }

    /**
     * Асинхронная загрузка изображений всех грузов
     * @async
     * @returns {Promise<void>}
     * @throws {Error} При критической ошибке загрузки
     */
    async loadAssets() {
        if (!Array.isArray(this.inventory)) return;

        const tasks = this.inventory.map(async (weight) => {
            if (!weight?.icon || this.images[weight.id]) return;

            try {
                const img = await this.loadImage(weight.icon);
                this.images[weight.id] = img;
            } catch (err) {
                console.warn(`⚠️ Не удалось загрузить изображение груза ${weight.name}:`, err.message);
            }
        });

        await Promise.all(tasks);
    }

    /**
     * Загрузить одно изображение
     * @async
     * @param {string} src - Путь к изображению
     * @returns {Promise<HTMLImageElement>} Загруженный элемент изображения
     * @throws {Error} Если изображение не удалось загрузить
     */
    async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    /**
     * Получить определение груза по ID
     * @param {string} id - Уникальный идентификатор груза
     * @returns {WeightDefinition|null} Определение груза или null
     */
    getById(id) {
        if (!id || !Array.isArray(this.inventory)) return null;
        return this.inventory.find(weight => weight.id === id) || null;
    }

    /**
     * Получить кэшированное изображение груза
     * @param {string} id - ID груза
     * @returns {HTMLImageElement|null} Изображение или null
     */
    getImage(id) {
        return this.images[id] || null;
    }

    /**
     * Проверить, можно ли подвесить груз к цепочке
     * @param {WeightDefinition} weight - Груз для подвешивания
     * @param {AttachedWeight[]} attachedWeights - Текущая цепочка грузов
     * @returns {boolean} true если можно подвесить
     */
    canAttach(weight, attachedWeights) {
        if (!weight) return false;

        if (!attachedWeights?.length) {
            return !!weight.hooksTop;
        }

        const last = attachedWeights[attachedWeights.length - 1];
        const lastDef = this.getById(last.id);

        return !!(lastDef?.hooksBottom && weight.hooksTop);
    }

    /**
     * Получить полную массу груза с учетом сборных дисков
     */
    getTotalMass(weightEntry) {
        if (!weightEntry) return 0;
        
        const weightDef = this.getById(weightEntry.id);
        let mass = weightDef?.mass || 0;
        
        // Добавляем массу дисков сборного груза
        if (weightEntry.compositeDisks && Array.isArray(weightEntry.compositeDisks)) {
            weightEntry.compositeDisks.forEach(disk => {
                const diskDef = this.getById(disk.weightId);
                if (diskDef) {
                    mass += diskDef.mass;
                }
            });
        }
        
        return mass;
    }

    /**
     * Получить суммарную массу всех прикрепленных грузов
     */
    getTotalAttachedMass(attachedWeights) {
        return attachedWeights.reduce((sum, w) => {
            return sum + this.getTotalMass(w);
        }, 0);
    }

    /**
     * Определить точное состояние груза
     */
    getState(weightId, experimentState) {
        const weight = this.getById(weightId);
        if (!weight) {
            return { found: false };
        }

        const { selectedWeights, attachedWeights, usedWeightIds, freeWeights } = experimentState;

        // Проверки состояния
        const isDirectlyAttached = selectedWeights.has(weightId);
        const attachedIndex = attachedWeights.findIndex(w => w.id === weightId);
        const isInChain = attachedIndex !== -1;
        const positionInChain = isInChain ? attachedIndex + 1 : null;
        const isLastInChain = isInChain && attachedIndex === attachedWeights.length - 1;

        // Проверка: часть подвешенного наборного груза?
        let isPartOfAttachedComposite = false;
        let parentRodId = null;
        if (weight.isCompositeDisk && isInChain) {
            for (const attachedWeight of attachedWeights) {
                if (attachedWeight.compositeDisks?.some(d => d.weightId === weightId)) {
                    isPartOfAttachedComposite = true;
                    parentRodId = attachedWeight.id;
                    break;
                }
            }
        }

        // Проверка: свободен на canvas?
        const freeWeight = freeWeights?.find(fw => fw.weightId === weightId);
        const isFreeOnCanvas = !!freeWeight && !isDirectlyAttached;

        // Проверка: часть свободного наборного груза?
        let isPartOfFreeComposite = false;
        let freeRodId = null;
        if (weight.isCompositeDisk && !isFreeOnCanvas) {
            for (const fw of freeWeights || []) {
                if (fw.compositeDisks?.some(d => d.weightId === weightId)) {
                    isPartOfFreeComposite = true;
                    freeRodId = fw.weightId;
                    break;
                }
            }
        }

        // Проверка: часть стопки на canvas?
        let isPartOfFreeStack = false;
        let stackBottomWeightId = null;
        if (!isFreeOnCanvas && !isPartOfFreeComposite) {
            for (const fw of freeWeights || []) {
                if (fw.stackedWeights?.some(sw => sw.weightId === weightId)) {
                    isPartOfFreeStack = true;
                    stackBottomWeightId = fw.weightId;
                    break;
                }
            }
        }

        // Определяем финальное состояние
        let state = 'available';
        let canRemove = false;
        let removeAction = null;
        let buttonText = null;

        if (isPartOfAttachedComposite) {
            state = 'attached-composite-disk';
            canRemove = false;
        } else if (isDirectlyAttached && isLastInChain) {
            state = 'attached-last';
            canRemove = true;
            removeAction = 'detach';
            buttonText = 'Снять';
        } else if (isDirectlyAttached && !isLastInChain) {
            state = 'attached-middle';
            canRemove = false;
        } else if (isPartOfFreeComposite) {
            state = 'free-composite-disk';
            canRemove = true;
            removeAction = 'remove-disk';
            buttonText = 'Убрать диск';
        } else if (isPartOfFreeStack) {
            state = 'free-in-stack';
            canRemove = true;
            removeAction = 'remove-from-stack';
            buttonText = 'Убрать';
        } else if (isFreeOnCanvas) {
            state = 'free-on-canvas';
            canRemove = true;
            removeAction = 'remove-free';
            buttonText = 'Убрать';
        }

        return {
            found: true,
            weight,
            state,
            isDirectlyAttached,
            isInChain,
            positionInChain,
            isLastInChain,
            isFreeOnCanvas,
            freeWeight,
            isPartOfAttachedComposite,
            parentRodId,
            isPartOfFreeComposite,
            freeRodId,
            isPartOfFreeStack,
            stackBottomWeightId,
            canRemove,
            removeAction,
            buttonText
        };
    }

    /**
     * Получить текст статуса груза
     */
    getStatusText(weightState, experimentState) {
        if (!weightState.found) return 'Неизвестно';
        
        const equipmentName = experimentState.dynamometerAttached ? 'динамометре' : 'пружине';

        switch (weightState.state) {
            case 'pending':
                return 'Подвешивается…';
            case 'attached-last':
            case 'attached-middle':
                const chainInfo = weightState.positionInChain ? ` (${weightState.positionInChain}-й в цепочке)` : '';
                return `На ${equipmentName}${chainInfo}`;
            case 'attached-composite-disk':
                return `На штанге (${equipmentName})`;
            case 'free-on-canvas':
                if (weightState.freeWeight?.compositeDisks?.length > 0) {
                    const disksCount = weightState.freeWeight.compositeDisks.length;
                    const diskWord = disksCount === 1 ? 'диск' : (disksCount > 4 ? 'дисков' : 'диска');
                    return `На столе (${disksCount} ${diskWord})`;
                }
                return 'На столе';
            case 'free-composite-disk':
                return 'На штанге (стол)';
            case 'free-in-stack':
                return 'На столе (в стопке)';
            case 'available':
            default:
                return 'В комплекте';
        }
    }

    /**
     * Проверить возможность стыковки грузов
     */
    canStack(weight1, weight2) {
        const weightDef1 = this.getById(weight1.weightId);
        const weightDef2 = this.getById(weight2.weightId);
        
        if (!weightDef1 || !weightDef2) return false;
        
        const isRod1 = weightDef1.isCompositeRod;
        const isDisk2 = weightDef2.isCompositeDisk;
        const isDisk1 = weightDef1.isCompositeDisk;
        
        // Диск на штангу
        if (isRod1 && isDisk2) {
            const distanceX = Math.abs(weight1.x - weight2.x);
            const distanceY = Math.abs(weight1.y - weight2.y);
            return distanceX < 60 && distanceY < 100;
        }
        
        // Диск на диск
        if (isDisk1 && isDisk2) {
            const distanceX = Math.abs(weight1.x - weight2.x);
            const distanceY = Math.abs(weight1.y - weight2.y);
            return distanceX < 60 && distanceY < 80;
        }
        
        // Обычные грузы - по крючкам
        const img1 = this.images[weight1.weightId] || this.images[weightDef1.id];
        const targetSize1 = weightDef1.targetSize ?? 72;
        const renderScale1 = targetSize1 / (img1 ? Math.max(img1.width, img1.height) : targetSize1);
        const renderedHeight1 = img1 ? img1.height * renderScale1 : targetSize1 * 0.9;
        
        const hook1Y = weight1.y + renderedHeight1/2 + 8;
        const hook2Y = weight2.y - renderedHeight1/2 - 12;
        
        const distanceX = Math.abs(weight1.x - weight2.x);
        const distanceY = Math.abs(hook1Y - hook2Y);
        
        return distanceX < 30 && distanceY < 30;
    }

    /**
     * Соединить грузы
     */
    stack(baseWeight, addedWeight, freeWeights) {
        const baseDef = this.getById(baseWeight.weightId);
        const addedDef = this.getById(addedWeight.weightId);
        
        // Наборный груз
        if (baseDef.isCompositeRod || baseDef.isCompositeDisk) {
            if (!baseWeight.compositeDisks) {
                baseWeight.compositeDisks = [];
            }
            
            // Удаляем из freeWeights
            const index = freeWeights.indexOf(addedWeight);
            if (index !== -1) {
                freeWeights.splice(index, 1);
            }
            
            baseWeight.compositeDisks.push({
                weightId: addedWeight.weightId,
                mass: addedWeight.mass,
                diskSize: addedDef.diskSize
            });
            
            baseWeight.mass += addedWeight.mass;
            
            // Сортируем диски от большого к малому
            baseWeight.compositeDisks.sort((a, b) => {
                const sizeOrder = { large: 3, medium: 2, small: 1 };
                return (sizeOrder[b.diskSize] || 0) - (sizeOrder[a.diskSize] || 0);
            });
            
            return { usedWeightId: addedWeight.weightId };
        }
        
        // Обычные грузы
        if (!baseWeight.stackedWeights) {
            baseWeight.stackedWeights = [];
        }
        
        const index = freeWeights.indexOf(addedWeight);
        if (index !== -1) {
            freeWeights.splice(index, 1);
        }
        
        baseWeight.stackedWeights.push(addedWeight);
        baseWeight.mass += addedWeight.mass;
        
        if (addedWeight.stackedWeights) {
            addedWeight.stackedWeights.forEach(w => {
                baseWeight.stackedWeights.push(w);
                baseWeight.mass += w.mass;
            });
        }
        
        return null;
    }

    /**
     * Создать свободный груз для размещения на canvas
     */
    createFreeWeight(weight, x, y) {
        const freeWeight = {
            id: `free-${Date.now()}`,
            weightId: weight.id,
            mass: weight.mass,
            x: x,
            y: y,
            width: weight.targetSize || 88,
            height: weight.targetSize || 88,
            isDragging: false,
            isAttached: false
        };
        
        // Инициализируем массив дисков для штанги
        if (weight.isCompositeRod) {
            freeWeight.compositeDisks = [];
        }
        
        return freeWeight;
    }

    /**
     * Очистить все грузы
     */
    clearAll(state) {
        // Очищаем подвешенные
        state.attachedWeights.forEach(weight => {
            state.selectedWeights.delete(weight.id);
            if (weight.compositeDisks) {
                weight.compositeDisks.forEach(disk => {
                    state.selectedWeights.delete(disk.weightId);
                });
            }
        });
        state.attachedWeights = [];

        // Очищаем свободные
        if (state.freeWeights) {
            state.freeWeights.forEach(fw => {
                state.usedWeightIds.delete(fw.weightId);
                if (fw.compositeDisks) {
                    fw.compositeDisks.forEach(disk => {
                        state.usedWeightIds.delete(disk.weightId);
                    });
                }
                if (fw.stackedWeights) {
                    fw.stackedWeights.forEach(sw => {
                        state.usedWeightIds.delete(sw.weightId);
                    });
                }
            });
            state.freeWeights = [];
        }

        state.weightAttached = false;
        state.currentWeight = null;
        state.currentWeightId = null;
    }
}
