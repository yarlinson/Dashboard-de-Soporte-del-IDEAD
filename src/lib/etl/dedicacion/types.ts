/** Un clic (fila) del informe de Registros de Moodle. `t` es epoch en ms (hora local). */
export interface LogEvent {
  t: number;
  name: string;
  email: string;
  uid: string;
  ip: string;
}

export interface ParsedLogs {
  rows: LogEvent[];
  /** Filas con fecha no reconocida (omitidas). */
  badDates: number;
  hasEmail: boolean;
  hasId: boolean;
}

export interface DedicationParams {
  /** Tiempo máximo entre clics (min) para seguir en la misma sesión. */
  maxGapMin: number;
  /** Sesiones más cortas que esto (min) no cuentan. */
  minSessionMin: number;
  /** yyyy-mm-dd; vacío = sin límite. */
  from: string;
  to: string;
  /** Nombres/correos (separados por coma) a excluir. */
  exclude: string;
}

export interface DedicationSession {
  start: number;
  end: number;
  dur: number;
  ip: string;
  clicks: number;
}

export interface ParticipantDedication {
  key: string;
  name: string;
  id: string;
  email: string;
  /** Milisegundos. */
  total: number;
  sessionCount: number;
  avg: number;
  days: number;
  perDay: number;
  last: number;
  clicks: number;
  sessions: DedicationSession[];
}

export const DEFAULT_DEDICATION_PARAMS: DedicationParams = {
  maxGapMin: 60,
  minSessionMin: 1,
  from: "",
  to: "",
  exclude: "",
};
