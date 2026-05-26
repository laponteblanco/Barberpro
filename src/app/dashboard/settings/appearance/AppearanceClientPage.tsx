"use client";

import { useState } from "react";
import { ArrowLeft, Check, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { updateThemeAction } from "./actions";

export default function AppearanceClientPage({ currentTheme }: { currentTheme: "dark" | "light" }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "light">(currentTheme || "dark");

  const handleSave = async () => {
    if (selectedTheme === currentTheme) return;
    try {
      setIsSubmitting(true);
      await updateThemeAction(selectedTheme);
      // Let the revalidatePath do the rest
      window.location.reload();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/settings"
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Apariencia</h1>
            <p className="text-muted-foreground text-sm">Personaliza los colores de tu portal</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSubmitting || selectedTheme === currentTheme}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>

      <div className="glass-card rounded-[32px] p-8 border border-white/5 space-y-8">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Tema del Sistema</h2>
            <p className="text-sm text-zinc-500">Selecciona la paleta de colores para todos los usuarios de tu barbería.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opción Dark */}
            <div 
              onClick={() => setSelectedTheme("dark")}
              className={cn(
                "relative group cursor-pointer rounded-2xl border-2 transition-all overflow-hidden",
                selectedTheme === "dark" ? "border-primary" : "border-zinc-800 hover:border-zinc-700"
              )}
            >
              <div className="h-32 bg-zinc-950 flex flex-col items-center justify-center relative p-4 gap-3">
                <div className="absolute top-3 right-3">
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", selectedTheme === "dark" ? "border-primary bg-primary text-black" : "border-zinc-600")}>
                    {selectedTheme === "dark" && <Check className="w-3 h-3" />}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#18181b] border border-white/10 flex items-center justify-center shadow-lg">
                  <Moon className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="w-full space-y-2">
                  <div className="h-2 w-1/3 bg-white/10 rounded-full mx-auto" />
                  <div className="h-2 w-1/2 bg-yellow-500/50 rounded-full mx-auto" />
                </div>
              </div>
              <div className="p-4 bg-zinc-900 border-t border-white/5">
                <p className="font-bold text-white text-center">Negro con Amarillo</p>
                <p className="text-xs text-zinc-500 text-center mt-1">Elegante y oscuro (Por Defecto)</p>
              </div>
            </div>

            {/* Opción Light */}
            <div 
              onClick={() => setSelectedTheme("light")}
              className={cn(
                "relative group cursor-pointer rounded-2xl border-2 transition-all overflow-hidden bg-white",
                selectedTheme === "light" ? "border-blue-600" : "border-zinc-200 hover:border-zinc-300"
              )}
            >
              <div className="h-32 bg-[#f8fafc] flex flex-col items-center justify-center relative p-4 gap-3">
                <div className="absolute top-3 right-3">
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", selectedTheme === "light" ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300")}>
                    {selectedTheme === "light" && <Check className="w-3 h-3" />}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-white border border-zinc-200 flex items-center justify-center shadow-lg">
                  <Sun className="w-6 h-6 text-blue-600" />
                </div>
                <div className="w-full space-y-2">
                  <div className="h-2 w-1/3 bg-zinc-200 rounded-full mx-auto" />
                  <div className="h-2 w-1/2 bg-blue-600/50 rounded-full mx-auto" />
                </div>
              </div>
              <div className="p-4 bg-white border-t border-zinc-100">
                <p className="font-bold text-slate-900 text-center">Blanco con Azul</p>
                <p className="text-xs text-slate-500 text-center mt-1">Limpio y profesional</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
