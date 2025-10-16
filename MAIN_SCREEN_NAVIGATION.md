# 🎨 ГЛАВНЫЙ ЭКРАН ПРОЕКТА - НАВИГАЦИЯ ПО ВСЕМ КОМПЛЕКТАМ И ОПЫТАМ

**Версия:** 2.0 (Глобальная навигация)  
**Дата:** 16 октября 2025  
**Цель:** Создать стильный главный экран со всеми 5 комплектами и 33 опытами

---

## 🌍 АНАЛИЗ ЛУЧШИХ МИРОВЫХ ПРАКТИК ДЛЯ ГЛАВНЫХ ЭКРАНОВ

### 1. **Netflix / Disney+ (Медиа платформы)**

**Навигация:**
```
┌────────────────────────────────────────────────────┐
│ [Hero Banner] - Рекомендуемый опыт                │
│ "Начните с этого эксперимента!"                   │
├────────────────────────────────────────────────────┤
│ Комплект №1: Механика (Плотность) ▶              │
│ [Card] [Card] [Card] [Card] [Card] → еще         │
├────────────────────────────────────────────────────┤
│ Комплект №2: Механика (Пружины) ▶                │
│ [Card] [Card] [Card] [Card] [Card] [Card] [Card]→│
├────────────────────────────────────────────────────┤
│ Комплект №3: Электричество ▶                      │
│ [Card] [Card] [Card] [Card] [Card] [Card] ...    │
└────────────────────────────────────────────────────┘
```

**Принципы:**
- ✅ **Горизонтальная прокрутка** по опытам внутри комплекта
- ✅ **Вертикальная прокрутка** между комплектами
- ✅ **Hero секция** вверху с главным призывом
- ✅ **Категории-строки** (каждый комплект = строка)

---

### 2. **Duolingo (Обучающие платформы)**

