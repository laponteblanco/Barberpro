import { User, Bell, Shield, Palette, ShieldAlert, ChevronRight } from "lucide-react";
import { promoteToAdminAction } from "./rescue";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const sections = [
    { 
      icon: User, 
      label: "Perfil de Barbería", 
      desc: "Logo, nombre y datos de contacto",
      href: "/dashboard/settings/profile",
      color: "text-blue-400",
      bg: "bg-blue-400/10"
    },
    { 
      icon: Bell, 
      label: "Notificaciones", 
      desc: "Configuración de WhatsApp y recordatorios",
      href: "/dashboard/settings/notifications",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10"
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm">Gestiona las preferencias de tu local</p>
      </div>

      <div className="max-w-2xl">
        {/* Menú de opciones */}
        <div className="flex flex-col gap-4">
          {sections.map((s) => (
            <Link 
              key={s.label} 
              href={s.href}
              className="w-full glass-card rounded-3xl p-6 text-left hover:border-primary/30 transition-all group flex items-center gap-5 bg-zinc-900/50 border-zinc-800"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", s.bg)}>
                <s.icon className={cn("w-6 h-6", s.color)} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{s.label}</p>
                <p className="text-sm text-zinc-500 mt-1">{s.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
          
          {/* Seguridad */}
          <div className="w-full glass-card rounded-3xl p-6 text-left opacity-50 border-dashed border-zinc-800 flex items-center gap-5">
             <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
                <Shield className="w-6 h-6 text-zinc-600" />
             </div>
             <div className="flex-1">
                <p className="font-bold text-lg">Seguridad</p>
                <p className="text-sm text-zinc-600 mt-1">Próximamente: Roles y permisos avanzados</p>
             </div>
          </div>

          {/* Apariencia */}
          <Link 
            href="/dashboard/settings/appearance"
            className="w-full glass-card rounded-3xl p-6 text-left hover:border-primary/30 transition-all group flex items-center gap-5 bg-zinc-900/50 border-zinc-800"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-400/10 flex items-center justify-center transition-transform group-hover:scale-110">
              <Palette className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">Apariencia</h2>
              <p className="text-sm text-zinc-500 mt-1">Personaliza los colores y el tema visual de tu portal</p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}
