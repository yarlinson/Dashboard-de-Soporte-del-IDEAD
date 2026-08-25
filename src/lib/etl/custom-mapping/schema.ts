import { z } from "zod";

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

export const ColumnMappingSchema = z.object({
  usernameColumn: z.string().min(1, "Selecciona la columna de documento/código"),
  emailColumn: z.string().min(1, "Selecciona la columna de correo"),
  name: NameMappingSchema,
  courseSource: CourseSourceSchema,
});
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

export type NameMode = ColumnMapping["name"]["nameMode"];
export type CourseMode = ColumnMapping["courseSource"]["courseMode"];

/** Flat, always-defined shape backing the mapping UI's controlled inputs — lets the form hold
 * values for both discriminated branches at once so switching modes doesn't discard input. */
export interface ColumnMappingDraft {
  usernameColumn: string;
  emailColumn: string;
  nameMode: NameMode;
  firstnameColumn: string;
  lastnameColumn: string;
  fullNameColumn: string;
  courseMode: CourseMode;
  coursesColumn: string;
  manualCourseCodes: string;
}

export const defaultColumnMappingDraft: ColumnMappingDraft = {
  usernameColumn: "",
  emailColumn: "",
  nameMode: "separate",
  firstnameColumn: "",
  lastnameColumn: "",
  fullNameColumn: "",
  courseMode: "column",
  coursesColumn: "",
  manualCourseCodes: "",
};

/** Converts a draft to a validated ColumnMapping, or null while required fields are still missing. */
export function toColumnMapping(draft: ColumnMappingDraft): ColumnMapping | null {
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
  };
  const result = ColumnMappingSchema.safeParse(candidate);
  return result.success ? result.data : null;
}
