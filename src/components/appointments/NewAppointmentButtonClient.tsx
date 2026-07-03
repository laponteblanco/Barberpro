"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NewAppointmentDialog } from "./NewAppointmentDialog";
import {
  X, ArrowLeft, DollarSign, Banknote, Smartphone, CreditCard, ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { PaymentMethod, AppointmentStatus } from "@/types/database";

interface Props {
  clients: any[];
  staff: any[];
  services: any[];
  appointments: any[];
  startHour: number;
  endHour: number;
  theme: string;
  tenantId: string;
}

const PAYMENT_METHODS = [
  { id: "cash",      label: "Efectivo",    Icon: Banknote },
  { id: "nequi",     label: "Nequi",       Icon: Smartphone },
  { id: "daviplata", label: "Daviplata",   Icon: Smartphone },
  { id: "card",      label: "Tarjeta",     Icon: CreditCard },
  { id: "transfer",  label: "Transferencia", Icon: ArrowUpRight },
];

export function NewAppointmentButtonClient({
  clients, staff, services, appointments,
  startHour, endHour, theme, tenantId
}: Props) {
  const router = useRouter();
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [discountAmount, setDiscountAmount] = useState<number | "">("");
  const [cashGiven, setCashGiven] = useState<number | "">("");
  const [mounted, setMounted] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const themeEl = document.querySelector(".theme-light, .theme-dark") as HTMLElement;
    setPortalContainer(themeEl || document.body);
  }, []);

  const resetModal = () => {
    setSelectedAppt(null);
    setShowPaymentSelector(false);
    setPaymentMethod("cash");
    setDiscountAmount("");
    setCashGiven("");
  };

  const totalPrice = selectedAppt?.total_price ?? 0;
  const discount = Number(discountAmount) || 0;
  const finalTotal = Math.max(0, totalPrice - discount);
  const change = paymentMethod === "cash" && Number(cashGiven) > 0
    ? Number(cashGiven) - finalTotal
    : 0;

  const handleCharge = async () => {
    if (!selectedAppt) return;
    try {
      const supabase = createClient();
      // Map UI payment method IDs to DB enum values
      const pmMap: Record<string, PaymentMethod> = {
        cash: "cash",
        card: "card",
        transfer: "transfer",
        nequi: "transfer",
        daviplata: "transfer",
      };
      const dbPaymentMethod: PaymentMethod = pmMap[paymentMethod] ?? "cash";
      const completedStatus: AppointmentStatus = "completed";

      await supabase.from("appointments").update({
        status: completedStatus,
        payment_method: dbPaymentMethod,
        discount_amount: discount || 0,
        total_price: finalTotal,
      }).eq("id", selectedAppt.id);

      await supabase.from("cash_register_entries").insert({
        tenant_id: tenantId,
        appointment_id: selectedAppt.id,
        amount: finalTotal,
        payment_method: paymentMethod,
        staff_id: selectedAppt.staff?.id || null,
        description: `Cobro cita - ${selectedAppt.client?.full_name || "Cliente"}`,
        type: "income",
      });

      resetModal();
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error al registrar el cobro");
    }
  };

  return (
    <>
      <NewAppointmentDialog
        clients={clients}
        staff={staff}
        services={services}
        appointments={appointments}
        startHour={startHour}
        endHour={endHour}
        theme={theme}
        tenantId={tenantId}
        onAddAndCharge={(appt: any) => {
          setSelectedAppt(appt);
          setShowPaymentSelector(true);
        }}
      />

      {mounted && portalContainer && selectedAppt && createPortal(
        <div
          className={cn(
            theme === "light" ? "theme-light" : "theme-dark",
            "fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          )}
          style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(10,10,25,0.92) 50%, rgba(0,0,0,0.88) 100%)" }}
        >
          <div className="w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-fit my-auto bg-white border border-blue-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50/50">
              <div className="flex items-center gap-2">
                {!showPaymentSelector ? null : (
                  <button
                    onClick={() => setShowPaymentSelector(false)}
                    className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h3 className="font-bold text-blue-900 tracking-tight text-sm">
                    {showPaymentSelector ? "Cobrar Servicio" : "Cita Agendada"}
                  </h3>
                  {!showPaymentSelector && (
                    <p className="text-[9px] text-blue-600 uppercase tracking-widest font-bold mt-0.5">
                      {selectedAppt.client?.full_name}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={resetModal} className="p-2 hover:bg-blue-100 rounded-xl text-blue-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {!showPaymentSelector ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl border border-blue-100 bg-white shadow-sm">
                      <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black mb-1">Cliente</p>
                      <p className="font-bold text-xs text-blue-900">{selectedAppt.client?.full_name || "—"}</p>
                    </div>
                    <div className="p-3 rounded-2xl border border-blue-100 bg-white shadow-sm">
                      <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black mb-1">Total</p>
                      <p className="font-bold text-xs text-blue-600">
                        {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(totalPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl border border-blue-100 bg-white shadow-sm">
                    <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black mb-1">Servicios</p>
                    <p className="font-medium text-xs text-blue-800">
                      {selectedAppt.services?.length > 0
                        ? selectedAppt.services.map((s: any) => s?.name).filter(Boolean).join(", ")
                        : (selectedAppt.service?.name || "Servicio")}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPaymentSelector(true)}
                    className="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 bg-blue-600 text-white shadow-[0_8px_24px_-4px_rgba(37,99,235,0.35)]"
                  >
                    <DollarSign className="w-4 h-4" /> Cobrar Ahora
                  </button>
                </>
              ) : (
                <>
                  {/* Payment method */}
                  <div className="space-y-2">
                    <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black">Método de pago</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {PAYMENT_METHODS.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          onClick={() => setPaymentMethod(id)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-xl border text-[9px] font-black uppercase tracking-wide transition-all",
                            paymentMethod === id
                              ? "bg-blue-600 border-blue-600 text-white shadow-md"
                              : "bg-white border-blue-100 text-blue-400 hover:border-blue-300"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black">Descuento (opcional)</p>
                    <input
                      type="number"
                      min={0}
                      placeholder="$ Valor del descuento"
                      value={discountAmount}
                      onChange={e => setDiscountAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-blue-100 text-xs text-blue-900 outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  {/* Cash given */}
                  {paymentMethod === "cash" && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black">Efectivo recibido</p>
                      <input
                        type="number"
                        min={0}
                        placeholder="$ Monto entregado"
                        value={cashGiven}
                        onChange={e => setCashGiven(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-xl border border-blue-100 text-xs text-blue-900 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  )}

                  {/* Totals */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-blue-700">
                      <span className="font-semibold">Servicios</span>
                      <span>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(totalPrice)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600">
                        <span className="font-semibold">Descuento</span>
                        <span>- {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(discount)}</span>
                      </div>
                    )}
                    {paymentMethod === "cash" && Number(cashGiven) > 0 && change >= 0 && (
                      <div className="flex justify-between text-xs text-blue-500">
                        <span className="font-semibold">Cambio</span>
                        <span>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(change)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm text-blue-900 border-t border-blue-100 pt-2 mt-1">
                      <span>TOTAL A COBRAR</span>
                      <span className="text-blue-600">
                        {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(finalTotal)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCharge}
                    className="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-xs bg-blue-600 text-white shadow-[0_8px_24px_-4px_rgba(37,99,235,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    Confirmar Cobro
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        portalContainer
      )}
    </>
  );
}
