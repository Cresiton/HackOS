import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  reloadProfile: () => Promise<void>;
  disconnectGithub: () => Promise<void>;
  disconnectLinkedIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to load user profile and skills from Supabase database
  const loadUserProfile = async (userId: string, email: string): Promise<User | null> => {
    try {
      let profile = null;
      let attempts = 0;

      // Resilient lookup with retries to account for trigger propagation delay
      while (attempts < 3) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        
        if (data) {
          profile = data;
          break;
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 800));
      }

      // Fallback if trigger didn't create the profile automatically
      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            name: email.split("@")[0] || "New Builder",
            email: email,
            role: "Full Stack Developer",
            bio: "Excited to build together!",
            availability: "available",
            trust_score: 25,
            rating: 5.0,
          })
          .select("*")
          .single();

        if (insertError) {
          console.error("Error creating profile fallback:", insertError);
          return null;
        }
        profile = newProfile;
      }

      // Fetch user skills from join table
      const { data: userSkillsData, error: skillsError } = await supabase
        .from("user_skills")
        .select("skills (name)")
        .eq("user_id", userId);

      if (skillsError) {
        console.error("Error fetching user skills:", skillsError);
      }

      const skills = userSkillsData
        ? userSkillsData.map((us: any) => us.skills?.name).filter(Boolean)
        : [];

      // Fetch education, experience, projects, domains
      const { data: eduData, error: eduError } = await supabase
        .from("user_education")
        .select("*")
        .eq("user_id", userId);
      if (eduError) console.error("Error fetching education:", eduError);

      const { data: expData, error: expError } = await supabase
        .from("user_experience")
        .select("*")
        .eq("user_id", userId);
      if (expError) console.error("Error fetching experience:", expError);

      const { data: projData, error: projError } = await supabase
        .from("user_projects")
        .select("*")
        .eq("user_id", userId);
      if (projError) console.error("Error fetching projects:", projError);

      const { data: domainData, error: domainError } = await supabase
        .from("user_domains")
        .select("domain")
        .eq("user_id", userId);
      if (domainError) console.error("Error fetching domains:", domainError);
      const domains = domainData ? domainData.map((d: any) => d.domain) : [];

      const { data: resumeData, error: resumeError } = await supabase
        .from("user_resume")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (resumeError) console.error("Error fetching resume metadata:", resumeError);

      let needsSelfHealing = false;
      const selfHealingUpdates: any = {};

      if (profile.github_username && !profile.github_connected) {
        needsSelfHealing = true;
        selfHealingUpdates.github_connected = true;
        if (!profile.github_connected_at) {
          selfHealingUpdates.github_connected_at = new Date().toISOString();
        }
        if (!profile.github_url) {
          selfHealingUpdates.github_url = `https://github.com/${profile.github_username}`;
        }
      }

      if ((profile.linkedin_name || profile.linkedin_url) && !profile.linkedin_connected) {
        needsSelfHealing = true;
        selfHealingUpdates.linkedin_connected = true;
        if (!profile.linkedin_connected_at) {
          selfHealingUpdates.linkedin_connected_at = new Date().toISOString();
        }
      }

      if (needsSelfHealing) {
        const { error: healError } = await supabase
          .from("profiles")
          .update(selfHealingUpdates)
          .eq("id", userId);
        
        if (healError) {
          console.error("Self-healing connections failed:", healError?.message);
        } else {
          profile = { ...profile, ...selfHealingUpdates };
        }
      }

      // Calculate completeness-based Trust Score dynamically (profile photo excluded)
      const isGithubConnected = !!profile?.github_username || !!profile?.github_connected;
      const isLinkedinConnected = !!profile?.linkedin_url || !!profile?.linkedin_name || !!profile?.linkedin_connected;

      let computedTrustScore = 0;
      if (isGithubConnected) computedTrustScore += 30;
      if (isLinkedinConnected) computedTrustScore += 30;
      if (eduData && eduData.length > 0) computedTrustScore += 15;
      if (expData && expData.length > 0) computedTrustScore += 15;

      if (profile?.trust_score !== computedTrustScore) {
        const { error: scoreUpdateError } = await supabase
          .from("profiles")
          .update({ trust_score: computedTrustScore })
          .eq("id", userId);
        if (scoreUpdateError) {
          console.error("Failed to update trust score:", scoreUpdateError?.message);
        } else {
          profile.trust_score = computedTrustScore;
        }
      }

      let profileCompletedValue = profile.profile_completed || false;

      // Self-healing: if user has any profile data or connected github/linkedin but profile_completed = false, auto-set to true
      const hasProfileData = 
        profile.github_connected === true ||
        profile.linkedin_connected === true ||
        !!(profile.location && profile.location.trim() !== "") ||
        !!(profile.college && profile.college.trim() !== "") ||
        !!(profile.experience && profile.experience.trim() !== "") ||
        !!(profile.bio && profile.bio.trim() !== "" && profile.bio !== "Excited to build together!" && profile.bio !== "Ready to collaborate on hackathons!") ||
        !!(profile.avatar_url && profile.avatar_url.trim() !== "" && !profile.avatar_url.includes("api.dicebear.com")) ||
        !!(eduData && eduData.length > 0) ||
        !!(expData && expData.length > 0) ||
        !!(projData && projData.length > 0) ||
        !!resumeData;

      if (hasProfileData && !profile.profile_completed) {
        const { error: completeError } = await supabase
          .from("profiles")
          .update({ profile_completed: true })
          .eq("id", userId);
        if (!completeError) {
          profileCompletedValue = true;
          profile.profile_completed = true;
        }
      }

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar_url || profile.linkedin_avatar || profile.github_avatar || undefined,
        role: profile.role || "Full Stack Developer",
        skills: skills,
        location: profile.location || "",
        bio: profile.bio || "",
        github: profile.github_url || undefined,
        linkedin: profile.linkedin_url || undefined,
        trustScore: computedTrustScore,
        availability: profile.availability || "available",
        rating: Number(profile.rating) || 5.0,
        college: profile.college || "",
        experience: profile.experience || "",
        isOnline: true,
        badges: profile.badges || [],
        github_username: profile.github_username || undefined,
        github_avatar: profile.github_avatar || undefined,
        github_connected: !!profile.github_username || !!profile.github_connected,
        github_connected_at: profile.github_connected_at || undefined,
        linkedin_url: profile.linkedin_url || undefined,
        linkedin_name: profile.linkedin_name || undefined,
        linkedin_avatar: profile.linkedin_avatar || undefined,
        linkedin_connected: !!profile.linkedin_url || !!profile.linkedin_name || !!profile.linkedin_connected,
        linkedin_connected_at: profile.linkedin_connected_at || undefined,
        education: eduData || [],
        experiences: expData || [],
        projects: projData || [],
        domains: domains,
        resume: resumeData || undefined,
        profile_completed: profileCompletedValue,
      };
    } catch (err) {
      console.error("Exception in loadUserProfile:", err);
      return null;
    }
  };

  useEffect(() => {

    // 1. Check if the URL contains OAuth cancellation errors
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const oauthError = params.get("error") || hashParams.get("error");
    const oauthErrorDesc = params.get("error_description") || hashParams.get("error_description");

    if (oauthError) {
      const provider = sessionStorage.getItem("oauth_provider");
      const isLinkedIn = provider === "linkedin";

      if (oauthError === "access_denied" || oauthErrorDesc?.toLowerCase().includes("cancel")) {
        if (isLinkedIn) {
          toast.error("LinkedIn connection cancelled");
        } else {
          toast.error("GitHub connection cancelled");
        }
      } else {
        if (isLinkedIn) {
          if (oauthErrorDesc?.toLowerCase().includes("not_enabled") || oauthErrorDesc?.toLowerCase().includes("disabled")) {
            toast.error("LinkedIn provider is not enabled in Supabase");
          } else {
            toast.error("Unable to connect LinkedIn");
          }
        } else {
          toast.error("Unable to connect GitHub");
        }
      }
      // Remove OAuth error query parameters from URL to avoid re-triggering toast
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, "", cleanUrl);
      sessionStorage.removeItem("oauth_provider");
    }

    // 2. Check current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id, session.user.email || "")
          .then((loadedUser) => {
            setUser(loadedUser);
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 3. Listen for auth changes to capture newly linked GitHub/LinkedIn metadata
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const oauthProvider = sessionStorage.getItem("oauth_provider");

          // Sync GitHub details
          if (oauthProvider === "github") {
            const metadata = session.user.user_metadata;
            const username = metadata.preferred_username || metadata.user_name || metadata.login || "";
            const avatar = metadata.avatar_url || "";
            const githubUrl = `https://github.com/${username}`;

            // Check if user was already marked connected in the database
            const { data: currentProfile } = await supabase
              .from("profiles")
              .select("github_connected")
              .eq("id", session.user.id)
              .maybeSingle();

            const isNewConnection = !currentProfile || !currentProfile.github_connected;

            const { error: syncError } = await supabase
              .from("profiles")
              .update({
                github_username: username,
                github_url: githubUrl,
                github_avatar: avatar,
                github_connected: true,
                github_connected_at: new Date().toISOString(),
              })
              .eq("id", session.user.id);

            if (syncError) {
              console.error("Failed to sync GitHub OAuth metadata to database:", syncError.message);
            } else {
              sessionStorage.removeItem("oauth_provider");
              if (isNewConnection) {
                toast.success("✓ GitHub Connected");
              }
            }
          }

          // Sync LinkedIn details
          if (oauthProvider === "linkedin") {
            const metadata = session.user.user_metadata;
            const name = metadata.full_name || metadata.name || "";
            const avatar = metadata.avatar_url || metadata.picture || null;

            // Check if user was already marked connected in the database
            const { data: currentProfile } = await supabase
              .from("profiles")
              .select("linkedin_connected")
              .eq("id", session.user.id)
              .maybeSingle();

            const isNewConnection = !currentProfile || !currentProfile.linkedin_connected;

            const { error: syncError } = await supabase
              .from("profiles")
              .update({
                linkedin_name: name,
                linkedin_avatar: avatar,
                linkedin_connected: true,
                linkedin_connected_at: new Date().toISOString(),
              })
              .eq("id", session.user.id);

            if (syncError) {
              console.error("Failed to sync LinkedIn OAuth metadata to database:", syncError.message);
            } else {
              sessionStorage.removeItem("oauth_provider");
              if (isNewConnection) {
                toast.success("✓ LinkedIn Connected");
              }
            }
          }

          const loadedUser = await loadUserProfile(session.user.id, session.user.email || "");
          setUser(loadedUser);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      const loadedUser = await loadUserProfile(data.user.id, data.user.email || "");
      setUser(loadedUser);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      if (data.session) {
        const loadedUser = await loadUserProfile(data.user.id, data.user.email || "");
        setUser(loadedUser);
      } else {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          name,
          email,
          role: "Full Stack Developer",
          bio: "",
          availability: "available",
          trust_score: 25,
          rating: 5.0,
        });
      }
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
    }
    // Reset React user state
    setUser(null);

    // Clear all storage caches to isolate user environments
    localStorage.removeItem("hackos_github_analytics");
    sessionStorage.removeItem("hackos_wizard_state");
    sessionStorage.removeItem("oauth_provider");
    sessionStorage.removeItem("oauth_redirect_path");
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.college !== undefined) dbUpdates.college = updates.college;
      if (updates.experience !== undefined) dbUpdates.experience = updates.experience;
      if (updates.availability !== undefined) dbUpdates.availability = updates.availability;
      if (updates.trustScore !== undefined) dbUpdates.trust_score = updates.trustScore;
      if (updates.profile_completed !== undefined) dbUpdates.profile_completed = updates.profile_completed;

      // Handle github updates explicitly:
      if ("github" in updates) dbUpdates.github_url = updates.github ?? null;
      if ("github_username" in updates) dbUpdates.github_username = updates.github_username ?? null;
      if ("github_avatar" in updates) dbUpdates.github_avatar = updates.github_avatar ?? null;
      if ("github_connected" in updates) dbUpdates.github_connected = updates.github_connected ?? null;
      if ("github_connected_at" in updates) dbUpdates.github_connected_at = updates.github_connected_at ?? null;

      // Handle linkedin updates explicitly:
      if ("linkedin_url" in updates) dbUpdates.linkedin_url = updates.linkedin_url ?? null;
      if ("linkedin_name" in updates) dbUpdates.linkedin_name = updates.linkedin_name ?? null;
      if ("linkedin_avatar" in updates) dbUpdates.linkedin_avatar = updates.linkedin_avatar ?? null;
      if ("linkedin_connected" in updates) dbUpdates.linkedin_connected = updates.linkedin_connected ?? null;
      if ("linkedin_connected_at" in updates) dbUpdates.linkedin_connected_at = updates.linkedin_connected_at ?? null;

      if (Object.keys(dbUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update(dbUpdates)
          .eq("id", user.id);
        
        if (profileError) throw profileError;
      }

      if (updates.skills !== undefined) {
        const { error: deleteError } = await supabase
          .from("user_skills")
          .delete()
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        for (const skillName of updates.skills) {
          let { data: skill } = await supabase
            .from("skills")
            .select("id")
            .eq("name", skillName)
            .maybeSingle();

          if (!skill) {
            const { data: newSkill, error: skillInsertError } = await supabase
              .from("skills")
              .insert({ name: skillName })
              .select("id")
              .single();

            if (skillInsertError) throw skillInsertError;
            skill = newSkill;
          }

          if (skill) {
            const { error: linkError } = await supabase
              .from("user_skills")
              .insert({ user_id: user.id, skill_id: skill.id });

            if (linkError) throw linkError;
          }
        }
      }

      // Functional state updates to local React state
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ...updates,
          github_username: "github_username" in updates ? updates.github_username : prev.github_username,
          github_avatar: "github_avatar" in updates ? updates.github_avatar : prev.github_avatar,
          github_connected: "github_connected" in updates ? updates.github_connected : prev.github_connected,
          github_connected_at: "github_connected_at" in updates ? updates.github_connected_at : prev.github_connected_at,
          github: "github" in updates ? updates.github : prev.github,

          linkedin_name: "linkedin_name" in updates ? updates.linkedin_name : prev.linkedin_name,
          linkedin_avatar: "linkedin_avatar" in updates ? updates.linkedin_avatar : prev.linkedin_avatar,
          linkedin_url: "linkedin_url" in updates ? updates.linkedin_url : prev.linkedin_url,
          linkedin_connected: "linkedin_connected" in updates ? updates.linkedin_connected : prev.linkedin_connected,
          linkedin_connected_at: "linkedin_connected_at" in updates ? updates.linkedin_connected_at : prev.linkedin_connected_at,
          linkedin: "linkedin" in updates ? updates.linkedin : ("linkedin_url" in updates ? updates.linkedin_url : prev.linkedin),
        } as User;
      });
    } catch (err: any) {
      console.error("Error updating user profile in Supabase:", err);
      toast.error(err?.message || "Failed to save changes to database.");
      throw err;
    }
  };

  const disconnectGithub = async () => {
    if (!user) return;
    try {
      const { disconnectGithub: disconnectGhService } = await import("@/lib/githubService");
      await disconnectGhService(user.id);

      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          github: undefined,
          github_username: undefined,
          github_avatar: undefined,
          github_connected: false,
          github_connected_at: undefined,
        } as User;
      });

      // Clear local caches
      localStorage.removeItem("hackos_github_analytics");
      toast.success("GitHub disconnected successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to disconnect GitHub");
    }
  };

  const disconnectLinkedIn = async () => {
    if (!user) return;
    try {
      const { disconnectLinkedIn: disconnectLiService } = await import("@/lib/linkedinService");
      await disconnectLiService(user.id);

      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          linkedin: undefined,
          linkedin_url: undefined,
          linkedin_avatar: undefined,
          linkedin_name: undefined,
          linkedin_connected: false,
          linkedin_connected_at: undefined,
        } as User;
      });

      toast.success("LinkedIn disconnected successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to disconnect LinkedIn");
    }
  };

  const reloadProfile = async () => {
    if (user) {
      const loadedUser = await loadUserProfile(user.id, user.email);
      setUser(loadedUser);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      signup,
      logout,
      updateUser,
      reloadProfile,
      disconnectGithub,
      disconnectLinkedIn,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

