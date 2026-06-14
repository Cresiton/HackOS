import { useState, useMemo, useRef, useEffect } from "react";
import {
  Linkedin, MapPin, Star, Shield, Edit2, Plus,
  ExternalLink, Award, Code, Briefcase, GraduationCap, Github,
  FileText, Upload, Loader2, RefreshCw, Trash2, Sparkles, Camera
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import GitHubAnalyticsCard from "@/components/features/GitHubAnalyticsCard";
import { useGithubStats } from "@/hooks/useGithubStats";
import { getLangColor } from "@/lib/github";
import { useLinkedIn } from "@/hooks/useLinkedIn";
import { parseResumeFile, mergeResumeDataWithDB, processResumeUpload } from "@/lib/resumeParserService";

const HACKATHONS_WON = [
  { name: "Smart India Hackathon 2024", result: "Winner 🏆", prize: "₹1,00,000" },
  { name: "HackFest 2023", result: "2nd Place 🥈", prize: "₹50,000" },
  { name: "AI Hackathon 2023", result: "Finalist", prize: "₹10,000" },
];

const getLinkedInUrl = (url?: string | null) => {
  if (!url) return null;
  const cleaned = url.trim();
  if (cleaned.startsWith("https://www.linkedin.com/in/")) {
    return cleaned;
  }
  return null;
};

const getGithubUrl = (
  username?: string | null,
  githubUrl?: string | null
) => {

  if (githubUrl?.startsWith("https://github.com/")) {
    return githubUrl;
  }

  if (username) {
    return `https://github.com/${username}`;
  }

  return null;
};

function TrustRing({ score, user }: { score: number; user: any }) {
  const size = 80;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const isGithubConnected = !!user?.github_username || !!user?.github_connected;
  const isLinkedinConnected = !!user?.linkedin_connected || !!user?.linkedin_url || !!user?.linkedin_name;

  const missingChecklist = [];
  if (!isGithubConnected) missingChecklist.push({ text: "Connect GitHub", points: 30 });
  if (!isLinkedinConnected) missingChecklist.push({ text: "Connect LinkedIn", points: 30 });
  if (!user?.education || user.education.length === 0) missingChecklist.push({ text: "Add Education History", points: 15 });
  if (!user?.experiences || user.experiences.length === 0) missingChecklist.push({ text: "Add Work Experience", points: 15 });

  const completedChecklist = [];
  if (isGithubConnected) completedChecklist.push({ text: "GitHub Connected", points: 30 });
  if (isLinkedinConnected) completedChecklist.push({ text: "LinkedIn Connected", points: 30 });
  if (user?.education && user.education.length > 0) completedChecklist.push({ text: "Education Added", points: 15 });
  if (user?.experiences && user.experiences.length > 0) completedChecklist.push({ text: "Experience Added", points: 15 });

  return (
    <div className="relative group flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.01] border border-white/[0.05] hover:bg-white/[0.03] transition-all cursor-help flex-shrink-0">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="url(#trustGrad)" strokeWidth="5"
            strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round"
            className="transition-all duration-500 ease-out"
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
      <div className="text-white/50 text-[10px] mt-2 font-500">
        Trust Score: <span className="text-white font-700">{score}/100</span>
      </div>

      {/* Checklist Tooltip */}
      <div className="absolute top-full right-0 mt-2 w-60 bg-[#0E111B] border border-white/10 rounded-xl p-3.5 shadow-2xl backdrop-blur-md z-40 hidden group-hover:block transition-all text-left">
        <h4 className="text-white text-xs font-700 mb-2 flex items-center justify-between border-b border-white/5 pb-2">
          <span>Trust Score Checklist</span>
          <span className="text-[#A78BFF] text-[10px]">({score}/100)</span>
        </h4>
        <div className="space-y-1.5 text-[9px] leading-tight">
          {completedChecklist.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-green-400 font-500">
              <span className="flex items-center gap-1">
                <span>✓</span> {item.text}
              </span>
              <span className="font-600">+{item.points}</span>
            </div>
          ))}
          {missingChecklist.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-white/40 font-500">
              <span className="flex items-center gap-1">
                <span className="text-white/20">○</span> {item.text}
              </span>
              <span className="font-600">+{item.points}</span>
            </div>
          ))}
        </div>
        {missingChecklist.length > 0 ? (
          <p className="text-[8px] text-[#A78BFF] mt-2.5 font-500 border-t border-white/5 pt-2">
            💡 Complete missing items to verify profile strength.
          </p>
        ) : (
          <p className="text-[8px] text-green-400 mt-2.5 font-500 border-t border-white/5 pt-2">
            🏆 Perfect score! Your profile is verified.
          </p>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser, reloadProfile, disconnectGithub, disconnectLinkedIn } = useAuth();
  const {
    stats: githubStats,
    loading: githubStatsLoading,
    syncing: githubStatsSyncing,
    syncStats
  } = useGithubStats(user?.id);
  const { signIn: connectLinkedIn, loading: linkingLinkedIn } = useLinkedIn();
  const githubProfile = getGithubUrl(user?.github_username, user?.github) || "#";
  const linkedinProfile = getLinkedInUrl(user?.linkedin_url);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || "");
  const [availability, setAvailability] = useState<'available' | 'open' | 'busy' | 'unavailable'>(user?.availability || "available");
  const [linkedinUrlField, setLinkedinUrlField] = useState(user?.linkedin_url || "");
  const [linkedinUrlError, setLinkedinUrlError] = useState<string | null>(null);
  const [localSkills, setLocalSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [localDomains, setLocalDomains] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState("");
  const [localName, setLocalName] = useState(user?.name || "");
  const [localRole, setLocalRole] = useState(user?.role || "");
  const [localLocation, setLocalLocation] = useState(user?.location || "");

  // Bio and Photo Enhancements
  const [editingBio, setEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState(user?.bio || "");
  const [savingBio, setSavingBio] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [showEduModal, setShowEduModal] = useState(false);
  const [eduId, setEduId] = useState<string | undefined>(undefined);
  const [eduDegree, setEduDegree] = useState("");
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduField, setEduField] = useState("");
  const [eduStart, setEduStart] = useState("");
  const [eduEnd, setEduEnd] = useState("");

  const [showExpModal, setShowExpModal] = useState(false);
  const [expId, setExpId] = useState<string | undefined>(undefined);
  const [expTitle, setExpTitle] = useState("");
  const [expCompany, setExpCompany] = useState("");
  const [expPeriod, setExpPeriod] = useState("");
  const [expDescription, setExpDescription] = useState("");

  const [showProjModal, setShowProjModal] = useState(false);
  const [projId, setProjId] = useState<string | undefined>(undefined);
  const [projTitle, setProjTitle] = useState("");
  const [projDescription, setProjDescription] = useState("");
  const [projTechStack, setProjTechStack] = useState("");
  const [projGithubUrl, setProjGithubUrl] = useState("");
  const [projLiveUrl, setProjLiveUrl] = useState("");

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !localSkills.includes(trimmed)) {
      setLocalSkills([...localSkills, trimmed]);
      setNewSkillInput("");
    }
  };

  const handleAddDomain = () => {
    const trimmed = newDomainInput.trim();
    if (trimmed && !localDomains.includes(trimmed)) {
      setLocalDomains([...localDomains, trimmed]);
      setNewDomainInput("");
    }
  };

  const handleOpenAddEdu = () => {
    setEduId(undefined);
    setEduDegree("");
    setEduInstitution("");
    setEduField("");
    setEduStart("");
    setEduEnd("");
    setShowEduModal(true);
  };

  const handleOpenEditEdu = (item: any) => {
    setEduId(item.id);
    setEduDegree(item.degree || "");
    setEduInstitution(item.institution || "");
    setEduField(item.field_of_study || "");
    setEduStart(item.start_year || "");
    setEduEnd(item.end_year || "");
    setShowEduModal(true);
  };

  const handleSaveEdu = async () => {
    if (!eduDegree.trim() || !eduInstitution.trim()) {
      toast.error("Degree and Institution are required");
      return;
    }
    const payload = {
      user_id: user?.id,
      degree: eduDegree.trim(),
      institution: eduInstitution.trim(),
      field_of_study: eduField.trim() || null,
      start_year: eduStart.trim() || null,
      end_year: eduEnd.trim() || null,
    };
    console.log("auth uid", user?.id);
    console.log("insert payload", payload);

    try {
      if (eduId) {
        const { error } = await supabase.from("user_education").update(payload).eq("id", eduId);
        if (error) throw error;
        toast.success("Education updated successfully!");
      } else {
        const { error } = await supabase.from("user_education").insert(payload);
        if (error) throw error;
        toast.success("Education added successfully!");
      }
      setShowEduModal(false);
      await reloadProfile();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save education.");
    }
  };

  const handleDeleteEdu = async (id?: string) => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this education entry?")) {
      try {
        const { error } = await supabase.from("user_education").delete().eq("id", id);
        if (error) throw error;
        toast.success("Education deleted!");
        await reloadProfile();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to delete education.");
      }
    }
  };

  const handleOpenAddExp = () => {
    setExpId(undefined);
    setExpTitle("");
    setExpCompany("");
    setExpPeriod("");
    setExpDescription("");
    setShowExpModal(true);
  };

  const handleOpenEditExp = (item: any) => {
    setExpId(item.id);
    setExpTitle(item.title || "");
    setExpCompany(item.company || "");
    setExpPeriod(item.period || "");
    setExpDescription(item.description || "");
    setShowExpModal(true);
  };

  const handleSaveExp = async () => {
    if (!expTitle.trim() || !expCompany.trim()) {
      toast.error("Job Title and Company are required");
      return;
    }
    const payload = {
      user_id: user?.id,
      title: expTitle.trim(),
      company: expCompany.trim(),
      period: expPeriod.trim() || null,
      description: expDescription.trim() || null,
    };
    console.log("auth uid", user?.id);
    console.log("insert payload", payload);

    try {
      if (expId) {
        const { error } = await supabase.from("user_experience").update(payload).eq("id", expId);
        if (error) throw error;
        toast.success("Experience updated successfully!");
      } else {
        const { error } = await supabase.from("user_experience").insert(payload);
        if (error) throw error;
        toast.success("Experience added successfully!");
      }
      setShowExpModal(false);
      await reloadProfile();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save experience.");
    }
  };

  const handleDeleteExp = async (id?: string) => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this experience entry?")) {
      try {
        const { error } = await supabase.from("user_experience").delete().eq("id", id);
        if (error) throw error;
        toast.success("Experience deleted!");
        await reloadProfile();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to delete experience.");
      }
    }
  };

  const handleOpenAddProj = () => {
    setProjId(undefined);
    setProjTitle("");
    setProjDescription("");
    setProjTechStack("");
    setProjGithubUrl("");
    setProjLiveUrl("");
    setShowProjModal(true);
  };

  const handleOpenEditProj = (item: any) => {
    setProjId(item.id);
    setProjTitle(item.title || "");
    setProjDescription(item.description || "");
    setProjTechStack(item.tech_stack ? item.tech_stack.join(", ") : "");
    setProjGithubUrl(item.github_url || "");
    setProjLiveUrl(item.live_url || "");
    setShowProjModal(true);
  };

  const handleSaveProj = async () => {
    if (!projTitle.trim()) {
      toast.error("Project Title is required");
      return;
    }
    const techStackArray = projTechStack
      .split(",")
      .map((t) => t.trim())
      .filter((t) => !!t);

    const payload = {
      user_id: user?.id,
      title: projTitle.trim(),
      description: projDescription.trim() || null,
      tech_stack: techStackArray,
      github_url: projGithubUrl.trim() || null,
      live_url: projLiveUrl.trim() || null,
    };
    console.log("auth uid", user?.id);
    console.log("insert payload", payload);

    try {
      if (projId) {
        const { error } = await supabase.from("user_projects").update(payload).eq("id", projId);
        if (error) throw error;
        toast.success("Project updated successfully!");
      } else {
        const { error } = await supabase.from("user_projects").insert(payload);
        if (error) throw error;
        toast.success("Project added successfully!");
      }
      setShowProjModal(false);
      await reloadProfile();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save project.");
    }
  };

  const handleDeleteProj = async (id?: string) => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        const { error } = await supabase.from("user_projects").delete().eq("id", id);
        if (error) throw error;
        toast.success("Project deleted!");
        await reloadProfile();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to delete project.");
      }
    }
  };

  const [confirmDisconnectProvider, setConfirmDisconnectProvider] = useState<"github" | "linkedin" | null>(null);

  const handleLinkedInUrlChange = (val: string) => {
    setLinkedinUrlField(val);
    const trimmed = val.trim();
    if (trimmed && !trimmed.startsWith("https://www.linkedin.com/in/")) {
      setLinkedinUrlError("Please enter a valid LinkedIn public profile URL");
    } else {
      setLinkedinUrlError(null);
    }
  };

  useEffect(() => {
    if (user && !editing) {
      setBio(user.bio || "");
      setAvailability(user.availability || "available");
      setLinkedinUrlField(user.linkedin_url || "");
      setLocalSkills(user.skills || []);
      setLocalDomains(user.domains || []);
      setLocalName(user?.name || "");
      setLocalRole(user?.role || "");
      setLocalLocation(user?.location || "");
      setTempBio(user.bio || "");
    }
  }, [user, editing]);

  const [dragging, setDragging] = useState(false);
  const [resumeLoadingStep, setResumeLoadingStep] = useState<"uploading" | "parsing" | "saving" | null>(null);
  const [skillSearch, setSkillSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeUpload = async (file: File) => {
    if (!user?.id) return;
    const toastId = toast.loading("Checking existing resume...");
    try {
      setResumeLoadingStep("uploading");
      toast.loading("Uploading resume...", { id: toastId });
      
      const summary = await processResumeUpload(user.id, file);
      
      setResumeLoadingStep("saving");
      toast.loading("Saving Profile Data...", { id: toastId });
      await reloadProfile();

      toast.success("Resume Uploaded Successfully.", { id: toastId });
      toast.success(
        `✓ Resume Parsed Successfully:\n` +
        `• Skills Added: ${summary.skillsAdded}\n` +
        `• Projects Added: ${summary.projectsAdded}\n` +
        `• Experience Added: ${summary.experiencesAdded}\n` +
        `• Education Added: ${summary.educationAdded}`,
        { duration: 5000 }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process resume.", { id: toastId });
    } finally {
      setResumeLoadingStep(null);
    }
  };

  const handleRemoveResume = async () => {
    if (!user?.id) return;
    if (window.confirm("Are you sure you want to remove your resume? This will delete the file permanently.")) {
      const toastId = toast.loading("Removing resume...");
      try {
        const { removeResumeData } = await import("@/lib/resumeParserService");
        await removeResumeData(user.id);
        await reloadProfile();
        toast.success("Resume Removed Successfully.", { id: toastId });
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to remove resume.", { id: toastId });
      }
    }
  };

  const handleSaveBio = async () => {
    if (!user?.id) return;
    setSavingBio(true);
    try {
      await updateUser({ bio: tempBio.trim() });
      setEditingBio(false);
      toast.success("Bio updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update bio.");
    } finally {
      setSavingBio(false);
    }
  };

  const handleGenerateAIBio = async () => {
    setGeneratingBio(true);
    try {
      const { callGroq } = await import("@/lib/groq");
      
      const githubInfo = githubStats ? `GitHub Repos: ${githubStats.public_repos}, Commits: ${githubStats.total_commits}, Languages: ${Object.keys(githubStats.languages || {}).join(", ")}` : "";
      const resumeInfo = user?.resume ? `Resume: ${user.resume.file_name}` : "";
      const skillsInfo = user?.skills && user.skills.length > 0 ? `Skills: ${user.skills.join(", ")}` : "";
      const experiencesInfo = user?.education && user.education.length > 0 
        ? `Education: ${user.education.map(e => `${e.degree} at ${e.institution}`).join("; ")}` 
        : "";
      const projectsInfo = user?.projects && user.projects.length > 0
        ? `Projects: ${user.projects.map(p => p.title).join("; ")}`
        : "";

      const prompt = `You are a professional developer bio writer. 
Generate a short, modern, and engaging developer bio under 250 characters (about 20-30 words) for:
Name: ${user?.name || "Developer"}
Role: ${user?.role || "Full Stack Developer"}
Location: ${user?.location || ""}
${skillsInfo}
${experiencesInfo}
${projectsInfo}
${githubInfo}
${resumeInfo}

Strict Rules:
- Return ONLY the plain text bio.
- Do NOT wrap in quotes, comments, code blocks, or HTML.
- Must be strictly under 250 characters. Make it highly professional and punchy.`;

      const response = await callGroq([
        { role: "system", content: "You are a professional profile copywriter." },
        { role: "user", content: prompt }
      ]);

      const cleanBio = response.trim().replace(/^["']|["']$/g, "").slice(0, 250);
      setTempBio(cleanBio);
      toast.success("AI Bio generated! Review and click Save.");
    } catch (err: any) {
      console.error("AI bio generation failed:", err);
      toast.error(err.message || "Failed to generate bio with AI.");
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file format. Please upload JPG, PNG, JPEG or WEBP.");
      return;
    }

    // Validate size (5 MB limit)
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      toast.error("File size exceeds 5 MB limit.");
      return;
    }

    if (!user?.id) return;
    setUploadingAvatar(true);
    const toastId = toast.loading("Uploading photo...");

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `${user.id}/profile.${ext}`;

      // 1. Delete previous avatar if any from Storage
      const extensions = ["jpg", "jpeg", "png", "webp"];
      const filesToDelete = extensions.flatMap(extension => [
        `${user.id}/profile.${extension}`,
        `${user.id}/avatar.${extension}`
      ]);
      await supabase.storage.from("avatars").remove(filesToDelete);

      // 2. Upload new file
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadErr) throw uploadErr;

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(storagePath);

      const avatarUrl = urlData.publicUrl;

      // 4. Update profiles table and auth context state
      await updateUser({ avatar: avatarUrl });
      await reloadProfile();

      toast.success("Photo uploaded successfully.", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Upload failed: ${err.message || err}`, { id: toastId });
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;
    if (window.confirm("Are you sure you want to remove your profile picture?")) {
      setUploadingAvatar(true);
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

        toast.success("Photo removed successfully.", { id: toastId });
      } catch (err: any) {
        console.error(err);
        toast.error(`Remove failed: ${err.message || err}`, { id: toastId });
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSave = async () => {
    const trimmed = linkedinUrlField.trim();
    if (trimmed && !trimmed.startsWith("https://www.linkedin.com/in/")) {
      toast.error("Please enter a valid LinkedIn public profile URL");
      return;
    }

    try {
      const updates: any = {};

      if (localName?.trim() !== user?.name) {
        updates.name = localName?.trim();
      }

      if (localRole?.trim() !== user?.role) {
        updates.role = localRole?.trim();
      }

      if (localLocation?.trim() !== user?.location) {
        updates.location = localLocation?.trim();
      }

      if (bio !== user?.bio) {
        updates.bio = bio;
      }

      if (availability !== user?.availability) {
        updates.availability = availability;
      }

      if (trimmed !== (user?.linkedin_url || "")) {
        updates.linkedin_url = trimmed || null;
        updates.linkedin_connected = trimmed ? true : user?.linkedin_connected;
      }

      const skillsChanged = !user?.skills ||
        localSkills.length !== user.skills.length ||
        !localSkills.every(s => user.skills.includes(s));
      if (skillsChanged) {
        updates.skills = localSkills;
      }

      if (Object.keys(updates).length > 0) {
        await updateUser(updates);
      }

      if (user?.id) {
        const { error: deleteErr } = await supabase.from("user_domains").delete().eq("user_id", user.id);
        if (deleteErr) throw deleteErr;

        if (localDomains.length > 0) {
          const domainRows = localDomains.map((d) => ({
            user_id: user.id,
            domain: d,
          }));
          console.log("auth uid", user.id);
          console.log("insert payload", domainRows);
          const { error: domainInsertErr } = await supabase
            .from("user_domains")
            .insert(domainRows);
          if (domainInsertErr) throw domainInsertErr;
        }
      }

      await reloadProfile();
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save profile.");
    }
  };

  const handleSaveCardLinkedIn = async () => {
    const trimmed = linkedinUrlField.trim();
    if (trimmed && !trimmed.startsWith("https://www.linkedin.com/in/")) {
      toast.error("Please enter a valid LinkedIn public profile URL");
      return;
    }

    try {
      await updateUser({
        linkedin_url: trimmed || null,
        linkedin_connected: trimmed ? true : user?.linkedin_connected,
      });
      toast.success("LinkedIn URL updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update LinkedIn URL.");
    }
  };

  const handleGitHubConnect = (stats: any) => {
    const ghSkills = stats.languages ? Object.keys(stats.languages).slice(0, 4) : [];
    const existingSkills = user?.skills || [];
    const merged = [...new Set([...existingSkills, ...ghSkills])];
    updateUser({
      skills: merged,
      trustScore: Math.min((user?.trustScore || 60) + 15, 100),
      github: `https://github.com/${stats.github_username}`,
    });
    toast.success(`GitHub connected! Trust Score +15% 🎉`);
  };

  const handleGitHubDisconnect = () => {
    // Handled internally in GitHubAnalyticsCard, no local state update required.
  };

  const topLanguages = useMemo(() => {
    if (!githubStats?.languages) return [];
    return Object.entries(githubStats.languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => ({
        name,
        color: getLangColor(name),
      }));
  }, [githubStats?.languages]);

  return (
    <div className="p-6 lg:p-8 pb-20 max-w-5xl">
      {/* Profile Header */}
      <div
        className="relative rounded-3xl overflow-hidden mb-6"
        style={{
          background: "linear-gradient(135deg, rgba(124,92,255,0.15), rgba(79,124,255,0.1))",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Banner */}
        <div
          className="h-32"
          style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.3), rgba(79,124,255,0.2), rgba(34,197,94,0.1))" }}
        />
        <div className="px-8 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative group">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-20 h-20 rounded-full overflow-hidden border-4 cursor-pointer relative group/avatar transition-all hover:brightness-95"
                style={{ borderColor: "#06070B", background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover animate-fade-in" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                
                {/* Camera icon overlay */}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <Camera size={18} className="text-white" />
                  <span className="text-[7px] text-white font-600 mt-0.5 uppercase tracking-wider">Change</span>
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onChange={handleAvatarUpload}
              />
              
              {/* Online indicator */}
              <div
                className="absolute top-0 right-0 w-5 h-5 rounded-full flex items-center justify-center border-2"
                style={{ background: "#22C55E", borderColor: "#06070B" }}
                title="Online"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {user?.avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="px-3 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 text-xs font-600 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Remove Photo
                </button>
              )}
              <button
                onClick={() => setEditing(!editing)}
                className="hack-btn-secondary text-sm py-2"
              >
                <Edit2 size={14} />
                {editing ? "Cancel" : "Edit Profile"}
              </button>
              {editing && (
                <button onClick={handleSave} className="hack-btn-primary text-sm py-2">
                  Save Changes
                </button>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2.5 max-w-sm">
                  <div>
                    <label className="block text-white/40 text-[9px] mb-1 font-600 uppercase tracking-widest">Display Name</label>
                    <input
                      type="text"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      placeholder="e.g. Alex Singh"
                      className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white font-700 text-sm focus:outline-none focus:border-[#7C5CFF] w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 text-[9px] mb-1 font-600 uppercase tracking-widest">Professional Role</label>
                    <input
                      type="text"
                      value={localRole}
                      onChange={(e) => setLocalRole(e.target.value)}
                      placeholder="e.g. Full Stack Developer"
                      className="bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white/80 text-xs focus:outline-none focus:border-[#7C5CFF] w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 text-[9px] mb-1 font-600 uppercase tracking-widest">Location</label>
                    <input
                      type="text"
                      value={localLocation}
                      onChange={(e) => setLocalLocation(e.target.value)}
                      placeholder="e.g. Bangalore, India"
                      className="bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white/70 text-xs focus:outline-none focus:border-[#7C5CFF] w-full"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-white font-700 text-2xl mb-1">{user?.name || "Alex Singh"}</h1>
                  <div className="text-white/50 text-sm mb-2">{user?.role || "Full Stack Developer"}</div>
                  
                  {/* Bio Area */}
                  <div className="mt-2.5 mb-3.5">
                    {editingBio ? (
                      <div className="space-y-2 max-w-md">
                        <div className="relative">
                          <textarea
                            value={tempBio}
                            onChange={(e) => setTempBio(e.target.value.slice(0, 250))}
                            placeholder="Write a short bio (max 250 characters)..."
                            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white/90 text-xs focus:outline-none focus:border-[#7C5CFF] w-full resize-none pr-16"
                            rows={3}
                          />
                          <span className="absolute bottom-2 right-2 text-[9px] text-white/30 font-500">
                            {tempBio.length}/250
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveBio}
                            disabled={savingBio}
                            className="hack-btn-primary py-1 px-3 text-[10px] flex items-center gap-1"
                          >
                            {savingBio ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setTempBio(user?.bio || "");
                              setEditingBio(false);
                            }}
                            disabled={savingBio}
                            className="text-white/40 text-[10px] hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleGenerateAIBio}
                            disabled={generatingBio}
                            className="ml-auto flex items-center gap-1 py-1 px-2.5 rounded-lg text-[9px] font-600 bg-[#7C5CFF]/10 text-[#A78BFF] border border-[#7C5CFF]/20 hover:bg-[#7C5CFF]/20 transition-all"
                          >
                            {generatingBio ? (
                              <>
                                <Loader2 size={10} className="animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles size={10} />
                                Generate with AI
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : user?.bio ? (
                      <div className="flex items-start gap-2 group max-w-lg">
                        <p className="text-white/70 text-xs italic leading-normal">"{user.bio}"</p>
                        <button
                          onClick={() => {
                            setTempBio(user.bio || "");
                            setEditingBio(true);
                          }}
                          className="text-white/30 hover:text-[#A78BFF] opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          title="Edit Bio"
                        >
                          <Edit2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setTempBio("");
                          setEditingBio(true);
                        }}
                        className="flex items-center gap-1 text-[11px] font-600 text-[#A78BFF] hover:text-[#C1B0FF] transition-all bg-[#7C5CFF]/5 border border-[#7C5CFF]/10 py-1 px-2.5 rounded-lg"
                      >
                        <Plus size={10} />
                        Add Bio
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-white/40 text-xs">
                    <span className="flex items-center gap-1"><MapPin size={12} />{user?.location || "Bangalore, India"}</span>
                    <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400" />{user?.rating || 4.9} Rating</span>
                    {user?.github_connected && user?.github_username && (
                      <a
                        href={githubProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-white/60 transition-colors"
                      >
                        <Github size={12} />@{user?.github_username}
                        <ExternalLink size={9} />
                      </a>
                    )}
                    {user?.linkedin_connected && (
                      linkedinProfile ? (
                        <a
                          href={linkedinProfile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-white/60 transition-colors text-hack-blue"
                        >
                          <Linkedin size={12} className="text-[#0A66C2]" />
                          {user?.linkedin_name || "LinkedIn"}
                          <ExternalLink size={9} />
                        </a>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-1 text-white/30 cursor-not-allowed bg-transparent border-none p-0"
                          title="Public LinkedIn URL unavailable"
                        >
                          <Linkedin size={12} className="text-white/20" />
                          Public LinkedIn URL unavailable
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {user?.github_connected && (
                  <span className="skill-tag text-xs">GitHub Verified</span>
                )}
                {user?.linkedin_connected && (
                  <span className="skill-tag text-xs">LinkedIn Verified</span>
                )}
                {user?.badges?.map((badge) => (
                  <span key={badge} className="skill-tag text-xs">{badge}</span>
                ))}
              </div>
            </div>
            <TrustRing score={user?.trustScore || 0} user={user} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* About */}
          <div className="hack-card p-5">
            <h3 className="text-white font-700 text-sm mb-3.5">About</h3>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-[10px] mb-1.5 font-500 uppercase tracking-wider">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="hack-input text-xs resize-none"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-[10px] mb-1.5 font-500 uppercase tracking-wider">LinkedIn Public Profile URL</label>
                  <input
                    type="text"
                    value={linkedinUrlField}
                    onChange={(e) => handleLinkedInUrlChange(e.target.value)}
                    placeholder="https://www.linkedin.com/in/your-profile-slug/"
                    className="hack-input text-xs"
                  />
                  {linkedinUrlError && (
                    <p className="text-hack-red text-[10px] mt-1">{linkedinUrlError}</p>
                  )}
                  <p className="text-white/30 text-[9px] mt-1 leading-normal">
                    Paste your public LinkedIn profile URL. Example: https://www.linkedin.com/in/john-doe-123456/
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-white/60 leading-relaxed">{user?.bio || "No bio set."}</p>
                <div className="space-y-2 pt-3 border-t border-white/[0.04]">
                  {user?.role && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">Role</span>
                      <span className="text-white font-500">{user.role}</span>
                    </div>
                  )}
                  {user?.college && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">College</span>
                      <span className="text-white font-500 text-right truncate max-w-[150px]">{user.college}</span>
                    </div>
                  )}
                  {user?.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">Location</span>
                      <span className="text-white font-500">{user.location}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="hack-card p-5">
            <h3 className="text-white font-700 text-sm mb-3">Availability</h3>
            {editing ? (
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as 'available' | 'open' | 'busy' | 'unavailable')}
                className="hack-input text-sm"
              >
                {["available", "open", "busy", "unavailable"].map((v) => (
                  <option key={v} value={v} style={{ background: "#131826" }}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: availability === "available" ? "#22C55E" : availability === "open" ? "#4F7CFF" : "#F59E0B" }}
                />
                <span className="text-white text-sm font-500 capitalize">
                  {availability === "available" ? "Available for Teams" : availability === "open" ? "Open to Opportunities" : "Busy"}
                </span>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="hack-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-700 text-sm">Skills</h3>
            </div>
            {editing ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto p-1.5 border border-white/[0.06] bg-white/[0.01] rounded-lg">
                  {localSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 text-xs rounded-md bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 text-white flex items-center gap-1"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => setLocalSkills(localSkills.filter(s => s !== skill))}
                        className="text-white/60 hover:text-white text-[10px] font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {localSkills.length === 0 && (
                    <span className="text-white/30 text-[10px] p-1">No skills added yet</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a skill..."
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:border-hack-primary/40"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1 bg-[#7C5CFF] hover:bg-[#6C4CFF] text-white rounded-lg text-xs font-600 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="w-full text-xs py-1.5 px-3 mb-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white placeholder-white/30 focus:outline-none focus:border-hack-primary/40 transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {(user?.skills || [])
                    .filter((skill) => skill.toLowerCase().includes(skillSearch.toLowerCase()))
                    .map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/80 hover:bg-white/[0.04] transition-all hover:text-white"
                      >
                        {skill}
                      </span>
                    ))}
                  {topLanguages
                    .filter((lang) => !user?.skills?.includes(lang.name))
                    .filter((lang) => lang.name.toLowerCase().includes(skillSearch.toLowerCase()))
                    .map((lang) => (
                      <span
                        key={lang.name}
                        className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/80 hover:bg-white/[0.04] transition-all hover:text-white flex items-center gap-1.5"
                        style={{ borderColor: `${lang.color}40`, color: lang.color }}
                      >
                        {lang.name}
                        <span className="text-[8px] opacity-60">GitHub</span>
                      </span>
                    ))}
                </div>
              </>
            )}
          </div>

          {/* Domains of Interest */}
          <div className="hack-card p-5">
            <h3 className="text-white font-700 text-sm mb-3.5">Domains of Interest</h3>
            {editing ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto p-1.5 border border-white/[0.06] bg-white/[0.01] rounded-lg">
                  {localDomains.map((domain) => (
                    <span
                      key={domain}
                      className="px-2 py-0.5 text-xs rounded-md bg-[#4F7CFF]/15 border border-[#4F7CFF]/30 text-white flex items-center gap-1"
                    >
                      {domain}
                      <button
                        type="button"
                        onClick={() => setLocalDomains(localDomains.filter(d => d !== domain))}
                        className="text-white/60 hover:text-white text-[10px] font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {localDomains.length === 0 && (
                    <span className="text-white/30 text-[10px] p-1">No domains added yet</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a domain..."
                    value={newDomainInput}
                    onChange={(e) => setNewDomainInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDomain();
                      }
                    }}
                    className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:border-hack-primary/40"
                  />
                  <button
                    type="button"
                    onClick={handleAddDomain}
                    className="px-3 py-1 bg-[#4F7CFF] hover:bg-[#4F7CFF]/80 text-white rounded-lg text-xs font-600 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(user?.domains && user.domains.length > 0) ? (
                  user.domains.map((domain) => {
                    const colors = [
                      { border: "rgba(124,92,255,0.3)", text: "#A78BFF", bg: "rgba(124,92,255,0.06)" },
                      { border: "rgba(79,124,255,0.3)", text: "#4F7CFF", bg: "rgba(79,124,255,0.06)" },
                      { border: "rgba(34,197,94,0.3)", text: "#22C55E", bg: "rgba(34,197,94,0.06)" },
                      { border: "rgba(245,158,11,0.3)", text: "#F59E0B", bg: "rgba(245,158,11,0.06)" },
                      { border: "rgba(239,68,68,0.3)", text: "#EF4444", bg: "rgba(239,68,68,0.06)" },
                    ];
                    const charCodeSum = domain.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const colorScheme = colors[charCodeSum % colors.length];

                    return (
                      <span
                        key={domain}
                        className="px-2.5 py-1 text-xs font-500 rounded-lg border transition-all"
                        style={{
                          borderColor: colorScheme.border,
                          color: colorScheme.text,
                          background: colorScheme.bg,
                        }}
                      >
                        {domain}
                      </span>
                    );
                  })
                ) : (
                  <div className="text-white/30 text-xs">No domains listed. Upload resume to parse.</div>
                )}
              </div>
            )}
          </div>

          {/* Connected Accounts */}
          <div className="space-y-4">
            <h3 className="text-white font-700 text-sm">Connected Accounts</h3>
            <div className="grid grid-cols-1 gap-4">
              
              {/* CARD 1: GitHub */}
              {user?.github_connected ? (
                githubStatsLoading || githubStatsSyncing ? (
                  <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg animate-pulse h-[220px] flex flex-col justify-between">
                    {/* Header Skeleton */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/10" />
                        <div className="space-y-1.5">
                          <div className="w-12 h-3 bg-white/10 rounded" />
                          <div className="w-20 h-2 bg-white/5 rounded" />
                        </div>
                      </div>
                      <div className="w-16 h-4 bg-white/10 rounded-full" />
                    </div>

                    {/* Avatar Skeleton */}
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <div className="w-10 h-10 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-1.5">
                        <div className="w-24 h-3 bg-white/10 rounded" />
                        <div className="w-16 h-2 bg-white/5 rounded" />
                      </div>
                    </div>

                    {/* Stats Grid Skeleton */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-white/5">
                      <div className="w-16 h-3 bg-white/10 rounded" />
                      <div className="w-20 h-3 bg-white/10 rounded" />
                      <div className="w-24 h-3 bg-white/10 rounded" />
                      <div className="w-14 h-3 bg-white/10 rounded" />
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 p-5 shadow-lg flex flex-col justify-between h-[220px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                          <Github size={16} className="text-white" />
                        </div>
                        <div>
                          <h4 className="text-white text-xs font-600">GitHub</h4>
                          <p className="text-white/40 text-[9px]">Developer Analytics</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const toastId = toast.loading("Syncing GitHub stats...");
                            try {
                              await syncStats();
                              toast.success("GitHub stats synced! 🚀", { id: toastId });
                            } catch (err: any) {
                              toast.error(err?.message || "Failed to sync GitHub stats", { id: toastId });
                            }
                          }}
                          disabled={githubStatsSyncing}
                          className="p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
                          title="Sync GitHub Stats"
                        >
                          <RefreshCw size={11} className={githubStatsSyncing ? "animate-spin" : ""} />
                        </button>
                        <span className="text-[9px] font-600 px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          Connected
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmDisconnectProvider("github")}
                          className="text-[9px] font-600 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <img
                        src={user?.github_avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=github"}
                        alt={user?.github_username || "GitHub avatar"}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-600 truncate">
                          {user?.github_username || "Connected Developer"}
                        </div>
                        {githubProfile && (
                          <a
                            href={githubProfile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-hack-primary text-[10px] hover:underline flex items-center gap-0.5 truncate"
                          >
                            @{user?.github_username || "profile"}
                            <ExternalLink size={8} />
                          </a>
                        )}
                        {user?.github_connected_at && (
                          <div className="text-white/30 text-[9px] mt-0.5">
                            Connected Since: {new Date(user.github_connected_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* GitHub stats micro-grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-white/5">
                      <div className="text-white/60 text-xs">
                        Public Repos: <span className="text-white font-600">{githubStats?.public_repos ?? 0}</span>
                      </div>
                      <div className="text-white/60 text-xs">
                        Total Commits: <span className="text-white font-600">{githubStats?.total_commits ?? 0}</span>
                      </div>
                      <div className="text-white/60 text-xs">
                        Active Days: <span className="text-white font-600">{githubStats?.active_days ?? 0}</span>
                      </div>
                      <div className="text-white/60 text-xs">
                        Score: <span className="text-white font-600">{githubStats?.score ?? 0}/100</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 p-5 shadow-lg flex flex-col justify-between h-[220px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                      <Github size={16} className="text-white/40" />
                    </div>
                    <div>
                      <h4 className="text-white/70 text-xs font-600">GitHub</h4>
                      <p className="text-white/35 text-[9px]">Not Connected</p>
                    </div>
                  </div>
                  
                  <p className="text-white/45 text-[11px] leading-relaxed">
                    Connect GitHub to parse repositories, analyze language distributions, and build rank metrics.
                  </p>
                  
                  <button
                    onClick={async () => {
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
                        toast.error(err?.message || "Failed to trigger GitHub OAuth");
                      }
                    }}
                    className="w-full text-center text-xs font-600 py-2.5 rounded-xl transition-all border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    Connect GitHub
                  </button>
                </div>
              )}

              {/* CARD 2: LinkedIn */}
              {user?.linkedin_connected ? (
                <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 p-5 shadow-lg flex flex-col justify-between min-h-[220px] gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0A66C2]/10 border border-[#0A66C2]/20">
                        <Linkedin size={16} className="text-[#0A66C2]" />
                      </div>
                      <div>
                        <h4 className="text-white text-xs font-600">LinkedIn</h4>
                        <p className="text-white/45 text-[9px]">Professional Profile</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-600 px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Connected
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmDisconnectProvider("linkedin")}
                        className="text-[9px] font-600 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                    <img
                      src={user?.linkedin_avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=linkedin"}
                      alt={user?.linkedin_name || "LinkedIn avatar"}
                      className="w-10 h-10 rounded-full object-cover border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-600 truncate">
                        {user?.linkedin_name || "Connected Builder"}
                      </div>
                      {linkedinProfile ? (
                        <a
                          href={linkedinProfile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-hack-primary text-[10px] hover:underline flex items-center gap-0.5 truncate"
                        >
                          View LinkedIn Profile
                          <ExternalLink size={8} />
                        </a>
                      ) : (
                        <button
                          disabled
                          className="text-white/30 text-[10px] flex items-center gap-0.5 cursor-not-allowed bg-transparent border-none p-0 text-left"
                        >
                          Public LinkedIn URL unavailable
                        </button>
                      )}
                      {user?.linkedin_connected_at && (
                        <div className="text-white/30 text-[9px] mt-0.5">
                          Connected Since: {new Date(user.linkedin_connected_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LinkedIn Public Profile URL Input box */}
                  <div className="pt-2 border-t border-white/5 space-y-1">
                    <label className="block text-white/50 text-[9px]">LinkedIn Public Profile URL</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={linkedinUrlField}
                        onChange={(e) => handleLinkedInUrlChange(e.target.value)}
                        placeholder="https://www.linkedin.com/in/your-profile-slug/"
                        className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-lg px-2 py-1 text-[10px] text-white placeholder-white/30 focus:outline-none focus:border-hack-primary/40"
                      />
                      {linkedinUrlField.trim() !== (user?.linkedin_url || "") && (
                        <button
                          onClick={handleSaveCardLinkedIn}
                          className="px-2.5 py-1 bg-hack-primary hover:bg-hack-primary/80 text-white rounded-lg text-[9px] font-600 transition-all flex-shrink-0"
                        >
                          Save
                        </button>
                      )}
                    </div>
                    {linkedinUrlError && (
                      <p className="text-hack-red text-[8px] mt-0.5">{linkedinUrlError}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 p-5 shadow-lg flex flex-col justify-between h-[220px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                      <Linkedin size={16} className="text-white/40" />
                    </div>
                    <div>
                      <h4 className="text-white/70 text-xs font-600">LinkedIn</h4>
                      <p className="text-white/35 text-[9px]">Not Connected</p>
                    </div>
                  </div>
                  
                  <p className="text-white/45 text-[11px] leading-relaxed">
                    Connect LinkedIn to sync your educational history, work experience, and highlight your professional background.
                  </p>
                  
                  <button
                    disabled={linkingLinkedIn}
                    onClick={async () => {
                      try {
                        await connectLinkedIn(window.location.pathname);
                      } catch (err: any) {
                        toast.error(err?.message || "Unable to connect LinkedIn");
                      }
                    }}
                    className="w-full text-center text-xs font-600 py-2.5 rounded-xl transition-all border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    {linkingLinkedIn ? "Connecting..." : "Connect LinkedIn"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Columns */}
        <div className="lg:col-span-2 space-y-5">
          {/* Resume Upload Card */}
          <div className="hack-card p-6 relative overflow-hidden bg-white/[0.01] border border-white/[0.06] rounded-xl hover:border-white/[0.1] transition-all">
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#7C5CFF]/10 border border-[#7C5CFF]/20">
                <FileText size={16} className="text-[#A78BFF]" />
              </div>
              <div>
                <h4 className="text-white text-xs font-700">Resume Parser</h4>
                <p className="text-white/40 text-[9px]">Upload PDF, DOC, or DOCX to auto-prefill and sync profile</p>
              </div>
            </div>

            {resumeLoadingStep ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="w-8 h-8 text-[#A78BFF] animate-spin" />
                <p className="text-white text-xs font-500">
                  {resumeLoadingStep === "parsing" && "Parsing Resume..."}
                  {resumeLoadingStep === "uploading" && "Uploading..."}
                  {resumeLoadingStep === "saving" && "Saving Profile Data..."}
                </p>
              </div>
            ) : user?.resume ? (
              <div className="w-full space-y-4">
                <div className="flex items-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-600 bg-green-500/10 text-green-400 border border-green-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Resume Uploaded Successfully
                  </span>
                </div>
                {/* Prominent File Display */}
                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 flex-shrink-0">
                    <FileText size={24} className="text-[#A78BFF]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-700 truncate" title={user?.resume?.file_name}>
                      {user?.resume?.file_name}
                    </p>
                    <p className="text-white/40 text-[10px] mt-0.5">
                      Uploaded on {user?.resume?.uploaded_at ? new Date(user.resume.uploaded_at).toLocaleDateString() : ""} at {user?.resume?.uploaded_at ? new Date(user.resume.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={user?.resume?.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[80px] text-center py-2 px-3 rounded-xl text-xs font-600 bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={12} />
                    View
                  </a>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-w-[80px] text-center py-2 px-3 rounded-xl text-xs font-600 bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Upload size={12} />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveResume}
                    className="flex-1 min-w-[80px] text-center py-2 px-3 rounded-xl text-xs font-600 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleResumeUpload(file);
                      e.target.value = "";
                    }
                  }}
                />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) await handleResumeUpload(file);
                }}
                className="cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-all duration-300 bg-white/[0.01] hover:bg-white/[0.02] flex flex-col items-center justify-center gap-2"
                style={{
                  borderColor: dragging ? "#7C5CFF" : "rgba(255, 255, 255, 0.08)",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleResumeUpload(file);
                  }}
                />
                <Upload className="w-6 h-6 text-white/40" />
                <p className="text-white/70 text-xs font-600">Drag & drop your resume here, or click to upload</p>
                <p className="text-white/30 text-[9px]">PDF, DOC, DOCX — Max 10MB</p>
              </div>
            )}
          </div>

          {/* ── REAL GitHub Analytics Card ── */}
          <GitHubAnalyticsCard
            onConnect={handleGitHubConnect}
            onDisconnect={handleGitHubDisconnect}
          />

          {/* Experience */}
          <div className="hack-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-hack-primary" />
                <h3 className="text-white font-700">Experience</h3>
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={handleOpenAddExp}
                  className="p-1 text-hack-primary hover:text-hack-primary/80 hover:bg-white/5 rounded-lg transition-all flex items-center gap-1 text-xs font-600"
                  title="Add Experience"
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
            
            <div className="relative border-l border-white/[0.08] ml-3.5 pl-6 space-y-6">
              {(user?.experiences && user.experiences.length > 0) ? (
                user.experiences.map((exp, i) => (
                  <div key={exp.id || i} className="relative group">
                    {/* Circle timeline dot */}
                    <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-hack-primary bg-[#0E111B] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-hack-primary" />
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-600 text-sm">{exp.title}</div>
                        <div className="flex items-center gap-2 text-hack-primary text-xs mt-0.5 font-500">
                          <span>{exp.company}</span>
                          {exp.period && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/30" />
                              <span className="text-white/40">{exp.period}</span>
                            </>
                          )}
                        </div>
                        {exp.description && (
                          <p className="text-white/50 text-xs mt-2 leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                      {editing && (
                        <div className="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditExp(exp)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 hover:text-white transition-all text-white/60"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExp(exp.id)}
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 hover:text-red-400 transition-all text-red-500/60"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/30 text-xs pl-2">No experience listed. Upload resume or add manually.</div>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="hack-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap size={16} className="text-hack-blue" />
                <h3 className="text-white font-700">Education</h3>
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={handleOpenAddEdu}
                  className="p-1 text-hack-blue hover:text-hack-blue/80 hover:bg-white/5 rounded-lg transition-all flex items-center gap-1 text-xs font-600"
                  title="Add Education"
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(user?.education && user.education.length > 0) ? (
                user.education.map((edu, i) => (
                  <div
                    key={edu.id || i}
                    className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] flex justify-between gap-3.5 hover:border-white/[0.1] transition-all group"
                  >
                    <div className="flex gap-3.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-hack-blue/10 border border-hack-blue/20 flex-shrink-0 mt-0.5">
                        <GraduationCap size={14} className="text-hack-blue" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-600 text-sm truncate">{edu.degree}</div>
                        <div className="text-white/60 text-xs mt-0.5 truncate">{edu.institution}</div>
                        {edu.field_of_study && (
                          <div className="text-white/40 text-[10px] mt-1">{edu.field_of_study}</div>
                        )}
                        {(edu.start_year || edu.end_year) && (
                          <div className="text-white/30 text-[9px] mt-1">
                            {edu.start_year || "?"} – {edu.end_year || "?"}
                          </div>
                        )}
                      </div>
                    </div>
                    {editing && (
                      <div className="flex flex-col gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0 justify-start">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEdu(edu)}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 hover:text-white transition-all text-white/60"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEdu(edu.id)}
                          className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 hover:text-red-400 transition-all text-red-500/60"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-white/30 text-xs col-span-2">No education history listed. Upload resume or add manually.</div>
              )}
            </div>
          </div>

          {/* Projects */}
          <div className="hack-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code size={16} className="text-hack-green" />
                <h3 className="text-white font-700">Projects</h3>
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={handleOpenAddProj}
                  className="p-1 text-hack-green hover:text-hack-green/80 hover:bg-white/5 rounded-lg transition-all flex items-center gap-1 text-xs font-600"
                  title="Add Project"
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(user?.projects && user.projects.length > 0) ? (
                user.projects.map((proj, i) => (
                  <div
                    key={proj.id || i}
                    className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-white/[0.1] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h4 className="text-white font-600 text-sm">{proj.title}</h4>
                        {editing && (
                          <div className="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProj(proj)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 hover:text-white transition-all text-white/60"
                              title="Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProj(proj.id)}
                              className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 hover:text-red-400 transition-all text-red-500/60"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-white/50 text-xs leading-relaxed mb-4">
                          {proj.description}
                        </p>
                      )}
                      {proj.tech_stack && proj.tech_stack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {proj.tech_stack.map((tech) => (
                            <span
                              key={tech}
                              className="px-2 py-0.5 text-[9px] rounded-md bg-white/[0.03] border border-white/[0.06] text-white/60"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/[0.03]">
                      {proj.github_url && (
                        <a
                          href={proj.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-1.5 px-3 rounded-lg text-[10px] font-600 bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
                        >
                          <Github size={10} />
                          GitHub
                        </a>
                      )}
                      {proj.live_url && (
                        <a
                          href={proj.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-1.5 px-3 rounded-lg text-[10px] font-600 bg-hack-primary text-white hover:bg-hack-primary/90 transition-all flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink size={10} />
                          Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/30 text-xs col-span-2">No projects listed. Upload resume or add manually.</div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                  } else {
                    await disconnectLinkedIn();
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

      {/* Manual Education Modal */}
      {showEduModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: "#0E111B",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3 className="text-white font-700 text-lg mb-4">
              {eduId ? "Edit Education" : "Add Education"}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Degree <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={eduDegree}
                  onChange={(e) => setEduDegree(e.target.value)}
                  placeholder="e.g. Bachelor of Technology"
                  className="hack-input text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Institution <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={eduInstitution}
                  onChange={(e) => setEduInstitution(e.target.value)}
                  placeholder="e.g. Indian Institute of Technology"
                  className="hack-input text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Field of Study
                </label>
                <input
                  type="text"
                  value={eduField}
                  onChange={(e) => setEduField(e.target.value)}
                  placeholder="e.g. Computer Science and Engineering"
                  className="hack-input text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                    Start Year
                  </label>
                  <input
                    type="text"
                    value={eduStart}
                    onChange={(e) => setEduStart(e.target.value)}
                    placeholder="e.g. 2020"
                    className="hack-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                    End Year (or Expected)
                  </label>
                  <input
                    type="text"
                    value={eduEnd}
                    onChange={(e) => setEduEnd(e.target.value)}
                    placeholder="e.g. 2024"
                    className="hack-input text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowEduModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-600 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdu}
                className="px-4 py-2 rounded-xl text-xs font-600 bg-[#7C5CFF] text-white hover:bg-[#6C4CFF] transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Experience Modal */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: "#0E111B",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3 className="text-white font-700 text-lg mb-4">
              {expId ? "Edit Experience" : "Add Experience"}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Frontend Engineer"
                  className="hack-input text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expCompany}
                  onChange={(e) => setExpCompany(e.target.value)}
                  placeholder="e.g. Google"
                  className="hack-input text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Period
                </label>
                <input
                  type="text"
                  value={expPeriod}
                  onChange={(e) => setExpPeriod(e.target.value)}
                  placeholder="e.g. Jan 2022 - Present or 2021 - 2023"
                  className="hack-input text-xs"
                />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Describe your achievements and responsibilities..."
                  className="hack-input text-xs resize-none"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowExpModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-600 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExp}
                className="px-4 py-2 rounded-xl text-xs font-600 bg-[#7C5CFF] text-white hover:bg-[#6C4CFF] transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Project Modal */}
      {showProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: "#0E111B",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3 className="text-white font-700 text-lg mb-4">
              {projId ? "Edit Project" : "Add Project"}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="e.g. HackOS"
                  className="hack-input text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={projDescription}
                  onChange={(e) => setProjDescription(e.target.value)}
                  placeholder="A brief explanation of the project..."
                  className="hack-input text-xs resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Tech Stack (comma-separated)
                </label>
                <input
                  type="text"
                  value={projTechStack}
                  onChange={(e) => setProjTechStack(e.target.value)}
                  placeholder="e.g. React, TypeScript, Supabase"
                  className="hack-input text-xs"
                />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  value={projGithubUrl}
                  onChange={(e) => setProjGithubUrl(e.target.value)}
                  placeholder="e.g. https://github.com/username/project"
                  className="hack-input text-xs"
                />
              </div>
              <div>
                <label className="block text-white/60 text-[10px] mb-1 font-500 uppercase tracking-wider">
                  Live Demo URL
                </label>
                <input
                  type="text"
                  value={projLiveUrl}
                  onChange={(e) => setProjLiveUrl(e.target.value)}
                  placeholder="e.g. https://project.demo"
                  className="hack-input text-xs"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowProjModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-600 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProj}
                className="px-4 py-2 rounded-xl text-xs font-600 bg-[#7C5CFF] text-white hover:bg-[#6C4CFF] transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
