-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_members CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.team_requests CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- 1. Create public.teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
    max_members INTEGER DEFAULT 4,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'recruiting',
    description TEXT,
    category TEXT DEFAULT 'General',
    color TEXT DEFAULT '#7C5CFF',
    icon TEXT DEFAULT '🚀',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create public.team_members table
CREATE TABLE public.team_members (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Developer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

-- 3. Create public.team_requests table
CREATE TABLE public.team_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('invite', 'join_request')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    role TEXT DEFAULT 'Developer',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create public.notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_url TEXT,
    action_label TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create public.conversations table
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_team BOOLEAN DEFAULT FALSE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_team_conversation UNIQUE (team_id)
);

-- 6. Create public.conversation_members table
CREATE TABLE public.conversation_members (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, user_id)
);

-- 7. Create public.messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive RLS policies for authenticated users
-- teams policies
CREATE POLICY "Allow select for all authenticated users on teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for all authenticated users on teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update/delete for all authenticated users on teams" ON public.teams FOR ALL TO authenticated USING (true);

-- team_members policies
CREATE POLICY "Allow select for all authenticated users on team_members" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for all authenticated users on team_members" ON public.team_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update/delete for all authenticated users on team_members" ON public.team_members FOR ALL TO authenticated USING (true);

-- team_requests policies
CREATE POLICY "Allow select for all authenticated users on team_requests" ON public.team_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for all authenticated users on team_requests" ON public.team_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update/delete for all authenticated users on team_requests" ON public.team_requests FOR ALL TO authenticated USING (true);

-- notifications policies
CREATE POLICY "Allow select for own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow insert for all authenticated users on notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update/delete for own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id);

-- conversations policies
CREATE POLICY "Allow select/insert/update for all authenticated users on conversations" ON public.conversations FOR ALL TO authenticated USING (true);

-- conversation_members policies
CREATE POLICY "Allow select/insert/update/delete for all authenticated users on conversation_members" ON public.conversation_members FOR ALL TO authenticated USING (true);

-- messages policies
CREATE POLICY "Allow select/insert/update/delete for all authenticated users on messages" ON public.messages FOR ALL TO authenticated USING (true);

