"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export function DatePickerNav({ 
  selectedDate, 
  prevDate, 
  nextDate, 
  todayDate 
}: { 
  selectedDate: string; 
  prevDate: string; 
  nextDate: string; 
  todayDate: string;
}) {
  const router = useRouter();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      router.push(`/dashboard/appointments?date=${e.target.value}`);
    }
  };

  const navigateTo = (date: string) => {
    router.push(`/dashboard/appointments?date=${date}`);
  };

  return (
    <div className="glass-card p-1.5 rounded-2xl flex items-center gap-1 border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-[0_0_50px_-12px_hsla(var(--primary-glow))]">
      <button 
        onClick={() => navigateTo(prevDate)}
        className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white active:scale-95"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <button 
        onClick={() => navigateTo(todayDate)}
        className="px-4 py-2.5 hover:bg-white/10 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white active:scale-95 border-r border-white/5"
      >
        Hoy
      </button>

      <div className="relative group">
        <button className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-zinc-400 group-hover:text-white active:scale-95 flex items-center justify-center">
          <Calendar className="w-5 h-5" />
        </button>
        <input 
          type="date" 
          value={selectedDate}
          onChange={handleDateChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
      </div>

      <button 
        onClick={() => navigateTo(nextDate)}
        className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white active:scale-95"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
