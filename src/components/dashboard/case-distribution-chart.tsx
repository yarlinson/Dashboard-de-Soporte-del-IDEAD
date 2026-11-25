"use client";

import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useEtlHistory } from "@/hooks/use-etl-history";

/**
 * Filas procesadas por herramienta, agregadas del mismo historial local que alimenta `StatsOverview`.
 * Son barras de magnitud con la etiqueta encima de cada una (los nombres son largos para un eje lateral),
 * en un solo color: cada barra ya está nombrada, así que no necesita una paleta categórica.
 */
export function CaseDistributionChart() {
  const { history, isLoaded } = useEtlHistory();

  const data = useMemo(() => {
    const totals = new Map<string, { caseLabel: string; rows: number }>();
    for (const run of history) {
      const entry = totals.get(run.caseId) ?? { caseLabel: run.caseLabel, rows: 0 };
      entry.rows += run.totalRows;
      totals.set(run.caseId, entry);
    }
    return Array.from(totals.values()).sort((a, b) => b.rows - a.rows);
  }, [history]);

  if (!isLoaded) return <Skeleton className="h-28 w-full" />;

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm leading-relaxed">
        Cuando proceses un archivo, aquí verás cuántas filas ha transformado cada herramienta.
      </p>
    );
  }

  const max = data[0].rows;

  return (
    <ul className="flex flex-col gap-4">
      {data.map((entry) => (
        <li key={entry.caseLabel} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-foreground min-w-0 truncate">{entry.caseLabel}</span>
            <span className="text-muted-foreground shrink-0">{entry.rows.toLocaleString("es-CO")}</span>
          </div>
          <div className="bg-muted h-2 rounded-sm" role="img" aria-label={`${entry.rows} filas`}>
            <div className="bg-primary h-full rounded-sm" style={{ width: `${Math.max((entry.rows / max) * 100, 3)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
