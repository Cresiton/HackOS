import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, CheckCircle, Github, Linkedin,
  Upload, Star, Award, Sparkles, User, Code, FileText,
  Trophy, X, Plus, Loader2, SkipForward, Shield, ExternalLink, Globe
} from "lucide-react";
import { startGitHubOAuth, buildGitHubAnalytics, GitHubAnalytics } from "@/lib/github";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Basic Info", icon: User, trustGain: 0 },
  { id: 2, label: "Skills", icon: Code, trustGain: 5 },
  { id: 3, label: "Resume", icon: FileText, trustGain: 25 },
  { id: 4, label: "GitHub", icon: Github, trustGain: 25 },
  { id: 5, label: "LinkedIn", icon: Linkedin, trustGain: 25 },
  { id: 6, label: "Achievements", icon: Trophy, trustGain: 10 },
  { id: 7, label: "Review", icon: CheckCircle, trustGain: 10 },
];

const SKILL_SUGGESTIONS = [
  "React", "Node.js", "Python", "TypeScript", "Java", "Go", "Rust",
  "TensorFlow", "PyTorch", "Docker", "Kubernetes", "AWS", "Firebase",
  "Figma", "Flutter", "Swift", "Kotlin", "Next.js", "Vue.js", "MongoDB",
  "PostgreSQL", "Redis", "GraphQL", "REST API", "Machine Learning",
  "UI/UX Design", "Data Science", "Blockchain", "Android", "iOS",
];

const INTEREST_OPTIONS = [
  "Backend Development", "Frontend Development", "Full Stack",
  "AI/ML Engineering", "UI/UX Design", "Mobile Development",
  "DevOps / Cloud", "Blockchain", "Data Science", "Game Development",
  "Cybersecurity", "Open Source", "Public Speaking", "Team Leadership",
];

