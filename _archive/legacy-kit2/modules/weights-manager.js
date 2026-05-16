/**
 * WeightsManager Module
 * Manages weight inventory, state tracking, and attachment logic
 * Extracted from experiment-1-spring.js for better modularity
 */

export class WeightsManager {
    constructor(weightsInventory, getWeightByIdFn) {
        this.weightsInventory = weightsInventory;
        this.getWeightById = getWeightByIdFn;
        
        // State
        this.attachedWeights = [];
        this.selectedWeights = new Set();
        this.usedWeightIds = new Set();
        this.freeWeights = [];
        this.pendingWeightIds = new Set();
        
        // Undo/Redo stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 50;
        
        // Callbacks
        this.onStateChange = null;
    }

    /**
     * Save current state for undo
     */
    saveState(actionName) {
        const snapshot = {
            actionName,
            timestamp: Date.now(),
            attachedWeights: JSON.parse(JSON.stringify(this.attachedWeights)),
            selectedWeights: new Set(this.selectedWeights),
            usedWeightIds: new Set(this.usedWeightIds),
            freeWeights: JSON.parse(JSON.stringify(this.freeWeights))
        };
        
        this.undoStack.push(snapshot);
        
        // Limit history size
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        
        // Clear redo stack on new action
        this.redoStack = [];
        
        console.log('[UNDO] State saved:', actionName, '| Stack size:', this.undoStack.length);
    }

