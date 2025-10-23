# 🛠️ ПЛАН ИСПРАВЛЕНИЙ - КРАТКАЯ ВЕРСИЯ

## 🔴 КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (сделать СЕЙЧАС)

### 1. Проверка canvas элементов
**Файл:** `experiments/kit2/experiment-1-spring.js:19`

```javascript
// ❌ БЫЛО:
if (!canvas) {
    console.error(`Canvas element missing: ${key}`);
} else {
    this.contexts[key] = canvas.getContext('2d');
}

// ✅ ДОЛЖНО БЫТЬ:
if (!canvas) {
    throw new Error(`Critical: Canvas element '${key}' not found in DOM`);
}
this.contexts[key] = canvas.getContext('2d');
```

---

### 2. Валидация пользовательского ввода
**Файл:** `experiments/kit2/experiment-1-spring.js` (метод recordMeasurementDirect)

```javascript
// ✅ ДОБАВИТЬ ВАЛИДАЦИЮ:
recordMeasurementDirect(force, elongationCm) {
    // Проверки
    if (!Number.isFinite(force)) {
        throw new TypeError('Сила должна быть числом');
    }
    if (force <= 0 || force > 10) {
        throw new RangeError(`Сила должна быть в диапазоне (0, 10] Н. Получено: ${force}`);
    }
    if (!Number.isFinite(elongationCm)) {
        throw new TypeError('Удлинение должно быть числом');
    }
    if (elongationCm <= 0 || elongationCm > 50) {
        throw new RangeError(`Удлинение должно быть в диапазоне (0, 50] см. Получено: ${elongationCm}`);
    }
    
    // Остальной код...
}
```

---

### 3. XSS защита в innerHTML
**Файл:** `app.js:464`

```javascript
// ❌ ОПАСНО:
body.innerHTML = `<p>${kit.description}</p>`;

// ✅ БЕЗОПАСНО:
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

body.innerHTML = `<p>${escapeHtml(kit.description)}</p>`;

// ИЛИ ЕЩЁ ЛУЧШЕ:
const p = document.createElement('p');
p.textContent = kit.description;
body.appendChild(p);
```

---

### 4. localStorage с error handling
**Файл:** `app.js:198`

```javascript
// ✅ ДОБАВИТЬ:
loadProgress() {
    try {
        // Проверка доступности
        if (typeof Storage === 'undefined') {
            console.warn('localStorage не поддерживается браузером');
            return this.getDefaultProgress();
        }
        
        // Проверка на приватный режим
        try {
            localStorage.setItem('__test__', '1');
            localStorage.removeItem('__test__');
        } catch (e) {
            console.warn('localStorage недоступен (приватный режим?)');
            return this.getDefaultProgress();
        }
        
        const saved = localStorage.getItem('lab_progress');
        if (!saved) {
            return this.getDefaultProgress();
        }
        
        return JSON.parse(saved);
        
    } catch (error) {
        console.error('Ошибка загрузки прогресса:', error);
        return this.getDefaultProgress();
    }
}
```

---

### 5. Cleanup обработчиков событий
**Файл:** `experiments/kit2/experiment-1-spring.js`

```javascript
// ✅ ДОБАВИТЬ МЕТОД:
cleanup() {
    console.log('🧹 Cleaning up experiment...');
    
    // Удаляем все interact.js обработчики
    if (typeof interact !== 'undefined') {
        interact('.equipment-item').unset();
        interact('.weight-item').unset();
        interact('.drag-drop-zone').unset();
    }
    
    // Останавливаем анимацию
    if (this.currentAnimation) {
        cancelAnimationFrame(this.currentAnimation);
        this.currentAnimation = null;
    }
    
    // Очищаем particle system
    if (this.particleSystem) {
        this.particleSystem.clear();
    }
    
    // Удаляем event listeners
    window.removeEventListener('resize', this.handleResize);
    
    console.log('✅ Cleanup complete');
}

// И вызывать при выходе:
window.addEventListener('beforeunload', () => {
    if (window.experiment) {
        window.experiment.cleanup();
    }
});
```

---

## 🟡 ВАЖНЫЕ ИСПРАВЛЕНИЯ (следующий релиз)

### 6. Оптимизация рендеринга
**Файл:** `experiments/kit2/experiment-1-spring.js`

```javascript
// ✅ ДОБАВИТЬ DIRTY FLAG:
constructor() {
    // ...
    this.state.isDirty = true; // Нужна перерисовка?
}

// Устанавливать флаг при изменениях:
attachWeight(weightId) {
    // ... код добавления груза ...
    this.state.isDirty = true; // Пометить для перерисовки
}

// В animationLoop проверять:
animationLoop() {
    if (this.state.isDirty || this.state.isAnimating) {
        this.render();
        this.state.isDirty = false;
    }
    this.currentAnimation = requestAnimationFrame(() => this.animationLoop());
}
```

---

### 7. Debounce для resize
**Файл:** `experiments/kit2/experiment-1-spring.js`

