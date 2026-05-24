"use client";

import { useState } from "react";
import { Loader2, X, Scissors, Clock, DollarSign, Tag, Edit2, Camera, Image as ImageIcon } from "lucide-react";
import { updateServiceAction } from "./actions";
import * as Dialog from "@radix-ui/react-dialog";

interface EditProps {
  service: any;
}

export function EditServiceDialog({ service }: EditProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(service.image_url || null);

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
      const result = await updateServiceAction(service.id, formData);
      if (result?.error) {
        alert("Error: " + result.error);
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
        <button 
          className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
          title="Editar servicio"
        >
          <Edit2 className="w-4 h-4 text-zinc-500 group-hover:text-indigo-500 transition-colors" />
        </button>
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center p-4 sm:items-center overflow-y-auto pt-10 sm:pt-4" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#121214] border border-white/10 rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto max-h-[90vh]">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-900/50">
            <div>
              <Dialog.Title className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <Scissors className="text-indigo-500 w-5 h-5" /> Editar Servicio
              </Dialog.Title>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-medium">Actualizar precio, duración o estado</p>
            </div>
            <Dialog.Close className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-7">
              <input type="hidden" name="current_image" value={service.image_url || ""} />
              
              {/* Image Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl bg-zinc-900 border-2 border-white/5 overflow-hidden flex items-center justify-center group-hover:border-indigo-500/50 transition-all relative">
                    {preview ? (
                      <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-zinc-700" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    name="image" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Actualizar Imagen</p>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2 ml-1">
                  Nombre del Servicio
                </label>
                <input 
                  name="name" 
                  defaultValue={service.name}
                  required
                  placeholder="Ej: Corte Clásico" 
                  className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-white" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
                    <Clock className="w-3 h-3 text-indigo-500/70" /> Duración (Min)
                  </label>
                  <input 
                    name="duration_minutes"
                    type="number"
                    min="5"
                    step="5"
                    defaultValue={service.duration_minutes}
                    required
                    placeholder="30" 
                    className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white" 
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
                    <DollarSign className="w-3 h-3 text-indigo-500/70" /> Precio ($)
                  </label>
                  <input 
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={service.price}
                    required
                    placeholder="25.00" 
                    className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
                    <Tag className="w-3 h-3 text-indigo-500/70" /> Categoría
                  </label>
                  <select 
                    name="category"
                    defaultValue={service.category || "Haircut"}
                    required
                    className="w-full h-12 px-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white appearance-none cursor-pointer"
                  >
                    <option value="Haircut">Corte de Cabello</option>
                    <option value="Beard">Barba</option>
                    <option value="Combo">Combo</option>
                    <option value="Color">Colorimetría</option>
                    <option value="Spa">Cuidado Facial/Spa</option>
                  </select>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
                    <Tag className="w-3 h-3 text-indigo-500/70" /> Estado
                  </label>
                  <select 
                    name="is_active"
                    defaultValue={service.is_active ? "true" : "false"}
                    required
                    className="w-full h-12 px-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white appearance-none cursor-pointer"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Oculto</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 ml-1">
                  Descripción (Opcional)
                </label>
                <textarea 
                  name="description"
                  defaultValue={service.description || ""}
                  placeholder="Detalles sobre el servicio..." 
                  className="w-full min-h-[80px] px-5 py-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white resize-none" 
                />
              </div>

              <div className="pt-4">
                <button 
                  disabled={loading} 
                  className="w-full h-14 bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
