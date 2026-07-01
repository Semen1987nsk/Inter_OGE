/**
 * Кит-4 «Оптика» — pure-физика преломления (закон Снелла).
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№4 (стр.19) + сноска (4):
 * «... показателя преломления стекла; ... зависимости угла преломления от угла
 *  падения на границе воздух – стекло.»
 * КОДИФ §1.29. Геометрическая оптика (не волновая).
 * Углы — в ГРАДУСАХ (как читает ученик по круговому транспортиру).
 */

/** Бросает RangeError если хотя бы один аргумент не является конечным числом. */
export function guard(...xs: number[]): void {
  for (const x of xs) if (!Number.isFinite(x)) throw new RangeError(`non-finite arg: ${x}`);
}

const DEG = Math.PI / 180;

/**
 * Угол преломления r [°] по закону Снелла: n1·sin i = n2·sin r ⇒ r = asin(n1·sin i / n2).
 * i=0 → r=0. Для воздух→стекло (n2>n1) всегда r<i.
 * Бросает RangeError при sin r ∉ [−1,1] (полное внутреннее отражение / вне домена).
 */
export function refractionAngle(iDeg: number, n1: number, n2: number): number {
  guard(iDeg, n1, n2);
  if (n2 === 0) throw new RangeError('refractionAngle: n2=0');
  const s = (n1 * Math.sin(iDeg * DEG)) / n2;
  if (s < -1 || s > 1) throw new RangeError(`refractionAngle: вне домена (sin r=${s}) — ПВО`);
  return Math.asin(s) / DEG;
}

/**
 * Показатель преломления n = sin i / sin r (обработка данных опыта 4.3).
 * Бросает RangeError при sin r ≈ 0 (n не определён).
 */
export function refractiveIndex(iDeg: number, rDeg: number): number {
  guard(iDeg, rDeg);
  const sr = Math.sin(rDeg * DEG);
  if (Math.abs(sr) < 1e-12) throw new RangeError('refractiveIndex: sin r ≈ 0 (n не определён)');
  return Math.sin(iDeg * DEG) / sr;
}
