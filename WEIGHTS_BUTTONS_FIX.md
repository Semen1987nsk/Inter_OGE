# 🔧 ИСПРАВЛЕНИЕ ЛОГИКИ КНОПОК ГРУЗОВ

## 📋 Проблема

**Описание**: Кнопки "Снять" и "Убрать" работали некорректно для грузов в различных состояниях:
- Штанга с дисками на динамометре показывала кнопку "Вернуть в комплект" которая не работала
- Диски на штанге не распознавались правильно
- Грузы в стопке имели неправильные кнопки
- Запутанная логика определения состояния груза

## ✅ Решение

Создана **централизованная система определения состояния груза** с точной классификацией всех возможных сценариев.

---

## 🎯 Ключевые изменения

### 1️⃣ **Новая функция `getWeightState(weightId)`**

Определяет ТОЧНОЕ состояние груза с полной информацией:

```javascript
const weightState = this.getWeightState(weightId);

// Возвращает объект:
{
    found: true,
    weight: {}, // Объект груза из инвентаря
    state: 'attached-last', // Текущее состояние
    
    // Флаги состояния:
    isPending: false,
    isDirectlyAttached: true,
    isInChain: true,
    positionInChain: 3,
    isLastInChain: true,
    isFreeOnCanvas: false,
    
    // Для композитных грузов:
    isPartOfAttachedComposite: false,
    parentRodId: null,
    isPartOfFreeComposite: false,
    freeRodId: null,
    
    // Для стопок:
    isPartOfFreeStack: false,
    stackBottomWeightId: null,
    
    // Управление кнопкой:
    canRemove: true,
    removeAction: 'detach', // или 'remove-free', 'remove-disk', 'remove-from-stack'
    buttonText: 'Снять'
}
```

### 2️⃣ **Классификация состояний груза**

| Состояние | Описание | Кнопка | Действие |
|-----------|----------|--------|----------|
| `available` | В комплекте (не используется) | — | Подсказка "Перетащите" |
| `pending` | В процессе подвешивания | — | Нет кнопки |
| `attached-last` | Подвешен (последний в цепочке) | ✅ **"Снять"** | `detachWeight()` |
| `attached-middle` | Подвешен (в середине цепочки) | — | Нет кнопки |
| `attached-composite-disk` | Диск на подвешенной штанге | — | Нельзя снять отдельно |
| `free-on-canvas` | Свободно на столе | ✅ **"Убрать"** | `removeFreeWeight()` |
| `free-composite-disk` | Диск на свободной штанге (стол) | ✅ **"Убрать диск"** | `removeFreeWeight()` |
| `free-in-stack` | Груз в стопке на столе | ✅ **"Убрать"** | `removeFreeWeight()` |

### 3️⃣ **Функция `getWeightStatusText(weightState)`**

Генерирует правильный текст статуса для каждого состояния:

```javascript
// Примеры текстов статусов:
"В комплекте"
"Подвешивается…"
"На пружине (2-й в цепочке)"
"На динамометре (3-й в цепочке)"
"На штанге (динамометре)" // для дисков на подвешенной штанге
"На столе"
"На столе (3 диска, 80г)" // для штанги с дисками
"На столе (сцеплен с 2 грузами)" // для стопки
"На штанге (стол)" // для дисков на свободной штанге
"На столе (в стопке)" // для груза в стопке
```

### 4️⃣ **Обновлённая логика `renderWeightsInventory()`**

Теперь использует `getWeightState()` для определения состояния и управления кнопками:

```javascript
const weightState = this.getWeightState(weightId);

// Определяем действие кнопки
if (weightState.canRemove && weightState.buttonText) {
    // Показываем кнопку с правильным текстом
    actionBtn.textContent = weightState.buttonText;
    
    // Устанавливаем правильный обработчик
    switch (weightState.removeAction) {
        case 'detach':
            this.detachWeight(weight.id);
            break;
        case 'remove-free':
        case 'remove-disk':
        case 'remove-from-stack':
            this.removeFreeWeight(weight.id);
            break;
    }
}
```

---

## 🔍 Детальная проверка состояний

### **Проверка 1: Груз подвешен напрямую?**
```javascript
const isDirectlyAttached = this.state.selectedWeights.has(weightId);
```

### **Проверка 2: Груз в цепочке attachedWeights?**
```javascript
const attachedIndex = this.state.attachedWeights.findIndex(w => w.id === weightId);
const isLastInChain = attachedIndex === this.state.attachedWeights.length - 1;
```

### **Проверка 3: Диск на подвешенной штанге?**
```javascript
for (const attachedWeight of this.state.attachedWeights) {
    if (attachedWeight.compositeDisks?.some(d => d.weightId === weightId)) {
        isPartOfAttachedComposite = true;
        parentRodId = attachedWeight.id;
        break;
    }
}
```

### **Проверка 4: Груз свободен на canvas?**
```javascript
const freeWeight = this.state.freeWeights?.find(fw => fw.weightId === weightId);
const isFreeOnCanvas = !!freeWeight && !isDirectlyAttached;
```

### **Проверка 5: Диск на свободной штанге?**
```javascript
for (const fw of this.state.freeWeights || []) {
    if (fw.compositeDisks?.some(d => d.weightId === weightId)) {
        isPartOfFreeComposite = true;
        freeRodId = fw.weightId;
        break;
    }
}
```

