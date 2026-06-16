import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, Code, Briefcase, GraduationCap, Github, ExternalLink, Award,
  Mail, User, Calendar, MessageSquare, Linkedin
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import GitHubAnalyticsCard from "@/components/features/GitHubAnalyticsCard";
import { matchHistoryService } from "@/lib/matchHistoryService";

function TrustRing({ score, user }: { score: number; user: any }) {
  const size = 80;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative group flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.01] border border-white/[0.05] flex-shrink-0">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="url(#trustGrad)" strokeWidth="5"
            strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round"
          />
          <defs>
            <linearGradient id="trustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C5CFF" />
              <stop offset="100%" stopColor="#4F7CFF" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute text-center">
          <div className="text-white font-700 text-lg leading-none">{score}%</div>
          <div className="text-white/40 text-[8px] mt-0.5 font-600">Trust</div>
        </div>
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleStartConversation = async (targetUserId: string) => {
    if (!currentUser || isStartingChat) return;
    setIsStartingChat(true);

    try {
      // 1. Check if a conversation already exists
      const { data: myMemberships, error: myMemErr } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", currentUser.id);

      if (myMemErr) throw myMemErr;

      const convIds = (myMemberships || []).map(m => m.conversation_id);

      let existingConvId = null;
      if (convIds.length > 0) {
        const { data: matches, error: matchErr } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .eq("user_id", targetUserId);

        if (matchErr) throw matchErr;

        if (matches && matches.length > 0) {
          const matchedIds = matches.map(m => m.conversation_id);
          
          const { data: validConvs, error: convErr } = await supabase
            .from("conversations")
            .select("id")
            .in("id", matchedIds)
            .eq("is_team", false);
            
          if (convErr) throw convErr;

          if (validConvs && validConvs.length > 0) {
            existingConvId = validConvs[0].id;
          }
        }
      }

      if (existingConvId) {
        // Conversation exists, navigate to it
        navigate(`/messages?conversation=${existingConvId}`);
        return;
      }

      // 2. Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({ is_team: false })
        .select("id")
        .single();

      if (convError) {
        console.error("Failed to create conversation record:", convError);
        throw convError;
      }

      if (newConv) {
        const { error: insertErr } = await supabase.from("conversation_members").insert([
          { conversation_id: newConv.id, user_id: currentUser.id },
          { conversation_id: newConv.id, user_id: targetUserId }
        ]);
        
        if (insertErr) {
          console.error("Failed to insert members:", insertErr);
          throw insertErr;
        }
        
        navigate(`/messages?conversation=${newConv.id}`);
      }
    } catch (err: any) {
      console.error("Error starting conversation:", err);
      alert(`Error starting conversation: ${err.message || JSON.stringify(err)}`);
      setIsStartingChat(false);
    } finally {
      setIsStartingChat(false);
    }
  };

  useEffect(() => {
    if (currentUser && id === currentUser.id) {
      navigate("/profile", { replace: true });
      return;
    }

    async function loadProfile() {
      try {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", id).single();
        if (!p) {
          navigate("/404", { replace: true });
          return;
        }

        const { data: skillsData } = await supabase.from("user_skills").select("skills(name)").eq("user_id", id);
        const skills = skillsData?.map((s: any) => s.skills.name) || [];

        const { data: eduData } = await supabase.from("user_education").select("*").eq("user_id", id);
        const { data: expData } = await supabase.from("user_experience").select("*").eq("user_id", id);
        const { data: projData } = await supabase.from("user_projects").select("*").eq("user_id", id);

        // Teams Joined
        const { data: teamsData } = await supabase
          .from("team_members")
          .select("role, teams(id, name, category, icon, color, hackathon_id)")
          .eq("user_id", id);
        const teams = teamsData?.map((t: any) => ({ ...t.teams, role: t.role })).filter(Boolean) || [];

        // Hackathons
        const hackIds = teams.map((t: any) => t.hackathon_id).filter(Boolean);
        let registeredHackathons: any[] = [];
        if (hackIds.length > 0) {
          const { data: hacksData } = await supabase
            .from("hackathons")
            .select("id, title, image")
            .in("id", hackIds);
          registeredHackathons = hacksData || [];
        }

        setProfile({
          ...p,
          skills,
          education: eduData || [],
          experiences: expData || [],
          projects: projData || [],
          teamsJoined: teams,
          hackathons: registeredHackathons
        });

        if (currentUser) {
          matchHistoryService.logActivity(currentUser.id, "Profile Viewed", p.id, p.name, p.role || "Developer");
        }
      } catch (err) {
        console.error(err);
        navigate("/404", { replace: true });
      } finally {
        setLoading(false);
      }
    }

    if (id) loadProfile();
  }, [id, currentUser, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-hack-primary"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-6 lg:p-8 pb-20 max-w-5xl">
      {/* Profile Header */}
      <div className="relative rounded-3xl overflow-hidden mb-6" style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.15), rgba(79,124,255,0.1))", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="h-32" style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.3), rgba(79,124,255,0.2), rgba(34,197,94,0.1))" }} />
        <div className="px-8 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4" style={{ borderColor: "#06070B", background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}>
              {profile.avatar_url || profile.linkedin_avatar || profile.github_avatar ? (
                <img src={profile.avatar_url || profile.linkedin_avatar || profile.github_avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                  {profile.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <TrustRing score={profile.trust_score || profile.trustScore || 25} user={profile} />
              {currentUser && currentUser.id !== profile.id && (
                <button
                  onClick={() => handleStartConversation(profile.id)}
                  disabled={isStartingChat}
                  className="hack-btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {isStartingChat ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <MessageSquare size={16} />
                  )}
                  {isStartingChat ? "Opening..." : "Message"}
                </button>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              {profile.name}
              <div className={`w-2.5 h-2.5 rounded-full ${profile.availability === 'busy' ? 'bg-amber-500' : profile.availability === 'open' ? 'bg-blue-500' : 'bg-green-500'}`} title={profile.availability} />
            </h1>
            <div className="flex flex-wrap gap-4 text-white/60 font-medium text-sm mb-3">
              <span className="flex items-center gap-1.5"><Code size={14} /> {profile.role || "Developer"}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} /> {profile.location || "Earth"}</span>
              {profile.show_email && profile.email && (
                <span className="flex items-center gap-1.5"><Mail size={14} /> {profile.email}</span>
              )}
              {profile.gender && (
                <span className="flex items-center gap-1.5"><User size={14} /> {profile.gender}</span>
              )}
              {profile.age && (
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {profile.age} yrs</span>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                  <Linkedin size={14} /> LinkedIn
                </a>
              )}
              {profile.github_username && (
                <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-300 hover:text-white">
                  <Github size={14} /> GitHub
                </a>
              )}
            </div>
            {profile.bio && <p className="text-white/80 text-sm max-w-2xl leading-relaxed">{profile.bio}</p>}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.skills.map((skill: string) => (
              <span key={skill} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Projects */}
          <div className="hack-card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Briefcase size={18} className="text-hack-primary" /> Projects</h2>
            <div className="space-y-4">
              {profile.projects.length === 0 ? (
                <p className="text-white/40 text-sm">No projects added yet.</p>
              ) : (
                profile.projects.map((proj: any) => (
                  <div key={proj.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex justify-between mb-2">
                      <h3 className="text-white font-bold">{proj.title}</h3>
                      <div className="flex gap-2">
                        {proj.github_url && <a href={proj.github_url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white"><Github size={16} /></a>}
                        {proj.live_url && <a href={proj.live_url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white"><ExternalLink size={16} /></a>}
                      </div>
                    </div>
                    {proj.description && <p className="text-white/60 text-sm mb-3">{proj.description}</p>}
                    {proj.tech_stack && (
                      <div className="flex flex-wrap gap-1.5">
                        {proj.tech_stack.map((t: string) => (
                          <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/50">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Experience */}
          <div className="hack-card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Award size={18} className="text-hack-primary" /> Experience</h2>
            <div className="space-y-4">
              {profile.experiences.length === 0 ? (
                <p className="text-white/40 text-sm">No experience added yet.</p>
              ) : (
                profile.experiences.map((exp: any) => (
                  <div key={exp.id} className="p-4 rounded-xl border border-white/5">
                    <h3 className="text-white font-bold">{exp.title}</h3>
                    <div className="text-white/60 text-sm">{exp.company} {exp.period && `• ${exp.period}`}</div>
                    {exp.description && <p className="text-white/50 text-sm mt-2">{exp.description}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Education */}
          <div className="hack-card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><GraduationCap size={18} className="text-hack-primary" /> Education</h2>
            <div className="space-y-4">
              {profile.education.length === 0 ? (
                <p className="text-white/40 text-sm">No education added yet.</p>
              ) : (
                profile.education.map((edu: any) => (
                  <div key={edu.id} className="p-4 rounded-xl border border-white/5">
                    <h3 className="text-white font-bold">{edu.degree}</h3>
                    <div className="text-white/60 text-sm">{edu.institution}</div>
                    {edu.field_of_study && <div className="text-white/40 text-sm mt-1">{edu.field_of_study}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Teams Joined */}
          <div className="hack-card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Teams Joined</h2>
            <div className="space-y-3">
              {profile.teamsJoined && profile.teamsJoined.length > 0 ? (
                profile.teamsJoined.map((team: any) => (
                  <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${team.color || '#7C5CFF'}20`, color: team.color || '#7C5CFF' }}>
                      {team.icon || '🚀'}
                    </div>
                    <div>
                      <h4 className="text-white text-sm font-bold">{team.name}</h4>
                      <p className="text-white/40 text-xs">{team.role} • {team.category || 'General'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-white/40 text-sm">Not part of any teams yet.</p>
              )}
            </div>
          </div>

          {/* Registered Hackathons */}
          <div className="hack-card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Hackathons</h2>
            <div className="space-y-3">
              {profile.hackathons && profile.hackathons.length > 0 ? (
                profile.hackathons.map((hack: any) => (
                  <div key={hack.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                    <img src={hack.image} alt={hack.title} className="w-12 h-10 rounded object-cover flex-shrink-0" />
                    <h4 className="text-white text-sm font-bold truncate">{hack.title}</h4>
                  </div>
                ))
              ) : (
                <p className="text-white/40 text-sm">No hackathons registered.</p>
              )}
            </div>
          </div>

          <GitHubAnalyticsCard userId={id} />
        </div>
      </div>
    </div>
  );
}
