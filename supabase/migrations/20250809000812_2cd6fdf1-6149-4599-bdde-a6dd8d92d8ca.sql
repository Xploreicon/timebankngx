-- 1) Types
CREATE TYPE public.trade_status AS ENUM ('pending','active','completed','disputed','cancelled');
CREATE TYPE public.milestone_status AS ENUM ('pending','in_progress','done');

-- 2) Utility function: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Profiles (mirror of auth.users data we want to expose)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  category text,
  location text,
  credits integer NOT NULL DEFAULT 0,
  trust_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Services
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 10 AND 60),
  description text NOT NULL CHECK (char_length(description) BETWEEN 50 AND 500),
  category text NOT NULL,
  hourly_rate numeric NOT NULL CHECK (hourly_rate >= 0),
  availability boolean NOT NULL DEFAULT true,
  skill_level text NOT NULL CHECK (skill_level IN ('Beginner','Intermediate','Expert')),
  views integer NOT NULL DEFAULT 0,
  inquiries integer NOT NULL DEFAULT 0,
  completed_trades integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone"
  ON public.services FOR SELECT USING (true);

CREATE POLICY "Users can create their own service"
  ON public.services FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service"
  ON public.services FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service"
  ON public.services FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Trades
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_offered_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_requested_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  hours_offered integer NOT NULL CHECK (hours_offered BETWEEN 1 AND 40),
  hours_requested integer NOT NULL CHECK (hours_requested BETWEEN 1 AND 40),
  exchange_rate numeric NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  delivery_date date,
  terms text,
  status public.trade_status NOT NULL DEFAULT 'pending',
  escrow_locked_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Helper: participant check (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_trade_participant(_trade_id uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = _trade_id AND (_uid = t.proposer_id OR _uid = t.provider_id)
  );
$$;

CREATE POLICY "Participants can view a trade"
  ON public.trades FOR SELECT
  USING (public.is_trade_participant(id, auth.uid()));

CREATE POLICY "Proposer can insert trade"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY "Participants can update trade"
  ON public.trades FOR UPDATE
  USING (public.is_trade_participant(id, auth.uid()))
  WITH CHECK (public.is_trade_participant(id, auth.uid()));

CREATE TRIGGER trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Trade Messages
CREATE TABLE IF NOT EXISTS public.trade_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trade_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read messages"
  ON public.trade_messages FOR SELECT
  USING (public.is_trade_participant(trade_id, auth.uid()));

CREATE POLICY "Participants can send messages"
  ON public.trade_messages FOR INSERT
  WITH CHECK (public.is_trade_participant(trade_id, auth.uid()) AND sender_id = auth.uid());

-- 7) Milestones
CREATE TABLE IF NOT EXISTS public.trade_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  status public.milestone_status NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trade_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read milestones"
  ON public.trade_milestones FOR SELECT
  USING (public.is_trade_participant(trade_id, auth.uid()));

CREATE POLICY "Participants can manage milestones"
  ON public.trade_milestones FOR ALL
  USING (public.is_trade_participant(trade_id, auth.uid()))
  WITH CHECK (public.is_trade_participant(trade_id, auth.uid()));

CREATE TRIGGER trade_milestones_updated_at
BEFORE UPDATE ON public.trade_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Time Logs
CREATE TABLE IF NOT EXISTS public.time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read time logs"
  ON public.time_logs FOR SELECT
  USING (public.is_trade_participant(trade_id, auth.uid()));

