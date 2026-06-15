import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, CheckCircle, Github, Linkedin,
  Upload, Star, Sparkles, User, FileText, Loader2, SkipForward, Shield, ExternalLink, Globe, Camera
} from "lucide-react";
import { buildGitHubAnalytics, GitHubAnalytics } from "@/lib/github";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useLinkedIn } from "@/hooks/useLinkedIn";
import { parseResumeFile, mergeResumeDataWithDB } from "@/lib/resumeParserService";

const STEPS = [
  { id: 1, label: "Basic Details", icon: User, trustGain: 0 },
  { id: 2, label: "Resume Upload", icon: FileText, trustGain: 0 },
  { id: 3, label: "GitHub Connect", icon: Github, trustGain: 30 },
  { id: 4, label: "LinkedIn Connect", icon: Linkedin, trustGain: 30 },
  { id: 5, label: "Profile Photo", icon: Camera, trustGain: 0 },
  { id: 6, label: "Bio / About", icon: Sparkles, trustGain: 0 },
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
      <div>
        <label className="block text-white/60 text-sm font-500 mb-2">Full Name</label>
        <input
          type="text"
          value={data.name || ""}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="Alex Singh"
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
          {["Full Stack Developer", "Frontend Developer", "Backend Developer", "AI Engineer",
            "UI Designer", "Mobile Developer", "DevOps Engineer", "Data Scientist",
            "Blockchain Developer", "Presenter", "Student"].map((r) => (
            <option key={r} value={r} style={{ background: "#131826" }}>{r}</option>
          ))}
        </select>
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
    </div>
  );
}

function Step2Resume({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const { user, reloadProfile } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "doc", "docx"].includes(extension)) {
      toast.error("Unsupported format. Please upload a PDF, DOC, or DOCX file.");
      return;
    }
    setParsing(true);
    try {
      const parsedData = await parseResumeFile(file);
      if (user?.id) {
        const summary = await mergeResumeDataWithDB(user.id, parsedData, file);
        await reloadProfile();

        onChange((prev: any) => {
          const mergedSkills = [...new Set([...(prev.skills || []), ...(parsedData.skills || []), ...(parsedData.tech_stack || [])])];
          return {
            ...prev,
            resumeFile: file,
            resumeName: file.name,
            resumeParsed: true,
            bio: parsedData.bio || prev.bio || "",
            skills: mergedSkills,
          };
        });

        toast.success(
          `✓ Resume parsed and merged!\n` +
          `• Skills: ${summary.skillsAdded} added\n` +
          `• Projects: ${summary.projectsAdded} added\n` +
          `• Experience: ${summary.experiencesAdded} added`,
          { duration: 5000 }
        );
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse resume.");
      onChange((prev: any) => ({ ...prev, resumeFile: null, resumeName: null, resumeParsed: false }));
    } finally {
      setParsing(false);
    }
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
          accept=".pdf,.doc,.docx"
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
            <div className="text-white/25 text-xs">PDF, DOC, DOCX — Max 10MB</div>
          </div>
        )}
      </div>

      <div className="text-white/30 text-xs text-center">
        Your resume is used only for profile enhancement. It remains private and deletable anytime.
      </div>
    </div>
  );
}

