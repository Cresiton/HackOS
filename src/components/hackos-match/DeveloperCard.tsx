import { MatchProfile } from "@/lib/matchService";
import { ShieldCheck, MapPin, Github, GitCommit, Target, Zap, UserPlus } from "lucide-react";

interface DeveloperCardProps {
  profile: MatchProfile;
  onSave?: () => void;
  onInvite?: () => void;
  showInvite?: boolean;
}

export default function DeveloperCard({ profile, onSave, onInvite, showInvite }: DeveloperCardProps) {
  return (
    <div className="w-full h-full bg-[#1A1F2C] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative select-none">
      {/* Header / Avatar Area */}
      <div className="relative h-48 bg-gradient-to-br from-hack-primary/20 to-[#1A1F2C] p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col items-start gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${
              profile.availability === 'available' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              profile.availability === 'open' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              {profile.availability === 'available' ? 'Available for Teams' : 
               profile.availability === 'open' ? 'Open to Offers' : 'Busy'}
            </span>
            {profile.squadChemistry && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-hack-primary/20 text-hack-primary border border-hack-primary/30 flex items-center gap-1 backdrop-blur-md">
                <Zap size={12} /> {profile.squadChemistry}% Squad Chemistry
              </span>
            )}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onSave?.(); }}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition text-white/70 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          </button>
        </div>
        
        <div className="absolute -bottom-12 left-6">
          <img 
            src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} 
            alt={profile.name} 
            className="w-24 h-24 rounded-2xl border-4 border-[#1A1F2C] object-cover bg-[#22283A]"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 pt-16 flex flex-col gap-4 overflow-y-auto no-scrollbar">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
            {profile.trustScore > 90 && (
              <ShieldCheck size={20} className="text-hack-primary" />
            )}
            <span className="text-sm text-white/50">{profile.trustScore}% Trust</span>
          </div>
          <p className="text-white/70 font-medium">{profile.preferences?.roles.join(" • ") || profile.role}</p>
          <div className="flex items-center gap-1 text-white/40 text-sm mt-1">
            <MapPin size={14} />
            {profile.location}
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <p className="text-sm text-white/80 italic leading-relaxed">
            "{profile.shortIntro || profile.bio}"
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-white/70"><Github size={18} /></div>
            <div>
              <div className="text-lg font-bold text-white">{profile.githubRepoCount || 0}</div>
              <div className="text-xs text-white/50">Repositories</div>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-white/70"><GitCommit size={18} /></div>
            <div>
              <div className="text-lg font-bold text-white">{profile.commitCount?.toLocaleString() || 0}</div>
              <div className="text-xs text-white/50">Commits</div>
            </div>
          </div>
        </div>

        {/* Technologies & Skills */}
        <div>
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Top Technologies</h4>
          <div className="flex flex-wrap gap-2">
            {(profile.topTechnologies || profile.skills.slice(0, 5)).map(tech => (
              <span key={tech} className="px-3 py-1 bg-[#22283A] text-white/80 rounded-lg text-sm border border-white/5">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Match Reason */}
        {profile.matchReason && (
          <div className="mt-auto bg-hack-primary/10 border border-hack-primary/20 rounded-xl p-4 flex gap-3">
            <Target className="text-hack-primary shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Why You're Seeing This Developer</h4>
              <p className="text-sm text-white/70 leading-relaxed">{profile.matchReason}</p>
            </div>
          </div>
        )}

        {/* Action Shortcut */}
        {showInvite && (
          <button 
            onClick={(e) => { e.stopPropagation(); onInvite?.(); }}
            className="mt-2 w-full py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition flex items-center justify-center gap-2"
          >
            <UserPlus size={18} />
            Invite to Team
          </button>
        )}
      </div>
    </div>
  );
}