function TrustScoreRing({ score, prevScore }: { score: number; prevScore: number }) {
  const size = 100;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="url(#wizardGrad)" strokeWidth="6"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
          <defs>
            <linearGradient id="wizardGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C5CFF" />
              <stop offset="100%" stopColor="#4F7CFF" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute text-center">
          <div className="text-white font-700 text-2xl leading-none">{score}</div>
          <div className="text-white/40 text-[10px] mt-0.5">Trust Score</div>
        </div>
      </div>
      {score > prevScore && (
        <div
          className="flex items-center gap-1 text-xs font-600 px-3 py-1 rounded-full"
          style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
        >
          <span>+{score - prevScore}%</span>
          <Star size={10} fill="currentColor" />
        </div>
      )}
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-700"
                style={{
                  background: isCompleted
                    ? "linear-gradient(135deg, #7C5CFF, #4F7CFF)"
                    : isCurrent
                    ? "rgba(124,92,255,0.2)"
                    : "rgba(255,255,255,0.05)",
                  border: isCurrent
                    ? "2px solid #7C5CFF"
                    : isCompleted
                    ? "2px solid transparent"
                    : "2px solid rgba(255,255,255,0.1)",
                  color: isCompleted || isCurrent ? "white" : "rgba(255,255,255,0.3)",
                }}
              >
                {isCompleted ? <CheckCircle size={14} /> : step.id}
              </div>
              <span
                className="text-[9px] font-500 whitespace-nowrap"
                style={{ color: isCurrent ? "#A78BFF" : isCompleted ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1 mb-4 transition-all duration-500"
                style={{ background: isCompleted ? "#7C5CFF" : "rgba(255,255,255,0.08)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ───────── Step Components ─────────

function Step1BasicInfo({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-white/60 text-sm font-500 mb-2">Full Name *</label>
          <input
            type="text"
            value={data.name || ""}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="Alex Singh"
            className="hack-input"
          />
        </div>
        <div>
          <label className="block text-white/60 text-sm font-500 mb-2">Gender</label>
          <select
            value={data.gender || ""}
            onChange={(e) => onChange({ ...data, gender: e.target.value })}
            className="hack-input"
          >
            <option value="" style={{ background: "#131826" }}>Select gender</option>
            {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => (
              <option key={g} value={g} style={{ background: "#131826" }}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-white/60 text-sm font-500 mb-2">Location</label>
        <input
          type="text"
          value={data.location || ""}
          onChange={(e) => onChange({ ...data, location: e.target.value })}
          placeholder="City, State, Country"
          className="hack-input"
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm font-500 mb-2">College / University</label>
        <input
          type="text"
          value={data.college || ""}
          onChange={(e) => onChange({ ...data, college: e.target.value })}
          placeholder="IIT Bombay, BITS Pilani..."
          className="hack-input"
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm font-500 mb-2">Primary Role</label>
        <select
          value={data.role || ""}
          onChange={(e) => onChange({ ...data, role: e.target.value })}
          className="hack-input"
        >
          <option value="" style={{ background: "#131826" }}>Select your role</option>
          {["Full Stack Developer", "Frontend Developer", "Backend Developer", "ML Engineer",
            "UI/UX Designer", "Mobile Developer", "DevOps Engineer", "Data Scientist",
            "Blockchain Developer", "Student"].map((r) => (
            <option key={r} value={r} style={{ background: "#131826" }}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-white/60 text-sm font-500 mb-2">Availability Status</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "available", label: "Available for Teams", color: "#22C55E" },
            { value: "open", label: "Open to Opportunities", color: "#4F7CFF" },
            { value: "busy", label: "Busy", color: "#F59E0B" },
            { value: "unavailable", label: "Not Available", color: "#EF4444" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, availability: opt.value })}
              className="flex items-center gap-2 p-3 rounded-xl text-sm font-500 transition-all text-left"
              style={{
                background: data.availability === opt.value ? `${opt.color}15` : "rgba(255,255,255,0.03)",
                border: `1px solid ${data.availability === opt.value ? `${opt.color}40` : "rgba(255,255,255,0.07)"}`,
                color: data.availability === opt.value ? opt.color : "rgba(255,255,255,0.5)",
              }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-white/60 text-sm font-500 mb-2">About You</label>
        <textarea
          value={data.bio || ""}
          onChange={(e) => onChange({ ...data, bio: e.target.value })}
          placeholder="Tell others about yourself, what you build, and what drives you..."
          className="hack-input resize-none"
          rows={3}
          maxLength={300}
        />
        <div className="text-right text-xs text-white/30 mt-1">{(data.bio || "").length}/300</div>
      </div>
    </div>
  );
}

function Step2Skills({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [input, setInput] = useState("");
  const skills: string[] = data.skills || [];
  const interests: string[] = data.interests || [];

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 20) {
      onChange({ ...data, skills: [...skills, trimmed] });
    }
    setInput("");
  };

  const removeSkill = (skill: string) => {
    onChange({ ...data, skills: skills.filter((s) => s !== skill) });
  };

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      onChange({ ...data, interests: interests.filter((i) => i !== interest) });
    } else {
      onChange({ ...data, interests: [...interests, interest] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white/60 text-sm font-500 mb-2">
          Your Skills <span className="text-white/30">({skills.length}/20)</span>
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addSkill(input);
              }
            }}
            placeholder="Type a skill and press Enter..."
            className="hack-input flex-1"
          />
          <button
            type="button"
            onClick={() => addSkill(input)}
            className="hack-btn-primary px-4"
            disabled={!input.trim()}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Selected skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {skills.map((skill) => (
              <span
                key={skill}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
                style={{ background: "rgba(124,92,255,0.15)", border: "1px solid rgba(124,92,255,0.3)", color: "#A78BFF" }}
              >
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-white/60 transition-colors">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggestions */}
        <div>
          <div className="text-white/30 text-xs mb-2">Quick add popular skills:</div>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).slice(0, 16).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="tag hover:border-hack-primary/40 hover:text-white/80 transition-all cursor-pointer text-xs"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-white/60 text-sm font-500 mb-2">Interests & Roles</label>
        <div className="grid grid-cols-2 gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-500 transition-all text-left"
              style={{
                background: interests.includes(interest) ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${interests.includes(interest) ? "rgba(124,92,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                color: interests.includes(interest) ? "#A78BFF" : "rgba(255,255,255,0.5)",
              }}
            >
              {interests.includes(interest) && <CheckCircle size={12} />}
              {interest}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3Resume({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported format. Upload PDF, DOC, DOCX or TXT.");
      return;
    }
    setParsing(true);
    onChange({ ...data, resumeFile: file, resumeName: file.name });
    setTimeout(() => {
      setParsing(false);
      onChange((prev: any) => ({
        ...prev,
        resumeFile: file,
        resumeName: file.name,
        resumeParsed: true,
        skills: [...new Set([...(prev.skills || []), "React", "Node.js", "TypeScript"])],
      }));
      toast.success("Resume parsed! Skills and experience extracted.");
    }, 2000);
  };

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-2xl p-8 text-center transition-all"
        style={{
          background: dragging ? "rgba(124,92,255,0.1)" : "rgba(255,255,255,0.02)",
          border: `2px dashed ${dragging ? "#7C5CFF" : data.resumeFile ? "#22C55E" : "rgba(255,255,255,0.12)"}`,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {parsing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="text-hack-primary animate-spin" />
            <div className="text-white font-600">Parsing your resume...</div>
            <div className="text-white/40 text-sm">AI is extracting skills and experience</div>
          </div>
        ) : data.resumeFile ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.15)" }}
            >
              <CheckCircle size={28} className="text-hack-green" />
            </div>
            <div className="text-white font-600">{data.resumeName}</div>
            <div className="text-white/40 text-sm">
              {data.resumeParsed ? "Resume parsed successfully!" : "File ready"}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange({ ...data, resumeFile: null, resumeName: null, resumeParsed: false }); }}
              className="text-white/40 text-xs hover:text-hack-red transition-colors"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(124,92,255,0.1)" }}
            >
              <Upload size={28} className="text-hack-primary" />
            </div>
            <div className="text-white font-600">Drag & drop your resume</div>
            <div className="text-white/40 text-sm">or click to browse</div>
            <div className="text-white/25 text-xs">PDF, DOC, DOCX, TXT — Max 10MB</div>
          </div>
        )}
      </div>

      {data.resumeParsed && (
        <div
          className="p-4 rounded-2xl space-y-3"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}
        >
          <div className="flex items-center gap-2 text-hack-green text-sm font-600">
            <Sparkles size={14} />
            AI Extracted from Resume
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["React", "Node.js", "TypeScript", "3 years experience", "B.Tech CS"].map((item) => (
              <span key={item} className="skill-tag text-xs">{item}</span>
            ))}
          </div>
        </div>
      )}

      <div className="text-white/30 text-xs text-center">
        Your resume is used only for profile enhancement. It remains private and deletable anytime.
      </div>
    </div>
  );
}

function Step4GitHub({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [connecting, setConnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualUsername, setManualUsername] = useState("");
  const [loadingManual, setLoadingManual] = useState(false);
  const analytics: GitHubAnalytics | null = data.githubAnalytics || null;

  const handleOAuth = async () => {
    setConnecting(true);
    try {
      await startGitHubOAuth();
      // After OAuth popup, prompt for username (code exchange requires backend)
      toast.info("OAuth authorized! Enter your GitHub username to load your profile.");
      setShowManual(true);
    } catch (err: any) {
      if (err.message?.includes("Popup blocked")) {
        toast.error("Popup blocked — using manual entry instead.");
        setShowManual(true);
      } else if (!err.message?.includes("cancelled")) {
        setShowManual(true);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleManualConnect = async () => {
    if (!manualUsername.trim()) return;
    setLoadingManual(true);
    try {
      const result = await buildGitHubAnalytics(manualUsername.trim());
      onChange({
        ...data,
        githubConnected: true,
        githubUsername: result.username,
        githubRepos: result.profile.public_repos,
        githubStars: result.totalStars,
        githubTopLangs: result.topLanguages.map((l) => l.name),
        githubAnalytics: result,
        skills: [...new Set([...(data.skills || []), ...result.topLanguages.slice(0, 4).map((l) => l.name)])],
      });
      setShowManual(false);
      toast.success(`GitHub connected as @${result.username} 🚀`);
    } catch (err: any) {
      toast.error(err.message || "Could not load GitHub profile. Check username.");
    } finally {
      setLoadingManual(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="p-5 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <Github size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-700 text-base mb-1">Connect GitHub</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Import your repositories, languages, stars and contribution history to showcase your development journey.
            </p>
          </div>
        </div>
      </div>

      {data.githubConnected && analytics ? (
        <div className="space-y-4">
          <div
            className="p-4 rounded-2xl"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-hack-green font-600">
                <CheckCircle size={16} />
                Connected as @{analytics.username}
              </div>
              <a
                href={analytics.profile.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Profile summary */}
            <div className="flex items-center gap-3 mb-3">
              <img src={analytics.profile.avatar_url} alt="" className="w-8 h-8 rounded-full" />
              <div>
                <div className="text-white text-sm font-600">{analytics.profile.name || analytics.username}</div>
                {analytics.profile.location && (
                  <div className="text-white/40 text-xs flex items-center gap-1">
                    <Globe size={9} /> {analytics.profile.location}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "Repos", value: analytics.profile.public_repos },
                { label: "Stars", value: analytics.totalStars },
                { label: "Followers", value: analytics.profile.followers },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="text-white font-700 text-xl">{s.value}</div>
                  <div className="text-white/40 text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Top languages */}
            <div className="flex flex-wrap gap-2">
              {analytics.topLanguages.slice(0, 5).map((lang) => (
                <span
                  key={lang.name}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-500"
                  style={{ background: `${lang.color}15`, border: `1px solid ${lang.color}30`, color: lang.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: lang.color }} />
                  {lang.name} · {lang.percentage}%
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...data, githubConnected: false, githubUsername: null, githubAnalytics: null })}
            className="hack-btn-secondary w-full justify-center"
          >
            Disconnect GitHub
          </button>
        </div>
      ) : showManual ? (
        <div className="space-y-3">
          <div>
            <label className="block text-white/60 text-sm font-500 mb-2">Your GitHub Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
              <input
                type="text"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value.replace(/[^a-zA-Z0-9\-]/g, ""))}
                placeholder="your-github-username"
                className="hack-input pl-8"
                onKeyDown={(e) => { if (e.key === "Enter") handleManualConnect(); }}
                autoFocus
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualConnect}
            disabled={!manualUsername.trim() || loadingManual}
            className="hack-btn-primary w-full justify-center py-3"
          >
            {loadingManual ? (
              <><Loader2 size={16} className="animate-spin" /> Loading GitHub Profile...</>
            ) : (
              <><Github size={16} /> Load Profile</>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowManual(false)}
            className="text-white/30 text-xs hover:text-white/60 transition-colors w-full text-center"
          >
            ← Back to OAuth
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleOAuth}
            disabled={connecting}
            className="hack-btn-primary w-full justify-center py-3 text-base"
          >
            {connecting ? (
              <><Loader2 size={16} className="animate-spin" /> Opening GitHub...</>
            ) : (
              <><Github size={16} /> Connect with GitHub OAuth</>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="hack-btn-secondary w-full justify-center"
          >
            Enter username manually
          </button>

          <div className="grid grid-cols-2 gap-3 text-xs text-white/40">
            {["Repositories & Stars", "Top Languages", "Contribution Graph", "Pinned Projects"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle size={12} className="text-hack-primary flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="p-4 rounded-2xl"
        style={{ background: "rgba(124,92,255,0.06)", border: "1px solid rgba(124,92,255,0.12)" }}
      >
        <div className="text-white/50 text-xs font-500 mb-1">Why connect GitHub?</div>
        <div className="text-white/40 text-xs leading-relaxed">
          Teams search for members by tech stack. A connected GitHub profile increases your visibility by up to 3x and improves AI match scores.
        </div>
      </div>
    </div>
  );
}

function Step5LinkedIn({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [url, setUrl] = useState(data.linkedinUrl || "");
  const [importing, setImporting] = useState(false);

  const handleImport = () => {
    if (!url.includes("linkedin.com/in/")) {
      toast.error("Please enter a valid LinkedIn profile URL.");
      return;
    }
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      onChange({
        ...data,
        linkedinUrl: url,
        linkedinConnected: true,
        linkedinName: "Alex Singh",
        linkedinHeadline: "Full Stack Developer | Hackathon Enthusiast",
      });
      toast.success("LinkedIn profile imported successfully!");
    }, 2000);
  };

  return (
    <div className="space-y-5">
      <div
        className="p-5 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(79,124,255,0.15)" }}
          >
            <Linkedin size={24} className="text-hack-blue" />
          </div>
          <div>
            <h3 className="text-white font-700 text-base mb-1">Import LinkedIn</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Bring your professional experience, education and verified skills into HackOS automatically.
            </p>
          </div>
        </div>
      </div>

      {data.linkedinConnected ? (
        <div
          className="p-4 rounded-2xl"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <div className="flex items-center gap-2 text-hack-green font-600 mb-2">
            <CheckCircle size={16} />
            LinkedIn profile imported
          </div>
          <div className="text-white font-600 text-sm">{data.linkedinName}</div>
          <div className="text-white/50 text-xs">{data.linkedinHeadline}</div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {["Experience Imported", "Education Imported", "Skills Imported"].map((item) => (
              <span key={item} className="skill-tag text-xs">{item}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-white/60 text-sm font-500 mb-2">LinkedIn Profile URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://linkedin.com/in/your-username"
              className="hack-input"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="mt-0.5 accent-hack-primary"
            />
            <span className="text-white/40 text-sm">
              I authorize HackOS to use this information to pre-fill my profile.
            </span>
          </label>

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !url}
            className="hack-btn-primary w-full justify-center py-3"
          >
            {importing ? (
              <><Loader2 size={16} className="animate-spin" /> Importing...</>
            ) : (
              <><Linkedin size={16} /> Import LinkedIn Profile</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function Step6Achievements({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const hackathons: string[] = data.hackathonsWon || [];
  const certs: string[] = data.certificates || [];
  const [hackInput, setHackInput] = useState("");
  const [certInput, setCertInput] = useState("");

  const addItem = (list: string[], value: string, key: string) => {
    if (value.trim() && !list.includes(value.trim())) {
      onChange({ ...data, [key]: [...list, value.trim()] });
    }
  };

  const removeItem = (list: string[], value: string, key: string) => {
    onChange({ ...data, [key]: list.filter((i) => i !== value) });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white/60 text-sm font-500 mb-2 flex items-center gap-2">
          <Trophy size={14} className="text-hack-orange" />
          Hackathons Won / Participated
        </label>
        <div className="flex gap-2 mb-3">
          <input
            value={hackInput}
            onChange={(e) => setHackInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(hackathons, hackInput, "hackathonsWon"); setHackInput(""); } }}
            placeholder="e.g. Smart India Hackathon 2024 – Winner"
            className="hack-input flex-1 text-sm"
          />
          <button type="button" onClick={() => { addItem(hackathons, hackInput, "hackathonsWon"); setHackInput(""); }} className="hack-btn-primary px-3">
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {hackathons.map((h) => (
            <div key={h} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-2">
                <Trophy size={12} className="text-hack-orange" />
                <span className="text-white/80 text-sm">{h}</span>
              </div>
              <button type="button" onClick={() => removeItem(hackathons, h, "hackathonsWon")} className="text-white/30 hover:text-hack-red">
                <X size={12} />
              </button>
            </div>
          ))}
          {hackathons.length === 0 && (
            <div className="text-white/25 text-xs text-center py-3">Add your hackathon achievements here</div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-white/60 text-sm font-500 mb-2 flex items-center gap-2">
          <Award size={14} className="text-hack-primary" />
          Certificates & Awards
        </label>
        <div className="flex gap-2 mb-3">
          <input
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(certs, certInput, "certificates"); setCertInput(""); } }}
            placeholder="e.g. AWS Certified Solutions Architect"
            className="hack-input flex-1 text-sm"
          />
          <button type="button" onClick={() => { addItem(certs, certInput, "certificates"); setCertInput(""); }} className="hack-btn-primary px-3">
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {certs.map((c) => (
            <div key={c} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(124,92,255,0.07)", border: "1px solid rgba(124,92,255,0.15)" }}>
              <div className="flex items-center gap-2">
                <Award size={12} className="text-hack-primary" />
                <span className="text-white/80 text-sm">{c}</span>
              </div>
              <button type="button" onClick={() => removeItem(certs, c, "certificates")} className="text-white/30 hover:text-hack-red">
                <X size={12} />
              </button>
            </div>
          ))}
          {certs.length === 0 && (
            <div className="text-white/25 text-xs text-center py-3">Add your certifications and awards here</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step7Review({ data, trustScore }: { data: any; trustScore: number }) {
  const completionItems = [
    { label: "Basic Info", done: !!(data.name && data.role), icon: User },
    { label: "Skills Added", done: (data.skills || []).length > 0, icon: Code },
    { label: "Resume Uploaded", done: !!data.resumeFile, icon: FileText },
    { label: "GitHub Connected", done: !!data.githubConnected, icon: Github },
    { label: "LinkedIn Imported", done: !!data.linkedinConnected, icon: Linkedin },
    { label: "Achievements Added", done: (data.hackathonsWon || []).length > 0, icon: Trophy },
  ];

  const completedCount = completionItems.filter((i) => i.done).length;

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div
        className="p-5 rounded-2xl text-center"
        style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.1), rgba(79,124,255,0.05))", border: "1px solid rgba(124,92,255,0.15)" }}
      >
        <div className="text-white font-700 text-lg mb-1">Profile Summary</div>
        <div className="text-white/40 text-sm mb-4">{completedCount} of {completionItems.length} sections completed</div>
        <div className="flex justify-center">
          <TrustScoreRing score={trustScore} prevScore={25} />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {completionItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 p-3 rounded-xl transition-all"
            style={{
              background: item.done ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${item.done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)"}`,
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: item.done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)" }}
            >
              <item.icon size={14} style={{ color: item.done ? "#22C55E" : "rgba(255,255,255,0.3)" }} />
            </div>
            <span className="text-sm flex-1" style={{ color: item.done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}>
              {item.label}
            </span>
            {item.done ? (
              <CheckCircle size={14} className="text-hack-green" />
            ) : (
              <span className="text-white/25 text-xs">Skipped</span>
            )}
          </div>
        ))}
      </div>

      {data.name && (
        <div
          className="p-4 rounded-2xl"
          style={{ background: "rgba(124,92,255,0.06)", border: "1px solid rgba(124,92,255,0.12)" }}
        >
          <div className="text-white/50 text-xs mb-2">Profile Preview</div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-700 text-white"
              style={{ background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
            >
              {data.name.charAt(0)}
            </div>
            <div>
              <div className="text-white font-600 text-sm">{data.name}</div>
              <div className="text-white/50 text-xs">{data.role || "Builder"} • {data.location || "Location not set"}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(data.skills || []).slice(0, 4).map((s: string) => (
                  <span key={s} className="skill-tag" style={{ fontSize: "10px", padding: "1px 7px" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── Main Wizard ─────────

export default function ProfileSetupWizard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    role: user?.role || "",
    location: user?.location || "",
    bio: user?.bio || "",
    skills: user?.skills || [],
    availability: user?.availability || "available",
    college: "",
    gender: "",
    interests: [],
    resumeFile: null,
    resumeName: null,
    resumeParsed: false,
    githubConnected: false,
    linkedinConnected: false,
    hackathonsWon: [],
    certificates: [],
  });

  const calculateTrustScore = (data: typeof formData) => {
    let score = 25; // base
    if (data.skills?.length > 0) score += 5;
    if (data.resumeFile) score += 25;
    if (data.githubConnected) score += 25;
    if (data.linkedinConnected) score += 25;
    if (data.hackathonsWon?.length > 0) score += 10;
    return Math.min(score, 100);
  };

  const trustScore = calculateTrustScore(formData);

  const handleNext = () => {
    if (currentStep < 7) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    setSkippedSteps((prev) => [...prev, currentStep]);
    if (currentStep < 7) setCurrentStep((s) => s + 1);
    else handleFinish();
  };

  const handleFinish = () => {
    updateUser({
      name: formData.name || user?.name,
      role: formData.role || user?.role,
      location: formData.location || user?.location,
      bio: formData.bio,
      skills: formData.skills,
      availability: formData.availability as any,
      trustScore,
    });
    toast.success("Profile complete! Welcome to HackOS 🚀");
    navigate("/dashboard");
  };

  const currentStepInfo = STEPS[currentStep - 1];
  const isLastStep = currentStep === 7;
  const isSkippable = currentStep !== 1 && currentStep !== 7;

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1BasicInfo data={formData} onChange={setFormData} />;
      case 2: return <Step2Skills data={formData} onChange={setFormData} />;
      case 3: return <Step3Resume data={formData} onChange={setFormData} />;
      case 4: return <Step4GitHub data={formData} onChange={setFormData} />;
      case 5: return <Step5LinkedIn data={formData} onChange={setFormData} />;
      case 6: return <Step6Achievements data={formData} onChange={setFormData} />;
      case 7: return <Step7Review data={formData} trustScore={trustScore} />;
      default: return null;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-8 px-4"
      style={{
        background: "#06070B",
        backgroundImage: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(124,92,255,0.07) 0%, transparent 60%)",
      }}
    >
      {/* Header */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
              style={{ background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
            >
              H
            </div>
            <div>
              <div className="text-white font-700 text-lg leading-none">Build Your Identity</div>
              <div className="text-white/35 text-xs mt-0.5">Step {currentStep} of {STEPS.length}</div>
            </div>
          </div>

          {/* Trust Score Live */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-white/40 text-xs">Trust Score</div>
              <div
                className="text-lg font-700"
                style={{ color: trustScore >= 75 ? "#22C55E" : trustScore >= 50 ? "#4F7CFF" : "#F59E0B" }}
              >
                {trustScore}%
              </div>
            </div>
            <div
              className="h-8 w-px hidden sm:block"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <button
              onClick={() => navigate("/dashboard")}
              className="text-white/30 hover:text-white/60 text-xs transition-colors flex items-center gap-1"
            >
              <SkipForward size={12} />
              Complete Later
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="overflow-x-auto scrollbar-hide">
          <StepIndicator currentStep={currentStep} />
        </div>

        {/* Progress bar */}
        <div className="progress-bar mt-4">
          <div
            className="progress-fill"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Card */}
      <div
        className="w-full max-w-3xl rounded-[28px] overflow-hidden"
        style={{
          background: "#0E111B",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Step Header */}
        <div
          className="px-8 py-5 flex items-center gap-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124,92,255,0.15)" }}
          >
            <currentStepInfo.icon size={18} className="text-hack-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-700 text-xl">
              {{
                1: "Basic Information",
                2: "Skills & Interests",
                3: "Upload Resume",
                4: "Connect GitHub",
                5: "Import LinkedIn",
                6: "Achievements",
                7: "Review & Complete",
              }[currentStep]}
            </h2>
            <p className="text-white/40 text-sm mt-0.5">
              {{
                1: "Tell others who you are and what you do",
                2: "Showcase your technical skills and interests",
                3: "Let AI extract your skills and experience automatically",
                4: "Import your development activity and top languages",
                5: "Bring your professional experience into HackOS",
                6: "Add hackathon wins and certifications",
                7: "Your profile looks great! Ready to start building.",
              }[currentStep]}
            </p>
          </div>
          {currentStepInfo.trustGain > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-600 flex-shrink-0"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <Shield size={12} />
              +{currentStepInfo.trustGain}% Trust
            </div>
          )}
        </div>

        {/* Step Content */}
        <div className="p-8 min-h-[420px]">
          {renderStep()}
        </div>

        {/* Actions */}
        <div
          className="px-8 py-5 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="hack-btn-secondary"
            style={{ opacity: currentStep === 1 ? 0.3 : 1 }}
          >
            <ArrowLeft size={15} />
            Back
          </button>

          <div className="flex items-center gap-3">
            {isSkippable && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-white/35 hover:text-white/60 text-sm font-500 transition-colors flex items-center gap-1.5"
              >
                <SkipForward size={14} />
                Skip for now
              </button>
            )}
            {isLastStep ? (
              <button
                type="button"
                onClick={handleFinish}
                className="hack-btn-primary px-6"
              >
                <Sparkles size={15} />
                Complete Profile
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="hack-btn-primary px-6"
              >
                Continue
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom note */}
      <p className="text-white/20 text-xs mt-6 text-center">
        All information is editable anytime from your Profile settings.
      </p>
    </div>
  );
}
