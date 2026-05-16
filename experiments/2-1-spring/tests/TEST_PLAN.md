# Тест-план — Опыт 2.1 «Жёсткость пружины»

Чтобы покрыть все классы багов (включая те, что фуззер пропустил), тестирование делится на **6 категорий**. Каждая категория проверяет свой класс инвариантов; ни одна другая не может их заменить.

---

## 0. Уроки из найденных багов

Каждый пропущенный баг — это **отсутствующий класс инвариантов** в моих тестах. Фиксирую уроки:

### Урок 1 (UI/логика mismatch)
Drop-zone «ПОДВЕСЬТЕ СЮДА» подсвечивалась при drag дин после spring+weight, а drop отказывал. **API-фуззер не ловит** — он проверял только `attach()` return value, не парность UI-подсказки и реального результата drop.

### Урок 2 (асимметричное тестирование)
**Тест проверял `attach → check value`, но не `attach → detach → check returned to initial`.** При снятии груза пружина оставалась растянутой — `#startOscillation` имел ранний `return` для `weights.length === 0`. **Это самый коварный класс багов: forward-direction работает, reverse — нет.**

### Урок 3 (где смотреть)
Я смотрел на:
- ✅ DOM-структуру (cards, attached, hidden zones).
- ✅ Возвращаемые значения API.
- ✅ console.error.
- ❌ **НЕ СМОТРЕЛ на `extension` атрибут пружины** (физическое состояние) — а именно там сидел баг.
- ❌ НЕ СМОТРЕЛ на `force` атрибут динамометра в динамике.
- ❌ НЕ ПРОВЕРЯЛ зеркальность операций.

### Принцип: «инвариант, а не тест»
Лучше не «после X должно быть Y», а **«ВСЕГДА P(state)»**. Property-based testing.

Примеры property-инвариантов для нашего опыта:
- **PI-1**: `displayedExtensionMm == equilibriumExtensionMm` после стабилизации (нет активной анимации). **ЭТО ловит баг #5.**
- **PI-2**: `dynamometer.force == m·g` после стабилизации (если grouz on dyno).
- **PI-3**: Round-trip: `attachX + detachX == initial state` (для X = spring, dyno, weight).
- **PI-4**: `forall reachable state s: s.weights ⊆ available_weights` (нет дубликатов / mystery items).

Эти property проверяются на КАЖДОМ шаге фуззера — не нужно перечислять конкретные сценарии.

---

## Категория 1. Unit-тесты физики и алгоритмов

**Что проверяем:** чистые функции (нет DOM, нет state).

**Покрытие:**
- `massToForce(m)` для m ∈ {0, 10, 100, 200, 1000} — в Н.
- `forceToExtension(F, k)` для всех (F, k) комбинаций — в см.
- `calculateStiffness(F, x)` — обратная функция, в Н/м.
- `dampedOscillation` — амплитуда, затухание, ω.
- `oscillationDuration` — время до 1% амплитуды.
- `createMeasurement` — null для нулевых вводов, корректный объект для валидных.
- `leastSquaresThroughOrigin` — точное восстановление k для безшумных, робастность к шуму.
- `computeResults` — среднее, σ, МНК, isInValidRange = `[VALID_K_RANGE]`.
- `roundTo` — округление до N знаков, отрицательные.

**Инструмент:** Vitest. **Цель:** 100% покрытие физики.

---

## Категория 2. State-инварианты (API-фуззинг)

**Что проверяем:** что для любой последовательности action'ов внутреннее состояние остаётся консистентным.

**Action-набор:**
1. `attachSpringById('spring-k50' | 'spring-k10')`
2. `attachDynamometerById(id, 'spring' | 'stand')`
3. `attachWeightById(any of 7)`
4. `recordScaleClick(0..100 mm)`
5. `recordMeasurement()`
6. `reset()`
7. `detach` через X-кнопку wrapper'а
8. `toggle` measurement-panel

**Инварианты после каждой 11–17й итерации:**
- I1: `card[status='in-use']` ≡ DOM `.attached-eq` (set-equality).
- I2: weights без spring И без dyno-on-stand → impossible.
- I3: нет дублей в attached.
- I4: каждый wrapper имеет inner element + атрибут `attached`.
- I5: `recordBtn.hidden` ↔ нет пружины.
- I6: ровно 0 или 1 active step в stepper.
- I7: `measurement-count` бейдж = число строк в таблице.
- I8: `console.error/window.error/unhandledrejection` пустые.

**Цель:** 3000+ итераций без ошибок и нарушений.

