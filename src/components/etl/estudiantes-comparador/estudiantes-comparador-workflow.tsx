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
import { readTabularFile, downloadCsv, downloadXlsx } from "@/lib/etl/core/csv";
import { diffStudents } from "@/lib/etl/estudiantes-comparador/diff";
import {
  parseComparableStudentsFromSiauRows,
  parseComparableStudentsFromMoodleOutputRows,
} from "@/lib/etl/estudiantes-comparador/parse";
import {
  buildAddedMoodleRows,
  buildRemovedMoodleRows,
  buildMoodleExportColumns,
  exportMoodleRowsToCsv,
} from "@/lib/etl/estudiantes-comparador/export";
import { DEFAULT_GENERIC_PASSWORD } from "@/lib/etl/docentes-siau/constants";
import type { ComparableStudent, ModifiedStudent } from "@/lib/etl/estudiantes-comparador/types";
import { useEtlHistory } from "@/hooks/use-etl-history";
import { cn } from "@/lib/utils";

type FileFormat = "siau" | "moodle-output";

interface FileSlotState {
  format: FileFormat;
  fileError: string | null;
  rawRows: Record<string, unknown>[] | null;
}

const EMPTY_SLOT: FileSlotState = { format: "siau", fileError: null, rawRows: null };

function parseByFormat(rawRows: Record<string, unknown>[], format: FileFormat): ComparableStudent[] {
  return format === "siau"
    ? parseComparableStudentsFromSiauRows(rawRows)
    : parseComparableStudentsFromMoodleOutputRows(rawRows);
}

function CourseCodeBadges({ courses, variant }: { courses: Iterable<string>; variant: "success" | "destructive" }) {
  const list = Array.from(courses);
  if (list.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((course) => (
        <Badge key={course} variant={variant} className="font-mono text-[11px]">
          {course}
        </Badge>
      ))}
    </div>
  );
}

