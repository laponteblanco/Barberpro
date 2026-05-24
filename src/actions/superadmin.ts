"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/database";

// ─── Audit Log Helper ────────────────────────────────────────────────

async function withAuditLog<T>(
  adminUserId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  fn: () => Promise<{ oldData?: unknown; newData?: unknown; result: T }>
): Promise<T> {
  const supabase = await createAdminClient();
  const { oldData, newData, result } = await fn();

  await (supabase as any).from("superadmin_audit_log").insert({
    admin_user_id: adminUserId,
    action,
    target_type: targetType,
    target_id: targetId,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  });

  return result;
}

// ─── Plan Defaults ───────────────────────────────────────────────────

const PLAN_DEFAULTS: Record<SubscriptionPlan, {
  max_staff: number;
  max_services: number;
  has_whatsapp: boolean;
  has_analytics: boolean;
  has_inventory: boolean;
  price: number;
}> = {
  basic: {
    max_staff: 3,
    max_services: 10,
    has_whatsapp: false,
    has_analytics: false,
    has_inventory: false,
    price: 10,
  },
  premium: {
    max_staff: 8,
    max_services: 25,
    has_whatsapp: true,
    has_analytics: true,
    has_inventory: false,
    price: 25,
  },
  pro: {
    max_staff: 999,
    max_services: 999,
    has_whatsapp: true,
    has_analytics: true,
    has_inventory: true,
    price: 50,
  },
};

// ─── Dashboard KPIs ──────────────────────────────────────────────────

export interface DashboardKpis {
  activeTenants: number;
  totalTenants: number;
  mrr: number;
  expiringLicenses: number;
  totalBarbers: number;
  suspendedTenants: number;
  recentTenants: Array<{ id: string; name: string; slug: string; created_at: string }>;
  expiringList: Array<{
    tenant_id: string;
    tenant_name: string;
    plan: string;
    current_period_end: string;
  }>;
  monthlyRevenue: Array<{ month: string; amount: number }>;
}

export async function getSuperAdminDashboard(): Promise<DashboardKpis> {
  await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  // Run all queries in parallel
  const [
    tenantsRes,
    activeSubsRes,
    expiringRes,
    barbersRes,
    suspendedRes,
    recentTenantsRes,
    revenueRes,
  ] = await Promise.all([
    // Total & active tenants
    db.from("tenants").select("id, is_active"),
    // Active subscriptions for MRR
    db.from("subscriptions").select("price_paid").in("status", ["active"]),
    // Expiring in 7 days
    db
      .from("subscriptions")
      .select("tenant_id, plan, current_period_end, tenant:tenants(name)")
      .in("status", ["active", "trialing"])
      .gte("current_period_end", new Date().toISOString())
      .lte("current_period_end", new Date(Date.now() + 7 * 86400000).toISOString()),
    // Total barbers
    db.from("tenant_staff").select("id", { count: "exact", head: true }).eq("is_active", true),
    // Suspended
    db.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    // Recent tenants
    db.from("tenants").select("id, name, slug, created_at").order("created_at", { ascending: false }).limit(5),
    // Monthly revenue (last 12 months)
    db.from("platform_revenue").select("amount, created_at").gte("created_at", new Date(Date.now() - 365 * 86400000).toISOString()),
  ]);

  const allTenants = tenantsRes.data ?? [];
  const activeSubs = activeSubsRes.data ?? [];
  const expiringData = expiringRes.data ?? [];
  const revenueData = revenueRes.data ?? [];

  // Calculate MRR
  const mrr = activeSubs.reduce((sum: number, s: any) => sum + Number(s.price_paid || 0), 0);

  // Group revenue by month
  const revenueByMonth = new Map<string, number>();
  for (const r of revenueData) {
    const month = (r as any).created_at?.substring(0, 7); // "YYYY-MM"
    if (month) {
      revenueByMonth.set(month, (revenueByMonth.get(month) || 0) + Number((r as any).amount || 0));
    }
  }
  const monthlyRevenue = Array.from(revenueByMonth.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    activeTenants: allTenants.filter((t: any) => t.is_active).length,
    totalTenants: allTenants.length,
    mrr,
    expiringLicenses: expiringData.length,
    totalBarbers: barbersRes.count ?? 0,
    suspendedTenants: suspendedRes.count ?? 0,
    recentTenants: (recentTenantsRes.data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      created_at: t.created_at,
    })),
    expiringList: expiringData.map((s: any) => ({
      tenant_id: s.tenant_id,
      tenant_name: s.tenant?.name ?? "Desconocido",
      plan: s.plan,
      current_period_end: s.current_period_end,
    })),
    monthlyRevenue,
  };
}

