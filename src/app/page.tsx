import { Lock } from "lucide-react";

import { CaseDistributionChart } from "@/components/dashboard/case-distribution-chart";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { ToolRow } from "@/components/dashboard/tool-row";
import { PageHeader } from "@/components/layout/page-header";
import { etlGroups, etlUseCases } from "@/lib/etl/registry";

export default function HomePage() {
  let rowIndex = 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <div className="flex flex-col gap-4">
        <PageHeader title="Carga masiva al Campus Virtual">
          Convierte los reportes de SIAU en archivos listos para subir a Moodle, o audita qué cambió entre dos
          cargas.
        </PageHeader>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          Los archivos se procesan en este navegador y no se envían a ningún servidor.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-10">
          {etlGroups.map((group) => {
            const tools = etlUseCases.filter((useCase) => useCase.group === group.id);
            if (tools.length === 0) return null;
            return (
              <section key={group.id} aria-labelledby={`grupo-${group.id}`} className="flex flex-col gap-1">
                <h2 id={`grupo-${group.id}`} className="type-display text-foreground text-xl">
                  {group.label}
                </h2>
                <ul>
                  {tools.map((useCase) => (
                    <ToolRow
                      key={useCase.id}
                      href={useCase.href}
                      title={useCase.title}
                      description={useCase.description}
                      icon={<useCase.icon className="size-5" />}
                      flow={useCase.flow}
                      index={rowIndex++}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <aside aria-label="Actividad reciente" className="flex flex-col gap-8 lg:border-border lg:border-l lg:pl-8">
          <section className="flex flex-col gap-4">
            <h2 className="type-display text-foreground text-xl">Actividad</h2>
            <StatsOverview />
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="type-display text-foreground text-xl">Filas por herramienta</h2>
            <CaseDistributionChart />
          </section>
        </aside>
      </div>
    </div>
  );
}
