"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, CheckCircle2, Clock, Scan, X, RotateCcw } from "lucide-react";
import { Repair } from "@/lib/types";

const STORAGE_KEY = "yacell_auditoria";

function loadReviewed(): Record<string, Record<string, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveReviewed(data: Record<string, Record<string, boolean>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


function statusColor(status: string) {
  if (status === "Entregado bueno") return "bg-emerald-100 text-emerald-800";
  if (status === "Entregado malo") return "bg-orange-100 text-orange-800";
  if (status === "Listo para entregar") return "bg-blue-100 text-blue-800";
  if (status === "No se pudo reparar") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

type ScanFeedback = { tipo: "ok"; codigo: string } | { tipo: "error"; codigo: string } | { tipo: "ya"; codigo: string } | null;

export default function AuditoriaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [reparaciones, setReparaciones] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState<Record<string, Record<string, boolean>>>({});
  const [scanInput, setScanInput] = useState("");
  const [feedback, setFeedback] = useState<ScanFeedback>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    setReviewed(loadReviewed());
  }, []);

  const cargar = useCallback(async (f: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/repairs?despacho_desde=${f}&despacho_hasta=${f}`);
      const data = await res.json();
      const sorted = (Array.isArray(data) ? data : data.data || []).sort(
        (a: Repair, b: Repair) =>
          parseInt(a.codigo.replace("REP-", ""), 10) - parseInt(b.codigo.replace("REP-", ""), 10)
      );
      setReparaciones(sorted);
    } catch {
      setReparaciones([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar(fecha);
  }, [fecha, cargar]);

  // Mantener foco en el input de escaneo
  const refocusScan = () => {
    setTimeout(() => scanRef.current?.focus(), 50);
  };

  useEffect(() => {
    refocusScan();
  }, [loading]);

  const mostrarFeedback = (fb: ScanFeedback) => {
    setFeedback(fb);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
  };

  const procesarCodigo = (raw: string) => {
    // Normalizar: quitar espacios, convertir a mayúsculas
    const codigo = raw.trim().toUpperCase();
    if (!codigo) return;

    const codigoMapa: Record<string, Repair> = {};
    reparaciones.forEach(r => { codigoMapa[r.codigo] = r; });

    const diaReviewed = reviewed[fecha] || {};

    if (!codigoMapa[codigo]) {
      mostrarFeedback({ tipo: "error", codigo });
      return;
    }

    if (diaReviewed[codigo]) {
      mostrarFeedback({ tipo: "ya", codigo });
      return;
    }

    setReviewed(prev => {
      const diaActual = { ...(prev[fecha] || {}) };
      diaActual[codigo] = true;
      const next = { ...prev, [fecha]: diaActual };
      saveReviewed(next);
      return next;
    });

    mostrarFeedback({ tipo: "ok", codigo });
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      procesarCodigo(scanInput);
      setScanInput("");
    }
  };

  const limpiarDia = () => {
    setReviewed(prev => {
      const next = { ...prev, [fecha]: {} };
      saveReviewed(next);
      return next;
    });
    refocusScan();
  };

  const desmarcar = (codigo: string) => {
    setReviewed(prev => {
      const diaActual = { ...(prev[fecha] || {}) };
      delete diaActual[codigo];
      const next = { ...prev, [fecha]: diaActual };
      saveReviewed(next);
      return next;
    });
    refocusScan();
  };

  const diaReviewed = reviewed[fecha] || {};
  const revisadas = reparaciones.filter(r => diaReviewed[r.codigo]).length;
  const pendientes = reparaciones.length - revisadas;
  const reparacionesOrdenadas = [
    ...reparaciones.filter(r => !diaReviewed[r.codigo]),
    ...reparaciones.filter(r => diaReviewed[r.codigo]),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auditoría de Facturas</h1>
        <p className="text-slate-500 text-sm">Facturas despachadas en la fecha seleccionada — escanea el código de barras para marcar cada una</p>
      </div>

      {/* Selector de fecha */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Fecha de despacho:</label>
            <Input
              type="date"
              value={fecha}
              onChange={e => { setFecha(e.target.value); refocusScan(); }}
              className="w-44"
            />
          </div>
        </CardContent>
      </Card>

      {/* Input de escaneo — siempre visible si hay facturas */}
      {!loading && reparaciones.length > 0 && (
        <div
          className="rounded-xl border-2 border-primary/40 bg-primary/5 px-5 py-4 space-y-2 cursor-text"
          onClick={() => scanRef.current?.focus()}
        >
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Scan className="h-4 w-4" />
            Zona de escaneo — apunta el lector aquí
          </div>
          <Input
            ref={scanRef}
            value={scanInput}
            onChange={e => setScanInput(e.target.value.toUpperCase().replace(/'/g, '-'))}
            onKeyDown={handleScanKeyDown}
            placeholder="REP-00001"
            className="font-mono text-lg tracking-widest bg-white border-primary/30 focus:border-primary"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {/* Feedback del último escaneo */}
          {feedback && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              feedback.tipo === "ok"
                ? "bg-emerald-100 text-emerald-800"
                : feedback.tipo === "ya"
                ? "bg-blue-100 text-blue-800"
                : "bg-red-100 text-red-800"
            }`}>
              {feedback.tipo === "ok" && <><CheckCircle2 className="h-4 w-4" /> {feedback.codigo} — marcada como revisada</>}
              {feedback.tipo === "ya" && <><CheckCircle2 className="h-4 w-4" /> {feedback.codigo} — ya estaba revisada</>}
              {feedback.tipo === "error" && <><X className="h-4 w-4" /> {feedback.codigo} — no encontrada en este día</>}
            </div>
          )}
        </div>
      )}

      {/* Resumen */}
      {!loading && reparaciones.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-800">{reparaciones.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total del día</p>
          </div>
          <div className="rounded-xl border bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-2xl font-black text-emerald-600">{revisadas}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Revisadas
            </p>
          </div>
          <div className="rounded-xl border bg-white px-4 py-3 text-center shadow-sm">
            <p className={`text-2xl font-black ${pendientes > 0 ? "text-amber-500" : "text-slate-300"}`}>{pendientes}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" /> Pendientes
            </p>
          </div>
        </div>
      )}

      {/* Lista de facturas */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-primary text-md">
            <span className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              {loading
                ? "Cargando..."
                : reparaciones.length === 0
                ? `Sin facturas para ${fecha}`
                : `${reparaciones.length} factura(s) — ${fecha}`}
            </span>
            {!loading && revisadas > 0 && (
              <button
                onClick={limpiarDia}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors font-normal"
                title="Limpiar todo"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Limpiar todo
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Cargando facturas...</div>
          ) : reparaciones.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No hay facturas registradas para esta fecha.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reparacionesOrdenadas.map((r, idx) => {
                const esRevisada = !!diaReviewed[r.codigo];
                const esUltimaEscaneada = feedback?.tipo === "ok" && feedback.codigo === r.codigo;

                return (
                  <div
                    key={r.id}
                    ref={el => { rowRefs.current[r.codigo] = el; }}
                  >
                    <div className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-all duration-300 ${
                      esUltimaEscaneada
                        ? "bg-emerald-50 ring-1 ring-emerald-300"
                        : esRevisada
                        ? "opacity-50"
                        : ""
                    }`}>
                      {/* Indicador visual */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${esRevisada ? "bg-emerald-400" : "bg-slate-200"}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-black px-2 py-0.5 rounded font-mono ${
                            esRevisada
                              ? "bg-emerald-100 text-emerald-700 line-through"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {r.codigo}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {r.cliente}
                          </span>
                          {r.cedula && (
                            <span className="text-xs text-slate-400">{r.cedula}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{r.marca} {r.modelo}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(r.status)}`}>
                            {r.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            RD$ {r.costo.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          {r.tecnico && (
                            <span className="text-xs text-slate-400">· {r.tecnico}</span>
                          )}
                        </div>
                      </div>

                      {esRevisada ? (
                        <button
                          onClick={() => desmarcar(r.codigo)}
                          title="Desmarcar"
                          className="shrink-0 p-1 rounded hover:bg-red-50 text-emerald-500 hover:text-red-400 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => { procesarCodigo(r.codigo); refocusScan(); }}
                          title="Marcar como revisada"
                          className="shrink-0 p-1 rounded hover:bg-emerald-50 text-slate-300 hover:text-emerald-500 transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barra de progreso */}
      {!loading && reparaciones.length > 0 && (
        <div className="rounded-xl border bg-white px-5 py-4 shadow-sm space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Progreso de revisión</span>
            <span>{revisadas}/{reparaciones.length}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${reparaciones.length > 0 ? (revisadas / reparaciones.length) * 100 : 0}%` }}
            />
          </div>
          {revisadas === reparaciones.length && reparaciones.length > 0 && (
            <p className="text-xs text-emerald-600 font-semibold text-center">
              ✓ Todas las facturas del día han sido revisadas
            </p>
          )}
        </div>
      )}
    </div>
  );
}
