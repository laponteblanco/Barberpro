"use client";

import { useState } from "react";
import { X, User, Percent, Shield, Loader2, Edit3, Camera } from "lucide-react";
import { editStaffAction } from "@/app/dashboard/staff/actions";
import { cn } from "@/lib/utils";

export function EditStaffDialog({ member }: { member: any }) {
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append("staff_id", member.id);
    formData.append("user_id", member.user_id);
    
    try {
      const result = await editStaffAction(formData);
      if (result?.error) {
        alert(result.error);
        return;
      }
      setIsOpen(false);
      window.location.reload();
    } catch (err) {
      alert("Error inesperado al editar miembro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-muted rounded-xl transition-colors group"
        title="Editar barbero"
      >
        <Edit3 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto pt-10 sm:pt-4">
          <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto">
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
              <form onSubmit={handleSubmit} className="space-y-7">
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
                        <Percent className="w-3 h-3 text-emerald-500/70" /> Comisión (%)
                      </label>
                      <input 
                        name="commission_rate" 
                        type="number" 
                        defaultValue={member.commission_rate || 0}
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
