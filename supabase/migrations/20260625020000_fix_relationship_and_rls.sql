-- Drop function first to allow signature change (adding user_id)
DROP FUNCTION IF EXISTS public.get_nearby_signals(DOUBLE PRECISION, DOUBLE PRECISION, INT) CASCADE;

-- Recreate get_nearby_signals with user_id UUID column included
CREATE OR REPLACE FUNCTION public.get_nearby_signals(
  in_lat DOUBLE PRECISION,
  in_lng DOUBLE PRECISION,
  in_search_radius_m INT DEFAULT 2000
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
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
  WITH latest_signals AS (
    SELECT DISTINCT ON (user_id) s.*
    FROM public.signals s
    WHERE s.active = TRUE
      AND s.expires_at > now()
    ORDER BY s.user_id, s.created_at DESC
  )
  SELECT
    s.id,
    s.user_id,
    s.intent,
    s.note,
    s.place_label,
    -- Snap/Bucket distances to prevent precise trilateration attacks (Gaussian noise simulation / rounding)
    CASE 
      WHEN ST_Distance(s.location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) < 250 THEN 100.0
      WHEN ST_Distance(s.location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) < 500 THEN 350.0
      WHEN ST_Distance(s.location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) < 1000 THEN 750.0
      ELSE ROUND(ST_Distance(s.location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) / 500) * 500
    END AS distance_m,
    s.expires_at,
    s.created_at,
    (s.user_id = auth.uid()) AS is_mine,
    EXISTS (SELECT 1 FROM public.waves w WHERE w.signal_id = s.id AND w.from_user = auth.uid()) AS already_waved
  FROM latest_signals s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE p.discoverable = TRUE
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
    -- Exclude reported users (bidirectional)
    AND NOT EXISTS (
      SELECT 1 FROM public.reports r
      WHERE (r.reporter_id = auth.uid() AND r.reported_id = s.user_id)
         OR (r.reporter_id = s.user_id AND r.reported_id = auth.uid())
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_signals(DOUBLE PRECISION, DOUBLE PRECISION, INT) TO authenticated;

-- Fix relationship between signals and profiles so PostgREST can resolve the join
ALTER TABLE public.signals
  DROP CONSTRAINT IF EXISTS signals_user_id_fkey,
  ADD CONSTRAINT signals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Allow authenticated users to view active signals of discoverable profiles
DROP POLICY IF EXISTS "Read active signals of discoverable users" ON public.signals;
CREATE POLICY "Read active signals of discoverable users"
  ON public.signals FOR SELECT TO authenticated
  USING (
    active = TRUE
    AND expires_at > now()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = signals.user_id
        AND p.discoverable = TRUE
    )
  );

-- Allow authenticated users to read profiles of users who have active signals
DROP POLICY IF EXISTS "Read profiles of active signals" ON public.profiles;
CREATE POLICY "Read profiles of active signals"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    discoverable = TRUE
    AND EXISTS (
      SELECT 1 FROM public.signals s
      WHERE s.user_id = profiles.id
        AND s.active = TRUE
        AND s.expires_at > now()
    )
  );
