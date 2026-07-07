"use client";

import { Clock, Sun, Sunset, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlotGroup, SlotInfo } from "@/lib/scheduling";

// ---------------------------------------------------------------------------
// Tipos del componente
// ---------------------------------------------------------------------------

interface TimeSlotPickerProps {
  /** Grupos de slots agrupados por período del día (del API: groups) */
  groups: SlotGroup[];
  /** Slots planos como fallback si groups está vacío */
  slots?: string[];
  /** Tiempo seleccionado actualmente ("HH:MM") */
  selected: string;
  /** Callback al seleccionar un horario */
  onSelect: (time: string) => void;
  /** Estado de carga */
  loading?: boolean;
  /** Duración del servicio en minutos — se muestra como badge en cada slot */
  serviceDuration?: number;
  /** Mensaje personalizado cuando no hay slots */
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// Helpers locales
// ---------------------------------------------------------------------------

const periodIcons = {
  morning:   <Sun     className="w-3.5 h-3.5" />,
  afternoon: <Sunset  className="w-3.5 h-3.5" />,
  evening:   <Moon    className="w-3.5 h-3.5" />,
};

const periodColors = {
  morning:   "text-amber-400",
  afternoon: "text-orange-400",
  evening:   "text-indigo-400",
};

/** Convierte "HH:MM" → "8:00 am" cuando no viene un displayTime del API */
function formatDisplay(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "pm" : "am";
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${mStr} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Skeletons de carga
// ---------------------------------------------------------------------------
function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {[1, 2].map((section) => (
        <div key={section} className="space-y-3">
          {/* Sección header */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-white/10" />
            <div className="h-3 w-16 rounded bg-white/10" />
            <div className="h-3 w-8 rounded-full bg-white/5 ml-1" />
          </div>
          {/* Grid de slots */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: section === 1 ? 6 : 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-white/5"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot individual
// ---------------------------------------------------------------------------
interface SlotButtonProps {
  time: string;
  displayTime: string;
  isSelected: boolean;
  serviceDuration?: number;
  onClick: () => void;
}

function SlotButton({ time, displayTime, isSelected, serviceDuration, onClick }: SlotButtonProps) {
  return (
    <button
      id={`slot-${time.replace(":", "-")}`}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Seleccionar horario ${displayTime}${serviceDuration ? `, duración ${serviceDuration} min` : ""}`}
      className={cn(
        // Base
        "relative flex flex-col items-center justify-center gap-1 h-16 rounded-2xl",
        "border-2 transition-all duration-200 active:scale-95 overflow-hidden",
        "text-sm font-black",
        // Estado no seleccionado
        !isSelected && [
          "border-primary/30 text-primary",
          "hover:border-primary hover:bg-primary/10 hover:scale-[1.03]",
          "bg-white/[0.03]",
        ],
        // Estado seleccionado
        isSelected && [
          "border-primary bg-primary text-white",
          "shadow-lg shadow-primary/30 scale-105",
          "ring-2 ring-primary/20 ring-offset-1 ring-offset-transparent",
        ]
      )}
    >
      {/* Glow de fondo cuando está seleccionado */}
      {isSelected && (
        <span className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 opacity-50 pointer-events-none" />
      )}

      {/* Hora principal */}
      <span className="relative z-10 tracking-tight leading-none">{displayTime}</span>

      {/* Badge de duración */}
      {serviceDuration != null && (
        <span
          className={cn(
            "relative z-10 text-[9px] font-bold uppercase tracking-widest leading-none px-1.5 py-0.5 rounded-full",
            isSelected
              ? "bg-white/20 text-white"
              : "bg-primary/10 text-primary/70"
          )}
        >
          {serviceDuration} min
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function TimeSlotPicker({
  groups,
  slots = [],
  selected,
  onSelect,
  loading = false,
  serviceDuration,
  emptyMessage = "No hay horarios disponibles para este día.",
}: TimeSlotPickerProps) {
  // ── Estado de carga ──────────────────────────────────────────────────────
  if (loading) {
    return <LoadingSkeleton />;
  }

  // ── Sin datos ────────────────────────────────────────────────────────────
  //    Puede llegar con `groups` vacío pero `slots` con data (API legacy)
  const hasGroups = groups && groups.length > 0;
  const hasLegacySlots = !hasGroups && slots.length > 0;

  if (!hasGroups && !hasLegacySlots) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4",
          "p-10 rounded-[32px] border border-white/5",
          "bg-zinc-900/30 text-center"
        )}
      >
        <Clock className="w-10 h-10 text-zinc-600 animate-pulse" />
        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest max-w-[240px] leading-relaxed">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // ── Render de una sección de período ─────────────────────────────────────
  const renderGroup = (group: SlotGroup) => (
    <div key={group.period} className="space-y-3">
      {/* Header del período */}
      <div className="flex items-center gap-2 ml-1">
        <span className={cn("flex items-center gap-1.5", periodColors[group.period])}>
          {periodIcons[group.period]}
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
            {group.label}
          </span>
        </span>
        <span
          className={cn(
            "text-[9px] font-black px-2 py-0.5 rounded-full",
            "bg-white/5 text-zinc-500 uppercase tracking-widest"
          )}
        >
          {group.slots.length} {group.slots.length === 1 ? "espacio" : "espacios"}
        </span>
      </div>

      {/* Grilla de slots */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {group.slots.map((slot) => (
          <SlotButton
            key={slot.time}
            time={slot.time}
            displayTime={slot.displayTime ?? formatDisplay(slot.time)}
            isSelected={selected === slot.time}
            serviceDuration={serviceDuration}
            onClick={() => onSelect(slot.time)}
          />
        ))}
      </div>
    </div>
  );

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {hasGroups ? (
        // Versión mejorada: agrupada por período
        groups.map(renderGroup)
      ) : (
        // Versión legacy: lista plana (compatibilidad hacia atrás)
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {slots.map((time) => (
            <SlotButton
              key={time}
              time={time}
              displayTime={formatDisplay(time)}
              isSelected={selected === time}
              serviceDuration={serviceDuration}
              onClick={() => onSelect(time)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
