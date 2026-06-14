import { useState, useEffect } from "react";
import {
  Plus, Users, Calendar, ArrowRight, Settings, MessageSquare,
  LayoutGrid, CheckCircle, Clock, Star, ExternalLink
} from "lucide-react";
import { Team } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_CONFIG = {
  recruiting: { label: "Recruiting", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  ready: { label: "Ready", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  active: { label: "Active", color: "#4F7CFF", bg: "rgba(79,124,255,0.12)" },
  completed: { label: "Completed", color: "#9CA3AF", bg: "rgba(156,163,175,0.12)" },
};

const TABS = ["Overview", "Tasks", "Files", "Chat", "Activity"];

function TeamDetailPanel({ team, onClose }: { team: Team; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const status = STATUS_CONFIG[team.status];

  return (
    <div
      className="fixed inset-y-0 right-0 w-[480px] z-50 flex flex-col"
      style={{
        background: "#0E111B",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="p-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: `${team.color}15`, border: `1px solid ${team.color}25` }}
            >
              {team.icon}
            </div>
            <div>
              <h2 className="text-white font-700 text-lg">{team.name}</h2>
              <div className="text-white/40 text-xs">{team.hackathon}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 p-1">✕</button>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1 rounded-full text-xs font-600"
            style={{ background: status.bg, color: status.color }}
          >
            {status.label}
          </span>
          <span className="text-white/40 text-xs">{team.members.length}/{team.maxMembers} Members</span>
          {team.requiredRoles.length > 0 && (
            <span
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}
            >
              Needs: {team.requiredRoles.join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex px-4 pt-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-500 transition-all relative ${
              activeTab === tab ? "text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "#7C5CFF" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "Overview" && (
          <div className="space-y-5">
            <div>
              <p className="text-white/60 text-sm leading-relaxed">{team.description}</p>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white/40 text-xs">Progress</span>
                <span className="text-white font-600 text-sm">{team.progress}%</span>
              </div>
              <div className="progress-bar h-2 rounded-full">
                <div className="progress-fill h-full rounded-full" style={{ width: `${team.progress}%` }} />
              </div>
            </div>

            <div>
              <h3 className="text-white font-600 text-sm mb-3">Team Members</h3>
              <div className="space-y-3">
                {team.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-hack-primary/20">
                      <img src={member.avatar} alt={member.name} className="w-full h-full" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-500">{member.name}</div>
                      <div className="text-white/40 text-xs">{member.role}</div>
                    </div>
                    <button className="text-white/30 hover:text-white/60">
                      <MessageSquare size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Tasks" && (
          <div>
            <div className="grid grid-cols-2 gap-3">
              {["Todo", "In Progress", "Testing", "Done"].map((col) => (
                <div
                  key={col}
                  className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="text-white/60 text-xs font-600 mb-3">{col}</div>
                  <div className="space-y-2">
                    {Array.from({ length: col === "Done" ? 3 : col === "Todo" ? 4 : 2 }).map((_, i) => (
                      <div key={i} className="p-2 rounded-lg text-xs text-white/50" style={{ background: "rgba(255,255,255,0.04)" }}>
                        {["Set up auth", "API routes", "Dashboard UI", "AI integration", "Testing", "Deploy"][i] || "Task " + (i + 1)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Chat" && (
          <div className="flex flex-col h-full">
            <div className="space-y-3 flex-1">
              {[
                { name: "Priya K", msg: "Just pushed the ML model!", time: "10:30 AM" },
                { name: "Rahul M", msg: "Dashboard looks great 🔥", time: "11:15 AM" },
                { name: "Alex S", msg: "Good work team! Deployment tomorrow?", time: "11:45 AM" },
              ].map((msg, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-hack-primary/30 flex-shrink-0 flex items-center justify-center text-xs text-white">{msg.name[0]}</div>
                  <div>
                    <div className="text-white/60 text-[11px] mb-0.5">{msg.name} · {msg.time}</div>
                    <div
                      className="text-sm text-white/80 px-3 py-2 rounded-2xl inline-block"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {msg.msg}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <input type="text" placeholder="Message team..." className="hack-input flex-1 py-2 text-sm" />
              <button
                onClick={() => toast.success("Message sent!")}
                className="hack-btn-primary py-2 px-4"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {["Files", "Activity"].includes(activeTab) && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-white/40 text-sm">{activeTab} coming soon</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => toast.success("Opening workspace...")}
          className="hack-btn-primary w-full justify-center py-2.5"
        >
          <ExternalLink size={14} />
          Open Full Workspace
        </button>
      </div>
    </div>
  );
}

export default function MyTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  // Creation modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("AI/ML");
  const [newMaxMembers, setNewMaxMembers] = useState(4);
  const [newHackathonId, setNewHackathonId] = useState("");
  const [hackathonsList, setHackathonsList] = useState<any[]>([]);

  const loadUserTeams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: userMemberships, error: memberErr } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);
      if (memberErr) throw memberErr;

      if (!userMemberships || userMemberships.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      const teamIds = userMemberships.map(m => m.team_id);
      const { data: teamsData, error: teamsErr } = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds);
      if (teamsErr) throw teamsErr;

      const { data: hackathonsData } = await supabase
        .from("hackathons")
        .select("id, title");
      const hackonMap = (hackathonsData || []).reduce((acc: any, h: any) => {
        acc[h.id] = h.title;
        return acc;
      }, {});

      const { data: allMemberships, error: membersErr } = await supabase
        .from("team_members")
        .select("team_id, role, profiles (id, name, avatar_url, github_avatar, linkedin_avatar)")
        .in("team_id", teamIds);
      if (membersErr) throw membersErr;

      const formattedTeams = (teamsData || []).map((t: any) => {
        const teamMembers = (allMemberships || [])
          .filter((m: any) => m.team_id === t.id)
          .map((m: any) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            return {
              id: profile?.id || m.user_id,
              name: profile?.name || "Unknown Builder",
              avatar: profile?.linkedin_avatar || profile?.github_avatar || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name || 'builder'}`,
              role: m.role || "Member",
            };
          });

        return {
          id: t.id,
          name: t.name,
          hackathon: hackonMap[t.hackathon_id] || "AI Innovation Challenge",
          members: teamMembers,
          maxMembers: t.max_members || 4,
          progress: t.progress || 0,
          status: t.status || "recruiting",
          requiredRoles: [],
          description: t.description || "",
          category: t.category || "General",
          color: t.color || "#7C5CFF",
          icon: t.icon || "🎯",
        };
      });

      setTeams(formattedTeams);
    } catch (err) {
      console.error("Error loading teams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserTeams();
    async function loadHackathons() {
      const { data } = await supabase.from("hackathons").select("id, title");
      if (data) setHackathonsList(data);
    }
    loadHackathons();
  }, [user]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newHackathonId) {
      toast.error("Please enter a team name and select a hackathon.");
      return;
    }
    try {
      const { data: newTeam, error: teamErr } = await supabase
        .from("teams")
        .insert({
          name: newTeamName,
          description: newDescription,
          category: newCategory,
          max_members: newMaxMembers,
          hackathon_id: newHackathonId,
          progress: 0,
          status: "recruiting",
          color: "#7C5CFF",
          icon: "🤖"
        })
        .select("*")
        .single();
      if (teamErr) throw teamErr;

      const { error: memErr } = await supabase
        .from("team_members")
        .insert({
          team_id: newTeam.id,
          user_id: user?.id,
          role: "leader"
        });
      if (memErr) throw memErr;

      toast.success("Team created successfully! 🎉");
      setShowCreateModal(false);
      setNewTeamName("");
      setNewDescription("");
      setNewMaxMembers(4);
      loadUserTeams();
    } catch (err) {
      console.error("Error creating team:", err);
      toast.error("Failed to create team.");
    }
  };

  const filters = ["All", "Recruiting", "Active", "Completed"];
  const filtered = teams.filter((t) => {
    if (activeFilter === "All") return true;
    return t.status.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="p-6 lg:p-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-700 text-2xl mb-1">My Teams</h1>
          <p className="text-white/40 text-sm">{teams.length} active teams</p>
        </div>
        <div className="flex gap-3">
          <Link to="/match">
            <button className="hack-btn-secondary" style={{ border: "1px solid rgba(124,92,255,0.4)", color: "#A78BFF" }}>
              <Users size={16} />
              Recruit Members
            </button>
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="hack-btn-primary"
          >
            <Plus size={16} />
            Create Team
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="px-4 py-2 rounded-xl text-sm font-500 transition-all"
            style={{
              background: activeFilter === f ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.04)",
              color: activeFilter === f ? "#A78BFF" : "rgba(255,255,255,0.45)",
              border: `1px solid ${activeFilter === f ? "rgba(124,92,255,0.25)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40">Loading teams...</div>
      ) : (
        /* Teams Grid */
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((team) => {
          const status = STATUS_CONFIG[team.status];
          return (
            <div
              key={team.id}
              className="hack-card p-6 cursor-pointer"
              onClick={() => setSelectedTeam(team)}
            >
              {/* Team Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                    style={{ background: `${team.color}15`, border: `1px solid ${team.color}25` }}
                  >
                    {team.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-700 text-base">{team.name}</h3>
                    <div className="text-white/40 text-xs">{team.hackathon}</div>
                  </div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-600"
                  style={{ background: status.bg, color: status.color }}
                >
                  {status.label}
                </span>
              </div>

              <p className="text-white/40 text-xs leading-relaxed mb-4 line-clamp-2">
                {team.description}
              </p>

              {/* Members */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex -space-x-2">
                  {team.members.slice(0, 4).map((m, i) => (
                    <div
                      key={m.id}
                      className="w-8 h-8 rounded-full overflow-hidden border-2"
                      style={{ borderColor: "#131826", background: `hsl(${i * 60 + 200}, 60%, 50%)` }}
                    >
                      <img src={m.avatar} alt={m.name} className="w-full h-full" />
                    </div>
                  ))}
                  {team.maxMembers - team.members.length > 0 && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] text-white/50 border-2"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "#131826" }}
                    >
                      +{team.maxMembers - team.members.length}
                    </div>
                  )}
                </div>
                <span className="text-white/30 text-xs">{team.members.length}/{team.maxMembers} members</span>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/40">Progress</span>
                  <span className="text-white/60 font-600">{team.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${team.progress}%` }} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="hack-btn-primary flex-1 justify-center py-2 text-sm"
                  onClick={(e) => { e.stopPropagation(); setSelectedTeam(team); }}
                >
                  Open Workspace
                </button>
                <button
                  className="hack-btn-secondary px-3"
                  onClick={(e) => { e.stopPropagation(); toast.success("Settings opened"); }}
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Create New Team */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="hack-card p-6 flex flex-col items-center justify-center text-center min-h-60 border-dashed hover:border-hack-primary/30 transition-colors"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(124,92,255,0.1)" }}
          >
            <Plus size={24} className="text-hack-primary" />
          </div>
          <div className="text-white font-700 text-base mb-1">Create New Team</div>
          <div className="text-white/40 text-sm">Start a team and invite builders</div>
        </button>
      </div>
      )}

      {/* Team Detail Panel */}
      {selectedTeam && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedTeam(null)}
          />
          <TeamDetailPanel team={selectedTeam} onClose={() => setSelectedTeam(null)} />
        </>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="hack-card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-700 text-lg">Create New Team</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-white/45 hover:text-white/70">✕</button>
            </div>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs mb-1.5 font-500">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI resume parser"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="hack-input"
                />
              </div>
              <div>
                <label className="block text-white/60 text-xs mb-1.5 font-500">Description</label>
                <textarea
                  placeholder="What is your team building?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="hack-input h-20 resize-none animate-fade-in"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/60 text-xs mb-1.5 font-500">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="hack-input"
                  >
                    {["AI/ML", "Web", "GreenTech", "IoT", "FinTech", "EdTech", "Security"].map((c) => (
                      <option key={c} value={c} style={{ background: "#131826" }}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5 font-500">Max Members</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={newMaxMembers}
                    onChange={(e) => setNewMaxMembers(Number(e.target.value))}
                    className="hack-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/60 text-xs mb-1.5 font-500">Select Hackathon *</label>
                <select
                  required
                  value={newHackathonId}
                  onChange={(e) => setNewHackathonId(e.target.value)}
                  className="hack-input"
                >
                  <option value="" style={{ background: "#131826" }}>-- Choose Event --</option>
                  {hackathonsList.map((h) => (
                    <option key={h.id} value={h.id} style={{ background: "#131826" }}>{h.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="hack-btn-secondary flex-1 justify-center py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hack-btn-primary flex-1 justify-center py-2.5"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
