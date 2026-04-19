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
  status: 'En reparación' | 'Listo para entregar' | 'No se pudo reparar' | 'Entregado bueno' | 'Entregado malo';
  tecnico?: string;
  estadoInicial: 'Encendido' | 'Apagado';
  observacion?: string;
  fecha: string;
  fecha_despacho?: string;
  notaDevolucion?: string;
  checklist?: Record<string, boolean | null>;
  patronArray?: number[];
  cargosAdicionales?: { id: number; desc: string; monto: number }[];
}

export type UserRole = 'admin' | 'caja' | 'tech';

export interface User {
  username: string;
  role: UserRole;
}
