import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight, Calendar, Users, Compass, MapPin, Star,
  ArrowRight, Plus, ExternalLink, Activity, Clock, TrendingUp,
  Zap, Upload, CheckCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getTimeGreeting } from "@/lib/auth";
import { MOTIVATIONAL_QUOTES } from "@/constants";
import aiTeamBuilderLogo from "@/assets/ai-team-builder-logo.png";
import organizerIllustration from "@/assets/organizer-illustration.png";
import aiJuryLogo from "@/assets/ai-jury-logo.png";
import { AIJuryProvider } from "@/contexts/AIJuryContext";
import { AIJuryModal } from "@/components/ai-jury/AIJuryModal";
import { supabase } from "@/lib/supabase";
import { deserializeHackathon } from "@/lib/utils";
import { Hackathon } from "@/types";
import { Teammate, Team, TeamRequest } from "@/types";
import { rankCandidates, SearchMode } from "@/lib/searchRankingEngine";

// Helper function to calculate distance in km using Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

function MatchScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 90 ? "#22C55E" : score >= 80 ? "#4F7CFF" : "#F59E0B";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-white font-700" style={{ fontSize: size === 44 ? "11px" : "10px" }}>
        {score}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAIJuryModalOpen, setIsAIJuryModalOpen] = useState(false);
  const greeting = getTimeGreeting();
  const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [locationTextFilter, setLocationTextFilter] = useState("");
  const [distanceRadius, setDistanceRadius] = useState<number>(0); // 0 means no radius filter
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("AI Recommended");
  const [dbHackathons, setDbHackathons] = useState<Hackathon[]>([]);
  const [dbTeammates, setDbTeammates] = useState<Teammate[]>([]);
  const [dbMyTeams, setDbMyTeams] = useState<Team[]>([]);
  const [dbLiveRequests, setDbLiveRequests] = useState<TeamRequest[]>([]);
  const [stats, setStats] = useState([
    { label: "Upcoming Hackathons", value: "0", icon: Calendar, color: "#7C5CFF", iconBg: "rgba(124,92,255,0.15)" },
    { label: "Team Invites", value: "0", icon: Users, color: "#4F7CFF", iconBg: "rgba(79,124,255,0.15)" },
    { label: "My Teams", value: "0", icon: Users, color: "#4F7CFF", iconBg: "rgba(79,124,255,0.15)" },
    { label: "Available Hackathons", value: "0", icon: Compass, color: "#F59E0B", iconBg: "rgba(245,158,11,0.15)" },
  ]);

  useEffect(() => {
    async function loadFeaturedHackathons() {
      try {
        const { data, error } = await supabase
          .from("hackathons")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(4);
        if (error) throw error;
        if (data) {
          setDbHackathons(data.map(deserializeHackathon));
        }
      } catch (err) {
        console.error("Error loading hackathons for dashboard:", err);
      }
    }
    loadFeaturedHackathons();
  }, []);

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      try {
        // 1. Stats Counts
        const { count: upcomingCount } = await supabase
          .from("hackathons")
          .select("*", { count: "exact", head: true })
          .eq("status", "upcoming");

        const { count: invitesCount } = await supabase
          .from("team_requests")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("request_type", "invite")
          .eq("status", "pending");

        const { count: myTeamsCount } = await supabase
          .from("team_members")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const { count: availableCount } = await supabase
          .from("hackathons")
          .select("*", { count: "exact", head: true })
          .eq("status", "open");

        setStats([
          { label: "Upcoming Hackathons", value: String(upcomingCount || 0), icon: Calendar, color: "#7C5CFF", iconBg: "rgba(124,92,255,0.15)" },
          { label: "Team Invites", value: String(invitesCount || 0), icon: Users, color: "#4F7CFF", iconBg: "rgba(79,124,255,0.15)" },
          { label: "My Teams", value: String(myTeamsCount || 0), icon: Users, color: "#4F7CFF", iconBg: "rgba(79,124,255,0.15)" },
          { label: "Available Hackathons", value: String(availableCount || 0), icon: Compass, color: "#F59E0B", iconBg: "rgba(245,158,11,0.15)" },
        ]);

        // 2. Fetch Teammates/Profiles (Increased limit for ranking engine)
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", user.id)
          .limit(100);

        if (profiles) {
          const { data: skillsData } = await supabase
            .from("user_skills")
            .select("user_id, skills (name)");

          const userSkillsMap: Record<string, string[]> = {};
          if (skillsData) {
            skillsData.forEach((row: any) => {
              const skillName = row.skills?.name;
              if (skillName && row.user_id) {
                if (!userSkillsMap[row.user_id]) {
                  userSkillsMap[row.user_id] = [];
                }
                userSkillsMap[row.user_id].push(skillName);
              }
            });
          }

          const formattedTeammates = profiles.map((p: any, idx: number) => {
            const skills = userSkillsMap[p.id] || [];
            return {
            id: p.id,
            name: p.name,
            role: p.role || "Full Stack Developer",
            location: p.location || "Online",
            latitude: p.latitude,
            longitude: p.longitude,
            skills: skills,
            rating: Number(p.rating) || 5.0,
            isOnline: false,
              avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
              college: p.college || "",
              trustScore: p.trust_score || 50,
              availability: p.availability || "available",
              github_connected: p.github_connected,
              github_username: p.github_username
            };
          });
          setDbTeammates(formattedTeammates);
        }

        // 3. Fetch My Teams
        const { data: userMemberships } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id);

        if (userMemberships && userMemberships.length > 0) {
          const teamIds = userMemberships.map(m => m.team_id);
          const { data: teamsData } = await supabase
            .from("teams")
            .select("*")
            .in("id", teamIds);

          const { data: hackathonsData } = await supabase
            .from("hackathons")
            .select("id, title");
          const hackonMap = (hackathonsData || []).reduce((acc: any, h: any) => {
            acc[h.id] = h.title;
            return acc;
          }, {});

          const { data: allMemberships } = await supabase
            .from("team_members")
            .select("team_id, role, profiles (id, name, avatar_url, github_avatar, linkedin_avatar)")
            .in("team_id", teamIds);

          if (teamsData) {
            const formattedTeams = teamsData.map((t: any) => {
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
            setDbMyTeams(formattedTeams);
          }
        } else {
          setDbMyTeams([]);
        }

        // 4. Fetch Live Team Requests
        const { data: allTeams } = await supabase
          .from("teams")
          .select("*")
          .eq("status", "recruiting")
          .limit(10);

        if (allTeams) {
          const { data: hackathonsData } = await supabase
            .from("hackathons")
            .select("id, title");
          const hackonMap = (hackathonsData || []).reduce((acc: any, h: any) => {
            acc[h.id] = h.title;
            return acc;
          }, {});

          const allTeamIds = allTeams.map(t => t.id);
          const { data: allTeamMemberships } = await supabase
            .from("team_members")
            .select("team_id, role, user_id, profiles (name)")
            .in("team_id", allTeamIds);

          const formattedRequests = allTeams
            .filter(t => {
              const isMember = (allTeamMemberships || []).some(m => m.team_id === t.id && m.user_id === user.id);
              return !isMember;
            })
            .map((t, idx) => {
              const members = (allTeamMemberships || []).filter(m => m.team_id === t.id);
              const leaderObj = members.find(m => m.role === "leader");
              const leaderProfile = leaderObj ? (Array.isArray(leaderObj.profiles) ? leaderObj.profiles[0] : leaderObj.profiles) : null;
              return {
                id: t.id,
                teamName: t.name,
                requiredRole: "Developer",
                members: members.length,
                maxMembers: t.max_members || 4,
                location: "Online",
                matchScore: 85 + (idx * 4) % 14,
                isOnline: true,
                teamLeader: leaderProfile?.name || "Leader",
                hackathon: hackonMap[t.hackathon_id] || "AI Innovation Challenge",
                color: t.color || "#7C5CFF",
                icon: t.icon || "🎯",
                extraMembers: Math.max(0, members.length - 3),
              };
            });
          setDbLiveRequests(formattedRequests);
        }
      } catch (err) {
        console.error("Error loading dashboard metrics:", err);
      }
    }
    loadDashboardData();
  }, [user]);

  const filteredTeammates = dbTeammates.filter(t => {
    if (roleFilter !== "All Roles" && t.role !== roleFilter) return false;
    
    if (locationTextFilter.trim()) {
      if (!t.location.toLowerCase().includes(locationTextFilter.toLowerCase())) return false;
    }
    
    const uLat = user?.latitude || 13.0827;
    const uLon = user?.longitude || 80.2707;
    if (distanceRadius > 0) {
      if (!t.latitude || !t.longitude) return false; // Exclude users with unknown locations if radius is applied
      const distance = getDistanceFromLatLonInKm(uLat, uLon, t.latitude, t.longitude);
      if (distance > distanceRadius) return false;
    }

    if (searchQuery.trim() && searchMode === "All") {
      const q = searchQuery.toLowerCase();
      const roleMatch = t.role.toLowerCase().includes(q);
      const skillMatch = t.skills.some(s => s.toLowerCase().includes(q));
      const nameMatch = t.name.toLowerCase().includes(q);
      return roleMatch || skillMatch || nameMatch;
    }
    return true;
  });

  const rankedTeammates = rankCandidates(filteredTeammates, searchQuery, searchMode, user).slice(0, 10);

  const allFeaturedHackathons = dbHackathons.slice(0, 4);

  return (
    <AIJuryProvider>
      <div className="flex h-full">
        {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-6 lg:p-8 space-y-8">
          {/* Hero Greeting */}
          <div>
            <h1 className="text-white font-700 text-2xl lg:text-3xl mb-1">
              {greeting}, {user?.name?.split(" ")[0] || "Alex"}! 👋
            </h1>
            <p className="text-white/40 text-sm">{quote}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: stat.iconBg }}
                  >
                    <stat.icon size={18} style={{ color: stat.color }} />
                  </div>
                  <ChevronRight size={14} className="text-white/20" />
                </div>
                <div className="text-white font-700 text-2xl">{stat.value}</div>
                <div className="text-white/40 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Featured Hackathons */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-700 text-lg">Featured Hackathons</h2>
              <Link to="/discover" className="flex items-center gap-1 text-hack-primary text-sm hover:text-hack-primary-hover">
                View all hackathons <ArrowRight size={14} />
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {allFeaturedHackathons.map((hack) => (
                <Link key={hack.id} to={`/hackathon/${hack.id}`} className="block flex-shrink-0 w-64">
                  <div className="hack-card overflow-hidden">
                    <div className="relative">
                      <img
                        src={hack.image}
                        alt={hack.title}
                        className="hackathon-card-img"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        {hack.featured && <span className="featured-tag">Featured</span>}
                        <span className={`tag ${hack.mode === "Online" ? "online-tag" : "offline-tag"}`}>
                          {hack.mode}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-600 text-sm mb-1 line-clamp-1">{hack.title}</h3>
                      <p className="text-white/40 text-xs line-clamp-2 mb-3">{hack.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {hack.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="days-left">
                          <Clock size={11} />
                          {hack.daysLeft} Days Left
                        </span>
                        <span className="text-white/40">
                          <Users size={11} className="inline mr-1" />
                          {hack.participants}+
                        </span>
                      </div>
                      <div
                        className="mt-3 pt-3 flex items-center justify-between"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <span className="text-hack-primary font-700 text-sm">{hack.prize}</span>
                        <span className="text-white/30 text-xs">Prize Pool</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Next arrow placeholder */}
              <div className="flex-shrink-0 flex items-center justify-center w-10">
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <ChevronRight size={14} className="text-white/50" />
                </button>
              </div>
            </div>
          </div>

          {/* Organizer Center */}
          <div
            className="relative overflow-hidden rounded-3xl p-6 lg:p-8"
            style={{
              background: "linear-gradient(135deg, rgba(14,17,27,0.9), rgba(19,24,38,0.9))",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(124,92,255,0.2)" }}
              >
                <Compass size={16} className="text-hack-primary" />
              </div>
              <h3 className="text-white font-700 text-lg">Organizer Center</h3>
            </div>
            <p className="text-white/50 text-sm mb-5 max-w-lg">
              Are you organizing a hackathon? Add your event details, manage registrations,
              and reach thousands of participants.
            </p>
            <Link to="/host-hackathon">
              <button className="hack-btn-primary">
                <Upload size={14} />
                Upload Hackathon Event
                <ArrowRight size={14} />
              </button>
            </Link>
            <div className="absolute right-8 bottom-0 opacity-40 pointer-events-none hidden lg:block">
              <img src={organizerIllustration} alt="Organizer" className="w-48 h-40 object-contain" />
            </div>
          </div>

          {/* Find Perfect Teammates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-700 text-lg">Find Your Perfect Teammates</h2>
              <Link to="/match" className="text-hack-primary text-sm hover:text-hack-primary-hover">View all</Link>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="hack-input py-2 px-3 w-auto text-xs cursor-pointer"
                style={{ borderRadius: "10px" }}
              >
                {["All Roles", "Frontend Developer", "Backend Developer", "ML Engineer", "UI/UX Designer"].map((opt) => (
                  <option key={opt} value={opt} style={{ background: "#131826" }}>{opt}</option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={locationTextFilter}
                  onChange={(e) => setLocationTextFilter(e.target.value)}
                  placeholder="Filter by city..."
                  className="hack-input py-2 text-xs"
                  style={{ borderRadius: "10px", width: "140px" }}
                />
              </div>

              {true && (
                <div className="flex flex-col gap-1 ml-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-[10px] font-600 uppercase tracking-widest">Radius</span>
                    <span className="text-hack-primary text-[10px] font-700">{distanceRadius > 0 ? `${distanceRadius} km` : "Any"}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={distanceRadius}
                    onChange={(e) => setDistanceRadius(Number(e.target.value))}
                    className="w-32 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: "#7C5CFF" }}
                  />
                </div>
              )}

              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value as SearchMode)}
                className="hack-input py-2 px-3 w-auto text-xs cursor-pointer ml-auto"
                style={{ borderRadius: "10px", borderColor: searchMode === "AI Recommended" ? "#7C5CFF" : undefined }}
              >
                <option value="All" style={{ background: "#131826" }}>All Mode</option>
                <option value="Priority" style={{ background: "#131826" }}>Priority Mode</option>
                <option value="AI Recommended" style={{ background: "#131826" }}>✨ AI Recommended</option>
              </select>

              <div className="relative flex-1 min-w-40 max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by skill or role..."
                  className="hack-input py-2 text-xs"
                  style={{ borderRadius: "10px" }}
                />
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {rankedTeammates.map((teammate) => (
                <div key={teammate.id} className="hack-card p-4 flex-shrink-0 w-52">
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative">
                      <div 
                        onClick={() => navigate(`/profile/${teammate.id}`)}
                        className="w-12 h-12 rounded-full overflow-hidden bg-hack-primary/20 cursor-pointer hover:ring-2 hover:ring-hack-primary transition-all"
                      >
                        <img src={teammate.avatar} alt={teammate.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                      <Star size={10} fill="currentColor" />
                      <span>{teammate.rating}</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => navigate(`/profile/${teammate.id}`)}
                    className="text-white font-600 text-sm mb-0.5 cursor-pointer hover:text-hack-primary transition-colors"
                  >
                    {teammate.name}
                  </div>
                  <div className="text-white/40 text-xs mb-2">{teammate.role}</div>
                  <div className="flex items-center gap-1 text-white/30 text-xs mb-3">
                    <MapPin size={10} />
                    <span className="line-clamp-1">{teammate.location}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {teammate.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                  
                  {teammate.explanation && searchMode !== "All" && (
                    <div className="text-[10px] font-600 px-2 py-1 mb-3 rounded border border-hack-primary/30 text-hack-primary/90 bg-hack-primary/5 line-clamp-1 text-center">
                      ✨ {teammate.explanation}
                    </div>
                  )}

                  {/* Removed Dummy Match Score */}
                </div>
              ))}

              <div className="flex-shrink-0 flex items-center justify-center w-10">
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <ChevronRight size={14} className="text-white/50" />
                </button>
              </div>
            </div>
          </div>

          {/* My Teams */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-700 text-lg">My Teams & Active Rooms</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dbMyTeams.map((team) => (
                <Link key={team.id} to="/my-teams" className="block">
                  <div className="hack-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                        style={{ background: `${team.color}15`, border: `1px solid ${team.color}25` }}
                      >
                        {team.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-600 text-sm line-clamp-1">{team.name}</div>
                        <div className="text-white/40 text-xs">{team.category}</div>
                      </div>
                    </div>
                    <div className="flex -space-x-2 mb-3">
                      {team.members.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/profile/${m.id}`);
                          }}
                          className="w-6 h-6 rounded-full overflow-hidden border border-hack-card cursor-pointer hover:ring-2 hover:ring-hack-primary z-10 relative"
                          style={{ background: "#7C5CFF33" }}
                          title={m.name}
                        >
                          <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {team.members.length < team.maxMembers && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white/50 border border-hack-card"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          +{team.maxMembers - team.members.length}
                        </div>
                      )}
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/40">Progress</span>
                        <span className="text-white/60">{team.progress}%</span>
                      </div>
                      {/* Removed Dummy Match Score */}
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${team.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Create Team CTA */}
              <Link to="/create-team" className="block">
                <div
                  className="hack-card p-4 flex flex-col items-center justify-center text-center h-full min-h-[140px] border-dashed cursor-pointer"
                  style={{ borderColor: "rgba(124,92,255,0.2)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                    style={{ background: "rgba(124,92,255,0.1)" }}
                  >
                    <Plus size={18} className="text-hack-primary" />
                  </div>
                  <div className="text-white font-600 text-sm mb-1">Create New Team</div>
                  <div className="text-white/40 text-xs">Start a new team and invite amazing builders.</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        className="w-80 flex-shrink-0 overflow-y-auto p-4 space-y-4 hidden xl:block"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* HackOS Match Feature */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(19,24,38,0.9))",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-700">HackOS Match</h3>
            <span className="badge-new bg-green-500/20 text-green-400 border-green-500/30">New</span>
          </div>
          <p className="text-white/50 text-xs mb-3 leading-relaxed">
            Discover and recruit amazing developers with our new swipe-based matching experience.
          </p>
          <Link to="/match">
            <button className="hack-btn-primary w-full justify-center py-2" style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", borderColor: "#15803D" }}>
              Find Teammates
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>

        {/* AI Team Builder */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0E111B, #131826)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-700">AI Team Builder</h3>
            <span className="badge-new">New</span>
          </div>
          <div className="flex justify-center my-3">
            <img src={aiTeamBuilderLogo} alt="AI Team Builder Logo" className="w-24 h-24 object-contain animate-float" />
          </div>
          <p className="text-white/40 text-xs text-center mb-3 leading-relaxed">
            Paste your idea or problem statement and let AI suggest the perfect team roles.
          </p>
          <Link to="/ai-team-builder">
            <button className="hack-btn-primary w-full justify-center py-2">
              Try AI Team Builder
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>

        {/* AI Jury */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0E111B, #131826)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-700">AI Jury</h3>
            <span className="badge-new">New</span>
          </div>
          <div className="flex justify-center my-3">
            <img src={aiJuryLogo} alt="AI Jury Logo" className="w-24 h-24 object-contain animate-float" />
          </div>
          <button onClick={() => setIsAIJuryModalOpen(true)} className="hack-btn-primary w-full justify-center py-2">
            Evaluate with AI Jury
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Live Team Requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-600 text-sm">Live Team Requests</h3>
            <div className="flex items-center gap-1.5">
              <div className="status-online" />
              <span className="text-white/40 text-xs">Live</span>
            </div>
          </div>

          <div className="space-y-3">
            {dbLiveRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl transition-all hover:border-white/15 cursor-pointer"
                style={{ background: "#131826", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white font-600 text-sm">{req.teamName}</div>
                    <div
                      className="text-xs font-500 mt-0.5"
                      style={{ color: req.color || "#7C5CFF" }}
                    >
                      Need: {req.requiredRole}
                    </div>
                  </div>
                  <MatchScoreRing score={req.matchScore} />
                </div>
                <div className="text-white/30 text-xs mb-3">
                  {req.members}/{req.maxMembers} Members • {req.location}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    {Array.from({ length: Math.min(req.members, 3) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full overflow-hidden border"
                        style={{
                          background: `hsl(${i * 60 + 200}, 70%, 50%)`,
                          borderColor: "#131826",
                        }}
                      />
                    ))}
                    {req.extraMembers && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white/50 border"
                        style={{ background: "rgba(255,255,255,0.05)", borderColor: "#131826" }}
                      >
                        +{req.extraMembers}
                      </div>
                    )}
                  </div>
                  <span className="text-white/20 text-xs">Match Score</span>
                </div>
              </div>
            ))}
          </div>

          <Link to="/create-team">
            <button className="hack-btn-secondary w-full justify-center mt-3 py-2.5 text-sm">
              <Plus size={14} />
              Create Team Request
            </button>
          </Link>
        </div>
      </div>

      {/* Bottom Tip Bar */}
      <div
        className="fixed bottom-0 right-0 z-20 flex items-center gap-3 px-6 py-3"
        style={{
          left: "280px",
          background: "rgba(10,13,22,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Zap size={14} className="text-hack-primary flex-shrink-0" />
        <span className="text-white/40 text-xs">
          <strong className="text-white/70">HackOS Pro Tip:</strong> Complete your profile and connect GitHub to get 2x better team matches!
        </span>
        <div className="flex-1" />
        <Link to="/profile">
          <button className="hack-btn-primary py-2 px-4 text-xs">
            Improve Profile <ArrowRight size={12} />
          </button>
        </Link>
      </div>
    </div>
      <AIJuryModal isOpen={isAIJuryModalOpen} onClose={() => setIsAIJuryModalOpen(false)} />
    </AIJuryProvider>
  );
}
