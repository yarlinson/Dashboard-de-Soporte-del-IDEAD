"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type EtlStepStatus = "complete" | "active" | "pending";

export interface EtlStepperStep {
  /** id del elemento del DOM (la Card del paso) al que se hace scroll al hacer clic. */
  id: string;
  label: string;
  status: EtlStepStatus;
}

function scrollToStep(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Indicador horizontal de progreso, aditivo sobre la pila vertical de Cards
 * numeradas que ya usan los flujos ETL — no reemplaza esa pila (permite
 * volver a subir un archivo o ajustar la configuración sin perder el lugar),
 * solo refleja el estado que cada workflow ya deriva de su propio state.
 */
export function EtlStepper({ steps }: { steps: EtlStepperStep[] }) {
  return (
    <ol className="flex items-center gap-1.5 sm:gap-3" aria-label="Progreso de la transformación">
      {steps.map((step, index) => (
        <li key={step.id} aria-current={step.status === "active" ? "step" : undefined} className="flex flex-1 items-center gap-1.5 last:flex-none sm:gap-3">
          <button
            type="button"
            onClick={() => scrollToStep(step.id)}
            className="flex shrink-0 items-center gap-2 rounded-sm text-left"
          >
            <span
              className={cn(
                "type-display flex size-7 shrink-0 items-center justify-center rounded-sm border text-sm",
                step.status === "complete" && "border-unillanos-red-dark bg-unillanos-red-dark text-white",
                step.status === "active" && "border-unillanos-red-dark bg-unillanos-red-dark/10 text-unillanos-red",
                step.status === "pending" && "border-border text-muted-foreground"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {step.status === "complete" ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex"
                  >
                    <Check className="size-3.5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="num"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {index + 1}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <span
              className={cn(
                "hidden text-sm font-medium sm:inline",
                step.status === "pending" ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {step.label}
            </span>
          </button>

          {index < steps.length - 1 && (
            <span aria-hidden className="bg-border relative h-px min-w-4 flex-1 overflow-hidden">
              <motion.span
                className="bg-unillanos-red-dark absolute inset-y-0 left-0"
                initial={false}
                animate={{ width: step.status === "complete" ? "100%" : "0%" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