```javascript
// ✅ ДОБАВИТЬ DEBOUNCE:
constructor() {
    // ...
    this.resizeTimeout = null;
    this.handleResize = this.handleResize.bind(this);
}

setupEventListeners() {
    window.addEventListener('resize', () => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.handleResize();
        }, 150); // 150ms задержка
    });
}
```

---

### 8. Безопасное сравнение float
**Файл:** `experiments/shared/physics-engine.js`

```javascript
// ✅ ДОБАВИТЬ КОНСТАНТУ:
const EPSILON = 1e-10;

// Использовать:
function calculateElongation(force, stiffness) {
    if (Math.abs(stiffness) < EPSILON) {  // ✅ Вместо === 0
        throw new Error('Жёсткость не может быть нулевой');
    }
    // ...
}
```

---

## 🟢 УЛУЧШЕНИЯ (технический долг)

### 9. Константы вместо магических чисел
**Файл:** `experiments/kit2/experiment-1-spring.js`

```javascript
// ✅ В начале файла:
const PHYSICS_CONSTANTS = {
    MAX_FORCE_N: 10,
    MAX_ELONGATION_CM: 50,
    PIXELS_PER_CM: 40,
    GRAVITY_MS2: 9.8,
    MIN_MEASUREMENT_FORCE: 0.1,
    MAX_OSCILLATION_AMPLITUDE: 100
};

// Использовать:
if (force > PHYSICS_CONSTANTS.MAX_FORCE_N) {
    throw new RangeError(`Сила превышает максимум: ${PHYSICS_CONSTANTS.MAX_FORCE_N} Н`);
}
```

---

### 10. Map вместо массива для быстрого поиска
**Файл:** `experiments/kit2/experiment-1-spring.js`

```javascript
// ✅ ОПТИМИЗАЦИЯ:
constructor() {
    // ...
    // Создать Map для O(1) доступа
    this.weightsInventoryMap = new Map(
        this.weightsInventory.map(w => [w.id, w])
    );
}

// Использовать:
getWeight(weightId) {
    return this.weightsInventoryMap.get(weightId); // O(1) вместо O(n)
}
```

---

### 11. ARIA атрибуты
**Файл:** `index.html`

```html
<!-- ✅ ДОБАВИТЬ: -->
<button 
    class="carousel-btn prev" 
    data-kit="1"
    aria-label="Предыдущий слайд"
    aria-controls="carouselKit1">
    ‹
</button>

<section 
    class="kit-section" 
    id="kit2" 
    aria-labelledby="kit2-title"
    role="region">
    <h2 id="kit2-title">КОМПЛЕКТ №2</h2>
    <!-- ... -->
</section>
```

---

### 12. Explicit unit suffixes
**Файл:** `experiments/kit2/experiment-1-spring.js`

```javascript
// ✅ ЯСНЫЕ ИМЕНА:
this.state = {
    // ❌ БЫЛО:
    springLength: 140,
    springElongation: 0,
    
    // ✅ ДОЛЖНО БЫТЬ:
    springLengthPx: 140,
    springElongationCm: 0,
    currentForcN: 0,
    totalMassG: 0
};
```

---

## 📝 ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ

### ESLint Configuration
Создать файл `.eslintrc.json`:

```json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "no-magic-numbers": ["warn", { 
      "ignore": [0, 1, -1],
      "enforceConst": true 
    }],
    "eqeqeq": ["error", "always"],
    "no-var": "error",
    "prefer-const": "warn"
  }
}
```

### Git Pre-commit Hook
Создать `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Запуск линтера перед коммитом
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Линтер нашёл ошибки. Исправьте перед коммитом."
    exit 1
fi
```

---

## 🎯 ПРИОРИТЕТЫ

### Сегодня (2-3 часа):
- [x] Проблема #1: Canvas проверки
- [x] Проблема #2: Валидация ввода  
- [x] Проблема #3: XSS защита
- [ ] Проблема #4: localStorage
- [ ] Проблема #5: Cleanup

### Эта неделя:
- [ ] Проблема #6: Dirty flag
- [ ] Проблема #7: Debounce
- [ ] Проблема #8: EPSILON
- [ ] Добавить ESLint

### Этот месяц:
- [ ] Unit тесты для physics-engine
- [ ] E2E тесты с Playwright
- [ ] Разбить большой файл
- [ ] TypeScript migration (опционально)

---

## ✅ ЧЕКЛИСТ ПЕРЕД РЕЛИЗОМ

- [ ] Все КРИТИЧЕСКИЕ проблемы исправлены
- [ ] Добавлена валидация всех входов
- [ ] XSS уязвимости устранены
- [ ] Memory leaks исправлены
- [ ] localStorage с error handling
- [ ] ESLint проходит без ошибок
- [ ] Минимум 50% code coverage тестами
- [ ] Проверена работа в IE11/Edge/Safari
- [ ] Протестировано на мобильных устройствах
- [ ] Документация обновлена

---

**Удачи в разработке! 🚀**
