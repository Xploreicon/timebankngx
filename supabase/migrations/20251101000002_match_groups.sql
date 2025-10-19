-- ============================================================================
-- MATCH GROUPS REFACTOR
-- Generalises two-way and three-way proposals, participant tracking,
-- automatic trade conversion, and scheduled refresh
-- ============================================================================

-- Tear down legacy structures -------------------------------------------------

DROP FUNCTION IF EXISTS public.refresh_two_way_matches();

DROP TRIGGER IF EXISTS match_proposals_updated_at ON public.match_proposals;

DROP TABLE IF EXISTS public.match_proposals;

-- Core tables -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.match_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type TEXT NOT NULL CHECK (group_type IN ('two_way', 'three_way')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'declined', 'expired')),
  signature TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE TRIGGER match_groups_updated_at
  BEFORE UPDATE ON public.match_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.match_group_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_group_id UUID NOT NULL REFERENCES public.match_groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_index SMALLINT NOT NULL CHECK (role_index >= 0),
  offer_category TEXT NOT NULL,
  need_category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_group_id, profile_id),
  UNIQUE (match_group_id, role_index)
);

CREATE INDEX IF NOT EXISTS idx_match_group_participants_profile
  ON public.match_group_participants(profile_id);

CREATE INDEX IF NOT EXISTS idx_match_group_participants_status
  ON public.match_group_participants(match_group_id, status);

-- Row level security ----------------------------------------------------------

ALTER TABLE public.match_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_group_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_groups_participant_access
  ON public.match_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.match_group_participants p
      WHERE p.match_group_id = match_groups.id
        AND p.profile_id = auth.uid()
    )
  );

CREATE POLICY match_group_participants_select
  ON public.match_group_participants
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY match_group_participants_update
  ON public.match_group_participants
  FOR UPDATE
  USING (profile_id = auth.uid());

-- Helper function: convert matches into trades --------------------------------

