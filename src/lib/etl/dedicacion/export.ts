import { formatDateTime } from "./compute";
import type { ParticipantDedication } from "./types";

export const DEDICACION_EXPORT_COLUMNS = [
  "Participante",
  "ID de usuario",
  "Correo",
  "Dedicación (h:mm)",
  "Dedicación (horas)",
  "Sesiones",
  "Promedio por sesión (min)",
  "Días con conexión",
  "Conexiones por día",
  "Último acceso",
] as const;

/** Filas de exportación (más dedicación primero). Valores numéricos reales para que Excel pueda sumar/ordenar. */
export function buildDedicacionExportRows(results: ParticipantDedication[]): Record<string, unknown>[] {
  return [...results]
    .sort((a, b) => b.total - a.total)
    .map((r) => {
      const totalMin = Math.round(r.total / 60000);
      return {
        Participante: r.name,
        "ID de usuario": r.id,
        Correo: r.email,
        "Dedicación (h:mm)": `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`,
        "Dedicación (horas)": Math.round((r.total / 3600000) * 100) / 100,
        Sesiones: r.sessionCount,
        "Promedio por sesión (min)": Math.round(r.avg / 60000),
        "Días con conexión": r.days,
        "Conexiones por día": Math.round(r.perDay * 100) / 100,
        "Último acceso": formatDateTime(r.last),
      };
    });
}
