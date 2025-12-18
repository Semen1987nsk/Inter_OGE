// Утилиты для работы с изображениями оборудования
class ImageLoader {
    constructor() {
        this.cache = new Map();
        this.loading = new Map();
    }

    // Загрузить изображение
    async load(path) {
        // Проверяем кеш
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        // Проверяем, не загружается ли уже
        if (this.loading.has(path)) {
            return this.loading.get(path);
        }

        // Создаем промис загрузки
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.cache.set(path, img);
                this.loading.delete(path);
                resolve(img);
            };

            img.onerror = () => {
                console.warn(`Не удалось загрузить изображение: ${path}`);
                this.loading.delete(path);
                resolve(null); // Возвращаем null вместо ошибки
            };

            img.src = path;
        });

        this.loading.set(path, promise);
        return promise;
    }

    // Загрузить несколько изображений
    async loadMultiple(paths) {
        const promises = paths.map(path => this.load(path));
        return Promise.all(promises);
    }

    // Проверить, загружено ли изображение
    isLoaded(path) {
        return this.cache.has(path);
    }

    // Получить загруженное изображение
    get(path) {
        return this.cache.get(path) || null;
    }

    // Очистить кеш
    clear() {
        this.cache.clear();
        this.loading.clear();
    }
}

// Глобальный загрузчик изображений
const imageLoader = new ImageLoader();

// Конфигурация путей к изображениям оборудования Labosfera
const LabosferaImages = {
    sensors: {
        temperature: 'assets/sensors/ls-t100.png',
        current: 'assets/sensors/ls-i3.png',
        voltage: 'assets/sensors/ls-v15.png',
        force: 'assets/sensors/ls-f50.png',
        pressure: 'assets/sensors/ls-p200.png',
        distance: 'assets/sensors/ls-d600.png',
        light: 'assets/sensors/ls-l180.png',
        magnetic: 'assets/sensors/ls-m5.png',
        acceleration: 'assets/sensors/ls-a16.png'
    },
    
    equipment: {
        dynamometer: 'assets/equipment/dynamometer.png',
        ammeter: 'assets/equipment/ammeter.png',
        voltmeter: 'assets/equipment/voltmeter.png',
        calorimeter: 'assets/equipment/calorimeter.png',
        scale: 'assets/equipment/scale.png',
        beaker: 'assets/equipment/beaker.png',
        flask: 'assets/equipment/flask.png',
        cylinder: 'assets/equipment/cylinder.png',
        thermometer: 'assets/equipment/thermometer.png',
        stand: 'assets/equipment/stand.png',
        spring: 'assets/equipment/spring.png',
        lever: 'assets/equipment/lever.png',
        pulley: 'assets/equipment/pulley.png',
        weights: 'assets/equipment/weights.png',
        block: 'assets/equipment/block.png',
        battery: 'assets/equipment/battery.png',
        resistor: 'assets/equipment/resistor.png',
        bulb: 'assets/equipment/bulb.png',
        switch: 'assets/equipment/switch.png',
        wires: 'assets/equipment/wires.png',
        lens: 'assets/equipment/lens.png',
        mirror: 'assets/equipment/mirror.png',
        prism: 'assets/equipment/prism.png',
        screen: 'assets/equipment/screen.png'
    },
    
    branding: {
        logo: 'assets/branding/logo.png',
        logoWhite: 'assets/branding/logo-white.png',
        banner: 'assets/branding/banner.png'
    }
};

// Предзагрузка изображений
async function preloadImages() {
    console.log('🔄 Загрузка изображений оборудования Labosfera...');
    
    const allPaths = [
        ...Object.values(LabosferaImages.sensors),
        ...Object.values(LabosferaImages.equipment),
        ...Object.values(LabosferaImages.branding)
    ];

    try {
        await imageLoader.loadMultiple(allPaths);
        console.log('✅ Изображения загружены');
    } catch (error) {
        console.warn('⚠️ Некоторые изображения не загрузились, используем fallback');
    }
}

// Отрисовка изображения или fallback иконки
// options: { value, animated, state } - для динамических элементов
function drawEquipment(ctx, type, category, x, y, width, height, options = {}) {
    const imagePath = LabosferaImages[category]?.[type];
    
    if (imagePath) {
        const img = imageLoader.get(imagePath);
        
        if (img) {
            // Рисуем реальное фото как основу
            ctx.drawImage(img, x, y, width, height);
            return true;
        }
    }
    
    // Fallback - рисуем стилизованную иконку
    return false;
}

