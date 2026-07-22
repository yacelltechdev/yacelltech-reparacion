-- 2026-07-21: Tabla de clientes bloqueados (Lista Negra)
CREATE TABLE IF NOT EXISTS clientes_bloqueados (
  id              bigserial PRIMARY KEY,
  cedula          text NOT NULL UNIQUE,
  cedula_formato  text,
  nombre          text,
  motivo          text,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  creado_por      text
);

CREATE INDEX IF NOT EXISTS idx_clientes_bloqueados_cedula ON clientes_bloqueados(cedula);
