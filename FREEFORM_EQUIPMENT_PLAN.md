# 🎯 План: Свободное размещение оборудования на Canvas

## 📋 Концепция

Вместо жёсткой логики "перетащил → сразу подвесил", реализовать **свободный режим**:
- Грузы можно класть на canvas в любое место
- Грузы можно соединять между собой (через крючки)
- Собранную "гирлянду" можно подвесить на пружину/динамометр
- Как в настоящей лаборатории!

## 🎨 Визуализация

```
┌─────────────────────────────────────────┐
│  CANVAS (900×600px)                     │
│                                         │
│         🔗 Пружина                      │
│          │                              │
│          │                              │
│          ▼                              │
│      ┌───────┐                          │
│      │ 100г  │  ← Груз 1               │
│      │ 🎯    │                          │
│      └───┬───┘                          │
│          │ крючок                       │
│      ┌───▼───┐                          │
│      │ 100г  │  ← Груз 2               │
│      │ 🎯    │                          │
│      └───┬───┘                          │
│          │                              │
│      ┌───▼───┐                          │
│      │ 100г  │  ← Груз 3               │
│      └───────┘                          │
│                                         │
│    🎯  🎯  🎯  ← Отдельные грузы       │
│   (не подвешены)                        │
└─────────────────────────────────────────┘
```

## 🔧 Техническая реализация

### 1. Новый state для свободных объектов

```javascript
state: {
    // ... существующие поля
    
    // НОВОЕ: свободные объекты на canvas
    freeObjects: [
        {
            id: 'weight-1',
            type: 'weight',
            x: 450,           // позиция на canvas
            y: 300,
            weightId: 100,    // ID веса из inventory
            mass: 100,
            isDragging: false,
            isAttached: false, // false = свободный, true = подвешен
            attachedTo: null,  // null | 'spring' | 'dynamometer' | 'weight-2'
            attachPoint: 'top' // 'top' | 'bottom'
        }
    ],
    
    // Стеки соединённых грузов
    weightStacks: [
        {
            id: 'stack-1',
            weights: ['weight-1', 'weight-2', 'weight-3'],
            topWeight: 'weight-1',    // верхний груз (для подвешивания)
            bottomWeight: 'weight-3', // нижний груз
            totalMass: 300,
            attachedTo: 'spring'      // null | 'spring' | 'dynamometer'
        }
    ]
}
```

### 2. Drop Zones (зоны стыковки)

```javascript
class DropZoneManager {
    constructor(experiment) {
        this.experiment = experiment;
        this.zones = [];
    }
    
    // Создать зоны стыковки для груза
    createWeightZones(weight) {
        return [
            {
                type: 'weight-top',
                targetId: weight.id,
                x: weight.x,
                y: weight.y - 10,      // Над грузом
                radius: 30,
                label: '🔗 Подцепить сверху'
            },
            {
                type: 'weight-bottom',
                targetId: weight.id,
                x: weight.x,
                y: weight.y + weight.height + 10, // Под грузом
                radius: 30,
                label: '🔗 Подцепить снизу'
            }
        ];
    }
    
    // Создать зоны для пружины/динамометра
    createSpringZones(spring) {
        return [
            {
                type: 'spring-hook',
                targetId: 'spring',
                x: spring.x,
                y: spring.y + spring.length,
                radius: 40,
                label: '🔗 Подвесить на пружину'
            }
        ];
    }
    
    // Проверить, находится ли объект в зоне
    checkProximity(object, zones) {
        for (let zone of zones) {
            const distance = Math.hypot(
                object.x - zone.x,
                object.y - zone.y
            );
            
            if (distance < zone.radius) {
                return zone;
            }
        }
        return null;
    }
    
    // Отрисовать зоны (при перетаскивании)
    renderZones(ctx, zones, activeZone = null) {
        zones.forEach(zone => {
            const isActive = zone === activeZone;
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            
            // Пульсирующий эффект для активной зоны
            if (isActive) {
                ctx.fillStyle = 'rgba(0, 255, 150, 0.3)';
                ctx.strokeStyle = '#00ff96';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.setLineDash([2, 2]);
            }
            
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            
            // Иконка
            if (isActive) {
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#00ff96';
                ctx.fillText('🔗', zone.x, zone.y + 7);
            }
        });
    }
}
```

### 3. Drag & Drop для свободных объектов

