import { useState } from "react";
import {
  Linkedin, MapPin, Star, Shield, Edit2, Plus,
  ExternalLink, Award, Code, Briefcase, GraduationCap, Github
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import GitHubAnalyticsCard from "@/components/features/GitHubAnalyticsCard";
import { GitHubAnalytics } from "@/lib/github";

const HACKATHONS_WON = [
  { name: "Smart India Hackathon 2024", result: "Winner 🏆", prize: "₹1,00,000" },
  { name: "HackFest 2023", result: "2nd Place 🥈", prize: "₹50,000" },
  { name: "AI Hackathon 2023", result: "Finalist", prize: "₹10,000" },
];

function TrustRing({ score }: { score: number }) {
  const size = 80;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="url(#trustGrad)" strokeWidth="5"
          strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round"
        />
        <defs>
          <linearGradient id="trustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C5CFF" />
            <stop offset="100%" stopColor="#4F7CFF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-white font-700 text-lg leading-none">{score}</div>
        <div className="text-white/40 text-[9px]">Trust</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || "Passionate full-stack developer with 3 years of hackathon experience.");
  const [availability, setAvailability] = useState(user?.availability || "available");
  const [githubAnalytics, setGithubAnalytics] = useState<GitHubAnalytics | null>(null);

  const handleSave = () => {
    updateUser({ bio, availability: availability as typeof user.availability });
    setEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleGitHubConnect = (analytics: GitHubAnalytics) => {
    setGithubAnalytics(analytics);
    // Update trust score and skills if connected
    const ghSkills = analytics.topLanguages.map((l) => l.name).slice(0, 4);
    const existingSkills = user?.skills || [];
    const merged = [...new Set([...existingSkills, ...ghSkills])];
    updateUser({
      skills: merged,
      trustScore: Math.min((user?.trustScore || 60) + 15, 100),
      github: analytics.profile.html_url,
    });
    toast.success(`GitHub connected! Trust Score +15% 🎉`);
  };

  const handleGitHubDisconnect = () => {
    setGithubAnalytics(null);
  };

  return (
    <div className="p-6 lg:p-8 pb-20 max-w-5xl">
      {/* Profile Header */}
      <div
        className="relative rounded-3xl overflow-hidden mb-6"
        style={{
          background: "linear-gradient(135deg, rgba(124,92,255,0.15), rgba(79,124,255,0.1))",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Banner */}
        <div
          className="h-32"
          style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.3), rgba(79,124,255,0.2), rgba(34,197,94,0.1))" }}
        />
        <div className="px-8 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full overflow-hidden border-4"
                style={{ borderColor: "#06070B", background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
              >
                {user?.avatar && <img src={user.avatar} alt={user?.name} className="w-full h-full" />}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2"
                style={{ background: "#22C55E", borderColor: "#06070B" }}
              >
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setEditing(!editing)}
                className="hack-btn-secondary text-sm py-2"
              >
                <Edit2 size={14} />
                {editing ? "Cancel" : "Edit Profile"}
              </button>
              {editing && (
                <button onClick={handleSave} className="hack-btn-primary text-sm py-2">
                  Save Changes
                </button>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-white font-700 text-2xl mb-1">{user?.name || "Alex Singh"}</h1>
              <div className="text-white/50 text-sm mb-2">{user?.role || "Full Stack Developer"}</div>
              <div className="flex items-center gap-4 text-white/40 text-xs">
                <span className="flex items-center gap-1"><MapPin size={12} />{user?.location || "Bangalore, India"}</span>
                <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400" />{user?.rating || 4.9} Rating</span>
                {githubAnalytics && (
                  <a
                    href={githubAnalytics.profile.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white/60 transition-colors"
                  >
                    <Github size={12} />@{githubAnalytics.username}
                    <ExternalLink size={9} />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {["Top Builder", "AI Enthusiast", "3x Winner", ...(githubAnalytics ? ["GitHub Verified"] : [])].map((badge) => (
                  <span key={badge} className="skill-tag text-xs">{badge}</span>
                ))}
              </div>
            </div>
            <TrustRing score={user?.trustScore || 85} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* About */}
          <div className="hack-card p-5">
            <h3 className="text-white font-700 text-sm mb-3">About</h3>
            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="hack-input text-xs resize-none"
                rows={4}
              />
            ) : (
              <p className="text-white/60 text-xs leading-relaxed">{bio}</p>
            )}
          </div>

          {/* Availability */}
          <div className="hack-card p-5">
            <h3 className="text-white font-700 text-sm mb-3">Availability</h3>
            {editing ? (
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="hack-input text-sm"
              >
                {["available", "open", "busy", "unavailable"].map((v) => (
                  <option key={v} value={v} style={{ background: "#131826" }}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: availability === "available" ? "#22C55E" : availability === "open" ? "#4F7CFF" : "#F59E0B" }}
                />
                <span className="text-white text-sm font-500 capitalize">
                  {availability === "available" ? "Available for Teams" : availability === "open" ? "Open to Opportunities" : "Busy"}
                </span>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="hack-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-700 text-sm">Skills</h3>
              <button className="text-hack-primary"><Plus size={14} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(user?.skills || ["React", "Node.js", "TypeScript", "Python", "PostgreSQL", "Docker"]).map((skill) => (
                <span key={skill} className="skill-tag">{skill}</span>
              ))}
              {githubAnalytics && githubAnalytics.topLanguages.slice(0, 3).map((lang) => {
                const exists = (user?.skills || []).includes(lang.name);
                if (exists) return null;
                return (
                  <span
                    key={lang.name}
                    className="skill-tag text-xs"
                    style={{ borderColor: `${lang.color}40`, color: lang.color }}
                  >
                    {lang.name}
                    <span
                      className="ml-1 text-[8px] opacity-60"
                      style={{ color: lang.color }}
                    >
                      GitHub
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="hack-card p-5">
            <h3 className="text-white font-700 text-sm mb-3">Connected Accounts</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github size={16} className="text-white" />
                  <div>
                    <div className="text-white text-xs font-500">GitHub</div>
                    <div className="text-white/40 text-[10px]">
                      {githubAnalytics ? `@${githubAnalytics.username}` : "Not connected"}
                    </div>
                  </div>
                </div>
                <span
                  className="text-[10px] font-600 px-2 py-1 rounded-lg"
                  style={
                    githubAnalytics
                      ? { background: "rgba(34,197,94,0.1)", color: "#22C55E" }
                      : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }
                  }
                >
                  {githubAnalytics ? "Connected" : "Connect"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Linkedin size={16} className="text-hack-blue" />
                  <div>
                    <div className="text-white text-xs font-500">LinkedIn</div>
                    <div className="text-white/40 text-[10px]">Alex Singh</div>
                  </div>
                </div>
                <span
                  className="text-[10px] font-600 px-2 py-1 rounded-lg"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}
                >
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns */}
        <div className="lg:col-span-2 space-y-5">
          {/* ── REAL GitHub Analytics Card ── */}
          <GitHubAnalyticsCard
            initialAnalytics={githubAnalytics}
            onConnect={handleGitHubConnect}
            onDisconnect={handleGitHubDisconnect}
          />

          {/* Experience */}
          <div className="hack-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-hack-primary" />
                <h3 className="text-white font-700">Experience</h3>
              </div>
              <button className="text-hack-primary"><Plus size={14} /></button>
            </div>
            <div className="space-y-4">
              {[
                { title: "Software Engineering Intern", company: "Cubaya Solutions", period: "May 2026 – Jul 2026", desc: "Built React components and Node.js APIs." },
                { title: "Full Stack Developer", company: "Freelance", period: "2025 – Present", desc: "Developed 5+ web applications for clients." },
              ].map((exp, i) => (
                <div key={i} className="flex gap-4">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(124,92,255,0.15)" }}
                  >
                    <Code size={14} className="text-hack-primary" />
                  </div>
                  <div>
                    <div className="text-white font-600 text-sm">{exp.title}</div>
                    <div className="text-hack-primary text-xs">{exp.company}</div>
                    <div className="text-white/40 text-xs mb-1">{exp.period}</div>
                    <div className="text-white/50 text-xs">{exp.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="hack-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap size={16} className="text-hack-blue" />
              <h3 className="text-white font-700">Education</h3>
            </div>
            <div className="flex gap-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(79,124,255,0.15)" }}
              >
                <GraduationCap size={14} className="text-hack-blue" />
              </div>
              <div>
                <div className="text-white font-600 text-sm">IIT Bangalore</div>
                <div className="text-white/50 text-xs">B.Tech Computer Science & Engineering</div>
                <div className="text-white/30 text-xs">2022 – 2026</div>
              </div>
            </div>
          </div>

          {/* Hackathons */}
          <div className="hack-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award size={16} className="text-hack-orange" />
              <h3 className="text-white font-700">Hackathon Achievements</h3>
            </div>
            <div className="space-y-3">
              {HACKATHONS_WON.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div>
                    <div className="text-white text-sm font-500">{h.name}</div>
                    <div className="text-white/40 text-xs">{h.result}</div>
                  </div>
                  <div className="text-hack-primary font-700 text-sm">{h.prize}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
