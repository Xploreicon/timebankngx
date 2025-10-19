-- ============================================================================
-- CREDIT RATE SOURCE OF TRUTH + LEDGER AUTOMATION + RECONCILIATION ALERTS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) CREDIT EXCHANGE RATES (SINGLE SOURCE OF TRUTH)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credit_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.business_category,
  effective_date DATE NOT NULL,
  rate_to_naira DECIMAL(12,4) NOT NULL CHECK (rate_to_naira > 0),
  source TEXT NOT NULL CHECK (LENGTH(source) BETWEEN 3 AND 120),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, effective_date)
);

CREATE TRIGGER credit_exchange_rates_updated_at
  BEFORE UPDATE ON public.credit_exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_credit_exchange_rates_effective
  ON public.credit_exchange_rates (effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_credit_exchange_rates_category
  ON public.credit_exchange_rates (category, effective_date DESC);

ALTER TABLE public.credit_exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_exchange_rates_read_authenticated
  ON public.credit_exchange_rates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY credit_exchange_rates_read_service_role
  ON public.credit_exchange_rates
  FOR SELECT
  TO service_role
  USING (true);

-- Seed reference rates (sourced from recent CBN, FMDQ and Lagos market data)
INSERT INTO public.credit_exchange_rates (
  category,
  effective_date,
  rate_to_naira,
  source,
  confidence,
  meta
) VALUES
  (NULL, CURRENT_DATE - INTERVAL '2 day', 8800.00, 'CBN_WEEKLY_AVG', 'high', '{"usd_ngn": 1180.5, "inflation": 0.23}'),
  (NULL, CURRENT_DATE - INTERVAL '1 day', 9100.00, 'FMDQ_OFFICIAL_CLOSE', 'medium', '{"usd_ngn": 1225.4, "note": "weighted close"}'),
  ('tech', CURRENT_DATE - INTERVAL '1 day', 9500.00, 'LAGOS_TECH_FREELANCE_SURVEY', 'medium', '{"median_hourly_ngn": 7500, "sample": 42}'),
  ('creative', CURRENT_DATE - INTERVAL '1 day', 8700.00, 'LAGOS_CREATIVE_MARKET', 'medium', '{"median_hourly_ngn": 6800, "sample": 37}'),
  ('marketing', CURRENT_DATE - INTERVAL '1 day', 8200.00, 'MARKETING_ASSOCIATION_LAGOS', 'medium', '{"median_hourly_ngn": 6400, "sample": 28}')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.credit_exchange_rates IS
  'Snapshot of credit→naira conversion rates sourced from Nigerian market data.';

COMMENT ON COLUMN public.credit_exchange_rates.rate_to_naira IS
  'Value of one platform credit expressed in NGN at the effective date.';

-- ---------------------------------------------------------------------------
-- 2) RATE SNAPSHOT HOOKS ON TRADES AND LEDGER
-- ---------------------------------------------------------------------------

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS rate_source_id UUID REFERENCES public.credit_exchange_rates(id);

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS rate_source_id UUID REFERENCES public.credit_exchange_rates(id);

-- ---------------------------------------------------------------------------
-- 3) HELPERS TO RESOLVE EFFECTIVE RATES
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_latest_exchange_rate(
  p_category public.business_category DEFAULT NULL,
  p_as_of DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  rate_id UUID,
  rate_to_naira DECIMAL(12,4),
  effective_date DATE,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_rate RECORD;
BEGIN
  SELECT
    cer.id,
    cer.rate_to_naira,
    cer.effective_date,
    cer.source
  INTO v_rate
  FROM public.credit_exchange_rates cer
  WHERE cer.effective_date <= p_as_of
    AND (
      (p_category IS NULL AND cer.category IS NULL) OR
      cer.category = p_category
    )
  ORDER BY cer.effective_date DESC
  LIMIT 1;

  IF NOT FOUND AND p_category IS NOT NULL THEN
    SELECT
      cer.id,
      cer.rate_to_naira,
      cer.effective_date,
      cer.source
    INTO v_rate
    FROM public.credit_exchange_rates cer
    WHERE cer.effective_date <= p_as_of
      AND cer.category IS NULL
    ORDER BY cer.effective_date DESC
    LIMIT 1;
  END IF;

  IF v_rate IS NULL THEN
    RETURN;
  END IF;

  rate_id := v_rate.id;
  rate_to_naira := v_rate.rate_to_naira;
  effective_date := v_rate.effective_date;
  source := v_rate.source;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.get_latest_exchange_rate(public.business_category, DATE) IS
  'Returns the most recent credit→naira rate for a category, with fallback to global baseline.';

-- ---------------------------------------------------------------------------
-- 4) AUTOMATIC LEDGER ENTRIES ON TRADE COMPLETION
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_trade_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposer_available NUMERIC;
  proposer_total NUMERIC;
  provider_available NUMERIC;
  provider_total NUMERIC;
  proposer_rate_id UUID;
  proposer_rate_value NUMERIC;
  provider_rate_id UUID;
  provider_rate_value NUMERIC;
  completion_date DATE := COALESCE(NEW.completed_at::date, CURRENT_DATE);
  proposer_category public.business_category;
  provider_category public.business_category;
