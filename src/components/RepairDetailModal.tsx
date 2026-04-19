"use client";
import { useState } from "react";
import { Repair } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, Printer, X, PlusCircle } from "lucide-react";
import PrintTicket from "./PrintTicket";

const checklistLabels: Record<string, string> = {
  faceid: "FaceID", camara: "Cámara", senal: "Señal",
  microfono: "Micrófono", flash: "Flash/Luz", encendido: "Encendido",
  tactil: "Táctil", imagen: "Imagen", wifi: "WiFi",
  altavoz: "Altavoz", carga: "Carga", botones: "Botones",
};

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTotalCosto(repair: Repair) {
  return (repair.costo || 0) + (repair.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) || 0);
}

export default function RepairDetailModal({ repair: initialRepair, onClose }: { repair: Repair; onClose: () => void }) {
  const [repair, setRepair] = useState<Repair>(initialRepair);
  const [addingCargo, setAddingCargo] = useState(false);
  const [cargoDesc, setCargoDesc] = useState("");
  const [cargoMonto, setCargoMonto] = useState("");

  const handlePrint = () => window.print();

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
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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
                {repair.tecnico && <p className="text-xs text-emerald-700 font-bold mt-1">🛠️ {repair.tecnico}</p>}
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
                  <div className="mt-2 text-[11px] text-emerald-700 text-center w-full bg-emerald-100 rounded-lg p-2">
                    <div>Base: RD$ {formatMoney(repair.costo)}</div>
                    {repair.cargosAdicionales.map(c => (
                      <div key={c.id}>+ {c.desc}: RD$ {formatMoney(c.monto)}</div>
                    ))}
                  </div>
                )}
                {!repair.status.includes("Entregado") && (
                  <button
                    onClick={() => setAddingCargo(true)}
                    className="mt-3 text-[11px] text-emerald-700 border border-emerald-300 bg-white rounded-md px-3 py-1 hover:bg-emerald-50 flex items-center gap-1"
                  >
                    <PlusCircle className="h-3 w-3" /> Añadir Cargo
                  </button>
                )}
              </div>
            </div>

            {/* Formulario añadir cargo */}
            {addingCargo && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-3">Añadir Cargo Adicional</p>
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
                    type="number"
                    placeholder="RD$"
                    value={cargoMonto}
                    onChange={e => setCargoMonto(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="flex-1 h-9 rounded-md border border-input bg-white px-3 py-1 text-sm"
                  />
                  <Button type="submit" size="sm">Guardar</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddingCargo(false)}>Cancelar</Button>
                </form>
              </div>
            )}

            {/* Estado */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-500">Estado actual:</span>
              <Badge variant="secondary" className="text-sm">{repair.status}</Badge>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex justify-between items-center bg-slate-50 rounded-b-2xl">
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Reimprimir Ticket
            </Button>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>

      {/* Ticket para impresión */}
      <div className="print-only">
        <PrintTicket repair={repair} copies={2} />
      </div>
    </>
  );
}
