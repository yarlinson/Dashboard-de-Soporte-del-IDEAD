import type { RoleMappingRule } from "./schema";

export const SIAU_DOCENTES_REQUIRED_COLUMNS = [
  "DOCUMENTO",
  "CORREO_INSTITUCIONAL",
  "DOCENTE",
  "VINCULACION",
  "CURSO",
] as const;

export const DEFAULT_ROLE_MAPPING: RoleMappingRule[] = [
  { vinculacion: "PLANTA-TC", role: "docenteoplanta" },
  { vinculacion: "OCASIONAL-TC", role: "docenteocasionaltc" },
  { vinculacion: "CATEDRÁTICO-HS", role: "docenteocatedratico" },
];

export const DEFAULT_GENERIC_PASSWORD = "campusvirtualunillanos";
