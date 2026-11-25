import {
  ArrowRightLeft,
  Columns3,
  FileDiff,
  GitCompareArrows,
  GraduationCap,
  LayoutDashboard,
  MonitorPlay,
  SlidersHorizontal,
  Timer,
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
const docentesComparador = etlUseCases.find((useCase) => useCase.id === "docentes-comparador");
const estudiantesComparador = etlUseCases.find((useCase) => useCase.id === "estudiantes-comparador");
const dedicacion = etlUseCases.find((useCase) => useCase.id === "dedicacion-curso");

export const navGroups: NavGroup[] = [
  {
    id: "general",
    label: "General",
    items: [{ id: "dashboard", label: "Inicio", icon: LayoutDashboard, href: "/", status: "active" }],
  },
  {
    id: "estudiantes",
    label: "Estudiantes",
    items: [
      {
        id: "siau-to-moodle",
        label: "SIAU → Moodle",
        icon: ArrowRightLeft,
        href: siauToMoodle?.href,
        status: "active",
      },
      {
        id: "custom-mapping",
        label: "Mapeo flexible",
        icon: Columns3,
        href: customMapping?.href,
        status: "active",
      },
      {
        id: "estudiantes-comparador",
        label: "Comparador",
        icon: GitCompareArrows,
        href: estudiantesComparador?.href,
        status: "active",
      },
    ],
  },
  {
    id: "docentes",
    label: "Docentes",
    items: [
      { id: "docentes", label: "SIAU → Moodle", icon: GraduationCap, href: docentesSiau?.href, status: "active" },
      {
        id: "custom-mapping-docentes",
        label: "Mapeo flexible",
        icon: Columns3,
        href: customMappingDocentes?.href,
        status: "active",
      },
      { id: "docentes-comparador", label: "Comparador", icon: FileDiff, href: docentesComparador?.href, status: "active" },
    ],
  },
  {
    id: "cursos",
    label: "Cursos",
    items: [
      { id: "dedicacion-curso", label: "Dedicación del curso", icon: Timer, href: dedicacion?.href, status: "active" },
      { id: "aulas-virtuales", label: "Aulas virtuales", icon: MonitorPlay, status: "soon" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      {
        id: "configuracion",
        label: "Parámetros",
        icon: SlidersHorizontal,
        status: "soon",
        description: "Períodos, contraseñas genéricas",
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
  "/etl/docentes-comparador": [
    { label: "Inicio", href: "/" },
    { label: "Módulos ETL" },
    { label: "Comparador de Docentes" },
  ],
  "/etl/estudiantes-comparador": [
    { label: "Inicio", href: "/" },
    { label: "Módulos ETL" },
    { label: "Comparador de Estudiantes" },
  ],
  "/etl/dedicacion": [
    { label: "Inicio", href: "/" },
    { label: "Módulos ETL" },
    { label: "Dedicación del curso" },
  ],
};

export const defaultBreadcrumb: BreadcrumbItem[] = [{ label: "Inicio", href: "/" }];
