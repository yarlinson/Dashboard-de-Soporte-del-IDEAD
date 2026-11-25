import type { Metadata } from "next";
import { EstudiantesComparadorWorkflow } from "@/components/etl/estudiantes-comparador/estudiantes-comparador-workflow";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Comparador de Estudiantes | Dashboard ETL",
};

export default function EstudiantesComparadorPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="Comparador de Reportes de Estudiantes">
          Compara dos cargas del reporte de estudiantes tomadas en momentos distintos (Período A /
          Anterior vs. Período B / Actual) para auditar estudiantes nuevos, retirados y cambios de curso.
        </PageHeader>
      <EstudiantesComparadorWorkflow />
    </div>
  );
}
