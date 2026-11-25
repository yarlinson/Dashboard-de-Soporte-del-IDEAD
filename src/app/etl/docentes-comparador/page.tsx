import type { Metadata } from "next";
import { DocentesComparadorWorkflow } from "@/components/etl/docentes-comparador/docentes-comparador-workflow";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Comparador de Docentes | Dashboard ETL",
};

export default function DocentesComparadorPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="Comparador de Reportes de Docentes">
          Compara dos cargas del reporte de docentes tomadas en momentos distintos (Período A / Anterior
          vs. Período B / Actual) para auditar docentes nuevos, dados de baja y cambios de curso o rol.
        </PageHeader>
      <DocentesComparadorWorkflow />
    </div>
  );
}
