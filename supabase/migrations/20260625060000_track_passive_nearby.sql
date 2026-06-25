-- Migration to track user location passively on profiles and include passive users in nearby list

-- Add location tracking columns to profiles if not present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_location geography(Point, 4326),
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- Create spatial index for profile location searches
CREATE INDEX IF NOT EXISTS profiles_last_location_gix ON public.profiles USING GIST (last_location);

-- Recreate get_nearby_signals to union active signals and passive nearby users
CREATE OR REPLACE FUNCTION public.get_nearby_signals(
  in_lat DOUBLE PRECISION,
  in_lng DOUBLE PRECISION,
  in_search_radius_m INT DEFAULT NULL
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search_radius INT;
BEGIN
  -- Resolve caller's configured max radius if none provided, fallback to 2000m
  v_search_radius := COALESCE(
    in_search_radius_m,
    (SELECT max_radius_m FROM public.profiles WHERE profiles.id = auth.uid()),
    2000
  );

  RETURN QUERY
  -- 1. Active signals (live users)
  SELECT
    s.id,
    s.user_id,
    s.intent,
    s.note,
    s.place_label,
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
  FROM public.signals s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.active = TRUE
    AND s.expires_at > now()
    AND p.discoverable = TRUE
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography,
      LEAST(GREATEST(v_search_radius, s.radius_m), 5000)
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
    )

  UNION ALL

  -- 2. Passive nearby profiles (recently active but no live signal)
  SELECT
    NULL::UUID AS id,
    p.id AS user_id,
    NULL::TEXT AS intent,
    NULL::TEXT AS note,
    NULL::TEXT AS place_label,
    CASE 
      WHEN ST_Distance(p.last_location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) < 250 THEN 100.0
      WHEN ST_Distance(p.last_location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) < 500 THEN 350.0
      WHEN ST_Distance(p.last_location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) < 1000 THEN 750.0
      ELSE ROUND(ST_Distance(p.last_location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) / 500) * 500
    END AS distance_m,
    NULL::TIMESTAMPTZ AS expires_at,
    p.last_active_at AS created_at,
    (p.id = auth.uid()) AS is_mine,
    FALSE AS already_waved
  FROM public.profiles p
  WHERE p.discoverable = TRUE
    AND p.last_location IS NOT NULL
    -- Recently active in last 24 hours
    AND p.last_active_at > now() - interval '24 hours'
    AND p.id <> auth.uid() -- exclude self from passive nearby results
    -- Exclude users with active live signals (handled in active signals section)
    AND NOT EXISTS (
      SELECT 1 FROM public.signals s
      WHERE s.user_id = p.id
        AND s.active = TRUE
        AND s.expires_at > now()
    )
    AND ST_DWithin(
      p.last_location,
      ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography,
      LEAST(v_search_radius, 5000)
    )
    -- Exclude blocked users (bidirectional)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
    )
    -- Exclude reported users (bidirectional)
    AND NOT EXISTS (
      SELECT 1 FROM public.reports r
      WHERE (r.reporter_id = auth.uid() AND r.reported_id = p.id)
         OR (r.reporter_id = p.id AND r.reported_id = auth.uid())
    );
END;
$$;

-- Recreate count_nearby_signals to count both live and passive users
CREATE OR REPLACE FUNCTION public.count_nearby_signals(
  in_lat DOUBLE PRECISION,
  in_lng DOUBLE PRECISION,
  in_search_radius_m INT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search_radius INT;
BEGIN
  -- Resolve caller's configured max radius if none provided, fallback to 2000m
  v_search_radius := COALESCE(
    in_search_radius_m,
    (SELECT max_radius_m FROM public.profiles WHERE profiles.id = auth.uid()),
    2000
  );

  RETURN (
    SELECT COUNT(DISTINCT p.id)::INT
    FROM public.profiles p
    LEFT JOIN public.signals s ON s.user_id = p.id AND s.active = TRUE AND s.expires_at > now()
    WHERE p.discoverable = TRUE
      AND p.id <> auth.uid()
      AND (
        -- Either they have an active signal
        s.id IS NOT NULL
        OR 
        -- Or they have a passive location updated in last 24 hours
        (p.last_location IS NOT NULL AND p.last_active_at > now() - interval '24 hours')
      )
      AND (
        CASE 
          WHEN s.id IS NOT NULL THEN
            ST_DWithin(
              s.location,
              ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography,
              LEAST(GREATEST(v_search_radius, s.radius_m), 5000)
            )
          ELSE
            ST_DWithin(
              p.last_location,
              ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography,
              LEAST(v_search_radius, 5000)
            )
        END
      )
      -- Exclude blocked users (bidirectional)
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
      )
      -- Exclude reported users (bidirectional)
      AND NOT EXISTS (
        SELECT 1 FROM public.reports r
        WHERE (r.reporter_id = auth.uid() AND r.reported_id = p.id)
           OR (r.reporter_id = p.id AND r.reported_id = auth.uid())
      )
  );
END;
$$;
