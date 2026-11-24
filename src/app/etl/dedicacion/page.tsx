import type { Metadata } from "next";
import { DedicacionWorkflow } from "@/components/etl/dedicacion/dedicacion-workflow";

export const metadata: Metadata = {
  title: "Dedicación del curso | Dashboard ETL",
};

export default function DedicacionPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Dedicación del curso</h1>
        <p className="text-muted-foreground text-sm">
          Calcula el tiempo estimado que cada participante dedicó a un curso del Campus Virtual a partir de sus
          registros (logs), con el mismo método de sesiones del bloque Course Dedication.
        </p>
      </div>
      <DedicacionWorkflow />
    </div>
  );
}
