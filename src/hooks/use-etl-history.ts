"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "idead-etl-history";
const MAX_ENTRIES = 50;

export interface EtlRunRecord {
  id: string;
  caseId: string;
  caseLabel: string;
  /** ISO 8601 */
  timestamp: string;
  totalRows: number;
  validRows: number;
}

function readHistory(): EtlRunRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EtlRunRecord[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: EtlRunRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage puede no estar disponible (modo privado/cuota llena); se omite en silencio.
  }
}

/**
 * Historial local de corridas ETL (sin backend: todo vive en localStorage
 * del navegador). Cada herramienta llama a `recordRun` al exportar; el home
 * lo lee para alimentar `StatsOverview` y el gráfico de distribución.
 */
export function useEtlHistory() {
  const [history, setHistory] = useState<EtlRunRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHistory(readHistory());
    setIsLoaded(true);
  }, []);

  const recordRun = useCallback((entry: Omit<EtlRunRecord, "id" | "timestamp">) => {
    const record: EtlRunRecord = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, MAX_ENTRIES);
      writeHistory(next);
      return next;
    });
  }, []);

  return { history, isLoaded, recordRun };
}