**Навигация:**
```
┌────────────────────────────────────────────┐
│        [Ваш путь обучения]                │
│                                            │
│   ●═══○───○───○───○    25% пройдено      │
│   │   │   │   │   │                       │
│  №1  №2  №3  №4  №6                      │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ КОМПЛЕКТ №1: Механика - Плотность   │  │
│ │ ✓✓✓░░  3/5 опытов                   │  │
│ │ [Продолжить →]                       │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ КОМПЛЕКТ №2: Механика - Пружины     │  │
│ │ ●●●●●●● 7 опытов                    │  │
│ │ [Начать →]                           │  │
│ └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**Принципы:**
- ✅ **Линейный прогресс** вверху
- ✅ **Блоки комплектов** с прогрессом
- ✅ **Визуальная связь** между комплектами
- ✅ **Call-to-action** для следующего шага

---

### 3. **Coursera / Udemy (Курсы)**

**Навигация:**
```
┌────────────────────────────────────────────────┐
│ Курс: Экспериментальная физика для ОГЭ       │
├────────────────────────────────────────────────┤
│ ┌─ Раздел 1: Механика I                      │
│ │  ├─ ✓ Опыт 1.1: Плотность вещества         │
│ │  ├─ ✓ Опыт 1.2: Архимедова сила            │
│ │  ├─ ○ Опыт 1.3: Зависимость F_A от V       │
│ │  └─ 🔒 Опыт 1.4: Зависимость F_A от ρ     │
│ ├─ Раздел 2: Механика II                     │
│ │  ├─ ● Опыт 2.1: Жесткость пружины          │
│ │  ├─ ○ Опыт 2.2: Коэффициент трения         │
│ │  └─ 🔒 Опыт 2.3: Работа силы трения       │
│ └─ Раздел 3: Электричество                   │
│    └─ 🔒 9 опытов                            │
└────────────────────────────────────────────────┘
```

**Принципы:**
- ✅ **Иерархическая структура** (комплект → опыт)
- ✅ **Статусы** (✓ завершен, ● в процессе, ○ доступен, 🔒 заблокирован)
- ✅ **Разворачиваемые секции** (accordion)
- ✅ **Линейная последовательность**

---

### 4. **Apple App Store (Категории + Поиск)**

**Навигация:**
```
┌────────────────────────────────────────────────┐
│ [🔍 Поиск]              [Фильтры ▼]          │
├────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │Все   │ │Механ.│ │Элект.│ │Оптика│          │
│ └──────┘ └──────┘ └──────┘ └──────┘          │
├────────────────────────────────────────────────┤
│ 📌 Рекомендуемые                              │
│ [Card] [Card] [Card]                          │
├────────────────────────────────────────────────┤
│ ⭐ Популярные                                  │
│ [Card] [Card] [Card] [Card]                   │
├────────────────────────────────────────────────┤
│ 🆕 Новые                                       │
│ [Card] [Card] [Card]                          │
└────────────────────────────────────────────────┘
```

**Принципы:**
- ✅ **Поиск** для быстрого доступа
- ✅ **Фильтры** по категориям
- ✅ **Курируемые подборки** (Рекомендуемые, Популярные)
- ✅ **Гибкая навигация**

---

## 🎯 МОЯ РЕКОМЕНДАЦИЯ ДЛЯ ВАШЕГО ПРОЕКТА

### **HYBRID ПОДХОД: "Netflix + Duolingo"**

Комбинируйте лучшее из двух миров:
- **Netflix**: Горизонтальные карусели по опытам
- **Duolingo**: Визуальный прогресс по комплектам

---

## 🖼️ ФИНАЛЬНЫЙ ДИЗАЙН ГЛАВНОГО ЭКРАНА

```
╔══════════════════════════════════════════════════════════════╗
║                    HEADER                                     ║
║  [Logo Labosfera] ──────────────────── [Профиль] [Помощь]   ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  HERO SECTION (Feature Banner)                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │                                                         │  ║
║  │  [Фоновое изображение: Лаборатория]                   │  ║
║  │                                                         │  ║
║  │  Виртуальная лаборатория физики                       │  ║
║  │  для подготовки к ОГЭ 2025                            │  ║
║  │                                                         │  ║
║  │  ✓ 5 комплектов оборудования Labosfera               │  ║
║  │  ✓ 33 интерактивных эксперимента                      │  ║
║  │  ✓ Полное соответствие спецификации ФИПИ             │  ║
║  │                                                         │  ║
║  │  [▶ Начать обучение]  [📖 О проекте]                 │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ПРОГРЕСС-ПАТ (Progress Path)                                ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  Ваш путь обучения:                                    │  ║
║  │                                                         │  ║
║  │    ●═══════●───────○───────○───────○                  │  ║
║  │    │       │       │       │       │                   │  ║
║  │   №1      №2      №3      №4      №6                 │  ║
║  │  ✓ 3/5   🔥 0/7   🔒     🔒      🔒                  │  ║
║  │                                                         │  ║
║  │  [░░░░░░░░░░░░░░░░░░░░] 9% (3/33 опыта)              │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  КОМПЛЕКТ №1: Механика - Плотность и Архимедова сила        ║
║  ┌──────────────────────────────────────────┐               ║
║  │ ⚖️ Комплект №1 | ⏱️ ~2.5 часа | ⭐ 60% | ✓ 3/5 опытов │  ║
║  └──────────────────────────────────────────┘               ║
║                                                               ║
║  ← [Card] [Card] [Card] [Card] [Card] →                     ║
║    ✓       ✓       ✓       ○       🔒                       ║
║                                                               ║
║  [↓ Развернуть все опыты]                                   ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  КОМПЛЕКТ №2: Механика - Пружины и трение 🔥 АКТИВНЫЙ       ║
║  ┌──────────────────────────────────────────┐               ║
║  │ 🔧 Комплект №2 | ⏱️ ~3 часа | ⭐ 0% | ● 0/7 опытов    │  ║
║  └──────────────────────────────────────────┘               ║
║                                                               ║
║  ← [Card] [Card] [Card] [Card] [Card] [Card] [Card] →      ║
║    ●       ○       ○       ○       ○       ○       ○        ║
║                                                               ║
║  [▶ НАЧАТЬ ЭКСПЕРИМЕНТЫ]                                    ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  КОМПЛЕКТ №3: Электричество 🔒                               ║
║  ┌──────────────────────────────────────────┐               ║
║  │ ⚡ Комплект №3 | ⏱️ ~4 часа | 🔒 9 опытов              │  ║
║  │ 🚧 В РАЗРАБОТКЕ - Доступен скоро                       │  ║
║  └──────────────────────────────────────────┘               ║
║                                                               ║
║  [🔒] [🔒] [🔒] [🔒] [🔒] [🔒] [🔒] [🔒] [🔒]              ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  КОМПЛЕКТ №4: Оптика - Линзы и преломление 🔒               ║
║  ┌──────────────────────────────────────────┐               ║
║  │ 🔍 Комплект №4 | ⏱️ ~3 часа | 🔒 6 опытов              │  ║
║  │ 🚧 В РАЗРАБОТКЕ                                         │  ║
║  └──────────────────────────────────────────┘               ║
║                                                               ║
║  [🔒] [🔒] [🔒] [🔒] [🔒] [🔒]                              ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  КОМПЛЕКТ №6: Оптика - Преломление света 🔒                 ║
║  ┌──────────────────────────────────────────┐               ║
║  │ 🌈 Комплект №6 | ⏱️ ~3 часа | 🔒 6 опытов              │  ║
║  │ 🚧 В РАЗРАБОТКЕ                                         │  ║
║  └──────────────────────────────────────────┘               ║
║                                                               ║
║  [🔒] [🔒] [🔒] [🔒] [🔒] [🔒]                              ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  FOOTER                                                       ║
║  [Logo Labosfera] | www.labosfera.ru | © 2025                ║
║  [Помощь] [О проекте] [Контакты] [ФИПИ 2025]                ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 🎨 ДЕТАЛИЗАЦИЯ КОМПОНЕНТОВ

