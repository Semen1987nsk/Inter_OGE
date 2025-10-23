# 🔍 Touch Diagnostics - Инструкция по использованию

## Проблема
На интерактивных тач-панелях оборудование "соскакивает" при касании - не получается захватить и перетащить.

## Решение

### 1. Автоматическая диагностика (на тач-устройствах)
Модуль диагностики **автоматически включается** на тач-устройствах через 1 секунду после загрузки страницы.

### 2. Ручное включение (на десктопе)
Если вы на обычном компьютере, можете включить диагностику двумя способами:

#### A. Горячая клавиша
```
Ctrl + Shift + D
```

#### B. Консоль браузера
```javascript
window.touchDiag.enable()
```

### 3. Что показывает диагностика

#### Оверлей в правом верхнем углу:
- **Активные касания** - количество пальцев на экране и их координаты
- **История событий** - последние 50 событий с временными метками:
  - 🔵 `touchstart` - касание началось
  - 🟡 `touchmove` - палец движется
  - 🟠 `touchend` - палец отпущен
  - 🔴 `touchcancel` ⚠️ - касание отменено (ПРОБЛЕМА!)
  - 🟣 `mousedown/move/up` - события мыши
  - 🔷 `pointerdown/move/up` - универсальные pointer events

#### Цветовая индикация:
- **Зелёный** 🟢 - нормальные события
- **Жёлтый** 🟡 - движение
- **Оранжевый** 🟠 - завершение
- **Красный** 🔴 - ОТМЕНА (это проблема!)
- **Фиолетовый** 🟣 - mouse events
- **Голубой** 🔵 - pointer events

### 4. Исправления

#### A. Добавлена универсальная функция `getEventCoords()`
```javascript
// Работает с mouse, touch и pointer events
const coords = getEventCoords(e);
```

#### B. Добавлен `preventDefault()` для touch events
```javascript
e.preventDefault(); // Предотвращает прокрутку и зум
```

#### C. Добавлены слушатели для всех типов событий
```javascript
// Раньше: только mousemove/mouseup
window.addEventListener('mousemove', handlePointerMove);
window.addEventListener('mouseup', handlePointerUp);

// Теперь: + touchmove/touchend/touchcancel
window.addEventListener('touchmove', handlePointerMove, { passive: false });
window.addEventListener('touchend', handlePointerUp);
window.addEventListener('touchcancel', handlePointerUp);
```

#### D. CSS свойства для тач-устройств
```css
touch-action: none; /* Отключает прокрутку/зум */
user-select: none; /* Отключает выделение текста */
-webkit-touch-callout: none; /* Отключает контекстное меню на iOS */
```

### 5. Отладка проблемы "соскакивания"

#### Симптомы:
1. Касаетесь оборудования → видите `touchstart`
2. Начинаете тащить → видите `touchmove`
3. Внезапно появляется `touchcancel` ⚠️
4. Оборудование "соскакивает" обратно

#### Причины `touchcancel`:
- **Прокрутка страницы** - браузер перехватывает touch для скролла
- **Зум** - браузер начинает масштабирование
- **Системные жесты** - свайп для возврата назад и т.д.
- **Контекстное меню** - долгое нажатие на iOS/Android

#### Решения (УЖЕ ПРИМЕНЕНЫ):
✅ `touch-action: none` в CSS
✅ `e.preventDefault()` в обработчиках
✅ `{ passive: false }` для touchmove
✅ Обработка `touchcancel` как `touchend`

### 6. Проверка на панели

1. Откройте эксперимент на интерактивной панели
2. Подождите 1 секунду - диагностика включится автоматически
3. Коснитесь оборудования (пружины или груза)
4. Посмотрите в правый верхний угол:
   - Видите `touchstart`? ✅ Касание зафиксировано
   - Видите `touchmove`? ✅ Движение отслеживается
   - Видите `touchcancel`? ❌ ПРОБЛЕМА - браузер отменяет событие
   - Видите `touchend`? ✅ Отпускание обработано

### 7. Команды консоли

```javascript
// Включить диагностику
window.touchDiag.enable()

// Выключить диагностику
window.touchDiag.disable()

// Переключить
window.touchDiag.toggle()

// Проверить текущий эксперимент
window.experiment

// Проверить состояние
window.experiment.state
```

### 8. Если проблема остаётся

#### Проверьте в диагностике:
1. **Много `touchcancel` событий** → CSS не применился или браузер игнорирует `preventDefault()`
2. **Нет `touchmove` после `touchstart`** → События не доходят до обработчика
3. **События приходят, но координаты прыгают** → Проблема с `getBoundingClientRect()`

#### Дополнительные действия:
```javascript
// В консоли браузера на панели:
console.log('Touch support:', 'ontouchstart' in window);
console.log('Max touch points:', navigator.maxTouchPoints);
console.log('Pointer events:', 'onpointerdown' in window);
```

### 9. Проверка исправлений

Откройте консоль и проверьте:
```
✅ All libraries loaded successfully
✅ Spring drag enabled (with touch support)
✅ Touch diagnostics: Press Ctrl+Shift+D or call window.touchDiag.enable()
📱 Touch device detected! Enabling touch diagnostics...
🔍 Touch diagnostics enabled. Press Ctrl+Shift+D to toggle.
```

Если видите эти сообщения - всё настроено правильно!

### 10. Отключение диагностики

После отладки выключите диагностику:
- Нажмите `Ctrl + Shift + D`
- Или в консоли: `window.touchDiag.disable()`

---

## Технические детали

### Файлы изменены:
1. `/experiments/shared/touch-diagnostics.js` - новый модуль диагностики
2. `/experiments/kit2/experiment-1-spring.html` - подключение модуля
3. `/experiments/kit2/experiment-1-spring.js` - исправление обработки touch
4. `/experiments/styles/experiment-common.css` - CSS для тач-устройств

### Основные изменения:
- ✅ Универсальная обработка mouse/touch/pointer events
- ✅ Предотвращение прокрутки и зума на тач-устройствах
- ✅ Обработка touchcancel как завершения касания
- ✅ Визуальная диагностика в реальном времени
- ✅ Автоматическое включение на тач-устройствах

### Совместимость:
- ✅ Десктоп (мышь) - работает как прежде
- ✅ Тач-панели - улучшенная обработка касаний
- ✅ Планшеты/смартфоны - полная поддержка
- ✅ Устройства с стилусом - поддержка pointer events
