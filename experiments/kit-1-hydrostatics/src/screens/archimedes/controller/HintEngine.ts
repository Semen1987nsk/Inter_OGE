/**
 * HintEngine — implicit-scaffolding движок подсказок для опыта 1.2.
 *
 * Согласно research §1 (PhET implicit scaffolding) и спеке §6:
 *   - Подсказки появляются ТОЛЬКО после inactivity-таймаута (default 6с).
 *   - При 3 неудачных drop подряд — мягкое объяснение «куда тащить».
 *   - Ambient-pulse на правильной карточке — как только сменилась фаза
 *     (gold-glow CSS-animation, не блокирующая подсказка).
 *
 * Анти-паттерны (НЕ делаем): модальные туры, badges, streaks. Подсказки —
 * мягкие, контекстные, без раскрытия ожидаемых значений (ARIA-friendly).
 *
 * Pure-модуль: без DOM, без Store. Связь с UI — через два callback'а
 * (onHint и onAmbientPulse), которые регистрирует оркестратор.
 */

import type { ScenarioPhase } from '../ArchimedesExperiment';

export type HintSeverity = 'info' | 'warning';

export interface HintPayload {
  text: string;
  /** id карточки, к которой относится подсказка (для таргетинга UI). */
  targetCardId?: string;
  severity?: HintSeverity;
}

export interface HintEngineConfig {
  inactivityTimeoutMs: number;
  failedDropsThreshold: number;
  ambientPulseDurationMs: number;
  /** §21 UX-v2: текущий record-mode. Влияет на тексты подсказок:
   *  в fully-manual нет упоминаний кнопки «Записать ...» (её там нет). */
  recordMode: 'semi-auto' | 'fully-manual' | 'fully-auto';
}

const DEFAULTS: HintEngineConfig = {
  inactivityTimeoutMs: 6000,
  failedDropsThreshold: 3,
  ambientPulseDurationMs: 1500,
  recordMode: 'semi-auto',
};

/**
 * Карта «фаза → рекомендуемая карточка» для ambient-pulse. Если фаза не
 * содержит next-action на карточке (например, ученик уже всё разложил и
 * ждёт нажатия CTA «Записать»), ставим null — pulse выключается.
 */
const AMBIENT_BY_PHASE: Record<ScenarioPhase, string | null> = {
  idle: 'dynamometer-1',
  'dyno-on-scene': 'cyl-3', // рекомендуемый цилиндр (data-recommended в template)
  'cyl-attached': null, // ждём клика на «Записать P_возд» — pulse у CTA-кнопки сделает CSS
  'air-recorded': 'beaker',
  'beaker-on-scene': null, // ждём тапа на стакан → dose-picker
  'water-poured': null, // ждём drag dyno в стакан
  'cyl-in-water': null, // ждём клика на «Записать P_жид»
  'liquid-recorded': null, // готово; ученик может повторить с другим цилиндром
};

/**
 * Тексты подсказок при inactivity. Сделаны короткими, без палева ответа,
 * без раскрытия ожидаемой силы. По research §1 — это «инструмент тогда,
 * когда он перестаёт быть подсказкой и становится констатацией».
 */
const INACTIVITY_HINTS: Record<ScenarioPhase, string> = {
  idle: 'Возьмите динамометр и поставьте его на сцену.',
  'dyno-on-scene': 'Подвесьте цилиндр на крючок динамометра.',
  'cyl-attached': 'Запишите вес цилиндра в воздухе — нажмите «Записать P возд».',
  'air-recorded': 'Возьмите стакан со стола и поставьте на сцену.',
  'beaker-on-scene': 'Налейте воду в стакан — нажмите на стакан и выберите объём.',
  'water-poured': 'Опустите динамометр с цилиндром в воду.',
  'cyl-in-water': 'Запишите P жид — F_A появится автоматически.',
  'liquid-recorded': 'Готово. Повторите с другим цилиндром или сбросьте опыт.',
};

/**
 * §21 UX-v2: в fully-manual нет кнопки «Записать ...». Подсказки на фазах
 * записи указывают: «снимите показание и запишите в журнал руками».
 */
const INACTIVITY_HINTS_MANUAL: Record<ScenarioPhase, string> = {
  idle: 'Возьмите динамометр и поставьте его на сцену.',
  'dyno-on-scene': 'Подвесьте цилиндр на крючок динамометра.',
  'cyl-attached': 'Снимите показание динамометра и запишите P возд в журнал.',
  'air-recorded': 'Возьмите стакан со стола и поставьте на сцену.',
  'beaker-on-scene': 'Налейте воду в стакан — нажмите на стакан и выберите объём.',
  'water-poured': 'Опустите динамометр с цилиндром в воду.',
  'cyl-in-water': 'Снимите показание динамометра и запишите P жид в журнал.',
  'liquid-recorded': 'Готово. Повторите с другим цилиндром или сбросьте опыт.',
};

