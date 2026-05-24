/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError, NotFoundError, SubscriptionError } from "@/lib/errors";
import type { TenantStaff, Subscription, SubscriptionPlan } from "@/types/database";

export async function requireTenantAccess(tenantId: string): Promise<TenantStaff> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new UnauthorizedError();

  const db = supabase as any;

  const { data: profile } = await db.from("profiles").select("is_superadmin").eq("id", user.id).single();
  if (profile?.is_superadmin) {
    return {
      id: "superadmin-mock-id",
      tenant_id: tenantId,
      user_id: user.id,
      role: "owner",
      display_name: "Super Administrador",
      avatar_url: null,
      phone: null,
      is_active: true,
      commission_rate: 0,
      specialties: [],
      working_hours: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as TenantStaff;
  }

  const { data: staff, error } = await db
    .from("tenant_staff")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !staff) throw new ForbiddenError("No tienes acceso a este local");
  return staff as TenantStaff;
}

export async function requireActiveSubscription(tenantId: string): Promise<Subscription> {
  const supabase = await createClient();
  const db = supabase as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await db.from("profiles").select("is_superadmin").eq("id", user.id).single();
    if (profile?.is_superadmin) {
      return {
        id: "superadmin-mock-sub",
        tenant_id: tenantId,
        plan: "pro",
        status: "active",
        trial_ends_at: null,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 31536000000).toISOString(),
        cancel_at_period_end: false,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Subscription;
    }
  }


  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) throw new SubscriptionError();
  return data as Subscription;
}

const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  basic: 0,
  premium: 1,
  pro: 2,
};

export async function requirePlan(tenantId: string, minimumPlan: SubscriptionPlan): Promise<void> {
  const subscription = await requireActiveSubscription(tenantId);
  const currentLevel = PLAN_HIERARCHY[subscription.plan as SubscriptionPlan] ?? -1;
  const requiredLevel = PLAN_HIERARCHY[minimumPlan];
  if (currentLevel < requiredLevel) {
    throw new Error(`Esta función requiere el plan ${minimumPlan}. Tu plan actual es ${subscription.plan}.`);
  }
}

export async function getTenant(tenantId: string) {
  const supabase = await createClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .eq("is_active", true)
    .single();

  if (error || !data) throw new NotFoundError("Local");
  return data;
}
