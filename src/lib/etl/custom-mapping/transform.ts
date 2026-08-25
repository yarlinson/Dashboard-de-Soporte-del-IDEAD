import { runRules, hasErrors } from "../core/rules";
import type { EtlIssue, EtlRowResult, EtlTransformResult } from "../core/types";
import { computeTransformSummary } from "../core/summary";
import {
  normalizeUsername,
  parseCourseCodes,
  splitFullName,
  buildOutputRow,
  type NormalizedMoodleRow,
  type MoodleConfig,
  type MoodleOutputRow,
} from "../core/moodle";
import type { ColumnMapping } from "./schema";
import { customMappingRules } from "./rules";

function normalizeRow(
  raw: Record<string, unknown>,
  mapping: ColumnMapping,
  manualCourses: string[]
): NormalizedMoodleRow {
  const get = (col: string) => String(raw[col] ?? "").trim();
  const email = get(mapping.emailColumn).toLowerCase();
  const username = normalizeUsername(get(mapping.usernameColumn), email);
  const { firstname, lastname } =
    mapping.name.nameMode === "full"
      ? splitFullName(get(mapping.name.fullNameColumn))
      : { firstname: get(mapping.name.firstnameColumn), lastname: get(mapping.name.lastnameColumn) };
  // Case B (no course info in the source): the same fixed list is injected into every row.
  const courses =
    mapping.courseSource.courseMode === "manual" ? manualCourses : parseCourseCodes(get(mapping.courseSource.coursesColumn));
  return { username, firstname, lastname, email, courses };
}

export function transformCustomMapping(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping,
  config: MoodleConfig
): EtlTransformResult<MoodleOutputRow> {
  const manualCourses =
    mapping.courseSource.courseMode === "manual" ? parseCourseCodes(mapping.courseSource.manualCourseCodes) : [];

  // Pass 1: normalization + per-row business rules
  const parsed = rawRows.map((raw, index) => {
    const rowIndex = index + 1;
    const normalized = normalizeRow(raw, mapping, manualCourses);
    const issues = runRules(normalized, customMappingRules);
    return { rowIndex, normalized, issues };
  });

  // Pass 2: dataset-level check (duplicate usernames) — not expressible as a per-row Rule<T>
  const usernameCounts = new Map<string, number>();
  for (const p of parsed) {
    if (!p.normalized.username) continue;
    usernameCounts.set(p.normalized.username, (usernameCounts.get(p.normalized.username) ?? 0) + 1);
  }

  const rows: EtlRowResult<MoodleOutputRow>[] = parsed.map(({ rowIndex, normalized, issues }) => {
    const allIssues: EtlIssue[] = [...issues];
    if (normalized.username && (usernameCounts.get(normalized.username) ?? 0) > 1) {
      allIssues.push({
        field: "username",
        code: "DUPLICATE_USERNAME",
        severity: "error",
        message: `Username duplicado en el archivo: "${normalized.username}"`,
      });
    }
    const output = !hasErrors(allIssues) ? buildOutputRow(normalized, config) : null;
    return { rowIndex, output, issues: allIssues };
  });

  return { rows, summary: computeTransformSummary(rows) };
}

/** Applies per-row, per-course manual removals (keyed by course code, not position) on top of an
 * already-transformed result, renumbering the surviving courses contiguously. Used by the preview
 * table's inline "quitar curso" action so a removal only affects the one student's row. */
export function applyRemovedCourses(
  rows: EtlRowResult<MoodleOutputRow>[],
  removedCourses: Record<number, Set<string>>
): EtlRowResult<MoodleOutputRow>[] {
  return rows.map((r) => {
    const removed = removedCourses[r.rowIndex];
    if (!r.output || !removed || removed.size === 0) return r;
    const keptCourses = Object.entries(r.output)
      .filter(([key]) => key.startsWith("course"))
      .map(([, value]) => value)
      .filter((code) => !removed.has(code));
    const { username, password, firstname, lastname, email } = r.output;
    const output: MoodleOutputRow = { username, password, firstname, lastname, email };
    keptCourses.forEach((code, i) => {
      output[`course${i + 1}`] = code;
    });
    return { ...r, output };
  });
}
