"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Clock, Wrench, Pencil, Trash2, PlusCircle, Check, X, Phone, KeyRound, CalendarDays, StickyNote, Search } from "lucide-react";
import { Repair } from "@/lib/types";
import { todayRD, formatDateShort } from "@/lib/date";
import { toast } from "sonner";
import { playNewRepairSound } from "@/lib/sound";

function ChequeoModal({ repair, onSave, onCancel }: { repair: Repair; onSave: (data: { trabajoARealizar: string; costo: number }) => void; onCancel: () => void }) {
  const [trabajo, setTrabajo] = useState(repair.trabajoARealizar || "");
  const [costo, setCosto] = useState(repair.costo ?? 200);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <h3 className="text-lg font-bold text-amber-700 mb-1">Diagnóstico de Chequeo</h3>
        <p className="text-sm text-slate-500 mb-1">{repair.codigo} — {repair.cliente}</p>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">Al guardar, la orden pasa automáticamente a <strong>En reparación</strong>.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase">Trabajo a Realizar / Diagnóstico</label>
            <textarea
              autoFocus
              value={trabajo}
              onChange={e => setTrabajo(e.target.value)}
              rows={3}
              placeholder="Ej: Cambio de batería necesario, placa en buen estado..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-amber-300 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase">Costo (RD$)</label>
            <input
              type="number"
              value={costo}
              onChange={e => setCosto(Number(e.target.value))}
              min={0}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={() => onSave({ trabajoARealizar: trabajo, costo })} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700">Guardar Diagnóstico</button>
        </div>
      </div>
    </div>
  );
}

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

