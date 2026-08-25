"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoleMappingRule } from "@/lib/etl/docentes-siau/schema";

interface RoleMappingFormProps {
  value: RoleMappingRule[];
  onChange: (value: RoleMappingRule[]) => void;
  /** Distinct VINCULACION values seen in the uploaded file, used to flag ones with no rule yet. */
  distinctVinculaciones?: string[];
}

export function RoleMappingForm({ value, onChange, distinctVinculaciones = [] }: RoleMappingFormProps) {
  function updateRule(index: number, patch: Partial<RoleMappingRule>) {
    onChange(value.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  }

  function removeRule(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addRule(vinculacion = "") {
    onChange([...value, { vinculacion, role: "" }]);
  }

  const mappedKeys = new Set(value.map((rule) => rule.vinculacion.trim().toUpperCase()).filter(Boolean));
  const unmapped = distinctVinculaciones.filter((v) => !mappedKeys.has(v.trim().toUpperCase()));

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vinculación (SIAU)</TableHead>
              <TableHead>Rol Moodle</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground h-16 text-center">
                  Sin equivalencias configuradas.
                </TableCell>
              </TableRow>
            ) : (
              value.map((rule, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={rule.vinculacion}
                      onChange={(e) => updateRule(index, { vinculacion: e.target.value })}
                      placeholder="Ej. PLANTA-TC"
                      className="font-mono text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={rule.role}
                      onChange={(e) => updateRule(index, { role: e.target.value })}
                      placeholder="Ej. docenteoplanta"
                      className="font-mono text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(index)}
                      aria-label="Eliminar equivalencia"
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => addRule()}>
        <Plus className="size-4" />
        Agregar equivalencia
      </Button>

      {unmapped.length > 0 && (
        <div className="border-warning/40 bg-warning/10 flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-warning text-xs font-medium">
            Vinculaciones del archivo sin rol configurado:
          </p>
          <div className="flex flex-wrap gap-2">
            {unmapped.map((v) => (
              <Badge
                key={v}
                variant="outline"
                className="border-warning/50 bg-warning/15 text-warning hover:bg-warning/25 cursor-pointer gap-1"
                onClick={() => addRule(v)}
              >
                {v}
                <Plus className="size-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
