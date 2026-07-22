"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, MessageSquare, FileText, CalendarDays, Search, Settings2, ShieldAlert, UserX, Ban, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

import { Repair } from "@/lib/types";
import { todayRD } from "@/lib/date";

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

interface ClienteBloqueado {
  id: number;
  cedula: string;
  cedula_formato?: string;
  nombre?: string;
  motivo?: string;
  creado_en: string;
  creado_por?: string;
}

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
  const hoy = todayRD();
  const [fechaManual, setFechaManual] = useState(hoy);
  const [filas, setFilas] = useState<FilaManual[]>([filaVacia()]);
  const [subiendoManual, setSubiendoManual] = useState(false);

  // Corrección de fechas
  const [todasReparaciones, setTodasReparaciones] = useState<Repair[]>([]);
  const [busquedaFecha, setBusquedaFecha] = useState("");
  const [editandoFecha, setEditandoFecha] = useState<{ id: number; fecha: string; fecha_despacho: string } | null>(null);
  const [guardandoFecha, setGuardandoFecha] = useState(false);

  // Ajustes
  const [diagnosticoEnabled, setDiagnosticoEnabled] = useState(false);
  const [togglingDiagnostico, setTogglingDiagnostico] = useState(false);

  // Clientes Bloqueados
  const [bloqueados, setBloqueados] = useState<ClienteBloqueado[]>([]);
  const [bloqueadosError, setBloqueadosError] = useState<string | null>(null);
  const [nuevoBloqueo, setNuevoBloqueo] = useState({ cedula: "", nombre: "", motivo: "" });
  const [agregandoBloqueo, setAgregandoBloqueo] = useState(false);
  const [busquedaBloqueados, setBusquedaBloqueados] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    fetch("/api/config/tecnico_diagnostico_enabled")
      .then(r => r.json())
      .then(d => setDiagnosticoEnabled(d.value === "true"))
      .catch(() => {});
  }, []);

  const loadBloqueados = async () => {
    try {
      const res = await fetch("/api/clientes-bloqueados");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setBloqueados(data);
        setBloqueadosError(null);
      } else if (data?.error) {
        setBloqueadosError(data.error);
      }
    } catch (err: any) {
      setBloqueadosError(err.message || "Error de conexión");
    }
  };

  const agregarBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoBloqueo.cedula.trim()) {
      toast.error("La cédula es obligatoria para bloquear");
      return;
    }
    setAgregandoBloqueo(true);
    try {
      const res = await fetch("/api/clientes-bloqueados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: nuevoBloqueo.cedula.trim(),
          nombre: nuevoBloqueo.nombre.trim(),
          motivo: nuevoBloqueo.motivo.trim(),
          creado_por: user?.username || "admin",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Cliente agregado a la lista de bloqueados");
        setNuevoBloqueo({ cedula: "", nombre: "", motivo: "" });
        loadBloqueados();
      } else {
        toast.error(data.error || "Error al bloquear cliente");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setAgregandoBloqueo(false);
    }
  };

  const desbloquearCliente = async (id: number, cedula: string) => {
    if (!confirm(`¿Estás seguro de desbloquear la cédula ${cedula}?`)) return;
    try {
      const res = await fetch("/api/clientes-bloqueados", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Cliente desbloqueado correctamente");
        loadBloqueados();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al desbloquear");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const toggleDiagnostico = async (val: boolean) => {
    setTogglingDiagnostico(true);
    try {
      await fetch("/api/config/tecnico_diagnostico_enabled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: val }),
      });
      setDiagnosticoEnabled(val);
      toast.success(val ? "Diagnóstico habilitado para técnicos" : "Diagnóstico deshabilitado para técnicos");
    } catch {
      toast.error("Error al actualizar ajuste");
    }
    setTogglingDiagnostico(false);
  };

  const load = async () => {
    const res = await fetch("/api/observaciones-preset");
    setPresets(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!busquedaFecha.trim() || busquedaFecha.trim().length < 2) {
      setTodasReparaciones([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/repairs?q=${encodeURIComponent(busquedaFecha.trim())}&limit=8`)
        .then(r => r.json())
        .then(res => {
          // La API con limit > 0 devuelve { data, total }
          setTodasReparaciones(res.data || []);
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [busquedaFecha]);

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
          status: "Despachado bueno",
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

      {/* Clientes Bloqueados (Lista Negra) */}
      <Card className="border-none shadow-sm border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 text-md">
            <ShieldAlert className="h-5 w-5 text-red-600" /> Clientes Bloqueados (Lista Negra)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            Los clientes o cédulas registradas aquí serán automáticamente bloqueados en Recepción y el sistema no permitirá crear reparaciones a su nombre.
          </p>

          {/* Formulario de bloqueo */}
          <form onSubmit={agregarBloqueo} className="grid gap-3 sm:grid-cols-3 bg-slate-50 p-3 rounded-lg border">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Cédula *</label>
              <Input
                placeholder="000-0000000-0"
                value={nuevoBloqueo.cedula}
                onChange={e => setNuevoBloqueo({ ...nuevoBloqueo, cedula: e.target.value })}
                className="bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre (Opcional)</label>
              <Input
                placeholder="Nombre del cliente"
                value={nuevoBloqueo.nombre}
                onChange={e => setNuevoBloqueo({ ...nuevoBloqueo, nombre: e.target.value })}
                className="bg-white text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Motivo de bloqueo</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: Cliente conflictivo / no pagó"
                  value={nuevoBloqueo.motivo}
                  onChange={e => setNuevoBloqueo({ ...nuevoBloqueo, motivo: e.target.value })}
                  className="bg-white text-xs flex-1"
                />
                <Button type="submit" variant="destructive" size="sm" disabled={agregandoBloqueo || !nuevoBloqueo.cedula.trim()}>
                  <Ban className="h-4 w-4 mr-1" /> Bloquear
                </Button>
              </div>
            </div>
          </form>

          {/* Lista de bloqueados */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Clientes bloqueados ({bloqueados.length})
              </span>
              {bloqueados.length > 0 && (
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Filtrar por cédula/nombre..."
                    value={busquedaBloqueados}
                    onChange={e => setBusquedaBloqueados(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              )}
            </div>

            {bloqueadosError ? (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs p-3.5 rounded-md flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Atención: No se pudo consultar la tabla en Supabase</p>
                  <p className="mt-0.5 text-[11px] opacity-90">
                    Detalle: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">{bloqueadosError}</code>
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-amber-800">
                    💡 Si la tabla aún no se ha creado en Supabase, ejecuta el script SQL en el <strong>SQL Editor</strong> de tu proyecto.
                  </p>
                </div>
              </div>
            ) : bloqueados.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-md border border-dashed">
                No hay clientes bloqueados en el sistema.
              </p>
            ) : (
              <div className="divide-y rounded-lg border bg-white overflow-hidden">
                {bloqueados
                  .filter(b => {
                    if (!busquedaBloqueados.trim()) return true;
                    const q = busquedaBloqueados.toLowerCase();
                    return (
                      b.cedula.toLowerCase().includes(q) ||
                      (b.cedula_formato && b.cedula_formato.toLowerCase().includes(q)) ||
                      (b.nombre && b.nombre.toLowerCase().includes(q)) ||
                      (b.motivo && b.motivo.toLowerCase().includes(q))
                    );
                  })
                  .map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 hover:bg-red-50/40 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            {b.cedula_formato || b.cedula}
                          </span>
                          {b.nombre && <span className="text-xs font-semibold text-slate-800">{b.nombre}</span>}
                        </div>
                        {b.motivo && (
                          <p className="text-xs text-red-600 font-medium">
                            <span className="text-slate-400 font-normal">Motivo:</span> {b.motivo}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">
                          {b.creado_en || (b as any).created_at ? `Bloqueado el ${new Date(b.creado_en || (b as any).created_at).toLocaleDateString("es-DO")}` : "Bloqueado"} {b.creado_por ? `por ${b.creado_por}` : ""}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-slate-600 hover:text-green-700 hover:bg-green-50 border-slate-200"
                        onClick={() => desbloquearCliente(b.id, b.cedula_formato || b.cedula)}
                      >
                        Desbloquear
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary text-md">
            <Settings2 className="h-4 w-4" /> Ajustes de Técnicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Registro de diagnóstico</p>
              <p className="text-xs text-slate-500">Permite a los técnicos registrar el diagnóstico en órdenes &quot;En chequeo&quot;</p>
            </div>
            <Switch
              checked={diagnosticoEnabled}
              onCheckedChange={toggleDiagnostico}
              disabled={togglingDiagnostico}
            />
          </div>
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
