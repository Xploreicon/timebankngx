-- ============================================================================
-- NIGERIAN BUSINESS CONTEXT AND LOCALIZATION MIGRATION
-- Nigerian market-specific business rules, validations, and features
-- ============================================================================

-- ============================================
-- 1) NIGERIAN BUSINESS CATEGORIES AND RATES
-- ============================================

-- Create comprehensive category rate table with Nigerian market context
CREATE TABLE IF NOT EXISTS public.nigerian_category_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.business_category NOT NULL UNIQUE,

  -- Market rates in Nigerian context
  base_rate_naira DECIMAL(8,2) NOT NULL, -- Base hourly rate in Naira
  base_credits_per_hour DECIMAL(6,2) NOT NULL, -- Base credits per hour

  -- Market dynamics
  demand_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0, -- Supply/demand adjustment
  supply_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  seasonal_peak_months INTEGER[] DEFAULT '{}', -- Months with high demand (1-12)

  -- Nigerian market characteristics
  requires_cac_verification BOOLEAN NOT NULL DEFAULT FALSE,
  requires_physical_presence BOOLEAN NOT NULL DEFAULT FALSE,
  popular_in_states TEXT[] DEFAULT '{}', -- States where this category is popular

  -- Business context
  typical_project_duration_days INTEGER DEFAULT 7,
  minimum_experience_years INTEGER DEFAULT 1,
  trust_score_requirement INTEGER DEFAULT 50,

  -- Economic factors
  inflation_adjustment_rate DECIMAL(5,2) DEFAULT 0.0, -- Annual inflation adjustment
  exchange_rate_sensitivity DECIMAL(3,2) DEFAULT 0.0, -- Sensitivity to USD/NGN rate

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Nigerian market rates
INSERT INTO public.nigerian_category_rates (
  category, base_rate_naira, base_credits_per_hour, demand_multiplier, supply_multiplier,
  requires_cac_verification, requires_physical_presence, popular_in_states,
  typical_project_duration_days, minimum_experience_years, trust_score_requirement,
  seasonal_peak_months
) VALUES
  ('legal', 15000, 10.0, 1.5, 0.8, true, false,
   ARRAY['Lagos', 'Abuja', 'Rivers'], 14, 3, 70, ARRAY[1,9,10,11,12]),
  ('tech', 12000, 8.0, 1.4, 0.9, false, false,
   ARRAY['Lagos', 'Abuja', 'Ogun'], 7, 2, 60, ARRAY[1,2,9,10,11]),
  ('creative', 8000, 6.0, 1.2, 1.1, false, false,
   ARRAY['Lagos', 'Ogun', 'Oyo'], 5, 1, 50, ARRAY[11,12,1,2]),
  ('marketing', 10000, 7.0, 1.3, 1.0, false, false,
   ARRAY['Lagos', 'Abuja', 'Kano'], 10, 2, 55, ARRAY[9,10,11,12]),
  ('accounting', 12000, 8.0, 1.4, 0.8, true, false,
   ARRAY['Lagos', 'Abuja', 'Kano'], 7, 3, 65, ARRAY[1,2,3,4,12]),
  ('fashion', 6000, 4.0, 1.1, 1.3, false, true,
   ARRAY['Lagos', 'Kano', 'Ogun'], 14, 1, 40, ARRAY[11,12,1,2,3]),
  ('food', 5000, 3.5, 1.0, 1.4, false, true,
   ARRAY['Lagos', 'Ogun', 'Delta'], 1, 1, 45, ARRAY[12,1,11]),
  ('transportation', 4000, 3.0, 1.1, 1.2, false, true,
   ARRAY['Lagos', 'Ogun', 'Rivers'], 1, 1, 50, ARRAY[12,1,2]),
  ('construction', 8000, 5.0, 1.2, 1.0, true, true,
   ARRAY['Lagos', 'Abuja', 'Rivers'], 30, 2, 60, ARRAY[1,2,10,11,12]),
  ('generator_repair', 7000, 5.0, 1.6, 0.7, false, true,
   ARRAY['Lagos', 'Kano', 'Rivers'], 2, 2, 55, ARRAY[1,2,3,10,11,12]),
  ('event_planning', 9000, 6.0, 1.3, 1.1, false, true,
   ARRAY['Lagos', 'Abuja', 'Rivers'], 21, 2, 55, ARRAY[11,12,1,2,6,7]),
  ('photography', 8000, 5.5, 1.2, 1.2, false, true,
   ARRAY['Lagos', 'Abuja', 'Ogun'], 3, 1, 50, ARRAY[11,12,1,2,6,7]),
  ('education', 6000, 4.5, 1.1, 1.3, false, false,
   ARRAY['Lagos', 'Abuja', 'Oyo'], 30, 2, 55, ARRAY[1,2,9,10]),
  ('healthcare', 18000, 12.0, 1.4, 0.6, true, true,
   ARRAY['Lagos', 'Abuja', 'Rivers'], 1, 4, 75, ARRAY[1,2,3,10,11,12]),
  ('agriculture', 5000, 3.5, 1.0, 1.4, false, true,
   ARRAY['Ogun', 'Oyo', 'Kaduna'], 90, 2, 50, ARRAY[4,5,6,7,8,9]),
  ('beauty_wellness', 7000, 5.0, 1.2, 1.1, false, true,
   ARRAY['Lagos', 'Ogun', 'Abuja'], 7, 2, 55, ARRAY[1,2,3,11,12]),
  ('consulting', 11000, 7.0, 1.3, 0.9, false, false,
   ARRAY['Lagos', 'Abuja'], 14, 3, 65, ARRAY[1,2,9,10]),
  ('cleaning', 4500, 3.0, 1.0, 1.4, false, true,
   ARRAY['Lagos', 'Ogun', 'Rivers'], 2, 1, 45, ARRAY[12,1,2])
