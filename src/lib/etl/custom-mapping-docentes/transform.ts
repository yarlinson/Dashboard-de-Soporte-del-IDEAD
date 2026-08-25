import { runRules, hasErrors } from "../core/rules";
import { normalizeUsername, parseCourseCodes, splitFullName, type MoodleConfig } from "../core/moodle";
import { computeTransformSummary } from "../core/summary";
import { groupTeacherRows, computeRoleConflicts, type TeacherSourceRow } from "../core/teacher-grouping";
import {
  buildDocenteOutputRow,
  buildDocenteOutputColumns,
  getDocenteExportData,
  exportDocenteRowsToCsv,
  type DocenteRowResult,
  type DocenteTransformResult,
  type DocenteExportData,
  type MoodleDocenteOutputRow,
} from "../core/moodle-docente";
import { buildRoleLookup, normalizeVinculacionKey } from "../docentes-siau/transform";
import type { ColumnMappingDocente } from "./schema";
import { customMappingDocentesRules, type DocenteMappingNormalizedRow } from "./rules";

export { buildDocenteOutputColumns, getDocenteExportData, exportDocenteRowsToCsv };
export type { DocenteRowResult, DocenteTransformResult, DocenteExportData };

function normalizeRow(
  raw: Record<string, unknown>,
  mapping: ColumnMappingDocente,
  manualCourses: string[],
  roleLookup: Map<string, string> | null
): DocenteMappingNormalizedRow {
  const get = (col: string) => String(raw[col] ?? "").trim();
  const email = get(mapping.emailColumn).toLowerCase();
  const username = normalizeUsername(get(mapping.usernameColumn), email);
  const { firstname, lastname } =
    mapping.name.nameMode === "full"
      ? splitFullName(get(mapping.name.fullNameColumn))
      : { firstname: get(mapping.name.firstnameColumn), lastname: get(mapping.name.lastnameColumn) };
  const courses =
    mapping.courseSource.courseMode === "manual" ? manualCourses : parseCourseCodes(get(mapping.courseSource.coursesColumn));
  const role =
    mapping.roleSource.roleMode === "fixed"
      ? mapping.roleSource.fixedRole.trim()
      : (roleLookup?.get(normalizeVinculacionKey(get(mapping.roleSource.roleColumn))) ?? null);
  return { username, firstname, lastname, email, courses, role };
}

/**
 * Combines custom-mapping's flexible column mapping with docentes-siau's per-docente grouping: a
 * teacher can appear on several source rows/pasted lines (one per course), so rows are normalized
 * first and then expanded into one (docente, curso) pair per course before grouping by username —
 * mirroring `transformSiauDocentes`'s Pass 2/3 via the shared `core/teacher-grouping.ts` engine.
 *
 * `overrides` lets the caller pin a manually-chosen role for a conflicting (docente, curso) pair,
 * same convention as `transformSiauDocentes`.
 */
export function transformCustomMappingDocentes(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMappingDocente,
  config: MoodleConfig,
  overrides: Record<string, string> = {}
): DocenteTransformResult {
  const manualCourses =
    mapping.courseSource.courseMode === "manual" ? parseCourseCodes(mapping.courseSource.manualCourseCodes) : [];
  const roleLookup = mapping.roleSource.roleMode === "column" ? buildRoleLookup(mapping.roleSource.roleMapping) : null;

  // Pass 1: normalization + per-row business rules
  const parsed = rawRows.map((raw, index) => {
    const rowIndex = index + 1;
    const normalized = normalizeRow(raw, mapping, manualCourses, roleLookup);
    const issues = runRules(normalized, customMappingDocentesRules);
    return { rowIndex, normalized, issues };
  });

  // Pass 2: expand each valid row into one TeacherSourceRow per course, then group by docente
  const sourceRows: TeacherSourceRow[] = [];
  for (const { normalized, issues } of parsed) {
    if (hasErrors(issues)) continue;
    for (const course of normalized.courses) {
      sourceRows.push({
        username: normalized.username,
        firstname: normalized.firstname,
        lastname: normalized.lastname,
        email: normalized.email,
        course,
        role: normalized.role,
        unresolvedRoleIssue: normalized.role
          ? undefined
          : {
              field: "role",
              code: "UNMAPPED_ROLE",
              severity: "error",
              message: `No hay un rol Moodle configurado para "${normalized.username}" (curso ${course}).`,
            },
      });
    }
  }
  const { groups, order } = groupTeacherRows(sourceRows);

  // Pass 3: build one output row per docente group
  const groupResults: DocenteRowResult[] = order.map((username, index) => {
    const group = groups.get(username)!;
    const issues = [...group.issues];
    if (group.courseRoles.size === 0) {
      issues.push({
        code: "NO_VALID_COURSES",
        severity: "error",
        message: "El docente no tiene cursos con un rol Moodle resuelto.",
      });
    }
    const output = hasErrors(issues) ? null : buildDocenteOutputRow(group, config, overrides);
    return { rowIndex: index + 1, output, issues, conflicts: computeRoleConflicts(group) };
  });

  // Pass 4: dataset-level check (duplicate usernames)
  const usernameCounts = new Map<string, number>();
  for (const r of groupResults) {
    if (!r.output?.username) continue;
    usernameCounts.set(r.output.username, (usernameCounts.get(r.output.username) ?? 0) + 1);
  }

  const rows: DocenteRowResult[] = groupResults.map((r) => {
    if (!r.output || (usernameCounts.get(r.output.username) ?? 0) <= 1) return r;
    const allIssues = [
      ...r.issues,
      {
        field: "username",
        code: "DUPLICATE_USERNAME",
        severity: "error" as const,
        message: `Username duplicado: "${r.output.username}"`,
      },
    ];
    return { ...r, output: null, issues: allIssues };
  });

  return { rows, summary: computeTransformSummary(rows) };
}

/** Removes a specific course (and its paired role) from one docente's row, keyed by course code and
 * renumbered contiguously — analogous to custom-mapping's `applyRemovedCourses`, but drops the
 * matching roleN alongside courseN and also prunes any now-irrelevant conflict entries. */
export function applyRemovedCoursesDocente(
  rows: DocenteRowResult[],
  removedCourses: Record<number, Set<string>>
): DocenteRowResult[] {
  return rows.map((r) => {
    const removed = removedCourses[r.rowIndex];
    if (!r.output || !removed || removed.size === 0) return r;
    const courseCount = Object.keys(r.output).filter((k) => k.startsWith("course")).length;
    const keptPairs = Array.from({ length: courseCount }, (_, i) => ({
      course: r.output![`course${i + 1}`],
      role: r.output![`role${i + 1}`],
    })).filter((pair) => !removed.has(pair.course));
    const { username, password, firstname, lastname, email } = r.output;
    const output: MoodleDocenteOutputRow = { username, password, firstname, lastname, email };
    keptPairs.forEach(({ course, role }, i) => {
      output[`course${i + 1}`] = course;
      output[`role${i + 1}`] = role;
    });
    return { ...r, output, conflicts: r.conflicts.filter((c) => !removed.has(c.course)) };
  });
}
