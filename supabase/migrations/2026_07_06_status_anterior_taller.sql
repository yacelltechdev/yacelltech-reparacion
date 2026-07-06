-- 2026-07-06: Guardar el status del taller ("Listo para entregar" / "No se pudo reparar")
-- cuando un equipo pasa a "Entregado a recepción", para que la caja vea en la bandeja
-- si el técnico lo dejó listo o sin solución antes de despachar al cliente.
ALTER TABLE repairs
  ADD COLUMN IF NOT EXISTS status_anterior_taller text
  CHECK (status_anterior_taller IN ('Listo para entregar', 'No se pudo reparar'));
