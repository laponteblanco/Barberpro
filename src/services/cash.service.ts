import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";

export interface ActiveSessionDetails {
  id: string;
  opened_at: string;
  opening_balance: number;
  expected_balance: number;
  expected_cash: number;
  expected_digital: number;
  appointments_total: number;
  appointments_cash_total: number;
  appointments_digital_total: number;
  sales_total: number;
  expenses_total: number;
  expenses: any[];
  status: 'open' | 'closed';
  digital_breakdown: {
    card: number;
    nequi: number;
    daviplata: number;
    transfer: number;
  };
  barbers_breakdown: Array<{
    id: string;
    name: string;
    appointments_count: number;
    total_cash: number;
    appointments_digital_count: number;
    total_digital: number;
  }>;
}

/**
 * Gets the currently open cash session for the active tenant,
 * calculating dynamic revenues from appointments and product sales.
 */
export async function getActiveCashSession(): Promise<ActiveSessionDetails | null> {
  const { tenantId } = await getSession();
  if (!tenantId) return null;

  const adminSupabase = await createAdminClient();

  const { data: session, error } = await (adminSupabase as any)
    .from("cash_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "open")
    .maybeSingle();

  if (error || !session) return null;

  // 1. Calculate appointments total since opened_at
  // Helper to get start of day in local time (UTC-5 for Colombia)
  const sessionDate = new Date(session.opened_at);
  const utcDate = new Date(sessionDate.getTime() - (5 * 3600000));
  const startOfDayUtc = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), 5, 0, 0, 0)); // 5:00 UTC is 00:00 local time
  const startOfDayISO = startOfDayUtc.toISOString();

  const [appointmentsRes, staffRes] = await Promise.all([
    (adminSupabase as any)
      .from("appointments")
      .select("total_price, payment_method, start_time, staff_id, staff:tenant_staff(id, profiles(full_name)), service:services(name)")
      .eq("tenant_id", tenantId)
      .in("status", ["completed", "confirmed"])
      .gte("start_time", startOfDayISO),
    (adminSupabase as any)
      .from("tenant_staff")
      .select("id, role, commission_rate, daily_commission_rates, profiles(full_name)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .neq("role", "admin")
  ]);

  const appointments = appointmentsRes.data || [];
  const staffMembers = staffRes.data || [];

  let appointmentsCashTotal = 0;
  let appointmentsDigitalTotal = 0;

  const digitalBreakdown = {
    card: 0,
    nequi: 0,
    daviplata: 0,
    transfer: 0
  };

  appointments.forEach((app: any) => {
    const price = Number(app.total_price || 0);
    const method = app.payment_method || "cash";

    if (method === "cash") {
      appointmentsCashTotal += price;
    } else {
      appointmentsDigitalTotal += price;
      if (method === "card") digitalBreakdown.card += price;
      else if (method === "nequi") digitalBreakdown.nequi += price;
      else if (method === "daviplata") digitalBreakdown.daviplata += price;
      else if (method === "transfer") digitalBreakdown.transfer += price;
    }
  });

  const appointmentsTotal = appointmentsCashTotal + appointmentsDigitalTotal;

  // 2. Calculate product sales total since startOfDayISO
  const { data: sales } = await (adminSupabase as any)
    .from("product_sales")
    .select("total_price")
    .eq("tenant_id", tenantId)
    .gte("created_at", startOfDayISO);

  const salesTotal = sales?.reduce((sum: number, sale: any) => sum + Number(sale.total_price || 0), 0) || 0;

  // 2.5 Calculate ledger cash movements (advances and payments) since startOfDayISO
  const { data: ledgerMoves } = await (adminSupabase as any)
    .from("staff_ledger")
    .select("type, amount")
    .eq("tenant_id", tenantId)
    .in("type", ["advance", "payment"])
    .gte("created_at", startOfDayISO);

  let ledgerAdvances = 0;
  let ledgerPayments = 0;

  ledgerMoves?.forEach((move: any) => {
    const amt = Number(move.amount || 0);
    if (move.type === "advance") {
      ledgerAdvances += amt;
    } else if (move.type === "payment") {
      ledgerPayments += amt;
    }
  });

  // 2.7 Calculate Expenses
  let expensesTotal = 0;
  let expensesList: any[] = [];
  try {
    const { data: expensesData, error: expError } = await (adminSupabase as any)
      .from("expenses")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("created_at", startOfDayISO);
      
    if (!expError && expensesData) {
      expensesList = expensesData;
      expensesTotal = expensesData.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
    }
  } catch (e) {
    // Ignore if table doesn't exist yet
  }

  const openingBalance = Number(session.opening_balance || 0);
  const expectedCash = openingBalance + appointmentsCashTotal + salesTotal - ledgerAdvances + ledgerPayments - expensesTotal;
  const expectedDigital = appointmentsDigitalTotal;
  const expectedBalance = expectedCash + expectedDigital;

  // 3. Build the barbers cash and digital breakdown
  const { data: sessionLedger } = await (adminSupabase as any)
    .from("staff_ledger")
    .select("staff_id, type, amount")
    .eq("tenant_id", tenantId)
    .gte("created_at", startOfDayISO);

  const breakdownMap = new Map<string, { 
    id: string; 
    name: string; 
    commission_rate: number;
    daily_commission_rates: any;
    appointments_count: number; 
    total_cash: number;
    appointments_digital_count: number;
    total_digital: number;
    total_advances: number;
    total_payments: number;
    total_consignments: number;
    net_expected_cash: number;
    total_commission: number;
    total_shop_profit: number;
    services_breakdown: Record<string, number>;
  }>();

  staffMembers.forEach((s: any) => {
    breakdownMap.set(s.id, {
      id: s.id,
      name: s.profiles?.full_name || "Desconocido",
      commission_rate: Number(s.commission_rate || 0),
      daily_commission_rates: s.daily_commission_rates || {},
      appointments_count: 0,
      total_cash: 0,
      appointments_digital_count: 0,
      total_digital: 0,
      total_advances: 0,
      total_payments: 0,
      total_consignments: 0,
      net_expected_cash: 0,
      total_commission: 0,
      total_shop_profit: 0,
      services_breakdown: {}
    });
  });

  // Populate ledger data into breakdown map
  sessionLedger?.forEach((item: any) => {
    const staffId = item.staff_id;
    const amt = Number(item.amount || 0);

    if (!breakdownMap.has(staffId)) {
      breakdownMap.set(staffId, {
        id: staffId,
        name: "Staff Inactivo",
        commission_rate: 0,
        daily_commission_rates: {},
        appointments_count: 0,
        total_cash: 0,
        appointments_digital_count: 0,
        total_digital: 0,
        total_advances: 0,
        total_payments: 0,
        total_consignments: 0,
        net_expected_cash: 0,
        total_commission: 0,
        total_shop_profit: 0,
        services_breakdown: {}
      });
    }

    const b = breakdownMap.get(staffId)!;
    if (item.type === "advance") {
      b.total_advances += amt;
    } else if (item.type === "payment") {
      b.total_payments += amt;
    } else if (item.type === "consignment") {
      b.total_consignments += amt;
    }
  });

  appointments.forEach((app: any) => {
    const staffId = app.staff_id;
    const price = Number(app.total_price || 0);
    const method = app.payment_method || "cash";

    if (!breakdownMap.has(staffId)) {
      breakdownMap.set(staffId, {
        id: staffId,
        name: app.staff?.profiles?.full_name || "Staff Inactivo",
        commission_rate: 0,
        daily_commission_rates: {},
        appointments_count: 0,
        total_cash: 0,
        appointments_digital_count: 0,
        total_digital: 0,
        total_advances: 0,
        total_payments: 0,
        total_consignments: 0,
        net_expected_cash: 0,
        total_commission: 0,
        total_shop_profit: 0,
        services_breakdown: {}
      });
    }

    const b = breakdownMap.get(staffId)!;
    if (method === "cash") {
      b.appointments_count++;
      b.total_cash += price;
    } else {
      b.appointments_digital_count++;
      b.total_digital += price;
    }

    if (app.start_time) {
      const d = new Date(app.start_time);
      const utc = d.getTime();
      const bogotaDate = new Date(utc - (5 * 3600000));
      const dayIndex = bogotaDate.getUTCDay();
      
      const rate = b.daily_commission_rates?.[String(dayIndex)] ?? b.commission_rate ?? 0;
      const commission = price * (rate / 100);
      b.total_commission += commission;
      b.total_shop_profit += (price - commission);
    }
    
    // Add to services breakdown
    const serviceName = app.service?.name || "Servicio Desconocido";
    b.services_breakdown[serviceName] = (b.services_breakdown[serviceName] || 0) + 1;
  });

  // Compute final net_expected_cash for each staff member.
  // The barber must hand over their full commission (on cash + digital)
  // minus any advances (vales) taken from the register today.
  breakdownMap.forEach((b) => {
    b.net_expected_cash = b.total_commission - b.total_advances + b.total_payments;
  });

  const barbersBreakdown = Array.from(breakdownMap.values()).sort((a, b) => b.net_expected_cash - a.net_expected_cash);

  return {
    id: session.id,
    opened_at: session.opened_at,
    opening_balance: openingBalance,
    expected_balance: expectedBalance,
    expected_cash: expectedCash,
    expected_digital: expectedDigital,
    appointments_total: appointmentsTotal,
    appointments_cash_total: appointmentsCashTotal,
    appointments_digital_total: appointmentsDigitalTotal,
    sales_total: salesTotal,
    expenses_total: expensesTotal,
    expenses: expensesList,
    status: session.status,
    digital_breakdown: digitalBreakdown,
    barbers_breakdown: barbersBreakdown,
  };
}

