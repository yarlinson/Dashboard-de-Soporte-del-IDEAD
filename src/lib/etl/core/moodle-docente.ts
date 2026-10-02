import type { EtlIssue, EtlTransformSummary } from "./types";
import type { MoodleConfig } from "./moodle";
import { rowsToCsv } from "./csv";
import { resolveGroupRole, type TeacherGroup, type RoleConflict } from "./teacher-grouping";

export interface MoodleDocenteOutputRowBase {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
}
// course1, role1, course2, role2, ... are dynamic per row -> modeled as extra string keys
export type MoodleDocenteOutputRow = MoodleDocenteOutputRowBase & Record<string, string>;

export interface DocenteRowResult {
  rowIndex: number;
  output: MoodleDocenteOutputRow | null;
  issues: EtlIssue[];
  conflicts: RoleConflict[];
}

export interface DocenteTransformResult {
  rows: DocenteRowResult[];
  summary: EtlTransformSummary;
}

export function buildDocenteOutputRow(
  group: TeacherGroup,
  config: MoodleConfig,
  overrides: Record<string, string>
): MoodleDocenteOutputRow {
  const row: MoodleDocenteOutputRow = {
    username: group.username,
    password: config.genericPassword,
    firstname: group.firstname,
    lastname: group.lastname,
    email: group.email,
    unidad: group.unidad,
  };
  let index = 0;
  for (const [course, candidates] of group.courseRoles) {
    index += 1;
    row[`course${index}`] = config.applyPeriodSuffix ? `${course}${config.periodSuffix}` : course;
    row[`role${index}`] = resolveGroupRole(candidates, group.username, course, overrides);
  }
  return row;
}

export function buildDocenteOutputColumns(rows: DocenteRowResult[]): string[] {
  const maxCourses = rows.reduce((max, r) => {
    if (!r.output) return max;
    const courseCount = Object.keys(r.output).filter((k) => k.startsWith("course")).length;
    return Math.max(max, courseCount);
  }, 0);
  // Only shown when at least one row actually carries a UNIDAD value — callers whose source has no
  // such column (e.g. custom-mapping-docentes) leave it blank on every row, so the export keeps its
  // existing shape instead of gaining a column that's always empty.
  const hasUnidad = rows.some((r) => r.output?.unidad);
  const courseRoleColumns = Array.from({ length: maxCourses }, (_, i) => [`course${i + 1}`, `role${i + 1}`]).flat();
  return [
    "username",
    "password",
    "firstname",
    "lastname",
    "email",
    ...(hasUnidad ? ["unidad"] : []),
    ...courseRoleColumns,
  ];
}

export interface DocenteExportData {
  rows: MoodleDocenteOutputRow[];
  columns: string[];
}

export function getDocenteExportData(rows: DocenteRowResult[]): DocenteExportData {
  const validOutputs = rows.map((r) => r.output).filter((o): o is MoodleDocenteOutputRow => o !== null);
  const columns = buildDocenteOutputColumns(rows);
  return { rows: validOutputs, columns };
}

export function exportDocenteRowsToCsv(rows: DocenteRowResult[]): string {
  const { rows: validOutputs, columns } = getDocenteExportData(rows);
  return rowsToCsv(validOutputs, columns);
}

/** Distinct Moodle roles (role1, role2, ...) present across a set of docente rows, sorted for stable
 * display order — feeds the "filtrar por vinculación" chips in the preview. */
export function extractDistinctRoles(rows: DocenteRowResult[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.output) continue;
    for (const [key, value] of Object.entries(r.output)) {
      if (key.startsWith("role") && value) seen.add(value);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/** Keeps only docente rows that have at least one course assigned to one of the selected roles. An
 * empty `roles` set means "no filter" — every row passes through. */
export function filterDocenteRowsByRole(rows: DocenteRowResult[], roles: ReadonlySet<string>): DocenteRowResult[] {
  if (roles.size === 0) return rows;
  return rows.filter(
    (r) => r.output !== null && Object.entries(r.output).some(([key, value]) => key.startsWith("role") && roles.has(value))
  );
}

export interface DocenteRowPartition {
  clean: DocenteRowResult[];
  withAvisos: DocenteRowResult[];
}

/** Splits successfully-processed docente rows (output !== null) into "sin avisos" (no issues at all)
 * and "con avisos" (carrying warning issues, e.g. CONFLICTING_ROLE). Rows with blocking errors
 * (output === null) are excluded from both — they have nothing exportable yet. */
export function partitionDocenteRowsByAvisos(rows: DocenteRowResult[]): DocenteRowPartition {
  const clean: DocenteRowResult[] = [];
  const withAvisos: DocenteRowResult[] = [];
  for (const r of rows) {
    if (!r.output) continue;
    (r.issues.length === 0 ? clean : withAvisos).push(r);
  }
  return { clean, withAvisos };
}
