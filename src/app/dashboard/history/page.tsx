"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Database, Eye, X } from "lucide-react";
import { Repair } from "@/lib/types";
import RepairDetailModal from "@/components/RepairDetailModal";

const PER_PAGE = 50;

const statusColors: Record<string, string> = {
  "En reparación":      "bg-amber-100 text-amber-700 border-amber-200",
  "Listo para entregar":"bg-emerald-100 text-emerald-700 border-emerald-200",
  "No se pudo reparar": "bg-orange-100 text-orange-700 border-orange-200",
  "Entregado bueno":    "bg-blue-100 text-blue-700 border-blue-200",
  "Entregado malo":     "bg-red-100 text-red-700 border-red-200",
};

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

const totalCosto = (r: Repair) =>
  (r.costo || 0) + (r.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) || 0);

export default function HistoryPage() {
  const [results, setResults]   = useState<Repair[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Repair | null>(null);

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
            <Database className="h-7 w-7 text-primary" /> Historial de Reparaciones
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
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold w-[110px]">Código</TableHead>
                <TableHead className="font-bold w-[140px]">Ingreso</TableHead>
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
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-slate-400">Buscando...</TableCell></TableRow>
              ) : results.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-slate-400 italic">Sin resultados para esta búsqueda.</TableCell></TableRow>
              ) : results.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-black text-primary text-xs">{r.codigo}</TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(r.fecha)}</TableCell>
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

      {selected && <RepairDetailModal repair={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