function Step3GitHub({ data, onChange, onDisconnectClick }: { data: any; onChange: (d: any) => void; onDisconnectClick: () => void }) {
  const [connecting, setConnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualUsername, setManualUsername] = useState("");
  const [loadingManual, setLoadingManual] = useState(false);
  const analytics: GitHubAnalytics | null = data.githubAnalytics || null;

  const handleOAuth = async () => {
    setConnecting(true);
    try {
      sessionStorage.setItem("oauth_provider", "github");
      sessionStorage.setItem("oauth_redirect_path", window.location.pathname);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: "select_account",
            allow_signup: "true",
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger GitHub connection");
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

      {data.githubConnected ? (
        analytics ? (
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
              onClick={onDisconnectClick}
              className="hack-btn-secondary w-full justify-center"
            >
              Disconnect GitHub
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 gap-3 bg-white/5 border border-white/10 rounded-2xl">
            <Loader2 className="text-hack-primary animate-spin" size={24} />
            <span className="text-white/60 text-sm">Loading GitHub stats...</span>
          </div>
        )
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

function Step4LinkedIn({ data, onChange, onDisconnectClick }: { data: any; onChange: (d: any) => void; onDisconnectClick: () => void }) {
  const { user } = useAuth();
  const { signIn: connectLinkedIn, loading: linkingLinkedIn } = useLinkedIn();
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (val: string) => {
    onChange({ ...data, linkedinUrl: val });
    const trimmed = val.trim();
    if (trimmed && !trimmed.startsWith("https://www.linkedin.com/in/")) {
      setError("Please enter a valid LinkedIn public profile URL");
    } else {
      setError(null);
    }
  };

  useEffect(() => {
    const trimmed = (data.linkedinUrl || "").trim();
    if (trimmed && !trimmed.startsWith("https://www.linkedin.com/in/")) {
      setError("Please enter a valid LinkedIn public profile URL");
    } else {
      setError(null);
    }
  }, [data.linkedinUrl]);

  return (
    <div className="space-y-6">
      <div
        className="p-5 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(79,124,255,0.15)" }}
          >
            <Linkedin size={24} className="text-[#0A66C2]" />
          </div>
          <div>
            <h3 className="text-white font-700 text-base mb-1">Connect LinkedIn</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Bring your professional experience, education and verified skills into HackOS automatically.
            </p>
          </div>
        </div>
      </div>

      {user?.linkedin_connected ? (
        <div
          className="p-5 rounded-2xl"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-hack-green font-600">
              <CheckCircle size={16} />
              ✓ Connected
            </div>
            <button
              type="button"
              onClick={onDisconnectClick}
              className="text-[9px] font-600 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              Disconnect
            </button>
          </div>
          <div className="flex items-center gap-4">
            {user.linkedin_avatar && (
              <img
                src={user.linkedin_avatar}
                alt={user.linkedin_name || "LinkedIn avatar"}
                className="w-16 h-16 rounded-full object-cover border-2 border-hack-primary/30"
              />
            )}
            <div>
              <div className="text-white font-700 text-base">{user.linkedin_name || "Connected Builder"}</div>
              {user.linkedin_url && user.linkedin_url.trim().startsWith("https://www.linkedin.com/in/") ? (
                <a
                  href={user.linkedin_url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#A78BFF] text-xs hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                >
                  View LinkedIn Profile
                  <ExternalLink size={10} />
                </a>
              ) : (
                <button
                  disabled
                  className="text-white/30 text-xs flex items-center gap-1 mt-1 cursor-not-allowed bg-transparent border-none p-0"
                >
                  Public LinkedIn URL unavailable
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            disabled={linkingLinkedIn}
            onClick={async () => {
              try {
                await connectLinkedIn(window.location.pathname);
              } catch (err: any) {
                toast.error(err.message || "Unable to connect LinkedIn");
              }
            }}
            className="hack-btn-primary w-full justify-center py-3 text-base flex items-center gap-2"
          >
            {linkingLinkedIn ? (
              <><Loader2 size={16} className="animate-spin" /> Opening LinkedIn...</>
            ) : (
              <><Linkedin size={16} /> Connect LinkedIn</>
            )}
          </button>
        </div>
      )}

      {/* Manual URL input field */}
      <div className="space-y-2 pt-4 border-t border-white/[0.06]">
        <label className="block text-white/60 text-sm font-500">LinkedIn Public Profile URL</label>
        <input
          type="text"
          value={data.linkedinUrl || ""}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://www.linkedin.com/in/your-profile-slug/"
          className="hack-input"
        />
        {error && (
          <p className="text-hack-red text-[11px] mt-1">{error}</p>
        )}
        <p className="text-white/30 text-xs leading-normal">
          Paste your public LinkedIn profile URL. Example: https://www.linkedin.com/in/john-doe-123456/
        </p>
      </div>
    </div>
  );
}

function Step5PhotoUpload({ onChange }: { onChange: (d: any) => void }) {
  const { user, updateUser, reloadProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file format. Please upload JPG, PNG, JPEG or WEBP.");
      return;
    }

    // Validate size (5 MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File size exceeds 5 MB limit.");
      return;
    }

    if (!user?.id) return;
    setUploading(true);
    const toastId = toast.loading("Uploading photo...");

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `${user.id}/profile.${ext}`;

      // Delete old photos
      const extensions = ["jpg", "jpeg", "png", "webp"];
      const filesToDelete = extensions.flatMap(extension => [
        `${user.id}/profile.${extension}`,
        `${user.id}/avatar.${extension}`
      ]);
      await supabase.storage.from("avatars").remove(filesToDelete);

      // Upload new photo
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(storagePath);

      const avatarUrl = urlData.publicUrl;

      // Save to profile
      await updateUser({ avatar: avatarUrl });
      await reloadProfile();

      onChange((prev: any) => ({ ...prev, avatarUrl }));
      toast.success("Photo uploaded successfully.", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Upload failed: ${err.message || err}`, { id: toastId });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.id) return;
    if (window.confirm("Are you sure you want to remove your profile picture?")) {
      setUploading(true);
      const toastId = toast.loading("Removing photo...");
      try {
        const extensions = ["jpg", "jpeg", "png", "webp"];
        const filesToDelete = extensions.flatMap(extension => [
          `${user.id}/profile.${extension}`,
          `${user.id}/avatar.${extension}`
        ]);
        await supabase.storage.from("avatars").remove(filesToDelete);

        await updateUser({ avatar: null as any });
        await reloadProfile();

        onChange((prev: any) => ({ ...prev, avatarUrl: null }));
        toast.success("Photo removed successfully.", { id: toastId });
      } catch (err: any) {
        console.error(err);
        toast.error(`Remove failed: ${err.message || err}`, { id: toastId });
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="space-y-6 flex flex-col items-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
      />

      <div className="relative group">
        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-hack-primary bg-[#0E111B] flex items-center justify-center relative">
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-white/20 flex flex-col items-center gap-1">
              <Camera size={32} />
              <span className="text-[10px]">No Photo</span>
            </div>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
            <Loader2 className="text-hack-primary animate-spin" size={24} />
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-white font-600 text-sm">Upload Profile Picture</h3>
        <p className="text-white/40 text-xs max-w-xs mx-auto">
          Add a friendly profile photo. JPG, PNG, WEBP — Max 5MB.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="hack-btn-primary py-2 px-4 text-xs"
        >
          {user?.avatar ? "Change Photo" : "Select Photo"}
        </button>
        {user?.avatar && (
          <button
            type="button"
            disabled={uploading}
            onClick={handleRemovePhoto}
            className="hack-btn-secondary border border-hack-red/30 hover:bg-hack-red/10 text-hack-red py-2 px-4 text-xs"
          >
            Remove Photo
          </button>
        )}
      </div>
    </div>
  );
}

function Step6Bio({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const { callGroq } = await import("@/lib/groq");

      const prompt = `You are a professional developer bio writer.
Generate a short, modern, and engaging developer bio under 250 characters (about 20-30 words) for:
Name: ${data.name || user?.name || "Developer"}
Role: ${data.role || user?.role || "Full Stack Developer"}
Location: ${data.location || user?.location || ""}
Skills: ${(data.skills || []).join(", ")}

Strict Rules:
- Return ONLY the plain text bio.
- Do NOT wrap in quotes, comments, code blocks, or HTML.
- Must be strictly under 250 characters. Make it highly professional and punchy.`;

      const response = await callGroq([
        { role: "system", content: "You are a professional profile copywriter." },
        { role: "user", content: prompt }
      ]);

      const cleanBio = response.trim().replace(/^["']|["']$/g, "").slice(0, 250);
      onChange({ ...data, bio: cleanBio });
      toast.success("AI Bio generated! Review below.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate bio with AI.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-white/60 text-sm font-500">Short Bio / About Me</label>
          <button
            type="button"
            disabled={generating}
            onClick={handleGenerateAI}
            className="text-xs text-hack-primary hover:text-hack-primary/80 flex items-center gap-1.5 bg-hack-primary/10 px-2.5 py-1 rounded-lg border border-hack-primary/20 transition-all font-600"
          >
            {generating ? (
              <><Loader2 size={12} className="animate-spin" /> Generating...</>
            ) : (
              <><Sparkles size={12} /> Generate with AI</>
            )}
          </button>
        </div>
        <textarea
          value={data.bio || ""}
          onChange={(e) => onChange({ ...data, bio: e.target.value.slice(0, 250) })}
          placeholder="Write a short summary about yourself, what you are building, or your background..."
          className="hack-input resize-none"
          rows={5}
          maxLength={250}
        />
        <div className="text-right text-xs text-white/30 mt-1">{(data.bio || "").length}/250</div>
      </div>
    </div>
  );
}

// ───────── Main Wizard ─────────

export default function ProfileSetupWizard() {
  const { user, updateUser, disconnectGithub, disconnectLinkedIn } = useAuth();
  const [confirmDisconnectProvider, setConfirmDisconnectProvider] = useState<"github" | "linkedin" | null>(null);
  const navigate = useNavigate();

  // Load initial state from sessionStorage if present to survive OAuth redirect reload
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = sessionStorage.getItem("hackos_wizard_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.currentStep || 1;
      } catch (e) {
        return 1;
      }
    }
    return 1;
  });

  const [skippedSteps, setSkippedSteps] = useState<number[]>(() => {
    const saved = sessionStorage.getItem("hackos_wizard_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.skippedSteps || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem("hackos_wizard_state");
    const defaultData = {
      name: user?.name || "",
      role: user?.role || "",
      location: user?.location || "",
      bio: user?.bio || "",
      skills: user?.skills || [],
      availability: user?.availability || "available",
      college: "",
      gender: "",
      interests: [],
      resumeFile: null as any,
      resumeName: null as string | null,
      resumeParsed: false,
      githubConnected: false,
      githubUsername: null as string | null,
      githubRepos: 0,
      githubStars: 0,
      githubTopLangs: [] as string[],
      githubAnalytics: null as any,
      linkedinConnected: false,
      linkedinUrl: user?.linkedin_url || "",
      hackathonsWon: [],
      certificates: [],
      avatarUrl: user?.avatar || null,
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultData, ...parsed.formData };
      } catch (e) {
        return defaultData;
      }
    }
    return defaultData;
  });

  // Sync state to sessionStorage whenever it changes, excluding volatile GitHub connection info
  useEffect(() => {
    const {
      githubConnected,
      githubUsername,
      githubRepos,
      githubStars,
      githubTopLangs,
      githubAnalytics,
      linkedinConnected,
      resumeFile,
      ...serializableFormData
    } = formData;

    const stateToSave = {
      currentStep,
      skippedSteps,
      formData: serializableFormData,
    };
    sessionStorage.setItem("hackos_wizard_state", JSON.stringify(stateToSave));
  }, [currentStep, skippedSteps, formData]);

  // Keep user profile details synced with profiles table directly (source of truth)
  useEffect(() => {
    if (user) {
      setFormData((prev) => {
        let updated = false;
        const newFormData = { ...prev };

        if (user.name && (!prev.name || prev.name.trim() === "")) {
          newFormData.name = user.name;
          updated = true;
        }
        if (user.role && (!prev.role || prev.role.trim() === "")) {
          newFormData.role = user.role;
          updated = true;
        }
        if (user.location && (!prev.location || prev.location.trim() === "")) {
          newFormData.location = user.location;
          updated = true;
        }
        if (user.bio && (!prev.bio || prev.bio.trim() === "")) {
          newFormData.bio = user.bio;
          updated = true;
        }
        if (user.skills && user.skills.length > 0 && (!prev.skills || prev.skills.length === 0)) {
          newFormData.skills = user.skills;
          updated = true;
        }
        if (user.availability && prev.availability === "available" && user.availability !== "available") {
          newFormData.availability = user.availability;
          updated = true;
        }

        const isGithubConnected = !!user.github_username || !!user.github_connected;
        const githubUsername = user.github_username || null;
        if (prev.githubConnected !== isGithubConnected || prev.githubUsername !== githubUsername) {
          newFormData.githubConnected = isGithubConnected;
          newFormData.githubUsername = githubUsername;
          updated = true;
        }

        const isLinkedinConnected = !!user.linkedin_connected || !!user.linkedin_url || !!user.linkedin_name;
        const linkedinUrl = user.linkedin_url || "";
        if (prev.linkedinConnected !== isLinkedinConnected || prev.linkedinUrl !== linkedinUrl) {
          newFormData.linkedinConnected = isLinkedinConnected;
          if (!prev.linkedinUrl) {
            newFormData.linkedinUrl = linkedinUrl;
          }
          updated = true;
        }

        const avatarUrl = user.avatar || null;
        if (prev.avatarUrl !== avatarUrl) {
          newFormData.avatarUrl = avatarUrl;
          updated = true;
        }

        return updated ? newFormData : prev;
      });
    }
  }, [user]);

  // Load GitHub analytics if connected via Supabase OAuth callback redirect and analytics not loaded yet
  useEffect(() => {
    if (user?.github_connected && !formData.githubAnalytics) {
      const fetchGitHubData = async () => {
        const username = user.github_username;
        if (username) {
          try {
            const result = await buildGitHubAnalytics(username);
            setFormData((prev) => ({
              ...prev,
              githubConnected: true,
              githubUsername: username,
              githubRepos: result.profile.public_repos,
              githubStars: result.totalStars,
              githubTopLangs: result.topLanguages.map((l) => l.name),
              githubAnalytics: result,
              skills: [...new Set([...(prev.skills || []), ...result.topLanguages.slice(0, 4).map((l) => l.name)])],
            }));
            toast.success("✓ GitHub connected from OAuth!");
          } catch (err) {
            console.error("Failed to load GitHub analytics on mount:", err);
          }
        }
      };
      fetchGitHubData();
    }
  }, [user, formData.githubAnalytics]);

  const calculateTrustScore = (data: typeof formData) => {
    let score = 0;
    const isGithubConnected = data.githubConnected || user?.github_connected;
    const isLinkedinConnected = user?.linkedin_connected || !!(data.linkedinUrl && data.linkedinUrl.trim().startsWith("https://www.linkedin.com/in/"));
    const hasEducation = !!(user?.education && user.education.length > 0);
    const hasExperience = !!(user?.experiences && user.experiences.length > 0);

    if (isGithubConnected) score += 30;
    if (isLinkedinConnected) score += 30;
    if (hasEducation) score += 15;
    if (hasExperience) score += 15;

    return Math.min(score, 100);
  };

  const trustScore = calculateTrustScore(formData);

  const handleNext = () => {
    if (currentStep === 4) {
      const url = formData.linkedinUrl || "";
      const trimmed = url.trim();
      if (trimmed && !trimmed.startsWith("https://www.linkedin.com/in/")) {
        toast.error("Please enter a valid LinkedIn public profile URL");
        return;
      }
    }
    if (currentStep < 6) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    if (currentStep === 4) {
      setFormData((prev: any) => ({ ...prev, linkedinUrl: "" }));
    }
    setSkippedSteps((prev) => [...prev, currentStep]);
    if (currentStep < 6) setCurrentStep((s) => s + 1);
    else handleFinish();
  };

  const handleFinish = async () => {
    const trimmedLinkedin = (formData.linkedinUrl || "").trim();
    const isLinkedInConnected = !!(user?.linkedin_connected || (trimmedLinkedin && trimmedLinkedin.startsWith("https://www.linkedin.com/in/")));

    try {
      await updateUser({
        name: formData.name || user?.name,
        role: formData.role || user?.role,
        location: formData.location || user?.location,
        bio: formData.bio || user?.bio,
        skills: formData.skills || user?.skills,
        availability: formData.availability as any,
        trustScore,
        github: formData.githubConnected ? `https://github.com/${formData.githubUsername}` : (user?.github || undefined),
        github_username: formData.githubConnected ? (formData.githubUsername || undefined) : (user?.github_username || undefined),
        github_avatar: formData.githubConnected ? (formData.githubAnalytics?.profile.avatar_url || undefined) : (user?.github_avatar || undefined),
        github_connected: formData.githubConnected || user?.github_connected || false,
        linkedin_url: trimmedLinkedin || user?.linkedin_url || null,
        linkedin_connected: isLinkedInConnected,
        linkedin_connected_at: isLinkedInConnected ? (user?.linkedin_connected_at || new Date().toISOString()) : undefined,
        profile_completed: true,
      });
      sessionStorage.removeItem("hackos_wizard_state");
      toast.success("Profile complete! Welcome to HackOS 🚀");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete profile.");
    }
  };

  const handleCompleteLater = async () => {
    try {
      await updateUser({
        name: formData.name || user?.name,
        role: formData.role || user?.role,
        location: formData.location || user?.location,
        bio: formData.bio || user?.bio,
        profile_completed: true,
      });
      sessionStorage.removeItem("hackos_wizard_state");
      toast.success("Profile setup skipped. You can complete it later in your profile.");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete setup later.");
    }
  };

  const currentStepInfo = STEPS[currentStep - 1];
  const isLastStep = currentStep === 6;

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1BasicInfo data={formData} onChange={setFormData} />;
      case 2: return <Step2Resume data={formData} onChange={setFormData} />;
      case 3: return <Step3GitHub data={formData} onChange={setFormData} onDisconnectClick={() => setConfirmDisconnectProvider("github")} />;
      case 4: return <Step4LinkedIn data={formData} onChange={setFormData} onDisconnectClick={() => setConfirmDisconnectProvider("linkedin")} />;
      case 5: return <Step5PhotoUpload onChange={setFormData} />;
      case 6: return <Step6Bio data={formData} onChange={setFormData} />;
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
              onClick={handleCompleteLater}
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
                2: "Upload Resume",
                3: "Connect GitHub",
                4: "Import LinkedIn",
                5: "Upload Photo",
                6: "Bio & Summary",
              }[currentStep]}
            </h2>
            <p className="text-white/40 text-sm mt-0.5">
              {{
                1: "Tell others who you are and what you do",
                2: "Let AI extract your skills and experience automatically",
                3: "Import your development activity and top languages",
                4: "Bring your professional experience into HackOS",
                5: "Add a custom profile picture to stand out",
                6: "Write a short summary about yourself and your goals",
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
            <button
              type="button"
              onClick={handleSkip}
              className="text-white/35 hover:text-white/60 text-sm font-500 transition-colors flex items-center gap-1.5"
            >
              <SkipForward size={14} />
              {isLastStep ? "Skip and Finish" : "Skip for now"}
            </button>
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

      {confirmDisconnectProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: "#0E111B",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3 className="text-white font-700 text-lg mb-2 capitalize">
              Disconnect {confirmDisconnectProvider}
            </h3>
            <p className="text-white/60 text-xs leading-relaxed mb-6">
              Are you sure you want to disconnect {confirmDisconnectProvider === "github" ? "GitHub" : "LinkedIn"}? This will remove synced data, stats, and badges from your profile.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDisconnectProvider(null)}
                className="px-4 py-2 rounded-xl text-xs font-600 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const provider = confirmDisconnectProvider;
                  setConfirmDisconnectProvider(null);
                  if (provider === "github") {
                    await disconnectGithub();
                    setFormData((prev: any) => ({
                      ...prev,
                      githubConnected: false,
                      githubUsername: null,
                      githubAnalytics: null,
                    }));
                  } else {
                    await disconnectLinkedIn();
                    setFormData((prev: any) => ({
                      ...prev,
                      linkedinConnected: false,
                      linkedinUrl: "",
                    }));
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-600 bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
