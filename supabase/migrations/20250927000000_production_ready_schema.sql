-- ============================================
-- TIMEBANK PRODUCTION READY SCHEMA
-- Consolidated migration for Nigerian Time Banking Platform
-- Replaces all previous migrations with authoritative schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================
-- 1) UTILITY FUNCTIONS
-- ============================================

-- Function to automatically update updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate Nigerian phone numbers
CREATE OR REPLACE FUNCTION public.validate_nigerian_phone(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Nigerian phone format: +234XXXXXXXXX or 0XXXXXXXXXX (11 digits total after +234 or 0)
  RETURN phone_number ~ '^(\+234[7-9][0-9]{9}|0[7-9][0-9]{9})$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate email format
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 2) ENUMS (BUSINESS TYPES)
-- ============================================

-- Trade lifecycle status
DO $$ BEGIN
  CREATE TYPE public.trade_status AS ENUM (
    'pending',      -- Initial proposal
    'negotiating',  -- Counter-offers being exchanged
    'accepted',     -- Terms agreed, work can start
    'active',       -- Work in progress
    'completed',    -- Successfully finished
    'disputed',     -- Under dispute resolution
    'cancelled'     -- Cancelled by either party
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Skill proficiency levels
DO $$ BEGIN
  CREATE TYPE public.skill_level AS ENUM ('Beginner', 'Intermediate', 'Expert');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Dispute resolution status
DO $$ BEGIN
  CREATE TYPE public.dispute_status AS ENUM ('open', 'investigating', 'resolved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Achievement categories for gamification
DO $$ BEGIN
  CREATE TYPE public.achievement_key AS ENUM (
    'first_trade',        -- Completed first trade
    'trusted_trader',     -- High trust score achieved
    'loop_master',        -- Completed 10+ trades
    'time_millionaire',   -- Earned 1000+ credits
    'community_builder',  -- Referred 10+ users
    'quick_responder',    -- Fast response time
    'reliable_provider'   -- High completion rate
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Credit transaction types
DO $$ BEGIN
  CREATE TYPE public.credit_transaction_type AS ENUM (
    'earned',         -- Credits earned from completed work
    'spent',          -- Credits spent on received services
    'bonus',          -- System bonuses (referrals, achievements)
    'penalty',        -- Penalties for violations
    'refund',         -- Refunded credits from cancelled trades
    'escrow_hold',    -- Credits held in escrow
    'escrow_release'  -- Credits released from escrow
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Nigerian business categories (expanded from our services)
DO $$ BEGIN
  CREATE TYPE public.business_category AS ENUM (
    'legal',              -- Legal services, CAC registration
    'tech',               -- Software development, IT support
    'creative',           -- Design, content creation
    'accounting',         -- Bookkeeping, financial services
    'marketing',          -- Social media, advertising
    'photography',        -- Event, product photography
    'fashion',            -- Tailoring, fashion design
    'food',               -- Catering, cooking services
    'event_planning',     -- Event coordination, planning
    'construction',       -- Building, renovation
    'transportation',     -- Delivery, logistics
    'education',          -- Tutoring, training
    'healthcare',         -- Medical, wellness services
    'agriculture',        -- Farming, food production
    'beauty_wellness',    -- Hair, makeup, spa services
    'generator_repair',   -- Equipment maintenance
    'cleaning',           -- Cleaning, maintenance services
    'consulting'          -- Business consulting, advisory
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3) USER PROFILES (CORE USER DATA)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  email TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  business_name TEXT DEFAULT '',
  phone TEXT,

  -- Location & Category
  location TEXT,
  state TEXT, -- Nigerian states
  category public.business_category,

  -- Trust & Verification System
  trust_score INTEGER NOT NULL DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  total_credits DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_credits >= 0),
  available_credits DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (available_credits >= 0),

  -- Verification Status
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  cac_verified BOOLEAN NOT NULL DEFAULT FALSE,
  bank_verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Profile Completion
  is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  profile_completion_score INTEGER NOT NULL DEFAULT 0 CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),

  -- Media
  avatar_url TEXT,
  bio TEXT CHECK (LENGTH(bio) <= 500),

  -- Business Metrics
  total_trades_completed INTEGER NOT NULL DEFAULT 0 CHECK (total_trades_completed >= 0),
  success_rate DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 100),
  average_response_hours DECIMAL(6,2) DEFAULT NULL CHECK (average_response_hours >= 0),
  average_rating DECIMAL(3,2) DEFAULT NULL CHECK (average_rating >= 1 AND average_rating <= 5),

  -- Nigerian Business Info
  cac_registration_number TEXT,
  bank_account_name TEXT,

  -- Social Links
  whatsapp_number TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,

  -- System Fields
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT phone_format CHECK (phone IS NULL OR validate_nigerian_phone(phone)),
  CONSTRAINT email_format CHECK (email IS NULL OR validate_email(email)),
  CONSTRAINT whatsapp_format CHECK (whatsapp_number IS NULL OR validate_nigerian_phone(whatsapp_number)),
  CONSTRAINT credits_consistency CHECK (available_credits <= total_credits)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No delete policy - profiles should be soft-deleted via a flag if needed

-- ============================================
-- 4) SERVICES (WHAT USERS OFFER)
-- ============================================

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Service Details
  title TEXT NOT NULL CHECK (LENGTH(title) BETWEEN 10 AND 100),
  description TEXT NOT NULL CHECK (LENGTH(description) BETWEEN 20 AND 2000),
  category public.business_category NOT NULL,
  subcategory TEXT,

  -- Pricing & Availability
  base_hourly_rate DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (base_hourly_rate >= 0),
  credits_per_hour DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (credits_per_hour >= 0),
  minimum_hours DECIMAL(4,1) NOT NULL DEFAULT 1 CHECK (minimum_hours > 0 AND minimum_hours <= 40),
  maximum_hours DECIMAL(4,1) NOT NULL DEFAULT 8 CHECK (maximum_hours >= minimum_hours AND maximum_hours <= 40),

  -- Service Quality
  skill_level public.skill_level NOT NULL DEFAULT 'Intermediate',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,

  -- Portfolio & Media
  portfolio_images TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Performance Metrics
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  inquiry_count INTEGER NOT NULL DEFAULT 0 CHECK (inquiry_count >= 0),
  completed_orders INTEGER NOT NULL DEFAULT 0 CHECK (completed_orders >= 0),
  average_rating DECIMAL(3,2) CHECK (average_rating >= 1 AND average_rating <= 5),

  -- Nigerian Business Context
  requires_cac_verification BOOLEAN NOT NULL DEFAULT FALSE,
  serves_remote BOOLEAN NOT NULL DEFAULT TRUE,
  serves_onsite BOOLEAN NOT NULL DEFAULT FALSE,
  coverage_areas TEXT[], -- Nigerian states/cities served

  -- System Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_hour_range CHECK (maximum_hours >= minimum_hours),
  CONSTRAINT valid_tags CHECK (array_length(tags, 1) <= 20),
  CONSTRAINT valid_coverage CHECK (array_length(coverage_areas, 1) <= 37) -- 36 states + FCT
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Services policies
CREATE POLICY "Services are viewable by everyone"
  ON public.services FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own services"
  ON public.services FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5) TRADES (TIME EXCHANGE TRANSACTIONS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Trade Participants
  proposer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Services Being Exchanged
  proposer_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  provider_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,

  -- Exchange Terms
  proposer_hours DECIMAL(5,1) NOT NULL CHECK (proposer_hours > 0 AND proposer_hours <= 40),
  provider_hours DECIMAL(5,1) NOT NULL CHECK (provider_hours > 0 AND provider_hours <= 40),
  proposer_credits DECIMAL(10,2) NOT NULL CHECK (proposer_credits >= 0),
  provider_credits DECIMAL(10,2) NOT NULL CHECK (provider_credits >= 0),
  exchange_rate DECIMAL(8,4) NOT NULL CHECK (exchange_rate > 0),

  -- Trade Details
  title TEXT NOT NULL CHECK (LENGTH(title) BETWEEN 10 AND 200),
  description TEXT CHECK (LENGTH(description) <= 1000),
  delivery_deadline TIMESTAMPTZ,
  terms_and_conditions TEXT,

  -- Status & Lifecycle
  status public.trade_status NOT NULL DEFAULT 'pending',
  priority_level INTEGER NOT NULL DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5), -- 1=urgent, 5=low

  -- Financial
  escrow_credits DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (escrow_credits >= 0),

  -- Completion & Review
  proposer_completion_confirmed BOOLEAN DEFAULT FALSE,
  provider_completion_confirmed BOOLEAN DEFAULT FALSE,
  proposer_rating INTEGER CHECK (proposer_rating BETWEEN 1 AND 5),
  provider_rating INTEGER CHECK (provider_rating BETWEEN 1 AND 5),
  proposer_review TEXT CHECK (LENGTH(proposer_review) <= 500),
  provider_review TEXT CHECK (LENGTH(provider_review) <= 500),

  -- Nigerian Business Context
  requires_physical_meetup BOOLEAN NOT NULL DEFAULT FALSE,
  meetup_location TEXT,
  preferred_communication_method TEXT DEFAULT 'whatsapp',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT different_users CHECK (proposer_id != provider_id),
  CONSTRAINT valid_completion_status CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  ),
  CONSTRAINT valid_cancellation_status CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL) OR
    (status != 'cancelled' AND cancelled_at IS NULL)
  ),
  CONSTRAINT valid_credits_calculation CHECK (
    provider_credits = 0
    OR ABS((proposer_credits / NULLIF(provider_credits, 0)) - exchange_rate) < 0.01
  )
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Trades policies
CREATE POLICY "Participants can view their trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = proposer_id OR auth.uid() = provider_id);

