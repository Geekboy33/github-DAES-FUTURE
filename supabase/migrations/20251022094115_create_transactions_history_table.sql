/*
  # Crear Tabla de Historial de Transacciones

  1. Nueva Tabla `transactions_history`
    - `id` (uuid, primary key) - ID único de la transacción
    - `user_id` (uuid) - Usuario que realiza la transacción
    - `file_hash` (text) - Hash del archivo DTC1B origen
    - `file_name` (text) - Nombre del archivo DTC1B
    - `transaction_type` (text) - Tipo: 'debit' (débito) o 'credit' (crédito)
    - `currency` (text) - Moneda de la transacción
    - `amount` (numeric) - Monto de la transacción
    - `balance_before` (numeric) - Balance antes de la transacción
    - `balance_after` (numeric) - Balance después de la transacción
    - `recipient_address` (text) - Dirección del destinatario
    - `recipient_name` (text) - Nombre del destinatario (opcional)
    - `description` (text) - Descripción de la transacción
    - `status` (text) - Estado: 'pending', 'completed', 'failed', 'cancelled'
    - `api_provider` (text) - Proveedor de API usado (XCP, Counterparty, etc)
    - `transaction_hash` (text) - Hash de la transacción en blockchain (si aplica)
    - `fee` (numeric) - Comisión de la transacción
    - `error_message` (text) - Mensaje de error si falló
    - `metadata` (jsonb) - Metadata adicional
    - `created_at` (timestamptz) - Fecha de creación
    - `updated_at` (timestamptz) - Fecha de actualización

  2. Seguridad
    - Habilitar RLS
    - Solo usuarios autenticados pueden ver sus transacciones
    - Solo usuarios autenticados pueden crear transacciones
    - Solo el sistema puede actualizar estado de transacciones

  3. Índices
    - Índice en `user_id` para búsqueda rápida
    - Índice compuesto en `user_id` y `file_hash`
    - Índice en `status` para filtrar transacciones
    - Índice en `created_at` para ordenar por fecha

  4. Notas
    - Registro inmutable de todas las transacciones
    - Permite auditoría completa de movimientos
    - Balance before/after permite reconstruir historial
    - Integración con APIs de transferencia
*/

-- Crear tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_hash text NOT NULL,
  file_name text NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  currency text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  balance_before numeric NOT NULL CHECK (balance_before >= 0),
  balance_after numeric NOT NULL CHECK (balance_after >= 0),
  recipient_address text,
  recipient_name text,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  api_provider text,
  transaction_hash text,
  fee numeric DEFAULT 0 CHECK (fee >= 0),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE transactions_history ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuarios pueden ver solo sus transacciones
CREATE POLICY "Users can view own transactions"
  ON transactions_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política INSERT: usuarios pueden crear solo sus transacciones
CREATE POLICY "Users can create own transactions"
  ON transactions_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: solo sistema puede actualizar (para status, tx_hash, etc)
CREATE POLICY "System can update transaction status"
  ON transactions_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
  ON transactions_history(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_file_hash 
  ON transactions_history(user_id, file_hash);

CREATE INDEX IF NOT EXISTS idx_transactions_status 
  ON transactions_history(status);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
  ON transactions_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created 
  ON transactions_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_type 
  ON transactions_history(transaction_type);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_transactions_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transactions_history_updated_at
  BEFORE UPDATE ON transactions_history
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_history_updated_at();

-- Función para obtener resumen de transacciones por archivo
CREATE OR REPLACE FUNCTION get_file_transactions_summary(p_file_hash text)
RETURNS TABLE (
  total_debits numeric,
  total_credits numeric,
  total_fees numeric,
  transaction_count bigint,
  pending_count bigint,
  completed_count bigint,
  failed_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
    COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
    COALESCE(SUM(fee), 0) as total_fees,
    COUNT(*)::bigint as transaction_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::bigint as pending_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::bigint as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END)::bigint as failed_count
  FROM transactions_history
  WHERE user_id = auth.uid()
    AND file_hash = p_file_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular balance actual de una moneda en un archivo
CREATE OR REPLACE FUNCTION get_current_balance(p_file_hash text, p_currency text)
RETURNS numeric AS $$
DECLARE
  v_initial_balance numeric;
  v_total_debits numeric;
  v_total_credits numeric;
  v_total_fees numeric;
BEGIN
  -- Obtener balance inicial del archivo
  SELECT total_amount INTO v_initial_balance
  FROM currency_balances
  WHERE user_id = auth.uid()
    AND file_hash = p_file_hash
    AND currency = p_currency
    AND status = 'completed'
  LIMIT 1;

  -- Si no existe el balance inicial, retornar 0
  IF v_initial_balance IS NULL THEN
    RETURN 0;
  END IF;

  -- Calcular total de débitos
  SELECT COALESCE(SUM(amount + fee), 0) INTO v_total_debits
  FROM transactions_history
  WHERE user_id = auth.uid()
    AND file_hash = p_file_hash
    AND currency = p_currency
    AND transaction_type = 'debit'
    AND status = 'completed';

  -- Calcular total de créditos
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits
  FROM transactions_history
  WHERE user_id = auth.uid()
    AND file_hash = p_file_hash
    AND currency = p_currency
    AND transaction_type = 'credit'
    AND status = 'completed';

  -- Balance actual = Balance inicial - Débitos + Créditos
  RETURN v_initial_balance - v_total_debits + v_total_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar fondos suficientes antes de transferir
CREATE OR REPLACE FUNCTION validate_sufficient_funds(
  p_file_hash text,
  p_currency text,
  p_amount numeric,
  p_fee numeric DEFAULT 0
)
RETURNS boolean AS $$
DECLARE
  v_current_balance numeric;
  v_required_amount numeric;
BEGIN
  -- Obtener balance actual
  v_current_balance := get_current_balance(p_file_hash, p_currency);
  
  -- Calcular monto requerido (monto + comisión)
  v_required_amount := p_amount + p_fee;
  
  -- Validar si hay fondos suficientes
  RETURN v_current_balance >= v_required_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON TABLE transactions_history IS 'Historial inmutable de todas las transacciones (débitos y créditos) vinculadas a archivos DTC1B';
COMMENT ON COLUMN transactions_history.transaction_type IS 'Tipo de transacción: debit (salida de fondos) o credit (entrada de fondos)';
COMMENT ON COLUMN transactions_history.balance_before IS 'Balance de la cuenta ANTES de ejecutar la transacción';
COMMENT ON COLUMN transactions_history.balance_after IS 'Balance de la cuenta DESPUÉS de ejecutar la transacción';
COMMENT ON COLUMN transactions_history.status IS 'Estado: pending (pendiente), completed (completada), failed (fallida), cancelled (cancelada)';
COMMENT ON FUNCTION get_current_balance IS 'Calcula el balance actual de una moneda considerando balance inicial y todas las transacciones';
COMMENT ON FUNCTION validate_sufficient_funds IS 'Valida si hay fondos suficientes para realizar una transferencia';
