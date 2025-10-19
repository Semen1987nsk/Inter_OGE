# 🐛 ОТЛАДКА: Грузы помечаются "Используется" но не подвешиваются

## Проблема
- Все 3 груза показывают "Используется" (кнопка "Снять")
- На canvas пружина пустая (ничего не подвешено)
- В консоли ошибки: `[DETACH-WEIGHT] Нет оборудования`

## Причина
Грузы добавляются в `usedWeightIds` но НЕ добавляются в `attachedWeights`.

## Диагностика

### 1. Откройте консоль (F12) и выполните:
```javascript
window.experiment.state.usedWeightIds
// Должен показать Set с ID грузов

window.experiment.state.attachedWeights
// Должен быть пустой массив [] если ничего не подвешено

window.experiment.state.freeWeights
// Свободные грузы на canvas

window.experiment.state.springAttached
// true если пружина установлена
```

### 2. Временное решение - очистка состояния:
```javascript
window.experiment.state.usedWeightIds.clear()
window.experiment.renderWeightsInventory()
```

Это вернёт все грузы в инвентарь.

### 3. Проверка логики подвешивания:
```javascript
// После перетаскивания груза смотрите консоль:
// Должны быть логи:
[ATTACH-WEIGHT] handleWeightDrop start
[ATTACH-WEIGHT] Check spring drop: {distance: XX.X}
[ATTACH-WEIGHT] Direct drop on spring  // Если близко к пружине
[FREE-WEIGHT] Weight placed freely     // Если далеко
```

## Возможные проблемы

### Проблема 1: Пружина не установлена
- Проверка: `window.experiment.state.springAttached`
- Решение: Перетащите пружину из "Оборудование" на штатив

### Проблема 2: Груз добавлен в usedWeightIds но не подвешен
- Когда: drop на canvas НЕ рядом с пружиной
- Поведение: Груз помечается как использованный, но остаётся свободным
- Это ПРАВИЛЬНО - груз используется, но ещё не подвешен

### Проблема 3: attachWeight не вызывается
- Проверка: Ищите в консоли `[ATTACH-WEIGHT] attachWeight вызван`
- Если нет - значит `shouldAttachDirectly = false`
- Причина: Расстояние до пружины > 80px

## Правильный сценарий

### Вариант A: Прямое подвешивание
1. Установите пружину на штатив
2. Перетащите груз ПРЯМО на нижний конец пружины
3. Если `distance < 80px` → сразу подвешивается
4. Консоль: `[ATTACH-WEIGHT] Direct drop on spring`

### Вариант B: Двухэтапное подвешивание
1. Установите пружину
2. Перетащите груз в СТОРОНУ (на "стол")
3. Консоль: `[FREE-WEIGHT] Weight placed freely`
4. Груз помечается "Используется" (в usedWeightIds)
5. Перетащите свободный груз К ПРУЖИНЕ
6. Появится зелёный круг → подвесится
7. Консоль: `[ATTACH-FREE] Подвешивание свободного груза`

## Проверка состояния после каждого шага

После установки пружины:
```javascript
window.experiment.state.springAttached === true
window.experiment.state.attachedSpringId === "spring50"
```

После drop груза на canvas (в сторону):
```javascript
window.experiment.state.freeWeights.length === 1
window.experiment.state.usedWeightIds.size === 1
window.experiment.state.attachedWeights.length === 0
```

После подвешивания груза:
```javascript
window.experiment.state.freeWeights.length === 0
window.experiment.state.attachedWeights.length === 1
window.experiment.state.usedWeightIds.size === 1
```

## Если всё сломалось

### Полный сброс состояния:
```javascript
window.experiment.state.usedWeightIds.clear()
window.experiment.state.freeWeights = []
window.experiment.state.attachedWeights = []
window.experiment.state.selectedWeights.clear()
window.experiment.renderWeightsInventory()
window.experiment.drawDynamic()
```

Затем обновите страницу (Ctrl+Shift+R).
