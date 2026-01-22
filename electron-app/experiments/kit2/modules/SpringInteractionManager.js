/**
 * SpringInteractionManager - Handles all Drag & Drop interactions
 */
export class SpringInteractionManager {
    constructor(experiment) {
        this.experiment = experiment;
        this.dragGhost = null;
        this._trailSkipFrame = false;
    }

    init() {
        if (typeof interact === 'undefined') {
            console.error('❌ Interact.js not loaded!');
            return;
        }

        interact.pointerMoveTolerance(5);
        interact.dynamicDrop(true);

        this.initDraggables();
        this.initDropzone();
    }

    initDraggables() {
        interact('.weight-item').unset?.();
        interact('.equipment-item').unset?.();

        interact('.weight-item').draggable({
            inertia: false,
            autoScroll: true,
            manualStart: false,
            hold: 0,
            allowFrom: null,
            ignoreFrom: null,
            cursorChecker: null,
            listeners: {
                start: (event) => this.onDragStart(event),
                move: (event) => this.onDragMove(event),
                end: (event) => this.onDragEnd(event)
            }
        });

        interact('.equipment-item').draggable({
            inertia: true,
            autoScroll: true,
            manualStart: false,
            hold: 0,
            allowFrom: null,
            ignoreFrom: null,
            cursorChecker: null,
            listeners: {
                start: (event) => this.onDragStart(event),
                move: (event) => this.onDragMove(event),
                end: (event) => this.onDragEnd(event)
            }
        });
    }

    initDropzone() {
        const overlay = document.getElementById('drag-drop-overlay');
        if (!overlay) {
            console.error('❌ drag-drop-overlay не найден');
            return;
        }

        interact('#drag-drop-overlay').unset?.();

        interact('#drag-drop-overlay').dropzone({
            accept: '.weight-item, .equipment-item',
            overlap: 0.1,
            checker: null,
            ondrop: (event) => {
                console.log('[DROPZONE] ondrop вызван!');
                this.handleCanvasDrop(event);
            },
            ondropactivate: (event) => {
                const weightId = event.relatedTarget?.dataset?.weightId || 'unknown';
                console.log('[DROPZONE] Drop активирован для', weightId);
            },
            ondragenter: (event) => {
                if (event.relatedTarget?.dataset) {
                    event.relatedTarget.dataset.wasDropped = 'true';
                    console.log('[DROPZONE] Установлен wasDropped=true в ondragenter');
                }
            },
            ondropdeactivate: (event) => {
                console.log('[DROPZONE] Drop деактивирован');
            }
        });
    }

    onDragStart(event) {
        console.log('[DRAG-START] Event type:', event.type, 
                    'Interaction type:', event.interaction?.pointerType,
                    'Target:', event.target.dataset.weightId || event.target.dataset.equipmentId);
        
        const type = event.target.dataset.type || 'weight';
        
        if (type === 'weight') {
            const weightId = event.target.dataset.weightId;
            if (this.experiment.state.usedWeightIds.has(weightId) || this.experiment.state.selectedWeights.has(weightId)) {
                console.log('[DRAG] ⛔ Груз уже использован:', weightId);
                event.interaction?.stop();
                return false;
            }
        }
        
        this.experiment.state.isDragging = true;
        event.target.classList.add('dragging');
        
        event.target.style.transition = 'none';
        event.target.style.opacity = '0.6';
        event.target.style.zIndex = '1000';
        
        const clone = event.target.cloneNode(true);
        clone.id = 'drag-ghost';
        clone.style.position = 'fixed';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '10000';
        clone.style.opacity = '0.9';
        clone.style.transform = 'scale(1.2)';
        clone.style.boxShadow = '0 10px 30px rgba(0, 168, 107, 0.6)';
        clone.style.border = '3px solid #00A86B';
        
        const rect = event.target.getBoundingClientRect();
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        
        document.body.appendChild(clone);
        this.dragGhost = clone;
        
        if (event.target.dataset) {
            event.target.dataset.wasDropped = 'false';
        }

        if (type === 'weight') {
            const mass = parseInt(event.target.dataset.mass, 10);
            this.experiment.state.currentWeight = mass;
            console.log('🎯 Drag started: груз', mass, 'г');
        } else if (type === 'equipment') {
            console.log('🔧 Dragging equipment item:', event.target.dataset.equipmentId);
        }
        
        if (this.experiment.visualSettings?.dragTrail) {
            const trailColor = type === 'equipment' ? '#0066CC' : '#00A86B';
            this.experiment.particleSystem.createTrail(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                trailColor
            );
        }
        
        if (this.experiment.visualSettings?.dragParticles) {
            const canvasRect = this.experiment.canvases.particles.getBoundingClientRect();
            this.experiment.particleSystem.createDustParticles(
                rect.left - canvasRect.left + rect.width / 2,
                rect.top - canvasRect.top + rect.height / 2,
                8
            );
        }
    }

