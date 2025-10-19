-- ============================================
-- ADDITIONAL PRODUCTION TABLES
-- Missing tables for complete time banking functionality
-- ============================================

-- ============================================
-- 1) TIME LOGS (WORK TRACKING)
-- ============================================

CREATE TABLE IF NOT EXISTS public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Work Session Details
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Time Tracking
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER CHECK (duration_minutes > 0),

  -- Work Details
  work_description TEXT CHECK (LENGTH(work_description) BETWEEN 5 AND 500),
  progress_notes TEXT,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Evidence & Deliverables
  deliverable_urls TEXT[] DEFAULT '{}',
  screenshot_urls TEXT[] DEFAULT '{}',

  -- Status
  is_approved BOOLEAN DEFAULT NULL, -- NULL=pending, TRUE=approved, FALSE=rejected
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Nigerian Context
  location_worked TEXT, -- Where the work was performed
  requires_physical_presence BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_end_time CHECK (ended_at IS NULL OR ended_at > started_at),
  CONSTRAINT valid_duration CHECK (
    (ended_at IS NULL AND duration_minutes IS NULL) OR
    (
      ended_at IS NOT NULL
      AND duration_minutes = ROUND(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0)::INTEGER
    )
  ),
  CONSTRAINT valid_approval CHECK (
    (is_approved IS NULL AND approved_by IS NULL AND approved_at IS NULL) OR
    (is_approved IS NOT NULL AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Time logs policies
CREATE POLICY "Trade participants can view time logs"
  ON public.time_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

CREATE POLICY "Users can create their own time logs"
  ON public.time_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

CREATE POLICY "Users can update their own time logs"
  ON public.time_logs FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = approved_by)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = approved_by);

-- ============================================
-- 2) REFERRALS (USER ACQUISITION)
-- ============================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referrer Information
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,

  -- Referral Details
  referred_email TEXT NOT NULL CHECK (validate_email(referred_email)),
  referred_phone TEXT CHECK (validate_nigerian_phone(referred_phone)),
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Status Tracking
  invitation_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_signed_up_at TIMESTAMPTZ,
  user_onboarded_at TIMESTAMPTZ,
  first_trade_completed_at TIMESTAMPTZ,

  -- Rewards
  credits_earned DECIMAL(8,2) DEFAULT 0 CHECK (credits_earned >= 0),
  bonus_tier TEXT DEFAULT 'standard' CHECK (bonus_tier IN ('standard', 'silver', 'gold', 'platinum')),

  -- Nigerian Context
  referral_method TEXT DEFAULT 'whatsapp' CHECK (referral_method IN ('whatsapp', 'sms', 'email', 'social', 'direct')),
  referrer_relationship TEXT CHECK (referrer_relationship IN ('friend', 'family', 'colleague', 'business_partner', 'other')),

  -- System Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_user_id),
  CONSTRAINT valid_progression CHECK (
    (user_signed_up_at IS NULL OR user_signed_up_at >= invitation_sent_at) AND
    (user_onboarded_at IS NULL OR user_onboarded_at >= user_signed_up_at) AND
    (first_trade_completed_at IS NULL OR first_trade_completed_at >= user_onboarded_at)
  )
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referrals policies
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update their referrals"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = referrer_id)
  WITH CHECK (auth.uid() = referrer_id);

