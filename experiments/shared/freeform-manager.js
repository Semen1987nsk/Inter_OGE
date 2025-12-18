/**
 * Менеджер свободного размещения оборудования на canvas
 * Позволяет размещать грузы в любом месте, соединять их и подвешивать на пружину/динамометр
 */

class DropZone {
    constructor(config) {
        this.type = config.type;           // 'weight-top', 'weight-bottom', 'spring-hook', 'dynamometer-hook'
        this.targetId = config.targetId;   // ID объекта, к которому прикрепляемся
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius || 35;
        this.label = config.label || '';
        this.isActive = false;
    }
    
    contains(x, y) {
        const distance = Math.hypot(x - this.x, y - this.y);
        return distance < this.radius;
    }
    
    render(ctx, isNearby = false) {
        ctx.save();
        
        // Пульсирующий эффект для активной зоны
        const pulse = isNearby ? Math.sin(Date.now() / 150) * 0.3 + 1.1 : 1; // Усиленная пульсация
        const radius = this.radius * pulse;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        
        if (isNearby) {
            // Активная зона - яркая и заметная (SNAP FEEDBACK)
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
            gradient.addColorStop(0, 'rgba(50, 255, 100, 0.6)'); // Более насыщенный зеленый
            gradient.addColorStop(1, 'rgba(50, 255, 100, 0.2)');
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.strokeStyle = '#32ff64';
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 3]);
            ctx.stroke();
            
