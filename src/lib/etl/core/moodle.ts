import { z } from "zod";
import type { EtlRowResult } from "./types";
import { rowsToCsv } from "./csv";

/** A row already resolved to the fields a Moodle bulk-user upload needs, before password/course-suffix are applied. */
export interface NormalizedMoodleRow {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  courses: string[];
}

export const MoodleConfigSchema = z
  .object({
    genericPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(64, "La contraseña es demasiado larga"),
    applyPeriodSuffix: z.boolean(),
    periodSuffix: z.string().trim(),
  })
  .refine((v) => !v.applyPeriodSuffix || v.periodSuffix.startsWith("/"), {
    message: "Ingrese un sufijo válido que inicie con '/' (ej. /2026B)",
    path: ["periodSuffix"],
  });
export type MoodleConfig = z.infer<typeof MoodleConfigSchema>;

export interface MoodleOutputRowBase {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
}
// course1, course2, ... are dynamic per row -> modeled as extra string keys
export type MoodleOutputRow = MoodleOutputRowBase & Record<string, string>;

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

/** Splits a single full-name field into firstname/lastname: "Last, First" if comma-separated, otherwise the midpoint of the space-separated tokens. */
export function splitFullName(fullName: string): { firstname: string; lastname: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  if (trimmed.includes(",")) {
    const [lastname = "", firstname = ""] = trimmed.split(",").map((s) => s.trim());
    return { firstname, lastname };
  }
  const tokens = trimmed.split(" ").filter(Boolean);
  if (tokens.length === 0) return { firstname: "", lastname: "" };
  if (tokens.length === 1) return { firstname: tokens[0], lastname: "" };
  const splitPoint = Math.ceil(tokens.length / 2);
  return {
    firstname: tokens.slice(0, splitPoint).join(" "),
    lastname: tokens.slice(splitPoint).join(" "),
  };
}

export function buildOutputRow(normalized: NormalizedMoodleRow, config: MoodleConfig): MoodleOutputRow {
  const row: MoodleOutputRow = {
    username: normalized.username,
    password: config.genericPassword,
    firstname: normalized.firstname,
    lastname: normalized.lastname,
    email: normalized.email,
  };
  normalized.courses.forEach((code, idx) => {
    row[`course${idx + 1}`] = config.applyPeriodSuffix ? `${code}${config.periodSuffix}` : code;
  });
  return row;
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