### 1. **HERO SECTION (Feature Banner)**

```html
<section class="hero-banner">
    <div class="hero-overlay"></div>
    <div class="hero-content">
        <h1 class="hero-title">
            Виртуальная лаборатория физики<br>
            для подготовки к ОГЭ 2025
        </h1>
        <p class="hero-subtitle">
            Полный набор интерактивных экспериментов 
            с оборудованием Labosfera
        </p>
        <div class="hero-features">
            <div class="feature-item">
                <span class="feature-icon">✓</span>
                <span>5 комплектов оборудования</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">✓</span>
                <span>33 интерактивных эксперимента</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">✓</span>
                <span>Полное соответствие ФИПИ</span>
            </div>
        </div>
        <div class="hero-actions">
            <button class="btn-hero-primary">
                ▶ Начать обучение
            </button>
            <button class="btn-hero-secondary">
                📖 О проекте
            </button>
        </div>
    </div>
</section>
```

**CSS:**
```css
.hero-banner {
    position: relative;
    height: 500px;
    background: linear-gradient(135deg, 
        rgba(0, 102, 204, 0.9) 0%,
        rgba(0, 168, 107, 0.9) 100%),
        url('assets/hero-lab-bg.jpg') center/cover;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    text-align: center;
    padding: 40px;
}

.hero-title {
    font-size: 48px;
    font-weight: 800;
    margin-bottom: 20px;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.hero-features {
    display: flex;
    justify-content: center;
    gap: 40px;
    margin: 30px 0;
    flex-wrap: wrap;
}

.feature-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
}

.btn-hero-primary {
    padding: 18px 48px;
    font-size: 20px;
    font-weight: 700;
    background: white;
    color: #0066CC;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.3s;
}

.btn-hero-primary:hover {
    transform: scale(1.05);
    box-shadow: 0 12px 36px rgba(255, 255, 255, 0.4);
}
```

---

### 2. **PROGRESS PATH (Прогресс-пат)**

```html
<section class="progress-path">
    <h2>Ваш путь обучения</h2>
    <div class="path-visualization">
        <div class="path-node completed" data-kit="1">
            <div class="node-circle">№1</div>
            <div class="node-status">✓ 3/5</div>
        </div>
        <div class="path-line completed"></div>
        
        <div class="path-node active" data-kit="2">
            <div class="node-circle">№2</div>
            <div class="node-status">🔥 0/7</div>
        </div>
        <div class="path-line"></div>
        
        <div class="path-node locked" data-kit="3">
            <div class="node-circle">№3</div>
            <div class="node-status">🔒</div>
        </div>
        <div class="path-line"></div>
        
        <div class="path-node locked" data-kit="4">
            <div class="node-circle">№4</div>
            <div class="node-status">🔒</div>
        </div>
        <div class="path-line"></div>
        
        <div class="path-node locked" data-kit="6">
            <div class="node-circle">№6</div>
            <div class="node-status">🔒</div>
        </div>
    </div>
    <div class="overall-progress">
        <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: 9%"></div>
        </div>
        <div class="progress-text">9% (3/33 опыта выполнено)</div>
    </div>
</section>
```

