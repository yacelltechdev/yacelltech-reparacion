"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, MessageSquare, FileText, CalendarDays, Search } from "lucide-react";

import { Repair } from "@/lib/types";

type Preset = { id: number; texto: string; orden: number };

type FilaManual = {
  cliente: string;
  cedula: string;
  telefono: string;
  marca: string;
  modelo: string;
  trabajo: string;
  costo: string;
  tecnico: string;
};

const filaVacia = (): FilaManual => ({
  cliente: "", cedula: "", telefono: "", marca: "", modelo: "", trabajo: "", costo: "", tecnico: "Oscar",
});

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [nuevo, setNuevo] = useState("");
  const [loading, setLoading] = useState(false);

  // Ingreso manual
  const hoy = new Date().toISOString().slice(0, 10);
  const [fechaManual, setFechaManual] = useState(hoy);
  const [filas, setFilas] = useState<FilaManual[]>([filaVacia()]);
  const [subiendoManual, setSubiendoManual] = useState(false);

  // Corrección de fechas
  const [todasReparaciones, setTodasReparaciones] = useState<Repair[]>([]);
  const [busquedaFecha, setBusquedaFecha] = useState("");
  const [editandoFecha, setEditandoFecha] = useState<{ id: number; fecha: string; fecha_despacho: string } | null>(null);
  const [guardandoFecha, setGuardandoFecha] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  const load = async () => {
    const res = await fetch("/api/observaciones-preset");
    setPresets(await res.json());
  };

  useEffect(() => {
    load();
    fetch("/api/repairs").then(r => r.json()).then(setTodasReparaciones).catch(() => {});
  }, []);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.trim()) return;
    setLoading(true);
    const res = await fetch("/api/observaciones-preset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: nuevo.trim() }),
    });
    if (res.ok) {
      toast.success("Observación agregada");
      setNuevo("");
      load();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al agregar");
    }
    setLoading(false);
  };

  const actualizarFila = (idx: number, campo: keyof FilaManual, valor: string) => {
    setFilas(prev => prev.map((f, i) => i === idx ? { ...f, [campo]: valor } : f));
  };

  const subirManuales = async () => {
    const validas = filas.filter(f => f.cliente.trim() && parseFloat(f.costo) > 0);
    if (validas.length === 0) {
      toast.error("Completa al menos una fila con todos los campos.");
      return;
    }
    setSubiendoManual(true);
    let ok = 0, fail = 0;
    for (const f of validas) {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: f.cliente.trim(),
          telefono: f.telefono.trim(),
          cedula: f.cedula.trim(),
          marca: f.marca.trim(),
          modelo: f.modelo.trim(),
          color: "",
          serie: "",
          sintoma: f.trabajo.trim(),
          trabajoARealizar: f.trabajo.trim(),
          costo: parseFloat(f.costo),
          cargosAdicionales: [],
          status: "Entregado bueno",
          tecnico: f.tecnico,
          estadoInicial: "Apagado",
          tipoClave: "sin clave",
          claveTexto: "",
          tipoPantalla: null,
          observacion: "Factura manual",
          fecha: fechaManual + "T12:00:00",
          fecha_despacho: fechaManual,
          checklist: null,
          patronArray: [],
        }),
      });
      if (res.ok) ok++; else fail++;
    }
    setSubiendoManual(false);
    if (ok > 0) { toast.success(`${ok} factura(s) ingresada(s) correctamente.`); setFilas([filaVacia()]); }
    if (fail > 0) toast.error(`${fail} factura(s) fallaron.`);
  };

  const guardarFecha = async () => {
    if (!editandoFecha) return;
    setGuardandoFecha(true);
    try {
      const payload: any = { fecha: editandoFecha.fecha + "T12:00:00" };
      if (editandoFecha.fecha_despacho) payload.fecha_despacho = editandoFecha.fecha_despacho;
      await fetch(`/api/repairs/${editandoFecha.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success("Fecha actualizada correctamente");
      setTodasReparaciones(prev => prev.map(r =>
        r.id === editandoFecha.id
          ? { ...r, fecha: payload.fecha, fecha_despacho: payload.fecha_despacho ?? r.fecha_despacho }
          : r
      ));
      setEditandoFecha(null);
      setBusquedaFecha("");
    } catch {
      toast.error("Error al guardar fecha");
    }
    setGuardandoFecha(false);
  };

  const eliminar = async (id: number) => {
    const res = await fetch("/api/observaciones-preset", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { toast.success("Eliminado"); load(); }
    else toast.error("Error al eliminar");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel Admin</h1>
        <p className="text-slate-500 text-sm">Configuración del sistema</p>
      </div>

      {/* Ingreso Manual de Facturas */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary text-md">
            <FileText className="h-4 w-4" /> Ingreso Manual de Facturas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Fecha del día:</label>
            <Input
              type="date"
              value={fechaManual}
              onChange={e => setFechaManual(e.target.value)}
              className="w-44"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide">
                  <th className="pb-2 text-left font-semibold pr-2">Cliente</th>
                  <th className="pb-2 text-left font-semibold pr-2">Cédula</th>
                  <th className="pb-2 text-left font-semibold pr-2">Teléfono</th>
                  <th className="pb-2 text-left font-semibold pr-2">Marca</th>
                  <th className="pb-2 text-left font-semibold pr-2">Modelo</th>
                  <th className="pb-2 text-left font-semibold pr-2">Trabajo realizado</th>
                  <th className="pb-2 text-left font-semibold pr-2">Precio (RD$)</th>
                  <th className="pb-2 text-left font-semibold pr-2">Técnico</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {filas.map((f, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="pr-2 pb-2"><Input placeholder="Nombre" value={f.cliente} onChange={e => actualizarFila(idx, "cliente", e.target.value)} className="min-w-[130px]" /></td>
                    <td className="pr-2 pb-2"><Input placeholder="000-0000000-0" value={f.cedula} onChange={e => actualizarFila(idx, "cedula", e.target.value)} className="min-w-[120px]" /></td>
                    <td className="pr-2 pb-2"><Input placeholder="809-xxx-xxxx" value={f.telefono} onChange={e => actualizarFila(idx, "telefono", e.target.value)} className="min-w-[120px]" /></td>
                    <td className="pr-2 pb-2"><Input placeholder="Samsung" value={f.marca} onChange={e => actualizarFila(idx, "marca", e.target.value)} className="min-w-[100px]" /></td>
                    <td className="pr-2 pb-2"><Input placeholder="Galaxy A54" value={f.modelo} onChange={e => actualizarFila(idx, "modelo", e.target.value)} className="min-w-[110px]" /></td>
                    <td className="pr-2 pb-2"><Input placeholder="Cambio de pantalla" value={f.trabajo} onChange={e => actualizarFila(idx, "trabajo", e.target.value)} className="min-w-[160px]" /></td>
                    <td className="pr-2 pb-2"><Input type="number" placeholder="0" value={f.costo} onChange={e => actualizarFila(idx, "costo", e.target.value)} className="min-w-[90px]" /></td>
                    <td className="pr-2 pb-2">
                      <Select value={f.tecnico} onValueChange={v => actualizarFila(idx, "tecnico", v ?? "Oscar")}>
                        <SelectTrigger className="min-w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Oscar">Oscar</SelectItem>
                          <SelectItem value="Freddy">Freddy</SelectItem>
                          <SelectItem value="Carlos">Carlos</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="pb-2">
                      {filas.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setFilas(prev => prev.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total en vivo */}
          {(() => {
            const total = filas.reduce((sum, f) => sum + (parseFloat(f.costo) || 0), 0);
            const count = filas.filter(f => f.cliente.trim() && parseFloat(f.costo) > 0).length;
            return total > 0 ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <span className="text-sm text-emerald-700 font-medium">{count} factura(s) con monto</span>
                <span className="text-xl font-black text-emerald-700">
                  RD$ {total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ) : null;
          })()}

          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => setFilas(prev => [...prev, filaVacia()])}>
              <Plus className="h-4 w-4 mr-1" /> Agregar fila
            </Button>
            <Button onClick={subirManuales} disabled={subiendoManual} className="ml-auto">
              {subiendoManual ? "Guardando..." : `Guardar ${filas.filter(f => f.cliente.trim()).length || ""} factura(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Corrección de fechas */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary text-md">
            <CalendarDays className="h-4 w-4" /> Corrección de Fechas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">Busca una reparación y ajusta su fecha de entrada o despacho para el cuadre.</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Buscar por código o cliente..."
              value={busquedaFecha}
              onChange={e => { setBusquedaFecha(e.target.value); setEditandoFecha(null); }}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {busquedaFecha.trim().length >= 2 && (() => {
            const q = busquedaFecha.toLowerCase().trim();
            const resultados = todasReparaciones.filter(r =>
              r.codigo.toLowerCase().includes(q) || r.cliente.toLowerCase().includes(q)
            ).slice(0, 8);

            if (resultados.length === 0) return <p className="text-sm text-slate-400 text-center py-2">Sin resultados.</p>;

            return (
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                {resultados.map(r => {
                  const isEditing = editandoFecha?.id === r.id;
                  const fechaEntrada = r.fecha ? r.fecha.slice(0, 10) : "";
                  const fechaDespacho = r.fecha_despacho ? r.fecha_despacho.slice(0, 10) : "";
                  return (
                    <div key={r.id} className="bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded mr-2">{r.codigo}</span>
                          <span className="text-sm font-semibold text-slate-800">{r.cliente}</span>
                          <span className="text-xs text-slate-400 ml-2">{r.marca} {r.modelo}</span>
                        </div>
                        {!isEditing && (
                          <button
                            onClick={() => setEditandoFecha({ id: r.id, fecha: fechaEntrada, fecha_despacho: fechaDespacho })}
                            className="text-xs font-bold text-primary border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 shrink-0"
                          >
                            Editar
                          </button>
                        )}
                      </div>

                      {isEditing && (
                        <div className="mt-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fecha de entrada</label>
                              <Input
                                type="date"
                                value={editandoFecha.fecha}
                                onChange={e => setEditandoFecha(prev => prev ? { ...prev, fecha: e.target.value } : prev)}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fecha despacho</label>
                              <Input
                                type="date"
                                value={editandoFecha.fecha_despacho}
                                onChange={e => setEditandoFecha(prev => prev ? { ...prev, fecha_despacho: e.target.value } : prev)}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditandoFecha(null)}>Cancelar</Button>
                            <Button size="sm" onClick={guardarFecha} disabled={guardandoFecha}>
                              {guardandoFecha ? "Guardando..." : "Guardar fecha"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary text-md">
            <MessageSquare className="h-4 w-4" /> Observaciones Predefinidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={agregar} className="flex gap-2">
            <Input
              placeholder="Ej: Esta pelado, Pantalla astillada..."
              value={nuevo}
              onChange={e => setNuevo(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !nuevo.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </form>

          {presets.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No hay observaciones predefinidas aún.</p>
          ) : (
            <div className="space-y-2">
              {presets.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-2">
                  <span className="text-sm">{p.texto}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => eliminar(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
