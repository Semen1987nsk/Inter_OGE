// Главный файл приложения
class InteractiveLabApp {
    constructor() {
        this.currentExperiment = null;
        this.experiments = {};
        this.selectedKit = null;
    }

    init() {
        // Show start screen first
        this.showStartScreen();
        
        // Initialize all experiments
        this.experiments = {
            mechanics: new MechanicsExperiment('mechanicsCanvas'),
            electricity: new ElectricityExperiment('electricityCanvas'),
            optics: new OpticsExperiment('opticsCanvas'),
            thermal: new ThermalExperiment('thermalCanvas')
        };

        // Setup navigation
        this.setupMenuNavigation();
        
        // Setup catalog
        this.setupCatalog();
    }

    showStartScreen() {
        const startScreen = document.getElementById('startScreen');
        const mainContent = document.querySelector('header, main, footer');
        
        if (startScreen) {
            startScreen.classList.add('active');
            
            // Hide main interface
            if (mainContent) {
                document.querySelector('header')?.classList.add('hidden');
                document.querySelector('main')?.classList.add('hidden');
                document.querySelector('footer')?.classList.add('hidden');
            }
            
            // Setup kit selection buttons
            this.setupKitSelection();
        }
    }

    setupKitSelection() {
        // Generate kit cards dynamically
        const kitsGrid = document.querySelector('.kits-grid');
        if (!kitsGrid || !window.EquipmentKits) return;

        kitsGrid.innerHTML = '';

        Object.entries(EquipmentKits).forEach(([kitId, kit]) => {
            const card = this.createKitCard(kitId, kit);
            kitsGrid.appendChild(card);
        });
    }

    createKitCard(kitId, kit) {
        const card = document.createElement('div');
        card.className = 'kit-card';
        card.dataset.kitId = kitId;

        const difficultyIcons = {
            'начальный': '⭐',
            'средний': '⭐⭐',
            'продвинутый': '⭐⭐⭐'
        };

        const categoryColors = {
            'Механика': '#FF6B35',
            'Электричество': '#FFD700',
            'Оптика': '#9B59B6',
            'Термодинамика': '#E74C3C'
        };

        // Limit equipment display to first 4 items
        const equipmentPreview = kit.equipment.slice(0, 4);

        card.innerHTML = `
            <div class="kit-header">
                <div class="kit-icon">${kit.icon || '🔬'}</div>
                <div class="kit-number">${kit.id}</div>
                <div class="kit-title">
                    <h3>${kit.name}</h3>
                    <span class="kit-category" style="background: ${categoryColors[kit.category] || 'rgba(255,255,255,0.2)'}">
                        ${kit.category}
                    </span>
                </div>
            </div>
            <p class="kit-description">${kit.description}</p>
            <div class="kit-info">
                <div class="kit-info-item">
                    <span>🧪</span>
                    <span>${kit.experiments.length} экспериментов</span>
                </div>
                <div class="kit-info-item">
                    <span>${difficultyIcons[kit.difficulty]}</span>
                    <span>${kit.difficulty}</span>
                </div>
            </div>
            <div class="kit-equipment-preview">
                <h4>Оборудование:</h4>
                <div class="equipment-list">
                    ${equipmentPreview.map(eq => `<div class="equipment-item">${eq}</div>`).join('')}
                    ${kit.equipment.length > 4 ? `<div class="equipment-item">... и ещё ${kit.equipment.length - 4}</div>` : ''}
                </div>
            </div>
            <div class="kit-action">
                <button class="select-kit-btn">Выбрать комплект</button>
            </div>
        `;

        // Add click handler
        const selectBtn = card.querySelector('.select-kit-btn');
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectKit(kitId, kit);
        });

        return card;
    }

    selectKit(kitId, kit) {
        this.selectedKit = {
            id: kitId,
            ...kit
        };

        console.log('Selected kit:', this.selectedKit);

        // Animate transition
        const startScreen = document.getElementById('startScreen');
        startScreen.style.transition = 'opacity 0.5s ease-out';
        startScreen.style.opacity = '0';

        setTimeout(() => {
            startScreen.classList.remove('active');
            startScreen.style.opacity = '1';
            
            // Show main interface
            document.querySelector('header')?.classList.remove('hidden');
            document.querySelector('main')?.classList.remove('hidden');
            document.querySelector('footer')?.classList.remove('hidden');

            // Show first experiment from selected kit
            if (this.selectedKit.experiments && this.selectedKit.experiments.length > 0) {
                const firstExperiment = this.selectedKit.experiments[0].toLowerCase();
                // Map experiment names to panel IDs
                const experimentMap = {
                    'плотность': 'mechanics',
                    'пружина': 'mechanics',
                    'закон ома': 'electricity',
                    'мощность': 'electricity',
                    'преломление': 'optics',
                    'фокусное': 'optics',
                    'теплоёмкость': 'thermal'
                };
                
                for (const [key, value] of Object.entries(experimentMap)) {
                    if (firstExperiment.includes(key)) {
                        this.showExperiment(value);
                        break;
                    }
                }
            } else {
                this.showExperiment('mechanics');
            }
        }, 500);
    }

    showExperiment(experimentId) {
        // Hide all panels
        document.querySelectorAll('.experiment-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        // Show selected panel
        const panel = document.getElementById(experimentId);
        if (panel) {
            panel.style.display = 'flex';
        }

        // Stop current experiment
        if (this.currentExperiment && this.experiments[this.currentExperiment]) {
            if (typeof this.experiments[this.currentExperiment].stop === 'function') {
                this.experiments[this.currentExperiment].stop();
            }
        }

        // Start new experiment
        this.currentExperiment = experimentId;
        if (this.experiments[experimentId]) {
            if (typeof this.experiments[experimentId].start === 'function') {
                this.experiments[experimentId].start();
            }
        }

        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.experiment === experimentId) {
                item.classList.add('active');
            }
        });
    }

    setupMenuNavigation() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const experimentId = item.dataset.experiment;
                this.showExperiment(experimentId);
            });
        });
    }

    setupCatalog() {
        const catalogItems = document.querySelectorAll('.catalog-item');
        catalogItems.forEach(item => {
            item.addEventListener('click', () => {
                const experimentType = item.dataset.experiment;
                if (experimentType) {
                    this.showExperiment(experimentType);
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }
}

// Запускаем приложение после загрузки DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔬 Запуск интерактивной лаборатории физики...');
    
    // Предзагружаем изображения оборудования Labosfera
    if (typeof preloadImages === 'function') {
        await preloadImages();
    }
    
    const app = new InteractiveLabApp();
    app.init();
    console.log('✅ Интерактивная лаборатория физики готова!');
});
