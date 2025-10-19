-- ============================================================================
-- BUSINESS RULES AND DATA VALIDATION MIGRATION
-- Comprehensive validation constraints for Nigerian time-banking platform
-- ============================================================================

-- ============================================
-- 1) PROFILE BUSINESS RULES AND VALIDATION
-- ============================================

-- Enhanced profile validation with Nigerian context
CREATE OR REPLACE FUNCTION validate_profile_business_rules()
RETURNS TRIGGER AS $$
DECLARE
  phone_pattern TEXT := '^(\+?234|0)?[789][01]\d{8}$';
  email_pattern TEXT := '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
  cac_pattern TEXT := '^(RC\s?)?[0-9]{6,7}$';
  nigerian_states TEXT[] := ARRAY[
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
    'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
    'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
    'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
    'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
  ];
BEGIN
  -- Display name validation
  IF NEW.display_name IS NOT NULL THEN
    IF LENGTH(NEW.display_name) < 2 OR LENGTH(NEW.display_name) > 50 THEN
      RAISE EXCEPTION 'Display name must be between 2 and 50 characters';
    END IF;

    IF NEW.display_name ~ '[<>\"''\\&]' THEN
      RAISE EXCEPTION 'Display name contains invalid characters';
    END IF;
  END IF;

  -- Email validation
  IF NEW.email IS NOT NULL AND NEW.email !~ email_pattern THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Phone validation (Nigerian format)
  IF NEW.phone IS NOT NULL AND NEW.phone !~ phone_pattern THEN
    RAISE EXCEPTION 'Phone must be a valid Nigerian number format (+234XXXXXXXXX, 0XXXXXXXXX, or XXXXXXXXXX)';
  END IF;

  -- CAC registration validation
  IF NEW.cac_registration_number IS NOT NULL AND NEW.cac_registration_number !~ cac_pattern THEN
    RAISE EXCEPTION 'CAC registration must be in format RC123456 or 123456 (6-7 digits)';
  END IF;

  -- Location validation (Nigerian states)
  IF NEW.location IS NOT NULL AND NOT (NEW.location = ANY(nigerian_states)) THEN
    RAISE EXCEPTION 'Location must be a valid Nigerian state or FCT';
  END IF;

  -- Trust score business rules
  IF NEW.trust_score < 0 OR NEW.trust_score > 100 THEN
    RAISE EXCEPTION 'Trust score must be between 0 and 100';
  END IF;

  -- Response time must be reasonable (in hours)
  IF NEW.average_response_hours IS NOT NULL AND (NEW.average_response_hours < 0 OR NEW.average_response_hours > 168) THEN
    RAISE EXCEPTION 'Average response hours must be between 0 and 168 hours';
  END IF;

  -- Success rate validation
  IF NEW.success_rate < 0 OR NEW.success_rate > 100 THEN
    RAISE EXCEPTION 'Success rate must be between 0 and 100 percent';
  END IF;

  -- Average rating validation
  IF NEW.average_rating IS NOT NULL AND (NEW.average_rating < 1 OR NEW.average_rating > 5) THEN
    RAISE EXCEPTION 'Average rating must be between 1 and 5';
  END IF;

  -- Total trades must be non-negative
  IF NEW.total_trades_completed < 0 THEN
    RAISE EXCEPTION 'Total trades completed cannot be negative';
  END IF;

  -- Business logic: cannot be verified without required information
  IF NEW.phone_verified = true AND NEW.phone IS NULL THEN
    RAISE EXCEPTION 'Cannot mark phone as verified without phone number';
  END IF;

  IF NEW.cac_verified = true AND NEW.cac_registration_number IS NULL THEN
    RAISE EXCEPTION 'Cannot mark CAC as verified without CAC registration number';
  END IF;

  IF NEW.email_verified = true AND NEW.email IS NULL THEN
    RAISE EXCEPTION 'Cannot mark email as verified without email address';
  END IF;

  -- Onboarding business rules
  IF NEW.is_onboarded = true THEN
    IF NEW.display_name IS NULL OR NEW.category IS NULL THEN
      RAISE EXCEPTION 'Cannot complete onboarding without display name and category';
    END IF;

    -- Email verification is recommended but not required at this stage
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply profile validation trigger
DROP TRIGGER IF EXISTS validate_profile_business_rules_trigger ON public.profiles;
CREATE TRIGGER validate_profile_business_rules_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION validate_profile_business_rules();

