import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight, Calendar, Users, Compass, MapPin, Star,
  ArrowRight, Plus, ExternalLink, Activity, Clock, TrendingUp,
  Zap, Upload, CheckCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getTimeGreeting } from "@/lib/auth";
import {
  FEATURED_HACKATHONS, LIVE_TEAM_REQUESTS, TEAMMATES, MY_TEAMS
} from "@/lib/mockData";
import { MOTIVATIONAL_QUOTES } from "@/constants";
import aiRobot from "@/assets/ai-robot.png";
import organizerIllustration from "@/assets/organizer-illustration.png";

const STATS = [
  { label: "Upcoming Hackathons", value: "8", icon: Calendar, color: "#7C5CFF", iconBg: "rgba(124,92,255,0.15)" },
  { label: "Team Invites", value: "12", icon: Users, color: "#4F7CFF", iconBg: "rgba(79,124,255,0.15)" },
  { label: "My Teams", value: "3", icon: Users, color: "#4F7CFF", iconBg: "rgba(79,124,255,0.15)" },
  { label: "Available Hackathons", value: "850", icon: Compass, color: "#F59E0B", iconBg: "rgba(245,158,11,0.15)" },
];

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
  const greeting = getTimeGreeting();
  const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [locationFilter, setLocationFilter] = useState("All Locations");

  return (
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
            {STATS.map((stat) => (
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
              {FEATURED_HACKATHONS.slice(0, 4).map((hack) => (
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
              <button className="text-hack-primary text-sm hover:text-hack-primary-hover">View all</button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { value: roleFilter, options: ["All Roles", "Frontend Developer", "Backend Developer", "ML Engineer", "UI/UX Designer"], setter: setRoleFilter },
                { value: "Online", options: ["Online", "Offline", "Hybrid"], setter: () => {} },
                { value: locationFilter, options: ["All Locations", "Bangalore", "Mumbai", "Delhi", "Chennai"], setter: setLocationFilter },
              ].map((filter, i) => (
                <select
                  key={i}
                  value={filter.value}
                  onChange={(e) => filter.setter(e.target.value)}
                  className="hack-input py-2 px-3 w-auto text-xs cursor-pointer"
                  style={{ borderRadius: "10px" }}
                >
                  {filter.options.map((opt) => (
                    <option key={opt} value={opt} style={{ background: "#131826" }}>{opt}</option>
                  ))}
                </select>
              ))}
              <div className="relative flex-1 min-w-40">
                <input
                  type="text"
                  placeholder="Search by skill or role..."
                  className="hack-input py-2 text-xs"
                  style={{ borderRadius: "10px" }}
                />
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {TEAMMATES.map((teammate) => (
                <div key={teammate.id} className="hack-card p-4 flex-shrink-0 w-52">
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-hack-primary/20">
                        <img src={teammate.avatar} alt={teammate.name} className="w-full h-full" />
                      </div>
                      {teammate.isOnline && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                          style={{ background: "#22C55E", borderColor: "#131826" }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                      <Star size={10} fill="currentColor" />
                      <span>{teammate.rating}</span>
                    </div>
                  </div>
                  <div className="text-white font-600 text-sm mb-0.5">{teammate.name}</div>
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
                  <div
                    className="text-center text-xs font-600 py-1.5 rounded-lg"
                    style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}
                  >
                    {teammate.matchScore}% Match
                  </div>
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
              {MY_TEAMS.map((team) => (
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
                          className="w-6 h-6 rounded-full overflow-hidden border border-hack-card"
                          style={{ background: "#7C5CFF33" }}
                        >
                          <img src={m.avatar} alt={m.name} className="w-full h-full" />
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
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${team.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Create Team CTA */}
              <Link to="/my-teams" className="block">
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

      {/* Right Panel */}
      <div
        className="w-80 flex-shrink-0 overflow-y-auto p-5 space-y-5 hidden xl:block"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* AI Team Builder */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0E111B, #131826)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-700">AI Team Builder</h3>
            <span className="badge-new">New</span>
          </div>
          <div className="flex justify-center my-4">
            <img src={aiRobot} alt="AI Robot" className="w-28 h-28 object-contain animate-float" />
          </div>
          <p className="text-white/40 text-xs text-center mb-4 leading-relaxed">
            Paste your idea or problem statement and let AI suggest the perfect team roles.
          </p>
          <Link to="/ai-team-builder">
            <button className="hack-btn-primary w-full justify-center py-2.5">
              Try AI Team Builder
              <ArrowRight size={14} />
            </button>
          </Link>
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
            {LIVE_TEAM_REQUESTS.map((req) => (
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

          <Link to="/my-requests">
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
  );
}
