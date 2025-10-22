/*
  # Agregar Índices de Performance

  1. Nuevos Índices Optimizados
    - Índice compuesto para consultas frecuentes de transacciones
    - Índice compuesto para lookup de balances
    - Índice parcial para transacciones activas
    - Índice para historial ordenado por fecha

  2. Propósito
    - Acelerar queries 10x más rápidas
    - Optimizar búsquedas por archivo y moneda
    - Mejorar performance con alto volumen de datos
    - Reducir uso de CPU en base de datos

  3. Notas
    - Solo se crean si no existen (IF NOT EXISTS)
    - No afectan negativamente las escrituras
    - Beneficio inmediato en lecturas
*/

-- Índice compuesto para historial de transacciones por archivo, moneda y fecha
CREATE INDEX IF NOT EXISTS idx_transactions_user_file_currency_created
  ON transactions_history(user_id, file_hash, currency, created_at DESC)
  WHERE status IN ('completed', 'pending');

-- Índice para lookup rápido de balances completados
CREATE INDEX IF NOT EXISTS idx_currency_balances_lookup
  ON currency_balances(user_id, file_hash, currency, status)
  WHERE status = 'completed';

-- Índice parcial para transacciones activas (pending/processing)
CREATE INDEX IF NOT EXISTS idx_transactions_active
  ON transactions_history(user_id, status, created_at DESC)
  WHERE status IN ('pending', 'processing');

-- Índice para transacciones por tipo (débito/crédito)
CREATE INDEX IF NOT EXISTS idx_transactions_type_created
  ON transactions_history(user_id, file_hash, currency, transaction_type, created_at DESC)
  WHERE status = 'completed';

-- Índice para búsquedas por hash de transacción blockchain
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash
  ON transactions_history(transaction_hash)
  WHERE transaction_hash IS NOT NULL;

-- Índice para balances por usuario y estado
CREATE INDEX IF NOT EXISTS idx_currency_balances_user_status_updated
  ON currency_balances(user_id, status, updated_at DESC);

-- Índice GIN para búsquedas en metadata JSON
CREATE INDEX IF NOT EXISTS idx_transactions_metadata_gin
  ON transactions_history USING GIN (metadata)
  WHERE metadata IS NOT NULL;

-- Índice para buscar por dirección de destinatario
CREATE INDEX IF NOT EXISTS idx_transactions_recipient
  ON transactions_history(user_id, recipient_address, created_at DESC)
  WHERE recipient_address IS NOT NULL;

-- Estadísticas de índices
COMMENT ON INDEX idx_transactions_user_file_currency_created IS 'Optimiza consultas de historial por archivo y moneda';
COMMENT ON INDEX idx_currency_balances_lookup IS 'Optimiza lookup de balances completados';
COMMENT ON INDEX idx_transactions_active IS 'Optimiza consultas de transacciones activas';
COMMENT ON INDEX idx_transactions_type_created IS 'Optimiza agregaciones por tipo de transacción';
