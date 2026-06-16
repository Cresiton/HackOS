import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { matchService, MatchProfile } from "@/lib/matchService";
import { matchHistoryService, ActivityLog } from "@/lib/matchHistoryService";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  Heart, UserCheck, Bookmark, Send, ShieldCheck, MapPin, Loader2,
  Eye, UserX, Users, Search, Filter, Calendar, Star, CheckCircle2,
  XCircle, Clock, ArrowRight, UserPlus, Trash2, Tag, RefreshCw
} from "lucide-react";

type HistoryTab = "activities" | "interested" | "favorites" | "invited" | "accepted" | "rejected" | "team_members";

export default function MatchHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HistoryTab>("activities");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Categorized datasets
  const [data, setData] = useState<{
    interested: any[];
    favorites: any[];
    invited: any[];
    accepted: any[];
    rejected: any[];
    teamMembers: any[];
    activities: ActivityLog[];
  }>({
    interested: [],
    favorites: [],
    invited: [],
    accepted: [],
    rejected: [],
    teamMembers: [],
    activities: []
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { swipes, saves, invites, teamMembers } = await matchHistoryService.getCategorizedMatches(user.id);
      
      // Get all unique user IDs we need details for
      const userIds = new Set<string>();
      swipes.forEach(s => userIds.add(s.target_id));
      saves.forEach(s => userIds.add(s.target_id));
      invites.forEach(i => userIds.add(i.receiver_id));
      teamMembers.forEach(m => userIds.add(m.user_id));
      
      const userIdArray = Array.from(userIds);
      
      let profileMap: Record<string, MatchProfile> = {};
      if (userIdArray.length > 0) {
        // Fetch profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, github_avatar, linkedin_avatar, role, location, bio, trust_score, availability, rating")
          .in("id", userIdArray);
          
        // Fetch skills for these profiles
        const { data: skillsData } = await supabase
          .from("user_skills")
          .select("user_id, skills (name)")
          .in("user_id", userIdArray);
          
        const skillsMap: Record<string, string[]> = {};
        if (skillsData) {
          skillsData.forEach((row: any) => {
            const skillName = row.skills?.name;
            if (skillName && row.user_id) {
              if (!skillsMap[row.user_id]) skillsMap[row.user_id] = [];
              skillsMap[row.user_id].push(skillName);
            }
          });
        }
        
        if (profilesData) {
          profilesData.forEach((p: any) => {
            profileMap[p.id] = {
              ...p,
              trustScore: p.trust_score || 25,
              avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
              skills: skillsMap[p.id] || [],
              matchScore: 90,
            };
          });
        }
      }

      // Map swipes to profiles
      const interestedList = swipes
        .filter(s => s.action === "interested")
        .map(s => ({
          ...profileMap[s.target_id],
          actionDate: s.created_at
        }))
        .filter(p => !!p.id);

      // Map saves to profiles
      const favoritesList = saves
        .map(s => ({
          ...profileMap[s.target_id],
          actionDate: s.created_at
        }))
        .filter(p => !!p.id);

      // Map invitations
      const invitedList = invites
        .filter(i => i.status === "pending" || i.status === "expired")
        .map(i => ({
          ...profileMap[i.receiver_id],
          actionDate: i.created_at,
          invitationId: i.id,
          invitationStatus: i.status,
          role: i.role
        }))
        .filter(p => !!p.id);

      const acceptedList = invites
        .filter(i => i.status === "accepted")
        .map(i => ({
          ...profileMap[i.receiver_id],
          actionDate: i.created_at,
          invitationId: i.id,
          invitationStatus: i.status,
          role: i.role
        }))
        .filter(p => !!p.id);

      const rejectedList = invites
        .filter(i => i.status === "rejected")
        .map(i => ({
          ...profileMap[i.receiver_id],
          actionDate: i.created_at,
          invitationId: i.id,
          invitationStatus: i.status,
          role: i.role
        }))
        .filter(p => !!p.id);

      // Map team members
      const teamMembersList = teamMembers
        .map(m => ({
          ...profileMap[m.user_id],
          actionDate: m.created_at,
          role: m.role
        }))
        .filter(p => !!p.id);

      // Build database activities list
      const dbActivities: ActivityLog[] = [];
      invites.forEach(i => {
        const targetProf = profileMap[i.receiver_id];
        if (targetProf) {
          dbActivities.push({
            id: `invite-sent-${i.id}`,
            userId: user.id,
            actionType: "Invitation Sent",
            targetId: i.receiver_id,
            targetName: targetProf.name,
            targetRole: i.role || targetProf.role,
            createdAt: i.created_at
          });

          if (i.status === "accepted") {
            dbActivities.push({
              id: `invite-accepted-${i.id}`,
              userId: user.id,
              actionType: "Invitation Accepted",
              targetId: i.receiver_id,
              targetName: targetProf.name,
              targetRole: i.role || targetProf.role,
              createdAt: i.created_at // fallback date
            });
          } else if (i.status === "rejected") {
            dbActivities.push({
              id: `invite-rejected-${i.id}`,
              userId: user.id,
              actionType: "Invitation Rejected",
              targetId: i.receiver_id,
              targetName: targetProf.name,
              targetRole: i.role || targetProf.role,
              createdAt: i.created_at // fallback date
            });
          }
        }
      });

      saves.forEach(s => {
        const targetProf = profileMap[s.target_id];
        if (targetProf) {
          dbActivities.push({
            id: `save-${s.id}`,
            userId: user.id,
            actionType: "Profile Favorited",
            targetId: s.target_id,
            targetName: targetProf.name,
            targetRole: targetProf.role,
            createdAt: s.created_at
          });
        }
      });

      // Deduplicate locally logged vs database logged
      const localActivities = matchHistoryService.getLocalActivities(user.id);
      const unifiedActivities = [...localActivities];

      dbActivities.forEach(dbAct => {
        const isDuplicate = unifiedActivities.some(locAct => 
          locAct.actionType === dbAct.actionType && 
          locAct.targetId === dbAct.targetId &&
          Math.abs(new Date(locAct.createdAt).getTime() - new Date(dbAct.createdAt).getTime()) < 60000
        );
        if (!isDuplicate) {
          unifiedActivities.push(dbAct);
        }
      });

      unifiedActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setData({
        interested: interestedList,
        favorites: favoritesList,
        invited: invitedList,
        accepted: acceptedList,
        rejected: rejectedList,
        teamMembers: teamMembersList,
        activities: unifiedActivities
      });
    } catch (err) {
      console.error("Error loading match history:", err);
      toast.error("Failed to load match history records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleInviteFromFavorites = async (profile: any) => {
    if (!user) return;
    toast.loading(`Inviting ${profile.name}...`, { id: "history-invite" });
    try {
      const result = await matchHistoryService.sendTeammateInvitation(
        user.id,
        profile.id,
        profile.role
      );
      toast.dismiss("history-invite");
      if (result) {
        toast.success(`Invitation sent to ${profile.name}!`);
        loadData();
      } else {
        toast.error(`Could not invite ${profile.name}.`);
      }
    } catch (err) {
      console.error(err);
      toast.dismiss("history-invite");
      toast.error("Failed to process invitation.");
    }
  };

  const handleClearLogs = () => {
    if (!user) return;
    matchHistoryService.clearLocalActivities(user.id);
    toast.success("Local activity timeline logs cleared.");
    loadData();
  };

  // Filter Helpers
  const matchesSearch = (profile: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      profile.name?.toLowerCase().includes(q) ||
      profile.role?.toLowerCase().includes(q) ||
      profile.skills?.some((s: string) => s.toLowerCase().includes(q))
    );
  };

  const matchesRole = (profile: any) => {
    if (roleFilter === "all") return true;
    return profile.role === roleFilter;
  };

  const matchesSkill = (profile: any) => {
    if (skillFilter === "all") return true;
    return profile.skills?.includes(skillFilter);
  };

  const matchesStatus = (profile: any) => {
    if (statusFilter === "all" || !profile.invitationStatus) return true;
    return profile.invitationStatus === statusFilter;
  };

  const matchesDate = (actionDate: string) => {
    if (dateFilter === "all") return true;
    const date = new Date(actionDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (dateFilter === "today") return diffDays <= 1;
    if (dateFilter === "week") return diffDays <= 7;
    if (dateFilter === "month") return diffDays <= 30;
    return true;
  };

  // Filter combined profile results
  const getFilteredList = (list: any[]) => {
    return list.filter(profile => {
      return (
        matchesSearch(profile) &&
        matchesRole(profile) &&
        matchesSkill(profile) &&
        matchesStatus(profile) &&
        matchesDate(profile.actionDate)
      );
    });
  };

  // Filter activities
  const getFilteredActivities = () => {
    return data.activities.filter(act => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = act.targetName?.toLowerCase().includes(q);
        const roleMatch = act.targetRole?.toLowerCase().includes(q);
        const actionMatch = act.actionType?.toLowerCase().includes(q);
        if (!nameMatch && !roleMatch && !actionMatch) return false;
      }
      
      // Role filter
      if (roleFilter !== "all" && act.targetRole !== roleFilter) return false;
      
      // Date filter
      if (!matchesDate(act.createdAt)) return false;

      return true;
    });
  };

  // Formats relative time
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Timeline Event Helper Styling
  const getActivityStyles = (action: ActivityLog["actionType"]) => {
    switch (action) {
      case "Profile Viewed":
        return { icon: Eye, bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" };
      case "Profile Favorited":
      case "Profile Saved":
        return { icon: Bookmark, bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" };
      case "Invitation Sent":
        return { icon: Send, bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" };
      case "Invitation Accepted":
        return { icon: UserCheck, bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400" };
      case "Invitation Rejected":
        return { icon: UserX, bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" };
      case "Team Joined":
        return { icon: Users, bg: "bg-teal-500/10", border: "border-teal-500/30", text: "text-teal-400" };
      default:
        return { icon: Clock, bg: "bg-gray-500/10", border: "border-gray-500/30", text: "text-gray-400" };
    }
  };

  const tabsConfig = [
    { id: "activities", label: "Recent Activity", icon: Clock },
    { id: "interested", label: "Interested", icon: Heart },
    { id: "favorites", label: "Saved Favorites", icon: Bookmark },
    { id: "invited", label: "Invited", icon: Send },
    { id: "accepted", label: "Accepted", icon: CheckCircle2 },
    { id: "rejected", label: "Declined", icon: XCircle },
    { id: "team_members", label: "Team Members", icon: Users },
  ] as const;

  // Extracting popular filter values dynamically
  const getUniqueRoles = () => {
    const allFiltered = [
      ...data.interested,
      ...data.favorites,
      ...data.invited,
      ...data.accepted,
      ...data.rejected,
      ...data.teamMembers
    ];
    const rolesSet = new Set<string>();
    allFiltered.forEach(p => { if (p.role) rolesSet.add(p.role); });
    return Array.from(rolesSet);
  };

  const getUniqueSkills = () => {
    const allFiltered = [
      ...data.interested,
      ...data.favorites,
      ...data.invited,
      ...data.accepted,
      ...data.rejected,
      ...data.teamMembers
    ];
    const skillsSet = new Set<string>();
    allFiltered.forEach(p => {
      if (p.skills) p.skills.forEach((s: string) => skillsSet.add(s));
    });
    return Array.from(skillsSet).slice(0, 15);
  };

  const popularRoles = getUniqueRoles();
  const popularSkills = getUniqueSkills();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 relative z-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            Match History
            {refreshing && <Loader2 size={20} className="animate-spin text-hack-primary" />}
          </h2>
          <p className="text-white/40 text-sm mt-1">Track and manage teammate discovery, saves, requests, and interactions.</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white/80 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh database entries"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Sync DB
          </button>
          
          {activeTab === "activities" && data.activities.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="p-2.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl hover:bg-red-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <Trash2 size={14} />
              Clear Timeline
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-2 border-b border-white/10 pb-4 mb-6 overflow-x-auto no-scrollbar scroll-smooth">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          // Compute badges counts
          let count = 0;
          if (tab.id === "activities") count = data.activities.length;
          else if (tab.id === "interested") count = data.interested.length;
          else if (tab.id === "favorites") count = data.favorites.length;
          else if (tab.id === "invited") count = data.invited.length;
          else if (tab.id === "accepted") count = data.accepted.length;
          else if (tab.id === "rejected") count = data.rejected.length;
          else if (tab.id === "team_members") count = data.teamMembers.length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border
                ${isActive 
                  ? "bg-hack-primary/10 border-hack-primary/30 text-white" 
                  : "text-white/50 border-transparent hover:text-white hover:bg-white/5"
                }`}
            >
              <Icon size={14} className={isActive ? "text-hack-primary" : ""} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black leading-none
                  ${isActive ? "bg-hack-primary text-black" : "bg-white/10 text-white/50"}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters panel */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-3 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, skill..."
            className="w-full pl-10 pr-4 py-2 bg-[#1A1F2C] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-hack-primary transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          {/* Role filter */}
          <div className="flex items-center gap-1 bg-[#1A1F2C] border border-white/10 rounded-xl px-2.5 py-1">
            <Filter size={12} className="text-white/40" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-[11px] text-white/80 focus:outline-none py-1 cursor-pointer font-medium"
            >
              <option value="all" className="bg-[#1A1F2C]">All Roles</option>
              {popularRoles.map(role => (
                <option key={role} value={role} className="bg-[#1A1F2C]">{role}</option>
              ))}
            </select>
          </div>

          {/* Skill Filter */}
          <div className="flex items-center gap-1 bg-[#1A1F2C] border border-white/10 rounded-xl px-2.5 py-1">
            <Tag size={12} className="text-white/40" />
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="bg-transparent text-[11px] text-white/80 focus:outline-none py-1 cursor-pointer font-medium"
            >
              <option value="all" className="bg-[#1A1F2C]">All Skills</option>
              {popularSkills.map(skill => (
                <option key={skill} value={skill} className="bg-[#1A1F2C]">{skill}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-[#1A1F2C] border border-white/10 rounded-xl px-2.5 py-1">
            <Calendar size={12} className="text-white/40" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-[11px] text-white/80 focus:outline-none py-1 cursor-pointer font-medium"
            >
              <option value="all" className="bg-[#1A1F2C]">All Time</option>
              <option value="today" className="bg-[#1A1F2C]">Last 24 Hours</option>
              <option value="week" className="bg-[#1A1F2C]">Last 7 Days</option>
              <option value="month" className="bg-[#1A1F2C]">Last 30 Days</option>
            </select>
          </div>

          {/* Status Filter (Only active on Invited tab) */}
          {activeTab === "invited" && (
            <div className="flex items-center gap-1 bg-[#1A1F2C] border border-white/10 rounded-xl px-2.5 py-1">
              <Clock size={12} className="text-white/40" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[11px] text-white/80 focus:outline-none py-1 cursor-pointer font-medium"
              >
                <option value="all" className="bg-[#1A1F2C]">All States</option>
                <option value="pending" className="bg-[#1A1F2C]">Pending</option>
                <option value="expired" className="bg-[#1A1F2C]">Expired</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 flex flex-col justify-center items-center gap-4 text-white/40">
          <Loader2 size={36} className="animate-spin text-hack-primary" />
          <span className="text-xs font-semibold">Loading matchmaking logs...</span>
        </div>
      ) : (
        <div>
          {/* Tab Content: RECENT ACTIVITY (TIMELINE) */}
          {activeTab === "activities" && (
            <div className="relative border-l-2 border-white/10 pl-6 ml-4 space-y-6">
              {getFilteredActivities().length === 0 ? (
                <div className="py-16 text-center text-white/40 -ml-4 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Clock size={22} />
                  </div>
                  <p className="text-sm font-semibold">No recent activity logs matches.</p>
                </div>
              ) : (
                getFilteredActivities().map((act) => {
                  const style = getActivityStyles(act.actionType);
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative"
                    >
                      {/* Left timeline dot badge */}
                      <span className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full border-2 border-[#0F1219] flex items-center justify-center text-[10px] ${style.bg} ${style.text}`}>
                        <Icon size={12} />
                      </span>
                      
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/10 transition-colors">
                        <div>
                          <div className="text-xs text-white/40 flex items-center gap-2 mb-1">
                            <span className="font-semibold tracking-wide uppercase text-[9px] px-2 py-0.5 rounded-md bg-white/5">
                              {act.actionType}
                            </span>
                            •
                            <span>{formatTimeAgo(act.createdAt)}</span>
                          </div>
                          
                          <div className="text-white text-sm font-semibold">
                            Logged interaction with{" "}
                            <span 
                              onClick={() => navigate(`/profile/${act.targetId}`)}
                              className="text-hack-primary hover:underline cursor-pointer"
                            >
                              {act.targetName}
                            </span>
                            {act.targetRole && (
                              <span className="text-white/50 font-normal"> ({act.targetRole})</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/profile/${act.targetId}`)}
                          className="self-start sm:self-center px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-white/5"
                        >
                          View Profile
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab Content: PROFILES LIST GRIDS */}
          {activeTab !== "activities" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredList(
                activeTab === "interested" ? data.interested :
                activeTab === "favorites" ? data.favorites :
                activeTab === "invited" ? data.invited :
                activeTab === "accepted" ? data.accepted :
                activeTab === "rejected" ? data.rejected :
                data.teamMembers
              ).length === 0 ? (
                <div className="col-span-full py-16 text-center text-white/40 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    {activeTab === "interested" && <Heart size={26} className="text-white/30" />}
                    {activeTab === "favorites" && <Bookmark size={26} className="text-white/30" />}
                    {activeTab === "invited" && <Send size={26} className="text-white/30" />}
                    {activeTab === "accepted" && <CheckCircle2 size={26} className="text-white/30" />}
                    {activeTab === "rejected" && <XCircle size={26} className="text-white/30" />}
                    {activeTab === "team_members" && <Users size={26} className="text-white/30" />}
                  </div>
                  <h4 className="text-sm font-semibold">No developers found in this section.</h4>
                  <p className="text-xs text-white/30 mt-1">Try resetting filters or exploring the matchmaking wizard.</p>
                </div>
              ) : (
                getFilteredList(
                  activeTab === "interested" ? data.interested :
                  activeTab === "favorites" ? data.favorites :
                  activeTab === "invited" ? data.invited :
                  activeTab === "accepted" ? data.accepted :
                  activeTab === "rejected" ? data.rejected :
                  data.teamMembers
                ).map((profile, index) => (
                  <motion.div
                    key={profile.id + activeTab + index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col gap-4 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => navigate(`/profile/${profile.id}`)}
                        className="w-12 h-12 rounded-2xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-hack-primary transition-all flex-shrink-0"
                      >
                        <img 
                          src={profile.avatar} 
                          alt={profile.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-white font-bold text-sm">
                          <span 
                            onClick={() => navigate(`/profile/${profile.id}`)}
                            className="hover:text-hack-primary transition-colors cursor-pointer truncate"
                          >
                            {profile.name}
                          </span>
                          {profile.trustScore > 80 && <ShieldCheck size={14} className="text-hack-primary flex-shrink-0" />}
                        </div>
                        <div className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {profile.location}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-white/70 bg-[#1A1F2C] p-2.5 rounded-xl border border-white/5">
                      <div className="text-white/40 text-[9px] uppercase font-bold tracking-wider mb-0.5">Primary Role</div>
                      <div className="font-semibold">{profile.role}</div>
                    </div>

                    {/* Skills pills */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {profile.skills.slice(0, 3).map((skill: string) => (
                          <span key={skill} className="px-2 py-0.5 bg-[#22283A] text-white/50 text-[9px] rounded-md border border-white/5">
                            {skill}
                          </span>
                        ))}
                        {profile.skills.length > 3 && (
                          <span className="px-1.5 py-0.5 bg-white/5 text-white/30 text-[9px] rounded-md font-semibold">
                            +{profile.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Metadata tags based on category */}
                    <div className="mt-auto pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-white/40 font-medium">
                      <span>Saved / Interacted:</span>
                      <span className="text-white/70">{formatTimeAgo(profile.actionDate)}</span>
                    </div>

                    {/* Specific Action Statuses */}
                    {profile.invitationStatus && (
                      <div className="flex justify-between items-center text-[10px] font-semibold">
                        <span className="text-white/40">Status:</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider
                          ${profile.invitationStatus === "pending" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : 
                            profile.invitationStatus === "accepted" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                            profile.invitationStatus === "rejected" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                          }`}
                        >
                          {profile.invitationStatus}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => navigate(`/profile/${profile.id}`)}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-white/5 transition-all"
                      >
                        View Profile
                      </button>

                      {/* Direct invitation follow up from Favorites */}
                      {activeTab === "favorites" && (
                        <button 
                          onClick={() => handleInviteFromFavorites(profile)}
                          className="flex-1 py-2 bg-hack-primary text-black font-bold text-xs rounded-xl hover:bg-hack-primary/90 transition-all flex items-center justify-center gap-1.5"
                        >
                          <UserPlus size={12} />
                          Invite
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
