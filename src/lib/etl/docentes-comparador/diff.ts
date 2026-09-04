import type { ComparableDocente, DocentesDiffResult, ModifiedDocente } from "./types";

/**
 * Pure diff engine: compares two arrays of docentes (typically the same SIAU report pulled at two
 * different points in time) and reports what changed — docentes nuevos/dados de baja, y para los
 * docentes presentes en ambos, sus cursos agregados/quitados y cambios de rol por curso.
 */
export function diffDocentes(previous: ComparableDocente[], current: ComparableDocente[]): DocentesDiffResult {
  const previousByUsername = new Map(previous.map((d) => [d.username, d]));
  const currentByUsername = new Map(current.map((d) => [d.username, d]));

  const addedTeachers = current.filter((d) => !previousByUsername.has(d.username));
  const removedTeachers = previous.filter((d) => !currentByUsername.has(d.username));

  const modifiedTeachers: ModifiedDocente[] = [];
  let unchangedCount = 0;

  for (const [username, currentDocente] of currentByUsername) {
    const previousDocente = previousByUsername.get(username);
    if (!previousDocente) continue; // ya está en addedTeachers

    const addedCourses: ModifiedDocente["addedCourses"] = [];
    const removedCourses: ModifiedDocente["removedCourses"] = [];
    const roleChanges: ModifiedDocente["roleChanges"] = [];

    for (const [course, role] of currentDocente.courses) {
      const previousRole = previousDocente.courses.get(course);
      if (previousRole === undefined) addedCourses.push({ course, role });
      else if (previousRole !== role) roleChanges.push({ course, fromRole: previousRole, toRole: role });
    }
    for (const [course, role] of previousDocente.courses) {
      if (!currentDocente.courses.has(course)) removedCourses.push({ course, role });
    }

    if (addedCourses.length === 0 && removedCourses.length === 0 && roleChanges.length === 0) {
      unchangedCount += 1;
      continue;
    }

    modifiedTeachers.push({
      username,
      firstname: currentDocente.firstname,
      lastname: currentDocente.lastname,
      email: currentDocente.email,
      addedCourses,
      removedCourses,
      roleChanges,
    });
  }

  return { addedTeachers, removedTeachers, modifiedTeachers, unchangedCount };
}