-- ============================================
-- 2) SERVICES BUSINESS RULES AND VALIDATION
-- ============================================

CREATE OR REPLACE FUNCTION validate_service_business_rules()
RETURNS TRIGGER AS $$
DECLARE
  valid_categories TEXT[] := ARRAY[
    'legal', 'tech', 'creative', 'marketing', 'accounting', 'fashion',
    'food', 'transportation', 'construction', 'generator_repair',
    'event_planning', 'photography', 'education', 'healthcare',
    'agriculture', 'beauty_wellness', 'cleaning', 'consulting'
  ];
  nigerian_states TEXT[] := ARRAY[
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
    'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
    'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
    'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
    'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
  ];
  user_verified BOOLEAN;
  user_onboarded BOOLEAN;
BEGIN
  -- Check if user is authorized to create/modify services
  SELECT phone_verified, is_onboarded
  INTO user_verified, user_onboarded
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF NOT user_verified OR NOT user_onboarded THEN
    RAISE EXCEPTION 'User must be verified and onboarded to manage services';
  END IF;

  -- Title validation
  IF LENGTH(NEW.title) < 10 OR LENGTH(NEW.title) > 100 THEN
    RAISE EXCEPTION 'Service title must be between 10 and 100 characters';
  END IF;

  -- Description validation
  IF LENGTH(NEW.description) < 20 OR LENGTH(NEW.description) > 2000 THEN
    RAISE EXCEPTION 'Service description must be between 20 and 2000 characters';
  END IF;

  -- Category validation
  IF NOT (NEW.category::TEXT = ANY(valid_categories)) THEN
    RAISE EXCEPTION 'Invalid service category. Must be one of: %', array_to_string(valid_categories, ', ');
  END IF;

  -- Pricing validation for Nigerian market
  IF NEW.base_hourly_rate < 0 OR NEW.base_hourly_rate > 100000 THEN -- Max ₦100,000/hour
    RAISE EXCEPTION 'Base hourly rate must be between ₦0 and ₦100,000';
  END IF;

  IF NEW.credits_per_hour < 0 OR NEW.credits_per_hour > 1000 THEN
    RAISE EXCEPTION 'Credits per hour must be between 0 and 1000';
  END IF;

  -- Hour range validation
  IF NEW.minimum_hours <= 0 OR NEW.minimum_hours > 40 THEN
    RAISE EXCEPTION 'Minimum hours must be between 0.1 and 40';
  END IF;

  IF NEW.maximum_hours < NEW.minimum_hours OR NEW.maximum_hours > 40 THEN
    RAISE EXCEPTION 'Maximum hours must be between minimum hours and 40';
  END IF;

  -- Portfolio validation
  IF array_length(NEW.portfolio_images, 1) > 10 THEN
    RAISE EXCEPTION 'Maximum 10 portfolio images allowed';
  END IF;

  -- Tags validation
  IF array_length(NEW.tags, 1) > 20 THEN
    RAISE EXCEPTION 'Maximum 20 tags allowed';
  END IF;

  -- Coverage areas validation (Nigerian states)
  IF NEW.coverage_areas IS NOT NULL THEN
    FOR i IN 1..array_length(NEW.coverage_areas, 1) LOOP
      IF NOT (NEW.coverage_areas[i] = ANY(nigerian_states)) THEN
        RAISE EXCEPTION 'Coverage area "%" is not a valid Nigerian state', NEW.coverage_areas[i];
      END IF;
    END LOOP;

    IF array_length(NEW.coverage_areas, 1) > 37 THEN -- 36 states + FCT
      RAISE EXCEPTION 'Cannot cover more than 37 areas (all Nigerian states + FCT)';
    END IF;
  END IF;

  -- Rating validation
  IF NEW.average_rating IS NOT NULL AND (NEW.average_rating < 1 OR NEW.average_rating > 5) THEN
    RAISE EXCEPTION 'Average rating must be between 1 and 5';
  END IF;

  -- Performance metrics validation
  IF NEW.view_count < 0 OR NEW.inquiry_count < 0 OR NEW.completed_orders < 0 THEN
    RAISE EXCEPTION 'Performance metrics cannot be negative';
  END IF;

  -- Business logic: CAC verification requirement for certain categories
  IF NEW.category::TEXT IN ('legal', 'accounting', 'healthcare') AND NEW.requires_cac_verification = false THEN
    RAISE EXCEPTION 'CAC verification is required for % services in Nigeria', NEW.category;
  END IF;

  -- Service availability logic
  IF NEW.serves_remote = false AND NEW.serves_onsite = false THEN
    RAISE EXCEPTION 'Service must offer either remote or onsite delivery';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply service validation trigger
