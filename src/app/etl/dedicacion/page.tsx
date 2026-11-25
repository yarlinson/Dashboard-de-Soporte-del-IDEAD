import type { Metadata } from "next";
import { DedicacionWorkflow } from "@/components/etl/dedicacion/dedicacion-workflow";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Dedicación del curso | Dashboard ETL",
};

export default function DedicacionPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title="Dedicación del curso">
          Calcula el tiempo estimado que cada participante dedicó a un curso del Campus Virtual a partir de sus
          registros (logs), con el mismo método de sesiones del bloque Course Dedication.
        </PageHeader>
      <DedicacionWorkflow />
    </div>
  );
}
