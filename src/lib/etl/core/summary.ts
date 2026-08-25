import type { EtlRowResult, EtlTransformSummary } from "./types";

export function computeTransformSummary<T>(rows: EtlRowResult<T>[]): EtlTransformSummary {
  return {
    totalRows: rows.length,
    validRows: rows.filter((r) => r.output !== null).length,
    rowsWithWarnings: rows.filter((r) => r.issues.some((i) => i.severity === "warning")).length,
    rowsWithErrors: rows.filter((r) => r.issues.some((i) => i.severity === "error")).length,
  };
}
