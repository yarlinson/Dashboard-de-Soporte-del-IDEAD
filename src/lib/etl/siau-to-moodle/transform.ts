import { runRules, hasErrors } from "../core/rules";
import type { EtlIssue, EtlRowResult, EtlTransformResult } from "../core/types";
import { rowsToCsv } from "../core/csv";
import { computeTransformSummary } from "../core/summary";
import { SiauInputRowSchema, type SiauInputRow, type MoodleConfig, type MoodleOutputRow } from "./schema";
import { siauToMoodleRules, type SiauNormalizedRow } from "./rules";

export function normalizeUsername(rawUsername: string, fallbackEmail: string): string {
  const source = rawUsername.trim() || fallbackEmail.split("@")[0] || "";
  return source
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // strip diacritics (tildes, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, ""); // Moodle-safe username charset
}

export function parseCourseCodes(rawCursos: string): string[] {
  return Array.from(
    new Set(
      rawCursos
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    )
  );
}

function normalizeRow(raw: SiauInputRow): SiauNormalizedRow {
  const email = raw.CORREO_INSTITUCIONAL.trim().toLowerCase();
  const codigoInstitucional = String(raw.CÓDIGO_INSTITUCIONAL ?? "").trim();
  return {
    username: normalizeUsername(codigoInstitucional, email),
    firstname: raw.NOMBRES.trim(),
    lastname: raw.APELLIDOS.trim(),
    email,
    courses: parseCourseCodes(raw.CURSOS),
  };
}

function buildOutputRow(normalized: SiauNormalizedRow, config: MoodleConfig): MoodleOutputRow {
  const row: MoodleOutputRow = {
    username: normalized.username,
    password: config.genericPassword,
    firstname: normalized.firstname,
    lastname: normalized.lastname,
    email: normalized.email,
  };
  normalized.courses.forEach((code, idx) => {
    row[`course${idx + 1}`] = `${code}${config.periodSuffix}`;
  });
  return row;
}

export function transformSiauToMoodle(
  rawRows: Record<string, unknown>[],
  config: MoodleConfig
): EtlTransformResult<MoodleOutputRow> {
  // Pass 1: schema validation + normalization + per-row business rules
  const parsed = rawRows.map((raw, index) => {
    const rowIndex = index + 1;
    const result = SiauInputRowSchema.safeParse(raw);
    if (!result.success) {
      const issues: EtlIssue[] = result.error.issues.map((i) => ({
        code: "SCHEMA_ERROR",
        severity: "error" as const,
        message: `Fila inválida: ${i.message}`,
        field: i.path.join("."),
      }));
      return { rowIndex, normalized: null as SiauNormalizedRow | null, issues };
    }
    const normalized = normalizeRow(result.data);
    const issues = runRules(normalized, siauToMoodleRules);
    return { rowIndex, normalized, issues };
  });

  // Pass 2: dataset-level check (duplicate usernames) — not expressible as a per-row Rule<T>
  const usernameCounts = new Map<string, number>();
  for (const p of parsed) {
    if (!p.normalized?.username) continue;
    usernameCounts.set(p.normalized.username, (usernameCounts.get(p.normalized.username) ?? 0) + 1);
  }

  const rows: EtlRowResult<MoodleOutputRow>[] = parsed.map(({ rowIndex, normalized, issues }) => {
    const allIssues = [...issues];
    if (normalized?.username && (usernameCounts.get(normalized.username) ?? 0) > 1) {
      allIssues.push({
        field: "username",
        code: "DUPLICATE_USERNAME",
        severity: "error",
        message: `Username duplicado en el archivo: "${normalized.username}"`,
      });
    }
    const output = normalized && !hasErrors(allIssues) ? buildOutputRow(normalized, config) : null;
    return { rowIndex, output, issues: allIssues };
  });

  return { rows, summary: computeTransformSummary(rows) };
}

export function buildMoodleOutputColumns(rows: EtlRowResult<MoodleOutputRow>[]): string[] {
  const maxCourses = rows.reduce((max, r) => {
    if (!r.output) return max;
    const courseCount = Object.keys(r.output).filter((k) => k.startsWith("course")).length;
    return Math.max(max, courseCount);
  }, 0);
  return [
    "username",
    "password",
    "firstname",
    "lastname",
    "email",
    ...Array.from({ length: maxCourses }, (_, i) => `course${i + 1}`),
  ];
}

export interface MoodleExportData {
  rows: MoodleOutputRow[];
  columns: string[];
}

export function getMoodleExportData(rows: EtlRowResult<MoodleOutputRow>[]): MoodleExportData {
  const validOutputs = rows.map((r) => r.output).filter((o): o is MoodleOutputRow => o !== null);
  const columns = buildMoodleOutputColumns(rows);
  return { rows: validOutputs, columns };
}

export function exportRowsToCsv(rows: EtlRowResult<MoodleOutputRow>[]): string {
  const { rows: validOutputs, columns } = getMoodleExportData(rows);
  return rowsToCsv(validOutputs, columns);
}
