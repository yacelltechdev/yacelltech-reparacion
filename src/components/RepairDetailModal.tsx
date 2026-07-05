"use client";
import { useState } from "react";
import { Repair } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, AlertCircle, Printer, X, PlusCircle, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import PrintTicket from "./PrintTicket";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const checklistLabels: Record<string, string> = {
  faceid: "FaceID", camara: "Cámara", senal: "Señal",
  microfono: "Micrófono", flash: "Flash/Luz", encendido: "Encendido",
  tactil: "Táctil", imagen: "Imagen", wifi: "WiFi",
  altavoz: "Altavoz", carga: "Carga", botones: "Botones",
};

const deliveredStatuses = ["Despachado bueno", "Despachado malo"];

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTotalCosto(repair: Repair) {
  return (repair.costo || 0) + (repair.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) || 0);
}

export default function RepairDetailModal({ repair: initialRepair, onClose }: { repair: Repair; onClose: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [repair, setRepair] = useState<Repair>(initialRepair);
  const [addingCargo, setAddingCargo] = useState(false);
  const [cargoDesc, setCargoDesc] = useState("");
  const [cargoMonto, setCargoMonto] = useState("");
  const [editingCargoId, setEditingCargoId] = useState<number | null>(null);
  const [editCargoDesc, setEditCargoDesc] = useState("");
  const [editCargoMonto, setEditCargoMonto] = useState("");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Repair>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [changingTecnico, setChangingTecnico] = useState(false);

  const handlePrint = () => window.print();

  const startEdit = () => {
    setEditData({
      cliente: repair.cliente, telefono: repair.telefono, cedula: repair.cedula,
      marca: repair.marca, modelo: repair.modelo, color: repair.color, serie: repair.serie,
      sintoma: repair.sintoma, observacion: repair.observacion, costo: repair.costo,
      tecnico: repair.tecnico, tipoClave: repair.tipoClave, claveTexto: repair.claveTexto,
      trabajoARealizar: repair.trabajoARealizar || "",
      cargosAdicionales: repair.cargosAdicionales ? [...repair.cargosAdicionales] : [],
      tipoPantalla: repair.tipoPantalla,
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if ((editData.tipoPantalla as any) === "") {
      toast.error("Selecciona el tipo de pantalla: InCell u OLED.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/repairs/${repair.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    if (res.ok) {
      setRepair({ ...repair, ...editData });
      setEditing(false);
      toast.success("Reparación actualizada");
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/repairs/${repair.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Reparación eliminada");
      onClose();
    } else {
      toast.error("Error al eliminar");
      setDeleting(false);
    }
  };

  const handleChangeTecnico = async (newTecnico: string) => {
    if (newTecnico === repair.tecnico) return;
    setChangingTecnico(true);
    const res = await fetch(`/api/repairs/${repair.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tecnico: newTecnico }),
    });
    if (res.ok) {
      setRepair({ ...repair, tecnico: newTecnico });
      toast.success(`Técnico cambiado a: ${newTecnico}`);
    } else {
      toast.error("Error al cambiar técnico");
    }
    setChangingTecnico(false);
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (newStatus === repair.status) return;
    setChangingStatus(true);
    const payload: any = { status: newStatus };
    if (newStatus === "Listo para entregar" || newStatus === "No se pudo reparar") {
      payload.fecha_despacho = null;
    }
    const res = await fetch(`/api/repairs/${repair.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setRepair({
        ...repair,
        status: newStatus as Repair["status"],
        fecha_despacho: deliveredStatuses.includes(newStatus) ? repair.fecha_despacho || new Date().toISOString() : payload.fecha_despacho ?? repair.fecha_despacho,
      });
      toast.success(`Estado cambiado a: ${newStatus}`);
    } else {
      toast.error("Error al cambiar estado");
    }
    setChangingStatus(false);
  };

  const handleDeleteCargo = async (id: number) => {
    const updatedCargos = (repair.cargosAdicionales || []).filter(c => c.id !== id);
    await fetch(`/api/repairs/${repair.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cargosAdicionales: updatedCargos })
    });
    setRepair({ ...repair, cargosAdicionales: updatedCargos });
  };

  const handleSaveEditCargo = async (id: number) => {
    if (!editCargoDesc.trim() || !editCargoMonto) return;
    const updatedCargos = (repair.cargosAdicionales || []).map(c =>
      c.id === id ? { ...c, desc: editCargoDesc.trim(), monto: Number(editCargoMonto) } : c
    );
    await fetch(`/api/repairs/${repair.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cargosAdicionales: updatedCargos })
    });
    setRepair({ ...repair, cargosAdicionales: updatedCargos });
    setEditingCargoId(null);
  };

  const handleAddCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoDesc.trim() || !cargoMonto) return;
    const nuevoCargo = { id: Date.now(), desc: cargoDesc.trim(), monto: Number(cargoMonto) };
    const updatedCargos = [...(repair.cargosAdicionales || []), nuevoCargo];

    await fetch(`/api/repairs/${repair.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cargosAdicionales: updatedCargos })
    });

    setRepair({ ...repair, cargosAdicionales: updatedCargos });
    setCargoDesc("");
    setCargoMonto("");
    setAddingCargo(false);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pb-[72px] lg:pb-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-white z-10 rounded-t-2xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Detalles de Orden</h2>
              <span className="text-2xl font-black text-primary">{repair.codigo}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>

          <div className="p-6 space-y-5">
            {/* Cliente & Equipo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Cliente</p>
                <p className="font-bold text-slate-900">{repair.cliente}</p>
                <p className="text-sm text-slate-500">{repair.telefono}</p>
                {repair.cedula && <p className="text-sm text-slate-500">Cédula: {repair.cedula}</p>}
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Equipo</p>
                <p className="font-bold text-slate-900">{repair.marca} {repair.modelo}</p>
                <p className="text-sm text-slate-500">Color: {repair.color || "N/A"} | IMEI: {repair.serie || "N/A"}</p>
                <p className="text-xs text-slate-400 mt-1">Estado inicial: <strong className={repair.estadoInicial === "Encendido" ? "text-emerald-600" : "text-red-600"}>{repair.estadoInicial}</strong></p>
                {repair.tipoPantalla && (
                  <p className="text-xs text-slate-500 mt-1">
                    Tipo de Pantalla: <strong className="text-indigo-600 font-bold">{repair.tipoPantalla}</strong>
                  </p>
                )}
                {isAdmin ? (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-emerald-700">🛠️</span>
                    <select
                      value={repair.tecnico || ""}
                      disabled={changingTecnico}
                      onChange={e => handleChangeTecnico(e.target.value)}
                      className="text-xs border border-emerald-200 rounded px-1 py-0.5 bg-white text-emerald-700 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    >
                      <option value="">Sin asignar</option>
                      <option value="Oscar">Oscar</option>
                      <option value="Freddy">Freddy</option>
                      <option value="Carlos">Carlos</option>
                    </select>
                    {changingTecnico && <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />}
                  </div>
                ) : (
                  repair.tecnico && <p className="text-xs text-emerald-700 font-bold mt-1">🛠️ {repair.tecnico}</p>
                )}
              </div>
            </div>

            {/* Síntoma & Observación */}
            <div className={`grid gap-4 ${repair.observacion ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Síntoma / Falla Reportada</p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">{repair.sintoma}</p>
              </div>
              {repair.observacion && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Observación</p>
                  <p className="text-sm italic text-slate-600 leading-relaxed">{repair.observacion}</p>
                </div>
              )}
            </div>

            {/* Trabajo a realizar */}
            {repair.trabajoARealizar && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Trabajo a Realizar</p>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">{repair.trabajoARealizar}</p>
              </div>
            )}

            {/* Checklist */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">Revisión de Entrada</p>
              {repair.estadoInicial === "Encendido" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(repair.checklist || {}).map(([key, val]) => (
                    <div key={key} className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${val ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                      {val ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {checklistLabels[key] || key}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm bg-red-50 rounded-lg p-3 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Equipo recibido APAGADO — no se realizó revisión previa.
                </div>
              )}
            </div>

            {/* Seguridad & Total */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-bold text-red-400 mb-2">Seguridad</p>
                {(!repair.tipoClave || repair.tipoClave === "sin clave") && <span className="font-bold text-red-800 italic">Desbloqueado</span>}
                {repair.tipoClave === "texto" && (
                  <div className="text-center">
                    <p className="text-[10px] text-red-600 mb-1">PIN / CONTRASEÑA:</p>
                    <p className="font-mono text-2xl font-black text-red-900 tracking-widest bg-white px-4 py-1 rounded-lg border border-red-300">{repair.claveTexto}</p>
                  </div>
                )}
                {repair.tipoClave === "patron" && <span className="text-sm font-bold text-red-700">Patrón registrado</span>}
              </div>

              <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-bold text-emerald-600 mb-2">Total a Pagar</p>
                <p className="text-3xl font-black text-emerald-700">RD$ {formatMoney(getTotalCosto(repair))}</p>
                {repair.cargosAdicionales && repair.cargosAdicionales.length > 0 && (
                  <div className="mt-2 text-[11px] text-emerald-700 w-full bg-emerald-100 rounded-lg p-2 space-y-1">
                    <div className="text-center">Base: RD$ {formatMoney(repair.costo)}</div>
                    {repair.cargosAdicionales.map(c => (
                      <div key={c.id}>
                        {editingCargoId === c.id ? (
                          <div className="flex gap-1 items-center">
                            <input
                              type="text"
                              value={editCargoDesc}
                              onChange={e => setEditCargoDesc(e.target.value)}
                              className="flex-[2] h-7 rounded border border-emerald-300 bg-white px-2 text-xs"
                            />
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editCargoMonto}
                              onChange={e => setEditCargoMonto(e.target.value)}
                              className="flex-1 h-7 rounded border border-emerald-300 bg-white px-2 text-xs w-16"
                            />
                            <button onClick={() => handleSaveEditCargo(c.id)} className="text-emerald-700 hover:text-emerald-900"><Check className="h-3 w-3" /></button>
                            <button onClick={() => setEditingCargoId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1">
                            <span>+ {c.desc}: RD$ {formatMoney(c.monto)}</span>
                            {!repair.status.includes("Entregado") && (
                              <div className="flex gap-1">
                                <button onClick={() => { setEditingCargoId(c.id); setEditCargoDesc(c.desc); setEditCargoMonto(String(c.monto)); }} className="text-emerald-600 hover:text-emerald-800"><Pencil className="h-3 w-3" /></button>
                                <button onClick={() => handleDeleteCargo(c.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!repair.status.includes("Entregado") && (
                  <button
                    onClick={() => setAddingCargo(true)}
                    className="mt-3 text-[11px] text-emerald-700 border border-emerald-300 bg-white rounded-md px-3 py-1 hover:bg-emerald-50 flex items-center gap-1"
                  >
                    <PlusCircle className="h-3 w-3" /> Agregar reparación
                  </button>
                )}
              </div>
            </div>

            {/* Formulario añadir cargo */}
            {addingCargo && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-3">Agregar Reparación Adicional</p>
                <form onSubmit={handleAddCargo} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Concepto (Ej: Batería)"
                    value={cargoDesc}
                    onChange={e => setCargoDesc(e.target.value)}
                    required
                    className="flex-[2] h-9 rounded-md border border-input bg-white px-3 py-1 text-sm"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="RD$"
                    value={cargoMonto}
                    onChange={e => setCargoMonto(e.target.value)}
                    required
                    className="flex-1 h-9 rounded-md border border-input bg-white px-3 py-1 text-sm"
                  />
                  <Button type="submit" size="sm">Guardar</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddingCargo(false)}>Cancelar</Button>
                </form>
              </div>
            )}

            {/* Estado */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-slate-500">Estado actual:</span>
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <select
                    value={repair.status}
                    disabled={changingStatus}
                    onChange={e => handleChangeStatus(e.target.value)}
                    className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {["En chequeo","En reparación","Listo para entregar","No se pudo reparar","Entregado a recepción","Despachado bueno","Despachado malo"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {changingStatus && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
                </div>
              ) : (
                <Badge variant="secondary" className="text-sm">{repair.status}</Badge>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex justify-between items-center bg-slate-50 rounded-b-2xl">
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Reimprimir Ticket
              </Button>
              {isAdmin && (
                <>
                  <Button variant="outline" className="gap-2" onClick={startEdit}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:border-red-300" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </Button>
                </>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>

      {/* Ticket para impresión */}
      <div className="print-only">
        <PrintTicket repair={repair} copies={2} />
      </div>

      {/* Modal Editar */}
      {editing && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">Editar Reparación — <span className="text-primary">{repair.codigo}</span></h2>
              <Button variant="ghost" size="icon" onClick={() => setEditing(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cliente</Label>
                  <Input value={editData.cliente || ""} onChange={e => setEditData(p => ({ ...p, cliente: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Teléfono</Label>
                  <Input value={editData.telefono || ""} onChange={e => setEditData(p => ({ ...p, telefono: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Cédula</Label>
                  <Input value={editData.cedula || ""} onChange={e => setEditData(p => ({ ...p, cedula: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Precio (RD$)</Label>
                  <Input type="text" inputMode="decimal" value={editData.costo ?? ""} onChange={e => setEditData(p => ({ ...p, costo: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label>Marca</Label>
                  <Input value={editData.marca || ""} onChange={e => setEditData(p => ({ ...p, marca: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Modelo</Label>
                  <Input value={editData.modelo || ""} onChange={e => setEditData(p => ({ ...p, modelo: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Color</Label>
                  <Input value={editData.color || ""} onChange={e => setEditData(p => ({ ...p, color: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>IMEI / Serie</Label>
                  <Input value={editData.serie || ""} onChange={e => setEditData(p => ({ ...p, serie: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Técnico</Label>
                  <select value={editData.tecnico || ""} onChange={e => setEditData(p => ({ ...p, tecnico: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="Oscar">Oscar</option>
                    <option value="Freddy">Freddy</option>
                    <option value="Carlos">Carlos</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>PIN / Clave</Label>
                  <Input value={editData.claveTexto || ""} onChange={e => setEditData(p => ({ ...p, claveTexto: e.target.value }))} placeholder="Dejar vacío si no aplica" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Trabajo / Concepto de reparación</Label>
                <Input value={editData.trabajoARealizar || ""} onChange={e => setEditData(p => ({ ...p, trabajoARealizar: e.target.value }))} placeholder="Ej: Cambio de pantalla, Cambio de batería..." />
              </div>
              <div className="space-y-2 border-t pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editEsPantalla"
                    checked={editData.tipoPantalla !== null && editData.tipoPantalla !== undefined}
                    onCheckedChange={checked => setEditData(p => ({ ...p, tipoPantalla: checked ? "" as any : null }))}
                  />
                  <Label htmlFor="editEsPantalla" className="cursor-pointer font-semibold">¿Es reparación de pantalla?</Label>
                </div>
                {editData.tipoPantalla != null && (
                  <div className="flex gap-2 mt-1 items-center">
                    {(editData.tipoPantalla as any) === "" && (
                      <span className="text-xs text-red-500 font-semibold mr-1">Elige el tipo:</span>
                    )}
                    {(["InCell", "OLED"] as const).map(tipo => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setEditData(p => ({ ...p, tipoPantalla: tipo }))}
                        className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                          editData.tipoPantalla === tipo
                            ? "bg-black text-white border-black"
                            : (editData.tipoPantalla as any) === ""
                              ? "bg-white text-red-600 border-red-300 hover:border-red-500"
                              : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Síntoma</Label>
                <Textarea value={editData.sintoma || ""} onChange={e => setEditData(p => ({ ...p, sintoma: e.target.value }))} className="min-h-[60px]" />
              </div>
              <div className="space-y-1">
                <Label>Observación</Label>
                <Textarea value={editData.observacion || ""} onChange={e => setEditData(p => ({ ...p, observacion: e.target.value }))} className="min-h-[60px]" />
              </div>

              {/* Reparaciones adicionales */}
              <div className="space-y-2">
                <Label>Reparaciones adicionales</Label>
                {(editData.cargosAdicionales || []).map((c, idx) => (
                  <div key={c.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="Descripción"
                      value={c.desc}
                      onChange={e => setEditData(p => ({
                        ...p,
                        cargosAdicionales: (p.cargosAdicionales || []).map((x, i) => i === idx ? { ...x, desc: e.target.value } : x)
                      }))}
                      className="flex-[2]"
                    />
                    <Input
                      type="number"
                      placeholder="RD$"
                      value={c.monto || ""}
                      onChange={e => setEditData(p => ({
                        ...p,
                        cargosAdicionales: (p.cargosAdicionales || []).map((x, i) => i === idx ? { ...x, monto: parseFloat(e.target.value) || 0 } : x)
                      }))}
                      className="flex-1"
                    />
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-9 w-9 text-red-400 hover:text-red-600 shrink-0"
                      onClick={() => setEditData(p => ({
                        ...p,
                        cargosAdicionales: (p.cargosAdicionales || []).filter((_, i) => i !== idx)
                      }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => setEditData(p => ({
                    ...p,
                    cargosAdicionales: [...(p.cargosAdicionales || []), { id: Date.now(), desc: "", monto: 0 }]
                  }))}
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar reparación
                </Button>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>{saving ? "Guardando..." : "Guardar Cambios"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
            <Trash2 className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-black mb-2">¿Eliminar esta orden?</h2>
            <p className="text-slate-500 text-sm mb-1"><strong>{repair.codigo}</strong> — {repair.cliente}</p>
            <p className="text-slate-400 text-xs mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button>
              <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
                {deleting ? "Eliminando..." : "Confirmar Eliminación"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
