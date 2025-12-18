// Эксперимент: Измерение плотности жидкости
class MechanicsExperiment {
    constructor() {
        this.canvas = document.getElementById('densityCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.liquids = {
            water: { name: 'Вода', density: 1000, color: '#4FC3F7' },
            oil: { name: 'Масло', density: 920, color: '#FDD835' },
            alcohol: { name: 'Спирт', density: 790, color: '#E1F5FE' },
            glycerin: { name: 'Глицерин', density: 1260, color: '#C5CAE9' }
        };
        
        this.currentLiquid = 'water';
        this.draggingItem = null;
        this.items = [];
        this.measurements = [];
        
        this.init();
    }

    init() {
        this.setupItems();
        this.setupEvents();
        this.draw();
    }

    setupItems() {
        // Предметы для опыта
        this.items = [
            { 
                type: 'beaker', 
                x: 300, 
                y: 500, 
                width: 150, 
                height: 200, 
                label: 'Мензурка',
                filled: false,
                liquidLevel: 0
            },
            { 
                type: 'cylinder', 
                x: 500, 
                y: 300, 
                width: 80, 
                height: 120, 
                label: 'Цилиндр',
                mass: 100, // граммы
                volume: 50 // мл
            },
            { 
                type: 'scale', 
                x: 700, 
                y: 500, 
                width: 120, 
                height: 100, 
                label: 'Весы',
                reading: 0
            },
            {
                type: 'bottle',
                x: 900,
                y: 300,
                width: 100,
                height: 150,
                label: 'Бутылка с жидкостью',
                canPour: true
            }
        ];
    }

