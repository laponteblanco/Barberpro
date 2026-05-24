import { MessageSquare, Settings2, ShieldCheck } from "lucide-react";

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de WhatsApp</h1>
        <p className="text-muted-foreground text-sm">Automatización de recordatorios y marketing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-card rounded-2xl p-8 bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold">WhatsApp Cloud API</h3>
              <p className="text-xs text-emerald-500/80 font-medium">Estado: Configurando conexión...</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-background border border-border flex items-center justify-between">
              <span className="text-sm">Recordatorios Automáticos (2h antes)</span>
              <div className="w-10 h-5 bg-muted rounded-full relative">
                <div className="absolute left-1 top-1 w-3 h-3 bg-foreground/20 rounded-full" />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border flex items-center justify-between">
              <span className="text-sm">Mensaje de Bienvenida</span>
              <div className="w-10 h-5 bg-primary rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-primary-foreground rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" /> Plantillas Meta
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Las plantillas deben ser aprobadas por Meta antes de ser enviadas masivamente.
          </p>
        </div>
      </div>
    </div>
  );
}
