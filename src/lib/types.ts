export interface Repair {
  id: number;
  codigo: string;
  cliente: string;
  cedula?: string;
  telefono: string;
  marca: string;
  modelo: string;
  color?: string;
  serie?: string;
  sintoma: string;
  costo: number;
  claveTexto?: string;
  tipoClave?: 'sin clave' | 'texto' | 'patron';
  status: 'En reparación' | 'En chequeo' | 'Listo para entregar' | 'No se pudo reparar' | 'Entregado a recepción' | 'Despachado bueno' | 'Despachado malo';
  tecnico?: string;
  estadoInicial: 'Encendido' | 'Apagado';
  observacion?: string;
  fecha: string;
  fecha_despacho?: string;
  fecha_entrega_recepcion?: string;
  notaDevolucion?: string;
  checklist?: Record<string, boolean | null>;
  patronArray?: number[];
  cargosAdicionales?: { id: number; desc: string; monto: number }[];
  tipoPantalla?: 'InCell' | 'OLED' | null;
  trabajoARealizar?: string;
  esChequeo?: boolean;
  // 2026-07-06: status que tenía el equipo en el taller cuando se marcó
  // "Entregado a recepción" (Listo para entregar | No se pudo reparar).
  // Permite a la caja ver en la bandeja si el técnico lo dejó listo o sin solución.
  status_anterior_taller?: 'Listo para entregar' | 'No se pudo reparar' | null;
}

export type UserRole = 'admin' | 'caja' | 'tech';

export interface User {
  username: string;
  role: UserRole;
}