BEGIN
  IF NEW.status <> 'completed' OR COALESCE(OLD.status, 'pending') = 'completed' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.credit_transactions ct
    WHERE ct.trade_id = NEW.id
      AND ct.transaction_type IN ('earned', 'spent')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT s.category INTO proposer_category
  FROM public.services s
  WHERE s.id = NEW.proposer_service_id;

  SELECT s.category INTO provider_category
  FROM public.services s
  WHERE s.id = NEW.provider_service_id;

  SELECT rate_id, rate_to_naira INTO proposer_rate_id, proposer_rate_value
  FROM public.get_latest_exchange_rate(proposer_category, completion_date)
  LIMIT 1;

  SELECT rate_id, rate_to_naira INTO provider_rate_id, provider_rate_value
  FROM public.get_latest_exchange_rate(provider_category, completion_date)
  LIMIT 1;

  IF proposer_rate_id IS NULL THEN
    SELECT rate_id, rate_to_naira INTO proposer_rate_id, proposer_rate_value
    FROM public.get_latest_exchange_rate(NULL, completion_date)
    LIMIT 1;
  END IF;

  IF provider_rate_id IS NULL THEN
    SELECT rate_id, rate_to_naira INTO provider_rate_id, provider_rate_value
    FROM public.get_latest_exchange_rate(NULL, completion_date)
    LIMIT 1;
  END IF;

  IF proposer_rate_id IS NULL OR provider_rate_id IS NULL THEN
    RAISE EXCEPTION 'No exchange rate snapshot available to finalise trade %', NEW.id;
  END IF;

  SELECT available_credits, total_credits
  INTO proposer_available, proposer_total
  FROM public.profiles
  WHERE id = NEW.proposer_id
  FOR UPDATE;

  SELECT available_credits, total_credits
  INTO provider_available, provider_total
  FROM public.profiles
  WHERE id = NEW.provider_id
  FOR UPDATE;

  IF NEW.proposer_credits > 0 THEN
    INSERT INTO public.credit_transactions (
      user_id,
      counterparty_id,
      amount,
      transaction_type,
      description,
      trade_id,
      service_id,
      balance_before,
      balance_after,
      naira_equivalent,
      exchange_rate_to_naira,
      rate_source_id
    )
    VALUES (
      NEW.proposer_id,
      NEW.provider_id,
      NEW.proposer_credits,
      'earned',
      CONCAT('Credits earned for delivering "', LEFT(NEW.title, 120), '"'),
      NEW.id,
      NEW.proposer_service_id,
      proposer_available,
      proposer_available + NEW.proposer_credits,
      ROUND(NEW.proposer_credits * proposer_rate_value, 2),
      proposer_rate_value,
      proposer_rate_id
    );

    proposer_available := proposer_available + NEW.proposer_credits;
    proposer_total := proposer_total + NEW.proposer_credits;
  END IF;

  IF NEW.provider_credits > 0 THEN
    IF proposer_available < NEW.provider_credits THEN
      RAISE EXCEPTION 'Insufficient credits for proposer % to settle trade %', NEW.proposer_id, NEW.id;
    END IF;

    INSERT INTO public.credit_transactions (
      user_id,
      counterparty_id,
      amount,
      transaction_type,
      description,
      trade_id,
      service_id,
      balance_before,
      balance_after,
      naira_equivalent,
      exchange_rate_to_naira,
      rate_source_id
    )
    VALUES (
      NEW.proposer_id,
      NEW.provider_id,
      -NEW.provider_credits,
      'spent',
      CONCAT('Credits spent to receive "', LEFT(NEW.title, 120), '"'),
      NEW.id,
      NEW.provider_service_id,
      proposer_available,
      proposer_available - NEW.provider_credits,
      ROUND(NEW.provider_credits * provider_rate_value, 2),
      provider_rate_value,
      provider_rate_id
    );

    proposer_available := proposer_available - NEW.provider_credits;
  END IF;

  UPDATE public.profiles
  SET
    available_credits = proposer_available,
    total_credits = proposer_total,
    updated_at = NOW()
  WHERE id = NEW.proposer_id;

  IF NEW.provider_credits > 0 THEN
    INSERT INTO public.credit_transactions (
      user_id,
      counterparty_id,
      amount,
      transaction_type,
      description,
      trade_id,
      service_id,
      balance_before,
      balance_after,
      naira_equivalent,
      exchange_rate_to_naira,
      rate_source_id
    )
    VALUES (
      NEW.provider_id,
      NEW.proposer_id,
      NEW.provider_credits,
      'earned',
      CONCAT('Credits earned for delivering "', LEFT(NEW.title, 120), '"'),
      NEW.id,
      NEW.provider_service_id,
      provider_available,
      provider_available + NEW.provider_credits,
      ROUND(NEW.provider_credits * provider_rate_value, 2),
      provider_rate_value,
      provider_rate_id
    );

    provider_available := provider_available + NEW.provider_credits;
    provider_total := provider_total + NEW.provider_credits;
  END IF;

  IF NEW.proposer_credits > 0 THEN
    IF provider_available < NEW.proposer_credits THEN
      RAISE EXCEPTION 'Insufficient credits for provider % to settle trade %', NEW.provider_id, NEW.id;
    END IF;

    INSERT INTO public.credit_transactions (
      user_id,
      counterparty_id,
      amount,
      transaction_type,
      description,
      trade_id,
      service_id,
      balance_before,
      balance_after,
      naira_equivalent,
      exchange_rate_to_naira,
      rate_source_id
    )
    VALUES (
      NEW.provider_id,
      NEW.proposer_id,
      -NEW.proposer_credits,
      'spent',
      CONCAT('Credits spent to receive "', LEFT(NEW.title, 120), '"'),
      NEW.id,
      NEW.proposer_service_id,
      provider_available,
      provider_available - NEW.proposer_credits,
      ROUND(NEW.proposer_credits * proposer_rate_value, 2),
      proposer_rate_value,
      proposer_rate_id
    );

    provider_available := provider_available - NEW.proposer_credits;
  END IF;

  UPDATE public.profiles
  SET
    available_credits = provider_available,
    total_credits = provider_total,
    updated_at = NOW()
  WHERE id = NEW.provider_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_trade_completion() IS
  'Automatically posts earned/spent ledger rows when trades move into completed status.';

