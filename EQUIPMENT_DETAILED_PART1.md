# 🔬 ДЕТАЛЬНОЕ ИЗУЧЕНИЕ ОБОРУДОВАНИЯ - ЧАСТЬ 1

**Комплекты №1 и №2: Механика**

---

## 📦 КОМПЛЕКТ №1: ПЛОТНОСТЬ И АРХИМЕДОВА СИЛА

### 🎯 Назначение комплекта
Измерение плотности твердых тел и исследование архимедовой силы (выталкивающей силы в жидкости)

---

### 🔧 ОБОРУДОВАНИЕ КОМПЛЕКТА №1

#### 1️⃣ **ВЕСЫ ЭЛЕКТРОННЫЕ**

**Характеристики:**
- Предел измерения: ≥200 г
- Тип: цифровые/электронные
- Назначение: измерение массы тел

**Принцип работы:**
- Тензометрический датчик преобразует деформацию в электрический сигнал
- Цифровой дисплей показывает массу в граммах
- Точность обычно ±0.1 г или ±1 г

**Как использовать в программе:**
```javascript
class DigitalScale {
    constructor() {
        this.maxWeight = 200; // грамм
        this.currentWeight = 0;
        this.precision = 0.1; // точность
    }
    
    placeObject(object) {
        if (object.mass <= this.maxWeight) {
            this.currentWeight = object.mass;
            // Добавляем случайную погрешность ±0.1г
            return this.currentWeight + (Math.random() - 0.5) * 0.2;
        }
        return "ПЕРЕГРУЗ";
    }
    
    display() {
        return `${this.currentWeight.toFixed(1)} г`;
    }
}
```

**Взаимодействие с другими приборами:**
- ✅ С цилиндрами (взвешивание в воздухе)
- ✅ С динамометром (сравнение методов измерения массы)
- ❌ Нельзя взвешивать мокрые предметы (искажение показаний)

---

#### 2️⃣ **ИЗМЕРИТЕЛЬНЫЙ ЦИЛИНДР (МЕНЗУРКА)**

**Характеристики:**
- Объем: 250 мл
- Цена деления: C = 2 мл
- Материал: прозрачное стекло/пластик
- Назначение: измерение объема жидкостей и твердых тел методом погружения

**Принцип работы:**
- Градуированная шкала с делениями через 2 мл
- Отсчет по нижнему мениску (для воды)
- Метод вытеснения: V_тела = V_конечное - V_начальное

**Физика измерений:**
```
Объем тела = Уровень воды с телом - Уровень воды без тела

Пример:
- Начальный уровень: 100 мл
- Погружаем цилиндр
- Конечный уровень: 125 мл
→ Объем тела = 125 - 100 = 25 мл = 25 см³
```

**Как реализовать в программе:**
```javascript
class Beaker {
    constructor() {
        this.capacity = 250; // мл
        this.division = 2; // цена деления
        this.currentLevel = 0; // текущий уровень воды
        this.objects = []; // погруженные объекты
    }
    
    addWater(volume) {
        if (this.currentLevel + volume <= this.capacity) {
            this.currentLevel += volume;
            return true;
        }
        return false; // переполнение
    }
    
    immerse(cylinder) {
        // Погружение тела - уровень воды повышается
        const waterDisplacement = cylinder.volume;
        if (this.currentLevel + waterDisplacement <= this.capacity) {
            this.currentLevel += waterDisplacement;
            this.objects.push(cylinder);
            return {
                success: true,
                oldLevel: this.currentLevel - waterDisplacement,
                newLevel: this.currentLevel,
                volumeMeasured: waterDisplacement
            };
        }
        return { success: false, reason: "Переполнение" };
    }
    
    readLevel() {
        // Округление до цены деления
        return Math.round(this.currentLevel / this.division) * this.division;
    }
}
```

**Взаимодействие:**
- ✅ С водой (основная жидкость)
- ✅ С соляным раствором (разная плотность)
- ✅ С цилиндрами (измерение объема)
- ⚠️ Необходим стакан для переливания

---

#### 3️⃣ **СТАКАН ПРОЗРАЧНЫЙ**

**Характеристики:**
- Высота: ≥120 мм
- Диаметр: ≥50 мм
- Объем: ~200-300 мл
- Назначение: приготовление растворов, измерение архимедовой силы в разных жидкостях

**Применение:**
1. Приготовление соляного раствора (изменение плотности жидкости)
2. Погружение цилиндров для измерения F_A
3. Вспомогательная емкость

**В программе:**
```javascript
class TransparentCup {
    constructor() {
        this.height = 120; // мм
        this.diameter = 50; // мм
        this.liquid = null; // текущая жидкость
    }
    
    fill(liquidType, volume) {
        this.liquid = {
            type: liquidType, // "water" или "saltwater"
            volume: volume,
            density: liquidType === "water" ? 1.0 : 1.1 // г/см³
        };
    }
    
    getDensity() {
        return this.liquid ? this.liquid.density : 0;
    }
}
```

---

#### 4️⃣ **ДИНАМОМЕТР №1 (малый)**

**Характеристики:**
- Предел измерения: 1 Н (≈102 г)
- Цена деления: C = 0.02 Н
- Тип: пружинный
- Назначение: измерение малых сил (вес легких тел, архимедова сила)

**Принцип работы:**
- Закон Гука: F = k·Δx
- Пружина растягивается пропорционально силе
- Стрелка показывает силу по шкале

