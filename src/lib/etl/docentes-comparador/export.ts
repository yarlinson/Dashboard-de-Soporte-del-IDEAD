import { rowsToCsv } from "../core/csv";
import type { MoodleDocenteOutputRow } from "../core/moodle-docente";
import type { DocentesDiffResult } from "./types";

function buildMoodleRow(
  username: string,
  firstname: string,
  lastname: string,
  email: string,
  password: string,
  courses: [course: string, role: string][]
): MoodleDocenteOutputRow {
  const row: MoodleDocenteOutputRow = { username, password, firstname, lastname, email };
  courses.forEach(([course, role], i) => {
    row[`course${i + 1}`] = course;
    row[`role${i + 1}`] = role;
  });
  return row;
}

/** Novedades de adición, en el mismo formato de carga masiva de Moodle que usa el motor Docentes SIAU
 * (`username,password,firstname,lastname,email,course1,role1,...`): docentes nuevos con todos sus cursos,
 * y docentes existentes solo con los cursos que se les agregaron. */
export function buildAddedMoodleRows(diff: DocentesDiffResult, password: string): MoodleDocenteOutputRow[] {
  const rows: MoodleDocenteOutputRow[] = [];
  for (const teacher of diff.addedTeachers) {
    rows.push(
      buildMoodleRow(teacher.username, teacher.firstname, teacher.lastname, teacher.email, password, Array.from(teacher.courses))
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
        password,
        modified.addedCourses.map((c) => [c.course, c.role])
      )
    );
  }
  return rows;
}

/** Docentes de baja (con todos sus cursos previos) y cursos retirados de docentes que se mantienen, en el
 * mismo formato de carga masiva de Moodle. */
export function buildRemovedMoodleRows(diff: DocentesDiffResult, password: string): MoodleDocenteOutputRow[] {
  const rows: MoodleDocenteOutputRow[] = [];
  for (const teacher of diff.removedTeachers) {
    rows.push(
      buildMoodleRow(teacher.username, teacher.firstname, teacher.lastname, teacher.email, password, Array.from(teacher.courses))
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
        password,
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
