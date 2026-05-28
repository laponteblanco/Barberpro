"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { updateAppointmentTimeAction, updateAppointmentStatusAction, deleteAgendaBlockAction, createAgendaBlockAction } from "@/app/dashboard/appointments/actions";
import { User, Clock, LayoutList, CheckCircle2, DollarSign, Calendar, Ban, Trash2, Scissors, X } from "lucide-react";
import { NewAppointmentDialog } from "./NewAppointmentDialog";
import { StaffSummaryDialog } from "./StaffSummaryDialog";
import { useRouter } from "next/navigation";

interface CalendarViewProps {
  appointments: any[];
  agendaBlocks?: any[];
  staff: any[];
  clients: any[];
  services: any[];
  startHour?: number;
  endHour?: number;
  selectedDate?: string;
  viewMode?: "staff" | "days";
}

const BARBER_COLORS: Record<string, string> = {
  blue: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20",
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
  violet: "bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20",
  rose: "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20",
  cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20",
};

const getBarberColor = (id: string) => {
  const colors = Object.keys(BARBER_COLORS);
  const index = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return BARBER_COLORS[colors[index]];
};

const getBogotaNow = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc - (5 * 3600000));
};

const getBogotaTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const utc = d.getTime();
  const bogotaDate = new Date(utc - (5 * 3600000));
  return {
    hour: bogotaDate.getUTCHours(),
    min: bogotaDate.getUTCMinutes(),
    yyyy: bogotaDate.getUTCFullYear(),
    mm: String(bogotaDate.getUTCMonth() + 1).padStart(2, '0'),
    dd: String(bogotaDate.getUTCDate()).padStart(2, '0'),
    hhStr: String(bogotaDate.getUTCHours()).padStart(2, '0'),
    minStr: String(bogotaDate.getUTCMinutes()).padStart(2, '0'),
    dayIndex: bogotaDate.getUTCDay()
  };
};

