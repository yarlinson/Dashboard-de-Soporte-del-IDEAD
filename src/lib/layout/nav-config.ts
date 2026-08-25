import {
  ArrowRightLeft,
  Columns3,
  GraduationCap,
  LayoutDashboard,
  MonitorPlay,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { etlUseCases } from "@/lib/etl/registry";

export type NavStatus = "active" | "soon";

export interface NavLeafItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  status: NavStatus;
  description?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavLeafItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

const siauToMoodle = etlUseCases.find((useCase) => useCase.id === "siau-to-moodle");
const customMapping = etlUseCases.find((useCase) => useCase.id === "custom-mapping");
const docentesSiau = etlUseCases.find((useCase) => useCase.id === "docentes-siau");
const customMappingDocentes = etlUseCases.find((useCase) => useCase.id === "custom-mapping-docentes");

export const navGroups: NavGroup[] = [
  {
    id: "general",
    label: "General",
    items: [
      {
        id: "dashboard",
        label: "Dashboard / Inicio",
        icon: LayoutDashboard,
        href: "/",
        status: "active",
      },
    ],
  },
  {
    id: "etl",
    label: "Herramientas ETL",
    items: [
      {
        id: "siau-to-moodle",
        label: "Estudiantes SIAU → Moodle",
        icon: ArrowRightLeft,
        href: siauToMoodle?.href,
        status: "active",
      },
      {
        id: "custom-mapping",
        label: "Mapeo flexible (Estudiantes)",
        icon: Columns3,
        href: customMapping?.href,
        status: "active",
      },
      {
        id: "docentes",
        label: "Docentes SIAU → Moodle",
        icon: GraduationCap,
        href: docentesSiau?.href,
        status: "active",
      },
      {
        id: "custom-mapping-docentes",
        label: "Mapeo Flexible (Docentes)",
        icon: Columns3,
        href: customMappingDocentes?.href,
        status: "active",
      },
      {
        id: "aulas-virtuales",
        label: "Aulas Virtuales",
        icon: MonitorPlay,
        status: "soon",
      },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      {
        id: "configuracion",
        label: "Configuración de Parámetros",
        icon: SlidersHorizontal,
        status: "soon",
        description: "Períodos, Passwords genéricas",
      },
    ],
  },
];

export const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
  "/": [{ label: "Inicio" }],
  "/etl/siau-to-moodle": [
    { label: "Inicio", href: "/" },
    { label: "Módulos ETL" },
    { label: "Transformador SIAU" },
  ],
  "/etl/custom-mapping": [
    { label: "Inicio", href: "/" },
    { label: "Módulos ETL" },
    { label: "Mapeo flexible (Estudiantes)" },
  ],
  "/etl/docentes-siau": [
    { label: "Inicio", href: "/" },
    { label: "Módulos ETL" },
    { label: "Docentes SIAU → Moodle" },
  ],
  "/etl/custom-mapping-docentes": [
    { label: "Inicio", href: "/" },
    { label: "Módulos ETL" },
    { label: "Mapeo Flexible (Docentes)" },
  ],
};

export const defaultBreadcrumb: BreadcrumbItem[] = [{ label: "Inicio", href: "/" }];
