-- ============================================================================
-- MATCH INTRO MESSAGES + TRADE HANDOFF
-- ============================================================================

-- Allow participants to store an intro message when they accept a match.
ALTER TABLE public.match_group_participants
  ADD COLUMN IF NOT EXISTS intro_message TEXT;

-- Recreate conversion function to copy intro messages into the resulting trades.
DROP FUNCTION IF EXISTS public._convert_match_group_to_trades(UUID);

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
  trade_id UUID;
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
    )
    RETURNING id INTO trade_id;

    IF p_current.intro_message IS NOT NULL AND btrim(p_current.intro_message) <> '' THEN
      INSERT INTO public.trade_messages (
        trade_id,
        sender_id,
        message_text,
        message_type,
        is_system_message,
        created_at
      ) VALUES (
        trade_id,
        p_current.profile_id,
        p_current.intro_message,
        'text',
        FALSE,
        NOW()
      );

      UPDATE public.match_group_participants
      SET intro_message = NULL
      WHERE id = p_current.id;
    END IF;

    IF group_record.group_type = 'two_way' AND p_next.intro_message IS NOT NULL AND btrim(p_next.intro_message) <> '' THEN
      INSERT INTO public.trade_messages (
        trade_id,
        sender_id,
        message_text,
        message_type,
        is_system_message,
        created_at
      ) VALUES (
        trade_id,
        p_next.profile_id,
        p_next.intro_message,
        'text',
        FALSE,
        NOW()
      );

      UPDATE public.match_group_participants
      SET intro_message = NULL
      WHERE id = p_next.id;
    END IF;

    EXIT WHEN group_record.group_type = 'two_way';
  END LOOP;
END;
$$;

-- Recreate accept function to capture intro messages during swipe acceptance.
DROP FUNCTION IF EXISTS public.accept_match_participation(UUID);

CREATE OR REPLACE FUNCTION public.accept_match_participation(
  p_match_group_id UUID,
  p_intro_message TEXT DEFAULT NULL
)
RETURNS match_group_participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_record match_group_participants;
  remaining_pending INTEGER;
  intro_value TEXT := NULLIF(btrim(COALESCE(p_intro_message, '')), '');
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
    UPDATE public.match_group_participants
    SET intro_message = CASE WHEN intro_value IS NULL THEN intro_message ELSE intro_value END
    WHERE id = participant_record.id
    RETURNING * INTO participant_record;
    RETURN participant_record;
  END IF;

  UPDATE public.match_group_participants
  SET status = 'accepted',
      accepted_at = NOW(),
      intro_message = intro_value
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

GRANT EXECUTE ON FUNCTION public.accept_match_participation(UUID, TEXT) TO authenticated;
