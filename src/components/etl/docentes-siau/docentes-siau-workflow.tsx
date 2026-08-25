"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FileDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, cardGlow } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDropzone } from "@/components/etl/file-dropzone";
import { DataPreviewTable } from "@/components/etl/data-preview-table";
import { RowIssuesBadge } from "@/components/etl/row-issues-badge";
import { DocenteRoleFilter } from "@/components/etl/docente-role-filter";
import { EtlStepper, type EtlStepperStep } from "@/components/etl/etl-stepper";
import { ConfigForm } from "@/components/etl/docentes-siau/config-form";
import { readTabularFile, downloadCsv, downloadXlsx } from "@/lib/etl/core/csv";
import { downloadCsvTemplate, downloadXlsxTemplate } from "@/lib/etl/core/template";
import { computeTransformSummary } from "@/lib/etl/core/summary";
import { overrideKey } from "@/lib/etl/core/teacher-grouping";
import {
  transformSiauDocentes,
  extractDistinctVinculaciones,
  exportDocenteRowsToCsv,
  getDocenteExportData,
} from "@/lib/etl/docentes-siau/transform";
import { SIAU_DOCENTES_REQUIRED_COLUMNS, DEFAULT_ROLE_MAPPING, DEFAULT_GENERIC_PASSWORD } from "@/lib/etl/docentes-siau/constants";
import type { DocenteConfig } from "@/lib/etl/docentes-siau/schema";
import { extractDistinctRoles, filterDocenteRowsByRole, type DocenteRowResult } from "@/lib/etl/core/moodle-docente";
import { useEtlHistory } from "@/hooks/use-etl-history";
import { cn } from "@/lib/utils";

const DEFAULT_CONFIG: DocenteConfig = {
  genericPassword: DEFAULT_GENERIC_PASSWORD,
  applyPeriodSuffix: false,
  periodSuffix: "/2026B",
  roleMapping: DEFAULT_ROLE_MAPPING,
};

export function DocentesSiauWorkflow() {
  const { recordRun } = useEtlHistory();
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [config, setConfig] = useState<DocenteConfig>(DEFAULT_CONFIG);
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const [excludedRowIndexes, setExcludedRowIndexes] = useState<Set<number>>(new Set());
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());

  const distinctVinculaciones = useMemo(() => extractDistinctVinculaciones(rawRows), [rawRows]);

  const result = useMemo(() => {
    if (rawRows.length === 0) return null;
    return transformSiauDocentes(rawRows, config, roleOverrides);
  }, [rawRows, config, roleOverrides]);

  const editedRows = useMemo(
    () => (result ? result.rows.filter((r) => !excludedRowIndexes.has(r.rowIndex)) : []),
    [result, excludedRowIndexes]
  );
  const availableRoles = useMemo(() => extractDistinctRoles(editedRows), [editedRows]);
  const visibleRows = useMemo(() => filterDocenteRowsByRole(editedRows, roleFilter), [editedRows, roleFilter]);
  const visibleSummary = useMemo(() => computeTransformSummary(visibleRows), [visibleRows]);

  const handleRoleOverride = useCallback((username: string, course: string, role: string) => {
    setRoleOverrides((prev) => ({ ...prev, [overrideKey(username, course)]: role }));
  }, []);

  function handleDeleteRow(row: DocenteRowResult) {
    setExcludedRowIndexes((prev) => new Set(prev).add(row.rowIndex));
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
          const conflicts = c.row.original.conflicts;
          const courseCount = Object.keys(output).filter((k) => k.startsWith("course")).length;
          const pairs = Array.from({ length: courseCount }, (_, i) => ({
            course: output[`course${i + 1}`],
            role: output[`role${i + 1}`],
          }));
          return (
            <div className="flex flex-wrap gap-1">
              {pairs.map(({ course, role }, i) => {
                const conflict = conflicts.find((cf) => cf.course === course);
                if (!conflict) {
                  return (
                    <Badge key={i} variant="secondary" className="font-mono text-[11px]">
                      {course} → {role}
                    </Badge>
                  );
                }
                return (
                  <div
                    key={i}
                    className="border-warning/40 bg-warning/10 flex items-center gap-1 rounded-md border px-1 py-0.5"
                  >
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

  async function handleFileSelected(file: File) {
    setFileError(null);
    setRoleOverrides({});
    setExcludedRowIndexes(new Set());
    setRoleFilter(new Set());
    try {
      const rows = await readTabularFile(file, { expectedHeaders: SIAU_DOCENTES_REQUIRED_COLUMNS });
      setRawRows(rows);
    } catch {
      setRawRows([]);
      setFileError("No se pudo leer el archivo. Verifica que sea un Excel (.xlsx/.xls) o CSV válido.");
    }
  }

  function handleExportCsv() {
    if (!result) return;
    downloadCsv("moodle-bulk-docentes.csv", exportDocenteRowsToCsv(visibleRows));
    recordRun({ caseId: "docentes-siau", caseLabel: "Docentes SIAU", totalRows: visibleSummary.totalRows, validRows: visibleSummary.validRows });
  }

  function handleExportXlsx() {
    if (!result) return;
    const { rows, columns } = getDocenteExportData(visibleRows);
    downloadXlsx("moodle-bulk-docentes.xlsx", rows, columns);
    recordRun({ caseId: "docentes-siau", caseLabel: "Docentes SIAU", totalRows: visibleSummary.totalRows, validRows: visibleSummary.validRows });
  }

  function handleDownloadTemplate(format: "csv" | "xlsx") {
    if (format === "csv") downloadCsvTemplate("plantilla-siau-docentes.csv", SIAU_DOCENTES_REQUIRED_COLUMNS);
    else downloadXlsxTemplate("plantilla-siau-docentes.xlsx", SIAU_DOCENTES_REQUIRED_COLUMNS);
  }

  const steps: EtlStepperStep[] = [
    { id: "step-archivo", label: "Archivo de origen", status: rawRows.length > 0 ? "complete" : "active" },
    { id: "step-config", label: "Configuración", status: rawRows.length > 0 ? "complete" : "pending" },
    { id: "step-preview", label: "Previsualización", status: result ? "complete" : "pending" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EtlStepper steps={steps} />

      <Card id="step-archivo">
        <CardHeader>
          <CardTitle className="text-base">1. Archivo de origen (SIAU - Reporte Docente Cursos)</CardTitle>
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
            <p className="text-muted-foreground text-sm">
              {rawRows.length} filas detectadas ({result?.summary.totalRows ?? 0} docentes agrupados).
            </p>
          )}
        </CardContent>
      </Card>

      <Card id="step-config">
        <CardHeader>
          <CardTitle className="text-base">2. Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfigForm value={config} onChange={setConfig} distinctVinculaciones={distinctVinculaciones} />
        </CardContent>
      </Card>

      {result && (
        <Card id="step-preview" className={cn(cardGlow({ glow: "red" }))}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">3. Previsualización</CardTitle>
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
