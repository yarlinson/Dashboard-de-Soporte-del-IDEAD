"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, Download, FileMinus2, FilePlus2, FileSpreadsheet, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, cardGlow } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDropzone } from "@/components/etl/file-dropzone";
import { DataPreviewTable } from "@/components/etl/data-preview-table";
import { EtlStepper, type EtlStepperStep } from "@/components/etl/etl-stepper";
import { RoleMappingForm } from "@/components/etl/docentes-siau/role-mapping-form";
import { readTabularFile, downloadCsv, downloadXlsx } from "@/lib/etl/core/csv";
import { diffDocentes } from "@/lib/etl/docentes-comparador/diff";
import {
  parseComparableDocentesFromSiauRows,
  parseComparableDocentesFromMoodleOutputRows,
} from "@/lib/etl/docentes-comparador/parse";
import {
  buildAddedMoodleRows,
  buildRemovedMoodleRows,
  buildMoodleExportColumns,
  exportMoodleRowsToCsv,
} from "@/lib/etl/docentes-comparador/export";
import { extractDistinctVinculaciones } from "@/lib/etl/docentes-siau/transform";
import { DEFAULT_GENERIC_PASSWORD, DEFAULT_ROLE_MAPPING } from "@/lib/etl/docentes-siau/constants";
import type { RoleMappingRule } from "@/lib/etl/docentes-siau/schema";
import type { ComparableDocente, ModifiedDocente } from "@/lib/etl/docentes-comparador/types";
import { useEtlHistory } from "@/hooks/use-etl-history";
import { cn } from "@/lib/utils";

type FileFormat = "siau" | "moodle-output";

interface FileSlotState {
  format: FileFormat;
  fileError: string | null;
  rawRows: Record<string, unknown>[] | null;
}

const EMPTY_SLOT: FileSlotState = { format: "siau", fileError: null, rawRows: null };

interface ParsedDocentesSlot {
  docentes: ComparableDocente[];
  duplicateUsernames: string[];
}

function parseByFormat(
  rawRows: Record<string, unknown>[],
  format: FileFormat,
  roleMapping: RoleMappingRule[]
): ParsedDocentesSlot {
  return format === "siau"
    ? { docentes: parseComparableDocentesFromSiauRows(rawRows, roleMapping), duplicateUsernames: [] }
    : parseComparableDocentesFromMoodleOutputRows(rawRows);
}

function CourseBadges({ courses, variant }: { courses: Map<string, string>; variant: "secondary" | "success" | "destructive" }) {
  if (courses.size === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from(courses.entries()).map(([course, role]) => (
        <Badge key={course} variant={variant} className="font-mono text-[11px]">
          {course} → {role}
        </Badge>
      ))}
    </div>
  );
}

