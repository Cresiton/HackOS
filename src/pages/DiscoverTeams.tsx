import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Search, Users, Calendar, ArrowRight, X, Sparkles, Trophy,
  Shield, AlertTriangle, MessageSquare, CheckCircle, Info, Loader2, Globe
} from "lucide-react";
import { Team, Hackathon, Teammate, TeamMember } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { deserializeHackathon } from "@/lib/utils";

interface ExtendedTeam extends Team {
  leader: {
    id: string;
    name: string;
    avatar: string;
    trustScore: number;
  };
  hackathonName: string;
  problemStatement?: string;
  visibility: "public" | "invite_only" | "hidden";
  requiredRolesObj: { role: string; qty: number; skills: string[] }[];
  is_draft?: boolean;
}

export default function DiscoverTeams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryHackathonId = searchParams.get("hackathon_id");

  // State
  const [teams, setTeams] = useState<ExtendedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Active user's team memberships (to check for same-hackathon warnings)
  const [userMemberships, setUserMemberships] = useState<{ teamId: string; hackathonId: string; teamName: string }[]>([]);

  // Detailed Modal State
  const [selectedTeam, setSelectedTeam] = useState<ExtendedTeam | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyRole, setApplyRole] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  // Warning Modal State
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningHackathonTeamName, setWarningHackathonTeamName] = useState("");
  const [warningHackathonTeamId, setWarningHackathonTeamId] = useState("");
  
  // Load initial discover details
  const loadDiscoverTeams = async () => {
    try {
      setLoading(true);
      // Fetch all hackathons for title map
      const { data: hacks } = await supabase.from("hackathons").select("id, title");
      const hacksMap = (hacks || []).reduce((acc: any, h: any) => {
        acc[h.id] = h.title;
        return acc;
      }, {});

      // Fetch all teams
      const { data: teamsData, error: teamsErr } = await supabase
        .from("teams")
        .select("*");
      
      if (teamsErr) throw teamsErr;

      // Fetch team members with profiles
      const { data: membersData, error: membersErr } = await supabase
        .from("team_members")
        .select("team_id, role, user_id, profiles (*)");
      
      if (membersErr) throw membersErr;

      // Map profiles for membership formatting
      const membersMap: Record<string, any[]> = {};
      const leadersMap: Record<string, any> = {};

      (membersData || []).forEach((m: any) => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        const formattedMem = {
          id: m.user_id,
          name: profile?.name || "Unknown Builder",
          avatar: profile?.linkedin_avatar || profile?.github_avatar || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name || "builder"}`,
          role: m.role || "Member",
          trustScore: profile?.trust_score || 0,
          availability: profile?.availability || "available"
        };
        
        if (!membersMap[m.team_id]) {
          membersMap[m.team_id] = [];
        }
        membersMap[m.team_id].push(formattedMem);

        if (m.role === "leader") {
          leadersMap[m.team_id] = formattedMem;
        }
      });

      // Deserialize and build extended list
      const list: ExtendedTeam[] = (teamsData || []).map((t: any) => {
        let visibility: "public" | "invite_only" | "hidden" = "public";
        let problemStatement = "";
        let requiredRolesObj: any[] = [];
        let cleanDesc = t.description || "";
        let isDraft = false;

        const parts = cleanDesc.split("\n\n---METADATA---\n");
        if (parts.length > 1) {
          cleanDesc = parts[0];
          try {
            const meta = JSON.parse(parts[1]);
            visibility = meta.visibility || "public";
            problemStatement = meta.problem_statement || "";
            requiredRolesObj = meta.required_roles || [];
            isDraft = !!meta.is_draft;
          } catch (e) {
            console.error("Error parsing team meta details", e);
          }
        }

        const teamMems = membersMap[t.id] || [];
        const leader = leadersMap[t.id] || { id: "", name: "Unknown", avatar: "", trustScore: 0 };

        return {
          id: t.id,
          name: t.name,
          hackathon: t.hackathon_id,
          hackathonName: hacksMap[t.hackathon_id] || "External / Personal Collab",
          members: teamMems,
          maxMembers: t.max_members || 4,
          progress: t.progress || 0,
          status: t.status || "recruiting",
          requiredRoles: requiredRolesObj.map((r: any) => r.role),
          requiredRolesObj: requiredRolesObj,
          description: cleanDesc,
          category: t.category || "General",
          color: t.color || "#7C5CFF",
          icon: t.icon || "🎯",
          leader,
          visibility,
          problemStatement,
          is_draft: isDraft
        };
      });

      // Filter by query hackathon if passed, and filter hidden teams & drafts
      let filteredList = list.filter(t => t.visibility !== "hidden" && !t.is_draft);
      if (queryHackathonId) {
        filteredList = filteredList.filter(t => t.hackathon === queryHackathonId);
      }

      setTeams(filteredList);

      // Load user's current memberships to verify same-hackathon alerts
      if (user) {
        const { data: userMems } = await supabase
          .from("team_members")
          .select("team_id, teams (id, name, hackathon_id)")
          .eq("user_id", user.id);

        if (userMems) {
          const mappedMems = userMems.map((um: any) => {
            const team = Array.isArray(um.teams) ? um.teams[0] : um.teams;
            return {
              teamId: um.team_id,
              hackathonId: team?.hackathon_id || "",
              teamName: team?.name || "Other Team"
            };
          });
          setUserMemberships(mappedMems);
        }
      }
    } catch (err) {
      console.error("Error fetching discover teams:", err);
      toast.error("Failed to load teams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscoverTeams();
  }, [user, queryHackathonId]);

  // Handle Apply button click
  const handleApplyClick = (team: ExtendedTeam) => {
    if (!user) {
      toast.error("Please login to apply to teams.");
      return;
    }

    // Rule: Check duplicate requests
    const isAlreadyMember = team.members.some(m => m.id === user.id);
    if (isAlreadyMember) {
      toast.warning("You are already a member of this team.");
      return;
    }

    // Rule: Check same-hackathon warnings
    const sameHackTeam = userMemberships.find(m => m.hackathonId === team.hackathon);
    if (sameHackTeam) {
      setWarningHackathonTeamName(sameHackTeam.teamName);
      setWarningHackathonTeamId(sameHackTeam.teamId);
      setSelectedTeam(team);
      setShowWarningModal(true);
      return;
    }

    // Proceed to role application modal
    setSelectedTeam(team);
    if (team.requiredRolesObj.length > 0) {
      setApplyRole(team.requiredRolesObj[0].role);
    } else {
      setApplyRole("Contributor");
    }
    setApplyMessage("");
    setShowApplyModal(true);
  };

  const proceedWithWarningApplication = () => {
    setShowWarningModal(false);
    if (selectedTeam) {
      if (selectedTeam.requiredRolesObj.length > 0) {
        setApplyRole(selectedTeam.requiredRolesObj[0].role);
      } else {
        setApplyRole("Contributor");
      }
      setApplyMessage("");
      setShowApplyModal(true);
    }
  };

  // Submit Join Application
  const submitApplication = async () => {
    if (!user || !selectedTeam) return;
    setIsApplying(true);
    try {
      // 1. Verify duplicate pending requests
      const { data: existing } = await supabase
        .from("team_requests")
        .select("id")
        .eq("team_id", selectedTeam.id)
        .eq("sender_id", user.id)
        .eq("request_type", "join_request")
        .eq("status", "pending")
        .limit(1);
      
      if (existing && existing.length > 0) {
        toast.warning("You already have a pending application to this team.");
        setShowApplyModal(false);
        return;
      }

      // 2. Insert team request with request_type 'join_request'
      const { error: requestErr } = await supabase
        .from("team_requests")
        .insert({
          team_id: selectedTeam.id,
          sender_id: user.id,
          receiver_id: selectedTeam.leader.id,
          role: applyRole,
          message: applyMessage.trim(),
          status: "pending",
          request_type: "join_request"
        });
      
      if (requestErr) throw requestErr;

      // 3. Create Leader notification
      if (selectedTeam.leader.id) {
        await supabase
          .from("notifications")
          .insert({
            user_id: selectedTeam.leader.id,
            type: "join_request",
            title: "New Join Request",
            description: `${user.name} requested to join ${selectedTeam.name} as ${applyRole}.`,
            action_url: "/my-requests",
            action_label: "Review Request"
          });
      }

      toast.success(`Application sent to Team ${selectedTeam.name}!`);
      setShowApplyModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setIsApplying(false);
    }
  };

  // Filters
  const filteredTeams = teams.filter(t => {
    const matchSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.requiredRoles.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole = roleFilter === "All" || t.requiredRoles.some(r => r === roleFilter);

    return matchSearch && matchRole;
  });

  // Extract unique roles for filters
  const allAvailableRoles = Array.from(new Set(teams.flatMap(t => t.requiredRoles)));

  return (
    <div className="p-6 lg:p-8 pb-20">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-white font-800 text-2xl md:text-3xl mb-1">Discover Teams</h1>
          <p className="text-white/40 text-sm">Find active teams looking for developers and collaborators</p>
        </div>
        <Link to="/create-team" className="hack-btn-primary">
          Create New Team
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 min-w-60">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams by name, roles, or description..."
            className="hack-input pl-10"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="hack-input py-3 w-auto px-4 text-sm cursor-pointer"
          style={{ borderRadius: "14px" }}
        >
          <option value="All" style={{ background: "#131826" }}>All Roles Needed</option>
          {allAvailableRoles.map((role) => (
            <option key={role} value={role} style={{ background: "#131826" }}>{role}</option>
          ))}
        </select>
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={24} className="animate-spin text-hack-primary" />
            <p className="text-white/40 text-sm">Searching for teams...</p>
          </div>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-white font-600 text-lg mb-2">No teams recruiting</h3>
          <p className="text-white/40 text-sm">Try adjusting your filters or create your own team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="hack-card p-6 flex flex-col justify-between cursor-pointer"
              onClick={() => setSelectedTeam(team)}
            >
              {/* Header */}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: `${team.color}15`, border: `1px solid ${team.color}25` }}
                    >
                      {team.icon}
                    </div>
                    <div>
                      <h3 className="text-white font-700 text-base">{team.name}</h3>
                      <div className="text-white/40 text-xs truncate max-w-[150px]">{team.hackathonName}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-hack-primary/10 text-hack-primary border border-hack-primary/20 capitalize">
                    {team.visibility}
                  </span>
                </div>

                <p className="text-white/45 text-xs leading-relaxed line-clamp-3 mb-4">
                  {team.description}
                </p>

                {/* Team Info */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl bg-white/2 border border-white/5">
                  <div>
                    <span className="text-white/30 text-[9px] uppercase font-600">Team Leader</span>
                    <div className="text-white text-xs truncate font-500">{team.leader.name}</div>
                  </div>
                  <div>
                    <span className="text-white/30 text-[9px] uppercase font-600">Capacity</span>
                    <div className="text-white text-xs font-500">{team.members.length} / {team.maxMembers} Members</div>
                  </div>
                </div>

                {/* Open roles tags */}
                {team.requiredRolesObj.length > 0 && (
                  <div className="mb-6">
                    <span className="text-white/30 text-[10px] block mb-2">Open Roles:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {team.requiredRolesObj.map((r, i) => (
                        <span key={i} className="tag text-[9px] py-0.5 px-2 bg-hack-orange/10 border-hack-orange/20 text-hack-orange">
                          {r.role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTeam(team);
                  }}
                  className="hack-btn-secondary flex-1 justify-center py-2 text-xs"
                >
                  View Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyClick(team);
                  }}
                  className="hack-btn-primary flex-1 justify-center py-2 text-xs"
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- DETAIL MODAL --- */}
      {selectedTeam && !showApplyModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedTeam(null)} />
          <div
            className="fixed inset-y-0 right-0 w-full max-w-[500px] z-50 flex flex-col animate-slide-in"
            style={{
              background: "#0E111B",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header banner */}
            <div className="relative h-28 bg-gradient-to-r from-hack-primary/20 to-hack-orange/10 flex items-end p-5 border-b border-white/5">
              <button
                onClick={() => setSelectedTeam(null)}
                className="absolute top-4 right-4 text-white/30 hover:text-white/70 p-1"
              >
                ✕
              </button>
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: "#131826", border: `1px solid ${selectedTeam.color}30` }}
                >
                  {selectedTeam.icon}
                </div>
                <div>
                  <h2 className="text-white font-800 text-lg leading-tight">{selectedTeam.name}</h2>
                  <p className="text-white/40 text-xs truncate max-w-[280px]">{selectedTeam.hackathonName}</p>
                </div>
              </div>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <span className="text-white/30 text-xs block mb-1">Description</span>
                <p className="text-white/60 text-sm leading-relaxed">{selectedTeam.description}</p>
              </div>

              {selectedTeam.problemStatement && (
                <div>
                  <span className="text-white/30 text-xs block mb-1">What we are planning to build</span>
                  <p className="text-white/60 text-sm leading-relaxed bg-white/2 border border-white/5 p-3 rounded-xl italic">
                    "{selectedTeam.problemStatement}"
                  </p>
                </div>
              )}

              {/* Members */}
              <div>
                <span className="text-white/30 text-xs block mb-3">Team Members ({selectedTeam.members.length})</span>
                <div className="space-y-3">
                  {selectedTeam.members.map((mem) => (
                    <div key={mem.id} className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <img src={mem.avatar} alt={mem.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-white text-xs font-600">{mem.name}</div>
                          <div className="text-[10px] text-white/40 capitalize">{mem.role}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-white/40">Trust Score: {mem.trustScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required / open roles */}
              {selectedTeam.requiredRolesObj.length > 0 && (
                <div>
                  <span className="text-white/30 text-xs block mb-3">Open Roles needed</span>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedTeam.requiredRolesObj.map((r, i) => (
                      <div key={i} className="p-4 rounded-xl border border-hack-orange/10 bg-hack-orange/3 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-white font-600 text-sm">{r.role}</div>
                          <span className="text-[10px] font-700 text-hack-orange bg-hack-orange/10 px-2 py-0.5 rounded">Need: {r.qty}</span>
                        </div>
                        {r.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {r.skills.map(s => (
                              <span key={s} className="tag text-[9px] py-0">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer action */}
            <div className="p-4 border-t border-white/6 flex gap-3">
              <button
                onClick={() => setSelectedTeam(null)}
                className="hack-btn-secondary flex-1 justify-center py-2.5 text-sm"
              >
                Close
              </button>
              <button
                onClick={() => handleApplyClick(selectedTeam)}
                className="hack-btn-primary flex-1 justify-center py-2.5 text-sm"
              >
                Apply to join
              </button>
            </div>
          </div>
        </>
      )}

      {/* --- APPLICATION FORM MODAL --- */}
      {showApplyModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hack-card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-700 text-lg">Apply to Team</h2>
              <button onClick={() => setShowApplyModal(false)} className="text-white/45 hover:text-white/70">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-xs block mb-1.5">Which role are you applying for? *</label>
                {selectedTeam.requiredRolesObj.length > 0 ? (
                  <select
                    value={applyRole}
                    onChange={(e) => setApplyRole(e.target.value)}
                    className="hack-input text-sm"
                  >
                    {selectedTeam.requiredRolesObj.map((r, i) => (
                      <option key={i} value={r.role} style={{ background: "#131826" }}>
                        {r.role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={applyRole}
                    onChange={(e) => setApplyRole(e.target.value)}
                    className="hack-input text-sm"
                  />
                )}
              </div>

              <div>
                <label className="text-white/50 text-xs block mb-1.5">Tell the team why you'd be a good fit</label>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value.slice(0, 300))}
                  placeholder="I have experience building React applications and would love to help."
                  className="hack-input text-sm h-28 resize-none"
                />
                <div className="text-right text-[10px] text-white/30">
                  {applyMessage.length} / 300 characters limit
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="hack-btn-secondary flex-1 justify-center py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApplication}
                  disabled={isApplying}
                  className="hack-btn-primary flex-1 justify-center py-2.5 text-xs"
                >
                  {isApplying ? (
                    <><Loader2 size={13} className="animate-spin" /> Sending...</>
                  ) : (
                    <>Send Request</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SAME HACKATHON WARNING MODAL --- */}
      {showWarningModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hack-card w-full max-w-md p-6 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
            <div
              className="w-14 h-14 rounded-2xl bg-hack-orange/15 border border-hack-orange/30 mx-auto flex items-center justify-center text-hack-orange"
            >
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1">
              <h2 className="text-white font-800 text-lg">Already Registered</h2>
              <p className="text-white/50 text-xs leading-relaxed">
                You are already part of another team (<strong className="text-white/80">{warningHackathonTeamName}</strong>) for this hackathon.
              </p>
            </div>

            <p className="text-white/40 text-[11px] leading-relaxed">
              Hackathon rules usually allow joining only one team per event. You can cancel this request, leave your existing team, or proceed only if the organizer explicitly permits multi-team registration.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={proceedWithWarningApplication}
                className="hack-btn-primary justify-center text-xs py-2"
              >
                Proceed with request anyway
              </button>
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  navigate("/my-teams");
                }}
                className="hack-btn-secondary justify-center text-xs py-2"
              >
                Leave Existing Team ({warningHackathonTeamName})
              </button>
              <button
                onClick={() => setShowWarningModal(false)}
                className="text-white/40 hover:text-white/70 text-xs py-1 transition-colors"
              >
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
