import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Step = "SELECT_BARBER" | "SELECT_SERVICE" | "SELECT_TIME" | "CONFIRMATION";

interface BookingState {
  step: Step;
  shopSlug: string | null;
  barberId: string | null;
  serviceId: string | null;
  date: string;
  time: string | null;
  
  // Actions
  setStep: (step: Step) => void;
  setShopSlug: (slug: string) => void;
  setBarberId: (id: string | null) => void;
  setServiceId: (id: string | null) => void;
  setDate: (date: string) => void;
  setTime: (time: string | null) => void;
  reset: () => void;
  goBack: (initialBarberId?: string) => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      step: "SELECT_BARBER",
      shopSlug: null,
      barberId: null,
      serviceId: null,
      date: new Date().toISOString().split("T")[0],
      time: null,

      setStep: (step) => set({ step }),
      setShopSlug: (shopSlug) => set({ shopSlug }),
      setBarberId: (barberId) => set({ barberId }),
      setServiceId: (serviceId) => set({ serviceId }),
      setDate: (date) => set({ date }),
      setTime: (time) => set({ time }),
      
      reset: () => set({
        step: "SELECT_BARBER",
        shopSlug: null,
        barberId: null,
        serviceId: null,
        date: new Date().toISOString().split("T")[0],
        time: null,
      }),

      goBack: (initialBarberId) => {
        const currentStep = get().step;
        if (currentStep === "SELECT_SERVICE" && !initialBarberId) {
          set({ step: "SELECT_BARBER" });
        } else if (currentStep === "SELECT_TIME") {
          set({ step: "SELECT_SERVICE" });
        } else if (currentStep === "CONFIRMATION") {
          set({ step: "SELECT_TIME" });
        }
      }
    }),
    {
      name: "barberos-booking-storage", // name of the item in the storage (must be unique)
      partialize: (state) => ({ 
        barberId: state.barberId, 
        serviceId: state.serviceId, 
        date: state.date, 
        time: state.time,
        step: state.step,
        shopSlug: state.shopSlug
      }),
    }
  )
);