CREATE OR REPLACE FUNCTION public._convert_match_group_to_trades(p_match_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_record record;
  participants RECORD;
  participant_list match_group_participants[];
  participant_count INTEGER;
  i INTEGER;
  target_value NUMERIC := 10;
  p_current match_group_participants%ROWTYPE;
  p_next match_group_participants%ROWTYPE;
  credits_current NUMERIC;
  credits_next NUMERIC;
  hours_current NUMERIC;
  hours_next NUMERIC;
  title TEXT;
  description TEXT;
  location TEXT;
BEGIN
  SELECT * INTO group_record FROM public.match_groups WHERE id = p_match_group_id FOR UPDATE;

  IF NOT FOUND OR group_record.status <> 'pending' THEN
    RETURN;
  END IF;

  SELECT ARRAY_AGG(p ORDER BY p.role_index) INTO participant_list
  FROM public.match_group_participants p
  WHERE p.match_group_id = p_match_group_id;

  participant_count := COALESCE(array_length(participant_list, 1), 0);

  IF participant_count < 2 THEN
    RETURN;
  END IF;

  FOR i IN 1..participant_count LOOP
    p_current := participant_list[i];
    p_next := participant_list[(i % participant_count) + 1];

    SELECT base_credits_per_hour INTO credits_current
    FROM public.nigerian_category_rates
    WHERE category = p_current.offer_category::public.business_category;

    SELECT base_credits_per_hour INTO credits_next
    FROM public.nigerian_category_rates
    WHERE category = p_next.offer_category::public.business_category;

    credits_current := COALESCE(credits_current, 5);
    credits_next := COALESCE(credits_next, 5);

    hours_current := GREATEST(1, ROUND(target_value / credits_current, 1));
    hours_next := GREATEST(1, ROUND(target_value / credits_next, 1));

    title := format(
      'Trade: %s receives %s services from %s',
      (SELECT COALESCE(display_name, 'Member') FROM public.profiles WHERE id = p_current.profile_id),
      initcap(replace(p_next.offer_category, '_', ' ')),
      (SELECT COALESCE(display_name, 'Member') FROM public.profiles WHERE id = p_next.profile_id)
    );

    description := format(
      'Automated match between %s, %s, and %s.',
      (SELECT COALESCE(display_name, 'Member') FROM public.profiles WHERE id = participant_list[1].profile_id),
      CASE WHEN participant_count > 2
        THEN (SELECT COALESCE(display_name, 'Member') FROM public.profiles WHERE id = participant_list[2].profile_id)
        ELSE (SELECT COALESCE(display_name, 'Member') FROM public.profiles WHERE id = participant_list[participant_count].profile_id)
      END,
      CASE WHEN participant_count = 3
        THEN (SELECT COALESCE(display_name, 'Member') FROM public.profiles WHERE id = participant_list[3].profile_id)
        ELSE (SELECT COALESCE(display_name, 'Member') FROM public.profiles WHERE id = participant_list[participant_count].profile_id)
      END
    );

    SELECT location INTO location FROM public.profiles WHERE id = p_next.profile_id;

    INSERT INTO public.trades (
      proposer_id,
      provider_id,
      proposer_hours,
      provider_hours,
      proposer_credits,
      provider_credits,
      exchange_rate,
      title,
      description,
      status,
      priority_level,
      requires_physical_meetup,
      meetup_location,
      preferred_communication_method
    ) VALUES (
      p_current.profile_id,
      p_next.profile_id,
      hours_current,
      hours_next,
      target_value,
      target_value,
      CASE WHEN credits_next = 0 THEN 1 ELSE credits_current / credits_next END,
      title,
      description,
      'pending',
      3,
      FALSE,
      location,
      'platform'
    );

    EXIT WHEN group_record.group_type = 'two_way';
  END LOOP;
END;
$$;

-- Participant actions ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_match_participation(p_match_group_id UUID)
RETURNS match_group_participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_record match_group_participants;
  remaining_pending INTEGER;
BEGIN
  SELECT * INTO participant_record
  FROM public.match_group_participants
  WHERE match_group_id = p_match_group_id
    AND profile_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a participant of this match.';
  END IF;

  IF participant_record.status = 'declined' THEN
    RAISE EXCEPTION 'Match has been declined.';
  END IF;

  IF participant_record.status = 'accepted' THEN
    RETURN participant_record;
  END IF;

  UPDATE public.match_group_participants
  SET status = 'accepted',
      accepted_at = NOW()
  WHERE id = participant_record.id
  RETURNING * INTO participant_record;

  SELECT COUNT(*) INTO remaining_pending
  FROM public.match_group_participants
  WHERE match_group_id = p_match_group_id
    AND status = 'pending';

  IF remaining_pending = 0 THEN
    PERFORM public._convert_match_group_to_trades(p_match_group_id);
    UPDATE public.match_groups
    SET status = 'converted',
        converted_at = NOW()
    WHERE id = p_match_group_id;
  END IF;

  RETURN participant_record;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_match_participation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_match_participation(p_match_group_id UUID)
RETURNS match_group_participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_record match_group_participants;
BEGIN
  SELECT * INTO participant_record
  FROM public.match_group_participants
  WHERE match_group_id = p_match_group_id
    AND profile_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a participant of this match.';
  END IF;

  UPDATE public.match_group_participants
  SET status = 'declined',
      accepted_at = NOW()
  WHERE id = participant_record.id
  RETURNING * INTO participant_record;

  UPDATE public.match_groups
  SET status = 'declined',
      updated_at = NOW()
  WHERE id = p_match_group_id;

  RETURN participant_record;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_match_participation(UUID) TO authenticated;

-- Refresh function ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_match_groups()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_two INTEGER := 0;
  inserted_three INTEGER := 0;
  rows_inserted INTEGER := 0;
BEGIN
  UPDATE public.match_groups
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  WITH candidate_profiles AS (
    SELECT
      id,
      category::TEXT AS category,
      COALESCE(needs, ARRAY[]::TEXT[]) AS needs
    FROM public.profiles
    WHERE category IS NOT NULL
      AND array_length(COALESCE(needs, ARRAY[]::TEXT[]), 1) > 0
  ),
  two_way_pairs AS (
    SELECT
      cp1.id AS profile_a,
      cp2.id AS profile_b,
      cp1.category AS category_a,
      cp2.category AS category_b,
      (SELECT n FROM unnest(cp1.needs) AS n WHERE n = cp2.category LIMIT 1) AS need_a,
      (SELECT n FROM unnest(cp2.needs) AS n WHERE n = cp1.category LIMIT 1) AS need_b,
      'two:' || LEAST(cp1.id, cp2.id)::TEXT || ':' || GREATEST(cp1.id, cp2.id)::TEXT AS signature
    FROM candidate_profiles cp1
    JOIN candidate_profiles cp2
      ON cp1.id < cp2.id
    WHERE cp2.category = ANY (cp1.needs)
      AND cp1.category = ANY (cp2.needs)
  ),
  inserted_groups AS (
    INSERT INTO public.match_groups (group_type, status, signature)
    SELECT 'two_way', 'pending', signature
    FROM two_way_pairs
    ON CONFLICT (signature) DO NOTHING
    RETURNING id, signature
  )
  INSERT INTO public.match_group_participants (match_group_id, profile_id, role_index, offer_category, need_category)
  SELECT ig.id, t.profile_a, 0, t.category_a, COALESCE(t.need_a, t.category_b)
  FROM inserted_groups ig
  JOIN two_way_pairs t ON t.signature = ig.signature
  UNION ALL
  SELECT ig.id, t.profile_b, 1, t.category_b, COALESCE(t.need_b, t.category_a)
  FROM inserted_groups ig
  JOIN two_way_pairs t ON t.signature = ig.signature;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  inserted_two := rows_inserted / 2;

  WITH candidate_profiles AS (
    SELECT
      id,
      category::TEXT AS category,
      COALESCE(needs, ARRAY[]::TEXT[]) AS needs
    FROM public.profiles
    WHERE category IS NOT NULL
      AND array_length(COALESCE(needs, ARRAY[]::TEXT[]), 1) > 0
  ),
  three_way_cycles AS (
    SELECT
      cp1.id AS profile_a,
      cp2.id AS profile_b,
      cp3.id AS profile_c,
      cp1.category AS category_a,
      cp2.category AS category_b,
      cp3.category AS category_c,
      (SELECT n FROM unnest(cp1.needs) AS n WHERE n = cp2.category LIMIT 1) AS need_a,
      (SELECT n FROM unnest(cp2.needs) AS n WHERE n = cp3.category LIMIT 1) AS need_b,
      (SELECT n FROM unnest(cp3.needs) AS n WHERE n = cp1.category LIMIT 1) AS need_c,
      'three:' || cp1.id::TEXT || ':' || cp2.id::TEXT || ':' || cp3.id::TEXT AS signature
    FROM candidate_profiles cp1
    JOIN candidate_profiles cp2 ON cp1.id <> cp2.id
    JOIN candidate_profiles cp3 ON cp1.id <> cp3.id AND cp2.id <> cp3.id
    WHERE cp2.category = ANY (cp1.needs)
      AND cp3.category = ANY (cp2.needs)
      AND cp1.category = ANY (cp3.needs)
      AND cp1.id < cp2.id AND cp2.id < cp3.id
  ),
  inserted_three_groups AS (
    INSERT INTO public.match_groups (group_type, status, signature)
    SELECT 'three_way', 'pending', signature
    FROM three_way_cycles
    ON CONFLICT (signature) DO NOTHING
    RETURNING id, signature
  )
  INSERT INTO public.match_group_participants (match_group_id, profile_id, role_index, offer_category, need_category)
  SELECT ig.id, cycle.profile_a, 0, cycle.category_a, COALESCE(cycle.need_a, cycle.category_b)
  FROM inserted_three_groups ig
  JOIN three_way_cycles cycle ON cycle.signature = ig.signature
  UNION ALL
  SELECT ig.id, cycle.profile_b, 1, cycle.category_b, COALESCE(cycle.need_b, cycle.category_c)
  FROM inserted_three_groups ig
  JOIN three_way_cycles cycle ON cycle.signature = ig.signature
  UNION ALL
  SELECT ig.id, cycle.profile_c, 2, cycle.category_c, COALESCE(cycle.need_c, cycle.category_a)
  FROM inserted_three_groups ig
  JOIN three_way_cycles cycle ON cycle.signature = ig.signature;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  inserted_three := rows_inserted / 3;

  RETURN COALESCE(inserted_two, 0) + COALESCE(inserted_three, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_match_groups() TO authenticated;

-- Schedule refresh every hour -----------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  existing_job_id INTEGER;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'refresh_match_groups_hourly';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END;
$$;

SELECT cron.schedule(
  'refresh_match_groups_hourly',
  '0 * * * *',
  $$SELECT public.refresh_match_groups();$$
);
