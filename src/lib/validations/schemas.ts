import { z } from "zod";

// ─── Tenant ──────────────────────────────────────────────────────────────────

export const CreateTenantSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Número de teléfono inválido")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  country: z.string().length(2, "Código ISO de 2 letras requerido").default("VE"),
  timezone: z.string().default("America/Caracas"),
  currency: z.string().length(3).default("USD"),
  whatsapp_number: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Número de WhatsApp inválido")
    .optional()
    .or(z.literal("")),
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;

// ─── Service ─────────────────────────────────────────────────────────────────

export const CreateServiceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  duration_minutes: z.number().int().min(5).max(480),
  price: z.number().nonnegative().multipleOf(0.01),
  category: z.string().min(1).max(50),
  is_active: z.boolean().default(true),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

// ─── Client ──────────────────────────────────────────────────────────────────

export const CreateClientSchema = z.object({
  full_name: z.string().min(2).max(150),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Número de teléfono inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
  whatsapp_opt_in: z.boolean().default(true),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;

// ─── Appointment ─────────────────────────────────────────────────────────────

export const CreateAppointmentSchema = z.object({
  client_id: z.string().uuid("Cliente inválido"),
  staff_id: z.string().uuid("Barbero inválido"),
  service_id: z.string().uuid("Servicio inválido"),
  start_time: z.string().datetime("Fecha/hora inválida"),
  notes: z.string().max(500).optional(),
  discount: z.number().min(0).max(100).default(0),
  payment_method: z
    .enum(["cash", "card", "transfer", "whatsapp_pay"])
    .optional(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ]),
  cancellation_reason: z.string().max(500).optional(),
  payment_status: z.enum(["pending", "paid", "partial", "refunded"]).optional(),
  payment_method: z
    .enum(["cash", "card", "transfer", "whatsapp_pay"])
    .optional(),
});

export type UpdateAppointmentStatusInput = z.infer<
  typeof UpdateAppointmentStatusSchema
>;

// ─── Staff ───────────────────────────────────────────────────────────────────

export const InviteStaffSchema = z.object({
  email: z.string().email("Email inválido"),
  display_name: z.string().min(2).max(100),
  role: z.enum(["admin", "barber", "receptionist"]),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/)
    .optional()
    .or(z.literal("")),
  commission_rate: z.number().min(0).max(100).optional(),
  specialties: z.array(z.string()).default([]),
});

export type InviteStaffInput = z.infer<typeof InviteStaffSchema>;

// ─── Product ─────────────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  sku: z.string().max(50).optional(),
  price: z.number().nonnegative().multipleOf(0.01),
  cost: z.number().nonnegative().multipleOf(0.01),
  stock: z.number().int().nonnegative().default(0),
  min_stock: z.number().int().nonnegative().default(5),
  category: z.string().min(1).max(50),
  is_active: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirm_password: z.string(),
    full_name: z.string().min(2, "Nombre requerido").max(150),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;