### **Проверка 6: Груз в стопке на canvas?**
```javascript
for (const fw of this.state.freeWeights || []) {
    if (fw.stackedWeights?.some(sw => sw.weightId === weightId)) {
        isPartOfFreeStack = true;
        stackBottomWeightId = fw.weightId;
        break;
    }
}
```

---

## 📊 Примеры сценариев

### **Сценарий 1: Штанга с дисками на динамометре**

**Было**: Кнопка "Вернуть в комплект" не работала  
**Стало**: 

1. **Штанга** (composite_rod_10g):
   - State: `attached-last`
   - Кнопка: **"Снять"** ✅
   - Действие: `detachWeight()` → Снимает штангу + ВСЕ диски

2. **Диск 10г** (composite_disk_10g):
   - State: `attached-composite-disk`
   - Статус: "На штанге (динамометре)"
   - Кнопка: НЕТ (нельзя снять отдельно)

3. **Диск 20г** (composite_disk_20g):
   - State: `attached-composite-disk`
   - Статус: "На штанге (динамометре)"
   - Кнопка: НЕТ

### **Сценарий 2: Штанга с дисками на столе**

1. **Штанга** (composite_rod_10g):
   - State: `free-on-canvas`
   - Статус: "На столе (2 диска, 80г)"
   - Кнопка: **"Убрать"** ✅
   - Действие: `removeFreeWeight()` → Убирает штангу + диски

2. **Диск 50г** (composite_disk_50g):
   - State: `free-composite-disk`
   - Статус: "На штанге (стол)"
   - Кнопка: **"Убрать диск"** ✅
   - Действие: `removeFreeWeight()` → Убирает ТОЛЬКО диск

### **Сценарий 3: Стопка 100г грузов на столе**

1. **Нижний груз** (weight100_double_1):
   - State: `free-on-canvas`
   - Статус: "На столе (сцеплен с 2 грузами)"
   - Кнопка: **"Убрать"** ✅
   - Действие: Убирает ВСЮ стопку

2. **Средний груз** (weight100_double_2):
   - State: `free-in-stack`
   - Статус: "На столе (в стопке)"
   - Кнопка: **"Убрать"** ✅
   - Действие: Убирает этот груз из стопки

3. **Верхний груз** (weight100_double_3):
   - State: `free-in-stack`
   - Статус: "На столе (в стопке)"
   - Кнопка: **"Убрать"** ✅

### **Сценарий 4: Цепочка из 3 грузов на пружине**

1. **Верхний груз** (weight100_double_1):
   - State: `attached-middle`
   - Статус: "На пружине (1-й в цепочке)"
   - Кнопка: НЕТ (не последний)

2. **Средний груз** (weight100_double_2):
   - State: `attached-middle`
   - Статус: "На пружине (2-й в цепочке)"
   - Кнопка: НЕТ

3. **Нижний груз** (weight100_double_3):
   - State: `attached-last`
   - Статус: "На пружине (3-й в цепочке)"
   - Кнопка: **"Снять"** ✅
   - Действие: Снимает последний груз, пружина укорачивается

---

## 🎨 Преимущества нового подхода

✅ **Единая точка правды**: Все проверки состояния в одной функции  
✅ **Предсказуемость**: Чёткая классификация 8 состояний груза  
✅ **Расширяемость**: Легко добавить новые состояния  
✅ **Отладка**: Логи показывают state, action, buttonText  
✅ **Безопасность**: Невозможно снять диск с подвешенной штанги  
✅ **Согласованность**: Одинаковая логика в `renderWeightsInventory()` и `createWeightsInventoryFromScratch()`

---

## 🧪 Тестирование

### Проверьте следующие сценарии:

1. ✅ Подвесить штангу с дисками на динамометр
   - Штанга должна иметь кнопку "Снять"
   - Диски НЕ должны иметь кнопок

2. ✅ Разместить штангу с дисками на столе
   - Штанга должна иметь кнопку "Убрать"
   - Каждый диск должен иметь кнопку "Убрать диск"

3. ✅ Создать стопку из 3 грузов по 100г на столе
   - Все 3 груза должны иметь кнопку "Убрать"
   - Нажатие убирает конкретный груз из стопки

4. ✅ Подвесить цепочку из 3 грузов
   - Только последний груз имеет кнопку "Снять"
   - Первые 2 груза без кнопок

5. ✅ Подвесить штангу с дисками на пружину
   - Кнопка "Снять" у штанги
   - При снятии возвращаются штанга + ВСЕ диски

---

## 📝 Итоги

Полностью переработана логика определения состояния грузов и управления кнопками.  
Теперь система работает **предсказуемо** для всех возможных комбинаций:
- Обычные грузы 100г
- Наборный груз (штанга + диски)
- Стопки грузов
- Подвешенные на оборудовании
- Свободные на столе

**Дата исправления**: 22 октября 2025  
**Файл**: `/workspaces/Inter_OGE/experiments/kit2/experiment-1-spring.js`  
**Строки**: 768-1032 (новые функции getWeightState, getWeightStatusText, обновлённый renderWeightsInventory)
