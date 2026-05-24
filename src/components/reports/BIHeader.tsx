"use client";

import { Calendar, Download, ChevronDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

const ranges = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Esta Semana" },
  { id: "month", label: "Este Mes" },
];

export function BIHeader({ currentRange, currentDate }: { currentRange: string, currentDate?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const dateObj = currentDate && isValid(parseISO(currentDate)) ? parseISO(currentDate) : new Date();

  const handleRangeChange = (rangeId: string) => {
    setIsOpen(false);
    router.push(`/dashboard/reports?range=${rangeId}`);
  };

  const handlePrevDay = () => {
    const prevDay = format(subDays(dateObj, 1), 'yyyy-MM-dd');
    router.push(`/dashboard/reports?date=${prevDay}`);
  };

  const handleNextDay = () => {
    const nextDay = format(addDays(dateObj, 1), 'yyyy-MM-dd');
    router.push(`/dashboard/reports?date=${nextDay}`);
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      router.push(`/dashboard/reports?date=${selectedDate}`);
    }
  };

  const selectedRange = ranges.find(r => r.id === currentRange) || ranges[2];
  const displayLabel = currentDate 
    ? format(dateObj, "d 'de' MMMM", { locale: es })
    : selectedRange.label;

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-8 bg-amber-500 rounded-full" />
          <h1 className="text-4xl font-black text-white tracking-tight">Business Intelligence</h1>
        </div>
        <p className="text-zinc-500 text-sm font-medium ml-5">Analítica avanzada y salud financiera de tu negocio</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Navegación Diaria */}
        <div className="flex items-center bg-zinc-900 border border-white/5 rounded-2xl h-12 px-1">
          <button 
            onClick={handlePrevDay}
            className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all active:scale-90"
            title="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="relative px-2">
            <button 
              onClick={() => dateInputRef.current?.showPicker()}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-xl transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500/70" />
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest min-w-[80px] text-center">
                {displayLabel}
              </span>
            </button>
            <input 
              ref={dateInputRef}
              type="date" 
              className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
              onChange={handleDateSelect}
              value={currentDate || format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <button 
            onClick={handleNextDay}
            className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all active:scale-90"
            title="Siguiente día"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Rango */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="h-12 px-5 bg-zinc-900 border border-white/5 rounded-2xl flex items-center gap-3 hover:border-white/10 transition-all active:scale-95"
          >
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Rango</span>
            <ChevronDown className={cn("w-4 h-4 text-zinc-600 transition-transform", isOpen && "rotate-180")} />
          </button>

          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-1.5">
                  {ranges.map((range) => (
                    <button
                      key={range.id}
                      onClick={() => handleRangeChange(range.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
                        currentRange === range.id && !currentDate
                          ? "bg-amber-500/10 text-amber-500" 
                          : "text-zinc-500 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {range.label}
                      {currentRange === range.id && !currentDate && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Botón Exportar */}
        <button className="h-12 px-6 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center gap-2 hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-95 hidden sm:flex">
          <Download className="w-4 h-4" /> PDF
        </button>
      </div>
    </div>
  );
}
