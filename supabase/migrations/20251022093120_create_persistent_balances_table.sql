/*
  # Crear Tabla de Balances Persistentes

  1. Nueva Tabla `currency_balances`
    - `id` (uuid, primary key) - ID único del balance
    - `user_id` (uuid) - Usuario propietario
    - `file_hash` (text) - Hash del archivo procesado
    - `file_name` (text) - Nombre del archivo
    - `file_size` (bigint) - Tamaño del archivo
    - `currency` (text) - Código de moneda (USD, EUR, etc)
    - `account_name` (text) - Nombre de la cuenta
    - `total_amount` (numeric) - Monto total
    - `transaction_count` (integer) - Número de transacciones
    - `average_transaction` (numeric) - Promedio de transacciones
    - `largest_transaction` (numeric) - Transacción más grande
    - `smallest_transaction` (numeric) - Transacción más pequeña
    - `amounts` (jsonb) - Array de montos individuales
    - `last_updated` (timestamptz) - Última actualización
    - `created_at` (timestamptz) - Fecha de creación
    - `updated_at` (timestamptz) - Fecha de actualización
    - `status` (text) - Estado: 'processing', 'completed'
    - `progress` (numeric) - Progreso del procesamiento (0-100)

  2. Seguridad
    - Habilitar RLS
    - Solo usuarios autenticados pueden ver sus propios balances
    - Solo usuarios autenticados pueden crear/actualizar sus balances
    - Solo usuarios autenticados pueden eliminar sus balances

  3. Índices
    - Índice en `user_id` para búsqueda rápida
    - Índice compuesto en `user_id` y `file_hash` para búsqueda de archivos
    - Índice en `status` para filtrar balances completados

  4. Notas
    - Los balances se guardan en tiempo real durante el procesamiento
    - Permite sincronización entre dispositivos
    - Mantiene historial de archivos procesados
    - RLS asegura que cada usuario solo vea sus datos
*/

-- Crear tabla de balances
CREATE TABLE IF NOT EXISTS currency_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_hash text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  currency text NOT NULL,
  account_name text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  average_transaction numeric NOT NULL DEFAULT 0,
  largest_transaction numeric NOT NULL DEFAULT 0,
  smallest_transaction numeric NOT NULL DEFAULT 0,
  amounts jsonb DEFAULT '[]'::jsonb,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed')),
  progress numeric DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)
);

-- Habilitar RLS
ALTER TABLE currency_balances ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuarios pueden ver solo sus balances
CREATE POLICY "Users can view own balances"
  ON currency_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política INSERT: usuarios pueden crear solo sus balances
CREATE POLICY "Users can create own balances"
  ON currency_balances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: usuarios pueden actualizar solo sus balances
CREATE POLICY "Users can update own balances"
  ON currency_balances FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política DELETE: usuarios pueden eliminar solo sus balances
CREATE POLICY "Users can delete own balances"
  ON currency_balances FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_currency_balances_user_id 
  ON currency_balances(user_id);

CREATE INDEX IF NOT EXISTS idx_currency_balances_user_file_hash 
  ON currency_balances(user_id, file_hash);

CREATE INDEX IF NOT EXISTS idx_currency_balances_status 
  ON currency_balances(status);

CREATE INDEX IF NOT EXISTS idx_currency_balances_user_status 
  ON currency_balances(user_id, status);

-- Índice único para evitar duplicados de currency por archivo
CREATE UNIQUE INDEX IF NOT EXISTS idx_currency_balances_unique_currency 
  ON currency_balances(user_id, file_hash, currency);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_currency_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_currency_balances_updated_at
  BEFORE UPDATE ON currency_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_currency_balances_updated_at();

-- Función para obtener resumen de balances de un archivo
CREATE OR REPLACE FUNCTION get_file_balances_summary(p_file_hash text)
RETURNS TABLE (
  total_currencies integer,
  total_transactions bigint,
  total_amount numeric,
  status text,
  progress numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT currency)::integer as total_currencies,
    SUM(transaction_count)::bigint as total_transactions,
    SUM(total_amount)::numeric as total_amount,
    MAX(status)::text as status,
    MAX(progress)::numeric as progress
  FROM currency_balances
  WHERE user_id = auth.uid()
    AND file_hash = p_file_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar balances completados antiguos (más de 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_completed_balances()
RETURNS void AS $$
BEGIN
  DELETE FROM currency_balances
  WHERE status = 'completed'
    AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE currency_balances IS 'Almacena balances de monedas extraídos de archivos DTC1B con sincronización entre dispositivos';
COMMENT ON COLUMN currency_balances.file_hash IS 'Hash SHA-256 del archivo para identificación única';
COMMENT ON COLUMN currency_balances.amounts IS 'Array JSON de montos individuales para análisis detallado';
COMMENT ON COLUMN currency_balances.status IS 'Estado del procesamiento: processing (en curso) o completed (finalizado)';
COMMENT ON COLUMN currency_balances.progress IS 'Porcentaje de progreso del procesamiento (0-100)';
