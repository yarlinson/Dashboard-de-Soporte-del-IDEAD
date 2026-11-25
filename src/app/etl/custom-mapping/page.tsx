import type { Metadata } from "next";
import { CustomMappingWorkflow } from "@/components/etl/custom-mapping/custom-mapping-workflow";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Mapeo flexible de columnas | Dashboard ETL",
};

export default function CustomMappingPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="Mapeo flexible de columnas → Moodle">
          Carga un archivo (Excel/CSV) o pega texto/tabla desde un correo, mapea sus columnas a los campos de
          Moodle, configura el período y la contraseña genérica, revisa la previsualización y exporta el CSV
          listo para la carga masiva en Moodle.
        </PageHeader>
      <CustomMappingWorkflow />
    </div>
  );
}
