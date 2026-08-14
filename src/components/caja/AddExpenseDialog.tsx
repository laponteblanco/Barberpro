"use client";

import { useState, useEffect } from "react";
import { X, Receipt, DollarSign, Loader2, Tag, FileText, Coins, Smartphone, Package, Plus, Trash2 } from "lucide-react";
import { addExpenseAction, getActiveProductsForExpensesAction } from "@/app/dashboard/caja/expenses.actions";

type PaymentMethodType = "cash" | "digital";

interface ProductOption {
  id: string;
  name: string;
  stock: number;
}

interface SelectedProduct {
  id: string;
  name: string;
  qty: number;
  stock: number;
}

export function AddExpenseDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Product state
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedQty, setSelectedQty] = useState("1");
  const [deductedProducts, setDeductedProducts] = useState<SelectedProduct[]>([]);

  const [amountDisplay, setAmountDisplay] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    } else {
      // Reset state on close
      setAmountDisplay("");
      setPaymentMethod("cash");
      setDeductedProducts([]);
      setSelectedProductId("");
      setSelectedQty("1");
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await getActiveProductsForExpensesAction();
    if (data) setProducts(data);
    setLoadingProducts(false);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setAmountDisplay("");
      return;
    }
    const formatted = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(rawValue));
    setAmountDisplay(formatted);
  };

  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;
    
    const qty = parseInt(selectedQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    if (qty > prod.stock) {
      alert(`No hay suficiente stock. Stock actual: ${prod.stock}`);
      return;
    }

    setDeductedProducts(prev => {
      const existing = prev.find(p => p.id === prod.id);
      if (existing) {
        if (existing.qty + qty > prod.stock) {
          alert(`La cantidad total superaría el stock disponible (${prod.stock})`);
          return prev;
        }
        return prev.map(p => p.id === prod.id ? { ...p, qty: p.qty + qty } : p);
      }
      return [...prev, { id: prod.id, name: prod.name, qty, stock: prod.stock }];
    });
    
    setSelectedProductId("");
    setSelectedQty("1");
  };

  const handleRemoveProduct = (id: string) => {
    setDeductedProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("amount", amountDisplay);
    formData.set("payment_method", paymentMethod);
    formData.set("deducted_products", JSON.stringify(deductedProducts));

    try {
      const result = await addExpenseAction(formData);
      if (result?.error) {
        alert(result.error);
      } else {
        setIsOpen(false);
      }
    } catch (err: any) {
      alert("Error inesperado al registrar el gasto.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 bg-zinc-900 border border-white/10 hover:border-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:bg-zinc-800"
      >
        <Receipt className="w-4 h-4 text-rose-400" /> Registrar Gasto
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/30 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <Receipt className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Registrar Gasto</h2>
              <p className="text-xs text-zinc-500 font-medium">Extraído del flujo de caja</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Category */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
              Categoría
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Tag className="w-5 h-5 text-zinc-500 group-focus-within:text-rose-400 transition-colors" />
              </div>
              <select
                name="category"
                required
                className="w-full h-12 pl-12 pr-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-white appearance-none"
              >
                <option value="Servicios Públicos">Servicios Públicos (Luz, Agua, Internet)</option>
                <option value="Materia Prima">Materia Prima / Insumos</option>
                <option value="Nómina">Nómina / Pago a Personal</option>
                <option value="Mantenimiento">Mantenimiento / Aseo</option>
                <option value="Otros">Otros Gastos</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
              Descripción del Gasto
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FileText className="w-5 h-5 text-zinc-500 group-focus-within:text-rose-400 transition-colors" />
              </div>
              <input
                type="text"
                name="description"
                placeholder="Ej. Compra de insumos o uso interno"
                required
                className="w-full h-12 pl-12 pr-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-white placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Inventario / Productos (Opcional) */}
          <div className="space-y-3 pt-3 border-t border-white/5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Descontar Inventario (Opcional)
            </label>
            <p className="text-[10px] text-zinc-500 ml-1 mb-2">Si usaste productos de la barbería, añádelos aquí para restar el stock automáticamente.</p>
            
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 h-10 px-3 bg-zinc-900/50 border border-white/5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-white appearance-none"
              >
                <option value="">Selecciona un producto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} (Stock: {p.stock})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={selectedQty}
                onChange={(e) => setSelectedQty(e.target.value)}
                className="w-20 h-10 px-3 bg-zinc-900/50 border border-white/5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-white text-center"
              />
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProductId}
                className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {deductedProducts.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-3 space-y-2 mt-2">
                {deductedProducts.map(dp => (
                  <div key={dp.id} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">
                      {dp.qty}x {dp.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(dp.id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2 pt-3 border-t border-white/5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
              Monto a descontar (Caja)
            </label>
            <p className="text-[10px] text-zinc-500 ml-1 mb-2">Déjalo vacío o en $0 si solo fue consumo interno sin salida de dinero.</p>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <DollarSign className="w-5 h-5 text-zinc-500 group-focus-within:text-rose-400 transition-colors" />
              </div>
              <input
                type="text"
                value={amountDisplay}
                onChange={handleAmountChange}
                placeholder="$ 0"
                className="w-full h-12 pl-12 pr-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-lg font-black tracking-tight outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-white placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* ── Fund selector (NEW) ── */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
              Fondo del Gasto — ¿De dónde sale el dinero?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`h-14 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                  paymentMethod === "cash"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-white/5 bg-zinc-900/50 text-zinc-500 hover:border-white/10 hover:text-white"
                }`}
              >
                <Coins className="w-5 h-5" />
                Efectivo Físico
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("digital")}
                className={`h-14 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                  paymentMethod === "digital"
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-white/5 bg-zinc-900/50 text-zinc-500 hover:border-white/10 hover:text-white"
                }`}
              >
                <Smartphone className="w-5 h-5" />
                Digital / Transferencia
              </button>
            </div>
            <p className="text-[9px] text-zinc-600 ml-1 leading-relaxed">
              {paymentMethod === "cash"
                ? "💵 Si hay monto, restará del efectivo en caja."
                : "💳 Si hay monto, restará del saldo digital."}
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (deductedProducts.length === 0 && !amountDisplay)}
              className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Receipt className="w-5 h-5" />
                  Registrar Gasto / Descuento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
