# 🎯 ТЕХНИЧЕСКОЕ РЕШЕНИЕ: Работа с PNG изображениями

## Проблема: Как анимировать PNG?

PNG файлы статичные, но нам нужно:
- Пружина растягивается/сжимается
- Брусок едет по направляющей
- Стрелка динамометра вращается
- Грузы падают/укладываются

---

## 🔧 РЕШЕНИЯ

### Вариант 1: Canvas Sprite Manipulation ⭐⭐⭐⭐⭐ (РЕКОМЕНДУЮ)

**Принцип:** PNG разбивается на части, части трансформируются

#### Пример: Растяжение пружины

```javascript
class SpringAnimator {
    constructor(imagePath) {
        this.image = new Image();
        this.image.src = imagePath; // 'фото оборудования/Пружина 1.png'
        
        // Разбиваем пружину на витки
        this.coilHeight = 15; // пикселей на виток
        this.coilCount = 10;  // количество витков
        this.initialLength = 150; // px
    }
    
    draw(ctx, stretchFactor) {
        const stretchedLength = this.initialLength * stretchFactor;
        const newCoilHeight = stretchedLength / this.coilCount;
        
        // Рисуем каждый виток отдельно
        for (let i = 0; i < this.coilCount; i++) {
            ctx.drawImage(
                this.image,
                0, i * this.coilHeight,           // source x, y
                this.image.width, this.coilHeight, // source w, h
                x, y + i * newCoilHeight,         // dest x, y
                this.image.width, newCoilHeight   // dest w, h (растянуто!)
            );
        }
    }
}

// Использование
const spring = new SpringAnimator('фото оборудования/Пружина 1.png');
spring.draw(ctx, 1.5); // Растянута в 1.5 раза
```

**Плюсы:**
- ✅ Реалистично (используем реальное фото)
- ✅ Точно (pixelPerfect rendering)
- ✅ Быстро (Canvas API оптимизирован)

---

### Вариант 2: CSS Transform + PNG ⭐⭐⭐⭐

**Принцип:** PNG как DOM элемент, трансформируем через CSS

#### Пример: Движение бруска

```html
<div class="experiment-area">
    <img src="фото оборудования/направляющая.png" class="track" />
    <img src="фото оборудования/брусок.png" 
         class="block" 
         id="movableBlock"
         style="left: 0px;" />
</div>
```

```javascript
class BlockMover {
    constructor(blockElement) {
        this.block = blockElement;
        this.position = 0;
    }
    
    moveToPosition(targetX, duration = 1000) {
        anime({
            targets: this.block,
            left: targetX + 'px',
            duration: duration,
            easing: 'easeOutQuad',
            update: (anim) => {
                // Callback для звука трения
                if (anim.progress > 0 && anim.progress < 100) {
                    this.playFrictionSound();
                }
            }
        });
    }
}
```

**Плюсы:**
- ✅ Простота (обычный HTML/CSS)
- ✅ Hardware acceleration (GPU)
- ✅ Легко дебажить (DevTools)

---

### Вариант 3: Sprite Sheets (если нужно много кадров) ⭐⭐⭐

**Принцип:** Заранее создаем несколько кадров анимации

#### Структура:
```
assets/animations/
├── spring-stretch-01.png  (0% растяжение)
├── spring-stretch-02.png  (10%)
├── spring-stretch-03.png  (20%)
├── ...
└── spring-stretch-10.png  (100%)
```

```javascript
class SpriteAnimation {
    constructor(frames) {
        this.frames = frames.map(path => {
            const img = new Image();
            img.src = path;
            return img;
        });
        this.currentFrame = 0;
    }
    
    setStretch(percentage) {
        // Находим ближайший кадр
        this.currentFrame = Math.floor(percentage / 10);
    }
    
    draw(ctx, x, y) {
        const frame = this.frames[this.currentFrame];
        ctx.drawImage(frame, x, y);
    }
}
```

**Минусы:**
- ❌ Нужно создавать много PNG вручную
- ❌ Больше размер файлов

---

### Вариант 4: Hybrid - PNG Base + SVG Overlay ⭐⭐⭐⭐

