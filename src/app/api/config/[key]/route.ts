import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', key)
    .single();

  if (error) return NextResponse.json({ value: null }, { status: 404 });
  return NextResponse.json({ value: data.value });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { value } = await req.json();
  const { error } = await supabase
    .from('config')
    .upsert({ key, value: String(value) });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ value });
}
