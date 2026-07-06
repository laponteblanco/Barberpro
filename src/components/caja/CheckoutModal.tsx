"use client";

import { useState, useEffect } from "react";
import { X, Receipt, DollarSign, Loader2, CreditCard, Banknote, Smartphone, CheckCircle2, SplitSquareHorizontal } from "lucide-react";

type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "Otro";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  serviceName: string;
  barberName: string;
  totalAmount: number;
  onSuccess?: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  clientName,
  serviceName,
  barberName,
  totalAmount,
  onSuccess,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  
  // Single payment state
  const [singleMethod, setSingleMethod] = useState<PaymentMethod>("Efectivo");
  
  // Split payment state
  const [method1, setMethod1] = useState<PaymentMethod>("Efectivo");
  const [method2, setMethod2] = useState<PaymentMethod>("Tarjeta");
  const [amount1, setAmount1] = useState<string>("");
  const [amount2, setAmount2] = useState<string>("");

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSplitPayment(false);
      setSingleMethod("Efectivo");
      setMethod1("Efectivo");
      setMethod2("Tarjeta");
      setAmount1("");
      setAmount2("");
      setLoading(false);
    }
  }, [isOpen]);

  // Handle amount 1 change and auto-calculate amount 2
  const handleAmount1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    setAmount1(rawValue);

    const numericValue = Number(rawValue);
    if (numericValue <= totalAmount) {
      setAmount2(String(totalAmount - numericValue));
    } else {
      setAmount2("0");
    }
  };

  // Handle amount 2 change and auto-calculate amount 1
  const handleAmount2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    setAmount2(rawValue);

    const numericValue = Number(rawValue);
    if (numericValue <= totalAmount) {
      setAmount1(String(totalAmount - numericValue));
    } else {
      setAmount1("0");
    }
  };

  const isTotalValid = () => {
    if (!isSplitPayment) return true;
    const totalInput = Number(amount1) + Number(amount2);
    return totalInput === totalAmount;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSplitPayment && !isTotalValid()) return;
    
    setLoading(true);

    try {
      // Estructura de datos preparada para Supabase u otro backend
      const paymentData = {
        clientName,
        serviceName,
        barberName,
        totalAmount,
        payments: isSplitPayment
          ? [
              { method: method1, amount: Number(amount1) },
              { method: method2, amount: Number(amount2) },
            ]
          : [{ method: singleMethod, amount: totalAmount }],
      };

      console.log("Procesando pago...", paymentData);
      
      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // TODO: Aquí irá la integración con Supabase:
      // const { data, error } = await supabase.from('payments').insert([paymentData])
      // if (error) throw error;

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al procesar el pago", error);
      alert("Hubo un error al procesar el pago.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const PaymentMethodSelector = ({ value, onChange }: { value: PaymentMethod, onChange: (v: PaymentMethod) => void }) => (
    <div className="grid grid-cols-4 gap-2">
      {[
        { id: "Efectivo", icon: Banknote },
        { id: "Tarjeta", icon: CreditCard },
        { id: "Transferencia", icon: Smartphone },
        { id: "Otro", icon: Receipt },
      ].map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onChange(method.id as PaymentMethod)}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
            value === method.id
              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
              : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
          }`}
        >
          <method.icon className="w-5 h-5 mb-2" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{method.id}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Cobrar Servicio</h2>
              <p className="text-xs text-zinc-500 font-medium">Registrar pago en caja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content - Scrollable if needed */}
        <div className="overflow-y-auto flex-grow custom-scrollbar">
          <form id="checkout-form" onSubmit={handleCheckout} className="p-6 space-y-6">
            
            {/* Resumen */}
            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-white/5">
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Cliente</p>
                  <p className="text-white font-medium">{clientName}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Barbero</p>
                  <p className="text-white font-medium">{barberName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Servicio</p>
                  <p className="text-white font-medium">{serviceName}</p>
                </div>
              </div>
              <div className="border-t border-white/5 pt-4 flex items-end justify-between">
                <p className="text-zinc-400 font-medium">Total a Pagar</p>
                <p className="text-3xl font-black text-white tracking-tight">{formatCurrency(totalAmount)}</p>
              </div>
            </div>

            {/* Opciones de Pago */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  Método de Pago
                </label>
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(!isSplitPayment)}
                  className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                    isSplitPayment ? "text-emerald-400" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <SplitSquareHorizontal className="w-4 h-4" />
                  Cobrar con dos métodos
                </button>
              </div>

              {!isSplitPayment ? (
                <div className="space-y-2 animate-in slide-in-from-right-4 duration-300">
                  <PaymentMethodSelector value={singleMethod} onChange={setSingleMethod} />
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                  {/* Bloque 1 */}
                  <div className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20"></div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-zinc-400">Pago 1</span>
                    </div>
                    <PaymentMethodSelector value={method1} onChange={setMethod1} />
                    <div className="relative mt-3">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <DollarSign className="w-5 h-5 text-emerald-500/50" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount1 ? formatCurrency(Number(amount1)).replace('$', '').trim() : ""}
                        onChange={handleAmount1Change}
                        placeholder="Monto"
                        required
                        className="w-full h-12 pl-12 pr-4 bg-zinc-950/50 border border-white/5 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Bloque 2 */}
                  <div className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20"></div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-zinc-400">Pago 2</span>
                    </div>
                    <PaymentMethodSelector value={method2} onChange={setMethod2} />
                    <div className="relative mt-3">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <DollarSign className="w-5 h-5 text-blue-500/50" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount2 ? formatCurrency(Number(amount2)).replace('$', '').trim() : ""}
                        onChange={handleAmount2Change}
                        placeholder="Monto restante"
                        required
                        className="w-full h-12 pl-12 pr-4 bg-zinc-950/50 border border-white/5 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Validation message */}
                  {!isTotalValid() && (
                    <div className="text-red-400 text-xs font-medium text-center bg-red-400/10 py-2 rounded-xl border border-red-400/20">
                      Los montos no coinciden con el total ({formatCurrency(totalAmount)})
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-zinc-900/30 flex-shrink-0">
          <button
            form="checkout-form"
            type="submit"
            disabled={loading || (isSplitPayment && !isTotalValid())}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-lg"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Confirmar Pago
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
