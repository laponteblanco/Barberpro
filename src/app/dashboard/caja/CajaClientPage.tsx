"use client";

import { useState, Fragment } from "react";
import { 
  Lock, 
  Unlock, 
  TrendingUp, 
  Coins, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  User, 
  Wallet, 
  CheckCircle2, 
  Info,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingBag,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Smartphone,
  CreditCard,
  Edit2,
  Trash2,
  Scissors,
  Landmark
} from "lucide-react";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { openCashAction, closeCashAction } from "./actions";
import { useRouter } from "next/navigation";
import { CashActionSecurityDialog } from "@/components/cash/CashActionSecurityDialog";
import { AddExpenseDialog } from "@/components/caja/AddExpenseDialog";

interface CajaClientPageProps {
  activeSession: any;
  history: any[];
}

export function CajaClientPage({ activeSession, history }: CajaClientPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local notification banner state
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Forms states
  const [openingBalance, setOpeningBalance] = useState("");
  const [actualBalance, setActualBalance] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [closedSessionReportUrl, setClosedSessionReportUrl] = useState<string | null>(null);

  // Barbers deliveries states
  const [barberDeliveries, setBarberDeliveries] = useState<Record<string, {
    actual: string; // formatted input value
    isConfirmed: boolean;
  }>>({});

  // History row expansion state
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  // Security action states
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const [selectedSessionForAction, setSelectedSessionForAction] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"edit" | "delete" | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = Number(openingBalance.replace(/[^0-9]/g, ""));
    if (isNaN(balance) || balance < 0) {
      setError("Por favor ingresa un monto válido");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await openCashAction(balance);
      if (!res.success) {
        setError(res.error || "Ocurrió un error");
      } else {
        setOpeningBalance("");
        showNotification("Caja abierta con éxito", "success");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Error al abrir la caja");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = Number(actualBalance.replace(/[^0-9]/g, ""));
    if (isNaN(balance) || balance < 0) {
      setError("Por favor ingresa un monto válido");
      return;
    }

    if (!confirm("¿Estás seguro de que deseas realizar el arqueo y cerrar la caja?")) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Compile the verified barbers breakdown
      const compiledBarbersBreakdown = (activeSession.barbers_breakdown || []).map((b: any) => {
        const delivery = barberDeliveries[b.id];
        const actualNum = delivery ? Number(delivery.actual.replace(/[^0-9]/g, "")) : 0;
        const expectedNum = b.net_expected_cash ?? b.total_cash;
        const discrepancy = actualNum - expectedNum;
        
        return {
          id: b.id,
          name: b.name,
          appointments_count: b.appointments_count,
          expected_cash: expectedNum,
          actual_cash: actualNum,
          discrepancy: discrepancy,
          is_verified: delivery?.isConfirmed || false,
          total_advances: b.total_advances || 0,
          total_payments: b.total_payments || 0,
          total_consignments: b.total_consignments || 0,
          total_cash: b.total_cash || 0,
          total_digital: b.total_digital || 0,
          total_commission: b.total_commission || 0,
          total_shop_profit: b.total_shop_profit || 0
        };
      });

      const res = await closeCashAction(balance, compiledBarbersBreakdown);
      if (!res.success) {
        setError(res.error || "Ocurrió un error");
      } else {
        showNotification("Caja cerrada. Generando PDF...", "info");
        
        try {
          const { generateCashClosingPDF } = await import("@/lib/pdf");
          const pdfBlob = await generateCashClosingPDF(activeSession, compiledBarbersBreakdown);
          
          const formData = new FormData();
          formData.append("file", pdfBlob, "cierre.pdf");
          
          const { uploadClosingReportAction } = await import("./actions");
          const uploadRes = await uploadClosingReportAction(formData);
          
          if (uploadRes.success && uploadRes.url) {
            setClosedSessionReportUrl(uploadRes.url);
          } else {
            const url = URL.createObjectURL(pdfBlob);
            setClosedSessionReportUrl(url);
          }
        } catch (e) {
          console.error("PDF Error", e);
          showNotification("Caja cerrada, pero error al generar PDF.", "error");
        }

        setActualBalance("");
        setBarberDeliveries({});
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Error al cerrar la caja");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic calculations for closing
  const actualBalanceNum = Number(actualBalance.replace(/[^0-9]/g, ""));
  const expectedCashNum = activeSession ? activeSession.expected_cash : 0;
  const expectedDigitalNum = activeSession ? activeSession.expected_digital : 0;
  const expectedBalanceNum = activeSession ? activeSession.expected_balance : 0;
  const discrepancy = actualBalanceNum - expectedCashNum;

  // Helper for formatting inputs to currency string
  const formatInput = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    if (!clean) return "";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(Number(clean));
  };

  const handleBarberActualChange = (staffId: string, val: string) => {
    const formatted = formatInput(val);
    setBarberDeliveries(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        actual: formatted,
      }
    }));
  };

  const toggleConfirmBarber = (staffId: string) => {
    setBarberDeliveries(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        isConfirmed: !prev[staffId]?.isConfirmed
      }
    }));
  };

  const handleApplyToGlobal = () => {
    let total = 0;
    (activeSession.barbers_breakdown || []).forEach((b: any) => {
      const delivery = barberDeliveries[b.id];
      if (delivery) {
        const num = Number(delivery.actual.replace(/[^0-9]/g, ""));
        total += num;
      }
    });

    // Add starting base since it must be in the register too!
    const startingBase = activeSession ? Number(activeSession.opening_balance || 0) : 0;
    const finalTotal = startingBase + total;

    setActualBalance(formatInput(String(finalTotal)));
    showNotification(`Suma pre-llenada en arqueo global: ${formatCurrency(finalTotal)} (Base + entregas de barberos)`, "success");
  };

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  return (
    <div className="space-y-12">
      {/* Floating Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-zinc-900 border border-emerald-500/20 rounded-2xl shadow-2xl flex items-center gap-3 text-emerald-400 text-sm animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-semibold">{notification.message}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm animate-in shake duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Success Modal for Report */}
      {closedSessionReportUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-emerald-500/20 rounded-[32px] w-full max-w-md shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Caja Cerrada con Éxito</h2>
            <p className="text-zinc-400 mb-8 font-medium">El arqueo se ha registrado correctamente y el PDF de cierre ha sido generado.</p>
            
            <div className="space-y-3">
              <a 
                href={closedSessionReportUrl}
                download="cierre_de_caja.pdf"
                className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/5 transition-all"
              >
                <ClipboardList className="w-5 h-5" /> Descargar PDF
              </a>
              <a 
                href={`https://wa.me/?text=${encodeURIComponent("Hola, adjunto el resumen del cierre de caja: " + closedSessionReportUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Smartphone className="w-5 h-5" /> Enviar por WhatsApp
              </a>
            </div>

            <button 
              onClick={() => setClosedSessionReportUrl(null)}
              className="mt-6 text-zinc-500 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors"
            >
              Cerrar esta ventana
            </button>
          </div>
        </div>
      )}

      {/* --- CAJA CERRADA --- */}
      {!activeSession && (
        <div className="max-w-xl mx-auto">
          <div className="glass-card rounded-[32px] p-8 border-white/5 bg-zinc-900/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            
            <div className="w-16 h-16 rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-800/50 shadow-lg mx-auto mb-6 text-zinc-500 glow-sm">
              <Lock className="w-7 h-7" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">Caja Cerrada</h2>
            <p className="text-zinc-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed font-medium">
              Establece una base de dinero inicial en efectivo para abrir la caja y comenzar a registrar las citas y ventas del día.
            </p>

            <form onSubmit={handleOpenCaja} className="mt-8 space-y-5 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                  Monto Base Inicial (Efectivo)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(formatInput(e.target.value))}
                    placeholder="Ej: $100.000"
                    required
                    disabled={loading}
                    className="w-full h-14 pl-12 pr-4 bg-zinc-950 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-lg font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 mt-2 bg-primary text-black font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm uppercase tracking-wider"
              >
                {loading ? "Abriendo..." : "Abrir Caja"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- CAJA ABIERTA --- */}
      {activeSession && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header Actions */}
          <div className="flex justify-end items-center gap-4">
            <AddExpenseDialog />
          </div>

          {/* Active stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Card: Starting Base */}
            <div className="glass-card rounded-[24px] p-6 border-white/5 bg-zinc-900/30 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center text-zinc-400 border border-zinc-800 shadow-lg shrink-0">
                <Unlock className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1.5">Base Inicial</p>
                <p className="text-xl font-black text-white">{formatCurrency(activeSession.opening_balance)}</p>
                <p className="text-[9px] text-zinc-500 font-medium truncate mt-1">
                  Aper. {formatTime(activeSession.opened_at)}
                </p>
              </div>
            </div>

            {/* Card: Expenses */}
            <div className="glass-card rounded-[24px] p-6 border-white/5 bg-zinc-900/30 flex items-center gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 blur-2xl rounded-full" />
              <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-lg shrink-0 z-10">
                <ArrowDownLeft className="w-5 h-5 text-rose-400" />
              </div>
              <div className="min-w-0 flex-1 z-10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1.5">Gastos del Día</p>
                <p className="text-xl font-black text-rose-400">{formatCurrency(activeSession.expenses_total || 0)}</p>
                <p className="text-[9px] text-zinc-500 font-medium mt-1">
                  Salidas de dinero físico
                </p>
              </div>
            </div>

            {/* Card: Expected Cash in Drawer */}
            <div className="glass-card rounded-[24px] p-6 border-white/5 bg-zinc-900/30 flex items-center gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-2xl rounded-full" />
              <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-lg shrink-0 z-10">
                <Coins className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1 z-10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1.5">Efectivo Esperado</p>
                <p className="text-xl font-black text-emerald-400">{formatCurrency(activeSession.expected_cash)}</p>
                <p className="text-[9px] text-zinc-500 font-medium mt-1">
                  Físico en Caja (Base + Ventas)
                </p>
              </div>
            </div>

            {/* Card: Expected Digital Income */}
            <div className="glass-card rounded-[24px] p-6 border-white/5 bg-zinc-900/30 flex items-center gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 blur-2xl rounded-full" />
              <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-lg shrink-0 z-10">
                <Smartphone className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1 z-10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1.5">Dinero Digital</p>
                <p className="text-xl font-black text-cyan-400">{formatCurrency(activeSession.expected_digital)}</p>
                <p className="text-[9px] text-zinc-500 font-medium mt-1">
                  Tarjeta, Nequi, Daviplata, Transf.
                </p>
              </div>
            </div>

            {/* Card: Expected Balance Total */}
            <div className="glass-card rounded-[24px] p-6 border-white/5 bg-zinc-900/30 flex items-center gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 blur-2xl rounded-full" />
              <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-lg shrink-0 z-10">
                <Wallet className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="min-w-0 flex-1 z-10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1.5">Total de Caja</p>
                <p className="text-xl font-black text-yellow-500">{formatCurrency(activeSession.expected_balance)}</p>
                <p className="text-[9px] text-zinc-500 font-medium mt-1">
                  Efectivo + Digital Total
                </p>
              </div>
            </div>
          </div>

          {/* --- SECCION: CIERRE POR BARBERO --- */}
          <div className="glass-card rounded-[32px] p-8 border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <User className="w-5 h-5 text-primary" /> Arqueo y Cierre por Barbero
                </h3>
                <p className="text-zinc-400 text-xs mt-1 font-medium">
                  Verifica el efectivo y lo recaudado en digital de forma individual por cada barbero en el turno.
                </p>
              </div>
              
              <button
                type="button"
                onClick={handleApplyToGlobal}
                className="px-5 h-11 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <ArrowUpRight className="w-4 h-4" /> Sumar entregas al Cierre Global
              </button>
            </div>

            {/* Barbers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {(activeSession.barbers_breakdown || []).map((barber: any) => {
                const delivery = barberDeliveries[barber.id] || { actual: "", isConfirmed: false };
                const actualNum = Number(delivery.actual.replace(/[^0-9]/g, ""));
                const expectedNum = barber.net_expected_cash ?? barber.total_cash;
                const barberDiscrepancy = actualNum - expectedNum;
                const hasValue = delivery.actual !== "";

                return (
                  <div 
                    key={barber.id}
                    className={`relative rounded-2xl border transition-all duration-300 p-5 overflow-hidden ${
                      delivery.isConfirmed 
                        ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.03)]" 
                        : "bg-zinc-950/40 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {delivery.isConfirmed && (
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400 font-bold shrink-0">
                          {barber.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white truncate leading-tight">{barber.name}</h4>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                            {barber.appointments_count + barber.appointments_digital_count} servicios realizados
                          </p>
                        </div>
                      </div>
                      
                      {delivery.isConfirmed && (
                        <div className="h-6 px-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 animate-in fade-in zoom-in duration-300">
                          <CheckCircle2 className="w-3 h-3" /> Verificado
                        </div>
                      )}
                    </div>

                    <div className="mt-5 space-y-4">
                      {/* Expected breakdown */}
                      <div className="space-y-1.5 border-b border-white/5 pb-3 mb-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-zinc-500 flex items-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5 text-primary" /> Servicios Totales:
                          </span>
                          <span className="font-bold text-white">{barber.appointments_count + barber.appointments_digital_count}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-zinc-500 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Recaudo Total:
                          </span>
                          <span className="font-bold text-white">{formatCurrency((barber.total_cash || 0) + (barber.total_digital || 0))}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-zinc-500 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" /> Comisión Barbero:
                          </span>
                          <span className="font-bold text-primary">{formatCurrency(barber.total_commission || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-zinc-500 flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5 text-zinc-400" /> Utilidad Barbería:
                          </span>
                          <span className="font-bold text-zinc-300">{formatCurrency(barber.total_shop_profit || 0)}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-b border-white/5 pb-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-zinc-500 flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-emerald-400" /> Efectivo de Citas:
                          </span>
                          <span className="font-bold text-white">{formatCurrency(barber.total_cash)}</span>
                        </div>
                        {barber.total_advances > 0 && (
                          <div className="flex justify-between items-center text-xs text-red-400 animate-in fade-in duration-200">
                            <span className="font-semibold flex items-center gap-1.5">
                              <ArrowUpRight className="w-3.5 h-3.5" /> Vales de Caja Hoy:
                            </span>
                            <span className="font-bold">-{formatCurrency(barber.total_advances)}</span>
                          </div>
                        )}
                        {barber.total_payments > 0 && (
                          <div className="flex justify-between items-center text-xs text-emerald-400 animate-in fade-in duration-200">
                            <span className="font-semibold flex items-center gap-1.5">
                              <ArrowDownLeft className="w-3.5 h-3.5" /> Abonos / Pagos Hoy:
                            </span>
                            <span className="font-bold">+{formatCurrency(barber.total_payments)}</span>
                          </div>
                        )}
                        {barber.total_consignments > 0 && (
                          <div className="flex justify-between items-center text-xs text-amber-500/80 animate-in fade-in duration-200">
                            <span className="font-semibold flex items-center gap-1.5">
                              <ShoppingBag className="w-3.5 h-3.5" /> Fiados / Consignación Hoy:
                            </span>
                            <span className="font-bold">{formatCurrency(barber.total_consignments)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2 mt-1">
                          <span className="font-semibold text-zinc-500 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> Digital Recaudado:
                          </span>
                          <span className="font-bold text-white">{formatCurrency(barber.total_digital || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2 mt-1">
                          <span className="font-bold text-zinc-300">Efectivo Neto Esperado:</span>
                          <span className="font-black text-primary">{formatCurrency(expectedNum)}</span>
                        </div>
                      </div>

                      {/* Cash Input Form for the handover */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                          Efectivo Físico Entregado
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="w-4 h-4 text-zinc-600" />
                          </div>
                          <input
                            type="text"
                            value={delivery.actual}
                            onChange={(e) => handleBarberActualChange(barber.id, e.target.value)}
                            placeholder="Ej: $50.000"
                            disabled={delivery.isConfirmed}
                            className="w-full h-11 pl-9 pr-3 bg-zinc-950 border border-white/5 rounded-xl text-white placeholder:text-zinc-800 outline-none focus:border-primary/40 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                          />
                        </div>
                      </div>

                      {/* Barber discrepancy calculations */}
                      {hasValue && (
                        <div className="animate-in fade-in duration-200">
                          {barberDiscrepancy === 0 ? (
                            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Monto exacto cuadrado</span>
                            </div>
                          ) : barberDiscrepancy < 0 ? (
                            <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Faltante: {formatCurrency(Math.abs(barberDiscrepancy))}</span>
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5" />
                              <span>Sobrante: {formatCurrency(barberDiscrepancy)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action button */}
                      <button
                        type="button"
                        onClick={() => toggleConfirmBarber(barber.id)}
                        disabled={!hasValue}
                        className={`w-full h-10 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                          delivery.isConfirmed
                            ? "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                            : "bg-primary text-black hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                        }`}
                      >
                        {delivery.isConfirmed ? "Editar Entrega" : "Confirmar Entrega"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {(activeSession.barbers_breakdown || []).length === 0 && (
                <div className="col-span-full py-10 text-center bg-zinc-950/20 rounded-2xl border border-white/5">
                  <User className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm font-medium">No hay barberos con ventas en efectivo en este turno</p>
                </div>
              )}
            </div>
          </div>

          {/* Details split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: Summary detailed */}
            <div className="glass-card rounded-[32px] p-8 border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-xl space-y-6">
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" /> Resumen de Movimientos (Discriminado)
              </h3>

              <div className="space-y-4">
                {/* EFECTIVO */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest border-b border-white/5 pb-1">
                    1. Movimientos en Efectivo
                  </h4>
                  <div className="flex items-center justify-between py-1 text-xs">
                    <span className="text-zinc-400 font-medium">Base Apertura</span>
                    <span className="font-bold text-zinc-300">{formatCurrency(activeSession.opening_balance)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 text-xs">
                    <span className="text-zinc-400 font-medium">Citas (Efectivo)</span>
                    <span className="font-bold text-emerald-400">+{formatCurrency(activeSession.appointments_cash_total)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 text-xs">
                    <span className="text-zinc-400 font-medium">Ventas de Productos</span>
                    <span className="font-bold text-emerald-400">+{formatCurrency(activeSession.sales_total)}</span>
                  </div>
                  {activeSession.expenses_total > 0 && (
                    <div className="flex items-center justify-between py-1 text-xs animate-in fade-in">
                      <span className="text-zinc-400 font-medium flex items-center gap-1">
                        Gastos Registrados
                        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-md">{activeSession.expenses?.length || 0}</span>
                      </span>
                      <span className="font-bold text-rose-400">-{formatCurrency(activeSession.expenses_total)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2 text-sm font-black border-t border-white/5 pt-2">
                    <span className="text-white">Total Efectivo Esperado:</span>
                    <span className="text-emerald-400">{formatCurrency(activeSession.expected_cash)}</span>
                  </div>
                </div>

                {/* DIGITAL */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-1">
                    2. Movimientos Digitales
                  </h4>
                  
                  {activeSession.digital_breakdown && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between py-1 text-xs">
                        <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-cyan-400" /> Tarjeta
                        </span>
                        <span className="font-bold text-white">{formatCurrency(activeSession.digital_breakdown.card)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 text-xs">
                        <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Nequi
                        </span>
                        <span className="font-bold text-white">{formatCurrency(activeSession.digital_breakdown.nequi)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 text-xs">
                        <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-red-400" /> Daviplata
                        </span>
                        <span className="font-bold text-white">{formatCurrency(activeSession.digital_breakdown.daviplata)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 text-xs">
                        <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> Transferencia
                        </span>
                        <span className="font-bold text-white">{formatCurrency(activeSession.digital_breakdown.transfer)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 text-sm font-black border-t border-white/5 pt-2">
                    <span className="text-white">Total Digital Esperado:</span>
                    <span className="text-cyan-400">{formatCurrency(activeSession.expected_digital)}</span>
                  </div>
                </div>

                {/* TOTAL */}
                <div className="border-t-2 border-dashed border-white/10 pt-4 flex items-center justify-between text-lg font-black bg-zinc-950/20 p-4 rounded-2xl">
                  <span className="text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" /> Total Esperado Caja:
                  </span>
                  <span className="text-primary">{formatCurrency(activeSession.expected_balance)}</span>
                </div>
              </div>
            </div>

            {/* Right: Closing Form */}
            <div className="glass-card rounded-[32px] p-8 border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-xl space-y-6">
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" /> Cierre Global de Caja (Arqueo Físico)
              </h3>

              <form onSubmit={handleCloseCaja} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    Efectivo Real Contado (Físico)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <DollarSign className="w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={actualBalance}
                      onChange={(e) => setActualBalance(formatInput(e.target.value))}
                      placeholder="Ej: $250.000"
                      required
                      disabled={loading}
                      className="w-full h-14 pl-12 pr-4 bg-zinc-950 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-lg font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 ml-1 leading-relaxed">
                    Ingresa únicamente el efectivo físico contado en el cajón de la caja. Las ventas digitales no se cuentan físicamente aquí.
                  </p>
                </div>

                {/* Discrepancy indicator */}
                {actualBalance && (
                  <div className="animate-in fade-in duration-300">
                    {discrepancy === 0 ? (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="font-black">¡Caja Cuadrada Perfectamente!</p>
                          <p className="text-[10px] opacity-80 mt-0.5">El efectivo físico en la caja coincide al 100% con los registros.</p>
                        </div>
                      </div>
                    ) : discrepancy < 0 ? (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="font-black">Faltante de Efectivo: {formatCurrency(Math.abs(discrepancy))}</p>
                          <p className="text-[10px] opacity-80 mt-0.5">El efectivo físico contado es menor a las ventas y base esperadas.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3 text-yellow-500 text-sm">
                        <Info className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="font-black">Sobrante de Efectivo: {formatCurrency(discrepancy)}</p>
                          <p className="text-[10px] opacity-80 mt-0.5">El efectivo físico contado es mayor a las ventas y base esperadas.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-yellow-500 text-black font-black rounded-2xl shadow-xl shadow-yellow-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm uppercase tracking-wider"
                >
                  {loading ? "Cerrando..." : "Cerrar Caja y Registrar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY TABLE --- */}
      <div className="space-y-6">
        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Calendar className="w-5.5 h-5.5 text-primary animate-pulse" /> Historial de Cierres de Caja
        </h3>

        <div className="bg-zinc-950 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-900/30">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Fecha Cierre</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Abierto Por</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-right">Efectivo Esperado</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-right">Digital</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-right">Físico Contado</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-right">Desviación</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((session) => {
                  const isExpanded = expandedSessions[session.id] || false;
                  return (
                    <Fragment key={session.id}>
                      <tr className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-5">
                          <div className="space-y-1">
                            <p className="font-bold text-white text-sm">{formatDate(session.closed_at)}</p>
                            <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-widest">
                              Aper: {formatTime(session.opened_at)} | Cierre: {formatTime(session.closed_at)}
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
                            <User className="w-4 h-4 text-zinc-500" />
                            <span>{session.closed_by_name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-semibold text-zinc-400 text-sm">
                          {formatCurrency(session.expected_cash ?? session.expected_balance)}
                        </td>
                        <td className="px-8 py-5 text-right font-semibold text-cyan-400 text-sm">
                          {formatCurrency(session.expected_digital ?? 0)}
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-white text-sm">
                          {formatCurrency(session.actual_balance)}
                        </td>
                        <td className="px-8 py-5 text-right">
                          {session.discrepancy === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                              Cuadrada
                            </span>
                          ) : session.discrepancy < 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-black tracking-widest font-mono">
                              {formatCurrency(session.discrepancy)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 text-[10px] font-black tracking-widest font-mono">
                              +{formatCurrency(session.discrepancy)}
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSessionForAction(session);
                                setActionType("edit");
                                setSecurityDialogOpen(true);
                              }}
                              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-primary text-zinc-400 rounded-xl transition-all"
                              title="Editar Cierre"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSessionForAction(session);
                                setActionType("delete");
                                setSecurityDialogOpen(true);
                              }}
                              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-red-500 hover:text-red-500 text-zinc-400 rounded-xl transition-all"
                              title="Eliminar Cierre"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSessionExpand(session.id)}
                              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all ml-2"
                              title="Detalles"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable breakdown row */}
                      {isExpanded && (
                        <tr className="bg-black/30 animate-in fade-in duration-300">
                          <td colSpan={7} className="px-8 py-6 border-b border-white/5">
                            <div className="rounded-[24px] border border-white/5 bg-zinc-950/70 p-6 space-y-6">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                  <User className="w-4.5 h-4.5 text-primary" /> Arqueo Individual de Efectivo por Barbero
                                </h4>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                  Caja abierta con base: {formatCurrency(session.opening_balance)}
                                </span>
                              </div>

                              {session.barbers_breakdown && session.barbers_breakdown.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                  {session.barbers_breakdown.map((b: any) => {
                                    const expectedC = b.expected_cash ?? b.total_cash ?? 0;
                                    const actualC = b.actual_cash ?? 0;
                                    const discrepancyC = actualC - expectedC;
                                    const digitalC = b.total_digital ?? 0;

                                    return (
                                      <div key={b.id} className="rounded-xl border border-white/5 bg-zinc-900/30 p-4 space-y-3">
                                        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                                          <span className="font-black text-white text-xs">{b.name}</span>
                                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                            {b.appointments_count === 1 ? "1 cita" : `${b.appointments_count} citas`} en efec.
                                          </span>
                                        </div>
                                        
                                        <div className="space-y-1.5 text-[11px] leading-none">
                                          <div className="flex justify-between">
                                            <span className="text-zinc-500">Efec. Esperado:</span>
                                            <span className="font-bold text-zinc-300">{formatCurrency(expectedC)}</span>
                                          </div>
                                          {b.total_advances > 0 && (
                                            <div className="flex justify-between text-red-400 font-medium">
                                              <span>Vales de Caja Hoy:</span>
                                              <span>-{formatCurrency(b.total_advances)}</span>
                                            </div>
                                          )}
                                          {b.total_payments > 0 && (
                                            <div className="flex justify-between text-emerald-400 font-medium">
                                              <span>Abonos / Pagos Hoy:</span>
                                              <span>+{formatCurrency(b.total_payments)}</span>
                                            </div>
                                          )}
                                          {b.total_consignments > 0 && (
                                            <div className="flex justify-between text-amber-500/80 font-medium">
                                              <span>Fiados / Consignación Hoy:</span>
                                              <span>{formatCurrency(b.total_consignments)}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between">
                                            <span className="text-zinc-500">Efec. Entregado:</span>
                                            <span className="font-black text-white">{formatCurrency(actualC)}</span>
                                          </div>
                                          <div className="flex justify-between border-t border-white/5 pt-2 mt-1.5 font-bold">
                                            <span className="text-zinc-500">Digital Recaudado:</span>
                                            <span className="font-bold text-cyan-400">{formatCurrency(digitalC)}</span>
                                          </div>
                                          <div className="flex justify-between border-t border-white/5 pt-2 mt-1.5 font-bold">
                                            <span className="text-zinc-400">Estado Entrega:</span>
                                            {discrepancyC === 0 ? (
                                              <span className="text-emerald-400">Cuadrada</span>
                                            ) : discrepancyC < 0 ? (
                                              <span className="text-red-500">Faltante: -{formatCurrency(Math.abs(discrepancyC))}</span>
                                            ) : (
                                              <span className="text-yellow-500">Sobrante: +{formatCurrency(discrepancyC)}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-zinc-500 text-xs italic">
                                  No hay un desglose detallado de barberos registrado para este cierre.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {history.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                <Coins className="w-8 h-8 text-zinc-500" />
              </div>
              <p className="text-zinc-500 font-medium tracking-tight text-sm">No hay registros de caja cerrados todavía</p>
            </div>
          )}
        </div>
      </div>

      <CashActionSecurityDialog 
        isOpen={securityDialogOpen}
        onOpenChange={setSecurityDialogOpen}
        session={selectedSessionForAction}
        actionType={actionType}
        onSuccess={() => {
          showNotification(actionType === "delete" ? "Cierre eliminado con éxito" : "Cierre actualizado con éxito", "success");
          router.refresh();
        }}
      />
    </div>
  );
}
