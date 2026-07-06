"use client";
import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Wrench, CheckCircle2, Inbox, Hand, Bell, BellRing } from "lucide-react";
import { Repair } from "@/lib/types";
import { formatDateTimeCompact, formatDateTimeShort, nowRD } from "@/lib/date";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { startReadyAlarm, startChequeoAlarm } from "@/lib/sound";
import RepairDetailModal from "@/components/RepairDetailModal";

const formatTime = (iso: string) => formatDateTimeCompact(iso);

// ── Acciones rápidas por fila (técnico ve "Entregar a recepción"; caja ve "Despachar") ──
function StatusSelector({ repair, onStatusChange }: { repair: Repair; onStatusChange: (id: number, status: string) => void }) {
  const { user } = useAuth();
  const isTech = user?.role === "tech" || user?.role === "admin";
  const isCaja = user?.role === "caja" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const { status, id } = repair;

  const btnBase = "text-[11px] font-bold px-3 py-1.5 rounded-md border transition-colors w-full text-left";

  if (status === "En chequeo") {
    return <span className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">🔍 En chequeo...</span>;
  }

  if (status === "En reparación") {
    if (!isTech) return <span className="text-[11px] text-slate-400 italic">En taller...</span>;
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <button onClick={() => onStatusChange(id, "Listo para entregar")}
          className={`${btnBase} bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100`}>
          ✔ Listo para entregar
        </button>
        <button onClick={() => onStatusChange(id, "No se pudo reparar")}
          className={`${btnBase} bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100`}>
          ✖ No se pudo reparar
        </button>
      </div>
    );
  }

  if (status === "Listo para entregar" || status === "No se pudo reparar") {
    if (!isCaja) return <span className="text-[11px] text-slate-400 italic">Esperando caja...</span>;
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        {(status === "Listo para entregar" || isAdmin) && (
          <button onClick={() => onStatusChange(id, "Despachado bueno")}
            className={`${btnBase} bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100`}>
            💰 Entregar y Cobrar
          </button>
        )}
        {(status === "No se pudo reparar" || isAdmin) && (
          <button onClick={() => onStatusChange(id, "Despachado malo")}
            className={`${btnBase} bg-red-50 border-red-300 text-red-700 hover:bg-red-100`}>
            📦 Entregar Sin Reparar
          </button>
        )}
        <button onClick={() => onStatusChange(id, "En reparación")}
          className="text-[10px] text-slate-400 hover:text-slate-600 mt-1 text-left">
          ↻ Revertir a taller
        </button>
      </div>
    );
  }

  if (status === "Entregado a recepción") {
    if (!isCaja) return <span className="text-[11px] text-slate-400 italic">En recepción...</span>;
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <button onClick={() => onStatusChange(id, "Despachado bueno")}
          className={`${btnBase} bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100`}>
          💰 Entregar y Cobrar
        </button>
        <button onClick={() => onStatusChange(id, "Despachado malo")}
          className={`${btnBase} bg-red-50 border-red-300 text-red-700 hover:bg-red-100`}>
          📦 Devolver al cliente
        </button>
        <button onClick={() => onStatusChange(id, "Listo para entregar")}
          className="text-[10px] text-slate-400 hover:text-slate-600 mt-1 text-left">
          ↻ Revertir a taller
        </button>
      </div>
    );
  }

  // Entregado
  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className={status === "Despachado bueno" ? "border-emerald-400 text-emerald-700" : "border-red-400 text-red-700"}>
        {status === "Despachado bueno" ? "✔ Entregado" : "📦 Devuelto"}
      </Badge>
      {isAdmin && (
        <button onClick={() => onStatusChange(id, "En reparación")}
          className="text-[10px] text-slate-400 hover:text-slate-600 text-left mt-1">
          ↻ Revertir
        </button>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function InboxPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const readyIds = useRef<Set<number>>(new Set());
  const chequeoIds = useRef<Set<number>>(new Set());
  const entregaRecepcionIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);
  const stopAlarm = useRef<(() => void) | null>(null);
  const stopReadyAlarm = useRef<(() => void) | null>(null);
  const stopEntregaAlarm = useRef<(() => void) | null>(null);
  const [chequeoAlerts, setChequeoAlerts] = useState<Repair[]>([]);
  const [readyAlerts, setReadyAlerts] = useState<Repair[]>([]);
  const [entregaRecepcionAlerts, setEntregaRecepcionAlerts] = useState<Repair[]>([]);

  useEffect(() => {
    loadRepairs();
    const interval = setInterval(loadRepairs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadRepairs = async () => {
    try {
      const res = await fetch("/api/repairs?active=true");
      const active: Repair[] = await res.json();

      if (!isFirstLoad.current) {
        const nowReady = active.filter(r =>
          (r.status === "Listo para entregar" || r.status === "No se pudo reparar") &&
          !readyIds.current.has(r.id)
        );
        if (nowReady.length > 0) {
          setReadyAlerts(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const nuevos = nowReady.filter(r => !existingIds.has(r.id));
            return nuevos.length > 0 ? [...prev, ...nuevos] : prev;
          });
          if (!stopReadyAlarm.current) {
            stopReadyAlarm.current = startReadyAlarm();
          }
        }

        // Detectar chequeos que pasaron a "En reparación"
        const completedChequeos = active.filter(r =>
          r.status === "En reparación" && chequeoIds.current.has(r.id)
        );
        if (completedChequeos.length > 0) {
          setChequeoAlerts(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const nuevos = completedChequeos.filter(r => !existingIds.has(r.id));
            return nuevos.length > 0 ? [...prev, ...nuevos] : prev;
          });
          if (!stopAlarm.current) {
            stopAlarm.current = startChequeoAlarm();
          }
        }

        // Detectar equipos recién entregados a recepción (transición desde taller)
        const nowEntregados = active.filter(r =>
          r.status === "Entregado a recepción" && !entregaRecepcionIds.current.has(r.id)
        );
        if (nowEntregados.length > 0) {
          setEntregaRecepcionAlerts(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const nuevos = nowEntregados.filter(r => !existingIds.has(r.id));
            return nuevos.length > 0 ? [...prev, ...nuevos] : prev;
          });
          if (!stopEntregaAlarm.current) {
            stopEntregaAlarm.current = startReadyAlarm();
          }
        }
      }
      isFirstLoad.current = false;
      readyIds.current = new Set(
        active.filter(r => r.status === "Listo para entregar" || r.status === "No se pudo reparar").map(r => r.id)
      );
      chequeoIds.current = new Set(
        active.filter(r => r.status === "En chequeo").map(r => r.id)
      );
      entregaRecepcionIds.current = new Set(
        active.filter(r => r.status === "Entregado a recepción").map(r => r.id)
      );

      setRepairs(active);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    const payload: any = { status: newStatus };
    if (newStatus === "Despachado bueno" || newStatus === "Despachado malo") {
      payload.fecha_despacho = nowRD();
    } else if (newStatus !== "Despachado bueno" && newStatus !== "Despachado malo" && newStatus !== "Entregado a recepción") {
      payload.fecha_despacho = null;
    }
    const res = await fetch(`/api/repairs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "No se pudo cambiar el estado");
      return;
    }
    toast.success(`Estado actualizado: ${newStatus}`);
    loadRepairs();
  };

  // ── Separar en 2 secciones (2026-07-05: flujo técnico → recepción → caja) ──
  // Arriba: "En mi poder" = equipos que la caja YA tiene físicamente
  //   (status === "Entregado a recepción")
  // Abajo: "En taller" = equipos activos que la caja aún NO tiene
  //   (status ∈ {"En chequeo", "En reparación", "Listo para entregar", "No se pudo reparar"})
  const enMiPoder = repairs.filter(r => r.status === "Entregado a recepción");
  const enTaller = repairs.filter(r => r.status !== "Entregado a recepción");

  // Subagrupación de "En taller" por técnico (para la sección informativa de abajo)
  const enTallerFiltrados = enTaller
    .filter(r =>
      r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.modelo.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const order = ["Listo para entregar", "No se pudo reparar", "En reparación", "En chequeo"];
      const ai = order.indexOf(a.status);
      const bi = order.indexOf(b.status);
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return b.id - a.id;
    });

  const TECNICOS = ["Oscar", "Freddy", "Carlos"];
  const enTallerPorTecnico: Record<string, Repair[]> = {};
  TECNICOS.forEach(t => { enTallerPorTecnico[t] = []; });
  enTallerFiltrados.forEach(r => {
    const t = r.tecnico && TECNICOS.includes(r.tecnico) ? r.tecnico : "Sin asignar";
    if (!enTallerPorTecnico[t]) enTallerPorTecnico[t] = [];
    enTallerPorTecnico[t].push(r);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bandeja de Pendientes</h1>
          <p className="text-slate-500 text-sm">{repairs.length} equipo{repairs.length !== 1 ? "s" : ""} activo{repairs.length !== 1 ? "s" : ""} en taller.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por código, cliente o modelo..."
            className="pl-9 w-[300px] border-slate-200 shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── SECCIÓN 1: En mi poder (entregados a recepción) ─────────────────── */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-violet-50/50 border-b border-violet-100">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hand className="h-5 w-5 text-violet-600" />
            <span>En mi poder (entregados a recepción)</span>
            <Badge variant="secondary" className="ml-2 bg-violet-100 text-violet-700">
              {enMiPoder.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-24 flex items-center justify-center text-slate-400">Cargando...</div>
          ) : enMiPoder.length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center text-slate-400 text-sm">
              <Inbox className="h-8 w-8 text-slate-300 mb-2" />
              <span>Ningún equipo entregado a recepción todavía.</span>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold w-[110px]">Código</TableHead>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Equipo / Técnico</TableHead>
                  <TableHead className="font-bold w-[140px]">Estatus</TableHead>
                  <TableHead className="font-bold">Total</TableHead>
                  <TableHead className="font-bold w-[180px]">Acción</TableHead>
                  <TableHead className="font-bold w-[60px] text-right">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enMiPoder.map(r => (
                  <TableRow key={r.id} className="bg-violet-50/30 hover:bg-violet-50/60 transition-colors">
                    <TableCell>
                      <div className="font-black text-primary">{r.codigo}</div>
                      <div className="text-[10px] text-violet-600 mt-0.5 font-semibold">
                        Recibido: {r.fecha_entrega_recepcion ? formatDateTimeShort(r.fecha_entrega_recepcion) : "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{r.cliente}</div>
                      <div className="text-xs text-slate-500">{r.telefono}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.marca} {r.modelo}</div>
                      <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                        <Wrench className="h-3 w-3" /> {r.tecnico || "Sin asignar"}
                      </div>
                      <div className="text-[10px] text-violet-700 bg-violet-100 rounded px-1.5 py-0.5 mt-1 font-bold inline-block">📥 En recepción</div>
                    </TableCell>
                    {/* 2026-07-06: columna dedicada de Estatus con chip grande.
                        La cajera ve de un vistazo si el técnico lo dejó Listo o Sin solución. */}
                    <TableCell>
                      {r.status_anterior_taller ? (
                        <Badge
                          variant="outline"
                          className={
                            r.status_anterior_taller === "Listo para entregar"
                              ? "border-emerald-400 text-emerald-700 bg-emerald-50 text-sm font-black px-3 py-1"
                              : "border-orange-400 text-orange-700 bg-orange-50 text-sm font-black px-3 py-1"
                          }
                        >
                          {r.status_anterior_taller === "Listo para entregar" ? "✔ Listo" : "✖ Sin solución"}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">
                      RD$ {(r.costo + (r.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusSelector repair={r} onStatusChange={handleStatusChange} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => setSelectedRepair(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── SECCIÓN 2: En taller (informativa, agrupada por técnico) ────────── */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-amber-50/50 border-b border-amber-100">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-5 w-5 text-amber-600" />
            <span>En taller (aún no entregados a recepción)</span>
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
              {enTallerFiltrados.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-24 flex items-center justify-center text-slate-400">Cargando...</div>
          ) : enTallerFiltrados.length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center text-slate-400 text-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-300 mb-2" />
              <span>No hay equipos en taller.</span>
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(enTallerPorTecnico).map(([tecnico, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={tecnico} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 capitalize">{tecnico}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {items.length} equipo{items.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {items.map(r => (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm ${
                            r.status === "Listo para entregar"
                              ? "bg-emerald-50/40 border-emerald-200"
                              : r.status === "No se pudo reparar"
                              ? "bg-orange-50/40 border-orange-200"
                              : r.status === "En chequeo"
                              ? "bg-amber-50/40 border-amber-200"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-primary text-xs">{r.codigo}</span>
                              <span className="font-medium text-slate-900 truncate">{r.cliente}</span>
                            </div>
                            <div className="text-xs text-slate-500">{r.marca} {r.modelo}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={
                                r.status === "Listo para entregar"
                                  ? "border-emerald-400 text-emerald-700"
                                  : r.status === "No se pudo reparar"
                                  ? "border-orange-400 text-orange-700"
                                  : r.status === "En chequeo"
                                  ? "border-amber-400 text-amber-700"
                                  : "border-slate-300 text-slate-600"
                              }
                            >
                              {r.status === "Listo para entregar" && "✔ "}
                              {r.status === "En reparación" && "🔧 "}
                              {r.status === "En chequeo" && "🔍 "}
                              {r.status === "No se pudo reparar" && "✖ "}
                              {r.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-primary"
                              onClick={() => setSelectedRepair(r)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRepair && (
        <RepairDetailModal repair={selectedRepair} onClose={() => { setSelectedRepair(null); loadRepairs(); }} />
      )}

      {readyAlerts.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-emerald-500 px-6 py-4 flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <h2 className="text-white font-black text-lg leading-tight">¡Equipo Listo!</h2>
                <p className="text-emerald-100 text-sm">Un equipo está listo para ser entregado</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {readyAlerts.map(r => (
                <div key={r.id} className={`rounded-xl p-4 border ${r.status === "Listo para entregar" ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-primary text-sm">{r.codigo}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === "Listo para entregar" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                      {r.status === "Listo para entregar" ? "✔ Listo" : "✖ Sin reparar"}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">{r.cliente}</p>
                  <p className="text-xs text-slate-500">{r.marca} {r.modelo}</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">RD$ {(r.costo + (r.cargosAdicionales?.reduce((a,c)=>a+c.monto,0)||0)).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  stopReadyAlarm.current?.();
                  stopReadyAlarm.current = null;
                  setReadyAlerts([]);
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg transition-colors"
              >
                ✔ Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {chequeoAlerts.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-pulse-border">
            <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-white font-black text-lg leading-tight">¡Chequeo Completado!</h2>
                <p className="text-amber-100 text-sm">El técnico registró el diagnóstico</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {chequeoAlerts.map(r => (
                <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-primary text-sm">{r.codigo}</span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">RD$ {(r.costo || 0).toLocaleString()}</span>
                  </div>
                  <p className="font-bold text-slate-800">{r.cliente}</p>
                  <p className="text-xs text-slate-500">{r.marca} {r.modelo}</p>
                  {r.trabajoARealizar && (
                    <p className="text-sm text-slate-700 mt-2 font-semibold">🔧 {r.trabajoARealizar}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  stopAlarm.current?.();
                  stopAlarm.current = null;
                  setChequeoAlerts([]);
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg transition-colors"
              >
                ✔ Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {entregaRecepcionAlerts.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-pulse-border">
            <div className="bg-violet-500 px-6 py-4 flex items-center gap-3">
              <Hand className="h-7 w-7 text-white" />
              <div>
                <h2 className="text-white font-black text-lg leading-tight">¡Entrega a Recepción!</h2>
                <p className="text-violet-100 text-sm">El técnico dejó el equipo en el mostrador</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {entregaRecepcionAlerts.map(r => (
                <div key={r.id} className="rounded-xl p-4 border bg-violet-50 border-violet-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-primary text-sm">{r.codigo}</span>
                    <span className="text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                      📥 En recepción
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">{r.cliente}</p>
                  <p className="text-xs text-slate-500">{r.marca} {r.modelo}</p>
                  <p className="text-[11px] text-violet-700 mt-1.5 font-semibold">
                    Técnico: {r.tecnico || "Sin asignar"}
                    {r.fecha_entrega_recepcion && (
                      <> · Recibido: {formatDateTimeShort(r.fecha_entrega_recepcion)}</>
                    )}
                  </p>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    RD$ {(r.costo + (r.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) || 0)).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  stopEntregaAlarm.current?.();
                  stopEntregaAlarm.current = null;
                  setEntregaRecepcionAlerts([]);
                }}
                className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-black text-lg transition-colors"
              >
                ✔ Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
