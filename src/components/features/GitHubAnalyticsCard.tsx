import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from "recharts";
import {
  Github, Star, GitFork, ExternalLink, RefreshCw,
  Code, Clock, Users, AlertCircle, Loader2, CheckCircle,
  Zap, TrendingUp, GitBranch, Globe, X, Calendar, Sparkles
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useGithubStats } from "@/hooks/useGithubStats";
import { getLangColor } from "@/lib/github";

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-sm"
      style={{ background: "#131826", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
    >
      <div className="text-white font-600">{label}</div>
      <div style={{ color: payload[0].color }}>{payload[0].value}%</div>
    </div>
  );
}

// ─── Repo Card ────────────────────────────────────────────────────────────────
interface RepoProps {
  name: string;
  html_url: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics?: string[];
}

function RepoCard({ repo }: { repo: RepoProps }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 p-4 rounded-2xl transition-all"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch size={13} className="text-hack-primary flex-shrink-0" />
          <span className="text-white font-600 text-sm truncate group-hover:text-hack-primary transition-colors">
            {repo.name}
          </span>
        </div>
        <ExternalLink size={11} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0 mt-0.5" />
      </div>

      {repo.description && (
        <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{repo.description}</p>
      )}

      <div className="flex items-center gap-3 text-white/35 text-[10px]">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: getLangColor(repo.language) }}
            />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star size={10} />
          {repo.stargazers_count}
        </span>
        <span className="flex items-center gap-1">
          <GitFork size={10} />
          {repo.forks_count}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Clock size={9} />
          {new Date(repo.updated_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
        </span>
      </div>

      {repo.topics && repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {repo.topics.slice(0, 3).map((topic) => (
            <span key={topic} className="tag text-[9px] px-1.5 py-0.5">{topic}</span>
          ))}
        </div>
      )}
    </a>
  );
}

