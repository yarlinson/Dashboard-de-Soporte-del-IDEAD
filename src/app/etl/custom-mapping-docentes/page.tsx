import type { Metadata } from "next";
import { CustomMappingDocentesWorkflow } from "@/components/etl/custom-mapping-docentes/custom-mapping-docentes-workflow";

export const metadata: Metadata = {
  title: "Mapeo flexible de columnas (Docentes) | Dashboard ETL",
};

export default function CustomMappingDocentesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Mapeo flexible de columnas → Moodle (Docentes)</h1>
        <p className="text-muted-foreground text-sm">
          Carga un archivo (Excel/CSV) o pega texto/tabla desde un correo, mapea sus columnas a los campos de
          Moodle, asigna cursos y roles, revisa la previsualización agrupada por docente (con resolución manual
          de conflictos de rol) y exporta el CSV listo para la carga masiva en Moodle.
        </p>
      </div>
      <CustomMappingDocentesWorkflow />
    </div>
  );
}
