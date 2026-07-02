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
  theme?: string;
  isBarber?: boolean;
}

export function StaffSummaryDialog({ barber, appointments, onClose, theme = "dark", isBarber = false }: StaffSummaryDialogProps) {
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<'arqueo' | 'services' | 'finance'>('arqueo');
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
    fetchLedgerData();
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className={cn(
      theme === "light" ? "theme-light" : "theme-dark",
      "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
    )}>
      <div className={cn(
        "w-full max-w-lg border rounded-[40px] shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]",
        theme === "light" ? "theme-light bg-white border-blue-200" : "bg-card border-border"
      )}>
        {/* Header */}
        <div className={cn(
          "px-8 py-6 border-b flex items-center justify-between shrink-0",
          theme === "light" ? "bg-blue-50/80 border-blue-100" : "border-border bg-muted/30"
        )}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
              {barber.avatar_url ? (
                <img src={barber.avatar_url} alt={barber.display_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground tracking-tight">{barber.display_name}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">Control de Personal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-muted rounded-2xl transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className={cn(
          "flex px-8 border-b shrink-0",
          theme === "light" ? "border-blue-100 bg-blue-50/30" : "border-border bg-muted/10"
        )}>
          <button 
            onClick={() => setActiveTab('arqueo')}
            className={cn(
              "flex-1 py-4 text-[10px] uppercase tracking-widest font-black transition-all border-b-2 text-center flex items-center justify-center gap-1.5",
              activeTab === 'arqueo' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <DollarSign className="w-3.5 h-3.5" /> Arqueo
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={cn(
              "flex-1 py-4 text-[10px] uppercase tracking-widest font-black transition-all border-b-2 text-center flex items-center justify-center gap-1.5",
              activeTab === 'services' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Scissors className="w-3.5 h-3.5" /> Servicios
          </button>
          {!isBarber && (
            <button 
              onClick={() => setActiveTab('finance')}
              className={cn(
                "flex-1 py-4 text-[10px] uppercase tracking-widest font-black transition-all border-b-2 text-center flex items-center justify-center gap-1.5",
                activeTab === 'finance' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Wallet className="w-3.5 h-3.5" /> Finanzas
            </button>
          )}
        </div>

        {/* Tab 0: Arqueo Content */}
        {activeTab === 'arqueo' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className={cn("p-5 rounded-3xl space-y-1 relative overflow-hidden border", isLight ? "bg-blue-50 border-blue-200" : "bg-secondary/30 border-border")}>
                <div className="absolute top-0 right-0 p-4 opacity-10"><Scissors className="w-12 h-12" /></div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black relative z-10">Totalidad de Cortes</p>
                <p className="text-3xl font-black text-foreground relative z-10">{completedAppts.length}</p>
              </div>
              <div className={cn("p-5 rounded-3xl space-y-1 relative overflow-hidden border", isLight ? "bg-blue-50 border-blue-200" : "bg-secondary/30 border-border")}>
                <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-12 h-12" /></div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black relative z-10">Costo Total</p>
                <p className="text-3xl font-black text-foreground relative z-10">{formatter.format(totalValue)}</p>
              </div>
              <div className={cn("p-5 rounded-3xl space-y-1 relative overflow-hidden border", isLight ? "bg-blue-100/60 border-blue-300" : "bg-primary/10 border-primary/20")}>
                <div className="absolute top-0 right-0 p-4 opacity-10"><User className="w-12 h-12 text-primary" /></div>
                <p className="text-[10px] text-primary uppercase tracking-widest font-black flex items-center gap-1.5 relative z-10">Para el Barbero</p>
                <p className="text-3xl font-black text-primary relative z-10">{formatter.format(commissionValue)}</p>
              </div>
              <div className={cn("p-5 rounded-3xl space-y-1 relative overflow-hidden border", isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/20")}>
                <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-12 h-12 text-emerald-500" /></div>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-black flex items-center gap-1.5 relative z-10">Para la Barbería</p>
                <p className="text-3xl font-black text-emerald-500 relative z-10">{formatter.format(totalValue - commissionValue)}</p>
              </div>
              <div className={cn("p-5 rounded-3xl space-y-1 relative overflow-hidden border", isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20")}>
                <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowUpRight className="w-12 h-12 text-red-500" /></div>
                <p className="text-[10px] text-red-500 uppercase tracking-widest font-black flex items-center gap-1.5 relative z-10">Vales (Adelantos)</p>
                <p className="text-3xl font-black text-red-500 relative z-10">{formatter.format(totals.totalAdvances)}</p>
              </div>
              <div className={cn("p-5 rounded-3xl space-y-1 relative overflow-hidden border", isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/20")}>
                <div className="absolute top-0 right-0 p-4 opacity-10"><ShoppingBag className="w-12 h-12 text-amber-500" /></div>
                <p className="text-[10px] text-amber-500 uppercase tracking-widest font-black flex items-center gap-1.5 relative z-10">Saldo Productos</p>
                <p className="text-3xl font-black text-amber-500 relative z-10">{formatter.format(totals.totalConsignments)}</p>
              </div>
            </div>

            <div className={cn("p-6 rounded-3xl flex items-center justify-between relative overflow-hidden border", isLight ? "bg-blue-50 border-blue-200" : "bg-muted/20 border-border")}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-10 -mt-10" />
              <div className="relative z-10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">A Pagar Hoy (Barbero)</p>
                <p className="text-xs font-bold text-muted-foreground mt-0.5">Comisión - Vales - Productos</p>
              </div>
              <p className={cn(
                "text-3xl font-black relative z-10",
                (commissionValue - totals.totalAdvances - totals.totalConsignments) >= 0 ? "text-emerald-500" : "text-red-500"
              )}>
                {formatter.format(commissionValue - totals.totalAdvances - totals.totalConsignments)}
              </p>
            </div>
          </div>
        )}

        {/* Tab 1: Services Content */}
        {activeTab === 'services' && (
          <>
            {/* Services List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pl-8 pr-6 pb-8 pt-6">
              <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 sticky top-0 py-2 z-10", isLight ? "bg-white" : "bg-card")}>Servicios Terminados</h4>
              <div className="space-y-3">
                {completedAppts.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-muted/30 mx-auto" />
                    <p className="text-muted-foreground text-sm italic">No hay servicios completados hoy</p>
                  </div>
                ) : (
                  completedAppts.map((appt) => (
                    <div key={appt.id} className={cn("p-4 border rounded-2xl flex items-center justify-between group transition-all", isLight ? "bg-blue-50/80 border-blue-200 hover:border-blue-300" : "bg-secondary/20 border-border hover:border-border/80")}>
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", isLight ? "bg-blue-100 border-blue-200" : "bg-secondary border-border")}>
                          <Scissors className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{appt.service?.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="w-3 h-3 text-muted-foreground/60" />
                            <p className="text-[10px] text-muted-foreground font-medium">{appt.client?.full_name}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-500">{formatter.format(appt.service?.price || 0)}</p>
                        {(() => {
                          const dayIndex = getBogotaTime(appt.start_time).dayIndex;
                          const rate = barber.daily_commission_rates?.[String(dayIndex)] ?? barber.commission_rate ?? 0;
                          return (
                            <p className="text-[9px] text-muted-foreground/80 font-bold uppercase tracking-tighter">
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
            <div className={cn("p-6 border-t text-center shrink-0", isLight ? "bg-blue-50/80 border-blue-100" : "bg-muted/30 border-border")}>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                {completedAppts.length} servicios totales hoy · Comisión específica por días aplicada
              </p>
            </div>
          </>
        )}

        {/* Tab 2: Finance Content */}
        {activeTab === 'finance' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pl-8 pr-6 pb-8 space-y-6 pt-6">
            {loadingLedger && !ledgerData ? (
              <div className="py-20 text-center">
                <Clock className="w-8 h-8 text-zinc-600 animate-spin mx-auto mb-2" />
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Cargando historial...</p>
              </div>
            ) : (
              <>
                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className={cn("p-4 rounded-2xl space-y-0.5 border", isLight ? "bg-blue-50 border-blue-200" : "bg-secondary/30 border-border")}>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Saldo Pendiente</p>
                    <p className={cn(
                      "text-base font-black",
                      totals.pendingBalance > 0 ? "text-primary" : "text-emerald-500"
                    )}>
                      {formatter.format(totals.pendingBalance)}
                    </p>
                  </div>
                  <div className={cn("p-4 rounded-2xl space-y-0.5 border", isLight ? "bg-blue-50 border-blue-200" : "bg-secondary/30 border-border")}>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Total Vales</p>
                    <p className="text-base font-black text-foreground">{formatter.format(totals.totalAdvances)}</p>
                  </div>
                  <div className={cn("p-4 rounded-2xl space-y-0.5 border", isLight ? "bg-blue-50 border-blue-200" : "bg-secondary/30 border-border")}>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Consignaciones</p>
                    <p className="text-base font-black text-foreground">{formatter.format(totals.totalConsignments)}</p>
                  </div>
                  <div className={cn("p-4 rounded-2xl space-y-0.5 border", isLight ? "bg-blue-50 border-blue-200" : "bg-secondary/30 border-border")}>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Total Pagado</p>
                    <p className="text-base font-black text-emerald-500">{formatter.format(totals.totalPayments)}</p>
                  </div>
                </div>

                {/* Smart Register Form */}
                <div className={cn("p-5 rounded-[24px] space-y-4 border", isLight ? "bg-blue-50/60 border-blue-200" : "bg-secondary/10 border-border")}>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 leading-none">
                    <Plus className="w-3.5 h-3.5 text-primary" /> Registrar Vale, Consignación o Abono
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
                            ? "bg-red-500/10 border-red-500/30 text-red-500" 
                            : (isLight ? "bg-white border-blue-200 text-slate-500 hover:text-slate-900" : "bg-secondary border-border text-muted-foreground hover:text-foreground")
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
                            ? "bg-primary/10 border-primary/30 text-primary" 
                            : (isLight ? "bg-white border-blue-200 text-slate-500 hover:text-slate-900" : "bg-secondary border-border text-muted-foreground hover:text-foreground")
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
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                            : (isLight ? "bg-white border-blue-200 text-slate-500 hover:text-slate-900" : "bg-secondary border-border text-muted-foreground hover:text-foreground")
                        )}
                      >
                        Abono (Pago)
                      </button>
                    </div>

                    {/* Product Selector (Visible only if consignment) */}
                    {txType === 'consignment' && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Producto en Inventario (Con Stock)</label>
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
                          className={cn("w-full h-11 px-3 border rounded-xl text-foreground outline-none focus:border-primary/50 text-xs font-bold", isLight ? "bg-white border-blue-200" : "bg-secondary border-border")}
                        >
                          <option value="" disabled className="bg-card text-muted-foreground">Seleccionar producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} className="bg-card text-foreground">
                              {p.name} (Stock: {p.stock} · {formatter.format(p.retail_price)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Amount & Description stacked vertically to avoid horizontal clipping */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Valor / Monto</label>
                        <div className="relative">
                          <span className="absolute left-3 inset-y-0 flex items-center text-xs text-muted-foreground font-black">$</span>
                          <input 
                             type="text"
                            value={txAmount}
                            onChange={(e) => setTxAmount(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="Ej: 20000"
                            required
                            className={cn("w-full h-11 pl-7 pr-3 border rounded-xl text-foreground outline-none focus:border-primary/50 text-xs font-bold", isLight ? "bg-white border-blue-200" : "bg-secondary border-border")}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nota / Detalle</label>
                        <input 
                          type="text"
                          value={txDescription}
                          onChange={(e) => setTxDescription(e.target.value)}
                          placeholder="Ej: Adelanto transporte"
                          className={cn("w-full h-11 px-3 border rounded-xl text-foreground outline-none focus:border-primary/50 text-xs font-semibold", isLight ? "bg-white border-blue-200" : "bg-secondary border-border")}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingAction}
                      className="w-full h-11 bg-primary text-primary-foreground font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                    >
                      {loadingAction ? "Registrando..." : "Registrar en Historial"}
                    </button>
                  </form>
                </div>

                {/* Ledger Timeline List */}
                <div className="space-y-3">
                  <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground sticky top-0 py-2 z-10", isLight ? "bg-white" : "bg-card")}>Movimientos Financieros</h4>
                  <div className="space-y-2">
                    {history.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-muted/30 mx-auto" />
                        <p className="text-muted-foreground text-xs italic">No hay registros financieros para este barbero</p>
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
                          <div key={item.id} className={cn("p-3 border rounded-2xl flex items-center justify-between group transition-all", isLight ? "bg-blue-50/60 border-blue-200 hover:border-blue-300" : "bg-secondary/10 border-border hover:border-border/60")}>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                                item.type === "advance" && "bg-red-500/10 border-red-500/20 text-red-500",
                                item.type === "consignment" && "bg-primary/10 border-primary/20 text-primary",
                                item.type === "payment" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                              )}>
                                {item.type === "advance" && <ArrowUpRight className="w-4 h-4" />}
                                {item.type === "consignment" && <ShoppingBag className="w-4 h-4" />}
                                {item.type === "payment" && <ArrowDownLeft className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 leading-none">
                                  <p className="text-xs font-bold text-foreground">
                                    {item.type === "advance" && "Vale de Caja"}
                                    {item.type === "consignment" && "Producto Fiado"}
                                    {item.type === "payment" && "Abono / Pago"}
                                  </p>
                                  {item.type === "consignment" && item.products?.name && (
                                    <span className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[8px] text-muted-foreground font-bold uppercase tracking-wider shrink-0">
                                      {item.products.name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-muted-foreground mt-1 font-medium">
                                  {item.description || "Sin descripción"} · {formattedDate}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "text-xs font-black text-right",
                                item.type === "payment" ? "text-emerald-500" : "text-foreground"
                              )}>
                                {item.type === "payment" ? "+" : "-"} {formatter.format(item.amount)}
                              </p>

                              <button
                                onClick={() => handleDeleteTransaction(item.id)}
                                className="p-2 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
