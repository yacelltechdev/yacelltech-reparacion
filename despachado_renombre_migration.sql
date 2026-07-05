-- Migración: renombrar status 'Entregado bueno/malo' → 'Despachado bueno/malo'
-- Ejecutar en Supabase Dashboard > SQL Editor
-- Antes: confirmar que el query de preview muestra solo los rows esperados
--
-- IMPORTANTE: El código TypeScript ya está migrado en master (commiteado pero
-- NO pusheado aún). Vercel seguirá mostrando 'Entregado' hasta que se corra
-- esta migración y se pushee el código al mismo tiempo.
--
-- Para que la transición sea atómica, hacer en este orden:
--   1. Correr este SQL (cambia los datos en BD)
--   2. Avisarme que ya corrió el SQL
--   3. Yo pusheo el código → Vercel auto-deploya
--   4. Vos validás que la app muestra "Despachado bueno/malo" sin errores

-- ============================================================
-- PASO 0: Preview (NO ejecuta nada, solo muestra qué cambiaría)
-- ============================================================
SELECT
  status,
  COUNT(*) as cantidad
FROM repairs
WHERE status IN ('Entregado bueno', 'Entregado malo')
GROUP BY status
ORDER BY status;

-- ============================================================
-- PASO 1: Backup de seguridad (opcional pero recomendado)
-- ============================================================
-- Crear tabla temporal con los rows afectados
-- CREATE TEMP TABLE repairs_status_backup AS
--   SELECT id, codigo, status, fecha_despacho
--   FROM repairs
--   WHERE status IN ('Entregado bueno', 'Entregado malo');

-- ============================================================
-- PASO 2: Migración
-- ============================================================
BEGIN;

UPDATE repairs SET status = 'Despachado bueno' WHERE status = 'Entregado bueno';
UPDATE repairs SET status = 'Despachado malo'  WHERE status = 'Entregado malo';

-- Verificar que ya no quedan 'Entregado bueno' ni 'Entregado malo'
SELECT
  status,
  COUNT(*) as cantidad
FROM repairs
WHERE status LIKE 'Entr%' OR status LIKE 'Entr%'
GROUP BY status
ORDER BY status;

-- Confirmar que 'Despachado bueno/malo' ahora tienen los counts esperados
SELECT
  status,
  COUNT(*) as cantidad
FROM repairs
WHERE status IN ('Despachado bueno', 'Despachado malo')
GROUP BY status
ORDER BY status;

COMMIT;

-- ============================================================
-- NOTA: Si hay CHECK CONSTRAINTS en la tabla repairs (regla del schema
-- que limita los valores válidos de status), hay que actualizarlos también:
-- ============================================================
-- ALTER TABLE repairs DROP CONSTRAINT IF EXISTS repairs_status_check;
-- ALTER TABLE repairs ADD CONSTRAINT repairs_status_check
--   CHECK (status IN (
--     'En chequeo',
--     'En reparación',
--     'Listo para entregar',
--     'No se pudo reparar',
--     'Despachado bueno',
--     'Despachado malo'
--   ));
--
-- (Comentar/descomentar según exista el constraint. Si no estás seguro,
-- corre esto en el SQL Editor y mirá el error: si dice "constraint does
-- not exist", no existe y podés seguir. Si lo encuentra, lo actualiza.)
