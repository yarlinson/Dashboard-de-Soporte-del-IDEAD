"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface QuickActionCardProps {
  href: string;
  title: string;
  description: string;
  /** Icono ya renderizado (ej. `<ArrowRightLeft className="size-5" />`), no el componente sin invocar. */
  icon: ReactNode;
  /** Etiqueta opcional, ej. "Frecuente" o "Nuevo". */
  badge?: string;
  className?: string;
}

/**
 * Tarjeta de acceso rápido a una herramienta ETL, usada en el home. Envuelve
 * el `Link` de Next.js con un resplandor rojo institucional (visible al
 * pasar el cursor) y micro-interacciones con framer-motion.
 */
export function QuickActionCard({
  href,
  title,
  description,
  icon,
  badge,
  className,
}: QuickActionCardProps) {
  return (
    <motion.div
      initial={false}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      className={cn("group relative", className)}
    >
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        variants={{ hover: { opacity: 1 } }}
        transition={{ duration: 0.25 }}
        className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-br from-unillanos-red-dark/40 via-unillanos-red/10 to-transparent blur-md"
      />

      <Link
        href={href}
        className={cn(
          "relative flex h-full flex-col gap-3 rounded-xl border border-border/80 p-5",
          "bg-card/60 backdrop-blur-sm supports-[backdrop-filter]:bg-card/40",
          "shadow-sm transition-colors duration-200",
          "hover:border-unillanos-red-dark/70",
          "hover:shadow-[0_0_0_1px_rgba(211,6,20,0.25),0_8px_30px_-8px_rgba(211,6,20,0.35)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unillanos-red-dark focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <motion.span
            variants={{ hover: { scale: 1.08, rotate: -4 } }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-unillanos-red-dark/10 text-unillanos-red ring-1 ring-unillanos-red-dark/20"
          >
            {icon}
          </motion.span>

          {badge ? (
            <Badge variant="outline" className="border-unillanos-red-dark/30 text-unillanos-red-dark">
              {badge}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-foreground font-medium leading-snug">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>

        <div className="text-unillanos-red-dark mt-auto flex items-center gap-1 text-sm font-medium">
          Abrir herramienta
          <motion.span
            variants={{ hover: { x: 4 } }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ArrowRight className="size-4" />
          </motion.span>
        </div>
      </Link>
    </motion.div>
  );
}
