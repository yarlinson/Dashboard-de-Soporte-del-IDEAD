import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Encabezado común de cada pantalla: título en Archivo condensada y una descripción corta con medida
 * de línea acotada. Sustituye el bloque h1 + p que cada página repetía por su cuenta.
 */
export function PageHeader({
  title,
  children,
  className,
}: {
  title: string
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      <h1 className="type-display text-foreground text-balance text-3xl">{title}</h1>
      {children ? (
        <p className="text-muted-foreground max-w-[68ch] text-[15px] leading-relaxed">{children}</p>
      ) : null}
    </header>
  )
}
