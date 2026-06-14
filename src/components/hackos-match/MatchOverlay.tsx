import { motion } from "framer-motion";
import { MatchProfile } from "@/lib/matchService";
import { MessageCircle, User, UserPlus, Play } from "lucide-react";

interface MatchOverlayProps {
  profile: MatchProfile;
  onContinue: () => void;
  onChat: () => void;
  onProfile: () => void;
  onInvite: () => void;
}

export default function MatchOverlay({ profile, onContinue, onChat, onProfile, onInvite }: MatchOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
    >
      <motion.div 
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="w-full max-w-md bg-gradient-to-b from-[#1A1F2C] to-black border border-hack-primary/50 rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_0_50px_rgba(0,255,128,0.2)]"
      >
        <div className="text-6xl mb-6 animate-bounce">🎉</div>
        
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-hack-primary to-blue-400 mb-2">
          IT'S A BUILD MATCH!
        </h2>
        
        <p className="text-white/80 text-lg mb-8">
          You and <span className="font-bold text-white">{profile.name}</span> are interested in collaborating.
        </p>

        <div className="flex justify-center items-center gap-4 mb-8 relative">
          {/* Avatar of the matched user */}
          <img 
            src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} 
            alt={profile.name} 
            className="w-24 h-24 rounded-full border-4 border-hack-primary object-cover"
          />
        </div>

        <div className="w-full flex flex-col gap-3">
          <button 
            onClick={onChat}
            className="w-full py-3 bg-hack-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-hack-primary/90 transition-all"
          >
            <MessageCircle size={20} />
            Start Chat
          </button>
          
          <button 
            onClick={onInvite}
            className="w-full py-3 bg-blue-500/20 text-blue-400 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-500/30 transition-all border border-blue-500/30"
          >
            <UserPlus size={20} />
            Invite to Team
          </button>

          <div className="flex gap-3">
            <button 
              onClick={onProfile}
              className="flex-1 py-3 bg-white/5 text-white/80 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <User size={18} />
              View Profile
            </button>
            
            <button 
              onClick={onContinue}
              className="flex-1 py-3 bg-white/5 text-white/80 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <Play size={18} />
              Continue
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
