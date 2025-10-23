# 🚀 БЫСТРАЯ ПРОВЕРКА ИСПРАВЛЕНИЙ

## ⚡ ТОП-5 ТЕСТОВ (5 минут)

### ✅ ТЕСТ #1: Штанга с дисками на пружине (БЫЛ БАГ!)
```
1. Перетащите штангу на стол
2. Наденьте диск 50г на штангу
3. Наденьте диск 20г на штангу
4. Перетащите штангу (с дисками) на пружину
5. Откройте панель грузов

ОЖИДАЕТСЯ:
✅ Штанга: кнопка "Снять"
✅ Диск 50г: кнопка "Снять"  ← БЫЛ БАГ: показывал "Перетащите"
✅ Диск 20г: кнопка "Снять"  ← БЫЛ БАГ: показывал "Перетащите"
```

**Console проверка:**
```javascript
console.log(Array.from(experiment.state.selectedWeights));
// Должно быть: ['rod', 'disk-50g', 'disk-20g']
```

---

### ✅ ТЕСТ #2: Надеть диск на свободную штангу
```
1. Перетащите штангу на стол
2. Перетащите диск 10г на штангу
3. Откройте панель грузов

ОЖИДАЕТСЯ:
✅ Штанга: кнопка "Убрать"
✅ Диск 10г: кнопка "Убрать"  ← БЫЛ БАГ: показывал "Перетащите"
```

**Console проверка:**
```javascript
console.log(Array.from(experiment.state.usedWeightIds));
// Должно быть: ['rod', 'disk-10g']
```

---

### ✅ ТЕСТ #3: Прямой drag штанги из инвентаря
```
1. Перетащите штангу НАПРЯМУЮ из инвентаря на динамометр
2. Откройте панель грузов

ОЖИДАЕТСЯ:
✅ Штанга: кнопка "Снять"
✅ Нет ошибок в консоли
```

**Console проверка:**
```javascript
console.log(experiment.state.attachedWeights[0]);
// Должно быть: { id: 'rod', compositeDisks: [] }
```

---

### ✅ ТЕСТ #4: Цепочка с обычным грузом
```
1. Подвесьте груз 100г на пружину
2. Подвесьте штангу на груз 100г
3. Откройте панель грузов

ОЖИДАЕТСЯ:
✅ Груз 100г: кнопка "Снять"
✅ Штанга: кнопка "Снять"
```

---

### ✅ ТЕСТ #5: Снятие диска с подвешенной штанги
```
1. Перетащите штангу на стол
2. Наденьте диск 50г
3. Подвесьте штангу с диском на пружину
4. Нажмите "Снять" на диске 50г
5. Откройте панель грузов

ОЖИДАЕТСЯ:
✅ Штанга: кнопка "Снять"
✅ Диск 50г: кнопка "Перетащите на установку"
```

---

## 🔍 КАК ПРОВЕРИТЬ В КОНСОЛИ

### Проверка selectedWeights (подвешенные)
```javascript
// Показать все подвешенные грузы
console.log('Подвешенные:', Array.from(experiment.state.selectedWeights));

// Проверить конкретный груз
experiment.state.selectedWeights.has('disk-50g'); // true = подвешен
```

### Проверка usedWeightIds (на столе)
```javascript
// Показать все грузы на столе
console.log('На столе:', Array.from(experiment.state.usedWeightIds));

// Проверить конкретный груз
experiment.state.usedWeightIds.has('rod'); // true = на столе
```

### Проверка цепочки
```javascript
// Показать всю цепочку
console.log('Цепочка:', experiment.state.attachedWeights);

// Проверить диски на штанге в цепочке
const rod = experiment.state.attachedWeights.find(w => w.id === 'rod');
console.log('Диски на штанге:', rod?.compositeDisks);
```

### Проверка свободных грузов
```javascript
// Показать все свободные грузы
console.log('Свободные:', experiment.state.freeWeights);

// Проверить диски на свободной штанге
const freeRod = experiment.state.freeWeights.find(w => w.weightId === 'rod');
console.log('Диски на свободной штанге:', freeRod?.compositeDisks);
```

### Проверка состояния груза
```javascript
// Узнать состояние любого груза
const state = experiment.getWeightState('disk-50g');
console.log('Состояние disk-50g:', state);
// Возможные значения:
// - 'available' (в комплекте)
// - 'attached-last' (подвешен последним)
// - 'attached-composite-disk' (диск на подвешенной штанге)
// - 'free-on-canvas' (на столе)
// - 'free-composite-disk' (диск на свободной штанге)
```

---

## 🐛 ЧТО ПРОВЕРЯТЬ

