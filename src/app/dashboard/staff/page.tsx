import { UserPlus, Shield, Scissors, Mail, MoreVertical, CheckCircle2, XCircle, Info } from "lucide-react";
import { getStaff } from "@/services/staff.service";
import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { AddStaffDialog } from "@/components/staff/AddStaffDialog";
import { EditStaffDialog } from "@/components/staff/EditStaffDialog";
import { DeleteStaffButton } from "@/components/staff/DeleteStaffButton";

export default async function StaffPage() {
  const staffMembers = await getStaff();
  const { tenantId } = await getSession();
  
  const adminSupabase = await createAdminClient();
  const { data: tenant } = await (adminSupabase as any)
    .from("tenants")
    .select("short_code")
    .eq("id", tenantId)
    .single();

  const shortCode = tenant?.short_code || "---";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipo de Trabajo</h1>
          <p className="text-muted-foreground text-sm">Gestiona barberos, administradores y sus comisiones</p>
        </div>
        <AddStaffDialog />
      </div>

      {/* Banner de Código de Acceso */}
      <div className="bg-primary/10 border border-primary/20 rounded-[24px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">Código de Acceso para Barberos</p>
            <p className="text-xs text-zinc-400">Tus barberos necesitan este código y su PIN para iniciar sesión.</p>
          </div>
        </div>
        <div className="bg-zinc-950/50 px-6 py-3 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Código de Barbería</p>
          <p className="text-2xl font-black text-primary tracking-[0.2em]">{shortCode}</p>
        </div>
      </div>

      <div className="bg-[#121214] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-zinc-900/30">
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Miembro</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Rol / Estado</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Compensación</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-center">Acceso (PIN)</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staffMembers.map((member: any) => (
                <tr key={member.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 overflow-hidden border border-primary/20 relative">
                        {member.profile?.avatar_url ? (
                          <img src={member.profile.avatar_url} alt={member.profile.full_name} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <span className="relative z-10">{member.profile?.full_name?.charAt(0) || "U"}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white text-base tracking-tight">{member.profile?.full_name || "Usuario"}</p>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-0.5">ID: {member.profile?.id_number || '---'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-primary/70" />
                        <span className="text-sm text-zinc-300 font-medium capitalize">{member.role || 'Barbero'}</span>
                      </div>
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        member.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", member.is_active ? "bg-emerald-500" : "bg-destructive")} />
                        {member.is_active ? "Activo" : "Inactivo"}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {(() => {
                      const hasCustomDaily = member.daily_commission_rates && 
                        Object.values(member.daily_commission_rates).some(v => Number(v) !== Number(member.commission_rate || 0));
                      
                      return (
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">
                            {member.compensation_type === 'rent' ? (
                              `$${member.rent_amount || 0}`
                            ) : member.compensation_type === 'both' ? (
                              `${member.commission_rate || 0}% ${hasCustomDaily ? "(Var.)" : ""} + $${member.rent_amount || 0}`
                            ) : (
                              `${member.commission_rate || 0}% ${hasCustomDaily ? "(Variable)" : ""}`
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
                            {member.compensation_type === 'rent' ? (
                              'Alquiler Fijo'
                            ) : member.compensation_type === 'both' ? (
                              `Mixto ${hasCustomDaily ? "• Días personalizados" : ""}`
                            ) : (
                              `Comisión ${hasCustomDaily ? "• Días personalizados" : "Fija"}`
                            )}
                          </p>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-8 py-6 text-center">
                    {member.access_pin ? (
                      <div className="inline-flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-white/10">
                        <span className="text-lg font-mono font-black text-primary tracking-widest">{member.access_pin}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs italic">No asignado</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <EditStaffDialog member={member} />
                      <DeleteStaffButton 
                        staffId={member.id} 
                        staffName={member.profile?.full_name || "este miembro"} 
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {staffMembers.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Shield className="w-8 h-8 text-zinc-500" />
            </div>
            <p className="text-zinc-500 font-medium tracking-tight">No hay miembros registrados todavía</p>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