**CSS:**
```css
.progress-path {
    max-width: 1200px;
    margin: 60px auto;
    padding: 40px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.path-visualization {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 40px 0;
}

.path-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.node-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    border: 4px solid #E0E0E0;
    background: white;
    transition: all 0.3s;
}

.path-node.completed .node-circle {
    background: linear-gradient(135deg, #00A86B, #008C5A);
    color: white;
    border-color: #00A86B;
}

.path-node.active .node-circle {
    background: linear-gradient(135deg, #0066CC, #0052A3);
    color: white;
    border-color: #0066CC;
    animation: pulse 2s infinite;
}

.path-node.locked .node-circle {
    background: #F5F5F5;
    color: #BDBDBD;
    border-color: #E0E0E0;
}

.path-line {
    flex: 1;
    height: 4px;
    background: #E0E0E0;
    margin: 0 20px;
}

.path-line.completed {
    background: linear-gradient(90deg, #00A86B, #0066CC);
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(0, 102, 204, 0.7);
    }
    50% {
        transform: scale(1.05);
        box-shadow: 0 0 0 20px rgba(0, 102, 204, 0);
    }
}
```

---

### 3. **KIT SECTION (Секция комплекта)**

```html
<section class="kit-section" data-kit-id="2" data-status="active">
    <!-- Заголовок комплекта -->
    <div class="kit-header">
        <div class="kit-title-row">
            <h2 class="kit-title">
                <span class="kit-icon">🔧</span>
                КОМПЛЕКТ №2: Механика - Пружины и трение
                <span class="kit-badge active">🔥 АКТИВНЫЙ</span>
            </h2>
        </div>
        <div class="kit-meta">
            <span class="meta-tag">
                <span class="meta-icon">🔬</span>
                Комплект №2
            </span>
            <span class="meta-tag">
                <span class="meta-icon">⏱️</span>
                ~3 часа
            </span>
            <span class="meta-tag">
                <span class="meta-icon">⭐</span>
                0% пройдено
            </span>
            <span class="meta-tag">
                <span class="meta-icon">●</span>
                0/7 опытов
            </span>
        </div>
    </div>

    <!-- Карусель опытов -->
    <div class="experiments-carousel">
        <button class="carousel-btn prev">‹</button>
        <div class="carousel-track">
            <!-- 7 карточек опытов -->
            <div class="experiment-card-mini" data-exp-id="1">
                <div class="card-mini-number">01</div>
                <img src="фото оборудования/Пружина 1.png" 
                     class="card-mini-photo" alt="Пружина">
                <h4 class="card-mini-title">Жесткость пружины</h4>
                <div class="card-mini-meta">
                    <span>⏱️ 25 мин</span>
                    <span>⭐ Легко</span>
                </div>
                <button class="btn-mini-start">▶ Начать</button>
            </div>
            
            <!-- Еще 6 карточек... -->
        </div>
        <button class="carousel-btn next">›</button>
    </div>

    <!-- Кнопка "Развернуть все" -->
    <div class="kit-actions">
        <button class="btn-expand-all">
            ↓ Развернуть все опыты
        </button>
        <button class="btn-start-kit">
            ▶ НАЧАТЬ ЭКСПЕРИМЕНТЫ
        </button>
    </div>

    <!-- Развернутый список (скрыт по умолчанию) -->
    <div class="kit-expanded-content" style="display: none;">
        <div class="experiments-grid-full">
            <!-- Полные карточки всех 7 опытов -->
        </div>
    </div>
</section>
```

**CSS для карусели:**
```css
.experiments-carousel {
    position: relative;
    margin: 30px 0;
}

.carousel-track {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    scroll-behavior: smooth;
    padding: 20px 0;
    -webkit-overflow-scrolling: touch;
}

/* Скрываем scrollbar но оставляем функциональность */
.carousel-track::-webkit-scrollbar {
    height: 8px;
}

.carousel-track::-webkit-scrollbar-track {
    background: #F5F5F5;
    border-radius: 4px;
}

.carousel-track::-webkit-scrollbar-thumb {
    background: #0066CC;
    border-radius: 4px;
}

.experiment-card-mini {
    flex: 0 0 280px;
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    transition: all 0.3s;
    cursor: pointer;
}

.experiment-card-mini:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 32px rgba(0, 102, 204, 0.2);
}

.card-mini-number {
    font-size: 48px;
    font-weight: 800;
    color: #E0E0E0;
    line-height: 1;
    margin-bottom: 10px;
}

.card-mini-photo {
    width: 100%;
    height: 150px;
    object-fit: contain;
    margin: 15px 0;
}

.card-mini-title {
    font-size: 16px;
    font-weight: 600;
    color: #2C3E50;
    margin-bottom: 10px;
    line-height: 1.3;
}

.carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: white;
    border: 2px solid #0066CC;
    color: #0066CC;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
    transition: all 0.3s;
}

.carousel-btn:hover {
    background: #0066CC;
    color: white;
    transform: translateY(-50%) scale(1.1);
}

.carousel-btn.prev {
    left: -25px;
}

.carousel-btn.next {
    right: -25px;
}
```

