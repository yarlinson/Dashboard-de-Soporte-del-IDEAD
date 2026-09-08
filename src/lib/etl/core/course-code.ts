/** Strips the trailing period-suffix segment (e.g. "/2026B") that `buildOutputRow` /
 * `buildDocenteOutputRow` append when generating a Moodle bulk-upload file (see `core/moodle.ts`,
 * `core/moodle-docente.ts`, `siau-to-moodle/transform.ts`), then trims and uppercases what
 * remains. Course codes in this project never legitimately contain a "/" outside of that suffix,
 * so this is a safe general normalization for treating two course codes as "the same course"
 * regardless of which file format (raw SIAU export vs. already-processed Moodle output) they came
 * from — used only for comparison purposes (docentes-comparador / estudiantes-comparador), never
 * for the actual Moodle bulk-upload output.
 */
export function normalizeCourseCodeForComparison(rawCourse: string): string {
  return rawCourse.split("/")[0]!.trim().toUpperCase();
}
