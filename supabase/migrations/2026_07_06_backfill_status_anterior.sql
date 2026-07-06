-- 2026-07-06: Backfill retroactivo para 4 equipos que ya estaban en
-- "Entregado a recepción" antes de que se desplegara la columna
-- status_anterior_taller. Asumimos que Carlos los marcó como "Listo
-- para entregar" (caso común: equipo con costo != 0, recién entregado).
--
-- Si alguno de estos 4 era en realidad "No se pudo reparar", Micael
-- puede hacer un UPDATE individual después.
UPDATE repairs
SET status_anterior_taller = 'Listo para entregar'
WHERE codigo IN ('REP-02288', 'REP-02287', 'REP-02277', 'REP-01961')
  AND status_anterior_taller IS NULL;
