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

/** Удельные сопротивления (Ом·м) проволочных материалов набора кит-3. */
export const RESISTIVITY = {
  нихром: 1.1e-6,
  константан: 0.5e-6,
  никелин: 0.4e-6,
} as const;

/**
 * Сопротивление проволочного резистора: R = ρ·l/S.
 * rho_Ohm_m — удельное сопротивление (Ом·м); length_m — длина (м);
 * area_m2 — площадь поперечного сечения (м²). R=ρl/S (спека §4).
 */
export function wireResistance(rho_Ohm_m: number, length_m: number, area_m2: number): number {
  if (!Number.isFinite(rho_Ohm_m) || !Number.isFinite(length_m) || !Number.isFinite(area_m2)) {
    throw new RangeError('wireResistance: ρ, l, S должны быть конечными числами');
  }
  if (rho_Ohm_m <= 0 || length_m <= 0 || area_m2 <= 0) {
    throw new RangeError('wireResistance: ρ, l, S должны быть положительными');
  }
  return (rho_Ohm_m * length_m) / area_m2;
}

/**
 * Суммарное сопротивление последовательного соединения: R = ΣR_i.
 * Опыт 3.8 «Правило напряжений» — U = U1 + U2.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) п.8; КОДИФ §1.29.
 */
export function seriesResistance(...R_Ohm: number[]): number {
  if (R_Ohm.length === 0) throw new RangeError('seriesResistance: нужен хотя бы один резистор');
  guard(...R_Ohm);
  for (const r of R_Ohm) {
    if (r <= 0) throw new RangeError(`seriesResistance: R должен быть >0, получено ${r}`);
  }
  return R_Ohm.reduce((sum, r) => sum + r, 0);
}

/**
 * Суммарное сопротивление параллельного соединения: R = 1/Σ(1/R_i).
 * Опыт 3.9 «Правило токов» — I = I1 + I2.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) п.9; КОДИФ §1.29.
 */
export function parallelResistance(...R_Ohm: number[]): number {
  if (R_Ohm.length === 0) throw new RangeError('parallelResistance: нужен хотя бы один резистор');
  guard(...R_Ohm);
  for (const r of R_Ohm) {
    if (r <= 0) throw new RangeError(`parallelResistance: R должен быть >0, получено ${r}`);
  }
  return 1 / R_Ohm.reduce((sum, r) => sum + 1 / r, 0);
}
