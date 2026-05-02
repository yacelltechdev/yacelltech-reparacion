"use client";
import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Wrench, CheckCircle2 } from "lucide-react";
import { Repair } from "@/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { playReadySound } from "@/lib/sound";
import RepairDetailModal from "@/components/RepairDetailModal";

const formatTime = (iso: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true });
};

// ── Selector de estado por fila ────────────────────────────────────────────
function StatusSelector({ repair, onStatusChange }: { repair: Repair; onStatusChange: (id: number, status: string) => void }) {
  const { user } = useAuth();
  const isTech = user?.role === "tech" || user?.role === "admin";
  const isCaja = user?.role === "caja" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const { status, id } = repair;

  const btnBase = "text-[11px] font-bold px-3 py-1.5 rounded-md border transition-colors w-full text-left";

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
  const isFirstLoad = useRef(true);

  useEffect(() => {
    loadRepairs();
    const interval = setInterval(loadRepairs, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadRepairs = async () => {
    try {
      const res = await fetch("/api/repairs?active=1");
      const data: Repair[] = await res.json();
      const active = Array.isArray(data) ? data : [];

      if (!isFirstLoad.current) {
        const nowReady = active.filter(r =>
          (r.status === "Listo para entregar" || r.status === "No se pudo reparar") &&
          !readyIds.current.has(r.id)
        );
        if (nowReady.length > 0) {
          playReadySound();
          nowReady.forEach(r => toast.info(`${r.codigo} — ${r.cliente}: ${r.status}`));
        }
      }
      isFirstLoad.current = false;
      readyIds.current = new Set(
        active.filter(r => r.status === "Listo para entregar" || r.status === "No se pudo reparar").map(r => r.id)
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
      const order = ["En reparación", "Listo para entregar", "No se pudo reparar"];
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
                  <TableRow key={r.id} className={`transition-colors ${r.status === "Listo para entregar" ? "bg-emerald-50/40" : r.status === "No se pudo reparar" ? "bg-orange-50/40" : ""}`}>
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

    </div>
  );
}
