import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { matchService, MatchProfile } from "@/lib/matchService";
import { Heart, UserCheck, Bookmark, Send, ShieldCheck, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type HistoryTab = "interested" | "matches" | "saved" | "invitations";

export default function MatchHistory() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HistoryTab>("matches");
  const [profiles, setProfiles] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData(activeTab);
    }
  }, [activeTab, user]);

  const loadData = async (tab: HistoryTab) => {
    if (!user) return;
    setLoading(true);
    try {
      let ids: string[] = [];
      if (tab === "interested") {
        const swipes = await matchService.getSwipes(user.id);
        ids = swipes.filter(s => s.action === "interested").map(s => s.target_id);
      } else if (tab === "matches") {
        const matches = await matchService.getMatches(user.id);
        ids = matches.map(m => m.user_1 === user.id ? m.user_2 : m.user_1);
      } else if (tab === "saved") {
        ids = await matchService.getSavedProfiles(user.id);
      } else if (tab === "invitations") {
        ids = []; 
      }

      const loadedProfiles = await Promise.all(ids.map(id => matchService.getProfileById(id)));
      setProfiles(loadedProfiles.filter(Boolean) as MatchProfile[]);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "matches", label: "Build Matches", icon: UserCheck },
    { id: "interested", label: "Interested", icon: Heart },
    { id: "saved", label: "Saved", icon: Bookmark },
    { id: "invitations", label: "Invitations", icon: Send },
  ] as const;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Match History</h2>
        
        <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                  ${isActive 
                    ? "bg-white/10 text-white" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Icon size={16} className={isActive ? "text-hack-primary" : ""} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-white/50">
          <Loader2 size={32} className="animate-spin text-hack-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.length === 0 ? (
            <div className="col-span-full py-12 text-center text-white/50 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                {activeTab === "matches" && <UserCheck size={24} className="text-white/30" />}
                {activeTab === "interested" && <Heart size={24} className="text-white/30" />}
                {activeTab === "saved" && <Bookmark size={24} className="text-white/30" />}
                {activeTab === "invitations" && <Send size={24} className="text-white/30" />}
              </div>
              No {activeTab} developers found.
            </div>
          ) : (
            profiles.map((profile, index) => (
              <motion.div
                key={profile.id + index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} 
                    alt={profile.name} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1 text-white font-semibold">
                      {profile.name}
                      {profile.trustScore > 90 && <ShieldCheck size={14} className="text-hack-primary" />}
                    </div>
                    <div className="text-xs text-white/50 flex items-center gap-1 mt-1">
                      <MapPin size={10} /> {profile.location}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-white/70 bg-[#1A1F2C] p-2 rounded-lg">
                  {profile.role}
                </div>

                <div className="mt-auto flex gap-2">
                  <button className="flex-1 py-2 bg-hack-primary/10 text-hack-primary font-medium text-sm rounded-lg hover:bg-hack-primary/20 transition-colors">
                    View Profile
                  </button>
                  {activeTab === "matches" && (
                    <button className="flex-1 py-2 bg-blue-500/10 text-blue-400 font-medium text-sm rounded-lg hover:bg-blue-500/20 transition-colors">
                      Message
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
