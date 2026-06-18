"use client";
import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Wrench, CheckCircle2 } from "lucide-react";
import { Repair } from "@/lib/types";
import { formatDateTimeCompact } from "@/lib/date";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { startReadyAlarm, startChequeoAlarm } from "@/lib/sound";
import RepairDetailModal from "@/components/RepairDetailModal";

const formatTime = (iso: string) => formatDateTimeCompact(iso);

// ── Selector de estado por fila ────────────────────────────────────────────
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
          <button onClick={() => onStatusChange(id, "Entregado bueno")}
            className={`${btnBase} bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100`}>
            💰 Entregar y Cobrar
          </button>
        )}
        {(status === "No se pudo reparar" || isAdmin) && (
          <button onClick={() => onStatusChange(id, "Entregado malo")}
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

  // Entregado
  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className={status === "Entregado bueno" ? "border-emerald-400 text-emerald-700" : "border-red-400 text-red-700"}>
        {status === "Entregado bueno" ? "✔ Entregado" : "📦 Devuelto"}
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
  const isFirstLoad = useRef(true);
  const stopAlarm = useRef<(() => void) | null>(null);
  const stopReadyAlarm = useRef<(() => void) | null>(null);
  const [chequeoAlerts, setChequeoAlerts] = useState<Repair[]>([]);
  const [readyAlerts, setReadyAlerts] = useState<Repair[]>([]);

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
      }
      isFirstLoad.current = false;
      readyIds.current = new Set(
        active.filter(r => r.status === "Listo para entregar" || r.status === "No se pudo reparar").map(r => r.id)
      );
      chequeoIds.current = new Set(
        active.filter(r => r.status === "En chequeo").map(r => r.id)
      );

      setRepairs(active);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    const payload: any = { status: newStatus };
    if (newStatus === "Entregado bueno" || newStatus === "Entregado malo") {
      payload.fecha_despacho = new Date().toISOString();
    } else {
      payload.fecha_despacho = null;
    }
    await fetch(`/api/repairs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    toast.success(`Estado actualizado: ${newStatus}`);
    loadRepairs();
  };

  const filtered = repairs
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

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold w-[110px]">Código</TableHead>
                <TableHead className="font-bold">Cliente</TableHead>
                <TableHead className="font-bold">Equipo / Técnico</TableHead>
                <TableHead className="font-bold">Total</TableHead>
                <TableHead className="font-bold w-[180px]">Acción Rápida</TableHead>
                <TableHead className="font-bold w-[60px] text-right">Ver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400">Cargando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                    <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto mb-2" />
                    No hay equipos pendientes ni despachados hoy.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(r => (
                  <TableRow key={r.id} className={`transition-colors ${r.status === "Listo para entregar" ? "bg-emerald-50/40" : r.status === "No se pudo reparar" ? "bg-orange-50/40" : r.status === "En chequeo" ? "bg-amber-50/40" : ""}`}>
                    <TableCell>
                      <div className="font-black text-primary">{r.codigo}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatTime(r.fecha)}</div>
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
                      {r.status === "Listo para entregar" && (
                        <div className="text-[10px] text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5 mt-1 font-bold inline-block">✨ LISTO</div>
                      )}
                      {r.notaDevolucion && (
                        <div className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 mt-1 max-w-[180px] truncate">{r.notaDevolucion}</div>
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
                ))
              )}
            </TableBody>
          </Table>
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

    </div>
  );
}
