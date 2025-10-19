-- ============================================================================
-- MATCHING CORE MIGRATION
-- Adds support for profile needs, two-way trade proposals, and helper function
-- ============================================================================

-- Add needs column to profiles for capturing desired categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'needs'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN needs TEXT[] DEFAULT '{}'::TEXT[];
  END IF;
END;
$$;

-- ============================================================================
-- MATCH PROPOSALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.match_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_a TEXT NOT NULL,
  category_b TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (profile_a <> profile_b),
  UNIQUE (profile_a, profile_b)
);

-- Updated at trigger
CREATE TRIGGER match_proposals_updated_at
  BEFORE UPDATE ON public.match_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.match_proposals ENABLE ROW LEVEL SECURITY;

-- Participants can read their own matches
CREATE POLICY match_proposals_select_participants
  ON public.match_proposals
  FOR SELECT
  USING (auth.uid() = profile_a OR auth.uid() = profile_b);

-- Participants can update the status of their matches
CREATE POLICY match_proposals_update_participants
  ON public.match_proposals
  FOR UPDATE
  USING (auth.uid() = profile_a OR auth.uid() = profile_b)
  WITH CHECK (auth.uid() = profile_a OR auth.uid() = profile_b);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_two_way_matches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  WITH candidate_pairs AS (
    SELECT
      LEAST(p1.id, p2.id) AS profile_a,
      GREATEST(p1.id, p2.id) AS profile_b,
      p1.category::TEXT     AS category_a,
      p2.category::TEXT     AS category_b
    FROM public.profiles p1
    JOIN public.profiles p2
      ON p1.id <> p2.id
    WHERE p1.category IS NOT NULL
      AND p2.category IS NOT NULL
      AND array_length(COALESCE(p1.needs, ARRAY[]::TEXT[]), 1) > 0
      AND array_length(COALESCE(p2.needs, ARRAY[]::TEXT[]), 1) > 0
      AND p2.category = ANY (COALESCE(p1.needs, ARRAY[]::TEXT[]))
      AND p1.category = ANY (COALESCE(p2.needs, ARRAY[]::TEXT[]))
  ),
  inserted AS (
    INSERT INTO public.match_proposals (profile_a, profile_b, category_a, category_b)
    SELECT profile_a, profile_b, category_a, category_b
    FROM candidate_pairs
    WHERE profile_a <> profile_b
    ON CONFLICT (profile_a, profile_b) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;

  RETURN COALESCE(inserted_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_two_way_matches() TO authenticated;

COMMENT ON FUNCTION public.refresh_two_way_matches IS 'Generate two-way trade proposals for profiles with complementary offers/needs.';

