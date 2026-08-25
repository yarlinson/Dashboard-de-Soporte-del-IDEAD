"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Columns3, Eye, Upload, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, cardGlow } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileDropzone } from "@/components/etl/file-dropzone";
import { PasteDataInput } from "@/components/etl/paste-data-input";
import { DataPreviewTable } from "@/components/etl/data-preview-table";
import { RowIssuesBadge } from "@/components/etl/row-issues-badge";
import { DocenteRoleFilter } from "@/components/etl/docente-role-filter";
import { EtlStepper, type EtlStepperStep } from "@/components/etl/etl-stepper";
import { ColumnMappingDocenteForm } from "@/components/etl/custom-mapping-docentes/column-mapping-form";
import { ConfigForm } from "@/components/etl/custom-mapping/config-form";
import { readTabularFile, parsePastedTable, downloadCsv, downloadXlsx, extractColumnNames } from "@/lib/etl/core/csv";
import { computeTransformSummary } from "@/lib/etl/core/summary";
import { overrideKey } from "@/lib/etl/core/teacher-grouping";
import { MoodleConfigSchema, type MoodleConfig } from "@/lib/etl/core/moodle";
import { extractDistinctRoles, filterDocenteRowsByRole, type DocenteRowResult } from "@/lib/etl/core/moodle-docente";
import {
  transformCustomMappingDocentes,
  applyRemovedCoursesDocente,
  exportDocenteRowsToCsv,
  getDocenteExportData,
} from "@/lib/etl/custom-mapping-docentes/transform";
import {
  defaultColumnMappingDocenteDraft,
  toColumnMappingDocente,
  type ColumnMappingDocenteDraft,
} from "@/lib/etl/custom-mapping-docentes/schema";
import {
  suggestColumnMapping,
  applySuggestions,
  type MappingSuggestions,
} from "@/lib/etl/custom-mapping-docentes/column-suggestions";
import { detectPivotedColumns } from "@/lib/etl/custom-mapping/pivot-detection";
import { useEtlHistory } from "@/hooks/use-etl-history";
import { cn } from "@/lib/utils";

type SourceMode = "file" | "paste";

const defaultConfig: MoodleConfig = {
  genericPassword: "campusvirtualunillanos",
  applyPeriodSuffix: true,
  periodSuffix: "/2026B",
};

