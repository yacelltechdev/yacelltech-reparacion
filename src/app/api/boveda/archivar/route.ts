import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

/**
 * POST /api/boveda/archivar
 * Body: { repairIds: number[], motivo?: string, archivado_por?: string }
 *
 * Mueve los repairs especificados a la bóveda. El repair original NO se
 * modifica — solo se crea una fila en boveda_equipos con un puntero.
 *
 * Validaciones:
 *   - Todos los repairIds deben existir
 *   - Ninguno puede estar ya en la bóveda (UNIQUE constraint lo bloquea)
 *   - Solo se permiten archivar repairs en estados del taller (los que cuentan
 *     para inventario). Archivar un "Despachado bueno" no tiene sentido.
 */
export async function POST(req: Request) {
  try {
    const { repairIds, motivo, archivado_por } = await req.json();

    if (!Array.isArray(repairIds) || repairIds.length === 0) {
      return NextResponse.json({ error: 'repairIds[] requerido' }, { status: 400 });
    }

    // Traer los repairs a archivar
    const { data: repairs, error: repErr } = await supabase
      .from('repairs')
      .select('id, status, tecnico, codigo')
      .in('id', repairIds);
    if (repErr) throw repErr;

    if (!repairs || repairs.length === 0) {
      return NextResponse.json({ error: 'Ningún repair encontrado' }, { status: 404 });
    }

    // Validar que todos están en estados "archivables" (los del taller)
    const ESTADOS_ARCHIVABLES = [
      'En chequeo',
      'En reparación',
      'Listo para entregar',
      'No se pudo reparar',
    ];
    const invalidos = repairs.filter(r => !ESTADOS_ARCHIVABLES.includes(r.status));
    if (invalidos.length > 0) {
      return NextResponse.json(
        {
          error: `Estos equipos no están en estados del taller: ${invalidos.map(r => `${r.codigo} (${r.status})`).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Verificar que ninguno esté ya en la bóveda
    const { data: yaEnBoveda, error: bovErr } = await supabase
      .from('boveda_equipos')
      .select('repair_id')
      .in('repair_id', repairIds);
    if (bovErr) throw bovErr;
    if (yaEnBoveda && yaEnBoveda.length > 0) {
      return NextResponse.json(
        { error: `Ya están en la bóveda: ${yaEnBoveda.length} equipo(s)` },
        { status: 400 }
      );
    }

    // Insertar en boveda_equipos
    const rows = repairs.map(r => ({
      repair_id: r.id,
      status_al_archivar: r.status,
      tecnico_al_archivar: r.tecnico,
      motivo: motivo || 'No localizado en inventario físico',
      archivado_por: archivado_por || null,
      estado_caso: 'pendiente',
    }));

    const { data: inserted, error: insErr } = await supabase
      .from('boveda_equipos')
      .insert(rows)
      .select('id');
    if (insErr) throw insErr;

    return NextResponse.json({
      ok: true,
      archivados: inserted?.length || 0,
      message: `${inserted?.length || 0} equipo(s) movido(s) a la bóveda`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