    onDragMove(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        if (this.dragGhost) {
            const rect = target.getBoundingClientRect();
            this.dragGhost.style.left = rect.left + 'px';
            this.dragGhost.style.top = rect.top + 'px';
            
            if (this.experiment.visualSettings?.dragTrail) {
                if (!this._trailSkipFrame) {
                    this._trailSkipFrame = true;
                    return;
                }
                this._trailSkipFrame = false;
                
                const canvasRect = this.experiment.canvases.particles.getBoundingClientRect();
                this.experiment.particleSystem.updateTrail(
                    rect.left - canvasRect.left + rect.width / 2,
                    rect.top - canvasRect.top + rect.height / 2
                );
            }
        }
    }

    onDragEnd(event) {
        this.experiment.state.isDragging = false;
        event.target.classList.remove('dragging');
        
        const wasDropped = event.target.dataset.wasDropped === 'true';
        
        console.log('[DRAG-END] Start cleanup', {
            type: event.target.dataset.type,
            weightId: event.target.dataset.weightId,
            hasGhost: !!this.dragGhost,
            wasDropped: wasDropped
        });
        
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
        
        const existingGhosts = document.querySelectorAll('#drag-ghost');
        existingGhosts.forEach(ghost => ghost.remove());
        
        event.target.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        event.target.style.opacity = '1';
        event.target.style.zIndex = '';
        
        if (this.experiment.visualSettings?.dragTrail) {
            this.experiment.particleSystem.clearTrail();
        }
        
        const type = event.target.dataset.type || 'weight';
        if (!wasDropped && (type === 'equipment' || type === 'weight')) {
            console.log('[DRAG-END] Resetting position (not dropped)');
            this.resetDraggablePosition(event.target);
        }
    }

    handleCanvasDrop(event) {
        const itemType = event.relatedTarget?.dataset?.type || 'weight';

        console.log('[DROPZONE] Срабатывание drop:', {
            itemType,
            isAnimating: this.experiment.state.isAnimating,
            springAttached: this.experiment.state.springAttached
        });

        if (itemType === 'equipment') {
            this.experiment.handleEquipmentAttach(event);
            return;
        }

        if (itemType === 'weight') {
            return this.handleWeightDrop(event);
        }

        console.warn('Unhandled drop type:', itemType);
    }

    async handleWeightDrop(event) {
        const element = event.relatedTarget;
        const weightId = element?.dataset?.weightId;
        const weight = this.experiment.model.getWeightById(weightId);

        if (!weight) {
            this.experiment.showHint('Не удалось распознать груз. Попробуйте снова.');
            this.resetDraggablePosition(element);
            return;
        }

        const canvasRect = this.experiment.canvases.dynamic.getBoundingClientRect();
        
        let elementRect;
        if (this.dragGhost) {
            elementRect = this.dragGhost.getBoundingClientRect();
        } else {
            elementRect = element.getBoundingClientRect();
        }
        
        const canvasX = elementRect.left + elementRect.width/2 - canvasRect.left;
        const canvasY = elementRect.top + elementRect.height * 0.25 - canvasRect.top;
        
        let shouldAttachDirectly = false;
        
        if (this.experiment.state.springAttached) {
            const springPos = this.experiment.state.springPosition;
            const physicalLength = this.experiment.state.springLength || this.experiment.state.springNaturalLength;
            const visualLength = this.experiment.getVisualLength(physicalLength);
            const hookX = springPos.x;
            const hookY = springPos.y + visualLength;
            
            const distanceToSpring = Math.hypot(canvasX - hookX, canvasY - hookY);
            
            if (distanceToSpring < 100) {
                if (weight.isCompositeDisk) {
                    this.experiment.showToast('⚠️ Диски нельзя подвешивать отдельно! Надевайте диски на штангу.');
                    this.resetDraggablePosition(element, false);
                    return;
                }
                shouldAttachDirectly = true;
            }
        }
        
        if (!shouldAttachDirectly && this.experiment.state.dynamometerAttached) {
            const dynPos = this.experiment.state.dynamometerPosition;
            const hookX = dynPos.x;
            const hookY = dynPos.y + 300 + 23;
            
            const distanceToDynamometer = Math.hypot(canvasX - hookX, canvasY - hookY);
            
            if (distanceToDynamometer < 100) {
                if (weight.isCompositeDisk) {
                    this.experiment.showToast('⚠️ Диски нельзя подвешивать отдельно! Надевайте диски на штангу.');
                    this.resetDraggablePosition(element, false);
                    return;
                }
                shouldAttachDirectly = true;
            }
        }

        if (shouldAttachDirectly) {
            await this.experiment.attachWeight(weight);
            return;
        }

        // TODO: Implement stacking and free placement logic here
        this.resetDraggablePosition(element);
    }

    resetDraggablePosition(element, clearDroppedFlag = true) {
        if (!element) return;
        
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
        
        element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        element.style.transform = '';
        element.style.opacity = '';
        
        element.setAttribute('data-x', 0);
        element.setAttribute('data-y', 0);
        
        if (clearDroppedFlag && element.dataset) {
            delete element.dataset.wasDropped;
        }
        
        setTimeout(() => {
            if (element && element.style) {
                element.style.transition = '';
            }
        }, 300);
    }
}