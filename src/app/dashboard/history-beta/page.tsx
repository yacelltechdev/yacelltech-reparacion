"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Database, Eye, X, Pencil, Plus, Trash2, Save, Loader2, ExternalLink } from "lucide-react";
import { Repair } from "@/lib/types";
import { formatDateTimeCompact } from "@/lib/date";
import RepairDetailModal from "@/components/RepairDetailModal";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const PER_PAGE = 50;

const statusColors: Record<string, string> = {
  "En reparación":      "bg-amber-100 text-amber-700 border-amber-200",
  "Listo para entregar":"bg-emerald-100 text-emerald-700 border-emerald-200",
  "No se pudo reparar": "bg-orange-100 text-orange-700 border-orange-200",
  "Entregado bueno":    "bg-blue-100 text-blue-700 border-blue-200",
  "Entregado malo":     "bg-red-100 text-red-700 border-red-200",
};

const formatDate = (s?: string) => (s ? formatDateTimeCompact(s) : "—");

const totalCosto = (r: Repair) =>
  (r.costo || 0) + (r.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) || 0);

// ─────────────────────────────────────────────────────────────
// MobileQuickEdit — edición inline (precio, técnico, modelo, trabajo, +producto)
// ─────────────────────────────────────────────────────────────
function MobileQuickEdit({
  repair,
  onSaved,
  onOpenFullModal,
}: {
  repair: Repair;
  onSaved: (updated: Repair) => void;
  onOpenFullModal: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [costo, setCosto] = useState<string>(String(repair.costo || 0));
  const [tecnico, setTecnico] = useState<string>(repair.tecnico || "");
  const [modelo, setModelo] = useState<string>(repair.modelo || "");
  const [trabajo, setTrabajo] = useState<string>(repair.trabajoARealizar || "");
  const [status, setStatus] = useState<Repair["status"]>(repair.status);
  // Estado: null = "no es pantalla", "" = checkbox marcado pero sin tipo, "InCell"/"OLED" = elegido
  const [tipoPantalla, setTipoPantalla] = useState<"InCell" | "OLED" | "" | null>(repair.tipoPantalla ?? null);
  const [cargos, setCargos] = useState<{ id: number; desc: string; monto: number }[]>(
    repair.cargosAdicionales || []
  );
  const [newDesc, setNewDesc] = useState("");
  const [newMonto, setNewMonto] = useState("");

  const ALL_STATUSES: Repair["status"][] = [
    "En chequeo",
    "En reparación",
    "Listo para entregar",
    "No se pudo reparar",
    "Entregado bueno",
    "Entregado malo",
  ];

  const startEdit = () => {
    setCosto(String(repair.costo || 0));
    setTecnico(repair.tecnico || "");
    setModelo(repair.modelo || "");
    setTrabajo(repair.trabajoARealizar || "");
    setStatus(repair.status);
    setTipoPantalla(repair.tipoPantalla ?? null);
    setCargos(repair.cargosAdicionales || []);
    setNewDesc("");
    setNewMonto("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const addCargo = () => {
    const m = parseFloat(newMonto);
    if (!newDesc.trim()) { toast.error("Escribe la descripción del producto"); return; }
    if (isNaN(m) || m <= 0) { toast.error("Monto inválido"); return; }
    setCargos(prev => [...prev, { id: Date.now(), desc: newDesc.trim(), monto: m }]);
    setNewDesc("");
    setNewMonto("");
  };

  const removeCargo = (id: number) => {
    setCargos(prev => prev.filter(c => c.id !== id));
  };

  const totalCalc = (parseFloat(costo) || 0) + cargos.reduce((a, c) => a + c.monto, 0);

  const save = async () => {
    const costoNum = parseFloat(costo);
    if (isNaN(costoNum) || costoNum < 0) { toast.error("Precio inválido"); return; }
    if ((tipoPantalla as any) != null && tipoPantalla !== "InCell" && tipoPantalla !== "OLED") {
      toast.error("Selecciona el tipo de pantalla: InCell u OLED");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/repairs/${repair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costo: costoNum,
          tecnico: tecnico || null,
          modelo: modelo || null,
          trabajoARealizar: trabajo || null,
          status: status,
          tipoPantalla: (tipoPantalla === "" ? null : tipoPantalla),
          cargosAdicionales: cargos,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar");
      }
      const updated: Repair = {
        ...repair,
        costo: costoNum,
        tecnico: tecnico || undefined,
        modelo,
        trabajoARealizar: trabajo,
        status,
        tipoPantalla: (tipoPantalla === "" ? null : tipoPantalla) as Repair["tipoPantalla"],
        cargosAdicionales: cargos,
      };
      toast.success("Cambios guardados");
      onSaved(updated);
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── Modo lectura (no editing)
  if (!editing) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-black text-primary text-base leading-tight">{repair.codigo}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Ingreso: {formatDate(repair.fecha)}
                {repair.fecha_despacho && ` · Salida: ${formatDate(repair.fecha_despacho)}`}
              </div>
            </div>
            <Badge variant="secondary" className={`text-[10px] shrink-0 ${statusColors[repair.status] || ""}`}>
              {repair.status}
            </Badge>
          </div>

          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold text-slate-800">{repair.cliente}</span>
              {repair.telefono && <span className="text-slate-400"> · {repair.telefono}</span>}
            </div>
            <div className="text-slate-600">
              {repair.marca} {repair.modelo}
              {repair.color && <span className="text-slate-400"> · {repair.color}</span>}
              {repair.serie && <span className="text-slate-400"> · IMEI {repair.serie}</span>}
            </div>
            {repair.tecnico && (
              <div className="text-xs text-emerald-700 font-semibold">🛠️ {repair.tecnico}</div>
            )}
            {repair.trabajoARealizar && (
              <div className="text-xs text-slate-600 italic mt-1 line-clamp-2">"{repair.trabajoARealizar}"</div>
            )}
            {(repair.cargosAdicionales?.length ?? 0) > 0 && (
              <div className="text-[11px] text-slate-500">
                + {repair.cargosAdicionales!.length} cargo{repair.cargosAdicionales!.length !== 1 ? "s" : ""} adicional{repair.cargosAdicionales!.length !== 1 ? "es" : ""}
              </div>
            )}
            <div className="text-right font-bold text-slate-700 pt-1">
              RD$ {totalCosto(repair).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button size="sm" className="gap-1.5" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5" /> Editar rápido
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenFullModal}>
              <ExternalLink className="h-3.5 w-3.5" /> Editar normal
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Modo edición
  return (
    <Card className="border-2 border-primary/40 shadow-md">
      <CardContent className="p-4 space-y-3 bg-primary/[0.02]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-black text-primary text-base leading-tight">{repair.codigo}</div>
            <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Modo edición rápida</div>
          </div>
          <Badge variant="secondary" className={`text-[10px] shrink-0 ${statusColors[repair.status] || ""}`}>
            {repair.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Estado — primero para que sea el cambio más visible */}
          <div>
            <Label className="text-xs font-semibold text-slate-600">Estado</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {ALL_STATUSES.map(s => {
                const active = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`text-xs font-semibold px-2 py-2 rounded-md border transition-all ${
                      active
                        ? `${statusColors[s] || "bg-slate-200 text-slate-800 border-slate-300"} ring-2 ring-primary/40`
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {(status === "Entregado bueno" || status === "Entregado malo") && (
              <p className="text-[11px] text-amber-700 mt-1.5 leading-snug">
                ⚠ Al guardar, se seteará automáticamente la <strong>fecha de salida</strong> con la hora actual.
              </p>
            )}
          </div>

          {/* Precio */}
          <div>
            <Label htmlFor={`costo-${repair.id}`} className="text-xs font-semibold text-slate-600">Precio base (RD$)</Label>
            <Input
              id={`costo-${repair.id}`}
              type="number"
              inputMode="decimal"
              value={costo}
              onChange={e => setCosto(e.target.value)}
              className="h-10 text-base font-bold"
              placeholder="0"
            />
          </div>

          {/* Técnico */}
          <div>
            <Label htmlFor={`tec-${repair.id}`} className="text-xs font-semibold text-slate-600">Técnico</Label>
            <select
              id={`tec-${repair.id}`}
              value={tecnico}
              onChange={e => setTecnico(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">— Sin asignar —</option>
              <option value="Oscar">Oscar</option>
              <option value="Freddy">Freddy</option>
              <option value="Carlos">Carlos</option>
            </select>
          </div>

          {/* Modelo */}
          <div>
            <Label htmlFor={`mod-${repair.id}`} className="text-xs font-semibold text-slate-600">Modelo</Label>
            <Input
              id={`mod-${repair.id}`}
              value={modelo}
              onChange={e => setModelo(e.target.value)}
              className="h-10 text-sm"
              placeholder="Ej: iPhone 11, MOTO G PURE..."
            />
          </div>

          {/* Trabajo a realizar */}
          <div>
            <Label htmlFor={`trab-${repair.id}`} className="text-xs font-semibold text-slate-600">Trabajo a realizar</Label>
            <textarea
              id={`trab-${repair.id}`}
              value={trabajo}
              onChange={e => setTrabajo(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
              placeholder="Describe el trabajo (cambio de pantalla, batería, software...)"
            />
          </div>

          {/* ¿Es reparación de pantalla? — replica la UI del modal normal */}
          <div className="space-y-2 border-t pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`esPantalla-${repair.id}`}
                checked={tipoPantalla !== null}
                onCheckedChange={(checked) => setTipoPantalla(checked ? ("" as any) : null)}
              />
              <Label htmlFor={`esPantalla-${repair.id}`} className="cursor-pointer font-semibold text-sm">
                ¿Es reparación de pantalla?
              </Label>
            </div>
            {tipoPantalla !== null && (
              <div className="flex gap-2 items-center">
                {tipoPantalla === "" && (
                  <span className="text-xs text-red-500 font-semibold mr-1">Elige el tipo:</span>
                )}
                {(["InCell", "OLED"] as const).map(tipo => {
                  const active = tipoPantalla === tipo;
                  const isPending = tipoPantalla === "";
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoPantalla(tipo)}
                      className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                        active
                          ? "bg-black text-white border-black"
                          : isPending
                            ? "bg-white text-red-600 border-red-300 hover:border-red-500"
                            : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {tipo}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cargos adicionales */}
          <div>
            <Label className="text-xs font-semibold text-slate-600">Cargos / productos adicionales</Label>
            {cargos.length > 0 && (
              <div className="space-y-1.5 mt-1.5">
                {cargos.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded-md px-2 py-1.5">
                    <div className="flex-1 truncate">{c.desc}</div>
                    <div className="font-bold text-slate-700 shrink-0">RD$ {c.monto.toLocaleString()}</div>
                    <button
                      type="button"
                      onClick={() => removeCargo(c.id)}
                      className="text-slate-400 hover:text-red-500 shrink-0"
                      aria-label="Quitar cargo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-[1fr,90px,auto] gap-1.5 mt-1.5">
              <Input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Descripción"
                className="h-9 text-xs"
              />
              <Input
                type="number"
                inputMode="decimal"
                value={newMonto}
                onChange={e => setNewMonto(e.target.value)}
                placeholder="Monto"
                className="h-9 text-xs"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                onClick={addCargo}
                aria-label="Añadir producto"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Total preview */}
          <div className="flex items-center justify-between text-sm pt-1 border-t">
            <span className="text-slate-500 font-medium">Total (con cargos):</span>
            <span className="font-black text-primary text-lg">RD$ {totalCalc.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// HistoryBetaPage
// ─────────────────────────────────────────────────────────────
export default function HistoryBetaPage() {
  const [results, setResults]   = useState<Repair[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Repair | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null); // optimistic lock

  // Filtros
  const [q, setQ]           = useState("");
  const [status, setStatus] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [desde, setDesde]   = useState("");
  const [hasta, setHasta]   = useState("");

  const buildUrl = useCallback((p: number) => {
    const params = new URLSearchParams({ limit: String(PER_PAGE), page: String(p) });
    if (q)       params.set("q", q);
    if (status)  params.set("status", status);
    if (tecnico) params.set("tecnico", tecnico);
    if (desde)   params.set("desde", desde);
    if (hasta)   params.set("hasta", hasta);
    return `/api/repairs?${params}`;
  }, [q, status, tecnico, desde, hasta]);

  const load = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(buildUrl(p));
      const json = await res.json();
      setResults(json.data);
      setTotal(json.total);
      setPage(p);
    } finally {
      setIsLoading(false);
    }
  }, [buildUrl]);

  // Búsqueda con debounce al escribir
  useEffect(() => {
    const t = setTimeout(() => load(1), 400);
    return () => clearTimeout(t);
  }, [q, status, tecnico, desde, hasta]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const clearFilters = () => { setQ(""); setStatus(""); setTecnico(""); setDesde(""); setHasta(""); };
  const hasFilters = q || status || tecnico || desde || hasta;

  const onQuickEditSaved = (updated: Repair) => {
    setResults(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-7 w-7 text-primary" /> Historial de Reparaciones <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">BETA</span>
          </h1>
          <p className="text-slate-500 text-sm">
            {total.toLocaleString()} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Código, cliente, teléfono, modelo, IMEI..."
                className="pl-9"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>

            <div>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="En reparación">En reparación</option>
                <option value="Listo para entregar">Listo para entregar</option>
                <option value="No se pudo reparar">No se pudo reparar</option>
                <option value="Entregado bueno">Entregado bueno</option>
                <option value="Entregado malo">Entregado malo</option>
              </select>
            </div>

            <div>
              <select
                value={tecnico}
                onChange={e => setTecnico(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Todos los técnicos</option>
                <option value="Oscar">Oscar</option>
                <option value="Freddy">Freddy</option>
                <option value="Carlos">Carlos</option>
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="h-9 text-sm" title="Desde" />
              </div>
              <div className="flex-1">
                <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="h-9 text-sm" title="Hasta" />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-slate-400 hover:text-red-500" onClick={clearFilters} title="Limpiar filtros">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtros compactos solo mobile (chips visuales con los mismos selects) */}
          <div className="md:hidden mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {status || "Todos los estados"}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {tecnico || "Todos los técnicos"}
            </span>
            {desde && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">Desde: {desde}</span>}
            {hasta && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">Hasta: {hasta}</span>}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-semibold border border-red-200"
              >
                Limpiar
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla — solo md+ */}
      <Card className="border-none shadow-sm overflow-hidden hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold w-[110px]">Código</TableHead>
                <TableHead className="font-bold w-[140px]">Ingreso</TableHead>
                <TableHead className="font-bold w-[140px]">Salida</TableHead>
                <TableHead className="font-bold">Cliente</TableHead>
                <TableHead className="font-bold">Equipo</TableHead>
                <TableHead className="font-bold">Técnico</TableHead>
                <TableHead className="font-bold">Estado</TableHead>
                <TableHead className="font-bold text-right">Total</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="h-32 text-center text-slate-400">Buscando...</TableCell></TableRow>
              ) : results.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-32 text-center text-slate-400 italic">Sin resultados para esta búsqueda.</TableCell></TableRow>
              ) : results.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-black text-primary text-xs">{r.codigo}</TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(r.fecha)}</TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(r.fecha_despacho)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{r.cliente}</div>
                    <div className="text-xs text-slate-400">{r.telefono}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{r.marca} {r.modelo}</div>
                    {r.serie && <div className="text-xs text-slate-400">IMEI: {r.serie}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{r.tecnico || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm text-slate-700">
                    RD$ {totalCosto(r).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => setSelected(r)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cards mobile — edición rápida inline */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <Card className="border-none shadow-sm"><CardContent className="py-10 text-center text-slate-400 text-sm">Buscando...</CardContent></Card>
        ) : results.length === 0 ? (
          <Card className="border-none shadow-sm"><CardContent className="py-10 text-center text-slate-400 text-sm italic">Sin resultados para esta búsqueda.</CardContent></Card>
        ) : results.map(r => (
          <MobileQuickEdit
            key={r.id}
            repair={r}
            onSaved={onQuickEditSaved}
            onOpenFullModal={() => setSelected(r)}
          />
        ))}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 px-1">
          <button
            className="px-4 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-medium"
            disabled={page === 1}
            onClick={() => load(page - 1)}
          >← Anterior</button>
          <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong> · {total.toLocaleString()} registros</span>
          <button
            className="px-4 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-medium"
            disabled={page === totalPages}
            onClick={() => load(page + 1)}
          >Siguiente →</button>
        </div>
      )}

      {selected && (
        <RepairDetailModal
          repair={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
