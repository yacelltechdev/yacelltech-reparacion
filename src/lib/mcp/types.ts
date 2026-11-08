import { Repair } from '../types';

export const PERMITTED_EDIT_FIELDS = [
  'cliente',
  'cedula',
  'telefono',
  'marca',
  'modelo',
  'color',
  'serie',
  'sintoma',
  'costo',
  'tecnico',
  'estadoInicial',
  'observacion',
  'notaDevolucion',
  'tipoPantalla',
  'trabajoARealizar',
  'esChequeo',
  'cargosAdicionales',
  'status',
] as const;

export type PermittedEditField = (typeof PERMITTED_EDIT_FIELDS)[number];

export const FORBIDDEN_FIELDS = [
  'id',
  'codigo',
  'fecha',
  'fecha_despacho',
  'fecha_entrega_recepcion',
  'status_anterior_taller',
] as const;

export interface FieldDiff {
  campo: string;
  etiqueta: string;
  anterior: any;
  nuevo: any;
  modificado: boolean;
}

export interface PreparedChange {
  operacion_id: string;
  repair_id: number;
  repair_codigo: string;
  version_hash: string;
  diff: FieldDiff[];
  campos_modificados: string[];
  total_anterior: number;
  total_nuevo: number;
  advertencias: string[];
  datos_propuestos: Record<string, any>;
  resumen: string;
  requiere_confirmacion_usuario: boolean;
}

export interface UpdateRepairResult {
  exito: boolean;
  operacion_id: string;
  repair_id: number;
  repair_codigo: string;
  campos_actualizados: string[];
  mensaje: string;
  audit_id?: string | number;
}

export interface VerificationFieldDetail {
  campo: string;
  esperado: any;
  guardado: any;
  coincide: boolean;
}

export interface VerificationResult {
  exito: boolean;
  operacion_id?: string;
  repair_id: number;
  repair_codigo: string;
  verificado: boolean;
  detalles: VerificationFieldDetail[];
  resumen: string;
}

export interface RevertResult {
  exito: boolean;
  operacion_id_revertida: string;
  reversion_operacion_id: string;
  repair_id: number;
  repair_codigo: string;
  campos_restaurados: string[];
  mensaje: string;
}

export interface SanitizedRepair extends Omit<Repair, 'claveTexto' | 'patronArray'> {
  tieneClaveTexto?: boolean;
  tienePatronArray?: boolean;
  costoTotal: number;
}