export function DocentesComparadorWorkflow() {
  const { recordRun } = useEtlHistory();
  const [previous, setPrevious] = useState<FileSlotState>(EMPTY_SLOT);
  const [current, setCurrent] = useState<FileSlotState>(EMPTY_SLOT);
  const [genericPassword, setGenericPassword] = useState(DEFAULT_GENERIC_PASSWORD);
  const [roleMapping, setRoleMapping] = useState<RoleMappingRule[]>(DEFAULT_ROLE_MAPPING);

  const usesSiauFormat = previous.format === "siau" || current.format === "siau";

  const distinctVinculaciones = useMemo(() => {
    const rows = [
      ...(previous.format === "siau" ? (previous.rawRows ?? []) : []),
      ...(current.format === "siau" ? (current.rawRows ?? []) : []),
    ];
    return extractDistinctVinculaciones(rows);
  }, [previous.rawRows, previous.format, current.rawRows, current.format]);

  const previousParsed = useMemo(
    () => (previous.rawRows ? parseByFormat(previous.rawRows, previous.format, roleMapping) : null),
    [previous.rawRows, previous.format, roleMapping]
  );
  const currentParsed = useMemo(
    () => (current.rawRows ? parseByFormat(current.rawRows, current.format, roleMapping) : null),
    [current.rawRows, current.format, roleMapping]
  );
  const previousDocentes = previousParsed?.docentes ?? null;
  const currentDocentes = currentParsed?.docentes ?? null;

  const diff = useMemo(() => {
    if (!previousDocentes || !currentDocentes) return null;
    return diffDocentes(previousDocentes, currentDocentes);
  }, [previousDocentes, currentDocentes]);

  async function handleFileSelected(slot: "previous" | "current", file: File) {
    const setSlot = slot === "previous" ? setPrevious : setCurrent;
    setSlot((prev) => ({ ...prev, fileError: null, rawRows: null }));
    try {
      const rawRows = await readTabularFile(file);
      setSlot((prev) => ({ ...prev, rawRows }));
    } catch {
      setSlot((prev) => ({
        ...prev,
        rawRows: null,
        fileError: "No se pudo leer el archivo. Verifica que sea un Excel (.xlsx/.xls) o CSV válido.",
      }));
    }
  }

  function handleFormatChange(slot: "previous" | "current", format: FileFormat) {
    const setSlot = slot === "previous" ? setPrevious : setCurrent;
    setSlot((prev) => ({ ...prev, format, rawRows: null, fileError: null }));
  }

  const addedExportRows = useMemo(
    () => (diff ? buildAddedMoodleRows(diff, genericPassword) : []),
    [diff, genericPassword]
  );
  const removedExportRows = useMemo(
    () => (diff ? buildRemovedMoodleRows(diff, genericPassword) : []),
    [diff, genericPassword]
  );

  function handleExportAddedCsv() {
    if (!diff) return;
    downloadCsv("moodle-bulk-docentes-cursos-agregados.csv", exportMoodleRowsToCsv(addedExportRows));
    recordRun({
      caseId: "docentes-comparador",
      caseLabel: "Comparador Docentes (agregados)",
      totalRows: addedExportRows.length,
      validRows: addedExportRows.length,
    });
  }

  function handleExportAddedXlsx() {
    if (!diff) return;
    downloadXlsx("moodle-bulk-docentes-cursos-agregados.xlsx", addedExportRows, buildMoodleExportColumns(addedExportRows));
    recordRun({
      caseId: "docentes-comparador",
      caseLabel: "Comparador Docentes (agregados)",
      totalRows: addedExportRows.length,
      validRows: addedExportRows.length,
    });
  }

  function handleExportRemovedCsv() {
    if (!diff) return;
    downloadCsv("moodle-bulk-docentes-cursos-quitados.csv", exportMoodleRowsToCsv(removedExportRows));
    recordRun({
      caseId: "docentes-comparador",
      caseLabel: "Comparador Docentes (quitados)",
      totalRows: removedExportRows.length,
      validRows: removedExportRows.length,
    });
  }

  function handleExportRemovedXlsx() {
    if (!diff) return;
    downloadXlsx(
      "moodle-bulk-docentes-cursos-quitados.xlsx",
      removedExportRows,
      buildMoodleExportColumns(removedExportRows)
    );
    recordRun({
      caseId: "docentes-comparador",
      caseLabel: "Comparador Docentes (quitados)",
      totalRows: removedExportRows.length,
      validRows: removedExportRows.length,
    });
  }

  const addedColumns = useMemo<ColumnDef<ComparableDocente, unknown>[]>(
    () => [
      { header: "Username", id: "username", accessorFn: (row) => row.username },
      { header: "Nombre", id: "firstname", accessorFn: (row) => row.firstname },
      { header: "Apellido", id: "lastname", accessorFn: (row) => row.lastname },
      { header: "Email", id: "email", accessorFn: (row) => row.email },
      { header: "Cursos", id: "courses", cell: (c) => <CourseBadges courses={c.row.original.courses} variant="success" /> },
    ],
    []
  );

  const removedColumns = useMemo<ColumnDef<ComparableDocente, unknown>[]>(
    () => [
      { header: "Username", id: "username", accessorFn: (row) => row.username },
      { header: "Nombre", id: "firstname", accessorFn: (row) => row.firstname },
      { header: "Apellido", id: "lastname", accessorFn: (row) => row.lastname },
      { header: "Email", id: "email", accessorFn: (row) => row.email },
      { header: "Cursos", id: "courses", cell: (c) => <CourseBadges courses={c.row.original.courses} variant="destructive" /> },
    ],
    []
  );

  const modifiedColumns = useMemo<ColumnDef<ModifiedDocente, unknown>[]>(
    () => [
      { header: "Username", id: "username", accessorFn: (row) => row.username },
      { header: "Nombre", id: "firstname", accessorFn: (row) => row.firstname },
      { header: "Apellido", id: "lastname", accessorFn: (row) => row.lastname },
      {
        header: "Cursos agregados",
        id: "added",
        cell: (c) => (
          <CourseBadges
            courses={new Map(c.row.original.addedCourses.map((change) => [change.course, change.role]))}
            variant="success"
          />
        ),
      },
      {
        header: "Cursos quitados",
        id: "removed",
        cell: (c) => (
          <CourseBadges
            courses={new Map(c.row.original.removedCourses.map((change) => [change.course, change.role]))}
            variant="destructive"
          />
        ),
      },
      {
        header: "Cambios de rol",
        id: "roleChanges",
        cell: (c) => {
          const changes = c.row.original.roleChanges;
          if (changes.length === 0) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {changes.map((change) => (
                <Badge key={change.course} variant="warning" className="font-mono text-[11px]">
                  {change.course}: {change.fromRole} → {change.toRole}
                </Badge>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  const bothLoaded = previousDocentes !== null && currentDocentes !== null;

  const steps: EtlStepperStep[] = [
    { id: "step-archivos", label: "Archivos a comparar", status: bothLoaded ? "complete" : "active" },
    { id: "step-roles", label: "Equivalencias de roles", status: bothLoaded ? "complete" : "pending" },
    { id: "step-resumen", label: "Resumen de cambios", status: diff ? "complete" : "pending" },
    { id: "step-detalle", label: "Detalle y exportación", status: diff ? "complete" : "pending" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EtlStepper steps={steps} />

      <Card id="step-archivos">
        <CardHeader>
          <CardTitle className="text-base">1. Archivos a comparar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Archivo Período A (Anterior)</p>
            <Select value={previous.format} onValueChange={(v) => handleFormatChange("previous", v as FileFormat)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="siau">Reporte SIAU crudo</SelectItem>
                <SelectItem value="moodle-output">Archivo procesado (salida Moodle)</SelectItem>
              </SelectContent>
            </Select>
            <FileDropzone
              label="Arrastra o selecciona el archivo del período anterior (.xlsx, .xls, .csv)"
              onFileSelected={(file) => handleFileSelected("previous", file)}
            />
            {previous.fileError && (
              <Alert variant="destructive">
                <AlertTitle>Error al leer el archivo</AlertTitle>
                <AlertDescription>{previous.fileError}</AlertDescription>
              </Alert>
            )}
            {previousDocentes && !previous.fileError && (
              <p className="text-muted-foreground text-sm">{previousDocentes.length} docentes detectados.</p>
            )}
            {previousParsed && previousParsed.duplicateUsernames.length > 0 && (
              <Alert>
                <AlertTitle>Usernames duplicados en el archivo</AlertTitle>
                <AlertDescription>
                  {previousParsed.duplicateUsernames.length} username(s) aparecen en más de una fila; se usó la
                  última fila de cada uno: {previousParsed.duplicateUsernames.join(", ")}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Archivo Período B (Actual)</p>
            <Select value={current.format} onValueChange={(v) => handleFormatChange("current", v as FileFormat)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="siau">Reporte SIAU crudo</SelectItem>
                <SelectItem value="moodle-output">Archivo procesado (salida Moodle)</SelectItem>
              </SelectContent>
            </Select>
            <FileDropzone
              label="Arrastra o selecciona el archivo del período actual (.xlsx, .xls, .csv)"
              onFileSelected={(file) => handleFileSelected("current", file)}
            />
            {current.fileError && (
              <Alert variant="destructive">
                <AlertTitle>Error al leer el archivo</AlertTitle>
                <AlertDescription>{current.fileError}</AlertDescription>
              </Alert>
            )}
            {currentDocentes && !current.fileError && (
              <p className="text-muted-foreground text-sm">{currentDocentes.length} docentes detectados.</p>
            )}
            {currentParsed && currentParsed.duplicateUsernames.length > 0 && (
              <Alert>
                <AlertTitle>Usernames duplicados en el archivo</AlertTitle>
                <AlertDescription>
                  {currentParsed.duplicateUsernames.length} username(s) aparecen en más de una fila; se usó la
                  última fila de cada uno: {currentParsed.duplicateUsernames.join(", ")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card id="step-roles">
        <CardHeader>
          <CardTitle className="text-base">2. Equivalencias VINCULACION → Rol Moodle</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {usesSiauFormat ? (
            <p className="text-muted-foreground text-xs">
              Se aplican a los archivos en formato &quot;Reporte SIAU crudo&quot;, igual que en Docentes SIAU
              → Moodle, para que los roles comparados y exportados sean roles reales de Moodle.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Ningún archivo está en formato SIAU crudo, así que estas equivalencias no se usan por ahora.
            </p>
          )}
          <RoleMappingForm value={roleMapping} onChange={setRoleMapping} distinctVinculaciones={distinctVinculaciones} />
        </CardContent>
      </Card>

      {diff && (
        <Card id="step-resumen" className={cn(cardGlow({ glow: "red" }))}>
          <CardHeader>
            <CardTitle className="text-base">3. Resumen de cambios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{diff.addedTeachers.length} docentes nuevos</Badge>
              <Badge variant="destructive">{diff.removedTeachers.length} docentes de baja</Badge>
              <Badge variant="warning">{diff.modifiedTeachers.length} docentes modificados</Badge>
              <Badge variant="outline">{diff.unchangedCount} sin cambios</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {diff && (
        <Card id="step-detalle">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">4. Detalle y exportación</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={addedExportRows.length === 0 && removedExportRows.length === 0}>
                  <Download className="size-4" />
                  Exportar
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>
                  <span className="flex items-center gap-1.5">
                    <FilePlus2 className="text-success size-3.5" />
                    Cursos agregados ({addedExportRows.length})
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportAddedCsv} disabled={addedExportRows.length === 0}>
                  <FileText />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAddedXlsx} disabled={addedExportRows.length === 0}>
                  <FileSpreadsheet />
                  Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>
                  <span className="flex items-center gap-1.5">
                    <FileMinus2 className="text-destructive size-3.5" />
                    Cursos quitados / bajas ({removedExportRows.length})
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportRemovedCsv} disabled={removedExportRows.length === 0}>
                  <FileText />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportRemovedXlsx} disabled={removedExportRows.length === 0}>
                  <FileSpreadsheet />
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="comparador-password">Contraseña genérica (para los CSV/Excel exportados)</Label>
              <Input
                id="comparador-password"
                className="max-w-xs"
                value={genericPassword}
                onChange={(e) => setGenericPassword(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Los archivos exportados usan el mismo formato de carga masiva de Moodle que Docentes SIAU →
                Moodle (username, password, firstname, lastname, email, course1, role1, ...).
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Docentes nuevos ({diff.addedTeachers.length})</p>
              <DataPreviewTable columns={addedColumns} data={diff.addedTeachers} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Docentes de baja ({diff.removedTeachers.length})</p>
              <DataPreviewTable columns={removedColumns} data={diff.removedTeachers} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Docentes modificados ({diff.modifiedTeachers.length})</p>
              <DataPreviewTable columns={modifiedColumns} data={diff.modifiedTeachers} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
