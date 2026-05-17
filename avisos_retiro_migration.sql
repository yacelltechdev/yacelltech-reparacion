-- Ejecutar en Supabase Dashboard → SQL Editor
CREATE TABLE IF NOT EXISTS avisos_retiro (
  id           SERIAL PRIMARY KEY,
  repair_id    INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  tipo         TEXT    NOT NULL CHECK (tipo IN ('30','60','90','180','final')),
  enviado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviado_por  TEXT
);

CREATE INDEX IF NOT EXISTS idx_avisos_retiro_repair_id ON avisos_retiro(repair_id);
