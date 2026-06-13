import { useState, useMemo, useRef } from "react";
import {
  Linkedin, MapPin, Star, Shield, Edit2, Plus,
  ExternalLink, Award, Code, Briefcase, GraduationCap, Github,
  FileText, Upload, Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import GitHubAnalyticsCard from "@/components/features/GitHubAnalyticsCard";
import { useGithubStats } from "@/hooks/useGithubStats";
import { getLangColor } from "@/lib/github";
import { useLinkedIn } from "@/hooks/useLinkedIn";
import { parseResumeFile, mergeResumeDataWithDB } from "@/lib/resumeParserService";

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
  const { user, updateUser, reloadProfile } = useAuth();
  const { stats: githubStats } = useGithubStats(user?.id);
  const { signIn: connectLinkedIn, loading: linkingLinkedIn } = useLinkedIn();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || "Passionate full-stack developer with 3 years of hackathon experience.");
  const [availability, setAvailability] = useState<'available' | 'open' | 'busy' | 'unavailable'>(user?.availability || "available");

  const [dragging, setDragging] = useState(false);
  const [parsingResume, setParsingResume] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeUpload = async (file: File) => {
    setParsingResume(true);
    try {
      const parsedData = await parseResumeFile(file);
      if (user?.id) {
        const summary = await mergeResumeDataWithDB(user.id, parsedData, file);
        await reloadProfile();
        
        toast.success(
          `✓ Resume Parsed Successfully:\n` +
          `• Skills Added: ${summary.skillsAdded}\n` +
          `• Projects Added: ${summary.projectsAdded}\n` +
          `• Experience Added: ${summary.experiencesAdded}\n` +
          `• Education Added: ${summary.educationAdded}`,
          { duration: 5000 }
        );
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse resume.");
    } finally {
      setParsingResume(false);
    }
  };

  const handleSave = () => {
    updateUser({ bio, availability: availability as typeof user.availability });
    setEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleGitHubConnect = (stats: any) => {
    const ghSkills = stats.languages ? Object.keys(stats.languages).slice(0, 4) : [];
    const existingSkills = user?.skills || [];
    const merged = [...new Set([...existingSkills, ...ghSkills])];
    updateUser({
      skills: merged,
      trustScore: Math.min((user?.trustScore || 60) + 15, 100),
      github: `https://github.com/${stats.github_username}`,
    });
    toast.success(`GitHub connected! Trust Score +15% 🎉`);
  };

  const handleGitHubDisconnect = () => {
    // Handled internally in GitHubAnalyticsCard, no local state update required.
  };

  const topLanguages = useMemo(() => {
    if (!githubStats?.languages) return [];
    return Object.entries(githubStats.languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => ({
        name,
        color: getLangColor(name),
      }));
  }, [githubStats?.languages]);

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
                {user?.github_connected && user?.github_username && (
                  <a
                    href={user?.github || `https://github.com/${user?.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white/60 transition-colors"
                  >
                    <Github size={12} />@{user?.github_username}
                    <ExternalLink size={9} />
                  </a>
                )}
                {user?.linkedin_connected && user?.linkedin_url && (
                  <a
                    href={user.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white/60 transition-colors text-hack-blue"
                  >
                    <Linkedin size={12} className="text-[#0A66C2]" />
                    {user.linkedin_name || "LinkedIn"}
                    <ExternalLink size={9} />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {["Top Builder", "AI Enthusiast", "3x Winner", ...(user?.github_connected ? ["GitHub Verified"] : [])].map((badge) => (
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
            <h3 className="text-white font-700 text-sm mb-3.5">About</h3>
            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="hack-input text-xs resize-none"
                rows={4}
              />
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-white/60 leading-relaxed">{user?.bio || "No bio set."}</p>
                <div className="space-y-2 pt-3 border-t border-white/[0.04]">
                  {user?.role && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">Role</span>
                      <span className="text-white font-500">{user.role}</span>
                    </div>
                  )}
                  {user?.college && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">College</span>
                      <span className="text-white font-500 text-right truncate max-w-[150px]">{user.college}</span>
                    </div>
                  )}
                  {user?.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">Location</span>
                      <span className="text-white font-500">{user.location}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="hack-card p-5">
            <h3 className="text-white font-700 text-sm mb-3">Availability</h3>
            {editing ? (
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as 'available' | 'open' | 'busy' | 'unavailable')}
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
            <input
              type="text"
              placeholder="Search skills..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="w-full text-xs py-1.5 px-3 mb-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white placeholder-white/30 focus:outline-none focus:border-hack-primary/40 transition-colors"
            />
            <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {(user?.skills || [])
                .filter((skill) => skill.toLowerCase().includes(skillSearch.toLowerCase()))
                .map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/80 hover:bg-white/[0.04] transition-all hover:text-white"
                  >
                    {skill}
                  </span>
                ))}
              {topLanguages
                .filter((lang) => !user?.skills?.includes(lang.name))
                .filter((lang) => lang.name.toLowerCase().includes(skillSearch.toLowerCase()))
                .map((lang) => (
                  <span
                    key={lang.name}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/80 hover:bg-white/[0.04] transition-all hover:text-white flex items-center gap-1.5"
                    style={{ borderColor: `${lang.color}40`, color: lang.color }}
                  >
                    {lang.name}
                    <span className="text-[8px] opacity-60">GitHub</span>
                  </span>
                ))}
            </div>
          </div>

          {/* Domains of Interest */}
          <div className="hack-card p-5">
            <h3 className="text-white font-700 text-sm mb-3.5">Domains of Interest</h3>
            <div className="flex flex-wrap gap-1.5">
              {(user?.domains && user.domains.length > 0) ? (
                user.domains.map((domain) => {
                  const colors = [
                    { border: "rgba(124,92,255,0.3)", text: "#A78BFF", bg: "rgba(124,92,255,0.06)" },
                    { border: "rgba(79,124,255,0.3)", text: "#4F7CFF", bg: "rgba(79,124,255,0.06)" },
                    { border: "rgba(34,197,94,0.3)", text: "#22C55E", bg: "rgba(34,197,94,0.06)" },
                    { border: "rgba(245,158,11,0.3)", text: "#F59E0B", bg: "rgba(245,158,11,0.06)" },
                    { border: "rgba(239,68,68,0.3)", text: "#EF4444", bg: "rgba(239,68,68,0.06)" },
                  ];
                  const charCodeSum = domain.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const colorScheme = colors[charCodeSum % colors.length];

                  return (
                    <span
                      key={domain}
                      className="px-2.5 py-1 text-xs font-500 rounded-lg border transition-all"
                      style={{
                        borderColor: colorScheme.border,
                        color: colorScheme.text,
                        background: colorScheme.bg,
                      }}
                    >
                      {domain}
                    </span>
                  );
                })
              ) : (
                <div className="text-white/30 text-xs">No domains listed. Upload resume to parse.</div>
              )}
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="hack-card p-6">
            <h3 className="text-white font-700 text-sm mb-4">Connected Accounts</h3>
            <div className="space-y-4">
              
              {/* CARD 1: GitHub */}
              {user?.github_connected ? (
                <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 p-4">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08]">
                        <Github size={16} className="text-white" />
                      </div>
                      <div>
                        <h4 className="text-white text-xs font-600">GitHub</h4>
                        <p className="text-white/45 text-[9px]">Developer Analytics</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-600 px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-green-500/10 text-[#22C55E] border border-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                      Connected
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                    <img
                      src={user?.github_avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=github"}
                      alt={user?.github_username || "GitHub avatar"}
                      className="w-10 h-10 rounded-full object-cover border border-white/[0.08]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-600 truncate">
                        {user?.github_username || "Connected Developer"}
                      </div>
                      {user?.github && (
                        <a
                          href={user.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-hack-primary text-[10px] hover:underline flex items-center gap-0.5 truncate"
                        >
                          @{user.github_username}
                          <ExternalLink size={8} />
                        </a>
                      )}
                      {user?.github_connected_at && (
                        <div className="text-white/30 text-[9px] mt-0.5">
                          Connected: {new Date(user.github_connected_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GitHub stats micro-grid */}
                  <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-white/[0.03] text-center">
                    <div>
                      <div className="text-white text-xs font-700">{githubStats?.public_repos ?? 0}</div>
                      <div className="text-white/35 text-[8px] uppercase tracking-wider">Repos</div>
                    </div>
                    <div>
                      <div className="text-white text-xs font-700">{githubStats?.total_commits ?? 0}</div>
                      <div className="text-white/35 text-[8px] uppercase tracking-wider">Commits</div>
                    </div>
                    <div>
                      <div className="text-white text-xs font-700">{githubStats?.active_days ?? 0}</div>
                      <div className="text-white/35 text-[8px] uppercase tracking-wider">Days</div>
                    </div>
                    <div>
                      <div className="text-white text-xs font-700">{githubStats?.score ?? 0}</div>
                      <div className="text-white/35 text-[8px] uppercase tracking-wider">Score</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.1] transition-all duration-300 p-4 flex flex-col justify-between h-32">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/[0.06]">
                      <Github size={16} className="text-white/40" />
                    </div>
                    <div>
                      <h4 className="text-white/70 text-xs font-600">GitHub</h4>
                      <p className="text-white/35 text-[9px]">Not Connected</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      try {
                        sessionStorage.setItem("oauth_provider", "github");
                        sessionStorage.setItem("oauth_redirect_path", window.location.pathname);
                        const { error } = await supabase.auth.signInWithOAuth({
                          provider: "github",
                          options: {
                            redirectTo: window.location.origin,
                            queryParams: {
                              prompt: "select_account",
                              allow_signup: "true",
                            },
                          },
                        });
                        if (error) throw error;
                      } catch (err: any) {
                        toast.error(err.message || "Failed to trigger GitHub OAuth");
                      }
                    }}
                    className="w-full text-center text-xs font-600 py-2 rounded-lg transition-all border border-white/[0.08] bg-white/[0.02] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    Connect GitHub
                  </button>
                </div>
              )}

              {/* CARD 2: LinkedIn */}
              {user?.linkedin_connected ? (
                <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 p-4">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0A66C2]/10 border border-[#0A66C2]/20">
                        <Linkedin size={16} className="text-[#0A66C2]" />
                      </div>
                      <div>
                        <h4 className="text-white text-xs font-600">LinkedIn</h4>
                        <p className="text-white/45 text-[9px]">Professional Profile</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-600 px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-green-500/10 text-[#22C55E] border border-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                      Connected
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                    <img
                      src={user?.linkedin_avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=linkedin"}
                      alt={user?.linkedin_name || "LinkedIn avatar"}
                      className="w-10 h-10 rounded-full object-cover border border-white/[0.08]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-600 truncate">
                        {user?.linkedin_name || "Connected Builder"}
                      </div>
                      {user?.linkedin_url && (
                        <a
                          href={user.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-hack-primary text-[10px] hover:underline flex items-center gap-0.5 truncate"
                        >
                          View Profile
                          <ExternalLink size={8} className="inline ml-0.5" />
                        </a>
                      )}
                      {user?.linkedin_connected_at && (
                        <div className="text-white/30 text-[9px] mt-0.5">
                          Connected: {new Date(user.linkedin_connected_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.1] transition-all duration-300 p-4 flex flex-col justify-between h-32">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/[0.06]">
                      <Linkedin size={16} className="text-white/40" />
                    </div>
                    <div>
                      <h4 className="text-white/70 text-xs font-600">LinkedIn</h4>
                      <p className="text-white/35 text-[9px]">Not Connected</p>
                    </div>
                  </div>
                  
                  <button
                    disabled={linkingLinkedIn}
                    onClick={async () => {
                      try {
                        await connectLinkedIn(window.location.pathname);
                      } catch (err: any) {
                        toast.error(err.message || "Unable to connect LinkedIn");
                      }
                    }}
                    className="w-full text-center text-xs font-600 py-2 rounded-lg transition-all border border-white/[0.08] bg-white/[0.02] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    {linkingLinkedIn ? "Connecting..." : "Connect LinkedIn"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Columns */}
        <div className="lg:col-span-2 space-y-5">
          {/* Resume Upload Card */}
          <div className="hack-card p-6 relative overflow-hidden bg-white/[0.01] border border-white/[0.06] rounded-xl hover:border-white/[0.1] transition-all">
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#7C5CFF]/10 border border-[#7C5CFF]/20">
                <FileText size={16} className="text-[#A78BFF]" />
              </div>
              <div>
                <h4 className="text-white text-xs font-700">Resume Parser</h4>
                <p className="text-white/40 text-[9px]">Upload PDF, DOC, or DOCX to auto-prefill and sync profile</p>
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) await handleResumeUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-all duration-300 bg-white/[0.01] hover:bg-white/[0.02] flex flex-col items-center justify-center gap-2"
              style={{
                borderColor: dragging ? "#7C5CFF" : "rgba(255, 255, 255, 0.08)",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleResumeUpload(file);
                }}
              />
              {parsingResume ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-[#A78BFF] animate-spin" />
                  <p className="text-white text-xs font-500">Extracting details from resume...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-white/40" />
                  <p className="text-white/70 text-xs font-600">Drag & drop your resume here, or click to upload</p>
                  <p className="text-white/30 text-[9px]">PDF, DOC, DOCX — Max 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* ── REAL GitHub Analytics Card ── */}
          <GitHubAnalyticsCard
            onConnect={handleGitHubConnect}
            onDisconnect={handleGitHubDisconnect}
          />

          {/* Experience */}
          <div className="hack-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase size={16} className="text-hack-primary" />
              <h3 className="text-white font-700">Experience</h3>
            </div>
            
            <div className="relative border-l border-white/[0.08] ml-3.5 pl-6 space-y-6">
              {(user?.experiences && user.experiences.length > 0) ? (
                user.experiences.map((exp, i) => (
                  <div key={exp.id || i} className="relative">
                    {/* Circle timeline dot */}
                    <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-hack-primary bg-[#0E111B] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-hack-primary" />
                    </div>
                    <div>
                      <div className="text-white font-600 text-sm">{exp.title}</div>
                      <div className="flex items-center gap-2 text-hack-primary text-xs mt-0.5 font-500">
                        <span>{exp.company}</span>
                        {exp.period && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/30" />
                            <span className="text-white/40">{exp.period}</span>
                          </>
                        )}
                      </div>
                      {exp.description && (
                        <p className="text-white/50 text-xs mt-2 leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/30 text-xs pl-2">No experience listed. Upload resume to extract.</div>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="hack-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap size={16} className="text-hack-blue" />
              <h3 className="text-white font-700">Education</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(user?.education && user.education.length > 0) ? (
                user.education.map((edu, i) => (
                  <div
                    key={edu.id || i}
                    className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] flex gap-3.5 hover:border-white/[0.1] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-hack-blue/10 border border-hack-blue/20 flex-shrink-0 mt-0.5">
                      <GraduationCap size={14} className="text-hack-blue" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-600 text-sm truncate">{edu.degree}</div>
                      <div className="text-white/60 text-xs mt-0.5 truncate">{edu.institution}</div>
                      {edu.field_of_study && (
                        <div className="text-white/40 text-[10px] mt-1">{edu.field_of_study}</div>
                      )}
                      {(edu.start_year || edu.end_year) && (
                        <div className="text-white/30 text-[9px] mt-1">
                          {edu.start_year || "?"} – {edu.end_year || "?"}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/30 text-xs col-span-2">No education history listed. Upload resume to extract.</div>
              )}
            </div>
          </div>

          {/* Projects */}
          <div className="hack-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Code size={16} className="text-hack-green" />
              <h3 className="text-white font-700">Projects</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(user?.projects && user.projects.length > 0) ? (
                user.projects.map((proj, i) => (
                  <div
                    key={proj.id || i}
                    className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-white/[0.1] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="text-white font-600 text-sm mb-2">{proj.title}</h4>
                      {proj.description && (
                        <p className="text-white/50 text-xs leading-relaxed mb-4">
                          {proj.description}
                        </p>
                      )}
                      {proj.tech_stack && proj.tech_stack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {proj.tech_stack.map((tech) => (
                            <span
                              key={tech}
                              className="px-2 py-0.5 text-[9px] rounded-md bg-white/[0.03] border border-white/[0.06] text-white/60"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/[0.03]">
                      {proj.github_url && (
                        <a
                          href={proj.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-1.5 px-3 rounded-lg text-[10px] font-600 bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
                        >
                          <Github size={10} />
                          GitHub
                        </a>
                      )}
                      {proj.live_url && (
                        <a
                          href={proj.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-1.5 px-3 rounded-lg text-[10px] font-600 bg-hack-primary text-white hover:bg-hack-primary/90 transition-all flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink size={10} />
                          Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/30 text-xs col-span-2">No projects listed. Upload resume to extract.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