---

### 4. **KIT SECTION - "В РАЗРАБОТКЕ"**

```html
<section class="kit-section locked" data-kit-id="3" data-status="locked">
    <div class="kit-header">
        <h2 class="kit-title">
            <span class="kit-icon">⚡</span>
            КОМПЛЕКТ №3: Электричество
            <span class="kit-badge locked">🔒</span>
        </h2>
        <div class="kit-meta">
            <span class="meta-tag">
                <span class="meta-icon">🔬</span>
                Комплект №3
            </span>
            <span class="meta-tag">
                <span class="meta-icon">⏱️</span>
                ~4 часа
            </span>
            <span class="meta-tag">
                <span class="meta-icon">🔒</span>
                9 опытов
            </span>
        </div>
    </div>

    <!-- Превью заблокированных опытов -->
    <div class="locked-preview">
        <div class="locked-overlay">
            <div class="locked-content">
                <div class="locked-icon">🚧</div>
                <h3>В РАЗРАБОТКЕ</h3>
                <p>Этот комплект будет доступен в следующей версии</p>
                <button class="btn-notify">
                    🔔 Уведомить о готовности
                </button>
            </div>
        </div>
        <div class="experiments-preview-locked">
            <div class="locked-card"></div>
            <div class="locked-card"></div>
            <div class="locked-card"></div>
            <div class="locked-card"></div>
            <div class="locked-card"></div>
            <!-- 9 заблокированных карточек -->
        </div>
    </div>
</section>
```

**CSS:**
```css
.kit-section.locked {
    opacity: 0.7;
    pointer-events: none;
}

.locked-preview {
    position: relative;
    min-height: 300px;
}

.locked-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(5px);
    z-index: 10;
    border-radius: 16px;
}

.locked-content {
    text-align: center;
    padding: 40px;
}

.locked-icon {
    font-size: 80px;
    margin-bottom: 20px;
}

.locked-content h3 {
    font-size: 32px;
    color: #FF6B35;
    margin-bottom: 15px;
}

.experiments-preview-locked {
    display: flex;
    gap: 20px;
    padding: 20px;
    filter: blur(3px);
}

.locked-card {
    width: 200px;
    height: 280px;
    background: linear-gradient(135deg, #E0E0E0, #F5F5F5);
    border-radius: 12px;
    animation: pulse-locked 2s infinite;
}

@keyframes pulse-locked {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.5; }
}
```

---

## 🎨 ДОПОЛНИТЕЛЬНЫЕ ФИЧИ

### 1. **Поиск и фильтры (опционально)**

```html
<div class="search-filters-bar">
    <div class="search-box">
        <input type="text" placeholder="🔍 Поиск эксперимента..." 
               id="searchInput">
    </div>
    <div class="filters">
        <button class="filter-btn active" data-category="all">
            Все (33)
        </button>
        <button class="filter-btn" data-category="mechanics">
            Механика (12)
        </button>
        <button class="filter-btn" data-category="electricity">
            Электричество (9)
        </button>
        <button class="filter-btn" data-category="optics">
            Оптика (12)
        </button>
    </div>
    <div class="sort">
        <select id="sortSelect">
            <option value="default">По порядку</option>
            <option value="duration">По времени</option>
            <option value="difficulty">По сложности</option>
        </select>
    </div>
</div>
```

---

### 2. **Быстрый доступ (Sticky Nav)**

```html
<nav class="quick-nav" id="quickNav">
    <a href="#kit1" class="quick-nav-item completed">
        №1 <span class="quick-status">✓</span>
    </a>
    <a href="#kit2" class="quick-nav-item active">
        №2 <span class="quick-status">🔥</span>
    </a>
    <a href="#kit3" class="quick-nav-item locked">
        №3 <span class="quick-status">🔒</span>
    </a>
    <a href="#kit4" class="quick-nav-item locked">
        №4 <span class="quick-status">🔒</span>
    </a>
    <a href="#kit6" class="quick-nav-item locked">
        №6 <span class="quick-status">🔒</span>
    </a>
</nav>
```

