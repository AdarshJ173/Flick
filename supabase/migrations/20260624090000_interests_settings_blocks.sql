-- =========================================
-- Add interests and settings columns to profiles
-- =========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS discoverable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_radius_m INT DEFAULT 2000;

-- =========================================
-- blocks (user blocking)
-- =========================================
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own blocks"
  ON public.blocks FOR ALL TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- =========================================
-- Update get_nearby_signals to respect discoverable + blocks
-- =========================================
CREATE OR REPLACE FUNCTION public.get_nearby_signals(
  in_lat DOUBLE PRECISION,
  in_lng DOUBLE PRECISION,
  in_search_radius_m INT DEFAULT 2000
)
RETURNS TABLE (
  id UUID,
  intent TEXT,
  note TEXT,
  place_label TEXT,
  distance_m DOUBLE PRECISION,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_mine BOOLEAN,
  already_waved BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.intent,
    s.note,
    s.place_label,
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) AS distance_m,
    s.expires_at,
    s.created_at,
    (s.user_id = auth.uid()) AS is_mine,
    EXISTS (SELECT 1 FROM public.waves w WHERE w.signal_id = s.id AND w.from_user = auth.uid()) AS already_waved
  FROM public.signals s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.active = TRUE
    AND s.expires_at > now()
    AND p.discoverable = TRUE
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography,
      LEAST(GREATEST(in_search_radius_m, s.radius_m), 5000)
    )
    -- Exclude blocked users (bidirectional)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = s.user_id)
         OR (b.blocker_id = s.user_id AND b.blocked_id = auth.uid())
    )
  ORDER BY distance_m ASC
  LIMIT 50;
$$;

-- =========================================
-- RPC: count nearby signals (for home screen counter)
-- =========================================
CREATE OR REPLACE FUNCTION public.count_nearby_signals(
  in_lat DOUBLE PRECISION,
  in_lng DOUBLE PRECISION,
  in_search_radius_m INT DEFAULT 2000
)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.signals s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.active = TRUE
    AND s.expires_at > now()
    AND p.discoverable = TRUE
    AND s.user_id <> auth.uid()
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography,
      LEAST(in_search_radius_m, 5000)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = s.user_id)
         OR (b.blocker_id = s.user_id AND b.blocked_id = auth.uid())
    );
$$;

GRANT EXECUTE ON FUNCTION public.count_nearby_signals(DOUBLE PRECISION, DOUBLE PRECISION, INT) TO authenticated;

-- =========================================
-- RPC: block a user
-- =========================================
CREATE OR REPLACE FUNCTION public.block_user(in_blocked_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (auth.uid(), in_blocked_id)
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(UUID) TO authenticated;

-- =========================================
-- RPC: unblock a user
-- =========================================
CREATE OR REPLACE FUNCTION public.unblock_user(in_blocked_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.blocks
  WHERE blocker_id = auth.uid() AND blocked_id = in_blocked_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unblock_user(UUID) TO authenticated;

-- =========================================
-- RPC: get blocked users with profile info
-- =========================================
CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS TABLE (
  blocked_id UUID,
  display_name TEXT,
  avatar_emoji TEXT,
  blocked_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.blocked_id, p.display_name, p.avatar_emoji, b.created_at AS blocked_at
  FROM public.blocks b
  JOIN public.profiles p ON p.id = b.blocked_id
  WHERE b.blocker_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_blocked_users() TO authenticated;

-- =========================================
-- Profile: allow matched users to read interests too
-- (already covered by existing cross-profile read policy)
-- =========================================
