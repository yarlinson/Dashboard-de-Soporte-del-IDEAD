import { ArrowRightLeft, Columns3, FileDiff, GitCompareArrows, GraduationCap, type LucideIcon } from "lucide-react";

export interface EtlUseCaseMeta {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export const etlUseCases: EtlUseCaseMeta[] = [
  {
    id: "siau-to-moodle",
    title: "SIAU → Moodle (Carga masiva de usuarios)",
    description: "Transforma el export de SIAU en el CSV de carga masiva de usuarios para Moodle.",
    href: "/etl/siau-to-moodle",
    icon: ArrowRightLeft,
  },
  {
    id: "custom-mapping",
    title: "Mapeo flexible de columnas → Moodle",
    description:
      "Importa listados de estudiantes en formatos heterogéneos (Excel, CSV o texto pegado) y mapea sus columnas al formato de carga masiva de Moodle.",
    href: "/etl/custom-mapping",
    icon: Columns3,
  },
  {
    id: "docentes-siau",
    title: "Docentes SIAU → Moodle (roles por vinculación)",
    description:
      "Agrupa el reporte 'SIAU - Reporte Docente Cursos' por docente y genera el CSV de carga masiva de Moodle con roles asignados según la vinculación.",
    href: "/etl/docentes-siau",
    icon: GraduationCap,
  },
  {
    id: "custom-mapping-docentes",
    title: "Mapeo flexible de columnas → Moodle (Docentes)",
    description:
      "Importa listados de docentes en formatos heterogéneos (Excel, CSV o texto pegado) y los agrupa por docente con roles configurables, generando el CSV de carga masiva de Moodle.",
    href: "/etl/custom-mapping-docentes",
    icon: Columns3,
  },
  {
    id: "docentes-comparador",
    title: "Comparador de Reportes de Docentes (Auditoría)",
    description:
      "Compara dos cargas del reporte de docentes tomadas en momentos distintos y detecta docentes nuevos, dados de baja y cambios de curso o rol.",
    href: "/etl/docentes-comparador",
    icon: FileDiff,
  },
  {
    id: "estudiantes-comparador",
    title: "Comparador de Reportes de Estudiantes (Auditoría)",
    description:
      "Compara dos cargas del reporte de estudiantes tomadas en momentos distintos y detecta estudiantes nuevos, retirados y cambios de curso.",
    href: "/etl/estudiantes-comparador",
    icon: GitCompareArrows,
  },
];
