import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from "recharts";
import {
  Github, Star, GitFork, ExternalLink, RefreshCw,
  Code, Clock, Users, AlertCircle, Loader2, CheckCircle,
  Zap, TrendingUp, GitBranch, Globe, X
} from "lucide-react";
import { GitHubAnalytics, GitHubRepo, startGitHubOAuth, buildGitHubAnalytics, simulateGitHubConnect } from "@/lib/github";
import { toast } from "sonner";

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = "hackos_github_analytics";

function saveAnalytics(data: GitHubAnalytics) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
}

function loadAnalytics(): GitHubAnalytics | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    // Cache for 30 minutes
    if (Date.now() - savedAt > 30 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

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
function RepoCard({ repo }: { repo: GitHubRepo }) {
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
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: "#7C5CFF" }}
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

      {repo.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 3).map((topic) => (
            <span key={topic} className="tag text-[9px] px-1.5 py-0.5">{topic}</span>
          ))}
        </div>
      )}
    </a>
  );
}

// ─── Language Bar Chart ───────────────────────────────────────────────────────
function LanguageChart({ data }: { data: GitHubAnalytics["topLanguages"] }) {
  const chartData = data.map((l) => ({ name: l.name, value: l.percentage, color: l.color }));

  return (
    <div>
      {/* Recharts bar chart */}
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

      {/* Legend rows with progress bars */}
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
  onManualEntry,
}: {
  onConnect: () => void;
  connecting: boolean;
  onManualEntry: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-6 gap-5">
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Github size={30} className="text-white" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.2))" }} />
      </div>

      <div>
        <h4 className="text-white font-700 text-base mb-1.5">Connect GitHub</h4>
        <p className="text-white/40 text-sm leading-relaxed max-w-xs">
          Showcase your repositories, language breakdown, stars, and contribution history.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-xs text-white/40">
        {["Repos & Stars", "Language Stats", "Contribution Graph", "Pinned Projects"].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle size={11} className="text-hack-primary flex-shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={onConnect}
          disabled={connecting}
          className="hack-btn-primary w-full justify-center py-3 text-base"
        >
          {connecting ? (
            <><Loader2 size={16} className="animate-spin" /> Connecting...</>
          ) : (
            <><Github size={16} /> Connect with GitHub OAuth</>
          )}
        </button>
        <button
          onClick={onManualEntry}
          className="text-white/35 text-xs hover:text-white/60 transition-colors py-1"
        >
          Enter username manually →
        </button>
      </div>
    </div>
  );
}