-- ============================================
-- 3) NOTIFICATIONS (SYSTEM COMMUNICATIONS)
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'trade_proposal',     -- New trade proposal received
    'trade_accepted',     -- Trade proposal accepted
    'trade_started',      -- Trade work has begun
    'trade_completed',    -- Trade marked as completed
    'message_received',   -- New trade message
    'payment_received',   -- Credits received
    'review_received',    -- New review received
    'achievement_earned', -- New achievement unlocked
    'system_announcement', -- Platform announcements
    'verification_status', -- Verification updates
    'reminder',           -- Deadline reminders
    'dispute_opened',     -- Dispute initiated
    'referral_bonus'      -- Referral rewards
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Notification Content
  type public.notification_type NOT NULL,
  title TEXT NOT NULL CHECK (LENGTH(title) BETWEEN 5 AND 100),
  message TEXT NOT NULL CHECK (LENGTH(message) BETWEEN 10 AND 500),
  priority public.notification_priority NOT NULL DEFAULT 'medium',

  -- Related Records
  trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Status & Actions
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT, -- Deep link for action
  action_label TEXT, -- Button text for action

  -- Delivery Channels
  sent_via_email BOOLEAN DEFAULT FALSE,
  sent_via_sms BOOLEAN DEFAULT FALSE,
  sent_via_whatsapp BOOLEAN DEFAULT FALSE,
  sent_via_push BOOLEAN DEFAULT FALSE,

  -- Nigerian Context
  should_send_whatsapp BOOLEAN DEFAULT TRUE,
  whatsapp_template_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT notification_not_expired CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notification status"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can create notifications (via service role)
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- 4) REVIEWS & RATINGS
-- ============================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Review Context
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,

  -- Rating & Review
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  timeliness_rating INTEGER CHECK (timeliness_rating BETWEEN 1 AND 5),
  professionalism_rating INTEGER CHECK (professionalism_rating BETWEEN 1 AND 5),

  -- Written Review
  review_title TEXT CHECK (LENGTH(review_title) BETWEEN 5 AND 100),
  review_text TEXT CHECK (LENGTH(review_text) BETWEEN 10 AND 1000),

  -- Nigerian Context
  would_recommend BOOLEAN NOT NULL DEFAULT TRUE,
  work_location TEXT, -- Where the work was performed
  language_used TEXT DEFAULT 'english', -- Language of communication

  -- Moderation
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  moderation_notes TEXT,

  -- Response from Reviewee
  response_text TEXT CHECK (LENGTH(response_text) <= 500),
  response_date TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT different_reviewer_reviewee CHECK (reviewer_id != reviewee_id),
  CONSTRAINT one_review_per_user_per_trade UNIQUE (trade_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Anyone can view public reviews"
  ON public.reviews FOR SELECT
  USING (NOT is_flagged);

CREATE POLICY "Trade participants can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id
      AND t.status = 'completed'
      AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

CREATE POLICY "Reviewers can update their reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id)
  WITH CHECK (auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

-- ============================================
-- 5) ACHIEVEMENTS & GAMIFICATION
-- ============================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Achievement Details
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key public.achievement_key NOT NULL,

  -- Achievement Level
  level TEXT NOT NULL DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'platinum')),
  points_earned INTEGER NOT NULL DEFAULT 0 CHECK (points_earned >= 0),

  -- Nigerian Context
  naira_value DECIMAL(10,2) CHECK (naira_value >= 0), -- Equivalent value in naira

  -- Metadata
  progress_data JSONB DEFAULT '{}', -- Store progress metrics
  evidence_data JSONB DEFAULT '{}', -- Supporting data for achievement

  -- Timestamps
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Some achievements might expire

  -- Social Features
  is_public BOOLEAN DEFAULT TRUE,
  celebration_shared BOOLEAN DEFAULT FALSE,

  -- Constraints
  CONSTRAINT unique_achievement_per_user UNIQUE (user_id, achievement_key)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Achievements policies
CREATE POLICY "Public achievements are viewable by everyone"
  ON public.achievements FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view all their achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their achievement visibility"
  ON public.achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System creates achievements (via triggers and service functions)

-- ============================================
-- 6) DISPUTES & RESOLUTION
-- ============================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dispute Context
  trade_id UUID NOT NULL UNIQUE REFERENCES public.trades(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Dispute Details
  dispute_type TEXT NOT NULL CHECK (dispute_type IN (
    'quality_issues', 'deadline_missed', 'payment_dispute',
    'communication_problems', 'scope_changes', 'unprofessional_behavior',
    'work_not_delivered', 'requirements_unclear', 'other'
  )),
  title TEXT NOT NULL CHECK (LENGTH(title) BETWEEN 10 AND 200),
  description TEXT NOT NULL CHECK (LENGTH(description) BETWEEN 50 AND 2000),

  -- Evidence
  evidence_files TEXT[] DEFAULT '{}',
  evidence_description TEXT,

  -- Resolution Process
  status public.dispute_status NOT NULL DEFAULT 'open',
  mediator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolution_decision TEXT,

  -- Financial Impact
  credits_in_dispute DECIMAL(10,2) DEFAULT 0 CHECK (credits_in_dispute >= 0),
  resolution_credits_proposer DECIMAL(10,2) DEFAULT 0,
  resolution_credits_provider DECIMAL(10,2) DEFAULT 0,

  -- Nigerian Context
  preferred_resolution_method TEXT DEFAULT 'mediation' CHECK (
    preferred_resolution_method IN ('mediation', 'arbitration', 'direct_negotiation')
  ),
  involves_physical_work BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT resolution_consistency CHECK (
    (status IN ('resolved') AND resolved_at IS NOT NULL AND resolution_decision IS NOT NULL) OR
    (status NOT IN ('resolved'))
  )
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Disputes policies
CREATE POLICY "Trade participants and mediators can view disputes"
  ON public.disputes FOR SELECT
  USING (
    auth.uid() = reporter_id OR
    auth.uid() = mediator_id OR
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

CREATE POLICY "Trade participants can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id AND
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id
      AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
      AND t.status IN ('active', 'completed')
    )
  );

