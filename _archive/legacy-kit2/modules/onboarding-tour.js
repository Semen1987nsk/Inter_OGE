/**
 * OnboardingTour Module
 * Interactive tutorial for first-time users
 * Guides users through the experiment step by step
 */

export class OnboardingTour {
    constructor(options = {}) {
        this.steps = options.steps || [];
        this.currentStep = 0;
        this.isActive = false;
        this.onComplete = options.onComplete || (() => {});
        this.onSkip = options.onSkip || (() => {});
        
        // DOM elements
        this.overlay = null;
        this.tooltip = null;
        this.spotlight = null;
        
        // Storage key for remembering completion
        this.storageKey = options.storageKey || 'labosfera_onboarding_complete';
        
        // Animation settings
        this.animationDuration = 300;
        
        this.init();
    }

    /**
     * Initialize tour DOM elements
     */
    init() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        this.overlay.innerHTML = `
            <div class="onboarding-spotlight"></div>
            <div class="onboarding-tooltip">
                <div class="onboarding-tooltip-header">
                    <span class="onboarding-step-counter"></span>
                    <button class="onboarding-close" title="Пропустить">✕</button>
                </div>
                <div class="onboarding-tooltip-content">
                    <h3 class="onboarding-title"></h3>
                    <p class="onboarding-description"></p>
                </div>
                <div class="onboarding-tooltip-footer">
                    <button class="onboarding-btn onboarding-btn-prev">← Назад</button>
                    <button class="onboarding-btn onboarding-btn-next">Далее →</button>
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Setup event listeners
        this.setupListeners();
    }

    /**
     * Add CSS styles for onboarding
     */
    addStyles() {
        if (document.getElementById('onboarding-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'onboarding-styles';
        styles.textContent = `
            .onboarding-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .onboarding-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
            
