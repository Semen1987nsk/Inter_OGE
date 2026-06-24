import type { Kit } from '../data/kits';

export interface ResumeTarget {
  kitNum: number;
  remaining: number;
  isFresh: boolean;
}

/**
 * Выбирает таргет для продолжения: последний начатый готовый кит с незавершёнными опытами.
 * Если прогресса нет → возвращает кит-1 с isFresh=true.
 */
export function resumeTarget(
  kits: ReadonlyArray<Kit>,
  progressByKit: Record<number, number>,
): ResumeTarget {
  // Если нет прогресса, начинаем с кита 1
  const startedKitNums = Object.keys(progressByKit).map(Number);
  if (startedKitNums.length === 0) {
    const kit1 = kits.find(k => k.num === 1);
    if (!kit1) throw new Error('Kit 1 not found');
    return {
      kitNum: 1,
      remaining: kit1.progress.total - 0,
      isFresh: true,
    };
  }

  // Найти последний начатый готовый кит
  // (самый большой номер среди начатых, если это готовый кит)
  const lastStartedNum = Math.max(...startedKitNums);
  const lastKit = kits.find(k => k.num === lastStartedNum);

  if (!lastKit) {
    throw new Error(`Kit ${lastStartedNum} not found`);
  }

  if (lastKit.status !== 'ready') {
    throw new Error(`Kit ${lastStartedNum} is not ready`);
  }

  const done = progressByKit[lastStartedNum] ?? 0;
  return {
    kitNum: lastStartedNum,
    remaining: lastKit.progress.total - done,
    isFresh: false,
  };
}
