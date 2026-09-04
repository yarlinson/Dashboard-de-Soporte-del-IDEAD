"use client";

import { Badge } from "@/components/ui/badge";

export type AvisosFilterValue = "all" | "clean" | "avisos";

interface DocenteAvisosFilterProps {
  value: AvisosFilterValue;
  onChange: (value: AvisosFilterValue) => void;
  cleanCount: number;
  avisosCount: number;
}

/** Single-select chip filter for the preview table: "Todos" / "Sin avisos" / "Con avisos". Only
 * controls what's displayed — export buttons for each segment are independent of this filter. */
export function DocenteAvisosFilter({ value, onChange, cleanCount, avisosCount }: DocenteAvisosFilterProps) {
  const options: { key: AvisosFilterValue; label: string }[] = [
    { key: "all", label: `Todos (${cleanCount + avisosCount})` },
    { key: "clean", label: `Sin avisos (${cleanCount})` },
    { key: "avisos", label: `Con avisos (${avisosCount})` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium">Filtrar por estado:</span>
      {options.map((opt) => (
        <Badge
          key={opt.key}
          variant={value === opt.key ? "default" : "outline"}
          className="cursor-pointer text-[11px]"
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </Badge>
      ))}
    </div>
  );
}