**Физика измерений:**
```
Вес тела в воздухе: P₁ = m·g
Вес тела в воде: P₂ = m·g - F_A
Архимедова сила: F_A = P₁ - P₂

Пример:
- Алюминиевый цилиндр m = 70 г
- P₁ = 0.70 Н (в воздухе)
- P₂ = 0.45 Н (в воде)
- F_A = 0.70 - 0.45 = 0.25 Н ✓
```

**Реализация:**
```javascript
class Dynamometer1N {
    constructor() {
        this.maxForce = 1.0; // Н
        this.division = 0.02; // Н
        this.springConstant = 50; // Н/м (условно)
        this.attachedObject = null;
    }
    
    attach(object) {
        this.attachedObject = object;
    }
    
    measureInAir() {
        if (!this.attachedObject) return 0;
        const force = this.attachedObject.mass * 0.001 * 9.8; // Н
        return this.roundToDivision(force);
    }
    
    measureInWater(liquid) {
        if (!this.attachedObject) return 0;
        const weight = this.attachedObject.mass * 0.001 * 9.8; // Н
        const buoyancy = this.calculateBuoyancy(
            this.attachedObject.volume,
            liquid.density
        );
        return this.roundToDivision(weight - buoyancy);
    }
    
    calculateBuoyancy(volume, density) {
        // F_A = ρ·g·V
        // volume в см³, density в г/см³
        return density * 9.8 * volume * 0.000001; // Н
    }
    
    roundToDivision(force) {
        return Math.round(force / this.division) * this.division;
    }
}
```

**Взаимодействие:**
- ✅ С цилиндрами №2, №3, №4 (легкие)
- ✅ С водой/раствором (измерение F_A)
- ❌ Нельзя для цилиндра №1 (слишком тяжелый, перегруз)

---

#### 5️⃣ **ДИНАМОМЕТР №2 (большой)**

**Характеристики:**
- Предел измерения: 5 Н (≈510 г)
- Цена деления: C = 0.1 Н
- Назначение: измерение больших сил

**Отличия от динамометра №1:**
- Более жесткая пружина
- Грубее измерения (0.1 Н vs 0.02 Н)
- Для тяжелых объектов

**Применение:**
- Измерение веса стального цилиндра №1 (195 г ≈ 1.9 Н)
- Резервный динамометр

---

#### 6️⃣ **ПОВАРЕННАЯ СОЛЬ + ПАЛОЧКА**

**Назначение:** Изменение плотности жидкости для исследования зависимости F_A(ρ)

**Физика:**
```
Чистая вода:      ρ₁ = 1.00 г/см³
Соляной раствор:  ρ₂ = 1.05-1.20 г/см³ (зависит от концентрации)

При одинаковом объеме тела:
F_A2 / F_A1 = ρ₂ / ρ₁

Если ρ₂ = 1.1 г/см³:
F_A увеличится на 10%
```

**Реализация:**
```javascript
class SaltSolution {
    constructor() {
        this.saltAmount = 0; // грамм соли
        this.waterAmount = 0; // мл воды
    }
    
    mix(salt, water) {
        this.saltAmount = salt;
        this.waterAmount = water;
    }
    
    getDensity() {
        // Упрощенная формула
        // Каждые 35 г соли на 1000 мл воды повышают плотность на ~0.025 г/см³
        const concentration = this.saltAmount / this.waterAmount; // г/мл
        return 1.0 + concentration * 0.7; // приблизительно
    }
}
```

---

#### 7️⃣ **ЦИЛИНДР СТАЛЬНОЙ №1**

**Характеристики:**
- Объем: V = (25.0 ± 0.3) см³
- Масса: m = (195 ± 2) г
- Плотность: ρ = m/V ≈ 7.8 г/см³ (сталь)
- Материал: сталь

**Физика:**
```
Плотность стали: ρ_сталь ≈ 7.85 г/см³

Расчет:
ρ = 195 г / 25 см³ = 7.8 г/см³ ✓

Вес в воздухе: P = 195·0.001·9.8 ≈ 1.91 Н
Вес в воде: P' = 1.91 - F_A
F_A = 1.0·9.8·25·10⁻⁶ ≈ 0.25 Н
P' ≈ 1.66 Н
```

**Применение:**
1. Измерение плотности стали
2. Сравнение с цилиндром №2 (одинаковый объем, разная масса)
3. Проверка независимости F_A от массы

**В программе:**
```javascript
const cylinder1 = {
    id: 1,
    material: "steel",
    volume: 25.0,        // см³
    volumeError: 0.3,    // погрешность
    mass: 195,           // г
    massError: 2,        // погрешность
    color: "#8B8B8B",    // серый металлический
    density: 7.8,        // г/см³
    
    getMass() {
        // Случайная погрешность в пределах ±2 г
        return this.mass + (Math.random() - 0.5) * 2 * this.massError;
    },
    
    getVolume() {
        return this.volume + (Math.random() - 0.5) * 2 * this.volumeError;
    }
};
```

---

#### 8️⃣ **ЦИЛИНДР АЛЮМИНИЕВЫЙ №2**

**Характеристики:**
- Объем: V = (25.0 ± 0.7) см³
- Масса: m = (70 ± 2) г
- Плотность: ρ ≈ 2.8 г/см³ (алюминий)
- Материал: алюминий

**Ключевая особенность:**
**ОДИНАКОВЫЙ ОБЪЕМ С ЦИЛИНДРОМ №1** (25 см³), но РАЗНАЯ МАССА!

**Физика эксперимента:**
```
Цилиндр №1 (сталь):  V = 25 см³, m = 195 г
Цилиндр №2 (алюминий): V = 25 см³, m = 70 г

Архимедова сила зависит только от V, не от m!
F_A1 = F_A2 ≈ 0.25 Н (одинаковая!)

Это доказывает: F_A = ρ_жидкости · g · V
```

