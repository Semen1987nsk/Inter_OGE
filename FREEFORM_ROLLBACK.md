# 🔄 Откат к прежней системе

## Проблема
После внедрения FreeformManager возникли проблемы:
1. ❌ Грузы не двигаются по canvas (конфликт interact.js)
2. ❌ Отрисовка грузов изменилась (новый рендер перекрывает старый)
3. ❌ Пользователь предпочитает старую отрисовку

## Решение
Временно откатились к прежней системе:

### 1. Отключена инициализация FreeformManager
```javascript
// БЫЛО:
this.freeformManager = new FreeformManager(this);

// СТАЛО:
// 🔴 ОТКЛЮЧЕНО: FreeformManager временно не используется
// this.freeformManager = new FreeformManager(this);
```

### 2. Убрана отрисовка freeform объектов
```javascript
// БЫЛО:
if (this.freeformManager) {
    this.freeformManager.render(ctx);
}

// СТАЛО:
// Удалено
```

### 3. Восстановлена старая логика handleWeightDrop
```javascript
// Вернулась полная логика с:
- Проверкой springAttached/dynamometerAttached
- attachmentManager.enqueue()
- Старой отрисовкой грузов через drawAttachedWeights()
```

## Текущий статус

### ✅ Работает (прежняя система):
- Перетаскивание грузов из инвентаря
- Автоматическое подвешивание на пружину/динамометр
- Старая красивая отрисовка грузов
- Анимация растяжения пружины
- Запись измерений (упрощённая система F=mg)

### 🔴 Не работает (новая система):
- Свободное размещение на canvas
- Соединение грузов между собой
- Магнитное притяжение к зонам
- Стеки грузов

## Как вернуть FreeformManager

Если захотите вернуть свободное размещение:

1. Раскомментировать инициализацию:
```javascript
this.freeformManager = new FreeformManager(this);
```

2. Добавить рендеринг в drawDynamic():
```javascript
if (this.freeformManager) {
    this.freeformManager.render(ctx);
}
```

3. Изменить handleWeightDrop() на freeform логику:
```javascript
const freeWeight = this.freeformManager.addWeightFromInventory(
    weightId, canvasX, canvasY
);
```

## Причина проблем

### Конфликт interact.js
- Старая система: interact.js управляет drag из инвентаря → dropzone
- Новая система: FreeformManager перехватывает mouse events на canvas
- Результат: грузы "застревают" между двумя системами

### Решение конфликта (для будущего)
Нужно либо:
1. **Вариант А**: Полностью убрать interact.js, всё делать через FreeformManager
2. **Вариант Б**: Разделить зоны ответственности (инвентарь = interact.js, canvas = FreeformManager)

### Отрисовка
- Старая система: реалистичные грузы с текстурами через drawAttachedWeights()
- Новая система: упрощённые грузы в FreeformManager.renderWeight()
- Нужно: использовать старую отрисовку в FreeformManager

## Рекомендации

### Для сохранения старого поведения:
✅ **Оставить как есть** - всё работает как раньше

### Для внедрения FreeformManager правильно:
1. Переписать FreeformManager.renderWeight() используя код из drawAttachedWeights()
2. Отключить interact.js для грузов, переключиться на FreeformManager полностью
3. Добавить режим "свободное размещение" vs "прямое подвешивание" (переключатель)

## Файлы

### Изменённые:
- `/workspaces/Inter_OGE/experiments/kit2/experiment-1-spring.js` - откат изменений

### Готовые (не используются):
- `/workspaces/Inter_OGE/experiments/shared/freeform-manager.js` - готов к использованию
- `/workspaces/Inter_OGE/FREEFORM_IMPLEMENTATION.md` - документация
- `/workspaces/Inter_OGE/FREEFORM_EQUIPMENT_PLAN.md` - план реализации

## Статус

**✅ ВОССТАНОВЛЕНО** - работает как до внедрения FreeformManager

Сервер: http://localhost:8000  
Эксперимент работает с прежней логикой!
