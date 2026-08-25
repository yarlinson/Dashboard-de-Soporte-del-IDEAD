import { z } from "zod";
import { RoleMappingRuleSchema, type RoleMappingRule } from "../docentes-siau/schema";
import { DEFAULT_ROLE_MAPPING } from "../docentes-siau/constants";

const NameMappingSchema = z.discriminatedUnion("nameMode", [
  z.object({
    nameMode: z.literal("separate"),
    firstnameColumn: z.string().min(1, "Selecciona la columna de nombres"),
    lastnameColumn: z.string().min(1, "Selecciona la columna de apellidos"),
  }),
  z.object({
    nameMode: z.literal("full"),
    fullNameColumn: z.string().min(1, "Selecciona la columna de nombre completo"),
  }),
]);

/** Case A: courses come from a source column. Case B: no course info in the source, so the
 * same fixed list of course codes is injected into every processed row. */
const CourseSourceSchema = z.discriminatedUnion("courseMode", [
  z.object({
    courseMode: z.literal("column"),
    coursesColumn: z.string().min(1, "Selecciona la columna de cursos"),
  }),
  z.object({
    courseMode: z.literal("manual"),
    manualCourseCodes: z.string().min(1, "Ingresa al menos un código de curso"),
  }),
]);

/** Case A: one Moodle role applied to every teacher in the import. Case B: a source column (e.g.
 * VINCULACIÓN) resolved to a Moodle role through an editable equivalence table. */
const RoleSourceSchema = z.discriminatedUnion("roleMode", [
  z.object({
    roleMode: z.literal("fixed"),
    fixedRole: z.string().min(1, "Ingresa el rol Moodle a asignar"),
  }),
  z.object({
    roleMode: z.literal("column"),
    roleColumn: z.string().min(1, "Selecciona la columna de vinculación/rol"),
    roleMapping: z.array(RoleMappingRuleSchema),
  }),
]);

export const ColumnMappingDocenteSchema = z.object({
  usernameColumn: z.string().min(1, "Selecciona la columna de documento/código"),
  emailColumn: z.string().min(1, "Selecciona la columna de correo"),
  name: NameMappingSchema,
  courseSource: CourseSourceSchema,
  roleSource: RoleSourceSchema,
});
export type ColumnMappingDocente = z.infer<typeof ColumnMappingDocenteSchema>;

export type NameMode = ColumnMappingDocente["name"]["nameMode"];
export type CourseMode = ColumnMappingDocente["courseSource"]["courseMode"];
export type RoleMode = ColumnMappingDocente["roleSource"]["roleMode"];

/** Flat, always-defined shape backing the mapping UI's controlled inputs — lets the form hold
 * values for every branch at once so switching modes doesn't discard input. */
export interface ColumnMappingDocenteDraft {
  usernameColumn: string;
  emailColumn: string;
  nameMode: NameMode;
  firstnameColumn: string;
  lastnameColumn: string;
  fullNameColumn: string;
  courseMode: CourseMode;
  coursesColumn: string;
  manualCourseCodes: string;
  roleMode: RoleMode;
  fixedRole: string;
  roleColumn: string;
  roleMapping: RoleMappingRule[];
}

export const defaultColumnMappingDocenteDraft: ColumnMappingDocenteDraft = {
  usernameColumn: "",
  emailColumn: "",
  nameMode: "separate",
  firstnameColumn: "",
  lastnameColumn: "",
  fullNameColumn: "",
  courseMode: "column",
  coursesColumn: "",
  manualCourseCodes: "",
  roleMode: "fixed",
  fixedRole: "docenteoplanta",
  roleColumn: "",
  roleMapping: DEFAULT_ROLE_MAPPING,
};

/** Converts a draft to a validated ColumnMappingDocente, or null while required fields are still missing. */
export function toColumnMappingDocente(draft: ColumnMappingDocenteDraft): ColumnMappingDocente | null {
  const candidate = {
    usernameColumn: draft.usernameColumn,
    emailColumn: draft.emailColumn,
    name:
      draft.nameMode === "full"
        ? { nameMode: "full" as const, fullNameColumn: draft.fullNameColumn }
        : { nameMode: "separate" as const, firstnameColumn: draft.firstnameColumn, lastnameColumn: draft.lastnameColumn },
    courseSource:
      draft.courseMode === "manual"
        ? { courseMode: "manual" as const, manualCourseCodes: draft.manualCourseCodes }
        : { courseMode: "column" as const, coursesColumn: draft.coursesColumn },
    roleSource:
      draft.roleMode === "column"
        ? { roleMode: "column" as const, roleColumn: draft.roleColumn, roleMapping: draft.roleMapping }
        : { roleMode: "fixed" as const, fixedRole: draft.fixedRole },
  };
  const result = ColumnMappingDocenteSchema.safeParse(candidate);
  return result.success ? result.data : null;
}