    setupEvents() {
        // Выбор жидкости
        const liquidSelect = document.getElementById('liquidSelect');
        if (liquidSelect) {
            liquidSelect.addEventListener('change', (e) => {
                this.currentLiquid = e.target.value;
                this.draw();
            });
        }

        // Кнопка сброса
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        // Кнопка измерения
        const measureBtn = document.getElementById('measureBtn');
        if (measureBtn) {
            measureBtn.addEventListener('click', () => this.performMeasurement());
        }

        // Поддержка мыши и тач-событий
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleStart(e.touches[0]);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleMove(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleEnd(e);
        });
    }

    handleStart(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Проверяем, попали ли мы в какой-то предмет
        for (let item of this.items) {
            if (x >= item.x && x <= item.x + item.width &&
                y >= item.y && y <= item.y + item.height) {
                this.draggingItem = item;
                this.dragOffsetX = x - item.x;
                this.dragOffsetY = y - item.y;
                break;
            }
        }
    }

    handleMove(e) {
        if (!this.draggingItem) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.draggingItem.x = x - this.dragOffsetX;
        this.draggingItem.y = y - this.dragOffsetY;

        this.draw();
    }

    handleEnd(e) {
        if (this.draggingItem) {
            this.checkInteractions();
            this.draggingItem = null;
            this.draw();
        }
    }

    checkInteractions() {
        // Проверяем взаимодействия между предметами
        const beaker = this.items.find(i => i.type === 'beaker');
        const bottle = this.items.find(i => i.type === 'bottle');
        const cylinder = this.items.find(i => i.type === 'cylinder');
        const scale = this.items.find(i => i.type === 'scale');

        // Наливаем жидкость в мензурку
        if (this.draggingItem === bottle && beaker) {
            const distance = Math.sqrt(
                Math.pow(bottle.x - beaker.x, 2) + 
                Math.pow(bottle.y - beaker.y, 2)
            );
            if (distance < 200) {
                beaker.filled = true;
                beaker.liquidLevel = 100; // мл
            }
        }

        // Помещаем цилиндр на весы
        if (this.draggingItem === cylinder && scale) {
            const distance = Math.sqrt(
                Math.pow(cylinder.x - scale.x, 2) + 
                Math.pow(cylinder.y - scale.y, 2)
            );
            if (distance < 150) {
                scale.reading = cylinder.mass;
            }
        }

        // Опускаем цилиндр в жидкость
        if (this.draggingItem === cylinder && beaker && beaker.filled) {
            const distance = Math.sqrt(
                Math.pow(cylinder.x - beaker.x, 2) + 
                Math.pow(cylinder.y - beaker.y, 2)
            );
            if (distance < 150) {
                beaker.liquidLevel += cylinder.volume;
                cylinder.inLiquid = true;
            }
        }
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
        ctx.fillText('Перетаскивайте предметы для проведения опыта', 50, 50);

        // Рисуем все предметы
        this.items.forEach(item => {
            this.drawItem(item);
        });

        // Информация о текущей жидкости
        const liquid = this.liquids[this.currentLiquid];
        ctx.fillStyle = '#333';
        ctx.font = '18px Arial';
        ctx.fillText(`Текущая жидкость: ${liquid.name} (плотность: ${liquid.density} кг/м³)`, 50, 100);
    }

    drawItem(item) {
        const ctx = this.ctx;

        switch(item.type) {
            case 'beaker':
                this.drawBeaker(item);
                break;
            case 'cylinder':
                this.drawCylinder(item);
                break;
            case 'scale':
                this.drawScale(item);
                break;
            case 'bottle':
                this.drawBottle(item);
                break;
        }

        // Подпись
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, item.x + item.width / 2, item.y + item.height + 20);
        ctx.textAlign = 'left';
    }

    drawBeaker(item) {
        const ctx = this.ctx;
        
        // Контур мензурки
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(item.x, item.y + item.height);
        ctx.lineTo(item.x + item.width, item.y + item.height);
        ctx.lineTo(item.x + item.width, item.y);
        ctx.stroke();

        // Жидкость внутри
        if (item.filled && item.liquidLevel > 0) {
            const liquid = this.liquids[this.currentLiquid];
            ctx.fillStyle = liquid.color;
            const liquidHeight = (item.liquidLevel / 200) * item.height;
            ctx.fillRect(
                item.x + 5, 
                item.y + item.height - liquidHeight, 
                item.width - 10, 
                liquidHeight
            );
        }

        // Шкала на мензурке
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            const markY = item.y + (item.height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(item.x, markY);
            ctx.lineTo(item.x + 20, markY);
            ctx.stroke();
            
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.fillText((5 - i) * 50 + ' мл', item.x + 25, markY + 5);
        }
    }

    drawCylinder(item) {
        const ctx = this.ctx;
        
        ctx.fillStyle = '#90A4AE';
        ctx.strokeStyle = '#546E7A';
        ctx.lineWidth = 2;
        
        // Тело цилиндра
        ctx.fillRect(item.x, item.y, item.width, item.height);
        ctx.strokeRect(item.x, item.y, item.width, item.height);
        
        // Эллипс сверху
        ctx.beginPath();
        ctx.ellipse(
            item.x + item.width / 2, 
            item.y, 
            item.width / 2, 
            15, 
            0, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();

        // Масса
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.mass + 'г', item.x + item.width / 2, item.y + item.height / 2);
        ctx.textAlign = 'left';
    }

    drawScale(item) {
        const ctx = this.ctx;
        
        // Основание весов
        ctx.fillStyle = '#BDBDBD';
        ctx.fillRect(item.x, item.y + item.height - 20, item.width, 20);
        
        // Платформа
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(item.x - 10, item.y + item.height - 30, item.width + 20, 10);
        
        // Экран
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(item.x + 20, item.y, item.width - 40, 40);
        
        // Показания
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.reading + ' г', item.x + item.width / 2, item.y + 27);
        ctx.textAlign = 'left';
    }

    drawBottle(item) {
        const ctx = this.ctx;
        const liquid = this.liquids[this.currentLiquid];
        
        // Горлышко
        ctx.fillStyle = '#B0BEC5';
        ctx.fillRect(item.x + 35, item.y, 30, 40);
        
        // Тело бутылки
        ctx.fillStyle = '#CFD8DC';
        ctx.fillRect(item.x, item.y + 40, item.width, item.height - 40);
        
        // Жидкость
        ctx.fillStyle = liquid.color;
        ctx.fillRect(item.x + 5, item.y + 60, item.width - 10, item.height - 70);
        
        // Крышка
        ctx.fillStyle = '#78909C';
        ctx.fillRect(item.x + 30, item.y - 10, 40, 10);
    }

    performMeasurement() {
        const beaker = this.items.find(i => i.type === 'beaker');
        const cylinder = this.items.find(i => i.type === 'cylinder');
        const scale = this.items.find(i => i.type === 'scale');

        if (!beaker.filled) {
            alert('Сначала налейте жидкость в мензурку!');
            return;
        }

        if (scale.reading === 0) {
            alert('Сначала измерьте массу цилиндра на весах!');
            return;
        }

        // Расчёт плотности
        const volume = cylinder.volume / 1000000; // переводим мл в м³
        const mass = cylinder.mass / 1000; // переводим г в кг
        const calculatedDensity = (mass / volume).toFixed(0);

        const liquid = this.liquids[this.currentLiquid];
        const measurement = {
            liquid: liquid.name,
            mass: cylinder.mass,
            volume: cylinder.volume,
            density: calculatedDensity,
            theoretical: liquid.density
        };

        this.measurements.push(measurement);
        this.displayMeasurements();
    }

    displayMeasurements() {
        const container = document.getElementById('measurements');
        if (!container) return;

        container.innerHTML = '';
        this.measurements.forEach((m, index) => {
            const div = document.createElement('div');
            div.className = 'measurement-item';
            div.innerHTML = `
                <strong>Измерение ${index + 1}</strong><br>
                Жидкость: ${m.liquid}<br>
                Масса цилиндра: ${m.mass} г<br>
                Объём: ${m.volume} мл<br>
                Рассчитанная плотность: ${m.density} кг/м³<br>
                Теоретическая плотность: ${m.theoretical} кг/м³<br>
                Погрешность: ${Math.abs(m.density - m.theoretical)} кг/м³
            `;
            container.appendChild(div);
        });
    }

    reset() {
        this.setupItems();
        this.measurements = [];
        this.displayMeasurements();
        this.draw();
    }
}
