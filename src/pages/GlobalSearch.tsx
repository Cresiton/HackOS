import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Teammate } from "@/types";
import { rankCandidates, SearchMode } from "@/lib/searchRankingEngine";
import { MapPin, Search } from "lucide-react";

export default function GlobalSearch() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [searchMode, setSearchMode] = useState<SearchMode>("AI Recommended");
  const [dbTeammates, setDbTeammates] = useState<Teammate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCandidates() {
      setIsLoading(true);
      if (!user) return;
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .limit(100);

      if (profiles) {
        const { data: skillsData } = await supabase
          .from("user_skills")
          .select("user_id, skills (name)");

        const userSkillsMap: Record<string, string[]> = {};
        if (skillsData) {
          skillsData.forEach((row: any) => {
            const skillName = row.skills?.name;
            if (skillName && row.user_id) {
              if (!userSkillsMap[row.user_id]) {
                userSkillsMap[row.user_id] = [];
              }
              userSkillsMap[row.user_id].push(skillName);
            }
          });
        }

        const formattedTeammates = profiles.map((p: any, idx: number) => {
          const skills = userSkillsMap[p.id] || [];
          let score = 80 + (idx * 3) % 19;
          return {
            id: p.id,
            name: p.name,
            role: p.role || "Full Stack Developer",
            location: p.location || "Online",
            latitude: p.latitude,
            longitude: p.longitude,
            skills: skills,
            rating: Number(p.rating) || 5.0,
            isOnline: false,
            avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
            college: p.college || "",
            trustScore: p.trust_score || 50,
            availability: p.availability || "available",
            github_connected: p.github_connected,
            github_username: p.github_username
          };
        });
        setDbTeammates(formattedTeammates);
      }
      setIsLoading(false);
    }

    loadCandidates();
  }, [user]);

  // Filter based on query if in All Mode
  const filteredTeammates = dbTeammates.filter(t => {
    if (query.trim() && searchMode === "All") {
      const q = query.toLowerCase();
      const roleMatch = t.role.toLowerCase().includes(q);
      const skillMatch = t.skills.some(s => s.toLowerCase().includes(q));
      const nameMatch = t.name.toLowerCase().includes(q);
      return roleMatch || skillMatch || nameMatch;
    }
    return true;
  });

  // Rank results using AI Engine
  const rankedTeammates = rankCandidates(filteredTeammates, query, searchMode, user);

  return (
    <div className="min-h-screen bg-hack-bg pb-20">
      <main className="pt-8 px-6 max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div>
          <h1 className="text-white font-700 text-3xl mb-2">Search Results</h1>
          <p className="text-white/60 text-sm">
            Showing developer results for <span className="text-hack-primary font-600">"{query}"</span>
          </p>
        </div>

        {/* Search Mode Tabs */}
        <div className="flex gap-2 border-b border-hack-divider pb-4">
          <button
            onClick={() => setSearchMode("All")}
            className={`px-4 py-2 text-sm font-600 rounded-lg transition-all ${
              searchMode === "All"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSearchMode("Priority")}
            className={`px-4 py-2 text-sm font-600 rounded-lg transition-all ${
              searchMode === "Priority"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            Priority
          </button>
          <button
            onClick={() => setSearchMode("AI Recommended")}
            className={`px-4 py-2 text-sm font-600 rounded-lg transition-all flex items-center gap-1 ${
              searchMode === "AI Recommended"
                ? "bg-hack-primary/20 text-hack-primary border border-hack-primary/30"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            ✨ AI Recommended
          </button>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-2 border-hack-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {rankedTeammates.length === 0 ? (
              <div className="text-center py-20 bg-hack-card rounded-2xl border border-hack-border">
                <Search size={40} className="mx-auto text-white/10 mb-4" />
                <h3 className="text-white font-600 mb-2">No developers found</h3>
                <p className="text-white/40 text-sm">Try adjusting your search terms or search mode.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rankedTeammates.map((teammate) => (
                  <div key={teammate.id} className="hack-card p-4 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="relative">
                        <div 
                          className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-hack-bg"
                          style={{ backgroundImage: `url(${teammate.avatar})` }}
                        />
                      </div>
                    </div>
                    
                    <h4 className="text-white font-700 text-sm mb-1 truncate">{teammate.name}</h4>
                    <p className="text-hack-primary text-xs mb-3 truncate">{teammate.role}</p>
                    
                    <div className="flex items-center gap-1 text-white/50 text-xs mb-4">
                      <MapPin size={12} />
                      <span className="truncate">{teammate.location}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {teammate.skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="skill-tag">{skill}</span>
                      ))}
                      {teammate.skills.length > 3 && (
                        <span className="skill-tag">+{teammate.skills.length - 3}</span>
                      )}
                    </div>
                    
                    <div className="mt-auto">
                      {teammate.explanation && searchMode !== "All" && (
                        <div className="text-[10px] font-600 px-2 py-1 mb-3 rounded border border-hack-primary/30 text-hack-primary/90 bg-hack-primary/5 line-clamp-1 text-center">
                          ✨ {teammate.explanation}
                        </div>
                      )}

                      <Link 
                        to={`/profile/${teammate.id}`}
                        className="block w-full text-center text-xs font-600 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
