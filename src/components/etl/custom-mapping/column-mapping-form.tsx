"use client";

import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseCourseCodes, splitFullName } from "@/lib/etl/core/moodle";
import type { ColumnMappingDraft } from "@/lib/etl/custom-mapping/schema";
import type { MappingSuggestions } from "@/lib/etl/custom-mapping/column-suggestions";

interface ColumnMappingFormProps {
  sourceColumns: string[];
  previewRow?: Record<string, unknown>;
  value: ColumnMappingDraft;
  onChange: (value: ColumnMappingDraft) => void;
  suggestions?: MappingSuggestions;
}

export function ColumnMappingForm({
  sourceColumns,
  previewRow,
  value,
  onChange,
  suggestions,
}: ColumnMappingFormProps) {
  function set<K extends keyof ColumnMappingDraft>(key: K, next: ColumnMappingDraft[K]) {
    onChange({ ...value, [key]: next });
  }

  function previewFor(column: string): string | undefined {
    if (!column || !previewRow) return undefined;
    const raw = previewRow[column];
    return raw === undefined || raw === null || raw === "" ? undefined : String(raw);
  }

  function isSuggested(field: keyof MappingSuggestions, column: string): boolean {
    return !!column && suggestions?.[field]?.column === column;
  }

  const leafValues =
    value.nameMode === "full"
      ? [value.usernameColumn, value.emailColumn, value.fullNameColumn]
      : [value.usernameColumn, value.emailColumn, value.firstnameColumn, value.lastnameColumn];
  leafValues.push(value.courseMode === "manual" ? value.manualCourseCodes : value.coursesColumn);
  const filledCount = leafValues.filter((v) => v.trim().length > 0).length;
  const totalCount = leafValues.length;

  const fullNamePreview = previewFor(value.fullNameColumn);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Conecta cada columna de tu archivo con el campo correspondiente de Moodle.
        </p>
        <Badge variant={filledCount === totalCount ? "default" : "outline"}>
          {filledCount}/{totalCount} campos completos
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <FieldConnector
          targetLabel="username"
          columns={sourceColumns}
          value={value.usernameColumn}
          onChange={(v) => set("usernameColumn", v)}
          previewValue={previewFor(value.usernameColumn)}
          suggested={isSuggested("usernameColumn", value.usernameColumn)}
        />
        <FieldConnector
          targetLabel="email"
          columns={sourceColumns}
          value={value.emailColumn}
          onChange={(v) => set("emailColumn", v)}
          previewValue={previewFor(value.emailColumn)}
          suggested={isSuggested("emailColumn", value.emailColumn)}
        />
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-sm font-medium">Nombre</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={value.nameMode === "separate" ? "default" : "outline"}
              onClick={() => set("nameMode", "separate")}
            >
              Nombres y apellidos por separado
            </Button>
            <Button
              type="button"
              size="sm"
              variant={value.nameMode === "full" ? "default" : "outline"}
              onClick={() => set("nameMode", "full")}
            >
              Nombre completo (auto-separar)
            </Button>
          </div>
        </div>

        {value.nameMode === "separate" ? (
          <div className="flex flex-col gap-2">
            <FieldConnector
              targetLabel="firstname"
              columns={sourceColumns}
              value={value.firstnameColumn}
              onChange={(v) => set("firstnameColumn", v)}
              previewValue={previewFor(value.firstnameColumn)}
              suggested={isSuggested("firstnameColumn", value.firstnameColumn)}
            />
            <FieldConnector
              targetLabel="lastname"
              columns={sourceColumns}
              value={value.lastnameColumn}
              onChange={(v) => set("lastnameColumn", v)}
              previewValue={previewFor(value.lastnameColumn)}
              suggested={isSuggested("lastnameColumn", value.lastnameColumn)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <FieldConnector
              targetLabel="firstname + lastname"
              columns={sourceColumns}
              value={value.fullNameColumn}
              onChange={(v) => set("fullNameColumn", v)}
              previewValue={fullNamePreview}
              suggested={isSuggested("fullNameColumn", value.fullNameColumn)}
            />
            {fullNamePreview && <NameSplitPreview fullName={fullNamePreview} />}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-sm font-medium">Cursos a matricular</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={value.courseMode === "column" ? "default" : "outline"}
              onClick={() => set("courseMode", "column")}
            >
              Usar columna del origen
            </Button>
            <Button
              type="button"
              size="sm"
              variant={value.courseMode === "manual" ? "default" : "outline"}
              onClick={() => set("courseMode", "manual")}
            >
              Asignar cursos manualmente
            </Button>
          </div>
        </div>

        {value.courseMode === "column" ? (
          <FieldConnector
            targetLabel="cursos"
            columns={sourceColumns}
            value={value.coursesColumn}
            onChange={(v) => set("coursesColumn", v)}
            previewValue={previewFor(value.coursesColumn)}
            suggested={isSuggested("coursesColumn", value.coursesColumn)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">
              El origen no trae códigos de asignatura (ej. solo indica &quot;Semestre I&quot;). Estos códigos se
              aplicarán a <strong>todas</strong> las filas procesadas, separados por comas.
            </p>
            <Input
              value={value.manualCourseCodes}
              onChange={(e) => set("manualCourseCodes", e.target.value)}
              placeholder="Ej. 603701-1, 603702-1"
              className="font-mono text-sm"
            />
            {value.manualCourseCodes.trim() && (
              <div className="flex flex-wrap gap-1.5">
                {parseCourseCodes(value.manualCourseCodes).map((code) => (
                  <Badge key={code} variant="secondary" className="font-mono">
                    {code}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

interface FieldConnectorProps {
  targetLabel: string;
  columns: string[];
  value: string;
  onChange: (value: string) => void;
  previewValue?: string;
  suggested?: boolean;
}

function FieldConnector({ targetLabel, columns, value, onChange, previewValue, suggested }: FieldConnectorProps) {
  const filled = value.length > 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="min-w-0 flex-1">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Columna de origen…" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((col) => (
              <SelectItem key={col} value={col}>
                {col}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filled && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Ejemplo: <span className="font-mono text-foreground">{previewValue ?? "—"}</span>
          </p>
        )}
      </div>
      <ArrowRight className="text-muted-foreground size-4 shrink-0" />
      {filled && suggested && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Sugerido
        </Badge>
      )}
      <Badge variant={filled ? "default" : "outline"} className="min-w-28 shrink-0 justify-center font-mono">
        {targetLabel}
      </Badge>
      {filled ? (
        <CheckCircle2 className="text-primary size-4 shrink-0" />
      ) : (
        <Circle className="text-muted-foreground size-4 shrink-0" />
      )}
    </div>
  );
}

function NameSplitPreview({ fullName }: { fullName: string }) {
  const { firstname, lastname } = splitFullName(fullName);
  const incomplete = !firstname || !lastname;
  return (
    <div className="flex flex-wrap items-center gap-2 pl-1 text-xs">
      <span className="text-muted-foreground">Vista previa del split:</span>
      <Badge variant="outline" className="font-mono">
        {firstname || "—"}
      </Badge>
      <span className="text-muted-foreground">/</span>
      <Badge variant="outline" className="font-mono">
        {lastname || "—"}
      </Badge>
      {incomplete && <span className="text-destructive">Quedó incompleto, revisa la previsualización</span>}
    </div>
  );
}
