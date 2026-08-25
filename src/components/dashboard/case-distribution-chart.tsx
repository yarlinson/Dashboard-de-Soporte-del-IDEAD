"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEtlHistory } from "@/hooks/use-etl-history";

const CHART_COLORS = ["var(--chart-5)", "var(--chart-4)", "var(--chart-3)", "var(--chart-2)", "var(--chart-1)"];

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { caseLabel: string; rows: number };
  return (
    <div className="border-border bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{point.caseLabel}</p>
      <p className="text-muted-foreground">{point.rows.toLocaleString("es-CO")} filas procesadas</p>
    </div>
  );
}

/**
 * Distribución de filas procesadas por herramienta ETL, agregada del mismo
 * historial local que alimenta `StatsOverview`. Es magnitud (una sola
 * herramienta por barra, ya etiquetada en el eje) — por eso usa la rampa
 * roja secuencial de `--chart-1..5` en vez de colores categóricos, que
 * competirían con el rojo ya reservado para estados de error.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribución de filas procesadas</CardTitle>
        <CardDescription>Registros transformados por herramienta ETL, según el historial local.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isLoaded ? (
          <Skeleton className="h-56 w-full" />
        ) : data.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Aún no hay transformaciones registradas. Procesa un archivo en cualquier herramienta ETL para ver la
            distribución aquí.
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="caseLabel"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={150}
                />
                <Tooltip cursor={{ fill: "var(--accent)" }} content={(props) => <ChartTooltip {...props} />} />
                <Bar dataKey="rows" radius={[0, 6, 6, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={entry.caseLabel} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
