import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  try {
    const { error: unlinkError } = await supabase
      .from('repairs')
      .update({ cierre_id: null })
      .eq('cierre_id', id);
    if (unlinkError) throw unlinkError;

    const { error: deleteError } = await supabase
      .from('cierres')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
