import type { Metadata } from "next";
import { SiauToMoodleWorkflow } from "@/components/etl/siau-to-moodle/siau-to-moodle-workflow";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "SIAU → Moodle | Dashboard ETL",
};

export default function SiauToMoodlePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="SIAU → Moodle: carga masiva de usuarios">
          Sube el export de SIAU (Excel o CSV), configura el período y la contraseña genérica, revisa la
          previsualización y exporta el CSV listo para la carga masiva en Moodle.
        </PageHeader>
      <SiauToMoodleWorkflow />
    </div>
  );
}
