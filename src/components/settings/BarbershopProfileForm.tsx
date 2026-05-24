"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Camera, Loader2, Check, Globe, MapPin, Coins, Link as LinkIcon, Phone, Mail, Map, Clock, Copy, ExternalLink, Share2, Download } from "lucide-react";
import { updateTenantProfile, type ProfileFormData } from "@/app/dashboard/settings/actions";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRef } from "react";

const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z.string(),
  short_code: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().default("CO"),
  currency: z.string().default("COP"),
  logo_url: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  business_start: z.number().default(8),
  business_end: z.number().default(20),
});

interface Props {
  initialData: ProfileFormData;
}

export function BarbershopProfileForm({ initialData }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: initialData,
  });

  const logoUrl = watch("logo_url");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es muy pesada (máx 2MB)");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName; // Simplificado

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      console.log("Imagen subida con éxito:", publicUrl);
      setValue("logo_url", publicUrl);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Error al subir la imagen");
    } finally {
      setIsUploading(false);
    }
  };

  async function onSubmit(data: ProfileFormData) {
    setIsLoading(true);
    const result = await updateTenantProfile(data);
    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } else {
      alert(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Logo and branding */}
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border-zinc-800 bg-zinc-900/30 flex flex-col items-center text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">Logo del Local</p>
            <div 
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={cn(
                "w-40 h-40 rounded-3xl bg-zinc-800 border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 group-hover:bg-zinc-800/50",
                isUploading && "animate-pulse border-primary/50"
              )}>
                {isUploading ? (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain p-4" />
                ) : (
                  <Camera className="w-10 h-10 text-zinc-500 group-hover:text-primary transition-colors" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Camera className="w-5 h-5 text-primary-foreground" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleFileUpload}
              />
            </div>
            
            <div className="w-full mt-6 space-y-2 text-left">
              <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">URL del Logo (Generada automáticamente)</label>
              <input 
                {...register("logo_url")}
                readOnly
                placeholder="Sube una imagen..."
                className="w-full bg-black/40 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] text-zinc-500 outline-none"
              />
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 border-primary/20 bg-primary/5 shadow-xl shadow-primary/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Globe className="w-20 h-20 text-primary" />
            </div>
            
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-primary">
               <ExternalLink className="w-4 h-4" /> Link de Reservas para Clientes
            </h4>
            
            <div className="space-y-4 relative z-10">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-primary/20 flex items-center justify-between gap-3 group/link hover:border-primary/40 transition-colors">
                 <p className="text-xs font-mono text-zinc-400 truncate">
                    <span className="text-zinc-600">
                      {typeof window !== "undefined" ? window.location.origin : "barberos.app"}/
                    </span>
                    <span className="text-primary font-bold">{watch("slug") || initialData.slug}</span>
                 </p>
                 <button 
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/${watch("slug") || initialData.slug}`;
                    navigator.clipboard.writeText(url);
                    alert("¡Link copiado al portapapeles!");
                  }}
                  className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all active:scale-95 shadow-lg shadow-primary/5"
                  title="Copiar link"
                 >
                    <Copy className="w-4 h-4" />
                 </button>
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Código QR del Portal</p>
                <div className="w-40 h-40 p-2 bg-zinc-900 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden relative group/qr">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/${watch("slug") || initialData.slug}` : "http://localhost:3000")}&color=eab308&bgcolor=18181b`} 
                    alt="Código QR de reservas"
                    className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover/qr:scale-105"
                  />
                </div>
                
                {/* Sharing and Action Buttons */}
                <div className="grid grid-cols-3 gap-2 w-full pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const url = `${window.location.origin}/${watch("slug") || initialData.slug}`;
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: 'Reserva tu cita',
                            text: 'Agenda tu cita en nuestra barbería fácilmente en este enlace:',
                            url: url,
                          });
                        } catch (err) {
                          console.error("Share failed:", err);
                        }
                      } else {
                        navigator.clipboard.writeText(url);
                        alert("¡Enlace copiado al portapapeles para compartir!");
                      }
                    }}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/5 border border-white/5 hover:bg-primary/10 hover:border-primary/20 text-zinc-400 hover:text-primary transition-all active:scale-95 text-[10px] font-bold gap-1 cursor-pointer"
                    title="Compartir enlace"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Compartir</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Agenda tu cita en nuestra barbería fácilmente ingresando aquí: ${typeof window !== "undefined" ? `${window.location.origin}/${watch("slug") || initialData.slug}` : ""}`)}`}
                    target="_blank"
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/5 border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 text-zinc-400 hover:text-emerald-500 transition-all active:scale-95 text-[10px] font-bold gap-1"
                    title="Enviar por WhatsApp"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const url = `${window.location.origin}/${watch("slug") || initialData.slug}`;
                        // We use a clean high-res black-and-white QR code for printing
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}&color=000000&bgcolor=ffffff`;
                        
                        const res = await fetch(qrUrl);
                        const blob = await res.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = `qr_reservas_${watch("slug") || initialData.slug}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                      } catch (err) {
                        console.error("QR download failed:", err);
                        alert("Error al descargar el código QR");
                      }
                    }}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/5 border border-white/5 hover:bg-amber-500/10 hover:border-amber-500/20 text-zinc-400 hover:text-amber-500 transition-all active:scale-95 text-[10px] font-bold gap-1 cursor-pointer"
                    title="Descargar código QR para imprimir"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar</span>
                  </button>
                </div>
              </div>
              
              <p className="text-[10px] text-zinc-500 leading-relaxed px-1">
                 Envía este link a tus clientes por WhatsApp, compártelo en tus redes sociales o descarga el código QR para imprimirlo y colocarlo en tu mostrador.
              </p>

              <a 
                href={`/${watch("slug") || initialData.slug}`}
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all mt-2"
              >
                Probar mi Portal <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 border-primary/20 bg-primary/5 shadow-xl shadow-primary/5">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-primary">
               <Check className="w-4 h-4" /> Código de Acceso Barberos
            </h4>
            <div className="p-4 rounded-2xl bg-zinc-950 border border-primary/20 text-center group relative overflow-hidden">
               <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <p className="text-3xl font-black text-white tracking-[0.2em] relative z-10">
                  {watch("short_code") || initialData.short_code}
               </p>
            </div>
            <p className="text-[10px] text-zinc-400 mt-4 leading-relaxed">
               Comparte este código con tus barberos para que puedan iniciar sesión en su app.
            </p>
          </div>
        </div>

        {/* Right column: Form fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-8 border-zinc-800 bg-zinc-900/30 space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* URL Slug */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-bold text-zinc-400 ml-1 flex items-center gap-2">
                   <LinkIcon className="w-3.5 h-3.5" /> Nombre de URL Personalizada (Slug)
                </label>
                <input
                  {...register("slug")}
                  className={cn(
                    "w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/50 outline-none transition-all",
                    errors.slug && "border-red-500/50"
                  )}
                  placeholder="Ej. moon-city-barber"
                />
                <p className="text-[10px] text-zinc-500 ml-2">Usa solo letras, números y guiones. Ejemplo: moon-city-barber</p>
              </div>

              {/* Local Name */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-bold text-zinc-400 ml-1">Nombre del Local</label>
                <input
                  {...register("name")}
                  className={cn(
                    "w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all",
                    errors.name && "border-red-500/50 focus:ring-red-500/20"
                  )}
                  placeholder="Ej. Barbería El Elegante"
                />
                {errors.name && <p className="text-xs text-red-400 ml-1">{errors.name.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400 ml-1 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> Teléfono de Contacto
                </label>
                <input
                  {...register("phone")}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="Ej. +57 300 123 4567"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400 ml-1 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Correo Electrónico
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="contacto@local.com"
                />
              </div>

              {/* Address */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-bold text-zinc-400 ml-1 flex items-center gap-2">
                  <Map className="w-3.5 h-3.5" /> Dirección Física
                </label>
                <input
                  {...register("address")}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="Calle 10 # 43 - 21"
                />
              </div>

              {/* Location Grid */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400 ml-1 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Ciudad
                </label>
                <input
                  {...register("city")}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="Ej. Medellín"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400 ml-1 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" /> País
                </label>
                <select
                  {...register("country")}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                >
                  <option value="CO">Colombia</option>
                  <option value="VE">Venezuela</option>
                  <option value="AR">Argentina</option>
                  <option value="MX">México</option>
                  <option value="CL">Chile</option>
                </select>
              </div>

              {/* Currency */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-bold text-zinc-400 ml-1 flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5" /> Moneda del Local
                </label>
                <select
                  {...register("currency")}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                >
                  <option value="COP">COP ($) - Peso Colombiano</option>
                  <option value="USD">USD ($) - Dólar Estadounidense</option>
                  <option value="VES">VES (Bs) - Bolívar Soberano</option>
                  <option value="ARS">ARS ($) - Peso Argentino</option>
                </select>
              </div>

              {/* Business Hours */}
              <div className="space-y-4 sm:col-span-2 pt-4 border-t border-white/5">
                <label className="text-sm font-bold text-primary flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Horario de Atención (Agenda)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Hora de Apertura</label>
                    <select
                      {...register("business_start", { valueAsNumber: true })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i}>{i}:00 {i >= 12 ? 'PM' : 'AM'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Hora de Cierre</label>
                    <select
                      {...register("business_end", { valueAsNumber: true })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i}>{i}:00 {i >= 12 ? 'PM' : 'AM'}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 ml-1 italic">
                  Este horario define los límites de tu calendario de citas.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-5 rounded-3xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]",
              isSuccess 
                ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                : "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20",
              isLoading && "opacity-80 cursor-wait"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando cambios...
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-5 h-5" />
                ¡Cambios guardados con éxito!
              </>
            ) : (
              "Guardar Perfil de Barbería"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
