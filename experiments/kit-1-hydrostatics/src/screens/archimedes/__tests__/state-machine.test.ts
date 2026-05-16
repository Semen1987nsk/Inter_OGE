/**
 * ArchimedesExperiment — state-machine + drag-drop матрица (этап 6b).
 *
 * Стек: happy-dom + Vitest + customElements (через побочные импорты компонентов).
 * Здесь — round-trip mount/unmount/reset, валидные последовательности из спеки
 * §4 (drag-drop матрица), и ассерты на DOM-инварианты (карточки помечены
 * `in-use` ⇔ прибор на сцене; data-draggable снимается ⇔ in-use).
 *
 * Программный API оркестратора в основном — единственная точка взаимодействия,
 * чтобы не зависеть от низкоуровневой эмуляции PointerEvent (drag сам по себе
 * проверяется E2E Playwright в этапе 9). Тесты ниже фокусируются на ИНВАРИАНТАХ
 * результатов после серии команд.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArchimedesScreen } from '../ArchimedesScreen';
import type { ArchimedesExperiment } from '../ArchimedesExperiment';

async function registerComponents(): Promise<void> {
  await import('../../../ui/components/lab-equipment-card');
  await import('../../../ui/components/lab-metal-weight');
  await import('../../../ui/components/lab-dynamometer');
  await import('../../../ui/components/lab-beaker');
  await import('../../../ui/components/lab-thread');
  await import('../../../ui/components/lab-journal');
  await import('../../../ui/components/lab-balance');
  await import('../../../ui/components/lab-graduated-cylinder');
  await import('../../../ui/components/lab-salt-set');
}

function getCard(host: HTMLElement, eqId: string): HTMLElement {
  const c = host.querySelector<HTMLElement>(`lab-equipment-card[data-eq="${eqId}"]`);
  if (!c) throw new Error(`No card for ${eqId}`);
  return c;
}

describe('ArchimedesExperiment — state-machine + drag-drop матрица', () => {
  let host: HTMLElement;
  let screen: ArchimedesScreen;
  let exp: ArchimedesExperiment;

  beforeEach(async () => {
    await registerComponents();
    if (typeof localStorage !== 'undefined') localStorage.clear();
    document.body.innerHTML = '';
    host = document.createElement('main');
    host.id = 'screen-content';
    document.body.appendChild(host);
    screen = new ArchimedesScreen();
    screen.mount(host);
    exp = (window as unknown as { archimedesExperiment: ArchimedesExperiment }).archimedesExperiment;
  });

  afterEach(() => {
    screen.unmount();
    document.body.innerHTML = '';
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof globalThis.gc === 'function') globalThis.gc();
  });

  // ─── Round-trip mount/unmount ─────────────────────────────────────────

  it('mount → unmount → mount: 5 циклов без утечек, window.archimedesExperiment корректен', () => {
    for (let i = 0; i < 5; i++) {
      expect((window as unknown as { archimedesExperiment?: unknown }).archimedesExperiment).toBeDefined();
      screen.unmount();
      expect((window as unknown as { archimedesExperiment?: unknown }).archimedesExperiment).toBeUndefined();
      screen.mount(host);
      // переинициализируем ссылку
      exp = (window as unknown as { archimedesExperiment: ArchimedesExperiment }).archimedesExperiment;
      expect(exp.getState()).toBe('idle');
    }
  });

  it('mount идемпотентен: повторный mount на тот же host — no-op', () => {
    screen.mount(host);
    screen.mount(host);
    expect(host.querySelectorAll('#ar-stage').length).toBe(1);
  });

  // ─── DOM-инварианты для карточек ──────────────────────────────────────

  it('инвариант: карточка прибора → status=in-use ⇔ прибор на сцене + data-draggable снят', () => {
    const cardDyno = getCard(host, 'dynamometer-1');
    expect(cardDyno.getAttribute('status')).toBe('available');
    expect(cardDyno.getAttribute('data-draggable')).toBe('dynamometer-1');

    exp.placeDynamometer(1);
    expect(cardDyno.getAttribute('status')).toBe('in-use');
    expect(cardDyno.hasAttribute('data-draggable')).toBe(false);

    exp.returnDynamometerToKit();
    expect(cardDyno.getAttribute('status')).toBe('available');
    expect(cardDyno.getAttribute('data-draggable')).toBe('dynamometer-1');
  });

  it('инвариант: цилиндр на крюке → его карточка in-use, остальные available', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    expect(getCard(host, 'cyl-3').getAttribute('status')).toBe('in-use');
    expect(getCard(host, 'cyl-1').getAttribute('status')).toBe('available');
    expect(getCard(host, 'cyl-2').getAttribute('status')).toBe('available');
    expect(getCard(host, 'cyl-4').getAttribute('status')).toBe('available');
  });

  it('инвариант: после 2 циклов с разными цилиндрами — карточки чисты, в журнале 2 строки', () => {
    exp.placeDynamometer(1);
    exp.placeBeaker();
    exp.pourWater(200);
    // №2
    exp.attachCylinderById(2);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.liftCylinderFromWater();
    exp.detachCylinder();
    // №4
    exp.attachCylinderById(4);
    exp.recordCurrentReading();
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.detachCylinder();
    expect(exp.getJournalRows()).toHaveLength(2);
    // обе карточки снова доступны
    expect(getCard(host, 'cyl-2').getAttribute('status')).toBe('available');
    expect(getCard(host, 'cyl-4').getAttribute('status')).toBe('available');
  });

  // ─── Drag-drop валидные последовательности ────────────────────────────

  it('валидная последовательность: динамометр → цилиндр → стакан → вода → запись P_возд → погружение', () => {
    exp.placeDynamometer(1);
    expect(exp.getState()).toBe('dyno-on-scene');
    exp.attachCylinderById(3);
    expect(exp.getState()).toBe('cyl-attached');
    exp.placeBeaker();
    // beakerOnScene = true, но phase остаётся cyl-attached до начала измерения
    expect(exp.getFullState().beakerOnScene).toBe(true);
    exp.pourWater(150);
    // воду налили — phase двигается в 'water-poured' (полная имитация: ученик
    // может налить воду и до записи P_возд, и после)
    expect(exp.getState()).toBe('water-poured');
    exp.recordCurrentReading();
    // P_возд записан, но phase не возвращается в 'air-recorded' если уже
    // 'water-poured'? Проверяем фактическое поведение: после записи P_возд
    // должна быть либо 'air-recorded', либо 'water-poured'.
    expect(['air-recorded', 'water-poured']).toContain(exp.getState());
    exp.dipCylinderInWater();
    expect(exp.getState()).toBe('cyl-in-water');
  });

  it('валидная: переключение цилиндра между измерениями (detach + attach)', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(2);
    exp.detachCylinder();
    expect(exp.getFullState().cylinderId).toBeNull();
    exp.attachCylinderById(3);
    expect(exp.getFullState().cylinderId).toBe(3);
    exp.detachCylinder();
    exp.attachCylinderById(4);
    expect(exp.getFullState().cylinderId).toBe(4);
  });

  it('валидная: лифт-погружение-лифт цикл — force ходит между P_возд и P_жид', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(200);
    const P_air = exp.getFullState().forceN;
    expect(P_air).toBeCloseTo(0.6468, 3);
    exp.dipCylinderInWater();
    const P_liq = exp.getFullState().forceN;
    expect(P_liq).toBeCloseTo(0.098, 3);
    exp.liftCylinderFromWater();
    expect(exp.getFullState().forceN).toBeCloseTo(P_air, 3);
    exp.dipCylinderInWater();
    expect(exp.getFullState().forceN).toBeCloseTo(P_liq, 3);
  });

  // ─── Drag-drop матрица: невалидные комбинации (no-op / soft-warn) ─────

  it('невалидная: цилиндр без динамометра → cylinderId остаётся null', () => {
    exp.attachCylinderById(2);
    expect(exp.getFullState().cylinderId).toBeNull();
  });

  it('невалидная: dipCylinderInWater без стакана → отклонено', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.dipCylinderInWater();
    expect(exp.getFullState().inWater).toBe(false);
  });

  it('невалидная: pourWater без стакана → no-op, waterMl=0', () => {
    exp.pourWater(150);
    expect(exp.getFullState().waterMl).toBe(0);
  });

  it('каскадная: returnDynamometerToKit с цилиндром на крюке → dyno=null + cylinder=null', () => {
    // §19.11.15: detach всегда проходит, зависимости снимаются автоматически.
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.returnDynamometerToKit();
    expect(exp.getFullState().dynoRange).toBeNull();
    expect(exp.getFullState().cylinderId).toBeNull();
  });

  it('каскадная: returnBeakerToKit с цилиндром в воде → beaker=false, цилиндр висит на нити', () => {
    // §19.11.15: «полная имитация реального мира». Стакан можно убрать,
    // цилиндр остаётся подвешен на динамометре в воздухе.
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    exp.returnBeakerToKit();
    expect(exp.getFullState().beakerOnScene).toBe(false);
    expect(exp.getFullState().inWater).toBe(false);
    expect(exp.getFullState().cylinderId).toBe(3);
  });

  // ─── DOM: scene-overlay svg создан, элементы присутствуют ─────────────

  it('DOM: scene-overlay svg смонтирован, ar-clamp-line / ar-thread-path / ar-bottom-danger присутствуют', () => {
    expect(host.querySelector('#ar-scene-overlay')).toBeTruthy();
    expect(host.querySelector('#ar-clamp-line')).toBeTruthy();
    expect(host.querySelector('#ar-thread-path')).toBeTruthy();
    expect(host.querySelector('#ar-bottom-danger')).toBeTruthy();
  });

  it('DOM: clamp-line и thread скрыты в idle, появляются при placeDynamometer/attach', () => {
    const clampLine = host.querySelector('#ar-clamp-line') as SVGLineElement;
    const threadPath = host.querySelector('#ar-thread-path') as SVGPathElement;
    // idle — скрыты (через атрибут display=none, см. svgHide/svgShow)
    expect(clampLine.getAttribute('display')).toBe('none');
    expect(threadPath.getAttribute('display')).toBe('none');
    exp.placeDynamometer(1);
    expect(clampLine.getAttribute('display')).not.toBe('none');
    // нить появляется только когда есть цилиндр
    expect(threadPath.getAttribute('display')).toBe('none');
    exp.attachCylinderById(3);
    expect(threadPath.getAttribute('display')).not.toBe('none');
  });

  // ─── Banner state ─────────────────────────────────────────────────────

  it('banner: появляется при №1+дин-1 (перегрузка), скрыт при detach', () => {
    const banner = host.querySelector('#ar-banner') as HTMLElement;
    expect(banner.hidden).toBe(true);
    exp.placeDynamometer(1);
    exp.attachCylinderById(1);
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toMatch(/Перегрузка/i);
    exp.detachCylinder();
    expect(banner.hidden).toBe(true);
  });

  it('banner: появляется при перелив 300 мл, скрыт после reset', () => {
    const banner = host.querySelector('#ar-banner') as HTMLElement;
    exp.placeBeaker();
    exp.pourWater(300);
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toMatch(/Перелив/i);
    exp.reset();
    expect(banner.hidden).toBe(true);
  });

  // ─── Recording button visibility ──────────────────────────────────────

  it('record-btn: скрыта в idle, видима в cyl-attached и cyl-in-water, скрыта для №1', () => {
    const btn = host.querySelector('#ar-record-btn') as HTMLButtonElement;
    expect(btn.hidden).toBe(true);
    exp.placeDynamometer(1);
    expect(btn.hidden).toBe(true);
    exp.attachCylinderById(3);
    expect(btn.hidden).toBe(false);
    // CTA после фикса 1.2-UX: визуальный label содержит и базовое имя
    // действия («Записать P возд»), и числовое значение P_возд («= 0,65 Н»).
    // ARIA-label остаётся без значения (анти-спойлер).
    expect(
      (host.querySelector('#ar-record-label') as HTMLElement).textContent,
    ).toContain('Записать P возд');
    // №1 — кнопка скрыта
    exp.detachCylinder();
    exp.attachCylinderById(1);
    expect(btn.hidden).toBe(true);
  });

  // ─── reset идемпотентность ────────────────────────────────────────────

  it('reset из любого state возвращает в idle, журнал пуст, banner null', () => {
    // Сложное состояние: всё, что можно
    exp.placeDynamometer(5);
    exp.attachCylinderById(1);
    exp.placeBeaker();
    exp.pourWater(300);
    exp.dipCylinderInWater();
    exp.reset();
    expect(exp.getState()).toBe('idle');
    expect(exp.getJournalRows()).toHaveLength(0);
    expect(exp.getBannerText()).toBeNull();
    expect(exp.getFullState().dynoRange).toBeNull();
    expect(exp.getFullState().cylinderId).toBeNull();
    expect(exp.getFullState().beakerOnScene).toBe(false);
    expect(exp.getFullState().waterMl).toBe(0);
  });

  // ─── 50 случайных валидных действий не нарушают core-инварианты ─────

  it('fuzz: 50 случайных валидных действий → состояние всегда консистентно', () => {
    const actions: Array<() => void> = [
      () => exp.placeDynamometer(1),
      () => exp.placeDynamometer(5),
      () => exp.attachCylinderById(2),
      () => exp.attachCylinderById(3),
      () => exp.attachCylinderById(4),
      () => exp.placeBeaker(),
      () => exp.pourWater(100),
      () => exp.pourWater(200),
      () => exp.pourWater(150),
      () => exp.dipCylinderInWater(),
      () => exp.liftCylinderFromWater(),
      () => exp.recordCurrentReading(),
      () => exp.detachCylinder(),
      () => exp.returnDynamometerToKit(),
      () => exp.returnBeakerToKit(),
    ];
    for (let i = 0; i < 50; i++) {
      const a = actions[Math.floor(Math.random() * actions.length)]!;
      expect(() => a()).not.toThrow();
      // Базовые инварианты:
      const s = exp.getFullState();
      // dyno=null ⇒ cylinder=null ⇒ inWater=false
      if (s.dynoRange === null) {
        expect(s.cylinderId).toBeNull();
      }
      if (s.cylinderId === null) {
        expect(s.inWater).toBe(false);
      }
      // forceN финитен
      expect(Number.isFinite(s.forceN)).toBe(true);
      expect(Number.isFinite(s.forceTargetN)).toBe(true);
      // waterMl в [0, 250]
      expect(s.waterMl).toBeGreaterThanOrEqual(0);
      expect(s.waterMl).toBeLessThanOrEqual(250);
    }
  });

  // ─── Регрессия: detachCylinder обнуляет partialDip / bottomTouch ────

  it('regression: detachCylinder при partialDip → флаги очищаются', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.placeBeaker();
    exp.pourWater(40);
    exp.dipCylinderInWater();
    expect(exp.getPartialDip()).toBe(true);
    expect(exp.getFullState().bottomTouch).toBe(true);
    exp.detachCylinder();
    expect(exp.getPartialDip()).toBe(false);
    expect(exp.getFullState().bottomTouch).toBe(false);
  });

  // ─── Регрессия: после reset всё снова работает ────────────────────────

  it('regression: после reset можно начать новый цикл — №2 (полный путь)', () => {
    // Полный цикл №3 + ошибки
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(300); // перелив
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    exp.reset();
    // Теперь №2 должно работать чисто
    exp.placeDynamometer(1);
    exp.attachCylinderById(2);
    expect(exp.getOverloaded()).toBe(false);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    expect(exp.getJournalRows()).toHaveLength(1);
    expect(exp.getJournalRows()[0]!.cylinder).toBe('No2');
  });

  // ─── submersionFraction: state.submersionFraction ↔ inWater ─────────

  it('submersionFraction: idle → 0; после dipCylinderInWater → 1', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(2);
    expect(exp.getFullState().submersionFraction).toBe(0);
    exp.placeBeaker();
    exp.pourWater(200);
    expect(exp.getFullState().submersionFraction).toBe(0);
    exp.dipCylinderInWater();
    expect(exp.getFullState().submersionFraction).toBe(1);
  });

  it('submersionFraction обнуляется на liftCylinderFromWater', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(2);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    expect(exp.getFullState().submersionFraction).toBe(1);
    exp.liftCylinderFromWater();
    expect(exp.getFullState().submersionFraction).toBe(0);
  });

  it('submersionFraction обнуляется на detachCylinder', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(2);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    expect(exp.getFullState().submersionFraction).toBe(1);
    exp.detachCylinder();
    expect(exp.getFullState().submersionFraction).toBe(0);
  });

  // §19.11.18 regression: liftCylinderFromWater при стакане с водой и
  // НЕ записанном P_жид должен оставлять phase='water-poured', чтобы CTA
  // снова показывал «Записать P жид» при повторном погружении. До фикса
  // фаза откатывалась до 'cyl-attached', и шаг «Налейте воду» сценария
  // снова появлялся, хотя стакан с водой стоит на сцене.
  it('lift при beakerOnScene+water>0 + НЕ записан P_жид → phase=water-poured', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(200);
    expect(exp.getFullState().phase).toBe('water-poured');
    exp.dipCylinderInWater();
    expect(exp.getFullState().phase).toBe('cyl-in-water');
    exp.liftCylinderFromWater();
    // КРИТИЧНО: не 'cyl-attached', а именно 'water-poured' — стакан с водой
    // никуда не делся, ученик должен иметь возможность погрузить снова.
    expect(exp.getFullState().phase).toBe('water-poured');
    expect(exp.getFullState().beakerOnScene).toBe(true);
    expect(exp.getFullState().waterMl).toBe(200);
  });

  it('lift после liquid-recorded остаётся в liquid-recorded (полный цикл)', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(3);
    exp.recordCurrentReading();
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    exp.recordCurrentReading();
    expect(exp.getFullState().phase).toBe('liquid-recorded');
    exp.liftCylinderFromWater();
    expect(exp.getFullState().phase).toBe('liquid-recorded');
  });

  it('submersionFraction обнуляется на reset', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(2);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    expect(exp.getFullState().submersionFraction).toBe(1);
    exp.reset();
    expect(exp.getFullState().submersionFraction).toBe(0);
  });

  it('инвариант: inWater=true ⇒ submersionFraction>0', () => {
    exp.placeDynamometer(1);
    exp.attachCylinderById(2);
    exp.placeBeaker();
    exp.pourWater(200);
    exp.dipCylinderInWater();
    const s = exp.getFullState();
    if (s.inWater) {
      expect(s.submersionFraction).toBeGreaterThan(0);
    }
  });

  it('после restore из storage: submersionFraction совместим с inWater (legacy без поля)', () => {
    // Эмулируем legacy snapshot без submersionFraction (старая версия 6c).
    // savedAt — number (epoch ms), не ISO-строка (см. StateStore.ts).
    const legacyPayload = {
      version: 1,
      savedAt: Date.now(),
      payload: {
        phase: 'cyl-in-water' as const,
        dynoRange: 1 as const,
        cylinderId: 2 as const,
        beakerOnScene: true,
        waterMl: 200,
        inWater: true,
        // submersionFraction намеренно отсутствует
        forceTargetN: 0.441,
        overloaded: false,
        partialDip: false,
        bottomTouch: false,
        bannerText: null,
        completedCylinders: [],
        journalRows: [],
      },
    };
    if (typeof localStorage !== 'undefined') {
      // Ключ см. controller/StateStore.ts: STORAGE_KEY = 'kit-1:archimedes:state'.
      localStorage.setItem(
        'kit-1:archimedes:state',
        JSON.stringify(legacyPayload),
      );
    }
    // Перемонтируем экран — restore сработает.
    screen.unmount();
    screen.mount(host);
    exp = (window as unknown as { archimedesExperiment: ArchimedesExperiment })
      .archimedesExperiment;
    const s = exp.getFullState();
    expect(s.inWater).toBe(true);
    // Совместимость: при отсутствии поля frac=1 для inWater=true.
    expect(s.submersionFraction).toBe(1);
  });
});
