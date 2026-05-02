import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q       = searchParams.get("q")?.trim() || "";
    const status  = searchParams.get("status") || "";
    const tecnico = searchParams.get("tecnico") || "";
    const desde   = searchParams.get("desde") || "";
    const hasta   = searchParams.get("hasta") || "";
    const page    = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit   = parseInt(searchParams.get("limit") || "0");

    let query = supabase.from('repairs').select('*', { count: 'exact' });

    if (q) {
      query = query.or(`codigo.ilike.%${q}%,cliente.ilike.%${q}%,telefono.ilike.%${q}%,modelo.ilike.%${q}%,marca.ilike.%${q}%,serie.ilike.%${q}%`);
    }
    if (status)  query = query.eq('status', status);
    if (tecnico) query = query.eq('tecnico', tecnico);
    if (desde)   query = query.gte('fecha', desde);
    if (hasta)   query = query.lte('fecha', hasta + 'T23:59:59');

    query = query.order('id', { ascending: false });

    if (limit > 0) {
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((r: any) => ({
      ...r,
      checklist:         r.checklist         ? JSON.parse(r.checklist)         : null,
      patronArray:       r.patronArray        ? JSON.parse(r.patronArray)        : [],
      cargosAdicionales: r.cargosAdicionales  ? JSON.parse(r.cargosAdicionales)  : [],
    }));

    return NextResponse.json(limit > 0 ? { data: formatted, total: count } : formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const r = await req.json();

    const { data, error } = await supabase
      .from('repairs')
      .insert({
        codigo: r.codigo, cliente: r.cliente, cedula: r.cedula, telefono: r.telefono,
        marca: r.marca, modelo: r.modelo, color: r.color, serie: r.serie, sintoma: r.sintoma,
        costo: r.costo, claveTexto: r.claveTexto, tipoClave: r.tipoClave,
        status: r.status, tecnico: r.tecnico, estadoInicial: r.estadoInicial,
        observacion: r.observacion, fecha: r.fecha,
        checklist:         JSON.stringify(r.checklist),
        patronArray:       JSON.stringify(r.patronArray),
        cargosAdicionales: JSON.stringify(r.cargosAdicionales || []),
      })
      .select('id')
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