function EditFacturaModal({ repair, onSave, onCancel }: {
  repair: Repair;
  onSave: (data: { trabajoARealizar: string; costo: number; cargosAdicionales: { id: number; desc: string; monto: number }[] }) => void;
  onCancel: () => void;
}) {
  const [trabajo, setTrabajo] = useState(repair.trabajoARealizar || "");
  const [costo, setCosto] = useState(repair.costo ?? 0);
  const [cargos, setCargos] = useState<{ id: number; desc: string; monto: number }[]>(repair.cargosAdicionales || []);
  const [addingCargo, setAddingCargo] = useState(false);
  const [cargoDesc, setCargoDesc] = useState("");
  const [cargoMonto, setCargoMonto] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editMonto, setEditMonto] = useState("");

  const total = costo + cargos.reduce((a, c) => a + c.monto, 0);

  const handleAddCargo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoDesc.trim() || !cargoMonto) return;
    setCargos(prev => [...prev, { id: Date.now(), desc: cargoDesc.trim(), monto: Number(cargoMonto) }]);
    setCargoDesc(""); setCargoMonto(""); setAddingCargo(false);
  };

  const handleSaveEditCargo = (id: number) => {
    if (!editDesc.trim() || !editMonto) return;
    setCargos(prev => prev.map(c => c.id === id ? { ...c, desc: editDesc.trim(), monto: Number(editMonto) } : c));
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Editar Factura</h3>
        <p className="text-sm text-slate-500 mb-4">{repair.codigo} — {repair.cliente}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase">Trabajo Realizado</label>
            <textarea
              autoFocus
              value={trabajo}
              onChange={e => setTrabajo(e.target.value)}
              rows={3}
              placeholder="Ej: Cambio de pantalla, limpieza de placa..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase">Costo Base (RD$)</label>
            <input
              type="number"
              value={costo}
              onChange={e => setCosto(Number(e.target.value))}
              min={0}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Cargos adicionales */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Cargos Adicionales</label>
            {cargos.length > 0 && (
              <div className="space-y-1 mb-2">
                {cargos.map(c => (
                  <div key={c.id}>
                    {editingId === c.id ? (
                      <div className="flex gap-1 items-center">
                        <input
                          type="text"
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          className="flex-[2] h-8 rounded border border-slate-200 px-2 text-xs"
                        />
                        <input
                          type="number"
                          value={editMonto}
                          onChange={e => setEditMonto(e.target.value)}
                          className="flex-1 h-8 rounded border border-slate-200 px-2 text-xs w-20"
                        />
                        <button onClick={() => handleSaveEditCargo(c.id)} className="text-emerald-600 hover:text-emerald-800"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5 text-sm border border-slate-100">
                        <span className="text-slate-700">{c.desc} — <strong>RD$ {c.monto.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></span>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingId(c.id); setEditDesc(c.desc); setEditMonto(String(c.monto)); }} className="text-slate-400 hover:text-slate-600"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setCargos(prev => prev.filter(x => x.id !== c.id))} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {addingCargo ? (
              <form onSubmit={handleAddCargo} className="flex gap-2 items-center mt-1">
                <input
                  type="text"
                  placeholder="Concepto"
                  value={cargoDesc}
                  onChange={e => setCargoDesc(e.target.value)}
                  required
                  className="flex-[2] h-8 rounded-md border border-slate-200 px-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="RD$"
                  value={cargoMonto}
                  onChange={e => setCargoMonto(e.target.value)}
                  required
                  className="flex-1 h-8 rounded-md border border-slate-200 px-2 text-sm"
                />
                <button type="submit" className="text-emerald-600 hover:text-emerald-800"><Check className="h-4 w-4" /></button>
                <button type="button" onClick={() => setAddingCargo(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </form>
            ) : (
              <button
                onClick={() => setAddingCargo(true)}
                className="text-xs text-primary border border-primary/30 bg-white rounded-md px-3 py-1.5 hover:bg-primary/5 flex items-center gap-1 mt-1"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Añadir Cargo
              </button>
            )}
          </div>

          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-center">
            <p className="text-xs text-emerald-600 font-bold uppercase mb-0.5">Total</p>
            <p className="text-2xl font-black text-emerald-700">RD$ {total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button
            type="button"
            onClick={() => onSave({ trabajoARealizar: trabajo, costo, cargosAdicionales: cargos })}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TechnicianPage() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [history, setHistory] = useState<Repair[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [chequeoRepair, setChequeoRepair] = useState<Repair | null>(null);
  const [editFacturaRepair, setEditFacturaRepair] = useState<Repair | null>(null);
  const [diagnosticoEnabled, setDiagnosticoEnabled] = useState(false);
  const knownIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    loadRepairs();
    const interval = setInterval(loadRepairs, 10000);
    fetch("/api/config/tecnico_diagnostico_enabled")
      .then(r => r.json())
      .then(d => setDiagnosticoEnabled(d.value === "true"))
      .catch(() => {});
    return () => clearInterval(interval);
  }, [user]);

  const loadRepairs = async () => {
    try {
      const username = user?.username || "";
      const today = todayRD();

      const [resActive, resHistory] = await Promise.all([
        fetch(`/api/repairs?tecnico=${encodeURIComponent(username)}&active=true`),
        fetch(`/api/repairs?tecnico=${encodeURIComponent(username)}&despacho_desde=${today}&despacho_hasta=${today}`)
      ]);

      const active: Repair[] = await resActive.json();
      const historyData: Repair[] = await resHistory.json();

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
      setHistory(historyData.filter(r =>
        ["Entregado bueno", "Entregado malo"].includes(r.status)
      ));

      setIsLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveChequeo = async (data: { trabajoARealizar: string; costo: number }) => {
    if (!chequeoRepair) return;
    try {
      await fetch(`/api/repairs/${chequeoRepair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "En reparación" })
      });
      toast.success("Diagnóstico guardado — orden pasa a reparación");
      setChequeoRepair(null);
      loadRepairs();
    } catch {
      toast.error("Error al guardar diagnóstico");
    }
  };

  const handleSaveEditFactura = async (data: { trabajoARealizar: string; costo: number; cargosAdicionales: { id: number; desc: string; monto: number }[] }) => {
    if (!editFacturaRepair) return;
    try {
      await fetch(`/api/repairs/${editFacturaRepair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success("Factura actualizada");
      setEditFacturaRepair(null);
      loadRepairs();
    } catch {
      toast.error("Error al guardar factura");
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

      {/* Buscador */}
      {repairs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar por código, cliente, modelo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </div>
      )}

      {repairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <h3 className="text-xl font-bold">¡Todo al día!</h3>
          <p className="text-slate-500">No tienes reparaciones pendientes asignadas.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {repairs.filter(r => {
            const q = busqueda.toLowerCase().trim();
            if (!q) return true;
            return (
              r.codigo.toLowerCase().includes(q) ||
              r.cliente.toLowerCase().includes(q) ||
              r.modelo.toLowerCase().includes(q) ||
              r.marca.toLowerCase().includes(q) ||
              r.telefono?.toLowerCase().includes(q)
            );
          }).map(r => {
            const total = (r.costo ?? 0) + (r.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) ?? 0);
            const fechaEntrada = r.fecha ? formatDateShort(r.fecha) : "";
            return (
              <Card key={r.id} className="border-none shadow-md flex flex-col overflow-hidden">
                {/* Header coloreado por estado */}
                <div className={`px-4 pt-4 pb-3 ${
                  r.status === "En chequeo" ? "bg-orange-50 border-b border-orange-100" :
                  r.status === "En reparación" ? "bg-amber-50 border-b border-amber-100" :
                  r.status === "Listo para entregar" ? "bg-emerald-50 border-b border-emerald-100" :
                  "bg-red-50 border-b border-red-100"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-primary bg-white border border-primary/20 px-2.5 py-0.5 rounded-full">{r.codigo}</span>
                    {r.status === "En reparación" && <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">En taller</Badge>}
                    {r.status === "En chequeo" && <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Chequeo</Badge>}
                    {r.status === "Listo para entregar" && <Badge className="bg-emerald-500 text-xs">Listo</Badge>}
                    {r.status === "No se pudo reparar" && <Badge variant="destructive" className="text-xs">Sin solución</Badge>}
                  </div>
                  <p className="text-lg font-bold text-slate-800 leading-tight">{r.marca} {r.modelo}</p>
                  {r.color && <p className="text-xs text-slate-400">{r.color}{r.serie ? ` · S/N: ${r.serie}` : ""}</p>}
                  {fechaEntrada && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <CalendarDays className="h-3 w-3" /> Entrada: {fechaEntrada}
                    </p>
                  )}
                </div>

                <CardContent className="flex flex-col gap-3 flex-1 p-4">
                  {/* Cliente + Teléfono */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Cliente</p>
                      <p className="text-sm font-bold text-slate-800">{r.cliente}</p>
                    </div>
                    {r.telefono && (
                      <a
                        href={`tel:${r.telefono}`}
                        className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm px-3 py-1.5 rounded-xl hover:bg-emerald-100 active:bg-emerald-200 shrink-0"
                      >
                        <Phone className="h-4 w-4" /> {r.telefono}
                      </a>
                    )}
                  </div>

                  {/* Clave */}
                  {r.tipoClave && r.tipoClave !== "sin clave" && (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-xs text-slate-400 font-semibold uppercase">Clave</span>
                        <p className="text-sm font-bold text-slate-700">{r.tipoClave === "texto" ? r.claveTexto : "Patrón"}</p>
                      </div>
                    </div>
                  )}

                  {/* Falla */}
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Falla reportada</p>
                    <p className="text-sm font-semibold text-slate-800">{r.sintoma}</p>
                    <p className="text-xs text-slate-400 mt-1">Estado al ingreso: <strong>{r.estadoInicial}</strong></p>
                  </div>

                  {/* Trabajo / Diagnóstico */}
                  {r.trabajoARealizar && (
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                      <p className="text-xs font-bold text-blue-400 uppercase mb-1">Trabajo / Diagnóstico</p>
                      <p className="text-sm text-blue-900">{r.trabajoARealizar}</p>
                    </div>
                  )}

                  {/* Observaciones */}
                  {r.observacion && (
                    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                      <StickyNote className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800">{r.observacion}</p>
                    </div>
                  )}

                  {/* Monto */}
                  {total > 0 && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                      {r.cargosAdicionales && r.cargosAdicionales.length > 0 ? (
                        <>
                          <p className="text-xs text-slate-500">Base: <strong>RD$ {(r.costo ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></p>
                          {r.cargosAdicionales.map(c => (
                            <p key={c.id} className="text-xs text-slate-500">{c.desc}: <strong>RD$ {c.monto.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></p>
                          ))}
                          <div className="border-t border-emerald-200 mt-1.5 pt-1.5 flex justify-between items-center">
                            <span className="text-xs font-bold text-emerald-700 uppercase">Total</span>
                            <span className="text-xl font-black text-emerald-700">RD$ {total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-700 uppercase">Monto</span>
                          <span className="text-xl font-black text-emerald-700">RD$ {total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="mt-auto pt-1 flex flex-col gap-2">
                    {r.status === "En chequeo" && (
                      <>
                        {diagnosticoEnabled && (
                          <Button
                            className="w-full h-12 text-base border-orange-300 text-orange-700 hover:bg-orange-50"
                            variant="outline"
                            onClick={() => setChequeoRepair(r)}
                          >
                            <Wrench className="h-5 w-5 mr-2" /> Registrar Diagnóstico
                          </Button>
                        )}
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 h-12 text-base bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => {
                              if (!r.costo || r.costo <= 0) {
                                toast.error("Debe registrar el diagnóstico con el monto antes de marcar como lista.");
                                return;
                              }
                              updateStatus(r.id, "Listo para entregar");
                            }}
                          >
                            <CheckCircle2 className="h-5 w-5 mr-2" /> Está Lista
                          </Button>
                          <Button
                            variant="outline"
                            className="h-12 px-4 text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => setRejectId(r.id)}
                          >
                            <AlertTriangle className="h-5 w-5" />
                          </Button>
                        </div>
                      </>
                    )}
                    {r.status === "En reparación" && (
                      <>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 h-12 text-base bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => {
                              if (!r.costo || r.costo <= 0) {
                                toast.error("Debe ingresar el monto de la reparación antes de marcar como lista.");
                                return;
                              }
                              updateStatus(r.id, "Listo para entregar");
                            }}
                          >
                            <CheckCircle2 className="h-5 w-5 mr-2" /> Está Lista
                          </Button>
                          <Button
                            variant="outline"
                            className="h-12 px-4 text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => setRejectId(r.id)}
                          >
                            <AlertTriangle className="h-5 w-5" />
                          </Button>
                        </div>
                      </>
                    )}
                    {r.status !== "En reparación" && r.status !== "En chequeo" && (
                      <Button
                        variant="outline"
                        className="w-full h-11 text-slate-500 border-dashed"
                        onClick={() => updateStatus(r.id, "En reparación")}
                      >
                        ↺ Revertir a pendiente
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

      {chequeoRepair && (
        <ChequeoModal
          repair={chequeoRepair}
          onSave={handleSaveChequeo}
          onCancel={() => setChequeoRepair(null)}
        />
      )}

      {editFacturaRepair && (
        <EditFacturaModal
          repair={editFacturaRepair}
          onSave={handleSaveEditFactura}
          onCancel={() => setEditFacturaRepair(null)}
        />
      )}
    </div>
  );
}