// ─── Manual Username Entry ────────────────────────────────────────────────────
function ManualEntry({
  onSubmit,
  loading,
  onBack,
}: {
  onSubmit: (username: string) => void;
  loading: boolean;
  onBack: () => void;
}) {
  const [username, setUsername] = useState("");

  return (
    <div className="flex flex-col items-center text-center py-4 gap-4">
      <div>
        <h4 className="text-white font-700 text-base mb-1">Enter GitHub Username</h4>
        <p className="text-white/40 text-sm">We'll fetch your public profile and repos</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9\-]/g, ""))}
            placeholder="github-username"
            className="hack-input pl-8"
            onKeyDown={(e) => {
              if (e.key === "Enter" && username.trim()) onSubmit(username.trim());
            }}
            autoFocus
          />
        </div>
        <button
          onClick={() => username.trim() && onSubmit(username.trim())}
          disabled={!username.trim() || loading}
          className="hack-btn-primary w-full justify-center py-2.5"
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Fetching...</>
          ) : (
            <><Github size={14} /> Load Profile</>
          )}
        </button>
        <button onClick={onBack} className="text-white/30 text-xs hover:text-white/50 transition-colors">
          ← Back to OAuth
        </button>
      </div>
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────
function StatsRow({ analytics }: { analytics: GitHubAnalytics }) {
  const stats = [
    { label: "Repos", value: analytics.profile.public_repos, icon: Code, color: "#7C5CFF" },
    { label: "Stars", value: analytics.totalStars, icon: Star, color: "#F59E0B" },
    { label: "Forks", value: analytics.totalForks, icon: GitFork, color: "#4F7CFF" },
    { label: "Followers", value: analytics.profile.followers, icon: Users, color: "#22C55E" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((s) => (
        <div
          key={s.label}
          className="text-center p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <s.icon size={14} style={{ color: s.color }} className="mx-auto mb-1" />
          <div className="text-white font-700 text-base">{s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}K` : s.value}</div>
          <div className="text-white/35 text-[9px] uppercase tracking-wide">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface GitHubAnalyticsCardProps {
  initialAnalytics?: GitHubAnalytics | null;
  onConnect?: (analytics: GitHubAnalytics) => void;
  onDisconnect?: () => void;
}

export default function GitHubAnalyticsCard({
  initialAnalytics,
  onConnect,
  onDisconnect,
}: GitHubAnalyticsCardProps) {
  const [analytics, setAnalytics] = useState<GitHubAnalytics | null>(
    initialAnalytics || loadAnalytics()
  );
  const [view, setView] = useState<"connect" | "manual" | "loading" | "data">(
    initialAnalytics || loadAnalytics() ? "data" : "connect"
  );
  const [connecting, setConnecting] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"languages" | "repos" | "activity">("languages");
  const [refreshing, setRefreshing] = useState(false);

  // Sync if initialAnalytics changes
  useEffect(() => {
    if (initialAnalytics) {
      setAnalytics(initialAnalytics);
      setView("data");
    }
  }, [initialAnalytics]);

  const handleOAuth = async () => {
    setConnecting(true);
    setError(null);
    try {
      // Try real OAuth popup
      const code = await startGitHubOAuth();
      // Since we can't exchange the code for a token client-side (CORS),
      // we fall back to asking for the username — or in demo we auto-fetch
      // public data. For a production app you'd POST code to your backend.
      toast.info("OAuth authorized! Loading your public GitHub profile...");
      // Extract username from URL (GitHub returns it in authorized URL)
      // For this demo, we'll prompt for username after OAuth
      setConnecting(false);
      setView("manual");
    } catch (err: any) {
      setConnecting(false);
      if (err.message?.includes("cancelled")) {
        toast.info("GitHub authorization cancelled.");
      } else if (err.message?.includes("Popup blocked")) {
        toast.error("Popup blocked — please allow popups and try again, or use manual entry.");
        setView("manual");
      } else {
        // Fallback to manual for other errors
        setView("manual");
      }
    }
  };

  const handleManualUsername = async (username: string) => {
    setLoadingManual(true);
    setError(null);
    try {
      const data = await buildGitHubAnalytics(username);
      setAnalytics(data);
      saveAnalytics(data);
      setView("data");
      onConnect?.(data);
      toast.success(`GitHub profile loaded: @${username} 🚀`);
    } catch (err: any) {
      setError(err.message || "Failed to load GitHub profile");
      toast.error("Could not load GitHub profile. Check the username.");
    } finally {
      setLoadingManual(false);
    }
  };

  const handleRefresh = async () => {
    if (!analytics?.username) return;
    setRefreshing(true);
    try {
      localStorage.removeItem("hackos_github_analytics");
      const data = await buildGitHubAnalytics(analytics.username);
      setAnalytics(data);
      saveAnalytics(data);
      toast.success("GitHub data refreshed!");
    } catch {
      toast.error("Failed to refresh. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem("hackos_github_analytics");
    setAnalytics(null);
    setView("connect");
    onDisconnect?.();
    toast.info("GitHub disconnected.");
  };

  return (
    <div
      className="hack-card overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(124,92,255,0.04) 0%, rgba(14,17,27,0.98) 100%)",
      }}
    >
      {/* Header */}
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
            {analytics && (
              <a
                href={analytics.profile.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-hack-primary text-[10px] flex items-center gap-1 hover:underline"
              >
                @{analytics.username}
                <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {analytics && (
            <>
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-600"
                style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-hack-green animate-pulse" />
                Connected
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                title="Refresh data"
              >
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              </button>
              <button
                onClick={handleDisconnect}
                className="p-1.5 rounded-lg text-white/20 hover:text-hack-red hover:bg-white/5 transition-all"
                title="Disconnect GitHub"
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Error state */}
        {error && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-4"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle size={14} className="text-hack-red flex-shrink-0" />
            <span className="text-white/60 text-xs flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-white/30 hover:text-white/60">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Connect prompt */}
        {view === "connect" && (
          <ConnectPrompt
            onConnect={handleOAuth}
            connecting={connecting}
            onManualEntry={() => setView("manual")}
          />
        )}

        {/* Manual entry */}
        {view === "manual" && (
          <ManualEntry
            onSubmit={handleManualUsername}
            loading={loadingManual}
            onBack={() => setView("connect")}
          />
        )}

        {/* Data view */}
        {view === "data" && analytics && (
          <div className="space-y-5">
            {/* Profile summary */}
            <div
              className="flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <img
                src={analytics.profile.avatar_url}
                alt={analytics.username}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-white font-600 text-sm">{analytics.profile.name || analytics.username}</div>
                {analytics.profile.bio && (
                  <div className="text-white/40 text-xs truncate">{analytics.profile.bio}</div>
                )}
                <div className="flex items-center gap-3 text-white/30 text-[10px] mt-0.5">
                  {analytics.profile.location && (
                    <span className="flex items-center gap-1">
                      <Globe size={9} /> {analytics.profile.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={9} /> Active {analytics.recentActivity}
                  </span>
                </div>
              </div>
              <a
                href={analytics.profile.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all flex-shrink-0"
              >
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Stats */}
            <StatsRow analytics={analytics} />

            {/* Tabs */}
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
                  {tab === "languages" ? "Languages" : tab === "repos" ? "Top Repos" : "Activity"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "languages" && (
              analytics.topLanguages.length > 0 ? (
                <LanguageChart data={analytics.topLanguages} />
              ) : (
                <div className="text-center py-6 text-white/30 text-sm">
                  No language data found in public repositories.
                </div>
              )
            )}

            {activeTab === "repos" && (
              <div className="space-y-3">
                {analytics.repos.length > 0 ? (
                  analytics.repos.map((repo) => (
                    <RepoCard key={repo.id} repo={repo} />
                  ))
                ) : (
                  <div className="text-center py-6 text-white/30 text-sm">
                    No public repositories found.
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-4">
                {/* Activity stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: TrendingUp, label: "Most Active Language", value: analytics.topLanguages[0]?.name || "N/A", color: analytics.topLanguages[0]?.color || "#7C5CFF" },
                    { icon: Zap, label: "Last Activity", value: analytics.recentActivity, color: "#F59E0B" },
                    { icon: Star, label: "Total Stars Earned", value: `${analytics.totalStars}`, color: "#F59E0B" },
                    { icon: Code, label: "Public Repos", value: `${analytics.profile.public_repos}`, color: "#7C5CFF" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-3.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <item.icon size={13} style={{ color: item.color }} className="mb-2" />
                      <div className="text-white font-600 text-sm leading-tight">{item.value}</div>
                      <div className="text-white/35 text-[10px] mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Language mini pie */}
                {analytics.topLanguages.length > 0 && (
                  <div
                    className="p-4 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="text-white/50 text-xs font-600 mb-3 flex items-center gap-1.5">
                      <Code size={12} className="text-hack-primary" />
                      Language Distribution
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <PieChart width={80} height={80}>
                          <Pie
                            data={analytics.topLanguages}
                            dataKey="percentage"
                            cx={40}
                            cy={40}
                            outerRadius={36}
                            innerRadius={22}
                            strokeWidth={0}
                          >
                            {analytics.topLanguages.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-y-2 gap-x-3">
                        {analytics.topLanguages.map((lang) => (
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

            {/* Footer action */}
            <a
              href={analytics.profile.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-600 transition-all w-full"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <Github size={12} />
              View full profile on GitHub
              <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
