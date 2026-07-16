"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Archive, RefreshCcw, Plus, Loader2, CheckCircle2, Clock,
  Eye, PackageCheck, PackageX, X, FileQuestion, PackageOpen, Search,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTimeShort } from "@/lib/date";

interface BovedaItem {
  id: number;
  repair_id: number;
  status_al_archivar: string;
  tecnico_al_archivar: string;
  fecha_archivo: string;
  archivado_por: string | null;
  motivo: string;
  estado_caso: "pendiente" | "en_investigacion" | "resuelto";
  fecha_resolucion: string | null;
  resuelto_por: string | null;
  tipo_resolucion: string | null;
  notas: string | null;
  repairs: {
    codigo: string;
    cliente: string;
    telefono: string | null;
    marca: string;
    modelo: string;
    color: string | null;
    serie: string | null;
    costo: number;
    fecha: string;
    status: string;
    status_anterior_taller: string | null;
  };
}

const TECNICOS = ["Oscar", "Freddy", "Carlos"];

const statusColors: Record<string, string> = {
  "En chequeo": "bg-sky-100 text-sky-700 border-sky-200",
  "En reparación": "bg-amber-100 text-amber-700 border-amber-200",
  "Listo para entregar": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "No se pudo reparar": "bg-rose-100 text-rose-700 border-rose-200",
};

