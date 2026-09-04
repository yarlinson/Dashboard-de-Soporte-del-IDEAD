import type { Rule } from "../core/rules";

export interface DocenteNormalizedRow {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  course: string;
  vinculacion: string;
  estadoContratado: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requiredFieldsRule: Rule<DocenteNormalizedRow> = (row) => {
  const missing: string[] = [];
  if (!row.username) missing.push("DOCUMENTO / CORREO_INSTITUCIONAL");
  if (!row.firstname && !row.lastname) missing.push("DOCENTE");
  if (!row.email) missing.push("CORREO_INSTITUCIONAL");
  if (missing.length === 0) return null;
  return {
    code: "MISSING_REQUIRED_FIELD",
    severity: "error",
    message: `Faltan campos obligatorios: ${missing.join(", ")}`,
  };
};

const validEmailRule: Rule<DocenteNormalizedRow> = (row) => {
  if (!row.email || EMAIL_REGEX.test(row.email)) return null;
  return { field: "email", code: "INVALID_EMAIL", severity: "error", message: `Correo inválido: "${row.email}"` };
};

const missingCourseRule: Rule<DocenteNormalizedRow> = (row) => {
  if (row.course) return null;
  return {
    field: "course",
    code: "MISSING_COURSE",
    severity: "error",
    message: "La fila no tiene un código de curso en CURSO.",
  };
};

export const siauDocentesRules: Rule<DocenteNormalizedRow>[] = [requiredFieldsRule, validEmailRule, missingCourseRule];
