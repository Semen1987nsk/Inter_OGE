// @ts-check
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGE = '/experiments/kit2/experiment-1-spring.html';
const VENDOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../experiments/vendor');

// Паспорт комплекта: пружина №1 — 50 Н/м, груз 100 г, g = 9,8 м/с².
const SPRING_ID = 'spring50';
const PASSPORT_K = 50;
const WEIGHT_ID = 'weight100_double_1';
const WEIGHT_FORCE = 0.1 * 9.8;

/**
 * Страница берёт chart.js, interact.js и anime.js с jsdelivr, а в
 * experiments/vendor лежат те же версии: прогон не зависит от сети.
 * @param {import('@playwright/test').Page} page
 */
async function openSpringPage(page) {
    await page.route('https://cdn.jsdelivr.net/**', (route) => {
        const name = path.basename(new URL(route.request().url()).pathname);
        return route.fulfill({ path: path.join(VENDOR, name) });
    });
    await page.goto(PAGE);
    await expect(page.locator(`#weights-container [data-weight-id="${WEIGHT_ID}"]`)).toBeVisible();
}

/**
 * Перетаскивание мышью: interact.js слушает pointer-события, программный
 * вызов обработчиков прошёл бы мимо него.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} source
 * @param {{ x: number, y: number }} to
 */
async function startDrag(page, source, to) {
    const box = await source.boundingBox();
    if (!box) throw new Error('источник перетаскивания не на экране');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 20 });
}

/**
 * Пружина на штатив, груз на её крючок, ждём показание силы.
 * @param {import('@playwright/test').Page} page
 */
async function hangWeight(page) {
    const canvas = await page.locator('#canvas-dynamic').boundingBox();
    if (!canvas) throw new Error('холст не на экране');
    await startDrag(page, page.locator(`#equipment-container [data-equipment-id="${SPRING_ID}"]`), {
        x: canvas.x + canvas.width / 2,
        y: canvas.y + canvas.height * 0.2,
    });
    await page.mouse.up();
    // Карточка пружины перерисовывается и сдвигает панель грузов вниз.
    await expect(page.locator(`#equipment-container [data-equipment-id="${SPRING_ID}"]`))
        .toHaveAttribute('data-status', 'installed');

    // Груз ниже края окна 1280×720, прокрутка сдвигает и холст.
    const weight = page.locator(`#weights-container [data-weight-id="${WEIGHT_ID}"]`);
    await weight.scrollIntoViewIfNeeded();
    const scrolledCanvas = await page.locator('#canvas-dynamic').boundingBox();
    if (!scrolledCanvas) throw new Error('холст не на экране');
    // Крючок движется вместе с подвесом пружины, его координату знает только сцена.
    const hook = await page.evaluate(() => {
        const s = window.experiment.state;
        const length = window.experiment.getVisualLength(s.springLength || s.springNaturalLength);
        return { x: s.springPosition.x, y: s.springPosition.y + length };
    });
    const target = { x: scrolledCanvas.x + hook.x, y: scrolledCanvas.y + hook.y };
    await startDrag(page, weight, target);
    // Сцена берёт крючок груза из призрака: центр по ширине, четверть высоты
    // сверху. Где окажется призрак под курсором, зависит от вёрстки панели, —
    // доводим его крючок до крючка пружины.
    const ghost = await page.locator('#drag-ghost').boundingBox();
    if (!ghost) throw new Error('нет призрака перетаскивания');
    await page.mouse.move(
        target.x + (target.x - (ghost.x + ghost.width / 2)),
        target.y + (target.y - (ghost.y + ghost.height * 0.25)),
        { steps: 5 },
    );
    await page.mouse.up();
    await expect(page.locator('#btn-record-force')).toBeEnabled();
    // Пока груз качается, Δl на табло мгновенное — ученик ждёт успокоения.
    await expect.poll(() => page.evaluate(() => window.experiment.state.isAnimating)).toBe(false);
}

test('страница опыта с пружиной открывается без ошибок', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openSpringPage(page);
    await expect.poll(() => page.evaluate(() => typeof window.experiment)).toBe('object');
    expect(errors).toEqual([]);
});

test('подвешенный груз даёт записанную силу F = m·g', async ({ page }) => {
    await openSpringPage(page);
    await hangWeight(page);

    await page.locator('#btn-record-force').click();

    await expect(page.locator('#recorded-force-display')).toBeVisible();
    const force = parseFloat(await page.locator('#recorded-force-value').textContent() ?? '');
    expect(force).toBeCloseTo(WEIGHT_FORCE, 1);
});

test('расчёт жёсткости даёт k в допуске от паспортной', async ({ page }) => {
    await openSpringPage(page);
    await hangWeight(page);

    await page.locator('#btn-record-force').click();
    await page.locator('#btn-record-elongation').click();
    await page.locator('#btn-calculate-stiffness').click();

    await expect(page.locator('#calculation-result')).toBeVisible();
    const k = parseFloat(await page.locator('#result-stiffness-value').textContent() ?? '');
    // Δl ≈ 2 см пишется с шагом 1 мм, это до 5 % от k, плюс шум показаний 0,5 %.
    expect(Math.abs(k - PASSPORT_K) / PASSPORT_K).toBeLessThan(0.06);
});
