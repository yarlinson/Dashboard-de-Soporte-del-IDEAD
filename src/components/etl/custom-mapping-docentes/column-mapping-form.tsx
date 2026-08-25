"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleMappingForm } from "@/components/etl/docentes-siau/role-mapping-form";
import { extractDistinctColumnValues } from "@/lib/etl/core/csv";
import { parseCourseCodes, splitFullName } from "@/lib/etl/core/moodle";
import type { ColumnMappingDocenteDraft } from "@/lib/etl/custom-mapping-docentes/schema";
import type { MappingSuggestions } from "@/lib/etl/custom-mapping-docentes/column-suggestions";

const FIXED_ROLE_OPTIONS = ["docenteoplanta", "docenteocasionaltc", "docenteocatedratico"];
const CUSTOM_ROLE_SENTINEL = "__custom__";

interface ColumnMappingDocenteFormProps {
  sourceColumns: string[];
  sourceRows: Record<string, unknown>[];
  previewRow?: Record<string, unknown>;
  value: ColumnMappingDocenteDraft;
  onChange: (value: ColumnMappingDocenteDraft) => void;
  suggestions?: MappingSuggestions;
}

export function ColumnMappingDocenteForm({
  sourceColumns,
  sourceRows,
  previewRow,
  value,
  onChange,
  suggestions,
}: ColumnMappingDocenteFormProps) {
  function set<K extends keyof ColumnMappingDocenteDraft>(key: K, next: ColumnMappingDocenteDraft[K]) {
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
  leafValues.push(value.roleMode === "fixed" ? value.fixedRole : value.roleColumn);
  const filledCount = leafValues.filter((v) => v.trim().length > 0).length;
  const totalCount = leafValues.length;

  const fullNamePreview = previewFor(value.fullNameColumn);
  const distinctRoleValues =
    value.roleMode === "column" && value.roleColumn ? extractDistinctColumnValues(sourceRows, value.roleColumn) : [];

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
          <Label className="text-sm font-medium">Cursos a asignar</Label>
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
              El origen no trae códigos de asignatura. Estos códigos se aplicarán a{" "}
              <strong>todos</strong> los docentes procesados, separados por comas.
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

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-sm font-medium">Rol / Vinculación</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={value.roleMode === "fixed" ? "default" : "outline"}
              onClick={() => set("roleMode", "fixed")}
            >
              Un solo rol para todos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={value.roleMode === "column" ? "default" : "outline"}
              onClick={() => set("roleMode", "column")}
            >
              Columna de vinculación/rol
            </Button>
          </div>
        </div>

        {value.roleMode === "fixed" ? (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">
              El origen no distingue tipo de vinculación. Este rol Moodle se aplicará a{" "}
              <strong>todos</strong> los docentes procesados.
            </p>
            <FixedRoleSelector value={value.fixedRole} onChange={(v) => set("fixedRole", v)} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <FieldConnector
              targetLabel="vinculación"
              columns={sourceColumns}
              value={value.roleColumn}
              onChange={(v) => set("roleColumn", v)}
              previewValue={previewFor(value.roleColumn)}
              suggested={isSuggested("roleColumn", value.roleColumn)}
            />
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs">
                Edita, agrega o quita equivalencias según los valores de vinculación de tu origen.
              </p>
              <RoleMappingForm
                value={value.roleMapping}
                onChange={(roleMapping) => set("roleMapping", roleMapping)}
                distinctVinculaciones={distinctRoleValues}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface FixedRoleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

/** Select of common Moodle roles plus a "Personalizado…" escape hatch: picking it reveals a free-text
 * input (same live-typing pattern as the manual course-codes field) so a role outside the defaults
 * can be entered without blocking on a code change. Custom mode is tracked as its own local state
 * (not derived from `value`) so clearing the field to start typing doesn't immediately look like
 * "no custom role chosen" and collapse the input back into the preset list. */
function FixedRoleSelector({ value, onChange }: FixedRoleSelectorProps) {
  const [customMode, setCustomMode] = useState(() => value !== "" && !FIXED_ROLE_OPTIONS.includes(value));
  const selectValue = customMode ? CUSTOM_ROLE_SENTINEL : value;

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === CUSTOM_ROLE_SENTINEL) {
            setCustomMode(true);
          } else {
            setCustomMode(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder="Rol Moodle…" />
        </SelectTrigger>
        <SelectContent>
          {FIXED_ROLE_OPTIONS.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_ROLE_SENTINEL}>Personalizado…</SelectItem>
        </SelectContent>
      </Select>
      {customMode && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ej. docenteinvitado"
          className="w-full font-mono text-sm sm:w-64"
          autoFocus
        />
      )}
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
