import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpenseRecord {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  /** 'cash' = salió de la caja física | 'digital' = transferencia/digital */
  payment_method: "cash" | "digital";
  created_at: string;
}

export interface BarberBreakdown {
  id: string;
  name: string;
  commission_rate: number;
  daily_commission_rates: Record<string, number>;
  /** Número total de citas únicas (sin doble conteo de splits) */
  appointments_total_count: number;
  /** Número de servicios cobrados en efectivo (o parcialmente en efectivo) */
  appointments_count: number;
  /** Monto cobrado en efectivo por citas */
  total_cash: number;
  /** Número de servicios cobrados en digital (o parcialmente en digital) */
  appointments_digital_count: number;
  /** Monto cobrado en digital por citas */
  total_digital: number;
  /** Suma de vales/adelantos totales (cash + digital) */
  total_advances: number;
  /** Vales entregados desde la caja física */
  total_advances_cash: number;
  /** Vales entregados desde el fondo digital */
  total_advances_digital: number;
  /** Suma de pagos devueltos a la caja totales */
  total_payments: number;
  /** Pagos devueltos a la caja física */
  total_payments_cash: number;
  /** Pagos devueltos al fondo digital */
  total_payments_digital: number;
  /** Fiados / consignaciones */
  total_consignments: number;
  /** Comisión total calculada (cash + digital) */
  total_commission: number;
  /** Utilidad de la barbería en este barbero */
  total_shop_profit: number;
  /** Pago neto esperado en EFECTIVO (payout_cash − advances_cash + payments_cash) */
  net_expected_cash: number;
  /** Pago neto desde fondo CASH después de descontar vales cash */
  net_payout_cash: number;
  /** Pago neto desde fondo DIGITAL después de descontar vales digital */
  net_payout_digital: number;
  /** Cuánto del pago al barbero sale del fondo CASH (bruto, antes de vales) */
  payout_cash: number;
  /** Cuánto del pago al barbero sale del fondo DIGITAL (bruto, antes de vales) */
  payout_digital: number;
  /** Desglose de servicios realizados { nombre: cantidad } */
  services_breakdown: Record<string, number>;
  is_active?: boolean;
}

export interface ActiveSessionDetails {
  id: string;
  opened_at: string;
  opening_balance: number;

  // ── Ingresos brutos por método de pago ──────────────────────────
  appointments_total: number;
  appointments_cash_total: number;
  appointments_digital_total: number;
  sales_total: number;

  // ── Desglose digital por plataforma ─────────────────────────────
  digital_breakdown: {
    card: number;
    nequi: number;
    daviplata: number;
    transfer: number;
  };

  // ── Gastos operativos separados por fondo ───────────────────────
  expenses: ExpenseRecord[];
  expenses_total: number;
  /** Gastos pagados en efectivo físico */
  expenses_cash_total: number;
  /** Gastos pagados mediante transferencia/digital */
  expenses_digital_total: number;

  // ── Pagos a barberos separados por fondo ─────────────────────────
  /** Total neto pagado a barberos en efectivo */
  payouts_cash_total: number;
  /** Total neto pagado a barberos en digital */
  payouts_digital_total: number;

  // ── Movimientos del ledger (vales / pagos) ───────────────────────
  ledger_advances_cash: number;
  ledger_advances_digital: number;
  ledger_payments_cash: number;
  ledger_payments_digital: number;

  // ── Balance final cuadrado ────────────────────────────────────────
  /**
   * Efectivo esperado en caja =
   *   opening_balance
   *   + appointments_cash_total
   *   + sales_total
   *   − expenses_cash_total
   *   − ledger_advances_cash
   *   + ledger_payments_cash
   */
  expected_cash: number;
  /**
   * Saldo digital esperado =
   *   appointments_digital_total
   *   − expenses_digital_total
   *   − ledger_advances_digital
   *   + ledger_payments_digital
   */
  expected_digital: number;
  /** Suma total de ambos fondos */
  expected_balance: number;

  // ── Breakdown por barbero ─────────────────────────────────────────
  barbers_breakdown: BarberBreakdown[];

  status: "open" | "closed";

