/*
 * Мокап лаунчера — постер-стена.
 * Источник прогресса: experiments/home/src/data/kits.ts на 2026-05-15
 * (Кит-2 = 6/6, Кит-1 = 2/5, остальные planned).
 */

const KITS = [
  {
    num: 2,
    title: 'Силы и движение',
    photo: 'photos/kit-02-forces.png',
    category: 'mechanics', categoryLabel: 'Механика',
    program: 'base',
    summary:
      'Жёсткость пружины, закон Гука как график, работа упругой силы и трение скольжения. ' +
      'Четыре подзадачи по трению — измерение μ, работа F_тр, F_тр(N) и F_тр от поверхности.',
    status: 'ready',
    done: 6, total: 6,
    experiments: [
      { num: '2.1', name: 'Жёсткость пружины', done: true },
      { num: '2.2', name: 'Сила упругости (закон Гука)', done: true },
      { num: '2.3', name: 'Работа силы упругости', done: true },
      { num: '2.4', name: 'Трение скольжения', done: true },
      { num: '2.5', name: 'Зависимость F_тр от поверхности', done: true },
      { num: '2.6', name: 'Зависимость F_упр от деформации', done: true },
    ],
  },
  {
    num: 1,
    title: 'Гидростатика',
    photo: 'photos/kit-01-density.png',
    category: 'mechanics', categoryLabel: 'Механика',
    program: 'base',
    summary:
      'Плотность твёрдого тела и архимедова сила: пять опытов на цилиндрах №1–4 (сталь, алюминий, пластик), ' +
      'динамометры 1 Н и 5 Н, мензурка 250 мл, солевой раствор.',
    status: 'ready',
    done: 2, total: 5,
    experiments: [
      { num: '1.1', name: 'Плотность вещества', done: true },
      { num: '1.2', name: 'Архимедова сила в воде', done: true },
      { num: '1.3', name: 'F_A от объёма погружения', done: false },
      { num: '1.4', name: 'F_A от плотности жидкости', done: false },
      { num: '1.5', name: 'Независимость F_A от массы', done: false },
    ],
  },
  {
    num: 3,
    title: 'Электрические цепи',
    photo: 'photos/kit-03-circuits.png',
    category: 'electricity', categoryLabel: 'Электричество',
    program: 'base',
    summary: 'Закон Ома, мощность, последовательное и параллельное соединения, реостат, закон Джоуля–Ленца.',
    status: 'planned', eta: '2026 Q4',
    done: 0, total: 9,
    experiments: [
      { num: '3.1', name: 'Закон Ома для участка' },
      { num: '3.2', name: 'Сопротивление проводника' },
      { num: '3.3', name: 'Последовательное соединение' },
      { num: '3.4', name: 'Параллельное соединение' },
      { num: '3.5', name: 'Реостат / делитель' },
      { num: '3.6', name: 'Работа и мощность тока' },
      { num: '3.7', name: 'Закон Джоуля–Ленца' },
      { num: '3.8', name: 'Зависимость R от длины' },
      { num: '3.9', name: 'Зависимость R от сечения' },
    ],
  },
  {
    num: 4,
    title: 'Оптика',
    photo: 'photos/kit-04-optics.png',
    category: 'optics', categoryLabel: 'Оптика',
    program: 'base',
    summary: 'Линзы, фокусное расстояние, преломление света, построение изображений, дисперсия.',
    status: 'planned', eta: '2027 Q1',
    done: 0, total: 6,
    experiments: [
      { num: '4.1', name: 'Фокусное расстояние линзы' },
      { num: '4.2', name: 'Изображение в собирающей линзе' },
      { num: '4.3', name: 'Преломление света' },
      { num: '4.4', name: 'Дисперсия' },
      { num: '4.5', name: 'Полное внутреннее отражение' },
      { num: '4.6', name: 'Угол отражения' },
    ],
  },
  {
    num: 5,
    title: 'Колебания и волны',
    photo: 'photos/kit-05-oscillations.png',
    category: 'mechanics', categoryLabel: 'Механика',
    program: 'extended',
    summary: 'Период математического и пружинного маятников, звук и резонанс.',
    status: 'planned', eta: '2027 Q2',
    done: 0, total: 4,
    experiments: [
      { num: '5.1', name: 'Период математического маятника' },
      { num: '5.2', name: 'Период пружинного маятника' },
      { num: '5.3', name: 'Зависимость T от длины' },
      { num: '5.4', name: 'Резонанс' },
    ],
  },
  {
    num: 6,
    title: 'Рычаги и блоки',
    photo: 'photos/kit-06-lever.png',
    category: 'mechanics', categoryLabel: 'Механика',
    program: 'base',
    summary: 'Условие равновесия рычага, КПД, неподвижный и подвижный блоки.',
    status: 'planned', eta: '2027 Q2',
    done: 0, total: 4,
    experiments: [
      { num: '6.1', name: 'Равновесие рычага' },
      { num: '6.2', name: 'КПД наклонной плоскости' },
      { num: '6.3', name: 'Неподвижный блок' },
      { num: '6.4', name: 'Подвижный блок (выигрыш в силе)' },
    ],
  },
  {
    num: 7,
    title: 'Тепловые явления',
    photo: 'photos/kit-07-thermal.png',
    category: 'thermal', categoryLabel: 'Термодинамика',
    program: 'extended',
    summary: 'Удельная теплоёмкость, теплота плавления, измерение температуры калориметром.',
    status: 'planned', eta: '2027 Q3',
    done: 0, total: 3,
    experiments: [
      { num: '7.1', name: 'Удельная теплоёмкость' },
      { num: '7.2', name: 'Теплота плавления льда' },
      { num: '7.3', name: 'Тепловой баланс смешивания' },
    ],
  },
];

