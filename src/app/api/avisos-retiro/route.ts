import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('avisos_retiro')
      .select('repair_id, tipo, enviado_en, enviado_por')
      .order('enviado_en', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { repair_id, tipo, enviado_por } = await req.json();
    const { error } = await supabase
      .from('avisos_retiro')
      .insert({ repair_id, tipo, enviado_por });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
