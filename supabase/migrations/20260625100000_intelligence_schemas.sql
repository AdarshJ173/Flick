-- Create user_patterns table to track behavioral pattern intelligence
CREATE TABLE IF NOT EXISTS public.user_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    peak_hours JSONB DEFAULT '[]'::jsonb,
    frequent_radius INTEGER DEFAULT 800,
    primary_locations JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_pattern UNIQUE (user_id)
);

-- Enable RLS on user_patterns
ALTER TABLE public.user_patterns ENABLE ROW LEVEL SECURITY;

-- Policies for user_patterns
CREATE POLICY "Users can select their own patterns"
    ON public.user_patterns
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own patterns"
    ON public.user_patterns
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create proximity_encounters table to detect co-occurrence
CREATE TABLE IF NOT EXISTS public.proximity_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encounter_count INTEGER DEFAULT 1 NOT NULL,
    last_encountered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_encounter_pair UNIQUE (user_a, user_b),
    CONSTRAINT check_user_order CHECK (user_a < user_b)
);

-- Enable RLS on proximity_encounters
ALTER TABLE public.proximity_encounters ENABLE ROW LEVEL SECURITY;

-- Policies for proximity_encounters
CREATE POLICY "Users can select encounters they are involved in"
    ON public.proximity_encounters
    FOR SELECT
    USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Grant permissions to public role
GRANT ALL ON public.user_patterns TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.proximity_encounters TO postgres, anon, authenticated, service_role;
