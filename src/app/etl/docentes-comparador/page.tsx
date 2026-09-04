import type { Metadata } from "next";
import { DocentesComparadorWorkflow } from "@/components/etl/docentes-comparador/docentes-comparador-workflow";

export const metadata: Metadata = {
  title: "Comparador de Docentes | Dashboard ETL",
};

export default function DocentesComparadorPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Comparador de Reportes de Docentes</h1>
        <p className="text-muted-foreground text-sm">
          Compara dos cargas del reporte de docentes tomadas en momentos distintos (Período A / Anterior
          vs. Período B / Actual) para auditar docentes nuevos, dados de baja y cambios de curso o rol.
        </p>
      </div>
      <DocentesComparadorWorkflow />
    </div>
  );
}