DROP TRIGGER IF EXISTS validate_service_business_rules_trigger ON public.services;
CREATE TRIGGER validate_service_business_rules_trigger
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION validate_service_business_rules();

-- ============================================
-- 3) TRADES BUSINESS RULES AND VALIDATION
-- ============================================

CREATE OR REPLACE FUNCTION validate_trade_business_rules()
RETURNS TRIGGER AS $$
DECLARE
  proposer_verified BOOLEAN;
  provider_verified BOOLEAN;
  proposer_trust INTEGER;
  provider_trust INTEGER;
BEGIN
  -- Validate participants are different
  IF NEW.proposer_id = NEW.provider_id THEN
    RAISE EXCEPTION 'Cannot create trade with yourself';
  END IF;

  -- Check participant verification status
  SELECT phone_verified AND is_onboarded, trust_score
  INTO proposer_verified, proposer_trust
  FROM public.profiles
  WHERE id = NEW.proposer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposer profile not found';
  END IF;

  SELECT phone_verified AND is_onboarded, trust_score
  INTO provider_verified, provider_trust
  FROM public.profiles
  WHERE id = NEW.provider_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider profile not found';
  END IF;

  IF NOT proposer_verified THEN
    RAISE EXCEPTION 'Proposer must be verified and onboarded';
  END IF;

  IF NOT provider_verified THEN
    RAISE EXCEPTION 'Provider must be verified and onboarded';
  END IF;

  IF proposer_trust < 10 OR provider_trust < 10 THEN
    RAISE EXCEPTION 'Both parties need a minimum trust score of 10 to trade';
  END IF;

  -- Title validation
  IF LENGTH(NEW.title) < 10 OR LENGTH(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Trade title must be between 10 and 200 characters';
  END IF;

  -- Description validation
  IF NEW.description IS NOT NULL AND LENGTH(NEW.description) > 1000 THEN
    RAISE EXCEPTION 'Trade description cannot exceed 1000 characters';
  END IF;

  -- Hours validation
  IF NEW.proposer_hours <= 0 OR NEW.proposer_hours > 40 THEN
    RAISE EXCEPTION 'Proposer hours must be between 0.1 and 40';
  END IF;

  IF NEW.provider_hours <= 0 OR NEW.provider_hours > 40 THEN
    RAISE EXCEPTION 'Provider hours must be between 0.1 and 40';
  END IF;

  -- Credits validation
  IF NEW.proposer_credits < 0 OR NEW.provider_credits < 0 THEN
    RAISE EXCEPTION 'Credits cannot be negative';
  END IF;

  -- Exchange rate validation
  IF NEW.exchange_rate <= 0 OR NEW.exchange_rate > 100 THEN
    RAISE EXCEPTION 'Exchange rate must be between 0.01 and 100';
  END IF;

  IF NEW.provider_credits = 0 THEN
    RAISE EXCEPTION 'Provider credits must be greater than zero';
  END IF;

  -- Validate credits calculation matches exchange rate
  IF ABS((NEW.proposer_credits / NULLIF(NEW.provider_credits, 0)) - NEW.exchange_rate) > 0.01 THEN
    RAISE EXCEPTION 'Credits calculation does not match exchange rate';
  END IF;

  -- Priority level validation
  IF NEW.priority_level < 1 OR NEW.priority_level > 5 THEN
    RAISE EXCEPTION 'Priority level must be between 1 (urgent) and 5 (low)';
  END IF;

  -- Deadline validation (reasonable timeframes)
  IF NEW.delivery_deadline IS NOT NULL THEN
    IF NEW.delivery_deadline <= NOW() THEN
      RAISE EXCEPTION 'Delivery deadline must be in the future';
    END IF;

    IF NEW.delivery_deadline > NOW() + INTERVAL '6 months' THEN
      RAISE EXCEPTION 'Delivery deadline cannot be more than 6 months from now';
    END IF;
  END IF;

  -- Escrow validation
  IF NEW.escrow_credits < 0 THEN
    RAISE EXCEPTION 'Escrow credits cannot be negative';
  END IF;

  -- Rating validation
  IF NEW.proposer_rating IS NOT NULL AND (NEW.proposer_rating < 1 OR NEW.proposer_rating > 5) THEN
    RAISE EXCEPTION 'Proposer rating must be between 1 and 5';
  END IF;

  IF NEW.provider_rating IS NOT NULL AND (NEW.provider_rating < 1 OR NEW.provider_rating > 5) THEN
    RAISE EXCEPTION 'Provider rating must be between 1 and 5';
  END IF;

  -- Review validation
  IF NEW.proposer_review IS NOT NULL AND LENGTH(NEW.proposer_review) > 500 THEN
    RAISE EXCEPTION 'Proposer review cannot exceed 500 characters';
  END IF;

  IF NEW.provider_review IS NOT NULL AND LENGTH(NEW.provider_review) > 500 THEN
    RAISE EXCEPTION 'Provider review cannot exceed 500 characters';
  END IF;

  -- Nigerian business context validation
  IF NEW.requires_physical_meetup = true AND NEW.meetup_location IS NULL THEN
    RAISE EXCEPTION 'Meetup location required for physical meetups';
  END IF;

  IF NEW.meetup_location IS NOT NULL AND LENGTH(NEW.meetup_location) > 200 THEN
    RAISE EXCEPTION 'Meetup location cannot exceed 200 characters';
  END IF;

  -- Communication method validation
  IF NEW.preferred_communication_method NOT IN ('whatsapp', 'phone', 'email', 'platform') THEN
    RAISE EXCEPTION 'Communication method must be whatsapp, phone, email, or platform';
  END IF;

  -- Status transition validation
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status NOT IN ('negotiating', 'accepted', 'cancelled') THEN
      RAISE EXCEPTION 'Pending trades can only move to negotiating, accepted, or cancelled';
    END IF;

    IF OLD.status = 'negotiating' AND NEW.status NOT IN ('accepted', 'cancelled') THEN
      RAISE EXCEPTION 'Negotiating trades can only move to accepted or cancelled';
    END IF;

    IF OLD.status = 'accepted' AND NEW.status NOT IN ('active', 'cancelled') THEN
      RAISE EXCEPTION 'Accepted trades can only move to active or cancelled';
    END IF;

    IF OLD.status = 'active' AND NEW.status NOT IN ('completed', 'disputed', 'cancelled') THEN
      RAISE EXCEPTION 'Active trades can only move to completed, disputed, or cancelled';
    END IF;

    IF OLD.status = 'disputed' AND NEW.status NOT IN ('completed', 'cancelled') THEN
      RAISE EXCEPTION 'Disputed trades can only be completed or cancelled';
    END IF;

    IF OLD.status IN ('completed', 'cancelled') AND NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Cannot change status of completed or cancelled trades';
    END IF;

    -- Protect financial terms after acceptance
    IF OLD.status NOT IN ('pending', 'negotiating') THEN
      IF NEW.proposer_credits != OLD.proposer_credits
         OR NEW.provider_credits != OLD.provider_credits
         OR NEW.exchange_rate != OLD.exchange_rate THEN
        RAISE EXCEPTION 'Cannot modify financial terms after trade acceptance';
      END IF;
    END IF;

    -- Completion confirmation logic
    IF NEW.status = 'completed' THEN
      IF NOT (NEW.proposer_completion_confirmed = true AND NEW.provider_completion_confirmed = true) THEN
        RAISE EXCEPTION 'Both parties must confirm completion before marking trade as completed';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trade validation trigger
DROP TRIGGER IF EXISTS validate_trade_business_rules_trigger ON public.trades;
CREATE TRIGGER validate_trade_business_rules_trigger
  BEFORE INSERT OR UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION validate_trade_business_rules();

-- ============================================
-- 4) CREDIT TRANSACTIONS BUSINESS RULES
-- ============================================

