// Эксперимент: Тепловые явления
class ThermalExperiment {
    constructor() {
        this.canvas = document.getElementById('thermalCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.temperature = 20; // начальная температура °C
        this.power = 500; // мощность нагрева в Вт
        this.time = 0; // время в секундах
        this.isHeating = false;
        this.animationId = null;
        
        // Параметры воды
        this.mass = 0.5; // кг
        this.specificHeat = 4200; // Дж/(кг·°C)
        
        this.init();
    }

    init() {
        this.setupEvents();
        this.draw();
    }

    setupEvents() {
        // Слайдер мощности
        const powerSlider = document.getElementById('powerSlider');
        const powerValue = document.getElementById('powerValue');
        
        if (powerSlider) {
            powerSlider.addEventListener('input', (e) => {
                this.power = parseInt(e.target.value);
                powerValue.textContent = this.power + ' Вт';
            });
        }

        // Кнопка начала нагрева
        const startBtn = document.getElementById('startHeating');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startHeating());
        }

        // Кнопка остановки
        const stopBtn = document.getElementById('stopHeating');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopHeating());
        }
    }

    startHeating() {
        if (this.isHeating) return;
        
        this.isHeating = true;
        this.lastTime = Date.now();
        this.animate();
    }

    stopHeating() {
        this.isHeating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.isHeating) return;

        const now = Date.now();
        const deltaTime = (now - this.lastTime) / 1000; // в секундах
        this.lastTime = now;

        // Расчёт нагрева: Q = m * c * ΔT
        // ΔT = Q / (m * c) = P * t / (m * c)
        const energyAdded = this.power * deltaTime;
        const tempIncrease = energyAdded / (this.mass * this.specificHeat);
        
        this.temperature += tempIncrease;
        this.time += deltaTime;

        // Ограничение температуры
        if (this.temperature >= 100) {
            this.temperature = 100;
            this.stopHeating();
            alert('Вода закипела! 💧💨');
        }

        this.updateDisplay();
        this.draw();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    updateDisplay() {
        document.getElementById('temperature').textContent = this.temperature.toFixed(1) + '°C';
        document.getElementById('heatingTime').textContent = this.time.toFixed(1) + ' с';
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Фон
        ctx.fillStyle = '#f0f4f8';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Заголовок
        ctx.fillStyle = '#667eea';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Нагревание воды', 50, 50);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Горелка
        this.drawBurner(centerX, centerY + 200);

        // Колба с водой
        this.drawFlask(centerX, centerY);

        // Термометр
        this.drawThermometer(centerX + 250, centerY);

        // График температуры
        this.drawGraph(centerX - 350, centerY - 150);

        // Молекулы (анимация)
        if (this.isHeating) {
            this.drawMolecules(centerX, centerY);
        }

        // Информация
        ctx.fillStyle = '#333';
        ctx.font = '18px Arial';
        ctx.fillText(`Масса воды: ${this.mass} кг`, 50, 100);
        ctx.fillText(`Удельная теплоёмкость: ${this.specificHeat} Дж/(кг·°C)`, 50, 130);
        ctx.fillText(`Мощность нагрева: ${this.power} Вт`, 50, 160);
    }

    drawBurner(x, y) {
        const ctx = this.ctx;
        
        // Основание горелки
        ctx.fillStyle = '#616161';
        ctx.fillRect(x - 60, y, 120, 30);
        
        // Пламя
        if (this.isHeating) {
            const flameHeight = 80 + Math.random() * 20;
            const gradient = ctx.createLinearGradient(x, y - flameHeight, x, y);
            gradient.addColorStop(0, '#FFF59D');
            gradient.addColorStop(0.3, '#FFB74D');
            gradient.addColorStop(0.7, '#FF5722');
            gradient.addColorStop(1, '#D32F2F');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(
                x - 40, y - flameHeight / 2,
                x - 30, y - flameHeight,
                x, y - flameHeight
            );
            ctx.bezierCurveTo(
                x + 30, y - flameHeight,
                x + 40, y - flameHeight / 2,
                x, y
            );
            ctx.fill();

            // Внутренняя часть пламени
            ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
            ctx.beginPath();
            ctx.ellipse(x, y - 30, 15, 25, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawFlask(x, y) {
        const ctx = this.ctx;
        
        // Горлышко колбы
        ctx.fillStyle = 'rgba(200, 230, 255, 0.3)';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.fillRect(x - 20, y - 180, 40, 40);
        ctx.strokeRect(x - 20, y - 180, 40, 40);
        
        // Тело колбы
        ctx.beginPath();
        ctx.arc(x, y - 50, 100, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 230, 255, 0.3)';
        ctx.fill();
        ctx.stroke();

        // Вода внутри
        const waterLevel = (this.temperature - 20) / 80; // 0 to 1
        const waterColor = this.getWaterColor();
        
        ctx.fillStyle = waterColor;
        ctx.beginPath();
        ctx.arc(x, y - 50, 90, 0, Math.PI * 2);
        ctx.fill();

        // Пузырьки при кипении
        if (this.temperature > 90) {
            this.drawBubbles(x, y - 50);
        }
    }

    getWaterColor() {
        // Цвет воды меняется от синего к красноватому при нагреве
        const ratio = Math.min(this.temperature / 100, 1);
        const r = Math.floor(100 + ratio * 155);
        const g = Math.floor(200 - ratio * 50);
        const b = Math.floor(255 - ratio * 100);
        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    }

    drawBubbles(x, y) {
        const ctx = this.ctx;
        const numBubbles = Math.floor(this.temperature - 85);
        
        for (let i = 0; i < numBubbles; i++) {
            const bubbleX = x + (Math.random() - 0.5) * 160;
            const bubbleY = y + (Math.random() - 0.5) * 160;
            const radius = Math.random() * 5 + 2;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawMolecules(x, y) {
        const ctx = this.ctx;
        const speed = this.temperature / 20; // скорость движения молекул
        
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 80;
            const moleculeX = x + Math.cos(angle + Date.now() / 1000 * speed) * distance;
            const moleculeY = y - 50 + Math.sin(angle + Date.now() / 1000 * speed) * distance;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(moleculeX, moleculeY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawThermometer(x, y) {
        const ctx = this.ctx;
        
        // Корпус термометра
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(x - 15, y - 150, 30, 200);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 15, y - 150, 30, 200);
        
        // Колба термометра
        ctx.fillStyle = '#BDBDBD';
        ctx.beginPath();
        ctx.arc(x, y + 60, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Ртуть/спирт
        const mercuryHeight = (this.temperature / 100) * 180;
        const mercuryColor = this.temperature > 80 ? '#F44336' : '#2196F3';
        
        ctx.fillStyle = mercuryColor;
        ctx.fillRect(x - 8, y + 50 - mercuryHeight, 16, mercuryHeight);
        
        ctx.beginPath();
        ctx.arc(x, y + 60, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Шкала
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        
        for (let temp = 0; temp <= 100; temp += 20) {
            const markY = y + 50 - (temp / 100) * 180;
            ctx.beginPath();
            ctx.moveTo(x + 15, markY);
            ctx.lineTo(x + 25, markY);
            ctx.stroke();
            ctx.fillText(temp + '°C', x + 55, markY + 5);
        }
        
        ctx.textAlign = 'left';
    }

    drawGraph(x, y) {
        const ctx = this.ctx;
        
        // Рамка графика
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 250, 200);
        
        // Заголовок
        ctx.fillStyle = '#667eea';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('График нагрева', x + 50, y - 10);
        
        // Оси
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 170);
        ctx.lineTo(x + 230, y + 170);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 170);
        ctx.lineTo(x + 30, y + 20);
        ctx.stroke();
        
        // Подписи осей
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('Время (с)', x + 100, y + 195);
        ctx.save();
        ctx.translate(x + 10, y + 100);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('T (°C)', 0, 0);
        ctx.restore();
        
        // График (упрощённая прямая)
        if (this.time > 0) {
            ctx.strokeStyle = '#FF5722';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 30, y + 170 - (20 - 20) * 1.5);
            
            const endX = x + 30 + Math.min(this.time * 3, 200);
            const endY = y + 170 - (this.temperature - 20) * 1.5;
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    reset() {
        this.stopHeating();
        this.temperature = 20;
        this.time = 0;
        this.power = 500;
        document.getElementById('powerSlider').value = 500;
        document.getElementById('powerValue').textContent = '500 Вт';
        this.updateDisplay();
        this.draw();
    }
}
