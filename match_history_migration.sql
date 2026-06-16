-- HackOS Match History & Teammate Search Migration Script
-- Run this in your Supabase SQL Editor to verify or create the matching tables

-- 1. Create match_swipes table
CREATE TABLE IF NOT EXISTS public.match_swipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swiper_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT CHECK (action IN ('interested', 'skip')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_swipe UNIQUE (swiper_id, target_id)
);

-- 2. Create match_saves table
CREATE TABLE IF NOT EXISTS public.match_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_save UNIQUE (user_id, target_id)
);

-- 3. Create match_mutual table
CREATE TABLE IF NOT EXISTS public.match_mutual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_1 UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_2 UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_mutual UNIQUE (user_1, user_2)
);

-- Enable Row Level Security (RLS) on matchmaking tables
ALTER TABLE public.match_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_mutual ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DROP POLICY IF EXISTS "Allow select for all on match_swipes" ON public.match_swipes;
CREATE POLICY "Allow select for all on match_swipes" ON public.match_swipes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all for swiper on match_swipes" ON public.match_swipes;
CREATE POLICY "Allow all for swiper on match_swipes" ON public.match_swipes FOR ALL TO authenticated USING (auth.uid() = swiper_id);

DROP POLICY IF EXISTS "Allow select for all on match_saves" ON public.match_saves;
CREATE POLICY "Allow select for all on match_saves" ON public.match_saves FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all for user on match_saves" ON public.match_saves;
CREATE POLICY "Allow all for user on match_saves" ON public.match_saves FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow select for matches on match_mutual" ON public.match_mutual;
CREATE POLICY "Allow select for matches on match_mutual" ON public.match_mutual FOR SELECT TO authenticated USING (auth.uid() = user_1 OR auth.uid() = user_2);
DROP POLICY IF EXISTS "Allow insert for matches on match_mutual" ON public.match_mutual;
CREATE POLICY "Allow insert for matches on match_mutual" ON public.match_mutual FOR ALL TO authenticated USING (true);
