import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface ToolRowProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  flow: { from: string; to: string };
  /** Posición en la lista del inicio; escalona la animación de la línea de flujo. */
  index: number;
}

function FlowCell({ children, tone }: { children: ReactNode; tone: "source" | "target" }) {
  return (
    <span
      className={cn(
        "font-mono max-w-full truncate rounded-sm border px-2 py-1 text-xs",
        tone === "source"
          ? "border-border bg-muted text-muted-foreground"
          : "border-unillanos-red-dark/40 bg-unillanos-red-dark/8 text-foreground"
      )}
    >
      {children}
    </span>
  );
}

/**
 * Fila de una herramienta en el inicio. Lo que la distingue es el "flujo": qué columnas entran y cuáles
 * salen, con sus nombres reales. La línea que los une se dibuja una sola vez al cargar la página.
 */
export function ToolRow({ href, title, description, icon, flow, index }: ToolRowProps) {
  return (
    <li className="border-border border-b last:border-b-0">
      <Link
        href={href}
        className="group hover:bg-card -mx-3 flex flex-col gap-3 rounded-md px-3 py-4 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="text-unillanos-red mt-0.5 shrink-0">{icon}</span>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-foreground font-medium leading-snug group-hover:underline group-hover:underline-offset-4">
              {title}
            </h3>
            <p className="text-muted-foreground max-w-[62ch] text-sm leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center pl-8" aria-label={`Entra ${flow.from}; sale ${flow.to}`}>
          <FlowCell tone="source">{flow.from}</FlowCell>
          <span
            aria-hidden
            className="bg-unillanos-red-dark/60 motion-safe:animate-[flow-draw_700ms_ease-out_both] h-px min-w-6 flex-1 origin-left"
            style={{ animationDelay: `${index * 90}ms`, maxWidth: "5rem" }}
          />
          <FlowCell tone="target">{flow.to}</FlowCell>
        </div>
      </Link>
    </li>
  );
}
