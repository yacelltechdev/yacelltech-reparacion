"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Clock, Wrench } from "lucide-react";
import { Repair } from "@/lib/types";
import { toast } from "sonner";
import { playNewRepairSound } from "@/lib/sound";

function RejectModal({ onConfirm, onCancel }: { onConfirm: (nota: string) => void; onCancel: () => void }) {
  const [nota, setNota] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <h3 className="text-lg font-bold text-red-700 mb-2">Razón — No se pudo reparar</h3>
        <p className="text-sm text-slate-500 mb-4">Detalla la razón técnica por la cual no se pudo reparar el equipo.</p>
        <form onSubmit={e => { e.preventDefault(); if (nota.trim()) onConfirm(nota.trim()); }}>
          <textarea
            autoFocus
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Ej: Placa base con corto irreparable / Pieza no disponible..."
            rows={4}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700">Guardar Razón</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TechnicianPage() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [history, setHistory] = useState<Repair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const knownIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    loadRepairs();
    const interval = setInterval(loadRepairs, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const loadRepairs = async () => {
    if (!user?.username) return;
    try {
      const res = await fetch(`/api/repairs?tecnico=${encodeURIComponent(user.username)}`);
      const data: Repair[] = await res.json();
      const today = new Date().toISOString().split("T")[0];
      const mine = Array.isArray(data) ? data : [];

      const active = mine.filter(r => ["En reparación", "Listo para entregar", "No se pudo reparar"].includes(r.status));

      if (!isFirstLoad.current) {
        const newOnes = active.filter(r => !knownIds.current.has(r.id));
        if (newOnes.length > 0) {
          playNewRepairSound();
          newOnes.forEach(r => toast.info(`Nueva reparación: ${r.codigo} — ${r.cliente}`));
        }
      }
      isFirstLoad.current = false;
      knownIds.current = new Set(active.map(r => r.id));

      setRepairs(active);

      // Historial del día: completados o entregados hoy
      setHistory(mine.filter(r =>
        ["Entregado bueno", "Entregado malo"].includes(r.status) &&
        r.fecha_despacho?.startsWith(today)
      ));

      setIsLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (id: number, status: string, nota?: string) => {
    try {
      const payload: any = { status };
      if (nota) payload.notaDevolucion = nota;
      await fetch(`/api/repairs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      toast.success("Estado actualizado");
      setRejectId(null);
      loadRepairs();
    } catch (e) {
      toast.error("Error al actualizar");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="h-7 w-7 text-primary" /> Mis Reparaciones
        </h1>
        <p className="text-slate-500 text-sm">Equipos asignados a {user?.username} pendientes de atención.</p>
      </div>

      {repairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <h3 className="text-xl font-bold">¡Todo al día!</h3>
          <p className="text-slate-500">No tienes reparaciones pendientes asignadas.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {repairs.map(r => (
            <Card key={r.id} className="border-none shadow-sm flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">{r.codigo}</span>
                  {r.status === "En reparación" && <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">En taller</Badge>}
                  {r.status === "Listo para entregar" && <Badge className="bg-emerald-500">Listo</Badge>}
                  {r.status === "No se pudo reparar" && <Badge variant="destructive">Sin solución</Badge>}
                </div>
                <CardTitle className="text-lg mt-1">{r.modelo}</CardTitle>
                <p className="text-xs text-slate-400 -mt-1">{r.marca}</p>
                <p className="text-xs text-slate-500">Cliente: <strong>{r.cliente}</strong></p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 flex-1">
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Falla reportada</p>
                  <p className="text-sm font-semibold text-slate-800">{r.sintoma}</p>
                </div>
                {r.status === "En reparación" && (
                  <div className="mt-auto flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                      onClick={() => updateStatus(r.id, "Listo para entregar")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Está Lista
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => setRejectId(r.id)}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {r.status !== "En reparación" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-auto w-full text-slate-500 border-dashed"
                    onClick={() => updateStatus(r.id, "En reparación")}
                  >
                    ↺ Revertir a pendiente
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Historial del día */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-400" /> Completados hoy
            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{history.length}</span>
          </h2>
          <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            {history.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-4 px-4 py-3 text-sm ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}>
                <div className="shrink-0 w-[100px]">
                  <div className="font-black text-primary text-xs">{r.codigo}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {r.fecha_despacho ? new Date(r.fecha_despacho).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : ""}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">{r.modelo} <span className="text-slate-400 font-normal text-xs">({r.marca})</span></div>
                  <div className="text-xs text-slate-500 truncate">{r.cliente}</div>
                  <div className="text-xs text-slate-400 italic truncate mt-0.5">{r.sintoma}</div>
                </div>
                <div className="shrink-0">
                  {r.status === "Entregado bueno"
                    ? <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✔ Reparado</span>
                    : <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">✖ Sin solución</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectId && (
        <RejectModal
          onConfirm={nota => updateStatus(rejectId, "No se pudo reparar", nota)}
          onCancel={() => setRejectId(null)}
        />
      )}
    </div>
  );
}
