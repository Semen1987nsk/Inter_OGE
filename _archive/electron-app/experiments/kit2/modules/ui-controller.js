/**
 * UIController Module
 * Manages UI state, inventory rendering, and user interactions
 * Extracted from experiment-1-spring.js for better modularity
 */

export class UIController {
    constructor(options = {}) {
        this.containers = {
            equipment: options.equipmentContainer || document.getElementById('equipment-container'),
            weights: options.weightsContainer || document.getElementById('weights-container')
        };
        
        // Callbacks
        this.onEquipmentAction = options.onEquipmentAction || (() => {});
        this.onWeightAction = options.onWeightAction || (() => {});
        this.onDragStart = options.onDragStart || (() => {});
        
        // State reference
        this.weightsManager = options.weightsManager || null;
        this.equipment = options.equipment || {};
        this.weightsInventory = options.weightsInventory || [];
        
        // Debounce timer for DOM updates
        this.updateDebounceTimer = null;
        this.pendingUpdates = new Set();
    }

    /**
     * Schedule a debounced UI update
     * @param {string} section - 'weights' | 'equipment' | 'all'
     */
    scheduleUpdate(section = 'all') {
        this.pendingUpdates.add(section);
        
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
        }
        
        this.updateDebounceTimer = setTimeout(() => {
            this.executeUpdates();
        }, 16); // ~1 frame at 60fps
    }

    /**
     * Execute pending updates
     */
    executeUpdates() {
        if (this.pendingUpdates.has('all') || this.pendingUpdates.has('weights')) {
            this.updateWeightsInventoryFast();
        }
        
        if (this.pendingUpdates.has('all') || this.pendingUpdates.has('equipment')) {
            this.renderEquipmentInventory();
        }
        
        this.pendingUpdates.clear();
        this.updateDebounceTimer = null;
    }

    /**
     * Optimized weights inventory update using DOM diffing
     * Instead of recreating all elements, only updates changed attributes
     */
    updateWeightsInventoryFast() {
        const container = this.containers.weights;
        if (!container || !this.weightsManager) return;
        
        const existingItems = container.querySelectorAll('.weight-item');
        
        // First time - create from scratch
        if (existingItems.length === 0) {
            this.renderWeightsInventoryFull();
            return;
        }
        
        console.log('[UI] Fast update weights inventory');
        
        // Update existing elements in place
        existingItems.forEach((item) => {
            const weightId = item.dataset.weightId;
            const weightState = this.weightsManager.getWeightState(weightId);
            
            if (!weightState.found) return;
            
            // Update dataset
            const newStatus = weightState.state;
            if (item.dataset.status !== newStatus) {
                item.dataset.status = newStatus;
            }
            
            // Update classes
            const shouldBeUsed = weightState.isDirectlyAttached || 
                                 weightState.isPending || 
                                 weightState.isFreeOnCanvas || 
                                 weightState.isPartOfFreeComposite || 
                                 weightState.isPartOfFreeStack;
            
            if (shouldBeUsed) {
                item.classList.add('used', 'weight-item--attached');
            } else {
                item.classList.remove('used', 'weight-item--attached');
            }
            
            // Update status text
            const status = item.querySelector('.weight-status');
            if (status) {
                const newText = this.weightsManager.getWeightStatusText(weightState);
                if (status.textContent !== newText) {
                    status.textContent = newText;
                }
            }
            
            // Update action button
            this.updateWeightActionButton(item, weightState);
        });
    }

    /**
     * Update action button for a weight item
     */
    updateWeightActionButton(item, weightState) {
        let actionBtn = item.querySelector('.weight-action');
        let hintDiv = item.querySelector('.weight-hint');
        
        // Remove hint if exists
        if (hintDiv) {
            hintDiv.remove();
        }
        
        if (weightState.canRemove && weightState.buttonText) {
            // Show/create action button
            if (!actionBtn) {
                actionBtn = document.createElement('button');
                actionBtn.type = 'button';
                actionBtn.className = 'weight-action';
                item.appendChild(actionBtn);
            }
            
            // Update button text and handler
            if (actionBtn.textContent !== weightState.buttonText) {
                actionBtn.textContent = weightState.buttonText;
            }
            
            // Clone to remove old handlers
            const newBtn = actionBtn.cloneNode(true);
            actionBtn.parentNode.replaceChild(newBtn, actionBtn);
            
            newBtn.addEventListener('click', (evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                this.onWeightAction(weightState.weight.id, weightState.removeAction);
            });
            
            newBtn.style.display = 'block';
            newBtn.disabled = false;
            
        } else if (weightState.state === 'available') {
            // Show drag hint
            if (actionBtn) {
                actionBtn.style.display = 'none';
            }
            
            hintDiv = document.createElement('div');
            hintDiv.className = 'weight-hint';
            hintDiv.textContent = 'Перетащите на установку';
            item.appendChild(hintDiv);
            
        } else {
            // Hide button
            if (actionBtn) {
                actionBtn.style.display = 'none';
            }
        }
    }

    /**
     * Full render of weights inventory (first time or after major changes)
     */
    renderWeightsInventoryFull() {
        const container = this.containers.weights;
        if (!container || !this.weightsManager) return;
        
        container.innerHTML = '';
        console.log('[UI] Full render weights inventory');
        
        this.weightsInventory.forEach((weight) => {
            const weightState = this.weightsManager.getWeightState(weight.id);
            if (!weightState.found) return;
            
            const item = this.createWeightElement(weight, weightState);
            container.appendChild(item);
        });
        
        // Notify about new elements for drag initialization
        if (this.onDragStart) {
            this.onDragStart();
        }
    }

    /**
     * Create a weight DOM element
     */
    createWeightElement(weight, weightState) {
        const item = document.createElement('div');
        item.className = 'weight-item';
        item.dataset.type = 'weight';
        item.dataset.mass = weight.mass;
        item.dataset.weightId = weight.id;
        item.dataset.hooksTop = weight.hooksTop ? 'true' : 'false';
        item.dataset.hooksBottom = weight.hooksBottom ? 'true' : 'false';
        item.dataset.status = weightState.state;
        
        const isUsed = weightState.isDirectlyAttached || 
                       weightState.isPending || 
                       weightState.isFreeOnCanvas ||
                       weightState.isPartOfFreeComposite || 
                       weightState.isPartOfFreeStack;
        
        if (isUsed) {
            item.classList.add('used', 'weight-item--attached');
        }
        
        // Figure (icon)
        const figure = document.createElement('div');
        figure.className = 'weight-figure';
        
        if (weight.icon) {
            const img = document.createElement('img');
            img.src = weight.icon;
            img.alt = weight.name;
            img.loading = 'lazy';
            figure.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'weight-placeholder';
            placeholder.textContent = `${weight.mass} г`;
            figure.appendChild(placeholder);
        }
        
        // Label
        const label = document.createElement('div');
        label.className = 'weight-label';
        label.textContent = `${weight.mass} г`;
        
        // Status
        const status = document.createElement('div');
        status.className = 'weight-status';
        status.textContent = this.weightsManager.getWeightStatusText(weightState);
        
        item.append(figure, label, status);
        
        // Action button or hint
        if (weightState.canRemove && weightState.buttonText) {
            const action = document.createElement('button');
            action.type = 'button';
            action.className = 'weight-action';
            action.textContent = weightState.buttonText;
            action.addEventListener('click', (evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                this.onWeightAction(weight.id, weightState.removeAction);
            });
            item.appendChild(action);
        } else if (weightState.state === 'available') {
            const hint = document.createElement('div');
            hint.className = 'weight-hint';
            hint.textContent = 'Перетащите на установку';
            item.appendChild(hint);
        }
        
        return item;
    }

    /**
     * Render equipment inventory
     */
    renderEquipmentInventory() {
        const container = this.containers.equipment;
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.values(this.equipment).forEach((equip) => {
            const item = this.createEquipmentElement(equip);
            container.appendChild(item);
        });
        
        if (this.onDragStart) {
            this.onDragStart();
        }
    }

    /**
     * Create an equipment DOM element
     */
    createEquipmentElement(equipment) {
        const item = document.createElement('div');
        item.className = 'equipment-item';
        item.dataset.type = 'equipment';
        item.dataset.equipmentId = equipment.id;
        
        const isDynamometer = equipment.type === 'dynamometer';
        const isSpring = equipment.type === 'spring';
        
        if (isDynamometer) {
            item.dataset.maxForce = equipment.maxForce;
        } else {
            item.dataset.stiffness = equipment.stiffnessValue;
        }
        
        // Figure with canvas preview
        const figure = document.createElement('div');
        figure.className = 'equipment-figure';
        
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 120;
        canvas.className = 'equipment-preview';
        figure.appendChild(canvas);
        
        item.appendChild(figure);
        
        // Title
        const title = document.createElement('div');
        title.className = 'equipment-title';
        title.textContent = equipment.name;
        
        // Status
        const status = document.createElement('div');
        status.className = 'equipment-status';
        status.textContent = 'В комплекте';
        
        // Hint
        const hint = document.createElement('div');
        hint.className = 'equipment-hint';
        hint.textContent = 'Перетащите на установку';
        
        item.append(title, status, hint);
        
        return item;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'success', duration = 3000) {
        // Remove existing toast
        const existing = document.querySelector('.toast-notification');
        if (existing) {
            existing.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;
        
        if (type === 'error') {
            toast.style.background = 'linear-gradient(135deg, #D32F2F, #B71C1C)';
        } else if (type === 'warning') {
            toast.style.background = 'linear-gradient(135deg, #FFB300, #FF8F00)';
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutToast 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Show achievement popup
     */
    showAchievement(title, description, icon = '🏆') {
        const popup = document.getElementById('achievement-popup');
        if (!popup) return;
        
        const titleEl = popup.querySelector('.achievement-title');
        const descEl = popup.querySelector('.achievement-desc');
        const iconEl = popup.querySelector('.achievement-icon');
        
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = description;
        if (iconEl) iconEl.textContent = icon;
        
        popup.style.display = 'block';
        popup.style.animation = 'slideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        
        setTimeout(() => {
            popup.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                popup.style.display = 'none';
            }, 300);
        }, 4000);
    }

    /**
     * Update undo/redo buttons state
     */
    updateUndoRedoButtons() {
        if (!this.weightsManager) return;
        
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        
        if (undoBtn) {
            undoBtn.disabled = !this.weightsManager.canUndo();
        }
        
        if (redoBtn) {
            redoBtn.disabled = !this.weightsManager.canRedo();
        }
    }
}
