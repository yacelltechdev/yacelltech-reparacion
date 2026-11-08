import { randomUUID } from 'crypto';
import { supabase } from '../db';
import { Repair } from '../types';
import { nowRD } from '../date';
import {
  FieldDiff,
  PreparedChange,
  RevertResult,
  SanitizedRepair,
  UpdateRepairResult,
  VerificationFieldDetail,
  VerificationResult,
} from './types';
import {
  calculateTotalCost,
  computeVersionHash,
  ProposedPatchSchema,
  sanitizeRepair,
  validateBusinessRules,
} from './validation';
import { checkIdempotency, findAuditByOperationId, recordAudit } from './audit';

const FIELD_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  cedula: 'Cédula',
  telefono: 'Teléfono',
  marca: 'Marca',
  modelo: 'Modelo',
  color: 'Color',
  serie: 'Número de Serie / IMEI',
  sintoma: 'Falla reportada',
  trabajoARealizar: 'Trabajo a realizar',
  costo: 'Costo base (RD$)',
  cargosAdicionales: 'Cargos adicionales',
  tecnico: 'Técnico asignado',
  estadoInicial: 'Estado inicial',
  tipoPantalla: 'Tipo de pantalla',
  observacion: 'Observaciones',
  notaDevolucion: 'Nota de devolución',
  status: 'Estado de la reparación',
  esChequeo: 'Es chequeo',
};

