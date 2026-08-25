import type { Rule } from "../core/rules";
import { MAX_COURSES_WARNING_THRESHOLD } from "./constants";

export interface SiauNormalizedRow {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  courses: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requiredFieldsRule: Rule<SiauNormalizedRow> = (row) => {
  const missing: string[] = [];
  if (!row.username) missing.push("CÓDIGO_INSTITUCIONAL");
  if (!row.firstname) missing.push("NOMBRES");
  if (!row.lastname) missing.push("APELLIDOS");
  if (!row.email) missing.push("CORREO_INSTITUCIONAL");
  if (missing.length === 0) return null;
  return {
    code: "MISSING_REQUIRED_FIELD",
    severity: "error",
    message: `Faltan campos obligatorios: ${missing.join(", ")}`,
  };
};

const validEmailRule: Rule<SiauNormalizedRow> = (row) => {
  if (!row.email || EMAIL_REGEX.test(row.email)) return null;
  return { field: "email", code: "INVALID_EMAIL", severity: "error", message: `Correo inválido: "${row.email}"` };
};

const atLeastOneCourseRule: Rule<SiauNormalizedRow> = (row) => {
  if (row.courses.length > 0) return null;
  return {
    field: "courses",
    code: "NO_COURSES",
    severity: "error",
    message: "La fila no tiene cursos asociados en CURSOS.",
  };
};

const manyCoursesWarningRule: Rule<SiauNormalizedRow> = (row) => {
  if (row.courses.length <= MAX_COURSES_WARNING_THRESHOLD) return null;
  return {
    field: "courses",
    code: "MANY_COURSES",
    severity: "warning",
    message: `La fila tiene ${row.courses.length} cursos; verifique que sea correcto.`,
  };
};

export const siauToMoodleRules: Rule<SiauNormalizedRow>[] = [
  requiredFieldsRule,
  validEmailRule,
  atLeastOneCourseRule,
  manyCoursesWarningRule,
];
