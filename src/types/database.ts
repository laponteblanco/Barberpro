export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionPlan = "basic" | "premium" | "pro";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "suspended" | "paused";
export type AppointmentStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type StaffRole = "owner" | "admin" | "barber" | "receptionist";
export type PaymentMethod = "cash" | "card" | "transfer" | "whatsapp_pay";
export type PaymentStatus = "pending" | "paid" | "partial" | "refunded";
export type NotificationChannel = "whatsapp" | "email" | "both";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          id_number: string | null;
          is_superadmin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          country: string;
          timezone: string;
          currency: string;
          whatsapp_number: string | null;
          whatsapp_token: string | null;
          settings: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          plan: SubscriptionPlan;
          status: SubscriptionStatus;
          current_period_start: string;
          current_period_end: string;
          trial_ends_at: string | null;
          price_paid: number;
          currency: string;
          payment_method: string;
          payment_reference: string | null;
          cancel_at_period_end: boolean;
          suspended_at: string | null;
          suspended_reason: string | null;
          max_staff: number;
          max_services: number;
          has_whatsapp: boolean;
          has_analytics: boolean;
          has_inventory: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["subscriptions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      tenant_staff: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: StaffRole;
          display_name: string;
          avatar_url: string | null;
          phone: string | null;
          is_active: boolean;
          commission_rate: number | null;
          specialties: string[];
          working_hours: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenant_staff"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["tenant_staff"]["Insert"]>;
      };
      clients: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          full_name: string;
          phone: string;
          email: string | null;
          avatar_url: string | null;
          notes: string | null;
          tags: string[];
          loyalty_points: number;
          total_visits: number;
          total_spent: number;
          last_visit_at: string | null;
          whatsapp_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clients"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
      };
      services: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          price: number;
          category: string;
          is_active: boolean;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["services"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          staff_id: string;
          service_id: string;
          start_time: string;
          end_time: string;
          status: AppointmentStatus;
          notes: string | null;
          cancellation_reason: string | null;
          reminder_sent: boolean;
          payment_status: PaymentStatus;
          payment_method: PaymentMethod | null;
          total_price: number;
          discount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["appointments"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          retail_price: number;
          cost_price: number | null;
          stock: number;
          low_stock_threshold: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at">;
        Update: never;
      };
      whatsapp_messages: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string | null;
          appointment_id: string | null;
          wa_message_id: string | null;
          direction: "inbound" | "outbound";
          phone_number: string;
          message_type: "text" | "template" | "media";
          content: string;
          template_name: string | null;
          status: "queued" | "sent" | "delivered" | "read" | "failed";
          error_message: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["whatsapp_messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["whatsapp_messages"]["Insert"]>;
      };
      platform_revenue: {
        Row: {
          id: string;
          subscription_id: string;
          tenant_id: string;
          amount: number;
          currency: string;
          payment_method: string;
          payment_reference: string | null;
          period_start: string;
          period_end: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["platform_revenue"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["platform_revenue"]["Insert"]>;
      };
      superadmin_audit_log: {
        Row: {
          id: string;
          admin_user_id: string;
          action: string;
          target_type: string;
          target_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["superadmin_audit_log"]["Row"], "id" | "created_at">;
        Update: never;
      };
      impersonation_sessions: {
        Row: {
          id: string;
          admin_user_id: string;
          target_role: string;
          target_tenant_id: string | null;
          target_user_id: string | null;
          started_at: string;
          ended_at: string | null;
          is_active: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["impersonation_sessions"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["impersonation_sessions"]["Insert"]>;
      };
      license_notifications: {
        Row: {
          id: string;
          subscription_id: string;
          tenant_id: string;
          channel: NotificationChannel;
          trigger_type: string;
          scheduled_for: string;
          sent_at: string | null;
          status: NotificationStatus;
          error_message: string | null;
          recipient_phone: string | null;
          recipient_email: string | null;
          message_content: string | null;
          wa_message_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["license_notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["license_notifications"]["Insert"]>;
      };
      product_sales: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          sold_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["product_sales"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["product_sales"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type TenantStaff = Database["public"]["Tables"]["tenant_staff"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type WhatsAppMessage = Database["public"]["Tables"]["whatsapp_messages"]["Row"];
export type PlatformRevenue = Database["public"]["Tables"]["platform_revenue"]["Row"];
export type SuperAdminAuditLog = Database["public"]["Tables"]["superadmin_audit_log"]["Row"];
export type ImpersonationSession = Database["public"]["Tables"]["impersonation_sessions"]["Row"];
export type LicenseNotification = Database["public"]["Tables"]["license_notifications"]["Row"];
export type ProductSale = Database["public"]["Tables"]["product_sales"]["Row"];