**Применение:**
1. Измерение плотности алюминия
2. **ГЛАВНОЕ:** Доказательство независимости F_A от массы тела!
3. Измерение архимедовой силы

---

#### 9️⃣ **ЦИЛИНДР ПЛАСТИКОВЫЙ №3** ⭐ ОСОБЫЙ!

**Характеристики:**
- Объем: V = (56.0 ± 1.8) см³
- Масса: m = (66 ± 2) г
- Плотность: ρ ≈ 1.18 г/см³ (близко к воде!)
- **УНИКАЛЬНО:** Имеет шкалу вдоль образующей с ценой деления 1 мм
- Длина: ≥80 мм

**Ключевая особенность:**
Этот цилиндр — **ЕДИНСТВЕННЫЙ** со шкалой! Используется для измерения F_A(V)!

**Физика:**
```
Шкала позволяет контролировать глубину погружения:
- Погружен на 20 мм → V_погр = πr²·20
- Погружен на 40 мм → V_погр = πr²·40
- Погружен на 60 мм → V_погр = πr²·60

F_A ~ V_погруженной части

Диаметр цилиндра можно вычислить:
V = πr²·h
56 см³ = πr²·80 мм
r ≈ 15 мм → d ≈ 30 мм
```

**Уникальное применение:**
```javascript
class CylinderWithScale {
    constructor() {
        this.volume = 56.0;      // см³
        this.mass = 66;          // г
        this.length = 80;        // мм
        this.scaleDivision = 1;  // мм
        this.radius = Math.sqrt(this.volume / (Math.PI * this.length / 10)); // см
    }
    
    immersionDepth(depth) {
        // depth в мм (0-80)
        if (depth > this.length) depth = this.length;
        
        // Объем погруженной части
        const immersedVolume = Math.PI * Math.pow(this.radius, 2) * (depth / 10);
        
        // Архимедова сила
        const buoyancy = 1.0 * 9.8 * immersedVolume * 0.001; // Н
        
        return {
            depth: depth,
            volumeImmersed: immersedVolume.toFixed(1),
            buoyancy: buoyancy.toFixed(3),
            readingOnScale: depth // мм на шкале цилиндра
        };
    }
    
    // Эксперимент: зависимость F_A от глубины
    experimentFaVsDepth() {
        const results = [];
        for (let d = 0; d <= 80; d += 10) {
            results.push(this.immersionDepth(d));
        }
        return results;
    }
}
```

**Взаимодействие:**
- ✅ С мензуркой (измерение объема)
- ✅ С динамометром №1 (измерение F_A при разной глубине)
- ✅ С водой/раствором (проверка зависимости от ρ)

---

#### 🔟 **ЦИЛИНДР АЛЮМИНИЕВЫЙ №4**

**Характеристики:**
- Объем: V = (34.0 ± 0.7) см³
- Масса: m = (95 ± 2) г
- Плотность: ρ ≈ 2.79 г/см³ (алюминий)

**Применение:**
1. Дополнительное измерение плотности алюминия
2. Измерение архимедовой силы
3. Резервный цилиндр

**Отличие от №2:**
- Больший объем (34 vs 25 см³)
- Большая масса (95 vs 70 г)
- Та же плотность (~2.8 г/см³)

---

#### 1️⃣1️⃣ **НИТЬ**

**Назначение:**
- Подвешивание цилиндров к динамометру
- Погружение в жидкость без касания дна

**Требования:**
- Прочная (выдерживает до 200 г)
- Тонкая (минимальное влияние на измерения)
- Длина ~30-50 см

---

### 📊 ВОЗМОЖНЫЕ ЭКСПЕРИМЕНТЫ НА КОМПЛЕКТЕ №1

#### **Эксперимент 1: Измерение плотности цилиндра**

**Оборудование:** Весы + мензурка + цилиндр (любой) + вода

**Методика:**
1. Взвесить цилиндр: m = ?
2. Налить в мензурку воду: V₁ = 100 мл
3. Погрузить цилиндр: V₂ = ?
4. Объем цилиндра: V = V₂ - V₁
5. Плотность: ρ = m/V

**Формула:** ρ = m/V (г/см³)

**Код:**
```javascript
function measureDensity(cylinder) {
    // 1. Взвешивание
    const mass = scales.weigh(cylinder);
    
    // 2. Измерение объема
    const waterLevel1 = beaker.getLevel(); // 100 мл
    beaker.immerse(cylinder);
    const waterLevel2 = beaker.getLevel(); // 125 мл
    const volume = waterLevel2 - waterLevel1; // 25 мл
    
    // 3. Расчет плотности
    const density = mass / volume;
    
    return {
        mass: mass,
        volume: volume,
        density: density.toFixed(2)
    };
}
```

---

#### **Эксперимент 2: Измерение архимедовой силы**

**Оборудование:** Динамометр №1 + цилиндр + стакан с водой + нить

**Методика:**
1. Подвесить цилиндр на динамометре: P₁ = ?
2. Погрузить в воду (не касаясь дна): P₂ = ?
3. Архимедова сила: F_A = P₁ - P₂

**Формула:** F_A = P₁ - P₂ (Н)

**Проверка:** F_A = ρ_воды · g · V_цилиндра

