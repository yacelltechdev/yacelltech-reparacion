"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, RefreshCcw, PackageCheck, PackageX, Download, Lock, ChevronDown, ChevronUp, Printer, RotateCcw } from "lucide-react";
import { Repair } from "@/lib/types";
import { todayRD } from "@/lib/date";
import { useAuth } from "@/context/AuthContext";

const totalCosto = (r: Repair) =>
  (r.costo || 0) + (r.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) || 0);

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });
}

interface Cierre {
  id: number;
  fecha: string;
  hora_cierre: string;
  total_ingresos: number;
  cantidad_reparados: number;
  cantidad_devueltos: number;
  cerrado_por: string;
  snapshot: Repair[];
}

function CierreFactura({ cierre }: { cierre: Cierre }) {
  const buenos = cierre.snapshot.filter(r => r.status === "Entregado bueno");
  const malos  = cierre.snapshot.filter(r => r.status === "Entregado malo");
  const line   = "━".repeat(50);

  return (
    <div className="cuadre-reporte" style={{
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: "13px",
      color: "#000",
      maxWidth: "620px",
      margin: "0 auto",
      padding: "8px 14px",
      lineHeight: "1.45",
    }}>
      {/* Encabezado */}
      <div style={{ textAlign: "center", marginBottom: "4px" }}>
        <img src="/logo.png" alt="YACELLTECH" style={{ maxWidth: "120px", maxHeight: "45px", objectFit: "contain", display: "block", margin: "0 auto" }} />
      </div>

      <div style={{ textAlign: "center", letterSpacing: "-1px", margin: "3px 0" }}>{line}</div>

      {/* Título */}
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "11px", letterSpacing: "2px", marginBottom: "2px" }}>
        CIERRE DE CAJA
      </div>
      <div style={{ textAlign: "center" }}>Fecha: {cierre.fecha}</div>
      <div style={{ textAlign: "center" }}>Cerrado a las: {formatDatetime(cierre.hora_cierre)}</div>
      <div style={{ textAlign: "center" }}>Cajero: {cierre.cerrado_por}</div>

      <div style={{ textAlign: "center", letterSpacing: "-1px", margin: "3px 0" }}>{line}</div>

      {/* Detalle */}
      <div style={{ fontWeight: "bold", marginBottom: "2px" }}>DETALLE DE DESPACHOS</div>
      {buenos.map(r => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{r.codigo} {r.cliente}</span>
          <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>RD$ {formatMoney(totalCosto(r))}</span>
        </div>
      ))}
      {malos.map(r => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
          <span>{r.codigo} {r.cliente}</span>
          <span style={{ fontStyle: "italic" }}>Devuelto</span>
        </div>
      ))}

      <div style={{ margin: "4px 0 3px", borderTop: "1px dashed #999" }} />

      {/* Totales */}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
        <span>Entregados buenos:</span><span>{cierre.cantidad_reparados}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Devueltos (malo):</span><span>{cierre.cantidad_devueltos}</span>
      </div>

      <div style={{ textAlign: "center", letterSpacing: "-1px", margin: "4px 0" }}>{line}</div>

      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "12px" }}>
        <span>TOTAL INGRESOS:</span>
        <span>RD$ {formatMoney(cierre.total_ingresos)}</span>
      </div>

      <div style={{ textAlign: "center", fontSize: "9px", marginTop: "6px", color: "#555" }}>— Fin del cierre —</div>
    </div>
  );
}

