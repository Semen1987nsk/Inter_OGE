/**
 * Опыт 1.5 «Независимость выталкивающей силы от массы тела».
 * ФИПИ Прил. 2, компл. №1: «исследование … независимости выталкивающей силы
 * от массы тела (цилиндры №1 и 2)».
 * При равном объёме F_арх = ρ_воды·g·V не зависит от массы тела.
 */
import { archimedesForceN, cm3ToM3, RHO_WATER } from '../archimedes/ArchimedesCalc';

/** Полная архимедова сила [Н] при полном погружении цилиндра объёмом V [см³]. */
export function buoyantForceForCylinder(V_cm3: number): number {
  if (!Number.isFinite(V_cm3) || V_cm3 <= 0) {
    throw new RangeError(`V_cm3 must be > 0, got ${V_cm3}`);
  }
  return archimedesForceN(RHO_WATER, cm3ToM3(V_cm3));
}

/** Равны ли две силы в пределах относительного допуска (default 5%). */
export function forcesAreEqual(fa: number, fb: number, tolerance = 0.05): boolean {
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return false;
  if (Math.abs(fa) < 1e-9) return Math.abs(fb) < 1e-9;
  return Math.abs(fa - fb) / Math.abs(fa) <= tolerance;
}
