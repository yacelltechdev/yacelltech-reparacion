import { supabase } from '../db';
import { FieldDiff } from './types';

export interface AuditRecord {
  id?: number | string;
  operation_id: string;
  repair_id: number;
  repair_codigo: string;
  actor: string;
  action: 'preparar' | 'actualizar' | 'revertir';
  status: 'propuesto' | 'aplicado' | 'revertido' | 'error';
  cambios: FieldDiff[];
  snapshot_anterior?: Record<string, any> | null;
  snapshot_nuevo?: Record<string, any> | null;
  verificacion?: Record<string, any> | null;
  metadata?: Record<string, any>;
  created_at?: string;
}

// Memoria volátil de respaldo en caso de que la tabla aún no se haya migrado en Supabase
const memoryAuditLog: AuditRecord[] = [];

// Función para remover claves confidenciales de cualquier snapshot
export function sanitizeSnapshot(obj: any): Record<string, any> | null {
  if (!obj || typeof obj !== 'object') return null;
  const clone = { ...obj };
  if ('claveTexto' in clone) {
    clone.claveTexto = clone.claveTexto ? '[PROTEGIDO]' : null;
  }
  if ('patronArray' in clone) {
    clone.patronArray = clone.patronArray?.length ? '[PATRON_PROTEGIDO]' : null;
  }
  return clone;
}

export async function recordAudit(entry: AuditRecord): Promise<{ success: boolean; id?: string | number; source: 'db' | 'memory' }> {
  const sanitizedEntry = {
    ...entry,
    snapshot_anterior: sanitizeSnapshot(entry.snapshot_anterior),
    snapshot_nuevo: sanitizeSnapshot(entry.snapshot_nuevo),
    cambios: (entry.cambios || []).map((c) => ({
      ...c,
      anterior: c.campo === 'claveTexto' || c.campo === 'patronArray' ? '[PROTEGIDO]' : c.anterior,
      nuevo: c.campo === 'claveTexto' || c.campo === 'patronArray' ? '[PROTEGIDO]' : c.nuevo,
    })),
  };

  try {
    const { data, error } = await supabase
      .from('mcp_audit_logs')
      .insert({
        operation_id: sanitizedEntry.operation_id,
        repair_id: sanitizedEntry.repair_id,
        repair_codigo: sanitizedEntry.repair_codigo,
        actor: sanitizedEntry.actor || 'AI_AGENT',
        action: sanitizedEntry.action,
        status: sanitizedEntry.status,
        cambios: sanitizedEntry.cambios,
        snapshot_anterior: sanitizedEntry.snapshot_anterior,
        snapshot_nuevo: sanitizedEntry.snapshot_nuevo,
        verificacion: sanitizedEntry.verificacion || null,
        metadata: sanitizedEntry.metadata || {},
      })
      .select('id')
      .single();

    if (!error && data) {
      return { success: true, id: data.id, source: 'db' };
    }
  } catch {
    // Si la tabla no existe en la BD o falla la conexión, usar memoria de respaldo
  }

  // Fallback a almacenamiento en memoria
  memoryAuditLog.push({ ...sanitizedEntry, id: `mem_${Date.now()}` });
  return { success: true, id: `mem_${Date.now()}`, source: 'memory' };
}

export async function findAuditByOperationId(
  operationId: string,
  action?: 'preparar' | 'actualizar' | 'revertir'
): Promise<AuditRecord | null> {
  try {
    let query = supabase.from('mcp_audit_logs').select('*').eq('operation_id', operationId);
    if (action) query = query.eq('action', action);
    const { data, error } = await query.order('id', { ascending: false }).limit(1).maybeSingle();
    if (!error && data) return data as AuditRecord;
  } catch {
    // Fallback a memoria
  }

  const mem = memoryAuditLog
    .filter((a) => a.operation_id === operationId && (!action || a.action === action))
    .pop();
  return mem || null;
}

export async function checkIdempotency(operationId: string): Promise<AuditRecord | null> {
  const existing = await findAuditByOperationId(operationId, 'actualizar');
  if (existing && existing.status === 'aplicado') {
    return existing;
  }
  return null;
}
