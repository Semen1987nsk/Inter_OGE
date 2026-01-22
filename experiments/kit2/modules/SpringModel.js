import { WEIGHTS_INVENTORY } from '../experiment-config.js?v=1445';

/**
 * SpringModel - Manages the state of the Spring Experiment
 */
export class SpringModel {
    constructor() {
        this.state = {
            currentStep: 1,
            experimentMode: 'spring', // 'spring' or 'dynamometer'
            
            // Animation & Interaction flags
            isAnimating: false,
            isDragging: false,
            draggingSpring: false,
            
            // Spring State
            springAttached: false,
            attachedSpringId: null,
            springPosition: { x: 200, y: 150 },
            springLength: 140,
            springNaturalLength: 140,
            springElongation: 0,
            
            // Dynamometer State
            dynamometerAttached: false,
            attachedDynamometerId: null,
            dynamometerPosition: { x: 450, y: 200 },
            dynamometerCheckMode: false,
            lastDynamometerReading: null,
            
            // Weights State
            weightAttached: false,
            currentWeight: null,
            currentWeightId: null,
            attachedWeights: [], // Stack of attached weights
            selectedWeights: new Set(), // Set of attached weight IDs
            freeWeights: [], // Weights on the table (not attached)
            usedWeightIds: new Set(), // IDs of weights currently in use (attached or free)
            pendingWeightIds: new Set(), // IDs of weights currently being processed
            
            // Data Recording
            measurements: [],
            recordedForce: null,
            recordedElongation: null,
            experimentComplete: false
        };
        
        this.listeners = [];
        this.images = {}; // For hit testing
    }

