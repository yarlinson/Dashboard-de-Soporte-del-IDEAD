import { normalizeUsername, splitFullName } from "../core/moodle";
import { groupTeacherRows, resolveGroupRole, sortByContractPriority, type TeacherSourceRow } from "../core/teacher-grouping";
import { normalizeCourseCodeForComparison } from "../core/course-code";
import { SiauDocenteInputRowSchema, type SiauDocenteInputRow, type RoleMappingRule } from "../docentes-siau/schema";
import { blankIfDash, buildRoleLookup, normalizeVinculacionKey } from "../docentes-siau/transform";
import type { ComparableDocente } from "./types";

interface NormalizedComparisonRow {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  course: string;
  vinculacion: string;
  estadoContratado: string;
}

function normalizeForComparison(raw: SiauDocenteInputRow): NormalizedComparisonRow {
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
    estadoContratado: blankIfDash(raw.ESTADO_CONTRATADO).toUpperCase(),
  };
}

/**
 * Builds `ComparableDocente[]` from a raw SIAU export (mismas columnas que el motor Docentes SIAU:
 * DOCUMENTO, CORREO_INSTITUCIONAL, DOCENTE, VINCULACION, CURSO, ESTADO_CONTRATADO). Reutiliza el mismo
 * motor de agrupación (`groupTeacherRows`), la misma prioridad CONTRATADO-sobre-BORRADOR
 * (`sortByContractPriority`) y las mismas equivalencias VINCULACION → Rol Moodle (`roleMapping`,
 * `buildRoleLookup`) que el pipeline principal (`transformSiauDocentes`), para que los roles que se
 * comparan y exportan sean los roles reales de Moodle, no la vinculación cruda. Cursos cuya vinculación
 * no tiene una regla configurada se descartan silenciosamente (igual que en el motor principal, donde
 * quedarían bloqueados por `UNMAPPED_VINCULACION`).
 */
export function parseComparableDocentesFromSiauRows(
  rawRows: Record<string, unknown>[],
  roleMapping: RoleMappingRule[]
): ComparableDocente[] {
  const roleLookup = buildRoleLookup(roleMapping);
  const normalizedRows: NormalizedComparisonRow[] = [];
  for (const raw of rawRows) {
    const parsed = SiauDocenteInputRowSchema.safeParse(raw);
    if (!parsed.success) continue;
    const row = normalizeForComparison(parsed.data);
    if (!row.username || !row.course || !row.vinculacion) continue;
    normalizedRows.push(row);
  }

  const prioritizedRows = sortByContractPriority(normalizedRows, (row) => row.estadoContratado);
  const sourceRows: TeacherSourceRow[] = prioritizedRows.map((row) => ({
    username: row.username,
    firstname: row.firstname,
    lastname: row.lastname,
    email: row.email,
    course: row.course,
    role: roleLookup.get(normalizeVinculacionKey(row.vinculacion)) ?? null,
  }));

  const { groups } = groupTeacherRows(sourceRows);
  const result: ComparableDocente[] = [];
  for (const group of groups.values()) {
    const courses = new Map<string, string>();
    for (const [course, candidates] of group.courseRoles) {
      courses.set(normalizeCourseCodeForComparison(course), resolveGroupRole(candidates, group.username, course, {}));
    }
    result.push({ username: group.username, firstname: group.firstname, lastname: group.lastname, email: group.email, courses });
  }
  return result;
}

const OUTPUT_COURSE_COLUMN = /^course(\d+)$/;

/** Result of parsing an already-processed Moodle-output file: the resolved docentes plus any
 * usernames that appeared in more than one row (kept for parity with `diffDocentes`'s "last row
 * wins" behavior — this only surfaces the warning, it doesn't change which row is kept). */
export interface ParsedComparableDocentes {
  docentes: ComparableDocente[];
  duplicateUsernames: string[];
}

/**
 * Builds `ComparableDocente[]` from un archivo ya procesado (salida del motor Docentes SIAU → Moodle:
 * username, password, firstname, lastname, email, course1, role1, course2, role2, ...). Cada fila ya
 * representa un docente, así que no requiere agrupación.
 */
export function parseComparableDocentesFromMoodleOutputRows(rawRows: Record<string, unknown>[]): ParsedComparableDocentes {
  const result: ComparableDocente[] = [];
  const seenUsernames = new Set<string>();
  const duplicateUsernames = new Set<string>();
  for (const raw of rawRows) {
    const username = String(raw.username ?? "").trim();
    if (!username) continue;
    if (seenUsernames.has(username)) duplicateUsernames.add(username);
    seenUsernames.add(username);
    const courses = new Map<string, string>();
    for (const [key, value] of Object.entries(raw)) {
      const match = OUTPUT_COURSE_COLUMN.exec(key);
      if (!match) continue;
      const course = normalizeCourseCodeForComparison(String(value ?? ""));
      if (!course) continue;
      const role = String(raw[`role${match[1]}`] ?? "").trim();
      courses.set(course, role);
    }
    result.push({
      username,
      firstname: String(raw.firstname ?? "").trim(),
      lastname: String(raw.lastname ?? "").trim(),
      email: String(raw.email ?? "").trim(),
      courses,
    });
  }
  return { docentes: result, duplicateUsernames: Array.from(duplicateUsernames) };
}
