-- Recreate get_nearby_signals with explicit table aliases in subqueries to prevent PL/pgSQL variable collisions
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
  -- Using profiles.id explicitly to avoid shadowing the "id" return parameter
  v_search_radius := COALESCE(
    in_search_radius_m,
    (SELECT max_radius_m FROM public.profiles WHERE profiles.id = auth.uid()),
    2000
  );

  RETURN QUERY
  WITH latest_signals AS (
    SELECT DISTINCT ON (s.user_id) s.*
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
    );
END;
$$;

-- Recreate count_nearby_signals with explicit table aliases in subqueries to prevent PL/pgSQL variable collisions
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
  -- Using profiles.id explicitly to avoid shadowing variables
  v_search_radius := COALESCE(
    in_search_radius_m,
    (SELECT max_radius_m FROM public.profiles WHERE profiles.id = auth.uid()),
    2000
  );

  RETURN (
    SELECT COUNT(DISTINCT s.user_id)::INT
    FROM public.signals s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.active = TRUE
      AND s.expires_at > now()
      AND p.discoverable = TRUE
      AND s.user_id <> auth.uid()
      AND ST_DWithin(
        s.location,
        ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography,
        LEAST(v_search_radius, 5000)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = s.user_id)
           OR (b.blocker_id = s.user_id AND b.blocked_id = auth.uid())
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.reports r
        WHERE (r.reporter_id = auth.uid() AND r.reported_id = s.user_id)
           OR (r.reporter_id = s.user_id AND r.reported_id = auth.uid())
      )
  );
END;
$$;