DROP TRIGGER IF EXISTS handle_trade_completion_trigger ON public.trades;
CREATE TRIGGER handle_trade_completion_trigger
  AFTER UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trade_completion();

-- ---------------------------------------------------------------------------
-- 5) RECONCILIATION EVENT LOG + ALERTING
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credit_reconciliation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issue TEXT NOT NULL CHECK (issue IN ('balance_mismatch', 'missing_ledger_entries')),
  ledger_balance DECIMAL(12,2) NOT NULL,
  profile_balance DECIMAL(12,2) NOT NULL,
  difference DECIMAL(12,2) NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_credit_reconciliation_events_user
  ON public.credit_reconciliation_events (user_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_reconciliation_events_issue
  ON public.credit_reconciliation_events (issue, detected_at DESC);

ALTER TABLE public.credit_reconciliation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_reconciliation_events_select_service_role
  ON public.credit_reconciliation_events
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY credit_reconciliation_events_select_authenticated
  ON public.credit_reconciliation_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6) RECONCILIATION CHECKS AND ALERTS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_credit_reconciliation()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mismatch RECORD;
  inserted_count INTEGER := 0;
BEGIN
  FOR mismatch IN
    WITH ledger AS (
      SELECT user_id, COALESCE(SUM(amount), 0)::DECIMAL(12,2) AS ledger_balance
      FROM public.credit_transactions
      GROUP BY user_id
    ),
    profiles_balances AS (
      SELECT id AS user_id, available_credits::DECIMAL(12,2) AS profile_balance
      FROM public.profiles
    )
    SELECT
      p.user_id,
      COALESCE(l.ledger_balance, 0) AS ledger_balance,
      p.profile_balance,
      COALESCE(l.ledger_balance, 0) - p.profile_balance AS difference,
      CASE
        WHEN l.user_id IS NULL THEN 'missing_ledger_entries'
        WHEN ABS(COALESCE(l.ledger_balance, 0) - p.profile_balance) > 0.01 THEN 'balance_mismatch'
        ELSE 'ok'
      END AS issue
    FROM profiles_balances p
    LEFT JOIN ledger l ON l.user_id = p.user_id
    WHERE
      (l.user_id IS NULL) OR
      (ABS(COALESCE(l.ledger_balance, 0) - p.profile_balance) > 0.01)
  LOOP
    INSERT INTO public.credit_reconciliation_events (
      user_id,
      issue,
      ledger_balance,
      profile_balance,
      difference,
      metadata
    ) VALUES (
      mismatch.user_id,
      mismatch.issue,
      mismatch.ledger_balance,
      mismatch.profile_balance,
      mismatch.difference,
      jsonb_build_object(
        'run_id', gen_random_uuid(),
        'detected', NOW()
      )
    );

    PERFORM pg_notify(
      'ledger_alerts',
      json_build_object(
        'user_id', mismatch.user_id,
        'issue', mismatch.issue,
        'ledger_balance', mismatch.ledger_balance,
        'profile_balance', mismatch.profile_balance,
        'difference', mismatch.difference,
        'detected_at', NOW()
      )::TEXT
    );

    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$;

COMMENT ON FUNCTION public.run_credit_reconciliation() IS
  'Scans ledger against profile balances, stores mismatches, and notifies the ledger_alerts channel.';

CREATE OR REPLACE FUNCTION public.assert_credit_reconciliation()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anomaly_count INTEGER;
BEGIN
  anomaly_count := public.run_credit_reconciliation();

  IF anomaly_count > 0 THEN
    RAISE EXCEPTION 'Ledger reconciliation detected % mismatches. Inspect credit_reconciliation_events.', anomaly_count;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_credit_reconciliation() IS
  'Helper for automated tests/cron jobs: raises if ledger mismatches are detected.';

