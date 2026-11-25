"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  accept?: string;
  label: string;
  hint?: string;
  onFileSelected: (file: File) => void;
}

export function FileDropzone({ accept = ".xlsx,.xls,.csv", label, hint, onFileSelected }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-start justify-center gap-1 rounded-md border border-dashed bg-muted/40 px-6 py-7 transition-colors",
        "hover:border-primary/60 hover:bg-muted focus-visible:border-primary",
        isDragging ? "border-primary bg-primary/10" : "border-input"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3">
        <FileSpreadsheet className={cn("size-6 shrink-0", fileName ? "text-success" : "text-muted-foreground")} aria-hidden />
        <p className="text-sm font-medium">{fileName ?? label}</p>
      </div>
      {hint && <p className="text-muted-foreground pl-9 text-xs">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
