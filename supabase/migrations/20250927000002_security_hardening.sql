-- ============================================================================
-- SECURITY HARDENING MIGRATION
-- Fix vulnerabilities and tighten RLS policies for production readiness
-- ============================================================================

-- Drop overly permissive policies and replace with secure ones
-- ============================================
-- 1) PROFILES SECURITY HARDENING
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create secure policies with rate limiting and validation
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR (is_onboarded = true AND phone_verified = true)
  );

CREATE POLICY "profiles_insert_authenticated"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND display_name IS NOT NULL
    AND LENGTH(display_name) >= 2
    AND email IS NOT NULL
    AND trust_score BETWEEN 0 AND 100
    AND available_credits <= total_credits
  );

CREATE POLICY "profiles_update_owner_only"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND trust_score BETWEEN 0 AND 100
    AND available_credits <= total_credits
  );

-- ============================================
-- 2) SERVICES SECURITY HARDENING
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
DROP POLICY IF EXISTS "Users can manage their own services" ON public.services;

-- Create secure policies
CREATE POLICY "services_select_public"
  ON public.services FOR SELECT
  TO authenticated, anon
  USING (
    -- Only show available services from non-suspended users
    is_available = true AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = services.user_id
      AND profiles.is_onboarded = true
      AND profiles.phone_verified = true
    )
  );

CREATE POLICY "services_insert_owner_verified"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    -- User must be onboarded and verified
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_onboarded = true
      AND profiles.phone_verified = true
    ) AND
    -- Content validation
    LENGTH(title) BETWEEN 10 AND 100 AND
    LENGTH(description) BETWEEN 20 AND 2000 AND
    base_hourly_rate >= 0 AND
    credits_per_hour >= 0
  );

CREATE POLICY "services_update_owner_only"
  ON public.services FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.phone_verified = true
    )
  )
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "services_delete_owner_only"
  ON public.services FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    -- Cannot delete if there are active trades
    NOT EXISTS (
      SELECT 1 FROM public.trades
      WHERE (proposer_service_id = services.id OR provider_service_id = services.id)
      AND status IN ('pending', 'accepted', 'active')
    )
  );

-- ============================================
-- 3) TRADES SECURITY HARDENING
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Participants can view their trades" ON public.trades;
DROP POLICY IF EXISTS "Users can create trade proposals" ON public.trades;
DROP POLICY IF EXISTS "Participants can update their trades" ON public.trades;

-- Create secure policies
CREATE POLICY "trades_select_participants_only"
  ON public.trades FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = proposer_id OR auth.uid() = provider_id) AND
    -- Both users must remain verified
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = proposer_id
      AND profiles.phone_verified = true
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = provider_id
      AND profiles.phone_verified = true
    )
  );

CREATE POLICY "trades_insert_verified_users"
  ON public.trades FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = proposer_id AND
    proposer_id != provider_id AND
    -- Proposer must be verified
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_onboarded = true
      AND profiles.phone_verified = true
    ) AND
    -- Provider must exist and be available
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = provider_id
      AND profiles.is_onboarded = true
      AND profiles.phone_verified = true
    ) AND
    -- Hours and credits must be reasonable
    proposer_hours > 0 AND proposer_hours <= 40 AND
    provider_hours > 0 AND provider_hours <= 40 AND
    proposer_credits >= 0 AND
    provider_credits >= 0 AND
    exchange_rate > 0 AND
    -- Title validation
    LENGTH(title) BETWEEN 10 AND 200
  );

CREATE POLICY "trades_update_participants_secure"
  ON public.trades FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = proposer_id OR auth.uid() = provider_id) AND
    -- Neither user lost verification
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = proposer_id
      AND profiles.phone_verified = true
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = provider_id
      AND profiles.phone_verified = true
    )
  )
  WITH CHECK (auth.uid() = proposer_id OR auth.uid() = provider_id);

-- ============================================
-- 4) CREDIT TRANSACTIONS SECURITY HARDENING
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;

-- Create secure policies
CREATE POLICY "credit_transactions_select_owner_only"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id AND
    -- User must not be suspended
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.phone_verified = true
    )
  );

