import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/guards";
import Link from "next/link";
import { ShieldCheck, LayoutDashboard, Store, Users, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  // Validate superadmin access
  try {
    await requireSuperAdmin();
  } catch (error) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col backdrop-blur-xl">
        <div className="h-16 flex items-center px-6 border-b border-slate-800/50 gap-3">
          <ShieldCheck className="w-6 h-6 text-indigo-500" />
          <span className="font-bold text-lg text-white">BarberOS Admin</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link href="/superadmin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/superadmin/tenants" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Store className="w-5 h-5" />
            <span className="font-medium">Barberías</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              SA
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white line-clamp-1">{user?.user_metadata?.full_name || "Dueño de App"}</span>
              <span className="text-xs text-slate-500">Super Admin</span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-indigo-500/5 blur-[120px] rounded-full mix-blend-screen opacity-50" />
        </div>
        
        <div className="flex-1 overflow-y-auto relative z-10 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
