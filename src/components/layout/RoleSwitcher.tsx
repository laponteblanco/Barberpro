"use client"

import { useAuthStore } from '@/store/useAuthStore'
import { Briefcase, Scissors, ArrowRightLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function RoleSwitcher() {
  const { isHybrid, activeView, setActiveView } = useAuthStore()
  const router = useRouter()

  // Si no es un usuario híbrido, no renderizar nada
  if (!isHybrid) return null

  const handleSwitch = () => {
    if (activeView === 'admin') {
      setActiveView('barber')
      router.push('/dashboard/staff') // Ajusta las rutas según tu esquema
    } else {
      setActiveView('admin')
      router.push('/dashboard/admin') // Ajusta las rutas según tu esquema
    }
  }

  return (
    <div className="p-3 bg-zinc-900 border-b border-white/5">
      <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 px-2">
          {activeView === 'admin' ? (
            <Briefcase className="w-4 h-4 text-emerald-400" />
          ) : (
            <Scissors className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Vista: {activeView === 'admin' ? 'Administrador' : 'Barbero'}
          </span>
        </div>
        
        <button 
          onClick={handleSwitch}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
        >
          <ArrowRightLeft className="w-3 h-3" />
          Cambiar
        </button>
      </div>
    </div>
  )
}
