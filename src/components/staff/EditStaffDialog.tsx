"use client";

import { useState } from "react";
import { X, User, Percent, Shield, Loader2, Edit3, Camera, Calendar, Clock, ToggleLeft, ToggleRight } from "lucide-react";
import { editStaffAction } from "@/app/dashboard/staff/actions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function EditStaffDialog({ member }: { member: any }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compType, setCompType] = useState(member.compensation_type || "percentage");
  const [preview, setPreview] = useState<string | null>(member.profile?.avatar_url || null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Daily commission states
  const [generalCommission, setGeneralCommission] = useState(String(member.commission_rate || "0"));
  const [dailyCommissions, setDailyCommissions] = useState<Record<string, string>>(() => {
    const existing = member.daily_commission_rates || {};
    return {
      "0": String(existing["0"] ?? member.commission_rate ?? "0"),
      "1": String(existing["1"] ?? member.commission_rate ?? "0"),
      "2": String(existing["2"] ?? member.commission_rate ?? "0"),
      "3": String(existing["3"] ?? member.commission_rate ?? "0"),
      "4": String(existing["4"] ?? member.commission_rate ?? "0"),
      "5": String(existing["5"] ?? member.commission_rate ?? "0"),
      "6": String(existing["6"] ?? member.commission_rate ?? "0")
    };
  });
  const [showDailySettings, setShowDailySettings] = useState(false);

  // Working hours per day state (0=Sun … 6=Sat)
  const defaultWorkingHours = [
    { open: true, start: 8, end: 20, has_break: false, break_start: 13, break_end: 14 }, // dom
    { open: true, start: 8, end: 20, has_break: false, break_start: 13, break_end: 14 }, // lun
    { open: true, start: 8, end: 20, has_break: false, break_start: 13, break_end: 14 }, // mar
    { open: true, start: 8, end: 20, has_break: false, break_start: 13, break_end: 14 }, // mié
    { open: true, start: 8, end: 20, has_break: false, break_start: 13, break_end: 14 }, // jue
    { open: true, start: 8, end: 20, has_break: false, break_start: 13, break_end: 14 }, // vie
    { open: true, start: 8, end: 20, has_break: false, break_start: 13, break_end: 14 }, // sáb
  ];
  const [workingHours, setWorkingHours] = useState<Array<{open: boolean; start: number; end: number; has_break?: boolean; break_start?: number; break_end?: number}>>(
    () => {
      const saved = member.working_hours;
      return (saved && Array.isArray(saved) && saved.length === 7) ? saved : defaultWorkingHours;
    }
  );
  const [showWorkingHours, setShowWorkingHours] = useState(false);

  const updateWorkingDay = (idx: number, field: "open" | "start" | "end" | "has_break" | "break_start" | "break_end", value: boolean | number) => {
    setWorkingHours(prev => {
      const copy = prev.map(d => ({ ...d }));
      (copy[idx] as any)[field] = value;
      return copy;
    });
  };

  const handleGeneralCommissionChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    setGeneralCommission(clean);
    setDailyCommissions({
      "0": clean, "1": clean, "2": clean, "3": clean, "4": clean, "5": clean, "6": clean
    });
  };

  const handleDailyCommissionChange = (day: string, val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    setDailyCommissions(prev => ({
      ...prev,
      [day]: clean
    }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append("staff_id", member.id);
    formData.append("user_id", member.user_id);

    // Append daily commission values to FormData
    Object.entries(dailyCommissions).forEach(([day, value]) => {
      formData.set(`daily_commission_${day}`, value || generalCommission || "0");
    });

    // Append working hours as JSON
    formData.set("working_hours", JSON.stringify(workingHours));
    
    try {
      const result = await editStaffAction(formData);
      if (result?.error) {
        alert(result.error);
        return;
      }
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      alert("Error inesperado al editar miembro");
    } finally {
      setLoading(false);
    }
  }

  const daysOfWeek = [
    { id: "1", name: "Lunes" },
    { id: "2", name: "Martes" },
    { id: "3", name: "Miércoles" },
    { id: "4", name: "Jueves" },
    { id: "5", name: "Viernes" },
    { id: "6", name: "Sábado" },
    { id: "0", name: "Domingo" }
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-white/[0.04] rounded-xl transition-colors group"
        title="Editar barbero"
      >
        <Edit3 className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto pt-10 sm:pt-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-900/50">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Editar Personal</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-medium">Gestión de perfil y pagos</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">
                <input type="hidden" name="current_avatar" value={member.profile?.avatar_url || ""} />
                
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-[32px] bg-zinc-900 border-2 border-white/5 overflow-hidden flex items-center justify-center group-hover:border-primary/50 transition-all relative">
                      {preview ? (
                        <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-zinc-700" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <input 
                      type="file" 
                      name="avatar" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Actualizar Foto</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                      <User className="w-3 h-3 text-primary/70" /> Nombre Artístico
                    </label>
                    <input 
                      name="display_name" 
                      type="text" 
                      defaultValue={member.profile?.full_name}
                      required 
                      className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                      <Shield className="w-3 h-3 text-primary/70" /> Cédula (ID)
                    </label>
                    <input 
                      name="id_number" 
                      type="text" 
                      defaultValue={member.profile?.id_number}
                      required 
                      className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                      <Shield className="w-3 h-3 text-primary/70" /> Rol
                    </label>
                    <select name="role" defaultValue={member.role} required className="w-full h-12 px-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white appearance-none cursor-pointer">
                      <option value="barber">Barbero</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                      <Percent className="w-3 h-3 text-primary/70" /> Tipo de Pago
                    </label>
                    <select 
                      name="compensation_type" 
                      defaultValue={compType} 
                      onChange={(e) => setCompType(e.target.value)}
                      required 
                      className="w-full h-12 px-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white appearance-none cursor-pointer"
                    >
                      <option value="percentage">Comisión (%)</option>
                      <option value="rent">Alquiler Fijo</option>
                      <option value="both">Mixto (Ambos)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {(compType === 'percentage' || compType === 'both') && (
                    <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                        <Percent className="w-3 h-3 text-emerald-500/70" /> Comisión General (%)
                      </label>
                      <input 
                        name="commission_rate" 
                        type="number" 
                        value={generalCommission}
                        onChange={(e) => handleGeneralCommissionChange(e.target.value)}
                        className="w-full h-12 px-5 bg-zinc-900/50 border border-emerald-500/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white"
                      />
                    </div>
                  )}
                  {(compType === 'rent' || compType === 'both') && (
                    <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                        <Percent className="w-3 h-3 text-amber-500/70" /> Alquiler ($)
                      </label>
                      <input 
                        name="rent_amount" 
                        type="number" 
                        defaultValue={member.rent_amount || 0}
                        className="w-full h-12 px-5 bg-zinc-900/50 border border-amber-500/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-white"
                      />
                    </div>
                  )}
                </div>

                {/* --- SECCION DE DIAS PARA COMISIONES --- */}
                {(compType === 'percentage' || compType === 'both') && (
                  <div className="space-y-3 pt-2 border-t border-white/5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> Comisiones por Día de la Semana
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowDailySettings(!showDailySettings)}
                        className="text-[9px] font-black uppercase tracking-wider text-primary hover:underline"
                      >
                        {showDailySettings ? "Ocultar detalles" : "Configurar días individuales"}
                      </button>
                    </div>

                    {showDailySettings && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/30 p-4 rounded-2xl border border-white/5 animate-in zoom-in-95 duration-200">
                        {daysOfWeek.map((day) => (
                          <div key={day.id} className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-400 ml-1">{day.name}</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={dailyCommissions[day.id] || "0"}
                                onChange={(e) => handleDailyCommissionChange(day.id, e.target.value)}
                                className="w-full h-10 px-3 bg-zinc-900/80 border border-white/5 rounded-xl text-xs outline-none text-white text-right pr-6 font-bold"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-500">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* --- SECCION HORARIO LABORAL DEL BARBERO --- */}
                <div className="space-y-3 pt-2 border-t border-white/5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Horario Laboral del Barbero
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowWorkingHours(!showWorkingHours)}
                      className="text-[9px] font-black uppercase tracking-wider text-primary hover:underline"
                    >
                      {showWorkingHours ? "Ocultar" : "Configurar horario"}
                    </button>
                  </div>

                  {showWorkingHours && (
                    <div className="space-y-2 bg-black/30 p-4 rounded-2xl border border-white/5 animate-in zoom-in-95 duration-200">
                      <p className="text-[10px] text-zinc-500 mb-3">Solo el administrador puede editar estos horarios.</p>
                      {(["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"] as const).map((dayName, idx) => {
                        const day = workingHours[idx];
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex flex-wrap items-center gap-2 p-2 rounded-xl border transition-all",
                              day.open ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950 border-zinc-800 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-1.5 w-24 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateWorkingDay(idx, "open", !day.open)}
                                className={cn("transition-colors", day.open ? "text-primary" : "text-zinc-600")}
                              >
                                {day.open ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                              <span className={cn("text-[10px] font-bold", day.open ? "text-white" : "text-zinc-500")}>
                                {dayName.substring(0, 3)}
                              </span>
                            </div>
                            {day.open ? (
                              <div className="flex flex-col gap-2 flex-1 w-full mt-2 lg:mt-0">
                                <div className="flex items-center gap-2 flex-1 w-full">
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <span className="text-[9px] text-zinc-500 shrink-0">De</span>
                                    <select
                                      value={day.start}
                                      onChange={e => updateWorkingDay(idx, "start", Number(e.target.value))}
                                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] outline-none text-white"
                                    >
                                      {Array.from({length: 24}).map((_,h) => (
                                        <option key={h} value={h}>{h}:00</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <span className="text-[9px] text-zinc-500 shrink-0">A</span>
                                    <select
                                      value={day.end}
                                      onChange={e => updateWorkingDay(idx, "end", Number(e.target.value))}
                                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] outline-none text-white"
                                    >
                                      {Array.from({length: 24}).map((_,h) => (
                                        <option key={h} value={h}>{h}:00</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 pt-2 border-t border-white/5 w-full">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => updateWorkingDay(idx, "has_break", !day.has_break)}
                                      className={cn("transition-colors", day.has_break ? "text-amber-500" : "text-zinc-600")}
                                    >
                                      {day.has_break ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    </button>
                                    <span className={cn("text-[9px] font-bold", day.has_break ? "text-white" : "text-zinc-500")}>
                                      Hora de Almuerzo
                                    </span>
                                  </div>
                                  {day.has_break && (
                                    <div className="flex items-center gap-2 pl-6">
                                      <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <span className="text-[9px] text-zinc-500 shrink-0">Inicio</span>
                                        <select
                                          value={day.break_start || 13}
                                          onChange={e => updateWorkingDay(idx, "break_start", Number(e.target.value))}
                                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] outline-none text-white"
                                        >
                                          {Array.from({length: 24}).map((_,h) => (
                                            <option key={h} value={h}>{h}:00</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <span className="text-[9px] text-zinc-500 shrink-0">Fin</span>
                                        <select
                                          value={day.break_end || 14}
                                          onChange={e => updateWorkingDay(idx, "break_end", Number(e.target.value))}
                                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] outline-none text-white"
                                        >
                                          {Array.from({length: 24}).map((_,h) => (
                                            <option key={h} value={h}>{h}:00</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[9px] text-zinc-600 italic">Libre este día</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                    <Shield className="w-3 h-3 text-primary/70" /> Estado Operativo
                  </label>
                  <select name="is_active" defaultValue={member.is_active ? "true" : "false"} required className="w-full h-12 px-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white cursor-pointer">
                    <option value="true">Activo (Disponible)</option>
                    <option value="false">Inactivo (Ocultar)</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 shadow-xl shadow-primary/20 active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
