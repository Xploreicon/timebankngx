-- ============================================================================
-- HANDLE NEW USER METADATA MIGRATION
-- Extends profile bootstrap to capture category, location, phone, and needs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  default_display_name TEXT;
  requested_category TEXT;
  requested_location TEXT;
  requested_phone TEXT;
  requested_needs TEXT[];
  valid_categories TEXT[];
BEGIN
  -- Determine default display name
  default_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  requested_category := LOWER(COALESCE(NEW.raw_user_meta_data->>'primary_category', ''));
  requested_location := NULLIF(COALESCE(NEW.raw_user_meta_data->>'location', ''), '');
  requested_phone := NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '');

  -- Collect and normalise user declared needs
  requested_needs := ARRAY(
    SELECT LOWER(value)
    FROM json_array_elements_text(COALESCE(NEW.raw_user_meta_data->'needs', '[]'::json)) AS value
    WHERE value IS NOT NULL AND value <> ''
  );

  requested_needs := COALESCE(requested_needs, ARRAY[]::TEXT[]);

  valid_categories := ARRAY(
    SELECT enumlabel::TEXT
    FROM pg_enum
    WHERE enumtypid = 'public.business_category'::regtype
  );

  IF requested_category = '' OR NOT (requested_category = ANY (valid_categories)) THEN
    requested_category := NULL;
  END IF;

  requested_needs := ARRAY(
    SELECT n
    FROM unnest(requested_needs) AS n
    WHERE n = ANY (valid_categories)
  );

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    email_verified,
    phone,
    location,
    category,
    needs
  ) VALUES (
    NEW.id,
    NEW.email,
    default_display_name,
    NEW.email_confirmed_at IS NOT NULL,
    requested_phone,
    requested_location,
    CASE
      WHEN requested_category IS NOT NULL THEN requested_category::public.business_category
      ELSE NULL
    END,
    requested_needs
  );

  -- Seed welcome credits
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_before,
    balance_after
  ) VALUES (
    NEW.id,
    10.00,
    'bonus',
    'Welcome to TimeBank Nigeria! Bonus credits for new users',
    0.00,
    10.00
  );

  UPDATE public.profiles
  SET
    total_credits = 10.00,
    available_credits = 10.00
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

