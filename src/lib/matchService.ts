import { supabase } from "@/lib/supabase";
import { User } from "@/types";

export interface MatchProfile extends User {
  githubRepoCount?: number;
  commitCount?: number;
  topTechnologies?: string[];
  shortIntro?: string;
  matchReason?: string;
  squadChemistry?: number;
  preferences?: {
    roles: string[];
  };
}

export interface SwipeAction {
  id: string;
  swiper_id: string;
  target_id: string;
  action: "interested" | "skip";
  created_at: string;
}

export interface BuildMatch {
  id: string;
  user_1: string;
  user_2: string;
  created_at: string;
}

const DAILY_LIMIT = 15;

export const matchService = {
  async getDailySwipesCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error } = await supabase
      .from('match_swipes')
      .select('*', { count: 'exact', head: true })
      .eq('swiper_id', userId)
      .gte('created_at', today.toISOString());
    
    if (error) {
      console.error("Error fetching daily swipe count:", error);
      return 0;
    }
    return count || 0;
  },

  async hasReachedDailyLimit(userId: string): Promise<boolean> {
    const count = await this.getDailySwipesCount(userId);
    return count >= DAILY_LIMIT;
  },

  async getSwipes(userId: string): Promise<SwipeAction[]> {
    const { data, error } = await supabase
      .from('match_swipes')
      .select('*')
      .eq('swiper_id', userId);
    
    if (error) {
      console.error("Error fetching swipes:", error);
      return [];
    }
    return data || [];
  },

  async saveSwipe(userId: string, targetUserId: string, action: "interested" | "skip"): Promise<{ success: boolean; isMutual: boolean }> {
    if (await this.hasReachedDailyLimit(userId)) {
      return { success: false, isMutual: false };
    }

    const { error } = await supabase
      .from('match_swipes')
      .upsert({ swiper_id: userId, target_id: targetUserId, action }, { onConflict: 'swiper_id, target_id' });

    if (error) {
      console.error("Error saving swipe:", error);
      return { success: false, isMutual: false };
    }

    let isMutual = false;
    if (action === "interested") {
      const { data: mutualSwipe } = await supabase
        .from('match_swipes')
        .select('*')
        .eq('swiper_id', targetUserId)
        .eq('target_id', userId)
        .eq('action', 'interested')
        .maybeSingle();

      if (mutualSwipe) {
        isMutual = true;
        const user1 = userId < targetUserId ? userId : targetUserId;
        const user2 = userId < targetUserId ? targetUserId : userId;
        
        await supabase
          .from('match_mutual')
          .upsert({ user_1: user1, user_2: user2 }, { onConflict: 'user_1, user_2' });
      }
    }

    return { success: true, isMutual };
  },

  async saveProfile(userId: string, targetUserId: string): Promise<void> {
    const { error } = await supabase
      .from('match_saves')
      .upsert({ user_id: userId, target_id: targetUserId }, { onConflict: 'user_id, target_id' });
    
    if (error) console.error("Error saving profile:", error);
  },

  async getSavedProfiles(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('match_saves')
      .select('target_id')
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error fetching saved profiles:", error);
      return [];
    }
    return data.map(d => d.target_id);
  },
  
  async removeSavedProfile(userId: string, targetUserId: string): Promise<void> {
    const { error } = await supabase
      .from('match_saves')
      .delete()
      .eq('user_id', userId)
      .eq('target_id', targetUserId);
      
    if (error) console.error("Error removing saved profile:", error);
  },

  async getMatches(userId: string): Promise<BuildMatch[]> {
    const { data, error } = await supabase
      .from('match_mutual')
      .select('*')
      .or(`user_1.eq.${userId},user_2.eq.${userId}`);
      
    if (error) {
      console.error("Error fetching matches:", error);
      return [];
    }
    return data || [];
  },

  async getRecommendations(
    userId: string,
    filters?: { roles?: string[]; availability?: string; hackathon?: string }
  ): Promise<MatchProfile[]> {
    const { data: swipes } = await supabase
      .from('match_swipes')
      .select('target_id')
      .eq('swiper_id', userId)
      .eq('action', 'interested');
      
    const swipedIds = (swipes || []).map(s => s.target_id);
    swipedIds.push(userId); // Exclude self

    const { data: rawProfiles, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, github_avatar, linkedin_avatar, role, location, bio, trust_score, availability, rating');
    
    if (error) {
      console.error("Error fetching profiles:", error);
      return [];
    }

    let profiles = rawProfiles || [];

    // Filter out swiped
    profiles = profiles.filter(p => !swipedIds.includes(p.id));

    // Apply filters
    if (filters?.availability === "Available Only") {
      profiles = profiles.filter((p) => p.availability === "available" || p.availability === "open");
    }

    if (filters?.roles && filters.roles.length > 0) {
      profiles = profiles.filter((p) => filters.roles!.some(r => p.role === r));
    }

    if (profiles.length === 0) return [];

    const profileIds = profiles.map(p => p.id);
    const { data: skillsData } = await supabase
      .from("user_skills")
      .select("user_id, skills (name)")
      .in('user_id', profileIds);

    const { data: githubStats } = await supabase
      .from("github_stats")
      .select("user_id, public_repos, total_commits, languages")
      .in('user_id', profileIds);

    const githubStatsMap: Record<string, any> = {};
    if (githubStats) {
      githubStats.forEach((row: any) => {
        githubStatsMap[row.user_id] = row;
      });
    }

    const userSkillsMap: Record<string, string[]> = {};
    if (skillsData) {
      skillsData.forEach((row: any) => {
        const skillName = row.skills?.name;
        if (skillName && row.user_id) {
          if (!userSkillsMap[row.user_id]) userSkillsMap[row.user_id] = [];
          userSkillsMap[row.user_id].push(skillName);
        }
      });
    }

    return profiles.map(p => {
      const gStats = githubStatsMap[p.id];
      const langs = gStats?.languages ? Object.keys(gStats.languages).sort((a: string, b: string) => gStats.languages[b] - gStats.languages[a]).slice(0,3) : [];

      return {
        ...p,
        trustScore: p.trust_score,
        avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
        skills: userSkillsMap[p.id] || [],
        githubRepoCount: gStats?.public_repos || 0,
        commitCount: gStats?.total_commits || 0,
        topTechnologies: langs.length > 0 ? langs : (userSkillsMap[p.id] || []).slice(0, 3),
        matchReason: "Based on your tech stack and role requirements",
        squadChemistry: 85 + Math.floor(Math.random() * 10),
        preferences: { roles: [p.role] },
      };
    }) as MatchProfile[];
  },
  
  async getProfileById(id: string): Promise<MatchProfile | null> {
    const { data: p, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !p) return null;

    const { data: skillsData } = await supabase
      .from("user_skills")
      .select("skills (name)")
      .eq("user_id", id);

    const skills = skillsData ? skillsData.map((row: any) => row.skills?.name).filter(Boolean) : [];

    const { data: githubData } = await supabase
      .from("github_stats")
      .select("public_repos, total_commits, languages")
      .eq("user_id", id)
      .maybeSingle();

    const langs = githubData?.languages ? Object.keys(githubData.languages).sort((a: string, b: string) => githubData.languages[b] - githubData.languages[a]).slice(0,3) : [];

    return {
      ...p,
      trustScore: p.trust_score,
      avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
      skills,
      githubRepoCount: githubData?.public_repos || 0,
      commitCount: githubData?.total_commits || 0,
      topTechnologies: langs.length > 0 ? langs : skills.slice(0, 3),
      matchReason: "Based on mutual skills",
      squadChemistry: 90,
      preferences: { roles: [p.role] }
    } as MatchProfile;
  }
};
