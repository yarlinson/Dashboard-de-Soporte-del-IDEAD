"use client";

import { useCallback, useRef, useState } from "react";
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
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragging ? "border-primary bg-accent" : "border-muted-foreground/25"
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
      role="button"
      tabIndex={0}
    >
      <p className="text-sm font-medium">{fileName ?? label}</p>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
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
