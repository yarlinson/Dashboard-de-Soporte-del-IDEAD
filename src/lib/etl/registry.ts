import { ArrowRightLeft, Columns3, FileDiff, GitCompareArrows, GraduationCap, Timer, type LucideIcon } from "lucide-react";

export interface EtlUseCaseMeta {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Agrupa la herramienta en el inicio y en el menú lateral. */
  group: EtlGroupId;
  /** Lo que entra y lo que sale, con los nombres reales de columna: es lo que el administrador reconoce. */
  flow: { from: string; to: string };
}

export type EtlGroupId = "estudiantes" | "docentes" | "curso";

export const etlGroups: { id: EtlGroupId; label: string }[] = [
  { id: "estudiantes", label: "Estudiantes" },
  { id: "docentes", label: "Docentes" },
  { id: "curso", label: "Cursos" },
];

export const etlUseCases: EtlUseCaseMeta[] = [
  {
    id: "siau-to-moodle",
    title: "SIAU → Moodle (Carga masiva de usuarios)",
    description: "Transforma el export de SIAU en el CSV de carga masiva de usuarios para Moodle.",
    href: "/etl/siau-to-moodle",
    icon: ArrowRightLeft,
    group: "estudiantes",
    flow: { from: "CÓDIGO_INSTITUCIONAL, CURSOS", to: "username, course1 … courseN" },
  },
  {
    id: "custom-mapping",
    title: "Mapeo flexible de columnas → Moodle",
    description:
      "Importa listados de estudiantes en formatos heterogéneos (Excel, CSV o texto pegado) y mapea sus columnas al formato de carga masiva de Moodle.",
    href: "/etl/custom-mapping",
    icon: Columns3,
    group: "estudiantes",
    flow: { from: "columnas de tu archivo", to: "username, email, course1 … courseN" },
  },
  {
    id: "docentes-siau",
    title: "Docentes SIAU → Moodle (roles por vinculación)",
    description:
      "Agrupa el reporte 'SIAU - Reporte Docente Cursos' por docente y genera el CSV de carga masiva de Moodle con roles asignados según la vinculación.",
    href: "/etl/docentes-siau",
    icon: GraduationCap,
    group: "docentes",
    flow: { from: "VINCULACIÓN, CURSOS", to: "username, course1, role1 …" },
  },
  {
    id: "custom-mapping-docentes",
    title: "Mapeo flexible de columnas → Moodle (Docentes)",
    description:
      "Importa listados de docentes en formatos heterogéneos (Excel, CSV o texto pegado) y los agrupa por docente con roles configurables, generando el CSV de carga masiva de Moodle.",
    href: "/etl/custom-mapping-docentes",
    icon: Columns3,
    group: "docentes",
    flow: { from: "columnas de tu archivo", to: "username, course1, role1 …" },
  },
  {
    id: "docentes-comparador",
    title: "Comparador de Reportes de Docentes (Auditoría)",
    description:
      "Compara dos cargas del reporte de docentes tomadas en momentos distintos y detecta docentes nuevos, dados de baja y cambios de curso o rol.",
    href: "/etl/docentes-comparador",
    icon: FileDiff,
    group: "docentes",
    flow: { from: "reporte A y reporte B", to: "nuevos, bajas, cambios" },
  },
  {
    id: "estudiantes-comparador",
    title: "Comparador de Reportes de Estudiantes (Auditoría)",
    description:
      "Compara dos cargas del reporte de estudiantes tomadas en momentos distintos y detecta estudiantes nuevos, retirados y cambios de curso.",
    href: "/etl/estudiantes-comparador",
    icon: GitCompareArrows,
    group: "estudiantes",
    flow: { from: "reporte A y reporte B", to: "nuevos, retirados, cambios" },
  },
  {
    id: "dedicacion-curso",
    title: "Dedicación del curso (Tiempo de uso del Campus)",
    description:
      "Calcula el tiempo estimado que cada participante dedicó a un curso a partir del informe de Registros de Moodle, agrupando sus clics en sesiones.",
    href: "/etl/dedicacion",
    icon: Timer,
    group: "curso",
    flow: { from: "Registros de Moodle", to: "tiempo por participante" },
  },
];
