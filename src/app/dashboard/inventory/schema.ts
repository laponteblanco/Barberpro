import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional().nullable(),
  retail_price: z.coerce.number().min(0, "Precio inválido"),
  cost_price: z.coerce.number().optional().nullable(),
  stock: z.coerce.number().int().min(0),
  low_stock_threshold: z.coerce.number().int().default(5),
});

export type ProductFormValues = z.infer<typeof productSchema>;