CREATE OR REPLACE FUNCTION validate_credit_transaction_rules()
RETURNS TRIGGER AS $$
DECLARE
  available_balance DECIMAL(10,2);
BEGIN
  -- Ensure user exists and capture available balance
  SELECT available_credits
  INTO available_balance
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot create transaction for non-existent profile';
  END IF;

  -- Amount validation
  IF NEW.amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount cannot be zero';
  END IF;

  -- Description validation
  IF LENGTH(NEW.description) < 5 OR LENGTH(NEW.description) > 200 THEN
    RAISE EXCEPTION 'Transaction description must be between 5 and 200 characters';
  END IF;

  -- Balance validation
  IF NEW.balance_before < 0 OR NEW.balance_after < 0 THEN
    RAISE EXCEPTION 'Account balances cannot be negative';
  END IF;

  IF NEW.balance_after != NEW.balance_before + NEW.amount THEN
    RAISE EXCEPTION 'Transaction balance calculation is incorrect';
  END IF;

  IF NEW.balance_after < 0 THEN
    RAISE EXCEPTION 'Transaction would result in negative balance';
  END IF;

  -- Naira equivalent validation for Nigerian market
  IF NEW.naira_equivalent IS NOT NULL THEN
    IF NEW.naira_equivalent < 0 THEN
      RAISE EXCEPTION 'Naira equivalent cannot be negative';
    END IF;

    IF NEW.exchange_rate_to_naira IS NULL OR NEW.exchange_rate_to_naira <= 0 THEN
      RAISE EXCEPTION 'Exchange rate to Naira required when Naira equivalent is provided';
    END IF;
  END IF;

  -- Reversal validation
  IF NEW.reversed_at IS NOT NULL THEN
    IF NEW.reversal_reason IS NULL OR LENGTH(NEW.reversal_reason) < 10 THEN
      RAISE EXCEPTION 'Reversal reason required and must be at least 10 characters';
    END IF;

    IF NEW.reversed_at <= NEW.created_at THEN
      RAISE EXCEPTION 'Reversal date cannot be before transaction date';
    END IF;
  END IF;

  -- Transaction type specific validation aligned with enum values
  CASE NEW.transaction_type
    WHEN 'earned' THEN
      IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Earned credits must be positive';
      END IF;
      IF NEW.trade_id IS NULL THEN
        RAISE EXCEPTION 'Earned credits must reference a trade';
      END IF;

    WHEN 'spent' THEN
      IF NEW.amount >= 0 THEN
        RAISE EXCEPTION 'Spent credits must be negative';
      END IF;

    WHEN 'bonus' THEN
      IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Bonus credits must be positive';
      END IF;

    WHEN 'penalty' THEN
      IF NEW.amount >= 0 THEN
        RAISE EXCEPTION 'Penalty transactions must decrease balance';
      END IF;

    WHEN 'refund' THEN
      IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Refund transactions must be positive';
      END IF;
      IF NEW.trade_id IS NULL THEN
        RAISE EXCEPTION 'Refund transactions must reference a trade';
      END IF;

    WHEN 'escrow_hold' THEN
      IF NEW.trade_id IS NULL THEN
        RAISE EXCEPTION 'Escrow hold transactions must reference a trade';
      END IF;
      IF NEW.amount >= 0 THEN
        RAISE EXCEPTION 'Escrow hold transactions must be negative';
      END IF;

    WHEN 'escrow_release' THEN
      IF NEW.trade_id IS NULL THEN
        RAISE EXCEPTION 'Escrow release transactions must reference a trade';
      END IF;
      IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Escrow release transactions must be positive';
      END IF;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply credit transaction validation trigger
