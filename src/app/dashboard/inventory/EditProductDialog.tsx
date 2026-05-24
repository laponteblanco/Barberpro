"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package, X, Edit2 } from "lucide-react";
import { updateProductAction } from "./actions";
import { productSchema, type ProductFormValues } from "./schema";
import * as Dialog from "@radix-ui/react-dialog";

interface EditProps {
  product: any;
}

export function EditProductDialog({ product }: EditProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: product.name,
      description: product.description || "",
      retail_price: product.retail_price,
      cost_price: product.cost_price || 0,
      stock: product.stock,
      low_stock_threshold: product.low_stock_threshold,
    }
  });

  const onSubmit = async (data: ProductFormValues) => {
    setLoading(true);
    try {
      const result = await updateProductAction(product.id, data);
      if (result?.error) {
        alert("Error: " + result.error);
        return;
      }
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
          title="Editar producto"
        >
          <Edit2 className="w-4 h-4 text-zinc-500 group-hover:text-amber-500 transition-colors" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center p-4 sm:items-center overflow-y-auto pt-10 sm:pt-4" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#121214] border border-white/10 rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto max-h-[90vh]">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-900/50">
            <div>
              <Dialog.Title className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <Package className="text-amber-500 w-5 h-5" /> Editar Producto
              </Dialog.Title>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-medium">Actualización de stock y precios</p>
            </div>
            <Dialog.Close className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Nombre del Producto</label>
                <input
                  {...register("name")}
                  placeholder="Nombre del producto"
                  className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-white"
                />
                {errors.name && <p className="text-[10px] text-red-500 ml-2">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Precio Venta ($)</label>
                  <input type="number" step="0.01" {...register("retail_price")} className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-white" />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Stock Actual</label>
                  <input type="number" {...register("stock")} className="w-full h-12 px-5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-white" />
                </div>
              </div>

              <div className="pt-4">
                <button
                  disabled={loading}
                  className="w-full h-14 bg-amber-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
