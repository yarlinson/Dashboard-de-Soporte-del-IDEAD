"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Columns3, Eye, Upload, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileDropzone } from "@/components/etl/file-dropzone";
import { PasteDataInput } from "@/components/etl/paste-data-input";
import { DataPreviewTable } from "@/components/etl/data-preview-table";
import { RowIssuesBadge } from "@/components/etl/row-issues-badge";
import { ColumnMappingForm } from "@/components/etl/custom-mapping/column-mapping-form";
import { ConfigForm } from "@/components/etl/custom-mapping/config-form";
import { readTabularFile, parsePastedTable, downloadCsv, downloadXlsx, extractColumnNames } from "@/lib/etl/core/csv";
import { computeTransformSummary } from "@/lib/etl/core/summary";
import {
  getMoodleExportData,
  exportRowsToCsv,
  MoodleConfigSchema,
  type MoodleConfig,
  type MoodleOutputRow,
} from "@/lib/etl/core/moodle";
import { transformCustomMapping, applyRemovedCourses } from "@/lib/etl/custom-mapping/transform";
import { defaultColumnMappingDraft, toColumnMapping, type ColumnMappingDraft } from "@/lib/etl/custom-mapping/schema";
import {
  suggestColumnMapping,
  applySuggestions,
  type MappingSuggestions,
} from "@/lib/etl/custom-mapping/column-suggestions";
import { detectPivotedColumns } from "@/lib/etl/custom-mapping/pivot-detection";
import type { EtlRowResult } from "@/lib/etl/core/types";

type SourceMode = "file" | "paste";

const defaultConfig: MoodleConfig = {
  genericPassword: "campusvirtualunillanos",
  applyPeriodSuffix: true,
  periodSuffix: "/2026B",
};

export function CustomMappingWorkflow() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("file");
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [mappingDraft, setMappingDraft] = useState<ColumnMappingDraft>(defaultColumnMappingDraft);
  const [suggestions, setSuggestions] = useState<MappingSuggestions>({});
  const [config, setConfig] = useState<MoodleConfig>(defaultConfig);
  const [excludedRowIndexes, setExcludedRowIndexes] = useState<Set<number>>(new Set());
  const [removedCourses, setRemovedCourses] = useState<Record<number, Set<string>>>({});

  const sourceColumns = useMemo(() => extractColumnNames(rawRows), [rawRows]);
  const pivotDetection = useMemo(() => detectPivotedColumns(sourceColumns), [sourceColumns]);

  const mapping = useMemo(() => toColumnMapping(mappingDraft), [mappingDraft]);
  const configValid = useMemo(() => MoodleConfigSchema.safeParse(config).success, [config]);

  const result = useMemo(() => {
    if (rawRows.length === 0 || !mapping || !configValid) return null;
    return transformCustomMapping(rawRows, mapping, config);
  }, [rawRows, mapping, config, configValid]);

  const visibleRows = useMemo(() => {
    if (!result) return [];
    return applyRemovedCourses(result.rows, removedCourses).filter((r) => !excludedRowIndexes.has(r.rowIndex));
  }, [result, removedCourses, excludedRowIndexes]);
  const visibleSummary = useMemo(() => computeTransformSummary(visibleRows), [visibleRows]);

  function handleDeleteRow(row: EtlRowResult<MoodleOutputRow>) {
    setExcludedRowIndexes((prev) => new Set(prev).add(row.rowIndex));
  }

  function handleRemoveCourse(rowIndex: number, courseCode: string) {
    setRemovedCourses((prev) => {
      const set = new Set(prev[rowIndex] ?? []);
      set.add(courseCode);
      return { ...prev, [rowIndex]: set };
    });
  }

  const columns = useMemo<ColumnDef<EtlRowResult<MoodleOutputRow>, unknown>[]>(
    () => [
      { header: "#", accessorFn: (row) => row.rowIndex, id: "rowIndex", cell: (c) => c.getValue() as number },
      { header: "Estado", id: "issues", cell: (c) => <RowIssuesBadge issues={c.row.original.issues} /> },
      { header: "Username", id: "username", accessorFn: (row) => row.output?.username ?? "—" },
      { header: "Nombre", id: "firstname", accessorFn: (row) => row.output?.firstname ?? "—" },
      { header: "Apellido", id: "lastname", accessorFn: (row) => row.output?.lastname ?? "—" },
      { header: "Email", id: "email", accessorFn: (row) => row.output?.email ?? "—" },
      {
        header: "Cursos",
        id: "courses",
        cell: (c) => {
          const output = c.row.original.output;
          if (!output) return "—";
          const rowIndex = c.row.original.rowIndex;
          const courses = Object.entries(output)
            .filter(([key]) => key.startsWith("course"))
            .map(([, value]) => value);
          if (courses.length === 0) return "—";
          return (
            <div className="flex flex-wrap gap-1">
              {courses.map((code) => (
                <Badge key={code} variant="secondary" className="gap-1 font-mono text-[11px]">
                  {code}
                  <button
                    type="button"
                    aria-label={`Quitar curso ${code}`}
                    onClick={() => handleRemoveCourse(rowIndex, code)}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  function resetSourceState() {
    setRawRows([]);
    setSourceError(null);
    setMappingDraft(defaultColumnMappingDraft);
    setSuggestions({});
    setExcludedRowIndexes(new Set());
    setRemovedCourses({});
  }

  function handleSourceModeChange(mode: SourceMode) {
    setSourceMode(mode);
    resetSourceState();
  }

  function applyColumnSuggestions(rows: Record<string, unknown>[]) {
    const suggested = suggestColumnMapping(extractColumnNames(rows));
    setSuggestions(suggested);
    setMappingDraft(applySuggestions(suggested, defaultColumnMappingDraft));
  }

  async function handleFileSelected(file: File) {
    setSourceError(null);
    setExcludedRowIndexes(new Set());
    setRemovedCourses({});
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
    setExcludedRowIndexes(new Set());
    setRemovedCourses({});
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
    downloadCsv("moodle-bulk-users.csv", exportRowsToCsv(visibleRows));
  }

  function handleExportXlsx() {
    if (!result) return;
    const { rows, columns } = getMoodleExportData(visibleRows);
    downloadXlsx("moodle-bulk-users.xlsx", rows, columns);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
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
              label="Arrastra o selecciona el listado (.xlsx, .xls, .csv)"
              onFileSelected={handleFileSelected}
            />
          ) : (
            <PasteDataInput
              label="Pega aquí la tabla copiada de Excel o de un correo (con encabezados en la primera línea)"
              hint="Acepta datos separados por tabulaciones o por comas."
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Columns3 className="text-primary size-4" />
              2. Mapeador de columnas y configuración de cursos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ColumnMappingForm
              sourceColumns={sourceColumns}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="text-primary size-4" />
              3. Previsualización y exportación
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportXlsx} disabled={visibleSummary.validRows === 0}>
                Exportar Excel ({visibleSummary.validRows} filas válidas)
              </Button>
              <Button onClick={handleExportCsv} disabled={visibleSummary.validRows === 0}>
                Exportar CSV ({visibleSummary.validRows} filas válidas)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              {visibleSummary.totalRows} filas totales · {visibleSummary.validRows} válidas ·{" "}
              {visibleSummary.rowsWithWarnings} con avisos · {visibleSummary.rowsWithErrors} con errores
            </p>
            <DataPreviewTable columns={columns} data={visibleRows} onDeleteRow={handleDeleteRow} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
