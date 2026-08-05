import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'admin' | 'barber'

interface AuthState {
  isHybrid: boolean;
  activeView: ViewMode;
  setIsHybrid: (val: boolean) => void;
  setActiveView: (view: ViewMode) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isHybrid: false,
      activeView: 'admin', // Por defecto si es dueño, empieza en admin
      setIsHybrid: (val) => set({ isHybrid: val }),
      setActiveView: (view) => set({ activeView: view }),
      reset: () => set({ isHybrid: false, activeView: 'admin' })
    }),
    { 
      name: 'auth-view-storage' 
    }
  )
)