export function CalendarView({ 
  appointments, 
  agendaBlocks = [],
  staff, 
  clients, 
  services, 
  startHour = 7, 
  endHour = 22, 
  selectedDate,
  viewMode = "staff"
}: CalendarViewProps) {
  const router = useRouter();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [newApptData, setNewApptData] = useState<{ staff_id: string, date: string, time: string } | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  
  // States for block menu and actions
  const [slotMenu, setSlotMenu] = useState<{ x: number, y: number, staffId: string, date: string, time: string } | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockDuration, setBlockDuration] = useState("60");
  const [blockReason, setBlockReason] = useState("");
  const [blockData, setBlockData] = useState<{ staffId: string, date: string, time: string } | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);

  const [summaryBarber, setSummaryBarber] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState(getBogotaNow());
  const [mounted, setMounted] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileBarber, setActiveMobileBarber] = useState<string>("all");

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(getBogotaNow()), 60000);
    
    // Check mobile screen
    const media = window.matchMedia("(max-width: 767px)");
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    
    return () => {
      clearInterval(timer);
      media.removeEventListener("change", listener);
    };
  }, []);

  const { effectiveStartHour, effectiveEndHour } = useMemo(() => {
    let s = startHour;
    let e = endHour;
    appointments.forEach(a => {
      const bogota = getBogotaTime(a.start_time);
      const dateStr = `${bogota.yyyy}-${bogota.mm}-${bogota.dd}`;
      if (viewMode === "staff" && dateStr === selectedDate) {
        if (bogota.hour < s) s = bogota.hour;
        if (bogota.hour >= e) e = bogota.hour + 1;
      } else if (viewMode === "days") {
         if (bogota.hour < s) s = bogota.hour;
         if (bogota.hour >= e) e = bogota.hour + 1;
      }
    });
    return { effectiveStartHour: s, effectiveEndHour: e };
  }, [appointments, selectedDate, startHour, endHour, viewMode]);

  const currentTimeTop = useMemo(() => {
    const todayStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'America/Bogota', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(new Date());

    if (!mounted || (selectedDate as any) !== todayStr) return null;

    const hour = currentTime.getUTCHours();
    const min = currentTime.getUTCMinutes();
    if (hour < effectiveStartHour || hour >= effectiveEndHour) return null;
    const totalMinutesFromStart = (hour - effectiveStartHour) * 60 + min;
    return (totalMinutesFromStart / 15) * 32;
  }, [currentTime, effectiveStartHour, effectiveEndHour, selectedDate, mounted]);

  const slots = useMemo(() => {
    const items = [];
    for (let hour = effectiveStartHour; hour < effectiveEndHour; hour++) {
      for (let min of [0, 15, 30, 45]) {
        items.push({ hour, min });
      }
    }
    items.push({ hour: effectiveEndHour, min: 0 });
    return items;
  }, [effectiveStartHour, effectiveEndHour]);

  const calendarColumns = useMemo(() => {
    if (viewMode === "staff") {
      return staff.map(s => ({ 
        id: s.id, 
        label: s.display_name, 
        avatar: s.avatar_url,
        staffId: s.id,
        date: selectedDate,
        type: 'staff' as const
      }));
    } else {
      const cols = [];
      const baseDate = new Date(selectedDate + "T12:00:00");
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate.getTime() + i * 24 * 3600000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        cols.push({
          id: dateStr,
          label: d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
          avatar: undefined,
          staffId: staff[0]?.id,
          date: dateStr,
          type: 'day' as const
        });
      }
      return cols;
    }
  }, [viewMode, staff, selectedDate]);

  const globalStats = useMemo(() => {
    return appointments.reduce((acc, appt) => {
      const bogota = getBogotaTime(appt.start_time);
      const dateStr = `${bogota.yyyy}-${bogota.mm}-${bogota.dd}`;
      
      const isMatch = viewMode === "staff" 
        ? dateStr === selectedDate
        : appointments.some(a => {
            const b = getBogotaTime(appt.start_time);
            const aStr = `${b.yyyy}-${b.mm}-${b.dd}`;
            return calendarColumns.some(c => c.date === aStr);
          });

      if (isMatch) {
        acc.total++;
        if (appt.status === 'completed' || appt.status === 'confirmed') {
          acc.completed++;
          const price = appt.service?.price || 0;
          const barber = staff.find(s => s.id === appt.staff_id);
          const rate = barber?.daily_commission_rates?.[String(bogota.dayIndex)] ?? barber?.commission_rate ?? 0;
          
          if (viewMode === "days") {
            acc.earnings += (price * (rate / 100));
          } else if (barber?.compensation_type === 'rent') {
            acc.earnings += 0;
          } else {
            acc.earnings += (price * (1 - rate / 100));
          }
        }
      }
      return acc;
    }, { total: 0, completed: 0, earnings: 0 });
  }, [appointments, selectedDate, viewMode, calendarColumns, staff]);

  const updateStatus = async (id: string, status: string, paymentMethod?: string) => {
    try {
      await updateAppointmentStatusAction(id, status, paymentMethod);
      setSelectedAppt(null);
      setShowPaymentSelector(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar cita?")) return;
    try {
      await updateAppointmentStatusAction(id, "deleted");
      setSelectedAppt(null);
      setShowPaymentSelector(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error");
    }
  };

  const handleDrop = async (e: React.DragEvent, staffId: string, hour: number, min: number, targetDate?: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("appointmentId");
    setMovingId(null);
    const dateToUse = targetDate || selectedDate;
    const [y, m, d] = (dateToUse as string).split('-').map(Number);
    const newStart = new Date(Date.UTC(y, m - 1, d, hour + 5, min, 0));
    try {
      await updateAppointmentTimeAction(id, newStart.toISOString());
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error");
    }
  };

  const handleCreateBlock = async () => {
    if (!blockData) return;
    try {
      const startTimeStr = `${blockData.date}T${blockData.time}:00-05:00`;
      await createAgendaBlockAction(blockData.staffId, startTimeStr, parseInt(blockDuration), blockReason || "Bloqueo");
      setShowBlockDialog(false);
      setBlockData(null);
      setBlockReason("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error");
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("¿Desbloquear este horario?")) return;
    try {
      await deleteAgendaBlockAction(id);
      setSelectedBlock(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error");
    }
  };

  const mobileFilteredAppointments = useMemo(() => {
    let filtered = appointments.filter(a => {
      const bogota = getBogotaTime(a.start_time);
      return `${bogota.yyyy}-${bogota.mm}-${bogota.dd}` === selectedDate;
    });
    if (activeMobileBarber !== "all") {
      filtered = filtered.filter(a => a.staff_id === activeMobileBarber);
    }
    return filtered.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [appointments, selectedDate, activeMobileBarber]);

  const mobileFilteredBlocks = useMemo(() => {
    let filtered = agendaBlocks.filter(b => {
      const bogota = getBogotaTime(b.start_time);
      return `${bogota.yyyy}-${bogota.mm}-${bogota.dd}` === selectedDate;
    });
    if (activeMobileBarber !== "all") {
      filtered = filtered.filter(b => b.staff_id === activeMobileBarber);
    }
    return filtered;
  }, [agendaBlocks, selectedDate, activeMobileBarber]);

  const mobileTimelineItems = useMemo(() => {
    const items: any[] = [];
    mobileFilteredAppointments.forEach(appt => {
      items.push({ type: 'appointment', time: new Date(appt.start_time).getTime(), data: appt });
    });
    mobileFilteredBlocks.forEach(block => {
      items.push({ type: 'block', time: new Date(block.start_time).getTime(), data: block });
    });
    return items.sort((a, b) => a.time - b.time);
  }, [mobileFilteredAppointments, mobileFilteredBlocks]);

  return (
    <div className="glass-card rounded-[30px] md:rounded-[40px] overflow-hidden border border-white/10 bg-zinc-950/95 flex flex-col h-full w-full min-h-0 relative shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] md:backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-700">
      
      <div className="px-4 py-3 md:px-6 md:py-4 bg-zinc-900/40 border-b border-white/5 flex flex-wrap items-center gap-3 md:gap-4 relative z-40">
        <div className="flex-1 min-w-[120px] md:min-w-[140px] glass-card bg-zinc-950/40 border-white/5 p-2 md:p-3 rounded-2xl flex items-center gap-2 md:gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <LayoutList className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-tighter">Citas {viewMode === "days" ? "Semana" : "Día"}</p>
            <p className="text-xs md:text-sm font-black text-white">{globalStats.total}</p>
          </div>
        </div>

        <div className="flex-1 min-w-[120px] md:min-w-[140px] glass-card bg-zinc-950/40 border-white/5 p-2 md:p-3 rounded-2xl flex items-center gap-2 md:gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-tighter">Cumplidas</p>
            <p className="text-xs md:text-sm font-black text-emerald-400">{globalStats.completed}</p>
          </div>
        </div>

        <div className="flex-1 min-w-[120px] md:min-w-[140px] glass-card bg-zinc-950/40 border-white/5 p-2 md:p-3 rounded-2xl flex items-center gap-2 md:gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
            <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500" />
          </div>
          <div>
            <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-tighter">
              {viewMode === "days" ? "Mi Comisión (Semana)" : "Ganancia Local (Día)"}
            </p>
            <p className="text-xs md:text-sm font-black text-yellow-500">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(globalStats.earnings)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 custom-scrollbar relative">
        {calendarColumns.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-zinc-950/50">
            <User className="w-16 h-16 text-zinc-800 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No hay barberos para mostrar</h3>
            <p className="text-zinc-500 text-sm max-w-md">Ve a la sección de Personal (Staff) en Ajustes para registrar a tus barberos y comenzar a agendar citas.</p>
          </div>
        ) : false ? (
          <div className="flex flex-col h-full bg-zinc-950/20">
            {/* Active Barber Selector */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-zinc-900/40 border-b border-white/5 no-scrollbar">
              <button
                onClick={() => setActiveMobileBarber("all")}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shrink-0 transition-all border",
                  activeMobileBarber === "all"
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                    : "bg-zinc-900 border-white/5 text-zinc-400"
                )}
              >
                Todos ({appointments.filter(a => {
                  const bogota = getBogotaTime(a.start_time);
                  return `${bogota.yyyy}-${bogota.mm}-${bogota.dd}` === selectedDate;
                }).length})
              </button>
              {staff.map(s => {
                const completedAppts = appointments.filter(a => {
                  if (a.staff_id !== s.id) return false;
                  const bogota = getBogotaTime(a.start_time);
                  return `${bogota.yyyy}-${bogota.mm}-${bogota.dd}` === selectedDate && (a.status === 'completed' || a.status === 'confirmed');
                });
                
                const dayIndex = getBogotaTime(selectedDate + "T12:00:00").dayIndex;
                const rate = s.daily_commission_rates?.[String(dayIndex)] ?? s.commission_rate ?? 0;
                
                const earnings = completedAppts.reduce((acc, appt) => {
                  return acc + ((appt.service?.price || 0) * (rate / 100));
                }, 0);

                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveMobileBarber(s.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shrink-0 transition-all border flex items-center gap-2",
                      activeMobileBarber === s.id
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-zinc-900 border-white/5 text-zinc-400"
                    )}
                  >
                    {s.avatar_url && <img src={s.avatar_url} className="w-4 h-4 rounded-full object-cover" />}
                    <span>{s.display_name}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[9px]">{rate}%</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-primary text-[9px]">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(earnings)}</span>
                  </button>
                );
              })}
            </div>

            {/* List of Timeline Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
              {mobileTimelineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-zinc-900/10 rounded-3xl border border-white/5 py-16">
                  <Calendar className="w-12 h-12 text-zinc-700 mb-3" />
                  <h4 className="text-base font-bold text-white mb-1">Sin agenda para hoy</h4>
                  <p className="text-zinc-500 text-xs max-w-xs">No hay citas ni bloqueos programados para esta fecha.</p>
                  <button
                    onClick={() => setNewApptData({ staff_id: activeMobileBarber !== 'all' ? activeMobileBarber : (staff[0]?.id || ''), date: selectedDate || '', time: '09:00' })}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                  >
                    Crear Cita
                  </button>
                </div>
              ) : (
                mobileTimelineItems.map((item) => {
                  if (item.type === 'appointment') {
                    const appt = item.data;
                    const bogotaStart = getBogotaTime(appt.start_time);
                    const barber = staff.find(s => s.id === appt.staff_id);
                    return (
                      <div
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        className={cn(
                          "glass-card p-4 rounded-2xl border bg-zinc-900/60 transition-all active:scale-[0.98] cursor-pointer flex flex-col gap-3",
                          appt.status === 'completed' ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-white/5"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white bg-white/5 px-2 py-1 rounded-lg">
                              {`${bogotaStart.hhStr}:${bogotaStart.minStr}`}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {barber?.display_name || "Barbero"}
                            </span>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            appt.status === 'completed' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
                            appt.status === 'pending' && "bg-amber-500/10 text-amber-400 border border-amber-500/25",
                            appt.status === 'confirmed' && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25",
                            appt.status === 'cancelled' && "bg-red-500/10 text-red-400 border border-red-500/25",
                            appt.status === 'noshow' && "bg-zinc-800 text-zinc-400"
                          )}>
                            {appt.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between min-w-0">
                          <div>
                            <h4 className="text-sm font-bold text-white truncate">{appt.client?.full_name || "Cliente"}</h4>
                            <p className="text-xs text-zinc-400 truncate">{appt.service?.name || "Servicio"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-indigo-400">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(appt.service?.price || 0)}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {appt.service?.duration || 30} min
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const block = item.data;
                    const bogotaStart = getBogotaTime(block.start_time);
                    const bogotaEnd = getBogotaTime(block.end_time);
                    const barber = staff.find(s => s.id === block.staff_id);
                    return (
                      <div
                        key={block.id}
                        onClick={() => setSelectedBlock(block)}
                        className="p-4 rounded-2xl border border-red-500/20 bg-red-500/[0.02] flex items-center justify-between gap-4 cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <Ban className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-red-400 truncate">{block.reason || "Bloqueo"}</h4>
                            <p className="text-xs text-zinc-500 truncate">
                              {barber?.display_name || "Barbero"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-zinc-300">
                            {`${bogotaStart.hhStr}:${bogotaStart.minStr} - ${bogotaEnd.hhStr}:${bogotaEnd.minStr}`}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>

            {/* Floating Action Button (FAB) */}
            <button
              onClick={() => setNewApptData({ staff_id: activeMobileBarber !== 'all' ? activeMobileBarber : (staff[0]?.id || ''), date: selectedDate || '', time: '09:00' })}
              className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <Scissors className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <div className="min-w-max flex flex-col min-h-full pb-20">
            
            <div className="flex sticky top-0 z-20 border-b border-white/10 bg-zinc-900/95 shadow-xl">
              <div className="w-24 border-r border-white/10 flex items-center justify-center p-4 sticky left-0 bg-zinc-900/95 z-30">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex">
                {calendarColumns.map((col) => {
                  const colAppointments = appointments.filter(a => {
                    if (a.staff_id !== col.staffId) return false;
                    const bogota = getBogotaTime(a.start_time);
                    return `${bogota.yyyy}-${bogota.mm}-${bogota.dd}` === col.date;
                  });
                  const total = colAppointments.length;
                  const completedAppts = colAppointments.filter(a => a.status === 'completed' || a.status === 'confirmed');
                  
                  const earnings = completedAppts.reduce((acc, appt) => {
                    const price = appt.service?.price || 0;
                    const barber = staff.find(s => s.id === col.staffId);
                    const dayIndex = getBogotaTime(appt.start_time).dayIndex;
                    const rate = barber?.daily_commission_rates?.[String(dayIndex)] ?? barber?.commission_rate ?? 0;
                    return acc + (price * (rate / 100));
                  }, 0);

                  return (
                    <div key={col.id} className="w-[260px] p-5 border-r border-white/10 text-center flex items-center gap-4 group/h">
                      <div 
                        onClick={() => col.type === 'staff' && setSummaryBarber(staff.find(s => s.id === col.staffId))}
                        className={cn(
                          "w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl transition-all relative overflow-hidden shrink-0",
                          col.type === 'staff' && "group-hover/h:border-primary/50 cursor-pointer active:scale-95"
                        )}
                      >
                        <div className="absolute inset-0 bg-primary/5 group-hover/h:bg-primary/10 transition-colors" />
                        {col.avatar ? (
                          <img src={col.avatar} alt={col.label} className="w-full h-full object-cover absolute inset-0 z-10" />
                        ) : col.type === 'day' ? (
                          <Calendar className="w-7 h-7 text-primary/40" />
                        ) : (
                          <User className="w-7 h-7 text-zinc-500" />
                        )}
                      </div>
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        {(() => {
                          const barber = staff.find(s => s.id === col.staffId);
                          const dayIndex = getBogotaTime(col.date + "T12:00:00").dayIndex;
                          const rate = barber?.daily_commission_rates?.[String(dayIndex)] ?? barber?.commission_rate ?? 0;
                          return (
                            <div className="flex items-center gap-1.5 w-full">
                              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 group-hover/h:text-white transition-colors truncate flex-1 text-left">
                                {col.label}
                              </span>
                              {col.type === 'staff' && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black tracking-widest shrink-0 animate-in fade-in duration-300">
                                  {rate}%
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex items-center justify-between w-full mt-1.5">
                          <div className="flex flex-col items-start">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">Citas</span>
                            <span className="text-[11px] font-black text-white">{total}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-primary/60 uppercase tracking-tighter">Ganancia</span>
                            <span className="text-[11px] font-black text-primary">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(earnings)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-1 relative">
              <div className="w-24 bg-zinc-900/95 border-r border-zinc-200/60 dark:border-white/10 sticky left-0 z-10 shadow-2xl">
                {slots.map(({ hour, min }) => (
                  <div key={`${hour}:${min}`} className={cn("h-8 border-b border-zinc-200/40 dark:border-white/5 flex flex-col items-center justify-center transition-all", min === 0 ? "bg-white/[0.03] border-b-zinc-200/60 dark:border-b-white/10" : "opacity-30")}>
                    {min === 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-black text-zinc-900 dark:text-white tracking-tighter">{hour > 12 ? hour - 12 : hour}</span>
                        <span className="text-[8px] font-black text-zinc-500 dark:text-white/50 uppercase tracking-widest">{hour >= 12 ? "PM" : "AM"}</span>
                      </div>
                    ) : <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400">:{min}</span>}
                  </div>
                ))}
              </div>

              <div className="flex relative">
                {currentTimeTop !== null && (
                  <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none transition-all duration-1000" style={{ top: `${currentTimeTop}px` }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] -ml-1" />
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-red-500 via-red-500/50 to-transparent" />
                  </div>
                )}

                {calendarColumns.map((col) => (
                  <div key={col.id} className="w-[260px] relative border-r border-zinc-200/60 dark:border-white/10 group/col">
                    {slots.map(({ hour, min }) => (
                      <div 
                        key={`${hour}:${min}`}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const winH = typeof window !== 'undefined' ? window.innerHeight : 1000;
                          const rawY = rect.top + rect.height / 2;
                          // Prevent menu from going off bottom of screen
                          const safeY = Math.min(rawY, winH - 120);
                          setSlotMenu({ 
                            x: rect.left + rect.width / 2, 
                            y: safeY, 
                            staffId: col.staffId as string, 
                            date: col.date as string, 
                            time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}` 
                          });
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, col.staffId as string, hour, min, col.date)}
                        className={cn("h-8 border-b border-zinc-200/40 dark:border-white/5 hover:bg-primary/20 hover:z-10 transition-colors relative cursor-pointer", min === 0 ? "border-b-zinc-200/60 dark:border-b-white/10" : "border-b-zinc-200/20 dark:border-b-white/[0.02]")}
                      />
                    ))}

                    {appointments
                      .filter((appt) => {
                        if (appt.staff_id !== col.staffId) return false;
                        const bogota = getBogotaTime(appt.start_time);
                        return `${bogota.yyyy}-${bogota.mm}-${bogota.dd}` === col.date;
                      })
                      .map((appt) => {
                        const bogota = getBogotaTime(appt.start_time);
                        const hour = bogota.hour;
                        const min = bogota.min;
                        if (hour < effectiveStartHour || hour >= effectiveEndHour) return null;
                        
                        const top = ((hour - effectiveStartHour) * 60 + min) / 15 * 32;
                        const duration = appt.service?.duration_minutes || 30;
                        const height = (duration / 15) * 32 - 2;
                        const isCompleted = appt.status === 'completed' || appt.status === 'confirmed';
                      
                        return (
                        <div 
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          className={cn("absolute inset-x-2 z-[2] rounded-xl p-2.5 border shadow-2xl transition-all cursor-grab active:cursor-grabbing group/appt overflow-hidden animate-in zoom-in-95 duration-300", 
                            isCompleted ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : getBarberColor(col.staffId as string))}
                        >
                          <div className="flex flex-col h-full relative">
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/20 rounded-full" />
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-widest truncate">{appt.client?.full_name}</span>
                              <span className="text-[8px] font-black bg-white/10 px-1.5 py-0.5 rounded-full">{duration}m</span>
                            </div>
                            <p className="text-[9px] font-medium opacity-80 line-clamp-1">{appt.service?.name}</p>
                            <div className="mt-auto flex items-center gap-1.5">
                              <Clock className="w-2.5 h-2.5 opacity-40" />
                              <span className="text-[8px] font-bold opacity-60">{`${bogota.hhStr}:${bogota.minStr}`}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* Render Agenda Blocks */}
                  {agendaBlocks
                    .filter((block) => {
                      if (block.staff_id !== col.staffId) return false;
                      const bogota = getBogotaTime(block.start_time);
                      return `${bogota.yyyy}-${bogota.mm}-${bogota.dd}` === col.date;
                    })
                    .map((block) => {
                      const bogotaStart = getBogotaTime(block.start_time);
                      const bogotaEnd = getBogotaTime(block.end_time);
                      
                      const hour = bogotaStart.hour;
                      const min = bogotaStart.min;
                      if (hour < effectiveStartHour || hour >= effectiveEndHour) return null;
                      
                      const startTotalMin = bogotaStart.hour * 60 + bogotaStart.min;
                      const endTotalMin = bogotaEnd.hour * 60 + bogotaEnd.min;
                      const durationMins = endTotalMin - startTotalMin;
                      
                      const top = ((hour - effectiveStartHour) * 60 + min) / 15 * 32;
                      const height = (durationMins / 15) * 32 - 2;
                      
                      const isLunch = block.is_lunch_break;
                      return (
                        <div 
                          key={block.id}
                          onClick={() => { if(!isLunch) setSelectedBlock(block); }}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          className={cn("absolute inset-x-2 z-[1] rounded-xl p-2.5 border shadow-2xl transition-all group/block overflow-hidden animate-in zoom-in-95 duration-300 backdrop-blur-sm",
                            isLunch 
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-500/80 cursor-default" 
                              : "cursor-pointer bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:bg-red-900/40 hover:border-red-500/30 hover:text-red-400"
                          )}
                        >
                          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] pointer-events-none" />
                          <div className="flex flex-col h-full relative z-10">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-widest truncate">{block.reason || "Bloqueado"}</span>
                            </div>
                            <div className="mt-auto flex items-center gap-1.5">
                              <Ban className="w-2.5 h-2.5 opacity-40" />
                              <span className="text-[8px] font-bold opacity-60">{`${bogotaStart.hhStr}:${bogotaStart.minStr} - ${bogotaEnd.hhStr}:${bogotaEnd.minStr}`}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

      {newApptData && (
        <NewAppointmentDialog 
          clients={clients} staff={staff} services={services} appointments={appointments}
          externalOpen={true} onCloseExternal={() => setNewApptData(null)}
          defaultValues={newApptData} editApptId={(newApptData as any).id}
          triggerButton={false} startHour={startHour} endHour={endHour}
        />
      )}

      {mounted && typeof document !== 'undefined' && selectedAppt && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-fit my-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-zinc-900/50">
              <h3 className="font-bold text-white tracking-tight">Detalles de la Cita</h3>
              <button 
                onClick={() => {
                  setSelectedAppt(null);
                  setShowPaymentSelector(false);
                  setPaymentMethod("cash");
                }} 
                className="p-2 hover:bg-white/10 rounded-xl text-zinc-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {!showPaymentSelector ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Cliente</p>
                    <p className="font-bold text-lg text-white">{selectedAppt.client?.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Horario</p>
                    <p className="font-medium text-sm text-zinc-300">
                      {new Date(selectedAppt.start_time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="pt-2 grid gap-3">
                    <button 
                      onClick={() => setShowPaymentSelector(true)} 
                      className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform"
                    >
                      Completar
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedAppt.id)} 
                      className="w-full py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-black uppercase tracking-widest text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform"
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Seleccionar Método de Pago</p>
                    <div className="grid gap-2">
                      {[
                        { id: "cash", label: "💵 Efectivo" },
                        { id: "card", label: "💳 Tarjeta / Llave" },
                        { id: "nequi", label: "📱 Nequi" },
                        { id: "daviplata", label: "📱 Daviplata" },
                        { id: "transfer", label: "🔄 Transferencia" },
                      ].map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={cn(
                            "w-full px-4 py-3 rounded-xl border text-left font-semibold text-sm transition-all flex items-center justify-between",
                            paymentMethod === method.id
                              ? "bg-primary/10 border-primary text-white"
                              : "bg-black/20 border-white/5 text-zinc-400 hover:border-white/10 hover:text-white"
                          )}
                        >
                          <span>{method.label}</span>
                          {paymentMethod === method.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 grid gap-3">
                    <button 
                      onClick={() => updateStatus(selectedAppt.id, 'completed', paymentMethod)} 
                      className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform"
                    >
                      Confirmar Cierre
                    </button>
                    <button 
                      onClick={() => {
                        setShowPaymentSelector(false);
                        setPaymentMethod("cash");
                      }} 
                      className="w-full py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-black uppercase tracking-widest text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform"
                    >
                      Atrás
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {summaryBarber && mounted && typeof document !== 'undefined' && createPortal(
        <StaffSummaryDialog 
          barber={summaryBarber} 
          appointments={appointments.filter(a => a.staff_id === summaryBarber.id)} 
          onClose={() => setSummaryBarber(null)} 
        />,
        document.body
      )}

      {/* Slot Menu */}
      {mounted && typeof document !== 'undefined' && slotMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[200] bg-black/20" onClick={() => setSlotMenu(null)} />
          <div 
            className="fixed z-[210] bg-zinc-900 border border-white/10 shadow-2xl rounded-xl p-2 w-48 animate-in zoom-in-95 duration-200"
            style={{ top: slotMenu.y - 10, left: slotMenu.x + 10 }}
          >
            <div className="px-2 py-1.5 mb-1 border-b border-white/5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{slotMenu.time}</span>
            </div>
            <button
              onClick={() => {
                setNewApptData({ staff_id: slotMenu.staffId, date: slotMenu.date, time: slotMenu.time });
                setSlotMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2 py-2 hover:bg-white/5 rounded-lg text-sm text-white transition-colors text-left"
            >
              <Scissors className="w-4 h-4 text-primary" />
              <span>Agendar Cita</span>
            </button>
            <button
              onClick={() => {
                setBlockData({ staffId: slotMenu.staffId, date: slotMenu.date, time: slotMenu.time });
                setShowBlockDialog(true);
                setSlotMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2 py-2 hover:bg-red-500/10 rounded-lg text-sm text-zinc-300 hover:text-red-400 transition-colors text-left"
            >
              <Ban className="w-4 h-4" />
              <span>Bloquear Horario</span>
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Block Creation Dialog */}
      {mounted && typeof document !== 'undefined' && showBlockDialog && blockData && createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-500" />
                Bloquear Horario
              </h3>
              <button onClick={() => setShowBlockDialog(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Duración</label>
                <select 
                  value={blockDuration}
                  onChange={e => setBlockDuration(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-red-500/50"
                >
                  <option value="15">15 Minutos</option>
                  <option value="30">30 Minutos</option>
                  <option value="45">45 Minutos</option>
                  <option value="60">1 Hora</option>
                  <option value="90">1.5 Horas</option>
                  <option value="120">2 Horas</option>
                  <option value="240">4 Horas</option>
                  <option value="480">Día Completo (8H)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Motivo (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Almuerzo, Permiso..."
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-red-500/50"
                />
              </div>
              <button 
                onClick={handleCreateBlock}
                className="w-full py-3.5 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest text-xs hover:bg-red-500 transition-colors mt-2"
              >
                Confirmar Bloqueo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Selected Block Details Dialog */}
      {mounted && typeof document !== 'undefined' && selectedBlock && createPortal(
        <div className="fixed inset-0 z-[220] flex justify-center items-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-500" />
                Horario Bloqueado
              </h3>
              <button onClick={() => setSelectedBlock(null)} className="p-2 hover:bg-white/10 rounded-xl text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Motivo</p>
                <p className="font-bold text-lg text-white">{selectedBlock.reason || "Bloqueo manual"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Horario</p>
                <p className="font-medium text-sm text-zinc-300">
                  {new Date(selectedBlock.start_time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} - 
                  {new Date(selectedBlock.end_time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => handleDeleteBlock(selectedBlock.id)} 
                  className="w-full flex justify-center items-center gap-2 py-3.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-black uppercase tracking-widest text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Desbloquear
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
