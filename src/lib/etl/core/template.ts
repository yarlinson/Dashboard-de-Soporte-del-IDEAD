import { downloadCsv, downloadXlsx, rowsToCsv } from "./csv";

/**
 * Genera una fila de plantilla vacía (una celda por columna) para que el
 * archivo descargado tenga tanto el encabezado esperado como un ejemplo de
 * fila a rellenar — solo aplica a casos con columnas de origen fijas
 * (SIAU → Moodle, Docentes SIAU → Moodle); los casos de mapeo flexible no
 * tienen un conjunto de columnas fijo, así que no exponen esta acción.
 */
function buildTemplateRow(columns: readonly string[]): Record<string, string> {
  return Object.fromEntries(columns.map((column) => [column, ""]));
}

export function downloadCsvTemplate(filename: string, columns: readonly string[]): void {
  downloadCsv(filename, rowsToCsv([buildTemplateRow(columns)], [...columns]));
}

export function downloadXlsxTemplate(filename: string, columns: readonly string[]): void {
  downloadXlsx(filename, [buildTemplateRow(columns)], [...columns]);
}