export default function ReportPage() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [date, setDate] = useState(todayRD());
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const [printCierre, setPrintCierre] = useState<Cierre | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [reabrirCierre, setReobrirCierre] = useState<Cierre | null>(null);
  const [reabriendo, setReabriendo] = useState(false);
  const [reabrirError, setReobrirError] = useState("");


  useEffect(() => {
    loadAll();
  }, [date]);

  useEffect(() => {
    const interval = setInterval(() => loadRepairs(date), 15000);
    return () => clearInterval(interval);
  }, [date]);

  const loadAll = async () => {
    await Promise.all([loadRepairs(date), loadCierres()]);
  };

  const loadRepairs = async (targetDate = date) => {
    try {
      const res = await fetch(`/api/repairs?despacho_desde=${targetDate}&despacho_hasta=${targetDate}`);
      const data: Repair[] = await res.json();
      setRepairs(data);
      setIsLoading(false);
    } catch (e) { console.error(e); }
  };

  const loadCierres = async () => {
    try {
      const res = await fetch("/api/cierres");
      const data: Cierre[] = await res.json();
      setCierres(data);
    } catch (e) { console.error(e); }
  };

  // Only unclosed (cierre_id IS NULL) delivered repairs for selected date
  const filtered = repairs.filter(r => {
    const matchDate = r.fecha_despacho?.startsWith(date);
    const matchUnclosed = (r as any).cierre_id == null;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || r.codigo?.toLowerCase().includes(q) || r.cliente?.toLowerCase().includes(q) || r.modelo?.toLowerCase().includes(q);
    return matchDate && matchUnclosed && matchSearch && (r.status === "Entregado bueno" || r.status === "Entregado malo");
  });

  const entregadosBueno = filtered.filter(r => r.status === "Entregado bueno");
  const entregadosMalo  = filtered.filter(r => r.status === "Entregado malo");
  const ingresos = [...entregadosBueno, ...entregadosMalo.filter(r => (r.costo || 0) > 0)]
    .reduce((sum, r) => sum + totalCosto(r), 0);

  const handleCerrarCaja = async () => {
    setClosing(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/cierres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: date, cerrado_por: user?.username || "caja" })
      });
      const cierre = await res.json();

      if (!res.ok) {
        setErrorMsg(cierre.error || "Error al cerrar caja");
        setClosing(false);
        return;
      }

      setConfirming(false);
      await loadAll();

      // Find the newly created cierre and auto-print
      const newCierreRes = await fetch("/api/cierres");
      const allCierres: Cierre[] = await newCierreRes.json();
      setCierres(allCierres);
      const created = allCierres.find(c => c.id === cierre.id);
      if (created) {
        setPrintCierre(created);
        setTimeout(() => window.print(), 300);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error de red");
    }
    setClosing(false);
  };

  const handlePrintCierre = (c: Cierre) => {
    setPrintCierre(c);
    setTimeout(() => window.print(), 200);
  };

  const [printReport, setPrintReport] = useState(false);

  const handleReabrir = async () => {
    if (!reabrirCierre) return;
    setReabriendo(true);
    setReobrirError("");
    const res = await fetch(`/api/cierres/${reabrirCierre.id}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok) {
      setReobrirError(result.error || "Error al reabrir el cierre");
      setReabriendo(false);
      return;
    }
    setReobrirCierre(null);
    setReabriendo(false);
    await loadAll();
  };

  const handlePrintReport = () => {
    setPrintReport(true);
    setPrintCierre(null);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintReport(false), 500);
    }, 200);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: repairs }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yacelltech_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cuadre Financiero</h1>
            <p className="text-slate-500 text-sm">Equipos despachados el día seleccionado (sin cierre previo).</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="text"
              placeholder="Buscar código, cliente, modelo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-[220px] border-slate-200 shadow-sm"
            />
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-[160px] border-slate-200 shadow-sm"
            />
            <Button variant="outline" size="icon" onClick={loadAll} title="Actualizar">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {filtered.length > 0 && (
              <Button
                onClick={() => setConfirming(true)}
                className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Lock className="h-4 w-4" /> Cerrar Caja
              </Button>
            )}
          </div>
        </div>

        {/* Resumen */}
        <div className="grid gap-4 md:grid-cols-3 no-print">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Ingresos pendientes de cierre</CardTitle>
              <div className="p-2 bg-emerald-100 rounded-lg"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">RD$ {formatMoney(ingresos)}</div>
              <p className="text-xs text-slate-400 mt-1">Bueno cobrado + Malo con chequeo</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Entregado bueno</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg"><PackageCheck className="h-4 w-4 text-blue-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entregadosBueno.length} equipos</div>
              <p className="text-xs text-slate-400 mt-1">Reparados y cobrados</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Entregado malo</CardTitle>
              <div className="p-2 bg-red-100 rounded-lg"><PackageX className="h-4 w-4 text-red-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entregadosMalo.length} equipos</div>
              <p className="text-xs text-slate-400 mt-1">Devueltos sin reparar</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla */}
        <Card className="border-none shadow-sm overflow-hidden no-print">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold">Código</TableHead>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Modelo</TableHead>
                  <TableHead className="font-bold">Técnico</TableHead>
                  <TableHead className="font-bold">Estado</TableHead>
                  <TableHead className="font-bold text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400">Cargando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">No hay despachos pendientes de cierre para esta fecha.</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-black text-primary text-xs">{r.codigo}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.cliente}</div>
                      <div className="text-xs text-slate-400">{r.telefono}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.marca} {r.modelo}</TableCell>
                    <TableCell className="text-sm text-slate-500">{r.tecnico || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        r.status === "Entregado bueno" ? "bg-blue-100 text-blue-700" :
                        r.status === "Entregado malo"  ? "bg-red-100 text-red-700" : ""
                      }>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">RD$ {formatMoney(totalCosto(r))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Confirmación de cierre */}
        {confirming && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
              <Lock className="h-12 w-12 text-rose-600 mx-auto mb-4" />
              <h2 className="text-xl font-black mb-2">¿Cerrar Caja del {date}?</h2>
              <p className="text-slate-500 text-sm mb-1">
                Se cerrarán <strong>{filtered.length} despachos</strong> con un total de{" "}
                <strong className="text-emerald-600">RD$ {formatMoney(ingresos)}</strong>.
              </p>
              <p className="text-slate-400 text-xs mb-6">
                Esta acción no se puede deshacer. Los pendientes seguirán en la bandeja.
              </p>
              {errorMsg && (
                <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2 mb-2">{errorMsg}</p>
              )}
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setConfirming(false); setErrorMsg(""); }} disabled={closing}>Cancelar</Button>
                <Button
                  onClick={handleCerrarCaja}
                  disabled={closing}
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
                >
                  {closing ? "Cerrando..." : "Confirmar Cierre"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Historial de cierres */}
        {cierres.length > 0 && (
          <div className="no-print">
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 mb-3"
            >
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Historial de Cierres ({cierres.length})
            </button>
            {showHistory && (
              <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="font-bold">Fecha</TableHead>
                        <TableHead className="font-bold">Hora Cierre</TableHead>
                        <TableHead className="font-bold">Cajero</TableHead>
                        <TableHead className="font-bold text-center">Reparados</TableHead>
                        <TableHead className="font-bold text-center">Devueltos</TableHead>
                        <TableHead className="font-bold text-right">Total</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cierres.map(c => (
                        <TableRow key={c.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium">{c.fecha}</TableCell>
                          <TableCell className="text-sm text-slate-500">{formatDatetime(c.hora_cierre)}</TableCell>
                          <TableCell className="text-sm">{c.cerrado_por}</TableCell>
                          <TableCell className="text-center font-bold text-emerald-700">{c.cantidad_reparados}</TableCell>
                          <TableCell className="text-center text-red-600">{c.cantidad_devueltos}</TableCell>
                          <TableCell className="text-right font-black text-emerald-700">RD$ {formatMoney(c.total_ingresos)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handlePrintCierre(c)}>
                                <Printer className="h-3 w-3" /> Imprimir
                              </Button>
                              {c.id === cierres[0]?.id && user?.role === "admin" && (
                                <Button size="sm" variant="outline" className="gap-1 text-xs text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => { setReobrirCierre(c); setReobrirError(""); }}>
                                  <RotateCcw className="h-3 w-3" /> Reabrir
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modal reabrir cierre */}
      {reabrirCierre && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
            <RotateCcw className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-black mb-2">¿Reabrir este cierre de caja?</h2>
            <p className="text-slate-500 text-sm mb-1">
              Fecha: <strong>{reabrirCierre.fecha}</strong> — Cajero: <strong>{reabrirCierre.cerrado_por}</strong>
            </p>
            <p className="text-slate-500 text-sm mb-1">
              <strong>{reabrirCierre.cantidad_reparados} reparados</strong> · <strong>{reabrirCierre.cantidad_devueltos} devueltos</strong> — RD$ {formatMoney(reabrirCierre.total_ingresos)}
            </p>
            <p className="text-slate-400 text-xs mb-6">
              Las facturas vuelven a estar disponibles para corregirlas y cerrar de nuevo.
            </p>
            {reabrirError && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2 mb-2">{reabrirError}</p>}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setReobrirCierre(null); setReobrirError(""); }} disabled={reabriendo}>Cancelar</Button>
              <Button onClick={handleReabrir} disabled={reabriendo} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                {reabriendo ? "Reabriendo..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Factura de cierre para impresión */}
      {printCierre && (
        <div className="print-only">
          <CierreFactura cierre={printCierre} />
        </div>
      )}

      {/* Reporte actual para impresión */}
      {printReport && (
        <div className="print-only">
          <div className="cuadre-reporte" style={{ fontFamily: "Arial, sans-serif", padding: "6px 10px", color: "#000" }}>
            {/* Encabezado */}
            <div style={{ textAlign: "center", borderBottom: "1.5px solid #000", paddingBottom: "4px", marginBottom: "6px" }}>
              <p style={{ fontSize: "15px", fontWeight: "900", margin: 0, letterSpacing: "1px" }}>YACELLTECH</p>
              <p style={{ fontSize: "10px", fontWeight: "bold", margin: "1px 0 0" }}>REPORTE DE INGRESOS DEL DÍA</p>
              <p style={{ fontSize: "9px", margin: "1px 0 0", color: "#444" }}>Fecha: <strong>{date}</strong> &nbsp;|&nbsp; Generado: {new Date().toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" })}</p>
            </div>

            {/* Tabla de equipos */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: "#000", color: "#fff" }}>
                  <th style={{ padding: "3px 4px", textAlign: "left" }}>#</th>
                  <th style={{ padding: "3px 4px", textAlign: "left" }}>Código</th>
                  <th style={{ padding: "3px 4px", textAlign: "left" }}>Cliente</th>
                  <th style={{ padding: "3px 4px", textAlign: "left" }}>Equipo</th>
                  <th style={{ padding: "3px 4px", textAlign: "left" }}>Técnico</th>
                  <th style={{ padding: "3px 4px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {entregadosBueno.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "8px", textAlign: "center", color: "#888", fontStyle: "italic" }}>No hay equipos entregados buenos para esta fecha.</td></tr>
                ) : entregadosBueno.map((r, i) => (
                  <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? "#f5f5f5" : "#fff", borderBottom: "1px solid #e0e0e0" }}>
                    <td style={{ padding: "2px 4px", color: "#666" }}>{i + 1}</td>
                    <td style={{ padding: "2px 4px", fontWeight: "bold" }}>{r.codigo}</td>
                    <td style={{ padding: "2px 4px" }}>{r.cliente}</td>
                    <td style={{ padding: "2px 4px" }}>{r.marca} {r.modelo}</td>
                    <td style={{ padding: "2px 4px", color: "#555" }}>{r.tecnico || "—"}</td>
                    <td style={{ padding: "2px 4px", textAlign: "right", fontWeight: "bold" }}>RD$ {formatMoney(totalCosto(r))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div style={{ borderTop: "1.5px solid #000", paddingTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "#555" }}>{entregadosBueno.length} equipo{entregadosBueno.length !== 1 ? "s" : ""} entregado{entregadosBueno.length !== 1 ? "s" : ""}</span>
              <span style={{ fontSize: "13px", fontWeight: "900" }}>TOTAL: RD$ {formatMoney(ingresos)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