DROP TRIGGER IF EXISTS validate_credit_transaction_rules_trigger ON public.credit_transactions;
CREATE TRIGGER validate_credit_transaction_rules_trigger
  BEFORE INSERT OR UPDATE ON public.credit_transactions
  FOR EACH ROW EXECUTE FUNCTION validate_credit_transaction_rules();

-- ============================================
-- 5) TRADE MESSAGES BUSINESS RULES
-- ============================================

CREATE OR REPLACE FUNCTION validate_trade_message_rules()
RETURNS TRIGGER AS $$
DECLARE
  trade_status TEXT;
  is_participant BOOLEAN;
BEGIN
  -- Check if sender is a participant in the trade
  SELECT
    status,
    (proposer_id = NEW.sender_id OR provider_id = NEW.sender_id)
  INTO trade_status, is_participant
  FROM public.trades
  WHERE id = NEW.trade_id;

  IF NOT is_participant AND NOT NEW.is_system_message THEN
    RAISE EXCEPTION 'Only trade participants can send messages';
  END IF;

  -- Validate message content
  IF LENGTH(NEW.message_text) < 1 OR LENGTH(NEW.message_text) > 2000 THEN
    RAISE EXCEPTION 'Message text must be between 1 and 2000 characters';
  END IF;

  -- Message type validation
  IF NEW.message_type NOT IN ('text', 'image', 'file', 'system') THEN
    RAISE EXCEPTION 'Invalid message type';
  END IF;

  -- Attachment validation
  IF NEW.attachment_urls IS NOT NULL AND array_length(NEW.attachment_urls, 1) > 5 THEN
    RAISE EXCEPTION 'Maximum 5 attachments allowed per message';
  END IF;

  -- System message validation
  IF NEW.is_system_message = true AND NEW.message_type != 'system' THEN
    RAISE EXCEPTION 'System messages must have message_type = system';
  END IF;

  -- Business logic: Cannot send messages to completed/cancelled trades (except system messages)
  IF trade_status IN ('completed', 'cancelled') AND NOT NEW.is_system_message THEN
    RAISE EXCEPTION 'Cannot send messages to % trades', trade_status;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.sender_id <> OLD.sender_id OR NEW.trade_id <> OLD.trade_id THEN
      RAISE EXCEPTION 'Cannot reassign message sender or trade';
    END IF;

    IF NEW.message_text <> OLD.message_text THEN
      RAISE EXCEPTION 'Cannot edit message text after sending';
    END IF;

    IF NEW.message_type <> OLD.message_type THEN
      RAISE EXCEPTION 'Cannot change message type after sending';
    END IF;

    IF NEW.is_system_message <> OLD.is_system_message THEN
      RAISE EXCEPTION 'Cannot change system message flag';
    END IF;

    IF NEW.attachment_urls IS DISTINCT FROM OLD.attachment_urls THEN
      RAISE EXCEPTION 'Cannot modify attachments after sending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trade message validation trigger
