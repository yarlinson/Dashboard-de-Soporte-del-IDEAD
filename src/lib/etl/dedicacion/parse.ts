import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { LogEvent, ParsedLogs } from "./types";

const MONTHS: Record<string, number> = {
  ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3, may: 4, jun: 5, jul: 6,
  ago: 7, aug: 7, sep: 8, set: 8, oct: 9, out: 9, nov: 10, dic: 11, dec: 11,
};

/** Minúsculas, sin tildes, "a. m." → "am", sin " de " y con espacios colapsados. */
export function normText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b([ap])\.?\s?m\.?/g, "$1m")
    .replace(/\s+de\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalización liviana para fechas (sin NFD: los 3 primeros caracteres de los meses no llevan tilde). */
function normDate(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b([ap])\.?\s?m\.?/g, "$1m")
    .replace(/\s+de\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const RE_ISO = /(\d{4})-(\d{2})-(\d{2})[ t](\d{1,2}):(\d{2})(?::(\d{2}))?/;
const RE_NUM = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/;
const RE_TXT = /(\d{1,2})\s+([a-z]{3,})\.?,?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/;

function to24h(hour: number, meridiem?: string): number {
  if (meridiem === "pm" && hour < 12) return hour + 12;
  if (meridiem === "am" && hour === 12) return 0;
  return hour;
}

type DateOrder = "dmy" | "mdy";

/** Para fechas numéricas ambiguas (13/10 vs 10/13) decide día-mes o mes-día según los valores del archivo. */
function detectDateOrder(values: unknown[]): DateOrder {
  let dmy = 0;
  let mdy = 0;
  for (const v of values.slice(0, 3000)) {
    if (v instanceof Date || typeof v === "number") continue;
    const m = normDate(v).match(RE_NUM);
    if (!m) continue;
    if (+m[1] > 12) dmy++;
    else if (+m[2] > 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}

function parseDate(value: unknown, order: DateOrder): number | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "number") {
    // Serial de Excel → hora local
    return Math.round((value - 25569) * 86400000 + new Date().getTimezoneOffset() * 60000);
  }
  if (value == null || value === "") return null;
  const s = normDate(value);
  let m = s.match(RE_ISO);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)).getTime();
  m = s.match(RE_TXT);
  if (m) {
    const month = MONTHS[m[2].slice(0, 3)];
    if (month === undefined) return null;
    return new Date(+m[3], month, +m[1], to24h(+m[4], m[7]), +m[5], +(m[6] ?? 0)).getTime();
  }
  m = s.match(RE_NUM);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    const day = order === "mdy" ? +m[2] : +m[1];
    const month = order === "mdy" ? +m[1] : +m[2];
    return new Date(year, month - 1, day, to24h(+m[4], m[7]), +m[5], +(m[6] ?? 0)).getTime();
  }
  return null;
}

const COLS = {
  time: ["hora", "time", "fecha", "fecha y hora", "date"],
  user: ["nombre completo del usuario", "user full name", "nombre completo", "usuario", "full name", "user"],
  ip: ["direccion ip", "ip address", "ip"],
  email: [
    "direccion de correo", "direccion de correo electronico", "direccion email", "direccion de email",
    "correo electronico", "correo", "email address", "email", "e-mail",
  ],
  uid: ["id de usuario", "id del usuario", "id usuario", "user id", "userid", "user_id"],
  desc: ["descripcion", "description"],
} as const;

const RE_UID = /(?:user|usuario)\s+(?:with|con)\s+(?:el\s+)?id\s+'?(\d+)'?/i;

function findCol(headers: unknown[], names: readonly string[]): number {
  const keys = headers.map((h) => normText(String(h ?? "").replace(/^﻿/, "")));
  for (const name of names) {
    const idx = keys.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Convierte la tabla cruda (filas de celdas) del informe de Registros en eventos tipados. */
export function parseLogTable(table: unknown[][]): ParsedLogs {
  let headerRow = -1;
  let cols: Record<keyof typeof COLS, number> | null = null;
  for (let r = 0; r < Math.min(10, table.length); r++) {
    const row = table[r] ?? [];
    const t = findCol(row, COLS.time);
    const u = findCol(row, COLS.user);
    if (t >= 0 && u >= 0) {
      headerRow = r;
      cols = {
        time: t,
        user: u,
        ip: findCol(row, COLS.ip),
        email: findCol(row, COLS.email),
        uid: findCol(row, COLS.uid),
        desc: findCol(row, COLS.desc),
      };
      break;
    }
  }
  if (!cols) {
    throw new Error(
      "No encontré las columnas “Hora” y “Nombre completo del usuario”. Verifica que el archivo sea la descarga del informe de Registros de Moodle."
    );
  }

  const body = table.slice(headerRow + 1);
  const order = detectDateOrder(body.map((row) => row?.[cols.time]));
  const rows: LogEvent[] = [];
  let badDates = 0;
  let withEmail = 0;
  let withId = 0;

  for (const row of body) {
    if (!row || row.length === 0) continue;
    const name = String(row[cols.user] ?? "").trim();
    if (!name || name === "-") continue;
    const t = parseDate(row[cols.time], order);
    if (t == null) {
      badDates++;
      continue;
    }
    let email = cols.email >= 0 ? String(row[cols.email] ?? "").trim() : "";
    if (email === "-") email = "";
    let uid = cols.uid >= 0 ? String(row[cols.uid] ?? "").trim() : "";
    if (!/^\d+$/.test(uid)) uid = "";
    if (!uid && cols.desc >= 0) {
      const m = String(row[cols.desc] ?? "").match(RE_UID);
      if (m) uid = m[1];
    }
    if (email) withEmail++;
    if (uid) withId++;
    rows.push({ t, name, email, uid, ip: cols.ip >= 0 ? String(row[cols.ip] ?? "") : "" });
  }

  // Se ordena una sola vez: así el cálculo no reordena cada vez que cambia un parámetro.
  rows.sort((a, b) => a.t - b.t);
  return { rows, badDates, hasEmail: withEmail > 0, hasId: withId > 0 };
}

/** Lee un .csv/.txt (PapaParse) o Excel/ODS (SheetJS) como matriz de celdas, conservando fechas reales de Excel. */
export async function readLogFile(file: File): Promise<unknown[][]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "csv" || ext === "txt") {
    const text = await file.text();
    return Papa.parse<unknown[]>(text, { skipEmptyLines: true }).data;
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
}
