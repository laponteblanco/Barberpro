import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function getBIAnalytics(range: string = "month", specificDate?: string, staffId?: string) {
  const { tenantId } = await getSession();
  if (!tenantId) return null;

  const adminSupabase = await createAdminClient();

  // Define date range in Colombia/Bogotá timezone (UTC-5)
  let startDate: Date;
  let endDate: Date;

  if (specificDate) {
    const [y, m, d] = specificDate.split('-').map(Number);
    startDate = new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
    endDate = new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999));
  } else {
    const now = new Date();
    // Shift UTC time to Bogota local time (UTC-5)
    const bogotaNow = new Date(now.getTime() - (5 * 3600 * 1000));
    const year = bogotaNow.getUTCFullYear();
    const month = bogotaNow.getUTCMonth(); // 0-11
    const date = bogotaNow.getUTCDate();
    const dayOfWeek = bogotaNow.getUTCDay(); // 0 (Sun) - 6 (Sat)

    if (range === "today") {
      startDate = new Date(Date.UTC(year, month, date, 5, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, date + 1, 4, 59, 59, 999));
    } else if (range === "week") {
      const distToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monDate = date - distToMon;
      startDate = new Date(Date.UTC(year, month, monDate, 5, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, monDate + 7, 4, 59, 59, 999));
    } else if (range === "month") {
      startDate = new Date(Date.UTC(year, month, 1, 5, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month + 1, 1, 4, 59, 59, 999));
    } else if (range === "last_month") {
      startDate = new Date(Date.UTC(year, month - 1, 1, 5, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, 1, 4, 59, 59, 999));
    } else if (range === "year") {
      startDate = new Date(Date.UTC(year, 0, 1, 5, 0, 0, 0));
      endDate = new Date(Date.UTC(year + 1, 0, 1, 4, 59, 59, 999));
    } else if (range === "all") {
      startDate = new Date(0);
      endDate = new Date(Date.UTC(year + 1, 0, 1, 4, 59, 59, 999));
    } else {
      // Default to current month
      startDate = new Date(Date.UTC(year, month, 1, 5, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month + 1, 1, 4, 59, 59, 999));
    }
  // Cap endDate to current time so future dates or future appointments are never included in reports
  const realNow = new Date();
  if (endDate > realNow) {
    endDate = realNow;
  }

  const [appointmentsRes, salesRes, staffRes, tenantRes] = await Promise.all([
    adminSupabase
      .from("appointments")
      .select("*, staff:tenant_staff(id, profiles(full_name)), service:services(name), client:clients(full_name)")
      .eq("tenant_id", tenantId)
      .match(staffId ? { staff_id: staffId } : {})
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString())
      .eq("status", "completed"),
    adminSupabase
      .from("product_sales")
      .select("*, product:products(name)")
      .eq("tenant_id", tenantId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString()),
    adminSupabase
      .from("tenant_staff")
      .select("id, role, commission_rate, daily_commission_rates, profiles(full_name)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .match(staffId ? { id: staffId } : {}),
    adminSupabase
      .from("tenants")
      .select("business_start, business_end, business_hours_by_day")
      .eq("id", tenantId)
      .single(),
  ]);

  const appointments = (appointmentsRes.data as any[]) || [];
  const sales = (salesRes.data as any[]) || [];
  const staff = (staffRes.data as any[]) || [];

  // 1. Staff Performance & Commissions calculation
  const staffPerformance = staff.map(member => {
    const memberApps = appointments.filter(app => app.staff_id === member.id);
    const memberRevenue = memberApps.reduce((sum, app) => sum + Number(app.total_price || 0), 0);
    
    // Calculate exact commissions per appointment based on daily_commission_rates or commission_rate
    const memberCommissions = memberApps.reduce((sum, app) => {
      const price = Number(app.total_price || 0);
      if (app.start_time) {
        const bogotaDate = new Date(new Date(app.start_time).getTime() - (5 * 3600 * 1000));
        const dayIndex = bogotaDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
        const rate = (member as any).daily_commission_rates?.[String(dayIndex)] ?? (member as any).commission_rate ?? 0;
        return sum + (price * (rate / 100));
      }
      const defaultRate = (member as any).commission_rate ?? 0;
      return sum + (price * (defaultRate / 100));
    }, 0);

    return {
      name: (member as any).profiles?.full_name || "Staff",
      revenue: memberRevenue,
      sales: memberApps.length,
      commissions: memberCommissions,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // 2. KPIs
  const totalServiceRevenue = appointments.reduce((sum, app) => sum + Number(app.total_price || 0), 0);
  const totalProductRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_price || 0), 0);
  const totalBarberCommissions = staffPerformance.reduce((sum, s) => sum + s.commissions, 0);
  
  // Ganancia Neta = (Ingreso Servicios - Comisiones Barberos) + Ingreso Productos
  const netProfit = (totalServiceRevenue - totalBarberCommissions) + totalProductRevenue;
  const avgTicket = appointments.length > 0 ? totalServiceRevenue / appointments.length : 0;

  // Tasa de Retención (Clientes que han venido más de una vez)
  const clientVisits: any = {};
  appointments.forEach(app => {
    clientVisits[app.client_id] = (clientVisits[app.client_id] || 0) + 1;
  });
  const totalClients = Object.keys(clientVisits).length;
  const repeatClients = Object.values(clientVisits).filter((v: any) => v > 1).length;
  const retention = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;

  // 3. Pareto Services
  const serviceMap: any = {};
  appointments.forEach(app => {
    const name = (app as any).service?.name || "Otro";
    serviceMap[name] = (serviceMap[name] || 0) + 1;
  });
  const paretoServices = Object.entries(serviceMap)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count);

  // 4. Heatmap (Dynamic operating hours 1-hour slots)
  const tenantData = tenantRes.data || {};
  let startHour = Number(tenantData.business_start ?? 8);
  let endHour = Number(tenantData.business_end ?? 20);

  if (Array.isArray(tenantData.business_hours_by_day) && tenantData.business_hours_by_day.length > 0) {
    const openDays = tenantData.business_hours_by_day.filter((d: any) => d.open !== false);
    if (openDays.length > 0) {
      const minStart = Math.min(...openDays.map((d: any) => Number(d.start ?? 8)));
      const maxEnd = Math.max(...openDays.map((d: any) => Number(d.end ?? 20)));
      if (!isNaN(minStart) && !isNaN(maxEnd) && minStart < maxEnd) {
        startHour = minStart;
        endHour = maxEnd;
      }
    }
  }

  if (startHour < 0) startHour = 0;
  if (endHour > 23) endHour = 23;
  if (startHour >= endHour) {
    startHour = 8;
    endHour = 20;
  }

  const hourSlots: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hourSlots.push(h);
  }

  function formatHourLabel(h: number): string {
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    if (h < 12) return `${h}am`;
    return `${h - 12}pm`;
  }

  function formatHour12(h: number): string {
    if (h === 0) return "12:00 AM";
    if (h === 12) return "12:00 PM";
    if (h < 12) return `${h}:00 AM`;
    return `${h - 12}:00 PM`;
  }

  const heatmapCounts = Array(7).fill(0).map(() => Array(hourSlots.length).fill(0));

  appointments.forEach(app => {
    if (!app.start_time) return;
    const bogotaDate = new Date(new Date(app.start_time).getTime() - (5 * 3600 * 1000));
    const day = bogotaDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
    const hour = bogotaDate.getUTCHours();

    if (hour >= startHour && hour <= endHour) {
      const hourIdx = hour - startHour;
      if (day >= 0 && day < 7 && hourIdx >= 0 && hourIdx < hourSlots.length) {
        heatmapCounts[day][hourIdx]++;
      }
    }
  });

  const maxVal = Math.max(...heatmapCounts.flat()) || 1;
  const normalizedMatrix = heatmapCounts.map(row => row.map(val => val / maxVal));

  let maxCount = 0;
  let peakDayIdx = 0;
  let peakHour = startHour;

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < hourSlots.length; h++) {
      const count = heatmapCounts[d][h];
      if (count > maxCount) {
        maxCount = count;
        peakDayIdx = d;
        peakHour = hourSlots[h];
      }
    }
  }

  const dayNamesFull = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
  let peakInsight = "No hay suficientes servicios completados en este periodo para determinar el horario de mayor ocupación.";
  if (maxCount > 0) {
    peakInsight = `Los ${dayNamesFull[peakDayIdx]} a las ${formatHour12(peakHour)} representan tu pico máximo con ${maxCount} servicio${maxCount > 1 ? 's' : ''} atendido${maxCount > 1 ? 's' : ''}. Considera reforzar el staff en este horario.`;
  }

  const heatmapData = {
    hours: hourSlots.map(formatHourLabel),
    startHour,
    endHour,
    matrix: normalizedMatrix,
    counts: heatmapCounts,
    peakInsight
  };

  // 5. Top Products (from sales)
  const productMap: any = {};
  sales.forEach(sale => {
    const name = (sale as any).product?.name || "Producto";
    if (!productMap[name]) {
      productMap[name] = { name, sold: 0, revenue: 0 };
    }
    productMap[name].sold += sale.quantity;
    productMap[name].revenue += Number(sale.total_price);
  });
  const topProducts = Object.values(productMap)
    .sort((a: any, b: any) => b.sold - a.sold)
    .slice(0, 5);

  // 6. Top Clients (from appointments)
  const clientMap: any = {};
  appointments.forEach(app => {
    const name = (app as any).client?.full_name || "Cliente";
    if (!clientMap[name]) {
      clientMap[name] = { name, visits: 0, spent: 0 };
    }
    clientMap[name].visits += 1;
    clientMap[name].spent += Number(app.total_price);
  });
  const topClients = Object.values(clientMap)
    .sort((a: any, b: any) => b.spent - a.spent)
    .slice(0, 5)
    .map((c: any) => ({
      ...c,
      status: c.spent > 500000 ? "VIP Gold" : c.visits > 5 ? "Fiel" : "Recurrente"
    }));

  return {
    kpis: {
      totalServiceRevenue,
      totalProductRevenue,
      netProfit,
      avgTicket,
      retention
    },
    staffPerformance,
    paretoServices,
    heatmap: normalizedHeatmap,
    topProducts,
    topClients
  };
}
