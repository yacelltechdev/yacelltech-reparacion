import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

/**
 * POST /api/boveda/[id]/resolver
 * Body: { tipo_resolucion, notas, resuelto_por, nuevo_status? }
 *
 * Marca un caso de la bóveda como resuelto. Si el tipo_resolucion es
 * 'despachado_bueno' o 'despachado_malo', también actualiza el repair
 * original (PATCH) para que vuelva al flujo normal con su status y fecha
 * correctos. Si es 'perdido' o 'otro', solo se cierra el caso de la bóveda.
 *
 * El estado del repair NUNCA se pierde — antes de modificarlo, dejamos
 * constancia en la bóveda.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { tipo_resolucion, notas, resuelto_por, nuevo_status, fecha_despacho_real } = await req.json();

    if (!['despachado_bueno', 'despachado_malo', 'perdido', 'otro'].includes(tipo_resolucion)) {
      return NextResponse.json({ error: 'tipo_resolucion inválido' }, { status: 400 });
    }

    // Traer la fila de la bóveda con el repair
    const { data: bov, error: bovErr } = await supabase
      .from('boveda_equipos')
      .select('id, repair_id, estado_caso')
      .eq('id', id)
      .single();
    if (bovErr) throw bovErr;
    if (!bov) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 });
    if (bov.estado_caso === 'resuelto') {
      return NextResponse.json({ error: 'Este caso ya está resuelto' }, { status: 400 });
    }

    // Marcar la bóveda como resuelta
    const { error: updErr } = await supabase
      .from('boveda_equipos')
      .update({
        estado_caso: 'resuelto',
        fecha_resolucion: new Date().toISOString(),
        resuelto_por: resuelto_por || null,
        tipo_resolucion,
        notas: notas || null,
      })
      .eq('id', id);
    if (updErr) throw updErr;

    // Si la resolución implica reintegrar el equipo al flujo (Despachado),
    // actualizamos el repair original.
    if (tipo_resolucion === 'despachado_bueno' || tipo_resolucion === 'despachado_malo') {
      const statusFinal = nuevo_status || (
        tipo_resolucion === 'despachado_bueno' ? 'Despachado bueno' : 'Despachado malo'
      );
      const fechaDespacho = fecha_despacho_real || new Date().toISOString();

      const { error: repErr } = await supabase
        .from('repairs')
        .update({
          status: statusFinal,
          fecha_despacho: fechaDespacho,
        })
        .eq('id', bov.repair_id);
      if (repErr) throw repErr;
    }

    return NextResponse.json({
      ok: true,
      message: tipo_resolucion === 'despachado_bueno' || tipo_resolucion === 'despachado_malo'
        ? 'Caso resuelto y equipo reintegrado al histórico'
        : 'Caso cerrado (el equipo sigue archivado en la bóveda)',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
