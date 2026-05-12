"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, MessageSquare, FileText } from "lucide-react";

type Preset = { id: number; texto: string; orden: number };

type FilaManual = {
  cliente: string;
  telefono: string;
  marca: string;
  modelo: string;
  trabajo: string;
  costo: string;
  tecnico: string;
};

const filaVacia = (): FilaManual => ({
  cliente: "", telefono: "", marca: "", modelo: "", trabajo: "", costo: "", tecnico: "Oscar",
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

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  const load = async () => {
    const res = await fetch("/api/observaciones-preset");
    setPresets(await res.json());
  };

  useEffect(() => { load(); }, []);

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
    const validas = filas.filter(f => f.cliente.trim() && f.telefono.trim() && f.marca.trim() && f.modelo.trim() && f.trabajo.trim() && parseFloat(f.costo) > 0);
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
          cedula: "",
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
