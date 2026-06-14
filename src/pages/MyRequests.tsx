import { useState, useEffect } from "react";
import { CheckCircle, X, Clock, Eye, Send, Users, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: Clock },
  accepted: { label: "Accepted", color: "#22C55E", bg: "rgba(34,197,94,0.12)", icon: CheckCircle },
  rejected: { label: "Rejected", color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: X },
  withdrawn: { label: "Withdrawn", color: "#9CA3AF", bg: "rgba(156,163,175,0.12)", icon: X },
};

type RequestStatus = keyof typeof STATUS_CONFIG;

export default function MyRequests() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"sent" | "received" | "live">("received");
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [liveRequests, setLiveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: sentData, error: sentErr } = await supabase
        .from("team_requests")
        .select("*, teams (name, hackathon_id)")
        .eq("user_id", user.id);
      
      if (sentErr) throw sentErr;

      const { data: hackathonsData } = await supabase
        .from("hackathons")
        .select("id, title");
      const hackonMap = (hackathonsData || []).reduce((acc: any, h: any) => {
        acc[h.id] = h.title;
        return acc;
      }, {});

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
        teamName: r.teams?.name || "Quantum Coders",
        hackathon: hackonMap[r.teams?.hackathon_id] || "AI Innovation Challenge",
        role: r.role || "Developer",
        date: new Date(r.created_at).toLocaleDateString(),
        status: r.status,
        leader: sentLeaderMap[r.team_id] || "Team Leader",
        message: r.message || "",
      }));
      setSentRequests(mappedSent);

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
          .select("*, teams (name, hackathon_id), profiles (id, name, avatar_url, github_avatar, linkedin_avatar)")
          .in("team_id", ledTeamIds)
          .eq("status", "pending");
        if (recErr) throw recErr;

        const mappedReceived = (receivedData || []).map((r: any) => {
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          return {
            id: r.id,
            teamId: r.team_id,
            userId: r.user_id,
            teamName: r.teams?.name || "My Team",
            leader: profile?.name || "Applicant",
            hackathon: hackonMap[r.teams?.hackathon_id] || "AI Innovation Challenge",
            role: r.role || "Developer",
            message: r.message || "",
            date: new Date(r.created_at).toLocaleDateString(),
            matchScore: 92,
            leaderAvatar: profile?.linkedin_avatar || profile?.github_avatar || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name || 'builder'}`,
          };
        });
        setReceivedRequests(mappedReceived);
      } else {
        setReceivedRequests([]);
      }

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
            requiredRole: "Developer",
            members: stats.members,
            maxMembers: t.max_members || 4,
            location: "Online",
            matchScore: 88 + (idx * 3) % 11,
            isOnline: true,
            teamLeader: stats.leader,
            hackathon: hackonMap[t.hackathon_id] || "AI Innovation Challenge",
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

  const handleAccept = async (req: any) => {
    try {
      const { error: reqErr } = await supabase
        .from("team_requests")
        .update({ status: "accepted" })
        .eq("id", req.id);
      if (reqErr) throw reqErr;

      const { error: memErr } = await supabase
        .from("team_members")
        .insert({
          team_id: req.teamId,
          user_id: req.userId,
          role: req.role || "Developer"
        });
      if (memErr) throw memErr;

      toast.success(`Accepted request! They have joined ${req.teamName} 🎉`);
      loadRequests();
    } catch (err) {
      console.error("Error accepting request:", err);
      toast.error("Failed to accept request.");
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

      toast.success("Request withdrawn");
      loadRequests();
    } catch (err) {
      console.error("Error withdrawing request:", err);
      toast.error("Failed to withdraw request.");
    }
  };

  const handleApply = async (req: any) => {
    try {
      const { error } = await supabase
        .from("team_requests")
        .insert({
          team_id: req.id,
          user_id: user?.id,
          role: req.requiredRole || "Developer",
          status: "pending",
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
          <h1 className="text-white font-700 text-2xl mb-1">My Requests</h1>
          <p className="text-white/40 text-sm">Manage team invitations and join requests</p>
        </div>
        <button
          onClick={() => toast.info("Please apply to teams through the 'Live Requests' tab.")}
          className="hack-btn-primary"
        >
          <Plus size={16} />
          Create Request
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {[
          { key: "received", label: "Received", count: receivedRequests.length },
          { key: "sent", label: "Sent", count: sentRequests.length },
          { key: "live", label: "Live Requests", count: liveRequests.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className="px-5 py-2.5 rounded-lg text-sm font-600 transition-all flex items-center gap-2"
            style={{
              background: activeTab === tab.key ? "#131826" : "transparent",
              color: activeTab === tab.key ? "white" : "rgba(255,255,255,0.45)",
            }}
          >
            {tab.label}
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-700"
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
          {/* Received Requests */}
          {activeTab === "received" && (
            <div className="space-y-4">
              {receivedRequests.length === 0 ? (
                <div className="text-center py-12 text-white/30 hack-card">No incoming requests received.</div>
              ) : (
                receivedRequests.map((req) => (
                  <div key={req.id} className="hack-card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-hack-primary/20">
                          <img src={req.leaderAvatar} alt={req.leader} className="w-full h-full" />
                        </div>
                        <div>
                          <h3 className="text-white font-700 text-base">{req.teamName}</h3>
                          <div className="text-white/40 text-xs">by {req.leader} · {req.hackathon}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-sm font-700"
                          style={{ color: req.matchScore >= 90 ? "#22C55E" : "#4F7CFF" }}
                        >
                          {req.matchScore}% Match
                        </div>
                        <div className="text-white/30 text-xs">{req.date}</div>
                      </div>
                    </div>

                    <div
                      className="p-3 rounded-xl mb-4 text-sm text-white/60 italic"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      "{req.message}"
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-xs">Role needed:</span>
                        <span className="skill-tag">{req.role}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecline(req)}
                          className="hack-btn-secondary px-4 py-2 text-sm"
                          style={{ color: "rgba(239,68,68,0.7)" }}
                        >
                          <X size={14} />
                          Decline
                        </button>
                        <button
                          onClick={() => handleAccept(req)}
                          className="hack-btn-primary px-5 py-2 text-sm"
                        >
                          <CheckCircle size={14} />
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sent Requests */}
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
                          <h3 className="text-white font-700 text-base">{req.teamName}</h3>
                          <div className="text-white/40 text-xs">
                            {req.hackathon} · Applied for: <span className="text-white/60">{req.role}</span>
                          </div>
                        </div>
                        <span
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600"
                          style={{ background: s.bg, color: s.color }}
                        >
                          <s.icon size={11} />
                          {s.label}
                        </span>
                      </div>

                      <div
                        className="p-3 rounded-xl mb-4 text-xs text-white/50 italic"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
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
                            <button
                              onClick={() => toast.success("Opening team workspace...")}
                              className="hack-btn-primary px-4 py-2 text-xs"
                            >
                              Open Team <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Live Requests */}
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
    </div>
  );
}
