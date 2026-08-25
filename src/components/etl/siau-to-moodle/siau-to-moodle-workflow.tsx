"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropzone } from "@/components/etl/file-dropzone";
import { DataPreviewTable } from "@/components/etl/data-preview-table";
import { RowIssuesBadge } from "@/components/etl/row-issues-badge";
import { ConfigForm } from "@/components/etl/siau-to-moodle/config-form";
import { readTabularFile, downloadCsv, downloadXlsx } from "@/lib/etl/core/csv";
import { computeTransformSummary } from "@/lib/etl/core/summary";
import { transformSiauToMoodle, exportRowsToCsv, getMoodleExportData } from "@/lib/etl/siau-to-moodle/transform";
import { SIAU_REQUIRED_COLUMNS } from "@/lib/etl/siau-to-moodle/constants";
import type { MoodleConfig, MoodleOutputRow } from "@/lib/etl/siau-to-moodle/schema";
import type { EtlRowResult } from "@/lib/etl/core/types";

export function SiauToMoodleWorkflow() {
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
          <CardTitle className="text-base">1. Archivo de origen (SIAU)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FileDropzone
            label="Arrastra o selecciona el export de SIAU (.xlsx, .xls, .csv)"
            onFileSelected={handleFileSelected}
          />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfigForm onSubmit={setConfig} />
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">3. Previsualización</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportXlsx}
                disabled={visibleSummary.validRows === 0}
              >
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
