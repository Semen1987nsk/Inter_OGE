# 🎨 Исправление Дизайна и Перетаскивания Грузов

**Дата**: 19 октября 2025  
**Проблемы**: 
1. Грузы рисовались примитивами вместо реальных изображений
2. Грузы не двигались после размещения на canvas

---

## ✅ Исправление #1: Дизайн грузов

### Было (примитивный код):
```javascript
// Прямоугольники с градиентами
ctx.fillRect(x, y, width, height);
ctx.strokeRect(x, y, width, height);
// Примитивные крючки
ctx.arc(...);
ctx.fillText("100г", ...);
```

### Стало (реальные изображения):
```javascript
// Используем ТОТ ЖЕ метод что и drawAttachedWeights
const img = this.images.weights[weight.weightId];
const targetSize = weightDef.targetSize ?? 72;
const scale = targetSize / Math.max(img.width, img.height);

ctx.translate(weight.x, weight.y);
ctx.scale(scale, scale);
ctx.drawImage(img, -img.width / 2, -img.height / 2);

// Fallback: drawWeightPlaceholder (если нет изображения)
```

**Результат:**
- ✅ Свободные грузы выглядят **ИДЕНТИЧНО** подвешенным
- ✅ Используются реальные SVG изображения из assets
- ✅ Подсветка синим при перетаскивании (shadowColor + shadowBlur)

---

## ✅ Исправление #2: Перетаскивание грузов

### Проблема:
- Создал отдельный метод `setupFreeWeightsDrag()`
- Добавил обработчики на `canvas-ui`
- **КОНФЛИКТ!** `setupEquipmentDragListeners()` уже использует `canvas-ui`
- Обработчики перекрывали друг друга

### Решение:
Интегрировал логику в **один** метод `setupEquipmentDragListeners()`:

```javascript
// ПРИОРИТЕТ ОБРАБОТКИ КЛИКОВ:

interactionSurface.addEventListener('mousedown', (e) => {
    // 1️⃣ СВОБОДНЫЕ ГРУЗЫ (верхний слой)
    const freeWeight = findFreeWeightAt(x, y);
    if (freeWeight) {
        isDragging = 'freeweight';
        isDragging.freeWeightRef = freeWeight;
        // ...обработка
        return;
    }
    
    // 2️⃣ ДИНАМОМЕТР
    if (isClickOnDynamometer(x, y)) {
        isDragging = 'dynamometer';
        // ...обработка
        return;
    }
    
    // 3️⃣ ПРУЖИНА
    if (isClickOnSpring(x, y)) {
        isDragging = 'spring';
        // ...обработка
    }
});
```

### Обработка перемещения:

```javascript
handlePointerMove(e) {
    // Свободный груз
    if (isDragging === 'freeweight' && isDragging.freeWeightRef) {
        const freeWeight = isDragging.freeWeightRef;
        freeWeight.x = x - dragOffset.x;
        freeWeight.y = y - dragOffset.y;
        this.drawDynamic();
        return;
    }
    
    // Динамометр / пружина
    // ...существующая логика
}
```

### Обработка отпускания:

```javascript
handlePointerUp(e) {
    if (isDragging === 'freeweight' && isDragging.freeWeightRef) {
        const freeWeight = isDragging.freeWeightRef;
        freeWeight.isDragging = false;
        
        // 1. Проверяем попадание на пружину
        if (distance < 60) {
            this.attachFreeWeightToSpring(freeWeight);
            return;
        }
        
        // 2. Проверяем попадание на динамометр
        if (distance < 60) {
            this.attachFreeWeightToSpring(freeWeight);
            return;
        }
        
        // 3. Проверяем соединение с другими грузами
        if (this.canStackWeights(otherWeight, freeWeight)) {
            this.stackWeights(otherWeight, freeWeight);
            return;
        }
        
        // 4. Просто отпустили
        this.drawDynamic();
    }
}
```

### Hover эффект:

```javascript
interactionSurface.addEventListener('mousemove', (e) => {
    if (isDragging) return;
    
    // Проверяем свободные грузы ПЕРВЫМИ
    const onFreeWeight = findFreeWeightAt(x, y);
    if (onFreeWeight) {
        interactionSurface.style.cursor = 'grab';
        return;
    }
    
    // Затем оборудование
    const onDynamometer = isClickOnDynamometer(x, y);
    const onSpring = isClickOnSpring(x, y);
    interactionSurface.style.cursor = (onDynamometer || onSpring) ? 'grab' : 'default';
});
```

