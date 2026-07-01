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
 * iDeg ∈ [0,90] — физический диапазон транспортира (0 = нормальное падение, 90 = скользящее).
 * i=0 → r=0. Для воздух→стекло (n2>n1) всегда r<i.
 * Бросает RangeError при iDeg ∉ [0,90], при n1≤0 или n2≤0,
 * или при sin r ∉ [−1,1] (полное внутреннее отражение / вне домена).
 */
export function refractionAngle(iDeg: number, n1: number, n2: number): number {
  guard(iDeg, n1, n2);
  if (iDeg < 0 || iDeg > 90) throw new RangeError('refractionAngle: угол падения вне [0,90]: ' + iDeg);
  if (n1 <= 0 || n2 <= 0) throw new RangeError('refractionAngle: показатели преломления должны быть > 0');
  const s = (n1 * Math.sin(iDeg * DEG)) / n2;
  if (s < -1 || s > 1) throw new RangeError(`refractionAngle: вне домена (sin r=${s}) — ПВО`);
  return Math.asin(s) / DEG;
}

/**
 * Показатель преломления n = sin i / sin r (обработка данных опыта 4.3).
 * iDeg ∈ [0,90], rDeg ∈ [0,90] — физический диапазон транспортира.
 * Бросает RangeError при iDeg или rDeg вне [0,90], при sin r ≈ 0 (n не определён).
 */
export function refractiveIndex(iDeg: number, rDeg: number): number {
  guard(iDeg, rDeg);
  if (iDeg < 0 || iDeg > 90) throw new RangeError('refractiveIndex: угол падения вне [0,90]: ' + iDeg);
  if (rDeg < 0 || rDeg > 90) throw new RangeError('refractiveIndex: угол преломления вне [0,90]: ' + rDeg);
  const sr = Math.sin(rDeg * DEG);
  if (Math.abs(sr) < 1e-12) throw new RangeError('refractiveIndex: sin r ≈ 0 (n не определён)');
  return Math.sin(iDeg * DEG) / sr;
}
