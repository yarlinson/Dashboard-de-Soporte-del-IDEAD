import type { ColumnMappingDraft } from "./schema";

function normalizeHeaderText(s: string): string {
  return s
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // strip diacritics (tildes, etc.), same as normalizeUsername in moodle.ts
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 1; j < cols; j++) dist[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  return dist[rows - 1][cols - 1];
}

/** Similarity in [0, 1] between a raw column header and a known alias, after normalization. Short aliases only benefit from the containment bonus once they're long enough (>=4 chars) to avoid spurious substring matches (e.g. "id" inside "apellido"). */
function similarity(headerText: string, alias: string): number {
  const a = normalizeHeaderText(headerText);
  const b = normalizeHeaderText(alias);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length >= 4 && longer.includes(shorter)) return 0.6 + 0.3 * (shorter.length / longer.length);
  const distance = levenshteinDistance(a, b);
  return Math.max(0, 1 - distance / longer.length);
}

/** Known real-world header phrasings per target field, gathered from this codebase's SIAU flow and real sample exports. `REGISTRO`/bare `ID` are deliberately excluded from usernameColumn: they match plain row-sequence-number columns, which would auto-suggest a meaningless counter as the Moodle username. */
const FIELD_ALIASES = {
  usernameColumn: [
    "CÓDIGO",
    "CODIGO",
    "CÓDIGO_INSTITUCIONAL",
    "CODIGO_INSTITUCIONAL",
    "CÓDIGO INSTITUCIONAL",
    "IDENTIFICACIÓN",
    "IDENTIFICACION",
    "N° DOCUMENTO",
    "NUMERO DE DOCUMENTO",
    "DOCUMENTO",
    "CÉDULA",
    "CEDULA",
    "USUARIO",
  ],
  emailColumn: [
    "CORREO PERSONAL",
    "CORREO INSTITUCIONAL",
    "CORREO_INSTITUCIONAL",
    "CORREO ELECTRÓNICO",
    "CORREO ELECTRONICO",
    "CORREO",
    "EMAIL",
    "E-MAIL",
  ],
  firstnameColumn: ["NOMBRES", "PRIMER NOMBRE", "SEGUNDO NOMBRE"],
  lastnameColumn: ["APELLIDOS", "PRIMER APELLIDO", "SEGUNDO APELLIDO", "APELLIDO"],
  fullNameColumn: [
    "NOMBRE",
    "NOMBRE COMPLETO",
    "NOMBRE DE ESTUDIANTE",
    "NOMBRE Y APELLIDO",
    "NOMBRE Y APELLIDOS",
    "NOMBRES Y APELLIDOS",
    "ESTUDIANTE",
  ],
  coursesColumn: [
    "CURSOS",
    "CURSO",
    "ASIGNATURA",
    "ASIGNATURAS",
    "MATERIA",
    "MATERIAS",
    "MÓDULOS",
    "MODULOS",
    "CÓDIGO CURSO",
    "CODIGO CURSO",
  ],
} as const satisfies Record<string, readonly string[]>;

export interface FieldSuggestion {
  column: string;
  score: number;
}

export type MappingSuggestions = Partial<
  Record<
    "usernameColumn" | "emailColumn" | "firstnameColumn" | "lastnameColumn" | "fullNameColumn" | "coursesColumn",
    FieldSuggestion
  >
>;

const MIN_CONFIDENCE = 0.55;

function bestMatch(columns: string[], aliases: readonly string[]): FieldSuggestion | undefined {
  let best: FieldSuggestion | undefined;
  for (const column of columns) {
    for (const alias of aliases) {
      const score = similarity(column, alias);
      if (!best || score > best.score) best = { column, score };
    }
  }
  return best && best.score >= MIN_CONFIDENCE ? best : undefined;
}

/** Suggests, per target field, the source column whose header text best matches a known alias — never auto-applies anything, the caller decides how to use the suggestion. */
export function suggestColumnMapping(sourceColumns: string[]): MappingSuggestions {
  const suggestions: MappingSuggestions = {
    usernameColumn: bestMatch(sourceColumns, FIELD_ALIASES.usernameColumn),
    emailColumn: bestMatch(sourceColumns, FIELD_ALIASES.emailColumn),
    coursesColumn: bestMatch(sourceColumns, FIELD_ALIASES.coursesColumn),
  };

  // Decide the name *mode* first: a single ambiguous "NOMBRE" column must resolve to fullName,
  // not leak into a half-filled separate firstname/lastname pair.
  const firstname = bestMatch(sourceColumns, FIELD_ALIASES.firstnameColumn);
  const lastname = bestMatch(sourceColumns, FIELD_ALIASES.lastnameColumn);
  const fullName = bestMatch(sourceColumns, FIELD_ALIASES.fullNameColumn);
  if (firstname && lastname && firstname.column !== lastname.column) {
    suggestions.firstnameColumn = firstname;
    suggestions.lastnameColumn = lastname;
  } else if (fullName) {
    suggestions.fullNameColumn = fullName;
  } else {
    suggestions.firstnameColumn = firstname;
    suggestions.lastnameColumn = lastname;
  }

  return dedupeByColumn(suggestions);
}

/** Each field is matched independently, so two fields can end up pointing at the same column (e.g. a generic "CÓDIGO" column partially matching both usernameColumn and a "CÓDIGO CURSO" courses alias). Keeps only the higher-confidence field for a contested column and drops the rest back to unset, rather than silently reusing one source column for two different target fields. */
function dedupeByColumn(suggestions: MappingSuggestions): MappingSuggestions {
  const entries = Object.entries(suggestions) as [keyof MappingSuggestions, FieldSuggestion | undefined][];
  const winnerByColumn = new Map<string, { field: keyof MappingSuggestions; score: number }>();
  for (const [field, suggestion] of entries) {
    if (!suggestion) continue;
    const current = winnerByColumn.get(suggestion.column);
    if (!current || suggestion.score > current.score) {
      winnerByColumn.set(suggestion.column, { field, score: suggestion.score });
    }
  }
  const result: MappingSuggestions = {};
  for (const [field, suggestion] of entries) {
    if (suggestion && winnerByColumn.get(suggestion.column)?.field === field) {
      result[field] = suggestion;
    }
  }
  return result;
}

/** Applies suggestions on top of a base draft, filling only the fields that have a confident match. */
export function applySuggestions(suggestions: MappingSuggestions, base: ColumnMappingDraft): ColumnMappingDraft {
  return {
    ...base,
    usernameColumn: suggestions.usernameColumn?.column ?? base.usernameColumn,
    emailColumn: suggestions.emailColumn?.column ?? base.emailColumn,
    nameMode: suggestions.fullNameColumn ? "full" : base.nameMode,
    firstnameColumn: suggestions.firstnameColumn?.column ?? base.firstnameColumn,
    lastnameColumn: suggestions.lastnameColumn?.column ?? base.lastnameColumn,
    fullNameColumn: suggestions.fullNameColumn?.column ?? base.fullNameColumn,
    coursesColumn: suggestions.coursesColumn?.column ?? base.coursesColumn,
  };
}
