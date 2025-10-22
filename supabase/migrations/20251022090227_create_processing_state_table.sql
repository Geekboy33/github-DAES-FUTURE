/*
  # Sistema de Persistencia de Carga de Archivos

  1. Nueva Tabla
    - `processing_state`
      - `id` (uuid, primary key) - Identificador único del proceso
      - `user_id` (uuid, foreign key) - Usuario que inició el proceso
      - `file_name` (text) - Nombre del archivo en procesamiento
      - `file_size` (bigint) - Tamaño total del archivo en bytes
      - `bytes_processed` (bigint) - Bytes procesados hasta el momento
      - `progress` (numeric) - Porcentaje de progreso (0-100)
      - `status` (text) - Estado: 'processing', 'paused', 'completed', 'error'
      - `start_time` (timestamptz) - Momento en que inició el proceso
      - `last_update_time` (timestamptz) - Última actualización del proceso
      - `balances` (jsonb) - Balances extraídos hasta el momento
      - `chunk_index` (integer) - Índice del chunk actual
      - `total_chunks` (integer) - Total de chunks a procesar
      - `error_message` (text, nullable) - Mensaje de error si existe
      - `created_at` (timestamptz) - Fecha de creación
      - `updated_at` (timestamptz) - Fecha de última actualización

  2. Seguridad
    - Habilitar RLS en la tabla `processing_state`
    - Solo usuarios autenticados pueden ver sus propios procesos
    - Solo usuarios autenticados pueden crear procesos
    - Solo usuarios autenticados pueden actualizar sus propios procesos
    - Solo usuarios autenticados pueden eliminar sus propios procesos

  3. Índices
    - Índice en `user_id` para búsquedas rápidas
    - Índice en `status` para filtrar procesos activos
    - Índice compuesto en `user_id` y `status` para búsquedas combinadas

  4. Funciones Auxiliares
    - Función para actualizar `updated_at` automáticamente
*/

-- Crear tabla de estado de procesamiento
CREATE TABLE IF NOT EXISTS processing_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  bytes_processed bigint DEFAULT 0,
  progress numeric(5,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  start_time timestamptz DEFAULT now(),
  last_update_time timestamptz DEFAULT now(),
  balances jsonb DEFAULT '[]'::jsonb,
  chunk_index integer DEFAULT 0,
  total_chunks integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE processing_state ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own processing state"
  ON processing_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own processing state"
  ON processing_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processing state"
  ON processing_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own processing state"
  ON processing_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_processing_state_user_id 
  ON processing_state(user_id);

CREATE INDEX IF NOT EXISTS idx_processing_state_status 
  ON processing_state(status);

CREATE INDEX IF NOT EXISTS idx_processing_state_user_status 
  ON processing_state(user_id, status);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_processing_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_processing_state_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_processing_state_updated_at
      BEFORE UPDATE ON processing_state
      FOR EACH ROW
      EXECUTE FUNCTION update_processing_state_updated_at();
  END IF;
END $$;