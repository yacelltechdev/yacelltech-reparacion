import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export function normalizeCedula(raw: string): string {
  if (!raw) return '';
  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly || raw.trim().toLowerCase();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const checkCedula = searchParams.get('check') || searchParams.get('cedula');

  if (checkCedula) {
    const clean = normalizeCedula(checkCedula);
    if (!clean) {
      return NextResponse.json({ blocked: false });
    }

    const { data, error } = await supabase
      .from('clientes_bloqueados')
      .select('*')
      .eq('cedula', clean)
      .maybeSingle();

    if (error) {
      console.error('Error al consultar cliente bloqueado:', error);
      return NextResponse.json({ blocked: false });
    }

    if (data) {
      return NextResponse.json({ blocked: true, client: data });
    }

    return NextResponse.json({ blocked: false });
  }

  // Lista completa de clientes bloqueados
  const { data, error } = await supabase
    .from('clientes_bloqueados')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error al obtener lista de bloqueados:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cedula, nombre, motivo, creado_por } = body;

    if (!cedula || !cedula.trim()) {
      return NextResponse.json({ error: 'La cédula es requerida' }, { status: 400 });
    }

    const clean = normalizeCedula(cedula);

    const { data, error } = await supabase
      .from('clientes_bloqueados')
      .insert({
        cedula: clean,
        cedula_formato: cedula.trim(),
        nombre: nombre?.trim() || null,
        motivo: motivo?.trim() || null,
        creado_por: creado_por || 'admin',
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Esta cédula ya se encuentra bloqueada' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id, cedula } = body;

    let query = supabase.from('clientes_bloqueados').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (cedula) {
      const clean = normalizeCedula(cedula);
      query = query.eq('cedula', clean);
    } else {
      return NextResponse.json({ error: 'Se requiere id o cédula' }, { status: 400 });
    }

    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al desmarcar cliente' }, { status: 500 });
  }
}
