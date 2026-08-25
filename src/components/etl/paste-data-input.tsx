"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PasteDataInputProps {
  label: string;
  hint?: string;
  onDataPasted: (text: string) => void;
}

export function PasteDataInput({ label, hint, onDataPasted }: PasteDataInputProps) {
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={label}
        rows={8}
        className="font-mono text-xs"
      />
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      <Button onClick={() => onDataPasted(text)} disabled={!text.trim()} className="self-start">
        Procesar texto
      </Button>
    </div>
  );
}
