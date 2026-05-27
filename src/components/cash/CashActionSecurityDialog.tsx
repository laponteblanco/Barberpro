"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Lock, X, Loader2, AlertCircle, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { verifySecurityPinAction, deleteCashSessionAction, updateCashSessionAction } from "@/app/dashboard/caja/actions";
import { formatCurrency } from "@/lib/utils";

interface CashActionSecurityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  session: any | null;
  actionType: "edit" | "delete" | null;
  onSuccess: () => void;
}

export function CashActionSecurityDialog({ isOpen, onOpenChange, session, actionType, onSuccess }: CashActionSecurityDialogProps) {
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"pin" | "action">("pin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const [newActualBalance, setNewActualBalance] = useState("");

  const resetState = () => {
    setPin("");
    setStep("pin");
    setLoading(false);
    setError(null);
    setNewActualBalance(session?.actual_balance ? String(session.actual_balance) : "");
  };

  // Set initial balance when switching to action step
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await verifySecurityPinAction(pin);
      if (res.success) {
        setStep("action");
        if (actionType === "edit" && session) {
          setNewActualBalance(String(session.actual_balance || ""));
        }
      } else {
        setError(res.error || "PIN incorrecto");
      }
    } catch (err: any) {
      setError("Error al verificar PIN");
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!session || !actionType) return;

    setLoading(true);
    setError(null);

    try {
      if (actionType === "delete") {
        const res = await deleteCashSessionAction(session.id);
        if (res.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          setError(res.error || "Error al eliminar");
        }
      } else if (actionType === "edit") {
        const balance = Number(newActualBalance.replace(/[^0-9]/g, ""));
        if (isNaN(balance) || balance < 0) {
          setError("Ingresa un monto válido");
          setLoading(false);
          return;
        }

        const res = await updateCashSessionAction(session.id, balance, session.barbers_breakdown);
        if (res.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          setError(res.error || "Error al actualizar");
        }
      }
    } catch (err: any) {
      setError("Error al ejecutar acción");
    } finally {
      setLoading(false);
    }
  };

  const isLightTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light') || (typeof document !== 'undefined' && document.querySelector('.theme-light') !== null);

  const formatInput = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    if (!clean) return "";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(Number(clean));
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center p-4 sm:items-center overflow-y-auto pt-10 sm:pt-4" />
        <Dialog.Content className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md border rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto max-h-[90vh] ${isLightTheme ? "theme-light bg-white border-blue-100" : "bg-zinc-950 border-white/10"}`}>
          
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-900/50">
            <div>
              <Dialog.Title className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                {step === "pin" ? (
                  <><Lock className="w-6 h-6 text-primary" /> Verificación Requerida</>
                ) : actionType === "delete" ? (
                  <><Trash2 className="w-6 h-6 text-red-500" /> Eliminar Cierre</>
                ) : (
                  <><Edit2 className="w-6 h-6 text-primary" /> Editar Cierre</>
                )}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-zinc-400 font-medium mt-1">
                {step === "pin" 
                  ? "Ingresa el PIN de seguridad de la barbería." 
                  : actionType === "delete" 
                    ? "Esta acción es irreversible." 
                    : "Modifica el efectivo real físico contado."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shrink-0">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm animate-in shake duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-semibold">{error}</p>
              </div>
            )}

            {step === "pin" ? (
              <form onSubmit={handlePinSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    PIN de Seguridad
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full h-14 px-4 bg-zinc-950 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-center tracking-[0.5em] text-xl font-bold"
                    placeholder="****"
                    autoFocus
                    maxLength={10}
                  />
                  <p className="text-[10px] text-zinc-500 text-center mt-2">
                    (Si no configuraste un PIN, déjalo en blanco y presiona Continuar)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continuar"}
                </button>
              </form>
            ) : (
              <form onSubmit={executeAction} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                
                {actionType === "delete" && (
                  <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl text-center space-y-3">
                    <Trash2 className="w-8 h-8 text-red-500 mx-auto" />
                    <p className="text-sm font-semibold text-zinc-300">
                      ¿Estás seguro de que deseas eliminar este cierre del historial?
                    </p>
                    <p className="text-xs text-zinc-500">
                      No afectará la caja actual, simplemente se borrará del historial y las estadísticas de este cierre se perderán permanentemente.
                    </p>
                  </div>
                )}

                {actionType === "edit" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Efectivo Esperado (Físico)</span>
                        <span className="font-bold text-zinc-300">{formatCurrency(session?.expected_cash ?? session?.expected_balance)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Total Digital</span>
                        <span className="font-bold text-cyan-400">{formatCurrency(session?.expected_digital ?? 0)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                        Nuevo Efectivo Real Contado (Físico)
                      </label>
                      <input
                        type="text"
                        value={formatInput(newActualBalance)}
                        onChange={(e) => setNewActualBalance(formatInput(e.target.value))}
                        className="w-full h-14 px-4 bg-zinc-950 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-lg font-bold"
                        placeholder="Ej. $200.000"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                    className="flex-1 h-14 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 h-14 font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 ${
                      actionType === "delete" 
                        ? "bg-red-500 text-white shadow-red-500/20" 
                        : "bg-primary text-primary-foreground shadow-primary/20"
                    }`}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : actionType === "delete" ? "Eliminar" : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