### ✅ Правильные кнопки
- Подвешенные грузы → **"Снять"**
- Диски на подвешенной штанге → **"Снять"** (БЫЛ БАГ!)
- Свободные грузы → **"Убрать"**
- Диски на свободной штанге → **"Убрать"** (БЫЛ БАГ!)
- Доступные грузы → **"Перетащите на установку"**

### ✅ Console логи
Должны быть только **✅** символы:
```
[ATTACH-FREE] ✅ Диск добавлен в selectedWeights: disk-50g
[ADD-TO-CHAIN] ✅ Скопированы диски в цепочку: ['disk-50g']
[COMPOSITE] ✅ Диск помечен как использованный: disk-20g
```

### ❌ НЕ должно быть
```
[GETSTATE] ⚠️ Груз не найден ни в одном состоянии!
[ERROR] ...
Uncaught TypeError: ...
```

---

## 🎯 КРИТИЧЕСКИЙ ТЕСТ (СКРИНШОТ ПОЛЬЗОВАТЕЛЯ)

**Проблема:** "штанга висит с дисками - а в окне не правильно кнопка!"

### Воспроизведение:
1. Перетащите штангу на стол
2. Наденьте диск 50г
3. Наденьте диск 20г
4. Подвесьте штангу на динамометр
5. Откройте панель грузов

### Ожидаемый результат:
```
✅ Штанга: "Снять"
✅ Диск 50г: "Снять"  ← БЫЛ: "Перетащите на установку" ❌
✅ Диск 20г: "Снять"  ← БЫЛ: "Перетащите на установку" ❌
```

### Console проверка:
```javascript
console.log({
    selectedWeights: Array.from(experiment.state.selectedWeights),
    usedWeightIds: Array.from(experiment.state.usedWeightIds),
    chain: experiment.state.attachedWeights
});

// Должно быть:
// selectedWeights: ['rod', 'disk-50g', 'disk-20g']
// usedWeightIds: []
// chain: [{ id: 'rod', compositeDisks: [{weightId:'disk-50g'}, {weightId:'disk-20g'}] }]
```

---

## 📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ

Отметьте после проверки:

- [ ] ТЕСТ #1 (штанга с дисками на пружине) ✅ / ❌
- [ ] ТЕСТ #2 (надеть диск на свободную штангу) ✅ / ❌
- [ ] ТЕСТ #3 (прямой drag штанги) ✅ / ❌
- [ ] ТЕСТ #4 (цепочка с обычным грузом) ✅ / ❌
- [ ] ТЕСТ #5 (снятие диска с подвешенной штанги) ✅ / ❌

**Статус:** _____ / 5 тестов пройдено

---

## 🔧 ЕСЛИ ТЕСТЫ НЕ ПРОХОДЯТ

### Проблема: Диск показывает неправильную кнопку
```javascript
// 1. Проверьте состояние
const state = experiment.getWeightState('disk-50g');
console.log('State:', state);

// 2. Проверьте в каких Sets находится
console.log({
    inSelected: experiment.state.selectedWeights.has('disk-50g'),
    inUsed: experiment.state.usedWeightIds.has('disk-50g')
});

// 3. Найдите где диск находится
const inChain = experiment.state.attachedWeights.some(w => 
    w.id === 'disk-50g' || w.compositeDisks?.some(d => d.weightId === 'disk-50g')
);
const inFree = experiment.state.freeWeights.some(w => 
    w.weightId === 'disk-50g' || w.compositeDisks?.some(d => d.weightId === 'disk-50g')
);
console.log({ inChain, inFree });
```

### Проблема: Ошибки в консоли
1. Перезагрузите страницу (Ctrl+R)
2. Очистите консоль (Ctrl+L)
3. Повторите тест
4. Скопируйте полный лог ошибки

---

## ✅ ФИНАЛЬНАЯ ПРОВЕРКА

После прохождения всех 5 тестов:

```javascript
// Проверка целостности state
console.log('=== ФИНАЛЬНАЯ ПРОВЕРКА ===');
console.log('selectedWeights:', Array.from(experiment.state.selectedWeights));
console.log('usedWeightIds:', Array.from(experiment.state.usedWeightIds));
console.log('attachedWeights:', experiment.state.attachedWeights);
console.log('freeWeights:', experiment.state.freeWeights);

// НЕ ДОЛЖНО быть дублирования:
// груз НЕ МОЖЕТ быть одновременно в selectedWeights И usedWeightIds
const intersection = Array.from(experiment.state.selectedWeights).filter(id => 
    experiment.state.usedWeightIds.has(id)
);
console.log('Дубликаты (должно быть пусто):', intersection);
```

**Если всё ОК:** 
```
✅ Все тесты пройдены!
✅ Нет дубликатов в state!
✅ Console логи чистые!
🎉 ИСПРАВЛЕНИЯ РАБОТАЮТ!
```
