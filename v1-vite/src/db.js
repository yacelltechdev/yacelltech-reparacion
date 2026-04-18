import Dexie from 'dexie';

export const db = new Dexie('YacelltechDB');

// Version 1 (Original)
db.version(1).stores({
  repairs: '++id, codigo, cliente, telefono, modelo, status, fecha, costo',
  models: '++id, &nombre',
});

// Version 2 (Con campos nuevos)
db.version(2).stores({
  repairs: '++id, codigo, cliente, cedula, telefono, marca, modelo, color, serie, status, fecha, costo',
  models: '++id, &nombre',
});

// Version 4 (Indexar técnico para el dashboard)
db.version(4).stores({
  repairs: '++id, codigo, cliente, cedula, telefono, marca, modelo, color, serie, status, fecha, costo, tecnico',
  models: '++id, &nombre',
  marcas: '++id, &nombre',
  colores: '++id, &nombre'
});


import { api } from './api';

// Función para obtener el siguiente código (Ahora desde SQLite)
export const getNextCode = async () => {
  try {
    const allRepairs = await api.getRepairs();
    let maxNum = 0;

    allRepairs.forEach(r => {
      if (r.codigo && typeof r.codigo === 'string') {
        const parts = r.codigo.split('-');
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    const nextNum = maxNum + 1;
    return `REP-${String(nextNum).padStart(5, '0')}`;
  } catch (error) {
    console.error("Error al generar código:", error);
    return `REP-00001`;
  }
};
