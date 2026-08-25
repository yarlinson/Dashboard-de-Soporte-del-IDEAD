import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EtlIssue } from "@/lib/etl/core/types";

function IssueList({ title, issues, className }: { title: string; issues: EtlIssue[]; className: string }) {
  if (issues.length === 0) return null;
  return (
    <div>
      <p className={className}>{title}</p>
      <ul className="mt-0.5 list-disc pl-4">
        {issues.map((issue, index) => (
          <li key={index}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function RowIssuesBadge({ issues }: { issues: EtlIssue[] }) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (errors.length === 0 && warnings.length === 0) {
    return <Badge variant="success">OK</Badge>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-wrap gap-1">
          {errors.length > 0 && (
            <Badge variant="destructive">
              {errors.length} error{errors.length > 1 ? "es" : ""}
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="warning">
              {warnings.length} aviso{warnings.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-left whitespace-normal">
        <div className="flex flex-col gap-2">
          <IssueList title={`Errores (${errors.length})`} issues={errors} className="font-semibold text-destructive" />
          <IssueList title={`Avisos (${warnings.length})`} issues={warnings} className="text-warning font-semibold" />
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
