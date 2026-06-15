import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { matchService, MatchProfile } from "@/lib/matchService";
import MatchModeSelector, { MatchMode } from "@/components/hackos-match/MatchModeSelector";
import MatchPreferences, { MatchFilters } from "@/components/hackos-match/MatchPreferences";
import SwipeDeck from "@/components/hackos-match/SwipeDeck";
import MatchOverlay from "@/components/hackos-match/MatchOverlay";
import MatchHistory from "@/components/hackos-match/MatchHistory";
import { useAuth } from "@/contexts/AuthContext";

type Step = "mode" | "preferences" | "deck" | "history" | "limit_reached" | "loading";

export default function HackOSMatch() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("loading");
  const [mode, setMode] = useState<MatchMode>("find_teammates");
  const [filters, setFilters] = useState<MatchFilters | null>(null);
  const [profiles, setProfiles] = useState<MatchProfile[]>([]);
  const [mutualMatch, setMutualMatch] = useState<MatchProfile | null>(null);

  useEffect(() => {
    async function init() {
      if (!user) return;
      const limitReached = await matchService.hasReachedDailyLimit(user.id);
      if (limitReached) {
        setStep("limit_reached");
      } else {
        setStep("mode");
      }
    }
    init();
  }, [user]);

  const handleModeSelect = (selectedMode: MatchMode) => {
    setMode(selectedMode);
    setStep("preferences");
  };

  const handlePreferencesComplete = (selectedFilters: MatchFilters | null) => {
    setFilters(selectedFilters);
    loadDeck(selectedFilters);
  };

  const loadDeck = async (filtersToApply: MatchFilters | null) => {
    if (!user) return;
    
    setStep("loading");
    const limitReached = await matchService.hasReachedDailyLimit(user.id);
    if (limitReached) {
      setStep("limit_reached");
      return;
    }
    
    toast.loading("Finding the best matches for you...", { id: "loading-matches" });
    
    const recommendations = await matchService.getRecommendations(user.id, {
      roles: filtersToApply?.roles,
      availability: filtersToApply?.availability
    });
    
    setProfiles(recommendations);
    
    if (recommendations.length > 0) {
      setStep("deck");
    } else {
      setStep("limit_reached"); // Or show "no matches"
      toast.info("No more matches found. Try adjusting your preferences.");
    }
    toast.dismiss("loading-matches");
  };

  const handleSwipe = async (direction: "left" | "right", profile: MatchProfile) => {
    if (!user) return;
    
    const action = direction === "right" ? "interested" : "skip";
    const result = await matchService.saveSwipe(user.id, profile.id, action);

    if (direction === "right" && result.isMutual) {
      setMutualMatch(profile);
    }

    const limitReached = await matchService.hasReachedDailyLimit(user.id);
    if (limitReached) {
      setTimeout(() => {
        if (!mutualMatch) setStep("limit_reached");
      }, 500); 
    }
  };

  const handleSave = async (profile: MatchProfile) => {
    if (!user) return;
    await matchService.saveProfile(user.id, profile.id);
    toast.success(`${profile.name} saved for later.`);
  };

  const handleInvite = (profile: MatchProfile) => {
    // In a real app, open modal here
    toast.success(`Invitation sent to ${profile.name}!`);
  };

  const handleDeckEmpty = () => {
    setStep("limit_reached");
  };

  const handleContinueAfterMatch = async () => {
    if (!user) return;
    setMutualMatch(null);
    const limitReached = await matchService.hasReachedDailyLimit(user.id);
    if (limitReached || profiles.length === 1) {
       setStep("limit_reached");
    }
  };

  if (step === "loading" || !user) {
    return (
      <div className="min-h-screen bg-[#0F1219] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-hack-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1219] pt-24 pb-12 relative overflow-hidden flex flex-col">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-hack-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Nav inside page */}
      <div className="w-full max-w-5xl mx-auto px-4 flex justify-between items-center mb-8 relative z-10">
        <button 
          onClick={() => {
            if (step === "deck" || step === "history" || step === "limit_reached") setStep("mode");
            else if (step === "preferences") setStep("mode");
            else window.history.back();
          }}
          className="p-2 bg-white/5 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex gap-4 items-center">
          {(step === "deck" || step === "limit_reached") && (
            <button 
              onClick={() => setStep("history")}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 text-sm font-medium transition flex items-center gap-2"
            >
              <Clock size={16} />
              Match History
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center w-full z-10 relative">
        {step === "mode" && (
          <MatchModeSelector onSelect={handleModeSelect} />
        )}
        
        {step === "preferences" && (
          <MatchPreferences 
            onComplete={handlePreferencesComplete} 
            onSkip={() => handlePreferencesComplete(null)} 
          />
        )}

        {step === "deck" && profiles.length > 0 && !mutualMatch && (
          <SwipeDeck 
            profiles={profiles} 
            onSwipe={handleSwipe}
            onSave={handleSave}
            onInvite={handleInvite}
            onEmpty={handleDeckEmpty}
            showInviteButton={mode === "recruit"}
          />
        )}

        {step === "history" && (
          <MatchHistory />
        )}

        {step === "limit_reached" && (
          <div className="flex flex-col items-center justify-center h-[60vh] max-w-md mx-auto text-center px-4">
            <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">🌟</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">You're all caught up!</h2>
            <p className="text-white/60 mb-8">
              You've explored all of today's recommendations. Quality connections take time. Come back tomorrow for new matches!
            </p>
            <button 
              onClick={() => setStep("history")}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all mb-3"
            >
              View History
            </button>
            <button 
              onClick={() => window.history.back()}
              className="w-full py-3 bg-hack-primary text-black font-semibold rounded-xl hover:bg-hack-primary/90 transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>

      {mutualMatch && (
        <MatchOverlay 
          profile={mutualMatch}
          onContinue={handleContinueAfterMatch}
          onChat={() => {
            toast.info("Opening chat...");
            handleContinueAfterMatch();
          }}
          onProfile={() => {
            toast.info("Viewing profile...");
            handleContinueAfterMatch();
          }}
          onInvite={() => {
            handleInvite(mutualMatch);
            handleContinueAfterMatch();
          }}
        />
      )}
    </div>
  );
}
