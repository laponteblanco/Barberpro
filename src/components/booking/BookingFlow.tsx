"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Scissors, Calendar, User, CheckCircle, Clock } from "lucide-react";
import { useBookingStore } from "@/store/useBookingStore";

// --- Mocks ---
const mockGetShopBarbers = async (shopSlug: string) => {
  return [
    { id: "b1", name: "Carlos", avatar: "👨🏻‍🦲", role: "Master Barber" },
    { id: "b2", name: "Luis", avatar: "🧔🏽", role: "Barber" },
    { id: "b3", name: "Ana", avatar: "👩🏻", role: "Stylist" },
  ];
};

const mockGetBarberDetails = async (barberId: string) => {
  const barbers: Record<string, any> = {
    b1: { id: "b1", name: "Carlos", avatar: "👨🏻‍🦲", role: "Master Barber" },
    b2: { id: "b2", name: "Luis", avatar: "🧔🏽", role: "Barber" },
    b3: { id: "b3", name: "Ana", avatar: "👩🏻", role: "Stylist" },
  };
  return barbers[barberId];
};

const mockGetServices = async () => {
  return [
    { id: "s1", name: "Corte Clásico", duration: 30, price: 30000 },
    { id: "s2", name: "Corte + Barba", duration: 45, price: 45000 },
    { id: "s3", name: "Perfilado de Barba", duration: 15, price: 15000 },
  ];
};

const mockGetBarberAvailability = async (barberId: string, date: string) => {
  return ["10:00 AM", "11:00 AM", "02:00 PM", "04:30 PM"];
};

interface BookingFlowProps {
  shopSlug: string;
  initialBarberId?: string;
}