export function CustomMappingDocentesWorkflow() {
  const { recordRun } = useEtlHistory();
  const [sourceMode, setSourceMode] = useState<SourceMode>("file");
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [mappingDraft, setMappingDraft] = useState<ColumnMappingDocenteDraft>(defaultColumnMappingDocenteDraft);
  const [suggestions, setSuggestions] = useState<MappingSuggestions>({});
  const [config, setConfig] = useState<MoodleConfig>(defaultConfig);
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const [excludedRowIndexes, setExcludedRowIndexes] = useState<Set<number>>(new Set());
  const [removedCourses, setRemovedCourses] = useState<Record<number, Set<string>>>({});
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());

  const sourceColumns = useMemo(() => extractColumnNames(rawRows), [rawRows]);
  const pivotDetection = useMemo(() => detectPivotedColumns(sourceColumns), [sourceColumns]);

  const mapping = useMemo(() => toColumnMappingDocente(mappingDraft), [mappingDraft]);
  const configValid = useMemo(() => MoodleConfigSchema.safeParse(config).success, [config]);

  const result = useMemo(() => {
    if (rawRows.length === 0 || !mapping || !configValid) return null;
    return transformCustomMappingDocentes(rawRows, mapping, config, roleOverrides);
  }, [rawRows, mapping, config, configValid, roleOverrides]);

  const editedRows = useMemo(() => {
    if (!result) return [];
    return applyRemovedCoursesDocente(result.rows, removedCourses).filter((r) => !excludedRowIndexes.has(r.rowIndex));
  }, [result, removedCourses, excludedRowIndexes]);
  const availableRoles = useMemo(() => extractDistinctRoles(editedRows), [editedRows]);
  const visibleRows = useMemo(() => filterDocenteRowsByRole(editedRows, roleFilter), [editedRows, roleFilter]);
  const visibleSummary = useMemo(() => computeTransformSummary(visibleRows), [visibleRows]);

  const handleRoleOverride = useCallback((username: string, course: string, role: string) => {
    setRoleOverrides((prev) => ({ ...prev, [overrideKey(username, course)]: role }));
  }, []);

  function handleDeleteRow(row: DocenteRowResult) {
    setExcludedRowIndexes((prev) => new Set(prev).add(row.rowIndex));
  }

  function handleRemoveCourse(rowIndex: number, courseCode: string) {
    setRemovedCourses((prev) => {
      const set = new Set(prev[rowIndex] ?? []);
      set.add(courseCode);
      return { ...prev, [rowIndex]: set };
    });
  }

  function toggleRoleFilter(role: string) {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  const columns = useMemo<ColumnDef<DocenteRowResult, unknown>[]>(
    () => [
      { header: "#", accessorFn: (row) => row.rowIndex, id: "rowIndex", cell: (c) => c.getValue() as number },
      { header: "Estado", id: "issues", cell: (c) => <RowIssuesBadge issues={c.row.original.issues} /> },
      { header: "Username", id: "username", accessorFn: (row) => row.output?.username ?? "—" },
      { header: "Nombre", id: "firstname", accessorFn: (row) => row.output?.firstname ?? "—" },
      { header: "Apellido", id: "lastname", accessorFn: (row) => row.output?.lastname ?? "—" },
      { header: "Email", id: "email", accessorFn: (row) => row.output?.email ?? "—" },
      {
        header: "Cursos ↔ Roles",
        id: "coursesRoles",
        cell: (c) => {
          const output = c.row.original.output;
          if (!output) return "—";
          const rowIndex = c.row.original.rowIndex;
          const conflicts = c.row.original.conflicts;
          const courseCount = Object.keys(output).filter((k) => k.startsWith("course")).length;
          const pairs = Array.from({ length: courseCount }, (_, i) => ({
            course: output[`course${i + 1}`],
            role: output[`role${i + 1}`],
          }));
          if (pairs.length === 0) return "—";
          return (
            <div className="flex flex-wrap gap-1">
              {pairs.map(({ course, role }, i) => {
                const conflict = conflicts.find((cf) => cf.course === course);
                return (
                  <div
                    key={i}
                    className={
                      conflict
                        ? "border-warning/40 bg-warning/10 flex items-center gap-1 rounded-md border px-1 py-0.5"
                        : "flex items-center gap-1"
                    }
                  >
                    {conflict ? (
                      <>
                        <span className="text-warning font-mono text-[11px]">{course} →</span>
                        <Select value={role} onValueChange={(v) => handleRoleOverride(output.username, course, v)}>
                          <SelectTrigger className="h-6 w-auto min-w-24 border-none bg-transparent px-1 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {conflict.candidates.map((candidate) => (
                              <SelectItem key={candidate} value={candidate} className="text-[11px]">
                                {candidate}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                        {course} → {role}
                      </Badge>
                    )}
                    <button
                      type="button"
                      aria-label={`Quitar curso ${course}`}
                      onClick={() => handleRemoveCourse(rowIndex, course)}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        },
      },
    ],
    [handleRoleOverride]
  );

  function resetSourceState() {
    setRawRows([]);
    setSourceError(null);
    setMappingDraft(defaultColumnMappingDocenteDraft);
    setSuggestions({});
    setRoleOverrides({});
    setExcludedRowIndexes(new Set());
    setRemovedCourses({});
    setRoleFilter(new Set());
  }

  function handleSourceModeChange(mode: SourceMode) {
    setSourceMode(mode);
    resetSourceState();
  }

  function applyColumnSuggestions(rows: Record<string, unknown>[]) {
    const suggested = suggestColumnMapping(extractColumnNames(rows));
    setSuggestions(suggested);
    setMappingDraft(applySuggestions(suggested, defaultColumnMappingDocenteDraft));
  }

  async function handleFileSelected(file: File) {
    setSourceError(null);
    setRoleOverrides({});
    setExcludedRowIndexes(new Set());
    setRemovedCourses({});
    setRoleFilter(new Set());
    try {
      const rows = await readTabularFile(file);
      applyColumnSuggestions(rows);
      setRawRows(rows);
    } catch {
      setRawRows([]);
      setSuggestions({});
      setSourceError("No se pudo leer el archivo. Verifica que sea un Excel (.xlsx/.xls) o CSV válido.");
    }
  }

  function handleTextPasted(text: string) {
    setSourceError(null);
    setRoleOverrides({});
    setExcludedRowIndexes(new Set());
    setRemovedCourses({});
    setRoleFilter(new Set());
    try {
      const rows = parsePastedTable(text);
      if (rows.length === 0) {
        setSourceError("No se detectaron filas de datos en el texto pegado.");
        return;
      }
      applyColumnSuggestions(rows);
      setRawRows(rows);
    } catch {
      setRawRows([]);
      setSuggestions({});
      setSourceError("No se pudo interpretar el texto pegado como una tabla.");
    }
  }

  function handleExportCsv() {
    if (!result) return;
    downloadCsv("moodle-bulk-docentes.csv", exportDocenteRowsToCsv(visibleRows));
    recordRun({ caseId: "custom-mapping-docentes", caseLabel: "Mapeo flexible (Docentes)", totalRows: visibleSummary.totalRows, validRows: visibleSummary.validRows });
  }

  function handleExportXlsx() {
    if (!result) return;
    const { rows, columns } = getDocenteExportData(visibleRows);
    downloadXlsx("moodle-bulk-docentes.xlsx", rows, columns);
    recordRun({ caseId: "custom-mapping-docentes", caseLabel: "Mapeo flexible (Docentes)", totalRows: visibleSummary.totalRows, validRows: visibleSummary.validRows });
  }

  const steps: EtlStepperStep[] = [
    { id: "step-origen", label: "Origen de datos", status: rawRows.length > 0 ? "complete" : "active" },
    {
      id: "step-mapeo",
      label: "Mapeo y configuración",
      status: mapping && configValid ? "complete" : rawRows.length > 0 ? "active" : "pending",
    },
    { id: "step-preview", label: "Previsualización", status: result ? "complete" : "pending" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EtlStepper steps={steps} />

      <Card id="step-origen">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="text-primary size-4" />
            1. Origen de datos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sourceMode === "file" ? "default" : "outline"}
              onClick={() => handleSourceModeChange("file")}
            >
              Cargar archivo
            </Button>
            <Button
              type="button"
              variant={sourceMode === "paste" ? "default" : "outline"}
              onClick={() => handleSourceModeChange("paste")}
            >
              Pegar texto/tabla
            </Button>
          </div>

          {sourceMode === "file" ? (
            <FileDropzone
              label="Arrastra o selecciona el listado de docentes (.xlsx, .xls, .csv)"
              onFileSelected={handleFileSelected}
            />
          ) : (
            <PasteDataInput
              label="Pega aquí la tabla copiada de Excel o de un correo (con encabezados en la primera línea)"
              hint="Acepta datos separados por tabulaciones o por comas. Si un docente aparece en varias filas (una por curso), se agrupará automáticamente."
              onDataPasted={handleTextPasted}
            />
          )}

          {sourceError && (
            <Alert variant="destructive">
              <AlertTitle>Error al leer los datos</AlertTitle>
              <AlertDescription>{sourceError}</AlertDescription>
            </Alert>
          )}
          {rawRows.length > 0 && !sourceError && (
            <p className="text-muted-foreground text-sm">
              {rawRows.length} filas y {sourceColumns.length} columnas detectadas.
            </p>
          )}
          {rawRows.length > 0 && !sourceError && pivotDetection.isPivoted && (
            <Alert>
              <AlertTitle>Estructura con columnas repetidas detectada</AlertTitle>
              <AlertDescription>
                Este archivo parece tener bloques de columnas repetidos (
                {pivotDetection.repeatedHeaders.join(", ")}), típico de reportes con un curso por bloque. El
                mapeo automático a un solo curso no está soportado todavía: puedes mapear manualmente un único
                bloque/curso a continuación, o exportar los demás por separado.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {sourceColumns.length > 0 && (
        <Card id="step-mapeo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Columns3 className="text-primary size-4" />
              2. Mapeador de columnas y configuración de cursos/roles
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ColumnMappingDocenteForm
              sourceColumns={sourceColumns}
              sourceRows={rawRows}
              previewRow={rawRows[0]}
              value={mappingDraft}
              onChange={setMappingDraft}
              suggestions={suggestions}
            />
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Parámetros globales</p>
              <ConfigForm value={config} onChange={setConfig} />
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card id="step-preview" className={cn(cardGlow({ glow: "red" }))}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="text-primary size-4" />
              3. Previsualización y exportación
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportXlsx} disabled={visibleSummary.validRows === 0}>
                Exportar Excel ({visibleSummary.validRows} docentes válidos)
              </Button>
              <Button onClick={handleExportCsv} disabled={visibleSummary.validRows === 0}>
                Exportar CSV ({visibleSummary.validRows} docentes válidos)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <DocenteRoleFilter
              roles={availableRoles}
              selected={roleFilter}
              onToggle={toggleRoleFilter}
              onClear={() => setRoleFilter(new Set())}
            />
            <p className="text-muted-foreground text-sm">
              {visibleSummary.totalRows} docentes totales · {visibleSummary.validRows} válidos ·{" "}
              {visibleSummary.rowsWithWarnings} con avisos · {visibleSummary.rowsWithErrors} con errores
              {roleFilter.size > 0 && ` · filtrado por ${roleFilter.size} vinculación(es)`}
            </p>
            <DataPreviewTable columns={columns} data={visibleRows} onDeleteRow={handleDeleteRow} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