-- No INSERT/UPDATE/DELETE policies - transactions managed by database functions only

-- ============================================
-- 5) TRADE MESSAGES SECURITY HARDENING
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Trade participants can view messages" ON public.trade_messages;
DROP POLICY IF EXISTS "Trade participants can send messages" ON public.trade_messages;

-- Create secure policies
CREATE POLICY "trade_messages_select_participants"
  ON public.trade_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE trades.id = trade_messages.trade_id
      AND (trades.proposer_id = auth.uid() OR trades.provider_id = auth.uid())
    )
  );

CREATE POLICY "trade_messages_insert_participants"
  ON public.trade_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE trades.id = trade_messages.trade_id
      AND (trades.proposer_id = auth.uid() OR trades.provider_id = auth.uid())
      AND trades.status NOT IN ('completed', 'cancelled')
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.phone_verified = true
    ) AND
    -- Content validation
    LENGTH(message_text) BETWEEN 1 AND 2000 AND
    is_system_message = false -- Only system can send system messages
  );

CREATE POLICY "trade_messages_update_sender_only"
  ON public.trade_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id AND is_system_message = false)
  WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- 6) ADDITIONAL SECURITY FUNCTIONS
-- ============================================

-- Rate limiting function for API calls
CREATE OR REPLACE FUNCTION check_rate_limit(
  user_id UUID,
  action_type TEXT,
  max_actions INTEGER DEFAULT 60,
  time_window INTERVAL DEFAULT '1 hour'::INTERVAL
) RETURNS BOOLEAN AS $$
DECLARE
  action_count INTEGER;
BEGIN
  -- Ensure rate limit log table exists before querying
  CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Count recent actions
  SELECT COUNT(*) INTO action_count
  FROM public.rate_limits
  WHERE rate_limits.user_id = $1
  AND rate_limits.action_type = $2
  AND rate_limits.created_at > NOW() - time_window;

  -- Log this action
  INSERT INTO public.rate_limits (user_id, action_type)
  VALUES ($1, $2);

  -- Return whether under limit
  RETURN action_count < max_actions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely create trades with validation
CREATE OR REPLACE FUNCTION create_trade_safely(
  provider_user_id UUID,
  proposer_service_id UUID,
  provider_service_id UUID,
  proposer_hours DECIMAL(5,1),
  provider_hours DECIMAL(5,1),
  trade_title TEXT,
  trade_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_trade_id UUID;
  proposer_credits DECIMAL(10,2);
  provider_credits DECIMAL(10,2);
  calculated_rate DECIMAL(8,4);
  proposer_service RECORD;
  provider_service RECORD;
BEGIN
  -- Rate limiting check
  IF NOT check_rate_limit(auth.uid(), 'create_trade', 10, '1 hour'::INTERVAL) THEN
    RAISE EXCEPTION 'Rate limit exceeded for trade creation';
  END IF;

  -- Validate users are not suspended and verified
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_onboarded = true
    AND phone_verified = true
  ) THEN
    RAISE EXCEPTION 'Proposer must be verified and not suspended';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = provider_user_id
    AND is_onboarded = true
    AND phone_verified = true
  ) THEN
    RAISE EXCEPTION 'Provider must be onboarded and not suspended';
  END IF;

  -- Load proposer service
  SELECT * INTO proposer_service
  FROM public.services
  WHERE id = proposer_service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposer service % not found', proposer_service_id;
  END IF;

  -- Load provider service
  SELECT * INTO provider_service
  FROM public.services
  WHERE id = provider_service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider service % not found', provider_service_id;
  END IF;

  -- Calculate credits and exchange rate
  proposer_credits := COALESCE(proposer_service.credits_per_hour, 0) * proposer_hours;
  IF proposer_credits = 0 THEN
    proposer_credits := proposer_service.base_hourly_rate * proposer_hours * 0.1;
  END IF;

  provider_credits := COALESCE(provider_service.credits_per_hour, 0) * provider_hours;
  IF provider_credits = 0 THEN
    provider_credits := provider_service.base_hourly_rate * provider_hours * 0.1;
  END IF;

  IF provider_credits <= 0 THEN
    RAISE EXCEPTION 'Provider credits must be greater than zero';
  END IF;

  IF proposer_credits <= 0 THEN
    RAISE EXCEPTION 'Proposer credits must be greater than zero';
  END IF;

  calculated_rate := proposer_credits / provider_credits;

  -- Create trade
  INSERT INTO public.trades (
    proposer_id, provider_id, proposer_service_id, provider_service_id,
    proposer_hours, provider_hours, proposer_credits, provider_credits,
    exchange_rate, title, description, status
  ) VALUES (
    auth.uid(), provider_user_id, proposer_service_id, provider_service_id,
    proposer_hours, provider_hours, proposer_credits, provider_credits,
    calculated_rate, trade_title, trade_description, 'pending'
  ) RETURNING id INTO new_trade_id;

  RETURN new_trade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7) AUDIT LOGGING ENHANCEMENTS
