import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  try {
    // Liberar las reparaciones asociadas
    const { error: unlinkError } = await supabase
      .from('repairs')
      .update({ cuadre_tecnico_id: null })
      .eq('cuadre_tecnico_id', id);
    if (unlinkError) throw unlinkError;

    // Eliminar el cuadre
    const { error: deleteError } = await supabase
      .from('cuadres_tecnico')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