**Код:**
```javascript
function measureArchimedesForce(cylinder, liquid) {
    // 1. Вес в воздухе
    dynamometer.attach(cylinder);
    const weightInAir = dynamometer.measureInAir(); // Н
    
    // 2. Погружение в жидкость
    const weightInLiquid = dynamometer.measureInWater(liquid); // Н
    
    // 3. Архимедова сила
    const archimedesForce = weightInAir - weightInLiquid;
    
    // 4. Теоретическая проверка
    const theoreticalFA = liquid.density * 9.8 * cylinder.volume * 0.000001;
    
    return {
        P1: weightInAir.toFixed(2),
        P2: weightInLiquid.toFixed(2),
        FA_experimental: archimedesForce.toFixed(3),
        FA_theoretical: theoreticalFA.toFixed(3),
        error: Math.abs(archimedesForce - theoreticalFA).toFixed(3)
    };
}
```

---

#### **Эксперимент 3: F_A зависит от объема погруженной части** ⭐

**Оборудование:** Динамометр №1 + цилиндр №3 (со шкалой!) + стакан + вода

**Методика:**
1. Подвесить цилиндр №3 на динамометре
2. Погружать постепенно: 10 мм, 20 мм, ..., 80 мм
3. Записывать показания динамометра при каждой глубине
4. Строить график F_A(h) или F_A(V_погр)

**Формула:** F_A = ρ_воды · g · V_погруженной части

**Ожидаемый результат:** Линейная зависимость F_A ~ h

**Код:**
```javascript
function experimentFAvsDepth() {
    const cylinder3 = cylinders.get(3); // со шкалой
    dynamometer.attach(cylinder3);
    
    const results = [];
    const waterLevel = 100; // уровень воды в стакане
    
    for (let depth = 0; depth <= 80; depth += 10) {
        // Погружение на depth мм
        const reading = dynamometer.measureAtDepth(cylinder3, depth, water);
        
        const volumeImmersed = cylinder3.getImmersedVolume(depth);
        const FA = cylinder3.weight - reading;
        
        results.push({
            depth: depth,
            volumeImmersed: volumeImmersed.toFixed(1),
            dynamometerReading: reading.toFixed(3),
            FA: FA.toFixed(3)
        });
    }
    
    // График
    plotGraph(results, 'depth', 'FA');
    return results;
}
```

---

#### **Эксперимент 4: F_A зависит от плотности жидкости**

**Оборудование:** Динамометр + цилиндр + 2 стакана (вода и раствор) + соль

**Методика:**
1. Приготовить соляной раствор (+ 35 г соли на 100 мл воды)
2. Измерить F_A в воде: F_A1 = ?
3. Измерить F_A в растворе: F_A2 = ?
4. Сравнить: F_A2 / F_A1 = ρ₂ / ρ₁

**Код:**
```javascript
function experimentFAvsLiquidDensity(cylinder) {
    // Чистая вода
    const FA_water = measureArchimedesForce(cylinder, {
        type: "water",
        density: 1.0
    });
    
    // Соляной раствор
    const saltWater = prepareSaltSolution(35, 100); // 35г соли на 100мл
    const FA_saltwater = measureArchimedesForce(cylinder, saltWater);
    
    // Сравнение
    const ratio = FA_saltwater.FA_experimental / FA_water.FA_experimental;
    const densityRatio = saltWater.density / 1.0;
    
    return {
        water: FA_water,
        saltwater: FA_saltwater,
        ratio_experimental: ratio.toFixed(3),
        ratio_theoretical: densityRatio.toFixed(3)
    };
}
```

---

#### **Эксперимент 5: F_A НЕ зависит от массы тела** ⭐⭐

**Оборудование:** Динамометр + цилиндры №1 и №2 + стакан с водой

**Ключ:** Цилиндры №1 и №2 имеют ОДИНАКОВЫЙ ОБЪЕМ (25 см³), но РАЗНУЮ МАССУ!

**Методика:**
1. Измерить F_A для цилиндра №1 (m=195г, V=25см³)
2. Измерить F_A для цилиндра №2 (m=70г, V=25см³)
3. Сравнить: F_A1 ≈ F_A2 (должны быть одинаковыми!)

**Вывод:** Архимедова сила зависит от объема и плотности жидкости, но НЕ зависит от массы тела!

**Код:**
```javascript
function experimentFAvsindependentOfMass() {
    const steel = cylinders.get(1);    // V=25см³, m=195г
    const aluminum = cylinders.get(2); // V=25см³, m=70г
    
    const FA_steel = measureArchimedesForce(steel, water);
    const FA_aluminum = measureArchimedesForce(aluminum, water);
    
    console.log(`Цилиндр №1 (сталь): V=${steel.volume}см³, m=${steel.mass}г`);
    console.log(`F_A = ${FA_steel.FA_experimental} Н`);
    
    console.log(`Цилиндр №2 (алюминий): V=${aluminum.volume}см³, m=${aluminum.mass}г`);
    console.log(`F_A = ${FA_aluminum.FA_experimental} Н`);
    
    const difference = Math.abs(FA_steel.FA_experimental - FA_aluminum.FA_experimental);
    
    return {
        conclusion: difference < 0.02 ? 
            "✓ F_A не зависит от массы!" : 
            "✗ Есть расхождение"
    };
}
```

---

## 📦 КОМПЛЕКТ №2: ПРУЖИНЫ, ТРЕНИЕ, РЫЧАГИ

### 🎯 Назначение комплекта
Исследование закона Гука, измерение силы трения, работы силы упругости и силы трения

---

### 🔧 ОБОРУДОВАНИЕ КОМПЛЕКТА №2

#### 1️⃣ **ШТАТИВ ЛАБОРАТОРНЫЙ С ДЕРЖАТЕЛЯМИ**

