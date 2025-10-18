# Реализовано: Динамометр как отдельный прибор

## Что сделано

### 1. Динамометры по ФИПИ
✅ **Динамометр 1Н** - для малых сил (цена деления 0.1 Н)  
✅ **Динамометр 5Н** - для больших сил (цена деления 0.5 Н)

### 2. Динамометр - отдельное оборудование
✅ Перетаскивается как самостоятельный прибор  
✅ Рисуется **вместо** установки с пружиной  
✅ Имеет собственные крючки (верхний и нижний)  
✅ Груз подвешивается на нижний крючок динамометра  

### 3. Режимы работы
✅ `experimentMode: 'dynamometer'` - работа с динамометром  
✅ `experimentMode: 'spring'` - работа с пружиной  
✅ Нельзя одновременно иметь динамометр И пружину  

## Код

### Equipment configuration
```javascript
equipment = {
    dynamometer1: {
        id: 'dynamometer1',
        name: 'Динамометр 1Н',
        maxForce: 1,
        type: 'dynamometer',
        scale: 0.1  // Цена деления
    },
    dynamometer5: {
        id: 'dynamometer5',
        name: 'Динамометр 5Н',
        maxForce: 5,
        type: 'dynamometer',
        scale: 0.5
    },
    spring50: {...},
    spring10: {...}
}
```

### State additions
```javascript
state = {
    experimentMode: 'dynamometer', // или 'spring'
    dynamometerAttached: false,
    attachedDynamometerId: null,
    springAttached: false,
    attachedSpringId: null,
    forceMeasurements: [],      // Этап 1
    stiffnessMeasurements: [],  // Этап 2
}
```

### Drawing logic
```javascript
drawDynamic() {
    // Если установлен ДИНАМОМЕТР
    if (this.state.dynamometerAttached) {
        this.drawDynamometerSetup(ctx);
        return;
    }
    
    // Если установлена ПРУЖИНА
    if (this.state.springAttached) {
        this.drawSpringSetup(ctx);
        return;
    }
    
    // Пусто - показываем placeholder
    this.drawPlaceholder(ctx);
}
```

### Dynamometer drawing
```javascript
drawDynamometerSetup(ctx) {
    const dynamometer = this.getEquipmentById(this.state.attachedDynamometerId);
    
    // Корпус 80×300 px
    // Верхний крючок с кольцом
    // Шкала с делениями (0 до maxForce)
    // Красная стрелка показывает текущую силу
    // Цифровое табло внизу
    // Нижний крючок для подвешивания груза
    // Подвешенные грузы (drawAttachedWeights)
}
```

### Attachment logic
```javascript
handleEquipmentAttach(event) {
    const equipment = this.getEquipmentById(equipmentId);
    
    if (equipment.type === 'dynamometer') {
        this.handleDynamometerAttach(event, equipment, element);
    } else if (equipment.type === 'spring') {
        this.handleSpringAttach(event, equipment, element);
    }
}

handleDynamometerAttach(event, dynamometer, element) {
    // Проверка: если есть пружина - ошибка
    if (this.state.springAttached) {
        this.showHint('Сначала уберите пружину!');
        return;
    }
    
    // Устанавливаем динамометр
    this.state.dynamometerAttached = true;
    this.state.attachedDynamometerId = dynamometer.id;
    this.state.experimentMode = 'dynamometer';
    
    this.drawDynamic();
}

handleSpringAttach(event, spring, element) {
    // Проверка: если есть динамометр - ошибка
    if (this.state.dynamometerAttached) {
        this.showHint('Сначала уберите динамометр!');
        return;
    }
    
    // Устанавливаем пружину
    this.state.springAttached = true;
    this.state.attachedSpringId = spring.id;
    this.state.experimentMode = 'spring';
    
    this.drawDynamic();
}
```

## Визуализация динамометра

```
    ⭕ <- Верхний крючок (крепление)
    │
┌───┴───┐
│ ДИНА- │
│ МОМЕТР│
│  1Н   │
├───────┤
│   │0  │
│   │0.1│
│   │0.2│
│   │0.3│
│  ►│0.4│ <- Красная стрелка
│   │0.5│
│   │0.6│
│   │...│
│   │1.0│
├───────┤
│0.48 Н │ <- Цифровое табло
├───────┤
    │
    ⭕ <- Нижний крючок (для груза)
    │
   ▓▓▓  <- Подвешенный груз
```

## Workflow

### ЭТАП 1: Измерение силы
1. Перетащить **Динамометр 5Н** на canvas
2. Динамометр появляется в центре (без установки!)
3. Перетащить **Груз 100г** на нижний крючок динамометра
4. Стрелка показывает ~0.98 Н
5. Цифровое табло: "0.98 Н"
6. Нажать "Записать силу"
7. Ввести 0.98 Н
8. Повторить с другими грузами
9. Получить таблицу: Масса → Сила

### ЭТАП 2: Измерение жёсткости
1. **Убрать динамометр** (перетащить обратно или кнопка)
2. Перетащить **Пружину 50 Н/м** на canvas
3. Появляется установка с пружиной и линейкой
4. Подвесить **Груз 100г**
5. Измерить удлинение: ~2.0 см
6. Сила берётся из таблицы Этапа 1: 0.98 Н
7. Записать измерение
8. Повторить с другими грузами
9. Рассчитать k = F / Δl

## Преимущества реализации

✅ **Реалистичность** - как в реальной лабораторной работе  
✅ **Раздельные приборы** - динамометр и пружина не совмещены  
✅ **Понимание** - ученик видит, что это разные измерения  
✅ **ФИПИ compliance** - соответствует комплекту №2  
✅ **Простота** - один прибор на экране за раз  

## Следующие шаги

⏳ Реализовать кнопку "Убрать прибор"  
⏳ Реализовать запись измерений силы (Этап 1)  
⏳ Реализовать переключение на Этап 2  
⏳ Реализовать подстановку силы из Этапа 1  
⏳ Обновить UI для двух этапов  
⏳ Протестировать полный workflow  

## Текущий статус

✅ Динамометры добавлены в equipment  
✅ State обновлён (experimentMode, dynamometerAttached)  
✅ drawDynamometerSetup() реализован  
✅ handleDynamometerAttach() реализован  
✅ handleSpringAttach() обновлён  
✅ Взаимоисключение динамометра и пружины  

⏳ HTML обновлён частично  
⏳ Логика записи измерений  
⏳ Переключение между этапами  
⏳ Тестирование  
