-- Deactivate all but the latest active signal for any user who has multiple active signals
UPDATE public.signals
SET active = FALSE
WHERE active = TRUE
  AND id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM public.signals
    WHERE active = TRUE
    ORDER BY user_id, created_at DESC
  );

-- Trigger to automatically deactivate old signals when a new one is posted
CREATE OR REPLACE FUNCTION public.deactivate_old_signals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.signals
  SET active = FALSE
  WHERE user_id = NEW.user_id
    AND active = TRUE
    AND id <> NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deactivate_old_signals ON public.signals;
CREATE TRIGGER trigger_deactivate_old_signals
  BEFORE INSERT ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.deactivate_old_signals();

-- Update get_nearby_signals to only return the latest active signal per user
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
  WITH latest_signals AS (
    SELECT DISTINCT ON (user_id) s.*
    FROM public.signals s
    WHERE s.active = TRUE
      AND s.expires_at > now()
    ORDER BY s.user_id, s.created_at DESC
  )
  SELECT
    s.id,
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

-- Update count_nearby_signals to count unique nearby active users (one signal per user max)
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
      LEAST(in_search_radius_m, 5000)
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
    );
$$;