**Конструкция:**
- Основание (тяжелая подставка)
- Вертикальная стойка
- Муфты (зажимы)
- Лапки-держатели

**Назначение:**
- Крепление пружин вертикально
- Удержание приборов на нужной высоте
- Фиксация направляющей под углом

**В программе:**
```javascript
class LabStand {
    constructor() {
        this.height = 60; // см
        this.clamps = [];
        this.attachedObjects = [];
    }
    
    attachSpring(spring, height) {
        this.clamps.push({
            type: "spring",
            object: spring,
            height: height
        });
    }
    
    attachRamp(ramp, angle) {
        this.clamps.push({
            type: "ramp",
            object: ramp,
            angle: angle
        });
    }
}
```

---

#### 2️⃣ **ДИНАМОМЕТР 1 (1 Н)**

**Характеристики:**
- Предел: 1 Н
- Цена деления: 0.02 Н
- Назначение: измерение малых сил

**Применение в комплекте №2:**
- Измерение силы трения бруска (F_тр ≈ 0.1-0.3 Н)
- Калибровка пружин

---

#### 3️⃣ **ДИНАМОМЕТР 2 (5 Н)**

**Характеристики:**
- Предел: 5 Н
- Цена деления: 0.1 Н
- Назначение: измерение больших сил

**Применение:**
- Измерение силы трения с грузами
- Измерение силы упругости жестких пружин

---

#### 4️⃣ **ПРУЖИНА 1 НА ПЛАНШЕТЕ** ⭐

**Характеристики:**
- Жесткость: k₁ = (50 ± 2) Н/м
- На планшете с миллиметровой шкалой
- Назначение: измерение жесткости, исследование закона Гука

**Закон Гука:**
```
F = k · Δx

где:
F - сила упругости (Н)
k - жесткость пружины (Н/м)
Δx - удлинение (м)

Пример:
k = 50 Н/м
Подвешиваем груз m = 100 г
F = mg = 0.1 · 9.8 = 0.98 Н
Δx = F/k = 0.98/50 = 0.0196 м ≈ 20 мм
```

**Планшет с шкалой:**
- Позволяет измерять удлинение без линейки
- Цена деления: 1 мм
- Видно начальное положение и конечное

**Реализация:**
```javascript
class SpringWithScale {
    constructor(stiffness) {
        this.k = stiffness;        // Н/м (50 для пружины 1)
        this.naturalLength = 100;  // мм (в покое)
        this.currentLength = 100;  // мм
        this.attachedMass = 0;     // кг
    }
    
    attachWeight(mass) {
        this.attachedMass = mass; // кг
        const force = mass * 9.8; // Н
        const elongation = (force / this.k) * 1000; // мм
        this.currentLength = this.naturalLength + elongation;
        
        return {
            naturalLength: this.naturalLength,
            elongation: elongation.toFixed(1),
            currentLength: this.currentLength.toFixed(1),
            force: force.toFixed(2)
        };
    }
    
    readScale() {
        // Округление до 1 мм
        return Math.round(this.currentLength);
    }
    
    // Эксперимент: проверка закона Гука
    experimentHookeLaw(masses) {
        const results = [];
        masses.forEach(m => {
            const data = this.attachWeight(m);
            results.push({
                mass: m * 1000, // г
                force: parseFloat(data.force),
                elongation: parseFloat(data.elongation)
            });
        });
        
        // График F(Δx) должен быть линейным
        return results;
    }
}
```

---

#### 5️⃣ **ПРУЖИНА 2 НА ПЛАНШЕТЕ**

**Характеристики:**
- Жесткость: k₂ = (10 ± 2) Н/м
- **В 5 раз мягче**, чем пружина 1!
- На планшете с шкалой

**Сравнение пружин:**
```
Одинаковый груз m = 100 г (F = 0.98 Н):

Пружина 1 (k=50 Н/м): Δx₁ = 0.98/50 = 20 мм
Пружина 2 (k=10 Н/м): Δx₂ = 0.98/10 = 98 мм

Пружина 2 растягивается в 5 раз больше!
```

**Применение:**
- Исследование зависимости F(Δx) для разных пружин
- Сравнение жесткостей
- Измерение малых сил (более чувствительная)

---

#### 6️⃣ **ТРИ ГРУЗА №1, №2, №3**

**Характеристики:**
- Масса каждого: m = (100 ± 2) г = 0.1 кг
- Можно комбинировать: 100г, 200г, 300г

**Применение:**
1. Подвешивание к пружинам (измерение k)
2. Изменение нагрузки на брусок (исследование F_тр(N))
3. Калибровка динамометров

**Код:**
```javascript
class Weight {
    constructor(id, mass) {
        this.id = id;
        this.mass = mass; // кг
        this.error = 0.002; // ±2г
    }
    
    getMass() {
        return this.mass + (Math.random() - 0.5) * 2 * this.error;
    }
    
    weight() {
        return this.getMass() * 9.8; // Н
    }
}

// Использование
const weights = [
    new Weight(1, 0.1),
    new Weight(2, 0.1),
    new Weight(3, 0.1)
];

function combineWeights(count) {
    return count * 0.1; // кг
}
```

---

#### 7️⃣ **НАБОРНЫЕ ГРУЗЫ №4, №5, №6**

**Характеристики:**
- Груз №4: m = (60 ± 1) г
- Груз №5: m = (70 ± 1) г
- Груз №6: m = (80 ± 1) г

**Назначение:**
- Более точная регулировка массы
- Создание разных нагрузок для исследования зависимостей

