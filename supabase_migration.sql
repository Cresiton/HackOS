-- Supabase Migration: Messaging System Upgrade
-- Run this in your Supabase SQL Editor

-- 1. Ensure `conversations` table has required fields
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS last_message TEXT,
ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;

-- 2. Ensure `conversation_members` table has required fields
ALTER TABLE public.conversation_members
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Ensure `messages` table has required fields
-- Note: We add these without dropping existing 'content' to prevent data loss
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_seen BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT false;
-- 4. Fix RLS for conversation_members to avoid infinite recursion and allow direct message creation
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'conversation_members' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_members', pol.policyname);
    END LOOP;
END $$;

-- Create safe, non-recursive policies for conversation_members
CREATE POLICY "Enable read access for all authenticated users" 
ON public.conversation_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON public.conversation_members FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable delete for own membership" 
ON public.conversation_members FOR DELETE TO authenticated USING (user_id = auth.uid());
-- 5. Enable Realtime on the `messages` table if not already enabled
-- Supabase requires Realtime to be manually enabled per table for broadcast changes
-- If you get an error here, you can safely ignore this line.
-- alter publication supabase_realtime add table public.messages;
