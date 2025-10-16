// ============================================
// ВИРТУАЛЬНАЯ ЛАБОРАТОРИЯ ФИЗИКИ - ГЛАВНЫЙ ЭКРАН
// JavaScript Controller
// ============================================

class MainScreenController {
    constructor() {
        this.kits = this.initializeKits();
        this.currentProgress = this.loadProgress();
        this.init();
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================
    init() {
        this.setupHeaderScroll();
        this.setupQuickNav();
        this.setupCarousels();
        this.setupExperimentCards();
        this.setupKitButtons();
        this.setupModal();
        this.updateProgressDisplay();
        this.setupSmoothScroll();
        console.log('🔬 Главный экран инициализирован');
    }

    // ============================================
    // ДАННЫЕ: 7 КОМПЛЕКТОВ
    // ============================================
    initializeKits() {
        return {
            1: {
                id: 1,
                name: "Комплект №1: Механика - Плотность и архимедова сила",
                icon: "⚖️",
                status: "available",
                program: "base",
                experiments: 5,
                completed: 0,
                duration: "~2.5 часа",
                description: "Измерение плотности твердых тел и изучение архимедовой силы для различных цилиндров в воде и солевых растворах.",
                experimentsList: [
                    "Измерение средней плотности вещества цилиндров",
                    "Измерение архимедовой силы для тел разной плотности",
                    "Исследование зависимости архимедовой силы от объема погруженной части",
                    "Исследование зависимости архимедовой силы от плотности жидкости",
                    "Проверка независимости архимедовой силы от массы тела"
                ]
            },
            2: {
                id: 2,
                name: "Комплект №2: Механика - Пружины, трение, рычаги",
                icon: "🔧",
                status: "active",
                program: "base",
                experiments: 6,
                completed: 0,
                duration: "~3 часа",
                description: "Опыты по закону Гука, силам трения и работе сил на пружинах, бруске и направляющих.",
                experimentsList: [
                    "Измерение жёсткости пружины",
                    "Измерение коэффициента трения скольжения",
                    "Измерение работы силы трения",
                    "Измерение работы силы упругости",
                    "Исследование зависимостей силы трения",
                    "Исследование зависимости силы упругости от деформации"
                ]
            },
            3: {
                id: 3,
                name: "Комплект №3: Электричество - Законы постоянного тока",
                icon: "⚡",
                status: "locked",
                program: "base",
                experiments: 9,
                completed: 0,
                duration: "~4 часа",
                description: "Исследование закона Ома, соединений резисторов, мощности и работы тока на источнике Labosfera.",
                experimentsList: [
                    "Измерение сопротивления резистора",
                    "Измерение мощности электрического тока",
                    "Измерение работы электрического тока",
                    "Исследование закона Ома",
                    "Исследование зависимости сопротивления от длины проводника",
                    "Исследование зависимости сопротивления от площади сечения",
                    "Исследование зависимости сопротивления от материала",
                    "Проверка правила напряжений при последовательном соединении",
                    "Проверка правила токов при параллельном соединении"
                ]
            },
            4: {
                id: 4,
                name: "Комплект №4: Оптика - Линзы и преломление",
                icon: "🔍",
                status: "locked",
                program: "base",
                experiments: 6,
                completed: 0,
                duration: "~3 часа",
                description: "Измерение оптической силы линз, изучение преломления света и сложных оптических систем.",
                experimentsList: [
                    "Измерение оптической силы собирающей линзы",
                    "Измерение фокусного расстояния линзы",
                    "Измерение показателя преломления стеклянного полуцилиндра",
                    "Исследование свойств изображения в собирающей линзе",
                    "Исследование фокусного расстояния сложной оптической системы",
                    "Исследование зависимости угла преломления от угла падения"
                ]
            },
            5: {
                id: 5,
                name: "Комплект №5: Механика - Колебания и движение",
                icon: "🚀",
                status: "locked",
                program: "extended",
                experiments: 8,
                completed: 0,
                duration: "~3.5 часа",
                description: "Дополнительные опыты по кинематике и колебаниям: движение по наклонной плоскости, математический и пружинный маятники.",
                experimentsList: [
                    "Измерение средней скорости по наклонной плоскости",
                    "Измерение ускорения бруска на наклонной плоскости",
                    "Измерение периода математического маятника",
                    "Измерение периода пружинного маятника",
                    "Исследование зависимости ускорения от угла наклона",
                    "Исследование зависимости периода маятника от длины нити",
                    "Исследование зависимости периода пружинного маятника от массы и жёсткости",
                    "Проверка независимости периода математического маятника от массы"
                ]
            },
            6: {
                id: 6,
                name: "Комплект №6: Механика - Рычаги и блоки",
                icon: "⚙️",
                status: "locked",
                program: "base",
                experiments: 4,
                completed: 0,
                duration: "~3 часа",
                description: "Условие равновесия рычага и работа силы при использовании неподвижного и подвижного блоков.",
                experimentsList: [
                    "Измерение момента силы на рычаге",
                    "Проверка условия равновесия рычага",
                    "Измерение работы силы при подъёме груза с неподвижным блоком",
                    "Измерение работы силы при подъёме груза с подвижным блоком"
                ]
            },
            7: {
                id: 7,
                name: "Комплект №7: Термодинамика - Калориметрия",
                icon: "🌡️",
                status: "locked",
                program: "extended",
                experiments: 4,
                completed: 0,
                duration: "~3 часа",
                description: "Калориметрические опыты по смешиванию жидкостей и определению удельной теплоёмкости металлов.",
                experimentsList: [
                    "Определение удельной теплоёмкости металлического цилиндра",
                    "Измерение количества теплоты, полученного водой",
                    "Измерение количества теплоты, отдаваемого нагретым цилиндром",
                    "Исследование изменения температуры смеси при разных условиях"
                ]
            }
        };
    }

    calculateTotalExperiments(includeExtended = true) {
        return Object.values(this.kits)
            .filter(kit => includeExtended || kit.program !== 'extended')
            .reduce((sum, kit) => sum + (kit.experiments || 0), 0);
    }

    getDefaultProgress() {
        const defaultProgress = {
            totalExperiments: this.calculateTotalExperiments(true),
            baseExperiments: this.calculateTotalExperiments(false),
            completedExperiments: 0,
            kits: {}
        };

        Object.values(this.kits).forEach(kit => {
            defaultProgress.kits[kit.id] = {
                completed: 0,
                total: kit.experiments || 0,
                program: kit.program
            };
        });

        return defaultProgress;
    }

    // ============================================
    // ПРОГРЕСС
    // ============================================
    loadProgress() {
        const defaultProgress = this.getDefaultProgress();
        const saved = localStorage.getItem('lab_progress');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const merged = {
                    ...defaultProgress,
                    ...parsed,
                    totalExperiments: defaultProgress.totalExperiments,
                    baseExperiments: defaultProgress.baseExperiments,
                    kits: {
                        ...defaultProgress.kits,
                        ...(parsed.kits || {})
                    }
                };

                Object.values(this.kits).forEach(kit => {
                    const progress = merged.kits[kit.id] || { completed: 0 };
                    merged.kits[kit.id] = {
                        ...progress,
                        total: kit.experiments || 0,
                        program: kit.program
                    };
                });

                return merged;
            } catch (e) {
                console.error('Ошибка загрузки прогресса:', e);
            }
        }
        return defaultProgress;
    }

    saveProgress() {
        localStorage.setItem('lab_progress', JSON.stringify(this.currentProgress));
    }

    updateProgressDisplay() {
        const percent = Math.round((this.currentProgress.completedExperiments / this.currentProgress.totalExperiments) * 100);
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const progressCount = document.getElementById('progressCount');

        if (progressFill) progressFill.style.width = percent + '%';
        if (progressPercent) progressPercent.textContent = percent + '%';
        if (progressCount) {
            progressCount.textContent = `${this.currentProgress.completedExperiments}/${this.currentProgress.totalExperiments}+`;
        }

        // Обновление статусов узлов пути
        document.querySelectorAll('.path-node').forEach(node => {
            const kitId = parseInt(node.dataset.kit);
            const kitProgress = this.currentProgress.kits[kitId];
            const statusSpan = node.querySelector('.node-status');
            
            if (statusSpan && kitProgress) {
                if (this.kits[kitId].status === 'active') {
                    statusSpan.textContent = `🔥 ${kitProgress.completed}/${kitProgress.total}`;
                } else if (this.kits[kitId].status === 'locked') {
                    statusSpan.textContent = `🔒 ${kitProgress.completed}/${kitProgress.total || '?'}`;
                } else {
                    statusSpan.textContent = `${kitProgress.completed}/${kitProgress.total}`;
                }
            }
        });
    }

    // ============================================
    // HEADER SCROLL
    // ============================================
    setupHeaderScroll() {
        const header = document.querySelector('.main-header');
        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        });
    }

    // ============================================
    // QUICK NAVIGATION
    // ============================================
    setupQuickNav() {
        const quickNav = document.getElementById('quickNav');
        const sections = document.querySelectorAll('.kit-section');
        
        // Intersection Observer для отслеживания активной секции
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    const kitId = entry.target.dataset.kitId;
                    this.updateActiveQuickNav(kitId);
                }
            });
        }, {
            threshold: [0.5],
            rootMargin: '-100px 0px -50% 0px'
        });

        sections.forEach(section => observer.observe(section));

        // Клики на quick nav
        document.querySelectorAll('.quick-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.getAttribute('href');
                const target = document.querySelector(targetId);
                
                if (target) {
                    const offset = 150;
                    const targetPosition = target.offsetTop - offset;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    updateActiveQuickNav(kitId) {
        document.querySelectorAll('.quick-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`.quick-nav-item[data-kit="${kitId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    // ============================================
    // КАРУСЕЛИ
    // ============================================
    setupCarousels() {
        document.querySelectorAll('.carousel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const kitId = btn.dataset.kit;
                const direction = btn.classList.contains('prev') ? -1 : 1;
                const carousel = document.getElementById(`carouselKit${kitId}`);
                
                if (carousel) {
                    const scrollAmount = 300;
                    carousel.scrollBy({
                        left: scrollAmount * direction,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Автоматическое скрытие кнопок на краях
        document.querySelectorAll('.carousel-track').forEach(track => {
            track.addEventListener('scroll', () => {
                const parent = track.closest('.experiments-carousel');
                const prevBtn = parent.querySelector('.carousel-btn.prev');
                const nextBtn = parent.querySelector('.carousel-btn.next');
                
                if (prevBtn && nextBtn) {
                    prevBtn.style.opacity = track.scrollLeft > 20 ? '1' : '0.3';
                    nextBtn.style.opacity = 
                        track.scrollLeft < track.scrollWidth - track.clientWidth - 20 ? '1' : '0.3';
                }
            });
        });
    }

    // ============================================
    // КАРТОЧКИ ЭКСПЕРИМЕНТОВ
    // ============================================
    setupExperimentCards() {
        document.querySelectorAll('.experiment-card-mini').forEach(card => {
            const startBtn = card.querySelector('.btn-mini-start');
            
            if (startBtn && !startBtn.disabled) {
                startBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const expId = card.dataset.expId;
                    this.launchExperiment(expId);
                });
            }

            // Клик на карточку = клик на кнопку
            card.addEventListener('click', () => {
                if (startBtn && !startBtn.disabled) {
                    startBtn.click();
                }
            });
        });
    }

    launchExperiment(expId) {
        console.log(`🚀 Запуск эксперимента: ${expId}`);
        
        // Анимация запуска
        const card = document.querySelector(`[data-exp-id="${expId}"]`);
        if (card) {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 200);
        }

        // Переход к интерактивному эксперименту
        setTimeout(() => {
            // Маршрутизация экспериментов
            const experimentRoutes = {
                '2-1': 'experiments/kit2/experiment-1-spring.html',
                // Будущие эксперименты будут добавлены здесь
                // '2-2': 'experiments/kit2/experiment-2-pendulum.html',
                // '2-3': 'experiments/kit2/experiment-3-spring-pendulum.html',
                // и т.д.
            };

            const route = experimentRoutes[expId];
            
            if (route) {
                // Переход к готовому эксперименту
                window.location.href = route;
            } else {
                // Заглушка для ещё не реализованных экспериментов
                alert(`Эксперимент ${expId} находится в разработке.\n\n✅ Уже доступен: Опыт 2-1 (Измерение жёсткости пружины)\n\n🔜 Скоро: Остальные опыты Комплекта №2`);
            }
        }, 300);
    }

    // ============================================
    // КНОПКИ КОМПЛЕКТОВ
    // ============================================
    setupKitButtons() {
        // Кнопка "Начать обучение" в Hero
        const startLearningBtn = document.getElementById('startLearningBtn');
        if (startLearningBtn) {
            startLearningBtn.addEventListener('click', () => {
                // Скролл к активному комплекту (№2)
                const kit2 = document.getElementById('kit2');
                if (kit2) {
                    kit2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        // Кнопка "О проекте"
        const aboutProjectBtn = document.getElementById('aboutProjectBtn');
        if (aboutProjectBtn) {
            aboutProjectBtn.addEventListener('click', () => {
                this.showAboutModal();
            });
        }

        // Кнопки "Начать эксперименты"
        document.querySelectorAll('.btn-start-kit').forEach(btn => {
            btn.addEventListener('click', () => {
                const kitId = btn.dataset.kit;
                const firstCard = document.querySelector(`#kit${kitId} .experiment-card-mini[data-status="available"]`);
                
                if (firstCard) {
                    firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Подсветка
                    firstCard.style.boxShadow = '0 0 40px rgba(0, 168, 107, 0.6)';
                    setTimeout(() => {
                        firstCard.style.boxShadow = '';
                    }, 2000);
                }
            });
        });

        // Кнопки "О комплекте"
        document.querySelectorAll('.btn-kit-info').forEach(btn => {
            btn.addEventListener('click', () => {
                const kitId = parseInt(btn.dataset.kit);
                this.showKitInfo(kitId);
            });
        });

        // Кнопки "Уведомить о готовности"
        document.querySelectorAll('.btn-notify').forEach(btn => {
            btn.addEventListener('click', () => {
                this.notifyMe(btn);
            });
        });
    }

    notifyMe(btn) {
        btn.textContent = '✓ Вы получите уведомление';
        btn.style.background = 'rgba(0, 168, 107, 0.3)';
        btn.style.borderColor = 'var(--primary-green)';
        btn.disabled = true;

        // Сохранение в localStorage
        const section = btn.closest('.kit-section');
        const kitId = section.dataset.kitId;
        const notifications = JSON.parse(localStorage.getItem('lab_notifications') || '[]');
        
        if (!notifications.includes(kitId)) {
            notifications.push(kitId);
            localStorage.setItem('lab_notifications', JSON.stringify(notifications));
        }

        console.log(`🔔 Подписка на уведомления для комплекта ${kitId}`);
    }

    // ============================================
    // МОДАЛЬНОЕ ОКНО
    // ============================================
    setupModal() {
        const modal = document.getElementById('kitInfoModal');
        const overlay = modal.querySelector('.modal-overlay');
        const closeBtn = document.getElementById('modalClose');

        const closeModal = () => {
            modal.classList.remove('active');
        };

        if (overlay) overlay.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        // ESC для закрытия
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    showKitInfo(kitId) {
        const kit = this.kits[kitId];
        if (!kit) return;

        const modal = document.getElementById('kitInfoModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        title.textContent = `${kit.icon} ${kit.name}`;

        let experimentsHTML = '';
        if (kit.experimentsList && kit.experimentsList.length) {
            experimentsHTML = `
                <h3>Эксперименты комплекта:</h3>
                <ul style="list-style: none; padding: 0;">
                    ${kit.experimentsList.map((exp, i) => `
                        <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <strong>${i + 1}.</strong> ${exp}
                        </li>
                    `).join('')}
                </ul>
            `;
        }

        const programLabel = kit.program === 'extended'
            ? '🔵 Расширенная программа (ОГЭ 2026+)'
            : '🟢 Основная программа (ОГЭ 2025)';

        const statusMessage = kit.status === 'active'
            ? '🔥 <span style="color: var(--primary-green);">АКТИВНЫЙ - Доступен для изучения</span>'
            : kit.status === 'available'
                ? '○ Доступен для изучения'
                : kit.program === 'extended'
                    ? '🔵 В разработке (расширенная программа)'
                    : '🔒 В разработке';

        body.innerHTML = `
            <div style="line-height: 1.8;">
                <p style="font-size: 16px; color: var(--text-secondary); margin-bottom: 20px;">
                    ${kit.description}
                </p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
                    <div style="padding: 16px; background: var(--glass-bg); border-radius: 12px;">
                        <div style="font-size: 28px; font-weight: 700; color: var(--primary-blue);">
                            ${kit.experiments || '?'}
                        </div>
                        <div style="font-size: 14px; color: var(--text-muted);">Экспериментов</div>
                    </div>
                    <div style="padding: 16px; background: var(--glass-bg); border-radius: 12px;">
                        <div style="font-size: 28px; font-weight: 700; color: var(--primary-green);">
                            ${kit.duration}
                        </div>
                        <div style="font-size: 14px; color: var(--text-muted);">Длительность</div>
                    </div>
                </div>

                ${experimentsHTML}

                <div style="margin-top: 24px; padding: 16px; background: rgba(0, 102, 204, 0.1); border-left: 4px solid var(--primary-blue); border-radius: 8px;">
                    <div><strong>� Программа:</strong> ${programLabel}</div>
                    <div style="margin-top: 8px;"><strong>📖 Статус:</strong> ${statusMessage}</div>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    showAboutModal() {
        const modal = document.getElementById('kitInfoModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        title.textContent = '📖 О проекте';

        body.innerHTML = `
            <div style="line-height: 1.8;">
                <h3 style="margin-bottom: 16px;">Виртуальная лаборатория физики для подготовки к ОГЭ 2025</h3>
                
                <p style="font-size: 16px; color: var(--text-secondary); margin-bottom: 20px;">
                    Интерактивная обучающая платформа с полным набором экспериментов 
                    по спецификации ФИПИ с использованием профессионального оборудования Labosfera.
                </p>

                <h4 style="margin: 24px 0 12px 0;">✨ Особенности проекта:</h4>
                <ul style="color: var(--text-secondary); margin-bottom: 24px;">
                    <li>🔬 <strong>7 комплектов оборудования</strong> - полное покрытие спецификации ФИПИ</li>
                    <li>🎯 <strong>42 интерактивных эксперимента</strong> - 30 базовых + 12 расширенных</li>
                    <li>📸 <strong>Реальные фотографии оборудования</strong> - максимальная реалистичность</li>
                    <li>💡 <strong>Интуитивный интерфейс</strong> - Netflix-style навигация</li>
                    <li>📊 <strong>Отслеживание прогресса</strong> - визуализация пути обучения</li>
                    <li>📱 <strong>Адаптивный дизайн</strong> - работает на всех устройствах</li>
                </ul>

                <h4 style="margin: 24px 0 12px 0;">🔬 Оборудование Labosfera:</h4>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">
                    Все эксперименты основаны на реальном лабораторном оборудовании компании Labosfera - 
                    ведущего производителя учебного оборудования для российских школ.
                </p>

                <div style="margin-top: 24px; padding: 16px; background: var(--glass-bg); border-radius: 12px;">
                    <p style="text-align: center; margin: 0;">
                        <strong>🌐 Официальный сайт:</strong><br>
                        <a href="https://labosfera.ru" target="_blank" 
                           style="color: var(--primary-blue); text-decoration: none; font-size: 18px;">
                            www.labosfera.ru
                        </a>
                    </p>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    // ============================================
    // SMOOTH SCROLL
    // ============================================
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                e.preventDefault();
                const target = document.querySelector(href);
                
                if (target) {
                    const offset = 150;
                    const targetPosition = target.offsetTop - offset;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔬 Загрузка виртуальной лаборатории физики...');
    window.mainScreenController = new MainScreenController();
    
    // Приветственное сообщение в консоли
    console.log('%c🔬 ВИРТУАЛЬНАЯ ЛАБОРАТОРИЯ ФИЗИКИ', 
        'font-size: 20px; font-weight: bold; color: #0066CC;');
    console.log('%cLabosfera × ОГЭ 2025', 
        'font-size: 14px; color: #00A86B;');
    console.log('Версия: 1.0.0 (Пилот - Комплект №2)');
    console.log('Все 7 комплектов готовы к внедрению!');
});

// ============================================
// ЭКСПОРТ
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MainScreenController;
}
