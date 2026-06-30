"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Database, Eye, X, Printer, Trash2 } from "lucide-react";
import { Repair } from "@/lib/types";
import { formatDateTimeCompact } from "@/lib/date";
import RepairDetailModal from "@/components/RepairDetailModal";
import PrintTicket from "@/components/PrintTicket";
import { useAuth } from "@/context/AuthContext";

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

export default function HistoryBetaPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [results, setResults]   = useState<Repair[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Repair | null>(null);
  const [printTarget, setPrintTarget] = useState<Repair | null>(null);

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

      {/* Cards — solo mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <Card className="border-none shadow-sm"><CardContent className="py-10 text-center text-slate-400 text-sm">Buscando...</CardContent></Card>
        ) : results.length === 0 ? (
          <Card className="border-none shadow-sm"><CardContent className="py-10 text-center text-slate-400 text-sm italic">Sin resultados para esta búsqueda.</CardContent></Card>
        ) : results.map(r => (
          <Card key={r.id} className="border-none shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-black text-primary text-base leading-tight">{r.codigo}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ingreso: {formatDate(r.fecha)}
                    {r.fecha_despacho && ` · Salida: ${formatDate(r.fecha_despacho)}`}
                  </div>
                </div>
                <Badge variant="secondary" className={`text-[10px] shrink-0 ${statusColors[r.status] || ""}`}>
                  {r.status}
                </Badge>
              </div>

              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-semibold text-slate-800">{r.cliente}</span>
                  {r.telefono && <span className="text-slate-400"> · {r.telefono}</span>}
                </div>
                <div className="text-slate-600">
                  {r.marca} {r.modelo}
                  {r.color && <span className="text-slate-400"> · {r.color}</span>}
                  {r.serie && <span className="text-slate-400"> · IMEI {r.serie}</span>}
                </div>
                {r.tecnico && (
                  <div className="text-xs text-emerald-700 font-semibold">🛠️ {r.tecnico}</div>
                )}
                <div className="text-right font-bold text-slate-700 pt-1">
                  RD$ {totalCosto(r).toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setSelected(r)}
                >
                  <Eye className="h-3.5 w-3.5" /> Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setPrintTarget(r);
                    setTimeout(() => window.print(), 200);
                  }}
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="col-span-2 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => { if (confirm(`¿Eliminar reparación ${r.codigo}?`)) alert("Eliminar requiere flujo de confirmación (pendiente integrar con el modal)."); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
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
      {printTarget && (
        <div className="print-only">
          <PrintTicket repair={printTarget} copies={2} />
        </div>
      )}
    </div>
  );
}