export function EstudiantesComparadorWorkflow() {
  const { recordRun } = useEtlHistory();
  const [previous, setPrevious] = useState<FileSlotState>(EMPTY_SLOT);
  const [current, setCurrent] = useState<FileSlotState>(EMPTY_SLOT);
  const [genericPassword, setGenericPassword] = useState(DEFAULT_GENERIC_PASSWORD);

  const previousStudents = useMemo(
    () => (previous.rawRows ? parseByFormat(previous.rawRows, previous.format) : null),
    [previous.rawRows, previous.format]
  );
  const currentStudents = useMemo(
    () => (current.rawRows ? parseByFormat(current.rawRows, current.format) : null),
    [current.rawRows, current.format]
  );

  const diff = useMemo(() => {
    if (!previousStudents || !currentStudents) return null;
    return diffStudents(previousStudents, currentStudents);
  }, [previousStudents, currentStudents]);

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
    downloadCsv("moodle-bulk-estudiantes-cursos-agregados.csv", exportMoodleRowsToCsv(addedExportRows));
    recordRun({
      caseId: "estudiantes-comparador",
      caseLabel: "Comparador Estudiantes (agregados)",
      totalRows: addedExportRows.length,
      validRows: addedExportRows.length,
    });
  }

  function handleExportAddedXlsx() {
    if (!diff) return;
    downloadXlsx(
      "moodle-bulk-estudiantes-cursos-agregados.xlsx",
      addedExportRows,
      buildMoodleExportColumns(addedExportRows)
    );
    recordRun({
      caseId: "estudiantes-comparador",
      caseLabel: "Comparador Estudiantes (agregados)",
      totalRows: addedExportRows.length,
      validRows: addedExportRows.length,
    });
  }

  function handleExportRemovedCsv() {
    if (!diff) return;
    downloadCsv("moodle-bulk-estudiantes-cursos-quitados.csv", exportMoodleRowsToCsv(removedExportRows));
    recordRun({
      caseId: "estudiantes-comparador",
      caseLabel: "Comparador Estudiantes (quitados)",
      totalRows: removedExportRows.length,
      validRows: removedExportRows.length,
    });
  }

  function handleExportRemovedXlsx() {
    if (!diff) return;
    downloadXlsx(
      "moodle-bulk-estudiantes-cursos-quitados.xlsx",
      removedExportRows,
      buildMoodleExportColumns(removedExportRows)
    );
    recordRun({
      caseId: "estudiantes-comparador",
      caseLabel: "Comparador Estudiantes (quitados)",
      totalRows: removedExportRows.length,
      validRows: removedExportRows.length,
    });
  }

  const addedColumns = useMemo<ColumnDef<ComparableStudent, unknown>[]>(
    () => [
      { header: "Username", id: "username", accessorFn: (row) => row.username },
      { header: "Nombre", id: "firstname", accessorFn: (row) => row.firstname },
      { header: "Apellido", id: "lastname", accessorFn: (row) => row.lastname },
      { header: "Email", id: "email", accessorFn: (row) => row.email },
      { header: "Cursos", id: "courses", cell: (c) => <CourseCodeBadges courses={c.row.original.courses} variant="success" /> },
    ],
    []
  );

  const removedColumns = useMemo<ColumnDef<ComparableStudent, unknown>[]>(
    () => [
      { header: "Username", id: "username", accessorFn: (row) => row.username },
      { header: "Nombre", id: "firstname", accessorFn: (row) => row.firstname },
      { header: "Apellido", id: "lastname", accessorFn: (row) => row.lastname },
      { header: "Email", id: "email", accessorFn: (row) => row.email },
      { header: "Cursos", id: "courses", cell: (c) => <CourseCodeBadges courses={c.row.original.courses} variant="destructive" /> },
    ],
    []
  );

  const modifiedColumns = useMemo<ColumnDef<ModifiedStudent, unknown>[]>(
    () => [
      { header: "Username", id: "username", accessorFn: (row) => row.username },
      { header: "Nombre", id: "firstname", accessorFn: (row) => row.firstname },
      { header: "Apellido", id: "lastname", accessorFn: (row) => row.lastname },
      {
        header: "Cursos agregados",
        id: "added",
        cell: (c) => <CourseCodeBadges courses={c.row.original.addedCourses} variant="success" />,
      },
      {
        header: "Cursos quitados",
        id: "removed",
        cell: (c) => <CourseCodeBadges courses={c.row.original.removedCourses} variant="destructive" />,
      },
    ],
    []
  );

  const bothLoaded = previousStudents !== null && currentStudents !== null;

  const steps: EtlStepperStep[] = [
    { id: "step-archivos", label: "Archivos a comparar", status: bothLoaded ? "complete" : "active" },
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
            {previousStudents && !previous.fileError && (
              <p className="text-muted-foreground text-sm">{previousStudents.length} estudiantes detectados.</p>
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
            {currentStudents && !current.fileError && (
              <p className="text-muted-foreground text-sm">{currentStudents.length} estudiantes detectados.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {diff && (
        <Card id="step-resumen" className={cn(cardGlow({ glow: "red" }))}>
          <CardHeader>
            <CardTitle className="text-base">2. Resumen de cambios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{diff.addedStudents.length} estudiantes nuevos</Badge>
              <Badge variant="destructive">{diff.removedStudents.length} estudiantes retirados</Badge>
              <Badge variant="warning">{diff.modifiedStudents.length} estudiantes modificados</Badge>
              <Badge variant="outline">{diff.unchangedCount} sin cambios</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {diff && (
        <Card id="step-detalle">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">3. Detalle y exportación</CardTitle>
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
                    Estudiantes agregados ({addedExportRows.length})
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
                    Estudiantes retirados / cursos quitados ({removedExportRows.length})
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
              <Label htmlFor="comparador-estudiantes-password">Contraseña genérica (para los CSV/Excel exportados)</Label>
              <Input
                id="comparador-estudiantes-password"
                className="max-w-xs"
                value={genericPassword}
                onChange={(e) => setGenericPassword(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Los archivos exportados usan el mismo formato de carga masiva de Moodle que Estudiantes SIAU
                → Moodle (username, password, firstname, lastname, email, course1, ...).
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Estudiantes nuevos ({diff.addedStudents.length})</p>
              <DataPreviewTable columns={addedColumns} data={diff.addedStudents} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Estudiantes retirados ({diff.removedStudents.length})</p>
              <DataPreviewTable columns={removedColumns} data={diff.removedStudents} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Estudiantes modificados ({diff.modifiedStudents.length})</p>
              <DataPreviewTable columns={modifiedColumns} data={diff.modifiedStudents} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
