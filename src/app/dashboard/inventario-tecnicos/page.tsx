"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Printer, RefreshCcw, Wrench, PackageCheck, User as UserIcon } from "lucide-react";
import { Repair } from "@/lib/types";
import { formatDateLong, formatDateTimeShort, todayRD } from "@/lib/date";
import { useAuth } from "@/context/AuthContext";

const TECNICOS = ["Oscar", "Freddy", "Carlos"];

const statusColors: Record<string, string> = {
  "En reparación": "bg-amber-100 text-amber-700 border-amber-200",
  "Listo para entregar": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

interface TecnicoInventario {
  nombre: string;
  enReparacion: Repair[];
  listoParaEntregar: Repair[];
}

function HojaInventario({ tec, fecha }: { tec: TecnicoInventario; fecha: string }) {
  const line = "━".repeat(50);
  const total = tec.enReparacion.length + tec.listoParaEntregar.length;

  return (
    <div
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "12px",
        color: "#000",
        maxWidth: "700px",
        margin: "0 auto",
        padding: "20px 24px",
        lineHeight: "1.5",
      }}
    >
      {/* Encabezado */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <img
          src="/logo.png"
          alt="YACELLTECH"
          style={{ maxWidth: "180px", maxHeight: "70px", objectFit: "contain", display: "block", margin: "0 auto" }}
        />
      </div>
      <div style={{ textAlign: "center", letterSpacing: "-1px", margin: "6px 0" }}>{line}</div>
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", letterSpacing: "2px", marginBottom: "6px" }}>
        HOJA DE INVENTARIO
      </div>
      <div style={{ textAlign: "center", fontSize: "13px" }}>
        Técnico: <strong style={{ textTransform: "uppercase" }}>{tec.nombre}</strong>
      </div>
      <div style={{ textAlign: "center", fontSize: "12px" }}>Fecha: {fecha}</div>
      <div style={{ textAlign: "center", letterSpacing: "-1px", margin: "8px 0" }}>{line}</div>

      {/* Resumen */}
      <div style={{ display: "flex", justifyContent: "space-between", margin: "8px 0 12px" }}>
        <span>
          <strong>En reparación:</strong> {tec.enReparacion.length}
        </span>
        <span>
          <strong>Listos p/ entregar:</strong> {tec.listoParaEntregar.length}
        </span>
        <span>
          <strong>Total:</strong> {total}
        </span>
      </div>

      {/* Instrucciones */}
      <div style={{ fontSize: "11px", color: "#444", marginBottom: "10px", fontStyle: "italic" }}>
        Marque con una X los equipos que tiene en su poder. Esta hoja se usa como acuse de recibo del
        inventario semanal.
      </div>

      {/* Tabla de equipos */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "11px",
          marginBottom: "16px",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #000" }}>
            <th style={{ textAlign: "center", padding: "4px 2px", width: "32px" }}>☑</th>
            <th style={{ textAlign: "left", padding: "4px 4px", width: "70px" }}>Código</th>
            <th style={{ textAlign: "left", padding: "4px 4px" }}>Cliente</th>
            <th style={{ textAlign: "left", padding: "4px 4px" }}>Equipo</th>
            <th style={{ textAlign: "left", padding: "4px 4px", width: "110px" }}>Estado</th>
            <th style={{ textAlign: "left", padding: "4px 4px", width: "80px" }}>Ingreso</th>
          </tr>
        </thead>
        <tbody>
          {tec.enReparacion.length === 0 && tec.listoParaEntregar.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "16px", color: "#666", fontStyle: "italic" }}>
                (Sin equipos en su poder)
              </td>
            </tr>
          ) : (
            <>
              {tec.enReparacion.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px dashed #999" }}>
                  <td style={{ textAlign: "center", padding: "6px 2px" }}>☐</td>
                  <td style={{ padding: "6px 4px", fontWeight: "bold" }}>{r.codigo}</td>
                  <td style={{ padding: "6px 4px" }}>{r.cliente}</td>
                  <td style={{ padding: "6px 4px" }}>
                    {r.marca} {r.modelo}
                  </td>
                  <td style={{ padding: "6px 4px" }}>En reparación</td>
                  <td style={{ padding: "6px 4px" }}>{r.fecha?.split("T")[0] || "—"}</td>
                </tr>
              ))}
              {tec.listoParaEntregar.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px dashed #999" }}>
                  <td style={{ textAlign: "center", padding: "6px 2px" }}>☐</td>
                  <td style={{ padding: "6px 4px", fontWeight: "bold" }}>{r.codigo}</td>
                  <td style={{ padding: "6px 4px" }}>{r.cliente}</td>
                  <td style={{ padding: "6px 4px" }}>
                    {r.marca} {r.modelo}
                  </td>
                  <td style={{ padding: "6px 4px" }}>Listo p/ entregar</td>
                  <td style={{ padding: "6px 4px" }}>{r.fecha?.split("T")[0] || "—"}</td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>

      {/* Firmas */}
      <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", gap: "20px" }}>
        <div style={{ flex: 1, borderTop: "1px solid #000", paddingTop: "4px", textAlign: "center", fontSize: "11px" }}>
          Recibido por: <strong style={{ textTransform: "uppercase" }}>{tec.nombre}</strong>
        </div>
        <div style={{ flex: 1, borderTop: "1px solid #000", paddingTop: "4px", textAlign: "center", fontSize: "11px" }}>
          Entregado por (Yacelltech)
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: "10px", marginTop: "32px", color: "#666" }}>
        — Fin de la hoja de inventario —
      </div>
    </div>
  );
}