export function BookingFlow({ shopSlug, initialBarberId }: BookingFlowProps) {
  const {
    step, setStep,
    barberId, setBarberId,
    serviceId, setServiceId,
    date, setDate,
    time, setTime,
    goBack, reset,
    setShopSlug
  } = useBookingStore();

  // Handle Hydration mismatch and persist store init
  const [mounted, setMounted] = useState(false);

  // Datos
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [selectedBarberDetails, setSelectedBarberDetails] = useState<any>(null);

  // Initialize store and component
  useEffect(() => {
    setMounted(true);
    setShopSlug(shopSlug);

    // Si viene con un barbero inicial en URL y es distinto al guardado
    if (initialBarberId && initialBarberId !== barberId) {
      setBarberId(initialBarberId);
      if (step === "SELECT_BARBER") {
        setStep("SELECT_SERVICE");
      }
    }
  }, [shopSlug, initialBarberId, barberId, step, setShopSlug, setBarberId, setStep]);

  // Cargar datos
  useEffect(() => {
    if (!mounted) return;

    if (!initialBarberId && barbers.length === 0) {
      mockGetShopBarbers(shopSlug).then(setBarbers);
    }
    
    const activeBarber = initialBarberId || barberId;
    if (activeBarber) {
      mockGetBarberDetails(activeBarber).then(setSelectedBarberDetails);
    }

    if (services.length === 0) {
      mockGetServices().then(setServices);
    }
  }, [shopSlug, initialBarberId, barberId, mounted]); // removed barbers and services from dependency to avoid loop

  // Cargar disponibilidad
  useEffect(() => {
    if (mounted && barberId && step === "SELECT_TIME") {
      mockGetBarberAvailability(barberId, date).then(setAvailability);
    }
  }, [barberId, date, step, mounted]);

  const handleBarberSelect = (id: string) => {
    setBarberId(id);
    setStep("SELECT_SERVICE");
  };

  const handleServiceSelect = (id: string) => {
    setServiceId(id);
    setStep("SELECT_TIME");
  };

  const handleTimeSelect = (t: string) => {
    setTime(t);
    setStep("CONFIRMATION");
  };

  const handleFinish = () => {
    reset();
    window.location.reload(); // En app real podría redirigir al perfil o inicio
  };

  if (!mounted) {
    // Evitar hydration mismatch (el estado local del cliente difiere del servidor)
    return null;
  }

  // --- UI Components ---
  return (
    <div className="max-w-md mx-auto min-h-[100dvh] bg-zinc-950 flex flex-col relative overflow-hidden animate-in fade-in duration-300 shadow-2xl">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
        <button
          onClick={() => goBack(initialBarberId)}
          className={`p-2 -ml-2 rounded-full text-zinc-400 hover:text-white transition-colors ${step === "SELECT_BARBER" || (step === "SELECT_SERVICE" && initialBarberId) ? "invisible" : ""}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-sm font-black tracking-widest uppercase text-white">BarberOS</h1>
          {selectedBarberDetails && (
            <p className="text-xs text-rose-400 font-medium">con {selectedBarberDetails.name}</p>
          )}
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-zinc-900">
        <div 
          className="h-full bg-rose-500 transition-all duration-500 ease-out"
          style={{ 
            width: step === "SELECT_BARBER" ? "25%" : 
                   step === "SELECT_SERVICE" ? "50%" : 
                   step === "SELECT_TIME" ? "75%" : "100%" 
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        {/* PASO 1: Seleccionar Barbero */}
        {step === "SELECT_BARBER" && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold mb-6 tracking-tight">Elige tu Barbero</h2>
            <div className="grid grid-cols-2 gap-4">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleBarberSelect(b.id)}
                  className="bg-zinc-900/50 border border-white/5 p-4 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-zinc-800 hover:border-white/10 transition-all active:scale-95"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl">
                    {b.avatar}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white">{b.name}</p>
                    <p className="text-xs text-zinc-500 font-medium">{b.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: Seleccionar Servicio */}
        {step === "SELECT_SERVICE" && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            {initialBarberId && selectedBarberDetails && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-2xl">
                  {selectedBarberDetails.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Reserva Exclusiva</h3>
                  <p className="text-white font-medium text-lg">Cita con {selectedBarberDetails.name}</p>
                </div>
              </div>
            )}
            
            <h2 className="text-2xl font-bold mb-6 tracking-tight flex items-center gap-2">
              <Scissors className="w-6 h-6 text-rose-500" />
              ¿Qué te vas a hacer?
            </h2>
            <div className="space-y-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleServiceSelect(s.id)}
                  className={`w-full bg-zinc-900/50 border p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] ${serviceId === s.id ? 'border-rose-500 bg-rose-500/5' : 'border-white/5 hover:bg-zinc-800'}`}
                >
                  <div className="text-left">
                    <p className="font-bold text-white text-lg">{s.name}</p>
                    <p className="text-xs text-zinc-400 font-medium flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {s.duration} min
                    </p>
                  </div>
                  <div className="text-rose-400 font-black">
                    ${s.price.toLocaleString("es-CO")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 3: Seleccionar Fecha y Hora */}
        {step === "SELECT_TIME" && (
          <div className="animate-in slide-in-from-right-4 duration-300">
             <h2 className="text-2xl font-bold mb-6 tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-rose-500" />
              Fecha y Hora
            </h2>
            
            <div className="mb-6">
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-rose-500 transition-colors color-scheme-dark"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {availability.map((t) => (
                <button
                  key={t}
                  onClick={() => handleTimeSelect(t)}
                  className={`bg-zinc-900/50 border py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${time === t ? 'border-rose-500 text-rose-400 bg-rose-500/20' : 'border-white/5 hover:bg-rose-500/10 hover:border-rose-500/50 hover:text-rose-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 4: Confirmación */}
        {step === "CONFIRMATION" && (
          <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-10 h-full">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black mb-2 tracking-tight text-center">¡Cita Confirmada!</h2>
            <p className="text-zinc-400 text-center mb-8 px-4">
              Te esperamos el {date} a las {time} con {selectedBarberDetails?.name}.
            </p>

            <button 
              onClick={handleFinish}
              className="w-full max-w-[200px] h-12 bg-white text-black font-bold rounded-2xl active:scale-95 transition-transform"
            >
              Volver al inicio
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