**Возможные комбинации:**
```
Один груз:   60г, 70г, 80г
Два груза:   130г, 140г, 150г
Три груза:   210г
+ грузы №1-3: 310г, 410г, 510г и т.д.
```

---

#### 8️⃣ **ЛИНЕЙКА И ТРАНСПОРТИР**

**Линейка:**
- Длина: 300 мм
- Цена деления: 1 мм
- Назначение: измерение расстояний, удлинений

**Транспортир:**
- Диапазон: 0-180°
- Цена деления: 1°
- Назначение: измерение угла наклона направляющей

**В программе:**
```javascript
class Ruler {
    measure(point1, point2) {
        const distance = Math.sqrt(
            Math.pow(point2.x - point1.x, 2) +
            Math.pow(point2.y - point1.y, 2)
        );
        return Math.round(distance); // мм
    }
}

class Protractor {
    measureAngle(ramp) {
        return Math.round(ramp.angle); // градусы
    }
}
```

---

#### 9️⃣ **БРУСОК ДЕРЕВЯННЫЙ С КРЮЧКОМ**

**Характеристики:**
- Масса: m = (50 ± 5) г
- Имеет крючок для подвешивания грузов
- Имеет крючок для крепления динамометра

**Назначение:**
- Исследование силы трения скольжения
- Перемещение по разным поверхностям

**Физика трения:**
```
F_трения = μ · N

где:
μ - коэффициент трения
N - сила нормального давления (равна весу бруска с грузами)

Пример:
Брусок 50г на горизонтальной поверхности А (μ=0.2):
N = mg = 0.05 · 9.8 = 0.49 Н
F_тр = 0.2 · 0.49 = 0.098 Н ≈ 0.1 Н
```

**Реализация:**
```javascript
class WoodenBlock {
    constructor() {
        this.mass = 0.05;        // кг (50г)
        this.massError = 0.005;  // ±5г
        this.width = 60;         // мм
        this.length = 100;       // мм
        this.attachedWeights = [];
    }
    
    addWeight(weight) {
        this.attachedWeights.push(weight);
    }
    
    getTotalMass() {
        let total = this.mass;
        this.attachedWeights.forEach(w => {
            total += w.mass;
        });
        return total;
    }
    
    getNormalForce() {
        return this.getTotalMass() * 9.8; // Н
    }
    
    getFrictionForce(surface) {
        return surface.frictionCoeff * this.getNormalForce();
    }
}
```

---

#### 🔟 **НАПРАВЛЯЮЩАЯ (ПОВЕРХНОСТЬ А)**

**Характеристики:**
- Длина: ≥500 мм
- Коэффициент трения: μ_A = 0.2
- Материал: пластик/дерево (гладкая)

**Назначение:**
- Поверхность для движения бруска
- Эталонная поверхность с известным μ

**Применение:**
1. Измерение силы трения: F_тр = μ_A · N
2. Исследование зависимости F_тр от N (меняем массу)
3. Наклонная плоскость (крепим к штативу под углом)

**Код:**
```javascript
class SurfaceA {
    constructor() {
        this.length = 500;        // мм
        this.frictionCoeff = 0.2; // μ
        this.angle = 0;           // градусы (горизонтально)
    }
    
    setAngle(angle) {
        this.angle = angle;
    }
    
    measureFriction(block, dynamometer) {
        // Тянем брусок равномерно
        const normalForce = block.getNormalForce();
        const frictionForce = this.frictionCoeff * normalForce;
        
        // Показания динамометра при равномерном движении
        return {
            normalForce: normalForce.toFixed(2),
            frictionForce: frictionForce.toFixed(3),
            coefficient: this.frictionCoeff
        };
    }
}
```

---

#### 1️⃣1️⃣ **ГИБКАЯ ПОЛОСА (ПОВЕРХНОСТЬ Б)** ⭐

**Характеристики:**
- Длина: ≥500 мм
- Коэффициент трения: μ_Б = 0.6 
- **В 3 РАЗА БОЛЬШЕ**, чем у поверхности А!
- Крепится на направляющую зажимом

**Ключевое назначение:**
Исследование зависимости силы трения от РОДА ПОВЕРХНОСТИ (а не от N)!

**Физика:**
```
Одинаковый брусок (m=50г, N=0.49Н):

Поверхность А (μ=0.2): F_тр = 0.2 · 0.49 = 0.098 Н
Поверхность Б (μ=0.6): F_тр = 0.6 · 0.49 = 0.294 Н

F_тр увеличивается в 3 раза при одинаковой нагрузке!
```

**Код:**
```javascript
class SurfaceB {
    constructor() {
        this.length = 500;
        this.frictionCoeff = 0.6; // В 3 раза больше!
        this.flexible = true;
    }
    
    attachToRamp(ramp, clamp) {
        // Крепим полосу на направляющую
        ramp.surface = this;
    }
    
    measureFriction(block) {
        const normalForce = block.getNormalForce();
        const frictionForce = this.frictionCoeff * normalForce;
        return {
            normalForce: normalForce.toFixed(2),
            frictionForce: frictionForce.toFixed(3),
            coefficient: this.frictionCoeff
        };
    }
}
```

---

#### 1️⃣2️⃣ **ЗАЖИМ КАНЦЕЛЯРСКИЙ**

**Назначение:**
- Крепление гибкой полосы (поверхности Б) к направляющей
- Простое и быстрое переключение между поверхностями А и Б

**В программе:**
```javascript
class Clamp {
    attach(surface, ramp) {
        ramp.currentSurface = surface;
        return true;
    }
    
    detach() {
        // Убираем полосу, возвращаем поверхность А
    }
}
```

---

