import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  const { data, error } = await supabase
    .from('observaciones_preset')
    .select('*')
    .order('orden', { ascending: true })
    .order('texto', { ascending: true });

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: 'Texto requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('observaciones_preset')
    .insert({ texto: texto.trim() })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const { error } = await supabase.from('observaciones_preset').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
