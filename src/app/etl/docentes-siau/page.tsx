import type { Metadata } from "next";
import { DocentesSiauWorkflow } from "@/components/etl/docentes-siau/docentes-siau-workflow";

export const metadata: Metadata = {
  title: "Docentes SIAU → Moodle | Dashboard ETL",
};

export default function DocentesSiauPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Docentes SIAU → Moodle: carga masiva con roles</h1>
        <p className="text-muted-foreground text-sm">
          Sube el reporte &quot;SIAU - Reporte Docente Cursos&quot; (Excel o CSV), ajusta las equivalencias de
          vinculación a rol Moodle, revisa la previsualización agrupada por docente y exporta el CSV listo para
          la carga masiva en Moodle.
        </p>
      </div>
      <DocentesSiauWorkflow />
    </div>
  );
}
