import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', params.key)
    .single();

  if (error) return NextResponse.json({ value: null }, { status: 404 });
  return NextResponse.json({ value: data.value });
}

export async function PATCH(req: Request, { params }: { params: { key: string } }) {
  const { value } = await req.json();
  const { error } = await supabase
    .from('config')
    .upsert({ key: params.key, value: String(value) });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ value });
}
