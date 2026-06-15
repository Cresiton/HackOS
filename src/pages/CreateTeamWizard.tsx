import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import {
  Users, Calendar, ArrowRight, ArrowLeft, Settings, MessageSquare,
  CheckCircle, Clock, Star, ExternalLink, Sparkles, Trash2, Edit,
  Search, UserPlus, Info, Shield, Globe, Lock, EyeOff, Loader2,
  AlertTriangle, Check
} from "lucide-react";
import { Team, Teammate, Hackathon } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeTeamRequirements } from "@/lib/groq";
import { deserializeHackathon } from "@/lib/utils";

interface RequiredRole {
  role: string;
  qty: number;
  skills: string[];
}

export default function CreateTeamWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const prefilledHackathonId = searchParams.get("hackathon_id");

  useEffect(() => {
    const blueprintState = location.state as {
      problemStatement?: string;
      roles?: { role: string; qty?: number; skills: string[] }[];
      hackathon?: string;
    } | null;

    if (blueprintState) {
      if (blueprintState.problemStatement) {
        setProblemStatement(blueprintState.problemStatement);
      }
      if (blueprintState.roles && blueprintState.roles.length > 0) {
        setRequiredRoles(
          blueprintState.roles.map(r => ({
            role: r.role,
            qty: r.qty || 1,
            skills: r.skills || []
          }))
        );
      }
      if (blueprintState.hackathon) {
        setExtName(blueprintState.hackathon);
        setProjName(blueprintState.hackathon);
      }
    }
  }, [location.state]);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Database lists
  const [registeredHackathons, setRegisteredHackathons] = useState<Hackathon[]>([]);
  const [allProfiles, setAllProfiles] = useState<Teammate[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [teamType, setTeamType] = useState<"registered" | "external" | "personal">("registered");
  
  // Registered Hackathon selection
  const [selectedHackathonId, setSelectedHackathonId] = useState("");

  // External Hackathon details
  const [extName, setExtName] = useState("");
  const [extOrganizer, setExtOrganizer] = useState("");
  const [extDeadline, setExtDeadline] = useState("");
  const [extStartDate, setExtStartDate] = useState("");
  const [extEndDate, setExtEndDate] = useState("");
  const [extLink, setExtLink] = useState("");

  // Personal Project details
  const [projName, setProjName] = useState("");
  const [projDescription, setProjDescription] = useState("");
  const [projDuration, setProjDuration] = useState("");

  // Step 2: Team Info
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");

  // Step 3: Visibility
  const [visibility, setVisibility] = useState<"public" | "invite_only" | "hidden">("public");

  // Step 4: Capacity
  const [maxCapacity, setMaxCapacity] = useState(4);

  // Step 5: Problem Statement
  const [problemStatement, setProblemStatement] = useState("");

  // Step 6 & 7: Roles Suggestion / List
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [desiredAISize, setDesiredAISize] = useState(4);
  const [requiredRoles, setRequiredRoles] = useState<RequiredRole[]>([]);
  const [editingRoleIdx, setEditingRoleIdx] = useState<number | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleSkills, setEditRoleSkills] = useState("");
  const [showAddCustomRole, setShowAddCustomRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleSkills, setCustomRoleSkills] = useState("");

  // Step 8: Members / Invites search
  const [searchQuery, setSearchQuery] = useState("");
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [currentSelectedRoleForMatching, setCurrentSelectedRoleForMatching] = useState("");
  const [aiMatchesLoading, setAiMatchesLoading] = useState(false);
  const [aiRecommendedCandidates, setAiRecommendedCandidates] = useState<Record<string, (Teammate & { why: string })[]>>({});
  
  // Step 9: Invites Popup
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [candidateToInvite, setCandidateToInvite] = useState<Teammate | null>(null);
  const [inviteRoleName, setInviteRoleName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [queuedInvites, setQueuedInvites] = useState<{ userId: string; name: string; role: string; message: string }[]>([]);

  // Step 10: Publish / Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<Team | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("me");

  // Load registered hackathons and profiles
  useEffect(() => {
    if (!user) return;
    async function loadData() {
      try {
        setLoadingInitial(true);
        // Load hackathons user has registered for
        const { data: regs, error: regsError } = await supabase
          .from("registrations")
          .select("hackathon_id, hackathons (*)")
          .eq("user_id", user.id);
        
        if (regsError) throw regsError;
        
        if (regs) {
          const hacks = regs
            .map((r: any) => r.hackathons ? deserializeHackathon(r.hackathons) : null)
            .filter(Boolean) as Hackathon[];
          setRegisteredHackathons(hacks);
          
          if (prefilledHackathonId) {
            setTeamType("registered");
            setSelectedHackathonId(prefilledHackathonId);
          } else if (hacks.length > 0) {
            setSelectedHackathonId(hacks[0].id);
          }
        }

        // Load profiles and skills
        const { data: profiles, error: pError } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", user.id);
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
          college: p.college || "Unknown",
          trustScore: p.trust_score || 0,
          availability: p.availability || "available"
        }));

        setAllProfiles(formattedProfiles);
      } catch (err) {
        console.error("Error loading wizard initial data:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [user, prefilledHackathonId]);

  // Set default role matching role name
  useEffect(() => {
    if (requiredRoles.length > 0 && !currentSelectedRoleForMatching) {
      setCurrentSelectedRoleForMatching(requiredRoles[0].role);
    }
  }, [requiredRoles]);

  // Validate Team Name Uniqueness for current hackathon
  const [validatingName, setValidatingName] = useState(false);
  const [nameError, setNameError] = useState("");

  const checkTeamNameUniqueness = async (name: string, hackId: string) => {
    if (!name || name.trim().length < 3 || name.trim().length > 30) return;
    setValidatingName(true);
    setNameError("");
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id")
        .eq("name", name.trim())
        .eq("hackathon_id", hackId)
        .limit(1);
      
      if (error) throw error;
      if (data && data.length > 0) {
        setNameError("Team name is already taken for this event");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setValidatingName(false);
    }
  };

  const handleTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTeamName(val);
    if (val.trim().length >= 3 && val.trim().length <= 30) {
      if (teamType === "registered" && selectedHackathonId) {
        checkTeamNameUniqueness(val, selectedHackathonId);
      }
    }
  };

  // Step 6: AI Team Builder Integration
  const handleAIAnalyze = async () => {
    if (!problemStatement.trim()) {
      toast.error("Please fill in the problem statement first.");
      return;
    }
    setIsAnalyzingAI(true);
    try {
      // Find event name context
      let eventTitle = "";
      if (teamType === "registered") {
        eventTitle = registeredHackathons.find(h => h.id === selectedHackathonId)?.title || "";
      } else if (teamType === "external") {
        eventTitle = extName;
      } else {
        eventTitle = projName;
      }

      const res = await analyzeTeamRequirements(problemStatement, desiredAISize, eventTitle);
      if (res && res.roles) {
        const rolesToAdd: RequiredRole[] = res.roles.map(r => ({
          role: r.role,
          qty: 1,
          skills: r.skills || []
        }));
        setRequiredRoles(rolesToAdd);
        toast.success("AI analysis complete! Suggested roles populated.");
        setCurrentStep(7); // Auto proceed to roles step
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to analyze with AI. Using default roles template.");
      
      // Load custom defaults
      setRequiredRoles([
        { role: "Frontend Developer", qty: 1, skills: ["React", "TypeScript", "Tailwind"] },
        { role: "Backend Developer", qty: 1, skills: ["Node.js", "Express", "PostgreSQL"] },
        { role: "UI/UX Designer", qty: 1, skills: ["Figma", "UI Design", "Prototyping"] }
      ]);
      setCurrentStep(7);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Add a Custom Role
  const handleAddCustomRoleSubmit = () => {
    if (!customRoleName.trim()) return;
    const skillsArr = customRoleSkills.split(",").map(s => s.trim()).filter(Boolean);
    setRequiredRoles([...requiredRoles, { role: customRoleName.trim(), qty: 1, skills: skillsArr }]);
    setCustomRoleName("");
    setCustomRoleSkills("");
    setShowAddCustomRole(false);
    toast.success("Custom role added!");
  };

  // Edit Role
  const startEditingRole = (idx: number) => {
    setEditingRoleIdx(idx);
    setEditRoleName(requiredRoles[idx].role);
    setEditRoleSkills(requiredRoles[idx].skills.join(", "));
  };

  const saveEditedRole = () => {
    if (editingRoleIdx === null || !editRoleName.trim()) return;
    const updated = [...requiredRoles];
    updated[editingRoleIdx] = {
      ...updated[editingRoleIdx],
      role: editRoleName.trim(),
      skills: editRoleSkills.split(",").map(s => s.trim()).filter(Boolean)
    };
    setRequiredRoles(updated);
    setEditingRoleIdx(null);
    toast.success("Role updated!");
  };

  const deleteRole = (idx: number) => {
    setRequiredRoles(requiredRoles.filter((_, i) => i !== idx));
    toast.info("Role removed.");
  };

  const updateRoleQty = (idx: number, delta: number) => {
    const updated = [...requiredRoles];
    const newQty = Math.max(1, updated[idx].qty + delta);
    updated[idx].qty = newQty;
    setRequiredRoles(updated);
  };

  // Step 8 Matchmaking algorithm
  const getMatchesForRole = (roleName: string) => {
    const targetRoleObj = requiredRoles.find(r => r.role === roleName);
    const keywords = targetRoleObj ? targetRoleObj.skills : [];
    
    return allProfiles
      .filter((candidate) => candidate.id !== user?.id)
      .map((candidate) => {
        let score = 50;
        const candidateRole = candidate.role.toLowerCase();
        const searchRole = roleName.toLowerCase();
        
        // Match on role title
        if (candidateRole.includes(searchRole) || searchRole.includes(candidateRole)) {
          score += 25;
        }

        // Match on skills
        let skillMatches = 0;
        keywords.forEach(kw => {
          if (candidate.skills.some(s => s.toLowerCase().includes(kw.toLowerCase()))) {
            skillMatches++;
          }
        });

        score += skillMatches * 8;
        score += candidate.trustScore * 0.15; // Include trust score context
        
        const finalScore = Math.min(99, score);
        
        // Generate recommendation text
        let why = "Highly matched candidate.";
        if (skillMatches > 0) {
          why = `Expert skills match in ${keywords.slice(0, 3).join(", ")}.`;
        } else if (candidateRole.includes(searchRole)) {
          why = `Verified role similarity as ${candidate.role}.`;
        }
        
        return {
          ...candidate,
          matchScore: Math.round(finalScore),
          why
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  };

  const triggerAIRecommendation = async () => {
    if (!currentSelectedRoleForMatching) return;
    setAiMatchesLoading(true);
    // Simulate AI match calculation
    await new Promise(r => setTimeout(r, 800));
    const matches = getMatchesForRole(currentSelectedRoleForMatching);
    setAiRecommendedCandidates({
      ...aiRecommendedCandidates,
      [currentSelectedRoleForMatching]: matches
    });
    setAiMatchesLoading(false);
  };

  // Step 9: Open Invite Modal
  const openInvitePopup = (candidate: Teammate, roleName: string) => {
    setCandidateToInvite(candidate);
    setInviteRoleName(roleName);
    setInviteMessage(`Hi! We loved your experience in ${candidate.skills.slice(0, 3).join(", ")} and would love to have you join our team.`);
    setShowInvitePopup(true);
  };

  const confirmInvite = () => {
    if (!candidateToInvite) return;
    
    // Check duplicate invites
    const alreadyInvited = queuedInvites.some(q => q.userId === candidateToInvite.id && q.role === inviteRoleName);
    if (alreadyInvited) {
      toast.warning("This user has already been invited for this role.");
      setShowInvitePopup(false);
      return;
    }

    setQueuedInvites([
      ...queuedInvites,
      {
        userId: candidateToInvite.id,
        name: candidateToInvite.name,
        role: inviteRoleName,
        message: inviteMessage
      }
    ]);

    toast.success(`Invitation queued for ${candidateToInvite.name}!`);
    setShowInvitePopup(false);
  };

  // Form Validations
  const validateStep = () => {
    if (currentStep === 1) {
      if (teamType === "registered" && !selectedHackathonId) {
        toast.error("Please select a registered hackathon.");
        return false;
      }
      if (teamType === "external") {
        if (!extName.trim() || !extOrganizer.trim() || !extDeadline) {
          toast.error("Please fill in the hackathon details.");
          return false;
        }
      }
      if (teamType === "personal") {
        if (!projName.trim() || !projDescription.trim()) {
          toast.error("Please fill in project name and description.");
          return false;
        }
      }
    }
    if (currentStep === 2) {
      if (teamName.trim().length < 3 || teamName.trim().length > 30) {
        toast.error("Team name must be between 3 and 30 characters.");
        return false;
      }
      if (nameError) {
        toast.error("Team name is already taken.");
        return false;
      }
    }
    if (currentStep === 7) {
      if (requiredRoles.length === 0) {
        toast.error("Please specify at least one required role.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit / Publish Team Flow
  const handleSubmitTeam = async (isDraft: boolean) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      let hackId = selectedHackathonId;

      // 1. Resolve External / Personal Hackathon rows to satisfy constraint
      if (teamType === "external") {
        const payloadDesc = `${extOrganizer} External Hackathon\n\n---METADATA---\n${JSON.stringify({ owner_id: user.id, event_link: extLink, external: true })}`;
        const { data: newHack, error: hackErr } = await supabase
          .from("hackathons")
          .insert({
            title: extName.trim(),
            organizer: extOrganizer.trim(),
            description: payloadDesc,
            mode: "Online",
            prize: "External",
            prize_amount: 0,
            days_left: 7,
            max_participants: 500,
            start_date: extStartDate ? new Date(extStartDate).toISOString() : new Date().toISOString(),
            end_date: extEndDate ? new Date(extEndDate).toISOString() : new Date().toISOString(),
            registration_deadline: new Date(extDeadline).toISOString(),
            status: "open",
            image_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=200&fit=crop"
          })
          .select("*")
          .single();
        
        if (hackErr) throw hackErr;
        hackId = newHack.id;
      } else if (teamType === "personal") {
        const payloadDesc = `${projDescription}\n\n---METADATA---\n${JSON.stringify({ owner_id: user.id, duration: projDuration, personal: true })}`;
        const { data: newHack, error: hackErr } = await supabase
          .from("hackathons")
          .insert({
            title: projName.trim(),
            organizer: "Personal Project",
            description: payloadDesc,
            mode: "Online",
            prize: "Collaboration",
            prize_amount: 0,
            days_left: 30,
            max_participants: 10,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            registration_deadline: new Date().toISOString(),
            status: "open",
            image_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=200&fit=crop"
          })
          .select("*")
          .single();
        
        if (hackErr) throw hackErr;
        hackId = newHack.id;
      }

      // Serialize metadata block to save in teams.description
      const teamMeta = {
        visibility,
        problem_statement: problemStatement.trim(),
        required_roles: requiredRoles,
        tasks: [],
        announcements: [],
        creator_id: user.id,
        is_draft: isDraft
      };
      const serializedDescription = `${teamDescription}\n\n---METADATA---\n${JSON.stringify(teamMeta)}`;

      // 2. Insert Team row
      const { data: teamData, error: teamErr } = await supabase
        .from("teams")
        .insert({
          name: teamName.trim(),
          max_members: maxCapacity,
          description: serializedDescription,
          hackathon_id: hackId,
          progress: 0,
          status: isDraft ? "recruiting" : "recruiting", // draft is active recruitment in database
          color: "#7C5CFF",
          icon: "🚀"
        })
        .select("*")
        .single();
      
      if (teamErr) throw teamErr;

      // 3. Create membership for current user
      const isCreatorLeader = selectedLeaderId === "me";
      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({
          team_id: teamData.id,
          user_id: user.id,
          role: isCreatorLeader ? "leader" : "Developer"
        });
      
      if (memberErr) throw memberErr;

      // Create Team Room if not draft
      if (!isDraft) {
        try {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({
              is_team: true,
              team_id: teamData.id
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
            
            // Insert system message
            await supabase
              .from("messages")
              .insert({
                conversation_id: newConv.id,
                sender_id: user.id,
                content: `system:${user.name} created the team.`
              });
          }
        } catch (chatErr) {
          console.error("Error creating team room conversation:", chatErr);
        }
      }

      // 4. Send all queued invitations
      if (queuedInvites.length > 0) {
        const invitePayloads = queuedInvites.map(q => {
          const isThisSelectedLeader = selectedLeaderId === q.userId;
          return {
            team_id: teamData.id,
            sender_id: user.id,
            receiver_id: q.userId,
            role: isThisSelectedLeader ? "leader" : q.role,
            message: q.message,
            status: "pending",
            request_type: "invite"
          };
        });

        const { error: inviteErr } = await supabase
          .from("team_requests")
          .insert(invitePayloads);
        
        if (inviteErr) throw inviteErr;
      }

      // 5. Insert notification trigger for invitations
      for (const q of queuedInvites) {
        await supabase
          .from("notifications")
          .insert({
            user_id: q.userId,
            type: "team",
            title: "Team Invitation",
            description: `You have been invited to join Team ${teamName.trim()} as a ${q.role}.`,
            action_url: "/my-requests",
            action_label: "View Invites"
          });
      }

      toast.success(isDraft ? "Draft saved successfully!" : "Team published successfully!");
      setCreatedTeam(teamData);
      setCurrentStep(11); // Proceed to success screen
    } catch (err: any) {
      console.error("Error creating team:", err);
      toast.error(err.message || "Failed to create team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper filters for Step 8 manual search
  const filteredProfiles = allProfiles.filter(p => {
    const nameMatch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const skillMatch = !skillSearchQuery || p.skills.some(s => s.toLowerCase().includes(skillSearchQuery.toLowerCase()));
    const locMatch = !locationSearchQuery || p.location.toLowerCase().includes(locationSearchQuery.toLowerCase());
    return nameMatch && skillMatch && locMatch;
  });

  if (loadingInitial) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-hack-primary" />
          <p className="text-white/40 text-sm">Initializing Team Builder...</p>
        </div>
      </div>
    );
  }

  // --- Step 11: Success screen
  if (currentStep === 11) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-8 animate-fade-in">
        <div className="relative flex justify-center">
          <div
            className="w-24 h-24 rounded-[32px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(124,92,255,0.25), rgba(34,197,94,0.18))",
              border: "1px solid rgba(124,92,255,0.3)",
              boxShadow: "0 0 60px rgba(124,92,255,0.25)",
            }}
          >
            <CheckCircle size={44} className="text-hack-green animate-pulse" />
          </div>
          <div className="absolute -top-3 -right-2 text-3xl animate-bounce">🎉</div>
          <div className="absolute top-8 -left-3 text-2xl">⚡</div>
        </div>

        <div>
          <h2 className="text-white font-800 text-3xl mb-2">Team Created Successfully!</h2>
          <p className="text-white/50 text-base">
            Congratulations! Team <strong className="text-white">{teamName}</strong> has been initialized.
          </p>
        </div>

        <div
          className="p-6 rounded-2xl text-left divide-y divide-white/5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="pb-3 flex justify-between">
            <span className="text-white/40 text-sm">Team Name</span>
            <span className="text-white font-600 text-sm">{teamName}</span>
          </div>
          <div className="py-3 flex justify-between">
            <span className="text-white/40 text-sm">Capacity</span>
            <span className="text-white font-600 text-sm">1 / {maxCapacity} (Creator)</span>
          </div>
          <div className="py-3 flex justify-between">
            <span className="text-white/40 text-sm">Visibility</span>
            <span className="text-white font-600 text-sm capitalize">{visibility.replace("_", " ")}</span>
          </div>
          {queuedInvites.length > 0 && (
            <div className="pt-3 flex justify-between">
              <span className="text-white/40 text-sm">Invitations Sent</span>
              <span className="text-hack-primary font-600 text-sm">{queuedInvites.length} pending</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/my-teams")}
            className="hack-btn-primary flex-1 justify-center py-3"
          >
            <Users size={16} />
            View Team Workspace
          </button>
          <button
            onClick={() => setCurrentStep(8)}
            className="hack-btn-secondary flex-1 justify-center py-3"
          >
            <UserPlus size={16} />
            Invite More Members
          </button>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-white/40 hover:text-white/70 text-sm block mx-auto transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 pb-20">
      {/* Back link */}
      <button
        onClick={handleBack}
        disabled={currentStep === 1}
        className="flex items-center gap-2 text-white/40 hover:text-white/70 disabled:opacity-0 transition-all mb-6 text-sm"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Title & Progress Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white font-800 text-2xl md:text-3xl mb-1.5 flex items-center gap-3">
            Create a New Team
            <span className="text-xs px-2 py-0.5 rounded-full bg-hack-primary/10 text-hack-primary border border-hack-primary/25">Step {currentStep} of 10</span>
          </h1>
          <p className="text-white/40 text-sm">Complete the wizard blueprint to find matching teammates dynamically.</p>
        </div>

        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                i + 1 <= currentStep ? "bg-hack-primary" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="hack-card p-6 md:p-8 space-y-6">
        {/* --- STEP 1: SELECT TEAM TYPE --- */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Is this team for?</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: "registered", label: "Registered HackOS Hackathon", desc: "For hackathons you have registered for on this platform.", icon: Shield },
                { type: "external", label: "External Hackathon", desc: "For external hackathons or competitions elsewhere.", icon: Globe },
                { type: "personal", label: "Personal Project / Collab", desc: "General collaboration, open projects or idea building.", icon: Code },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setTeamType(item.type as any)}
                  className={`p-5 rounded-2xl text-left border flex flex-col justify-between transition-all ${
                    teamType === item.type
                      ? "bg-hack-primary/10 border-hack-primary text-white"
                      : "bg-white/3 border-white/8 hover:bg-white/5 text-white/70"
                  }`}
                >
                  <item.icon size={24} className={`mb-4 ${teamType === item.type ? "text-hack-primary" : "text-white/40"}`} />
                  <div>
                    <div className="font-600 text-sm mb-1">{item.label}</div>
                    <div className="text-xs text-white/40">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Sub-Forms */}
            {teamType === "registered" && (
              <div className="space-y-2 pt-2 animate-fade-in">
                <label className="text-white/60 text-xs font-500">Select the hackathon</label>
                {registeredHackathons.length === 0 ? (
                  <div className="p-4 rounded-xl bg-hack-orange/10 border border-hack-orange/20 text-hack-orange text-xs flex gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    You haven't registered for any HackOS hackathons yet. Please register first, or select "External Hackathon" or "Personal Project".
                  </div>
                ) : (
                  <select
                    value={selectedHackathonId}
                    onChange={(e) => setSelectedHackathonId(e.target.value)}
                    className="hack-input"
                  >
                    {registeredHackathons.map((hack) => (
                      <option key={hack.id} value={hack.id} style={{ background: "#131826" }}>
                        {hack.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {teamType === "external" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-fade-in">
                <div>
                  <label className="text-white/60 text-xs font-500 block mb-1.5">Hackathon Name *</label>
                  <input type="text" value={extName} onChange={(e) => setExtName(e.target.value)} placeholder="e.g. Google Hash Code" className="hack-input text-sm" />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-500 block mb-1.5">Organizer *</label>
                  <input type="text" value={extOrganizer} onChange={(e) => setExtOrganizer(e.target.value)} placeholder="e.g. Google Developer Group" className="hack-input text-sm" />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-500 block mb-1.5">Registration Deadline *</label>
                  <input type="date" value={extDeadline} onChange={(e) => setExtDeadline(e.target.value)} className="hack-input text-sm" />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-500 block mb-1.5">Start Date</label>
                  <input type="date" value={extStartDate} onChange={(e) => setExtStartDate(e.target.value)} className="hack-input text-sm" />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-500 block mb-1.5">End Date</label>
                  <input type="date" value={extEndDate} onChange={(e) => setExtEndDate(e.target.value)} className="hack-input text-sm" />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-500 block mb-1.5">Optional Event Link</label>
                  <input type="url" value={extLink} onChange={(e) => setExtLink(e.target.value)} placeholder="https://..." className="hack-input text-sm" />
                </div>
              </div>
            )}

            {teamType === "personal" && (
              <div className="space-y-4 pt-2 animate-fade-in">
                <div>
                  <label className="text-white/60 text-xs font-500 block mb-1.5">Project Name *</label>
                  <input type="text" value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="e.g. AI-powered healthcare assistant" className="hack-input text-sm" />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-500 block mb-1.5">Project Description *</label>
                  <textarea value={projDescription} onChange={(e) => setProjDescription(e.target.value)} placeholder="What are your goals and what are you looking to build?" className="hack-input text-sm h-24 resize-none" />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-500 block mb-1.5">Expected Duration</label>
                  <select value={projDuration} onChange={(e) => setProjDuration(e.target.value)} className="hack-input text-sm">
                    {["1 week", "2 weeks", "1 month", "3 months", "Ongoing"].map(d => (
                      <option key={d} value={d} style={{ background: "#131826" }}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 2: TEAM INFORMATION --- */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Team Information</h3>

            <div>
              <label className="text-white/60 text-xs font-500 block mb-1.5">Team Name *</label>
              <input
                type="text"
                value={teamName}
                onChange={handleTeamNameChange}
                placeholder="e.g. ByteForce"
                className="hack-input text-sm"
              />
              <div className="flex justify-between mt-1 text-[11px]">
                <span className="text-white/30">Between 3 to 30 characters</span>
                {validatingName && <span className="text-hack-primary">Validating name...</span>}
                {nameError && <span className="text-hack-orange">{nameError}</span>}
              </div>
            </div>

            <div>
              <label className="text-white/60 text-xs font-500 block mb-1.5">Team Description</label>
              <textarea
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value.slice(0, 500))}
                placeholder="Describe your team goals and what kind of teammates you are looking for."
                className="hack-input text-sm h-28 resize-none"
              />
              <div className="text-right text-[11px] text-white/30">
                {teamDescription.length} / 500 characters
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 3: TEAM VISIBILITY --- */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Team Visibility</h3>

            <div className="space-y-3">
              {[
                { type: "public", label: "Public", desc: "Visible to everyone. Users can browse, apply, and view details.", icon: Globe },
                { type: "invite_only", label: "Invite Only", desc: "Users can view the team card but cannot apply. Only invited members can join.", icon: Lock },
                { type: "hidden", label: "Hidden", desc: "Not visible anywhere. Only developers with direct invitation links can join.", icon: EyeOff },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setVisibility(item.type as any)}
                  className={`w-full p-4 rounded-xl text-left border flex items-center gap-4 transition-all ${
                    visibility === item.type
                      ? "bg-hack-primary/10 border-hack-primary"
                      : "bg-white/3 border-white/6 hover:bg-white/5"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      visibility === item.type ? "bg-hack-primary/20 text-hack-primary" : "bg-white/5 text-white/40"
                    }`}
                  >
                    <item.icon size={18} />
                  </div>
                  <div>
                    <div className="font-600 text-sm text-white mb-0.5">{item.label}</div>
                    <div className="text-xs text-white/40">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- STEP 4: TEAM CAPACITY --- */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Team Capacity</h3>

            <div className="max-w-md mx-auto p-6 rounded-2xl text-center space-y-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-5xl font-800 text-hack-primary">{maxCapacity}</div>
              <div className="text-white/40 text-xs">Maximum Team Size</div>
              
              <input
                type="range"
                min={2}
                max={10}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="w-full accent-hack-primary cursor-pointer"
              />

              <div className="flex justify-between text-xs pt-4 border-t border-white/5">
                <div className="text-left">
                  <div className="text-white/40 mb-0.5">Current Members:</div>
                  <div className="text-white font-600">1 (You, Creator)</div>
                </div>
                <div className="text-right">
                  <div className="text-white/40 mb-0.5">Remaining Slots:</div>
                  <div className="text-hack-primary font-700">{maxCapacity - 1} slots</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 5: PROBLEM STATEMENT --- */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-700 text-lg">What are you planning to build?</h3>
              <button
                onClick={() => setCurrentStep(7)}
                className="text-white/40 hover:text-white/70 text-xs transition-all"
              >
                Skip Option
              </button>
            </div>

            <p className="text-white/40 text-xs leading-relaxed">
              Optional. Write a brief overview of the problem you are solving. This will be analyzed by AI to recommend matching members.
            </p>

            <textarea
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="e.g. An AI-powered cattle health monitoring system using IoT sensors to predict diseases early..."
              className="hack-input text-sm h-32 resize-none"
            />
          </div>
        )}

        {/* --- STEP 6: AI TEAM BUILDER INTEGRATION --- */}
        {currentStep === 6 && (
          <div className="space-y-6 text-center py-6 animate-fade-in">
            <div
              className="w-16 h-16 rounded-3xl bg-hack-primary/10 border border-hack-primary/20 mx-auto flex items-center justify-center"
            >
              <Sparkles size={28} className="text-hack-primary animate-pulse" />
            </div>

            <div>
              <h3 className="text-white font-800 text-xl mb-2">Analyze with AI</h3>
              <p className="text-white/45 text-sm max-w-md mx-auto leading-relaxed">
                Our AI Team Builder will analyze your blueprint problem statement and recommend required roles, tech stack, and matches.
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-2 pt-2">
              <label className="text-white/60 text-xs font-500 block text-left">Desired Team Size</label>
              <select
                value={desiredAISize}
                onChange={(e) => setDesiredAISize(Number(e.target.value))}
                className="hack-input text-sm"
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <option key={i + 2} value={i + 2} style={{ background: "#131826" }}>{i + 2} members</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-center max-w-sm mx-auto pt-4">
              <button
                onClick={() => setCurrentStep(7)}
                className="hack-btn-secondary flex-1 justify-center"
              >
                Skip Analysis
              </button>
              <button
                onClick={handleAIAnalyze}
                disabled={isAnalyzingAI}
                className="hack-btn-primary flex-1 justify-center"
              >
                {isAnalyzingAI ? (
                  <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
                ) : (
                  <>Analyze with AI</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 7: REQUIRED ROLES --- */}
        {currentStep === 7 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-700 text-lg">Required Roles</h3>
              <button
                onClick={() => setShowAddCustomRole(true)}
                className="hack-btn-primary py-1.5 px-3 text-xs"
              >
                + Add Custom Role
              </button>
            </div>

            <p className="text-white/40 text-xs leading-relaxed">
              These are suggestions. You can edit role titles, modify desired skills, add custom slots, or change quantities.
            </p>

            {/* Custom role insert panel */}
            {showAddCustomRole && (
              <div className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3 animate-fade-in">
                <h4 className="text-white font-600 text-sm">New Custom Role</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={customRoleName}
                    onChange={(e) => setCustomRoleName(e.target.value)}
                    placeholder="Role Title (e.g. Presenter)"
                    className="hack-input text-sm"
                  />
                  <input
                    type="text"
                    value={customRoleSkills}
                    onChange={(e) => setCustomRoleSkills(e.target.value)}
                    placeholder="Skills (comma-separated, e.g. Pitching, Presentation)"
                    className="hack-input text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddCustomRole(false)} className="hack-btn-secondary py-1.5 text-xs">Cancel</button>
                  <button onClick={handleAddCustomRoleSubmit} className="hack-btn-primary py-1.5 text-xs">Add Role</button>
                </div>
              </div>
            )}

            {/* Role Cards Grid */}
            {requiredRoles.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-xs">
                No roles defined yet. Add custom roles or go back to run AI analysis.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiredRoles.map((roleObj, idx) => {
                  const isEditing = editingRoleIdx === idx;
                  return (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl flex flex-col justify-between border"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        borderColor: isEditing ? "rgba(124,92,255,0.4)" : "rgba(255,255,255,0.06)"
                      }}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editRoleName}
                            onChange={(e) => setEditRoleName(e.target.value)}
                            className="hack-input text-xs"
                          />
                          <input
                            type="text"
                            value={editRoleSkills}
                            onChange={(e) => setEditRoleSkills(e.target.value)}
                            placeholder="Skills (comma-separated)"
                            className="hack-input text-xs"
                          />
                          <div className="flex gap-2 justify-end pt-1">
                            <button onClick={() => setEditingRoleIdx(null)} className="hack-btn-secondary py-1 px-2.5 text-[10px]">Cancel</button>
                            <button onClick={saveEditedRole} className="hack-btn-primary py-1 px-2.5 text-[10px]">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-white font-700 text-base">{roleObj.role}</div>
                            <div className="flex gap-1">
                              <button onClick={() => startEditingRole(idx)} className="text-white/30 hover:text-white/70 p-1">
                                <Edit size={13} />
                              </button>
                              <button onClick={() => deleteRole(idx)} className="text-white/30 hover:text-hack-red p-1">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {roleObj.skills.map(s => (
                              <span key={s} className="tag text-[10px]">{s}</span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-white/40">Need:</span>
                              <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/5 px-2 py-0.5">
                                <button onClick={() => updateRoleQty(idx, -1)} className="text-white/50 hover:text-white">-</button>
                                <span className="text-white font-600">{roleObj.qty}</span>
                                <button onClick={() => updateRoleQty(idx, 1)} className="text-white/50 hover:text-white">+</button>
                              </div>
                            </div>
                            <span className="text-white/40">Status: <strong className="text-hack-orange font-500">Vacant</strong></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- STEP 8: FINDING MEMBERS --- */}
        {currentStep === 8 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Finding Members</h3>
            <p className="text-white/45 text-xs">Invite builders matching the vacant slots. Queued invitations will be dispatched upon team creation.</p>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column: Roles selector */}
              <div className="lg:col-span-2 space-y-2">
                <label className="text-white/50 text-xs block mb-1">Vacant Roles</label>
                {requiredRoles.map((roleObj, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentSelectedRoleForMatching(roleObj.role);
                    }}
                    className={`w-full p-3 rounded-xl text-left border flex items-center justify-between transition-all ${
                      currentSelectedRoleForMatching === roleObj.role
                        ? "bg-hack-primary/10 border-hack-primary text-white"
                        : "bg-white/2 border-white/5 text-white/50"
                    }`}
                  >
                    <div className="font-600 text-xs truncate pr-2">{roleObj.role}</div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 font-500">{roleObj.qty} Open</span>
                  </button>
                ))}

                {/* AI Rec button */}
                <button
                  onClick={triggerAIRecommendation}
                  disabled={aiMatchesLoading || !currentSelectedRoleForMatching}
                  className="hack-btn-primary w-full justify-center text-xs py-2.5 mt-4"
                >
                  {aiMatchesLoading ? (
                    <><Loader2 size={13} className="animate-spin" /> Fetching matches...</>
                  ) : (
                    <><Sparkles size={13} /> AI: Match Candidates</>
                  )}
                </button>
              </div>

              {/* Right Column: Search results */}
              <div className="lg:col-span-3 space-y-4">
                {/* Option Tabs */}
                <div className="flex gap-2 p-1 bg-white/3 rounded-xl border border-white/5">
                  <button className="flex-1 py-1.5 text-center text-xs font-600 rounded-lg bg-white/5 text-white">
                    AI Matches
                  </button>
                  <button className="flex-1 py-1.5 text-center text-xs font-600 text-white/40 hover:text-white/70">
                    Manual Search
                  </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name"
                    className="hack-input py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={skillSearchQuery}
                    onChange={(e) => setSkillSearchQuery(e.target.value)}
                    placeholder="Skills"
                    className="hack-input py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="Location"
                    className="hack-input py-1.5 text-xs"
                  />
                </div>

                {/* List Container */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {/* AI recommended results if any */}
                  {currentSelectedRoleForMatching && aiRecommendedCandidates[currentSelectedRoleForMatching] ? (
                    aiRecommendedCandidates[currentSelectedRoleForMatching].map((candidate) => {
                      const isQueued = queuedInvites.some(q => q.userId === candidate.id && q.role === currentSelectedRoleForMatching);
                      return (
                        <div
                          key={candidate.id}
                          className="p-3 rounded-xl border flex items-center justify-between bg-white/2 border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              onClick={() => navigate(`/profile/${candidate.id}`)}
                              className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-white/5 cursor-pointer hover:border-hack-primary/50 hover:ring-2 hover:ring-hack-primary/30 transition-all"
                            >
                              <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div 
                                onClick={() => navigate(`/profile/${candidate.id}`)}
                                className="text-white text-xs font-600 cursor-pointer hover:text-hack-primary transition-colors"
                              >
                                {candidate.name}
                              </div>
                              <div className="text-[10px] text-white/40">{candidate.role} · {candidate.location}</div>
                              <div className="text-[9px] text-hack-green font-500 mt-0.5">{candidate.why}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-700 text-hack-primary">{candidate.matchScore}% Match</span>
                            <button
                              disabled={isQueued}
                              onClick={() => openInvitePopup(candidate, currentSelectedRoleForMatching)}
                              className={`py-1 px-2.5 text-[10px] rounded-lg transition-all ${
                                isQueued ? "bg-hack-green/20 text-hack-green font-600" : "hack-btn-primary"
                              }`}
                            >
                              {isQueued ? "Invitation Sent" : "Invite"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Search results fallback */
                    filteredProfiles.slice(0, 4).map((candidate) => {
                      const isQueued = queuedInvites.some(q => q.userId === candidate.id && q.role === currentSelectedRoleForMatching);
                      return (
                        <div
                          key={candidate.id}
                          className="p-3 rounded-xl border flex items-center justify-between bg-white/2 border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              onClick={() => navigate(`/profile/${candidate.id}`)}
                              className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-white/5 cursor-pointer hover:border-hack-primary/50 hover:ring-2 hover:ring-hack-primary/30 transition-all"
                            >
                              <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div 
                                onClick={() => navigate(`/profile/${candidate.id}`)}
                                className="text-white text-xs font-600 cursor-pointer hover:text-hack-primary transition-colors"
                              >
                                {candidate.name}
                              </div>
                              <div className="text-[10px] text-white/40">{candidate.role} · {candidate.location}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {candidate.skills.slice(0, 3).map(s => (
                                  <span key={s} className="tag text-[9px] py-0">{s}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[10px] text-white font-600">★ {candidate.rating}</div>
                              <div className="text-[9px] text-white/30">Trust Score: {candidate.trustScore}%</div>
                            </div>
                            <button
                              disabled={isQueued}
                              onClick={() => openInvitePopup(candidate, currentSelectedRoleForMatching)}
                              className={`py-1 px-2.5 text-[10px] rounded-lg transition-all ${
                                isQueued ? "bg-hack-green/20 text-hack-green font-600" : "hack-btn-primary"
                              }`}
                            >
                              {isQueued ? "Invitation Sent" : "Invite"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 9: POPUP PREVIEW (handled inside Step 8 as modal, but let's implement step UI as confirmation summary of sent invites) --- */}
        {currentStep === 9 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Invitation Summary</h3>
            <p className="text-white/45 text-xs">Confirm the list of invitations you have queued to send to candidates.</p>

            {queuedInvites.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-xs">
                No invitations queued yet. Go back to find matches or proceed to publish the team.
              </div>
            ) : (
              <div className="space-y-3">
                {queuedInvites.map((invite, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div>
                      <div className="text-white font-600 text-sm">{invite.name}</div>
                      <div className="text-xs text-hack-primary">Role: {invite.role}</div>
                      <p className="text-white/40 text-xs mt-1.5 italic">"{invite.message}"</p>
                    </div>
                    <button
                      onClick={() => setQueuedInvites(queuedInvites.filter((_, i) => i !== idx))}
                      className="text-white/40 hover:text-hack-red text-xs transition-colors p-1"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- STEP 10: PUBLISH TEAM --- */}
        {currentStep === 10 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-white font-700 text-lg">Publish Team Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/2 border border-white/6">
              <div className="space-y-4">
                <div>
                  <span className="text-white/30 text-xs font-500 block mb-0.5">Team Name</span>
                  <div className="text-white font-700 text-lg">{teamName}</div>
                </div>
                <div>
                  <span className="text-white/30 text-xs font-500 block mb-0.5">Event Context</span>
                  <div className="text-white text-sm">
                    {teamType === "registered"
                      ? registeredHackathons.find(h => h.id === selectedHackathonId)?.title
                      : teamType === "external"
                      ? extName
                      : projName}
                  </div>
                </div>
                <div>
                  <span className="text-white/30 text-xs font-500 block mb-0.5">Visibility</span>
                  <div className="text-white text-sm capitalize">{visibility.replace("_", " ")}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-white/30 text-xs font-500 block mb-0.5">Open Capacity</span>
                  <div className="text-white text-sm">1 / {maxCapacity} Members</div>
                </div>
                <div>
                  <span className="text-white/30 text-xs font-500 block mb-0.5">Required Roles</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {requiredRoles.map(r => (
                      <span key={r.role} className="tag text-[10px]">{r.role} ({r.qty})</span>
                    ))}
                  </div>
                </div>
                {problemStatement && (
                  <div>
                    <span className="text-white/30 text-xs font-500 block mb-0.5">Problem Statement</span>
                    <p className="text-white/50 text-xs leading-relaxed line-clamp-2">{problemStatement}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Select Team Leader Dropdown */}
            <div className="p-6 rounded-2xl bg-white/2 border border-white/6 mt-4 space-y-3">
              <label className="text-white/60 text-xs font-500 block">Select Team Leader *</label>
              <select
                value={selectedLeaderId}
                onChange={(e) => setSelectedLeaderId(e.target.value)}
                className="hack-input text-sm"
              >
                <option value="me" style={{ background: "#131826" }}>Me ({user?.name || "Creator"})</option>
                {queuedInvites.map((q) => (
                  <option key={q.userId} value={q.userId} style={{ background: "#131826" }}>
                    {q.name} ({q.role})
                  </option>
                ))}
              </select>
              <p className="text-white/40 text-[11px] leading-relaxed">
                Choose who will be designated as the Team Leader. If you choose another user, they will receive a team invitation for the Leader role, and you will be a Developer.
              </p>
            </div>
          </div>
        )}

        {/* --- FOOTER / ACTIONS NAVIGATION --- */}
        {currentStep <= 10 && (
          <div className="pt-6 border-t border-white/6 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="hack-btn-secondary px-6 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Back
            </button>

            <div className="flex gap-2">
              {currentStep === 10 ? (
                <>
                  <button
                    onClick={() => handleSubmitTeam(true)}
                    disabled={isSubmitting}
                    className="hack-btn-secondary"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => handleSubmitTeam(false)}
                    disabled={isSubmitting}
                    className="hack-btn-primary px-8"
                  >
                    {isSubmitting ? (
                      <><Loader2 size={15} className="animate-spin" /> Creating...</>
                    ) : (
                      <>Create Team</>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleNext}
                  className="hack-btn-primary px-8"
                >
                  Next <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- INVITATION MESSAGE POPUP DIALOG --- */}
      {showInvitePopup && candidateToInvite && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="hack-card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-700 text-lg">Send Invitation</h2>
              <button onClick={() => setShowInvitePopup(false)} className="text-white/45 hover:text-white/70">✕</button>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src={candidateToInvite.avatar} alt={candidateToInvite.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-white font-600 text-sm">{candidateToInvite.name}</div>
                  <div className="text-xs text-white/40">{candidateToInvite.role}</div>
                </div>
              </div>

              <div>
                <span className="text-white/50 text-[11px] block mb-1">Desired Invite Role</span>
                <div className="text-white text-sm font-600">{inviteRoleName}</div>
              </div>

              <div>
                <label className="text-white/50 text-[11px] block mb-1.5">Optional Message</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value.slice(0, 150))}
                  placeholder="Hi! I loved your skills..."
                  className="hack-input text-xs h-20 resize-none"
                />
                <div className="text-right text-[10px] text-white/30">
                  {inviteMessage.length} / 150 characters
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowInvitePopup(false)}
                  className="hack-btn-secondary flex-1 justify-center py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmInvite}
                  className="hack-btn-primary flex-1 justify-center py-2 text-xs"
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pseudo SVG icons for personal project card
function Code(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