### 📊 ВОЗМОЖНЫЕ ЭКСПЕРИМЕНТЫ НА КОМПЛЕКТЕ №2

#### **Эксперимент 1: Измерение жесткости пружины**

**Оборудование:** Штатив + пружина (1 или 2) + грузы + линейка

**Методика:**
1. Подвесить пружину к штативу вертикально
2. Измерить начальную длину: x₀
3. Подвесить груз массой m: x₁
4. Удлинение: Δx = x₁ - x₀
5. Сила: F = mg
6. Жесткость: k = F/Δx

**Формула:** k = mg/Δx (Н/м)

**Код:**
```javascript
function measureSpringStiffness(spring, weight) {
    // 1. Начальная длина
    const x0 = spring.naturalLength; // мм
    
    // 2. Подвешиваем груз
    const result = spring.attachWeight(weight.mass);
    const x1 = result.currentLength; // мм
    
    // 3. Удлинение
    const elongation = x1 - x0; // мм
    
    // 4. Сила
    const force = weight.weight(); // Н
    
    // 5. Жесткость
    const stiffness = force / (elongation / 1000); // Н/м
    
    return {
        naturalLength: x0,
        loadedLength: x1,
        elongation: elongation.toFixed(1),
        force: force.toFixed(3),
        stiffness: stiffness.toFixed(1),
        theoretical_k: spring.k
    };
}
```

---

#### **Эксперимент 2: Измерение коэффициента трения**

**Оборудование:** Направляющая + брусок + динамометр 1

**Методика:**
1. Положить брусок на направляющую (поверхность А)
2. Прицепить динамометр к крючку бруска
3. Тянуть равномерно (без ускорения!)
4. Записать показание динамометра: F_тр
5. Вычислить N = mg
6. Коэффициент: μ = F_тр/N

**Формула:** μ = F_тр/N

**Код:**
```javascript
function measureFrictionCoefficient(block, surface, dynamometer) {
    // 1. Сила нормального давления
    const normalForce = block.getNormalForce(); // Н
    
    // 2. Тянем равномерно, считываем динамометр
    const frictionForce = dynamometer.pullUniformly(block, surface); // Н
    
    // 3. Коэффициент трения
    const coefficient = frictionForce / normalForce;
    
    return {
        normalForce: normalForce.toFixed(3),
        frictionForce: frictionForce.toFixed(3),
        coefficient: coefficient.toFixed(2),
        theoretical_mu: surface.frictionCoeff
    };
}
```

---

#### **Эксперимент 3: F_тр зависит от N**

**Оборудование:** Направляющая + брусок + грузы №1-3 + динамометр

**Методика:**
1. Измерить F_тр для бруска без грузов
2. Добавить 1 груз (100г), измерить F_тр
3. Добавить 2 груза (200г), измерить F_тр
4. Добавить 3 груза (300г), измерить F_тр
5. Построить график F_тр(N)
6. Вычислить μ = tg(α) из наклона графика

**Ожидаемый результат:** Линейная зависимость F_тр = μ·N

**Код:**
```javascript
function experimentFrictionVsNormalForce() {
    const block = new WoodenBlock();
    const surface = new SurfaceA();
    const dynamometer = new Dynamometer1N();
    const weights = [
        new Weight(1, 0.1),
        new Weight(2, 0.1),
        new Weight(3, 0.1)
    ];
    
    const results = [];
    
    // Без грузов
    results.push({
        mass: (block.mass * 1000).toFixed(0),
        N: block.getNormalForce().toFixed(3),
        F_tr: dynamometer.pullUniformly(block, surface).toFixed(3)
    });
    
    // С 1, 2, 3 грузами
    for (let i = 1; i <= 3; i++) {
        // Добавляем груз
        block.addWeight(weights[i-1]);
        
        results.push({
            mass: (block.getTotalMass() * 1000).toFixed(0),
            N: block.getNormalForce().toFixed(3),
            F_tr: dynamometer.pullUniformly(block, surface).toFixed(3)
        });
    }
    
    // График F_тр(N)
    plotLinearGraph(results, 'N', 'F_tr');
    
    return results;
}
```

---

#### **Эксперимент 4: F_тр зависит от рода поверхности**

**Оборудование:** Направляющая + поверхность Б + зажим + брусок + динамометр

**Методика:**
1. Измерить F_тр на поверхности А: F_тр_A
2. Прикрепить полосу Б зажимом
3. Измерить F_тр на поверхности Б: F_тр_Б
4. Сравнить: F_тр_Б / F_тр_A = μ_Б / μ_A = 0.6/0.2 = 3

**Вывод:** При одинаковой нагрузке сила трения зависит от материала поверхности!

**Код:**
```javascript
function experimentFrictionVsSurface() {
    const block = new WoodenBlock();
    const surfaceA = new SurfaceA();  // μ=0.2
    const surfaceB = new SurfaceB();  // μ=0.6
    const dynamometer = new Dynamometer1N();
    
    // Поверхность А
    const F_tr_A = dynamometer.pullUniformly(block, surfaceA);
    
    // Поверхность Б
    const F_tr_B = dynamometer.pullUniformly(block, surfaceB);
    
    // Сравнение
    const ratio = F_tr_B / F_tr_A;
    const theoretical_ratio = surfaceB.frictionCoeff / surfaceA.frictionCoeff;
    
    return {
        surfaceA: {
            friction: F_tr_A.toFixed(3),
            coefficient: surfaceA.frictionCoeff
        },
        surfaceB: {
            friction: F_tr_B.toFixed(3),
            coefficient: surfaceB.frictionCoeff
        },
        ratio_experimental: ratio.toFixed(2),
        ratio_theoretical: theoretical_ratio.toFixed(2)
    };
}
```