const FAILED_DROP_HINT =
  'Перетащите прибор на жёлтую пунктирную область — она подсветится, когда совместима.';

export type HintHandler = (hint: HintPayload) => void;
export type AmbientPulseHandler = (cardId: string | null) => void;

export class HintEngine {
  #config: HintEngineConfig;

  #onHint: HintHandler | null = null;
  #onAmbientPulse: AmbientPulseHandler | null = null;

  #phase: ScenarioPhase = 'idle';
  #inactivityTid: ReturnType<typeof setTimeout> | null = null;
  #failedDropCount = 0;
  #disposed = false;
  /** Кэш последнего ambient-pulse target — чтобы не дёргать обработчик повторно. */
  #lastPulseTarget: string | null = null;

  constructor(config: Partial<HintEngineConfig> = {}) {
    this.#config = { ...DEFAULTS, ...config };
  }

  /** §21 UX-v2: смена режима записи влияет на тексты подсказок. */
  setRecordMode(mode: 'semi-auto' | 'fully-manual' | 'fully-auto'): void {
    this.#config = { ...this.#config, recordMode: mode };
  }

  // ─── Регистрация callback'ов ─────────────────────────────────────────

  onHint(handler: HintHandler): void {
    this.#onHint = handler;
  }

  onAmbientPulse(handler: AmbientPulseHandler): void {
    this.#onAmbientPulse = handler;
    // Сразу синхронизируем с текущей фазой — handler ожидает «единственный
    // источник истины». Иначе от первого setPhase до первого вызова handler'а
    // будет рассинхрон.
    handler(this.#lastPulseTarget);
  }

  // ─── Основные методы ────────────────────────────────────────────────

  /** Уведомить engine что пользователь сделал что-то — сбрасывает inactivity. */
  trackActivity(): void {
    if (this.#disposed) return;
    this.#failedDropCount = 0;
    this.#restartInactivityTimer();
  }

  /** Сообщить о неудачном drop — drop-zone отбила перетягивание. */
  trackFailedDrop(): void {
    if (this.#disposed) return;
    this.#failedDropCount += 1;
    if (this.#failedDropCount >= this.#config.failedDropsThreshold) {
      this.#emitHint({
        text: FAILED_DROP_HINT,
        severity: 'warning',
      });
      this.#failedDropCount = 0;
    }
  }

  /**
   * Установить текущую фазу. Engine выберет соответствующий ambient-pulse
   * cardId и перезапустит inactivity-таймер. Повторная установка той же
   * фазы НЕ дёргает onAmbientPulse (тот же target), но всё равно
   * перезапускает inactivity-таймер — это и есть activity.
   */
  setPhase(phase: ScenarioPhase): void {
    if (this.#disposed) return;
    if (this.#phase !== phase) {
      this.#phase = phase;
      this.#failedDropCount = 0; // фаза сменилась — failed-drops неактуальны
    }
    const target = AMBIENT_BY_PHASE[phase] ?? null;
    if (target !== this.#lastPulseTarget) {
      this.#lastPulseTarget = target;
      this.#onAmbientPulse?.(target);
    }
    this.#restartInactivityTimer();
  }

  /**
   * Очистить таймеры. Должно вызываться при destroy() оркестратора, иначе
   * inactivity-callback может выстрелить уже после unmount опыта.
   */
  dispose(): void {
    this.#disposed = true;
    this.#cancelInactivityTimer();
    this.#onHint = null;
    this.#onAmbientPulse = null;
  }

  // ─── Геттеры (для тестов и UI-debug) ─────────────────────────────────

  getCurrentPulseTarget(): string | null {
    return this.#lastPulseTarget;
  }

  getFailedDropCount(): number {
    return this.#failedDropCount;
  }

  getPhase(): ScenarioPhase {
    return this.#phase;
  }

  // ─── Внутреннее ──────────────────────────────────────────────────────

  #restartInactivityTimer(): void {
    this.#cancelInactivityTimer();
    if (this.#config.inactivityTimeoutMs <= 0) return;
    this.#inactivityTid = setTimeout(() => {
      this.#inactivityTid = null;
      const map = this.#config.recordMode === 'fully-manual' ? INACTIVITY_HINTS_MANUAL : INACTIVITY_HINTS;
      const text = map[this.#phase];
      const target = AMBIENT_BY_PHASE[this.#phase];
      const payload: HintPayload =
        target !== null
          ? { text, targetCardId: target, severity: 'info' }
          : { text, severity: 'info' };
      this.#emitHint(payload);
    }, this.#config.inactivityTimeoutMs);
  }

  #cancelInactivityTimer(): void {
    if (this.#inactivityTid !== null) {
      clearTimeout(this.#inactivityTid);
      this.#inactivityTid = null;
    }
  }

  #emitHint(hint: HintPayload): void {
    if (this.#disposed) return;
    this.#onHint?.(hint);
  }
}
