import { supabase } from "@/lib/supabase";
import { MatchProfile } from "./matchService";

export interface ActivityLog {
  id: string;
  userId: string;
  actionType: "Profile Viewed" | "Profile Saved" | "Profile Favorited" | "Invitation Sent" | "Invitation Accepted" | "Invitation Rejected" | "Team Joined" | "Team Left";
  targetId: string;
  targetName: string;
  targetRole?: string;
  createdAt: string;
  metadata?: any;
}

export interface InvitationItem {
  id: string;
  profile: MatchProfile;
  role: string;
  skills: string[];
  dateSent: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  responseDate?: string;
}

export const matchHistoryService = {
  // 1. Log activity to localStorage (isolated per user)
  logActivity(
    userId: string,
    actionType: ActivityLog["actionType"],
    targetId: string,
    targetName: string,
    targetRole?: string,
    metadata?: any
  ): void {
    if (!userId) return;

    const key = `hackos_match_activities_${userId}`;
    const localLogs = localStorage.getItem(key);
    const logs: ActivityLog[] = localLogs ? JSON.parse(localLogs) : [];

    const newLog: ActivityLog = {
      id: `${actionType.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      actionType,
      targetId,
      targetName,
      targetRole,
      createdAt: new Date().toISOString(),
      metadata
    };

    logs.unshift(newLog); // Prepend to show newest first
    localStorage.setItem(key, JSON.stringify(logs.slice(0, 100))); // Keep last 100 activities

    // Real-time notification broadcast trigger
    const channel = supabase.channel(`match-history-sync:${userId}`);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "activity_logged",
          payload: newLog
        });
      }
    });
  },

  // 2. Fetch local activity timeline
  getLocalActivities(userId: string): ActivityLog[] {
    if (!userId) return [];
    const key = `hackos_match_activities_${userId}`;
    const localLogs = localStorage.getItem(key);
    return localLogs ? JSON.parse(localLogs) : [];
  },

  // 3. Clear local activities
  clearLocalActivities(userId: string): void {
    if (!userId) return;
    localStorage.removeItem(`hackos_match_activities_${userId}`);
  },

  // 4. Send Team Invitation (creates team workspace if necessary)
  async sendTeammateInvitation(
    senderId: string,
    receiverId: string,
    role?: string,
    message?: string
  ): Promise<InvitationItem | null> {
    try {
      const teamId = await this.ensureUserTeam(senderId);
      if (!teamId) throw new Error("Could not find or create a team to invite the user to.");

      // Fetch receiver details
      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("name, role, avatar_url, github_avatar, linkedin_avatar, location, trust_score, rating")
        .eq("id", receiverId)
        .single();
      
      if (pErr || !p) throw new Error("Could not load target profile details.");

      const targetRole = role || p.role || "Developer";

      // Fetch target user's skills
      const { data: skillsData } = await supabase
        .from("user_skills")
        .select("skills (name)")
        .eq("user_id", receiverId);
      const skills = skillsData ? skillsData.map((row: any) => row.skills?.name).filter(Boolean) : [];

      // Check if invitation already exists
      const { data: existingInvite } = await supabase
        .from("team_requests")
        .select("id, status")
        .eq("sender_id", senderId)
        .eq("receiver_id", receiverId)
        .eq("team_id", teamId)
        .eq("request_type", "invite")
        .maybeSingle();

      let inviteId = "";
      let status = "pending";

      if (existingInvite) {
        inviteId = existingInvite.id;
        status = existingInvite.status;
      } else {
        // Create team request invite
        const { data: newInvite, error: inviteErr } = await supabase
          .from("team_requests")
          .insert({
            sender_id: senderId,
            receiver_id: receiverId,
            team_id: teamId,
            request_type: "invite",
            status: "pending",
            role: targetRole,
            message: message || "Hi! We'd love for you to join our hackathon team and build together."
          })
          .select("id")
          .single();

        if (inviteErr || !newInvite) throw inviteErr;
        inviteId = newInvite.id;
      }

      // Send DB notification
      await supabase.from("notifications").insert({
        user_id: receiverId,
        type: "team_invite",
        title: "Team Invitation",
        description: `You have been invited to join a team as a ${targetRole}.`,
        action_url: "/my-requests",
        action_label: "View Invites"
      });

      // Log interaction in timeline
      this.logActivity(senderId, "Invitation Sent", receiverId, p.name, targetRole);

      const profile: MatchProfile = {
        id: receiverId,
        name: p.name,
        role: p.role || "Full Stack Developer",
        location: p.location || "Online",
        avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
        trustScore: p.trust_score || 25,
        rating: Number(p.rating) || 5.0,
        skills: skills,
        isOnline: true,
        matchScore: 90
      };

      return {
        id: inviteId,
        profile,
        role: targetRole,
        skills,
        dateSent: new Date().toISOString(),
        status: status as any
      };
    } catch (err) {
      console.error("Error sending teammate invitation:", err);
      return null;
    }
  },

  // Helper to ensure the user has a team (auto-creates if none exists)
  async ensureUserTeam(userId: string): Promise<string | null> {
    // Check if user leads any team
    const { data: leaderTeams } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .eq("role", "leader");

    if (leaderTeams && leaderTeams.length > 0) {
      return leaderTeams[0].team_id;
    }

    // Check if user is in any team
    const { data: memberTeams } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId);

    if (memberTeams && memberTeams.length > 0) {
      return memberTeams[0].team_id;
    }

    // Auto-create a default squad
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();
    const userName = userProfile?.name || "Builder";

    // Find first open hackathon
    const { data: hackathons } = await supabase
      .from("hackathons")
      .select("id")
      .eq("status", "open")
      .limit(1);
    
    let hackathonId = hackathons?.[0]?.id;
    if (!hackathonId) {
      const { data: anyHack } = await supabase.from("hackathons").select("id").limit(1);
      hackathonId = anyHack?.[0]?.id;
    }

    if (!hackathonId) {
      hackathonId = "f3277d4c-07fa-4c24-9ea5-3c65513f7806"; // Fallback seed ID
    }

    // Insert new team
    const { data: newTeam, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: `${userName}'s Squad`,
        hackathon_id: hackathonId,
        max_members: 4,
        status: "recruiting",
        description: "Teammates recruited via HackOS Matchmaking.",
        color: "#7C5CFF",
        icon: "🚀"
      })
      .select("id")
      .single();

    if (teamError || !newTeam) {
      console.error("Failed to auto-create team:", teamError);
      return null;
    }

    // Insert leader membership
    await supabase.from("team_members").insert({
      team_id: newTeam.id,
      user_id: userId,
      role: "leader"
    });

    return newTeam.id;
  },

  // 5. Gather all categories data
  async getCategorizedMatches(userId: string) {
    // 1. Fetch swipes
    const { data: swipes } = await supabase
      .from("match_swipes")
      .select("*")
      .eq("swiper_id", userId);

    // 2. Fetch saves
    const { data: saves } = await supabase
      .from("match_saves")
      .select("*")
      .eq("user_id", userId);

    // 3. Fetch team invitations (where user is sender)
    const { data: invites } = await supabase
      .from("team_requests")
      .select("*, profiles!receiver_id(*)")
      .eq("sender_id", userId)
      .eq("request_type", "invite");

    // 4. Fetch team members (where user leads the team)
    const { data: ledTeams } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .eq("role", "leader");

    let teamMembersList: any[] = [];
    if (ledTeams && ledTeams.length > 0) {
      const teamIds = ledTeams.map(lt => lt.team_id);
      const { data: members } = await supabase
        .from("team_members")
        .select("*, profiles(*)")
        .in("team_id", teamIds)
        .neq("user_id", userId);
      teamMembersList = members || [];
    }

    return {
      swipes: swipes || [],
      saves: saves || [],
      invites: invites || [],
      teamMembers: teamMembersList
    };
  }
};
