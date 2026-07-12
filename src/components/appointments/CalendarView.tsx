"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { updateAppointmentTimeAction, updateAppointmentStatusAction, deleteAgendaBlockAction, createAgendaBlockAction } from "@/app/dashboard/appointments/actions";
import { sellProductAction } from "@/app/dashboard/inventory/actions";
import { User, Clock, LayoutList, CheckCircle2, DollarSign, Calendar, Ban, Trash2, Scissors, X, RotateCw, ShoppingBag, Package, Banknote, Search, Plus, Minus, ArrowLeft, CreditCard, Smartphone, ArrowUpRight } from "lucide-react";
import { NewAppointmentDialog } from "./NewAppointmentDialog";
import { StaffSummaryDialog } from "./StaffSummaryDialog";
import { useRouter } from "next/navigation";
import { generateInvoicePDF } from "@/lib/invoice";

interface CalendarViewProps {
  appointments: any[];
  agendaBlocks?: any[];
  staff: any[];
  clients: any[];
  services: any[];
  products?: any[];
  startHour?: number;
  endHour?: number;
  selectedDate?: string;
  viewMode?: "staff" | "days";
  theme?: string;
  tenantId?: string;
  tenant?: any;
  appointmentInterval?: number;
}

const BARBER_COLORS_THEMES = {
  dark: [
    { base: "bg-indigo-500/30 border-indigo-500/50 text-indigo-100 hover:bg-indigo-500/40 shadow-md", completed: "bg-indigo-500/40 border-indigo-400/60 text-white hover:bg-indigo-500/50 shadow-md", dot: "bg-indigo-400" },
    { base: "bg-amber-500/30 border-amber-500/50 text-amber-100 hover:bg-amber-500/40 shadow-md", completed: "bg-amber-500/40 border-amber-400/60 text-white hover:bg-amber-500/50 shadow-md", dot: "bg-amber-400" },
    { base: "bg-rose-500/30 border-rose-500/50 text-rose-100 hover:bg-rose-500/40 shadow-md", completed: "bg-rose-500/40 border-rose-400/60 text-white hover:bg-rose-500/50 shadow-md", dot: "bg-rose-400" },
    { base: "bg-cyan-500/30 border-cyan-500/50 text-cyan-100 hover:bg-cyan-500/40 shadow-md", completed: "bg-cyan-500/40 border-cyan-400/60 text-white hover:bg-cyan-500/50 shadow-md", dot: "bg-cyan-400" },
    { base: "bg-violet-500/30 border-violet-500/50 text-violet-100 hover:bg-violet-500/40 shadow-md", completed: "bg-violet-500/40 border-violet-400/60 text-white hover:bg-violet-500/50 shadow-md", dot: "bg-violet-400" },
    { base: "bg-emerald-500/30 border-emerald-500/50 text-emerald-100 hover:bg-emerald-500/40 shadow-md", completed: "bg-emerald-500/40 border-emerald-400/60 text-white hover:bg-emerald-500/50 shadow-md", dot: "bg-emerald-400" },
    { base: "bg-orange-500/30 border-orange-500/50 text-orange-100 hover:bg-orange-500/40 shadow-md", completed: "bg-orange-500/40 border-orange-400/60 text-white hover:bg-orange-500/50 shadow-md", dot: "bg-orange-400" },
    { base: "bg-pink-500/30 border-pink-500/50 text-pink-100 hover:bg-pink-500/40 shadow-md", completed: "bg-pink-500/40 border-pink-400/60 text-white hover:bg-pink-500/50 shadow-md", dot: "bg-pink-400" },
  ],
  light: [
    { base: "bg-indigo-200 border-indigo-400 text-indigo-900 hover:bg-indigo-300 shadow-sm", completed: "bg-indigo-300 border-indigo-500 text-indigo-950 hover:bg-indigo-400 shadow-sm", dot: "bg-indigo-600" },
    { base: "bg-amber-200 border-amber-400 text-amber-900 hover:bg-amber-300 shadow-sm", completed: "bg-amber-300 border-amber-500 text-amber-950 hover:bg-amber-400 shadow-sm", dot: "bg-amber-600" },
    { base: "bg-rose-200 border-rose-400 text-rose-900 hover:bg-rose-300 shadow-sm", completed: "bg-rose-300 border-rose-500 text-rose-950 hover:bg-rose-400 shadow-sm", dot: "bg-rose-600" },
    { base: "bg-cyan-200 border-cyan-400 text-cyan-900 hover:bg-cyan-300 shadow-sm", completed: "bg-cyan-300 border-cyan-500 text-cyan-950 hover:bg-cyan-400 shadow-sm", dot: "bg-cyan-600" },
    { base: "bg-violet-200 border-violet-400 text-violet-900 hover:bg-violet-300 shadow-sm", completed: "bg-violet-300 border-violet-500 text-violet-950 hover:bg-violet-400 shadow-sm", dot: "bg-violet-600" },
    { base: "bg-emerald-200 border-emerald-400 text-emerald-900 hover:bg-emerald-300 shadow-sm", completed: "bg-emerald-300 border-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-sm", dot: "bg-emerald-600" },
    { base: "bg-orange-200 border-orange-400 text-orange-900 hover:bg-orange-300 shadow-sm", completed: "bg-orange-300 border-orange-500 text-orange-950 hover:bg-orange-400 shadow-sm", dot: "bg-orange-600" },
    { base: "bg-pink-200 border-pink-400 text-pink-900 hover:bg-pink-300 shadow-sm", completed: "bg-pink-300 border-pink-500 text-pink-950 hover:bg-pink-400 shadow-sm", dot: "bg-pink-600" },
  ]
};