```javascript
class FreeformDragManager {
    constructor(experiment) {
        this.experiment = experiment;
        this.draggedObject = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dropZoneManager = new DropZoneManager(experiment);
        this.nearestZone = null;
    }
    
    // Начало перетаскивания из инвентаря
    startDragFromInventory(weightId, startX, startY) {
        const weightDef = this.experiment.getWeightById(weightId);
        
        const freeObject = {
            id: `weight-${Date.now()}`,
            type: 'weight',
            x: startX,
            y: startY,
            weightId: weightId,
            mass: weightDef.mass,
            width: weightDef.targetSize,
            height: weightDef.targetSize,
            isDragging: true,
            isAttached: false,
            attachedTo: null
        };
        
        this.experiment.state.freeObjects.push(freeObject);
        this.draggedObject = freeObject;
        
        console.log('[FREEFORM] Started dragging from inventory:', freeObject);
    }
    
    // Перемещение объекта
    onDragMove(canvasX, canvasY) {
        if (!this.draggedObject) return;
        
        this.draggedObject.x = canvasX;
        this.draggedObject.y = canvasY;
        
        // Проверяем зоны стыковки
        const allZones = this.getAllActiveZones();
        this.nearestZone = this.dropZoneManager.checkProximity(
            this.draggedObject,
            allZones
        );
        
        // Перерисовываем canvas
        this.experiment.drawDynamic();
        this.experiment.drawUI();
    }
    
    // Отпускание объекта
    onDragEnd() {
        if (!this.draggedObject) return;
        
        // Если в зоне стыковки - прикрепляем
        if (this.nearestZone) {
            this.attachToZone(this.draggedObject, this.nearestZone);
        }
        
        this.draggedObject.isDragging = false;
        this.draggedObject = null;
        this.nearestZone = null;
        
        this.experiment.drawDynamic();
        this.experiment.drawUI();
    }
    
    // Прикрепить объект к зоне
    attachToZone(object, zone) {
        switch (zone.type) {
            case 'weight-top':
                // Подвесить груз НАД другим грузом
                this.attachWeightToWeight(object, zone.targetId, 'top');
                break;
                
            case 'weight-bottom':
                // Прикрепить груз ПОД другим грузом
                this.attachWeightToWeight(object, zone.targetId, 'bottom');
                break;
                
            case 'spring-hook':
                // Подвесить на пружину
                this.attachToSpring(object);
                break;
                
            case 'dynamometer-hook':
                // Подвесить на динамометр
                this.attachToDynamometer(object);
                break;
        }
    }
    
    // Соединить два груза
    attachWeightToWeight(movingWeight, targetWeightId, position) {
        const targetWeight = this.experiment.state.freeObjects.find(
            w => w.id === targetWeightId
        );
        
        if (!targetWeight) return;
        
        // Создаём или обновляем стек
        let stack = this.findStackContaining(targetWeightId);
        
        if (!stack) {
            // Создаём новый стек
            stack = {
                id: `stack-${Date.now()}`,
                weights: [targetWeightId],
                topWeight: targetWeightId,
                bottomWeight: targetWeightId,
                totalMass: targetWeight.mass
            };
            this.experiment.state.weightStacks.push(stack);
        }
        
        // Добавляем груз в стек
        if (position === 'top') {
            stack.weights.unshift(movingWeight.id);
            stack.topWeight = movingWeight.id;
        } else {
            stack.weights.push(movingWeight.id);
            stack.bottomWeight = movingWeight.id;
        }
        
        stack.totalMass += movingWeight.mass;
        
        // Обновляем позиции грузов в стеке
        this.updateStackPositions(stack);
        
        // Помечаем груз как прикреплённый
        movingWeight.isAttached = true;
        movingWeight.attachedTo = targetWeightId;
        
        console.log('[FREEFORM] Weights stacked:', stack);
        this.experiment.showToast(`✓ Грузы соединены: ${stack.totalMass}г`);
    }
    
    // Обновить позиции грузов в стеке
    updateStackPositions(stack) {
        const weights = stack.weights.map(id => 
            this.experiment.state.freeObjects.find(w => w.id === id)
        );
        
        let currentY = weights[0].y;
        
        for (let i = 0; i < weights.length; i++) {
            const weight = weights[i];
            const weightDef = this.experiment.getWeightById(weight.weightId);
            
            if (i > 0) {
                currentY += weightDef.hookGap || 28;
            }
            
            weight.y = currentY;
            currentY += weight.height;
        }
    }
    
    // Найти стек, содержащий груз
    findStackContaining(weightId) {
        return this.experiment.state.weightStacks.find(
            stack => stack.weights.includes(weightId)
        );
    }
    
    // Получить все активные зоны
    getAllActiveZones() {
        const zones = [];
        
        // Зоны для пружины
        if (this.experiment.state.springAttached) {
            zones.push(...this.dropZoneManager.createSpringZones({
                x: this.experiment.state.springPosition.x,
                y: this.experiment.state.springPosition.y,
                length: this.experiment.state.springLength
            }));
        }
        
        // Зоны для динамометра
        if (this.experiment.state.dynamometerAttached) {
            zones.push(...this.dropZoneManager.createDynamometerZones(
                this.experiment.state.dynamometerPosition
            ));
        }
        
        // Зоны для свободных грузов
        this.experiment.state.freeObjects.forEach(obj => {
            if (obj.type === 'weight' && obj !== this.draggedObject) {
                zones.push(...this.dropZoneManager.createWeightZones(obj));
            }
        });
        
        return zones;
    }
}
```

