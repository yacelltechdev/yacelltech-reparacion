import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'yacelltech.db');

class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('Error opening database', err);
      else {
        console.log('Connected to the SQLite database.');
        this.init();
      }
    });
  }

  private init() {
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS repairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT,
        cliente TEXT,
        cedula TEXT,
        telefono TEXT,
        marca TEXT,
        modelo TEXT,
        color TEXT,
        serie TEXT,
        sintoma TEXT,
        costo REAL,
        claveTexto TEXT,
        tipoClave TEXT,
        status TEXT,
        tecnico TEXT,
        estadoInicial TEXT,
        observacion TEXT,
        fecha TEXT,
        fecha_despacho TEXT,
        notaDevolucion TEXT,
        checklist TEXT,
        patronArray TEXT,
        cargosAdicionales TEXT
      )`);
      
      // Auto-migrate
      this.db.run("ALTER TABLE repairs ADD COLUMN cargosAdicionales TEXT", (err) => {});

      this.db.run(`CREATE TABLE IF NOT EXISTS models (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE)`);
      this.db.run(`CREATE TABLE IF NOT EXISTS marcas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE)`);
      this.db.run(`CREATE TABLE IF NOT EXISTS colores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE)`);
    });
  }

  public query(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  public run(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: any, err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
}

// Global singleton for Next.js hot reloading
const globalForDb = global as unknown as { db: Database };
const db = globalForDb.db || new Database();
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

export default db;