    /**
     * Undo last action
     * @returns {boolean} true if undo was successful
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('[UNDO] Nothing to undo');
            return false;
        }
        
        // Save current state to redo stack
        const currentState = {
            actionName: 'current',
            timestamp: Date.now(),
            attachedWeights: JSON.parse(JSON.stringify(this.attachedWeights)),
            selectedWeights: new Set(this.selectedWeights),
            usedWeightIds: new Set(this.usedWeightIds),
            freeWeights: JSON.parse(JSON.stringify(this.freeWeights))
        };
        this.redoStack.push(currentState);
        
        // Restore previous state
        const previousState = this.undoStack.pop();
        this.restoreState(previousState);
        
        console.log('[UNDO] Restored:', previousState.actionName);
        return true;
    }

    /**
     * Redo last undone action
     * @returns {boolean} true if redo was successful
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('[REDO] Nothing to redo');
            return false;
        }
        
        // Save current state to undo stack
        const currentState = {
            actionName: 'redo-point',
            timestamp: Date.now(),
            attachedWeights: JSON.parse(JSON.stringify(this.attachedWeights)),
            selectedWeights: new Set(this.selectedWeights),
            usedWeightIds: new Set(this.usedWeightIds),
            freeWeights: JSON.parse(JSON.stringify(this.freeWeights))
        };
        this.undoStack.push(currentState);
        
        // Restore redo state
        const redoState = this.redoStack.pop();
        this.restoreState(redoState);
        
        console.log('[REDO] Restored state');
        return true;
    }

    /**
     * Restore state from snapshot
     */
    restoreState(snapshot) {
        this.attachedWeights = snapshot.attachedWeights;
        this.selectedWeights = snapshot.selectedWeights;
        this.usedWeightIds = snapshot.usedWeightIds;
        this.freeWeights = snapshot.freeWeights;
        
        // Notify listeners
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Get the full state of a weight by ID
     */
    getWeightState(weightId) {
        const weight = this.getWeightById(weightId);
        if (!weight) {
            return { found: false };
        }

        // Check if directly attached
        const isDirectlyAttached = this.selectedWeights.has(weightId);
        
        // Check position in chain
        const attachedIndex = this.attachedWeights.findIndex(w => w.id === weightId);
        const isInChain = attachedIndex !== -1;
        const positionInChain = isInChain ? attachedIndex + 1 : null;
        const isLastInChain = isInChain && attachedIndex === this.attachedWeights.length - 1;
        
        // Check if part of attached composite (disk on attached rod)
        let isPartOfAttachedComposite = false;
        let parentRodId = null;
        if (weight.isCompositeDisk) {
            for (const attachedWeight of this.attachedWeights) {
                if (attachedWeight.compositeDisks?.some(d => d.weightId === weightId)) {
                    isPartOfAttachedComposite = true;
                    parentRodId = attachedWeight.id;
                    break;
                }
            }
        }
        
        // Check if free on canvas
        const freeWeight = this.freeWeights?.find(fw => fw.weightId === weightId);
        const isFreeOnCanvas = !!freeWeight && !isDirectlyAttached;
        
        // Check if part of free composite
        let isPartOfFreeComposite = false;
        let freeRodId = null;
        if (weight.isCompositeDisk && !isFreeOnCanvas) {
            for (const fw of this.freeWeights || []) {
                if (fw.compositeDisks?.some(d => d.weightId === weightId)) {
                    isPartOfFreeComposite = true;
                    freeRodId = fw.weightId;
                    break;
                }
            }
        }
        
        // Check if part of stack
        let isPartOfFreeStack = false;
        let stackBottomWeightId = null;
        if (!isFreeOnCanvas && !isPartOfFreeComposite) {
            for (const fw of this.freeWeights || []) {
                if (fw.stackedWeights?.some(sw => sw.weightId === weightId)) {
                    isPartOfFreeStack = true;
                    stackBottomWeightId = fw.weightId;
                    break;
                }
            }
        }
        
        // Check if pending
        const isPending = this.pendingWeightIds.has(weightId);
        
        // Determine final state
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

    /**
     * Get total mass of a weight including composite disks
     */
    getTotalWeightMass(weight) {
        if (!weight) return 0;
        
        const weightDef = this.getWeightById(weight.id);
        let mass = weightDef?.mass || 0;
        
        if (weight.compositeDisks && Array.isArray(weight.compositeDisks)) {
            weight.compositeDisks.forEach(disk => {
                const diskDef = this.getWeightById(disk.weightId);
                if (diskDef) {
                    mass += diskDef.mass;
                }
            });
        }
        
        return mass;
    }

    /**
     * Get total mass of all attached weights
     */
    getTotalAttachedMass() {
        return this.attachedWeights.reduce((sum, w) => {
            return sum + this.getTotalWeightMass(w);
        }, 0);
    }

    /**
     * Check if a weight can be attached
     */
    canAttachWeight(weight) {
        if (!weight) return false;

        if (!this.attachedWeights?.length) {
            return !!weight.hooksTop;
        }

        const last = this.attachedWeights[this.attachedWeights.length - 1];
        const lastDef = this.getWeightById(last.id);

        return !!(lastDef?.hooksBottom && weight.hooksTop);
    }

    /**
     * Add weight to attached chain
     */
    attachWeight(weightId, weightData = {}) {
        this.saveState('attach-weight');
        
        const weight = this.getWeightById(weightId);
        if (!weight) return false;
        
        const attachedWeight = {
            id: weightId,
            mass: weight.mass,
            ...weightData
        };
        
        this.attachedWeights.push(attachedWeight);
        this.selectedWeights.add(weightId);
        
        if (this.onStateChange) {
            this.onStateChange();
        }
        
        return true;
    }

    /**
     * Remove last weight from chain
     */
    detachLastWeight() {
        if (this.attachedWeights.length === 0) return null;
        
        this.saveState('detach-weight');
        
        const removed = this.attachedWeights.pop();
        this.selectedWeights.delete(removed.id);
        
        // If it had composite disks, remove them from used
        if (removed.compositeDisks) {
            removed.compositeDisks.forEach(disk => {
                this.usedWeightIds.delete(disk.weightId);
            });
        }
        
        if (this.onStateChange) {
            this.onStateChange();
        }
        
        return removed;
    }

    /**
     * Clear all attached weights
     */
    clearAllAttached() {
        this.saveState('clear-all');
        
        this.attachedWeights = [];
        this.selectedWeights.clear();
        
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    /**
     * Get status text for weight
     */
    getWeightStatusText(weightState) {
        if (!weightState.found) return 'Неизвестно';
        
        switch (weightState.state) {
            case 'pending':
                return 'Подвешивается…';
            case 'attached-last':
            case 'attached-middle':
                const chainInfo = weightState.positionInChain ? ` (${weightState.positionInChain}-й)` : '';
                return `На пружине${chainInfo}`;
            case 'attached-composite-disk':
                return 'На штанге (пружина)';
            case 'free-on-canvas':
                if (weightState.freeWeight?.compositeDisks?.length > 0) {
                    const disksCount = weightState.freeWeight.compositeDisks.length;
                    return `На столе (${disksCount} диск.)`;
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
}
