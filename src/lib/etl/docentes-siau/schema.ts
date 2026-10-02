import { z } from "zod";
import type { MoodleDocenteOutputRow } from "../core/moodle-docente";

export type { MoodleDocenteOutputRow };

export const SiauDocenteInputRowSchema = z.object({
  DOCUMENTO: z.union([z.string(), z.number()]).optional(),
  CORREO_INSTITUCIONAL: z.string().optional().default(""),
  DOCENTE: z.string().optional().default(""),
  VINCULACION: z.string().optional().default(""),
  CURSO: z.string().optional().default(""),
  ESTADO_CONTRATADO: z.string().optional().default(""),
  UNIDAD: z.string().optional().default(""),
});
export type SiauDocenteInputRow = z.infer<typeof SiauDocenteInputRowSchema>;

export const RoleMappingRuleSchema = z.object({
  vinculacion: z.string().trim().min(1, "La vinculación no puede estar vacía"),
  role: z.string().trim().min(1, "El rol de Moodle no puede estar vacío"),
});
export type RoleMappingRule = z.infer<typeof RoleMappingRuleSchema>;

export const DocenteConfigSchema = z
  .object({
    genericPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(64, "La contraseña es demasiado larga"),
    applyPeriodSuffix: z.boolean(),
    periodSuffix: z.string().trim(),
    roleMapping: z.array(RoleMappingRuleSchema),
  })
  .refine((v) => !v.applyPeriodSuffix || v.periodSuffix.startsWith("/"), {
    message: "Ingrese un sufijo válido que inicie con '/' (ej. /2026B)",
    path: ["periodSuffix"],
  });
export type DocenteConfig = z.infer<typeof DocenteConfigSchema>;
