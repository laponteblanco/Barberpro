"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Calendar as CalendarIcon, Clock, User, Scissors, Loader2, UserPlus, CheckCircle2, AlertCircle, Search, Banknote, Smartphone, CreditCard, ArrowUpRight } from "lucide-react";
import { createAppointmentAction, updateAppointmentDetailsAction } from "../../app/dashboard/appointments/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const formatTo12Hour = (time24: string): string => {
  if (!time24) return "";
  const parts = time24.split(":");
  if (parts.length < 2) return time24;
  const hour = parseInt(parts[0], 10);
  const min = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${min} ${ampm}`;
};

export function NewAppointmentDialog({ clients, staff, services, appointments, externalOpen, onCloseExternal, defaultValues, triggerButton, editApptId, startHour = 7, endHour = 22, theme = "light", tenantId, onAddAndCharge }: any) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [availability, setAvailability] = useState<{ status: 'idle' | 'checking' | 'available' | 'busy', message?: string }>({ status: 'idle' });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [chargeMode, setChargeMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    const themeEl = document.querySelector('.theme-light, .theme-dark') as HTMLElement;
    setPortalContainer(themeEl || document.body);
  }, []);

  // Client search state
  const initialClient = defaultValues?.client_id ? clients.find((c: any) => c.id === defaultValues.client_id) : null;
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(initialClient);

  const isModalOpen = externalOpen !== undefined ? externalOpen : isOpen;

  const handleClose = () => {
    setIsOpen(false);
    setChargeMode(false);
    setChargePaymentMethod("cash");
    if (onCloseExternal) onCloseExternal();
  };

  // Form states for real-time check
  const [formData, setFormData] = useState({
    staff_id: defaultValues?.staff_id || "",
    service_ids: defaultValues?.service_id ? [defaultValues.service_id] : (defaultValues?.service_ids || []),
    date: defaultValues?.date || "",
    time: defaultValues?.time || ""
  });

  useEffect(() => {
    if (defaultValues) {
      setFormData(prev => ({
        ...prev,
        staff_id: defaultValues.staff_id || prev.staff_id,
        service_ids: defaultValues.service_id ? [defaultValues.service_id] : (defaultValues.service_ids || prev.service_ids),
        date: defaultValues.date || prev.date,
        time: defaultValues.time || prev.time
      }));
    }
  }, [defaultValues]);

  // Fetch available slots from the API for real-time accuracy
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [fragmentedOptions, setFragmentedOptions] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const fetchCounter = useRef(0);

  const serviceIdsStr = useMemo(() => formData.service_ids.join(','), [formData.service_ids]);

  const fetchAvailableSlots = useCallback(async () => {
    if (!formData.date || !formData.staff_id || !tenantId || formData.service_ids.length === 0) {
      setAvailableSlots([]);
      return;
    }

    const currentFetchId = ++fetchCounter.current;
    setSlotsLoading(true);
    try {
      // Calculate total duration accounting for same service selected multiple times
      const serviceMap = new Map<string, any>(services.map((s: any) => [s.id, s]));
      const totalDuration = formData.service_ids.reduce((acc: number, id: string) => {
        const s = serviceMap.get(id);
        return acc + (s?.duration_minutes || 30);
      }, 0);
      
      const res = await fetch(`/api/tenants/${tenantId}/staff/${formData.staff_id}/availability?date=${formData.date}&service_ids=${serviceIdsStr}`);
      if (!res.ok) throw new Error("Error fetching slots");
      const data = await res.json();
      let slots: string[] = data.continuous || data.slots || [];
      let fragmented: any[] = data.fragmented || [];

      // If clicked from calendar and matches current staff/date selection, force add that slot
      if (defaultValues?.time && formData.date === defaultValues.date && formData.staff_id === defaultValues.staff_id) {
        if (!slots.includes(defaultValues.time)) {
          slots.push(defaultValues.time);
          slots.sort();
        }
      }

      // If editing, add the current appointment's time slot back as available
      if (editApptId && appointments) {
        const editingAppt = appointments.find((a: any) => a.id === editApptId);
        if (editingAppt) {
          const bogotaParts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Bogota",
            hour: "2-digit", minute: "2-digit", hour12: false
          }).formatToParts(new Date(editingAppt.start_time));
          const editHour = bogotaParts.find(p => p.type === "hour")?.value || "";
          const editMin = bogotaParts.find(p => p.type === "minute")?.value || "";
          const editTimeStr = `${editHour}:${editMin}`;
          if (!slots.includes(editTimeStr)) {
            slots.push(editTimeStr);
            slots.sort();
          }
        }
      }

      if (currentFetchId !== fetchCounter.current) return;

      setAvailableSlots(slots);
      setFragmentedOptions(fragmented);
    } catch (err) {
      if (currentFetchId !== fetchCounter.current) return;
      console.error("Error fetching available slots:", err);
      let fallbackSlots: string[] = [];
      if (defaultValues?.time && formData.date === defaultValues.date && formData.staff_id === defaultValues.staff_id) {
        fallbackSlots = [defaultValues.time];
      }
      setAvailableSlots(fallbackSlots);
      setFragmentedOptions([]);
    } finally {
      if (currentFetchId === fetchCounter.current) {
        setSlotsLoading(false);
      }
    }
  }, [formData.date, formData.staff_id, serviceIdsStr, tenantId, editApptId, defaultValues]);

  // Fetch slots whenever staff, date, or service changes
  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  // Also re-fetch slots when the modal opens to ensure fresh data
  useEffect(() => {
    if (isModalOpen && formData.date && formData.staff_id && tenantId) {
      fetchAvailableSlots();
    }
  }, [isModalOpen]);

  // Automatically clear selected time if it's no longer valid
  useEffect(() => {
    if (slotsLoading) return; // Don't clear while loading slots
    if (formData.time) {
      // If it is the original clicked time from the calendar for the same date/staff, do not clear
      if (defaultValues?.time && formData.time === defaultValues.time && formData.date === defaultValues.date && formData.staff_id === defaultValues.staff_id) {
        return;
      }
      const isContinuousValid = availableSlots.includes(formData.time);
      const isFragmentedValid = formData.time.startsWith("frag-") && fragmentedOptions.length > parseInt(formData.time.split("-")[1] || "999");
      if (!isContinuousValid && !isFragmentedValid) {
        setFormData(prev => ({ ...prev, time: "" }));
      }
    }
  }, [availableSlots, fragmentedOptions, formData.time, slotsLoading, defaultValues, formData.date, formData.staff_id]);

  const filteredClients = clients.filter((c: any) => 
    (c.full_name?.toLowerCase().includes(clientSearch.toLowerCase())) || 
    (c.id_number?.includes(clientSearch))
  );

  const handleInputChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isContinuousValid = availableSlots.includes(formData.time);
    const isFragmentedValid = formData.time.startsWith("frag-") && fragmentedOptions.length > parseInt(formData.time.split("-")[1] || "999");
    if (formData.time && !isContinuousValid && !isFragmentedValid) return;

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.append("is_new_client", isNewClient.toString());
    if (!isNewClient && selectedClient) {
      fd.append("client_id", selectedClient.id);
    }
    
    // Append all selected service ids as JSON array
    fd.append("service_ids", JSON.stringify(formData.service_ids));

    if (isFragmentedValid) {
      const fragIdx = parseInt(formData.time.split("-")[1]);
      const selectedFrag = fragmentedOptions[fragIdx];
      fd.append("is_fragmented", "true");
      fd.append("fragmented_slots", JSON.stringify(selectedFrag.slots));
    }

    try {
      let res;
      if (editApptId) {
        res = await updateAppointmentDetailsAction(editApptId, fd);
      } else {
        res = await createAppointmentAction(fd);
      }
      
      if (res?.error) {
        alert(res.error);
        return;
      }
      
      handleClose();

      if (!editApptId && chargeMode && res?.appointmentId && onAddAndCharge) {
        const dummyAppt = {
          id: res.appointmentId,
          start_time: formData.time.startsWith("frag-") ? new Date().toISOString() : `${formData.date}T${formData.time}:00-05:00`,
          end_time: new Date().toISOString(), // dummy end time
          total_price: services.filter((s: any) => formData.service_ids.includes(s.id)).reduce((acc: number, s: any) => acc + (Number(s.price) * formData.service_ids.filter((id: string) => id === s.id).length), 0),
          client: selectedClient || { full_name: formData.client_name || "Nuevo Cliente" },
          services: services.filter((s: any) => formData.service_ids.includes(s.id)),
          status: "pending"
        };
        onAddAndCharge(dummyAppt);
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || (editApptId ? "Error al actualizar la cita" : "Error al crear la cita"));
    } finally {
      setLoading(false);
    }
  };

  const modalContent = isModalOpen ? (
    <div className={cn(
      theme === "light" ? "theme-light" : "theme-dark",
      "fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    )}>
      <div className={cn(
        "w-[92vw] max-w-[500px] border rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200",
        theme === "light" ? "theme-light bg-white border-blue-200" : "bg-zinc-950 border-white/10"
      )}>
            <div className={cn(
              "flex items-center justify-between px-8 py-6 border-b shrink-0",
              theme === "light" ? "bg-blue-50/80 border-blue-100" : "border-white/5 bg-zinc-900/50"
            )}>
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
                      <Scissors className="w-3 h-3 text-primary/70" /> Servicios
                    </label>
                    <div className="w-full max-h-[200px] overflow-y-auto px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm transition-all flex flex-col gap-2 custom-scrollbar">
                      {[...services].sort((a: any, b: any) => (b.price ?? 0) - (a.price ?? 0)).map((s: any) => {
                        const qty = formData.service_ids.filter((id: string) => id === s.id).length;
                        return (
                          <div key={s.id} className="flex items-center gap-2 group">
                            <div className="flex-1 min-w-0">
                              <p className={cn("truncate text-sm transition-colors", qty > 0 ? "text-white font-medium" : "text-zinc-400 group-hover:text-zinc-300")}>{s.name}</p>
                              <p className="text-[10px] text-zinc-600">${Number(s.price).toLocaleString('es-CO')} · {s.duration_minutes || 30}min</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={qty === 0}
                                onClick={() => {
                                  setFormData(prev => {
                                    const idx = prev.service_ids.lastIndexOf(s.id);
                                    if (idx === -1) return prev;
                                    const newIds = [...prev.service_ids];
                                    newIds.splice(idx, 1);
                                    return { ...prev, service_ids: newIds };
                                  });
                                }}
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all",
                                  qty > 0 ? "bg-zinc-800 text-white hover:bg-zinc-700 active:scale-90" : "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                                )}
                              >
                                −
                              </button>
                              <span className={cn(
                                "w-6 text-center text-sm font-bold tabular-nums",
                                qty > 0 ? "text-primary" : "text-zinc-600"
                              )}>
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    service_ids: [...prev.service_ids, s.id]
                                  }));
                                }}
                                className="w-7 h-7 rounded-lg bg-zinc-800 text-white hover:bg-primary hover:text-white flex items-center justify-center text-sm font-bold transition-all active:scale-90"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {formData.service_ids.length > 0 && (
                      <div className="flex items-center justify-between px-2 pt-1">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {formData.service_ids.length} servicio{formData.service_ids.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-primary font-bold">
                          ${services
                            .filter((s: any) => formData.service_ids.includes(s.id))
                            .reduce((acc: number, s: any) => acc + (Number(s.price) * formData.service_ids.filter((id: string) => id === s.id).length), 0)
                            .toLocaleString('es-CO')}
                        </p>
                      </div>
                    )}
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
                      <option value="">{slotsLoading ? "Cargando horarios..." : "Seleccionar hora..."}</option>
                      
                      {availableSlots.length > 0 && (
                        <optgroup label="Opciones Continuas" className="bg-zinc-950 text-white">
                          {availableSlots.map((timeStr: string) => (
                            <option key={timeStr} value={timeStr} className="bg-zinc-950">
                              {formatTo12Hour(timeStr)}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {availableSlots.length === 0 && fragmentedOptions.length > 0 && (
                        <optgroup label="Opciones Divididas" className="bg-zinc-950 text-white">
                          {fragmentedOptions.map((opt: any, idx: number) => (
                            <option key={`frag-${idx}`} value={`frag-${idx}`} className="bg-zinc-950">
                              {opt.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
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

              <div className={cn(
                "p-6 border-t sticky bottom-0 z-10 shrink-0 space-y-3",
                theme === "light" ? "bg-blue-50/80 border-blue-100" : "border-white/5 bg-zinc-900/50"
              )}>
                {/* Bottom buttons */}
                {!editApptId ? (
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={(e) => {
                        setChargeMode(false);
                        const form = e.currentTarget.closest("form");
                        if (form) form.requestSubmit();
                      }}
                      disabled={loading || (formData.time && !availableSlots.includes(formData.time) && !formData.time.startsWith("frag-") && availability.status !== 'checking')}
                      className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {loading && !chargeMode ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Cita"}
                    </button>
                    <button
                      type="button"
                      disabled={loading || (formData.time && !availableSlots.includes(formData.time) && !formData.time.startsWith("frag-") && availability.status !== 'checking')}
                      onClick={(e) => {
                        setChargeMode(true);
                        const form = e.currentTarget.closest("form");
                        if (form) form.requestSubmit();
                      }}
                      className="h-12 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xs uppercase tracking-wider hover:bg-emerald-500/20 hover:text-emerald-300 transition-all flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap active:scale-[0.98]"
                    >
                      {loading && chargeMode ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Agregar y Cobrar
                    </button>
                  </div>
                ) : (
                  <button 
                    type="submit" 
                    disabled={loading || (formData.time && !availableSlots.includes(formData.time) && !formData.time.startsWith("frag-") && availability.status !== 'checking')}
                    className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
    );

  if (triggerButton) {
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

      {mounted && portalContainer ? createPortal(modalContent, portalContainer) : null}
    </>
  );
}
