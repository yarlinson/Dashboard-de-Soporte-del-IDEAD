/** A docente resolved to a comparable shape — one row per course assignment, independent of which
 * source format (reporte SIAU crudo o salida Moodle procesada) it came from. */
export interface ComparableDocente {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  /** código de curso -> rol/vinculación */
  courses: Map<string, string>;
}

export interface CourseChange {
  course: string;
  role: string;
}

export interface CourseRoleChange {
  course: string;
  fromRole: string;
  toRole: string;
}

export interface ModifiedDocente {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  addedCourses: CourseChange[];
  removedCourses: CourseChange[];
  /** Mismo curso presente en ambos archivos, pero con un rol/vinculación distinto. */
  roleChanges: CourseRoleChange[];
}

export interface DocentesDiffResult {
  /** Docentes presentes solo en el archivo actual (Período B). */
  addedTeachers: ComparableDocente[];
  /** Docentes presentes solo en el archivo anterior (Período A) — dados de baja. */
  removedTeachers: ComparableDocente[];
  /** Docentes presentes en ambos archivos con cambios de curso y/o rol. */
  modifiedTeachers: ModifiedDocente[];
  /** Docentes presentes en ambos archivos sin ningún cambio. */
  unchangedCount: number;
}
