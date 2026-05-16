// Эксперимент: Сборка электрической цепи
class ElectricityExperiment {
    constructor() {
        this.canvas = document.getElementById('circuitCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.elements = [];
        this.wires = [];
        this.selectedTool = null;
        this.connectingFrom = null;
        
        this.init();
    }

    init() {
        this.setupEvents();
        this.draw();
    }

    setupEvents() {
        // Выбор инструмента
        const toolBtns = document.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTool = btn.dataset.tool;
            });
        });

        // Очистка цепи
        const clearBtn = document.getElementById('clearCircuit');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCircuit());
        }

        // Проверка цепи
        const testBtn = document.getElementById('testCircuit');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testCircuit());
        }

        // События канваса
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleClick(e.touches[0]);
        });
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (!this.selectedTool) {
            alert('Сначала выберите элемент из палитры!');
            return;
        }

        if (this.selectedTool === 'wire') {
            this.handleWireConnection(x, y);
        } else {
            this.addElement(x, y);
        }

        this.draw();
    }

    addElement(x, y) {
        const element = {
            type: this.selectedTool,
            x: x - 40,
            y: y - 40,
            width: 80,
            height: 80,
            id: Date.now(),
            connections: [],
            state: false // для выключателя и лампочки
        };

        // Особые свойства для разных элементов
        switch(this.selectedTool) {
            case 'battery':
                element.voltage = 4.5; // Вольт
                break;
            case 'resistor':
                element.resistance = 100; // Ом
                break;
            case 'ammeter':
                element.current = 0;
                break;
            case 'voltmeter':
                element.voltage = 0;
                break;
        }

        this.elements.push(element);
    }

    handleWireConnection(x, y) {
        // Находим элемент под курсором
        const element = this.findElementAt(x, y);
        
        if (!element) {
            alert('Кликните на элемент, чтобы соединить его проводом!');
            return;
        }

        if (!this.connectingFrom) {
            this.connectingFrom = element;
            alert('Теперь кликните на второй элемент для соединения');
        } else {
            if (this.connectingFrom.id !== element.id) {
                this.wires.push({
                    from: this.connectingFrom.id,
                    to: element.id
                });
                this.connectingFrom.connections.push(element.id);
                element.connections.push(this.connectingFrom.id);
            }
            this.connectingFrom = null;
        }
    }

    findElementAt(x, y) {
        return this.elements.find(el => 
            x >= el.x && x <= el.x + el.width &&
            y >= el.y && y <= el.y + el.height
        );
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
        ctx.fillText('Соберите электрическую цепь', 50, 50);

        // Сетка для удобства
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, this.canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < this.canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(this.canvas.width, i);
            ctx.stroke();
        }

        // Рисуем провода
        this.wires.forEach(wire => this.drawWire(wire));

        // Рисуем элементы
        this.elements.forEach(el => this.drawElement(el));

        // Инструкция
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.fillText('Выберите элемент и кликните на поле, чтобы добавить его', 50, 100);
    }

    drawWire(wire) {
        const fromEl = this.elements.find(e => e.id === wire.from);
        const toEl = this.elements.find(e => e.id === wire.to);
        
        if (!fromEl || !toEl) return;

        const ctx = this.ctx;
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fromEl.x + fromEl.width / 2, fromEl.y + fromEl.height / 2);
        ctx.lineTo(toEl.x + toEl.width / 2, toEl.y + toEl.height / 2);
        ctx.stroke();
    }

    drawElement(el) {
        const ctx = this.ctx;
        
        // Фон элемента
        ctx.fillStyle = 'white';
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.strokeRect(el.x, el.y, el.width, el.height);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';

        const centerX = el.x + el.width / 2;
        const centerY = el.y + el.height / 2;

        switch(el.type) {
            case 'battery':
                ctx.fillText('🔋', centerX, centerY - 5);
                ctx.font = '12px Arial';
                ctx.fillText(el.voltage + 'V', centerX, centerY + 15);
                break;
            case 'bulb':
                ctx.fillText('💡', centerX, centerY + 5);
                break;
            case 'resistor':
                ctx.fillText('⚡', centerX, centerY - 5);
                ctx.font = '12px Arial';
                ctx.fillText(el.resistance + 'Ω', centerX, centerY + 15);
                break;
            case 'switch':
                ctx.fillText('🔘', centerX, centerY + 5);
                break;
            case 'ammeter':
                ctx.fillText('📊 A', centerX, centerY - 5);
                ctx.font = '12px Arial';
                ctx.fillText(el.current.toFixed(2) + 'A', centerX, centerY + 15);
                break;
            case 'voltmeter':
                ctx.fillText('📈 V', centerX, centerY - 5);
                ctx.font = '12px Arial';
                ctx.fillText(el.voltage.toFixed(1) + 'V', centerX, centerY + 15);
                break;
        }

        ctx.textAlign = 'left';
    }

    testCircuit() {
        // Проверяем наличие батарейки
        const battery = this.elements.find(e => e.type === 'battery');
        if (!battery) {
            alert('❌ В цепи нет источника питания!');
            return;
        }

        // Проверяем замкнутость цепи
        if (this.wires.length < this.elements.length - 1) {
            alert('❌ Цепь не замкнута! Соедините все элементы проводами.');
            return;
        }

        // Упрощённый расчёт
        const resistors = this.elements.filter(e => e.type === 'resistor');
        const totalResistance = resistors.reduce((sum, r) => sum + r.resistance, 10); // 10 Ом - сопротивление лампы
        const current = battery.voltage / totalResistance;

        // Обновляем показания приборов
        this.elements.forEach(el => {
            if (el.type === 'ammeter') {
                el.current = current;
            }
            if (el.type === 'voltmeter') {
                el.voltage = battery.voltage;
            }
            if (el.type === 'bulb') {
                el.state = current > 0.1; // Лампа горит если ток достаточный
            }
        });

        this.draw();
        alert(`✅ Цепь работает!\nНапряжение: ${battery.voltage}V\nСила тока: ${current.toFixed(3)}A\nОбщее сопротивление: ${totalResistance}Ω`);
    }

    clearCircuit() {
        this.elements = [];
        this.wires = [];
        this.connectingFrom = null;
        this.draw();
    }

    reset() {
        this.clearCircuit();
    }
}
