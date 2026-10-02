import type { EtlIssue } from "./types";

export interface TeacherGroup {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  /** Academic unit (SIAU's UNIDAD column), taken from this docente's first-encountered source row — informational only, not used for grouping or role resolution. Empty when the source has no UNIDAD column. */
  unidad: string;
  /** course -> candidate roles in encounter order; [0] is the default winner unless overridden. */
  courseRoles: Map<string, string[]>;
  issues: EtlIssue[];
}

export interface TeacherSourceRow {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  course: string;
  /** Academic unit (SIAU's UNIDAD column); omitted by callers whose source has no such column, in which case the group's `unidad` stays "". */
  unidad?: string;
  /** null when the row's role couldn't be resolved — the course is skipped and `unresolvedRoleIssue` (if present) is recorded. */
  role: string | null;
  unresolvedRoleIssue?: EtlIssue;
}

export interface GroupedTeachers {
  groups: Map<string, TeacherGroup>;
  /** Usernames in first-encounter order. */
  order: string[];
}

/** Groups source rows by docente (username), keeping every distinct candidate role per (docente, curso)
 * pair instead of silently discarding conflicting ones — the first candidate is the default winner,
 * but callers can let the user pick a different one via `resolveGroupRole`. */
export function groupTeacherRows(rows: TeacherSourceRow[]): GroupedTeachers {
  const groups = new Map<string, TeacherGroup>();
  const order: string[] = [];

  for (const row of rows) {
    let group = groups.get(row.username);
    if (!group) {
      group = {
        username: row.username,
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        unidad: row.unidad ?? "",
        courseRoles: new Map(),
        issues: [],
      };
      groups.set(row.username, group);
      order.push(row.username);
    }

    if (row.role === null) {
      if (row.unresolvedRoleIssue) group.issues.push(row.unresolvedRoleIssue);
      continue;
    }

    const existing = group.courseRoles.get(row.course);
    if (!existing) {
      group.courseRoles.set(row.course, [row.role]);
    } else if (!existing.includes(row.role)) {
      existing.push(row.role);
      group.issues.push({
        field: "vinculacion",
        code: "CONFLICTING_ROLE",
        severity: "warning",
        message: `El curso ${row.course} tiene vinculaciones distintas para este docente (${existing.join(", ")}); se usó el rol "${existing[0]}" salvo que se seleccione otro manualmente.`,
      });
    }
  }

  return { groups, order };
}

export interface RoleConflict {
  course: string;
  candidates: string[];
}

export function computeRoleConflicts(group: TeacherGroup): RoleConflict[] {
  return [...group.courseRoles.entries()]
    .filter(([, candidates]) => candidates.length > 1)
    .map(([course, candidates]) => ({ course, candidates }));
}

export function overrideKey(username: string, course: string): string {
  return `${username}::${course}`;
}

/** Rows whose `estadoOf(row) === "CONTRATADO"` are moved ahead of every other row, via a stable sort
 * (rows within the same priority tier keep their original relative order). Used before grouping so
 * that "first-encountered candidate wins" (see `resolveGroupRole`) effectively means "CONTRATADO wins
 * over BORRADOR" when the same (docente, curso) pair has conflicting rows. */
export function sortByContractPriority<T>(rows: T[], estadoOf: (row: T) => string): T[] {
  const priority = (row: T) => (estadoOf(row) === "CONTRATADO" ? 0 : 1);
  return [...rows].sort((a, b) => priority(a) - priority(b));
}

/** Resolves a single role for a (docente, curso) pair: the user's manual override if it's still a
 * valid candidate, otherwise the first-encountered candidate. */
export function resolveGroupRole(
  candidates: string[],
  username: string,
  course: string,
  overrides: Record<string, string>
): string {
  const chosen = overrides[overrideKey(username, course)];
  return chosen && candidates.includes(chosen) ? chosen : candidates[0];
}
