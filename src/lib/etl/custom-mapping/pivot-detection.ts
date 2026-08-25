export interface PivotDetection {
  isPivoted: boolean;
  repeatedHeaders: string[];
}

const DEDUP_SUFFIX = /_\d+$/;

/** Detects a "wide" report with repeated column blocks (e.g. a NOMBRE/CORREO pair per course) by
 * looking for header labels that recur several times after stripping the library's dedup suffix
 * (`_1`, `_2`, ...). Requires at least 2 distinct labels repeated 3+ times each, to avoid flagging
 * a single incidental duplicate header as a pivoted structure. */
export function detectPivotedColumns(sourceColumns: string[]): PivotDetection {
  const counts = new Map<string, number>();
  for (const col of sourceColumns) {
    const base = col.replace(DEDUP_SUFFIX, "").trim();
    if (base) counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  const repeatedHeaders = [...counts.entries()].filter(([, count]) => count >= 3).map(([name]) => name);
  return { isPivoted: repeatedHeaders.length >= 2, repeatedHeaders };
}
