"use client";

import { useState } from "react";
import { Plus, X, User, Scissors, Percent, Shield, Loader2, Camera, CheckCircle2 } from "lucide-react";
import { addStaffAction } from "../../app/dashboard/staff/actions";

export function AddStaffDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compType, setCompType] = useState("percentage");
  const [preview, setPreview] = useState<string | null>(null);
  const [createdPin, setCreatedPin] = useState<string | null>(null);

  const handleClose = () => {
    setIsOpen(false);
    setCreatedPin(null);
    if (createdPin) window.location.reload();
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await addStaffAction(formData);
      
      if (result?.error) {
        alert(result.error);
        return;
      }

      if (result?.pin) {
        setCreatedPin(result.pin);
      } else {
        handleClose();
      }
    } catch (err: any) {
      alert("Error inesperado al añadir miembro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="h-11 px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all glow-sm"
      >
        <Plus className="w-4 h-4" /> Añadir Miembro
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:items-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto pt-10 sm:pt-4">
          <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto">
            
            {createdPin ? (
              <div className="p-10 text-center space-y-8 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">¡Miembro Contratado!</h2>
                  <p className="text-zinc-500 text-sm">Entrega este PIN al nuevo barbero para que pueda iniciar sesión.</p>
                </div>
                
                <div className="bg-zinc-950 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4">PIN de Acceso Ágil</p>
                  <span className="text-6xl font-mono font-black text-primary tracking-[0.2em]">{createdPin}</span>
                </div>

                <button 
                  onClick={handleClose}
                  className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-[0.98]"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <>
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-900/50">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Reclutar Miembro</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-medium">Añadir nuevo barbero al equipo</p>
                  </div>
                  <button onClick={handleClose} className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar max-h-[70vh]">
                  <form onSubmit={handleSubmit} className="p-8 space-y-7">
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
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Foto de Perfil (Opcional)</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                          <User className="w-3 h-3 text-primary/70" /> Nombre Artístico
                        </label>
                        <input 
                          name="display_name" 
                          placeholder="Ej: Junior El Barbero" 
                          required 
                          className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                            <Shield className="w-3 h-3 text-primary/70" /> Rol
                          </label>
                          <select name="role" required className="w-full h-12 px-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white appearance-none cursor-pointer">
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
                            required 
                            defaultValue={compType}
                            onChange={(e) => setCompType(e.target.value)}
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
                              <Percent className="w-3 h-3 text-emerald-500/70" /> Comisión (%)
                            </label>
                            <input 
                              name="commission_rate" 
                              type="number" 
                              placeholder="Ej: 40" 
                              defaultValue="0"
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
                              placeholder="Ej: 100" 
                              defaultValue="0"
                              className="w-full h-12 px-5 bg-zinc-900/50 border border-amber-500/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-white"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                          <Scissors className="w-3 h-3 text-primary/70" /> Cédula (ID)
                        </label>
                        <input 
                          name="id_number" 
                          placeholder="Para acceso ágil" 
                          required 
                          className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all glow-primary flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-[0.98]"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Contratación"}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