            .onboarding-overlay::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 14, 39, 0.85);
                pointer-events: none;
            }
            
            .onboarding-spotlight {
                position: absolute;
                border-radius: 8px;
                box-shadow: 
                    0 0 0 9999px rgba(10, 14, 39, 0.85),
                    0 0 30px rgba(0, 168, 107, 0.5);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
            }
            
            .onboarding-tooltip {
                position: absolute;
                width: 350px;
                max-width: 90vw;
                background: linear-gradient(135deg, #1a1f3a 0%, #252b4a 100%);
                border: 2px solid rgba(0, 168, 107, 0.5);
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                color: #E8EAF6;
                overflow: hidden;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: auto;
            }
            
            .onboarding-tooltip::before {
                content: '';
                position: absolute;
                width: 20px;
                height: 20px;
                background: #1a1f3a;
                border: 2px solid rgba(0, 168, 107, 0.5);
                border-right: none;
                border-bottom: none;
                transform: rotate(45deg);
            }
            
            .onboarding-tooltip.arrow-top::before {
                top: -12px;
                left: 50%;
                margin-left: -10px;
            }
            
            .onboarding-tooltip.arrow-bottom::before {
                bottom: -12px;
                left: 50%;
                margin-left: -10px;
                transform: rotate(-135deg);
            }
            
            .onboarding-tooltip.arrow-left::before {
                left: -12px;
                top: 50%;
                margin-top: -10px;
                transform: rotate(-45deg);
            }
            
            .onboarding-tooltip.arrow-right::before {
                right: -12px;
                top: 50%;
                margin-top: -10px;
                transform: rotate(135deg);
            }
            
            .onboarding-tooltip-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 1.25rem;
                background: rgba(0, 168, 107, 0.1);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .onboarding-step-counter {
                font-size: 0.85rem;
                color: #00A86B;
                font-weight: 600;
            }
            
            .onboarding-close {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #9FA8DA;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .onboarding-close:hover {
                background: rgba(211, 47, 47, 0.3);
                border-color: #D32F2F;
                color: #fff;
            }
            
            .onboarding-tooltip-content {
                padding: 1.25rem;
            }
            
            .onboarding-title {
                font-size: 1.2rem;
                font-weight: 700;
                color: #fff;
                margin: 0 0 0.75rem 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .onboarding-description {
                font-size: 0.95rem;
                line-height: 1.6;
                color: #C5CAE9;
                margin: 0;
            }
            
            .onboarding-tooltip-footer {
                display: flex;
                justify-content: space-between;
                padding: 1rem 1.25rem;
                background: rgba(0, 0, 0, 0.2);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .onboarding-btn {
                padding: 0.6rem 1.25rem;
                border-radius: 8px;
                font-size: 0.9rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .onboarding-btn-prev {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #9FA8DA;
            }
            
            .onboarding-btn-prev:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.3);
            }
            
            .onboarding-btn-prev:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            
            .onboarding-btn-next {
                background: linear-gradient(135deg, #0066CC, #00A86B);
                border: none;
                color: #fff;
            }
            
            .onboarding-btn-next:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0, 102, 204, 0.4);
            }
            
            .onboarding-pulse {
                animation: onboarding-pulse 2s infinite;
            }
            
            @keyframes onboarding-pulse {
                0%, 100% {
                    box-shadow: 
                        0 0 0 9999px rgba(10, 14, 39, 0.85),
                        0 0 30px rgba(0, 168, 107, 0.5);
                }
                50% {
                    box-shadow: 
                        0 0 0 9999px rgba(10, 14, 39, 0.85),
                        0 0 50px rgba(0, 168, 107, 0.8);
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Setup event listeners
     */
    setupListeners() {
        const closeBtn = this.overlay.querySelector('.onboarding-close');
        const prevBtn = this.overlay.querySelector('.onboarding-btn-prev');
        const nextBtn = this.overlay.querySelector('.onboarding-btn-next');
        
        closeBtn.addEventListener('click', () => this.skip());
        prevBtn.addEventListener('click', () => this.prev());
        nextBtn.addEventListener('click', () => this.next());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            if (e.key === 'Escape') {
                this.skip();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                this.next();
            } else if (e.key === 'ArrowLeft') {
                this.prev();
            }
        });
    }

    /**
     * Check if tour was already completed
     */
    wasCompleted() {
        try {
            return localStorage.getItem(this.storageKey) === 'true';
        } catch {
            return false;
        }
    }

    /**
     * Mark tour as completed
     */
    markCompleted() {
        try {
            localStorage.setItem(this.storageKey, 'true');
        } catch {
            // Ignore storage errors
        }
    }

    /**
     * Start the tour
     * @param {boolean} force - Start even if previously completed
     */
    start(force = false) {
        if (!force && this.wasCompleted()) {
            console.log('[ONBOARDING] Tour already completed');
            return;
        }
        
        if (this.steps.length === 0) {
            console.warn('[ONBOARDING] No steps defined');
            return;
        }
        
        this.isActive = true;
        this.currentStep = 0;
        
        document.body.appendChild(this.overlay);
        
        // Animate in
        requestAnimationFrame(() => {
            this.overlay.classList.add('active');
            this.showStep(0);
        });
        
        console.log('[ONBOARDING] Tour started');
    }

    /**
     * Show a specific step
     */
    showStep(index) {
        if (index < 0 || index >= this.steps.length) return;
        
        const step = this.steps[index];
        const spotlight = this.overlay.querySelector('.onboarding-spotlight');
        const tooltip = this.overlay.querySelector('.onboarding-tooltip');
        const counter = this.overlay.querySelector('.onboarding-step-counter');
        const title = this.overlay.querySelector('.onboarding-title');
        const description = this.overlay.querySelector('.onboarding-description');
        const prevBtn = this.overlay.querySelector('.onboarding-btn-prev');
        const nextBtn = this.overlay.querySelector('.onboarding-btn-next');
        
        // Update counter
        counter.textContent = `Шаг ${index + 1} из ${this.steps.length}`;
        
        // Update content
        title.innerHTML = step.icon ? `${step.icon} ${step.title}` : step.title;
        description.innerHTML = step.description;
        
        // Update buttons
        prevBtn.disabled = index === 0;
        nextBtn.textContent = index === this.steps.length - 1 ? 'Готово ✓' : 'Далее →';
        
        // Position spotlight and tooltip
        const target = document.querySelector(step.target);
        
        if (target) {
            const rect = target.getBoundingClientRect();
            const padding = step.padding || 10;
            
            // Position spotlight
            spotlight.style.left = `${rect.left - padding}px`;
            spotlight.style.top = `${rect.top - padding}px`;
            spotlight.style.width = `${rect.width + padding * 2}px`;
            spotlight.style.height = `${rect.height + padding * 2}px`;
            spotlight.classList.add('onboarding-pulse');
            
            // Position tooltip
            this.positionTooltip(tooltip, rect, step.position || 'bottom');
            
            // Scroll target into view if needed
            if (step.scrollIntoView !== false) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            // No target - center tooltip
            spotlight.style.opacity = '0';
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.className = 'onboarding-tooltip';
        }
        
        // Execute step callback
        if (step.onShow) {
            step.onShow(target);
        }
        
        this.currentStep = index;
    }

    /**
     * Position tooltip relative to target
     */
    positionTooltip(tooltip, targetRect, position) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const padding = 20;
        const arrowOffset = 15;
        
        let left, top;
        let arrowClass = '';
        
        switch (position) {
            case 'top':
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                top = targetRect.top - tooltipRect.height - arrowOffset;
                arrowClass = 'arrow-bottom';
                break;
            case 'bottom':
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                top = targetRect.bottom + arrowOffset;
                arrowClass = 'arrow-top';
                break;
            case 'left':
                left = targetRect.left - tooltipRect.width - arrowOffset;
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                arrowClass = 'arrow-right';
                break;
            case 'right':
                left = targetRect.right + arrowOffset;
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                arrowClass = 'arrow-left';
                break;
        }
        
        // Keep tooltip on screen
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.transform = 'none';
        tooltip.className = `onboarding-tooltip ${arrowClass}`;
    }

    /**
     * Go to next step
     */
    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.complete();
        }
    }

    /**
     * Go to previous step
     */
    prev() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * Skip the tour
     */
    skip() {
        this.end();
        this.onSkip();
    }

    /**
     * Complete the tour
     */
    complete() {
        this.markCompleted();
        this.end();
        this.onComplete();
    }

    /**
     * End the tour (cleanup)
     */
    end() {
        this.isActive = false;
        this.overlay.classList.remove('active');
        
        setTimeout(() => {
            if (this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
        }, this.animationDuration);
    }

    /**
     * Reset tour (allow to show again)
     */
    reset() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch {
            // Ignore
        }
    }
}

