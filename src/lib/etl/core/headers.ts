/**
 * Column-header reconciliation: SIAU exports the same logical report with different header
 * spellings depending on the version (`CORREO_INSTITUCIONAL` vs `CORREO INSTITUCIONAL`,
 * `VINCULACION` vs `VINCULACIÓN`, `CURSO` vs `CÓDIGO CURSO`), so the engines resolve the source
 * headers to one canonical name instead of matching them literally.
 */

/** Canonical comparison form of a header: diacritics stripped, separator runs (spaces, underscores,
 * hyphens, dots) collapsed to a single space, uppercased — so "CORREO_INSTITUCIONAL",
 * "Correo Institucional" and "CORREO INSTITUCIONAL" all reduce to the same key. */
export function normalizeHeaderKey(header: string): string {
  return header
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[\s_\-.]+/g, " ")
    .trim()
    .toUpperCase();
}

/** Per-engine column aliases: canonical column name -> the source headers that mean the same column
 * but don't reduce to it through `normalizeHeaderKey` alone. A canonical name with no such variant
 * still belongs here (with an empty list) so it takes part in header-row detection and renaming. */
export type ColumnAliases = Record<string, readonly string[]>;

/** Maps every known header form (each canonical name's own, plus each of its aliases') to its canonical name. */
export function buildHeaderAliasLookup(aliases: ColumnAliases): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [canonical, variants] of Object.entries(aliases)) {
    lookup.set(normalizeHeaderKey(canonical), canonical);
    for (const variant of variants) lookup.set(normalizeHeaderKey(variant), canonical);
  }
  return lookup;
}

/**
 * Renames each row's keys to the canonical column names in `aliasLookup`, leaving unrecognized
 * columns untouched, so an engine's schema and rules can rely on a single spelling whichever export
 * variant the file came from.
 *
 * A canonical name is claimed by the column that already carries it verbatim, or else by the first
 * aliased column that maps to it; any later colliding column keeps its original header, so a report
 * carrying both `CURSO` and `CÓDIGO CURSO` never silently loses one of them.
 */
export function canonicalizeRowKeys(
  rows: Record<string, unknown>[],
  aliasLookup: Map<string, string>
): Record<string, unknown>[] {
  if (rows.length === 0) return rows;
  const keys = Object.keys(rows[0]);
  const claimed = new Set(keys.filter((key) => aliasLookup.get(normalizeHeaderKey(key)) === key));
  const renames = new Map<string, string>();
  for (const key of keys) {
    const canonical = aliasLookup.get(normalizeHeaderKey(key));
    if (!canonical || canonical === key || claimed.has(canonical)) continue;
    claimed.add(canonical);
    renames.set(key, canonical);
  }
  if (renames.size === 0) return rows;
  return rows.map((row) => {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) next[renames.get(key) ?? key] = value;
    return next;
  });
}

/** Required columns absent from the (already canonicalized) rows — lets a workflow explain a file
 * whose headers it could not recognize, instead of rendering an empty preview. */
export function findMissingColumns(
  rows: Record<string, unknown>[],
  required: readonly string[]
): string[] {
  if (rows.length === 0) return [];
  const present = new Set(Object.keys(rows[0]));
  return required.filter((column) => !present.has(column));
}
