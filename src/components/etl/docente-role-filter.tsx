"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DocenteRoleFilterProps {
  /** Distinct roles available to filter by, e.g. the roles present in the current (unfiltered) rows. */
  roles: string[];
  selected: Set<string>;
  onToggle: (role: string) => void;
  onClear: () => void;
}

/** Toggle-chip filter shared by docentes-siau and custom-mapping-docentes: click a role to keep only
 * docentes with at least one course assigned to it; click again (or "Limpiar filtro") to remove the
 * restriction. No selection means every docente is shown/exported. */
export function DocenteRoleFilter({ roles, selected, onToggle, onClear }: DocenteRoleFilterProps) {
  if (roles.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium">Filtrar por vinculación:</span>
      {roles.map((role) => (
        <Badge
          key={role}
          variant={selected.has(role) ? "default" : "outline"}
          className="cursor-pointer font-mono text-[11px]"
          onClick={() => onToggle(role)}
        >
          {role}
        </Badge>
      ))}
      {selected.size > 0 && (
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>
          Limpiar filtro
        </Button>
      )}
    </div>
  );
}