/**
 * Opens a new cash session with a custom starting balance.
 */
export async function openCashSession(openingBalance: number): Promise<{ success: boolean; error?: string }> {
  const { user, tenantId } = await getSession();
  if (!user || !tenantId) return { success: false, error: "No autorizado" };

  const adminSupabase = await createAdminClient();

  // Check if there is already an active session
  const active = await getActiveCashSession();
  if (active) return { success: false, error: "Ya hay una sesión de caja abierta" };

  const { error } = await (adminSupabase as any)
    .from("cash_sessions")
    .insert({
      tenant_id: tenantId,
      opened_by: user.id,
      opening_balance: openingBalance,
      status: 'open',
    } as any);

  if (error) {
    console.error("Error opening cash session:", error);
    return { success: false, error: `Error al abrir caja: ${error.message}` };
  }

  return { success: true };
}

/**
 * Closes the active cash session by calculating the expected balance and saving counted cash.
 */
export async function closeCashSession(
  actualBalance: number,
  barbersBreakdown?: any[]
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await getSession();
  if (!tenantId) return { success: false, error: "No autorizado" };

  const adminSupabase = await createAdminClient();

  const active = await getActiveCashSession();
  if (!active) return { success: false, error: "No hay ninguna sesión de caja activa para cerrar" };

  const updatePayload: any = {
    status: 'closed',
    closed_at: new Date().toISOString(),
    expected_balance: active.expected_balance,
    expected_cash: active.expected_cash,
    expected_digital: active.expected_digital,
    actual_balance: actualBalance,
  };

  if (barbersBreakdown) {
    updatePayload.barbers_breakdown = barbersBreakdown;
  }

  let { error } = await (adminSupabase as any)
    .from("cash_sessions")
    .update(updatePayload)
    .eq("id", active.id);

  if (error) {
    console.warn("Failed to save full closing details, falling back to basic close:", error);
    const fallbackPayload = {
      status: 'closed',
      closed_at: new Date().toISOString(),
      expected_balance: active.expected_balance,
      actual_balance: actualBalance,
    };

    const fallbackRes = await (adminSupabase as any)
      .from("cash_sessions")
      .update(fallbackPayload)
      .eq("id", active.id);
    
    error = fallbackRes.error;
  }

  if (error) {
    console.error("Error closing cash session:", error);
    return { success: false, error: `Error al cerrar caja: ${error.message}` };
  }

  return { success: true };
}

