-- ========================================================
-- Flick Trust, Safety, Fraud Prevention & DPDP Compliance
-- ========================================================

-- Update profiles table with verification & compliance attributes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS dpdp_consent_location BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dpdp_consent_profile BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dpdp_consent_timestamp TIMESTAMPTZ;

-- User reports table for 1-click reporting
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_id)
);

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own sent reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users insert reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Verification requests table (Ask For More)
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'linkedin', 'instagram', 'photo', 'website'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, recipient_id, platform),
  CHECK (requester_id <> recipient_id)
);

GRANT SELECT, INSERT, DELETE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their verification requests"
  ON public.verification_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users create verification requests"
  ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Update get_nearby_signals to bucket/fuzz distance & filter blocked + reported profiles
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
    -- Exclude reported users (bidirectional)
    AND NOT EXISTS (
      SELECT 1 FROM public.reports r
      WHERE (r.reporter_id = auth.uid() AND r.reported_id = s.user_id)
         OR (r.reporter_id = s.user_id AND r.reported_id = auth.uid())
    );
$$;

-- Update count_nearby_signals to exclude blocked + reported
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
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.reports r
      WHERE (r.reporter_id = auth.uid() AND r.reported_id = s.user_id)
         OR (r.reporter_id = s.user_id AND r.reported_id = auth.uid())
    );
$$;
