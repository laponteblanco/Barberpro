"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  ChevronRight, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  History, 
  Scissors,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  Phone,
  UserPlus,
  XCircle,
  Cake,
  Mail,
  FileText,
  CreditCard
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { publicCreateAppointmentAction, publicCancelAppointmentAction } from "@/app/[slug]/actions";

interface BookingPortalProps {
  tenant: any;
  staff: any[];
  services: any[];
}

type Step = "identify" | "register" | "history" | "select-service" | "select-staff" | "select-time" | "confirm" | "success";

export function BookingPortal({ tenant, staff, services }: BookingPortalProps) {
  const [step, setStep] = useState<Step>("identify");
  const [idNumber, setIdNumber] = useState("");
  const [client, setClient] = useState<any>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [fragmentedOptions, setFragmentedOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"upcoming" | "completed">("upcoming");

  // New Client fields
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Selections
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>("");


  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber) return;
    
    setLoading(true);
    try {
      // Turbopack may return 404 on first hit (lazy compilation), so retry once
      let res = await fetch(`/api/tenants/${tenant.id}/clients/identify?id_number=${idNumber}`);
      if (res.status === 404) {
        await new Promise(r => setTimeout(r, 1500));
        res = await fetch(`/api/tenants/${tenant.id}/clients/identify?id_number=${idNumber}`);
      }
      
      if (!res.ok) {
        const text = await res.text();
        console.error("Identify error response:", res.status, text.substring(0, 200));
        throw new Error(`Error del servidor: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.client) {
        setClient(data.client);
        setClientHistory(data.history || []);
        setStep("history");
      } else {
        setStep("register");
      }
    } catch (err: any) {
      console.error("Identification failed:", err);
      alert("Hubo un problema al identificarte. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const refreshClientData = async () => {
    if (!idNumber) return;
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/clients/identify?id_number=${idNumber}`);
      if (res.ok) {
        const data = await res.json();
        if (data.client) {
          setClient(data.client);
          setClientHistory(data.history || []);
        }
      }
    } catch (err) {
      console.error("Refresh client data failed:", err);
    }
  };

  useEffect(() => {
    if (step === "select-time" && selectedStaff && selectedDate) {
      fetchSlots();
    }
  }, [step, selectedStaff, selectedDate]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const serviceIdsStr = selectedServices.map(s => s.id).join(",");
      const res = await fetch(`/api/tenants/${tenant.id}/staff/${selectedStaff.id}/availability?date=${selectedDate}&service_ids=${serviceIdsStr}`);
      
      if (!res.ok) throw new Error("Error fetching slots");
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response from server");
      }

      const data = await res.json();
      setAvailableSlots(data.continuous || data.slots || []);
      setFragmentedOptions(data.fragmented || []);
    } catch (err) {
      console.error("Fetch slots error:", err);
      setAvailableSlots([]);
      setFragmentedOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalBooking = async () => {
    setLoading(true);
    try {
      await publicCreateAppointmentAction(
        tenant.id,
        {
          id: client?.id || null,
          name: client?.full_name || newName,
          phone: client?.phone || newPhone,
          cedula: idNumber,
          birthDate: newBirthDate,
          email: newEmail,
          notes: newNotes
        },
        {
          staffId: selectedStaff.id,
          serviceIds: selectedServices.map(s => s.id),
          date: selectedDate,
          time: selectedTime,
          isFragmented: selectedTime.startsWith("frag-"),
          fragmentedSlots: selectedTime.startsWith("frag-") ? fragmentedOptions[parseInt(selectedTime.split("-")[1])]?.slots : null
        }
      );
      
      // Refresh the history so the newly scheduled appointment shows up immediately
      await refreshClientData();
      
      setStep("success");
    } catch (err: any) {
      alert(err.message || "Error al agendar");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!client?.id) return;
    const confirmCancel = confirm("¿Estás seguro de que deseas cancelar esta cita?");
    if (!confirmCancel) return;

    setLoading(true);
    try {
      await publicCancelAppointmentAction(tenant.id, apptId, client.id);
      alert("Cita cancelada con éxito.");
      await refreshClientData();
    } catch (err: any) {
      alert(err.message || "Error al cancelar la cita");
    } finally {
      setLoading(false);
    }
  };

  const renderIdentify = () => (
    <div className="max-w-md mx-auto pt-20 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="text-center mb-10">
        <div className="w-24 h-24 mx-auto mb-6 rounded-[32px] overflow-hidden border-2 border-primary/20 p-1 shadow-2xl shadow-primary/10">
           {tenant.logo_url ? (
             <img src={tenant.logo_url} alt={tenant.name} className="w-full h-full object-cover rounded-[28px]" />
           ) : (
             <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <Scissors className="w-10 h-10 text-primary" />
             </div>
           )}
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{tenant.name}</h1>
        <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Reserva tu experiencia</p>
      </div>

      <div className="glass-card p-8 rounded-[40px] border-white/5 bg-zinc-900/20 backdrop-blur-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <User className="w-32 h-32" />
        </div>
        
        <form onSubmit={handleIdentify} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Ingresa tu Cédula o ID</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Identificación"
                className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !idNumber}
            className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Verificando..." : "Siguiente"}
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );

  const renderHistory = () => {
    const now = new Date();
    
    // Filter and categorize client history based on status to avoid timezone/clock drift mismatches
    const upcomingAppointments = clientHistory.filter(appt => {
      return appt.status === "pending" || appt.status === "confirmed";
    });

    const completedAppointments = clientHistory.filter(appt => {
      const isPast = new Date(appt.start_time) <= now;
      return appt.status === "completed" || (isPast && appt.status !== "cancelled" && appt.status !== "deleted" && appt.status !== "pending" && appt.status !== "confirmed");
    });

    return (
      <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-xl shadow-primary/10">
             <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black">¡Hola, {client?.full_name?.split(' ')[0]}!</h2>
            <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Es bueno verte de nuevo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="glass-card p-6 rounded-[32px] border-white/5 bg-zinc-900/20">
             <div className="flex items-center gap-3 mb-4">
                <History className="w-5 h-5 text-zinc-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Visitas Previas</h3>
             </div>
             <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">{completedAppointments.length}</span>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Servicios realizados</span>
             </div>
          </div>

          <div className="glass-card p-6 rounded-[32px] border-white/5 bg-emerald-500/5">
             <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Estatus</h3>
             </div>
             <div className="text-xs font-black text-emerald-500 uppercase tracking-widest leading-relaxed">
                Cliente Fiel • {tenant.name}
             </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-zinc-950/40 p-1.5 rounded-2xl border border-white/5 mb-8 gap-1">
          <button
            onClick={() => setActiveHistoryTab("upcoming")}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
              activeHistoryTab === "upcoming"
                ? "bg-primary text-white shadow-lg shadow-primary/10"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Calendar className="w-4 h-4" />
            Citas Programadas ({upcomingAppointments.length})
          </button>
          <button
            onClick={() => setActiveHistoryTab("completed")}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
              activeHistoryTab === "completed"
                ? "bg-primary text-white shadow-lg shadow-primary/10"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <History className="w-4 h-4" />
            Visitas Realizadas ({completedAppointments.length})
          </button>
        </div>

        {/* List of Appointments based on selected tab */}
        <div className="space-y-4 mb-12">
          {activeHistoryTab === "upcoming" ? (
            upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appt) => (
                <div key={appt.id} className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white">{appt.service?.name}</p>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          appt.status === "confirmed" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10" : "bg-amber-500/10 text-amber-500 border border-amber-500/10"
                        )}>
                          {appt.status === "confirmed" ? "Confirmada" : "Pendiente"}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-1">
                        {new Date(appt.start_time).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} a las {new Date(appt.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })} • {appt.staff?.display_name || appt.staff?.profiles?.full_name || "Cualquier barbero"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="flex items-center gap-1.5 text-[10px] font-black text-red-500/80 hover:text-red-400 transition-colors uppercase tracking-widest"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelar Cita
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-primary">{formatCurrency(appt.total_price)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 glass-card rounded-3xl border border-white/5 bg-zinc-900/10 p-6">
                <Calendar className="w-8 h-8 mx-auto mb-3 text-zinc-600 animate-pulse" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No tienes citas programadas próximamente</p>
              </div>
            )
          ) : (
            completedAppointments.length > 0 ? (
              completedAppointments.map((appt) => (
                <div key={appt.id} className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between hover:border-emerald-500/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Scissors className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{appt.service?.name}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-1">
                        {new Date(appt.start_time).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} • {appt.staff?.display_name || appt.staff?.profiles?.full_name || "Cualquier barbero"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-zinc-400">{formatCurrency(appt.total_price)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 glass-card rounded-3xl border border-white/5 bg-zinc-900/10 p-6">
                <History className="w-8 h-8 mx-auto mb-3 text-zinc-600 animate-pulse" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Aún no tienes visitas completadas</p>
              </div>
            )
          )}
        </div>

        {upcomingAppointments.length > 0 && (
          <div className="flex items-center justify-center gap-2 p-4 bg-amber-500/10 border border-amber-500/15 rounded-2xl mb-6 text-amber-500 text-xs font-bold uppercase tracking-wider text-center animate-pulse">
            ⚠️ Debes completar o cancelar tu cita actual antes de poder agendar otra.
          </div>
        )}

        <button 
          onClick={() => {
            if (upcomingAppointments.length > 0) {
              alert("Ya tienes una cita activa programada. Debes completar o cancelar tu cita actual antes de reservar una nueva.");
              return;
            }
            setStep("select-service");
          }}
          disabled={upcomingAppointments.length > 0}
          className={cn(
            "w-full font-black uppercase tracking-[0.2em] py-5 rounded-[32px] transition-all flex items-center justify-center gap-3 text-sm group active:scale-95 shadow-xl",
            upcomingAppointments.length > 0
              ? "bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed shadow-none"
              : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
          )}
        >
          {upcomingAppointments.length > 0 ? "Tienes una Cita Activa" : "Reservar Nueva Cita"}
          {upcomingAppointments.length === 0 && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
        </button>
      </div>
    );
  };

  const renderServiceSelection = () => (
    <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex items-center justify-between mb-12">
        <button onClick={() => setStep(client ? "history" : "identify")} className="p-3 hover:bg-white/10 rounded-2xl text-zinc-400 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase tracking-tight">Elige tu Servicio</h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Paso 1 de 3</p>
        </div>
      </div>

      <div className="grid gap-5">
        {services.map((service) => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
          <button 
            key={service.id}
            onClick={() => {
              setSelectedServices(prev => 
                isSelected 
                  ? prev.filter(s => s.id !== service.id)
                  : [...prev, service]
              );
            }}
            className={cn(
              "glass-card p-6 rounded-[32px] border-white/5 bg-zinc-900/20 text-left transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] flex items-center justify-between group relative overflow-hidden",
              isSelected && "border-primary/50 bg-primary/10"
            )}
          >
            {isSelected && (
              <div className="absolute top-0 right-0 p-4">
                 <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-colors mt-1">
                <Scissors className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-xl group-hover:text-white transition-colors">{service.name}</h4>
                {service.description && (
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed pr-2">{service.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{service.duration_minutes} min</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-2xl font-black text-primary">
              {formatCurrency(service.price)}
            </div>
          </button>
          );
        })}
      </div>

      {selectedServices.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 z-50">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                {selectedServices.length} {selectedServices.length === 1 ? "Servicio" : "Servicios"}
              </p>
              <p className="text-xs text-zinc-400 font-bold truncate max-w-[180px] sm:max-w-xs mt-0.5">
                {selectedServices.map((s: any) => s.name).join(', ')}
              </p>
              <p className="text-xl font-black text-primary mt-1">
                {formatCurrency(selectedServices.reduce((acc, s) => acc + (Number(s.price) || 0), 0))}
              </p>
            </div>
            <button
              onClick={() => setStep("select-staff")}
              className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] py-4 px-8 rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
            >
              Continuar <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderStaffSelection = () => (
    <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex items-center justify-between mb-12">
        <button onClick={() => setStep("select-service")} className="p-3 hover:bg-white/10 rounded-2xl text-zinc-400 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase tracking-tight">¿Con quién agendamos?</h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Paso 2 de 3</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
        {staff.map((barber) => (
          <button 
            key={barber.id}
            onClick={() => {
              setSelectedStaff(barber);
              setStep("select-time");
            }}
            className={cn(
              "flex flex-col items-center gap-4 group p-4 rounded-[48px] transition-all active:scale-95",
              selectedStaff?.id === barber.id ? "bg-primary/10 ring-2 ring-primary/50" : "hover:bg-white/5"
            )}
          >
            <div className="w-28 h-28 rounded-[40px] overflow-hidden border-2 border-white/5 group-hover:border-primary/50 transition-all shadow-2xl relative">
              {barber.avatar ? (
                <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                  <User className="w-12 h-12" />
                </div>
              )}
              {selectedStaff?.id === barber.id && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                   <CheckCircle2 className="w-10 h-10 text-white drop-shadow-xl" />
                </div>
              )}
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-white text-center">
              {barber.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTimeSelection = () => (
    <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex items-center justify-between mb-12">
        <button onClick={() => setStep("select-staff")} className="p-3 hover:bg-white/10 rounded-2xl text-zinc-400 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase tracking-tight">Elige Horario</h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Paso 3 de 3</p>
        </div>
      </div>

      <div className="space-y-10">
        <div className="space-y-4">
           <div className="flex items-center gap-3 ml-1">
              <CalendarDays className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Selecciona Fecha</h3>
           </div>
           <input 
             type="date" 
             min={new Date().toISOString().split('T')[0]}
             value={selectedDate}
             onChange={(e) => setSelectedDate(e.target.value)}
             className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl p-5 text-lg font-bold focus:border-primary/50 transition-all text-white color-scheme-dark"
           />
        </div>

        <div className="space-y-4">
           <div className="flex items-center gap-3 ml-1">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Horas Disponibles</h3>
           </div>
           
           {loading ? (
             <div className="grid grid-cols-4 gap-3">
               {[1,2,3,4,5,6,7,8].map(i => (
                 <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
               ))}
             </div>
           ) : (availableSlots.length > 0 || fragmentedOptions.length > 0) ? (
             <div className="space-y-6">
               {availableSlots.length > 0 && (
                 <div>
                   <p className="text-[10px] uppercase font-black tracking-widest text-emerald-500 mb-2">Opciones Continuas</p>
                   <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                     {availableSlots.map((slot) => (
                       <button 
                         key={slot}
                         onClick={() => {
                           setSelectedTime(slot);
                           setStep("confirm");
                         }}
                         className={cn(
                           "h-14 rounded-xl border text-sm font-bold transition-all",
                           selectedTime === slot 
                             ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" 
                             : "bg-black/20 border-white/5 text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                         )}
                       >
                         {slot}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               {fragmentedOptions.length > 0 && selectedServices.length > 1 && (
                 <div className={availableSlots.length > 0 ? "pt-4 border-t border-white/5" : ""}>
                   <p className="text-[10px] uppercase font-black tracking-widest text-amber-500 mb-2">Opciones Divididas</p>
                   <div className="grid gap-2">
                     {fragmentedOptions.map((opt: any, idx: number) => (
                       <button
                         key={`frag-${idx}`}
                         onClick={() => {
                           setSelectedTime(`frag-${idx}`);
                           setStep("confirm");
                         }}
                         className={cn(
                           "w-full text-left p-4 rounded-xl border transition-all",
                           selectedTime === `frag-${idx}`
                             ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/20"
                             : "bg-black/20 border-white/5 text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                         )}
                       >
                         <p className="font-bold text-sm">{opt.label}</p>
                         <p className="text-xs text-zinc-500 mt-1">Tiempo de espera: {opt.waitTime} min</p>
                       </button>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           ) : (
             <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/5">
               <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No hay horarios disponibles</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );

  const renderConfirm = () => (
    <div className="max-w-md mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Confirmar Cita</h2>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Casi listo...</p>
      </div>

      <div className="glass-card p-8 rounded-[40px] border-white/5 bg-zinc-900/20 space-y-8 relative overflow-hidden mb-10">
        <div className="space-y-6 relative z-10">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 mt-1">
              <Scissors className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Servicios</p>
              <div className="space-y-2 mt-1">
                {selectedServices.map(service => (
                  <p key={service.id} className="text-sm font-black">{service.name}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/5">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Barbero</p>
              <p className="text-lg font-black">{selectedStaff?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/5">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Fecha y Hora</p>
              <p className="text-lg font-black capitalize">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className="text-primary ml-2">{selectedTime}</span>
              </p>
            </div>
          </div>
        </div>

        {/* If New Client, show read-only registration details summary */}
        {!client && (
          <div className="pt-6 border-t border-white/5 space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-2">
               <UserPlus className="w-4 h-4 text-primary" />
               <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Datos de Registro</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 p-5 rounded-2xl border border-white/5 text-left">
              <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Nombre Completo</p>
                <p className="text-xs font-bold text-white truncate">{newName}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Teléfono / WhatsApp</p>
                <p className="text-xs font-bold text-white truncate">{newPhone}</p>
              </div>
              {newBirthDate && (
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Fecha de Nacimiento</p>
                  <p className="text-xs font-bold text-white truncate">{newBirthDate}</p>
                </div>
              )}
              {newEmail && (
                <div className="col-span-2">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Email</p>
                  <p className="text-xs font-bold text-white truncate">{newEmail}</p>
                </div>
              )}
              {newNotes && (
                <div className="col-span-2">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Notas</p>
                  <p className="text-xs font-bold text-white line-clamp-2">{newNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => setStep("select-time")}
          className="p-5 rounded-[32px] border border-white/5 hover:bg-white/5 text-zinc-400 transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={handleFinalBooking}
          disabled={loading || (!client && (!newName || !newPhone))}
          className="flex-1 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] py-5 rounded-[32px] transition-all shadow-xl shadow-primary-500/20 active:scale-95 flex items-center justify-center gap-3 text-sm disabled:opacity-50"
        >
          {loading ? "Reservando..." : "Confirmar Reserva"}
          <CheckCircle2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="max-w-md mx-auto pt-20 px-6 text-center animate-in zoom-in-95 duration-700 pb-20">
      <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
         <CheckCircle2 className="w-12 h-12" />
      </div>
      <h2 className="text-4xl font-black mb-4">¡Cita Agendada!</h2>
      <p className="text-zinc-500 font-medium leading-relaxed mb-10 px-6 uppercase tracking-widest text-[10px]">
        Tu reserva en <span className="text-white">{tenant.name}</span> ha sido confirmada. Te esperamos el <span className="text-white">{selectedDate}</span> a las <span className="text-primary font-black">{selectedTime}</span>.
      </p>
      
      <div className="glass-card p-6 rounded-[32px] border-white/5 bg-zinc-900/20 mb-10">
         <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Resumen de tu Cita</p>
         <div className="space-y-3">
            <div className="flex justify-between items-start text-xs font-bold uppercase tracking-tighter">
                <span className="text-zinc-500">Servicios</span>
                <div className="text-right space-y-1 max-w-[60%]">
                  {selectedServices.map(s => (
                    <p key={s.id} className="text-white truncate">{s.name}</p>
                  ))}
                </div>
             </div>
             <div className="flex justify-between text-xs font-bold uppercase tracking-tighter pt-2">
                <span className="text-zinc-500">Barbero</span>
                <span className="text-white">{selectedStaff?.name}</span>
             </div>
             <div className="flex justify-between text-xs font-bold uppercase tracking-tighter border-t border-white/5 pt-3 mt-1">
                <span className="text-zinc-500">Valor Total</span>
                <span className="text-primary font-black">{formatCurrency(selectedServices.reduce((acc, s) => acc + (s.price || 0), 0))}</span>
             </div>
         </div>
      </div>

      <button 
        onClick={() => {
          setSelectedServices([]);
          setSelectedStaff(null);
          setSelectedTime("");
          if (idNumber) {
            setStep("history");
          } else {
            setStep("identify");
          }
        }}
        className="w-full py-5 rounded-[32px] border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
      >
        Volver al Inicio
      </button>
    </div>
  );

  const renderRegister = () => (
    <div className="max-w-md mx-auto pt-20 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="glass-card rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col bg-zinc-950">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
              <UserPlus className="text-primary w-5 h-5" /> Registrar Cliente
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-medium">Añadir al directorio de la barbería</p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-7">
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
              Nombre Completo
            </label>
            <input 
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Ej: Juan Pérez" 
              className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white" 
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
              <CreditCard className="w-3 h-3 text-primary/70" /> Cédula / ID
            </label>
            <input 
              type="text"
              value={idNumber}
              disabled
              placeholder="Ej: 12345678" 
              className="w-full h-12 px-5 bg-zinc-900/30 border border-white/5 rounded-2xl text-sm outline-none text-zinc-400 cursor-not-allowed" 
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
              <Phone className="w-3 h-3 text-primary/70" /> Teléfono / WhatsApp
            </label>
            <input 
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              required
              placeholder="+57 300 000 0000" 
              className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white" 
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
              <Cake className="w-3 h-3 text-primary/70" /> Fecha de Nacimiento
            </label>
            <input 
              type="date"
              value={newBirthDate}
              onChange={(e) => setNewBirthDate(e.target.value)}
              max={new Date(new Date().getTime() - (5 * 3600000)).toISOString().split('T')[0]}
              className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white [color-scheme:dark]" 
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
              <Mail className="w-3 h-3 text-primary/70" /> Email (Opcional)
            </label>
            <input 
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="cliente@correo.com" 
              className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white" 
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
              <FileText className="w-3 h-3 text-primary/70" /> Notas (Opcional)
            </label>
            <textarea 
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Preferencias de corte, alergias, etc..." 
              className="w-full min-h-[100px] px-5 py-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white resize-none" 
            />
          </div>

          <div className="flex gap-4 pt-4 shrink-0">
            <button 
              type="button"
              onClick={() => setStep("identify")}
              className="h-14 px-6 rounded-2xl border border-white/5 hover:bg-white/5 text-zinc-400 font-bold transition-all text-xs uppercase tracking-widest"
            >
              Atrás
            </button>
            <button 
              type="button"
              onClick={() => {
                if (!newName || !newPhone) {
                  alert("Por favor completa los campos obligatorios (*)");
                  return;
                }
                setStep("select-service");
              }}
              disabled={!newName || !newPhone}
              className="flex-1 h-14 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              Guardar Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 pb-20">
      {step === "identify" && renderIdentify()}
      {step === "register" && renderRegister()}
      {step === "history" && renderHistory()}
      {step === "select-service" && renderServiceSelection()}
      {step === "select-staff" && renderStaffSelection()}
      {step === "select-time" && renderTimeSelection()}
      {step === "confirm" && renderConfirm()}
      {step === "success" && renderSuccess()}
    </div>
  );
}
