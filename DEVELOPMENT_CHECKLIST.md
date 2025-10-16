# ✅ ЧЕК-ЛИСТ РАЗРАБОТКИ: ИНТЕРАКТИВНЫЕ ОПЫТЫ КИТ №2

## 📋 ОБЩИЙ ПРОГРЕСС

```
Комплект №2: Механика (пружины, трение, рычаги)
┌────────────────────────────────────────┐
│ Опыт 1: Жёсткость пружины        [ ]  │
│ Опыт 2: Коэффициент трения       [ ]  │
│ Опыт 3: Работа силы трения       [ ]  │
│ Опыт 4: Работа силы упругости    [ ]  │
│ Опыт 5: Исследование F_тр        [ ]  │
│ Опыт 6: Закон Гука               [ ]  │
└────────────────────────────────────────┘
Прогресс: 0/6 (0%)
```

---

## 🎯 ОПЫТ 1: ИЗМЕРЕНИЕ ЖЁСТКОСТИ ПРУЖИНЫ

### Phase 1: Базовая функциональность
- [ ] HTML структура с Canvas
- [ ] Загрузка PNG пружины
- [ ] Класс SpringAnimator для растяжения
- [ ] Drag & Drop грузов
- [ ] Физика: расчет удлинения (Δl = F/k)
- [ ] Линейка с делениями
- [ ] Отображение измерений
- [ ] Построение графика F(Δl)

### Phase 2: Визуальные эффекты
- [ ] Плавная анимация растяжения (easing)
- [ ] Затухающие колебания при добавлении груза
- [ ] Particle effects при падении груза
- [ ] Подсветка линейки на уровне груза
- [ ] Point-by-point построение графика
- [ ] Линия регрессии с анимацией

### Phase 3: Звуки и фидбек
- [ ] Звук "динь" при добавлении груза
- [ ] Звук растяжения пружины
- [ ] Success sound при правильном измерении
- [ ] Haptic feedback на мобильных

### Phase 4: Gamification
- [ ] Progress tracker
- [ ] Hints system
- [ ] Achievement: "Точное измерение" (погрешность < 2%)
- [ ] Star rating по точности
- [ ] Таймер (для спидраннеров)

### Phase 5: Адаптивность
- [ ] Desktop layout (1920x1080)
- [ ] Tablet layout (1024x768)
- [ ] Mobile layout (375x667)
- [ ] Touch controls
- [ ] Keyboard shortcuts

---

## 🎯 ОПЫТ 2: КОЭФФИЦИЕНТ ТРЕНИЯ СКОЛЬЖЕНИЯ

### Phase 1: Базовая функциональность
- [ ] Canvas с направляющей
- [ ] PNG бруска (двигается)
- [ ] PNG динамометра (стрелка вращается)
- [ ] Mouse/touch drag для протягивания
- [ ] Физика трения: F_тр = μ × N
- [ ] Индикатор скорости движения
- [ ] Расчет μ = F_тр / N

### Phase 2: Визуальные эффекты
- [ ] Friction particles (пылинки)
- [ ] След от бруска (fade out)
- [ ] Вибрация динамометра при рывках
- [ ] Color indicator (зеленый/желтый/красный)
- [ ] Progress bar пути

### Phase 3: Звуки
- [ ] Звук трения (loop, зависит от скорости)
- [ ] Звук остановки
- [ ] Success/error feedback

### Phase 4: Gamification
- [ ] Scoring: точность движения (0-100%)
- [ ] Achievement: "Плавное движение"
- [ ] Retry с улучшением результата

---

## 🎯 ОПЫТ 3: РАБОТА СИЛЫ ТРЕНИЯ

### Phase 1: Базовая функциональность
- [ ] Выбор расстояния (10/20/30/40 см)
- [ ] Маркеры на направляющей
- [ ] Движение бруска с динамометром
- [ ] Progress bar пути
- [ ] Расчет A = F_тр × S (real-time)
- [ ] Энергобар (заполняется)

### Phase 2: Визуальные эффекты
- [ ] Energy particles от бруска
- [ ] Энергобар с gradient fill
- [ ] Counter "тикает" (countUp animation)
- [ ] Heat effect (искажение воздуха)
- [ ] График A(S)

### Phase 3: Звуки
- [ ] Звук трения
- [ ] "Тик" при каждом см пути
- [ ] Success sound при достижении финиша

