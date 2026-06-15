-- 1. Recreate team_requests table with correct columns (sender_id, receiver_id, request_type)
DROP TABLE IF EXISTS public.team_requests CASCADE;

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

-- Enable RLS and add policies for team_requests
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for all authenticated users on team_requests" 
    ON public.team_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for all authenticated users on team_requests" 
    ON public.team_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update/delete for all authenticated users on team_requests" 
    ON public.team_requests FOR ALL TO authenticated USING (true);

-- Recreate trigger function and bind it to team_requests
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

CREATE TRIGGER on_team_request_change
    AFTER INSERT OR UPDATE ON public.team_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_team_request_change();

-- 2. Fix infinite recursion in RLS policies for chat and messages (conversation_members relation)
DROP POLICY IF EXISTS "Allow select/insert/update for all authenticated users on conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow select/insert/update/delete for all authenticated users on conversation_members" ON public.conversation_members;
DROP POLICY IF EXISTS "Allow select/insert/update/delete for all authenticated users on messages" ON public.messages;

CREATE POLICY "Allow select/insert/update for all authenticated users on conversations" 
    ON public.conversations FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow select/insert/update/delete for all authenticated users on conversation_members" 
    ON public.conversation_members FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow select/insert/update/delete for all authenticated users on messages" 
    ON public.messages FOR ALL TO authenticated USING (true);

-- 3. Fix notifications table type check constraint restriction
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

