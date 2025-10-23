# 🚀 Быстрый тест Touch на панели

## Шаг 1: Простой тест касаний
```
http://localhost:8000/touch-test.html
```

Откройте эту страницу на интерактивной панели и:
1. **Перетащите грузы** пальцем
2. **Проверьте статистику** вверху:
   - Touch Starts = количество касаний ✅
   - Touch Moves = движения пальцем ✅
   - Touch Ends = отпускания ✅
   - Touch Cancels = ОТМЕНЫ ❌ (должно быть 0!)

### ❌ Если видите Touch Cancels:
- Браузер отменяет события (прокрутка/зум)
- CSS `touch-action: none` не работает
- Нужны дополнительные исправления

### ✅ Если Touch Cancels = 0:
- Touch события обрабатываются правильно!
- Переходите к Шагу 2

---

## Шаг 2: Полный эксперимент с диагностикой
```
http://localhost:8000/experiments/kit2/experiment-1-spring.html
```

На тач-панели диагностика **включится автоматически** через 1 секунду.

### Что смотреть:
1. **Правый верхний угол** - оверлей диагностики
2. **Активные касания** - количество пальцев на экране
3. **История событий** - цветные строки с событиями

### Попробуйте:
1. Коснитесь **груза 100г**
2. Перетащите на **пружину**
3. Отпустите

### Проверьте в диагностике:
```
▶ touchstart @ (X, Y) [1 касание]
→ touchmove @ (X, Y) [1 касание]
→ touchmove @ (X, Y) [1 касание]
...
■ touchend @ (X, Y) [0 касаний]
```

### ❌ Если видите:
```
▶ touchstart
→ touchmove
⚠️ touchcancel - КАСАНИЕ ОТМЕНЕНО!
```
Значит браузер отменяет событие! Смотрите раздел "Проблемы" ниже.

---

## Шаг 3: Консоль браузера (F12)

Откройте консоль разработчика и проверьте:
```javascript
// Должны увидеть:
✅ Touch diagnostics enabled
✅ Spring drag enabled (with touch support)
📱 Touch device detected!

// Проверьте поддержку:
console.log('Touch:', 'ontouchstart' in window);
console.log('Max points:', navigator.maxTouchPoints);
```

---

## 🔧 Если не работает

### Проблема 1: Грузы "соскакивают" обратно
**Причина:** `touchcancel` отменяет перетаскивание

**Решение:**
1. Проверьте CSS применился:
   ```javascript
   const overlay = document.getElementById('drag-drop-overlay');
   console.log(getComputedStyle(overlay).touchAction); // Должно быть "none"
   ```

2. Если не "none" - CSS не применился. Проверьте:
   - Кэш браузера (Ctrl+Shift+R)
   - Путь к CSS файлу
   - Приоритет стилей (inspect element)

### Проблема 2: События не доходят
**Причина:** Другие элементы перехватывают события

**Решение:**
```javascript
// В консоли проверьте z-index:
const overlay = document.getElementById('drag-drop-overlay');
console.log(getComputedStyle(overlay).zIndex); // Должно быть "5"
console.log(getComputedStyle(overlay).pointerEvents); // Должно быть "auto"
```

### Проблема 3: Двойные события (mouse + touch)
**Причина:** Браузер эмулирует mouse после touch

**Решение:** Уже исправлено через `e.preventDefault()` в `touchstart`

---

## 📊 Ожидаемый результат

### ✅ Правильная работа:
1. Касаетесь груза → `touchstart` → груз "прилипает" к пальцу
2. Двигаете пальцем → много `touchmove` → груз следует за пальцем
3. Отпускаете → `touchend` → груз остаётся или подвешивается
4. **Нет `touchcancel`!**

### ❌ Неправильная работа:
1. Касаетесь груза → `touchstart`
2. Начинаете тащить → 2-3 `touchmove`
3. Появляется `touchcancel` ⚠️
4. Груз "соскакивает" обратно
5. Страница прокручивается или зумируется

---

## 🎯 Команды для отладки

### В консоли браузера:
```javascript
// Включить диагностику вручную
window.touchDiag.enable()

// Выключить диагностику
window.touchDiag.disable()

// Проверить состояние эксперимента
window.experiment.state

// Проверить CSS
const overlay = document.getElementById('drag-drop-overlay');
console.log({
  touchAction: getComputedStyle(overlay).touchAction,
  zIndex: getComputedStyle(overlay).zIndex,
  pointerEvents: getComputedStyle(overlay).pointerEvents,
  userSelect: getComputedStyle(overlay).userSelect
});

// Проверить поддержку touch
console.log({
  hasTouch: 'ontouchstart' in window,
  maxTouchPoints: navigator.maxTouchPoints,
  hasPointer: 'onpointerdown' in window
});
```

---

## 📝 Отчёт о проблеме

Если ничего не помогло, соберите отчёт:

### 1. Скриншот диагностики (правый верхний угол)
### 2. Консоль браузера (все сообщения)
### 3. Ответы на вопросы:
- Модель интерактивной панели?
- Браузер и версия?
- Что происходит при касании?
- Есть ли `touchcancel` в диагностике?
- Значения CSS свойств (см. команды выше)

---

## ✅ Исправления уже применены

1. ✅ Универсальная функция `getEventCoords()`
2. ✅ Обработка `touchstart/move/end/cancel`
3. ✅ `e.preventDefault()` для предотвращения прокрутки
4. ✅ CSS `touch-action: none`
5. ✅ CSS `user-select: none`
6. ✅ `{ passive: false }` для touchmove
7. ✅ Автоматическая диагностика на тач-устройствах
8. ✅ Визуальная отладка в реальном времени

Теперь протестируйте на панели! 🚀
