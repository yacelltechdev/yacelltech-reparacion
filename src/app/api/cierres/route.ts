import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    const { data, error } = await supabase.from('cierres').select('*').order('id', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map((r: any) => ({
      ...r,
      snapshot: r.snapshot ? JSON.parse(r.snapshot) : []
    })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { fecha, cerrado_por } = await req.json();

    const { data: repairsData, error: repairsError } = await supabase
      .from('repairs')
      .select('*')
      .like('fecha_despacho', `${fecha}%`)
      .is('cierre_id', null)
      .in('status', ['Entregado bueno', 'Entregado malo']);

    if (repairsError) throw repairsError;

    const parsed = (repairsData || []).map((r: any) => ({
      ...r,
      cargosAdicionales: r.cargosAdicionales ? JSON.parse(r.cargosAdicionales) : []
    }));

    const entregadosBueno = parsed.filter((r: any) => r.status === 'Entregado bueno');
    const entregadosMalo  = parsed.filter((r: any) => r.status === 'Entregado malo');
    const total_ingresos  = entregadosBueno.reduce((sum: number, r: any) =>
      sum + (r.costo || 0) + (r.cargosAdicionales?.reduce((a: number, c: any) => a + c.monto, 0) || 0), 0);

    const hora_cierre = new Date().toISOString();

    const { data: cierre, error: cierreError } = await supabase
      .from('cierres')
      .insert({
        fecha,
        hora_cierre,
        total_ingresos,
        cantidad_reparados: entregadosBueno.length,
        cantidad_devueltos: entregadosMalo.length,
        cerrado_por,
        snapshot: JSON.stringify(parsed),
      })
      .select('id')
      .single();

    if (cierreError) throw cierreError;

    if (parsed.length > 0) {
      const ids = parsed.map((r: any) => r.id);
      const { error: updateError } = await supabase
        .from('repairs')
        .update({ cierre_id: cierre.id })
        .in('id', ids);
      if (updateError) throw updateError;
    }

    return NextResponse.json({
      id: cierre.id,
      total_ingresos,
      cantidad_reparados: entregadosBueno.length,
      cantidad_devueltos: entregadosMalo.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
