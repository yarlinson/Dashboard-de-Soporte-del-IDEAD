import Link from "next/link";
import { ArrowRight, CalendarClock, FileStack, Repeat } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { etlUseCases } from "@/lib/etl/registry";

const quickStats = [
  {
    id: "transformaciones-hoy",
    label: "Transformaciones hoy",
    value: "0",
    hint: "Ejecuciones completadas en esta sesión",
    icon: Repeat,
  },
  {
    id: "registros-procesados",
    label: "Registros procesados",
    value: "0",
    hint: "Filas transformadas en total",
    icon: FileStack,
  },
  {
    id: "sufijo-actual",
    label: "Sufijo actual",
    value: "/2026B",
    hint: "Período académico configurado",
    icon: CalendarClock,
  },
];

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

      <div className="grid gap-4 sm:grid-cols-3">
        {quickStats.map((stat) => (
          <Card key={stat.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-muted-foreground text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className="text-unillanos-red size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground text-3xl font-bold">{stat.value}</p>
              <p className="text-muted-foreground mt-1 text-xs">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-foreground text-lg font-semibold">Herramientas ETL disponibles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {etlUseCases.map((useCase) => (
            <Link
              key={useCase.id}
              href={useCase.href}
              className="group border-border bg-card hover:border-unillanos-red-dark rounded-lg border p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-foreground font-medium">{useCase.title}</h3>
                <ArrowRight className="text-muted-foreground group-hover:text-unillanos-red size-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{useCase.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
