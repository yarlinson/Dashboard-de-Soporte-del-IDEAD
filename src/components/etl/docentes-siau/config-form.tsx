"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RoleMappingForm } from "./role-mapping-form";
import { DocenteConfigSchema, type DocenteConfig } from "@/lib/etl/docentes-siau/schema";

interface ConfigFormProps {
  value: DocenteConfig;
  onChange: (value: DocenteConfig) => void;
  distinctVinculaciones?: string[];
}

export function ConfigForm({ value, onChange, distinctVinculaciones }: ConfigFormProps) {
  const validation = DocenteConfigSchema.safeParse(value);
  const errorFor = (field: string) =>
    validation.success ? undefined : validation.error.issues.find((issue) => issue.path[0] === field)?.message;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Contraseña genérica</Label>
          <Input
            value={value.genericPassword}
            onChange={(e) => onChange({ ...value, genericPassword: e.target.value })}
            placeholder="Ej. campusvirtualunillanos"
          />
          {errorFor("genericPassword") && <p className="text-destructive text-xs">{errorFor("genericPassword")}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>Sufijo de período académico</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {value.applyPeriodSuffix ? "Activado" : "Desactivado"}
              </span>
              <Switch
                checked={value.applyPeriodSuffix}
                onCheckedChange={(checked) => onChange({ ...value, applyPeriodSuffix: checked })}
              />
            </div>
          </div>
          <Input
            value={value.periodSuffix}
            onChange={(e) => onChange({ ...value, periodSuffix: e.target.value })}
            placeholder="Ej. /2026B"
            disabled={!value.applyPeriodSuffix}
          />
          {value.applyPeriodSuffix ? (
            errorFor("periodSuffix") && <p className="text-destructive text-xs">{errorFor("periodSuffix")}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Los códigos de curso se exportarán tal como vienen en CURSO, sin sufijo.
            </p>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>Equivalencias VINCULACION → Rol Moodle</Label>
        <p className="text-muted-foreground text-xs">
          Edita, agrega o quita reglas según los tipos de vinculación que use tu universidad.
        </p>
        <RoleMappingForm
          value={value.roleMapping}
          onChange={(roleMapping) => onChange({ ...value, roleMapping })}
          distinctVinculaciones={distinctVinculaciones}
        />
      </div>
    </div>
  );
}
