export interface EtlUseCaseMeta {
  id: string;
  title: string;
  description: string;
  href: string;
}

export const etlUseCases: EtlUseCaseMeta[] = [
  {
    id: "siau-to-moodle",
    title: "SIAU → Moodle (Carga masiva de usuarios)",
    description: "Transforma el export de SIAU en el CSV de carga masiva de usuarios para Moodle.",
    href: "/etl/siau-to-moodle",
  },
  {
    id: "custom-mapping",
    title: "Mapeo flexible de columnas → Moodle",
    description:
      "Importa listados de estudiantes en formatos heterogéneos (Excel, CSV o texto pegado) y mapea sus columnas al formato de carga masiva de Moodle.",
    href: "/etl/custom-mapping",
  },
  {
    id: "docentes-siau",
    title: "Docentes SIAU → Moodle (roles por vinculación)",
    description:
      "Agrupa el reporte 'SIAU - Reporte Docente Cursos' por docente y genera el CSV de carga masiva de Moodle con roles asignados según la vinculación.",
    href: "/etl/docentes-siau",
  },
  {
    id: "custom-mapping-docentes",
    title: "Mapeo flexible de columnas → Moodle (Docentes)",
    description:
      "Importa listados de docentes en formatos heterogéneos (Excel, CSV o texto pegado) y los agrupa por docente con roles configurables, generando el CSV de carga masiva de Moodle.",
    href: "/etl/custom-mapping-docentes",
  },
];
