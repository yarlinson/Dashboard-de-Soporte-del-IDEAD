import type { ColumnAliases } from "../core/headers";
import type { RoleMappingRule } from "./schema";

export const SIAU_DOCENTES_REQUIRED_COLUMNS = [
  "DOCUMENTO",
  "CORREO_INSTITUCIONAL",
  "DOCENTE",
  "VINCULACION",
  "CURSO",
  "ESTADO_CONTRATADO",
  "UNIDAD",
] as const;

/**
 * The subset of required columns the pipeline genuinely cannot run without, used to reject a file
 * whose headers weren't recognized. DOCUMENTO, ESTADO_CONTRATADO and UNIDAD are deliberately left
 * out: the username falls back to the email's local part when DOCUMENTO is absent,
 * ESTADO_CONTRATADO only breaks ties between conflicting roles for the same (docente, curso) pair,
 * and UNIDAD is informational (added to the export, never required to process a row) — earlier
 * SIAU exports omit these and must keep working.
 */
export const SIAU_DOCENTES_ESSENTIAL_COLUMNS = [
  "CORREO_INSTITUCIONAL",
  "DOCENTE",
  "VINCULACION",
  "CURSO",
] as const;

/**
 * Source headers accepted for each required column. Variants that differ only by accents or by
 * space-vs-underscore separators ("CORREO INSTITUCIONAL", "VINCULACIÓN") need no entry here —
 * `normalizeHeaderKey` already reduces them to the canonical name — so only genuinely different
 * wordings are listed: the "SIAU - Reporte Docente Cursos" export renamed CURSO to "CÓDIGO CURSO"
 * (alongside a separate "NOMBRE CURSO" column) and ESTADO_CONTRATADO to "ESTADO CONTRATO".
 */
export const SIAU_DOCENTES_COLUMN_ALIASES: ColumnAliases = {
  DOCUMENTO: [],
  CORREO_INSTITUCIONAL: [],
  DOCENTE: [],
  VINCULACION: [],
  CURSO: ["CÓDIGO CURSO"],
  ESTADO_CONTRATADO: ["ESTADO CONTRATO"],
  UNIDAD: [],
};

export const DEFAULT_ROLE_MAPPING: RoleMappingRule[] = [
  { vinculacion: "PLANTA-TC", role: "docenteoplanta" },
  { vinculacion: "OCASIONAL-TC", role: "docenteocasionaltc" },
  { vinculacion: "CATEDRÁTICO-HS", role: "docenteocatedratico" },
];

export const DEFAULT_GENERIC_PASSWORD = "campusvirtualunillanos";
