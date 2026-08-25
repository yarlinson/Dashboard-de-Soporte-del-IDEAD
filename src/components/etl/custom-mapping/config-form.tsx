"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoodleConfigSchema, type MoodleConfig } from "@/lib/etl/core/moodle";

interface ConfigFormProps {
  value: MoodleConfig;
  onChange: (value: MoodleConfig) => void;
}

export function ConfigForm({ value, onChange }: ConfigFormProps) {
  const validation = MoodleConfigSchema.safeParse(value);
  const errorFor = (field: string) =>
    validation.success ? undefined : validation.error.issues.find((issue) => issue.path[0] === field)?.message;

  return (
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
            Los códigos de curso se exportarán tal como fueron mapeados/ingresados, sin sufijo.
          </p>
        )}
      </div>
    </div>
  );
}
