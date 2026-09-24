import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { cierreBlockReasonRD, cierreDateRangeRD } from '@/lib/date';

export async function GET() {
  try {
    const { data, error } = await supabase.from('cierres').select('*').order('id', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map((r: any) => ({
      ...r,
      snapshot: r.snapshot ? JSON.parse(r.snapshot) : []
    })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { fecha, cerrado_por } = await req.json();

    // Regla de negocio "cuadre dominical": los domingos no se cierra caja.
    // Las facturas despachadas el domingo se incluyen en el cuadre del lunes.
    // El UI ya bloquea el botón, pero defendemos también el endpoint para
    // evitar que un cliente directo (Postman/curl/otro) cree un cierre en 0.
    if (!fecha || typeof fecha !== 'string') {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });
    }
    const cierreBlockReason = cierreBlockReasonRD(fecha);
    if (cierreBlockReason) {
      return NextResponse.json(
        { error: cierreBlockReason },
        { status: 400 }
      );
    }

    // 2026-07-06: regla de cierre — la caja no se puede cerrar si hay equipos
    // en "Entregado a recepción" sin despachar. La cajera debe entregar o devolver
    // TODOS los equipos que el técnico le dejó antes de cerrar caja al final del día.
    const { data: enRecepcion, error: recepErr } = await supabase
      .from('repairs')
      .select('id, codigo, cliente, status_anterior_taller')
      .eq('status', 'Entregado a recepción');
    if (recepErr) throw recepErr;
    if (enRecepcion && enRecepcion.length > 0) {
      return NextResponse.json(
        {
          error: `No se puede cerrar caja: hay ${enRecepcion.length} equipo${enRecepcion.length !== 1 ? 's' : ''} en recepción pendiente${enRecepcion.length !== 1 ? 's' : ''} de despachar. Entrégalos o devuélvelos primero.`,
          enRecepcion: enRecepcion.map((r: any) => r.codigo),
        },
        { status: 400 }
      );
    }

    // El rango centraliza tanto la regla dominical como cualquier excepción
    // operativa fechada, para que UI y servidor cierren exactamente lo mismo.
    const { desde, hasta } = cierreDateRangeRD(fecha);

    let repairsQuery = supabase
      .from('repairs')
      .select('*')
      .is('cierre_id', null)
      .in('status', ['Despachado bueno', 'Despachado malo']);
    if (desde !== hasta) {
      // .like OR .like — Supabase lo respeta como AND con OR interno
      repairsQuery = repairsQuery.or(
        `fecha_despacho.like.${hasta}%,fecha_despacho.like.${desde}%`
      );
    } else {
      repairsQuery = repairsQuery.like('fecha_despacho', `${hasta}%`);
    }
    const { data: repairsData, error: repairsError } = await repairsQuery;

    const parsed = (repairsData || []).map((r: any) => ({
      ...r,
      cargosAdicionales: r.cargosAdicionales ? JSON.parse(r.cargosAdicionales) : []
    }));

    const entregadosBueno = parsed.filter((r: any) => r.status === 'Despachado bueno');
    const entregadosMalo  = parsed.filter((r: any) => r.status === 'Despachado malo');
    const cobrados = [...entregadosBueno, ...entregadosMalo.filter((r: any) => (r.costo || 0) > 0)];
    const total_ingresos  = cobrados.reduce((sum: number, r: any) =>
      sum + (r.costo || 0) + (r.cargosAdicionales?.reduce((a: number, c: any) => a + c.monto, 0) || 0), 0);

    const hora_cierre = new Date().toISOString();

    const { data: cierre, error: cierreError } = await supabase
      .from('cierres')
      .insert({
        fecha,
        hora_cierre,
        total_ingresos,
        cantidad_reparados: entregadosBueno.length,
        cantidad_devueltos: entregadosMalo.length,
        cerrado_por,
        snapshot: JSON.stringify(parsed),
      })
      .select('id')
      .single();

    if (cierreError) throw cierreError;

    if (parsed.length > 0) {
      const ids = parsed.map((r: any) => r.id);
      const { error: updateError } = await supabase
        .from('repairs')
        .update({ cierre_id: cierre.id })
        .in('id', ids);
      if (updateError) throw updateError;
    }

    return NextResponse.json({
      id: cierre.id,
      total_ingresos,
      cantidad_reparados: entregadosBueno.length,
      cantidad_devueltos: entregadosMalo.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
