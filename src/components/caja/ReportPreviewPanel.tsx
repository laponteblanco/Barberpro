"use client";

import {
  FileText,
  Download,
  Coins,
  Smartphone,
  User,
  Receipt,
  TrendingUp,
  Wallet,
  ChevronDown,
  ChevronUp,
  Scissors,
  Landmark,
  ArrowDownLeft,
  CreditCard,
  ArrowUpRight,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatTime } from "@/lib/utils";
import type { ActiveSessionDetails } from "@/services/cash.service";

interface ReportPreviewPanelProps {
  session: ActiveSessionDetails;
  compiledBarbersBreakdown: any[];
  tenantName?: string;
  onDownload?: () => void;
  isDownloading?: boolean;
}

function SectionCard({
  title,
  accentClass,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  accentClass: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-950/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentClass}`}>
            {icon}
          </span>
          <span className="text-sm font-black text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-white/5 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = "text-white",
  bold = false,
  sub = false,
}: {
  label: React.ReactNode;
  value: string;
  valueClass?: string;
  bold?: boolean;
  sub?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0 ${
        sub ? "pl-4" : ""
      }`}
    >
      <span className={`text-xs ${sub ? "text-zinc-500" : "text-zinc-400"} ${bold ? "font-bold text-zinc-200" : "font-medium"}`}>
        {label}
      </span>
      <span className={`text-xs font-black tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function getPaymentMethodLabel(appt: any): string {
  const method = appt.payment_method;
  if (method === "cash") return "Efectivo";
  if (method === "card") return "Tarjeta";
  if (method === "nequi") return "Nequi";
  if (method === "daviplata") return "Daviplata";
  if (method === "transfer") return "Transferencia";
  if (method === "split") {
    const cash = Number(appt.split_cash_amount || 0);
    const dig = Number(appt.split_digital_amount || 0);
    const digMethod = appt.split_digital_method || "Digital";
    const cleanDigMethod = digMethod === "card" ? "Tarjeta" : 
                           digMethod === "nequi" ? "Nequi" : 
                           digMethod === "daviplata" ? "Daviplata" : 
                           digMethod === "transfer" ? "Transferencia" : digMethod;
    return `Mixto (${formatCurrency(cash)} Efe. / ${formatCurrency(dig)} ${cleanDigMethod})`;
  }
  return method || "Otro";
}

export function ReportPreviewPanel({
  session,
  compiledBarbersBreakdown,
  tenantName = "BarberOS",
  onDownload,
  isDownloading = false,
}: ReportPreviewPanelProps) {
  const totalServices = compiledBarbersBreakdown.reduce(
    (sum, b) => sum + (b.appointments_total_count ?? (b.appointments_count || 0)),
    0
  );

  const totalBarberCommission = compiledBarbersBreakdown.reduce(
    (sum, b) => sum + (b.total_commission || 0),
    0
  );

  const totalExpenses = session.expenses_cash_total + session.expenses_digital_total;
  const barbershopProfit = (session.appointments_total - totalBarberCommission) + session.sales_total - totalExpenses;

  return (
    <div className="glass-card rounded-[32px] p-8 border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-primary" />
            Vista Previa del Informe de Cierre
          </h3>
          <p className="text-zinc-400 text-xs mt-1 font-medium">
            Verifica todos los números antes de generar y descargar el PDF oficial.
          </p>
        </div>

        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          id="btn-download-report-preview"
          className="shrink-0 h-12 px-6 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:pointer-events-none uppercase tracking-wider"
        >
          {isDownloading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generando...
            </span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Descargar PDF Ahora
            </>
          )}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total Servicios",
            value: `${totalServices}`,
            icon: <Scissors className="w-4 h-4" />,
            color: "text-primary bg-primary/10",
          },
          {
            label: "Ingresos Totales",
            value: formatCurrency(session.appointments_total + session.sales_total),
            icon: <TrendingUp className="w-4 h-4" />,
            color: "text-emerald-400 bg-emerald-500/10",
          },
          {
            label: "Efectivo Esperado",
            value: formatCurrency(session.expected_cash),
            icon: <Coins className="w-4 h-4" />,
            color: "text-emerald-400 bg-emerald-500/10",
          },
          {
            label: "Digital Esperado",
            value: formatCurrency(session.expected_digital),
            icon: <Smartphone className="w-4 h-4" />,
            color: "text-cyan-400 bg-cyan-500/10",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl bg-zinc-950/60 border border-white/5 p-4 flex flex-col gap-2"
          >
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.color}`}>
              {kpi.icon}
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                {kpi.label}
              </p>
              <p className="text-base font-black text-white mt-0.5">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sección 1: Resumen de Servicios ─────────────────────────────────── */}
      <SectionCard
        title="1. Resumen Global de Servicios e Ingresos"
        accentClass="bg-primary/10 text-primary"
        icon={<TrendingUp className="w-4 h-4" />}
      >
        <div className="space-y-0 mt-3">
          <Row label="Total de servicios realizados" value={`${totalServices} servicio(s)`} />
          <Row label="Ingresos por citas (Bruto)" value={formatCurrency(session.appointments_total)} />
          <Row label="Pago total a barberos (Comisiones)" value={`−${formatCurrency(totalBarberCommission)}`} valueClass="text-rose-400" />
          <Row
            label={<span className="font-bold text-primary">SUBTOTAL (Servicios − Comisiones)</span>}
            value={formatCurrency(session.appointments_total - totalBarberCommission)}
            valueClass="text-primary"
            bold
          />
          <Row label="Ingresos por venta de productos" value={formatCurrency(session.sales_total)} />
          <Row
            label={<span className="font-bold text-primary">SUBTOTAL ACUMULADO (Servicios Netos + Productos)</span>}
            value={formatCurrency((session.appointments_total - totalBarberCommission) + session.sales_total)}
            valueClass="text-primary"
            bold
          />
          <div className="border-t border-white/5 my-2 pt-2 space-y-0">
            <Row label="Gastos de caja (Efectivo + Digital)" value={`−${formatCurrency(totalExpenses)}`} valueClass="text-rose-400" />
            <Row
              label={<span className="font-black text-white">GANANCIA NETA DE LA BARBERÍA</span>}
              value={formatCurrency(barbershopProfit)}
              valueClass="text-emerald-400"
              bold
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Sección 2: Ingresos por Método de Pago ──────────────────────────── */}
      <SectionCard
        title="2. Ingresos por Método de Pago"
        accentClass="bg-emerald-500/10 text-emerald-400"
        icon={<Wallet className="w-4 h-4" />}
      >
        <div className="space-y-0 mt-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 pb-2">
            Efectivo Físico
          </p>
          <Row label="Citas en efectivo" value={formatCurrency(session.appointments_cash_total)} valueClass="text-emerald-400" sub />
          <Row label="Ventas de productos" value={formatCurrency(session.sales_total)} valueClass="text-emerald-400" sub />
          <Row
            label={<span className="font-bold text-zinc-200">Subtotal Efectivo</span>}
            value={formatCurrency(session.appointments_cash_total + session.sales_total)}
            valueClass="text-emerald-400"
            bold
          />

          <div className="pt-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400 pb-2">
              Dinero Digital
            </p>
          </div>
          <Row
            label={<span className="flex items-center gap-1.5"><CreditCard className="w-3 h-3 text-cyan-400" /> Tarjeta</span>}
            value={formatCurrency(session.digital_breakdown.card)}
            valueClass="text-white"
            sub
          />
          <Row
            label={<span className="flex items-center gap-1.5"><Smartphone className="w-3 h-3 text-indigo-400" /> Nequi</span>}
            value={formatCurrency(session.digital_breakdown.nequi)}
            valueClass="text-white"
            sub
          />
          <Row
            label={<span className="flex items-center gap-1.5"><Smartphone className="w-3 h-3 text-red-400" /> Daviplata</span>}
            value={formatCurrency(session.digital_breakdown.daviplata)}
            valueClass="text-white"
            sub
          />
          <Row
            label={<span className="flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3 text-emerald-400" /> Transferencia</span>}
            value={formatCurrency(session.digital_breakdown.transfer)}
            valueClass="text-white"
            sub
          />
          <Row
            label={<span className="font-bold text-zinc-200">Subtotal Digital</span>}
            value={formatCurrency(session.appointments_digital_total)}
            valueClass="text-cyan-400"
            bold
          />
        </div>
      </SectionCard>

      {/* ── Sección 3: Liquidación de Barberos ──────────────────────────────── */}
      <SectionCard
        title="3. Liquidación Diaria de Barberos"
        accentClass="bg-cyan-500/10 text-cyan-400"
        icon={<User className="w-4 h-4" />}
        defaultOpen={compiledBarbersBreakdown.length > 0}
      >
        {compiledBarbersBreakdown.length === 0 ? (
          <p className="text-zinc-500 text-xs font-medium mt-3">
            No hay barberos con movimientos en este turno.
          </p>
        ) : (
          <div className="space-y-6 mt-3">
            {compiledBarbersBreakdown.map((barber) => {
              const totalSvcs = barber.appointments_total_count ?? (barber.appointments_count || 0);
              const totalRevenue = (barber.total_cash || 0) + (barber.total_digital || 0);
              return (
                <div key={barber.id} className="rounded-xl bg-zinc-950/60 border border-white/5 overflow-hidden">
                  {/* Barber header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/40 border-b border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-black text-zinc-300">
                      {barber.name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{barber.name}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                        {totalSvcs} servicios · Comisión {barber.commission_rate || 0}%
                      </p>
                    </div>
                    {barber.is_verified && (
                      <div className="ml-auto flex items-center gap-1 h-6 px-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">
                        <CheckCircle2 className="w-3 h-3" /> Verificado
                      </div>
                    )}
                  </div>

                  {/* Barber rows */}
                  <div className="px-4 py-2">
                    <Row label="Servicios realizados (efectivo)" value={(barber.appointments_count || 0).toString()} />
                    <Row label="Servicios realizados (digital)" value={(barber.appointments_digital_count || 0).toString()} />
                    <Row label="Total servicios del turno" value={totalSvcs.toString()} />
                    <Row label="Recaudo por Citas (Bruto)" value={formatCurrency(totalRevenue)} />
                    <Row label="Comisión por Servicios" value={formatCurrency(barber.total_commission || 0)} valueClass="text-primary" />
                    
                    {(barber.total_payments || 0) > 0 && (
                      <div className="mt-1">
                        <Row
                          label={<span className="flex items-center gap-1 text-emerald-400"><ArrowDownLeft className="w-3 h-3" /> Abonos devueltos (+)</span>}
                          value={`+${formatCurrency(barber.total_payments)}`}
                          valueClass="text-emerald-400"
                        />
                      </div>
                    )}

                    <div className="border-t border-white/5 my-2 pt-2">
                      <Row
                        label={<span className="flex items-center gap-1 text-rose-400"><ArrowUpRight className="w-3 h-3" /> Vales / Adelantos Total (-)</span>}
                        value={`−${formatCurrency(barber.total_advances || 0)}`}
                        valueClass="text-rose-400"
                      />
                      <Row
                        label={<span className="flex items-center gap-1 text-rose-400"><ShoppingBag className="w-3 h-3" /> Productos a Cargo / Consumo Barbero (-)</span>}
                        value={`−${formatCurrency((barber.total_product_revenue || 0) + (barber.total_consignments || 0))}`}
                        valueClass="text-rose-400"
                      />
                      <div className="mt-1">
                        <Row
                          label={<span className="font-bold text-rose-500">TOTAL DEDUCCIONES (-)</span>}
                          value={`−${formatCurrency((barber.total_advances || 0) + (barber.total_product_revenue || 0) + (barber.total_consignments || 0))}`}
                          valueClass="text-rose-500"
                          bold
                        />
                      </div>
                    </div>

                    {/* Fund discrimination */}
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                      <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5" /> PAGO NETO AL BARBERO (Caja Física)
                        </span>
                        <span className="text-xs font-black text-emerald-400 tabular-nums">
                          {formatCurrency(barber.net_payout_cash ?? barber.payout_cash ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" /> PAGO NETO AL BARBERO (Fondo Digital)
                        </span>
                        <span className="text-xs font-black text-cyan-400 tabular-nums">
                          {formatCurrency(barber.net_payout_digital ?? barber.payout_digital ?? 0)}
                        </span>
                      </div>
                      <div className="mt-2 text-center pt-2">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Total Neto a Liquidar al Barbero</p>
                        <p className="text-2xl font-black text-primary">
                          {formatCurrency(
                            (barber.net_payout_cash ?? barber.payout_cash ?? 0) +
                            (barber.net_payout_digital ?? barber.payout_digital ?? 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detalle Desgloses */}
                  <div className="border-t border-white/5 bg-zinc-950/40 p-4 space-y-4">
                    
                    {/* A. Desglose Servicios */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                        <Scissors className="w-3 h-3" /> Desglose de Servicios
                      </h4>
                      {Object.keys(barber.services_breakdown || {}).length > 0 ? (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[9px] text-zinc-600">
                              <th className="py-1 font-semibold">Servicio</th>
                              <th className="py-1 font-semibold text-center">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.02]">
                            {Object.entries(barber.services_breakdown || {}).map(([name, qty]) => (
                              <tr key={name}>
                                <td className="py-1.5 text-zinc-400">{name}</td>
                                <td className="py-1.5 text-center font-bold text-zinc-300">{qty as React.ReactNode}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-zinc-600 font-medium">Sin registros</p>
                      )}
                    </div>

                    {/* B. Desglose Productos */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> Desglose de Productos Cobrados / A Cargo del Barbero
                      </h4>
                      {(barber.products_breakdown || []).length > 0 ? (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[9px] text-zinc-600">
                              <th className="py-1 font-semibold">Producto</th>
                              <th className="py-1 font-semibold text-center">Cant</th>
                              <th className="py-1 font-semibold text-right">Costo Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.02]">
                            {barber.products_breakdown.map((prod: any, idx: number) => (
                              <tr key={idx}>
                                <td className="py-1.5 text-zinc-400 truncate max-w-[100px]" title={prod.name}>{prod.name}</td>
                                <td className="py-1.5 text-center text-zinc-300">{prod.quantity}</td>
                                <td className="py-1.5 text-right font-bold text-rose-400">−{formatCurrency(prod.unit_price * prod.quantity)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-zinc-600 font-medium">Sin registros</p>
                      )}
                    </div>

                    {/* C. Desglose Vales */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> Desglose de Vales y Adelantos
                      </h4>
                      {(barber.advances_details || []).length > 0 ? (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[9px] text-zinc-600">
                              <th className="py-1 font-semibold">Hora/Detalle</th>
                              <th className="py-1 font-semibold text-center">Medio</th>
                              <th className="py-1 font-semibold text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.02]">
                            {barber.advances_details.map((vale: any, idx: number) => (
                              <tr key={idx}>
                                <td className="py-1.5 text-zinc-400 truncate max-w-[120px]" title={vale.description}>
                                  {formatTime(vale.time)} - {vale.description}
                                </td>
                                <td className="py-1.5 text-center text-zinc-500 text-[10px]">{vale.method === "cash" ? "Efectivo" : "Digital"}</td>
                                <td className="py-1.5 text-right font-bold text-rose-400">−{formatCurrency(vale.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-zinc-600 font-medium">Sin registros</p>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Sección 4: Gastos Operativos ─────────────────────────────────────── */}
      <SectionCard
        title="4. Gastos Operativos del Día"
        accentClass="bg-rose-500/10 text-rose-400"
        icon={<Receipt className="w-4 h-4" />}
        defaultOpen={session.expenses.length > 0}
      >
        {session.expenses.length === 0 ? (
          <p className="text-zinc-500 text-xs font-medium mt-3">
            No se registraron gastos operativos en este período.
          </p>
        ) : (
          <div className="mt-3 space-y-0">
            {session.expenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black ${
                      exp.payment_method === "cash"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-cyan-500/10 text-cyan-400"
                    }`}
                  >
                    {exp.payment_method === "cash" ? "💵" : "💳"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{exp.category}</p>
                    {exp.description && (
                      <p className="text-[9px] text-zinc-500 truncate">{exp.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs font-black text-rose-400">−{formatCurrency(exp.amount)}</p>
                  <p
                    className={`text-[9px] font-bold ${
                      exp.payment_method === "cash" ? "text-emerald-500" : "text-cyan-500"
                    }`}
                  >
                    {exp.payment_method === "cash" ? "Efectivo" : "Digital"}
                  </p>
                </div>
              </div>
            ))}

            {/* Expense totals */}
            <div className="pt-3 space-y-1">
              <Row
                label={<span className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-emerald-400" /> Total gastos en efectivo</span>}
                value={`−${formatCurrency(session.expenses_cash_total)}`}
                valueClass="text-rose-400"
                bold
              />
              <Row
                label={<span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-cyan-400" /> Total gastos en digital</span>}
                value={`−${formatCurrency(session.expenses_digital_total)}`}
                valueClass="text-rose-400"
                bold
              />
              <Row
                label={<span className="font-black text-zinc-200">TOTAL EGRESOS</span>}
                value={`−${formatCurrency(session.expenses_total)}`}
                valueClass="text-rose-400"
                bold
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Sección 5: Balance Final ──────────────────────────────────────────── */}
      <SectionCard
        title="5. Balance Final — Cuadre de Caja"
        accentClass="bg-amber-500/10 text-amber-400"
        icon={<Wallet className="w-4 h-4" />}
      >
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cash column */}
          <div className="rounded-xl bg-zinc-950/60 border border-emerald-500/10 p-4 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 pb-1">
              Fondo Físico (Efectivo)
            </p>
            <div className="space-y-0">
              <Row label="Base inicial" value={`+${formatCurrency(session.opening_balance)}`} valueClass="text-zinc-300" sub />
              <Row label="Ingresos en efectivo" value={`+${formatCurrency(session.appointments_cash_total)}`} valueClass="text-emerald-400" sub />
              <Row label="Ventas productos" value={`+${formatCurrency(session.sales_total)}`} valueClass="text-emerald-400" sub />
              <Row label="Gastos en efectivo" value={`−${formatCurrency(session.expenses_cash_total)}`} valueClass="text-rose-400" sub />
              <Row label="Vales a barberos (cash)" value={`−${formatCurrency(session.ledger_advances_cash || 0)}`} valueClass="text-rose-400" sub />
              <Row label="Devoluciones a caja" value={`+${formatCurrency(session.ledger_payments_cash || 0)}`} valueClass="text-emerald-400" sub />
            </div>
            <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400">= EFECTIVO ESPERADO</span>
              <span className="text-base font-black text-emerald-400 tabular-nums">
                {formatCurrency(session.expected_cash)}
              </span>
            </div>
          </div>

          {/* Digital column */}
          <div className="rounded-xl bg-zinc-950/60 border border-cyan-500/10 p-4 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400 pb-1">
              Fondo Digital (Consignaciones)
            </p>
            <div className="space-y-0">
              <Row label="Ingresos digitales" value={`+${formatCurrency(session.appointments_digital_total)}`} valueClass="text-cyan-400" sub />
              <Row label="Gastos digitales" value={`−${formatCurrency(session.expenses_digital_total)}`} valueClass="text-rose-400" sub />
              <Row label="Vales a barberos (digital)" value={`−${formatCurrency(session.ledger_advances_digital || 0)}`} valueClass="text-rose-400" sub />
              <Row label="Devoluciones digitales" value={`+${formatCurrency(session.ledger_payments_digital || 0)}`} valueClass="text-emerald-400" sub />
            </div>
            <div className="pt-2 border-t border-cyan-500/20 flex items-center justify-between">
              <span className="text-xs font-black text-cyan-400">= DIGITAL ESPERADO</span>
              <span className="text-base font-black text-cyan-400 tabular-nums">
                {formatCurrency(session.expected_digital)}
              </span>
            </div>
          </div>
        </div>

        {/* Grand total */}
        <div className="mt-4 rounded-2xl bg-zinc-950 border border-white/10 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Total Consolidado de Caja
            </p>
            <p className="text-[9px] text-zinc-600 mt-0.5">Efectivo + Digital</p>
          </div>
          <span className="text-2xl font-black text-primary tabular-nums">
            {formatCurrency(session.expected_balance)}
          </span>
        </div>
      </SectionCard>

      {/* ── Sección 6: Registro Detallado de Transacciones ─────────────────── */}
      <SectionCard
        title="6. Registro Detallado de Transacciones"
        accentClass="bg-indigo-500/10 text-indigo-400"
        icon={<Receipt className="w-4 h-4" />}
        defaultOpen={false}
      >
        <div className="mt-3 overflow-x-auto">
          {(!session.appointments || session.appointments.length === 0) ? (
            <p className="text-zinc-500 text-xs font-medium mt-3">
              No se registraron transacciones en este período.
            </p>
          ) : (
            <div className="space-y-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    <th className="py-2">Hora</th>
                    <th className="py-2">Barbero</th>
                    <th className="py-2">Cliente</th>
                    <th className="py-2">Servicio</th>
                    <th className="py-2 text-right">Monto</th>
                    <th className="py-2 text-right">Medio de Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {session.appointments.map((appt: any) => {
                    const timeStr = appt.start_time ? formatTime(appt.start_time) : "—";
                    const barberName = appt.staff?.profiles?.full_name || "—";
                    const clientName = appt.client?.full_name || "—";
                    const serviceName = appt.service?.name || "—";
                    const amount = formatCurrency(appt.total_price || 0);
                    const paymentMethodLabel = getPaymentMethodLabel(appt);
                    
                    return (
                      <tr key={appt.id} className="text-zinc-300 hover:bg-white/[0.01]">
                        <td className="py-2.5 font-medium tabular-nums">{timeStr}</td>
                        <td className="py-2.5 font-bold text-white">{barberName}</td>
                        <td className="py-2.5">{clientName}</td>
                        <td className="py-2.5 max-w-[150px] truncate" title={serviceName}>{serviceName}</td>
                        <td className="py-2.5 text-right font-black text-emerald-400 tabular-nums">{amount}</td>
                        <td className="py-2.5 text-right font-semibold text-zinc-400">{paymentMethodLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
