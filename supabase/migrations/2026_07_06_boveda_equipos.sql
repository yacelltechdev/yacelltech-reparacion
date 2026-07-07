-- 2026-07-06: Bóveda de equipos
-- Equipos que no se localizaron en inventario físico y quedan pendientes
-- de investigación. El repair original NO se modifica — se archiva un
-- puntero a él, así es reversible y nunca se pierde información.
--
-- Por qué una tabla aparte y no un status nuevo en repairs:
--   1. Los equipos en bóveda no deben aparecer en inventarios, cuadres ni
--      bandejas. Es más fácil excluirlos con un JOIN que con un filtro de status
--      cada vez.
--   2. La bóveda tiene su propio lifecycle (pendiente / resuelto) que no
--      tiene nada que ver con el lifecycle del taller.
--   3. Cada caso puede tener varias notas, fechas de investigación, etc.
--      que ensuciarían la tabla repairs.

CREATE TABLE IF NOT EXISTS boveda_equipos (
  id              bigserial PRIMARY KEY,
  repair_id       bigint NOT NULL REFERENCES repairs(id) ON DELETE RESTRICT,
  -- Snapshot del estado del equipo al momento de archivar (NO se sincroniza
  -- con repairs.status, es histórico):
  status_al_archivar text NOT NULL,
  tecnico_al_archivar text NOT NULL,
  -- Metadata de la investigación:
  fecha_archivo   timestamptz NOT NULL DEFAULT now(),
  archivado_por   text,        -- username del admin que movió el equipo
  motivo          text NOT NULL DEFAULT 'No localizado en inventario físico',
  -- Lifecycle del caso:
  estado_caso     text NOT NULL DEFAULT 'pendiente'
                  CHECK (estado_caso IN ('pendiente', 'en_investigacion', 'resuelto')),
  -- Resolución (nullable hasta que se resuelva):
  fecha_resolucion timestamptz,
  resuelto_por     text,
  tipo_resolucion  text         -- 'despachado_bueno' | 'despachado_malo' | 'perdido' | 'otro'
                     CHECK (tipo_resolucion IN ('despachado_bueno', 'despachado_malo', 'perdido', 'otro')),
  notas           text,
  -- Constraint: no archivar dos veces el mismo repair
  CONSTRAINT boveda_equipos_repair_unique UNIQUE (repair_id)
);

-- Índices para las queries típicas
CREATE INDEX IF NOT EXISTS idx_boveda_estado ON boveda_equipos(estado_caso);
CREATE INDEX IF NOT EXISTS idx_boveda_tecnico ON boveda_equipos(tecnico_al_archivar);
CREATE INDEX IF NOT EXISTS idx_boveda_repair ON boveda_equipos(repair_id);

-- Trigger: cuando se crea una fila en boveda, snapshot del status actual
-- del repair (para que la bóveda muestre "En reparación" aunque después
-- alguien toque el status del repair — defensa en profundidad).
--
-- Nota: este trigger es solo una salvaguarda. La API ya pasa el status
-- correcto en el INSERT. Si por alguna razón llega NULL, lo llenamos.
CREATE OR REPLACE FUNCTION boveda_snapshot_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_al_archivar IS NULL OR NEW.status_al_archivar = '' THEN
    SELECT status INTO NEW.status_al_archivar
    FROM repairs WHERE id = NEW.repair_id;
  END IF;
  IF NEW.tecnico_al_archivar IS NULL OR NEW.tecnico_al_archivar = '' THEN
    SELECT tecnico INTO NEW.tecnico_al_archivar
    FROM repairs WHERE id = NEW.repair_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_boveda_snapshot ON boveda_equipos;
CREATE TRIGGER trg_boveda_snapshot
  BEFORE INSERT ON boveda_equipos
  FOR EACH ROW EXECUTE FUNCTION boveda_snapshot_status();