CREATE POLICY "Participants and mediators can update disputes"
  ON public.disputes FOR UPDATE
  USING (
    auth.uid() = reporter_id OR
    auth.uid() = mediator_id OR
    EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id AND (auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

-- ============================================
-- 7) PERFORMANCE INDEXES FOR NEW TABLES
-- ============================================

-- Time logs indexes
CREATE INDEX IF NOT EXISTS idx_time_logs_trade_user ON public.time_logs(trade_id, user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_date ON public.time_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_logs_approval_pending ON public.time_logs(is_approved, created_at) WHERE is_approved IS NULL;

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_email ON public.referrals(referred_email);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(user_signed_up_at, user_onboarded_at) WHERE user_signed_up_at IS NOT NULL;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_date ON public.notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_trade ON public.notifications(trade_id) WHERE trade_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_expiry ON public.notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_rating ON public.reviews(reviewee_id, overall_rating DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_trade ON public.reviews(trade_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service ON public.reviews(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON public.reviews(is_featured, created_at DESC) WHERE is_featured = true;

-- Achievements indexes
CREATE INDEX IF NOT EXISTS idx_achievements_user_date ON public.achievements(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_public ON public.achievements(is_public, unlocked_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_achievements_key_level ON public.achievements(achievement_key, level);

-- Disputes indexes
CREATE INDEX IF NOT EXISTS idx_disputes_trade ON public.disputes(trade_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reporter ON public.disputes(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_status_date ON public.disputes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_mediator ON public.disputes(mediator_id) WHERE mediator_id IS NOT NULL;

-- ============================================
-- 8) UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================

CREATE TRIGGER time_logs_updated_at
  BEFORE UPDATE ON public.time_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 9) ADDITIONAL STORAGE BUCKET FOR EVIDENCE
-- ============================================

-- Dispute evidence files (private, larger size limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dispute-evidence', 'dispute-evidence', false, 104857600,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'video/mp4'];

-- Dispute evidence storage policies
CREATE POLICY "Dispute participants can manage evidence files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'dispute-evidence' AND
    EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.trades t ON d.trade_id = t.id
      WHERE d.id::text = (storage.foldername(name))[1]
      AND (auth.uid() = d.reporter_id OR auth.uid() = d.mediator_id
           OR auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  )
  WITH CHECK (
    bucket_id = 'dispute-evidence' AND
    EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.trades t ON d.trade_id = t.id
      WHERE d.id::text = (storage.foldername(name))[1]
      AND (auth.uid() = d.reporter_id OR auth.uid() = d.mediator_id
           OR auth.uid() = t.proposer_id OR auth.uid() = t.provider_id)
    )
  );

-- ============================================
-- 10) ADDITIONAL PERMISSIONS
-- ============================================

GRANT SELECT ON public.time_logs TO authenticated;
GRANT SELECT ON public.referrals TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.reviews TO authenticated;
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT ON public.disputes TO authenticated;

-- Insert permissions for user-generated content
GRANT INSERT ON public.time_logs TO authenticated;
GRANT INSERT, UPDATE ON public.referrals TO authenticated;
GRANT INSERT, UPDATE ON public.reviews TO authenticated;
GRANT INSERT ON public.disputes TO authenticated;

-- Comments for new tables
COMMENT ON TABLE public.time_logs IS 'Work session tracking with approval workflow';
COMMENT ON TABLE public.referrals IS 'User referral system with Nigerian context';
COMMENT ON TABLE public.notifications IS 'Multi-channel notification system including WhatsApp';
COMMENT ON TABLE public.reviews IS 'Comprehensive review system with multiple rating dimensions';
COMMENT ON TABLE public.achievements IS 'Gamification system with Nigerian business context';
COMMENT ON TABLE public.disputes IS 'Dispute resolution system with mediation support';

-- ============================================
-- 11) DATA VALIDATION TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_time_log_participant()
RETURNS TRIGGER AS $$
DECLARE
  is_participant BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.trades t
    WHERE t.id = NEW.trade_id
      AND (NEW.user_id = t.proposer_id OR NEW.user_id = t.provider_id)
  )
  INTO is_participant;

  IF NOT is_participant THEN
    RAISE EXCEPTION 'User % is not a participant in trade %', NEW.user_id, NEW.trade_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_time_log_participant_trigger
  BEFORE INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_time_log_participant();

CREATE OR REPLACE FUNCTION public.validate_review_participants()
RETURNS TRIGGER AS $$
DECLARE
  proposer UUID;
  provider UUID;
BEGIN
  SELECT proposer_id, provider_id
  INTO proposer, provider
  FROM public.trades
  WHERE id = NEW.trade_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade % does not exist for review', NEW.trade_id;
  END IF;

  IF NEW.reviewer_id NOT IN (proposer, provider) THEN
    RAISE EXCEPTION 'Reviewer % must be a participant in trade %', NEW.reviewer_id, NEW.trade_id;
  END IF;

  IF NEW.reviewee_id NOT IN (proposer, provider) THEN
    RAISE EXCEPTION 'Reviewee % must be a participant in trade %', NEW.reviewee_id, NEW.trade_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_review_participants_trigger
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_participants();

CREATE OR REPLACE FUNCTION public.validate_dispute_participant()
RETURNS TRIGGER AS $$
DECLARE
  proposer UUID;
  provider UUID;
BEGIN
  SELECT proposer_id, provider_id
  INTO proposer, provider
  FROM public.trades
  WHERE id = NEW.trade_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade % does not exist for dispute', NEW.trade_id;
  END IF;

  IF NEW.reporter_id NOT IN (proposer, provider) THEN
    RAISE EXCEPTION 'Reporter % must be a participant in trade %', NEW.reporter_id, NEW.trade_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_dispute_participant_trigger
  BEFORE INSERT OR UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.validate_dispute_participant();

SELECT 'Additional production tables migration completed successfully' AS status;