DROP TRIGGER IF EXISTS validate_trade_message_rules_trigger ON public.trade_messages;
CREATE TRIGGER validate_trade_message_rules_trigger
  BEFORE INSERT OR UPDATE ON public.trade_messages
  FOR EACH ROW EXECUTE FUNCTION validate_trade_message_rules();

-- ============================================
-- 6) NIGERIAN MARKET SPECIFIC VALIDATIONS
-- ============================================

-- Function to validate Nigerian business hours
CREATE OR REPLACE FUNCTION is_nigerian_business_hours(check_time TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
  local_time TIME;
  local_dow INTEGER;
BEGIN
  -- Convert to West Africa Time
  local_time := (check_time AT TIME ZONE 'Africa/Lagos')::TIME;
  local_dow := EXTRACT(DOW FROM (check_time AT TIME ZONE 'Africa/Lagos'));

  -- Monday to Friday: 8 AM to 6 PM WAT
  -- Saturday: 9 AM to 4 PM WAT
  -- Sunday: Closed
  RETURN (
    (local_dow BETWEEN 1 AND 5 AND local_time BETWEEN '08:00' AND '18:00') OR
    (local_dow = 6 AND local_time BETWEEN '09:00' AND '16:00')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate Nigerian working days
CREATE OR REPLACE FUNCTION add_nigerian_working_days(start_date DATE, working_days INTEGER)
RETURNS DATE AS $$
DECLARE
  result_date DATE := start_date;
  days_added INTEGER := 0;
BEGIN
  WHILE days_added < working_days LOOP
    result_date := result_date + 1;
    -- Skip weekends
    IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;

  RETURN result_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 7) AUTOMATED BUSINESS RULE ENFORCEMENT
-- ============================================

-- Function to auto-update profile metrics
CREATE OR REPLACE FUNCTION update_profile_metrics()
RETURNS TRIGGER AS $$
DECLARE
  total_trades INTEGER;
  completed_trades INTEGER;
  avg_rating DECIMAL(3,2);
  success_rate DECIMAL(5,2);
  user_record RECORD;
BEGIN
  -- Calculate metrics for the involved users
  FOR user_record IN
    SELECT DISTINCT user_id FROM (
      SELECT NEW.proposer_id as user_id
      UNION
      SELECT NEW.provider_id as user_id
    ) users
  LOOP
    -- Count trades
    SELECT COUNT(*) INTO total_trades
    FROM public.trades
    WHERE proposer_id = user_record.user_id OR provider_id = user_record.user_id;

    SELECT COUNT(*) INTO completed_trades
    FROM public.trades
    WHERE (proposer_id = user_record.user_id OR provider_id = user_record.user_id)
    AND status = 'completed';

    -- Calculate rates
    success_rate := CASE WHEN total_trades > 0 THEN ROUND((completed_trades * 100.0 / total_trades)::NUMERIC, 2) ELSE 0 END;

    -- Calculate average rating
    SELECT AVG(rating)::DECIMAL(3,2)
    INTO avg_rating
    FROM (
      SELECT proposer_rating AS rating
      FROM public.trades
      WHERE provider_id = user_record.user_id
        AND proposer_rating IS NOT NULL
        AND status = 'completed'
      UNION ALL
      SELECT provider_rating AS rating
      FROM public.trades
      WHERE proposer_id = user_record.user_id
        AND provider_rating IS NOT NULL
        AND status = 'completed'
    ) ratings;

    -- Update profile
    UPDATE public.profiles
    SET
      total_trades_completed = completed_trades,
      success_rate = success_rate,
      average_rating = avg_rating,
      updated_at = NOW()
    WHERE id = user_record.user_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply profile metrics update trigger
DROP TRIGGER IF EXISTS update_profile_metrics_trigger ON public.trades;
CREATE TRIGGER update_profile_metrics_trigger
  AFTER INSERT OR UPDATE OF status, proposer_rating, provider_rating ON public.trades
  FOR EACH ROW EXECUTE FUNCTION update_profile_metrics();

-- ============================================
-- 8) DATA CONSISTENCY CHECKS
-- ============================================