---

#### **Эксперимент 5: Закон Гука** (исследование)

**Оборудование:** Штатив + пружина + грузы №1-6

**Методика:**
1. Подвешивать разные грузы: 60г, 70г, 80г, 100г, 200г, 300г
2. Измерять удлинение Δx для каждого груза
3. Строить график F(Δx)
4. Проверить линейность
5. Вычислить k = ΔF/ΔΔx из наклона графика

**Ожидаемый результат:** Прямая линия, проходящая через начало координат

**Код:**
```javascript
function experimentHookeLaw(spring) {
    const masses = [0.06, 0.07, 0.08, 0.1, 0.2, 0.3]; // кг
    const results = [];
    
    masses.forEach(m => {
        const weight = new Weight('temp', m);
        const data = spring.attachWeight(m);
        
        results.push({
            mass: (m * 1000).toFixed(0),
            force: weight.weight().toFixed(3),
            elongation: parseFloat(data.elongation)
        });
        
        // Убираем груз
        spring.detach();
    });
    
    // График F(Δx) - должна быть прямая
    plotLinearGraph(results, 'elongation', 'force');
    
    // Вычисляем k из наклона
    const k_experimental = linearRegression(results).slope;
    
    return {
        data: results,
        k_experimental: k_experimental.toFixed(1),
        k_theoretical: spring.k
    };
}
```

---

#### **Эксперимент 6: Измерение работы силы трения**

**Оборудование:** Направляющая + брусок + динамометр + линейка

**Методика:**
1. Измерить F_тр (тянуть равномерно)
2. Измерить пройденное расстояние S (линейкой)
3. Работа: A = F_тр · S

**Формула:** A = F_тр · S (Дж)

**Код:**
```javascript
function measureWorkOfFriction(block, surface, distance) {
    // 1. Сила трения
    const frictionForce = block.getFrictionForce(surface); // Н
    
    // 2. Расстояние
    const distanceMeters = distance / 1000; // м
    
    // 3. Работа
    const work = frictionForce * distanceMeters; // Дж
    
    return {
        frictionForce: frictionForce.toFixed(3),
        distance: distance, // мм
        work: work.toFixed(4),
        workMilliJoules: (work * 1000).toFixed(1) // мДж
    };
}
```

---

#### **Эксперимент 7: Измерение работы силы упругости**

**Оборудование:** Штатив + пружина + груз + линейка

**Методика:**
1. Подвесить груз к пружине
2. Измерить удлинение Δx
3. Медленно поднимать груз на высоту h = Δx
4. Работа силы упругости: A = F_упр · Δx = (1/2)kΔx²

**Формула:** A = (1/2)kΔx² (Дж)

**Код:**
```javascript
function measureWorkOfElasticity(spring, weight) {
    // 1. Подвешиваем груз
    const result = spring.attachWeight(weight.mass);
    const elongation = parseFloat(result.elongation) / 1000; // м
    
    // 2. Работа при подъеме на высоту h = elongation
    // A = (1/2)k·Δx²
    const work = 0.5 * spring.k * Math.pow(elongation, 2); // Дж
    
    // Альтернативно: A = F_средняя · Δx = (1/2)F_max · Δx
    const force = weight.weight();
    const work_alternative = 0.5 * force * elongation;
    
    return {
        elongation: (elongation * 1000).toFixed(1), // мм
        stiffness: spring.k,
        work: work.toFixed(4),
        work_alternative: work_alternative.toFixed(4)
    };
}
```

---

## 🎯 ИТОГИ ЧАСТИ 1

### Изучено оборудование:

**Комплект №1 (11 элементов):**
✅ Весы электронные (±0.1г, до 200г)
✅ Мензурка (250 мл, C=2мл)
✅ Стакан прозрачный
✅ Динамометры №1 (1Н) и №2 (5Н)
✅ Поваренная соль (для изменения ρ)
✅ Цилиндр стальной №1 (195г, 25см³)
✅ Цилиндр алюминиевый №2 (70г, 25см³)
✅ Цилиндр пластиковый №3 со шкалой (66г, 56см³) ⭐
✅ Цилиндр алюминиевый №4 (95г, 34см³)
✅ Нить

**Комплект №2 (12 элементов):**
✅ Штатив лабораторный с держателями
✅ Динамометры 1Н и 5Н
✅ Пружина 1 (k=50 Н/м) на планшете ⭐
✅ Пружина 2 (k=10 Н/м) на планшете
✅ Грузы №1-3 (по 100г)
✅ Грузы №4-6 (60г, 70г, 80г)
✅ Линейка (300мм) и транспортир
✅ Брусок деревянный с крючком (50г)
✅ Направляющая (поверхность А, μ=0.2)
✅ Гибкая полоса (поверхность Б, μ=0.6) ⭐
✅ Зажим канцелярский

### Понято взаимодействие:
✅ Цилиндры №1 и №2 - доказывают независимость F_A от массы
✅ Цилиндр №3 со шкалой - единственный для F_A(V)
✅ Поверхности А и Б - сравнение разных материалов
✅ Пружины 1 и 2 - разная жесткость для разных опытов

### Реализовано в коде:
✅ Классы для всех приборов с физикой
✅ 12 полных экспериментов с кодом
✅ Формулы и расчеты
✅ Взаимодействие между приборами

---

**✅ ЭТАП 1 ЗАВЕРШЕН!**

Жду команды "дальше" для перехода к ЭТАПУ 2 (Комплекты №3 и №4)! 🚀
