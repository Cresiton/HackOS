import { useState, useEffect, useCallback } from "react";
import { GitHubStats } from "@/types";
import { getGitHubStatsFromDB, syncGitHubStatsForUser } from "@/lib/githubService";

export function useGithubStats(userId?: string) {
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!userId) {
      setStats(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dbStats = await getGitHubStatsFromDB(userId);
      setStats(dbStats);
    } catch (err: any) {
      setError(err.message || "Failed to load GitHub stats from database.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const syncStats = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    setError(null);
    try {
      const newStats = await syncGitHubStatsForUser(userId);
      setStats(newStats);
      return newStats;
    } catch (err: any) {
      setError(err.message || "Failed to sync GitHub stats.");
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    syncing,
    error,
    syncStats,
    refetch: loadStats,
  };
}