// ─── Tenant Listing ──────────────────────────────────────────────────

export interface TenantListFilters {
  search?: string;
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  page?: number;
  pageSize?: number;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  is_active: boolean;
  created_at: string;
  subscription: {
    id: string;
    plan: string;
    status: string;
    current_period_end: string;
    price_paid: number;
  } | null;
  staff_count: number;
}

export interface TenantListResult {
  tenants: TenantListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listTenants(filters: TenantListFilters = {}): Promise<TenantListResult> {
  await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // Build query
  let query = db
    .from("tenants")
    .select("id, name, slug, city, is_active, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
  }

  const { data: tenants, count } = await query;
  const tenantList = tenants ?? [];
  const total = count ?? 0;

  // Fetch subscriptions and staff counts for these tenants
  const tenantIds = tenantList.map((t: any) => t.id);

  const [subsRes, staffRes] = await Promise.all([
    tenantIds.length > 0
      ? db.from("subscriptions").select("*").in("tenant_id", tenantIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    tenantIds.length > 0
      ? db.from("tenant_staff").select("tenant_id").in("tenant_id", tenantIds).eq("is_active", true)
      : Promise.resolve({ data: [] }),
  ]);

  const subsMap = new Map<string, any>();
  for (const s of (subsRes.data ?? [])) {
    if (!subsMap.has(s.tenant_id)) {
      subsMap.set(s.tenant_id, s);
    }
  }

  const staffCounts = new Map<string, number>();
  for (const s of (staffRes.data ?? [])) {
    staffCounts.set(s.tenant_id, (staffCounts.get(s.tenant_id) || 0) + 1);
  }

  // Apply filters on subscription data
  let result: TenantListItem[] = tenantList.map((t: any) => {
    const sub = subsMap.get(t.id);
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      city: t.city,
      is_active: t.is_active,
      created_at: t.created_at,
      subscription: sub
        ? {
            id: sub.id,
            plan: sub.plan,
            status: sub.status,
            current_period_end: sub.current_period_end,
            price_paid: Number(sub.price_paid),
          }
        : null,
      staff_count: staffCounts.get(t.id) ?? 0,
    };
  });

  if (filters.plan) {
    result = result.filter((t) => t.subscription?.plan === filters.plan);
  }
  if (filters.status) {
    result = result.filter((t) => t.subscription?.status === filters.status);
  }

  return {
    tenants: result,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── Tenant Detail ───────────────────────────────────────────────────

export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  short_code: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  timezone: string;
  currency: string;
  whatsapp_number: string | null;
  is_active: boolean;
  created_at: string;
  subscription: any | null;
  staff_count: number;
  client_count: number;
  appointment_count: number;
  revenue_total: number;
  payments: any[];
}

export async function getTenantDetail(tenantId: string): Promise<TenantDetail> {
  await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  const [tenantRes, subRes, staffRes, clientRes, apptRes, revenueRes, paymentsRes] =
    await Promise.all([
      db.from("tenants").select("*").eq("id", tenantId).single(),
      db
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("tenant_staff")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      db
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      db
        .from("appointments")
        .select("id, total_price", { count: "exact" })
        .eq("tenant_id", tenantId)
        .eq("status", "completed"),
      db
        .from("appointments")
        .select("total_price")
        .eq("tenant_id", tenantId)
        .eq("status", "completed"),
      db
        .from("platform_revenue")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);

  if (!tenantRes.data) throw new Error("Barbería no encontrada");

  const t = tenantRes.data;
  const revenueTotal = (revenueRes.data ?? []).reduce(
    (sum: number, a: any) => sum + Number(a.total_price || 0),
    0
  );

  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    short_code: t.short_code,
    logo_url: t.logo_url,
    phone: t.phone,
    email: t.email,
    address: t.address,
    city: t.city,
    country: t.country,
    timezone: t.timezone,
    currency: t.currency,
    whatsapp_number: t.whatsapp_number,
    is_active: t.is_active,
    created_at: t.created_at,
    subscription: subRes.data,
    staff_count: staffRes.count ?? 0,
    client_count: clientRes.count ?? 0,
    appointment_count: apptRes.count ?? 0,
    revenue_total: revenueTotal,
    payments: paymentsRes.data ?? [],
  };
}

// ─── Subscription Management ─────────────────────────────────────────

export async function updateSubscription(
  tenantId: string,
  data: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
    current_period_end?: string;
  }
): Promise<void> {
  const { userId } = await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  await withAuditLog(userId, "update_subscription", "subscription", tenantId, async () => {
    // Get current subscription
    const { data: currentSub } = await db
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const updateData: any = { ...data, updated_at: new Date().toISOString() };

    // If changing plan, apply plan defaults
    if (data.plan && data.plan !== currentSub?.plan) {
      const defaults = PLAN_DEFAULTS[data.plan];
      updateData.max_staff = defaults.max_staff;
      updateData.max_services = defaults.max_services;
      updateData.has_whatsapp = defaults.has_whatsapp;
      updateData.has_analytics = defaults.has_analytics;
      updateData.has_inventory = defaults.has_inventory;
      updateData.price_paid = defaults.price;
    }

    const { error } = await db
      .from("subscriptions")
      .update(updateData)
      .eq("id", currentSub.id);

    if (error) throw new Error(`Error al actualizar suscripción: ${error.message}`);

    return { oldData: currentSub, newData: updateData, result: undefined };
  });
}

export async function suspendTenant(tenantId: string, reason: string): Promise<void> {
  const { userId } = await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  await withAuditLog(userId, "suspend_tenant", "tenant", tenantId, async () => {
    const now = new Date().toISOString();

    // Update subscription status
    const { data: sub } = await db
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      await db
        .from("subscriptions")
        .update({
          status: "suspended",
          suspended_at: now,
          suspended_reason: reason,
          updated_at: now,
        })
        .eq("id", sub.id);
    }

    // Deactivate tenant
    await db.from("tenants").update({ is_active: false, updated_at: now }).eq("id", tenantId);

    return {
      oldData: { is_active: true, subscription_status: sub?.status },
      newData: { is_active: false, subscription_status: "suspended", reason },
      result: undefined,
    };
  });
}