function formatValueForDisplay(val: any): string {
  if (val === null || val === undefined || val === '') return '(vacío)';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function parseRepairRow(r: any): Repair {
  return {
    ...r,
    checklist: r.checklist ? (typeof r.checklist === 'string' ? JSON.parse(r.checklist) : r.checklist) : null,
    patronArray: r.patronArray ? (typeof r.patronArray === 'string' ? JSON.parse(r.patronArray) : r.patronArray) : [],
    cargosAdicionales: r.cargosAdicionales
      ? (typeof r.cargosAdicionales === 'string' ? JSON.parse(r.cargosAdicionales) : r.cargosAdicionales)
      : [],
  };
}

export async function buscarReparaciones(
  query: string,
  limit = 5
): Promise<{
  coincidencias: SanitizedRepair[];
  total: number;
  es_ambiguo: boolean;
  advertencia?: string;
}> {
  const q = query.trim();
  if (!q) {
    return { coincidencias: [], total: 0, es_ambiguo: false };
  }

  // Normalizar búsqueda por código REP
  let formattedCode = '';
  const numMatch = q.match(/^(\d{1,5})$/);
  if (numMatch) {
    formattedCode = `REP-${numMatch[1].padStart(5, '0')}`;
  }

  let dbQuery = supabase.from('repairs').select('*', { count: 'exact' });

  if (formattedCode) {
    dbQuery = dbQuery.or(`codigo.eq.${formattedCode},codigo.ilike.%${q}%,cliente.ilike.%${q}%,telefono.ilike.%${q}%`);
  } else {
    dbQuery = dbQuery.or(
      `codigo.ilike.%${q}%,cliente.ilike.%${q}%,telefono.ilike.%${q}%,modelo.ilike.%${q}%,marca.ilike.%${q}%,serie.ilike.%${q}%`
    );
  }

  dbQuery = dbQuery.order('id', { ascending: false }).limit(limit);

  const { data, count, error } = await dbQuery;
  if (error) throw new Error(`Error al buscar reparaciones: ${error.message}`);

  const parsed = (data || []).map(parseRepairRow);
  const total = count || parsed.length;
  const esAmbiguo = total > 1;

  return {
    coincidencias: parsed.map(sanitizeRepair),
    total,
    es_ambiguo: esAmbiguo,
    advertencia: esAmbiguo
      ? `Se encontraron ${total} reparaciones que coinciden con "${query}". No se seleccionó ninguna automáticamente para evitar errores. Por favor verifique el código exacto (ej. REP-00125).`
      : undefined,
  };
}

export async function obtenerReparacion(
  idOCodigo: string | number
): Promise<{ reparacion: SanitizedRepair; raw: Repair; version_hash: string }> {
  let query = supabase.from('repairs').select('*');

  const str = String(idOCodigo).trim();
  if (/^\d+$/.test(str) && !str.startsWith('0')) {
    query = query.or(`id.eq.${parseInt(str, 10)},codigo.ilike.${str}`);
  } else {
    // Si viene como 00125 o REP-00125
    const repCode = str.toUpperCase().startsWith('REP-')
      ? str.toUpperCase()
      : `REP-${str.replace(/\D/g, '').padStart(5, '0')}`;
    query = query.or(`codigo.ilike.${str},codigo.eq.${repCode}`);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw new Error(`Error al obtener reparación: ${error.message}`);
  if (!data) throw new Error(`No se encontró ninguna reparación con el identificador "${idOCodigo}".`);

  const raw = parseRepairRow(data);
  const versionHash = computeVersionHash(raw);
  return {
    reparacion: sanitizeRepair(raw),
    raw,
    version_hash: versionHash,
  };
}

export async function prepararCambios(
  idOCodigo: string | number,
  propuesta: Record<string, any>,
  justificacion?: string,
  actor = 'AI_AGENT'
): Promise<PreparedChange> {
  const { raw: current, version_hash: initialVersionHash } = await obtenerReparacion(idOCodigo);

  // Validar schema con Zod
  const parseResult = ProposedPatchSchema.safeParse(propuesta);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Los datos propuestos tienen errores de validación: ${errorDetails}`);
  }

  const cleanPatch = { ...parseResult.data };

  // Manejar azúcar sintáctico de nuevoCargo
  if (cleanPatch.nuevoCargo) {
    const currentCargos = Array.isArray(current.cargosAdicionales) ? [...current.cargosAdicionales] : [];
    const nextId = currentCargos.length > 0 ? Math.max(...currentCargos.map((c) => c.id || 0)) + 1 : 1;
    currentCargos.push({
      id: cleanPatch.nuevoCargo.id || nextId,
      desc: cleanPatch.nuevoCargo.desc,
      monto: Number(cleanPatch.nuevoCargo.monto),
    });
    cleanPatch.cargosAdicionales = currentCargos;
    delete cleanPatch.nuevoCargo;
  }

  // Validar reglas de negocio
  const bizCheck = validateBusinessRules(current, cleanPatch);
  if (!bizCheck.valid) {
    throw new Error(`Validación de reglas de negocio fallida:\n- ${bizCheck.errors.join('\n- ')}`);
  }

  // Si incluye cédula, verificar si está bloqueado
  if (cleanPatch.cedula) {
    const cleanCedula = cleanPatch.cedula.replace(/\D/g, '') || cleanPatch.cedula.trim().toLowerCase();
    if (cleanCedula) {
      const { data: bloqueado } = await supabase
        .from('clientes_bloqueados')
        .select('motivo')
        .eq('cedula', cleanCedula)
        .maybeSingle();
      if (bloqueado) {
        throw new Error(`La cédula "${cleanPatch.cedula}" pertenece a un cliente bloqueado (${bloqueado.motivo}).`);
      }
    }
  }

  // Calcular Diff campo por campo
  const diffs: FieldDiff[] = [];
  const modifiedFields: string[] = [];

  for (const [key, newVal] of Object.entries(cleanPatch)) {
    if (newVal === undefined) continue;
    const oldVal = (current as any)[key];
    const isDifferent =
      typeof newVal === 'object'
        ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
        : oldVal !== newVal;

    if (isDifferent) {
      diffs.push({
        campo: key,
        etiqueta: FIELD_LABELS[key] || key,
        anterior: oldVal,
        nuevo: newVal,
        modificado: true,
      });
      modifiedFields.push(key);
    }
  }

  if (diffs.length === 0) {
    bizCheck.warnings.push('La propuesta no contiene cambios respecto a los valores actuales de la reparación.');
  }

  const simulated = {
    ...current,
    ...cleanPatch,
  };
  const totalAnterior = calculateTotalCost(current);
  const totalNuevo = calculateTotalCost(simulated);

  const operacionId = randomUUID();

  // Generar resumen legible para confirmación
  const lines: string[] = [
    `Propuesta de modificación para ${current.codigo} (Cliente: ${current.cliente}):`,
  ];
  for (const d of diffs) {
    lines.push(`• ${d.etiqueta}: "${formatValueForDisplay(d.anterior)}" → "${formatValueForDisplay(d.nuevo)}"`);
  }
  if (totalAnterior !== totalNuevo) {
    lines.push(`• Costo Total: RD$${totalAnterior.toLocaleString()} → RD$${totalNuevo.toLocaleString()}`);
  }
  if (justificacion) {
    lines.push(`Motivo/Justificación: ${justificacion}`);
  }

  const resumen = lines.join('\n');

  // Registrar propuesta en el log de auditoría (sin alterar la tabla repairs)
  await recordAudit({
    operation_id: operacionId,
    repair_id: current.id,
    repair_codigo: current.codigo,
    actor,
    action: 'preparar',
    status: 'propuesto',
    cambios: diffs,
    snapshot_anterior: current,
    snapshot_nuevo: simulated,
    metadata: {
      version_hash: initialVersionHash,
      justificacion: justificacion || null,
      totalAnterior,
      totalNuevo,
    },
  });

  return {
    operacion_id: operacionId,
    repair_id: current.id,
    repair_codigo: current.codigo,
    version_hash: initialVersionHash,
    diff: diffs,
    campos_modificados: modifiedFields,
    total_anterior: totalAnterior,
    total_nuevo: totalNuevo,
    advertencias: bizCheck.warnings,
    datos_propuestos: cleanPatch,
    resumen,
    requiere_confirmacion_usuario: true,
  };
}

export async function actualizarReparacion(params: {
  operacion_id: string;
  id_o_codigo: string | number;
  version_hash: string;
  cambios_aprobados: Record<string, any>;
  aprobacion_explicita: boolean;
  actor?: string;
}): Promise<UpdateRepairResult> {
  const { operacion_id, id_o_codigo, version_hash, cambios_aprobados, aprobacion_explicita, actor = 'AI_AGENT' } = params;

  if (aprobacion_explicita !== true) {
    throw new Error(
      'Acción denegada: Se requiere confirmación y aprobación explícita del usuario (aprobacion_explicita = true) para guardar modificaciones.'
    );
  }

  // Idempotencia: Verificar si ya se aplicó esta operación
  const existingAudit = await checkIdempotency(operacion_id);
  if (existingAudit) {
    return {
      exito: true,
      operacion_id,
      repair_id: existingAudit.repair_id,
      repair_codigo: existingAudit.repair_codigo,
      campos_actualizados: (existingAudit.cambios || []).map((c) => c.campo),
      mensaje: 'La operación ya había sido aplicada previamente con éxito (idempotencia confirmada).',
      audit_id: existingAudit.id,
    };
  }

  // Obtener estado fresco de la reparación
  const { raw: freshRepair, version_hash: currentHash } = await obtenerReparacion(id_o_codigo);

  // Control de concurrencia optimista
  if (version_hash && currentHash !== version_hash) {
    throw new Error(
      `Conflicto de concurrencia: La reparación ${freshRepair.codigo} fue modificada por otro usuario después de la preparación. Vuelva a preparar los cambios con los datos actuales antes de aplicar.`
    );
  }

  // Sanitizar y validar los cambios
  const updateData: Record<string, any> = { ...cambios_aprobados };
  delete updateData.nuevoCargo;

  // Prohibir modificar campos inmutables
  delete updateData.id;
  delete updateData.codigo;
  delete updateData.fecha;

  // Lógica de transición de estados y fechas
  const DELIVERED_STATUSES = ['Despachado bueno', 'Despachado malo'];
  const RECEIVED_AT_FRONT_STATUS = 'Entregado a recepción';

  if ('status' in updateData && DELIVERED_STATUSES.includes(updateData.status)) {
    if (freshRepair.status !== RECEIVED_AT_FRONT_STATUS) {
      throw new Error(
        `Regla de negocio: No se puede despachar un equipo que no ha pasado por "Entregado a recepción" (Status actual: "${freshRepair.status}").`
      );
    }
    if (!updateData.fecha_despacho) {
      updateData.fecha_despacho = nowRD();
    }
  }

  if ('status' in updateData && updateData.status === RECEIVED_AT_FRONT_STATUS) {
    if (!updateData.fecha_entrega_recepcion) {
      updateData.fecha_entrega_recepcion = nowRD();
    }
    if (freshRepair.status === 'Listo para entregar' || freshRepair.status === 'No se pudo reparar') {
      updateData.status_anterior_taller = freshRepair.status;
    }
  } else if ('status' in updateData && updateData.status === 'En reparación') {
    updateData.status_anterior_taller = null;
  }

  // Formatear JSONs requeridos por la estructura de Supabase
  const dbPayload: any = { ...updateData };
  for (const k of ['checklist', 'patronArray', 'cargosAdicionales']) {
    if (k in dbPayload && typeof dbPayload[k] !== 'string') {
      dbPayload[k] = JSON.stringify(dbPayload[k]);
    }
  }

  // Ejecutar UPDATE atómico en la base de datos
  const { error: updateError } = await supabase.from('repairs').update(dbPayload).eq('id', freshRepair.id);
  if (updateError) {
    throw new Error(`Error en base de datos al actualizar la reparación: ${updateError.message}`);
  }

  // Consultar estado final después de la actualización
  const { raw: updatedRepair } = await obtenerReparacion(freshRepair.id);

  // Calcular diff final aplicado
  const diffs: FieldDiff[] = [];
  for (const [k, v] of Object.entries(updateData)) {
    diffs.push({
      campo: k,
      etiqueta: FIELD_LABELS[k] || k,
      anterior: (freshRepair as any)[k],
      nuevo: v,
      modificado: true,
    });
  }

  // Registrar auditoría persistente
  const auditRes = await recordAudit({
    operation_id: operacion_id,
    repair_id: freshRepair.id,
    repair_codigo: freshRepair.codigo,
    actor,
    action: 'actualizar',
    status: 'aplicado',
    cambios: diffs,
    snapshot_anterior: freshRepair,
    snapshot_nuevo: updatedRepair,
    metadata: {
      applied_at: nowRD(),
    },
  });

  return {
    exito: true,
    operacion_id,
    repair_id: freshRepair.id,
    repair_codigo: freshRepair.codigo,
    campos_actualizados: Object.keys(updateData),
    mensaje: `Reparación ${freshRepair.codigo} actualizada exitosamente.`,
    audit_id: auditRes.id,
  };
}

export async function verificarCambios(
  idOCodigo: string | number,
  operacionId?: string,
  camposEsperados?: Record<string, any>
): Promise<VerificationResult> {
  const { raw: freshRepair } = await obtenerReparacion(idOCodigo);

  let targets: Record<string, any> = camposEsperados || {};

  // Si se provee operacion_id, recuperar los cambios del registro de auditoría
  if (operacionId && Object.keys(targets).length === 0) {
    const auditRecord = await findAuditByOperationId(operacionId, 'actualizar');
    if (auditRecord && Array.isArray(auditRecord.cambios)) {
      for (const c of auditRecord.cambios) {
        targets[c.campo] = c.nuevo;
      }
    }
  }

  const detalles: VerificationFieldDetail[] = [];
  let todoCoincide = true;

  for (const [key, expectedVal] of Object.entries(targets)) {
    const actualVal = (freshRepair as any)[key];
    const match =
      typeof expectedVal === 'object'
        ? JSON.stringify(actualVal) === JSON.stringify(expectedVal)
        : actualVal === expectedVal;

    detalles.push({
      campo: key,
      esperado: expectedVal,
      guardado: actualVal,
      coincide: match,
    });

    if (!match) todoCoincide = false;
  }

  const resumen = todoCoincide
    ? `Verificación exitosa: Todos los ${detalles.length} campos coinciden exactamente con la base de datos.`
    : `Discrepancia detectada: Algunos campos guardados difieren de los esperados.`;

  return {
    exito: true,
    operacion_id: operacionId,
    repair_id: freshRepair.id,
    repair_codigo: freshRepair.codigo,
    verificado: todoCoincide,
    detalles,
    resumen,
  };
}

export async function revertirCambios(
  idOCodigo: string | number,
  operacionId: string,
  aprobacionExplicita: boolean,
  actor = 'AI_AGENT'
): Promise<RevertResult> {
  if (aprobacionExplicita !== true) {
    throw new Error('Se requiere aprobación explícita (aprobacionExplicita = true) para revertir cambios.');
  }

  // Buscar auditoría de la operación a revertir
  const auditRecord = await findAuditByOperationId(operacionId, 'actualizar');
  if (!auditRecord || !auditRecord.snapshot_anterior) {
    throw new Error(`No se encontró el registro histórico para revertir la operación "${operacionId}".`);
  }

  const { raw: currentRepair } = await obtenerReparacion(idOCodigo);

  // Extraer valores que fueron modificados originalmente
  const previousSnapshot = auditRecord.snapshot_anterior;
  const changes = auditRecord.cambios || [];
  const revertPayload: Record<string, any> = {};
  const restoredFieldNames: string[] = [];

  for (const c of changes) {
    const field = c.campo;
    if (field in previousSnapshot) {
      revertPayload[field] = previousSnapshot[field];
      restoredFieldNames.push(field);
    }
  }

  if (restoredFieldNames.length === 0) {
    throw new Error('No se detectaron campos reversibles en la operación solicitada.');
  }

  // Formatear payload de reversión para Supabase
  const dbPayload: any = { ...revertPayload };
  for (const k of ['checklist', 'patronArray', 'cargosAdicionales']) {
    if (k in dbPayload && typeof dbPayload[k] !== 'string') {
      dbPayload[k] = JSON.stringify(dbPayload[k]);
    }
  }

  const { error: dbError } = await supabase.from('repairs').update(dbPayload).eq('id', currentRepair.id);
  if (dbError) {
    throw new Error(`Error al restaurar valores anteriores en base de datos: ${dbError.message}`);
  }

  const { raw: restoredRepair } = await obtenerReparacion(currentRepair.id);
  const reversionOperacionId = randomUUID();

  // Registrar auditoría de reversión
  await recordAudit({
    operation_id: reversionOperacionId,
    repair_id: currentRepair.id,
    repair_codigo: currentRepair.codigo,
    actor,
    action: 'revertir',
    status: 'revertido',
    cambios: restoredFieldNames.map((f) => ({
      campo: f,
      etiqueta: FIELD_LABELS[f] || f,
      anterior: (currentRepair as any)[f],
      nuevo: revertPayload[f],
      modificado: true,
    })),
    snapshot_anterior: currentRepair,
    snapshot_nuevo: restoredRepair,
    metadata: {
      operacion_id_origen: operacionId,
    },
  });

  return {
    exito: true,
    operacion_id_revertida: operacionId,
    reversion_operacion_id: reversionOperacionId,
    repair_id: currentRepair.id,
    repair_codigo: currentRepair.codigo,
    campos_restaurados: restoredFieldNames,
    mensaje: `Se revirtieron exitosamente los cambios de la operación ${operacionId} para la reparación ${currentRepair.codigo}.`,
  };
}
