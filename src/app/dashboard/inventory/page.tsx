import { Package, ShoppingBag, TrendingUp, DollarSign } from "lucide-react";
import { AddProductDialog } from "./AddProductDialog";
import { EditProductDialog } from "./EditProductDialog";
import { SellProductDialog } from "./SellProductDialog";
import { DailySalesDialog } from "./DailySalesDialog";
import { SalesHistoryCard } from "./SalesHistoryCard";
import { getProducts, getDailySales } from "@/services/products.service";

export default async function InventoryPage() {
  const [products, dailySales] = await Promise.all([
    getProducts(),
    getDailySales()
  ]);

  const totalSalesCount = dailySales.reduce((sum: number, sale: any) => sum + sale.quantity, 0);
  const totalRevenue = dailySales.reduce((sum: number, sale: any) => sum + (sale.total_price || 0), 0);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Cabecera Flex */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario de Productos</h1>
          <p className="text-muted-foreground text-sm mt-1">Controla el stock y ventas de productos retail</p>
        </div>
        
        <AddProductDialog />
      </div>

      {/* Resumen de Ventas Hoy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121214] border border-white/5 rounded-[32px] p-6 shadow-xl flex items-center gap-5 group hover:border-emerald-500/20 transition-all relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <ShoppingBag className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Ventas Hoy</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">{totalSalesCount}</h3>
              <span className="text-[10px] text-emerald-500 font-bold">UNIDADES</span>
            </div>
          </div>
          
          {/* Componente para ver historial y reversar */}
          <DailySalesDialog sales={dailySales} />
        </div>

        <div className="bg-[#121214] border border-white/5 rounded-[32px] p-6 shadow-xl flex items-center gap-5 group hover:border-primary/20 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Recaudado Hoy</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">${totalRevenue.toLocaleString()}</h3>
              <span className="text-[10px] text-primary font-bold">COP</span>
            </div>
          </div>
        </div>

        <div className="bg-[#121214] border border-white/5 rounded-[32px] p-6 shadow-xl flex items-center gap-5 group hover:border-amber-500/20 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
            <TrendingUp className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Stock Crítico</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">
                {products.filter((p: any) => p.stock <= (p.low_stock_threshold || 5)).length}
              </h3>
              <span className="text-[10px] text-amber-500 font-bold">PRODUCTOS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cuerpo: Estado de Carga/Vacío o Tabla */}
      <div className="bg-[#121214] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl min-h-[400px]">
        {products.length === 0 ? (
          <div className="py-20 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mx-auto border border-zinc-700/50 mb-6">
              <Package className="w-10 h-10 text-zinc-600" />
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <h3 className="text-xl font-bold text-white">Inventario vacío</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Comienza a registrar tus productos para llevar un control exacto de tus ventas.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-900/30">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Producto</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-center">Stock</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Precio Venta</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products.map((product: any) => (
                  <tr key={product.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-base tracking-tight">{product.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-0.5">Producto Retail</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase",
                          product.stock <= (product.low_stock_threshold || 5) 
                            ? "bg-red-500/10 text-red-500" 
                            : "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {product.stock} disp.
                        </span>
                        {product.stock <= (product.low_stock_threshold || 5) && (
                          <p className="text-[9px] text-red-500/60 font-bold uppercase mt-1">Stock Bajo</p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-white">${product.retail_price}</span>
                        <span className="text-zinc-500 text-xs font-medium">COP</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <SellProductDialog product={product} />
                        <EditProductDialog product={product} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SalesHistoryCard />
    </div>
  );
}

// Helper utility for conditional classes in this file
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