**Принцип:** PNG фон + SVG элементы для динамики

#### Пример: Динамометр

```html
<div class="dynamometer">
    <!-- PNG шкалы -->
    <img src="фото оборудования/динамометр.png" class="base" />
    
    <!-- SVG стрелка поверх -->
    <svg class="arrow-overlay">
        <g transform="rotate(0, 50, 50)">
            <line x1="50" y1="50" x2="50" y2="10" 
                  stroke="red" stroke-width="2" />
            <circle cx="50" cy="50" r="3" fill="red" />
        </g>
    </svg>
</div>
```

```javascript
class DynamometerArrow {
    rotateToForce(force, maxForce = 5) {
        const angle = (force / maxForce) * 180; // 0° to 180°
        
        anime({
            targets: '.arrow-overlay g',
            transform: `rotate(${angle}, 50, 50)`,
            duration: 500,
            easing: 'easeOutElastic(1, .8)'
        });
    }
}
```

**Плюсы:**
- ✅ Лучшее из обоих миров
- ✅ PNG = реализм, SVG = гибкость
- ✅ Малый размер файлов

---

## 🎨 ПРАКТИЧЕСКИЕ ТЕХНИКИ

### 1. **Layered Composition**

```javascript
class ExperimentCanvas {
    constructor() {
        this.layers = {
            background: document.createElement('canvas'), // Статика
            equipment: document.createElement('canvas'),  // PNG оборудование
            dynamic: document.createElement('canvas'),    // Движущиеся части
            effects: document.createElement('canvas'),    // Частицы
            ui: document.createElement('canvas')          // Циферки
        };
        
        this.mainCanvas = document.getElementById('main-canvas');
        this.ctx = this.mainCanvas.getContext('2d');
    }
    
    render() {
        // Clear main canvas
        this.ctx.clearRect(0, 0, w, h);
        
        // Composite все слои
        Object.values(this.layers).forEach(layer => {
            this.ctx.drawImage(layer, 0, 0);
        });
    }
}
```

**Почему круто:**
- Только изменившиеся слои перерисовываются
- 60 FPS даже на слабых устройствах

---

### 2. **Image Caching**

```javascript
class ImageCache {
    constructor() {
        this.cache = new Map();
    }
    
    async loadImage(path) {
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.cache.set(path, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = path;
        });
    }
    
    async preloadAll(paths) {
        return Promise.all(paths.map(p => this.loadImage(p)));
    }
}

// Использование
const cache = new ImageCache();
await cache.preloadAll([
    'фото оборудования/Пружина 1.png',
    'фото оборудования/брусок.png',
    'фото оборудования/динамометр.png'
]);
```

---

### 3. **Canvas Transform для вращения**

```javascript
class RotatableElement {
    draw(ctx, image, x, y, angle) {
        ctx.save();
        
        // Переносим origin в центр изображения
        ctx.translate(x + image.width/2, y + image.height/2);
        
        // Вращаем
        ctx.rotate(angle * Math.PI / 180);
        
        // Рисуем с центром в (0, 0)
        ctx.drawImage(
            image, 
            -image.width/2, 
            -image.height/2
        );
        
        ctx.restore();
    }
}

// Пример: Падающий груз
const weight = new RotatableElement();
weight.draw(ctx, weightImage, x, y, rotation);
```

---

### 4. **Pixel Manipulation для эффектов**

```javascript
class ImageEffects {
    // Свечение объекта (для показа энергии)
    addGlow(ctx, image, x, y, intensity) {
        // Сначала нормально
        ctx.drawImage(image, x, y);
        
        // Потом с blur и opacity
        ctx.globalAlpha = intensity;
        ctx.filter = `blur(${intensity * 10}px)`;
        ctx.drawImage(image, x, y);
        
        // Reset
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
    }
    
    // Fade in/out
    fadeIn(ctx, image, x, y, progress) {
        ctx.globalAlpha = progress;
        ctx.drawImage(image, x, y);
        ctx.globalAlpha = 1;
    }
}
```

---

## 🚀 ОПТИМИЗАЦИЯ

