import { rowsToCsv } from "../core/csv";
import type { MoodleConfig } from "../core/moodle";
import type { MoodleOutputRow } from "../siau-to-moodle/schema";
import type { StudentsDiffResult } from "./types";

function buildMoodleRow(
  username: string,
  firstname: string,
  lastname: string,
  email: string,
  config: MoodleConfig,
  courses: string[]
): MoodleOutputRow {
  const row: MoodleOutputRow = { username, password: config.genericPassword, firstname, lastname, email };
  courses.forEach((course, i) => {
    row[`course${i + 1}`] = config.applyPeriodSuffix ? `${course}${config.periodSuffix}` : course;
  });
  return row;
}

/** Novedades de adición, en el mismo formato de carga masiva de Moodle que usa el motor Estudiantes SIAU
 * → Moodle (`username,password,firstname,lastname,email,course1,...`): estudiantes nuevos con todos sus
 * cursos, y estudiantes existentes solo con los cursos que se les agregaron. Los códigos de curso
 * comparados están normalizados (sin sufijo de período, ver `core/course-code.ts`), así que
 * `config.periodSuffix` se reaplica aquí si `config.applyPeriodSuffix` está activo. */
export function buildAddedMoodleRows(diff: StudentsDiffResult, config: MoodleConfig): MoodleOutputRow[] {
  const rows: MoodleOutputRow[] = [];
  for (const student of diff.addedStudents) {
    rows.push(
      buildMoodleRow(student.username, student.firstname, student.lastname, student.email, config, Array.from(student.courses))
    );
  }
  for (const modified of diff.modifiedStudents) {
    if (modified.addedCourses.length === 0) continue;
    rows.push(
      buildMoodleRow(modified.username, modified.firstname, modified.lastname, modified.email, config, modified.addedCourses)
    );
  }
  return rows;
}

/** Estudiantes retirados (con todos sus cursos previos) y cursos quitados de estudiantes que se
 * mantienen, en el mismo formato de carga masiva de Moodle. Mismo reaplicado de `periodSuffix` que
 * `buildAddedMoodleRows`. */
export function buildRemovedMoodleRows(diff: StudentsDiffResult, config: MoodleConfig): MoodleOutputRow[] {
  const rows: MoodleOutputRow[] = [];
  for (const student of diff.removedStudents) {
    rows.push(
      buildMoodleRow(student.username, student.firstname, student.lastname, student.email, config, Array.from(student.courses))
    );
  }
  for (const modified of diff.modifiedStudents) {
    if (modified.removedCourses.length === 0) continue;
    rows.push(
      buildMoodleRow(modified.username, modified.firstname, modified.lastname, modified.email, config, modified.removedCourses)
    );
  }
  return rows;
}

/** Mismo cálculo de columnas dinámicas (`course1,course2,...`) que `buildMoodleOutputColumns` en
 * `siau-to-moodle/transform.ts`, adaptado a filas ya construidas en vez de `EtlRowResult<MoodleOutputRow>[]`. */
export function buildMoodleExportColumns(rows: MoodleOutputRow[]): string[] {
  const maxCourses = rows.reduce((max, row) => {
    const courseCount = Object.keys(row).filter((k) => k.startsWith("course")).length;
    return Math.max(max, courseCount);
  }, 0);
  return ["username", "password", "firstname", "lastname", "email", ...Array.from({ length: maxCourses }, (_, i) => `course${i + 1}`)];
}

export function exportMoodleRowsToCsv(rows: MoodleOutputRow[]): string {
  return rowsToCsv(rows, buildMoodleExportColumns(rows));
}
