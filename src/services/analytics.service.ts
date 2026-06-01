import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function getBIAnalytics(range: string = "month", specificDate?: string, staffId?: string) {
  const { tenantId } = await getSession();
  if (!tenantId) return null;

  const adminSupabase = await createAdminClient();

  // Define date range
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  
  if (specificDate) {
    startDate = new Date(specificDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(specificDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (range === "week") {
    startDate.setDate(now.getDate() - 7);
  } else if (range === "month") {
    startDate.setMonth(now.getMonth() - 1);
  } else if (range === "today") {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default to month if not specified or unknown
    startDate.setMonth(now.getMonth() - 1);
  }

  const [appointmentsRes, salesRes, staffRes] = await Promise.all([
    adminSupabase
      .from("appointments")
      .select("*, staff:tenant_staff(id, profiles(full_name)), service:services(name), client:clients(full_name)")
      .eq("tenant_id", tenantId)
      .match(staffId ? { staff_id: staffId } : {})
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString())
      .neq("status", "cancelled"),
    adminSupabase
      .from("product_sales")
      .select("*, product:products(name)")
      .eq("tenant_id", tenantId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString()),
    adminSupabase
      .from("tenant_staff")
      .select("id, role, profiles(full_name)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .match(staffId ? { id: staffId } : {}),
  ]);

  const appointments = (appointmentsRes.data as any[]) || [];
  const sales = (salesRes.data as any[]) || [];
  const staff = (staffRes.data as any[]) || [];

  // 1. KPIs (Exclusively Services for some metrics as requested)
  const totalServiceRevenue = appointments.reduce((sum, app) => sum + Number(app.total_price), 0);
  const totalProductRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_price), 0);
  
  // Ganancia Neta y Ticket Promedio solo de servicios
  const netProfit = totalServiceRevenue * 0.6; // Estimación basada solo en servicios
  const avgTicket = appointments.length > 0 ? totalServiceRevenue / appointments.length : 0;

  // Tasa de Retención (Clientes que han venido más de una vez)
  const clientVisits: any = {};
  appointments.forEach(app => {
    clientVisits[app.client_id] = (clientVisits[app.client_id] || 0) + 1;
  });
  const totalClients = Object.keys(clientVisits).length;
  const repeatClients = Object.values(clientVisits).filter((v: any) => v > 1).length;
  const retention = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;

  // 2. Staff Performance
  const staffPerformance = staff.map(member => {
    const memberApps = appointments.filter(app => app.staff_id === member.id);
    const memberRevenue = memberApps.reduce((sum, app) => sum + Number(app.total_price), 0);
    return {
      name: (member as any).profiles?.full_name || "Staff",
      revenue: memberRevenue,
      sales: memberApps.length,
      commissions: memberRevenue * 0.5, // Mock commission logic for now
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // 3. Pareto Services
  const serviceMap: any = {};
  appointments.forEach(app => {
    const name = (app as any).service?.name || "Otro";
    serviceMap[name] = (serviceMap[name] || 0) + 1;
  });
  const paretoServices = Object.entries(serviceMap)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count);

  // 4. Heatmap (Day of week vs Hour)
  // 0-6 (Sun-Sat), Hours (8-20)
  const heatmap = Array(7).fill(0).map(() => Array(7).fill(0));
  appointments.forEach(app => {
    const date = new Date(app.start_time);
    const day = date.getDay(); // 0 is Sunday
    const hour = date.getHours();
    
    // Map hours to our slots (8, 10, 12, 14, 16, 18, 20)
    const hourIdx = Math.floor((hour - 8) / 2);
    if (day >= 0 && day < 7 && hourIdx >= 0 && hourIdx < 7) {
      heatmap[day][hourIdx]++;
    }
  });

  // Normalize heatmap (0 to 1)
  const maxVal = Math.max(...heatmap.flat()) || 1;
  const normalizedHeatmap = heatmap.map(row => row.map(val => val / maxVal));

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
