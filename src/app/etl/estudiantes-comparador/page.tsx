import type { Metadata } from "next";
import { EstudiantesComparadorWorkflow } from "@/components/etl/estudiantes-comparador/estudiantes-comparador-workflow";

export const metadata: Metadata = {
  title: "Comparador de Estudiantes | Dashboard ETL",
};

export default function EstudiantesComparadorPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Comparador de Reportes de Estudiantes</h1>
        <p className="text-muted-foreground text-sm">
          Compara dos cargas del reporte de estudiantes tomadas en momentos distintos (Período A /
          Anterior vs. Período B / Actual) para auditar estudiantes nuevos, retirados y cambios de curso.
        </p>
      </div>
      <EstudiantesComparadorWorkflow />
    </div>
  );
}
