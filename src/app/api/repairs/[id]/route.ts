import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { nowRD } from '@/lib/date';

const DELIVERED_STATUSES = ['Despachado bueno', 'Despachado malo'];
const RECEIVED_AT_FRONT_STATUS = 'Entregado a recepción';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('repairs').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ deleted: 1 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();

    if (Object.keys(updates).length === 0) return NextResponse.json({ updated: 0 });

    // Regla de negocio (2026-07-05): no se puede despachar un equipo que
    // el técnico aún no entregó a recepción. Solo cuando pasa por
    // 'Entregado a recepción' la caja puede despacharlo.
    if ('status' in updates && DELIVERED_STATUSES.includes(updates.status)) {
      const { data: current, error: fetchErr } = await supabase
        .from('repairs')
        .select('status')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;
      if (current?.status !== RECEIVED_AT_FRONT_STATUS) {
        return NextResponse.json(
          {
            error:
              'El técnico aún no entregó este equipo a recepción. Status actual: ' +
              (current?.status ?? 'desconocido'),
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = { ...updates };
    for (const k of ['checklist', 'patronArray', 'cargosAdicionales']) {
      if (k in updateData && typeof updateData[k] !== 'string') {
        updateData[k] = JSON.stringify(updateData[k]);
      }
    }

    // Auto-set fecha_despacho al despachar
    if (
      'status' in updateData &&
      DELIVERED_STATUSES.includes(updateData.status) &&
      !updateData.fecha_despacho
    ) {
      updateData.fecha_despacho = nowRD();
    }

    // Auto-set fecha_entrega_recepcion cuando el técnico marca "Entregar a recepción"
    if (
      'status' in updateData &&
      updateData.status === RECEIVED_AT_FRONT_STATUS &&
      !updateData.fecha_entrega_recepcion
    ) {
      updateData.fecha_entrega_recepcion = nowRD();
    }

    // 2026-07-06: al transicionar a "Entregado a recepción", guardar el status
    // anterior del taller (Listo para entregar / No se pudo reparar) para que
    // la caja vea en la bandeja si el equipo quedó listo o sin solución.
    // Si el técnico revierte ("En reparación" desde la bandeja), limpiar el campo.
    if ('status' in updateData) {
      if (updateData.status === RECEIVED_AT_FRONT_STATUS) {
        const { data: currentRow } = await supabase
          .from('repairs')
          .select('status')
          .eq('id', id)
          .single();
        const prev = currentRow?.status;
        if (prev === 'Listo para entregar' || prev === 'No se pudo reparar') {
          updateData.status_anterior_taller = prev;
        }
      } else if (updateData.status === 'En reparación') {
        // Revertir a taller: limpiar el snapshot
        updateData.status_anterior_taller = null;
      }
    }

    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ updated: 1 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
