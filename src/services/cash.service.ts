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
  const [appointmentsRes, staffRes] = await Promise.all([
    (adminSupabase as any)
      .from("appointments")
      .select("total_price, payment_method, staff_id, staff:tenant_staff(id, profiles(full_name))")
      .eq("tenant_id", tenantId)
      .in("status", ["completed", "confirmed"])
      .gte("start_time", session.opened_at),
    (adminSupabase as any)
      .from("tenant_staff")
      .select("id, role, profiles(full_name)")
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

  // 2. Calculate product sales total since opened_at
  const { data: sales } = await (adminSupabase as any)
    .from("product_sales")
    .select("total_price")
    .eq("tenant_id", tenantId)
    .gte("created_at", session.opened_at);

  const salesTotal = sales?.reduce((sum: number, sale: any) => sum + Number(sale.total_price || 0), 0) || 0;

  // 2.5 Calculate ledger cash movements (advances and payments) since opened_at
  const { data: ledgerMoves } = await (adminSupabase as any)
    .from("staff_ledger")
    .select("type, amount")
    .eq("tenant_id", tenantId)
    .in("type", ["advance", "payment"])
    .gte("created_at", session.opened_at);

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

  const openingBalance = Number(session.opening_balance || 0);
  const expectedCash = openingBalance + appointmentsCashTotal + salesTotal - ledgerAdvances + ledgerPayments;
  const expectedDigital = appointmentsDigitalTotal;
  const expectedBalance = expectedCash + expectedDigital;

  // 3. Build the barbers cash and digital breakdown
  const { data: sessionLedger } = await (adminSupabase as any)
    .from("staff_ledger")
    .select("staff_id, type, amount")
    .eq("tenant_id", tenantId)
    .gte("created_at", session.opened_at);

  const breakdownMap = new Map<string, { 
    id: string; 
    name: string; 
    appointments_count: number; 
    total_cash: number;
    appointments_digital_count: number;
    total_digital: number;
    total_advances: number;
    total_payments: number;
    total_consignments: number;
    net_expected_cash: number;
  }>();

  staffMembers.forEach((s: any) => {
    breakdownMap.set(s.id, {
      id: s.id,
      name: s.profiles?.full_name || "Desconocido",
      appointments_count: 0,
      total_cash: 0,
      appointments_digital_count: 0,
      total_digital: 0,
      total_advances: 0,
      total_payments: 0,
      total_consignments: 0,
      net_expected_cash: 0
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
        appointments_count: 0,
        total_cash: 0,
        appointments_digital_count: 0,
        total_digital: 0,
        total_advances: 0,
        total_payments: 0,
        total_consignments: 0,
        net_expected_cash: 0
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
        appointments_count: 0,
        total_cash: 0,
        appointments_digital_count: 0,
        total_digital: 0,
        total_advances: 0,
        total_payments: 0,
        total_consignments: 0,
        net_expected_cash: 0
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
  });

  // Compute final net_expected_cash for each staff member
  breakdownMap.forEach((b) => {
    b.net_expected_cash = b.total_cash - b.total_advances + b.total_payments;
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
