import { normalizeUsername, parseCourseCodes } from "../siau-to-moodle/transform";
import { normalizeCourseCodeForComparison } from "../core/course-code";
import { SiauInputRowSchema, type SiauInputRow } from "../siau-to-moodle/schema";
import type { ComparableStudent } from "./types";

interface NormalizedComparisonRow {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  courses: string[];
}

function normalizeForComparison(raw: SiauInputRow): NormalizedComparisonRow {
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

/**
 * Builds `ComparableStudent[]` from a raw SIAU export (mismas columnas que el motor
 * Estudiantes SIAU → Moodle: CÓDIGO_INSTITUCIONAL, NOMBRES, APELLIDOS,
 * CORREO_INSTITUCIONAL, CURSOS). A diferencia de los docentes, cada fila SIAU ya es un
 * estudiante completo (CURSOS trae todos sus cursos en una sola celda separada por
 * comas), así que no hace falta agrupar varias filas por username. Si un username se
 * repite en el archivo, se conserva solo la primera ocurrencia.
 */
export function parseComparableStudentsFromSiauRows(rawRows: Record<string, unknown>[]): ComparableStudent[] {
  const result: ComparableStudent[] = [];
  const seenUsernames = new Set<string>();
  for (const raw of rawRows) {
    const parsed = SiauInputRowSchema.safeParse(raw);
    if (!parsed.success) continue;
    const row = normalizeForComparison(parsed.data);
    if (!row.username || row.courses.length === 0) continue;
    if (seenUsernames.has(row.username)) continue;
    seenUsernames.add(row.username);
    result.push({
      username: row.username,
      firstname: row.firstname,
      lastname: row.lastname,
      email: row.email,
      courses: new Set(row.courses.map(normalizeCourseCodeForComparison)),
    });
  }
  return result;
}

const OUTPUT_COURSE_COLUMN = /^course(\d+)$/;

/** Result of parsing an already-processed Moodle-output file: the resolved estudiantes plus any
 * usernames that appeared in more than one row (kept for parity with `diffStudents`'s "last row
 * wins" behavior — this only surfaces the warning, it doesn't change which row is kept). */
export interface ParsedComparableStudents {
  students: ComparableStudent[];
  duplicateUsernames: string[];
}

/**
 * Builds `ComparableStudent[]` from un archivo ya procesado (salida del motor
 * Estudiantes SIAU → Moodle: username, password, firstname, lastname, email, course1,
 * course2, ...). Cada fila ya representa un estudiante, así que no requiere agrupación
 * ni lectura de columnas de rol (los estudiantes no tienen rol configurable).
 */
export function parseComparableStudentsFromMoodleOutputRows(rawRows: Record<string, unknown>[]): ParsedComparableStudents {
  const result: ComparableStudent[] = [];
  const seenUsernames = new Set<string>();
  const duplicateUsernames = new Set<string>();
  for (const raw of rawRows) {
    const username = String(raw.username ?? "").trim();
    if (!username) continue;
    if (seenUsernames.has(username)) duplicateUsernames.add(username);
    seenUsernames.add(username);
    const courses = new Set<string>();
    for (const key of Object.keys(raw)) {
      if (!OUTPUT_COURSE_COLUMN.test(key)) continue;
      const course = normalizeCourseCodeForComparison(String(raw[key] ?? ""));
      if (course) courses.add(course);
    }
    result.push({
      username,
      firstname: String(raw.firstname ?? "").trim(),
      lastname: String(raw.lastname ?? "").trim(),
      email: String(raw.email ?? "").trim(),
      courses,
    });
  }
  return { students: result, duplicateUsernames: Array.from(duplicateUsernames) };
}
