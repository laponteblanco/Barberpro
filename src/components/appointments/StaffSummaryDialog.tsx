"use client";

import { useState, useEffect } from "react";
import { 
  X, Scissors, DollarSign, CheckCircle2, User, Clock,
  Wallet, ArrowUpRight, ArrowDownLeft, Trash2, ShoppingBag, Plus, Sparkles 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getLedgerDataAction, 
  getTenantProductsAction, 
  addLedgerTransactionAction, 
  deleteLedgerTransactionAction 
} from "@/app/dashboard/staff/actions";

const getBogotaTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const utc = d.getTime();
  const bogotaDate = new Date(utc - (5 * 3600000));
  return {
    hour: bogotaDate.getUTCHours(),
    min: bogotaDate.getUTCMinutes(),
    yyyy: bogotaDate.getUTCFullYear(),
    mm: String(bogotaDate.getUTCMonth() + 1).padStart(2, '0'),
    dd: String(bogotaDate.getUTCDate()).padStart(2, '0'),
    hhStr: String(bogotaDate.getUTCHours()).padStart(2, '0'),
    minStr: String(bogotaDate.getUTCMinutes()).padStart(2, '0'),
    dayIndex: bogotaDate.getUTCDay()
  };
};

interface StaffSummaryDialogProps {
  barber: any;
  appointments: any[];
  onClose: () => void;
}

