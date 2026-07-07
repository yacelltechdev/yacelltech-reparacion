import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

/**
 * GET /api/boveda
 * Lista todos los equipos archivados en la bóveda con la info del repair
 * original via JOIN. Soporta filtro opcional por estado_caso y técnico.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado') || '';
    const tecnico = searchParams.get('tecnico') || '';

    let query = supabase
      .from('boveda_equipos')
      .select(`
        id, repair_id, status_al_archivar, tecnico_al_archivar,
        fecha_archivo, archivado_por, motivo,
        estado_caso, fecha_resolucion, resuelto_por, tipo_resolucion, notas,
        repairs:repair_id (
          codigo, cliente, telefono, marca, modelo, color, serie,
          costo, fecha, status, status_anterior_taller
        )
      `)
      .order('fecha_archivo', { ascending: false });

    if (estado) query = query.eq('estado_caso', estado);
    if (tecnico) query = query.eq('tecnico_al_archivar', tecnico);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
