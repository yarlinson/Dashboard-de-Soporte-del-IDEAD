"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDropzone } from "@/components/etl/file-dropzone";
import { EtlStepper, type EtlStepperStep } from "@/components/etl/etl-stepper";
import { downloadCsv, downloadXlsx, rowsToCsv } from "@/lib/etl/core/csv";
import {
  computeDedication,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatDuration,
  formatTime,
  logDateRange,
} from "@/lib/etl/dedicacion/compute";
import { DEDICACION_EXPORT_COLUMNS, buildDedicacionExportRows } from "@/lib/etl/dedicacion/export";
import { normText, parseLogTable, readLogFile } from "@/lib/etl/dedicacion/parse";
import {
  DEFAULT_DEDICATION_PARAMS,
  type DedicationParams,
  type ParsedLogs,
  type ParticipantDedication,
} from "@/lib/etl/dedicacion/types";
import { useEtlHistory } from "@/hooks/use-etl-history";

type SortKey = "name" | "id" | "email" | "total" | "sessionCount" | "avg" | "days" | "perDay" | "last";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Participante", numeric: false },
  { key: "id", label: "ID usuario", numeric: true },
  { key: "email", label: "Correo", numeric: false },
  { key: "total", label: "Dedicación total", numeric: true },
  { key: "sessionCount", label: "Sesiones", numeric: true },
  { key: "avg", label: "Promedio por sesión", numeric: true },
  { key: "days", label: "Días con conexión", numeric: true },
  { key: "perDay", label: "Conexiones por día", numeric: true },
  { key: "last", label: "Último acceso", numeric: true },
];