---

## Категория 3. Detenrministic state-machine (граничные кейсы)

**Что проверяем:** конкретные API-сценарии и их return-values.

**Тест-кейсы (минимум 70):**

### 3.1. attachSpring
- Empty → spring-k50 → true.
- Same spring twice → false.
- attach OTHER spring — false.
- attach spring при dyno-on-stand → **false** (штатив занят).
- card-status переключается available ↔ in-use.

### 3.2. attachDynamometer
- `(any, 'stand')` на пустой штатив → true; повтор → false.
- `(any, 'stand')` при пружине → **false** (штатив занят).
- `(any, 'spring')` без пружины → false.
- `(any, 'spring')` после пружины → true.
- `(any, 'spring')` после spring + weight → **false** (по ФИПИ дин до грузов).
- attach spring после `(any, 'stand')` → **false**.

### 3.3. attachWeight
- На пустой штатив → false.
- На spring → true.
- На dyno-on-stand → true.
- На dyno-on-spring → true (между дин и весами).
- Повторно тот же weight → false.
- Цепочка из всех 7 → 7 successful attaches.
- Total mass всех 7 = 100×3 + 10 + 10 + 20 + 50 = **390 г**.

### 3.4. recordScaleClick / recordMeasurement
- На пустой → silent no-op.
- Без l₀ → ничего не записывает.
- Δl ≤ 0 → flash error, no journal row.
- Δl > 0 → строка в журнале, k вычислен.

### 3.5. detach (chain rules)
- detach средней груз → снимает его и **всё ниже** (не выше).
- detach пружины → полный reset.
- detach дин-на-штативе → полный reset (грузам не на чем висеть).
- detach дин-на-пружине → снимает дин + грузы под ним, пружина остаётся.

---

## Категория 4. UI consistency (drop-zone vs drop-result)

**Класс багов:** drop-zone подсвечивается («можно сюда»), но drop в эту же зону отказывает. **Это пропустил мой первый фуззер.**

**Что проверяем:** для каждого drag-сценария:
- DZ-1: видимая drop-zone ⇒ drop с этой kind/equipmentId возвращает `true`.
- DZ-2: невидимая drop-zone ⇒ drop с этой kind возвращает `false` или snap не сработает.

**Тест-кейсы:**
- Empty stand: drag spring → spring-zone visible ✓ + drop OK.
- Empty stand: drag dyno → spring-zone visible ✓ + drop OK (=> attach to stand).
- Empty stand: drag weight → bottom-zone hidden, никаких подсветок.
- Spring attached: drag dyno → bottom-zone visible ✓ + drop OK.
- Spring + weight: drag dyno → **bottom-zone hidden** + drop fails (синхронно).
- Spring + dyno: drag dyno → ничего не подсвечено.
- Dyno-on-stand: drag spring → ничего не подсвечено.

---

## Категория 5. Real drag&drop (PointerEvents simulation)

**Что проверяем:** не ломается ли drag из карточки → snap → mount при реальных PointerEvents.

**Тест-кейсы:**
- `dispatchEvent(pointerdown, pointermove ×3, pointerup)` на каждом draggable.
- При промахе — анимированный возврат в карточку (homeRect восстановлен).
- При попадании — wrapper в hung-stack.
- DragController **не активен** на уже подвешенных (атрибут `attached`) — клик доходит до scale-area внутри Shadow DOM.
- Keyboard fallback: Tab → Enter/Space на карточке → equipment-pick → attach.

---

## Категория 6. A11y, performance, memory

**A11y:**
- Все интерактивные элементы достижимы Tab.
- ARIA-описание у пружины НЕ содержит «k = N» (ученик не должен слышать ответ).
- `aria-live` обновляется при ключевых событиях.
- WCAG AA контраст (axe-core).

