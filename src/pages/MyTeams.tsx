import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, Users, Calendar, ArrowRight, Settings, MessageSquare,
  LayoutGrid, CheckCircle, Clock, Star, ExternalLink, Trash2,
  Sparkles, RefreshCw, AlertTriangle, AlertCircle, Play, Ban, Shield
} from "lucide-react";
import { Team, Teammate, Hackathon, TeamMember } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { deserializeHackathon } from "@/lib/utils";

const STATUS_CONFIG = {
  recruiting: { label: "Recruiting", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  ready: { label: "Ready", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  full: { label: "Full", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  submission_pending: { label: "Submission Pending", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  completed: { label: "Completed", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  archived: { label: "Archived", color: "#9CA3AF", bg: "rgba(156,163,175,0.12)" },
};

const TABS = ["Overview", "Tasks", "Chat", "Settings"];

interface TaskItem {
  id: string;
  title: string;
  status: "Todo" | "In Progress" | "Testing" | "Done";
  assignedTo?: string;
  assignedName?: string;
}

function TeamDetailPanel({ team, user, onUpdate, onClose }: { team: any; user: any; onUpdate: () => void; onClose: () => void }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");

  // Kanban state
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);

  // Settings State
  const [teamName, setTeamName] = useState(team.name);
  const [teamDesc, setTeamDesc] = useState(team.description);
  const [maxMems, setMaxMems] = useState(team.maxMembers);
  const [teamProgress, setTeamProgress] = useState(team.progress);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Replacement Suggestions
  const [showReplacementFinder, setShowReplacementFinder] = useState(false);
  const [replacementRole, setReplacementRole] = useState("");
  const [replacementCandidates, setReplacementCandidates] = useState<any[]>([]);
  const [loadingReplacements, setLoadingReplacements] = useState(false);

  // Check if current user is leader
  const isLeader = team.members.some((m: any) => m.id === user?.id && m.role === "leader");

  // Load Kanban Tasks
  useEffect(() => {
    const saved = localStorage.getItem(`tasks_${team.id}`);
    if (saved) {
      setTasks(JSON.parse(saved));
    } else {
      const defaultTasks: TaskItem[] = [
        { id: "1", title: "Set up repository & environment", status: "Done", assignedName: team.members[0]?.name },
        { id: "2", title: "Design database schemas", status: "In Progress", assignedName: team.members[0]?.name },
        { id: "3", title: "Create frontend wireframes", status: "Todo" }
      ];
      setTasks(defaultTasks);
      localStorage.setItem(`tasks_${team.id}`, JSON.stringify(defaultTasks));
    }
  }, [team.id]);

  const saveTasks = (updated: TaskItem[]) => {
    setTasks(updated);
    localStorage.setItem(`tasks_${team.id}`, JSON.stringify(updated));
  };

  // Add Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const assigneeObj = team.members.find((m: any) => m.id === newTaskAssignee);
    
    const item: TaskItem = {
      id: Math.random().toString(),
      title: newTaskTitle.trim(),
      status: "Todo",
      assignedTo: newTaskAssignee,
      assignedName: assigneeObj ? assigneeObj.name : undefined
    };

    const updated = [...tasks, item];
    saveTasks(updated);
    setNewTaskTitle("");
    setNewTaskAssignee("");
    setShowAddTask(false);
    toast.success("Task added successfully!");
  };

  // Move Task Status
  const handleMoveTask = (id: string, newStatus: TaskItem["status"]) => {
    const updated = tasks.map(t => t.id === id ? { ...t, status: newStatus } : t);
    saveTasks(updated);
  };

  // Delete Task
  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
    toast.info("Task deleted.");
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      // Re-serialize description metadata
      const teamMeta = {
        visibility: team.visibility || "public",
        problem_statement: team.problemStatement || "",
        required_roles: team.requiredRolesObj || [],
        tasks: [],
        announcements: [],
        creator_id: team.leader?.id,
        is_draft: false
      };
      const serializedDescription = `${teamDesc}\n\n---METADATA---\n${JSON.stringify(teamMeta)}`;

      const { error } = await supabase
        .from("teams")
        .update({
          name: teamName,
          description: serializedDescription,
          max_members: maxMems,
          progress: teamProgress
        })
        .eq("id", team.id);

      if (error) throw error;

      // On-demand creation of team room if published now
      try {
        const { data: existingConvo } = await supabase
          .from("conversations")
          .select("id")
          .eq("is_team", true)
          .eq("team_id", team.id)
          .maybeSingle();

        if (!existingConvo) {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({
              is_team: true,
              team_id: team.id
            })
            .select("id")
            .single();

          if (newConv) {
            const { data: teamMems } = await supabase
              .from("team_members")
              .select("user_id")
              .eq("team_id", team.id);

            if (teamMems && teamMems.length > 0) {
              const memberRows = teamMems.map((m: any) => ({
                conversation_id: newConv.id,
                user_id: m.user_id
              }));
              await supabase.from("conversation_members").insert(memberRows);
            }

            await supabase
              .from("messages")
              .insert({
                conversation_id: newConv.id,
                sender_id: user?.id,
                content: `system:${user?.name || "Team Leader"} published the team.`
              });
          }
        }
      } catch (convoErr) {
        console.error("Error ensuring team room on publish:", convoErr);
      }

      toast.success("Team settings saved!");
      onUpdate();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Leave Team
  const handleLeaveTeam = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", team.id)
        .eq("user_id", user.id);
      
      if (error) throw error;

      // Delete from team room conversation and post system message
      try {
        const { data: convo } = await supabase
          .from("conversations")
          .select("id")
          .eq("is_team", true)
          .eq("team_id", team.id)
          .maybeSingle();

        if (convo) {
          await supabase
            .from("messages")
            .insert({
              conversation_id: convo.id,
              sender_id: user.id,
              content: `system:${user.name} left the team.`
            });

          await supabase
            .from("conversation_members")
            .delete()
            .eq("conversation_id", convo.id)
            .eq("user_id", user.id);
        }
      } catch (chatErr) {
        console.error("Error managing leave team room:", chatErr);
      }

      // Notify leader that a slot has become vacant
      if (team.leader?.id) {
        // Find leaving member's role
        const memberObj = team.members.find((m: any) => m.id === user.id);
        const vacantRole = memberObj ? memberObj.role : "Developer";

        await supabase
          .from("notifications")
          .insert({
            user_id: team.leader.id,
            type: "team",
            title: "Member Left Team",
            description: `Teammate ${user.name} has left Team ${team.name}. The ${vacantRole} slot is now vacant.`,
            action_url: "/my-teams",
            action_label: "Find Replacement"
          });
      }

      toast.success("You have left the team.");
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to leave team.");
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId: string, memberName: string, memberRole: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", team.id)
        .eq("user_id", memberId);

      if (error) throw error;

      // Delete from team room conversation and post system message
      try {
        const { data: convo } = await supabase
          .from("conversations")
          .select("id")
          .eq("is_team", true)
          .eq("team_id", team.id)
          .maybeSingle();

        if (convo) {
          await supabase
            .from("messages")
            .insert({
              conversation_id: convo.id,
              sender_id: user?.id,
              content: `system:${memberName} was removed from the team.`
            });

          await supabase
            .from("conversation_members")
            .delete()
            .eq("conversation_id", convo.id)
            .eq("user_id", memberId);
        }
      } catch (chatErr) {
        console.error("Error managing remove member from team room:", chatErr);
      }

      // Add notification to candidate
      await supabase
        .from("notifications")
        .insert({
          user_id: memberId,
          type: "team",
          title: "Removed from Team",
          description: `You have been removed from Team ${team.name}.`,
          action_url: "/discover-teams",
          action_label: "Find Other Teams"
        });

      toast.info(`Removed ${memberName} from team.`);
      onUpdate();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to remove member.");
    }
  };

  // Find Replacement flow
  const triggerFindReplacement = async (roleName: string) => {
    setReplacementRole(roleName);
    setShowReplacementFinder(true);
    setLoadingReplacements(true);
    try {
      // Query profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id);
      
      const { data: skillsData } = await supabase
        .from("user_skills")
        .select("user_id, skills (name)");

      const userSkillsMap: Record<string, string[]> = {};
      if (skillsData) {
        skillsData.forEach((row: any) => {
          const sName = row.skills?.name;
          if (sName && row.user_id) {
            if (!userSkillsMap[row.user_id]) userSkillsMap[row.user_id] = [];
            userSkillsMap[row.user_id].push(sName);
          }
        });
      }

      const formatted = (profiles || []).map((p: any) => {
        let score = 65;
        const candidateRole = (p.role || "").toLowerCase();
        const searchRole = roleName.toLowerCase();
        if (candidateRole.includes(searchRole) || searchRole.includes(candidateRole)) {
          score += 20;
        }

        return {
          id: p.id,
          name: p.name,
          role: p.role || "Full Stack Developer",
          skills: userSkillsMap[p.id] || [],
          trustScore: p.trust_score || 0,
          avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
          matchScore: score,
          why: `Strong profile matching vacant role '${roleName}'.`
        };
      }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 4);

      setReplacementCandidates(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReplacements(false);
    }
  };

  const inviteReplacement = async (candidate: any) => {
    try {
      const { error } = await supabase
        .from("team_requests")
        .insert({
          team_id: team.id,
          sender_id: user.id,
          receiver_id: candidate.id,
          role: replacementRole,
          message: `We have a vacant ${replacementRole} slot in Team ${team.name} and would love to have you join us!`,
          status: "pending",
          request_type: "invite"
        });
      
      if (error) throw error;

      await supabase
        .from("notifications")
        .insert({
          user_id: candidate.id,
          type: "team",
          title: "Replacement Invitation",
          description: `You have been invited to join Team ${team.name} as a replacement ${replacementRole}.`,
          action_url: "/my-requests",
          action_label: "Review Invitation"
        });

      toast.success(`Invitation sent to ${candidate.name}!`);
      setShowReplacementFinder(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to invite candidate.");
    }
  };

  // Dynamic Status derived
  let currentStatus = team.status;
  if (team.progress === 100) {
    currentStatus = "completed";
  } else if (team.members.length >= team.maxMembers) {
    currentStatus = "full";
  } else if (team.members.length >= 2) {
    currentStatus = "ready";
  }
  const statusConfig = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.recruiting;

  // Identify vacant slots
  const filledRoles = team.members.map((m: any) => m.role.toLowerCase());
  const vacantRoles = (team.requiredRolesObj || []).filter(
    (roleObj: any) => !filledRoles.includes(roleObj.role.toLowerCase())
  );

  return (
    <div
      className="fixed inset-y-0 right-0 w-full max-w-[500px] z-50 flex flex-col"
      style={{
        background: "#0E111B",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="p-6 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: `${team.color}15`, border: `1px solid ${team.color}25` }}
            >
              {team.icon}
            </div>
            <div>
              <h2 className="text-white font-700 text-lg leading-tight">{team.name}</h2>
              <div className="text-white/40 text-xs truncate max-w-[280px]">{team.hackathon}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 p-1">✕</button>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-600 capitalize"
            style={{ background: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-600"
            style={{
              background: team.is_draft ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
              color: team.is_draft ? "#EF4444" : "#22C55E",
              border: `1px solid ${team.is_draft ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`
            }}
          >
            {team.is_draft ? "Draft Team" : "Created Team"}
          </span>
          <span className="text-white/40 text-xs ml-1">{team.members.length}/{team.maxMembers} Members</span>
        </div>
      </div>

      {/* Tabs list */}
      <div
        className="flex px-4 pt-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {TABS.map((tab) => {
          if (tab === "Settings" && !isLeader) return null; // Only leader views settings tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-500 transition-all relative ${
                activeTab === tab ? "text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "#7C5CFF" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* --- TAB 1: OVERVIEW --- */}
        {activeTab === "Overview" && (
          <div className="space-y-5">
            {/* Vacant slot alerts for leader */}
            {isLeader && vacantRoles.length > 0 && (
              <div className="p-4 rounded-2xl bg-hack-orange/10 border border-hack-orange/20 space-y-3">
                <div className="flex items-center gap-2 text-hack-orange text-xs font-600">
                  <AlertTriangle size={15} />
                  <span>Vacant Roles Alert</span>
                </div>
                {vacantRoles.map((roleObj: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                    <span className="text-white/60">{roleObj.role} slot is now vacant.</span>
                    <button
                      onClick={() => triggerFindReplacement(roleObj.role)}
                      className="px-2.5 py-1 rounded bg-hack-orange/20 hover:bg-hack-orange/30 text-hack-orange font-600"
                    >
                      Find Replacement
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <span className="text-white/30 text-xs block mb-1">Description</span>
              <p className="text-white/60 text-sm leading-relaxed">{team.description}</p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white/40 text-xs">Progress</span>
                <span className="text-white font-600 text-sm">{team.progress}%</span>
              </div>
              <div className="progress-bar h-2 rounded-full">
                <div className="progress-fill h-full rounded-full" style={{ width: `${team.progress}%` }} />
              </div>
            </div>

            <div>
              <h3 className="text-white font-600 text-sm mb-3">Team Members ({team.members.length})</h3>
              <div className="space-y-3">
                {team.members.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-hack-primary/20">
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-500 flex items-center gap-1.5">
                          {member.name}
                          {member.role === "leader" && <Shield size={11} className="text-hack-primary" />}
                        </div>
                        <div className="text-white/40 text-xs capitalize">{member.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/messages?team_id=${team.id}`)}
                        className="text-white/35 hover:text-white/70 p-1.5"
                      >
                        <MessageSquare size={13} />
                      </button>
                      {isLeader && member.id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name, member.role)}
                          className="text-white/35 hover:text-hack-red p-1.5"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!isLeader && (
              <button
                onClick={handleLeaveTeam}
                className="hack-btn-secondary w-full justify-center py-2.5 text-hack-red/80 hover:bg-hack-red/5 hover:border-hack-red/25 mt-4"
              >
                Leave Team
              </button>
            )}
          </div>
        )}

        {/* --- TAB 2: INTERACTIVE KANBAN TASKS --- */}
        {activeTab === "Tasks" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-600 text-sm">Kanban Board</h3>
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                className="hack-btn-primary py-1.5 px-3 text-xs"
              >
                + Add Task
              </button>
            </div>

            {/* Task adder panel */}
            {showAddTask && (
              <form onSubmit={handleAddTask} className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3 animate-fade-in">
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task Title (e.g. Implement Oauth)"
                  className="hack-input text-xs"
                />
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="hack-input text-xs"
                >
                  <option value="" style={{ background: "#131826" }}>-- Assign Member --</option>
                  {team.members.map((m: any) => (
                    <option key={m.id} value={m.id} style={{ background: "#131826" }}>{m.name}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowAddTask(false)} className="hack-btn-secondary py-1 text-xs">Cancel</button>
                  <button type="submit" className="hack-btn-primary py-1 text-xs">Add</button>
                </div>
              </form>
            )}

            {/* Kanban Columns */}
            <div className="space-y-4">
              {(["Todo", "In Progress", "Testing", "Done"] as const).map((col) => {
                const colTasks = tasks.filter(t => t.status === col);
                return (
                  <div
                    key={col}
                    className="p-4 rounded-xl border border-white/5"
                    style={{ background: "rgba(255,255,255,0.01)" }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-white/60 text-xs font-700 uppercase">{col}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{colTasks.length}</span>
                    </div>

                    <div className="space-y-2">
                      {colTasks.length === 0 ? (
                        <div className="text-center py-4 text-[10px] text-white/20">No tasks in this column</div>
                      ) : (
                        colTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 rounded-lg bg-white/2 border border-white/6 space-y-2 text-xs flex flex-col justify-between"
                          >
                            <div className="text-white/80 font-500">{task.title}</div>
                            {task.assignedName && (
                              <div className="text-[10px] text-white/40">Assignee: {task.assignedName}</div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                              {/* Status picker */}
                              <select
                                value={task.status}
                                onChange={(e) => handleMoveTask(task.id, e.target.value as any)}
                                className="bg-white/5 text-white/50 text-[10px] py-0.5 px-1.5 rounded cursor-pointer border-none"
                              >
                                {["Todo", "In Progress", "Testing", "Done"].map(s => (
                                  <option key={s} value={s} style={{ background: "#131826" }}>{s}</option>
                                ))}
                              </select>

                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-white/30 hover:text-hack-red"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 3: REAL-TIME TEAM CHAT REDIRECT --- */}
        {activeTab === "Chat" && (
          <div className="text-center py-12 space-y-4">
            <div
              className="w-14 h-14 rounded-2xl mx-auto bg-hack-primary/10 flex items-center justify-center text-hack-primary"
            >
              <MessageSquare size={24} />
            </div>
            <div>
              <h4 className="text-white font-600 text-sm">Real-time Team Chat</h4>
              <p className="text-white/40 text-xs max-w-xs mx-auto leading-relaxed mt-1">
                Collaborate instantly with team members, share live updates, and schedule meetings.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                navigate(`/messages?team_id=${team.id}`);
              }}
              className="hack-btn-primary px-6 py-2.5 mx-auto text-xs"
            >
              Open Team Room Chat
            </button>
          </div>
        )}

        {/* --- TAB 4: SETTINGS (Leader Only) --- */}
        {activeTab === "Settings" && isLeader && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="text-white/60 text-xs font-500 block mb-1">Team Name</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="hack-input text-xs"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs font-500 block mb-1">Team Description</label>
              <textarea
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                className="hack-input text-xs h-24 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs font-500 block mb-1">Max Capacity</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={maxMems}
                  onChange={(e) => setMaxMems(Number(e.target.value))}
                  className="hack-input text-xs"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-500 block mb-1">Project Progress (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={teamProgress}
                  onChange={(e) => setTeamProgress(Number(e.target.value))}
                  className="hack-input text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="hack-btn-primary w-full justify-center py-2.5 text-xs mt-3"
            >
              {isSavingSettings ? "Saving Settings..." : "Save Settings"}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/6 flex-shrink-0">
        <button
          onClick={() => {
            onClose();
            navigate(`/messages?team_id=${team.id}`);
          }}
          className="hack-btn-primary w-full justify-center py-2.5 text-sm"
        >
          <ExternalLink size={14} />
          Open Full Workspace chat
        </button>
      </div>

      {/* --- REPLACEMENT MATCHES MODAL --- */}
      {showReplacementFinder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="hack-card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-white font-800 text-sm">Find Replacement: {replacementRole}</h2>
              <button onClick={() => setShowReplacementFinder(false)} className="text-white/40 hover:text-white/70">✕</button>
            </div>

            {loadingReplacements ? (
              <div className="py-8 text-center text-white/40 flex flex-col items-center gap-2">
                <Loader2 size={20} className="animate-spin text-hack-primary" />
                <span className="text-xs">Finding matches...</span>
              </div>
            ) : replacementCandidates.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-xs">No matching candidates found.</div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {replacementCandidates.map((candidate) => (
                  <div key={candidate.id} className="p-3 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-white text-xs font-600">{candidate.name}</div>
                        <div className="text-[10px] text-hack-green mt-0.5">{candidate.why}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => inviteReplacement(candidate)}
                      className="hack-btn-primary py-1 px-3 text-[10px]"
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const loadUserTeams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: memberships, error: memberErr } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);
      
      if (memberErr) throw memberErr;

      if (!memberships || memberships.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      const teamIds = memberships.map(m => m.team_id);
      
      const { data: teamsData, error: teamsErr } = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds);
      
      if (teamsErr) throw teamsErr;

      const { data: hackathonsData } = await supabase
        .from("hackathons")
        .select("id, title");
      
      const hackonMap = (hackathonsData || []).reduce((acc: any, h: any) => {
        acc[h.id] = h.title;
        return acc;
      }, {});

      // Fetch memberships details including roles & user profiles
      const { data: allMemberships, error: membersErr } = await supabase
        .from("team_members")
        .select("team_id, role, user_id, profiles (*)")
        .in("team_id", teamIds);
      
      if (membersErr) throw membersErr;

      // Group members by team_id
      const membersMap: Record<string, any[]> = {};
      const leaderMap: Record<string, any> = {};

      (allMemberships || []).forEach((m: any) => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        const formattedMem = {
          id: m.user_id,
          name: profile?.name || "Unknown Builder",
          avatar: profile?.linkedin_avatar || profile?.github_avatar || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name || "builder"}`,
          role: m.role || "Member",
        };

        if (!membersMap[m.team_id]) {
          membersMap[m.team_id] = [];
        }
        membersMap[m.team_id].push(formattedMem);

        if (m.role === "leader") {
          leaderMap[m.team_id] = formattedMem;
        }
      });

      const formatted = (teamsData || []).map((t: any) => {
        let visibility = "public";
        let problemStatement = "";
        let requiredRolesObj = [];
        let cleanDesc = t.description || "";
        let isDraft = false;

        const parts = cleanDesc.split("\n\n---METADATA---\n");
        if (parts.length > 1) {
          cleanDesc = parts[0];
          try {
            const meta = JSON.parse(parts[1]);
            visibility = meta.visibility || "public";
            problemStatement = meta.problem_statement || "";
            requiredRolesObj = meta.required_roles || [];
            isDraft = !!meta.is_draft;
          } catch (e) {
            console.error(e);
          }
        }

        const teamMems = membersMap[t.id] || [];
        const leader = leaderMap[t.id] || { id: "", name: "Unknown", avatar: "" };

        return {
          id: t.id,
          name: t.name,
          hackathon: hackonMap[t.hackathon_id] || "Collaboration Project",
          members: teamMems,
          maxMembers: t.max_members || 4,
          progress: t.progress || 0,
          status: t.status || "recruiting",
          description: cleanDesc,
          category: t.category || "General",
          color: t.color || "#7C5CFF",
          icon: t.icon || "🎯",
          leader,
          visibility,
          problemStatement,
          requiredRolesObj,
          is_draft: isDraft
        };
      });

      setTeams(formatted);
      
      // Update selectedTeam state dynamically if it's currently open
      if (selectedTeam) {
        const fresh = formatted.find(f => f.id === selectedTeam.id);
        if (fresh) setSelectedTeam(fresh);
      }
    } catch (err) {
      console.error("Error loading user teams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserTeams();
  }, [user]);

  const filters = ["All", "Recruiting", "Ready", "Full", "Completed"];
  
  const filteredTeams = teams.filter((t) => {
    if (activeFilter === "All") return true;
    
    // Dynamically derive current status for filters
    let currentStatus = t.status;
    if (t.progress === 100) {
      currentStatus = "completed";
    } else if (t.members.length >= t.maxMembers) {
      currentStatus = "full";
    } else if (t.members.length >= 2) {
      currentStatus = "ready";
    }
    
    return currentStatus.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="p-6 lg:p-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-800 text-2xl md:text-3xl mb-1">My Teams</h1>
          <p className="text-white/40 text-sm">Review status, manage boards, and chat with your teammates</p>
        </div>
        <Link to="/create-team" className="hack-btn-primary">
          <Plus size={16} />
          Create Team
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="px-4 py-2 rounded-xl text-sm font-500 transition-all border"
            style={{
              background: activeFilter === f ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.04)",
              color: activeFilter === f ? "#A78BFF" : "rgba(255,255,255,0.45)",
              borderColor: activeFilter === f ? "rgba(124,92,255,0.25)" : "rgba(255,255,255,0.07)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 hack-card">
          <div className="text-5xl mb-4">🚀</div>
          <h3 className="text-white font-600 text-lg mb-2">No teams joined yet</h3>
          <p className="text-white/40 text-sm mb-4">Start your own team or browse and apply to join active recruiting squads.</p>
          <div className="flex justify-center gap-3">
            <Link to="/create-team" className="hack-btn-primary py-2 px-4 text-xs">Create Team</Link>
            <Link to="/discover-teams" className="hack-btn-secondary py-2 px-4 text-xs">Browse Teams</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTeams.map((team) => {
            // Dynamically derive current status
            let currentStatus = team.status;
            if (team.progress === 100) {
              currentStatus = "completed";
            } else if (team.members.length >= team.maxMembers) {
              currentStatus = "full";
            } else if (team.members.length >= 2) {
              currentStatus = "ready";
            }
            const statusConfig = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.recruiting;

            return (
              <div
                key={team.id}
                className="hack-card p-6 cursor-pointer flex flex-col justify-between"
                onClick={() => setSelectedTeam(team)}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                        style={{ background: `${team.color}15`, border: `1px solid ${team.color}25` }}
                      >
                        {team.icon}
                      </div>
                      <div>
                        <h3 className="text-white font-700 text-base">{team.name}</h3>
                        <div className="text-white/40 text-xs truncate max-w-[150px]">{team.hackathon}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-600 capitalize"
                        style={{ background: statusConfig.bg, color: statusConfig.color }}
                      >
                        {statusConfig.label}
                      </span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[9px] font-600"
                        style={{
                          background: team.is_draft ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                          color: team.is_draft ? "#EF4444" : "#22C55E",
                          border: `1px solid ${team.is_draft ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`
                        }}
                      >
                        {team.is_draft ? "Draft Team" : "Created Team"}
                      </span>
                    </div>
                  </div>

                  <p className="text-white/40 text-xs leading-relaxed mb-4 line-clamp-2">
                    {team.description}
                  </p>

                  {/* Members list avatars */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((m: any, i: number) => (
                        <div
                          key={m.id}
                          className="w-8 h-8 rounded-full overflow-hidden border-2"
                          style={{ borderColor: "#131826" }}
                        >
                          <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {team.maxMembers - team.members.length > 0 && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white/50 border-2"
                          style={{ background: "rgba(255,255,255,0.05)", borderColor: "#131826" }}
                        >
                          +{team.maxMembers - team.members.length}
                        </div>
                      )}
                    </div>
                    <span className="text-white/30 text-xs">{team.members.length}/{team.maxMembers} members</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/40">Progress</span>
                      <span className="text-white/60 font-600">{team.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${team.progress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="hack-btn-primary flex-1 justify-center py-2 text-sm"
                    onClick={(e) => { e.stopPropagation(); setSelectedTeam(team); }}
                  >
                    Open Workspace
                  </button>
                  <button
                    className="hack-btn-secondary px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTeam(team);
                      setActiveTab("Settings");
                    }}
                  >
                    <Settings size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workspace Side Panel */}
      {selectedTeam && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-45"
            onClick={() => setSelectedTeam(null)}
          />
          <TeamDetailPanel
            team={selectedTeam}
            user={user}
            onUpdate={loadUserTeams}
            onClose={() => setSelectedTeam(null)}
          />
        </>
      )}
    </div>
  );
}
