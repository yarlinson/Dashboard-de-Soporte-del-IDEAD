"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, Download, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, cardGlow } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDropzone } from "@/components/etl/file-dropzone";
import { DataPreviewTable } from "@/components/etl/data-preview-table";
import { RowIssuesBadge } from "@/components/etl/row-issues-badge";
import { EtlStepper, type EtlStepperStep } from "@/components/etl/etl-stepper";
import { ConfigForm } from "@/components/etl/siau-to-moodle/config-form";
import { readTabularFile, downloadCsv, downloadXlsx } from "@/lib/etl/core/csv";
import { downloadCsvTemplate, downloadXlsxTemplate } from "@/lib/etl/core/template";
import { computeTransformSummary } from "@/lib/etl/core/summary";
import { transformSiauToMoodle, exportRowsToCsv, getMoodleExportData } from "@/lib/etl/siau-to-moodle/transform";
import { SIAU_REQUIRED_COLUMNS } from "@/lib/etl/siau-to-moodle/constants";
import type { MoodleConfig, MoodleOutputRow } from "@/lib/etl/siau-to-moodle/schema";
import type { EtlRowResult } from "@/lib/etl/core/types";
import { useEtlHistory } from "@/hooks/use-etl-history";
import { cn } from "@/lib/utils";

export function SiauToMoodleWorkflow() {
  const { recordRun } = useEtlHistory();
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [config, setConfig] = useState<MoodleConfig | null>(null);
  const [excludedRowIndexes, setExcludedRowIndexes] = useState<Set<number>>(new Set());

  const result = useMemo(() => {
    if (rawRows.length === 0 || !config) return null;
    return transformSiauToMoodle(rawRows, config);
  }, [rawRows, config]);

  const visibleRows = useMemo(
    () => (result ? result.rows.filter((r) => !excludedRowIndexes.has(r.rowIndex)) : []),
    [result, excludedRowIndexes]
  );
  const visibleSummary = useMemo(() => computeTransformSummary(visibleRows), [visibleRows]);

  function handleDeleteRow(row: EtlRowResult<MoodleOutputRow>) {
    setExcludedRowIndexes((prev) => new Set(prev).add(row.rowIndex));
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
        accessorFn: (row) =>
          row.output
            ? Object.entries(row.output)
                .filter(([key]) => key.startsWith("course"))
                .map(([, value]) => value)
                .join(", ")
            : "—",
      },
    ],
    []
  );

  async function handleFileSelected(file: File) {
    setFileError(null);
    setExcludedRowIndexes(new Set());
    try {
      const rows = await readTabularFile(file, { expectedHeaders: SIAU_REQUIRED_COLUMNS });
      setRawRows(rows);
    } catch {
      setRawRows([]);
      setFileError("No se pudo leer el archivo. Verifica que sea un Excel (.xlsx/.xls) o CSV válido.");
    }
  }

  function handleExportCsv() {
    if (!result) return;
    downloadCsv("moodle-bulk-users.csv", exportRowsToCsv(visibleRows));
    recordRun({ caseId: "siau-to-moodle", caseLabel: "SIAU Estudiantes", totalRows: visibleSummary.totalRows, validRows: visibleSummary.validRows });
  }

  function handleExportXlsx() {
    if (!result) return;
    const { rows, columns } = getMoodleExportData(visibleRows);
    downloadXlsx("moodle-bulk-users.xlsx", rows, columns);
    recordRun({ caseId: "siau-to-moodle", caseLabel: "SIAU Estudiantes", totalRows: visibleSummary.totalRows, validRows: visibleSummary.validRows });
  }

  function handleDownloadTemplate(format: "csv" | "xlsx") {
    if (format === "csv") downloadCsvTemplate("plantilla-siau-estudiantes.csv", SIAU_REQUIRED_COLUMNS);
    else downloadXlsxTemplate("plantilla-siau-estudiantes.xlsx", SIAU_REQUIRED_COLUMNS);
  }

  const steps: EtlStepperStep[] = [
    { id: "step-archivo", label: "Archivo de origen", status: rawRows.length > 0 ? "complete" : "active" },
    {
      id: "step-config",
      label: "Configuración",
      status: config ? "complete" : rawRows.length > 0 ? "active" : "pending",
    },
    { id: "step-preview", label: "Previsualización", status: result ? "complete" : config ? "active" : "pending" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EtlStepper steps={steps} />

      <Card id="step-archivo">
        <CardHeader>
          <CardTitle className="text-base">1. Archivo de origen (SIAU)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FileDropzone
            label="Arrastra o selecciona el export de SIAU (.xlsx, .xls, .csv)"
            onFileSelected={handleFileSelected}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadTemplate("csv")}>
              <FileDown className="size-3.5" />
              Plantilla CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadTemplate("xlsx")}>
              <FileDown className="size-3.5" />
              Plantilla Excel
            </Button>
          </div>
          {fileError && (
            <Alert variant="destructive">
              <AlertTitle>Error al leer el archivo</AlertTitle>
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}
          {rawRows.length > 0 && !fileError && (
            <p className="text-muted-foreground text-sm">{rawRows.length} filas detectadas.</p>
          )}
        </CardContent>
      </Card>

      <Card id="step-config">
        <CardHeader>
          <CardTitle className="text-base">2. Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfigForm onSubmit={setConfig} />
        </CardContent>
      </Card>

      {result && (
        <Card id="step-preview" className={cn(cardGlow({ glow: "red" }))}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">3. Previsualización</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={visibleSummary.validRows === 0}>
                  <Download className="size-4" />
                  Exportar
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={handleExportCsv} disabled={visibleSummary.validRows === 0}>
                  <FileText />
                  Exportar CSV
                  <span className="text-muted-foreground ml-auto text-xs">{visibleSummary.validRows}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXlsx} disabled={visibleSummary.validRows === 0}>
                  <FileSpreadsheet />
                  Exportar Excel
                  <span className="text-muted-foreground ml-auto text-xs">{visibleSummary.validRows}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