### OffscreenCanvas для фона

```javascript
class BackgroundRenderer {
    constructor(images) {
        // Предварительный рендер фона
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = 1920;
        this.offscreen.height = 1080;
        
        const ctx = this.offscreen.getContext('2d');
        
        // Рисуем все статичные элементы ОДИН РАЗ
        ctx.drawImage(images.table, 0, 0);
        ctx.drawImage(images.ruler, 100, 200);
        ctx.drawImage(images.stand, 300, 50);
    }
    
    render(mainCtx) {
        // Просто копируем готовый фон
        mainCtx.drawImage(this.offscreen, 0, 0);
    }
}
```

**Профит:** Фон рендерится 1 раз вместо 60 раз/сек!

---

### WebWorkers для физики

```javascript
// physics-worker.js
self.onmessage = (e) => {
    const { type, data } = e.data;
    
    if (type === 'calculate-spring') {
        const result = calculateSpringPhysics(data);
        self.postMessage({ type: 'spring-result', result });
    }
};

// main.js
const physicsWorker = new Worker('physics-worker.js');

physicsWorker.postMessage({
    type: 'calculate-spring',
    data: { k: 50, m: 0.1, x0: 0.05 }
});

physicsWorker.onmessage = (e) => {
    const { result } = e.data;
    updateSpringAnimation(result);
};
```

**Профит:** UI не тормозит даже при сложных расчетах!

---

## 📐 КОНКРЕТНЫЙ ПРИМЕР: ПРУЖИНА

### Исходное фото:
```
фото оборудования/Пружина 1  с жесткостью 50 Нм.png
Размер: ~800x600px
```

### Стратегия анимации:

```javascript
class SpringRenderer {
    constructor(imagePath) {
        this.baseImage = null;
        this.loadImage(imagePath);
        
        // Параметры пружины из фото
        this.topY = 50;      // Верх крепления
        this.bottomY = 200;  // Низ (без груза)
        this.segments = 12;  // Количество витков на фото
    }
    
    async loadImage(path) {
        this.baseImage = await loadImageAsync(path);
        this.analyzeSpring(); // Определяем границы витков
    }
    
    analyzeSpring() {
        // Автоматически находим витки (по изменению яркости)
        // Или задаем вручную координаты каждого витка
        this.coils = [
            { y: 50, height: 12 },
            { y: 62, height: 12 },
            // ... для каждого витка
        ];
    }
    
    draw(ctx, stretchAmount) {
        const totalStretch = stretchAmount; // в пикселях
        const stretchPerCoil = totalStretch / this.segments;
        
        let currentY = this.topY;
        
        this.coils.forEach((coil, i) => {
            // Растягиваем каждый виток
            const newHeight = coil.height + stretchPerCoil;
            
            ctx.drawImage(
                this.baseImage,
                0, coil.y,                    // source x, y
                this.baseImage.width, coil.height,
                0, currentY,                  // dest x, y
                this.baseImage.width, newHeight
            );
            
            currentY += newHeight;
        });
        
        // Рисуем нижнее крепление
        this.drawHook(ctx, currentY);
    }
}
```

---

## 🎬 ИТОГОВАЯ РЕКОМЕНДАЦИЯ

### Для Комплекта №2 используем:

| Элемент | Техника | Библиотека |
|---------|---------|------------|
| **Пружина** | Canvas sprite slicing | Vanilla JS |
| **Брусок** | CSS Transform + anime.js | anime.js |
| **Динамометр** | PNG base + SVG arrow | Vanilla JS |
| **Грузы** | CSS Transform + drag&drop | interact.js |
| **Частицы** | Canvas particles | Vanilla JS |
| **Графики** | Chart.js | Chart.js |

### Библиотеки:
```html
<!-- Анимации -->
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>

<!-- Drag & Drop -->
<script src="https://cdn.jsdelivr.net/npm/interactjs@1.10.19/dist/interact.min.js"></script>

<!-- Графики -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>

<!-- Звуки -->
<script src="https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.min.js"></script>
```

---

**Готов начинать реализацию первого опыта?** 🚀
