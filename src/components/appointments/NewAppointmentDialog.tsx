"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Calendar as CalendarIcon, Clock, User, Scissors, Loader2, UserPlus, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { createAppointmentAction, updateAppointmentDetailsAction } from "../../app/dashboard/appointments/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function NewAppointmentDialog({ clients, staff, services, appointments, externalOpen, onCloseExternal, defaultValues, triggerButton, editApptId, startHour = 7, endHour = 22 }: any) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [availability, setAvailability] = useState<{ status: 'idle' | 'checking' | 'available' | 'busy', message?: string }>({ status: 'idle' });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Client search state
  const initialClient = defaultValues?.client_id ? clients.find((c: any) => c.id === defaultValues.client_id) : null;
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(initialClient);

  const isModalOpen = externalOpen !== undefined ? externalOpen : isOpen;

  const handleClose = () => {
    setIsOpen(false);
    if (onCloseExternal) onCloseExternal();
  };

  // Form states for real-time check
  const [formData, setFormData] = useState({
    staff_id: defaultValues?.staff_id || "",
    service_id: defaultValues?.service_id || "",
    date: defaultValues?.date || "",
    time: defaultValues?.time || ""
  });

  useEffect(() => {
    if (defaultValues) {
      setFormData(prev => ({
        ...prev,
        staff_id: defaultValues.staff_id || prev.staff_id,
        service_id: defaultValues.service_id || prev.service_id,
        date: defaultValues.date || prev.date,
        time: defaultValues.time || prev.time
      }));
    }
  }, [defaultValues]);

  const availableSlots = useMemo(() => {
    const service = services.find((s: any) => s.id === formData.service_id);
    const duration = service?.duration_minutes || 15; // default to 15 min chunk if no service
    
    if (!formData.date || !formData.staff_id) return [];
    
    // Get Bogota Now for comparison
    const now = new Date();
    const nowBogota = new Date(now.getTime() - (5 * 3600000));
    const todayStr = `${nowBogota.getUTCFullYear()}-${String(nowBogota.getUTCMonth() + 1).padStart(2, '0')}-${String(nowBogota.getUTCDate()).padStart(2, '0')}`;
    const currentHour = nowBogota.getUTCHours();
    const currentMin = nowBogota.getUTCMinutes();

    // Filter appointments for the selected date and staff
    // A Bogota day starts at 05:00 UTC and ends at 05:00 UTC next day
    const startOfBogotaDay = new Date(`${formData.date}T00:00:00Z`);
    startOfBogotaDay.setTime(startOfBogotaDay.getTime() + (5 * 3600000));
    
    const endOfBogotaDay = new Date(startOfBogotaDay);
    endOfBogotaDay.setHours(endOfBogotaDay.getHours() + 24);

    const editId = editApptId || "00000000-0000-0000-0000-000000000000";
    
    const dailyAppointments = (appointments || []).filter((appt: any) => {
      if (appt.staff_id !== formData.staff_id) return false;
      if (appt.id === editId) return false;
      if (appt.status === "cancelled") return false;
      
      const apptStart = new Date(appt.start_time).getTime();
      return apptStart >= startOfBogotaDay.getTime() && apptStart < endOfBogotaDay.getTime();
    });

    const slots = [];
    // Use the passed business hours or fall back to defaults
    const effectiveStartHour = startHour;
    const effectiveEndHour = endHour;
    
    for (let h = effectiveStartHour; h <= effectiveEndHour; h++) {
      for (let m of [0, 15, 30, 45]) {
        if (h === effectiveEndHour && m > 0) continue; // limit to exactly endHour
        
        // Prevent booking in the past if it's today
        if (formData.date === todayStr) {
          if (h < currentHour || (h === currentHour && m < currentMin)) continue;
        }

        // Calculate slot range in UTC (h:m is Bogota time, so add 5h for UTC)
        const slotStart = new Date(`${formData.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
        slotStart.setTime(slotStart.getTime() + (5 * 3600000));
        
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        
        const hasConflict = dailyAppointments.some((appt: any) => {
          const apptStart = new Date(appt.start_time).getTime();
          const apptEnd = new Date(appt.end_time).getTime();
          return slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart;
        });
        
        if (!hasConflict) {
          slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
      }
    }
    return slots;
  }, [formData.date, formData.service_id, formData.staff_id, appointments, services, editApptId]);

  // Automatically clear selected time if it's no longer valid for the selected service duration
  useEffect(() => {
    if (formData.time && availableSlots.length > 0 && !availableSlots.includes(formData.time)) {
      setFormData(prev => ({ ...prev, time: "" }));
    }
  }, [availableSlots, formData.time]);

  const filteredClients = clients.filter((c: any) => 
    (c.full_name?.toLowerCase().includes(clientSearch.toLowerCase())) || 
    (c.id_number?.includes(clientSearch))
  );

  const handleInputChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.time && !availableSlots.includes(formData.time)) return;

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.append("is_new_client", isNewClient.toString());
    if (!isNewClient && selectedClient) {
      fd.append("client_id", selectedClient.id);
    }
    
    try {
      if (editApptId) {
        await updateAppointmentDetailsAction(editApptId, fd);
      } else {
        await createAppointmentAction(fd);
      }
      setIsOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || (editApptId ? "Error al actualizar la cita" : "Error al crear la cita"));
    } finally {
      setLoading(false);
    }
  };

  const modalContent = isModalOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-[92vw] max-w-[500px] bg-zinc-950 border border-white/10 rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-zinc-900/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{editApptId ? "Editar Cita" : "Agendar Cita"}</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-medium">{editApptId ? "Modificar turno existente" : "Asignar turno en la agenda"}</p>
              </div>
              <button onClick={handleClose} className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 p-8 space-y-7 overflow-y-auto custom-scrollbar">
                {/* Cliente Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <User className="w-3 h-3 text-primary/70" /> Cliente
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNewClient(!isNewClient)}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
                    >
                      {isNewClient ? "Buscar existente" : "+ Nuevo Cliente"}
                    </button>
                  </div>

                  {isNewClient ? (
                    <div className="space-y-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                      <input 
                        name="new_client_name" 
                        placeholder="Nombre completo *" 
                        required={isNewClient}
                        className="w-full h-10 px-4 bg-zinc-950 border border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-white" 
                      />
                      <input 
                        name="new_client_cedula" 
                        placeholder="Cédula / Documento *" 
                        required={isNewClient}
                        className="w-full h-10 px-4 bg-zinc-950 border border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-white" 
                      />
                      <input 
                        name="new_client_phone" 
                        placeholder="Teléfono / WhatsApp *" 
                        required={isNewClient}
                        className="w-full h-10 px-4 bg-zinc-950 border border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-white" 
                      />
                      <input 
                        name="new_client_birth_date" 
                        type="date"
                        max={new Date(new Date().getTime() - (5 * 3600000)).toISOString().split('T')[0]}
                        className="w-full h-10 px-4 bg-zinc-950 border border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-white [color-scheme:dark]" 
                      />
                      <input 
                        name="new_client_email" 
                        type="email"
                        placeholder="Email (Opcional)" 
                        className="w-full h-10 px-4 bg-zinc-950 border border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-white" 
                      />
                      <textarea 
                        name="new_client_notes" 
                        placeholder="Notas (Opcional)" 
                        className="w-full min-h-[60px] px-4 py-2 bg-zinc-950 border border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-white resize-none" 
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                          key="search-client-input"
                          type="text"
                          placeholder="Buscar por nombre o cédula..."
                          required={!isNewClient && !selectedClient}
                          value={(selectedClient ? selectedClient.full_name : clientSearch) || ""}
                          onChange={(e) => {
                            setClientSearch(e.target.value);
                            setSelectedClient(null);
                          }}
                          className="w-full h-12 pl-11 pr-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white"
                        />
                        {selectedClient && (
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedClient(null);
                              setClientSearch("");
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg text-zinc-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      {clientSearch && !selectedClient && (
                        <div className="bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden max-h-[180px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                          {filteredClients.length === 0 ? (
                            <div className="p-4 text-center">
                              <p className="text-xs text-zinc-500 mb-2">No se encontraron resultados</p>
                              <button type="button" onClick={() => setIsNewClient(true)} className="text-[10px] text-primary hover:underline font-bold uppercase tracking-widest">Crear nuevo cliente</button>
                            </div>
                          ) : (
                            filteredClients.map((c: any) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedClient(c);
                                  setClientSearch("");
                                }}
                                className="w-full p-4 flex items-center justify-between hover:bg-primary/10 transition-colors border-b border-white/5 last:border-0"
                              >
                                <div className="text-left">
                                  <p className="text-sm font-bold text-white">{c.full_name}</p>
                                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-0.5">{c.id_number || 'Sin cédula'}</p>
                                </div>
                                <CheckCircle2 className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100" />
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Resource Selection */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                      <Scissors className="w-3 h-3 text-primary/70" /> Barbero
                    </label>
                    <select 
                      name="staff_id" 
                      required 
                      value={formData.staff_id}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white appearance-none cursor-pointer"
                    >
                      <option value="">Seleccionar...</option>
                      {staff.map((s: any) => (
                        <option key={s.id} value={s.id} className="bg-zinc-950">{s.display_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                      <Scissors className="w-3 h-3 text-primary/70" /> Servicio
                    </label>
                    <select 
                      name="service_id" 
                      required 
                      value={formData.service_id}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white appearance-none cursor-pointer"
                    >
                      <option value="">Seleccionar...</option>
                      {services.map((s: any) => (
                        <option key={s.id} value={s.id} className="bg-zinc-950">{s.name} (${s.price})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                      <CalendarIcon className="w-3 h-3 text-primary/70" /> Fecha
                    </label>
                    <input 
                      type="date" 
                      name="date" 
                      required 
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white [color-scheme:dark]" 
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                      <Clock className="w-3 h-3 text-primary/70" /> Hora
                    </label>
                    <select 
                      name="time" 
                      required 
                      value={formData.time}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white appearance-none cursor-pointer" 
                    >
                      <option value="">Seleccionar hora...</option>
                      {availableSlots.map((timeStr: string) => (
                        <option key={timeStr} value={timeStr} className="bg-zinc-950">
                          {timeStr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Availability Indicator */}
                {availability.status !== 'idle' && (
                  <div className={cn(
                    "p-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 border",
                    availability.status === 'checking' && "bg-zinc-900/50 text-zinc-500 border-white/5",
                    availability.status === 'available' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                    availability.status === 'busy' && "bg-destructive/10 text-destructive border-destructive/20"
                  )}>
                    {availability.status === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {availability.status === 'available' && <CheckCircle2 className="w-4 h-4" />}
                    {availability.status === 'busy' && <AlertCircle className="w-4 h-4" />}
                    {availability.message || "Verificando..."}
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="p-8 border-t border-white/5 bg-zinc-900/50 sticky bottom-0 z-10 shrink-0">
                <button 
                  type="submit" 
                  disabled={loading || (formData.time && !availableSlots.includes(formData.time) && availability.status !== 'checking')}
                  className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editApptId ? "Guardar Cambios" : "Confirmar Cita")}
                </button>
              </div>
            </form>
          </div>
        </div>
  ) : null;

  return (
    <>
      {triggerButton !== false && (triggerButton || (
        <button 
          onClick={() => setIsOpen(true)}
          className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-[0_0_30px_-5px_hsla(var(--primary-glow))] animate-pulse-glow active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" /> Nueva Cita
        </button>
      ))}

      {mounted && typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null}
    </>
  );
}