CREATE POLICY "Participants can manage their time logs"
  ON public.time_logs FOR INSERT
  WITH CHECK (public.is_trade_participant(trade_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Participants can update their time logs"
  ON public.time_logs FOR UPDATE
  USING (public.is_trade_participant(trade_id, auth.uid()) AND user_id = auth.uid())
  WITH CHECK (public.is_trade_participant(trade_id, auth.uid()) AND user_id = auth.uid());

CREATE TRIGGER time_logs_updated_at
BEFORE UPDATE ON public.time_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Compute duration and validate weekly cap (40 hours = 2400 minutes)
CREATE OR REPLACE FUNCTION public.time_logs_duration_and_validate()
RETURNS TRIGGER AS $$
DECLARE
  new_duration integer;
  week_total integer;
  week_start timestamptz;
  week_end timestamptz;
BEGIN
  IF NEW.end_time IS NOT NULL THEN
    new_duration := CEIL(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60.0);
    IF new_duration < 0 THEN
      RAISE EXCEPTION 'End time must be after start time';
    END IF;
    NEW.duration_minutes := new_duration;

    week_start := date_trunc('week', NEW.end_time);
    week_end := week_start + interval '7 days';

    SELECT COALESCE(SUM(duration_minutes), 0)
      INTO week_total
    FROM public.time_logs tl
    WHERE tl.user_id = NEW.user_id
      AND tl.end_time IS NOT NULL
      AND tl.end_time >= week_start AND tl.end_time < week_end
      AND (TG_OP = 'UPDATE' AND tl.id <> NEW.id OR TG_OP = 'INSERT');

    week_total := week_total + NEW.duration_minutes;
    IF week_total > 2400 THEN
      RAISE EXCEPTION 'Exceeds weekly maximum of 40 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_logs_validate
BEFORE INSERT OR UPDATE ON public.time_logs
FOR EACH ROW EXECUTE FUNCTION public.time_logs_duration_and_validate();

-- 9) Attachments metadata (files stored in storage)
CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read attachments"
  ON public.attachments FOR SELECT
  USING (public.is_trade_participant(trade_id, auth.uid()));

CREATE POLICY "Participants can add attachments"
  ON public.attachments FOR INSERT
  WITH CHECK (public.is_trade_participant(trade_id, auth.uid()) AND uploader_id = auth.uid());

-- 10) Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text,
  title text,
  body text,
  read boolean NOT NULL DEFAULT false,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 11) Drafts
CREATE TABLE IF NOT EXISTS public.trade_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  want_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  hours_offered integer CHECK (hours_offered IS NULL OR (hours_offered BETWEEN 1 AND 40)),
  hours_requested integer CHECK (hours_requested IS NULL OR (hours_requested BETWEEN 1 AND 40)),
  exchange_rate numeric CHECK (exchange_rate IS NULL OR exchange_rate > 0),
  delivery_date date,
  terms text,
  saved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trade_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their drafts"
  ON public.trade_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trade_drafts_updated_at
BEFORE UPDATE ON public.trade_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12) Credits ledger
CREATE TABLE IF NOT EXISTS public.credits_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id uuid REFERENCES public.trades(id) ON DELETE SET NULL,
  delta integer NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their ledger"
  ON public.credits_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can append to their ledger"
  ON public.credits_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Optional: index for lookups
CREATE INDEX IF NOT EXISTS idx_services_user ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_participants ON public.trades(proposer_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_messages_trade ON public.trade_messages(trade_id);
CREATE INDEX IF NOT EXISTS idx_milestones_trade ON public.trade_milestones(trade_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_week ON public.time_logs(user_id, end_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_user ON public.trade_drafts(user_id);

-- 13) Storage bucket and policies for trade attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-attachments', 'trade-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy helper already exists: public.is_trade_participant
-- Policies on storage.objects
CREATE POLICY IF NOT EXISTS "Trade attachments are accessible to participants"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'trade-attachments' AND 
  public.is_trade_participant((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY IF NOT EXISTS "Participants can upload trade attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trade-attachments' AND 
  public.is_trade_participant((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY IF NOT EXISTS "Participants can update their trade attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'trade-attachments' AND 
  public.is_trade_participant((storage.foldername(name))[1]::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'trade-attachments' AND 
  public.is_trade_participant((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY IF NOT EXISTS "Participants can delete trade attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trade-attachments' AND 
  public.is_trade_participant((storage.foldername(name))[1]::uuid, auth.uid())
);
