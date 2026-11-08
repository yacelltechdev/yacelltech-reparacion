import { z } from 'zod';
import { createHash } from 'crypto';
import { Repair } from '../types';
import { FORBIDDEN_FIELDS, PERMITTED_EDIT_FIELDS, SanitizedRepair } from './types';

export const CargoAdicionalSchema = z.object({
  id: z.number().int().optional(),
  desc: z.string().min(1, 'La descripción del cargo no puede estar vacía'),
  monto: z.number().finite('El monto debe ser un número válido'),
});

export const StatusEnum = z.enum([
  'En reparación',
  'En chequeo',
  'Listo para entregar',
  'No se pudo reparar',
  'Entregado a recepción',
  'Despachado bueno',
  'Despachado malo',
]);

export const EstadoInicialEnum = z.enum(['Encendido', 'Apagado']);
export const TipoPantallaEnum = z.enum(['InCell', 'OLED']).nullable().optional();

export const ProposedPatchSchema = z.object({
  cliente: z.string().min(1).optional(),
  cedula: z.string().optional().nullable(),
  telefono: z.string().optional(),
  marca: z.string().min(1).optional(),
  modelo: z.string().min(1).optional(),
  color: z.string().optional().nullable(),
  serie: z.string().optional().nullable(),
  sintoma: z.string().optional(),
  costo: z.number().min(0, 'El costo base no puede ser negativo').optional(),
  tecnico: z.string().optional(),
  estadoInicial: EstadoInicialEnum.optional(),
  observacion: z.string().optional().nullable(),
  notaDevolucion: z.string().optional().nullable(),
  tipoPantalla: TipoPantallaEnum,
  trabajoARealizar: z.string().optional().nullable(),
  esChequeo: z.boolean().optional(),
  cargosAdicionales: z.array(CargoAdicionalSchema).optional(),
  nuevoCargo: CargoAdicionalSchema.optional(), // Azúcar sintáctico para añadir un cargo adicional fácilmente
  status: StatusEnum.optional(),
}).passthrough();

export function calculateTotalCost(repair: {
  costo?: number | null;
  cargosAdicionales?: { id?: number; desc?: string; monto: number }[] | any[] | null;
}): number {
  const base = Number(repair.costo || 0);
  const extra = Array.isArray(repair.cargosAdicionales)
    ? repair.cargosAdicionales.reduce((acc, c) => acc + Number(c?.monto || 0), 0)
    : 0;
  return Math.round((base + extra) * 100) / 100;
}

export function sanitizeRepair(repair: Repair): SanitizedRepair {
  const { claveTexto, patronArray, ...rest } = repair;
  return {
    ...rest,
    tieneClaveTexto: Boolean(claveTexto && claveTexto.trim().length > 0),
    tienePatronArray: Boolean(patronArray && patronArray.length > 0),
    costoTotal: calculateTotalCost(repair),
  };
}

export function computeVersionHash(repair: Repair): string {
  const core = {
    id: repair.id,
    codigo: repair.codigo,
    cliente: repair.cliente,
    modelo: repair.modelo,
    costo: repair.costo,
    status: repair.status,
    tecnico: repair.tecnico,
    cargosAdicionales: repair.cargosAdicionales || [],
    fecha_despacho: repair.fecha_despacho || null,
  };
  return createHash('sha256').update(JSON.stringify(core)).digest('hex').substring(0, 16);
}

export function validateBusinessRules(
  current: Repair,
  patch: Record<string, any>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Prohibir campos inmutables
  for (const forbidden of FORBIDDEN_FIELDS) {
    if (forbidden in patch && patch[forbidden] !== undefined) {
      errors.push(`El campo "${forbidden}" es inmutable y no puede modificarse por este medio.`);
    }
  }

  // 2. Verificar advertencias de campos desconocidos
  for (const key of Object.keys(patch)) {
    if (
      key !== 'nuevoCargo' &&
      !PERMITTED_EDIT_FIELDS.includes(key as any) &&
      !FORBIDDEN_FIELDS.includes(key as any)
    ) {
      warnings.push(`El campo "${key}" no es un campo estándar editable de reparación.`);
    }
  }

  // 3. Reglas de transición de status
  if (patch.status && patch.status !== current.status) {
    const delivered = ['Despachado bueno', 'Despachado malo'];
    if (delivered.includes(patch.status)) {
      if (current.status !== 'Entregado a recepción') {
        errors.push(
          `Regla de negocio violada: No se puede despachar un equipo si no ha pasado antes por "Entregado a recepción" (Status actual: "${current.status}").`
        );
      }
    }
  }

  // 4. Verificación de costos
  if (patch.costo !== undefined && patch.costo < 0) {
    errors.push('El costo base no puede ser negativo.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
