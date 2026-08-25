import { runRules, hasErrors } from "../core/rules";
import type { EtlIssue } from "../core/types";
import { normalizeUsername, splitFullName } from "../core/moodle";
import { computeTransformSummary } from "../core/summary";
import { extractDistinctColumnValues } from "../core/csv";
import { groupTeacherRows, computeRoleConflicts, type TeacherSourceRow } from "../core/teacher-grouping";
import {
  buildDocenteOutputRow,
  buildDocenteOutputColumns,
  getDocenteExportData,
  exportDocenteRowsToCsv,
  type DocenteRowResult,
  type DocenteTransformResult,
  type DocenteExportData,
} from "../core/moodle-docente";
import { SiauDocenteInputRowSchema, type SiauDocenteInputRow, type DocenteConfig, type RoleMappingRule } from "./schema";
import { siauDocentesRules, type DocenteNormalizedRow } from "./rules";

export { buildDocenteOutputColumns, getDocenteExportData, exportDocenteRowsToCsv };
export type { DocenteRowResult, DocenteTransformResult, DocenteExportData };

function blankIfDash(value: string): string {
  const trimmed = value.trim();
  return trimmed === "-" ? "" : trimmed;
}

export function normalizeVinculacionKey(value: string): string {
  return blankIfDash(value).toUpperCase();
}

export function buildRoleLookup(roleMapping: RoleMappingRule[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const rule of roleMapping) {
    lookup.set(normalizeVinculacionKey(rule.vinculacion), rule.role.trim());
  }
  return lookup;
}

function normalizeRow(raw: SiauDocenteInputRow): DocenteNormalizedRow {
  const documento = blankIfDash(String(raw.DOCUMENTO ?? ""));
  const email = blankIfDash(raw.CORREO_INSTITUCIONAL).toLowerCase();
  const { firstname, lastname } = splitFullName(blankIfDash(raw.DOCENTE));
  return {
    username: normalizeUsername(documento, email),
    firstname,
    lastname,
    email,
    course: blankIfDash(raw.CURSO),
    vinculacion: blankIfDash(raw.VINCULACION),
  };
}

/** Distinct, ordered VINCULACION values present in the raw source rows (blank/"-" excluded) — drives the "sin mapear" hints in the role-mapping UI. */
export function extractDistinctVinculaciones(rawRows: Record<string, unknown>[]): string[] {
  return extractDistinctColumnValues(rawRows, "VINCULACION");
}

/**
 * Unlike the other ETL engines (one source row -> one output row), the SIAU docentes report has
 * one row per (docente, curso) pair, so this pipeline groups rows by docente (Pass 2) before
 * producing output: the result has one row per docente, not per source row.
 *
 * `overrides` lets the caller pin a manually-chosen role for a conflicting (docente, curso) pair —
 * keyed by `${username}::${course}` (see `overrideKey` in core/teacher-grouping.ts) — instead of
 * always taking the first-encountered candidate.
 */
export function transformSiauDocentes(
  rawRows: Record<string, unknown>[],
  config: DocenteConfig,
  overrides: Record<string, string> = {}
): DocenteTransformResult {
  const roleLookup = buildRoleLookup(config.roleMapping);

  // Pass 1: schema validation + normalization + per-row business rules
  const parsed = rawRows.map((raw, index) => {
    const rowIndex = index + 1;
    const result = SiauDocenteInputRowSchema.safeParse(raw);
    if (!result.success) {
      const issues: EtlIssue[] = result.error.issues.map((i) => ({
        code: "SCHEMA_ERROR",
        severity: "error" as const,
        message: `Fila inválida: ${i.message}`,
        field: i.path.join("."),
      }));
      return { rowIndex, normalized: null as DocenteNormalizedRow | null, issues };
    }
    const normalized = normalizeRow(result.data);
    const issues = runRules(normalized, siauDocentesRules);
    return { rowIndex, normalized, issues };
  });

  // Pass 2: build one TeacherSourceRow per valid source row, resolving its role from VINCULACION
  const sourceRows: TeacherSourceRow[] = [];
  for (const { normalized, issues } of parsed) {
    if (!normalized || hasErrors(issues)) continue;
    const role = roleLookup.get(normalizeVinculacionKey(normalized.vinculacion)) ?? null;
    sourceRows.push({
      username: normalized.username,
      firstname: normalized.firstname,
      lastname: normalized.lastname,
      email: normalized.email,
      course: normalized.course,
      role,
      unresolvedRoleIssue: role
        ? undefined
        : {
            field: "vinculacion",
            code: "UNMAPPED_VINCULACION",
            severity: "error",
            message: `No hay un rol Moodle configurado para la vinculación "${normalized.vinculacion || "(vacía)"}" (curso ${normalized.course}).`,
          },
    });
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
        message: "El docente no tiene cursos con vinculación mapeada a un rol Moodle.",
      });
    }
    const output = hasErrors(issues) ? null : buildDocenteOutputRow(group, config, overrides);
    return { rowIndex: index + 1, output, issues, conflicts: computeRoleConflicts(group) };
  });

  // Pass 4: dataset-level check (duplicate usernames) — cannot happen from grouping itself, kept for parity/safety
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
