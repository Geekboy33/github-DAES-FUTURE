/*
  # Agregar Hash de Archivo para Reconocimiento Automático

  1. Cambios en Tabla `processing_state`
    - Agregar `file_hash` (text) - Hash SHA-256 del archivo para reconocimiento
    - Agregar `file_last_modified` (bigint) - Timestamp de última modificación
    - Agregar `sync_status` (text) - Estado de sincronización: 'synced', 'syncing', 'error', 'local-only'
    - Agregar `last_sync_time` (timestamptz) - Última vez que se sincronizó exitosamente
    - Agregar `retry_count` (integer) - Contador de reintentos de sincronización

  2. Índices
    - Índice en `file_hash` para búsqueda rápida de archivos
    - Índice compuesto en `user_id` y `file_hash` para búsqueda de archivos por usuario

  3. Función Helper
    - Función para limpiar procesos antiguos completados (más de 7 días)

  4. Notas
    - El hash permite reconocer el mismo archivo sin importar el nombre
    - Si el usuario carga el mismo archivo, se reanuda automáticamente
    - Los procesos completados se auto-limpian después de 7 días
*/

-- Agregar nuevas columnas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_state' AND column_name = 'file_hash'
  ) THEN
    ALTER TABLE processing_state ADD COLUMN file_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_state' AND column_name = 'file_last_modified'
  ) THEN
    ALTER TABLE processing_state ADD COLUMN file_last_modified bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_state' AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE processing_state ADD COLUMN sync_status text DEFAULT 'synced';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_state' AND column_name = 'last_sync_time'
  ) THEN
    ALTER TABLE processing_state ADD COLUMN last_sync_time timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_state' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE processing_state ADD COLUMN retry_count integer DEFAULT 0;
  END IF;
END $$;

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_processing_state_file_hash 
  ON processing_state(file_hash)
  WHERE file_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processing_state_user_file_hash 
  ON processing_state(user_id, file_hash)
  WHERE file_hash IS NOT NULL;

-- Función para limpiar procesos completados antiguos
CREATE OR REPLACE FUNCTION cleanup_old_completed_processes()
RETURNS void AS $$
BEGIN
  DELETE FROM processing_state
  WHERE status = 'completed'
    AND updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Programar limpieza automática (opcional, requiere pg_cron extension)
-- SELECT cron.schedule('cleanup-old-processes', '0 2 * * *', 'SELECT cleanup_old_completed_processes()');

-- Comentario para documentación
COMMENT ON COLUMN processing_state.file_hash IS 'SHA-256 hash del archivo para reconocimiento automático';
COMMENT ON COLUMN processing_state.file_last_modified IS 'Timestamp de última modificación del archivo';
COMMENT ON COLUMN processing_state.sync_status IS 'Estado de sincronización: synced, syncing, error, local-only';
COMMENT ON COLUMN processing_state.last_sync_time IS 'Última sincronización exitosa con Supabase';
COMMENT ON COLUMN processing_state.retry_count IS 'Número de reintentos de sincronización';