const getBarberColorIndex = (id: string) =>
  id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 8;

const getBarberColor = (id: string, statusOrCompleted: string | boolean = 'pending', theme = 'dark') => {
  const t = theme === 'light' ? 'light' : 'dark';
  const color = BARBER_COLORS_THEMES[t][getBarberColorIndex(id)];
  const status = statusOrCompleted === true ? 'completed' : (statusOrCompleted === false ? 'pending' : statusOrCompleted);
  
  if (status === 'completed') {
    return theme === 'light' 
      ? "bg-emerald-100 border-emerald-300 text-emerald-900 shadow-sm hover:bg-emerald-200" 
      : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-md hover:bg-emerald-500/30";
  }

  if (status === 'confirmed') {
    return theme === 'light'
      ? "bg-indigo-100 border-indigo-300 text-indigo-900 shadow-sm hover:bg-indigo-200"
      : "bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-md hover:bg-indigo-500/30";
  }

  if (status === 'pending') {
    return theme === 'light'
      ? "bg-amber-100 border-amber-300 text-amber-900 shadow-sm hover:bg-amber-200"
      : "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-md hover:bg-amber-500/30";
  }

  if (status === 'cancelled') {
    return theme === 'light'
      ? "bg-red-100 border-red-300 text-red-900 shadow-sm hover:bg-red-200"
      : "bg-red-500/20 border-red-500/50 text-red-400 shadow-md hover:bg-red-500/30";
  }

  if (status === 'in_progress') {
    return theme === 'light'
      ? "bg-cyan-100 border-cyan-300 text-cyan-900 shadow-sm hover:bg-cyan-200"
      : "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-md hover:bg-cyan-500/30";
  }
  
  return color.base;
};

