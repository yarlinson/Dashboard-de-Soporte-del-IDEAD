import type { Metadata } from "next";
import { SiauToMoodleWorkflow } from "@/components/etl/siau-to-moodle/siau-to-moodle-workflow";

export const metadata: Metadata = {
  title: "SIAU → Moodle | Dashboard ETL",
};

export default function SiauToMoodlePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">SIAU → Moodle: carga masiva de usuarios</h1>
        <p className="text-muted-foreground text-sm">
          Sube el export de SIAU (Excel o CSV), configura el período y la contraseña genérica, revisa la
          previsualización y exporta el CSV listo para la carga masiva en Moodle.
        </p>
      </div>
      <SiauToMoodleWorkflow />
    </div>
  );
}
