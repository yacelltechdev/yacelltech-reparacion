-- Migración: nuevo status 'Entregado a recepción' + campo fecha_entrega_recepcion
-- Ejecutar en Supabase Dashboard > SQL Editor
-- IMPORTANTE: el código TypeScript ya está commiteado pero NO pusheado.
--   1. Correr este SQL primero
--   2. Avisarme que ya corrió
--   3. Yo pusheo el código → Vercel auto-deploy
--   4. Vos validás en producción
--
-- Regla de negocio nueva (2026-07-05):
--   - Técnico marca "Listo para entregar" o "No se pudo reparar"
--   - Técnico entrega físicamente al mostrador → marca "Entregar a recepción"
--     → se setea fecha_entrega_recepcion automáticamente
--   - Recepción (caja) NO puede despachar si no pasó por "Entregado a recepción"
--     (bloqueo enforced en /api/repairs/[id] PATCH, devuelve HTTP 400)
--   - Recepción puede revertir (cambiar a "Listo para entregar") si hay error

-- ============================================================
-- PASO 0: Backup de los datos de status actuales
-- ============================================================
CREATE TABLE IF NOT EXISTS repairs_status_backup_20260705_v2 AS
  SELECT id, codigo, status, fecha, fecha_despacho
  FROM repairs;

-- ============================================================
-- PASO 1: Agregar el nuevo campo fecha_entrega_recepcion
-- ============================================================
ALTER TABLE repairs
  ADD COLUMN IF NOT EXISTS fecha_entrega_recepcion TIMESTAMP NULL;

-- ============================================================
-- PASO 2: Actualizar CHECK constraint para incluir el nuevo status
-- (Si tu BD no tiene este constraint, el ALTER va a tirar error
--  de "constraint does not exist" — eso está OK, seguí con paso 3)
-- ============================================================
ALTER TABLE repairs DROP CONSTRAINT IF EXISTS repairs_status_check;

ALTER TABLE repairs ADD CONSTRAINT repairs_status_check
  CHECK (status IN (
    'En chequeo',
    'En reparación',
    'Listo para entregar',
    'No se pudo reparar',
    'Entregado a recepción',
    'Despachado bueno',
    'Despachado malo'
  ));

-- ============================================================
-- PASO 3: Verificar
-- ============================================================
-- 3a. Distribución de status actual (debería ser igual que antes + 0 nuevos)
SELECT status, COUNT(*) as cantidad
FROM repairs
GROUP BY status
ORDER BY status;

-- 3b. Verificar que el campo nuevo existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'repairs' AND column_name = 'fecha_entrega_recepcion';
-- Debería devolver: fecha_entrega_recepcion | timestamp without time zone

-- 3c. Verificar que el constraint incluye el nuevo status
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'repairs_status_check';
-- Debería incluir 'Entregado a recepción'

-- 3d. (Opcional) Si querés que todos los rows en 'Listo para entregar' pasen
--      a un nuevo status 'Entregado a recepción' (NO recomendado, los equipos
--      físicamente aún no están en recepción), NO corras esto. Dejá los
--      rows como están y que el flujo nuevo opere a partir del deploy.
