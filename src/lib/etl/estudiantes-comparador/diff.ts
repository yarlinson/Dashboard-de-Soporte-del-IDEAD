import type { ComparableStudent, ModifiedStudent, StudentsDiffResult } from "./types";

/**
 * Pure diff engine: compares two arrays of estudiantes (typically the same SIAU report pulled at two
 * different points in time) and reports what changed — estudiantes nuevos/retirados, y para los
 * estudiantes presentes en ambos, sus cursos agregados/quitados.
 */
export function diffStudents(previous: ComparableStudent[], current: ComparableStudent[]): StudentsDiffResult {
  const previousByUsername = new Map(previous.map((s) => [s.username, s]));
  const currentByUsername = new Map(current.map((s) => [s.username, s]));

  const addedStudents = current.filter((s) => !previousByUsername.has(s.username));
  const removedStudents = previous.filter((s) => !currentByUsername.has(s.username));

  const modifiedStudents: ModifiedStudent[] = [];
  let unchangedCount = 0;

  for (const [username, currentStudent] of currentByUsername) {
    const previousStudent = previousByUsername.get(username);
    if (!previousStudent) continue; // ya está en addedStudents

    const addedCourses = Array.from(currentStudent.courses).filter((course) => !previousStudent.courses.has(course));
    const removedCourses = Array.from(previousStudent.courses).filter((course) => !currentStudent.courses.has(course));

    if (addedCourses.length === 0 && removedCourses.length === 0) {
      unchangedCount += 1;
      continue;
    }

    modifiedStudents.push({
      username,
      firstname: currentStudent.firstname,
      lastname: currentStudent.lastname,
      email: currentStudent.email,
      addedCourses,
      removedCourses,
    });
  }

  return { addedStudents, removedStudents, modifiedStudents, unchangedCount };
}