export async function reactivateTenant(tenantId: string): Promise<void> {
  const { userId } = await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  await withAuditLog(userId, "reactivate_tenant", "tenant", tenantId, async () => {
    const now = new Date().toISOString();

    // Reactivate subscription
    const { data: sub } = await db
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "suspended")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      await db
        .from("subscriptions")
        .update({
          status: "active",
          suspended_at: null,
          suspended_reason: null,
          updated_at: now,
        })
        .eq("id", sub.id);
    }

    // Reactivate tenant
    await db.from("tenants").update({ is_active: true, updated_at: now }).eq("id", tenantId);

    return {
      oldData: { is_active: false, subscription_status: "suspended" },
      newData: { is_active: true, subscription_status: "active" },
      result: undefined,
    };
  });
}

// ─── Manual Payment Registration ─────────────────────────────────────

export interface ManualPaymentData {
  amount: number;
  currency?: string;
  payment_reference?: string;
  notes?: string;
  extend_days?: number; // How many days to extend the period
}

export async function recordManualPayment(
  tenantId: string,
  paymentData: ManualPaymentData
): Promise<void> {
  const { userId } = await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  await withAuditLog(userId, "record_payment", "tenant", tenantId, async () => {
    // Get current subscription
    const { data: sub } = await db
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub) throw new Error("No se encontró suscripción para esta barbería");

    const now = new Date();
    const currentEnd = new Date(sub.current_period_end);
    const extendDays = paymentData.extend_days ?? 30;
    const newEnd = new Date(
      Math.max(currentEnd.getTime(), now.getTime()) + extendDays * 86400000
    );

    // Insert revenue record
    await db.from("platform_revenue").insert({
      subscription_id: sub.id,
      tenant_id: tenantId,
      amount: paymentData.amount,
      currency: paymentData.currency ?? "USD",
      payment_method: "manual",
      payment_reference: paymentData.payment_reference ?? null,
      period_start: sub.current_period_end,
      period_end: newEnd.toISOString(),
      notes: paymentData.notes ?? null,
    });

    // Extend subscription period
    const subUpdate: any = {
      current_period_end: newEnd.toISOString(),
      price_paid: paymentData.amount,
      updated_at: now.toISOString(),
    };

    // If it was suspended/past_due, reactivate
    if (sub.status === "suspended" || sub.status === "past_due") {
      subUpdate.status = "active";
      subUpdate.suspended_at = null;
      subUpdate.suspended_reason = null;

      // Also reactivate tenant
      await db
        .from("tenants")
        .update({ is_active: true, updated_at: now.toISOString() })
        .eq("id", tenantId);
    }

    await db.from("subscriptions").update(subUpdate).eq("id", sub.id);

    return {
      oldData: { period_end: sub.current_period_end, status: sub.status },
      newData: {
        period_end: newEnd.toISOString(),
        amount: paymentData.amount,
        status: subUpdate.status ?? sub.status,
      },
      result: undefined,
    };
  });
}

