"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, RefreshCcw, Wrench, DollarSign, ChevronDown, ChevronUp, Printer } from "lucide-react";
import { Repair } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const totalCosto = (r: Repair) =>
  (r.costo || 0) + (r.cargosAdicionales?.reduce((a, c) => a + c.monto, 0) || 0);

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CuadreTecnico {
  id: number;
  tecnico: string;
  desde: string;
  hasta: string;
  cantidad_reparados: number;
  total_generado: number;
  creado_por: string;
  creado_en: string;
  snapshot: Repair[];
}

function FacturaCuadre({ cuadre }: { cuadre: CuadreTecnico }) {
  const line = "━".repeat(50);
  return (
    <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "12px", color: "#000", maxWidth: "620px", margin: "0 auto", padding: "20px 24px", lineHeight: "1.5" }}>
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <img src="/logo.png" alt="YACELLTECH" style={{ maxWidth: "180px", maxHeight: "70px", objectFit: "contain", display: "block", margin: "0 auto" }} />
      </div>
      <div style={{ textAlign: "center", letterSpacing: "-1px", margin: "6px 0" }}>{line}</div>
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "14px", letterSpacing: "2px", marginBottom: "6px" }}>CUADRE DE TÉCNICO</div>
      <div style={{ textAlign: "center", fontSize: "12px" }}>Técnico: <strong>{cuadre.tecnico.toUpperCase()}</strong></div>
      <div style={{ textAlign: "center", fontSize: "12px" }}>Período: {cuadre.desde} al {cuadre.hasta}</div>
      <div style={{ textAlign: "center", fontSize: "12px" }}>Cuadrado por: {cuadre.creado_por}</div>
      <div style={{ textAlign: "center", fontSize: "12px" }}>Fecha: {new Date(cuadre.creado_en).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" })}</div>
      <div style={{ textAlign: "center", letterSpacing: "-1px", margin: "8px 0" }}>{line}</div>
      <div style={{ fontWeight: "bold", marginBottom: "6px" }}>REPARACIONES INCLUIDAS</div>
      {cuadre.snapshot.map((r, i) => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
          <span>{i + 1}. {r.codigo} — {r.marca} {r.modelo}</span>
          <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>RD$ 200.00</span>
        </div>
      ))}
      <div style={{ margin: "10px 0 6px", borderTop: "1px dashed #999" }} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
        <span>Total equipos reparados:</span><span style={{ fontWeight: "bold" }}>{cuadre.cantidad_reparados}</span>
      </div>
      <div style={{ textAlign: "center", letterSpacing: "-1px", margin: "8px 0" }}>{line}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "15px", marginTop: "6px" }}>
        <span>TOTAL GENERADO:</span>
        <span>RD$ {formatMoney(cuadre.total_generado)}</span>
      </div>
      <div style={{ textAlign: "center", fontSize: "11px", marginTop: "24px", color: "#555" }}>— Fin del cuadre —</div>
    </div>
  );
}

const TECNICOS = ["Oscar", "Freddy", "Carlos"];