/**
 * Create default tour for spring experiment
 */
export function createSpringExperimentTour() {
    return new OnboardingTour({
        storageKey: 'labosfera_spring_experiment_tour',
        steps: [
            {
                target: '.experiment-header',
                title: 'Добро пожаловать! 👋',
                description: 'Это интерактивный симулятор <b>Опыта 2-1</b> — измерение жёсткости пружины. Давайте разберёмся, как им пользоваться.',
                icon: '🔬',
                position: 'bottom'
            },
            {
                target: '#equipment-container',
                title: 'Оборудование',
                description: 'Здесь находится <b>пружина</b> и <b>динамометры</b>. Перетащите пружину на рабочую область, чтобы начать эксперимент.',
                icon: '🔧',
                position: 'left'
            },
            {
                target: '#weights-container',
                title: 'Грузы',
                description: 'Выберите грузы для подвешивания на пружину. Грузы по <b>100 г</b> можно соединять в цепочку. Есть также <b>наборные грузы</b> с дисками разной массы.',
                icon: '⚖️',
                position: 'left'
            },
            {
                target: '#canvas-container',
                title: 'Рабочая область',
                description: 'Сюда перетаскивайте оборудование и грузы. <b>Линейка</b> на планшете позволяет измерить удлинение пружины.',
                icon: '📐',
                position: 'right'
            },
            {
                target: '.measurement-window',
                title: 'Панель измерений',
                description: 'Записывайте значения <b>силы F</b> и <b>удлинения Δl</b>. Можно ввести вручную или записать текущие показания.',
                icon: '📝',
                position: 'left'
            },
            {
                target: '#btn-calculate-stiffness',
                title: 'Расчёт жёсткости',
                description: 'После записи F и Δl нажмите эту кнопку для расчёта жёсткости: <b>k = F / Δl</b>',
                icon: '🧮',
                position: 'top'
            },
            {
                target: '#btn-magnifier',
                title: 'Лупа',
                description: 'Используйте лупу для точного считывания показаний. Включается кнопкой или клавишей <b>M</b>.',
                icon: '🔍',
                position: 'bottom'
            },
            {
                target: '#btn-complete',
                title: 'Завершение опыта',
                description: 'После успешного расчёта жёсткости кнопка станет активной. Нажмите её для завершения эксперимента.',
                icon: '✅',
                position: 'top'
            }
        ],
        onComplete: () => {
            console.log('[ONBOARDING] Spring experiment tour completed');
        }
    });
}
