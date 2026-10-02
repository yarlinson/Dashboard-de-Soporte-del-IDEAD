import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  buildHeaderAliasLookup,
  canonicalizeRowKeys,
  normalizeHeaderKey,
  type ColumnAliases,
} from "./headers";

export interface ReadTabularFileOptions {
  /** Column names expected in the header row, used to auto-detect it when a report has a leading title row. */
  expectedHeaders?: readonly string[];
  /** Source-header variants per canonical column (see core/headers.ts). Used both to recognize the
   * header row and to rename the parsed rows' keys to the canonical names, so a report whose
   * headers changed spelling between SIAU versions still parses. Defaults `expectedHeaders` to its
   * canonical names when those aren't given separately. */
  columnAliases?: ColumnAliases;
}

/** Row index (0-indexed, absolute from the sheet's top) where its populated range actually starts — `sheet_to_json({header:1})` returns rows relative to this, but the numeric `range` option it accepts elsewhere is an absolute sheet row. */
function getSheetStartRow(sheet: XLSX.WorkSheet): number {
  const ref = sheet["!ref"];
  return ref ? XLSX.utils.decode_range(ref).s.r : 0;
}

/** Scans the first few rows for the one that best matches `expectedHeaders`, to skip a leading title
 * row. Headers are compared through `normalizeHeaderKey` and `aliasLookup`, so a column counts as
 * matched even when the export spells it differently (accents, spaces vs underscores, aliases). */
function detectHeaderRow(
  sheet: XLSX.WorkSheet,
  expectedHeaders: readonly string[],
  aliasLookup?: Map<string, string>,
  maxScanRows = 10
): number {
  const startRow = getSheetStartRow(sheet);
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const resolve = (header: string): string => {
    const key = normalizeHeaderKey(header);
    return aliasLookup?.get(key) ?? key;
  };
  const normalizedExpected = expectedHeaders.map(resolve);
  let bestRow = 0;
  let bestScore = 0;
  for (let i = 0; i < Math.min(maxScanRows, grid.length); i++) {
    const cells = new Set(grid[i].map((c) => resolve(String(c))));
    const score = normalizedExpected.filter((h) => cells.has(h)).length;
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
    if (score === normalizedExpected.length) break;
  }
  return startRow + (bestScore > 0 ? bestRow : 0);
}

// Banner/label line, e.g. "PERIODO ACADÉMICO:  II PA 2026" — a title-block row, not a header.
const LABEL_LINE_PATTERN = /^[\p{L}0-9°ª\s.]{2,40}:\s*\S/u;
// A single cell joining several identity fields, e.g. "NOMBRE - CEDULA - correo@x.com" — metadata, not a header/data cell.
const COMPOUND_VALUE_PATTERN = /\s-\s.*\s-\s|@/;

/** A row is only considered for the header-row density scan if it doesn't look like a banner/label line or a row of compound "name - id - email" metadata cells. */
function isCandidateHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.filter((c) => c.length > 0);
  if (nonEmpty.length === 0) return false;
  if (nonEmpty.length <= 2 && nonEmpty.some((c) => LABEL_LINE_PATTERN.test(c))) return false;
  const compoundCount = nonEmpty.filter((c) => COMPOUND_VALUE_PATTERN.test(c)).length;
  return compoundCount / nonEmpty.length < 0.7;
}

/** Scans the first rows for the one that looks like a real header row (most non-empty cells among plausible candidates), to skip leading title/blank/metadata rows when there's no known expected-header list. */
function detectHeaderRowByDensity(sheet: XLSX.WorkSheet, maxScanRows = 30): number {
  const startRow = getSheetStartRow(sheet);
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const scanLimit = Math.min(maxScanRows, grid.length);
  const normalized = grid.slice(0, scanLimit).map((row) => row.map((c) => String(c).trim()));
  const counts = normalized.map((cells) =>
    isCandidateHeaderRow(cells) ? cells.filter((c) => c.length > 0).length : -1
  );
  const maxCount = Math.max(0, ...counts);
  if (maxCount <= 0) return startRow;
  const threshold = Math.max(2, maxCount * 0.7);
  const relIndex = counts.findIndex((count) => count >= threshold);
  return startRow + (relIndex === -1 ? 0 : relIndex);
}