const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

function lockIconSVG() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2"/>
    <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
  </svg>`;
}

function renderPoster(kit, index) {
  const isReady = kit.status === 'ready';
  const ringDashOffset = isReady
    ? (RING_C * (1 - kit.done / kit.total)).toFixed(2)
    : RING_C.toFixed(2);

  const numblock = isReady
    ? `
      <div class="kit-poster-numblock">
        <div class="kit-poster-numwrap">
          <svg class="kit-poster-ring" viewBox="0 0 80 80" width="76" height="76">
            <circle class="ring-bg" cx="40" cy="40" r="${RING_R}" fill="none" stroke-width="4"/>
            <circle class="ring-fg" cx="40" cy="40" r="${RING_R}" fill="none" stroke-width="4"
              stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"
              stroke-linecap="round" data-ring-target="${ringDashOffset}"/>
          </svg>
          <span class="kit-poster-num">${kit.num}</span>
        </div>
        <div class="kit-poster-numlabel">
          <span class="kit-poster-numlabel-tag">Готово</span>
          <span class="kit-poster-numlabel-progress">${kit.done}<span style="opacity:0.6">/${kit.total}</span></span>
        </div>
      </div>
    `
    : `
      <div class="kit-poster-numblock">
        <div class="kit-poster-numwrap">
          <span class="kit-poster-num" style="opacity:0.55">${kit.num}</span>
        </div>
      </div>
      <div class="kit-poster-lock">${lockIconSVG()}</div>
    `;

  return `
    <article class="kit-poster"
      data-status="${kit.status}"
      data-category="${kit.category}"
      data-program="${kit.program}"
      data-kit-num="${kit.num}"
      style="--enter-delay: ${index * 60}ms;"
      tabindex="0">
      <img class="kit-poster-photo" src="${kit.photo}" alt="" loading="lazy">
      <span class="kit-poster-cat">${kit.categoryLabel}</span>
      ${numblock}
      <footer class="kit-poster-foot">
        <h3 class="kit-poster-name">${kit.title}</h3>
        <span class="kit-poster-eta">${isReady ? 'Доступен · '+kit.total+' опытов' : 'В разработке · '+kit.eta}</span>
      </footer>
    </article>
  `;
}

function renderGrid() {
  const root = document.getElementById('kitGrid');
  root.innerHTML = KITS.map(renderPoster).join('');

  // Анимация progress-ring после стаггер-загрузки
  document.querySelectorAll('.kit-poster .ring-fg').forEach((ring, i) => {
    const target = ring.getAttribute('data-ring-target');
    const delay = 600 + i * 60;
    setTimeout(() => { ring.style.strokeDashoffset = target; }, delay);
  });
}

/* ── Tilt-on-hover (только pointer:fine + ready) ─────────────────── */
function attachTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.kit-poster[data-status="ready"]').forEach(poster => {
    const photo = poster.querySelector('.kit-poster-photo');
    poster.addEventListener('pointermove', (e) => {
      const rect = poster.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5...0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rx = (-y * 6).toFixed(2);
      const ry = (x * 6).toFixed(2);
      poster.style.transform = `translateY(-8px) perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    poster.addEventListener('pointerleave', () => {
      poster.style.transform = '';
    });
  });
}