    setImages(images) {
        this.images = images;
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function(state, changedProps, data)
     */
    subscribe(listener) {
        this.listeners.push(listener);
    }

    /**
     * Notify all listeners of changes
     * @param {Array} changedProps - List of property names that changed
     * @param {Object} data - Optional data (e.g. for toast)
     */
    notify(changedProps = [], data = null) {
        this.listeners.forEach(listener => listener(this.state, changedProps, data));
    }

    /**
     * Get a state property
     * @param {string} key 
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Set a single state property
     * @param {string} key 
     * @param {any} value 
     */
    set(key, value) {
        if (this.state[key] !== value) {
            this.state[key] = value;
            this.notify([key]);
        }
    }

    /**
     * Update multiple state properties at once
     * @param {Object} updates 
     */
    update(updates) {
        const changed = [];
        for (const key in updates) {
            if (this.state[key] !== updates[key]) {
                this.state[key] = updates[key];
                changed.push(key);
            }
        }
        if (changed.length > 0) {
            this.notify(changed);
        }
    }

    getWeightById(id) {
        // Handle composite IDs (e.g. "weight_1_disk_2")
        if (id && id.includes('_disk_')) {
            const baseId = id.split('_disk_')[0];
            return WEIGHTS_INVENTORY.find(w => w.id === baseId);
        }
        return WEIGHTS_INVENTORY.find(w => w.id === id);
    }

    /**
     * Add a weight to the attached chain
     * @param {string} weightId 
     */
    addWeightToChain(weightId) {
        console.log('[ADD-TO-CHAIN] ➕ Добавление груза в цепочку:', weightId);
        
        if (!Array.isArray(this.state.attachedWeights)) {
            this.state.attachedWeights = [];
        }
        
        // Получаем полный объект груза для проверки compositeDisks
        const weightDef = this.getWeightById(weightId);
        
        // ✅ ЕДИНАЯ ТОЧКА добавления
        const chainEntry = { id: weightId };
        
        // ✅ КРИТИЧНО: Копируем compositeDisks если это штанга
        if (weightDef && weightDef.compositeDisks && weightDef.compositeDisks.length > 0) {
            chainEntry.compositeDisks = [...weightDef.compositeDisks];
            console.log('[ADD-TO-CHAIN] ✅ Скопированы диски в цепочку:', chainEntry.compositeDisks.map(d => d.weightId));
            
            // ✅ КРИТИЧНО: Добавляем каждый диск в selectedWeights
            weightDef.compositeDisks.forEach(disk => {
                this.state.selectedWeights.add(disk.weightId);
                this.state.usedWeightIds.delete(disk.weightId);
                console.log('[ADD-TO-CHAIN] ✅ Диск добавлен в selectedWeights:', disk.weightId);
            });
        }
        
        this.state.attachedWeights.push(chainEntry);
        this.state.selectedWeights.add(weightId);
        
        // ❌ УДАЛЯЕМ из usedWeightIds - груз теперь "подвешен", а не "использован на canvas"
        this.state.usedWeightIds.delete(weightId);
        
        console.log('[ADD-TO-CHAIN] ✅ Груз добавлен:', {
            chain: this.state.attachedWeights.map(w => w.id),
            selectedWeights: Array.from(this.state.selectedWeights),
            usedWeightIds: Array.from(this.state.usedWeightIds)
        });

        this.notify(['weightsChanged', 'weightsInventory']);
    }

    /**
     * Remove a free weight (from canvas) and return to inventory
     * @param {string} weightId 
     */
    removeFreeWeight(weightId) {
        console.log('[REMOVE-FREE] Удаление свободного груза:', weightId);
        
        // 🔍 СЦЕНАРИЙ 1: Ищем груз в freeWeights напрямую
        let freeWeightIndex = this.state.freeWeights.findIndex(fw => fw.weightId === weightId);
        
        if (freeWeightIndex !== -1) {
            console.log('[REMOVE-FREE] ✅ Найден как основной груз (индекс:', freeWeightIndex, ')');
            const removedWeight = this.state.freeWeights[freeWeightIndex];
            
            // Удаляем из массива свободных
            this.state.freeWeights.splice(freeWeightIndex, 1);
            
            // 🔩 СПЕЦИАЛЬНАЯ ЛОГИКА: Если это штанга с дисками - возвращаем ВСЕ диски!
            if (removedWeight.compositeDisks && removedWeight.compositeDisks.length > 0) {
                console.log('[REMOVE-FREE] 🔩 Возврат наборного груза: штанга +', removedWeight.compositeDisks.length, 'дисков');
                removedWeight.compositeDisks.forEach(disk => {
                    this.state.usedWeightIds.delete(disk.weightId);
                });
            }
            
            // Если у груза была стопка сверху (100г грузы), возвращаем ВСЕ грузы из стопки
            if (removedWeight.stackedWeights && removedWeight.stackedWeights.length > 0) {
                console.log('[REMOVE-FREE] 📚 Возврат стопки из', removedWeight.stackedWeights.length, 'грузов');
                removedWeight.stackedWeights.forEach(sw => {
                    this.state.usedWeightIds.delete(sw.weightId);
                });
            }
            
            // Убираем сам груз из usedWeightIds
            this.state.usedWeightIds.delete(weightId);
            this.state.selectedWeights.delete(weightId);
            
            this.notify(['weightsChanged', 'weightsInventory'], { toast: '✓ Груз возвращён в инвентарь' });
            return;
        }
        
        // 🔍 СЦЕНАРИЙ 2: Ищем диск в compositeDisks (диск на штанге)
        for (let i = 0; i < this.state.freeWeights.length; i++) {
            const freeWeight = this.state.freeWeights[i];
            if (freeWeight.compositeDisks && freeWeight.compositeDisks.length > 0) {
                const diskIndex = freeWeight.compositeDisks.findIndex(d => d.weightId === weightId);
                if (diskIndex !== -1) {
                    console.log('[REMOVE-FREE] ✅ Найден диск на штанге', freeWeight.weightId, 'на позиции', diskIndex);
                    
                    // Удаляем диск из массива
                    const removedDisk = freeWeight.compositeDisks.splice(diskIndex, 1)[0];
                    
                    // Уменьшаем массу штанги
                    freeWeight.mass -= removedDisk.mass;
                    
                    // Возвращаем диск в инвентарь
                    this.state.usedWeightIds.delete(removedDisk.weightId);
                    this.state.selectedWeights.delete(removedDisk.weightId);
                    
                    this.notify(['weightsChanged', 'weightsInventory'], { toast: `✓ Диск ${removedDisk.mass}г возвращён в инвентарь` });
                    return;
                }
            }
        }
        
        // 🔍 СЦЕНАРИЙ 3: Ищем груз в stackedWeights (верхний груз в стопке 100г)
        for (let i = 0; i < this.state.freeWeights.length; i++) {
            const freeWeight = this.state.freeWeights[i];
            if (freeWeight.stackedWeights && freeWeight.stackedWeights.length > 0) {
                const stackIndex = freeWeight.stackedWeights.findIndex(sw => sw.weightId === weightId);
                if (stackIndex !== -1) {
                    console.log('[REMOVE-FREE] ✅ Найден в стопке груза', freeWeight.weightId, 'на позиции', stackIndex);
                    
                    // Удаляем из стопки
                    const removedStackWeight = freeWeight.stackedWeights.splice(stackIndex, 1)[0];
                    
                    // Возвращаем этот груз в инвентарь
                    this.state.usedWeightIds.delete(removedStackWeight.weightId);
                    this.state.selectedWeights.delete(removedStackWeight.weightId);
                    
                    this.notify(['weightsChanged', 'weightsInventory'], { toast: '✓ Груз возвращён в инвентарь' });
                    return;
                }
            }
        }
        
        // 🔍 СЦЕНАРИЙ 4: Груз вообще не найден
        console.warn('[REMOVE-FREE] ⚠️ Груз не найден ни в freeWeights, ни в compositeDisks, ни в stackedWeights!', weightId);
        this.state.usedWeightIds.delete(weightId);
        this.state.selectedWeights.delete(weightId);
        this.notify(['weightsChanged', 'weightsInventory']);
    }

    canStackWeights(weight1, weight2) {
        // weight1 — нижний (на котором будет висеть weight2)
        // weight2 — верхний (который подвешиваем)
        
        const weightDef1 = this.getWeightById(weight1.weightId);
        const weightDef2 = this.getWeightById(weight2.weightId);
        
        if (!weightDef1 || !weightDef2) return false;
        
        const isRod1 = weightDef1.isCompositeRod;
        const isRod2 = weightDef2.isCompositeRod;
        const isDisk1 = weightDef1.isCompositeDisk;
        const isDisk2 = weightDef2.isCompositeDisk;
        
        // Случай 1: Добавляем диск К ШТАНГЕ
        if (isRod1 && isDisk2) {
            const isRodAttached = this.state.selectedWeights?.has(weight1.weightId);
            if (isRodAttached) return false;
            
            const imgRod = this.images[weight1.weightId] || this.images[weightDef1.id];
            const targetSizeRod = weightDef1.targetSize ?? 72;
            const renderScaleRod = targetSizeRod / (imgRod ? Math.max(imgRod.width, imgRod.height) : targetSizeRod);
            const renderedHeightRod = imgRod ? imgRod.height * renderScaleRod : targetSizeRod * 0.9;
            
            const rodSupportRingY = weight1.y + renderedHeightRod * 0.325;
            const diskY = weight2.y;
            const distanceX = Math.abs(weight1.x - weight2.x);
            const distanceY = Math.abs(rodSupportRingY - diskY);
            
            return distanceX < 60 && distanceY < 100;
        }
        
        // Случай 2: Добавляем диск К УЖЕ НАДЕТЫМ ДИСКАМ
        if (isDisk1 && isDisk2) {
            const rodWithDisk = this.state.freeWeights?.find(fw => {
                const def = this.getWeightById(fw.weightId);
                return def?.isCompositeRod && fw.compositeDisks?.some(d => d.weightId === weight1.weightId);
            });
            
            if (rodWithDisk) {
                const isRodAttached = this.state.selectedWeights?.has(rodWithDisk.weightId);
                if (isRodAttached) return false;
            }
            
            const distanceX = Math.abs(weight1.x - weight2.x);
            const distanceY = Math.abs(weight1.y - weight2.y);
            
            return distanceX < 60 && distanceY < 80;
        }
        
        // Случай 3: Обычные грузы 100г
        const img1 = this.images[weight1.weightId] || this.images[weightDef1.id];
        const img2 = this.images[weight2.weightId] || this.images[weightDef2.id];
        
        const targetSize1 = weightDef1.targetSize ?? 72;
        const targetSize2 = weightDef2.targetSize ?? 72;
        
        const renderScale1 = targetSize1 / (img1 ? Math.max(img1.width, img1.height) : targetSize1);
        const renderScale2 = targetSize2 / (img2 ? Math.max(img2.width, img2.height) : targetSize2);
        
        const renderedHeight1 = img1 ? img1.height * renderScale1 : targetSize1 * 0.9;
        const renderedHeight2 = img2 ? img2.height * renderScale2 : targetSize2 * 0.9;
        
        const hook1Y = weight1.y + renderedHeight1/2 + 8;
        const hook2Y = weight2.y - renderedHeight2/2 - 12;
        
        const distanceX = Math.abs(weight1.x - weight2.x);
        const distanceY = Math.abs(hook1Y - hook2Y);
        
        return distanceX < 30 && distanceY < 30;
    }

    stackWeights(baseWeight, addedWeight) {
        const baseDef = this.getWeightById(baseWeight.weightId);
        const addedDef = this.getWeightById(addedWeight.weightId);
        
        // 🔩 СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ НАБОРНОГО ГРУЗА
        if (baseDef.isCompositeRod || baseDef.isCompositeDisk) {
            if (!baseWeight.compositeDisks) {
                baseWeight.compositeDisks = [];
            }
            
            const index = this.state.freeWeights.indexOf(addedWeight);
            if (index !== -1) {
                this.state.freeWeights.splice(index, 1);
            }
            
            baseWeight.compositeDisks.push({
                weightId: addedWeight.weightId,
                mass: addedWeight.mass,
                diskSize: addedDef.diskSize
            });
            
            baseWeight.mass += addedWeight.mass;
            this.state.usedWeightIds.add(addedWeight.weightId);
            
            baseWeight.compositeDisks.sort((a, b) => {
                const sizeOrder = { large: 3, medium: 2, small: 1 };
                return (sizeOrder[b.diskSize] || 0) - (sizeOrder[a.diskSize] || 0);
            });
            
            this.notify(['weightsChanged', 'weightsInventory']);
            return;
        }
        
        // 🔩 СТАНДАРТНАЯ ЛОГИКА ДЛЯ ОБЫЧНЫХ ГРУЗОВ 100г
        if (!baseWeight.stackedWeights) {
            baseWeight.stackedWeights = [];
        }
        
        const index = this.state.freeWeights.indexOf(addedWeight);
        if (index !== -1) {
            this.state.freeWeights.splice(index, 1);
        }
        
        baseWeight.stackedWeights.push(addedWeight);
        baseWeight.mass += addedWeight.mass;
        
        if (addedWeight.stackedWeights) {
            addedWeight.stackedWeights.forEach(w => {
                baseWeight.stackedWeights.push(w);
                baseWeight.mass += w.mass;
            });
        }
        
        this.notify(['weightsChanged']);
    }

    addFreeWeight(weightId, x, y) {
        const weightDef = this.getWeightById(weightId);
        if (!weightDef) return null;

        this.state.usedWeightIds.add(weightId);

        const freeWeight = {
            id: `free-${Date.now()}`,
            weightId: weightId,
            mass: weightDef.mass,
            x: x,
            y: y,
            width: weightDef.targetSize || 88,
            height: weightDef.targetSize || 88,
            isDragging: false,
            isAttached: false
        };
        
        if (weightDef.isCompositeRod) {
            freeWeight.compositeDisks = [];
        }
        
        this.state.freeWeights.push(freeWeight);
        
        this.notify(['weightsChanged', 'weightsInventory']);
        return freeWeight;
    }

    clearAllWeights() {
        // Clear attached weights
        this.state.attachedWeights.forEach(weight => {
            this.state.selectedWeights.delete(weight.id);
            if (weight.compositeDisks) {
                weight.compositeDisks.forEach(disk => {
                    this.state.selectedWeights.delete(disk.weightId);
                });
            }
        });
        this.state.attachedWeights = [];

        // Clear free weights
        this.state.freeWeights.forEach(fw => {
            this.state.usedWeightIds.delete(fw.weightId);
            if (fw.compositeDisks) {
                fw.compositeDisks.forEach(disk => {
                    this.state.usedWeightIds.delete(disk.weightId);
                });
            }
            if (fw.stackedWeights) {
                fw.stackedWeights.forEach(sw => {
                    this.state.usedWeightIds.delete(sw.weightId);
                });
            }
        });
        this.state.freeWeights = [];
        
        this.state.weightAttached = false;
        this.state.currentWeightId = null;
        this.state.currentWeight = null;
        
        this.notify(['weightsChanged', 'weightsInventory']);
    }

    clearAttachedWeights() {
        this.state.attachedWeights.forEach(weight => {
            this.state.selectedWeights.delete(weight.id);
            if (weight.compositeDisks) {
                weight.compositeDisks.forEach(disk => {
                    this.state.selectedWeights.delete(disk.weightId);
                });
            }
        });
        this.state.attachedWeights = [];
        this.state.weightAttached = false;
        this.state.currentWeightId = null;
        this.state.currentWeight = null;
        
        this.notify(['weightsChanged', 'weightsInventory']);
    }

    reset() {
        this.state.currentStep = 1;
        this.state.measurements = [];
        this.state.experimentComplete = false;
        this.state.springLength = this.state.springNaturalLength;
        this.state.springElongation = 0;
        
        this.clearAllWeights();
        
        this.notify(['reset', 'measurements']);
    }

    /**
     * Determine the exact state of a weight
     * @param {string} weightId 
     */
    getWeightState(weightId) {
        const weight = this.getWeightById(weightId);
        if (!weight) {
            return { found: false };
        }

        // 1. Check if directly attached
        const isDirectlyAttached = this.state.selectedWeights.has(weightId);
        
        // 2. Check if in attached chain
        const attachedIndex = this.state.attachedWeights.findIndex(w => w.id === weightId);
        const isInChain = attachedIndex !== -1;
        const positionInChain = isInChain ? attachedIndex + 1 : null;
        const isLastInChain = isInChain && attachedIndex === this.state.attachedWeights.length - 1;
        
        // 3. Check if part of attached composite
        let isPartOfAttachedComposite = false;
        let parentRodId = null;
        if (weight.isCompositeDisk && isInChain) {
            for (const attachedWeight of this.state.attachedWeights) {
                if (attachedWeight.compositeDisks?.some(d => d.weightId === weightId)) {
                    isPartOfAttachedComposite = true;
                    parentRodId = attachedWeight.id;
                    break;
                }
            }
        }
        
        // 4. Check if free on canvas
        const freeWeight = this.state.freeWeights?.find(fw => fw.weightId === weightId);
        const isFreeOnCanvas = !!freeWeight && !isDirectlyAttached;
        
        // 5. Check if part of free composite
        let isPartOfFreeComposite = false;
        let freeRodId = null;
        if (weight.isCompositeDisk && !isFreeOnCanvas) {
            for (const fw of this.state.freeWeights || []) {
                if (fw.compositeDisks?.some(d => d.weightId === weightId)) {
                    isPartOfFreeComposite = true;
                    freeRodId = fw.weightId;
                    break;
                }
            }
        }
        
        // 6. Check if part of free stack
        let isPartOfFreeStack = false;
        let stackBottomWeightId = null;
        if (!isFreeOnCanvas && !isPartOfFreeComposite) {
            for (const fw of this.state.freeWeights || []) {
                if (fw.stackedWeights?.some(sw => sw.weightId === weightId)) {
                    isPartOfFreeStack = true;
                    stackBottomWeightId = fw.weightId;
                    break;
                }
            }
        }
        
        // 7. Check if pending
        const isPending = this.state.pendingWeightIds.has(weightId);
        
        // 8. Determine final state
        let state = 'available';
        let canRemove = false;
        let removeAction = null;
        let buttonText = null;
        
        if (isPending) {
            state = 'pending';
        } else if (isPartOfAttachedComposite) {
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
            isPending,
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
}