// Гибридная отрисовка: фото + динамические элементы
function drawHybridEquipment(ctx, type, category, x, y, width, height, options = {}) {
    // 1. Рисуем фото как основу (если есть)
    const hasPhoto = drawEquipment(ctx, type, category, x, y, width, height);
    
    // 2. Добавляем динамические элементы поверх
    switch(type) {
        case 'thermometer':
            drawThermometerReading(ctx, x, y, width, height, options.temperature || 20);
            break;
        case 'scale':
            drawScaleDisplay(ctx, x, y, width, height, options.weight || 0);
            break;
        case 'spring':
            drawSpringStretch(ctx, x, y, width, height, options.force || 0);
            break;
        case 'beaker':
            drawLiquidLevel(ctx, x, y, width, height, options.liquidLevel || 0, options.liquidColor || '#4FC3F7');
            break;
        case 'ammeter':
            drawAnalogMeterNeedle(ctx, x, y, width, height, options.current || 0, 'A');
            break;
        case 'voltmeter':
            drawAnalogMeterNeedle(ctx, x, y, width, height, options.voltage || 0, 'V');
            break;
        case 'dynamometer':
            drawDynamometerScale(ctx, x, y, width, height, options.force || 0);
            break;
    }
    
    return hasPhoto;
}

// Отрисовка показаний термометра
function drawThermometerReading(ctx, x, y, width, height, temperature) {
    // Столбик ртути/спирта
    const mercuryHeight = (temperature / 100) * (height * 0.7);
    const mercuryColor = temperature > 80 ? '#F44336' : '#2196F3';
    
    ctx.fillStyle = mercuryColor;
    ctx.fillRect(x + width * 0.4, y + height - mercuryHeight - 40, width * 0.2, mercuryHeight);
    
    // Резервуар внизу
    ctx.beginPath();
    ctx.arc(x + width * 0.5, y + height - 30, width * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Цифровое значение
    ctx.fillStyle = '#333';
    ctx.font = `bold ${width * 0.15}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${temperature.toFixed(1)}°C`, x + width * 0.5, y + height - 10);
    ctx.textAlign = 'left';
}

