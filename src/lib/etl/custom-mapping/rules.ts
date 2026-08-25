import type { Rule } from "../core/rules";
import type { NormalizedMoodleRow } from "../core/moodle";

const MAX_COURSES_WARNING_THRESHOLD = 20;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requiredFieldsRule: Rule<NormalizedMoodleRow> = (row) => {
  const missing: string[] = [];
  if (!row.username) missing.push("Documento/código");
  if (!row.firstname) missing.push("Nombres");
  if (!row.lastname) missing.push("Apellidos");
  if (!row.email) missing.push("Correo");
  if (missing.length === 0) return null;
  return {
    code: "MISSING_REQUIRED_FIELD",
    severity: "error",
    message: `Faltan campos obligatorios: ${missing.join(", ")}`,
  };
};

const validEmailRule: Rule<NormalizedMoodleRow> = (row) => {
  if (!row.email || EMAIL_REGEX.test(row.email)) return null;
  return { field: "email", code: "INVALID_EMAIL", severity: "error", message: `Correo inválido: "${row.email}"` };
};

const atLeastOneCourseRule: Rule<NormalizedMoodleRow> = (row) => {
  if (row.courses.length > 0) return null;
  return {
    field: "courses",
    code: "NO_COURSES",
    severity: "error",
    message: "La fila no tiene cursos asociados.",
  };
};

const manyCoursesWarningRule: Rule<NormalizedMoodleRow> = (row) => {
  if (row.courses.length <= MAX_COURSES_WARNING_THRESHOLD) return null;
  return {
    field: "courses",
    code: "MANY_COURSES",
    severity: "warning",
    message: `La fila tiene ${row.courses.length} cursos; verifique que sea correcto.`,
  };
};

const incompleteNameSplitRule: Rule<NormalizedMoodleRow> = (row) => {
  if (row.firstname && row.lastname) return null;
  return {
    field: "firstname",
    code: "INCOMPLETE_NAME_SPLIT",
    severity: "warning",
    message: "Nombres o apellidos vacíos; si usaste 'nombre completo', revisa cómo quedó separado.",
  };
};

export const customMappingRules: Rule<NormalizedMoodleRow>[] = [
  requiredFieldsRule,
  validEmailRule,
  atLeastOneCourseRule,
  manyCoursesWarningRule,
  incompleteNameSplitRule,
];
