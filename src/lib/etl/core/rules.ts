import type { EtlIssue } from "./types";

export type Rule<TInput> = (input: TInput) => EtlIssue | EtlIssue[] | null;

export function runRules<TInput>(input: TInput, rules: Rule<TInput>[]): EtlIssue[] {
  const issues: EtlIssue[] = [];
  for (const rule of rules) {
    const result = rule(input);
    if (!result) continue;
    if (Array.isArray(result)) issues.push(...result);
    else issues.push(result);
  }
  return issues;
}

export function hasErrors(issues: EtlIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
