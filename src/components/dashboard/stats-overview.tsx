"use client";

import { CalendarClock, FileStack, Repeat } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 * KPIs reales del home, alimentados por el historial local de corridas
 * (`useEtlHistory`) en vez de los "0" fijos que tenía antes. Todo el cálculo
 * ocurre en el cliente porque el historial vive en `localStorage`.
 */
export function StatsOverview() {
  const { history, isLoaded } = useEtlHistory();

  const today = new Date().toDateString();
  const runsToday = history.filter((run) => new Date(run.timestamp).toDateString() === today).length;
  const totalRowsProcessed = history.reduce((sum, run) => sum + run.totalRows, 0);
  const lastRun = history[0];

  const stats = [
    {
      id: "transformaciones-hoy",
      label: "Transformaciones hoy",
      value: String(runsToday),
      hint: "Ejecuciones completadas hoy",
      icon: Repeat,
    },
    {
      id: "registros-procesados",
      label: "Registros procesados",
      value: totalRowsProcessed.toLocaleString("es-CO"),
      hint: "Filas transformadas en total",
      icon: FileStack,
    },
    {
      id: "ultima-transformacion",
      label: "Última transformación",
      value: lastRun ? formatRelativeTime(lastRun.timestamp) : "—",
      hint: lastRun ? lastRun.caseLabel : "Aún no hay registros",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-muted-foreground text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="text-unillanos-red size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoaded ? (
              <>
                <p className="text-foreground text-3xl font-bold">{stat.value}</p>
                <p className="text-muted-foreground mt-1 text-xs">{stat.hint}</p>
              </>
            ) : (
              <>
                <Skeleton className="h-9 w-16" />
                <Skeleton className="mt-2 h-3 w-32" />
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
