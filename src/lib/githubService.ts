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

  const rateLimitRemaining = res?.headers?.get("x-ratelimit-remaining");
  if (res?.status === 403 || rateLimitRemaining === "0") {
    throw new Error("GitHub API rate limit reached. Try again later.");
  }

  if (!res?.ok) {
    // Return null or empty values for common endpoints where 404/204 is normal for empty repos
    if (res?.status === 404 || res?.status === 204) {
      return null;
    }
    throw new Error(`GitHub API error: ${res?.statusText} (${res?.status})`);
  }

  if (res?.status === 204) return null;
  return res?.json();
}

/**
 * Fetch all public repositories of a user, paginating if needed, and filtering out forks.
 */
async function fetchAllPublicRepos(username: string, token?: string): Promise<any[]> {
  let repos: any[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `https://api.github.com/users/${username}/repos?page=${page}&per_page=${perPage}`;
    const data = await githubFetch(url, token);
    if (!data || !Array.isArray(data) || data.length === 0) break;
    repos = repos.concat(data);
    page++;
  }

  // Filter out forks to only count user's original repositories
  return repos.filter((repo) => !repo?.fork);
}

/**
 * Syncs the GitHub statistics of a user to public.github_stats in Supabase.
 */
export async function syncGitHubStatsForUser(userId: string): Promise<GitHubStats> {
  // 1. Get username from profiles table
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("github_username")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    throw new Error(`Failed to load profile for user: ${profileErr?.message}`);
  }

  let username = profile?.github_username;

  // 17. Verify github_username is correctly stored in profiles table.
  // If missing: extract from session metadata and update profiles.github_username.
  if (!username) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id === userId) {
      const metadata = session?.user?.user_metadata;
      username = metadata?.user_name || metadata?.preferred_username || metadata?.login;
      
      if (username) {
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ github_username: username })
          .eq("id", userId);
        
        if (updateErr) {
          console.error("Failed to update profiles.github_username:", updateErr?.message);
        }
      }
    }
  }

  // Do not continue analytics sync if github_username is null.
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
  const publicReposCount = userProfile?.public_repos || 0;

  // 4. Fetch all public repositories (ignoring forks)
  const repos = await fetchAllPublicRepos(username, token);

  let totalCommits = 0;
  const activeDaysSet = new Set<string>();
  const languageBytesMap: Record<string, number> = {};
  let rateLimitErrorOccurred = false;

  // Fetch stats for all public repositories in parallel with resilient error bounds
  await Promise.allSettled(
    repos.map(async (repo) => {
      const owner = repo?.owner?.login;
      const repoName = repo?.name;
      if (!owner || !repoName) return;

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
      } catch (err: any) {
        if (err?.message === "GitHub API rate limit reached. Try again later.") {
          rateLimitErrorOccurred = true;
          return;
        }
        console.warn(`Failed to fetch languages for repo ${repoName}:`, err);
      }

      // Step B & C: Fetch commits and calculate commit count & active days
      try {
        let page = 1;
        const perPage = 100;
        let repoCommitsCount = 0;
        while (true) {
          const url = `https://api.github.com/repos/${owner}/${repoName}/commits?author=${username}&page=${page}&per_page=${perPage}`;
          const commits = await githubFetch(url, token);
          if (!commits || !Array.isArray(commits) || commits.length === 0) {
            break;
          }
          repoCommitsCount += commits.length;
          commits.forEach((c: any) => {
            const dateStr = c?.commit?.author?.date || c?.author?.date;
            if (dateStr) {
              const dateOnly = dateStr.split("T")[0]; // Extract YYYY-MM-DD
              activeDaysSet.add(dateOnly);
            }
          });
          page++;
        }
        totalCommits += repoCommitsCount;
      } catch (err: any) {
        if (err?.message === "GitHub API rate limit reached. Try again later.") {
          rateLimitErrorOccurred = true;
          return;
        }
        console.warn(`Failed to fetch commits for repo ${repoName}:`, err);
      }
    })
  );

  // If a rate limit error occurred, throw it and abort saving to DB to preserve original stats.
  if (rateLimitErrorOccurred) {
    throw new Error("GitHub API rate limit reached. Try again later.");
  }

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

  const activeDays = activeDaysSet?.size || 0;

  // Step D: Calculate score: (publicRepos * 5) + (commits * 0.5) + (activeDays * 2) capped at 100
  const rawScore = (publicReposCount * 5) + (totalCommits * 0.5) + (activeDays * 2);
  const score = Math.min(Math.round(rawScore), 100);

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
    throw new Error(`Failed to save GitHub stats in database: ${upsertErr?.message}`);
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
    console.error("Error reading GitHub stats from DB:", error?.message);
    return null;
  }

  return data;
}

/**
 * Disconnects the GitHub integration for a user, clearing all provider-related fields in profiles
 * and removing rows from github_stats.
 */
export async function disconnectGithub(userId: string): Promise<void> {
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      github_username: null,
      github_url: null,
      github_avatar: null,
      github_connected: false,
      github_connected_at: null,
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Failed to disconnect GitHub in profile: ${profileError.message}`);
  }

  const { error: statsError } = await supabase
    .from("github_stats")
    .delete()
    .eq("user_id", userId);

  if (statsError) {
    console.warn(`Failed to delete GitHub stats row: ${statsError.message}`);
  }
}

