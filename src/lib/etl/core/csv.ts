import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ReadTabularFileOptions {
  /** Column names expected in the header row, used to auto-detect it when a report has a leading title row. */
  expectedHeaders?: readonly string[];
}

/** Row index (0-indexed, absolute from the sheet's top) where its populated range actually starts — `sheet_to_json({header:1})` returns rows relative to this, but the numeric `range` option it accepts elsewhere is an absolute sheet row. */
function getSheetStartRow(sheet: XLSX.WorkSheet): number {
  const ref = sheet["!ref"];
  return ref ? XLSX.utils.decode_range(ref).s.r : 0;
}

/** Scans the first few rows for the one that best matches `expectedHeaders`, to skip a leading title row. */
function detectHeaderRow(sheet: XLSX.WorkSheet, expectedHeaders: readonly string[], maxScanRows = 10): number {
  const startRow = getSheetStartRow(sheet);
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const normalizedExpected = expectedHeaders.map((h) => h.trim().toUpperCase());
  let bestRow = 0;
  let bestScore = 0;
  for (let i = 0; i < Math.min(maxScanRows, grid.length); i++) {
    const cells = grid[i].map((c) => String(c).trim().toUpperCase());
    const score = normalizedExpected.filter((h) => cells.includes(h)).length;
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
  const headerRow = options?.expectedHeaders
    ? detectHeaderRow(sheet, options.expectedHeaders)
    : detectHeaderRowByDensity(sheet);
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", range: headerRow });
}

export function rowsToCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  return Papa.unparse(rows, { columns, newline: "\r\n" });
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

export function downloadCsv(filename: string, csvContent: string): void {
  // BOM prefix so Excel correctly detects UTF-8 (tildes/ñ in firstname/lastname)
  downloadBlob(filename, new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" }));
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
