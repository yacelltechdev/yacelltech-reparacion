"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Wrench, CheckCircle2, DollarSign, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Repair } from "@/lib/types";

const totalCosto = (r: Repair) =>
  (r.costo || 0) + (r.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) || 0);

function Trend({ today, yesterday }: { today: number; yesterday: number }) {
  if (yesterday === 0 && today === 0) return <span className="text-xs text-slate-400 flex items-center gap-1"><Minus className="h-3 w-3" /> Sin datos ayer</span>;
  if (yesterday === 0) return <span className="text-xs text-emerald-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Nuevo hoy</span>;
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0) return <span className="text-xs text-emerald-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> +{pct}% vs ayer</span>;
  if (pct < 0) return <span className="text-xs text-red-500 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> {pct}% vs ayer</span>;
  return <span className="text-xs text-slate-400 flex items-center gap-1"><Minus className="h-3 w-3" /> Igual que ayer</span>;
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function AdminDashboard() {
  const [data, setData] = useState<Repair[]>([]);
  const now = new Date();
  const [mesIdx, setMesIdx] = useState(now.getMonth());
  const [anio, setAnio] = useState(now.getFullYear());

  useEffect(() => {
    fetch("/api/repairs")
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];

  const recibidosHoy   = data.filter(r => r.fecha?.startsWith(today)).length;
  const recibidosAyer  = data.filter(r => r.fecha?.startsWith(yesterday)).length;

  const pendientes     = data.filter(r => r.status === "En reparación").length;
  const pendientesAyer = data.filter(r =>
    r.status === "En reparación" || (r.fecha_despacho?.startsWith(today))
  ).length - recibidosHoy; // aprox

  const listos         = data.filter(r => r.status === "Listo para entregar").length;

  const despachHoy  = data.filter(r => r.fecha_despacho?.startsWith(today) && r.status === "Entregado bueno");
  const despachAyer = data.filter(r => r.fecha_despacho?.startsWith(yesterday) && r.status === "Entregado bueno");
  const ingresosHoy  = despachHoy.reduce((s, r) => s + totalCosto(r), 0);
  const ingresosAyer = despachAyer.reduce((s, r) => s + totalCosto(r), 0);

  const cards = [
    {
      title: "Recibidos Hoy",
      value: recibidosHoy,
      icon: Smartphone,
      color: "text-blue-600", bg: "bg-blue-100",
      trend: <Trend today={recibidosHoy} yesterday={recibidosAyer} />
    },
    {
      title: "En Taller",
      value: pendientes,
      icon: Wrench,
      color: "text-amber-600", bg: "bg-amber-100",
      trend: <span className="text-xs text-slate-400">{listos > 0 ? `${listos} listo${listos > 1 ? "s" : ""} para entregar` : "Todos en reparación"}</span>
    },
    {
      title: "Listos para Entregar",
      value: listos,
      icon: CheckCircle2,
      color: "text-emerald-600", bg: "bg-emerald-100",
      trend: <span className="text-xs text-slate-400">{listos === 0 ? "Bandeja al día" : "Pendientes de despacho"}</span>
    },
    {
      title: "Ingresos Hoy",
      value: `RD$ ${ingresosHoy.toLocaleString()}`,
      icon: DollarSign,
      color: "text-indigo-600", bg: "bg-indigo-100",
      trend: <Trend today={ingresosHoy} yesterday={ingresosAyer} />
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel Principal</h1>
        <p className="text-slate-500">Resumen operativo de Yacelltech — {new Date().toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="mt-1">{card.trend}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen mensual por técnico */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Resumen Mensual por Técnico</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              if (mesIdx === 0) { setMesIdx(11); setAnio(a => a - 1); } else setMesIdx(m => m - 1);
            }}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-36 text-center">{MESES[mesIdx]} {anio}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              if (mesIdx === 11) { setMesIdx(0); setAnio(a => a + 1); } else setMesIdx(m => m + 1);
            }}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const prefix = `${anio}-${String(mesIdx + 1).padStart(2, "0")}`;
            const delMes = data.filter(r => r.fecha?.startsWith(prefix));
            const porTecnico = delMes.reduce<Record<string, { total: number; entregados: number }>>((acc, r) => {
              const t = r.tecnico || "Sin asignar";
              if (!acc[t]) acc[t] = { total: 0, entregados: 0 };
              acc[t].total++;
              if (r.status === "Entregado bueno") acc[t].entregados++;
              return acc;
            }, {});
            const entries = Object.entries(porTecnico).sort((a, b) => b[1].total - a[1].total);
            if (entries.length === 0) return (
              <p className="text-sm text-slate-400 italic text-center py-6">Sin registros en {MESES[mesIdx]} {anio}.</p>
            );
            return (
              <div className="divide-y">
                <div className="grid grid-cols-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <span>Técnico</span>
                  <span className="text-center">Recibidos</span>
                  <span className="text-center">Entregados</span>
                  <span className="text-center">Pendientes</span>
                </div>
                {entries.map(([tecnico, stats]) => (
                  <div key={tecnico} className="grid grid-cols-4 py-2.5 text-sm items-center">
                    <span className="font-medium capitalize">{tecnico}</span>
                    <span className="text-center font-bold text-blue-600">{stats.total}</span>
                    <span className="text-center font-bold text-emerald-600">{stats.entregados}</span>
                    <span className="text-center font-bold text-amber-600">{stats.total - stats.entregados}</span>
                  </div>
                ))}
                <div className="grid grid-cols-4 pt-2.5 text-sm font-bold text-slate-700">
                  <span>Total</span>
                  <span className="text-center text-blue-700">{delMes.length}</span>
                  <span className="text-center text-emerald-700">{delMes.filter(r => r.status === "Entregado bueno").length}</span>
                  <span className="text-center text-amber-700">{delMes.filter(r => r.status !== "Entregado bueno").length}</span>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Últimas 5 recepciones */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Últimas Recepciones del Día</CardTitle>
        </CardHeader>
        <CardContent>
          {data.filter(r => r.fecha?.startsWith(today)).length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-6">No se han recibido equipos hoy.</p>
          ) : (
            <div className="divide-y">
              {data.filter(r => r.fecha?.startsWith(today)).slice(0, 8).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-black text-primary text-xs mr-3">{r.codigo}</span>
                    <span className="font-medium">{r.cliente}</span>
                    <span className="text-slate-400 ml-2 text-xs">{r.marca} {r.modelo}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{r.tecnico}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      r.status === "En reparación"      ? "bg-amber-100 text-amber-700" :
                      r.status === "Listo para entregar"? "bg-emerald-100 text-emerald-700" :
                      r.status === "Entregado bueno"    ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
