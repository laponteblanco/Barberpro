"use client";

import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

interface CopyLinkButtonProps {
  link: string;
}

export function CopyLinkButton({ link }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
        copied 
          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
          : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/20"
      }`}
    >
      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Enlace copiado!" : "Copiar mi link de reserva"}
    </button>
  );
}