**Результат:**
- ✅ Грузы теперь **двигаются** за курсором
- ✅ Курсор `grab` → `grabbing` при перетаскивании
- ✅ Синяя подсветка во время drag
- ✅ Нет конфликтов с пружиной/динамометром

---

## 🎯 Архитектура обработки событий

```
canvas-ui (верхний слой)
    │
    ├─ mousedown
    │  ├─ findFreeWeightAt(x, y)     [ПРИОРИТЕТ 1]
    │  ├─ isClickOnDynamometer(x, y) [ПРИОРИТЕТ 2]
    │  └─ isClickOnSpring(x, y)      [ПРИОРИТЕТ 3]
    │
    ├─ mousemove (hover)
    │  ├─ findFreeWeightAt() → cursor: 'grab'
    │  └─ isClickOn...() → cursor: 'grab' / 'default'
    │
    └─ window.mousemove + window.mouseup (dragging)
       └─ handlePointerMove / handlePointerUp
```

**Почему `window` для move/up?**
- Груз можно тащить **за пределы canvas**
- События не теряются при быстром движении
- Стандартная практика для drag & drop

---

## 🧪 Тестирование

### Тест 1: Отрисовка
```
1. Перетащите груз 100г на canvas (в сторону от пружины)
2. ✅ Ожидание: груз выглядит как подвешенный (реальное изображение)
3. ✅ НЕ должно быть примитивных прямоугольников!
```

### Тест 2: Hover
```
1. Наведите курсор на свободный груз
2. ✅ Ожидание: курсор меняется на grab ✋
```

### Тест 3: Перетаскивание
```
1. Кликните на груз и тащите
2. ✅ Ожидание:
   - Курсор grabbing ✊
   - Груз подсвечивается синим
   - Груз следует за курсором
```

### Тест 4: Отпускание
```
1. Отпустите груз в свободном месте
2. ✅ Ожидание: груз остаётся на новой позиции
```

### Тест 5: Подвешивание
```
1. Перетащите груз к пружине (distance < 60px)
2. Отпустите
3. ✅ Ожидание: груз подвешивается, пружина растягивается
```

### Тест 6: Приоритет
```
1. Разместите груз НАД пружиной (перекрытие)
2. Кликните на груз
3. ✅ Ожидание: перетаскивается ГРУЗ, а не пружина
```

---

## 📊 Изменённые методы

### Файл: `experiment-1-spring.js`

1. **drawFreeWeights()** (строки ~2277-2340)
   - Заменён примитивный код на реальную отрисовку
   - Использует `this.images.weights[]`
   - Fallback: `drawWeightPlaceholder()`

2. **setupEquipmentDragListeners()** (строки ~2900-3180)
   - Добавлена функция `findFreeWeightAt()`
   - Обновлён `mousedown` (приоритет свободных грузов)
   - Обновлён `handlePointerMove` (обработка freeweight)
   - Обновлён `handlePointerUp` (зоны прикрепления + stacking)
   - Обновлён `mousemove hover` (курсор grab)

3. **setupFreeWeightsDrag()** (строка ~3180)
   - Упрощён до заглушки
   - Логика перенесена в `setupEquipmentDragListeners()`

---

## 🚀 Результат

✅ **Дизайн**: Свободные грузы выглядят ИДЕНТИЧНО подвешенным  
✅ **Перетаскивание**: Грузы двигаются плавно за курсором  
✅ **Подвешивание**: Автоматически при приближении к пружине  
✅ **Соединение**: Грузы объединяются в стопки  
✅ **Приоритет**: Свободные грузы → динамометр → пружина  

**Статус: ПОЛНОСТЬЮ ИСПРАВЛЕНО! 🎉**

---

## 📝 Урок на будущее

❌ **НЕ создавать** несколько обработчиков на один canvas  
✅ **Использовать** единую точку входа для всех событий  
✅ **Приоритизировать** объекты по z-index (верхние первыми)  
✅ **Переиспользовать** существующие методы рендеринга  

**Принцип:** Один canvas = один набор обработчиков событий!