const estadoCasoColors: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  en_investigacion: "bg-blue-100 text-blue-800 border-blue-200",
  resuelto: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function BovedaEquiposPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<BovedaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroTecnico, setFiltroTecnico] = useState<string>("");
  const [busqueda, setBusqueda] = useState<string>("");

  // Modal de resolver
  const [resolverItem, setResolverItem] = useState<BovedaItem | null>(null);
  const [tipoResolucion, setTipoResolucion] = useState<string>("");
  const [notasResol, setNotasResol] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Modal de detalle
  const [detalleItem, setDetalleItem] = useState<BovedaItem | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set("estado", filtroEstado);
      if (filtroTecnico) params.set("tecnico", filtroTecnico);
      const res = await fetch("/api/boveda?" + params.toString());
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando la bóveda");
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroTecnico]);

  useEffect(() => {
    if (user?.role === "admin") cargar();
  }, [user, cargar]);

  const abrirResolver = (item: BovedaItem) => {
    setResolverItem(item);
    setTipoResolucion("");
    setNotasResol("");
  };

  const resolver = async () => {
    if (!resolverItem || !tipoResolucion) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/boveda/${resolverItem.id}/resolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_resolucion: tipoResolucion,
          notas: notasResol || null,
          resuelto_por: user?.username || "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al resolver"); return; }
      toast.success(data.message);
      setResolverItem(null);
      cargar();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtro client-side por texto: busca en código, cliente, marca, modelo,
  // serie, teléfono, motivo y técnico. No toca la API.
  const itemsVisibles = useMemo(() => {
    if (!busqueda.trim()) return items;
    const q = busqueda.toLowerCase().trim();
    return items.filter(i => {
      const r = i.repairs;
      return (
        (r.codigo ?? "").toLowerCase().includes(q) ||
        (r.cliente ?? "").toLowerCase().includes(q) ||
        (r.marca ?? "").toLowerCase().includes(q) ||
        (r.modelo ?? "").toLowerCase().includes(q) ||
        (r.serie ?? "").toLowerCase().includes(q) ||
        (r.telefono ?? "").toLowerCase().includes(q) ||
        (i.motivo ?? "").toLowerCase().includes(q) ||
        (i.tecnico_al_archivar ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, busqueda]);

  if (!user || user.role !== "admin") return null;

  const counts = {
    total: items.length,
    pendientes: items.filter(i => i.estado_caso === "pendiente").length,
    enInvestigacion: items.filter(i => i.estado_caso === "en_investigacion").length,
    resueltos: items.filter(i => i.estado_caso === "resuelto").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Bóveda de equipos</h1>
          <p className="text-slate-500 text-sm">
            Equipos pendientes de investigación. Revisa cada caso y decide qué pasó.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/boveda-equipos/archivar")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Archivar nuevo
          </Button>
          <Button variant="outline" onClick={cargar} disabled={loading} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 flex items-center gap-1">
              <Archive className="h-3.5 w-3.5" /> Total en bóveda
            </div>
            <div className="text-3xl font-bold mt-1">{counts.total}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="text-sm text-amber-700 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Pendientes
            </div>
            <div className="text-3xl font-bold text-amber-700 mt-1">{counts.pendientes}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-700 flex items-center gap-1">
              <FileQuestion className="h-3.5 w-3.5" /> En investigación
            </div>
            <div className="text-3xl font-bold text-blue-700 mt-1">{counts.enInvestigacion}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-slate-50">
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Resueltos
            </div>
            <div className="text-3xl font-bold text-slate-600 mt-1">{counts.resueltos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-500">Técnico:</Label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={filtroTecnico === "" ? "default" : "outline"}
                onClick={() => setFiltroTecnico("")}
              >Todos</Button>
              {TECNICOS.map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={filtroTecnico === t ? "default" : "outline"}
                  onClick={() => setFiltroTecnico(t)}
                >{t}</Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-500">Estado:</Label>
            <div className="flex gap-1">
              {[
                { v: "", label: "Todos" },
                { v: "pendiente", label: "Pendientes" },
                { v: "en_investigacion", label: "Investigación" },
                { v: "resuelto", label: "Resueltos" },
              ].map(opt => (
                <Button
                  key={opt.v}
                  size="sm"
                  variant={filtroEstado === opt.v ? "default" : "outline"}
                  onClick={() => setFiltroEstado(opt.v)}
                >{opt.label}</Button>
              ))}
            </div>
          </div>
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs sm:ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar código, cliente, IMEI, motivo…"
              className="pl-8 pr-8"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3 w-3 text-slate-600" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            {items.length === 0
              ? "Sin equipos en bóveda"
              : busqueda.trim()
                ? `${itemsVisibles.length} de ${items.length} caso(s)`
                : `${items.length} caso(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Cargando...
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-slate-400 italic">
              No hay equipos archivados. Cuando hagas un inventario físico y alguno
              no aparezca, entras a "Archivar nuevo" para meterlo aquí.
            </div>
          ) : itemsVisibles.length === 0 ? (
            <div className="py-10 text-center text-slate-400 italic">
              No hay coincidencias para "<strong>{busqueda}</strong>".
            </div>
          ) : (
            <div className="divide-y">
              {itemsVisibles.map(item => (
                <div key={item.id} className="py-3 px-2 grid grid-cols-12 gap-3 items-center hover:bg-slate-50 rounded-lg">
                  <div className="col-span-12 sm:col-span-2">
                    <div className="font-black text-primary text-base">{item.repairs.codigo}</div>
                    <div className="text-[10px] text-slate-400">
                      {item.tecnico_al_archivar}
                    </div>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <div className="text-sm font-medium truncate">{item.repairs.cliente}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {item.repairs.marca} {item.repairs.modelo}
                    </div>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Badge className={statusColors[item.status_al_archivar]} variant="outline">
                      {item.status_al_archivar}
                    </Badge>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Badge className={estadoCasoColors[item.estado_caso]} variant="outline">
                      {item.estado_caso === "pendiente" && <Clock className="h-3 w-3 mr-1" />}
                      {item.estado_caso === "en_investigacion" && <FileQuestion className="h-3 w-3 mr-1" />}
                      {item.estado_caso === "resuelto" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {item.estado_caso.replace("_", " ")}
                    </Badge>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatDateTimeShort(item.fecha_archivo)}
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-3 flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetalleItem(item)}
                      className="gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                    {item.estado_caso !== "resuelto" && (
                      <Button
                        size="sm"
                        onClick={() => abrirResolver(item)}
                        className="gap-1"
                      >
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Resolver */}
      <Dialog open={!!resolverItem} onOpenChange={(o) => !o && setResolverItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolver caso {resolverItem?.repairs.codigo}</DialogTitle>
          </DialogHeader>
          {resolverItem && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <div className="font-medium">{resolverItem.repairs.cliente}</div>
                <div className="text-slate-500 text-xs">
                  {resolverItem.repairs.marca} {resolverItem.repairs.modelo}
                </div>
                <div className="text-xs mt-1">
                  Status al archivar:{" "}
                  <Badge className={statusColors[resolverItem.status_al_archivar]} variant="outline">
                    {resolverItem.status_al_archivar}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>¿Qué pasó con este equipo?</Label>
                <div className="grid gap-2">
                  {[
                    {
                      v: "encontrado",
                      label: "Ya lo encontré / fue un error de archivo",
                      desc: "El equipo vuelve a su estado anterior en el taller",
                      icon: PackageOpen,
                      color: "amber",
                    },
                  ].map(opt => {
                    const Icon = opt.icon;
                    return (
                      <label
                        key={opt.v}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          tipoResolucion === opt.v
                            ? "border-primary bg-primary/5"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipo"
                          value={opt.v}
                          checked={tipoResolucion === opt.v}
                          onChange={(e) => setTipoResolucion(e.target.value)}
                          className="mt-1"
                        />
                        <Icon className={`h-5 w-5 mt-0.5 text-${opt.color}-600`} />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{opt.label}</div>
                          <div className="text-xs text-slate-500">{opt.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="grid gap-2 pt-1">
                  {[
                    {
                      v: "despachado_bueno",
                      label: "Despachado bueno (se entregó y se cobró)",
                      desc: "El equipo vuelve al histórico con status Despachado bueno",
                      icon: PackageCheck,
                      color: "emerald",
                    },
                    {
                      v: "despachado_malo",
                      label: "Despachado malo (se devolvió sin cobrar)",
                      desc: "El equipo vuelve al histórico con status Despachado malo",
                      icon: PackageX,
                      color: "orange",
                    },
                    {
                      v: "perdido",
                      label: "Perdido / no se pudo recuperar",
                      desc: "Se cierra el caso. El equipo queda archivado en la bóveda",
                      icon: X,
                      color: "slate",
                    },
                    {
                      v: "otro",
                      label: "Otro (describir en notas)",
                      desc: "Se cierra el caso. La nota queda registrada",
                      icon: FileQuestion,
                      color: "blue",
                    },
                  ].map(opt => {
                    const Icon = opt.icon;
                    return (
                      <label
                        key={opt.v}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          tipoResolucion === opt.v
                            ? "border-primary bg-primary/5"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipo"
                          value={opt.v}
                          checked={tipoResolucion === opt.v}
                          onChange={(e) => setTipoResolucion(e.target.value)}
                          className="mt-1"
                        />
                        <Icon className={`h-5 w-5 mt-0.5 text-${opt.color}-600`} />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{opt.label}</div>
                          <div className="text-xs text-slate-500">{opt.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notas">Notas (opcional)</Label>
                <Textarea
                  id="notas"
                  value={notasResol}
                  onChange={(e) => setNotasResol(e.target.value)}
                  placeholder="Detalles, fecha real, nombre del cliente, lo que pasó..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolverItem(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={resolver} disabled={!tipoResolucion || submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar resolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle */}
      <Dialog open={!!detalleItem} onOpenChange={(o) => !o && setDetalleItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detalleItem?.repairs.codigo} — {detalleItem?.repairs.cliente}</DialogTitle>
          </DialogHeader>
          {detalleItem && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-slate-500">Técnico</div>
                  <div className="font-medium">{detalleItem.tecnico_al_archivar}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Archivado por</div>
                  <div className="font-medium">{detalleItem.archivado_por || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Fecha archivo</div>
                  <div>{formatDateTimeShort(detalleItem.fecha_archivo)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Status al archivar</div>
                  <Badge className={statusColors[detalleItem.status_al_archivar]} variant="outline">
                    {detalleItem.status_al_archivar}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Status actual en repairs</div>
                  <Badge variant="outline">{detalleItem.repairs.status}</Badge>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Estado del caso</div>
                  <Badge className={estadoCasoColors[detalleItem.estado_caso]} variant="outline">
                    {detalleItem.estado_caso.replace("_", " ")}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Equipo</div>
                  <div>{detalleItem.repairs.marca} {detalleItem.repairs.modelo} {detalleItem.repairs.color || ""}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Motivo del archivo</div>
                  <div>{detalleItem.motivo}</div>
                </div>
                {detalleItem.tipo_resolucion && (
                  <>
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500">Resolución</div>
                      <div className="font-medium">
                        {detalleItem.tipo_resolucion.replace("_", " ")} · {formatDateTimeShort(detalleItem.fecha_resolucion!)}
                      </div>
                    </div>
                    {detalleItem.notas && (
                      <div className="col-span-2">
                        <div className="text-xs text-slate-500">Notas</div>
                        <div className="whitespace-pre-wrap">{detalleItem.notas}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetalleItem(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
