import { rowsToCsv } from "../core/csv";
import type { MoodleOutputRow } from "../siau-to-moodle/schema";
import type { StudentsDiffResult } from "./types";

function buildMoodleRow(
  username: string,
  firstname: string,
  lastname: string,
  email: string,
  password: string,
  courses: string[]
): MoodleOutputRow {
  const row: MoodleOutputRow = { username, password, firstname, lastname, email };
  courses.forEach((course, i) => {
    row[`course${i + 1}`] = course;
  });
  return row;
}

/** Novedades de adición, en el mismo formato de carga masiva de Moodle que usa el motor Estudiantes SIAU
 * → Moodle (`username,password,firstname,lastname,email,course1,...`): estudiantes nuevos con todos sus
 * cursos, y estudiantes existentes solo con los cursos que se les agregaron. */
export function buildAddedMoodleRows(diff: StudentsDiffResult, password: string): MoodleOutputRow[] {
  const rows: MoodleOutputRow[] = [];
  for (const student of diff.addedStudents) {
    rows.push(
      buildMoodleRow(student.username, student.firstname, student.lastname, student.email, password, Array.from(student.courses))
    );
  }
  for (const modified of diff.modifiedStudents) {
    if (modified.addedCourses.length === 0) continue;
    rows.push(
      buildMoodleRow(modified.username, modified.firstname, modified.lastname, modified.email, password, modified.addedCourses)
    );
  }
  return rows;
}

/** Estudiantes retirados (con todos sus cursos previos) y cursos quitados de estudiantes que se
 * mantienen, en el mismo formato de carga masiva de Moodle. */
export function buildRemovedMoodleRows(diff: StudentsDiffResult, password: string): MoodleOutputRow[] {
  const rows: MoodleOutputRow[] = [];
  for (const student of diff.removedStudents) {
    rows.push(
      buildMoodleRow(student.username, student.firstname, student.lastname, student.email, password, Array.from(student.courses))
    );
  }
  for (const modified of diff.modifiedStudents) {
    if (modified.removedCourses.length === 0) continue;
    rows.push(
      buildMoodleRow(modified.username, modified.firstname, modified.lastname, modified.email, password, modified.removedCourses)
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
