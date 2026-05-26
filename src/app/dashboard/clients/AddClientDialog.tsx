"use client";

import { useState } from "react";
import { UserPlus, Loader2, X, Phone, Mail, FileText, CreditCard, Cake } from "lucide-react";
import { createClientAction } from "./actions";
import * as Dialog from "@radix-ui/react-dialog";

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      full_name: formData.get("full_name") as string,
      id_number: formData.get("id_number") as string,
      phone: formData.get("phone") as string,
      birth_date: formData.get("birth_date") as string,
      email: formData.get("email") as string,
      notes: formData.get("notes") as string,
    };

    try {
      const result = await createClientAction(data);
      if (result?.error) {
        if (result.error.includes("unique_phone_per_tenant") || result.error.includes("phone_key") || result.error.includes("duplicate key")) {
          alert("Ya existe un cliente registrado con este número de teléfono.");
        } else {
          alert("Error: " + result.error);
        }
        return;
      }
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="h-11 px-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-primary/20 active:scale-[0.98]">
          <UserPlus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center p-4 sm:items-center overflow-y-auto pt-10 sm:pt-4" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-950 border border-white/10 rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto max-h-[90vh]">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-900/50">
            <div>
              <Dialog.Title className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <UserPlus className="text-primary w-5 h-5" /> Registrar Cliente
              </Dialog.Title>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-medium">Añadir al directorio de la barbería</p>
            </div>
            <Dialog.Close className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                  Nombre Completo
                </label>
                <input 
                  name="full_name" 
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
                  name="id_number" 
                  required
                  placeholder="Ej: 12345678" 
                  className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white" 
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
                  <Phone className="w-3 h-3 text-primary/70" /> Teléfono / WhatsApp
                </label>
                <input 
                  name="phone"
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
                  name="birth_date"
                  type="date"
                  max={new Date(new Date().getTime() - (5 * 3600000)).toISOString().split('T')[0]}
                  className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white [color-scheme:dark]" 
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
                  <Mail className="w-3 h-3 text-primary/70" /> Email (Opcional)
                </label>
                <input 
                  name="email"
                  type="email"
                  placeholder="cliente@correo.com" 
                  className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white" 
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
                  <FileText className="w-3 h-3 text-primary/70" /> Notas (Opcional)
                </label>
                <textarea 
                  name="notes"
                  placeholder="Preferencias de corte, alergias, etc..." 
                  className="w-full min-h-[100px] px-5 py-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white resize-none" 
                />
              </div>

              <div className="pt-4">
                <button 
                  disabled={loading} 
                  className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Guardar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
