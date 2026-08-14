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
    if (specificDate.includes(',')) {
      const [startStr, endStr] = specificDate.split(',');
      const [sy, sm, sd] = startStr.split('-').map(Number);
      startDate = new Date(Date.UTC(sy, sm - 1, sd, 5, 0, 0, 0));
      const [ey, em, ed] = endStr.split('-').map(Number);
      endDate = new Date(Date.UTC(ey, em - 1, ed + 1, 4, 59, 59, 999));
    } else {
      const [y, m, d] = specificDate.split('-').map(Number);
      startDate = new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
      endDate = new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999));
    }
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
  } // close else (specificDate)

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
  const tenantData = (tenantRes.data || {}) as Record<string, any>;
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

  const dayNames: ("DOM"|"LUN"|"MAR"|"MIÉ"|"JUE"|"VIE"|"SÁB")[] = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  const numActiveStaff = staff.length || 1; 

  const heatmapMatrix = Array(7).fill(0).map((_, d) => 
    hourSlots.map(h => ({
      dayIndex: d,
      dayName: dayNames[d],
      hour: formatHourLabel(h),
      hour24: h,
      serviciosAtendidos: 0,
      capacidadMaxima: numActiveStaff,
      porcentajeOcupacion: 0,
      ingresosTotales: 0,
      minutosTotales: 0
    }))
  );

  appointments.forEach(app => {
    if (!app.start_time) return;
    const bogotaDate = new Date(new Date(app.start_time).getTime() - (5 * 3600 * 1000));
    const day = bogotaDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
    const hour = bogotaDate.getUTCHours();

    if (hour >= startHour && hour <= endHour) {
      const hourIdx = hour - startHour;
      if (day >= 0 && day < 7 && hourIdx >= 0 && hourIdx < hourSlots.length) {
        const cell = heatmapMatrix[day][hourIdx];
        cell.serviciosAtendidos++;
        cell.ingresosTotales += Number(app.total_price || 0);
        
        const appServices = app.appointment_services?.map((as: any) => as.services).filter(Boolean) || [];
        if (appServices.length > 0) {
          appServices.forEach((s: any) => {
            cell.minutosTotales += Number(s.duration || 30);
          });
        } else {
          cell.minutosTotales += Number(app.service?.duration || 30);
        }
      }
    }
  });

  let maxServicios = 0;
  let peakCell = heatmapMatrix[0][0];

  heatmapMatrix.forEach(row => {
    row.forEach(cell => {
      // Calculate derived metrics
      cell.porcentajeOcupacion = Math.min(100, Math.round((cell.serviciosAtendidos / cell.capacidadMaxima) * 100));
      
      if (cell.serviciosAtendidos > maxServicios) {
        maxServicios = cell.serviciosAtendidos;
        peakCell = cell;
      }
    });
  });

  const dayNamesFull = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
  let peakInsight = "No hay suficientes servicios completados en este periodo para determinar el horario de mayor ocupación.";
  if (maxServicios > 0) {
    const staffSugerido = Math.max(1, Math.ceil((peakCell.minutosTotales / 60) * 1.2)); // Suggest 20% buffer
    peakInsight = `Tip BI: Los ${dayNamesFull[peakCell.dayIndex]} a las ${formatHour12(peakCell.hour24)} representan tu pico máximo con ${peakCell.serviciosAtendidos} servicios atendidos (${peakCell.porcentajeOcupacion}% de ocupación). Te recomendamos contar con mínimo ${staffSugerido} barberos activos en esta franja.`;
  }

  const heatmapData = {
    hours: hourSlots.map(formatHourLabel),
    startHour,
    endHour,
    cells: heatmapMatrix,
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
    heatmap: heatmapData,
    topProducts,
    topClients
  };
}

export interface MonthlyFinancialRecord {
  month: string;
  year: number;
  ingresosServicios: number;
  ingresosProductos: number;
  comisionesBarberos: number;
  gastosOperativos: number;
  totalIngresos: number;
  totalEgresos: number;
  gananciaNeta: number;
  margenPorcentaje: number;
  crecimientoMoM: number;
}

