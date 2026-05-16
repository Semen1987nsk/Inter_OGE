/**
 * JourneySection — pin-scroll «Путешествие по 4 опытам».
 *
 * AWWWARDS-стандарт 2026 (NASAProspect analog):
 *   - 4 stage'а по 1 экрану.
 *   - Sticky-pin через GSAP ScrollTrigger, контент стиэйджится поверх.
 *   - На каждой stage: фото комплекта + ключевая характеристика +
 *     animated SVG-иконка из kit-icons.ts.
 *
 * Mobile fallback (<768px):
 *   - Никакого pin/scrub.
 *   - 4 stage'а просто scroll-snap vertical (1 экран = 1 этап).
 */

import { canRunHeavyMotion } from '../lib/reduced-motion';

interface JourneyStage {
  num: string;
  photo: string;
  title: string;
  description: string;
  metric: { label: string; value: string };
  href: string;
}

const STAGES: ReadonlyArray<JourneyStage> = [
  {
    num: '1.1',
    photo: 'kit-1.png',
    title: 'Плотность твёрдого тела',
    description:
      'Бросаем металлический цилиндр в мензурку, измеряем массу на весах. Программа считает ρ = m / V — ученик проверяет.',
    metric: { label: 'Точность ФИПИ', value: '±5%' },
    href: '../kit-1-hydrostatics/?screen=density-solid',
  },
  {
    num: '1.2',
    photo: 'kit-1.png',
    title: 'Архимедова сила',
    description:
      'Цилиндр на крючке динамометра. Погружаем в воду — сила Архимеда сразу видна. F_A = ρ_воды · g · V.',
    metric: { label: 'Уровень', value: '2-я часть ОГЭ' },
    href: '../kit-1-hydrostatics/?screen=archimedes',
  },
  {
    num: '2.1',
    photo: 'kit-2.png',
    title: 'Жёсткость пружины',
    description:
      'Подвешиваем грузы 50/100 г, измеряем удлинение пружины линейкой. k = F / ΔL — формула на месте.',
    metric: { label: 'Опытов в комплекте', value: '4/4 готовы' },
    href: '../2-1-spring/',
  },
  {
    num: '2.2',
    photo: 'kit-2.png',
    title: 'Коэффициент трения',
    description:
      'Брусок на направляющей, тянем динамометром. F_тр = μ · N — программа покажет μ для дерева, металла, ткани.',
    metric: { label: 'Поверхностей', value: '3 материала' },
    href: '../2-2-friction/',
  },
];

export function mountJourneySection(host: HTMLElement): void {
  host.innerHTML = `
    <div class="container">
      <header class="section-header">
        <span class="eyebrow eyebrow--gold">Путешествие · 4 опыта</span>
        <h2 class="section-title">
          От плотности до трения — <em>четыре эксперимента</em>,<br />
          собранные по канону ФИПИ
        </h2>
      </header>
      <div class="journey-track">
        ${STAGES.map(
          (s, i) => `
          <article class="journey-stage" data-stage="${i}">
            <div class="journey-stage-text">
              <div class="journey-stage-num">${s.num}</div>
              <h3 class="journey-stage-title">${escapeHtml(s.title)}</h3>
              <p class="journey-stage-desc">${escapeHtml(s.description)}</p>
              <div class="journey-stage-metric">
                <span class="journey-stage-metric-label">${escapeHtml(s.metric.label)}</span>
                <span class="journey-stage-metric-value">${escapeHtml(s.metric.value)}</span>
              </div>
              <a class="journey-stage-cta" href="${s.href}" data-journey-link>
                <span>Открыть опыт ${s.num}</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
            <div class="journey-stage-visual">
              <img class="journey-stage-photo" src="/photos/${s.photo}" alt="" loading="lazy" />
              <div class="journey-stage-bignum" aria-hidden="true">${s.num}</div>
            </div>
          </article>`,
        ).join('')}
      </div>
      <div class="journey-progress" aria-hidden="true">
        ${STAGES.map((s, i) => `<span class="journey-progress-dot" data-stage="${i}" data-active="${i === 0}">${s.num}</span>`).join('')}
      </div>
    </div>
  `;

  // View Transitions API integration на все journey-link'и.
  attachViewTransitions(host);

  if (!canRunHeavyMotion()) {
    // Mobile / reduced-motion: scroll-snap vertical, никакого pin.
    host.classList.add('journey--mobile-fallback');
    return;
  }

  void setupPinScroll(host);
}

async function setupPinScroll(host: HTMLElement): Promise<void> {
  const [{ default: gsap }, { default: ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  const track = host.querySelector<HTMLElement>('.journey-track');
  if (!track) return;
  const stages = track.querySelectorAll<HTMLElement>('.journey-stage');
  const progressDots = host.querySelectorAll<HTMLElement>('.journey-progress-dot');
  if (stages.length === 0) return;

  // Стартовое состояние: первая stage видна, остальные скрыты.
  gsap.set(Array.from(stages).slice(1), { autoAlpha: 0, y: 60 });

  const containerEl = host.querySelector<HTMLElement>('.container');
  // Pin section и анимация stage'ов: длина scroll = (stages.length) × 100vh.
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: containerEl ?? host,
      pin: containerEl ?? host,
      start: 'top top',
      end: () => `+=${stages.length * 100}%`,
      scrub: 0.8,
      anticipatePin: 1,
    },
  });

  stages.forEach((stage, i) => {
    if (i === 0) return;
    const prev = stages[i - 1];
    if (prev) {
      tl.to(prev, { autoAlpha: 0, y: -60, duration: 1 }, i - 1);
    }
    tl.to(stage, { autoAlpha: 1, y: 0, duration: 1 }, i - 1);
    tl.call(
      () => {
        for (const dot of progressDots) {
          dot.dataset['active'] = String(Number(dot.dataset['stage']) === i);
        }
      },
      undefined,
      i - 0.5,
    );
  });
}

function attachViewTransitions(host: HTMLElement): void {
  type DocWithTransitions = Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };
  const doc = document as DocWithTransitions;
  if (!doc.startViewTransition) return;

  host.querySelectorAll<HTMLAnchorElement>('a[data-journey-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      doc.startViewTransition!(() => {
        window.location.href = href;
      });
    });
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