            // Иконка крючка
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#32ff64';
            ctx.shadowBlur = 15;
            ctx.fillText('⚓', this.x, this.y); // Якорь вместо цепи для разнообразия
        } else {
            // Неактивная зона - полупрозрачная
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

class FreeObject {
    constructor(config) {
        this.id = config.id || `obj-${Date.now()}`;
        this.type = config.type;           // 'weight', 'spring', 'dynamometer'
        this.x = config.x;
        this.y = config.y;
        this.width = config.width;
        this.height = config.height;
        this.isDragging = false;
        this.isAttached = false;           // Прикреплён ли к чему-то
        this.attachedTo = null;            // ID объекта, к которому прикреплён
        this.attachPoint = null;           // 'top' | 'bottom'
        
        // Специфичные поля для грузов
        if (this.type === 'weight') {
            this.weightId = config.weightId;
            this.mass = config.mass;
        }
    }
    
    contains(x, y) {
        return x >= this.x - this.width/2 &&
               x <= this.x + this.width/2 &&
               y >= this.y &&
               y <= this.y + this.height;
    }
    
    getBounds() {
        return {
            left: this.x - this.width/2,
            right: this.x + this.width/2,
            top: this.y,
            bottom: this.y + this.height,
            centerX: this.x,
            centerY: this.y + this.height/2
        };
    }
    
    getTopHookPosition() {
        return { x: this.x, y: this.y - 10 };
    }
    
    getBottomHookPosition() {
        return { x: this.x, y: this.y + this.height + 5 };
    }
}

class WeightStack {
    constructor(id) {
        this.id = id || `stack-${Date.now()}`;
        this.weights = [];                 // Массив ID грузов (сверху вниз)
        this.totalMass = 0;
        this.attachedTo = null;            // 'spring' | 'dynamometer' | null
        this.x = 0;
        this.y = 0;
    }
    
    addWeight(weight, position = 'bottom') {
        if (position === 'top') {
            this.weights.unshift(weight.id);
        } else {
            this.weights.push(weight.id);
        }
        this.totalMass += weight.mass;
    }
    
    removeWeight(weightId) {
        const index = this.weights.indexOf(weightId);
        if (index !== -1) {
            this.weights.splice(index, 1);
        }
    }
    
    getTopWeight() {
        return this.weights[0];
    }
    
    getBottomWeight() {
        return this.weights[this.weights.length - 1];
    }
    
    isEmpty() {
        return this.weights.length === 0;
    }
}

export class FreeformManager {
    constructor(experiment) {
        this.experiment = experiment;
        this.freeObjects = [];             // Все свободные объекты на canvas
        this.weightStacks = [];            // Стеки соединённых грузов
        this.dropZones = [];               // Зоны для стыковки
        this.draggedObject = null;         // Текущий перетаскиваемый объект
        this.nearestZone = null;           // Ближайшая зона стыковки
        this.snapDistance = 50;            // Расстояние для автоматической стыковки
        
        this.setupEventListeners();
        
        console.log('[FREEFORM] Manager initialized');
    }
    
    // ═══════════════════════════════════════════════════════════
    //  DRAG & DROP
    // ═══════════════════════════════════════════════════════════
    
    setupEventListeners() {
        const canvas = this.experiment.canvases.dynamic;
        
        // Mouse events на canvas
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Touch events для мобильных
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        console.log('[FREEFORM] Event listeners setup');
    }
    
    onMouseDown(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Проверяем, кликнули ли на свободный объект
        const obj = this.findObjectAt(x, y);
        
        if (obj && !obj.isAttached) {
            this.startDrag(obj, x, y);
            e.preventDefault();
        }
    }
    
    onMouseMove(e) {
        if (!this.draggedObject) return;
        
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.updateDrag(x, y);
        e.preventDefault();
    }
    
    onMouseUp(e) {
        if (!this.draggedObject) return;
        
        this.endDrag();
        e.preventDefault();
    }
    
    onTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        const rect = e.target.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const obj = this.findObjectAt(x, y);
        if (obj && !obj.isAttached) {
            this.startDrag(obj, x, y);
            e.preventDefault();
        }
    }
    
    onTouchMove(e) {
        if (!this.draggedObject || e.touches.length !== 1) return;
        
        const rect = e.target.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.updateDrag(x, y);
        e.preventDefault();
    }
    
    onTouchEnd(e) {
        if (!this.draggedObject) return;
        
        this.endDrag();
        e.preventDefault();
    }
    
    startDrag(obj, x, y) {
        this.draggedObject = obj;
        obj.isDragging = true;
        obj.dragOffsetX = x - obj.x;
        obj.dragOffsetY = y - obj.y;
        
        // Генерируем зоны стыковки
        this.updateDropZones();
        
        console.log('[FREEFORM] Started dragging:', obj.id);
    }
    
    updateDrag(x, y) {
        if (!this.draggedObject) return;
        
        // Обновляем позицию объекта
        this.draggedObject.x = x - this.draggedObject.dragOffsetX;
        this.draggedObject.y = y - this.draggedObject.dragOffsetY;
        
        // Проверяем близость к зонам стыковки
        this.nearestZone = this.findNearestZone(this.draggedObject);
        
        // Магнитное притяжение к зоне
        if (this.nearestZone) {
            const snapStrength = 0.3;
            this.draggedObject.x += (this.nearestZone.x - this.draggedObject.x) * snapStrength;
            this.draggedObject.y += (this.nearestZone.y - this.draggedObject.y) * snapStrength;
        }
        
        // Перерисовываем canvas
        this.experiment.drawDynamic();
        this.experiment.drawUI();
    }
    
    endDrag() {
        if (!this.draggedObject) return;
        
        // Если в зоне стыковки - прикрепляем
        if (this.nearestZone) {
            this.attachToZone(this.draggedObject, this.nearestZone);
        }
        
        this.draggedObject.isDragging = false;
        this.draggedObject = null;
        this.nearestZone = null;
        this.dropZones = [];
        
        // Финальная перерисовка
        this.experiment.drawDynamic();
        this.experiment.drawUI();
        
        console.log('[FREEFORM] Drag ended');
    }
    
    // ═══════════════════════════════════════════════════════════
    //  DROP ZONES
    // ═══════════════════════════════════════════════════════════
    
    updateDropZones() {
        this.dropZones = [];
        
        // Зоны для пружины
        if (this.experiment.state.springAttached && !this.experiment.state.attachedWeights.length) {
            const springPos = this.experiment.state.springPosition;
            const springLength = this.experiment.state.springLength;
            
            this.dropZones.push(new DropZone({
                type: 'spring-hook',
                targetId: 'spring',
                x: springPos.x,
                y: springPos.y + springLength,
                radius: 40,
                label: '🔗 Подвесить на пружину'
            }));
        }
        
        // Зоны для динамометра
        if (this.experiment.state.dynamometerAttached && !this.experiment.state.attachedWeights.length) {
            const dynamPos = this.experiment.state.dynamometerPosition;
            
            this.dropZones.push(new DropZone({
                type: 'dynamometer-hook',
                targetId: 'dynamometer',
                x: dynamPos.x,
                y: dynamPos.y + 150,
                radius: 40,
                label: '🔗 Подвесить на динамометр'
            }));
        }
        
        // Зоны для свободных грузов
        this.freeObjects.forEach(obj => {
            if (obj.type === 'weight' && obj !== this.draggedObject && !obj.isAttached) {
                // Зона сверху
                const topPos = obj.getTopHookPosition();
                this.dropZones.push(new DropZone({
                    type: 'weight-top',
                    targetId: obj.id,
                    x: topPos.x,
                    y: topPos.y,
                    radius: 30,
                    label: '🔗 Подцепить сверху'
                }));
                
                // Зона снизу
                const bottomPos = obj.getBottomHookPosition();
                this.dropZones.push(new DropZone({
                    type: 'weight-bottom',
                    targetId: obj.id,
                    x: bottomPos.x,
                    y: bottomPos.y,
                    radius: 30,
                    label: '🔗 Подцепить снизу'
                }));
            }
        });
    }
    
    findNearestZone(obj) {
        let nearest = null;
        let minDistance = this.snapDistance;
        
        for (let zone of this.dropZones) {
            const distance = Math.hypot(obj.x - zone.x, obj.y - zone.y);
            if (distance < minDistance) {
                nearest = zone;
                minDistance = distance;
            }
        }
        
        return nearest;
    }
    
    // ═══════════════════════════════════════════════════════════
    //  ATTACHMENT LOGIC
    // ═══════════════════════════════════════════════════════════
    
    attachToZone(obj, zone) {
        console.log('[FREEFORM] Attaching', obj.id, 'to zone', zone.type, zone.targetId);
        
        switch (zone.type) {
            case 'weight-top':
                this.attachWeightToWeight(obj, zone.targetId, 'top');
                break;
                
            case 'weight-bottom':
                this.attachWeightToWeight(obj, zone.targetId, 'bottom');
                break;
                
            case 'spring-hook':
                this.attachToSpring(obj);
                break;
                
            case 'dynamometer-hook':
                this.attachToDynamometer(obj);
                break;
        }
    }
    
    attachWeightToWeight(movingWeight, targetWeightId, position) {
        const targetWeight = this.findObjectById(targetWeightId);
        if (!targetWeight) return;
        
        console.log('[FREEFORM] Attaching weight', movingWeight.id, position, 'of', targetWeightId);
        
        // Ищем существующий стек с target весом
        let stack = this.findStackContaining(targetWeightId);
        
        if (!stack) {
            // Создаём новый стек
            stack = new WeightStack();
            stack.addWeight(targetWeight);
            this.weightStacks.push(stack);
            
            // Помечаем target вес как прикреплённый (к стеку)
            targetWeight.isAttached = true;
            targetWeight.attachedTo = stack.id;
        }
        
        // Добавляем движущийся груз в стек
        stack.addWeight(movingWeight, position);
        
        // Помечаем движущийся груз как прикреплённый
        movingWeight.isAttached = true;
        movingWeight.attachedTo = stack.id;
        movingWeight.attachPoint = position;
        
        // Обновляем позиции всех грузов в стеке
        this.updateStackPositions(stack);
        
        // Партиклы и звук
        this.experiment.particleSystem?.createSuccess(zone.x, zone.y);
        this.experiment.showToast(`✓ Грузы соединены: ${stack.totalMass}г`);
        
        console.log('[FREEFORM] Stack updated:', stack);
    }
    
    attachToSpring(obj) {
        // Если это груз
        if (obj.type === 'weight') {
            // Проверяем, входит ли груз в стек
            const stack = this.findStackContaining(obj.id);
            
            if (stack) {
                // Подвешиваем весь стек
                stack.attachedTo = 'spring';
                
                // Обновляем state эксперимента
                this.experiment.state.attachedWeights = stack.weights.map(wId => {
                    const weight = this.findObjectById(wId);
                    return {
                        id: weight.weightId,
                        mass: weight.mass
                    };
                });
                
                console.log('[FREEFORM] Stack attached to spring:', stack.weights.length, 'weights');
            } else {
                // Одиночный груз
                obj.isAttached = true;
                obj.attachedTo = 'spring';
                
                this.experiment.state.attachedWeights = [{
                    id: obj.weightId,
                    mass: obj.mass
                }];
                
                console.log('[FREEFORM] Single weight attached to spring');
            }
            
            // Запускаем анимацию растяжения пружины
            this.experiment.attachWeight({ id: obj.weightId, mass: obj.mass });
            
            this.experiment.showToast(`✓ Груз подвешен на пружину`);
        }
    }
    
    attachToDynamometer(obj) {
        if (obj.type === 'weight') {
            const stack = this.findStackContaining(obj.id);
            
            if (stack) {
                stack.attachedTo = 'dynamometer';
                
                this.experiment.state.attachedWeights = stack.weights.map(wId => {
                    const weight = this.findObjectById(wId);
                    return {
                        id: weight.weightId,
                        mass: weight.mass
                    };
                });
            } else {
                obj.isAttached = true;
                obj.attachedTo = 'dynamometer';
                
                this.experiment.state.attachedWeights = [{
                    id: obj.weightId,
                    mass: obj.mass
                }];
            }
            
            // Обновляем показание динамометра
            this.experiment.attachWeight({ id: obj.weightId, mass: obj.mass });
            
            this.experiment.showToast(`✓ Груз подвешен на динамометр`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    //  STACK MANAGEMENT
    // ═══════════════════════════════════════════════════════════
    
    updateStackPositions(stack) {
        const weights = stack.weights.map(id => this.findObjectById(id));
        if (weights.length === 0) return;
        
        // Первый груз задаёт X координату для всех
        const baseX = weights[0].x;
        let currentY = weights[0].y;
        
        for (let i = 0; i < weights.length; i++) {
            const weight = weights[i];
            const weightDef = this.experiment.getWeightById(weight.weightId);
            
            weight.x = baseX;
            weight.y = currentY;
            
            if (i < weights.length - 1) {
                // Зазор между грузами (крючок)
                currentY += weight.height + (weightDef?.hookGap || 28);
            }
        }
        
        // Обновляем позицию стека
        stack.x = baseX;
        stack.y = weights[0].y;
    }
    
    findStackContaining(weightId) {
        return this.weightStacks.find(stack => 
            stack.weights.includes(weightId)
        );
    }
    
    removeFromStack(weightId) {
        const stack = this.findStackContaining(weightId);
        if (!stack) return;
        
        stack.removeWeight(weightId);
        
        // Если стек пустой - удаляем его
        if (stack.isEmpty()) {
            const index = this.weightStacks.indexOf(stack);
            this.weightStacks.splice(index, 1);
        } else {
            // Пересчитываем позиции
            this.updateStackPositions(stack);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    //  ADDING OBJECTS FROM INVENTORY
    // ═══════════════════════════════════════════════════════════
    
    addWeightFromInventory(weightId, canvasX, canvasY) {
        const weightDef = this.experiment.getWeightById(weightId);
        if (!weightDef) return null;
        
        const freeWeight = new FreeObject({
            id: `weight-${Date.now()}`,
            type: 'weight',
            x: canvasX,
            y: canvasY,
            width: weightDef.targetSize || 88,
            height: weightDef.targetSize || 88,
            weightId: weightId,
            mass: weightDef.mass
        });
        
        this.freeObjects.push(freeWeight);
        
        console.log('[FREEFORM] Added weight from inventory:', freeWeight.id);
        
        return freeWeight;
    }
    
    // ═══════════════════════════════════════════════════════════
    //  FINDING & UTILITIES
    // ═══════════════════════════════════════════════════════════
    
    findObjectAt(x, y) {
        // Ищем в обратном порядке (верхние объекты первыми)
        for (let i = this.freeObjects.length - 1; i >= 0; i--) {
            const obj = this.freeObjects[i];
            if (obj.contains(x, y)) {
                return obj;
            }
        }
        return null;
    }
    
    findObjectById(id) {
        return this.freeObjects.find(obj => obj.id === id);
    }
    
    removeObject(id) {
        const index = this.freeObjects.findIndex(obj => obj.id === id);
        if (index !== -1) {
            const obj = this.freeObjects[index];
            
            // Удаляем из стека, если был в нём
            if (obj.isAttached) {
                this.removeFromStack(id);
            }
            
            this.freeObjects.splice(index, 1);
            console.log('[FREEFORM] Removed object:', id);
        }
    }
    
    clear() {
        this.freeObjects = [];
        this.weightStacks = [];
        this.dropZones = [];
        this.draggedObject = null;
        this.nearestZone = null;
        
        console.log('[FREEFORM] Cleared all objects');
    }
    
    // ═══════════════════════════════════════════════════════════
    //  RENDERING
    // ═══════════════════════════════════════════════════════════
    
    render(ctx) {
        // Рисуем drop zones (если что-то перетаскивается)
        if (this.draggedObject) {
            this.dropZones.forEach(zone => {
                zone.render(ctx, zone === this.nearestZone);
            });
        }
        
        // Рисуем связи между грузами в стеках
        this.weightStacks.forEach(stack => {
            this.renderStack(ctx, stack);
        });
        
        // Рисуем свободные объекты
        this.freeObjects.forEach(obj => {
            if (obj.type === 'weight') {
                this.renderWeight(ctx, obj);
            }
        });
    }
    
    renderWeight(ctx, weight) {
        const weightDef = this.experiment.getWeightById(weight.weightId);
        
        ctx.save();
        
        // Тень
        if (!weight.isAttached) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = weight.isDragging ? 20 : 10;
            ctx.shadowOffsetY = weight.isDragging ? 10 : 5;
        }
        
        // Масштабирование при перетаскивании
        const scale = weight.isDragging ? 1.05 : 1;
        const w = weight.width * scale;
        const h = weight.height * scale;
        
        // Тело груза (реалистичный металл)
        const gradient = ctx.createLinearGradient(
            weight.x - w/2, weight.y,
            weight.x + w/2, weight.y
        );
        gradient.addColorStop(0, '#505050');
        gradient.addColorStop(0.5, '#888888');
        gradient.addColorStop(1, '#505050');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(weight.x - w/2, weight.y, w, h);
        
        // Обводка
        if (weight.isDragging) {
            ctx.strokeStyle = '#00ff96';
            ctx.lineWidth = 3;
            ctx.strokeRect(weight.x - w/2, weight.y, w, h);
        } else {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(weight.x - w/2, weight.y, w, h);
        }
        
        // Крючок сверху
        ctx.fillStyle = '#aaa';
        ctx.fillRect(weight.x - 5, weight.y - 12, 10, 12);
        ctx.beginPath();
        ctx.arc(weight.x, weight.y - 12, 6, 0, Math.PI, true);
        ctx.fill();
        
        // Крючок снизу
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(weight.x, weight.y + h + 8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Внутренний круг крючка
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(weight.x, weight.y + h + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Надпись с массой
        ctx.shadowBlur = 0;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${weight.mass}г`, weight.x, weight.y + h/2);
        
        ctx.restore();
    }
    
    renderStack(ctx, stack) {
        const weights = stack.weights.map(id => this.findObjectById(id)).filter(Boolean);
        if (weights.length < 2) return;
        
        ctx.save();
        
        // Рисуем соединительные линии между грузами
        for (let i = 0; i < weights.length - 1; i++) {
            const w1 = weights[i];
            const w2 = weights[i + 1];
            
            const y1 = w1.y + w1.height + 8;
            const y2 = w2.y - 12;
            
            // Цепь/трос
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(w1.x, y1);
            ctx.lineTo(w2.x, y2);
            ctx.stroke();
            
            // Штриховка для имитации звеньев
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            const steps = Math.floor((y2 - y1) / 10);
            for (let j = 0; j < steps; j++) {
                const y = y1 + (y2 - y1) * (j / steps);
                ctx.beginPath();
                ctx.moveTo(w1.x - 3, y);
                ctx.lineTo(w1.x + 3, y);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
}