  appointments?: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calcula el inicio del día local a partir de una fecha UTC.
 * Se asume UTC-5 (Colombia/Bogotá) como zona horaria base.
 */
function getStartOfDayISO(referenceDate: Date): string {
  const utcDate = new Date(referenceDate.getTime() - 5 * 3600000);
  const startOfDay = new Date(
    Date.UTC(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate(),
      5, 0, 0, 0 // 05:00 UTC = 00:00 Bogotá
    )
  );
  return startOfDay.toISOString();
}

/**
 * Normaliza el método de pago de una cita a 'cash' o 'digital'.
 * Para pagos split, retorna ambos montos discriminados.
 */
function resolveAppointmentPayment(app: any): {
  cashAmount: number;
  digitalAmount: number;
  cardAmount: number;
  nequiAmount: number;
  daviplataAmount: number;
  transferAmount: number;
} {
  const price = Number(app.total_price || 0);
  const method = app.payment_method || "cash";

  if (method === "cash") {
    return { cashAmount: price, digitalAmount: 0, cardAmount: 0, nequiAmount: 0, daviplataAmount: 0, transferAmount: 0 };
  }

  if (method === "split") {
    const splitCash = Number(app.split_cash_amount || 0);
    const splitDigital = Number(app.split_digital_amount || 0);
    const splitMethod = app.split_digital_method || "";
    return {
      cashAmount: splitCash,
      digitalAmount: splitDigital,
      cardAmount: splitMethod === "card" ? splitDigital : 0,
      nequiAmount: splitMethod === "nequi" ? splitDigital : 0,
      daviplataAmount: splitMethod === "daviplata" ? splitDigital : 0,
      transferAmount: splitMethod === "transfer" ? splitDigital : 0,
    };
  }

  // Fully digital payment
  return {
    cashAmount: 0,
    digitalAmount: price,
    cardAmount: method === "card" ? price : 0,
    nequiAmount: method === "nequi" ? price : 0,
    daviplataAmount: method === "daviplata" ? price : 0,
    transferAmount: method === "transfer" ? price : 0,
  };
}

// ─── Main service functions ────────────────────────────────────────────────────

/**
 * Gets the currently open cash session for the active tenant,
 * calculating dynamic revenues from appointments and product sales.
 * Fully discriminates expenses and barber payouts by fund (cash vs digital).
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

  return getCashSessionDetailsById(session.id);
}

/**
 * Gets the full details for any cash session (open or closed) by re-aggregating
 * the data that occurred between its opened_at and closed_at timestamps.
 * This ensures the historical PDF perfectly matches what happened during that shift.
 */
export async function getCashSessionDetailsById(sessionId: string): Promise<ActiveSessionDetails | null> {
  const { tenantId } = await getSession();
  if (!tenantId) return null;

  const adminSupabase = await createAdminClient();

  const { data: session, error } = await (adminSupabase as any)
    .from("cash_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !session) return null;

  const openedAtISO = session.opened_at;
  // Subtract 3 hours buffer from opened_at to catch appointments starting slightly before the shift
  const queryStartISO = new Date(new Date(openedAtISO).getTime() - 3 * 3600000).toISOString();
  // If session is closed, fetch only up to closed_at, otherwise fetch everything after opened_at
  const closedAtISO = session.closed_at || new Date().toISOString();

  // ── Parallel data fetching ───────────────────────────────────────────────────
  let appointmentsQuery = (adminSupabase as any)
    .from("appointments")
    .select(
      "id, total_price, payment_method, split_cash_amount, split_digital_amount, split_digital_method, start_time, staff_id, staff:tenant_staff(id, profiles(full_name)), service:services(name), client:clients(full_name), appointment_services(services(id, name))"
    )
    .eq("tenant_id", tenantId)
    .in("status", ["completed", "confirmed", "pending"])
    .gte("start_time", queryStartISO);

  if (session.closed_at) {
    appointmentsQuery = appointmentsQuery.lte("start_time", session.closed_at);
  }

  const [appointmentsRes, staffRes, salesRes, ledgerRes, expensesRes] = await Promise.all([
    // 1. Appointments for the session window
    appointmentsQuery,

    // 2. Active barbers (not admin) for commission calculation
    (adminSupabase as any)
      .from("tenant_staff")
      .select("id, role, is_active, commission_rate, daily_commission_rates, profiles(full_name)")
      .eq("tenant_id", tenantId)
      .neq("role", "admin"), // Don't filter by is_active so we catch inactive barbers who worked that day

    // 3. Product sales
    (adminSupabase as any)
      .from("product_sales")
      .select("total_price")
      .eq("tenant_id", tenantId)
      .gte("created_at", openedAtISO)
      .lte("created_at", closedAtISO),

    // 4. Staff ledger (advances, payments, consignments)
    (adminSupabase as any)
      .from("staff_ledger")
      .select("staff_id, type, amount, payment_method")
      .eq("tenant_id", tenantId)
      .gte("created_at", openedAtISO)
      .lte("created_at", closedAtISO),

    // 5. Operating expenses
    (adminSupabase as any)
      .from("expenses")
      .select("id, category, description, amount, payment_method, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", openedAtISO)
      .lte("created_at", closedAtISO)
      .order("created_at", { ascending: false }),
  ]);

  const appointments = appointmentsRes.data || [];
  const staffMembers = staffRes.data || [];
  const sales = salesRes.data || [];
  const ledgerEntries = ledgerRes.data || [];
  const expensesRaw = expensesRes.data || [];

  // ── 1. Process appointments ──────────────────────────────────────────────────
  let appointmentsCashTotal = 0;
  let appointmentsDigitalTotal = 0;
  const digitalBreakdown = { card: 0, nequi: 0, daviplata: 0, transfer: 0 };

  appointments.forEach((app: any) => {
    const { cashAmount, digitalAmount, cardAmount, nequiAmount, daviplataAmount, transferAmount } =
      resolveAppointmentPayment(app);
    appointmentsCashTotal += cashAmount;
    appointmentsDigitalTotal += digitalAmount;
    digitalBreakdown.card += cardAmount;
    digitalBreakdown.nequi += nequiAmount;
    digitalBreakdown.daviplata += daviplataAmount;
    digitalBreakdown.transfer += transferAmount;
  });

  const appointmentsTotal = appointmentsCashTotal + appointmentsDigitalTotal;

  // ── 2. Product sales (always cash for now) ───────────────────────────────────
  const salesTotal = sales.reduce(
    (sum: number, sale: any) => sum + Number(sale.total_price || 0),
    0
  );

  // ── 3. Process expenses by fund ──────────────────────────────────────────────
  const expensesList: ExpenseRecord[] = expensesRaw.map((e: any) => ({
    id: e.id,
    category: e.category || "Otros",
    description: e.description || null,
    amount: Number(e.amount || 0),
    payment_method: (e.payment_method as "cash" | "digital") || "cash",
    created_at: e.created_at,
  }));

  let expensesCashTotal = 0;
  let expensesDigitalTotal = 0;

  expensesList.forEach((exp) => {
    if (exp.payment_method === "cash") {
      expensesCashTotal += exp.amount;
    } else {
      expensesDigitalTotal += exp.amount;
    }
  });

  const expensesTotal = expensesCashTotal + expensesDigitalTotal;

  // ── 4. Process staff ledger by type and fund ─────────────────────────────────
  let ledgerAdvancesCash = 0;
  let ledgerAdvancesDigital = 0;
  let ledgerPaymentsCash = 0;
  let ledgerPaymentsDigital = 0;

  ledgerEntries.forEach((entry: any) => {
    const amt = Number(entry.amount || 0);
    const method: "cash" | "digital" = entry.payment_method === "digital" ? "digital" : "cash";

    if (entry.type === "advance") {
      if (method === "cash") ledgerAdvancesCash += amt;
      else ledgerAdvancesDigital += amt;
    } else if (entry.type === "payment") {
      if (method === "cash") ledgerPaymentsCash += amt;
      else ledgerPaymentsDigital += amt;
    }
  });

  // ── 5. Build barbers breakdown map ───────────────────────────────────────────
  const breakdownMap = new Map<string, BarberBreakdown>();

  staffMembers.forEach((s: any) => {
    breakdownMap.set(s.id, {
      id: s.id,
      name: s.profiles?.full_name || "Desconocido",
      commission_rate: Number(s.commission_rate || 0),
      daily_commission_rates: s.daily_commission_rates || {},
      is_active: s.is_active ?? true,
      appointments_total_count: 0,
      appointments_count: 0,
      total_cash: 0,
      appointments_digital_count: 0,
      total_digital: 0,
      total_advances: 0,
      total_advances_cash: 0,
      total_advances_digital: 0,
      total_payments: 0,
      total_payments_cash: 0,
      total_payments_digital: 0,
      total_consignments: 0,
      total_commission: 0,
      total_shop_profit: 0,
      net_expected_cash: 0,
      net_payout_cash: 0,
      net_payout_digital: 0,
      payout_cash: 0,
      payout_digital: 0,
      services_breakdown: {},
    });
  });

  // Populate ledger data (advances, payments, consignments) per barber
  ledgerEntries.forEach((item: any) => {
    const staffId = item.staff_id;
    const amt = Number(item.amount || 0);
    const ledgerMethod: "cash" | "digital" = item.payment_method === "digital" ? "digital" : "cash";

    if (!breakdownMap.has(staffId)) {
      breakdownMap.set(staffId, {
        id: staffId,
        name: "Staff Inactivo",
        commission_rate: 0,
        daily_commission_rates: {},
        is_active: false,
        appointments_total_count: 0,
        appointments_count: 0,
        total_cash: 0,
        appointments_digital_count: 0,
        total_digital: 0,
        total_advances: 0,
        total_advances_cash: 0,
        total_advances_digital: 0,
        total_payments: 0,
        total_payments_cash: 0,
        total_payments_digital: 0,
        total_consignments: 0,
        total_commission: 0,
        total_shop_profit: 0,
        net_expected_cash: 0,
        net_payout_cash: 0,
        net_payout_digital: 0,
        payout_cash: 0,
        payout_digital: 0,
        services_breakdown: {},
      });
    }

    const b = breakdownMap.get(staffId)!;
    if (item.type === "advance") {
      b.total_advances += amt;
      if (ledgerMethod === "cash") b.total_advances_cash += amt;
      else b.total_advances_digital += amt;
    } else if (item.type === "payment") {
      b.total_payments += amt;
      if (ledgerMethod === "cash") b.total_payments_cash += amt;
      else b.total_payments_digital += amt;
    } else if (item.type === "consignment") {
      b.total_consignments += amt;
    }
  });

  // Populate appointment revenue data per barber
  appointments.forEach((app: any) => {
    const staffId = app.staff_id;
    const price = Number(app.total_price || 0);

    if (!breakdownMap.has(staffId)) {
      breakdownMap.set(staffId, {
        id: staffId,
        name: app.staff?.profiles?.full_name || (staffId ? "Staff Inactivo" : "Sin barbero asignado"),
        commission_rate: 0,
        daily_commission_rates: {},
        is_active: false,
        appointments_total_count: 0,
        appointments_count: 0,
        total_cash: 0,
        appointments_digital_count: 0,
        total_digital: 0,
        total_advances: 0,
        total_advances_cash: 0,
        total_advances_digital: 0,
        total_payments: 0,
        total_payments_cash: 0,
        total_payments_digital: 0,
        total_consignments: 0,
        total_commission: 0,
        total_shop_profit: 0,
        net_expected_cash: 0,
        net_payout_cash: 0,
        net_payout_digital: 0,
        payout_cash: 0,
        payout_digital: 0,
        services_breakdown: {},
      });
    }

    const b = breakdownMap.get(staffId)!;
    const { cashAmount, digitalAmount } = resolveAppointmentPayment(app);
    const appServices = app.appointment_services?.map((as: any) => as.services).filter(Boolean) || [];
    const numServices = appServices.length || 1;

    // Count each service performed
    b.appointments_total_count += numServices;
    if (cashAmount > 0) {
      b.appointments_count += numServices;
      b.total_cash += cashAmount;
    }
    if (digitalAmount > 0) {
      b.appointments_digital_count += numServices;
      b.total_digital += digitalAmount;
    }

    if (app.start_time) {
      const bogotaDate = new Date(new Date(app.start_time).getTime() - 5 * 3600000);
      const dayIndex = bogotaDate.getUTCDay();
      const rate = b.daily_commission_rates?.[String(dayIndex)] ?? b.commission_rate ?? 0;
      const commission = price * (rate / 100);
      b.total_commission += commission;
      b.total_shop_profit += price - commission;
    }

    if (appServices.length > 0) {
      appServices.forEach((s: any) => {
        const serviceName = s.name || "Servicio Desconocido";
        b.services_breakdown[serviceName] = (b.services_breakdown[serviceName] || 0) + 1;
      });
    } else {
      const serviceName = app.service?.name || "Servicio Desconocido";
      b.services_breakdown[serviceName] = (b.services_breakdown[serviceName] || 0) + 1;
    }
  });

  let payoutsCashTotal = 0;
  let payoutsDigitalTotal = 0;

  breakdownMap.forEach((b) => {
    // Gross payout per fund: proportional to cash/digital revenue earned
    const totalRevenue = b.total_cash + b.total_digital;
    if (totalRevenue > 0) {
      const cashRatio = b.total_cash / totalRevenue;
      b.payout_cash = Math.round(b.total_commission * cashRatio * 100) / 100;
      b.payout_digital = Math.round((b.total_commission - b.payout_cash) * 100) / 100;
    } else {
      b.payout_cash = 0;
      b.payout_digital = 0;
    }

    // Net payout per fund after discounting advances and adding back payments for each fund
    // Consignments (products/drinks consumed by the barber) are subtracted from their cash payout as a store deduction.
    b.net_payout_cash = b.payout_cash - b.total_advances_cash + b.total_payments_cash - b.total_consignments;
    b.net_payout_digital = b.payout_digital - b.total_advances_digital + b.total_payments_digital;

    // Legacy field: net expected from cash register (updated to represent total payout: cash + digital)
    b.net_expected_cash = b.net_payout_cash + b.net_payout_digital;

    payoutsCashTotal += b.payout_cash;
    payoutsDigitalTotal += b.payout_digital;
  });

  const barbersBreakdown = Array.from(breakdownMap.values())
    .filter((b) => {
      const hasActivity =
        b.appointments_total_count > 0 ||
        b.total_advances > 0 ||
        b.total_payments > 0 ||
        b.total_consignments > 0 ||
        b.total_commission > 0;
      const isActive = b.is_active !== false;
      return isActive || hasActivity;
    })
    .sort((a, b) => b.net_expected_cash - a.net_expected_cash);

  // ── 6. Final balance calculation ─────────────────────────────────────────────
  const openingBalance = Number(session.opening_balance || 0);

  const expectedCash =
    openingBalance +
    appointmentsCashTotal +
    salesTotal -
    expensesCashTotal -
    ledgerAdvancesCash +
    ledgerPaymentsCash;

  const expectedDigital =
    appointmentsDigitalTotal -
    expensesDigitalTotal -
    ledgerAdvancesDigital +
    ledgerPaymentsDigital;

  const expectedBalance = expectedCash + expectedDigital;

  return {
    id: session.id,
    opened_at: session.opened_at,
    opening_balance: openingBalance,
    appointments_total: appointmentsTotal,
    appointments_cash_total: appointmentsCashTotal,
    appointments_digital_total: appointmentsDigitalTotal,
    sales_total: salesTotal,
    digital_breakdown: digitalBreakdown,
    expenses: expensesList,
    expenses_total: expensesTotal,
    expenses_cash_total: expensesCashTotal,
    expenses_digital_total: expensesDigitalTotal,
    payouts_cash_total: payoutsCashTotal,
    payouts_digital_total: payoutsDigitalTotal,
    ledger_advances_cash: ledgerAdvancesCash,
    ledger_advances_digital: ledgerAdvancesDigital,
    ledger_payments_cash: ledgerPaymentsCash,
    ledger_payments_digital: ledgerPaymentsDigital,
    expected_cash: expectedCash,
    expected_digital: expectedDigital,
    expected_balance: expectedBalance,
    barbers_breakdown: barbersBreakdown,
    status: session.status,
    appointments: appointments,
  };
}

/**
 * Opens a new cash session with a custom starting balance.
 */
export async function openCashSession(
  openingBalance: number
): Promise<{ success: boolean; error?: string }> {
  const { user, tenantId } = await getSession();
  if (!user || !tenantId) return { success: false, error: "No autorizado" };

  const adminSupabase = await createAdminClient();

  const active = await getActiveCashSession();
  if (active) return { success: false, error: "Ya hay una sesión de caja abierta" };

  const { error } = await (adminSupabase as any)
    .from("cash_sessions")
    .insert({
      tenant_id: tenantId,
      opened_by: user.id,
      opening_balance: openingBalance,
      status: "open",
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
    status: "closed",
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
      status: "closed",
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

  const userIds = [...new Set(sessions.map((s: any) => s.opened_by))];
  const { data: profiles } = await (adminSupabase as any)
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    profiles?.map((p: any) => [p.id, p.full_name]) || []
  );

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
    discrepancy:
      Number(session.actual_balance || 0) -
      Number(session.expected_cash ?? session.expected_balance ?? 0),
    barbers_breakdown: session.barbers_breakdown || [],
  }));
}

/**
 * Verifies if the provided PIN matches the tenant's security pin.
 */
export async function verifySecurityPin(
  pin: string
): Promise<{ success: boolean; error?: string }> {
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
  if (!savedPin) return { success: true };
  if (savedPin !== pin) return { success: false, error: "PIN incorrecto" };

  return { success: true };
}

/**
 * Permanently deletes a closed cash session from history.
 */
export async function deleteCashSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
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

  const updatePayload: any = { actual_balance: actualBalance };
  if (barbersBreakdown) updatePayload.barbers_breakdown = barbersBreakdown;

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
