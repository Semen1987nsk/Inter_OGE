/**
 * Отрисовка компонентов наборного груза
 * Основано на фотографиях реального оборудования ФИПИ
 */

// ========================
// 1. ШТАНГА 10г (основа)
// ========================
function drawRod10g(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Параметры штанги
    const rodWidth = 8;  // Диаметр стержня
    const rodHeight = 180; // Длина стержня
    const hookSize = 20;   // Размер крючка
    const threadLength = 30; // Длина резьбовой части
    
    // === ВЕРХНИЙ КРЮЧОК (для подвешивания) ===
    ctx.save();
    
    // Стержень крючка
    const gradient1 = ctx.createLinearGradient(
        centerX - rodWidth/2, centerY - rodHeight/2 - hookSize,
        centerX + rodWidth/2, centerY - rodHeight/2 - hookSize
    );
    gradient1.addColorStop(0, '#a0a8b0');
    gradient1.addColorStop(0.5, '#e0e4e8');
    gradient1.addColorStop(1, '#b0b8c0');
    
    ctx.fillStyle = gradient1;
    ctx.fillRect(
        centerX - rodWidth/2,
        centerY - rodHeight/2 - hookSize,
        rodWidth,
        hookSize + 5
    );
    
    // Кольцо крючка (U-образное)
    ctx.strokeStyle = '#c0c8d0';
    ctx.lineWidth = rodWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(
        centerX,
        centerY - rodHeight/2 - hookSize - 10,
        10,
        0,
        Math.PI
    );
    ctx.stroke();
    
    // Блик на крючке
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
        centerX - 2,
        centerY - rodHeight/2 - hookSize - 10,
        8,
        Math.PI * 0.7,
        Math.PI * 1.3
    );
    ctx.stroke();
    
    ctx.restore();
    
    // === ОСНОВНОЙ СТЕРЖЕНЬ (гладкая часть) ===
    ctx.save();
    
    const rodGradient = ctx.createLinearGradient(
        centerX - rodWidth/2, centerY - rodHeight/2,
        centerX + rodWidth/2, centerY - rodHeight/2
    );
    rodGradient.addColorStop(0, '#8090a0');
    rodGradient.addColorStop(0.3, '#d0d8e0');
    rodGradient.addColorStop(0.5, '#f0f4f8');
    rodGradient.addColorStop(0.7, '#d0d8e0');
    rodGradient.addColorStop(1, '#8090a0');
    
    ctx.fillStyle = rodGradient;
    ctx.fillRect(
        centerX - rodWidth/2,
        centerY - rodHeight/2,
        rodWidth,
        rodHeight - threadLength
    );
    
    // Боковые блики на стержне
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(
        centerX - rodWidth/2 + 2,
        centerY - rodHeight/2,
        2,
        rodHeight - threadLength
    );
    
    ctx.restore();
    
    // === РЕЗЬБА (нижняя часть) ===
    ctx.save();
    
    const threadY = centerY + rodHeight/2 - threadLength;
    
    // Фон резьбы
    const threadGradient = ctx.createLinearGradient(
        centerX - rodWidth/2, threadY,
        centerX + rodWidth/2, threadY
    );
    threadGradient.addColorStop(0, '#707880');
    threadGradient.addColorStop(0.5, '#c0c8d0');
    threadGradient.addColorStop(1, '#707880');
    
    ctx.fillStyle = threadGradient;
    ctx.fillRect(
        centerX - rodWidth/2,
        threadY,
        rodWidth,
        threadLength
    );
    
    // Витки резьбы (горизонтальные линии)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    const threadPitch = 3; // Шаг резьбы
    
    for (let i = 0; i < threadLength / threadPitch; i++) {
        const y = threadY + i * threadPitch;
        ctx.beginPath();
        ctx.moveTo(centerX - rodWidth/2, y);
        ctx.lineTo(centerX + rodWidth/2, y);
        ctx.stroke();
    }
    
    // Блики на резьбе
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < threadLength / threadPitch; i++) {
        const y = threadY + i * threadPitch + 1;
        ctx.beginPath();
        ctx.moveTo(centerX - rodWidth/2, y);
        ctx.lineTo(centerX + rodWidth/2, y);
        ctx.stroke();
    }
    
    ctx.restore();
    
    // === СТОПОРНАЯ ГАЙКА (внизу) ===
    ctx.save();
    
    const nutSize = 14;
    const nutY = centerY + rodHeight/2 - 5;
    
    // Шестигранная гайка
    ctx.fillStyle = '#909098';
    ctx.strokeStyle = '#606068';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2 / 6) + Math.PI / 6;
        const x = centerX + Math.cos(angle) * nutSize / 2;
        const y = nutY + Math.sin(angle) * nutSize / 2;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Блик на гайке
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(centerX - 3, nutY - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // === АННОТАЦИИ ===
    ctx.save();
    ctx.font = '11px Arial';
    ctx.fillStyle = '#2a5298';
    ctx.textAlign = 'left';
    
    // Стрелки с размерами
    ctx.strokeStyle = '#2a5298';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    
    // Длина стержня
    ctx.beginPath();
    ctx.moveTo(centerX + 20, centerY - rodHeight/2);
    ctx.lineTo(centerX + 20, centerY + rodHeight/2);
    ctx.stroke();
    
    ctx.fillText('~100 мм', centerX + 25, centerY);
    
    // Диаметр
    ctx.beginPath();
    ctx.moveTo(centerX - rodWidth/2, centerY - 40);
    ctx.lineTo(centerX + rodWidth/2, centerY - 40);
    ctx.stroke();
    
    ctx.textAlign = 'center';
    ctx.fillText('⌀8 мм', centerX, centerY - 45);
    
    ctx.restore();
}

