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

type AvisoRetiro = { repair_id: number; tipo: string; enviado_en: string; enviado_por: string };

const STAGES = [
  { tipo: '30',    dias: 30,  label: '1er aviso (30 días)' },
  { tipo: '60',    dias: 60,  label: '2do aviso (60 días)' },
  { tipo: '90',    dias: 90,  label: '3er aviso (90 días)' },
  { tipo: '180',   dias: 180, label: '4to aviso (180 días)' },
  { tipo: 'final', dias: 210, label: 'Aviso final (desmantelamiento)' },
];

const today = () => new Date();
const diasDesde = (fecha: string) => Math.floor((today().getTime() - new Date(fecha).getTime()) / 86400000);

function getWhatsAppMsg(r: Repair, tipo: string) {
  const dias = diasDesde(r.fecha);
  const modelo = `${r.marca} ${r.modelo}`.trim();
  const trabajo = r.trabajoARealizar?.trim() || "la reparación realizada";
  const saludo = `¡Hola, ${r.cliente}! 😊\n\nTe saludamos de YacellTech.\n\n`;
  const equipoTxt = `tu ${modelo} (código ${r.codigo}), donde realizamos ${trabajo}`;
  const msgs: Record<string, string> = {
    '30':    saludo + `Notamos que han pasado ${dias} días desde la finalización de la reparación de ${equipoTxt}, y aún no ha sido retirado de nuestro local.\n\nTe pedimos que pases a buscarlo a la brevedad. Si tienes alguna duda, solo responde este mensaje.\n\n¡Gracias por confiar en YacellTech! 💙`,
    '60':    saludo + `Queremos recordarte que ${equipoTxt}, lleva ${dias} días esperando ser retirado en nuestro local.\n\nTe pedimos que pases a buscarlo lo antes posible. Si necesitas coordinar un horario o tienes alguna duda, solo responde este mensaje.\n\n¡Gracias por confiar en YacellTech! 💙`,
    '90':    `¡Hola, ${r.cliente}! 😊\n\n⚠️ AVISO IMPORTANTE — YacellTech\n\n${equipoTxt[0].toUpperCase() + equipoTxt.slice(1)}, lleva ${dias} días en nuestro local sin ser retirado.\n\nEs muy importante que pases a buscarlo. Si necesitas ayuda, solo responde este mensaje.\n\n¡Gracias por confiar en YacellTech! 💙`,
    '180':   `¡Hola, ${r.cliente}! 😊\n\n⚠️ AVISO URGENTE — YacellTech\n\n${equipoTxt[0].toUpperCase() + equipoTxt.slice(1)}, lleva ${dias} días en nuestro local.\n\nSi no lo retiras en los próximos 30 días, procederemos a desmantelarlo para piezas. YacellTech.`,
    'final': `¡Hola, ${r.cliente}! 😊\n\n⛔ AVISO FINAL — YacellTech\n\n${equipoTxt[0].toUpperCase() + equipoTxt.slice(1)}, lleva más de 7 meses en nuestro local sin ser retirado.\n\nSi no lo recoges en los próximos 30 días será desmantelado para piezas. YacellTech.`,
  };
  return msgs[tipo] ?? msgs['30'];
}

