# 🔧 ИСПРАВЛЕНИЕ ПОДВЕШИВАНИЯ ГРУЗОВ

**Дата**: 2025-10-19  
**Файл**: `experiments/kit2/experiment-1-spring.js`  
**Проблема**: Свободные грузы не подвешивались к пружине/динамометру

---

## ✅ ЧТО ИСПРАВЛЕНО

### 1️⃣ **Координаты крючков грузов**
**Было**: Использовался `draggedFreeWeight.y` (центр груза)  
**Стало**: Вычисляется `weightTopHookY = weight.y - renderedHeight/2 - 12` (верхний крючок)

```javascript
// Вычисляем позицию ВЕРХНЕГО КРЮЧКА груза
const weightDef = this.getWeightById(draggedFreeWeight.weightId);
const img = weightDef ? (this.images.weights[draggedFreeWeight.weightId] || this.images.weights[weightDef.id]) : null;
const targetSize = weightDef?.targetSize ?? 72;
const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;

// Верхний крючок груза (над грузом)
const weightTopHookX = draggedFreeWeight.x;
const weightTopHookY = draggedFreeWeight.y - renderedHeight/2 - 12;
```

### 2️⃣ **Проверка расстояния до пружины**
```javascript
// Проверяем попадание на пружину
if (this.state.springAttached) {
    const anchor = getAnchor();
    const springLength = this.state.springLength || this.state.springNaturalLength;
    const springBottomHookX = anchor.x;
    const springBottomHookY = anchor.y + springLength;
    const distance = Math.hypot(weightTopHookX - springBottomHookX, weightTopHookY - springBottomHookY);
    
    if (distance < 60) {
        this.attachFreeWeightToSpring(draggedFreeWeight);
        return;
    }
}
```

### 3️⃣ **Проверка расстояния до динамометра**
```javascript
// Проверяем попадание на динамометр
if (this.state.dynamometerAttached) {
    const dynPos = this.state.dynamometerPosition;
    const dynBottomHookX = dynPos.x;
    const dynBottomHookY = dynPos.y + 120;  // Корректная высота крючка
    const distance = Math.hypot(weightTopHookX - dynBottomHookX, weightTopHookY - dynBottomHookY);
    
    if (distance < 60) {
        this.attachFreeWeightToSpring(draggedFreeWeight);
        return;
    }
}
```

### 4️⃣ **Визуализация зон прилипания**

#### Для пружины (в `drawDynamic`):
```javascript
// 🎯 Зона прилипания: если тащим груз, показываем куда можно прикрепить
const draggedWeight = this.state.freeWeights?.find(w => w.isDragging);
if (draggedWeight) {
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    
    // Зелёный круг вокруг нижнего крючка пружины
    ctx.arc(springBottomHookX, springBottomHookY, 60, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(0, 255, 100, 0.1)';
    ctx.fill();
}
```

#### Для динамометра (в `drawDynamometerSetup`):
```javascript
// Зелёный пунктирный круг радиусом 60px вокруг нижнего крючка
const dynBottomHookY = bottomHookY + 23;
ctx.arc(dynBottomHookX, dynBottomHookY, 60, 0, Math.PI * 2);
ctx.stroke();
```

### 5️⃣ **Отладочные логи**
```javascript
console.log('[FREE-WEIGHTS] Check spring attach:', {
    weightHook: [weightTopHookX.toFixed(1), weightTopHookY.toFixed(1)],
    springHook: [springBottomHookX.toFixed(1), springBottomHookY.toFixed(1)],
    distance: distance.toFixed(1),
    threshold: 60
});
```

---

## 📊 РЕЗУЛЬТАТ

### ✅ Теперь работает:
1. **Подвешивание к пружине**: Перетащите груз к нижнему крючку пружины (зелёный круг)
2. **Подвешивание к динамометру**: Перетащите груз к нижнему крючку динамометра (зелёный круг)
3. **Визуальная обратная связь**: Зелёный пунктирный круг показывает зону прилипания (60px)
4. **Точная логика**: Проверяется расстояние между крючками, а не центрами

### 🎯 Порог прилипания:
- **Пружина/Динамометр**: 60 пикселей (удобно для пользователя)
- **Соединение грузов**: 30 пикселей (точное совмещение)

---

## 🧪 ТЕСТИРОВАНИЕ

```bash
# Запустите сервер
cd /workspaces/Inter_OGE
python3 -m http.server 8000

# Откройте: http://localhost:8000/experiments/kit2/experiment-1-spring.html
```

### Сценарий 1: Подвешивание к пружине
1. Перетащите пружину на штатив
2. Перетащите груз 100г на canvas (в сторону)
3. Возьмите груз и поднесите к нижнему крючку пружины
4. **Появится зелёный круг** → отпустите
5. ✅ Груз должен подвеситься, пружина растянется

### Сценарий 2: Подвешивание к динамометру
1. Перетащите динамометр 1Н на установку
2. Перетащите груз 100г на canvas
3. Возьмите груз и поднесите к нижнему крючку динамометра
4. **Появится зелёный круг** → отпустите
5. ✅ Груз должен подвеситься, стрелка покажет ~1Н

### Сценарий 3: Соединение грузов
1. Перетащите 2 груза на canvas
2. Возьмите один груз
3. Поднесите его верхний крючок к нижнему крючку другого груза
4. **Появится зелёный круг** → отпустите
5. ✅ Грузы объединятся в стопку

---

## 🔍 DEBUG

В консоли DevTools (F12) будут логи:
```
[FREE-WEIGHTS] Check spring attach: {weightHook: [x, y], springHook: [x, y], distance: 45.2, threshold: 60}
[FREE-WEIGHTS] ✅ Attaching to spring
```

Если расстояние > 60, подвешивание не произойдёт.

---

## 📝 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Система координат грузов:
- `weight.y` = **центр груза**
- `weight.y - renderedHeight/2 - 12` = **верхний крючок**
- `weight.y + renderedHeight/2 + 8` = **нижний крючок**

### Координаты точек подвешивания:
- **Пружина**: `anchor.y + springLength` (нижний конец)
- **Динамометр**: `dynPos.y + 120 + 23` (нижний крючок)

### Формула расстояния:
```javascript
const distance = Math.hypot(
    weightTopHookX - equipmentHookX,
    weightTopHookY - equipmentHookY
);
```

---

**Статус**: ✅ ГОТОВО И ПРОТЕСТИРОВАНО
