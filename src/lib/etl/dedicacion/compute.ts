import { normText } from "./parse";
import type {
  DedicationParams,
  DedicationSession,
  LogEvent,
  ParticipantDedication,
} from "./types";

const MIN_MS = 60000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDay(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Rango [min, max] de fechas (yyyy-mm-dd) cubierto por los registros. */
export function logDateRange(rows: LogEvent[]): { from: string; to: string } | null {
  if (rows.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    if (r.t < min) min = r.t;
    if (r.t > max) max = r.t;
  }
  return { from: isoDay(min), to: isoDay(max) };
}

/**
 * Método del bloque Course Dedication: los clics de cada participante se ordenan por hora y se
 * agrupan en sesiones mientras el intervalo entre clics no supere `maxGapMin`. La duración de una
 * sesión va del primer al último clic; las sesiones menores a `minSessionMin` no cuentan.
 */
export function computeDedication(rows: LogEvent[], params: DedicationParams): ParticipantDedication[] {
  const limit = Math.max(1, params.maxGapMin || 60) * MIN_MS;
  const ignore = Math.max(0, params.minSessionMin || 0) * MIN_MS;
  const from = params.from ? new Date(`${params.from}T00:00:00`).getTime() : -Infinity;
  const to = params.to ? new Date(`${params.to}T23:59:59`).getTime() : Infinity;
  const excluded = params.exclude.split(",").map(normText).filter(Boolean);

  const byUser = new Map<string, LogEvent[]>();
  for (const r of rows) {
    if (r.t < from || r.t > to) continue;
    const haystack = `${normText(r.name)} ${normText(r.email)}`;
    if (excluded.some((e) => haystack.includes(e))) continue;
    const key = r.uid ? `id:${r.uid}` : r.email ? `em:${r.email.toLowerCase()}` : `n:${r.name}`;
    const list = byUser.get(key);
    if (list) list.push(r);
    else byUser.set(key, [r]);
  }

  const results: ParticipantDedication[] = [];
  for (const [key, list] of byUser) {
    const events = list.sort((a, b) => a.t - b.t);
    let uid = "";
    let email = "";
    for (let j = events.length - 1; j >= 0; j--) {
      if (!uid && events[j].uid) uid = events[j].uid;
      if (!email && events[j].email) email = events[j].email;
    }

    const sessions: DedicationSession[] = [];
    let start = events[0];
    let prev = events[0];
    let clicks = 1;
    const close = () => {
      const dur = prev.t - start.t;
      if (dur >= ignore && dur > 0) sessions.push({ start: start.t, end: prev.t, dur, ip: start.ip, clicks });
    };
    for (let i = 1; i < events.length; i++) {
      if (events[i].t - prev.t > limit) {
        close();
        start = events[i];
        clicks = 0;
      }
      prev = events[i];
      clicks++;
    }
    close();

    const total = sessions.reduce((sum, s) => sum + s.dur, 0);
    const days = new Set(sessions.map((s) => isoDay(s.start))).size;
    results.push({
      key,
      name: events[events.length - 1].name,
      id: uid,
      email,
      total,
      sessionCount: sessions.length,
      avg: sessions.length ? total / sessions.length : 0,
      days,
      perDay: days ? sessions.length / days : 0,
      last: events[events.length - 1].t,
      clicks: events.length,
      sessions,
    });
  }
  return results;
}

/* ---------- Formato ---------- */

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / MIN_MS);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h} h ${pad(m)} min` : `${m} min`;
}

export function formatDateTime(t: number): string {
  const d = new Date(t);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(t: number): string {
  return formatDateTime(t).slice(0, 10);
}

export function formatTime(t: number): string {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDecimal(n: number): string {
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
