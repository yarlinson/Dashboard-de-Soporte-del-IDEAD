export type IssueSeverity = "error" | "warning";

export interface EtlIssue {
  field?: string;
  code: string;
  message: string;
  severity: IssueSeverity;
}

export interface EtlRowResult<TOutput> {
  /** 1-based, matches the row's position in the source file */
  rowIndex: number;
  /** null when the row has blocking errors */
  output: TOutput | null;
  issues: EtlIssue[];
}

export interface EtlTransformSummary {
  totalRows: number;
  validRows: number;
  rowsWithWarnings: number;
  rowsWithErrors: number;
}

export interface EtlTransformResult<TOutput> {
  rows: EtlRowResult<TOutput>[];
  summary: EtlTransformSummary;
}