export default function AvisosRetiroPage() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [avisos, setAvisos] = useState<AvisoRetiro[]>([]);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadRepairs(), loadAvisos()]);
    setLoading(false);
  };

  const loadRepairs = async () => {
    try {
      // Calcular "hace 30 días" en hora RD (no en UTC del servidor ni del navegador)
      const [yyyy, mm, dd] = todayRD().split("-").map(Number);
      const dateLimit = new Date(Date.UTC(yyyy, mm - 1, dd));
      dateLimit.setUTCDate(dateLimit.getUTCDate() - 30);
      const hasta = `${dateLimit.getUTCFullYear()}-${String(dateLimit.getUTCMonth() + 1).padStart(2, "0")}-${String(dateLimit.getUTCDate()).padStart(2, "0")}`; // "YYYY-MM-DD"

      const res = await fetch(`/api/repairs?active=true&hasta=${hasta}`);
      const data: Repair[] = await res.json();
      setRepairs(data);
    } catch (e) { console.error(e); }
  };

  const loadAvisos = async () => {
    try {
      const res = await fetch("/api/avisos-retiro");
      const data = await res.json();
      if (Array.isArray(data)) setAvisos(data);
    } catch (e) { console.error(e); }
  };

  const pendingRepairs = repairs.filter(r =>
    (r.status === 'Listo para entregar' || r.status === 'No se pudo reparar') && diasDesde(r.fecha) >= 30
  ).sort((a, b) => diasDesde(b.fecha) - diasDesde(a.fecha));

  const allAvisos = avisos;

  const avisosSentFor = (id: number) => allAvisos.filter(a => a.repair_id === id).map(a => a.tipo);
  const lastAvisoFor  = (id: number) => allAvisos.filter(a => a.repair_id === id).sort((a, b) => b.enviado_en.localeCompare(a.enviado_en))[0];

  const getPendingStage = (id: number, dias: number) => {
    const sent = avisosSentFor(id);
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (dias >= STAGES[i].dias && !sent.includes(STAGES[i].tipo)) return STAGES[i];
    }
    return null;
  };

  const getNextStage = (id: number, dias: number) => {
    const sent = avisosSentFor(id);
    const next = STAGES.find(s => !sent.includes(s.tipo) && s.dias > dias);
    return next ?? null;
  };

  const porEnviar   = pendingRepairs.filter(r => getPendingStage(r.id, diasDesde(r.fecha)) !== null);
  const yaEnviados  = pendingRepairs.filter(r => getPendingStage(r.id, diasDesde(r.fecha)) === null);

  const handleAbrirWhatsApp = (r: Repair, tipo: string) => {
    const msg = getWhatsAppMsg(r, tipo);
    const phone = r.telefono.replace(/\D/g, '');
    const intlPhone = phone.length === 10 ? `1${phone}` : phone;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleMarcarEnviado = async (r: Repair, tipo: string) => {
    setEnviando(r.id);
    try {
      await fetch('/api/avisos-retiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repair_id: r.id, tipo, enviado_por: user?.username || 'caja' }),
      });
      await loadAvisos();
    } catch (e) { console.error(e); }
    setEnviando(null);
  };

  const RepairTableHeader = () => (
    <TableHeader className="bg-slate-50/50">
      <TableRow>
        <TableHead className="font-bold">Código</TableHead>
        <TableHead className="font-bold">Cliente</TableHead>
        <TableHead className="font-bold">Equipo</TableHead>
        <TableHead className="font-bold text-center">Días</TableHead>
        <TableHead className="font-bold">Aviso</TableHead>
        <TableHead className="font-bold">Historial</TableHead>
        <TableHead />
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Avisos de Retiro</h1>
          <p className="text-slate-500 text-sm">Equipos con 30+ días sin retirar. Envía el aviso por WhatsApp y confírmalo.</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadAll} title="Actualizar">
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Pendiente por enviar ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Pendiente por enviar ({loading ? '…' : porEnviar.length})
          </h2>
        </div>
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <RepairTableHeader />
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-slate-400">Cargando...</TableCell></TableRow>
                ) : porEnviar.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-slate-400 italic">No hay avisos pendientes por enviar.</TableCell></TableRow>
                ) : porEnviar.map(r => {
                  const dias = diasDesde(r.fecha);
                  const stage = getPendingStage(r.id, dias)!;
                  const sent = avisosSentFor(r.id);
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
                          dias >= 180 ? 'bg-red-100 text-red-700' :
                          dias >= 90  ? 'bg-orange-100 text-orange-700' :
                          dias >= 60  ? 'bg-amber-100 text-amber-700' :
                                        'bg-yellow-100 text-yellow-700'
                        }>{dias}d</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {STAGES.map(s => (
                            <span key={s.tipo} title={s.label}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${sent.includes(s.tipo) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                            >{s.tipo === 'final' ? 'FIN' : `${s.tipo}d`}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline"
                            onClick={() => handleAbrirWhatsApp(r, stage.tipo)}
                            className="gap-1 text-xs text-green-700 border-green-200 hover:bg-green-50 whitespace-nowrap"
                          >
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </Button>
                          <Button size="sm"
                            disabled={enviando === r.id}
                            onClick={() => handleMarcarEnviado(r, stage.tipo)}
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

      {/* ── Mensaje enviado ── */}
      {!loading && yaEnviados.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Mensaje enviado — espera próximo aviso ({yaEnviados.length})
            </h2>
          </div>
          <Card className="border-none shadow-sm overflow-hidden opacity-70">
            <CardContent className="p-0">
              <Table>
                <RepairTableHeader />
                <TableBody>
                  {yaEnviados.map(r => {
                    const dias = diasDesde(r.fecha);
                    const sent = avisosSentFor(r.id);
                    const last = lastAvisoFor(r.id);
                    const next = getNextStage(r.id, dias);
                    return (
                      <TableRow key={r.id} className="bg-slate-50/30">
                        <TableCell className="font-black text-primary text-xs">{r.codigo}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.cliente}</div>
                          <div className="text-xs text-slate-400">{r.telefono}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.marca} {r.modelo}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={
                            dias >= 180 ? 'bg-red-100 text-red-700' :
                            dias >= 90  ? 'bg-orange-100 text-orange-700' :
                            dias >= 60  ? 'bg-amber-100 text-amber-700' :
                                          'bg-yellow-100 text-yellow-700'
                          }>{dias}d</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-green-700 font-medium">✓ Enviado</div>
                          {last && (
                            <div className="text-[10px] text-slate-400">
                              {formatDateSlash(last.enviado_en)}
                            </div>
                          )}
                          {next && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Próximo: {next.label}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {STAGES.map(s => (
                              <span key={s.tipo} title={s.label}
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${sent.includes(s.tipo) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                              >{s.tipo === 'final' ? 'FIN' : `${s.tipo}d`}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell />
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