-- Function to verify data consistency
CREATE OR REPLACE FUNCTION check_data_consistency()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check for orphaned services
  RETURN QUERY
  SELECT
    'Orphaned Services'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    'Services with non-existent users: ' || COUNT(*)::TEXT
  FROM public.services s
  LEFT JOIN public.profiles p ON s.user_id = p.id
  WHERE p.id IS NULL;

  -- Check for trades with invalid participants
  RETURN QUERY
  SELECT
    'Invalid Trade Participants'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    'Trades with non-existent participants: ' || COUNT(*)::TEXT
  FROM public.trades t
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = t.proposer_id)
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = t.provider_id);

  -- Check for inconsistent credit balances
  RETURN QUERY
  SELECT
    'Credit Balance Consistency'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    'Transactions with invalid balance calculations: ' || COUNT(*)::TEXT
  FROM public.credit_transactions
  WHERE (amount > 0 AND balance_after != balance_before + amount)
     OR (amount < 0 AND balance_after != balance_before + amount);

  -- Check for duplicate services by same user
  RETURN QUERY
  SELECT
    'Duplicate Services'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    'Users with identical services: ' || COUNT(*)::TEXT
  FROM (
    SELECT user_id, title, category, COUNT(*) as cnt
    FROM public.services
    WHERE is_available = true
    GROUP BY user_id, title, category
    HAVING COUNT(*) > 1
  ) duplicates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to consistency check function
GRANT EXECUTE ON FUNCTION check_data_consistency() TO authenticated;

-- ============================================
-- 9) CONSTRAINT VIOLATIONS LOGGING
-- ============================================

-- Log constraint violations for monitoring
CREATE TABLE IF NOT EXISTS public.constraint_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  constraint_name TEXT,
  violation_details TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on violations log
ALTER TABLE public.constraint_violations ENABLE ROW LEVEL SECURITY;

-- Only allow system to read violation logs
CREATE POLICY "constraint_violations_system_only"
  ON public.constraint_violations FOR SELECT
  TO service_role
  USING (true);