-- Create Indexes for performance
CREATE INDEX idx_teams_hackathon_id ON public.teams(hackathon_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_requests_sender_id ON public.team_requests(sender_id);
CREATE INDEX idx_team_requests_receiver_id ON public.team_requests(receiver_id);
CREATE INDEX idx_team_requests_team_id ON public.team_requests(team_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_conversation_members_user_id ON public.conversation_members(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);

-- Trigger Function 1: Handle automatic team room creation and member syncing on team_members INSERT
CREATE OR REPLACE FUNCTION public.handle_team_member_added()
RETURNS TRIGGER AS $$
DECLARE
    member_count INTEGER;
    conv_id UUID;
    mem RECORD;
BEGIN
    -- Count the members of the team
    SELECT COUNT(*) INTO member_count FROM public.team_members WHERE team_id = NEW.team_id;
    
    IF member_count >= 2 THEN
        -- Check if a conversation already exists for this team
        SELECT id INTO conv_id FROM public.conversations WHERE team_id = NEW.team_id AND is_team = true;
        
        -- If it doesn't exist, create it
        IF conv_id IS NULL THEN
            INSERT INTO public.conversations (is_team, team_id)
            VALUES (true, NEW.team_id)
            RETURNING id INTO conv_id;
            
            -- Insert all current team members into the conversation members
            FOR mem IN SELECT user_id FROM public.team_members WHERE team_id = NEW.team_id LOOP
                INSERT INTO public.conversation_members (conversation_id, user_id)
                VALUES (conv_id, mem.user_id)
                ON CONFLICT (conversation_id, user_id) DO NOTHING;
            END LOOP;
            
            -- Insert a system message about team room creation
            INSERT INTO public.messages (conversation_id, sender_id, content)
            VALUES (conv_id, NEW.user_id, 'system:Team chat room created.');
        ELSE
            -- Add the new member to the conversation
            INSERT INTO public.conversation_members (conversation_id, user_id)
            VALUES (conv_id, NEW.user_id)
            ON CONFLICT (conversation_id, user_id) DO NOTHING;
            
            -- Insert a system message about the new member joining
            DECLARE
                m_name TEXT;
            BEGIN
                SELECT name INTO m_name FROM public.profiles WHERE id = NEW.user_id;
                IF m_name IS NULL THEN
                    m_name := 'A member';
                END IF;
                INSERT INTO public.messages (conversation_id, sender_id, content)
                VALUES (conv_id, NEW.user_id, 'system:' || m_name || ' joined the team.');
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function 2: Handle syncing on team_members DELETE (remove member from chat)
CREATE OR REPLACE FUNCTION public.handle_team_member_removed()
RETURNS TRIGGER AS $$
DECLARE
    conv_id UUID;
    m_name TEXT;
BEGIN
    SELECT id INTO conv_id FROM public.conversations WHERE team_id = OLD.team_id AND is_team = true;
    IF conv_id IS NOT NULL THEN
        -- Delete from conversation_members
        DELETE FROM public.conversation_members
        WHERE conversation_id = conv_id AND user_id = OLD.user_id;
        
        -- Insert a system message
        SELECT name INTO m_name FROM public.profiles WHERE id = OLD.user_id;
        IF m_name IS NULL THEN
            m_name := 'A member';
        END IF;
        INSERT INTO public.messages (conversation_id, sender_id, content)
        VALUES (conv_id, OLD.user_id, 'system:' || m_name || ' left the team.');
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function 3: Handle sending notifications to offline/online members on new messages
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
    conv_is_team BOOLEAN;
    conv_team_id UUID;
    conv_name TEXT;
    sender_name TEXT;
    notif_title TEXT;
    notif_desc TEXT;
    mem RECORD;
BEGIN
    -- Skip system messages
    IF NEW.content LIKE 'system:%' THEN
        RETURN NEW;
    END IF;

    -- Get conversation info
    SELECT is_team, team_id INTO conv_is_team, conv_team_id FROM public.conversations WHERE id = NEW.conversation_id;
    
    -- Get sender name
    SELECT name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
    IF sender_name IS NULL THEN
        sender_name := 'Someone';
    END IF;

    -- Determine notification title and description
    IF conv_is_team THEN
        SELECT name INTO conv_name FROM public.teams WHERE id = conv_team_id;
        notif_title := 'New Message in ' || COALESCE(conv_name, 'Team');
        notif_desc := sender_name || ': ' || LEFT(NEW.content, 50);
    ELSE
        notif_title := 'New Message from ' || sender_name;
        notif_desc := LEFT(NEW.content, 60);
    END IF;

    -- Insert notifications for all other conversation members
    FOR mem IN 
        SELECT user_id FROM public.conversation_members 
        WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
    LOOP
        INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label, is_read)
        VALUES (
            mem.user_id,
            'message',
            notif_title,
            notif_desc,
            CASE WHEN conv_is_team THEN '/messages?team_id=' || conv_team_id ELSE '/messages?user_id=' || NEW.sender_id END,
            'Reply',
            false
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function 4: Handle notifications for team_requests inserts and updates
CREATE OR REPLACE FUNCTION public.handle_team_request_change()
RETURNS TRIGGER AS $$
DECLARE
    t_name TEXT;
    s_name TEXT; -- Sender name
    r_name TEXT; -- Receiver name
    mem RECORD;
BEGIN
    -- Get team name
    SELECT name INTO t_name FROM public.teams WHERE id = NEW.team_id;
    -- Get sender name
    SELECT name INTO s_name FROM public.profiles WHERE id = NEW.sender_id;
    -- Get receiver name
    SELECT name INTO r_name FROM public.profiles WHERE id = NEW.receiver_id;
    
    IF TG_OP = 'INSERT' THEN
        IF NEW.request_type = 'invite' THEN
            -- User A (sender_id) invites User B (receiver_id)
            INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label)
            VALUES (
                NEW.receiver_id,
                'team_invite',
                'Team Invitation',
                s_name || ' invited you to join Team ' || COALESCE(t_name, 'Alpha') || ' as ' || COALESCE(NEW.role, 'Developer') || '.',
                '/my-requests',
                'View Invites'
            );
        ELSIF NEW.request_type = 'join_request' THEN
            -- User B (sender_id, applicant) applies to join a team led by User A (receiver_id)
            INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label)
            VALUES (
                NEW.receiver_id,
                'join_request',
                'New Join Request',
                s_name || ' applied to join ' || COALESCE(t_name, 'Alpha') || ' as ' || COALESCE(NEW.role, 'Developer') || '.',
                '/my-requests',
                'Review Request'
            );
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle Accept / Reject status updates
        IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            IF NEW.request_type = 'invite' THEN
                -- User B (receiver_id, e.g. "John") accepted invite from User A (sender_id)
                -- Notify sender (User A)
                INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label)
                VALUES (
                    NEW.sender_id,
                    'invite_accepted',
                    'Invitation Accepted',
                    r_name || ' accepted the invitation and joined Team ' || COALESCE(t_name, 'Alpha') || '.',
                    '/my-teams',
                    'Open Workspace'
                );
                
                -- Notify existing team members
                FOR mem IN 
                    SELECT user_id FROM public.team_members 
                    WHERE team_id = NEW.team_id AND user_id != NEW.receiver_id AND user_id != NEW.sender_id
                LOOP
                    INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label)
                    VALUES (
                        mem.user_id,
                        'team_update',
                        'New Teammate Joined',
                        r_name || ' accepted the invitation and joined Team ' || COALESCE(t_name, 'Alpha') || '.',
                        '/my-teams',
                        'Open Workspace'
                    );
                END LOOP;
            ELSIF NEW.request_type = 'join_request' THEN
                -- User B (sender_id, applicant) request accepted by Leader A (receiver_id)
                -- Notify applicant (sender_id)
                INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label)
                VALUES (
                    NEW.sender_id,
                    'invite_accepted',
                    'Request Approved!',
                    'Your request to join Team ' || COALESCE(t_name, 'Alpha') || ' was approved.',
                    '/my-teams',
                    'Open Workspace'
                );

                -- Notify Team Leader (receiver_id)
                INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label)
                VALUES (
                    NEW.receiver_id,
                    'team',
                    'Request Approved',
                    'You approved the request for ' || s_name || ' to join Team ' || COALESCE(t_name, 'Alpha') || '.',
                    '/my-teams',
                    'Open Workspace'
                );
                
                -- Notify existing team members
                FOR mem IN 
                    SELECT user_id FROM public.team_members 
                    WHERE team_id = NEW.team_id AND user_id != NEW.sender_id AND user_id != NEW.receiver_id
                LOOP
                    INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label)
                    VALUES (
                        mem.user_id,
                        'team_update',
                        'New Teammate Joined',
                        s_name || ' joined Team ' || COALESCE(t_name, 'Alpha') || '.',
                        '/my-teams',
                        'Open Workspace'
                    );
                END LOOP;
            END IF;
        ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
            IF NEW.request_type = 'invite' THEN
                -- User B (receiver_id) declined invite from User A (sender_id)
                -- Notify sender (User A)
                INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label)
                VALUES (
                    NEW.sender_id,
                    'invite_rejected',
                    'Invitation Declined',
                    r_name || ' declined the invitation to join Team ' || COALESCE(t_name, 'Alpha') || '.',
                    '/discover-teams',
                    'Find Teammates'
                );
            ELSIF NEW.request_type = 'join_request' THEN
                -- Leader A (receiver_id) declined request from User B (sender_id)
                -- Notify applicant (sender_id)
                INSERT INTO public.notifications (user_id, type, title, description, action_url, action_label)
                VALUES (
                    NEW.sender_id,
                    'invite_rejected',
                    'Application Declined',
                    'Your request to join Team ' || COALESCE(t_name, 'Alpha') || ' was declined.',
                    '/discover-teams',
                    'Browse Teams'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger Functions to tables
CREATE TRIGGER on_team_member_added
    AFTER INSERT ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_team_member_added();

CREATE TRIGGER on_team_member_removed
    AFTER DELETE ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_team_member_removed();

CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();

CREATE TRIGGER on_team_request_change
    AFTER INSERT OR UPDATE ON public.team_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_team_request_change();

-- 8. Enable RLS and define policies for public.hackathons table
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for all authenticated users on hackathons" 
    ON public.hackathons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for all authenticated users on hackathons" 
    ON public.hackathons FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for owners on hackathons" 
    ON public.hackathons FOR UPDATE TO authenticated 
    USING (
        (description LIKE '%"owner_id":"' || auth.uid()::text || '"%')
    ) 
    WITH CHECK (
        (description LIKE '%"owner_id":"' || auth.uid()::text || '"%')
    );

CREATE POLICY "Allow delete for owners on hackathons" 
    ON public.hackathons FOR DELETE TO authenticated 
    USING (
        (description LIKE '%"owner_id":"' || auth.uid()::text || '"%')
    );

-- 9. Fix notifications check constraint restriction if present
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;


