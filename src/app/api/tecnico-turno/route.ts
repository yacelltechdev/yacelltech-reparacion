import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

const TECNICOS = ['Oscar', 'Freddy', 'Carlos'];

export async function GET() {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'tecnico_turno_index')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const index = parseInt(data.value, 10) % TECNICOS.length;
  return NextResponse.json({ tecnico: TECNICOS[index], index });
}
