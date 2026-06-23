import type { Kit } from '../data/kits';

export type Hit = {
  kitNum: number;
  experimentId: string;
  title: string;
};

export function searchExperiments(kits: ReadonlyArray<Kit>, query: string): Hit[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  const hits: Hit[] = [];

  for (const kit of kits) {
    for (const exp of kit.experiments) {
      const titleLower = exp.title.toLowerCase();
      const verbLower = exp.resultVerb.toLowerCase();
      const idLower = exp.id.toLowerCase();
      const fipiTaskLower = exp.fipiTask?.toLowerCase() ?? '';

      if (
        titleLower.includes(normalized) ||
        verbLower.includes(normalized) ||
        idLower.includes(normalized) ||
        fipiTaskLower.includes(normalized)
      ) {
        hits.push({
          kitNum: kit.num,
          experimentId: exp.id,
          title: exp.title,
        });
      }
    }
  }

  return hits;
}
