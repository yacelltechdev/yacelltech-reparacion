import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { nowRD } from '@/lib/date';

const DELIVERED_STATUSES = ['Despachado bueno', 'Despachado malo'];

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

    const updateData: any = { ...updates };
    for (const k of ['checklist', 'patronArray', 'cargosAdicionales']) {
      if (k in updateData && typeof updateData[k] !== 'string') {
        updateData[k] = JSON.stringify(updateData[k]);
      }
    }

    if (
      'status' in updateData &&
      DELIVERED_STATUSES.includes(updateData.status) &&
      !updateData.fecha_despacho
    ) {
      updateData.fecha_despacho = nowRD();
    }

    const { error } = await supabase.from('repairs').update(updateData).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ updated: 1 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
