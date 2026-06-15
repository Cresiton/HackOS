import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Users, User, Trophy, Calendar, Clock, ArrowRight, ArrowLeft,
  CheckCircle, Plus, Trash2, Edit, Sparkles, Search, UserPlus, Loader2
} from "lucide-react";
import { Hackathon, Teammate } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { deserializeHackathon } from "@/lib/utils";

interface RequiredRole {
  role: string;
  qty: number;
  skills: string[];
}

import { Github, Linkedin } from "lucide-react";

const AVAILABLE_ROLES = [
  "AI Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "ML Engineer",
  "UI/UX Designer",
  "Blockchain Developer",
  "DevOps Engineer",
  "Product Manager"
];

export default function RegisterHackathon() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [hack, setHack] = useState<Hackathon | null>(null);
  const [loadingHack, setLoadingHack] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  // Steps state
  const [currentStep, setCurrentStep] = useState(1);

  // Form Step 1: Participant Info (prefilled from profile)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [experience, setExperience] = useState("First hackathon");
  const [whyJoin, setWhyJoin] = useState("");

  // Form Step 2: Mode Selection
  const [registrationMode, setRegistrationMode] = useState<"individual" | "team">("individual");

  // Form Step 3: Team Configuration (If Team chosen)
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [requiredRoles, setRequiredRoles] = useState<RequiredRole[]>([
    { role: "Frontend Developer", qty: 1, skills: ["React", "TypeScript", "CSS"] },
    { role: "Backend Developer", qty: 1, skills: ["Node.js", "PostgreSQL", "Supabase"] }
  ]);
  const [showAddCustomRole, setShowAddCustomRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleSkills, setCustomRoleSkills] = useState("");

  // Step 3 (Cont.): Member Selection & Roles Assignment
  const [allProfiles, setAllProfiles] = useState<Teammate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [invitedMembers, setInvitedMembers] = useState<{ userId: string; name: string; avatar: string; role: string; message: string }[]>([]);

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill user information once loaded
  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      setEmail(user.email || "");
      setCollege(user.college || "");
      setPhone("");
    }
  }, [user]);

  // Load Hackathon & Check existing registration
  useEffect(() => {
    if (!id) return;
    async function loadData() {
      try {
        setLoadingHack(true);
        // Load hackathon details
        const { data: hackData, error: hackError } = await supabase
          .from("hackathons")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (hackError) throw hackError;
        if (hackData) {
          const deserialized = deserializeHackathon(hackData);
          setHack(deserialized);
          // Auto-select team registration if minimum size >= 2
          if (deserialized.team_size_min && deserialized.team_size_min >= 2) {
            setRegistrationMode("team");
          }
        }

        // Check user registration
        if (user) {
          const { data: reg } = await supabase
            .from("registrations")
            .select("id")
            .eq("hackathon_id", id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (reg) {
            setIsRegistered(true);
          }
        }

        // Load profiles for builder invite search
        const { data: profiles, error: pError } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", user.id);
        if (pError) throw pError;

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

        const formattedProfiles = (profiles || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          role: p.role || "Full Stack Developer",
          location: p.location || "Online",
          skills: userSkillsMap[p.id] || [],
          rating: Number(p.rating) || 5.0,
          matchScore: 80,
          isOnline: true,
          avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
          college: p.college || "",
          trustScore: p.trust_score || 0,
          email: p.email,
          github_username: p.github_username,
          github_connected: !!p.github_connected,
          linkedin_connected: !!p.linkedin_connected,
          linkedin_url: p.linkedin_url
        }));

        setAllProfiles(formattedProfiles);

      } catch (err) {
        console.error("Error loading hackathon registration info:", err);
      } finally {
        setLoadingHack(false);
      }
    }
    loadData();
  }, [id, user]);

  const handleAddCustomRole = () => {
    if (!customRoleName.trim()) return;
    const skillsArr = customRoleSkills.split(",").map(s => s.trim()).filter(Boolean);
    setRequiredRoles([...requiredRoles, { role: customRoleName.trim(), qty: 1, skills: skillsArr }]);
    setCustomRoleName("");
    setCustomRoleSkills("");
    setShowAddCustomRole(false);
  };

  const handleRemoveRole = (idx: number) => {
    setRequiredRoles(requiredRoles.filter((_, i) => i !== idx));
  };

  const handleInviteToggle = (candidate: Teammate) => {
    const alreadyInvited = invitedMembers.find(m => m.userId === candidate.id);
    if (alreadyInvited) {
      setInvitedMembers(invitedMembers.filter(m => m.userId !== candidate.id));
    } else {
      const defaultRole = "Full Stack Developer";
      setInvitedMembers([...invitedMembers, {
        userId: candidate.id,
        name: candidate.name,
        avatar: candidate.avatar || "",
        role: defaultRole,
        message: `Hi! We loved your profile and would love to build together at ${hack?.title}.`
      }]);
    }
  };

  const handleUpdateInvitedRole = (userId: string, role: string) => {
    setInvitedMembers(invitedMembers.map(m => m.userId === userId ? { ...m, role } : m));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!fullName.trim() || !email.trim() || !college.trim()) {
        toast.error("Please fill in all required participant details.");
        return;
      }
      if (hack?.team_size_min && hack.team_size_min >= 2) {
        setRegistrationMode("team");
        setCurrentStep(3); // skip Step 2
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (registrationMode === "individual") {
        handleFinalSubmission();
      } else {
        setCurrentStep(3);
      }
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      if (currentStep === 3 && hack?.team_size_min && hack.team_size_min >= 2) {
        setCurrentStep(1); // skip Step 2
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const handleFinalSubmission = async () => {
    if (!user || !hack) return;
    setSubmitting(true);
    try {
      let teamId: string | null = null;

      // 1. If team mode, insert team first
      if (registrationMode === "team") {
        if (!teamName.trim()) {
          toast.error("Please specify a team name.");
          setSubmitting(false);
          return;
        }

        const teamMeta = {
          visibility: "public",
          problem_statement: problemStatement.trim(),
          required_roles: requiredRoles,
          creator_id: user.id,
          is_draft: false
        };
        const serializedDescription = `${teamDescription}\n\n---METADATA---\n${JSON.stringify(teamMeta)}`;

        const { data: teamData, error: teamErr } = await supabase
          .from("teams")
          .insert({
            name: teamName.trim(),
            max_members: hack.team_size_max || 4,
            description: serializedDescription,
            hackathon_id: hack.id,
            progress: 0,
            status: "recruiting",
            color: "#7C5CFF",
            icon: "🚀"
          })
          .select("*")
          .single();

        if (teamErr) throw teamErr;
        teamId = teamData.id;

        // Create Leader membership
        const { error: leaderErr } = await supabase
          .from("team_members")
          .insert({
            team_id: teamId,
            user_id: user.id,
            role: "leader"
          });

        if (leaderErr) throw leaderErr;

        // Create Chat conversation room
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            is_team: true,
            team_id: teamId
          })
          .select("id")
          .single();

        if (newConv) {
          await supabase
            .from("conversation_members")
            .insert({
              conversation_id: newConv.id,
              user_id: user.id
            });

          await supabase
            .from("messages")
            .insert({
              conversation_id: newConv.id,
              sender_id: user.id,
              content: `system:${user.name} created the team.`
            });
        }

        // Send team invitations
        if (invitedMembers.length > 0) {
          const invitePayloads = invitedMembers.map(inv => ({
            team_id: teamId,
            sender_id: user.id,
            receiver_id: inv.userId,
            role: inv.role,
            message: inv.message,
            status: "pending",
            request_type: "invite"
          }));

          const { error: inviteErr } = await supabase
            .from("team_requests")
            .insert(invitePayloads);

          if (inviteErr) throw inviteErr;

          // Send Team Invite Notification to DB for each recipient
          for (const inv of invitedMembers) {
            await supabase
              .from("notifications")
              .insert({
                user_id: inv.userId,
                type: "team_invite",
                title: "Team Invitation",
                description: `You have been invited to join Team ${teamName.trim()} for ${hack.title} as a ${inv.role}.`,
                action_url: "/my-requests",
                action_label: "View Request"
              });
          }
        }
      }

      // 2. Save participant registration matching the exact SQL schema columns
      const { error: regErr } = await supabase
        .from("registrations")
        .insert({
          hackathon_id: hack.id,
          user_id: user.id,
          team_id: teamId,
          participation_type: registrationMode,
          role: registrationMode === "individual" ? "Solo Participant" : "Leader"
        });

      if (regErr) throw regErr;

      // Update participant's profile details (college, experience, name) to persist globally
      await supabase
        .from("profiles")
        .update({
          name: fullName.trim(),
          college: college.trim(),
          experience: experience
        })
        .eq("id", user.id);

      // Send Hackathon Registration Notification to DB
      await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          type: "hackathon_registration",
          title: "Hackathon Registration",
          description: `You have successfully registered for ${hack.title}!`,
          action_url: `/hackathon/${hack.id}`,
          action_label: "View Event"
        });

      // Send Notification to Organizer
      let ownerId = null;
      try {
        const parts = (hack.description || "").split("\n\n---METADATA---\n");
        if (parts.length > 1) {
          const meta = JSON.parse(parts[1]);
          ownerId = meta.owner_id;
        }
      } catch (e) {}

      if (ownerId && ownerId !== user.id) {
        await supabase
          .from("notifications")
          .insert({
            user_id: ownerId,
            type: "hackathon_registration",
            title: "New Registration",
            description: `${fullName.trim()} has registered for ${hack.title}.`,
            action_url: "/host-hackathon",
            action_label: "View Dashboard"
          });
      }

      toast.success("Registration completed successfully!");
      navigate(`/hackathon/${hack.id}`);

    } catch (err: any) {
      console.error("Error submitting registration:", err);
      toast.error(err.message || "Failed to complete registration.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingHack) {
    return (
      <div className="min-h-screen bg-hack-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-hack-primary" />
          <p className="text-white/45 text-sm">Loading registration details...</p>
        </div>
      </div>
    );
  }

  if (!hack) {
    return (
      <div className="min-h-screen bg-hack-bg flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-5xl">🔍</div>
        <h2 className="text-white font-700 text-xl">Event Not Found</h2>
        <Link to="/discover" className="hack-btn-primary px-5 py-2 text-xs">Discover Hackathons</Link>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-[70vh] bg-hack-bg flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-hack-green/20 flex items-center justify-center border border-hack-green/30">
          <CheckCircle size={32} className="text-hack-green" />
        </div>
        <h2 className="text-white font-700 text-xl">Already Registered</h2>
        <p className="text-white/40 text-sm max-w-xs">You are already registered for {hack.title}.</p>
        <Link to={`/hackathon/${hack.id}`} className="hack-btn-secondary px-5 py-2 text-xs">View Hackathon details</Link>
      </div>
    );
  }

  const filteredProfiles = allProfiles.filter(p => {
    if (p.id === user?.id) return false;
    return !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const displayStep = currentStep === 3 && hack?.team_size_min && hack.team_size_min >= 2 ? 2 : currentStep;
  const totalSteps = registrationMode === "individual" ? 2 : (hack?.team_size_min && hack.team_size_min >= 2 ? 2 : 3);

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 pb-20">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white font-800 text-2xl md:text-3xl mb-1.5 flex items-center gap-3">
            Register for {hack.title}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-hack-primary/10 text-hack-primary border border-hack-primary/25">
              Step {displayStep} of {totalSteps}
            </span>
          </h1>
          <p className="text-white/45 text-sm">Join the hackathon and kickstart your build.</p>
        </div>

        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                i + 1 <= displayStep ? "bg-hack-primary" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>


      <div className="hack-card p-6 md:p-8 space-y-6">
        {/* --- STEP 1: PARTICIPANT INFORMATION --- */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Participant Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-xs font-500 block mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Singh"
                  className="hack-input text-sm"
                />
              </div>

              <div>
                <label className="text-white/60 text-xs font-500 block mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@gmail.com"
                  className="hack-input text-sm"
                />
              </div>

              <div>
                <label className="text-white/60 text-xs font-500 block mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="hack-input text-sm"
                />
              </div>

              <div>
                <label className="text-white/60 text-xs font-500 block mb-1.5">College / University *</label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="IIT Bombay"
                  className="hack-input text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-white/60 text-xs font-500 block mb-1.5">Hackathon Experience</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="hack-input text-sm"
                >
                  <option value="First hackathon" style={{ background: "#131826" }}>First hackathon</option>
                  <option value="1-2 hackathons" style={{ background: "#131826" }}>1-2 hackathons</option>
                  <option value="3-5 hackathons" style={{ background: "#131826" }}>3-5 hackathons</option>
                  <option value="6+ hackathons" style={{ background: "#131826" }}>6+ hackathons</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-white/60 text-xs font-500 block mb-1.5">Why do you want to join? (Optional)</label>
                <textarea
                  value={whyJoin}
                  onChange={(e) => setWhyJoin(e.target.value)}
                  placeholder="Describe your goals and motivation for joining this event..."
                  className="hack-input text-sm h-24 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 2: CHOOSE MODE --- */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Registration Mode</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(!hack.team_size_min || hack.team_size_min <= 1) && (
                <button
                  type="button"
                  onClick={() => setRegistrationMode("individual")}
                  className={`p-6 rounded-2xl text-left border flex flex-col justify-between transition-all h-40 ${
                    registrationMode === "individual"
                      ? "bg-hack-primary/10 border-hack-primary text-white"
                      : "bg-white/3 border-white/8 hover:bg-white/5 text-white/70"
                  }`}
                >
                  <User size={24} className={`mb-4 ${registrationMode === "individual" ? "text-hack-primary" : "text-white/40"}`} />
                  <div>
                    <div className="font-700 text-base mb-1">Register Individually</div>
                    <div className="text-xs text-white/40">Compete on your own or find a team later in the event.</div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setRegistrationMode("team")}
                className={`p-6 rounded-2xl text-left border flex flex-col justify-between transition-all h-40 ${
                  registrationMode === "team"
                    ? "bg-hack-primary/10 border-hack-primary text-white"
                    : "bg-white/3 border-white/8 hover:bg-white/5 text-white/70"
                } ${(!hack.team_size_min || hack.team_size_min <= 1) ? "" : "sm:col-span-2"}`}
              >
                <Users size={24} className={`mb-4 ${registrationMode === "team" ? "text-hack-primary" : "text-white/40"}`} />
                <div>
                  <div className="font-700 text-base mb-1">Register with Team</div>
                  <div className="text-xs text-white/40">Create a team workspace, specify requirements, and invite builders now.</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: TEAM CONFIGURATION --- */}
        {currentStep === 3 && registrationMode === "team" && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Team Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-xs font-500 block mb-1.5">Team Name *</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. ByteForce"
                  className="hack-input text-sm"
                />
              </div>

              <div>
                <label className="text-white/60 text-xs font-500 block mb-1.5">Problem Statement / Idea (Optional)</label>
                <textarea
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder="What idea are you planning to work on?"
                  className="hack-input text-sm h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-white/60 text-xs font-500 block mb-1.5">Team Description (Optional)</label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Briefly describe your team goals and builder requirements."
                  className="hack-input text-sm h-20 resize-none"
                />
              </div>

              {/* Required Roles list */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-white/60 text-xs font-500">Required Roles</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomRole(true)}
                    className="text-hack-primary text-xs font-600 hover:underline"
                  >
                    + Add Custom Role
                  </button>
                </div>

                {showAddCustomRole && (
                  <div className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3 mb-4 animate-fade-in">
                    <h4 className="text-white font-600 text-sm">New Custom Role</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={customRoleName}
                        onChange={(e) => setCustomRoleName(e.target.value)}
                        placeholder="Role Title (e.g. Mobile Developer)"
                        className="hack-input text-sm"
                      />
                      <input
                        type="text"
                        value={customRoleSkills}
                        onChange={(e) => setCustomRoleSkills(e.target.value)}
                        placeholder="Skills (comma-separated)"
                        className="hack-input text-sm"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowAddCustomRole(false)} className="hack-btn-secondary py-1 text-xs">Cancel</button>
                      <button onClick={handleAddCustomRole} className="hack-btn-primary py-1 text-xs">Add Role</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {requiredRoles.map((roleObj, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-600">{roleObj.role}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {roleObj.skills.map(s => (
                            <span key={s} className="tag text-[9px]">{s}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveRole(idx)} className="text-white/30 hover:text-hack-red transition-colors p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Members invite search list */}
              <div>
                <label className="text-white/60 text-xs font-500 block mb-1.5">Invite Members & Assign Roles</label>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search builders by name or skills..."
                    className="hack-input pl-10 text-xs"
                  />
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {filteredProfiles.slice(0, 5).map((candidate) => {
                    const isInvited = invitedMembers.some(m => m.userId === candidate.id);
                    const invitee = invitedMembers.find(m => m.userId === candidate.id);
                    return (
                      <div key={candidate.id} className="p-4 rounded-xl bg-white/2 border border-white/5 flex flex-col gap-3 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img src={candidate.avatar} alt={candidate.name} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <div className="text-white text-sm font-600">{candidate.name}</div>
                              <div className="text-[11px] text-white/45">{candidate.role} · {candidate.location}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isInvited && invitee && (
                              <div className="flex flex-col items-end gap-1">
                                <select
                                  value={AVAILABLE_ROLES.includes(invitee.role) ? invitee.role : "Other"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateInvitedRole(candidate.id, val === "Other" ? "Custom Role" : val);
                                  }}
                                  className="hack-input text-[11px] py-1 px-2 w-36 border border-hack-primary/30"
                                  style={{ borderRadius: "8px" }}
                                >
                                  {AVAILABLE_ROLES.map((r, i) => (
                                    <option key={i} value={r} style={{ background: "#131826" }}>{r}</option>
                                  ))}
                                  <option value="Other" style={{ background: "#131826" }}>Other (custom)</option>
                                </select>
                                {!AVAILABLE_ROLES.includes(invitee.role) && (
                                  <input
                                    type="text"
                                    placeholder="Enter custom role..."
                                    value={invitee.role === "Other" ? "" : invitee.role}
                                    onChange={(e) => handleUpdateInvitedRole(candidate.id, e.target.value)}
                                    className="hack-input text-[10px] py-1 px-2 w-36 border border-hack-primary/30 mt-1"
                                    style={{ borderRadius: "6px" }}
                                  />
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleInviteToggle(candidate)}
                              className={`py-1.5 px-4 text-xs font-500 rounded-xl transition-all ${
                                isInvited ? "bg-hack-green/20 text-hack-green border border-hack-green/30" : "hack-btn-primary"
                              }`}
                            >
                              {isInvited ? "Invited" : "Invite"}
                            </button>
                          </div>
                        </div>

                        {/* Extra Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-12 text-xs text-white/60">
                          {candidate.email && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-white/35">Email:</span>
                              <span className="text-white/80">{candidate.email}</span>
                            </div>
                          )}
                          
                          <div className="flex gap-3">
                            {candidate.github_username && (
                              <div className="flex items-center gap-1 text-[11px] text-[#A78BFF] bg-[#7C5CFF]/10 px-2 py-0.5 rounded-md border border-[#7C5CFF]/20">
                                <Github size={10} />
                                <span>{candidate.github_username}</span>
                              </div>
                            )}
                            {candidate.linkedin_connected && (
                              <div className="flex items-center gap-1 text-[11px] text-[#4F7CFF] bg-[#4F7CFF]/10 px-2 py-0.5 rounded-md border border-[#4F7CFF]/20">
                                <Linkedin size={10} />
                                <span>Connected</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Skills */}
                        {candidate.skills && candidate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 pl-12">
                            {candidate.skills.slice(0, 5).map((skill) => (
                              <span key={skill} className="tag text-[9px] px-2 py-0.5 bg-white/3 border border-white/5">{skill}</span>
                            ))}
                            {candidate.skills.length > 5 && (
                              <span className="text-[9px] text-white/30 pt-0.5">+{candidate.skills.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- FOOTER ACTIONS --- */}
        <div className="pt-6 border-t border-white/6 flex items-center justify-between">
          <button
            onClick={handleBackStep}
            disabled={currentStep === 1 || submitting}
            className="hack-btn-secondary px-6 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <button
            onClick={currentStep === (registrationMode === "individual" ? 2 : 3) ? handleFinalSubmission : handleNextStep}
            disabled={submitting}
            className="hack-btn-primary px-8"
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Submitting...</>
            ) : currentStep === (registrationMode === "individual" ? 2 : 3) ? (
              <>Register</>
            ) : (
              <>Next <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