CREATE POLICY "Users can create trade proposals"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY "Participants can update their trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = proposer_id OR auth.uid() = provider_id)
  WITH CHECK (auth.uid() = proposer_id OR auth.uid() = provider_id);

-- No delete policy - trades should never be deleted for audit purposes

-- ============================================
-- 6) CREDIT TRANSACTIONS (FINANCIAL LEDGER)
-- ============================================

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction Participants
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  counterparty_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Transaction Details
  amount DECIMAL(10,2) NOT NULL CHECK (amount != 0), -- Can be negative for debits
  transaction_type public.credit_transaction_type NOT NULL,
  description TEXT NOT NULL CHECK (LENGTH(description) BETWEEN 5 AND 200),
  reference_number TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid(),

  -- Related Records
  trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,

  -- Account Balances (snapshot at transaction time)
  balance_before DECIMAL(10,2) NOT NULL CHECK (balance_before >= 0),
  balance_after DECIMAL(10,2) NOT NULL CHECK (balance_after >= 0),

  -- Nigerian Business Context
  naira_equivalent DECIMAL(12,2) CHECK (naira_equivalent >= 0),
  exchange_rate_to_naira DECIMAL(8,2), -- NGN per credit at time of transaction

  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,

  -- System Metadata
  ip_address INET,
  user_agent TEXT,

  -- Constraints
  CONSTRAINT valid_balance_change CHECK (
    (amount > 0 AND balance_after = balance_before + amount) OR
    (amount < 0 AND balance_after = balance_before + amount AND balance_after >= 0)
  ),
  CONSTRAINT reversal_consistency CHECK (
    (reversed_at IS NULL AND reversal_reason IS NULL) OR
    (reversed_at IS NOT NULL AND reversal_reason IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Credit transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies - all transactions should go through service functions

-- ============================================
-- 7) TRADE MESSAGES (COMMUNICATION)
-- ============================================

CREATE TABLE IF NOT EXISTS public.trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Message Context
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Message Content
  message_text TEXT NOT NULL CHECK (LENGTH(message_text) BETWEEN 1 AND 2000),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),

  -- Attachments
  attachment_urls TEXT[] DEFAULT '{}',

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_system_message BOOLEAN NOT NULL DEFAULT FALSE,

  -- Nigerian Context
  is_whatsapp_forwarded BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_attachments CHECK (array_length(attachment_urls, 1) <= 5)
);