/**
 * Gets the historical records of closed cash sessions.
 */
export async function getCashSessionHistory() {
  const { tenantId } = await getSession();
  if (!tenantId) return [];

  const adminSupabase = await createAdminClient();

  const { data: sessions, error } = await (adminSupabase as any)
    .from("cash_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false });

  if (error) {
    console.error("Error fetching cash session history:", error);
    return [];
  }

  if (!sessions || sessions.length === 0) return [];

  // Fetch profiles for the users who opened these sessions in parallel
  const userIds = [...new Set(sessions.map((s: any) => s.opened_by))];
  const { data: profiles } = await (adminSupabase as any)
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);

  return sessions.map((session: any) => ({
    id: session.id,
    opened_at: session.opened_at,
    closed_at: session.closed_at,
    opening_balance: Number(session.opening_balance || 0),
    expected_balance: Number(session.expected_balance || 0),
    expected_cash: Number(session.expected_cash ?? session.expected_balance ?? 0),
    expected_digital: Number(session.expected_digital ?? 0),
    actual_balance: Number(session.actual_balance || 0),
    closed_by_name: profileMap.get(session.opened_by) || "Desconocido",
    discrepancy: Number(session.actual_balance || 0) - Number(session.expected_cash ?? session.expected_balance ?? 0),
    barbers_breakdown: session.barbers_breakdown || [],
  }));
}