// ========================
// 2. ДИСК 10г
// ========================
function drawDisk10g(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const outerRadius = 40;  // Внешний радиус
    const innerRadius = 5;   // Отверстие для штанги
    const thickness = 3;     // Визуальная толщина (3D эффект)
    
    drawDisk(ctx, centerX, centerY, outerRadius, innerRadius, thickness, '#b0b8c0', '10 г');
}

// ========================
// 3. ДИСК 20г
// ========================
function drawDisk20g(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const outerRadius = 50;
    const innerRadius = 5;
    const thickness = 3;
    
    drawDisk(ctx, centerX, centerY, outerRadius, innerRadius, thickness, '#a8b0b8', '20 г');
}

// ========================
// 4. ДИСК 50г
// ========================
function drawDisk50g(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const outerRadius = 65;
    const innerRadius = 5;
    const thickness = 4;
    
    drawDisk(ctx, centerX, centerY, outerRadius, innerRadius, thickness, '#a0a8b0', '50 г');
}

// ========================
// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ: отрисовка диска
// ========================
function drawDisk(ctx, x, y, outerR, innerR, thickness, baseColor, label) {
    ctx.save();
    
    // === ТЕНЬ ДИСКА ===
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.filter = 'blur(8px)';
    ctx.beginPath();
    ctx.arc(x + 3, y + 5, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();
    
    // === 3D ЭФФЕКТ: Боковая грань (толщина) ===
    ctx.save();
    const sideGradient = ctx.createLinearGradient(x, y, x, y + thickness * 3);
    sideGradient.addColorStop(0, baseColor);
    sideGradient.addColorStop(1, darken(baseColor, 0.3));
    
    ctx.fillStyle = sideGradient;
    ctx.beginPath();
    ctx.ellipse(x, y + thickness, outerR, outerR * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Внутреннее отверстие (боковая грань)
    ctx.fillStyle = darken(baseColor, 0.5);
    ctx.beginPath();
    ctx.ellipse(x, y + thickness, innerR, innerR * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // === ВЕРХНЯЯ ПЛОСКОСТЬ ДИСКА ===
    ctx.save();
    
    // Радиальный градиент для металлического эффекта
    const topGradient = ctx.createRadialGradient(
        x - outerR * 0.3, y - outerR * 0.3, 0,
        x, y, outerR * 1.2
    );
    topGradient.addColorStop(0, lighten(baseColor, 0.4));
    topGradient.addColorStop(0.3, baseColor);
    topGradient.addColorStop(0.7, darken(baseColor, 0.2));
    topGradient.addColorStop(1, darken(baseColor, 0.4));
    
    ctx.fillStyle = topGradient;
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = darken(baseColor, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
    
    // === КОНЦЕНТРИЧЕСКИЕ КРУГИ (текстура металла) ===
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    for (let r = innerR + 10; r < outerR; r += 8) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
    
    // === ОТВЕРСТИЕ В ЦЕНТРЕ ===
    ctx.save();
    
    // Тень внутри отверстия
    const holeGradient = ctx.createRadialGradient(x, y, innerR * 0.3, x, y, innerR);
    holeGradient.addColorStop(0, '#000');
    holeGradient.addColorStop(1, darken(baseColor, 0.6));
    
    ctx.fillStyle = holeGradient;
    ctx.beginPath();
    ctx.arc(x, y, innerR, 0, Math.PI * 2);
    ctx.fill();
    
    // Обводка отверстия
    ctx.strokeStyle = darken(baseColor, 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
    
    // === БЛИКИ ===
    ctx.save();
    
    // Основной блик
    const highlightGradient = ctx.createRadialGradient(
        x - outerR * 0.4, y - outerR * 0.4, 0,
        x - outerR * 0.2, y - outerR * 0.2, outerR * 0.5
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(x - outerR * 0.3, y - outerR * 0.3, outerR * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Вторичный блик
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(x - outerR * 0.35, y - outerR * 0.35, outerR * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // === НАДПИСЬ (масса) ===
    ctx.save();
    ctx.font = `bold ${outerR * 0.3}px Arial`;
    ctx.fillStyle = '#2a5298';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Белая обводка для читаемости
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(label, x, y + outerR + 20);
    
    ctx.fillText(label, x, y + outerR + 20);
    ctx.restore();
    
    // === РАЗМЕРЫ ===
    ctx.save();
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    
    // Диаметр
    ctx.strokeStyle = '#2a5298';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    
    ctx.beginPath();
    ctx.moveTo(x - outerR, y - outerR - 15);
    ctx.lineTo(x + outerR, y - outerR - 15);
    ctx.stroke();
    
    // Стрелки
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x - outerR, y - outerR - 15);
    ctx.lineTo(x - outerR + 5, y - outerR - 12);
    ctx.lineTo(x - outerR + 5, y - outerR - 18);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + outerR, y - outerR - 15);
    ctx.lineTo(x + outerR - 5, y - outerR - 12);
    ctx.lineTo(x + outerR - 5, y - outerR - 18);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillText(`⌀${(outerR * 2).toFixed(0)} px`, x, y - outerR - 25);
    
    ctx.restore();
}

// ========================
// 5. СБОРКА: Наборный груз целиком
// ========================
function drawAssembly(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Позиции элементов (сверху вниз)
    const rodTop = 50;
    const rodHeight = 180;
    const hookSize = 20;
    
    // Рисуем штангу (упрощённо)
    const rodWidth = 8;
    const rodY = rodTop + hookSize;
    
    ctx.save();
    
    // Крючок
    ctx.strokeStyle = '#c0c8d0';
    ctx.lineWidth = rodWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, rodTop, 10, 0, Math.PI);
    ctx.stroke();
    
    ctx.fillStyle = '#d0d8e0';
    ctx.fillRect(centerX - rodWidth/2, rodTop, rodWidth, 10);
    
    // Стержень
    const rodGradient = ctx.createLinearGradient(
        centerX - rodWidth/2, rodY,
        centerX + rodWidth/2, rodY
    );
    rodGradient.addColorStop(0, '#8090a0');
    rodGradient.addColorStop(0.5, '#f0f4f8');
    rodGradient.addColorStop(1, '#8090a0');
    
    ctx.fillStyle = rodGradient;
    ctx.fillRect(centerX - rodWidth/2, rodY, rodWidth, rodHeight);
    
    ctx.restore();
    
    // Позиции дисков на штанге (снизу вверх)
    let currentY = rodY + rodHeight - 20;
    
    // Диск 50г (самый нижний, самый большой)
    drawDiskOnRod(ctx, centerX, currentY, 65, 5, 4, '#a0a8b0');
    currentY -= 15;
    
    // Диск 20г
    drawDiskOnRod(ctx, centerX, currentY, 50, 5, 3, '#a8b0b8');
    currentY -= 12;
    
    // Диск 10г (верхний, самый маленький)
    drawDiskOnRod(ctx, centerX, currentY, 40, 5, 3, '#b0b8c0');
    
    // Итоговая масса
    ctx.save();
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#2a5298';
    ctx.textAlign = 'center';
    ctx.fillText('Σ = 90 г', centerX, rodY + rodHeight + 40);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('(10г + 50г + 20г + 10г)', centerX, rodY + rodHeight + 60);
    ctx.restore();
}

// Вспомогательная функция: диск на штанге (вид сбоку)
function drawDiskOnRod(ctx, x, y, radius, innerR, thickness, color) {
    ctx.save();
    
    // Боковая грань диска
    const gradient = ctx.createLinearGradient(x - radius, y, x + radius, y);
    gradient.addColorStop(0, darken(color, 0.4));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, darken(color, 0.4));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - thickness/2, radius * 2, thickness);
    
    // Обводка
    ctx.strokeStyle = darken(color, 0.5);
    ctx.lineWidth = 1;
    ctx.strokeRect(x - radius, y - thickness/2, radius * 2, thickness);
    
    // Блики
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(x - radius * 0.7, y - thickness/2 + 0.5, radius * 0.3, 1);
    
    ctx.restore();
}

// ========================
// УТИЛИТЫ: работа с цветом
// ========================
function lighten(color, factor) {
    // Простое осветление hex-цвета
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
    const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
    const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
}

function darken(color, factor) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const newR = Math.max(0, Math.floor(r * (1 - factor)));
    const newG = Math.max(0, Math.floor(g * (1 - factor)));
    const newB = Math.max(0, Math.floor(b * (1 - factor)));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
}

// ========================
// ИНИЦИАЛИЗАЦИЯ
// ========================
window.addEventListener('DOMContentLoaded', () => {
    drawRod10g('rod-canvas');
    drawDisk10g('disk-10g-canvas');
    drawDisk20g('disk-20g-canvas');
    drawDisk50g('disk-50g-canvas');
    drawAssembly('assembly-canvas');
    
    console.log('✅ Все элементы наборного груза отрисованы');
});
