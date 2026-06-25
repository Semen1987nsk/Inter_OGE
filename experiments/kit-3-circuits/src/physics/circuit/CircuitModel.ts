/**
 * Кит-3 «Электрические цепи» — pure-физика.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (стр.18) + КОДИФ §1.29:
 * измерение сопротивления резистора, мощности и работы тока — метод амперметра-вольтметра.
 * Аналитика по топологиям опытов (не общий нодальный солвер).
 */
function guard(...xs: number[]): void {
  for (const x of xs) if (!Number.isFinite(x)) throw new RangeError(`non-finite arg: ${x}`);
}
/** Сила тока I=U/R [А]. */
export function current(U_V: number, R_Ohm: number): number {
  guard(U_V, R_Ohm);
  if (R_Ohm <= 0) throw new RangeError(`R must be > 0, got ${R_Ohm}`);
  return U_V / R_Ohm;
}
/** Сопротивление R=U/I [Ом]. */
export function resistance(U_V: number, I_A: number): number {
  guard(U_V, I_A);
  if (I_A <= 0) throw new RangeError(`I must be > 0, got ${I_A}`);
  return U_V / I_A;
}
/** Мощность P=U·I [Вт]. */
export function power(U_V: number, I_A: number): number {
  guard(U_V, I_A);
  if (U_V < 0 || I_A < 0) throw new RangeError('U,I must be >= 0');
  return U_V * I_A;
}
/** Работа тока A=U·I·t [Дж]. */
export function workOfCurrent(U_V: number, I_A: number, t_s: number): number {
  guard(U_V, I_A, t_s);
  if (U_V < 0 || I_A < 0) throw new RangeError('U,I must be >= 0');
  if (t_s <= 0) throw new RangeError(`t must be > 0, got ${t_s}`);
  return U_V * I_A * t_s;
}
