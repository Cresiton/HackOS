import { supabase } from "./supabase";
import { GitHubStats } from "@/types";

/**
 * Fetch the active GitHub OAuth provider token from the Supabase session
 * to authenticate requests to GitHub, increasing the API rate limit from 60 to 5000 requests/hr.
 */
async function fetchGitHubSessionToken(): Promise<string | undefined> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.provider_token || undefined;
}

/**
 * Perform a fetch from GitHub, handling authentication headers and rate limits.
 */
async function githubFetch(url: string, token?: string): Promise<any> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
      throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }
    // Return null or empty values for common endpoints where 404/204 is normal for empty repos
    if (res.status === 404 || res.status === 204) {
      return null;
    }
    throw new Error(`GitHub API error: ${res.statusText} (${res.status})`);
  }

  if (res.status === 204) return null;
  return res.json();
}

/**
 * Fetch all public repositories of a user, paginating if needed, and filtering out forks.
 */
async function fetchAllPublicRepos(username: string, token?: string): Promise<any[]> {
  let repos: any[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `https://api.github.com/users/${username}/repos?per_page=${perPage}&page=${page}&type=owner`;
    const data = await githubFetch(url, token);
    if (!data || !Array.isArray(data) || data.length === 0) break;
    repos = repos.concat(data);
    if (data.length < perPage) break;
    page++;
  }

  // Filter out forks to only count user's original repositories
  return repos.filter((repo) => !repo.fork);
}

/**
 * Syncs the GitHub statistics of a user to public.github_stats in Supabase.
 * Follows the 8 step aggregation flow.
 */
export async function syncGitHubStatsForUser(userId: string): Promise<GitHubStats> {
  // 1. Get username from profiles table or session user_metadata
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("github_username")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    throw new Error(`Failed to load profile for user: ${profileErr.message}`);
  }

  let username = profile?.github_username;

  // Fallback to active session user_metadata if username not stored in profile yet
  if (!username) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id === userId) {
      const metadata = session.user.user_metadata;
      username = metadata.preferred_username || metadata.user_name;
    }
  }

  if (!username) {
    throw new Error("GitHub username not found. Please connect your GitHub account first.");
  }

  // 2. Retrieve session provider token (if available)
  const token = await fetchGitHubSessionToken();

  // 3. Fetch user profile to get accurate public repos count
  const userProfile = await githubFetch(`https://api.github.com/users/${username}`, token);
  if (!userProfile) {
    throw new Error(`GitHub user profile for "${username}" could not be loaded.`);
  }
  const publicReposCount = userProfile.public_repos || 0;

  // 4. Fetch all public repositories (ignoring forks)
  const repos = await fetchAllPublicRepos(username, token);

  let totalCommits = 0;
  const activeDaysSet = new Set<string>();
  const languageBytesMap: Record<string, number> = {};

  // Fetch stats for all public repositories in parallel with resilient error bounds
  await Promise.allSettled(
    repos.map(async (repo) => {
      const owner = repo.owner.login;
      const repoName = repo.name;

      // Step A: Aggregate languages
      try {
        const url = `https://api.github.com/repos/${owner}/${repoName}/languages`;
        const langs = await githubFetch(url, token);
        if (langs) {
          Object.entries(langs).forEach(([lang, bytes]) => {
            if (typeof bytes === "number") {
              languageBytesMap[lang] = (languageBytesMap[lang] || 0) + bytes;
            }
          });
        }
      } catch (err) {
        console.warn(`Failed to fetch languages for repo ${repoName}:`, err);
      }

      // Step B: Calculate commits from contributor stats (accurate commit count)
      try {
        const url = `https://api.github.com/repos/${owner}/${repoName}/contributors`;
        const contributors = await githubFetch(url, token);
        if (contributors && Array.isArray(contributors)) {
          const userContrib = contributors.find(
            (c: any) => c.login?.toLowerCase() === username!.toLowerCase()
          );
          if (userContrib) {
            totalCommits += userContrib.contributions || 0;
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch contributors for repo ${repoName}:`, err);
      }

      // Step C: Calculate Active Days (unique commit dates)
      try {
        let page = 1;
        const perPage = 100;
        while (true) {
          const url = `https://api.github.com/repos/${owner}/${repoName}/commits?author=${username}&per_page=${perPage}&page=${page}`;
          const commits = await githubFetch(url, token);
          if (!commits || !Array.isArray(commits) || commits.length === 0) {
            break;
          }
          commits.forEach((c: any) => {
            const dateStr = c.commit?.author?.date || c.author?.date;
            if (dateStr) {
              const dateOnly = dateStr.split("T")[0]; // Extract YYYY-MM-DD
              activeDaysSet.add(dateOnly);
            }
          });
          if (commits.length < perPage) break;
          page++;
        }
      } catch (err) {
        console.warn(`Failed to fetch commits for active days in repo ${repoName}:`, err);
      }
    })
  );

  // Convert raw language bytes to percentages
  const totalBytes = Object.values(languageBytesMap).reduce((a, b) => a + b, 0);
  const languages: Record<string, number> = {};
  if (totalBytes > 0) {
    Object.entries(languageBytesMap).forEach(([lang, bytes]) => {
      const pct = Math.round((bytes / totalBytes) * 100);
      if (pct > 0) {
        languages[lang] = pct;
      }
    });
  }

  const activeDays = activeDaysSet.size;

  // Step D: Calculate score: (commits * 2) + (repos * 5) + active_days
  const score = (totalCommits * 2) + (publicReposCount * 5) + activeDays;

  const stats: GitHubStats = {
    user_id: userId,
    github_username: username,
    public_repos: publicReposCount,
    total_commits: totalCommits,
    active_days: activeDays,
    score: score,
    languages: languages,
    last_synced: new Date().toISOString(),
  };

  // 8. Upsert in database
  const { error: upsertErr } = await supabase
    .from("github_stats")
    .upsert(stats, { onConflict: "user_id" });

  if (upsertErr) {
    throw new Error(`Failed to save GitHub stats in database: ${upsertErr.message}`);
  }

  return stats;
}

/**
 * Fetch GitHub stats from Supabase database for a user
 */
export async function getGitHubStatsFromDB(userId: string): Promise<GitHubStats | null> {
  const { data, error } = await supabase
    .from("github_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error reading GitHub stats from DB:", error.message);
    return null;
  }

  return data;
}
