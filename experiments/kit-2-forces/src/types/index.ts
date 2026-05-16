/**
 * Общие типы и константы комплекта №2 «Силы».
 *
 * Здесь живёт ТОЛЬКО то, что одинаково для всех опытов комплекта (g,
 * геометрия, единицы). Опыто-специфичные типы — в `./spring/` и `./friction/`.
 */

/** Точка в декартовых координатах (px относительно сцены). */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Прямоугольник (px). */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Ускорение свободного падения по российскому школьному стандарту. */
export const G = 9.8 as const;

/** Масштаб симуляции: сколько пикселей в 1 сантиметре. */
export const PIXELS_PER_CM = 20 as const;
