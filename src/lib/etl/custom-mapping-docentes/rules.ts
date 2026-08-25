import type { Rule } from "../core/rules";

export interface DocenteMappingNormalizedRow {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  courses: string[];
  /** Resolved once per source row (fixed role, or looked up from the role/vinculación column); null when unresolved. */
  role: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requiredFieldsRule: Rule<DocenteMappingNormalizedRow> = (row) => {
  const missing: string[] = [];
  if (!row.username) missing.push("Documento/código");
  if (!row.firstname && !row.lastname) missing.push("Nombre");
  if (!row.email) missing.push("Correo");
  if (missing.length === 0) return null;
  return {
    code: "MISSING_REQUIRED_FIELD",
    severity: "error",
    message: `Faltan campos obligatorios: ${missing.join(", ")}`,
  };
};

const validEmailRule: Rule<DocenteMappingNormalizedRow> = (row) => {
  if (!row.email || EMAIL_REGEX.test(row.email)) return null;
  return { field: "email", code: "INVALID_EMAIL", severity: "error", message: `Correo inválido: "${row.email}"` };
};

const atLeastOneCourseRule: Rule<DocenteMappingNormalizedRow> = (row) => {
  if (row.courses.length > 0) return null;
  return {
    field: "courses",
    code: "NO_COURSES",
    severity: "error",
    message: "La fila no tiene cursos asociados.",
  };
};

export const customMappingDocentesRules: Rule<DocenteMappingNormalizedRow>[] = [
  requiredFieldsRule,
  validEmailRule,
  atLeastOneCourseRule,
];