// ─── Language Bar Chart ───────────────────────────────────────────────────────
function LanguageChart({ data }: { data: { name: string; percentage: number; color: string }[] }) {
  const chartData = data.map((l) => ({ name: l.name, value: l.percentage, color: l.color }));

  return (
    <div>
      <div className="h-36 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={18} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5">
        {data.map((lang) => (
          <div key={lang.name}>
            <div className="flex justify-between text-xs mb-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                  style={{ background: lang.color }}
                />
                <span className="text-white/70">{lang.name}</span>
              </div>
              <span className="font-600" style={{ color: lang.color }}>{lang.percentage}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${lang.percentage}%`, background: lang.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Connect Prompt ───────────────────────────────────────────────────────────
function ConnectPrompt({
  onConnect,
  connecting,
}: {
  onConnect: () => void;
  connecting: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-5">
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center animate-pulse"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Github size={30} className="text-white" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.2))" }} />
      </div>

      <div>
        <h4 className="text-white font-700 text-base mb-1.5">Connect GitHub Account</h4>
        <p className="text-white/40 text-sm leading-relaxed max-w-xs">
          Synchronize public repositories, language distribution, commits, active days and match scores.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-xs text-white/40">
        {["Repositories", "Language Distribution", "Author Commits Count", "Active Days Tracker"].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle size={11} className="text-hack-primary flex-shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-xs mt-2">
        <button
          onClick={onConnect}
          disabled={connecting}
          className="hack-btn-primary w-full justify-center py-3 text-sm"
        >
          {connecting ? (
            <><Loader2 size={16} className="animate-spin" /> Triggering OAuth...</>
          ) : (
            <><Github size={16} /> Connect with GitHub</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────────
function getScoreBadge(score: number): { label: string; color: string } {
  if (score >= 1000) return { label: "Elite Architect", color: "#FFD700" };
  if (score >= 500) return { label: "Master Builder", color: "#A78BFF" };
  if (score >= 200) return { label: "Pro Developer", color: "#4F7CFF" };
  if (score >= 50) return { label: "Rising Hacker", color: "#22C55E" };
  return { label: "Explorer", color: "rgba(255,255,255,0.4)" };
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface GitHubAnalyticsCardProps {
  initialAnalytics?: any;
  onConnect?: (analytics: any) => void;
  onDisconnect?: () => void;
}

export default function GitHubAnalyticsCard({
  onConnect,
  onDisconnect,
}: GitHubAnalyticsCardProps) {
  const { user: currentUser, updateUser } = useAuth();
  const { stats, loading, syncing, error, syncStats } = useGithubStats(currentUser?.id);

  const [activeTab, setActiveTab] = useState<"languages" | "repos" | "activity">("languages");
  const [repos, setRepos] = useState<RepoProps[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // Trigger Supabase OAuth
  const handleOAuthConnect = async () => {
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
  };

  // Sync GitHub Statistics
  const handleSync = async () => {
    if (!currentUser?.id) return;
    const toastId = toast.loading("Syncing GitHub repositories & commits. This may take a moment...");
    try {
      const result = await syncStats();
      if (result) {
        // Clear cached repos list to trigger refresh if tab changes
        setRepos([]);
        toast.success("GitHub statistics successfully synced! 🚀", { id: toastId });
        if (onConnect) onConnect(result);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync GitHub statistics.", { id: toastId });
    }
  };

  // Disconnect GitHub
  const handleDisconnect = async () => {
    if (!currentUser?.id) return;
    const confirm = window.confirm("Are you sure you want to disconnect GitHub? All synced statistics will be deleted.");
    if (!confirm) return;

    try {
      // 1. Remove database entries from github_stats table
      const { error: dbErr } = await supabase
        .from("github_stats")
        .delete()
        .eq("user_id", currentUser.id);

      if (dbErr) throw dbErr;

      // 2. Sync clean states to Profiles table
      await updateUser({
        github_connected: false,
        github_username: undefined,
        github_avatar: undefined,
        github: undefined,
      });

      setRepos([]);
      toast.success("GitHub disconnected.");
      if (onDisconnect) onDisconnect();
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect GitHub.");
    }
  };

  // Client-side fetch repositories of user on repository tab active
  useEffect(() => {
    if (activeTab === "repos" && stats?.github_username && repos.length === 0) {
      setLoadingRepos(true);
      fetch(`https://api.github.com/users/${stats.github_username}/repos?sort=updated&per_page=12`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load repositories");
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setRepos(data.filter((r: any) => !r.fork).slice(0, 6));
          }
        })
        .catch((err) => console.error("Error loading repositories list:", err))
        .finally(() => setLoadingRepos(false));
    }
  }, [activeTab, stats?.github_username, repos.length]);

  // Map languages list for rendering charts
  const languagesList = stats?.languages
    ? Object.entries(stats.languages)
        .sort(([, a], [, b]) => b - a)
        .map(([name, percentage]) => ({
          name,
          percentage,
          color: getLangColor(name),
        }))
    : [];

  const showStatsPrompt = currentUser?.github_connected && !stats && !loading;

  return (
    <div
      className="hack-card overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(124,92,255,0.04) 0%, rgba(14,17,27,0.98) 100%)",
      }}
    >
      {/* Card Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <Github size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-700 text-sm">GitHub Analytics</h3>
            {stats && (
              <a
                href={`https://github.com/${stats.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-hack-primary text-[10px] flex items-center gap-1 hover:underline"
              >
                @{stats.github_username}
                <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.github_connected && (
            <>
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-600"
                style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-hack-green animate-pulse" />
                Connected
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
                title="Refresh GitHub Stats"
              >
                <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              </button>
              <button
                onClick={handleDisconnect}
                className="p-1.5 rounded-lg text-white/20 hover:text-hack-red hover:bg-white/5 transition-all"
                title="Disconnect GitHub"
              >
                <X size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-6">
        {error && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-4"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle size={14} className="text-hack-red flex-shrink-0" />
            <span className="text-white/60 text-xs flex-1">{error}</span>
          </div>
        )}

        {/* OAuth Not Connected Prompt */}
        {!currentUser?.github_connected && (
          <ConnectPrompt
            onConnect={handleOAuthConnect}
            connecting={loading}
          />
        )}

        {/* Sync Prompt if connected but no database stats loaded yet */}
        {showStatsPrompt && (
          <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
            <Sparkles size={28} className="text-hack-primary animate-pulse" />
            <div>
              <h4 className="text-white font-600 text-sm mb-1">Synchronize Stats Needed</h4>
              <p className="text-white/40 text-xs max-w-xs">
                Your account is linked! Sync your GitHub stats now to generate your developer rating and score.
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="hack-btn-primary py-2 px-5 text-xs font-600"
            >
              {syncing ? (
                <><Loader2 size={13} className="animate-spin" /> Syncing...</>
              ) : (
                "Sync Statistics"
              )}
            </button>
          </div>
        )}

        {/* Loading Database State */}
        {loading && !syncing && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 size={24} className="text-hack-primary animate-spin" />
            <span className="text-white/40 text-xs">Loading GitHub stats...</span>
          </div>
        )}

        {/* Syncing active loading screen */}
        {syncing && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <Loader2 size={28} className="text-hack-primary animate-spin" />
            <div>
              <span className="text-white font-600 text-sm block">Syncing GitHub Repositories...</span>
              <span className="text-white/40 text-xs mt-1 block max-w-xs">
                We are counting your commits, tracking active contribution days, and calculating repository languages. This may take up to a minute.
              </span>
            </div>
          </div>
        )}

        {/* Stats view */}
        {!syncing && !loading && stats && (
          <div className="space-y-6">
            {/* User Profile Info */}
            <div
              className="flex items-center gap-3.5 p-3.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div
                className="w-11 h-11 rounded-full overflow-hidden border-2"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              >
                <img
                  src={currentUser?.avatar || `https://github.com/${stats.github_username}.png`}
                  alt={stats.github_username}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-600 text-sm flex items-center gap-2">
                  {currentUser?.name || stats.github_username}
                  <span
                    className="text-[9px] font-700 px-2 py-0.5 rounded-full"
                    style={{
                      background: `${getScoreBadge(stats.score).color}15`,
                      color: getScoreBadge(stats.score).color,
                      border: `1px solid ${getScoreBadge(stats.score).color}30`,
                    }}
                  >
                    {getScoreBadge(stats.score).label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-white/30 text-[10px] mt-1">
                  <span className="flex items-center gap-1">
                    <Globe size={9} /> {currentUser?.location || "Bangalore, India"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={9} /> Sync: {new Date(stats.last_synced).toLocaleDateString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Sync Numbers Row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Repos", value: stats.public_repos, icon: Code, color: "#7C5CFF" },
                { label: "Commits", value: stats.total_commits, icon: TrendingUp, color: "#22C55E" },
                { label: "Active Days", value: stats.active_days, icon: Calendar, color: "#4F7CFF" },
                { label: "Rank Score", value: stats.score, icon: Star, color: "#F59E0B" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="text-center p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <s.icon size={13} style={{ color: s.color }} className="mx-auto mb-1.5" />
                  <div className="text-white font-700 text-base">{s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}K` : s.value}</div>
                  <div className="text-white/35 text-[9px] uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Menu Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              {(["languages", "repos", "activity"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 rounded-lg text-xs font-600 capitalize transition-all"
                  style={{
                    background: activeTab === tab ? "rgba(124,92,255,0.2)" : "transparent",
                    color: activeTab === tab ? "#A78BFF" : "rgba(255,255,255,0.35)",
                    border: activeTab === tab ? "1px solid rgba(124,92,255,0.25)" : "1px solid transparent",
                  }}
                >
                  {tab === "languages" ? "Languages" : tab === "repos" ? "Top Repos" : "Rank Stats"}
                </button>
              ))}
            </div>

            {/* Tab content view */}
            {activeTab === "languages" && (
              languagesList.length > 0 ? (
                <LanguageChart data={languagesList} />
              ) : (
                <div className="text-center py-6 text-white/30 text-sm">
                  No public repo languages detected yet.
                </div>
              )
            )}

            {activeTab === "repos" && (
              <div className="space-y-3">
                {loadingRepos ? (
                  <div className="flex justify-center items-center py-6 gap-2">
                    <Loader2 size={13} className="animate-spin text-white/40" />
                    <span className="text-white/30 text-xs">Loading repositories...</span>
                  </div>
                ) : repos.length > 0 ? (
                  repos.map((repo) => (
                    <RepoCard key={repo.name} repo={repo} />
                  ))
                ) : (
                  <div className="text-center py-6 text-white/30 text-sm">
                    No repositories found or failed to load repo list.
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: TrendingUp, label: "Top Tech Stack", value: languagesList[0]?.name || "N/A", color: languagesList[0]?.color || "#7C5CFF" },
                    { icon: Zap, label: "Developer Rank", value: getScoreBadge(stats.score).label, color: getScoreBadge(stats.score).color },
                    { icon: Code, label: "Repos Count", value: `${stats.public_repos} Repos`, color: "#4F7CFF" },
                    { icon: Users, label: "Avg Contributions", value: stats.public_repos > 0 ? `${(stats.total_commits / stats.public_repos).toFixed(1)} / repo` : "0.0", color: "#22C55E" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-3.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <item.icon size={13} style={{ color: item.color }} className="mb-2" />
                      <div className="text-white font-600 text-sm leading-tight">{item.value}</div>
                      <div className="text-white/35 text-[10px] mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Pie Chart display */}
                {languagesList.length > 0 && (
                  <div
                    className="p-4 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="text-white/50 text-xs font-600 mb-3 flex items-center gap-1.5">
                      <Code size={12} className="text-hack-primary" />
                      Languages Breakdown
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <PieChart width={80} height={80}>
                          <Pie
                            data={languagesList}
                            dataKey="percentage"
                            cx={40}
                            cy={40}
                            outerRadius={36}
                            innerRadius={22}
                            strokeWidth={0}
                          >
                            {languagesList.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-y-2 gap-x-3">
                        {languagesList.slice(0, 4).map((lang) => (
                          <div key={lang.name} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: lang.color }} />
                            <span className="text-white/60 text-[10px] truncate">{lang.name}</span>
                            <span className="text-white/30 text-[10px] ml-auto">{lang.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