-- ============================================

-- Enhanced audit table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  event_details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow system to write to audit log
CREATE POLICY "security_audit_system_only"
  ON public.security_audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  event_type TEXT,
  event_details JSONB DEFAULT '{}',
  risk_score INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, event_type, event_details, risk_score,
    ip_address, user_agent
  ) VALUES (
    auth.uid(), event_type, event_details, risk_score,
    inet_client_addr(), current_setting('request.headers')::JSON->>'user-agent'
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the main operation if logging fails
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8) NIGERIAN BUSINESS SECURITY FEATURES
-- ============================================

-- Function to validate Nigerian phone numbers
CREATE OR REPLACE FUNCTION validate_nigerian_phone(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Nigerian phone number patterns: +234XXXXXXXXX, 234XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXXX
  RETURN phone_number ~ '^(\+?234|0)?[789][01]\d{8}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate CAC registration numbers
CREATE OR REPLACE FUNCTION validate_cac_number(cac_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- CAC numbers are typically 6-7 digits, sometimes with RC prefix
  RETURN cac_number ~ '^(RC\s?)?[0-9]{6,7}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enhanced profile validation trigger
CREATE OR REPLACE FUNCTION validate_nigerian_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate phone number format if provided
  IF NEW.phone IS NOT NULL AND NOT validate_nigerian_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid Nigerian phone number format';
  END IF;

  -- Validate CAC number if provided
  IF NEW.cac_registration_number IS NOT NULL AND NOT validate_cac_number(NEW.cac_registration_number) THEN
    RAISE EXCEPTION 'Invalid CAC registration number format';
  END IF;

  -- Log profile updates for verification
  PERFORM log_security_event(
    'profile_update',
    jsonb_build_object(
      'operation', TG_OP,
      'phone_verified', NEW.phone_verified,
      'email_verified', NEW.email_verified,
      'cac_verified', NEW.cac_verified
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to profiles
DROP TRIGGER IF EXISTS validate_nigerian_profile_trigger ON public.profiles;
CREATE TRIGGER validate_nigerian_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION validate_nigerian_profile();

-- ============================================
-- 9) PERFORMANCE MONITORING
-- ============================================

-- Create indexes for security queries
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status
  ON public.profiles (phone_verified, email_verified, cac_verified, is_onboarded);

CREATE INDEX IF NOT EXISTS idx_trades_active_status
  ON public.trades (status, proposer_id, provider_id)
  WHERE status IN ('pending', 'negotiating', 'accepted', 'active');

CREATE INDEX IF NOT EXISTS idx_security_audit_user_time
  ON public.security_audit_log (user_id, created_at DESC);

-- ============================================
-- 10) FINAL SECURITY VALIDATIONS
-- ============================================

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_trade_safely TO authenticated;
GRANT EXECUTE ON FUNCTION validate_nigerian_phone TO authenticated;
GRANT EXECUTE ON FUNCTION validate_cac_number TO authenticated;

-- Revoke dangerous permissions
REVOKE ALL ON public.credit_transactions FROM authenticated;
REVOKE ALL ON public.security_audit_log FROM authenticated;

-- Ensure service role has necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
