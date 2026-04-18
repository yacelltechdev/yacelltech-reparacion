import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./yacelltech.db', (err) => {
  if (err) console.error(err.message);
  console.log('Base de datos SQLite conectada.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS repairs (
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

  // Migración: Agregar columna cargosAdicionales si no existe
  db.run("ALTER TABLE repairs ADD COLUMN cargosAdicionales TEXT", (err) => {
    if (err) {
      if (!err.message.includes('duplicate column name')) {
         // console.log("Columna ya existe");
      }
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS models (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE)`);
  db.run(`CREATE TABLE IF NOT EXISTS marcas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE)`);
  db.run(`CREATE TABLE IF NOT EXISTS colores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE)`);
});

// REPAIRS
app.get('/api/repairs', (req, res) => {
  db.all("SELECT * FROM repairs ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      ...r,
      checklist: r.checklist ? JSON.parse(r.checklist) : null,
      patronArray: r.patronArray ? JSON.parse(r.patronArray) : [],
      cargosAdicionales: r.cargosAdicionales ? JSON.parse(r.cargosAdicionales) : []
    })));
  });
});

app.post('/api/repairs', (req, res) => {
  const r = req.body;
  const sql = `INSERT INTO repairs (
    codigo, cliente, cedula, telefono, marca, modelo, color, serie, sintoma, 
    costo, claveTexto, tipoClave, status, tecnico, estadoInicial, observacion, 
    fecha, checklist, patronArray, cargosAdicionales
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  
  const params = [
    r.codigo, r.cliente, r.cedula, r.telefono, r.marca, r.modelo, r.color, r.serie, r.sintoma,
    r.costo, r.claveTexto, r.tipoClave, r.status, r.tecnico, r.estadoInicial, r.observacion,
    r.fecha, JSON.stringify(r.checklist), JSON.stringify(r.patronArray), JSON.stringify(r.cargosAdicionales || [])
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.patch('/api/repairs/:id', (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  const keys = Object.keys(updates);
  const values = keys.map(k => {
    if (k === 'checklist' || k === 'patronArray' || k === 'cargosAdicionales') return JSON.stringify(updates[k]);
    return updates[k];
  });
  
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const sql = `UPDATE repairs SET ${setClause} WHERE id = ?`;
  
  db.run(sql, [...values, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// CATALOGS
app.get('/api/:table', (req, res) => {
  const table = req.params.table;
  if (!['models', 'marcas', 'colores'].includes(table)) return res.status(400).send("Invalid table");
  db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/:table', (req, res) => {
  const table = req.params.table;
  if (!['models', 'marcas', 'colores'].includes(table)) return res.status(400).send("Invalid table");
  db.run(`INSERT OR IGNORE INTO ${table} (nombre) VALUES (?)`, [req.body.nombre], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.listen(port, () => {
  console.log(`Servidor local corriendo en http://localhost:${port}`);
  console.log(`Para conectar otras PCs, usa tu IP Local ej: http://192.168.1.XX:${port}`);
});
