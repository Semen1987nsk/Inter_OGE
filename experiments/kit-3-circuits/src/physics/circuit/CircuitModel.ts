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

/** Лампа накаливания (ФИПИ 4,8 В · 0,5 А): нить греется → R растёт с током. */
export const LAMP_R_COLD = 2.4; // Ом, холодная нить
export const LAMP_K = 14.4;     // Ом/А, рост R с током (тюнинг под номинал)
export const LAMP_RATED_U = 4.8;
export const LAMP_RATED_I = 0.5;

/**
 * Сила тока через лампу I(U) [А] — нелинейная вогнутая ВАХ.
 * Модель R(I)=R_cold+k·I ⇒ U=I·(R_cold+k·I) ⇒ I=(−R_cold+√(R_cold²+4kU))/(2k).
 * Монотонна, вогнута, I(0)=0, проходит через номинал (4,8 В → 0,5 А).
 */
export function lampCurrent(U_V: number): number {
  guard(U_V);
  if (U_V < 0) throw new RangeError(`U must be >= 0, got ${U_V}`);
  if (U_V === 0) return 0;
  return (-LAMP_R_COLD + Math.sqrt(LAMP_R_COLD * LAMP_R_COLD + 4 * LAMP_K * U_V)) / (2 * LAMP_K);
}

/** Сопротивление лампы R(U)=U/I [Ом]; при U=0 → R_cold (нить холодная). */
export function lampResistance(U_V: number): number {
  guard(U_V);
  if (U_V < 0) throw new RangeError(`U must be >= 0, got ${U_V}`);
  if (U_V === 0) return LAMP_R_COLD;
  return U_V / lampCurrent(U_V);
}