**CSS:**
```css
.quick-nav {
    position: sticky;
    top: 80px; /* под header */
    background: white;
    padding: 15px 0;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    display: flex;
    justify-content: center;
    gap: 20px;
    z-index: 100;
}

.quick-nav-item {
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    color: #2C3E50;
    font-weight: 600;
    transition: all 0.3s;
}

.quick-nav-item.active {
    background: linear-gradient(135deg, #0066CC, #00A86B);
    color: white;
}

.quick-nav-item.completed {
    background: #E8F5E9;
    color: #00A86B;
}

.quick-nav-item.locked {
    opacity: 0.5;
    cursor: not-allowed;
}
```

---

### 3. **Модальное окно "О комплекте"**

```html
<div class="modal" id="kitInfoModal">
    <div class="modal-content">
        <button class="modal-close">×</button>
        <div class="modal-header">
            <h2>Комплект №2: Механика - Пружины и трение</h2>
        </div>
        <div class="modal-body">
            <div class="modal-section">
                <h3>📦 Оборудование комплекта</h3>
                <div class="equipment-grid">
                    <div class="equipment-item">
                        <img src="фото оборудования/Пружина 1.png" alt="">
                        <p>Пружина 1 (k=50 Н/м)</p>
                    </div>
                    <!-- ... остальное оборудование -->
                </div>
            </div>
            <div class="modal-section">
                <h3>🎯 Цели обучения</h3>
                <ul>
                    <li>Изучить закон Гука</li>
                    <li>Понять природу силы трения</li>
                    <li>Научиться измерять работу силы</li>
                </ul>
            </div>
            <div class="modal-section">
                <h3>📚 7 экспериментов</h3>
                <ol>
                    <li>Измерение жесткости пружины</li>
                    <li>Измерение коэффициента трения</li>
                    <!-- ... -->
                </ol>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn-primary">Начать обучение</button>
        </div>
    </div>
</div>
```

---

## 📱 АДАПТИВНОСТЬ

### **Desktop (>1200px):**
- Hero: полная высота
- Progress Path: горизонтальный
- Карусель: 4 карточки видимы
- Quick Nav: sticky

### **Tablet (768-1200px):**
- Hero: уменьшенная высота
- Progress Path: меньше отступы
- Карусель: 2-3 карточки
- Quick Nav: скрыть статусы

### **Mobile (<768px):**
- Hero: вертикальный layout
- Progress Path: вертикальный список
- Карусель: 1 карточка + swipe
- Quick Nav: горизонтальный scroll

---

## 🎬 ПРИОРИТЕТ РЕАЛИЗАЦИИ

### **ФАЗА 1: MVP (8-10 часов)** ⚡

1. ✅ Header
2. ✅ Hero Banner
3. ✅ Progress Path (упрощенный)
4. ✅ 5 секций комплектов
5. ✅ Карусель опытов для №2
6. ✅ "В разработке" для №1, 3, 4, 6
7. ✅ Footer

### **ФАЗА 2: Полировка (4-6 часов)** ⭐

8. ⭐ Hover эффекты
9. ⭐ Анимации появления
10. ⭐ Smooth scroll к комплектам
11. ⭐ Quick Nav (sticky)
12. ⭐ Адаптивность

### **ФАЗА 3: Расширенные (6-8 часов)** 🚀

13. 🚀 Поиск и фильтры
14. 🚀 Модальные окна
15. 🚀 Сохранение прогресса
16. 🚀 Уведомления

---

## 💡 ФИНАЛЬНАЯ РЕКОМЕНДАЦИЯ

**Для вашего проекта используйте:**

1. **Hero Banner** - сразу показывает масштаб (33 опыта!)
2. **Progress Path** - визуализирует путь обучения
3. **Горизонтальные карусели** - компактно показывают все опыты комплекта
4. **"В разработке" overlay** - красиво показывает будущие комплекты
5. **Sticky Quick Nav** - быстрый переход между комплектами

**Это будет:**
- ✅ Стильно (Netflix-style)
- ✅ Удобно (все на одном экране)
- ✅ Мотивирующе (прогресс виден)
- ✅ Профессионально (как Labosfera.ru)

---

## 🚀 ГОТОВЫ К РЕАЛИЗАЦИИ?

Скажите слово - и я создам:
1. ✅ Полный HTML главного экрана
2. ✅ CSS с анимациями
3. ✅ JavaScript для каруселей и модалок
4. ✅ Адаптивный дизайн

**Делаем главный экран мечты?** 🎨
