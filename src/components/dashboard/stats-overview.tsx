"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useEtlHistory } from "@/hooks/use-etl-history";

function formatRelativeTime(iso: string): string {
  const diffMinutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  if (diffMinutes < 60) return rtf.format(-diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return rtf.format(-diffHours, "hour");
  return rtf.format(-Math.round(diffHours / 24), "day");
}

/**
 * Resumen del historial local de corridas (`useEtlHistory`), en filas simples dentro de la columna lateral
 * del inicio. Todo el cálculo ocurre en el cliente porque el historial vive en `localStorage`.
 */
export function StatsOverview() {
  const { history, isLoaded } = useEtlHistory();

  const today = new Date().toDateString();
  const runsToday = history.filter((run) => new Date(run.timestamp).toDateString() === today).length;
  const totalRowsProcessed = history.reduce((sum, run) => sum + run.totalRows, 0);
  const lastRun = history[0];

  const stats = [
    { id: "hoy", label: "Transformaciones hoy", value: String(runsToday) },
    { id: "registros", label: "Registros procesados", value: totalRowsProcessed.toLocaleString("es-CO") },
    {
      id: "ultima",
      label: lastRun ? `Última: ${lastRun.caseLabel}` : "Última transformación",
      value: lastRun ? formatRelativeTime(lastRun.timestamp) : "Sin registros",
    },
  ];

  return (
    <dl className="divide-border divide-y">
      {stats.map((stat) => (
        <div key={stat.id} className="flex items-baseline justify-between gap-4 py-3 first:pt-0">
          <dt className="text-muted-foreground min-w-0 text-sm leading-snug">{stat.label}</dt>
          <dd className="shrink-0">
            {isLoaded ? (
              <span className="type-display text-foreground text-2xl">{stat.value}</span>
            ) : (
              <Skeleton className="h-7 w-14" />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
