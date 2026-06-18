"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, RefreshCcw } from "lucide-react";
import { Repair } from "@/lib/types";
import { todayRD, formatDateSlash } from "@/lib/date";
import { useAuth } from "@/context/AuthContext";

type SeguimientoRecord = { repair_id: number; enviado_en: string; enviado_por: string };

const DIAS_SEGUIMIENTO = 15;

const today = () => new Date();
const diasDesde = (fecha: string) =>
  Math.floor((today().getTime() - new Date(fecha).getTime()) / 86400000);

function getWhatsAppMsg(r: Repair) {
  const equipo = `su ${r.marca} ${r.modelo} (código ${r.codigo})`;
  return `Hola ${r.cliente}, le saluda YACELLTECH. Han pasado 15 días desde que entregamos ${equipo} reparado. Queremos saber cómo está funcionando y si todo está en orden. ¡Estamos para servirle! 😊`;
}

export default function SeguimientoClientesPage() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [seguimientos, setSeguimientos] = useState<SeguimientoRecord[]>([]);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadRepairs(), loadSeguimientos()]);
    setLoading(false);
  };

  const loadRepairs = async () => {
    try {
      // Calcular "hace 15 días" en hora RD (no en UTC del servidor ni del navegador)
      const [yyyy, mm, dd] = todayRD().split("-").map(Number);
      const dateLimit = new Date(Date.UTC(yyyy, mm - 1, dd));
      dateLimit.setUTCDate(dateLimit.getUTCDate() - 15);
      const despachoHasta = `${dateLimit.getUTCFullYear()}-${String(dateLimit.getUTCMonth() + 1).padStart(2, "0")}-${String(dateLimit.getUTCDate()).padStart(2, "0")}`; // "YYYY-MM-DD"

      const res = await fetch(`/api/repairs?status=Entregado+bueno&despacho_hasta=${despachoHasta}`);
      const data: Repair[] = await res.json();
      setRepairs(data);
    } catch (e) { console.error(e); }
  };

  const loadSeguimientos = async () => {
    try {
      const res = await fetch("/api/seguimiento-clientes");
      const data = await res.json();
      if (Array.isArray(data)) setSeguimientos(data);
    } catch (e) { console.error(e); }
  };

  // Solo "Entregado bueno", con fecha_despacho >= 15 días, sin chequeos ni entregado malo
  const elegibles = repairs.filter(r =>
    r.status === 'Entregado bueno' &&
    r.fecha_despacho &&
    diasDesde(r.fecha_despacho) >= DIAS_SEGUIMIENTO
  ).sort((a, b) => diasDesde(b.fecha_despacho!) - diasDesde(a.fecha_despacho!));

  const yaEnviado = (id: number) => seguimientos.some(s => s.repair_id === id);

  const porEnviar  = elegibles.filter(r => !yaEnviado(r.id));
  const enviados   = elegibles.filter(r =>  yaEnviado(r.id));

  const handleAbrirWhatsApp = (r: Repair) => {
    const msg = getWhatsAppMsg(r);
    const phone = r.telefono.replace(/\D/g, '');
    const intlPhone = phone.length === 10 ? `1${phone}` : phone;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleMarcarEnviado = async (r: Repair) => {
    setEnviando(r.id);
    try {
      await fetch('/api/seguimiento-clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repair_id: r.id, enviado_por: user?.username || 'caja' }),
      });
      await loadSeguimientos();
    } catch (e) { console.error(e); }
    setEnviando(null);
  };

  const TableHead_ = () => (
    <TableHeader className="bg-slate-50/50">
      <TableRow>
        <TableHead className="font-bold">Código</TableHead>
        <TableHead className="font-bold">Cliente</TableHead>
        <TableHead className="font-bold">Equipo</TableHead>
        <TableHead className="font-bold text-center">Días entregado</TableHead>
        <TableHead className="font-bold">Fecha entrega</TableHead>
        <TableHead />
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seguimiento de Clientes</h1>
          <p className="text-slate-500 text-sm">
            Equipos reparados y entregados hace 15+ días. Envía un mensaje para saber si todo está bien.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={loadAll} title="Actualizar">
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Pendiente por enviar */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Pendiente por contactar ({loading ? '…' : porEnviar.length})
          </h2>
        </div>
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHead_ />
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-400">Cargando...</TableCell></TableRow>
                ) : porEnviar.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-400 italic">No hay seguimientos pendientes.</TableCell></TableRow>
                ) : porEnviar.map(r => {
                  const dias = diasDesde(r.fecha_despacho!);
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-black text-primary text-xs">{r.codigo}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.cliente}</div>
                        <div className="text-xs text-slate-400">{r.telefono}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.marca} {r.modelo}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={
                          dias >= 30 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }>{dias}d</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatDateSlash(r.fecha_despacho!)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline"
                            onClick={() => handleAbrirWhatsApp(r)}
                            className="gap-1 text-xs text-green-700 border-green-200 hover:bg-green-50 whitespace-nowrap"
                          >
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </Button>
                          <Button size="sm"
                            disabled={enviando === r.id}
                            onClick={() => handleMarcarEnviado(r)}
                            className="gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                          >
                            ✓ {enviando === r.id ? 'Guardando...' : 'Enviado'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Ya contactados */}
      {!loading && enviados.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Ya contactados ({enviados.length})
            </h2>
          </div>
          <Card className="border-none shadow-sm overflow-hidden opacity-70">
            <CardContent className="p-0">
              <Table>
                <TableHead_ />
                <TableBody>
                  {enviados.map(r => {
                    const dias = diasDesde(r.fecha_despacho!);
                    const reg = seguimientos.find(s => s.repair_id === r.id);
                    return (
                      <TableRow key={r.id} className="bg-slate-50/30">
                        <TableCell className="font-black text-primary text-xs">{r.codigo}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.cliente}</div>
                          <div className="text-xs text-slate-400">{r.telefono}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.marca} {r.modelo}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500">{dias}d</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {formatDateSlash(r.fecha_despacho!)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-green-700 font-medium">✓ Contactado</div>
                          {reg && (
                            <div className="text-[10px] text-slate-400">
                              {formatDateSlash(reg.enviado_en)} — {reg.enviado_por}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