export async function getFinancialEvolution(year: number): Promise<MonthlyFinancialRecord[] | null> {
  const { tenantId } = await getSession();
  if (!tenantId) return null;

  const adminSupabase = await createAdminClient();

  const startDate = new Date(Date.UTC(year, 0, 1, 5, 0, 0, 0));
  const endDate = new Date(Date.UTC(year + 1, 0, 1, 4, 59, 59, 999));

  const [appointmentsRes, salesRes, expensesRes, staffRes] = await Promise.all([
    adminSupabase
      .from("appointments")
      .select("start_time, total_price, staff_id")
      .eq("tenant_id", tenantId)
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString())
      .eq("status", "completed"),
    adminSupabase
      .from("product_sales")
      .select("created_at, total_price")
      .eq("tenant_id", tenantId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString()),
    adminSupabase
      .from("expenses")
      .select("created_at, amount")
      .eq("tenant_id", tenantId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString()),
    adminSupabase
      .from("tenant_staff")
      .select("id, commission_rate, daily_commission_rates")
      .eq("tenant_id", tenantId)
  ]);

  const appointments = (appointmentsRes.data as any[]) || [];
  const sales = (salesRes.data as any[]) || [];
  const expenses = (expensesRes.data as any[]) || [];
  const staff = (staffRes.data as any[]) || [];

  const staffMap = new Map(staff.map(s => [s.id, s]));

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  const monthlyData: Record<number, MonthlyFinancialRecord> = {};
  for (let m = 0; m < 12; m++) {
    monthlyData[m] = {
      month: monthNames[m],
      year,
      ingresosServicios: 0,
      ingresosProductos: 0,
      comisionesBarberos: 0,
      gastosOperativos: 0,
      totalIngresos: 0,
      totalEgresos: 0,
      gananciaNeta: 0,
      margenPorcentaje: 0,
      crecimientoMoM: 0
    };
  }

  const getMonthFromUTC = (isoString: string) => {
    const d = new Date(new Date(isoString).getTime() - (5 * 3600 * 1000));
    return d.getUTCMonth();
  };

  appointments.forEach(app => {
    if (!app.start_time) return;
    const m = getMonthFromUTC(app.start_time);
    const price = Number(app.total_price || 0);
    monthlyData[m].ingresosServicios += price;

    const s = staffMap.get(app.staff_id);
    let commission = 0;
    if (s) {
      const d = new Date(new Date(app.start_time).getTime() - (5 * 3600 * 1000));
      const dayOfWeek = d.getUTCDay();
      let rate = Number(s.commission_rate ?? 50);
      if (s.daily_commission_rates && typeof s.daily_commission_rates === 'object') {
        const rates = s.daily_commission_rates as Record<string, number>;
        if (rates[dayOfWeek] !== undefined && rates[dayOfWeek] !== null) {
          rate = Number(rates[dayOfWeek]);
        }
      }
      commission = price * (rate / 100);
    }
    monthlyData[m].comisionesBarberos += commission;
  });

  sales.forEach(sale => {
    if (!sale.created_at) return;
    const m = getMonthFromUTC(sale.created_at);
    monthlyData[m].ingresosProductos += Number(sale.total_price || 0);
  });

  expenses.forEach(exp => {
    if (!exp.created_at) return;
    const m = getMonthFromUTC(exp.created_at);
    monthlyData[m].gastosOperativos += Number(exp.amount || 0);
  });

  const result: MonthlyFinancialRecord[] = [];
  let prevGanancia = 0;

  for (let m = 0; m < 12; m++) {
    const d = monthlyData[m];
    d.totalIngresos = d.ingresosServicios + d.ingresosProductos;
    d.totalEgresos = d.comisionesBarberos + d.gastosOperativos;
    d.gananciaNeta = d.totalIngresos - d.totalEgresos;
    d.margenPorcentaje = d.totalIngresos > 0 ? (d.gananciaNeta / d.totalIngresos) * 100 : 0;
    
    if (m > 0 && prevGanancia !== 0) {
      d.crecimientoMoM = ((d.gananciaNeta - prevGanancia) / Math.abs(prevGanancia)) * 100;
    } else if (m > 0 && prevGanancia === 0 && d.gananciaNeta > 0) {
      d.crecimientoMoM = 100;
    } else if (m > 0 && prevGanancia === 0 && d.gananciaNeta < 0) {
      d.crecimientoMoM = -100;
    }
    
    prevGanancia = d.gananciaNeta;
    result.push(d);
  }

  const currentYear = new Date().getFullYear();
  let finalResult = result;
  
  if (year === currentYear) {
    const currentMonth = new Date(new Date().getTime() - (5 * 3600 * 1000)).getUTCMonth();
    finalResult = result.slice(0, currentMonth + 1);
  }

  // Filtrar solo los meses que tengan movimientos (ingresos o egresos)
  return finalResult.filter(r => r.totalIngresos > 0 || r.totalEgresos > 0);
}