-- Enable RLS
ALTER TABLE public.trade_messages ENABLE ROW LEVEL SECURITY;

-- Trade messages policies
CREATE POLICY "Trade participants can view messages"
  ON public.trade_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id
      AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

CREATE POLICY "Trade participants can send messages"
  ON public.trade_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id
      AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

CREATE POLICY "Senders can update their messages"
  ON public.trade_messages FOR UPDATE
  USING (auth.uid() = sender_id AND is_system_message = FALSE)
  WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- 8) AUTOMATIC PROFILE CREATION ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  default_display_name TEXT;
BEGIN
  -- Generate display name from email
  default_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Create profile with verified email status
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    email_verified
  ) VALUES (
    NEW.id,
    NEW.email,
    default_display_name,
    NEW.email_confirmed_at IS NOT NULL
  );

  -- Give new user welcome credits
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

  -- Update profile with new credit balance
  UPDATE public.profiles
  SET
    total_credits = 10.00,
    available_credits = 10.00
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup process
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 9) PERFORMANCE INDEXES
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_category ON public.profiles(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON public.profiles(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON public.profiles(phone_verified, email_verified, cac_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active_at DESC);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_user_available ON public.services(user_id, is_available);
CREATE INDEX IF NOT EXISTS idx_services_category_available ON public.services(category, is_available);
CREATE INDEX IF NOT EXISTS idx_services_rating ON public.services(average_rating DESC) WHERE average_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_search ON public.services USING gin(to_tsvector('english', title || ' ' || description));

-- Trades indexes
CREATE INDEX IF NOT EXISTS idx_trades_proposer_status ON public.trades(proposer_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_provider_status ON public.trades(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_status_created ON public.trades(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_deadline ON public.trades(delivery_deadline) WHERE delivery_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_completion ON public.trades(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Credit transactions indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_date ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_trade ON public.credit_transactions(trade_id) WHERE trade_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON public.credit_transactions(reference_number);

-- Trade messages indexes
CREATE INDEX IF NOT EXISTS idx_trade_messages_trade_created ON public.trade_messages(trade_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trade_messages_sender ON public.trade_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_messages_unread ON public.trade_messages(trade_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- 10) UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 11) STORAGE BUCKETS FOR FILE UPLOADS
-- ============================================

-- Avatar images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Service portfolio images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolio', 'portfolio', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Trade attachments (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('trade-attachments', 'trade-attachments', false, 52428800,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];

-- CAC verification documents (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cac-documents', 'cac-documents', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- ============================================
-- 12) STORAGE POLICIES
-- ============================================

-- Avatar storage policies
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Portfolio storage policies
CREATE POLICY "Anyone can view portfolio images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio');

CREATE POLICY "Users can manage their portfolio images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'portfolio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'portfolio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trade attachments policies
CREATE POLICY "Trade participants can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'trade-attachments' AND
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

CREATE POLICY "Trade participants can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trade-attachments' AND
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

-- CAC documents policies (user's own documents only)
CREATE POLICY "Users can manage their CAC documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'cac-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'cac-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 13) GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.services TO authenticated;
GRANT ALL ON public.trades TO authenticated;
GRANT ALL ON public.trade_messages TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- 14) COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.profiles IS 'User profiles with Nigerian business context and verification system';
COMMENT ON TABLE public.services IS 'Services offered by users in Nigerian business categories';
COMMENT ON TABLE public.trades IS 'Time-based trade transactions between users';
COMMENT ON TABLE public.credit_transactions IS 'Financial ledger for all credit movements with audit trail';
COMMENT ON TABLE public.trade_messages IS 'Communication channel for trade participants';

COMMENT ON COLUMN public.profiles.trust_score IS 'Trust score from 0-100 based on completed trades and reviews';
COMMENT ON COLUMN public.profiles.cac_verified IS 'Whether business is verified with Corporate Affairs Commission';
COMMENT ON COLUMN public.credit_transactions.naira_equivalent IS 'NGN equivalent value at time of transaction';

-- Migration complete
SELECT 'TimeBank Nigeria production schema migration completed successfully' AS status;
