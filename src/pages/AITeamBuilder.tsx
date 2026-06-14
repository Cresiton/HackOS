import { useState, useEffect, useRef } from "react";
import {
  Sparkles, ArrowRight, Loader2, Users, Code, Brain, AlertCircle,
  CheckCircle, Plus, X, RefreshCw, Zap, ChevronDown, Star,
  Target, Lightbulb, Shield, GitBranch, MessageCircle, UserPlus,
  BarChart3, Clock, TrendingUp
} from "lucide-react";
import { analyzeTeamRequirements } from "@/lib/groq";
import { toast } from "sonner";
import aiRobot from "@/assets/ai-robot.png";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Teammate } from "@/types";
import { Link } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RoleSuggestion {
  role: string;
  reason: string;
  priority: "required" | "optional";
  skills: string[];
}

interface AIResult {
  roles: RoleSuggestion[];
  projectInsights: string;
  techStack: string[];
  challenges: string[];
}

interface StreamStep {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
}

// ─── Streaming Analysis Overlay ───────────────────────────────────────────────
function StreamingAnalysis({
  steps,
  streamText,
}: {
  steps: StreamStep[];
  streamText: string;
}) {
  return (
    <div
      className="hack-card p-8 flex flex-col items-center text-center min-h-[500px] justify-center"
      style={{
        background: "linear-gradient(135deg, rgba(124,92,255,0.05), rgba(79,124,255,0.03))",
      }}
    >
      {/* Pulsing Robot */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ background: "radial-gradient(circle, #7C5CFF 0%, transparent 70%)", scale: "1.5" }}
        />
        <img src={aiRobot} alt="AI" className="w-24 h-24 object-contain relative z-10" />
      </div>

      <h3 className="text-white font-700 text-xl mb-2">Analyzing your idea...</h3>
      <p className="text-white/40 text-sm mb-8 max-w-xs">
        HackOS AI is understanding your problem, identifying skills and composing your perfect team
      </p>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className="flex items-center gap-3 p-3 rounded-xl transition-all duration-500"
            style={{
              background: step.done
                ? "rgba(34,197,94,0.08)"
                : step.active
                ? "rgba(124,92,255,0.1)"
                : "rgba(255,255,255,0.02)",
              border: `1px solid ${step.done ? "rgba(34,197,94,0.2)" : step.active ? "rgba(124,92,255,0.2)" : "rgba(255,255,255,0.05)"}`,
            }}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
              {step.done ? (
                <CheckCircle size={14} className="text-hack-green" />
              ) : step.active ? (
                <Loader2 size={14} className="text-hack-primary animate-spin" />
              ) : (
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                />
              )}
            </div>
            <span
              className="text-sm font-500 transition-colors"
              style={{
                color: step.done ? "#22C55E" : step.active ? "#A78BFF" : "rgba(255,255,255,0.3)",
              }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Live stream text */}
      {streamText && (
        <div
          className="w-full max-w-sm p-4 rounded-2xl text-left"
          style={{ background: "rgba(124,92,255,0.06)", border: "1px solid rgba(124,92,255,0.1)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-hack-primary animate-pulse" />
            <span className="text-white/40 text-xs font-500">AI is thinking</span>
          </div>
          <p className="text-white/60 text-xs leading-relaxed font-mono">{streamText}
            <span
              className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse"
              style={{ background: "#7C5CFF" }}
            />
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Animated Role Card ────────────────────────────────────────────────────────
function RoleCard({
  role,
  index,
  onRemove,
  candidates,
  onInvite,
}: {
  role: RoleSuggestion;
  index: number;
  onRemove: () => void;
  candidates: Teammate[];
  onInvite: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const roleColors: Record<string, { bg: string; border: string; accent: string }> = {
    required: { bg: "rgba(124,92,255,0.08)", border: "rgba(124,92,255,0.25)", accent: "#A78BFF" },
    optional: { bg: "rgba(79,124,255,0.06)", border: "rgba(79,124,255,0.15)", accent: "#7BA5FF" },
  };
  const colors = roleColors[role.priority];

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-700"
              style={{ background: `${colors.accent}20`, color: colors.accent }}
            >
              {index + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-white font-700 text-sm">{role.role}</h4>
                <span
                  className="px-2 py-0.5 rounded-md text-[9px] font-700 uppercase tracking-wide"
                  style={{
                    background: role.priority === "required" ? "rgba(124,92,255,0.2)" : "rgba(79,124,255,0.15)",
                    color: colors.accent,
                  }}
                >
                  {role.priority}
                </span>
              </div>
              <p className="text-white/45 text-xs leading-relaxed mt-0.5 line-clamp-2">{role.reason}</p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="text-white/20 hover:text-white/60 transition-colors p-1 ml-2 flex-shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 ml-11">
          {role.skills.map((skill) => (
            <span key={skill} className="skill-tag text-[10px] px-2 py-0.5">{skill}</span>
          ))}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-500 transition-all"
        style={{
          borderTop: `1px solid ${colors.border}`,
          color: colors.accent,
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <span className="flex items-center gap-1.5">
          <Users size={11} />
          {candidates.length > 0 ? `${candidates.length} matching candidates` : "No direct matches yet"}
        </span>
        <ChevronDown
          size={13}
          className="transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>

      {/* Candidates dropdown */}
      {expanded && (
        <div
          className="p-3 space-y-2"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          {candidates.slice(0, 3).map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-hack-primary/20">
                <img src={candidate.avatar} alt={candidate.name} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-600 text-xs">{candidate.name}</div>
                <div className="text-white/40 text-[10px]">{candidate.location}</div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="text-[10px] font-700 px-1.5 py-0.5 rounded-md"
                  style={{
                    background: candidate.matchScore >= 90 ? "rgba(34,197,94,0.1)" : "rgba(79,124,255,0.1)",
                    color: candidate.matchScore >= 90 ? "#22C55E" : "#4F7CFF",
                  }}
                >
                  {candidate.matchScore}%
                </div>
                <button
                  onClick={() => onInvite(candidate.name)}
                  className="text-[10px] px-2.5 py-1 rounded-lg font-600 transition-all"
                  style={{ background: "rgba(124,92,255,0.2)", color: "#A78BFF" }}
                >
                  Invite
                </button>
              </div>
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="text-center py-2 text-white/30 text-xs">
              Invite manually from the platform
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Team Slot Visualizer ─────────────────────────────────────────────────────
function TeamSlots({ roles }: { roles: RoleSuggestion[] }) {
  const ROLE_ICONS: Record<string, string> = {
    "AI Engineer": "🤖",
    "ML Engineer": "🧠",
    "Backend Developer": "⚙️",
    "Frontend Developer": "🖥️",
    "Full Stack Developer": "💻",
    "UI/UX Designer": "🎨",
    "Mobile Developer": "📱",
    "DevOps Engineer": "🚀",
    "Data Scientist": "📊",
    "Presenter": "🎤",
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {roles.map((role, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-1.5"
          title={role.role}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all"
            style={{
              background: role.priority === "required" ? "rgba(124,92,255,0.15)" : "rgba(79,124,255,0.1)",
              border: `1px solid ${role.priority === "required" ? "rgba(124,92,255,0.3)" : "rgba(79,124,255,0.2)"}`,
            }}
          >
            {ROLE_ICONS[role.role] || "👤"}
          </div>
          <span className="text-white/30 text-[8px] font-500 text-center max-w-[48px] leading-tight">
            {role.role.split(" ")[0]}
          </span>
        </div>
      ))}
      {/* Empty slots */}
      {Array.from({ length: Math.max(0, 5 - roles.length) }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="flex flex-col items-center gap-1.5"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-dashed"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <Plus size={12} className="text-white/20" />
          </div>
          <span className="text-white/20 text-[8px]">Open</span>
        </div>
      ))}
    </div>
  );
}

// ─── ANALYZE STEPS ────────────────────────────────────────────────────────────
const ANALYSIS_STEPS: StreamStep[] = [
  { id: "s1", label: "Understanding problem domain...", done: false, active: false },
  { id: "s2", label: "Identifying technical requirements...", done: false, active: false },
  { id: "s3", label: "Mapping required skill sets...", done: false, active: false },
  { id: "s4", label: "Suggesting optimal roles...", done: false, active: false },
  { id: "s5", label: "Finding matching candidates...", done: false, active: false },
];

const STREAM_TEXTS = [
  "Parsing the problem context and technical scope...",
  "Identifying core domain: IoT, AI, sustainability, web...",
  "Calculating skill intersections for team balance...",
  "Cross-referencing with 12,000+ builder profiles...",
  "Generating role rationale and compatibility scores...",
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AITeamBuilder() {
  const { user } = useAuth();
  const [dbProfiles, setDbProfiles] = useState<Teammate[]>([]);
  const [problemStatement, setProblemStatement] = useState("");
  const [teamSize, setTeamSize] = useState(3);
  const [hackathon, setHackathon] = useState("");
  const [experience, setExperience] = useState("Any");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [roles, setRoles] = useState<RoleSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [streamSteps, setStreamSteps] = useState<StreamStep[]>(ANALYSIS_STEPS);
  const [streamText, setStreamText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data: profiles, error: pError } = await supabase
          .from("profiles")
          .select("*");
        if (pError) throw pError;

        const { data: skillsData, error: sError } = await supabase
          .from("user_skills")
          .select("user_id, skills (name)");
        if (sError) throw sError;

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

        const formatted = (profiles || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          role: p.role || "Full Stack Developer",
          location: p.location || "Online",
          skills: userSkillsMap[p.id] || [],
          rating: Number(p.rating) || 5.0,
          matchScore: 90,
          isOnline: true,
          avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
          college: p.college || "Unknown"
        }));

        setDbProfiles(formatted);
      } catch (err) {
        console.error("Error fetching database profiles:", err);
      }
    }

    fetchProfiles();
  }, []);

  const EXAMPLES = [
    "Build an AI-powered cattle health monitoring system using IoT sensors and ML to predict diseases early",
    "Create a platform that connects food waste from restaurants with NGOs and homeless shelters in real-time",
    "Develop a VR-based therapy tool for PTSD patients using biometric feedback and guided meditation",
    "Build a decentralized identity system for college students to verify credentials for internships",
  ];

  const simulateStream = async () => {
    const steps = ANALYSIS_STEPS.map((s) => ({ ...s }));
    setStreamSteps(steps.map((s) => ({ ...s })));
    setStreamText("");

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
      setStreamSteps((prev) => {
        const updated = prev.map((s, idx) => ({
          ...s,
          done: idx < i,
          active: idx === i,
        }));
        return updated;
      });
      setStreamText(STREAM_TEXTS[i] || "");
    }
  };

  const handleAnalyze = async () => {
    if (!problemStatement.trim() || problemStatement.length < 20) {
      toast.error("Please describe your idea in at least 20 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setShowResults(false);

    simulateStream();

    try {
      const analysis = await analyzeTeamRequirements(problemStatement, teamSize, hackathon || undefined);

      // Ensure stream finishes before showing results
      await new Promise((r) => setTimeout(r, 3200));
      setStreamSteps(ANALYSIS_STEPS.map((s) => ({ ...s, done: true, active: false })));
      await new Promise((r) => setTimeout(r, 400));

      setResult(analysis);
      setRoles(analysis.roles);
      setShowResults(true);
      toast.success("AI analysis complete! Your team blueprint is ready 🚀");

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI services unavailable. Please try again.";
      setError(msg);
      toast.error("Analysis failed. All API keys attempted.");
    } finally {
      setLoading(false);
    }
  };

  const removeRole = (index: number) => setRoles(roles.filter((_, i) => i !== index));
  const addRole = () => setRoles([...roles, { role: "Custom Role", reason: "Added manually", priority: "optional", skills: [] }]);

  const getCandidatesForRole = (roleName: string) => {
    const roleKeywords: Record<string, string[]> = {
      "Backend Developer": ["Node.js", "Express", "PostgreSQL", "MongoDB", "Python", "Node", "Backend", "API"],
      "Frontend Developer": ["React", "Next.js", "Vue.js", "TypeScript", "CSS", "Frontend", "UI"],
      "ML Engineer": ["Python", "TensorFlow", "PyTorch", "Machine Learning", "AI", "Data", "ML"],
      "UI/UX Designer": ["Figma", "Adobe XD", "UI Design", "Prototyping", "Design", "UX"],
      "Full Stack Developer": ["React", "Node.js", "Full Stack", "TypeScript", "Fullstack"],
    };
    const keywords = roleKeywords[roleName] || roleName.split(" ");
    
    return dbProfiles
      .filter((t) => t.id !== user?.id)
      .map((t) => {
        let matches = 0;
        const lowerRole = t.role.toLowerCase();
        const lowerRoleName = roleName.toLowerCase();
        
        if (lowerRole.includes(lowerRoleName) || lowerRoleName.includes(lowerRole)) {
          matches += 3;
        }
        
        keywords.forEach(kw => {
          if (lowerRole.includes(kw.toLowerCase())) matches += 2;
          t.skills.forEach((s: string) => {
            if (s.toLowerCase().includes(kw.toLowerCase())) matches += 1;
          });
        });
        
        const matchScore = Math.min(98, 70 + (matches * 4));
        return { ...t, matchScore };
      })
      .filter(t => {
        const lowerRole = t.role.toLowerCase();
        const lowerRoleName = roleName.toLowerCase();
        const hasRoleMatch = lowerRole.includes(lowerRoleName) || lowerRoleName.includes(lowerRole);
        const hasSkillMatch = t.skills.some((s: string) => 
          keywords.some(kw => s.toLowerCase().includes(kw.toLowerCase()))
        );
        return hasRoleMatch || hasSkillMatch;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  };

  const handleInvite = (name: string) => toast.success(`Invite sent to ${name}!`);

  return (
    <div className="p-6 lg:p-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.25), rgba(79,124,255,0.2))", border: "1px solid rgba(124,92,255,0.3)" }}
          >
            <Sparkles size={22} className="text-hack-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-white font-700 text-2xl">AI Team Builder</h1>
              <span className="badge-new">Powered by Groq</span>
            </div>
            <p className="text-white/40 text-sm">Transform your idea into the perfect team composition using AI</p>
          </div>
        </div>
        
        <Link to="/match">
          <button className="hack-btn-primary py-2.5 px-5" style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", borderColor: "#15803D" }}>
            <Users size={16} />
            Find Matching Builders
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT: INPUT PANEL ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* AI Mascot card */}
          <div
            className="p-5 rounded-3xl flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, #0E111B 0%, rgba(124,92,255,0.07) 100%)",
              border: "1px solid rgba(124,92,255,0.15)",
            }}
          >
            <img src={aiRobot} alt="AI" className="w-16 h-16 object-contain flex-shrink-0" style={{ filter: "drop-shadow(0 0 12px rgba(124,92,255,0.4))" }} />
            <div>
              <div className="text-white font-700 text-sm mb-0.5">HackOS AI is ready</div>
              <p className="text-white/45 text-xs leading-relaxed">
                Describe your hackathon idea and I'll analyze it to suggest perfect roles, skills, and matching builders.
              </p>
            </div>
          </div>

          {/* Problem Statement */}
          <div className="hack-card p-5">
            <label className="block text-white font-600 text-sm mb-3 flex items-center gap-2">
              <Target size={14} className="text-hack-primary" />
              Problem Statement / Idea *
            </label>
            <textarea
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="Describe your hackathon idea in detail...&#10;&#10;Example: Build an AI-powered system that monitors cattle health using IoT sensors and predicts diseases early using machine learning, helping farmers reduce losses."
              className="hack-input resize-none text-sm leading-relaxed"
              rows={6}
              style={{ borderRadius: "14px" }}
              maxLength={2000}
            />
            <div className="flex justify-between mt-2">
              <span className="text-white/25 text-xs">{problemStatement.length}/2000</span>
              <span
                className="text-xs font-500"
                style={{ color: problemStatement.length >= 100 ? "#22C55E" : problemStatement.length >= 20 ? "#F59E0B" : "rgba(255,255,255,0.2)" }}
              >
                {problemStatement.length >= 100 ? "✓ Great detail" : problemStatement.length >= 20 ? "Minimum met" : "Min 20 chars"}
              </span>
            </div>

            {/* Example prompts */}
            <div className="mt-3">
              <div className="text-white/25 text-[10px] mb-2 uppercase tracking-wider">Try an example:</div>
              <div className="space-y-1.5">
                {EXAMPLES.slice(0, 2).map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setProblemStatement(ex)}
                    className="w-full text-left text-xs text-white/35 hover:text-white/65 transition-colors leading-relaxed p-2 rounded-lg hover:bg-white/3"
                    style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <span className="text-hack-primary/60 mr-1">→</span> {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="hack-card p-5">
            <h3 className="text-white font-600 text-sm mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-hack-blue" />
              Team Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white/50 text-xs font-500 mb-2">Team Size</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6, 7].map((size) => (
                    <button
                      key={size}
                      onClick={() => setTeamSize(size)}
                      className="w-9 h-9 rounded-xl text-sm font-600 transition-all"
                      style={{
                        background: teamSize === size ? "rgba(124,92,255,0.2)" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${teamSize === size ? "rgba(124,92,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: teamSize === size ? "#A78BFF" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/50 text-xs font-500 mb-2">Hackathon (Optional)</label>
                <input
                  type="text"
                  value={hackathon}
                  onChange={(e) => setHackathon(e.target.value)}
                  placeholder="e.g., AI Innovation Challenge"
                  className="hack-input text-sm"
                />
              </div>

              <div>
                <label className="block text-white/50 text-xs font-500 mb-2">Experience Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Any", "Beginner", "Expert"].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setExperience(lvl)}
                      className="py-2 rounded-xl text-xs font-500 transition-all"
                      style={{
                        background: experience === lvl ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${experience === lvl ? "rgba(124,92,255,0.3)" : "rgba(255,255,255,0.07)"}`,
                        color: experience === lvl ? "#A78BFF" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleAnalyze}
            disabled={loading || problemStatement.length < 20}
            className="hack-btn-primary w-full justify-center py-4 text-base"
            style={{ opacity: loading || problemStatement.length < 20 ? 0.55 : 1 }}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> AI is analyzing...</>
            ) : (
              <><Sparkles size={18} /> Analyze Team Requirements</>
            )}
          </button>

          {/* Error */}
          {error && (
            <div
              className="p-4 rounded-2xl flex items-start gap-3"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <AlertCircle size={16} className="text-hack-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-hack-red text-sm font-500">Analysis failed</p>
                <p className="text-white/45 text-xs mt-0.5 leading-relaxed">{error}</p>
                <button
                  onClick={handleAnalyze}
                  className="text-xs text-hack-primary flex items-center gap-1 mt-2 hover:text-hack-primary-hover"
                >
                  <RefreshCw size={11} /> Retry with next API key
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: RESULTS PANEL ── */}
        <div className="lg:col-span-3 space-y-5" ref={resultsRef}>
          {/* Empty state */}
          {!result && !loading && (
            <div
              className="hack-card p-12 flex flex-col items-center justify-center text-center min-h-[500px]"
              style={{ borderStyle: "dashed", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <img src={aiRobot} alt="AI" className="w-24 h-24 object-contain mb-6 opacity-40" />
              <h3 className="text-white font-600 text-xl mb-3">Ready to build your team</h3>
              <p className="text-white/30 text-sm max-w-xs leading-relaxed mb-8">
                Enter your hackathon idea on the left and let HackOS AI design the perfect team composition for you.
              </p>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                {[
                  { icon: Target, label: "Analyze Idea", desc: "AI reads your concept" },
                  { icon: Users, label: "Suggest Roles", desc: "Optimal team structure" },
                  { icon: Star, label: "Find Builders", desc: "Matched candidates" },
                ].map((step) => (
                  <div key={step.label} className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <step.icon size={18} className="text-hack-primary/60" />
                    <span className="text-white/50 text-xs font-600">{step.label}</span>
                    <span className="text-white/25 text-[10px] text-center">{step.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streaming */}
          {loading && (
            <StreamingAnalysis steps={streamSteps} streamText={streamText} />
          )}

          {/* Results */}
          {result && showResults && (
            <>
              {/* AI Insights Banner */}
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(124,92,255,0.1), rgba(79,124,255,0.05))",
                  border: "1px solid rgba(124,92,255,0.2)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={16} className="text-hack-primary" />
                  <span className="text-white font-700 text-sm">AI Project Analysis</span>
                  <span
                    className="px-2 py-0.5 rounded-md text-[9px] font-700"
                    style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
                  >
                    COMPLETE
                  </span>
                </div>
                <p className="text-white/65 text-sm leading-relaxed">{result.projectInsights}</p>
              </div>

              {/* Team Composition Visual */}
              <div className="hack-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-600 text-sm flex items-center gap-2">
                    <Users size={14} className="text-hack-primary" />
                    Team Blueprint — {roles.length} Role{roles.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={addRole}
                    className="text-xs flex items-center gap-1 transition-colors"
                    style={{ color: "#A78BFF" }}
                  >
                    <Plus size={12} /> Add Role
                  </button>
                </div>

                {/* Visual slots */}
                <div
                  className="p-3 rounded-xl mb-4"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <TeamSlots roles={roles} />
                </div>

                {/* Role cards */}
                <div className="space-y-3">
                  {roles.map((role, i) => (
                    <RoleCard
                      key={`${role.role}-${i}`}
                      role={role}
                      index={i}
                      onRemove={() => removeRole(i)}
                      candidates={getCandidatesForRole(role.role)}
                      onInvite={handleInvite}
                    />
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div className="hack-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Code size={15} className="text-hack-blue" />
                  <span className="text-white font-600 text-sm">Recommended Tech Stack</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-500 transition-all hover:scale-105"
                      style={{ background: "rgba(79,124,255,0.1)", border: "1px solid rgba(79,124,255,0.2)", color: "#7BA5FF" }}
                    >
                      <GitBranch size={10} />
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Challenges */}
              <div className="hack-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={15} className="text-hack-orange" />
                  <span className="text-white font-600 text-sm">Potential Challenges</span>
                </div>
                <div className="space-y-2">
                  {result.challenges.map((challenge, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl text-sm"
                      style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.1)" }}
                    >
                      <span className="text-hack-orange text-base flex-shrink-0 mt-0.5">⚡</span>
                      <span className="text-white/60 leading-relaxed">{challenge}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top candidates overall */}
              <div className="hack-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-600 text-sm flex items-center gap-2">
                    <Star size={14} className="text-hack-orange" />
                    Top Candidate Matches
                  </span>
                  <span className="text-white/30 text-xs">AI-ranked for your project</span>
                </div>
                <div className="space-y-3">
                  {dbProfiles.filter(p => p.id !== user?.id).slice(0, 4).map((candidate, i) => (
                    <div
                      key={candidate.id}
                      className="flex items-center gap-3 p-3.5 rounded-xl transition-all group"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      {/* Rank */}
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-700 flex-shrink-0"
                        style={{
                          background: i === 0 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)",
                          color: i === 0 ? "#F59E0B" : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-hack-primary/20">
                        <img src={candidate.avatar} alt={candidate.name} className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-white font-600 text-sm">{candidate.name}</div>
                          {candidate.isOnline && <div className="status-online w-1.5 h-1.5" />}
                        </div>
                        <div className="text-white/40 text-xs">{candidate.role}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {candidate.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="skill-tag text-[9px] px-1.5 py-0.5">{skill}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div
                          className="text-xs font-700 px-2 py-1 rounded-lg mb-1.5"
                          style={{
                            background: candidate.matchScore >= 90 ? "rgba(34,197,94,0.12)" : "rgba(79,124,255,0.12)",
                            color: candidate.matchScore >= 90 ? "#22C55E" : "#4F7CFF",
                          }}
                        >
                          {candidate.matchScore}% match
                        </div>
                        <button
                          onClick={() => handleInvite(candidate.name)}
                          className="text-[10px] px-3 py-1.5 rounded-lg font-600 flex items-center gap-1 transition-all"
                          style={{ background: "rgba(124,92,255,0.15)", color: "#A78BFF" }}
                        >
                          <UserPlus size={10} />
                          Invite
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => toast.success("Team blueprint saved! Go to My Teams to create your team.")}
                  className="hack-btn-primary justify-center py-3"
                >
                  <Users size={15} />
                  Create Team
                </button>
                <button
                  onClick={() => { setResult(null); setShowResults(false); setError(null); setProblemStatement(""); }}
                  className="hack-btn-secondary justify-center py-3"
                >
                  <RefreshCw size={15} />
                  New Analysis
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