### 4. Рендеринг свободных объектов

```javascript
drawFreeObjects() {
    const ctx = this.contexts.dynamic;
    
    this.state.freeObjects.forEach(obj => {
        if (obj.type === 'weight') {
            this.drawFreeWeight(ctx, obj);
        }
    });
    
    // Рисуем связи между грузами
    this.state.weightStacks.forEach(stack => {
        this.drawWeightStack(ctx, stack);
    });
}

drawFreeWeight(ctx, weight) {
    const weightDef = this.getWeightById(weight.weightId);
    
    ctx.save();
    
    // Тень
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = weight.isDragging ? 20 : 10;
    ctx.shadowOffsetY = weight.isDragging ? 8 : 4;
    
    // Тело груза
    const gradient = ctx.createLinearGradient(
        weight.x - weight.width/2,
        weight.y,
        weight.x + weight.width/2,
        weight.y
    );
    gradient.addColorStop(0, '#555');
    gradient.addColorStop(0.5, '#888');
    gradient.addColorStop(1, '#555');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(
        weight.x - weight.width/2,
        weight.y,
        weight.width,
        weight.height
    );
    
    // Обводка
    if (weight.isDragging) {
        ctx.strokeStyle = '#00ff96';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            weight.x - weight.width/2,
            weight.y,
            weight.width,
            weight.height
        );
    }
    
    // Крючок сверху
    ctx.fillStyle = '#aaa';
    ctx.fillRect(
        weight.x - 4,
        weight.y - 10,
        8,
        10
    );
    
    // Крючок снизу
    ctx.beginPath();
    ctx.arc(weight.x, weight.y + weight.height + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Надпись с массой
    ctx.shadowBlur = 0;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(
        `${weight.mass}г`,
        weight.x,
        weight.y + weight.height/2 + 6
    );
    
    ctx.restore();
}

drawWeightStack(ctx, stack) {
    const weights = stack.weights.map(id => 
        this.state.freeObjects.find(w => w.id === id)
    );
    
    // Рисуем соединительные линии
    for (let i = 0; i < weights.length - 1; i++) {
        const w1 = weights[i];
        const w2 = weights[i + 1];
        
        ctx.save();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 3]);
        
        ctx.beginPath();
        ctx.moveTo(w1.x, w1.y + w1.height + 5);
        ctx.lineTo(w2.x, w2.y - 10);
        ctx.stroke();
        
        ctx.restore();
    }
}
```

### 5. Интеграция с interact.js