const BLANK_ORIGIN_COLUMN = /^_\d+$/; // PapaParse's dedup suffix for an originally-blank header

/** The set of real, selectable column names from parsed rows — excludes blank headers and the placeholder/dedup names libraries generate for them (SheetJS's `__EMPTY*`, PapaParse's `_N`). */
export function extractColumnNames(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]).filter(
    (col) => col.trim().length > 0 && !col.startsWith("__EMPTY") && !BLANK_ORIGIN_COLUMN.test(col.trim())
  );
}

export async function readTabularFile(
  file: File,
  options?: ReadTabularFileOptions
): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const aliasLookup = options?.columnAliases ? buildHeaderAliasLookup(options.columnAliases) : undefined;
  const expectedHeaders =
    options?.expectedHeaders ?? (options?.columnAliases ? Object.keys(options.columnAliases) : undefined);
  const headerRow = expectedHeaders
    ? detectHeaderRow(sheet, expectedHeaders, aliasLookup)
    : detectHeaderRowByDensity(sheet);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", range: headerRow });
  return aliasLookup ? canonicalizeRowKeys(rows, aliasLookup) : rows;
}

export function rowsToCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  // Delimitador ';' porque es el que produce (y espera) el "CSV delimitado por comas" de
  // Windows/Excel en configuración regional es-CO — pese al nombre, usa el separador de lista
  // del sistema, no la coma — que es el formato que acepta Campus Virtual Unillanos (Moodle).
  return Papa.unparse(rows, { columns, delimiter: ";", newline: "\r\n" });
}

/** Parses text pasted from a spreadsheet or email table (tab- or comma-delimited), using the first line as headers. */
export function parsePastedTable(text: string): Record<string, unknown>[] {
  const { data } = Papa.parse<Record<string, unknown>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  return data;
}

/** Distinct, ordered, non-blank values of one column across the raw source rows — drives "sin mapear" hints in mapping UIs. */
export function extractDistinctColumnValues(rawRows: Record<string, unknown>[], column: string): string[] {
  const seen = new Set<string>();
  for (const raw of rawRows) {
    const value = String(raw[column] ?? "").trim();
    if (value && value !== "-") seen.add(value);
  }
  return Array.from(seen);
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Windows-1252 code points 0x80-0x9F that differ from ISO-8859-1 (which leaves that range as C1
// controls); everything else (0x00-0x7F ASCII, 0xA0-0xFF Latin-1 Supplement incl. áéíóúñÁÉÍÓÚÑ) is
// byte-identical to its code point, so only these 27 need an explicit lookup.
const WINDOWS_1252_HIGH_RANGE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

/** Encodes text as Windows-1252 (ANSI) bytes — the encoding Windows/Excel use for "CSV (comma
 * delimited)" files in es-CO locale, and what Campus Virtual Unillanos (Moodle) expects. Falls
 * back to '?' for the rare code point with no Windows-1252 representation. */
function encodeWindows1252(text: string): Uint8Array<ArrayBuffer> {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0x3f;
    if (code <= 0x7f || (code >= 0xa0 && code <= 0xff)) {
      bytes.push(code);
    } else {
      bytes.push(WINDOWS_1252_HIGH_RANGE[code] ?? 0x3f);
    }
  }
  return new Uint8Array(bytes);
}

export function downloadCsv(filename: string, csvContent: string): void {
  // Sin BOM y en ANSI/Windows-1252 (no UTF-8): así es como Windows/Excel generan el "CSV
  // delimitado por comas" en es-CO, y es lo que Campus Virtual Unillanos (Moodle) acepta — un BOM
  // UTF-8 hace que Moodle no reconozca el encabezado de la primera columna (ej. "username").
  downloadBlob(filename, new Blob([encodeWindows1252(csvContent)], { type: "text/csv;charset=windows-1252;" }));
}

export function downloadXlsx(filename: string, rows: Record<string, unknown>[], columns?: string[]): void {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadBlob(
    filename,
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
}
