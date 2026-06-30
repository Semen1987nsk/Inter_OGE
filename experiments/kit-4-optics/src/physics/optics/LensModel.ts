/**
 * Кит-4 «Оптика» — pure-физика тонкой линзы.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№4 (стр.19) + сноска (4):
 * «− измерение оптической силы собирающей линзы, фокусного расстояния собирающей линзы
 * (по свойству равенства размеров предмета и изображения, когда предмет расположен в двойном
 * фокусе), показателя преломления стекла;
 * − исследование свойства изображения, полученного с помощью собирающей линзы, изменения
 * фокусного расстояния двух сложенных линз; зависимости угла преломления от угла падения
 * на границе воздух – стекло.»
 * КОДИФ §1.29. Аналитика по тонкой линзе (не волновая оптика).
 * Все длины в мм, если не оговорено. opticalPower принимает F в метрах.
 */

/** Бросает RangeError если хотя бы один аргумент не является конечным числом. */
export function guard(...xs: number[]): void {
  for (const x of xs) if (!Number.isFinite(x)) throw new RangeError(`non-finite arg: ${x}`);
}

/**
 * Расстояние до изображения f [мм] по формуле тонкой линзы: 1/F = 1/d + 1/f → f = d·F/(d−F).
 * d=F → изображение в бесконечности (возвращает Infinity).
 * d<F → мнимое изображение (f<0).
 */
export function imageDistance(F_mm: number, d_mm: number): number {
  guard(F_mm, d_mm);
  if (d_mm === F_mm) return Infinity;
  return (d_mm * F_mm) / (d_mm - F_mm);
}

/**
 * Линейное увеличение Γ = −f/d, f из imageDistance.
 * Γ<0 → перевёрнутое; |Γ|>1 → увеличенное; |Γ|<1 → уменьшенное.
 * d=F → f=Infinity → Γ=Infinity (охраняется на уровне imageDistance).
 */
export function magnification(F_mm: number, d_mm: number): number {
  guard(F_mm, d_mm);
  const f = imageDistance(F_mm, d_mm);
  if (!Number.isFinite(f)) return Infinity;
  return -f / d_mm;
}

/**
 * Фокусное расстояние линзы F [мм] по двум расстояниям: F = d·f/(d+f).
 * Используется для обработки экспериментальных данных (опыт 4.1).
 */
export function focalFromDistances(d_mm: number, f_mm: number): number {
  guard(d_mm, f_mm);
  return (d_mm * f_mm) / (d_mm + f_mm);
}

/**
 * Оптическая сила линзы D = 1/F_m [дптр].
 * ВНИМАНИЕ: аргумент F_m — фокусное расстояние в МЕТРАХ (не в мм).
 * F=0,1 м → D=10 дптр; F=0,05 м → D=20 дптр; F=−0,075 м → D≈−13,3 дптр.
 */
export function opticalPower(F_m: number): number {
  guard(F_m);
  return 1 / F_m;
}

/**
 * Суммарная оптическая сила системы тонких сложенных линз: D = ΣD_i [дптр].
 * Применяется в опыте 4.5 (две сложенные линзы).
 */
export function combinedPower(...D: number[]): number {
  if (D.length === 0) throw new RangeError('combinedPower: нужна хотя бы одна линза');
  guard(...D);
  return D.reduce((sum, d) => sum + d, 0);
}

/**
 * Результирующее фокусное расстояние системы тонких сложенных линз [мм]: 1/F = Σ(1/F_i).
 * Эквивалентно combinedPower, но оперирует фокусными расстояниями в мм.
 */
export function combinedFocal(...F_mm: number[]): number {
  if (F_mm.length === 0) throw new RangeError('combinedFocal: нужна хотя бы одна линза');
  guard(...F_mm);
  const invSum = F_mm.reduce((sum, f) => sum + 1 / f, 0);
  return 1 / invSum;
}

/**
 * Классификация изображения по положению предмета относительно линзы.
 * Возвращает: kind ('real'|'virtual'), orientation ('inverted'|'upright'),
 * size ('enlarged'|'reduced'|'equal'), gamma (числовое значение Γ).
 *
 * Правило: d>F → действительное перевёрнутое (f>0, Γ<0);
 *          d<F → мнимое прямое увеличенное (f<0, Γ>0);
 *          d=F → изображение в бесконечности (f=∞, Γ=∞, изображение не формируется).
 * Граница equal: |Γ| ∈ [1−ε, 1+ε] где ε=0.001.
 *
 * КОНТРАКТ d=F (изображение в бесконечности — сознательный выбор, закреплён тестом):
 *   при f=Infinity / Γ=Infinity возвращаем { kind:'virtual', orientation:'upright',
 *   size:'enlarged', gamma:Infinity }. Это «изображение не формируется на конечном
 *   расстоянии»: помечаем как virtual (на экран не спроецировать), прямое (upright по
 *   умолчанию знака), бесконечно увеличенное (size:'enlarged'). Любая правка этого случая
 *   должна осознанно менять и тест «d=F (изображение в бесконечности) — контракт».
 */
export function imageProperties(
  F_mm: number,
  d_mm: number,
): { kind: 'real' | 'virtual'; orientation: 'inverted' | 'upright'; size: 'enlarged' | 'reduced' | 'equal'; gamma: number } {
  guard(F_mm, d_mm);
  const f = imageDistance(F_mm, d_mm);
  const gamma = magnification(F_mm, d_mm);

  if (!Number.isFinite(f) || !Number.isFinite(gamma)) {
    return { kind: 'virtual', orientation: 'upright', size: 'enlarged', gamma };
  }

  const kind: 'real' | 'virtual' = f > 0 ? 'real' : 'virtual';
  const orientation: 'inverted' | 'upright' = gamma < 0 ? 'inverted' : 'upright';

  const absGamma = Math.abs(gamma);
  const EPS = 0.001;
  let size: 'enlarged' | 'reduced' | 'equal';
  if (absGamma > 1 + EPS) size = 'enlarged';
  else if (absGamma < 1 - EPS) size = 'reduced';
  else size = 'equal';

  return { kind, orientation, size, gamma };
}

/** Зона положения предмета относительно фокуса. */
export type ObjectZone = 'gt2F' | 'eq2F' | 'F_2F' | 'eqF' | 'ltF';

/**
 * Классифицировать положение предмета по зонам, СОГЛАСОВАННО с imageProperties:
 *   real+reduced  → gt2F   |  real+equal → eq2F  |  real+enlarged → F_2F
 *   virtual (∞)   → eqF    |  virtual (конечн.) → ltF
 * Единый источник классификации — imageProperties (нет второго порога → нет трапа).
 */
export function objectZone(F_mm: number, d_mm: number): ObjectZone {
  guard(F_mm, d_mm);
  const p = imageProperties(F_mm, d_mm);
  if (p.kind === 'virtual') {
    return Number.isFinite(p.gamma) ? 'ltF' : 'eqF';
  }
  if (p.size === 'reduced') return 'gt2F';
  if (p.size === 'equal') return 'eq2F';
  return 'F_2F';
}

/** Человекочитаемая подпись зоны (RU). */
export function zoneLabelRu(zone: ObjectZone): string {
  const map: Record<ObjectZone, string> = {
    gt2F: 'd > 2F',
    eq2F: 'd = 2F',
    F_2F: 'F < d < 2F',
    eqF: 'd = F',
    ltF: 'd < F',
  };
  return map[zone];
}