export default function CuadreTecnicoPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  const today = new Date().toISOString().split("T")[0];
  const [tecnico, setTecnico] = useState(TECNICOS[0]);
  const [desde, setDesde] = useState(today);
  const [hasta, setHasta] = useState(today);
  const [pendientes, setPendientes] = useState<Repair[]>([]);
  const [historial, setHistorial] = useState<CuadreTecnico[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [printCuadre, setPrintCuadre] = useState<CuadreTecnico | null>(null);

  useEffect(() => { loadHistorial(); }, []);

  const loadHistorial = async () => {
    const res = await fetch("/api/cuadres-tecnico");
    const data = await res.json();
    setHistorial(data);
  };

  const buscar = async () => {
    setLoading(true);
    setErrorMsg("");
    const res = await fetch(`/api/repairs?tecnico=${encodeURIComponent(tecnico)}&status=Entregado+bueno`);
    const data: (Repair & { cuadre_tecnico_id?: number | null })[] = await res.json();
    // Filter only uncuadrado
    setPendientes((data as any[]).filter((r: any) => r.cuadre_tecnico_id == null));
    setLoading(false);
  };

  const handleCuadrar = async () => {
    setSaving(true);
    setErrorMsg("");
    const res = await fetch("/api/cuadres-tecnico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tecnico, desde, hasta, creado_por: user?.username || "admin" }),
    });
    const result = await res.json();
    if (!res.ok) {
      setErrorMsg(result.error || "Error al guardar el cuadre");
      setSaving(false);
      return;
    }
    setConfirming(false);
    setSaving(false);
    await loadHistorial();
    await buscar();
    // Print
    const allCuadres = await fetch("/api/cuadres-tecnico").then(r => r.json());
    const nuevo = allCuadres.find((c: CuadreTecnico) => c.id === result.id);
    if (nuevo) {
      setPrintCuadre(nuevo);
      setTimeout(() => window.print(), 300);
    }
  };

  const RATE = 200;
  const total = pendientes.length * RATE;
  const historialTecnico = historial.filter(c => c.tecnico === tecnico);

  if (!user || user.role !== "admin") return null;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuadre de Técnico</h1>
          <p className="text-slate-500 text-sm">Liquidación de reparaciones por técnico en un período.</p>
        </div>

        {/* Filtros */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-4 items-end">
              <div className="space-y-1">
                <Label>Técnico</Label>
                <select
                  value={tecnico}
                  onChange={e => setTecnico(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize"
                >
                  {TECNICOS.map(t => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Desde</Label>
                <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Hasta</Label>
                <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
              </div>
              <Button onClick={buscar} disabled={loading} className="gap-2">
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Consultar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Equipos pendientes</CardTitle>
              <div className="p-2 bg-amber-100 rounded-lg"><Wrench className="h-4 w-4 text-amber-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendientes.length}</div>
              <p className="text-xs text-slate-400 mt-1 capitalize">{tecnico} — sin cuadrar</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Total generado</CardTitle>
              <div className="p-2 bg-emerald-100 rounded-lg"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">RD$ {formatMoney(total)}</div>
              <p className="text-xs text-slate-400 mt-1">{pendientes.length} × RD$200 por reparación</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm flex items-center justify-center p-6">
            {pendientes.length > 0 ? (
              <Button
                onClick={() => setConfirming(true)}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" /> Cuadrar Ahora
              </Button>
            ) : (
              <p className="text-sm text-slate-400 italic text-center">Consulta primero o no hay reparaciones pendientes.</p>
            )}
          </Card>
        </div>

        {/* Tabla de pendientes */}
        {pendientes.length > 0 && (
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Reparaciones a cuadrar — <span className="capitalize">{tecnico}</span></CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold">Código</TableHead>
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">Equipo</TableHead>
                    <TableHead className="font-bold">Despacho</TableHead>
                    <TableHead className="font-bold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendientes.map(r => (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-black text-primary text-xs">{r.codigo}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.cliente}</div>
                        <div className="text-xs text-slate-400">{r.telefono}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.marca} {r.modelo}</TableCell>
                      <TableCell className="text-sm text-slate-500">{r.fecha_despacho?.split("T")[0] || "—"}</TableCell>
                      <TableCell className="text-right font-bold">RD$ {formatMoney(totalCosto(r))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Historial de cuadres de este técnico */}
        {historialTecnico.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 mb-3"
            >
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Historial de cuadres — <span className="capitalize">{tecnico}</span> ({historialTecnico.length})
            </button>
            {showHistory && (
              <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="font-bold">Período</TableHead>
                        <TableHead className="font-bold">Cuadrado por</TableHead>
                        <TableHead className="font-bold">Fecha cuadre</TableHead>
                        <TableHead className="font-bold text-center">Reparados</TableHead>
                        <TableHead className="font-bold text-right">Total</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historialTecnico.map(c => (
                        <TableRow key={c.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-sm font-medium">{c.desde} → {c.hasta}</TableCell>
                          <TableCell className="text-sm text-slate-500">{c.creado_por}</TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {new Date(c.creado_en).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" })}
                          </TableCell>
                          <TableCell className="text-center font-bold text-emerald-700">{c.cantidad_reparados}</TableCell>
                          <TableCell className="text-right font-black text-emerald-700">RD$ {formatMoney(c.total_generado)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => {
                              setPrintCuadre(c);
                              setTimeout(() => window.print(), 200);
                            }}>
                              <Printer className="h-3 w-3" /> Imprimir
                            </Button>
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

        {/* Modal confirmación */}
        {confirming && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
              <h2 className="text-xl font-black mb-2">¿Cuadrar a <span className="capitalize">{tecnico}</span>?</h2>
              <p className="text-slate-500 text-sm mb-1">
                <strong>{pendientes.length} reparaciones</strong> del período <strong>{desde}</strong> al <strong>{hasta}</strong>.
              </p>
              <p className="text-emerald-600 font-black text-lg mb-1">RD$ {formatMoney(total)}</p>
              <p className="text-slate-400 text-xs mb-6">
                Estas reparaciones quedarán marcadas como cuadradas y no aparecerán en futuros cuadres.
              </p>
              {errorMsg && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2 mb-2">{errorMsg}</p>}
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setConfirming(false); setErrorMsg(""); }} disabled={saving}>Cancelar</Button>
                <Button
                  onClick={handleCuadrar}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {saving ? "Guardando..." : "Confirmar Cuadre"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Factura para impresión */}
      {printCuadre && (
        <div className="print-only">
          <FacturaCuadre cuadre={printCuadre} />
        </div>
      )}
    </>
  );
}