function compareBy(key: SortKey, a: ParticipantDedication, b: ParticipantDedication): number {
  if (key === "name" || key === "email") return a[key].localeCompare(b[key], "es");
  if (key === "id") return (Number(a.id) || 0) - (Number(b.id) || 0);
  return a[key] - b[key];
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card flex flex-col gap-0.5 rounded-xl border px-4 py-3 shadow-sm">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function DedicacionWorkflow() {
  const { recordRun } = useEtlHistory();
  const [logs, setLogs] = useState<ParsedLogs | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [params, setParams] = useState<DedicationParams>(DEFAULT_DEDICATION_PARAMS);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "total", dir: -1 });
  const [openKey, setOpenKey] = useState<string | null>(null);

  // El recálculo usa una copia diferida: escribir en un parámetro no se traba con archivos grandes.
  const deferredParams = useDeferredValue(params);
  const isRecalculating = deferredParams !== params;
  const results = useMemo(
    () => (logs ? computeDedication(logs.rows, deferredParams) : []),
    [logs, deferredParams]
  );

  const visible = useMemo(() => {
    const q = normText(search);
    const filtered = q
      ? results.filter((r) => `${normText(r.name)} ${normText(r.email)} ${r.id}`.includes(q))
      : results;
    return [...filtered].sort((a, b) => sort.dir * compareBy(sort.key, a, b));
  }, [results, search, sort]);

  const maxTotal = useMemo(() => Math.max(1, ...results.map((r) => r.total)), [results]);
  const totalMs = results.reduce((sum, r) => sum + r.total, 0);
  const totalClicks = results.reduce((sum, r) => sum + r.clicks, 0);

  async function handleFileSelected(file: File) {
    setFileError(null);
    setIsLoading(true);
    // Cede un frame para que se pinte "Procesando…" antes del trabajo pesado.
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      const parsed = parseLogTable(await readLogFile(file));
      if (parsed.rows.length === 0) throw new Error("El archivo no tiene registros con fecha válida.");
      const range = logDateRange(parsed.rows);
      setLogs(parsed);
      setFileName(file.name);
      setOpenKey(null);
      setParams((prev) => ({ ...prev, from: range?.from ?? "", to: range?.to ?? "" }));
    } catch (error) {
      setLogs(null);
      setFileError(error instanceof Error ? error.message : "No se pudo leer el archivo.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateParam<K extends keyof DedicationParams>(key: K, value: DedicationParams[K]) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 }
    );
  }

  function recordExport() {
    recordRun({
      caseId: "dedicacion-curso",
      caseLabel: "Dedicación del curso",
      totalRows: results.length,
      validRows: results.length,
    });
  }

  function handleExportCsv() {
    downloadCsv(
      "dedicacion-curso.csv",
      rowsToCsv(buildDedicacionExportRows(results), [...DEDICACION_EXPORT_COLUMNS])
    );
    recordExport();
  }

  function handleExportXlsx() {
    downloadXlsx("dedicacion-curso.xlsx", buildDedicacionExportRows(results), [...DEDICACION_EXPORT_COLUMNS]);
    recordExport();
  }

  const steps: EtlStepperStep[] = [
    { id: "step-archivo", label: "Registros del curso", status: logs ? "complete" : "active" },
    { id: "step-parametros", label: "Parámetros", status: logs ? "complete" : "pending" },
    { id: "step-resultados", label: "Dedicación y exportación", status: logs ? "complete" : "pending" },
  ];

  const notes: string[] = [];
  if (logs && !logs.hasId) notes.push("no encontré el ID de usuario (ni columna propia ni en la Descripción)");
  if (logs && !logs.hasEmail) {
    notes.push(
      "el archivo no trae la columna de correo: actívala en Administración del sitio › Usuarios › Permisos › Políticas de usuario › “Mostrar identidad de usuario” marcando “Dirección de correo” y vuelve a descargar los registros"
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <EtlStepper steps={steps} />

      <Card id="step-archivo">
        <CardHeader>
          <CardTitle className="text-base">1. Registros del curso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
            <li>
              Entra al curso y abre <span className="bg-muted rounded px-1 font-mono text-xs">Más › Informes › Registros</span>.
            </li>
            <li>
              Deja <b>Todos los participantes</b>, <b>Todos los días</b> y <b>Todas las actividades</b>; en “Todas las
              fuentes” deja todo.
            </li>
            <li>
              Pulsa <b>Conseguir estos registros</b>, y al final elige <b>CSV</b> o <b>Microsoft Excel (.xlsx)</b> y
              pulsa <b>Descargar</b>.
            </li>
            <li>Carga aquí el archivo descargado.</li>
          </ol>
          <FileDropzone
            accept=".csv,.txt,.xlsx,.xls,.ods"
            label="Arrastra o selecciona el archivo de registros (.csv, .xlsx)"
            hint="El ID de usuario se toma de la columna “Descripción”. El archivo se procesa solo en tu navegador."
            onFileSelected={handleFileSelected}
          />
          {isLoading && (
            <p className="text-muted-foreground animate-pulse text-sm" role="status">
              Procesando el archivo… con registros muy grandes puede tardar unos segundos.
            </p>
          )}
          {fileError && (
            <Alert variant="destructive">
              <AlertTitle>Error al leer el archivo</AlertTitle>
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}
          {logs && !fileError && (
            <Alert>
              <AlertTitle>
                “{fileName}”: {logs.rows.length.toLocaleString("es-CO")} registros leídos
              </AlertTitle>
              <AlertDescription>
                {logs.badDates > 0 && (
                  <p>{logs.badDates.toLocaleString("es-CO")} filas con fecha no reconocida se omitieron.</p>
                )}
                {notes.length > 0 && <p>Nota: {notes.join("; ")}.</p>}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {logs && (
        <Card id="step-parametros">
          <CardHeader>
            <CardTitle className="text-base">2. Parámetros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ded-gap">Tiempo máximo entre clics (min)</Label>
                <Input
                  id="ded-gap"
                  type="number"
                  min={1}
                  max={600}
                  value={params.maxGapMin}
                  onChange={(e) => updateParam("maxGapMin", Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ded-min">Ignorar sesiones menores a (min)</Label>
                <Input
                  id="ded-min"
                  type="number"
                  min={0}
                  max={120}
                  value={params.minSessionMin}
                  onChange={(e) => updateParam("minSessionMin", Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ded-from">Desde</Label>
                <Input id="ded-from" type="date" value={params.from} onChange={(e) => updateParam("from", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ded-to">Hasta</Label>
                <Input id="ded-to" type="date" value={params.to} onChange={(e) => updateParam("to", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="ded-exclude">Excluir participantes (nombres o correos separados por coma)</Label>
                <Input
                  id="ded-exclude"
                  value={params.exclude}
                  onChange={(e) => updateParam("exclude", e.target.value)}
                  placeholder="Ej.: nombre del docente, administrador"
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Valores por defecto iguales a los del bloque Course Dedication: 60 min entre clics y sesiones de al menos
              1 min. Los cambios recalculan al instante.
            </p>
          </CardContent>
        </Card>
      )}

      {logs && (
        <Card id="step-resultados">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">3. Dedicación por participante</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={results.length === 0}>
                  <Download className="size-4" />
                  Exportar
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCsv}>
                  <FileText />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXlsx}>
                  <FileSpreadsheet />
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className={`flex flex-col gap-4 transition-opacity ${isRecalculating ? "opacity-60" : ""}`}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Participantes" value={results.length.toLocaleString("es-CO")} />
              <StatTile label="Dedicación total" value={formatDuration(totalMs)} />
              <StatTile
                label="Promedio por participante"
                value={results.length ? formatDuration(totalMs / results.length) : "—"}
              />
              <StatTile label="Registros analizados" value={totalClicks.toLocaleString("es-CO")} />
            </div>

            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar participante, correo o ID"
              aria-label="Buscar participante"
              className="max-w-sm"
            />

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    {COLUMNS.map((col) => {
                      const active = sort.key === col.key;
                      return (
                        <TableHead
                          key={col.key}
                          className={col.numeric ? "text-right" : undefined}
                          aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className="inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            {col.label}
                            {active && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                          </button>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length + 1} className="text-muted-foreground h-24 text-center">
                        No hay participantes con registros en el rango y filtros elegidos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map((r) => {
                      const open = openKey === r.key;
                      return (
                        <Fragment key={r.key}>
                          <TableRow
                            tabIndex={0}
                            aria-expanded={open}
                            className="cursor-pointer"
                            data-state={open ? "selected" : undefined}
                            onClick={() => setOpenKey(open ? null : r.key)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setOpenKey(open ? null : r.key);
                              }
                            }}
                          >
                            <TableCell>
                              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </TableCell>
                            <TableCell className="min-w-44 whitespace-normal">{r.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.id || "—"}</TableCell>
                            <TableCell>{r.email || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              <div className="flex items-center justify-end gap-2">
                                {formatDuration(r.total)}
                                <span aria-hidden className="bg-muted h-1.5 w-20 shrink-0 overflow-hidden rounded-full">
                                  <span
                                    className="bg-primary block h-full"
                                    style={{ width: `${(r.total / maxTotal) * 100}%` }}
                                  />
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{r.sessionCount}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.sessionCount ? formatDuration(r.avg) : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{r.days}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.days ? formatDecimal(r.perDay) : "—"}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap tabular-nums">
                              {formatDateTime(r.last)}
                            </TableCell>
                          </TableRow>
                          {open && (
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                              <TableCell colSpan={COLUMNS.length + 1} className="whitespace-normal">
                                <div className="flex flex-col gap-2 py-1">
                                  <p className="text-sm font-medium">Sesiones de {r.name}</p>
                                  {r.sessions.length === 0 ? (
                                    <p className="text-muted-foreground text-xs">
                                      Este participante solo tiene sesiones más cortas que el mínimo configurado.
                                    </p>
                                  ) : (
                                    <div className="bg-card overflow-x-auto rounded-md border">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Inicio</TableHead>
                                            <TableHead className="text-right">Fin</TableHead>
                                            <TableHead className="text-right">Duración</TableHead>
                                            <TableHead className="text-right">Clics</TableHead>
                                            <TableHead>IP</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {[...r.sessions].reverse().map((s) => (
                                            <TableRow key={s.start}>
                                              <TableCell>{formatDate(s.start)}</TableCell>
                                              <TableCell className="text-right tabular-nums">{formatTime(s.start)}</TableCell>
                                              <TableCell className="text-right tabular-nums">{formatTime(s.end)}</TableCell>
                                              <TableCell className="text-right tabular-nums">{formatDuration(s.dur)}</TableCell>
                                              <TableCell className="text-right tabular-nums">{s.clicks}</TableCell>
                                              <TableCell>{s.ip || "—"}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-muted-foreground text-xs">
              Haz clic en una fila para ver las sesiones detalladas del participante (inicio, fin, duración, IP y número
              de clics).
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo se calcula</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground flex max-w-3xl flex-col gap-2 text-sm">
          <p>
            Cada registro de Moodle es un clic. Los clics de un participante se ordenan por hora y se agrupan en{" "}
            <b>sesiones</b>: mientras entre un clic y el siguiente pasen menos minutos que el “tiempo máximo entre
            clics”, siguen en la misma sesión. La duración de una sesión va del primer al último clic. Las sesiones más
            cortas que el mínimo (incluidas las de un solo clic) no cuentan.
          </p>
          <p>
            La dedicación total es la suma de las sesiones. Es una estimación: Moodle no sabe cuánto tiempo pasa alguien
            leyendo en una misma página, así que el último tramo de cada sesión no se cuenta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