---

## 🎯 ОПЫТ 4: РАБОТА СИЛЫ УПРУГОСТИ

### Phase 1: Базовая функциональность
- [ ] Drag груза вниз (растяжение)
- [ ] Кнопка "Отпустить"
- [ ] Полет груза вверх
- [ ] Измерение высоты подъема
- [ ] Расчет A = F × h
- [ ] Energy bars (E_п и E_к)

### Phase 2: Визуальные эффекты
- [ ] Свечение пружины (энергия)
- [ ] Particle burst при отпускании
- [ ] Trail effect за грузом
- [ ] Slow-motion в верхней точке
- [ ] Energy flow: E_п → E_к → E_п

### Phase 3: Звуки
- [ ] Звук "пиу!" при взлете
- [ ] Whoosh во время полета
- [ ] Success ding

---

## 🎯 ОПЫТ 5: ИССЛЕДОВАНИЕ F_тр (2 ЧАСТИ)

### Part A: От давления
- [ ] Drag & Drop грузов на брусок
- [ ] Stacking animation
- [ ] Автоматическое измерение F_тр
- [ ] Построение графика F_тр(N)
- [ ] Линия регрессии
- [ ] Определение μ из наклона

### Part B: От поверхности
- [ ] Кнопка "Сменить поверхность"
- [ ] Flip animation (3D переворот)
- [ ] Texture change (А → Б)
- [ ] Измерение F_тр на обеих
- [ ] Comparison bars
- [ ] Проверка теории (отношение μ)

### Эффекты
- [ ] Particle effects
- [ ] Sound effects
- [ ] Achievement: "Исследователь"

---

## 🎯 ОПЫТ 6: ЗАКОН ГУКА

### Phase 1: Базовая функциональность
- [ ] Выбор грузов (6 вариантов)
- [ ] Растяжение пружины
- [ ] Построение точек на графике
- [ ] Линия регрессии (динамическая)
- [ ] Расчет R²
- [ ] Определение k

### Phase 2: Gamification
- [ ] Цель: R² > 0.95
- [ ] Progress bar для R²
- [ ] Star rating (1-3 звезды)
- [ ] Achievement system
- [ ] Timer для бонуса

### Phase 3: Визуальные эффекты
- [ ] Particle trail (груз → точка)
- [ ] Линия рисуется плавно
- [ ] Конфетти при R² > 0.95
- [ ] Success animations

---

## 📚 SHARED КОМПОНЕНТЫ

### Physics Engine (`shared/physics-engine.js`)
- [ ] SpringPhysics: oscillations, damping
- [ ] FrictionPhysics: F_тр, μ
- [ ] WorkCalculations: A = F × S
- [ ] EnergyConservation: E_п ↔ E_к

### Canvas Utils (`shared/canvas-utils.js`)
- [ ] LayeredCanvas: multi-layer rendering
- [ ] ImageCache: preload & cache
- [ ] RotatableSprite: rotate PNG
- [ ] SpriteStretcher: stretch PNG

### Animation Engine (`shared/animation-engine.js`)
- [ ] Easing functions
- [ ] Tween system
- [ ] Spring animations
- [ ] Damping calculations

### Particle Effects (`shared/particle-effects.js`)
- [ ] ParticleSystem base class
- [ ] FrictionDust
- [ ] EnergyParticles
- [ ] SuccessSparkles
- [ ] ParticlePool (optimization)

### Sound Effects (`shared/sound-effects.js`)
- [ ] SoundManager
- [ ] Preload all sounds
- [ ] Volume control
- [ ] Sound sprites (optimization)

### UI Components (`shared/ui-components.js`)
- [ ] ProgressBar
- [ ] CounterDisplay (с countUp)
- [ ] GraphRenderer (Chart.js wrapper)
- [ ] HintTooltip
- [ ] AchievementPopup
- [ ] StarRating

---

## 🎨 ASSETS

### Images (PNG)
```
assets/equipment/
├── spring-50Nm.png          [✓ Есть]
├── spring-10Nm.png          [✓ Есть]
├── block.png                [✓ Есть]
├── dynamometer-5N.png       [✓ Есть]
├── dynamometer-1N.png       [✓ Есть]
├── track-surface-A.png      [✓ Есть]
├── track-surface-B.png      [✓ Есть]
├── weight-100g.png          [ ] Нужно
├── weight-200g.png          [ ] Нужно
├── weight-300g.png          [ ] Нужно
├── stand.png                [ ] Нужно
└── ruler.png                [ ] Нужно
```