const getBarberDot = (id: string, theme = 'dark') => {
  const t = theme === 'light' ? 'light' : 'dark';
  return BARBER_COLORS_THEMES[t][getBarberColorIndex(id)].dot;
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
  products = [],
  startHour = 7, 
  endHour = 22, 
  selectedDate,
  viewMode = "staff",
  theme = "dark",
  tenantId,
  tenant,
  appointmentInterval = 15
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
  const [discountAmount, setDiscountAmount] = useState<number | "">("");
  const [cashGiven, setCashGiven] = useState<number | "">("");
  const [splitCashAmount, setSplitCashAmount] = useState<number | "">("");
  const [splitDigitalAmount, setSplitDigitalAmount] = useState<number | "">("");
  const [splitDigitalMethod, setSplitDigitalMethod] = useState("transfer");
  const [extraProducts, setExtraProducts] = useState<Array<{id: string; name: string; price: number; qty: number}>>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileBarber, setActiveMobileBarber] = useState<string>("all");
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [slotAreaHeight, setSlotAreaHeight] = useState(0);

  const slotAreaRef = useCallback((node: HTMLDivElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (node) {
      setSlotAreaHeight(node.getBoundingClientRect().height);
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setSlotAreaHeight(entry.contentRect.height);
        }
      });
      ro.observe(node);
      resizeObserverRef.current = ro;
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(getBogotaNow()), 60000);
    
    // Find the theme container to portal into (so portaled content inherits theme CSS variables)
    const themeEl = document.querySelector('.theme-light, .theme-dark') as HTMLElement;
    setPortalContainer(themeEl || document.body);
    
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
    let s = Number(startHour);
    let e = Number(endHour);
    if (isNaN(s)) s = 8;
    if (isNaN(e)) e = 20;
    if (s >= e) e = s + 12;

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

  // Height per 15-min slot — computed so ALL slots fit the measured slot area with NO internal scroll.
  // slotAreaRef points to the exact row-area div (excluding column headers).
  const totalSlots = (effectiveEndHour - effectiveStartHour) * (60 / appointmentInterval) + 1;
  const SLOT_HEIGHT = slotAreaHeight > 0
    ? Math.max(14, Math.floor(slotAreaHeight / totalSlots))
    : 22;

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
    return (totalMinutesFromStart / appointmentInterval) * SLOT_HEIGHT;
  }, [currentTime, effectiveStartHour, effectiveEndHour, selectedDate, mounted]);

  const slots = useMemo(() => {
    const items = [];
    for (let hour = effectiveStartHour; hour < effectiveEndHour; hour++) {
      for (let min = 0; min < 60; min += appointmentInterval) {
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
          const price = appt.total_price || (appt.service?.price || 0);
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

  const [completedInvoiceData, setCompletedInvoiceData] = useState<any | null>(null);

  const resetPaymentModal = () => {
    setSelectedAppt(null);
    setShowPaymentSelector(false);
    setDiscountAmount("");
    setCashGiven("");
    setExtraProducts([]);
    setProductSearch("");
    setPaymentMethod("cash");
    setSplitCashAmount("");
    setSplitDigitalAmount("");
    setSplitDigitalMethod("transfer");
  };

  const updateStatus = async (id: string, status: string, paymentMethod?: string, discount?: number, finalPriceOverride?: number) => {
    try {
      // Sell any extra products added to the bill
      for (const p of extraProducts) {
        setProductLoading(true);
        const res = await sellProductAction(p.id, p.qty);
        if (res?.error) throw new Error(`Error al vender ${p.name}: ${res.error}`);
      }
      
      const res = await updateAppointmentStatusAction(id, status, paymentMethod, discount, finalPriceOverride, Number(splitCashAmount)||0, Number(splitDigitalAmount)||0, splitDigitalMethod);
      if (res?.error) throw new Error(res.error);
      
      if (status === "completed" && selectedAppt) {
        const servicesList = selectedAppt.services?.length 
          ? selectedAppt.services.map((s:any) => ({ name: s.name, price: s.price }))
          : [{ name: selectedAppt.service?.name || "Servicio", price: selectedAppt.service?.price || selectedAppt.total_price }];
          
        setCompletedInvoiceData({
          appointmentId: selectedAppt.id,
          date: new Date().toISOString(),
          customerName: selectedAppt.client?.full_name || "Cliente Final",
          customerDocument: selectedAppt.client?.phone || "",
          barberName: staff.find(s => s.id === selectedAppt.staff_id)?.display_name || "Barbero",
          services: servicesList,
          products: extraProducts.map(p => ({ name: p.name, price: p.price, qty: p.qty })),
          subtotal: selectedAppt.total_price + extraProducts.reduce((s, p) => s + p.price * p.qty, 0),
          discount: discount || 0,
          total: finalPriceOverride || (selectedAppt.total_price + extraProducts.reduce((s, p) => s + p.price * p.qty, 0) - (discount || 0)),
          paymentMethod: paymentMethod || "cash"
        });
      }
      
      resetPaymentModal();
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error");
    } finally {
      setProductLoading(false);
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
      const res = await updateAppointmentTimeAction(id, newStart.toISOString());
      if (res?.error) {
        alert(res.error);
        return;
      }
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 h-fit">
          {viewMode === "days" && (
            <button
              onClick={() => {
                if (staff.length > 0) {
                  setSummaryBarber(staff[0]);
                }
              }}
              className="px-4 py-2.5 rounded-2xl border border-white/5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-[10px] font-black uppercase tracking-widest h-fit"
              title="Ver mi resumen del día"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mi Resumen</span>
              <span className="sm:hidden">Resumen</span>
            </button>
          )}
          
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2.5 rounded-2xl border border-white/5 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-[10px] font-black uppercase tracking-widest h-fit"
            title="Refrescar Agenda"
          >
            <RotateCw className="w-3.5 h-3.5 transition-transform hover:rotate-180 duration-500" />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 custom-scrollbar relative">
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
                  return acc + ((appt.total_price || (appt.service?.price || 0)) * (rate / 100));
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
                    const isCompleted = appt.status === 'completed';
                    return (
                      <div
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        className={cn(
                          "glass-card p-4 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer flex flex-col gap-3",
                          getBarberColor(appt.staff_id, appt.status, theme)
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", getBarberDot(appt.staff_id, theme))} />
                            <span className="text-xs font-black bg-white/10 px-2 py-1 rounded-lg">
                              {`${bogotaStart.hhStr}:${bogotaStart.minStr}`}
                            </span>
                            <span className="text-[10px] opacity-70">
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
                            <p className="text-xs text-zinc-400 truncate">
                              {appt.services?.length > 0 
                                ? appt.services.map((s: any) => s.name).join(', ')
                                : (appt.service?.name || "Servicio")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] font-black text-primary px-2 py-0.5 rounded-full bg-primary/10">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(appt.total_price || (appt.service?.price || 0))}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> 
                              {appt.end_time && appt.start_time ? Math.round((new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000) : (appt.service?.duration_minutes || 30)} min
                            </span>
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
          <div className="min-w-max flex flex-col h-full">
            
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
                    const price = appt.total_price || (appt.service?.price || 0);
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

            <div ref={slotAreaRef} className="flex flex-1 relative">
              <div className="w-24 bg-zinc-900/95 border-r border-black/30 sticky left-0 z-10 shadow-2xl">
                {slots.map(({ hour, min }) => (
                  <div key={`${hour}:${min}`} className={cn("border-b flex flex-col items-center justify-center transition-all", min === 0 ? "bg-black/[0.04] border-b-black/40" : "border-b-black/20 opacity-60")} style={{ height: `${SLOT_HEIGHT}px` }}>
                    {min === 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-black text-black tracking-tighter">{hour > 12 ? hour - 12 : hour}</span>
                        <span className="text-[8px] font-black text-black/50 uppercase tracking-widest">{hour >= 12 ? "PM" : "AM"}</span>
                      </div>
                    ) : <span className="text-[9px] font-bold text-black/60">:{min}</span>}
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
                  <div key={col.id} className="w-[260px] relative border-r border-black/20 group/col">
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
                        className={cn("border-b hover:bg-primary/20 hover:z-10 transition-colors relative cursor-pointer", min === 0 ? "border-b-black/40" : "border-b-black/20")}
                        style={{ height: `${SLOT_HEIGHT}px` }}
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
                        
                        const top = ((hour - effectiveStartHour) * 60 + min) / appointmentInterval * SLOT_HEIGHT;
                        const duration = appt.end_time && appt.start_time ? Math.round((new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000) : (appt.service?.duration_minutes || 30);
                        const height = (duration / appointmentInterval) * SLOT_HEIGHT - 2;
                        const isCompleted = appt.status === 'completed';
                        const isCompact = height < 38;
                        const isTiny = height < 24;
                      
                        return (
                        <div 
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          className={cn(
                            "absolute inset-x-1 z-[2] border transition-all cursor-grab active:cursor-grabbing group/appt overflow-hidden animate-in zoom-in-95 duration-300",
                            isTiny ? "rounded-md px-1.5 py-0 flex items-center gap-1" : isCompact ? "rounded-lg px-2 py-0.5" : "rounded-xl p-2.5 shadow-lg",
                            getBarberColor(appt.staff_id, appt.status, theme)
                          )}
                        >
                          {isTiny ? (
                            <>
                              <span className="text-[8px] font-black uppercase tracking-wider truncate leading-none">
                                {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 shrink-0 opacity-70 inline mr-0.5" />}
                                {appt.client?.full_name}
                              </span>
                              <span className="text-[7px] font-bold opacity-60 shrink-0 ml-auto">{duration}m</span>
                            </>
                          ) : isCompact ? (
                            <div className="flex items-center justify-between gap-1 h-full min-h-0 overflow-hidden">
                              <span className="text-[9px] font-black uppercase tracking-wider truncate flex items-center gap-1 leading-tight">
                                {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 shrink-0 opacity-70" />}
                                {appt.client?.full_name}
                              </span>
                              <span className="text-[7px] font-black bg-white/10 px-1 py-0.5 rounded-full shrink-0 leading-none">{duration}m</span>
                            </div>
                          ) : (
                            <div className="flex flex-col h-full relative overflow-hidden">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-widest truncate flex items-center gap-1.5">
                                  {isCompleted && <CheckCircle2 className="w-3 h-3 shrink-0 opacity-70" />}
                                  {appt.client?.full_name}
                                </span>
                                <span className="text-[8px] font-black bg-white/10 px-1.5 py-0.5 rounded-full shrink-0">{duration}m</span>
                              </div>
                              <p className="text-[9px] font-medium opacity-80 line-clamp-1">
                                {appt.services?.length > 0 ? appt.services.map((s: any) => s.name).join(', ') : appt.service?.name}
                              </p>
                              <div className="mt-auto flex items-center gap-1.5">
                                <Clock className="w-2.5 h-2.5 opacity-40" />
                                <span className="text-[8px] font-bold opacity-60">{`${bogota.hhStr}:${bogota.minStr}`}</span>
                              </div>
                            </div>
                          )}
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
                      
                      const top = ((hour - effectiveStartHour) * 60 + min) / appointmentInterval * SLOT_HEIGHT;
                      const height = (durationMins / appointmentInterval) * SLOT_HEIGHT - 2;
                      
                      const isLunch = block.is_lunch_break;
                      const isBlockCompact = height < 38;
                      const isBlockTiny = height < 24;
                      return (
                        <div 
                          key={block.id}
                          onClick={() => { if(!isLunch) setSelectedBlock(block); }}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          className={cn(
                            "absolute inset-x-1 z-[1] border transition-all group/block overflow-hidden animate-in zoom-in-95 duration-300",
                            isBlockTiny ? "rounded-md px-1.5 py-0 flex items-center gap-1" : isBlockCompact ? "rounded-lg px-2 py-0.5" : "rounded-xl p-2.5 shadow-lg backdrop-blur-sm",
                            isLunch 
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-500/80 cursor-default" 
                              : "cursor-pointer bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:bg-red-900/40 hover:border-red-500/30 hover:text-red-400"
                          )}
                        >
                          {isBlockTiny ? (
                            <>
                              <Ban className="w-2.5 h-2.5 opacity-60 shrink-0" />
                              <span className="text-[8px] font-black uppercase tracking-wider truncate leading-none">{block.reason || "Bloqueado"}</span>
                            </>
                          ) : isBlockCompact ? (
                            <div className="flex items-center gap-1.5 h-full min-h-0 overflow-hidden">
                              <Ban className="w-2.5 h-2.5 opacity-50 shrink-0" />
                              <span className="text-[9px] font-black uppercase tracking-wider truncate leading-tight">{block.reason || "Bloqueado"}</span>
                              <span className="text-[7px] font-bold opacity-60 shrink-0 ml-auto">{`${bogotaStart.hhStr}:${bogotaStart.minStr}`}</span>
                            </div>
                          ) : (
                            <>
                              <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] pointer-events-none" />
                              <div className="flex flex-col h-full relative z-10 overflow-hidden">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-[10px] font-black uppercase tracking-widest truncate">{block.reason || "Bloqueado"}</span>
                                </div>
                                <div className="mt-auto flex items-center gap-1.5">
                                  <Ban className="w-2.5 h-2.5 opacity-40" />
                                  <span className="text-[8px] font-bold opacity-60">{`${bogotaStart.hhStr}:${bogotaStart.minStr} - ${bogotaEnd.hhStr}:${bogotaEnd.minStr}`}</span>
                                </div>
                              </div>
                            </>
                          )}
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
          theme={theme} tenantId={tenantId}
          onAddAndCharge={(appt: any) => {
            setNewApptData(null);
            setSelectedAppt(appt);
            setShowPaymentSelector(true);
          }}
        />
      )}

      {mounted && portalContainer && selectedAppt && createPortal(
        <div className={cn(
          theme === "light" ? "theme-light" : "theme-dark",
          "fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
        )}
          style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(10,10,25,0.92) 50%, rgba(0,0,0,0.88) 100%)" }}
        >
          <div className="w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-fit my-auto bg-white border border-blue-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50/50">
              <div className="flex items-center gap-2">
                {showPaymentSelector && (
                  <button onClick={() => { setShowPaymentSelector(false); }} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h3 className="font-bold text-blue-900 tracking-tight text-sm">
                    {showPaymentSelector ? "Cobrar Servicio" : "Detalles de la Cita"}
                  </h3>
                  {!showPaymentSelector && (
                    <p className="text-[9px] text-blue-600 uppercase tracking-widest font-bold mt-0.5">{selectedAppt.client?.full_name}</p>
                  )}
                </div>
              </div>
              <button onClick={resetPaymentModal} className="p-2 hover:bg-blue-100 rounded-xl text-blue-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {!showPaymentSelector ? (
                <>
                  {/* Info cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl border border-blue-100 bg-white shadow-sm">
                      <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black mb-1">Horario</p>
                      <p className="font-bold text-xs text-blue-900">
                        {new Date(selectedAppt.start_time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} – {new Date(selectedAppt.end_time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl border border-blue-100 bg-white shadow-sm">
                      <p className="text-[9px] text-blue-500 uppercase tracking-widest font-black mb-1">Total</p>
                      <div className="flex items-center text-blue-500 font-bold text-xs">
                        <span>$</span>
                        <input
                          type="number"
                          value={selectedAppt.total_price || 0}
                          onChange={(e) => setSelectedAppt({ ...selectedAppt, total_price: Number(e.target.value) })}
                          className="w-full bg-transparent outline-none pl-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl border border-blue-100 bg-white shadow-sm">
                    <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black mb-1">Servicios</p>
                    <p className="font-medium text-xs text-blue-800">
                      {selectedAppt.services?.length > 0
                        ? selectedAppt.services.map((s: any) => s?.name).filter(Boolean).join(", ")
                        : (selectedAppt.service?.name || "Servicio")}
                    </p>
                  </div>

                  <div className="grid gap-2 pt-1">
                    {selectedAppt.status !== "completed" && (
                      <button
                        onClick={() => setShowPaymentSelector(true)}
                        className="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white shadow-[0_8px_24px_-4px_rgba(59,130,246,0.35)]"
                      >
                        <DollarSign className="w-4 h-4" /> Completar y Cobrar
                      </button>
                    )}
                    
                    {selectedAppt.status !== "completed" && (
                      <button
                        onClick={() => {
                          if (!selectedAppt?.client?.phone) {
                            alert("El cliente no tiene un teléfono registrado.");
                            return;
                          }
                          let phone = selectedAppt.client.phone.replace(/\D/g, "");
                          if (phone.length === 10) phone = `57${phone}`; // Auto prefix for Colombia if exactly 10 digits
                          const date = new Date(selectedAppt.start_time);
                          const dateString = date.toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long' });
                          const timeString = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                          const text = `¡Hola ${selectedAppt.client.full_name}! Te recordamos tu cita para el ${dateString} a las ${timeString}. ¡Te esperamos!`;
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 bg-[#25D366] text-white shadow-sm"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                        </svg>
                        Recordatorio
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(selectedAppt.id)}
                      className="w-full py-3 rounded-2xl bg-white border border-red-200 text-red-500 font-black uppercase tracking-widest text-xs hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* ── PAYMENT METHOD ── */}
                  <div className="space-y-2">
                    <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black">Método de pago</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { id: "cash",      label: "Efectivo",   Icon: Banknote },
                        { id: "card",      label: "Tarjeta",    Icon: CreditCard },
                        { id: "nequi",     label: "Nequi",      Icon: Smartphone },
                        { id: "daviplata", label: "Daviplata",  Icon: Smartphone },
                        { id: "transfer",  label: "Transfer.",  Icon: ArrowUpRight },
                        { id: "split",     label: "Mixto",      Icon: Banknote },
                      ] as const).map(({ id, label, Icon }) => (
                        <button key={id} type="button" onClick={() => setPaymentMethod(id)}
                          className={cn(
                            "flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all",
                            paymentMethod === id ? "bg-blue-100 border-blue-400 text-blue-700 scale-105 shadow-sm" : "bg-white border-blue-100 text-blue-400 hover:border-blue-300 hover:text-blue-600 shadow-sm"
                          )}
                        >
                          <Icon className="w-4 h-4" />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── CASH CHANGE CALCULATOR ── */}
                  {paymentMethod === "cash" && (
                    <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black flex items-center gap-1.5">
                        <Banknote className="w-3 h-3" /> Calcular vuelto
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-bold">$</span>
                          <input
                            type="number"
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="Valor del billete"
                            className="w-full pl-7 pr-3 py-2 bg-white border border-blue-200 rounded-xl text-right text-sm font-black text-blue-900 outline-none focus:border-blue-500 transition-colors shadow-sm"
                          />
                        </div>
                        {Number(cashGiven) > 0 && (
                          <div className="text-right shrink-0">
                            {(() => {
                              const total = Math.max(0, selectedAppt.total_price + extraProducts.reduce((s, p) => s + p.price * p.qty, 0) - (Number(discountAmount) || 0));
                              const change = Number(cashGiven) - total;
                              return (
                                <p className={cn("text-sm font-black", change >= 0 ? "text-blue-600" : "text-red-500")}>
                                  {change >= 0 ? "Vuelto:" : "Falta:"}<br />
                                  {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.abs(change))}
                                </p>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SPLIT PAYMENT ── */}
                  {paymentMethod === "split" && (
                    <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black flex items-center gap-1.5">
                        <Banknote className="w-3 h-3" /> Pago Mixto
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-blue-900 w-16">Efectivo:</label>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-bold">$</span>
                            <input
                              type="number"
                              value={splitCashAmount}
                              onChange={(e) => setSplitCashAmount(e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-1.5 bg-white border border-blue-200 rounded-lg text-right text-xs font-black text-blue-900 outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>

                        {Number(splitCashAmount) > 0 && (
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-blue-900 w-16">Recibido:</label>
                            <div className="relative flex-1 flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-bold">$</span>
                                <input
                                  type="number"
                                  placeholder="Entrega..."
                                  value={cashGiven}
                                  onChange={(e) => setCashGiven(e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-blue-200 rounded-lg text-right text-xs font-black text-blue-900 outline-none focus:border-blue-500 transition-colors"
                                />
                              </div>
                              {Number(cashGiven) > 0 && (
                                <div className="flex items-center justify-end min-w-[70px]">
                                  {(() => {
                                    const change = Number(cashGiven) - Number(splitCashAmount);
                                    return (
                                      <p className={cn("text-[9px] font-black leading-tight text-right", change >= 0 ? "text-blue-600" : "text-red-500")}>
                                        {change >= 0 ? "Vuelto:" : "Falta:"}<br />
                                        {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.abs(change))}
                                      </p>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-blue-900 w-16">Digital:</label>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-bold">$</span>
                            <input
                              type="number"
                              value={splitDigitalAmount}
                              onChange={(e) => setSplitDigitalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-1.5 bg-white border border-blue-200 rounded-lg text-right text-xs font-black text-blue-900 outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-blue-900 w-16">Medio:</label>
                          <select
                            value={splitDigitalMethod}
                            onChange={(e) => setSplitDigitalMethod(e.target.value)}
                            className="flex-1 bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-xs font-bold text-blue-900 outline-none focus:border-blue-500 transition-colors"
                          >
                            <option value="nequi">Nequi</option>
                            <option value="daviplata">Daviplata</option>
                            <option value="transfer">Transferencia</option>
                            <option value="card">Tarjeta</option>
                          </select>
                        </div>
                        {(() => {
                          const total = Math.max(0, selectedAppt.total_price + extraProducts.reduce((s, p) => s + p.price * p.qty, 0) - (Number(discountAmount) || 0));
                          const sum = (Number(splitCashAmount)||0) + (Number(splitDigitalAmount)||0);
                          if (sum !== total && (splitCashAmount !== "" || splitDigitalAmount !== "")) {
                            return (
                              <p className="text-[9px] font-bold text-red-500 text-right pt-1">
                                La suma debe ser {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(total)}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* ── PRODUCTS ── */}
                  <div className="space-y-2">
                    <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black flex items-center gap-1.5">
                      <ShoppingBag className="w-3 h-3" /> Agregar productos
                    </p>
                    {/* Added products list */}
                    {extraProducts.length > 0 && (
                      <div className="space-y-1">
                        {extraProducts.map(p => (
                          <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl border border-blue-100 bg-white shadow-sm">
                            <div>
                              <p className="text-xs font-bold text-blue-900">{p.name}</p>
                              <p className="text-[10px] text-blue-500">{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(p.price)} c/u</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => setExtraProducts(prev => prev.map(ep => ep.id === p.id ? { ...ep, qty: Math.max(1, ep.qty - 1) } : ep).filter(ep => ep.qty > 0))}
                                className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-black text-blue-900 w-4 text-center">{p.qty}</span>
                              <button type="button" onClick={() => setExtraProducts(prev => prev.map(ep => ep.id === p.id ? { ...ep, qty: ep.qty + 1 } : ep))}
                                className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                              <button type="button" onClick={() => setExtraProducts(prev => prev.filter(ep => ep.id !== p.id))}
                                className="w-6 h-6 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Product search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Buscar producto..."
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-blue-200 rounded-xl text-xs text-blue-900 outline-none focus:border-blue-400 transition-colors shadow-sm"
                      />
                    </div>
                    {productSearch && (
                      <div className="rounded-xl border border-blue-100 bg-white overflow-hidden max-h-32 overflow-y-auto shadow-sm">
                        {products
                          .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && !extraProducts.find(ep => ep.id === p.id))
                          .slice(0, 6)
                          .map((p: any) => (
                            <button key={p.id} type="button"
                              onClick={() => {
                                setExtraProducts(prev => [...prev, { id: p.id, name: p.name, price: Number(p.retail_price), qty: 1 }]);
                                setProductSearch("");
                              }}
                              className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-50 border-b border-blue-50 last:border-0 transition-colors text-left"
                            >
                              <div>
                                <p className="text-xs font-bold text-blue-900">{p.name}</p>
                                <p className="text-[10px] text-blue-500">Stock: {p.stock}</p>
                              </div>
                              <p className="text-xs font-black text-blue-600">{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(p.retail_price)}</p>
                            </button>
                          ))}
                        {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                          <p className="text-xs text-blue-500 text-center py-3">Sin resultados</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── TOTALS ── */}
                  <div className="p-3.5 rounded-2xl border border-blue-100 bg-white shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-blue-600 font-bold">Servicios:</p>
                      <p className="text-xs font-black text-blue-900">
                        {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(selectedAppt.total_price)}
                      </p>
                    </div>
                    {extraProducts.length > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-blue-600 font-bold">Productos:</p>
                        <p className="text-xs font-black text-blue-500">
                          + {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(extraProducts.reduce((s, p) => s + p.price * p.qty, 0))}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] text-blue-600 font-bold">Descuento:</p>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-bold">$</span>
                        <input
                          type="number"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-blue-200 rounded-lg text-right text-xs font-black text-red-500 outline-none focus:border-red-400 transition-colors"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                      <p className="text-xs font-black uppercase tracking-widest text-blue-700">Total a Cobrar:</p>
                      <p className="text-xl font-black text-blue-700">
                        {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
                          Math.max(0, selectedAppt.total_price + extraProducts.reduce((s, p) => s + p.price * p.qty, 0) - (Number(discountAmount) || 0))
                        )}
                      </p>
                    </div>
                  </div>

                  {/* ── CONFIRM ── */}
                  <button
                    onClick={() => {
                      const finalTotal = Math.max(0, selectedAppt.total_price + extraProducts.reduce((s, p) => s + p.price * p.qty, 0) - (Number(discountAmount) || 0));
                      updateStatus(selectedAppt.id, "completed", paymentMethod, Number(discountAmount) || 0, finalTotal);
                    }}
                    disabled={productLoading || (paymentMethod === 'split' && ((Number(splitCashAmount)||0) + (Number(splitDigitalAmount)||0) !== Math.max(0, selectedAppt.total_price + extraProducts.reduce((s, p) => s + p.price * p.qty, 0) - (Number(discountAmount) || 0))))}
                    className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white shadow-[0_8px_24px_-4px_rgba(59,130,246,0.35)]"
                  >
                    {productLoading
                      ? <><RotateCw className="w-4 h-4 animate-spin" /> Procesando...</>
                      : <><CheckCircle2 className="w-4 h-4" /> Confirmar Cierre</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        portalContainer
      )}

      {summaryBarber && mounted && portalContainer && createPortal(
        <StaffSummaryDialog 
          barber={summaryBarber} 
          appointments={appointments.filter(a => {
            if (a.staff_id !== summaryBarber.id) return false;
            const bogota = getBogotaTime(a.start_time);
            return `${bogota.yyyy}-${bogota.mm}-${bogota.dd}` === selectedDate;
          })} 
          onClose={() => setSummaryBarber(null)} 
          theme={theme}
          isBarber={viewMode === "days"}
          date={selectedDate}
        />,
        portalContainer
      )}

      {/* Slot Menu */}
      {mounted && portalContainer && slotMenu && createPortal(
        <div className={theme === "light" ? "theme-light" : "theme-dark"}>
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
                const [hStr, mStr] = slotMenu.time.split(':');
                const startMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
                const maxMins = (endHour * 60) - startMins;
                const defaultDuration = maxMins > 0 && maxMins < 60 ? String(maxMins) : "60";
                
                setBlockData({ staffId: slotMenu.staffId, date: slotMenu.date, time: slotMenu.time });
                setBlockDuration(defaultDuration);
                setShowBlockDialog(true);
                setSlotMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2 py-2 hover:bg-red-500/10 rounded-lg text-sm text-zinc-300 hover:text-red-400 transition-colors text-left"
            >
              <Ban className="w-4 h-4" />
              <span>Bloquear Horario</span>
            </button>
          </div>
        </div>,
        portalContainer
      )}

      {mounted && portalContainer && showBlockDialog && blockData && createPortal(
        <div className={cn(
          theme === "light" ? "theme-light" : "theme-dark",
          "fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        )}>
          <div className={cn(
            "w-full max-w-sm border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
            theme === "light" ? "theme-light bg-white border-blue-200" : "bg-zinc-950 border-white/10"
          )}>
            <div className={cn(
              "px-6 py-5 border-b flex items-center justify-between",
              theme === "light" ? "bg-blue-50/80 border-blue-100" : "border-white/5"
            )}>
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
                  {(() => {
                    if (!blockData) return null;
                    const [hStr, mStr] = blockData.time.split(':');
                    const startMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
                    const endMins = endHour * 60;
                    const maxMins = endMins - startMins;
                    
                    const options = [
                      { value: 15, label: "15 Minutos" },
                      { value: 30, label: "30 Minutos" },
                      { value: 45, label: "45 Minutos" },
                      { value: 60, label: "1 Hora" },
                      { value: 90, label: "1.5 Horas" },
                      { value: 120, label: "2 Horas" },
                      { value: 180, label: "3 Horas" },
                      { value: 240, label: "4 Horas" },
                    ];

                    const validOptions = options.filter(opt => opt.value < maxMins);
                    
                    if (maxMins > 0) {
                      const maxH = Math.floor(maxMins / 60);
                      const maxM = maxMins % 60;
                      let maxLabel = "";
                      if (maxH === 0) maxLabel = `${maxM} Minutos (Cierre)`;
                      else if (maxH === 1 && maxM === 0) maxLabel = `1 Hora (Cierre)`;
                      else if (maxM === 0) maxLabel = `${maxH} Horas (Cierre)`;
                      else maxLabel = `${maxH}h ${maxM}m (Cierre)`;
                      
                      validOptions.push({ value: maxMins, label: maxLabel });
                    }

                    return validOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ));
                  })()}
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
        portalContainer
      )}

      {mounted && portalContainer && selectedBlock && createPortal(
        <div className={cn(
          theme === "light" ? "theme-light" : "theme-dark",
          "fixed inset-0 z-[220] flex justify-center items-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        )}>
          <div className={cn(
            "w-full max-w-sm border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
            theme === "light" ? "theme-light bg-white border-blue-200" : "bg-zinc-950 border-white/10"
          )}>
            <div className={cn(
              "flex items-center justify-between px-6 py-5 border-b",
              theme === "light" ? "bg-blue-50/80 border-blue-100" : "border-white/5"
            )}>
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
        portalContainer
      )}
      {mounted && portalContainer && completedInvoiceData && createPortal(
        <div className={cn(
          theme === "light" ? "theme-light" : "theme-dark",
          "fixed inset-0 z-[220] flex justify-center items-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        )}>
          <div className={cn(
            "w-full max-w-sm border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
            theme === "light" ? "theme-light bg-white border-blue-200" : "bg-zinc-950 border-white/10"
          )}>
            <div className={cn(
              "flex items-center justify-between px-6 py-5 border-b",
              theme === "light" ? "bg-emerald-50/80 border-emerald-100" : "border-white/5"
            )}>
              <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Cita Completada
              </h3>
              <button onClick={() => setCompletedInvoiceData(null)} className="p-2 hover:bg-white/10 rounded-xl text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-zinc-300">
                  La cita ha sido marcada como cumplida y el pago registrado exitosamente.
                </p>
                <p className="text-xs text-zinc-400">
                  ¿Desea generar la factura para esta transacción?
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const businessInfo = tenant ? {
                      name: tenant.name || "BARBERÍA",
                      nit: tenant.settings?.business_nit || "NIT NO REGISTRADO",
                      address: tenant.settings?.business_address || tenant.address || "Dirección no registrada",
                      phone: tenant.settings?.business_phone || tenant.phone || "Teléfono no registrado",
                      regime: tenant.settings?.business_regime || "Régimen no especificado",
                      footerMessage: tenant.settings?.invoice_footer || "¡Gracias por preferirnos! Vuelve pronto."
                    } : undefined;
                    
                    generateInvoicePDF(completedInvoiceData, businessInfo);
                    setCompletedInvoiceData(null);
                  }} 
                  className="w-full flex justify-center items-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <DollarSign className="w-4 h-4" />
                  Generar Factura PDF
                </button>
                <button 
                  onClick={() => setCompletedInvoiceData(null)} 
                  className="w-full flex justify-center items-center gap-2 py-3.5 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 font-black uppercase tracking-widest text-xs transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>,
        portalContainer
      )}
    </div>
  );
}