ON CONFLICT (category) DO UPDATE SET
  base_rate_naira = EXCLUDED.base_rate_naira,
  base_credits_per_hour = EXCLUDED.base_credits_per_hour,
  demand_multiplier = EXCLUDED.demand_multiplier,
  supply_multiplier = EXCLUDED.supply_multiplier,
  requires_cac_verification = EXCLUDED.requires_cac_verification,
  requires_physical_presence = EXCLUDED.requires_physical_presence,
  popular_in_states = EXCLUDED.popular_in_states,
  typical_project_duration_days = EXCLUDED.typical_project_duration_days,
  minimum_experience_years = EXCLUDED.minimum_experience_years,
  trust_score_requirement = EXCLUDED.trust_score_requirement,
  seasonal_peak_months = EXCLUDED.seasonal_peak_months,
  updated_at = NOW();

-- ============================================
-- 2) NIGERIAN BUSINESS VALIDATION FUNCTIONS
-- ============================================

-- Validate Nigerian Bank Verification Number (BVN)
CREATE OR REPLACE FUNCTION validate_nigerian_bvn(bvn TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- BVN is 11 digits
  RETURN bvn ~ '^[0-9]{11}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate Nigerian National Identification Number (NIN)
CREATE OR REPLACE FUNCTION validate_nigerian_nin(nin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- NIN is 11 digits
  RETURN nin ~ '^[0-9]{11}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate Nigerian Tax Identification Number (TIN)
CREATE OR REPLACE FUNCTION validate_nigerian_tin(tin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- TIN format: XXXXXXXX-XXXX (8 digits, dash, 4 digits)
  RETURN tin ~ '^[0-9]{8}-[0-9]{4}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate Nigerian business registration (CAC) number
CREATE OR REPLACE FUNCTION validate_nigerian_cac_detailed(cac_number TEXT, business_type TEXT DEFAULT 'limited')
RETURNS BOOLEAN AS $$
BEGIN
  CASE business_type
    WHEN 'limited' THEN
      -- Limited companies: RC followed by 6-7 digits
      RETURN cac_number ~ '^RC\s?[0-9]{6,7}$';
    WHEN 'business_name' THEN
      -- Business name: BN followed by 6-7 digits
      RETURN cac_number ~ '^BN\s?[0-9]{6,7}$';
    WHEN 'ngo' THEN
      -- NGO/NPO: IT followed by 6-7 digits
      RETURN cac_number ~ '^IT\s?[0-9]{6,7}$';
    ELSE
      -- Generic CAC format
      RETURN cac_number ~ '^(RC|BN|IT)\s?[0-9]{6,7}$';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 3) NIGERIAN PAYMENT AND BANKING INTEGRATION
-- ============================================

-- Nigerian bank codes for payment integration
CREATE TABLE IF NOT EXISTS public.nigerian_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL UNIQUE, -- Central Bank of Nigeria code
  swift_code TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  supports_transfers BOOLEAN NOT NULL DEFAULT true,
  supports_collections BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert major Nigerian banks
INSERT INTO public.nigerian_banks (bank_name, bank_code, swift_code, supports_transfers, supports_collections) VALUES
  ('Access Bank', '044', 'ACCANGNL', true, true),
  ('Citibank Nigeria', '023', 'CITINGNL', true, true),
  ('Ecobank Nigeria', '050', 'ECOCNGNL', true, true),
  ('Fidelity Bank', '070', 'FIDTNGNL', true, true),
  ('First Bank of Nigeria', '011', 'FBNINGNL', true, true),
  ('First City Monument Bank', '214', 'FCMBNGNL', true, true),
  ('Guaranty Trust Bank', '058', 'GTBINGNL', true, true),
  ('Heritage Banking Company', '030', 'HBCLNGNL', true, true),
  ('Keystone Bank', '082', 'KEYSTNGL', true, true),
  ('Polaris Bank', '076', 'POLRNGNL', true, true),
  ('Stanbic IBTC Bank', '221', 'ICITNGLA', true, true),
  ('Standard Chartered Bank', '068', 'SCBLNGNJ', true, true),
  ('Sterling Bank', '232', 'STERNGLA', true, true),
  ('Union Bank of Nigeria', '032', 'UNNGNGLA', true, true),
  ('United Bank For Africa', '033', 'UNAFNGNL', true, true),
  ('Unity Bank', '215', 'UNBNGNLA', true, true),
  ('Wema Bank', '035', 'WEMANGLA', true, true),
  ('Zenith Bank', '057', 'ZENINGNL', true, true),
  -- Digital banks and fintechs
  ('Kuda Bank', '90110', null, true, true),
  ('Opay', '999991', null, true, true),
  ('PalmPay', '999992', null, true, true),
  ('Carbon (Formerly Paylater)', '565', null, true, true)
ON CONFLICT (bank_code) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  swift_code = EXCLUDED.swift_code,
  supports_transfers = EXCLUDED.supports_transfers,
  supports_collections = EXCLUDED.supports_collections,
  active = EXCLUDED.active;

-- ============================================
-- 4) NIGERIAN BUSINESS HOURS AND HOLIDAYS
-- ============================================

-- Nigerian public holidays
CREATE TABLE IF NOT EXISTS public.nigerian_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  is_moveable BOOLEAN NOT NULL DEFAULT FALSE, -- Eid, Easter, etc.
  affects_business BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Nigerian public holidays (2025)
INSERT INTO public.nigerian_holidays (holiday_name, holiday_date, is_moveable, affects_business) VALUES
  ('New Year Day', '2025-01-01', false, true),
  ('Eid-ul-Fitr (estimated)', '2025-03-30', true, true),
  ('Eid-ul-Fitr (estimated)', '2025-03-31', true, true),
  ('Good Friday', '2025-04-18', true, true),
  ('Easter Monday', '2025-04-21', true, true),
  ('Workers Day', '2025-05-01', false, true),
  ('Children Day', '2025-05-27', false, false),
  ('Democracy Day', '2025-06-12', false, true),
  ('Eid-ul-Adha (estimated)', '2025-06-06', true, true),
  ('Eid-ul-Adha (estimated)', '2025-06-07', true, true),
  ('Independence Day', '2025-10-01', false, true),
  ('Christmas Day', '2025-12-25', false, true),
  ('Boxing Day', '2025-12-26', false, true);

-- Function to check if date is Nigerian business day
CREATE OR REPLACE FUNCTION is_nigerian_business_day(check_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if it's a weekend
  IF EXTRACT(DOW FROM check_date) IN (0, 6) THEN
    RETURN FALSE;
  END IF;

  -- Check if it's a public holiday
  IF EXISTS (
    SELECT 1 FROM public.nigerian_holidays
    WHERE holiday_date = check_date AND affects_business = true
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get next Nigerian business day
CREATE OR REPLACE FUNCTION next_nigerian_business_day(from_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
DECLARE
  next_date DATE := from_date + 1;
BEGIN
  WHILE NOT is_nigerian_business_day(next_date) LOOP
    next_date := next_date + 1;
  END LOOP;

  RETURN next_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 5) NIGERIAN PHONE AND COMMUNICATION FEATURES
-- ============================================

-- Nigerian telecom providers and their prefixes
CREATE TABLE IF NOT EXISTS public.nigerian_telecom_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  prefixes TEXT[] NOT NULL, -- Phone number prefixes
  supports_sms BOOLEAN NOT NULL DEFAULT true,
  supports_ussd BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Nigerian telecom providers
INSERT INTO public.nigerian_telecom_providers (provider_name, prefixes, supports_sms, supports_ussd) VALUES
  ('MTN Nigeria', ARRAY['0803', '0806', '0813', '0814', '0816', '0903', '0906', '0913', '0916'], true, true),
  ('Airtel Nigeria', ARRAY['0802', '0808', '0812', '0901', '0902', '0907', '0911', '0912'], true, true),
  ('Glo Mobile', ARRAY['0805', '0807', '0811', '0815', '0905', '0915'], true, true),
  ('9mobile', ARRAY['0809', '0817', '0818', '0908', '0909'], true, true);

-- Function to identify Nigerian telecom provider
CREATE OR REPLACE FUNCTION get_nigerian_telecom_provider(phone_number TEXT)
RETURNS TEXT AS $$
DECLARE
  clean_number TEXT;
  provider_record RECORD;
BEGIN
  -- Clean and normalize phone number
  clean_number := regexp_replace(phone_number, '[^0-9]', '', 'g');

  -- Handle different formats
  IF LENGTH(clean_number) = 13 AND clean_number LIKE '234%' THEN
    clean_number := '0' || SUBSTRING(clean_number FROM 4);
  ELSIF LENGTH(clean_number) = 10 THEN
    clean_number := '0' || clean_number;
  END IF;

  -- Find provider by prefix
  FOR provider_record IN
    SELECT provider_name, prefixes FROM public.nigerian_telecom_providers WHERE active = true
  LOOP
    FOR i IN 1..array_length(provider_record.prefixes, 1) LOOP
      IF clean_number LIKE provider_record.prefixes[i] || '%' THEN
        RETURN provider_record.provider_name;
      END IF;
    END LOOP;
  END LOOP;

  RETURN 'Unknown Provider';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 6) NIGERIAN MARKET DYNAMICS AND PRICING
-- ============================================

-- Function to calculate dynamic pricing based on Nigerian market conditions
CREATE OR REPLACE FUNCTION calculate_nigerian_market_price(
  category public.business_category,
  base_hours DECIMAL(5,1),
  user_location TEXT DEFAULT 'Lagos',
  urgency_level INTEGER DEFAULT 3
) RETURNS JSONB AS $$
DECLARE
  category_rate RECORD;
  location_multiplier DECIMAL(4,2) := 1.0;
  urgency_multiplier DECIMAL(4,2) := 1.0;
  seasonal_multiplier DECIMAL(4,2) := 1.0;
  current_month INTEGER;
  final_naira_rate DECIMAL(10,2);
  final_credits DECIMAL(8,2);
  result JSONB;
BEGIN
  -- Get category rates
  SELECT * INTO category_rate
  FROM public.nigerian_category_rates
  WHERE nigerian_category_rates.category = calculate_nigerian_market_price.category;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category rates not found for %', category;
  END IF;

  -- Location-based pricing
  CASE user_location
    WHEN 'Lagos' THEN location_multiplier := 1.3;  -- Premium for Lagos
    WHEN 'Abuja' THEN location_multiplier := 1.2;  -- High for capital
    WHEN 'Port Harcourt' THEN location_multiplier := 1.1;  -- Oil hub premium
    WHEN 'Kano' THEN location_multiplier := 1.0;   -- Commercial hub
    WHEN 'Ibadan' THEN location_multiplier := 0.9; -- Regional center
    ELSE location_multiplier := 0.8; -- Other locations
  END CASE;

  -- Urgency-based pricing
  CASE urgency_level
    WHEN 1 THEN urgency_multiplier := 2.0;  -- Urgent
    WHEN 2 THEN urgency_multiplier := 1.5;  -- High priority
    WHEN 3 THEN urgency_multiplier := 1.0;  -- Normal
    WHEN 4 THEN urgency_multiplier := 0.9;  -- Low priority
    WHEN 5 THEN urgency_multiplier := 0.8;  -- Very low priority
    ELSE urgency_multiplier := 1.0;
  END CASE;

  -- Seasonal pricing
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  IF current_month = ANY(category_rate.seasonal_peak_months) THEN
    seasonal_multiplier := 1.2;
  ELSE
    seasonal_multiplier := 1.0;
  END IF;

  -- Calculate final pricing
  final_naira_rate := category_rate.base_rate_naira *
                     category_rate.demand_multiplier *
                     location_multiplier *
                     urgency_multiplier *
                     seasonal_multiplier;

  final_credits := category_rate.base_credits_per_hour *
                  category_rate.demand_multiplier *
                  location_multiplier *
                  urgency_multiplier *
                  seasonal_multiplier;

  -- Build result
  result := jsonb_build_object(
    'category', category,
    'base_hours', base_hours,
    'total_naira', final_naira_rate * base_hours,
    'total_credits', final_credits * base_hours,
    'naira_per_hour', final_naira_rate,
    'credits_per_hour', final_credits,
    'multipliers', jsonb_build_object(
      'location', location_multiplier,
      'urgency', urgency_multiplier,
      'seasonal', seasonal_multiplier,
      'demand', category_rate.demand_multiplier
    ),
    'market_conditions', jsonb_build_object(
      'location', user_location,
      'urgency_level', urgency_level,
      'current_month', current_month,
      'is_peak_season', current_month = ANY(category_rate.seasonal_peak_months)
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 7) NIGERIAN BUSINESS MATCHING ALGORITHM
-- ============================================

-- Function to calculate Nigerian business compatibility score
CREATE OR REPLACE FUNCTION calculate_nigerian_business_compatibility(
  user1_id UUID,
  user2_id UUID,
  service1_id UUID DEFAULT NULL,
  service2_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  user1_profile RECORD;
  user2_profile RECORD;
  service1_info RECORD;
  service2_info RECORD;
  compatibility_score DECIMAL(5,2) := 0;
  score_breakdown JSONB := '{}';
  location_score DECIMAL(4,2) := 0;
  trust_score DECIMAL(4,2) := 0;
  category_score DECIMAL(4,2) := 0;
  verification_score DECIMAL(4,2) := 0;
  business_score DECIMAL(4,2) := 0;
  service1_found BOOLEAN := false;
  service2_found BOOLEAN := false;
BEGIN
  -- Get user profiles
  SELECT * INTO user1_profile FROM public.profiles WHERE id = user1_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile % not found', user1_id;
  END IF;

  SELECT * INTO user2_profile FROM public.profiles WHERE id = user2_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile % not found', user2_id;
  END IF;

  -- Get service information if provided
  IF service1_id IS NOT NULL THEN
    SELECT * INTO service1_info FROM public.services WHERE id = service1_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service % not found', service1_id;
    END IF;
    service1_found := true;
  END IF;

  IF service2_id IS NOT NULL THEN
    SELECT * INTO service2_info FROM public.services WHERE id = service2_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service % not found', service2_id;
    END IF;
    service2_found := true;
  END IF;

  -- Location compatibility (same state = high score)
  IF user1_profile.location IS NULL OR user2_profile.location IS NULL THEN
    location_score := 10.0;
  ELSIF user1_profile.location = user2_profile.location THEN
    location_score := 25.0;
  ELSIF user1_profile.location IN ('Lagos', 'Ogun') AND user2_profile.location IN ('Lagos', 'Ogun') THEN
    location_score := 20.0; -- Lagos-Ogun corridor
  ELSIF user1_profile.location = 'Abuja' AND user2_profile.location IN ('Niger', 'Nasarawa', 'Kogi') THEN
    location_score := 15.0; -- FCT and surrounding states
  ELSE
    location_score := 5.0; -- Different regions
  END IF;

  -- Trust and reputation compatibility
  trust_score := LEAST(user1_profile.trust_score, user2_profile.trust_score) * 0.2; -- Max 20 points

  -- Category business synergy
  IF service1_found AND service2_found THEN
    -- Check if categories commonly work together in Nigerian market
    CASE
      WHEN service1_info.category IN ('legal', 'accounting') AND service2_info.category IN ('legal', 'accounting', 'tech') THEN
        category_score := 20.0; -- Professional services synergy
      WHEN service1_info.category IN ('creative', 'marketing', 'photography') AND service2_info.category IN ('creative', 'marketing', 'photography', 'event_planning') THEN
        category_score := 18.0; -- Creative services synergy
      WHEN service1_info.category = 'tech' AND service2_info.category IN ('marketing', 'legal', 'creative') THEN
        category_score := 16.0; -- Tech integration synergy
      WHEN service1_info.category IN ('construction', 'generator_repair') AND service2_info.category IN ('construction', 'generator_repair', 'transportation') THEN
        category_score := 15.0; -- Infrastructure services synergy
      ELSE
        category_score := 8.0; -- General compatibility
    END CASE;
  ELSE
    category_score := 10.0; -- Default score without service info
  END IF;

  -- Verification level compatibility
  verification_score := 0;
  IF user1_profile.phone_verified AND user2_profile.phone_verified THEN
    verification_score := verification_score + 8.0;
  END IF;

  IF user1_profile.email_verified AND user2_profile.email_verified THEN
    verification_score := verification_score + 4.0;
  END IF;

  IF user1_profile.cac_verified AND user2_profile.cac_verified THEN
    verification_score := verification_score + 8.0; -- CAC important in Nigeria
  END IF;

  -- Nigerian business culture compatibility
  business_score := 0;

  -- Response time compatibility (Nigerian business expectations)
  IF user1_profile.average_response_hours IS NOT NULL
     AND user2_profile.average_response_hours IS NOT NULL
     AND ABS(user1_profile.average_response_hours - user2_profile.average_response_hours) <= 2 THEN -- Within 2 hours
    business_score := business_score + 5.0;
  END IF;

  -- Completion rate compatibility
  IF user1_profile.success_rate >= 80 AND user2_profile.success_rate >= 80 THEN
    business_score := business_score + 5.0;
  END IF;

  -- Calculate final score
  compatibility_score := location_score + trust_score + category_score + verification_score + business_score;

  -- Build score breakdown
  score_breakdown := jsonb_build_object(
    'total_score', compatibility_score,
    'location_compatibility', location_score,
    'trust_compatibility', trust_score,
    'category_synergy', category_score,
    'verification_level', verification_score,
    'business_culture', business_score,
    'recommendation_level',
      CASE
        WHEN compatibility_score >= 80 THEN 'Excellent Match'
        WHEN compatibility_score >= 65 THEN 'Good Match'
        WHEN compatibility_score >= 50 THEN 'Moderate Match'
        WHEN compatibility_score >= 35 THEN 'Fair Match'
        ELSE 'Poor Match'
      END
  );

  RETURN score_breakdown;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 8) NIGERIAN TAX AND COMPLIANCE FEATURES
-- ============================================

-- VAT calculation for Nigerian market (7.5%)
CREATE OR REPLACE FUNCTION calculate_nigerian_vat(amount DECIMAL(10,2))
RETURNS DECIMAL(10,2) AS $$
BEGIN
  RETURN ROUND(amount * 0.075, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Withholding tax calculation (varies by category)
CREATE OR REPLACE FUNCTION calculate_nigerian_wht(
  amount DECIMAL(10,2),
  service_category public.business_category
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  wht_rate DECIMAL(4,3);
BEGIN
  -- Withholding tax rates in Nigeria
  CASE service_category
    WHEN 'legal' THEN wht_rate := 0.100; -- 10% for professional services
    WHEN 'accounting' THEN wht_rate := 0.100; -- 10% for professional services
    WHEN 'healthcare' THEN wht_rate := 0.050; -- 5% for medical services
    WHEN 'construction' THEN wht_rate := 0.025; -- 2.5% for construction
    WHEN 'tech' THEN wht_rate := 0.100; -- 10% for technical services
    WHEN 'transportation' THEN wht_rate := 0.025; -- 2.5% for haulage/transport
    ELSE wht_rate := 0.050; -- 5% default for other services
  END CASE;

  RETURN ROUND(amount * wht_rate, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 9) NIGERIAN CULTURAL AND BUSINESS ETIQUETTE
-- ============================================

-- Table for Nigerian business etiquette tips and cultural context
CREATE TABLE IF NOT EXISTS public.nigerian_business_etiquette (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.business_category NOT NULL,
  tip_title TEXT NOT NULL,
  tip_description TEXT NOT NULL,
  importance_level INTEGER NOT NULL DEFAULT 3 CHECK (importance_level BETWEEN 1 AND 5),
  applies_to_regions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Nigerian business etiquette tips
INSERT INTO public.nigerian_business_etiquette (category, tip_title, tip_description, importance_level, applies_to_regions) VALUES
  ('legal', 'Formal Communication', 'Always use formal titles (Barrister, SAN) when addressing legal professionals in Nigeria', 5, ARRAY['Lagos', 'Abuja']),
  ('legal', 'Documentation Standards', 'Ensure all legal documents comply with Nigerian law and include proper stamps where required', 5, ARRAY['Lagos', 'Abuja', 'Rivers']),

  ('tech', 'Power Backup Planning', 'Always have backup power solutions and account for potential electricity issues in project timelines', 4, ARRAY['Lagos', 'Abuja', 'Kano']),
  ('tech', 'Local Payment Methods', 'Understand Nigerian fintech solutions like Paystack, Flutterwave for payment integration', 4, ARRAY['Lagos', 'Ogun']),

  ('creative', 'Cultural Sensitivity', 'Be aware of religious and cultural sensitivities when creating content for Nigerian audiences', 5, ARRAY['Kano', 'Kaduna', 'Sokoto']),
  ('creative', 'Local Language Integration', 'Consider incorporating Pidgin English or local languages to connect with broader audiences', 3, ARRAY['Lagos', 'Rivers', 'Delta']),

  ('marketing', 'Multi-Language Campaigns', 'Consider Hausa, Yoruba, and Igbo languages for campaigns targeting specific regions', 4, ARRAY['Kano', 'Lagos', 'Anambra']),
  ('marketing', 'Religious Considerations', 'Schedule campaigns considering Islamic and Christian holidays and practices', 5, ARRAY['Kano', 'Lagos', 'Abuja']),

  ('accounting', 'IFRS Compliance', 'Ensure compliance with International Financial Reporting Standards as adopted in Nigeria', 5, ARRAY['Lagos', 'Abuja']),
  ('accounting', 'Tax Obligations', 'Understand FIRS requirements and state tax obligations for businesses', 5, ARRAY['Lagos', 'Abuja', 'Rivers']),

  ('fashion', 'Seasonal Trends', 'Account for harmattan season and rainy season when planning fashion collections', 3, ARRAY['Kano', 'Lagos', 'Ogun']),
  ('fashion', 'Cultural Attire', 'Understand the significance of traditional attire like Agbada, Kaftan, and George wrapper', 4, ARRAY['Lagos', 'Kano', 'Anambra']),

  ('event_planning', 'Venue Logistics', 'Plan for Lagos traffic and provide multiple transportation options for guests', 5, ARRAY['Lagos', 'Ogun']),
  ('event_planning', 'Cultural Events', 'Understand traditional wedding ceremonies, naming ceremonies, and funeral rites', 4, ARRAY['Lagos', 'Oyo', 'Anambra']),

  ('generator_repair', 'Brand Specialization', 'Specialize in popular generator brands like Mikano, Perkins, FG Wilson common in Nigeria', 4, ARRAY['Lagos', 'Abuja', 'Rivers']),
  ('generator_repair', 'Emergency Response', 'Offer 24/7 emergency services as generators are critical for business continuity', 5, ARRAY['Lagos', 'Kano', 'Rivers'])
ON CONFLICT DO NOTHING;

-- Function to get relevant business etiquette tips
CREATE OR REPLACE FUNCTION get_business_etiquette_tips(
  service_category public.business_category,
  user_location TEXT DEFAULT 'Lagos'
) RETURNS TABLE(
  tip_title TEXT,
  tip_description TEXT,
  importance_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.tip_title,
    e.tip_description,
    e.importance_level
  FROM public.nigerian_business_etiquette e
  WHERE e.category = service_category
    AND (e.applies_to_regions IS NULL OR user_location = ANY(e.applies_to_regions))
  ORDER BY e.importance_level DESC, e.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 10) PERFORMANCE AND MONITORING
-- ============================================

-- View for Nigerian market analytics
CREATE OR REPLACE VIEW public.nigerian_market_analytics AS
SELECT
  ncr.category,
  ncr.base_rate_naira,
  ncr.demand_multiplier,
  COUNT(s.id) as active_services,
  AVG(s.base_hourly_rate) as avg_market_rate,
  COUNT(DISTINCT s.user_id) as active_providers,
  COUNT(t.id) as total_trades,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trades,
  ROUND(
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0 /
    NULLIF(COUNT(t.id), 0), 2
  ) as completion_rate_percent
FROM public.nigerian_category_rates ncr
LEFT JOIN public.services s ON s.category = ncr.category AND s.is_available = true
LEFT JOIN public.trades t ON (t.proposer_service_id = s.id OR t.provider_service_id = s.id)
GROUP BY ncr.category, ncr.base_rate_naira, ncr.demand_multiplier
ORDER BY active_services DESC, total_trades DESC;

-- Grant access to analytics view
GRANT SELECT ON public.nigerian_market_analytics TO authenticated;

-- Create indexes for Nigerian-specific queries
CREATE INDEX IF NOT EXISTS idx_profiles_nigerian_location
  ON public.profiles (location, phone_verified, trust_score DESC)
  WHERE is_onboarded = true;

CREATE INDEX IF NOT EXISTS idx_services_nigerian_market
  ON public.services (category, base_hourly_rate, credits_per_hour)
  WHERE is_available = true;

-- Update statistics for Nigerian market queries
ANALYZE public.nigerian_category_rates;
ANALYZE public.nigerian_banks;
ANALYZE public.nigerian_holidays;