export function StaffSummaryDialog({ barber, appointments, onClose }: StaffSummaryDialogProps) {
  const [activeTab, setActiveTab] = useState<'services' | 'finance'>('services');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // Form states
  const [txType, setTxType] = useState<'advance' | 'consignment' | 'payment'>('advance');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txProductId, setTxProductId] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const completedAppts = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed');
  
  const totalValue = completedAppts.reduce((acc, a) => acc + (a.service?.price || 0), 0);
  
  // Calculate exact commissions based on day of week for each appointment
  const commissionValue = completedAppts.reduce((acc, appt) => {
    const price = Number(appt.service?.price || 0);
    const dayIndex = getBogotaTime(appt.start_time).dayIndex;
    const rate = barber.daily_commission_rates?.[String(dayIndex)] ?? barber.commission_rate ?? 0;
    return acc + (price * (rate / 100));
  }, 0);

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  const fetchLedgerData = async () => {
    setLoadingLedger(true);
    try {
      const res = await getLedgerDataAction(barber.id);
      if (res.success) {
        setLedgerData(res);
      } else {
        console.error("Error cargando adelantos:", res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await getTenantProductsAction();
      if (res.success && res.products) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'finance') {
      fetchLedgerData();
      fetchProducts();
    }
  }, [activeTab]);

  const handleRegisterTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) return;

    setLoadingAction(true);
    try {
      const formData = new FormData();
      formData.append("staff_id", barber.id);
      formData.append("type", txType);
      formData.append("amount", txAmount);
      formData.append("description", txDescription);
      if (txProductId) {
        formData.append("product_id", txProductId);
      }

      const res = await addLedgerTransactionAction(formData);
      if (res.error) {
        alert(res.error);
      } else {
        // Reset form
        setTxAmount('');
        setTxDescription('');
        setTxProductId('');
        // Re-fetch data
        await fetchLedgerData();
        await fetchProducts(); // Stock changed, so re-fetch products
      }
    } catch (err: any) {
      alert(err.message || "Error al registrar el movimiento");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este registro? Esto no se puede deshacer y restituirá el stock del producto si era una consignación.")) {
      return;
    }

    try {
      const res = await deleteLedgerTransactionAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        await fetchLedgerData();
        await fetchProducts();
      }
    } catch (err: any) {
      alert(err.message || "Error al eliminar");
    }
  };

  const totals = ledgerData?.totals || {
    totalAdvances: 0,
    totalConsignments: 0,
    totalPayments: 0,
    pendingBalance: 0
  };

  const history = ledgerData?.history || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[40px] shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {barber.avatar_url ? (
                <img src={barber.avatar_url} alt={barber.display_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-zinc-600" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">{barber.display_name}</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Control de Personal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex px-8 border-b border-white/5 shrink-0 bg-zinc-900/20">
          <button 
            onClick={() => setActiveTab('services')}
            className={cn(
              "flex-1 py-4 text-xs uppercase tracking-widest font-black transition-all border-b-2 text-center",
              activeTab === 'services' 
                ? "border-amber-500 text-amber-500" 
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Servicios del Día
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={cn(
              "flex-1 py-4 text-xs uppercase tracking-widest font-black transition-all border-b-2 text-center flex items-center justify-center gap-1.5",
              activeTab === 'finance' 
                ? "border-amber-500 text-amber-500" 
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Wallet className="w-3.5 h-3.5" /> Adelantos / Consignación
          </button>
        </div>

        {/* Tab 1: Services Content */}
        {activeTab === 'services' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 p-8 bg-zinc-950/20 shrink-0">
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Recaudo Total</p>
                <p className="text-2xl font-black text-white">{formatter.format(totalValue)}</p>
              </div>
              <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <p className="text-[10px] text-amber-400 uppercase tracking-widest font-black">Comisión Estimada ({barber.commission_rate}%)</p>
                <p className="text-2xl font-black text-amber-400">{formatter.format(commissionValue)}</p>
              </div>
            </div>

            {/* Services List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 sticky top-0 bg-zinc-950 py-2 z-10">Servicios Terminados</h4>
              <div className="space-y-3">
                {completedAppts.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-zinc-800 mx-auto" />
                    <p className="text-zinc-600 text-sm italic">No hay servicios completados hoy</p>
                  </div>
                ) : (
                  completedAppts.map((appt) => (
                    <div key={appt.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                          <Scissors className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{appt.service?.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="w-3 h-3 text-zinc-600" />
                            <p className="text-[10px] text-zinc-500 font-medium">{appt.client?.full_name}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-400">{formatter.format(appt.service?.price || 0)}</p>
                        {(() => {
                          const dayIndex = getBogotaTime(appt.start_time).dayIndex;
                          const rate = barber.daily_commission_rates?.[String(dayIndex)] ?? barber.commission_rate ?? 0;
                          return (
                            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">
                              Comisión ({rate}%): {formatter.format((appt.service?.price || 0) * (rate / 100))}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-zinc-900/50 border-t border-white/5 text-center shrink-0">
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                {completedAppts.length} servicios totales hoy · Comisión específica por días aplicada
              </p>
            </div>
          </>
        )}

        {/* Tab 2: Finance Content */}
        {activeTab === 'finance' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 space-y-6 pt-6">
            {loadingLedger && !ledgerData ? (
              <div className="py-20 text-center">
                <Clock className="w-8 h-8 text-zinc-600 animate-spin mx-auto mb-2" />
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Cargando historial...</p>
              </div>
            ) : (
              <>
                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-0.5">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Saldo Pendiente</p>
                    <p className={cn(
                      "text-base font-black",
                      totals.pendingBalance > 0 ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {formatter.format(totals.pendingBalance)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-0.5">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Total Vales</p>
                    <p className="text-base font-black text-white">{formatter.format(totals.totalAdvances)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-0.5">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Consignaciones</p>
                    <p className="text-base font-black text-white">{formatter.format(totals.totalConsignments)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-0.5">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Total Pagado</p>
                    <p className="text-base font-black text-emerald-400">{formatter.format(totals.totalPayments)}</p>
                  </div>
                </div>

                {/* Smart Register Form */}
                <div className="p-5 rounded-[24px] bg-zinc-950/40 border border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 leading-none">
                    <Plus className="w-3.5 h-3.5 text-amber-500" /> Registrar Vale, Consignación o Abono
                  </h4>
                  <form onSubmit={handleRegisterTransaction} className="space-y-4">
                    {/* Switch selector */}
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setTxType('advance');
                          setTxProductId('');
                        }}
                        className={cn(
                          "py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all text-center",
                          txType === 'advance' 
                            ? "bg-red-500/10 border-red-500/30 text-red-400" 
                            : "bg-white/[0.01] border-white/5 text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Vale (Dinero)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTxType('consignment')}
                        className={cn(
                          "py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all text-center",
                          txType === 'consignment' 
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                            : "bg-white/[0.01] border-white/5 text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Fiar Producto
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setTxType('payment');
                          setTxProductId('');
                        }}
                        className={cn(
                          "py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all text-center",
                          txType === 'payment' 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                            : "bg-white/[0.01] border-white/5 text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Abono (Pago)
                      </button>
                    </div>

                    {/* Product Selector (Visible only if consignment) */}
                    {txType === 'consignment' && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Producto en Inventario (Con Stock)</label>
                        <select
                          value={txProductId}
                          required
                          onChange={(e) => {
                            const pId = e.target.value;
                            setTxProductId(pId);
                            const selected = products.find(p => p.id === pId);
                            if (selected) {
                              setTxAmount(String(selected.retail_price));
                              setTxDescription(`Consignación de ${selected.name}`);
                            }
                          }}
                          className="w-full h-11 px-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500/50 text-xs font-bold"
                        >
                          <option value="" disabled className="bg-zinc-900 text-zinc-500">Seleccionar producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                              {p.name} (Stock: {p.stock} · {formatter.format(p.retail_price)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Amount & Description */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Valor / Monto</label>
                        <div className="relative">
                          <span className="absolute left-3 inset-y-0 flex items-center text-xs text-zinc-600 font-black">$</span>
                          <input 
                            type="text"
                            value={txAmount}
                            onChange={(e) => setTxAmount(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="Ej: 20000"
                            required
                            className="w-full h-11 pl-7 pr-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500/50 text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nota / Detalle</label>
                        <input 
                          type="text"
                          value={txDescription}
                          onChange={(e) => setTxDescription(e.target.value)}
                          placeholder="Ej: Adelanto transporte"
                          className="w-full h-11 px-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500/50 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingAction}
                      className="w-full h-11 bg-amber-500 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                    >
                      {loadingAction ? "Registrando..." : "Registrar en Historial"}
                    </button>
                  </form>
                </div>

                {/* Ledger Timeline List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 sticky top-0 bg-zinc-950 py-2 z-10">Movimientos Financieros</h4>
                  <div className="space-y-2">
                    {history.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-zinc-800 mx-auto" />
                        <p className="text-zinc-600 text-xs italic">No hay registros financieros para este barbero</p>
                      </div>
                    ) : (
                      history.map((item: any) => {
                        const formattedDate = new Date(item.created_at).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div key={item.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                                item.type === "advance" && "bg-red-500/10 border-red-500/20 text-red-400",
                                item.type === "consignment" && "bg-amber-500/10 border-amber-500/20 text-amber-400",
                                item.type === "payment" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              )}>
                                {item.type === "advance" && <ArrowUpRight className="w-4 h-4" />}
                                {item.type === "consignment" && <ShoppingBag className="w-4 h-4" />}
                                {item.type === "payment" && <ArrowDownLeft className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 leading-none">
                                  <p className="text-xs font-bold text-white">
                                    {item.type === "advance" && "Vale de Caja"}
                                    {item.type === "consignment" && "Producto Fiado"}
                                    {item.type === "payment" && "Abono / Pago"}
                                  </p>
                                  {item.type === "consignment" && item.products?.name && (
                                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-[8px] text-zinc-400 font-bold uppercase tracking-wider shrink-0">
                                      {item.products.name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-zinc-500 mt-1 font-medium">
                                  {item.description || "Sin descripción"} · {formattedDate}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "text-xs font-black text-right",
                                item.type === "payment" ? "text-emerald-400" : "text-white"
                              )}>
                                {item.type === "payment" ? "+" : "-"} {formatter.format(item.amount)}
                              </p>

                              <button
                                onClick={() => handleDeleteTransaction(item.id)}
                                className="p-2 hover:bg-red-500/10 hover:text-red-400 text-zinc-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
