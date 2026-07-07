import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q       = searchParams.get("q")?.trim() || "";
    const status  = searchParams.get("status") || "";
    const tecnico = searchParams.get("tecnico") || "";
    const desde          = searchParams.get("desde") || "";
    const hasta          = searchParams.get("hasta") || "";
    const despachoDesde  = searchParams.get("despacho_desde") || "";
    const despachoHasta  = searchParams.get("despacho_hasta") || "";
    const active         = searchParams.get("active") === "true";
    const includeArchived = searchParams.get("include_archived") === "true";
    const page    = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit   = parseInt(searchParams.get("limit") || "0");

    let query = supabase.from('repairs').select('*', { count: 'exact' });

    if (active) {
      query = query.in('status', ["En chequeo", "En reparación", "Listo para entregar", "No se pudo reparar", "Entregado a recepción"]);
    }

    // Excluir por defecto los repairs archivados en la bóveda. Para incluirlos
    // (ej. desde la página de archivar o auditoría), pasar include_archived=true.
    // El opt-out es explícito: por seguridad, ningún endpoint existente ve
    // bóveda sin pedirlo.
    if (!includeArchived) {
      const { data: bovedaIds } = await supabase
        .from('boveda_equipos')
        .select('repair_id');
      const ids = (bovedaIds || []).map((b: any) => b.repair_id);
      if (ids.length > 0) {
        // .not('id', 'in', `(${ids.join(',')})`) — defensivo: si la bóveda
        // está vacía, no aplicamos filtro (PostgREST no acepta IN vacío).
        query = query.not('id', 'in', `(${ids.join(',')})`);
      }
    }
    if (q) {
      query = query.or(`codigo.ilike.%${q}%,cliente.ilike.%${q}%,telefono.ilike.%${q}%,modelo.ilike.%${q}%,marca.ilike.%${q}%,serie.ilike.%${q}%`);
    }
    if (status)        query = query.eq('status', status);
    if (tecnico)       query = query.ilike('tecnico', tecnico.trim());
    if (desde)         query = query.gte('fecha', desde);
    if (hasta)         query = query.lte('fecha', hasta + 'T23:59:59');
    if (despachoDesde) query = query.gte('fecha_despacho', despachoDesde);
    if (despachoHasta) query = query.lte('fecha_despacho', despachoHasta + 'T23:59:59');

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

    // Generar código secuencial REP-00001, REP-00002, ...
    const { data: last } = await supabase
      .from('repairs')
      .select('codigo')
      .like('codigo', 'REP-%')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const lastNum = last?.codigo ? parseInt(last.codigo.replace('REP-', ''), 10) : 0;
    const codigo = `REP-${(lastNum + 1).toString().padStart(5, '0')}`;

    const { data, error } = await supabase
      .from('repairs')
      .insert({
        codigo, cliente: r.cliente, cedula: r.cedula, telefono: r.telefono,
        marca: r.marca, modelo: r.modelo, color: r.color, serie: r.serie, sintoma: r.sintoma,
        costo: r.costo, claveTexto: r.claveTexto, tipoClave: r.tipoClave,
        tipoPantalla: r.tipoPantalla ?? null,
        trabajoARealizar: r.trabajoARealizar ?? null,
        status: r.status, tecnico: r.tecnico, estadoInicial: r.estadoInicial,
        observacion: r.observacion, fecha: r.fecha,
        fecha_despacho: r.fecha_despacho ?? null,
        checklist:         JSON.stringify(r.checklist),
        patronArray:       JSON.stringify(r.patronArray),
        cargosAdicionales: JSON.stringify(r.cargosAdicionales || []),
      })
      .select('id')
      .single();

    if (error) throw error;

    // Avanzar turno de técnico (rotación Oscar → Freddy → Carlos → Oscar)
    await supabase.rpc('increment_tecnico_turno');

    return NextResponse.json({ id: data.id, codigo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
