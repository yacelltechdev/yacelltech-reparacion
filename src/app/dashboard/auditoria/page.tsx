"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Repair } from "@/lib/types";

const STORAGE_KEY = "yacell_auditoria";

function loadReviewed(): Record<string, Record<string, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveReviewed(data: Record<string, Record<string, boolean>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function codeNum(codigo: string) {
  return parseInt(codigo.replace("REP-", ""), 10);
}

function statusColor(status: string) {
  if (status === "Entregado bueno") return "bg-emerald-100 text-emerald-800";
  if (status === "Entregado malo") return "bg-orange-100 text-orange-800";
  if (status === "Listo para entregar") return "bg-blue-100 text-blue-800";
  if (status === "No se pudo reparar") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

export default function AuditoriaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [reparaciones, setReparaciones] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    setReviewed(loadReviewed());
  }, []);

  const cargar = useCallback(async (f: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/repairs?desde=${f}&hasta=${f}`);
      const data = await res.json();
      const sorted = (Array.isArray(data) ? data : data.data || []).sort(
        (a: Repair, b: Repair) => codeNum(a.codigo) - codeNum(b.codigo)
      );
      setReparaciones(sorted);
    } catch {
      setReparaciones([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar(fecha);
  }, [fecha, cargar]);

  const toggleRevisada = (codigo: string) => {
    setReviewed(prev => {
      const diaActual = { ...(prev[fecha] || {}) };
      diaActual[codigo] = !diaActual[codigo];
      const next = { ...prev, [fecha]: diaActual };
      saveReviewed(next);
      return next;
    });
  };

  const diaReviewed = reviewed[fecha] || {};
  const revisadas = reparaciones.filter(r => diaReviewed[r.codigo]).length;
  const pendientes = reparaciones.length - revisadas;

  // Detectar brechas en la secuencia de códigos del día
  const brechas: number[] = [];
  for (let i = 0; i < reparaciones.length - 1; i++) {
    const curr = codeNum(reparaciones[i].codigo);
    const next = codeNum(reparaciones[i + 1].codigo);
    if (next - curr > 1) {
      for (let m = curr + 1; m < next; m++) brechas.push(m);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auditoría de Facturas</h1>
        <p className="text-slate-500 text-sm">Revisa las facturas del día y marca las que ya verificaste</p>
      </div>

      {/* Selector de fecha */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Fecha a revisar:</label>
            <Input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-44"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      {!loading && reparaciones.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-800">{reparaciones.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total del día</p>
          </div>
          <div className="rounded-xl border bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-2xl font-black text-emerald-600">{revisadas}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Revisadas
            </p>
          </div>
          <div className="rounded-xl border bg-white px-4 py-3 text-center shadow-sm">
            <p className={`text-2xl font-black ${pendientes > 0 ? "text-amber-500" : "text-slate-300"}`}>{pendientes}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" /> Pendientes
            </p>
          </div>
        </div>
      )}

      {/* Alerta de brechas */}
      {!loading && brechas.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {brechas.length} código(s) no pertenecen a este día
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Faltan en la secuencia:{" "}
              {brechas.slice(0, 10).map(n => `REP-${n.toString().padStart(5, "0")}`).join(", ")}
              {brechas.length > 10 && ` y ${brechas.length - 10} más`}
            </p>
          </div>
        </div>
      )}

      {/* Lista de facturas */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary text-md">
            <ClipboardCheck className="h-4 w-4" />
            {loading
              ? "Cargando..."
              : reparaciones.length === 0
              ? `Sin facturas para ${fecha}`
              : `${reparaciones.length} factura(s) — ${fecha}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Cargando facturas...</div>
          ) : reparaciones.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No hay facturas registradas para esta fecha.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reparaciones.map((r, idx) => {
                const esRevisada = !!diaReviewed[r.codigo];
                // Detectar si hay brecha justo antes de esta factura
                const hayBrecha = idx > 0 &&
                  codeNum(r.codigo) - codeNum(reparaciones[idx - 1].codigo) > 1;

                return (
                  <div key={r.id}>
                    {hayBrecha && (
                      <div className="flex items-center gap-2 py-2 px-1">
                        <div className="flex-1 border-t border-dashed border-amber-300" />
                        <span className="text-xs text-amber-500 font-semibold whitespace-nowrap">
                          ⚠ salto en secuencia
                        </span>
                        <div className="flex-1 border-t border-dashed border-amber-300" />
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-3 py-3 px-1 transition-colors rounded-lg ${
                        esRevisada ? "opacity-60" : ""
                      }`}
                    >
                      <Checkbox
                        id={`chk-${r.codigo}`}
                        checked={esRevisada}
                        onCheckedChange={() => toggleRevisada(r.codigo)}
                        className="shrink-0"
                      />
                      <label
                        htmlFor={`chk-${r.codigo}`}
                        className="flex-1 cursor-pointer min-w-0"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-black px-2 py-0.5 rounded bg-primary/10 text-primary ${esRevisada ? "line-through" : ""}`}>
                            {r.codigo}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {r.cliente}
                          </span>
                          {r.cedula && (
                            <span className="text-xs text-slate-400">{r.cedula}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{r.marca} {r.modelo}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(r.status)}`}>
                            {r.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            RD$ {r.costo.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          {r.tecnico && (
                            <span className="text-xs text-slate-400">· {r.tecnico}</span>
                          )}
                        </div>
                      </label>
                      {esRevisada && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barra de progreso si hay facturas */}
      {!loading && reparaciones.length > 0 && (
        <div className="rounded-xl border bg-white px-5 py-4 shadow-sm space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Progreso de revisión</span>
            <span>{revisadas}/{reparaciones.length}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${reparaciones.length > 0 ? (revisadas / reparaciones.length) * 100 : 0}%` }}
            />
          </div>
          {revisadas === reparaciones.length && reparaciones.length > 0 && (
            <p className="text-xs text-emerald-600 font-semibold text-center">
              ✓ Todas las facturas del día han sido revisadas
            </p>
          )}
        </div>
      )}
    </div>
  );
}
