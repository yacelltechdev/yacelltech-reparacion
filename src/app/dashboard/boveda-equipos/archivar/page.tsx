"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Archive, RefreshCcw, ArrowLeft, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Repair } from "@/lib/types";
import { toast } from "sonner";

const TECNICOS = ["Oscar", "Freddy", "Carlos"];

const statusColors: Record<string, string> = {
  "En chequeo": "bg-sky-100 text-sky-700 border-sky-200",
  "En reparación": "bg-amber-100 text-amber-700 border-amber-200",
  "Listo para entregar": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "No se pudo reparar": "bg-rose-100 text-rose-700 border-rose-200",
};

// Códigos preseleccionados (los que Óscar SÍ tiene en la mano, marcados en
// la hoja de inventario del 5 de julio 2026).
const PRESELECCIONADOS_OSCAR = [
  "REP-02324", "REP-02255", "REP-02242",
  "REP-02078", "REP-01785", "REP-01563",
];

export default function ArchivarBovedaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tecnico, setTecnico] = useState<string>("Oscar");
  const [reparaciones, setReparaciones] = useState<Repair[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ count: number } | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  const cargar = useCallback(async (tec: string) => {
    setLoading(true);
    setDone(null);
    try {
      // Los 4 estados que cuentan como "en poder del técnico"
      const STATUSES = ["En chequeo", "En reparación", "Listo para entregar", "No se pudo reparar"];
      const fetches = STATUSES.map(s =>
        fetch(`/api/repairs?tecnico=${encodeURIComponent(tec)}&status=${encodeURIComponent(s)}`)
          .then(r => r.json())
          .catch(() => [])
      );
      const results = await Promise.all(fetches);
      const todos: Repair[] = results.flat();
      // Excluir los que YA están en la bóveda
      const resBov = await fetch("/api/boveda?tecnico=" + encodeURIComponent(tec));
      const bov = await resBov.json();
      const yaArchivados = new Set<number>((Array.isArray(bov) ? bov : []).map((b: any) => b.repair_id));
      const visibles = todos.filter(r => !yaArchivados.has(r.id));

      setReparaciones(visibles);

      // Preseleccionar los del preset si el técnico es Oscar y son visibles
      const preselected = new Set<number>();
      if (tec === "Oscar") {
        const codigos = new Set(PRESELECCIONADOS_OSCAR);
        for (const r of visibles) {
          if (codigos.has(r.codigo)) preselected.add(r.id);
        }
      }
      setSeleccionados(preselected);
    } catch {
      toast.error("Error cargando equipos del técnico");
      setReparaciones([]);
      setSeleccionados(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") cargar(tecnico);
  }, [tecnico, user, cargar]);

  const toggle = (id: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (seleccionados.size === reparaciones.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(reparaciones.map(r => r.id)));
    }
  };

  const archivar = async () => {
    // Los que se QUEDAN con el técnico = seleccionados
    // Los que van a la bóveda = los NO seleccionados
    const vanABoveda = reparaciones.filter(r => !seleccionados.has(r.id));
    if (vanABoveda.length === 0) {
      toast.info("No hay equipos para archivar (todos quedaron seleccionados)");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/boveda/archivar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairIds: vanABoveda.map(r => r.id),
          motivo: `No localizado en inventario físico — cuadre ${tecnico} 2026-07-06`,
          archivado_por: user?.username || "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al archivar"); return; }
      toast.success(data.message);
      setDone({ count: vanABoveda.length });
      cargar(tecnico);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== "admin") return null;

  const seQuedan = seleccionados.size;
  const vanABoveda = reparaciones.length - seleccionados.size;
  const countsByStatus = reparaciones.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/boveda-equipos")}
            className="mb-2 -ml-2 gap-2 text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a la bóveda
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Archivar a Bóveda</h1>
          <p className="text-slate-500 text-sm">
            Marca los equipos que el técnico <strong>SÍ tiene</strong> en la mano.
            Los demás se mueven a la bóveda para investigación.
          </p>
        </div>
        <Button variant="outline" onClick={() => cargar(tecnico)} disabled={loading} className="gap-2">
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Selector de técnico */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-600">Técnico:</span>
            <div className="flex gap-2">
              {TECNICOS.map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={tecnico === t ? "default" : "outline"}
                  onClick={() => setTecnico(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      {reparaciones.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">En sistema</div>
              <div className="text-3xl font-bold mt-1">{reparaciones.length}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-emerald-50/50">
            <CardContent className="pt-6">
              <div className="text-sm text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Se quedan con el técnico
              </div>
              <div className="text-3xl font-bold text-emerald-700 mt-1">{seQuedan}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-rose-50/50">
            <CardContent className="pt-6">
              <div className="text-sm text-rose-700 flex items-center gap-1">
                <Archive className="h-3.5 w-3.5" />
                Van a la bóveda
              </div>
              <div className="text-3xl font-bold text-rose-700 mt-1">{vanABoveda}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Por status</div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {Object.entries(countsByStatus).map(([s, n]) => (
                  <Badge key={s} className={statusColors[s]} variant="outline">
                    {n} {s.split(" ")[0]}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Done banner */}
      {done && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="font-bold text-emerald-900">
                {done.count} equipo(s) archivado(s) en la bóveda
              </div>
              <div className="text-sm text-emerald-700">
                El inventario del técnico ya está limpio. Puedes revisar los casos en la bóveda.
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => router.push("/dashboard/boveda-equipos")}
            >
              Ir a la bóveda
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de equipos */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Equipos de {tecnico} — marca los que tiene en la mano
          </CardTitle>
          {reparaciones.length > 0 && (
            <Button size="sm" variant="ghost" onClick={toggleAll}>
              {seleccionados.size === reparaciones.length ? "Desmarcar todos" : "Marcar todos"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Cargando equipos...
            </div>
          ) : reparaciones.length === 0 ? (
            <div className="py-10 text-center text-slate-400 italic">
              {tecnico} no tiene equipos en estados del taller, o todos ya están en la bóveda.
            </div>
          ) : (
            <div className="divide-y">
              {reparaciones.map(r => {
                const checked = seleccionados.has(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 py-3 px-2 cursor-pointer rounded-lg transition-colors ${
                      checked ? "bg-emerald-50/60" : "hover:bg-slate-50"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(r.id)}
                    />
                    <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2 sm:col-span-1 font-black text-primary text-sm">
                        {r.codigo}
                      </div>
                      <div className="col-span-5 sm:col-span-3 text-sm truncate">
                        {r.cliente}
                      </div>
                      <div className="col-span-5 sm:col-span-3 text-xs text-slate-500 truncate">
                        {r.marca} {r.modelo}
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Badge className={statusColors[r.status]} variant="outline">
                          {r.status}
                        </Badge>
                      </div>
                      <div className="col-span-6 sm:col-span-3 text-xs text-slate-400 text-right">
                        {r.fecha?.split("T")[0] || "—"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acción de archivar */}
      {reparaciones.length > 0 && !done && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-amber-900">
                  Vas a archivar {vanABoveda} equipo(s) de {tecnico}
                </div>
                <div className="text-sm text-amber-800 mt-0.5">
                  Los {seQuedan} marcados siguen en el inventario del técnico.
                  Los {vanABoveda} sin marcar se mueven a la bóveda y{" "}
                  <strong>no aparecerán en inventarios ni cuadres</strong> hasta que los resuelvas.
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  El estado original del repair no se modifica. Es reversible desde la bóveda.
                </div>
              </div>
              <Button
                onClick={archivar}
                disabled={submitting || vanABoveda === 0}
                className="gap-2 shrink-0"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Archivar {vanABoveda} a la bóveda
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
