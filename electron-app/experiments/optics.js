// Эксперимент: Преломление света
class OpticsExperiment {
    constructor() {
        this.canvas = document.getElementById('opticsCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.angle = 45; // угол падения
        this.medium = 'air'; // среда
        
        this.refractiveIndices = {
            air: 1.33,  // воздух → вода
            glass: 1.5, // воздух → стекло
            diamond: 2.42 // воздух → алмаз
        };
        
        this.init();
    }

    init() {
        this.setupEvents();
        this.draw();
        this.calculate();
    }

    setupEvents() {
        // Слайдер угла
        const angleSlider = document.getElementById('angleSlider');
        const angleValue = document.getElementById('angleValue');
        
        if (angleSlider) {
            angleSlider.addEventListener('input', (e) => {
                this.angle = parseInt(e.target.value);
                angleValue.textContent = this.angle + '°';
                this.draw();
                this.calculate();
            });
        }

        // Выбор среды
        const mediumSelect = document.getElementById('mediumSelect');
        if (mediumSelect) {
            mediumSelect.addEventListener('change', (e) => {
                this.medium = e.target.value;
                this.draw();
                this.calculate();
            });
        }
    }

    calculate() {
        // Закон Снеллиуса: n1 * sin(θ1) = n2 * sin(θ2)
        const n1 = 1; // показатель преломления воздуха
        const n2 = this.refractiveIndices[this.medium];
        
        const angleRad = this.angle * Math.PI / 180;
        const sinTheta2 = (n1 * Math.sin(angleRad)) / n2;
        
        if (sinTheta2 > 1) {
            // Полное внутреннее отражение
            document.getElementById('refractionAngle').textContent = 'Полное отражение!';
        } else {
            const theta2Rad = Math.asin(sinTheta2);
            const theta2 = theta2Rad * 180 / Math.PI;
            document.getElementById('refractionAngle').textContent = theta2.toFixed(1) + '°';
        }
        
        document.getElementById('refractiveIndex').textContent = n2.toFixed(2);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Верхняя среда (воздух)
        ctx.fillStyle = '#E3F2FD';
        ctx.fillRect(0, 0, this.canvas.width, centerY);

        // Нижняя среда
        const colors = {
            air: '#B3E5FC',
            glass: '#90CAF9',
            diamond: '#64B5F6'
        };
        ctx.fillStyle = colors[this.medium];
        ctx.fillRect(0, centerY, this.canvas.width, centerY);

        // Граница раздела сред
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(this.canvas.width, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Нормаль
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, this.canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Падающий луч
        const angleRad = this.angle * Math.PI / 180;
        const rayLength = 250;
        
        const startX = centerX - rayLength * Math.sin(angleRad);
        const startY = centerY - rayLength * Math.cos(angleRad);

        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();

        // Стрелка на падающем луче
        this.drawArrow(ctx, startX, startY, centerX, centerY, '#FF5722');

        // Преломлённый луч
        const n1 = 1;
        const n2 = this.refractiveIndices[this.medium];
        const sinTheta2 = (n1 * Math.sin(angleRad)) / n2;

        if (sinTheta2 <= 1) {
            const theta2Rad = Math.asin(sinTheta2);
            const endX = centerX + rayLength * Math.sin(theta2Rad);
            const endY = centerY + rayLength * Math.cos(theta2Rad);

            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Стрелка на преломлённом луче
            this.drawArrow(ctx, centerX, centerY, endX, endY, '#4CAF50');

            // Угол преломления
            this.drawAngle(ctx, centerX, centerY, theta2Rad, false, '#4CAF50', 'θ₂');
        } else {
            // Отражённый луч при полном внутреннем отражении
            const reflectX = centerX + rayLength * Math.sin(angleRad);
            const reflectY = centerY - rayLength * Math.cos(angleRad);

            ctx.strokeStyle = '#FFC107';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(reflectX, reflectY);
            ctx.stroke();

            this.drawArrow(ctx, centerX, centerY, reflectX, reflectY, '#FFC107');
        }

        // Угол падения
        this.drawAngle(ctx, centerX, centerY, angleRad, true, '#FF5722', 'θ₁');

        // Подписи сред
        ctx.fillStyle = '#333';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Воздух (n₁ = 1.0)', 50, 50);
        
        const mediumNames = {
            air: 'Вода',
            glass: 'Стекло',
            diamond: 'Алмаз'
        };
        ctx.fillText(`${mediumNames[this.medium]} (n₂ = ${this.refractiveIndices[this.medium]})`, 50, centerY + 50);

        // Легенда
        ctx.font = '16px Arial';
        ctx.fillStyle = '#FF5722';
        ctx.fillText('━━ Падающий луч', 900, 50);
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('━━ Преломлённый луч', 900, 80);
        ctx.fillStyle = '#999';
        ctx.fillText('┊┊┊ Нормаль', 900, 110);
    }

    drawArrow(ctx, fromX, fromY, toX, toY, color) {
        const headlen = 15;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headlen * Math.cos(angle - Math.PI / 6),
            toY - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headlen * Math.cos(angle + Math.PI / 6),
            toY - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    drawAngle(ctx, x, y, angle, isTop, color, label) {
        const radius = 60;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        if (isTop) {
            ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + angle, false);
        } else {
            ctx.arc(x, y, radius, Math.PI / 2, Math.PI / 2 - angle, true);
        }
        ctx.stroke();

        // Подпись угла
        ctx.fillStyle = color;
        ctx.font = 'bold 18px Arial';
        const labelX = x + radius * 0.7 * (isTop ? -Math.sin(angle / 2) : Math.sin(angle / 2));
        const labelY = y + radius * 0.7 * (isTop ? -Math.cos(angle / 2) : Math.cos(angle / 2));
        ctx.fillText(label, labelX, labelY);
    }

    reset() {
        this.angle = 45;
        document.getElementById('angleSlider').value = 45;
        document.getElementById('angleValue').textContent = '45°';
        this.medium = 'air';
        document.getElementById('mediumSelect').value = 'air';
        this.draw();
        this.calculate();
    }
}
