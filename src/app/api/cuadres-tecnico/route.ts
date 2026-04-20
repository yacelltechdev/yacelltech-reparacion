import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('cuadres_tecnico')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map((c: any) => ({
      ...c,
      snapshot: c.snapshot ? JSON.parse(c.snapshot) : [],
    })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tecnico, desde, hasta, creado_por } = await req.json();

    const { data: repairsData, error: repairsError } = await supabase
      .from('repairs')
      .select('*')
      .eq('tecnico', tecnico)
      .eq('status', 'Entregado bueno')
      .is('cuadre_tecnico_id', null)
      .gte('fecha_despacho', desde)
      .lte('fecha_despacho', hasta + 'T23:59:59');

    if (repairsError) throw repairsError;

    const parsed = (repairsData || []).map((r: any) => ({
      ...r,
      cargosAdicionales: r.cargosAdicionales ? JSON.parse(r.cargosAdicionales) : [],
    }));

    const total_generado = parsed.reduce((sum: number, r: any) =>
      sum + (r.costo || 0) + (r.cargosAdicionales?.reduce((a: number, c: any) => a + c.monto, 0) || 0), 0);

    const { data: cuadre, error: cuadreError } = await supabase
      .from('cuadres_tecnico')
      .insert({
        tecnico,
        desde,
        hasta,
        cantidad_reparados: parsed.length,
        total_generado,
        creado_por,
        snapshot: JSON.stringify(parsed),
      })
      .select('id')
      .single();

    if (cuadreError) throw cuadreError;

    if (parsed.length > 0) {
      const ids = parsed.map((r: any) => r.id);
      const { error: updateError } = await supabase
        .from('repairs')
        .update({ cuadre_tecnico_id: cuadre.id })
        .in('id', ids);
      if (updateError) throw updateError;
    }

    return NextResponse.json({
      id: cuadre.id,
      cantidad_reparados: parsed.length,
      total_generado,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