// Отрисовка дисплея весов
function drawScaleDisplay(ctx, x, y, width, height, weight) {
    // Цифровой дисплей
    const displayX = x + width * 0.2;
    const displayY = y + height * 0.15;
    const displayW = width * 0.6;
    const displayH = height * 0.25;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(displayX, displayY, displayW, displayH);
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${displayH * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${weight.toFixed(1)} г`, displayX + displayW / 2, displayY + displayH * 0.65);
    ctx.textAlign = 'left';
}

// Отрисовка растяжения пружины
function drawSpringStretch(ctx, x, y, width, height, force) {
    // Пружина растягивается от силы
    const stretch = Math.min(force * 2, height * 0.3); // максимум 30% от высоты
    const coils = 12;
    const coilHeight = (height + stretch) / coils;
    
    ctx.strokeStyle = '#78909C';
    ctx.lineWidth = 3;
    
    for (let i = 0; i < coils; i++) {
        const yPos = y + i * coilHeight;
        ctx.beginPath();
        ctx.arc(x + width / 2, yPos, width / 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Показываем силу
    ctx.fillStyle = '#333';
    ctx.font = `${width * 0.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${force.toFixed(1)} Н`, x + width / 2, y + height + 20);
    ctx.textAlign = 'left';
}

// Отрисовка уровня жидкости в мензурке
function drawLiquidLevel(ctx, x, y, width, height, level, color) {
    if (level <= 0) return;
    
    // Жидкость внутри мензурки
    const liquidHeight = (level / 200) * height;
    
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(
        x + width * 0.1, 
        y + height - liquidHeight - 10, 
        width * 0.8, 
        liquidHeight
    );
    ctx.globalAlpha = 1.0;
    
    // Мениск сверху
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, y + height - liquidHeight - 10);
    ctx.quadraticCurveTo(
        x + width * 0.5, y + height - liquidHeight - 15,
        x + width * 0.9, y + height - liquidHeight - 10
    );
    ctx.stroke();
}

// Отрисовка стрелки аналогового прибора
function drawAnalogMeterNeedle(ctx, x, y, width, height, value, unit) {
    const centerX = x + width / 2;
    const centerY = y + height * 0.7;
    const radius = width * 0.35;
    
    // Шкала
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    
    // Деления
    const maxValue = unit === 'A' ? 3 : 15;
    const divisions = unit === 'A' ? 6 : 10;
    
    for (let i = 0; i <= divisions; i++) {
        const angle = Math.PI * 0.75 + (Math.PI * 1.5) * (i / divisions);
        const x1 = centerX + Math.cos(angle) * radius * 0.85;
        const y1 = centerY + Math.sin(angle) * radius * 0.85;
        const x2 = centerX + Math.cos(angle) * radius;
        const y2 = centerY + Math.sin(angle) * radius;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Подписи
        if (i % 2 === 0) {
            const val = (maxValue * i / divisions).toFixed(0);
            const textX = centerX + Math.cos(angle) * radius * 0.7;
            const textY = centerY + Math.sin(angle) * radius * 0.7;
            ctx.fillStyle = '#333';
            ctx.font = `${width * 0.08}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(val, textX, textY);
        }
    }
    
    // Стрелка
    const needleAngle = Math.PI * 0.75 + (Math.PI * 1.5) * Math.min(value / maxValue, 1);
    ctx.strokeStyle = '#F44336';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + Math.cos(needleAngle) * radius * 0.8,
        centerY + Math.sin(needleAngle) * radius * 0.8
    );
    ctx.stroke();
    
    // Центральная ось
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(centerX, centerY, width * 0.03, 0, Math.PI * 2);
    ctx.fill();
    
    // Единица измерения
    ctx.fillStyle = '#333';
    ctx.font = `bold ${width * 0.12}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(unit, centerX, y + height * 0.95);
    ctx.textAlign = 'left';
}

// Отрисовка динамометра со шкалой
function drawDynamometerScale(ctx, x, y, width, height, force) {
    const maxForce = 5; // Н
    const hookY = y + height - (force / maxForce) * (height * 0.7);
    
    // Крючок
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + width / 2, hookY, width * 0.15, 0, Math.PI);
    ctx.stroke();
    
    // Пружина до крючка
    const springCoils = 10;
    const springHeight = hookY - y - 20;
    const coilHeight = springHeight / springCoils;
    
    ctx.strokeStyle = '#78909C';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < springCoils; i++) {
        const yPos = y + 20 + i * coilHeight;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.3, yPos);
        ctx.lineTo(x + width * 0.7, yPos + coilHeight / 2);
        ctx.lineTo(x + width * 0.3, yPos + coilHeight);
        ctx.stroke();
    }
    
    // Шкала сбоку
    for (let i = 0; i <= maxForce; i++) {
        const markY = y + height - (i / maxForce) * (height * 0.7);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.75, markY);
        ctx.lineTo(x + width * 0.85, markY);
        ctx.stroke();
        
        ctx.fillStyle = '#333';
        ctx.font = `${width * 0.12}px Arial`;
        ctx.fillText(`${i}`, x + width * 0.87, markY + 5);
    }
    
    // Показание
    ctx.fillStyle = '#F44336';
    ctx.font = `bold ${width * 0.18}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${force.toFixed(2)} Н`, x + width / 2, y + height + 25);
    ctx.textAlign = 'left';
}

// Хелпер для отрисовки с тенью
function drawEquipmentWithShadow(ctx, type, category, x, y, width, height) {
    // Тень
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    const drawn = drawEquipment(ctx, type, category, x, y, width, height);
    
    // Сброс тени
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    return drawn;
}

// Отрисовка логотипа Labosfera
function drawLabosferaLogo(ctx, x, y, size) {
    const logo = imageLoader.get(LabosferaImages.branding.logo);
    
    if (logo) {
        const aspectRatio = logo.width / logo.height;
        const width = size;
        const height = size / aspectRatio;
        ctx.drawImage(logo, x, y, width, height);
    } else {
        // Fallback - текстовый логотип
        ctx.fillStyle = '#0066CC';
        ctx.font = `bold ${size / 4}px Arial`;
        ctx.fillText('Labosfera', x, y + size / 3);
    }
}

// Создание watermark с логотипом
function addLabosferaWatermark(ctx, canvasWidth, canvasHeight) {
    const logo = imageLoader.get(LabosferaImages.branding.logo);
    
    if (logo) {
        const size = 100;
        const x = canvasWidth - size - 20;
        const y = 20;
        
        ctx.globalAlpha = 0.3;
        drawEquipment(ctx, 'logo', 'branding', x, y, size, size * (logo.height / logo.width));
        ctx.globalAlpha = 1.0;
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ImageLoader,
        imageLoader,
        LabosferaImages,
        preloadImages,
        drawEquipment,
        drawEquipmentWithShadow,
        drawLabosferaLogo,
        addLabosferaWatermark
    };
}