/**
 * Verifies if the provided PIN matches the tenant's security pin.
 */
export async function verifySecurityPin(pin: string): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await getSession();
  if (!tenantId) return { success: false, error: "No autorizado" };

  const adminSupabase = await createAdminClient();

  const { data: tenant } = await (adminSupabase as any)
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  if (!tenant) return { success: false, error: "Tenant no encontrado" };

  const savedPin = tenant.settings?.security_pin;
  if (!savedPin) {
    // If no pin is configured, allow it? Let's say yes, or maybe fail?
    // If they want to use this feature, they should set a PIN.
    return { success: true };
  }

  if (savedPin !== pin) {
    return { success: false, error: "PIN incorrecto" };
  }

  return { success: true };
}

/**
 * Permanently deletes a closed cash session from history.
 */
export async function deleteCashSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await getSession();
  if (!tenantId) return { success: false, error: "No autorizado" };

  const adminSupabase = await createAdminClient();

  const { error } = await (adminSupabase as any)
    .from("cash_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error deleting cash session:", error);
    return { success: false, error: `Error al eliminar: ${error.message}` };
  }

  return { success: true };
}

/**
 * Updates a closed cash session's actual balance and optionally its barbers breakdown.
 */
export async function updateClosedCashSession(
  sessionId: string,
  actualBalance: number,
  barbersBreakdown?: any[]
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await getSession();
  if (!tenantId) return { success: false, error: "No autorizado" };

  const adminSupabase = await createAdminClient();

  const updatePayload: any = {
    actual_balance: actualBalance,
  };

  if (barbersBreakdown) {
    updatePayload.barbers_breakdown = barbersBreakdown;
  }

  const { error } = await (adminSupabase as any)
    .from("cash_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error updating cash session:", error);
    return { success: false, error: `Error al actualizar: ${error.message}` };
  }

  return { success: true };
}