```javascript
setupFreeformDragAndDrop() {
    this.freeformDragManager = new FreeformDragManager(this);
    
    // Drag из инвентаря
    interact('.weight-item').draggable({
        listeners: {
            start: (event) => {
                const weightId = parseInt(event.target.dataset.weightId);
                const rect = this.canvases.dynamic.getBoundingClientRect();
                
                this.freeformDragManager.startDragFromInventory(
                    weightId,
                    event.clientX - rect.left,
                    event.clientY - rect.top
                );
            },
            move: (event) => {
                const rect = this.canvases.dynamic.getBoundingClientRect();
                this.freeformDragManager.onDragMove(
                    event.clientX - rect.left,
                    event.clientY - rect.top
                );
            },
            end: () => {
                this.freeformDragManager.onDragEnd();
            }
        }
    });
    
    // Drag уже размещённых объектов на canvas
    this.canvases.dynamic.addEventListener('mousedown', (e) => {
        const rect = this.canvases.dynamic.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Найти объект под курсором
        const clicked = this.findObjectAtPoint(x, y);
        
        if (clicked && !clicked.isAttached) {
            this.freeformDragManager.draggedObject = clicked;
            clicked.isDragging = true;
        }
    });
    
    this.canvases.dynamic.addEventListener('mousemove', (e) => {
        if (this.freeformDragManager.draggedObject) {
            const rect = this.canvases.dynamic.getBoundingClientRect();
            this.freeformDragManager.onDragMove(
                e.clientX - rect.left,
                e.clientY - rect.top
            );
        }
    });
    
    this.canvases.dynamic.addEventListener('mouseup', () => {
        if (this.freeformDragManager.draggedObject) {
            this.freeformDragManager.onDragEnd();
        }
    });
}

findObjectAtPoint(x, y) {
    // Ищем в обратном порядке (верхние объекты первыми)
    for (let i = this.state.freeObjects.length - 1; i >= 0; i--) {
        const obj = this.state.freeObjects[i];
        
        if (x >= obj.x - obj.width/2 &&
            x <= obj.x + obj.width/2 &&
            y >= obj.y &&
            y <= obj.y + obj.height) {
            return obj;
        }
    }
    
    return null;
}
```

## 🎮 UX Features

### 1. Визуальные подсказки
```javascript
// При приближении к зоне стыковки
- Зона подсвечивается зелёным
- Появляется иконка 🔗
- Показывается tooltip "Отпустите, чтобы подцепить"

// При перетаскивании
- Тень под объектом
- Курсор меняется на 'grabbing'
- Объект слегка увеличивается (scale: 1.05)
```

### 2. Snap-to-zone
```javascript
// Магнитное притяжение при приближении
if (distance < zone.radius) {
    // Плавное притяжение к центру зоны
    const snapStrength = 0.3;
    object.x += (zone.x - object.x) * snapStrength;
    object.y += (zone.y - object.y) * snapStrength;
}
```

### 3. Контекстное меню
```javascript
// ПКМ на свободном объекте
contextMenu = [
    '🔗 Соединить с...',
    '📏 Измерить массу',
    '🗑️ Убрать с canvas',
    '↩️ Вернуть в инвентарь'
];
```

## 📊 Обновление логики измерений

```javascript
// Теперь измерения работают со стеками
recordMeasurementDirect() {
    // Находим подвешенный стек
    const stack = this.state.weightStacks.find(
        s => s.attachedTo === 'spring'
    );
    
    if (!stack) {
        this.showHint('Сначала подвесьте грузы на пружину!');
        return;
    }
    
    const totalMass = stack.totalMass;
    const force = (totalMass / 1000) * this.physics.gravity;
    const elongationCm = this.state.springElongation / this.physics.pixelsPerCm;
    
    const measurement = {
        id: Date.now(),
        number: this.state.measurements.length + 1,
        weightCount: stack.weights.length,
        mass: totalMass,
        force: force,
        elongationCm: elongationCm,
        stiffness: force / (elongationCm / 100)
    };
    
    this.state.measurements.push(measurement);
    this.renderMeasurementsTable();
    this.showToast(`✓ Записано: ${stack.weights.length} груз(а) → k=${measurement.stiffness.toFixed(1)} Н/м`);
}
```

## ✅ Преимущества

1. **Реалистичность** - как в настоящей лаборатории
2. **Гибкость** - можно экспериментировать с разными комбинациями
3. **Понятность** - видно, что с чем соединено
4. **Обучающий эффект** - студент понимает, как собирается установка

## 🚀 Этапы внедрения

### Фаза 1 (минимум):
- ✅ Свободное размещение грузов на canvas
- ✅ Соединение двух грузов
- ✅ Подвешивание на пружину

### Фаза 2 (расширенная):
- Drop zones с визуализацией
- Snap-to-zone (магнитное притяжение)
- Перетаскивание уже размещённых объектов

### Фаза 3 (продвинутая):
- Контекстное меню (ПКМ)
- Разборка стеков
- Анимация соединения
- Физика столкновений

Хотите начать с реализации? Могу добавить базовую функциональность прямо сейчас!
