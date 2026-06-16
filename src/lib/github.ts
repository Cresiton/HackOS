import { GITHUB_CLIENT_ID } from "@/constants";

export interface GitHubProfile {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
  location: string;
  company: string;
  blog: string;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  topics: string[];
  fork: boolean;
}

export interface GitHubLanguages {
  [language: string]: number;
}

export interface GitHubAnalytics {
  profile: GitHubProfile;
  repos: GitHubRepo[];
  topLanguages: { name: string; bytes: number; percentage: number; color: string }[];
  totalStars: number;
  totalForks: number;
  recentActivity: string;
  username: string;
}

// Language color map (popular ones)
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#4F7CFF",
  JavaScript: "#F7DF1E",
  Python: "#3776AB",
  Java: "#ED8B00",
  Go: "#00ADD8",
  Rust: "#DEA584",
  "C++": "#F34B7D",
  C: "#555555",
  "C#": "#239120",
  Ruby: "#CC342D",
  PHP: "#4F5D95",
  Swift: "#FA7343",
  Kotlin: "#7F52FF",
  Dart: "#00B4AB",
  Shell: "#89E051",
  HTML: "#E34C26",
  CSS: "#1572B6",
  Jupyter: "#DA5B0B",
  R: "#276DC3",
  Scala: "#DC322F",
  Vue: "#41B883",
  Svelte: "#FF3E00",
  Elixir: "#6E4A7E",
  Haskell: "#5E5086",
};

export function getLangColor(lang: string): string {
  return LANG_COLORS[lang] || "#7C5CFF";
}

// ── GitHub OAuth ─────────────────────────────────────────────────────────────
export function startGitHubOAuth(): Promise<string> {
  return new Promise((resolve, reject) => {
    const state = Math.random().toString(36).slice(2);
    localStorage.setItem("github_oauth_state", state);

    const redirectUri = `${window.location.origin}/github-callback`;
    const scope = "read:user,public_repo";
    const authUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}`;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      "github-oauth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    // Listen for message from callback page
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "github-oauth-success") {
        const { code, state: returnedState } = event.data;
        const savedState = localStorage.getItem("github_oauth_state");
        if (returnedState !== savedState) {
          reject(new Error("OAuth state mismatch. Please try again."));
          return;
        }
        localStorage.removeItem("github_oauth_state");
        window.removeEventListener("message", onMessage);
        popup.close();
        resolve(code);
      } else if (event.data?.type === "github-oauth-error") {
        window.removeEventListener("message", onMessage);
        popup.close();
        reject(new Error(event.data.error || "Authorization denied"));
      }
    };

    window.addEventListener("message", onMessage);

    // Detect popup closed without completing OAuth
    const pollClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClosed);
        window.removeEventListener("message", onMessage);
        reject(new Error("GitHub authorization was cancelled."));
      }
    }, 500);
  });
}

// ── GitHub Public API (no token needed) ─────────────────────────────────────
export async function fetchGitHubPublicProfile(username: string): Promise<GitHubProfile> {
  const res = await fetch(`https://api.github.com/users/${username}`);
  if (!res.ok) throw new Error(`GitHub user not found: ${username}`);
  return res.json();
}

export async function fetchGitHubRepos(username: string, token?: string): Promise<GitHubRepo[]> {
  const headers: HeadersInit = token ? { Authorization: `token ${token}` } : {};
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=30&type=owner`,
    { headers }
  );
  if (!res.ok) throw new Error("Failed to fetch repositories");
  const repos: GitHubRepo[] = await res.json();
  return repos.filter((r) => !r.fork);
}

export async function fetchRepoLanguages(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubLanguages> {
  const headers: HeadersInit = token ? { Authorization: `token ${token}` } : {};
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
  if (!res.ok) return {};
  return res.json();
}

// ── Full Analytics Aggregator ─────────────────────────────────────────────────
export async function buildGitHubAnalytics(
  username: string,
  token?: string
): Promise<GitHubAnalytics> {
  const [profile, repos] = await Promise.all([
    fetchGitHubPublicProfile(username),
    fetchGitHubRepos(username, token),
  ]);

  // Aggregate language bytes from top 8 repos
  const langTotals: Record<string, number> = {};
  const topRepos = repos.slice(0, 8);

  await Promise.allSettled(
    topRepos.map(async (repo) => {
      const langs = await fetchRepoLanguages(username, repo.name, token);
      Object.entries(langs).forEach(([lang, bytes]) => {
        langTotals[lang] = (langTotals[lang] || 0) + bytes;
      });
    })
  );

  const totalBytes = Object.values(langTotals).reduce((a, b) => a + b, 0);
  const topLanguages = Object.entries(langTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
      color: getLangColor(name),
    }));

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);

  // Most recent commit date
  const sortedByUpdate = [...repos].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const recentActivity = sortedByUpdate[0]?.updated_at
    ? new Date(sortedByUpdate[0].updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Unknown";

  return {
    profile,
    repos: repos.slice(0, 6), // top 6 for display
    topLanguages,
    totalStars,
    totalForks,
    recentActivity,
    username,
  };
}

// ── Simulate OAuth for demo (when popup flow fails) ──────────────────────────
export async function simulateGitHubConnect(username: string): Promise<GitHubAnalytics> {
  return buildGitHubAnalytics(username);
}