/* ── Drawer ──────────────────────────────────────────────────────── */
function attachDrawer() {
  const drawer = document.getElementById('kitDrawer');
  const titleEl = document.getElementById('drawerTitle');
  const eyebrowEl = document.getElementById('drawerKitNum');
  const summaryEl = document.getElementById('drawerSummary');
  const metaEl = document.getElementById('drawerMeta');
  const expsEl = document.getElementById('drawerExperiments');

  function open(kit) {
    eyebrowEl.textContent = `КОМПЛЕКТ №${kit.num} · ${kit.categoryLabel.toUpperCase()}`;
    titleEl.textContent = kit.title;
    summaryEl.textContent = kit.summary;

    const statusChip = kit.status === 'ready'
      ? `<span class="kit-drawer-meta-chip kit-drawer-meta-chip--ready">Доступен · ${kit.done}/${kit.total} готово</span>`
      : `<span class="kit-drawer-meta-chip kit-drawer-meta-chip--planned">В разработке · ${kit.eta}</span>`;
    const programChip = `<span class="kit-drawer-meta-chip">Программа: ${kit.program === 'base' ? 'базовая' : 'расширенная'}</span>`;
    metaEl.innerHTML = statusChip + programChip;

    expsEl.innerHTML = kit.experiments.map(e => `
      <li class="${e.done ? 'is-done' : ''}">
        <span class="exp-num">${e.num}</span>
        <span class="exp-name">${e.name}</span>
        <button class="exp-action" type="button">${e.done ? '▶ Открыть' : 'Скоро'}</button>
      </li>
    `).join('');

    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function close() {
    drawer.hidden = true;
    document.body.style.overflow = '';
  }

  document.getElementById('kitGrid').addEventListener('click', (e) => {
    const poster = e.target.closest('.kit-poster');
    if (!poster) return;
    const num = Number(poster.dataset.kitNum);
    const kit = KITS.find(k => k.num === num);
    if (kit) open(kit);
  });

  drawer.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]') || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden) close();
  });
}

/* ── Sidebar filter ──────────────────────────────────────────────── */
function attachFilters() {
  document.querySelectorAll('.filter-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.kit-poster').forEach(p => {
        p.style.display = (cat === 'all' || p.dataset.category === cat) ? '' : 'none';
      });
    });
  });
}

/* ── Role switch (Ученик/Учитель) ────────────────────────────────── */
function attachRoleSwitch() {
  const switchEl = document.querySelector('.role-switch');
  const btns = switchEl.querySelectorAll('.role-switch-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      switchEl.dataset.role = btn.dataset.role;

      const showPlanned = btn.dataset.role === 'teacher';
      document.querySelectorAll('.kit-poster[data-status="planned"]').forEach(p => {
        p.style.display = showPlanned ? '' : 'none';
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderGrid();
  attachTilt();
  attachDrawer();
  attachFilters();
  attachRoleSwitch();
});
