import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

const ALLOWED = ['models', 'marcas', 'colores'];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!ALLOWED.includes(table)) return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!ALLOWED.includes(table)) return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  try {
    const { nombre } = await req.json();
    const { data, error } = await supabase
      .from(table)
      .upsert({ nombre }, { onConflict: 'nombre', ignoreDuplicates: true })
      .select('id')
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data?.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
