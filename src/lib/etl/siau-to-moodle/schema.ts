import { z } from "zod";

export const SiauInputRowSchema = z.object({
  "N°": z.union([z.string(), z.number()]).optional(),
  PAGO_MATRICULA: z.union([z.string(), z.number()]).optional(),
  CÓDIGO_INSTITUCIONAL: z.union([z.string(), z.number()]).optional(),
  USUARIO: z.string().optional().default(""),
  NOMBRES: z.string().optional().default(""),
  APELLIDOS: z.string().optional().default(""),
  CORREO_INSTITUCIONAL: z.string().optional().default(""),
  SEXO: z.string().optional(),
  FACULTAD: z.string().optional(),
  PROGRAMA: z.string().optional(),
  TIPO: z.string().optional(),
  DISCAPACIDAD: z.string().optional(),
  GRUPO_POBLACIONAL: z.string().optional(),
  GRUPO_VICTIMA: z.string().optional(),
  COMUNIDAD: z.string().optional(),
  "GRUPO_ÉTNICO": z.string().optional(),
  CURSOS: z.string().optional().default(""),
});
export type SiauInputRow = z.infer<typeof SiauInputRowSchema>;

export const MoodleConfigSchema = z.object({
  genericPassword: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(64, "La contraseña es demasiado larga"),
  periodSuffix: z
    .string()
    .trim()
    .min(1, "Ingrese el sufijo de período (ej. /2026B)")
    .refine((v) => v.startsWith("/"), "El sufijo debe iniciar con '/' (ej. /2026B)"),
});
export type MoodleConfig = z.infer<typeof MoodleConfigSchema>;

export interface MoodleOutputRowBase {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
}
// course1, course2, ... are dynamic per row -> modeled as extra string keys
export type MoodleOutputRow = MoodleOutputRowBase & Record<string, string>;
