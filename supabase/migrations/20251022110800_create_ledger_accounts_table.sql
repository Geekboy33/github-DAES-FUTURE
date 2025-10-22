/*
  # Create Ledger Accounts Table

  ## Purpose
  Sistema de 15 cuentas bancarias ordenadas por divisa.
  Cada usuario tiene una cuenta por cada una de las 15 divisas soportadas.
  Las cuentas se actualizan automáticamente cuando se procesan archivos DTC1B.

  ## Tables Created
  1. `ledger_accounts` - Tabla principal de cuentas del ledger
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `currency` (text) - Código de moneda (USD, EUR, GBP, etc.)
    - `account_name` (text) - Nombre de la cuenta
    - `account_number` (text) - Número único de cuenta
    - `balance` (numeric) - Balance actual
    - `transaction_count` (integer) - Número de transacciones
    - `average_transaction` (numeric) - Promedio de transacción
    - `largest_transaction` (numeric) - Mayor transacción
    - `smallest_transaction` (numeric) - Menor transacción
    - `status` (text) - Estado: active, frozen, closed
    - `last_updated` (timestamptz) - Última actualización de balance
    - `created_at` (timestamptz) - Fecha de creación
    - `updated_at` (timestamptz) - Fecha de última modificación
    - `metadata` (jsonb) - Datos adicionales

  ## Security
  - RLS enabled on ledger_accounts
  - Users can only access their own accounts
  - Policies for select, insert, update

  ## Functions
  1. `get_ledger_account_balance` - Obtiene balance actual considerando transacciones
  2. `update_ledger_from_balances` - Actualiza cuentas desde currency_balances
  3. `initialize_user_ledger_accounts` - Crea las 15 cuentas para un usuario nuevo

  ## Indexes
  - Index on user_id for fast user queries
  - Index on currency for fast currency lookups
  - Composite index on (user_id, currency) for unique constraint
*/

-- Create ledger_accounts table
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL UNIQUE,
  balance numeric(20, 2) DEFAULT 0 NOT NULL,
  transaction_count integer DEFAULT 0 NOT NULL,
  average_transaction numeric(20, 2) DEFAULT 0,
  largest_transaction numeric(20, 2) DEFAULT 0,
  smallest_transaction numeric(20, 2) DEFAULT 0,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'frozen', 'closed')),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,

  CONSTRAINT unique_user_currency UNIQUE (user_id, currency)
);

-- Enable RLS
ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own ledger accounts"
  ON ledger_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ledger accounts"
  ON ledger_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ledger accounts"
  ON ledger_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_user_id
  ON ledger_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_currency
  ON ledger_accounts(currency);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_status
  ON ledger_accounts(status);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_balance
  ON ledger_accounts(balance DESC);

-- Function: Get ledger account balance considering transactions
CREATE OR REPLACE FUNCTION get_ledger_account_balance(
  p_user_id uuid,
  p_currency text
) RETURNS numeric AS $$
DECLARE
  v_initial_balance numeric;
  v_debits numeric;
  v_current_balance numeric;
BEGIN
  -- Get initial balance from ledger account
  SELECT COALESCE(balance, 0)
  INTO v_initial_balance
  FROM ledger_accounts
  WHERE user_id = p_user_id AND currency = p_currency;

  -- Get total debits from transactions
  SELECT COALESCE(SUM(amount + fee), 0)
  INTO v_debits
  FROM transactions_history
  WHERE user_id = p_user_id
    AND currency = p_currency
    AND transaction_type = 'debit'
    AND status IN ('completed', 'pending');

  -- Calculate current balance
  v_current_balance := v_initial_balance - v_debits;

  RETURN v_current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update ledger accounts from currency_balances
CREATE OR REPLACE FUNCTION update_ledger_from_balances(
  p_user_id uuid
) RETURNS void AS $$
BEGIN
  -- Update existing accounts or insert new ones
  INSERT INTO ledger_accounts (
    user_id,
    currency,
    account_name,
    account_number,
    balance,
    transaction_count,
    average_transaction,
    largest_transaction,
    smallest_transaction,
    last_updated
  )
  SELECT
    p_user_id,
    cb.currency,
    cb.account_name,
    'ACC' || UPPER(SUBSTRING(cb.currency, 1, 2)) || LPAD(FLOOR(RANDOM() * 10000000000)::text, 10, '0'),
    cb.total_amount,
    cb.transaction_count,
    cb.average_transaction,
    cb.largest_transaction,
    CASE WHEN cb.smallest_transaction = 'Infinity'::numeric THEN 0 ELSE cb.smallest_transaction END,
    NOW()
  FROM currency_balances cb
  WHERE cb.user_id = p_user_id
    AND cb.status = 'completed'
  ON CONFLICT (user_id, currency)
  DO UPDATE SET
    balance = EXCLUDED.balance,
    transaction_count = EXCLUDED.transaction_count,
    average_transaction = EXCLUDED.average_transaction,
    largest_transaction = EXCLUDED.largest_transaction,
    smallest_transaction = EXCLUDED.smallest_transaction,
    last_updated = NOW(),
    updated_at = NOW();

  RAISE NOTICE 'Ledger accounts updated for user %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Initialize 15 currency accounts for a new user
CREATE OR REPLACE FUNCTION initialize_user_ledger_accounts(
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  v_currencies text[] := ARRAY['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'MXN', 'BRL', 'RUB', 'KRW', 'SGD', 'HKD'];
  v_currency text;
  v_account_names text[] := ARRAY[
    'US Dollar Account',
    'Euro Account',
    'British Pound Account',
    'Swiss Franc Account',
    'Canadian Dollar Account',
    'Australian Dollar Account',
    'Japanese Yen Account',
    'Chinese Yuan Account',
    'Indian Rupee Account',
    'Mexican Peso Account',
    'Brazilian Real Account',
    'Russian Ruble Account',
    'South Korean Won Account',
    'Singapore Dollar Account',
    'Hong Kong Dollar Account'
  ];
  v_index integer;
BEGIN
  FOR v_index IN 1..array_length(v_currencies, 1) LOOP
    v_currency := v_currencies[v_index];

    -- Insert account if not exists
    INSERT INTO ledger_accounts (
      user_id,
      currency,
      account_name,
      account_number,
      balance,
      status,
      metadata
    )
    VALUES (
      p_user_id,
      v_currency,
      v_account_names[v_index],
      'ACC' || UPPER(SUBSTRING(v_currency, 1, 2)) || LPAD(FLOOR(RANDOM() * 10000000000)::text, 10, '0'),
      0,
      'active',
      jsonb_build_object('initialized', NOW(), 'auto_created', true)
    )
    ON CONFLICT (user_id, currency) DO NOTHING;
  END LOOP;

  RAISE NOTICE '15 ledger accounts initialized for user %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ledger_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ledger_accounts_updated_at
  BEFORE UPDATE ON ledger_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_ledger_accounts_updated_at();

-- Create comment
COMMENT ON TABLE ledger_accounts IS 'Ledger de 15 cuentas bancarias por usuario, una por cada divisa soportada';
COMMENT ON FUNCTION get_ledger_account_balance IS 'Obtiene el balance actual de una cuenta considerando transacciones';
COMMENT ON FUNCTION update_ledger_from_balances IS 'Actualiza cuentas del ledger desde currency_balances procesados';
COMMENT ON FUNCTION initialize_user_ledger_accounts IS 'Inicializa las 15 cuentas de divisa para un usuario nuevo';