// ─── Revenue History ─────────────────────────────────────────────────

export interface RevenueFilters {
  tenantId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export async function getRevenueHistory(filters: RevenueFilters = {}) {
  await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("platform_revenue")
    .select("*, tenant:tenants(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.tenantId) query = query.eq("tenant_id", filters.tenantId);
  if (filters.startDate) query = query.gte("created_at", filters.startDate);
  if (filters.endDate) query = query.lte("created_at", filters.endDate);

  const { data, count } = await query;

  return {
    payments: (data ?? []).map((p: any) => ({
      ...p,
      tenant_name: p.tenant?.name ?? "Desconocido",
      tenant_slug: p.tenant?.slug,
    })),
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

// ─── Audit Log ───────────────────────────────────────────────────────

export interface AuditLogFilters {
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export async function getAuditLog(filters: AuditLogFilters = {}) {
  await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("superadmin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.targetType) query = query.eq("target_type", filters.targetType);
  if (filters.startDate) query = query.gte("created_at", filters.startDate);
  if (filters.endDate) query = query.lte("created_at", filters.endDate);

  const { data, count } = await query;

  return {
    logs: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

// ─── Notification History ────────────────────────────────────────────

export interface NotificationFilters {
  tenantId?: string;
  status?: string;
  triggerType?: string;
  page?: number;
  pageSize?: number;
}

export async function getNotificationHistory(filters: NotificationFilters = {}) {
  await requireSuperAdmin();
  const supabase = await createAdminClient();
  const db = supabase as any;

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const offset = (page - 1) * pageSize;

  let query = db
    .from("license_notifications")
    .select("*, tenant:tenants(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.tenantId) query = query.eq("tenant_id", filters.tenantId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.triggerType) query = query.eq("trigger_type", filters.triggerType);

  const { data, count } = await query;

  return {
    notifications: (data ?? []).map((n: any) => ({
      ...n,
      tenant_name: n.tenant?.name ?? "Desconocido",
    })),
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}
