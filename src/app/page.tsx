import { QuickActionCard } from "@/components/dashboard/quick-action-card";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { CaseDistributionChart } from "@/components/dashboard/case-distribution-chart";
import { etlUseCases } from "@/lib/etl/registry";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Bienvenido, Administrador Campus</h1>
        <p className="text-muted-foreground text-sm">
          Herramientas de transformación de datos para la carga masiva en Moodle. Todo el procesamiento ocurre en tu
          navegador: ningún archivo institucional se envía a un servidor.
        </p>
      </div>

      <StatsOverview />

      <CaseDistributionChart />

      <div className="flex flex-col gap-4">
        <h2 className="text-foreground text-lg font-semibold">Herramientas ETL disponibles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {etlUseCases.map((useCase) => (
            <QuickActionCard
              key={useCase.id}
              href={useCase.href}
              title={useCase.title}
              description={useCase.description}
              icon={<useCase.icon className="size-5" />}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