**Performance:**
- Цикл attach → detach 100 раз — нет утечек DOM (количество wrapper'ов после reset = 0).
- Цикл reset → assemble → reset 1000 раз — растёт ли heap? (через `performance.memory.usedJSHeapSize` если доступен).
- Время отрисовки stepper при изменении state < 16 ms.

**Memory:**
- После reset() нет «висящих» listener'ов (через WeakRef проверки невозможно, но через DOM-counter).
- После detach всех элементов — DOM элементов измерительных wrapper'ов = 0.

---

## Полный матрица покрытия

| Категория | Что ловит | Что НЕ ловит |
|---|---|---|
| 1. Unit физики | bugs in formulas | UI bugs, state bugs |
| 2. API-фуззинг | state inconsistencies, crashes | UI mismatches, drag bugs, perf |
| 3. Determ state-machine | known edge cases | unknown edge cases (фуззер их найдёт) |
| 4. UI consistency | drop-zone/drop рассогласования | physics bugs |
| 5. Real drag | DragController bugs, click-after-attach | logic bugs |
| 6. A11y/perf/memory | accessibility, leaks, slowdowns | functional bugs |

**Цель:** все 6 категорий должны быть в CI. Пропуск любой — пропуск класса багов.

---

## Расширенная PI-таксономия после опыта 2.2

После полной отгрузки опыта 2.2 PI-набор расширен с 4 до **14+ категорий**. Эталон — `src/__tests__/comprehensive-fuzzer.test.ts`. Каждая категория = отдельный `describe()`, иерархия:

| Префикс | Категория | Минимум итераций | Что ловит |
|---|---|---|---|
| **PI-Phys-1..N** | Чистая физика (закон Гука, Кулона, единицы) | 1500 на инвариант | Расхождение модели и реальности |
| **PI-Mono-1..N** | Монотонность (F↑ с m, x↓ с k и т.п.) | 50-300 | Знаковые ошибки, переставленные параметры |
| **PI-Edge-1..N** | Граничные значения (0, ∞, NaN) | детерминированно | Деление на 0, неопределённости |
| **PI-Round-1..N** | `roundTo` идемпотентность и порядок | 1500 | Багги округления при многократном применении |
| **PI-Sum-1..N** | `totalMass` линейность и коммутативность | 800 | Дубли в стэке, гонки при reorder |
| **PI-Combo-1..N** | Все 2^N подмножеств грузов | детерм. | Невалидные комбинации, переполнение |
| **PI-Agg-1..N** | Стат-функции (mean, stdDev, MNK) | 300-500 | mean ≠ Σ/N, stdDev<0, MNK не восстанавливает k |
| **PI-RT-1..N** | Round-trip (forward+reverse идентичны) | 300-1500 | Асимметрия операций |
| **PI-Noise-1..N** | Устойчивость к шуму ±5% | 300 | Чувствительность к измерительной погрешности |
| **PI-FIPI-1..N** | Соответствие спецификации ОГЭ-2026 | детерм. | Drift паспортных значений |
| **PI-Surf-1..N** | Сравнение поверхностей (μ_s≥μ_k, B>A) | детерм. | Перепутанные поверхности |
| **PI-Trans-1..N** | Переходы состояний (покой→скольжение и т.п.) | 1000 | Неправильный порог срыва |
| **PI-Inv-1..N** | Обратные расчёты (μ из (F,m)) | 800-1500 | Численная нестабильность |
| **PI-Chain-1..N** | Полные сценарии измерения | 300 | Композиция функций даёт неверный итог |
| **PI-Osc-1..N** | Колебания (затухание, амплитуда≤A) | 800 | Resonance, рост амплитуды |
| **PI-Work-1..N** | Работа A=F·d (для опытов с трением/энергией) | 1500 | Знак, единицы |
| **PI-Acc-1..N** | Ускорение F=ma | 1500 | Знаковые ошибки II закона Ньютона |

### Правило добавления нового PI

После каждого найденного бага — добавить новый PI в **comprehensive-fuzzer.test.ts** и пометить в этом плане. Пример из опыта 2.2: баг `Math.round(value)` на шкале динамометра → новый PI **PI-Phys-Scale-Format**.

### Целевые числа для нового опыта

- ≥ **50** test cases в `comprehensive-fuzzer.test.ts`.
- ≥ **25 000** итераций суммарно (1500 × 17 категорий ≈ 25 500).
- ≥ **30** state-machine cases в `state-machine.test.ts` (DOM-based).
- **0** нарушений PI после первого зелёного прогона.

### Эталоны

- Spring fuzzer: [src/__tests__/comprehensive-fuzzer.test.ts](../src/__tests__/comprehensive-fuzzer.test.ts) — 49 cases / ~22 950 iter.
- Friction fuzzer: [../../2-2-friction/src/__tests__/comprehensive-fuzzer.test.ts](../../2-2-friction/src/__tests__/comprehensive-fuzzer.test.ts) — 68 cases / ~25 500 iter.
- Spring state-machine: [src/__tests__/state-machine.test.ts](../src/__tests__/state-machine.test.ts) — 45 cases.
- Friction state-machine: [../../2-2-friction/src/__tests__/state-machine.test.ts](../../2-2-friction/src/__tests__/state-machine.test.ts) — 51 case.