export default function InventarioTecnicosPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TecnicoInventario[]>([]);
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  const load = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        TECNICOS.map(async (nombre) => {
          // Por cada técnico: fetch ambos estados en paralelo
          const [resRep, resListo] = await Promise.all([
            fetch(`/api/repairs?tecnico=${encodeURIComponent(nombre)}&status=${encodeURIComponent("En reparación")}`),
            fetch(`/api/repairs?tecnico=${encodeURIComponent(nombre)}&status=${encodeURIComponent("Listo para entregar")}`),
          ]);
          const enReparacion: Repair[] = await resRep.json();
          const listoParaEntregar: Repair[] = await resListo.json();
          return { nombre, enReparacion, listoParaEntregar };
        })
      );
      setData(results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => window.print(), 250);
    // El usuario cierra la vista de impresión → volver a modo pantalla.
    // Usamos el evento afterprint del navegador.
    const onAfter = () => {
      setPrintMode(false);
      window.removeEventListener("afterprint", onAfter);
    };
    window.addEventListener("afterprint", onAfter);
  };

  if (!user || user.role !== "admin") return null;

  const totalGlobal = data.reduce(
    (s, t) => s + t.enReparacion.length + t.listoParaEntregar.length,
    0
  );
  const fechaHoy = formatDateLong(todayRD());

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Inventario de Técnicos</h1>
            <p className="text-slate-500 text-sm">
              Equipos en poder de cada técnico — para cuadre semanal de inventario.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button
              onClick={handlePrint}
              disabled={loading || data.length === 0}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir hojas
            </Button>
          </div>
        </div>

        {/* Resumen global */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Equipos en taller</CardTitle>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Wrench className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.reduce((s, t) => s + t.enReparacion.length, 0)}
              </div>
              <p className="text-xs text-slate-400 mt-1">En reparación</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Listos para entregar</CardTitle>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <PackageCheck className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.reduce((s, t) => s + t.listoParaEntregar.length, 0)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Esperando pickup</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Total en taller</CardTitle>
              <div className="p-2 bg-slate-100 rounded-lg">
                <ClipboardList className="h-4 w-4 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGlobal}</div>
              <p className="text-xs text-slate-400 mt-1">Suma de los {TECNICOS.length} técnicos</p>
            </CardContent>
          </Card>
        </div>

        {/* Cards por técnico */}
        <div className="grid gap-4 md:grid-cols-3">
          {data.map((tec) => {
            const total = tec.enReparacion.length + tec.listoParaEntregar.length;
            return (
              <Card key={tec.nombre} className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                    <span className="capitalize">{tec.nombre}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusColors["En reparación"]}>
                      {tec.enReparacion.length} en reparación
                    </Badge>
                    <Badge className={statusColors["Listo para entregar"]}>
                      {tec.listoParaEntregar.length} listo{tec.listoParaEntregar.length === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="secondary" className="font-bold">
                      Total: {total}
                    </Badge>
                  </div>

                  {total === 0 ? (
                    <p className="text-sm text-slate-400 italic">Sin equipos en su poder.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {tec.enReparacion.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-primary text-xs">{r.codigo}</div>
                            <div className="text-xs text-slate-500 truncate">{r.cliente}</div>
                          </div>
                          <div className="text-xs text-slate-400 ml-2 text-right shrink-0">
                            {r.marca} {r.modelo}
                          </div>
                        </div>
                      ))}
                      {tec.listoParaEntregar.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-primary text-xs">{r.codigo}</div>
                            <div className="text-xs text-slate-500 truncate">{r.cliente}</div>
                          </div>
                          <div className="text-xs text-slate-400 ml-2 text-right shrink-0">
                            {r.marca} {r.modelo}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {data.length === 0 && !loading && (
          <Card className="border-none shadow-sm">
            <CardContent className="py-10 text-center text-sm text-slate-400 italic">
              No hay datos. Pulsa Actualizar para cargar.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hojas para impresión (solo visible al imprimir) */}
      {printMode && (
        <div className="print-only">
          {data.map((tec) => (
            <div key={tec.nombre} className="ticket">
              <HojaInventario tec={tec} fecha={fechaHoy} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
