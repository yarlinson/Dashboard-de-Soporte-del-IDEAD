import { rowsToCsv } from "../core/csv";
import type { MoodleConfig } from "../core/moodle";
import type { MoodleDocenteOutputRow } from "../core/moodle-docente";
import type { DocentesDiffResult } from "./types";

function buildMoodleRow(
  username: string,
  firstname: string,
  lastname: string,
  email: string,
  config: MoodleConfig,
  courses: [course: string, role: string][]
): MoodleDocenteOutputRow {
  const row: MoodleDocenteOutputRow = { username, password: config.genericPassword, firstname, lastname, email };
  courses.forEach(([course, role], i) => {
    row[`course${i + 1}`] = config.applyPeriodSuffix ? `${course}${config.periodSuffix}` : course;
    row[`role${i + 1}`] = role;
  });
  return row;
}

/** Novedades de adición, en el mismo formato de carga masiva de Moodle que usa el motor Docentes SIAU
 * (`username,password,firstname,lastname,email,course1,role1,...`): docentes nuevos con todos sus cursos,
 * y docentes existentes solo con los cursos que se les agregaron. Los códigos de curso comparados están
 * normalizados (sin sufijo de período, ver `core/course-code.ts`), así que `config.periodSuffix` se
 * reaplica aquí si `config.applyPeriodSuffix` está activo — igual que hace el motor Docentes SIAU → Moodle
 * al generar su propio archivo de salida. */
export function buildAddedMoodleRows(diff: DocentesDiffResult, config: MoodleConfig): MoodleDocenteOutputRow[] {
  const rows: MoodleDocenteOutputRow[] = [];
  for (const teacher of diff.addedTeachers) {
    rows.push(
      buildMoodleRow(teacher.username, teacher.firstname, teacher.lastname, teacher.email, config, Array.from(teacher.courses))
    );
  }
  for (const modified of diff.modifiedTeachers) {
    if (modified.addedCourses.length === 0) continue;
    rows.push(
      buildMoodleRow(
        modified.username,
        modified.firstname,
        modified.lastname,
        modified.email,
        config,
        modified.addedCourses.map((c) => [c.course, c.role])
      )
    );
  }
  return rows;
}

/** Docentes de baja (con todos sus cursos previos) y cursos retirados de docentes que se mantienen, en el
 * mismo formato de carga masiva de Moodle. Mismo reaplicado de `periodSuffix` que `buildAddedMoodleRows`. */
export function buildRemovedMoodleRows(diff: DocentesDiffResult, config: MoodleConfig): MoodleDocenteOutputRow[] {
  const rows: MoodleDocenteOutputRow[] = [];
  for (const teacher of diff.removedTeachers) {
    rows.push(
      buildMoodleRow(teacher.username, teacher.firstname, teacher.lastname, teacher.email, config, Array.from(teacher.courses))
    );
  }
  for (const modified of diff.modifiedTeachers) {
    if (modified.removedCourses.length === 0) continue;
    rows.push(
      buildMoodleRow(
        modified.username,
        modified.firstname,
        modified.lastname,
        modified.email,
        config,
        modified.removedCourses.map((c) => [c.course, c.role])
      )
    );
  }
  return rows;
}

/** Mismo cálculo de columnas dinámicas (`course1,role1,course2,role2,...`) que `buildDocenteOutputColumns`
 * en `core/moodle-docente.ts`, adaptado a filas ya construidas en vez de `DocenteRowResult[]`. */
export function buildMoodleExportColumns(rows: MoodleDocenteOutputRow[]): string[] {
  const maxCourses = rows.reduce((max, row) => {
    const courseCount = Object.keys(row).filter((k) => k.startsWith("course")).length;
    return Math.max(max, courseCount);
  }, 0);
  const courseRoleColumns = Array.from({ length: maxCourses }, (_, i) => [`course${i + 1}`, `role${i + 1}`]).flat();
  return ["username", "password", "firstname", "lastname", "email", ...courseRoleColumns];
}

export function exportMoodleRowsToCsv(rows: MoodleDocenteOutputRow[]): string {
  return rowsToCsv(rows, buildMoodleExportColumns(rows));
}
