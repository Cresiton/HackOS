import { useState, useEffect } from "react";
import { CheckCircle, X, Clock, Eye, Send, Users, ArrowRight, Plus, Sparkles, Shield, Mail, MapPin, Loader2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: Clock },
  accepted: { label: "Accepted", color: "#22C55E", bg: "rgba(34,197,94,0.12)", icon: CheckCircle },
  rejected: { label: "Declined", color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: X },
  withdrawn: { label: "Withdrawn", color: "#9CA3AF", bg: "rgba(156,163,175,0.12)", icon: X },
};

type RequestStatus = keyof typeof STATUS_CONFIG;

export default function MyRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tabs
  // "received" = requests sent by other users to teams I lead (direction: user_to_team)
  // "invites" = invitations sent by other teams to me (direction: team_to_user)
  // "sent" = applications sent by me to other teams (direction: user_to_team)
  const [activeTab, setActiveTab] = useState<"received" | "invites" | "sent" | "live">("received");
  
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<any[]>([]);
  const [liveRequests, setLiveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal state
  const [reviewingRequest, setReviewingRequest] = useState<any | null>(null);
  const [applicantProfile, setApplicantProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch hackathons for title lookup map
      const { data: hackathonsData } = await supabase
        .from("hackathons")
        .select("id, title");
      const hackonMap = (hackathonsData || []).reduce((acc: any, h: any) => {
        acc[h.id] = h.title;
        return acc;
      }, {});

      // 1. Sent requests: Applications sent by me to join teams (request_type: join_request)
      const { data: sentData, error: sentErr } = await supabase
        .from("team_requests")
        .select("*, teams (name, hackathon_id)")
        .eq("sender_id", user.id)
        .eq("request_type", "join_request");
      
      if (sentErr) throw sentErr;

      const sentTeamIds = (sentData || []).map((r: any) => r.team_id).filter(Boolean);
      let sentLeaderMap: Record<string, string> = {};
      if (sentTeamIds.length > 0) {
        const { data: sentLeaders } = await supabase
          .from("team_members")
          .select("team_id, profiles (name)")
          .eq("role", "leader")
          .in("team_id", sentTeamIds);
        
        if (sentLeaders) {
          sentLeaders.forEach((sl: any) => {
            const profile = Array.isArray(sl.profiles) ? sl.profiles[0] : sl.profiles;
            if (profile) sentLeaderMap[sl.team_id] = profile.name;
          });
        }
      }

      const mappedSent = (sentData || []).map((r: any) => ({
        id: r.id,
        teamId: r.team_id,
        teamName: r.teams?.name || "Quantum Coders",
        hackathon: hackonMap[r.teams?.hackathon_id] || "External / Personal Collab",
        role: r.role || "Developer",
        date: new Date(r.created_at).toLocaleDateString(),
        status: r.status,
        leader: sentLeaderMap[r.team_id] || "Team Leader",
        message: r.message || "",
      }));
      setSentRequests(mappedSent);

      // 2. Invites: Invitations sent by other teams to me (request_type: invite)
      const { data: invitesData, error: invitesErr } = await supabase
        .from("team_requests")
        .select("*, teams (name, hackathon_id)")
        .eq("receiver_id", user.id)
        .eq("request_type", "invite");
      
      if (invitesErr) throw invitesErr;

      const invitesTeamIds = (invitesData || []).map((r: any) => r.team_id).filter(Boolean);
      let invitesLeaderMap: Record<string, any> = {};
      if (invitesTeamIds.length > 0) {
        const { data: invitesLeaders } = await supabase
          .from("team_members")
          .select("team_id, profiles (name, avatar_url, github_avatar, linkedin_avatar)")
          .eq("role", "leader")
          .in("team_id", invitesTeamIds);
        
        if (invitesLeaders) {
          invitesLeaders.forEach((sl: any) => {
            const profile = Array.isArray(sl.profiles) ? sl.profiles[0] : sl.profiles;
            if (profile) {
              invitesLeaderMap[sl.team_id] = {
                name: profile.name,
                avatar: profile.linkedin_avatar || profile.github_avatar || profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`
              };
            }
          });
        }
      }

      const mappedInvites = (invitesData || []).map((r: any) => ({
        id: r.id,
        teamId: r.team_id,
        teamName: r.teams?.name || "Quantum Coders",
        hackathon: hackonMap[r.teams?.hackathon_id] || "External / Personal Collab",
        role: r.role || "Developer",
        date: new Date(r.created_at).toLocaleDateString(),
        status: r.status,
        leader: invitesLeaderMap[r.team_id]?.name || "Team Leader",
        leaderAvatar: invitesLeaderMap[r.team_id]?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.team_id}`,
        message: r.message || "",
      }));
      setReceivedInvites(mappedInvites);

      // 3. Received requests: Applications sent by other users to teams I lead (request_type: join_request)
      const { data: ledTeams, error: ledErr } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("role", "leader");
      
      if (ledErr) throw ledErr;

      if (ledTeams && ledTeams.length > 0) {
        const ledTeamIds = ledTeams.map((t: any) => t.team_id);
        const { data: receivedData, error: recErr } = await supabase
          .from("team_requests")
          .select("*, teams (name, hackathon_id), profiles:sender_id (*)")
          .in("team_id", ledTeamIds)
          .eq("receiver_id", user.id)
          .eq("request_type", "join_request");
        
        if (recErr) throw recErr;

        const mappedReceived = (receivedData || []).map((r: any) => {
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          return {
            id: r.id,
            teamId: r.team_id,
            userId: r.sender_id,
            teamName: r.teams?.name || "My Team",
            applicantName: profile?.name || "Applicant",
            hackathon: hackonMap[r.teams?.hackathon_id] || "External / Personal Collab",
            role: r.role || "Developer",
            message: r.message || "",
            status: r.status,
            date: new Date(r.created_at).toLocaleDateString(),
            matchScore: profile?.trust_score ? Math.min(98, 70 + (profile.trust_score * 0.3)) : 80,
            avatar: profile?.linkedin_avatar || profile?.github_avatar || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name || 'builder'}`,
          };
        });
        setReceivedRequests(mappedReceived);
      } else {
        setReceivedRequests([]);
      }

      // 4. Live Recruiting Teams
      const { data: allRecruitingTeams } = await supabase
        .from("teams")
        .select("*")
        .eq("status", "recruiting");

      if (allRecruitingTeams) {
        const { data: userMemberships } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id);
        const joinedTeamIds = (userMemberships || []).map(m => m.team_id);

        const recruitingTeams = allRecruitingTeams.filter(t => !joinedTeamIds.includes(t.id));
        const recTeamIds = recruitingTeams.map(t => t.id);

        let teamMembersMap: Record<string, { members: number, leader: string, avatars: string[] }> = {};
        if (recTeamIds.length > 0) {
          const { data: memberships } = await supabase
            .from("team_members")
            .select("team_id, role, profiles (name, avatar_url, github_avatar, linkedin_avatar)")
            .in("team_id", recTeamIds);
          
          if (memberships) {
            memberships.forEach((m: any) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              if (!teamMembersMap[m.team_id]) {
                teamMembersMap[m.team_id] = { members: 0, leader: "Leader", avatars: [] };
              }
              teamMembersMap[m.team_id].members++;
              if (m.role === "leader" && profile) {
                teamMembersMap[m.team_id].leader = profile.name;
              }
              if (profile) {
                const av = profile.linkedin_avatar || profile.github_avatar || profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`;
                teamMembersMap[m.team_id].avatars.push(av);
              }
            });
          }
        }

        const mappedLive = recruitingTeams.map((t: any, idx: number) => {
          const stats = teamMembersMap[t.id] || { members: 1, leader: "Leader", avatars: [] };
          return {
            id: t.id,
            teamName: t.name,
            requiredRole: "Contributor",
            members: stats.members,
            maxMembers: t.max_members || 4,
            location: "Online",
            matchScore: 88 + (idx * 3) % 11,
            isOnline: true,
            teamLeader: stats.leader,
            hackathon: hackonMap[t.hackathon_id] || "External / Personal Collab",
            color: t.color || "#7C5CFF",
            icon: t.icon || "🎯",
            avatars: stats.avatars,
            extraMembers: Math.max(0, stats.members - 3),
          };
        });
        setLiveRequests(mappedLive);
      }
    } catch (err) {
      console.error("Error loading requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

  // Open applicant profile details modal
  const handleReviewRequest = async (req: any) => {
    setReviewingRequest(req);
    setLoadingProfile(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", req.userId)
        .single();
      
      const { data: skillsData } = await supabase
        .from("user_skills")
        .select("skills (name)")
        .eq("user_id", req.userId);

      const skills = skillsData ? skillsData.map((us: any) => us.skills?.name).filter(Boolean) : [];

      const { data: exp } = await supabase
        .from("user_experience")
        .select("*")
        .eq("user_id", req.userId);

      const { data: projects } = await supabase
        .from("user_projects")
        .select("*")
        .eq("user_id", req.userId);

      setApplicantProfile({
        ...profile,
        skills,
        experiences: exp || [],
        projects: projects || []
      });
    } catch (err) {
      console.error("Error fetching applicant details:", err);
      toast.error("Failed to load applicant profile.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAccept = async (req: any) => {
    try {
      // Rule: Check capacity
      const { data: team, error: teamErr } = await supabase
        .from("teams")
        .select("max_members")
        .eq("id", req.teamId)
        .single();
      
      if (teamErr) throw teamErr;

      const { count: currentCount, error: countErr } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", req.teamId);
      
      if (countErr) throw countErr;

      if (currentCount >= team.max_members) {
        toast.error("Team capacity reached! Request automatically declined.");
        await supabase
          .from("team_requests")
          .update({ status: "rejected" })
          .eq("id", req.id);
        
        setReviewingRequest(null);
        loadRequests();
        return;
      }

      // Add to team members
      const { error: memErr } = await supabase
        .from("team_members")
        .insert({
          team_id: req.teamId,
          user_id: req.userId,
          role: req.role || "Developer"
        });
      if (memErr) throw memErr;

      // Update team request
      const { error: reqErr } = await supabase
        .from("team_requests")
        .update({ status: "accepted" })
        .eq("id", req.id);
      if (reqErr) throw reqErr;

      toast.success(`Accepted request! ${req.applicantName || "Builder"} has joined ${req.teamName} 🎉`);
      setReviewingRequest(null);
      loadRequests();
    } catch (err: any) {
      console.error("Error accepting request:", err);
      toast.error(err.message || "Failed to accept request.");
    }
  };

  const handleDecline = async (req: any) => {
    try {
      const { error } = await supabase
        .from("team_requests")
        .update({ status: "rejected" })
        .eq("id", req.id);
      
      if (error) throw error;

      toast.success(`Declined request for ${req.teamName}`);
      setReviewingRequest(null);
      loadRequests();
    } catch (err) {
      console.error("Error declining request:", err);
      toast.error("Failed to decline request.");
    }
  };

  const handleWithdraw = async (req: any) => {
    try {
      const { error } = await supabase
        .from("team_requests")
        .update({ status: "withdrawn" })
        .eq("id", req.id);
      if (error) throw error;

      toast.success("Request withdrawn successfully.");
      loadRequests();
    } catch (err) {
      console.error("Error withdrawing request:", err);
      toast.error("Failed to withdraw request.");
    }
  };

  const handleAcceptInvite = async (req: any) => {
    try {
      // 1. Verify capacity of team
      const { data: team, error: teamErr } = await supabase
        .from("teams")
        .select("max_members")
        .eq("id", req.teamId)
        .single();
      if (teamErr) throw teamErr;

      const { count: currentCount } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", req.teamId);

      if (currentCount >= team.max_members) {
        toast.error("Team capacity reached. Cannot join this team.");
        return;
      }

      // 2. Add to team members
      const { error: memErr } = await supabase
        .from("team_members")
        .insert({
          team_id: req.teamId,
          user_id: user?.id,
          role: req.role || "Developer"
        });
      if (memErr) throw memErr;

       // 3. Set request accepted
      const { error: reqErr } = await supabase
        .from("team_requests")
        .update({ status: "accepted" })
        .eq("id", req.id);
      if (reqErr) throw reqErr;

      toast.success(`Congratulations! You are now a member of Team ${req.teamName} 🎉`);
      loadRequests();
    } catch (err: any) {
      console.error("Error accepting team invitation:", err);
      toast.error(err.message || "Failed to join team.");
    }
  };

  const handleDeclineInvite = async (req: any) => {
    try {
      const { error } = await supabase
        .from("team_requests")
        .update({ status: "rejected" })
        .eq("id", req.id);
      if (error) throw error;

      toast.success("Invitation declined.");
      loadRequests();
    } catch (err) {
      console.error("Error declining invitation:", err);
      toast.error("Failed to decline invitation.");
    }
  };

  const handleApply = async (req: any) => {
    try {
      // 1. Get leader
      const { data: leaderMember, error: leaderErr } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", req.id)
        .eq("role", "leader")
        .maybeSingle();

      if (leaderErr || !leaderMember) {
        throw new Error("Could not find team leader.");
      }

      // 2. Insert team request
      const { error } = await supabase
        .from("team_requests")
        .insert({
          team_id: req.id,
          sender_id: user?.id,
          receiver_id: leaderMember.user_id,
          role: req.requiredRole || "Contributor",
          status: "pending",
          request_type: "join_request",
          message: "I am excited to contribute my skills to your team!"
        });
      if (error) throw error;

      toast.success(`Request sent to ${req.teamName}!`);
      loadRequests();
    } catch (err) {
      console.error("Error applying to team:", err);
      toast.error("Failed to send join request.");
    }
  };

  return (
    <div className="p-6 lg:p-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-800 text-2xl md:text-3xl mb-1">Requests Workspace</h1>
          <p className="text-white/40 text-sm">Manage team invitations, applications, and builder recruitment</p>
        </div>
        <Link to="/create-team" className="hack-btn-primary">
          <Plus size={16} />
          Create Team
        </Link>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {[
          { key: "received", label: "Join Requests (Leader)", count: receivedRequests.filter(r => r.status === 'pending').length },
          { key: "invites", label: "Invitations (Builder)", count: receivedInvites.filter(r => r.status === 'pending').length },
          { key: "sent", label: "Sent Applications", count: sentRequests.length },
          { key: "live", label: "Recruiting Teams", count: liveRequests.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className="px-5 py-2.5 rounded-lg text-xs font-700 transition-all flex items-center gap-2"
            style={{
              background: activeTab === tab.key ? "#131826" : "transparent",
              color: activeTab === tab.key ? "white" : "rgba(255,255,255,0.45)",
            }}
          >
            {tab.label}
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-700"
              style={{
                background: activeTab === tab.key ? "rgba(124,92,255,0.2)" : "rgba(255,255,255,0.08)",
                color: activeTab === tab.key ? "#A78BFF" : "rgba(255,255,255,0.4)",
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40">Loading requests...</div>
      ) : (
        <>
          {/* TAB 1: JOIN REQUESTS RECEIVED (As Leader) */}
          {activeTab === "received" && (
            <div className="space-y-4">
              {receivedRequests.length === 0 ? (
                <div className="text-center py-12 text-white/30 hack-card">No incoming requests received.</div>
              ) : (
                receivedRequests.map((req) => (
                  <div key={req.id} className="hack-card p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-hack-primary/20">
                          <img src={req.avatar} alt={req.applicantName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h3 className="text-white font-700 text-base">{req.applicantName}</h3>
                          <div className="text-white/40 text-xs">Applying to <strong className="text-white/60">{req.teamName}</strong> · {req.hackathon}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-xs font-700 px-2 py-0.5 rounded bg-hack-green/10 text-hack-green inline-block mb-1"
                        >
                          {req.matchScore}% Match
                        </div>
                        <div className="text-white/30 text-xs">{req.date}</div>
                      </div>
                    </div>

                    <div
                      className="p-3 rounded-xl mb-4 text-sm text-white/60 italic"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      "{req.message || "No message provided."}"
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-xs font-500">Applying as:</span>
                        <span className="tag text-xs font-600 bg-hack-primary/10 border-hack-primary/20 text-hack-primary">{req.role}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewRequest(req)}
                          className="hack-btn-secondary px-4 py-2 text-xs"
                        >
                          <Eye size={12} />
                          Review Profile
                        </button>
                        <button
                          onClick={() => handleDecline(req)}
                          className="hack-btn-secondary px-4 py-2 text-xs hover:text-hack-red"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAccept(req)}
                          className="hack-btn-primary px-5 py-2 text-xs"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: INVITATIONS RECEIVED (As Builder) */}
          {activeTab === "invites" && (
            <div className="space-y-4">
              {receivedInvites.length === 0 ? (
                <div className="text-center py-12 text-white/30 hack-card">No team invitations received.</div>
              ) : (
                receivedInvites.map((req) => {
                  const s = STATUS_CONFIG[req.status as RequestStatus] || STATUS_CONFIG.pending;
                  return (
                    <div key={req.id} className="hack-card p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-hack-primary/20">
                            <img src={req.leaderAvatar} alt={req.leader} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h3 className="text-white font-700 text-base">Invitation from Team {req.teamName}</h3>
                            <div className="text-white/40 text-xs">Leader: {req.leader} · Event: {req.hackathon}</div>
                          </div>
                        </div>
                        <span
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-600 capitalize"
                          style={{ background: s.bg, color: s.color }}
                        >
                          <s.icon size={10} />
                          {s.label}
                        </span>
                      </div>

                      <div
                        className="p-3 rounded-xl mb-4 text-xs text-white/50 italic"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        "{req.message || "We would love to have you on our team!"}"
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-xs">Role Offered:</span>
                          <span className="tag text-xs bg-hack-orange/10 border-hack-orange/20 text-hack-orange">{req.role}</span>
                        </div>
                        <div className="flex gap-2">
                          {req.status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleDeclineInvite(req)}
                                className="hack-btn-secondary px-4 py-2 text-xs hover:text-hack-red"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleAcceptInvite(req)}
                                className="hack-btn-primary px-5 py-2 text-xs"
                              >
                                Accept Join
                              </button>
                            </>
                          ) : req.status === "accepted" ? (
                            <Link to="/my-teams">
                              <button className="hack-btn-primary px-4 py-2 text-xs">
                                Go to Workspace
                              </button>
                            </Link>
                          ) : (
                            <span className="text-white/30 text-xs italic capitalize">{req.status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: SENT APPLICATIONS */}
          {activeTab === "sent" && (
            <div className="space-y-4">
              {sentRequests.length === 0 ? (
                <div className="text-center py-12 text-white/30 hack-card">No requests sent.</div>
              ) : (
                sentRequests.map((req) => {
                  const s = STATUS_CONFIG[req.status as RequestStatus] || STATUS_CONFIG.pending;
                  return (
                    <div key={req.id} className="hack-card p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-700 text-base">Application to {req.teamName}</h3>
                          <div className="text-white/40 text-xs">
                            {req.hackathon} · Applying for role: <span className="text-white/60">{req.role}</span>
                          </div>
                        </div>
                        <span
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 capitalize"
                          style={{ background: s.bg, color: s.color }}
                        >
                          <s.icon size={11} />
                          {s.label}
                        </span>
                      </div>

                      <div
                        className="p-3 rounded-xl mb-4 text-xs text-white/50 italic"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        "{req.message}"
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-white/30 text-xs">Sent {req.date}</span>
                        <div className="flex gap-2">
                          {req.status === "pending" && (
                            <button
                              onClick={() => handleWithdraw(req)}
                              className="hack-btn-secondary px-4 py-2 text-xs"
                            >
                              Withdraw
                            </button>
                          )}
                          {req.status === "accepted" && (
                            <Link to="/my-teams">
                              <button className="hack-btn-primary px-4 py-2 text-xs">
                                Open Workspace <ArrowRight size={12} />
                              </button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: LIVE RECRUITMENTS */}
          {activeTab === "live" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveRequests.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-white/30 hack-card">No live recruiting teams found.</div>
              ) : (
                liveRequests.map((req) => (
                  <div key={req.id} className="hack-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{req.icon}</span>
                        <h3 className="text-white font-700">{req.teamName}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="status-online" />
                        <span className="text-white/30 text-xs">Live</span>
                      </div>
                    </div>

                    <div
                      className="text-sm font-500 mb-2"
                      style={{ color: req.color || "#7C5CFF" }}
                    >
                      Needs: {req.requiredRole}
                    </div>

                    <div className="text-white/40 text-xs mb-4">
                      {req.members}/{req.maxMembers} Members · {req.location} · {req.hackathon}
                    </div>

                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-700"
                        style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}
                      >
                        {req.matchScore}% Match
                      </div>
                      <button
                        onClick={() => handleApply(req)}
                        className="hack-btn-primary py-2 px-4 text-xs"
                      >
                        <Send size={12} />
                        Apply
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* --- APPLICANT REVIEW PROFILE MODAL --- */}
      {reviewingRequest && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hack-card w-full max-w-2xl p-6 space-y-5 flex flex-col max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <h2 className="text-white font-800 text-lg">Review Applicant Blueprint</h2>
              <button onClick={() => setReviewingRequest(null)} className="text-white/40 hover:text-white/70">✕</button>
            </div>

            {loadingProfile ? (
              <div className="py-12 text-center text-white/40 flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-hack-primary" />
                <span>Loading builder profile...</span>
              </div>
            ) : applicantProfile ? (
              <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                {/* Header card */}
                <div className="p-4 rounded-2xl bg-white/2 border border-white/6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-hack-primary">
                    <img
                      src={applicantProfile.linkedin_avatar || applicantProfile.github_avatar || applicantProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${applicantProfile.name}`}
                      alt={applicantProfile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-white font-700 text-lg flex items-center justify-center sm:justify-start gap-2">
                      {applicantProfile.name}
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-hack-primary/10 border border-hack-primary/20 text-hack-primary font-600">Trust Score: {applicantProfile.trust_score}%</span>
                    </h3>
                    <p className="text-white/50 text-xs">{applicantProfile.role || "Developer"} · {applicantProfile.location || "Online"}</p>
                    <div className="text-[11px] text-white/30 flex items-center justify-center sm:justify-start gap-3">
                      <span>Rating: ★{applicantProfile.rating}</span>
                      <span>College: {applicantProfile.college || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <h4 className="text-white font-600 text-xs uppercase text-white/30 mb-2">About Developer</h4>
                  <p className="text-white/75 text-sm leading-relaxed bg-white/2 border border-white/5 p-3 rounded-xl italic">
                    "{applicantProfile.bio || "No bio added."}"
                  </p>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-white font-600 text-xs uppercase text-white/30 mb-2">Verified Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {applicantProfile.skills.length === 0 ? (
                      <span className="text-white/30 text-xs">No skills listed.</span>
                    ) : (
                      applicantProfile.skills.map((s: string) => (
                        <span key={s} className="tag text-xs font-500">{s}</span>
                      ))
                    )}
                  </div>
                </div>

                {/* Experience */}
                {applicantProfile.experiences.length > 0 && (
                  <div>
                    <h4 className="text-white font-600 text-xs uppercase text-white/30 mb-3">Work & Hackathon Experience</h4>
                    <div className="space-y-3">
                      {applicantProfile.experiences.map((exp: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-white/2 border border-white/5">
                          <div className="text-white font-600 text-xs">{exp.title}</div>
                          <div className="text-[10px] text-white/40">{exp.company} {exp.period ? `· ${exp.period}` : ""}</div>
                          {exp.description && <p className="text-white/50 text-[11px] mt-1.5 leading-relaxed">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {applicantProfile.projects.length > 0 && (
                  <div>
                    <h4 className="text-white font-600 text-xs uppercase text-white/30 mb-3 font-500">Highlight Projects</h4>
                    <div className="space-y-3">
                      {applicantProfile.projects.map((proj: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-1">
                          <div className="text-white font-600 text-xs">{proj.title}</div>
                          <p className="text-white/50 text-[11px] leading-relaxed">{proj.description}</p>
                          {proj.tech_stack && proj.tech_stack.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1.5">
                              {proj.tech_stack.map((t: string) => (
                                <span key={t} className="tag text-[9px] py-0">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Application Message */}
                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-hack-primary font-600 text-xs uppercase mb-2">Applicant's Cover Message</h4>
                  <div className="p-3 rounded-xl bg-hack-primary/5 border border-hack-primary/10 text-white text-xs leading-relaxed">
                    "{reviewingRequest.message || "Hi, I am excited to apply for this role!"}"
                  </div>
                </div>

                {/* Bottom actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleDecline(reviewingRequest)}
                    className="hack-btn-secondary px-5 py-2 hover:text-hack-red"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => handleAccept(reviewingRequest)}
                    className="hack-btn-primary px-6 py-2"
                  >
                    Accept Developer
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-white/40 text-xs">
                Could not load applicant profile.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