### Sounds (MP3/WAV)
```
assets/sounds/
├── spring-stretch.mp3       [ ] Нужно
├── spring-release.mp3       [ ] Нужно
├── weight-drop.mp3          [ ] Нужно
├── weight-attach.mp3        [ ] Нужно
├── friction-slide.mp3       [ ] Нужно (loop)
├── block-stop.mp3           [ ] Нужно
├── success-ding.mp3         [ ] Нужно
├── error-buzz.mp3           [ ] Нужно
├── measure-beep.mp3         [ ] Нужно
└── lab-ambient.mp3          [ ] Опционально
```

### Fonts
```
assets/fonts/
├── Roboto-Regular.woff2     [ ] Нужно
├── Roboto-Bold.woff2        [ ] Нужно
└── RobotoMono-Regular.woff2 [ ] Для циферок
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Функциональное
- [ ] Все 6 опытов запускаются
- [ ] Физика правильная (проверить формулы)
- [ ] Данные сохраняются в localStorage
- [ ] Прогресс отслеживается
- [ ] Экспорт результатов (PDF/JSON)

### Визуальное
- [ ] Все анимации smooth (60 FPS)
- [ ] PNG изображения загружаются
- [ ] Responsive на всех разрешениях
- [ ] Нет артефактов рендеринга
- [ ] Частицы не тормозят

### Звуковое
- [ ] Все звуки работают
- [ ] Нет задержек
- [ ] Громкость настраивается
- [ ] Можно отключить звук

### Производительность
- [ ] FPS > 55 на Desktop
- [ ] FPS > 30 на Mobile
- [ ] Загрузка < 3 сек
- [ ] Размер bundle < 5 MB

### Совместимость
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome Mobile
- [ ] Safari iOS

---

## 📦 ДЕПЛОЙ

### Подготовка
- [ ] Минификация JS
- [ ] Оптимизация PNG (TinyPNG)
- [ ] Compression (gzip/brotli)
- [ ] CDN для статики
- [ ] Service Worker (offline mode)

### Документация
- [ ] README.md с инструкциями
- [ ] API documentation
- [ ] User guide (для учителей)
- [ ] Video tutorials

---

## 🎯 ПРИОРИТЕТЫ

### MVP (Минимум для демо):
1. **Опыт 1** (Пружина) - ПРИОРИТЕТ 1
   - Базовая функциональность
   - Простая анимация
   - График

2. **Опыт 2** (Трение) - ПРИОРИТЕТ 2
   - Базовое движение
   - Динамометр
   - Расчеты

### Полная версия:
3. Все остальные опыты
4. Все эффекты
5. Gamification
6. Звуки

### Polished версия:
7. Advanced effects (particles, trails)
8. AR mode (WebXR)
9. Multiplayer
10. AI assistant

---

## ⏱️ ОЦЕНКА ВРЕМЕНИ

| Задача | Время | Приоритет |
|--------|-------|-----------|
| Опыт 1 (базовая версия) | 8 часов | 🔥🔥🔥 |
| Опыт 1 (полировка) | 4 часа | 🔥🔥 |
| Опыты 2-6 (базовая) | 20 часов | 🔥🔥 |
| Все эффекты | 12 часов | 🔥 |
| Звуки | 4 часа | 🔥 |
| Gamification | 8 часов | 🔥 |
| Тестирование | 8 часов | 🔥🔥 |
| Документация | 4 часа | 🔥 |
| **ИТОГО** | **68 часов** | ~2 недели |

---

## 🚀 СЛЕДУЮЩИЙ ШАГ

**Начинаем с Опыта 1 (Пружина)?**

Я создам:
1. ✅ `experiments/kit2/experiment-1-spring-stiffness.html`
2. ✅ `experiments/kit2/experiment-1-spring-stiffness.js`
3. ✅ `experiments/kit2/experiment-1.css`
4. ✅ Работающий прототип с анимациями

**Время реализации: 4-6 часов** (базовая версия с эффектами)

**Готов начинать?** 🎮
